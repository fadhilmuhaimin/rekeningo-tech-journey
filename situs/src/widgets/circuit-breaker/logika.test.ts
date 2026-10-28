// Tes simulasi breaker (W4-breaker, keputusan 1262): jalur sinkron dan queue, ringkasan, hitungan, dan titik acuan. Nilai emas
// dihitung dari model ini sendiri (benih 1) dan dikunci di sini; kesesuaian dengan rekaman lab ada di acuan.test.ts.
import { describe, expect, it } from "vitest";
import {
  HORIZON, cariAcuan, hitunganOutage, indeksBenar, isi, jalankan, koma, lajuPuncak, periksaMasukan, ribuan, ringkas, samaAcuan, simulasiQueue,
  simulasiSinkron, slotWorker, vendor, type AcuanDef, type Aturan, type Param,
} from "./logika";

const A: Aturan = { gagalLebihDari: 5, bukaDetik: 60, maksHalfOpen: 1, timeout: 3, percobaan: 5, pekerjaan: 10, pulihDetik: 30, benih: 1 };
const S: Param = { jalur: "sinkron", error: 100, latensi: 0, jenis: "5xx", breaker: true, pulih: "sementara", serentak: 1 };
const Q: Param = { ...S, jalur: "queue" };
const hitungJob = (js: { status: string; percobaan: number }[]) => {
  const m: Record<string, number> = {};
  for (const j of js) m[`${j.status} ${j.percobaan}`] = (m[`${j.status} ${j.percobaan}`] ?? 0) + 1;
  return m;
};
const ringkasSinkron = (d: Partial<Param>) => { const h = simulasiSinkron({ ...S, ...d }, A); return { buka: h.buka, kali: h.kaliBuka, kev: h.kevendor, tolak: h.ditolak, ok: h.ok, gagal: h.gagalVendor, empat: h.empat, tunggu: h.tunggu }; };

describe("vendor tiruan", () => {
  it("sehat sesudah pulih, timeout bila latensi melebihi timeout, 4xx atau 5xx sesuai jenis", () => {
    expect(vendor({ ...S, pulih: "sementara" }, A, 30, true)).toEqual({ durasi: 0, hasil: "ok" });
    expect(vendor({ ...S, pulih: "sementara" }, A, 29, true)).toEqual({ durasi: 0, hasil: "5xx" });
    expect(vendor({ ...S, pulih: "terus" }, A, 170, true)).toEqual({ durasi: 0, hasil: "5xx" });
    expect(vendor({ ...S, latensi: 4 }, A, 0, false)).toEqual({ durasi: 3, hasil: "timeout" });
    expect(vendor({ ...S, latensi: 3 }, A, 0, true)).toEqual({ durasi: 3, hasil: "5xx" });
    expect(vendor({ ...S, latensi: 2 }, A, 0, false)).toEqual({ durasi: 2, hasil: "ok" });
    expect(vendor({ ...S, jenis: "4xx-gagal", pulih: "sementara" }, A, 100, true)).toEqual({ durasi: 0, hasil: "4xx" });
    expect(vendor({ ...S, jenis: "4xx-sukses" }, A, 0, false)).toEqual({ durasi: 0, hasil: "ok" });
  });
});

describe("jalur sinkron", () => {
  it("vendor mati terus: gagal ke-6 pada detik 5 membuka, permintaan sesudahnya ditolak cepat, half-open dan probe tiap 61 detik", () => {
    const h = simulasiSinkron({ ...S, pulih: "terus" }, A);
    expect(h.sel).toHaveLength(HORIZON);
    expect(h.sel.slice(0, 6).map((s) => s.hasil)).toEqual(Array(6).fill("5xx"));
    expect(h.sel.slice(6, 66).every((s) => s.hasil === "tolak" && s.status === "open")).toBe(true);
    expect(h.sel[66]).toEqual({ detik: 66, status: "half-open", hasil: "5xx", tunggu: 0 });
    expect(h.sel[67]!.hasil).toBe("tolak");
    expect(h.sel[127]).toEqual({ detik: 127, status: "half-open", hasil: "5xx", tunggu: 0 });
    expect(h.buka).toBe(5);
    expect(h.kaliBuka).toBe(3);
    expect([h.kevendor, h.ditolak]).toEqual([8, 172]);
  });
  it("vendor pulih pada detik 30: probe pada detik 66 sukses dan breaker closed lagi; 36 permintaan ditolak padahal vendor sehat", () => {
    const h = simulasiSinkron(S, A);
    expect(h.sel[66]).toEqual({ detik: 66, status: "half-open", hasil: "ok", tunggu: 0 });
    expect(h.sel.slice(67).every((s) => s.status === "closed" && s.hasil === "ok")).toBe(true);
    expect(ringkas(S, A).ditolakSehat).toBe(36);
    expect(ringkasSinkron({})).toEqual({ buka: 5, kali: 1, kev: 120, tolak: 60, ok: 114, gagal: 6, empat: 0, tunggu: 0 });
  });
  it("latensi di atas timeout: timeout 3 detik dihitung gagal, permintaan yang sudah berangkat tetap menunggu, sisanya ditolak cepat", () => {
    expect(ringkasSinkron({ error: 0, latensi: 4 })).toEqual({ buka: 8, kali: 1, kev: 119, tolak: 61, ok: 111, gagal: 8, empat: 0, tunggu: 24 });
    const r = ringkas({ ...S, error: 0, latensi: 4 }, A);
    expect([r.tunggu, r.tungguTanpa]).toEqual([24, 90]);
  });
  it("latensi 2 detik dengan error rate 100%: jawaban gagal tiba dua detik kemudian, breaker membuka pada detik 7", () => {
    expect(ringkasSinkron({ latensi: 2 })).toMatchObject({ buka: 7, kev: 119, tolak: 61, tunggu: 14 });
  });
  it("jawaban terlambat dari generasi lama tidak membuka lagi: pada latensi 4 hanya satu perpindahan ke open", () => {
    expect(simulasiSinkron({ ...S, error: 0, latensi: 4 }, A).kaliBuka).toBe(1);
  });
  it("error rate sebagian: 30% tidak membuka (butuh enam gagal beruntun), 60% dan 80% membuka; hasil berbenih tetap", () => {
    expect(ringkasSinkron({ error: 30, pulih: "terus" })).toMatchObject({ buka: null, kev: 180, gagal: 56, ok: 124 });
    expect(ringkasSinkron({ error: 60, pulih: "terus" })).toMatchObject({ buka: 33, kali: 2, kev: 60, tolak: 120 });
    expect(ringkasSinkron({ error: 80, pulih: "terus" })).toMatchObject({ buka: 11, kali: 3, kev: 54, tolak: 126 });
    expect(ringkasSinkron({ error: 60, pulih: "terus" })).toEqual(ringkasSinkron({ error: 60, pulih: "terus" }));
  });
  it("error rate lebih tinggi hanya menambah kegagalan: permintaan gagal di 30% juga gagal di 60% bila tanpa breaker", () => {
    const gagal = (e: number) => simulasiSinkron({ ...S, breaker: false, error: e, pulih: "terus" }, A).sel.map((s) => s.hasil === "5xx");
    const rendah = gagal(30), tinggi = gagal(60);
    expect(rendah.every((g, i) => !g || tinggi[i])).toBe(true);
    expect(tinggi.filter(Boolean).length).toBeGreaterThan(rendah.filter(Boolean).length);
    expect(gagal(0).some(Boolean)).toBe(false);
    expect(gagal(100).slice(0, 100).every(Boolean)).toBe(true);
  });
  it("4xx: dihitung gagal membuka seperti 5xx, dihitung sukses tidak pernah membuka", () => {
    expect(ringkasSinkron({ jenis: "4xx-gagal" })).toMatchObject({ buka: 5, kali: 3, kev: 8, tolak: 172, empat: 8 });
    expect(ringkasSinkron({ jenis: "4xx-sukses" })).toMatchObject({ buka: null, kev: 180, tolak: 0, empat: 180 });
  });
  it("tanpa breaker: tidak ada yang ditolak, semua permintaan ke vendor, tidak ada perpindahan", () => {
    expect(ringkasSinkron({ breaker: false })).toMatchObject({ buka: null, kali: 0, kev: 180, tolak: 0, gagal: 30, ok: 150 });
  });
  it("vendor sehat: tidak ada gagal, tidak ada penolakan", () => {
    expect(ringkasSinkron({ error: 0 })).toMatchObject({ buka: null, kev: 180, ok: 180, gagal: 0 });
  });
  it("papan: tiap detik satu sel, detik berurutan, dan status band hanya tiga nilai", () => {
    const h = simulasiSinkron({ ...S, pulih: "terus" }, A);
    expect(h.sel.map((s) => s.detik)).toEqual(Array.from({ length: HORIZON }, (_, i) => i));
    expect(new Set(h.sel.map((s) => s.status))).toEqual(new Set(["closed", "open", "half-open"]));
  });
});

describe("jalur queue", () => {
  it("tanpa breaker: sepuluh pekerjaan habis lima percobaan sebelum vendor pulih, 50 permintaan", () => {
    const h = simulasiQueue({ ...Q, breaker: false }, A);
    expect(hitungJob(h.pekerjaan)).toEqual({ "mati 5": 10 });
    expect([h.kevendor, h.probe, h.buka, h.saatBuka]).toEqual([50, 0, null, null]);
  });
  it("breaker, satu worker: pekerjaan pertama mati, kedua menunggu dengan satu percobaan; sesudah pulih selesai", () => {
    const h = simulasiQueue(Q, A);
    expect(hitungJob(h.saatBuka!)).toEqual({ "mati 5": 1, "menunggu 1": 1, "menunggu 0": 8 });
    expect(hitungJob(h.pekerjaan)).toEqual({ "mati 5": 1, "terkirim 2": 1, "terkirim 1": 8 });
    expect([h.kevendor, h.probe, h.buka, h.kaliBuka]).toEqual([15, 1, 0, 1]);
    expect(h.pekerjaan[0]!.riwayat).toEqual(Array(5).fill("gagal"));
    expect(h.pekerjaan[1]!.riwayat).toEqual(["gagal", "ok"]);
  });
  it("lajur yang dijeda tidak diklaim: tidak ada percobaan di detik 1 sampai 60; di detik 61 satu permintaan percobaan lalu sisanya", () => {
    const h = simulasiQueue(Q, A);
    expect(h.sel[0]).toMatchObject({ detik: 0, percobaan: 6, gagal: 6, status: "closed" });
    expect(h.sel.slice(1, 61).every((s) => s.percobaan === 0 && s.status === "open")).toBe(true);
    // Detik 61: satu permintaan percobaan sukses menutup breaker, lalu delapan pekerjaan lain diklaim di detik yang sama.
    expect(h.sel[61]).toMatchObject({ status: "half-open", percobaan: 9, gagal: 0 });
    expect(h.sel[62]).toMatchObject({ status: "closed", percobaan: 0 });
  });
  it("kapasitas 4: tidak ada pekerjaan yang mati sebelum breaker membuka, percobaan paling banyak dua, total delapan", () => {
    const h = simulasiQueue({ ...Q, serentak: 4 }, A);
    expect(hitungJob(h.saatBuka!)).toEqual({ "menunggu 2": 4, "menunggu 0": 6 });
    expect(hitungJob(h.pekerjaan)).toEqual({ "terkirim 3": 4, "terkirim 1": 6 });
    expect(h.kevendor).toBe(18);
  });
  it("vendor tidak pulih: probe di detik 61 dan 122 menghabiskan percobaan pekerjaan terdepan, breaker membuka tiga kali", () => {
    const h = simulasiQueue({ ...Q, pulih: "terus" }, A);
    expect(h.probe).toBe(2);
    expect(h.kaliBuka).toBe(3);
    expect(h.pekerjaan[1]!.percobaan).toBe(3);
    expect(hitungJob(h.pekerjaan)).toEqual({ "mati 5": 1, "menunggu 3": 1, "menunggu 0": 8 });
    expect(h.sel[61]!.status).toBe("half-open");
    expect(h.sel[122]!.status).toBe("half-open");
  });
  it("dokumen rusak 4xx dihitung gagal: breaker membuka pada kegagalan ke-6 dan menjeda pekerjaan sehat di belakangnya", () => {
    const h = simulasiQueue({ ...Q, error: 60, jenis: "4xx-gagal" }, A);
    expect(hitungJob(h.saatBuka!)).toEqual({ "mati 5": 1, "menunggu 1": 1, "menunggu 0": 8 });
    expect(h.pekerjaan.slice(6).every((j) => j.status === "menunggu" && j.percobaan === 0)).toBe(true);
  });
  it("dokumen rusak 4xx dihitung sukses: breaker tidak membuka, enam rusak habis lima percobaan, empat sehat terkirim, 34 permintaan", () => {
    const h = simulasiQueue({ ...Q, error: 60, jenis: "4xx-sukses" }, A);
    expect(hitungJob(h.pekerjaan)).toEqual({ "mati 5": 6, "terkirim 1": 4 });
    expect([h.kevendor, h.buka, h.kaliBuka]).toEqual([34, null, 0]);
  });
  it("jumlah dokumen rusak mengikuti error rate: 20% berarti dua pekerjaan terdepan", () => {
    const h = simulasiQueue({ ...Q, error: 20, jenis: "4xx-sukses" }, A);
    expect(h.pekerjaan.filter((j) => j.status === "mati").map((j) => j.id)).toEqual([1, 2]);
    expect(simulasiQueue({ ...Q, error: 0, jenis: "4xx-sukses" }, A).pekerjaan.every((j) => j.status === "terkirim" && j.percobaan === 1)).toBe(true);
  });
  it("latensi 4 detik: tiap percobaan timeout menahan worker 3 detik, breaker membuka pada detik 18", () => {
    const h = simulasiQueue({ ...Q, latensi: 4 }, A);
    expect(h.buka).toBe(18);
    expect(hitungJob(h.saatBuka!)).toEqual({ "mati 5": 1, "menunggu 1": 1, "menunggu 0": 8 });
    expect(simulasiQueue({ ...Q, latensi: 4, breaker: false }, A).pekerjaan.filter((j) => j.status === "mati")).toHaveLength(2);
  });
  it("error rate 60% pada 5xx: tiap percobaan acak, pekerjaan yang gagal diulang, hanya satu yang mati", () => {
    const h = simulasiQueue({ ...Q, error: 60, pulih: "terus" }, A);
    expect(h.buka).toBeNull();
    expect(hitungJob(h.pekerjaan)).toEqual({ "terkirim 1": 6, "terkirim 2": 2, "terkirim 3": 1, "mati 5": 1 });
    expect(h.kevendor).toBe(18);
  });
  it("percobaan tidak pernah melebihi batas dan pekerjaan yang selesai tidak diklaim lagi", () => {
    for (const d of [{}, { serentak: 4 }, { breaker: false }, { latensi: 2 }, { pulih: "terus" as const }]) {
      const h = simulasiQueue({ ...Q, ...d }, A);
      expect(h.pekerjaan.every((j) => j.percobaan <= A.percobaan && j.percobaan === j.riwayat.length)).toBe(true);
      expect(h.pekerjaan.filter((j) => j.status === "terkirim").every((j) => j.riwayat.at(-1) === "ok")).toBe(true);
    }
  });
});

describe("ringkas, jalankan, dan kalimat", () => {
  it("jalankan memilih jalur dan memberi tanda jalur", () => {
    expect(jalankan(S, A).jalur).toBe("sinkron");
    expect(jalankan(Q, A).jalur).toBe("queue");
  });
  it("vonis: enam kategori menurut jalur, breaker dipasang atau tidak, dan membuka atau tidak", () => {
    expect(ringkas({ ...S, breaker: false }, A).vonis).toBe("sinkron-tanpa");
    expect(ringkas({ ...S, error: 0 }, A).vonis).toBe("sinkron-tetap");
    expect(ringkas(S, A).vonis).toBe("sinkron-membuka");
    expect(ringkas({ ...Q, breaker: false }, A).vonis).toBe("queue-tanpa");
    expect(ringkas({ ...Q, error: 60, jenis: "4xx-sukses" }, A).vonis).toBe("queue-tetap");
    expect(ringkas(Q, A).vonis).toBe("queue-membuka");
  });
  it("ringkasan queue: mati, menunggu, terkirim, dan perbandingan permintaan ke vendor tanpa breaker", () => {
    expect(ringkas(Q, A)).toMatchObject({ mati: 1, menunggu: 0, terkirim: 9, kevendor: 15, kevendorTanpa: 50, probe: 1, buka: 0, kebuka: true });
    expect(ringkas({ ...Q, error: 60, jenis: "4xx-gagal" }, A)).toMatchObject({ mati: 1, menunggu: 9, terkirim: 0 });
  });
  it("ditolak sesudah vendor pulih hanya untuk 5xx yang pulih", () => {
    expect(ringkas({ ...S, pulih: "terus" }, A).ditolakSehat).toBe(0);
    expect(ringkas({ ...S, jenis: "4xx-gagal" }, A).ditolakSehat).toBe(0);
    expect(ringkas(S, A).ditolakSehat).toBe(36);
  });
  it("isi, koma, ribuan, dan indeksBenar", () => {
    expect(isi("{a} dan {b}", { a: 1, b: "dua" })).toBe("1 dan dua");
    expect(() => isi("{c}", {})).toThrow(/\{c\}/);
    expect(koma(1.74, 2)).toBe("1,74");
    expect(koma(4, 1)).toBe("4,0");
    expect(ribuan(12600)).toBe("12.600");
    expect(ribuan(999)).toBe("999");
    expect(indeksBenar([{ teks: "a", jumlah: 0 }, { teks: "b", jumlah: 1 }], 1)).toBe(1);
    expect(() => indeksBenar([{ teks: "a", jumlah: 1 }, { teks: "b", jumlah: 1 }], 1)).toThrow(/2 pilihan/);
    expect(() => indeksBenar([{ teks: "a", jumlah: 0 }], 1)).toThrow(/0 pilihan/);
  });
});

describe("hitungan worker dan permintaan percobaan", () => {
  it("0,116 verifikasi per detik × 5 percobaan × 3 detik = 1,74 dari 4 slot; 7,52 × 0,3 = 2,26; jumlah 4,0", () => {
    expect(koma(slotWorker(0.116, 5, 3), 2)).toBe("1,74");
    expect(koma(slotWorker(7.52, 1, 0.3), 2)).toBe("2,26");
    expect(koma(Number(koma(slotWorker(0.116, 5, 3), 2).replace(",", ".")) + 2.26, 1)).toBe("4,0");
    expect(koma(lajuPuncak(1000, 10), 3)).toBe("0,116");
    expect(koma(lajuPuncak(1000, 1), 4)).toBe("0,0116");
  });
  it("outage 12.600 detik, Timeout 60 detik, lima percobaan, 0,0116 per detik: 210 probe, sampai 42 dari 146 pekerjaan", () => {
    expect(hitunganOutage(12600, 60, 5, 0.0116)).toEqual({ pekerjaan: 146, probe: 210, matiMaks: 42 });
    expect(hitunganOutage(59, 60, 5, 0.0116)).toMatchObject({ probe: 0, matiMaks: 0 });
    expect(hitunganOutage(300, 60, 5, 0.0116).matiMaks).toBe(1);
    expect(() => hitunganOutage(0, 60, 5, 1)).toThrow(/masukan/);
  });
});

describe("masukan dan titik acuan", () => {
  it("masukan yang tidak masuk akal gagal keras", () => {
    for (const salah of [{ error: 101 }, { error: -1 }, { error: 1.5 }, { latensi: 1.5 }, { latensi: -1 }, { serentak: 0 }, { serentak: 17 }, { jalur: "x" as never }, { jenis: "x" as never }, { pulih: "x" as never }, { breaker: 1 as never }, { error: NaN }]) {
      expect(() => periksaMasukan({ ...S, ...salah }, A), JSON.stringify(salah)).toThrow(/simulasi breaker/);
    }
    for (const salah of [{ timeout: 0 }, { percobaan: 0 }, { pekerjaan: 0 }, { pulihDetik: 181 }, { pulihDetik: -1 }, { bukaDetik: 0 }, { benih: 1.5 }, { gagalLebihDari: -1 }, { maksHalfOpen: 0 }]) {
      expect(() => periksaMasukan(S, { ...A, ...salah }), JSON.stringify(salah)).toThrow();
    }
    expect(() => simulasiSinkron({ ...S, error: 101 }, A)).toThrow(/simulasi breaker/);
    expect(() => simulasiQueue({ ...Q, latensi: 0.5 }, A)).toThrow(/simulasi breaker/);
    expect(() => periksaMasukan(S, A)).not.toThrow();
  });
  const acuan: AcuanDef[] = [{ kunci: "x", param: { ...Q, error: 60, jenis: "4xx-gagal", pulih: "terus", serentak: 4 } }, { kunci: "y", param: { ...S, pulih: "sementara" } }];
  it("cocok bila jalur, error, latensi, jenis, dan breaker sama; pulih hanya untuk 5xx, serentak hanya di queue", () => {
    expect(cariAcuan({ ...Q, error: 60, jenis: "4xx-gagal", pulih: "sementara", serentak: 4 }, acuan)).toBe("x");
    expect(cariAcuan({ ...Q, error: 60, jenis: "4xx-gagal", serentak: 1 }, acuan)).toBeNull();
    expect(cariAcuan({ ...S, serentak: 4 }, acuan)).toBe("y");
    expect(cariAcuan({ ...S, pulih: "terus" }, acuan)).toBeNull();
    for (const beda of [{ jalur: "queue" as const }, { error: 90 }, { latensi: 2 }, { jenis: "4xx-gagal" as const }, { breaker: false }]) {
      expect(samaAcuan({ ...S, ...beda }, acuan[1]!), JSON.stringify(beda)).toBe(false);
    }
  });
});
