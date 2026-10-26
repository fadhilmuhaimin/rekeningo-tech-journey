// Penjaga halaman 3.8 (keputusan 1028 sampai 1030): angka, rumus, nomor ADR, ID `[[...]]`, label sumber, versi dokumentasi,
// klaim "tidak ada", rentang Snippet, kode tab stack, diagram Rantai, dan setiap kalimat di connection-pool.mdx harus bisa
// diturunkan dari registry (cerita.json), naskah Tahap 3 (bagian 3, 4, dan peta), rekaman labs/t3-pool (m18, little, adr22),
// rekaman labs/t3-outbox (ganda), kode labs/api-t3 (main.go, push.go), widget pool-little (rekaman.ts), dan baris riset
// R3-135 sampai R3-139. Nilai diturunkan dari sumber di tes ini, bukan dari daftar yang ditulis ulang. Kalimat penulis yang
// tidak bisa diturunkan dikunci utuh di KALIMAT_PENULIS: mengubah satu kata menggagalkan tes, dan itu tanda untuk meninjau
// ulang klaimnya terhadap sumber (pelajaran 3.1 sampai 3.5: penjaga yang hanya memeriksa angka meloloskan kalimat salah).
// Tes hanya membaca berkas yang dilacak git (bukan hasil build atau binari lokal, pelajaran 3.2).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { bacaRekaman, daftarAcuan } from "../widgets/pool-little/rekaman";

const akar = path.resolve(__dirname, "../../..");
const terlacak = new Set(
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: akar, encoding: "utf8", maxBuffer: 1 << 26 }).split("\n").filter(Boolean),
);
const baca = (rel: string): string => {
  if (!terlacak.has(rel)) throw new Error(`${rel} tidak dilacak git: tes tidak boleh membaca hasil build atau berkas lokal`);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};

const HALAMAN = "situs/src/content/docs/tahap-3/connection-pool.mdx";
const mdx = baca(HALAMAN);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const m18Teks = baca("labs/t3-pool/output/m18.txt");
const littleTeks = baca("labs/t3-pool/output/little.txt");
const adr22Teks = baca("labs/t3-pool/output/adr22.txt");
const m18 = m18Teks.split("\n");
const little = littleTeks.split("\n");
const adr22 = adr22Teks.split("\n");
const ganda = baca("labs/t3-outbox/output/ganda.txt").split("\n");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const pushGo = baca("labs/api-t3/internal/push/push.go");
const notifGo = baca("labs/api-t3/internal/service/notif.go");
const goMod = baca("labs/api-t3/go.mod");
const diagramMentah = JSON.parse(baca("situs/data/diagram/t3-pool-inti.json")) as unknown;
const rantai = DataRantai.parse(diagramMentah);
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const widgetJson = JSON.parse(baca("situs/data/widget/t3-pool-little.json")) as {
  pilihNilai: { n: { nilai: number }[]; t: { nilai: number | null }[]; tClient: { nilai: number | null }[] };
};
const R = bacaRekaman(m18Teks, littleTeks, adr22Teks);
const acuan = daftarAcuan(R);

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; lama?: boolean; lebur_ke?: string }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const kata = (n: number): string => ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"][n]!;
// Angka berformat Indonesia: koma desimal, titik ribuan.
const fmt = (x: number, d = 0): string => {
  const [bulat, pecah] = x.toFixed(d).split(".");
  const ribuan = bulat!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return pecah ? `${ribuan},${pecah}` : ribuan;
};
const nomorBaris = (baris: string[], cocok: (b: string) => boolean, dariIdx = 0): number => {
  const i = baris.findIndex((b, n) => n >= dariIdx && cocok(b));
  expect(i, "baris rekaman tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i;
};
const bagian = (baris: string[], huruf: string): string[] => {
  const i = nomorBaris(baris, (b) => b.startsWith(`# --- ${huruf}. `));
  const j = baris.findIndex((b, n) => n > i && b.startsWith("# --- "));
  return baris.slice(i, j < 0 ? undefined : j);
};
const A = bagian(m18, "A");
const B = bagian(m18, "B");
const C = bagian(m18, "C");
const D = bagian(adr22, "D");
const E = bagian(adr22, "E");
const F = bagian(adr22, "F");
const G = bagian(ganda, "D");
const cocok = (baris: string[], pola: RegExp): RegExpMatchArray => {
  const m = baris.map((b) => b.match(pola)).filter((x): x is RegExpMatchArray => x !== null);
  expect(m, `pola ${pola} harus cocok tepat satu kali`).toHaveLength(1);
  return m[0]!;
};

// ---- asumsi dan rumus (registry tahap[2].asumsi dan naskah bagian 3) -------------------------------------------------------
const asumsi = (cerita.tahap[2] as unknown as { asumsi: { user: number; aktif: number; req: number; puncak: number; trx: number } }).asumsi;
const aktif = (asumsi.user * asumsi.aktif) / 100;
const lambda = (aktif * asumsi.trx) / 86400 * asumsi.puncak;
const rpsTotal = (aktif * asumsi.req) / 86400 * asumsi.puncak;
const LAMBDA = fmt(lambda, 3);
const RPS = fmt(rpsTotal, 1);
const W0 = R.beban.w0;
const barisSnippet = (rekaman: string, awal: number, akhir: number) => `${rekaman}:${awal}:${akhir}`;

describe("registry, meta, blok, dan tautan", () => {
  test("3.8 ada, konsep, jalur inti, ADR 22, prasyarat 3.7, lab t3-pool; menit sama dengan baris meta; B2.5 lebur ke sini", () => {
    expect(dari("t3-pool")).toMatchObject({ ada: true, nomor: "3.8", jenis: "konsep", inti: true, adr: [22], prasyarat: ["t3-observability"], lab: ["t3-pool"], tahap: 3 });
    expect(mdx).toContain(`title: "3.8 ${dari("t3-pool").judul}"`);
    expect(dari("t3-pool").judul).toBe("Connection pool, Little's Law, dan timeout + ADR 22");
    expect(naskah).toContain("| 3.8 | 4 | Connection pool, Little's Law, dan timeout + ADR 22 | Konsep + ADR | ★ | t3-pool | W3-pool |");
    expect(mdx.match(/^description: (.+)$/m)![1]).toBe(
      `Pool ${R.a.ukuran} koneksi penuh pada ±${fmt(R.a.hitungan, 1)} detik bila satu panggilan keluar tidak pernah menjawab, bukan karena pembayarannya banyak. ADR 22 menahannya dengan pengaman yang tugasnya berbeda-beda.`,
    );
    const m = badan.match(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-observability\]\] · Jalur inti<\/p>/);
    expect(m, "baris meta").not.toBeNull();
    expect(dari("t3-pool").menit).toBe(Number(m![1]) + Number(m![2]));
    expect(dari("t3-observability").nomor).toBe("3.7");
    const lama = dari("B2.5");
    expect(lama).toMatchObject({ lama: true, lebur_ke: "t3-pool", ada: true });
    expect(glosarium).toContain("| **Connection pool** | Sekumpulan koneksi database yang dibuka sekali lalu dipinjamkan bergantian ke request. | [[t3-pool]] |");
    expect(glosarium).toMatch(/\| \*\*Little's Law\*\* \| [^|]+ \| \[\[t3-pool\]\] \|/);
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    const bacaMenit = Number(badan.match(/Baca (\d+) menit/)![1]);
    expect(Math.abs(jumlah / 200 - bacaMenit), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka; tiga blok pertama punya widget dan tebak sebelum hasil", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect(badan.match(/<PoolLittle \/>/g)).toHaveLength(1);
    expect(badan.indexOf("<PoolLittle />")).toBeGreaterThan(badan.indexOf('<Blok nama="Coba"'));
    expect(badan.indexOf("<PoolLittle />")).toBeLessThan(badan.indexOf('<Blok nama="Paham">'));
    expect(badan).toContain("**Ubah satu hal:**");
    // Widget hanya dipasang di blok Coba; <noscript> ada di komponen PoolLittle.astro (tabel titik acuan).
    expect(baca("situs/src/components/PoolLittle.astro")).toContain("<noscript>");
    expect(widgetJson.pilihNilai.n.map((o) => o.nilai)).toEqual([4, 10, 50]);
  });
  test("tautan [[id]]: himpunan yang diharapkan; nomor dan judul sama dengan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].filter((x) => x !== "berikutnya").sort();
    expect(id).toEqual(["t3-adr-33", "t3-at-least-once", "t3-dua-instance", "t3-dua-tempat", "t3-estimasi", "t3-m18", "t3-observability", "t3-outbox", "t3-prd", "t3-tim-infra"]);
    const peta = [...naskah.matchAll(/^\| (3\.\d+) \| [^|]+ \| ([^|]+) \| [^|]+ \|/gm)].map((m) => [m[1]!, m[2]!.trim()] as const);
    for (const idh of id) {
      const h = dari(idh);
      const p = peta.find((x) => x[0] === h.nomor);
      expect(p, `peta naskah ${h.nomor} untuk ${idh}`).toBeDefined();
      expect(p![1]).toBe(h.judul);
    }
    expect(dari("t3-outbox").adr).toEqual([23]);
    expect(dari("t3-adr-33").adr).toEqual([33]);
  });
});

describe("asumsi, rumus, dan hitungan diturunkan dari registry dan naskah", () => {
  test("masukan beban: 10.000 user, 25% aktif, 60 request, 3 pembayaran, faktor puncak 10; λ 0,868 dan 17,4 request per detik", () => {
    expect(asumsi).toMatchObject({ user: 10000, aktif: 25, req: 60, puncak: 10, trx: 3 });
    expect(LAMBDA).toBe("0,868");
    expect(RPS).toBe("17,4");
    expect(naskah).toContain("Masukan registry: 10.000 user, aktif 25%, 60 request per user aktif, faktor puncak 10.");
    expect(naskah).toContain("Satu nilai dipakai untuk bayar dan transfer: 7.500 ÷ 86.400 × 10 = 0,868 per detik, dibulatkan 0,87.");
    harus(`Masukannya Asumsi naskah: ${fmt(asumsi.user)} user, ${asumsi.aktif}% aktif, ${asumsi.req} request dan ${asumsi.trx} pembayaran atau transfer per user aktif per hari, faktor puncak ${asumsi.puncak}.`);
    harus(`Jadi λ = ${fmt(aktif)} × ${asumsi.trx} ÷ 86.400 × ${asumsi.puncak} = ${LAMBDA} pembayaran per detik.`);
    harus(`Seluruh request datang ${fmt(aktif)} × ${asumsi.req} ÷ 86.400 × ${asumsi.puncak} = ${RPS} per detik.`);
    harus(`Pembayaran masuk ${LAMBDA} per detik (Asumsi naskah;`);
    harus(`Pembayaran pertama menyerah pada 1 ÷ λ + T`);
  });
  test("lab memakai λ 0,87 = 17,4 ÷ 20 (selisih 0,2% dari 0,868); W di luar push 0,02 detik Asumsi naskah, rekaman hanya di bawah 50 ms", () => {
    expect(R.beban).toMatchObject({ lambda: 0.87, rpsTotal: 17.4, tiap: 20, w0: 0.02, batasWMs: 50 });
    expect(R.beban.rpsTotal / R.beban.tiap).toBeCloseTo(R.beban.lambda, 10);
    expect(fmt(((R.beban.lambda - lambda) / lambda) * 100, 1)).toBe("0,2");
    harus(`Widget dan lab memakai ${fmt(R.beban.lambda, 2)}, pembulatan dari ${LAMBDA} dengan selisih 0,2%.`);
    harus(`Pembayaran datang tiap 1 ÷ ${fmt(R.beban.lambda, 2)} detik`);
    expect(naskah).toContain("W 20 ms (Asumsi; lab t3-pool hanya menolak W di atas 50 ms, jadi 20 ms tidak terbukti)");
    harus(`W = ${fmt(W0, 2)} detik (Asumsi ${W0 * 1000} ms; rekaman hanya membuktikan di bawah ${R.beban.batasWMs} ms).`);
    harus(`Jadi seluruh request memegang ${RPS} × ${fmt(W0, 2)} = ${fmt(R.beban.rpsTotal * W0, 2)} koneksi dari ${R.a.ukuran}.`);
    expect(naskah).toContain("0,35 koneksi untuk seluruh request (R3-32)");
    expect(fmt(rpsTotal * W0, 2)).toBe("0,35");
  });
  test("tabel Little: kolom hitungan dari naskah (0,28 / 1,75 / 8,7 / 26,1) cocok dengan 0,868 × (0,02 + t); kolom rekaman dari little.txt dan m18.txt", () => {
    const baris = naskah.match(/L = 0,868 × \(0,02 \+ t\) \| t = 0,3 \/ 2 \/ 10 \/ 30 detik \| ([\d,]+) \/ ([\d,]+) \/ ([\d,]+) \/ ([\d,]+) koneksi/)!;
    const nask = baris.slice(1);
    expect(nask).toEqual(["0,28", "1,75", "8,7", "26,1"]);
    const ts = [0.3, 2, 10, 30];
    ts.forEach((t, i) => {
      const nilai = 0.868 * (W0 + t);
      const desimal = nask[i]!.split(",")[1]!.length;
      expect(Math.abs(nilai - Number(nask[i]!.replace(",", ".")))).toBeLessThan(0.5 * 10 ** -desimal + 1e-9);
    });
    // Rekaman: tiga titik little.txt (L dan koneksi paling banyak) dan baris 30 detik dari ringkasan little.txt.
    const lab = R.little.map((x) => ({ t: x.t, L: x.L, paling: x.paling }));
    expect(lab.map((x) => x.t)).toEqual([0.3, 2, 10]);
    const ringkasan = cocok(little, /^30 +\| (\d+,\d+) +\| 10 \(pool penuh\) +\| tidak muat: 26 pembayaran dalam proses, 10 memegang koneksi \(m18\.txt A\)$/);
    const baris4 = [...lab.map((x) => [fmt(x.t, x.t < 1 ? 1 : 0), fmt(x.L, 3), `paling banyak ${x.paling}`]), ["30", ringkasan[1]!, "10 dari 10; 26 pembayaran dalam proses"]];
    ts.forEach((t, i) => {
      harus(`| ${baris4[i]![0]!.replace(",0", "")} | ${nask[i]} | ${baris4[i]![1]} | ${baris4[i]![2]} |`);
    });
    expect(baris4.map((b) => b[1])).toEqual(["0,278", "1,757", "8,717", "26,117"]);
    harus("| t (detik) | L = 0,868 × (0,02 + t) | Rekaman lab: L dengan λ 0,87 | Rekaman lab: koneksi terukur |");
    // Rata-rata cocok dalam 15% dari hitungan: tiga titik, semuanya "ya".
    const ya = little.filter((b) => /^rata-rata koneksi dalam 15% dari hitungan [\d,]+: ya$/.test(b));
    expect(ya).toHaveLength(3);
    harus(`Rekaman \`little.txt\` menulis rata-rata koneksi cocok dalam 15% dari hitungannya untuk t = ${R.little.map((x) => fmt(x.t, x.t < 1 ? 1 : 0)).join(", ").replace(/, ([^,]+)$/, ", dan $1")}.`);
    // Baris 30 detik: m18.txt A menulisnya bukan ujian L = λ × W.
    expect(A.join("\n")).toContain("tetapi tidak ada yang selesai, jadi angka itu hanya jadwal × waktu (0,87 × 30,4 = 26,4), bukan ujian L = λ × W");
    harus("Bagian itu menulisnya bukan ujian L = λ × W: tidak ada pembayaran yang selesai, jadi 26 hanya jadwal × waktu.");
  });
  test("pool penuh: n ÷ λ = 11,5 dan 57,6; ambang (n − 1) ÷ λ = 10,4; rekaman antara detik ke-11 dan ke-12, ke-57 dan ke-58; widget 11,5 dan 57,5", () => {
    const n = R.a.ukuran;
    const n2 = R.b.ukuran;
    harus(`Untuk n = ${n} hasilnya ${n} ÷ ${LAMBDA} = ${fmt(n / 0.868, 1)} detik, dan untuk n = ${n2} hasilnya ${n2} ÷ ${LAMBDA} = ${fmt(n2 / 0.868, 1)} detik.`);
    expect([fmt(n / 0.868, 1), fmt(n2 / 0.868, 1), fmt((n - 1) / 0.868, 1)]).toEqual(["11,5", "57,6", "10,4"]);
    harus(`bila T lebih dari (${n} − 1) ÷ ${LAMBDA} = ${fmt((n - 1) / 0.868, 1)} detik`);
    harus(`${n} ÷ ${LAMBDA} = ${fmt(n / 0.868, 1)} detik, bila client terus menunggu`);
    harus(`pool ${n2} penuh`.replace("pool 50 penuh", "Pool 50 menunda penuhnya dari 11,5 ke 57,6 detik"));
    // Rekaman A dan B: antara detik ke-{dari} dan ke-{sampai}; hitungan lab dengan λ 0,87.
    expect(cocok(A, /^pool 10 penuh antara detik ke-(\d+) dan ke-(\d+) sejak beban mulai \(hitungan 10 ÷ 0,87 = 11,5\)$/).slice(1)).toEqual(["11", "12"]);
    expect(cocok(B, /^pool 50 penuh antara detik ke-(\d+) dan ke-(\d+) sejak beban mulai \(hitungan 50 ÷ 0,87 = 57,5\)$/).slice(1)).toEqual(["57", "58"]);
    harus(`Rekaman lab mencatat pool penuh antara detik ke-${R.a.dari} dan ke-${R.a.sampai}.`);
    harus(`Rekaman mencatat antara detik ke-${R.a.dari} dan ke-${R.a.sampai} untuk pool ${n}, dan antara detik ke-${R.b.dari} dan ke-${R.b.sampai} untuk pool ${n2} (\`m18.txt\` bagian A dan B).`);
    harus(`pembayaran ke-${n} datang pada ${n} ÷ ${fmt(R.beban.lambda, 2)} = ${fmt(R.a.hitungan, 1)} detik`);
    harus(`lalu lihat penuhnya mundur ke detik ke-${fmt(R.b.hitungan, 1)} tanpa ada yang membaik`);
    // Bentuk L: pool penuh bila L melebihi n − 1 sama dengan W lebih dari (n − 1) ÷ λ.
    harus("Dalam bentuk L: pool penuh bila L melebihi n − 1.");
    for (const [W, pn] of [[10.35, 10], [10.38, 10]] as const) expect(0.868 * W > pn - 1).toBe(W > (pn - 1) / 0.868);
    // Kapan salah: L seluruh request melebihi 9 pada 9 ÷ 0,02 = 450 request per detik, 25,9 kali puncak.
    harus(`yaitu bila L melebihi ${n} − 1 = ${n - 1}. Dengan W ${W0 * 1000} ms (Asumsi), itu terjadi pada ${n - 1} ÷ ${fmt(W0, 2)} = ${fmt((n - 1) / W0)} request per detik, atau ${fmt((n - 1) / W0 / rpsTotal, 1)} kali puncak ${RPS}.`);
    expect(fmt((n - 1) / W0 / R.beban.rpsTotal, 1)).toBe("25,9");
    expect(fmt((n - 1) / W0 / rpsTotal, 1)).toBe("25,9");
  });
  test("koneksi database: 2 × 10 + 4 + 3 + 3 = 30 dari 100; pool 50: 2 × 50 + 4 + 3 + 3 = 110 lebih dari max_connections 100", () => {
    const m = naskah.match(/\| Koneksi database \| instance × pool \+ worker \+ admin \+ reserved \| 2 × 10 \+ (\d+) \+ (\d+) \+ (\d+) \| 30 dari 100 \(R3-35\) \|/)!;
    const [w, admin, reserved] = [Number(m[1]), Number(m[2]), Number(m[3])];
    expect([w, admin, reserved]).toEqual([4, 3, 3]);
    harus(`Worker memakai ${w} koneksi dan koneksi admin ${admin}, keduanya Asumsi naskah.`);
    harus(`Jadi dua instance memakai 2 × ${R.a.ukuran} + ${w} + ${admin} + ${reserved} = ${2 * R.a.ukuran + w + admin + reserved} dari 100 koneksi. Angka ${reserved} yang terakhir adalah slot cadangan superuser.`);
    harus(`${2 * R.a.ukuran + w + admin + reserved} dari 100 koneksi (Asumsi, hitungan di Paham)`);
    harus(`2 × ${R.b.ukuran} + ${w} + ${admin} + ${reserved} = ${2 * R.b.ukuran + w + admin + reserved} koneksi melebihi \`max_connections\` bawaan 100 (Hitungan; worker dan admin Asumsi)`);
    expect(2 * R.b.ukuran + w + admin + reserved).toBeGreaterThan(100);
    expect(riset).toMatch(/\| R3-07 \|[^\n]*max_connections biasanya 100, superuser_reserved_connections 3/);
    expect(riset).toMatch(/\| R3-136 \|[^\n]*max_connections "The default is typically 100 connections"; superuser_reserved_connections "The default value is three connections"/);
    harus("`superuser_reserved_connections` menyisihkan 3 slot di antaranya untuk superuser");
  });
});

describe("naskah: cerita M18, pertanyaan Bayu, dan permintaan PRD", () => {
  test("M18: Jumat 12.20, Raka mengira database lambat dan mengusulkan pool 50; Bayu menetapkan pool 10; Bayu bertanya apakah uang ikut menunggu", () => {
    expect(naskah).toContain("Jumat 12.20, Rekeningo berhenti menjawab selama ±9 menit (Ilustrasi).");
    expect(naskah).toContain("Database lambat; Raka mengusulkan pool dinaikkan dari 10 ke 50");
    expect(naskah).toContain("pool 10 koneksi (Asumsi cerita: batas yang Bayu tetapkan di minggu 1,");
    expect(naskah).toContain("Di minggu 1 Bayu bertanya apakah uang ikut menunggu bila layanan push lambat.");
    expect(naskah).toContain("3. Uang tidak menunggu pihak luar.");
    expect(naskah).toContain("notifikasi saat menerima uang (P0)");
    harus("Jumat 12.20 semua layar app berhenti menjawab (Ilustrasi, [[t3-m18]]).");
    harus("Di [[t3-dua-tempat]], Bayu bertanya apakah uang ikut menunggu bila layanan push lambat.");
    harus("Raka mengira database lambat dan mengusulkan pool 50.");
    harus("batas yang Bayu tetapkan di minggu 1");
    harus("Hal ketiga di [[t3-dua-tempat]] berbunyi uang tidak menunggu pihak luar.");
    harus("PRD v3 meminta pemberitahuan saat menerima uang ([[t3-prd]])");
    expect(dari("t3-notifikasi").nomor).toBe("3.3");
  });
});

describe("rekaman: m18.txt, adr22.txt, little.txt, ganda.txt dan rentang Snippet", () => {
  test("A: sepuluh sesi idle in transaction, 190 pembacaan tanpa jawaban, 26 pembayaran belum dijawab sesudah 30 detik", () => {
    expect(A.join("\n")).toContain("pembayaran ke-10 sampai di layanan push: idle in transaction 10");
    const baca190 = cocok(A, /^# Pembacaan sesudah pool penuh \(request \d+ sampai \d+\): (\d+) pembacaan: tanpa jawaban x(\d+)$/);
    expect(baca190[1]).toBe(baca190[2]);
    const akhir = cocok(A, /^# Sesudah (\d+) detik: (\d+) pembayaran dikirim, (\d+) belum dijawab\. Di layanan push (\d+) permintaan menggantung, jadi (\d+) pembayaran menunggu koneksi di API\.$/);
    expect(akhir.slice(1, 4)).toEqual(["30", "26", "26"]);
    expect(Number(akhir[4]) + Number(akhir[5])).toBe(26);
    // Rantai baris 1: simpul dan sub dari rekaman A.
    expect(rantai.baris[0]!.simpul.map((s) => s.teks)).toEqual([`pool ${R.a.ukuran} penuh`, `${akhir[3]} pembayaran: belum dijawab`, `${baca190[1]} pembacaan: tanpa jawaban`]);
    expect(rantai.baris[0]!.simpul.map((s) => s.sub)).toEqual([`antara detik ke-${R.a.dari} dan ke-${R.a.sampai}`, `sesudah ${akhir[1]} detik`, "sesudah pool penuh"]);
    expect(rantai.baris[0]!.sub).toBe("bagian A dari m18.txt");
    harus("Di rekaman, tiap pembayaran yang menunggu push tampil sebagai satu sesi `idle in transaction` di `pg_stat_activity`, dan pembayaran ke-10 membuat jumlahnya 10:");
    expect(A.join("\n")).toContain("=> SELECT count(*) AS idle_in_transaction FROM pg_stat_activity WHERE application_name = 'api-t3' AND state = 'idle in transaction'");
    // Rentang Snippet dari baris rekaman: sesi idle in transaction sampai pool penuh, lalu pembacaan sampai keadaan 30 detik.
    const a1 = nomorBaris(m18, (b) => b.startsWith("=> SELECT count(*) AS idle_in_transaction"));
    const a2 = nomorBaris(m18, (b) => b.startsWith("pool 10 penuh antara detik ke-"), a1);
    const a3 = nomorBaris(m18, (b) => b.startsWith("# Pembacaan sebelum pool penuh"), a2);
    const a4 = nomorBaris(m18, (b) => b.startsWith("# Sesudah 30 detik: 26 pembayaran dikirim"), a3);
    harus(`<Snippet files={["labs/t3-pool/output/m18.txt:${a1 + 1}:${a2 + 1}", "labs/t3-pool/output/m18.txt:${a3 + 1}:${a4 + 1}"]}`);
    expect([a1 + 1, a2 + 1, a3 + 1, a4 + 1]).toEqual([13, 19, 22, 24]);
  });
  test("C: client menyerah sesudah 5 detik, koneksi terpakai paling banyak 5 dari 10, jurnal 0, 26 permintaan tetap tertahan di layanan push", () => {
    const c = cocok(C, /^koneksi idle in transaction: puncak (\d+) dari (\d+) \(0,87 × (\d+) detik = (\d,\d+), jadi paling banyak (\d+)\)$/);
    expect([c[1], c[2], c[3], c[5]]).toEqual(["5", "10", "5", "5"]);
    expect(R.c).toEqual({ menyerah: 5, puncak: 5, ukuran: 10 });
    expect(C.join("\n")).toMatch(/ jurnal_bayar\n-+\n 0\n\(1 row\)/);
    expect(C.join("\n")).toContain("# Sesudah 30 detik layanan push masih menahan 26 permintaan: handler tidak berhenti walau client pergi (push memakai konteks yang dilepas dari request).");
    harus(`Dengan T = ${R.c.menyerah}, koneksi terpakai paling banyak ${R.c.puncak} dari ${R.c.ukuran}, dan tidak ada jurnal:`);
    harus("jadi 26 permintaan masih tertahan di layanan push walau client sudah pergi (`m18.txt` bagian C)");
    expect(notifGo).toContain("s.push.Kirim(context.WithoutCancel(ctx),");
    // Kalimat penutup m18.txt C menulis ambang 11,5 yang kurang tepat; halaman tidak mengutipnya (ambang benar 10,4, R3-63).
    expect(C.join("\n")).toContain("Pool 10 baru penuh bila client menunggu lebih dari 10 ÷ 0,87 = 11,5 detik.");
    const snip = `<Snippet file="labs/t3-pool/output/m18.txt" lines="${nomorBaris(m18, (b) => b.startsWith("koneksi idle in transaction: puncak 5 dari 10")) + 1}:${nomorBaris(m18, (b) => b.startsWith("# Sesudah 30 detik layanan push masih menahan 26 permintaan")) + 1}"`;
    harus(snip);
    expect(badan).not.toContain("lebih dari 10 ÷ 0,87 = 11,5 detik");
  });
  test("D: timeout push 3 detik di dalam transaction: puncak 3, pembayaran kedua ke warung yang sama selesai sesudah lebih dari 5 detik", () => {
    expect(R.d).toEqual({ timeoutPush: 3, puncak: 3, ukuran: 10, keduaLebihDari: 5 });
    expect(Math.ceil(0.868 * R.d.timeoutPush)).toBe(R.d.puncak);
    harus(`koneksi terpakai paling banyak ${R.d.puncak} dari ${R.a.ukuran}, sesuai ⌈${LAMBDA} × ${R.d.timeoutPush}⌉`);
    harus(`pembayaran kedua ke warung yang sama selesai sesudah lebih dari ${R.d.keduaLebihDari} detik, bukan ${R.d.timeoutPush}`);
    expect(D.join("\n")).toContain("# Satu warung hanya menerima satu pembayaran per 3 detik selama push menggantung, walau pool kosong.");
    harus(`B membuat satu warung hanya menerima satu pembayaran per ${R.d.timeoutPush} detik selama push menggantung, walau pool kosong (\`adr22.txt\` bagian D).`);
    const d1 = nomorBaris(adr22, (b) => b.startsWith("pembayaran request 1 sampai 200: 10 pembayaran"));
    const d2 = nomorBaris(adr22, (b) => b.startsWith("# Satu warung hanya menerima"), d1);
    harus(`<Snippet file="labs/t3-pool/output/adr22.txt" lines="${d1 + 1}:${d2 + 1}"`);
    expect(d2 - d1).toBe(9);
    harus("Timeout 3 detik saja, tanpa memindahkan push keluar dari transaction, menyelamatkan pool tetapi tidak lock.");
  });
  test("E: idle_in_transaction_session_timeout 5 detik: lock ke-1 lepas, lock ke-10 masih terkunci (55P03), pool Go 10 dari 10, 12 pembacaan tanpa jawaban", () => {
    expect(R.e).toEqual({ idleTx: 5, puncakPg: 5, dipakai: 10, maks: 10 });
    expect(E.join("\n")).toContain("lock buku warung pembayaran ke-1: didapat (PostgreSQL sudah melepasnya)");
    expect(E.join("\n")).toContain("lock buku warung pembayaran ke-10: ditolak 55P03 (masih dipegang; baru lepas sesudah 5 detik)");
    expect(E.join("\n")).toContain("Pembacaan request 201 sampai 212: 12 pembacaan: tanpa jawaban x12");
    harus("Di rekaman, lock buku warung pembayaran ke-1 sudah lepas, dan warung pembayaran ke-10 masih terkunci. Pool di proses Go tetap penuh, dan 12 pembacaan tidak dijawab:");
    const e1 = nomorBaris(adr22, (b) => b === "=> SELECT id FROM buku WHERE akun_id = 418 FOR UPDATE NOWAIT   # warung pembayaran ke-1 (putus pada detik ke-6)");
    const e2 = nomorBaris(adr22, (b) => b.startsWith("di Go: pool tetap penuh walau PostgreSQL sudah memutus sesinya."), e1);
    harus(`<Snippet file="labs/t3-pool/output/adr22.txt" lines="${e1 + 1}:${e2 + 1}"`);
    harus(`\`idle_in_transaction_session_timeout\` ${R.e.idleTx} detik dikirim sebagai parameter koneksi API dan worker.`);
    // Kode: parameter koneksi di bukaDB dan bawaan -idle-tx 5 detik.
    expect(mainGo).toContain('cfg.RuntimeParams["idle_in_transaction_session_timeout"] = strconv.FormatInt(idleTx.Milliseconds(), 10)');
    expect(mainGo).toContain('idleTx := flag.Duration("idle-tx", 5*time.Second,');
    expect(mainGo).toContain("db, err := bukaDB(url, *pool, *idleTx, *peran)");
  });
  test("F: push di luar transaction: 26 pembayaran 201, 494 pembacaan 200, transaction terbuka paling banyak 1, 26 baris outbox terkirim sekali", () => {
    expect(R.f).toEqual({ bayar201: 26, terbukaMaks: 1 });
    const r = cocok(F, /^pembacaan request 1 sampai 520: (\d+) pembacaan: 200 x(\d+)$/);
    expect(r[1]).toBe(r[2]);
    expect(F.join("\n")).toContain("layanan push sedang menahan permintaan dari worker: ya; pembayaran tetap selesai dalam milidetik");
    expect(F.join("\n")).toContain("worker: diklaim 26, terkirim 26, dilewati 0, ditunda 0, mati 0");
    expect(F.join("\n")).toContain("push tiruan menerima: 26 pesan, 26 notifikasi berbeda, 0 ganda");
    expect(rantai.baris[1]!.simpul.map((s) => s.teks)).toEqual(["push menahan worker", `${R.f.bayar201} pembayaran: 201`, `${r[1]} pembacaan: 200`]);
    expect(rantai.baris[1]!.simpul[1]!.sub).toBe(`transaction terbuka paling banyak ${R.f.terbukaMaks}`);
    expect(rantai.baris[1]!.sub).toBe("bagian F dari adr22.txt");
    harus(`${R.f.bayar201} pembayaran dijawab 201 dan ${r[1]} pembacaan dijawab 200 selama push menggantung`);
    const f1 = nomorBaris(adr22, (b) => b.startsWith("pembayaran request 1 sampai 520: 26 pembayaran"));
    const f2 = nomorBaris(adr22, (b) => b.startsWith("layanan push sedang menahan permintaan dari worker"), f1);
    const f3 = nomorBaris(adr22, (b) => b.startsWith("$ ./api-t3 -peran worker -sekali -serentak 4 -maks-percobaan 20"), f2);
    const f4 = nomorBaris(adr22, (b) => b.startsWith("push tiruan menerima: 26 pesan"), f3);
    harus(`<Snippet files={["labs/t3-pool/output/adr22.txt:${f1 + 1}:${f2 + 1}", "labs/t3-pool/output/adr22.txt:${f3 + 1}:${f4 + 1}"]}`);
    harus("Layanan push yang menggantung hanya menahan worker:");
  });
  test("little.txt: tiga titik, W di luar push di bawah 50 ms; ganda.txt D: dua perangkat 2 × 3 detik lebih dari klaim 5 detik", () => {
    expect(R.little.map((x) => x.paling)).toEqual([1, 2, 9]);
    expect(little.filter((b) => b.includes("(batas lab; Asumsi naskah 20 ms): ya"))).toHaveLength(3);
    const g = G.join("\n");
    expect(g).toContain("Warung Ani punya dua HP.");
    expect(g).toContain("Worker A memakai klaim bawaan 5 detik.");
    expect(g).toContain("push tiruan menerima: 4 pesan (dua HP, dua worker), 1 notifikasi_id");
    expect(g).toContain("HP kedua melewati batas 3 detik; ia baru selesai di detik ke-6");
    harus("Di worker, dua perangkat yang menggantung memakan 2 × 3 detik, lebih dari klaim 5 detik.");
    expect(2 * R.d.timeoutPush).toBeGreaterThan(5);
    harus("(rekaman `ganda.txt` bagian D di lab t3-outbox, dibahas di [[t3-at-least-once]])");
  });
  test("Snippet jangkar kode: bukaDB (region dan baris 267:268), push.go (BatasBawaan dan Baru)", () => {
    const baris = mainGo.split("\n");
    expect(mainGo).toContain("// --8<-- [start:buka-db]");
    expect(baris[266]).toBe("\tdb.SetMaxOpenConns(pool)");
    expect(baris[267]).toBe("\tdb.SetMaxIdleConns(pool)");
    harus('<Snippet file="labs/api-t3/cmd/api/main.go" lines="267:268" lang="go"');
    expect(badan.match(/region="buka-db"/g)).toHaveLength(1);
    expect(mainGo).toContain('pool := flag.Int("pool", 10,');
    const p = pushGo.split("\n");
    expect(p[17]).toBe("// BatasBawaan: batas waktu satu panggilan ke layanan luar (ADR 22).");
    expect(p[18]).toBe("const BatasBawaan = 3 * time.Second");
    expect(p[36]).toBe("func Baru(url string, batas time.Duration) Klien {");
    expect(p[37]).toBe("\treturn Klien{url: url, http: &http.Client{Timeout: batas}}");
    expect(p[35]).toContain("batas 0 membuat client tanpa batas waktu");
    harus('<Snippet files={["labs/api-t3/internal/push/push.go:18:19", "labs/api-t3/internal/push/push.go:36:39"]}');
    expect(mainGo).toContain('pushBatas := flag.Duration("push-timeout", push.BatasBawaan,');
    expect(mainGo).toContain("w := worker.Baru(r, push.Baru(pushURL, batas),");
    const rentanTx = "svc = svc.DenganRentan(*rentan, push.Baru(*pushURL, *pushBatas))";
    expect(mainGo).toContain(rentanTx);
  });
});

describe("klaim negatif berlingkup dan label sumber", () => {
  const berkasLab = (awalan: (n: string) => boolean): string[] => [...terlacak].filter((f) => f.startsWith("labs/") && awalan(f.split("/")[1]!));
  test("api-t2 tidak memanggil SetMaxOpenConns, api-t3 memanggilnya (lingkup: semua berkas terlacak di labs/api-t2 dan labs/api-t3)", () => {
    const t2 = berkasLab((n) => n === "api-t2").filter((f) => /\.(go|py|md|txt|sql)$/.test(f));
    expect(t2.length).toBeGreaterThan(10);
    expect(t2.filter((f) => baca(f).includes("SetMaxOpenConns"))).toEqual([]);
    const t3 = berkasLab((n) => n === "api-t3").filter((f) => f.endsWith(".go") && baca(f).includes("SetMaxOpenConns("));
    expect(t3).toEqual(["labs/api-t3/cmd/api/main.go"]);
    harus("api-t2 tidak mengaturnya.");
  });
  test("tidak ada circuit breaker di kode lab Tahap 3 (api-t3 dan lab t3-*), selain penyebutan di README sebagai Tidak dijalankan", () => {
    const lingkup = berkasLab((n) => n === "api-t3" || n.startsWith("t3-"));
    expect(lingkup.length).toBeGreaterThan(50);
    const kena = lingkup.filter((f) => !f.endsWith("README.md") && /circuit.?breaker/i.test(baca(f)));
    expect(kena).toEqual([]);
    expect(baca("labs/t3-pool/README.md")).toContain("**Circuit breaker: Tidak dijalankan.** Hanya opsi di ADR 22.");
    harus("C Tidak dijalankan: kode lab Tahap 3 (api-t3 dan lab t3-*) tidak memuat breaker");
    // Lab lama b11-integrasi punya rekaman breaker, tetapi bukan lab Tahap 3 dan tidak dipakai halaman ini.
    expect(badan).not.toContain("b11-integrasi");
  });
  test("Tidak dijalankan atau [perlu verifikasi] untuk C, tab stack lain, dan package http dan dio; label sumber ditautkan ke /cara-pakai/", () => {
    harus("[Label sumber](/cara-pakai/#label-sumber)");
    expect(badan.indexOf("[Label sumber]")).toBeLessThan(badan.indexOf("Rekaman lab mencatat"));
    expect(baca("situs/src/content/docs/cara-pakai.mdx")).toMatch(/^#{2,3} Label sumber/m);
    harus("Apakah package `http` dan `dio` menutup koneksinya saat timeout belum dibaca dan tidak dijalankan [perlu verifikasi].");
    expect(riset).toMatch(/\| R3-94 \|[^\n]*Perilaku package `http` dan `dio`[^\n]*\[perlu verifikasi\]/);
    expect((badan.match(/\*Tidak dijalankan\. Dicek ke/g) ?? []).length).toBe(5);
    expect((badan.match(/\*Dijalankan: api-t3/g) ?? []).length).toBe(1);
    harus("Simulasinya berlabel Ilustrasi, yaitu contoh dan bukan hasil sistem.");
    expect(baca(".claude/skills/gaya-bahasa/SKILL.md")).toContain("Ilustrasi: skenario atau contoh, bukan hasil sistem");
    // Sembilan pengaturan punya rekaman: dihitung dari daftar acuan widget; pool 4 dan push 30 detik tidak punya rekaman.
    expect(acuan).toHaveLength(9);
    harus(`${kata(acuan.length).replace(/^./, (c) => c.toUpperCase())} pengaturan punya Rekaman lab dari t3-pool`);
    const punya = (p: { n: number; t: number | null; tClient: number | null }) => acuan.some((a) => a.param.n === p.n && a.param.t === p.t && a.param.tClient === p.tClient);
    expect(punya({ n: 4, t: null, tClient: null })).toBe(false);
    expect(punya({ n: 10, t: 30, tClient: null })).toBe(false);
    expect(punya({ n: 10, t: null, tClient: 30 })).toBe(false);
    expect(punya({ n: 10, t: null, tClient: 10 })).toBe(false);
    expect(punya({ n: 10, t: null, tClient: 5 })).toBe(true);
    expect(widgetJson.pilihNilai.tClient.map((o) => o.nilai)).toEqual([null, 30, 10, 5]);
    expect(widgetJson.pilihNilai.t.map((o) => o.nilai)).toContain(30);
    harus("Pool 4 dan push 30 detik adalah Hitungan dari rumus: masukannya Asumsi, jadi hasilnya juga Asumsi.");
    harus("Client app yang menyerah sesudah 30 dan 10 detik adalah Asumsi, karena naskah tidak menyebut timeout di app.");
    expect(naskah).toContain("Naskah tidak menyebut timeout app: M18 memakai 30 detik atau tanpa batas (Asumsi)");
  });
  test("ID riset dan ID internal tidak tampil", () => {
    expect(mdx).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b/);
  });
  test("halaman tidak membuka isi halaman 3.9 sampai 3.13 lebih dari arah jawabannya", () => {
    expect(badan).not.toMatch(/SKIP LOCKED|klaim_sampai|FOR UPDATE|dead-letter|backoff/);
  });
});

describe("versi dan sumber dokumentasi", () => {
  test("Go 1.27.3, pgx v5.11.0, PostgreSQL 17 (sama dengan versi rekaman), Dart 3.13.7: versi di halaman sama dengan yang di go.mod, rekaman, dan RISET", () => {
    expect(goMod).toContain("github.com/jackc/pgx/v5 v5.11.0");
    expect(riset).toMatch(/\| R3-135 \|[^\n]*Go 1\.27\.3 pkg\.go\.dev\/database\/sql \(dibuka 2026-10-26\)/);
    expect(riset).toMatch(/\| R3-135 \|[^\n]*pgx v5\.11\.0 pkg\.go\.dev\/github\.com\/jackc\/pgx\/v5\/pgxpool ParseConfig \(dibuka 2026-10-26\): "pool_max_conns: integer greater than 0 \(default is the greater of 4 or runtime\.NumCPU\(\)\)"/);
    expect(riset).toMatch(/\| R3-135 \|[^\n]*A Timeout of zero means no timeout/);
    expect(riset).toMatch(/\| R3-135 \|[^\n]*If n <= 0, then there is no limit on the number of open connections\. The default is 0 \(unlimited\)/);
    expect(riset).toMatch(/\| R3-135 \|[^\n]*If the context is canceled, the sql package will roll back the transaction/);
    harus("([net/http: Client](https://pkg.go.dev/net/http#Client), Go 1.27.3, dibuka 2026-10-26)");
    harus("([Go 1.27.3: SetMaxOpenConns](https://pkg.go.dev/database/sql#DB.SetMaxOpenConns))");
    harus("([Go 1.27.3: DB.BeginTx](https://pkg.go.dev/database/sql#DB.BeginTx))");
    harus("([net/http: Request.Context](https://pkg.go.dev/net/http#Request.Context))");
    harus("([pgx v5.11.0: pgxpool](https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool#ParseConfig))");
    const pg = m18Teks.match(/PostgreSQL (\d+)\.(\d+)/)!;
    expect(pg[1]).toBe("17");
    expect(badan.match(/postgresql\.org\/docs\/(\d+)\//g)!.every((x) => x.includes(`/${pg[1]}/`))).toBe(true);
    for (const [bab, url] of [["50.2", "connect-estab.html"], ["19.3", "runtime-config-connection.html"], ["19.11", "runtime-config-client.html"]] as const) {
      harus(`([PostgreSQL ${pg[1]}.${pg[2]}, bab ${bab}](https://www.postgresql.org/docs/${pg[1]}/${url}`);
    }
    expect(riset).toMatch(/\| R3-136 \|[^\n]*PostgreSQL 17\.11 \(postgresql\.org\/docs\/17, dibuka 2026-10-26\)/);
    expect(riset).toMatch(/\| R3-136 \|[^\n]*Bab 50\.2 connect-estab\.html[^\n]*Bab 19\.3 runtime-config-connection\.html[^\n]*Bab 19\.11 runtime-config-client\.html/);
    expect(riset).toMatch(/\| R3-94 \|[^\n]*Dart 3\.13\.7/);
    harus("([Dart 3.13.7: Future.timeout](https://api.dart.dev/dart-async/Future/timeout.html), dibuka 2026-10-26)");
  });
  test("Little 1961: syarat tiga rata-rata terhingga dan proses stasioner ketat; abstrak tidak menyebut batas atas; DOI sama dengan RISET", () => {
    const riset2 = baca("plan/RISET-TAHAP-2.md");
    expect(riset2).toMatch(/\| R2-35 \|[^\n]*DOI 10\.1287\/opre\.9\.3\.383/);
    expect(riset2).toMatch(/\| R2-205 \|[^\n]*jika tiga rata-rata terhingga, proses stasioner ketat[^\n]*makalah tidak menyebut batas atas jumlah pada satu detik tertentu/);
    harus("(Operations Research 9(3):383-387, 1961; abstrak dari OpenAlex, dibuka 2026-10-26)");
    harus("dengan syarat tiga rata-ratanya terhingga dan prosesnya stasioner ketat");
    harus("Abstrak itu tidak menyebut batas atas untuk satu detik tertentu, jadi L bukan batas.");
    harus("- [J. D. C. Little, A Proof for the Queuing Formula: L = λW](https://doi.org/10.1287/opre.9.3.383) (1961)");
  });
  test("HikariCP wiki: 2.048 ke 96 koneksi, ~100 ms ke ~2 ms, (core × 2) + spindle = 9, 'call it 10', belum ada analisis SSD", () => {
    expect(riset).toMatch(/\| R3-138 \|[^\n]*HikariCP wiki "About Pool Sizing" \(github\.com\/brettwooldridge\/HikariCP\/wiki\/About-Pool-Sizing, dibuka 2026-10-26\)/);
    for (const kutip of ["decreased the response times of the application from ~100ms to ~2ms", "dropping the connections from 2048 down to just 96", "((core_count * 2) + effective_spindle_count)", "Call it 10 as a nice round number", "There hasn't been any analysis so far regarding how well the formula works with SSDs"]) {
      expect(riset, kutip).toContain(kutip);
    }
    expect((4 * 2) + 1).toBe(9);
    harus("Untuk 4 core dan satu disk hasilnya 9, dan wiki menulis \"call it 10\".");
    harus("menurunkan waktu respons dari ±100 ms ke ±2 ms hanya dengan mengecilkan pool");
    harus("video itu mengecilkan koneksi dari 2.048 ke 96");
    harus("([HikariCP: About Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing), dibuka 2026-10-26)");
  });
  test("Fowler dan Val Town: tanggal, penulis, dan fakta dari RISET; batas kasus ditulis", () => {
    expect(riset).toMatch(/\| R3-138 \|[^\n]*Martin Fowler, "CircuitBreaker" \(2014-03-06, martinfowler\.com\/bliki\/CircuitBreaker\.html, dibuka 2026-10-26\)/);
    expect(riset).toContain("the circuit breaker trips, and all further calls to the circuit breaker return with an error, without the protected call being made at all");
    harus("([Fowler, 2014](https://martinfowler.com/bliki/CircuitBreaker.html))");
    expect(riset).toMatch(/- R3-137 [^\n]*Val Town, Max McDonnell, "Post-mortem: Exhausted Host Connection Pool" \(2024-12-31, blog\.val\.town, dibuka 2026-10-26\)/);
    for (const kutip of ["permanently", "most requests stalled indefinitely in a pending state", "pukul 07.04 ET", "kejadian mulai 12.15 ET", "timeouts to pool queries", "Batas: satu layanan, pemicu deadlock di database, bukan panggilan ke layanan luar"]) {
      expect(riset, kutip).toContain(kutip);
    }
    harus("Max McDonnell menulis post-mortem Val Town tertanggal 2024-12-31");
    harus("([Val Town, Post-mortem: Exhausted Host Connection Pool](https://blog.val.town/blog/post-mortem-exhausted-host-connection-pool), dibuka 2026-10-26)");
    harus("Server itu baru dimatikan manual pukul 07.04 ET sesudah laporan user.");
    harus("Batasnya: satu layanan, dan pemicunya deadlock di database, bukan layanan luar, tetapi mekanismenya sama: slot yang ditahan tanpa batas waktu.");
  });
  test("tab stack lain: versi, tanggal, dan kutipan dokumentasi sama dengan baris riset; kode tab dipatok utuh", () => {
    expect(riset).toMatch(/\| R3-139 \|[^\n]*node-postgres\.com\/apis\/pool dan \/features\/pooling \(dibuka 2026-10-26; pg 8\.23\.1, npm, rilis 2026-09-30\)/);
    expect(riset).toMatch(/\| R3-139 \|[^\n]*Django 6\.1 ref\/databases \(Django 6\.1\.2, PyPI 2026-10-06\)/);
    expect(riset).toMatch(/\| R3-139 \|[^\n]*laravel\/framework v13\.38\.0, Packagist 2026-10-20/);
    expect(riset).toMatch(/\| R3-139 \|[^\n]*Serverpod docs 4\.0\.0 \(serverpod 4\.0\.4, pub\.dev 2026-10-06\)/);
    for (const kutip of ["By default this is set to 10", "requests will wait in a FIFO queue until a client becomes available", "By default this is 0 which means no timeout", "will wait forever", "Connection pooling is supported only with psycopg and requires psycopg[pool]", "a maximum of 10 connections", "Transaction mode does not support prepared statements", "Pool size sets how many connections a pooler is allowed to open to Postgres"]) {
      expect(riset, kutip).toContain(kutip);
    }
    harus("*Tidak dijalankan. Dicek ke [node-postgres: Pool](https://node-postgres.com/apis/pool) dan [Pooling](https://node-postgres.com/features/pooling), `pg` 8.23.1 (npm, rilis 2026-09-30).*");
    harus("*Tidak dijalankan. Dicek ke [Laravel 13.x: Database](https://laravel.com/docs/13.x/database), `laravel/framework` 13.38.0.*");
    harus("*Tidak dijalankan. Dicek ke [Django 6.1: Databases](https://docs.djangoproject.com/en/6.1/ref/databases/#connection-pool), Django 6.1.2.*");
    harus("*Tidak dijalankan. Dicek ke [Serverpod 4.0: Database connection](https://docs.serverpod.dev/concepts/data-and-the-database/database/connection), Serverpod 4.0.4 (halaman bertanda 4.0.0).*");
    harus("*Tidak dijalankan. Dicek ke [Supabase: Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres) dan [Connection pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits), dokumen tanpa nomor versi.*");
    // Kode tab: potongan inline diambil dari halaman lalu dipatok utuh.
    const kode = [...badan.matchAll(/<Snippet lang="(\w+)" code=\{`([^`]*)`\} \/>/g)].map((m) => [m[1], m[2]]);
    expect(kode).toEqual([
      ["js", 'import pg from "pg";\n\nconst pool = new pg.Pool({ max: 10 });'],
      ["python", 'DATABASES = {\n    "default": {\n        "ENGINE": "django.db.backends.postgresql",\n        "OPTIONS": {"pool": True},\n    },\n}'],
      ["yaml", "# config/production.yaml (potongan)\ndatabase:\n  maxConnectionCount: 10"],
    ]);
    // Angka pada tab sama dengan bawaan dokumentasi (10) dan dengan pool api-t3 (10).
    expect(String(R.a.ukuran)).toBe("10");
  });
});

describe("ADR 22: opsi, aturan, diagram, dan kalimat", () => {
  test("ADR 22 di naskah: empat bagian keputusan, tiga opsi yang ditolak, dan kapan salah; halaman memuat sama", () => {
    const baris = naskah.split("\n").find((b) => b.startsWith("| 22 | Panggilan keluar tidak di dalam transaction;"))!;
    expect(baris).toBeDefined();
    expect(baris).toContain("timeout 3 detik di setiap client; `idle_in_transaction_session_timeout` 5 detik; pool tetap 10");
    expect(baris).toContain("Pool 50 (menunda ke ±57,6 detik, m18.txt B)");
    expect(baris).toContain("timeout tetapi tetap di dalam transaction");
    expect(baris).toContain("circuit breaker (Tidak dijalankan)");
    expect(baris).toContain("Bila panggilan luar harus atomik dengan uang, mis. otorisasi kartu di Tahap 4");
    harus("### ADR 22: panggilan keluar di luar transaction, timeout 3 detik, pool tetap 10");
    harus("| | A. Pool 50 | B. Timeout 3 detik, tetap di dalam transaction | C. Circuit breaker | D. Di luar transaction + timeout + idle timeout |");
    harus("**Keputusan: opsi D.** Empat aturan, dan tiap aturan punya tugas sendiri:");
    harus("Pertama, bila panggilan luar harus atomik dengan uang, mis. otorisasi kartu di Tahap 4.");
    harus("**Status:** diterima di minggu 3 Tahap 3, sesudah M18.");
    expect(dari("t3-pool").adr).toEqual([22]);
    expect(naskah).toContain("| M18 | 3 |");
    expect(naskah).toContain("ADR 22: panggilan keluar tidak pernah di dalam transaction; setiap client punya timeout 3 detik; pool tidak dinaikkan (pool 50 hanya menunda ke ±58 detik)");
    // Pre-mortem tepat tiga penyebab, empat aturan.
    const pre = badan.split("**Pre-mortem.**")[1]!.split("**Kapan keputusan ini salah.**")[0]!;
    expect([...pre.matchAll(/^\d\. /gm)]).toHaveLength(3);
    const aturan = badan.split("**Keputusan: opsi D.**")[1]!.split("**Kenapa D, bukan B.**")[0]!;
    expect([...aturan.matchAll(/^\d\. /gm)]).toHaveLength(4);
    expect(["A. Pool 50", "B. Timeout", "C. Circuit breaker", "D. Di luar"].every((o) => badan.includes(`| ${o}`) || badan.includes(` ${o}`))).toBe(true);
    for (const baris of ["| Cara kerja |", "| Kelebihan |", "| Kekurangan |", "| Biaya operasional |", "| Bukti |"]) harus(baris);
  });
  test("Rantai Inti: judul, sumber, label, nada, dan catatan dikunci; teks simpul diturunkan dari rekaman di atas", () => {
    expect(rantai.id).toBe("t3-pool-inti");
    expect(rantai.judul).toBe("Push tanpa jawaban, di dalam dan di luar transaction");
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-pool, m18.txt bagian A dan adr22.txt bagian F" });
    expect(rantai.baris.map((b) => [b.label, b.sub])).toEqual([["Push di dalam transaction", "bagian A dari m18.txt"], ["Push di luar transaction", "bagian F dari adr22.txt"]]);
    expect(rantai.baris.map((b) => b.simpul.map((s) => s.nada))).toEqual([["warn", "warn", "warn"], ["biasa", "good", "good"]]);
    expect(rantai.baris[1]!.simpul.map((s) => s.sub)).toEqual(["bukan pembayaran", `transaction terbuka paling banyak ${R.f.terbukaMaks}`, "jadwal beban sama"]);
    expect(rantai.catatan).toBe(`Kotak oranye adalah akibat yang direkam. Kedua baris memakai layanan push tiruan lokal yang tidak pernah menjawab dan beban ${RPS} request per detik.`);
    expect(F.join("\n")).toContain("# Beban dengan jadwal tetap, bukan acak: 17,4 request per detik");
    harus('<Rantai data={intiDiagram} ringkas />');
    expect(badan.indexOf("<Rantai")).toBeGreaterThan(badan.indexOf("## Inti"));
    expect(badan.indexOf("<Rantai")).toBeLessThan(badan.indexOf("Connection pool adalah sekumpulan koneksi"));
  });
  test("pre-mortem 3: alert request yang menunggu koneksi ada di naskah on-call, dan /healthz api-t3 memakai koneksi database (PingContext)", () => {
    expect(naskah).toContain("request yang menunggu koneksi");
    const hz = mainGo.split('rute.HandleFunc("GET /healthz"')[1]!.split("})")[0]!;
    expect(hz).toContain("db.PingContext(ctx)");
    expect(hz).toContain("context.WithTimeout(req.Context(), time.Second)");
    harus("Pencegahannya alert untuk request yang menunggu koneksi ([[t3-tim-infra]]) dan health check yang memakai koneksi database ([[t3-dua-instance]]).");
  });
  test("Cek diri: empat kartu; hitungan kartu 2 dan 3 dari rumus dan rekaman; kode kartu 1 memakai http.Post tanpa client sendiri", () => {
    const cek = badan.split("### Cek diri")[1]!.split("### Saat me-review")[0]!;
    expect([...cek.matchAll(/^\*\*(\d)\.\*\*/gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
    harus(`L = ${LAMBDA} × (${fmt(W0, 2)} + 2) = ${fmt(0.868 * (W0 + 2), 2)} koneksi, jauh di bawah ${R.a.ukuran}.`);
    harus(`Rekaman \`little.txt\` mencatat koneksi terukur paling banyak ${R.little[1]!.paling}, dan rata-ratanya cocok dalam 15% dengan hitungannya.`);
    harus(`Pada ${R.b.ukuran} ÷ ${LAMBDA} = ${fmt(R.b.ukuran / 0.868, 1)} detik, bukan ${fmt(R.a.ukuran / 0.868, 1)}.`.replace("Pada 50", "Pada 50"));
    harus(`Di \`adr22.txt\` bagian E, pool Go terpakai ${R.e.dipakai} dari ${R.e.maks} dan 12 pembacaan tidak dijawab`);
    harus("`http.Post` memakai `http.DefaultClient`, yang `Timeout`-nya nol");
    expect(riset).toMatch(/\| R3-115 \|[^\n]*`http\.DefaultClient` adalah `&Client\{\}`/);
    expect(riset).toMatch(/\| R3-135 \|[^\n]*Post is a wrapper around DefaultClient\.Post/);
    harus("http.Post(pushURL, \"application/json\", body)");
  });
});

// ---- setiap kalimat di halaman punya asal ---------------------------------------------------------------------------------
function satuan(b: string): string[] {
  const hasil: string[] = [];
  let dalamKode = false;
  let dalamSnippet = false;
  for (const mentah of b.split("\n")) {
    const l = mentah.trim();
    if (l.startsWith("```")) { dalamKode = !dalamKode; continue; }
    if (dalamKode) continue;
    if (dalamSnippet) { if (l.includes("`} />")) dalamSnippet = false; continue; }
    if (l.startsWith("<Snippet")) { if (l.includes("code={`") && !l.includes("`} />")) dalamSnippet = true; continue; }
    if (!l || l.startsWith("import ") || l.startsWith("<Rantai") || l.startsWith("<PoolLittle") || l.startsWith("<p class=\"meta\"")) continue;
    if (l.startsWith("</") || l.startsWith("<details") || l.startsWith("<summary>") || l.startsWith("<TabSet") || l.startsWith("<Fragment") || /^\|[-| ]+\|$/.test(l)) continue;
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
  test("tidak ada kalimat yang tidak dikunci", () => {
    const tanpaAsal = satuan(badan).filter((s) => !KALIMAT_PENULIS.includes(s));
    expect(tanpaAsal).toEqual([]);
  });
  test("tidak ada entri terkunci yang sudah hilang dari halaman", () => {
    const ada = new Set(satuan(badan));
    expect(KALIMAT_PENULIS.filter((s) => !ada.has(s))).toEqual([]);
  });
});

// Kalimat halaman yang ditulis penulis, dikunci utuh. Angka di dalamnya diperiksa terpisah di atas terhadap sumbernya.
const KALIMAT_PENULIS: string[] = [
  "Inti",
  "Pool habis karena lamanya satu panggilan, bukan karena banyaknya pembayaran.",
  "Connection pool adalah sekumpulan koneksi database yang dibuka sekali lalu dipinjamkan bergantian ke request. Pool api-t3 berisi 10 koneksi, dan satu pembayaran yang menunggu layanan push memegang satu koneksi selama ia menunggu. Versi pertama memanggil layanan push di dalam transaction, dengan client Go yang tidak punya batas waktu. Dokumentasi Go menulis bahwa `Timeout` nol berarti tanpa batas ([net/http: Client](https://pkg.go.dev/net/http#Client), Go 1.27.3, dibuka 2026-10-26).",
  "Pembayaran masuk 0,868 per detik (Asumsi naskah; arti label ada di [Label sumber](/cara-pakai/#label-sumber)). Pembayaran ke-10 mengambil koneksi terakhir pada 10 ÷ 0,868 = 11,5 detik, bila client terus menunggu. Sesudah itu pembacaan saldo ikut menunggu, karena tiap request butuh satu koneksi bebas. Rekaman lab mencatat pool penuh antara detik ke-11 dan ke-12.",
  "Pembayaran hanya 0,868 per detik dan pool punya 10 koneksi. Kenapa pool bisa penuh dalam ±11,5 detik?",
  "Raka mengusulkan pool 50. Kapan pool itu penuh, dan apa yang tidak berubah?",
  "Client app menyerah sesudah 5 detik. Kenapa pool tidak penuh, tetapi layanan push tetap menahan permintaan?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "Kalau berhenti di sini, kamu sudah tahu: pool 10 penuh pada n ÷ λ detik bila push tidak pernah menjawab, dan pool 50 hanya menundanya.",
  "Widget ini menjalankan simulasi satu pool. Pembayaran datang tiap 1 ÷ 0,87 detik, tiap pembayaran memegang satu koneksi sampai push menjawab atau client menyerah, dan antreannya FIFO. Tebak dulu kapan pool 10 penuh, lalu ubah satu hal.",
  "Simulasinya berlabel Ilustrasi, yaitu contoh dan bukan hasil sistem. Sembilan pengaturan punya Rekaman lab dari t3-pool dan ditandai \"Cocok dengan Rekaman lab\". Pool 4 dan push 30 detik adalah Hitungan dari rumus: masukannya Asumsi, jadi hasilnya juga Asumsi.",
  "Client app yang menyerah sesudah 30 dan 10 detik adalah Asumsi, karena naskah tidak menyebut timeout di app. Widget dan lab memakai 0,87, pembulatan dari 0,868 dengan selisih 0,2%.",
  "Pada pengaturan awal, jawabannya sekitar detik ke-12: pembayaran ke-10 datang pada 10 ÷ 0,87 = 11,5 detik dan mengambil koneksi terakhir. Dari sana pembayaran dan pembacaan saldo menunggu, dan batang koneksi terpakai mendatar di 10.",
  "**Ubah satu hal:** pilih pool 50, lalu lihat penuhnya mundur ke detik ke-57,5 tanpa ada yang membaik. Pilih client app yang menyerah sesudah 5 detik, dan pool tidak pernah penuh. Pilih push di luar transaction, dan transaction terbuka paling banyak satu.",
  "Kenapa ini ada",
  "Jumat 12.20 semua layar app berhenti menjawab (Ilustrasi, [[t3-m18]]). Di [[t3-dua-tempat]], Bayu bertanya apakah uang ikut menunggu bila layanan push lambat. Jawabannya ya, selama push dipanggil di dalam transaction.",
  "Raka mengira database lambat dan mengusulkan pool 50. Halaman ini menjelaskan apa pool itu, kenapa lamanya panggilan yang menghabiskannya, dan apa yang diputuskan ADR 22.",
  "Cara kerjanya",
  "**Pool meminjamkan koneksi.** PostgreSQL melayani tiap koneksi client dengan satu proses backend, dan postmaster membuat proses baru setiap ada permintaan koneksi ([PostgreSQL 17.11, bab 50.2](https://www.postgresql.org/docs/17/connect-estab.html), dibuka 2026-10-26). Jumlah koneksi dibatasi `max_connections`, yang bawaannya biasanya 100 koneksi, dan `superuser_reserved_connections` menyisihkan 3 slot di antaranya untuk superuser ([PostgreSQL 17.11, bab 19.3](https://www.postgresql.org/docs/17/runtime-config-connection.html)). Pool menyimpan sejumlah koneksi lalu meminjamkannya ke request.",
  "Transaction memegang satu pinjaman dari `BEGIN` sampai `COMMIT` atau `ROLLBACK`. Selama itu koneksinya tidak bisa dipakai request lain. Di rekaman, tiap pembayaran yang menunggu push tampil sebagai satu sesi `idle in transaction` di `pg_stat_activity`, dan pembayaran ke-10 membuat jumlahnya 10:",
  "**Ukuran pool ditulis sendiri.** `database/sql` di Go punya batas nol bawaan, dan nol berarti tanpa batas ([Go 1.27.3: SetMaxOpenConns](https://pkg.go.dev/database/sql#DB.SetMaxOpenConns)). api-t2 tidak mengaturnya. api-t3 menulis batasnya:",
  "Bila memakai pgxpool langsung, batasnya `pool_max_conns`, dengan bawaan yang lebih besar antara 4 dan jumlah core ([pgx v5.11.0: pgxpool](https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool#ParseConfig)). Angka 10 di api-t3 adalah Asumsi naskah: batas yang Bayu tetapkan di minggu 1.",
  "Worker memakai 4 koneksi dan koneksi admin 3, keduanya Asumsi naskah. Jadi dua instance memakai 2 × 10 + 4 + 3 + 3 = 30 dari 100 koneksi. Angka 3 yang terakhir adalah slot cadangan superuser.",
  "Wiki HikariCP memberi titik awal ((jumlah core × 2) + spindle efektif). Untuk 4 core dan satu disk hasilnya 9, dan wiki menulis \"call it 10\". Penulisnya juga menulis bahwa belum ada analisis untuk SSD dan meminta angkanya diuji dengan beban ([HikariCP: About Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing), dibuka 2026-10-26). Itu titik awal, bukan hukum.",
  "**Little's Law menghitung koneksi yang terpegang.** Rumusnya L = λ × W. λ adalah laju kedatangan, W lama satu pembayaran memegang koneksi, dan L jumlah koneksi yang terpegang pada rata-rata. J. D. C. Little membuktikannya untuk rata-rata, dengan syarat tiga rata-ratanya terhingga dan prosesnya stasioner ketat (Operations Research 9(3):383-387, 1961; abstrak dari OpenAlex, dibuka 2026-10-26). Abstrak itu tidak menyebut batas atas untuk satu detik tertentu, jadi L bukan batas.",
  "Masukannya Asumsi naskah: 10.000 user, 25% aktif, 60 request dan 3 pembayaran atau transfer per user aktif per hari, faktor puncak 10. Jadi λ = 2.500 × 3 ÷ 86.400 × 10 = 0,868 pembayaran per detik. Seluruh request datang 2.500 × 60 ÷ 86.400 × 10 = 17,4 per detik.",
  "Tanpa panggilan keluar, W = 0,02 detik (Asumsi 20 ms; rekaman hanya membuktikan di bawah 50 ms). Jadi seluruh request memegang 17,4 × 0,02 = 0,35 koneksi dari 10. Dengan push yang menjawab sesudah t detik, W = 0,02 + t:",
  "t (detik)",
  "L = 0,868 × (0,02 + t)",
  "Rekaman lab: L dengan λ 0,87",
  "Rekaman lab: koneksi terukur",
  "0,3",
  "0,28",
  "0,278",
  "paling banyak 1",
  "2",
  "1,75",
  "1,757",
  "paling banyak 2",
  "10",
  "8,7",
  "8,717",
  "paling banyak 9",
  "30",
  "26,1",
  "26,117",
  "10 dari 10; 26 pembayaran dalam proses",
  "Rekaman `little.txt` menulis rata-rata koneksi cocok dalam 15% dari hitungannya untuk t = 0,3, 2, dan 10. Baris 30 detik ada di ringkasan `little.txt` dan berasal dari `m18.txt` bagian A. Bagian itu menulisnya bukan ujian L = λ × W: tidak ada pembayaran yang selesai, jadi 26 hanya jadwal × waktu.",
  "**Kapan pool penuh.** Pool n koneksi penuh bila pembayaran ke-n tiba selagi n − 1 pembayaran sebelumnya masih memegang koneksi. Bila push tidak pernah menjawab dan client terus menunggu, itu terjadi pada n ÷ λ. Dalam bentuk L: pool penuh bila L melebihi n − 1.",
  "Untuk n = 10 hasilnya 10 ÷ 0,868 = 11,5 detik, dan untuk n = 50 hasilnya 50 ÷ 0,868 = 57,6 detik. Rekaman mencatat antara detik ke-11 dan ke-12 untuk pool 10, dan antara detik ke-57 dan ke-58 untuk pool 50 (`m18.txt` bagian A dan B).",
  "Client yang menyerah sesudah T detik melepas koneksinya, karena `BeginTx` membatalkan transaction saat konteksnya dibatalkan ([Go 1.27.3: DB.BeginTx](https://pkg.go.dev/database/sql#DB.BeginTx)). Pembayaran pertama menyerah pada 1 ÷ λ + T, sedangkan pembayaran ke-10 tiba pada 10 ÷ λ. Pool penuh hanya bila pembayaran pertama belum menyerah saat itu, yaitu bila T lebih dari (10 − 1) ÷ 0,868 = 10,4 detik. Dengan T = 5, koneksi terpakai paling banyak 5 dari 10, dan tidak ada jurnal:",
  "Lab menjadwalkan kedatangan dengan jarak tetap. Kedatangan acak bisa mengisi pool lebih awal, karena kedatangan bisa menggerombol. Itu penalaran dan Tidak dijalankan, jadi hitungan di halaman ini berlaku untuk jadwal tetap.",
  "**Satu tugas untuk tiap timeout.** Layanan push yang tidak menjawab bisa ditangani di empat tempat, dan tiap tempat melindungi hal yang berbeda.",
  "**Timeout client HTTP.** `http.Client.Timeout` membatasi satu panggilan keluar, termasuk waktu menyambung dan membaca body, dan nol berarti tanpa batas (Go 1.27.3). Client push api-t3 memakai 3 detik:",
  "**Konteks request.** Untuk request masuk, Go membatalkan konteksnya saat koneksi client tertutup atau handler kembali ([net/http: Request.Context](https://pkg.go.dev/net/http#Request.Context)). Handler lab memanggil push dengan konteks yang dilepas dari request, jadi 26 permintaan masih tertahan di layanan push walau client sudah pergi (`m18.txt` bagian C).",
  "**`idle_in_transaction_session_timeout`.** PostgreSQL memutus sesi yang diam di dalam transaction terbuka lebih lama dari batas ini, supaya sesi diam tidak menahan lock ([PostgreSQL 17.11, bab 19.11](https://www.postgresql.org/docs/17/runtime-config-client.html)). Di rekaman, lock buku warung pembayaran ke-1 sudah lepas, dan warung pembayaran ke-10 masih terkunci. Pool di proses Go tetap penuh, dan 12 pembacaan tidak dijawab:",
  "**Timeout di app Flutter.** Dokumentasi `Future.timeout` menulis bahwa future sumbernya masih bisa selesai normal sesudah batas waktu ([Dart 3.13.7: Future.timeout](https://api.dart.dev/dart-async/Future/timeout.html), dibuka 2026-10-26). Apakah package `http` dan `dio` menutup koneksinya saat timeout belum dibaca dan tidak dijalankan [perlu verifikasi]. Naskah juga tidak menyebut timeout di app, jadi 30 dan 10 detik di widget adalah Asumsi.",
  "Timeout 3 detik saja, tanpa memindahkan push keluar dari transaction, menyelamatkan pool tetapi tidak lock. Di rekaman pembayaran kedua ke warung yang sama selesai sesudah lebih dari 5 detik, karena ia menunggu lock buku selama yang pertama menunggu push:",
  "Jawabannya adalah menaruh push di luar transaction. Pembayaran menulis jurnal, posting, dan satu baris `outbox`, lalu worker mengirim push ([[t3-outbox]]). Layanan push yang menggantung hanya menahan worker:",
  "Di stack lain",
  "**Skenario:** batas jumlah koneksi pool dan apa yang terjadi bila pool habis. Tab Go adalah kode lab, dan rekamannya ada di atas. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-10-26.",
  "Yang sama di semua stack: koneksi yang tidak kembali ke pool membuat request berikutnya menunggu. Yang berbeda adalah ada tidaknya batas bawaan, dan ada tidaknya timeout untuk menunggu.",
  "*Dijalankan: api-t3 dengan `database/sql` dan driver pgx, PostgreSQL 17.11 (rekaman `m18.txt` bagian A dan B).*",
  "**Yang berbeda di stack ini:** `database/sql` tidak membatasi koneksi bila `SetMaxOpenConns` tidak dipanggil. Pengaturan pool di `DB` hanya `SetMaxOpenConns`, `SetMaxIdleConns`, `SetConnMaxLifetime`, dan `SetConnMaxIdleTime`, jadi tidak ada pengaturan batas waktu menunggu koneksi di antaranya.",
  "*Tidak dijalankan. Dicek ke [node-postgres: Pool](https://node-postgres.com/apis/pool) dan [Pooling](https://node-postgres.com/features/pooling), `pg` 8.23.1 (npm, rilis 2026-09-30).*",
  "**Yang berbeda di stack ini:** `max` bernilai 10 bila tidak ditulis. Bila semua client terpinjam, request menunggu di queue FIFO sampai ada yang dikembalikan. Dokumentasi menulis bahwa client yang tidak dilepas membuat permintaan berikutnya menunggu selamanya. `connectionTimeoutMillis` bernilai 0 bila tidak ditulis, yaitu tanpa timeout. Dokumentasinya menjelaskan opsi itu untuk menyambung client baru dan tidak menyebut menunggu giliran di queue.",
  "*Tidak dijalankan. Dicek ke [Laravel 13.x: Database](https://laravel.com/docs/13.x/database), `laravel/framework` 13.38.0.*",
  "**Yang berbeda di stack ini:** halaman Database: Getting Started tidak membahas pool di dalam framework. Bagiannya tentang koneksi PostgreSQL ber-pool membahas pooler di luar aplikasi, seperti PgBouncer, dan memakai koneksi langsung untuk migration. Kata \"timeout\" tidak ada di halaman itu, jadi batas waktu menunggu koneksi tidak diatur di sana.",
  "*Tidak dijalankan. Dicek ke [Django 6.1: Databases](https://docs.djangoproject.com/en/6.1/ref/databases/#connection-pool), Django 6.1.2.*",
  "**Yang berbeda di stack ini:** pool tidak aktif dengan sendirinya. `OPTIONS` berisi `pool` bernilai `True` atau kamus opsi untuk `ConnectionPool`. Itu hanya didukung psycopg dengan `psycopg[pool]`, dan `CONN_MAX_AGE` harus 0 selama pool aktif. Nama dan nilai ukuran pool ada di dokumentasi psycopg_pool, bukan di halaman Django.",
  "*Tidak dijalankan. Dicek ke [Serverpod 4.0: Database connection](https://docs.serverpod.dev/concepts/data-and-the-database/database/connection), Serverpod 4.0.4 (halaman bertanda 4.0.0).*",
  "**Yang berbeda di stack ini:** Serverpod memakai pool dengan maksimum 10 koneksi bila `maxConnectionCount` tidak ditulis. Nilai 0 atau negatif berarti tanpa batas, dan variabel lingkungan `SERVERPOD_DATABASE_MAX_CONNECTION_COUNT` mengaturnya juga. Dokumentasi yang dibuka tidak menyebut batas waktu menunggu koneksi.",
  "*Tidak dijalankan. Dicek ke [Supabase: Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres) dan [Connection pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits), dokumen tanpa nomor versi.*",
  "**Yang berbeda di stack ini:** pool ada di pooler di luar aplikasi, bukan di kode kamu. Dokumentasi menulis bahwa pool size menentukan berapa koneksi yang boleh dibuka pooler ke Postgres. Mode transaction tidak mendukung prepared statement, jadi library koneksinya harus mematikannya.",
  "ADR 22: panggilan keluar di luar transaction, timeout 3 detik, pool tetap 10",
  "**Kebutuhan.** Di [[t3-m18]], layanan push berhenti menjawab dan seluruh app membeku, padahal pembayaran hanya 0,868 per detik. Hal ketiga di [[t3-dua-tempat]] berbunyi uang tidak menunggu pihak luar. PRD v3 meminta pemberitahuan saat menerima uang ([[t3-prd]]), dan pemberitahuan itu tidak boleh membuat pembayaran dan pembacaan saldo berhenti.",
  "**Status:** diterima di minggu 3 Tahap 3, sesudah M18. Berlaku untuk setiap panggilan ke layanan di luar PostgreSQL dari jalur uang.",
  "",
  "A. Pool 50",
  "B. Timeout 3 detik, tetap di dalam transaction",
  "C. Circuit breaker",
  "D. Di luar transaction + timeout + idle timeout",
  "Cara kerja",
  "Naikkan `SetMaxOpenConns` dari 10 ke 50. Push tetap dipanggil di dalam transaction tanpa batas waktu",
  "Client push diberi `Timeout` 3 detik, tetapi panggilannya tetap di antara `BEGIN` dan `COMMIT`",
  "Panggilan push dibungkus breaker. Bila kegagalan mencapai ambang, breaker membuka dan panggilan berikutnya langsung dijawab error tanpa memanggil layanan ([Fowler, 2014](https://martinfowler.com/bliki/CircuitBreaker.html))",
  "Pembayaran menulis jurnal, posting, dan satu baris `outbox`, lalu COMMIT. Worker mengirim push dengan batas 3 detik. PostgreSQL memutus sesi diam lebih dari 5 detik. Pool tetap 10",
  "Kelebihan",
  "Satu angka berubah, tanpa kode baru",
  "Pool selamat: koneksi terpakai paling banyak 3 dari 10, sesuai ⌈0,868 × 3⌉",
  "Setelah breaker membuka, panggilan ke layanan yang gagal tidak lagi menahan koneksi (penalaran)",
  "Uang tidak menunggu pihak luar: 26 pembayaran dijawab 201 dan 494 pembacaan dijawab 200 selama push menggantung",
  "Kekurangan",
  "Penyebabnya tidak berubah: pool 50 penuh pada 50 ÷ 0,868 = 57,6 detik, bukan 11,5. Dengan dua instance ([[t3-dua-instance]]), 2 × 50 + 4 + 3 + 3 = 110 koneksi melebihi `max_connections` bawaan 100 (Hitungan; worker dan admin Asumsi)",
  "Lock buku warung tertahan selama push menunggu: pembayaran kedua ke warung yang sama selesai sesudah lebih dari 5 detik, bukan 3",
  "Tidak mengubah posisi panggilan. Tiap panggilan sebelum breaker membuka tetap menahan koneksi dan lock buku. Ambang baru harus dipilih (penalaran)",
  "Butuh tempat menyimpan pemberitahuan sampai terkirim, yaitu `outbox` ([[t3-outbox]]). Pemberitahuan menyusul dari worker, tidak seketika",
  "Biaya operasional",
  "Tiap koneksi tambahan adalah satu proses backend di PostgreSQL, dan jatah `max_connections` menyusut",
  "Alert untuk lock yang menunggu lama, dan penyedia yang menjawab dalam 3 detik",
  "Status breaker dan alert bila ia membuka. Fowler menyarankan monitor. Statusnya per instance bila ditulis di memori (penalaran)",
  "Satu tabel dan satu proses worker, parameter koneksi `idle_in_transaction_session_timeout`, dan alert umur notifikasi tertua ([[t3-tim-infra]])",
  "Bukti",
  "Rekaman `m18.txt` bagian B; HikariCP wiki; hitungan koneksi",
  "Rekaman `adr22.txt` bagian D",
  "[Fowler, 2014](https://martinfowler.com/bliki/CircuitBreaker.html); Tidak dijalankan di lab",
  "Rekaman `adr22.txt` bagian E dan F",
  "Di rekaman, hanya B dan D yang menyelamatkan pool, dan B melakukannya dengan mengorbankan lock buku warung. C Tidak dijalankan: kode lab Tahap 3 (api-t3 dan lab t3-*) tidak memuat breaker, jadi klaim C datang dari artikel dan penalaran, bukan dari rekaman.",
  "**Keputusan: opsi D.** Empat aturan, dan tiap aturan punya tugas sendiri:",
  "Tidak ada panggilan jaringan di dalam transaction. Tugasnya memutus rantai: pembayaran tidak menunggu layanan luar (rekaman `adr22.txt` bagian F).",
  "Setiap client yang memanggil layanan luar punya `Timeout` eksplisit 3 detik, dan nol tidak dipakai. Tugasnya membatasi satu panggilan, mis. dari worker (`push.BatasBawaan`).",
  "`idle_in_transaction_session_timeout` 5 detik dikirim sebagai parameter koneksi API dan worker. Tugasnya melindungi PostgreSQL dari lock dan transaction terbuka. Ia tidak melindungi pool di proses Go (rekaman `adr22.txt` bagian E).",
  "Pool tetap 10. Ukurannya diubah hanya bila L seluruh request terukur mendekati 9, bukan untuk mengobati pool yang penuh karena panggilan menggantung.",
  "**Kenapa D, bukan B.** B dan D sama-sama menyelamatkan pool. B membuat satu warung hanya menerima satu pembayaran per 3 detik selama push menggantung, walau pool kosong (`adr22.txt` bagian D). D tidak membuat pembayaran menunggu push sama sekali.",
  "**Kenapa bukan A.** Pool 50 menunda penuhnya dari 11,5 ke 57,6 detik dan tidak menyentuh sebabnya.",
  "Wiki HikariCP menulis bahwa demonstrasi grup Oracle Real-World Performance menurunkan waktu respons dari ±100 ms ke ±2 ms hanya dengan mengecilkan pool. Wiki yang sama menulis bahwa video itu mengecilkan koneksi dari 2.048 ke 96. Itu laporan penulis wiki atas satu demonstrasi, bukan hasil lab ini, dan ia menyuruh pembaca menguji dengan beban sendiri.",
  "**Kasus industri: Val Town (2024).** Max McDonnell menulis post-mortem Val Town tertanggal 2024-12-31 ([Val Town, Post-mortem: Exhausted Host Connection Pool](https://blog.val.town/blog/post-mortem-exhausted-host-connection-pool), dibuka 2026-10-26). Beberapa query database saling mengunci, pool-nya tidak punya timeout query, dan koneksi yang terkunci menempati slot pool selamanya. Satu server kehabisan koneksi, sebagian besar request tertahan tanpa batas, dan health check-nya tidak memeriksa database.",
  "Server itu baru dimatikan manual pukul 07.04 ET sesudah laporan user. Perbaikan mereka: timeout pada query pool dan health check yang memeriksa pool. Mereka juga berencana meninjau supaya server yang penuh menolak request, bukan mengantre tanpa batas. Batasnya: satu layanan, dan pemicunya deadlock di database, bukan layanan luar, tetapi mekanismenya sama: slot yang ditahan tanpa batas waktu.",
  "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:",
  "Jalur uang baru memanggil layanan luar di dalam transaction, mis. penyedia verifikasi. Pencegahannya aturan 1, dan satu tes yang menggantungkan layanan itu seperti rekaman F untuk setiap jalur baru, memeriksa bahwa pembayaran tetap dijawab.",
  "Timeout 3 detik salah ukur untuk penyedia sungguhan. Di worker, dua perangkat yang menggantung memakan 2 × 3 detik, lebih dari klaim 5 detik. Akibatnya pesan yang sama terkirim dua kali ke tiap perangkat (rekaman `ganda.txt` bagian D di lab t3-outbox, dibahas di [[t3-at-least-once]]). Pencegahannya: ukur jawaban penyedia sebelum mengubah batasnya, dan hitung ulang klaim worker bila batas berubah.",
  "Pool habis lagi karena sebab yang tidak terpikirkan, dan tidak ada yang tahu sampai user melapor. Server Val Town begitu: health check-nya tidak melihat database. Pencegahannya alert untuk request yang menunggu koneksi ([[t3-tim-infra]]) dan health check yang memakai koneksi database ([[t3-dua-instance]]).",
  "**Kapan keputusan ini salah.** Pertama, bila panggilan luar harus atomik dengan uang, mis. otorisasi kartu di Tahap 4. Aturan 1 tidak bisa dipenuhi di sana, dan jalur itu butuh pengaman lain.",
  "Kedua, bila pool 10 tidak muat tanpa panggilan luar, yaitu bila L melebihi 10 − 1 = 9. Dengan W 20 ms (Asumsi), itu terjadi pada 9 ÷ 0,02 = 450 request per detik, atau 25,9 kali puncak 17,4. Kapasitas satu server belum diukur (load test ADR 21 Tidak dijalankan), jadi angka itu belum terbukti.",
  "**Yang akan merevisinya.** Halaman Tahap 4 yang membahas panggilan luar yang harus selesai sebelum uang bergerak. Revisinya belum ditulis di naskah.",
  "Sengaja belum dilakukan",
  "Yang ditunda",
  "Kenapa ditunda",
  "Muncul lagi di",
  "Pooler terpisah seperti PgBouncer",
  "Dua instance memakai 30 dari 100 koneksi (Asumsi, hitungan di Paham). Pooler layak bila instance × pool mendekati `max_connections`",
  "[[t3-adr-33]]",
  "Circuit breaker",
  "Push di luar transaction membuat penyedia yang gagal hanya menahan worker, bukan pembayaran",
  "Belum dijadwalkan di naskah",
  "Mengubah ukuran pool dari L terukur",
  "L seluruh request 0,35 koneksi (Asumsi), jauh dari 9; angkanya belum diukur di server sungguhan",
  "[[t3-estimasi]]",
  "Cek diri",
  "**1.** AI menulis handler ini. Apa yang rusak, dan apa dua perbaikannya?",
  "`http.Post` memakai `http.DefaultClient`, yang `Timeout`-nya nol, jadi panggilannya tanpa batas waktu. Selama push menunggu, transaction memegang satu koneksi. Perbaikan pertama: pindahkan push keluar dari transaction dengan menulis baris `outbox`. Perbaikan kedua: beri client `Timeout` eksplisit, mis. 3 detik.",
  "**2.** Pool 10 koneksi, 0,868 pembayaran per detik, dan push menjawab sesudah 2 detik. Apakah pool muat? Hitung L.",
  "Muat. L = 0,868 × (0,02 + 2) = 1,75 koneksi, jauh di bawah 10. Rekaman `little.txt` mencatat koneksi terukur paling banyak 2, dan rata-ratanya cocok dalam 15% dengan hitungannya.",
  "**3.** Raka menaikkan pool ke 50 dan push tetap tidak menjawab. Kapan pool penuh, dan kenapa itu bukan perbaikan?",
  "Pada 50 ÷ 0,868 = 57,6 detik, bukan 11,5. Rekaman `m18.txt` bagian B mencatat antara detik ke-57 dan ke-58. Penyebabnya, push tanpa batas waktu di dalam transaction, tidak berubah, jadi pool hanya penuh lebih lambat.",
  "**4.** `idle_in_transaction_session_timeout` 5 detik sudah dipasang. Kenapa pool Go tetap penuh?",
  "PostgreSQL memutus sesi yang diam dan melepas lock bukunya, tetapi slot pool ada di proses Go dan tetap dipakai selama handler menunggu push. Di `adr22.txt` bagian E, pool Go terpakai 10 dari 10 dan 12 pembacaan tidak dijawab, walau sesi PostgreSQL sudah diputus.",
  "Saat me-review kode AI, cek ini",
  "Tidak ada panggilan HTTP, push, atau email di antara `BEGIN` dan `COMMIT`.",
  "Setiap `http.Client` yang memanggil layanan luar punya `Timeout` eksplisit, karena nol berarti tanpa batas.",
  "Ukuran pool ditulis (`SetMaxOpenConns` atau `pool_max_conns`), karena `database/sql` tanpa batas bawaan.",
  "Jumlah instance × ukuran pool, ditambah worker dan koneksi admin, lebih kecil dari `max_connections`.",
  "Ukuran pool diubah dari L = λ × W yang dihitung atau diukur, bukan dari kesan \"lambat\".",
  "Kegagalan panggilan keluar meninggalkan baris di database yang bisa dicari, bukan hanya baris log.",
  "Bacaan lanjut",
  "[Go: net/http, tipe Client](https://pkg.go.dev/net/http#Client) dan [Request.Context](https://pkg.go.dev/net/http#Request.Context) (Go 1.27.3)",
  "[Go: database/sql](https://pkg.go.dev/database/sql) (SetMaxOpenConns, BeginTx, DBStats)",
  "[pgx v5: pgxpool](https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool) (v5.11.0)",
  "[PostgreSQL 17: Client Connection Defaults](https://www.postgresql.org/docs/17/runtime-config-client.html) (idle_in_transaction_session_timeout)",
  "[PostgreSQL 17: How Connections Are Established](https://www.postgresql.org/docs/17/connect-estab.html)",
  "[HikariCP: About Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)",
  "[Martin Fowler: Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html) (2014)",
  "[Val Town: Post-mortem, Exhausted Host Connection Pool](https://blog.val.town/blog/post-mortem-exhausted-host-connection-pool) (2024)",
  "[J. D. C. Little, A Proof for the Queuing Formula: L = λW](https://doi.org/10.1287/opre.9.3.383) (1961)",
];
