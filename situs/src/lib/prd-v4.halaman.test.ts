// Penjaga halaman 4.1 (keputusan 1266 sampai 1268): angka, nomor ADR, nomor halaman, ID `[[...]]`, label sumber, dan klaim
// negatif di prd-v4.mdx dan di diagram Rantai t4-prd-sebelum-sesudah.json harus bisa diturunkan dari naskah Tahap 4
// (bagian 1 dan bagian 3), registry cerita.json, rekaman lab (t3-instance, t4-kartu), dan halaman Tahap 1 dan 3 yang dirujuk.
// Halaman ini merangkum dokumen PRD v4 dan membuka jawaban tebakan jembatan 3.32, jadi tanpa tes ini mengubah satu angka,
// satu nomor ADR, satu tautan, satu label, satu sel tabel, atau satu klaim negatif tidak menggagalkan build atau alat ukur.
// Lingkup klaim negatif: halaman ini dan bagian 1 naskah Tahap 4 (bukan semua PRD, bukan semua lab).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-prd-sebelum-sesudah.json";
import dataTebak from "../../data/widget/t3-jembatan-tebak.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const T = (n: 1 | 2 | 3, f: string): string => baca(`situs/src/content/docs/tahap-${n}/${f}`);
const mdx = baca("situs/src/content/docs/tahap-4/prd-v4.mdx");
const front = mdx.split(/^---\n/m)[1]!;
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah4 = baca("plan/CERITA-TAHAP-4.md");
const bag1 = naskah4.split("## 1. PRD v4 · Rekeningo dibuka ke publik")[1]!.split("\n## 2. ")[0]!;
const bagPRD = bag1.split("Halaman 4.1 membuka jawaban tebakan di halaman 3.32")[0]!;
const bag3 = naskah4.split("## 3. Inti teknis Tahap 4")[1]!.split("\n## 3b. ")[0]!;
const rantai = DataRantai.parse(diagramMentah);
const rantaiTeks = JSON.stringify(diagramMentah);
const j32 = T(3, "jembatan-prd-v4.mdx");
const prd3 = T(3, "prd-v3.mdx");
const est3 = T(3, "estimasi.mdx");

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; path?: string }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const koma = (n: number, d = 1) => n.toFixed(d).replace(".", ",");
const titik = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const di = (sumber: string, nama: string, kalimat: string) => expect(sumber, `${nama} tidak memuat: ${kalimat}`).toContain(kalimat);
const barisTabel = (awal: string): string[] => {
  const b = badan.split("\n").find((x) => x.startsWith(awal));
  expect(b, `baris tabel "${awal}" tidak ada`).toBeDefined();
  return b!.split("|").slice(1, -1).map((c) => c.trim());
};
const sel = (b: string) => b.split("|").slice(1, -1).map((c) => c.trim());
const tanpaTitik = (s: string) => s.trim().replace(/\.$/, "");
const hitung = (s: string, x: string) => s.split(x).length - 1;

// Beban dari registry (sama dengan sinkron_cerita.py dan halaman 3.29).
const a3 = cerita.tahap[2]!.asumsi;
const a4 = cerita.tahap[3]!.asumsi;
const puncak = (a: { user: number; aktif: number; req: number; puncak: number }) => (((a.user * a.aktif) / 100) * a.req) / 86400 * a.puncak;
const aktif3 = (a3.user * a3.aktif) / 100;
const aktif4 = (a4.user * a4.aktif) / 100;
const reqHari4 = aktif4 * a4.req;
const p3 = puncak(a3);
const p4 = puncak(a4);
const trxHari4 = aktif4 * a4.trx;
const trxDetik4 = (trxHari4 / 86400) * a4.puncak;
const lambda3 = ((aktif3 * a3.trx) / 86400) * a3.puncak;
// Top-up per user aktif per hari: Asumsi naskah bagian 3 (bukan registry).
const barisTopupNaskah = bag3.split("\n").find((b) => b.startsWith("| Top-up dari bank |"))!;
const topupPerUser = Number(barisTopupNaskah.match(/(\d,\d+) top-up per user aktif per hari \(Asumsi\)/)![1]!.replace(",", "."));
const topupHari = aktif4 * topupPerUser;
const topupDetik = (topupHari / 86400) * a4.puncak;
// Kapasitas worker: c dan t dari halaman 3.29.
const ct = est3.match(/c = (\d+) pengirim serentak dan t = (0,\d) detik/)!;
const cWorker = Number(ct[1]);
const tWorker = Number(ct[2]!.replace(",", "."));
const kapasitas = cWorker / tWorker;

describe("registry, meta, dan susunan blok", () => {
  test("4.1 ada, jenis PRD, jalur inti, prasyarat jembatan 3.32, menit sama dengan baris meta", () => {
    expect(dari("t4-prd")).toMatchObject({ ada: true, nomor: "4.1", jenis: "prd", inti: true, prasyarat: ["t3-jembatan"], tahap: 4, path: "tahap-4/prd-v4.md" });
    expect(mdx).toContain('title: "4.1 PRD v4: Rekeningo dibuka ke publik"');
    expect(dari("t4-prd").judul).toBe("PRD v4: Rekeningo dibuka ke publik");
    expect(dari("t3-jembatan").nomor).toBe("3.32");
    const m = badan.match(/<p class="meta">Baca (\d+) menit · Prasyarat: \[\[t3-jembatan\]\] · Jalur inti<\/p>/);
    expect(m, "baris meta").not.toBeNull();
    expect(dari("t4-prd").menit).toBe(Number(m![1]));
    expect(naskah4).toContain("| 4.1 | 1 | PRD v4: Rekeningo dibuka ke publik | PRD | ★ | – | – |");
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const kata = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(kata / 200 - dari("t4-prd").menit!), `${kata} kata`).toBeLessThanOrEqual(1.5);
  });
  test("delapan blok sesuai templat PRD: hanya blok pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Latar masalah", "Tujuan", "User dan kebutuhan barunya", "Ruang lingkup", "Metrik dan batasan", "Tim dan risiko", "Pertanyaan terbuka", "Yang dibuka lagi dari Tahap 3"]);
    expect(cekTemplat("prd", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Latar masalah"]);
  });
  test("tingkat heading: halaman tidak memakai heading markdown, label tebal saja", () => {
    expect(badan.match(/^#{1,6} /gm)).toBeNull();
    expect(front).not.toMatch(/^#/m);
  });
  test("kalimat pembuka menunjuk ringkasan di 3.32 dan menjanjikan jawaban tebakan di blok terakhir", () => {
    harus("Sinta menulis PRD keempat ini untuk **PT Rekeningo** (fiktif), perusahaan yang dibuka untuk publik. Ringkasannya sudah tampil di [[t3-jembatan]]. Halaman ini memuat dokumen lengkapnya, dan blok terakhir membuka jawaban atas tebakan di sana.");
    di(j32, "3.32", "<Tebak client:visible data={dataTebak} tautan={tautanTebak} />");
    expect(daftarBlok(badan).at(-1)!.nama).toBe("Yang dibuka lagi dari Tahap 3");
  });
  test("3.32 menjanjikan PRD lengkap di 4.1; kepala dokumen sama, dan 13 engineer di rentang 10 sampai 15 dan sama dengan 5 + 4 + 4", () => {
    di(j32, "3.32", "Rincian tiap fitur ada di PRD v4 lengkap, di awal Tahap 4.");
    di(j32, "3.32", "Tahap 3 selesai di sini. PRD v4 lengkap ada di [[t4-prd]].");
    for (const k of ["<dt>Penulis</dt><dd>Sinta, unit Inisiatif Digital</dd>", "<dt>Syarat baru</dt><dd>Pak Hadi, Kepala Divisi Keuangan</dd>", `<dd>PT Rekeningo (fiktif): ${titik(a4.user)} user terdaftar, merchant di luar Lestari</dd>`]) {
      harus(k);
      di(j32, "3.32", k);
    }
    const tim = [...naskah4.matchAll(/\*\*Tim (Pembayaran|Merchant|Platform)\*\* \((\d+) orang/g)].map((m) => Number(m[2]));
    expect(tim).toEqual([5, 4, 4]);
    const jumlah = tim.reduce((x, y) => x + y, 0);
    expect(jumlah).toBe(13);
    expect(a4.tim).toBe("13 developer, 3 tim");
    expect(j32).toContain("<dd>10 sampai 15 engineer dalam tiga tim, 12 minggu</dd>");
    expect(jumlah >= 10 && jumlah <= 15).toBe(true);
    harus(`<dd>12 minggu, ${jumlah} engineer dalam tiga tim</dd>`);
    expect(naskah4).toContain("| 4.1 |");
    expect(naskah4).toContain("(Asumsi cerita)");
    expect(bag1).toContain("**Ruang lingkup (publik, 100.000 user terdaftar, 20.000 aktif per hari, 13 orang, 12 minggu).**");
    harus("Lingkupnya publik: 100.000 user terdaftar dan 20.000 aktif per hari, dikerjakan 13 orang selama 12 minggu.");
    harus("[[t3-jembatan]] menyebut empat fitur P0, dua fitur P1, dan satu baris P2.");
    di(j32, "3.32", "Enam fitur diminta di PRD v4: empat P0 dan dua P1.");
    di(j32, "3.32", "Hal lain ditunda ke v5 (P2): laporan merchant real-time, notifikasi massal skala besar, cicilan dan tabungan, dan API publik untuk POS.");
  });
  test("deskripsi frontmatter: lingkup dan tim dari registry dan naskah", () => {
    const d = front.match(/^description: (.+)$/m)![1]!;
    expect(d).toBe("Dokumen produk keempat Rekeningo. Sinta menulisnya untuk PT Rekeningo yang dibuka ke publik, Pak Hadi memperluas satu syaratnya, dan 13 engineer dalam tiga tim punya 12 minggu.");
    expect(naskah4).toContain("**Pak Hadi** menambah satu syarat: setiap rupiah dari luar cocok dengan catatan pihak yang mengirimnya.");
    expect(bag1).toContain("**Batasan.** 13 engineer dalam tiga tim selama 12 minggu.");
  });
});

describe("beban dan lingkup: angka turunan dari registry dan naskah", () => {
  test("tabel beban: 100.000 user, 20.000 aktif, 1,2 juta request, ±138,9 puncak, 60.000 transaksi uang, 6,94 per detik, 5.000 top-up, 0,579 per detik", () => {
    expect([a4.user, a4.aktif, a4.req, a4.puncak, a4.trx]).toEqual([100000, 20, 60, 10, 3]);
    expect(topupPerUser).toBe(0.25);
    expect([titik(aktif4), titik(reqHari4), koma(p4), koma(p4, 2), titik(trxHari4), koma(trxDetik4, 2), titik(topupHari), koma(topupDetik, 3)]).toEqual(["20.000", "1.200.000", "138,9", "138,89", "60.000", "6,94", "5.000", "0,579"]);
    expect(barisTabel("| User terdaftar |")).toEqual(["User terdaftar", titik(a4.user), "PRD v4"]);
    expect(barisTabel("| User aktif harian (DAU) |")).toEqual(["User aktif harian (DAU)", titik(aktif4), `${titik(a4.user)} × ${a4.aktif}% (asumsi)`]);
    expect(barisTabel("| Request per hari |")).toEqual(["Request per hari", titik(reqHari4), `${titik(aktif4)} × ${a4.req} request (asumsi)`]);
    expect(barisTabel("| Puncak request per detik |")).toEqual(["Puncak request per detik", `±${koma(p4)}`, `${titik(reqHari4)} ÷ 86.400 × ${a4.puncak} = ${koma(p4, 2)} (asumsi)`]);
    expect(barisTabel("| Transaksi uang per hari (bayar, transfer, QR) |")).toEqual(["Transaksi uang per hari (bayar, transfer, QR)", titik(trxHari4), `${titik(aktif4)} × ${a4.trx} transaksi (asumsi)`]);
    expect(barisTabel("| Transaksi uang per detik di puncak |")).toEqual(["Transaksi uang per detik di puncak", koma(trxDetik4, 2), `${titik(trxHari4)} ÷ 86.400 × ${a4.puncak} (asumsi)`]);
    expect(barisTabel("| Top-up dari bank per hari |")).toEqual(["Top-up dari bank per hari", titik(topupHari), `${titik(aktif4)} × ${koma(topupPerUser, 2)} top-up (asumsi)`]);
    expect(barisTabel("| Top-up dari bank per detik di puncak |")).toEqual(["Top-up dari bank per detik di puncak", koma(topupDetik, 3), `${titik(topupHari)} ÷ 86.400 × ${a4.puncak} (asumsi)`]);
    harus("**Beban yang diharapkan (Asumsi)**");
    expect(barisTopupNaskah).toContain("5.000 per hari");
    expect(barisTopupNaskah).toContain("0,579 puncak");
  });
  test("nilai yang sama dengan tabel 3.29 dan jembatan 3.32", () => {
    di(est3, "3.29", `| Puncak request per detik | ${koma(p3)} | ${koma(p4)} | ${titik(reqHari4)} ÷ 86.400 × 10 |`);
    di(est3, "3.29", `| Transaksi uang: bayar, transfer, QR | ${titik(trxHari4)} | ${koma(trxDetik4, 2)} | ${titik(aktif4)} × 3 transaksi; 5% dari semua request |`);
    di(est3, "3.29", `| Top-up dari bank | ${titik(topupHari)} | ${koma(topupDetik, 3)} | ${titik(aktif4)} × 0,25 top-up |`);
    di(j32, "3.32", `| Beban puncak (Asumsi) | ±${koma(p3)} request per detik | ±${koma(p4)} request per detik, naik 8 kali ([[t3-estimasi]]) |`);
    di(j32, "3.32", "Lingkup | Enam kota: ±10.000 karyawan, ±60 warung | Publik: 100.000 user terdaftar (Asumsi), merchant di luar Lestari");
  });
  test("puncak naik 8 kali: tiga pengali dari angka yang tertulis, dan 138,9 ÷ 17,4 = 7,98 (selisih hanya pembulatan)", () => {
    expect(a3.aktif).toBe(25);
    expect(a3.req).toBe(a4.req);
    const kali = (a4.user / a3.user) * (a4.aktif / a3.aktif) * (a4.req / a3.req);
    expect(kali).toBe(8);
    expect(koma(138.9 / 17.4, 2)).toBe("7,98");
    expect(koma(p3)).toBe("17,4");
    harus(`Puncaknya naik ${kali} kali dari puncak PRD v3 (±${koma(p3)}): ${a4.user / a3.user} × (${a4.aktif} ÷ ${a3.aktif}) × (${a4.req} ÷ ${a3.req}) = ${kali}. User naik ${a4.user / a3.user} kali, user aktif turun dari ${a3.aktif}% ke ${a4.aktif}%, dan request per user tetap ${a4.req}. Dari angka yang dibulatkan, ${koma(138.9)} ÷ ${koma(17.4)} = ${koma(138.9 / 17.4, 2)}, dan selisihnya dari ${kali} hanya pembulatan. Rumusnya sama dengan [[t3-estimasi]].`);
    di(est3, "3.29", "Dari angka yang dibulatkan, 138,9 ÷ 17,4 = 7,98. Selisihnya dari 8 hanya pembulatan");
    di(est3, "3.29", "Hasil kalinya 10 × (20 ÷ 25) × (60 ÷ 60) = 8");
    di(prd3, "3.1", `| Puncak request per detik | ±${koma(p3)} |`);
  });
  test("worker notifikasi: 6,94 + 0,579 = 7,52 per detik, kapasitas 4 ÷ 0,3 = 13,33, pemakaian 56% (Tahap 3: 6,5%)", () => {
    expect([cWorker, tWorker, koma(kapasitas, 2)]).toEqual([4, 0.3, "13,33"]);
    const notif = Number(koma(trxDetik4, 2).replace(",", ".")) + Number(koma(topupDetik, 3).replace(",", "."));
    expect(koma(notif, 2)).toBe("7,52");
    expect(Math.round((notif / Number(koma(kapasitas, 2).replace(",", "."))) * 100)).toBe(56);
    expect(Math.round((lambda3 / Number(koma(kapasitas, 2).replace(",", "."))) * 100 * 10) / 10).toBe(6.5);
    expect(koma(lambda3, 3)).toBe("0,868");
    harus(`Yang terdekat adalah worker notifikasi: ${koma(trxDetik4, 2)} + ${koma(topupDetik, 3)} = ${koma(notif, 2)} per detik, dibagi kapasitas ${koma(kapasitas, 2)} per detik, sama dengan 56%. Di Tahap 3 pemakaiannya 6,5% (Hitungan; kapasitas dari ${cWorker} pengirim dan ${koma(tWorker, 1)} detik per pengiriman adalah Asumsi).`);
    di(est3, "3.29", "| Pemakaian worker, puncak | 6,5% | 56% | 100% |");
    di(est3, "3.29", "Di tabel halaman ini, tidak satu komponen pun melewati batasnya hanya karena jumlah request.");
    harus("[[t3-estimasi]] tidak menemukan satu komponen pun di tabelnya yang melewati batasnya hanya karena jumlah request.");
  });
  test("jendela backup: 24 jam, 60.000 + 5.000 = 65.000 per hari; pemicu ADR 33 tetap terbuka", () => {
    expect(trxHari4 + topupHari).toBe(65000);
    expect(bag1).toContain("±65.000 per hari di Tahap 4 (60.000 + 5.000");
    harus(`Backup \`pg_dump\` harian berjendela sampai 24 jam, dan sehari memuat rata-rata ±${titik(trxHari4 + topupHari)} transaksi uang dan top-up: ${titik(trxHari4)} + ${titik(topupHari)} (Hitungan atas Asumsi).`);
    const t30 = T(3, "sengaja-belum.mdx");
    di(t30, "3.30", "Backup `pg_dump` harian: jendela kehilangan data sampai 24 jam (Hitungan; jadwal Asumsi)");
    di(t30, "3.30", "| VPS kedua | Waktu pulih terukur atau jendela kehilangan data lebih besar dari yang bisa diterima Pak Hadi atau PRD. PRD v3 tidak menulis batas itu |");
    expect(bag1).toContain("PRD v3 dan PRD v4 tidak menulis batas itu");
    expect(bag1).toContain("jendelanya menurut penyedia belum diketahui, jadi pemicu ADR 33 tetap pertanyaan terbuka");
    harus("PostgreSQL terkelola bisa menggantikan jadwal itu, tetapi jendelanya menurut penyedia belum diketahui. Jadi pemicu ADR 33 tetap pertanyaan terbuka.");
    harus("**ADR 33, VPS kedua.** Pemicunya adalah waktu pulih atau jendela kehilangan data yang lebih besar dari yang bisa diterima Pak Hadi atau PRD ([[t3-adr-33]]). PRD v3 tidak menulis batas itu, dan PRD v4 juga tidak.");
  });
});

describe("isi PRD: tujuan, user, fitur, metrik, batasan, tokoh, risiko, pertanyaan dari naskah bagian 1", () => {
  test("empat tujuan sama dengan naskah", () => {
    const t = [...bag1.match(/\*\*Tujuan\.\*\*(.+)/)![1]!.matchAll(/\((\d)\) (.+?\.)(?= \(\d\)|$)/g)].map((m) => `${m[1]}. ${m[2]}`);
    expect(t).toHaveLength(4);
    for (const x of t) harus(x);
  });
  test("tabel user sama dengan naskah, baris demi baris", () => {
    const user = bag1.split("\n").filter((b) => /^\| (User umum|Merchant luar|Warung Lestari|Tim risk|Keuangan|Security reviewer) /.test(b));
    expect(user).toHaveLength(6);
    for (const b of user) expect(badan.split("\n"), b).toContain(b);
    harus("| User | Kebutuhan baru | Yang membuatnya berhenti memakai |");
  });
  test("tabel lingkup: tujuh baris sama dengan naskah, kata demi kata, dan prioritas empat P0, dua P1, satu P2", () => {
    const baris = bag1.split("\n").filter((b) => /^\| P[0-2] \| /.test(b));
    expect(baris.map((b) => sel(b)[0])).toEqual(["P0", "P0", "P0", "P0", "P1", "P1", "P2"]);
    expect(baris.map((b) => sel(b)[1])).toEqual(["PT Rekeningo berdiri sendiri", "Top-up dari rekening bank lewat gateway", "Verifikasi identitas", "QR untuk merchant di luar Lestari", "Kartu virtual", "Back office untuk tim risk", "Ditunda ke v5"]);
    for (const b of baris) expect(badan.split("\n"), b).toContain(b);
    harus("| Prioritas | Fitur | Keterangan |");
    // Nama dan prioritas fitur sama dengan jembatan 3.32.
    for (const b of baris.slice(0, 6)) {
      const c = sel(b);
      const b32 = j32.split("\n").find((x) => x.startsWith(`| ${c[1]}`));
      expect(b32, `3.32 tidak punya baris "${c[1]}"`).toBeDefined();
      expect(sel(b32!)[1], `prioritas "${c[1]}" di 3.32`).toBe(c[0]);
    }
    expect(sel(baris[6]!)[2]).toBe("Laporan merchant real-time, notifikasi massal skala besar, cicilan dan tabungan, API publik untuk POS");
  });
  test("dua tingkat verifikasi berlabel Asumsi produk, dan batasnya hanya di baris itu dan kalimat artinya", () => {
    expect(bag1).toContain("Dua tingkat (Asumsi produk): belum terverifikasi, boleh top-up dan membayar QR dengan saldo paling banyak Rp1.000.000; terverifikasi, saldo paling banyak Rp10.000.000, boleh transfer dan memegang kartu.");
    const b = barisTabel("| P0 | Verifikasi identitas |")[2]!;
    expect(b).toContain("Dua tingkat (Asumsi produk): belum terverifikasi, boleh top-up dan membayar QR dengan saldo paling banyak Rp1.000.000; terverifikasi, saldo paling banyak Rp10.000.000,");
    expect(hitung(badan, "Rp1.000.000")).toBe(2);
    expect(hitung(badan, "Rp10.000.000")).toBe(2);
    harus("Asumsi produk adalah Asumsi yang berupa pilihan produk. Dua batas saldo di baris verifikasi, Rp1.000.000 dan Rp10.000.000, tidak berasal dari hitungan atau rekaman.");
    // Lab api-t4 menulis batas yang sama sebagai Asumsi produk.
    di(baca("labs/api-t4/README.md"), "README api-t4", "Batas saldo menurut tingkat (Rp1.000.000 belum terverifikasi, Rp10.000.000 terverifikasi, Asumsi produk)");
  });
  test("bukan lingkup v4, metrik, dan batasan sama dengan naskah", () => {
    const bukan = bag1.match(/\*\*Bukan lingkup v4\.\*\* (.+)/)![1]!;
    expect(bukan).toBe("Pembayaran offline, pencairan merchant otomatis lewat bank (tetap file), tarik tunai, kartu fisik, multi-mata uang, dan klaim izin atau kepatuhan regulasi apa pun.");
    harus("**Bukan lingkup v4:** pembayaran offline, pencairan merchant otomatis lewat bank (tetap file), tarik tunai, kartu fisik, multi-mata uang, dan klaim izin atau kepatuhan regulasi apa pun.");
    const naskah = bag1.split("**Metrik keberhasilan (target, Asumsi).**")[1]!.split("\n\n")[1]!.split("\n").filter((b) => b.startsWith("- "));
    const dimdx = badan.split("**Metrik keberhasilan (target, Asumsi)**")[1]!.split("\n\n")[1]!.split("\n").filter((b) => b.startsWith("- "));
    expect(naskah).toHaveLength(6);
    expect(dimdx).toHaveLength(6);
    naskah.forEach((n, i) => {
      if (i === 4) expect(dimdx[i]).toBe(`${n.slice(0, -1)}, yaitu catatan siapa membuka atau mengubah apa, kapan.`);
      else expect(dimdx[i], `metrik ${i + 1}`).toBe(n);
    });
    harus("Metrik kedua mulai dihitung saat gateway mengirim kabar, bukan saat user membayar di app bank.");
    expect(dimdx[1]).toContain("sejak gateway mengirim kabar");
    const batasan = bag1.match(/\*\*Batasan\.\*\* (.+)/)![1]!;
    expect(batasan).toBe("13 engineer dalam tiga tim selama 12 minggu. Infrastruktur baru milik PT, dengan anggaran naik untuk layanan terkelola (Asumsi). Semua pihak ketiga berupa tiruan lokal di lab. Security review oleh Laras lolos sebelum dibuka ke publik.");
    harus("- 13 engineer dalam tiga tim selama 12 minggu (Asumsi cerita).");
    harus("- Infrastruktur baru milik PT, dengan anggaran naik untuk layanan terkelola (Asumsi).");
    harus("- Semua pihak ketiga berupa tiruan lokal di lab.");
    harus("- Security review oleh Laras lolos sebelum dibuka ke publik.");
    harus("**Metrik keberhasilan (target, Asumsi)**");
    harus("**Batasan**");
  });
  test("aturan Pak Hadi: v1 dan v2 dari PRD v2, v3 dari PRD v3, v4 dari naskah", () => {
    const v2 = T(2, "prd-v2.mdx");
    for (const v of ["v1", "v2"]) {
      const b = v2.split("\n").find((x) => x.startsWith(`| ${v} | "`))!;
      expect(b, `PRD v2 punya baris ${v}`).toBeDefined();
      expect(badan.split("\n"), `aturan ${v}`).toContain(b);
    }
    const b3 = prd3.split("\n").find((x) => x.startsWith("| v3 |"))!;
    expect(badan.split("\n"), "aturan v3").toContain(b3);
    const kutip = "Setiap rupiah dari luar harus cocok dengan catatan pihak yang mengirimnya. Kalau tidak cocok, namanya insiden, bukan angka yang saya koreksi.";
    expect(bag1).toContain(`*"${kutip}"*`);
    expect(j32).toContain(`"${kutip}"`);
    expect(bag1).toContain("Aturan Pak Hadi dipertahankan dan diperluas");
    harus(`| v4 | Aturan v3 tetap berlaku, ditambah: "${kutip}" |`);
    harus("Aturan Pak Hadi dipertahankan dan diperluas:");
  });
  test("tabel tiga tim: jumlah orang, pemimpin, dan bidang sama dengan naskah", () => {
    const tim = [...naskah4.matchAll(/\*\*Tim (Pembayaran|Merchant|Platform)\*\* \((\d+) orang, dipimpin (\w+)\) memegang ([^.]+?)(?:;|\.)/g)];
    expect(tim.map((m) => m[1])).toEqual(["Pembayaran", "Merchant", "Platform"]);
    for (const m of tim) {
      const c = barisTabel(`| ${m[1]}: `);
      expect(c[0]).toBe(`${m[1]}: ${m[2]} orang, dipimpin ${m[3]}`);
      expect(c[1]!.startsWith(m[4]!), `bidang tim ${m[1]}`).toBe(true);
    }
    expect(naskah4).toContain("memegang akun, identitas, outbox, infrastruktur, dan keamanan; Raka memegang paket inti app di dalamnya.");
    harus("| Platform: 4 orang, dipimpin Bayu | akun, identitas, outbox, infrastruktur, dan keamanan; paket inti app dipegang Raka |");
    harus("| Tim | Memegang |");
    expect(naskah4).toContain("Tim tumbuh dari 4 menjadi 13 orang dalam tiga tim selama 12 minggu (Asumsi cerita): enam minggu pertama menerima engineer baru bertahap.");
    harus("Tim tumbuh dari 4 menjadi 13 orang dalam tiga tim selama 12 minggu (Asumsi cerita). Enam minggu pertama menerima engineer baru bertahap.");
    expect(a3.tim).toBe("4 developer");
  });
  test("empat tokoh baru sama dengan tabel naskah", () => {
    const tokoh = naskah4.split("### Tokoh baru")[1]!.split("Tokoh lama tetap:")[0]!.split("\n").filter((b) => /^\| \*\*(Laras|Ratih|Bu Marni|Pihak yang mencoba)\*\* /.test(b));
    expect(tokoh).toHaveLength(4);
    expect(badan.match(/^\| Tokoh baru \|/gm)).toHaveLength(4);
    harus("Tahap 4 punya empat tokoh baru:");
    for (const t of tokoh) {
      const c = sel(t);
      const nama = c[0]!.replace(/\*/g, "");
      const tabel = badan.split(`| Tokoh baru | ${nama} |`)[1]!.split("\n\n")[0]!.split("\n");
      const baris = (k: string) => sel(tabel.find((b) => b.startsWith(`| ${k} |`))!)[1]!;
      // Yang halaman potong: ", sesuai naskah Tahap 1" (rujukan naskah, bukan isi cerita).
      expect(tanpaTitik(c[1]!.replace(", sesuai naskah Tahap 1", ""))).toBe(tanpaTitik(baris("Siapa")));
      expect(tanpaTitik(c[2]!)).toBe(tanpaTitik(baris("Ingin")));
      expect(tanpaTitik(c[3]!)).toBe(tanpaTitik(baris("Kelemahan")));
      expect(tanpaTitik(c[4]!)).toBe(tanpaTitik(baris("Yang dibawanya")));
    }
    expect(badan.indexOf("Security engineer yang bergabung di minggu 2.")).toBeGreaterThan(0);
  });
  test("tokoh lama, empat risiko Sinta, dan tiga pertanyaan terbuka sama dengan naskah", () => {
    const lama = naskah4.split("Tokoh lama tetap:")[1]!.split("## 1.")[0]!;
    for (const k of ["**Raka** memegang paket inti app dan masih menulis backend bila perlu.", "**Nadia** memimpin tim Pembayaran", "**Bayu** memimpin tim Platform", "**Wulan** memimpin tim Merchant", "**Budi** kini juga memakai Rekeningo di luar kampus, dengan uang dari rekening pribadinya.", "**Citra** mengisi saldo dari bank dan membayar patungan lewat QR.", "**Ani** satu dari ±60 warung Lestari, kini juga menerima QR.", "**Dimas** tidak muncul di Tahap 4."]) expect(lama, k).toContain(k);
    harus("- Raka memegang paket inti app dan masih menulis backend bila perlu.");
    harus("- Nadia memimpin tim Pembayaran, Bayu memimpin tim Platform, dan Wulan memimpin tim Merchant.");
    harus("- Budi kini juga memakai Rekeningo di luar kampus, dengan uang dari rekening pribadinya. Citra mengisi saldo dari bank dan membayar patungan lewat QR.");
    harus("- Ani satu dari ±60 warung Lestari, dan kini juga menerima QR.");
    harus("- Dimas tidak muncul di Tahap 4.");
    const risiko = bag1.match(/\*\*Risiko yang ditulis Sinta\.\*\* (.+)/)![1]!;
    for (const r of ["menerima kabar dari luar yang menggerakkan uang", "menyimpan data pribadi orang yang tidak dikenal", "dikerjakan tiga tim sekaligus", "endpoint yang belum punya rate limit (daftar, verifikasi, top-up)"]) expect(risiko, r).toContain(r);
    harus("Sinta menulis empat risiko:");
    harus("1. Rekeningo pertama kali menerima kabar dari luar yang menggerakkan uang. Di lab situs ini, pengirim kabar itu tiruan lokal.");
    harus("2. Rekeningo menyimpan data pribadi orang yang tidak dikenal.");
    harus("3. Tiga tim mengerjakan satu codebase sekaligus.");
    harus("4. Pendaftaran terbuka membuka endpoint yang belum punya rate limit: daftar, verifikasi, dan top-up ([[t3-rate-limit-redis]]).");
    di(T(3, "rate-limit-redis.mdx"), "3.17", "endpoint daftar, verifikasi, dan top-up belum punya rate limit");
    expect(naskah4).toContain("Semua pihak ketiga di Tahap 4 adalah tiruan lokal di container lab");
    const q = ["Kalau gateway mengirim kabar dua kali, terlambat, atau tidak mengirim sama sekali, siapa yang tahu?", "Kalau tiga tim mengubah tabel yang sama, siapa yang tahu sebelum rilis?", "Kalau satu orang di dalam membaca data identitas, bagaimana ketahuan?"];
    q.forEach((x, i) => {
      expect(bag1).toContain(`- ${x}`);
      harus(`${i + 1}. ${x}`);
    });
    expect(bag1).toContain("Ketiganya tidak dijawab PRD dan menjadi masalah terbesar Tahap 4.");
    harus("Tidak ada yang menjawabnya sebelum kode ditulis. Ketiganya jadi masalah terbesar Tahap 4. Jawabannya dimulai di [[t4-m29]] dan [[t4-m30]] untuk pertanyaan pertama, [[t4-m32]] untuk yang kedua, dan [[t4-m38]] untuk yang ketiga.");
  });
  test("penunjuk jawaban pertanyaan terbuka menuju masalah dengan nomor dan topik yang benar", () => {
    for (const [id, m] of [["t4-m29", "M29"], ["t4-m30", "M30"], ["t4-m32", "M32"], ["t4-m38", "M38"]] as const) {
      expect(dari(id).judul.startsWith(`${m}:`), `${id} adalah ${m}`).toBe(true);
    }
    expect(naskah4).toMatch(/\| M29 \| 3 \| Budi mengisi Rp200\.000 dari rekening banknya\./);
    expect(naskah4).toMatch(/\| M30 \| 4 \| Sabtu malam sampai Minggu pagi\./);
    expect(naskah4).toMatch(/\| M32 \| 6 \| Kamis 15\.20 tim Merchant merilis\./);
    expect(naskah4).toMatch(/\| M38 \| 11 \| Budi menerima pesan dari orang tak dikenal/);
    expect(naskah4).toContain("Jawabannya ada di M29 sampai M31.");
  });
});

describe("yang dibuka lagi dari Tahap 3: ADR, rekaman, dan nomor halaman", () => {
  const adrDari = (id: string) => dari(id).adr![0]!;
  test("jawaban jembatan 3.32 adalah ADR 22, 25, 26, dan 32, dari widget dan registry", () => {
    const benar = dataTebak.pilihan.find((p) => p.benar)!;
    const nomor = [...benar.teks.split(":")[0]!.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1]));
    expect(nomor).toEqual([adrDari("t3-pool"), adrDari("t3-at-least-once"), adrDari("t3-dua-instance"), adrDari("t3-tim-infra")]);
    expect(nomor).toEqual([22, 25, 26, 32]);
    harus(`Jawabannya ADR ${nomor[0]}, ADR ${nomor[1]}, ADR ${nomor[2]}, dan ADR ${nomor[3]}.`);
    harus('Urutan "lebih dulu" adalah penalaran dari halaman ADR (Asumsi), bukan urutan kejadian yang direkam.');
    expect(dataTebak.sumber.jenis).toBe("asumsi");
    di(j32, "3.32", "Pecah berarti keputusan itu tidak lagi memadai.");
    di(j32, "3.32", "Pertama, halaman ADR itu sendiri menulis keadaannya sebagai syarat salah atau hal yang datang di Tahap 4.");
    harus("Pecah berarti halaman ADR itu sendiri menulis keadaannya sebagai syarat salah atau hal yang datang di Tahap 4.");
    expect(bag1).toContain("Syaratnya berurutan");
    expect(bagPRD).not.toContain("ADR 22");
    expect(bag1).toContain("PRD v4 memenuhi kelimanya sejak dibagikan.");
    harus("Keadaan yang kelima ADR itu tunggu sudah tertulis di PRD sejak dibagikan, jadi tidak ada yang datang sebagai kejutan.");
  });
  test("judul tiap butir memakai nomor ADR dari registry dan baris PRD yang ada di tabel lingkup", () => {
    const butir: Array<[string, string, string]> = [
      ["t3-pool", "panggilan luar", "Kartu virtual"],
      ["t3-at-least-once", "penerima yang menggerakkan uang", "Top-up dari rekening bank"],
      ["t3-dua-instance", "satu VPS", "PT Rekeningo berdiri sendiri"],
    ];
    for (const [id, topik, baris] of butir) {
      harus(`**ADR ${adrDari(id)}, ${topik}: dibuka baris "${baris}".**`);
      expect(badan.split("\n").some((b) => b.startsWith("| P") && sel(b)[1]!.startsWith(baris)), `baris "${baris}" di tabel lingkup`).toBe(true);
    }
    harus(`**ADR ${adrDari("t3-tim-infra")}, rotasi dan alert: dibuka bagian "Batasan".**`);
    harus(`**ADR ${adrDari("t1-adr-12")}, service kedua dan tes contract: dibuka bagian "Batasan".**`);
    harus(`**ADR ${adrDari("t3-adr-33")}, VPS kedua.**`);
    harus("**Batasan**");
    expect([adrDari("t1-adr-12"), adrDari("t3-outbox"), adrDari("t3-rate-limit-redis"), adrDari("t3-cache"), adrDari("t3-xss-csrf"), adrDari("t3-tls-pinning"), adrDari("t3-adr-33")]).toEqual([12, 23, 27, 28, 30, 31, 33]);
    harus('**M28, tiga hal yang belum pernah diuji.** [[t3-m28]] mencatat pihak ketiga yang menggerakkan uang, tiga tim di satu codebase, dan satu VPS sebagai titik gagal tunggal. PRD v4 memuat ketiganya: baris "Top-up dari rekening bank lewat gateway", bagian "Batasan", dan baris "PT Rekeningo berdiri sendiri".');
    const m28 = T(3, "m28-prd-v4.mdx");
    di(m28, "3.28", "| Pihak ketiga yang menggerakkan uang |");
    di(m28, "3.28", "| Tiga tim di satu codebase |");
    di(m28, "3.28", "| Satu VPS sebagai titik gagal tunggal |");
  });
  test("ADR 22: panggilan luar atomik dengan uang, otorisasi kartu; aturan 1 tidak bisa dipenuhi; dijawab dua halaman Tahap 4", () => {
    const p = T(3, "connection-pool.mdx");
    di(p, "3.8", "Pertama, bila panggilan luar harus atomik dengan uang, mis. otorisasi kartu di Tahap 4. Aturan 1 tidak bisa dipenuhi di sana, dan jalur itu butuh pengaman lain.");
    di(p, "3.8", "Halaman Tahap 4 yang membahas panggilan luar yang harus selesai sebelum uang bergerak.");
    harus("Halaman ADR 22 menulis kapan keputusannya salah: bila panggilan luar harus atomik dengan uang, misalnya otorisasi kartu di Tahap 4 ([[t3-pool]]). Otorisasi kartu masuk PRD v4 sebagai P1.");
    harus("Halaman itu menambahkan bahwa aturan 1 tidak bisa dipenuhi di sana, dan jalur itu butuh pengaman lain.");
    expect(naskah4).toContain("dijawab dua ADR. ADR 36 menjawab panggilan keluar ke gateway dan vendor, dan ADR 42 menjawab otorisasi kartu");
    expect([adrDari("t4-breaker"), adrDari("t4-kartu")]).toEqual([36, 42]);
    harus("Revisi ADR 22 dijawab dua halaman: [[t4-breaker]] untuk panggilan keluar ke gateway dan vendor, dan [[t4-kartu]] untuk otorisasi kartu.");
    expect(barisTabel("| P1 | Kartu virtual |")[2]).toContain("penerbit kartu tiruan");
  });
  test("penerbit kartu yang meminta persetujuan: rekaman t4-kartu penerbit.txt bagian A, penerbit tiruan lokal", () => {
    const r = baca("labs/t4-kartu/output/penerbit.txt");
    di(r, "penerbit.txt", "# --- A. Keadaan pertama (dokumentasi satu penerbit): jawaban terlambat diputuskan penerbit menurut setelannya, bukan menurut Rekeningo ---");
    di(r, "penerbit.txt", "AUTH-P1 Rp80.000: setuju (sumber: timeout)");
    di(r, "penerbit.txt", "penerbit tiruan di 127.0.0.1:18285");
    harus("Di PRD v4 penerbit kartu yang meminta persetujuan, dan Rekeningo yang menjawab. Bila jawaban terlambat, penerbit memutuskan menurut setelannya, bukan menurut Rekeningo (Rekaman lab t4-kartu, `penerbit.txt` bagian A, dengan penerbit tiruan lokal).");
    di(baca("labs/api-t4/README.md"), "README api-t4", "Penerbit kartu memanggil Rekeningo untuk meminta persetujuan (otorisasi)");
  });
  test("ADR 25: penerima yang menggerakkan uang wajib idempoten dengan key; jawabannya di halaman webhook", () => {
    const a = T(3, "at-least-once.mdx");
    di(a, "3.13", 'Saat penerimanya menggerakkan uang, misalnya webhook dari gateway di Tahap 4. Penyaring "yang sudah tampil" tidak cukup, dan penerima wajib idempoten dengan key ([[t2-idempotency]]).');
    harus('Saldo bertambah saat gateway memberi tahu, jadi penerima kabar itu menggerakkan uang. ADR 25 menulis bahwa penyaring "yang sudah tampil" tidak cukup di sana, dan penerima wajib idempoten dengan key ([[t3-at-least-once]]). Jawabannya ada di [[t4-webhook]].');
    expect(adrDari("t4-webhook")).toBe(34);
    expect(barisTabel("| P0 | Top-up dari rekening bank lewat gateway |")[2]).toContain("saldo bertambah saat gateway memberi tahu");
    const o = T(3, "outbox-worker.mdx");
    di(o, "3.9", "Saat penerimanya sistem lain yang menggerakkan uang, misalnya webhook di Tahap 4.");
    harus("ADR 23 menulis syarat yang sama dengan ADR 25: penerima sistem lain yang menggerakkan uang ([[t3-outbox]]). Halaman ini menghitungnya sekali, lewat ADR 25.");
    di(j32, "3.32", "ADR 23 menulis syarat yang sama dengan ADR 25: penerima sistem lain yang menggerakkan uang ([[t3-outbox]]).");
  });
  test("ADR 26: satu VPS, rekaman t3-instance panic.txt bagian D: 20 dari 20 menjawab 200, lalu 10 dari 10 menjawab 503", () => {
    const r = baca("labs/t3-instance/output/panic.txt").split("\n");
    const iD = r.findIndex((b) => b.startsWith("# --- D. "));
    const iE = r.findIndex((b) => b.startsWith("# --- E. "));
    expect(iD).toBeGreaterThan(0);
    expect(iE).toBeGreaterThan(iD);
    const D = r.slice(iD, iE);
    expect(D[0]).toBe("# --- D. Dua instance dengan health check dan retry, keduanya mode rentan: satu kematian tertahan, dua kematian tidak ---");
    const m200 = D.map((b) => b.match(/^(\d+) request sesudahnya lewat proxy: 200: (\d+) · 200 per instance: b (\d+)$/)).find((x) => x)!;
    const m503 = D.map((b) => b.match(/^(\d+) request sesudahnya lewat proxy: 503: (\d+) \(503: tidak ada instance yang sehat\)$/)).find((x) => x)!;
    expect(m200.slice(1).map(Number)).toEqual([20, 20, 20]);
    expect(m503.slice(1).map(Number)).toEqual([10, 10]);
    expect(D.join("\n")).toContain("a berhenti sendiri (kode keluar 2)");
    expect(D.join("\n")).toContain("b berhenti sendiri (kode keluar 2)");
    harus(`Satu VPS menjalankan dua instance API, worker, dan Redis. Dalam mode rentan (bug M21), satu instance berhenti sendiri dan ${m200[2]} dari ${m200[1]} request lewat proxy tetap dijawab 200. Instance kedua ikut berhenti, dan ${m503[2]} dari ${m503[1]} request dijawab 503 (Rekaman lab t3-instance, \`panic.txt\` bagian D).`);
    di(j32, "3.32", "| PT Rekeningo berdiri sendiri | P0 | Satu VPS produksi menjalankan dua instance API, worker, dan Redis ([[t3-m28]]) |");
    const d = T(3, "dua-instance.mdx");
    di(d, "3.15", "Satu VPS tetap titik gagal tunggal. Ini diterima sengaja dan dijawab di [[t3-jembatan]] dan [[t3-adr-33]].");
    harus("VPS yang mati menghentikan keduanya (penalaran). ADR 26 menerima titik gagal tunggal itu dengan sengaja ([[t3-dua-instance]]). Begitu uang publik masuk, akibatnya jauh lebih besar.");
    harus("[[t4-infra-secret]] menjawab sebagian: data dan secret, bukan ketersediaan app (Tidak dijalankan: hosting terkelola hanya dijelaskan).");
    expect(adrDari("t4-infra-secret")).toBe(39);
    expect(naskah4).toContain("Ini menjawab sebagian titik gagal tunggal ADR 26: data dan secret, bukan ketersediaan app");
    expect(naskah4).toContain("Hosting terkelola tidak bisa direkam");
  });
  test("ADR 32: tim naik dari empat ke 10 sampai 15 dalam tiga tim; rotasi dan alert dibagi lagi per tim", () => {
    const t = T(3, "tim-infra.mdx");
    di(t, "3.27", "Tim naik dari empat menjadi 10 sampai 15 orang dalam tiga tim (naskah Tahap 3, jembatan), jadi rotasi dan alert dibagi lagi per tim.");
    di(j32, "3.32", "ADR 32: tim naik dari empat ke 10 sampai 15 orang dalam tiga tim, jadi rotasi dan alert dibagi lagi per tim ([[t3-tim-infra]]).");
    harus("ADR 32 menulis bahwa tim naik dari empat menjadi 10 sampai 15 orang dalam tiga tim, jadi rotasi dan alert dibagi lagi per tim ([[t3-tim-infra]]). PRD v4 menulis 13 orang dalam tiga tim, yaitu Pembayaran, Merchant, dan Platform.");
    expect(badan).not.toMatch(/±\s?8 orang|delapan orang/);
  });
  test("ADR 12: service kedua menunggu tim yang bentrok, tes contract OpenAPI dijadwalkan Tahap 4, dua service tidak lagi satu transaction", () => {
    const a = T(1, "sengaja-belum.mdx");
    di(a, "1.40", "| Service kedua | Beberapa tim bentrok di satu repo dan perlu deploy sendiri-sendiri | Tahap 4: modular monolith dan satu service pembayaran |");
    di(a, "1.40", "| Tes yang mencocokkan response dengan kontrak OpenAPI di CI | Rekaman lab masih dibaca manusia ([[B1.4]]) | Tahap 4 |");
    di(a, "1.40", "Pembayaran yang menyentuh dua service tidak lagi bisa dibungkus satu transaction");
    di(a, "1.40", "### Yang juga sengaja belum");
    harus("ADR 12 menunda service kedua sampai beberapa tim bentrok di satu repo. Rencananya Tahap 4: modular monolith dan satu service pembayaran. Ia juga menjadwalkan tes contract OpenAPI di CI untuk Tahap 4 ([[t1-adr-12]]).");
    harus("Tiga tim di satu codebase adalah keadaan yang ADR 12 tunggu. Bentroknya muncul di [[t4-m32]] dan dijawab [[t4-modul]], sedangkan tes contract dikerjakan [[t4-tim-infra]]. ADR 12 juga memperingatkan bahwa pembayaran yang menyentuh dua service tidak lagi bisa dibungkus satu transaction.");
    expect([adrDari("t4-modul"), adrDari("t4-tim-infra")]).toEqual([37, 44]);
    expect(naskah4).toContain("menjadwalkan tes contract OpenAPI di CI untuk Tahap 4, dan ADR 44 mengerjakannya");
    expect(dari("t4-m32").judul).toBe("M32: Rilis Kamis memecahkan top-up");
  });
  test("lima ADR lain yang menyebut Tahap 4: kalimat sama dengan 3.32 dan dengan halaman ADR-nya", () => {
    harus("Lima ADR lain juga menyebut Tahap 4 di halamannya, dengan syaratnya sendiri. Halaman ini hanya mencatat kalimatnya:");
    di(j32, "3.32", "Lima ADR lain juga menyebut Tahap 4 di halamannya.");
    harus("- ADR 27: pendaftaran publik membuka endpoint daftar, verifikasi, dan top-up yang belum punya rate limit ([[t3-rate-limit-redis]]).");
    harus("- ADR 28: puncak naik 8 kali, jadi L katalog dihitung ulang ([[t3-cache]]).");
    harus("- ADR 30: back office tim risk menampilkan data user luar ([[t3-xss-csrf]]).");
    harus("- ADR 31: pindah hosting mengganti server tepi dan mungkin kunci TLS-nya, jadi ADR ini ditinjau ulang sebelum pindah ([[t3-tls-pinning]]).");
    for (const k of ["- ADR 27: pendaftaran publik membuka endpoint daftar, verifikasi, dan top-up yang belum punya rate limit ([[t3-rate-limit-redis]]).", "- ADR 28: puncak naik ±8 kali, jadi L katalog dihitung ulang ([[t3-cache]]).", "- ADR 30: back office tim risk menampilkan data user luar ([[t3-xss-csrf]]).", "- ADR 31: pindah hosting mengganti server tepi dan mungkin kunci TLS-nya, jadi ADR ini ditinjau ulang sebelum pindah ([[t3-tls-pinning]])."]) di(j32, "3.32", k);
    di(T(3, "rate-limit-redis.mdx"), "3.17", "Tahap 4 membuka pendaftaran ke publik, dan endpoint daftar, verifikasi, dan top-up belum punya rate limit");
    di(T(3, "cache-invalidation.mdx"), "3.19", "Tahap 4 menaikkan puncak request ±8 kali");
    di(T(3, "xss-csrf-cookie.mdx"), "3.23", "Tahap 4 menambah back office tim risk yang menampilkan data user luar");
    di(T(3, "tls-pinning.mdx"), "3.25", "Pindah hosting di Tahap 4 ([[t4-m34]]) mengganti server tepi dan mungkin kunci TLS-nya");
    di(T(3, "tls-pinning.mdx"), "3.25", "ADR ini ditinjau ulang sebelum pindah");
  });
  test("dua hal Tahap 3 yang masih terbuka sama dengan 3.32", () => {
    harus("Tahap 4 berangkat dari api-t3 di akhir Tahap 3, belum dari sistem yang sudah dibereskan. Dua hal yang dicatat [[t3-jembatan]] masih terbuka:");
    expect(naskah4).toContain("Tahap 4 berangkat dari `api-t3` di akhir Tahap 3, bukan dari sistem yang sudah dibereskan");
    harus("- Kapasitas satu server belum diukur. Load test dari aturan 5 ADR 21 Tidak dijalankan ([[t3-m28]]).");
    di(j32, "3.32", "- Kapasitas satu server belum diukur. Load test dari aturan 5 ADR 21 Tidak dijalankan ([[t3-m28]]).");
    harus("- Idempotency-Key tetap opsional di bayar, transfer, dan pesanan. App 1.0 dan 1.1 tanpa key tetap rentan terhadap M10 ([[t3-offline]]).");
    di(j32, "3.32", "- Idempotency-Key tetap opsional di bayar, transfer, dan pesanan. App 1.0 dan 1.1 tanpa key tetap rentan M10 ([[t3-offline]]).");
    di(j32, "3.32", "Dua hal dari Tahap 3 belum selesai dan ikut masuk ke PRD v4:");
  });
  test("uji coba enam kota: minggu 10, tutup buku bulan ketiga kurang dari sehari, selisih Rp0 (Ilustrasi dari 3.28)", () => {
    expect(naskah4).toContain("Uji coba enam kota lolos pada minggu ke-10 Tahap 3. Tutup buku bulan ketiga selesai kurang dari sehari dengan selisih Rp0, dan puncak beban 17,4 request per detik.");
    const m28 = T(3, "m28-prd-v4.mdx");
    di(m28, "3.28", "Minggu 10 Tahap 3. Tutup buku bulan ketiga untuk uji coba enam kota selesai dalam kurang dari sehari, dan selisihnya Rp0.");
    di(m28, "3.28", "*Angka cerita (Ilustrasi):* minggu 10, bulan ketiga, kurang dari sehari, dan selisih Rp0 berasal dari naskah");
    harus("Uji coba enam kota lolos di minggu 10 Tahap 3: tutup buku bulan ketiga selesai dalam kurang dari sehari, dengan selisih Rp0 ([[t3-m28]]). Direksi Grup Lestari lalu mendirikan PT Rekeningo supaya orang di luar Lestari bisa memakai Rekeningo.");
    expect(naskah4).toContain("Direksi Grup Lestari mendirikan **PT Rekeningo** (fiktif) supaya orang di luar Lestari bisa memakai Rekeningo.");
    harus("Sasarannya 100.000 user terdaftar, dan 20% aktif tiap hari ([Asumsi](/cara-pakai/#label-sumber)).");
    expect(naskah4).toContain("Sasarannya 100.000 user terdaftar, 20% aktif tiap hari (Asumsi, registry)");
  });
  test("tiga perubahan sekaligus sama dengan naskah", () => {
    harus("Tiga hal berubah sekaligus.");
    expect(naskah4).toContain("Tiga hal berubah sekaligus. Pertama, **uang datang dari luar**");
    harus("1. **Uang datang dari luar.** User mengisi saldo dari rekening bank lewat gateway pembayaran, dan Rekeningo bukan lagi satu-satunya yang tahu kapan uang masuk.");
    harus("2. **User tidak dikenal.** Tidak ada HR Lestari yang menjamin siapa mereka, jadi identitas diverifikasi lewat layanan luar dan foto kartu identitas disimpan.");
    harus("3. **Tim dan perusahaan berpisah dari Lestari.** Ada tiga tim, infrastruktur sendiri, dan akses ke data yang harus bisa dipertanggungjawabkan.");
    for (const k of ["user mengisi saldo dari rekening bank lewat gateway pembayaran, dan Rekeningo bukan lagi satu-satunya yang tahu kapan uang masuk", "tidak ada HR Lestari yang menjamin siapa mereka, jadi identitas diverifikasi lewat layanan luar dan foto kartu identitas disimpan", "tiga tim, infrastruktur sendiri, dan akses ke data yang harus bisa dipertanggungjawabkan"]) expect(naskah4, k).toContain(k);
  });
  test("nomor halaman yang ditaut sesuai registry", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["t1-adr-12", "t3-adr-33", "t3-at-least-once", "t3-cache", "t3-dua-instance", "t3-estimasi", "t3-jembatan", "t3-m28", "t3-offline", "t3-outbox", "t3-pool", "t3-rate-limit-redis", "t3-tim-infra", "t3-tls-pinning", "t3-xss-csrf", "t4-breaker", "t4-infra-secret", "t4-kartu", "t4-m29", "t4-m30", "t4-m32", "t4-m38", "t4-modul", "t4-tim-infra", "t4-webhook"]);
    for (const x of id) expect(hal.some((h) => h.id === x), `[[${x}]] tidak ada di registry`).toBe(true);
    expect(Object.fromEntries(id.map((x) => [x, dari(x).nomor]))).toEqual({
      "t1-adr-12": "1.40", "t3-adr-33": "3.30", "t3-at-least-once": "3.13", "t3-cache": "3.19", "t3-dua-instance": "3.15", "t3-estimasi": "3.29", "t3-jembatan": "3.32", "t3-m28": "3.28", "t3-offline": "3.21", "t3-outbox": "3.9", "t3-pool": "3.8",
      "t3-rate-limit-redis": "3.17", "t3-tim-infra": "3.27", "t3-tls-pinning": "3.25", "t3-xss-csrf": "3.23", "t4-breaker": "4.11", "t4-infra-secret": "4.17", "t4-kartu": "4.23", "t4-m29": "4.6", "t4-m30": "4.8", "t4-m32": "4.12", "t4-m38": "4.24", "t4-modul": "4.13", "t4-tim-infra": "4.26", "t4-webhook": "4.7",
    });
    // Jumlah tiap tautan: mengganti satu ID dengan ID lain gagal di sini.
    const per = Object.fromEntries(id.map((x) => [x, hitung(badan, `[[${x}]]`)]));
    expect(per).toEqual({
      "t1-adr-12": 1, "t3-adr-33": 1, "t3-at-least-once": 1, "t3-cache": 1, "t3-dua-instance": 1, "t3-estimasi": 2, "t3-jembatan": 5, "t3-m28": 3, "t3-offline": 1, "t3-outbox": 1, "t3-pool": 1,
      "t3-rate-limit-redis": 2, "t3-tim-infra": 1, "t3-tls-pinning": 1, "t3-xss-csrf": 1, "t4-breaker": 1, "t4-infra-secret": 1, "t4-kartu": 1, "t4-m29": 2, "t4-m30": 1, "t4-m32": 2, "t4-m38": 1, "t4-modul": 1, "t4-tim-infra": 1, "t4-webhook": 1,
    });
  });
  test("semua nomor ADR yang disebut halaman: tahap 1 sampai 3 saja", () => {
    const semua = [...new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1])))].sort((x, y) => x - y);
    expect(semua).toEqual([12, 21, 22, 23, 25, 26, 27, 28, 30, 31, 32, 33]);
    for (const n of semua) expect(hal.some((h) => h.tahap <= 3 && h.adr?.includes(n)) || n === 21, `ADR ${n} punya halaman`).toBe(true);
    expect(hal.some((h) => h.adr?.includes(21) && h.id === "t2-adr-21")).toBe(true);
  });
  test("tautan label sumber menuju bagian yang ada di /cara-pakai/ dan arti label diberikan di pemakaian pertama", () => {
    harus("[Label sumber](/cara-pakai/#label-sumber)");
    const cp = baca("situs/src/content/docs/cara-pakai.mdx");
    expect(cp).toContain("## Label sumber");
    expect(cp).toContain("- **Rekaman lab**: output asli dari program yang dijalankan di `labs/`");
    expect(cp).toContain("- **Ilustrasi**: contoh atau widget yang disusun dari konsep, bukan direkam dari sistem sungguhan.");
    expect(cp).toContain("- **Asumsi**: angka beban di cerita. Rumusnya ditulis di halaman");
    expect(cp).toContain("- **Tidak dijalankan**: kode hanya dicek ke dokumentasi resmi, tidak dijalankan di lab.");
    harus("Angka di dokumen ini adalah angka cerita (Ilustrasi: contoh, bukan hasil sistem), kecuali yang ditulis Asumsi, Hitungan, atau Rekaman lab. Asumsi adalah angka beban atau pilihan yang rumusnya atau alasannya ditulis di halaman.");
    harus("Hitungan adalah rumus yang ditulis di halaman, dan ia memakai label masukan terlemahnya.");
    // Pemakaian pertama label Asumsi berupa tautan, dan "Tidak dijalankan" baru muncul sesudah kalimat arti labelnya.
    expect(badan.indexOf("Asumsi")).toBe(badan.indexOf("[Asumsi](/cara-pakai/#label-sumber)") + 1);
    expect(badan.indexOf("Tidak dijalankan")).toBeGreaterThan(badan.indexOf("Hitungan adalah rumus"));
    expect(badan.indexOf("Rekaman lab")).toBeGreaterThan(-1);
    expect(badan.indexOf("Hitungan")).toBeGreaterThan(badan.indexOf("Tidak ada HR Lestari") - 1);
  });
});

describe("kalimat bebas yang ditulis halaman (tanpa padanan satu baris di naskah) dan kepala tabel", () => {
  // Putaran mutasi pertama meloloskan 15 mutan di kalimat penghubung, kepala tabel, dan aria-label; semuanya dikunci di sini.
  test("kalimat penghubung dan penutup blok", () => {
    for (const k of [
      "Arti lengkap label sumber ada di [Label sumber](/cara-pakai/#label-sumber).",
      "PRD lengkap menambah keterangan tiap fitur, metrik, risiko, dan pertanyaan terbuka.",
      "Tokoh lama tetap ada:",
      "Tiga pertanyaan ini ada di PRD v4, tapi belum dijawab:",
      "Di [[t3-jembatan]] kamu menebak ADR Tahap 3 mana yang pecah lebih dulu.",
      "PRD lengkap menunjukkan baris mana yang membuka tiap syarat. ADR 12 dari Tahap 1 ikut dibaca ulang.",
      "**Bukan kapasitas.**",
      "Yang pecah lebih dulu adalah syarat di dalam ADR, bukan kapasitas.",
      "Masalah pertama dari semua ini datang di [[t4-m29]].",
      "Rumusnya sama dengan [[t3-estimasi]].",
      "Sinta menulis empat risiko:",
    ]) harus(k);
    expect(naskah4).toContain("Tokoh lama tetap:");
    expect(naskah4).toContain("**Pertanyaan terbuka di PRD.**");
    expect(naskah4).toContain("Halaman 4.1 membuka jawaban tebakan di halaman 3.32 (dari ADR Tahap 3, mana yang pecah lebih dulu?)");
  });
  test("setiap tabel punya kepala, garis pemisah dengan jumlah kolom sama, dan baris sama lebar", () => {
    const baris = badan.split("\n");
    let jumlahTabel = 0;
    for (let i = 0; i < baris.length; i++) {
      if (!baris[i]!.startsWith("|") || (i > 0 && baris[i - 1]!.startsWith("|"))) continue;
      jumlahTabel++;
      const kolom = sel(baris[i]!).length;
      expect(baris[i + 1], `garis pemisah tabel di baris ${i + 1}`).toBe(`|${"---|".repeat(kolom)}`);
      for (let j = i + 2; j < baris.length && baris[j]!.startsWith("|"); j++) expect(sel(baris[j]!).length, `lebar baris ${j + 1}`).toBe(kolom);
    }
    expect(jumlahTabel).toBe(9);
  });
  test("kepala dokumen, judul, dan id diagram persis", () => {
    harus(`<div class="prd-kepala" role="group" aria-label="Kepala dokumen PRD v4">
  <dl><div><dt>Penulis</dt><dd>Sinta, unit Inisiatif Digital</dd></div><div><dt>Syarat baru</dt><dd>Pak Hadi, Kepala Divisi Keuangan</dd></div></dl>
  <dl><div><dt>Lingkup</dt><dd>PT Rekeningo (fiktif): 100.000 user terdaftar, merchant di luar Lestari</dd></div><div><dt>Waktu</dt><dd>12 minggu, 13 engineer dalam tiga tim</dd></div></dl>
</div>`);
    expect(front).toMatch(/^title: "4\.1 PRD v4: Rekeningo dibuka ke publik"$/m);
    expect(rantai.id).toBe("t4-prd-sebelum-sesudah");
    expect(badan).toContain(`data/diagram/${rantai.id}.json`);
    harus("Puncak naik 8 kali, tetapi [[t3-estimasi]]");
  });
  test("kepala tabel dan atribut", () => {
    for (const k of ["| PRD | Aturan Pak Hadi |", "| Besaran | Nilai | Cara hitung |", "| Tim | Memegang |", "| User | Kebutuhan baru | Yang membuatnya berhenti memakai |", "| Prioritas | Fitur | Keterangan |"]) {
      expect(badan.split("\n"), k).toContain(k);
    }
    di(prd3, "3.1", "| PRD | Aturan Pak Hadi |");
    di(prd3, "3.1", "| Besaran | Nilai | Cara hitung |");
    harus('<div class="prd-kepala" role="group" aria-label="Kepala dokumen PRD v4">');
    di(j32, "3.32", '<div class="prd-kepala" role="group" aria-label="Kepala dokumen PRD v4">');
    harus('<p class="meta">Baca');
    expect(badan.match(/<Blok nama=/g)).toHaveLength(8);
    expect(badan.match(/<\/Blok>/g)).toHaveLength(8);
  });
});

describe("klaim negatif dan klaim universal berlingkup", () => {
  test("PRD v4 tidak menulis batas waktu pulih atau jendela kehilangan data: lingkup bagian PRD naskah dan blok sebelum 'Yang dibuka lagi'", () => {
    const POLA = /waktu pulih|jendela kehilangan|\bRPO\b|\bRTO\b|recovery (time|point)/i;
    expect(bagPRD.match(POLA), "bagian PRD naskah").toBeNull();
    const sebelum = badan.split('<Blok nama="Yang dibuka lagi dari Tahap 3">')[0]!;
    expect(sebelum.match(POLA), "blok PRD halaman").toBeNull();
    expect(daftarBlok(badan).slice(0, -1).map((b) => b.nama)).toHaveLength(7);
    expect(badan.match(POLA)).not.toBeNull();
  });
  test("tanpa klaim izin atau regulasi: kata izin, kepatuhan, dan regulasi hanya di kalimat 'Bukan lingkup v4'", () => {
    const POLA = /\bizin\b|kepatuhan|regulasi|lisensi|\bOJK\b|Bank Indonesia|\bBI\b|\bPCI\b|\bGDPR\b|\bKYC\b/gi;
    const kena = badan.split("\n").filter((b) => POLA.test(b));
    POLA.lastIndex = 0;
    expect(kena).toEqual(["**Bukan lingkup v4:** pembayaran offline, pencairan merchant otomatis lewat bank (tetap file), tarik tunai, kartu fisik, multi-mata uang, dan klaim izin atau kepatuhan regulasi apa pun."]);
    expect(front.match(POLA)).toBeNull();
    expect(rantaiTeks.match(POLA)).toBeNull();
    expect(naskah4).toContain("tanpa klaim izin atau kepatuhan regulasi apa pun");
  });
  test("semua pihak ketiga tiruan lokal dan merek nyata tidak dipakai: tanpa nama merek di halaman dan diagram", () => {
    const MEREK = /Stripe|Midtrans|Xendit|Mastercard|\bVisa\b|GoPay|OVO|Dana|QRIS|EMVCo|Google Pay|Apple Pay|PayPal|Tokopedia|Shopee/;
    expect(badan.match(MEREK)).toBeNull();
    expect(rantaiTeks.match(MEREK)).toBeNull();
    harus("- Semua pihak ketiga berupa tiruan lokal di lab.");
  });
  test("klaim penuh dicari tandingannya: tidak ada 'setiap', 'selalu', 'semua', 'tidak pernah' di prosa kecuali yang dikunci", () => {
    const prosa = badan
      .split("\n")
      .filter((b) => !b.startsWith("|") && !b.startsWith("import ") && !b.startsWith("<"))
      .join("\n");
    const kena = [...prosa.matchAll(/[^.\n]*\b(selalu|tidak pernah|tak satu pun|tidak satu pun|di semua|semua stack)\b[^.\n]*\./gi)].map((m) => m[0]!.trim());
    expect(kena).toEqual([]);
    const penuh = [...prosa.matchAll(/[^.\n]*\b(setiap|semua)\b[^.\n]*\./gi)].map((m) => m[0]!.trim());
    // Kata penuh yang tersisa dikunci satu per satu: dua dari naskah (tujuan 4 dan metrik 3), satu batasan dari naskah,
    // dan satu penunjuk ("semua ini") tanpa klaim. Tiap kata penuh yang diucapkan tentang sistem berasal dari naskah PRD.
    expect(penuh).toEqual([
      "Tim risk bisa membekukan dan menelusuri akun, dan setiap akses staf tercatat.",
      "- 0 top-up tercatat dua kali; setiap selisih rekonsiliasi harian menjadi insiden bernomor yang ditutup dalam satu hari kerja.",
      "- Semua pihak ketiga berupa tiruan lokal di lab.",
      "Masalah pertama dari semua ini datang di [[t4-m29]].",
    ]);
    for (const k of ["Tim risk bisa membekukan dan menelusuri akun, dan setiap akses staf tercatat.", "0 top-up tercatat dua kali; setiap selisih rekonsiliasi harian menjadi insiden bernomor yang ditutup dalam satu hari kerja.", "Semua pihak ketiga berupa tiruan lokal di lab."]) expect(bag1, k).toContain(k);
  });
});

describe("diagram Rantai t4-prd-sebelum-sesudah.json", () => {
  test("ilustrasi, dua baris, simpul dari naskah, jembatan 3.32, dan PRD v3", () => {
    expect(rantai.sumber).toEqual({ jenis: "ilustrasi", teks: "Ringkasan PRD v4" });
    expect(rantai.judul).toBe("Sesudah Tahap 3 dan yang diminta PRD v4");
    const bentuk = rantai.baris.map((b) => ({ label: b.label, sub: b.sub ?? null, simpul: b.simpul.map((s) => [s.teks, s.sub ?? null, s.nada ?? null]) }));
    expect(bentuk).toEqual([
      { label: "Sesudah Tahap 3", sub: "yang belum ada", simpul: [
        ["Uang masuk dari admin", "bukan dari rekening bank", "biasa"],
        ["User dikenal HR", "belum ada verifikasi identitas", "biasa"],
        ["Satu VPS, empat engineer", "satu codebase, satu tim", "biasa"],
        ["Hanya karyawan Lestari", `${titik(a3.user)} user, ±60 warung`, "warn"],
      ] },
      { label: "Rekeningo v4", sub: "publik, 12 minggu", simpul: [
        ["Top-up dari bank", "lewat gateway pembayaran", "system"],
        ["Identitas diverifikasi", "dua tingkat saldo", "system"],
        ["Tiga tim, satu PT", "13 engineer, infrastruktur sendiri", "system"],
        ["0 top-up tercatat dua kali", "selisih jadi insiden bernomor", "good"],
      ] },
    ]);
    // Tali ke sumber: tiap simpul meringkas kalimat yang ada di jembatan, PRD v3, atau naskah.
    di(j32, "3.32", "| Uang masuk | Top-up oleh admin, dan top-up massal tiap Senin | Top-up dari rekening bank lewat gateway pembayaran |");
    expect(naskah4).toContain("tidak ada HR Lestari yang menjamin siapa mereka");
    di(prd3, "3.1", "| P2 | Top-up dari rekening bank, kartu virtual, verifikasi identitas | Ditunda ke v4 |");
    di(j32, "3.32", "Satu VPS produksi menjalankan dua instance API, worker, dan Redis");
    di(j32, "3.32", "4 engineer, 10 minggu (Asumsi cerita)");
    di(j32, "3.32", "Tahap 3 dikerjakan satu tim empat orang di satu codebase Go (Asumsi cerita)");
    di(prd3, "3.1", "Lingkupnya enam kota: ±10.000 karyawan dan ±60 warung, selama 10 minggu.");
    di(j32, "3.32", "| User | Karyawan Grup Lestari; user di luar Lestari bukan lingkup | Siapa pun dengan rekening bank |");
    expect(bag1).toContain("Dua tingkat (Asumsi produk)");
    expect(bag1).toContain("- 0 top-up tercatat dua kali; setiap selisih rekonsiliasi harian menjadi insiden bernomor");
    expect(naskah4).toContain("Tim tumbuh dari 4 menjadi 13 orang dalam tiga tim");
    expect(naskah4).toContain("**PT Rekeningo** (fiktif)");
    expect(rantai.catatan).toBe("Kotak biru adalah fitur dan kondisi P0 di PRD v4. Kotak terakhir adalah metrik top-up.");
    expect(badan).toContain('import prdDiagram from "../../../../data/diagram/t4-prd-sebelum-sesudah.json";');
    harus("<Rantai data={prdDiagram} />");
    expect(rantai.baris.map((b) => b.simpul.length)).toEqual([4, 4]);
  });
  test("Rantai ringkas: jumlah kata per simpul pendek supaya dua baris muat di HP", () => {
    for (const b of rantai.baris) for (const s of b.simpul) expect(s.teks.split(" ").length, s.teks).toBeLessThanOrEqual(5);
  });
});

describe("halaman tidak membuka isi Tahap 4 lebih dari PRD-nya, dan ID internal tidak tampil", () => {
  // Hasil dan solusi M29 dan seterusnya dibuka di halaman masalahnya; PRD hanya menunjuk ke sana.
  const TERLARANG = /ADR (3[4-9]|4[0-5])\b|HMAC|tanda tangan|presigned|circuit breaker|\bbreaker\b|object storage|OpenBao|SSRF|\bCRC\b|kill switch|CODEOWNERS|insiden_rekon|webhook_event|rantai hash|jangkar|hold\b|lock_timeout|SKIP LOCKED|expand|schema dan role/i;
  test("halaman dan diagram tidak memuat isi jawaban Tahap 4", () => {
    expect(badan.replace(/\[\[[^\]]+\]\]/g, "").match(TERLARANG), "halaman memuat isi Tahap 4").toBeNull();
    expect(rantaiTeks.match(TERLARANG), "diagram memuat isi Tahap 4").toBeNull();
  });
  test("ID riset, nomor keputusan, nomor PR, dan ID internal tidak tampil", () => {
    for (const t of [badan, front, rantaiTeks]) {
      expect(t).not.toMatch(/\bR\d-\d{2,3}\b/);
      expect(t).not.toMatch(/keputusan \d{2,4}|\bPR #?\d{3}|#\d{3}\b/i);
    }
    expect(badan).not.toMatch(/\b[A-G]\d(\.\d)?\b(?!\))/);
    expect(badan).not.toMatch(/KONSISTENSI|T4-siap|DIRI-\d|EVAL-\d/);
  });
});

describe("semua angka di halaman bisa diturunkan", () => {
  // Setiap angka di prosa dan tabel (tanpa ID, kode, dan nomor ADR) harus ada di himpunan ini; mengubah satu angka
  // menjadi nilai lain yang tidak diturunkan gagal di sini, dan menjadi nilai yang diturunkan tetapi di tempat salah
  // gagal di tes kalimat di atas.
  const diizinkan = new Set<string>([
    titik(a4.user), titik(aktif4), titik(reqHari4), "86.400", titik(trxHari4), titik(topupHari), // beban
    koma(p4), koma(p4, 2), koma(trxDetik4, 2), koma(topupDetik, 3), koma(p3), // puncak, 6,94, 0,579, 17,4
    String(a4.puncak), String(a4.aktif), String(a3.aktif), String(a4.req), // 10, 20, 25, 60
    "8", "10", "7,98", koma(138.9 / 17.4, 2), // pengali puncak
    koma(topupPerUser, 2), // 0,25
    "7,52", koma(kapasitas, 2), "56", "6,5", String(cWorker), koma(tWorker, 1), // worker: 4, 0,3
    titik(trxHari4 + topupHari), // 65.000
    "0", "1", "2", "3", "4", "5", "12", "13", "15", // Rp0, nomor daftar, M10 pecahan, tim 5 + 4 + 4, 12 minggu, 13 engineer, 10 sampai 15
    "99", "90", "100", // metrik: 99%, 90%, 100%
    "400", "59", "60", // merchant luar, warung Lestari lain, warung
    "1.000.000", "10.000.000", "10.000", // dua batas saldo dan 10.000 akun Lestari
    "24", // jam backup
    "20", "200", "503", // 20 dari 20 dan status 200 dan 503 (rekaman panic.txt bagian D)
    "1.0", "1.1", // versi app
    String(dari("t4-prd").menit), // menit baca, dari registry
  ]);
  test("tidak ada angka di luar himpunan turunan", () => {
    const b = badan
      .replace(/^import .*$/gm, "")
      .replace(/\[\[[^\]]+\]\]/g, "")
      .replace(/`[^`]*`/g, "")
      .replace(/\(\/cara-pakai\/[^)]*\)/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\bP[0-2]\b|PRD v\d|\bv[1-5]\b|Tahap \d|ADR \d+|\bM\d+\b|api-t\d|t3-instance|t4-kartu|[a-z][a-z0-9]*-[a-z0-9-]+/g, "");
    const angka = [...new Set(b.match(/\d+(?:[.,]\d+)*/g) ?? [])];
    expect(angka.filter((a) => !diizinkan.has(a))).toEqual([]);
  });
  test("rumus 86.400 detik per hari", () => {
    expect(24 * 60 * 60).toBe(86400);
  });
});

describe("label kejujuran dan arti istilah", () => {
  test("Asumsi di angka beban dan metrik, Rekaman lab di dua rekaman, Tidak dijalankan di dua penalaran", () => {
    harus("**Beban yang diharapkan (Asumsi)**");
    harus("**Metrik keberhasilan (target, Asumsi)**");
    harus("(Ilustrasi: contoh, bukan hasil sistem)");
    harus("(Rekaman lab t3-instance, `panic.txt` bagian D)");
    harus("(Rekaman lab t4-kartu, `penerbit.txt` bagian A, dengan penerbit tiruan lokal)");
    harus("(Tidak dijalankan: hosting terkelola hanya dijelaskan)");
    harus("Load test dari aturan 5 ADR 21 Tidak dijalankan ([[t3-m28]])");
    harus("(Hitungan atas Asumsi)");
    // Label Rekaman lab hanya di label umum dan dua rekaman; Tidak dijalankan hanya di dua tempat.
    expect(hitung(badan, "Rekaman lab")).toBe(3);
    expect(hitung(badan, "Tidak dijalankan")).toBe(2);
    expect(hitung(badan, "Hitungan")).toBe(4);
    expect(hitung(badan, "Ilustrasi")).toBe(1);
    expect(hitung(badan, "(penalaran)")).toBe(1);
    expect(hitung(badan, "(Asumsi cerita)")).toBe(2);
    expect(hitung(badan, "(Asumsi produk)")).toBe(1);
    expect(hitung(badan, "(Asumsi)")).toBe(3);
    // Tiap baris tabel beban berlabel (asumsi) atau menunjuk PRD v4.
    for (const b of badan.split("\n").filter((x) => /^\| (User|Request|Puncak|Transaksi|Top-up dari bank per)/.test(x) && x.includes("÷") || /^\| User (terdaftar|aktif)/.test(x))) expect(/\(asumsi\)|PRD v4/.test(b), b).toBe(true);
  });
  test("istilah baru diberi arti satu kalimat di pemakaian pertamanya, dan artinya dijaga", () => {
    const DEF: Array<[string, string]> = [
      ["**QR**", "adalah kode yang dipindai kamera HP, dan di sini memuat tujuan pembayaran ke satu merchant."],
      ["**Kartu virtual**", "adalah nomor kartu tanpa kartu fisik, untuk belanja online."],
      ["**Back office**", "adalah aplikasi web internal untuk staf, bukan untuk user."],
      ["**Rekonsiliasi**", "adalah mencocokkan catatan sendiri dengan catatan pihak lain."],
    ];
    for (const [istilah, arti] of DEF) {
      harus(`${istilah} ${arti}`);
      const kecil = istilah.replace(/\*/g, "").toLowerCase();
      expect(badan.toLowerCase().indexOf(kecil), `pemakaian pertama "${kecil}" harus yang diberi arti`).toBe(badan.indexOf(istilah) + 2);
    }
    harus("- 100% akses staf ke file dan data identitas tercatat di audit log, yaitu catatan siapa membuka atau mengubah apa, kapan.");
    expect(badan.indexOf("audit log")).toBe(badan.indexOf("audit log, yaitu"));
    // Glosarium: gateway pembayaran dan merchant sudah punya entri sejak 3.32.
    const glos = JSON.stringify(baca("situs/data/glosarium.json"));
    expect(glos).toContain("Gateway pembayaran");
    expect(glos).toContain("Layanan pihak ketiga yang menerima pembayaran dari rekening bank");
    expect(glos).toContain("Pihak yang menerima pembayaran lewat Rekeningo.");
    harus("Empat istilah dipakai di bagian ini dan bagian berikutnya.");
  });
});
