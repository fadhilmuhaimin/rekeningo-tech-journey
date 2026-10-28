// Tes logika widget webhook masuk (W4-webhook, keputusan 1258): model dua handler, pencocokan dengan rekaman, nilai pengisi
// teks dibandingkan dengan pembacaan kedua atas teks rekaman mentah, penyusunan teks, dan mesin langkah.
import { describe, expect, test } from "vitest";
import { bacaAcuan, type Acuan } from "./rekaman";
import {
  AWAL, ID_LANGKAH, MODE, SKENARIO, bangun, isi, jalankan, kelas, langkahBerikut, langkahDariGulir, langkahSebelum, nilaiTemplat, periksaModel, rp, terima,
  type Keadaan,
} from "./logika";
import { LabelWebhook } from "./skema";
import { asli, labelMentah, registri as bacaRegistri } from "./berkas-uji";

const registri = bacaRegistri();
const adrHandler = registri.find((h) => h.id === "t4-webhook")!.adr![0]!;

describe("model handler versi pertama", () => {
  const settle = { id: "e1", status: "settlement" } as const;
  const pending = { id: "e2", status: "pending" } as const;
  test("settlement selalu menjurnal, tanpa tabel event", () => {
    const r1 = terima("pertama", AWAL, settle);
    const r2 = terima("pertama", r1.keadaan, settle);
    expect(r1.keadaan).toEqual({ status: "dibayar", jurnal: 1, event: [] });
    expect(r2.keadaan).toEqual({ status: "dibayar", jurnal: 2, event: [] });
    expect([r1.jawaban, r2.jawaban]).toEqual(["diproses", "diproses"]);
  });
  test("pending menimpa status tanpa syarat dan tidak menjurnal", () => {
    const r = terima("pertama", { status: "dibayar", jurnal: 1, event: [] }, pending);
    expect(r.keadaan).toEqual({ status: "menunggu", jurnal: 1, event: [] });
    expect(r.jawaban).toBe("diproses");
  });
});

describe("model handler versi ADR 34", () => {
  const settle = { id: "e1", status: "settlement" } as const;
  test("event yang sama menjawab ganda dan tidak mengubah apa pun", () => {
    const r1 = terima("adr34", AWAL, settle);
    const r2 = terima("adr34", r1.keadaan, settle);
    expect(r1.keadaan).toEqual({ status: "dibayar", jurnal: 1, event: [{ id: "e1", jenis: "settlement", hasil: "diproses" }] });
    expect(r2).toEqual({ keadaan: r1.keadaan, jawaban: "ganda" });
  });
  test("settlement dari event lain untuk top-up yang sudah dibayar tidak menjurnal lagi", () => {
    const r1 = terima("adr34", AWAL, settle);
    const r2 = terima("adr34", r1.keadaan, { id: "e9", status: "settlement" });
    expect(r2.jawaban).toBe("ganda");
    expect(r2.keadaan.jurnal).toBe(1);
    expect(r2.keadaan.event.map((e) => e.id)).toEqual(["e1", "e9"]);
    // webhookAman: terapkanStatus menjawab "ganda" (target sama dengan status), dan SelesaiEvent menulis jawaban itu ke webhook_event.hasil.
    expect(r2.keadaan.event[1]).toEqual({ id: "e9", jenis: "settlement", hasil: "ganda" });
  });
  test("pending sesudah dibayar diparkir, status tidak mundur", () => {
    const r1 = terima("adr34", AWAL, settle);
    const r2 = terima("adr34", r1.keadaan, { id: "e2", status: "pending" });
    expect(r2.jawaban).toBe("diparkir");
    expect(r2.keadaan.status).toBe("dibayar");
    expect(r2.keadaan.event[1]).toEqual({ id: "e2", jenis: "pending", hasil: "diparkir" });
  });
  test("pending sebelum dibayar diproses dan tidak menjurnal", () => {
    const r = terima("adr34", AWAL, { id: "e2", status: "pending" });
    expect(r.jawaban).toBe("diproses");
    expect(r.keadaan).toEqual({ status: "menunggu", jurnal: 0, event: [{ id: "e2", jenis: "pending", hasil: "diproses" }] });
  });
  test("kabar tidak mengubah keadaan masukan (tanpa efek samping)", () => {
    const k: Keadaan = { status: "menunggu", jurnal: 0, event: [] };
    const salinan = JSON.stringify(k);
    terima("adr34", k, settle);
    terima("pertama", k, settle);
    expect(JSON.stringify(k)).toBe(salinan);
  });
  test("jalankan mencatat keadaan sesudah tiap kabar dan jawabannya", () => {
    const r = jalankan("adr34", SKENARIO.ganda);
    expect(r.jawaban).toEqual(["diproses", "ganda"]);
    expect(r.sesudah.map((k) => k.jurnal)).toEqual([1, 1]);
    expect(jalankan("pertama", SKENARIO.ganda).sesudah.map((k) => k.jurnal)).toEqual([1, 2]);
  });
});

describe("model cocok dengan rekaman dan gagal bila rekaman berubah", () => {
  const a = bacaAcuan(asli());
  test("rekaman asli lolos", () => expect(() => periksaModel(a)).not.toThrow());
  const salinan = (): Acuan => JSON.parse(JSON.stringify(a)) as Acuan;
  const MUTAN: [string, (x: Acuan) => void][] = [
    ["jawaban versi pertama", (x) => { x.ganda.kirimA = ["200 diproses", "200 ganda"]; }],
    ["jurnal versi pertama", (x) => { x.ganda.jurnalA = 1; }],
    ["saldo naik", (x) => { x.ganda.saldoNaikA = 200000; }],
    ["jawaban kiriman kedua ADR 34", (x) => { x.ganda.kirim2B = "200 diproses"; }],
    ["baris event ADR 34", (x) => { x.ganda.eventBarisB = 2; }],
    ["event ADR 34", (x) => { x.ganda.eventB.id = "evt-2"; }],
    ["ada jurnal ADR 34", (x) => { x.ganda.eventB.adaJurnal = false; }],
    ["status mundur versi pertama", (x) => { x.terlambat.statusV1 = "dibayar"; }],
    ["jawaban pending ADR 34", (x) => { x.terlambat.jawabF1 = "200 diproses"; }],
    ["status sesudah pending ADR 34", (x) => { x.terlambat.statusF1 = "menunggu"; }],
    ["event pending ADR 34", (x) => { x.terlambat.eventF1[1]!.hasil = "diproses"; }],
    ["jumlah kiriman", (x) => { x.hilang.kirim401.n = 5; }],
    ["total menit", (x) => { x.hilang.total = 340; }],
    ["menit kiriman", (x) => { x.hilang.kirim401.menit[5] = 341; }],
    ["menit retry B", (x) => { x.hilang.menitB[1] = 3; }],
    ["jawaban retry B", (x) => { x.hilang.jawabanB[2] = "200"; }],
    ["event retry B", (x) => { x.hilang.eventB = 1; }],
    ["status retry B", (x) => { x.hilang.statusB = "dibayar"; }],
    ["umur cek 29", (x) => { x.hilang.cekA[1]!.umur = 31; }],
    ["diperiksa 31", (x) => { x.hilang.cekA[2]!.diperiksa = 0; }],
    ["dikredit 31", (x) => { x.hilang.cekA[2]!.dikredit = 0; }],
    ["batas cek", (x) => { x.hilang.batasCek = 20; }],
    ["jumlah insiden", (x) => { x.rekon.jumlahBeda = 2; }],
    ["jumlah koreksi", (x) => { x.rekon.dikoreksi = 2; }],
    ["posting lama", (x) => { x.rekon.postingLamaSama = false; }],
  ];
  test.each(MUTAN)("%s", (_nama, ubah) => {
    const x = salinan();
    ubah(x);
    expect(() => periksaModel(x)).toThrow(/model webhook/);
  });
});

describe("nilai pengisi teks sama dengan pembacaan kedua atas rekaman mentah", () => {
  const r = asli();
  const a = bacaAcuan(r);
  const v = nilaiTemplat(a, adrHandler);
  const cari = (teks: string, pola: RegExp): string => {
    const m = teks.match(pola);
    if (!m) throw new Error(`tak ada ${pola}`);
    return m[1]!;
  };
  const baris = (teks: string, frasa: string): string[] => teks.split("\n").filter((l) => l.includes(frasa));
  const hitung = (teks: string, pola: RegExp): number => (teks.match(pola) ?? []).length;
  const sampai = (teks: string, dari: string, ke: string): string => teks.slice(teks.indexOf(dari), teks.indexOf(ke));
  const retryB = sampai(r.retry, "# --- B.", "# --- C.");
  const rekonA = sampai(r.rekon, "# --- A.", "# --- B.");
  const rekonB = sampai(r.rekon, "# --- B.", "# --- C.");
  const f1 = sampai(r.urutan, "# --- F1.", "# --- F2.");
  const jurnalIds = new Set([...sampai(r.ganda, "# --- A.", "# --- B.").matchAll(/^ (\d{5})\s+\|/gm)].map((m) => m[1]));

  const HARAP: Record<string, string> = {
    adrHandler: String(registri.find((h) => h.id === "t4-webhook")!.adr![0]),
    bayar: cari(r.ganda, /Satu pembayaran (Rp[\d.]+),/),
    kode: cari(r.ganda, /hasil kiriman: (\d+) /),
    event1: cari(r.ganda, /\n (evt-\d)\s+\| settlement/),
    awalBaris: "0",
    awalJurnal: "0",
    jurnal1: "1",
    jurnalPertama: String(jurnalIds.size),
    naikPertama: cari(r.ganda, /saldo Budi naik (Rp[\d.]+)\./),
    kirim2Pertama: cari(r.ganda, /hasil kiriman: [^,]+, ([^\n]+)\n/),
    eventPertama: cari(r.rentan, /event_tercatat\n-+\n (\d+)/),
    jurnalAdr: "1",
    kirim2Adr: cari(r.ganda, /kiriman 2 \(event yang sama\): ([^\n]+)\n/),
    eventAdr: cari(r.ganda, /ada_jurnal\n[-+]+\n[^\n]+\n\((\d+) row\)/),
    eventAdrJenis: cari(r.ganda, /\n evt-\d\s+\| (\w+)\s+\| diproses/),
    eventAdrHasil: cari(r.ganda, /\n evt-\d\s+\| \w+\s+\| (\w+)\s+\| t/),
    statusPending: cari(r.rentan, /status\n-+\n (menunggu)\n/),
    jawabTerlambatAdr: cari(f1, /kabar pending sesudah settlement: ([^\n]+)\n/),
    statusTerlambatAdr: cari(f1, /status\n-+\n (\w+)\n/),
    eventTerlambatAdr: [...f1.matchAll(/\n (evt-f\d)\s+\| (\w+)\s+\| (\w+)/g)].map((m) => `${m[1]} ${m[2]} ${m[3]}`).join("; "),
    tanyaTerlambat: cari(f1, /ke gateway: (\d+)\n/),
    jadwal: "2, 10, 30, 90, dan 210",
    total: cari(r.retry, /\(total (\d+) menit\)/),
    jamTotal: cari(retryB, /±([\d,]+) jam/),
    menitUlang1: cari(r.retry, /sebelumnya\): (\d+),/),
    kirimanN: cari(r.retry, /^ 401\s+\| (\d+)/m),
    menitDaftar: cari(r.retry, /^ 401\s+\|\s+\d+\s+\| ([\d, ]+?)\s+\|/m),
    berhenti: cari(retryB, /gateway berhenti: ([^(]+) \(/).trim(),
    kodeTolak: cari(retryB, /^ 1\s+\| 0\s+\| (\d+)$/m),
    eventHilang: cari(retryB, /AS webhook_event FROM webhook_event\n webhook_event\n-+\n (\d+)\n/),
    statusHilang: cari(retryB, /status\s+\| jurnal_id\n-+\+-+\n (\w+)\s+\|\n/),
    uangHilang: cari(retryB, /Uang (Rp[\d.]+) sudah di bank/),
    batasCek: cari(rekonA, /bawaan -cek-umur (\d+)m/),
    umur1: cari(rekonA, /interval '(\d+) minutes'/),
    periksa1: cari(sampai(rekonA, "29 minutes", "31 minutes"), /cek top-up: diperiksa (\d+),/),
    umur2: [...rekonA.matchAll(/interval '(\d+) minutes'/g)][1]![1]!,
    periksa2: cari(rekonA.slice(rekonA.indexOf("31 minutes")), /cek top-up: diperiksa (\d+),/),
    kredit2: cari(rekonA.slice(rekonA.indexOf("31 minutes")), /dikredit (\d+),/),
    statusCek: cari(rekonA, /ada_jurnal\n-+\+-+\n (\w+)\s+\| t/),
    barisLaporan: cari(rekonB, /<tanggal>: (\d+) baris/),
    insiden: cari(rekonB, /koreksi rekon: diperiksa (\d+),/),
    tidakDiLedger: cari(rekonB, /insiden baru: tidak_di_ledger (\d+),/),
    tidakDiGateway: cari(rekonB, /tidak_di_gateway (\d+),/),
    jumlahBeda: cari(rekonB, /jumlah_beda (\d+)\n/),
    dikoreksi: cari(rekonB, /dikoreksi lewat jurnal (\d+),/),
    tanpaJurnal: cari(rekonB, /selesai tanpa jurnal baru (\d+),/),
    terbuka: cari(rekonB, /tetap terbuka (\d+),/),
  };
  test("setiap kunci nilai punya pembanding dan sama", () => {
    expect(Object.keys(v).sort()).toEqual(Object.keys(HARAP).sort());
    for (const k of Object.keys(HARAP)) expect(v[k], k).toBe(HARAP[k]);
  });
  test("pembanding memakai teks yang ada: jumlah jurnal dan baris contoh", () => {
    expect(hitung(r.ganda, /jurnal_id/g)).toBeGreaterThan(0);
    expect(baris(r.ganda, "evt-1").length).toBeGreaterThan(0);
  });
});

describe("rupiah dan templat", () => {
  test("rp memakai pemisah ribuan id-ID", () => {
    expect(rp(200000)).toBe("Rp200.000");
    expect(rp(0)).toBe("Rp0");
  });
  test("isi mengganti placeholder, mencatat pemakaian, dan menolak nama asing", () => {
    const dipakai = new Set<string>();
    expect(isi("a {x} b {y} {x}", { x: "1", y: "2" }, dipakai)).toBe("a 1 b 2 1");
    expect([...dipakai].sort()).toEqual(["x", "y"]);
    expect(() => isi("{z}", { x: "1" })).toThrow(/tidak diisi/);
  });
});

describe("teks siap tampil", () => {
  const a = bacaAcuan(asli());
  const L = LabelWebhook.parse(labelMentah());
  const s = bangun(L, a, adrHandler);
  const kalimat = (t: string) => (t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t]).length;

  test("delapan langkah berurutan, masing-masing dengan hasil untuk kedua versi", () => {
    expect(s.langkah.map((l) => l.id)).toEqual([...ID_LANGKAH]);
    for (const l of s.langkah) expect(Object.keys(l.hasil).sort()).toEqual([...MODE].sort());
  });
  test("tidak ada placeholder yang tersisa di teks yang tampil", () => {
    const kumpul = (x: unknown): string[] => (typeof x === "string" ? [x] : x && typeof x === "object" ? Object.values(x).flatMap(kumpul) : []);
    const semua = kumpul(s);
    expect(semua.length).toBeGreaterThan(100);
    expect(semua.filter((t) => /[{}]/.test(t))).toEqual([]);
  });
  test("kalimat status satu kalimat, memuat nomor langkah, jumlah langkah, dan versi", () => {
    s.langkah.forEach((l, i) => {
      for (const m of MODE) {
        const t = l.hasil[m].ringkas;
        expect(kalimat(t), t).toBe(1);
        expect(t.startsWith(`Langkah ${i + 1} dari ${s.langkah.length}, `)).toBe(true);
        expect(t).toContain(m === "pertama" ? "versi pertama:" : `versi ADR ${adrHandler}:`);
        expect(t.endsWith(".")).toBe(true);
      }
    });
  });
  test("kalimat status berbeda antar langkah, dan antar versi pada langkah yang hasilnya berbeda", () => {
    const semua = s.langkah.flatMap((l) => MODE.map((m) => l.hasil[m].ringkas));
    expect(new Set(semua).size).toBe(semua.length);
  });
  test("tebakan: tepat satu jawaban benar, yaitu pilihan ke-3 dengan nilai sama dengan jurnal versi pertama", () => {
    expect(s.tebak.benar).toBe(2);
    expect(s.tebak.pilihan[s.tebak.benar]!.teks).toContain(`${jalankan("pertama", SKENARIO.ganda).keadaan.jurnal} jurnal`);
    expect(s.tebak.pilihan[s.tebak.benar]!.alasan.startsWith("Ya.")).toBe(true);
    s.tebak.pilihan.forEach((p, i) => { if (i !== s.tebak.benar) expect(p.alasan.startsWith("Tidak.")).toBe(true); });
  });
  test("dua pilihan dengan nilai sama menggagalkan build", () => {
    const x = JSON.parse(JSON.stringify(labelMentah())) as { tebak: { pilihan: { nilai: number }[] } };
    x.tebak.pilihan[0]!.nilai = 2;
    expect(() => bangun(LabelWebhook.parse(x), a, adrHandler)).toThrow(/tepat satu/);
  });
  test("placeholder asing menggagalkan build", () => {
    const x = JSON.parse(JSON.stringify(labelMentah())) as { langkah: { teks: string }[] };
    x.langkah[0]!.teks += " {tidakAda}";
    expect(() => bangun(LabelWebhook.parse(x), a, adrHandler)).toThrow(/tidak diisi/);
  });
  test("nilai pengisi yang tidak dipakai teks menggagalkan build", () => {
    const x = JSON.parse(JSON.stringify(labelMentah())) as { langkah: { teks: string }[] };
    x.langkah[0]!.teks = x.langkah[0]!.teks.replace("{bayar}", "dana");
    x.langkah.forEach((l: any) => { if (l.hasil) l.hasil = JSON.parse(JSON.stringify(l.hasil).replaceAll("{bayar}", "dana")); });
    const y = x as unknown as { tebak: { pertanyaan: string; pilihan: { teks: string; alasan: string }[] } };
    y.tebak.pertanyaan = y.tebak.pertanyaan.replaceAll("{bayar}", "dana");
    y.tebak.pilihan.forEach((p) => { p.teks = p.teks.replaceAll("{bayar}", "dana"); p.alasan = p.alasan.replaceAll("{bayar}", "dana"); });
    expect(() => bangun(LabelWebhook.parse(x), a, adrHandler)).toThrow(/tidak dipakai/);
  });
  test("urutan langkah yang berubah menggagalkan build", () => {
    const x = JSON.parse(JSON.stringify(labelMentah())) as { langkah: unknown[] };
    [x.langkah[1], x.langkah[2]] = [x.langkah[2], x.langkah[1]];
    expect(() => bangun(LabelWebhook.parse(x), a, adrHandler)).toThrow(/urutan langkah/);
  });
});

describe("mesin langkah", () => {
  test("kelas menjepit ke 0 sampai n-1", () => {
    expect([kelas(-3, 8), kelas(0, 8), kelas(7, 8), kelas(9, 8)]).toEqual([0, 0, 7, 7]);
  });
  test("berikutnya dan sebelumnya berhenti di ujung", () => {
    expect([langkahBerikut(0, 8), langkahBerikut(6, 8), langkahBerikut(7, 8)]).toEqual([1, 7, 7]);
    expect([langkahSebelum(7, 8), langkahSebelum(1, 8), langkahSebelum(0, 8)]).toEqual([6, 0, 0]);
  });
  test("langkah dari gulir: yang terakhir dengan tepi atas di atas garis, dengan toleransi", () => {
    const tepi = [-500, -300, -100, 60, 260, 460];
    expect(langkahDariGulir(tepi, 100)).toBe(3);
    expect(langkahDariGulir(tepi, 59)).toBe(3); // 60 <= 59 + 8
    expect(langkahDariGulir(tepi, 51)).toBe(2); // 60 > 51 + 8
    expect(langkahDariGulir(tepi, 52)).toBe(3); // 60 <= 52 + 8 tepat di batas
    expect(langkahDariGulir([200, 400], 100)).toBe(0); // belum ada yang melewati garis: tetap langkah pertama
    expect(langkahDariGulir(tepi, 1000)).toBe(5);
    expect(langkahDariGulir(tepi, 100, 0)).toBe(3);
    expect(langkahDariGulir([100.5], 100, 0)).toBe(0);
  });
});
