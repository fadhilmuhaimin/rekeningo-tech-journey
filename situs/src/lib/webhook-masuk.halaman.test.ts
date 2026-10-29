// Penjaga angka halaman 4.7 (keputusan 1290 sampai 1292): angka, ID, nomor ADR, versi sumber, tautan, rentang Snippet, tabel, klaim "hanya"
// atau "tidak ada", dan kalimat mekanisme yang ditulis tangan di webhook-masuk.mdx dan diagram t4-webhook-masuk-inti.json diturunkan dari
// rekaman labs/t4-webhook/output, labs/api-t4/output/rentan.txt, labs/t4-modul/output/proses-mati.txt, kode api-t4, naskah, registry, dan
// RISET, bukan dari daftar yang ditulis sendiri. Pola: fitur-topup-verifikasi.halaman.test.ts dan at-least-once.halaman.test.ts.
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman dan diagram dikunci per baris di
// webhook-masuk.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks sengaja
// diubah: PERBARUI_KUNCI=1 vitest run src/lib/webhook-masuk.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci: kalimat tentang kode (transaction, urutan, kunci) diperiksa terhadap kodenya.
// Widget WebhookLangkah memakai angka dari rekaman yang sama dan dijaga penjaganya sendiri (src/widgets/webhook-langkah).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantai from "../../data/diagram/t4-webhook-masuk-inti.json";
import registry from "../../data/cerita.json";
import { KALIMAT_TERKUNCI, KUNCI_JSON } from "./webhook-masuk.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const HALAMAN = "situs/src/content/docs/tahap-4/webhook-masuk.mdx";
const halaman = baca(HALAMAN);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const ganda = baca("labs/t4-webhook/output/ganda.txt");
const serentak = baca("labs/t4-webhook/output/ganda-serentak.txt");
const tanda = baca("labs/t4-webhook/output/tandatangan.txt");
const urutan = baca("labs/t4-webhook/output/urutan.txt");
const retry = baca("labs/t4-webhook/output/retry.txt");
const rentan = baca("labs/api-t4/output/rentan.txt");
const prosesMati = baca("labs/t4-modul/output/proses-mati.txt");
const kodeService = baca("labs/api-t4/internal/service/pembayaran.go");
const kodeAturan = baca("labs/api-t4/internal/service/t4_aturan.go");
const kodeRepo = baca("labs/api-t4/internal/repo/pembayaran.go");
const kodeTx = baca("labs/api-t4/internal/repo/tx.go");
const kodeHandler = baca("labs/api-t4/internal/handler/handler_pembayaran.go");
const istilahHmac = JSON.parse(baca("situs/data/halaman-istilah/hmac.json")) as { istilah: string; cerita: { rujukan: string; teks: string }[]; sumber: { riset?: string; url?: string; rekaman?: string; judul: string; catatan: string }[]; terkait: string[] };
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const tanpaKunci = process.env.TANPA_KUNCI === "1";

// ---- pembaca rekaman ---------------------------------------------------------------------------
interface Bagian { awal: number; akhir: number; baris: string[] }
// Bagian rekaman diawali "# --- X. ..." atau "# --- X1. ..."; awal dan akhir adalah nomor baris (mulai 1) seperti rentang Snippet.
const pecah = (teks: string): Record<string, Bagian> => {
  const semua = teks.split("\n");
  const hasil: Record<string, Bagian> = {};
  let kini = "";
  semua.forEach((b, i) => {
    const m = b.match(/^# --- ([A-Z]\d?)\. /);
    if (m) {
      if (kini) hasil[kini]!.akhir = i;
      kini = m[1]!;
      hasil[kini] = { awal: i + 1, akhir: semua.length, baris: [] };
    } else if (kini) hasil[kini]!.baris.push(b);
  });
  return hasil;
};
const G = pecah(ganda);
const S = pecah(serentak);
const T = pecah(tanda);
const U = pecah(urutan);
const R = pecah(retry);
const N = pecah(rentan);
const M = pecah(prosesMati);
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
const noBaris = (teks: string, awalan: string, dari = 1): number => {
  const i = teks.split("\n").findIndex((b, k) => k + 1 >= dari && b.startsWith(awalan));
  if (i < 0) throw new Error(`jangkar tidak ditemukan: ${awalan}`);
  return i + 1;
};
// Fungsi Go: dari baris yang diawali `awalan` sampai kurung kurawal penutup di kolom 0.
const rentangFungsi = (teks: string, awalan: string): string => {
  const awal = noBaris(teks, awalan);
  const semua = teks.split("\n");
  const akhir = semua.findIndex((b, k) => k + 1 > awal && b === "}") + 1;
  return `${awal}:${akhir}`;
};
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rp = (n: number): string => `Rp${titik(n)}`;
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const fungsi = (teks: string, kepala: string): string => {
  const awal = teks.indexOf(kepala);
  if (awal < 0) throw new Error(`fungsi tidak ditemukan: ${kepala}`);
  return teks.slice(awal, teks.indexOf("\n}\n", awal) + 3);
};
const harus = (kalimat: string): void => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const tabel = (awalan: string, kolom: number): string[][] => {
  const semua = halaman.slice(halaman.indexOf(awalan)).split("\n").slice(2);
  const keluar: string[][] = [];
  for (const b of semua) { if (!b.startsWith("|")) break; keluar.push(b.split("|").slice(1, -1).map((x) => x.trim())); }
  expect(keluar.every((x) => x.length === kolom), `kolom tabel ${awalan}`).toBe(true);
  return keluar;
};
const rapi = (x: string): string => x.replace(/`/g, "").toLowerCase();
// Baris tabel psql: " a | b | c" dipecah per kolom.
const sel = (baris: string): string[] => baris.trim().split("|").map((x) => x.trim());

// ---- nilai turunan dari rekaman ----------------------------------------------------------------
// ganda.txt A dan B.
const GA = bagian(G, "A").baris;
const GB = bagian(G, "B").baris;
const eventId = cari(/"event_id":"(evt-\d+)"/, GA, "event A")[1]!;
const jurnalGanda = GA.flatMap((b) => { const m = b.match(/^ (\d+)\s+\| bank\s+\| (-\d+)$/); return m ? [[Number(m[1]), -Number(m[2])]] : []; });
const hasilA = cari(/^hasil kiriman: (200 \w+), (200 \w+)$/, GA, "hasil A");
const hasilB2 = cari(/^kiriman 2 \(event yang sama\): (200 \w+)$/, GB, "kiriman 2 B")[1]!;
const barisEvent = GB.filter((b) => /^ evt-\d+\s+\| settlement\s+\| diproses\s+\| t$/.test(b));
const bayar = jurnalGanda[0]![1]!;
const saldoNaik = jurnalGanda.reduce((a, j) => a + j[1]!, 0);
// ganda-serentak.txt.
const SA = bagian(S, "A").baris;
const SB = bagian(S, "B").baris;
const serentakA = cari(/^dua kiriman bersamaan, tanda tangan sah \(diurutkan\): (200 \w+), (200 \w+)$/, SA, "serentak A")[1]!;
const jurnalSerentak = Number(cari(/^ (\d+)$/, SA, "jurnal serentak")[1]);
const serentakB1 = cari(/^dua kiriman bersamaan, event_id yang sama \(diurutkan\): (200 \w+), (200 \w+)$/, SB, "serentak B1");
const serentakB2 = cari(/^dua event berbeda untuk satu kejadian, berurutan, tanpa dua lapis cadangan: (200 \w+), (200 \w+)$/, SB, "serentak B2");
const jedaMs = Number(serentak.match(/-lab-jeda-cek-tulis (\d+)ms/)![1]);
// tandatangan.txt A, B, D.
const TA = bagian(T, "A").baris;
const TB = bagian(T, "B").baris;
const TD = bagian(T, "D").baris;
const byteBody = Number(cari(/body (\d+) byte, (\d+) baris baru/, TA, "body")[1]);
const barisBaru = Number(cari(/body (\d+) byte, (\d+) baris baru/, TA, "body")[2]);
const detikLalu = (teks: string): number[] => TB.flatMap((b) => { const m = b.match(new RegExp(`^timestamp (\\d+) detik ${teks}`)); return m ? [Number(m[1])] : []; });
const gayaBaris = TD.filter((b) => /^ [a-zA-Z]/.test(b) && b.includes("|") && !b.startsWith(" kejadian")).map(sel);
// urutan.txt F1, F2, F3, G.
const UF1 = bagian(U, "F1").baris;
const UF2 = bagian(U, "F2").baris;
const UF3 = bagian(U, "F3").baris;
const UG = bagian(U, "G").baris;
const barisG = UG.filter((b) => /^ [1-4]\. /.test(b)).map(sel);
const ditanyaF1 = Number(cari(/^berapa kali api-t4 menanyakan order ini ke gateway: (\d+)$/, UF1, "ditanya F1")[1]);
const ditanyaF2 = Number(cari(/^berapa kali api-t4 menanyakan top-up kedua ke gateway: (\d+) /, UF2, "ditanya F2")[1]);
// retry.txt A dan D.
const RA = bagian(R, "A").baris;
const RD = bagian(R, "D").baris;
const jeda = cari(/^jeda antar percobaan \(sejak percobaan sebelumnya\): ([\d, ]+) menit \(total (\d+) menit\)$/, RA, "jeda");
const jedaMenit = jeda[1]!.split(",").map((x) => Number(x.trim()));
const totalMenit = Number(jeda[2]);
const kodeKiriman = RA.flatMap((b) => { const m = b.match(/^ (\d{3})\s+\| (\d+)\s+\|/); return m ? [[m[1]!, Number(m[2])]] as [string, number][] : []; });
const lPuncak = cari(/^top-up puncak: (\d[\d.]*) aktif x ([\d,]+) top-up per hari \/ (\d[\d.]*) x (\d+) = ([\d,]+) per detik$/, RD, "top-up puncak");
const lBatas = cari(/^batas atas kiriman bila semua kiriman gagal dan diulang sampai kiriman ke-(\d+): (\d+) x ([\d,]+) = ([\d,]+) per detik$/, RD, "batas atas");
const lW5 = cari(/^W = 5 detik: L = λ x W = ([\d,]+) x 5 = ([\d,]+) koneksi$/, RD, "L pada batas atas");
const poolPenuh = cari(/^pool pembayaran (\d+) \(Asumsi\): penuh sejak W > (\d+) ÷ ([\d,]+) = ([\d,]+) detik$/, RD, "pool penuh");
const lPuncakW5 = cari(/Pada laju puncak ([\d,]+) per detik, W = 5 detik memakai L = ([\d,]+)\./, RD, "L pada puncak");
const num = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
// Pembulatan setengah ke atas yang tidak terganggu galat biner (3,47 × 5 = 17,349999...).
const bulat = (x: number, d: number): number => Math.round(x * 10 ** d + 1e-6) / 10 ** d;
// rentan.txt A.
const NA = bagian(N, "A").baris;
// proses-mati.txt A dan C.
const MA = bagian(M, "A").baris;
const MC = bagian(M, "C").baris;
const tabelC = MC.filter((b) => /^ \d+\s+\| \d+\s+\| dibayar$/.test(b)).map(sel);
const hasilKurang = cari(/^ (\d+)\s+\| (\d+)\s+\| (\d+)$/, MC, "dibaca rekonsiliasi");
// kode lab.
const toleransiMenit = Number(kodeAturan.match(/ToleransiWebhook\s+= (\d+) \* time\.Minute/)![1]);
const maksWebhookKb = Number(kodeHandler.match(/MaksWebhook = (\d+) << 10/)![1]);
const umurKeyJam = Number(kodeService.match(/kini\.Add\((\d+)\*time\.Hour\)/)![1]);

describe("rekaman dan kode: nilai turunan yang dipakai halaman", () => {
  test("ganda.txt: event yang sama dua kali, dua jurnal di versi pertama, 200 ganda dan satu baris di versi ADR 34", () => {
    expect(eventId).toBe("evt-1");
    expect(jurnalGanda).toEqual([[10201, 200000], [10202, 200000]]);
    expect([hasilA[1], hasilA[2]]).toEqual(["200 diproses", "200 diproses"]);
    expect(saldoNaik).toBe(2 * bayar);
    expect(bayar).toBe(200000);
    expect(hasilB2).toBe("200 ganda");
    expect(barisEvent).toHaveLength(1);
    expect(GB.some((b) => b.startsWith("kiriman 1 (koneksi diputus gateway begitu balasan mulai datang)"))).toBe(true);
    expect(GA.some((b) => b.includes("Tidak ada tabel event, dan status bersyarat tidak ada."))).toBe(true);
    expect(rentan).toContain('"saldo":650000');
    expect(rentan).toContain("Rp400.000 untuk Rp200.000 yang dibayar");
  });
  test("ganda-serentak.txt: cek-lalu-tulis lolos dua kali, kunci utama menahan event yang sama, event berbeda lolos tanpa lapis cadangan", () => {
    expect(serentakA).toBe("200 diproses");
    expect(cari(/^dua kiriman bersamaan, tanda tangan sah \(diurutkan\): (200 \w+), (200 \w+)$/, SA, "serentak A")[2]).toBe("200 diproses");
    expect(jurnalSerentak).toBe(2);
    expect([serentakB1[1], serentakB1[2]]).toEqual(["200 diproses", "200 ganda"]);
    expect([serentakB2[1], serentakB2[2]]).toEqual(["200 diproses", "200 diproses"]);
    expect(jedaMs).toBe(300);
    expect(SA.some((b) => b.includes("lebar celah tanpa jeda tidak diukur dan tidak menjadi klaim"))).toBe(true);
    expect(SB.some((b) => b.includes("-lab-tanpa-lapis status,kunci"))).toBe(true);
  });
  test("tandatangan.txt: body berindentasi, byte mentah cocok dan diurai ulang tidak, usia kiriman, tiga gaya", () => {
    expect([byteBody, barisBaru]).toEqual([109, 5]);
    expect(TA).toContain("verifikasi atas byte mentah: cocok");
    expect(TA.some((b) => b.startsWith("verifikasi atas JSON yang diurai lalu ditulis ulang") && b.endsWith(": tidak cocok"))).toBe(true);
    expect(TB.some((b) => b === "isi diubah sesudah ditandatangani (jumlah x10): 401")).toBe(true);
    expect(TB.some((b) => b === "timestamp 240 detik lalu (di dalam toleransi): 200 diproses")).toBe(true);
    expect(detikLalu("lalu")).toEqual([240, 360]);
    expect(detikLalu("di depan")).toEqual([360]);
    expect(TB.filter((b) => /^timestamp 360 detik .*: 401$/.test(b))).toHaveLength(2);
    expect(TB.some((b) => b.includes("Yang ditolak tidak menulis event dan tidak menjurnal"))).toBe(true);
    expect(toleransiMenit).toBe(5);
    expect(toleransiMenit * 60).toBe(300);
    expect(240).toBeLessThan(toleransiMenit * 60);
    expect(360).toBeGreaterThan(toleransiMenit * 60);
    expect(gayaBaris).toEqual([
      ["kiriman sah", "diterima", "diterima", "diterima"],
      ["isi diubah: jumlah x10, tanda tangan lama", "ditolak", "ditolak", "diterima"],
      ["field yang tidak ditandatangani diubah (event_id)", "ditolak", "diterima", "diterima"],
      ["kiriman sah diputar ulang 60 detik kemudian", "diterima", "diterima", "diterima"],
      ["kiriman sah diputar ulang 6 menit kemudian", "ditolak", "diterima", "diterima"],
      ["isi sah diformat ulang (indentasi), tanda tangan lama", "ditolak", "diterima", "diterima"],
      ["pengirim tidak tahu rahasia", "ditolak", "ditolak", "ditolak"],
    ]);
    expect(TD.some((b) => b.includes("yang menahannya adalah event_id (ganda.txt)"))).toBe(true);
    expect(TD.some((b) => b.includes("[perlu verifikasi]: bentuk satu gateway nyata tidak dibuka ulang"))).toBe(true);
  });
  test("urutan.txt: kabar mundur diparkir, ditanya 0 dan 1 kali, settlement sesudah expire, tiga lapis dan key 24 jam", () => {
    expect(UF1).toContain("kabar pending sesudah settlement: 200 diparkir");
    expect(UF1.filter((b) => b === " dibayar")).toHaveLength(1);
    expect(UF1.some((b) => /^ evt-f2\s+\| pending\s+\| diparkir$/.test(b))).toBe(true);
    expect(ditanyaF1).toBe(0);
    expect(UF2).toContain("top-up kedua melewati batas tingkat sesudah lock: 200 diparkir");
    expect(ditanyaF2).toBe(1);
    expect(UF2.some((b) => b.includes("status tetap menunggu dan uangnya tertahan di bank"))).toBe(true);
    expect(UF3).toContain("settlement sesudah expire: 200 diparkir");
    expect(UF3.some((b) => /^ kedaluwarsa\s+\|\s*$/.test(b))).toBe(true);
    expect(UF3.some((b) => b.includes("tidak_di_ledger"))).toBe(true);
    expect(barisG).toEqual([
      ["1. semua lapis menyala", "0 jam", "ganda", "1"],
      ["2. semua lapis menyala, 25 jam kemudian", "25 jam", "ganda", "1"],
      ["3. tanpa lapis status, event kedua langsung", "0 jam", "ganda", "1"],
      ["4. tanpa lapis status, 25 jam kemudian (key sudah habis)", "25 jam", "diproses", "2"],
    ]);
    expect(UG.some((b) => b.includes("Karena itu hanya status top-up yang menahan"))).toBe(true);
    expect(umurKeyJam).toBe(24);
    expect(25).toBeGreaterThan(umurKeyJam);
  });
  test("retry.txt: jeda 2, 10, 30, 90, 210 menit berjumlah 342, kiriman per kode, dan hitungan koneksi", () => {
    expect(jedaMenit).toEqual([2, 10, 30, 90, 210]);
    expect(jedaMenit.reduce((a, b) => a + b, 0)).toBe(342);
    expect(totalMenit).toBe(342);
    expect(kodeKiriman).toEqual([["200", 1], ["400", 3], ["404", 3], ["500", 2], ["503", 5], ["401", 6], ["502", 6]]);
    expect(RA.some((b) => b.includes("Jumlah ulangan per kode mengikuti dokumentasi satu gateway nyata"))).toBe(true);
    expect(RA.some((b) => b.includes("Tiruan tidak menggeser tiap percobaan secara acak"))).toBe(true);
    // λ = 20.000 aktif × 0,25 ÷ 86.400 × 10 (RISET dan naskah memakai 0,579).
    const lambda = (20000 * 0.25) / 86400 * 10;
    expect([num(lPuncak[1]!), num(lPuncak[2]!), num(lPuncak[3]!), Number(lPuncak[4])]).toEqual([20000, 0.25, 86400, 10]);
    expect(lambda).toBeCloseTo(0.5787, 4);
    expect(num(lPuncak[5]!)).toBe(bulat(lambda, 3));
    expect([Number(lBatas[1]), Number(lBatas[2])]).toEqual([6, 6]);
    expect(num(lBatas[4]!)).toBe(bulat(6 * num(lPuncak[5]!), 2));
    expect(num(lW5[2]!)).toBe(bulat(num(lBatas[4]!) * 5, 1));
    expect(num(lPuncakW5[2]!)).toBe(bulat(num(lPuncak[5]!) * 5, 1));
    expect(Number(poolPenuh[1])).toBe(10);
    expect(num(poolPenuh[4]!)).toBe(bulat((Number(poolPenuh[1]) - 1) / num(lBatas[4]!), 1));
    expect(RD.some((b) => b.includes("Hitungan dari angka naskah, bukan rekaman: lab tidak menahan koneksi 5 detik per kabar."))).toBe(true);
  });
  test("api-t4 rentan.txt A: versi pertama memundurkan status ke menunggu", () => {
    expect(NA.some((b) => b.startsWith("# Kabar pending sesudah dibayar: status mundur ke menunggu"))).toBe(true);
    const awal = NA.findIndex((b) => b.includes("SELECT status FROM topup_bank WHERE id = 1"));
    expect(NA[awal + 3]!.trim()).toBe("menunggu");
  });
  test("proses-mati.txt: proses mati di antara ledger dan transaction, +23 jam satu jurnal, +25 jam dua", () => {
    const MAx = MA.join("\n");
    expect(MAx).toContain("hasil: 200 diproses");
    expect(MA.some((b) => /^ menunggu\s+\| f\s+\| 1\s+\| 1$/.test(b))).toBe(true);
    expect(MA.some((b) => /^ 0$/.test(b))).toBe(true);
    expect(MA.some((b) => /^ e1\s+\| diproses\s+\| t$/.test(b))).toBe(true);
    expect(MA.some((b) => /^ dibayar\s+\| t\s+\| 1\s+\| 1$/.test(b))).toBe(true);
    expect(tabelC.map((r) => [r[0], r[1]])).toEqual([["1", "1"], ["2", "1"]]);
    expect(MC.some((b) => b.startsWith("# jam ledger digeser 23 jam"))).toBe(true);
    expect(MC.some((b) => b.startsWith("# jam ledger digeser 25 jam"))).toBe(true);
    expect([Number(hasilKurang[1]), Number(hasilKurang[2]), Number(hasilKurang[3])]).toEqual([150000, 300000, 150000]);
    expect(MC.some((b) => b.includes("Rekonsiliasi harian api-t4 (RekonHarian, repo.LedgerTopupTanggal) membaca posting positif dari jurnal yang dipegang topup_bank. SQL yang sama, Tidak dijalankan sebagai job"))).toBe(true);
  });
  test("kode api-t4: tanda tangan HMAC-SHA256 atas timestamp titik byte, hmac.Equal, toleransi, batas body, CatatEvent, DalamTx", () => {
    const tt = fungsi(kodeService, "func TandaTangan(");
    expect(tt).toContain("hmac.New(sha256.New");
    expect(tt).toContain('fmt.Fprintf(m, "%d.", timestamp)');
    expect(tt).toContain("m.Write(body)");
    const periksa = fungsi(kodeService, "func (s Service) PeriksaTandaTangan(");
    expect(periksa).toContain("hmac.Equal(");
    expect(periksa).toContain("selisih > ToleransiWebhook");
    expect(periksa).toContain("for _, r := range s.t4.RahasiaWebhook");
    expect(maksWebhookKb).toBe(64);
    expect(kodeHandler).toContain("io.ReadAll(http.MaxBytesReader(w, r.Body, MaksWebhook))");
    expect(kodeHandler).toContain('r.Header.Get("X-Gateway-Timestamp"), r.Header.Get("X-Gateway-Signature")');
    expect(kodeHandler).toContain("Tanda tangan yang salah dan timestamp yang kedaluwarsa dijawab sama: 401.");
    const catat = fungsi(kodeRepo, "func (t Tx) CatatEvent(");
    expect(catat).toContain("ON CONFLICT (event_id) DO NOTHING");
    expect(catat).toContain("return n == 1, nil");
    expect(kodeRepo).toContain("Kunci utama event_id adalah penahan event ganda");
    expect(kodeTx).toContain("return tx.Commit()");
    expect(kodeTx).toContain("defer tx.Rollback()");
  });
  test("kode api-t4: webhookAman satu transaction, status maju, jumlah kredit dari order, key ledger = order_id selama 24 jam", () => {
    const aman = fungsi(kodeService, "func (s Service) webhookAman(");
    expect((aman.match(/DalamTx\(/g) ?? []).length).toBe(1);
    for (const f of ["tx.CatatEvent(ctx, k.EventID, k.Status)", "tx.TopupBankUntukUbah(ctx, k.OrderID)", "s.terapkanStatus(ctx, tx, tp, statusGateway[k.Status], k.Jumlah)", "tx.SelesaiEvent("]) expect(aman, f).toContain(f);
    expect(aman.indexOf("tx.CatatEvent(")).toBeLessThan(aman.indexOf("tx.TopupBankUntukUbah("));
    expect(aman.indexOf("tx.TopupBankUntukUbah(")).toBeLessThan(aman.indexOf("s.terapkanStatus("));
    expect(aman.indexOf("s.terapkanStatus(")).toBeLessThan(aman.lastIndexOf("tx.SelesaiEvent("));
    expect(aman.indexOf("\n\t})")).toBeGreaterThan(0);
    expect(aman.indexOf("s.CekTopup(ctx, topupID)")).toBeGreaterThan(aman.indexOf("\n\t})"));
    expect(aman).toContain('h = HasilWebhook{Hasil: "ganda"}');
    expect(aman).toContain("ROLLBACK: event tidak tercatat, jadi kiriman ulang dari gateway diproses penuh");
    expect(aman).toContain('if h.Hasil == "diparkir" && topupID != 0');
    const terapkan = fungsi(kodeService, "func (s Service) terapkanStatus(");
    expect(terapkan).toContain('return "diparkir", nil, nil // mundur dari status akhir');
    expect(terapkan).toContain("case target == cur:");
    expect(terapkan).toContain("case jumlahGateway != tp.Jumlah:");
    expect(terapkan).toContain('return "ditolak", nil, nil');
    expect(terapkan).toContain("return s.kreditTopup(ctx, tx, tp)");
    expect(terapkan).toContain('belumAkhir := cur == "menunggu" || cur == "tidak_pasti"');
    const kredit = fungsi(kodeService, "func (s Service) kreditTopup(");
    expect(kredit).toContain("tx.KunciLedger(ctx, tp.OrderID, tp.AkunID, hashPermintaan(tp.OrderID, tp.Jumlah), kini, kini.Add(24*time.Hour))");
    expect(kredit).toContain("{BukuID: bank, Jumlah: -tp.Jumlah}, {BukuID: b.ID, Jumlah: tp.Jumlah}");
    expect(kredit).not.toContain("jumlahGateway");
    expect(kredit).not.toContain("DalamTx(");
    const cek = fungsi(kodeService, "func (s Service) CekTopup(");
    expect(cek).toContain('if tp.Status != "menunggu" && tp.Status != "tidak_pasti" {');
    expect(cek.indexOf("s.t4.Gateway.Status(")).toBeLessThan(cek.indexOf("s.repo.DalamTx("));
    const v1 = fungsi(kodeService, "func (s Service) webhookV1(");
    expect(v1).not.toContain("CatatEvent");
    expect(fungsi(kodeService, "func (s Service) kreditV1(")).toContain("Jumlah: -jumlah");
    const cekTulis = fungsi(kodeService, "func (s Service) webhookCekTulis(");
    expect(cekTulis.indexOf("s.repo.TopupBankLewatOrder(")).toBeLessThan(cekTulis.indexOf("s.repo.DalamTx("));
    expect(cekTulis).not.toContain("CatatEvent");
  });
});

describe("webhook-masuk.mdx: tiap angka turunan dari rekaman, kode, dan naskah", () => {
  test("Inti dan Rantai", () => {
    harus("Kabar diperiksa tanda tangannya, dicatat satu kali, dan tidak memundurkan status.");
    harus(`handler versi pertama menerima event \`${eventId}\` dua kali dan menulis dua jurnal. Saldo Budi naik ${rp(saldoNaik)} untuk ${rp(bayar)} yang dibayar.`);
    harus(`handler versi ADR 34 menjawab \`${hasilB2}\` untuk kiriman kedua, dan jurnalnya satu.`);
    harus("kabar `pending` yang datang sesudah `settlement` dijawab `200 diparkir`, dan status tetap `dibayar`.");
    harus(`Isi yang diubah atau timestamp ${detikLalu("lalu")[1]} detik lalu dijawab \`401\` (\`tandatangan.txt\` bagian B).`);
    const simpul = rantai.baris.map((b) => [b.label, b.sub, b.simpul.map((s) => [s.teks, s.sub])]);
    expect(simpul).toEqual([
      ["Event ganda", rp(bayar), [["versi pertama: 2 jurnal", `saldo +${rp(saldoNaik)}`], ["ADR 34: 200 ganda", "event_id sudah ada"], ["1 jurnal", rp(bayar)]]],
      ["Kabar mundur", "status dibayar", [["versi pertama: mundur", "status menunggu"], ["ADR 34: 200 diparkir", "gateway tidak ditanya"], ["tetap dibayar", "tanpa jurnal kedua"]]],
    ]);
    expect(hasilB2).toBe("200 ganda");
    expect(rantai.sumber.teks).toBe("Rekaman lab t4-webhook dan api-t4");
    expect(rantai.judul).toBe("Kiriman ganda dan kabar mundur");
    expect(rantai.baris.map((b) => b.simpul.map((s) => (s as { nada?: string }).nada ?? "biasa"))).toEqual([["warn", "biasa", "good"], ["warn", "biasa", "good"]]);
    expect(rantai.id).toBe("t4-webhook-masuk-inti");
    expect(rantai.sumber.jenis).toBe("rekaman");
    expect(rantai.catatan).toBe("Gateway adalah tiruan lokal di lab. Versi pertama dan versi ADR 34 adalah dua handler di api-t4, dan kiriman ulang di rekaman adalah perintah skrip lab, bukan jadwal gateway.");
  });

  test("Coba: delapan langkah, dua versi, tiga label turunan didefinisikan sebelum widget, dan ubah satu hal", () => {
    harus("Widget ini memutar satu top-up Rp200.000 lewat delapan langkah, dengan dua versi handler.");
    expect(rp(bayar)).toBe("Rp200.000");
    const wj = JSON.parse(baca("situs/data/widget/t4-webhook-langkah.json")) as { langkah: { judul: string }[]; modeJudul: string; mode: Record<string, string> };
    expect(wj.langkah).toHaveLength(8);
    expect(wj.langkah[2]!.judul).toBe("Kiriman ulang: event yang sama");
    expect(wj.modeJudul).toBe("Versi handler");
    expect(Object.keys(wj.mode)).toEqual(["pertama", "adr34"]);
    harus("**Ubah satu hal:** di bilah atas, ganti Versi handler ke versi ADR 34. Pada langkah Kiriman ulang, jurnal tetap satu dan jawabannya `200 ganda`.");
    harus("Ganti lagi ke versi pertama: jurnal menjadi dua, dan kabar `pending` memundurkan status ke `menunggu`.");
    const arti = halaman.indexOf("Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini.");
    expect(arti).toBeGreaterThan(0);
    expect(arti).toBeLessThan(halaman.indexOf("<WebhookLangkah />"));
    expect(halaman.slice(0, arti)).not.toContain("Hitungan");
    expect(halaman.slice(0, arti)).not.toContain("Ilustrasi");
    harus("Asumsi adalah angka pilihan penulis tanpa rekaman, dan Ilustrasi adalah skenario yang bukan hasil sistem.");
    harus("Tidak dijalankan berarti dicek ke kode atau dokumentasi, tanpa menjalankannya.");
    expect(halaman).not.toContain("Simulasi");
    expect(wj.mode.pertama).toBe("Versi pertama");
  });

  test("Tanda tangan: byte, usia kiriman, toleransi, tiga gaya sama dengan tandatangan.txt", () => {
    harus(`gateway tiruan menandatangani body berindentasi sebesar ${byteBody} byte dengan ${barisBaru} baris baru.`);
    harus(`Kiriman ${detikLalu("lalu")[0]} detik lalu diproses, sedangkan ${detikLalu("lalu")[1]} detik lalu dan ${detikLalu("di depan")[0]} detik di depan dijawab \`401\` (bagian B).`);
    harus(`Toleransi ${toleransiMenit} menit (${toleransiMenit * 60} detik) adalah Asumsi untuk tiruan, yang mengikuti bawaan library satu gateway nyata.`);
    harus("Isi yang diubah sesudah ditandatangani juga dijawab `401`, tanpa menulis event dan tanpa menjurnal.");
    harus("Perbandingan memakai `hmac.Equal`, yang menurut dokumentasi Go tidak membocorkan informasi lewat waktu");
    const t = tabel("| Kejadian | Gaya 1: HMAC dan timestamp |", 4);
    expect(t.map((x) => x.slice(1))).toEqual(gayaBaris.map((x) => x.slice(1)));
    expect(t.map((x) => rapi(x[0]!))).toEqual(gayaBaris.map((x) => x[0]));
    harus("Sumber tabel: `tandatangan.txt` bagian D, Rekaman lab untuk gaya 1 dan pembanding murni untuk gaya 2 dan 3.");
    harus("Gaya 1 menolak kiriman 6 menit tetapi menerima kiriman 60 detik. Jadi yang menahan kiriman yang diputar ulang di dalam toleransi bukan tanda tangan, melainkan `event_id`.");
    harus("Tiga gaya tanda tangan dibandingkan di lab: gaya 1 dijalankan api-t4, sedangkan gaya 2 dan gaya 3 hanya fungsi pembanding di skrip lab. Bentuk gaya 3 [perlu verifikasi]");
    harus("Fungsi pembanding itu ada di skrip lab, bukan di handler api-t4.");
  });

  test("Event dicatat satu kali: jurnal 10201 dan 10202, 200 ganda, dua kiriman bersamaan, jeda lab", () => {
    harus(`handler versi pertama tidak punya tabel itu, jadi kiriman kedua menulis jurnal ${jurnalGanda[1]![0]} sesudah jurnal ${jurnalGanda[0]![0]}.`);
    harus(`Kiriman kedua dengan \`event_id\` yang sama dijawab \`${hasilB2}\`, dan \`webhook_event\` berisi satu baris.`);
    harus("Kiriman ulang di rekaman itu adalah perintah skrip lab, bukan jadwal gateway.");
    harus(`Jeda ${jedaMs} milidetik di antara cek dan tulis ada di lab supaya celahnya terekam, dan lebar celah tanpa jeda tidak diukur.`);
    harus(`Hasilnya dua jurnal.`);
    expect(jurnalSerentak).toBe(2);
    harus(`menghasilkan satu \`${serentakB1[1]}\` dan satu \`${serentakB1[2]}\`, walau status top-up dan Idempotency-Key ledger dimatikan.`);
    harus(`menghasilkan dua \`${serentakB2[1]}\`.`);
    harus("Dokumentasi Stripe menulis bahwa kadang dua objek Event dikirim untuk satu kejadian.");
  });

  test("Status hanya maju: ditanya 0 dan 1 kali, tiga lapis, tabel urutan.txt G, key 24 jam", () => {
    harus(`dijawab \`200 diparkir\`, status tetap \`dibayar\`, dan gateway ditanya ${ditanyaF1} kali.`);
    harus(`membuat gateway ditanya ${ditanyaF2} kali di luar transaction, dan kreditnya tetap ditolak.`);
    harus("Kabar `settlement` sesudah `expire` diparkir, status tetap `kedaluwarsa`, dan tidak ada jurnal; di lab ini hanya rekonsiliasi harian yang menemukan uang itu ([[t4-rekonsiliasi]]).");
    harus(`Key itu hidup ${umurKeyJam} jam. Di \`urutan.txt\` bagian G, jam service diputar 25 jam:`);
    const t = tabel("| Kasus | Event kedua datang |", 4);
    expect(t.map((x) => x.map(rapi))).toEqual(barisG.map((x) => x.map(rapi)));
    harus("Sesudah 24 jam hanya status top-up yang menahan jurnal kedua. Kasus 4 memerankan keadaan itu dengan mematikan lapis status.");
    harus("Sumber tabel: `urutan.txt` bagian G, Rekaman lab.");
  });

  test("Balasan sesudah COMMIT dan koneksi: kalimat mekanisme diturunkan dari kode, tabel L dari retry.txt D", () => {
    harus("Fungsi itu mengembalikan hasil sesudah `DalamTx` selesai, yaitu sesudah COMMIT.");
    expect(kodeTx.indexOf("return tx.Commit()")).toBeGreaterThan(kodeTx.indexOf("if err := fn(Tx{tx}); err != nil"));
    harus("Pemanggilan ke gateway untuk kabar yang diparkir terjadi sesudah COMMIT, jadi tidak ada panggilan jaringan di dalam transaction yang memegang lock.");
    harus(`Jawaban 2xx menghasilkan ${kodeKiriman[0]![1]} kiriman, ${kodeKiriman[1]![0]} dan ${kodeKiriman[2]![0]} menghasilkan ${kodeKiriman[1]![1]}, ${kodeKiriman[3]![0]} menghasilkan ${kodeKiriman[3]![1]}, ${kodeKiriman[4]![0]} menghasilkan ${kodeKiriman[4]![1]}, dan ${kodeKiriman[5]![0]} serta ${kodeKiriman[6]![0]} menghasilkan ${kodeKiriman[5]![1]}.`);
    harus(`dengan jeda ${jedaMenit.slice(0, -1).join(", ")}, dan ${jedaMenit[jedaMenit.length - 1]} menit antar percobaan. Totalnya ${totalMenit} menit (Hitungan: ${jedaMenit.join(" + ")}).`);
    harus(`Puncak top-up adalah ${titik(20000 * 0.25)} per hari ÷ ${titik(86400)} × ${lPuncak[4]} = ${lPuncak[5]} per detik.`);
    harus(`Angka itu Asumsi: ${lPuncak[2]} top-up per user aktif per hari, ${lPuncak[1]} user aktif, dan faktor puncak ${lPuncak[4]}.`);
    harus(`λ menjadi ${lBatas[1]} × ${lPuncak[5]} = ${lBatas[4]} per detik (Hitungan).`);
    const t = tabel("| W | λ = 0,579 | λ = 3,47 |", 3);
    expect(t).toEqual([["5 detik", `L = ${lPuncakW5[2]} koneksi`, `L = ${lW5[2]} koneksi`]]);
    expect(lPuncak[5]).toBe("0,579");
    expect(lBatas[4]).toBe("3,47");
    harus(`Pool pembayaran ${poolPenuh[1]} koneksi (Asumsi) penuh sejak W > ${poolPenuh[2]} ÷ ${lBatas[4]} = ${poolPenuh[4]} detik pada badai ulang. Pada laju puncak ${lPuncakW5[1]} per detik, W = 5 detik memakai ${lPuncakW5[2]} koneksi.`);
    harus("Sumber tabel: `retry.txt` bagian D, Hitungan atas Asumsi dan Tidak dijalankan, karena lab tidak menahan koneksi 5 detik per kabar.");
    harus("L = λ × W adalah rata-rata koneksi terpakai ([[t3-pool]] membahas rumusnya).");
    expect(naskah).toContain("pool penuh sejak W > 9 ÷ 3,47 = ±2,6 detik");
  });

  test("ADR 34: tabel opsi, tujuh aturan, bentuk kedua, kapan salah dengan angka, pre-mortem, kasus industri", () => {
    harus("| | A. Cek-lalu-tulis tanpa tabel event | B. Balas 2xx dulu, lalu antre ke worker | C. Token statis tanpa timestamp | D. HMAC atas byte mentah, event_id unik, status hanya maju |");
    const adr = tabel("| | A. Cek-lalu-tulis tanpa tabel event |", 5);
    expect(adr.map((x) => x[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    expect(adr[4]![1]).toBe("Rekaman lab `ganda-serentak.txt` A: dua jurnal");
    expect(adr[4]![3]).toBe("Rekaman lab `tandatangan.txt` D, kolom gaya 3: isi diubah dan kiriman 6 menit diterima");
    expect(adr[4]![4]).toBe("Rekaman lab `ganda.txt` B, `ganda-serentak.txt` B, `urutan.txt` F dan G, `tandatangan.txt` B");
    expect(adr[4]![2]).toContain(`\`retry.txt\` A: 2xx adalah ${kodeKiriman[0]![1]} kiriman`);
    const aturan = halaman.slice(halaman.indexOf("**Keputusan: opsi D.**"), halaman.indexOf("Bentuk kedua aturan 7")).split("\n").filter((b) => /^\d+\. /.test(b));
    expect(aturan).toHaveLength(7);
    expect(aturan.map((b) => b.match(/^(\d+)\./)![1])).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    harus("Tujuh aturan:");
    harus(`Timestamp lebih dari ${toleransiMenit} menit dari jam service ditolak \`401\` (Asumsi untuk tiruan: bawaan library satu gateway nyata).`);
    harus("2. `webhook_event.event_id` adalah kunci utama, diisi lewat `INSERT ... ON CONFLICT DO NOTHING`. Nol baris berarti ganda: balas `200` tanpa jurnal.");
    harus("5. Jumlah kredit datang dari order milik Rekeningo, bukan dari isi kabar. Kabar dengan jumlah berbeda dijawab `ditolak` (dibaca dari kode `terapkanStatus`, tidak direkam untuk versi ADR).");
    harus("6. Idempotency-Key ke ledger adalah `order_id`: satu jurnal per top-up, lewat webhook atau job cek status ([[t4-rekonsiliasi]]). `event_id` hanya kunci `webhook_event`.");
    harus("Bentuk kedua aturan 7 terekam di `labs/t4-modul` `proses-mati.txt` bagian A.");
    harus("Saat itu ledger punya 1 jurnal, `topup_bank` masih `menunggu`, dan `webhook_event` kosong. Gateway mengirim ulang event yang sama, dijawab `200 diproses`, dan jurnalnya tetap satu.");
    harus(`Di \`proses-mati.txt\` bagian C, kiriman ulang pada +23 jam menghasilkan ${tabelC[0]![0]} jurnal, dan pada +25 jam ${tabelC[1]![0]} jurnal: saldo naik dua kali.`);
    harus(`Kueri yang sama dengan \`RekonHarian\` memberi ${titik(Number(hasilKurang[1]))} yang dibaca lawan ${titik(Number(hasilKurang[2]))} yang dikreditkan, jadi jurnal kedua itu tidak menjadi insiden.`);
    harus("Gateway mengulang lebih lama dari umur Idempotency-Key. Jadwal tiruan berhenti di 342 menit, tetapi dokumentasi Stripe menulis tiga hari.");
    harus("Bila semua kiriman gagal, λ naik ke 3,47 per detik dan pool penuh sejak W > 2,6 detik.");
    harus("Saat pemrosesan satu kabar melebihi 5 detik, yaitu sepertiga dari 15 detik batas tunggu satu gateway nyata.");
    expect(15 / 3).toBe(5);
    harus(`Pada batas atas ${lBatas[4]} per detik, L = ${lW5[2]} melewati pool ${poolPenuh[1]} (Hitungan, Asumsi).`);
    harus("yang baru bekerja sesudah 30 menit (Asumsi lab)");
    expect(baca("labs/t4-webhook/README.md")).toContain("umur cek status 30 menit");
    harus("Dokumentasi yang sama menyarankan membalas 2xx sebelum logika yang berat dan memproses kabar lewat queue asinkron.");
    harus("Saat gateway mengulang lebih lama dari 24 jam, umur Idempotency-Key ([[t2-idempotency]]).");
    expect(naskah).toContain("Bila gateway mengulang lebih lama dari 24 jam (umur Idempotency-Key, ADR 14; satu gateway nyata sampai 3 hari, R4-08)");
    expect(naskah).toContain("Bila pemrosesan satu kabar melebihi 5 detik (sepertiga dari timeout 15 detik satu gateway nyata, R4-08)");
    expect(naskah).toContain("Idempotency-Key ke ledger = `order_id`");
    expect(naskah).toContain("toleransi waktu 5 menit");
  });

  test("Sengaja belum dilakukan: empat baris, tiga kolom, dan kutipan Stripe", () => {
    const t = tabel("| Yang ditunda | Kenapa ditunda | Muncul lagi di |", 3);
    expect(t.map((x) => x[0])).toEqual(["Queue pemrosesan kabar", "Daftar IP pengirim", "Pembersihan `webhook_event`", "Jalur pengembalian dana untuk top-up yang tertahan"]);
    expect(t.map((x) => x[2])).toEqual(["Belum dijadwalkan", "Belum dijadwalkan", "Belum dijadwalkan", "[[t4-rekonsiliasi]]"]);
    expect(t[0]![1]).toBe("Pada laju puncak, satu kabar 5 detik memakai 2,9 koneksi dari 10 (Hitungan). Dipasang bila satu kabar melewati 5 detik");
    expect(baca("labs/t4-webhook/README.md")).toContain("retensi `webhook_event` 30 hari: tidak ada");
    expect(baca("labs/t4-webhook/README.md")).toContain("Pengembalian dana untuk top-up yang tertahan");
    expect(riset).toContain('"IP allowlisting" disebut bersama tanda tangan sebagai "both of these protections"');
  });

  test("Cek diri: empat jawaban memakai angka rekaman", () => {
    harus(`Handler versi pertama menulis dua jurnal, ${jurnalGanda[0]![0]} dan ${jurnalGanda[1]![0]}, dan saldo Budi naik ${rp(saldoNaik)}. Handler ADR 34 menjawab \`${hasilB2}\` untuk kiriman kedua, dan jurnalnya satu (\`ganda.txt\` bagian A dan B).`);
    harus(`body berindentasi ${byteBody} byte cocok bila dihitung atas byte mentah, dan tidak cocok bila diurai lalu ditulis ulang.`);
    harus(`Kabar dijawab \`200 diparkir\`, status tetap \`dibayar\`, dan gateway ditanya ${ditanyaF1} kali.`);
    harus("Tanpa lapis status, event kedua diproses dan jurnalnya dua (`urutan.txt` bagian G, kasus 4).");
    const kartu = halaman.slice(halaman.indexOf("### Cek diri"), halaman.indexOf("### Saat me-review kode AI"));
    expect((kartu.match(/<details class="success">/g) ?? []).length).toBe(4);
    expect((kartu.match(/^\*\*\d\.\*\* /gm) ?? []).length).toBe(4);
    const daftar = halaman.slice(halaman.indexOf("### Saat me-review kode AI"), halaman.indexOf("### Bacaan lanjut")).split("\n").filter((b) => b.startsWith("- [ ] "));
    expect(daftar).toHaveLength(6);
  });

  test("setiap angka besar, kode status, dan tautan di prosa berasal dari sumber", () => {
    const prosa = halaman
      .replace(/^---[\s\S]*?^---/m, "")
      .replace(/\d{4}-\d{2}-\d{2}/g, "")
      .replace(/\]\(https?:[^)]+\)/g, "]")
      .replace(/<Snippet [^>]+\/>/g, "")
      .replace(/<Snippet lang="[a-z]+" code=\{`(?:[^`\\]|\\.)+`\} \/>/g, "")
      .replace(/<TabSet[^>]*>/g, "");
    const sah = new Set<string>([
      rp(bayar), rp(saldoNaik), String(jurnalGanda[0]![0]), String(jurnalGanda[1]![0]), String(byteBody), String(detikLalu("lalu")[0]), String(detikLalu("lalu")[1]),
      String(toleransiMenit * 60), "200", "401", "400", "404", "500", "503", "502", "342", titik(20000), titik(5000), titik(86400), lPuncak[5]!, lBatas[4]!, lW5[2]!, lPuncakW5[2]!, poolPenuh[4]!,
      titik(Number(hasilKurang[1])), titik(Number(hasilKurang[2])), String(jedaMs), "0,25", "1.27.3", "13", "109", "64", "26", "10", "30", "25", "24", "23", "240", "360", "60", "512", ...jedaMenit.map(String),
    ]);
    for (const m of prosa.matchAll(/Rp[\d.]+|\d{1,3}(?:\.\d{3})+|\d+,\d+|\b\d{3,}\b/g)) {
      const token = m[0].replace(/[.,]$/, "");
      expect(sah.has(token), `angka ${token} di halaman tidak diturunkan dari sumber (konteks: ${prosa.slice(Math.max(0, m.index! - 40), m.index! + 30).replace(/\n/g, " ")})`).toBe(true);
    }
  });
});

describe("tab stack, tanggal dibuka, tautan, dan baris RISET R4-140 sampai R4-144", () => {
  const baris = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
  test("enam tab berlabel, Go dijalankan dan lima lainnya Tidak dijalankan, kode tab berlabel Ilustrasi", () => {
    harus('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    const tab = halaman.split(/<Fragment slot="t(\d)">/).slice(1);
    expect(tab.filter((_, i) => i % 2 === 0)).toEqual(["0", "1", "2", "3", "4", "5"]);
    const isi = tab.filter((_, i) => i % 2 === 1);
    expect(isi).toHaveLength(6);
    expect(isi[0]).toContain("*Dijalankan: lab api-t4 dan t4-webhook, PostgreSQL 17.11 dan Go 1.27.1");
    for (const i of [1, 2, 3, 4, 5]) expect(isi[i]!, `tab ${i}`).toContain("*Tidak dijalankan.");
    for (const i of [1, 2, 3, 5]) expect(isi[i]!, `tab ${i}`).toContain("Kode di bawah adalah Ilustrasi.");
    expect(isi[4]).not.toContain("<Snippet");
    expect((halaman.match(/\*\*Yang berbeda di stack ini:\*\*/g) ?? []).length).toBe(6);
    expect(halaman).not.toMatch(/Yang sama di semua stack/);
    expect(riset).toContain("Version 4.0.0");
    expect(rentangFungsi(kodeHandler, "func (s Server) webhookPembayaran")).toMatch(/^\d+:\d+$/);
  });
  test("tanggal dibuka dan baris RISET memuat kutipan sumber yang dipakai halaman", () => {
    const tanggal = new Set([...halaman.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]));
    expect([...tanggal]).toEqual(["2026-10-29"]);
    harus("hanya dicek ke dokumentasi pada 2026-10-29");
    for (const id of ["R4-140", "R4-141", "R4-142", "R4-143", "R4-144"]) {
      expect(baris(id), id).not.toBe("");
      expect(baris(id), id).toContain("dibuka 2026-10-29");
    }
    const urutBaris = riset.split("\n").filter((b) => /^\| R4-\d+ \|/.test(b)).map((b) => Number(b.match(/^\| R4-(\d+) /)![1]));
    expect(urutBaris).toEqual([...urutBaris].sort((a, b) => a - b));
    expect(new Set(urutBaris).size).toBe(urutBaris.length);
    expect(baris("R4-140")).toContain('"Our libraries have a default tolerance of 5 minutes"');
    expect(baris("R4-140")).toContain('"Stripe requires the raw body of the request to perform signature verification"');
    expect(baris("R4-140")).toContain("500 \"Retry only once\"");
    expect(baris("R4-140")).toContain("503 \"Retry four times\"");
    expect(baris("R4-140")).toContain("jeda 2, 10, 30, 90, 210 menit");
    expect(baris("R4-140")).toContain('"Equal compares two MACs for equality without leaking timing information"');
    expect(baris("R4-140")).toContain("Go 1.27.3, 2026-10-20; lab memakai go1.27.1");
    harus("halaman Go 1.27.3 sedangkan lab memakai Go 1.27.1, dibuka 2026-10-29");
    expect(tanda).toContain("go1.27.1");
    expect(baris("R4-141")).toContain("Express 5.x");
    expect(baris("R4-141")).toContain('"parses all bodies as a `Buffer`"');
    expect(baris("R4-141")).toContain("`application/octet-stream`");
    expect(baris("R4-142")).toContain("Laravel 13.x");
    expect(baris("R4-142")).toContain("`preventRequestForgery(except: [...])`");
    expect(baris("R4-142")).toContain("tidak membahas pembacaan body mentah");
    expect(baris("R4-142")).toContain("Django 6.1");
    expect(baris("R4-142")).toContain('"The raw HTTP request body as a bytestring"');
    expect(baris("R4-142")).toContain("`RawPostDataException`");
    expect(baris("R4-143")).toContain("Version 4.0.0");
    expect(baris("R4-143")).toContain('"The body can only be read once. Attempting to read it again will throw a `StateError`"');
    expect(baris("R4-144")).toContain("`const body = await req.text()`");
    expect(baris("R4-144")).toContain("verify_jwt = false");
    expect(baris("R4-144")).toContain("verification relies on the raw request body rather than the parsed JSON");
  });
  test("tautan eksternal dan istilah HMAC", () => {
    const url = [...halaman.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((m) => m[1]!);
    expect([...new Set(url)].sort()).toEqual([
      "https://docs.djangoproject.com/en/6.1/ref/csrf/",
      "https://docs.djangoproject.com/en/6.1/ref/request-response/",
      "https://docs.midtrans.com/docs/https-notification-webhooks",
      "https://docs.serverpod.dev/concepts/web-server/request-data",
      "https://docs.stripe.com/webhooks",
      "https://expressjs.com/en/5x/api/express/",
      "https://github.com/supabase/supabase/blob/master/examples/edge-functions/supabase/functions/stripe-webhooks/index.ts",
      "https://laravel.com/docs/13.x/csrf",
      "https://laravel.com/docs/13.x/requests",
      "https://pkg.go.dev/crypto/hmac",
    ].sort());
    const jejak: Record<string, string> = {
      "https://docs.djangoproject.com/en/6.1/ref/csrf/": "docs.djangoproject.com/en/6.1/ref/csrf/",
      "https://docs.djangoproject.com/en/6.1/ref/request-response/": "docs.djangoproject.com/en/6.1/ref/request-response/",
      "https://docs.midtrans.com/docs/https-notification-webhooks": "docs.midtrans.com/docs/https-notification-webhooks",
      "https://docs.serverpod.dev/concepts/web-server/request-data": "docs.serverpod.dev/concepts/web-server/request-data",
      "https://docs.stripe.com/webhooks": "docs.stripe.com/webhooks",
      "https://expressjs.com/en/5x/api/express/": "expressjs.com/en/5x/api/express/",
      "https://github.com/supabase/supabase/blob/master/examples/edge-functions/supabase/functions/stripe-webhooks/index.ts": "supabase/supabase/master/examples/edge-functions/supabase/functions/stripe-webhooks/index.ts",
      "https://laravel.com/docs/13.x/csrf": "laravel.com/docs/13.x/csrf",
      "https://laravel.com/docs/13.x/requests": "laravel.com/docs/13.x/requests",
      "https://pkg.go.dev/crypto/hmac": "pkg.go.dev crypto/hmac",
    };
    for (const u of new Set(url)) expect(riset, `RISET tidak menyebut ${u}`).toContain(jejak[u]!);
    expect(halaman).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(halaman).not.toMatch(/keputusan \d{3,4}/);
    expect(JSON.stringify(rantai)).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}/);
    expect(istilahHmac.istilah).toBe("HMAC (hash-based message authentication code)");
    expect(istilahHmac.sumber.map((s) => s.url ?? s.rekaman)).toEqual(["https://docs.stripe.com/webhooks", "https://pkg.go.dev/crypto/hmac", "labs/t4-webhook/output/tandatangan.txt"]);
    expect(istilahHmac.sumber.filter((s) => s.riset).map((s) => s.riset)).toEqual(["R4-140", "R4-140"]);
    expect(istilahHmac.cerita).toHaveLength(1);
    expect(istilahHmac.cerita[0]!.rujukan).toBe("t4-webhook");
    expect(istilahHmac.cerita[0]!.teks).toContain(`body berindentasi ${byteBody} byte cocok`);
    expect(istilahHmac.terkait).toEqual(["Signature", "Webhook", "Idempotency key"]);
    for (const t of istilahHmac.terkait) expect(glosarium, t).toContain(`| **${t}** |`);
    expect(glosarium).toContain("| **HMAC** (hash-based message authentication code) | Nilai yang dihitung dari isi pesan dan rahasia bersama, supaya penerima bisa memeriksa bahwa pesan tidak diubah dan berasal dari pemegang rahasia. | [[t4-webhook]] |");
    expect(glosarium).toContain("| **Webhook** | HTTP request yang dikirim sistem lain ke API kita saat ada kejadian, mis. pembayaran berhasil. | [[t4-webhook]] |");
    expect(JSON.stringify(istilahHmac)).not.toMatch(/keputusan \d{3,4}/);
  });
});

describe("rentang Snippet diturunkan dari rekaman dan kode, bukan angka tangan", () => {
  const props = [...halaman.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!.trim()).filter((p) => /^(file|region)=/.test(p) || p.startsWith("file="));
  test("daftar Snippet dan rentangnya", () => {
    const diharapkan = [
      `file="labs/api-t4/internal/service/pembayaran.go" lines="${rentangFungsi(kodeService, "func TandaTangan(")}" lang="go" title="labs/api-t4/internal/service/pembayaran.go"`,
      `file="labs/t4-webhook/output/tandatangan.txt" lines="${bagian(T, "A").awal + 1}:${bagian(T, "B").awal - 2}" title="Rekaman lab: labs/t4-webhook/output/tandatangan.txt (bagian A)"`,
      `file="labs/api-t4/internal/repo/pembayaran.go" lines="${rentangFungsi(kodeRepo, "func (t Tx) CatatEvent(")}" lang="go" title="labs/api-t4/internal/repo/pembayaran.go"`,
      `file="labs/t4-webhook/output/ganda.txt" lines="${bagian(G, "A").awal + 1}:${bagian(G, "B").awal - 2}" title="Rekaman lab: labs/t4-webhook/output/ganda.txt (bagian A)"`,
      `file="labs/api-t4/internal/service/pembayaran.go" region="terapkan-status" lang="go" title="labs/api-t4/internal/service/pembayaran.go"`,
      `file="labs/api-t4/internal/service/pembayaran.go" lines="${rentangFungsi(kodeService, "func (s Service) webhookAman(")}" lang="go" title="labs/api-t4/internal/service/pembayaran.go"`,
      `file="labs/t4-webhook/output/retry.txt" lines="${bagian(R, "A").awal + 1}:${noBaris(retry, "(7 rows)", bagian(R, "A").awal)}" title="Rekaman lab: labs/t4-webhook/output/retry.txt (bagian A)"`,
      `file="labs/api-t4/internal/handler/handler_pembayaran.go" region="webhook" lang="go" title="labs/api-t4/internal/handler/handler_pembayaran.go"`,
    ];
    expect(props).toEqual(diharapkan);
    for (const p of props) for (const m of p.matchAll(/file="(labs\/[\w./-]+)"/g)) expect(fs.existsSync(path.join(akar, m[1]!)), m[1]).toBe(true);
    for (const r of ["terapkan-status"]) expect(kodeService).toContain(`--8<-- [start:${r}]`);
    expect(kodeHandler).toContain("--8<-- [start:webhook]");
    // Rekaman yang dikutip tidak menampilkan kepala rekaman (baris 1 sampai 4).
    expect(bagian(T, "A").awal).toBeGreaterThan(4);
    expect(bagian(G, "A").awal).toBeGreaterThan(4);
    expect(bagian(R, "A").awal).toBeGreaterThan(4);
  });
  test("kode di tab Node, Laravel, Django, dan Supabase adalah Ilustrasi yang cocok dengan dokumentasi yang dikutip", () => {
    const kode = [...halaman.matchAll(/<Snippet lang="(\w+)" code=\{`((?:[^`\\]|\\.)+)`\} \/>/g)].map((m) => [m[1]!, m[2]!]);
    expect(kode.map((k) => k[0])).toEqual(["js", "php", "python", "ts"]);
    expect(kode[0]![1]).toContain('express.raw({ type: "application/json" })');
    expect(kode[0]![1]).toContain("const mentah = req.body; // Buffer, atau undefined bila Content-Type tidak cocok");
    expect(kode[1]![1]).toContain("$middleware->preventRequestForgery(except: [");
    expect(kode[2]![1]).toContain("@csrf_exempt");
    expect(kode[2]![1]).toContain("mentah = request.body");
    expect(kode[3]![1]).toContain("const body = await req.text();");
    expect(kode[3]![1]).toContain('req.headers.get("Stripe-Signature")');
  });
});

describe("rujukan [[ID]] dan registry", () => {
  const entri = (id: string) => (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; path?: string; adr?: number[]; peran?: string[]; menit?: number }[]).find((h) => h.id === id);
  test("halaman 4.7 terdaftar sebagai Konsep bagian 4 ★ dengan lab t4-webhook, ADR 34, dan prasyarat M29", () => {
    const h = entri("t4-webhook")!;
    expect(h.ada).toBe(true);
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.lab, h.prasyarat, h.adr, h.peran]).toEqual(["4.7", "konsep", 4, true, ["t4-webhook"], ["t4-m29"], [34], ["security", "backend"]]);
    expect(h.judul).toBe("Webhook masuk: tanda tangan, event ganda, urutan + ADR 34");
    expect(h.path).toBe("tahap-4/webhook-masuk.md");
    expect(h.menit).toBe(21);
    expect(halaman).toContain(`title: "4.7 ${h.judul}"`);
    expect(halaman).toContain('<p class="meta">Baca 17 menit · coba 4 menit · Prasyarat: [[t4-m29]] · Jalur inti</p>');
    expect(17 + 4).toBe(h.menit);
    expect(naskah).toMatch(/\| 4\.7 \| 4 \| Webhook masuk: tanda tangan, event ganda, urutan \+ ADR 34 \| Konsep \+ ADR \| ★ \| t4-webhook \| W4-webhook \|/);
    expect(naskah).toContain("| 34 | Tanda tangan HMAC-SHA256 diperiksa atas byte mentah sebelum JSON diurai, dengan toleransi waktu 5 menit");
  });
  test("setiap [[ID]] ada di registry, bernama sesuai halamannya, berurutan, dan menempel pada kalimat yang menjelaskannya", () => {
    const semua = [...halaman.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!).filter((id) => id !== "berikutnya");
    expect([...halaman.matchAll(/\[\[berikutnya\]\]/g)]).toHaveLength(1);
    for (const id of new Set(semua)) expect(entri(id), `[[${id}]] tidak ada di registry`).toBeDefined();
    const peran: [string, string][] = [
      ["t4-m29", "m29"], ["t4-dua-arah", "dua arah"], ["t4-rekonsiliasi", "rekonsiliasi"], ["t4-m30", "m30"], ["t4-modul", "modular monolith"], ["t3-pool", "connection pool"], ["t2-idempotency", "idempotency"],
    ];
    for (const [id, kata] of peran) expect(entri(id)!.judul.toLowerCase(), id).toContain(kata);
    expect([...new Set(semua)].sort()).toEqual(peran.map((p) => p[0]).sort());
    for (const kalimat of [
      "Prasyarat: [[t4-m29]]",
      "[[t4-m29]] menunjukkan satu pembayaran Rp200.000 yang menjadi dua jurnal.",
      "[[t4-dua-arah]] menulis tiga hal yang harus selalu benar.",
      "di lab ini hanya rekonsiliasi harian yang menemukan uang itu ([[t4-rekonsiliasi]]).",
      "dan Idempotency-Key ledger sebesar `order_id` ([[t2-idempotency]]).",
      "Itu bahan [[t4-m30]].",
      "([[t3-pool]] membahas rumusnya)",
      "**Status:** diterima sesudah M29, dan dibaca ulang di [[t4-m30]] dan [[t4-rekonsiliasi]].",
      "lewat webhook atau job cek status ([[t4-rekonsiliasi]]).",
      "dan 2xx dibalas sesudah COMMIT ([[t4-modul]]).",
      "Saat gateway mengulang lebih lama dari 24 jam, umur Idempotency-Key ([[t2-idempotency]]).",
      "**Yang akan merevisinya.** [[t4-rekonsiliasi]] menambah job cek status dan rekonsiliasi harian di atas jalan kedua ini. [[t4-modul]] memecah service pembayaran dari ledger dan menjadikan bentuk kedua aturan 7 yang berlaku.",
      "| Jalur pengembalian dana untuk top-up yang tertahan | PRD v4 belum menjawabnya | [[t4-rekonsiliasi]] |",
    ]) harus(kalimat);
    const hitung = Object.fromEntries([...new Set(semua)].map((id) => [id, semua.filter((x) => x === id).length]));
    expect(hitung).toEqual({ "t4-m29": 2, "t4-dua-arah": 2, "t4-rekonsiliasi": 5, "t2-idempotency": 2, "t4-m30": 2, "t3-pool": 1, "t4-modul": 2 });
    expect(semua[0]).toBe("t4-m29");
  });
  test("tiap janji 'dibahas di' menunjuk halaman yang judulnya memuat topiknya", () => {
    expect(entri("t4-m29")!.judul).toBe("M29: Top-up Budi masuk dua kali");
    expect(entri("t4-m30")!.judul).toContain("Saldo Citra tidak naik");
    expect(entri("t4-rekonsiliasi")!.judul).toBe("Rekonsiliasi dengan gateway + ADR 35");
    expect(entri("t4-modul")!.judul).toContain("ADR 37");
    expect(entri("t4-dua-arah")!.judul).toContain("Dua arah ke pihak ketiga");
    expect(entri("t3-pool")!.judul).toContain("Little");
  });
});

describe("struktur: lima blok, heading, dan template", () => {
  test("lima blok berurutan dengan nama, bagian terbuka, dan teks aman", () => {
    const blok = [...halaman.matchAll(/<Blok ([^>]*)>/g)].map((m) => m[1]!);
    expect(blok).toEqual([
      'nama="Mulai" buka',
      'nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: kiriman yang sama menghasilkan satu jurnal bila event dicatat dengan kunci unik, dan kabar yang datang mundur tidak mengubah status."',
      'nama="Paham"',
      'nama="Putuskan"',
      'nama="Kunci"',
    ]);
    expect((halaman.match(/<\/Blok>/g) ?? []).length).toBe(5);
  });
  test("heading dan urutan komponen", () => {
    const heading = [...halaman.matchAll(/^(#{2,4}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(heading).toEqual([
      "## Inti",
      "### Kenapa ini ada",
      "### Cara kerjanya",
      "### Di stack lain",
      "### ADR 34: tanda tangan atas byte mentah, event satu kali, status hanya maju",
      "### Sengaja belum dilakukan",
      "### Cek diri",
      "### Saat me-review kode AI, cek ini",
      "### Bacaan lanjut",
    ]);
    const komponen = [...halaman.matchAll(/<(Rantai|WebhookLangkah|TabSet)\b([^>]*)>/g)].map((m) => `${m[1]}${m[2]}`.trim());
    expect(komponen).toEqual([
      "Rantai data={intiDiagram} ringkas /",
      "WebhookLangkah /",
      'TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}',
    ]);
    expect(halaman.indexOf("<Rantai")).toBeLessThan(halaman.indexOf("<WebhookLangkah"));
    expect((halaman.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect(halaman).not.toMatch(/<noscript/);
    const impor = [...halaman.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(impor).toEqual([
      "Blok ../../../components/Blok.astro",
      "Rantai ../../../components/Rantai.astro",
      "Snippet ../../../components/Snippet.astro",
      "TabSet ../../../components/TabSet.astro",
      "WebhookLangkah ../../../components/WebhookLangkah.astro",
      "intiDiagram ../../../../data/diagram/t4-webhook-masuk-inti.json",
    ]);
    expect(fs.existsSync(path.join(akar, "situs/src/components/WebhookLangkah.astro"))).toBe(true);
  });
  test("kata yang dilarang skill gaya-bahasa tidak muncul, dan label turunan didefinisikan di pemakaian pertama", () => {
    const prosa = halaman.replace(/<Snippet lang="[a-z]+" code=\{`(?:[^`\\]|\\.)+`\} \/>/g, "");
    expect(prosa).not.toMatch(/\b(mudah|cukup|tinggal)\b/i);
    expect(prosa).not.toMatch(/Anda|!/);
    expect(prosa).not.toMatch(/Ilustrasi mekanisme/);
    harus("Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini.");
    const pertamaHitungan = halaman.indexOf("Hitungan");
    expect(pertamaHitungan).toBe(halaman.indexOf("Hitungan adalah hasil rumus"));
    // Simbol λ, W, L didefinisikan di kalimat sebelum pemakaian pertamanya, dan tiap simbol punya satu arti.
    const defLambda = halaman.indexOf("λ adalah kiriman per detik, dan W adalah lama satu kabar memegang satu koneksi database.");
    expect(defLambda).toBeGreaterThan(0);
    expect(halaman.indexOf("λ")).toBe(defLambda);
    expect(halaman.indexOf("W = ")).toBeGreaterThan(defLambda);
    expect(halaman.indexOf("L = ")).toBeGreaterThan(defLambda - 5);
    // Kata bermakna khusus didefinisikan di pemakaian pertama: HMAC dan byte mentah.
    expect(halaman.indexOf("HMAC adalah nilai kriptografi dari data dan rahasia bersama")).toBeGreaterThan(0);
    expect(halaman.indexOf("Byte mentah adalah isi body persis seperti yang tiba, sebelum diurai menjadi JSON.")).toBeLessThan(halaman.indexOf("<details"));
    expect(halaman.indexOf("HMAC adalah nilai kriptografi") - halaman.indexOf("HMAC")).toBeLessThan(120);
  });
});

describe("kunci kalimat: teks halaman dan diagram terkunci per baris (lapis 2)", () => {
  const tekstual = (x: unknown, keluar: string[] = []): string[] => {
    if (typeof x === "string") keluar.push(x);
    else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
    else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
    return keluar;
  };
  const sekarang = {
    halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
    json: { rantai: tekstual(rantai), istilah: tekstual(istilahHmac) },
  };
  if (process.env.PERBARUI_KUNCI === "1") {
    const isi = `// Dihasilkan dari berkas saat ini oleh PERBARUI_KUNCI=1 (lihat webhook-masuk.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\nexport const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\nexport const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
    fs.writeFileSync(path.join(__dirname, "webhook-masuk.halaman.nilai.ts"), isi);
  }
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string diagram dan halaman istilah sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

// Penutup celah seri mutasi tanpa kunci baris: klaim mekanisme, label, dan "sidik kata penentu" (kunci agregat yang menangkap sisipan atau
// pembalikan kata penentu di mana pun, termasuk kalimat naratif yang tidak punya sumber angka). Nilai sidik dicatat dari halaman yang sudah
// dibaca dan dinilai benar kalimat demi kalimat terhadap sumbernya; mengubah teks berarti membaca ulang dan memperbaruinya.
describe("penutup celah mutasi tanpa kunci: klaim mekanisme, label, sumber, dan sidik kata penentu", () => {
  const sidik = (teks: string, kata: string[]): Record<string, number> =>
    Object.fromEntries(kata.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
  const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama"];
  const nilaiString = (x: unknown, keluar: string[] = []): string[] => {
    if (typeof x === "string") keluar.push(x);
    else if (Array.isArray(x)) for (const y of x) nilaiString(y, keluar);
    else if (x && typeof x === "object") for (const y of Object.values(x)) nilaiString(y, keluar);
    return keluar;
  };

  test("klaim label sumber: jumlah label per jenis, dan Asumsi tidak naik menjadi Rekaman lab", () => {
    harus("Sumber tabel: `tandatangan.txt` bagian D, Rekaman lab untuk gaya 1 dan pembanding murni untuk gaya 2 dan 3.");
    harus("Toleransi 5 menit (300 detik) adalah Asumsi untuk tiruan");
    harus("Jadwal itu Ilustrasi yang mengikuti dokumentasi satu gateway nyata, dengan waktu yang diperankan, bukan ditunggu.");
    harus("Jadwal tiruan berhenti di 342 menit");
    expect((halaman.match(/Rekaman lab/g) ?? []).length).toBe(RekamanLab);
    expect((halaman.match(/Tidak dijalankan/g) ?? []).length).toBe(TidakDijalankan);
    expect((halaman.match(/Asumsi/g) ?? []).length).toBe(JumlahAsumsi);
    expect((halaman.match(/Ilustrasi/g) ?? []).length).toBe(JumlahIlustrasi);
    expect((halaman.match(/\(Hitungan|, Hitungan\)|Hitungan atas|Hitungan adalah/g) ?? []).length).toBe(JumlahHitungan);
    expect((halaman.match(/\[perlu verifikasi\]/g) ?? []).length).toBe(3);
  });

  test("sidik kata penentu halaman dan Rantai (kunci agregat, bukan turunan)", () => {
    expect(sidik(halaman, KATA)).toEqual(SIDIK_HALAMAN);
    expect(sidik(nilaiString(rantai).join("\n"), KATA)).toEqual(SIDIK_RANTAI);
    expect(sidik(nilaiString(istilahHmac).join("\n"), KATA)).toEqual(SIDIK_ISTILAH);
  });

  test("frontmatter dan deskripsi", () => {
    expect(halaman).toContain("description: Rekeningo memeriksa tanda tangan atas byte mentah, mencatat tiap event satu kali, dan tidak memundurkan status top-up. ADR 34 menimbang tiga cara lain dan menulis kapan pilihan ini salah.");
    expect(halaman).toContain('import intiDiagram from "../../../../data/diagram/t4-webhook-masuk-inti.json";');
    expect(halaman.startsWith('---\ntitle: "4.7 Webhook masuk: tanda tangan, event ganda, urutan + ADR 34"\n')).toBe(true);
  });
});

// Nilai sidik dan hitungan label, dicatat sesudah halaman dibaca kalimat demi kalimat (lihat komentar penutup).
const RekamanLab = 9;
const TidakDijalankan = 10;
const JumlahAsumsi = 10;
const JumlahIlustrasi = 7;
const JumlahHitungan = 6;
const SIDIK_HALAMAN: Record<string, number> = { tidak: 57, bukan: 16, belum: 9, hanya: 26, tanpa: 14, sesudah: 26, sebelum: 9, juga: 3, setiap: 0, semua: 5, "lebih dari": 2, "paling banyak": 0, selalu: 1, sama: 18 };
const SIDIK_RANTAI: Record<string, number> = { tidak: 1, bukan: 1, belum: 0, hanya: 0, tanpa: 1, sesudah: 0, sebelum: 0, juga: 0, setiap: 0, semua: 0, "lebih dari": 0, "paling banyak": 0, selalu: 0, sama: 0 };
const SIDIK_ISTILAH: Record<string, number> = { tidak: 5, bukan: 0, belum: 0, hanya: 0, tanpa: 1, sesudah: 0, sebelum: 0, juga: 0, setiap: 0, semua: 0, "lebih dari": 0, "paling banyak": 0, selalu: 0, sama: 1 };
