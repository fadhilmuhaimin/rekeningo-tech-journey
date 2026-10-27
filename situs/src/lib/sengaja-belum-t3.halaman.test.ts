// Penjaga halaman 3.30 (sengaja-belum.mdx, ADR 33): angka, tautan, rentang Snippet, label sumber, klaim negatif berlingkup,
// kartu Cek diri, widget Tebak, diagram Rantai, tiga halaman istilah, baris riset, dan janji halaman lain diturunkan dari
// registry (asumsi beban), rekaman lab (panic.txt, kunci24.txt, sinkron14.txt, n1.txt), kode lab (main.go, worker.go, ledger.go),
// naskah Tahap 3, dan halaman tetangga. KALIMAT_TERKUNCI mengunci SETIAP baris badan; tes lain menurunkan nilai dari sumber
// karena kalimat terkunci tidak menangkap SALAHNYA kalimat. Hanya membaca berkas terlacak git.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import inti from "../../data/diagram/t3-adr33-inti.json";
import tebakMentah from "../../data/widget/t3-adr33-tebak.json";
import { DataRantai } from "./rantai";
import { DataTebak } from "../widgets/tebak/skema";
import { HalamanIstilah } from "./istilah";
import { cekTemplat, daftarBlok } from "./blok";
import {
  BARIS_GLOSARIUM, FRONTMATTER, KALIMAT_TERKUNCI, SIDIK_BENTUK_MDX, SIDIK_DIAGRAM_INTI, SIDIK_ISTILAH, SIDIK_RISET, SIDIK_TEBAK,
} from "./sengaja-belum-t3.halaman.nilai";

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
const nilaiString = (o: unknown, out: string[] = []): string[] => {
  if (Array.isArray(o)) o.forEach((v) => nilaiString(v, out));
  else if (o && typeof o === "object") Object.values(o).forEach((v) => nilaiString(v, out));
  else if (typeof o === "string") out.push(o);
  return out;
};
const sidikJson = (o: unknown): string => sidik(nilaiString(o).join("\n"));

const BERKAS = "situs/src/content/docs/tahap-3/sengaja-belum.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const workerGo = baca("labs/api-t3/internal/worker/worker.go");
const ledgerGo = baca("labs/api-t3/internal/repo/ledger.go");
const panic = baca("labs/t3-instance/output/panic.txt");
const kunci24 = baca("labs/t3-offline/output/kunci24.txt");
const sinkron14 = baca("labs/t3-offline/output/sinkron14.txt");
const n1 = baca("labs/b2-query/output/ledger/n1.txt");
const kartu = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const glos = baca("situs/src/content/docs/alat/glosarium.mdx");
const hal = cerita.halaman as unknown as { id: string; judul: string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[]; tahap: number; bagian?: number }[];
const dari = (id: string) => {
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
const hitung = (teks: string, sub: string): number => teks.split(sub).length - 1;
const barisRiset = (id: string): string => {
  const m = riset.split("\n").find((b) => b.startsWith(`| ${id} |`));
  expect(m, `baris riset ${id}`).toBeDefined();
  return m!;
};
const baris = (teks: string) => teks.split("\n");
const nomorBaris = (teks: string, ok: (b: string) => boolean, dari0 = 0): number => {
  const i = baris(teks).findIndex((b, n) => n >= dari0 && ok(b));
  expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const snippet = [...badan.matchAll(/<Snippet ([^>]*)\/>/g)].map((m) => ({
  file: m[1]!.match(/file="([^"]+)"/)?.[1] ?? "", lines: m[1]!.match(/lines="([^"]+)"/)?.[1] ?? "", region: m[1]!.match(/region="([^"]+)"/)?.[1] ?? "", title: m[1]!.match(/title="([^"]+)"/)?.[1] ?? "",
}));
/** Angka ala halaman: koma desimal, titik ribuan. */
const id = (n: number, d: number): string => {
  const [a, b] = n.toFixed(d).split(".");
  return a!.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (b ? `,${b}` : "");
};
const tabelPertama = (judulBagian: string): string[][] => {
  const mulai = badan.indexOf(judulBagian);
  expect(mulai).toBeGreaterThanOrEqual(0);
  const potong = baris(badan.slice(mulai)).slice(1);
  const hasil: string[][] = [];
  let ada = false;
  for (const b of potong) {
    if (b.startsWith("|")) {
      ada = true;
      hasil.push(b.slice(1, -1).split(" | ").map((s) => s.trim()));
    } else if (ada) break;
  }
  return hasil.slice(2);
};
/** Satu baris tabel "Delapan yang ditunda" menurut sel pertama; sel: [komponen, masalah, keadaan, biaya]. */
const ditunda = (nama: string): string[] => {
  const r = tabelPertama("### Delapan yang ditunda").filter((x) => x[0] === nama);
  expect(r, `baris ditunda ${nama}`).toHaveLength(1);
  return r[0]!;
};
const sel = (_: string, nama: string): string[] => ditunda(nama);

// ---- angka dari registry, kode, dan rekaman ------------------------------------------------------------------------------
const as = cerita.tahap[2]!.asumsi as { user: number; aktif: number; req: number; puncak: number; trx: number };
const aktif = (as.user * as.aktif) / 100;
const puncakRps = ((aktif * as.req) / 86400) * as.puncak; // 17,36
const lambdaUang = ((aktif * as.trx) / 86400) * as.puncak; // 0,868
const trxHari = aktif * as.trx; // 7.500
const W = 0.02; // Asumsi 20 ms (halaman 3.8)
const poolKode = Number(cocok(mainGo, /pool := flag\.Int\("pool", (\d+),/)[1]);
const serentak = Number(cocok(workerGo, /Serentak: (\d+),/)[1]);
const instance = 2; // "API ×2" di registry tahap[2].arsitektur
const admin = 3;
const cadangan = 3; // superuser_reserved_connections
const maks = Number(cocok(baca("plan/RISET-TAHAP-3.md"), /max_connections "The default is typically (\d+) connections"/)[1]);
const koneksi = (n: number, pool: number) => n * pool + serentak + admin + cadangan;
const AMBANG_KONEKSI = 70; // Asumsi halaman: 70% dari max_connections
const AMBANG_CDC = 100; // Asumsi halaman: awal "ratusan per detik" di ADR 23
const AMBANG_L = 5; // Asumsi ADR 21
const wRiwayat = Number(cocok(n1.slice(n1.indexOf("# --- E. ")), /Riwayat Budi hal\. 1\s+\| JOIN \|\s+[\d.]+ ms\s+\|\s+([\d.]+) ms/)[1]) / 1000; // 1,4 ms
const lBaca = (puncakRps - lambdaUang) * W; // 0,33
const lRiwayat = puncakRps * wRiwayat; // 0,024
const picuRiwayat = AMBANG_L / wRiwayat; // 3.571
const lKatalog = ((aktif * as.req * 0.3) / 86400) * as.puncak * 0.005; // 0,026 (katalog 30% request, W 5 ms: Asumsi halaman 3.19)

describe("registry, meta, susunan blok, dan tautan", () => {
  test("3.30 ada, ADR, jalur inti, prasyarat 3.29, tanpa lab, peran backend, ADR 33; judul dan baris peta sama dengan naskah", () => {
    expect(dari("t3-adr-33")).toMatchObject({ ada: true, nomor: "3.30", jenis: "adr", inti: true, prasyarat: ["t3-estimasi"], tahap: 3, peran: ["backend"], adr: [33], bagian: 4, judul: "ADR 33: Sengaja belum dilakukan" });
    expect(dari("t3-adr-33").lab).toBeUndefined();
    expect(naskah).toContain("| 3.30 | 4 | ADR 33: Sengaja belum dilakukan | ADR | ★ | – | – |");
    expect(dari("t3-estimasi")).toMatchObject({ nomor: "3.29", ada: true });
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-estimasi\]\] · Jalur inti<\/p>/);
    expect(dari("t3-adr-33").menit).toBe(Number(m[1]) + Number(m[2]));
    expect(mdx).toContain('title: "3.30 ADR 33: Sengaja belum dilakukan"');
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("enam blok sesuai templat adr: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Kebutuhan", "Opsi", "Yang dipilih dan kenapa", "Wujud di kode", "Coba keduanya", "Kapan keputusan ini salah"]);
    expect(cekTemplat("adr", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Kebutuhan", "Opsi"]);
  });
  test("tautan [[id]]: himpunan, nomor, dan judul sama dengan registry; jumlah pemakaian dikunci; 3.29 sudah ada, jadi tautannya sungguhan", () => {
    const ids = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(ids).toEqual(["A0", "berikutnya", "t1-adr-12", "t2-adr-21", "t2-ledger", "t2-race-lock", "t3-cache", "t3-dua-instance", "t3-estimasi", "t3-jembatan", "t3-klaim-baris", "t3-m28", "t3-offline", "t3-outbox", "t3-pool", "t3-rate-limit-redis", "t3-tim-infra"]);
    const sesuai: [string, string, string][] = [
      ["t1-adr-12", "1.40", "Sengaja belum dilakukan"], ["t2-adr-21", "2.31", "ADR 21"], ["t2-ledger", "2.7", "Ledger double-entry"], ["t2-race-lock", "2.11", "Race condition dan lock"],
      ["t3-cache", "3.19", "Cache dan invalidation"], ["t3-dua-instance", "3.15", "Dua instance"], ["t3-estimasi", "3.29", "Estimasi Tahap 3"], ["t3-jembatan", "3.32", "Jembatan"],
      ["t3-klaim-baris", "3.11", "Klaim per baris"], ["t3-m28", "3.28", "M28"], ["t3-offline", "3.21", "Offline-first"], ["t3-outbox", "3.9", "Outbox transaksional"],
      ["t3-pool", "3.8", "Connection pool"], ["t3-rate-limit-redis", "3.17", "Rate limit lintas instance"], ["t3-tim-infra", "3.27", "Tim dan infra Tahap 3"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
    }
    expect(dari("A0").ada).toBe(true);
    const pakai: Record<string, number> = {};
    for (const m of badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) pakai[m[1]!] = (pakai[m[1]!] ?? 0) + 1;
    expect(pakai).toEqual({ A0: 1, berikutnya: 1, "t1-adr-12": 1, "t2-adr-21": 6, "t2-ledger": 1, "t2-race-lock": 1, "t3-cache": 5, "t3-dua-instance": 2, "t3-estimasi": 4, "t3-jembatan": 1, "t3-klaim-baris": 1, "t3-m28": 2, "t3-offline": 1, "t3-outbox": 2, "t3-pool": 2, "t3-rate-limit-redis": 1, "t3-tim-infra": 9 });
  });
  test("yang sudah dipasang: bentuk, ADR, dan M-nomor tiap baris sama dengan registry dan judul halaman tujuan", () => {
    const t = tabelPertama("### Yang sudah dipasang dan tidak termasuk daftar ini");
    expect(t.map((r) => r[0])).toEqual(["Cache", "Queue", "Redis", "Server kedua", "Offline"]);
    const adrDari = (idh: string) => dari(idh).adr!;
    expect(adrDari("t3-cache")).toEqual([28]);
    expect(adrDari("t3-outbox")).toEqual([23]);
    expect(adrDari("t3-klaim-baris")).toEqual([24]);
    expect(adrDari("t3-at-least-once")).toEqual([25]);
    expect(adrDari("t3-tim-infra")).toEqual([32]);
    expect(adrDari("t3-rate-limit-redis")).toEqual([27]);
    expect(adrDari("t3-dua-instance")).toEqual([26]);
    expect(adrDari("t3-offline")).toEqual([29]);
    expect(t[0]![1]).toBe("Cache katalog di Redis, TTL 60 detik (ADR 28)");
    expect(t[1]![1]).toBe("Tabel outbox di PostgreSQL dan worker (ADR 23, 24, 25), dengan kelas queue (ADR 32)");
    expect(t[2]![1]).toBe("Batas login lintas instance (ADR 27) dan cache katalog (ADR 28); bukan queue dan bukan source of truth");
    expect(t[3]![1]).toBe("Dua instance API di satu VPS di belakang proxy (ADR 26)");
    expect(t[4]![1]).toBe("Stok dan harga, bersyarat versi (ADR 29)");
    expect(t.map((r) => r[2])).toEqual(["M23", "M18 sampai M20, M27", "M22", "M21", "M24"]);
    for (const [m, idh] of [["M23", "t3-m23"], ["M18", "t3-m18"], ["M20", "t3-m20"], ["M27", "t3-m27"], ["M22", "t3-m22"], ["M21", "t3-m21"], ["M24", "t3-m24"]] as const) expect(dari(idh).judul.startsWith(m), idh).toBe(true);
    expect(t.map((r) => r[3])).toEqual(["[[t3-cache]]", "[[t3-outbox]], [[t3-tim-infra]]", "[[t3-rate-limit-redis]]", "[[t3-dua-instance]]", "[[t3-offline]]"]);
    // naskah: ADR 28 cache katalog 60 detik, ADR 27 Redis, ADR 26 dua instance di satu VPS, ADR 29 hanya stok dan harga
    expect(baris(naskah).find((b) => b.startsWith("| 28 |"))).toContain("Cache katalog di Redis, TTL 60 detik");
    expect(baris(naskah).find((b) => b.startsWith("| 27 |"))).toContain("Redis untuk state bersama");
    expect(baris(naskah).find((b) => b.startsWith("| 26 |"))).toContain("Dua instance di satu VPS");
    expect(baris(naskah).find((b) => b.startsWith("| 29 |"))).toContain("Offline hanya stok dan harga");
  });
  test("janji halaman lain ke 3.30 ditepati: 3.8, 3.9, 3.11, 3.15, 3.19, 3.21, 3.27, 3.29 menunjuk ke halaman ini, dan halaman ini memuat isinya", () => {
    const h = (n: string) => baca(`situs/src/content/docs/tahap-3/${n}.mdx`);
    expect(h("connection-pool")).toContain("| Pooler terpisah seperti PgBouncer | Dua instance memakai 30 dari 100 koneksi (Asumsi, hitungan di Paham). Pooler layak bila instance × pool mendekati `max_connections` | [[t3-adr-33]] |");
    expect(h("dua-instance")).toContain("| VPS kedua dan load balancer | Beban 17,36 request per detik tidak menuntut kapasitas, dan state di memori belum dipindah ke tempat bersama | [[t3-adr-33]] |");
    expect(h("dua-instance")).toContain("| Kubernetes dan canary | Dua instance dan empat engineer tidak membenarkan biaya operasionalnya | [[t3-adr-33]] |");
    expect(h("dua-instance")).toContain("Satu VPS tetap titik gagal tunggal. Ini diterima sengaja dan dijawab di [[t3-jembatan]] dan [[t3-adr-33]].");
    expect(h("klaim-per-baris")).toContain("| Log-based CDC untuk urutan COMMIT penuh | Satu consumer dan notifikasi yang berdiri sendiri tidak butuh urutan penuh | [[t3-adr-33]] |");
    expect(h("outbox-worker")).toContain("| Log-based CDC | Tiga komponen baru tanpa kebutuhan urutan commit penuh | [[t3-adr-33]] |");
    expect(h("offline-first")).toContain("| Pembayaran offline | Pembayaran memakai saldo dan stok yang tidak bisa diperiksa offline, dan PRD v3 mengeluarkannya dari lingkup | [[t3-adr-33]] |");
    expect(h("cache-invalidation")).toContain("[[t3-adr-33]] mencatat cache saldo dan riwayat sebagai yang sengaja belum dilakukan (naskah).");
    expect(h("tim-infra")).toContain("| Canary, Kubernetes, dan VPS kedua | Dua instance dan satu VPS cukup untuk beban Tahap 3 | [[t3-adr-33]] |");
    const e = h("estimasi");
    expect(e).toContain("| Load test kapasitas satu server | Integrasi PRD v4 belum ada, jadi W pihak ketiganya Asumsi | [[t3-adr-33]] |");
    expect(e).toContain("| Mengubah ukuran pool | L semua request 2,78 dari batas 18, dan W 20 ms belum diukur | [[t3-adr-33]] |");
    expect(e).toContain("| Pooler seperti PgBouncer | Koneksi 40 dari 100 | [[t3-adr-33]] |");
    expect(e).toContain("Koneksi: 2 × 10 + 2 × 5 + 4 + 3 + 3 = 40 dari 100.");
    // isi halaman ini yang menjawab janji-janji itu
    for (const k of ["Microservices", "Kubernetes dan canary", "Read replica", "PgBouncer", "CDC", "VPS kedua", "Cache saldo dan riwayat", "Pembayaran offline"]) expect(badan, k).toContain(`| ${k} |`);
    harus("Pratinjau Tahap 4: 40 dari 100 (Asumsi, [[t3-estimasi]])");
    harus("7. Ukuran pool tetap 10 per instance sampai ada L dari server sungguhan ([[t3-pool]]).");
    harus("5. Load test kapasitas satu server, yang diminta aturan 5 [[t2-adr-21]], dijadwalkan sebelum fitur PRD v4 pertama yang menambah λ atau W.");
    harus("Layanan pihak ketiga memakai tiruan lokal.");
    harus("Jalur uang membaca saldo di dalam transaction dan mengunci barisnya.");
    // 3.15 alasan "state di memori" sudah berubah oleh ADR 27 dan 28: halaman ini tidak mengulang alasan itu
    expect(badan).not.toContain("state di memori");
  });
});

describe("naskah: ADR 33, M28, dan daftar delapan komponen", () => {
  test("baris ADR 33 di naskah memuat delapan komponen dalam urutan yang sama dengan tabel Delapan yang ditunda; M28 memuat pemicunya", () => {
    const adr = baris(naskah).find((b) => b.startsWith("| 33 |"))!;
    expect(adr).toContain("Sengaja belum: microservices, Kubernetes dan canary, read replica, PgBouncer, CDC, VPS kedua, cache saldo dan riwayat, pembayaran offline");
    const nama = (adr.match(/Sengaja belum: ([^|]+)\|/)![1]!).trim().split(", ").map((s) => s.toLowerCase());
    const t = tabelPertama("### Delapan yang ditunda");
    expect(t).toHaveLength(8);
    expect(t.map((r) => r[0]!.toLowerCase())).toEqual(nama);
    const m28 = baris(naskah).find((b) => b.startsWith("| M28 |"))!;
    expect(m28).toContain("| 10 |");
    expect(m28).toContain("Perlu server lebih besar");
    expect(m28).toContain("ADR 33 \"Sengaja belum dilakukan\": tanpa microservices, Kubernetes, read replica, PgBouncer, CDC, VPS kedua, cache saldo");
    // 3.28 mengikuti baris M28 naskah (tujuh butir); tabel ADR 33 naskah delapan butir: halaman ini menjelaskan selisihnya
    const h328 = baca("situs/src/content/docs/tahap-3/m28-prd-v4.mdx");
    expect(h328).toContain("- [[t3-adr-33]]: ADR 33, \"Sengaja belum dilakukan\". Microservices, Kubernetes, read replica, PgBouncer, CDC, VPS kedua, dan cache saldo ditunda, masing-masing dengan alasan dari angka.");
    expect(m28.match(/tanpa ([^|]+?) \|/)).not.toBeNull();
    expect(m28).toContain("tanpa microservices, Kubernetes, read replica, PgBouncer, CDC, VPS kedua, cache saldo");
    expect(m28.match(/tanpa microservices, Kubernetes, read replica, PgBouncer, CDC, VPS kedua, cache saldo/)![0].split(", ")).toHaveLength(7);
    expect(dari("t3-m28").ada).toBe(true);
    harus("Halaman [[t3-m28]] dan baris M28 di naskah menyebut tujuh butir. Tabel ADR 33 di naskah menambah pembayaran offline, dan memasangkan canary dengan Kubernetes serta riwayat dengan cache saldo, jadi hasilnya delapan baris.");
    harus("Minggu 10, uji coba enam kota lolos, lalu Sinta datang dengan PRD v4 ([[t3-m28]]). Dugaan pertama adalah server yang lebih besar.");
    expect(naskah).toContain("Tim naik dari 4 menjadi 10 sampai 15 orang dalam tiga tim");
    harus("Satu tim empat engineer (Asumsi cerita).");
  });
  test("tabel kapasitas naskah: puncak 17,36, uang 0,868, 7.500 per hari, koneksi 30 dari 100 sama dengan registry dan halaman 3.8", () => {
    expect(puncakRps).toBeCloseTo(17.3611, 3);
    expect(lambdaUang).toBeCloseTo(0.868, 3);
    expect(trxHari).toBe(7500);
    harus("Puncaknya 17,36 request per detik, dan uangnya 0,868 per detik ([[t3-pool]]).");
    harus("Masukan Asumsi naskah: 10.000 user, 25% aktif, 60 request dan 3 pembayaran atau transfer per user aktif per hari, faktor puncak 10.");
    expect([as.user, as.aktif, as.req, as.trx, as.puncak]).toEqual([10000, 25, 60, 3, 10]);
    expect(id(puncakRps, 2)).toBe("17,36");
    expect(id(lambdaUang, 3)).toBe("0,868");
    const pool = baca("situs/src/content/docs/tahap-3/connection-pool.mdx");
    expect(pool).toContain("Jadi dua instance memakai 2 × 10 + 4 + 3 + 3 = 30 dari 100 koneksi.");
    expect(pool).toContain("Worker memakai 4 koneksi dan koneksi admin 3, keduanya Asumsi naskah.");
    expect(pool).toContain("Angka 3 yang terakhir adalah slot cadangan superuser.");
    expect(koneksi(instance, poolKode)).toBe(30);
    expect(maks).toBe(100);
  });
});

describe("hitungan: koneksi, L baca, L riwayat, CDC, jendela backup, dan tabel Ubah satu hal", () => {
  test("koneksi: 2 × 10 + 4 + 3 + 3 = 30 dari 100, pemicu 70, enam instance, 43%; nilai 10 dan 4 dari kode lab", () => {
    expect(poolKode).toBe(10);
    expect(serentak).toBe(4);
    expect(koneksi(2, 10)).toBe(30);
    expect(maks * 0.7).toBe(AMBANG_KONEKSI);
    expect((AMBANG_KONEKSI - serentak - admin - cadangan) / poolKode).toBe(6);
    expect(Math.round((30 / AMBANG_KONEKSI) * 100)).toBe(43);
    const k = sel(badan, "PgBouncer");
    expect(k[2]).toContain(`${instance} × ${poolKode} + ${serentak} + ${admin} + ${cadangan} = ${koneksi(instance, poolKode)} dari \`max_connections\` ${maks}`);
    harus("Angka 70 menyisakan 30 koneksi untuk migration dan sesi manual");
    harus(`Pemicu koneksi memakai ${AMBANG_KONEKSI} dari ${maks} dan pemicu CDC ${AMBANG_CDC} pesan per detik, keduanya Asumsi halaman ini.`);
    expect(maks - AMBANG_KONEKSI).toBe(30);
    const p = sel(badan, "PgBouncer").length;
    expect(p).toBe(4);
    expect(mainGo).toContain("harus muat (30 dari 100, naskah bagian 3)");
  });
  test("tabel Ubah satu hal: tiap baris dihitung dari rumus instance × pool + 4 + 3 + 3 dan dibandingkan dengan 70", () => {
    const t = tabelPertama("**Ubah satu hal:**");
    const ekspektasi: [string, number, number][] = [
      ["Sekarang: 2 instance, pool 10", 2, 10], ["4 instance", 4, 10], ["6 instance", 6, 10], ["6 instance, pool 5", 6, 5], ["9 instance", 9, 10],
    ];
    expect(t).toHaveLength(ekspektasi.length);
    ekspektasi.forEach(([label, n, pool], i) => {
      const kon = koneksi(n, pool);
      const persen = Math.round((kon / AMBANG_KONEKSI) * 100);
      expect(t[i]![0]).toBe(label);
      expect(t[i]![1]).toBe(String(kon));
      expect(t[i]![2].startsWith(`${persen}%`), `${label}: ${t[i]![2]}`).toBe(true);
    });
    expect(t.map((r) => r[1])).toEqual(["30", "50", "70", "40", "100"]);
    expect(t[2]![2]).toBe("100%: pemicu tercapai");
    expect(t[4]![2]).toBe("143%: `max_connections` habis");
    expect(koneksi(9, 10)).toBe(maks);
    harus("Rumusnya instance × pool + 4 + 3 + 3 (Hitungan; worker 4, admin 3, dan cadangan superuser 3 adalah Asumsi naskah).");
  });
  test("L baca paling banyak (17,36 − 0,868) × 0,02 = 0,33; L riwayat 17,36 × 0,0014 = 0,024; sepuluh kali 0,24; pemicu 5 ÷ 0,0014 = 3.571 = ±206 kali puncak", () => {
    expect(wRiwayat).toBeCloseTo(0.0014, 6);
    expect(id(lBaca, 2)).toBe("0,33");
    expect(id(lRiwayat, 3)).toBe("0,024");
    expect(id(lRiwayat * 10, 2)).toBe("0,24");
    expect(id(picuRiwayat, 0)).toBe("3.571");
    expect(Math.round(picuRiwayat / puncakRps)).toBe(206);
    const rr = sel(badan, "Read replica");
    expect(rr[2]).toContain("L baca paling banyak (17,36 − 0,868) × 0,02 = 0,33 koneksi (Hitungan atas Asumsi)");
    const cr = sel(badan, "Cache saldo dan riwayat");
    expect(cr[2]).toContain("Riwayat halaman pertama 1,4 ms dengan satu query dan index (Rekaman lab Tahap 2, `n1.txt` bagian E, tanpa jaringan)");
    expect(cr[2]).toContain("Bila semua 17,36 request per detik adalah riwayat, L = 0,024 koneksi (Hitungan)");
    const kapan = baris(badan).filter((b) => b.startsWith("| Cache saldo dan riwayat | Query saldo"))[0]!;
    expect(kapan).toContain("L riwayat paling banyak 0,024; dengan W sepuluh kali lebih besar 0,24. Pemicu tercapai pada 3.571 per detik, ±206 kali puncak (Hitungan)");
    expect(n1).toContain("tanpa jaringan antara server API dan database");
    expect(cr[3]).toContain("Salinan di luar database tidak ikut COMMIT dan ROLLBACK");
  });
  test("jarak ke pemicu: PgBouncer 43%, replica 6,6%, CDC 0,9%, cache 0,49% (4,9% bila W sepuluh kali); PgBouncer paling dekat", () => {
    const jarak = { pgb: 30 / AMBANG_KONEKSI, rep: lBaca / AMBANG_L, cdc: lambdaUang / AMBANG_CDC, cache: lRiwayat / AMBANG_L };
    expect(Object.entries(jarak).sort((a, b) => b[1] - a[1]).map(([k]) => k)).toEqual(["pgb", "rep", "cdc", "cache"]);
    expect(id(jarak.pgb * 100, 0)).toBe("43");
    expect(id(jarak.rep * 100, 1)).toBe("6,6");
    expect(id(jarak.cdc * 100, 1)).toBe("0,9");
    expect(id(jarak.cache * 100, 2)).toBe("0,49");
    expect(id(jarak.cache * 1000, 1)).toBe("4,9");
    const t = DataTebak.parse(tebakMentah);
    const [a, b, c, d] = t.pilihan.map((x) => x.alasan);
    expect(a).toBe(`Koneksi: ${instance} × ${poolKode} + ${serentak} + ${admin} + ${cadangan} = ${koneksi(instance, poolKode)} dari ${maks}. Pemicu ${AMBANG_KONEKSI} berarti ${koneksi(instance, poolKode)} ÷ ${AMBANG_KONEKSI} = ${id(jarak.pgb * 100, 0)}% jalan, dan enam instance pool ${poolKode} sampai di sana.`);
    expect(b).toBe(`L baca paling banyak (${id(puncakRps, 2)} − ${id(lambdaUang, 3)}) × ${id(W, 2)} = ${id(lBaca, 2)} koneksi, dari pemicu ${AMBANG_L}: ${id(jarak.rep * 100, 1)}%. W 20 ms adalah Asumsi, dan tidak semua request selain uang adalah baca.`);
    expect(c).toBe(`Notifikasi uang ${id(lambdaUang, 3)} per detik dari pemicu ${AMBANG_CDC} per detik, awal dari ratusan per detik di ADR 23: ${id(jarak.cdc * 100, 1)}%. Consumernya satu, dan ia tidak bergantung pada urutan.`);
    expect(d).toBe(`L riwayat paling banyak ${id(puncakRps, 2)} × ${id(wRiwayat, 4)} = ${id(lRiwayat, 3)} koneksi, dari pemicu ${AMBANG_L}: ${id(jarak.cache * 100, 2)}%. Bila W sepuluh kali lebih besar, ${id(lRiwayat * 10, 2)} koneksi: ${id(jarak.cache * 1000, 1)}%.`);
    harus("<noscript>");
    harus("<p>Tanpa JavaScript tebakan tidak berjalan. Jawaban yang tepat: PgBouncer. Koneksi 30 dari pemicu 70 adalah 43%, sedangkan read replica 6,6%, CDC 0,9%, dan cache saldo dan riwayat 0,49%.</p>");
  });
  test("CDC: pemicu 100 adalah awal 'ratusan per detik' di ADR 23 naskah; pembanding Solid Queue ±231 per detik dari riset; 0,868 per detik di klaim-per-baris dan outbox-worker", () => {
    const adr23 = baris(naskah).find((b) => b.startsWith("| 23 |"))!;
    expect(adr23).toContain("pesan terus mengalir ratusan per detik");
    expect(adr23).toContain("±20 juta job per hari");
    expect(Math.round(20_000_000 / 86400)).toBe(231);
    harus("100 adalah awal dari \"ratusan per detik\" di ADR 23.");
    const cdc = sel(badan, "CDC");
    expect(cdc[2]).toContain("7.500 notifikasi uang per hari, puncak 0,868 per detik (Hitungan atas Asumsi)");
    expect(id(trxHari, 0)).toBe("7.500");
    expect(baca("situs/src/content/docs/tahap-3/klaim-per-baris.mdx")).toContain("Satu consumer dan notifikasi yang berdiri sendiri tidak butuh urutan penuh");
    expect(baca("situs/src/content/docs/tahap-3/klaim-per-baris.mdx")).toContain("Urutan tiba tidak dipakai fitur mana pun di PRD v3");
    expect(cdc[2]).toContain("Satu consumer, dan tiap notifikasi berdiri sendiri, jadi urutan antar pesan tidak dipakai fitur mana pun ([[t3-klaim-baris]])");
    expect(mainGo).toContain("worker.Bawaan().Serentak");
  });
  test("VPS kedua: backup harian dan uji pulih Tidak dijalankan dari 3.27; jendela 24 jam, ±7.500 transaksi uang; PRD v3 tanpa batas waktu pulih", () => {
    const t327 = baca("situs/src/content/docs/tahap-3/tim-infra.mdx");
    expect(t327).toContain("Backup `pg_dump` harian dan uji pulih mingguan di staging adalah keputusan naskah.");
    expect(t327).toContain("Jadwal harian dan uji pulih di staging Tidak dijalankan di Tahap 3, jadi jadwal itu Asumsi.");
    expect(naskah).toContain("Backup: `pg_dump` terjadwal harian, diuji pulih tiap minggu di staging");
    const prd = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
    for (const k of ["toleransi", "RTO", "RPO", "kehilangan data", "waktu pulih"]) expect(prd, `prd-v3 memuat ${k}`).not.toContain(k);
    expect(prd).toContain("backup terjadwal");
    const v = sel(badan, "VPS kedua");
    expect(v[2]).toContain("Backup `pg_dump` harian: jendela kehilangan data sampai 24 jam (Hitungan; jadwal Asumsi)");
    const kapan = baris(badan).find((b) => b.startsWith("| VPS kedua | Waktu pulih"))!;
    expect(kapan).toContain("Jendela sampai 24 jam, ±7.500 transaksi uang (Hitungan atas Asumsi)");
    expect(24 * 3600).toBe(86400);
    expect(trxHari).toBe(7500);
    expect(kapan).toContain("PRD v3 tidak menulis batas itu");
    harus("Backup harian membuat jendela kehilangan sampai 24 jam, padahal setiap rupiah harus tertelusur, dan PRD v3 tidak menulis batas waktu pulih atau jendela kehilangan data.");
    expect(baca("plan/CERITA-TAHAP-1.md")).toContain("Setiap rupiah tertelusur");
  });
});

describe("tinjauan 3.30: cache katalog lawan pemicu, CDC lonjakan lawan laju, bug M21, dan permintaan lama", () => {
  test("cache katalog dipasang walau L katalog 0,026 di bawah pemicu 5: sama dengan 3.19; cache saldo dibedakan oleh uang, bukan oleh L", () => {
    expect(id(lKatalog, 3)).toBe("0,026");
    expect(lKatalog).toBeLessThan(AMBANG_L);
    const c = baca("situs/src/content/docs/tahap-3/cache-invalidation.mdx");
    expect(c).toContain("L = λ × W = 5,21 × 0,005 = 0,026 koneksi dari pool 10");
    expect(c).toContain("ADR ini menyimpang dari pemicu cache ADR 21: L kelas katalog 0,026 belum mencapai 5 koneksi");
    expect(c).toContain("Cache bukan syarat: tanpa cache adalah opsi yang sah");
    harus("[[t3-cache]] memasang cache katalog walau L katalog hanya 0,026 koneksi (Asumsi), jauh di bawah pemicu 5, dan menulisnya sebagai pilihan desain, bukan hasil ukur. Cache saldo dan riwayat dibedakan oleh uang (aturan 2), bukan oleh angka L yang lebih kecil.");
    harus("L riwayat yang kecil (0,024 koneksi) bukan pembedanya: L katalog juga kecil (0,026), dan cache katalog tetap dipasang.");
  });
  test("CDC: 100 per detik berarti laju terus-menerus; promo dan top-up massal 10.000 baris sekaligus dikirim ±13,3 per detik (c ÷ t naskah), jadi lonjakan", () => {
    expect(id(serentak / 0.3, 1)).toBe("13,3");
    expect(naskah).toContain("| Kapasitas worker | c ÷ t | c = 4, t = 0,3 detik (Asumsi) | 13,3 per detik");
    expect(naskah).toContain("Jumat 11.30 HR mengirim promo ke semua 10.000 HP");
    expect(naskah).toContain("Satu queue urut waktu: 10.000 baris promo berada di depan notifikasi uang");
    expect(naskah).toContain("top-up 10.000 akun bila semua karyawan menerima tunjangan (Asumsi)");
    expect(baris(naskah).find((b) => b.startsWith("| 23 |"))).toContain("pesan terus mengalir ratusan per detik");
    expect(baris(naskah).find((b) => b.startsWith("| 32 |"))).toContain("laju promo 5 per detik dijadwalkan di lab lewat `coba_lagi`");
    expect(baris(naskah).find((b) => b.startsWith("| 32 |"))).toContain("belum ada di kode api-t3");
    expect(baca("situs/src/content/docs/tahap-3/tim-infra.mdx")).toContain("5 per detik");
    const k = baris(badan).find((b) => b.startsWith("| CDC | Dua consumer"))!;
    expect(k).toContain("atau pesan outbox masuk 100 per detik terus-menerus");
    expect(k).toContain("Laju baris outbox per detik di luar lonjakan");
    expect(k).toContain("Notifikasi uang 0,868 per detik (Hitungan atas Asumsi). Promo dan top-up massal memasukkan sampai 10.000 baris sekaligus, karena batas promo 5 per detik di ADR 32 belum ada di kode, tetapi worker mengirim ±13,3 per detik (Asumsi naskah), jadi itu lonjakan, bukan laju");
  });
  test("panic.txt bagian D: kedua instance berhenti karena bug M21 (panic di ekspor laporan, mode rentan), bukan karena VPS mati", () => {
    const d = panic.slice(panic.indexOf("# --- D. "), panic.indexOf("# --- E. "));
    expect(d).toContain("keduanya mode rentan");
    expect(d).toContain("Sari menekan Ekspor: laporan kosong sampai di instance a; a berhenti sendiri (kode keluar 2)");
    expect(d).toContain("Sari menekan Ekspor lagi: sampai di instance b; b berhenti sendiri (kode keluar 2)");
    expect(baris(naskah).find((b) => b.startsWith("| M21 |"))).toContain("panic di goroutine latar milik ekspor laporan");
    expect(mainGo).toContain("ekspor-panic dan tanpa-shutdown (M21)");
    expect(dari("t3-m21").judul.startsWith("M21")).toBe(true);
  });
  test("kunci24.txt bagian E: tiga permintaan lama (bayar 28.000, transfer 10.000, pesanan 25.000) dikirim ulang dengan key yang sama dan menjadi jurnal tambahan", () => {
    const e = kunci24.slice(kunci24.indexOf("# --- E. "));
    expect(e).toContain("HP kembali online dan mengirim ulang tiga permintaan lama dengan key yang sama");
    expect(e).toContain("Key sudah lewat 24 jam: server memperlakukan permintaan ini baru. Jurnal kedua, saldo turun lagi");
    expect(e).toContain("Kiriman dan pesanan dengan key lama juga dikerjakan lagi");
    harus("Tiga permintaan lama yang dikirim ulang sesudah 62 jam dikerjakan sebagai permintaan baru: tiga jurnal tambahan, Rp63.000");
  });
  test("kata 'perkakas load test' tanpa daftar nama tidak dipakai: klaim 'tidak memakai' hanya untuk empat nama yang dipindai; lab t3-pool memang punya pembangkit beban berjadwal", () => {
    expect(baca("labs/t3-pool/beban.py")).toContain("Pembangkit beban dan pengamat koneksi untuk lab t3-pool");
    expect(badan).not.toContain("perkakas load test");
    expect(badan).not.toContain("tidak punya perkakas");
    harus("Lab hanya memutar beban berjadwal di laptop, dan itu bukan kapasitas produksi.");
  });
});

describe("rekaman lab dan kode lab yang dikutip", () => {
  test("panic.txt bagian D: satu instance berhenti, 20 dari 20 request 200 dari b; dua berhenti, 10 dari 10 503", () => {
    const d = panic.slice(panic.indexOf("# --- D. "), panic.indexOf("# --- E. "));
    expect(d).toContain("20 request sesudahnya lewat proxy: 200: 20 · 200 per instance: b 20");
    expect(d).toContain("10 request sesudahnya lewat proxy: 503: 10 (503: tidak ada instance yang sehat)");
    const v = sel(badan, "VPS kedua");
    expect(v[2]).toContain("Dengan bug M21 dalam mode rentan, satu instance berhenti: 20 dari 20 request menjawab 200. Instance kedua ikut berhenti: 10 dari 10 menjawab 503 (Rekaman lab `panic.txt` bagian D). VPS yang mati menghentikan keduanya (penalaran).");
  });
  test("kunci24.txt bagian E: jurnal baru sesudah 10006 ada tiga (28.000, 10.000, 25.000) = Rp63.000; sinkron14.txt bagian E: 422 untuk bayar, transfer, topup, nol baris operasi", () => {
    const e = kunci24.slice(kunci24.indexOf("# --- E. "));
    expect(e).toContain("Location: /transfers/10006");
    expect(e).toContain("Jam lab: Senin 06.50 (62 jam sesudah Jumat 16.50). Ilustrasi mekanisme: waktu diperankan");
    const baru = [...e.matchAll(/^ (\d{5})\s+\| (\w+)\s+\| .+?\| (-?\d+)\s*$/gm)].map((m) => ({ id: Number(m[1]), jumlah: Math.abs(Number(m[3])) })).filter((r) => r.id >= 10006);
    expect(baru.map((r) => r.id)).toEqual([10006, 10007, 10008]);
    const total = baru.reduce((s, r) => s + r.jumlah, 0);
    expect(total).toBe(63000);
    expect(`Rp${id(total, 0)}`).toBe("Rp63.000");
    const o = sel(badan, "Pembayaran offline");
    expect(o[2]).toContain("Tiga permintaan lama yang dikirim ulang sesudah 62 jam dikerjakan sebagai permintaan baru: tiga jurnal tambahan, Rp63.000 (Rekaman lab `kunci24.txt` bagian E, jam lab diperankan)");
    const s14 = sinkron14.slice(sinkron14.indexOf("# --- E. "));
    expect(s14).toContain("HTTP/1.1 422 Unprocessable Entity");
    expect(s14).toContain("pembayaran tidak pernah lewat sinkron offline; hanya stok dan harga");
    expect(s14).toContain("transfer dan topup ditolak dengan jawaban yang sama");
    expect(s14).toMatch(/baris_operasi\n-+\n 0\n/);
    expect(o[2]).toContain("`POST /sinkron` menolak bayar, transfer, dan topup dengan 422 (Rekaman lab `sinkron14.txt` bagian E)");
    const off = baca("situs/src/content/docs/tahap-3/offline-first.mdx");
    expect(off).toContain("queue paling lama 7 hari");
    expect(off).toContain("Umur Idempotency-Key di bayar, transfer, dan pesanan tetap 24 jam dan tetap opsional (ADR 14).");
    expect(o[3]).toContain("Key 24 jam lebih pendek dari queue 7 hari, dan key itu masih opsional");
    expect(o[3]).toContain("padahal saldo tidak negatif dijaga database ([[t2-ledger]])");
  });
  test("rentang Snippet diturunkan dari kode: tiga Snippet, urutan, file, baris atau region, dan judul; region ada di file", () => {
    expect(snippet).toHaveLength(3);
    const awal = nomorBaris(mainGo, (b) => b.includes('peran := flag.String("peran", "api", "api atau worker")'));
    const akhir = nomorBaris(mainGo, (b) => b.includes('pool := flag.Int("pool", 10,'), awal);
    expect([awal, akhir]).toEqual([45, 48]);
    expect(snippet[0]).toEqual({ file: "labs/api-t3/cmd/api/main.go", lines: `${awal}:${akhir}`, region: "", title: `Kode lab: labs/api-t3/cmd/api/main.go baris ${awal} sampai ${akhir} (satu binary, dua peran, pool 10)` });
    expect(snippet[1]).toEqual({ file: "labs/api-t3/cmd/api/main.go", lines: "", region: "buka-db", title: "Kode lab: labs/api-t3/cmd/api/main.go (batas pool)" });
    expect(snippet[2]).toEqual({ file: "labs/api-t3/internal/repo/ledger.go", lines: "", region: "kunci-buku", title: "Kode lab: labs/api-t3/internal/repo/ledger.go (saldo dibaca dengan FOR UPDATE)" });
    const bukaDb = mainGo.slice(mainGo.indexOf("// --8<-- [start:buka-db]"), mainGo.indexOf("// --8<-- [end:buka-db]"));
    expect(bukaDb).toContain("SetMaxOpenConns(pool)");
    expect(bukaDb).toContain("(30 dari 100, naskah bagian 3)");
    const kunci = ledgerGo.slice(ledgerGo.indexOf("// --8<-- [start:kunci-buku]"), ledgerGo.indexOf("// --8<-- [end:kunci-buku]"));
    expect(kunci).toContain("SELECT id, akun_id, jenis, saldo_cache, batas_saldo, batas_harian");
    expect(kunci).toContain("ORDER BY id\n\t\tFOR UPDATE");
    expect(mainGo).toContain('"api atau worker"');
    expect(workerGo).toContain("Serentak: 4,");
    expect(mainGo).toContain('serentak := flag.Int("serentak", worker.Bawaan().Serentak, "worker: pengirim serentak (c)")');
    harus("API dan worker berasal dari satu `main.go`, dibedakan flag `-peran`. Flag `-pool` bernilai 10 sebagai bawaan, masukan 10 di hitungan 30 dari 100. Worker mengirim 4 baris serentak (`-serentak`), yang dipakai hitungan sebagai 4 koneksi (Asumsi naskah).");
  });
  test("klaim negatif berlingkup: delapan lab Tahap 3, file compose, go.mod, go.sum, Makefile, skrip Python, Go, SQL, Caddyfile di luar output/; tanpa nama komponen yang ditunda atau perkakas load test", () => {
    const lab = ["api-t3", "t3-pool", "t3-outbox", "t3-instance", "t3-cache", "t3-offline", "t3-dasbor", "t3-mitm"];
    const jenis = /(^|\/)(docker-compose[^/]*\.ya?ml|compose[^/]*\.ya?ml|go\.mod|go\.sum|Makefile|[^/]+\.py|[^/]+\.go|[^/]+\.sql|[^/]*Caddyfile|[^/]+\.sh|[^/]+\.yaml)$/;
    const daftar = [...(terlacak ?? new Set<string>())].filter((f) => lab.some((l) => f.startsWith(`labs/${l}/`)) && !f.includes("/output/") && jenis.test(f));
    expect(daftar.length).toBeGreaterThan(40);
    for (const l of lab) expect(daftar.some((f) => f.startsWith(`labs/${l}/`)), l).toBe(true);
    for (const n of ["docker-compose.yml", "go.mod", "go.sum", "Makefile", ".py", ".go", ".sql", "Caddyfile"]) expect(daftar.some((f) => f.endsWith(n)), n).toBe(true);
    const nama = /pgbouncer|kafka|debezium|kubectl|kubernetes|k3s|helm|wal_level|primary_conninfo|pg_basebackup|walsender|logical replication|create publication|replication slot|hot_standby|\bk6\b|locust|vegeta|\bwrk\b|canary/i;
    // kontrol positif: pola menangkap setiap nama yang halaman sebut
    for (const k of ["pgbouncer", "kafka", "debezium", "kubectl", "kubernetes", "k3s", "helm", "wal_level", "primary_conninfo", "pg_basebackup", "walsender", "replication slot", "hot_standby", "k6", "locust", "vegeta", "wrk", "canary"]) expect(nama.test(`x ${k} y`), k).toBe(true);
    const kena = daftar.filter((f) => nama.test(baca(f)));
    expect(kena).toEqual([]);
    harus("tes halaman ini memindai compose, `go.mod`, `go.sum`, Makefile, skrip Python, kode Go, SQL, dan Caddyfile di delapan lab Tahap 3, di luar `output/`.");
    harus("Tes tidak menemukan nama pgbouncer, kafka, debezium, kubectl, kubernetes, k3s, helm, `wal_level`, `primary_conninfo`, `pg_basebackup`, `walsender`, `replication slot`, `hot_standby`, k6, locust, vegeta, atau canary. Klaim ini hanya untuk folder dan jenis file itu.");
    expect(sel(badan, "VPS kedua").length).toBe(4);
    expect(badan).not.toContain("perkakas load test");
    expect(hitung(badan, "delapan lab Tahap 3 tidak memakai k6, locust, vegeta, atau wrk")).toBe(2);
  });
  test("klaim 3.27: hanya satu ambang alert punya dasar (30 detik); error rate, p95, dan request menunggu koneksi belum ditetapkan", () => {
    const t = baca("situs/src/content/docs/tahap-3/tim-infra.mdx");
    expect(t).toContain("Hanya 30 detik yang punya dasar, yaitu janji PRD v3 untuk bayar dan transfer.");
    expect(hitung(t, "| Belum ditetapkan |")).toBe(3);
    expect(t).toContain("Tahap 3: staging");
    const k = baris(badan).find((b) => b.startsWith("| Kubernetes dan canary | Kubernetes:"))!;
    expect(k).toContain("Satu ambang punya dasar: 30 detik untuk umur notifikasi uang. Error rate, p95, dan request menunggu koneksi belum ditetapkan");
    const kc = sel(badan, "Kubernetes dan canary");
    expect(kc[2]).toContain("Error rate dan p95 belum punya ambang, jadi canary belum punya yang dinilai ([[t3-tim-infra]])");
    expect(kc[2]).toContain("Deploy bergulir sudah ada ([[t3-dua-instance]])");
    expect(baca("situs/src/content/docs/tahap-3/dua-instance.mdx")).toContain("Deploy mengganti satu instance, menunggu penggantinya menjawab lewat proxy, lalu mengganti instance yang lain.");
    expect(JSON.stringify(cerita.tahap[2]!.arsitektur)).toContain("Tahap 3: satu VPS menjalankan proxy, dua API, worker, Redis, dan PostgreSQL.");
    expect(JSON.stringify(cerita.tahap[2]!.arsitektur)).toContain("API ×2");
  });
});

describe("sumber luar, atribusi Segment, dan baris riset R3-245 sampai R3-248", () => {
  test("baris riset ada, dikunci dengan sidik, urut dan tanpa ID ganda; tanggal akses 2026-10-27; memuat fakta yang dipakai halaman", () => {
    const ids = [...riset.matchAll(/^\| (R3-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [k, v] of Object.entries(SIDIK_RISET)) expect(sidik(barisRiset(k)), `${k}: baca ulang sumbernya sebelum mengubah sidik`).toBe(v);
    const urut = (a: string) => Number(a.slice(3));
    expect(ids.map(urut)).toEqual([...ids.map(urut)].sort((a, b) => a - b));
    for (const k of ["R3-245", "R3-246", "R3-247", "R3-248"]) expect(barisRiset(k)).toContain("2026-10-27");
    const s = barisRiset("R3-245");
    for (const k of ["2018-07-10", "ratusan ribu event per detik", "lebih dari seratus tipe tujuan", "head-of-line blocking", "tiga per bulan", "over 140 services", "naik linear", "3 full-time engineers", "menggabungkan semuanya jadi satu service", "In some parts of our infrastructure, microservices work well", "isolasi kegagalan sulit", "tulisan perusahaan tentang produknya sendiri"]) expect(s, k).toContain(k);
    const p = barisRiset("R3-246");
    for (const k of ["SET/RESET, LISTEN, PREPARE/DEALLOCATE", "\"Never\"", "max_prepared_statements", "automatically prepares and caches prepared statements", "may be incompatible with proxies such as PgBouncer", "v5.11.0", "1.26.1"]) expect(p, k).toContain(k);
    const r = barisRiset("R3-247");
    for (const k of ["a small delay", "sebanding dengan jeda replikasi", "only offers a solution for disaster recovery, not high availability", "STONITH", "measurable delay", "eventually consistent", "wraparound transaction ID", "tidak tahu keadaan consumer"]) expect(r, k).toContain(k);
    const kk = barisRiset("R3-248");
    for (const k of ["kube-apiserver, etcd, kube-scheduler, kube-controller-manager", "kubelet", "a partial and time-limited deployment of a change in a service and its evaluation", "tiga syarat"]) expect(kk, k).toContain(k);
  });
  test("atribusi Segment di halaman hanya yang ada di baris riset; batas ditulis; padanan Rekeningo berlabel penalaran", () => {
    harus("**Kasus industri: Segment, 2018.** Segment, sekarang bagian Twilio, mengirim event dari app ke lebih dari seratus tujuan.");
    harus("Satu queue untuk semua tujuan membuat satu tujuan yang lambat menunda yang lain (head-of-line blocking).");
    harus("Tujuan bertambah rata-rata tiga per bulan, sampai lebih dari 140 service.");
    harus("Menurut tulisan itu, overhead operasional naik linear dengan jumlah tujuan, dan tiga engineer penuh waktu menghabiskan sebagian besar waktunya menjaga sistem hidup.");
    harus("Mereka menggabungkannya lagi menjadi satu service ([Alexandra Noonan, Goodbye Microservices, 2018-07-10, dibuka 2026-10-27](https://www.twilio.com/en-us/blog/developers/best-practices/goodbye-microservices)).");
    harus("Batasnya: satu pipeline, ratusan ribu event per detik, tulisan perusahaan tentang produknya sendiri.");
    harus("Tulisan itu juga menyebut kerugian monolith, misalnya satu bug menjatuhkan semua tujuan, dan menulis bahwa microservices bekerja baik di bagian lain infrastruktur mereka.");
    harus("Padanan di Rekeningo adalah penalaran penulis.");
    expect(baris(naskah).find((b) => b.startsWith("| 32 |"))).toContain("Dua tabel outbox terpisah");
    expect(baris(naskah).find((b) => b.startsWith("| M27 |"))).toContain("Satu queue urut waktu: 10.000 baris promo berada di depan notifikasi uang");
    expect(hitung(badan, "Segment")).toBe(3);
    expect(badan).not.toMatch(/Netflix|Amazon Prime|Shopify|Uber/);
  });
  test("tautan eksternal: himpunan, tanggal akses 2026-10-27, dan nomor versi sama dengan yang ditulis", () => {
    const url = [...new Set([...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!))].sort();
    expect(url).toEqual([
      "https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions",
      "https://github.com/jackc/pgx/blob/v5.11.0/conn.go",
      "https://kubernetes.io/docs/concepts/overview/components/",
      "https://sre.google/workbook/canarying-releases/",
      "https://www.pgbouncer.org/features.html",
      "https://www.postgresql.org/docs/17/high-availability.html",
      "https://www.postgresql.org/docs/17/hot-standby.html",
      "https://www.postgresql.org/docs/17/logicaldecoding-explanation.html",
      "https://www.postgresql.org/docs/17/warm-standby-failover.html",
      "https://www.postgresql.org/docs/17/warm-standby.html",
      "https://www.twilio.com/en-us/blog/developers/best-practices/goodbye-microservices",
    ]);
    harus("Sumber, dibuka 2026-10-27: [PgBouncer](https://www.pgbouncer.org/features.html), [pgx v5.11.0](https://github.com/jackc/pgx/blob/v5.11.0/conn.go), [replikasi PostgreSQL 17](https://www.postgresql.org/docs/17/warm-standby.html), [hot standby](https://www.postgresql.org/docs/17/hot-standby.html), [failover](https://www.postgresql.org/docs/17/warm-standby-failover.html), [logical decoding](https://www.postgresql.org/docs/17/logicaldecoding-explanation.html), [komponen Kubernetes](https://kubernetes.io/docs/concepts/overview/components/), dan [Canarying Releases](https://sre.google/workbook/canarying-releases/).");
    harus("Semuanya Tidak dijalankan. Dokumentasi Kubernetes dan PgBouncer tidak memuat nomor versi di halamannya.");
    expect(mainGo.length).toBeGreaterThan(0);
    expect(baca("labs/api-t3/go.mod")).toContain("github.com/jackc/pgx/v5 v5.11.0");
    expect(barisRiset("R3-01")).toContain("pgx v5.11.0");
    expect(barisRiset("R3-01")).toContain("17.11 versi lab");
    expect(barisRiset("R3-136")).toContain("max_connections \"The default is typically 100 connections\"");
    expect(barisRiset("R3-136")).toContain("superuser_reserved_connections \"The default value is three connections\"");
  });
  test("dokumentasi dikutip tepat: mode transaction (SET/RESET, LISTEN, PREPARE, advisory lock sesi), prepared statement pgx, replikasi asinkron lawan sinkron, STONITH, Kubernetes, tiga syarat canary", () => {
    const pgb = sel(badan, "PgBouncer");
    expect(pgb[3]).toContain("Mode transaction tidak mendukung `SET`/`RESET`, `LISTEN`, `PREPARE`, dan advisory lock tingkat sesi. pgx menyiapkan dan menyimpan prepared statement secara otomatis.");
    const rr = sel(badan, "Read replica");
    expect(rr[3]).toContain("Replikasi asinkron punya jeda antara commit di primary dan terlihatnya di standby, jadi data standby eventually consistent. Saldo bayar tetap dibaca dari primary. Replica butuh mesin kedua");
    const v = sel(badan, "VPS kedua");
    expect(v[3]).toContain("asinkron bisa kehilangan commit saat failover, sinkron membuat tiap commit menunggu, dan primary lama harus diberi tahu bahwa ia bukan primary lagi");
    const kc = sel(badan, "Kubernetes dan canary");
    expect(kc[3]).toContain("Kubernetes menjalankan control plane (kube-apiserver, etcd, kube-scheduler, kube-controller-manager) dan kubelet di tiap node. Canary menuntut deploy ke sebagian, penilaian baik atau buruk, dan penilaian itu terhubung ke rilis");
    const cdc = sel(badan, "CDC");
    expect(cdc[3]).toContain("Replication slot menahan WAL sampai consumer membacanya. Dalam kasus ekstrem database berhenti demi mencegah wraparound transaction ID.");
    expect(sel(badan, "Microservices")[3]).toContain("Pasangan jurnal dan notifikasi tidak lagi atomik bila keduanya pindah ke service dengan database berbeda.");
    expect(naskah).toContain("notifikasi uang dan data uang dalam satu transaction");
  });
});

describe("widget Tebak, diagram Rantai, halaman istilah, glosarium, dan kartu Cek diri", () => {
  test("Tebak: skema valid, empat pilihan, jawaban benar di posisi pertama, bukan yang terpanjang, tidak diawali angka; sidik setiap nilai; dipasang sekali", () => {
    const t = DataTebak.parse(tebakMentah);
    expect(t.pilihan).toHaveLength(4);
    expect(t.pilihan.map((p) => p.benar)).toEqual([true, false, false, false]);
    const panjang = t.pilihan.map((p) => p.teks.length);
    expect(panjang.indexOf(Math.max(...panjang))).not.toBe(0);
    expect(t.pilihan.map((p) => p.teks)).toEqual(["PgBouncer, untuk koneksi database", "Read replica, untuk bacaan laporan", "CDC, untuk urutan commit outbox", "Cache saldo dan riwayat di Redis"]);
    for (const p of t.pilihan) expect(p.teks).not.toMatch(/^\d/);
    expect(t.sumber.jenis).toBe("asumsi");
    expect(t.label.sumber).toBe("Asumsi · hitungan");
    expect(t.pertanyaan).toBe("Mana dari keempatnya yang paling dekat ke pemicunya sekarang?");
    expect(sidikJson(tebakMentah)).toBe(SIDIK_TEBAK);
    expect(hitung(badan, "<Tebak client:visible data={dataTebak} />")).toBe(1);
    expect(hitung(badan, 'import dataTebak from "../../../../data/widget/t3-adr33-tebak.json";')).toBe(1);
    expect(t.adegan.join(" ")).toContain(`puncak ${id(puncakRps, 2)} request per detik, ${id(lambdaUang, 3)} notifikasi uang per detik, dua instance dengan pool ${poolKode}`);
    expect(t.adegan.join(" ")).toContain("1,4 ms untuk riwayat halaman pertama");
    expect(t.penutup).toContain("Yang terdekat pun baru 43% dari pemicunya, dan pemicunya Asumsi.");
    expect(nilaiString(tebakMentah).join(" ")).not.toMatch(/\bR\d-\d+\b/);
  });
  test("diagram Rantai: valid, dua baris, simpul akhir terbaca benar tanpa sub; nilai dihitung dari rumus; sidik setiap nilai; judul Inti ≤ 47 karakter", () => {
    const i = DataRantai.parse(inti);
    expect(i.baris).toHaveLength(2);
    expect(i.judul.length).toBeLessThanOrEqual(47);
    expect(i.baris.map((b) => b.simpul.map((s) => s.teks))).toEqual([["30 dari 100", "pemicu 70", "+4 instance"], ["L 0,024", "pemicu 5", "±206× puncak"]]);
    expect(i.baris.map((b) => b.simpul.at(-1)!.sub)).toEqual(["(70 − 10) ÷ 10 = 6 instance, dua sudah ada", "5 ÷ 0,0014 = 3.571 per detik; 3.571 ÷ 17,36 = 206"]);
    expect(i.baris[0]!.simpul[0]!.teks).toBe(`${koneksi(instance, poolKode)} dari ${maks}`);
    expect(i.baris[0]!.simpul[1]!.teks).toBe(`pemicu ${AMBANG_KONEKSI}`);
    expect(i.baris[0]!.simpul[2]!.teks).toBe(`+${(AMBANG_KONEKSI - serentak - admin - cadangan) / poolKode - instance} instance`);
    expect(i.baris[1]!.simpul[0]!.teks).toBe(`L ${id(lRiwayat, 3)}`);
    expect(i.baris[1]!.simpul[0]!.sub).toBe(`${id(puncakRps, 2)} × ${id(wRiwayat, 4)}; semua request dianggap riwayat`);
    expect(i.baris[1]!.simpul[2]!.teks).toBe(`±${Math.round(picuRiwayat / puncakRps)}× puncak`);
    expect(i.sumber.jenis).toBe("asumsi");
    expect(i.catatan).toBe("Dua dari empat pemicu yang berupa angka beban. Keduanya masih di bawah pemicu; kapasitas satu VPS belum diukur di server sungguhan, jadi jarak ini hitungan, bukan bukti.");
    expect(sidikJson(inti)).toBe(SIDIK_DIAGRAM_INTI);
    expect(hitung(badan, "<Rantai data={intiDiagram} ringkas />")).toBe(1);
    expect(nilaiString(inti).join(" ")).not.toMatch(/\bR\d-\d+\b/);
    expect(nilaiString(inti).join(" ")).not.toMatch(/keputusan \d+/i);
  });
  test("tiga halaman istilah (PgBouncer, CDC, Canary): skema valid, sidik nilai, ID riset hanya di field riset dan barisnya ada, rujukan cerita ada, istilah terkait ada di glosarium, baris glosarium sama", () => {
    const sem = baca("situs/data/istilah.md");
    for (const k of ["pgbouncer", "cdc", "canary"]) {
      const d = JSON.parse(baca(`situs/data/halaman-istilah/${k}.json`)) as { istilah: string; stack: unknown; terkait: string[]; cerita: { rujukan: string }[]; sumber: { riset?: string; url?: string }[] };
      HalamanIstilah.parse(d);
      expect(sidikJson(d), `${k}: baca ulang sebelum mengubah sidik`).toBe(SIDIK_ISTILAH[k]);
      expect(d.stack).toBeNull();
      for (const t of d.terkait) expect(glos, `terkait ${t}`).toContain(`| **${t.replace(/ \(.*\)$/, "")}**`);
      for (const c of d.cerita) expect(dari(c.rujukan).ada, c.rujukan).toBe(true);
      for (const s of d.sumber) if (s.riset && s.riset !== "R3-145") expect(barisRiset(s.riset)).toContain("2026-10-27");
      const tampil = JSON.stringify({ ...d, sumber: d.sumber.map((s) => ({ ...s, riset: undefined })) });
      expect(tampil).not.toMatch(/\bR\d-\d+\b/);
      expect(tampil).not.toMatch(/keputusan \d+/i);
    }
    expect(BARIS_GLOSARIUM).toHaveLength(3);
    for (const b of BARIS_GLOSARIUM) expect(glos).toContain(b);
    expect(BARIS_GLOSARIUM.every((b) => b.endsWith("| [[t3-adr-33]] |"))).toBe(true);
    for (const t of ["Canary", "CDC", "PgBouncer"]) expect(sem).toContain(`*[${t}]:`);
    const j = BARIS_GLOSARIUM.join("\n");
    expect(j).toContain("Rilis perubahan ke sebagian kecil lalu lintas lebih dulu, dengan penilaian baik atau buruk sebelum sisanya mendapat versi baru.");
    expect(j).toContain("Cara mengeluarkan perubahan data dengan membaca log transaksi database, sehingga urutannya sama dengan urutan commit.");
    expect(j).toContain("beberapa fitur sesi yang tidak berjalan di mode transaction");
    const pgb = JSON.parse(baca("situs/data/halaman-istilah/pgbouncer.json")) as { cerita: { rujukan: string; teks: string }[]; sumber: { url: string; riset: string }[] };
    expect(pgb.cerita[0]!.teks).toContain("memakai 30 dari 100 koneksi (Hitungan atas Asumsi)");
    expect(pgb.sumber.map((s) => s.url)).toEqual(["https://www.pgbouncer.org/features.html", "https://github.com/jackc/pgx/blob/v5.11.0/conn.go"]);
    const cdc = JSON.parse(baca("situs/data/halaman-istilah/cdc.json")) as { sumber: { url: string; riset: string }[] };
    expect(cdc.sumber.map((s) => s.riset)).toEqual(["R3-247", "R3-145"]);
    expect(barisRiset("R3-145")).toContain("log-based CDC mengeluarkan event menurut urutan COMMIT");
  });
  test("kartu Cek diri: tiga soal bernomor, satu details Jawaban tiap soal; kartu.json memuat soal dan jawaban yang sama; angka jawaban dari hitungan", () => {
    const soal = [...badan.matchAll(/\*\*(\d)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([^\n]+)\n\n<\/details>/g)];
    expect(soal.map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(badan.match(/<details class="success">/g)).toHaveLength(3);
    const mine = kartu.filter((k) => k.halaman === "t3-adr-33");
    expect(mine.map((k) => k.id)).toEqual(["t3-adr-33-1", "t3-adr-33-2", "t3-adr-33-3"]);
    soal.forEach((m, n) => {
      expect(mine[n]!.tanya).toBe(m[2]!.replace(/\[\[t3-cache\]\]/g, "3.19 Cache dan invalidation"));
      expect(mine[n]!.jawab).toBe(m[3]!.replace(/\[\[t3-cache\]\]/g, "3.19 Cache dan invalidation").replace(/\[\[t2-adr-21\]\]/g, "2.31 ADR 21"));
      expect(mine[n]!.judul).toBe("3.30 ADR 33: Sengaja belum dilakukan");
      expect(mine[n]!.url).toBe("tahap-3/sengaja-belum/");
    });
    expect(mine[0]!.jawab).toContain(`instance = (${AMBANG_KONEKSI} − 10) ÷ 10 = 6`);
    expect(mine[1]!.jawab).toContain(`L riwayat yang kecil (${id(lRiwayat, 3)} koneksi) bukan pembedanya: L katalog juga kecil (${id(lKatalog, 3)}), dan cache katalog tetap dipasang.`);
    expect(mine[2]!.jawab).toContain("PostgreSQL tetap di VPS pertama");
  });
});

describe("label sumber, ID tidak tampil, klaim universal, dan struktur halaman", () => {
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil ke pembaca (halaman, diagram, tebak, halaman istilah selain field riset)", () => {
    const tampil = [badan, frontmatter, JSON.stringify(inti), JSON.stringify(tebakMentah)];
    for (const t of tampil) {
      expect(t).not.toMatch(/\bR\d-\d+\b/);
      expect(t).not.toMatch(/keputusan \d+/i);
      expect(t).not.toMatch(/\bPR #?\d+|#\d{3}\b/);
    }
    expect(badan.replace(/\[\[[^\]]+\]\]/g, "")).not.toMatch(/\b[A-G]\d\b(?!\.)/);
  });
  test("label sumber: arti ditaut ke A0; Hitungan memakai label masukan terlemahnya; Rekaman lab hanya untuk rekaman dan kode; penalaran dan Tidak dijalankan pada klaim dokumentasi; Asumsi untuk ambang", () => {
    harus("Arti label Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]]. Hitungan adalah rumus yang ditulis di halaman, dan ia memakai label masukan terlemahnya.");
    expect(baca("situs/src/content/docs/cara-pakai.mdx")).toContain("Label sumber");
    harus("Ambang 70 koneksi dan 100 pesan per detik adalah Asumsi halaman ini.");
    harus("Ambang 5 koneksi adalah Asumsi [[t2-adr-21]], dihitung untuk seluruh API.");
    harus("(Asumsi dari [[t2-adr-21]], separuh satu pool 10; dua instance punya dua pool 10)");
    expect(baca("situs/src/content/docs/tahap-2/sengaja-belum.mdx")).toContain("Pemicunya 5 koneksi tertahan, separuh dari pool 10 (Asumsi, pool yang sama dengan [[t2-estimasi]])");
    expect(baca("situs/src/content/docs/tahap-2/sengaja-belum.mdx")).toContain("5. Sebelum fitur PRD v3 pertama yang menambah λ atau W ditulis, satu load test mengukur kapasitas api-t2 yang sekarang.");
    harus("Lab hanya memutar beban berjadwal di laptop, dan itu bukan kapasitas produksi.");
    harus("Dugaan itu belum punya angka kapasitas, karena kapasitas satu VPS belum diukur di server sungguhan. Lab hanya memutar beban berjadwal di laptop.");
    expect(baca("labs/api-t4/output/beban.txt")).toContain("Dijalankan di laptop lab: bukan kapasitas produksi.");
    expect(hitung(badan, "(penalaran)")).toBe(3);
    expect(hitung(badan, "Tidak dijalankan")).toBe(6);
    expect(hitung(badan, "Rekaman lab")).toBe(5);
    expect(hitung(badan, "Asumsi cerita")).toBe(2);
    expect(hitung(badan, "[perlu verifikasi]")).toBe(0);
  });
  test("klaim universal dan negatif berlingkup: kata 'semua', 'setiap', 'tak satu pun', 'hanya' dihitung per kata; 'belum diukur' selalu bersama lingkup VPS atau server sungguhan", () => {
    const hit = (re: RegExp) => [...badan.matchAll(re)].length;
    expect(hit(/\bsemua\b/gi)).toBe(6);
    expect(hit(/\bsetiap\b/gi)).toBe(2);
    expect(hit(/\btak satu pun\b/gi)).toBe(3);
    expect(hit(/\bselalu\b/gi)).toBe(0);
    expect(hit(/\btidak pernah\b/gi)).toBe(0);
    expect(hit(/\bbelum pernah\b/gi)).toBe(0);
    for (const b of baris(badan)) if (/belum diukur/.test(b)) expect(b, b.slice(0, 80)).toMatch(/VPS|sungguhan|W 20 ms|Waktu pulih|waktu pulih|p95|Satu mesin|ambang/i);
    expect(hitung(badan, "kapasitas satu server")).toBe(1);
    expect(hitung(badan, "kapasitas satu VPS")).toBeGreaterThanOrEqual(2);
  });
  test("tingkat heading dikunci: h2 Inti dan h3 dalam urutan; satu tebakan details; tiga details Jawaban; pre-mortem tepat tiga penyebab; tujuh aturan; empat opsi", () => {
    const hd: [number, string][] = [];
    for (const b of badan.split("\n")) {
      const m = b.match(/^(#{1,6}) (.+)$/);
      if (m) hd.push([m[1]!.length, m[2]!]);
    }
    expect(hd).toEqual([
      [2, "Inti"], [3, "Kenapa ADR ini ada"], [3, "Yang sudah dipasang dan tidak termasuk daftar ini"], [3, "Delapan yang ditunda"], [3, "Cek diri"], [3, "Saat me-review kode AI, cek ini"], [3, "Bacaan lanjut"],
    ]);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details/g)).toHaveLength(4);
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Kapan keputusan ini salah">'));
    expect(badan.indexOf("### Delapan yang ditunda")).toBeLessThan(badan.indexOf('<Blok nama="Yang dipilih dan kenapa">'));
    const pre = badan.slice(badan.indexOf("**Pre-mortem.**"), badan.indexOf('</Blok>', badan.indexOf("**Pre-mortem.**")));
    expect(pre).toContain("**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:");
    expect(pre.match(/^\d\. /gm)).toHaveLength(3);
    const aturan = badan.slice(badan.indexOf("**Keputusan: opsi C.**"), badan.indexOf("**Kenapa C, bukan A.**"));
    expect(aturan).toContain("**Keputusan: opsi C.** Tujuh aturan:");
    expect(aturan.match(/^\d\. /gm)).toHaveLength(7);
    const opsi = baris(badan).find((b) => b.startsWith("| | A. "))!;
    expect(opsi).toBe("| | A. Pasang semuanya | B. VPS lebih besar | C. Tunda dengan pemicu dan alat ukur | D. Pasang satu yang terdekat |");
    for (const k of ["**Kenapa C, bukan A.**", "**Kenapa C, bukan B.**", "**Kenapa C, bukan D.**", "**Kasus industri: Segment, 2018.**", "**Status:**", "**Yang belum diukur.**", "**Yang akan merevisinya.**"]) expect(hitung(badan, k), k).toBe(1);
    expect(badan.indexOf("**Kasus industri")).toBeGreaterThan(badan.indexOf("**Kenapa C, bukan D.**"));
    expect(badan.indexOf("**Pre-mortem.**")).toBeGreaterThan(badan.indexOf("**Kasus industri"));
  });
  test("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const aktual = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const sah = new Set(KALIMAT_TERKUNCI);
    expect(aktual.filter((s) => !sah.has(s))).toEqual([]);
    expect(aktual).toEqual(KALIMAT_TERKUNCI);
  });
  test("bentuk baris badan dikunci (baris kosong, baris isi, dan lekuk)", () => {
    const bentuk = badan.split("\n").map((b) => (b.trim() === "" ? "_" : `${b.length - b.trimStart().length}T`)).join(",");
    expect(sidik(bentuk)).toBe(SIDIK_BENTUK_MDX);
    expect(badan.endsWith("\n")).toBe(true);
    expect(badan.includes("\r")).toBe(false);
    expect(badan.includes("\t")).toBe(false);
  });
  test("front matter dikunci: title dan description (memuat delapan komponen, angka Tahap 3, pemicu, kapasitas belum diukur)", () => {
    expect(frontmatter.trim().split("\n")).toEqual(FRONTMATTER);
    expect(FRONTMATTER[0]).toBe('title: "3.30 ADR 33: Sengaja belum dilakukan"');
    for (const k of ["ADR 33.", "Microservices, Kubernetes dan canary, read replica, PgBouncer, CDC, VPS kedua, cache saldo dan riwayat, dan pembayaran offline", "angka Tahap 3 dan pemicu yang bisa dibaca", "Kapasitas satu VPS belum diukur di server sungguhan."]) expect(FRONTMATTER[1], k).toContain(k);
  });
});
