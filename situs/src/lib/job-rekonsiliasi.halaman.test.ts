// Penjaga angka halaman 2.26 (tinjauan #334, keputusan 848): angka yang ditulis tangan di job-rekonsiliasi.mdx dan di diagram
// t2-job-rekonsiliasi-inti.json harus bisa diturunkan dari rekaman labs/t2-pencairan/output/, dan rentang baris Snippet harus
// tetap berisi yang dijelaskan. Tanpa tes ini, mengubah satu angka di MDX atau diagram, atau menggeser main.go, tidak
// menggagalkan build, Vitest, atau alat ukur mana pun (uji mutasi tinjauan: 507 tes tetap lolos).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import diagram from "../../data/diagram/t2-job-rekonsiliasi-inti.json";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const benar = baca("labs/t2-pencairan/output/benar.txt");
const rekon = baca("labs/t2-pencairan/output/rekonsiliasi.txt");
const rentan = baca("labs/t2-pencairan/output/rentan.txt");
const kode = baca("labs/t2-pencairan/cmd/pencairan/main.go").split("\n");
const halaman = baca("situs/src/content/docs/tahap-2/job-rekonsiliasi.mdx");

interface Bagian { awal: number; akhir: number; baris: string[] }
// Bagian rekaman diawali "# --- X. ..."; awal dan akhir adalah nomor baris (mulai 1) yang dipakai Snippet.
const pecah = (teks: string): Record<string, Bagian> => {
  const semua = teks.split("\n");
  const hasil: Record<string, Bagian> = {};
  let kini = "";
  semua.forEach((b, i) => {
    const m = b.match(/^# --- ([A-Z])\. /);
    if (m) {
      if (kini) hasil[kini]!.akhir = i;
      kini = m[1]!;
      hasil[kini] = { awal: i + 1, akhir: semua.length, baris: [] };
    } else if (kini) hasil[kini]!.baris.push(b);
  });
  return hasil;
};
const B = pecah(benar);
const R = pecah(rekon);
const bagian = (peta: Record<string, Bagian>, huruf: string): Bagian => {
  const b = peta[huruf];
  if (!b) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  return b;
};
const cari = (pola: RegExp, baris: string[], nama: string): RegExpMatchArray => {
  const m = baris.map((x) => x.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const rp = (n: number): string => `Rp${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const angka = (s: string): number => Number(s.replace(/\./g, ""));
const kata: Record<number, string> = { 6: "enam" };
const sebut = (n: number): string => {
  const k = kata[n];
  if (!k) throw new Error(`halaman: belum ada kata untuk ${n}`);
  return k;
};
const hash = (baris: string[]): string[] => baris.flatMap((b) => (/^[0-9a-f]{64}  /.test(b) ? [b.split(" ")[0]!] : []));

// benar.txt A: saldo warung Jumat 15.00 (akun | nama | buku | saldo | saldo_cache).
const warung = bagian(B, "A").baris.flatMap((b) => {
  const m = b.match(/^\s*(\d+) \| (.+?)\s+\|\s+(\d+) \|\s+(\d+) \|\s+(\d+)\s*$/);
  return m ? [{ nama: m[2]!, saldo: Number(m[4]) }] : [];
});
const totalSaldo = warung.reduce((s, w) => s + w.saldo, 0);
const saldo508 = warung.find((w) => w.nama === "Warung 508")!.saldo;
const urutan508 = warung.findIndex((w) => w.nama === "Warung 508") + 1;

// benar.txt B, C, D, E.
const hentiB = Number(cari(/titik henti jurnal:(\d+)/, bagian(B, "B").baris, "titik henti B")[1]);
const jurnalB = bagian(B, "B").baris.filter((b) => /^baris \d+ .*: jurnal \d+ COMMIT$/.test(b)).length;
const C = bagian(B, "C").baris;
const j508C = Number(cari(/^baris \d+ Warung 508 Rp[\d.]+: jurnal (\d+) COMMIT$/, C, "jurnal 508 di C")[1]);
const dilewatiC = C.filter((b) => /: sudah dicatat jurnal \d+, dilewati$/.test(b)).length;
const dicatatC = C.filter((b) => /^baris \d+ .*: jurnal \d+ COMMIT$/.test(b)).length;
const recC = cari(/^rekonsiliasi batch 1: file (\d+) baris Rp([\d.]+); ledger (\d+) jurnal pencairan, kas pencairan \+Rp([\d.]+)$/, C, "rekonsiliasi C");
const j508E = Number(cari(/^baris \d+ Warung 508 Rp[\d.]+: jurnal (\d+) COMMIT$/, bagian(B, "E").baris, "jurnal 508 di E")[1]);
const hashE = hash(bagian(B, "E").baris);
const hashC = hash(C);
const D = bagian(B, "D").baris;
const jurnalD = Number(cari(/^\s+(\d+)$/, D.slice(D.findIndex((b) => /RETURNING id;/.test(b)) + 1), "jurnal D")[1]);
const bayarD = Number(cari(/\(27, \(SELECT id FROM buku WHERE akun_id = 419\), -(\d+)\)/, D, "bayar D")[1]);
const saldoAniD = Number(cari(/^\s+(\d+) \|\s+(\d+)$/, D, "saldo Warung Ani D")[2]);
const hashD = hash(D);

// rekonsiliasi.txt A (cacat disuntik) dan C (jurnal dibalik).
const recA = cari(/^rekonsiliasi batch 1: file (\d+) baris Rp([\d.]+); ledger (\d+) jurnal pencairan, kas pencairan \+Rp([\d.]+)$/, bagian(R, "A").baris, "rekonsiliasi A");
const selisihA = angka(cari(/selisih total Rp([\d.]+)\)/, bagian(R, "A").baris, "selisih A")[1]!);
const recRC = cari(/^rekonsiliasi batch 1: file (\d+) baris Rp([\d.]+); ledger (\d+) jurnal pencairan, kas pencairan \+Rp([\d.]+)$/, bagian(R, "C").baris, "rekonsiliasi rekon C");

// rentan.txt D: baris_file | total_file | jurnal_pencairan | mutasi_kas_pencairan.
const rentanD = cari(/^\s+(\d+) \|\s+(\d+) \|\s+(\d+) \|\s+(\d+)\s*$/, rentan.split("\n"), "tutup buku rentan");
const nilaiRentan = [1, 2, 3, 4].map((i) => Number(rentanD[i]));
const barisRentan = nilaiRentan[0]!;
const totalRentan = nilaiRentan[1]!;
const jurnalRentan = nilaiRentan[2]!;
const kasRentan = nilaiRentan[3]!;
// Keputusan 508 mencatat empat proses bersamaan, 40 kali (tidak direkam di output/; halaman menulis "Tidak direkam").
const keputusan508 = baca("plan/KEPUTUSAN.md").split("\n").find((b) => b.startsWith("| 508 |")) ?? "";

describe("rekaman: angka turunan yang dipakai halaman", () => {
  test("12 warung, titik henti di warung ketujuh, jalan kedua melewati enam dan mencatat enam", () => {
    expect(warung).toHaveLength(12);
    expect(urutan508).toBe(hentiB);
    expect(jurnalB).toBe(hentiB - 1);
    expect(dilewatiC).toBe(jurnalB);
    expect(dicatatC).toBe(warung.length - jurnalB);
    expect(C.some((b) => b.trim() === "-- exit 0")).toBe(true);
    expect(j508C).toBe(j508E + 1); // nomor 20 dipakai transaction yang batal (sequence tidak di-rollback)
  });
  test("job lama (rentan) selisih = saldo Warung 508; job batch selisih nol; hash file sama sesudah dijalankan lagi", () => {
    expect(barisRentan).toBe(warung.length + 1);
    expect(totalRentan).toBe(totalSaldo + saldo508);
    expect(jurnalRentan).toBe(warung.length);
    expect(kasRentan).toBe(totalSaldo);
    expect(angka(recC[2]!)).toBe(totalSaldo);
    expect(angka(recC[4]!)).toBe(totalSaldo);
    expect(hashE).toHaveLength(2);
    expect(hashE[0]).toBe(hashE[1]);
    expect(hashD).toHaveLength(1);
    expect(hashD[0]).toBe(hashC[0]); // job ketiga tidak menyentuh file
  });
  test("rekonsiliasi menolak: file kembar 13 baris, atau ledger sudah membalik jurnal", () => {
    expect(Number(recA[1])).toBe(warung.length + 1);
    expect(angka(recA[2]!)).toBe(totalSaldo + saldo508);
    expect(selisihA).toBe(saldo508);
    expect(bagian(R, "A").baris.some((b) => b.trim() === "-- exit 3")).toBe(true);
    expect(angka(recRC[4]!)).toBe(totalSaldo - saldo508);
    expect(bagian(R, "C").baris.some((b) => b.trim() === "-- exit 3")).toBe(true);
  });
  test("Rp25.000 sesudah batch dikirim menunggu periode berikutnya", () => {
    expect(bayarD).toBe(25000);
    expect(saldoAniD).toBe(bayarD);
    expect(jurnalD).toBe(27);
    expect(D.some((b) => b.includes("batch sudah dikirim: tidak ada yang dikerjakan"))).toBe(true);
  });
});

describe("job-rekonsiliasi.mdx: tiap angka turunan dari rekaman", () => {
  const harus = (kalimat: string): void => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);

  test("Inti", () => {
    harus(`File berisi ${barisRentan} baris ${rp(totalRentan)}, sedangkan ledger berisi ${jurnalRentan} jurnal ${rp(kasRentan)}`);
    harus(`berakhir dengan selisih ${rp(angka(recC[2]!) - angka(recC[4]!))} (rekaman \`benar.txt\` bagian C)`);
  });
  test("Coba: tab A sampai D dan tabel ringkasan", () => {
    harus(`enam baris punya jurnal, enam belum`);
    harus(`Nomor jurnal Warung 508 adalah ${j508C}. Nomor ${j508E} tidak muncul di ledger`);
    harus(`file ${recC[1]} baris ${rp(angka(recC[2]!))} lawan ledger ${recC[3]} jurnal`);
    harus(`${sebut(dilewatiC)[0]!.toUpperCase()}${sebut(dilewatiC).slice(1)} baris dilewati, ${sebut(dicatatC)} dicatat; file ${recC[1]} baris ${rp(angka(recC[2]!))}`);
    harus(`Baris pencairan masih membekukan ${rp(saldo508)}`);
    harus(`Pembuat file menulis baris Warung 508 dua kali`);
    harus(`job keluar dengan kode 3`); // exit 3 ada di rekonsiliasi.txt bagian A dan C (diuji di atas)
  });
  test("Paham: baris rekaman yang disebut, Rp25.000, dan batas", () => {
    const baris = benar.split("\n");
    expect(baris[34]).toContain("dibuat: 12 baris");
    expect(baris[75]).toContain("sudah ada, status dibuat");
    harus("(`benar.txt` baris 35 dan 76)");
    // Nominal yang sama disebut di Inti, Paham, dan Cek diri: semua penyebutan harus sama dengan rekaman.
    const bayar = halaman.match(/Budi (?:lalu )?membayar Rp[\d.]+ ke Warung Ani/g) ?? [];
    expect(bayar.length).toBeGreaterThanOrEqual(3);
    for (const b of bayar) expect(b, `nominal bayar beda dari rekaman ${rp(bayarD)}`).toContain(rp(bayarD));
    const menunggu = halaman.match(/Rp[\d.]+ menunggu periode berikutnya/g) ?? [];
    expect(menunggu.length).toBeGreaterThanOrEqual(2);
    for (const b of menunggu) expect(b).toContain(rp(bayarD));
    harus(`Dicoba empat proses, 40 kali`);
    expect(keputusan508).toContain("Empat proses job bersamaan, 40 kali");
  });
  test("ADR 19: beban, perbandingan A dan C, dan rujukan rekaman", () => {
    harus(`${warung.length} × 52 = ${warung.length * 52}`);
    harus(`A berakhir dengan selisih ${rp(saldo508)} dan C berakhir dengan selisih ${rp(0)}`);
    harus(`\`rentan.txt\`: file ${barisRentan} baris lawan ledger ${jurnalRentan} jurnal`);
    harus(`ledger sudah mengembalikan ${rp(saldo508)} ke Warung 508`);
  });
});

describe("diagram t2-job-rekonsiliasi-inti.json: tiap angka turunan dari rekaman", () => {
  const simpul = diagram.baris.map((b) => b.simpul.map((s) => [s.teks, s.sub]));
  test("dua baris, empat simpul", () => {
    expect(simpul).toEqual([
      [
        [`warung ${hentiB} mati`, "lalu perintah yang sama"],
        [`selisih ${rp(saldo508)}`, `file ${barisRentan} baris, ledger ${jurnalRentan} jurnal`],
      ],
      [
        [`warung ${hentiB} mati`, "lalu perintah yang sama"],
        [`selisih ${rp(0)}`, `${sebut(dilewatiC)} warung dilewati, file ${recC[1]} baris`],
      ],
    ]);
    expect(diagram.catatan).toContain(`${warung.length} warung, ${rp(totalSaldo)}`);
  });
});

describe("Snippet berrentang baris di halaman", () => {
  interface Potongan { file: string; a: number; b: number; judul: string }
  const potongan: Potongan[] = [];
  for (const m of halaman.matchAll(/<Snippet\b[^]*?\/>/g)) {
    const tag = m[0];
    const judul = tag.match(/\btitle="([^"]*)"/)?.[1] ?? "";
    const satu = tag.match(/\bfile="([^"]+)"/)?.[1];
    const rentang = tag.match(/\blines="(\d+):(\d+)"/);
    if (satu && rentang) potongan.push({ file: satu, a: Number(rentang[1]), b: Number(rentang[2]), judul });
    const banyak = tag.match(/\bfiles=\{\[([^\]]*)\]\}/)?.[1];
    for (const e of banyak ? [...banyak.matchAll(/"([^":]+):(\d+):(\d+)"/g)] : [])
      potongan.push({ file: e[1]!, a: Number(e[2]), b: Number(e[3]), judul });
  }

  test("rentang rekaman ada di bagian yang disebut judulnya", () => {
    const rekaman = potongan.filter((p) => /output\/(benar|rekonsiliasi)\.txt$/.test(p.file) && /bagian [A-Z]/.test(p.judul));
    expect(rekaman.length).toBeGreaterThanOrEqual(10);
    for (const p of rekaman) {
      const huruf = p.judul.match(/bagian ([A-Z])/)![1]!;
      const b = bagian(p.file.endsWith("benar.txt") ? B : R, huruf);
      expect(p.a, `${p.file}:${p.a}:${p.b} di luar bagian ${huruf} (${b.awal}-${b.akhir})`).toBeGreaterThanOrEqual(b.awal);
      expect(p.b, `${p.file}:${p.a}:${p.b} di luar bagian ${huruf} (${b.awal}-${b.akhir})`).toBeLessThanOrEqual(b.akhir);
    }
  });

  // Jangkar: baris pertama, baris terakhir, dan isi yang dijelaskan prosa. Menggeser main.go menggagalkan tes ini.
  const jangkar: Record<string, { awal: string; akhir: string; ada: string[] }> = {
    "38:40": { awal: "// Periode adalah kunci", akhir: "polaPeriode", ada: ["minggu ISO"] },
    "216:225": { awal: "INSERT INTO batch_pencairan", akhir: "RowsAffected() == 1", ada: ["ON CONFLICT (periode) DO NOTHING"] },
    "216:246": { awal: "INSERT INTO batch_pencairan", akhir: "}", ada: ["RowsAffected() == 1", "tx.Commit(ctx)", "sudah ada, status"] },
    "286:308": { awal: "for i, w := range daftar", akhir: "}", ada: ["jurnal_id IS NULL FOR UPDATE", "dilewati"] },
    "309:331": { awal: "// Kunci buku warung", akhir: "jurnal %d COMMIT", ada: ["FOR UPDATE", "catatJurnal", "SET jurnal_id", "tx.Commit(ctx)"] },
    "394:415": { awal: "rekonsiliasi(ctx, tx, id, sementara)", akhir: "dikirim", ada: ["os.Rename", "syncFolder", "tx.Commit(ctx)"] },
    "524:530": { awal: "if beda > 0", akhir: "}", ada: ["errDitolak", "rekonsiliasi: cocok", "DITOLAK"] },
  };
  const cocok = (baris: string, pola: string): boolean => (pola === "}" ? baris.trim() === "}" : baris.includes(pola));

  test("rentang main.go punya jangkar dan jangkarnya masih di baris yang sama", () => {
    const dariKode = potongan.filter((p) => p.file.endsWith("cmd/pencairan/main.go"));
    expect(dariKode.length).toBeGreaterThanOrEqual(7);
    for (const p of dariKode) {
      const j = jangkar[`${p.a}:${p.b}`];
      expect(j, `rentang main.go ${p.a}:${p.b} belum punya jangkar di tes ini`).toBeDefined();
      const isi = kode.slice(p.a - 1, p.b);
      expect(cocok(isi[0]!, j!.awal), `main.go:${p.a} bukan awal "${j!.awal}": ${isi[0]}`).toBe(true);
      expect(cocok(isi[isi.length - 1]!, j!.akhir), `main.go:${p.b} bukan akhir "${j!.akhir}": ${isi[isi.length - 1]}`).toBe(true);
      for (const s of j!.ada) expect(isi.join("\n"), `main.go:${p.a}:${p.b} tidak memuat ${s}`).toContain(s);
    }
  });
});
