// Penjaga halaman 3.7 (keputusan 1024 sampai 1026): angka, nama berkas rekaman dan bagiannya, nomor halaman, ID `[[...]]`,
// label sumber, klaim negatif tentang api-t3 (log akses, traceparent, metric), isi tabel empat sinyal, kartu pilah,
// diagram Rantai, dan setiap kalimat halaman harus bisa diturunkan dari rekaman lab (jejak.txt, m18.txt, adr22.txt,
// little.txt), kode lab (api-t3 dan t3-pool), naskah Tahap 3, registry cerita.json, dan baris riset R3-130 sampai R3-134.
// Kalimat yang ditulis penulis dan tidak bisa diturunkan dikunci utuh di KALIMAT_PENULIS, PILAH_TERKUNCI, dan
// RANTAI_TERKUNCI: mengubah satu kata menggagalkan tes, dan itu tanda untuk meninjau klaimnya terhadap sumber (pelajaran
// 3.1 sampai 3.4: kalimat bebas, arti istilah, dan teks simpul diagram lolos dari penjaga yang hanya memeriksa angka;
// kalimat yang terkunci utuh tetap bisa salah, jadi nilai di bawah diturunkan dari rekaman dan kode, bukan dari halaman).
// Klaim dokumentasi (OpenTelemetry, W3C, SRE book, Go, PostgreSQL, OWASP) dijaga lewat baris riset R3-130 sampai R3-134,
// yang dibuka ke sumber primer 2026-10-26.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-observability-inti.json";
import pilahMentah from "../../lama/widgets/data/t3-observability-pilah.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { HalamanIstilah } from "./istilah";

const akar = path.resolve(__dirname, "../../..");
const dibaca = new Set<string>();
const baca = (rel: string): string => {
  dibaca.add(rel);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};
const lacak = (dir: string): string[] =>
  execFileSync("git", ["ls-files", "--", dir], { cwd: akar, encoding: "utf8" }).split("\n").filter(Boolean);

const mdx = baca("situs/src/content/docs/tahap-3/observability.mdx");
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah3 = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const jejak = baca("labs/t3-pool/output/jejak.txt").split("\n");
const m18 = baca("labs/t3-pool/output/m18.txt").split("\n");
const adr22 = baca("labs/t3-pool/output/adr22.txt").split("\n");
const little = baca("labs/t3-pool/output/little.txt");
const rentan = baca("labs/api-t3/output/rentan.txt");
const jejakPy = baca("labs/t3-pool/bagian_jejak.py");
const umumPy = baca("labs/t3-pool/umum.py");
const m18Py = baca("labs/t3-pool/bagian_m18.py");
const bebanPy = baca("labs/t3-pool/beban.py");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const pushGo = baca("labs/api-t3/internal/push/push.go");
const notifGo = baca("labs/api-t3/internal/service/notif.go");
const handlerGo = baca("labs/api-t3/internal/handler/handler.go");
const diagram = DataRantai.parse(diagramMentah);
const pilah = pilahMentah as { judul: string; kelompok: string[]; item: { teks: string; jawab: number; kenapa: string }[]; penutup?: string };

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; lebur_ke?: string; adr?: number[]; lama?: boolean }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const kata = (n: number): string => ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"][n]!;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
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

// ---- nilai yang diturunkan dari rekaman -------------------------------------------------------------------------------
const J = bagian(jejak, "J");
const Jt = J.join("\n");
const detik = Number(cocok(Jt, /^\(belum ada jawaban sesudah (\d+) detik; client masih menunggu\)$/m)[1]);
const logBaru = cocok(Jt, /^baris log baru sesudah (\d+) detik: (\d+)$/m);
const logTrace = Number(cocok(Jt, /^baris log yang memuat trace-id dari app: (\d+)$/m)[1]);
const poolJ = JSON.parse(cocok(Jt, /^(\{"dipakai":\d+,"maks":\d+,"terbuka":\d+\})$/m)[1]!) as { dipakai: number; maks: number; terbuka: number };
const barisDb = J.filter((b) => /^ idle in transaction +\| Client +\| ClientRead +\| t$/.test(b));
const batasDb = Number(cocok(Jt, /now\(\) - xact_start > interval '(\d+) seconds'/)[1]);
const traceparent = cocok(Jt, /-H 'traceparent: (\S+)'/)[1]!;
const selesai200 = cocok(Jt, /^pembacaan saldo yang selesai \((\d+)\): baris log baru sejak awal: (\d+)\./m);
const mode = cocok(Jt, /^\$ \.\/api-t3 -rentan (\S+) -lab/m)[1]!;

const A18 = bagian(m18, "A");
const A18t = A18.join("\n");
const poolA = JSON.parse(cocok(A18t, /^(\{"dipakai":\d+,"maks":\d+,"terbuka":\d+\})$/m)[1]!) as { dipakai: number; maks: number; terbuka: number };
const tanpaJawaban = cocok(A18t, /^# Pembacaan sesudah pool penuh \(request 201 sampai 400\): (\d+) pembacaan: tanpa jawaban x(\d+)$/m);
const penuhAntara = cocok(A18t, /^pool 10 penuh antara detik ke-(\d+) dan ke-(\d+) sejak beban mulai/m);

const D22 = bagian(adr22, "D");
const D22t = D22.join("\n");
const pushTimeout = Number(cocok(D22t, /^\$ \.\/api-t3 -rentan push-dalam-tx -push-timeout (\d+)s -lab/m)[1]);
const barisTimeout = Number(cocok(D22t, /^server log: (\d+) baris 'push gagal, hanya dicatat: \.\.\. Client\.Timeout exceeded \.\.\.' \(satu per pembayaran\)$/m)[1]);
const bayarD = cocok(D22t, /^pembayaran request 1 sampai 200: (\d+) pembayaran: 201 x(\d+);/m);
const bebanD = cocok(D22t, /Beban dengan jadwal tetap, bukan acak: (\d+,\d+) request per detik \(Asumsi naskah bagian 3\)/)[1]!;

// ---- naskah ----------------------------------------------------------------------------------------------------------
const baris = naskah3.split("\n");
const barisM18 = baris.find((b) => b.startsWith("| M18 |"))!;
const peta = [...naskah3.matchAll(/^\| (3\.\d+) \| (\d+b?) \| ([^|]+) \| ([^|]+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \|/gm)].map((m) => ({ nomor: m[1]!, judul: m[3]!.trim(), jenis: m[4]!.trim(), lab: m[6]!.trim(), widget: m[7]!.trim() }));
const petaBaris = (nomor: string) => peta.find((x) => x.nomor === nomor)!;

// ---- kode lab --------------------------------------------------------------------------------------------------------
const goTerlacak = lacak("labs/api-t3/cmd").concat(lacak("labs/api-t3/internal")).filter((f) => f.endsWith(".go"));
const isiGo = goTerlacak.map((f) => ({ f, isi: baca(f) }));

describe("berkas yang dibaca penjaga", () => {
  test("semua berkas terlacak git (hasil build tidak ada di checkout bersih)", () => {
    const terlacak = new Set(execFileSync("git", ["ls-files", "--", ...dibaca], { cwd: akar, encoding: "utf8" }).split("\n").filter(Boolean));
    expect([...dibaca].filter((f) => !terlacak.has(f))).toEqual([]);
    expect(goTerlacak.length).toBeGreaterThan(40);
  });
});

describe("registry, meta, susunan blok, dan tautan", () => {
  test("3.7 ada, konsep, jalur inti, prasyarat M18, lab api-t3 dan t3-pool, menit sama dengan baris meta", () => {
    expect(dari("t3-observability")).toMatchObject({ ada: true, nomor: "3.7", jenis: "konsep", inti: true, prasyarat: ["t3-m18"], lab: ["api-t3", "t3-pool"], tahap: 3, peran: ["backend"] });
    expect(mdx).toContain('title: "3.7 Observability: log, metric, trace"');
    expect(dari("t3-observability").judul).toBe("Observability: log, metric, trace");
    expect(dari("t3-m18").nomor).toBe("3.6");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-m18\]\] · Jalur inti<\/p>/);
    expect(dari("t3-observability").menit).toBe(Number(m[1]) + Number(m[2]));
    const p = petaBaris("3.7");
    expect(p).toMatchObject({ judul: "Observability: log, metric, trace", jenis: "Konsep", lab: "api-t3, t3-pool", widget: "pilah" });
    expect(naskah3).toContain("| 3.7 | 4 | Observability: log, metric, trace | Konsep | ★ | api-t3, t3-pool | pilah |");
    expect(mdx.match(/^description: (.+)$/m)![1]).toBe("Saat satu pembayaran menggantung, log api-t3 tetap kosong dan hanya metric pool serta database yang menunjuk sesuatu. Tiga sinyal menjawab tiga pertanyaan yang berbeda.");
  });
  test("C2 lama dilebur ke 3.7 lewat registry dan tidak dihapus", () => {
    expect(dari("C2")).toMatchObject({ lebur_ke: "t3-observability", ada: true, lama: true });
    expect(fs.existsSync(path.join(akar, "situs/src/content/docs/c-operasional/c2-observability.mdx"))).toBe(true);
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
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].filter((x) => x !== "berikutnya").sort();
    expect(id).toEqual(["t3-dua-tempat", "t3-m18", "t3-m27", "t3-pool", "t3-tim-infra"]);
    for (const [idh, nomor, awal] of [["t3-m18", "3.6", "M18"], ["t3-pool", "3.8", "Connection pool"], ["t3-m27", "3.26", "M27"], ["t3-tim-infra", "3.27", "Tim dan infra"], ["t3-dua-tempat", "3.4", "Dua tempat"]] as const) {
      expect(dari(idh).nomor).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal)).toBe(true);
      expect(petaBaris(nomor).judul.startsWith(awal)).toBe(true);
    }
    expect(dari("t3-pool").adr).toEqual([22]);
    expect(badan).toContain("seperti di ADR 22 ([[t3-pool]])");
    expect(naskah3).toContain("| 22 | Panggilan keluar tidak di dalam transaction; timeout 3 detik di setiap client;");
    expect(naskah3).toMatch(/\| 3\.8 \| 4 \| Connection pool, Little's Law, dan timeout \+ ADR 22 \|/);
  });
});

describe("naskah: M18, pertanyaan Raka, alert dan ambang", () => {
  test("Raka mengira database lambat dan mengusulkan pool 50; observability lahir dari M18", () => {
    expect(barisM18).toContain("| Database lambat; Raka mengusulkan pool dinaikkan dari 10 ke 50 |");
    harus("Raka mengira database lambat dan mengusulkan pool 50.");
    expect(barisM18).toContain("observability: log, metric, trace");
    expect(barisM18).toContain("| Jumat 12.20, Rekeningo berhenti menjawab");
    harus("Di [[t3-m18]] seluruh layar berhenti menjawab.");
  });
  test("alert dan ambang: naskah on-call menyebut gejala dan ambang Asumsi; halaman menunjuk 3.27", () => {
    expect(naskah3).toContain("alert hanya untuk gejala yang dirasakan user: umur notifikasi uang tertua, error rate, p95, dan request yang menunggu koneksi. Ambangnya Asumsi, ditetapkan di lab `t3-outbox` dan `api-t3`.");
    harus("| Alert dan ambangnya | Ambang adalah Asumsi yang ditetapkan lab | [[t3-tim-infra]] |");
    expect(naskah3).toContain("Isi halaman 3.27 (Tim dan infra)");
    expect(naskah3).toContain("ADR 32 (merevisi ADR 23): kolom `kelas`, bayar dan transfer lebih dulu, top-up massal dan promo sesudahnya; promo paling banyak 5 per detik; alert umur tertua; staging; on-call");
    harus("| Umur pemberitahuan tertua sebagai metric | Dibutuhkan saat promo menahan notifikasi uang | [[t3-m27]] |");
  });
  test("jejak naskah ke riset: observability di M18 bersumber R3-07, R3-08, R3-14", () => {
    expect(barisM18).toContain("observability: log, metric, trace (R3-07, R3-08, R3-14)");
  });
});

describe("rekaman jejak.txt bagian J: log, metric, database, trace", () => {
  test("satu pembayaran, mode rentan push-dalam-tx, empat detik tanpa jawaban; Inti dari angka rekaman", () => {
    expect(detik).toBe(4);
    expect(mode).toBe("push-dalam-tx");
    expect(logBaru.slice(1)).toEqual([String(detik), "0"]);
    expect(logTrace).toBe(0);
    expect(selesai200.slice(1)).toEqual(["200", "0"]);
    expect(barisDb).toHaveLength(1);
    expect(batasDb).toBe(3);
    expect(poolJ).toEqual({ dipakai: 1, maks: 10, terbuka: 1 });
    expect(Jt).toContain("# Dari luar proses, petunjuk itu satu-satunya: yang lambat bukan PostgreSQL.");
    expect(Jt).toContain("# 4. Trace: Tidak dijalankan.");
    expect(Jt).toContain("# 1. Log: api-t3 tidak mencatat request, hanya kejadian server dan kesalahan internal.");
    expect(Jt).toContain("Log kosong bukan tanda request menggantung: server ini tidak punya log akses.");
  });
  test("grep traceparent di cmd dan internal tidak menemukan berkas; dibuktikan juga di kode terlacak", () => {
    expect(Jt).toContain("$ grep -rli traceparent cmd internal   # di labs/api-t3");
    expect(Jt).toContain("(tidak ada berkas): kode api-t3 tidak membaca traceparent, jadi trace-id dari app berhenti di perbatasan API");
    expect(jejakPy).toContain('harap(r.returncode, 1, "kode api-t3 menyebut traceparent")');
    expect(isiGo.filter((x) => /traceparent/i.test(x.isi)).map((x) => x.f)).toEqual([]);
    expect(traceparent).toBe(cocok(jejakPy, /TRACEPARENT = "([^"]+)"/)[1]);
  });
  test("traceparent contoh: sama dengan blok kode, empat field dengan panjang 2, 32, 16, 2; trace_id di baris log ilustrasi sama", () => {
    const f = traceparent.split("-");
    expect(f.map((x) => x.length)).toEqual([2, 32, 16, 2]);
    expect(f.every((x) => /^[0-9a-f]+$/.test(x))).toBe(true);
    expect(f[0]).toBe("00");
    expect(parseInt(f[3]!, 16) & 1).toBe(1);
    expect(badan).toContain("```text\ntraceparent: " + traceparent + "\n             versi, trace-id (" + f[1]!.length + " heksadesimal), parent-id (" + f[2]!.length + "), trace-flags (" + f[3]!.length + ")\n```");
    harus('{"level":"ERROR","msg":"push gagal","durasi_ms":' + pushTimeout * 1000 + ',"trace_id":"' + f[1]! + '"}');
    harus("Bit paling kanan trace-flags, sampled, menyala: pemanggil mungkin sudah merekam trace.");
  });
  test("Inti: kalimat dan Rantai diturunkan dari rekaman", () => {
    expect(diagram.judul).toBe(`Satu pembayaran menggantung ${detik} detik`);
    expect(diagram.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-pool, jejak.txt bagian J" });
    expect(diagram.baris.map((b) => [b.label, b.sub])).toEqual([["Menjawab", "bagian J dari jejak.txt"], ["Diam", "bagian J dari jejak.txt"]]);
    expect(diagram.baris[0]!.simpul.map((s) => s.teks)).toEqual([`metric: ${poolJ.dipakai} dari ${poolJ.maks} dipakai`, "database: menunggu client"]);
    expect(diagram.baris[0]!.simpul[0]!.sub).toBe("GET /lab/pool, satu pembayaran");
    expect(diagram.baris[0]!.simpul[1]!.sub).toBe(`idle in transaction, transaction terbuka lebih dari ${batasDb} detik; bukan query yang lambat`);
    expect(diagram.baris[1]!.simpul.map((s) => s.teks)).toEqual([`log: ${logBaru[2]} baris baru`, "trace-id: berhenti di API"]);
    expect(diagram.baris[1]!.simpul[1]!.sub).toBe("kode API tidak membaca traceparent; trace Tidak dijalankan");
    expect(diagram.baris.map((b) => b.simpul.map((s) => s.nada))).toEqual([["biasa", "biasa"], ["warn", "warn"]]);
    expect(diagramMentah).toEqual(RANTAI_TERKUNCI);
    expect(Jt).toContain(`# 3. Database: transaction itu terbuka lebih dari ${batasDb} detik dan PostgreSQL sedang menunggu client, bukan menjalankan query.`);
  });
  test("rentang Snippet diturunkan dari baris rekaman, bukan ditulis tangan", () => {
    const n = (i: number) => i + 1;
    const a1 = nomorBaris(jejak, (b) => b.startsWith("# 1. Log:"));
    const a2 = nomorBaris(jejak, (b) => b.startsWith("(tidak ada berkas): kode api-t3"), a1);
    const b1 = nomorBaris(jejak, (b) => b.startsWith("# 2. Metric:"), a2);
    const b2 = nomorBaris(jejak, (b) => b.startsWith("# Dari luar proses, petunjuk itu satu-satunya"), b1);
    harus(`<Snippet file="labs/t3-pool/output/jejak.txt" lines="${n(a1)}:${n(a2)}" title="Rekaman lab: labs/t3-pool/output/jejak.txt" />`);
    harus(`<Snippet file="labs/t3-pool/output/jejak.txt" lines="${n(b1)}:${n(b2)}" title="Rekaman lab: labs/t3-pool/output/jejak.txt" />`);
    expect(b1).toBe(a2 + 1);
    const m1 = nomorBaris(m18, (b) => b.startsWith("pool 10 penuh antara detik ke-"));
    expect(m18[m1 + 2]).toBe(JSON.stringify(poolA));
    harus(`<Snippet file="labs/t3-pool/output/m18.txt" lines="${n(m1)}:${n(m1 + 2)}" title="Rekaman lab: labs/t3-pool/output/m18.txt" />`);
    expect(m1).toBeGreaterThan(nomorBaris(m18, (b) => b.startsWith("# --- A. ")));
    expect(m1).toBeLessThan(nomorBaris(m18, (b) => b.startsWith("# --- B. ")));
  });
});

describe("rekaman m18.txt, adr22.txt, little.txt, rentan.txt", () => {
  test("m18 bagian A: pool 10 penuh antara detik ke-11 dan ke-12, dipakai 10 dari maks 10, 190 pembacaan tanpa jawaban", () => {
    expect(penuhAntara.slice(1)).toEqual(["11", "12"]);
    expect(poolA).toEqual({ dipakai: 10, maks: 10, terbuka: 10 });
    expect(tanpaJawaban.slice(1)).toEqual(["190", "190"]);
    expect(Number(tanpaJawaban[1])).toBeGreaterThan(0);
    expect(A18t).toContain("# Sisanya (16,5 per detik) adalah karyawan yang membuka saldonya (GET /akun/{id}).");
    expect(A18t).toContain("# Client pembacaan menyerah sesudah 3 detik.");
  });
  test("adr22 bagian D: timeout 3 detik, sepuluh pembayaran 201, sepuluh baris log dengan Client.Timeout exceeded, beban 17,4 (Asumsi)", () => {
    expect(pushTimeout).toBe(3);
    expect(barisTimeout).toBe(10);
    expect(bayarD.slice(1)).toEqual(["10", "10"]);
    expect(bebanD).toBe("17,4");
    expect(D22t).toContain("tiap pembayaran memakan lebih dari 2,9 detik: ya");
    const kode = baca("labs/t3-pool/bagian_adr22.py");
    expect(kode).toContain('log = [l for l in d.log_server() if "push gagal, hanya dicatat" in l]');
    expect(kode).toContain('harap(len(log), 10, "baris log push gagal")');
    expect(kode).toContain('harap(all("Client.Timeout" in l for l in log), True, "log menyebut Client.Timeout")');
  });
  test("little.txt: W adalah rata-rata dari data pembangkit beban; p95 tidak direkam di rekaman api-t3 dan t3-pool", () => {
    expect(little).toMatch(/^W dari data \(rata-rata satu pembayaran\): t ditambah kurang dari 50 ms/m);
    const berkas = lacak("labs/t3-pool/output").concat(lacak("labs/api-t3/output")).filter((f) => f.endsWith(".txt"));
    expect(berkas.length).toBeGreaterThan(12);
    expect(berkas.filter((f) => /p95/i.test(baca(f)))).toEqual([]);
  });
  test("rentan.txt B: push mati menulis sepuluh baris log 'push gagal, hanya dicatat' (dasar jawaban kartu log)", () => {
    expect(rentan).toContain("server log: 10 baris 'push gagal, hanya dicatat: ...' (satu per pembayaran)");
  });
  test("siapa yang menghitung: latency, traffic, errors dari pembangkit beban; saturation dari GET /lab/pool", () => {
    expect(bebanPy).toContain("def rekap(self, k_awal, k_akhir, jenis):");
    expect(bebanPy).toContain("def durasi(self, jenis, k_awal, k_akhir):");
    expect(m18Py).toContain("be.rekap(1, 199, \"baca\")");
    expect(umumPy).toContain('curl("GET", "/lab/pool"');
    expect(umumPy).toContain('catat(json.dumps({"dipakai": p["dipakai"], "maks": p["maks"], "terbuka": p["terbuka"]}');
    expect(m18Py).toContain("cetak_pool()");
    // Pembangkit beban adalah kelas Beban di beban.py (client), bukan kode api-t3.
    expect(bebanPy).toMatch(/^class Beban/m);
    harus("| Latency | Lama melayani request, dengan request yang berhasil dan yang gagal dipisah | Hanya rata-rata lama satu pembayaran (`little.txt`); p95 tidak direkam | Pembangkit beban lab |");
    harus("| Traffic | Banyaknya permintaan, untuk web service biasanya request per detik | Request per detik terjadwal (Asumsi) | Pembangkit beban lab |");
    harus(`| Errors | Request yang gagal secara eksplisit, implisit, atau melanggar janji waktu | ${tanpaJawaban[1]} pembacaan sesudah pool penuh tanpa jawaban (\`m18.txt\` bagian A) | Pembangkit beban lab |`);
    harus(`| Saturation | Seberapa penuh sumber daya yang paling terbatas | Dipakai ${poolA.dipakai} dari maks ${poolA.maks} (\`m18.txt\` bagian A) | api-t3, lewat \`GET /lab/pool\` |`);
  });
});

describe("kode api-t3: klaim negatif berlingkup cmd dan internal", () => {
  test("tidak ada log akses: log hanya memuat kejadian server dan kesalahan internal; paket log biasa, bukan slog", () => {
    const impor = isiGo.filter((x) => /^\s*"log"$/m.test(x.isi)).map((x) => path.basename(x.f));
    expect(impor.length).toBeGreaterThan(3);
    expect(isiGo.filter((x) => /log\/slog|slog\./.test(x.isi)).map((x) => x.f)).toEqual([]);
    expect(handlerGo).toContain('log.Printf("error internal: %v", err)');
    expect(notifGo).toContain('log.Printf("push gagal, hanya dicatat: %v", err)');
    // Tidak ada middleware yang mencatat tiap request: satu-satunya pembungkus handler (main.go) hanya memasang header
    // X-Instance, dan tidak ada panggilan ServeHTTP lain di kode non-tes.
    const pembungkus = cocok(mainGo, /h = http\.HandlerFunc\(func\(w http\.ResponseWriter, req \*http\.Request\) \{([\s\S]*?)\n\t\t\}\)/)[1]!;
    expect(pembungkus).toContain('w.Header().Set("X-Instance", nama)');
    expect(pembungkus).not.toMatch(/log\./);
    expect(isiGo.filter((x) => !x.f.endsWith("_test.go") && /\.ServeHTTP\(/.test(x.isi)).map((x) => x.f)).toEqual(["labs/api-t3/cmd/api/main.go"]);
  });
  test("tidak ada metric selain pembacaan /lab/: tanpa /metrics, prometheus, expvar, OpenTelemetry, otelhttp", () => {
    const pola = /prometheus|expvar|opentelemetry|otelhttp|"\/metrics"/i;
    expect(isiGo.filter((x) => pola.test(x.isi)).map((x) => x.f)).toEqual([]);
    for (const f of ["labs/api-t3/go.mod", "labs/api-t3/go.sum"]) expect(pola.test(baca(f)), f).toBe(false);
  });
  test("semua pembacaan angka ada di bawah /lab/ dan dipasang hanya dengan flag -lab", () => {
    const rute = isiGo.flatMap((x) => [...x.isi.matchAll(/HandleFunc\("GET (\/lab\/[a-z/]+)"/g)].map((m) => `${path.relative("labs/api-t3/cmd", x.f).startsWith("api") ? "api" : "lain"}:${m[1]}`));
    const api = rute.filter((r) => r.startsWith("api:")).map((r) => r.slice(4)).sort();
    expect(api).toEqual(["/lab/batas", "/lab/cache", "/lab/lambat", "/lab/outbox", "/lab/panik", "/lab/pool"]);
    const blok = cocok(mainGo, /if \*lab \{\n([\s\S]*?)\n\t\}/)[1]!;
    for (const f of ["pasangEndpointLab(rute, db, r)", "pasangEndpointCache(rute, kc)", "pasangEndpointLabInstance(rute, db, svc, batasIP, batasAkun)"]) expect(blok).toContain(f);
    expect(mainGo).toContain('lab := flag.Bool("lab", false, "lab saja: GET /lab/pool dan GET /lab/outbox")');
    // pool dan outbox dibaca dari database/sql DBStats dan RingkasOutbox.
    const lab = cocok(mainGo, /func pasangEndpointLab\([\s\S]*?\n\}\n/)[0];
    expect(lab).toContain("db.Stats()");
    expect(lab).toContain('"maks": st.MaxOpenConnections, "terbuka": st.OpenConnections');
    expect(lab).toContain('"dipakai": st.InUse, "menganggur": st.Idle, "menunggu": int(st.WaitCount)');
    expect(lab).toContain('"per_status": per, "tertua_detik": int(tertua)');
    harus("Semua pembacaan metric di api-t3 ada di bawah `/lab/` dan hanya hidup dengan flag `-lab`, dan tidak ada endpoint `/metrics`. Yang menjawab seberapa penuh pool di M18 adalah `GET /lab/pool`. `GET /lab/outbox` (jumlah baris per status dan umur baris tertua) tidak menjawab M18: di mode rentan push dipanggil di dalam transaction dan tidak ada baris outbox.");
    expect(notifGo).toContain("tidak ada baris outbox");
    expect(notifGo).toContain("if s.rentan == RentanPushDalamTx {\n\t\tfor _, d := range perangkat {");
  });
  test("client push hanya menulis Content-Type, jadi traceparent tidak diteruskan", () => {
    const set = [...pushGo.matchAll(/Header\.Set\("([^"]+)"/g)].map((m) => m[1]);
    expect(set).toEqual(["Content-Type"]);
    expect(pushGo).not.toMatch(/Header\.Add\(|\.Header = |Header\.Clone/);
    harus("client push-nya hanya menulis header `Content-Type`");
  });
});

describe("kartu pilah: skema, jawaban, asal tiap klaim, dan distribusi posisi", () => {
  test("tujuh item, tiga kelompok sama dengan urutan judul halaman, tanpa penutup supaya status satu kalimat", () => {
    expect(pilah.kelompok).toEqual(["Log", "Metric", "Trace"]);
    expect(pilah.item).toHaveLength(7);
    expect(pilah.penutup).toBeUndefined();
    expect(cap(kata(pilah.item.length))).toBe("Tujuh");
    expect(mdx).toContain('<WidgetLama nama="pilah" src="data/t3-observability-pilah.json" />');
    expect(mdx).toContain('<SkripLama daftar={["pilah"]} />');
    expect(mdx).toContain('import WidgetLama from "../../../components/WidgetLama.astro";');
    expect(mdx).toContain('import SkripLama from "../../../components/SkripLama.astro";');
    expect(pilah.item.every((i) => i.jawab >= 0 && i.jawab < 3)).toBe(true);
  });
  test("posisi jawaban benar bervariasi: tiap kelompok benar paling sedikit sekali, dan tidak ada tiga berturut-turut sama", () => {
    const j = pilah.item.map((i) => i.jawab);
    expect(new Set(j)).toEqual(new Set([0, 1, 2]));
    for (let i = 2; i < j.length; i++) expect(!(j[i] === j[i - 1] && j[i] === j[i - 2])).toBe(true);
    expect(j).toEqual([1, 0, 2, 1, 0, 1, 2]);
  });
  test("setiap kenapa menyebut bagian rekaman yang ada: file, huruf bagian, dan lab", () => {
    const ref = [...JSON.stringify(pilah).matchAll(/\((\w+)\.txt bagian ([A-Z])\)/g)].map((m) => [m[1]!, m[2]!]);
    expect(ref.length).toBeGreaterThanOrEqual(5);
    const lokasi: Record<string, string> = { jejak: "labs/t3-pool/output/jejak.txt", m18: "labs/t3-pool/output/m18.txt", adr22: "labs/t3-pool/output/adr22.txt" };
    for (const [f, huruf] of ref) {
      expect(lokasi[f!], `file ${f}`).toBeDefined();
      expect(baca(lokasi[f!]!).split("\n").some((b) => b.startsWith(`# --- ${huruf}. `)), `${f} bagian ${huruf}`).toBe(true);
    }
  });
  test("kenapa tiap item: angka dan nama dari rekaman", () => {
    const k = pilah.item.map((i) => i.kenapa);
    expect(k[0]).toContain(`GET /lab/pool menjawab dipakai ${poolA.dipakai} dari maks ${poolA.maks} saat pool penuh (m18.txt bagian A)`);
    expect(k[1]).toContain(`${kata(barisTimeout)} baris "push gagal, hanya dicatat" yang memuat Client.Timeout exceeded (adr22.txt bagian D)`);
    expect(pilah.item[1]!.teks).toContain(`sesudah ${pushTimeout} detik`);
    expect(k[2]).toContain("api-t3 tidak punya trace, dan kodenya tidak membaca traceparent (jejak.txt bagian J)");
    expect(pilah.item[3]!.teks).toContain(`dalam ${A18t.match(/Client pembacaan menyerah sesudah (\d+) detik/)![1]} detik`);
    expect(k[3]).toContain(`${tanpaJawaban[1]} pembacaan sesudah pool penuh tanpa jawaban (m18.txt bagian A)`);
    expect(riset).toMatch(/\| R3-133 \|[^\n]*menurut kebijakan/);
    expect(k[4]).toContain(`pembacaan saldo yang selesai pun meninggalkan ${logBaru[2]} baris (jejak.txt bagian J)`);
    expect(k[5]).toContain("GET /lab/pool hanya memberi keadaan pada satu saat");
    expect(k[6]).toContain("header contoh dari spesifikasi W3C dikirim ke api-t3, kodenya tidak membacanya, dan trace-id berhenti di API (jejak.txt bagian J)");
    expect(pilah.item[0]!.teks).toContain(`batas ${poolA.maks}`);
    expect(pilah.item[4]!.teks).toContain(`dijawab ${selesai200[1]}`);
  });
  test("teks kartu dikunci utuh", () => {
    expect(pilah).toEqual(PILAH_TERKUNCI);
  });
  test("noscript: jawaban tiap pertanyaan diturunkan dari data pilah, di antara widget dan blok Paham", () => {
    expect(badan).toContain("<noscript>\n<p>Tanpa JavaScript, kartu di atas tidak bisa dipilah. Berikut jawaban tiap pertanyaan.</p>\n<ol>\n{pilah.item.map((it) => (\n<li><strong>{pilah.kelompok[it.jawab]}.</strong> {it.teks} {it.kenapa}</li>\n))}\n</ol>\n</noscript>");
    expect(badan.indexOf("<noscript>")).toBeGreaterThan(badan.indexOf("<WidgetLama"));
    expect(badan.indexOf("<noscript>")).toBeLessThan(badan.indexOf('<Blok nama="Paham">'));
    expect(mdx).toContain('import pilah from "../../../../lama/widgets/data/t3-observability-pilah.json";');
  });
});

describe("label, versi, tanggal akses, dan baris riset", () => {
  test("pemakaian pertama Rekaman lab ditautkan ke /cara-pakai/#label-sumber, anchor ada, dan Tidak dijalankan dijelaskan sebelum dipakai", () => {
    harus("Rekaman lab adalah keluaran program yang dijalankan di `labs/` ([Label sumber](/cara-pakai/#label-sumber))");
    expect(baca("situs/src/content/docs/cara-pakai.mdx")).toMatch(/^#{2,3} Label sumber/m);
    expect(baca("situs/src/content/docs/cara-pakai.mdx")).toContain("- **Tidak dijalankan**: kode hanya dicek ke dokumentasi resmi, tidak dijalankan di lab.");
    harus("trace Tidak dijalankan, yaitu hanya dicek ke dokumentasi dan kode, tidak dijalankan di lab");
    expect(badan.indexOf("Rekaman lab adalah")).toBeLessThan(badan.indexOf("Tidak dijalankan"));
    harus("Baris di bawah adalah Ilustrasi, bukan keluaran api-t3");
    harus("Asumsi, yaitu angka beban dari cerita");
    expect(badan.indexOf("Asumsi, yaitu")).toBeLessThan(badan.indexOf("(Asumsi)"));
  });
  test("tanggal akses sumber: semua sama, tidak sebelum riset Tahap 3 dan tidak di masa depan", () => {
    const tgl = [...new Set([...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]!))];
    expect(tgl).toEqual(["2026-10-26"]);
    const mulai = cocok(riset, /Semua tautan dibuka (\d{4}-\d{2}-\d{2})/)[1]!;
    expect(tgl[0]! >= mulai).toBe(true);
    expect(tgl[0]! <= new Date().toISOString().slice(0, 10)).toBe(true);
    for (const id of ["R3-130", "R3-131", "R3-132", "R3-133", "R3-134"]) expect(riset, id).toMatch(new RegExp(`\\| ${id} \\|[^\\n]*dibuka 2026-10-26`));
  });
  test("versi: Go 1.27.3 dan PostgreSQL 17 sama dengan rekaman; tautan dokumentasi sama dengan baris riset", () => {
    const pg = cocok(jejak.join("\n"), /PostgreSQL (\d+)\.(\d+)/);
    expect(pg[1]).toBe("17");
    expect(badan.match(/postgresql\.org\/docs\/(\d+)\//g)!.every((x) => x.includes(`/${pg[1]}/`))).toBe(true);
    expect(baca("labs/api-t3/go.mod")).toMatch(/^go 1\.\d+/m);
    const goDoc = cocok(riset, /\| R3-132 \|[^\n]*pkg\.go\.dev\/database\/sql#DBStats \(Go (\d+\.\d+\.\d+)/)[1]!;
    expect(goDoc).toBe("1.27.3");
    expect(badan.match(/Go (\d+\.\d+\.\d+)/g)!.every((x) => x === `Go ${goDoc}`)).toBe(true);
    expect(riset).toMatch(/\| R3-134 \|[^\n]*pkg\.go\.dev\/log\/slog \(Go 1\.27\.3/);
    for (const x of ["Go 1.27.3: log/slog", "Go 1.27.3: DBStats"]) harus(x);
    // Setiap tautan eksternal di halaman punya jejak di baris riset (kata kunci dari path-nya).
    const kunci: Record<string, string> = {
      "opentelemetry.io/docs/concepts/observability-primer": "R3-130", "opentelemetry.io/docs/concepts/signals/traces": "R3-130",
      "opentelemetry.io/docs/languages/go": "R3-131", "pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp": "R3-131",
      "pkg.go.dev/database/sql#DBStats": "R3-132", "www.postgresql.org/docs/17/monitoring-stats.html": "R3-132",
      "sre.google/sre-book/monitoring-distributed-systems": "R3-133", "www.w3.org/TR/trace-context": "R3-133",
      "pkg.go.dev/log/slog": "R3-134", "cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html": "R3-134",
    };
    const tautan = [...new Set([...badan.matchAll(/\]\(https:\/\/([^)\s]+?)\)/g)].map((m) => m[1]!.replace(/#MONITORING.*/, "").replace(/\/$/, "")))];
    for (const t of tautan) {
      const id = kunci[t];
      expect(id, `tautan ${t} belum punya baris riset`).toBeDefined();
      const sumber = t.replace(/^www\./, "").replace(/\/$/, "").replace(/#.*/, "");
      expect(riset, `${id} tidak memuat ${sumber}`).toMatch(new RegExp(`\\| ${id} \\|[^\\n]*${sumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(tautan.length).toBe(Object.keys(kunci).length);
  });
  test("klaim dokumentasi bersandar pada isi baris riset: status OpenTelemetry Go, edisi W3C dan SRE, definisi, arti wait event", () => {
    expect(riset).toMatch(/\| R3-131 \|[^\n]*Traces Stable, Metrics Stable, Logs Release candidate/);
    harus("Traces dan Metrics berstatus Stable, sedangkan Logs masih Release Candidate");
    expect(riset).toMatch(/\| R3-133 \|[^\n]*W3C Trace Context Level 1, Recommendation 2021-11-23/);
    harus("edisi Recommendation 23 November 2021");
    harus("[W3C: Trace Context](https://www.w3.org/TR/trace-context/)");
    expect(riset).toMatch(/\| R3-133 \|[^\n]*bagian 2\.3: alat tracing minimal MUST meneruskan traceparent dan tracestate supaya trace tidak putus/);
    harus("Alat tracing yang sesuai spesifikasi minimal meneruskan header itu supaya trace tidak putus (bagian 2.3).");
    expect(riset).toMatch(/\| R3-133 \|[^\n]*edisi 2017[^\n]*if you can only measure four metrics of your user-facing system, focus on these four/);
    harus("[SRE book, bab 6, edisi 2017]");
    expect(riset).toMatch(/\| R3-133 \|[^\n]*parent-id \(16, id request ini menurut pemanggil\)/);
    expect(riset).toMatch(/\| R3-133 \|[^\n]*bit paling kanan sampled/);
    expect(riset).toMatch(/\| R3-130 \|[^\n]*log = pesan bertanda waktu[^\n]*metric = agregasi data numerik[^\n]*span = satu unit kerja[^\n]*trace/);
    expect(riset).toMatch(/\| R3-130 \|[^\n]*Start and End Timestamps/);
    expect(riset).toMatch(/\| R3-131 \|[^\n]*v0\.72\.0[^\n]*bukan versi terbaru/);
    expect(badan).not.toMatch(/v0\.72|otelhttp@/);
    expect(riset).toMatch(/\| R3-132 \|[^\n]*WaitCount \(\\?"total number of connections waited for\\?", kumulatif\)/);
    expect(riset).toMatch(/\| R3-132 \|[^\n]*ClientRead = \\?"Waiting to read data from the client\\?"/);
    expect(riset).toMatch(/\| R3-134 \|[^\n]*`JSONHandler` menulis JSON per baris/);
    expect(riset).toMatch(/\| R3-134 \|[^\n]*access token, authentication password, dan session identification values/);
    harus("Panduan OWASP menyebut access token, password, dan session identification values sebagai data yang biasanya dikecualikan dari log");
    expect(riset).toMatch(/\| R3-115 \|[^\n]*"The backend is in a transaction, but is not currently executing a query\."/);
  });
  test("ID riset tidak tampil ke pembaca (halaman, kartu, diagram)", () => {
    expect(mdx).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(JSON.stringify(pilahMentah) + JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b/);
  });
  test("halaman tidak membuka isi 3.8 sampai 3.13: tanpa Little's Law, klaim per baris, dead-letter, SKIP LOCKED", () => {
    expect(badan.replace("Little's Law", "")).not.toMatch(/SKIP LOCKED|klaim_sampai|dead-letter|backoff|FOR UPDATE/);
    expect(JSON.stringify(pilahMentah)).not.toMatch(/SKIP LOCKED|klaim_sampai|dead-letter|backoff|Little/);
  });
});

describe("istilah baru, glosarium, dan peleburan C2", () => {
  const slugs = ["golden-signals", "idle-in-transaction", "traceparent"];
  test("tiga halaman istilah valid dan rujukannya ke halaman 3.7", () => {
    for (const s of slugs) {
      const d = HalamanIstilah.parse(JSON.parse(baca(`situs/data/halaman-istilah/${s}.json`)));
      expect(d.cerita!.some((c) => c.rujukan === "t3-observability"), s).toBe(true);
      expect(d.stack).toBeNull();
    }
  });
  test("isi tiga halaman istilah (arti, cerita, mekanisme, jebakan, terkait) dikunci utuh", () => {
    const isi = Object.fromEntries(slugs.map((s) => {
      const d = JSON.parse(baca(`situs/data/halaman-istilah/${s}.json`));
      return [s, { sehari_hari: d.sehari_hari, cerita: d.cerita, mekanisme: d.mekanisme, jebakan: d.jebakan, terkait: d.terkait }];
    }));
    expect(isi).toEqual(ISTILAH_TERKUNCI);
  });
  test("glosarium: tiga baris baru dan enam baris lama dialihkan dari C2 ke 3.7", () => {
    const g = baca("situs/src/content/docs/alat/glosarium.mdx");
    const baris = (nama: string) => g.split("\n").find((b) => b.startsWith(`| **${nama}** |`))!;
    for (const nama of ["Golden signals", "Idle in transaction", "traceparent", "Latency", "Log", "Metric", "p95 / p50", "Throughput", "Trace"]) {
      expect(baris(nama), nama).toBeDefined();
      expect(baris(nama), nama).toMatch(/\| \[\[t3-observability\]\] \|$/);
    }
    expect(baris("Golden signals")).toContain("latency, traffic, errors, dan saturation");
    expect(baris("Idle in transaction")).toContain("sesi database yang sudah membuka transaction tetapi sedang tidak menjalankan query");
    expect(baris("traceparent")).toContain("Header HTTP standar W3C");
    const glos = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; h: string | null }[];
    for (const [t, slug] of [["Golden signals", "golden-signals"], ["Idle in transaction", "idle-in-transaction"], ["traceparent", "traceparent"]] as const) {
      expect(glos.find((x) => x.t === t)?.h).toBe(`/istilah/${slug}/`);
    }
  });
});

// Baris halaman yang bukan hasil turunan: paragraf, item daftar, sel tabel, judul, dan atribut `aman`. Setiap baris
// harus ada di turunan atau di KALIMAT_PENULIS; setiap entri di KALIMAT_PENULIS harus ada di halaman.
function satuan(b: string): string[] {
  const hasil: string[] = [];
  for (const mentah of b.split("\n")) {
    const l = mentah.trim();
    if (!l || l.startsWith("import ") || l.startsWith("<Snippet") || l.startsWith("<Rantai") || l.startsWith("<WidgetLama") || l.startsWith("<SkripLama") || l.startsWith('<p class="meta"')) continue;
    if (l.startsWith("</") || l.startsWith("<details") || l.startsWith("<summary>") || /^\|[-| ]+\|$/.test(l)) continue;
    if (["<noscript>", "<ol>", "```json", "```text", "```"].includes(l)) continue;
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
  const tgl = "2026-10-26";
  const batasKe = pilah.item[0]!.teks.match(/batas (\d+)/)![1];
  const turunan = [
    `Rekaman lab adalah keluaran program yang dijalankan di \`labs/\` ([Label sumber](/cara-pakai/#label-sumber)). Di rekaman ini api-t3 berjalan dalam mode rentan \`${mode}\`, dan layanan push tiruan menerima permintaan tanpa menjawab, seperti di [[t3-m18]]. Satu pembayaran dikirim dengan header \`traceparent\`, lalu server diamati dari luar selama ${detik} detik (\`jejak.txt\` bagian J).`,
    `Dua pembacaan menjawab: metric pool, dan database yang melaporkan ${kata(barisDb.length)} sesi \`idle in transaction\` tanpa query yang berjalan. Dua yang lain diam. Log tidak bertambah ${kata(1)} baris pun, dan trace Tidak dijalankan, yaitu hanya dicek ke dokumentasi dan kode, tidak dijalankan di lab. Kode api-t3 tidak membaca \`traceparent\`, jadi trace-id dari app berhenti di API.`,
    `Log api-t3 tidak bertambah selama ${detik} detik. Apakah itu berarti pembayarannya berjalan normal?`,
    `${cap(kata(pilah.item.length))} pertanyaan muncul di sekitar pembayaran yang menggantung. Pilah tiap pertanyaan ke sinyal yang paling cepat menjawabnya, lalu periksa jawabanmu. Angka dan nama berasal dari Rekaman lab api-t3 dan t3-pool. Untuk trace, rekamannya hanya menunjukkan bahwa api-t3 tidak punya.`,
    `**Ubah satu hal:** pasang timeout ${pushTimeout} detik di client push, seperti di ADR 22 ([[t3-pool]]). Di \`adr22.txt\` bagian D, ${kata(barisTimeout)} pembayaran pertama menunggu push sampai batas itu, dan masing-masing menulis ${kata(1)} baris log \`push gagal, hanya dicatat\` yang memuat \`Client.Timeout exceeded\`. Tanpa timeout, \`jejak.txt\` bagian J mencatat ${kata(Number(logBaru[2]))} baris. Baris itu ada karena panggilan push berakhir; selama ia menggantung, tidak ada baris.`,
    `Bebannya berbeda: bagian D memakai beban terjadwal ${bebanD} request per detik (Asumsi, yaitu angka beban dari cerita), bagian J ${kata(1)} pembayaran. Perbandingan ini menunjukkan arah, bukan satu percobaan yang diulang.`,
    `Rekaman lab: ${kata(Number(logBaru[2]))} baris untuk request yang menggantung`,
    `{"level":"ERROR","msg":"push gagal","durasi_ms":${pushTimeout * 1000},"trace_id":"${traceparent.split("-")[1]}"}`,
    `**Metric.** \`GET /lab/pool\` membaca \`DBStats\` dari \`database/sql\`: koneksi yang terbuka, yang dipakai, dan batas pool ([Go 1.27.3: DBStats](https://pkg.go.dev/database/sql#DBStats), dibuka ${tgl}). Saat pool penuh di M18, pembacaan yang sama menjawab dipakai ${poolA.dipakai} dari maks ${poolA.maks}:`,
    `traceparent: ${traceparent}`,
    "Hanya rata-rata lama satu pembayaran (`little.txt`); p95 tidak direkam",
    `${tanpaJawaban[1]} pembacaan sesudah pool penuh tanpa jawaban (\`m18.txt\` bagian A)`,
    `Dipakai ${poolA.dipakai} dari maks ${poolA.maks} (\`m18.txt\` bagian A)`,
    `Rekaman lab: keadaan api-t3, ${kata(Number(logBaru[2]))} baris selama ${detik} detik`,
    `Ini pertimbangan penulis, bukan hasil ukur. Trace layak dibayar saat satu request melewati lebih dari satu komponen dan log serta metric sudah menunjuk komponennya, tetapi belum langkahnya. Di M18, metric pool menunjukkan ${poolA.dipakai} dari ${poolA.maks} dipakai dan database menunjuk client yang menunggu. Langkah yang menunggu di dalam API tetap tidak terlihat sampai ada span atau field durasi.`,
    `**1.** Log api-t3 tidak bertambah selama ${detik} detik, padahal satu pembayaran belum dijawab. Apakah itu berarti tidak ada yang salah?`,
    `Tidak. api-t3 tidak punya log akses: pembacaan saldo yang selesai dengan ${selesai200[1]} pun meninggalkan ${kata(Number(selesai200[2]))} baris (\`jejak.txt\` bagian J). Di api-t3, log ditulis saat sebuah kejadian terjadi, selesai, atau gagal, jadi request yang menggantung belum menulis apa pun. Log kosong tidak membedakan keadaan sehat dari keadaan menggantung.`,
    `Saturation, lewat \`GET /lab/pool\`: dipakai ${poolA.dipakai} dari maks ${poolA.maks} (\`m18.txt\` bagian A). Endpoint itu hanya ada dengan flag \`-lab\`. Latency, traffic, dan errors di rekaman dihitung pembangkit beban di luar server.`,
    `**4.** \`pg_stat_activity\` menunjukkan ${kata(barisDb.length)} sesi \`idle in transaction\` dengan wait event \`ClientRead\`, pada transaction yang sudah terbuka lebih dari ${batasDb} detik. Apa yang ditunjukkan, dan apa yang belum?`,
  ];
  test("batas pool di kartu pertama sama dengan maks di rekaman", () => expect(Number(batasKe)).toBe(poolA.maks));
  test("tidak ada kalimat yang bukan turunan dan tidak dikunci", () => {
    const sah = new Set([...turunan, ...KALIMAT_PENULIS]);
    expect(satuan(badan).filter((s) => !sah.has(s))).toEqual([]);
  });
  test("tidak ada entri terkunci atau turunan yang sudah hilang dari halaman", () => {
    const ada = new Set(satuan(badan));
    expect([...turunan, ...KALIMAT_PENULIS].filter((s) => !ada.has(s))).toEqual([]);
  });
});


// ---- penjaga tambahan peninjau (keputusan 1027) ------------------------------------------------------------------------
// Pemeriksaan per kalimat memakai himpunan: sel tabel, jawaban Cek diri, dan sumber istilah yang tertukar tempat tetap
// "dikenal". Di sini tabel dikunci per baris dan urutan, baris details/summary dan Rantai dikunci, sumber tiga halaman
// istilah dikunci dan diturunkan dari rekaman, baris riset R3-130 sampai R3-134 dikunci dengan sidik jari, dan klaim "tidak
// punya log akses" dijaga dengan daftar semua titik log di lapisan handler (bukan hanya pembungkus main.go).
const TABEL_TERKUNCI = (): string[][] => [
  [
    "| Sinyal | Isinya | Pertanyaan yang dijawab | Di api-t3 saat M18 |",
    "|---|---|---|---|",
    `| Log | Pesan bertanda waktu yang ditulis service atau komponen lain | Apa yang terjadi pada satu kejadian, dan galat apa? | Rekaman lab: ${kata(Number(logBaru[2]))} baris untuk request yang menggantung |`,
    "| Metric | Angka agregat dalam rentang waktu, mis. error rate atau pemakaian sumber daya | Seberapa sering atau seberapa penuh? | Rekaman lab: pembacaan pool, hanya dengan flag `-lab` |",
    "| Trace | Perjalanan satu request, terdiri dari span: satu unit kerja dengan durasinya | Di bagian mana waktu satu request habis? | Tidak dijalankan |",
  ],
  [
    "| Sinyal | Arti menurut buku SRE | Di rekaman M18 | Siapa yang menghitung |",
    "|---|---|---|---|",
    "| Latency | Lama melayani request, dengan request yang berhasil dan yang gagal dipisah | Hanya rata-rata lama satu pembayaran (`little.txt`); p95 tidak direkam | Pembangkit beban lab |",
    "| Traffic | Banyaknya permintaan, untuk web service biasanya request per detik | Request per detik terjadwal (Asumsi) | Pembangkit beban lab |",
    `| Errors | Request yang gagal secara eksplisit, implisit, atau melanggar janji waktu | ${tanpaJawaban[1]} pembacaan sesudah pool penuh tanpa jawaban (\`m18.txt\` bagian A) | Pembangkit beban lab |`,
    `| Saturation | Seberapa penuh sumber daya yang paling terbatas | Dipakai ${poolA.dipakai} dari maks ${poolA.maks} (\`m18.txt\` bagian A) | api-t3, lewat \`GET /lab/pool\` |`,
  ],
  [
    "| Pilihan | Yang bisa dijawab | Ongkosnya | Keadaan di lab |",
    "|---|---|---|---|",
    `| Log teks bebas saja | Kejadian yang sudah selesai dan dicatat | Tanpa usaha tambahan, tetapi tiap pesan berbentuk bebas sehingga sulit disaring atau dihitung mesin, dan request yang menggantung tidak muncul | Rekaman lab: keadaan api-t3, ${kata(Number(logBaru[2]))} baris selama ${detik} detik |`,
    "| Log terstruktur dan metric empat sinyal | Apa yang terjadi per kejadian, dan seberapa penuh sumber daya | Kode log dan endpoint metric di server, ruang simpan, dan ambang untuk alert | Rekaman lab: metric saturation ada; log terstruktur hanya Ilustrasi |",
    "| Ditambah trace | Di bagian mana waktu satu request habis, lintas komponen | Dependency baru dengan ADR sendiri, instrumentasi, dan penyimpanan trace; Logs Go masih Release Candidate | Tidak dijalankan |",
  ],
  [
    "| Yang ditunda | Kenapa ditunda | Muncul lagi di atau pemicunya |",
    "|---|---|---|",
    "| Trace OpenTelemetry di api-t3 | Dependency baru butuh ADR, dan tidak ada rekaman yang menjalankannya | Satu request melewati lebih dari satu komponen yang belum bisa ditunjuk |",
    "| Batas waktu client dan ukuran pool | Jawabannya butuh beban terjadwal dan Little's Law | [[t3-pool]] |",
    "| Alert dan ambangnya | Ambang adalah Asumsi yang ditetapkan lab | [[t3-tim-infra]] |",
    "| Umur pemberitahuan tertua sebagai metric | Dibutuhkan saat promo menahan notifikasi uang | [[t3-m27]] |",
  ],
];
const SUMBER_TERKUNCI: Record<string, unknown> = {
  "golden-signals": [
    {
      "riset": "R3-133",
      "judul": "Google SRE book, bab 6: Monitoring Distributed Systems",
      "url": "https://sre.google/sre-book/monitoring-distributed-systems/",
      "catatan": "Edisi 2017. Empat sinyal latency, traffic, errors, dan saturation. Errors mencakup kegagalan eksplisit, implisit, dan menurut kebijakan. Bagian \"Worrying About Your Tail\" memberi contoh rata-rata yang menyembunyikan request lambat."
    },
    {
      "judul": "Rekaman lab t3-pool: M18 dengan beban terjadwal",
      "rekaman": "labs/t3-pool/output/m18.txt",
      "catatan": "Pool 10 penuh antara detik ke-11 dan ke-12 (dipakai 10 dari maks 10), dan 190 pembacaan sesudahnya tanpa jawaban."
    }
  ],
  "idle-in-transaction": [
    {
      "riset": "R3-115",
      "judul": "PostgreSQL 17: pg_stat_activity",
      "url": "https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW",
      "catatan": "State idle in transaction: the backend is in a transaction, but is not currently executing a query."
    },
    {
      "riset": "R3-62",
      "judul": "PostgreSQL 17: client connection defaults",
      "url": "https://www.postgresql.org/docs/17/runtime-config-client.html",
      "catatan": "idle_in_transaction_session_timeout memutus sesi yang diam di dalam transaction lebih lama dari batasnya, dan bawaannya 0 (mati)."
    },
    {
      "judul": "Rekaman lab t3-pool: satu pembayaran selama M18",
      "rekaman": "labs/t3-pool/output/jejak.txt",
      "catatan": "Satu sesi idle in transaction dengan wait event ClientRead pada transaction yang terbuka lebih dari 3 detik."
    },
    {
      "judul": "Rekaman lab t3-pool: idle_in_transaction_session_timeout saja",
      "rekaman": "labs/t3-pool/output/adr22.txt",
      "catatan": "Bagian E: PostgreSQL memutus sesi yang diam lebih dari 5 detik, tetapi pool Go tetap penuh."
    }
  ],
  "traceparent": [
    {
      "riset": "R3-133",
      "judul": "W3C: Trace Context Level 1",
      "url": "https://www.w3.org/TR/trace-context/",
      "catatan": "Recommendation 23 November 2021. Format traceparent, arti parent-id, flag sampled, dan kewajiban alat tracing meneruskan header (bagian 2.3)."
    },
    {
      "judul": "Rekaman lab t3-pool: satu pembayaran selama M18",
      "rekaman": "labs/t3-pool/output/jejak.txt",
      "catatan": "Header contoh dari spesifikasi dikirim ke api-t3, dan pencarian traceparent di kode API tidak menemukan file."
    }
  ]
};
const HASH_RISET: Record<string, string> = {
  "R3-130": "b3dc2f6385c031a9",
  "R3-131": "8819eb1b1fe59e17",
  "R3-132": "46ec0787c374bbd3",
  "R3-133": "479f9569b5e3cf5c",
  "R3-134": "67025576bd8852f2"
};

describe("penjaga tambahan peninjau: tabel, details, Rantai, sumber istilah, baris riset, titik log", () => {
  const tabelHalaman = (): string[][] => {
    const hasil: string[][] = [];
    let cur: string[] = [];
    for (const l of badan.split("\n")) {
      if (l.startsWith("|")) cur.push(l.trim());
      else if (cur.length) { hasil.push(cur); cur = []; }
    }
    if (cur.length) hasil.push(cur);
    return hasil;
  };
  test("tabel dikunci per baris, urutan sel, dan pemisah: sel yang tertukar antar baris atau kolom yang hilang menggagalkan tes", () => {
    expect(tabelHalaman()).toEqual(TABEL_TERKUNCI());
  });
  test("details dan summary dikunci; jumlah pertanyaan di summary sama dengan butir bernomor; Rantai memakai ringkas", () => {
    const baris = badan.split("\n").map((l) => l.trim()).filter((l) => /^<(details|summary)/.test(l));
    const dalam = badan.split('<details class="question">')[1]!.split("</details>")[0]!;
    const butir = (dalam.match(/^\d+\. /gm) ?? []).length;
    expect(butir).toBe(3);
    expect(baris).toEqual([
      '<details class="question">', `<summary>Sudah tahu? Cek ${butir} pertanyaan</summary>`,
      ...[1, 2, 3, 4].flatMap(() => ['<details class="success">', "<summary>Jawaban</summary>"]),
    ]);
    expect((badan.match(/^\*\*\d\.\*\* /gm) ?? []).length).toBe(4);
    harus("<Rantai data={intiDiagram} ringkas />");
  });
  test("sumber tiga halaman istilah: dikunci utuh, rekaman ada dan terlacak, ID riset ada, angka diturunkan dari rekaman", () => {
    const sumber = Object.fromEntries(["golden-signals", "idle-in-transaction", "traceparent"].map((s) => [s, JSON.parse(baca(`situs/data/halaman-istilah/${s}.json`)).sumber]));
    expect(sumber).toEqual(SUMBER_TERKUNCI);
    const terlacak = new Set(lacak("labs/t3-pool/output"));
    for (const daftar of Object.values(sumber) as { riset?: string; rekaman?: string }[][])
      for (const x of daftar) {
        if (x.rekaman) expect(terlacak.has(x.rekaman), x.rekaman).toBe(true);
        if (x.riset) expect(riset, x.riset).toMatch(new RegExp(`\\| ${x.riset} \\|`));
      }
    const gold = JSON.stringify(sumber["golden-signals"]);
    expect(gold).toContain(`Pool ${poolA.maks} penuh antara detik ke-${penuhAntara[1]} dan ke-${penuhAntara[2]}`);
    expect(gold).toContain(`${tanpaJawaban[1]} pembacaan sesudahnya tanpa jawaban`);
    expect(gold).toContain(`dipakai ${poolA.dipakai} dari maks ${poolA.maks}`);
    const idleTx = Number(cocok(adr22.join("\n"), /^\$ \.\/api-t3 -rentan push-dalam-tx -idle-tx (\d+)s -lab/m)[1]);
    const idle = JSON.stringify(sumber["idle-in-transaction"]);
    expect(idle).toContain(`diam lebih dari ${idleTx} detik`);
    expect(idle).toContain(`transaction yang terbuka lebih dari ${batasDb} detik`);
    const bagian23 = cocok(riset, /\| R3-133 \|[^\n]*bagian (\d\.\d): alat tracing minimal MUST/)[1]!;
    expect(JSON.stringify(sumber["traceparent"])).toContain(`(bagian ${bagian23})`);
  });
  test("baris riset R3-130 sampai R3-134 dikunci dengan sidik jari: ubah satu karakter, buka lagi sumbernya, lalu perbarui sidik jarinya", async () => {
    const { createHash } = await import("node:crypto");
    for (const [id, h] of Object.entries(HASH_RISET)) {
      const b = riset.split("\n").filter((l) => l.startsWith(`| ${id} |`));
      expect(b, id).toHaveLength(1);
      expect(createHash("sha256").update(b[0]!.trim()).digest("hex").slice(0, 16), `${id} berubah: periksa ulang ke sumber primer`).toBe(h);
    }
  });
  test("klaim 'tidak punya log akses': titik log di lapisan handler hanya kesalahan internal dan simpan respons; ekspor dan push gagal ada di service", () => {
    const titik = (isi: string) => [...isi.matchAll(/\blog\.(?:Printf|Print|Println|Fatalf|Fatal)\(\s*(?:"((?:[^"\\]|\\.)*)")?/g)].map((m) => m[1] ?? "(tanpa literal)");
    const handler = isiGo
      .filter((x) => x.f.startsWith("labs/api-t3/internal/handler/") && !x.f.endsWith("_test.go"))
      .flatMap((x) => titik(x.isi).map((t) => `${path.basename(x.f)}: ${t}`))
      .sort();
    expect(handler).toEqual(["handler.go: error internal: %v", "handler_idempoten.go: simpan respons key %s gagal: %v"]);
    const latar = baca("labs/api-t3/internal/service/latar.go");
    expect(latar).toContain("log.Print(ringkas(warung, salinan))");
    expect(latar).toContain('return fmt.Sprintf("ekspor warung %d: laporan kosong", warung)');
    expect(mainGo).toContain('log.Printf("api-t3 mendengar di %s", *alamat)');
    expect(mainGo).toContain('log.Print("api-t3 berhenti")');
    harus("Di api-t3, baris log ditulis untuk kejadian tertentu. Contohnya server mulai atau berhenti, kesalahan internal, push yang gagal di mode rentan M18, dan satu ringkasan tiap ekspor laporan. Server ini tidak punya log akses: tidak ada baris untuk tiap request.");
  });
});

const KALIMAT_PENULIS: string[] = [
  "Inti",
  "Log mencatat kejadian, metric mengukur seberapa sering dan seberapa penuh, dan trace menunjukkan di mana waktu habis.",
  "Metric apa yang bisa dibaca dari api-t3, dan kapan metric itu hidup?",
  "App mengirim `traceparent`. Kenapa trace-id itu tidak muncul di mana pun di API?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "Kalau berhenti di sini, kamu sudah tahu: log menjawab apa yang terjadi, metric menjawab seberapa sering dan seberapa penuh, dan trace menjawab di bagian mana waktu habis.",
  "<p>Tanpa JavaScript, kartu di atas tidak bisa dipilah. Berikut jawaban tiap pertanyaan.</p>",
  "{pilah.item.map((it) => (",
  "<li><strong>{pilah.kelompok[it.jawab]}.</strong> {it.teks} {it.kenapa}</li>",
  "))}",
  "Kenapa ini ada",
  "Di [[t3-m18]] seluruh layar berhenti menjawab. Raka mengira database lambat dan mengusulkan pool 50. Untuk tahu bagian mana yang menunggu, api-t3 harus mengeluarkan data tentang dirinya sendiri.",
  "Observability adalah kemampuan memahami keadaan sebuah sistem dari data yang ia keluarkan, tanpa membaca kodenya. Kemampuan itu juga berlaku untuk masalah yang belum pernah terpikir ([OpenTelemetry: Observability primer](https://opentelemetry.io/docs/concepts/observability-primer/), dibuka 2026-10-26). Data itu datang dalam tiga bentuk: log, metric, dan trace.",
  "Cara kerjanya",
  "Tiga sinyal menjawab pertanyaan yang berbeda:",
  "Sinyal",
  "Isinya",
  "Pertanyaan yang dijawab",
  "Di api-t3 saat M18",
  "Log",
  "Pesan bertanda waktu yang ditulis service atau komponen lain",
  "Apa yang terjadi pada satu kejadian, dan galat apa?",
  "Metric",
  "Angka agregat dalam rentang waktu, mis. error rate atau pemakaian sumber daya",
  "Seberapa sering atau seberapa penuh?",
  "Rekaman lab: pembacaan pool, hanya dengan flag `-lab`",
  "Trace",
  "Perjalanan satu request, terdiri dari span: satu unit kerja dengan durasinya",
  "Di bagian mana waktu satu request habis?",
  "Tidak dijalankan",
  "Arti ketiga sinyal mengikuti dokumentasi OpenTelemetry ([primer](https://opentelemetry.io/docs/concepts/observability-primer/) dan [traces](https://opentelemetry.io/docs/concepts/signals/traces/), dibuka 2026-10-26). Rekaman di bawah menunjukkan apa yang bisa dibaca dari luar proses api-t3 saat satu pembayaran menggantung. Bagian pertama memuat log dan trace, bagian kedua metric dan database:",
  "**Log.** Di api-t3, baris log ditulis untuk kejadian tertentu. Contohnya server mulai atau berhenti, kesalahan internal, push yang gagal di mode rentan M18, dan satu ringkasan tiap ekspor laporan. Server ini tidak punya log akses: tidak ada baris untuk tiap request. Request yang menggantung tidak meninggalkan baris, dan pembacaan saldo yang selesai dengan 200 pun tidak.",
  "Server ini memakai paket `log` biasa, yang menulis teks bebas, bukan JSON. Log terstruktur menulis tiap kejadian sebagai JSON dengan field tetap, supaya mesin bisa menyaring dan menghitungnya. Go punya `log/slog` di pustaka standar untuk itu ([Go 1.27.3: log/slog](https://pkg.go.dev/log/slog), dibuka 2026-10-26). Baris di bawah adalah Ilustrasi, bukan keluaran api-t3: bentuk satu baris yang tersambung ke trace lewat `trace_id`.",
  "Di OpenTelemetry untuk Go, Traces dan Metrics berstatus Stable, sedangkan Logs masih Release Candidate ([OpenTelemetry: Go](https://opentelemetry.io/docs/languages/go/), dibuka 2026-10-26). Karena SDK log belum Stable, pilihan yang tidak bergantung padanya adalah menulis log sendiri sebagai JSON dengan `trace_id`. Request pada rekaman membawa header `Authorization: Bearer`. Panduan OWASP menyebut access token, password, dan session identification values sebagai data yang biasanya dikecualikan dari log ([OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), dibuka 2026-10-26).",
  "Semua pembacaan metric di api-t3 ada di bawah `/lab/` dan hanya hidup dengan flag `-lab`, dan tidak ada endpoint `/metrics`. Yang menjawab seberapa penuh pool di M18 adalah `GET /lab/pool`. `GET /lab/outbox` (jumlah baris per status dan umur baris tertua) tidak menjawab M18: di mode rentan push dipanggil di dalam transaction dan tidak ada baris outbox. Kolom `menunggu` adalah hitungan kumulatif sejak server hidup, jadi rekaman tidak mencetaknya.",
  "**Trace.** Satu trace adalah perjalanan satu request. Ia terdiri dari span, dan setiap span mencatat satu unit kerja dengan durasinya. Antar komponen, trace disambung lewat header `traceparent` dari W3C Trace Context Level 1, edisi Recommendation 23 November 2021 ([W3C: Trace Context](https://www.w3.org/TR/trace-context/), dibuka 2026-10-26). Header itu terdiri dari empat field yang dipisah tanda minus:",
  "versi, trace-id (32 heksadesimal), parent-id (16), trace-flags (2)",
  "Trace-id mengenali seluruh perjalanan. Parent-id adalah id request ini menurut pemanggilnya. Bit paling kanan trace-flags, sampled, menyala: pemanggil mungkin sudah merekam trace. Alat tracing yang sesuai spesifikasi minimal meneruskan header itu supaya trace tidak putus (bagian 2.3).",
  "Header di atas adalah contoh dari spesifikasi, dan itu yang dikirim rekaman `jejak.txt` bagian J. Kode api-t3 (`cmd` dan `internal`) tidak menyebut `traceparent`, dan client push-nya hanya menulis header `Content-Type`. Trace-id berhenti di perbatasan API. Paket instrumentasi `otelhttp` membungkus `http.Handler` untuk menambah tracing ([pkg.go.dev: otelhttp](https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp), dibuka 2026-10-26), tetapi paket itu tidak dipasang di api-t3 dan tidak dijalankan di lab.",
  "**Empat golden signals.** Buku SRE Google menyebut empat sinyal: latency, traffic, errors, dan saturation. Bila kamu hanya bisa mengukur empat hal pada sistem yang dipakai orang, ukurlah keempatnya ([SRE book, bab 6, edisi 2017](https://sre.google/sre-book/monitoring-distributed-systems/), dibuka 2026-10-26). Tabel ini memasangkan tiap sinyal dengan M18 dan menyebut siapa yang menghitungnya di rekaman:",
  "Sinyal",
  "Arti menurut buku SRE",
  "Di rekaman M18",
  "Siapa yang menghitung",
  "Latency",
  "Lama melayani request, dengan request yang berhasil dan yang gagal dipisah",
  "Pembangkit beban lab",
  "Traffic",
  "Banyaknya permintaan, untuk web service biasanya request per detik",
  "Request per detik terjadwal (Asumsi)",
  "Pembangkit beban lab",
  "Errors",
  "Request yang gagal secara eksplisit, implisit, atau melanggar janji waktu",
  "Pembangkit beban lab",
  "Saturation",
  "Seberapa penuh sumber daya yang paling terbatas",
  "api-t3, lewat `GET /lab/pool`",
  "Di rekaman t3-pool, hanya saturation yang dibaca dari api-t3, dan hanya dengan `-lab`. Request yang tidak pernah dijawab tidak punya status code. Buku SRE tetap menghitungnya sebagai error bila melewati janji waktu. Alert dan ambangnya dibahas di [[t3-tim-infra]].",
  "Trade-off: kapan pakai apa",
  "Pilihan",
  "Yang bisa dijawab",
  "Ongkosnya",
  "Keadaan di lab",
  "Log teks bebas saja",
  "Kejadian yang sudah selesai dan dicatat",
  "Tanpa usaha tambahan, tetapi tiap pesan berbentuk bebas sehingga sulit disaring atau dihitung mesin, dan request yang menggantung tidak muncul",
  "Log terstruktur dan metric empat sinyal",
  "Apa yang terjadi per kejadian, dan seberapa penuh sumber daya",
  "Kode log dan endpoint metric di server, ruang simpan, dan ambang untuk alert",
  "Rekaman lab: metric saturation ada; log terstruktur hanya Ilustrasi",
  "Ditambah trace",
  "Di bagian mana waktu satu request habis, lintas komponen",
  "Dependency baru dengan ADR sendiri, instrumentasi, dan penyimpanan trace; Logs Go masih Release Candidate",
  "Tidak dijalankan",
  "Sengaja belum dilakukan",
  "Yang ditunda",
  "Kenapa ditunda",
  "Muncul lagi di atau pemicunya",
  "Trace OpenTelemetry di api-t3",
  "Dependency baru butuh ADR, dan tidak ada rekaman yang menjalankannya",
  "Satu request melewati lebih dari satu komponen yang belum bisa ditunjuk",
  "Batas waktu client dan ukuran pool",
  "Jawabannya butuh beban terjadwal dan Little's Law",
  "[[t3-pool]]",
  "Alert dan ambangnya",
  "Ambang adalah Asumsi yang ditetapkan lab",
  "[[t3-tim-infra]]",
  "Umur pemberitahuan tertua sebagai metric",
  "Dibutuhkan saat promo menahan notifikasi uang",
  "[[t3-m27]]",
  "Cek diri",
  "**2.** Dari empat golden signals, mana yang dilaporkan api-t3 sendiri saat pool penuh, dan lewat apa?",
  "**3.** App mengirim `traceparent`, tetapi trace-id itu tidak muncul di log atau di mana pun di API. Kenapa?",
  "Kode api-t3 tidak menyebut `traceparent`: `grep` di `cmd` dan `internal` tidak menemukan file, dan client push hanya menulis `Content-Type`. Trace-id berhenti di perbatasan API. Karena itu satu trace tidak bisa menyambung app, API, dan layanan push.",
  "PostgreSQL membuka transaction dan menunggu data dari client, jadi yang lambat bukan query ([PostgreSQL 17: pg_stat_activity](https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW), dibuka 2026-10-26). Bagian API mana yang menunggu belum terlihat. Itu pertanyaan untuk trace.",
  "Saat me-review kode AI, cek ini",
  "Setiap request meninggalkan satu baris log di akhirnya dengan status, durasi, dan id; log kosong tidak dianggap tanda sehat.",
  "Panggilan keluar (push, bank, email) punya durasi sendiri sebagai span atau field log, dan timeout yang eksplisit ([[t3-dua-tempat]]).",
  "Tidak ada token, password, atau session identifier di log, termasuk header `Authorization`.",
  "Ada metric untuk latency, traffic, errors, dan saturation di endpoint yang menggerakkan uang, dan request yang lewat batas waktu dihitung sebagai error.",
  "Header `traceparent` dari app diteruskan ke panggilan keluar, atau halaman menulis bahwa trace putus di API.",
  "Bacaan lanjut",
  "[Google SRE book, bab 6: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) (edisi 2017)",
  "[W3C: Trace Context Level 1](https://www.w3.org/TR/trace-context/) (Recommendation, 23 November 2021)",
  "[OpenTelemetry: Observability primer](https://opentelemetry.io/docs/concepts/observability-primer/)",
  "[OpenTelemetry: Go](https://opentelemetry.io/docs/languages/go/)",
  "[Go: database/sql, DBStats](https://pkg.go.dev/database/sql#DBStats) (Go 1.27.3)",
  "[OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)",
];

const PILAH_TERKUNCI = {
  "judul": "Pertanyaan ini paling cepat dijawab oleh sinyal apa?",
  "kelompok": [
    "Log",
    "Metric",
    "Trace"
  ],
  "item": [
    {
      "teks": "Berapa koneksi pool yang dipakai sekarang, dari batas 10?",
      "jawab": 1,
      "kenapa": "Angka yang dibaca terus-menerus dan bisa dipasangi alert. Rekaman lab: GET /lab/pool menjawab dipakai 10 dari maks 10 saat pool penuh (m18.txt bagian A)."
    },
    {
      "teks": "Apa galat persis saat panggilan ke layanan push berhenti sesudah 3 detik?",
      "jawab": 0,
      "kenapa": "Satu kejadian dengan pesan galatnya. Rekaman lab: sepuluh baris \"push gagal, hanya dicatat\" yang memuat Client.Timeout exceeded (adr22.txt bagian D)."
    },
    {
      "teks": "Satu pembayaran lewat app, API, layanan push, dan database. Di komponen mana waktunya habis?",
      "jawab": 2,
      "kenapa": "Trace memecah satu request menjadi span, masing-masing dengan durasinya. Tidak dijalankan: api-t3 tidak punya trace, dan kodenya tidak membaca traceparent (jejak.txt bagian J)."
    },
    {
      "teks": "Berapa persen pembacaan saldo yang tidak dijawab dalam 3 detik, menit demi menit?",
      "jawab": 1,
      "kenapa": "Angka agregat per jendela waktu. Buku SRE Google menghitung request yang lebih lambat dari janji sebagai error. Rekaman lab: 190 pembacaan sesudah pool penuh tanpa jawaban (m18.txt bagian A)."
    },
    {
      "teks": "Apakah satu pembacaan saldo Budi tadi sampai ke server dan dijawab 200?",
      "jawab": 0,
      "kenapa": "Satu kejadian per request, biasanya satu baris log akses. Rekaman lab: api-t3 tidak menulisnya, dan pembacaan saldo yang selesai pun meninggalkan 0 baris (jejak.txt bagian J), jadi di lab pertanyaan ini tidak terjawab."
    },
    {
      "teks": "Seberapa sering pool habis dalam sebulan, dan pada jam berapa?",
      "jawab": 1,
      "kenapa": "Metric adalah agregat dalam rentang waktu, jadi \"seberapa sering\" dibaca dari angkanya. Rekaman lab: GET /lab/pool hanya memberi keadaan pada satu saat, dan rekaman memuat satu pembacaan per kejadian, bukan deret angka."
    },
    {
      "teks": "Request dari HP Budi sampai ke API dengan trace yang sama, atau putus di tengah?",
      "jawab": 2,
      "kenapa": "Jawabannya butuh trace-id yang diteruskan lewat header traceparent. Rekaman lab: header contoh dari spesifikasi W3C dikirim ke api-t3, kodenya tidak membacanya, dan trace-id berhenti di API (jejak.txt bagian J)."
    }
  ]
};

const RANTAI_TERKUNCI = {
  "id": "t3-observability-inti",
  "judul": "Satu pembayaran menggantung 4 detik",
  "sumber": {
    "jenis": "rekaman",
    "teks": "Rekaman lab t3-pool, jejak.txt bagian J"
  },
  "baris": [
    {
      "label": "Menjawab",
      "sub": "bagian J dari jejak.txt",
      "simpul": [
        {
          "teks": "metric: 1 dari 10 dipakai",
          "sub": "GET /lab/pool, satu pembayaran"
        },
        {
          "teks": "database: menunggu client",
          "sub": "idle in transaction, transaction terbuka lebih dari 3 detik; bukan query yang lambat"
        }
      ]
    },
    {
      "label": "Diam",
      "sub": "bagian J dari jejak.txt",
      "simpul": [
        {
          "teks": "log: 0 baris baru",
          "sub": "api-t3 tidak punya log akses",
          "nada": "warn"
        },
        {
          "teks": "trace-id: berhenti di API",
          "sub": "kode API tidak membaca traceparent; trace Tidak dijalankan",
          "nada": "warn"
        }
      ]
    }
  ],
  "catatan": "Kotak oranye adalah yang tidak terlihat dari luar. Layanan push tiruan menerima permintaan dan tidak pernah menjawab."
};

const ISTILAH_TERKUNCI: Record<string, unknown> = {
  "golden-signals": {
    "sehari_hari": "Golden signals adalah empat angka yang kamu lihat lebih dulu saat sesuatu terasa salah: seberapa lambat, seberapa ramai, seberapa sering gagal, dan seberapa penuh. Angka itu belum menjelaskan penyebabnya, tetapi menunjukkan ke mana harus memeriksa.",
    "cerita": [
      {
        "rujukan": "t3-observability",
        "teks": "Saat pool penuh di M18, hanya saturation yang bisa dibaca dari api-t3: dipakai 10 dari maks 10. Latency, traffic, dan errors di rekaman dihitung pembangkit beban di luar server."
      },
      {
        "rujukan": "t3-m18",
        "teks": "Sesudah pool penuh, 190 pembacaan saldo tidak dijawab sama sekali. Dengan janji waktu, setiap pembacaan itu terhitung error."
      }
    ],
    "mekanisme": [
      "Latency adalah lama melayani satu request. Request yang berhasil dan yang gagal dihitung terpisah.",
      "Traffic adalah banyaknya permintaan ke sistem. Untuk web service, ukurannya biasanya request per detik.",
      "Errors adalah request yang gagal secara eksplisit (mis. HTTP 500), implisit (200 dengan isi yang salah), atau menurut kebijakan (lebih lambat dari waktu yang dijanjikan).",
      "Saturation adalah seberapa penuh sistem, dengan menekankan sumber daya yang paling terbatas, mis. koneksi di connection pool."
    ],
    "jebakan": [
      "Menghitung error hanya dari status 5xx. Request yang tidak pernah dijawab belum punya status code, jadi hitungan itu tidak melihatnya.",
      "Hanya melihat rata-rata latency. Buku SRE memberi contoh rata-rata 100 ms pada 1.000 request per detik, saat 1% request bisa makan 5 detik."
    ],
    "terkait": [
      "Latency",
      "Throughput",
      "Metric",
      "p95 / p50",
      "Connection pool"
    ]
  },
  "idle-in-transaction": {
    "sehari_hari": "Idle in transaction adalah keadaan sesi database yang sudah membuka transaction, tetapi sedang tidak menjalankan query dan menunggu perintah berikutnya dari client. Selama itu, lock yang sudah ia dapat tetap dipegang.",
    "cerita": [
      {
        "rujukan": "t3-dua-tempat",
        "teks": "Di versi pertama, sepuluh pembayaran serentak menunggu layanan push di dalam transaction. pg_stat_activity menunjukkan sepuluh sesi dengan status ini."
      },
      {
        "rujukan": "t3-observability",
        "teks": "Satu pembayaran yang menggantung terlihat dari database sebagai satu sesi idle in transaction dengan wait event ClientRead, pada transaction yang terbuka lebih dari 3 detik."
      }
    ],
    "mekanisme": [
      "Client membuka transaction dengan BEGIN dan menjalankan satu atau beberapa perintah.",
      "Sesudah perintah terakhir selesai, PostgreSQL menunggu perintah berikutnya dari client. Di pg_stat_activity, kolom state bernilai idle in transaction, wait_event_type Client, dan wait_event ClientRead.",
      "Sesi itu tetap membuka transaction sampai client mengirim COMMIT atau ROLLBACK, atau sampai sesinya diputus.",
      "Pengaman idle_in_transaction_session_timeout memutus sesi yang diam lebih lama dari batasnya. Bawaannya 0, yang berarti mati."
    ],
    "jebakan": [
      "Mengira idle in transaction berarti query lambat. Sesi itu tidak menjalankan query; yang menunggu adalah sisi client, bukan PostgreSQL.",
      "Mengira pengaman di PostgreSQL ikut membebaskan pool di aplikasi. Di rekaman lab, PostgreSQL memutus sesi yang diam lebih dari 5 detik, tetapi pool Go tetap penuh selama handler menunggu push."
    ],
    "terkait": [
      "Transaction",
      "Connection pool",
      "Timeout"
    ]
  },
  "traceparent": {
    "sehari_hari": "traceparent adalah header HTTP yang membawa nomor perjalanan satu request. Setiap komponen yang menerimanya bisa menulis nomor yang sama di log atau trace, sehingga potongan dari app, API, dan komponen lain bisa disambung.",
    "cerita": [
      {
        "rujukan": "t3-observability",
        "teks": "Rekaman jejak.txt bagian J mengirim header contoh dari spesifikasi ke api-t3. Kode api-t3 tidak membacanya, jadi trace-id berhenti di API."
      }
    ],
    "mekanisme": [
      "Pemanggil yang memulai trace menulis empat field di header: versi, trace-id (32 karakter heksadesimal), parent-id (16), dan trace-flags (2).",
      "Penerima yang ikut menelusuri mengganti parent-id dengan id miliknya di request keluar, dan trace-id tetap sama.",
      "Alat tracing yang paling minimal tetap meneruskan header itu supaya trace tidak putus.",
      "Bit paling kanan trace-flags, sampled, menandai bahwa pemanggil mungkin sudah merekam trace."
    ],
    "jebakan": [
      "Mengira header itu menyalakan tracing dengan sendirinya. Tanpa kode yang membacanya, trace-id berhenti di komponen pertama, seperti di api-t3.",
      "Membaca trace-flags sebagai angka biasa. Spesifikasi meminta flag dibaca dengan bit mask, karena bit lain bisa memakai arti baru."
    ],
    "terkait": [
      "Trace",
      "Header",
      "Log"
    ]
  }
};
