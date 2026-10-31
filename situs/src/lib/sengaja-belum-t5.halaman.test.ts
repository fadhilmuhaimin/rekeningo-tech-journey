// Penjaga halaman 5.30 (keputusan 1616 sampai 1618): angka, ID, nomor ADR, versi dan bagian sumber, tautan, tabel, klaim "tidak ada" dan kalimat mekanisme
// di sengaja-belum.mdx (tahap-5), diagram t5-adr60-inti.json, dan Tebak t5-adr60-tebak.json. Nilai diturunkan dari registry, naskah Tahap 5 (tabel beban,
// tabel pembacaan ulang ADR 45, baris ADR 45 sampai 60), halaman 4.26, 4.29, 2.8, dan 2.31, folder lab Tahap 4, dan baris riset, bukan dari daftar yang
// ditulis sendiri. Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman dan JSON dikunci per baris di
// sengaja-belum-t5.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks sengaja diubah:
// PERBARUI_KUNCI=1 vitest run src/lib/sengaja-belum-t5.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Kalimat yang memakai sumber luar dibaca dari baris riset R5-255 sampai R5-259 (kutipan Inggris
// aslinya ada di baris itu), dan butir "belum terukur" dibaca dari naskah: halaman ini tidak punya rekaman lab, jadi tak satu pun keadaan Tahap 5 berlabel Rekaman lab.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-adr60-inti.json";
import tebakMentah from "../../data/widget/t5-adr60-tebak.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DataTebak } from "../widgets/tebak/skema";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./sengaja-belum-t5.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const HALAMAN = "situs/src/content/docs/tahap-5/sengaja-belum.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const riset4 = baca("plan/RISET-TAHAP-4.md");
const t4 = baca("situs/src/content/docs/tahap-4/sengaja-belum.mdx");
const t4Tim = baca("situs/src/content/docs/tahap-4/tim-infra.mdx");
const t2Ledger = baca("situs/src/content/docs/tahap-2/adr-ledger.mdx");
const t2Adr21 = baca("situs/src/content/docs/tahap-2/sengaja-belum.mdx");
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";

interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; adr?: number[]; peran?: string[]; path?: string; pendek?: string }
const hal = registry.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const asumsi = (registry.tahap as unknown as { asumsi: { user: number; aktif: number; req: number; puncak: number; trx: number; tim: string } }[])[4]!.asumsi;

const cari = (pola: RegExp, teks: string, nama: string): RegExpMatchArray => {
  const m = teks.match(pola);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const barisRiset = (id: string): string => riset5.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const barisRiset4 = (id: string): string => riset4.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const pecahBaris = (b: string): string[] => b.split("|").slice(1, -1).map((x) => x.trim());
const tabelDari = (teks: string, awalan: string): string[][] => {
  const semua = teks.slice(teks.indexOf(awalan)).split("\n");
  const keluar: string[][] = [];
  for (const b of semua) { if (!b.startsWith("|")) break; keluar.push(pecahBaris(b)); }
  return keluar;
};
const tabel = (awalan: string): string[][] => tabelDari(halaman, awalan);
const fmt = (x: number, d = 0): string => {
  const [i, f] = x.toFixed(d).split(".");
  const ribu = i!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return f ? `${ribu},${f}` : ribu;
};
// pembulatan setengah ke atas seperti pembaca, bukan toFixed (4.28: 0,579 × 15)
const bulat = (x: number, d: number): number => Math.floor(x * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const persen = (a: number, b: number): string => `${fmt(bulat((a / b) * 100, 0))}%`;
const angkaDari = (t: string): string[] => [...t.replace(/\]\([^)]*\)/g, "]").matchAll(/(?<![\w.])\d+(?:[.,]\d+)*(?!\w)/g)].map((m) => m[0]);
const norm = (t: string): string => t.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[,.]/g, " ").replace(/\s+/g, " ").trim();

// --- angka beban dari registry dan naskah (Asumsi), diulang dengan rumus naskah
const HARI = 86400;
const aktif = (asumsi.user * asumsi.aktif) / 100;
const naskahBeban = naskah.slice(naskah.indexOf("### Angka beban Tahap 5"), naskah.indexOf("## 3b."));
const barisNaskah = (awalan: string): string => naskahBeban.split("\n").find((b) => b.startsWith(awalan)) ?? "";
const trx3 = Number(cari(/Transaksi uang (\d) per user aktif per hari/, naskahBeban, "trx dasar")[1]);
const trx2 = asumsi.trx;
const trx3Tepat = (aktif * trx3) / HARI * asumsi.puncak;
const trx2Tepat = (aktif * trx2) / HARI * asumsi.puncak;
const trx3T = bulat(trx3Tepat, 1);
const trx2T = bulat(trx2Tepat, 1);
const topupPerUser = Number(cari(/aktif × (0,\d+) ÷ 86\.400 × puncak/, barisNaskah("| Top-up dari bank |"), "top-up per user")[1]!.replace(",", "."));
const trxPerHari = aktif * trx3;
const topupPerHari = aktif * topupPerUser;
const notifT = bulat(((trxPerHari + topupPerHari) / HARI) * asumsi.puncak, 1);
const rpsTepat = (aktif * asumsi.req) / HARI * asumsi.puncak;
const rpsT = bulat(rpsTepat, 1);
const menitPengumuman = Number(cari(/Target (\d+) menit: 1\.000\.000 ÷ 1\.800 = 555,6 per detik/, barisNaskah("| Pengumuman ke 1.000.000 HP |"), "target pengumuman")[1]);
const detikPengumuman = menitPengumuman * 60;
const pengumumanT = bulat(1_000_000 / detikPengumuman, 1);
const gabungT = bulat(notifT + pengumumanT, 1);
const barisKoneksi = barisNaskah("| Koneksi database |");
const kon = cari(/(\d+) × (\d+) × (\d+) = (\d+) terpasang; tersedia (\d+) − (\d+) = (\d+)/, barisKoneksi, "koneksi");
const [nService, nInstance, nPool, nTerpasang, maxKoneksi, nCadangan, nTersedia] = kon.slice(1).map(Number) as [number, number, number, number, number, number, number];
const barisBaca = barisNaskah("| Baca selain uang |");
const waktuQuery = Number(cari(/× (0,\d+)\)?/, barisBaca, "W baca")[1]!.replace(",", "."));
const lBaca = bulat((rpsT - trx3T) * waktuQuery, 1);
const lSemua = bulat(rpsT * waktuQuery, 1);
const barisReadReplica = naskah.split("\n").find((b) => b.startsWith("| 4. Read replica |")) ?? "";
const barisPgb = naskah.split("\n").find((b) => b.startsWith("| 4. PgBouncer |")) ?? "";
const pemicuKoneksi = Number(cari(/^\| 4\. PgBouncer \| (\d+) koneksi dari (\d+) \|/, barisPgb, "pemicu koneksi")[1]);
const ambangL = Number(cari(/atau L baca (\d+) koneksi/, barisReadReplica, "ambang L")[1]);
const lBaca4 = Number(cari(/L baca (\d,\d+) \(53%\)/, barisReadReplica, "L baca tahap 4")[1]!.replace(",", "."));
const pemicuPesan = Number(cari(/^\| 2\. Event streaming \| (\d+) pesan per detik terus-menerus/, naskah.split("\n").find((b) => b.startsWith("| 2. Event streaming |")) ?? "", "pemicu pesan")[1]);
const timProduk = 5;
const timFungsi = 3;
const orangTotal = Number(cari(/Totalnya 4 × 6 \+ 2 × 2 = (\d+) orang/, naskah, "total tim")[1]);
const KAPASITAS = [50, 100, 300, 500, 1000];
const v6T = bulat(trx3Tepat * 10, 1);

describe("angka beban, hitungan, dan pembanding diturunkan dari registry dan naskah Tahap 5", () => {
  test("registry Tahap 5 memakai 2 transaksi, naskah memakai 3 sebagai dasar, dan halaman menulis keduanya berlabel Asumsi", () => {
    expect(asumsi).toMatchObject({ user: 1000000, aktif: 20, req: 60, puncak: 10, trx: 2 });
    expect(trx3).toBe(3);
    expect(naskahBeban).toContain("dasar 3 dan hasil dengan 2 di sebelahnya");
    expect([fmt(aktif), fmt(trx3T, 1), fmt(trx2T, 1), fmt(notifT, 1), fmt(rpsT, 1), fmt(pengumumanT, 1), fmt(gabungT, 1)]).toEqual(["200.000", "69,4", "46,3", "75,2", "1.388,9", "555,6", "630,8"]);
    expect(barisNaskah("| Request per detik |")).toContain(`${fmt(rpsT, 1)} puncak`);
    expect(barisNaskah("| Transaksi uang (bayar, transfer, QR) |")).toContain(`${fmt(trx3T, 1)} puncak (trx 2: ${fmt(bulat(aktif * trx2 / HARI, 2), 2)} dan ${fmt(trx2T, 1)})`);
    expect(barisNaskah("| Notifikasi uang dan worker |")).toContain(`${fmt(notifT, 1)} per detik puncak`);
    expect(naskahBeban).toContain(`${fmt(trxPerHari)} per hari (trx 2: ${fmt(aktif * trx2)})`);
    expect(barisNaskah("| Top-up dari bank |")).toContain(`${fmt(topupPerHari)} per hari`);
    expect(naskahBeban).toContain(`${fmt(notifT, 1)} per detik puncak = 564% kapasitas`);
    expect(badan).toContain(`Masukan Asumsi naskah Tahap 5: 1.000.000 user terdaftar, ${asumsi.aktif}% aktif per hari, dan faktor puncak ${asumsi.puncak}.`);
    expect(badan).toContain(`Tiap user aktif membuat ${asumsi.req} request, ${trx3} transaksi uang, dan ${fmt(topupPerUser, 2)} top-up dari bank per hari.`);
    expect(badan).toContain(`Registry Tahap 5 memakai ${trx2} transaksi, jadi angka dengan ${trx2} ditulis di sebelahnya.`);
    expect(badan).toContain(`1.000.000 × ${asumsi.aktif}% = ${fmt(aktif)} per hari`);
    expect(badan).toContain(`${fmt(aktif)} × ${trx3} ÷ ${fmt(HARI)} × ${asumsi.puncak} = ${fmt(trx3T, 1)} per detik (dua transaksi: ${fmt(trx2T, 1)})`);
    expect(badan).toContain(`(${fmt(trxPerHari)} + ${fmt(topupPerHari)}) ÷ ${fmt(HARI)} × ${asumsi.puncak} = ${fmt(notifT, 1)} per detik`);
    expect(badan).toContain(`Angka ${fmt(trxPerHari)} adalah transaksi uang per hari, dan ${fmt(topupPerHari)} adalah top-up per hari.`);
    expect(badan).toContain(`1.000.000 ÷ ${fmt(detikPengumuman)} = ${fmt(pengumumanT, 1)} per detik`);
    expect(badan).toContain(`${fmt(aktif)} × ${asumsi.req} ÷ ${fmt(HARI)} × ${asumsi.puncak} = ${fmt(rpsT, 1)} per detik`);
    expect(menitPengumuman).toBe(30);
    expect(fmt(bulat(notifT + pengumumanT, 1), 1)).toBe("630,8");
  });
  test("koneksi: rumus, hasil, pemicu 70, dan L baca sama dengan naskah dan halaman 4.29", () => {
    expect([nService, nInstance, nPool, nTerpasang, maxKoneksi, nCadangan, nTersedia]).toEqual([6, 3, 10, 180, 100, 3, 97]);
    expect(nService * nInstance * nPool).toBe(nTerpasang);
    expect(maxKoneksi - nCadangan).toBe(nTersedia);
    expect([pemicuKoneksi, ambangL, lBaca4, pemicuPesan, waktuQuery]).toEqual([70, 5, 2.64, 100, 0.02]);
    expect([lBaca, lSemua]).toEqual([26.4, 27.8]);
    expect(persen(lBaca, ambangL)).toBe("528%");
    expect(persen(nTerpasang, pemicuKoneksi)).toBe("257%");
    expect(persen(40, pemicuKoneksi)).toBe("57%");
    expect(persen(lBaca4, ambangL)).toBe("53%");
    expect(persen(notifT, pemicuPesan)).toBe("75%");
    expect(fmt(bulat(gabungT / pemicuPesan, 1), 1)).toBe("6,3");
    expect(badan).toContain(`(${fmt(rpsT, 1)} − ${fmt(trx3T, 1)}) × ${fmt(waktuQuery, 2)} = ${fmt(lBaca, 1)} koneksi`);
    expect(badan).toContain(`${fmt(rpsT, 1)} × ${fmt(waktuQuery, 2)} = ${fmt(lSemua, 1)} koneksi`);
    expect(badan).toContain(`Terpasang ${nService} service × ${nInstance} instance × pool ${nPool} = ${nTerpasang}, dan tersedia ${maxKoneksi} − ${nCadangan} = ${nTersedia}.`);
    expect(badan).toContain("Koneksi: L = λ × W, yaitu koneksi tertahan (L) sama dengan laju kedatangan (λ, per detik) kali lama satu koneksi ditahan (W, detik).");
    expect(badan).toContain(`Waktu ${fmt(waktuQuery, 2)} detik per query, ${nPool} pool per instance, dan ${nCadangan} koneksi cadangan adalah Asumsi naskah.`);
    expect(barisKoneksi).toContain(`L = ${fmt(rpsT, 1)} × ${fmt(waktuQuery, 2)} = ${fmt(lSemua, 1)}`);
    expect(barisBaca).toContain(`L = ${fmt(lBaca, 1)} koneksi`);
    expect(naskah.split("\n").find((b) => b.startsWith("| 4. PgBouncer |"))).toContain(`${nTerpasang} terpasang (257%), rata-rata terpakai ${fmt(lSemua, 1)}`);
    expect(t4).toContain("Ambang 70 koneksi dan 100 pesan per detik adalah Asumsi [[t3-adr-33]]");
    expect(t4).toContain("Ambang 5 koneksi adalah Asumsi [[t2-adr-21]]");
  });
  test("tim dan beban PRD v6: 5 tim produk, 3 tim fungsi, 28 orang, dan beban 10 kali dari nilai tepat", () => {
    expect([timProduk, timFungsi, orangTotal]).toEqual([5, 3, 28]);
    expect(naskah).toContain("5 tim produk dan 3 tim fungsi: terpenuhi");
    expect([fmt(v6T, 1), fmt(bulat(trx3Tepat, 2), 2), fmt(trx2T * 10, 0)]).toEqual(["694,4", "69,44", "463"]);
    expect(fmt(bulat(bulat(trx3Tepat, 2) * 10, 1), 1)).toBe(fmt(v6T, 1));
    expect(naskah).toContain(`${fmt(v6T, 1)} transaksi uang per detik`);
    expect(badan).toContain(`${fmt(trx3T, 1)} × 10 = ${fmt(trx3T * 10, 0)} per detik, atau ${fmt(v6T, 1)} dari nilai tepat ${fmt(bulat(trx3Tepat, 2), 2)}`);
    expect(badan).toContain(`28 orang dalam delapan tim memelihara enam service`);
    expect(`${fmt(bulat(orangTotal / nService, 1), 1)}`).toBe("4,7");
    expect(badan).toContain("Beban PRD v6 adalah 10 kali beban Tahap 5");
    expect(naskah).toContain("PRD v6: 10 juta user, multi-region");
    expect(10_000_000 / asumsi.user).toBe(10);
    expect(badan).toContain("Alasannya user naik dari 1 juta ke 10 juta, dan masukan lain dianggap sama (Asumsi).");
    expect(badan).toContain("Angka-angka di halaman ini dihitung dari sana.");
  });
});

describe("pembacaan ulang pemicu ADR 45: sebelas baris dari naskah, dan lima dari sebelas butir 4.26", () => {
  const naskahBaca = tabelDari(naskah, "| Komponen ADR 45 | Pemicu yang ditulis");
  const halBaca = tabel("| Komponen ADR 45 | Pemicu yang ditulis");
  test("sebelas baris data, kolom pertama dan kedua sama dengan naskah, dan tiap angka di sel halaman ada di baris naskah yang sama", () => {
    expect(naskahBaca).toHaveLength(13);
    expect(halBaca).toHaveLength(13);
    expect(halBaca[0]).toEqual(naskahBaca[0]!.slice(0, 4).concat(["Dilanjutkan"]));
    for (let i = 2; i < 13; i++) {
      const n = naskahBaca[i]!;
      const h = halBaca[i]!;
      expect(h[0], `baris ${i} komponen`).toBe(n[0]);
      expect(h[1], `baris ${i} pemicu`).toBe(n[1]);
      expect(h[2], `baris ${i} tahap 4`).toBe(n[2]);
      const angkaNaskah = angkaDari(n.join(" "));
      for (const a of angkaDari(h[3]!)) expect(angkaNaskah, `baris ${i}: ${a}`).toContain(a);
    }
  });
  test("kolom Dilanjutkan: tiap ADR di naskah menunjuk id registry yang memuat ADR itu, dan 'ADR 60' menjadi 'Tetap di sini'", () => {
    const peta: Record<string, string> = { "50": "t5-service", "53": "t5-mtls", "51": "t5-fanout", "46": "t5-read-replica", "52": "t5-pooler", "54": "t5-batch" };
    const ditunjuk: string[] = [];
    for (let i = 2; i < 13; i++) {
      const adr = cari(/ADR (\d+)/, naskahBaca[i]![4]!, `dilanjutkan baris ${i}`)[1]!;
      const sel = halBaca[i]![4]!;
      if (adr === "60") expect(sel, `baris ${i}`).toBe("Tetap di sini");
      else {
        expect(sel, `baris ${i}`).toBe(`[[${peta[adr]}]]`);
        expect(dari(peta[adr]!).adr, adr).toContain(Number(adr));
        ditunjuk.push(adr);
      }
    }
    expect(ditunjuk.sort()).toEqual(["46", "50", "50", "51", "52", "53", "54"]);
    expect(halBaca.slice(2).filter((r) => r[4] === "Tetap di sini")).toHaveLength(4);
  });
  test("hitungan baris: 4 tetap di sini, 7 dilanjutkan; ADR 45 punya delapan komponen dan butir 2 dan 4 memuat beberapa", () => {
    const adr45 = tabelDari(t4, "| Komponen | Keadaan Tahap 4 |").slice(2).map((r) => r[0]);
    expect(adr45.map((x) => Number(x!.match(/^(\d)\./)![1]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const butirNaskah = new Set(naskahBaca.slice(2).map((r) => r[0]!.match(/^(\d)\./)![1]));
    expect([...butirNaskah].sort()).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(naskahBaca.slice(2).filter((r) => /^2\./.test(r[0]!))).toHaveLength(3);
    expect(naskahBaca.slice(2).filter((r) => /^4\./.test(r[0]!))).toHaveLength(2);
    expect(badan).toContain("[[t4-adr-45]] menunda delapan komponen dengan pemicu tertulis. Butir 2 dan 4 memuat beberapa komponen, jadi tabel memuat sebelas baris.");
    expect(naskah.split("\n").find((b) => b.startsWith("| 2. Event streaming |"))).toContain(`${fmt(notifT, 1)} per detik puncak (75%)`);
    expect(naskah.split("\n").find((b) => b.startsWith("| 2. Event streaming |"))).toContain(`${fmt(gabungT, 1)} per detik selama 30 menit`);
    expect(naskah.split("\n").find((b) => b.startsWith("| 2. Service mesh |"))).toContain("terpenuhi untuk TLS timbal balik, dikerjakan di Go tanpa mesh");
    expect(naskah).toContain('"Terpenuhi" berarti halaman Tahap 5 menulis keadaan yang sama dengan pemicunya, bukan bahwa komponennya terbukti perlu.');
    expect(badan).toContain('"Terpenuhi" berarti keadaan Tahap 5 sama dengan pemicunya. Itu tidak berarti komponennya terbukti perlu.');
  });
  test("lima dari sebelas butir 4.26: sebelas baris di halaman 4.26, lima dibawa (tiga dikerjakan, dua tetap), enam tidak, dihitung dari tabelnya", () => {
    const tim = tabelDari(t4Tim.slice(t4Tim.indexOf("### Sengaja belum dilakukan")), "| Yang ditunda |").slice(2).map((r) => r[0]!);
    expect(tim).toHaveLength(11);
    const kata = (k: string): string | undefined => tim.find((x) => x.toLowerCase().includes(k));
    const lima = [kata("flag kill switch"), kata("rilis kartu bertahap"), kata("pemindai kunci"), kata("provenance slsa"), kata("atestasi app")];
    expect(lima.every(Boolean)).toBe(true);
    expect(tim.filter((x) => !lima.includes(x))).toHaveLength(6);
    const enam = tim.filter((x) => !lima.includes(x)).map((x) => x.toLowerCase());
    for (const k of ["keyless signing", "workflow github actions per modul", "isi response", "jalankan semua", "go ke 1.27.3", "client dart"]) expect(enam.some((x) => x.includes(k)), k).toBe(true);
    const h = tabel("| Butir di 4.26 |").slice(2);
    expect(h.map((r) => r[0])).toEqual(["Tempat flag kill switch kartu di luar proses", "Rilis kartu bertahap 1%, 5%, 25%, 100%", "Pemindai kunci produksi atas seluruh konfigurasi staging dan state IaC", "Provenance SLSA", "Atestasi app"]);
    for (const [i, x] of lima.entries()) expect(x, `butir ${i}`).toBe(h[i]![0]);
    expect(h.map((r) => r[1]!.split(":")[0])).toEqual(["Dikerjakan", "Dikerjakan", "Dikerjakan", "Tetap ditunda", "Tetap ditunda"]);
    expect(h.map((r) => r[2])).toEqual(["ADR 55, [[t5-rollout]]", "ADR 55, [[t5-rollout]]", "ADR 58, [[t5-tim-infra]]", "Butir 10 di atas", "Butir 10 di atas"]);
    expect(dari("t5-rollout").adr).toEqual([55]);
    expect(dari("t5-tim-infra").adr).toEqual([58]);
    // naskah: dua dikerjakan ADR 55, satu ADR 58, dua tetap di ADR 60
    expect(naskah).toContain("Lima dari sebelas butir \"Sengaja belum\" di halaman 4.26 menjadi bahan Tahap 5. Dua dikerjakan di ADR 55: flag kill switch kartu di luar proses dan rilis kartu bertahap (M49). Satu dikerjakan di ADR 58: pemindai kunci produksi atas state IaC");
    expect(naskah).toContain("Dua tetap ditunda di ADR 60: provenance SLSA dan atestasi app.");
    const adr = (n: number): string => naskah.split("\n").find((b) => b.startsWith(`| ${n} |`)) ?? "";
    expect(adr(55)).toContain("satu sakelar `kartu_aktif` di tabel `sakelar`");
    expect(adr(55)).toContain("canary 1%, 5%, 25%, 100%");
    expect(adr(58)).toContain("pemindai kunci berjalan atas repo konfigurasi dan state IaC");
    expect(badan).toContain("[[t4-tim-infra]] mencatat penundaannya sendiri di bagian \"Sengaja belum dilakukan\", sebelas butir. Lima dibawa ke Tahap 5.");
    expect(badan).toContain("Enam butir lain tidak dibawa ke ADR Tahap 5.");
    expect(badan).toContain("Naskah merencanakan lab Tahap 5 memakai Go 1.27.3, dan itu Asumsi sampai lab mengecek ulang.");
    expect(naskah).toContain("Lab Tahap 5 memakai Go 1.27.3 dari RISET (R5-01, Asumsi sampai lab mengecek ulang)");
    // kolom 'Butir 10 di atas' menunjuk butir daftar yang memuat SLSA dan atestasi app
    expect(badan.indexOf("10. **Provenance SLSA, HTTP Message Signatures, dan atestasi app.**")).toBeLessThan(badan.indexOf("| Butir di 4.26 |"));
  });
});

describe("dua belas butir: daftar, tabel Kapan keputusan ini salah, dan hitungan per kata Dibaca", () => {
  const barisAdr60 = naskah.split("\n").find((b) => b.startsWith("| 60 |")) ?? "";
  const kolom60 = pecahBaris(barisAdr60);
  const bagi = (s: string): string[] => {
    const hasil: string[] = [];
    let d = 0, mulai = 0;
    for (let i = 0; i <= s.length; i++) { const c = s[i]; if (c === "(") d++; else if (c === ")") d--; else if ((c === ";" && d === 0) || i === s.length) { hasil.push(s.slice(mulai, i).trim()); mulai = i + 1; } }
    return hasil;
  };
  const butirNaskah = bagi(cari(/^Sengaja belum \(Tahap 5\): (.*?)\. Tiap butir punya pemicu di halamannya$/, kolom60[1]!, "butir ADR 60")[1]!);
  const pemicuNaskah = bagi(kolom60[3]!.replace(/^Per butir: /, ""));
  const kapan = tabel("| Komponen | Salah saat").slice(2);
  const daftar = [...badan.slice(badan.indexOf("### Apa kedua belasnya"), badan.indexOf("Sumber definisi, dibuka")).matchAll(/^(\d+)\. \*\*(.+?)\.\*\*/gm)].map((m) => [Number(m[1]), m[2]!] as const);
  test("naskah punya dua belas butir; daftar halaman dan tabel punya dua belas baris dengan urutan dan nama yang sama", () => {
    expect(butirNaskah).toHaveLength(12);
    expect(daftar.map((d) => d[0])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(kapan).toHaveLength(12);
    const kunciNaskah = ["service mesh", "multi-region", "database terpisah per service", "sharding", "bff", "login sosial", "grpc", "cdc", "tigerbeetle", "provenance", "event sourcing", "openfeature"];
    butirNaskah.forEach((b, i) => {
      expect(b.toLowerCase(), `naskah ${i}`).toContain(kunciNaskah[i]);
      expect(daftar[i]![1]!.toLowerCase(), `daftar ${i}`).toContain(kunciNaskah[i]);
      expect(kapan[i]![0]!.toLowerCase(), `tabel ${i}`).toContain(kunciNaskah[i]);
      expect(kapan[i]![0], `nomor ${i}`).toMatch(new RegExp(`^${i + 1}\\. `));
    });
    expect(butirNaskah.join("; ")).toBe("service mesh penuh; multi-region; database terpisah per service; sharding; BFF terpisah; login sosial; gRPC; CDC dengan Debezium; TigerBeetle dan Temporal; provenance SLSA, HTTP Message Signatures, dan atestasi app; event sourcing penuh; OpenFeature dan flagd");
    expect(badan).toContain("### Apa kedua belasnya");
  });
  test("pemicu tiap butir diturunkan dari naskah: sebelas pemicu naskah ada di sel Salah saat, dan event sourcing tidak punya pemicu di naskah", () => {
    expect(pemicuNaskah).toHaveLength(11);
    const pemicuTanpaEs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11];
    const kata: [string, RegExp][] = [["service mesh", /^service mesh bila (.*)$/], ["multi-region", /^multi-region bila (.*)$/], ["database per service", /^database per service bila (.*)$/], ["sharding", /^sharding bila (.*)$/], ["BFF", /^BFF bila (.*)$/], ["login sosial", /^login sosial bila (.*)$/], ["gRPC", /^gRPC bila (.*)$/], ["CDC", /^CDC bila (.*)$/], ["TigerBeetle dan Temporal", /^TigerBeetle dan Temporal bila (.*)$/], ["SLSA", /^SLSA, HTTP Message Signatures, dan atestasi app bila (.*)$/], ["OpenFeature", /^OpenFeature bila (.*)$/]];
    kata.forEach(([nama, re], i) => {
      const m = pemicuNaskah[i]!.match(re);
      expect(m, `naskah ${nama}`).not.toBeNull();
      const pemicu = m![1]!;
      const sel = kapan[pemicuTanpaEs[i]!]![1]!;
      const angkaP = angkaDari(pemicu);
      expect(norm(sel).includes(norm(pemicu)) || (angkaP.length > 0 && angkaP.every((a) => angkaDari(sel).includes(a))), `${nama}: "${pemicu}" lawan "${sel}"`).toBe(true);
    });
    expect(pemicuNaskah.join(" ")).not.toMatch(/event sourcing/i);
    expect(badan).toContain("Butir event sourcing tidak punya pemicu di naskah, jadi pemicunya ditulis halaman ini.");
    expect(kapan[10]![3]).toBe("PRD v5 tidak memuatnya");
  });
  test("kolom Dibaca memakai empat kata: 0 terpenuhi, 6 belum terukur, 2 belum terpenuhi, 3 tidak diminta, 1 menunggu PRD v6, dan jumlahnya 12", () => {
    const dibaca = kapan.map((r) => r[4]!);
    const hitung: Record<string, number> = {};
    for (const d of dibaca) hitung[d] = (hitung[d] ?? 0) + 1;
    expect(hitung).toEqual({ "Belum terpenuhi": 2, "Belum terukur": 6, "Tidak diminta": 3, "Menunggu PRD v6": 1 });
    expect(Object.values(hitung).reduce((a, b) => a + b, 0)).toBe(12);
    expect(dibaca).toEqual(["Belum terpenuhi", "Menunggu PRD v6", "Belum terukur", "Belum terukur", "Belum terukur", "Tidak diminta", "Belum terukur", "Belum terukur", "Belum terukur", "Tidak diminta", "Tidak diminta", "Belum terpenuhi"]);
    expect(badan).toContain("Dua belas butir ditunda: tak satu pun pemicunya terpenuhi, enam belum terukur, dan satu menunggu PRD v6.");
    expect(badan).toContain("Dari dua belas butir, nol pemicu terpenuhi, dan enam bahkan belum punya angka.");
    expect(badan).toContain("Menjawab pemicu yang belum terpenuhi: nol dari dua belas.");
    expect(badan).toContain("- \"Belum terpenuhi\": angkanya ada dan di bawah pemicu.");
    expect(badan).toContain("- \"Belum terukur\": alat ukurnya belum menghasilkan angka.");
    expect(badan).toContain("- \"Tidak diminta\": PRD v5 atau pihak luar belum memintanya.");
    expect(badan).toContain("- \"Menunggu PRD v6\": pemicunya bergantung pada PRD yang belum disetujui.");
  });
  test("lima pengukuran di belakang enam butir 'Belum terukur' (butir 3, 4, 5, 7, 8, 9), dan pemicu sharding memakai 69,4 dan 46,3", () => {
    const belum = kapan.map((r, i) => (r[4] === "Belum terukur" ? i + 1 : 0)).filter(Boolean);
    expect(belum).toEqual([3, 4, 5, 7, 8, 9]);
    expect(kapan[3]![1]).toBe(`Satu primary tidak menampung tulis ${fmt(trx3T, 1)} transaksi uang per detik (dua transaksi: ${fmt(trx2T, 1)})`);
    expect(kapan[8]![2]).toBe("Load test baris 4, dan daftar jenis alur panjang");
    expect(badan).toContain("Enam butir belum terukur, dan di belakangnya ada lima pengukuran yang belum ada.");
    expect(badan).toContain("Kapasitas tulis satu primary di server sungguhan dipakai butir 4 dan 9.");
    expect(badan).toContain("Jaringan antar host dipakai butir 7 dan L per schema butir 3. Request berurutan per layar app dipakai butir 5, dan umur event tertua di relay butir 8.");
    expect(badan).toContain("Selama kelima angka itu kosong, pemicu keenam butir hanya bisa dinyalakan oleh kejadian, bukan oleh angka.");
  });
  test("multi-region: kalimat pemicu terkunci untuk halaman 5.32, M42 satu mesin 23 menit, dan naskah tak memuat kejadian region mati", () => {
    expect(kapan[1]![1]).toBe("Satu region mati lebih lama dari RTO 15 menit, atau PRD v6 memintanya");
    expect(naskah).toContain('ADR 60 menulis multi-region sebagai sengaja belum dengan pemicu "PRD v6 memintanya".');
    expect(pemicuNaskah[1]).toBe("multi-region bila satu region mati lebih lama dari RTO 15 menit atau PRD v6 memintanya");
    expect(naskah.split("\n").filter((b) => /region mati/i.test(b))).toHaveLength(1);
    expect(naskah).toContain("Pembayaran gagal 23 menit sampai Dewi mempromosikan replica");
    expect(naskah).toContain("Sabtu 02.10 mesin database utama restart");
    expect(naskah).toContain("Sinta datang dengan PRD v6: 10 juta user, multi-region, skor risiko real-time, platform untuk lebih dari 50 developer (Ilustrasi)");
    expect(kapan[1]![3]).toBe("Naskah Tahap 5 tidak memuat kejadian region mati. M42 adalah satu mesin yang mati 23 menit (Ilustrasi). Pratinjau PRD v6 memintanya (Ilustrasi) dan belum menjadi PRD yang dikerjakan");
    expect(dari("t5-jembatan").nomor).toBe("5.32");
    expect(dari("t5-m51").nomor).toBe("5.29");
    expect(badan).toContain("[[t5-jembatan]] menampilkan pratinjau PRD v6 dan meminta kamu menebak ADR Tahap 5 mana yang pecah lebih dulu.");
    expect(naskah).toContain("Pembaca diminta menebak: dari ADR Tahap 5, mana yang pecah lebih dulu?");
    // halaman ini tidak membuka jawaban tebakan 5.32
    expect(badan).not.toMatch(/pecah lebih dulu(?!\.)/);
  });
  test("tiga butir yang dibaca dari angka naskah: service mesh satu tujuan, OpenFeature satu flag, TigerBeetle dan Temporal satu jenis alur", () => {
    expect(naskah.split("\n").find((b) => b.startsWith("| 2. Service mesh |"))).toContain("Ledger dipanggil dari tiga service (pembayaran, cicilan, merchant)");
    expect(naskah).toContain("service mesh bila lebih dari satu tujuan kritis butuh identitas yang sama (sekarang satu: ledger)");
    expect(naskah).toContain("OpenFeature dan flagd tidak dipasang (spesifikasi belum 1.0; ADR 60)");
    expect(naskah).toContain("satu sakelar `kartu_aktif` di tabel `sakelar`");
    expect(naskah).toContain("Jenis alur panjang bertambah dari satu (cicilan dan tabungan memakai satu mesin status) menjadi tiga atau lebih");
    expect(naskah).toContain("TigerBeetle dan Temporal bila ledger di PostgreSQL tidak menampung tulis atau jenis alur panjang lebih dari tiga");
    expect(kapan[0]![3]).toBe("Satu tujuan kritis, yaitu ledger, dipanggil tiga service ([[t5-mtls]])");
    expect(kapan[8]![3]).toBe("Tulis belum terukur. Jenis alur panjang ada satu: cicilan dan tabungan memakai satu mesin status ([[t5-batch]])");
    expect(kapan[11]![3]).toBe("Spesifikasi v0.9.0, belum 1.0. Flag aktif ada satu: sakelar `kartu_aktif` ([[t5-rollout]])");
    expect(badan).toContain("ADR 45 menghitung jalur, yaitu satu pemanggil ke satu tujuan. ADR ini menghitung tujuan kritis.");
    expect(badan).toContain("Pemicu ADR ini menghitung tujuan kritis, bukan jalur. Tiga jalur menuju satu tujuan, yaitu ledger, jadi tujuan kritisnya satu.");
  });
});

describe("rekaman, kode lab, dan klaim tidak ada: folder lab Tahap 4 dipindai, bukan ditulis ulang", () => {
  const TUNDA = /istio|linkerd|grpc|protobuf|debezium|tigerbeetle|temporal|openfeature|flagd|shard|event.?sourc/i;
  const nama = TUNDA.source.split("|").map((x) => x.replace(/\\/g, "").replace(".?", " ").replace("event sourc", "event sourcing"));
  const folder = ["api-t4", "t4-audit", "t4-infra", "t4-integrasi", "t4-kartu", "t4-modul", "t4-pipeline", "t4-qr", "t4-ssrf", "t4-storage", "t4-webhook"];
  const jalan = (dir: string, keluar: string[] = []): string[] => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "output" || e.name === "node_modules" || e.name === ".git") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) jalan(p, keluar);
      else if (/(^|\/)(go\.mod|go\.sum|Makefile|docker-compose.*\.ya?ml|compose.*\.ya?ml)$/.test(p) || /\.(go|sql|ya?ml)$/.test(p)) keluar.push(p);
    }
    return keluar;
  };
  test("sebelas folder lab Tahap 4: semua ada, berkas dipindai tidak kosong, dan nol kecocokan untuk nama yang ditunda", () => {
    const berkas = folder.flatMap((f) => { expect(fs.existsSync(path.join(akar, "labs", f)), f).toBe(true); return jalan(path.join(akar, "labs", f)); });
    expect(berkas.length).toBeGreaterThan(40);
    expect(berkas.some((b) => b.endsWith("go.mod"))).toBe(true);
    expect(berkas.some((b) => b.endsWith(".sql"))).toBe(true);
    expect(berkas.some((b) => /compose/.test(b))).toBe(true);
    const kena = berkas.filter((b) => TUNDA.test(fs.readFileSync(b, "utf8")));
    expect(kena.map((b) => path.relative(akar, b))).toEqual([]);
    expect(fs.readdirSync(path.join(akar, "labs")).filter((f) => f.startsWith("t4-") || f === "api-t4")).toHaveLength(11);
  });
  test("nama di kalimat halaman sama dengan nama yang dipindai, dan klaim berlingkup folder dan jenis berkas", () => {
    expect(nama).toEqual(["istio", "linkerd", "grpc", "protobuf", "debezium", "tigerbeetle", "temporal", "openfeature", "flagd", "shard", "event sourcing"]);
    expect(badan).toContain(`Tes itu tidak menemukan nama ${nama.slice(0, -1).join(", ")}, atau ${nama[nama.length - 1]}. Klaim ini hanya untuk folder dan jenis file itu.`);
    expect(badan).toContain("Tes halaman ini memindai `go.mod`, `go.sum`, compose, Makefile, kode Go, SQL, dan YAML di sebelas folder lab Tahap 4, di luar `output/`.");
    expect(badan).toContain("Sebelas folder itu adalah `api-t4` dan sepuluh `t4-*`.");
  });
  test("alat ukur gRPC: anggaran 50 ms, rentang Snippet tepat, dan jaringan antar host tidak diukur (latensi.txt)", () => {
    const kode = baca("labs/api-t4/internal/handler/latensi_ledger_test.go").split("\n");
    const anggaran = Number(cari(/anggaranTambahanHTTP = (\d+) \* time\.Millisecond/, kode.join("\n"), "anggaran")[1]);
    expect(anggaran).toBe(50);
    expect(kode.slice(22, 25).join("\n")).toContain("const anggaranTambahanHTTP = 50 * time.Millisecond");
    expect(kode.slice(65, 68).join("\n")).toContain("t.Fatalf(\"tambahan p95 %v melewati anggaran %v\"");
    expect(halaman).toContain('<Snippet files={["labs/api-t4/internal/handler/latensi_ledger_test.go:23:25", "labs/api-t4/internal/handler/latensi_ledger_test.go:66:68"]} lang="go"');
    const latensi = baca("labs/t4-modul/output/latensi.txt");
    expect(latensi).toContain("jaringan antar host tidak diukur");
    expect(badan).toContain("Satu tes memanggil fungsi ledger yang sama langsung dan lewat HTTP, lalu gagal bila tambahan p95 melewati 50 ms.");
    expect(badan).toContain("Tes itu berjalan di localhost satu mesin.");
    expect(kode.join("\n")).not.toMatch(/komentar lab|R4-\d+|keputusan \d+/);
  });
});

describe("ID registry, nomor ADR, tautan, template blok, riset, dan kartu", () => {
  test("registry: halaman 5.30 jenis adr, ADR 60, prasyarat 5.29, menit sama dengan baris meta, judul dan peta naskah sama", () => {
    const h = dari("t5-adr-60");
    expect(h).toMatchObject({ nomor: "5.30", ada: true, jenis: "adr", inti: true, adr: [60], tahap: 5, prasyarat: ["t5-m51"], path: "tahap-5/sengaja-belum.md", peran: ["backend"] });
    expect(dari("t5-rekap").prasyarat).toEqual(["t5-adr-60"]);
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t5-m51\]\] · Jalur inti<\/p>/, halaman, "baris meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(halaman.startsWith(`---\ntitle: "5.30 ${h.judul}"\n`)).toBe(true);
    expect(naskah).toContain("| 5.30 | 4 | ADR 60: Sengaja belum dilakukan | ADR | ★ | – | – |");
    expect(h.menit).toBeGreaterThanOrEqual(20);
    expect(h.menit).toBeLessThanOrEqual(28);
  });
  test("nomor ADR di halaman cocok dengan registry: himpunan terkunci dan tiap ADR dikenal", () => {
    const dipakai = [...new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
    const dikenal = new Set(hal.flatMap((h) => h.adr ?? []));
    expect(dipakai).toEqual([34, 45, 46, 49, 50, 51, 53, 54, 55, 58]);
    for (const n of dipakai) expect(dikenal.has(n), `ADR ${n}`).toBe(true);
    expect(dari("t4-adr-45").adr).toEqual([45]);
    expect(dari("t3-adr-33").adr).toEqual([33]);
    expect(dari("t2-adr-21").adr).toEqual([21]);
    expect(dari("t4-webhook").adr).toEqual([34]);
    expect(dari("t2-adr-ledger").adr).toEqual([6]);
    expect(badan).toContain("(ADR 46 sampai 59)");
    expect(badan).toContain("Rekeningo memakai mTLS di kode Go, tanpa mesh (ADR 53).");
    expect(badan).toContain("Rekeningo memakai satu cluster dengan schema dan role per service (ADR 50).");
    expect(badan).toContain("Partisi `posting` per bulan (ADR 49) bukan sharding");
    expect(badan).toContain("Rekeningo memakai relay dari outbox (ADR 51).");
    expect(badan).toContain("alur panjang memakai tabel langkah (ADR 54).");
    expect(naskah.split("\n").find((b) => b.startsWith("| 53 |"))).toContain("mTLS di Go");
    expect(naskah.split("\n").find((b) => b.startsWith("| 49 |"))).toContain("dipartisi per bulan");
    expect(naskah.split("\n").find((b) => b.startsWith("| 54 |"))).toContain("statusnya berjalan per langkah");
  });
  test("tautan [[id]]: semua id ada di registry, himpunan dan jumlah per tujuan terkunci", () => {
    const tautan = [...halaman.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!);
    for (const id of new Set(tautan)) if (id !== "berikutnya") expect(hal.some((x) => x.id === id), id).toBe(true);
    const hitung: Record<string, number> = {};
    for (const t of tautan) hitung[t] = (hitung[t] ?? 0) + 1;
    expect(Object.keys(hitung).sort()).toEqual(["A0", "berikutnya", "t2-adr-21", "t2-adr-ledger", "t3-adr-33", "t4-adr-45", "t4-modul", "t4-tim-infra", "t4-webhook", "t5-batch", "t5-fanout", "t5-jembatan", "t5-m51", "t5-mtls", "t5-partisi", "t5-pooler", "t5-prd", "t5-read-replica", "t5-rollout", "t5-service", "t5-tim-infra"]);
    expect(hitung).toEqual({ "A0": 1, "berikutnya": 1, "t2-adr-21": 3, "t2-adr-ledger": 2, "t3-adr-33": 2, "t4-adr-45": 4, "t4-modul": 1, "t4-tim-infra": 2, "t4-webhook": 1, "t5-batch": 2, "t5-fanout": 2, "t5-jembatan": 1, "t5-m51": 3, "t5-mtls": 3, "t5-partisi": 2, "t5-pooler": 1, "t5-prd": 1, "t5-read-replica": 1, "t5-rollout": 3, "t5-service": 2, "t5-tim-infra": 1 });
    expect(dari("t5-m51").prasyarat).toEqual(["t5-onprem", "t4-estimasi"]);
    expect(dari("t5-prd").nomor).toBe("5.1");
    expect([dari("t5-read-replica").nomor, dari("t5-partisi").nomor, dari("t5-service").nomor, dari("t5-fanout").nomor, dari("t5-pooler").nomor, dari("t5-mtls").nomor, dari("t5-batch").nomor, dari("t5-rollout").nomor, dari("t5-tim-infra").nomor]).toEqual(["5.5", "5.11", "5.13", "5.15", "5.17", "5.19", "5.21", "5.23", "5.27"]);
    expect([dari("t5-service").adr, dari("t5-mtls").adr, dari("t5-fanout").adr, dari("t5-read-replica").adr, dari("t5-pooler").adr, dari("t5-batch").adr, dari("t5-partisi").adr]).toEqual([[50], [53], [51], [46], [52], [54], [49]]);
    expect(dari("t4-tim-infra")).toMatchObject({ nomor: "4.26", ada: true, adr: [44] });
    expect(dari("t4-adr-45")).toMatchObject({ nomor: "4.29", ada: true, adr: [45] });
    expect(dari("t5-jembatan").prasyarat).toEqual(["t5-rekap"]);
  });
  test("semua tabel: jumlah kolom header, pemisah, dan tiap baris sama (tabel GFM yang tidak seimbang dirender sebagai teks)", () => {
    const tabelTabel: string[][] = [];
    let cur: string[] = [];
    for (const l of badan.split("\n")) { if (l.startsWith("|")) cur.push(l); else if (cur.length) { tabelTabel.push(cur); cur = []; } }
    expect(tabelTabel.map((t) => [t.length, new Set(t.map((l) => l.split("|").length - 2)).size, t[0]!.split("|").length - 2])).toEqual([[7, 1, 4], [13, 1, 5], [7, 1, 3], [7, 1, 4], [14, 1, 5]]);
    for (const t of tabelTabel) expect(t[1]!.split("|").slice(1, -1).every((c) => /^-+$/.test(c.trim()))).toBe(true);
  });
  test("template adr: enam blok dalam urutan, dua pertama terbuka, dan tiap blok ditutup", () => {
    const b = daftarBlok(halaman);
    expect(b.map((x) => x.nama)).toEqual(["Kebutuhan", "Opsi", "Yang dipilih dan kenapa", "Wujud di kode", "Coba keduanya", "Kapan keputusan ini salah"]);
    expect(cekTemplat("adr", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Kebutuhan", "Opsi"]);
    expect([...halaman.matchAll(/<Blok ([^>]*)>/g)].map((m) => m[1])).toEqual(['nama="Kebutuhan" buka', 'nama="Opsi" buka', 'nama="Yang dipilih dan kenapa"', 'nama="Wujud di kode"', 'nama="Coba keduanya"', 'nama="Kapan keputusan ini salah"']);
    expect((halaman.match(/<\/Blok>/g) ?? []).length).toBe(6);
    expect(halaman).toContain('import Tebak from "../../../widgets/tebak/Tebak.tsx";');
    expect(halaman).toContain('import intiDiagram from "../../../../data/diagram/t5-adr60-inti.json";');
    expect(halaman).toContain('import dataTebak from "../../../../data/widget/t5-adr60-tebak.json";');
    expect((halaman.match(/<Rantai /g) ?? []).length).toBe(1);
    expect((halaman.match(/<Tebak /g) ?? []).length).toBe(1);
    expect((halaman.match(/<Snippet /g) ?? []).length).toBe(1);
    expect(halaman).toContain("<Rantai data={intiDiagram} ringkas />");
    expect(halaman).toContain("<Tebak client:visible data={dataTebak} />");
    expect(halaman).toContain("<noscript>");
    expect((halaman.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((halaman.match(/<details class="success">/g) ?? []).length).toBe(3);
    expect((halaman.match(/<summary>Jawaban<\/summary>/g) ?? []).length).toBe(3);
    expect(halaman).toContain("<summary>Sudah tahu? Cek 3 pertanyaan</summary>");
    expect(halaman.split("\n").filter((l) => l.startsWith("### ")).map((l) => l.slice(4))).toEqual(["Apa kedua belasnya", "Kenapa ADR ini ada", "Masukan hitungan", "Pembacaan ulang pemicu ADR 45", "Lima dari sebelas butir di tabel 4.26", "Cek diri", "Saat me-review kode AI, cek ini", "Bacaan lanjut"]);
  });
  test("tautan luar: tiap alamat ada di baris riset R5-255 sampai R5-259 atau R4-250 sampai R4-254, dengan tanggal buka 2026-10-31", () => {
    const tautan = [...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!.replace(/^https:\/\//, "").replace(/#.*$/, "").replace(/\/$/, "").replace(/^www\./, ""));
    const ids5 = ["R5-255", "R5-256", "R5-257", "R5-258", "R5-259"];
    const ids4 = ["R4-250", "R4-251", "R4-252", "R4-253", "R4-254"];
    const sumber = [...ids5.map(barisRiset), ...ids4.map(barisRiset4)].join("\n");
    const esc = (x: string): string => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expect([...new Set(tautan)].filter((u) => !new RegExp(`${esc(u)}/?(?![\\w./#-])`).test(sumber)).sort()).toEqual([]);
    expect(new Set(tautan).size).toBe(15);
    expect(tautan.length).toBe(21);
    expect(badan.match(/dibuka 2026-10-31/g) ?? []).toHaveLength(1);
    for (const id of ids5) expect(barisRiset(id), id).toContain("2026-10-31");
    for (const id of ids4) expect(barisRiset4(id), id).toContain("2026-10-31");
    expect(badan).not.toMatch(/dibuka 2026-10-(?!31)/);
  });
  test("baris riset: lima baris berurutan R5-255 sampai R5-259, lima kolom, tanpa ID ganda, dan kutipan Inggris dipakai kalimat halaman", () => {
    const ids = ["R5-255", "R5-256", "R5-257", "R5-258", "R5-259"];
    const semua = [...riset5.matchAll(/^\| (R5-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(semua).size).toBe(semua.length);
    const i = semua.indexOf("R5-255");
    expect(i).toBeGreaterThan(0);
    expect(Number(semua[i - 1]!.slice(3))).toBeLessThan(255);
    expect(semua.slice(i, i + 5)).toEqual(ids);
    if (semua[i + 5]) expect(Number(semua[i + 5].slice(3))).toBeGreaterThan(259);
    for (const id of ids) { const b = barisRiset(id); expect(b.split(" | ").length, id).toBe(5); expect(b.split("\n")).toHaveLength(1); }
    expect(barisRiset("R5-255")).toContain("ms.date 2026-03-27");
    expect(barisRiset("R5-256")).toContain("ms.date 2026-04-02");
    expect(barisRiset("R5-255")).toContain("It's costly to migrate to or from an event sourcing solution");
    expect(barisRiset("R5-256")).toContain("Sharding introduces substantial and permanent complexity");
    expect(barisRiset("R5-258")).toContain("the most complex and costly approach to disaster recovery");
    expect(barisRiset("R5-258")).toContain("does not actively serve traffic until a failover event is triggered");
    expect(barisRiset("R5-256")).toContain("Your database engine supports table-level partitioning that meets your performance needs");
    expect(barisRiset("R5-255")).toContain("Systems require consistency and real-time updates to the views of the data");
    expect(barisRiset("R5-255")).toContain("such as a payment ledger");
    expect(barisRiset("R5-257")).toContain("Keep each microservice's persistent data private to that service and accessible only via its API");
    expect(barisRiset("R5-259")).toContain("tak ada tag v1.0.0 atau lebih");
    expect(barisRiset("R5-259")).toContain("tag spesifikasi tertinggi v0.9.0");
    expect(barisRiset("R5-259")).toContain("flagd is a feature flag evaluation engine");
    expect(barisRiset("R5-259")).toContain("captures row-level changes in the schemas of a PostgreSQL database");
    expect(barisRiset("R5-259")).toContain("the financial transactions database designed for mission critical safety and performance");
    expect(barisRiset4("R4-343")).toContain("v0.9.0");
    expect(barisRiset4("R4-343")).toContain("belum 1.0");
    // kalimat halaman yang memakai kutipan itu
    expect(badan).toContain("Azure menulis kompleksitas sharding sebagai permanen dan event sourcing sebagai berbiaya besar untuk dimasuki dan ditinggalkan");
    expect(badan).toContain("Azure menulis pola ini cocok bila throughput melebihi satu instance dan read replica saja tidak menyelesaikannya karena tulis juga tinggi.");
    expect(badan).toContain("Azure juga menulis pola ini mungkin tidak cocok bila partisi tabel di database sudah memenuhi kebutuhan.");
    expect(badan).toContain("Azure menulis pola ini mungkin tidak cocok bila sistem butuh konsistensi dan pembaruan real-time pada tampilan data.");
    // pelunak sumber ikut ke kalimat halaman: Azure menulis "might not be suitable when" untuk kedua daftar (keputusan 1619)
    expect(barisRiset("R5-255")).toContain("This pattern might not be suitable when");
    expect(barisRiset("R5-256")).toContain("This pattern might not be suitable when");
    expect(badan).toContain("Azure menyarankan memakainya selektif, misalnya di payment ledger.");
    expect(badan).toContain("AWS menulis multi-site active/active sebagai pendekatan pemulihan bencana yang paling kompleks dan berbiaya besar.");
    expect(badan).toContain("Strategi lintas region dipertimbangkan bila bencana didefinisikan sebagai hilangnya satu region atau ada kewajiban regulasi.");
    expect(badan).toContain("Pada bentuk aktif-pasif, satu region melayani traffic dan region lain menunggu sampai failover. Pada bentuk active/active, semua region melayani.");
    expect(badan).toContain("Spesifikasi v0.9.0, belum 1.0.");
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, diagram, dan tebak", () => {
    for (const [nama, t] of [["halaman", halaman], ["rantai", JSON.stringify(rantaiMentah)], ["tebak", JSON.stringify(tebakMentah)]] as const) {
      expect(t, nama).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}|\bPR #?\d{2,3}\b|#\d{3}/);
    }
  });
  test("kartu ulang: tiga kartu t5-adr-60 dari bagian Cek diri, labelnya sama dengan pertanyaan di halaman, dan jawaban halaman termuat di kartu", () => {
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[]).filter((k) => k.halaman === "t5-adr-60");
    expect(kartu.map((k) => k.id)).toEqual(["t5-adr-60-1", "t5-adr-60-2", "t5-adr-60-3"]);
    for (const k of kartu) { expect(k.url).toBe("tahap-5/sengaja-belum/"); expect(k.judul).toBe("5.30 ADR 60: Sengaja belum dilakukan"); }
    const tanya = [...halaman.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(tanya).toHaveLength(3);
    tanya.forEach((t, i) => expect(kartu[i]!.tanya).toBe(t));
    const dalam = [...halaman.matchAll(/^\d\. (Load test|Tiga service|Pratinjau PRD v6)(.+)$/gm)].map((m) => m[1]! + m[2]!);
    expect(dalam).toEqual(tanya);
    const jawaban = [...badan.matchAll(/<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban).toHaveLength(3);
    jawaban.forEach((j, i) => {
      let dariPos = 0;
      for (const bagian of j.split(/\[\[[^\]]+\]\]/).map((x) => x.trim()).filter(Boolean)) {
        const pos = kartu[i]!.jawab.indexOf(bagian, dariPos);
        expect(pos, `kartu ${i + 1}: "${bagian.slice(0, 50)}"`).toBeGreaterThanOrEqual(0);
        dariPos = pos + bagian.length;
      }
    });
  });
  test("klaim tentang halaman lain: 4.26, 4.29, 2.8, dan 2.31 memuat kalimat yang dirujuk", () => {
    expect(t4).toContain("Ia perlu tahu bahwa itu keputusan, bukan kelupaan.");
    expect(badan).toContain("ADR 45 menulis bahwa penundaan harus terbaca sebagai keputusan, bukan kelupaan");
    expect(t4).toContain("lima syarat berlaku sejak awal");
    expect(badan).toContain("Lima syaratnya sudah ditulis di [[t4-adr-45]] dan tidak berubah.");
    expect(t4).toContain("atestasi app (sinyal dari platform bahwa panggilan datang dari app asli)");
    expect(badan).toContain("Atestasi app adalah sinyal dari platform bahwa panggilan datang dari app asli ([[t4-tim-infra]]).");
    expect(t2Ledger).toContain("| | A. Kolom saldo + tabel koreksi | B. Kolom saldo + tabel audit dari trigger | C. Ledger double-entry | D. Event sourcing penuh |");
    expect(t2Ledger).toContain("**D ditolak** karena saldo harus terbaru saat Budi menekan Bayar");
    expect(t2Ledger).toContain("Microsoft menyarankan event sourcing dipakai hanya di bagian yang membutuhkannya, misalnya ledger pembayaran.");
    expect(badan).toContain("Tahap 2 menolak bentuk ini untuk ledger ([[t2-adr-ledger]]).");
    expect(badan).toContain("Tahap 2 menolak bentuk penuhnya karena saldo harus terbaru saat Bayar ditekan ([[t2-adr-ledger]]).");
    expect(t2Adr21).toContain("4. Satu komponen per masalah, mengikuti urutan PROPOSAL: perbaiki query dan index (selesai di [[t2-index]]), keluarkan kerja lambat, cache baca, lalu tambah instance.");
    expect(badan).toContain("Satu komponen per masalah, dengan urutan [[t2-adr-21]]: perbaiki query dan index, keluarkan kerja lambat, cache baca, lalu tambah instance.");
    expect(t2Adr21).not.toMatch(/sharding|multi-region/i);
    expect(badan).toContain("Sharding dan multi-region tidak ada di urutan itu, jadi keduanya butuh ADR baru dengan angka.");
    const modul = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
    expect(modul).toContain("Pencarian 2026-10-29 tidak menemukan sumber primer untuk angka itu");
    expect(badan).toContain("tidak punya sumber primer [perlu verifikasi] ([[t4-modul]])");
  });
});

describe("diagram Inti dan Tebak: nilai diturunkan dari tabel dan hitungan, bukan ditulis ulang", () => {
  const rantai = DataRantai.parse(rantaiMentah);
  const tebak = DataTebak.parse(tebakMentah);
  const kapan = tabel("| Komponen | Salah saat").slice(2);
  const jumlah = (kata: string): number => kapan.filter((r) => r[4] === kata).length;
  test("diagram: dua baris, enam simpul, angka diturunkan dari kolom Dibaca; sumber Asumsi", () => {
    expect(rantai.sumber.jenis).toBe("asumsi");
    expect(rantai.sumber.teks).toBe("Hitungan atas Asumsi naskah Tahap 5; tabel Kapan keputusan ini salah di halaman ini");
    expect(rantai.baris.map((b) => b.label)).toEqual(["Pemicu", "Sisanya"]);
    const [a, b] = rantai.baris as [typeof rantai.baris[0], typeof rantai.baris[0]];
    expect(a.simpul.map((s) => s.teks)).toEqual([`${kapan.length} butir`, `0 terpenuhi`, `${jumlah("Belum terukur")} belum terukur`]);
    expect(b.simpul.map((s) => s.teks)).toEqual([`${jumlah("Belum terpenuhi")} belum terpenuhi`, `${jumlah("Tidak diminta")} tidak diminta`, `${jumlah("Menunggu PRD v6")} menunggu PRD v6`]);
    expect(a.simpul.map((s) => s.nada)).toEqual(["biasa", "warn", "good"]);
    expect(b.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "warn"]);
    expect(a.sub).toBe("dibaca ulang terhadap PRD v5");
    expect(b.sub).toBe("enam butir lain");
    expect(a.simpul[0]!.sub).toBe("service mesh sampai OpenFeature");
    expect(b.simpul[2]!.sub).toBe("multi-region");
    expect(kapan[0]![0]).toContain("Service mesh");
    expect(kapan[11]![0]).toContain("OpenFeature");
    expect(kapan[1]![4]).toBe("Menunggu PRD v6");
    expect(rantai.catatan).toBe(`Enam belum terukur, dua belum terpenuhi, tiga tidak diminta, dan satu menunggu PRD v6: ${jumlah("Belum terukur")} + ${jumlah("Belum terpenuhi")} + ${jumlah("Tidak diminta")} + ${jumlah("Menunggu PRD v6")} = ${kapan.length}. Kapasitas tulis satu primary belum diukur, dan pemicu sharding serta TigerBeetle menunggunya.`);
    expect(badan).toContain("Dua belas butir ditunda: tak satu pun pemicunya terpenuhi, enam belum terukur, dan satu menunggu PRD v6.");
  });
  test("tebak: empat pilihan, tepat satu benar di posisi ketiga dan bukan yang terpanjang; alasan memuat hitungan dengan persen setengah ke atas", () => {
    expect(tebak.pilihan).toHaveLength(4);
    const benar = tebak.pilihan.map((p, i) => (p.benar ? i : -1)).filter((i) => i >= 0);
    expect(benar).toEqual([2]);
    const panjang = tebak.pilihan.map((p) => p.teks.length);
    expect(panjang[2]).toBeLessThan(Math.max(...panjang));
    expect(tebak.pilihan.map((p) => p.teks)).toEqual(["Sekarang, di Tahap 5", "Tidak pernah, karena ada read replica", "Di PRD v6, bukan di Tahap 5", "Di PRD v6, tetapi hanya bila tiap user masih 3 transaksi"]);
    const K = 300;
    const per = tebak.pilihan.map((p) => p.alasan);
    expect(per[0]).toBe(`Beban Tahap 5 ${fmt(trx3T, 1)} ÷ ${K} = ${persen(trx3T, K)} dari kapasitas. Itu masih di bawah 100%.`);
    expect(per[2]).toBe(`Beban PRD v6 ${fmt(v6T, 1)} ÷ ${K} = ${persen(v6T, K)} dari kapasitas, sedangkan Tahap 5 hanya ${persen(trx3T, K)}. Terlewati di PRD v6.`);
    expect(per[3]).toBe(`Dengan ${trx2} transaksi per user (registry) bebannya ${fmt(trx2T, 1)} dan ${fmt(trx2T * 10, 0)} per detik: ${fmt(trx2T, 1)} ÷ ${K} = ${persen(trx2T, K)} dan ${fmt(trx2T * 10, 0)} ÷ ${K} = ${persen(trx2T * 10, K)}. Kesimpulannya sama.`);
    expect(per[1]).toBe("Read replica menolak DML dan DDL, jadi tulis tetap lewat satu primary. Replica menambah kapasitas baca, bukan kapasitas tulis.");
    expect(persen(trx3T, K)).toBe("23%");
    expect(persen(v6T, K)).toBe("231%");
    expect([persen(trx2T, K), persen(trx2T * 10, K)]).toEqual(["15%", "154%"]);
    expect(tebak.adegan[0]).toBe(`Pemicu sharding tertulis: satu primary tidak menampung tulis ${fmt(trx3T, 1)} transaksi uang per detik. Kapasitas tulis satu primary belum pernah diukur.`);
    expect(tebak.adegan[1]).toBe(`Misalkan load test di server sungguhan nanti mengukur ${K} transaksi uang per detik yang masih lolos target. PRD v6 menaikkan beban 10 kali, jadi ${fmt(v6T, 1)} per detik.`);
    expect(tebak.pertanyaan).toBe(`Dengan kapasitas ${K} per detik, kapan pemicu sharding terlewati?`);
    expect(tebak.sumber.jenis).toBe("ilustrasi");
    expect(tebak.sumber.teks).toBe(`Hitungan atas Asumsi naskah Tahap 5; kapasitas ${K} transaksi uang per detik adalah angka Ilustrasi, bukan hasil load test`);
    expect(tebak.penutup).toBe("Angka 300 hanya contoh. Pemicu sharding baru bisa dibaca sesudah kapasitas tulis satu primary diukur di server sungguhan, dan angka itu belum ada.");
    const noscript = cari(/<noscript>\s*<p>(.*)<\/p>\s*<\/noscript>/s, badan, "noscript")[1]!;
    expect(noscript).toBe(`Tanpa JavaScript tebakan tidak berjalan. Jawaban yang tepat: di PRD v6, bukan di Tahap 5. Beban Tahap 5 ${fmt(trx3T, 1)} ÷ ${K} = ${persen(trx3T, K)} dari kapasitas, dan beban PRD v6 ${fmt(v6T, 1)} ÷ ${K} = ${persen(v6T, K)}.`);
    expect(naskah).toContain("Replica menolak DML dan DDL");
    expect(riset5).toContain("DML, DDL, dan perintah 2PC ditolak");
  });
  test("'ubah satu hal': tiap baris tabel memakai rumus beban ÷ K dengan persen setengah ke atas, dan pemicunya diturunkan dari 100%", () => {
    const t = tabel("| Kapasitas K |").slice(2);
    expect(t).toHaveLength(KAPASITAS.length);
    KAPASITAS.forEach((k, i) => {
      const p5 = persen(trx3T, k);
      const p6 = persen(v6T, k);
      const pemicu = trx3T / k > 1 ? "Terlewati di Tahap 5" : v6T / k > 1 ? "Terlewati di PRD v6" : "Tidak terlewati di keduanya";
      expect(t[i], `K ${k}`).toEqual([fmt(k), p5, p6, pemicu]);
    });
    expect(t.map((r) => r[3])).toEqual(["Terlewati di Tahap 5", "Terlewati di PRD v6", "Terlewati di PRD v6", "Terlewati di PRD v6", "Tidak terlewati di keduanya"]);
    expect(badan).toContain("Semua nilai K di tabel ini adalah Ilustrasi.");
    expect(badan).toContain("Persen di atas 100% berarti beban melewati K. Pemicu yang terlewati membuka ADR ini lagi, dan tidak otomatis memilih sharding.");
    expect(badan).toContain("kapasitas K adalah angka dari load test di server sungguhan, dalam transaksi uang per detik.");
  });
});

describe("definisi label, simbol, dan istilah di pemakaian pertama", () => {
  test("Asumsi, Hitungan, Ilustrasi, Penalaran, dan L = λ × W didefinisikan sebelum dipakai di prosa dan tabel", () => {
    const a = badan.indexOf("[[A0]] menjelaskan label Rekaman lab, Asumsi, Tidak dijalankan, dan [perlu verifikasi]");
    expect(a).toBeGreaterThan(0);
    expect(badan.indexOf("Asumsi")).toBeGreaterThan(a - 1);
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("Hitungan adalah hasil rumus yang tertulis di halaman, dan labelnya ikut masukan yang paling lemah."));
    expect(badan.indexOf("Ilustrasi")).toBe(badan.indexOf("Ilustrasi adalah contoh atau skenario yang bukan hasil sistem."));
    expect(badan.indexOf("(penalaran)")).toBeGreaterThan(badan.indexOf("Penalaran adalah kesimpulan dari dokumentasi dan angka di halaman ini tanpa dijalankan, jadi labelnya Tidak dijalankan."));
    expect(badan.indexOf("Tidak dijalankan")).toBeGreaterThan(a - 1);
    expect(badan.indexOf("Rekaman lab")).toBe(a + "[[A0]] menjelaskan label ".length);
    const defL = badan.indexOf("Koneksi: L = λ × W");
    expect(defL).toBeGreaterThan(0);
    expect(badan.search(/\bL\b/)).toBeGreaterThanOrEqual(defL);
    expect(badan.indexOf("λ")).toBeGreaterThanOrEqual(defL);
    expect(badan.indexOf("(W, detik)")).toBeGreaterThan(defL);
    expect(JSON.stringify(rantaiMentah) + JSON.stringify(tebakMentah)).not.toMatch(/\bL\b|λ/);
    expect(badan).toContain("Halaman ini tidak punya lab sendiri, jadi keadaan Tahap 5 di tabel berasal dari tabel beban naskah Tahap 5 dan dari halaman ADR-nya.");
  });
  test("istilah baru diberi arti di daftar 'Apa kedua belasnya' sebelum dipakai di prosa Kenapa dan Opsi", () => {
    const daftar = badan.indexOf("### Apa kedua belasnya");
    const kenapa = badan.indexOf("### Kenapa ADR ini ada");
    expect(daftar).toBeGreaterThan(0);
    expect(daftar).toBeLessThan(kenapa);
    const potong = badan.slice(daftar, kenapa);
    const arti = [
      "Service mesh adalah lapisan infrastruktur yang mengurus keamanan, observability, dan lalu lintas antar service lewat proxy di jalur panggilan, tanpa mengubah kode service.",
      "Satu sistem dijalankan di dua region atau lebih.",
      "Data tiap service disimpan privat dan hanya terbuka lewat API service itu.",
      "Satu data store dibagi menjadi horizontal partitions yang disebut shard.",
      "BFF (backend for frontend) adalah satu backend per jenis antarmuka",
      "Masuk dengan akun penyedia lain lewat OpenID Connect.",
      "gRPC memanggil metode di service lain seperti objek lokal, dengan protocol buffers sebagai skema pesan.",
      "CDC (change data capture) mengeluarkan perubahan dari log transaksi database.",
      "Connector Debezium untuk PostgreSQL menangkap perubahan tingkat baris.",
      "TigerBeetle adalah database untuk transaksi finansial.",
      "Temporal menjalankan durable execution: bila proses mati, proses lain melanjutkan alur dari titik berhenti.",
      "Provenance adalah data terverifikasi tentang di mana, kapan, dan bagaimana sebuah artefak dibuat.",
      "HTTP Message Signatures menandatangani komponen pesan HTTP.",
      "Semua tindakan atas satu objek disimpan di append-only store sebagai system of record, dan keadaan dibangun ulang dengan memutar ulang event-nya.",
      "OpenFeature adalah spesifikasi untuk mengevaluasi feature flag.",
      "flagd adalah engine evaluasi feature flag yang sesuai spesifikasi itu.",
    ];
    for (const x of arti) expect(potong, x).toContain(x);
    expect(potong.match(/^\d+\. \*\*/gm)).toHaveLength(12);
    // bagian "Sudah tahu?" boleh memakai istilah lebih dulu: pembaca yang membukanya sudah tahu istilahnya (pola 4.29)
    const tanpaTanya = badan.replace(/<details class="question">[\s\S]*?<\/details>/, "").toLowerCase();
    const daftarT = tanpaTanya.indexOf("### apa kedua belasnya");
    expect(daftarT).toBeGreaterThan(0);
    for (const t of ["service mesh", "multi-region", "sharding", "bff", "grpc", "debezium", "tigerbeetle", "temporal", "slsa", "event sourcing", "openfeature", "flagd"]) {
      expect(tanpaTanya.indexOf(t), t).toBeGreaterThan(daftarT);
    }
  });
  test("satu kata per konsep di Tahap 5: 'layanan', 'replika', dan 'rahasia' tidak dipakai, dan 'secret' tidak muncul di halaman ini", () => {
    expect(halaman).not.toMatch(/\blayanan\b|\breplika\b|\brahasia\b|\bsecret\b|\bpelanggan\b|\bpembayar\b/i);
    expect((halaman.match(/\bservice\b/g) ?? []).length).toBeGreaterThan(20);
    expect((halaman.match(/\bread replica\b|\breplica\b/g) ?? []).length).toBeGreaterThan(2);
  });
});

describe("penutup celah mutasi: label tautan, kata bilangan atas daftar, dan kalimat enam butir", () => {
  const kata = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam"];
  test("pasangan label dan alamat tautan luar terkunci, dan versi di label sama dengan versi di alamat atau baris riset", () => {
    const pasangan = [...badan.matchAll(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g)].map((m) => `${m[1]} => ${m[2]!.replace(/^https:\/\//, "")}`);
    expect([...new Set(pasangan)]).toEqual([
      "Istio => istio.io/latest/about/service-mesh/",
      "AWS: opsi pemulihan bencana => docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html",
      "microservices.io: database per service => microservices.io/patterns/data/database-per-service.html",
      "Azure: sharding => learn.microsoft.com/en-us/azure/architecture/patterns/sharding",
      "Azure: backends for frontends => learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends",
      "gRPC => grpc.io/docs/what-is-grpc/introduction/",
      "Debezium 3.7 => debezium.io/documentation/reference/stable/connectors/postgresql.html",
      "TigerBeetle => docs.tigerbeetle.com/",
      "Temporal => docs.temporal.io/evaluate/understanding-temporal",
      "SLSA v1.2 => slsa.dev/spec/v1.2/provenance",
      "RFC 9421 => www.rfc-editor.org/rfc/rfc9421.html",
      "Azure: event sourcing => learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing",
      "spesifikasi OpenFeature => openfeature.dev/specification/",
      "flagd => flagd.dev/",
      "Azure: pola Sharding => learn.microsoft.com/en-us/azure/architecture/patterns/sharding",
      "Azure: pola Event Sourcing => learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing",
      "microservices.io: Database per service => microservices.io/patterns/data/database-per-service.html",
      "AWS: opsi pemulihan bencana di cloud => docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html",
      "Istio: apa itu service mesh => istio.io/latest/about/service-mesh/",
      "gRPC: pengantar => grpc.io/docs/what-is-grpc/introduction/",
      "OpenFeature: rilis spesifikasi => github.com/open-feature/spec/releases",
    ]);
    expect(barisRiset("R5-259")).toContain("Debezium 3.7");
    expect(barisRiset4("R4-252")).toContain("slsa.dev/spec/v1.2/provenance");
    expect(barisRiset4("R4-252")).toContain("RFC 9421");
    expect(barisRiset4("R4-252")).toContain("rfc-editor.org/rfc/rfc9421.html");
    expect(barisRiset4("R4-251")).toContain("istio.io/latest/about/service-mesh/");
    expect(barisRiset4("R4-253")).toContain("backends-for-frontends");
  });
  test("kata bilangan atas daftar dihitung dari butirnya: tiga butir sumber, tiga pertanyaan, enam butir yang tidak dibawa", () => {
    const awal = badan.indexOf("**Apa kata sumber tentang ");
    const potong = badan.slice(awal).split("\n");
    const butir = [];
    for (const l of potong.slice(2)) { if (l.startsWith("- ")) butir.push(l); else if (butir.length) break; }
    expect(butir).toHaveLength(3);
    expect(potong[0]).toBe(`**Apa kata sumber tentang ${kata[butir.length]} butir yang paling berat.** Ke${kata[butir.length]}nya Tidak dijalankan.`);
    expect(butir.map((b) => b.split(":")[0])).toEqual(["- Sharding", "- Event sourcing", "- Multi-region"]);
    const tanya = [...halaman.matchAll(/^\d\. (?:Load test|Tiga service|Pratinjau PRD v6)/gm)].length;
    expect(tanya).toBe(3);
    expect(badan).toContain(`Yakin dengan ke${kata[tanya]}nya? Lompat ke [[berikutnya]].`);
    expect(badan).toContain("Cek 3 pertanyaan");
    const enam = 'Keenamnya adalah keyless signing, workflow per modul dengan branch protection dan CODEOWNERS, isi response lawan kontrak, aturan "jalankan semua", client Dart yang dijalankan, dan menaikkan Go ke 1.27.3.';
    expect(badan).toContain(enam);
    expect(badan).toContain("Enam butir lain tidak dibawa ke ADR Tahap 5.");
    expect(badan).toContain("Tiap butir diberi satu kalimat arti, dan sumbernya ada di bawah daftar.");
    expect(badan).toContain("Dua belas butir bisa dijawab dengan tiga cara.");
    expect(tabel("| | A. Pasang semuanya")[0]).toHaveLength(4);
    expect(badan.indexOf("Dua belas butir bisa dijawab dengan tiga cara.")).toBeLessThan(badan.indexOf("| | A. Pasang semuanya"));
    expect(badan).toContain("Lima dibawa ke Tahap 5.");
  });
});

// --- keputusan 1619 (tinjauan independen): mutan yang lolos tanpa kunci baris dan tanpa sidik ditutup dengan nilai yang diturunkan dari sumbernya
describe("penutup celah tinjauan (keputusan 1619): nilai diturunkan dari kode, rekaman, naskah, halaman 4.29, dan baris riset", () => {
  const kapan = tabel("| Komponen | Salah saat").slice(2);
  const bacaan = tabel("| Komponen ADR 45 | Pemicu yang ditulis").slice(2);
  test("label: tak satu pun keadaan memakai Rekaman lab (halaman tanpa lab), diagram dan tebak berlabel Asumsi atau Ilustrasi", () => {
    const rek = halaman.split("\n").filter((b) => b.includes("Rekaman lab"));
    expect(rek).toHaveLength(1);
    expect(rek[0]).toContain("[[A0]] menjelaskan label Rekaman lab");
    expect(JSON.stringify(rantaiMentah) + JSON.stringify(tebakMentah)).not.toMatch(/Rekaman lab|"jenis":\s*"rekaman"/);
    expect(rantaiMentah.sumber.jenis).toBe("asumsi");
    expect(tebakMentah.sumber.jenis).toBe("ilustrasi");
    expect(halaman).not.toMatch(/Rekaman lab:/);
  });
  test("anggaran gRPC: judul Snippet dan sel Tahap 4 mengikuti konstanta Go dan baris batas di latensi.txt (ya atau tidak)", () => {
    const kode = baca("labs/api-t4/internal/handler/latensi_ledger_test.go");
    const anggaran = Number(cari(/anggaranTambahanHTTP = (\d+) \* time\.Millisecond/, kode, "anggaran")[1]);
    expect(halaman).toContain(`title="Kode lab: labs/api-t4/internal/handler/latensi_ledger_test.go (anggaran ${anggaran} ms)"`);
    const batas = cari(/batas: tambahan p95 lewat HTTP di bawah (\d+)ms: (ya|tidak)/, baca("labs/t4-modul/output/latensi.txt"), "batas latensi");
    expect(Number(batas[1])).toBe(anggaran);
    const frasa = batas[2] === "ya" ? `di bawah ${anggaran} ms di localhost` : `melewati ${anggaran} ms di localhost`;
    expect(kapan[6]![3]!.toLowerCase()).toContain(`tahap 4: ${frasa}`);
    expect(bacaan[4]![2]!.toLowerCase()).toBe(frasa);
    expect(kapan[6]![1]).toContain(`melewati ${anggaran} ms antar host`);
    expect(bacaan[4]![1]).toContain(`melewati ${anggaran} ms antar host`);
  });
  test("kata sifat di sub simpul diagram mengikuti hitungan: 0 terpenuhi berarti 'belum sama', sub lain sama dengan definisi kata di halaman", () => {
    const subs = DataRantai.parse(rantaiMentah).baris.flatMap((b) => b.simpul.map((s) => s.sub));
    const def = (k: string): string => cari(new RegExp(`- "${k}": (.+)\\.$`, "m"), badan, k)[1]!;
    const jum = (k: string): number => kapan.filter((r) => r[4] === k).length;
    expect(jum("Belum terpenuhi") + jum("Belum terukur") + jum("Tidak diminta") + jum("Menunggu PRD v6")).toBe(kapan.length);
    expect(subs[1]).toBe("keadaan Tahap 5 belum sama dengan pemicu mana pun");
    expect(subs[2]).toBe(def("Belum terukur"));
    expect(subs[3]).toBe(def("Belum terpenuhi").replace(/^angkanya ada dan di bawah pemicu$/, "angkanya ada dan di bawah pemicu"));
    expect(kapan.filter((r) => r[4] === "Tidak diminta").some((r) => r[3]!.startsWith(subs[4]!))).toBe(true);
    expect(subs[5]).toBe(kapan.find((r) => r[4] === "Menunggu PRD v6")![0]!.replace(/^\d+\. /, "").toLowerCase());
  });
  test("angka masukan di kalimat prosa dan sel: pembanding laju CDC, ambang koneksi, dan batas 100 dari tabel diturunkan dari hitungan dan naskah", () => {
    expect(kapan[7]![3]).toBe(`Pembanding laju ${fmt(notifT, 1)} per detik. Umur event tertua belum punya angka`);
    expect(badan).toContain(`Ambang ${ambangL} koneksi dan ${pemicuKoneksi} dari ${maxKoneksi} koneksi adalah Asumsi [[t2-adr-21]] dan [[t3-adr-33]].`);
    expect(kapan[2]![3]).toContain(`L seluruh request ${fmt(lSemua, 1)} koneksi dari ${nTersedia} tersedia (Hitungan atas Asumsi)`);
  });
  test("produk event streaming di kalimat halaman sama dengan yang dipilih ADR 51 di naskah", () => {
    const adr51 = naskah.split("\n").find((b) => b.startsWith("| 51 |")) ?? "";
    const produkNaskah = cari(/(\w+) 4\.\d+ dengan KRaft/, adr51, "produk ADR 51")[1];
    const produkHalaman = cari(/\[\[t5-fanout\]\] tetap memasang (\w+)/, badan, "produk di halaman")[1];
    expect(produkHalaman).toBe(produkNaskah);
    expect(produkNaskah).toBe("Kafka");
  });
  test("negasi berpasangan dengan sumbernya: partisi tidak menambah kapasitas tulis (ADR 49), request paralel bukan pemicu BFF (4.29), opsi C tanpa komponen baru", () => {
    const adr49 = naskah.split("\n").find((b) => b.startsWith("| 49 |")) ?? "";
    expect(adr49).toContain("partisi tidak menambah kapasitas tulis");
    expect(kapan[3]![3]).toContain("([[t5-partisi]]) tidak menambah kapasitas tulis");
    expect(t4).toContain("Satu layar app butuh lebih dari 3 request yang harus berurutan");
    expect(kapan[4]![1]).toContain("request berurutan");
    expect(kapan[4]![3]).toContain("Request paralel bukan pemicunya");
    const opsi = tabel("| | A. Pasang semuanya").slice(2);
    expect(opsi[0]![0]).toBe("Cara kerja");
    expect(opsi[0]![1]).toContain("Dua belas komponen dipasang selama Tahap 5");
    expect(opsi[0]![3]).toMatch(/^Tidak ada komponen baru\./);
    expect(naskah).toContain("tunda dengan pemicu dan alat ukur (dipilih, seperti ADR 45)");
  });
  test("status ADR: rentang 'ADR 46 sampai 59' dari naskah, dan ±50 developer tidak dipakai karena tanpa sumber primer (4.29)", () => {
    const m = cari(/Ia tidak membatalkan keputusan di ADR (\d+) sampai (\d+)\./, badan, "status ADR");
    const nomor = [...naskah.matchAll(/^\| (\d+) \| /gm)].map((x) => Number(x[1])).filter((n) => n >= 46 && n <= 59);
    expect(Number(m[1])).toBe(Math.min(...nomor));
    expect(Number(m[2])).toBe(Math.max(...nomor));
    expect(t4).toContain("±50 developer adalah heuristik praktisi tanpa sumber primer [perlu verifikasi]");
    expect(badan).toContain("Heuristik ±50 developer tidak dipakai, karena tidak punya sumber primer [perlu verifikasi]");
  });
  test("klaim tanpa nomor versi dan tanpa tanggal terbit: tiap produk punya baris riset yang mencatatnya, dan Istio menulis versi di kakinya", () => {
    const sumber: [string, string, RegExp][] = [
      ["AWS", barisRiset("R5-258"), /docs\.aws\.amazon\.com[^)]*tanpa nomor versi/],
      ["gRPC", barisRiset("R5-259"), /grpc\.io[^)]*tanpa nomor versi/],
      ["TigerBeetle", barisRiset("R5-259"), /docs\.tigerbeetle\.com \(tanpa nomor versi\)/],
      ["Temporal", barisRiset4("R4-252"), /docs\.temporal\.io[^,;]*\(tanpa nomor versi/],
      ["flagd", barisRiset("R5-259"), /flagd\.dev \(tanpa nomor versi\)/],
    ];
    for (const [nama, baris, re] of sumber) expect(baris, nama).toMatch(re);
    expect(badan).toContain(`Dokumentasi ${sumber.map((s) => s[0]).slice(0, 4).join(", ")}, dan ${sumber[4]![0]} tidak memuat nomor versi di halamannya.`);
    expect(barisRiset("R5-257")).toContain("halaman tanpa tanggal terbit");
    expect(badan).toContain("halaman microservices.io tidak memuat tanggal terbit.");
    const versiIstio = cari(/Version Istio (\d+\.\d+\.\d+)/, barisRiset("R5-259"), "versi Istio di kaki")[1];
    expect(badan).toContain(`Halaman Istio menulis Istio ${versiIstio} di kakinya`);
    expect(badan).not.toMatch(/Dokumentasi Istio/);
  });
  test("tak satu pun dari dua belas butir masuk P0 atau P1 PRD v5 di naskah, dan multi-region ada di P2 yang ditunda ke v6", () => {
    const prd = naskah.split("\n").filter((b) => /^\| P[012] \| /.test(b));
    expect(prd.length).toBeGreaterThanOrEqual(7);
    const butir = /service mesh|multi-region|database per service|database terpisah|shard|BFF|login sosial|gRPC|CDC|Debezium|TigerBeetle|Temporal|SLSA|event sourcing|OpenFeature|flagd/i;
    expect(prd.filter((b) => /^\| P[01] \| /.test(b)).filter((b) => butir.test(b))).toEqual([]);
    const p2 = prd.filter((b) => b.startsWith("| P2 |"));
    expect(p2).toHaveLength(1);
    expect(p2[0]).toMatch(/Ditunda ke v6 \| Multi-region/);
    expect(badan).toContain("Tak satu pun masuk ruang lingkup PRD v5, dan multi-region ditulis di sana sebagai P2 yang ditunda ke v6 ([[t5-prd]]).");
  });
  test("kosakata Dibaca konsisten: sel Tahap 5 di tabel pembacaan ulang tidak memakai 'belum terpenuhi' untuk butir yang belum diukur", () => {
    for (const r of bacaan) {
      if (/belum diukur/i.test(r[3]!) || /belum diukur/i.test(r[2]!)) expect(r[3], r[0]).not.toMatch(/belum terpenuhi/i);
    }
    expect(bacaan[4]![3]).toBe("Antar host belum diukur");
    expect(bacaan[7]![3]).toBe("Belum diukur");
    expect(badan).toContain("Kolom Pemicu memuat pemicu utama dari naskah Tahap 5. [[t4-adr-45]] menulis pemicu tambahan di beberapa baris, dan tabel ini tidak membacanya ulang. Contohnya login sosial: pendaftar berhenti di layar daftar.");
    expect(t4).toContain("Atau pendaftar berhenti di layar daftar");
  });
  test("daftar bagian OpenFeature: tanpa 'antara lain' hanya bila sama dengan daftar bagian di baris riset; 'dugaan pertama' sama dengan yang dikira di M51", () => {
    const bagian = cari(/daftar bagian: ([^)]+)\)/, barisRiset("R5-259"), "bagian spesifikasi OpenFeature")[1]!.split(", ");
    const halBagian = cari(/Bagiannya (antara lain )?([^.]+)\./, badan, "bagian di halaman");
    const daftarHal = halBagian[2]!.replace(/, dan /, ", ").split(", ");
    expect(daftarHal.every((x) => bagian.includes(x))).toBe(true);
    if (daftarHal.length < bagian.length) expect(halBagian[1]).toBe("antara lain ");
    const m51 = naskah.split("\n").find((b) => b.startsWith("| M51 |")) ?? "";
    const dikira = cari(/Perlu (.+?) dan (.+?) sekarang/, m51, "yang dikira M51");
    expect(badan).toContain(`Dugaan pertama adalah memasang ${dikira[1]} dan ${dikira[2]} sekarang`);
    expect(badan).toContain(`karena ${cari(/PRD v6: (\d+) juta user/, m51, "user PRD v6 di M51")[1]} juta user terdengar seperti skala yang menuntutnya`);
  });
  test("alasan memilih C: huruf opsi sama dengan kepala tabel, alasan B memakai kata ADR 45 (kelupaan), alasan A memakai jumlah orang dari naskah, aturan 2 memakai kalimat ADR 45", () => {
    const kepala = tabel("| | A. Pasang semuanya")[0]!;
    expect(kepala.slice(1).map((k) => k[0])).toEqual(["A", "B", "C"]);
    expect(kepala[3]).toBe("C. Tunda dengan pemicu dan alat ukur");
    expect(naskah.split("\n").find((b) => b.startsWith("| 60 |"))).toContain("tunda dengan pemicu dan alat ukur (dipilih");
    expect([...badan.matchAll(/^\*\*Kenapa C, bukan ([AB])\.\*\*/gm)].map((m) => m[1])).toEqual(["A", "B"]);
    expect(t4).toContain("keputusan, bukan kelupaan");
    expect(cari(/\*\*Kenapa C, bukan B\.\*\* (.+)$/m, badan, "alasan B")[1]).toContain("kelupaan");
    expect(cari(/\*\*Kenapa C, bukan A\.\*\* (.+)$/m, badan, "alasan A")[1]).toContain(`${orangTotal} orang`);
    expect(t4).toContain("dibaca dari alat, bukan dari tanggal");
    expect(badan).toContain("Pemicu dibaca dari alat, bukan dari tanggal.");
  });
});

// --- lapis 2: kunci per baris, sidik kata penentu, struktur, angka, dan label
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "nol", "terpenuhi", "terlewati", "menunggu", "diminta", "terukur"];
const sidik = (teks: string, kata: string[]): Record<string, number> =>
  Object.fromEntries(kata.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
const nilaiString = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) nilaiString(y, keluar);
  else if (x && typeof x === "object") for (const y of Object.values(x)) nilaiString(y, keluar);
  return keluar;
};
const tekstual = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
  else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
  else if (typeof x === "number" || typeof x === "boolean") keluar.push(`=${String(x)}`);
  return keluar;
};
const h16 = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);
const SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"(\[*_`])/;
const prosa = badan.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<Snippet"));
const struktur = prosa.map((b) => {
  if (b.startsWith("#")) return b.match(/^#+/)![0];
  if (b.startsWith("|")) return `|:${b.split("|").length - 2}`;
  if (b.startsWith("<")) return b.match(/^<\/?[A-Za-z]+/)![0];
  const n = b.split(SPLIT).length;
  if (b.startsWith("- ")) return `-:${n}`;
  if (/^\d+\. /.test(b)) return `${b.match(/^\d+/)![0]}.:${n}`;
  if (/^\*\*\d+\.\*\*/.test(b)) return `**${b.match(/\d+/)![0]}**:${n}`;
  return `p:${n}`;
});
const angka = prosa.flatMap((b) => angkaDari(b));
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/penalaran/gi) ?? []).length, dibuka: (halaman.match(/dibuka 2026-10-31/g) ?? []).length, tanggal: (halaman.match(/2026-10-31/g) ?? []).length,
  },
  halaman: sidik(halaman, KATA), rantai: sidik(nilaiString(rantaiMentah).join("\n"), KATA), tebak: sidik(nilaiString(tebakMentah).join("\n"), KATA),
  struktur: struktur.join(" "), angka: angka.join(" "),
  tabel: badan.split("\n").filter((b) => b.startsWith("|")).map(h16),
  riset: ["R5-255", "R5-256", "R5-257", "R5-258", "R5-259"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), tebak: h16(JSON.stringify(tebakMentah)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = { halaman: halaman.split("\n").filter((b) => b.trim() !== ""), json: { rantai: tekstual(rantaiMentah), tebak: tekstual(tebakMentah) } };

if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat sengaja-belum-t5.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "sengaja-belum-t5.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, dan tebak terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram dan tebak sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, tabel, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
    expect(sidikSekarang.label.rekamanLab).toBe(1);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, dan tebak", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.tebak).toEqual(SIDIK.tebak);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, tabel per baris, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.tabel).toEqual(SIDIK.tabel);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
