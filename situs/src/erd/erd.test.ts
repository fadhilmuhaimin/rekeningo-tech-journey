import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DataErd } from "./skema";
import { bagiDua, jumlahRujukan, kunciKolom, ringkasCek, ringkasIndex, ringkasTipe, tataBintang } from "./erd";

const mentah = () => JSON.parse(readFileSync(new URL("../../data/erd/tahap-1.json", import.meta.url), "utf8"));
const t1 = DataErd.parse(mentah());
const tabel = (nama: string) => t1.tabel.find((t) => t.nama === nama)!;

describe("skema ERD", () => {
  it("tahap-1.json lolos skema", () => expect(t1.tabel.map((t) => t.nama)).toEqual(["akun", "sesi", "topup", "transaksi", "koreksi"]));

  // Pemeriksa harus bisa gagal: setiap mutasi di bawah ditolak.
  const mutasi: [string, (d: any) => void][] = [
    ["foreign key ke tabel yang tidak ada", (d) => (d.tabel[1].fk[0].ke_tabel = "akun_lama")],
    ["foreign key ke kolom yang tidak ada", (d) => (d.tabel[1].fk[0].ke_kolom = ["nomor"])],
    ["primary key ke kolom yang tidak ada", (d) => (d.tabel[0].pk = ["nomor"])],
    ["kunci tambahan", (d) => (d.tabel[0].warna = "biru")],
    ["tabel ganda", (d) => d.tabel.push(d.tabel[0])],
    ["CHECK tidak terurut", (d) => d.tabel[0].cek.reverse()],
    ["wajib bukan boolean", (d) => (d.tabel[0].kolom[0].wajib = "ya")],
    ["sha256 rusak", (d) => (d.sumber.sha256 = "abc")],
    ["selisih di Tahap 1", (d) => (d.selisih = { terhadap: 1, tabel_baru: [], tabel_dihapus: [], kolom_baru: [], kolom_dihapus: [], kolom_berubah: [] })],
    ["format lain", (d) => (d.format = 2)],
  ];
  it.each(mutasi)("menolak: %s", (_n, ubah) => {
    const d = mentah();
    ubah(d);
    expect(DataErd.safeParse(d).success).toBe(false);
  });
});

describe("tata dan label", () => {
  it("Tahap 1 berbentuk bintang: akun dirujuk empat tabel lewat tujuh foreign key", () => {
    const { induk, anak } = tataBintang(t1);
    expect(induk.nama).toBe("akun");
    expect(anak.map((t) => t.nama)).toEqual(["sesi", "topup", "transaksi", "koreksi"]);
    expect(jumlahRujukan(t1, "akun")).toBe(7);
  });

  it("tata bintang menolak foreign key ke tabel selain induk", () => {
    const d = DataErd.parse(mentah());
    d.tabel[4].fk[0] = { ...d.tabel[4].fk[0], ke_tabel: "transaksi" };
    expect(() => tataBintang(d)).toThrow(/bukan akun/);
  });

  it("dua kolom menjaga urutan katalog", () => expect(bagiDua([1, 2, 3, 4, 5])).toEqual([[1, 2, 3], [4, 5]]));

  it("label kunci berupa teks", () => {
    expect(kunciKolom(tabel("akun"), "id")).toEqual([{ jenis: "PK", teks: "PK" }]);
    expect(kunciKolom(tabel("akun"), "saldo").map((k) => k.teks)).toEqual(["CHECK"]);
    expect(kunciKolom(tabel("akun"), "email").map((k) => k.teks)).toEqual(["UNIQUE"]);
    expect(kunciKolom(tabel("transaksi"), "ke").map((k) => k.teks)).toEqual(["FK → akun.id", "CHECK"]);
    expect(kunciKolom(tabel("akun"), "nama")).toEqual([]);
  });

  it("ringkasan teks dari katalog", () => {
    expect(ringkasTipe("timestamp with time zone")).toBe("timestamptz");
    expect(ringkasTipe("character varying(20)")).toBe("varchar(20)");
    expect(ringkasCek("jenis = ANY (ARRAY['karyawan'::text, 'warung'::text, 'admin'::text])")).toBe("jenis IN ('karyawan', 'warung', 'admin')");
    expect(ringkasCek("jenis <> 'warung'::text OR saldo <= 1500000")).toBe("jenis <> 'warung' OR saldo <= 1500000");
    expect(ringkasCek("length(TRIM(BOTH FROM alasan)) >= 20")).toBe("length(trim(alasan)) >= 20");
    expect(ringkasIndex("btree (dari, dibuat DESC)")).toBe("(dari, dibuat DESC)");
    expect(ringkasIndex("gin (data)")).toBe("gin (data)");
  });
});
