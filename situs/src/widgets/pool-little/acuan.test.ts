// Penjaga angka widget pool dan Little's Law (W3-pool, keputusan 980): angka dan label yang tampil (tebakan, titik acuan,
// catatan, asal angka, label tombol) harus bisa diturunkan dari rekaman labs/t3-pool/output dan dari simulasi yang sama
// dengan island. logika.test.ts menjaga model; tes ini menjaga TEKS dan DATA: mengubah satu angka di data widget, satu
// label sumber, atau satu rumus tidak boleh lolos diam-diam. Prosedur mutasi dan hasilnya ada di badan PR.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { HORIZON, detikTeks, isi, keadaanPada, koma, littleL, ringkas, simulasi } from "./logika";
import { aturanDari, awalDari, bacaRekaman, daftarAcuan } from "./rekaman";
import { LabelPool } from "./skema";
import { periksaTombol, siapkanTeks } from "./teks";
import labelMentah from "../../../data/widget/t3-pool-little.json";

const akar = path.resolve(__dirname, "../../../..");
const baca = (rel: string) => fs.readFileSync(path.join(akar, rel), "utf8");
const R = bacaRekaman(baca("labs/t3-pool/output/m18.txt"), baca("labs/t3-pool/output/little.txt"), baca("labs/t3-pool/output/adr22.txt"));
const A = aturanDari(R);
const awal = awalDari(R);
const acuan = daftarAcuan(R);
const L = LabelPool.parse(labelMentah);
const T = siapkanTeks(L, R, acuan);
const lambda = koma(A.lambda, 2);
const jalan = (kunci: string) => {
  const d = acuan.find((x) => x.kunci === kunci)!;
  const j = simulasi(d.param, A);
  return { j, r: ringkas(j, d.param, A), p: d.param };
};

describe("label tombol lawan nilai dan rekaman", () => {
  test("label menulis nilainya persis; satuan detik ada di label kelompok", () => {
    for (const o of L.pilihNilai.n) expect(o.label).toBe(String(o.nilai));
    for (const o of L.pilihNilai.t) expect(o.label).toBe(o.nilai === null ? "Tidak menjawab" : detikTeks(o.nilai));
    for (const o of L.pilihNilai.tClient) expect(o.label).toBe(o.nilai === null ? "Tanpa batas" : String(o.nilai));
    expect(L.kelompok.t).toContain("(detik)");
    expect(L.kelompok.tClient).toContain("(detik)");
    expect(L.kelompok.n).toContain("koneksi");
  });
  test("label pengaman memuat angka rekaman D dan E", () => {
    const label = Object.fromEntries(L.pilihNilai.pengaman.map((o) => [o.nilai, o.label]));
    expect(label["timeout-push"]).toBe(`Timeout push ${R.d.timeoutPush} detik`);
    expect(label["idle-tx"]).toBe(`idle_in_transaction_session_timeout ${R.e.idleTx} detik`);
    expect(label["di-luar"]).toBe("Push di luar transaction");
    expect(label["tidak"]).toBe("Tidak ada");
  });
  test("setiap titik rekaman bisa dipilih lewat tombol", () => {
    expect(() => periksaTombol(L, R)).not.toThrow();
    const tanpaPool10 = { ...L, pilihNilai: { ...L.pilihNilai, n: L.pilihNilai.n.filter((o) => o.nilai !== 10) } };
    expect(() => periksaTombol(tanpaPool10, R)).toThrow(/tombol untuk pengaturan/);
  });
  test("nilai tombol di luar rekaman hanya yang disebut Hitungan atau Asumsi di asal angka", () => {
    const ada = (daftar: (number | null)[], rekaman: (number | null)[]) => daftar.filter((v) => !rekaman.includes(v));
    expect(ada(L.pilihNilai.n.map((o) => o.nilai), [R.a.ukuran, R.b.ukuran])).toEqual([4]);
    expect(ada(L.pilihNilai.t.map((o) => o.nilai), [null, ...R.little.map((l) => l.t)])).toEqual([30]);
    expect(ada(L.pilihNilai.tClient.map((o) => o.nilai), [null, R.c.menyerah])).toEqual([30, 10]);
    const asal = T.asal.butir.join(" ");
    expect(asal).toContain("Pool 4 (bawaan pgxpool pada mesin dengan 4 core atau kurang, dokumentasi pgx v5.11.0)");
    expect(asal).toContain("t = 30 detik: Hitungan dari rumus L = λ × W, belum direkam");
    expect(asal).toContain("Client menyerah sesudah 30 dan 10 detik: Asumsi");
  });
});

describe("tebakan dari rekaman m18.txt", () => {
  test("pertanyaan memakai λ dan ukuran pool rekaman", () => {
    expect(T.pertanyaan).toContain(`${lambda} per detik`);
    expect(T.pertanyaan).toContain(`pool punya ${awal.n} koneksi`);
  });
  test("tepat satu pilihan benar: detik ke-12, 10 ÷ 0,87 = 11,5, antara detik ke-11 dan ke-12", () => {
    expect(L.pilihan.map((p) => p.detik)).toEqual([null, 3, 12, 58]);
    expect(T.benar).toBe(2);
    expect(T.pilihan[T.benar]!.teks).toBe("Sekitar detik ke-12.");
    expect(T.pilihan[T.benar]!.alasan).toContain(`${awal.n} ÷ ${lambda} = ${koma(R.a.hitungan, 1)} detik`);
    expect(T.pilihan[T.benar]!.alasan).toContain(`antara detik ke-${R.a.dari} dan ke-${R.a.sampai}`);
    expect(T.pilihan[T.benar]!.alasan).toContain("Rekaman lab m18.txt A");
  });
  test("pilihan salah: detik ke-3 baru dua pembayaran; detik ke-58 = pool 50", () => {
    const j = simulasi(awal, A);
    expect(T.pilihan[1]!.alasan).toContain(`baru ${keadaanPada(j, 3, A).dikirim} pembayaran`);
    expect(T.pilihan[1]!.alasan).toContain(`pada detik ke-${koma(R.a.hitungan, 1)}`);
    expect(T.pilihan[3]!.alasan).toContain(`pool ${R.b.ukuran}: ${R.b.ukuran} ÷ ${lambda} = ${koma(R.b.hitungan, 1)} detik (Rekaman lab m18.txt B)`);
    expect(R.b.sampai).toBe(58);
    expect(T.pilihan[0]!.teks).toContain(`${lambda} pembayaran per detik jauh di bawah ${awal.n} koneksi`);
  });
});

describe("titik acuan: teks lawan simulasi dan rekaman", () => {
  test("tiap templat diawali berkas dan bagian rekamannya", () => {
    const awalan: Record<string, string> = { A: "m18.txt A:", B: "m18.txt B:", C: "m18.txt C:", D: "adr22.txt D:", E: "adr22.txt E:", F: "adr22.txt F:", L03: "little.txt, t = 0,3 detik:", L2: "little.txt, t = 2 detik:", L10: "little.txt, t = 10 detik:" };
    expect(Object.keys(T.acuanTeks)).toEqual(Object.keys(awalan));
    for (const [k, v] of Object.entries(awalan)) expect(T.acuanTeks[k]!.startsWith(v), `${k}: ${T.acuanTeks[k]}`).toBe(true);
  });
  test("A: keadaan pada 30 detik dari simulasi sama dengan kalimat rekaman", () => {
    const { j } = jalan("A");
    const k = keadaanPada(j, R.a.detik, A);
    expect(T.acuanTeks.A).toContain(`Sesudah ${R.a.detik} detik: ${k.dikirim} pembayaran masuk, ${k.terpakai} menggantung di layanan push, ${k.menunggu} menunggu koneksi.`);
    expect(T.acuanTeks.A).toContain(`antara detik ke-${R.a.dari} dan ke-${R.a.sampai} (hitungan ${R.a.ukuran} ÷ ${lambda} = ${koma(R.a.hitungan, 1)})`);
  });
  test("B: keadaan pada 61,6 detik dari simulasi sama dengan kalimat rekaman, dan masih di dalam jam simulasi", () => {
    const { j } = jalan("B");
    const k = keadaanPada(j, R.b.detik, A);
    expect(R.b.detik).toBeLessThanOrEqual(HORIZON);
    expect(T.acuanTeks.B).toContain(`Sesudah 61,6 detik: ${k.dikirim} pembayaran masuk, ${k.terpakai} menggantung, ${k.menunggu} menunggu koneksi.`);
    expect(T.acuanTeks.B).toContain(`antara detik ke-${R.b.dari} dan ke-${R.b.sampai} (hitungan ${koma(R.b.hitungan, 1)})`);
  });
  test("C, D, F: puncak dari simulasi sama dengan kalimat", () => {
    expect(T.acuanTeks.C).toContain(`client menyerah sesudah ${R.c.menyerah} detik, koneksi terpakai paling banyak ${jalan("C").r.puncak} dari ${R.c.ukuran}, pool tidak penuh`);
    expect(T.acuanTeks.D).toContain(`timeout push ${R.d.timeoutPush} detik di dalam transaction, koneksi terpakai paling banyak ${jalan("D").r.puncak} dari ${R.d.ukuran}`);
    expect(T.acuanTeks.F).toContain(`transaction terbuka paling banyak ${jalan("F").r.puncak}`);
  });
  test("E: sesi PostgreSQL paling banyak 5 dari simulasi, pool Go 10 dari 10", () => {
    const { j, r } = jalan("E");
    expect(T.acuanTeks.E).toContain(`PostgreSQL paling banyak ${r.puncakPg} sesi idle in transaction`);
    expect(T.acuanTeks.E).toContain(`pool di Go terpakai ${keadaanPada(j, R.a.detik, A).terpakai} dari ${R.e.maks}`);
  });
  test("Little: L dan puncak di teks sama dengan rumus dan simulasi untuk t = 0,3, 2, 10", () => {
    for (const [kunci, i] of [["L03", 0], ["L2", 1], ["L10", 2]] as const) {
      const { r, p } = jalan(kunci);
      expect(T.acuanTeks[kunci]).toContain(`L = ${koma(littleL(p, A), 3)} dihitung, koneksi terbuka paling banyak ${r.puncak} dari ${R.little[i]!.ukuran} diukur`);
    }
  });
});

describe("catatan, asal angka, dan label sumber", () => {
  test("catatan per pengaman menyebut rekamannya dan angka yang cocok", () => {
    expect(T.catatan["timeout-push"]).toBe(
      `Rekaman lab adr22.txt D: pool selamat, tetapi pembayaran tetap memegang lock buku warung selama push menunggu. Dua pembayaran ke warung yang sama: yang kedua selesai sesudah lebih dari ${R.d.keduaLebihDari} detik, bukan ${R.d.timeoutPush}.`,
    );
    expect(T.catatan["idle-tx"]).toContain(`Rekaman lab adr22.txt E: PostgreSQL memutus sesi yang diam lebih dari ${R.e.idleTx} detik`);
    expect(T.catatan["idle-tx"]).toContain(`terpakai ${R.e.dipakai} dari ${R.e.maks}`);
    expect(T.catatan["idle-tx"]).toContain("jadi pengaman ini melindungi PostgreSQL, bukan pool");
    expect(T.catatan["di-luar"]).toContain(`Rekaman lab adr22.txt F: ${R.f.bayar201} pembayaran dijawab 201 dan transaction terbuka paling banyak ${R.f.terbukaMaks}`);
    expect(T.catatan.tClient).toContain(`Rekaman lab m18.txt C: client yang menyerah sesudah ${R.c.menyerah} detik membuat koneksi terpakai paling banyak ${R.c.puncak}`);
    expect(T.catatan.tClient).toContain("[perlu verifikasi: package http dan dio, tidak dijalankan]");
    expect(T.catatan.tClient).toContain("Future.timeout di Dart tidak membatalkan permintaannya (api.dart.dev, Dart 3.13.7, dibuka 2026-10-25)");
  });
  test("asal angka: λ dan W di luar push berlabel Asumsi, titik lab berlabel Rekaman lab, simulasi berlabel Ilustrasi", () => {
    const [lam, w, lab, hitung, sim] = T.asal.butir;
    expect(lam).toBe(`λ = ${lambda} pembayaran per detik: Asumsi naskah (${koma(R.beban.rpsTotal, 1)} request per detik, setiap request ke-${R.beban.tiap} adalah pembayaran). Jadwalnya tetap, seperti di lab. Hitungan tanpa pembulatan memberi ${koma((7500 / 86400) * 10, 3)}, selisih ${koma((Math.abs(A.lambda - (7500 / 86400) * 10) / ((7500 / 86400) * 10)) * 100, 1)}%.`);
    expect(w).toBe(`W di luar push = ${koma(R.beban.w0, 2)} detik: Asumsi naskah. Rekaman lab hanya membuktikan nilainya di bawah ${R.beban.batasWMs} ms.`);
    expect(lab).toContain("Rekaman lab t3-pool");
    expect(lab).toContain(`Pool ${R.a.ukuran} dan ${R.b.ukuran}`);
    expect(lab).toContain(`client menyerah sesudah ${R.c.menyerah} detik`);
    expect(hitung).toContain("Hitungan dari rumus");
    expect(T.asal.butir.join(" ")).not.toMatch(/R\d-\d+/); // ID riset internal tidak tampil ke pembaca
    expect(sim).toBe("Simulasi yang menggerakkan batang dan kolom koneksi adalah Ilustrasi mekanisme. Tes mencocokkannya dengan rekaman lab.");
  });
  test("chip sumber dan label cocok", () => {
    expect(L.sumber).toBe("Ilustrasi · acuan Rekaman lab t3-pool");
    expect(L.cocok).toBe("Cocok dengan Rekaman lab");
    expect(L.tanpaAcuan).toContain("Hitungan");
    expect(L.tanpaAcuan).toContain("Ilustrasi");
  });
  test("jam awal = pengamatan bagian A dan ada di dalam jam simulasi", () => {
    expect(R.a.detik).toBe(30);
    expect(R.a.detik).toBeLessThanOrEqual(HORIZON);
  });
});

describe("templat yang diisi di browser hanya memakai nama yang dikirim island", () => {
  const nilai = { n: 10, puncak: 3, l: "1,757", x: "11,5", awal: "a", kini: "b", lambda: "0,87", rps: "17,4", tiap: 20, cara: "c", w: "2,02" };
  test("tidak ada nama yang tidak diisi", () => {
    for (const t of [L.vonis.muat, L.vonis.sempat, L.vonis.penuh, L.ringkasVonis.muat, L.ringkasVonis.sempat, L.ringkasVonis.penuh, L.banding.beda,
      L.hitungan.lambdaNilai, L.hitungan.wNilai, L.hitungan.lNilai, L.hitungan.penuhNilai, L.papan.pool, L.keadaan.judul, L.tabel.penuh]) {
      expect(() => isi(t, nilai), t).not.toThrow();
    }
    expect(() => isi(L.jam.keluar, { x: 1 })).not.toThrow();
    expect(() => isi(L.jam.nilai, { x: 1, terpakai: 1, n: 1, menunggu: 1 })).not.toThrow();
  });
  test("rumus Little di layar: bentuk kalimat tetap", () => {
    expect(isi(L.hitungan.lNilai, { lambda: "0,87", w: "2,02", l: "1,757 koneksi" })).toBe("λ × W = 0,87 × 2,02 = 1,757 koneksi.");
    expect(isi(L.hitungan.penuhNilai, { n: 10, lambda: "0,87", x: "11,5" })).toBe("n ÷ λ = 10 ÷ 0,87 = 11,5 detik.");
    expect(isi(L.hitungan.wNilai, { cara: "0,02 + 2", w: "2,02 detik" })).toBe("0,02 + 2 = 2,02 detik. Lama satu pembayaran memegang koneksi.");
    expect(isi(L.hitungan.lambdaNilai, { lambda: "0,87", rps: "17,4", tiap: 20 })).toBe("0,87 pembayaran per detik. Asumsi: 17,4 request per detik ÷ 20.");
    expect([L.hitungan.lambda, L.hitungan.w, L.hitungan.l, L.hitungan.penuh]).toEqual(["λ", "W", "L", "Pool penuh pada"]);
    expect(isi(L.banding.beda, { awal: "x", kini: "y" })).toBe("Awal: pool x. Sekarang: pool y.");
    expect(isi(L.jam.nilai, { x: 30, terpakai: 10, n: 10, menunggu: 16 })).toBe("Detik ke-30: 10 dari 10 koneksi terpakai, 16 pembayaran menunggu");
  });
  test("kalimat kesimpulan menyebut yang dihitung simulasi", () => {
    expect(isi(L.vonis.penuh, { n: 50, x: "57,5" })).toBe("Pool 50 penuh pada detik ke-57,5, lalu pembayaran dan pembacaan saldo menunggu koneksi.");
    expect(isi(L.vonis.muat, { n: 10, puncak: 3, l: "2,626", x: "" })).toBe("Pool 10 tidak pernah penuh: paling banyak 3 koneksi terpakai, L = 2,626.");
  });
});

describe("halaman uji dan komponen", () => {
  test("halaman uji menyebut λ sama dengan rekaman dan memuat komponen yang sama", () => {
    const uji = baca("situs/src/pages/uji/pool.astro");
    expect(uji).toContain(`masuk ${lambda} per detik`);
    expect(uji).toContain("<PoolLittle />");
  });
  test("komponen membaca ketiga rekaman lab", () => {
    const k = baca("situs/src/components/PoolLittle.astro");
    for (const f of ["m18.txt", "little.txt", "adr22.txt"]) expect(k).toContain(`labs/t3-pool/output/${f}`);
  });
});
