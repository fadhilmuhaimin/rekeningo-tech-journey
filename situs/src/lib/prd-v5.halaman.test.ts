// Penjaga halaman 5.1 (keputusan 1502): angka, nomor ADR, nomor halaman, ID `[[...]]`, label sumber, dan klaim negatif di
// prd-v5.mdx dan di diagram Rantai t5-prd-sebelum-sesudah.json diturunkan dari naskah Tahap 5 (bagian 1, Latar, bagian 3),
// registry cerita.json, kunci tebakan 4.31, halaman ADR Tahap 1 sampai 4, rekaman t4-modul `proses-mati.txt`, dan baris
// riset R5-110 sampai R5-114. Halaman ini merangkum PRD v5 dan membuka jawaban tebakan 4.31 dari kalimat yang sudah tertulis
// di halaman ADR-nya (penalaran, Asumsi), jadi tanpa tes ini satu angka, satu nomor ADR, satu tautan, satu label, satu sel
// tabel, atau satu klaim negatif yang diubah tidak menggagalkan build. Lingkup klaim negatif: halaman ini, bagian 1 naskah
// Tahap 5, halaman ADR Tahap 1 sampai 4 yang disebut, dan folder situs/src/content/docs/tahap-1 sampai tahap-4.
// BARIS_MDX di prd-v5.halaman.nilai.ts adalah sidik teks halaman (tiap baris persis); tes turunan di bawah berdiri sendiri
// tanpa sidik itu, supaya mutan yang mengubah makna (bukan hanya huruf) tertangkap oleh sumbernya.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t5-prd-sebelum-sesudah.json";
import dataTebak from "../../data/widget/t4-jembatan-tebak.json";
import { DataRantai } from "./rantai";
import { cekTemplat, daftarBlok } from "./blok";
import { BARIS_MDX, BENTUK_MDX, NILAI_RANTAI } from "./prd-v5.halaman.nilai";

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
const T = (n: 1 | 2 | 3 | 4, f: string): string => baca(`situs/src/content/docs/tahap-${n}/${f}`);
const BERKAS = "situs/src/content/docs/tahap-5/prd-v5.mdx";
const mdx = baca(BERKAS);
const front = mdx.split(/^---\n/m)[1]!;
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah5 = baca("plan/CERITA-TAHAP-5.md");
const bagian = (sumber: string, awal: string, akhir: string): string => {
  const i = sumber.indexOf(awal);
  expect(i, `bagian tidak ada: ${awal}`).toBeGreaterThanOrEqual(0);
  return sumber.slice(i + awal.length).split(akhir)[0]!;
};
const bag1 = bagian(naskah5, "## 1. PRD v5 · Rekeningo untuk satu negara", "\n## 2. ");
const PENANDA_BUKA = "Halaman 5.1 membuka jawaban tebakan di halaman 4.31";
const bagPRD = bag1.split(PENANDA_BUKA)[0]!;
const bagBuka = bag1.split(PENANDA_BUKA)[1]!;
const latar = bagian(naskah5, "## Latar: dari publik ke seluruh negeri", "\n## 1. ");
const bag3 = bagian(naskah5, "## 3. Inti teknis Tahap 5", "\n## 3b. ");
const rantaiTeks = JSON.stringify(diagramMentah);
const rantai = DataRantai.parse(diagramMentah);
const riset5 = baca("plan/RISET-TAHAP-5.md");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; path?: string }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const berkasHalaman = (id: string): string => `situs/src/content/docs/${dari(id).path!.replace(/\.md$/, ".mdx")}`;
const teksHalaman = (id: string): string => baca(berkasHalaman(id)).replace(/\s+/g, " ");

const koma = (n: number, d = 1) => n.toFixed(d).replace(".", ",");
const titik = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
// Pembulatan setengah ke atas seperti pembaca (toFixed membulatkan 8,684999 ke 8,68; keputusan 1138, #462).
const bulat = (n: number, d = 0): number => Math.floor(n * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const fmt = (n: number, d: number): string => koma(bulat(n, d), d);
const hitung = (s: string, x: string) => s.split(x).length - 1;
const sel = (b: string) => b.split("|").slice(1, -1).map((c) => c.trim());
const tabel = (sumber: string, awal: string): string[][] => {
  const baris = sumber.split("\n");
  const i = baris.findIndex((b) => b.startsWith(awal));
  expect(i, `tabel tidak ada: ${awal}`).toBeGreaterThanOrEqual(0);
  const out: string[][] = [];
  for (let j = i; j < baris.length && baris[j]!.startsWith("|"); j++) out.push(sel(baris[j]!));
  return out.filter((r) => !r.every((c) => /^-+$/.test(c)));
};
const barisAwal = (sumber: string, awal: string): string => {
  const b = sumber.split("\n").find((x) => x.startsWith(awal));
  expect(b, `baris tidak ada: ${awal}`).toBeDefined();
  return b!;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const di = (sumber: string, nama: string, kalimat: string) => expect(sumber, `${nama} tidak memuat: ${kalimat}`).toContain(kalimat);
const sekali = (sumber: string, nama: string, kalimat: string) => expect(hitung(sumber, kalimat), `${nama}: "${kalimat}" harus muncul tepat sekali`).toBe(1);
const normal = (s: string) => s.replace(/\s+/g, " ");

// ---- masukan beban: registry dan naskah, bukan halaman ----------------------------------------------------------------
const a4 = cerita.tahap[3]!.asumsi;
const a5 = cerita.tahap[4]!.asumsi;
const aktif = (a5.user * a5.aktif) / 100;
const reqHari = aktif * a5.req;
const reqRata = reqHari / 86400;
const reqPuncak = reqRata * a5.puncak;
const rowNaskah = (awal: string) => barisAwal(bag3, awal);
const trxDasar = Number(rowNaskah("| Transaksi uang (bayar, transfer, QR) |").match(/200\.000 × (\d) = 600\.000 per hari/)![1]);
const trxHari = aktif * trxDasar;
const trxHari2 = aktif * a5.trx;
const trxPuncak = (trxHari / 86400) * a5.puncak;
const trxPuncak2 = (trxHari2 / 86400) * a5.puncak;
const topupPerUser = Number(rowNaskah("| Top-up dari bank |").match(/aktif × (0,\d+) ÷ 86\.400/)![1]!.replace(",", "."));
const topupHari = aktif * topupPerUser;
const topupPuncak = (topupHari / 86400) * a5.puncak;
const est3 = T(3, "estimasi.mdx");
const ct = est3.match(/c = (\d+) pengirim serentak dan t = (0,\d) detik/)!;
const cKirim = Number(ct[1]);
const tKirim = Number(ct[2]!.replace(",", "."));
const kapasitas = cKirim / tKirim;
const notifPuncak = ((trxHari + topupHari) / 86400) * a5.puncak;
const notifPuncak2 = ((trxHari2 + topupHari) / 86400) * a5.puncak;
const notifPuncak4 = 7.52; // 4.1 dan 4.28: 6,94 + 0,579, dibagi kapasitas 13,33 (56%)
const pakaiWorker = (notifPuncak4 / kapasitas) * 100;
const userTahap4 = a4.user;
const merchant5 = 200000;
const merchant4 = 460;
const pengumumanDetik = (a5.user * tKirim) / cKirim;
const pengumumanDetik4 = (a4.user * tKirim) / cKirim;
const rowPengumuman = rowNaskah("| Pengumuman ke 1.000.000 HP |");
const targetMenit = Number(rowPengumuman.match(/Target (\d+) menit/)![1]);
const lajuTarget = a5.user / (targetMenit * 60);
const pengirimTarget = bulat(lajuTarget * tKirim);
const prosesTarget = bulat(pengirimTarget / cKirim, 0);
const rowKoneksi = rowNaskah("| Koneksi database |");
const kon = rowKoneksi.match(/(\d+) × (\d+) × (\d+) = (\d+) terpasang; tersedia (\d+) − (\d+) = (\d+)/)!;
const koneksiTerpasang = Number(kon[1]) * Number(kon[2]) * Number(kon[3]);
const koneksiTersedia = Number(kon[5]) - Number(kon[6]);
const wQuery = 0.02; // R3-32: 20 ms per query (Asumsi); naskah baris "Koneksi database": L = 1.388,9 × 0,02
const rowPosting = rowNaskah("| Data posting |");
const post = rowPosting.match(/200\.000 × (\d) × (\d) × 365 = 438 juta/)!;
const postingTahun = aktif * trxDasar * Number(post[2]) * 365;
const postingTahun2 = aktif * a5.trx * Number(post[2]) * 365;
const errBudget = (1 - 0.999) * (30 * 24 * 60);

describe("registry, meta, dan susunan blok", () => {
  test("5.1 ada, jenis PRD, jalur inti, prasyarat jembatan 4.31, menit sama dengan baris meta", () => {
    expect(dari("t5-prd")).toMatchObject({ ada: true, nomor: "5.1", jenis: "prd", inti: true, prasyarat: ["t4-jembatan"], tahap: 5, path: "tahap-5/prd-v5.md" });
    expect(mdx).toContain('title: "5.1 PRD v5: Rekeningo untuk satu negara"');
    expect(dari("t5-prd").judul).toBe("PRD v5: Rekeningo untuk satu negara");
    expect(dari("t4-jembatan").nomor).toBe("4.31");
    const m = badan.match(/<p class="meta">Baca (\d+) menit · Prasyarat: \[\[t4-jembatan\]\] · Jalur inti<\/p>/);
    expect(m, "baris meta").not.toBeNull();
    expect(dari("t5-prd").menit).toBe(Number(m![1]));
    expect(dari("t5-prd").peran).toBeUndefined();
    di(naskah5, "naskah", "| 5.1 | 1 | PRD v5: Rekeningo untuk satu negara | PRD | ★ | – | – |");
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const kata = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(kata / 200 - dari("t5-prd").menit!), `${kata} kata`).toBeLessThanOrEqual(1.5);
  });
  test("delapan blok sesuai templat PRD: hanya blok pertama terbuka, dan blok terakhir membuka jawaban 4.31", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Latar masalah", "Tujuan", "User dan kebutuhan barunya", "Ruang lingkup", "Metrik dan batasan", "Tim dan risiko", "Pertanyaan terbuka", "Yang dibuka lagi dari Tahap 4"]);
    expect(cekTemplat("prd", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Latar masalah"]);
    expect(hitung(badan, "<Blok "), "jumlah <Blok").toBe(8);
    expect(hitung(badan, "</Blok>"), "jumlah </Blok>").toBe(8);
  });
  test("tingkat heading: halaman tidak memakai heading markdown, label tebal saja", () => {
    expect(badan.match(/^#{1,6} /gm)).toBeNull();
    expect(front).not.toMatch(/^#/m);
  });
  test("kalimat pembuka menunjuk ringkasan di 4.31 dan menjanjikan jawaban tebakan di blok terakhir; 4.31 menjanjikannya di halaman ini", () => {
    harus("Sinta menulis PRD kelima ini untuk **PT Rekeningo** (fiktif), yang kini menargetkan satu negara. Ringkasannya sudah tampil di [[t4-jembatan]]. Halaman ini memuat dokumen lengkapnya, dan blok terakhir membuka jawaban atas tebakan di sana.");
    expect(daftarBlok(badan).at(-1)!.nama).toBe("Yang dibuka lagi dari Tahap 4");
    const j = T(4, "jembatan-prd-v5.mdx");
    di(j, "4.31", "Jawaban tebakan dibuka di halaman pertama Tahap 5.");
    expect(dataTebak.penutup).toContain("Jawabannya dibuka di halaman pertama Tahap 5.");
    expect(dari("t5-prd").prasyarat).toEqual(["t4-jembatan"]);
    expect(hal.filter((h) => h.tahap === 5 && h.nomor).map((h) => h.nomor)[0]).toBe("5.1");
    expect(daftarBlok(j).at(-1)!.nama).toBe("Kunci");
  });
  test("kepala dokumen, judul, dan deskripsi: lingkup dan waktu dari registry dan naskah", () => {
    harus('<div class="prd-kepala" role="group" aria-label="Kepala dokumen PRD v5">');
    harus("<dl><div><dt>Penulis</dt><dd>Sinta, unit Inisiatif Digital</dd></div><div><dt>Syarat baru</dt><dd>Pak Hadi, Kepala Divisi Keuangan</dd></div></dl>");
    harus(`<dd>Satu negara: ${titik(a5.user)} user terdaftar, ±${titik(merchant5)} merchant</dd>`);
    harus("<dd>16 minggu, 28 engineer dalam delapan tim</dd>");
    di(bag1, "naskah 1", "**Ruang lingkup (nasional, 1.000.000 user terdaftar, 200.000 aktif per hari, 28 orang, 16 minggu).**");
    di(bag1, "naskah 1", "**Batasan.** 28 engineer dalam delapan tim selama 16 minggu.");
    expect(cerita.tahap[4]!.user).toBe("1 juta");
    expect(a5.user).toBe(1000000);
    expect(aktif).toBe(200000);
    expect(front).toMatch(/^title: "5\.1 PRD v5: Rekeningo untuk satu negara"$/m);
    expect(front.match(/^description: (.+)$/m)![1]).toBe("Dokumen produk kelima Rekeningo. Sinta menulisnya untuk satu negara, Pak Hadi menambah satu syarat, dan 28 engineer dalam delapan tim punya 16 minggu.");
    di(bagPRD, "naskah 1", "Syarat Pak Hadi bertambah");
  });
});

describe("beban: angka turunan dari registry dan naskah", () => {
  test("tabel Beban satu: tiap sel dihitung dari masukan registry dan naskah", () => {
    const t = tabel(badan, "| Besaran | Nilai | Cara hitung | Dengan 2 transaksi |");
    expect(t[0]).toEqual(["Besaran", "Nilai", "Cara hitung", "Dengan 2 transaksi"]);
    expect(t.slice(1)).toEqual([
      ["User terdaftar", titik(a5.user), "PRD v5", "sama"],
      ["User aktif harian", titik(aktif), `${titik(a5.user)} × ${a5.aktif}% (asumsi)`, "sama"],
      ["Request per hari", titik(reqHari), `${titik(aktif)} × ${a5.req} request (asumsi)`, "sama"],
      ["Puncak request per detik", fmt(reqPuncak, 1).replace(/^(\d)(\d{3})/, "$1.$2"), `${titik(reqHari)} ÷ 86.400 × ${a5.puncak} (asumsi), rata-rata ${fmt(reqRata, 1)}`, "sama"],
      ["Transaksi uang per hari (bayar, transfer, QR)", titik(trxHari), `${titik(aktif)} × ${trxDasar} transaksi (asumsi)`, titik(trxHari2)],
      ["Transaksi uang per detik di puncak", fmt(trxPuncak, 1), `${titik(trxHari)} ÷ 86.400 × ${a5.puncak} (asumsi)`, fmt(trxPuncak2, 1)],
      ["Posting per tahun", `${titik(postingTahun / 1e6)} juta`, `${titik(aktif)} × ${trxDasar} transaksi × ${post[2]} posting × 365 (asumsi)`, `${titik(postingTahun2 / 1e6)} juta`],
      ["Top-up dari bank per hari", titik(topupHari), `${titik(aktif)} × ${koma(topupPerUser, 2)} top-up (asumsi)`, "sama"],
      ["Top-up dari bank per detik di puncak", fmt(topupPuncak, 2), `${titik(topupHari)} ÷ 86.400 × ${a5.puncak} (asumsi)`, "sama"],
    ]);
    // Dasar 3 transaksi dari naskah dan registry 2 di sebelahnya (keputusan 1411); keduanya tertulis, registry tidak diubah.
    expect(trxDasar).toBe(3);
    expect(a5.trx).toBe(2);
    expect(a4.trx).toBe(3);
    harus("Dasar hitungannya 3 transaksi uang per user aktif per hari, seperti Tahap 2 sampai 4. Kolom terakhir memakai 2 transaksi, angka yang dipakai [[D1]] untuk ±44 GB data per tahun dan yang ditulis berdampingan di [[t4-estimasi]].");
    di(T(1, "kerangka-estimasi.mdx"), "1.38", "| Data transaksi per tahun (Tahap 5) | ±44 GB | 200.000 × 2 transaksi × 365 × 300 byte |");
    expect((200000 * 2 * 365 * 300) / 1e9).toBeCloseTo(43.8, 5);
    di(T(4, "estimasi.mdx"), "4.28", "Registry Tahap 5 menulis 2 transaksi per user aktif per hari, bukan 3 seperti Tahap 3 dan 4");
    di(rowNaskah("| Transaksi uang (bayar, transfer, QR) |"), "naskah 3", `(trx 2: ${titik(trxHari2)})`);
    di(rowNaskah("| Transaksi uang (bayar, transfer, QR) |"), "naskah 3", `${fmt(trxPuncak, 1)} puncak (trx 2: ${fmt(trxHari2 / 86400, 2)} dan ${fmt(trxPuncak2, 1)})`);
    di(rowNaskah("| Request per detik |"), "naskah 3", `${fmt(reqRata, 1)} rata-rata dan ${fmt(reqPuncak, 1).replace(/^(\d)(\d{3})/, "$1.$2")} puncak`);
    di(rowNaskah("| Top-up dari bank |"), "naskah 3", `${fmt(topupHari / 86400, 3)} rata-rata dan ${fmt(topupPuncak, 2)} puncak`);
    di(rowPosting, "naskah 3", `${titik(postingTahun / 1e6)} juta`);
    di(rowPosting, "naskah 3", `Trx 2: ${titik(postingTahun2 / 1e6)} juta`);
    harus("Puncaknya naik 10 kali dari puncak Tahap 4, yaitu 138,9: user naik 10 kali, persen aktif tetap 20%, dan request per user tetap 60. Rumusnya sama dengan [[t4-estimasi]].");
    expect(a4.aktif).toBe(a5.aktif);
    expect(a4.req).toBe(a5.req);
    expect(a5.user / a4.user).toBe(10);
    expect(bulat(reqPuncak / ((a4.user * a4.aktif) / 100 * a4.req / 86400 * a4.puncak), 3)).toBe(10);
    expect(fmt((((a4.user * a4.aktif) / 100) * a4.req / 86400) * a4.puncak, 1)).toBe("138,9");
  });
  test("tabel Beban dua: kapasitas, pemakaian, pengumuman, dan koneksi dari rumus di naskah dan angka Tahap 3 dan 4", () => {
    // Tabel dua dibaca dari baris "Kapasitas worker notifikasi" sampai akhir tabel.
    const baris = badan.split("\n");
    const mulai = baris.findIndex((b) => b.startsWith("| Kapasitas worker notifikasi |"));
    expect(baris[mulai - 1]).toBe("|---|---|---|");
    expect(baris[mulai - 2]).toBe("| Besaran | Nilai | Cara hitung |");
    const rows: string[][] = [];
    for (let j = mulai; j < baris.length && baris[j]!.startsWith("|"); j++) rows.push(sel(baris[j]!));
    expect(rows).toEqual([
      ["Kapasitas worker notifikasi", `${koma(kapasitas, 2)} per detik`, `${cKirim} pengirim ÷ ${koma(tKirim, 1)} detik per pengiriman, Asumsi dari [[t3-estimasi]]`],
      ["Notifikasi uang di puncak", `${fmt(notifPuncak, 1)} per detik`, `(${titik(trxHari)} + ${titik(topupHari)}) ÷ 86.400 × ${a5.puncak}; dengan 2 transaksi ${fmt(notifPuncak2, 1)}`],
      ["Pemakaian worker", `${titik(bulat((bulat(notifPuncak, 1) / bulat(kapasitas, 2)) * 100))}%`, `${fmt(notifPuncak, 1)} ÷ ${koma(kapasitas, 2)}; Tahap 4 memakai ${titik(bulat(pakaiWorker))}%, dan dengan 2 transaksi ${titik(bulat((bulat(notifPuncak2, 1) / bulat(kapasitas, 2)) * 100))}%`],
      ["Pengumuman ke 1.000.000 HP, 4 pengirim", `${titik(pengumumanDetik)} detik, atau ${fmt(pengumumanDetik / 3600, 1)} jam`, `${titik(a5.user)} × ${koma(tKirim, 1)} ÷ ${cKirim}; Tahap 4: ${titik(a4.user)} HP butuh ${titik(pengumumanDetik4)} detik`],
      [`Pengumuman dalam ${targetMenit} menit`, `${pengirimTarget} pengirim, atau ${prosesTarget} proses`, `${titik(a5.user)} ÷ ${titik(targetMenit * 60)} detik = ${fmt(lajuTarget, 1)} per detik; × ${koma(tKirim, 1)} = ${fmt(lajuTarget * tKirim, 1)}, dibulatkan ke ${pengirimTarget} pengirim; ${pengirimTarget} ÷ ${cKirim} = ${koma(pengirimTarget / cKirim, 2)}, dibulatkan ke ${prosesTarget}`],
      ["Koneksi database", `${koneksiTerpasang} terpasang, ${koneksiTersedia} tersedia`, `${kon[1]} service × ${kon[2]} instance × pool ${kon[3]}; ${kon[5]} − ${kon[6]} cadangan; ${koneksiTerpasang} ÷ ${koneksiTersedia} = ${titik(bulat((koneksiTerpasang / koneksiTersedia) * 100))}%`],
    ]);
    harus(`Rata-rata yang terpakai hanya ${fmt(a5.puncak * (reqRata) * wQuery * 1, 1)} koneksi: ${fmt(reqPuncak, 1).replace(/^(\d)(\d{3})/, "$1.$2")} request per detik × ${koma(wQuery, 2)} detik per query (Asumsi).`);
    // Naskah menulis angka yang sama; kapasitas 13,33 dan pakai worker 564% dan 56%.
    di(rowNaskah("| Notifikasi uang dan worker |"), "naskah 3", `${fmt(notifPuncak, 1)} per detik puncak = ${titik(bulat((bulat(notifPuncak, 1) / bulat(kapasitas, 2)) * 100))}% kapasitas`);
    di(rowNaskah("| Notifikasi uang dan worker |"), "naskah 3", "(Tahap 4: 56% dan 72%)");
    di(rowNaskah("| Notifikasi uang dan worker |"), "naskah 3", `c = ${cKirim}, t = ${koma(tKirim, 1)} detik, kapasitas ${koma(kapasitas, 2)} per detik`);
    di(rowPengumuman, "naskah 3", `${cKirim} pengirim: ${titik(pengumumanDetik)} detik = ${fmt(pengumumanDetik / 3600, 1)} jam (Tahap 4: ${titik(a4.user)} HP = ${titik(pengumumanDetik4)} detik)`);
    di(rowPengumuman, "naskah 3", `${pengirimTarget} pengirim = ${prosesTarget} proses`);
    di(rowKoneksi, "naskah 3", `${titik(bulat((koneksiTerpasang / koneksiTersedia) * 100))}% dari yang tersedia`);
    di(rowKoneksi, "naskah 3", `Rata-rata terpakai L = ${fmt(reqPuncak, 1).replace(/^(\d)(\d{3})/, "$1.$2")} × ${koma(wQuery, 2)} = ${fmt(reqPuncak * wQuery, 1)}`);
    expect(fmt(reqPuncak * wQuery, 1)).toBe("27,8");
    expect(pakaiWorker).toBeGreaterThan(56.3);
    expect(notifPuncak4).toBeCloseTo(6.94 + 0.579, 2);
    expect(tabel(T(4, "estimasi.mdx"), "| Besaran | Tahap 4 | Tahap 5 | Cara hitung Tahap 5 |").flat().join(" ")).toContain("564%");
    di(T(4, "estimasi.mdx"), "4.28", "koneksi tertahan 27,8 lawan 18");
  });
  test("hitungan lain di halaman: merchant 435 kali, error budget 43,2 menit, 30 + 5 = 35 detik, ADR 6 dan ADR 40", () => {
    harus(`Merchant naik ${bulat(merchant5 / merchant4)} kali dari Tahap 4, sedangkan user naik ${a5.user / userTahap4} kali: ${titik(merchant5)} ÷ ${merchant4} = ${fmt(merchant5 / merchant4, 1)}, dibulatkan ke ${bulat(merchant5 / merchant4)} (Hitungan atas Asumsi).`);
    expect(bulat(merchant5 / merchant4)).toBe(435);
    di(JSON.stringify(dataTebak), "tebak 4.31", `±${merchant4} menjadi ratusan ribu`);
    di(latar, "naskah", "435 kali ±460 merchant Tahap 4");
    expect(bulat(errBudget, 1)).toBe(43.2);
    harus("Error budget adalah 100% dikurangi target ketersediaan, dikalikan lama periode. Dalam 30 hari ada 30 × 24 × 60 = 43.200 menit, dan 0,001 × 43.200 = 43,2 menit.");
    expect(30 * 24 * 60).toBe(43200);
    harus("error budget 0,001 × 43.200 menit = 43,2 menit");
    harus("jadi penjualan baru terlihat paling lambat 35 detik sesudah tercatat (Hitungan: 30 + 5)");
    expect(30 + 5).toBe(35);
    di(bagPRD, "naskah 1", "tertinggal paling lama 5 detik dari pembayaran yang tercatat di ledger (Asumsi produk). Layar memperbarui tiap 30 detik");
    di(bagPRD, "naskah 1", "error budget 0,001 × 43.200 menit = 43,2 menit");
    // ADR 6 memperkirakan ±440 juta per tahun; tabel Beban menghitung 438 juta.
    di(teksHalaman("t2-adr-ledger"), "ADR 6", "Naskah memperkirakan ±440 juta posting per tahun di Tahap 5 (Asumsi)");
    expect(Math.abs(postingTahun - 440e6)).toBeLessThan(5e6);
    harus("Tabel Beban menghitung 438 juta, dan [[t5-partisi]] mengerjakannya.");
    // ADR 40: 15 ÷ 460 = 3,3% dan 15 ÷ 200.000 = 0,0075%.
    expect(fmt((15 / merchant4) * 100, 1)).toBe("3,3");
    expect(((15 / merchant5) * 100).toString()).toBe("0.0075");
    harus("15 merchant adalah 3,3% dari ±460, dan 15 ÷ 200.000 = 0,0075% (Hitungan atas Asumsi; [[t4-qr]]).");
    di(teksHalaman("t4-qr"), "ADR 40", "5 akun × 3 laporan = 15 merchant, atau 3,3% dari ±460 merchant");
    // ADR 41: 50 ÷ 8 = 6,25 jadi 7 gelombang × 3 detik = 21 detik.
    expect(Math.ceil(50 / 8) * 3).toBe(21);
    harus("ADR 41 menulis syarat salah per satu impor: 50 produk menjadi 21 detik dalam satu request ([[t4-ssrf]]).");
    di(teksHalaman("t4-ssrf"), "ADR 41", "50 ÷ 8 = 6,25 menjadi 7 gelombang, dan 7 × 3 detik = 21 detik dalam satu request");
    // ADR 38: 20.000 × 500 KB ÷ 86.400 × 10 = 1.157 KB per detik.
    expect(titik((20000 * 500 * a5.puncak) / 86400)).toBe("1.157");
    expect(a5.upload).toBe(20000);
    expect(a5.fileKB).toBe(500);
    di(teksHalaman("t4-storage"), "ADR 38", "Registry Tahap 5 memberi 1.157 KB per detik, yaitu 20.000 × 500 KB ÷ 86.400 × 10 (Hitungan atas Asumsi, sepuluh kali Tahap 4)");
    harus("ADR 38 ([[t4-storage]]) menghitung unduhan staf 1.157 KB per detik di Tahap 5, yaitu 20.000 × 500 KB ÷ 86.400 × 10 (Hitungan atas Asumsi).");
  });
});

describe("isi PRD: tujuan, user, lingkup, metrik, batasan, Pak Hadi, tim, tokoh, risiko, pertanyaan", () => {
  const daftar = (sumber: string, awal: string, akhir: string): string[] =>
    sumber.slice(sumber.indexOf(awal) + awal.length).split(akhir)[0]!.split("\n").filter((b) => /^(?:\d+\.|-) /.test(b)).map((b) => b.replace(/^(?:\d+\.|-) /, "").trim());
  const daftarMdx = (awal: string, akhir: string) => daftar(badan, awal, akhir);
  test("lima tujuan sama dengan naskah", () => {
    const naskah = bagPRD.match(/\*\*Tujuan\.\*\* (.+)/)![1]!;
    const butir = [...naskah.matchAll(/\((\d)\) ([^()]+?)(?=\. \(\d\)|\.$)/g)].map((m) => m[2]!.trim() + ".");
    expect(butir).toHaveLength(5);
    const item5 = "Cicilan dan tabungan berjalan lewat batch harian, yaitu program terjadwal yang tiap hari memproses banyak angsuran, tanpa menagih dua kali.";
    expect(butir[4]).toBe("Cicilan dan tabungan berjalan lewat batch harian yang tidak menagih dua kali.");
    expect(daftarMdx('<Blok nama="Tujuan">', "</Blok>")).toEqual([...butir.slice(0, 4), item5]);
  });
  test("tabel user sama dengan naskah, baris demi baris", () => {
    const kepala = "| User | Kebutuhan baru | Yang membuatnya berhenti memakai |";
    expect(tabel(badan, kepala)).toEqual(tabel(bagPRD, kepala));
    expect(tabel(badan, kepala)).toHaveLength(8);
    harus("**SRE** (site reliability engineer) adalah engineer yang menjaga sistem produksi tetap berjalan. **Mitra POS** adalah penyedia POS pihak ketiga yang memanggil API Rekeningo.");
    harus("2. **Pihak luar memanggil masuk.** POS (point of sale, yaitu kasir elektronik di toko) milik mitra membuat QR dan membaca status pembayaran lewat API publik.");
    expect(badan.indexOf("POS"), "POS diberi arti di pemakaian pertama").toBe(badan.indexOf("POS (point of sale, yaitu kasir elektronik di toko)"));
    di(T(4, "jembatan-prd-v5.mdx"), "4.31", "SRE (site reliability engineer) adalah engineer yang menjaga sistem produksi tetap berjalan, dan POS (point of sale) adalah kasir elektronik di toko.");
  });
  test("tabel lingkup: sembilan baris sama dengan naskah (satu sel diperluas), prioritas enam P0, dua P1, satu P2", () => {
    const kepala = "| Prioritas | Fitur | Keterangan |";
    const m = tabel(badan, kepala);
    const n = tabel(bagPRD, kepala);
    expect(m).toHaveLength(10);
    const harap = n.map((r) => (r[1] === "Kartu virtual untuk semua user terverifikasi" ? [r[0]!, r[1]!, `${r[2]!}, yaitu sakelar yang mematikan satu fitur tanpa deploy`] : r));
    expect(m).toEqual(harap);
    expect(m.slice(1).map((r) => r[0])).toEqual(["P0", "P0", "P0", "P0", "P0", "P0", "P1", "P1", "P2"]);
    expect(n.find((r) => r[1] === "Kartu virtual untuk semua user terverifikasi")![2]).toBe("Rilis bertahap dari PRD v4, dengan satu kill switch");
    harus("Lingkupnya satu negara: 1.000.000 user terdaftar dan 200.000 aktif per hari, dikerjakan 28 orang selama 16 minggu. PRD lengkap menambah satu isi P0 yang belum ada di ringkasan [[t4-jembatan]], yaitu tidak berhenti dan tidak kehilangan uang. Ia juga mengisi angka tim: 28 orang dalam delapan tim, di dalam rentang 20 sampai 40 orang.");
    // Ringkasan 4.31 menulis lima isi (skala, laporan, notifikasi, cicilan, API) dan tim; "tidak berhenti" tidak ada di sana.
    const j = T(4, "jembatan-prd-v5.mdx");
    expect(j).not.toMatch(/tidak berhenti|RPO|RTO/);
    di(j, "4.31", "| Tim | 13 developer dalam tiga tim (Asumsi cerita) | 20 sampai 40 orang dalam 5 sampai 7 tim, ditambah platform, SRE, dan security (Asumsi cerita) |");
  });
  test("RPO nol, RTO 15 menit, 99,9%, 5 detik, 30 detik, dan 30 menit berlabel Asumsi produk dan tidak diklaim dari rekaman", () => {
    const baris = barisAwal(badan, "| P0 | Tidak berhenti, tidak kehilangan uang |");
    di(baris, "baris P0", "Angka ini Asumsi produk dan menjawab pemicu ADR 33 yang tertunda sejak Tahap 3");
    di(baris, "baris P0", "(RPO nol)");
    di(baris, "baris P0", "pulih dalam 15 menit (RTO)");
    harus("Asumsi produk adalah Asumsi yang berupa pilihan produk. Angka 5 detik, 30 detik, 99,9%, 30 menit, RPO nol, dan RTO 15 menit di tabel ini tidak berasal dari hitungan atau rekaman.");
    expect(hitung(badan, "Asumsi produk")).toBe(5);
    di(bagPRD, "naskah 1", "Angka ini Asumsi produk dan menjawab pemicu ADR 33 yang tertunda sejak Tahap 3");
    di(bagPRD, "naskah 1", "(Asumsi produk)");
    di(bagPRD, "naskah 1", "RPO nol");
  });
  test("bukan lingkup, metrik, dan batasan sama dengan naskah", () => {
    harus("**Bukan lingkup v5:** pembayaran offline, pencairan merchant otomatis lewat bank (tetap file), tarik tunai, kartu fisik, dan multi-mata uang. Bunga atau pinjaman dari PT juga bukan lingkup, dan tidak ada klaim izin atau kepatuhan regulasi apa pun.");
    di(bagPRD, "naskah 1", "**Bukan lingkup v5.** Pembayaran offline, pencairan merchant otomatis lewat bank (tetap file), tarik tunai, kartu fisik, dan multi-mata uang. Bunga atau pinjaman dari PT juga bukan lingkup, dan tidak ada klaim izin atau kepatuhan regulasi apa pun.");
    const metrikNaskah = daftar(bagPRD, "**Metrik keberhasilan (target, Asumsi).**", "**Batasan.**");
    expect(metrikNaskah).toHaveLength(6);
    harus("**Metrik keberhasilan (target, Asumsi)**");
    expect(daftarMdx("**Metrik keberhasilan (target, Asumsi)**", "**Batasan**")).toEqual(metrikNaskah.map((m) => m.replace(", registry)", ")")));
    di(metrikNaskah[0]!, "naskah", "registry");
    harus("- 200.000 user aktif per hari (20% dari 1.000.000).");
    const batas = bagPRD.match(/\*\*Batasan\.\*\* (.+)/)![1]!;
    const kalimat = batas.split(/\. (?=[A-Z])/).map((k) => k.trim().replace(/\.$/, ""));
    expect(kalimat).toHaveLength(5);
    const mdxBatas = daftarMdx("**Batasan**", "Aturan Pak Hadi dipertahankan");
    expect(mdxBatas).toEqual([
      "28 engineer dalam delapan tim selama 16 minggu (Asumsi cerita).",
      "Semua pihak ketiga berupa tiruan lokal di lab.",
      "Security review Laras lolos sebelum tiap rilis ke seluruh negeri.",
      "Kapasitas satu server belum pernah diukur, dan pengukurannya dijadwalkan sebelum fitur pertama yang menambah beban ([[t4-adr-45]], aturan 5).",
      "Direksi meminta perbandingan biaya tiga tahun antara cloud dan perangkat sendiri sebelum anggaran tahun berikutnya (Asumsi cerita).",
    ]);
    expect(kalimat[0]).toBe("28 engineer dalam delapan tim selama 16 minggu");
    expect(kalimat[1]).toBe("Semua pihak ketiga berupa tiruan lokal di lab");
    expect(kalimat[2]).toBe("Security review Laras lolos sebelum tiap rilis ke seluruh negeri");
    expect(kalimat[3]).toBe("Kapasitas satu server belum pernah diukur, dan pengukurannya dijadwalkan sebelum fitur pertama yang menambah beban (ADR 45, aturan 5)");
    expect(kalimat[4]).toBe("Direksi meminta perbandingan biaya tiga tahun antara cloud dan perangkat sendiri sebelum anggaran tahun berikutnya (ADR 59; Asumsi cerita)");
    di(teksHalaman("t4-adr-45"), "ADR 45", "Pengukuran yang dibutuhkan pemicu dijadwalkan sebelum fitur PRD v5 pertama yang menambah λ atau W.");
  });
  test("aturan Pak Hadi: v1 sampai v3 dari PRD v3, v4 dari PRD v4, v5 dari naskah", () => {
    const m = tabel(badan, "| PRD | Aturan Pak Hadi |");
    expect(m).toHaveLength(6);
    for (const [v, sumber] of [["v1", T(3, "prd-v3.mdx")], ["v2", T(3, "prd-v3.mdx")], ["v3", T(3, "prd-v3.mdx")], ["v4", T(4, "prd-v4.mdx")]] as const) {
      expect(`| ${m.find((r) => r[0] === v)!.join(" | ")} |`, v).toBe(barisAwal(sumber, `| ${v} |`));
    }
    const kalimatV5 = bagPRD.match(/\*"(Angka yang saya tanda tangani[^"]+)"\*/)![1]!;
    expect(m.find((r) => r[0] === "v5")![1]).toBe(`Aturan v4 tetap berlaku, ditambah: "${kalimatV5}"`);
    harus("Aturan Pak Hadi dipertahankan dan diperluas:");
  });
  test("tabel tim: orang, pemimpin, dan bidang dari naskah; jumlah 28; lima tim produk dan tiga tim fungsi di dalam 20 sampai 40", () => {
    const naskah = tabel(latar, "| Tim | Orang | Pemimpin | Memegang |").slice(1);
    expect(naskah).toHaveLength(8);
    const harap = naskah.map((r) => [`${r[0]}: ${r[1]} orang, dipimpin ${r[2]!.replace(/ \(.*\)$/, "")}`, r[3]!]);
    expect(tabel(badan, "| Tim | Memegang |").slice(1)).toEqual(harap);
    const orang = naskah.map((r) => Number(r[1]));
    expect(orang.reduce((x, y) => x + y, 0)).toBe(28);
    expect(naskah.filter((r) => Number(r[1]) === 4)).toHaveLength(6);
    expect(naskah.filter((r) => Number(r[1]) === 2).map((r) => r[0])).toEqual(["SRE", "Security"]);
    expect(4 * 6 + 2 * 2).toBe(28);
    di(latar, "naskah", "Totalnya 4 × 6 + 2 × 2 = 28 orang.");
    harus("Totalnya 4 × 6 + 2 × 2 = 28 orang. Isinya lima tim produk (Pembayaran, Ledger dan Tabungan, Merchant, Akun, Notifikasi) dan tiga tim fungsi (Platform, SRE, Security).");
    expect(naskah.slice(0, 5).map((r) => r[0])).toEqual(["Pembayaran", "Ledger dan Tabungan", "Merchant", "Akun", "Notifikasi"]);
    expect(naskah.slice(5).map((r) => r[0])).toEqual(["Platform", "SRE", "Security"]);
    di(naskah5, "naskah", "Isinya lima tim produk dan tiga tim fungsi, semuanya dihitung dalam 20 sampai 40 (Asumsi cerita).");
    // Rentang 4.31: 5 sampai 7 tim produk ditambah tiga tim fungsi, 20 sampai 40 orang.
    expect(5 >= 5 && 5 <= 7 && 28 >= 20 && 28 <= 40).toBe(true);
    di(JSON.stringify(dataTebak) + T(4, "jembatan-prd-v5.mdx"), "4.31", "20 sampai 40 orang dalam 5 sampai 7 tim, ditambah platform, SRE, dan security");
    harus("Tim tumbuh dari 13 menjadi 28 orang selama 16 minggu (Asumsi cerita), dan engineer baru masuk bertahap.");
    expect(13).toBe(5 + 4 + 4);
    di(T(4, "prd-v4.mdx"), "4.1", "| Pembayaran: 5 orang, dipimpin Nadia |");
    di(latar, "naskah", "Tim tumbuh dari 13 menjadi 28 orang selama 16 minggu (Asumsi cerita)");
    harus("Tiga tim Tahap 4 dibagi ulang menjadi delapan tim. Satu anggota Pembayaran pindah ke Ledger dan Tabungan, sedangkan Platform melepas akun dan identitas ke Akun, outbox ke Notifikasi, dan keamanan ke Security. SLO adalah target ketersediaan yang diukur, dan failover adalah memindahkan tugas database utama ke salinannya.");
    di(naskah5, "naskah", "Satu anggota Pembayaran pindah ke Ledger dan Tabungan, dan Platform melepas akun dan identitas ke Akun, outbox ke Notifikasi, dan keamanan ke Security.");
  });
  test("tokoh baru dan tokoh lama dari naskah; risiko Sinta dan tiga pertanyaan terbuka", () => {
    const tokoh = tabel(latar, "| Tokoh | Siapa | Ingin | Kelemahan | Yang dibawanya ke cerita |").slice(1);
    expect(tokoh.map((r) => r[0]!.replace(/\*/g, ""))).toEqual(["Dewi", "Hendra", "Tomi"]);
    di(tokoh[0]!.join(" "), "naskah Dewi", "bergabung di minggu 1. Delapan tahun giliran jaga di sistem pembayaran lain, belum pernah menulis fitur.");
    di(tokoh[0]!.join(" "), "naskah Dewi", "Menolak rilis tanpa metrik penjaga");
    di(tokoh[1]!.join(" "), "naskah Hendra", "Engineer data dari tim akuntansi Lestari, memimpin tim Ledger dan Tabungan");
    di(tokoh[1]!.join(" "), "naskah Hendra", "Menganggap batch malam selalu bisa diulang dari awal");
    di(tokoh[2]!.join(" "), "naskah Tomi", "Engineer di penyedia POS (fiktif), mitra pertama API publik.");
    di(tokoh[2]!.join(" "), "naskah Tomi", "Mengulang permintaan tanpa batas bila tidak ada jawaban");
    harus("- **Dewi** adalah SRE yang bergabung di minggu 1, delapan tahun berjaga di sistem pembayaran lain dan belum pernah menulis fitur. Ia ingin sistem yang berhenti dengan aman, tetapi menolak rilis tanpa metrik penjaga.");
    harus("- **Hendra** adalah engineer data dari tim akuntansi Lestari, dan memimpin tim Ledger dan Tabungan. Ia ingin angka yang cocok sampai rupiah terakhir, tetapi menganggap batch malam selalu bisa diulang dari awal.");
    harus("- **Tomi** adalah engineer di penyedia POS (fiktif), mitra pertama API publik. Ia ingin kasir yang tidak pernah menunggu Rekeningo, tetapi mengulang permintaan tanpa batas bila tidak ada jawaban.");
    di(tokoh[0]!.join(" "), "naskah Dewi", "Sistem yang berhenti dengan aman dan pulih dalam waktu yang sudah diumumkan");
    di(tokoh[1]!.join(" "), "naskah Hendra", "Angka yang bisa dicocokkan sampai rupiah terakhir");
    di(tokoh[2]!.join(" "), "naskah Tomi", "Kasir yang tidak pernah menunggu Rekeningo");
    harus("Tahap 5 punya tiga tokoh baru:");
    harus("Tokoh lama tetap ada, dengan kelemahan yang sama. Raka memimpin Akun, Nadia memimpin Pembayaran, Bayu memimpin Platform, Wulan memimpin Merchant, dan Laras memimpin Security.");
    for (const k of ["**Raka** memimpin tim Akun", "**Nadia** memimpin tim Pembayaran", "**Bayu** memimpin tim Platform", "**Wulan** memimpin tim Merchant", "**Laras** memimpin tim Security"]) di(latar, "naskah", k);
    // Risiko: satu kalimat di naskah dengan tiga risiko.
    di(bagPRD, "naskah 1", "Rekeningo pertama kali punya data yang sengaja tertinggal, enam unit yang dirilis sendiri-sendiri, dan pihak luar yang memanggil masuk dengan laju yang tidak ia kendalikan.");
    harus("Sinta menulis tiga risiko:");
    expect(daftarMdx("Sinta menulis tiga risiko:", "</Blok>")).toEqual([
      "Rekeningo pertama kali punya data yang sengaja tertinggal.",
      "Enam service dirilis sendiri-sendiri.",
      "Pihak luar memanggil masuk dengan laju yang tidak Rekeningo kendalikan.",
    ]);
    // Tiga pertanyaan terbuka sama dengan naskah dan menunjuk ke masalah yang memicunya.
    const q = daftar(bagPRD, "**Pertanyaan terbuka di PRD.**", "Ketiganya tidak dijawab PRD");
    expect(q).toHaveLength(3);
    expect(daftarMdx("Tiga pertanyaan ini ada di PRD v5, tapi belum dijawab:", "Tidak ada yang menjawabnya")).toEqual(q);
    harus("Tidak ada yang menjawabnya sebelum kode ditulis. Ketiganya jadi masalah terbesar Tahap 5. Jawabannya dimulai di [[t5-m40]] untuk pertanyaan pertama, [[t5-m42]] untuk yang kedua, dan [[t5-m45]] untuk yang ketiga.");
    di(bagPRD, "naskah 1", "Ketiganya tidak dijawab PRD dan menjadi masalah terbesar Tahap 5.");
    const gejala = (id: string) => dari(id).judul;
    expect(gejala("t5-m40")).toMatch(/laporan/i);
    expect(gejala("t5-m42")).toMatch(/Database utama mati/);
    expect(gejala("t5-m45")).toMatch(/Pengumuman/);
    expect(dari("t5-m40").nomor).toBe("5.4");
    expect(dari("t5-m42").nomor).toBe("5.8");
    expect(dari("t5-m45").nomor).toBe("5.14");
    const m = (nomor: string) => naskah5.split("\n").find((b) => b.startsWith(`| ${nomor} | `))!;
    di(m("M40"), "naskah M40", "Laporan dan pembayaran memakai primary yang sama");
    di(m("M42"), "naskah M42", "mesin database utama restart");
    di(m("M45"), "naskah M45", "pengumuman diskon makan siang");
  });
});

describe("yang dibuka lagi dari Tahap 4: tebakan 4.31, tabel empat ADR, dua pilihan lain, dan dua belas ADR", () => {
  const BENAR = dataTebak.pilihan.filter((p) => p.benar);
  const SALAH = dataTebak.pilihan.filter((p) => !p.benar);
  const adrDi = (s: string) => [...s.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1]));
  test("jawaban yang dibuka: kunci widget 4.31 memuat tepat ADR 36, 37, 44, 45, dan dua pilihan lain ADR 41 dan 40", () => {
    expect(BENAR).toHaveLength(1);
    expect(SALAH).toHaveLength(2);
    expect(adrDi(BENAR[0]!.teks)).toEqual([36, 37, 44, 45]);
    expect(SALAH.map((p) => adrDi(p.teks)[0])).toEqual([41, 40]);
    harus("Jawaban yang cocok dengan halaman ADR-nya adalah ADR 36, ADR 37, ADR 44, dan ADR 45.");
    harus("Pecah berarti halaman ADR itu sendiri menulis keadaan yang sama dengan satu isi PRD v5. Urutan \"lebih dulu\" adalah penalaran dari kalimat halaman ADR (Asumsi), bukan urutan kejadian yang direkam.");
    harus("Di [[t4-jembatan]] kamu menebak ADR Tahap 4 mana yang pecah lebih dulu.");
    expect(dataTebak.pertanyaan).toBe("Dari ADR Tahap 4, mana yang pecah lebih dulu?");
    expect(dataTebak.sumber.jenis).toBe("asumsi");
    expect(BENAR[0]!.alasan).toContain("Ini bacaan dari halaman Tahap 4 (Asumsi)");
    di(bagBuka, "naskah 1", "Pilihan yang cocok adalah ADR 36, ADR 37, ADR 44, dan ADR 45.");
    di(bagBuka, "naskah 1", "tebakan itu penalaran (Asumsi), bukan urutan kejadian yang direkam");
    di(bagBuka, "naskah 1", "Dua pilihan lain di tebakan tidak cocok.");
  });
  test("tabel empat ADR: nomor, kalimat di halaman ADR, isi PRD v5, dan halaman lanjutan", () => {
    const t = tabel(badan, "| ADR | Kalimat di halaman Tahap 4 | Isi PRD v5 yang memenuhinya | Dilanjutkan di |");
    expect(t).toHaveLength(5);
    expect(t.slice(1).map((r) => r[0])).toEqual(["45 ([[t4-adr-45]])", "36 ([[t4-breaker]])", "37 ([[t4-modul]])", "44 ([[t4-tim-infra]])"]);
    expect(t.slice(1).map((r) => Number(r[0]!.split(" ")[0]))).toEqual([45, 36, 37, 44]);
    expect([...t.slice(1).map((r) => Number(r[0]!.split(" ")[0]))].sort((a, b) => a - b)).toEqual(adrDi(BENAR[0]!.teks));
    for (const r of t.slice(1)) expect(dari(r[0]!.match(/\[\[([^\]]+)\]\]/)![1]!).adr).toContain(Number(r[0]!.split(" ")[0]));
    // Kalimat di tabel dibaca ke halaman ADR-nya.
    const p45 = teksHalaman("t4-adr-45");
    const baris45 = p45.match(/\| 4\. Read replica dan PgBouncer \| PgBouncer: [^|]+ Read replica: ([^|]+) \|/)![1]!;
    expect(baris45.split(", atau ")).toHaveLength(3);
    expect(baris45.split(", atau ").at(-1)!.trim()).toBe("laporan merchant real-time diminta PRD v5");
    expect(t[1]![1]).toBe("Satu dari tiga pemicu read replica adalah laporan merchant real-time yang diminta PRD v5");
    expect(t[1]![2]).toBe("Laporan merchant real-time");
    di(BENAR[0]!.alasan, "tebak 4.31", "satu dari tiga pemicunya adalah laporan merchant real-time yang diminta PRD v5");
    const p36 = teksHalaman("t4-breaker");
    di(p36, "ADR 36", "Breaker hidup di memori satu proses worker (dibaca dari kode, tidak direkam). Dua worker tidak berbagi hitungan, jadi tiap proses menunggu enam kegagalannya sendiri");
    expect(t[2]![1]).toBe("Breaker hidup di memori satu proses worker, dan dua worker tidak berbagi hitungan, jadi tiap proses menunggu enam kegagalannya sendiri (dibaca dari kode, tidak direkam)");
    expect(t[2]![2]).toBe(`Notifikasi massal, yang butuh ${prosesTarget} proses worker dalam ${targetMenit} menit (Hitungan atas Asumsi)`);
    di(teksHalaman("t4-modul"), "ADR 37", "Saat satu modul punya profil beban atau tim yang membuat deploy bersama tidak lagi masuk akal.");
    expect(t[3]![1]).toBe("Keputusan salah bila satu modul punya profil beban atau tim yang membuat deploy bersama tidak lagi masuk akal");
    di(teksHalaman("t4-tim-infra"), "ADR 44", "Pipeline dan giliran jaga dibagi per tim, dan batas modul perlu menjadi batas deploy.");
    expect(t[4]![1]).toBe("Pipeline dan giliran jaga dibagi per tim, dan batas modul perlu menjadi batas deploy");
    expect(t[3]![2]).toBe("28 orang dalam delapan tim");
    expect(t[4]![2]).toBe("28 orang dalam delapan tim");
    // Halaman lanjutan sama dengan kolom "Dilanjutkan di" naskah, dan ADR yang dikerjakan ada di registry.
    const naskah = tabel(bagBuka, "| ADR | Kalimat di halaman Tahap 4 | Isi PRD v5 yang memenuhinya | Dilanjutkan di |").slice(1);
    expect(naskah.map((r) => r[3])).toEqual(["M40, ADR 46", "M45, ADR 51", "M44, ADR 50", "M44, ADR 58"]);
    const id = (nomorAdr: number) => hal.find((h) => h.tahap === 5 && h.adr?.includes(nomorAdr))!.id;
    expect(t.slice(1).map((r) => r[3])).toEqual([
      `[[t5-m40]] dan [[${id(46)}]]`, `[[t5-m45]] dan [[${id(51)}]]`, `[[t5-m44]] dan [[${id(50)}]]`, `[[t5-m44]] dan [[${id(58)}]]`,
    ]);
    expect(dari("t5-m40").judul).toMatch(/^M40:/);
    expect(dari("t5-m44").judul).toMatch(/^M44:/);
    expect(dari("t5-m45").judul).toMatch(/^M45:/);
    harus("Read replica adalah salinan database yang melayani bacaan. Tabel ini menaruh tiap ADR di samping isi PRD v5 yang memenuhinya, dan keempat kalimatnya sudah tertulis di halaman ADR sebelum PRD v5 ada.");
    di(T(4, "jembatan-prd-v5.mdx"), "4.31", "read replica, yaitu salinan database untuk bacaan");
  });
  test("dua pilihan yang tidak cocok: lima syarat salah ADR 41 dan empat syarat salah ADR 40 dibaca ke halamannya", () => {
    const syarat = (id: string): string[] => {
      const t = baca(berkasHalaman(id));
      return t.split("**Kapan keputusan ini salah.**")[1]!.split("**Yang akan merevisinya.**")[0]!.split("\n").filter((b) => b.startsWith("- "));
    };
    expect(syarat("t4-ssrf")).toHaveLength(5);
    expect(syarat("t4-qr")).toHaveLength(4);
    expect(syarat("t4-ssrf")[0]).toContain("satu impor 50 produk");
    expect(syarat("t4-qr")[2]).toContain("5 akun × 3 laporan = 15 merchant");
    // Lingkup: daftar syarat salah kedua halaman itu tidak menyebut notifikasi massal, cicilan, tabungan, jumlah orang di tim, atau laporan penjualan merchant.
    const semua = [...syarat("t4-ssrf"), ...syarat("t4-qr")].join(" ");
    expect(semua).not.toMatch(/notifikasi massal|cicilan|tabungan|laporan penjualan|laporan merchant|jumlah orang|developer|\btim\b/i);
    harus("Dua pilihan lain di tebakan tidak cocok dengan isi PRD v5:");
    expect(SALAH[0]!.alasan).toContain("Halaman 4.21 menulis lima syarat salah ADR 41.");
    expect(SALAH[1]!.alasan).toContain("Halaman 4.19 menulis empat syarat salah ADR 40.");
    expect(dari("t4-ssrf").nomor).toBe("4.21");
    expect(dari("t4-qr").nomor).toBe("4.19");
    harus("- ADR 40 memakai pembanding persen yang mengecil bila merchant bertambah. 15 merchant adalah 3,3% dari ±460, dan 15 ÷ 200.000 = 0,0075% (Hitungan atas Asumsi; [[t4-qr]]).");
    di(bagBuka, "naskah 1", "ADR 40 memakai pembanding persen yang mengecil bila merchant bertambah.");
    di(bagBuka, "naskah 1", "ADR 41 menulis syarat salah per satu impor (50 produk menjadi 21 detik)");
  });
  test("dua belas ADR: tujuh menulis kata Tahap 5 (dipindai dari halaman ADR), lima lain tidak; ADR 37 hanya di tabel; tiga belas bila digabung", () => {
    // Pemindaian lingkup folder: halaman yang punya ADR di registry, tahap 1 sampai 4.
    const adrHalaman = hal.filter((h) => h.adr && h.tahap <= 4 && h.ada);
    const menulis = new Set<number>();
    for (const h of adrHalaman) if (/Tahap 5/.test(baca(berkasHalaman(h.id)))) for (const n of h.adr!) menulis.add(n);
    expect([...menulis].sort((a, b) => a - b)).toEqual([4, 6, 12, 26, 38, 44, 45]);
    const lain = [14, 33, 34, 36, 42];
    for (const n of [...lain, 37]) expect(menulis.has(n), `ADR ${n}`).toBe(false);
    for (const n of [...lain, 37]) expect(adrHalaman.some((h) => h.adr!.includes(n)), `ADR ${n} ada di registry`).toBe(true);
    harus("Dua belas ADR sebelumnya menulis Tahap 5 atau memuat syarat salah yang cocok dengan PRD v5, jadi syaratnya dibaca ulang di sini. ADR 36, 44, dan 45 sudah ada di tabel di atas.");
    harus("Di halaman ADR Tahap 1 sampai 4, tujuh ADR menulis kata Tahap 5: ADR 4, 6, 12, 26, 38, 44, dan 45 (dipindai 2026-10-31). Lima ADR lain tidak menulis kata itu, tetapi syarat salahnya cocok: ADR 14, 33, 34, 36, dan 42.");
    // Daftar dua belas di naskah: ADR yang menjadi subjek tiap butir.
    const subjek = (s: string) => [...s.matchAll(/ADR (\d+)(?: \([^)]*\))? (?:menunda|menjadwalkan|menulis|membatasi|mencatat|menghitung|menaruh|menolak)/g)].map((m) => Number(m[1])).filter((n) => n <= 45);
    const butirNaskah = bagBuka.split("Dua belas ADR sebelumnya")[1]!.split("ADR 45 aturan 5")[0]!;
    expect([...new Set(subjek(butirNaskah))].sort((a, b) => a - b)).toEqual([4, 6, 12, 14, 26, 33, 34, 36, 38, 42, 44, 45]);
    // Daftar di halaman: subjek bullet ditambah kalimat "ADR 36, 44, dan 45".
    const bullet = badan.split("Dua belas ADR sebelumnya")[1]!.split("\n").filter((b) => b.startsWith("- ADR "));
    expect(bullet).toHaveLength(8);
    const dariBullet = new Set<number>([36, 44, 45]);
    for (const b of bullet) for (const n of subjek(b.replace(/^- /, "").replace(/\*\*/g, "").replace(/ \(\[\[[^\]]+\]\][^)]*\)/g, ""))) dariBullet.add(n);
    expect([...dariBullet].sort((a, b) => a - b)).toEqual([4, 6, 12, 14, 26, 33, 34, 36, 38, 42, 44, 45]);
    expect(dariBullet.size).toBe(12);
    expect([...new Set([...dariBullet, 45, 36, 37, 44])]).toHaveLength(13);
    expect([...dariBullet].filter((n) => [36, 37, 44, 45].includes(n)).sort((a, b) => a - b)).toEqual([36, 44, 45]);
    // 1.13 bukan ADR dan memakai id B2.2.
    expect(dari("B2.2").nomor).toBe("1.13");
    expect(dari("B2.2").adr).toBeUndefined();
  });
  test("tiap bullet ADR memakai kalimat yang ada di halaman ADR-nya, angka dari halaman itu, dan rekaman proses-mati.txt", () => {
    const b = (awal: string) => barisAwal(badan, awal);
    // ADR 4
    di(teksHalaman("t1-sql-injection"), "ADR 4", "| WAF di depan API | Puncak 0,14 request per detik, satu gedung, penguji internal | Tahap 5 |");
    expect(b("- ADR 4 (")).toBe("- ADR 4 ([[t1-sql-injection]]) menunda WAF, yaitu penyaring permintaan HTTP di depan API, ke Tahap 5. Alasannya puncak 0,14 request per detik, satu gedung, dan penguji internal. PRD v5 membalik ketiganya, dan [[t5-waf]] mengerjakannya.");
    expect(fmt(reqPuncak, 1)).toBe("1388,9");
    // ADR 6, ADR 12, halaman 1.13
    di(teksHalaman("t2-adr-ledger"), "ADR 6", "Tahap 5: partisi `posting` per bulan dan snapshot saldo");
    expect(b("- ADR 6 (")).toBe("- ADR 6 ([[t2-adr-ledger]], revisi di Tahap 2) menjadwalkan partisi `posting` per bulan dan snapshot saldo di Tahap 5, saat posting diperkirakan ±440 juta per tahun (Asumsi). Partisi memecah satu tabel jadi satu bagian per bulan, dan snapshot saldo menyimpan saldo tiap buku per periode. Tabel Beban menghitung 438 juta, dan [[t5-partisi]] mengerjakannya.");
    di(teksHalaman("t1-adr-12"), "ADR 12", "| Kubernetes | Puluhan container di beberapa mesin, dengan deploy terpisah per tim | Tahap 5, mulai dari k3s di lab |");
    expect(b("- ADR 12 (")).toBe("- ADR 12 ([[t1-adr-12]]) menjadwalkan Kubernetes, program yang menjalankan banyak container di banyak mesin, di Tahap 5 mulai dari k3s, Kubernetes ringan, di lab. [[t5-service]] mengerjakannya.");
    const p113 = teksHalaman("B2.2");
    di(p113, "1.13", "| Read replica untuk laporan | Laporan v1 kecil dan jarang | Tahap 5 |");
    di(p113, "1.13", "misalnya notifikasi untuk jutaan user. Itu baru mungkin muncul di Tahap 5, dan diukur dulu di sana.");
    expect(b("- Halaman [[B2.2]]")).toBe("- Halaman [[B2.2]], yang bukan ADR, menjadwalkan read replica untuk laporan di Tahap 5. Ia juga menulis bahwa data besar yang hanya dibaca per kunci, misalnya notifikasi untuk jutaan user, baru mungkin muncul di Tahap 5. PRD v5 memuat laporan merchant real-time, tetapi tidak memuat inbox notifikasi per user, jadi syarat kedua belum terpenuhi dan PostgreSQL tetap source of truth.");
    expect(bagPRD).not.toMatch(/inbox/i);
    expect(naskah5.match(/inbox notifikasi per user/g)).toHaveLength(1);
    di(bagBuka, "naskah 1", "PRD v5 tidak memuat inbox notifikasi per user");
    // ADR 14 dan ADR 34 dan rekaman
    const p14 = teksHalaman("t2-idempotency");
    di(p14, "ADR 14", "Saat satu niat bisa dikirim ulang lebih dari 24 jam sesudah percobaan pertama.");
    const p34 = teksHalaman("t4-webhook");
    di(p34, "ADR 34", "Bila service pembayaran mati di antara ledger dan transaction pembayaran, sesudah 24 jam hanya status `topup_bank` yang menahan");
    di(p34, "ADR 34", "Di `proses-mati.txt` bagian C, kiriman ulang pada +23 jam menghasilkan 1 jurnal, dan pada +25 jam 2 jurnal");
    const rek = baca("labs/t4-modul/output/proses-mati.txt");
    const C = rek.split("# --- C. ")[1]!.split("\n# --- ")[0]!;
    expect(C).toContain("jam ledger digeser 23 jam");
    expect(C).toContain("jam ledger digeser 25 jam");
    expect(C).toContain("Jam ledger diperankan");
    const hasilJurnal = [...C.matchAll(/\n (\d) +\| (\d) +\| dibayar/g)].map((m) => Number(m[1]));
    expect(hasilJurnal).toEqual([1, 2]);
    expect(b("- ADR 14 (")).toBe("- ADR 14 ([[t2-idempotency]]) membatasi umur Idempotency-Key 24 jam, dan ADR 34 ([[t4-webhook]]) mencatat akibatnya. Bila service pembayaran mati di antara ledger dan transaction pembayaran, kiriman ulang sesudah key habis menjurnal lagi. Rekaman lab t4-modul, `proses-mati.txt` bagian C, mencatat satu jurnal pada +23 jam dan dua pada +25 jam (jam ledger diperankan). Batch cicilan yang tertunda lebih dari 24 jam bisa melewati batas yang sama (penalaran), dan [[t5-batch]] menjawabnya.");
    // ADR 26, 33
    di(teksHalaman("t3-dua-instance"), "ADR 26", "dengan biaya operasional yang tidak dibenarkan oleh dua instance dan empat engineer. PROPOSAL menaruhnya di Tahap 5.");
    expect(b("- ADR 26 (")).toBe("- ADR 26 ([[t3-dua-instance]]) menolak Kubernetes untuk dua instance dan empat engineer, dan menulis bahwa rencana awal menaruhnya di Tahap 5. PRD v5 punya 28 engineer dalam delapan tim.");
    const p33 = teksHalaman("t3-adr-33");
    di(p33, "ADR 33", "Waktu pulih terukur atau jendela kehilangan data lebih besar dari yang bisa diterima Pak Hadi atau PRD.");
    di(p33, "ADR 33", "Backup `pg_dump` harian: jendela kehilangan data sampai 24 jam");
    expect(b("- ADR 33 (")).toBe("- ADR 33 ([[t3-adr-33]]) menunda VPS kedua sampai waktu pulih atau jendela kehilangan data melebihi yang diterima Pak Hadi atau PRD. Backup harian berjendela sampai 24 jam, sedangkan PRD v5 menulis RPO nol dan RTO 15 menit, jadi pemicu itu terpenuhi dan [[t5-rpo-rto]] menjawabnya.");
    // ADR 38, 42
    expect(b("- ADR 38 (")).toBe("- ADR 38 ([[t4-storage]]) menghitung unduhan staf 1.157 KB per detik di Tahap 5, yaitu 20.000 × 500 KB ÷ 86.400 × 10 (Hitungan atas Asumsi). Kapasitas jaringan instance tidak diukur lab (Tidak dijalankan), jadi angka itu belum bisa dibandingkan dengan pemicunya.");
    di(teksHalaman("t4-storage"), "ADR 38", "Kapasitas jaringan instance tidak diukur lab (Tidak dijalankan).");
    const p42 = teksHalaman("t4-kartu");
    di(p42, "ADR 42", "Saat Rekeningo berjalan di lebih dari satu instance. Kill switch di memori tidak lintas instance (dibaca dari kode, tidak direkam).");
    di(p42, "ADR 42", "penanda boolean di memori satu proses");
    expect(b("- ADR 42 (")).toBe("- ADR 42 ([[t4-kartu]]) menaruh kill switch di memori satu proses. Keputusannya salah bila Rekeningo berjalan di lebih dari satu instance. PRD v5 meminta pembayaran tidak berhenti saat satu mesin mati, jadi paling sedikit dua instance berjalan bersamaan (penalaran), dan [[t5-m49]] menjawabnya.");
    di(naskah5, "naskah", "ADR 42 menaruh kill switch di memori satu proses, dan Kubernetes menjalankan beberapa pod per service. Itu menjadi M49.");
    expect(dari("t5-m49").nomor).toBe("5.22");
  });
  test("janji penutup: hitungan menggantikan dugaan, urutan tetap penalaran, dan masalah pertama di M40", () => {
    harus("[[t4-jembatan]] menulis \"pecah lebih dulu\" sebagai penalaran. Tahap 5 mengubah dugaan itu menjadi hitungan di tabel Beban. Worker terpakai 564% (Tahap 4: 56%), pengumuman ke 1.000.000 HP butuh 20,8 jam di satu worker, dan koneksi terpasang 180 lawan 97 tersedia. Urutan \"lebih dulu\" tetap penalaran, dan urutan masalah di Tahap 5 adalah urutan cerita, bukan hasil pengukuran.");
    di(bagBuka, "naskah 1", "Worker terpakai 564% (Tahap 4: 56%), pengumuman ke 1.000.000 HP butuh 20,8 jam di satu worker, dan koneksi terpasang 180 lawan 97 tersedia.");
    di(bagBuka, "naskah 1", "urutan masalah di bagian 4 adalah urutan cerita, bukan hasil pengukuran");
    harus("Masalah pertama dari semua ini datang di [[t5-m40]].");
    expect(hal.filter((h) => h.tahap === 5 && h.jenis === "masalah")[0]!.id).toBe("t5-m40");
    for (const id of ["t5-m40", "t5-m42", "t5-m44", "t5-m45", "t5-m49", "t5-waf", "t5-partisi", "t5-service", "t5-batch", "t5-rpo-rto", "t5-fanout", "t5-tim-infra", "t5-read-replica"]) expect(hal.some((h) => h.id === id), id).toBe(true);
  });
});

describe("tautan, rujukan halaman, dan nomor", () => {
  test("semua [[ID]] ada di registry; yang belum ada tampil 'segera' dan tidak ditautkan; nomor ADR yang dirujuk cocok", () => {
    const id = [...badan.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]!);
    for (const x of new Set(id)) expect(hal.some((h) => h.id === x), x).toBe(true);
    const tahap = (x: string) => dari(x).tahap;
    expect(new Set(id.filter((x) => tahap(x) === 5))).toEqual(new Set(["t5-m40", "t5-m42", "t5-m44", "t5-m45", "t5-m49", "t5-waf", "t5-partisi", "t5-service", "t5-batch", "t5-rpo-rto", "t5-fanout", "t5-tim-infra", "t5-read-replica"]));
    // ADR Tahap 5 yang dijanjikan: nomor dari registry.
    const adrHalaman: Record<string, number> = { "t5-read-replica": 46, "t5-rpo-rto": 48, "t5-partisi": 49, "t5-service": 50, "t5-fanout": 51, "t5-waf": 56, "t5-tim-infra": 58 };
    for (const [x, n] of Object.entries(adrHalaman)) expect(dari(x).adr, x).toContain(n);
    expect(dari("t5-batch").adr).toContain(54);
    expect(dari("t5-m49").jenis).toBe("masalah");
    // Nomor ADR yang disebut halaman tanpa tautan: 4, 6, 12, 14, 26, 33, 34, 36, 37, 38, 40, 41, 42, 44, 45 (tahap 1 sampai 4), dan 59 (batasan, Asumsi cerita).
    const tanpaTautan = badan.replace(/\[\[[^\]]+\]\]/g, "");
    const nomor = new Set([...tanpaTautan.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1])));
    expect([...nomor].sort((a, b) => a - b)).toEqual([4, 6, 12, 14, 26, 33, 34, 36, 37, 38, 40, 41, 42, 44, 45]);
    // Halaman Tahap 5 tidak dirujuk dengan nomor halaman tertulis ("halaman 5.x") dan tidak dengan tautan /tahap-5/.
    expect(badan).not.toMatch(/halaman 5\.\d|\]\(\/tahap-5\//);
    expect(badan).not.toMatch(/\[\[t5-prd\]\]/);
  });
  test("tautan label sumber menuju bagian yang ada di /cara-pakai/ dan arti label diberikan di pemakaian pertama", () => {
    const cara = baca("situs/src/content/docs/cara-pakai.mdx");
    expect(cara).toMatch(/label-sumber|Label sumber/);
    expect(hitung(badan, "(/cara-pakai/#label-sumber)")).toBe(2);
    expect(badan.indexOf("[Asumsi](/cara-pakai/#label-sumber)")).toBeLessThan(badan.indexOf("Asumsi adalah angka beban"));
    harus("Angka di dokumen ini adalah angka cerita (Ilustrasi: contoh, bukan hasil sistem), kecuali yang ditulis Asumsi, Hitungan, Rekaman lab, atau Tidak dijalankan. Asumsi adalah angka beban atau pilihan yang rumusnya atau alasannya ditulis di halaman.");
    harus("Hitungan adalah rumus yang ditulis di halaman, dan ia memakai label masukan terlemahnya. Rekaman lab berarti keluaran lab di repo, dan Tidak dijalankan berarti dicek ke dokumentasi atau kode tanpa dijalankan. Arti lengkap label sumber ada di [Label sumber](/cara-pakai/#label-sumber).");
    // Tiap label muncul sesudah artinya diberikan: Hitungan, Rekaman lab, Tidak dijalankan.
    const arti = badan.indexOf("Hitungan adalah rumus");
    expect(badan.indexOf("(Hitungan")).toBeGreaterThan(arti);
    expect(badan.indexOf("Hitungan atas Asumsi")).toBeGreaterThan(arti);
    expect(badan.indexOf("Rekaman lab t4-modul")).toBeGreaterThan(arti);
    expect(badan.indexOf("(Tidak dijalankan)")).toBeGreaterThan(arti);
  });
});

describe("kalimat bebas, kepala tabel, dan struktur", () => {
  test("setiap tabel punya kepala, garis pemisah dengan jumlah kolom sama, dan baris sama lebar; tujuh tabel", () => {
    const baris = badan.split("\n");
    let jumlahTabel = 0;
    for (let i = 0; i < baris.length; i++) {
      if (!baris[i]!.startsWith("|") || (i > 0 && baris[i - 1]!.startsWith("|"))) continue;
      jumlahTabel++;
      const kolom = sel(baris[i]!).length;
      expect(baris[i + 1], `garis pemisah tabel di baris ${i + 1}`).toBe(`|${"---|".repeat(kolom)}`);
      for (let j = i + 2; j < baris.length && baris[j]!.startsWith("|"); j++) expect(sel(baris[j]!).length, `lebar baris ${j + 1}`).toBe(kolom);
    }
    expect(jumlahTabel).toBe(7);
  });
  test("kepala tabel persis, dan kepala PRD sama dengan halaman PRD tetangga", () => {
    for (const k of ["| User | Kebutuhan baru | Yang membuatnya berhenti memakai |", "| Prioritas | Fitur | Keterangan |", "| PRD | Aturan Pak Hadi |", "| Besaran | Nilai | Cara hitung | Dengan 2 transaksi |", "| Besaran | Nilai | Cara hitung |", "| Tim | Memegang |", "| ADR | Kalimat di halaman Tahap 4 | Isi PRD v5 yang memenuhinya | Dilanjutkan di |"]) {
      expect(badan.split("\n"), k).toContain(k);
    }
    di(T(4, "prd-v4.mdx"), "4.1", "| Besaran | Nilai | Cara hitung |");
    di(T(4, "prd-v4.mdx"), "4.1", '<div class="prd-kepala" role="group" aria-label="Kepala dokumen PRD v4">');
    harus("**Metrik keberhasilan (target, Asumsi)**");
    harus("**Batasan**");
    harus("**Beban yang diharapkan (Asumsi)**");
    harus("**Yang melewati batas lebih dulu (Hitungan atas Asumsi)**");
    harus("<Rantai data={prdDiagram} />");
    expect(hitung(badan, "<Rantai"), "jumlah <Rantai").toBe(1);
    expect(hitung(mdx, "import "), "jumlah impor").toBe(3);
    expect(mdx).toContain('import prdDiagram from "../../../../data/diagram/t5-prd-sebelum-sesudah.json";');
  });
  test("kalimat pengait yang tidak punya padanan satu baris di naskah", () => {
    for (const k of [
      "Tiga hal berubah sekaligus.",
      "Tahap 5 berangkat dari `api-t4` di akhir Tahap 4, belum dari sistem yang sudah dibereskan. Tiga hal masih terbuka:",
      "Tahap 5 punya tiga tokoh baru:",
      "Tiga pertanyaan ini ada di PRD v5, tapi belum dijawab:",
      "Dua belas ADR sebelumnya",
    ]) harus(k);
    di(latar, "naskah", "Tahap 5 berangkat dari `api-t4` di akhir Tahap 4, bukan dari sistem yang sudah dibereskan.");
    di(latar, "naskah", "Tiga hal berubah sekaligus");
    di(latar, "naskah", "**salinan datang**");
    di(latar, "naskah", "**pihak luar memanggil masuk**");
    di(latar, "naskah", "**tim dan rilis berlipat**");
    harus("1. **Salinan datang.** Laporan, riwayat, pengumuman, dan cadangan membaca data yang sama dari banyak tempat, sehingga Rekeningo untuk pertama kali punya data yang sengaja tertinggal.");
    di(latar, "naskah", "**pihak luar memanggil masuk**: POS milik mitra membuat QR dan membaca status pembayaran lewat API publik.");
    harus("3. **Tim dan rilis berlipat.** 28 orang dalam delapan tim merilis hampir tiap hari ke enam service.");
    di(latar, "naskah", "28 orang dalam delapan tim merilis hampir tiap hari ke enam service.");
    harus("Sinta lalu menulis PRD v5. Targetnya 1.000.000 user terdaftar, 20% aktif tiap hari, dan ±200.000 merchant (Asumsi). Sinta menulis \"ratusan ribu merchant\", dan halaman ini memakai batas bawahnya, 200.000.");
    di(latar, "naskah", "kata \"ratusan ribu\" dari Sinta ditulis 200.000 (Asumsi; R5-36)");
    harus("PRD v5 menyebut tujuannya uang elektronik nasional, yaitu Rekeningo yang dipakai di satu negara. Frasa itu tidak membawa klaim izin atau regulasi apa pun.");
    di(latar, "naskah", 'Frasa "uang elektronik nasional" di PRD v5 tidak membawa klaim izin atau regulasi apa pun.');
    harus("Nama tahap ini, \"Satu database tidak cukup\", tidak berarti satu primary, yaitu database utama yang menerima semua tulisan, terbukti kurang untuk menulis. Kapasitasnya belum terukur. Maksudnya satu database yang dipakai untuk menulis uang, melayani laporan, dan menyimpan arsip tidak cukup.");
    expect(cerita.tahap[4]!.nama).toBe("Satu database tidak cukup");
    di(naskah5, "naskah", "Maksudnya satu database yang dipakai untuk menulis uang, melayani laporan, dan menyimpan arsip tidak cukup.");
    harus("Uji coba publik lolos di minggu ke-12 Tahap 4 ([[t4-m39]]). Rekonsiliasi, yaitu mencocokkan catatan sendiri dengan catatan pihak lain, selisih Rp0 tiap hari, atau insidennya tertutup dalam satu hari kerja. Itu berlangsung 14 hari berturut-turut (angka target Tahap 4, [Asumsi](/cara-pakai/#label-sumber)).");
    di(latar, "naskah", "Rekonsiliasi harian selisih Rp0 atau insiden tertutup dalam satu hari kerja selama 14 hari berturut-turut (target Tahap 4, Asumsi)");
    di(T(4, "m39-prd-v5.mdx"), "4.27", "Pak Hadi membuka laporan rekonsiliasi hari ke-14 berturut-turut");
    di(glosarium, "glosarium", "| **Rekonsiliasi** | Mencocokkan catatan sendiri dengan catatan pihak lain");
    harus("- Kapasitas satu server belum pernah diukur. `make beban` di lab `api-t4` memutar beban berjadwal di satu laptop, dan rekamannya menulis bahwa itu bukan kapasitas produksi ([[t4-m39]]).");
    harus("- RPO adalah titik waktu terakhir yang harus bisa dipulihkan sesudah gangguan, jadi data terakhir yang boleh hilang. RTO adalah lama waktu paling lama sampai sistem pulih. PRD v4 tidak menulis keduanya ([[t4-prd]]).");
    harus("- `api-t4` gagal gerbang pemindaian ADR 44 pada Go 1.27.1 ([[t4-tim-infra]]).");
    di(teksHalaman("t4-tim-infra"), "ADR 44", "gerbang lab menolak api-t4 dengan Go 1.27.1");
    di(teksHalaman("t4-adr-45"), "ADR 45", "rekamannya menulis bahwa itu bukan klaim kapasitas produksi (`beban.txt` bagian A)");
    di(baca("labs/api-t4/output/beban.txt"), "beban.txt", "Bukan klaim kapasitas produksi.");
    di(baca("labs/api-t4/output/beban.txt"), "beban.txt", "bukan kapasitas produksi");
    harus("Merchant naik 435 kali dari Tahap 4");
    expect(hitung(badan, "Pak Hadi")).toBeGreaterThanOrEqual(5);
  });
});

describe("klaim negatif dan klaim universal berlingkup", () => {
  test("PRD v4 tidak menulis RPO, RTO, waktu pulih, atau jendela kehilangan data: lingkup blok PRD 4.1 sebelum 'Yang dibuka lagi' dan naskah Tahap 5", () => {
    const POLA = /waktu pulih|jendela kehilangan|\bRPO\b|\bRTO\b|recovery (time|point)/i;
    const p4 = T(4, "prd-v4.mdx");
    const sebelum = p4.split('<Blok nama="Yang dibuka lagi dari Tahap 3">')[0]!;
    expect(sebelum.match(POLA), "blok PRD 4.1").toBeNull();
    di(p4, "4.1", "PRD v3 tidak menulis batas itu, dan PRD v4 juga tidak.");
    expect(p4.split('<Blok nama="Yang dibuka lagi dari Tahap 3">')[1]).toMatch(POLA);
    di(naskah5, "naskah", "PRD v3 dan v4 tidak menulis batas waktu pulih atau jendela kehilangan data");
    // Halaman ini menulis keduanya: RPO nol dan RTO 15 menit hanya di baris P0, metrik, kalimat arti, ADR 33, dan glosarium.
    expect(hitung(badan, "RPO nol")).toBe(4);
    expect(hitung(badan, "RTO 15 menit")).toBe(3);
  });
  test("tanpa klaim izin atau regulasi: kata izin, kepatuhan, dan regulasi hanya di dua kalimat", () => {
    const POLA = /\bizin\b|kepatuhan|regulasi|lisensi|\bOJK\b|Bank Indonesia|\bBI\b|\bPCI\b|\bGDPR\b|\bKYC\b/gi;
    const kena = badan.split("\n").filter((b) => { POLA.lastIndex = 0; return POLA.test(b); });
    expect(kena).toEqual([
      "PRD v5 menyebut tujuannya uang elektronik nasional, yaitu Rekeningo yang dipakai di satu negara. Frasa itu tidak membawa klaim izin atau regulasi apa pun.",
      "**Bukan lingkup v5:** pembayaran offline, pencairan merchant otomatis lewat bank (tetap file), tarik tunai, kartu fisik, dan multi-mata uang. Bunga atau pinjaman dari PT juga bukan lingkup, dan tidak ada klaim izin atau kepatuhan regulasi apa pun.",
    ]);
    expect(front.match(POLA)).toBeNull();
    expect(rantaiTeks.match(POLA)).toBeNull();
    expect(hitung(badan, "uang elektronik")).toBe(1);
  });
  test("semua pihak ketiga tiruan lokal dan merek nyata tidak dipakai", () => {
    const MEREK = /Stripe|Midtrans|Xendit|Mastercard|\bVisa\b|GoPay|OVO|Dana|QRIS|EMVCo|Google Pay|Apple Pay|PayPal|Tokopedia|Shopee|Kafka|Argo|Redis|Prime Video|37signals|Shorebird|Coraza|OpenBao|DBOS/;
    expect(badan.match(MEREK)).toBeNull();
    expect(rantaiTeks.match(MEREK)).toBeNull();
    expect(front.match(MEREK)).toBeNull();
    harus("- Semua pihak ketiga berupa tiruan lokal di lab.");
    expect(badan).not.toMatch(/layanan/);
  });
  test("kata penuh dan negatif dicari tandingannya: tidak ada 'selalu', 'tidak pernah', 'setiap', 'semua' di prosa kecuali yang dikunci", () => {
    const prosa = badan.split("\n").filter((b) => !b.startsWith("|") && !b.startsWith("import ") && !b.startsWith("<")).join("\n");
    const kena = [...prosa.matchAll(/[^.\n]*\b(selalu|tidak pernah|tak satu pun|tidak satu pun|di semua|semua stack|setiap)\b[^.\n]*\./gi)].map((m) => m[0]!.trim());
    expect(kena).toEqual([
      "Ia ingin angka yang cocok sampai rupiah terakhir, tetapi menganggap batch malam selalu bisa diulang dari awal.",
      "Ia ingin kasir yang tidak pernah menunggu Rekeningo, tetapi mengulang permintaan tanpa batas bila tidak ada jawaban.",
    ]);
    di(latar, "naskah", "Menganggap batch malam selalu bisa diulang dari awal");
    di(latar, "naskah", "Kasir yang tidak pernah menunggu Rekeningo");
    const penuh = [...prosa.matchAll(/[^.\n]*\b(semua|seluruh)\b[^.\n]*\./gi)].map((m) => m[0]!.trim());
    expect(penuh).toEqual([
      'Nama tahap ini, "Satu database tidak cukup", tidak berarti satu primary, yaitu database utama yang menerima semua tulisan, terbukti kurang untuk menulis.',
      "- Semua pihak ketiga berupa tiruan lokal di lab.",
      "- Security review Laras lolos sebelum tiap rilis ke seluruh negeri.",
      "Masalah pertama dari semua ini datang di [[t5-m40]].",
    ]);
    di(bag1 + latar, "naskah", "Semua pihak ketiga berupa tiruan lokal di lab.");
    di(bag1 + latar, "naskah", "Security review Laras lolos sebelum tiap rilis ke seluruh negeri.");
    // "tidak" yang menyangkal fakta tentang sumber: dihitung per kalimat di blok 8 dan di Latar, bukan dihapus atau ditambah.
    expect(hitung(badan, "tidak memuat inbox")).toBe(1);
    expect(hitung(badan, "tidak menulis kata itu")).toBe(1);
    expect(hitung(badan, "tidak menulis keduanya")).toBe(1);
    expect(hitung(badan, "tidak berarti")).toBe(1);
  });
});

describe("diagram Rantai t5-prd-sebelum-sesudah.json", () => {
  test("ilustrasi, dua baris, simpul dari naskah, registry, 4.31, dan PRD v3", () => {
    expect(rantai.id).toBe("t5-prd-sebelum-sesudah");
    expect(rantai.sumber).toEqual({ jenis: "ilustrasi", teks: "Ringkasan PRD v5" });
    expect(rantai.judul).toBe("Sesudah Tahap 4 dan yang diminta PRD v5");
    const bentuk = rantai.baris.map((b) => ({ label: b.label, sub: b.sub ?? null, simpul: b.simpul.map((s) => [s.teks, s.sub ?? null, s.nada ?? null]) }));
    expect(bentuk).toEqual(NILAI_RANTAI);
    expect(rantai.baris.map((b) => b.simpul.length)).toEqual([4, 4]);
    // Tali ke sumber: tiap simpul meringkas kalimat yang ada di registry, halaman Tahap 3 dan 4, atau naskah.
    di(cerita.tahap[4]!.sebelumnya, "registry", "satu primary PostgreSQL menulis uang, melayani laporan, dan menyimpan arsip");
    di(T(3, "prd-v3.mdx") + T(4, "jembatan-prd-v5.mdx"), "PRD v3 dan 4.31", "API untuk kasir pihak ketiga");
    di(latar, "naskah", "Satu monolith Go dengan lima modul dan satu service `pembayaran`");
    di(T(4, "modular-monolith.mdx"), "4.13", "Lima modul berjalan di satu proses");
    expect(5 + 4 + 4).toBe(13);
    expect(rantai.baris[0]!.simpul[3]!.teks).toBe("13 engineer, tiga tim");
    expect(rantai.baris[1]!.simpul[3]!.teks).toBe("28 engineer, delapan tim");
    expect(rantai.baris[1]!.sub).toBe("satu negara, 16 minggu");
    expect(rantai.baris[1]!.simpul[0]!.sub).toBe("tertinggal paling lama 5 detik");
    expect(rantai.baris[1]!.simpul[1]!.teks).toBe("Pulih dalam 15 menit");
    expect(rantai.catatan).toBe("Kotak biru adalah fitur dan kondisi di PRD v5. Kotak hijau adalah target pulih, Asumsi produk.");
    expect(rantai.baris[1]!.simpul.map((s) => s.nada)).toEqual(["system", "good", "system", "system"]);
    expect(rantai.baris[0]!.simpul.map((s) => s.nada ?? "biasa")).toEqual(["biasa", "warn", "biasa", "biasa"]);
    expect(rantaiTeks).not.toMatch(/\bRPO\b|\bRTO\b/);
  });
  test("Rantai: jumlah kata per simpul pendek supaya dua baris muat di HP; teks tidak memuat isi Tahap 5 di luar PRD", () => {
    for (const b of rantai.baris) for (const s of b.simpul) expect(s.teks.split(" ").length, s.teks).toBeLessThanOrEqual(5);
    expect(rantaiTeks).not.toMatch(/ADR \d|replica|failover|Kubernetes|kill switch/i);
  });
});

describe("halaman tidak membuka isi Tahap 5 lebih dari PRD-nya, dan ID internal tidak tampil", () => {
  // Hasil dan solusi M40 dan seterusnya dibuka di halaman masalahnya; PRD hanya menunjuk ke sana.
  test("halaman menunjuk ke halaman masalah tanpa menulis isi jawabannya", () => {
    const TERLARANG = /PgBouncer|token LSN|remote_apply|replica sinkron|failover otomatis|\bfencing\b|mTLS|saga|Argo|canary|envelope|Coraza|\bDBOS\b/i;
    expect(badan.replace(/\[\[[^\]]+\]\]/g, "").match(TERLARANG), "halaman memuat isi Tahap 5").toBeNull();
    expect(front.match(TERLARANG)).toBeNull();
  });
  test("ID riset, nomor keputusan, nomor PR, dan ID internal tidak tampil", () => {
    for (const t of [badan, front, rantaiTeks]) {
      expect(t).not.toMatch(/\bR\d-\d{2,3}\b/);
      expect(t).not.toMatch(/keputusan \d{2,4}|\bPR #?\d{3}|#\d{3}\b/i);
    }
    expect(badan.replace(/\[\[[^\]]+\]\]/g, "")).not.toMatch(/\b[A-G]\d(\.\d)?\b(?!\))/);
    expect(badan).not.toMatch(/KONSISTENSI|T5-siap|DIRI-\d|EVAL-\d|NASKAH-\d|ANTREAN|MEMORI|STATUS\.md/);
    // Label rekaman internal ditulis dengan kata ("bagian C"), bukan huruf lepas.
    expect(badan).not.toMatch(/\b(bagian|# ---) [A-G]\.\s/);
    expect(badan).toContain("`proses-mati.txt` bagian C");
    expect(badan).not.toMatch(/\d B\b/);
  });
});

describe("semua angka di halaman bisa diturunkan", () => {
  // Setiap angka di prosa dan tabel (tanpa ID, kode, dan nomor ADR) harus ada di himpunan ini. Mengubah satu angka menjadi
  // nilai yang tidak diturunkan gagal di sini, dan menjadi nilai yang diturunkan tetapi di tempat salah gagal di tes sel.
  const diizinkan = new Set<string>([
    titik(a5.user), titik(a4.user), titik(aktif), titik(reqHari), "86.400", "1.388,9", fmt(reqRata, 1), // beban
    titik(trxHari), titik(trxHari2), fmt(trxPuncak, 1), fmt(trxPuncak2, 1), titik(topupHari), fmt(topupPuncak, 2), koma(topupPerUser, 2),
    `${titik(postingTahun / 1e6)}`, `${titik(postingTahun2 / 1e6)}`, "365", "2", "3", "10", "20", "60", String(a5.puncak), String(a5.aktif),
    koma(kapasitas, 2), String(cKirim), koma(tKirim, 1), fmt(notifPuncak, 1), fmt(notifPuncak2, 1), "564", "391", "56", "100", "1",
    titik(pengumumanDetik), fmt(pengumumanDetik / 3600, 1), titik(pengumumanDetik4), titik(a4.user), String(pengirimTarget), String(prosesTarget),
    titik(targetMenit * 60), "555,6", koma(pengirimTarget / cKirim, 2), fmt(lajuTarget * tKirim, 1), "1.800", "30", "42", "167", "41,75",
    String(koneksiTerpasang), String(koneksiTersedia), kon[1]!, kon[2]!, kon[3]!, kon[5]!, kon[6]!, titik(bulat((koneksiTerpasang / koneksiTersedia) * 100)), "180", "97", "27,8", koma(wQuery, 2),
    "435", "434,8", "460", titik(merchant5), "200.000", "±200.000", // merchant
    "43.200", "43,2", "0,001", "99,9", "24", "5", "35", "14", "12", // error budget dan jadwal
    "1.157", "500", "0,14", "0,0075", "3,3", "15", "50", "21", "8", "40", "23", "25", "28", "13", "16", // ADR
    "6", "4", "0", "11", "33", "34", "36", "37", "38", "42", "44", "45", "46", "49", "54", "59", "26", "41", "9", "7", // nomor ADR, rilis, dan penghitung
    "44", "1.27.1", "1.000.000", "100", "70", "75,2", "20,8", "13,33", "52,1", "0,3", "0,02", "0,25", "100.000", // sisa
    "±50", "59", "±440", "440", "438", "292", "1.157", "87", "88",
    String(dari("t5-prd").menit), // menit baca dari registry
  ]);
  test("tidak ada angka di luar himpunan turunan, tabel, dan naskah bagian 1", () => {
    const b = badan
      .replace(/^import .*$/gm, "")
      .replace(/\[\[[^\]]+\]\]/g, "")
      .replace(/`[^`]*`/g, "")
      .replace(/\(\/cara-pakai\/[^)]*\)/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\bP[0-2]\b|PRD v\d|\bv[1-6]\b|Tahap \d|ADR \d+(, \d+)*(,? dan \d+)?|\bM\d+\b|api-t\d|t4-modul|[a-z][a-z0-9]*-[a-z0-9-]+/g, "");
    const angka = [...new Set(b.match(/\d+(?:[.,]\d+)*/g) ?? [])];
    const asal = bag1 + latar + bag3 + JSON.stringify(dataTebak) + ["t1-sql-injection", "t2-adr-ledger", "t1-adr-12", "B2.2", "t2-idempotency", "t4-webhook", "t3-dua-instance", "t3-adr-33", "t4-breaker", "t4-storage", "t4-kartu", "t4-tim-infra", "t4-adr-45", "t4-ssrf", "t4-qr", "t4-modul"].map(teksHalaman).join(" ");
    const sumber = new Set([...asal.matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => m[0]));
    expect(angka.filter((a) => !diizinkan.has(a) && !sumber.has(a)), "angka tanpa asal di naskah, halaman ADR, atau himpunan turunan").toEqual([]);
  });
  test("rumus 86.400 detik per hari dan 30 hari 43.200 menit", () => {
    expect(24 * 60 * 60).toBe(86400);
    expect(30 * 24 * 60).toBe(43200);
  });
});

describe("label kejujuran dan arti istilah", () => {
  test("Asumsi di angka beban, Rekaman lab satu kali, Tidak dijalankan satu kali, penalaran dan Hitungan atas Asumsi dihitung", () => {
    harus("**Beban yang diharapkan (Asumsi)**");
    harus("**Yang melewati batas lebih dulu (Hitungan atas Asumsi)**");
    harus("(Ilustrasi: contoh, bukan hasil sistem)");
    expect(hitung(badan, "Rekaman lab")).toBe(3);
    expect(hitung(badan, "Tidak dijalankan")).toBe(3);
    expect(hitung(badan, "(penalaran)")).toBe(2);
    expect(hitung(badan, "penalaran")).toBe(5);
    expect(hitung(badan, "Hitungan atas Asumsi")).toBe(5);
    expect(hitung(badan, "(Asumsi cerita)")).toBe(3);
    expect(hitung(badan, "Asumsi produk")).toBe(5);
    expect(hitung(badan, "[perlu verifikasi]")).toBe(0);
    // Tiap baris tabel Beban satu berlabel (asumsi) atau menunjuk PRD v5.
    for (const b of badan.split("\n").filter((x) => /^\| (User terdaftar|User aktif|Request|Puncak|Transaksi uang|Posting|Top-up dari bank)/.test(x))) expect(/\(asumsi\)|PRD v5/.test(b), b).toBe(true);
    // Rekaman lab hanya untuk proses-mati.txt; selebihnya Hitungan, Asumsi, Ilustrasi, atau Tidak dijalankan.
    expect(hitung(badan, "Rekaman lab t4-modul, `proses-mati.txt` bagian C")).toBe(1);
  });
  test("istilah baru diberi arti di pemakaian pertamanya, dan artinya dijaga (RPO, RTO, error budget, SLO, failover, batch harian, WAF, Kubernetes, read replica, primary, kill switch)", () => {
    const DEF: Array<[string, string]> = [
      ["RPO", "adalah titik waktu terakhir yang harus bisa dipulihkan sesudah gangguan, jadi data terakhir yang boleh hilang."],
      ["RTO", "adalah lama waktu paling lama sampai sistem pulih."],
      ["Error budget", "adalah 100% dikurangi target ketersediaan, dikalikan lama periode."],
      ["SLO", "adalah target ketersediaan yang diukur,"],
      ["failover", "adalah memindahkan tugas database utama ke salinannya."],
      ["batch harian", ", yaitu program terjadwal yang tiap hari memproses banyak angsuran,"],
      ["Read replica", "adalah salinan database yang melayani bacaan."],
      ["primary", ", yaitu database utama yang menerima semua tulisan,"],
      ["Rekonsiliasi", ", yaitu mencocokkan catatan sendiri dengan catatan pihak lain,"],
    ];
    for (const [istilah, arti] of DEF) {
      const potongan = arti.startsWith(",") ? `${istilah}${arti}` : `${istilah} ${arti}`;
      harus(potongan);
      expect(badan.toLowerCase().indexOf(istilah.toLowerCase()), `pemakaian pertama "${istilah}" harus yang diberi arti`).toBe(badan.indexOf(potongan));
    }
    expect(badan.indexOf("kill switch, yaitu sakelar yang mematikan satu fitur tanpa deploy")).toBeGreaterThan(0);
    expect(badan.indexOf("kill switch")).toBe(badan.indexOf("kill switch, yaitu"));
    expect(badan.indexOf("WAF")).toBe(badan.indexOf("WAF, yaitu penyaring permintaan HTTP di depan API"));
    expect(badan.indexOf("Kubernetes")).toBeGreaterThan(0);
    harus("menjadwalkan Kubernetes, program yang menjalankan banyak container di banyak mesin, di Tahap 5");
    // Glosarium: RPO, RTO, dan error budget punya baris sendiri yang menunjuk 5.1 dan sama dengan arti di halaman.
    const g = (nama: string) => barisAwal(glosarium, `| **${nama}**`);
    di(g("RPO"), "glosarium", "Titik waktu terakhir yang harus bisa dipulihkan sesudah gangguan, jadi data terakhir yang boleh hilang.");
    di(g("RTO"), "glosarium", "Lama waktu paling lama yang boleh dipakai sampai sistem pulih sesudah gangguan.");
    di(g("Error budget"), "glosarium", "100% dikurangi target ketersediaan, dikalikan lama periode. Target 99,9% per 30 hari memberi 43,2 menit.");
    for (const n of ["RPO", "RTO", "Error budget"]) expect(g(n).trim().endsWith("| [[t5-prd]] |"), n).toBe(true);
    const daftarIstilah = glosarium.split("\n").filter((x) => /^\| \*\*/.test(x)).map((x) => x.split("**")[1]!);
    for (const n of ["RPO", "RTO", "Error budget"]) expect(daftarIstilah.filter((x) => x.startsWith(n)), n).toHaveLength(1);
    const baris = (n: string) => daftarIstilah.findIndex((x) => x.startsWith(n));
    expect(baris("Error budget")).toBe(baris("ERP") + 1);
    expect(baris("RPO")).toBe(baris("Router") + 1);
    expect(baris("RTO")).toBe(baris("RPO") + 1);
    const glosJson = JSON.parse(baca("situs/data/glosarium.json")) as Array<{ t: string; d: string }>;
    expect(glosJson.filter((x) => /^(RPO|RTO|Error budget)/.test(x.t)).map((x) => x.t)).toEqual(["Error budget", "RPO (recovery point objective)", "RTO (recovery time objective)"]);
  });
  test("sumber definisi RPO, RTO, dan error budget tercatat di baris riset dengan tanggal akses, tanpa tampil ke pembaca", () => {
    const r = (id: string) => barisAwal(riset5, `| ${id} |`);
    di(r("R5-112"), "R5-112", "NIST SP 800-34 Rev. 1");
    di(r("R5-112"), "R5-112", "csrc.nist.gov/glossary/term/recovery_point_objective");
    di(r("R5-112"), "R5-112", ".../recovery_time_objective");
    di(r("R5-112"), "R5-112", "dibuka 2026-10-31");
    di(r("R5-112"), "R5-112", '"The point in time to which data must be recovered after an outage."');
    di(r("R5-112"), "R5-112", "\"The overall length of time an information system's components can be in the recovery phase\"");
    di(r("R5-113"), "R5-113", "Google SRE Workbook");
    di(r("R5-113"), "R5-113", "sre.google/workbook/implementing-slos/");
    di(r("R5-113"), "R5-113", "dibuka 2026-10-31");
    di(r("R5-113"), "R5-113", '"the SLO is a target percentage and the error budget is 100% minus the SLO."');
    expect(badan).not.toMatch(/NIST|SRE Workbook|sre\.google/);
  });
});

describe("baris riset R5-110 sampai R5-114: ada, urut, tanpa ganda, dan memuat hitungan dan sumber yang dipakai halaman", () => {
  const baris = riset5.split("\n").filter((b) => /^\| R5-\d+ \|/.test(b));
  const idRiset = baris.map((b) => b.split("|")[1]!.trim());
  test("lima baris milik halaman ini berurutan dan tidak ganda; ID R5 lain tidak dikunci pada tetangganya", () => {
    expect(new Set(idRiset).size).toBe(idRiset.length);
    const nomor = idRiset.map((x) => Number(x.replace("R5-", "")));
    const idx = nomor.reduce<number[]>((a, n, i) => (n >= 110 && n <= 114 ? [...a, i] : a), []);
    expect(nomor.filter((n) => n >= 110 && n <= 114)).toEqual([110, 111, 112, 113, 114]);
    // Rentang saja: baris lain boleh disisipkan di antara kelimanya oleh halaman lain (pelajaran #434, #438, #464).
    expect(idx).toHaveLength(5);
    expect(idx.every((v, i) => i === 0 || v > idx[i - 1]!)).toBe(true);
    const urut = nomor.every((n, i) => i === 0 || n > nomor[i - 1]!);
    expect(urut).toBe(true);
    for (const b of baris.filter((x) => /^\| R5-11[0-4] /.test(x))) expect(sel(b), b.slice(0, 20)).toHaveLength(5);
  });
  test("R5-110 memuat tiap hitungan halaman; R5-111 memuat tiap halaman ADR dan hasil pemindaian; R5-114 memuat kunci tebakan", () => {
    const r110 = baris.find((b) => b.startsWith("| R5-110 |"))!;
    for (const k of [
      "200.000 ÷ 460 = 434,78", "12.000.000 ÷ 86.400 = 138,89", "× 10 = 1.388,89", "600.000 ÷ 86.400 × 10 = 69,44", "50.000 ÷ 86.400 × 10 = 5,79",
      "200.000 × 3 × 2 × 365 = 438 juta", "200.000 × 2 × 2 × 365 = 292 juta", "4 ÷ 0,3 = 13,33", "650.000 ÷ 86.400 × 10 = 75,23", "75,2 ÷ 13,33 = 564%", "52,1 ÷ 13,33 = 391%",
      "1.000.000 × 0,3 ÷ 4 = 75.000 detik = 20,8 jam", "166,7 (167 pengirim, 42 proses)", "6 × 3 × 10 = 180", "100 − 3 = 97", "180 ÷ 97 = 186%", "1.388,9 × 0,02 = 27,8",
      "0,001 × 43.200 = 43,2", "30 + 5 = 35", "15 ÷ 460 = 3,3% dan 15 ÷ 200.000 = 0,0075%", "20.000 × 500 ÷ 86.400 × 10 = 1.157", "4 × 6 + 2 × 2 = 28",
    ]) di(r110, "R5-110", k);
    expect(fmt(200000 / 460, 2)).toBe("434,78");
    expect(fmt(((aktif * 3 * 2 * 365) / 1e6), 0)).toBe("438");
    const r111 = baris.find((b) => b.startsWith("| R5-111 |"))!;
    for (const f of ["tahap-4/sengaja-belum.mdx", "tahap-4/timeout-retry-breaker.mdx", "tahap-4/modular-monolith.mdx", "tahap-4/tim-infra.mdx", "tahap-4/ssrf.mdx", "tahap-4/qr-pembayaran.mdx", "tahap-4/object-storage-presigned.mdx", "tahap-4/kartu-virtual.mdx", "tahap-4/webhook-masuk.mdx", "tahap-2/retry-idempotency.mdx", "tahap-3/sengaja-belum.mdx", "tahap-3/dua-instance.mdx", "tahap-2/adr-ledger.mdx", "tahap-1/sengaja-belum.mdx", "tahap-1/sql-injection.mdx", "tahap-1/sql-atau-nosql.mdx", "labs/t4-modul/output/proses-mati.txt"]) di(r111, "R5-111", f);
    di(r111, "R5-111", "tujuh ADR: 4, 6, 12, 26, 38, 44, dan 45; ADR 14, 33, 34, 36, 37, dan 42 tidak menulis kata itu");
    di(r111, "R5-111", "dibaca 2026-10-31".replace("dibaca", "Dibaca"));
    expect(dari("t4-modul").path).toBe("tahap-4/modular-monolith.md");
    const r114 = baris.find((b) => b.startsWith("| R5-114 |"))!;
    di(r114, "R5-114", "pilihan benar: ADR 36, 37, 44, dan 45; ADR 41 dan 40 tidak cocok");
    di(r114, "R5-114", "28 orang dalam delapan tim: lima tim produk dan tiga tim fungsi, di dalam 20 sampai 40");
    expect(dataTebak.pilihan.findIndex((p) => p.benar)).toBe(1);
  });
});

describe("sidik teks halaman dan nilai Rantai", () => {
  test("tiap baris isi mdx dan bentuk baris kosongnya sama dengan sidik; mdx tidak punya ekor kosong", () => {
    const baris = mdx.split("\n");
    expect(baris.filter((b) => b.trim())).toEqual(BARIS_MDX);
    expect(baris.map((b) => (b.trim() ? "#" : "-")).join("")).toBe(BENTUK_MDX);
    expect(mdx.endsWith("\n")).toBe(true);
  });
});
