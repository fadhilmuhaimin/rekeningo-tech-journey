// Penjaga tambahan peta zona dari tinjauan W5-zona (keputusan 1685). Mutasi tinjauan menemukan dua belas mutan yang lolos penjaga awal:
// kata bilangan di judul dan caption (lima zona, delapan kejadian), label jenis komponen dan tanda uang, pencarian service dan tim,
// dan cabang skema yang tak diuji (id ganda, batas atas jawaban, jumlah pilihan, komponen service di zona selain client).
// Baris sumber tiap kalimat yang dikunci literal ada di komentar di dekatnya.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import mentah from "../../../data/widget/t5-zona.json";
import { DataZona } from "./skema";
import { serviceDari, timDari, zonaDari } from "./logika";

const d = DataZona.parse(mentah);
const AKAR = path.resolve(__dirname, "../../../..");
const LAYANAN = fs.readFileSync(path.join(AKAR, "labs/api-t5/layanan.sql"), "utf8");
const BILANGAN: Record<number, string> = { 3: "tiga", 5: "lima", 6: "enam", 8: "delapan" };
const kapital = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const klon = () => JSON.parse(JSON.stringify(mentah));
const tolak = (ubah: (x: any) => void, pesan: RegExp) => {
  const x = klon();
  ubah(x);
  const r = DataZona.safeParse(x);
  expect(r.success).toBe(false);
  if (!r.success) expect(JSON.stringify(r.error.issues)).toMatch(pesan);
};

describe("teks widget: kata bilangan dihitung dari data", () => {
  it("judul menyebut jumlah zona, caption jumlah kejadian dan jumlah hal, judul bagian tiga hal jumlah hal", () => {
    expect(d.judul).toBe(`Peta ${BILANGAN[d.zona.length]} zona Tahap 5`);
    expect(d.label.captionTabel).toBe(`${kapital(BILANGAN[d.kejadian.length]!)} kejadian lawan ${BILANGAN[d.label.tiga.length]} hal yang harus selalu benar`);
    expect(d.label.tigaJudul).toBe(`${kapital(BILANGAN[d.label.tiga.length]!)} hal yang harus selalu benar`);
    expect(d.label.kolom.hal.length).toBeGreaterThan(0);
  });
  it("catatan sumber menyebut jumlah kejadian dan jumlah service dalam kata yang sama dengan data", () => {
    expect(d.sumber.teks).toContain(`${BILANGAN[d.kejadian.length]} kejadian`);
    expect(d.sumber.teks).toContain(`${BILANGAN[d.service.length]} service`);
  });
});

describe("teks widget: label jenis komponen dan tanda uang", () => {
  it("tiga jenis: Tempat uang bergerak, Salinan, Tidak menulis posting; tanda uang bagian dari label jenis uang", () => {
    expect(d.label.jenis).toEqual({ uang: "Tempat uang bergerak", salinan: "Salinan", lain: "Tidak menulis posting" });
    expect(d.label.tandaUang).toBe("uang bergerak");
    expect(d.label.jenis.uang.toLowerCase()).toContain(d.label.tandaUang);
  });
  it("'Tidak menulis posting' untuk service selain ledger: hanya role t5_ledger yang diberi INSERT atas posting (sumber: labs/api-t5/layanan.sql)", () => {
    const baris = LAYANAN.split("\n").filter((l) => /^GRANT\b/.test(l) && /\bposting\b/.test(l) && /\bINSERT\b/.test(l));
    expect(baris).toHaveLength(1);
    expect(baris[0]).toMatch(/TO t5_ledger;/);
    expect(LAYANAN).not.toMatch(/ALL TABLES/);
    const lain = d.zona.flatMap((z) => z.komponen).filter((k) => k.jenis === "lain" && k.service);
    expect(lain.map((k) => k.service)).toEqual(["akun", "pembayaran", "merchant", "notifikasi", "cicilan"]);
  });
});

describe("logika: pencarian service, tim, dan zona", () => {
  it("serviceDari mencari menurut id service, bukan schema; timDari menurut id tim; zonaDari menolak id yang tak ada", () => {
    expect(serviceDari(d, "ledger")?.schema).toBe("t5_ledger");
    expect(serviceDari(d, "t5_ledger")).toBeUndefined();
    expect(timDari(d, "sre")?.orang).toBe(2);
    expect(timDari(d, "SRE")).toBeUndefined();
    expect(zonaDari(d, "data").label).toBe("data");
    expect(() => zonaDari(d, "gudang" as never)).toThrow(/gudang/);
  });
});

describe("skema: cabang yang semula tak diuji", () => {
  it("id kejadian, tim, dan service ganda ditolak", () => {
    tolak((x) => { x.kejadian[1].id = x.kejadian[0].id; }, /id kejadian ganda/);
    tolak((x) => { x.tim[1].id = x.tim[0].id; }, /id tim ganda/);
    tolak((x) => { x.service[1].id = x.service[0].id; }, /id service ganda/);
  });
  it("jawaban sama dengan jumlah pilihan ditolak (batas atas), dan kurang dari dua pilihan ditolak", () => {
    tolak((x) => { x.tebak.jawaban = x.tebak.pilihan.length; }, /di luar pilihan/);
    tolak((x) => { x.tebak.pilihan = [x.tebak.pilihan[0]]; x.tebak.jawaban = 0; }, /too_small|Too small|>=2|at least 2/i);
  });
  it("komponen bertanda service di zona edge, data, atau operasi ditolak, bukan hanya di client", () => {
    for (const i of [1, 3, 4]) tolak((x) => { x.zona[i].komponen[0].service = "ledger"; }, /hanya zona service/);
  });
});
