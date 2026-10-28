// Penjaga halaman 3.5 (keputusan 1016 sampai 1018): jumlah dan nama tabel, kolom baru, aturan outbox, rumus ukuran data,
// label sumber, versi stack, dan klaim "tidak ada" di skema-data.mdx, diagram t3-skema-inti.json, tebakan
// t3-skema-tebak.json, dan halaman istilah index-sebagian.json diturunkan dari ERD Tahap 2 dan 3 (situs/data/erd), rekaman
// labs/api-t3, labs/b2-query, dan labs/t3-outbox, migration api-t3, registry (cerita.json), naskah Tahap 3 bagian 3b,
// halaman 2.9 dan 2.30, serta baris riset R3-120 sampai R3-124. Tanpa tes ini, mengubah satu angka, satu kata kunci, satu
// nama tabel, satu SQLSTATE, satu label, atau satu versi di halaman ini tidak menggagalkan build atau alat ukur mana pun.
// Tes hanya membaca berkas yang dilacak git (bukan hasil build atau binari lokal, pelajaran 3.2).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok } from "./blok";
import { HalamanIstilah } from "./istilah";
import { DataTebak } from "../widgets/tebak/skema";
import { LABEL_STATUS } from "../erd/tumbuh";

const akar = path.resolve(__dirname, "../../..");
const terlacak = new Set(
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: akar, encoding: "utf8", maxBuffer: 1 << 26 }).split("\n").filter(Boolean),
);
const baca = (rel: string): string => {
  if (!terlacak.has(rel)) throw new Error(`${rel} tidak dilacak git: tes tidak boleh membaca hasil build atau berkas lokal`);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};
const bacaJson = <T>(rel: string): T => JSON.parse(baca(rel)) as T;

// ---- sumber -------------------------------------------------------------------------------------------------------------
const HALAMAN_MDX = "situs/src/content/docs/tahap-3/skema-data.mdx";
const mdx = baca(HALAMAN_MDX);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const naskahBaris = naskah.split("\n");
const riset = baca("plan/RISET-TAHAP-3.md");
const mdx29 = baca("situs/src/content/docs/tahap-2/skema-data.mdx");
const mdx230 = baca("situs/src/content/docs/tahap-2/estimasi.mdx");
const adrLedger = baca("situs/src/content/docs/tahap-2/adr-ledger.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const dataTebakMentah = bacaJson<unknown>("situs/data/widget/t3-skema-tebak.json");
const tebak = DataTebak.parse(dataTebakMentah);
const rantaiMentah = bacaJson<unknown>("situs/data/diagram/t3-skema-inti.json");
const rantai = DataRantai.parse(rantaiMentah);
const istilah = HalamanIstilah.parse(bacaJson<unknown>("situs/data/halaman-istilah/index-sebagian.json"));
const petaErd = bacaJson<{ tahap: Record<string, Record<string, string[]>> }>("situs/data/erd/halaman.json");

interface Fk { nama: string; kolom: string[]; ke_tabel: string; ke_kolom: string[] }
interface Tabel {
  nama: string;
  kolom: { nama: string; tipe: string; wajib: boolean }[];
  pk: string[];
  fk: Fk[];
  unik: { nama: string; kolom: string[] }[];
  cek: { nama: string; ekspresi: string }[];
  index: { nama: string; unik: boolean; definisi: string }[];
}
interface Erd {
  tahap: number;
  sumber: { file: string[] };
  tabel: Tabel[];
  selisih: {
    terhadap: number;
    tabel_baru: string[];
    tabel_dihapus: string[];
    kolom_baru: { tabel: string; kolom: string }[];
    kolom_dihapus: unknown[];
    kolom_berubah: unknown[];
  };
}
const erd2 = bacaJson<Erd>("situs/data/erd/tahap-2.json");
const erd3 = bacaJson<Erd>("situs/data/erd/tahap-3.json");
const tabel3 = (n: string): Tabel => erd3.tabel.find((t) => t.nama === n)!;
const tabel2 = (n: string): Tabel | undefined => erd2.tabel.find((t) => t.nama === n);

const skema = baca("labs/api-t3/output/skema.txt").split("\n");
const outboxTxt = baca("labs/api-t3/output/outbox.txt").split("\n");
const kontrakTxt = baca("labs/api-t3/output/kontrak.txt");
const listen = baca("labs/t3-outbox/output/listen.txt").split("\n");
const indexB2 = baca("labs/b2-query/output/ledger/index.txt").split("\n");
const dataB2 = baca("labs/b2-query/output/ledger/data.txt").split("\n");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const migrasi = [15, 16, 17, 18, 19].map((n) => {
  const nama = [...terlacak].find((f) => f.startsWith(`labs/api-t3/migrasi/0000${n}_`) && f.endsWith(".up.sql"))!;
  return { nama, isi: baca(nama) };
});
const m17 = migrasi[2]!.isi.split("\n");

interface H { id: string; judul: string; tahap: number | string; jenis?: string; bagian?: number | string; nomor?: string; ada?: boolean; prasyarat?: string[]; inti?: boolean; menit?: number; lab?: string[] }
const HALAMAN = cerita.halaman as unknown as H[];
const per = (id: string): H => {
  const h = HALAMAN.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const asumsi = (no: number) => (cerita.tahap as unknown as { no: number; asumsi: { user: number; aktif: number; req: number; puncak: number; trx: number; baris: number; tim: string } }[]).find((t) => t.no === no)!.asumsi;

// ---- format ----------------------------------------------------------------------------------------------------------------
const KATA = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"];
const kata = (n: number): string => KATA[n]!;
const titik = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (x: number, d: number): string => x.toFixed(d).replace(".", ",");
const kode = (s: string): string => `\`${s}\``;
const daftarDan = (xs: string[]): string => `${xs.slice(0, -1).map(kode).join(", ")}, dan ${kode(xs[xs.length - 1]!)}`;
const dua = (x: number): number => Number(x.toPrecision(2));
const bulatSatu = (bagi: number, x: number): string => koma(Math.round(x / (bagi / 10)) / 10, 1); // setengah ke atas, tanpa galat biner
const MB = 1e6;
const GB = 1e9;

// ---- turunan dari naskah, registry, dan ERD -------------------------------------------------------------------------------
const rumus = naskah.match(/Posting per tahun = transaksi per hari × (\d+) × (\d+)\*, ±(\d+) byte per posting/)!;
const PER_POSTING = Number(rumus[1]);
const HARI = Number(rumus[2]);
const BYTE_POSTING = Number(rumus[3]);
const TRX_LEDGER = Number(naskah.match(/Transaksi uang (\d+) per user aktif per hari/)![1]);
const BYTE_BARIS = asumsi(3).baris;
// Kalimat tim Tahap 4 di halaman 3.5 diturunkan dari registry ("13 developer, 3 tim"), bukan ditulis tangan. Kalimat lama
// "6–10 developer dalam 2 tim" ikut dijaga tidak kembali (KONSISTENSI-4, butir 1).
const TIM_T4_HALAMAN = ((m) => `${m[1]} developer dalam ${KATA[Number(m[2])]} tim`)(asumsi(4).tim.match(/^(\d+) developer, (\d+) tim$/)!);
function tahunData(no: number) {
  const a = asumsi(no);
  const aktif = (a.user * a.aktif) / 100;
  const trx = aktif * TRX_LEDGER;
  const posting = trx * PER_POSTING * HARI;
  return { user: a.user, persenAktif: a.aktif, aktif, trx, posting, byte: posting * BYTE_POSTING };
}
const t2 = tahunData(2);
const t3 = tahunData(3);
const t4 = tahunData(4);
const sig = (n: number): string => (n >= 1e6 ? `±${koma(dua(n / 1e6), 1).replace(/,0$/, "")} juta` : `±${titik(dua(n / 1e3))} ribu`);
const ukuran = (b: number): string => (b >= GB ? `±${koma(dua(b / GB), 1).replace(/,0$/, "")} GB` : `±${titik(dua(b / MB))} MB`);

const sama = (n: string): boolean => JSON.stringify(tabel2(n)) === JSON.stringify(tabel3(n));
const tetap = erd2.tabel.map((t) => t.nama).filter(sama);
const berubah = erd2.tabel.map((t) => t.nama).filter((n) => !sama(n));
const baru = erd3.selisih.tabel_baru;
const kolomBaru = erd3.selisih.kolom_baru;
const UANG = ["buku", "jurnal", "posting"];
const menujuAkun = (e: Erd): string[] => e.tabel.filter((t) => t.fk.some((f) => f.ke_tabel === "akun")).map((t) => t.nama);
const jumlahFk = (e: Erd): number => e.tabel.reduce((n, t) => n + t.fk.length, 0);

// ---- naskah: bagian 3b ----------------------------------------------------------------------------------------------------
const potong = (awal: RegExp, akhir: RegExp): string[] => {
  const a = naskahBaris.findIndex((b) => awal.test(b));
  const z = naskahBaris.findIndex((b, i) => i > a && akhir.test(b));
  if (a < 0 || z < 0) throw new Error(`naskah: bagian ${awal} tidak ada`);
  return naskahBaris.slice(a, z);
};
const sel = (b: string): string[] => b.replace(/^\|/, "").replace(/\|\s*$/, "").split(/(?<!\\)\|/).map((s) => s.trim());
const tanpaIdRiset = (s: string): string => s.replace(/\s*\(R3-\d+(?:, R3-\d+)*\)/g, "");
const baris3b = potong(/^### Apa yang berubah dan kenapa/, /^### Pertumbuhan skala database/);
const tabelNaskah = baris3b.filter((b) => b.startsWith("| ") && !b.startsWith("| ---") && !b.startsWith("| Tahap 2")).map(sel).map((r) => r.map(tanpaIdRiset));
const bagian3b = potong(/^## 3b\. Skema data/, /^### Spesifikasi untuk Claude Code/).join("\n");

// ---- MDX ---------------------------------------------------------------------------------------------------------------------
const blokMdx = (nama: string): string => {
  const awal = mdx.indexOf(`<Blok nama="${nama}"`);
  const akhir = mdx.indexOf("</Blok>", awal);
  if (awal < 0 || akhir < 0) throw new Error(`halaman: blok ${nama} tidak ada`);
  return mdx.slice(awal, akhir);
};
const TOKEN = /\[\[([A-Za-z0-9.\-]+)(?:\\?\|[^\]]+)?\]\]/g;
const idDalam = (teks: string): string[] => [...teks.matchAll(TOKEN)].map((m) => m[1]!);
const tanpaTautan = (s: string): string => s.replace(/\[\[[A-Za-z0-9.\-]+\\?\|([^\]]+)\]\]/g, "$1");
const tabelDi = (blok: string, awalan: string): string[][] => {
  const baris = blok.split("\n");
  const a = baris.findIndex((b) => b.startsWith(awalan));
  if (a < 0) throw new Error(`tabel dengan awalan ${awalan} tidak ada`);
  let z = a;
  while (z < baris.length && baris[z]!.startsWith("|")) z++;
  return baris.slice(a, z).filter((b) => !/^\|\s*-/.test(b)).slice(1).map(sel);
};
const blokMulai = blokMdx("Mulai");
const blokCoba = blokMdx("Coba");
const blokPaham = blokMdx("Paham");
const blokPutuskan = blokMdx("Putuskan");
const blokKunci = blokMdx("Kunci");
const tab = (n: number): string => {
  const awal = mdx.indexOf(`<Fragment slot="t${n}">`);
  const akhir = mdx.indexOf("</Fragment>", awal);
  if (awal < 0 || akhir < 0) throw new Error(`tab t${n} tidak ada`);
  return mdx.slice(awal, akhir);
};

// ---- rekaman ---------------------------------------------------------------------------------------------------------------------
const bagianRekaman = (baris: string[], kode: string): string[] => {
  const a = baris.findIndex((b) => b.startsWith(`# --- ${kode}. `));
  if (a < 0) throw new Error(`rekaman: bagian ${kode} tidak ada`);
  const z = baris.findIndex((b, i) => i > a && b.startsWith("# --- "));
  return baris.slice(a, z < 0 ? undefined : z);
};
const sqlstate = (baris: string[], constraint: string): string => {
  const i = baris.findIndex((b) => b.includes(`constraint ${constraint}`) && b.includes("SQLSTATE"));
  if (i < 0) throw new Error(`rekaman: ${constraint} tidak ditolak`);
  return baris[i]!.match(/SQLSTATE (\w{5})/)![1]!;
};
const sqlstateSetelah = (baris: string[], pernyataan: string): string => {
  const i = baris.findIndex((b) => b.includes(pernyataan));
  if (i < 0) throw new Error(`rekaman: ${pernyataan} tidak ada`);
  return baris.slice(i, i + 4).join("\n").match(/SQLSTATE (\w{5})/)![1]!;
};
const skemaD = bagianRekaman(skema, "D");
const skemaE = bagianRekaman(skema, "E");
const skemaC = bagianRekaman(skema, "C");
const barisDari = (baris: string[], re: RegExp): number => {
  const i = baris.findIndex((b) => re.test(b));
  if (i < 0) throw new Error(`baris ${re} tidak ada`);
  return i + 1; // nomor baris, mulai 1
};

// =================================================================================================================================
describe("registry, kepala, dan struktur blok", () => {
  test("terdaftar sebagai Konsep bagian 3b, berprasyarat 3.4, ada, jalur inti, dan judul sama dengan peta naskah", () => {
    const h = per("t3-skema");
    expect([h.tahap, h.jenis, h.bagian, h.prasyarat, h.ada, h.inti, h.nomor, h.lab]).toEqual([3, "konsep", "3b", ["t3-dua-tempat"], true, true, "3.5", ["api-t2", "api-t3"]]);
    const peta = naskahBaris.find((b) => b.startsWith("| 3.5 |"))!;
    expect(sel(peta).slice(0, 7)).toEqual(["3.5", "3b", h.judul, "Konsep", "★", "api-t2, api-t3", "ERD bertumbuh"]);
    expect(mdx).toContain(`title: "3.5 ${h.judul}"`);
    expect(mdx).toContain("Prasyarat: [[t3-dua-tempat]]");
    expect(per("t3-dua-tempat").nomor).toBe("3.4");
  });
  test("deskripsi menyebut jumlah tabel dari ERD", () => {
    expect(mdx).toContain(`description: ${erd2.tabel.length} tabel Tahap 2 menjadi ${erd3.tabel.length} tabel Tahap 3. Tabel uang tidak berubah, pemberitahuan menumpang pada jurnal lewat tabel baru, lalu ukuran database diperkirakan sampai Tahap 4.`);
  });
  test("lima blok: Mulai dan Coba terbuka, sisanya tertutup", () => {
    expect(daftarBlok(mdx).map((b) => [b.nama, b.buka])).toEqual([["Mulai", true], ["Coba", true], ["Paham", false], ["Putuskan", false], ["Kunci", false]]);
  });
  test("menit baca sama dengan registry (baca + coba) dan masuk akal terhadap jumlah kata", () => {
    const m = mdx.match(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-dua-tempat\]\] · Jalur inti<\/p>/);
    expect(m).not.toBeNull();
    expect(per("t3-skema").menit).toBe(Number(m![1]) + Number(m![2]));
    expect(Number(m![2])).toBe(3);
    const isi = mdx.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(m![1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("ID riset tidak tampil ke pembaca (halaman, diagram, tebakan)", () => {
    for (const teks of [mdx, JSON.stringify(rantaiMentah), JSON.stringify(dataTebakMentah)]) expect(teks).not.toMatch(/\bR\d-\d{2,3}\b/);
    // halaman istilah: ID riset hanya di field `riset`, tidak di teks yang tampil
    const tampil = JSON.stringify({ ...istilah, sumber: istilah.sumber!.map(({ judul, catatan }) => ({ judul, catatan })) });
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
  });
  test("semua tautan [[ID]] ada di registry, dan tanda | di sel tabel ditulis \\|", () => {
    const registry = new Set(HALAMAN.map((h) => h.id));
    for (const id of idDalam(mdx)) if (id !== "berikutnya") expect(registry.has(id), `[[${id}]]`).toBe(true);
    for (const b of mdx.split("\n").filter((x) => x.startsWith("|")))
      for (const m of b.matchAll(/\[\[([^\]]+)\]\]/g)) expect(m[1], b.slice(0, 60)).not.toMatch(/(?<!\\)\|/);
  });
});

// =================================================================================================================================
describe("Inti, diagram Rantai, dan paragraf pembuka", () => {
  test("kalimat inti: jumlah tabel dan kolom baru dari ERD, dan tiga tabel uang memang tidak berubah", () => {
    expect(UANG.every((n) => tetap.includes(n))).toBe(true);
    expect(blokMulai).toContain(`Tahap 3 menambah ${kata(baru.length)} tabel dan ${kata(kolomBaru.length)} kolom, sedangkan ${daftarDan(UANG)} tetap sama.`);
    expect([baru.length, kolomBaru.length]).toEqual([6, 3]);
  });
  test("paragraf pertama: jumlah tabel tiap tahap, nama tabel baru urut ERD, dan kolom baru per tabel", () => {
    expect(blokMulai).toContain(`Skema akhir Tahap 2 di lab api-t2 punya ${erd2.tabel.length} tabel, dan skema akhir Tahap 3 di lab api-t3 punya ${erd3.tabel.length} tabel.`);
    expect(blokMulai).toContain(`Enam tabel baru adalah ${daftarDan(baru)}.`);
    const per = new Map<string, string[]>();
    for (const k of kolomBaru) per.set(k.tabel, [...(per.get(k.tabel) ?? []), k.kolom]);
    const kalimat = [...per].map(([t, ks]) => `${kode(t)} (${ks.map(kode).join(", ")})`).join(" dan ");
    expect(blokMulai).toContain(`Tiga kolom baru ada di ${kalimat}.`);
    expect(erd3.selisih.terhadap).toBe(erd2.tahap);
    expect(blokMulai).toContain("ERD di halaman ini dibaca dari database lab, bukan digambar tangan.");
  });
  test("paragraf kedua: outbox.jurnal_id, posting tabel terbesar, rasio, dan penjelasan label", () => {
    const rasio = koma(t3.posting / t2.posting, 1);
    expect(blokMulai).toContain("Pemberitahuan menumpang pada uang lewat `outbox.jurnal_id`, jadi tabel uang tidak mendapat kolom.");
    expect(tabel3("outbox").fk.some((f) => f.kolom[0] === "jurnal_id" && f.ke_tabel === "jurnal")).toBe(true);
    expect(blokMulai).toContain(`Tabel terbesar tetap \`posting\`: ${sig(t3.posting)} baris per tahun, ${rasio} kali Tahap 2.`);
    expect(blokMulai).toContain("Angka ukuran adalah Asumsi dengan rumus di blok Paham, dan arti semua label ada di [Label sumber](/cara-pakai/#label-sumber).");
    // "terbesar": baris dan byte per tahun posting lebih besar dari jurnal dan outbox (satu baris per transaksi, 300 byte)
    expect(t3.posting).toBeGreaterThan(t3.trx * HARI);
    expect(t3.posting * BYTE_POSTING).toBeGreaterThan(t3.trx * HARI * BYTE_BARIS);
  });
  test("tiga pertanyaan 'Sudah tahu?' menyebut angka yang sama dengan sisa halaman", () => {
    expect(blokMulai).toContain("1. Tabel Tahap 2 mana yang mendapat kolom baru di Tahap 3?");
    expect(blokMulai).toContain("2. Kenapa `outbox` menunjuk ke `jurnal`, dan bukan `jurnal` yang mendapat kolom pemberitahuan?");
    const tiga = `3. Dari rumus apa ${sig(t3.posting)} posting per tahun, dan kenapa ${ukuran(t3.aktif * TRX_LEDGER * 365 * BYTE_BARIS)} dan ${ukuran(t3.byte)} sama-sama disebut ukuran satu tahun?`;
    expect(blokMulai, tiga).toContain(tiga);
    expect(blokMulai).toContain("Yakin dengan ketiganya? Lompat ke [[berikutnya]].");
  });
  test("diagram Rantai: setiap simpul, sub, label, dan catatan sama dengan nilai turunan", () => {
    const harapan = {
      id: "t3-skema-inti",
      judul: "Skema Tahap 2 ke Tahap 3: tabel dan ukuran",
      sumber: { jenis: "asumsi", teks: "Baris 1 rekaman lab, baris 2 Asumsi" },
      baris: [
        {
          label: "Tabel",
          sub: "dari ERD lab api-t2 dan api-t3",
          simpul: [
            { teks: "tabel uang sama", sub: "buku, jurnal, posting: kolom dan aturannya sama dengan Tahap 2", nada: "old", kode: false },
            { teks: `+ ${baru.length} tabel`, sub: "outbox menunjuk ke jurnal; tiga kolom baru ada di akun dan sesi", nada: "system", kode: false },
            { teks: `${erd3.tabel.length} tabel`, sub: `${erd2.tabel.length} dari Tahap 2, ${baru.length} baru, ${erd3.selisih.tabel_dihapus.length} dihapus`, nada: "good", kode: false },
          ],
        },
        {
          label: "Posting per tahun",
          sub: "Tahap 2, 3, dan 4 (Asumsi)",
          simpul: [
            { teks: "±170 MB", sub: `Tahap 2: ${sig(t2.posting)} posting`, nada: "old", kode: false },
            { teks: ukuran(t3.byte), sub: `Tahap 3: ${sig(t3.posting)} posting`, nada: "system", kode: false },
            { teks: ukuran(t4.byte), sub: `Tahap 4: ${sig(t4.posting)} posting (rencana)`, nada: "warn", kode: false },
          ],
        },
      ],
      catatan: "Abu-abu: Tahap 2. Biru: Tahap 3. Kuning: Tahap 4, rencana naskah tanpa lab. Rumus ukuran ada di blok Paham.",
    };
    expect(rantai).toEqual(harapan);
    expect(erd3.selisih.kolom_baru).toHaveLength(3);
    // simpul 'tabel uang sama' terikat ke tiga tabel yang memang sama persis; ukuran Tahap 2 sama dengan halaman 2.9
    expect(UANG.every((n) => tetap.includes(n))).toBe(true);
    expect(mdx29).toContain(`| 2 | 1.000 | 30% | ${erd2.tabel.length} | \`posting\` ${sig(t2.posting)} | ±170 MB |`);
  });
});

// =================================================================================================================================
describe("blok Coba: tebakan, ERD, dan noscript", () => {
  const benar = tebak.pilihan.findIndex((p) => p.benar);
  test("tebakan: isi sama dengan nilai turunan, satu jawaban benar, posisinya pertama", () => {
    const harapan = {
      id: "t3-skema-tebak",
      judul: "Tabel uang di Tahap 3",
      sumber: { jenis: "rekaman", teks: "labs/api-t3/output/skema.txt bagian A, D, dan E; ERD dari situs/data/erd/tahap-2.json dan tahap-3.json" },
      adegan: [
        `Raka membuka ERD Tahap 2 dan ERD Tahap 3 berdampingan. Tahap 2 punya ${erd2.tabel.length} tabel dan Tahap 3 punya ${erd3.tabel.length}.`,
        "Salah satu tabel baru, outbox, harus ditulis di transaction yang sama dengan jurnal. Raka bertanya apakah tabel uang ikut berubah.",
      ],
      pertanyaan: "Apa yang berubah di tabel buku, jurnal, dan posting?",
      pilihan: [
        {
          teks: "Tidak ada. outbox menunjuk ke jurnal lewat jurnal_id, dan tabel uang tidak tahu outbox ada.",
          benar: true,
          alasan: "Tabel buku, jurnal, dan posting sama persis di kedua ERD. Pemberitahuan menumpang pada uang lewat outbox.jurnal_id, dan unique index outbox_satu_per_jurnal menjaga satu baris per jurnal dan penerima.",
        },
        {
          teks: "jurnal mendapat kolom notifikasi_terkirim, supaya satu jurnal bisa dicocokkan dengan satu pemberitahuan.",
          benar: false,
          alasan: `Kolom baru Tahap 3 hanya tiga, dan semuanya ada di akun dan sesi. Pencocokan jurnal dan pemberitahuan ada di outbox: baris kedua untuk jurnal dan penerima yang sama ditolak database dengan SQLSTATE ${sqlstate(skemaE, "outbox_satu_per_jurnal")}.`,
        },
        {
          teks: "posting mendapat kolom kota_id, karena promo dan katalog dibuat per kota.",
          benar: false,
          alasan: `Kota hanya ditambahkan ke akun lewat kota_id, dan posting tidak berubah. Role aplikasi bahkan tidak boleh mengubah posting: UPDATE ditolak dengan SQLSTATE ${sqlstateSetelah(skemaD, "UPDATE posting SET jumlah = 1")}.`,
        },
      ],
      penutup: "Pemberitahuan tidak mengubah bentuk uang. Ia mengikuti uang lewat satu tabel baru, dan tabel yang mencatat rupiah tetap sama seperti di Tahap 2.",
      label: { sumber: "Rekaman lab · skema.txt", tebakDulu: "Tebak dulu:", benar: "Tepat", belum: "Belum tepat", ulang: "Coba pilihan lain", jawaban: "Jawaban yang tepat" },
    };
    expect(tebak).toEqual(harapan);
    expect(benar).toBe(0);
    expect(tebak.pilihan.filter((p) => p.benar)).toHaveLength(1);
    // kolom yang dituduhkan tidak ada, dan kolom yang disebut tidak berubah ada di akun
    expect(tabel3("jurnal").kolom.map((k) => k.nama)).not.toContain("notifikasi_terkirim");
    expect(tabel3("posting").kolom.map((k) => k.nama)).not.toContain("kota_id");
    expect(tabel3("akun").kolom.map((k) => k.nama)).toContain("kota_id");
    for (const rujuk of ["labs/api-t3/output/skema.txt", "situs/data/erd/tahap-2.json", "situs/data/erd/tahap-3.json"]) expect(terlacak.has(rujuk), rujuk).toBe(true);
    // 'Ubah satu hal' di bawah memakai alasan bagian D: role aplikasi ditolak mengubah posting
    expect(skemaD.some((b) => b.includes("UPDATE posting SET jumlah = 1"))).toBe(true);
  });
  test("halaman memasang Tebak satu kali, ErdHalaman dua tahap, dan noscript berisi jawaban yang benar", () => {
    expect(mdx.match(/<Tebak /g)).toHaveLength(1);
    expect(mdx).toContain("<Tebak client:visible data={dataTebak} />");
    expect(mdx.match(/<ErdHalaman /g)).toHaveLength(1);
    expect(mdx).toContain(`<ErdHalaman id="erd-t3" tahap={[${erd2.tahap}, ${erd3.tahap}]} />`);
    expect(blokCoba).toContain(`<noscript>\n<p>Tanpa JavaScript tebakan tidak berjalan. Jawaban yang tepat: ${tebak.pilihan[benar]!.teks}</p>\n</noscript>`);
  });
  test("kalimat pengantar dan 'Ubah satu hal' cocok dengan sumber ERD dan label widget", () => {
    const sumber = (e: Erd): string[] => e.sumber.file.filter((f) => /api-t[23]\/migrasi/.test(f)).map((f) => f.match(/migrasi\/(\d{6})_/)![1]!);
    const m2 = sumber(erd2);
    const m3api2 = sumber(erd3).filter((_, i) => i < sumber(erd3).length - 5);
    expect(m2[m2.length - 1]).toBe("000013");
    expect(m3api2[m3api2.length - 1]).toBe("000014");
    expect(sumber(erd3).slice(-5)).toEqual(["000015", "000016", "000017", "000018", "000019"]);
    expect(blokCoba).toContain("Kedua ERD dibangun dari skema lab: Tahap 2 dari migration api-t2 sampai 000013, Tahap 3 dari migration api-t2 sampai 000014 dan api-t3 000015 sampai 000019.");
    expect(blokCoba).toContain(`Tiap tabel diberi label ${LABEL_STATUS.baru}, ${LABEL_STATUS.berubah}, atau ${LABEL_STATUS.tetap} menurut Tahap 2, dan kolom yang bertambah diberi label ${LABEL_STATUS.baru}.`);
    expect(blokCoba).toContain(`tekan **Bandingkan dengan Tahap ${erd2.tahap}**`);
    const out = tabel3("outbox");
    expect(new Set(out.fk.map((f) => f.ke_tabel))).toEqual(new Set(["jurnal", "akun"]));
    expect(out.fk).toHaveLength(2);
    expect(out.index).toHaveLength(2);
    expect(blokCoba).toContain("Lalu pilih `outbox`: dua foreign key, ke `jurnal` dan ke `akun`, dan dua index.");
    expect(blokCoba).toContain("Pilih `jurnal` di Tahap 3: labelnya tetap, dan tidak ada kolom yang berlabel baru.");
    expect(sama("jurnal")).toBe(true);
    expect(blokCoba).toContain('aman="Kalau berhenti di sini, kamu sudah tahu: tabel uang Tahap 2 tidak berubah, dan pemberitahuan menumpang pada jurnal lewat tabel baru bernama outbox."');
  });
});

// =================================================================================================================================
describe("blok Paham: tabel perubahan, yang tidak berubah, dan outbox", () => {
  test("tabel 'Apa yang berubah dan kenapa': delapan baris, isi sama dengan naskah 3b (di luar ID riset dan tautan)", () => {
    const tabel = tabelDi(blokPaham, "| Tahap 2 | Tahap 3 |");
    expect(tabelNaskah).toHaveLength(8);
    expect(tabel).toHaveLength(tabelNaskah.length);
    tabelNaskah.forEach((n, i) => {
      for (const k of [0, 1, 2, 3]) expect(tanpaTautan(tabel[i]![k]!), `baris ${i + 1} kolom ${k}`).toBe(n[k]);
    });
  });
  test("tautan di kolom Masalah: label M-nomor menuju halaman M itu, Katalog dan promo menuju halaman di peta ERD", () => {
    const tabel = tabelDi(blokPaham, "| Tahap 2 | Tahap 3 |");
    const tokens = tabel.flatMap((r) => [...r[3]!.matchAll(/\[\[([A-Za-z0-9.\-]+)\\\|([^\]]+)\]\]/g)].map((m) => [m[1]!, m[2]!]));
    for (const [id, label] of tokens) {
      const m = label!.match(/^M(\d+)$/);
      if (m) expect(per(id!).judul.startsWith(`M${m[1]}:`), `${label} → ${id}`).toBe(true);
    }
    const peta3 = petaErd.tahap["3"]!;
    expect(tokens).toContainEqual([peta3.produk![0], "Katalog"]);
    expect(tokens).toContainEqual([peta3.promo![0], "promo"]);
    expect(tokens).toContainEqual([peta3.operasi_sinkron![0], "M24"]);
    expect(tokens).toContainEqual([peta3.sesi![0], "M25"]);
    // halaman 2.8 untuk penghapusan data pribadi: baris tabel 2.8 menulis belum dijadwalkan
    expect(tabel[6]![2]).toContain("[[t2-adr-ledger\\|halaman 2.8]]");
    expect(adrLedger).toMatch(/\| Data pribadi harus bisa dihapus \| Jurnal tidak bisa dihapus.*\| Belum dijadwalkan di naskah \|/);
    expect(skemaD.join("\n")).toMatch(/DELETE FROM jurnal WHERE id = 1;\nERROR:  permission denied for table jurnal\n +-- SQLSTATE 42501/);
  });
  test("kolom nama tabel di tabel perubahan ada di ERD Tahap 3, dan tabel baru yang disebut sama dengan selisih ERD", () => {
    const tabel = tabelDi(blokPaham, "| Tahap 2 | Tahap 3 |");
    const nama = new Set(erd3.tabel.map((t) => t.nama));
    const sebut = new Set<string>();
    for (const r of tabel) for (const m of r[1]!.matchAll(/`([a-z_]+)`/g)) if (nama.has(m[1]!) && !tabel2(m[1]!)) sebut.add(m[1]!);
    expect(sebut).toEqual(new Set(baru));
    // kolom outbox dan perangkat yang disebut di sel, urut dan lengkap seperti ERD (status memakai empat nilainya)
    const kolomOutbox = tabel3("outbox").kolom.map((k) => k.nama).filter((n) => n !== "id" && n !== "dibuat");
    const sel1 = tabel[1]![1]!;
    for (const n of kolomOutbox) expect(sel1, `kolom outbox ${n}`).toContain(n);
    expect(tabel3("outbox").cek.find((c) => c.nama === "outbox_status_check")!.ekspresi).toMatch(/'menunggu'.*'terkirim'.*'dilewati'.*'mati'/);
    expect(tabel3("akun").cek.find((c) => c.nama === "akun_jenis_check")!.ekspresi).toContain("'hr'");
  });
  test("klaim baris Idempotency-Key: kode server api-t2 tidak memakainya (lingkup: cmd dan internal Go), api-t3 memasangnya opsional", () => {
    const go2 = [...terlacak].filter((f) => f.startsWith("labs/api-t2/") && /\.(go|py|yaml|sh|sql)$/.test(f) && !f.includes("/output/"));
    expect(go2.length).toBeGreaterThan(5);
    const pemakai = go2.filter((f) => /kunci_idempotensi|Idempotency-Key/i.test(baca(f)));
    expect(pemakai.sort(), "satu-satunya yang menyebut: skrip rekam lab dan migration, bukan kode server").toEqual(
      ["labs/api-t2/migrasi/000011_ledger_pendukung.up.sql", "labs/api-t2/run.py"].sort(),
    );
    expect(baca("labs/api-t2/migrasi/000011_ledger_pendukung.up.sql")).toContain("kunci_idempotensi");
    const handler = baca("labs/api-t3/internal/handler/handler_idempoten.go");
    expect(handler).toContain("Idempotency-Key opsional di POST /transfers, /kiriman, dan /pesanan");
    expect(baca("labs/api-t3/internal/service/idempoten.go")).toContain("dikenali 24 jam");
    expect(blokPaham).toContain("api-t2 belum memakainya di bayar dan transfer; api-t3 memasangnya sebagai header Idempotency-Key opsional di bayar, transfer, dan pesanan");
    // klaim oasdiff pada baris akun
    expect(kontrakTxt).toContain("response-property-enum-value-added");
    expect(kontrakTxt).toContain("added the new `hr` enum value to the `jenis` response property");
  });
  test("'Yang tidak berubah': enam tabel Tahap 2 sama persis, hanya akun dan sesi berubah, tidak ada yang dihapus", () => {
    expect(tetap).toHaveLength(6);
    expect(berubah).toEqual(["akun", "sesi"]);
    expect(erd3.selisih.tabel_dihapus).toEqual([]);
    expect(erd3.selisih.kolom_dihapus).toEqual([]);
    expect(erd3.selisih.kolom_berubah).toEqual([]);
    expect(blokPaham).toContain(`**Yang tidak berubah.** ${kata(tetap.length)[0]!.toUpperCase()}${kata(tetap.length).slice(1)} tabel Tahap 2 sama persis di kedua ERD: ${daftarDan(tetap)}.`);
    expect(blokPaham).toContain("Kolom, foreign key, UNIQUE, CHECK, dan index-nya sama, dan `tools/erd.py` menghitung selisih itu dari kedua skema.");
    expect(blokPaham).toContain(`Hanya ${kode(berubah[0]!)} dan ${kode(berubah[1]!)} yang berubah, dan tidak ada tabel atau kolom yang dihapus.`);
    expect(baca("tools/erd.py")).toContain("tabel dihapus beserta");
  });
  test("'Semua bermuara di akun': tabel yang menunjuk akun dan jumlah foreign key dari kedua ERD", () => {
    const a2 = menujuAkun(erd2);
    const a3 = menujuAkun(erd3);
    expect(blokPaham).toContain(`Di Tahap 2 ${kata(a2.length)} tabel menunjuk ${kode("akun")}: ${daftarDan(a2)}.`);
    const tambah = a3.filter((n) => !a2.includes(n));
    expect(blokPaham).toContain(`Di Tahap 3 ${kata(a3.length)} tabel menunjuk ${kode("akun")}, karena ${daftarDan(tambah)} juga menyimpan akunnya.`);
    expect(blokPaham).toContain(`Jumlah foreign key naik dari ${jumlahFk(erd2)} ke ${jumlahFk(erd3)}, dihitung dari kedua ERD.`);
    expect([a2.length, a3.length, jumlahFk(erd2), jumlahFk(erd3)]).toEqual([4, 8, 11, 20]);
    expect(blokPutuskan).toContain(`${kode("akun")} dirujuk ${kata(a3.length)} tabel, bukan ${kata(a2.length)}.`);
  });
  test("bagian outbox: tiga aturan, SQLSTATE dari rekaman bagian E, dan rentang Snippet menempel pada jangkar", () => {
    const e = skemaE.join("\n");
    const s1 = sqlstate(skemaE, "outbox_jurnal_atau_promo");
    const s2 = sqlstate(skemaE, "outbox_satu_per_jurnal");
    const s3 = sqlstate(skemaE, "outbox_kelas_check");
    expect([s1, s2, s3]).toEqual(["23514", "23505", "23514"]);
    expect(e).toContain("INSERT INTO outbox (akun_id, kelas, jenis, payload) VALUES (419, 0, 'bayar', '{}')");
    expect(e).toContain("VALUES (419, 3, 'promo', '{}')");
    const cek = (n: string) => tabel3("outbox").cek.find((c) => c.nama === n)!.ekspresi;
    expect(cek("outbox_jurnal_atau_promo")).toBe("(jurnal_id IS NULL) = (jenis = 'promo'::text)");
    expect(cek("outbox_kelas_check")).toBe("kelas >= 0 AND kelas <= 2");
    expect(blokPaham).toContain("- `outbox_jurnal_atau_promo`: `jurnal_id` kosong persis ketika `jenis` adalah `promo`. INSERT bayar tanpa jurnal ditolak dengan SQLSTATE 23514.");
    expect(blokPaham).toContain("- `outbox_satu_per_jurnal`: unique index sebagian pada `(jurnal_id, akun_id)`. Baris kedua untuk jurnal dan penerima yang sama ditolak dengan SQLSTATE 23505.");
    expect(blokPaham).toContain("- `outbox_kelas_check`: kelas hanya 0 sampai 2. Kelas 3 ditolak dengan SQLSTATE 23514.");
    expect(blokPaham).toContain("Tiga aturan database menjaga hubungannya, dan lab merekam penolakannya (Rekaman lab, `skema.txt` bagian E):");
    const unik = tabel3("outbox").index.find((i) => i.nama === "outbox_satu_per_jurnal")!;
    expect([unik.unik, unik.definisi]).toEqual([true, "btree (jurnal_id, akun_id) WHERE (jurnal_id IS NOT NULL)"]);
    // rentang Snippet
    const mulaiE = barisDari(skema, /^# --- E\. /);
    const akhirE = barisDari(skema, /SQLSTATE 23505 · constraint outbox_satu_per_jurnal/);
    expect(blokPaham).toContain(`<Snippet file="labs/api-t3/output/skema.txt" lines="${mulaiE}:${akhirE}" title="Rekaman lab: labs/api-t3/output/skema.txt (bagian E)" />`);
    const cekBaris = barisDari(m17, /CONSTRAINT outbox_jurnal_atau_promo/);
    const antre = barisDari(m17, /CREATE INDEX outbox_antre/);
    const satu = barisDari(m17, /CREATE UNIQUE INDEX outbox_satu_per_jurnal/);
    expect(blokPaham).toContain(`<Snippet file="labs/api-t3/migrasi/000017_perangkat_outbox.up.sql" lines="${cekBaris}:${antre}" lang="sql" title="labs/api-t3/migrasi/000017_perangkat_outbox.up.sql" />`);
    expect(tab(0)).toContain(`<Snippet file="labs/api-t3/migrasi/000017_perangkat_outbox.up.sql" lines="${satu - 1}:${satu}" lang="sql"`);
    expect(m17[satu - 2]).toMatch(/^-- Satu pemberitahuan per jurnal per penerima/);
    // satu baris per bayar dan transfer, top-up kelas 1 (rekaman outbox.txt A dan E; komentar migration)
    expect(bagianRekaman(outboxTxt, "A").join("\n")).toMatch(/\(1 row\)/);
    expect(bagianRekaman(outboxTxt, "E").join("\n")).toMatch(/0 {5}\| transfer \| menunggu \| 1\n 1 {5}\| topup {4}\| menunggu \| 3/);
    expect(m17.join("\n")).toContain("0 bayar dan transfer, 1 top-up massal, 2 promo");
    expect(blokPutuskan).toContain("Setiap bayar atau transfer menulis satu baris `outbox` lagi di transaction yang sama (Rekaman lab, `outbox.txt` bagian A dan E).");
    expect(blokPaham).toContain("Setiap baris `outbox` menunjuk ke jurnalnya lewat `jurnal_id`, dan baris ditulis di transaction yang sama dengan jurnal ([[t3-dua-tempat]]).");
    expect(m17.join("\n")).toContain("Baris outbox ditulis di transaction yang sama dengan jurnal");
  });
  test("index sebagian: definisi dari ERD, dua kalimat dokumentasi bersumber di RISET dan berlabel Tidak dijalankan", () => {
    const antre = tabel3("outbox").index.find((i) => i.nama === "outbox_antre")!;
    expect(antre.definisi).toBe("btree (kelas, id) WHERE (status = 'menunggu'::text)");
    expect(blokPaham).toContain("Predikat `WHERE jurnal_id IS NOT NULL` membuat index tidak memuat baris promo, yang tidak punya jurnal ([PostgreSQL 17, 11.8](https://www.postgresql.org/docs/17/indexes-partial.html)).");
    expect(blokPaham).toContain("Keunikannya sendiri tidak bergantung pada predikat itu, karena unique index memperlakukan dua nilai NULL sebagai tidak sama ([PostgreSQL 17, 5.5.3](https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)).");
    expect(blokPaham).toContain("Index sebagian `outbox_antre` hanya memuat baris `menunggu`, jadi baris yang selesai keluar dari index itu.");
    expect(blokPaham).toContain("Kedua kalimat tentang index ini dicek ke dokumentasi dan tidak dijalankan di lab (Tidak dijalankan).");
    const r120 = riset.split("\n").find((b) => b.startsWith("| R3-120 "))!;
    for (const s of ["§11.8 Partial Indexes", "indexes-partial.html", "§5.5.3 Unique Constraints", "ddl-constraints.html", "NULLS NOT DISTINCT", "dua NULL tidak dianggap sama", "Tidak dijalankan di lab", "PostgreSQL 17.11"]) expect(r120, s).toContain(s);
    // yang menghalangi predikat dipakai ON CONFLICT: kode outbox tidak memakainya, jadi predikat hanya mengecilkan index
    expect(baca("labs/api-t3/internal/repo/outbox.go")).not.toMatch(/ON CONFLICT \(jurnal_id/);
  });
  test("lima rilis: file migration, lock_timeout, satu aturan diganti, tanpa DROP tabel atau kolom, dan batas rekaman", () => {
    expect(migrasi.map((m) => m.nama.split("/").pop())).toEqual([
      "000015_kota_peran_hr.up.sql", "000016_sesi_web.up.sql", "000017_perangkat_outbox.up.sql", "000018_katalog_promo.up.sql", "000019_operasi_sinkron.up.sql",
    ]);
    for (const m of migrasi) expect(m.isi, m.nama).toContain("SET LOCAL lock_timeout = '3s';");
    const semuaSql = migrasi.map((m) => m.isi).join("\n");
    expect(semuaSql).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
    expect([...semuaSql.matchAll(/DROP CONSTRAINT (\w+)/g)].map((m) => m[1])).toEqual(["akun_jenis_check"]);
    expect(semuaSql).toContain("CHECK (jenis IN ('karyawan', 'warung', 'admin', 'sistem', 'hr'))");
    expect(blokPaham).toContain("**Lima rilis yang hanya menambah.** Kelima migration Tahap 3, 000015 sampai 000019, menambah tabel, kolom, dan aturan, kecuali satu aturan, `akun_jenis_check`, yang dihapus lalu dibuat lagi dengan nilai `hr`.");
    expect(blokPaham).toContain("Tidak ada tabel atau kolom yang dihapus, jadi tidak ada langkah contract seperti di [[t2-skema-tanpa-downtime]]. Setiap file membuka dengan `SET LOCAL lock_timeout = '3s'`.");
    // batas rekaman: kelima migration dijalankan satu transaction di schema kosong; tidak ada rekaman api-t3 di atas database berisi
    expect(bagianRekaman(skema, "A").join("\n")).toContain("satu transaction, schema kosong");
    const semuaOutput = [...terlacak].filter((f) => f.startsWith("labs/api-t3/output/")).map((f) => baca(f)).join("\n");
    expect(semuaOutput).not.toMatch(/backfill|lock-timeout|55P03/i);
    expect(blokPaham).toContain("Lab menjalankan kelimanya dalam satu transaction di schema kosong (Rekaman lab, `skema.txt` bagian A).");
    expect(blokPaham).toContain("Tidak dijalankan: kelima migration di atas database berisi data sementara server Tahap 2 masih melayani request. Rilis seperti itu direkam di Tahap 2 ([[t2-m13]]).");
    expect(terlacak.has("labs/b4-skema/output/ledger/lock-timeout.txt")).toBe(true);
  });
  test("'Rancangan lawan lab': mermaid naskah sama dengan ERD Tahap 3 (kolom, urutan, tipe, kunci), dan tiga selisih lama dicatat naskah", () => {
    const a = naskahBaris.findIndex((b) => b.startsWith("```mermaid"));
    const z = naskahBaris.findIndex((b, i) => i > a && b.startsWith("```"));
    const blok = naskahBaris.slice(a + 1, z).join("\n");
    const TIPE: Record<string, string> = { bigint: "bigint", text: "text", boolean: "boolean", int: "integer", timestamptz: "timestamp with time zone", uuid: "uuid", smallint: "smallint", jsonb: "jsonb" };
    const entitas = [...blok.matchAll(/^ {2}([A-Z_]+) \{([^}]*)\}/gm)];
    expect(entitas.map((m) => m[1])).toEqual(["KOTA", "AKUN", "SESI", "PERANGKAT", "OUTBOX", "PRODUK", "PROMO", "OPERASI_SINKRON"]);
    for (const m of entitas) {
      const t = tabel3(m[1]!.toLowerCase());
      const kol = m[2]!.trim().split("\n").map((b) => b.trim().split(/\s+/));
      expect(kol.map((k) => k[1]), `${m[1]} urutan kolom`).toEqual(t.kolom.map((k) => k.nama));
      expect(kol.map((k) => TIPE[k[0]!]), `${m[1]} tipe`).toEqual(t.kolom.map((k) => k.tipe));
      const pakai = (kunci: string) => kol.filter((k) => k.slice(2).includes(kunci)).map((k) => k[1]!).sort();
      expect(pakai("PK"), `${m[1]} PK`).toEqual([...t.pk].sort());
      expect(pakai("UK"), `${m[1]} UK`).toEqual(t.unik.filter((u) => u.kolom.length === 1).map((u) => u.kolom[0]!).sort());
      expect(pakai("FK"), `${m[1]} FK`).toEqual(t.fk.filter((f) => f.kolom.length === 1).map((f) => f.kolom[0]!).sort());
    }
    expect(blok.match(/^ {2}[A-Z_]+ [|o}{\-]+ [A-Z_]+ : \w+$/gm)).toHaveLength(20);
    // rekaman bagian B: tidak ada selisih tabel atau kolom; yang lab tambah adalah aturan
    const b = bagianRekaman(skema, "B").join("\n");
    expect(b).toContain("# Selisih dengan blok mermaid: tidak ada tabel atau kolom.");
    expect(b).toContain("aturan (CHECK, UNIQUE,");
    // tiga selisih lama tertulis di naskah dan benar menurut ERD
    expect(bagian3b).toContain("Pemeriksaan ERD3 menemukan tiga selisih, dan blok di bawah sudah mengikuti lab: urutan kolom `sesi`, `jurnal.membalik_jurnal_id` UNIQUE, dan `baris_pencairan.jurnal_id` yang boleh kosong.");
    expect(tabel3("sesi").kolom.map((k) => k.nama)).toEqual(["token_hash", "akun_id", "kedaluwarsa", "jenis", "csrf_hash"]);
    expect(tabel3("jurnal").unik.map((u) => u.kolom.join())).toContain("membalik_jurnal_id");
    expect(tabel3("baris_pencairan").kolom.find((k) => k.nama === "jurnal_id")!.wajib).toBe(false);
    expect(blokPaham).toContain("**Rancangan lawan lab.** Rancangan skema Tahap 3 di naskah dicocokkan dengan skema lab sebelum halaman ini ditulis. Semua tabel dan kolom sama (Rekaman lab, `skema.txt` bagian B). Yang ditambahkan lab dan tidak ditulis rancangan adalah aturan: CHECK, UNIQUE, dan index sebagian.");
    expect(blokPaham).toContain("Tiga hal tentang skema lab sempat tertulis lain di rancangan, dan rancangannya diperbaiki mengikuti lab. Pertama, urutan kolom `sesi`. Kedua, `jurnal.membalik_jurnal_id` yang UNIQUE, jadi satu jurnal dibalik paling banyak sekali. Ketiga, `baris_pencairan.jurnal_id` yang boleh kosong.");
  });
});

// =================================================================================================================================
describe("pertumbuhan skala database: rumus, tabel, dan tiga besaran", () => {
  test("rumus dan konstanta dibaca dari naskah, dan baris rumus di halaman sama", () => {
    expect([PER_POSTING, HARI, BYTE_POSTING, TRX_LEDGER, BYTE_BARIS]).toEqual([2, 365, 250, 3, 300]);
    expect(blokPaham).toContain("- transaksi per hari = user × aktif × 3\n- posting per tahun = transaksi per hari × 2 × 365\n- ukuran per tahun = posting per tahun × 250 byte, termasuk index");
    expect(mdx29).toContain("- transaksi per hari = user × aktif × 3\n- posting per tahun = transaksi per hari × 2 × 365\n- ukuran per tahun = posting per tahun × 250 byte, termasuk index");
  });
  test("tabel Tahap 2 sampai 4: user, aktif, tabel inti, baris terbesar, dan ukuran sama dengan registry, ERD, dan halaman 2.9", () => {
    const baris = tabelDi(blokPaham, "| Tahap | User |");
    const rumah = (n: number, d: ReturnType<typeof tahunData>, inti: string, ukur: string) =>
      [String(n), titik(d.user), `${d.persenAktif}%`, inti, `\`posting\` ${sig(d.posting)}`, ukur];
    expect(baris).toEqual([
      rumah(2, t2, String(erd2.tabel.length), "±170 MB"),
      rumah(3, t3, String(erd3.tabel.length), ukuran(t3.byte)),
      rumah(4, t4, "±22", ukuran(t4.byte)),
    ]);
    // ±170 MB adalah pembulatan halaman 2.9 atas 164.250.000 byte (selisih di bawah 5%); Tahap 3 dan 4 cocok dengan 2.9
    expect(Math.abs(170 * MB - t2.byte) / t2.byte).toBeLessThan(0.05);
    expect(mdx29).toContain("| 2 | 1.000 | 30% | 8 | `posting` ±660 ribu | ±170 MB |");
    expect(mdx29).toContain(`| 3 | ${titik(t3.user)} | ${t3.persenAktif}% | ±14 | \`posting\` ${sig(t3.posting)} | ${ukuran(t3.byte)} |`);
    expect(mdx29).toContain(`| 4 | ${titik(t4.user)} | ${t4.persenAktif}% | ±22 | \`posting\` ${sig(t4.posting)} | ${ukuran(t4.byte)} |`);
    expect(bagian3b).toContain(`| 4 | ${titik(t4.user)} | ±22, dibagi per modul | \`posting\` ${sig(t4.posting)} | ${ukuran(t4.byte)} |`);
    expect(erd3.tabel).toHaveLength(14);
    expect([asumsi(2).aktif, asumsi(3).aktif, asumsi(4).aktif]).toEqual([30, 25, 20]);
  });
  test("contoh hitungan, rasio, dan catatan sumber 3 transaksi", () => {
    expect(blokPaham).toContain(`Contoh Tahap 3: ${titik(t3.user)} × ${t3.persenAktif}% × ${TRX_LEDGER} = ${titik(t3.trx)} transaksi per hari.`);
    expect(blokPaham).toContain(`${titik(t3.trx)} × ${PER_POSTING} × ${HARI} = ${titik(t3.posting)} posting, dan ${titik(t3.posting)} × ${BYTE_POSTING} byte = ${titik(t3.byte)} byte, ditulis ${ukuran(t3.byte)}.`);
    expect(blokPaham).toContain(`Tahap 2 dengan cara yang sama menghasilkan ${titik(t2.posting)} posting dan ${titik(t2.byte)} byte, yang di [[t2-skema]] ditulis ±170 MB.`);
    expect(blokPaham).toContain(`Tahap 4 menghasilkan ${titik(t4.posting)} posting dan ${titik(t4.byte)} byte.`);
    expect(blokPaham).toContain(`Posting naik ${koma(t3.posting / t2.posting, 1)} kali dari Tahap 2 ke Tahap 3 (${titik(t3.posting)} ÷ ${titik(t2.posting)}) dan ${koma(t4.posting / t3.posting, 1)} kali ke Tahap 4 (${titik(t4.posting)} ÷ ${titik(t3.posting)}).`);
    expect(blokPaham).toContain("Tabel inti Tahap 2 dan 3 dihitung dari ERD. Tahap 4 adalah rencana naskah tanpa lab.");
    expect(blokPaham).toContain("Persentase aktif memakai registry, sedangkan 3 transaksi per user aktif memakai naskah, bukan registry.");
    expect(naskah).toContain("Transaksi uang 3 per user aktif per hari mengikuti naskah Tahap 2 dan registry Tahap 3");
  });
  test("tiga angka satu tahun data Tahap 3: baris sama dengan halaman 2.30, 137 byte dari rekaman b2-query", () => {
    const registryByte = t3.aktif * asumsi(3).trx * 365 * BYTE_BARIS;
    expect(asumsi(3).trx).toBe(TRX_LEDGER);
    const posting137 = Math.round((50 + 5240 / 1024 + 15 + 29) * 1048576 / 760448);
    expect(posting137).toBe(137);
    const baris = tabelDi(blokPaham, "| Sumber | Yang dihitung | Hasil | Label |").slice(0, 3);
    expect(baris).toEqual([
      ["Rumus data per tahun [[D1]]", `${titik(t3.aktif)} user aktif × ${asumsi(3).trx} transaksi × 365 × ${BYTE_BARIS} byte, satu baris per transaksi`, ukuran(registryByte), "Asumsi"],
      ["Rumus ledger (halaman ini)", `${titik(t3.posting)} posting × ${BYTE_POSTING} byte`, ukuran(t3.byte), "Asumsi"],
      ["Ekstrapolasi rekaman lab", `${titik(t3.posting)} posting × ${posting137} byte per posting (batas bawah)`, ukuran(t3.posting * posting137), "Asumsi dari Rekaman lab"],
    ]);
    // baris yang sama ada di halaman 2.30 (hasil dan label)
    expect(mdx230).toContain(`| Rumus data per tahun [[D1]] | ${titik(t3.aktif)} user aktif × 3 transaksi × 365 × 300 byte, satu baris per transaksi | ±820 MB | Asumsi |`);
    expect(mdx230).toContain(`| Rumus ledger [[t2-skema]] | ${titik(t3.posting)} posting × 250 byte | ±1,4 GB | Asumsi |`);
    expect(mdx230).toContain(`| Ekstrapolasi rekaman lab | ${titik(t3.posting)} posting × 137 byte per posting (batas bawah) | ±750 MB | Asumsi dari Rekaman lab |`);
    // naskah dan RISET menulis angka yang sama
    expect(bagian3b).toContain("Rumus registry 1.38 (2.500 × 3 × 365 × 300 B, satu baris per transaksi) memberi ±820 MB, dan rumus ledger memberi ±1,4 GB.");
    expect(riset).toMatch(/\| R3-38 .*1,37 GB per tahun/);
    // 500 ÷ 300
    expect(blokPaham).toContain(`Rumus data per tahun menghitung satu baris ${BYTE_BARIS} byte per transaksi, sedangkan rumus ledger menghitung dua posting ${BYTE_POSTING} byte, jadi ${PER_POSTING * BYTE_POSTING} byte per transaksi.`);
    expect(blokPaham).toContain(`Perbandingannya ${PER_POSTING * BYTE_POSTING} ÷ ${BYTE_BARIS}, dan ${titik(registryByte)} × ${PER_POSTING * BYTE_POSTING} ÷ ${BYTE_BARIS} = ${titik(t3.byte)} byte.`);
    expect((registryByte * PER_POSTING * BYTE_POSTING) / BYTE_BARIS).toBe(t3.byte);
    expect(blokPaham).toContain("Selisih ±820 MB ke ±1,4 GB bukan kesalahan hitung.");
  });
  test("137 byte per posting: ukuran dan jumlah posting dari rekaman b2-query, rumus pembulatan, dan satuan pg_size_pretty", () => {
    const e = bagianRekaman(indexB2, "E");
    const ukur = (nama: string): string => e.find((b) => new RegExp(`^ ${nama} +\\|`).test(b))!.split("|")[1]!.trim();
    expect([ukur("posting"), ukur("posting_buku"), ukur("posting_jurnal"), ukur("posting_riwayat")]).toEqual(["50 MB", "5240 kB", "15 MB", "29 MB"]);
    const jumlah = dataB2.find((b) => /^ total\s+\|/.test(b))!.split("|")[2]!.trim();
    expect(Number(jumlah)).toBe(760448);
    const MiB = 1048576;
    const totalByte = 50 * MiB + 5240 * 1024 + 15 * MiB + 29 * MiB;
    const perPosting = koma(Math.round((totalByte / 760448) * 10) / 10, 1);
    expect([totalByte, perPosting]).toEqual([103931904, "136,7"]);
    expect(blokPaham).toContain("Angka 137 byte datang dari lab b2-query (Rekaman lab, `index.txt` bagian E). Di sana 760.448 posting menempati tabel 50 MB dan tiga index 5.240 kB, 15 MB, dan 29 MB.");
    expect(blokPaham).toContain(`Dalam byte (1 MB = ${titik(MiB)}, 1 kB = ${titik(1024)}) totalnya ${titik(totalByte)}, dan ${titik(totalByte)} ÷ ${titik(760448)} = ${perPosting} byte per posting, ditulis ±137.`);
    expect(blokPaham).toContain("Primary key tidak ikut diukur, sehingga ±750 MB adalah batas bawah.");
    expect(e.find((b) => /^ posting_pkey/.test(b))).toBeUndefined();
    expect(e.join("\n")).toContain("pg_size_pretty");
    expect(mdx29).toContain("Satuan `pg_size_pretty` adalah 1 MB = 1.048.576 byte");
    expect(mdx29).toContain("760.448 posting: tabel `posting` 50 MB dan tiga index 5,1 + 15 + 29 MB | ±99 MB, ±137 byte per posting");
  });
  test("registry lawan naskah soal transaksi per user: ±65,7, ±98,6, 12,5 kali dan 8,3 kali", () => {
    const aktif2 = t2.aktif;
    const trxReg2 = asumsi(2).trx;
    const b2reg = aktif2 * trxReg2 * 365 * BYTE_BARIS;
    const b2ledger = aktif2 * TRX_LEDGER * 365 * BYTE_BARIS;
    const b3 = t3.aktif * asumsi(3).trx * 365 * BYTE_BARIS;
    expect([trxReg2, asumsi(3).trx, TRX_LEDGER]).toEqual([2, 3, 3]);
    expect([bulatSatu(MB, b2reg), bulatSatu(MB, b2ledger)]).toEqual(["65,7", "98,6"]);
    expect(mdx29).toContain("±65,7 MB");
    expect(blokPaham).toContain(`Registry menulis ${trxReg2} transaksi per user aktif per hari untuk Tahap 2 dan ${asumsi(3).trx} untuk Tahap 3, sedangkan rumus ledger memakai ${TRX_LEDGER} di keduanya.`);
    expect(blokPaham).toContain(`Karena itu [[t2-skema]] menulis ±${bulatSatu(MB, b2reg)} MB untuk satu tahun data Tahap 2 (${aktif2} × ${trxReg2} × 365 × ${BYTE_BARIS} byte), dan halaman itu tidak diubah.`);
    expect(blokPaham).toContain(`Dengan ${TRX_LEDGER} transaksi hasilnya ${aktif2} × ${TRX_LEDGER} × 365 × ${BYTE_BARIS} byte = ${titik(b2ledger)} byte, ±${bulatSatu(MB, b2ledger)} MB (Asumsi, hitungan di halaman ini).`);
    expect(blokPaham).toContain(`Kenaikan rumus registry dari Tahap 2 ke Tahap 3 adalah ${koma(b3 / b2reg, 1)} kali (${titik(b3)} ÷ ${titik(b2reg)}).`);
    expect(blokPaham).toContain(`Bila Tahap 2 juga memakai ${TRX_LEDGER} transaksi, kenaikannya ${koma(b3 / b2ledger, 1)} kali (${titik(b3)} ÷ ${titik(b2ledger)}), sama dengan kenaikan posting.`);
    expect(koma(b3 / b2ledger, 1)).toBe(koma(t3.posting / t2.posting, 1));
    expect(koma(b3 / b2reg, 1)).toBe("12,5");
    expect(mdx230).toContain("Rumus [[D1]] naik 12,5 kali dari Tahap 2, sedangkan rumus ledger naik 8,3 kali.");
  });
  test("tabel baru Tahap 3: outbox, retensi 7 hari, perangkat, produk; angka kebetulan sama dan retensi dari rekaman", () => {
    const outboxTahun = t3.trx * 365 * BYTE_BARIS;
    const outbox7 = t3.trx * 7 * BYTE_BARIS;
    const perangkat = asumsi(3).user * 1.3 * BYTE_BARIS;
    const baris = tabelDi(blokPaham, "| Tabel | Rumus |");
    const c = skemaC.join("\n");
    const hitungC = c.match(/ produk \| warung \| perangkat \| outbox \| promo\n[^\n]*\n (\d+)\s+\| (\d+)\s+\| (\d+)\s+\| (\d+)\s+\| (\d+)/)!;
    const [produkLab, warungLab, perangkatLab] = [Number(hitungC[1]), Number(hitungC[2]), Number(hitungC[3])];
    expect(baris).toEqual([
      ["`outbox` tanpa pembersihan", `${titik(t3.trx)} × 365 × ${BYTE_BARIS} byte`, ukuran(outboxTahun), "Asumsi"],
      ["`outbox` dengan retensi 7 hari", `${titik(t3.trx)} × 7 × ${BYTE_BARIS} byte`, `±${bulatSatu(MB, outbox7)} MB`, "Asumsi"],
      ["`perangkat`", `${titik(asumsi(3).user)} × 1,3 × ${BYTE_BARIS} byte`, `±${bulatSatu(MB, perangkat)} MB`, "Asumsi (1,3 perangkat per user)"],
      ["`produk`", `${warungLab} warung × ${produkLab / warungLab} produk`, `${titik(produkLab)} baris`, "Rekaman lab, `skema.txt` bagian C"],
    ]);
    expect([bulatSatu(MB, outbox7), bulatSatu(MB, perangkat)]).toEqual(["15,8", "3,9"]);
    expect(bagian3b).toContain("`outbox` setahun tanpa pembersihan 7.500 × 365 × 300 B ≈ 0,82 GB; dengan retensi 7 hari tinggal ±15,8 MB. `perangkat` 10.000 × 1,3 × 300 B ≈ 3,9 MB (1,3 perangkat per user adalah Asumsi).");
    expect(outboxTahun).toBe(t3.aktif * asumsi(3).trx * 365 * BYTE_BARIS);
    expect(blokPaham).toContain("Angka ±820 MB di baris pertama kebetulan sama dengan rumus data per tahun di atas, karena keduanya 7.500 × 365 × 300 byte.");
    expect(blokPaham).toContain("Yang dihitung berbeda: yang satu satu baris per transaksi di tabel catatan uang, yang lain satu baris per pemberitahuan di `outbox`.");
    // laju tulis outbox = pembayaran per detik di puncak (λ), dengan catatan pembulatan lab
    const lambda = (t3.trx / 86400) * asumsi(3).puncak;
    expect(koma(lambda, 3)).toBe("0,868");
    expect(blokPaham).toContain(`Nilainya ${titik(t3.trx)} ÷ 86.400 × ${asumsi(3).puncak} = ${koma(lambda, 3)} per detik (lab memakai 0,87).`);
    expect(naskah).toContain("Lab memakai 0,87 persis");
    expect(blokPaham).toContain("Top-up massal dan promo juga menulis baris `outbox` (kelas 1 dan 2) dan tidak ikut dihitung.");
    // data awal lab: 10.060 perangkat untuk karyawan dan warung, jadi bukan 1,3 per user
    const akunLab = (jenis: string): number => Number(c.match(new RegExp(` ${jenis}\\s+\\| (\\d+)\\s+\\|`))![1]);
    expect(perangkatLab).toBe(akunLab("karyawan") + akunLab("warung"));
    expect(blokPaham).toContain(`Lab tidak memuat 1,3 perangkat per user: data awal berisi ${titik(perangkatLab)} perangkat untuk ${titik(perangkatLab)} akun karyawan dan warung.`);
    expect(produkLab).toBe(60 * 40);
    expect(naskah).toContain("`produk` hanya 60 × 40 = 2.400 baris");
  });
  test("retensi 7 hari: baris selesai dibuang, menunggu dan mati tetap, dari rekaman listen.txt bagian C dan kode -bersih", () => {
    const c = bagianRekaman(listen, "C");
    const tabelSebelum = c.slice(c.findIndex((b) => b.includes("SELECT id, status")) + 3, c.findIndex((b) => /^\(5 rows\)/.test(b)));
    const baris = (s: string[]) => s.map((b) => b.split("|").map((x) => x.trim())).map(([id, status, umur]) => ({ id: id!, status: status!, umur: Number(umur) }));
    const sebelum = baris(tabelSebelum);
    const iSesudah = c.findIndex((b, i) => i > c.findIndex((x) => x.startsWith("bersih:")) && b.includes("SELECT id, status"));
    const sesudah = baris(c.slice(iSesudah + 3, c.findIndex((b, i) => i > iSesudah && /^\(\d+ rows?\)/.test(b))));
    const dibuang = sebelum.filter((b) => !sesudah.some((s) => s.id === b.id));
    const utuhLama = sesudah.filter((b) => b.umur > 7);
    expect([...new Set(dibuang.map((b) => b.status))]).toEqual(["terkirim", "dilewati"]);
    expect(dibuang.every((b) => b.umur > 7)).toBe(true);
    expect([...new Set(utuhLama.map((b) => b.status))]).toEqual(["menunggu", "mati"]);
    expect(blokPaham).toContain("Retensi adalah berapa lama baris disimpan sebelum dibuang.");
    expect(blokPaham).toContain("Job `-bersih` di lab membuang baris `terkirim` dan `dilewati` yang lebih tua dari 7 hari, dan tidak menyentuh baris `menunggu` atau `mati` (Rekaman lab, `listen.txt` di lab t3-outbox, bagian C).");
    expect(mainGo).toContain("buang outbox selesai lebih dari 7 hari dan operasi sinkron lebih dari 14 hari");
    expect(c.join("\n")).toContain("bersih: 2 baris outbox selesai (lebih dari 7 hari)");
  });
});

// =================================================================================================================================
describe("Di stack lain: skenario, versi, tautan, dan kode enam tab", () => {
  const labels = ["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"];
  const satuBaris = m17[barisDari(m17, /CREATE UNIQUE INDEX outbox_satu_per_jurnal/) - 1]!;
  const unik = tabel3("outbox").index.find((i) => i.nama === "outbox_satu_per_jurnal")!;
  const kolomIndex = unik.definisi.match(/btree \(([^)]+)\)/)![1]!.split(", ");
  const predikat = unik.definisi.match(/WHERE \((.+)\)$/)![1]!;
  const kodeTab = (n: number): string => tab(n).match(/code=\{`([\s\S]*?)`\}/)![1]!;
  const riset12x = (n: number): string => riset.split("\n").find((b) => b.startsWith(`| R3-12${n} `))!;

  test("skenario, label tab sama dengan 2.9, dan tanggal pengecekan sama dengan tanggal di RISET", () => {
    expect(mdx).toContain(`labels={${JSON.stringify(labels).replace(/","/g, '", "')}}`);
    expect(mdx29).toContain(`labels={${JSON.stringify(labels).replace(/","/g, '", "')}}`);
    expect(blokPaham).toContain(`**Skenario:** unique index sebagian \`${unik.nama}\` pada \`(${kolomIndex.join(", ")})\`, yang hanya memuat baris dengan \`${predikat.replace(" IS NOT NULL", "")}\` terisi.`);
    expect(blokPaham).toContain("Tab Go adalah file migration lab, dijalankan skrip lab dalam satu transaction dan ditulis rekaman sebagai `psql -1 -f`. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-10-26.");
    expect(blokPaham).toContain("Yang sama di semua stack: hasil akhirnya satu index PostgreSQL dengan predikat yang sama.");
    for (const n of [0, 1, 2, 3, 4]) expect(riset12x(n), `R3-12${n}`).toMatch(/dibuka 2026-10-26/);
    expect(skema[1]).toContain("PostgreSQL 17.11");
    expect(tab(0)).toContain("*Dijalankan: isi file SQL oleh skrip lab dalam satu transaction (rekaman menulisnya `psql -1 -f`), PostgreSQL 17.11, lab api-t3 (rekaman `skema.txt` bagian A dan E).*");
    expect(tab(0)).toContain("Rekaman bagian E menunjukkan baris kedua untuk jurnal dan penerima yang sama ditolak dengan SQLSTATE 23505.");
    expect(sqlstate(skemaE, "outbox_satu_per_jurnal")).toBe("23505");
    // satu-satunya tab yang Dijalankan adalah Go; tab lain berlabel Tidak dijalankan
    for (const n of [1, 2, 3, 4, 5]) expect(tab(n), `tab ${n}`).toContain("*Tidak dijalankan. Dicek ke ");
    expect(mdx.match(/\*Dijalankan:/g)).toHaveLength(1);
  });
  test("versi paket di tiap tab sama dengan halaman 2.9, RISET, dan halaman istilah", () => {
    const v: [number, string, string, number][] = [
      [1, "`node-pg-migrate` 9.0.0", "9.0.0", 1],
      [2, "`laravel/framework` 13.38.0", "13.38.0", 2],
      [3, "Django 6.1.2", "6.1.2", 3],
      [4, "Serverpod 4.0.4", "4.0.4", 4],
      [5, "Supabase CLI 2.122.0", "2.122.0", 1],
    ];
    const frasaRiset = [
      "Paket `node-pg-migrate` 9.0.0 (npm latest, 2026-10-26; rilis 2026-07-17)",
      "`laravel/framework` v13.38.0 (rilis 2026-10-20, GitHub Releases)",
      "Django 6.1.2 (PyPI, rilis 2026-10-06)",
      "Serverpod 4.0.4 (pub.dev, rilis 2026-10-06)",
      "CLI v2.122.0 (rilis 2026-10-23)",
    ];
    for (const [i, [n, tulis, versi, riw]] of v.entries()) {
      expect(tab(n), `tab ${n}`).toContain(`, ${tulis}.*`);
      expect(mdx29, `2.9 ${tulis}`).toContain(tulis);
      expect(riset12x(riw), `RISET ${tulis}`).toContain(frasaRiset[i]!);
      expect(riset12x(riw), `RISET ${tulis} sama dengan 2.9`).toMatch(new RegExp(`Versi sama dengan 2\\.9 \\(${versi.replace(/\./g, "\\.")}\\)|Versi sama dengan 2\\.9 \\(dicek 2026-10-24\\)`));
    }
    const stackIstilah = istilah.stack as unknown as Record<string, { versi: string; teks: string; rekaman?: string; dokumentasi?: string }>;
    expect(["node", "laravel", "django", "serverpod", "supabase"].map((k) => stackIstilah[k]!.versi)).toEqual([
      "node-pg-migrate 9.0.0", "Laravel 13.38.0", "Django 6.1.2", "Serverpod 4.0.4 (halaman dokumentasi bertanda 4.0.0)", "Supabase CLI 2.122.0",
    ]);
    expect(riset12x(4)).toContain("halaman bertanda 4.0.0");
    expect(riset12x(2)).toContain("rilis 2026-10-20");
  });
  test("tautan dokumentasi di halaman dan di halaman istilah ada di baris RISET, dan tautan 2.9 yang sama tidak dibelokkan", () => {
    const risetUrl = riset.split("\n").filter((b) => /^\| R3-12[0-4] /.test(b)).join("\n");
    const url = (s: string): string => s.replace(/^https?:\/\//, "").replace(/#.*$/, "");
    const luar = [...mdx.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((m) => m[1]!);
    expect(luar.length).toBeGreaterThanOrEqual(8);
    for (const u of luar) expect(risetUrl, u).toContain(url(u));
    for (const u of ["github.com/salsita/node-pg-migrate/blob/v9.0.0/docs/src/migrations/indexes.md", "laravel.com/docs/13.x/migrations", "docs.djangoproject.com/en/6.1/ref/models/constraints/", "docs.serverpod.dev/concepts/data-and-the-database/database/indexing", "docs.serverpod.dev/concepts/data-and-the-database/database/migrations", "supabase.com/docs/reference/cli/supabase-migration-new"])
      expect(luar.map(url), u).toContain(u);
    const s = istilah.stack as unknown as Record<string, { teks: string; rekaman?: string; dokumentasi?: string }>;
    for (const k of ["node", "laravel", "django", "serverpod", "supabase"]) expect(luar.map(url), `istilah ${k}`).toContain(url(s[k]!.dokumentasi!));
    expect(s.go!.rekaman).toBe("labs/api-t3/output/skema.txt");
    expect(s.go!.teks).toContain(`SQLSTATE ${sqlstate(skemaE, "outbox_satu_per_jurnal")}`);
    expect(s.go!.teks).toContain(satuBaris.replace(/;$/, ""));
  });
  test("kode tiap tab memuat nama index, kolom, dan predikat dari ERD dan migration", () => {
    expect(tab(0)).toContain(`lines="${barisDari(m17, /CREATE UNIQUE INDEX outbox_satu_per_jurnal/) - 1}:${barisDari(m17, /CREATE UNIQUE INDEX outbox_satu_per_jurnal/)}"`);
    const js = kodeTab(1);
    expect(js).toContain(`pgm.createIndex("outbox", [${kolomIndex.map((k) => `"${k}"`).join(", ")}], {`);
    expect(js).toContain(`name: "${unik.nama}",`);
    expect(js).toContain("unique: true,");
    expect(js).toContain(`where: "${predikat}",`);
    expect(kodeTab(2)).toContain(`DB::statement('${satuBaris.replace(/;$/, "")}')`);
    expect(kodeTab(5)).toContain(satuBaris);
    const orm = (k: string): string => k.replace(/_id$/, "");
    const py = kodeTab(3);
    expect(py).toContain(`fields=[${kolomIndex.map((k) => `"${orm(k)}"`).join(", ")}],`);
    expect(py).toContain(`condition=models.Q(${orm(predikat.replace(" IS NOT NULL", ""))}__isnull=False),`);
    expect(py).toContain(`name="${unik.nama}",`);
    expect(py).toContain(`${orm(kolomIndex[0]!)} = models.ForeignKey("Jurnal", null=True,`);
    expect(tabel3("outbox").kolom.find((k) => k.nama === "jurnal_id")!.wajib).toBe(false);
    const camel = (k: string): string => k.replace(/_(\w)/g, (_, c: string) => c.toUpperCase());
    const yaml = kodeTab(4);
    expect(yaml).toContain(`  ${unik.nama}:\n    fields: ${kolomIndex.map(camel).join(", ")}\n    unique: true`);
    expect(yaml).not.toMatch(/where|condition/i);
  });
  test("kalimat 'Yang berbeda di stack ini' bersumber di RISET: opsi Node, daftar tipe Laravel, parameter Django, opsi Serverpod", () => {
    expect(tab(1)).toContain("syarat WHERE ditulis sebagai string SQL mentah di opsi `where`. Dokumentasi mencantumkan opsi `name`, `unique`, dan `where`, tetapi contohnya tidak memakai `where`.");
    expect(riset12x(1)).toMatch(/opsi `createIndex` `name`, `unique`, dan `where` \(SQL mentah\); tanpa contoh `where`/);
    const tipeLaravel = ["primary", "unique", "index", "fullText", "spatialIndex", "vectorIndex"];
    expect(tab(2)).toContain(`dokumentasi mendaftar tipe index ${tipeLaravel.slice(0, -1).join(", ")}, dan ${tipeLaravel[tipeLaravel.length - 1]}. Daftar itu tidak memuat syarat WHERE`);
    expect(riset12x(2)).toContain(`tipe index yang tersedia ${tipeLaravel.map(kode).join(", ")}; tidak ada opsi syarat WHERE`);
    expect(tab(3)).toContain("`UniqueConstraint` punya parameter `condition` bawaan, dan syaratnya ditulis sebagai objek `Q`, bukan SQL mentah.");
    expect(riset12x(3)).toContain('`UniqueConstraint(fields=["user"], condition=Q(status="DRAFT"), name="unique_draft_user")`'.replace(/^`|`$/g, ""));
    const opsiServerpod = ["fields", "unique", "type", "nulls_distinct", "operatorClass", "distanceFunction", "parameters"];
    expect(tab(4)).toContain(`opsi index di dokumentasi adalah ${opsiServerpod.slice(0, -1).map(kode).join(", ")}, dan ${kode(opsiServerpod[opsiServerpod.length - 1]!)}.`);
    expect(riset12x(4)).toContain(`opsi index ${opsiServerpod.map(kode).join(", ")}`);
    expect(riset12x(4)).toContain("Serverpod tidak memeriksa SQL tulisan tangan");
    expect(tab(4)).toContain("Serverpod tidak memeriksa SQL tulisan tangan.");
    expect(tab(4)).toContain("belum dicek dengan menjalankan generator [perlu verifikasi].");
    expect(tab(5)).toContain("CLI hanya menentukan folder dan nama file berpola `<timestamp>_<name>.sql`.");
    expect(riset12x(1)).toContain("`<timestamp>_<name>.sql`");
  });
  // Tinjauan 3.5 (keputusan 1019): tiga mutasi lolos penjaga di atas. Teks tautan dokumentasi ("Serverpod 4.0" jadi "3.0"),
  // nama dan versi di baris RISET ("node-pg-migrate v9.0.0 Indexes" jadi "v8.0.3", sementara v9.0.0 masih ada di URL baris yang sama),
  // dan nama berkas di komentar kode tab ("outbox.spy.yaml" jadi "outbox.yaml").
  test("teks tautan dokumentasi tiap tab, frasa nama + versi + sumber + tanggal di RISET, dan seluruh kode tab dipatok utuh", () => {
    const tautan: [number, string][] = [
      [1, "[node-pg-migrate v9.0.0: Indexes](https://github.com/salsita/node-pg-migrate/blob/v9.0.0/docs/src/migrations/indexes.md)"],
      [2, "[Laravel 13.x: Migrations](https://laravel.com/docs/13.x/migrations#creating-indexes)"],
      [3, "[Django 6.1: Constraints](https://docs.djangoproject.com/en/6.1/ref/models/constraints/)"],
      [4, "[Serverpod 4.0: Indexing](https://docs.serverpod.dev/concepts/data-and-the-database/database/indexing) dan [Migrations](https://docs.serverpod.dev/concepts/data-and-the-database/database/migrations)"],
      [5, "[Supabase CLI: migration new](https://supabase.com/docs/reference/cli/supabase-migration-new)"],
    ];
    for (const [n, t] of tautan) expect(tab(n), `tab ${n}`).toContain(`Dicek ke ${t}`);
    const frasaRiset: [number, string][] = [
      [0, "PostgreSQL 17.11 §11.8 Partial Indexes (www.postgresql.org/docs/17/indexes-partial.html, dibuka 2026-10-26)"],
      [0, "§5.5.3 Unique Constraints (www.postgresql.org/docs/17/ddl-constraints.html, dibuka 2026-10-26)"],
      [1, "node-pg-migrate v9.0.0 Indexes (github.com/salsita/node-pg-migrate/blob/v9.0.0/docs/src/migrations/indexes.md, dibuka 2026-10-26)"],
      [1, "Supabase CLI `migration new` (supabase.com/docs/reference/cli/supabase-migration-new, dibuka 2026-10-26)"],
      [2, "Laravel 13.x Database: Migrations, bagian Creating Indexes (laravel.com/docs/13.x/migrations, dibuka 2026-10-26)"],
      [3, "Django 6.1 Constraints (docs.djangoproject.com/en/6.1/ref/models/constraints/, dibuka 2026-10-26)"],
      [4, "Serverpod docs Indexing (docs.serverpod.dev/concepts/data-and-the-database/database/indexing, halaman bertanda 4.0.0, dibuka 2026-10-26)"],
      [4, "Halaman Migrations (docs.serverpod.dev/concepts/data-and-the-database/database/migrations)"],
    ];
    for (const [n, f] of frasaRiset) expect(riset12x(n), `RISET R3-12${n}: ${f.slice(0, 40)}`).toContain(f);
    const nama = unik.nama;
    const kol = kolomIndex.join(", ");
    expect(kodeTab(1)).toBe(`// migrations/<timestamp>_${nama}.js
export const up = (pgm) => {
  pgm.createIndex("outbox", [${kolomIndex.map((k) => `"${k}"`).join(", ")}], {
    name: "${nama}",
    unique: true,
    where: "${predikat}",
  });
};`);
    expect(kodeTab(2)).toBe(`DB::statement('CREATE UNIQUE INDEX ${nama} ON outbox (${kol}) WHERE ${predikat}');`);
    expect(kodeTab(3)).toBe(`from django.db import models

class Outbox(models.Model):
    jurnal = models.ForeignKey("Jurnal", null=True, on_delete=models.PROTECT)
    akun = models.ForeignKey("Akun", on_delete=models.PROTECT)

    class Meta:
        db_table = "outbox"
        constraints = [
            models.UniqueConstraint(
                fields=["jurnal", "akun"],
                condition=models.Q(jurnal__isnull=False),
                name="${nama}",
            ),
        ]`);
    expect(kodeTab(4)).toBe(`# lib/src/models/outbox.spy.yaml (potongan)
indexes:
  ${nama}:
    fields: jurnalId, akunId
    unique: true`);
    expect(kodeTab(5)).toBe(`-- supabase/migrations/<timestamp>_${nama}.sql, dibuat: supabase migration new ${nama}
CREATE UNIQUE INDEX ${nama} ON outbox (${kol}) WHERE ${predikat};`);
  });
});

// =================================================================================================================================
describe("blok Putuskan dan Kunci", () => {
  test("tabel trade-off menyebut lock_timeout dari migration dan dua ukuran outbox dari hitungan", () => {
    const retensi = `±${bulatSatu(MB, t3.trx * 7 * BYTE_BARIS)} MB`;
    expect(blokPutuskan).toContain(`| Tabel perantara yang tumbuh tiap transaksi, mis. \`outbox\` | Retensi tertulis dan job pembersih: 7 hari menahan ukurannya di ${retensi}, tanpa itu ${ukuran(t3.trx * 365 * BYTE_BARIS)} per tahun |`);
    expect(blokPutuskan).toContain("| Perubahan skema yang hanya menambah | Expand saja: `lock_timeout` 3 detik, tanpa langkah contract |");
    expect(migrasi.every((m) => m.isi.includes("lock_timeout = '3s'"))).toBe(true);
    expect(blokPutuskan).toContain("| Fitur baru butuh data yang mengikuti uang, mis. pemberitahuan | Tabel sendiri yang menunjuk ke `jurnal_id`; `jurnal` dan `posting` tidak diubah |");
    expect(blokPutuskan).toContain("| Aturan yang harus benar di semua jalur | CHECK, UNIQUE, dan index sebagian di database, diuji dengan INSERT yang harus ditolak |");
    expect(blokPutuskan).toContain("Tabel `outbox` butuh retensi, dan baris yang `mati` tetap tinggal sampai ada yang memeriksanya.");
    expect(blokPutuskan).toContain("Bila salah satu biaya ini terasa, masalahnya dibahas di [[t3-m19]] dan [[t3-m27]].");
    expect(per("t3-m19").judul.startsWith("M19:")).toBe(true);
    expect(per("t3-m27").judul.startsWith("M27:")).toBe(true);
  });
  test("Sengaja belum dilakukan: posting, data pribadi, dan modul dari registry, naskah, rekaman, dan halaman 2.9", () => {
    expect(mdx29).toContain("| Partisi `posting` per bulan |");
    const t5 = mdx29.match(/\| 5 \| 1 juta \| 20% \| ±30 \| `posting` (±\d+ juta) \| ±110 GB \|/)!;
    expect(blokPutuskan).toContain(`| Partisi \`posting\` per bulan | ${sig(t3.posting)} posting per tahun (Asumsi); \`posting\` tetap tabel terbesar, dan belum ada rekaman lab dengan ${titik(t3.posting)} posting | Tahap 5, saat \`posting\` diperkirakan ${t5[1]} per tahun ([[t2-skema]]) |`);
    const rekamanLab = [...terlacak].filter((f) => /^labs\/[^/]+\/output\/.*\.txt$/.test(f));
    expect(rekamanLab.length).toBeGreaterThan(50);
    expect(rekamanLab.filter((f) => /5\.?475\.?000/.test(baca(f)))).toEqual([]);
    expect(blokPutuskan).toContain(`| Menghapus data pribadi dari \`jurnal.keterangan\` | Jurnal tidak bisa dihapus: DELETE ditolak untuk role aplikasi (SQLSTATE ${sqlstateSetelah(skemaD, "DELETE FROM jurnal WHERE id = 1")}), sedangkan catatan user kini ikut masuk ke \`keterangan\` | Belum dijadwalkan ([[t2-adr-ledger]]) |`);
    expect(blokPutuskan).toContain(`| Memisah tabel per modul (schema) | ${erd3.tabel.length} tabel masih dikerjakan satu tim ${asumsi(3).tim} | Tahap 4, saat tabel diperkirakan ±22 dan tim ${TIM_T4_HALAMAN} |`);
    expect(bagian3b).toContain("| 4 | 100.000 | ±22, dibagi per modul |");
    expect(asumsi(3).tim).toBe("4 developer");
    // T4-siap (keputusan 1208) memindahkan registry dan naskah Tahap 4 ke 13 developer dalam tiga tim; KONSISTENSI-4 (butir 1)
    // menyamakan halaman 3.5 dengannya. Kalimat lama "6–10 developer dalam 2 tim" tidak boleh kembali, di halaman maupun di blok Putuskan.
    expect(asumsi(4).tim).toBe("13 developer, 3 tim");
    expect(TIM_T4_HALAMAN).toBe("13 developer dalam tiga tim");
    expect(blokPutuskan).not.toContain("6–10 developer");
    expect(blokPutuskan).not.toContain("dalam 2 tim");
  });
  test("Cek diri: lima kartu, jawaban memakai nilai turunan, dan kartu ulang digenerate dari pertanyaan yang sama", () => {
    const pertanyaan = [...blokKunci.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => [m[1], m[2]]);
    expect(pertanyaan.map((p) => p[0])).toEqual(["1", "2", "3", "4", "5"]);
    const jawab = [...blokKunci.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawab).toHaveLength(5);
    expect(jawab[0]).toBe("`akun` mendapat `kota_id`, dan `sesi` mendapat `jenis` dan `csrf_hash`. Nilai `hr` juga ditambahkan ke aturan `akun_jenis_check`. Enam tabel Tahap 2 lainnya tidak berubah.");
    expect(jawab[1]).toBe("Status pemberitahuan berubah dari `menunggu` ke `terkirim`, dan tempatnya `outbox.status`. `outbox.jurnal_id` menunjuk jurnalnya, dan unique index `outbox_satu_per_jurnal` menjaga satu baris per jurnal dan penerima. Role aplikasi juga tidak boleh DELETE jurnal.");
    expect(jawab[2]).toBe(`CHECK \`outbox_jurnal_atau_promo\` mewajibkan \`jurnal_id\` kosong persis ketika \`jenis\` adalah \`promo\`, dan melanggarnya ditolak dengan SQLSTATE ${sqlstate(skemaE, "outbox_jurnal_atau_promo")}. Hanya pengumuman promo yang boleh tanpa jurnal.`);
    expect(jawab[3]).toBe(`${titik(t3.user)} × ${t3.persenAktif}% × ${TRX_LEDGER} = ${titik(t3.trx)} transaksi per hari. Lalu ${titik(t3.trx)} × ${PER_POSTING} posting × ${HARI} hari = ${titik(t3.posting)} posting. Angka ${ukuran(t3.aktif * asumsi(3).trx * 365 * BYTE_BARIS)} menghitung satu baris ${BYTE_BARIS} byte per transaksi, sedangkan ${ukuran(t3.byte)} menghitung dua posting ${BYTE_POSTING} byte per transaksi.`);
    expect(jawab[4]).toBe(`Tanpa pembersihan ${titik(t3.trx)} × 365 × ${BYTE_BARIS} byte, ${ukuran(t3.trx * 365 * BYTE_BARIS)}. Dengan retensi 7 hari ${titik(t3.trx)} × 7 × ${BYTE_BARIS} byte, ±${bulatSatu(MB, t3.trx * 7 * BYTE_BARIS)} MB. Keduanya Asumsi.`);
    expect(pertanyaan[3]![1]).toBe(`Dari rumus apa ${sig(t3.posting)} posting per tahun di Tahap 3, dan kenapa ${ukuran(t3.aktif * asumsi(3).trx * 365 * BYTE_BARIS)} dan ${ukuran(t3.byte)} berbeda?`);
    const kartu = bacaJson<{ halaman: string; tanya: string; jawab: string }[]>("situs/lama/widgets/data/kartu.json").filter((k) => k.halaman === "t3-skema");
    expect(kartu.map((k) => k.tanya)).toEqual(pertanyaan.map((p) => p[1]));
    expect(kartu.map((k) => k.jawab)).toEqual(jawab);
  });
  test("daftar periksa kode AI dan bacaan lanjut", () => {
    const daftar = blokKunci.split("\n").filter((b) => b.startsWith("- [ ] "));
    expect(daftar).toHaveLength(5);
    for (const [i, kunci] of ["`jurnal_id`", "INSERT yang harus ditolak", "`lock_timeout`", "retensi tertulis", "baris atau posting"].entries()) expect(daftar[i], kunci).toContain(kunci);
    for (const u of ["https://www.postgresql.org/docs/17/indexes-partial.html", "https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS"]) expect(blokKunci).toContain(`](${u})`);
  });
});

// =================================================================================================================================
describe("label sumber, riset, glosarium, dan halaman istilah", () => {
  test("setiap rujukan rekaman 'bagian X' di halaman menunjuk bagian yang ada di berkasnya", () => {
    const berkas: Record<string, string[]> = { "skema.txt": skema, "outbox.txt": outboxTxt, "index.txt": indexB2, "listen.txt": listen };
    const rujukan = [...mdx.matchAll(/`(skema|outbox|index|listen)\.txt`(?: di lab [a-z0-9-]+,)? bagian ([A-Z])(?: dan ([A-Z]))?/g)];
    expect(rujukan.map((m) => `${m[1]}:${m[2]}${m[3] ?? ""}`).sort()).toEqual(["index:E", "listen:C", "outbox:AE", "skema:A", "skema:AB", "skema:AE", "skema:B", "skema:C", "skema:E"]);
    for (const m of rujukan) for (const huruf of [m[2], m[3]].filter(Boolean) as string[]) {
      const baris = berkas[`${m[1]}.txt`]!;
      expect(baris.some((b) => b.startsWith(`# --- ${huruf}. `)), `${m[1]}.txt bagian ${huruf}`).toBe(true);
    }
    // rujukan yang menyebut lab lain memakai lab yang benar: listen.txt ada di lab t3-outbox, bukan api-t3
    expect(terlacak.has("labs/t3-outbox/output/listen.txt")).toBe(true);
    expect(terlacak.has("labs/api-t3/output/listen.txt")).toBe(false);
    expect(terlacak.has("labs/b2-query/output/ledger/index.txt")).toBe(true);
  });
  test("label Rekaman lab tidak dipakai untuk hasil rumus: semua kolom Label tabel hitungan berisi Asumsi", () => {
    for (const awalan of ["| Tahap | User |", "| Sumber | Yang dihitung |", "| Tabel | Rumus |"]) {
      const baris = tabelDi(blokPaham, awalan);
      for (const b of baris) {
        const label = b[b.length - 1]!;
        if (awalan.startsWith("| Tahap")) continue; // tabel pertumbuhan: judul "Asumsi" ada di kalimat pembuka, diperiksa di bawah
        if (b[0] === "`produk`") expect(label).toBe("Rekaman lab, `skema.txt` bagian C");
        else expect(label).toMatch(/^Asumsi/);
      }
    }
    expect(blokPaham).toContain("Semua angka di tabel ini adalah **Asumsi** cerita.");
  });
  test("baris riset R3-120 sampai R3-124: berurutan setelah R3-94, tanpa ID ganda, memuat versi dan klaim yang dipakai halaman", () => {
    const baris = riset.split("\n");
    const awal = baris.findIndex((b) => b.startsWith("## Konsep dan sumber"));
    const akhir = baris.findIndex((b, i) => i > awal && b.startsWith("## Teknik terbaru"));
    const konsep = baris.slice(awal, akhir).filter((b) => /^\| R3-\d+ /.test(b)).map((b) => Number(b.match(/^\| R3-(\d+) /)![1]));
    expect(konsep, "baris konsep urut ID").toEqual([...konsep].sort((x, y) => x - y));
    expect(konsep.slice(konsep.indexOf(120), konsep.indexOf(120) + 5)).toEqual([120, 121, 122, 123, 124]);
    const id = baris.filter((b) => b.startsWith("| R3-")).map((b) => b.split("|")[1]!.trim());
    expect(new Set(id).size).toBe(id.length);
    for (const [n, kunci] of [[0, ["§11.8", "§5.5.3", "NULLS NOT DISTINCT"]], [1, ["9.0.0", "where", "2.122.0", "migration new"]], [2, ["13.38.0", "vectorIndex"]], [3, ["6.1.2", "condition"]], [4, ["4.0.4", "nulls_distinct", "migration.sql", "[perlu verifikasi]"]]] as [number, string[]][])
      for (const k of kunci) expect(baris.find((b) => b.startsWith(`| R3-12${n} `)), `R3-12${n} ${k}`).toContain(k);
  });
  test("glosarium: baris Index sebagian, tautan ke halaman ini, kalimat tidak lebih dari 25 kata, dan istilah terkait ada", () => {
    const baris = glosarium.split("\n").find((b) => b.startsWith("| **Index sebagian**"))!;
    const [nama, kalimat, halaman] = sel(baris);
    expect(nama).toBe("**Index sebagian** (partial index)");
    expect(halaman).toBe("[[t3-skema]]");
    expect(kalimat!.split(/\s+/).length).toBeLessThanOrEqual(25);
    expect(kalimat).toBe("Index yang hanya memuat baris yang memenuhi syarat WHERE, sehingga lebih kecil, dan pada unique index hanya baris itu yang dijaga keunikannya.");
    for (const t of istilah.terkait!) expect(glosarium, t).toContain(`| **${t}**`);
    expect(istilah.istilah).toBe("Index sebagian (partial index)");
    expect(istilah.cerita![0]!.rujukan).toBe("t3-skema");
    expect(istilah.cerita![0]!.teks).toContain(`SQLSTATE ${sqlstate(skemaE, "outbox_satu_per_jurnal")}`);
    expect(istilah.cerita![0]!.teks).toContain("`outbox_antre` hanya memuat baris `menunggu`");
    const idRiset = (istilah.sumber ?? []).flatMap((s) => ("riset" in s && s.riset ? [s.riset] : []));
    expect(new Set(idRiset)).toEqual(new Set(["R3-120", "R3-121", "R3-122", "R3-123", "R3-124"]));
    for (const s of istilah.sumber ?? []) {
      if ("url" in s && "riset" in s) expect(riset.split("\n").find((b) => b.startsWith(`| ${s.riset} `)), s.judul).toContain(s.url.replace(/^https?:\/\//, "").replace(/#.*$/, ""));
      if ("rekaman" in s) expect(terlacak.has(s.rekaman)).toBe(true);
    }
    expect(istilah.mekanisme![2]).toContain("Planner mengenali kasus sederhana");
    expect(riset.split("\n").find((b) => b.startsWith("| R3-120 "))).toContain("secara matematis menyiratkan predikat");
  });
  test("gaya: tanpa Anda, kita, tanda seru, atau emoji di halaman, diagram, dan tebakan", () => {
    for (const teks of [mdx, JSON.stringify(rantaiMentah), JSON.stringify(dataTebakMentah)]) {
      expect(teks).not.toMatch(/\b(Anda|kita)\b/);
      expect(teks).not.toMatch(/!/);
      expect(teks).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

// =================================================================================================================================
describe("kalimat tetap: prosa tanpa angka dipatok kata demi kata, dan klaim di dalamnya dijaga sumbernya", () => {
  const TETAP = [
    "Tebak dulu, lalu cek jawabanmu di ERD di bawahnya. ERD adalah gambar tabel, kolom, dan foreign key di antaranya.",
    "Diagram dibuka di Tahap 3.",
    "**Ubah satu hal:** tekan **Bandingkan dengan Tahap 2**. Di layar lebar kedua skema tampil berdampingan, dan di HP skema Tahap 2 tampil di atas skema Tahap 3.",
    "PRD v3 meminta pemberitahuan, katalog, dasbor, promo, dan mode offline. Masing-masing butuh tempat menyimpan data, dan [[t3-fitur-teknis]] menurunkannya jadi pekerjaan. Halaman ini menunjukkan akibatnya pada tabel.",
    "Setiap perubahan di bawah punya alasan dan masalah yang memicunya. Tanpa catatan itu, tim berikutnya tidak tahu kenapa `outbox` menunjuk ke `jurnal` dan aturan mana yang melindungi uang.",
    "**Apa yang berubah dan kenapa.** Kolom kiri adalah skema akhir Tahap 2, kolom kedua skema akhir Tahap 3. Nama tabel dan kolom ada di skema lab api-t3 (Rekaman lab, `skema.txt` bagian A dan B). Kolom Alasan adalah pertimbangan tim, bukan hasil ukur.",
    "Status pemberitahuan ada di `outbox.status`, jadi `jurnal` tidak butuh kolom untuk itu.",
    "Aturan itu ditulis di migration 000017, bukan hanya di service:",
    "Rumusnya ditulis supaya kamu bisa mengganti angkanya:",
    "**Tiga angka untuk satu tahun data Tahap 3.** Ketiganya menghitung hal yang berbeda, jadi tidak ditukar:",
    "ERD di halaman ini dibaca dari katalog database, jadi tidak bergantung pada stack yang membuat tabelnya.",
    "**Yang berbeda di stack ini:** skema ditulis dengan SQL apa adanya, dan server Go tidak membuat tabel sendiri.",
    "Daftar itu tidak memuat syarat WHERE, jadi index sebagian ditulis dengan SQL mentah. `$table->unique(['jurnal_id', 'akun_id'])` membuat unique index biasa.",
    "Dokumentasinya memberi contoh keunikan bersyarat: satu draf per user.",
    "Syarat WHERE tidak ada, jadi model hanya bisa meminta unique index biasa.",
    "**Yang berbeda di stack ini:** SQL-nya sama dengan lab, karena migration Supabase adalah file `.sql`.",
    "**1.** Tabel Tahap 2 mana yang mendapat kolom baru di Tahap 3, dan kolom apa?",
    "**2.** Kenapa `jurnal` tidak mendapat kolom pemberitahuan?",
    "**3.** `outbox` menolak baris bayar tanpa jurnal. Aturan apa yang menolaknya, dan baris jenis apa yang boleh tanpa jurnal?",
    "**5.** Berapa ukuran `outbox` setahun tanpa pembersihan, dan dengan retensi 7 hari?",
    "- [ ] Tabel baru yang mengikuti uang menunjuk ke `jurnal_id`, dan kolom pemberitahuan atau status tidak ditambahkan ke `jurnal` atau `posting`.",
    "- [ ] Aturan yang melindungi data (CHECK, UNIQUE) ada di migration dan diuji dengan INSERT yang harus ditolak, bukan hanya di service.",
    "- [ ] Migration yang hanya menambah membuka dengan `lock_timeout`, dan yang menghapus kolom atau tabel lewat expand, migrate, lalu contract.",
    "- [ ] Tabel perantara yang tumbuh tiap transaksi punya retensi tertulis dan job pembersih.",
    "- [ ] Rumus ukuran data menyebut apa yang dihitung (baris atau posting) dan ukuran per barisnya.",
    "- [PostgreSQL 17: Partial Indexes](https://www.postgresql.org/docs/17/indexes-partial.html)",
    "- [PostgreSQL 17: Unique Constraints](https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)",
    "<summary>Sudah tahu? Cek 3 pertanyaan</summary>",
    "| Perkiraan ukuran sebelum ada data | Rumus dengan angka berlabel; besaran yang menghitung hal berbeda ditulis sebagai besaran berbeda |",
  ];
  test("setiap kalimat tetap ada kata demi kata di halaman", () => {
    for (const k of TETAP) expect(mdx, k.slice(0, 60)).toContain(k);
  });
  test("urutan judul bagian (###) dan judul blok sama dengan naskah halaman konsep", () => {
    expect([...mdx.matchAll(/^#{2,3} (.+)$/gm)].map((m) => m[1])).toEqual([
      "Inti", "Kenapa ini ada", "Cara kerjanya", "Pertumbuhan skala database, Tahap 2 sampai 4", "Di stack lain",
      "Trade-off: kapan pakai apa", "Sengaja belum dilakukan", "Cek diri", "Saat me-review kode AI, cek ini", "Bacaan lanjut",
    ]);
  });
  test("klaim di kalimat tetap: PRD v3 menyebut kelima fitur, dan kode server api-t3 tidak membuat tabel (lingkup: berkas Go di labs/api-t3)", () => {
    const prd = naskah.slice(naskah.indexOf("## 1. PRD v3"), naskah.indexOf("## 2. Dari fitur ke pekerjaan teknis"));
    for (const kata of ["Notifikasi", "katalog", "dasbor", "promo", "offline"]) expect(prd.toLowerCase(), kata).toContain(kata.toLowerCase());
    const go = [...terlacak].filter((f) => f.startsWith("labs/api-t3/") && f.endsWith(".go"));
    expect(go.length).toBeGreaterThan(10);
    expect(go.filter((f) => /CREATE TABLE/i.test(baca(f)))).toEqual([]);
    // 'satu draf per user' dan 'file .sql' bersumber di baris RISET
    expect(riset).toContain("condition=Q(status=\"DRAFT\")");
    expect(riset).toContain("`<timestamp>_<name>.sql`");
  });
});

// =================================================================================================================================
describe("halaman istilah Index sebagian: isi persis", () => {
  // Kata demi kata: perubahan satu kata di sehari_hari, mekanisme, jebakan, stack, atau catatan sumber tidak boleh lolos.
  // Angka dan kode penolakan di dalamnya diperiksa terhadap sumbernya di blok lain (SQLSTATE 23505 dari skema.txt bagian E).
  const HARAPAN_ISTILAH = {
  "istilah": "Index sebagian (partial index)",
  "sehari_hari": "Index biasa mencatat semua baris tabel. Index sebagian hanya mencatat baris yang lolos satu syarat, mis. baris yang jurnalnya terisi, jadi lebih kecil dan, bila UNIQUE, hanya menjaga baris itu.",
  "cerita": [
    {
      "rujukan": "t3-skema",
      "teks": "`outbox_satu_per_jurnal` pada `(jurnal_id, akun_id)` hanya memuat baris yang `jurnal_id`-nya terisi, jadi pengumuman promo tidak ikut. Baris kedua untuk jurnal dan penerima yang sama ditolak database dengan SQLSTATE 23505. `outbox_antre` hanya memuat baris `menunggu`."
    }
  ],
  "mekanisme": [
    "`CREATE INDEX ... WHERE <syarat>` membuat index yang hanya punya entri untuk baris yang memenuhi syarat itu.",
    "Pada UNIQUE index sebagian, keunikan ditegakkan di antara baris yang memenuhi syarat, tanpa membatasi baris yang tidak.",
    "Query memakai index sebagian hanya bila WHERE query menyiratkan syarat index. Planner mengenali kasus sederhana, selain itu syarat harus sama persis dengan bagian WHERE query.",
    "Pencocokan terjadi saat query direncanakan, jadi klausa query berparameter tidak cocok dengan index sebagian."
  ],
  "stack": {
    "go": {
      "label": "Rekaman lab",
      "versi": "PostgreSQL 17.11; file migration labs/api-t3 dijalankan skrip lab",
      "teks": "Migration 000017 menulis `CREATE UNIQUE INDEX outbox_satu_per_jurnal ON outbox (jurnal_id, akun_id) WHERE jurnal_id IS NOT NULL`. INSERT kedua untuk jurnal dan penerima yang sama ditolak dengan SQLSTATE 23505.",
      "rekaman": "labs/api-t3/output/skema.txt"
    },
    "node": {
      "label": "Tidak dijalankan",
      "versi": "node-pg-migrate 9.0.0",
      "teks": "`pgm.createIndex` menerima opsi `name`, `unique`, dan `where`. Syarat ditulis sebagai string SQL mentah di opsi `where`.",
      "dokumentasi": "https://github.com/salsita/node-pg-migrate/blob/v9.0.0/docs/src/migrations/indexes.md"
    },
    "laravel": {
      "label": "Tidak dijalankan",
      "versi": "Laravel 13.38.0",
      "teks": "Daftar tipe index di dokumentasi tidak punya syarat WHERE, jadi index sebagian ditulis dengan `DB::statement` dan SQL mentah.",
      "dokumentasi": "https://laravel.com/docs/13.x/migrations#creating-indexes"
    },
    "django": {
      "label": "Tidak dijalankan",
      "versi": "Django 6.1.2",
      "teks": "`UniqueConstraint` menerima parameter `condition` berupa objek `Q`, misalnya `condition=Q(jurnal__isnull=False)`, untuk keunikan bersyarat.",
      "dokumentasi": "https://docs.djangoproject.com/en/6.1/ref/models/constraints/"
    },
    "serverpod": {
      "label": "Tidak dijalankan",
      "versi": "Serverpod 4.0.4 (halaman dokumentasi bertanda 4.0.0)",
      "teks": "Opsi index di model tidak memuat syarat WHERE, jadi model hanya bisa meminta unique index biasa. Index sebagian ditulis tangan di `migration.sql` [perlu verifikasi].",
      "dokumentasi": "https://docs.serverpod.dev/concepts/data-and-the-database/database/indexing"
    },
    "supabase": {
      "label": "Tidak dijalankan",
      "versi": "Supabase CLI 2.122.0",
      "teks": "Migration adalah file SQL biasa, jadi SQL-nya sama dengan lab. `supabase migration new` hanya membuat file berpola `<timestamp>_<name>.sql`.",
      "dokumentasi": "https://supabase.com/docs/reference/cli/supabase-migration-new"
    }
  },
  "jebakan": [
    "Mengira `WHERE kolom IS NOT NULL` perlu supaya baris dengan kolom kosong tidak bentrok. Unique index sudah menganggap dua NULL tidak sama, jadi syarat itu hanya mengecilkan index.",
    "Mengira seluruh tabel ikut dijaga. Keunikan hanya berlaku di antara baris yang memenuhi syarat, dan baris di luar syarat bebas duplikat.",
    "Menulis query berparameter, mis. `WHERE status = $1`, dan berharap index sebagian dipakai. Pencocokan syarat terjadi saat perencanaan, jadi klausa berparameter tidak cocok."
  ],
  "terkait": [
    "Index",
    "Constraint",
    "Outbox",
    "Expand-migrate-contract"
  ],
  "sumber": [
    {
      "riset": "R3-120",
      "judul": "PostgreSQL 17: Partial Indexes",
      "url": "https://www.postgresql.org/docs/17/indexes-partial.html",
      "catatan": "Index memuat entri hanya untuk baris yang memenuhi predikat; unique index sebagian menegakkan keunikan di antara baris itu; dipakai query hanya bila WHERE query menyiratkan predikat; klausa berparameter tidak bekerja."
    },
    {
      "riset": "R3-120",
      "judul": "PostgreSQL 17: Unique Constraints",
      "url": "https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS",
      "catatan": "Bawaannya dua NULL tidak dianggap sama; NULLS NOT DISTINCT mengubahnya."
    },
    {
      "judul": "Rekaman lab api-t3: aturan tabel baru ditolak database",
      "rekaman": "labs/api-t3/output/skema.txt",
      "catatan": "Bagian E: baris kedua untuk jurnal dan penerima yang sama ditolak dengan SQLSTATE 23505 (outbox_satu_per_jurnal)."
    },
    {
      "riset": "R3-121",
      "judul": "node-pg-migrate v9.0.0: Indexes",
      "url": "https://github.com/salsita/node-pg-migrate/blob/v9.0.0/docs/src/migrations/indexes.md",
      "catatan": "Opsi createIndex: name, unique, dan where (SQL mentah); tanpa contoh where."
    },
    {
      "riset": "R3-122",
      "judul": "Laravel 13.x: Migrations, Creating Indexes",
      "url": "https://laravel.com/docs/13.x/migrations#creating-indexes",
      "catatan": "Tipe index: primary, unique, index, fullText, spatialIndex, vectorIndex; tidak ada syarat WHERE."
    },
    {
      "riset": "R3-123",
      "judul": "Django 6.1: Constraints",
      "url": "https://docs.djangoproject.com/en/6.1/ref/models/constraints/",
      "catatan": "UniqueConstraint punya parameter condition berupa objek Q; batasan database sama dengan Index.condition."
    },
    {
      "riset": "R3-124",
      "judul": "Serverpod 4.0: Indexing",
      "url": "https://docs.serverpod.dev/concepts/data-and-the-database/database/indexing",
      "catatan": "Opsi index: fields, unique, type, nulls_distinct, operatorClass, distanceFunction, parameters; tanpa syarat WHERE."
    },
    {
      "riset": "R3-121",
      "judul": "Supabase CLI: migration new",
      "url": "https://supabase.com/docs/reference/cli/supabase-migration-new",
      "catatan": "Membuat file migration lokal berpola <timestamp>_<name>.sql di supabase/migrations."
    }
  ]
};
  test("seluruh isi sama dengan nilai yang dijaga", () => {
    expect(JSON.parse(JSON.stringify(istilah))).toEqual(HARAPAN_ISTILAH);
    expect(sqlstate(skemaE, "outbox_satu_per_jurnal")).toBe("23505");
  });
});
