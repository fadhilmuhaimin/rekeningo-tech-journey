// Tes titik acuan widget breaker (W4-breaker, keputusan 1262): simulasi dibandingkan dengan rekaman labs/t4-integrasi/output
// (breaker.txt, lajur.txt, worker.txt) dan README lab. Yang dibandingkan: tabel pekerjaan per percobaan, jumlah permintaan ke
// vendor, dan batas yang diperiksa lab (bagian C: paling banyak dua percobaan, enam sampai delapan percobaan seluruhnya).
// Nilai yang bergantung mesin (waktu) tidak dibandingkan: lab memerankannya dengan backoff 0 atau jam palsu.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Breaker } from "./breaker";
import { aturanDari, awalDari, bacaRekaman, daftarAcuan, SIMULASI } from "./rekaman";
import { berhasilBagiBreaker, cariAcuan, hitunganOutage, koma, lajuPuncak, simulasiQueue, simulasiSinkron, slotWorker, type Pekerjaan } from "./logika";
import { LabelBreaker } from "./skema";
import { periksaTombol, siapkanTeks } from "./teks";
import labelMentah from "../../../data/widget/t4-circuit-breaker.json";

const DIR = path.resolve(__dirname, "../../../../labs/t4-integrasi");
const baca = (f: string) => fs.readFileSync(path.join(DIR, f), "utf8");
const R = bacaRekaman(baca("output/breaker.txt"), baca("output/lajur.txt"), baca("output/worker.txt"), baca("README.md"));
const A = aturanDari(R);
const acuan = daftarAcuan(R);
const dari = (kunci: string) => acuan.find((d) => d.kunci === kunci)!.param;
const tabel = (js: Pekerjaan[]): Record<string, number> => {
  const m: Record<string, number> = {};
  for (const j of js) m[`${j.status} ${j.percobaan}`] = (m[`${j.status} ${j.percobaan}`] ?? 0) + 1;
  return m;
};
const percobaan = (js: Pekerjaan[]) => js.reduce((j, p) => j + p.percobaan, 0);

describe("jalur sinkron: breaker.txt bagian A sampai C", () => {
  const h = simulasiSinkron(dari("sinkron-bawaan"), A);
  it("breaker membuka pada kegagalan ke-6 dan menolak tanpa memanggil vendor (bagian A)", () => {
    expect(h.sel.slice(0, R.breaker.gagalKe).every((s) => s.hasil === "5xx" && s.status === "closed")).toBe(true);
    expect(h.sel[R.breaker.gagalKe]).toMatchObject({ hasil: "tolak", status: "open", tunggu: 0 });
    expect(h.buka).toBe(R.breaker.gagalKe - 1);
  });
  it("half-open sesudah Timeout 60 detik dengan satu permintaan percobaan, lalu open lagi bila gagal (bagian A dan B)", () => {
    const buka = h.buka!;
    const terakhirOpen = buka + R.breaker.bukaDetik; // tepat 60 detik: masih open (strict)
    expect(h.sel[terakhirOpen]!.status).toBe("open");
    expect(h.sel[terakhirOpen + 1]).toMatchObject({ status: "half-open", hasil: "5xx" });
    expect(h.sel[terakhirOpen + 2]!.hasil).toBe("tolak");
    // Sesudah permintaan percobaan gagal, breaker open lagi 60 detik penuh: half-open berikutnya 61 detik kemudian.
    expect(h.sel[terakhirOpen + 1 + R.breaker.bukaDetik]!.status).toBe("open");
    expect(h.sel[terakhirOpen + 1 + R.breaker.bukaDetik + 1]!.status).toBe("half-open");
  });
  it("permintaan percobaan yang sukses menutup breaker (bagian A)", () => {
    const pulih = simulasiSinkron({ ...dari("sinkron-bawaan"), pulih: "sementara" }, A);
    const probe = pulih.sel.find((s) => s.status === "half-open")!;
    expect(probe.hasil).toBe("ok");
    expect(pulih.sel.slice(probe.detik + 1).every((s) => s.status === "closed")).toBe(true);
  });
  it("4xx: IsSuccessful bawaan membuka pada jawaban ke-6, kustom tidak (bagian C)", () => {
    expect(simulasiSinkron(dari("sinkron-4xx-gagal"), A).buka).toBe(R.breaker.empatBawaan - 1);
    expect(simulasiSinkron(dari("sinkron-4xx-sukses"), A).buka).toBeNull();
    const kustom = new Breaker(A);
    for (let i = 0; i < R.breaker.empatKustom; i++) { const z = kustom.sebelum(i); if (z.ok) kustom.sesudah(z.generasi, berhasilBagiBreaker("4xx", "4xx-sukses"), i); }
    expect(kustom.keadaan(R.breaker.empatKustom)).toBe("closed");
    expect(kustom.gagalBerturut).toBe(0);
  });
  it("lima gagal vendor, satu 4xx, satu gagal vendor: closed (kustom); enam gagal vendor berturut-turut: open (bagian C)", () => {
    const urut = (hasil: ("5xx" | "4xx")[]) => {
      const b = new Breaker(A);
      hasil.forEach((x, i) => { const z = b.sebelum(i); if (z.ok) b.sesudah(z.generasi, berhasilBagiBreaker(x, "4xx-sukses"), i); });
      return b.keadaan(hasil.length);
    };
    expect(urut(["5xx", "5xx", "5xx", "5xx", "5xx", "4xx", "5xx"])).toBe("closed");
    expect(urut(["5xx", "5xx", "5xx", "5xx", "5xx", "5xx"])).toBe("open");
  });
});

describe("jalur queue: lajur.txt bagian A sampai E", () => {
  it("A: tanpa breaker semua pekerjaan mati sesudah lima percobaan dan 50 permintaan", () => {
    const hasil = simulasiQueue(dari("queue-tanpa"), A);
    expect(tabel(hasil.pekerjaan)).toEqual({ "mati 5": R.lajur.a.mati });
    expect(hasil.kevendor).toBe(R.lajur.a.permintaan);
    expect(R.lajur.a.permintaan).toBe(R.lajur.pendaftar * R.lajur.percobaan);
  });
  it("B: saat breaker membuka tabel pekerjaan sama dengan rekaman; sesudah vendor pulih juga; 6 lalu 15 permintaan", () => {
    const hasil = simulasiQueue(dari("queue-satu"), A);
    expect(tabel(hasil.saatBuka!)).toEqual(R.lajur.b.awal);
    expect(percobaan(hasil.saatBuka!)).toBe(R.lajur.b.permintaanBuka);
    expect(tabel(hasil.pekerjaan)).toEqual(R.lajur.b.akhir);
    expect(hasil.pekerjaan.filter((j) => j.status === "terkirim")).toHaveLength(R.lajur.b.lulus);
    expect(hasil.pekerjaan.filter((j) => j.status === "mati")).toHaveLength(R.lajur.b.gagal);
    expect(hasil.kevendor).toBe(R.lajur.b.permintaanAkhir);
    expect(hasil.probe).toBe(1);
  });
  it("B: pekerjaan pertama yang mati dan pekerjaan kedua yang satu percobaan gagal lalu sukses (ambang di atas batas percobaan)", () => {
    const hasil = simulasiQueue(dari("queue-satu"), A);
    expect(hasil.pekerjaan[0]!.riwayat).toEqual(Array(R.lajur.percobaan).fill("gagal"));
    expect(hasil.saatBuka![1]!.percobaan).toBe(R.breaker.gagalKe - R.lajur.percobaan);
    expect(hasil.pekerjaan[1]!.riwayat).toEqual(["gagal", "ok"]);
    expect(R.breaker.lebihDari).toBe(R.lajur.percobaan);
  });
  it("C: kapasitas 4, tidak ada yang mati, paling banyak dua percobaan, enam sampai delapan percobaan seluruhnya", () => {
    const hasil = simulasiQueue(dari("queue-empat"), A);
    const s = hasil.saatBuka!;
    expect(s.filter((j) => j.status === "mati")).toHaveLength(R.lajur.c.mati);
    expect(Math.max(...s.map((j) => j.percobaan))).toBeLessThanOrEqual(2);
    expect(percobaan(s)).toBeGreaterThanOrEqual(6);
    expect(percobaan(s)).toBeLessThanOrEqual(8);
    expect(hasil.pekerjaan.every((j) => j.status === "terkirim")).toBe(true);
  });
  it("D: dokumen rusak dihitung gagal: tabel saat breaker membuka sama dengan rekaman dan enam permintaan", () => {
    const hasil = simulasiQueue(dari("queue-4xx-gagal"), A);
    expect(tabel(hasil.saatBuka!)).toEqual(R.lajur.d.awal);
    expect(percobaan(hasil.saatBuka!)).toBe(R.lajur.d.permintaan);
    expect(hasil.pekerjaan.slice(R.lajur.d.rusak).every((j) => j.status !== "terkirim")).toBe(true);
  });
  it("E: dokumen rusak dihitung sukses: breaker tidak membuka, tabel akhir sama dengan rekaman, 34 permintaan", () => {
    const hasil = simulasiQueue(dari("queue-4xx-sukses"), A);
    expect(hasil.buka).toBeNull();
    expect(tabel(hasil.pekerjaan)).toEqual(R.lajur.e.akhir);
    expect(hasil.kevendor).toBe(R.lajur.e.permintaan);
    expect(hasil.pekerjaan.filter((j) => j.status === "terkirim")).toHaveLength(R.lajur.e.lulus);
  });
});

describe("hitungan dari rekaman worker.txt bagian C dan README", () => {
  it("1,74 slot, 2,26 slot, dan 4,0 dari 4 dihitung dari laju, percobaan, dan detik yang tertulis", () => {
    const w = R.worker;
    expect(koma(slotWorker(w.laju, w.percobaan, w.detik), 2)).toBe(koma(w.slot, 2));
    expect(koma(slotWorker(w.lajuUang, 1, w.detikUang), 2)).toBe(koma(w.slotUang, 2));
    expect(koma(slotWorker(w.laju, w.percobaan, w.detik) + slotWorker(w.lajuUang, 1, w.detikUang), 1)).toBe(koma(w.bersama, 1));
    expect(w.bersama).toBe(w.kapasitas);
    expect(koma((100 * slotWorker(w.laju, w.percobaan, w.detik)) / w.kapasitas, 1)).toBe(koma(w.persen, 1));
  });
  it("laju verifikasi 0,116 per detik adalah 1.000 pendaftar ÷ 86.400 × 10, rata-rata 0,0116", () => {
    expect(koma(lajuPuncak(1000, 10), 3)).toBe(koma(R.worker.laju, 3));
    expect(koma(lajuPuncak(1000, 1), 4)).toBe(koma(R.outage.lajuRataRata, 4));
  });
  it("outage 12.600 detik: 210 permintaan percobaan dan sampai 42 dari 146 pekerjaan (README)", () => {
    expect(hitunganOutage(R.outage.detik, R.breaker.bukaDetik, R.worker.percobaan, R.outage.lajuRataRata)).toEqual({ pekerjaan: R.outage.pekerjaan, probe: R.outage.probe, matiMaks: R.outage.matiMaks });
    expect([R.outage.detik, R.outage.probe, R.outage.matiMaks, R.outage.pekerjaan]).toEqual([12600, 210, 42, 146]);
  });
});

describe("titik acuan dan tombol", () => {
  const L = LabelBreaker.parse(labelMentah);
  it("tiap titik acuan dikenali oleh pengaturannya sendiri, dan pengaturan awal adalah queue dengan satu worker", () => {
    for (const d of acuan) expect(cariAcuan(d.param, acuan), d.kunci).toBe(d.kunci);
    expect(cariAcuan(awalDari(R), acuan)).toBe("queue-satu");
    expect(awalDari(R)).toEqual({ jalur: "queue", error: 100, latensi: 0, jenis: "5xx", breaker: true, pulih: "sementara", serentak: 1 });
    expect(acuan).toHaveLength(8);
  });
  it("setiap titik acuan bisa dipilih lewat tombol, dan vendor pulih sebelum permintaan percobaan pertama", () => {
    expect(() => periksaTombol(L, R)).not.toThrow();
    expect(SIMULASI.pulihDetik).toBeLessThan(R.breaker.bukaDetik);
  });
  it("teks acuan memuat angka rekaman yang sama dengan pembaca rekaman", () => {
    const T = siapkanTeks(L, R, acuan);
    expect(T.acuanTeks["queue-satu"]).toContain(`${R.lajur.b.awal["mati 5"]} dari ${R.lajur.pendaftar} pekerjaan mati`);
    expect(T.acuanTeks["queue-satu"]).toContain(`${R.lajur.b.permintaanAkhir} permintaan`);
    expect(T.acuanTeks["queue-tanpa"]).toContain(`${R.lajur.a.permintaan} permintaan`);
    expect(T.acuanTeks["queue-4xx-sukses"]).toContain(`${R.lajur.e.permintaan} permintaan`);
  });
});
