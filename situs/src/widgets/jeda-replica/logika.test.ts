// Tes logika murni widget jeda replica (W5-lag). Harapan ditulis literal dari aturan model (jeda terhingga <= selang bacaan = replica
// sudah memutar pembayaran), bukan dihitung dari fungsi yang diuji. Skema diuji dengan data termutasi.
import { describe, expect, it } from "vitest";
import mentah from "../../../data/widget/t5-lag.json";
import { DataLag } from "./skema";
import { acuanUntuk, akibatTeks, aturanDari, detikTeks, hitung, indeksJeda, isi, jawabanTebak, jedaDari, layarTeks, nilaiJeda, replicaSudah, ringkasan, rupiah, saldoBaru, tundaTeks } from "./logika";

const d = DataLag.parse(mentah);
const klon = () => JSON.parse(JSON.stringify(mentah));
const tolak = (ubah: (x: any) => void, pesan: RegExp) => {
  const x = klon();
  ubah(x);
  const r = DataLag.safeParse(x);
  expect(r.success).toBe(false);
  if (!r.success) expect(JSON.stringify(r.error.issues)).toMatch(pesan);
};

const JEDA = ["nol", "alami", "naskah", "batas", "ditahan"] as const;
const ATURAN = ["replica", "token", "remote_apply"] as const;
// kasus yang diharapkan: baris = aturan, kolom = jeda 0, 0,5, 2, 5 detik dan ditahan; selang bacaan 1 detik
const KASUS = {
  replica: ["sama", "sama", "lama", "lama", "lama"],
  token: ["sama", "sama", "keprimary", "keprimary", "keprimary"],
  remote_apply: ["sama", "tunda", "tunda", "tunda", "macet"],
} as const;

describe("model: tiga aturan baca pada lima jeda", () => {
  it("data memuat lima jeda berurutan dan tiga aturan berurutan", () => {
    expect(d.jeda.map((j) => j.id)).toEqual([...JEDA]);
    expect(d.jeda.map((j) => j.detik)).toEqual([0, 0.5, 2, 5, null]);
    expect(d.aturan.map((a) => a.id)).toEqual([...ATURAN]);
    expect(d.skenario).toEqual({ saldoAwal: 250000, bayar: 35000, barisAwal: 1, bacaDetik: 1 });
  });
  for (const a of ATURAN) {
    it(`kasus aturan ${a} di tiap jeda`, () => {
      expect(JEDA.map((j) => hitung(d, jedaDari(d, j), a).kasus)).toEqual([...KASUS[a]]);
    });
  }
  it("replica biasa: saldo dan riwayat lama selama jeda lebih lama dari selang bacaan, dari replica", () => {
    const h = hitung(d, jedaDari(d, "naskah"), "replica");
    expect(h).toEqual({ aturan: "replica", sumber: "replica", kasus: "lama", saldo: 250000, baris: 1, tunda: null });
    expect(hitung(d, jedaDari(d, "alami"), "replica")).toEqual({ aturan: "replica", sumber: "replica", kasus: "sama", saldo: 215000, baris: 2, tunda: null });
  });
  it("token LSN: saldo selalu baru; sumber primary selama replica belum sampai, replica sesudahnya", () => {
    for (const j of JEDA) expect(hitung(d, jedaDari(d, j), "token")).toMatchObject({ saldo: 215000, baris: 2 });
    expect(JEDA.map((j) => hitung(d, jedaDari(d, j), "token").sumber)).toEqual(["replica", "replica", "primary", "primary", "primary"]);
  });
  it("remote_apply: tidak pernah menampilkan saldo lama; harganya jeda sebagai waktu tunggu, dan jeda ditahan membuat bayar tidak selesai", () => {
    expect(JEDA.map((j) => hitung(d, jedaDari(d, j), "remote_apply").tunda)).toEqual([0, 0.5, 2, 5, null]);
    expect(hitung(d, jedaDari(d, "ditahan"), "remote_apply")).toEqual({ aturan: "remote_apply", sumber: "replica_sinkron", kasus: "macet", saldo: null, baris: null, tunda: null });
    for (const j of JEDA.slice(0, 4)) expect(hitung(d, jedaDari(d, j), "remote_apply")).toMatchObject({ sumber: "replica_sinkron", saldo: 215000, baris: 2 });
  });
  it("hanya replica biasa yang pernah menampilkan saldo lama, dan hanya remote_apply yang pernah membuat bayar menunggu", () => {
    const semua = ATURAN.flatMap((a) => JEDA.map((j) => hitung(d, jedaDari(d, j), a)));
    expect(semua.filter((h) => h.kasus === "lama").map((h) => h.aturan)).toEqual(["replica", "replica", "replica"]);
    expect(new Set(semua.filter((h) => h.tunda !== null && h.tunda > 0 || h.kasus === "macet").map((h) => h.aturan))).toEqual(new Set(["remote_apply"]));
  });
  it("batas selang bacaan: jeda sama dengan selang sudah sampai, sedikit lebih lama belum", () => {
    const j = (detik: number | null) => ({ id: "x", detik, label: "x", kalimat: "x" });
    expect(replicaSudah(d, j(1))).toBe(true);
    expect(replicaSudah(d, j(1.001))).toBe(false);
    expect(replicaSudah(d, j(0))).toBe(true);
    expect(replicaSudah(d, j(null))).toBe(false);
  });
  it("saldo baru = saldo awal dikurangi bayar, dan keadaan awal sesudah tebakan adalah kasus yang ditanyakan (lama)", () => {
    expect(saldoBaru(d)).toBe(215000);
    expect(d.awal).toEqual({ jeda: "naskah", aturan: "replica" });
    expect(hitung(d, jedaDari(d, d.awal.jeda), d.awal.aturan).kasus).toBe("lama");
    expect(indeksJeda(d, "naskah")).toBe(2);
    expect(indeksJeda(d, "tak-ada")).toBe(-1);
    expect(() => jedaDari(d, "tak-ada")).toThrow(/tak-ada/);
    expect(aturanDari(d, "token").label).toBe("Token LSN");
  });
});

describe("teks: format dan kalimat", () => {
  it("rupiah memakai titik ribuan; detik memakai koma desimal", () => {
    expect(rupiah(215000)).toBe("Rp215.000");
    expect(rupiah(250000)).toBe("Rp250.000");
    expect(rupiah(1000)).toBe("Rp1.000");
    expect(rupiah(999)).toBe("Rp999");
    expect(rupiah(1234567)).toBe("Rp1.234.567");
    expect(detikTeks(0.5)).toBe("0,5");
    expect(detikTeks(2)).toBe("2");
  });
  it("isi menolak templat dengan nama yang tidak diberi nilai", () => {
    expect(isi("{a} dan {b}", { a: 1, b: "x" })).toBe("1 dan x");
    expect(() => isi("{a} dan {c}", { a: 1 })).toThrow(/\{c\}/);
  });
  it("acuan: tiap pilihan mendapat rekaman atau Ilustrasi yang cocok, atau tidak sama sekali", () => {
    const n = (j: string, a: (typeof ATURAN)[number]) => acuanUntuk(d, jedaDari(d, j), a).map((x) => `${x.jenis}:${x.berkas}:${x.bagian}`);
    expect(n("nol", "replica")).toEqual([]);
    expect(n("nol", "remote_apply")).toEqual(["rekaman:sinkron.txt:B"]);
    expect(n("alami", "replica")).toEqual(["rekaman:jeda.txt:A"]);
    expect(n("alami", "remote_apply")).toEqual(["rekaman:jeda.txt:A", "rekaman:sinkron.txt:B"]);
    expect(n("naskah", "token")).toEqual(["ilustrasi:jeda.txt:A"]);
    expect(n("batas", "replica")).toEqual([]);
    expect(n("batas", "remote_apply")).toEqual([]);
    expect(n("ditahan", "replica")).toEqual(["rekaman:baca.txt:A"]);
    expect(n("ditahan", "token")).toEqual(["rekaman:baca.txt:B"]);
    expect(n("ditahan", "remote_apply")).toEqual(["rekaman:sinkron.txt:B"]);
  });
});

describe("fungsi teks: nilai kalimat diturunkan dari hasil hitung dan templat di data (tanpa kalimat literal)", () => {
  const semua = ATURAN.flatMap((a) => JEDA.map((j) => ({ a, j: jedaDari(d, j), h: hitung(d, jedaDari(d, j), a) })));
  it("ringkasan diawali label aturan dan kalimat jeda, memuat saldo di layar, nama sumber bacaan, dan saldo primary yang benar", () => {
    for (const { a, j, h } of semua) {
      const r = ringkasan(d, j, a);
      expect(r.startsWith(`${aturanDari(d, a).label}, ${j.kalimat}:`), r).toBe(true);
      if (h.saldo !== null) expect(r, r).toContain(rupiah(h.saldo));
      if (["lama", "sama", "tunda"].includes(h.kasus)) expect(r, r).toContain(`dari ${d.label.sumberNama[h.sumber]}`);
      if (h.kasus === "keprimary") expect(r, r).toContain(`dari ${d.label.sumberNama.primary}`);
      if (h.kasus === "lama") { expect(r, r).toContain(rupiah(saldoBaru(d))); expect(r, r).toContain(rupiah(d.skenario.saldoAwal)); }
      if (h.kasus === "tunda") expect(r, r).toContain(tundaTeks(h));
      expect(r.includes(d.label.sumberNama.replica_sinkron), r).toBe(h.sumber === "replica_sinkron" && h.kasus !== "macet");
    }
  });
  it("sel Layar Budi memakai templat layar dengan saldo dan baris dari hasil; sel Akibat memakai templat kasus dan menyebut tunda", () => {
    for (const { h } of semua) {
      if (h.saldo === null) { expect(layarTeks(d, h)).toBe(d.label.layar.menunggu); continue; }
      expect(layarTeks(d, h)).toBe(isi(d.label.layar.saldo, { saldo: rupiah(h.saldo), baris: h.baris! }));
      expect(layarTeks(d, h)).toContain(`${h.baris} `);
    }
    for (const { h } of semua) {
      if (h.kasus === "tunda") expect(akibatTeks(d, h)).toContain(tundaTeks(h));
      else expect(akibatTeks(d, h)).toBe(d.label.akibat[h.kasus]);
    }
  });
  it("tunda ditulis dengan koma desimal dan satuan detik: detik hasil dibaca kembali sama dengan detik jeda", () => {
    for (const { j, h } of semua.filter((x) => x.h.tunda !== null)) {
      expect(tundaTeks(h)).toBe(`${detikTeks(j.detik!)} detik`);
      expect(tundaTeks(h)).not.toContain(".");
      expect(Number(tundaTeks(h).replace(" detik", "").replace(",", "."))).toBe(j.detik);
    }
    expect(tundaTeks({ ...semua[0]!.h, tunda: null })).toBe("");
  });
  it("jawaban tebakan: yang benar diawali label benar, yang lain label belum; nilai penggeser memuat label jeda", () => {
    d.tebak.pilihan.forEach((_, i) => expect(jawabanTebak(d, i).startsWith(i === d.tebak.jawaban ? d.label.benar : d.label.belum)).toBe(true));
    for (const j of d.jeda) expect(nilaiJeda(d, j)).toContain(j.label);
  });
});

describe("skema: cabang yang menolak data rusak", () => {
  it("id jeda ganda, detik tidak naik, null bukan di akhir, dan jeda awal tak dikenal ditolak", () => {
    tolak((x) => { x.jeda[1].id = x.jeda[0].id; }, /id jeda ganda/);
    tolak((x) => { x.jeda[2].detik = x.jeda[1].detik; }, /naik tegas/);
    tolak((x) => { x.jeda[1].detik = null; }, /hanya jeda terakhir/);
    tolak((x) => { x.jeda[4].detik = 9; }, /hanya jeda terakhir/);
    tolak((x) => { x.awal.jeda = "tak-ada"; }, /jeda awal tidak dikenal/);
  });
  it("urutan aturan, bayar yang tidak lebih kecil dari saldo, dan jawaban di luar pilihan ditolak", () => {
    tolak((x) => { [x.aturan[0], x.aturan[1]] = [x.aturan[1], x.aturan[0]]; }, /aturan ke-1 harus replica/);
    tolak((x) => { x.skenario.bayar = x.skenario.saldoAwal; }, /bayar harus lebih kecil/);
    tolak((x) => { x.tebak.jawaban = x.tebak.pilihan.length; }, /di luar pilihan/);
    tolak((x) => { x.tebak.pilihan = x.tebak.pilihan.slice(0, 3); }, /too_small|too_big|Too small|exactly|3/i);
  });
  it("jumlah aturan selain tiga ditolak, dan templat ringkasan harus memuat {aturan} dan {jeda}", () => {
    tolak((x) => { x.aturan = x.aturan.slice(0, 2); }, /too_small|Too small|exactly|3/i);
    tolak((x) => { x.label.ringkas.macet = "{aturan}: bayar belum selesai."; }, /templat tanpa \{jeda\}/);
    tolak((x) => { x.label.ringkas.macet = "{jeda}: bayar belum selesai."; }, /templat tanpa \{aturan\}/);
  });
  it("acuan ke jeda yang tak dikenal ditolak", () => {
    tolak((x) => { x.acuan[0].jeda = "tak-ada"; }, /jeda tak-ada tidak dikenal/);
  });
  it("templat tanpa nama yang dibutuhkan ditolak, untuk tiap templat", () => {
    tolak((x) => { x.label.jeda.nilai = "jeda replica"; }, /templat tanpa \{jeda\}/);
    tolak((x) => { x.label.layar.saldo = "{saldo}"; }, /templat tanpa \{baris\}/);
    tolak((x) => { x.label.layar.saldo = "{baris}"; }, /templat tanpa \{saldo\}/);
    tolak((x) => { x.label.akibat.tunda = "bayar menunggu"; }, /templat tanpa \{tunda\}/);
    tolak((x) => { x.label.acuanBerkas = "{berkas}"; }, /templat tanpa \{bagian\}/);
    tolak((x) => { x.label.ringkas.lama = "{aturan}, {jeda}: {saldo} dari {sumber}."; }, /templat tanpa \{primary\}/);
    tolak((x) => { x.label.ringkas.tunda = "{aturan}, {jeda}: {saldo} dari {sumber}."; }, /templat tanpa \{tunda\}/);
    tolak((x) => { x.label.ringkas.sama = "{aturan}, {jeda}: {saldo}."; }, /templat tanpa \{sumber\}/);
    tolak((x) => { x.label.ringkas.keprimary = "{aturan}, {jeda}: replica belum sampai."; }, /templat tanpa \{saldo\}/);
    tolak((x) => { x.label.ringkas.macet = "{jeda}: bayar belum selesai."; }, /templat tanpa \{aturan\}/);
  });
  it("kunci asing ditolak (strict)", () => {
    tolak((x) => { x.asing = 1; }, /unrecognized|Unrecognized/);
    tolak((x) => { x.jeda[0].asing = 1; }, /unrecognized|Unrecognized/);
  });
});
