// Penjaga teks widget fan-out (W5-fanout): kata bilangan dan label dihitung dari data, satu kata per konsep (perangkat, pengumuman,
// consumer, partisi), kalimat paling banyak 25 kata, sapaan "kamu", dan istilah teknis dalam penanda translate="no". Baris sumber tiap
// kalimat yang dikunci literal ada di komentar di dekatnya.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import mentah from "../../../data/widget/t5-fanout.json";
import zona from "../../../data/widget/t5-zona.json";
import lag from "../../../data/widget/t5-lag.json";
import biaya from "../../../data/widget/t5-onprem-biaya.json";
import { DataFanOut } from "./skema";
import { durasiTeks, hitung, penerimaDari, pengirimDari, ribuan } from "./logika";

const d = DataFanOut.parse(mentah);

/** Semua string di data yang dibaca pembaca: kunci "bukti" (baris rekaman yang dikutip persis), "berkas", "bagian", "id", "jenis", "dasar", dan "kuota" tidak dihitung. */
const teksPembaca = (x: unknown, kunci = ""): string[] => {
  if (typeof x === "string") return ["bukti", "berkas", "bagian", "id", "jenis", "dasar", "kuota", "penerima", "pengirim"].includes(kunci) && !["label", "teks"].includes(kunci) ? [] : [x];
  if (Array.isArray(x)) return x.flatMap((y) => teksPembaca(y, kunci));
  if (x && typeof x === "object") return Object.entries(x).flatMap(([k, v]) => teksPembaca(v, k));
  return [];
};
const SEMUA = teksPembaca(mentah);
const kalimatDari = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z])/);
const kata = (t: string) => t.trim().split(/\s+/).length;

describe("teks widget: label dari data", () => {
  it("caption menyebut dua jumlah partisi; dua kelompok dan enam kolom tabel", () => {
    expect(d.label.tabel.caption).toBe("Pengumuman yang sama dengan dua jumlah partisi");
    expect(Object.keys(d.label.kelompok)).toHaveLength(2);
    expect(Object.keys(d.label.tabel.kolom)).toHaveLength(6);
  });
  it("label sumber yang dipakai widget ada di /cara-pakai/ (Rekaman lab, Asumsi, Tidak dijalankan) dan dasar memuat Tidak dijalankan atau Asumsi", () => {
    const carapakai = fs.readFileSync(path.resolve(__dirname, "../../content/docs/cara-pakai.mdx"), "utf8");
    for (const l of [d.label.acuanJenis.rekaman, d.label.acuanJenis.asumsi]) expect(carapakai, l).toContain(`**${l}**`);
    expect(carapakai).toContain("**Tidak dijalankan**");
    expect(d.label.dasar.kode).toContain("Tidak dijalankan");
    expect(d.label.dasar.dokumentasi).toContain("Tidak dijalankan");
    expect(d.label.dasar.rancangan).toContain("Asumsi");
  });
  it("posisi jawaban benar berbeda dari tebakan Tahap 5 lain (jeda replica, zona, biaya): empat pilihan, jawaban di pilihan pertama", () => {
    expect(d.tebak.jawaban).toBe(0);
    for (const lain of [lag.tebak.jawaban, zona.tebak.jawaban, biaya.tebak?.jawaban]) expect(d.tebak.jawaban).not.toBe(lain);
  });
  it("chip sumber didefinisikan di kalimat pertama catatan sumber dan bukan label Rekaman lab atau Asumsi", () => {
    expect(d.sumber.teks.startsWith(`Jumlah perangkat dan jumlah pengirim yang kamu ubah adalah ${d.label.sumber}.`)).toBe(true);
    expect(d.label.sumber).not.toBe(d.label.acuanJenis.rekaman);
    expect(d.label.sumber).not.toBe(d.label.acuanJenis.asumsi);
  });
});

describe("teks widget: gaya bahasa", () => {
  it("satu kata per konsep: perangkat, pengumuman, consumer, partisi, pengirim, notifikasi (tanpa HP, konsumen, partition, sender, pemberitahuan, siaran)", () => {
    const gabung = SEMUA.join(" ");
    for (const salah of [/\bHP\b/, /\bkonsumen\b/i, /\bpartition\b/i, /\bsender\b/i, /\bpemberitahuan\b/i, /\bsiaran\b/i, /\bdevice\b/i, /\blayanan\b/i, /\bpembeli\b/i]) expect(gabung).not.toMatch(salah);
    for (const benar of ["perangkat", "pengumuman", "consumer", "partisi", "pengirim", "notifikasi", "kuota"]) expect(gabung.match(new RegExp(`\\b${benar}\\b`, "gi"))!.length, benar).toBeGreaterThanOrEqual(3);
  });
  it("kalimat paling banyak 25 kata, tanpa tanda seru, tanpa 'kita', 'Anda', 'pengguna', dan tanpa emoji", () => {
    const panjang = SEMUA.flatMap(kalimatDari).filter((k) => kata(k) > 25);
    expect(panjang).toEqual([]);
    expect(SEMUA.filter((t) => /!|\b(kita|Anda|pengguna)\b/i.test(t))).toEqual([]);
    expect(SEMUA.filter((t) => /\p{Extended_Pictographic}/u.test(t))).toEqual([]);
  });
  it("tak ada kalimat yang sama dua kali dalam satu teks, dan tak ada dua teks pembaca yang persis sama (kecuali label nama)", () => {
    for (const t of SEMUA) {
      const kal = kalimatDari(t).map((k) => k.trim());
      expect(new Set(kal).size, t.slice(0, 50)).toBe(kal.length);
    }
    const ganda = SEMUA.filter((t, i) => SEMUA.indexOf(t) !== i && kata(t) > 3);
    expect(ganda).toEqual([]);
  });
  it("paragraf paling banyak empat kalimat, dan sapaan 'kamu' dipakai di catatan sumber dan pertanyaan tebakan", () => {
    expect(SEMUA.filter((t) => kalimatDari(t).length > 4)).toEqual([]);
    expect(d.sumber.teks).toContain("yang kamu ubah");
    expect(d.tebak.q).toContain("Kamu menambah");
    expect(d.label.benar).toContain("mu");
  });
  it("bendera lab berpola -kata-kata tercakup KODE di komponen, jadi tampil dengan translate=no (hanya -tanpa-backoff)", () => {
    const src = fs.readFileSync(path.join(__dirname, "FanOut.tsx"), "utf8");
    const kode = new RegExp(/const KODE = \/(.+)\/;/.exec(src)![1]!);
    const calon = SEMUA.flatMap((t) => t.match(/(?<![A-Za-z0-9])-[a-z]+(?:-[a-z]+)+\b|\b\w+\(\)|\b[A-Za-z]+_[a-z_]+\b/g) ?? []);
    expect([...new Set(calon)].sort()).toEqual(["-tanpa-backoff"]);
    for (const c of calon) expect(c.replace(kode, "").length, c).toBeLessThan(c.length);
    expect(src).toContain('<code key={i} translate="no">');
  });
  it("tak ada nama merek nyata di teks pembaca (penyedia push, bukan nama produknya)", () => {
    expect(SEMUA.filter((t) => /\b(FCM|Firebase|Google|APNs|Apple|Redpanda|Confluent)\b/.test(t))).toEqual([]);
  });
});

describe("teks widget: angka dan label diturunkan dari skenario dan pilihan", () => {
  const n = penerimaDari(d, d.awal.penerima);
  const p = pengirimDari(d, d.awal.pengirim);
  const lab = hitung(d, n, p, "lab");
  const sebanyak = hitung(d, n, p, "sebanyak");
  it("pertanyaan tebakan memuat penerima awal, pengirim sebelum dan sesudah, consumer, dan partisi lab dari skenario", () => {
    expect(d.tebak.q).toContain(`Pengumuman ke ${ribuan(n.jumlah)} perangkat.`);
    expect(d.tebak.q).toContain(`dari ${d.pengirim[0]!.jumlah} menjadi ${p.jumlah} (${sebanyak.consumer} consumer)`);
    expect(d.tebak.q).toContain(`topik tetap punya ${d.skenario.partisiLab} partisi seperti di lab`);
  });
  it("alasan tebakan: consumer menganggur, pengirim aktif, hitungan detik, dan jam sama dengan model", () => {
    const { detikKirim: t, serentak: c } = d.skenario;
    expect(d.tebak.alasan).toContain(`${sebanyak.consumer - lab.bekerja} dari ${sebanyak.consumer} consumer`);
    expect(d.tebak.alasan).toContain(`dengan ${c} pengirim berarti ${lab.pengirimAktif} pengirim`);
    expect(d.tebak.alasan).toContain(`${ribuan(n.jumlah)} × ${String(t).replace(".", ",")} ÷ ${lab.pengirimAktif} = ${ribuan(lab.detik)} detik, sekitar ${durasiTeks(lab.detik).replace(" jam", "")} jam`);
    expect(d.tebak.pilihan[d.tebak.jawaban]).toContain(durasiTeks(lab.detik));
    expect(d.tebak.pilihan[d.tebak.jawaban]).toContain(`hanya ${lab.bekerja} consumer`);
  });
  it("pilihan tebakan salah memakai angka model: 556,7 per detik, 20,8 jam (4 pengirim), kuota dari skenario", () => {
    const empat = hitung(d, n, d.pengirim[0]!, "sebanyak");
    expect(d.tebak.pilihan[1]).toContain(`${p.jumlah} pengirim mengirim ${String(Math.round(sebanyak.laju * 10) / 10).replace(".", ",")} perangkat per detik`);
    expect(d.tebak.pilihan[2]).toContain(durasiTeks(empat.detik));
    expect(d.tebak.pilihan[2]).toContain(`dengan ${d.pengirim[0]!.jumlah} pengirim`);
    expect(d.tebak.pilihan[1]).toContain(`Sekitar ${Math.round(sebanyak.detik / 60)} menit, karena`);
    expect(d.label.ringkas.kuota).toContain("jadi kelebihannya dijawab 429;");
    expect(d.label.akibat.kuota).toContain("permintaan per detik di atas kuota dijawab 429;");
    expect(d.tebak.pilihan[3]).toContain(`kuota ${ribuan(d.skenario.kuota)} per detik`);
    expect(d.tebak.pilihan[3]).toContain(`${p.jumlah} pengirim melewati`);
  });
  it("catatan sumber dan penggeser memakai nilai skenario: 0,3 detik, kuota 10.000, empat pengirim, satu menit", () => {
    const { detikKirim, kuota, serentak } = d.skenario;
    expect(d.sumber.teks).toContain(`Lama kirim ${String(detikKirim).replace(".", ",")} detik per pengiriman dan kuota ${ribuan(kuota)} per detik adalah Asumsi naskah`);
    expect(d.label.pengirim.petunjuk).toContain(`Tiap consumer memegang ${serentak} pengirim`);
    // 5.000 pengirim × (1 ÷ 0,3) × 60 detik = 1.000.020 perangkat: satu menit untuk 1.000.000 perangkat
    const lima = d.pengirim.at(-1)!;
    expect(Math.round(((lima.jumlah / detikKirim) * 60) / 1000) * 1000).toBe(d.penerima.at(-1)!.jumlah);
    expect(d.label.pengirim.petunjuk).toContain(`Pada ${ribuan(lima.jumlah)} pengirim, ${ribuan(d.penerima.at(-1)!.jumlah)} perangkat selesai dalam satu menit`);
    expect(d.label.pengirim.petunjuk).toContain(`${d.pengirim[1]!.jumlah} pengirim sama dengan tiga consumer di lab`);
    expect(d.pengirim[1]!.jumlah / serentak).toBe(3);
  });
  it("label penerima pertama menyebut lab dan jumlahnya sama dengan perangkat aktif di rekaman; label lain sama dengan jumlah berformat titik", () => {
    expect(d.penerima.map((x) => x.label)).toEqual(d.penerima.map((x, i) => (i === 0 ? `${ribuan(x.jumlah)} (lab)` : ribuan(x.jumlah))));
    expect(d.pengirim.map((x) => x.label)).toEqual(d.pengirim.map((x) => ribuan(x.jumlah)));
  });
  it("kolom Antrean tiap partisi dan Consumer bekerja disebut persis dengan nama konsep di kalimat akibat", () => {
    expect(d.label.akibat.partisi).toContain("consumer menganggur");
    expect(d.label.akibat.kuota).toContain("dijawab 429");
    expect(d.label.sel.consumer).toBe("{bekerja} dari {consumer}");
  });
});
