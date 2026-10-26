// Penjaga halaman 3.4 (keputusan 1012 sampai 1014): angka, nomor halaman, nomor ADR, ID `[[...]]`, label sumber, klaim
// "tidak dijalankan", empat kejadian, tiga hal, dan setiap kalimat di halaman, widget cari-bug, dan diagram Rantai harus
// bisa diturunkan dari naskah Tahap 3 (bagian 2, 3, dan peta), registry cerita.json, rekaman lab (rentan.txt,
// transaksi.txt, little.txt), dan kode lab (tx.go, notif.go, bayar.go). Kalimat yang ditulis penulis dan tidak bisa
// diturunkan dikunci utuh di KALIMAT_PENULIS dan TEKS_WIDGET: mengubah satu kata di sana menggagalkan tes, dan itu
// tanda untuk meninjau ulang klaimnya terhadap sumber (pelajaran 3.1 dan 3.2: kalimat bebas, arti istilah, dan teks
// simpul diagram lolos dari penjaga yang hanya memeriksa angka).
// Lingkup klaim "Tidak dijalankan": semua berkas output di labs/api-t3 dan labs/t3-*.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-dua-tempat-inti.json";
import widgetMentah from "../../data/widget/t3-dua-tempat-caribug.json";
import { DataCariBug } from "../widgets/cari-bug/skema";
import { periksa, ringkas } from "../widgets/cari-bug/logika";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const mdx = baca("situs/src/content/docs/tahap-3/dua-tempat-commit.mdx");
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah3 = baca("plan/CERITA-TAHAP-3.md");
const bag2 = naskah3.split("## 2. Dari fitur ke pekerjaan teknis")[1]!.split("\n## 3. ")[0]!;
const bag3 = naskah3.split("## 3. Inti teknis Tahap 3")[1]!.split("### Angka beban Tahap 3")[0]!;
const rentan = baca("labs/api-t3/output/rentan.txt").split("\n");
const transaksi = baca("labs/t3-outbox/output/transaksi.txt").split("\n");
const little = baca("labs/t3-pool/output/little.txt");
const txGo = baca("labs/api-t3/internal/repo/tx.go");
const notifGo = baca("labs/api-t3/internal/service/notif.go");
const bayarGo = baca("labs/api-t3/internal/service/bayar.go");
const widget = DataCariBug.parse(widgetMentah);
const rantai = DataRantai.parse(diagramMentah);

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const kata = (n: number): string => ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"][n]!;
const nomorBaris = (baris: string[], cocok: (b: string) => boolean, dariIdx = 0): number => {
  const i = baris.findIndex((b, n) => n >= dariIdx && cocok(b));
  expect(i, "baris rekaman tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i;
};
const sel = (t: string) => t.split("|").slice(1, -1).map((c) => c.trim());

// Rekaman rentan.txt bagian A dan B, transaksi.txt bagian A sampai G, little.txt.
const iA = nomorBaris(rentan, (b) => b.startsWith("# --- A. M18"));
const iB = nomorBaris(rentan, (b) => b.startsWith("# --- B. Layanan push dimatikan"));
const iC = nomorBaris(rentan, (b) => b.startsWith("# --- C. M19"));
const bagianA = rentan.slice(iA, iB);
const bagianB = rentan.slice(iB, iC);
const trx = (huruf: string): string[] => {
  const i = nomorBaris(transaksi, (b) => b.startsWith(`# --- ${huruf}. `));
  const j = transaksi.findIndex((b, n) => n > i && b.startsWith("# --- "));
  return transaksi.slice(i, j < 0 ? undefined : j);
};

// Naskah: tiga hal, versi pertama, empat kejadian, dua pertanyaan, pola yang kembali.
const tigaHal = [...bag3.matchAll(/^(\d)\. (.+?)\. (.+?) \(syarat (.+?)\)\.$/gm)].map((m) => ({ n: m[1]!, judul: m[2]!, isi: m[3]!, pemilik: m[4]! }));
const tabelNaskah = bag3.split("\n").filter((b) => b.startsWith("| ") && !b.startsWith("| ---")).map(sel);
const kepalaNaskah = tabelNaskah[0]!;
const barisNaskah = tabelNaskah.slice(1);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const selNaskah = (t: string): { status: "ya" | "tidak" | "na"; detail?: string } => {
  if (t === "Ya") return { status: "ya" };
  if (t === "Tidak berlaku") return { status: "na" };
  const m = t.match(/^Tidak: (.+)$/);
  return { status: "tidak", detail: cap(m ? m[1]! : t) };
};

describe("registry, meta, dan susunan blok", () => {
  test("3.4 ada, jenis konsep, jalur inti, prasyarat 3.3, lab t3-outbox, menit sama dengan baris meta", () => {
    expect(dari("t3-dua-tempat")).toMatchObject({ ada: true, nomor: "3.4", jenis: "konsep", inti: true, prasyarat: ["t3-notifikasi"], lab: ["t3-outbox"], tahap: 3 });
    expect(mdx).toContain('title: "3.4 Dua tempat yang tidak bisa commit bersama"');
    expect(dari("t3-dua-tempat").judul).toBe("Dua tempat yang tidak bisa commit bersama");
    expect(dari("t3-notifikasi").nomor).toBe("3.3");
    // Deskripsi frontmatter dikunci utuh; "tiga hal" dicocokkan dengan jumlah hal di naskah (pelajaran 3.1: deskripsi lolos dari penjaga isi).
    expect(mdx.match(/^description: (.+)$/m)![1]).toBe(`Satu transfer menyentuh PostgreSQL dan layanan push, dan keduanya tidak ikut satu COMMIT. Cara paling pendek menulisnya tidak menjaga ${kata(tigaHal.length)} hal yang harus selalu benar.`);
    const m = badan.match(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-notifikasi\]\] · Jalur inti<\/p>/);
    expect(m, "baris meta").not.toBeNull();
    expect(dari("t3-dua-tempat").menit).toBe(Number(m![1]) + Number(m![2]));
    expect(naskah3).toContain("| 3.4 | 3 | Dua tempat yang tidak bisa commit bersama | Konsep | ★ | t3-outbox | cari-bug |");
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    const baca = Number(badan.match(/Baca (\d+) menit/)![1]);
    expect(Math.abs(jumlah / 200 - baca), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan, nomor dan judul sama dengan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].filter((x) => x !== "berikutnya").sort();
    expect(id).toEqual(["B3.1", "t2-race-lock", "t3-at-least-once", "t3-m18", "t3-m19", "t3-m20", "t3-m22", "t3-m23", "t3-m24", "t3-m27", "t3-notifikasi", "t3-outbox", "t3-pool"]);
    const peta = [...naskah3.matchAll(/^\| (3\.\d+) \| [^|]+ \| ([^|]+) \| [^|]+ \|/gm)].map((m) => [m[1]!, m[2]!.trim()] as const);
    const teksM = (nomor: string, awal: string) => {
      const p = peta.find((x) => x[0] === nomor);
      expect(p, `peta naskah ${nomor}`).toBeDefined();
      expect(p![1].startsWith(awal)).toBe(true);
    };
    for (const [idh, nomor, awal] of [["t3-m18", "3.6", "M18"], ["t3-m19", "3.10", "M19"], ["t3-m20", "3.12", "M20"], ["t3-m22", "3.16", "M22"], ["t3-m23", "3.18", "M23"], ["t3-m24", "3.20", "M24"], ["t3-m27", "3.26", "M27"], ["t3-pool", "3.8", "Connection pool"], ["t3-outbox", "3.9", "Outbox"], ["t3-at-least-once", "3.13", "At-least-once"], ["t3-notifikasi", "3.3", "Fitur: notifikasi"]] as const) {
      expect(dari(idh).nomor).toBe(nomor);
      teksM(nomor, awal);
      expect(dari(idh).judul.startsWith(awal)).toBe(true);
    }
    expect(dari("t3-outbox").adr).toEqual([23]);
    expect(dari("t2-race-lock").adr).toContain(13);
    expect(dari("t2-race-lock").nomor).toBe("2.11");
  });
});

describe("naskah: tiga hal, versi pertama, empat kejadian, dua pertanyaan, pola yang kembali", () => {
  test("kalimat inti 'akibat, bukan bagian' sama dengan naskah bagian 2", () => {
    expect(bag2).toContain("notifikasi adalah akibat dari uang yang bergerak, bukan bagian dari uang yang bergerak.");
    harus("Notifikasi adalah akibat dari uang yang bergerak, bukan bagian dari uang yang bergerak.");
  });
  test("tiga hal: judul, pemilik syarat, dan isinya sama dengan naskah, di tabel dan di Inti", () => {
    expect(tigaHal.map((h) => h.n)).toEqual(["1", "2", "3"]);
    expect(tigaHal.map((h) => h.pemilik)).toEqual(["Pak Hadi", "Sinta", "Direksi"]);
    for (const h of tigaHal) harus(`| ${h.n}. ${h.judul} | ${h.pemilik} | ${h.isi} |`);
    const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
    harus(`Tiga hal harus selalu benar: ${tigaHal.map((h) => lower(h.judul)).join(", ").replace(/, ([^,]+)$/, ", dan $1")}.`);
    expect(widget.tebak.petunjuk).toContain(`Tiga hal itu: ${tigaHal.map((h) => lower(h.judul)).join(", ").replace(/, ([^,]+)$/, ", dan $1")}.`);
    expect(JSON.stringify(rantai)).not.toMatch(/tiga hal/i);
  });
  test("versi pertama: Nadia dan Raka, urutan langkah sama dengan naskah dan dengan baris kode", () => {
    expect(bag3).toContain("Nadia dan Raka menulis urutan paling pendek");
    expect(bag3).toMatch(/`BEGIN`, kunci buku \(ADR 13\), `INSERT` jurnal dan posting, kirim push lewat HTTP, `COMMIT`\./);
    harus("Minggu 1, Nadia dan Raka menulis urutan paling pendek: buka transaction, kunci buku (ADR 13), tulis jurnal dan posting, kirim push lewat HTTP, lalu COMMIT.");
    expect(bag3).toContain("Di staging urutan ini tampak cukup.");
    harus("Di staging urutan ini tampak cukup.");
    expect(bag3).toContain("client HTTP memakai pengaturan bawaan Go yang tanpa batas waktu");
    const b = widget.baris;
    const idx = ["BeginTx(", "kunciBuku(", "catatJurnal(", "s.push.Kirim(", "tx.Commit()"].map((k) => b.findIndex((x) => x.includes(k)));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((x, y) => x - y)).toEqual(idx);
  });
  test("empat kejadian: nama, kolom, dan isi sel sama dengan naskah, di widget dan di tabel Paham", () => {
    expect(barisNaskah).toHaveLength(4);
    expect(kepalaNaskah).toEqual(["Kejadian", "1. Tidak mendahului uang", "2. Tidak hilang", "3. Tidak menunggu"]);
    const K = widget.kejadian!;
    expect(K.hal).toEqual(kepalaNaskah.slice(1));
    expect(K.baris.map((b) => b.nama)).toEqual(barisNaskah.map((b) => b[0]));
    barisNaskah.forEach((b, i) => {
      const sel3 = b.slice(1).map(selNaskah);
      expect(K.baris[i]!.sel.map((c) => ({ status: c.status, detail: c.detail?.toLowerCase() }))).toEqual(sel3.map((c) => ({ status: c.status, detail: c.detail?.toLowerCase() })));
    });
    expect(K.status).toEqual({ ya: "Ya", tidak: "Tidak", na: "Tidak berlaku" });
    // Tabel Paham: sel naskah apa adanya; dua sel Tidak tanpa awalan di naskah ("Uang menunggu ...") ditulis "Tidak: uang menunggu ..." (keputusan 1012).
    harus(`| ${kepalaNaskah.join(" | ")} |`);
    for (const b of barisNaskah) {
      const sel4 = b.slice(1).map((t) => (t === "Ya" || t === "Tidak berlaku" || t.startsWith("Tidak: ") ? t : `Tidak: ${t.charAt(0).toLowerCase()}${t.slice(1)}`));
      harus(`| ${b[0]} | ${sel4.join(" | ")} |`);
    }
  });
  test("lima sel Tidak: satu hal pertama, satu hal kedua, tiga hal ketiga, dihitung dari data", () => {
    const K = widget.kejadian!;
    const perHal = K.hal.map((_, j) => K.baris.filter((b) => b.sel[j]!.status === "tidak").length);
    expect(perHal).toEqual([1, 1, 3]);
    harus(`Keempatnya menghasilkan ${kata(perHal.reduce((a, b) => a + b, 0))} sel Tidak: ${kata(perHal[0]!)} untuk hal pertama, ${kata(perHal[1]!)} untuk hal kedua, dan ${kata(perHal[2]!)} untuk hal ketiga.`);
    expect(K.baris).toHaveLength(4);
    harus("keempat kejadian di atas");
    // Baris kode 13 (push di dalam transaction) menyentuh hal 1 dan 3; baris 14 (error hanya di log) menyentuh hal 2.
    expect(widget.bug).toEqual([13, 14]);
    expect(widget.alasan["13"]!.startsWith("Hal 1 dan hal 3.")).toBe(true);
    expect(widget.alasan["14"]!.startsWith("Hal 2.")).toBe(true);
    expect(K.baris.filter((b) => b.sel[0]!.status === "tidak").map((b) => b.nama)).toEqual(["Push berhasil, COMMIT gagal"]);
    expect(K.baris.filter((b) => b.sel[1]!.status === "tidak").map((b) => b.nama)).toEqual(["Push gagal, error dicatat saja"]);
    expect(K.baris.filter((b) => b.sel[2]!.status === "tidak").map((b) => b.nama)).toEqual(["Push berhasil, COMMIT berhasil", "Push gagal, error dicatat saja", "Push menggantung"]);
  });
  test("dua pertanyaan minggu 1 dan jawabannya M18 sampai M20, sama dengan naskah", () => {
    expect(bag3).toContain("Di minggu 1 Bayu bertanya apakah uang ikut menunggu bila layanan push lambat. Pak Hadi bertanya bagaimana ia tahu satu pemberitahuan sesuai satu jurnal. Jawabannya ada di M18 sampai M20.");
    harus("Di minggu 1, dua pertanyaan ditanam. Bayu bertanya apakah uang ikut menunggu bila layanan push lambat. Pak Hadi bertanya bagaimana ia tahu satu pemberitahuan sesuai satu jurnal. Jawabannya ada di [[t3-m18]], [[t3-m19]], dan [[t3-m20]].");
  });
  test("pola dua tempat kembali di M22, M23, M24, M27, dan aturan source of truth, sama dengan naskah", () => {
    expect(bag3).toContain("Pola dua tempat ini muncul lagi di cache (M23), memori dua server (M22), queue offline di HP (M24), dan queue worker (M27).");
    harus("muncul lagi di memori dua server ([[t3-m22]]), cache ([[t3-m23]]), queue offline di HP ([[t3-m24]]), dan queue worker ([[t3-m27]]).");
    expect(bag3).toContain("PostgreSQL tetap satu-satunya source of truth; yang lain hanya salinan atau perantara yang boleh stale, tetapi tidak boleh menggerakkan uang.");
    harus("PostgreSQL tetap satu-satunya source of truth, dan yang lain hanya salinan atau perantara yang boleh stale, tetapi tidak boleh menggerakkan uang.");
  });
  test("istilah layanan push: arti sama dengan 3.1", () => {
    expect(baca("situs/src/content/docs/tahap-3/prd-v3.mdx")).toContain("layanan push, yaitu layanan yang meneruskan pesan ke HP");
    harus("Layanan push adalah layanan di luar PostgreSQL yang meneruskan pesan ke HP.");
  });
});

describe("rekaman: rentan.txt A dan B, transaksi.txt, little.txt, dan rentang Snippet", () => {
  test("bagian B: push mati, sepuluh pembayaran 201, outbox 0, sepuluh baris log; kalimat Inti dari angka rekaman", () => {
    const bayar = bagianB.join("\n").match(/^(\d+) pembayaran: (\d+) x(\d+)$/m)!;
    expect(bayar.slice(1)).toEqual(["10", "201", "10"]);
    expect(bagianB.some((b) => b.startsWith("$ kill -TERM <pid push tiruan>"))).toBe(true);
    const baris = bagianB.find((b) => /^ \d+ +\| \d+$/.test(b))!;
    const [jurnal, outbox] = baris.split("|").map((x) => x.trim());
    expect([jurnal, outbox]).toEqual(["10", "0"]);
    const log = bagianB.join("\n").match(/server log: (\d+) baris 'push gagal, hanya dicatat/)!;
    expect(log[1]).toBe("10");
    harus(`Saat layanan push mati, ${kata(Number(bayar[1]))} pembayaran selesai dengan ${bayar[2]}, tabel \`outbox\` tetap ${outbox} baris, dan kegagalan hanya ada di ${kata(Number(log[1]))} baris log (\`rentan.txt\` bagian B).`);
    expect(bagianB.join("\n")).toContain("# Sepuluh pemberitahuan hilang tanpa ada yang tahu, kecuali yang membaca log");
    // Rantai ringkas: simpul baris 1.
    expect(rantai.baris[0]!.simpul.map((s) => s.teks)).toEqual([`${bayar[1]} pembayaran: ${bayar[2]}`, "push gagal: hanya log", `${outbox} baris di database`]);
    expect(rantai.baris[0]!.simpul[1]!.sub).toBe(`${log[1]} baris log`);
  });
  test("bagian A: sepuluh koneksi idle in transaction, permintaan ke-11 tanpa jawaban selama 2 detik; Inti dan Rantai", () => {
    const a = bagianA.join("\n");
    expect(a).toMatch(/membayar sepuluh warung berbeda \(tanpa rebutan lock buku\), semuanya bersamaan/);
    expect(a).toMatch(/^ idle in transaction \| 10$/m);
    expect(a).toContain('{"dipakai":10,"maks":10,"menganggur":0,"menunggu":0,"terbuka":10}');
    const ke = a.match(/^# Request ke-(\d+): Budi hanya membuka saldonya \(GET \/akun\/419\)\. Server butuh satu koneksi bebas bahkan untuk memeriksa sesinya\.$/m)!;
    expect(ke[1]).toBe("11");
    expect(a).toContain("(tidak ada jawaban)");
    const detik = a.match(/# curl berhenti menunggu sesudah (\d+) detik/)!;
    expect(detik[1]).toBe("2");
    harus(`Saat push menggantung, ${kata(10)} pembayaran serentak menahan ${kata(10)} koneksi, dan permintaan ke-${ke[1]}, membuka saldo, tidak dijawab selama ${detik[1]} detik pengamatan (bagian A).`);
    expect(rantai.baris[1]!.simpul.map((s) => s.teks)).toEqual(["10 pembayaran serentak", "10 koneksi tertahan", "buka saldo: tanpa jawaban"]);
    expect(rantai.baris[1]!.simpul[2]!.sub).toBe(`permintaan ke-${ke[1]}, ${detik[1]} detik`);
    expect(rantai.baris[1]!.simpul[1]!.sub).toBe("idle in transaction");
    harus("Saat push menggantung");
  });
  test("rentang Snippet diturunkan dari baris rekaman, bukan ditulis tangan", () => {
    const nomor = (baris: string[], i: number) => i + 1;
    const b1 = nomorBaris(rentan, (b) => b.startsWith("10 pembayaran: 201 x10"), iB);
    const b2 = nomorBaris(rentan, (b) => b.startsWith("# Sepuluh pemberitahuan hilang"), iB);
    harus(`<Snippet file="labs/api-t3/output/rentan.txt" lines="${nomor(rentan, b1)}:${nomor(rentan, b2)}"`);
    const a1 = nomorBaris(rentan, (b) => b.startsWith("=> SELECT state, count(*) FROM pg_stat_activity"), iA);
    const a2 = nomorBaris(rentan, (b) => b === "(1 row)", a1);
    const a3 = nomorBaris(rentan, (b) => b.startsWith("# Request ke-11"), iA);
    const a4 = nomorBaris(rentan, (b) => b.startsWith("# curl berhenti menunggu sesudah"), a3);
    harus(`<Snippet files={["labs/api-t3/output/rentan.txt:${nomor(rentan, a1)}:${nomor(rentan, a2)}", "labs/api-t3/output/rentan.txt:${nomor(rentan, a3)}:${nomor(rentan, a4)}"]}`);
    expect(a4 - a3).toBe(3);
    const d1 = nomorBaris(transaksi, (b) => b.startsWith("# Sesi tangan: jurnal 90003 tidak seimbang"));
    const d2 = nomorBaris(transaksi, (b) => b === "=> COMMIT", d1);
    const d3 = nomorBaris(transaksi, (b) => b.includes("AS outbox_90003"), d2);
    const d4 = nomorBaris(transaksi, (b) => b === "(1 row)", d3);
    harus(`<Snippet file="labs/t3-outbox/output/transaksi.txt" lines="${nomor(transaksi, d2)}:${nomor(transaksi, d4)}"`);
    expect(transaksi.slice(d2, d4 + 1).join("\n")).toMatch(/ERROR: {2}jurnal 90003 tidak seimbang[\s\S]*SQLSTATE 23514 · constraint jurnal_seimbang[\s\S]* 0 {12}\| 0\n\(1 row\)/);
    harus("(jurnal tidak seimbang, SQLSTATE 23514)");
  });
  test("transaksi.txt: A pembayaran selesai sebelum push menerima, B worker tidak melihat baris sebelum COMMIT, C ROLLBACK, F API mati sesudah COMMIT, G outbox gagal membatalkan pembayaran", () => {
    const A = trx("A").join("\n");
    expect(A).toContain("push tiruan menerima: 0 (pembayaran selesai, pemberitahuan belum dikirim");
    expect(A).toMatch(/worker: diklaim 1, terkirim 1[\s\S]*push tiruan menerima: 1\s*$/);
    const B = trx("B").join("\n");
    const sebelum = B.split("=> COMMIT")[0]!;
    const sesudah = B.split("=> COMMIT")[1]!;
    expect(sebelum).toContain("worker: diklaim 0, terkirim 0");
    expect(sesudah).toContain("worker: diklaim 1, terkirim 1");
    const C = trx("C").join("\n");
    expect(C).toContain("=> ROLLBACK");
    expect(C).toMatch(/ 0 {12}\| 0\n\(1 row\)/);
    const F = trx("F").join("\n");
    expect(F).toContain("$ kill -KILL <pid api-t3>");
    expect(F).toMatch(/menunggu[\s\S]*terkirim/);
    expect(F).toContain("Opsi itu Tidak dijalankan di lab ini.");
    expect(F).toContain("kirim sesudah COMMIT di proses API, opsi ADR 23");
    const G = trx("G").join("\n");
    expect(G).toContain("HTTP/1.1 500 Internal Server Error");
    expect(G).toContain("Pembayaran ditolak dan tidak meninggalkan jurnal, posting, atau perubahan saldo: INSERT outbox ada di transaction jurnal.");
    // Putuskan dan catatan perbaikan menyebut bagian rekaman yang sama.
    harus("Rekaman lab `transaksi.txt`: hal 1 di bagian B (worker tidak melihat baris sebelum COMMIT), hal 2 di bagian F (API mati sesudah COMMIT, baris tetap ada dan dikirim worker), hal 3 di bagian A (pembayaran selesai sebelum push menerima apa pun)");
    harus("Di `transaksi.txt` bagian A, layanan push tiruan menerima 0 pesan saat pembayaran selesai, dan 1 pesan sesudah worker berjalan.");
    harus("`transaksi.txt` bagian F menulis opsi ini Tidak dijalankan di lab Tahap 3");
  });
  test("little.txt: untuk push 0,3, 2, dan 10 detik, lama satu pembayaran sama dengan t ditambah kurang dari 50 ms", () => {
    const t = [...little.matchAll(/^# --- t = (\d+(?:,\d+)?) detik: layanan push menjawab/gm)].map((m) => m[1]!.replace(/,0$/, ""));
    expect(t).toEqual(["0,3", "2", "10"]);
    const w = [...little.matchAll(/^W dari data \(rata-rata satu pembayaran\): t ditambah kurang dari (\d+) ms .*: ya$/gm)].map((m) => m[1]);
    expect(w).toEqual(["50", "50", "50"]);
    harus(`Untuk push yang menjawab sesudah ${t[0]}, ${t[1]}, dan ${t[2]} detik, lama satu pembayaran sama dengan lama jawaban ditambah kurang dari ${w[0]} ms.`);
    expect(little).toContain("(batas lab; Asumsi naskah 20 ms)");
  });
});

describe("kode lab: DalamTx, beritahu, bayar", () => {
  test("DalamTx: BeginTx, defer Rollback, fn, Commit; widget memakai bentuk yang sama", () => {
    const urut = ["BeginTx(ctx, nil)", "defer tx.Rollback()", "fn(Tx{tx})", "tx.Commit()"].map((k) => txGo.indexOf(k));
    expect(urut.every((i) => i >= 0)).toBe(true);
    expect([...urut].sort((a, b) => a - b)).toEqual(urut);
    const b = widget.baris.map((x) => x.trim());
    for (const k of ["tx, err := s.db.BeginTx(ctx, nil)", "defer tx.Rollback()", "return tx.Commit()"]) expect(b).toContain(k);
    expect(widget.sumber.teks).toContain("Bentuk BeginTx, defer Rollback, dan Commit sama dengan DalamTx di labs/api-t3");
  });
  test("beritahu: mode rentan mengirim push di dalam transaction dan hanya mencatat error; Bayar memanggilnya di dalam DalamTx", () => {
    expect(notifGo).toContain("// --8<-- [start:beritahu]");
    const region = notifGo.split("// --8<-- [start:beritahu]")[1]!.split("// --8<-- [end:beritahu]")[0]!;
    expect(region).toContain("s.push.Kirim(");
    expect(region).toContain('log.Printf("push gagal, hanya dicatat: %v", err)');
    expect(region.indexOf("s.push.Kirim(")).toBeLessThan(region.indexOf("return nil"));
    expect(bayarGo.indexOf("s.repo.DalamTx(")).toBeLessThan(bayarGo.indexOf("s.beritahu("));
    expect(bayarGo.indexOf("KunciBukuAkun(")).toBeLessThan(bayarGo.indexOf("CatatJurnal("));
    expect(bayarGo.indexOf("CatatJurnal(")).toBeLessThan(bayarGo.indexOf("s.beritahu("));
    harus('<Snippet file="labs/api-t3/internal/service/notif.go" region="beritahu" lang="go"');
    // Baris 14 widget memuat pesan log yang sama dengan kode lab.
    expect(widget.baris[14]!.trim()).toBe('log.Printf("push gagal, hanya dicatat: %v", err)');
    expect(widget.baris[13]).toContain("s.push.Kirim(");
    expect(widget.baris[6]).toContain("kunciBuku(");
    expect(widget.baris[9]).toContain("catatJurnal(");
    expect(widget.baris[16]!.trim()).toBe("return tx.Commit()");
    expect(Object.keys(widget.aman).sort()).toEqual(["16", "6", "9"]);
  });
  test("perbaikan: tepat dua baris berbeda dari versi pertama (dua baris bug), tanpa panggilan push atau HTTP", () => {
    const p = widget.perbaikan.baris;
    expect(p).toHaveLength(widget.baris.length);
    const beda = p.map((x, i) => (x === widget.baris[i] ? -1 : i)).filter((i) => i >= 0);
    expect(beda).toEqual(widget.bug);
    expect(p.join("\n")).not.toMatch(/push|http|Kirim/i);
    expect(p[13]).toContain("tulisOutbox(");
    expect(widget.perbaikan.label).toBe("Dua baris diganti: tulis ke database dulu, kirim belakangan");
    harus("Dua baris diganti, dan di versi itu tidak ada baris yang memanggil layanan push.");
    expect(widget.perbaikan.catatan).toContain(`halaman ${dari("t3-outbox").nomor}`);
  });
  test("klaim Tidak dijalankan: tidak ada berkas output lab Tahap 3 yang memuat mode push-dalam-tx dan penolakan COMMIT", () => {
    const labs = ["api-t3", ...fs.readdirSync(path.join(akar, "labs")).filter((n) => n.startsWith("t3-"))];
    const berkas = labs.flatMap((l) => {
      const dir = path.join(akar, "labs", l, "output");
      return fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => path.join(dir, f)) : [];
    });
    expect(berkas.length).toBeGreaterThan(20);
    const kena = berkas.filter((f) => {
      const isi = fs.readFileSync(f, "utf8");
      return isi.includes("push-dalam-tx") && /SQLSTATE|COMMIT ditolak|ERROR: {2}/.test(isi);
    });
    expect(kena.map((f) => path.relative(akar, f))).toEqual([]);
    expect(widget.alasan["13"]).toContain("Tidak dijalankan di lab Tahap 3, dari urutan kode");
  });
});

describe("label, versi, dan sumber", () => {
  test("pemakaian pertama label ditautkan ke /cara-pakai/#label-sumber, dan anchor-nya ada", () => {
    harus("Rekaman lab ([Label sumber](/cara-pakai/#label-sumber))");
    expect(badan.indexOf("Rekaman lab ([Label sumber]")).toBeLessThan(badan.indexOf("Tidak dijalankan"));
    expect(baca("situs/src/content/docs/cara-pakai.mdx")).toMatch(/^#{2,3} Label sumber/m);
    harus("Ilustrasi, yaitu contoh dan bukan hasil sistem");
    expect(baca(".claude/skills/gaya-bahasa/SKILL.md")).toContain("Ilustrasi: skenario atau contoh, bukan hasil sistem");
  });
  test("net/http: Go 1.27.3 dan 'A Timeout of zero means no timeout' dari riset; PostgreSQL 17 sama dengan versi rekaman", () => {
    const riset = baca("plan/RISET-TAHAP-3.md");
    expect(riset).toMatch(/\| R3-08 \|[^\n]*Go 1\.27\.3 net\/http client\.go: "A Timeout of zero means no timeout"/);
    harus("([dokumentasi net/http, Go 1.27.3](https://pkg.go.dev/net/http#Client), dibuka 2026-10-26)");
    harus("Client HTTP memakai pengaturan bawaan Go, dan di sana nol berarti tanpa batas waktu");
    harus("karena nol berarti tanpa batas ([net/http](https://pkg.go.dev/net/http#Client))");
    harus("- [Go: net/http, tipe Client](https://pkg.go.dev/net/http#Client) (Go 1.27.3)");
    const pg = rentan.join("\n").match(/PostgreSQL (\d+)\.(\d+)/)!;
    expect(pg[1]).toBe("17");
    harus(`https://www.postgresql.org/docs/${pg[1]}/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW`);
    expect(badan.match(/postgresql\.org\/docs\/(\d+)\//g)!.every((x) => x.includes(`/${pg[1]}/`))).toBe(true);
    // Arti idle in transaction: PostgreSQL 17.11 monitoring-stats, dibuka 2026-10-26: "The backend is in a transaction, but is not currently executing a query."
    harus("Status `idle in transaction` berarti sesi database membuka transaction dan sedang tidak menjalankan query");
  });
  test("ADR 13 dan aturan 'tidak ada panggilan jaringan' ada di halaman 2.11", () => {
    expect(baca("situs/src/content/docs/tahap-2/race-lock.mdx")).toContain("Tidak ada panggilan jaringan atau kerja lambat selama lock dipegang.");
    harus("Tidak ada panggilan HTTP, push, atau email di dalam transaction yang memegang lock ([[t2-race-lock]]).");
    harus("kunci buku (ADR 13)");
    expect(widget.aman["6"]).toContain("Kunci buku (ADR 13)");
  });
  test("ID riset dan ID internal tidak tampil", () => {
    expect(mdx).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(JSON.stringify(widgetMentah) + JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b/);
  });
  test("halaman tidak membuka isi halaman 3.5 sampai 3.13 lebih dari arah jawabannya", () => {
    expect(badan).not.toMatch(/SKIP LOCKED|klaim_sampai|FOR UPDATE|dead-letter|backoff/);
    expect(JSON.stringify(widgetMentah)).not.toMatch(/SKIP LOCKED|klaim_sampai|dead-letter|backoff/);
  });
});

describe("widget cari-bug: skema, periksa, ringkas, dan teks", () => {
  test("skema menerima data; periksa menilai dua baris bug; ringkas mengisi tiga angka", () => {
    const tepat = periksa(widget, new Set([13, 14]));
    expect(tepat).toMatchObject({ tepat: true, jumlahBenar: 2, jumlahBug: 2 });
    const salah = periksa(widget, new Set([13, 16]));
    expect(salah.tepat).toBe(false);
    expect(salah.nilai).toEqual({ 13: "benar", 14: "lewat", 16: "salah" });
    expect(ringkas(widget.label.ringkas!, tepat)).toBe("Kamu menandai 2 dari 2 baris yang bermasalah, dan 0 baris lain ikut ditandai.");
    expect(ringkas(widget.label.ringkas!, salah)).toBe("Kamu menandai 1 dari 2 baris yang bermasalah, dan 1 baris lain ikut ditandai.");
  });
  test("skema menolak jumlah sel yang tidak sama dengan jumlah hal", () => {
    const rusak = structuredClone(widgetMentah) as typeof widgetMentah;
    rusak.kejadian.baris[0]!.sel.pop();
    expect(DataCariBug.safeParse(rusak).success).toBe(false);
  });
  test("teks widget yang ditulis penulis dikunci utuh", () => {
    expect({
      id: widget.id,
      judul: widget.judul,
      sumberJenis: widget.sumber.jenis,
      sumberTeks: widget.sumber.teks,
      tebak: widget.tebak,
      alasan: widget.alasan,
      aman: widget.aman,
      label: widget.label,
      kejadianJudul: widget.kejadian!.judul,
      perbaikanCatatan: widget.perbaikan.catatan,
    }).toEqual(TEKS_WIDGET);
  });
  test("diagram Rantai: ilustrasi atau rekaman sesuai sumbernya, teks dikunci utuh", () => {
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab api-t3, rentan.txt bagian A dan B" });
    expect(rantai.baris.map((b) => [b.label, b.sub])).toEqual([["Push mati", "rentan.txt B"], ["Push menggantung", "rentan.txt A"]]);
    expect(rantai.baris.map((b) => b.simpul.map((s) => s.nada))).toEqual([["biasa", "warn", "warn"], ["biasa", "warn", "warn"]]);
    expect(rantai.baris[0]!.simpul.map((s) => s.sub)).toEqual(["semuanya selesai", "10 baris log", "tabel outbox kosong"]);
    expect(rantai.judul).toBe("Versi pertama, dua kegagalan push");
    expect(rantai.catatan).toBe("Kotak oranye adalah akibat yang direkam. Kedua baris memakai versi pertama dengan layanan push tiruan lokal.");
    expect(rantai.id).toBe("t3-dua-tempat-inti");
  });
});

// Baris halaman yang bukan hasil turunan: paragraf, item daftar, sel tabel, judul, dan atribut `aman`. Setiap baris
// harus ada di KALIMAT_PENULIS; setiap entri di KALIMAT_PENULIS harus ada di halaman.
function satuan(b: string): string[] {
  const hasil: string[] = [];
  for (const mentah of b.split("\n")) {
    const l = mentah.trim();
    if (!l || l.startsWith("import ") || l.startsWith("<Snippet") || l.startsWith("<Rantai") || l.startsWith("<CariBug") || l.startsWith("<p class=\"meta\"")) continue;
    if (l.startsWith("</") || l.startsWith("<details") || l.startsWith("<summary>") || /^\|[-| ]+\|$/.test(l)) continue;
    const aman = l.match(/^<Blok nama="[^"]+"(?: buka)?(?: aman="([^"]+)")?>$/);
    if (aman) {
      if (aman[1]) hasil.push(aman[1]);
      continue;
    }
    if (l.startsWith("|")) {
      for (const c of l.split("|").slice(1, -1)) hasil.push(c.trim());
      continue;
    }
    hasil.push(l.replace(/^#+ /, "").replace(/^(- \[ \] |- |\d+\. )/, ""));
  }
  return hasil;
}

describe("setiap kalimat di halaman punya asal", () => {
  const turunan = new Set<string>([
    ...tigaHal.flatMap((h) => [`${h.n}. ${h.judul}`, h.pemilik, h.isi]),
    ...kepalaNaskah,
    ...barisNaskah.flatMap((b) => b.map((t) => (t === "Ya" || t === "Tidak berlaku" || t.startsWith("Tidak: ") ? t : `Tidak: ${t.charAt(0).toLowerCase()}${t.slice(1)}`))),
    ...barisNaskah.map((b) => b[0]!),
  ]);
  test("tidak ada kalimat yang bukan turunan dan tidak dikunci", () => {
    const tanpaAsal = satuan(badan).filter((s) => !turunan.has(s) && !KALIMAT_PENULIS.includes(s));
    expect(tanpaAsal).toEqual([]);
  });
  test("tidak ada entri terkunci yang sudah hilang dari halaman", () => {
    const ada = new Set(satuan(badan));
    expect(KALIMAT_PENULIS.filter((s) => !ada.has(s))).toEqual([]);
  });
});

// Teks widget dan kalimat halaman yang ditulis penulis (bukan turunan dari naskah atau rekaman), dikunci utuh.
const TEKS_WIDGET = {
  "id": "t3-dua-tempat-caribug",
  "judul": "Versi pertama minggu 1: bayar, lalu kirim push",
  "sumberJenis": "ilustrasi",
  "sumberTeks": "Ringkasan urutan versi pertama dari naskah Tahap 3 bagian 3. Bentuk BeginTx, defer Rollback, dan Commit sama dengan DalamTx di labs/api-t3, dan pesan log sama dengan notif.go; nama fungsi lain disederhanakan. Perilakunya direkam di rentan.txt bagian A dan B, lewat mode rentan push-dalam-tx.",
  "tebak": {
    "q": "Dua baris di handler ini membuat satu dari tiga hal yang harus selalu benar tidak lagi terjaga. Yang mana?",
    "petunjuk": "Tiga hal itu: pemberitahuan tidak mendahului uangnya, uang yang tercatat tidak kehilangan pemberitahuannya tanpa ada yang tahu, dan uang tidak menunggu pihak luar. Untuk tiap baris, tanya: kalau baris ini gagal, lambat, atau jalan lebih dulu, hal mana yang rusak?"
  },
  "alasan": {
    "13": "Hal 1 dan hal 3. Push dikirim di dalam transaction, sebelum COMMIT. Kalau COMMIT gagal sesudahnya, Citra sudah diberi tahu uang yang tidak ada (Tidak dijalankan di lab Tahap 3, dari urutan kode). Selama push belum menjawab, sepuluh pembayaran serentak menahan sepuluh koneksi (Rekaman lab rentan.txt bagian A).",
    "14": "Hal 2. Error push hanya masuk log, tanpa baris di database. Di rekaman, push dimatikan: sepuluh pembayaran selesai dengan 201, tabel outbox tetap 0 baris, dan log berisi sepuluh baris \"push gagal, hanya dicatat\" (Rekaman lab rentan.txt bagian B)."
  },
  "aman": {
    "6": "Kunci buku (ADR 13) harus ada sebelum saldo dibaca. Baris ini bukan masalahnya. Yang menentukan adalah apa yang dikerjakan selama kunci dipegang.",
    "9": "Jurnal ditulis di transaction ini, jadi ia ikut batal bila transaction batal (Rekaman lab transaksi.txt bagian C dan D).",
    "16": "COMMIT di akhir sudah tepat untuk data di PostgreSQL. Yang salah adalah apa yang sudah terkirim sebelum COMMIT sampai."
  },
  "label": {
    "sumber": "Ilustrasi: ringkasan versi pertama",
    "tebakDulu": "Tebak dulu:",
    "perintah": "Klik baris yang membuat satu dari tiga hal tidak terjaga, lalu Periksa.",
    "periksa": "Periksa tanda saya",
    "ulang": "Ulang",
    "benar": "sumber masalah",
    "lewat": "terlewat",
    "salahTanda": "baris ini tidak salah",
    "perbaikanTombol": "Lihat versi benar",
    "ringkas": "Kamu menandai {benar} dari {bug} baris yang bermasalah, dan {salah} baris lain ikut ditandai."
  },
  "kejadianJudul": "Empat kejadian di versi pertama",
  "perbaikanCatatan": "Pemberitahuan menjadi satu baris di tabel outbox, di transaction yang sama dengan jurnal. Di rekaman, COMMIT menyimpan keduanya (transaksi.txt bagian A), sedangkan ROLLBACK dan COMMIT yang ditolak membuang keduanya (bagian C dan D). Kalau penulisan outbox gagal, pembayaran ikut batal (bagian G). Worker mengirim pesan itu sesudah COMMIT; caranya ada di halaman 3.9."
};

const KALIMAT_PENULIS: string[] = [
  "Inti",
  "Satu transfer menyentuh dua tempat, PostgreSQL dan layanan push, dan keduanya tidak bisa COMMIT bersama.",
  "Layanan push adalah layanan di luar PostgreSQL yang meneruskan pesan ke HP. Versi pertama minggu 1 mengirim push di dalam transaction, dan Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) memerankannya dengan mode rentan `push-dalam-tx`. Saat layanan push mati, sepuluh pembayaran selesai dengan 201, tabel `outbox` tetap 0 baris, dan kegagalan hanya ada di sepuluh baris log (`rentan.txt` bagian B). Saat push menggantung, sepuluh pembayaran serentak menahan sepuluh koneksi, dan permintaan ke-11, membuka saldo, tidak dijawab selama 2 detik pengamatan (bagian A).",
  "Tiga hal harus selalu benar: pemberitahuan tidak mendahului uangnya, uang yang tercatat tidak kehilangan pemberitahuannya tanpa ada yang tahu, dan uang tidak menunggu pihak luar. Push mati melanggar hal kedua, dan push menggantung melanggar hal ketiga. Hal pertama rusak bila COMMIT gagal sesudah push terkirim. Kejadian itu Tidak dijalankan di lab Tahap 3, jadi ia penalaran dari urutan kode.",
  "Push dimatikan, dan sepuluh pembayaran tetap selesai dengan 201. Hal mana dari tiga hal yang rusak?",
  "Layanan push menggantung, dan Budi hanya membuka saldo. Kenapa permintaannya ikut tidak dijawab?",
  "Push sudah diterima layanan push, lalu database menolak COMMIT. Kenapa ROLLBACK tidak menolong?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "Kalau berhenti di sini, kamu sudah tahu: dua baris, kirim push di dalam transaction dan error yang hanya dicatat di log, membuat tiga hal tidak terjaga.",
  "Minggu 1, Nadia dan Raka menulis urutan paling pendek: buka transaction, kunci buku (ADR 13), tulis jurnal dan posting, kirim push lewat HTTP, lalu COMMIT. Client HTTP memakai pengaturan bawaan Go, dan di sana nol berarti tanpa batas waktu ([dokumentasi net/http, Go 1.27.3](https://pkg.go.dev/net/http#Client), dibuka 2026-10-26). Di staging urutan ini tampak cukup.",
  "Kode di bawah adalah Ilustrasi, yaitu contoh dan bukan hasil sistem: ringkasan versi pertama, dengan bentuk transaction yang sama dengan `DalamTx` di lab. Perilakunya direkam di Rekaman lab lewat mode rentan `push-dalam-tx`.",
  "Dua baris yang kamu tandai mengisi keempat kejadian di atas. Keempatnya menghasilkan lima sel Tidak: satu untuk hal pertama, satu untuk hal kedua, dan tiga untuk hal ketiga.",
  "**Ubah satu hal:** tekan Lihat versi benar sesudah memeriksa. Dua baris diganti, dan di versi itu tidak ada baris yang memanggil layanan push.",
  "Kenapa ini ada",
  "Transfer Budi ke Citra menulis satu jurnal dan dua posting di PostgreSQL, dan HP Citra harus berbunyi ([[t3-notifikasi]]). PostgreSQL bisa COMMIT atau ROLLBACK jurnal dan posting itu sebagai satu unit ([[B3.1]]). Layanan push bukan bagian dari PostgreSQL, jadi ia tidak ikut unit itu.",
  "Notifikasi adalah akibat dari uang yang bergerak, bukan bagian dari uang yang bergerak. Dari kalimat itu lahir tiga hal yang harus selalu benar, masing-masing dengan pemilik syaratnya:",
  "Hal yang harus selalu benar",
  "Syarat dari",
  "Isinya",
  "Di minggu 1, dua pertanyaan ditanam. Bayu bertanya apakah uang ikut menunggu bila layanan push lambat. Pak Hadi bertanya bagaimana ia tahu satu pemberitahuan sesuai satu jurnal. Jawabannya ada di [[t3-m18]], [[t3-m19]], dan [[t3-m20]].",
  "Cara kerjanya",
  "**Yang ikut satu COMMIT.** Jurnal dan baris lain yang ditulis di transaction yang sama ikut satu COMMIT. Di rekaman lab t3-outbox, COMMIT yang ditolak database (jurnal tidak seimbang, SQLSTATE 23514) tidak meninggalkan jurnal, dan baris `outbox` yang ditulis bersamanya ikut hilang:",
  "**Yang tidak ikut.** Pesan yang sudah diterima layanan push tidak ikut batal bila COMMIT gagal sesudahnya. Kejadian itu Tidak dijalankan di lab Tahap 3. Ia dibaca dari urutan kode lab, tempat `beritahu` dipanggil di dalam transaction dan COMMIT datang sesudahnya:",
  "**Push mati.** Layanan push dimatikan, lalu sepuluh pembayaran dijalankan. Semuanya selesai, dan tidak ada baris di database yang menandai pemberitahuan yang gagal:",
  "**Push menggantung.** Layanan push menerima permintaan dan tidak menjawab. Sepuluh pembayaran ke sepuluh warung berbeda, serentak, memegang sepuluh koneksi dengan transaction terbuka. Permintaan ke-11 hanya membuka saldo, tetapi server butuh satu koneksi bebas bahkan untuk memeriksa sesinya:",
  "Status `idle in transaction` berarti sesi database membuka transaction dan sedang tidak menjalankan query ([PostgreSQL 17: pg_stat_activity](https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW)). Sepuluh pembayaran serentak bukan beban berjadwal; rekaman dengan beban berjadwal ada di [[t3-m18]].",
  "**Empat kejadian.** Tabel yang terisi di blok Coba, lengkap dengan hal yang rusak:",
  "Sel Ya dan Tidak berlaku adalah penalaran dari urutan kode, bukan rekaman terpisah. Yang direkam hanya sel Tidak di bawah ini:",
  "**Baris 1, hal 3:** Rekaman lab `little.txt` (lab t3-pool). Untuk push yang menjawab sesudah 0,3, 2, dan 10 detik, lama satu pembayaran sama dengan lama jawaban ditambah kurang dari 50 ms.",
  "**Baris 2, hal 1:** Tidak dijalankan. Yang direkam hanya bahwa database bisa menolak COMMIT (`transaksi.txt` bagian D).",
  "**Baris 3, hal 2:** Rekaman lab `rentan.txt` bagian B. Hal 3 di baris yang sama dibaca dari urutan kode.",
  "**Baris 4, hal 3:** Rekaman lab `rentan.txt` bagian A.",
  "Di app Flutter kamu mungkin pernah menyimpan data ke database lokal lalu memanggil API. Itu juga dua tempat: penyimpanan lokal yang berhasil tidak menjamin API berhasil.",
  "**Pola ini kembali.** Dua tempat yang tidak bisa commit bersama muncul lagi di memori dua server ([[t3-m22]]), cache ([[t3-m23]]), queue offline di HP ([[t3-m24]]), dan queue worker ([[t3-m27]]). Halaman itu yang merekamnya. Aturannya sama: PostgreSQL tetap satu-satunya source of truth, dan yang lain hanya salinan atau perantara yang boleh stale, tetapi tidak boleh menggerakkan uang.",
  "Trade-off: kapan pakai apa",
  "Cara mengirim pemberitahuan",
  "Yang rusak atau dijaga",
  "Bukti",
  "Kirim di dalam transaction (versi pertama)",
  "Hal 1, 2, dan 3 bisa rusak, di kejadian berbeda",
  "Rekaman lab `rentan.txt` bagian A dan B; hal 1 Tidak dijalankan",
  "Kirim sesudah COMMIT, tanpa catatan di database",
  "Hal 2: proses yang mati di antara COMMIT dan kirim tidak meninggalkan catatan",
  "Tidak dijalankan: `transaksi.txt` bagian F menulis opsi ini Tidak dijalankan di lab Tahap 3",
  "Tulis pemberitahuan sebagai satu baris di transaction yang sama, kirim dari worker",
  "Tiga hal terjaga di rekaman; ongkosnya satu tabel dan satu proses worker",
  "Rekaman lab `transaksi.txt`: hal 1 di bagian B (worker tidak melihat baris sebelum COMMIT), hal 2 di bagian F (API mati sesudah COMMIT, baris tetap ada dan dikirim worker), hal 3 di bagian A (pembayaran selesai sebelum push menerima apa pun)",
  "**Biaya cara ketiga.** Pembayaran selesai lebih dulu, dan pemberitahuan menyusul dari worker. Di `transaksi.txt` bagian A, layanan push tiruan menerima 0 pesan saat pembayaran selesai, dan 1 pesan sesudah worker berjalan. Cara kerjanya, alasan memilihnya, dan kapan keputusan itu salah ada di [[t3-outbox]].",
  "Sengaja belum dilakukan",
  "Yang ditunda",
  "Kenapa ditunda",
  "Muncul lagi di",
  "Batas waktu client dan ukuran pool",
  "Pertanyaan Bayu menunggu rekaman beban berjadwal",
  "[[t3-pool]]",
  "Outbox dan worker",
  "Halaman ini hanya merumuskan pertanyaan",
  "[[t3-outbox]]",
  "Pengiriman ulang dan pesan ganda",
  "Jawaban untuk pertanyaan Pak Hadi",
  "[[t3-at-least-once]]",
  "Cek diri",
  "**1.** Push dimatikan dan sepuluh pembayaran tetap selesai dengan 201. Hal mana yang rusak, dan apa buktinya?",
  "Hal kedua. Di `rentan.txt` bagian B, jurnal pembayaran ada 10 dan tabel `outbox` 0 baris. Kegagalan push hanya ada di sepuluh baris log \"push gagal, hanya dicatat\", jadi tidak ada yang tahu kecuali yang membaca log.",
  "**2.** Layanan push menggantung dan Budi hanya membuka saldo. Kenapa permintaannya tidak dijawab?",
  "Sepuluh pembayaran serentak menahan sepuluh koneksi dengan status `idle in transaction`. Membuka saldo butuh satu koneksi bebas, bahkan untuk memeriksa sesi, dan tidak ada yang bebas. Permintaan itu tidak dijawab selama 2 detik pengamatan (`rentan.txt` bagian A).",
  "**3.** Push sudah diterima layanan push, lalu database menolak COMMIT. Hal mana yang rusak, dan kenapa ROLLBACK tidak menolong?",
  "Hal pertama: Citra diberi tahu uang yang tidak ada. ROLLBACK hanya membatalkan data di PostgreSQL. Pesan yang sudah diterima layanan push tidak ikut batal. Kejadian ini Tidak dijalankan di lab Tahap 3, tetapi database memang bisa menolak COMMIT (`transaksi.txt` bagian D).",
  "**4.** Di handler versi pertama, kenapa baris `tx.Commit()` bukan baris yang salah?",
  "COMMIT sudah tepat untuk data di PostgreSQL. Yang salah adalah apa yang sudah terkirim sebelum COMMIT sampai, dan apa yang terjadi bila pengiriman itu gagal atau lambat.",
  "Saat me-review kode AI, cek ini",
  "Tidak ada panggilan HTTP, push, atau email di dalam transaction yang memegang lock ([[t2-race-lock]]).",
  "Kegagalan pemberitahuan meninggalkan baris di database yang bisa dicari, bukan hanya baris log.",
  "Client HTTP punya batas waktu eksplisit, karena nol berarti tanpa batas ([net/http](https://pkg.go.dev/net/http#Client)).",
  "Tidak ada pemberitahuan yang dikirim sebelum COMMIT.",
  "Bacaan lanjut",
  "[Go: net/http, tipe Client](https://pkg.go.dev/net/http#Client) (Go 1.27.3)",
  "[PostgreSQL 17: pg_stat_activity](https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW)",
];
