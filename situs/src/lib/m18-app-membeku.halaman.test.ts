// Penjaga angka halaman 3.6 (keputusan 1020 sampai 1022): angka, ID, nomor, versi sumber, tautan, label sumber, arti istilah,
// teks simpul diagram, teks langkah alur, dan klaim "tidak ada" yang ditulis tangan di m18-app-membeku.mdx, diagram
// t3-m18-pool-penuh.json, dan skenario alur t3-m18.json diturunkan dari rekaman labs/ (t3-pool, api-t3), kode lab, naskah,
// registry, RISET, dan halaman tetangga, bukan dari daftar yang ditulis sendiri. Pola: fitur-notifikasi.halaman.test.ts.
// Aturan tes ini: hanya membaca berkas terlacak git (git ls-files), dan tiap kalimat klaim halaman dipasangkan dengan
// sumbernya, supaya mengubah KATA, arti istilah, teks simpul, atau label sumber ikut menggagalkan tes, bukan hanya angka.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t3-m18-pool-penuh.json";
import registry from "../../data/cerita.json";
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
const halamanBerkas = "situs/src/content/docs/tahap-3/m18-app-membeku.mdx";
const mdx = baca(halamanBerkas);
const halaman = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t3-m18.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const rantai = DataRantai.parse(rantaiMentah);
const rantaiTeks = JSON.stringify(rantaiMentah);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const m18 = baca("labs/t3-pool/output/m18.txt");
const jejak = baca("labs/t3-pool/output/jejak.txt");
const rentan = baca("labs/api-t3/output/rentan.txt");
const notif = baca("labs/api-t3/internal/service/notif.go");
const pushGo = baca("labs/api-t3/internal/push/push.go");
const repoGo = baca("labs/api-t3/internal/repo/repo.go");
const handlerGo = baca("labs/api-t3/internal/handler/handler.go");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const bebanPy = baca("labs/t3-pool/beban.py");
const umumPy = baca("labs/t3-pool/umum.py");
const prd = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const fitur = baca("situs/src/content/docs/tahap-3/fitur-notifikasi.mdx");

interface Layar { judul?: string; nada?: string; isi?: { jenis: string; teks?: string; nada?: string }[] }
interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string; layar?: Record<string, Layar> }
interface Skenario {
  sumber: { jenis: string; file: string; fileVarian: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Record<string, Layar>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}

interface Bagian { awal: number; akhir: number; baris: string[] }
// Bagian rekaman diawali "# --- X. ..."; awal dan akhir adalah nomor baris (mulai 1) yang dipakai Snippet.
const pecah = (teks: string): Record<string, Bagian> => {
  const semua = teks.split("\n");
  const hasil: Record<string, Bagian> = {};
  let kini = "";
  semua.forEach((b, i) => {
    const m = b.match(/^# --- ([A-Z])\. /);
    if (m) {
      if (kini) hasil[kini]!.akhir = i;
      kini = m[1]!;
      hasil[kini] = { awal: i + 1, akhir: semua.length, baris: [] };
    } else if (kini) hasil[kini]!.baris.push(b);
  });
  return hasil;
};
const bagian = (semua: Record<string, Bagian>, huruf: string): Bagian => {
  const b = semua[huruf];
  if (!b) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  return b;
};
const cari = (pola: RegExp, baris: string[], nama: string): RegExpMatchArray => {
  const m = baris.map((x) => x.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const harus = (kalimat: string): void => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const hitung = (teks: string, pola: RegExp): number => (teks.match(pola) ?? []).length;

const entri = (id: string) => (registry.halaman as unknown as { id: string; judul: string; ada: boolean; nomor?: string }[]).find((h) => h.id === id);
const README_POOL = baca("labs/t3-pool/README.md");
const MP = pecah(m18);
const RP = pecah(rentan);
const JP = pecah(jejak);
const A = bagian(MP, "A").baris;
const B = bagian(MP, "B").baris;
const C = bagian(MP, "C").baris;
const RA = bagian(RP, "A").baris;
const JJ = bagian(JP, "J").baris;

// ---- nilai turunan dari rekaman ---------------------------------------------------------------
const idle = [...A.join("\n").matchAll(/^pembayaran ke-(\d+) sampai di layanan push: idle in transaction (\d+)$/gm)].map((m) => [Number(m[1]), Number(m[2])]);
const penuhA = cari(/^pool 10 penuh antara detik ke-(\d+) dan ke-(\d+) sejak beban mulai \(hitungan 10 ÷ 0,87 = ([\d,]+)\)$/, A, "pool penuh A");
const poolA = JSON.parse(cari(/^(\{"dipakai":10,"maks":10,"terbuka":10\})$/, A, "pool A")[1]!) as { dipakai: number; maks: number; terbuka: number };
const bacaSebelum = cari(/^# Pembacaan sebelum pool penuh \(request 1 sampai 199\): (\d+) pembacaan: 200 x(\d+)$/, A, "baca sebelum A");
const bacaSesudah = cari(/^# Pembacaan sesudah pool penuh \(request 201 sampai 400\): (\d+) pembacaan: tanpa jawaban x(\d+)$/, A, "baca sesudah A");
const tigaPuluh = cari(/^# Sesudah 30 detik: (\d+) pembayaran dikirim, (\d+) belum dijawab\. Di layanan push (\d+) permintaan menggantung, jadi (\d+) pembayaran menunggu koneksi di API\.$/, A, "30 detik A");
const kepalaPool = cari(/^server log: api-t3 siap: pool (\d+), push timeout (\d+)s, idle-tx (\d+)s$/, A, "kepala A");
const batasBaca = cari(/^# Client pembacaan menyerah sesudah (\d+) detik\. Client pembayaran tidak menyerah selama rekaman \(batasnya (\d+) detik\)\.$/, A, "batas client A");
const jadwal = cari(/^# Beban dengan jadwal tetap, bukan acak: ([\d,]+) request per detik \(Asumsi naskah bagian 3\)\. Request ke-(\d+), ke-\d+, dan seterusnya adalah pembayaran \(([\d,]+) per detik, (\d+)%, Asumsi\)\.$/, A, "jadwal A");
const penuhB = cari(/^pool 50 penuh antara detik ke-(\d+) dan ke-(\d+) sejak beban mulai \(hitungan 50 ÷ 0,87 = ([\d,]+)\)$/, B, "pool penuh B");
const poolB = JSON.parse(cari(/^(\{"dipakai":50,"maks":50,"terbuka":50\})$/, B, "pool B")[1]!) as { dipakai: number };
const bacaSebelumB = cari(/^# Sebelum pool penuh tidak ada request yang gagal\. Pembacaan request 1 sampai 999: (\d+) pembacaan: 200 x(\d+)$/, B, "baca sebelum B");
const bacaSesudahB = cari(/^# Sesudah pool penuh \(request 1001 sampai 1018\): (\d+) pembacaan: tanpa jawaban x(\d+)$/, B, "baca sesudah B");
const batasC = cari(/^# Client pembacaan menyerah sesudah (\d+) detik\. Client pembayaran menyerah sesudah (\d+) detik \(HP yang menampilkan "timeout"\)\.$/, C, "batas C");
const puncakC = cari(/^koneksi idle in transaction: puncak (\d+) dari (\d+) \(0,87 × (\d+) detik = ([\d,]+), jadi paling banyak (\d+)\)$/, C, "puncak C");
const bayarC = cari(/^pembayaran request 1 sampai 400: (\d+) pembayaran: tanpa jawaban x(\d+)$/, C, "bayar C");
const bacaC = cari(/^pembacaan request 1 sampai 400: (\d+) pembacaan: 200 x(\d+)$/, C, "baca C");
const jurnalC = cari(/^ (\d+)$/, C, "jurnal C");
const tahanC = cari(/^# Sesudah 30 detik layanan push masih menahan (\d+) permintaan: handler tidak berhenti walau client pergi \(push memakai konteks yang dilepas dari request\)\.$/, C, "tahan C");
const idleRentan = cari(/^ idle in transaction \| (\d+)$/, RA, "idle rentan");
const menungguRentan = [...RA.join("\n").matchAll(/"menunggu":(\d+)/g)].map((m) => Number(m[1]));
const logJejak = cari(/^baris log baru sesudah (\d+) detik: (\d+)$/, JJ, "log jejak");

// ---- hitungan dengan rumus naskah, dari masukan registry ---------------------------------------
const a3 = registry.tahap[2]!.asumsi;
const aktif = (a3.user * a3.aktif) / 100;
const reqHari = aktif * a3.req;
const puncakRps = (reqHari / 86400) * a3.puncak;
const trxHari = aktif * a3.trx;
const lambda = (trxHari / 86400) * a3.puncak;
const lambdaLab = Number(jadwal[3]!.replace(",", "."));
const penuh10 = 10 / lambda;
const penuh50 = 50 / lambda;
const ambang = 9 / lambda;
const ambangLab = 9 / lambdaLab;
const tiap = 1 / lambda;

describe("rekaman: nilai turunan yang dipakai halaman", () => {
  test("m18.txt A: pool 10, koneksi bertambah satu per pembayaran, penuh antara detik ke-11 dan ke-12", () => {
    expect(idle).toEqual([[1, 1], [5, 5], [9, 9], [10, 10]]);
    expect([Number(kepalaPool[1]), Number(kepalaPool[2]), Number(kepalaPool[3])]).toEqual([10, 0, 0]);
    expect(poolA).toEqual({ dipakai: 10, maks: 10, terbuka: 10 });
    const lo = Number(penuhA[1]);
    expect(Number(penuhA[2])).toBe(lo + 1);
    expect(lo).toBeLessThanOrEqual(penuh10);
    expect(penuh10).toBeLessThan(lo + 1);
    expect(penuhA[3]).toBe("11,5");
    expect(koma(penuh10, 1)).toBe("11,5");
  });
  test("m18.txt A: 190 pembacaan dijawab sebelum dan 190 tidak dijawab sesudah pool penuh; keadaan sesudah 30 detik", () => {
    expect([Number(bacaSebelum[1]), Number(bacaSebelum[2])]).toEqual([190, 190]);
    expect([Number(bacaSesudah[1]), Number(bacaSesudah[2])]).toEqual([190, 190]);
    expect(tigaPuluh.slice(1).map(Number)).toEqual([26, 26, 10, 16]);
    expect(Number(tigaPuluh[3]) + Number(tigaPuluh[4])).toBe(Number(tigaPuluh[2]));
    expect([Number(batasBaca[1]), Number(batasBaca[2])]).toEqual([3, 300]);
  });
  test("m18.txt A: jadwal lab 17,4 dan 0,87, tiap request ke-20, dan pembulatan dari 17,36 dan 0,868", () => {
    expect([jadwal[1], Number(jadwal[2]), jadwal[3], Number(jadwal[4])]).toEqual(["17,4", 20, "0,87", 5]);
    expect(koma(puncakRps, 2)).toBe("17,36");
    expect(koma(lambda, 3)).toBe("0,868");
    expect(Math.abs(lambdaLab - lambda) / lambda).toBeLessThan(0.0025);
    expect(koma((Math.abs(lambdaLab - lambda) / lambda) * 100, 1)).toBe("0,2");
    expect(titik(reqHari)).toBe("150.000");
    expect(titik(trxHari)).toBe("7.500");
    expect(a3).toMatchObject({ user: 10000, aktif: 25, req: 60, puncak: 10, trx: 3 });
    expect(umumPy).toContain("LAMBDA = RPS / TIAP");
    expect(umumPy).toContain("RPS, TIAP = 17.4, 20");
  });
  test("m18.txt B: pool 50 penuh antara detik ke-57 dan ke-58, 950 pembacaan dijawab sebelum dan 18 tidak dijawab sesudah", () => {
    expect(poolB.dipakai).toBe(50);
    const lo = Number(penuhB[1]);
    expect(Number(penuhB[2])).toBe(lo + 1);
    expect(lo).toBeLessThanOrEqual(penuh50);
    expect(penuh50).toBeLessThan(lo + 1);
    expect(koma(penuh50, 1)).toBe("57,6");
    expect([Number(bacaSebelumB[1]), Number(bacaSebelumB[2])]).toEqual([950, 950]);
    expect([Number(bacaSesudahB[1]), Number(bacaSesudahB[2])]).toEqual([18, 18]);
    expect(B.some((b) => b.includes("# Pool 50 menunda pembekuan dari 11,5 ke 57,5 detik. Penyebabnya, layanan push tanpa batas waktu di dalam transaction, tidak berubah."))).toBe(true);
  });
  test("m18.txt C: app menyerah sesudah 5 detik, puncak 5 dari 10, 20 pembayaran tanpa jawaban, 380 pembacaan dijawab, jurnal 0, 26 tertahan", () => {
    expect([Number(batasC[1]), Number(batasC[2])]).toEqual([3, 5]);
    expect([Number(puncakC[1]), Number(puncakC[2]), Number(puncakC[3]), puncakC[4], Number(puncakC[5])]).toEqual([5, 10, 5, "4,35", 5]);
    expect(Math.ceil(lambda * Number(batasC[2]))).toBe(Number(puncakC[5]));
    expect(koma(lambda * Number(batasC[2]), 2)).toBe("4,34");
    expect([Number(bayarC[1]), Number(bayarC[2])]).toEqual([20, 20]);
    expect([Number(bacaC[1]), Number(bacaC[2])]).toEqual([380, 380]);
    expect(Number(jurnalC[1])).toBe(0);
    expect(Number(tahanC[1])).toBe(Number(tigaPuluh[2]));
    expect(C.some((b) => b.includes("Pool 10 baru penuh bila client menunggu lebih dari 10 ÷ 0,87 = 11,5 detik"))).toBe(true);
  });
  test("ambang client menyerah: (n − 1) ÷ λ, ±10,4 dengan 0,868 dan 10,34 dengan 0,87; ceil(λT) mencapai 10 hanya di atas ambang", () => {
    expect(koma(ambang, 1)).toBe("10,4");
    expect(koma(ambangLab, 2)).toBe("10,34");
    expect(Math.ceil(lambda * (ambang - 0.01))).toBe(9);
    expect(Math.ceil(lambda * (ambang + 0.01))).toBe(10);
    expect(koma(tiap, 2)).toBe("1,15");
  });
  test("rentan.txt A: sepuluh pembayaran serentak memenuhi pool, request ke-11 tidak dijawab, penghitung menunggu 0 lalu 1; jejak.txt J: 0 baris log", () => {
    expect(Number(idleRentan[1])).toBe(10);
    expect(RA.some((b) => b.includes("# Budi dan sembilan karyawan lain membayar sepuluh warung berbeda (tanpa rebutan lock buku), semuanya bersamaan"))).toBe(true);
    expect(RA.some((b) => b.startsWith("# Request ke-11: Budi hanya membuka saldonya (GET /akun/419). Server butuh satu koneksi bebas bahkan untuk memeriksa sesinya."))).toBe(true);
    expect(RA.some((b) => b === "(tidak ada jawaban)")).toBe(true);
    expect(menungguRentan).toEqual([0, 1]);
    expect(RA.some((b) => b.includes("Semua layar ikut membeku, bukan hanya pembayaran (M18)"))).toBe(true);
    expect([Number(logJejak[1]), Number(logJejak[2])]).toEqual([4, 0]);
    expect(JJ.some((b) => b.startsWith("# 1. Log: api-t3 tidak mencatat request, hanya kejadian server dan kesalahan internal. Request yang menggantung tidak meninggalkan baris."))).toBe(true);
  });
});

const baris17 = riset.split("\n").find((b) => b.startsWith("| R3-125 |"))!;

describe("m18-app-membeku.mdx: tiap angka turunan dari rekaman dan hitungan", () => {
  test("frontmatter, meta, dan registry", () => {
    const h = (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; peran?: string[]; menit?: number; path?: string }[]).find((x) => x.id === "t3-m18")!;
    expect(h.ada).toBe(true);
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.lab, h.prasyarat, h.peran]).toEqual(["3.6", "masalah", 4, true, ["t3-pool"], ["t3-skema"], ["backend"]]);
    expect(h.path).toBe("tahap-3/m18-app-membeku.md");
    expect(frontmatter).toContain(`title: "${h.nomor} ${h.judul}"`);
    expect(h.judul).toBe("M18: Seluruh app membeku jam 12.20");
    expect(naskah).toMatch(/\| 3\.6 \| 4 \| M18: Seluruh app membeku jam 12\.20 \| Masalah \| ★ \| t3-pool \| alur \|/);
    const meta = halaman.match(/^<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-skema\]\] · Jalur inti<\/p>$/m)!;
    expect(meta).not.toBeNull();
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(Number(meta[2])).toBe(3);
    expect(frontmatter).toContain("Minggu 3.");
    expect(frontmatter).toContain("sekitar sembilan menit");
  });
  test("Gejala: waktu dan lamanya dari naskah, label Ilustrasi dan Asumsi, dan batas waktu app 30 detik", () => {
    const baris = naskah.split("\n").find((b) => b.startsWith("| M18 | 3 |"))!;
    expect(baris).toContain("Jumat 12.20, Rekeningo berhenti menjawab selama ±9 menit (Ilustrasi)");
    expect(baris).toContain("tombol Bayar berputar lalu \"timeout\"");
    expect(baris).toContain("M18 memakai 30 detik atau tanpa batas (Asumsi)");
    expect(baris).toContain("Database lambat; Raka mengusulkan pool dinaikkan dari 10 ke 50");
    harus("Minggu 3 Tahap 3. Jumat pukul 12.20, jam makan siang di kampus pusat.");
    harus("Seorang pelanggan menekan Bayar, dan tombolnya berputar lama sebelum menulis \"timeout\".");
    harus("Bukan hanya pembayaran yang macet: semua layar berhenti menjawab.");
    harus("Sekitar sembilan menit sesudah pukul 12.20 app menjawab lagi");
    harus("*Angka cerita (Ilustrasi):* pukul 12.20 dan sembilan menit berasal dari naskah, tanpa rekaman yang mengulang menit itu.");
    harus("*Asumsi (pilihan penulis atau angka beban naskah, tanpa rekaman):* naskah tidak menyebut batas waktu app, jadi halaman ini memakai 30 detik.");
    harus("Naskah juga tidak menyebut apa yang membuat app menjawab lagi, dan halaman ini tidak mengklaimnya.");
    harus("Arti label Rekaman lab dan Tidak dijalankan ada di [[A0]].");
  });
  test("Yang Raka kira: log kosong dari jejak.txt J, rencana pool 10 ke 50, batas 10 dari Bayu, dan jawaban tebakan", () => {
    harus("Log server tidak memuat satu baris pun untuk request yang menggantung (Rekaman lab `jejak.txt` bagian J;");
    expect(Number(logJejak[2])).toBe(0);
    harus("Raka menyimpulkan bahwa database kewalahan. Sepuluh koneksi terlalu sedikit untuk jam makan siang, jadi rencananya pool dinaikkan dari 10 ke 50.");
    harus("Angka 10 adalah batas yang Bayu tetapkan di minggu 1 (Asumsi cerita).");
    expect(naskah).toContain("pool 10 koneksi (Asumsi cerita: batas yang Bayu tetapkan di minggu 1");
    harus(`Pada beban yang sama, pool 10 penuh antara detik ke-${penuhA[1]} dan ke-${penuhA[2]}. Pool 50 penuh antara detik ke-${penuhB[1]} dan ke-${penuhB[2]} (Rekaman lab \`m18.txt\` bagian A dan B).`);
    harus("Tetap membeku, hanya terlambat.");
    harus("<summary>Tebak dulu: pool dinaikkan ke 50, dan layanan push menggantung lagi di Jumat berikutnya. Apakah layar tidak lagi membeku, membeku lebih jarang, atau tetap membeku?</summary>");
    expect(m18).toContain("Pool 50 menunda pembekuan dari 11,5 ke 57,5 detik. Penyebabnya, layanan push tanpa batas waktu di dalam transaction, tidak berubah.");
  });
  test("Yang sebenarnya: kondisi rekaman, jadwal beban, rumus 17,36 dan 0,868 dari registry", () => {
    harus("*Kondisi rekaman:* layanan push di lab adalah tiruan lokal dalam mode `gantung`: ia menerima permintaan dan tidak pernah menjawab.");
    expect(m18).toContain("layanan push tiruan: menerima permintaan, tidak pernah menjawab");
    expect(m18).toContain("-d '{\"mode\": \"gantung\"}'");
    harus("Penyedia push sungguhan tidak dipakai.");
    harus("Server berjalan dalam mode rentan `push-dalam-tx` dengan pool 10 dan client push tanpa batas waktu.");
    expect(m18).toContain("$ ./api-t3 -rentan push-dalam-tx -lab   # pool 10, push timeout 0 (tanpa batas), idle-tx 0 (mati)");
    harus(`- Puncak request: ${titik(a3.user)} user × ${a3.aktif}% aktif × ${a3.req} request = ${titik(reqHari)} per hari, ÷ ${titik(86400)} × ${a3.puncak} = ${koma(puncakRps, 2)} per detik. Lab menjadwalkan ${jadwal[1]}.`);
    harus(`- Pembayaran: ${titik(a3.user)} × ${a3.aktif}% × ${a3.trx} transaksi = ${titik(trxHari)} per hari, ÷ ${titik(86400)} × ${a3.puncak} = ${koma(lambda, 3)} per detik. Lab menjadwalkan ${jadwal[3]}.`);
    harus("Masukan beban adalah Asumsi dari naskah, dengan faktor puncak 10. Lab membulatkannya dengan selisih 0,2%:");
    harus(`tiap request ke-${jadwal[2]} adalah pembayaran. Sisanya pembacaan saldo.`);
    harus("Pembayar, warung, dan pembaca selalu berbeda, jadi tidak ada rebutan lock buku.");
    expect(A.some((b) => b.includes("Pembayar, warung, dan pembaca selalu berbeda: tidak ada rebutan lock buku."))).toBe(true);
    harus(`Di lab, pembayaran menunggu sampai ${batasBaca[2]} detik dan pembacaan menyerah sesudah ${batasBaca[1]} detik.`);
    harus("Beban datang dengan jadwal tetap, bukan acak");
  });
  test("satu bentuk per angka: 0,868 di prosa, 0,87 hanya sebagai angka lab, 17,4 hanya sebagai jadwal lab", () => {
    expect(hitung(halaman, /0,87(?!\d)/g)).toBe(3);
    for (const k of ["Lab menjadwalkan 0,87.", "dengan λ = 0,87.", "Lab dengan λ = 0,87 menghitung 10,34."]) harus(k);
    expect(hitung(halaman, /17,4(?!\d)/g)).toBe(1);
    expect(hitung(halaman, /17,36/g)).toBe(1);
    expect(hitung(halaman, /0,868/g)).toBeGreaterThanOrEqual(8);
    for (const salah of ["0,86 ", "0,869", "11,52", "57,60", "10,37", "13,3", "1,16"]) expect(halaman, salah).not.toContain(salah);
    expect(hitung(halaman, /±11,5 detik/g) + hitung(halaman, /= 11,5 detik/g)).toBeGreaterThanOrEqual(3);
  });
  test("langkah demi langkah: koneksi ditahan, kode lab, dokumentasi, arti `idle in transaction`", () => {
    harus("**Kenapa pembayaran menunggu layanan push.** Di minggu 1, Nadia dan Raka mengirim push di dalam transaction jurnal, sebelum COMMIT, dengan client HTTP bawaan Go ([[t3-dua-tempat]]).");
    expect(naskah).toContain("Nadia dan Raka menulis urutan paling pendek: `BEGIN`, kunci buku (ADR 13), `INSERT` jurnal dan posting, kirim push lewat HTTP, `COMMIT`.");
    expect(naskah).toContain("client HTTP memakai pengaturan bawaan Go yang tanpa batas waktu");
    harus("Client push dibuat dengan `Timeout: 0`.");
    expect(pushGo).toContain("func Baru(url string, batas time.Duration) Klien");
    expect(pushGo).toContain("// Baru: batas 0 membuat client tanpa batas waktu (http.Client{}), hanya untuk mode rentan M18.");
    harus("**Satu pembayaran menahan satu koneksi.** Pembayaran ke-1 sampai ke-10 sampai di layanan push satu per satu.");
    harus("jumlah transaction berstatus `idle in transaction` naik satu per pembayaran:");
    harus(`Pembayaran ke-10 tiba sekitar 10 ÷ ${koma(lambda, 3)} = ${koma(penuh10, 1)} detik sesudah beban mulai.`);
    harus("Rekaman memeriksa `pg_stat_activity` tiap 50 ms dan menemukan pool penuh");
    expect(A.some((b) => b.includes("Cuplikan pg_stat_activity tiap 50 ms menandai saat koneksi ke-10 terlihat."))).toBe(true);
    harus(`Sebelum itu ${bacaSebelum[1]} dari ${bacaSebelum[2]} pembacaan saldo dijawab dengan 200. Sesudahnya ${bacaSesudah[1]} dari ${bacaSesudah[2]} tidak dijawab dalam ${batasBaca[1]} detik:`);
    harus("Database tidak sedang bekerja lambat: ia tidak menjalankan query apa pun untuk transaction itu. Transaction terbuka karena server Go menunggu layanan push.");
    harus("Menurut dokumentasi PostgreSQL 17, status itu berarti backend ada di dalam transaction dan sedang tidak menjalankan query.");
    expect(baris17).toContain("PostgreSQL 17.11");
  });
  test("tabel Hitungan lawan Rekaman lab: tiga baris dari rumus dan rekaman", () => {
    harus(`Masukannya satu: λ = ${koma(lambda, 3)} pembayaran per detik di puncak (${titik(trxHari)} per hari ÷ ${titik(86400)} × ${a3.puncak}, Asumsi).`);
    harus("Kolom Hitungan adalah hasil rumus dari masukan itu dan memakai label masukan terlemahnya, jadi tetap Asumsi.");
    harus("Kolom Rekaman lab membuktikan mekanismenya di lab dengan λ = 0,87.");
    const baris = halaman.split("\n").filter((b) => b.startsWith("| Pool"));
    expect(baris.map((b) => b.split("|").slice(1, -1).map((s) => s.trim()))).toEqual([
      ["Pool 10, app terus menunggu", `10 ÷ ${koma(lambda, 3)} = ±${koma(penuh10, 1)} detik`, `penuh antara detik ke-${penuhA[1]} dan ke-${penuhA[2]}`],
      ["Pool 50, app terus menunggu", `50 ÷ ${koma(lambda, 3)} = ±${koma(penuh50, 1)} detik`, `penuh antara detik ke-${penuhB[1]} dan ke-${penuhB[2]}`],
      ["Pool 10, app menyerah sesudah T detik", `penuh hanya bila T > 9 ÷ ${koma(lambda, 3)} = ±${koma(ambang, 1)} detik`, `T = ${batasC[2]}: paling banyak ${puncakC[1]} koneksi terpakai`],
    ]);
    harus("Ambang T datang dari jumlah koneksi yang terpakai pada satu saat.");
    harus(`Tiap pembayaran melepas koneksinya T detik sesudah datang, jadi paling banyak ⌈${koma(lambda, 3)} × T⌉ koneksi terpakai.`);
    harus(`yaitu bila T lebih dari 9 ÷ ${koma(lambda, 3)} = ±${koma(ambang, 1)} detik. Lab dengan λ = 0,87 menghitung ${koma(ambangLab, 2)}.`);
    harus(`Ambang itu tidak direkam: rekaman hanya mencoba T = ${batasC[2]}.`);
  });
  test("satu pembacaan ikut membeku: sesi dibaca dari database lewat kode, rekaman terpisah request ke-11", () => {
    harus("Server membaca sesi Budi dari database sebelum membaca saldonya (`SesiAktif`), jadi tanpa koneksi bebas pembacaan itu tidak bisa dijawab.");
    expect(handlerGo).toContain('mux.HandleFunc("GET /akun/{id}", s.wajibLogin(s.lihatAkun))');
    expect(handlerGo).toMatch(/func \(s \*?\w+\) wajibLogin[^]*?s\.svc\.Periksa\(r\.Context\(\), token\)/);
    expect(baca("labs/api-t3/internal/service/sesi.go")).toMatch(/func \(s Service\) Periksa[^]*?s\.repo\.SesiAktif\(/);
    expect(repoGo).toMatch(/func \(r Repo\) SesiAktif[^]*?r\.db\.QueryRowContext\(ctx, `\s*SELECT s\.akun_id[^`]*FROM sesi s/);
    harus("Rekaman terpisah memakai sepuluh pembayaran serentak ke sepuluh warung berbeda. Request ke-11, Budi membuka saldonya, tidak dijawab:");
  });
  test("pool 50, app menyerah, tertahan di layanan push, dan jurnal 0 bukan bukti", () => {
    harus(`**Pool 50 hanya menunda.** Bagian B mengulang beban yang sama dengan pool 50. Pool penuh antara detik ke-${penuhB[1]} dan ke-${penuhB[2]}, dan ${bacaSesudahB[1]} pembacaan sesudahnya tidak dijawab.`);
    harus(`Sebelum itu tidak ada request yang gagal: ${bacaSebelumB[1]} pembacaan dijawab dengan 200.`);
    harus(`Pool 50 menunda pembekuan dari ±${koma(penuh10, 1)} ke ±${koma(penuh50, 1)} detik, dan ${poolB.dipakai} koneksi ke PostgreSQL ikut tertahan. Layanan push tetap tidak menjawab.`);
    harus(`Pool 10 hanya penuh bila app menunggu lebih dari ±${koma(ambang, 1)} detik. Dengan batas waktu 30 detik (Asumsi), app Budi menunggu jauh melewati ambang itu.`);
    expect(30).toBeGreaterThan(ambang);
    harus(`Layar mulai berputar ±${koma(penuh10, 1)} detik sesudah beban mulai, dan tombol yang ditekan sesudahnya menulis "timeout" sekitar 30 detik kemudian.`);
    harus(`Bagian C mengubah satu hal: app menyerah sesudah ${batasC[2]} detik dan memutus koneksinya. Koneksi terpakai paling banyak ${puncakC[1]} dari ${puncakC[2]}, pool tidak penuh, dan ${bacaC[1]} dari ${bacaC[2]} pembacaan dijawab dengan 200:`);
    harus("Server membatalkan transaction saat request dibatalkan, jadi koneksinya kembali ke pool.");
    expect(C.some((b) => b.startsWith("# Transaction pembayaran dibatalkan saat konteks request batal, jadi koneksi kembali ke pool"))).toBe(true);
    harus(`Satu baris di rekaman itu tidak membuktikan pembatalan: jumlah jurnal bayar ${jurnalC[1]}. Layanan push tidak pernah menjawab, jadi transaction memang tidak pernah sampai COMMIT. Buktinya adalah puncak ${puncakC[1]} koneksi dan ${bacaC[1]} pembacaan yang dijawab.`);
    harus(`Sesudah 30 detik layanan push masih menahan ${tahanC[1]} permintaan, karena \`beritahu\` memanggilnya dengan \`context.WithoutCancel\`.`);
    expect(notif).toContain("s.push.Kirim(context.WithoutCancel(ctx), d.Token");
    harus("Handler tidak berhenti walau app pergi.");
    harus("App yang menyerah menyelamatkan pool, tetapi server tetap menunggu layanan push.");
  });
  test("kalimat pembuka tiap sub-bagian Yang sebenarnya, berurutan, dan tiap pembuka diikuti kalimat klaim yang dipasangkan di tes lain", () => {
    const pembuka = [...halaman.matchAll(/^\*\*([^*]+)\*\* /gm)].map((m) => m[1]);
    expect(pembuka).toEqual([
      "Kenapa pembayaran menunggu layanan push.",
      "Satu pembayaran menahan satu koneksi.",
      "Kapan pool penuh.",
      "Satu pembacaan saldo ikut membeku.",
      "Pool 50 hanya menunda.",
      "App yang menyerah melindungi pool, bukan server.",
      "App Flutter belum tentu menyerah dengan cara itu.",
      "Tebakan Raka salah dua kali.",
    ]);
  });
  test("tebakan Raka salah dua kali, jawaban pertanyaan PRD v3 lawan 3.1 dan 3.3, dan lama panggilan lawan banyak pembayaran", () => {
    harus("**Tebakan Raka salah dua kali.** Database tidak lambat: ia menunggu. Pool 50 hanya menunda pembekuan.");
    harus("Di ketiga rekaman penyebabnya sama, yaitu pembayaran menunggu layanan luar di dalam transaction, dengan client push yang tidak punya batas waktu.");
    expect([A, B, C].every((x) => x.some((b) => b.includes("-rentan push-dalam-tx")))).toBe(true);
    expect([A, B, C].every((x) => x.some((b) => b.includes('"mode": "gantung"')))).toBe(true);
    harus(`Beban hanya ${koma(lambda, 3)} pembayaran per detik. Yang membuat pool penuh adalah lamanya satu panggilan, bukan banyaknya pembayaran.`);
    harus("Itu menjawab pertanyaan pertama PRD v3 ([[t3-prd]]): ya, pembayaran ikut menunggu layanan push, dan bukan hanya pembayaran.");
    expect(prd).toContain("1. Kalau layanan push lambat, apakah pembayaran ikut lambat?");
    expect(prd).toContain("Jawabannya dimulai di [[t3-m18]] untuk pertanyaan pertama");
    expect(fitur).toContain("| Apa yang terjadi bila client ke layanan push tanpa batas waktu dan layanan itu menggantung? | Widget memakai batas 3 detik | [[t3-m18]] |");
    expect(naskah).toContain("| Connection pool dan Little's Law | Pool habis karena lama, bukan karena banyak | M18 |");
  });
  test("Konsep yang lahir: butir sama dengan naskah (ADR 22, observability, outbox, dua tempat)", () => {
    const adr22 = naskah.split("\n").find((b) => b.startsWith("| 22 |"))!;
    expect(adr22).toContain("Panggilan keluar tidak di dalam transaction; timeout 3 detik di setiap client");
    expect(adr22).toContain("pool tetap 10");
    const m18naskah = naskah.split("\n").find((b) => b.startsWith("| M18 | 3 |"))!;
    expect(m18naskah).toContain("ADR 22: panggilan keluar tidak pernah di dalam transaction; setiap client punya timeout 3 detik; pool tidak dinaikkan");
    harus("ADR 22 menetapkan panggilan keluar di luar transaction, timeout 3 detik di setiap client yang memanggil layanan luar, dan pool yang tidak dinaikkan.");
    harus("- [[t3-pool]]: connection pool, Little's Law, dan timeout. Lama satu panggilan, bukan banyaknya pembayaran, yang membuat pool penuh.");
    harus("- [[t3-observability]]: log, metric, dan trace. Selama pembekuan log server kosong, dan satu transaction yang menunggu hanya terlihat dari PostgreSQL.");
    harus("- [[t3-outbox]]: outbox transaksional dan worker. Pemberitahuan ditulis di transaction jurnal, lalu dikirim worker sesudah COMMIT, jadi layanan push yang diam tidak menahan koneksi.");
    harus("- [[t3-dua-tempat]]: susunan pertama yang memanggil push di dalam transaction, dan tiga hal yang harus selalu benar.");
    expect(naskah).toContain("Pemberitahuan tidak mendahului uangnya.");
    expect(naskah).toContain("Tiga hal harus selalu benar:");
    expect(halaman.trimEnd().split("\n").filter((b) => b.trim() !== "").slice(-3, -2)[0]).toBe("Pool habis karena lama, bukan karena banyak.");
  });
});

describe("klaim dokumentasi: tiap kalimat dipasangkan dengan baris RISET, versi, dan tanggal", () => {
  const baris = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`))!;
  test("net/http: Timeout nol berarti tanpa batas waktu (R3-08, Go 1.27.3)", () => {
    expect(baris("R3-08")).toContain("net/http client.go: \"A Timeout of zero means no timeout\"");
    expect(baris("R3-08")).toContain("Go 1.27.3");
    harus("Dokumentasi `net/http` menulis bahwa Timeout nol berarti tanpa batas waktu, jadi `Kirim` menunggu selama layanan push diam. Sumbernya [net/http Client](https://pkg.go.dev/net/http#Client), Go 1.27.3, dibuka 2026-10-26 (Tidak dijalankan).");
  });
  test("pg_stat_activity: arti idle in transaction (R3-125, PostgreSQL 17)", () => {
    expect(baris("R3-125")).toContain("idle in transaction: The backend is in a transaction, but is not currently executing a query.");
    expect(baris("R3-125")).toContain("PostgreSQL 17.11");
    expect(baris("R3-125")).toContain("postgresql.org/docs/17/monitoring-stats.html");
    expect(baris("R3-125")).toContain("dibuka 2026-10-26");
    harus("Sumbernya [pg_stat_activity](https://www.postgresql.org/docs/17/monitoring-stats.html), dibuka 2026-10-26 (Tidak dijalankan).");
    expect(m18).toContain("state = 'idle in transaction'");
  });
  test("database/sql: konteks batal membatalkan transaction (R3-63, Go 1.27.3)", () => {
    expect(baris("R3-63")).toContain("If the context is canceled, the sql package will roll back the transaction.");
    expect(baris("R3-63")).toContain("Go 1.27.3");
    expect(baris("R3-63")).toContain("DB.BeginTx");
    harus("Dokumentasi `database/sql` menulis bahwa bila konteks dibatalkan, paket `sql` membatalkan (roll back) transaction itu. Sumbernya [DB.BeginTx](https://pkg.go.dev/database/sql#DB.BeginTx), Go 1.27.3, dibuka 2026-10-26 (Tidak dijalankan).");
  });
  test("Future.timeout: source future masih bisa selesai; perilaku http dan dio belum diperiksa (R3-94, Dart 3.13.7)", () => {
    expect(baris("R3-94")).toContain("api.dart.dev/stable/dart-async/Future/timeout.html (Dart 3.13.7, dibuka 2026-10-26)");
    expect(baris("R3-94")).toContain("source future masih bisa selesai normal sesudah batas waktu");
    expect(baris("R3-94")).toContain("package `http` dan `dio`");
    expect(baris("R3-94")).toContain("[perlu verifikasi]");
    expect(riset).toContain("- Timeout di package `http` dan `dio` (R3-94): apakah permintaan HTTP ikut dibatalkan atau koneksinya ditutup; tidak dijalankan.");
    harus("**App Flutter belum tentu menyerah dengan cara itu.** Lab menutup koneksi TCP saat menyerah, jadi bagian C adalah kasus terbaik.");
    harus("Dokumentasi `Future.timeout` menulis bahwa source future masih bisa selesai normal sesudah batas waktu. Sumbernya [Future.timeout](https://api.dart.dev/stable/dart-async/Future/timeout.html), Dart 3.13.7, dibuka 2026-10-26 (Tidak dijalankan).");
    harus("App yang hanya memakai `Future.timeout` belum tentu menutup koneksinya. Perilaku package `http` dan `dio` tidak dibaca dan tidak dijalankan [perlu verifikasi].");
    expect(bebanPy).toMatch(/conn\.close\(\)/);
    expect(bebanPy).toContain("http.client.HTTPConnection(\"127.0.0.1\", self.port, timeout=batas)");
  });
  test("label sumber: Tidak dijalankan tepat empat kali, tiap kali sesudah tanggal dibuka; satu [perlu verifikasi]; satu Ilustrasi", () => {
    expect(hitung(halaman, /\(Tidak dijalankan\)/g)).toBe(4);
    expect(hitung(halaman, /dibuka 2026-10-26 \(Tidak dijalankan\)/g)).toBe(4);
    expect(hitung(halaman, /\[perlu verifikasi\]/g)).toBe(1);
    expect(hitung(halaman, /\(Ilustrasi\)/g)).toBe(1);
    expect(hitung(halaman, /\(Asumsi cerita\)/g)).toBe(1);
    expect(hitung(halaman, /Rekaman lab/g)).toBeGreaterThanOrEqual(8);
    const tautan = [...halaman.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]);
    expect(tautan).toEqual([
      "https://pkg.go.dev/net/http#Client",
      "https://www.postgresql.org/docs/17/monitoring-stats.html",
      "https://pkg.go.dev/database/sql#DB.BeginTx",
      "https://api.dart.dev/stable/dart-async/Future/timeout.html",
    ]);
  });
});

describe("rujukan [[ID]] dan registry", () => {
  test("setiap [[ID]] ada di registry, tiap rujukan bernama sesuai halamannya, dan urutannya sama dengan halaman", () => {
    const semua = new Set([...halaman.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!));
    for (const id of semua) expect(entri(id), `[[${id}]] tidak ada di registry`).toBeDefined();
    const peran: [string, string][] = [
      ["t3-skema", "skema data"],
      ["A0", "cara pakai"],
      ["t3-observability", "observability"],
      ["t3-dua-tempat", "dua tempat"],
      ["t3-prd", "prd v3"],
      ["t3-pool", "connection pool"],
      ["t3-outbox", "outbox"],
    ];
    for (const [id, kata] of peran) expect(entri(id)!.judul.toLowerCase(), id).toContain(kata);
    expect([...semua].sort()).toEqual(peran.map((p) => p[0]).sort());
    const lokasi = [...halaman.matchAll(/(.{0,28})\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => `${m[1]}→${m[2]}`);
    expect(lokasi).toEqual([
      "· coba 3 menit · Prasyarat: →t3-skema",
      "dan Tidak dijalankan ada di →A0",
      "napa itu penting dibahas di →t3-observability",
      "ngan client HTTP bawaan Go (→t3-dua-tempat",
      " pertanyaan pertama PRD v3 (→t3-prd",
      "- →t3-pool",
      "- →t3-observability",
      "- →t3-outbox",
      "- →t3-dua-tempat",
    ]);
  });
  test("Prasyarat 3.5 dan Berikutnya: halaman tidak merujuk Tahap 4 atau jembatan, dan 3.6 menyebut 3.7 hanya lewat ID", () => {
    expect(halaman).not.toMatch(/\[\[t4-/);
    expect(halaman).not.toMatch(/\[\[t3-jembatan\]\]/);
    expect(entri("t3-skema")!.nomor).toBe("3.5");
    expect(entri("t3-observability")!.nomor).toBe("3.7");
    expect(entri("t3-pool")!.nomor).toBe("3.8");
    expect(entri("t3-outbox")!.nomor).toBe("3.9");
    expect(entri("t3-dua-tempat")!.nomor).toBe("3.4");
  });
  test("tidak ada ID riset atau ID internal di teks yang tampil, dan 3.6 tidak memakai SKIP LOCKED", () => {
    for (const t of [halaman, frontmatter, rantaiTeks, skenarioMentah]) {
      expect(t).not.toMatch(/\bR\d-\d{2,3}\b/);
      expect(t).not.toMatch(/SKIP LOCKED/);
    }
  });
});

describe("Rantai t3-m18-pool-penuh: teks simpul dan sub dari rekaman", () => {
  test("judul, sumber, dan tiga baris", () => {
    expect(rantai.judul).toBe("Push menggantung: kapan pool penuh");
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-pool · m18.txt bagian A, B, dan C" });
    const ringkas = rantai.baris.map((b) => ({ label: b.label, sub: b.sub, simpul: b.simpul.map((s) => [s.teks, s.sub, s.nada]) }));
    expect(ringkas).toEqual([
      {
        label: "Pool 10, app terus menunggu",
        sub: `beban ${jadwal[1]} request per detik`,
        simpul: [
          ["Push tidak menjawab", "client push tanpa batas waktu", "biasa"],
          ["Tiap pembayaran menahan 1 koneksi", `pembayaran ke-${idle[3]![0]}: idle in transaction ${idle[3]![1]}`, "biasa"],
          ["Pool penuh", `antara detik ke-${penuhA[1]} dan ke-${penuhA[2]}`, "warn"],
          ["Pembacaan saldo tidak dijawab", `${bacaSesudah[2]} dari ${bacaSesudah[1]} dalam ${batasBaca[1]} detik`, "warn"],
        ],
      },
      {
        label: "Pool 50, usul Raka",
        sub: "beban yang sama",
        simpul: [
          ["Push tidak menjawab", "client push tanpa batas waktu", "biasa"],
          ["Pembayaran ke-50 menahan koneksi terakhir", `idle in transaction ${poolB.dipakai}`, "biasa"],
          ["Pool penuh", `antara detik ke-${penuhB[1]} dan ke-${penuhB[2]}`, "warn"],
          ["Pembacaan saldo tidak dijawab", `${bacaSesudahB[2]} dari ${bacaSesudahB[1]} dalam ${batasBaca[1]} detik`, "warn"],
        ],
      },
      {
        label: "App menyerah sesudah 5 detik",
        sub: "pool 10",
        simpul: [
          ["App memutus pembayaran", `${bayarC[2]} dari ${bayarC[1]} tanpa jawaban`, "biasa"],
          ["Koneksi kembali ke pool", `puncak ${puncakC[1]} dari ${puncakC[2]} terpakai`, "good"],
          ["Pembacaan saldo dijawab", `${bacaC[2]} dari ${bacaC[1]} dengan 200`, "good"],
        ],
      },
    ]);
    expect(rantai.baris[2]!.label).toBe(`App menyerah sesudah ${batasC[2]} detik`);
    expect(B.some((b) => b === "pembayaran ke-50 sampai di layanan push: idle in transaction 50")).toBe(true);
    expect(rantai.catatan).toBe("Pool yang lebih besar menunda pembekuan, dan app yang menyerah menahan lebih sedikit koneksi. Tidak satu pun membuat layanan push menjawab.");
  });
});

describe("skenario alur t3-m18.json: tiap langkah dari rekaman, kode, dan hitungan", () => {
  const semuaRekaman = `${m18}\n${rentan}`;
  const garis = (l: Langkah): string[] => l.kirim.split("\n");
  test("sumber, komponen, panjang jalur, dan tebakan", () => {
    expect(skenario.sumber.jenis).toBe("rekaman");
    expect(skenario.sumber.file).toBe("labs/t3-pool/output/m18.txt");
    expect(skenario.sumber.fileVarian).toBe("labs/t3-pool/output/m18.txt");
    for (const f of [skenario.sumber.file, "labs/api-t3/output/rentan.txt"]) expect(terlacak ? terlacak.has(f) : true).toBe(true);
    expect(skenario.sumber.catatan).toContain("labs/api-t3/output/rentan.txt bagian A");
    expect(skenario.sumber.catatan).toContain("lab api-t3 tidak punya app Flutter");
    expect(skenario.sumber.catatan).toContain("beban berjadwal tetap 17,4 request per detik (bukan acak)");
    expect(skenario.sumber.catatan).toContain("Ubah satu hal: m18.txt bagian C");
    expect(skenario.sumber.catatan).toContain("PostgreSQL 17.11");
    expect(m18).toContain("# PostgreSQL 17.11");
    expect(skenario.komponen.map((k) => k.label)).toEqual(["App", "Server Go", "PostgreSQL", "Layanan push (tiruan)"]);
    expect(skenario.perangkat).toEqual([{ id: "budi", label: "HP Budi" }]);
    expect(skenario.langkah).toHaveLength(9);
    expect(skenario.varian.mulai).toBe(3);
    expect(skenario.varian.langkah).toHaveLength(4);
    expect(skenario.varian.mulai + skenario.varian.langkah.length).toBeLessThanOrEqual(10);
    expect(skenario.varian.label).toBe(`app menyerah sesudah ${batasC[2]} detik`);
    expect(skenario.predict.varian).toBe(false);
    expect(skenario.predict.answer).toBe(1);
    expect(skenario.predict.options[skenario.predict.answer]).toBe("Tidak ada jawaban: server butuh satu koneksi bebas, bahkan untuk memeriksa sesi");
    expect(skenario.predict.options).toHaveLength(4);
    expect(skenario.predict.q).toBe(`Pembayaran ke-${idle[3]![0]} sudah sampai di layanan push dan belum dijawab, jadi ${idle[3]![1]} koneksi pool terpakai semua. Budi membuka saldonya. Apa yang diterima app Budi?`);
    expect(skenario.predict.explain).toBe(`Tidak ada jawaban. Sesudah pool penuh, ${bacaSesudah[2]} dari ${bacaSesudah[1]} pembacaan tidak dijawab dalam ${batasBaca[1]} detik (m18.txt bagian A), dan GET /akun/419 juga tidak dijawab (rentan.txt bagian A). Server memakai satu koneksi untuk memeriksa sesi sebelum membaca saldo.`);
    expect(skenario.pengantar).toContain("Layanan push menerima koneksi dan tidak pernah menjawab.");
    expect(semuaRekaman).toContain("menerima permintaan, tidak pernah menjawab");
  });
  test("tiap baris kirim ada di rekaman, kecuali satu baris ringkasan panah dan empat bentuk request yang dipasangkan dengan kode atau rekaman", () => {
    const ringkasanPanah = ["→ pool 10 koneksi: transaction pembayaran ke-1 memakai satu"];
    const bentukRequest: Record<string, [string, string]> = {
      "POST /transfers": [handlerGo, 'mux.HandleFunc("POST /transfers"'],
      "POST /v1/pesan, di dalam transaction": [pushGo, 'k.url+"/v1/pesan"'],
      "GET /akun/419": [rentan, "GET '/akun/419'"],
      "Authorization: Bearer <token sesi Budi>": [rentan, "-H 'Authorization: Bearer <token sesi Budi>'"],
    };
    const semua = [...skenario.langkah, ...skenario.varian.langkah].flatMap(garis);
    for (const g of semua) {
      if (g.startsWith("→")) expect(ringkasanPanah, g).toContain(g);
      else if (g in bentukRequest) expect(bentukRequest[g]![0], g).toContain(bentukRequest[g]![1]);
      else expect(semuaRekaman, `baris kirim tidak ada di rekaman: ${g}`).toContain(g);
    }
    expect(semua.filter((g) => g.startsWith("→"))).toHaveLength(1);
    expect(notif).toContain("s.push.Kirim(context.WithoutCancel(ctx), d.Token");
    expect(skenario.langkah[0]!.kirim).toBe(`POST /transfers\n${ringkasanPanah[0]}`);
  });
  test("jalur utama: judul, komponen, nada, dan angka di jelas turunan dari rekaman dan hitungan", () => {
    const L = skenario.langkah;
    expect(L.map((l) => [l.dari, l.ke ?? null, l.nada ?? null])).toEqual([
      ["app", "api", null],
      ["api", "push", "warn"],
      ["db", null, null],
      ["app", "api", null],
      ["api", "db", "warn"],
      ["app", "api", null],
      ["api", "db", "warn"],
      ["api", "app", "warn"],
      ["api", "push", "warn"],
    ]);
    expect(L.map((l) => l.judul)).toEqual([
      "Pembayaran pertama datang",
      "Server memanggil layanan push di dalam transaction",
      "Transaction diam, koneksinya ditahan",
      "Pembayaran ke-2 sampai ke-9 menahan satu koneksi lagi tiap kali",
      "Pembayaran ke-10 menahan koneksi terakhir",
      "Budi membuka saldonya",
      "Server meminta koneksi, dan pool kosong",
      "Budi tidak mendapat jawaban",
      `Sesudah 30 detik, ${tigaPuluh[4]} pembayaran mengantre`,
    ]);
    expect(L[0]!.jelas).toBe(`Pembayaran biasa, seperti di Tahap 2. Di puncak, satu pembayaran datang tiap ±${koma(tiap, 2)} detik (1 ÷ ${koma(lambda, 3)}, Asumsi).`);
    expect(L[1]!.jelas).toBe(`Client push tidak punya batas waktu (push timeout ${kepalaPool[2]}), jadi transaction tetap terbuka sampai layanan push menjawab. Ia tidak pernah menjawab.`);
    expect(L[1]!.kirim).toContain(`server log: api-t3 siap: pool ${kepalaPool[1]}, push timeout ${kepalaPool[2]}s, idle-tx ${kepalaPool[3]}s`);
    expect(L[2]!.jelas).toBe("PostgreSQL tidak menjalankan query apa pun untuk transaction itu. Transaction terbuka karena server Go menunggu layanan push.");
    expect(L[2]!.kirim).toBe(`=> SELECT count(*) AS idle_in_transaction FROM pg_stat_activity WHERE application_name = 'api-t3' AND state = 'idle in transaction'\npembayaran ke-${idle[0]![0]} sampai di layanan push: idle in transaction ${idle[0]![1]}`);
    expect(L[3]!.kirim).toBe(`pembayaran ke-${idle[1]![0]} sampai di layanan push: idle in transaction ${idle[1]![1]}\npembayaran ke-${idle[2]![0]} sampai di layanan push: idle in transaction ${idle[2]![1]}`);
    expect(L[3]!.jelas).toBe(`Tidak ada jawaban dari layanan push, jadi tidak ada koneksi yang kembali ke pool. Pembacaan saldo masih dijawab: ${bacaSebelum[2]} dari ${bacaSebelum[1]} sebelum pool penuh.`);
    expect(L[4]!.kirim).toBe(`pembayaran ke-${idle[3]![0]} sampai di layanan push: idle in transaction ${idle[3]![1]}\npool 10 penuh antara detik ke-${penuhA[1]} dan ke-${penuhA[2]} sejak beban mulai (hitungan 10 ÷ 0,87 = ${penuhA[3]})`);
    expect(L[4]!.jelas).toBe(`Hitungan 10 ÷ ${koma(lambda, 3)} = ±${koma(penuh10, 1)} detik (Asumsi); lab memakai 0,87 dengan hasil yang sama dalam satu desimal. Dari sini pool tidak punya koneksi bebas.`);
    expect(koma(10 / lambdaLab, 1)).toBe(koma(penuh10, 1));
    expect(L[5]!.jelas).toBe("Pembacaan butuh satu koneksi, bahkan untuk memeriksa sesi Budi.");
    expect(L[6]!.kirim).toBe(`$ curl -i -X GET '/lab/pool'\n{"dipakai":${poolA.dipakai},"maks":${poolA.maks},"terbuka":${poolA.terbuka}}`);
    expect(L[6]!.jelas).toBe(`Sepuluh dari sepuluh koneksi dipakai, dan tidak satu pun akan kembali selama layanan push diam. Request Budi menunggu.`);
    expect(poolA.dipakai).toBe(poolA.maks);
    expect(L[7]!.kirim).toBe(`(tidak ada jawaban)\nPembacaan sesudah pool penuh (request 201 sampai 400): ${bacaSesudah[1]} pembacaan: tanpa jawaban x${bacaSesudah[2]}`);
    expect(L[7]!.jelas).toBe(`Server tidak mengirim jawaban apa pun, termasuk pesan galat. Di lab, ${bacaSesudah[2]} dari ${bacaSesudah[1]} pembacaan sesudah pool penuh tidak dijawab dalam ${batasBaca[1]} detik.`);
    expect(L[8]!.kirim).toBe(tigaPuluh[0]!.replace(/^# /, ""));
    expect(L[8]!.jelas).toBe(`Hanya ${tigaPuluh[3]} pembayaran yang sampai ke layanan push. Sisanya mengantre di pool. Angka ${tigaPuluh[1]} hanya jadwal × waktu, karena tidak ada pembayaran yang selesai.`);
    expect(README_POOL).toContain("Angka 26 hanya jadwal × waktu, karena tidak ada pembayaran yang selesai");
  });
  test("varian: app menyerah sesudah 5 detik, dari bagian C", () => {
    const V = skenario.varian.langkah;
    expect(V.map((l) => [l.dari, l.ke ?? null, l.nada ?? null])).toEqual([["app", "api", "warn"], ["api", "db", "good"], ["app", "api", "good"], ["api", "push", "warn"]]);
    expect(V.map((l) => l.judul)).toEqual([
      `App memutus pembayaran sesudah ${batasC[2]} detik`,
      "Transaction dibatalkan, koneksi kembali",
      "Budi membuka saldonya",
      "Layanan push tetap menahan permintaan",
    ]);
    expect(V[0]!.kirim).toBe(`pembayaran request 1 sampai 400: ${bayarC[1]} pembayaran: tanpa jawaban x${bayarC[2]}`);
    expect(V[0]!.jelas).toBe(`App di HP berhenti menunggu sesudah ${batasC[2]} detik dan menampilkan "timeout". Jawaban pembayaran tidak pernah sampai: ${bayarC[2]} dari ${bayarC[1]} tanpa jawaban.`);
    expect(V[1]!.kirim).toBe(C.find((b) => b.startsWith("koneksi idle in transaction: puncak"))!);
    expect(V[1]!.jelas).toBe(`Server membatalkan transaction saat app memutus, jadi koneksinya kembali ke pool. Pada satu saat paling banyak ${puncakC[5]} koneksi terpakai, dan pool tidak penuh.`);
    expect(V[2]!.kirim).toBe(`pembacaan request 1 sampai 400: ${bacaC[1]} pembacaan: 200 x${bacaC[2]}`);
    expect(V[2]!.jelas).toBe(`Pool punya koneksi bebas, jadi ${bacaC[2]} dari ${bacaC[1]} pembacaan dijawab dengan 200.`);
    expect(V[3]!.kirim).toBe(tahanC[0]!.replace(/^# /, ""));
    expect(V[3]!.jelas).toBe("App yang menyerah melindungi pool, tetapi tidak menghentikan server menunggu layanan push. Perbaikan yang benar ada di [[t3-pool]].");
    expect(entri("t3-pool")?.nomor).toBe("3.8");
  });
  test("layar HP: hanya teks dari rekaman atau kalimat umum, tanpa saldo yang tidak direkam", () => {
    const semuaLayar = [skenario.layarAwal, ...skenario.langkah.map((l) => l.layar ?? {}), ...skenario.varian.langkah.map((l) => l.layar ?? {})];
    expect(JSON.stringify(semuaLayar)).not.toContain('"saldo"');
    const teks = semuaLayar.flatMap((x) => Object.values(x).flatMap((s) => (s.isi ?? []).map((i) => i.teks).filter(Boolean)));
    expect(teks).toEqual(["Saldo dan riwayat", "Lihat saldo", "Memuat saldo...", "Memuat saldo...", "Belum ada jawaban dari server", "Saldo dimuat"]);
    expect(skenario.langkah[7]!.layar!.budi!.nada).toBe("warn");
    expect(skenario.varian.langkah[2]!.layar!.budi!.nada).toBe("good");
  });
});
describe("klaim 'tidak ada' dan lingkup: dipindai dari kode dan perintah lab, bukan dari output", () => {
  const berkasLab = (awalan: string, ekstensi: RegExp): string[] => {
    if (terlacak) return [...terlacak].filter((f) => f.startsWith(awalan) && !f.includes("/output/") && ekstensi.test(f));
    return [];
  };
  test("penyedia push sungguhan tidak dipakai: tak ada googleapis.com di kode Go non-tes api-t3 dan di skrip t3-pool", () => {
    const go = berkasLab("labs/api-t3/", /\.go$/).filter((f) => !f.endsWith("_test.go"));
    expect(go.length).toBeGreaterThan(10);
    for (const f of go) expect(baca(f), f).not.toContain("googleapis.com");
    const py = berkasLab("labs/t3-pool/", /\.py$/);
    expect(py.length).toBeGreaterThanOrEqual(6);
    for (const f of py) expect(baca(f), f).not.toContain("googleapis.com");
    harus("Penyedia push sungguhan tidak dipakai.");
    expect(baca("labs/t3-pool/README.md")).toContain("Layanan push selalu tiruan lokal.");
  });
  test("mode rentan: push di dalam transaction dengan context.WithoutCancel, pool 10 bawaan, tanpa batas waktu bila timeout 0", () => {
    expect(notif).toContain('const RentanPushDalamTx = "push-dalam-tx"');
    expect(notif).toMatch(/if s\.rentan == RentanPushDalamTx \{\s+for _, d := range perangkat \{\s+if err := s\.push\.Kirim\(context\.WithoutCancel\(ctx\)/);
    expect(mainGo).toContain('pool := flag.Int("pool", 10,');
    expect(pushGo).toContain("return Klien{url: url, http: &http.Client{Timeout: batas}}");
    expect(umumPy).toContain("# Client pembacaan menyerah sesudah 3 detik. ");
  });
  test("tiga kalimat negatif tidak kehilangan kata 'tidak' di halaman", () => {
    for (const k of ["tidak memuat satu baris pun", "tidak pernah menjawab", "tidak dipakai", "tidak membuktikan pembatalan", "tidak pernah sampai COMMIT", "tidak dibaca dan tidak dijalankan", "tidak direkam", "tidak ada rebutan lock buku"]) {
      expect(halaman, k).toContain(k);
    }
  });
});

describe("Snippet berrentang baris di halaman", () => {
  interface Potongan { file: string; a: number; b: number; judul: string }
  const potongan: Potongan[] = [];
  for (const m of halaman.matchAll(/<Snippet\b[^]*?\/>/g)) {
    const tag = m[0];
    const judul = tag.match(/\btitle="([^"]*)"/)?.[1] ?? "";
    const satu = tag.match(/\bfile="([^"]+)"/)?.[1];
    const rentang = tag.match(/\blines="(\d+):(\d+)"/);
    if (satu && rentang) potongan.push({ file: satu, a: Number(rentang[1]), b: Number(rentang[2]), judul });
  }
  const petaBagian: Record<string, Record<string, Bagian>> = {
    "labs/t3-pool/output/m18.txt": MP,
    "labs/api-t3/output/rentan.txt": RP,
  };
  test("tujuh Snippet berrentang, dan tiap rentang rekaman ada di bagian yang disebut judulnya", () => {
    expect(potongan).toHaveLength(7);
    const rekaman = potongan.filter((p) => petaBagian[p.file]);
    expect(rekaman).toHaveLength(5);
    for (const p of rekaman) {
      const huruf = p.judul.match(/bagian ([A-Z])/)![1]!;
      const b = bagian(petaBagian[p.file]!, huruf);
      expect(p.a, `${p.file}:${p.a}:${p.b} di luar bagian ${huruf} (${b.awal}-${b.akhir})`).toBeGreaterThanOrEqual(b.awal);
      expect(p.b, `${p.file}:${p.a}:${p.b} di luar bagian ${huruf} (${b.awal}-${b.akhir})`).toBeLessThanOrEqual(b.akhir);
    }
  });
  test("judul Snippet menyebut tepat bagian rekaman yang disentuh rentangnya", () => {
    for (const p of potongan.filter((x) => petaBagian[x.file])) {
      const semuaBagian = petaBagian[p.file]!;
      const baris = baca(p.file).split("\n");
      const disentuh = Object.entries(semuaBagian).filter(([, b]) => p.a <= b.akhir && p.b >= b.awal && baris.slice(Math.max(p.a, b.awal) - 1, Math.min(p.b, b.akhir)).some((x) => x.trim() !== "")).map(([h]) => h).sort();
      expect(disentuh, `${p.file}:${p.a}:${p.b}`).toEqual([p.judul.match(/bagian ([A-Z])/)![1]!]);
    }
    expect(potongan.map((p) => p.judul)).toEqual([
      "Kode lab: labs/api-t3/internal/service/notif.go baris 99 sampai 107 (mode rentan push-dalam-tx)",
      "Kode lab: labs/api-t3/internal/push/push.go baris 36 sampai 39 (batas 0 berarti tanpa batas waktu)",
      "Rekaman lab: labs/t3-pool/output/m18.txt, bagian A (koneksi yang ditahan)",
      "Rekaman lab: labs/t3-pool/output/m18.txt, bagian A (pool penuh dan pembacaan)",
      "Rekaman lab: labs/api-t3/output/rentan.txt, bagian A (request ke-11)",
      "Rekaman lab: labs/t3-pool/output/m18.txt, bagian B (pool 50)",
      "Rekaman lab: labs/t3-pool/output/m18.txt, bagian C (app menyerah sesudah 5 detik)",
    ]);
    for (const p of potongan.filter((x) => x.file.endsWith(".go"))) expect(p.judul).toContain(`baris ${p.a} sampai ${p.b}`);
  });
  // Jangkar: baris pertama, baris terakhir, dan isi yang dijelaskan prosa. Menggeser kode atau rekaman menggagalkan tes ini.
  const jangkar: Record<string, { awal: string; akhir: string; ada: string[] }> = {
    "labs/api-t3/internal/service/notif.go:99:107": { awal: "func (s Service) beritahu(", akhir: "}", ada: ["if s.rentan == RentanPushDalamTx", "s.push.Kirim(context.WithoutCancel(ctx), d.Token", "push gagal, hanya dicatat", "return nil"] },
    "labs/api-t3/internal/push/push.go:36:39": { awal: "// Baru: batas 0 membuat client tanpa batas waktu", akhir: "}", ada: ["func Baru(url string, batas time.Duration) Klien", "http: &http.Client{Timeout: batas}"] },
    "labs/t3-pool/output/m18.txt:13:18": { awal: "=> SELECT count(*) AS idle_in_transaction", akhir: "Cuplikan pg_stat_activity tiap 50 ms menandai saat koneksi ke-10 terlihat.", ada: ["idle in transaction 1", "idle in transaction 5", "idle in transaction 9", "idle in transaction 10", "Pembayaran ke-10 tiba pada detik 11,5 jadwal"] },
    "labs/t3-pool/output/m18.txt:19:23": { awal: "pool 10 penuh antara detik ke-11 dan ke-12", akhir: "tanpa jawaban x190", ada: ['{"dipakai":10,"maks":10,"terbuka":10}', "190 pembacaan: 200 x190", "tanpa jawaban x190"] },
    "labs/api-t3/output/rentan.txt:21:29": { awal: "# Request ke-11: Budi hanya membuka saldonya", akhir: '"terbuka":10}', ada: ["(tidak ada jawaban)", "Semua layar ikut membeku", '"menunggu":1'] },
    "labs/t3-pool/output/m18.txt:41:47": { awal: "pool 50 penuh antara detik ke-57 dan ke-58", akhir: "tidak berubah.", ada: ['{"dipakai":50,"maks":50,"terbuka":50}', "Sebelum pool penuh tidak ada request yang gagal", "18 pembacaan: tanpa jawaban x18", "Pool 50 menunda pembekuan dari 11,5 ke 57,5 detik"] },
    "labs/t3-pool/output/m18.txt:56:66": { awal: "# Client pembacaan menyerah sesudah 3 detik. Client pembayaran menyerah sesudah 5 detik", akhir: "11,5 detik.", ada: ["puncak 5 dari 10", "20 pembayaran: tanpa jawaban x20", "380 pembacaan: 200 x380", "jurnal_bayar", "masih menahan 26 permintaan"] },
  };
  test("tiap rentang punya jangkar, dan jangkarnya masih di baris yang sama", () => {
    for (const p of potongan) {
      const kunci = `${p.file}:${p.a}:${p.b}`;
      const j = jangkar[kunci];
      expect(j, `rentang ${kunci} belum punya jangkar di tes ini`).toBeDefined();
      const baris = baca(p.file).split("\n").slice(p.a - 1, p.b);
      const cocok = (b: string, pola: string): boolean => (pola === "}" ? b.trim() === "}" : b.includes(pola));
      expect(cocok(baris[0]!, j!.awal), `${kunci}: bukan awal "${j!.awal}": ${baris[0]}`).toBe(true);
      expect(cocok(baris[baris.length - 1]!.replace(/\s+$/, ""), j!.akhir), `${kunci}: bukan akhir "${j!.akhir}": ${baris[baris.length - 1]}`).toBe(true);
      for (const s of j!.ada) expect(baris.join("\n"), `${kunci} tidak memuat ${s}`).toContain(s);
    }
    for (const k of Object.keys(jangkar)) expect(potongan.some((p) => `${p.file}:${p.a}:${p.b}` === k), `jangkar ${k} tidak dipakai halaman`).toBe(true);
  });
  test("Snippet tanpa rentang menunjuk berkas yang ada, dan rekaman penuh ada di lipatan untuk pembaca tanpa JavaScript", () => {
    for (const m of halaman.matchAll(/<Snippet\b[^]*?\/>/g)) {
      const f = m[0].match(/\bfile="([^"]+)"/)?.[1];
      if (f) expect(fs.existsSync(path.join(akar, f)), f).toBe(true);
    }
    harus('<Snippet file="labs/t3-pool/output/m18.txt" title="Rekaman lab: labs/t3-pool/output/m18.txt" />');
    harus("<summary>Rekaman bagian A sampai C (juga untuk pembaca tanpa JavaScript)</summary>");
    expect(Object.keys(MP)).toEqual(["A", "B", "C"]);
    harus('<WidgetLama nama="alur" src="data/skenario/t3-m18.json" />');
  });
});

describe("blok Coba dan tampilan: urutan blok, tebak sebelum hasil, dan pengantar widget", () => {
  test("lima blok masalah dalam urutan templat, dua pertama terbuka", () => {
    const blok = [...halaman.matchAll(/<Blok nama="([^"]+)"( buka)?>/g)].map((m) => [m[1], Boolean(m[2])]);
    expect(blok).toEqual([["Gejala", true], ["Yang Raka kira", true], ["Yang sebenarnya", false], ["Coba sendiri", false], ["Konsep yang lahir", false]]);
    expect(halaman).not.toContain("ilustrasi=");
    expect(halaman).toContain('<SkripLama daftar={["hp","alur-core","alur"]} />');
  });
  test("Coba: pengantar tebak dulu, ubah satu hal, dan layar HP digambar dari rekaman", () => {
    harus("Widget ini mengikuti rekaman `m18.txt` bagian A dari satu pembayaran sampai Budi membuka saldonya. Tebak dulu apa yang diterima app Budi, lalu tekan Berikutnya atau panah kanan.");
    harus(`Sesudah langkah terakhir, centang **Ubah satu hal: app menyerah sesudah ${batasC[2]} detik**.`);
    harus(`Layanan push tetap menahan ${tahanC[1]} permintaan.`);
    harus("Layar HP di widget digambar dari isi rekaman: lab `api-t3` tidak punya app Flutter.");
    expect(skenario.varian.label).toBe(`app menyerah sesudah ${batasC[2]} detik`);
    expect(baca("labs/api-t3/README.md")).not.toMatch(/flutter run|pubspec/);
  });
  test("halaman tidak memuat tebakan alur yang bocor: jawaban pilihan tidak tertulis sebelum blok Coba", () => {
    const sebelumCoba = halaman.split('<Blok nama="Coba sendiri">')[0]!;
    expect(sebelumCoba).not.toContain("Tidak ada jawaban: server butuh satu koneksi bebas");
    expect(sebelumCoba).not.toContain("Status 503 segera");
  });
});
