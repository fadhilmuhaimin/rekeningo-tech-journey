// Penjaga angka dan teks widget outbox dan worker (W3-outbox, keputusan 983). logika.test.ts menjaga mesin dan
// rekaman.test.ts menjaga pembaca; tes ini menjaga yang dibaca pembaca: tidak ada angka yang diketik tangan di teks,
// setiap angka di teks turun dari rekaman (dibaca ulang di sini dengan cara sendiri), label cocok dengan mesin, dan
// satu perubahan di data, label, mode, atau rumus menggagalkan tes. Tanpa uji mutasi, penjaga hanya tampak menjaga.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import labelMentah from "../../../data/widget/t3-outbox-worker.json";
import { bacaAcuan } from "./rekaman";
import { AWAL, KNOB, kunciKonfig, konstanta, semuaKonfig, type NamaSkenario } from "./logika";
import { LabelOutbox } from "./skema";
import { NAMA, bangun, periksaLabel } from "./siap";

const akar = path.resolve(__dirname, "../../../..");
const baca = (f: string) => fs.readFileSync(path.join(akar, "labs/t3-outbox/output", f + ".txt"), "utf8");
const a = bacaAcuan({ transaksi: baca("transaksi"), kursor: baca("kursor"), ganda: baca("ganda"), retry: baca("retry"), queue: baca("queue") });
const k = konstanta(a);
const asli = (): LabelOutbox => LabelOutbox.parse(JSON.parse(JSON.stringify(labelMentah)));
const L = asli();

/** Semua string (bukan kunci) di JSON, dengan jalurnya. */
function teksSemua(x: unknown, jalur = ""): [string, string][] {
  if (typeof x === "string") return [[jalur, x]];
  if (Array.isArray(x)) return x.flatMap((v, i) => teksSemua(v, `${jalur}[${i}]`));
  if (x && typeof x === "object") return Object.entries(x).flatMap(([n, v]) => (n === "nilai" && typeof v !== "object" ? [] : teksSemua(v, `${jalur}.${n}`)));
  return [];
}
/** Semua string yang sampai ke pembaca sesudah mesin dan templat bekerja. */
function teksPembaca(s: NamaSkenario, label: LabelOutbox = L, kons = k): string[] {
  const b = bangun(s, label, kons);
  return [
    b.nama, b.tebak.pertanyaan, ...b.tebak.pilihan.flatMap((p) => [p.teks, p.alasan]),
    ...b.knob.flatMap((x) => [x.label, ...x.opsi.map((o) => o.teks)]),
    ...Object.values(b.hasil).flatMap((h) => [h.ringkas, h.acuan.label, h.acuan.teks, ...h.angka.flatMap((x) => [x.label, x.nilai]), ...h.garis.flatMap((e) => [e.waktu, e.lajur, e.teks])]),
  ];
}

describe("label cocok dengan mesin", () => {
  test("skema dan periksaLabel lolos untuk data asli", () => {
    expect(() => periksaLabel(L, k)).not.toThrow();
    expect(NAMA).toEqual(["cara", "kursor", "ulang", "ganda", "antrean"]);
  });
  test("tidak ada angka yang diketik tangan di teks (hanya {placeholder} dan kode 503)", () => {
    const sisa = teksSemua(labelMentah)
      .filter(([jalur]) => !/\.(kunci|id)$/.test(jalur)) // pengenal, bukan teks pembaca
      .map(([jalur, t]) => [jalur, t.replace(/\{\w+\}/g, "").replace(/\b503\b/g, "").replace(/t3-outbox/g, "").replace(/\bworker [12]\b/gi, "")] as const) // nama pelaku, bukan angka rekaman
      .filter(([, t]) => /\d/.test(t));
    expect(sisa).toEqual([]);
  });
  test("teks akhir tanpa placeholder, undefined, NaN, atau angka berformat Inggris", () => {
    for (const s of NAMA) for (const t of teksPembaca(s)) {
      expect(t, s).not.toMatch(/[{}]|undefined|NaN|Infinity/);
      expect(t.trim().length, s).toBeGreaterThan(0);
      expect(t, s).not.toMatch(/\d\.\d{1,2}\b(?!\d)/); // 13.33 harus 13,33; 10.000 (tiga digit) boleh
    }
  });
  test("ukuran data per skenario terjaga (props island)", () => {
    const ukuran = Object.fromEntries(NAMA.map((s) => [s, JSON.stringify(bangun(s, L, k)).length]));
    for (const s of NAMA) expect(ukuran[s]!, `${s}: ${JSON.stringify(ukuran)}`).toBeLessThan(45_000);
  });
  test("island tidak memuat Zod atau mesin, hanya tipe", () => {
    const tsx = fs.readFileSync(path.join(__dirname, "OutboxWorker.tsx"), "utf8");
    expect(tsx).not.toMatch(/from "zod"|from "\.\/logika"|from "\.\/skema"|from "\.\/rekaman"/);
    expect(tsx).toMatch(/import type \{ SkenarioSiap \} from "\.\/siap"/);
  });
});

describe("angka di teks turun dari rekaman", () => {
  const semua = (s: NamaSkenario) => teksPembaca(s).join("\n");
  const baris = (teks: string, frasa: string) => teks.split("\n").find((x) => x.includes(frasa))!;
  const idn = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);
  test("antrean: kapasitas, 750 detik, 400 promo, 317 per detik, 12,5 menit dari queue.txt", () => {
    const q = baca("queue");
    const t = semua("antrean");
    expect(baris(q, "c ÷ t = ")).toContain("13,33");
    expect(t).toContain("13,33 per detik");
    expect(baris(q, "10.000 ÷ 13,33 = ")).toContain("= 750 detik");
    expect(t).toContain("750 detik (12,5 menit)");
    expect(t).toContain("Dalam 30 detik terkirim 400 promo (4%)");
    expect(baris(q, "dibutuhkan 9.500 ÷ 30")).toContain("±317 per detik");
    expect(t).toContain("±317 per detik");
    expect(t).toContain("2.000 detik (33,33 menit)");
    expect(baris(q, "butuh 2.000 detik")).toContain("(33 menit)");
    expect(t).toContain("8,33 per detik");
    expect(t).toContain(idn(a.queue.nPromo) + " baris promo");
  });
  test("ulang: backoff 2, 4, 8, 16 dan batas lima dari retry.txt", () => {
    const t = semua("ulang");
    for (const tunggu of a.retry.batasBackoff) expect(t).toContain(`Coba lagi paling lama ${tunggu} detik lagi, acak antara nol dan ${tunggu}`);
    expect(t).toContain("klaim ke-6");
    expect(t).toContain("Klaim 6: percobaan melewati batas 5");
    expect(baris(baca("retry"), "klaim 6: diklaim")).toContain("percobaan = 6");
    expect(t).toContain("paling lama 30 detik");
    expect(t).toContain("paling lama 182 detik");
  });
  test("ganda: klaim 5 detik, 4 pesan untuk dua HP, 2 pesan untuk satu notifikasi_id", () => {
    const t = semua("ganda");
    expect(baris(baca("ganda"), "klaim 5 detik (bawaan)")).toBeTruthy();
    expect(t).toContain("Klaim berlaku 5 detik");
    expect(t).toContain("Klaim 0,3 detik habis");
    expect(t).toContain("Klaim berlaku 10 detik");
    expect(baris(baca("ganda"), "Klaim 300 ms")).toBeTruthy();
    expect(t).toContain("2 pesan sampai ke layanan push untuk satu notifikasi_id");
    expect(t).toContain("4 pesan sampai ke layanan push untuk satu notifikasi_id");
    expect(baris(baca("ganda"), "dua HP, dua worker")).toContain("4 pesan");
  });
  test("kursor dan cara: Rp25.000, Rp50.000, 3 detik batas push dari rekaman", () => {
    const kt = semua("kursor");
    expect(baris(baca("kursor"), "Budi mengirim Rp")).toContain("Rp25.000");
    expect(kt).toContain("Rp25.000");
    expect(kt).toContain("Rp50.000");
    expect(semua("cara")).toContain("menunggu paling lama 3 detik");
    expect(baris(baca("transaksi"), "push timeout")).toContain("push timeout 3s");
    expect(semua("cara")).toContain("Rp25.000");
  });
});

describe("uji mutasi: satu perubahan menggagalkan penjaga", () => {
  const salin = asli;
  test("label: peristiwa yang dipakai mesin dihapus", () => {
    const m = salin();
    delete m.skenario.ulang.peristiwa["gagal-mati"];
    expect(() => periksaLabel(m, k)).toThrow(/peristiwa "gagal-mati" tidak ada/);
  });
  test("label: teks mati yang tidak dipakai mesin", () => {
    const m = salin();
    m.skenario.cara.peristiwa["tidak-dipakai"] = "Teks yang tidak pernah muncul.";
    expect(() => periksaLabel(m, k)).toThrow(/tidak dipakai mesin: tidak-dipakai/);
  });
  test("label: placeholder yang tidak diisi", () => {
    const m = salin();
    m.skenario.antrean.peristiwa["promo-30"] = "Dalam {jendela} detik terkirim {tidakAda} promo.";
    expect(() => periksaLabel(m, k)).toThrow(/\{tidakAda\}/);
  });
  test("label: opsi knob tanpa teks atau berlebih", () => {
    const hilang = salin();
    delete hilang.skenario.antrean.knob[2]!.opsi["8"];
    expect(() => periksaLabel(hilang, k)).toThrow(/label opsi c=8 tidak ada/);
    const lebih = salin();
    lebih.skenario.cara.knob[0]!.opsi["kafka"] = "Kafka";
    expect(() => periksaLabel(lebih, k)).toThrow(/tanpa knob: kafka/);
  });
  test("label: angka diketik tangan terdeteksi penjaga digit", () => {
    const m = salin();
    m.skenario.antrean.peristiwa["promo-habis"] = "Seluruh promo terkirim sesudah 750 detik.";
    const sisa = teksSemua(m).map(([, t]) => t.replace(/\{\w+\}/g, "")).filter((t) => /\d/.test(t.replace(/\b503\b/g, "")));
    expect(sisa.length).toBeGreaterThan(0);
  });
  test("data: nilai pilihan tebakan diganti sehingga tidak ada yang cocok jawaban", () => {
    const m = salin();
    m.skenario.ulang.tebak.pilihan[1]!.nilai = 7;
    expect(() => periksaLabel(m, k)).toThrow(/tebakan: 0 pilihan sama dengan jawaban 5/);
  });
  test("data: nilai pilihan ganda", () => {
    const m = salin();
    m.skenario.kursor.tebak.pilihan[0]!.nilai = 1;
    expect(() => periksaLabel(m, k)).toThrow(/nilai pilihan ganda/);
  });
  test("data: jawaban benar bergeser ke pilihan lain", () => {
    const m = salin();
    const p = m.skenario.antrean.tebak.pilihan;
    [p[0]!.nilai, p[2]!.nilai] = [p[2]!.nilai, p[0]!.nilai];
    const b = bangun("antrean", m, k);
    expect(b.tebak.benar).toBe(2);
    expect(b.tebak.benar).not.toBe(bangun("antrean", L, k).tebak.benar);
  });
  test("rumus: batas percobaan di luar pilihan knob atau jawaban tebakan bergeser gagal keras", () => {
    expect(() => bangun("ulang", L, { ...k, maksPercobaan: 4 })).toThrow();
    expect(() => bangun("ulang", L, { ...k, maksPercobaan: 8 })).toThrow(/tebakan/);
  });
  test("rumus: t diganti menggeser jawaban tebakan antrean", () => {
    expect(() => bangun("antrean", L, { ...k, t: 0.6 })).toThrow(/tebakan/);
  });
  test("rumus: batas waktu push berubah mengubah teks yang dibaca pembaca", () => {
    const asliT = teksPembaca("cara").join("\n");
    const ubah = teksPembaca("cara", L, { ...k, pushTimeout: 4 }).join("\n");
    expect(asliT).toContain("menunggu paling lama 3 detik");
    expect(ubah).toContain("menunggu paling lama 4 detik");
    expect(ubah).not.toEqual(asliT);
    expect(teksPembaca("ganda", L, { ...k, pushTimeout: 4 }).join("\n")).not.toEqual(teksPembaca("ganda").join("\n"));
  });
  test("mode: konfigurasi awal dan jawaban tebakan tiap skenario berbeda antar mode", () => {
    for (const s of NAMA) {
      const dasar = bangun(s, L, k);
      const kunciAwal = kunciKonfig(s, AWAL[s]);
      expect(dasar.hasil[kunciAwal]).toBeTruthy();
      const lain = semuaKonfig(s).map((kf) => dasar.hasil[kunciKonfig(s, kf)]!.ringkas);
      expect(new Set(lain).size, `${s}: ringkasan harus berbeda antar konfigurasi`).toBeGreaterThan(Math.floor(lain.length / 2));
    }
    expect(KNOB.cara[0]!.opsi).toEqual(["langsung", "sesudah-commit", "outbox"]);
  });
});
