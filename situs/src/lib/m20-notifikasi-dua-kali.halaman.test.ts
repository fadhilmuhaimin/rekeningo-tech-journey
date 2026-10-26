// Penjaga halaman 3.12 (keputusan 1044 sampai 1046): angka, ID, nomor halaman, versi sumber, tautan, label sumber, rentang
// Snippet, klaim "kode dibaca, tidak dijalankan", diagram Rantai, skenario alur t3-m20.json, dan kartu Cek diri di
// m20-notifikasi-dua-kali.mdx diturunkan dari rekaman labs/t3-outbox (ganda.txt, transaksi.txt), kode lab api-t3 (worker.go,
// outbox.go, main.go, migrasi 000017), run.py lab, README lab, naskah Tahap 3, registry, baris riset R3-155, dan halaman
// tetangga (3.4, 3.5, 3.9, 2.13), bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.10): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI mengunci SETIAP baris badan
// halaman (paragraf, butir, judul, summary, tag Blok, Snippet, Rantai, WidgetLama) sehingga satu kata, satu "tidak", satu
// tingkat heading, atau satu atribut yang berubah menggagalkan tes, dan tes lain menurunkan nilai yang diklaim dari sumbernya
// karena kalimat terkunci tidak menangkap SALAHNYA kalimat.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-m20-satu-jurnal-dua-pesan.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";

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

const BERKAS = "situs/src/content/docs/tahap-3/m20-notifikasi-dua-kali.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t3-m20.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const diagram = DataRantai.parse(diagramMentah);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const ganda = baca("labs/t3-outbox/output/ganda.txt");
const transaksi = baca("labs/t3-outbox/output/transaksi.txt");
const runPy = baca("labs/t3-outbox/run.py");
const readmeLab = baca("labs/t3-outbox/README.md");
const workerGo = baca("labs/api-t3/internal/worker/worker.go");
const outboxGo = baca("labs/api-t3/internal/repo/outbox.go");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const migrasi = baca("labs/api-t3/migrasi/000017_perangkat_outbox.up.sql");
const hal34 = baca("situs/src/content/docs/tahap-3/dua-tempat-commit.mdx");
const hal35 = baca("situs/src/content/docs/tahap-3/skema-data.mdx");
const hal39 = baca("situs/src/content/docs/tahap-3/outbox-worker.mdx");
const hal213 = baca("situs/src/content/docs/tahap-2/m10-dibayar-dua-kali.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
};

interface Layar { judul?: string; waktu?: string; nada?: string; isi?: { jenis: string; teks?: string; kiri?: string; kanan?: string; nada?: string }[] }
interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string; layar?: Record<string, Layar> }
interface Skenario {
  judul: string;
  sumber: { jenis: string; file: string; fileVarian: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Record<string, Layar>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const cocok = (teks: string, re: RegExp): RegExpMatchArray => {
  const m = teks.match(re);
  expect(m, `tidak cocok: ${re}`).not.toBeNull();
  return m!;
};
const barisRiset = (id: string): string => {
  const m = riset.split("\n").find((b) => b.startsWith(`| ${id} |`));
  expect(m, `baris riset ${id}`).toBeDefined();
  return m!;
};

// ---- rekaman ganda.txt: bagian A sampai D, dan nomor baris Snippet ----------------------------------------------------
const baris = ganda.split("\n");
const nomorBaris = (ok: (b: string) => boolean, dariIdx = 0): number => {
  const i = baris.findIndex((b, n) => n >= dariIdx && ok(b));
  expect(i, "baris rekaman tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1; // nomor baris mulai dari 1, seperti Snippet
};
const awalBagian = (h: string) => nomorBaris((b) => b.startsWith(`# --- ${h}. `));
const akhirSebelum = (n: number): number => {
  let i = n - 1; // nomor baris sebelum baris n
  while (baris[i - 1]!.trim() === "") i--;
  return i;
};
const A0 = awalBagian("A"), B0 = awalBagian("B"), C0 = awalBagian("C"), D0 = awalBagian("D");
const teksBagian = (a: number, b: number) => baris.slice(a - 1, b).join("\n");
const bagA = teksBagian(A0, akhirSebelum(B0));
const bagB = teksBagian(B0, akhirSebelum(C0));
const bagC = teksBagian(C0, akhirSebelum(D0));
const bagD = teksBagian(D0, baris.length);
const barisPertama = nomorBaris((b) => b === "$ ./api-t3 -lab");
const barisKlaimHabis = nomorBaris((b) => b === "# klaim habis: worker berikutnya mengklaim baris yang sama", A0);

// ---- kode lab ---------------------------------------------------------------------------------------------------------
const kodeBaris = workerGo.split("\n");
const nomorKode = (ok: (b: string) => boolean): number => {
  const i = kodeBaris.findIndex(ok);
  expect(i, "baris kode tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const kirimAwal = nomorKode((b) => b.trim() === "for _, p := range perangkat {");
const kirimAkhir = nomorKode((b) => b.trim() === "ok++");
const henti0 = nomorKode((b) => b.trim() === "if ok > 0 && w.cfg.HentiSebelumTandai {");
const hentiAkhir = nomorKode((b) => b.trim() === "return status");

const entri = (re: RegExp): RegExpMatchArray => cocok(badan, re);

describe("registry, meta, susunan blok, dan tautan", () => {
  test("3.12 ada, masalah, bukan jalur inti, prasyarat 3.11, lab t3-outbox, peran mobile dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t3-m20")).toMatchObject({ ada: true, nomor: "3.12", jenis: "masalah", prasyarat: ["t3-klaim-baris"], lab: ["t3-outbox"], tahap: 3, peran: ["mobile", "backend"] });
    expect(dari("t3-m20").inti).toBeUndefined();
    expect(dari("t3-klaim-baris").nomor).toBe("3.11");
    expect(frontmatter).toContain('title: "3.12 M20: Notifikasi masuk dua kali"');
    expect(dari("t3-m20").judul).toBe("M20: Notifikasi masuk dua kali");
    expect(naskah).toContain("| 3.12 | 4 | M20: Notifikasi masuk dua kali | Masalah |  | t3-outbox | alur |");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-klaim-baris\]\]<\/p>/);
    expect(dari("t3-m20").menit).toBe(Number(m[1]) + Number(m[2]));
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat masalah: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira"]);
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan peta naskah dan registry", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "t2-idempotency", "t2-m10", "t3-at-least-once", "t3-dua-tempat", "t3-klaim-baris", "t3-m19", "t3-outbox"]);
    const sesuai: [string, string, string][] = [
      ["t2-m10", "2.13", "M10: Nasi goreng dibayar dua kali"], ["t2-idempotency", "2.14", "Retry dan idempotency key"], ["t3-outbox", "3.9", "Outbox transaksional"],
      ["t3-klaim-baris", "3.11", "Klaim per baris"], ["t3-at-least-once", "3.13", "At-least-once"], ["t3-m19", "3.10", "M19"], ["t3-dua-tempat", "3.4", "Dua tempat"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("3.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
  });
  test("janji halaman lain ke 3.12 ditepati: 3.4 (pertanyaan Pak Hadi), 3.5 (tabel outbox), 3.9 (pengiriman ulang dan ganda)", () => {
    expect(hal34).toContain("Pak Hadi bertanya bagaimana ia tahu satu pemberitahuan sesuai satu jurnal. Jawabannya ada di [[t3-m18]], [[t3-m19]], dan [[t3-m20]].");
    expect(hal35).toContain("[[t3-m20\\|M20]]");
    expect(hal39).toContain("Mengirim ulang itu benar. Penerima yang mengenali `notifikasi_id` menyaring ulangannya, dan itu isi [[t3-at-least-once]].");
    harus("**Jawaban untuk Pak Hadi.** Di minggu 1 Pak Hadi bertanya bagaimana ia tahu satu pemberitahuan sesuai satu jurnal ([[t3-dua-tempat]]).");
  });
  test("halaman tidak membuka isi 3.13: ADR 25 hanya disebut sekali, tanpa jitter, backoff sebagai bahan, atau Dart sebagai solusi", () => {
    expect(badan.match(/ADR 25/g)).toHaveLength(1);
    const sebelumKonsep = badan.slice(0, badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(sebelumKonsep).not.toMatch(/jitter|backoff/i);
    expect(badan.match(/jitter/gi)).toHaveLength(1);
    expect(badan).toMatch(/dead-letter dibahas di \[\[t3-at-least-once\]\]/);
  });
});

describe("naskah M20: gejala, yang dikira, dan yang sebenarnya", () => {
  const barisM20 = naskah.split("\n").find((b) => b.startsWith("| M20 |"))!;
  test("baris M20 di naskah memuat enam detik, M10, klaim 5 detik, 4,9 sampai 7,0 detik, dan ADR 25", () => {
    expect(barisM20).toContain('Ani menerima "Rp25.000 dari Budi" dua kali dalam enam detik dan mengira Budi membayar dua kali, seperti M10. Ia hampir menyerahkan dua porsi.');
    expect(barisM20).toContain("Jurnal ganda atau retry app (M10 terulang)");
    expect(barisM20).toContain("Hanya ada satu jurnal. Bayu menghentikan worker saat deploy di antara \"kirim\" dan \"tandai terkirim\"; klaim 5 detik habis");
    expect(barisM20).toContain("batas yang diperiksa lab 4,9 sampai 7,0 detik, bergantung mesin");
    expect(barisM20).toContain("ADR 25: pengiriman at-least-once, maksimal 5 percobaan lalu dead-letter");
    harus("Minggu 4 Tahap 3.");
    harus("Dalam enam detik HP itu berbunyi lagi dengan teks yang sama.");
    expect(naskah).toMatch(/\| M20 \| 4 \|/);
  });
  test("M10 di 2.13: satu nasi goreng Rp25.000 tercatat dua pembayaran; kalimat Gejala memakai arti itu", () => {
    expect(hal213).toContain("Sore harinya Budi membuka riwayat. Di sana ada dua pembayaran Rp25.000 ke warung yang sama, padahal ia hanya membeli satu nasi goreng.");
    harus("saat satu nasi goreng tercatat sebagai dua pembayaran.");
  });
  test("catatan Angka cerita: dua notifikasi dan enam detik Ilustrasi; jam 12.10 sama dengan semua layar HP di widget", () => {
    harus("*Angka cerita (Ilustrasi):* dua notifikasi dalam enam detik berasal dari naskah, tanpa rekaman yang mengulang selang itu.");
    const jam = cocok(badan, /Jam (\d\d\.\d\d) di layar HP pada widget adalah pilihan penulis, karena naskah tidak menyebut jam\./)[1]!;
    const semua = JSON.stringify(skenario);
    const waktu = [...semua.matchAll(/"waktu": ?"([^"]+)"/g)].map((m) => m[1]);
    expect(waktu).toHaveLength(4); // layarAwal, kirim pertama, kirim ulang, dan kirim di varian
    expect(new Set(waktu)).toEqual(new Set([jam]));
    expect(skenario.sumber.catatan).toContain(`Jam ${jam} di layar HP adalah pilihan penulis.`);
    expect((badan.match(/\b\d\d\.\d\d\b/g) ?? []).filter((x) => x !== "17.11")).toEqual([jam]); // 17.11 adalah versi PostgreSQL di rekaman
    expect(ganda).toContain("PostgreSQL 17.11");
  });
});

describe("rekaman ganda.txt: bagian A, B, C, D dan rentang Snippet", () => {
  test("bagian A: exit 3, baris menunggu percobaan 1 dengan klaim dipegang, worker baru 0 klaim, lalu 1 klaim 1 terkirim", () => {
    expect(bagA).toContain("$ ./api-t3 -peran worker -sekali -lab-henti-sebelum-tandai   # lab: berhenti sesudah push berhasil; klaim bawaan 5 detik");
    expect(bagA).toContain("# exit status 3: mati sesudah layanan push menjawab, sebelum UPDATE status");
    expect(bagA.match(/ menunggu \| 1 +\| t/g)).toHaveLength(2);
    expect(bagA).toContain("push tiruan menerima: 1 pesan");
    expect(bagA).toContain("# Deploy memulai worker baru saat itu juga: klaim belum habis, jadi baris itu dilewati");
    expect(bagA).toContain("worker: diklaim 0, terkirim 0, dilewati 0, ditunda 0, mati 0");
    expect(bagA).toContain("worker: diklaim 1, terkirim 1, dilewati 0, ditunda 0, mati 0");
    expect(bagA).toContain("push tiruan menerima: 2 pesan, 1 notifikasi_id");
    expect(bagA).toMatch(/ terkirim \| 2\n/);
    expect(cocok(bagA, /jurnal_bayar_baru\n-+\n (\d+)\n/)[1]).toBe("1");
    expect(bagA).toContain("# Hanya satu jurnal, dua pengiriman. Mengirim ulang itu benar (at-least-once); yang kurang adalah penerima yang mengenali ulangan (ADR 25).");
  });
  test("bagian B: klaim 300 ms, push menjawab pertama sesudah 1,5 detik, dua worker melapor terkirim, 2 pesan 1 notifikasi_id, percobaan 2", () => {
    expect(bagB).toContain("# Klaim 300 ms, layanan push menjawab permintaan pertama sesudah 1,5 detik (lambat), permintaan berikutnya langsung");
    expect(bagB).toContain("# worker A masih menunggu jawaban push; klaimnya habis. Worker B mengklaim baris yang sama dan mengirimnya.");
    expect(bagB).toContain("worker A: diklaim 1, terkirim 1\nworker B: diklaim 1, terkirim 1   # keduanya mengira ia yang mengirim");
    expect(bagB).toContain("push tiruan menerima: 2 pesan, 1 notifikasi_id");
    expect(bagB).toMatch(/ terkirim \| 2\n/);
    expect(runPy).toContain('d.push_mode("lambat", ms=1500, kali=1)');
    expect(runPy).toContain('worker(["-klaim", "300ms"]');
  });
  test("bagian C: penyaring tiruan lima baris di skrip lab, 2 pesan diterima dan 1 ditampilkan, bukan kode Dart", () => {
    expect(bagC).toContain("# Penyaring tiruan lima baris di run.py (kode app Dart: halaman 3.13, Tidak dijalankan di lab ini)");
    expect(bagC).toContain("diterima: 2 pesan; ditampilkan: 1 (notifikasi_id yang sudah tampil dilewati)");
    harus("Bagian C merekam penyaring lima baris di skrip lab, dan hasilnya 2 pesan diterima dan 1 ditampilkan. Itu bukan kode app Dart.");
  });
  test("bagian D: dua HP, tiap panggilan berbatas 3 detik, 2 × 3 detik melebihi klaim 5 detik, 4 pesan 1 notifikasi_id", () => {
    expect(bagD).toContain("# Kode worker mengirim ke perangkat penerima satu per satu, tiap panggilan berbatas 3 detik. Warung Ani punya dua HP.");
    expect(bagD).toContain("push tiruan menerima: 4 pesan (dua HP, dua worker), 1 notifikasi_id");
    expect(2 * 3).toBeGreaterThan(5);
    expect(bagD).toContain("klaim bawaan 5 detik");
    harus("penerima dengan dua HP yang sama-sama menggantung memakan 2 × 3 detik, lebih dari klaim 5 detik.");
    expect(naskah).toContain("klaim 5 detik kurang dari 2 × 3 detik (ganda.txt D)");
  });
  test("Warung Ani punya satu HP di bagian A: push menerima 1 pesan per pengiriman sebelum INSERT perangkat kedua di bagian D", () => {
    expect(bagA).not.toContain("INSERT INTO perangkat");
    expect(bagD).toContain("INSERT INTO perangkat (akun_id, platform, token_push) VALUES (418, 'ios', 'tiruan-418-b')");
    harus("Penerimanya Warung Ani, yang punya satu HP di bagian A.");
  });
  test("selang: lab memeriksa 4,9 sampai 7,0 detik dari start worker pertama sampai worker kedua selesai; rekaman menulis sedikit di atas 5 detik", () => {
    const m = cocok(runPy, /harap\((\d\.\d) <= selang <= (\d\.\d), True, f"selang dua pengiriman \{selang:\.2f\} detik harus sedikit di atas klaim 5 detik"\)/);
    expect([m[1], m[2]]).toEqual(["4.9", "7.0"]);
    expect(runPy).toContain("t0 = time.monotonic()");
    expect(bagA).toContain("selang dari start worker pertama sampai worker kedua selesai: sedikit di atas 5 detik");
    expect(readmeLab).toContain("(batas 4,9 sampai 7,0 detik)");
    harus("Lab menolak nilai di luar 4,9 sampai 7,0 detik, karena angkanya bergantung mesin.");
    harus("hasilnya sedikit di atas 5 detik");
    harus("Rekaman tidak mengukur selang antara dua pesan.");
  });
  test("rentang Snippet diturunkan dari baris rekaman dan kode, bukan ditulis tangan", () => {
    const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
    const lines = tag.map((t) => t.match(/lines="([^"]+)"/)?.[1] ?? "-");
    const berkas = tag.map((t) => t.match(/file="([^"]+)"/)?.[1]);
    expect(berkas).toEqual([
      "labs/api-t3/internal/worker/worker.go", "labs/api-t3/internal/worker/worker.go",
      "labs/t3-outbox/output/ganda.txt", "labs/t3-outbox/output/ganda.txt", "labs/t3-outbox/output/ganda.txt", "labs/t3-outbox/output/ganda.txt",
    ]);
    expect(lines).toEqual([
      `${kirimAwal}:${kirimAkhir}`, `${henti0}:${hentiAkhir}`,
      `${A0}:${akhirSebelum(barisKlaimHabis)}`, `${barisKlaimHabis}:${akhirSebelum(B0)}`, `${B0}:${akhirSebelum(C0)}`, `${barisPertama}:${baris.length - 1}`,
    ]);
    expect(akhirSebelum(barisKlaimHabis)).toBe(barisKlaimHabis - 1);
    expect(kirimAkhir - kirimAwal).toBe(3);
    // Snippet keenam: lipatan memuat ganda.txt dari baris perintah pertama sampai baris terakhir; tiga baris kepala tidak tampil
    // karena baris ketiganya memuat nomor keputusan lab.
    expect(baris.slice(0, 3).join("\n")).toMatch(/keputusan \d{3}/);
    expect(baris[baris.length - 1]).toBe("");
    expect(baris[baris.length - 2]!.trim()).not.toBe("");
  });
  test("kode dan rekaman yang tampil di Snippet tidak membawa ID riset, nomor PR, nomor keputusan, atau nama tes lab", () => {
    for (const t of [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!)) {
      const file = t.match(/file="([^"]+)"/)![1]!;
      let src = baca(file);
      const r = t.match(/lines="([^"]+)"/)?.[1];
      if (r) {
        const [a, b] = r.split(":").map(Number);
        src = src.split("\n").slice(a! - 1, b).join("\n");
      }
      expect(src.length, t).toBeGreaterThan(0);
      expect(src, t).not.toMatch(/\bR\d-\d{2,3}\b|\bPR #?\d{3}\b|\bkeputusan \d{3}\b|\bTest[A-Z][A-Za-z]+|--8<--/);
      expect(t, t).not.toMatch(/region=/);
    }
  });
  test("judul Snippet menyebut berkas, nomor baris, dan bagian yang sama dengan rentangnya", () => {
    const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
    const judul = tag.map((t) => t.match(/title="([^"]+)"/)![1]);
    expect(judul).toEqual([
      `Kode lab: labs/api-t3/internal/worker/worker.go baris ${kirimAwal} sampai ${kirimAkhir} (pengiriman membawa notifikasi_id)`,
      `Kode lab: labs/api-t3/internal/worker/worker.go baris ${henti0} sampai ${hentiAkhir} (celah di antara kirim dan tandai)`,
      "Rekaman lab: labs/t3-outbox/output/ganda.txt, bagian A (worker mati, worker baru melewati baris)",
      "Rekaman lab: labs/t3-outbox/output/ganda.txt, bagian A (pengiriman ulang, satu jurnal)",
      "Rekaman lab: labs/t3-outbox/output/ganda.txt, bagian B (klaim lebih pendek dari waktu kirim)",
      "Rekaman lab: labs/t3-outbox/output/ganda.txt, bagian A sampai D (tanpa baris kepala)",
    ]);
  });
});

describe("kode lab: pengiriman, celah, klaim, notifikasi_id, dan indeks unik", () => {
  test("Kirim membawa NotifikasiID baris; SelesaiOutbox dipanggil sesudah semua Kirim; galat penandaan mengembalikan ditunda", () => {
    const kirim = nomorKode((b) => b.includes("w.push.Kirim(ctx, p.Token, n.NotifikasiID"));
    const selesai = nomorKode((b) => b.includes("w.repo.SelesaiOutbox(ctx, n.ID, status)"));
    expect(kirimAwal).toBeLessThan(kirim);
    expect(kirim).toBeLessThan(henti0);
    expect(henti0).toBeLessThan(selesai);
    expect(workerGo).toContain('return "ditunda" // klaim habis sendiri; baris dikirim ulang, penerima menyaring notifikasi_id');
    harus("Galat saat UPDATE penandaan membuka celah yang sama tanpa ada yang mati (dibaca dari kode, Tidak dijalankan).");
  });
  test("flag lab: HentiSebelumTandai keluar dengan exit status 3 hanya sesudah push berhasil; flag ada di main.go", () => {
    const blok = kodeBaris.slice(henti0 - 1, henti0 + 3).join("\n");
    expect(blok).toContain("if ok > 0 && w.cfg.HentiSebelumTandai {");
    expect(blok).toContain("os.Exit(3)");
    expect(mainGo).toContain('flag.Bool("lab-henti-sebelum-tandai", false, "lab saja: worker berhenti mendadak sesudah push berhasil, sebelum ditandai terkirim (M20)")');
    harus("Flag `-lab-henti-sebelum-tandai` membuat proses keluar dengan exit status 3 sesudah layanan push menjawab. Itu bukan deploy sungguhan.");
  });
  test("Jalankan memakai context.WithoutCancel untuk putaran dan komentarnya menyebut deploy tidak memotong pengiriman; Tidak dijalankan", () => {
    expect(workerGo).toContain("Putaran yang sedang berjalan selesai dulu, jadi deploy");
    expect(workerGo).toContain("tidak memotong pengiriman di tengah.");
    expect(workerGo).toContain("w.Putaran(context.WithoutCancel(ctx))");
    harus("Kode `Jalankan` memakai konteks terlepas untuk putaran yang berjalan, dengan komentar bahwa deploy tidak memotong pengiriman di tengah (Tidak dijalankan).");
  });
  test("klaim bawaan 5 detik berlabel Asumsi lab di kode; klaim menaikkan percobaan dan mengisi klaim_sampai; percobaan naik per klaim", () => {
    expect(workerGo).toContain("Klaim: 5 * time.Second");
    expect(workerGo).toContain("Asumsi lab, belum di naskah: klaim 5 detik");
    expect(outboxGo).toContain("UPDATE outbox o SET klaim_sampai = now() + make_interval(secs => $2::double precision), percobaan = o.percobaan + 1");
    expect(outboxGo).toContain("(klaim_sampai IS NULL OR klaim_sampai < now())");
    harus("Klaim bawaan worker lab 5 detik. Itu pilihan lab, tanpa pengukuran (Asumsi).");
    harus("Angka `percobaan` naik tiap klaim, jadi 2 berarti dua kali diklaim.");
    harus("Klaim menaikkan `percobaan` dan menahan baris sampai `klaim_sampai`");
  });
  test("outbox.notifikasi_id UNIQUE DEFAULT; indeks unik outbox_satu_per_jurnal pada (jurnal_id, akun_id)", () => {
    expect(migrasi).toMatch(/notifikasi_id uuid +NOT NULL UNIQUE DEFAULT gen_random_uuid\(\)/);
    expect(migrasi).toContain("CREATE UNIQUE INDEX outbox_satu_per_jurnal ON outbox (jurnal_id, akun_id) WHERE jurnal_id IS NOT NULL;");
    harus("Kolom itu UNIQUE di tabel `outbox`, jadi dua baris tidak mungkin berbagi satu `notifikasi_id`.");
    harus("indeks unik `outbox_satu_per_jurnal` menolak baris kedua untuk jurnal dan penerima yang sama.");
  });
  test("teks pemberitahuan Rp25.000 dari Budi sama dengan outbox di transaksi.txt dan nominal bayar di bagian A lab", () => {
    expect(transaksi).toContain("| Rp25.000 dari Budi");
    expect(cocok(runPy.slice(runPy.indexOf("def rekam_ganda")), /bayar\(budi, nominal=(\d+), catatan="nasi goreng dua porsi"\)/)[1]).toBe("25000");
    expect(skenario.langkah.concat(skenario.varian.langkah).flatMap((l) => Object.values(l.layar ?? {})).flatMap((l) => l.isi ?? []).filter((i) => i.jenis === "baris").map((i) => i.kiri)).toEqual(Array(5).fill("Rp25.000 dari Budi"));
    harus('HP Ani berbunyi dan menampilkan "Rp25.000 dari Budi".');
  });
});

describe("sumber luar: microservices.io dan baris riset R3-155", () => {
  test("tautan, tanggal akses, kutipan, dan versi sama dengan baris riset; satu tautan eksternal di halaman", () => {
    const tautan = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]);
    expect(tautan).toEqual(["https://microservices.io/patterns/data/transactional-outbox.html"]);
    const r = barisRiset("R3-155");
    expect(r).toContain("microservices.io, C. Richardson");
    expect(r).toContain("dibuka 2026-10-26");
    expect(r).toContain('"The Message relay might publish a message more than once"');
    expect(r).toContain('"a message consumer must be idempotent"');
    harus("Sumbernya [microservices.io: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html), halaman tanpa tanggal terbit, dibuka 2026-10-26 (Tidak dijalankan).");
    harus("relay bisa memublikasikan pesan lebih dari sekali, sehingga consumer harus idempoten.");
    expect(r).toContain("halaman tanpa tanggal terbit");
    expect(new Date("2026-10-26").getTime()).toBeLessThanOrEqual(Date.now() + 86400000);
  });
  test("baris riset R3-155 dikunci dengan sidik jari: ubah satu karakter, buka lagi sumbernya, lalu perbarui sidiknya", () => {
    expect(sidik(barisRiset("R3-155"))).toBe(SIDIK_RISET);
  });
  test("ID riset tidak tampil ke pembaca (halaman, diagram, skenario, kartu)", () => {
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(skenarioMentah).not.toMatch(/\bR\d-\d{2,3}\b/);
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { halaman: string }[]).filter((k) => k.halaman === "t3-m20");
    expect(JSON.stringify(kartu)).not.toMatch(/\bR\d-\d{2,3}\b/);
  });
  test("label sumber: arti ditaut ke A0 di Gejala; Tidak dijalankan dipakai tepat untuk kode yang dibaca dan sumber luar; Asumsi untuk klaim 5 detik", () => {
    harus("Arti label Rekaman lab dan Tidak dijalankan ada di [[A0]].");
    expect(badan.match(/\(Tidak dijalankan\)|, Tidak dijalankan\)|Tidak dijalankan\)/g)).toHaveLength(3);
    expect(badan.match(/\(Asumsi\)/g)).toHaveLength(1);
    expect(badan.match(/\(penalaran[^)]*\)/g)).toHaveLength(4);
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari rekaman", () => {
  test("dua baris: A (klaim 5 detik, 1 pesan lalu 2 pesan 1 notifikasi_id) dan B (klaim 300 ms, push 1,5 detik); catatan percobaan 2", () => {
    expect(diagram.id).toBe("t3-m20-satu-jurnal-dua-pesan");
    expect(diagram.judul).toBe("Satu jurnal, dua pesan");
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-outbox · ganda.txt bagian A dan B" });
    expect(diagram.baris.map((b) => [b.label, b.sub, b.simpul.length])).toEqual([
      ["Worker mati di tengah", "klaim 5 detik", 4],
      ["Klaim 300 ms, tanpa ada yang mati", "push menjawab sesudah 1,5 detik", 3],
    ]);
    expect(bagA).toContain("push tiruan menerima: 1 pesan");
    expect(bagA).toContain("push tiruan menerima: 2 pesan, 1 notifikasi_id");
    expect(bagB).toContain("push tiruan menerima: 2 pesan, 1 notifikasi_id");
    expect(diagram.baris[0]!.simpul.map((s) => s.sub)).toEqual(["1 pesan diterima", "baris tetap menunggu", "worker baru mengklaim lagi", "2 pesan, 1 notifikasi_id"]);
    expect(diagram.baris[1]!.simpul.map((s) => s.sub)).toEqual(["klaim 300 ms habis di tengah", "dan mengirimnya", "2 pesan, 1 notifikasi_id"]);
    expect(diagram.catatan).toBe("Di kedua cara, baris outbox berakhir terkirim dengan percobaan 2, dan hanya satu baris yang dikirim dua kali.");
    expect(bagA.match(/ terkirim \| 2\n/g)).toHaveLength(1);
    expect(bagB.match(/ terkirim \| 2\n/g)).toHaveLength(1);
  });
  test("diagram dikunci dengan sidik jari (setiap nilai string) dan tampil dengan Rantai biasa, bukan ringkas, di blok Yang sebenarnya", () => {
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK_DIAGRAM);
    expect(badan).toContain("<Rantai data={duaPesan} />");
    expect(badan).toContain('import duaPesan from "../../../../data/diagram/t3-m20-satu-jurnal-dua-pesan.json";');
    const nada = diagram.baris.flatMap((b) => b.simpul.map((s) => [s.teks, s.nada]));
    expect(nada.filter(([, n]) => n === "warn").map(([t]) => t)).toEqual(["Worker mati sebelum menandai", "Dikirim ulang", "Keduanya melapor terkirim"]);
  });
});

describe("skenario alur t3-m20.json: valid, nilai dari rekaman, tebakan, dan varian", () => {
  const d = core.normalize(skenario);
  test("valid menurut alur-core dengan rekaman yang ada; tiga komponen, satu perangkat; sumber rekaman ganda.txt", () => {
    expect(core.validate(d, { exists: (p) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber).toMatchObject({ jenis: "rekaman", file: "labs/t3-outbox/output/ganda.txt", fileVarian: "labs/t3-outbox/output/ganda.txt" });
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["worker", "Worker"], ["db", "PostgreSQL"], ["push", "Layanan push (tiruan)"]]);
    expect(skenario.perangkat).toEqual([{ id: "ani", label: "HP Warung Ani" }]);
    expect(skenario.langkah).toHaveLength(8);
    expect(skenario.varian.langkah).toHaveLength(6);
    expect(skenario.varian.mulai).toBe(0);
    expect(skenario.varian.label).toBe("klaim hanya 300 ms, tidak ada yang mati");
    harus("**Ubah satu hal: klaim hanya 300 ms, tidak ada yang mati**");
    harus('<WidgetLama nama="alur" src="data/skenario/t3-m20.json" />');
  });
  test("tebakan: empat pilihan, jawaban benar sama dengan rekaman (melewati dulu, kirim lagi sesudah klaim habis), posisinya tidak ditulis di halaman", () => {
    expect(skenario.predict.options).toHaveLength(4);
    expect(skenario.predict.answer).toBe(0);
    expect(skenario.predict.options[skenario.predict.answer]).toBe("Melewati baris itu lebih dulu, lalu mengirimnya lagi sesudah klaim 5 detik habis");
    expect(bagA).toContain("worker: diklaim 0, terkirim 0");
    expect(skenario.predict.explain).toContain("diklaim 0");
    expect(skenario.predict.explain).toContain("layanan push menerima 2 pesan dan 1 notifikasi_id");
    expect(badan).not.toMatch(/pilihan (pertama|kedua|ketiga|keempat) (benar|tepat)/);
    // Pilihan salah: kirim langsung (bertentangan dengan diklaim 0), dianggap terkirim (bertentangan dengan terkirim | 2), baris baru (satu jurnal, satu baris).
    expect(skenario.predict.options.slice(1)).toEqual([
      "Mengirimnya lagi saat itu juga, karena worker lama sudah mati",
      "Tidak pernah mengirimnya: baris itu sudah dianggap terkirim",
      "Menulis baris outbox baru dengan notifikasi_id baru, lalu mengirimnya",
    ]);
  });
  test("baris perintah dan keluaran di kirim yang bukan ringkasan (tanda panah) ada utuh di ganda.txt atau kode lab", () => {
    const semua = skenario.langkah.concat(skenario.varian.langkah);
    const dikecualikan = new Set([
      "POST /v1/pesan, notifikasi_id dari kolom outbox.notifikasi_id", // push.go dan 000017
      "POST /v1/pesan: worker A menunggu jawaban", // push.go dan bagian B
    ]);
    for (const l of semua) {
      for (const b of l.kirim.split("\n")) {
        if (b.startsWith("→") || dikecualikan.has(b)) continue;
        expect(ganda.includes(b), `kirim tidak ada di rekaman: ${b}`).toBe(true);
      }
    }
    expect(baca("labs/api-t3/internal/push/push.go")).toContain('"/v1/pesan"');
  });
  test("baris ringkasan tanda panah sesuai keadaan tabel di rekaman: percobaan 1 lalu 2, menunggu lalu terkirim, jurnal bayar baru 1", () => {
    const panah = skenario.langkah.concat(skenario.varian.langkah).flatMap((l) => l.kirim.split("\n").filter((b) => b.startsWith("→")));
    expect(panah).toEqual([
      "→ outbox: menunggu, percobaan 1, klaim dipegang (bawaan 5 detik)",
      "→ outbox: menunggu, percobaan 1, klaim masih dipegang",
      "→ outbox: menunggu, percobaan 1, klaim masih dipegang",
      "→ outbox: menunggu, percobaan 1",
      "→ outbox: terkirim, percobaan 2",
      "→ jurnal bayar baru: 1",
      "→ outbox: menunggu, percobaan 1, klaim dipegang 300 ms",
      "→ outbox: menunggu, percobaan 1, klaim habis",
      "→ outbox: percobaan 2",
      "→ outbox: terkirim, percobaan 2",
    ]);
    expect(bagA.match(/ menunggu \| 1 +\| t/g)).toHaveLength(2);
    expect(cocok(bagA, /status +\| percobaan\n-+\+-+\n terkirim \| 2/)).toBeTruthy();
    expect(cocok(bagA, /jurnal_bayar_baru\n-+\n (\d+)/)[1]).toBe("1");
  });
  test("layar HP Ani: satu notifikasi sesudah kirim pertama, dua sesudah kirim ulang (pertama dan kedua), sama di varian; tiap layar berjam sama", () => {
    const layar = (l: Langkah) => l.layar?.ani?.isi?.filter((i) => i.jenis === "baris").map((i) => `${i.kiri}|${i.kanan}`);
    expect(skenario.langkah.map(layar)).toEqual([undefined, ["Rp25.000 dari Budi|pertama"], undefined, undefined, undefined, undefined, ["Rp25.000 dari Budi|pertama", "Rp25.000 dari Budi|kedua"], undefined]);
    expect(skenario.varian.langkah.map(layar)).toEqual([undefined, undefined, undefined, undefined, ["Rp25.000 dari Budi|pertama", "Rp25.000 dari Budi|kedua"], undefined]);
    const pesan = (l: Langkah) => l.kirim.match(/push tiruan menerima: (\d+) pesan/)?.[1];
    expect(skenario.langkah.map(pesan)).toEqual([undefined, "1", undefined, undefined, undefined, undefined, "2", undefined]);
  });
  test("skenario dikunci dengan sidik jari (setiap nilai string); catatan sumber menyebut flag lab dan layar digambar", () => {
    expect(sidik(JSON.stringify(skenario))).toBe(SIDIK_SKENARIO);
    expect(skenario.sumber.catatan).toContain("Worker yang mati diperankan flag khusus lab yang membuat proses keluar dengan exit status 3, bukan deploy sungguhan.");
    expect(skenario.sumber.catatan).toContain("make -C labs/t3-outbox run BAGIAN=ganda");
    expect(readmeLab).toContain("make -C labs/t3-outbox run BAGIAN=kursor      # satu bagian: transaksi kursor klaim ganda retry queue listen");
    expect(skenario.langkah.map((l) => l.judul)).toEqual([
      "Worker mengklaim baris", "Worker mengirim ke layanan push", "Worker mati sebelum menandai terkirim", "Worker baru dijalankan saat itu juga",
      "Klaim habis, barisnya masih menunggu", "Worker baru mengklaim baris yang sama", "Worker mengirim ulang", "Baris ditandai terkirim: satu jurnal",
    ]);
    expect(skenario.langkah.map((l) => l.nada)).toEqual([undefined, undefined, "warn", undefined, undefined, "warn", "warn", undefined]);
  });
  test("tanpa JavaScript: noscript memuat hasil tebakan dan varian dengan angka yang sama dengan rekaman; rekaman lengkap di lipatan", () => {
    const ns = cocok(badan, /<noscript>\n([\s\S]*?)<\/noscript>/)[1]!;
    expect(ns).toContain("mengklaim 0 baris selama klaim 5 detik berlaku");
    expect(ns).toContain("Layanan push menerima 2 pesan dengan 1 notifikasi_id, dan jurnal bayar baru hanya 1.");
    expect(ns).toContain("Bila klaim hanya 300 ms, dua worker mengirim baris yang sama tanpa ada yang mati.");
    expect(badan).toContain(`<Snippet file="labs/t3-outbox/output/ganda.txt" lines="${barisPertama}:${baris.length - 1}" title="Rekaman lab: labs/t3-outbox/output/ganda.txt, bagian A sampai D (tanpa baris kepala)" />`);
  });
});

describe("kartu Cek diri: tiga kartu, sama dengan kartu.json", () => {
  test("tiga soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya", () => {
    expect(badan.match(/^\*\*\d\.\*\* /gm)).toHaveLength(3);
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
    expect(badan.match(/<summary>Jawaban<\/summary>/g)).toHaveLength(3);
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { halaman: string; tanya: string; jawab: string }[]).filter((k) => k.halaman === "t3-m20");
    expect(kartu.map((k) => k.tanya)).toEqual([...badan.matchAll(/^\*\*\d\.\*\* (.+)$/gm)].map((m) => m[1]!));
    expect(kartu).toHaveLength(3);
    expect(kartu[1]!.jawab).toContain("(`ganda.txt` bagian A)");
    expect(kartu[2]!.jawab).toContain("(`ganda.txt` bagian B)");
  });
  test("kartu 2 dan 3 menyebut fakta rekaman yang sama dengan bagian A dan B", () => {
    expect(bagA).toContain("worker: diklaim 0, terkirim 0");
    expect(bagB).toContain("worker A: diklaim 1, terkirim 1");
    expect(bagB).toContain("worker B: diklaim 1, terkirim 1");
    harus("Klaim 5 detik belum habis, jadi baris yang berstatus `menunggu` masih dipegang (`ganda.txt` bagian A).");
    harus("Klaim worker A habis selagi ia menunggu jawaban. Worker B mengklaim baris yang sama dan mengirimnya, jadi keduanya melapor `terkirim` (`ganda.txt` bagian B).");
  });
});

describe("struktur halaman: tingkat heading, nomor daftar, dan setiap baris terkunci", () => {
  test("tingkat heading dikunci: hanya satu heading, h3 Cek diri, di blok terakhir; tanpa daftar bernomor", () => {
    let dalamKode = false;
    const hd: [number, string][] = [];
    for (const b of badan.split("\n")) {
      if (b.trim().startsWith("```")) { dalamKode = !dalamKode; continue; }
      const m = !dalamKode && b.match(/^(#{1,6}) (.+)$/);
      if (m) hd.push([m[1]!.length, m[2]!]);
    }
    expect(hd).toEqual([[3, "Cek diri"]]);
    expect(badan.match(/^\d+\. /gm)).toBeNull();
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
  });
  test("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const aktual = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const sah = new Set(KALIMAT_TERKUNCI);
    expect(aktual.filter((s) => !sah.has(s))).toEqual([]);
    expect(aktual).toEqual(KALIMAT_TERKUNCI);
  });
  test("front matter dikunci: title dan description (description memuat 'enam detik' dan 'satu jurnal')", () => {
    expect(frontmatter.trim().split("\n")).toEqual([
      'title: "3.12 M20: Notifikasi masuk dua kali"',
      'description: Minggu 4. HP Ani menampilkan "Rp25.000 dari Budi" dua kali dalam enam detik, dan Ani mengira Budi membayar dua kali. Hanya ada satu jurnal. Worker berhenti di antara kirim dan tandai terkirim, klaim habis, dan worker baru mengirim baris yang sama lagi.',
    ]);
  });
});

const SIDIK_RISET = "7bdc5d21e25b6105";
const SIDIK_DIAGRAM = "7883fae46197187e";
const SIDIK_SKENARIO = "0ea57b34c3f79030";
const KALIMAT_TERKUNCI: string[] = [
  "import Blok from \"../../../components/Blok.astro\";",
  "import Rantai from \"../../../components/Rantai.astro\";",
  "import Snippet from \"../../../components/Snippet.astro\";",
  "import WidgetLama from \"../../../components/WidgetLama.astro\";",
  "import SkripLama from \"../../../components/SkripLama.astro\";",
  "import duaPesan from \"../../../../data/diagram/t3-m20-satu-jurnal-dua-pesan.json\";",
  "<p class=\"meta\">Baca 7 menit · coba 3 menit · Prasyarat: [[t3-klaim-baris]]</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 4 Tahap 3. Budi membayar Rp25.000 di warung Ani. HP Ani berbunyi dan menampilkan \"Rp25.000 dari Budi\". Dalam enam detik HP itu berbunyi lagi dengan teks yang sama.",
  "Ani teringat [[t2-m10]], saat satu nasi goreng tercatat sebagai dua pembayaran. Ia mengira hal yang sama terjadi lagi, dan hampir menyerahkan dua porsi.",
  "Ani menahan porsi kedua dan menghubungi Raka.",
  "*Angka cerita (Ilustrasi):* dua notifikasi dalam enam detik berasal dari naskah, tanpa rekaman yang mengulang selang itu. Jam 12.10 di layar HP pada widget adalah pilihan penulis, karena naskah tidak menyebut jam. Rekaman di blok \"Yang sebenarnya\" mengulang mekanismenya di server lokal. Arti label Rekaman lab dan Tidak dijalankan ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Raka mulai dari tebakan yang ia kenal dari M10: pembayaran Budi tercatat dua kali, atau app mengulang request-nya. Ia menghitung jurnal bayar baru di database. Hasilnya satu.",
  "Jadi pembayarannya tidak ganda. Yang ganda adalah pesan yang sampai ke layanan push, dan Raka mencari siapa yang mengirimnya dua kali.",
  "Tiap baris `outbox` punya `notifikasi_id`, yaitu pengenal yang diberikan saat baris itu ditulis ([[t3-outbox]]).",
  "<details class=\"question\">",
  "<summary>Tebak dulu: ada satu jurnal bayar, tetapi layanan push menerima dua pesan. Apakah `notifikasi_id` kedua pesan itu sama atau berbeda?</summary>",
  "Sama. Di rekaman lab `ganda.txt` bagian A, layanan push tiruan menerima 2 pesan dengan 1 `notifikasi_id`. Kolom itu UNIQUE di tabel `outbox`, jadi dua baris tidak mungkin berbagi satu `notifikasi_id`.",
  "Dua pesan dengan id yang sama berasal dari satu baris yang dikirim dua kali. Itu bukan M10. Siapa yang mengirimnya dua kali ada di blok berikutnya.",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Hanya ada satu jurnal, dan baris outbox-nya dikirim dua kali. Worker berhenti di antara mengirim ke layanan push dan menandai barisnya `terkirim`. Klaim lima detik habis, dan worker baru mengklaim baris yang sama lagi.",
  "<Rantai data={duaPesan} />",
  "*Kondisi rekaman:* PostgreSQL 17.11, server Go dan worker `api-t3`, dan layanan push tiruan lokal. Penerimanya Warung Ani, yang punya satu HP di bagian A.",
  "**Tiga langkah, dan celah di antara dua yang terakhir.** Worker mengklaim baris, mengirimnya ke tiap perangkat penerima, lalu menandainya. Klaim menaikkan `percobaan` dan menahan baris sampai `klaim_sampai` ([[t3-outbox]]). Pengiriman memakai `notifikasi_id` dari baris itu:",
  "<Snippet file=\"labs/api-t3/internal/worker/worker.go\" lines=\"154:157\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/worker/worker.go baris 154 sampai 157 (pengiriman membawa notifikasi_id)\" />",
  "Penandaan baru dikerjakan sesudah layanan push menjawab. Kode lab menyisipkan satu cabang di antaranya, yang hanya jalan bila flag khusus lab menyala:",
  "<Snippet file=\"labs/api-t3/internal/worker/worker.go\" lines=\"170:182\" lang=\"go\" title=\"Kode lab: labs/api-t3/internal/worker/worker.go baris 170 sampai 182 (celah di antara kirim dan tandai)\" />",
  "**Lab memerankan worker yang mati dengan keluar paksa.** Flag `-lab-henti-sebelum-tandai` membuat proses keluar dengan exit status 3 sesudah layanan push menjawab. Itu bukan deploy sungguhan. Di cerita Bayu menghentikan worker saat deploy.",
  "Kode `Jalankan` memakai konteks terlepas untuk putaran yang berjalan, dengan komentar bahwa deploy tidak memotong pengiriman di tengah (Tidak dijalankan). Bila deploy menunggu putaran selesai, proses tidak berhenti di celah itu. Apa pun yang menghentikan proses di antara dua langkah itu menghasilkan akibat yang sama. Galat saat UPDATE penandaan membuka celah yang sama tanpa ada yang mati (dibaca dari kode, Tidak dijalankan).",
  "**Worker baru melewati baris itu dulu.** Sesudah worker mati, baris tetap `menunggu` dengan `percobaan` 1 dan klaim yang masih berlaku. Worker baru yang dijalankan saat itu juga mengklaim 0 baris:",
  "<Snippet file=\"labs/t3-outbox/output/ganda.txt\" lines=\"6:22\" title=\"Rekaman lab: labs/t3-outbox/output/ganda.txt, bagian A (worker mati, worker baru melewati baris)\" />",
  "**Sesudah klaim habis, baris dikirim lagi.** Tidak ada yang menandai baris itu terkirim, jadi klaim yang habis melepasnya. Worker berikutnya mengklaim baris yang sama dan mengirimnya dengan `notifikasi_id` yang sama:",
  "<Snippet file=\"labs/t3-outbox/output/ganda.txt\" lines=\"23:38\" title=\"Rekaman lab: labs/t3-outbox/output/ganda.txt, bagian A (pengiriman ulang, satu jurnal)\" />",
  "Layanan push menerima 2 pesan dengan 1 `notifikasi_id`. Jurnal bayar baru ada 1, dan baris outbox berakhir `terkirim` dengan `percobaan` 2. Angka `percobaan` naik tiap klaim, jadi 2 berarti dua kali diklaim. Berapa kali pesan tiba terlihat di layanan push.",
  "**Berapa lama klaim, dan kenapa enam detik.** Klaim bawaan worker lab 5 detik. Itu pilihan lab, tanpa pengukuran (Asumsi). Pengiriman kedua baru bisa terjadi sesudah `klaim_sampai` lewat.",
  "Karena itu selang enam detik di naskah menuntut klaim paling lama sekitar lima detik. Klaim 30 detik tidak akan memberi selang itu (penalaran dari syarat klaim, tidak direkam). Angka enam detik di naskah berlabel Ilustrasi.",
  "Rekaman tidak mengukur selang antara dua pesan. Yang diperiksa lab adalah selang dari start worker pertama sampai worker kedua selesai, dan hasilnya sedikit di atas 5 detik. Lab menolak nilai di luar 4,9 sampai 7,0 detik, karena angkanya bergantung mesin.",
  "**Tidak harus ada yang mati.** Bagian B memakai klaim 300 ms dan layanan push yang menjawab permintaan pertama sesudah 1,5 detik. Worker A masih menunggu saat klaimnya habis. Worker B mengklaim baris yang sama, dan keduanya melapor `terkirim`:",
  "<Snippet file=\"labs/t3-outbox/output/ganda.txt\" lines=\"40:53\" title=\"Rekaman lab: labs/t3-outbox/output/ganda.txt, bagian B (klaim lebih pendek dari waktu kirim)\" />",
  "Klaim bekerja seperti dirancang: ia menahan baris 300 ms, tidak lebih. Yang kurang adalah klaim yang lebih pendek dari waktu kirim. Bagian D menunjukkan bentuk ketiga, yaitu penerima dengan dua HP yang sama-sama menggantung memakan 2 × 3 detik, lebih dari klaim 5 detik. Bentuk itu dibahas di [[t3-at-least-once]].",
  "**Pengiriman ulang itu benar.** Bila worker menandai `terkirim` sebelum mengirim, worker yang mati di antaranya membuat Ani tidak diberi tahu, seperti [[t3-m19]] dengan sebab lain. Tidak ada baris yang tersisa untuk dikirim ulang (penalaran, tidak direkam). Urutan kirim lalu tandai menukar kehilangan dengan ulangan.",
  "Layanan push dan PostgreSQL tidak bisa COMMIT bersama ([[t3-dua-tempat]]), jadi worker baru tidak bisa tahu apakah layanan push sudah menjawab. Pola outbox menulis hal yang sama: relay bisa memublikasikan pesan lebih dari sekali, sehingga consumer harus idempoten. Sumbernya [microservices.io: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html), halaman tanpa tanggal terbit, dibuka 2026-10-26 (Tidak dijalankan).",
  "**Ini bukan retry app.** Idempotency key ([[t2-idempotency]]) menjaga request dari app ke server. Pesan kedua di M20 lahir di dalam worker, sesudah request itu selesai.",
  "**Jawaban untuk Pak Hadi.** Di minggu 1 Pak Hadi bertanya bagaimana ia tahu satu pemberitahuan sesuai satu jurnal ([[t3-dua-tempat]]). Tabel `outbox` menjawabnya. Tiap baris punya `jurnal_id`, dan indeks unik `outbox_satu_per_jurnal` menolak baris kedua untuk jurnal dan penerima yang sama. Baris itu juga mencatat `percobaan`, jadi `percobaan` 2 dengan satu jurnal menunjukkan pengiriman ulang, bukan pembayaran kedua.",
  "**Yang belum menyelesaikannya.** Klaim yang lebih panjang tidak menghapus ulangan. Ia hanya menunda pengiriman ulang sesudah worker mati, jadi Ani menunggu lebih lama (penalaran, tidak direkam). Yang menyelesaikannya ada di penerima: pesan dengan `notifikasi_id` yang sudah tampil dilewati.",
  "Bagian C merekam penyaring lima baris di skrip lab, dan hasilnya 2 pesan diterima dan 1 ditampilkan. Itu bukan kode app Dart. App, batas lima percobaan, dan dead-letter dibahas di [[t3-at-least-once]].",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengikuti rekaman `ganda.txt` bagian A dari klaim pertama sampai HP Ani. Tebak dulu apa yang dikerjakan worker baru, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t3-m20.json\" />",
  "Sesudah langkah terakhir, centang **Ubah satu hal: klaim hanya 300 ms, tidak ada yang mati**. Worker tidak perlu mati supaya HP Ani berbunyi dua kali (bagian B). Layar HP di widget digambar dari isi rekaman: lab tidak punya app Flutter, dan layanan push tiruan hanya mencatat pesan yang diterima.",
  "<noscript>",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: worker baru mengklaim 0 baris selama klaim 5 detik berlaku, lalu mengirim baris yang sama lagi. Layanan push menerima 2 pesan dengan 1 notifikasi_id, dan jurnal bayar baru hanya 1.",
  "Bila klaim hanya 300 ms, dua worker mengirim baris yang sama tanpa ada yang mati. Rekaman lengkap ada di lipatan di bawah.",
  "</noscript>",
  "<details>",
  "<summary>Rekaman bagian A sampai D (juga untuk pembaca tanpa JavaScript)</summary>",
  "<Snippet file=\"labs/t3-outbox/output/ganda.txt\" lines=\"4:75\" title=\"Rekaman lab: labs/t3-outbox/output/ganda.txt, bagian A sampai D (tanpa baris kepala)\" />",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t3-at-least-once]]: at-least-once, retry dengan backoff dan jitter, dead-letter, dan penerima idempoten dengan `notifikasi_id`. Keputusannya ADR 25.",
  "- [[t3-klaim-baris]]: klaim per baris dengan `FOR UPDATE` dan `klaim_sampai`. Klaim mencegah dua worker mengirim baris yang sama selama klaim berlaku, tetapi tidak menutup celah sesudah klaim habis.",
  "- [[t3-m19]]: sisi lain pengiriman. Di M19 pesan tidak pernah dikirim, dan di M20 pesan dikirim dua kali.",
  "- [[t2-idempotency]]: key yang menjaga request dari app, berbeda dari penyaring yang menjaga pesan ke app.",
  "Mengirim ulang itu benar, dan penerima harus mengenali ulangannya.",
  "### Cek diri",
  "**1.** Satu jurnal bayar dan dua pesan di layanan push. Kenapa itu bukan M10?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Dua pesan itu membawa `notifikasi_id` yang sama, dan kolom itu UNIQUE di tabel `outbox`. Jadi satu baris dikirim dua kali. Bila M10 terulang sekarang, dua jurnal menulis dua baris outbox dengan `notifikasi_id` sendiri (penalaran, tidak direkam).",
  "</details>",
  "**2.** Worker mati sesudah layanan push menjawab. Worker baru yang dijalankan saat itu juga mengklaim 0 baris. Kenapa?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Klaim 5 detik belum habis, jadi baris yang berstatus `menunggu` masih dipegang (`ganda.txt` bagian A). Sesudah klaim habis, worker berikutnya mengklaimnya lagi dan mengirimnya dengan `notifikasi_id` yang sama.",
  "</details>",
  "**3.** Klaim 300 ms dan layanan push yang menjawab sesudah 1,5 detik. Kenapa HP Ani tetap berbunyi dua kali tanpa ada worker yang mati?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Klaim worker A habis selagi ia menunggu jawaban. Worker B mengklaim baris yang sama dan mengirimnya, jadi keduanya melapor `terkirim` (`ganda.txt` bagian B). Klaim harus lebih panjang dari waktu kirim.",
  "</details>",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />",
];
