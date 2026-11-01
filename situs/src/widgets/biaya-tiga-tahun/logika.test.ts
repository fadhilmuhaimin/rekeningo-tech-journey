import { describe, expect, it } from "vitest";
import data from "../../../data/widget/t5-onprem-biaya.json";
import { DataBiaya } from "./skema";
import { berubah, hitung, infraCloud, jumlah, kesimpulan, kumulatif, perangkat, siapkan, titik, titikImpas, URUTAN } from "./logika";

const d = DataBiaya.parse(data);
const semua = siapkan(d).map(hitung);
const total = (i: number) => ({ cloud: jumlah(semua[i]!.cloud).total, onprem: jumlah(semua[i]!.onprem).total });

describe("model biaya tiga tahun: rumus", () => {
  it("cloud: infrastruktur naik 25% per tahun, orang dan risiko tetap", () => {
    const m = d.masukan;
    expect([1, 2, 3].map((t) => infraCloud(m, t))).toEqual([2400, 3000, 3750]);
    expect(semua[2]!.cloud.map((t) => [t.orang, t.migrasi, t.risiko])).toEqual([[2880, 0, 300], [2880, 0, 300], [2880, 0, 300]]);
  });
  it("on-prem: perangkat membeli kenaikan kapasitas, sewa tetap, migrasi hanya tahun 1", () => {
    const m = d.masukan;
    expect([1, 2, 3].map((t) => perangkat(m, t))).toEqual([3200, 800, 1000]);
    expect(semua[2]!.onprem.map((t) => [t.infra, t.orang, t.migrasi, t.risiko])).toEqual([
      [3700, 3840, 1200, 400],
      [1300, 3840, 0, 400],
      [1500, 3840, 0, 400],
    ]);
  });
  it("total tiap tahun = infrastruktur + orang + migrasi + risiko", () => {
    for (const h of semua) for (const t of [...h.cloud, ...h.onprem]) expect(t.total).toBe(t.infra + t.orang + t.migrasi + t.risiko);
  });
  it("jumlah tiga tahun dan kumulatif konsisten", () => {
    for (const h of semua) {
      expect(kumulatif(h.cloud).at(-1)).toBe(jumlah(h.cloud).total);
      expect(kumulatif(h.onprem).at(-1)).toBe(jumlah(h.onprem).total);
    }
  });
  it("semua hasil bulat untuk semua skenario", () => {
    for (const h of semua) for (const t of [...h.cloud, ...h.onprem]) for (const k of URUTAN) expect(Number.isInteger(t[k]), k).toBe(true);
  });
});

describe("skenario di data", () => {
  it("lima skenario: tanpa, satu, dua, empat orang tambahan, dan beban tumbuh 50%", () => {
    expect(d.skenario.map((s) => s.label)).toEqual(["Tanpa orang tambahan", "Satu orang tambahan", "Dua orang tambahan", "Empat orang tambahan", "Beban tumbuh 50% per tahun"]);
    expect(siapkan(d).map((m) => [m.orangTambahan, m.tumbuh])).toEqual([[0, 25], [1, 25], [2, 25], [4, 25], [2, 50]]);
  });
  it("total tiga tahun: cloud 18.690 (20.940 bila tumbuh 50%), on-prem 17.540, 18.980, 20.420, 23.300, 22.620", () => {
    expect([0, 1, 2, 3, 4].map((i) => total(i))).toEqual([
      { cloud: 18690, onprem: 17540 },
      { cloud: 18690, onprem: 18980 },
      { cloud: 18690, onprem: 20420 },
      { cloud: 18690, onprem: 23300 },
      { cloud: 20940, onprem: 22620 },
    ]);
  });
  it("titik impas: tahun 3 hanya tanpa orang tambahan", () => {
    expect(semua.map(titikImpas)).toEqual([3, null, null, null, null]);
  });
  it("satu orang tambahan (480 × 3 = 1.440) melebihi selisih tanpa orang tambahan (1.150), dan membalikkan urutan", () => {
    const m = d.masukan;
    const satuOrang = m.biayaOrang * 3;
    const selisih = total(0).cloud - total(0).onprem;
    expect(satuOrang).toBe(1440);
    expect(selisih).toBe(1150);
    expect(satuOrang).toBeGreaterThan(selisih);
    expect(total(1).onprem - total(1).cloud).toBe(290);
  });
  it("tumbuh 50% memindahkan keduanya: selisih dasar 1.730 menjadi 1.680, urutan tetap", () => {
    expect(total(2).onprem - total(2).cloud).toBe(1730);
    expect(total(4).onprem - total(4).cloud).toBe(1680);
  });
  it("tebak: jawaban ketiga, dibuka oleh skenario pertama, alasan memuat angka hitungan", () => {
    expect(d.tebak).toMatchObject({ jawaban: 2, skenario: 0 });
    expect(d.tebak.alasan).toContain(titik(total(0).cloud - total(0).onprem));
    expect(d.tebak.alasan).toContain(titik(d.masukan.biayaOrang * 3));
  });
  it("berubah: dari dasar ke tanpa orang tambahan hanya komponen orang dan total yang berganti", () => {
    expect(berubah(semua[2]!, semua[0]!)).toEqual(["orang", "total"]);
    expect(berubah(semua[2]!, semua[4]!)).toEqual(["infra", "total"]);
  });
});

describe("kalimat kesimpulan", () => {
  it("dari templat data, dengan angka tepat", () => {
    expect(kesimpulan(d.label.kesimpulan, semua[0]!)).toBe("On-prem lebih hemat 1.150 juta rupiah dalam tiga tahun, dengan kumulatif lebih rendah sejak tahun 3.");
    expect(kesimpulan(d.label.kesimpulan, semua[2]!)).toBe("Cloud lebih hemat 1.730 juta rupiah dalam tiga tahun, dan kumulatif on-prem tidak pernah lebih rendah.");
  });
  it("cabang cloud hemat tetapi on-prem sempat lebih rendah, dan cabang sama", () => {
    const h = { cloud: [t(10), t(10), t(10)], onprem: [t(5), t(5), t(30)] };
    expect(titikImpas(h)).toBe(1);
    expect(kesimpulan(d.label.kesimpulan, h)).toContain("walau kumulatif on-prem lebih rendah sejak tahun 1");
    expect(kesimpulan(d.label.kesimpulan, { cloud: [t(10)], onprem: [t(10)] })).toBe("Biaya tiga tahun sama, 10 juta rupiah.");
  });
  it("titik impas memakai selisih ketat: kumulatif yang sama di tahun 1 bukan impas, impas jatuh di tahun 2", () => {
    const h = { cloud: [t(10), t(10), t(10)], onprem: [t(10), t(5), t(5)] };
    expect(titikImpas(h)).toBe(2);
    expect(titikImpas({ cloud: [t(10), t(10), t(10)], onprem: [t(10), t(10), t(10)] })).toBeNull();
  });
  it("titik: ribuan dengan titik, minus dengan tanda minus", () => {
    expect([titik(18690), titik(999), titik(0), titik(-1150)]).toEqual(["18.690", "999", "0", "−1.150"]);
  });
});

describe("skema", () => {
  it("menolak jawaban tebakan di luar pilihan, awal di luar skenario, dan jawaban yang sudah terbuka di awal", () => {
    expect(DataBiaya.safeParse({ ...data, tebak: { ...data.tebak, jawaban: 4 } }).success).toBe(false);
    expect(DataBiaya.safeParse({ ...data, awal: 9 }).success).toBe(false);
    expect(DataBiaya.safeParse({ ...data, awal: 0 }).success).toBe(false);
  });
  it("menolak kunci asing dan masukan pecahan", () => {
    expect(DataBiaya.safeParse({ ...data, tambahan: 1 }).success).toBe(false);
    expect(DataBiaya.safeParse({ ...data, masukan: { ...data.masukan, sewa: 500.5 } }).success).toBe(false);
  });
});

function t(total: number) {
  return { infra: total, orang: 0, migrasi: 0, risiko: 0, total };
}

describe("urutan komponen di tabel widget", () => {
  it("infrastruktur, orang operasi, migrasi, risiko, lalu total (tabel halaman dan alat ukur memakai urutan yang sama)", () => {
    expect(URUTAN).toEqual(["infra", "orang", "migrasi", "risiko", "total"]);
    expect(Object.keys(d.label.komponen)).toEqual(URUTAN);
  });
});
