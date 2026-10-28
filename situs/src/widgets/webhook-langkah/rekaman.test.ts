// Tes pembaca rekaman (W4-webhook, keputusan 1258): angka acuan dibaca dari labs/t4-webhook/output dan dari
// labs/api-t4/output/rentan.txt, lalu dibandingkan dengan pembaca kedua yang ditulis terpisah (pencarian teks per baris,
// bukan regex per bagian). Uji mutasi: mengubah satu angka atau status di salinan rekaman harus menggagalkan pembaca
// atau periksaModel, atau mengubah acuan; tanpa itu tes ini tidak membuktikan apa-apa.
import { describe, expect, test } from "vitest";
import { angkaID, bacaAcuan, bagian, barisTabel, type Acuan, type Berkas } from "./rekaman";
import { periksaModel } from "./logika";
import { asli } from "./berkas-uji";

const ganti = (teks: string, dari: string, ke: string): string => {
  if (!teks.includes(dari)) throw new Error(`mutasi: "${dari}" tidak ada di rekaman`);
  return teks.replace(dari, ke);
};
const barisBerisi = (teks: string, frasa: string): string => {
  const b = teks.split("\n").find((x) => x.includes(frasa));
  if (!b) throw new Error(`rekaman tidak memuat "${frasa}"`);
  return b;
};
const sesudah = (teks: string, frasa: string): string => barisBerisi(teks, frasa).split(frasa)[1]!.trim();

describe("pembaca rekaman cocok dengan pembaca kedua", () => {
  const r = asli();
  const a = bacaAcuan(r);

  test("ganda.txt", () => {
    expect(r.ganda).toContain("Satu pembayaran Rp200.000, dua jurnal: saldo Budi naik Rp400.000");
    expect(a.ganda.bayar).toBe(200000);
    expect(a.ganda.saldoNaikA).toBe(400000);
    expect(sesudah(r.ganda, "hasil kiriman:")).toBe("200 diproses, 200 diproses");
    expect(a.ganda.kirimA).toEqual(["200 diproses", "200 diproses"]);
    expect(r.ganda).toContain(" 10201     | bank     | -200000");
    expect(r.ganda).toContain(" 10202     | karyawan | 200000");
    expect(a.ganda.jurnalA).toBe(2);
    expect(sesudah(r.ganda, "kiriman 2 (event yang sama):")).toBe("200 ganda");
    expect(a.ganda.kirim2B).toBe("200 ganda");
    expect(r.ganda).toContain(" evt-1    | settlement | diproses | t");
    expect(a.ganda.eventB).toEqual({ id: "evt-1", jenis: "settlement", hasil: "diproses", adaJurnal: true });
    expect(a.ganda.eventBarisB).toBe(1);
    expect(r.ganda).toContain("Kiriman pertama sudah di-COMMIT sebelum balasan dikirim");
  });

  test("urutan.txt F1 dan rentan.txt A", () => {
    const f1 = bagian(r.urutan, "F1");
    expect(f1).toContain("kabar pending sesudah settlement: 200 diparkir");
    expect(a.terlambat.jawabF1).toBe("200 diparkir");
    expect(f1.split("\n").filter((l) => /^ (dibayar|menunggu)\s*$/.test(l))).toEqual([" dibayar"]);
    expect(a.terlambat.statusF1).toBe("dibayar");
    expect(f1).toContain(" evt-f1   | settlement | diproses");
    expect(f1).toContain(" evt-f2   | pending    | diparkir");
    expect(a.terlambat.eventF1).toEqual([{ id: "evt-f1", jenis: "settlement", hasil: "diproses" }, { id: "evt-f2", jenis: "pending", hasil: "diparkir" }]);
    expect(sesudah(f1, "berapa kali api-t4 menanyakan order ini ke gateway:")).toBe("0");
    expect(a.terlambat.tanyaF1).toBe(0);
    const v1 = bagian(r.rentan, "A");
    expect(v1).toContain("# Kabar pending sesudah dibayar: status mundur ke menunggu");
    expect(v1.split("\n").filter((l) => /^ (dibayar|menunggu)\s*$/.test(l))).toEqual([" menunggu"]);
    expect(a.terlambat.statusV1).toBe("menunggu");
  });

  test("retry.txt", () => {
    expect(r.retry).toContain("jeda antar percobaan (sejak percobaan sebelumnya): 2, 10, 30, 90, 210 menit (total 342 menit)");
    expect(a.hilang.jeda).toEqual([2, 10, 30, 90, 210]);
    expect(a.hilang.total).toBe(342);
    expect(r.retry).toContain(" 401                   | 6              | 0, 2, 12, 42, 132, 342                | jadwal habis");
    expect(a.hilang.kirim401).toEqual({ n: 6, menit: [0, 2, 12, 42, 132, 342] });
    const b = bagian(r.retry, "B");
    const kiriman = b.split("\n").filter((l) => /^ \d\s+\| \d+\s+\| 401$/.test(l));
    expect(kiriman.length).toBe(6);
    expect(kiriman.map((l) => Number(l.split("|")[1]))).toEqual(a.hilang.menitB);
    expect(a.hilang.jawabanB).toEqual(["401", "401", "401", "401", "401", "401"]);
    expect(b).toContain("gateway berhenti: jadwal habis (342 menit sesudah kiriman pertama, ±5,7 jam)");
    expect([a.hilang.berhentiB, a.hilang.totalJamB]).toEqual(["jadwal habis", 5.7]);
    expect(b).toContain("=> SELECT count(*) AS webhook_event FROM webhook_event\n webhook_event\n---------------\n 0\n(1 row)");
    expect(a.hilang.eventB).toBe(0);
    expect(b).toContain(" menunggu |\n(1 row)");
    expect(a.hilang.statusB).toBe("menunggu");
    expect(b).toContain("Uang Rp500.000 sudah di bank");
    expect(a.hilang.uangB).toBe(500000);
  });

  test("rekon.txt", () => {
    const rA = bagian(r.rekon, "A");
    const cek = rA.split("\n").filter((l) => l.startsWith("cek top-up:"));
    expect(cek).toEqual([
      "cek top-up: diperiksa 0, dikredit 0, selesai tanpa kredit 0, masih menunggu 0, galat 0",
      "cek top-up: diperiksa 0, dikredit 0, selesai tanpa kredit 0, masih menunggu 0, galat 0",
      "cek top-up: diperiksa 1, dikredit 1, selesai tanpa kredit 0, masih menunggu 0, galat 0",
    ]);
    expect(rA).toContain("interval '29 minutes'");
    expect(rA).toContain("interval '31 minutes'");
    expect(rA).toContain("$ ./api-t4 -cek-topup   # bawaan -cek-umur 30m, top-up baru dibuat");
    expect(a.hilang.cekA).toEqual([{ umur: 0, diperiksa: 0, dikredit: 0 }, { umur: 29, diperiksa: 0, dikredit: 0 }, { umur: 31, diperiksa: 1, dikredit: 1 }]);
    expect(a.hilang.batasCek).toBe(30);
    expect(rA).toContain(" dibayar | t\n(1 row)");
    expect(a.hilang.statusA).toBe("dibayar");
    const rB = bagian(r.rekon, "B");
    expect(rB).toContain("rekon <tanggal>: 5 baris di laporan gateway; insiden baru: tidak_di_ledger 2, tidak_di_gateway 2, jumlah_beda 1");
    expect([a.rekon.baris, a.rekon.tidakDiLedger, a.rekon.tidakDiGateway, a.rekon.jumlahBeda]).toEqual([5, 2, 2, 1]);
    expect(rB).toContain("koreksi rekon: diperiksa 5, dikoreksi lewat jurnal 3, selesai tanpa jurnal baru 1, tetap terbuka 1, galat 0");
    expect([a.rekon.diperiksa, a.rekon.dikoreksi, a.rekon.tanpaJurnal, a.rekon.terbuka]).toEqual([5, 3, 1, 1]);
    expect(rB).toContain("sidik MD5 sama sesudah koreksi: ya");
    expect(a.rekon.postingLamaSama).toBe(true);
  });

  test("model cocok dengan rekaman", () => {
    expect(() => periksaModel(a)).not.toThrow();
  });
});

describe("invarian jurnal di ganda.txt A", () => {
  test("jumlah posting satu jurnal bukan nol menggagalkan pembaca", () => {
    const b = asli();
    b.ganda = ganti(b.ganda, " 10202     | karyawan | 200000", " 10202     | karyawan | 200001");
    expect(() => bacaAcuan(b)).toThrow(/tidak seimbang/);
  });
  test("jurnal dengan satu posting (jumlah nol) menggagalkan pembaca", () => {
    const b = asli();
    b.ganda = ganti(ganti(b.ganda, " 10202     | bank     | -200000", " 10202     | bank     | 0"), " 10202     | karyawan | 200000", " 10203     | karyawan | 0");
    expect(() => bacaAcuan(b)).toThrow(/tidak seimbang/);
  });
});

describe("pembantu pembaca", () => {
  test("angkaID membaca format id-ID dan menolak bukan angka", () => {
    expect(angkaID("10.000")).toBe(10000);
    expect(angkaID("5,7")).toBe(5.7);
    expect(() => angkaID("abc")).toThrow();
  });
  test("bagian memotong sampai bagian berikutnya dan gagal bila huruf tak ada", () => {
    const t = "# --- A. satu ---\nisi A\n# --- B. dua ---\nisi B\n";
    expect(bagian(t, "A")).toBe("# --- A. satu ---\nisi A\n");
    expect(bagian(t, "B")).toContain("isi B");
    expect(bagian(t, "B")).not.toContain("isi A");
    expect(() => bagian(t, "C")).toThrow();
    const f = "# --- F1. a ---\nisi F1\n# --- F2. b ---\nisi F2\n";
    expect(bagian(f, "F1")).not.toContain("isi F2");
    expect(bagian(f, "F2")).toContain("isi F2");
  });
  test("barisTabel menolak jumlah baris yang tidak cocok dengan (n rows)", () => {
    const t = " a | b\n---+---\n 1 | 2\n(2 rows)\n";
    expect(() => barisTabel(t, ["a", "b"], "x")).toThrow(/menyebut 2 baris/);
    expect(barisTabel(" a | b\n---+---\n 1 | 2\n(1 row)\n", ["a", "b"], "x")).toEqual([["1", "2"]]);
    expect(() => barisTabel(t, ["a", "c"], "x")).toThrow(/tidak ditemukan/);
  });
});

/** Mutasi: [berkas, dari, ke, nama]. Setiap mutasi harus ketahuan: pembaca gagal, periksaModel gagal, atau acuan berubah. */
const MUTASI: [keyof Berkas, string, string, string][] = [
  ["ganda", "hasil kiriman: 200 diproses, 200 diproses", "hasil kiriman: 200 diproses, 200 ganda", "ganda A: jawaban kedua"],
  ["ganda", "saldo Budi naik Rp400.000", "saldo Budi naik Rp300.000", "ganda A: saldo naik"],
  ["ganda", "Satu pembayaran Rp200.000", "Satu pembayaran Rp100.000", "ganda A: jumlah bayar"],
  ["ganda", " 10202     | bank     | -200000", " 10201     | bank     | -200000", "ganda A: jurnal kedua jadi pertama"],
  ["ganda", "kiriman 2 (event yang sama): 200 ganda", "kiriman 2 (event yang sama): 200 diproses", "ganda B: jawaban kiriman kedua"],
  ["ganda", " evt-1    | settlement | diproses | t", " evt-9    | settlement | diproses | t", "ganda B: event_id"],
  ["ganda", " evt-1    | settlement | diproses | t", " evt-1    | settlement | diproses | f", "ganda B: ada jurnal"],
  ["ganda", " evt-1    | settlement | diproses | t", " evt-1    | pending    | diproses | t", "ganda B: jenis event"],
  ["ganda", "(1 row)\n# Kiriman pertama", "(2 rows)\n# Kiriman pertama", "ganda B: jumlah baris"],
  ["urutan", "kabar pending sesudah settlement: 200 diparkir", "kabar pending sesudah settlement: 200 diproses", "urutan F1: jawaban"],
  ["urutan", " evt-f2   | pending    | diparkir", " evt-f2   | pending    | diproses", "urutan F1: hasil event pending"],
  ["urutan", " evt-f1   | settlement | diproses", " evt-f1   | settlement | diparkir", "urutan F1: hasil event settlement"],
  ["urutan", "berapa kali api-t4 menanyakan order ini ke gateway: 0", "berapa kali api-t4 menanyakan order ini ke gateway: 1", "urutan F1: ditanya gateway"],
  ["urutan", "=> SELECT status FROM topup_bank\n status\n---------\n dibayar", "=> SELECT status FROM topup_bank\n status\n---------\n menunggu", "urutan F1: status akhir"],
  ["rentan", "status\n----------\n menunggu\n(1 row)\n# Kabar pending", "status\n----------\n dibayar\n(1 row)\n# Kabar pending", "rentan A: status mundur"],
  ["retry", "2, 10, 30, 90, 210 menit (total 342 menit)", "2, 10, 30, 90, 210 menit (total 340 menit)", "retry A: total"],
  ["retry", "2, 10, 30, 90, 210 menit (total 342 menit)", "2, 10, 30, 80, 210 menit (total 342 menit)", "retry A: jeda"],
  ["retry", "0, 2, 12, 42, 132, 342                | jadwal habis", "0, 2, 12, 42, 132, 341                | jadwal habis", "retry A: menit kiriman terakhir"],
  ["retry", "0, 2, 12, 42, 132, 342                | jadwal habis", "0, 2, 12, 42, 132               | jadwal habis", "retry A: jumlah menit"],
  ["retry", " 1       | 0                           | 401", " 1       | 0                           | 200", "retry B: jawaban pertama"],
  ["retry", " 6       | 342                         | 401", " 6       | 340                         | 401", "retry B: menit terakhir"],
  ["retry", "(342 menit sesudah kiriman pertama, ±5,7 jam)", "(342 menit sesudah kiriman pertama, ±5,6 jam)", "retry B: jam"],
  ["retry", "gateway berhenti: jadwal habis", "gateway berhenti: diterima", "retry B: sebab berhenti"],
  ["retry", "=> SELECT count(*) AS webhook_event FROM webhook_event\n webhook_event\n---------------\n 0", "=> SELECT count(*) AS webhook_event FROM webhook_event\n webhook_event\n---------------\n 1", "retry B: jumlah event"],
  ["retry", " menunggu |\n(1 row)", " dibayar  |\n(1 row)", "retry B: status top-up"],
  ["retry", "Uang Rp500.000 sudah di bank", "Uang Rp400.000 sudah di bank", "retry B: uang"],
  ["rekon", "cek top-up: diperiksa 1, dikredit 1", "cek top-up: diperiksa 1, dikredit 0", "rekon A: dikredit"],
  ["rekon", "cek top-up: diperiksa 1, dikredit 1", "cek top-up: diperiksa 0, dikredit 1", "rekon A: diperiksa"],
  ["rekon", "interval '29 minutes'", "interval '31 minutes'", "rekon A: umur 29 jadi 31"],
  ["rekon", "bawaan -cek-umur 30m, top-up baru dibuat", "bawaan -cek-umur 20m, top-up baru dibuat", "rekon A: batas umur"],
  ["rekon", " dibayar | t\n(1 row)", " menunggu | t\n(1 row)", "rekon A: status"],
  ["rekon", "5 baris di laporan gateway", "6 baris di laporan gateway", "rekon B: baris laporan"],
  ["rekon", "tidak_di_ledger 2, tidak_di_gateway 2, jumlah_beda 1", "tidak_di_ledger 2, tidak_di_gateway 2, jumlah_beda 2", "rekon B: jumlah beda"],
  ["rekon", "tidak_di_ledger 2, tidak_di_gateway 2, jumlah_beda 1", "tidak_di_ledger 3, tidak_di_gateway 2, jumlah_beda 1", "rekon B: tidak di ledger"],
  ["rekon", "dikoreksi lewat jurnal 3", "dikoreksi lewat jurnal 2", "rekon B: dikoreksi"],
  ["rekon", "tetap terbuka 1, galat 0", "tetap terbuka 2, galat 0", "rekon B: tetap terbuka"],
  ["rekon", "sidik MD5 sama sesudah koreksi: ya", "sidik MD5 sama sesudah koreksi: tidak", "rekon B: sidik"],
];

describe("uji mutasi rekaman", () => {
  const dasar = JSON.stringify(bacaAcuan(asli()));
  test.each(MUTASI)("%s %s", (berkas, dari, ke, nama) => {
    const b = asli();
    b[berkas] = ganti(b[berkas], dari, ke);
    let ketahuan = false;
    let acuan: Acuan | null = null;
    try {
      acuan = bacaAcuan(b);
      periksaModel(acuan);
    } catch {
      ketahuan = true;
    }
    if (!ketahuan) ketahuan = JSON.stringify(acuan) !== dasar;
    expect(ketahuan, `mutasi lolos: ${nama}`).toBe(true);
  });
});
