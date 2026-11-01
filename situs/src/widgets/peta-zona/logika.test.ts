import { describe, expect, it } from "vitest";
import mentah from "../../../data/widget/t5-zona.json";
import { DataZona, ZONA_ID, type ZonaId } from "./skema";
import { barisTabel, belumDibuka, diungkap, isi, jawaban, jumlahOrang, jumlahRusak, jumlahRusakSemua, kejadianDi, ringkasan, sebut, terisi, zonaUang } from "./logika";

const d = DataZona.parse(mentah);
const set = (...z: ZonaId[]) => new Set<ZonaId>(z);
const klon = () => JSON.parse(JSON.stringify(mentah));

describe("peta zona: isi dan sebut", () => {
  it("isi mengganti semua {kunci} dan menolak kunci yang tidak diberi nilai", () => {
    expect(isi("a {x} b {y} {x}", { x: 1, y: "z" })).toBe("a 1 b z 1");
    expect(() => isi("a {x}", { y: 1 })).toThrow(/\{x\}/);
  });
  it("sebut: satu, dua, dan tiga butir", () => {
    expect(sebut([])).toBe("");
    expect(sebut(["a"])).toBe("a");
    expect(sebut(["a", "b"])).toBe("a dan b");
    expect(sebut(["a", "b", "c"])).toBe("a, b, dan c");
  });
});

describe("peta zona: zona uang dan jawaban tebakan", () => {
  it("zona tempat uang bergerak = service (ledger) dan data (primary), urutan zona", () => {
    expect(zonaUang(d)).toEqual(["service", "data"]);
  });
  it("jawaban hanya dibuka sesudah menebak dan sesudah semua zona uang dibuka, apa pun urutannya", () => {
    expect(diungkap(d, null, set("service", "data"))).toBe(false);
    expect(diungkap(d, 0, set())).toBe(false);
    expect(diungkap(d, 0, set("service"))).toBe(false);
    expect(diungkap(d, 0, set("data"))).toBe(false);
    expect(diungkap(d, 0, set("client", "edge", "operasi"))).toBe(false);
    expect(diungkap(d, 0, set("service", "data"))).toBe(true);
    expect(diungkap(d, 1, set("data", "service", "client"))).toBe(true);
  });
  it("belumDibuka menyebut zona uang yang tersisa", () => {
    expect(belumDibuka(d, set("client")).map((z) => z.id)).toEqual(["service", "data"]);
    expect(belumDibuka(d, set("service")).map((z) => z.id)).toEqual(["data"]);
    expect(belumDibuka(d, set("service", "data"))).toEqual([]);
  });
  it("jawaban: kosong, petunjuk, lalu benar atau belum tepat dengan alasan", () => {
    expect(jawaban(d, null, set("service", "data"))).toEqual({ jenis: "kosong", teks: "" });
    expect(jawaban(d, 0, set("client"))).toEqual({ jenis: "lanjut", teks: "Buka zona service dan data untuk melihat jawabannya." });
    expect(jawaban(d, 0, set("service"))).toEqual({ jenis: "lanjut", teks: "Buka zona data untuk melihat jawabannya." });
    const salah = jawaban(d, 0, set("service", "data"));
    expect(salah.jenis).toBe("belum");
    expect(salah.teks).toBe(`Belum tepat: ${d.tebak.alasan}`);
    const betul = jawaban(d, d.tebak.jawaban, set("service", "data"));
    expect(betul.jenis).toBe("benar");
    expect(betul.teks).toBe(`Tebakanmu benar: ${d.tebak.alasan}`);
  });
  it("jawaban tebakan ada di pilihan kedua (posisi divariasikan dari widget biaya)", () => {
    expect(d.tebak.jawaban).toBe(1);
  });
});

describe("peta zona: tabel kejadian", () => {
  it("delapan kejadian tersebar [client 0, edge 0, service 3, data 4, operasi 1]", () => {
    expect(d.kejadian).toHaveLength(8);
    expect(ZONA_ID.map((z) => kejadianDi(d, z).length)).toEqual([0, 0, 3, 4, 1]);
  });
  it("sebelum zona dibuka semua sel belum dibuka; membuka satu zona mengisi barisnya saja", () => {
    for (const b of barisTabel(d, set())) expect(b.sel.map((c) => c.s)).toEqual(["belum", "belum", "belum"]);
    const rows = barisTabel(d, set("operasi"));
    const terbuka = rows.filter((r) => r.sel[0]!.s !== "belum").map((r) => r.kejadian.masalah);
    expect(terbuka).toEqual(["M49"]);
    expect(rows.find((r) => r.kejadian.masalah === "M49")!.sel).toEqual([{ s: "tidak" }, { s: "rusak", alasan: "pod lain memakai nilai lama" }, { s: "tidak" }]);
  });
  it("zona tanpa kejadian (client, edge) tidak mengisi baris", () => {
    expect(terisi(d, set("client", "edge"))).toEqual([]);
    expect(barisTabel(d, set("client", "edge")).every((r) => r.sel.every((c) => c.s === "belum"))).toBe(true);
  });
  it("jumlah sel Rusak: 9 dari 24, per zona 0, 0, 4, 4, 1, per hal 3, 2, 4 (dihitung tangan dari tabel naskah)", () => {
    expect(jumlahRusakSemua(d)).toBe(9);
    expect(ZONA_ID.map((z) => jumlahRusak(d, set(z)))).toEqual([0, 0, 4, 4, 1]);
    const perHal = [0, 1, 2].map((i) => d.kejadian.filter((k) => k.sel[i]!.s === "rusak").length);
    expect(perHal).toEqual([3, 2, 4]);
    expect(d.kejadian.every((k) => k.sel.length === 3)).toBe(true);
    expect(jumlahRusak(d, set(...ZONA_ID))).toBe(jumlahRusakSemua(d));
  });
  it("tepat satu kejadian berlabel Tidak dijalankan (M47) dan sisanya Asumsi", () => {
    expect(d.kejadian.filter((k) => k.sumber === "tidak-dijalankan").map((k) => k.masalah)).toEqual(["M47"]);
    expect(d.kejadian.filter((k) => k.sumber === "asumsi")).toHaveLength(7);
  });
  it("ringkasan: kalimat tunggal dengan zona, jumlah kejadian, baris terisi, dan sel Rusak", () => {
    expect(ringkasan(d, null, set())).toBe(d.label.mulai);
    expect(ringkasan(d, "client", set("client"))).toBe("Zona client: tidak ada dari 8 kejadian yang berawal di sini; tabel terisi 0 dari 8, dengan 0 sel Rusak.");
    expect(ringkasan(d, "data", set("data"))).toBe("Zona data: 4 dari 8 kejadian berawal di sini; tabel terisi 4 dari 8, dengan 4 sel Rusak.");
    expect(ringkasan(d, "operasi", set("data", "service", "operasi"))).toBe("Zona operasi: 1 dari 8 kejadian berawal di sini; tabel terisi 8 dari 8, dengan 9 sel Rusak.");
  });
});

describe("peta zona: tim", () => {
  it("delapan tim berjumlah 28 orang: enam tim 4 orang dan dua tim 2 orang", () => {
    expect(d.tim).toHaveLength(8);
    expect(jumlahOrang(d)).toBe(28);
    expect(d.tim.map((t) => t.orang)).toEqual([4, 4, 4, 4, 4, 4, 2, 2]);
  });
});

describe("peta zona: skema menolak data yang merusak pengikat antar bagian", () => {
  const tolak = (ubah: (x: any) => void, pesan: RegExp) => {
    const x = klon();
    ubah(x);
    const r = DataZona.safeParse(x);
    expect(r.success).toBe(false);
    if (!r.success) expect(JSON.stringify(r.error.issues)).toMatch(pesan);
  };
  it("data asli lolos", () => expect(DataZona.safeParse(mentah).success).toBe(true));
  it("urutan zona harus client, edge, service, data, operasi", () => tolak((x) => x.zona.reverse(), /harus client/));
  it("hanya dua komponen uang di dua zona", () => {
    tolak((x) => { x.zona[0].komponen[0].jenis = "uang"; }, /tepat dua komponen uang/);
    tolak((x) => { x.zona[3].komponen[0].jenis = "lain"; }, /tepat dua komponen uang/);
    tolak((x) => { x.zona[3].komponen[1].jenis = "uang"; }, /tepat dua komponen uang/);
  });
  it("komponen uang pertama harus service ledger", () => tolak((x) => { x.zona[2].komponen[0].jenis = "lain"; x.zona[2].komponen[1].jenis = "uang"; }, /service ledger/));
  it("tiap service tepat satu komponen di zona service", () => {
    tolak((x) => { delete x.zona[2].komponen[5].service; }, /tepat satu komponen/);
    tolak((x) => { x.zona[2].komponen[5].service = "akun"; }, /tepat satu komponen/);
    tolak((x) => { x.zona[0].komponen[0].service = "ledger"; }, /hanya zona service/);
  });
  it("tim dan service harus dikenal", () => {
    tolak((x) => { x.zona[0].tim[0] = "tak-ada"; }, /tidak dikenal/);
    tolak((x) => { x.service[0].tim = "tak-ada"; }, /tidak dikenal/);
  });
  it("sel rusak wajib beralasan dan sel lain tak boleh beralasan", () => {
    tolak((x) => { delete x.kejadian[0].sel[2].alasan; }, /alasan wajib/);
    tolak((x) => { x.kejadian[0].sel[0].alasan = "x"; }, /alasan wajib/);
  });
  it("kejadian di zona yang tidak ada, atau tebakan di luar pilihan, ditolak", () => {
    tolak((x) => { x.kejadian[0].zona = "gudang"; }, /zona|Invalid/);
    tolak((x) => { x.tebak.jawaban = 9; }, /di luar pilihan/);
  });
  it("templat tanpa penanda wajib ditolak", () => {
    tolak((x) => { x.label.ringkas = "Zona {zona}"; }, /templat tanpa/);
    tolak((x) => { x.label.lanjut = "Buka zona"; }, /templat tanpa/);
  });
  it("lebih dari enam komponen di satu zona ditolak", () => tolak((x) => { x.zona[3].komponen.push({ label: "Tujuh", jenis: "lain", catatan: "x" }); }, /too_big|Too big|6/));
});
