// Penjaga teks widget jeda replica (W5-lag): kata bilangan dan label dihitung dari data, satu kata per konsep (replica), kalimat paling
// banyak 25 kata, sapaan "kamu", dan istilah teknis dalam penanda translate="no". Baris sumber tiap kalimat yang dikunci literal ada di
// komentar di dekatnya.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import mentah from "../../../data/widget/t5-lag.json";
import zona from "../../../data/widget/t5-zona.json";
import biaya from "../../../data/widget/t5-onprem-biaya.json";
import { DataLag } from "./skema";
import { detikTeks, rupiah } from "./logika";

const d = DataLag.parse(mentah);
const BILANGAN: Record<number, string> = { 2: "dua", 3: "tiga", 4: "empat", 5: "lima", 6: "enam" };
const kapital = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** Semua string di data yang dibaca pembaca: kunci "bukti" (baris rekaman yang dikutip persis) dan "berkas" dan "id" tidak dihitung. */
const teksPembaca = (x: unknown, kunci = ""): string[] => {
  if (typeof x === "string") return ["bukti", "berkas", "bagian", "id", "jenis", "dasar"].includes(kunci) ? [] : [x];
  if (Array.isArray(x)) return x.flatMap((y) => teksPembaca(y, kunci));
  if (x && typeof x === "object") return Object.entries(x).flatMap(([k, v]) => teksPembaca(v, k));
  return [];
};
const SEMUA = teksPembaca(mentah);
const kalimatDari = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z])/);
const kata = (t: string) => t.trim().split(/\s+/).length;

describe("teks widget: kata bilangan dan label dari data", () => {
  it("caption menyebut jumlah aturan dalam kata; kolom tabel tiga", () => {
    expect(d.label.tabel.caption).toBe(`${kapital(BILANGAN[d.aturan.length]!)} aturan baca pada jeda ini`);
    expect(Object.keys(d.label.tabel.kolom)).toHaveLength(3);
  });
  it("label sumber yang dipakai widget ada di /cara-pakai/ (Rekaman lab, Ilustrasi, Asumsi, Tidak dijalankan)", () => {
    const carapakai = fs.readFileSync(path.resolve(__dirname, "../../content/docs/cara-pakai.mdx"), "utf8");
    for (const l of ["Rekaman lab", "Ilustrasi", "Asumsi", "Tidak dijalankan"]) expect(carapakai, l).toContain(l);
  });
  it("posisi jawaban benar berbeda dari tebakan Tahap 5 lain (zona, biaya): empat pilihan, jawaban di pilihan terakhir", () => {
    expect(d.tebak.jawaban).toBe(3);
    expect(d.tebak.jawaban).not.toBe(zona.tebak.jawaban);
    expect(d.tebak.jawaban).not.toBe(biaya.tebak?.jawaban);
  });
});

describe("teks widget: gaya bahasa", () => {
  it("replica, bukan replika, di semua teks pembaca (kecuali nama lab t5-replika dan nilai kepala yang dikutip persis)", () => {
    const sisa = SEMUA.map((t) => t.replace(/t5-replika/g, "")).filter((t) => /replika/i.test(t));
    expect(sisa).toEqual([]);
    expect(SEMUA.filter((t) => t.includes("t5-replika"))).toHaveLength(1);
    expect(SEMUA.join(" ").match(/\breplica\b/gi)!.length).toBeGreaterThan(20);
  });
  it("kalimat paling banyak 25 kata, tanpa tanda seru, tanpa 'kita', 'Anda', 'pengguna', dan tanpa emoji", () => {
    const panjang = SEMUA.flatMap(kalimatDari).filter((k) => kata(k) > 25);
    expect(panjang).toEqual([]);
    expect(SEMUA.filter((t) => /!|\b(kita|Anda|pengguna)\b/i.test(t))).toEqual([]);
    expect(SEMUA.filter((t) => /\p{Extended_Pictographic}/u.test(t))).toEqual([]);
  });
  it("paragraf paling banyak empat kalimat, dan sapaan 'kamu' dipakai di catatan sumber", () => {
    expect(SEMUA.filter((t) => kalimatDari(t).length > 4)).toEqual([]);
    expect(d.sumber.teks).toContain("yang kamu geser");
  });
  it("istilah teknis berpola kode (kepala HTTP, fungsi, pengaturan) tercakup KODE di komponen, jadi tampil dengan translate=no", () => {
    const src = fs.readFileSync(path.join(__dirname, "JedaReplica.tsx"), "utf8");
    const kode = new RegExp(/const KODE = \/(.+)\/;/.exec(src)![1]!);
    const calon = SEMUA.flatMap((t) => t.match(/\b\w+\(\)|\b[A-Za-z]+_[a-z_]+\b|\b[A-Z][A-Za-z]*(?:-[A-Z][a-z]+)+\b/g) ?? []);
    expect([...new Set(calon)].sort()).toEqual(["Content-Type", "Idempotency-Key", "X-Lsn-Tulis", "pg_current_wal_lsn()", "remote_apply", "synchronous_commit"]);
    for (const c of calon) expect(c.replace(kode, "").length, c).toBeLessThan(c.length);
  });
  it("label tombol aturan remote_apply dibungkus translate=no lewat penanda kode di data (hanya aturan itu)", () => {
    expect(d.aturan.map((a) => a.kode)).toEqual([false, false, true]);
    expect(d.aturan.filter((a) => a.kode).map((a) => a.label)).toEqual(["remote_apply"]);
  });
});

describe("teks widget: angka dan label diturunkan dari skenario, jeda, dan sumber label", () => {
  const { saldoAwal, bayar, bacaDetik, barisAwal } = d.skenario;
  const jedaAwal = d.jeda.find((j) => j.id === d.awal.jeda)!;
  it("label dan kalimat tiap jeda diturunkan dari detiknya; jeda ditahan memakai kata ditahan", () => {
    for (const j of d.jeda) {
      if (j.detik === null) expect([j.label, j.kalimat]).toEqual(["ditahan", "replay ditahan"]);
      else {
        expect(j.label).toBe(`${detikTeks(j.detik)} detik`);
        expect(j.kalimat).toBe(`jeda ${j.label}`);
      }
    }
  });
  it("pertanyaan dan alasan tebakan memuat jeda awal, selang bacaan, bayar, saldo awal, dan saldo baru yang sama dengan skenario", () => {
    expect(barisAwal).toBe(1);
    const jeda = detikTeks(jedaAwal.detik!);
    expect(d.tebak.q).toContain(`membayar ${rupiah(bayar)}`);
    expect(d.tebak.q).toContain(`menjadi ${rupiah(saldoAwal - bayar)}`);
    expect(d.tebak.q).toContain(`tertinggal ${jeda} detik`);
    expect(d.tebak.q).toContain(`membaca saldo ${bacaDetik} detik sesudah jawaban 201`);
    expect(d.tebak.alasan).toContain(`${jeda} detik sesudah COMMIT`);
    expect(d.tebak.alasan).toContain(`app membaca ${bacaDetik} detik sesudah jawaban 201`);
    expect(d.tebak.alasan).toContain(`saldo ${rupiah(saldoAwal)} dan riwayat satu baris`);
    expect(d.tebak.alasan).toContain(`primary sudah ${rupiah(saldoAwal - bayar)}`);
  });
  it("pilihan tebakan: hanya pilihan benar menyebut saldo lama, tepat satu pilihan menyebut saldo baru, dan pilihan benar menyebut replica", () => {
    const sebut = (n: number) => d.tebak.pilihan.map((p, i) => [i, p.includes(rupiah(n))] as const).filter(([, y]) => y).map(([i]) => i);
    expect(sebut(saldoAwal)).toEqual([d.tebak.jawaban]);
    expect(sebut(saldoAwal - bayar)).toHaveLength(1);
    expect(sebut(saldoAwal - bayar)[0]).not.toBe(d.tebak.jawaban);
    expect(d.tebak.pilihan[d.tebak.jawaban]).toContain("replica");
  });
  it("chip sumber didefinisikan di kalimat pertama catatan sumber dan bukan label Rekaman lab", () => {
    expect(d.sumber.teks.startsWith(`Jeda yang kamu geser adalah ${d.label.sumber}.`)).toBe(true);
    expect(d.label.sumber).not.toBe(d.label.acuanJenis.rekaman);
    expect(d.label.sumber).not.toBe(d.label.acuanJenis.ilustrasi);
  });
  it("nama label sumber dipakai persis seperti di /cara-pakai/: Rekaman lab, Ilustrasi, dan dasar yang memuat Tidak dijalankan atau Asumsi", () => {
    const carapakai = fs.readFileSync(path.resolve(__dirname, "../../content/docs/cara-pakai.mdx"), "utf8");
    for (const l of [d.label.acuanJenis.rekaman, d.label.acuanJenis.ilustrasi]) expect(carapakai, l).toContain(`**${l}**`);
    expect(d.label.dasar.kode).toContain("Tidak dijalankan");
    expect(d.label.dasar.dokumentasi).toContain("Tidak dijalankan");
    expect(d.label.dasar.rancangan).toContain("Asumsi");
    expect(carapakai).toContain("**Tidak dijalankan**");
    expect(carapakai).toContain("**Asumsi**");
  });
  it("kolom Layar Budi sama dengan frasa layar Budi di kalimat ringkasan, dan akibat ke primary menyebut nama sumber primary", () => {
    expect(d.label.ringkas.sama.toLowerCase()).toContain(d.label.tabel.kolom.layar.toLowerCase());
    expect(d.label.akibat.keprimary).toContain(d.label.sumberNama.primary);
    expect(d.label.akibat.lama).toContain("lama");
    // tokoh di judul widget dan di kolom layar adalah orang yang sama (kolom "Layar Budi", bukan "Layar")
    expect(d.judul).toContain("Budi");
    expect(d.label.tabel.kolom.layar).toContain("Budi");
  });
});
