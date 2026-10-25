// Tes pembaca rekaman (W3-outbox, keputusan 983): angka acuan dibaca dari labs/t3-outbox/output dan dibandingkan dengan
// pembaca kedua yang ditulis terpisah (pencarian teks, bukan regex per baris). Uji mutasi: mengubah satu angka di salinan
// rekaman harus menggagalkan pembaca atau periksaAcuan; tanpa itu tes ini tidak membuktikan apa-apa.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { angkaID, bacaAcuan, bagian, type Berkas } from "./rekaman";
import { konstanta, periksaAcuan } from "./logika";

const akar = path.resolve(__dirname, "../../../..");
const baca = (f: string) => fs.readFileSync(path.join(akar, "labs/t3-outbox/output", f + ".txt"), "utf8");
const asli = (): Berkas => ({ transaksi: baca("transaksi"), kursor: baca("kursor"), ganda: baca("ganda"), retry: baca("retry"), queue: baca("queue") });
const angkaDi = (teks: string): number[] => (teks.match(/\d[\d.,]*/g) ?? []).map((x) => angkaID(x.replace(/[.,]$/, "")));
/** Baris pertama yang memuat `frasa`; tidak ada gagal keras. */
const baris = (teks: string, frasa: string): string => {
  const b = teks.split("\n").find((x) => x.includes(frasa));
  if (!b) throw new Error(`rekaman tidak memuat "${frasa}"`);
  return b;
};
const ganti = (teks: string, dari: string, ke: string): string => {
  if (!teks.includes(dari)) throw new Error(`mutasi: "${dari}" tidak ada di rekaman`);
  return teks.replace(dari, ke);
};

describe("pembaca rekaman cocok dengan pembaca kedua", () => {
  const r = asli();
  const a = bacaAcuan(r);
  test("transaksi.txt", () => {
    expect(angkaDi(baris(r.transaksi, "push timeout"))).toContain(a.transaksi.pushTimeout);
    expect(a.transaksi.pushTimeout).toBe(3);
    expect(r.transaksi).toContain("push tiruan menerima: 0 (pembayaran selesai");
    expect(a.transaksi.pushSebelumWorker).toBe(0);
    expect(a.transaksi.pushSesudahWorker).toBe(1);
    expect(r.transaksi.split("\n").filter((b) => b.startsWith("worker: diklaim 0, terkirim 0")).length).toBeGreaterThanOrEqual(1);
    expect(a.transaksi.workerSaatBelumCommit).toBe(0);
    expect(r.transaksi).toContain("SQLSTATE 23514");
    expect(a.transaksi.commitDitolak.sqlstate).toBe("23514");
    expect(bagian(r.transaksi, "C").join("\n")).toMatch(/jurnal_90002 \| outbox_90002\n[-+]+\n 0\s+\| 0/);
    expect(a.transaksi.rollback).toEqual({ jurnal: 0, outbox: 0 });
    expect(bagian(r.transaksi, "F").join("\n")).toMatch(/menunggu\s+\| 0[\s\S]*terkirim\s+\| 1/);
    expect(a.transaksi.apiMati).toEqual({ statusSebelum: "menunggu", percobaanSebelum: 0, statusSesudah: "terkirim", percobaanSesudah: 1 });
  });
  test("kursor.txt", () => {
    expect(r.kursor).toContain("push tiruan menerima: 1 pesan (hanya Dimas)");
    expect(r.kursor).toContain("push tiruan menerima: 2 pesan; HP Citra berbunyi dua kali");
    expect(bagian(r.kursor, "A").filter((b) => /\| terkirim\s*$/.test(b)).length).toBe(a.kursor.berurutanPesan);
    expect([a.kursor.berurutanPesan, a.kursor.terbalikKursorPesan, a.kursor.terbalikKlaimPesan]).toEqual([2, 1, 2]);
    expect(angkaDi(baris(r.kursor, "Budi mengirim Rp")).includes(a.kursor.nominal)).toBe(true);
    expect(a.kursor.saldoNaik).toBe(2 * a.kursor.nominal);
  });
  test("ganda.txt", () => {
    expect(r.ganda.match(/2 pesan, 1 notifikasi_id/g)?.length).toBe(2);
    expect(a.ganda.matiPesan).toBe(2);
    expect(a.ganda.pendekPesan).toBe(2);
    expect(r.ganda).toContain("push tiruan menerima: 4 pesan (dua HP, dua worker), 1 notifikasi_id");
    expect([a.ganda.duaHpPesan, a.ganda.duaHp, a.ganda.duaHpDitundaA]).toEqual([4, 2, 1]);
    expect(angkaDi(baris(r.ganda, "-klaim 300ms"))).toContain(300);
    expect(a.ganda.klaimPendek).toBe(0.3);
    expect(r.ganda).toContain("diterima: 2 pesan; ditampilkan: 1");
    expect([a.ganda.penyaringDiterima, a.ganda.penyaringTampil]).toEqual([2, 1]);
    expect(baris(r.ganda, "klaim 5 detik (bawaan)")).toBeTruthy();
    expect(a.ganda.klaim).toBe(5);
    expect(a.ganda.pushLambat).toBe(1.5);
  });
  test("retry.txt", () => {
    const batas = r.retry.split("\n").filter((b) => b.startsWith("putaran") && b.includes("paling lama")).map((b) => angkaDi(b.split("paling lama")[1]!)[0]!);
    expect(batas).toEqual(a.retry.batasBackoff);
    expect(batas).toEqual([2, 4, 8, 16]);
    expect(r.retry).toContain("push tiruan menerima: 5 permintaan untuk 1 notifikasi_id");
    expect(r.retry).toContain("push tiruan menerima: 5 pesan untuk 1 notifikasi_id");
    expect(r.retry).toContain("klaim 6: diklaim 1, mati 1, tanpa kirim; outbox.status = mati, percobaan = 6");
    expect([a.retry.permintaanA, a.retry.pesanMati, a.retry.percobaanMati, a.retry.klaimMati, a.retry.batasA, a.retry.backoffMaks]).toEqual([5, 5, 6, 6, 5, 60]);
  });
  test("queue.txt", () => {
    const q = a.queue;
    expect(r.queue).toContain("c ÷ t = 4 ÷ 0,3 = 13,33");
    expect([q.c, q.t, q.kapasitas, q.kapasitasBawah]).toEqual([4, 0.3, 13.33, 12]);
    expect(r.queue).toContain("antara 3,4% dan 4,2%");
    expect([q.persen30Bawah, q.persen30Atas]).toEqual([3.4, 4.2]);
    expect(r.queue).toContain("jumlah pemberitahuan promo yang ditulis: 10000");
    expect(q.nPromo).toBe(10000);
    expect(r.queue).toContain("= 750 detik");
    expect([q.habisDetik, q.perluPerDetik]).toEqual([750, 317]);
    expect(r.queue).toContain("kurang dari 1,5 detik");
    expect([q.uangBatas, q.putaranUang, q.uangMenunggu30, q.umurSemua30, q.umurUang]).toEqual([1.5, 0.3, 30, 30, 0]);
    expect(r.queue).toContain("antara 4 dan 5,6 per detik (batas 5)");
    expect([q.lajuBawah, q.lajuAtas, q.lajuBatas, q.lajuDetik, q.lajuHabis, q.lajuHabisMenit]).toEqual([4, 5.6, 5, 3, 2000, 33]);
    expect(r.queue).toContain("8,33 per detik, 9,6 kali puncak 0,87");
    expect([q.sisa, q.kaliPuncak, q.puncak]).toEqual([8.33, 9.6, 0.87]);
    expect(q.urutanKelas[0]).toBe("tiruan-418");
  });
  test("rekaman asli lolos periksaAcuan", () => {
    expect(() => periksaAcuan(a)).not.toThrow();
  });
});

describe("uji mutasi: satu perubahan di rekaman menggagalkan pembaca atau penjaga", () => {
  const coba = (b: keyof Berkas, dari: string, ke: string) => {
    const r = asli();
    r[b] = ganti(r[b], dari, ke);
    return () => periksaAcuan(bacaAcuan(r));
  };
  const kasus: [string, keyof Berkas, string, string][] = [
    ["persen promo 30 detik", "queue", "antara 3,4% dan 4,2%", "antara 10% dan 12%"],
    ["kapasitas c ÷ t", "queue", "c ÷ t = 4 ÷ 0,3 = 13,33", "c ÷ t = 4 ÷ 0,6 = 13,33"],
    ["batas backoff kedua", "retry", "paling lama 4 detik lagi (acak antara 0 dan 4)", "paling lama 5 detik lagi (acak antara 0 dan 5)"],
    ["klaim terakhir mati", "retry", "klaim 6: diklaim 1", "klaim 7: diklaim 1"],
    ["pesan ganda dua HP", "ganda", "4 pesan (dua HP, dua worker)", "5 pesan (dua HP, dua worker)"],
    ["pesan kursor Dimas", "kursor", "push tiruan menerima: 1 pesan (hanya Dimas)", "push tiruan menerima: 2 pesan (hanya Dimas)"],
    ["push sebelum worker", "transaksi", "push tiruan menerima: 0 (pembayaran selesai", "push tiruan menerima: 1 (pembayaran selesai"],
    ["status akhir API mati", "transaksi", "terkirim | 1", "menunggu | 1"],
    ["batas laju promo", "queue", "antara 4 dan 5,6 per detik (batas 5)", "antara 4 dan 5,6 per detik (batas 8)"],
    ["kali puncak", "queue", "9,6 kali puncak", "7,0 kali puncak"],
  ];
  test.each(kasus)("%s", (_nama, berkas, dari, ke) => {
    expect(coba(berkas, dari, ke)).toThrow();
  });
  test("bagian yang hilang gagal keras", () => {
    const r = asli();
    r.retry = r.retry.replace("# --- C. ", "# --- X. ");
    expect(() => bacaAcuan(r)).toThrow(/bagian C/);
  });
  test("baris ganda gagal keras", () => {
    const r = asli();
    r.ganda = r.ganda.replace("diterima: 2 pesan; ditampilkan: 1", "diterima: 2 pesan; ditampilkan: 1\nditerima: 2 pesan; ditampilkan: 1");
    expect(() => bacaAcuan(r)).toThrow(/ada 2 baris/);
  });
});

describe("mutasi mesin lewat konstanta", () => {
  const a = bacaAcuan(asli());
  const k = konstanta(a);
  test.each([
    ["batas percobaan 4", { maksPercobaan: 4 }],
    ["t dua kali lipat", { t: 0.6 }],
    ["promo dua kali lipat", { nPromo: 20000 }],
    ["laju promo 8", { laju: 8 }],
    ["putaran satu detik", { putaran: 1 }],
    ["backoff awal 3", { backoffAwal: 3 }],
  ])("%s", (_n, ubah) => {
    expect(() => periksaAcuan(a, { ...k, ...ubah })).toThrow();
  });
  test("konstanta asli lolos", () => {
    expect(() => periksaAcuan(a, k)).not.toThrow();
  });
});
