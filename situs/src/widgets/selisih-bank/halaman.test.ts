// Penjaga angka halaman 2.25 (tinjauan #327, keputusan 843): angka yang ditulis tangan di halaman MDX, di diagram Rantai
// t2-m15-dua-jalan.json, dan di teks widget harus bisa diturunkan dari rekaman labs/t2-pencairan/output/rentan.txt.
// logika.test.ts hanya menjaga angka yang dibaca widget; tanpa tes ini, mengubah satu angka di MDX atau di diagram tidak
// menggagalkan build, tes, atau alat ukur mana pun.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { bacaRekaman, rp } from "./logika";
import { LabelSelisihBank } from "./skema";
import labelMentah from "../../../data/widget/t2-m15-selisih.json";
import duaJalan from "../../../data/diagram/t2-m15-dua-jalan.json";

const akar = path.resolve(__dirname, "../../../..");
const rekaman = fs.readFileSync(path.join(akar, "labs/t2-pencairan/output/rentan.txt"), "utf8");
const halaman = fs.readFileSync(path.join(akar, "situs/src/content/docs/tahap-2/m15-file-bank.mdx"), "utf8");

const bagian: Record<string, string[]> = {};
{
  let kini = "";
  for (const b of rekaman.split("\n")) {
    const m = b.match(/^# --- ([A-Z])\. /);
    if (m) { kini = m[1]!; bagian[kini] = []; } else if (kini) bagian[kini]!.push(b);
  }
}
const ambil = (huruf: string): string[] => {
  const b = bagian[huruf];
  if (!b) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  return b;
};
const angka = (pola: RegExp, b: string[], nama: string): RegExpMatchArray => {
  const m = b.map((x) => x.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const kata: Record<number, string> = { 1: "satu", 2: "dua", 6: "enam", 7: "ketujuh" };
const sebut = (n: number): string => {
  const k = kata[n];
  if (!k) throw new Error(`halaman: belum ada kata untuk ${n}`);
  return k;
};

// Bagian A: saldo warung Jumat 15.00. Kolom: akun | nama | buku | saldo | saldo_cache.
const warungA = ambil("A").flatMap((b) => {
  const m = b.match(/^\s*(\d+) \| (.+?)\s+\|\s+(\d+) \|\s+(\d+) \|\s+(\d+)\s*$/);
  return m ? [{ nama: m[2]!, saldo: Number(m[4]) }] : [];
});
const totalSaldo = warungA.reduce((s, w) => s + w.saldo, 0);
const saldo508 = warungA.find((w) => w.nama === "Warung 508")!.saldo;
const urutan508 = warungA.findIndex((w) => w.nama === "Warung 508") + 1;

// Bagian B: job mati. Jurnal di ledger, last_value sequence, baris file, titik henti.
const B = ambil("B");
const jurnalB = B.flatMap((b) => {
  const m = b.match(/^\s*\d+ \| (.+?)\s+\|\s+-\d+\s*$/);
  return m ? [m[1]!] : [];
});
const terakhirB = Number(B[B.findIndex((b) => b.trim() === "nomor_jurnal_terakhir_dipakai") + 2]!.trim());
const barisFileB = B.filter((b) => /^\d+,Warung /.test(b)).length;
const hentiB = Number(angka(/titik henti baris-file:(\d+)/, B, "titik henti")[1]);

// Bagian C: job dijalankan lagi.
const C = ambil("C");
const bersaldoC = Number(angka(/: (\d+) warung bersaldo/, C, "warung bersaldo")[1]);
const j508C = angka(/^jurnal (\d+) COMMIT: Warung 508 (Rp[\d.]+)$/, C, "jurnal Warung 508")!;
const periode = angka(/periode (\S+)\s*$/, rekaman.split("\n").slice(0, 3), "periode")[1]!;

const R = bacaRekaman(rekaman);
const D = R["file-dulu"];
const E = R["jurnal-dulu"];

describe("rekaman: angka turunan yang dipakai halaman", () => {
  test("ledger cocok dengan saldo Jumat, titik henti di warung ketujuh, jalan kedua selesai dengan exit 0", () => {
    expect(totalSaldo).toBe(D.mutasiKas);
    expect(warungA).toHaveLength(12);
    expect(urutan508).toBe(hentiB);
    expect(jurnalB).toHaveLength(hentiB - 1);
    expect(bersaldoC).toBe(warungA.length - jurnalB.length);
    expect(barisFileB).toBe(hentiB);
    expect(C.some((b) => b.trim() === "-- exit 0")).toBe(true);
    expect(D.warung.jumlahFile).toBe(2 * saldo508);
    expect(D.selisih).toBe(saldo508);
    expect(E.selisih).toBe(-saldo508);
  });
});

describe("halaman m15-file-bank.mdx: tiap angka turunan dari rekaman", () => {
  const harus = (kalimat: string) => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);

  test("judul, deskripsi, dan Gejala", () => {
    harus(`title: "2.25 M15: ${rp(D.selisih)} di file bank"`);
    harus(`file transfer pencairan ${rp(D.selisih)} lebih besar dari ledger`);
    harus(`Angka file lebih besar ${rp(D.selisih)}.`);
    harus(`Saldo ${D.warung.nama} dibuat ${rp(saldo508)}`);
    harus(`periode ${periode}, dengan ${warungA.length} warung`);
  });

  test("Yang Raka kira: saldo dan mutasi", () => {
    harus(`Saldo ${warungA.length} warung berjumlah ${rp(totalSaldo)}, dan mutasi \`kas_pencairan\` juga ${rp(D.mutasiKas)}`);
  });

  test("Yang sebenarnya: kondisi, jalan pertama, jalan kedua, tutup buku", () => {
    harus(`Ada ${warungA.length} warung dengan saldo ${rp(totalSaldo)}, dan titik henti di warung ${sebut(urutan508)}`);
    harus(`server restart tepat sesudah baris warung ${sebut(urutan508)} ditulis ke file`);
    harus(`Ledger hanya punya ${sebut(jurnalB.length)} jurnal`);
    harus(`Nomor jurnal ${terakhirB} terpakai`);
    harus(`${sebut(jurnalB.length)[0]!.toUpperCase()}${sebut(jurnalB.length).slice(1)} warung pertama sudah bersaldo 0`);
    harus(`Saldo ${D.warung.nama} masih ${rp(saldo508)}`);
    harus(`${D.warung.nama} punya ${sebut(D.warung.barisFile)} baris di file dan ${sebut(D.warung.jurnal)} jurnal di ledger`);
    harus(`Selisih ${rp(D.selisih)} adalah baris kedua itu`);
    harus(`${D.warung.nama} menerima ${rp(D.warung.jumlahFile)} untuk saldo ${rp(saldo508)}`);
  });

  test("Coba sendiri: arah selisih bila urutan dibalik", () => {
    harus(`File lebih kecil ${rp(Math.abs(E.selisih))}, dan ${D.warung.nama} tidak ada di file`);
    expect(E.warung.barisFile).toBe(0);
  });
});

describe("diagram t2-m15-dua-jalan.json: tiap angka turunan dari rekaman", () => {
  const simpul = (d: typeof duaJalan) => d.baris.map((b) => b.simpul.map((s) => [s.teks, s.sub]));

  test("tiga baris, sembilan simpul", () => {
    expect(simpul(duaJalan)).toEqual([
      [
        [`${jurnalB.length} jurnal di ledger`, `${jurnalB[0]} sampai ${jurnalB[jurnalB.length - 1]}`],
        [`${barisFileB} baris di file`, `baris ${D.warung.nama} sudah tertulis`],
        [`Jurnal ${D.warung.nama} batal`, `nomor jurnal ${terakhirB} kosong`],
      ],
      [
        ["Saldo dibaca ulang", `${bersaldoC} warung masih bersaldo`],
        [`${D.warung.nama} dijurnal`, `jurnal ${j508C[1]}, ${j508C[2]}`],
        [`Baris ${D.warung.nama} ditulis lagi`, "file sudah memuatnya"],
      ],
      [
        [`File: ${D.barisFile} baris`, rp(D.totalFile)],
        [`Ledger: ${D.jurnal} jurnal`, rp(D.mutasiKas)],
        [`Selisih ${rp(D.selisih)}`, `sama dengan saldo ${D.warung.nama}`],
      ],
    ]);
    expect(j508C[2]).toBe(rp(saldo508));
    expect(duaJalan.baris[0]!.sub).toBe(`mati sebelum COMMIT warung ${sebut(urutan508)}`);
    expect(duaJalan.judul).toBe(`Job mati di baris ${sebut(urutan508)}, lalu dijalankan lagi`);
  });
});

describe("teks widget t2-m15-selisih.json: nama warung dari rekaman", () => {
  const L = LabelSelisihBank.parse(labelMentah);
  test("pertanyaan dan pilihan menyebut warung yang dikerjakan saat proses mati", () => {
    expect(L.pertanyaan).toContain(`sesudah baris ${D.warung.nama} ditulis ke file`);
    expect(L.pilihan[1]!.teks).toContain(D.warung.nama);
    expect(L.pilihan[2]!.teks).toContain(D.warung.nama);
  });
});
