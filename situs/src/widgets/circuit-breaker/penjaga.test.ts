// Penjaga teks, data, dan rekaman widget breaker (W4-breaker, keputusan 1262): setiap angka yang dibaca pembaca berasal dari
// rekaman atau pengaturan yang dites; tidak ada angka rekaman yang ditulis tangan di data widget. Angka rekaman diturunkan di
// sini dengan pola sendiri (bukan rekaman.ts), lalu dibandingkan dengan pembaca rekaman, simulasi, dan teks yang tampil.
// Uji mutasi: satu angka di rekaman atau satu label di data widget diubah, pembaca atau tes ini harus gagal.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SIMULASI, aturanDari, bacaRekaman, daftarAcuan } from "./rekaman";
import { VONIS, isi, jalurVonis, kalimatVonis, ringkas, ringkasTeks } from "./logika";
import { KUNCI_ACUAN, LabelBreaker } from "./skema";
import { nilaiBuild, periksaTombol, siapkanTeks } from "./teks";
import labelMentah from "../../../data/widget/t4-circuit-breaker.json";

const DIR = path.resolve(__dirname, "../../../../labs/t4-integrasi");
const baca = (f: string) => fs.readFileSync(path.join(DIR, f), "utf8");
const TEKS = { breaker: baca("output/breaker.txt"), lajur: baca("output/lajur.txt"), worker: baca("output/worker.txt"), readme: baca("README.md") };
const bacaDari = (t: typeof TEKS) => bacaRekaman(t.breaker, t.lajur, t.worker, t.readme);
const R = bacaDari(TEKS);
const A = aturanDari(R);
const acuan = daftarAcuan(R);
const L = LabelBreaker.parse(labelMentah);
const T = siapkanTeks(L, R, acuan);

const dec = (s: string) => Number(s.replace(",", "."));
const ambil = (teks: string, pola: RegExp, nama: string): RegExpMatchArray => {
  const m = teks.match(pola);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const sendiri = {
  gagalKe: Number(ambil(TEKS.breaker, /gagal berturut-turut ke-(\d+): status open/, "gagal ke-")[1]),
  buka: Number(ambil(TEKS.breaker, /sesudah (\d+),001 detik: status half-open/, "Timeout")[1]),
  versi: ambil(TEKS.breaker, /gobreaker\/v2 (v\d+\.\d+\.\d+) dengan/, "versi")[1]!,
  empat: Number(ambil(TEKS.breaker, /IsSuccessful bawaan pustaka, (\d+) jawaban 4xx/, "4xx bawaan")[1]),
  pendaftar: Number(ambil(TEKS.lajur, /# (\d+) pendaftar mengajukan verifikasi/, "pendaftar")[1]),
  permintaanA: Number(ambil(TEKS.lajur, /# vendor mati: (\d+) permintaan masuk, 0 objek dibuat/, "permintaan A")[1]),
  permintaanBuka: Number(ambil(TEKS.lajur, /# vendor mati, breaker terbuka: (\d+) permintaan masuk/, "permintaan B buka")[1]),
  permintaanAkhir: Number(ambil(TEKS.lajur, /# sesudah vendor pulih: (\d+) permintaan masuk/, "permintaan B akhir")[1]),
  permintaanE: Number(ambil(TEKS.lajur, /# vendor sehat: (\d+) permintaan masuk, 4 objek dibuat/, "permintaan E")[1]),
  rusak: Number(ambil(TEKS.lajur, /^UPDATE (\d+)$/m, "rusak")[1]),
  serentak: Number(ambil(TEKS.worker, /\(kapasitas worker -serentak (\d+)\)/, "serentak")[1]),
  timeout: Number(ambil(TEKS.worker, /batas waktu client (\d+) detik\)\./, "timeout client")[1]),
  laju: dec(ambil(TEKS.worker, /verifikasi: (\d,\d+) per detik x/, "laju")[1]!),
  slot: dec(ambil(TEKS.worker, /= (\d,\d+) slot worker dari 4/, "slot")[1]!),
  bersama: dec(ambil(TEKS.worker, /bersama: [\d,]+ \+ [\d,]+ = (\d,\d+) dari 4 slot/, "bersama")[1]!),
  outage: ambil(TEKS.readme, /outage (\d+)\.(\d{3}) detik \(naskah M31\) memberi (\d+) permintaan percobaan, yaitu sampai (\d+) dari (\d+) pekerjaan/, "outage"),
};

describe("rekaman dibaca persis dan angkanya sama dengan pola sendiri", () => {
  it("ambang, Timeout, versi, dan 4xx dari breaker.txt", () => {
    expect([R.breaker.gagalKe, R.breaker.lebihDari, R.breaker.bukaDetik, R.breaker.versi, R.breaker.empatBawaan]).toEqual([sendiri.gagalKe, sendiri.gagalKe - 1, sendiri.buka, sendiri.versi, sendiri.empat]);
    expect([sendiri.gagalKe, sendiri.buka, sendiri.versi]).toEqual([6, 60, "v2.4.0"]);
  });
  it("pekerjaan, permintaan, dan worker dari lajur.txt dan worker.txt", () => {
    expect([R.lajur.pendaftar, R.lajur.a.permintaan, R.lajur.b.permintaanBuka, R.lajur.b.permintaanAkhir, R.lajur.e.permintaan, R.lajur.d.rusak]).toEqual([sendiri.pendaftar, sendiri.permintaanA, sendiri.permintaanBuka, sendiri.permintaanAkhir, sendiri.permintaanE, sendiri.rusak]);
    expect([sendiri.pendaftar, sendiri.permintaanA, sendiri.permintaanBuka, sendiri.permintaanAkhir, sendiri.permintaanE, sendiri.rusak]).toEqual([10, 50, 6, 15, 34, 6]);
    expect([R.worker.serentak, R.worker.timeoutClient, R.worker.laju, R.worker.slot, R.worker.bersama]).toEqual([sendiri.serentak, sendiri.timeout, sendiri.laju, sendiri.slot, sendiri.bersama]);
    expect([sendiri.serentak, sendiri.timeout, sendiri.laju, sendiri.slot, sendiri.bersama]).toEqual([4, 3, 0.116, 1.74, 4]);
  });
  it("hitungan outage dari README", () => {
    const o = sendiri.outage;
    expect([R.outage.detik, R.outage.probe, R.outage.matiMaks, R.outage.pekerjaan]).toEqual([Number(o[1]! + o[2]!), Number(o[3]), Number(o[4]), Number(o[5])]);
  });
  it("aturan simulasi: hanya vendor pulih dan benih yang bukan dari rekaman", () => {
    expect(A).toEqual({ gagalLebihDari: 5, bukaDetik: 60, maksHalfOpen: 1, timeout: 3, percobaan: 5, pekerjaan: 10, pulihDetik: SIMULASI.pulihDetik, benih: SIMULASI.benih });
    expect(SIMULASI).toEqual({ pulihDetik: 30, benih: 1 });
  });
});

describe("rekaman yang berubah bentuk atau angka menggagalkan pembaca", () => {
  const ubah = (k: keyof typeof TEKS, dari: string | RegExp, ke: string) => {
    const t = { ...TEKS, [k]: TEKS[k].replace(dari, ke) };
    if (t[k] === TEKS[k]) throw new Error(`mutasi tidak mengubah apa pun: ${String(dari)}`);
    return () => bacaDari(t);
  };
  const MUTASI: [string, () => unknown][] = [
    ["breaker: gagal ke-6 jadi ke-7", ubah("breaker", "ke-6: status open", "ke-7: status open")],
    ["breaker: status gagal ke-6 jadi closed", ubah("breaker", "ke-6: status open", "ke-6: status closed, hitungan gagal berturut-turut 6")],
    ["breaker: 59,999 jadi 49,999", ubah("breaker", "sesudah 59,999 detik", "sesudah 49,999 detik")],
    ["breaker: 60,001 jadi 70,001", ubah("breaker", "sesudah 60,001 detik", "sesudah 70,001 detik")],
    ["breaker: open lagi 59 jadi 29 detik", ubah("breaker", "59 detik sesudah membuka lagi", "29 detik sesudah membuka lagi")],
    ["breaker: 4xx bawaan 6 jadi 7", ubah("breaker", "bawaan pustaka, 6 jawaban", "bawaan pustaka, 7 jawaban")],
    ["breaker: 4xx kustom 6 jadi 5", ubah("breaker", "(4xx sukses), 6 jawaban", "(4xx sukses), 5 jawaban")],
    ["breaker: permintaan kedua tidak ditolak", ubah("breaker", "permintaan kedua: too many requests", "permintaan kedua: jalan")],
    ["lajur: 50 permintaan jadi 49", ubah("lajur", "vendor mati: 50 permintaan masuk", "vendor mati: 49 permintaan masuk")],
    ["lajur: 15 permintaan jadi 16", ubah("lajur", "sesudah vendor pulih: 15 permintaan", "sesudah vendor pulih: 16 permintaan")],
    ["lajur: 34 permintaan jadi 33", ubah("lajur", "vendor sehat: 34 permintaan", "vendor sehat: 33 permintaan")],
    ["lajur: 6 permintaan sebelum pulih jadi 7", ubah("lajur", "breaker terbuka: 6 permintaan", "breaker terbuka: 7 permintaan")],
    ["lajur: 10 pendaftar jadi 12", ubah("lajur", "# 10 pendaftar mengajukan", "# 12 pendaftar mengajukan")],
    ["lajur: UPDATE 6 jadi UPDATE 5", ubah("lajur", "UPDATE 6", "UPDATE 5")],
    ["lajur: mati 5 | 1 jadi 2 di bagian B", ubah("lajur", " mati     | 5         | 1\n", " mati     | 5         | 2\n")],
    ["lajur: lima percobaan jadi empat percobaan", ubah("lajur", "kapasitas 1, lima percobaan", "kapasitas 1, empat percobaan")],
    ["worker: slot 1,74 jadi 1,75", ubah("worker", "= 1,74 slot worker dari 4", "= 1,75 slot worker dari 4")],
    ["worker: laju 0,116 jadi 0,126", ubah("worker", "verifikasi: 0,116 per detik", "verifikasi: 0,126 per detik")],
    ["worker: 4,0 jadi 3,9", ubah("worker", "= 4,0 dari 4 slot", "= 3,9 dari 4 slot")],
    ["worker: batas waktu client 3 jadi 2", ubah("worker", "batas waktu client 3 detik).", "batas waktu client 2 detik).")],
    ["worker: persen 43,5 jadi 44,5", ubah("worker", "= 43,5% dari", "= 44,5% dari")],
    ["worker: notifikasi uang 2,26 jadi 2,27", ubah("worker", "= 2,26 slot", "= 2,27 slot")],
    ["readme: 210 jadi 211", ubah("readme", "memberi 210 permintaan percobaan", "memberi 211 permintaan percobaan")],
    ["readme: 42 jadi 41", ubah("readme", "sampai 42 dari 146", "sampai 41 dari 146")],
    ["readme: 146 jadi 147", ubah("readme", "sampai 42 dari 146", "sampai 42 dari 147")],
    ["readme: outage 12.600 jadi 12.660", ubah("readme", "outage 12.600 detik", "outage 12.660 detik")],
    ["readme: laju rata-rata 0,0116 jadi 0,0126", ubah("readme", "(0,0116 per detik rata-rata", "(0,0126 per detik rata-rata")],
  ];
  for (const [nama, f] of MUTASI) it(nama, () => expect(f).toThrow(/rekaman t4-integrasi/));
  it("versi pustaka mengikuti rekaman (kepala breaker.txt), bukan angka tetap di teks", () => {
    const baru = bacaDari({ ...TEKS, breaker: TEKS.breaker.replace("gobreaker/v2 v2.4.0", "gobreaker/v2 v2.5.0") });
    expect(baru.breaker.versi).toBe("v2.5.0");
    expect(nilaiBuild(baru).versi).toBe("v2.5.0");
    expect(() => bacaDari({ ...TEKS, breaker: TEKS.breaker.replace("gobreaker/v2 v2.4.0", "gobreaker/v2 2.4") })).toThrow(/versi gobreaker/);
  });
  it("bagian yang hilang gagal dengan nama bagiannya", () => {
    expect(() => bacaRekaman(TEKS.breaker.replace("# --- C. ", "# --- X. "), TEKS.lajur, TEKS.worker, TEKS.readme)).toThrow(/bagian breaker C/);
    expect(() => bacaRekaman(TEKS.breaker, TEKS.lajur, TEKS.worker.replace("# --- C. ", "# --- X. "), TEKS.readme)).toThrow(/bagian worker C/);
  });
});

/** Semua string dengan jalurnya di data widget. */
function daun(x: unknown, jalur = ""): [string, string][] {
  if (typeof x === "string") return [[jalur, x]];
  if (Array.isArray(x)) return x.flatMap((v, i) => daun(v, `${jalur}[${i}]`));
  if (x && typeof x === "object") return Object.entries(x).flatMap(([k, v]) => daun(v, jalur ? `${jalur}.${k}` : k));
  return [];
}
const SEMUA = daun(labelMentah);
// Nama yang diisi island saat dijalankan; sisanya diisi saat build dari rekaman.
const RUNTIME = new Set(["x", "n", "ditolak", "tunggu", "terkirim", "mati", "menunggu", "kevendor", "percobaan", "horizon", "awal", "kini", "dari", "sampai"]);
const nama = (t: string) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
const BUILD = nilaiBuild(R);

describe("data widget: tidak ada angka rekaman yang ditulis tangan", () => {
  it("angka di teks hanya 0 (backoff), 4xx dan 5xx, 429 dan 408 di catatan, dan nilai tombol", () => {
    const dibolehkan = (jalur: string, token: string): boolean => {
      if (/^pilihNilai\.(error|latensi|serentak)\[\d\]\.label$/.test(jalur)) return true;
      if (jalur === "catatan.empatSukses" && (token === "429" || token === "408")) return true;
      return token === "0" || token === "4" || token === "5";
    };
    const liar = SEMUA.flatMap(([jalur, t]) =>
      [...t.replace(/\{\w+\}/g, "").replace(/\b[45]xx\b/g, "").replace(/\b(?:breaker|lajur|worker)\.txt\b/g, "").matchAll(/\d+(?:[.,]\d+)?/g)].filter((m) => !dibolehkan(jalur, m[0])).map((m) => `${jalur}: ${m[0]}`),
    );
    expect(liar).toEqual([]);
  });
  it("setiap {nama} dikenal: diisi saat build dari rekaman atau diisi island", () => {
    for (const [jalur, t] of SEMUA) for (const n of nama(t)) expect(n in BUILD || RUNTIME.has(n), `${jalur}: {${n}}`).toBe(true);
  });
  it("teks yang diisi saat build tidak menyisakan kurung kurawal", () => {
    const sisa = [
      T.pertanyaan, ...T.pilihan.flatMap((p) => [p.teks, p.alasan]), ...T.opsi.pulih.map((o) => o.label), ...T.opsi.serentak.map((o) => o.label),
      ...Object.values(T.acuanTeks), ...Object.values(T.namaAcuan), ...Object.values(T.catatan), ...T.asal.butir, ...Object.values(T.hitungan),
    ].filter((t) => /[{}]/.test(t));
    expect(sisa).toEqual([]);
  });
  it("ID riset, nomor keputusan, dan nomor PR tidak tampil ke pembaca", () => {
    const semua = [...SEMUA.map(([, t]) => t), T.pertanyaan, ...Object.values(T.acuanTeks), ...Object.values(T.catatan), ...T.asal.butir, ...Object.values(T.hitungan)];
    for (const t of semua) { expect(t).not.toMatch(/\bR\d-\d+/); expect(t).not.toMatch(/\b(?:keputusan|PR|ADR) \d+/i); }
  });
  it("tanpa kata yang dilarang audit bahasa, tanpa tanda seru dan emoji", () => {
    const larang = /\b(basi|klien\w*|berkas\w*|pengguna|pemakai|Anda|kita|murah|mahal|bocor\w*)\b|!|\p{Extended_Pictographic}/iu;
    for (const [jalur, t] of SEMUA) expect(t.replace(/\{\w+\}/g, ""), jalur).not.toMatch(larang);
  });
  it("kalimat tidak lebih dari 25 kata", () => {
    for (const [jalur, t] of SEMUA) for (const k of t.split(/(?<=[.?])\s+/)) expect(k.split(/\s+/).length, `${jalur}: ${k}`).toBeLessThanOrEqual(25);
  });
});

describe("kalimat vonis (role=status) satu kalimat dan sesuai kategori", () => {
  it("tiap kategori di model punya kalimat, tanpa kelebihan", () => {
    expect(Object.keys(L.vonis).sort()).toEqual([...VONIS].sort());
  });
  it("tiap kalimat berakhir titik dan tanpa titik di tengah", () => {
    for (const [v, t] of Object.entries(L.vonis)) {
      expect(t, v).toMatch(/\.$/);
      expect(t.slice(0, -1), v).not.toMatch(/\.(\s|$)/);
    }
  });
  it("kalimat sinkron menyebut permintaan dan kalimat queue menyebut pekerjaan", () => {
    for (const [v, t] of Object.entries(L.vonis)) {
      const sinkron = jalurVonis(v as (typeof VONIS)[number]) === "sinkron";
      expect(/permintaan sampai|permintaan tanpa|permintaan\b/.test(t) && !/pekerjaan/.test(t), v).toBe(sinkron);
      expect(/pekerjaan/.test(t), v).toBe(!sinkron);
    }
  });
  it("kalimat penuh pengaturan awal memuat angka rekaman bagian B", () => {
    const r = ringkas(daftarAcuan(R).find((d) => d.kunci === "queue-satu")!.param, A);
    const t = isi(L.vonis[r.vonis], { x: r.buka ?? "", n: R.lajur.pendaftar, ditolak: 0, tunggu: 0, terkirim: r.terkirim, mati: r.mati, menunggu: r.menunggu, kevendor: r.kevendor, percobaan: A.percobaan, horizon: 180 });
    expect(t).toBe(`Breaker membuka pada detik 0; sesudah 180 detik ${R.lajur.b.lulus} pekerjaan terkirim, ${R.lajur.b.gagal} mati, dan 0 menunggu.`);
  });
});

describe("tebakan, tombol, dan label kejujuran", () => {
  it("tepat satu pilihan benar yang sama dengan rekaman, pilihan tidak lebih dari empat, dan posisi benar bukan pertama atau terakhir", () => {
    expect(L.pilihan.length).toBeLessThanOrEqual(4);
    expect(L.pilihan.filter((p) => p.jumlah === R.lajur.b.awal["mati 5"])).toHaveLength(1);
    expect(T.benar).toBe(L.pilihan.findIndex((p) => p.jumlah === R.lajur.b.awal["mati 5"]));
    expect(T.benar).toBe(2);
    // Pilihan benar bukan yang terpanjang atau terpendek (petunjuk tanpa membaca soal).
    const panjang = T.pilihan.map((p) => p.teks.length);
    expect(panjang[T.benar]).toBeLessThan(Math.max(...panjang));
    expect(panjang[T.benar]).toBeGreaterThan(Math.min(...panjang));
    expect(new Set(L.pilihan.map((p) => p.jumlah)).size).toBe(L.pilihan.length);
    expect(L.pilihan.map((p) => p.jumlah)).toEqual([0, R.breaker.gagalKe, R.lajur.b.awal["mati 5"], R.lajur.pendaftar]);
  });
  it("tiap tombol unik per kelompok, dan titik acuan bisa dipilih", () => {
    for (const k of Object.keys(L.pilihNilai) as (keyof typeof L.pilihNilai)[]) {
      const label = L.pilihNilai[k].map((o) => o.label);
      expect(new Set(label).size, k).toBe(label.length);
      const nilai = L.pilihNilai[k].map((o) => o.nilai);
      expect(new Set(nilai).size, k).toBe(nilai.length);
    }
    expect(() => periksaTombol(L, R)).not.toThrow();
    expect(acuan.map((d) => d.kunci)).toEqual([...KUNCI_ACUAN]);
    expect(Object.keys(L.acuan).sort()).toEqual([...KUNCI_ACUAN].sort());
    expect(Object.keys(L.namaAcuan).sort()).toEqual([...KUNCI_ACUAN].sort());
  });
  it("tombol yang hilang atau label yang salah menggagalkan build", () => {
    const tanpa = structuredClone(L);
    tanpa.pilihNilai.serentak = tanpa.pilihNilai.serentak.filter((o) => o.nilai !== R.worker.serentak);
    expect(() => periksaTombol(tanpa, R)).toThrow(/tombol untuk pengaturan queue-empat/);
    const tanpaJenis = structuredClone(L);
    tanpaJenis.pilihNilai.jenis = tanpaJenis.pilihNilai.jenis.filter((o) => o.nilai !== "4xx-sukses");
    expect(() => periksaTombol(tanpaJenis, R)).toThrow(/4xx-sukses/);
    const salahError = structuredClone(L);
    salahError.pilihNilai.error[2]!.label = "61%";
    expect(() => periksaTombol(salahError, R)).toThrow(/label error/);
    const salahLatensi = structuredClone(L);
    salahLatensi.pilihNilai.latensi[1]!.label = "3 detik";
    expect(() => periksaTombol(salahLatensi, R)).toThrow(/label latensi/);
    const tanpaDiAtasTimeout = structuredClone(L);
    tanpaDiAtasTimeout.pilihNilai.latensi = tanpaDiAtasTimeout.pilihNilai.latensi.filter((o) => o.nilai <= 2);
    expect(() => periksaTombol(tanpaDiAtasTimeout, R)).toThrow(/di atasnya/);
  });
  it("jumlah tebakan dan alasan diubah: tebakan benar bergeser atau gagal", () => {
    const m = structuredClone(L);
    m.pilihan[2]!.jumlah = 2;
    expect(() => siapkanTeks(m, R, acuan)).toThrow(/0 pilihan/);
    const dua = structuredClone(L);
    dua.pilihan[1]!.jumlah = 1;
    expect(() => siapkanTeks(dua, R, acuan)).toThrow(/2 pilihan/);
  });
  it("templat dengan nama yang tidak diisi menggagalkan build", () => {
    const m = structuredClone(L);
    m.acuan["queue-satu"] += " {tidakAda}";
    expect(() => siapkanTeks(m, R, acuan)).toThrow(/tidakAda/);
  });
  it("label kejujuran: Simulasi di chip dan catatan sinkron, Asumsi dan Hitungan di hitungan, tes lab bukan rekaman di probe", () => {
    expect(L.sumber).toMatch(/Simulasi/);
    expect(T.catatan.sinkron).toMatch(/tidak dipasang di lab/);
    expect(T.catatan.sinkron).toMatch(/Simulasi/);
    expect(T.hitungan.label).toMatch(/^Hitungan, Asumsi:/);
    expect(T.hitungan.outage).toMatch(/Hitungan atas angka naskah, tidak dijalankan/);
    expect(T.catatan.probe).toMatch(/tes lab, bukan rekaman/);
    expect(L.tanpaAcuan).toMatch(/Simulasi/);
    expect(T.asal.butir.some((b) => b.startsWith("Simulasi:"))).toBe(true);
    expect(T.asal.butir.some((b) => b.startsWith("Rekaman lab:"))).toBe(true);
    expect(T.asal.butir.some((b) => b.startsWith("Hitungan, Asumsi:"))).toBe(true);
  });
  it("teks hitungan memuat angka yang sama dengan rekaman worker.txt dan README", () => {
    expect(T.hitungan.worker).toBe(`Bila tiap percobaan menunggu sampai timeout, verifikasi 0,116 per detik × 5 percobaan × 3 detik = 1,74 dari 4 slot worker.`);
    expect(T.hitungan.bersama).toBe(`Bersama notifikasi uang (7,52 per detik × 0,3 detik = 2,26 slot): 4,0 dari 4 slot.`);
    expect(T.hitungan.outage).toBe("Outage 12.600 detik ÷ Timeout 60 detik = 210 permintaan percobaan. 210 ÷ 5 percobaan = sampai 42 dari 146 pekerjaan mati sebelum vendor pulih (Hitungan atas angka naskah, tidak dijalankan).");
    expect(T.hitungan.label).toContain("4 slot dan batas waktu client 3 detik yang terukur (worker.txt bagian A)");
    expect(T.asal.butir[3]).toContain(`gobreaker ${R.breaker.versi}`);
  });
  it("teks acuan memuat bagian rekaman yang dirujuk dan angkanya", () => {
    expect(T.acuanTeks["sinkron-bawaan"]).toMatch(/^breaker\.txt bagian A: .*ke-6.* 60 detik/);
    expect(T.acuanTeks["queue-tanpa"]).toBe("lajur.txt bagian A: tanpa breaker, 10 pekerjaan mati sesudah 5 percobaan dan 50 permintaan, sebelum vendor pulih.");
    expect(T.acuanTeks["queue-satu"]).toBe("lajur.txt bagian B: 1 dari 10 pekerjaan mati dan 9 menunggu; sesudah vendor pulih 9 pekerjaan lulus dalam 15 permintaan.");
    expect(T.acuanTeks["queue-empat"]).toBe("lajur.txt bagian C: dengan 4 worker serentak dan 8 pekerjaan, tidak ada yang mati sebelum breaker membuka, dan semuanya lulus sesudah vendor pulih. Widget memakai 10 pekerjaan.");
    expect(T.acuanTeks["queue-4xx-gagal"]).toBe("lajur.txt bagian D: 6 dokumen rusak di depan membuat breaker membuka dan menjeda 4 pekerjaan sehat di belakangnya.");
    expect(T.acuanTeks["queue-4xx-sukses"]).toBe("lajur.txt bagian E: dengan 4xx dihitung sukses breaker tidak membuka; 6 pekerjaan rusak habis 5 percobaan dan 4 pekerjaan sehat lulus dalam 34 permintaan.");
    expect(T.acuanTeks["sinkron-4xx-gagal"]).toBe("breaker.txt bagian C: dengan IsSuccessful bawaan pustaka, 6 jawaban 4xx berturut-turut membuka breaker.");
    expect(T.acuanTeks["sinkron-4xx-sukses"]).toBe("breaker.txt bagian C: dengan IsSuccessful kustom, 6 jawaban 4xx berturut-turut tidak membuka breaker.");
  });
});

describe("teks yang tampil dikunci kata demi kata terhadap angka rekaman", () => {
  const param = (kunci: string) => acuan.find((d) => d.kunci === kunci)!.param;
  const vonis = (kunci: string, ubah: { breaker?: boolean } = {}) => kalimatVonis(L.vonis, ringkas({ ...param(kunci), ...ubah }, A), { ...param(kunci), ...ubah }, A);
  const N = R.lajur.pendaftar;
  it("pertanyaan tebakan memuat pekerjaan, percobaan, dan ambang dari rekaman", () => {
    expect(T.pertanyaan).toBe(`Layanan verifikasi mati, dan ${N} pekerjaan verifikasi menunggu di queue. Satu worker mengerjakannya satu per satu dan mengulang pekerjaan yang gagal tanpa jeda, seperti di lab, dengan paling banyak ${R.worker.percobaan} percobaan per pekerjaan. Breaker membuka sesudah lebih dari ${R.breaker.lebihDari} gagal berturut-turut. Berapa pekerjaan sudah mati ketika breaker membuka?`);
    // Jawaban 1 hanya berlaku bila pekerjaan yang gagal langsung diulang (backoff 0, lajur.txt bagian B): tanpa premis itu pertanyaannya menyesatkan.
    expect(T.pertanyaan).toMatch(/mengulang pekerjaan yang gagal tanpa jeda, seperti di lab/);
    expect(TEKS.lajur).toMatch(/worker yang berputar terus: kapasitas 1, lima percobaan, tanpa backoff, breaker/);
  });
  it("pilihan tebakan dan alasannya", () => {
    expect(T.pilihan).toEqual([
      { teks: "Tidak ada: breaker melindungi semua pekerjaan.", alasan: `Breaker membuka pada kegagalan ke-${R.breaker.gagalKe}, tetapi satu pekerjaan hanya punya ${R.worker.percobaan} percobaan. Pekerjaan pertama habis lebih dulu.` },
      { teks: `${R.breaker.gagalKe}: tiap kegagalan mematikan satu pekerjaan.`, alasan: `${R.worker.percobaan} kegagalan pertama menghabiskan pekerjaan pertama. Kegagalan berikutnya jatuh pada pekerjaan kedua, bukan pada pekerjaan baru.` },
      { teks: `${R.lajur.b.awal["mati 5"]}: hanya pekerjaan pertama, yang habis percobaannya.`, alasan: `${R.worker.percobaan} kegagalan pertama menghabiskan pekerjaan pertama. Kegagalan ke-${R.breaker.gagalKe} jatuh pada pekerjaan kedua dan membuka breaker, sehingga ${R.lajur.b.awal["menunggu 0"]! + R.lajur.b.awal["menunggu 1"]!} pekerjaan lain masih menunggu.` },
      { teks: `Semua ${N}: vendor yang mati menghabiskan semua percobaan.`, alasan: `Itu terjadi tanpa breaker: ${N} pekerjaan mati sesudah ${R.lajur.a.permintaan} permintaan. Dengan breaker, lajur berhenti diklaim sesudah kegagalan ke-${R.breaker.gagalKe}.` },
    ]);
  });
  it("kalimat vonis untuk semua enam kategori", () => {
    expect(vonis("queue-tanpa")).toBe(`Tanpa breaker, ${N} dari ${N} pekerjaan mati sesudah ${R.worker.percobaan} percobaan, dan ${R.lajur.a.permintaan} permintaan sampai ke vendor.`);
    expect(vonis("queue-satu")).toBe(`Breaker membuka pada detik 0; sesudah 180 detik ${R.lajur.b.lulus} pekerjaan terkirim, ${R.lajur.b.gagal} mati, dan 0 menunggu.`);
    expect(vonis("queue-4xx-sukses")).toBe(`Breaker tidak pernah membuka: ${R.lajur.e.lulus} pekerjaan terkirim, ${R.lajur.e.gagal} mati, dan 0 menunggu.`);
    expect(vonis("sinkron-bawaan")).toBe(`Breaker membuka pada detik ${R.breaker.gagalKe - 1} dan menolak ${180 - R.breaker.gagalKe - 2} dari 180 permintaan tanpa menunggu vendor.`);
    expect(vonis("sinkron-4xx-sukses")).toBe("Breaker tidak pernah membuka, jadi semua 180 permintaan sampai ke vendor.");
    expect(vonis("sinkron-bawaan", { breaker: false })).toBe("Tanpa breaker, semua 180 permintaan sampai ke vendor dan pemanggil menunggu 0 detik.");
  });
  it("ringkasan pendek dan kalimat perbandingan dengan pengaturan awal", () => {
    const awal = ringkas(param("queue-satu"), A), kini = ringkas(param("queue-tanpa"), A), sinkron = ringkas(param("sinkron-bawaan"), A);
    expect(ringkasTeks(L.ringkas, awal)).toBe(`${R.lajur.b.gagal} mati, ${R.lajur.b.lulus} terkirim, ${R.lajur.b.permintaanAkhir} permintaan ke vendor`);
    expect(isi(L.banding.beda, { awal: ringkasTeks(L.ringkas, awal), kini: ringkasTeks(L.ringkas, kini) })).toBe(
      `Pengaturan awal: ${R.lajur.b.gagal} mati, ${R.lajur.b.lulus} terkirim, ${R.lajur.b.permintaanAkhir} permintaan ke vendor. Sekarang: ${N} mati, 0 terkirim, ${R.lajur.a.permintaan} permintaan ke vendor.`);
    expect(ringkasTeks(L.ringkas, sinkron)).toBe(`${180 - R.breaker.gagalKe - 2} ditolak, menunggu 0 detik`);
    expect(L.banding.sama).toBe("Ini pengaturan awal.");
  });
  it("catatan, nama titik acuan, label pulih, dan asal angka", () => {
    expect(T.catatan).toEqual({
      sinkron: "Breaker di jalur sinkron tidak dipasang di lab, jadi seluruh jalur ini Simulasi: dihitung widget ini, bukan direkam.",
      ambang: `Ambang breaker (kegagalan ke-${R.breaker.gagalKe}) lebih tinggi daripada batas percobaan (${R.worker.percobaan}). Dengan satu worker, pekerjaan pertama mati sebelum breaker membuka (lajur.txt bagian B).`,
      probe: "Permintaan percobaan di half-open memakai percobaan pekerjaan terdepan. Selama vendor tetap mati, tiap Timeout breaker menghabiskan satu percobaan (tes lab, bukan rekaman lajur.txt).",
      empatSukses: "Kode lab menghitung semua jawaban 4xx sebagai sukses bagi breaker, termasuk 429 dan 408.",
      empatDiulang: `Pekerjaan queue dengan jawaban 4xx tetap diulang ${R.worker.percobaan} kali walau jawabannya tidak berubah (lajur.txt bagian E).`,
      harga: "Breaker baru mencoba lagi sesudah Timeout, jadi permintaan yang sebenarnya bisa berhasil ikut ditolak.",
    });
    expect(T.namaAcuan).toEqual({
      "sinkron-bawaan": "Sinkron, vendor mati, breaker dipasang", "sinkron-4xx-gagal": "Sinkron, jawaban 4xx dihitung gagal", "sinkron-4xx-sukses": "Sinkron, jawaban 4xx dihitung sukses",
      "queue-tanpa": "Queue, tanpa breaker, satu worker", "queue-satu": "Queue, breaker, satu worker", "queue-empat": `Queue, breaker, ${R.worker.serentak} worker`,
      "queue-4xx-gagal": "Queue, dokumen rusak, 4xx dihitung gagal", "queue-4xx-sukses": "Queue, dokumen rusak, 4xx dihitung sukses",
    });
    expect(T.opsi.pulih.map((o) => o.label)).toEqual([`Pulih pada detik ${SIMULASI.pulihDetik}`, "Tidak pulih"]);
    expect(T.asal.butir).toEqual([
      `Rekaman lab: ambang lebih dari ${R.breaker.lebihDari} gagal berturut-turut, open ${R.breaker.bukaDetik} detik, satu permintaan di half-open, dan penilaian 4xx (breaker.txt). Pekerjaan, percobaan, dan permintaan dari lajur.txt dan worker.txt.`,
      `Simulasi: jam bergerak satu detik per langkah, urutan error rate acak dengan benih tetap, vendor pulih pada detik ${SIMULASI.pulihDetik}, dan backoff 0 seperti di lab. Jalur sinkron tidak ada di lab.`,
      "Hitungan, Asumsi: slot worker dan outage panjang dihitung dari laju dan lama outage naskah, bukan dari rekaman.",
      `Mesin keadaan mengikuti pustaka gobreaker ${R.breaker.versi} dengan pengaturan bawaan. Di lab jamnya diperankan, jadi ${R.breaker.bukaDetik} detik tidak ditunggu.`,
    ]);
  });
  it("judul, label kelompok, papan, daftar angka, tabel pekerjaan, dan teks tetap lainnya", () => {
    expect([L.judul, L.sumber, L.tebakDulu, L.ubahJudul, L.tanpaAcuan, L.tanpaJs]).toEqual([
      "Circuit breaker: kapan membuka dan siapa yang ditolak", "Simulasi; titik acuan dari rekaman lab", "Tebak dulu.", "Ubah satu hal dan lihat akibatnya.",
      "Tanpa titik rekaman: hasil ini Simulasi, dihitung widget ini dengan aturan breaker dari rekaman, bukan direkam.", "Tanpa JavaScript, widget ini tidak jalan. Titik rekaman lab ada di tabel berikut.",
    ]);
    expect(L.kelompok).toEqual({ jalur: "Jalur", error: "Error rate vendor", latensi: "Latensi vendor", jenis: "Jawaban error vendor", breaker: "Breaker", pulih: "Vendor pulih", serentak: "Slot worker" });
    expect(L.pilihNilai.jalur.map((o) => o.label)).toEqual(["Sinkron: user menunggu", "Queue: worker mengulang"]);
    expect(L.pilihNilai.latensi.map((o) => o.label)).toEqual(["0 detik", "2 detik", "4 detik, melewati timeout"]);
    expect(L.papan).toEqual({
      judul: "Detik demi detik", baris: "Detik {dari} sampai {sampai}", legenda: "Pita di atas tiap baris menunjukkan status breaker. Tiap kotak adalah satu detik.",
      status: { closed: "closed", open: "open", "half-open": "half-open" },
      hasil: { ok: "Berhasil", "5xx": "Gagal 5xx", timeout: "Timeout", "4xx": "Jawaban 4xx", tolak: "Ditolak cepat", diam: "Tidak ada percobaan", gagal: "Percobaan gagal" },
    });
    expect(L.angka).toEqual({
      sinkron: { permintaan: "Permintaan", kevendor: "Sampai ke vendor", ditolak: "Ditolak cepat", tunggu: "Pemanggil menunggu", ditolakSehat: "Ditolak saat vendor sudah pulih" },
      queue: { terkirim: "Terkirim", menunggu: "Menunggu", mati: "Mati", kevendor: "Permintaan ke vendor", probe: "Permintaan percobaan di half-open" },
      detik: "{x} detik", tanpaBreaker: "tanpa breaker {x}",
    });
    expect(L.pekerjaan).toEqual({ judul: "Pekerjaan verifikasi", kolom: ["Pekerjaan", "Percobaan", "Status"], status: { menunggu: "menunggu", terkirim: "terkirim", mati: "mati" } });
    expect(T.hitungan.judul).toBe("Hitungan: pemakaian worker dan outage panjang");
    expect(T.hitungan.dijeda).toBe("Selama lajur dijeda, tidak ada permintaan baru ke vendor dan percobaan tidak bertambah (worker.txt bagian B).");
    expect(T.hitungan.label).toBe(`Hitungan, Asumsi: ${R.worker.laju.toString().replace(".", ",")} verifikasi per detik, 7,52 notifikasi uang per detik, dan 0,3 detik per notifikasi adalah angka naskah. Hanya ${R.worker.serentak} slot dan batas waktu client ${R.worker.timeoutClient} detik yang terukur (worker.txt bagian A).`);
    expect(T.asal.judul).toBe("Dari mana angka ini");
    expect(T.acuanTeks["sinkron-bawaan"]).toBe(`breaker.txt bagian A: breaker membuka pada kegagalan ke-${R.breaker.gagalKe}, menolak tanpa memanggil vendor, dan half-open sesudah ${R.breaker.bukaDetik} detik dengan satu permintaan percobaan. Jalur sinkron sendiri tidak dipasang di lab.`);
  });
  it("teks tetap, judul, dan tombol yang dibaca pembaca", () => {
    expect(L.tabel).toEqual({ judul: "Titik acuan dari rekaman lab", kolom: ["Pengaturan", "Hasil di rekaman"] });
    expect([L.benar, L.belum, L.ulang, L.awal, L.cocok]).toEqual(["Tepat.", "Belum tepat.", "Coba pilihan lain", "Kembali ke pengaturan awal", "Cocok dengan rekaman"]);
    expect(L.pilihNilai.jalur.map((o) => o.nilai)).toEqual(["sinkron", "queue"]);
    expect(L.pilihNilai.breaker.map((o) => [o.nilai, o.label])).toEqual([[true, "Dipasang"], [false, "Tanpa breaker"]]);
    expect(L.pilihNilai.jenis.map((o) => o.nilai)).toEqual(["5xx", "4xx-gagal", "4xx-sukses"]);
    expect(L.pilihNilai.jenis.map((o) => o.label)).toEqual(["5xx: vendor gagal", "4xx dihitung gagal (bawaan pustaka)", "4xx dihitung sukses (kustom)"]);
    expect(L.pilihNilai.error.map((o) => o.nilai)).toEqual([0, 30, 60, 100]);
    expect(L.pilihNilai.latensi.map((o) => o.nilai)).toEqual([0, 2, 4]);
    expect(L.pilihNilai.serentak.map((o) => o.nilai)).toEqual([1, R.worker.serentak]);
    expect(L.pilihNilai.pulih.map((o) => o.nilai)).toEqual(["sementara", "terus"]);
  });
});

describe("island tidak memuat berkas build", () => {
  it("CircuitBreaker.tsx tidak mengimpor Zod, rekaman, skema, atau teks (ukuran JS) dan tanpa sumber waktu atau acak", () => {
    const sumber = fs.readFileSync(path.resolve(__dirname, "CircuitBreaker.tsx"), "utf8");
    const impor = [...sumber.matchAll(/\bfrom "([^"]+)";/g)].map((m) => m[1]!);
    expect(impor.sort()).toEqual(["../../gerak/muncul", "./logika", "react"]);
    expect(sumber).not.toMatch(/Math\.random|Date\.now|setInterval|setTimeout|requestAnimationFrame|performance\.now/);
  });
  it("logika.ts dan breaker.ts tanpa sumber waktu atau acak yang tidak deterministik", () => {
    for (const f of ["logika.ts", "breaker.ts"]) {
      const kode = fs.readFileSync(path.resolve(__dirname, f), "utf8").split("\n").filter((b) => !b.trim().startsWith("//")).join("\n");
      expect(kode, f).not.toMatch(/Math\.random|Date\.now|new Date|setTimeout|setInterval|performance\.now/);
    }
  });
});

describe("kelas CSS widget tidak bertabrakan dengan widget lain (tema.css global)", () => {
  // Awalan cb- sempat dipakai widget ini dan widget cari-bug: aturan `.cb-tombol` yang baru menimpa `display: flex` tombol baris kode
  // di empat halaman lama, dan `.cb` menyembunyikan cari-bug tanpa JavaScript (tinjauan W4-breaker, keputusan 1265).
  const BERSAMA = /^(?:tb|bb|tm|is|aria|data)-/;
  const BUKAN_KELAS = new Set(["half-open"]); // nama status breaker, bukan kelas
  const kelas = (berkas: string): Set<string> => {
    const sumber = fs.readFileSync(berkas, "utf8");
    const hasil = new Set<string>();
    for (const m of sumber.matchAll(/"([^"\n]*)"|`([^`\n]*)`/g)) {
      for (const t of (m[1] ?? m[2] ?? "").split(/\s+/)) if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(t) && !BERSAMA.test(t) && !BUKAN_KELAS.has(t)) hasil.add(t);
    }
    return hasil;
  };
  const WIDGETS = path.resolve(__dirname, "..");
  const milik = kelas(path.resolve(__dirname, "CircuitBreaker.tsx"));
  const lain = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? (p === __dirname ? [] : lain(p)) : /\.(tsx|astro)$/.test(e.name) ? [p] : [];
    });
  it("semua kelas milik widget memakai awalan brk (kecuali tb-, bb-, tm-, is- bersama)", () => {
    expect(milik.size).toBeGreaterThan(20);
    expect([...milik].filter((k) => !k.startsWith("brk-")).sort()).toEqual([]);
  });
  it("tidak ada kelas milik widget yang dipakai berkas widget atau komponen lain", () => {
    const bentrok = [...lain(WIDGETS), ...lain(path.resolve(WIDGETS, "../components"))].flatMap((f) => [...kelas(f)].filter((k) => milik.has(k)).map((k) => `${path.basename(f)}: ${k}`));
    expect(bentrok).toEqual([]);
  });
  it("aturan CSS widget di tema.css hanya memakai kelas brk, tb, bb, dan tm", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../styles/tema.css"), "utf8");
    const awal = css.indexOf("/* Widget circuit breaker (W4-breaker");
    expect(awal).toBeGreaterThan(0);
    const blok = css.slice(awal);
    expect(blok).not.toMatch(/\.cb\b/);
    expect(blok).toMatch(/\.brk-tombol\b/);
  });
});
