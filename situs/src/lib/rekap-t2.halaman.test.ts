// Penjaga halaman 2.32 (keputusan 775 sampai 777): setiap angka, ID halaman, nomor ADR, dan tautan di rekap.mdx, kartu
// t2-rekap-kartu.json, dan diagram Rantai t2-rekap-kejadian.json harus bisa diturunkan dari naskah (CERITA-TAHAP-2 bagian 4
// dan 5), registry (cerita.json), halaman Tahap 2 yang dirujuk, dan rekaman lab. Tanpa tes ini, mengubah satu angka, satu ID,
// satu nomor ADR, atau satu tautan di halaman rekap tidak menggagalkan build, Vitest, atau alat ukur mana pun, karena
// halaman ini hanya merangkum halaman lain. Klaim "belum ada" (Idempotency-Key, argon2id, perkakas load test, dua server)
// dipindai dari isi lab. Lingkup klaim dibatasi: yang dipindai adalah api-t2 dan sepuluh lab Tahap 2, bukan semua lab.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import kejadian from "../../data/diagram/t2-rekap-kejadian.json";
import { DataRantai } from "./rantai";
import { daftarBlok, idBlok } from "./blok";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const mdx = baca("situs/src/content/docs/tahap-2/rekap.mdx");
const kartu = JSON.parse(baca("situs/lama/widgets/data/t2-rekap-kartu.json")) as {
  id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string;
}[];
const naskah = baca("plan/CERITA-TAHAP-2.md");

interface H { id: string; judul: string; tahap: number | string; path: string; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; prasyarat?: string[]; bagian?: number | string }
const HALAMAN = cerita.halaman as unknown as H[];
const per = (id: string): H => {
  const h = HALAMAN.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const label = (h: H): string => `${h.nomor} ${h.judul}`;
const urlHalaman = (h: H): string => h.path.replace(/\.md$/, "/");
const fileHalaman = (h: H): string => baca(`situs/src/content/docs/${h.path.replace(/\.md$/, ".mdx")}`);

// ---- potongan MDX --------------------------------------------------------------------------------------------------
const blok = (nama: string): string => {
  const awal = mdx.indexOf(`<Blok nama="${nama}"`);
  const akhir = mdx.indexOf("</Blok>", awal);
  if (awal < 0 || akhir < 0) throw new Error(`halaman: blok ${nama} tidak ada`);
  return mdx.slice(awal, akhir);
};
const TOKEN = /\[\[([A-Za-z0-9.\-]+)(?:\|[^\]]+)?\]\]/g;
const idDalam = (teks: string): string[] => [...teks.matchAll(TOKEN)].map((m) => m[1]!);

interface Butir { no: number; kalimat: string; teks: string; ids: string[]; adr: number[] }
const sepuluh = ((): Butir[] => {
  const paham = blok("Paham");
  const awal = paham.indexOf("### Sepuluh kalimat");
  const akhir = paham.indexOf("### Tiga halaman konsep");
  const bagian = paham.slice(awal, akhir).split("\n");
  const hasil: Butir[] = [];
  for (const b of bagian) {
    const m = b.match(/^(\d+)\. \*\*(.+?)\*\*/);
    if (m) hasil.push({ no: Number(m[1]), kalimat: m[2]!.replace(/\.$/, ""), teks: "", ids: [], adr: [] });
    if (hasil.length) hasil[hasil.length - 1]!.teks += b + "\n";
  }
  for (const h of hasil) {
    h.ids = idDalam(h.teks);
    h.adr = [...h.teks.matchAll(/\bADR (\d+)/g)].map((m) => Number(m[1]));
  }
  return hasil;
})();

// ---- naskah: bagian 4 (M dan ADR) dan bagian 5 (kalimat) -------------------------------------------------------------
const barisNaskah = naskah.split("\n");
const kalimatNaskah = ((): string[] => {
  const a = barisNaskah.findIndex((b) => b.startsWith("## 5. Yang dibawa pembaca keluar dari Tahap 2"));
  const z = barisNaskah.findIndex((b, i) => i > a && b.startsWith("## 6."));
  return barisNaskah.slice(a, z).filter((b) => b.startsWith("| ") && !b.startsWith("| Konsep") && !b.startsWith("| ---")).map((b) => b.split("|")[2]!.trim());
})();
const adrPerM = ((): Map<number, number> => {
  const peta = new Map<number, number>();
  for (const b of barisNaskah) {
    const m = b.match(/^\| M(\d+) \|.*\| ADR (\d+)[: ]/);
    if (m) peta.set(Number(m[1]), Number(m[2]));
  }
  return peta;
})();
const idM = (n: number): string => {
  const h = HALAMAN.find((x) => x.tahap === 2 && x.judul.startsWith(`M${n}:`));
  if (!h) throw new Error(`registry: M${n} tidak ada`);
  return h.id;
};
const idAdr = (n: number): string => {
  const h = HALAMAN.filter((x) => x.tahap === 2 && x.adr?.includes(n));
  if (h.length !== 1) throw new Error(`registry: ADR ${n} harus tepat di satu halaman Tahap 2, ada ${h.length}`);
  return h[0]!.id;
};

// ---- rekaman -----------------------------------------------------------------------------------------------------------
const rekaman = (rel: string): string => baca(`labs/${rel}`);
/** Baris satu bagian rekaman bertanda "# --- X. ..." sampai bagian berikutnya. */
const bagian = (teks: string, kode: string): string[] => {
  const baris = teks.split("\n");
  const awal = baris.findIndex((b) => b.startsWith(`# --- ${kode}. `));
  if (awal < 0) throw new Error(`rekaman: bagian ${kode} tidak ada`);
  const akhir = baris.findIndex((b, i) => i > awal && b.startsWith("# --- "));
  return baris.slice(awal, akhir < 0 ? undefined : akhir);
};
const bagianC4 = (teks: string, kode: string): string[] => {
  const baris = teks.split("\n");
  const awal = baris.findIndex((b) => b.startsWith(`== ${kode}. `));
  if (awal < 0) throw new Error(`rekaman c4: bagian ${kode} tidak ada`);
  const akhir = baris.findIndex((b, i) => i > awal && b.startsWith("== "));
  return baris.slice(awal, akhir < 0 ? undefined : akhir);
};
const cari = (baris: string[], pola: RegExp, nama: string): RegExpMatchArray => {
  const m = baris.map((b) => b.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const titik = (n: number): string => String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rp = (n: number): string => `${n < 0 ? "−" : ""}Rp${titik(n)}`;
const koma = (s: string): string => s.replace(".", ",");
const harus = (teks: string, kalimat: string): void => expect(teks, `tidak memuat: ${kalimat}`).toContain(kalimat);

const migrasiB3 = rekaman("b3-ledger/output/migrasi.txt");
const migrasiT2 = rekaman("api-t2/output/migrasi.txt");
const tanpaLock = rekaman("b3-race/output/ledger/ledger-tanpa-lock.txt");
const untukUpdate = rekaman("b3-race/output/ledger/ledger-for-update.txt");
const batasB3 = rekaman("b3-ledger/output/batas.txt");
const tanpaKey = rekaman("e3-idempotency/output/ledger/tanpa-key.txt");
const perNiat = rekaman("e3-idempotency/output/ledger/key-per-niat.txt");
const perPercobaan = rekaman("e3-idempotency/output/ledger/key-per-percobaan.txt");
const n1 = rekaman("b2-query/output/ledger/n1.txt");
const dataB2 = rekaman("b2-query/output/ledger/data.txt");
const pagination = rekaman("b2-query/output/ledger/pagination.txt");
const satuLangkah = rekaman("b4-skema/output/ledger/satu-langkah.txt");
const tigaRilis = rekaman("b4-skema/output/ledger/tiga-rilis.txt");
const lockTimeout = rekaman("b4-skema/output/ledger/lock-timeout.txt");
const m14 = rekaman("api-t2/output/m14.txt");
const rentan = rekaman("t2-pencairan/output/rentan.txt");
const benar = rekaman("t2-pencairan/output/benar.txt");
const c4 = rekaman("c4-ratelimit/output/login/ratelimit.txt");
const pengaman = rekaman("api-t2/output/pengaman.txt");
const tutupBuku = rekaman("api-t2/output/tutup-buku.txt");

describe("registry dan naskah: kalimat, kejadian, dan ADR", () => {
  test("halaman 2.32 terdaftar sebagai Konsep bagian 5 sesudah ADR 21 dan berblok Mulai, Coba, Paham, Putuskan, Kunci", () => {
    const h = per("t2-rekap");
    expect([h.nomor, h.tahap, h.jenis, h.bagian, h.ada, h.prasyarat]).toEqual(["2.32", 2, "konsep", 5, true, ["t2-adr-21"]]);
    expect(per("t2-adr-21").nomor).toBe("2.31");
    expect(daftarBlok(mdx).map((b) => [b.nama, b.buka])).toEqual([["Mulai", true], ["Coba", true], ["Paham", false], ["Putuskan", false], ["Kunci", false]]);
    expect(idBlok(mdx)).toHaveLength(5);
  });

  test("sepuluh kalimat di halaman sama dengan naskah bagian 5, berurutan, dan tiap kalimat tertaut ke M yang benar", () => {
    expect(kalimatNaskah).toHaveLength(10);
    expect(sepuluh.map((b) => b.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(sepuluh.map((b) => b.kalimat)).toEqual(kalimatNaskah);
    expect(sepuluh[0]!.ids[0]).toBe("t2-prd");
    expect(per("t2-prd").judul).toMatch(/^PRD v2/);
    for (let no = 2; no <= 10; no++) {
      const m = no + 7; // M9 sampai M17
      expect(sepuluh[no - 1]!.ids[0], `kalimat ${no} harus menaut M${m}`).toBe(idM(m));
      expect(sepuluh[no - 1]!.teks).toMatch(new RegExp(`Di \\[\\[${idM(m)}\\]\\]`));
    }
  });

  test("nomor ADR tiap kalimat sama dengan naskah bagian 4 dan dengan field adr halaman konsepnya di registry", () => {
    const harapan = (no: number): number => (no === 1 ? 6 : adrPerM.get(no + 7)!);
    expect([...adrPerM.entries()].sort((a, b) => a[0] - b[0])).toEqual([[9, 13], [10, 14], [11, 15], [12, 16], [13, 17], [14, 18], [15, 19], [16, 20], [17, 21]]);
    for (const b of sepuluh) {
      const a = harapan(b.no);
      expect(new Set(b.adr), `kalimat ${b.no} menyebut ADR ${[...new Set(b.adr)].join(", ")}`).toEqual(new Set([a]));
      expect(b.ids, `kalimat ${b.no} harus menaut halaman ADR ${a}`).toContain(idAdr(a));
    }
  });

  test("setiap rujukan [[ID]] di halaman ada di registry, dan tidak ada yang menuju jembatan 2.33", () => {
    const semua = idDalam(mdx).filter((x) => x !== "berikutnya" && x !== "Kartu");
    expect(semua.length).toBeGreaterThan(40);
    for (const id of semua) expect(HALAMAN.some((h) => h.id === id), `[[${id}]] tidak ada di registry`).toBe(true);
    expect(semua).not.toContain("t2-jembatan");
    expect(per("t2-jembatan").nomor).toBe("2.33");
    expect(mdx).not.toMatch(/pecah lebih dulu|notifikasi.{0,40}di dalam transaction|batas di memori.{0,60}server (jadi dua|kedua)/i);
  });

  test("halaman menyebut tiga puluh satu halaman dari 2.1 sampai 2.31, dan semuanya sudah ada", () => {
    const tahap2 = HALAMAN.filter((h) => h.tahap === 2 && /^2\.\d+$/.test(h.nomor ?? "") && Number(h.nomor!.slice(2)) <= 31);
    expect(tahap2).toHaveLength(31);
    expect(tahap2.every((h) => h.ada)).toBe(true);
    harus(mdx, "tersebar di tiga puluh satu halaman, dari [[t2-prd]] sampai [[t2-adr-21]]");
    expect(per("t2-prd").nomor).toBe("2.1");
  });

  test("Dipersempit di tiga kalimat (1, 4, 10), Batas di tujuh lainnya, dan Inti menyebut tiga", () => {
    const dipersempit = sepuluh.filter((b) => b.teks.includes("*Dipersempit:*")).map((b) => b.no);
    const batas = sepuluh.filter((b) => b.teks.includes("*Batas:*")).map((b) => b.no);
    expect(dipersempit).toEqual([1, 4, 10]);
    expect(batas).toEqual([2, 3, 5, 6, 7, 8, 9]);
    expect(mdx.match(/\*Dipersempit:\*/g)).toHaveLength(3);
    harus(blok("Mulai"), "Tiga dari sepuluh kalimat naskah lebih luas daripada yang direkam lab");
    expect(kartu.filter((c) => c.jawab.includes("Dipersempit:")).map((c) => c.id)).toEqual(["t2-rekap-k1", "t2-rekap-k4", "t2-rekap-k10"]);
  });
});

describe("tabel ADR di blok Putuskan", () => {
  const baris = blok("Putuskan").split("\n").filter((b) => /^\| (6, revisi|\d+) \|/.test(b));
  test("sepuluh baris: ADR 6 revisi dan 13 sampai 21, tiap baris menaut halaman ADR-nya dan M yang melahirkannya", () => {
    expect(baris).toHaveLength(10);
    expect(baris.map((b) => b.split("|")[1]!.trim())).toEqual(["6, revisi", "13", "14", "15", "16", "17", "18", "19", "20", "21"]);
    for (const b of baris) {
      const kolom = b.split("|").map((x) => x.trim());
      const a = Number(kolom[1]!.replace(", revisi", ""));
      const id = idDalam(kolom[3]!)[0]!;
      expect(id, `ADR ${a} harus menaut ${idAdr(a)}`).toBe(idAdr(a));
      if (a === 6) expect(kolom[3]).toMatch(/^PRD v2, /);
      else expect(kolom[3]).toMatch(new RegExp(`^M${[...adrPerM.entries()].find(([, v]) => v === a)![0]}, `));
    }
  });

  test("tabel mencakup semua halaman Tahap 2 yang punya ADR di registry, masing-masing sekali", () => {
    const diRegistry = HALAMAN.filter((h) => h.tahap === 2 && h.adr).flatMap((h) => h.adr!.map((a) => [a, h.id] as const)).sort((x, y) => x[0] - y[0]);
    expect(diRegistry.map(([a]) => a)).toEqual([6, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
    const diTabel = baris.map((b) => idDalam(b)[0]!);
    expect(diTabel).toEqual(diRegistry.map(([, id]) => id));
  });

  test("keputusan ringkas cocok dengan halaman ADR-nya (kata kunci yang ditulis di tiap halaman)", () => {
    const wajib: [string, string[]][] = [
      ["t2-adr-ledger", ["Setiap perpindahan uang adalah satu jurnal", "tidak pernah di-UPDATE atau DELETE"]],
      ["t2-race-lock", ["ORDER BY id FOR UPDATE", "Isolation level tetap Read Committed"]],
      ["t2-idempotency", ["key (UUID versi 4) sekali per niat bayar", "dihapus oleh job pembersih"]],
      ["t2-index", ["posting_riwayat (buku_id, dibuat, id)", "ADR 15: satu query JOIN"]],
      ["t2-kursor", ["OFFSET hanya untuk laporan Keuangan", "kursor opaque dari `(dibuat, id)`"]],
      ["t2-skema-tanpa-downtime", ["Backfill per 1.000 akun", "lock_timeout = '3s'"]],
      ["t2-tim-infra", ["Setiap PR di-review satu orang selain penulisnya", "Force push mati di `main`"]],
      ["t2-job-rekonsiliasi", ["Satu batch per periode minggu ISO", "diberi nama akhir"]],
      ["t2-login-aman", ["argon2id", "wajib diganti saat login pertama"]],
      ["t2-adr-21", ["Cache, queue, Redis, dan server kedua tidak dipasang di Tahap 2"]],
    ];
    for (const [id, kata] of wajib) for (const k of kata) harus(fileHalaman(per(id)), k);
    for (const k of ["Ledger double-entry yang hanya ditambah", "ORDER BY id FOR UPDATE", "hasilnya disimpan 24 jam", "posting (buku_id, dibuat, id)", "OFFSET hanya untuk laporan Keuangan", "backfill per 1.000 akun", "lock_timeout` 3 detik", "main` yang dilindungi", "rekonsiliasi sebelum file diberi nama akhir", "password pertama wajib diganti", "belum dipasang, dengan pemicu yang bisa diukur"]) harus(blok("Putuskan"), k);
  });
});

describe("diagram Rantai t2-rekap-kejadian", () => {
  const d = DataRantai.parse(kejadian);
  const simpul = d.baris.flatMap((b) => b.simpul);
  test("sepuluh simpul: PRD v2 lalu M9 sampai M17 berurutan, sumber berlabel Ilustrasi", () => {
    expect(d.sumber.jenis).toBe("ilustrasi");
    expect(simpul).toHaveLength(10);
    expect(simpul[0]!.teks).toMatch(/^PRD v2/);
    simpul.slice(1).forEach((s, i) => expect(s.teks.startsWith(`M${i + 9} `), `simpul ${i + 2}: ${s.teks}`).toBe(true));
  });

  test("label minggu tiap baris dihitung dari minggu di halaman M dan ADR 6 (minggu 0)", () => {
    const minggu = (id: string): number => Number(fileHalaman(per(id)).match(/[Mm]inggu (\d+) Tahap 2/)![1]);
    const mingguPrd = Number(fileHalaman(per("t2-adr-ledger")).match(/diterima di minggu (\d+) Tahap 2/)![1]);
    const semua = [mingguPrd, ...Array.from({ length: 9 }, (_, i) => minggu(idM(i + 9)))];
    expect(semua).toEqual([0, 1, 2, 3, 3, 4, 5, 6, 7, 8]);
    const baris1 = semua.slice(0, 5);
    const baris2 = semua.slice(5);
    expect(d.baris[0]!.label).toBe(`Minggu ${Math.min(...baris1)}–${Math.max(...baris1)}`);
    expect(d.baris[1]!.label).toBe(`Minggu ${Math.min(...baris2)}–${Math.max(...baris2)}`);
  });

  test("angka dan kata di simpul cocok dengan rekaman: M15 Rp15.000 dan M13 migrasi", () => {
    const selisih = Number(cari(bagian(rentan, "D"), /Selisih file - ledger: Rp([\d.]+)\./, "selisih rentan D")[1]!.replace(/\./g, ""));
    expect(simpul.find((s) => s.teks.startsWith("M15 "))!.teks).toBe(`M15 ${rp(selisih)}`);
    expect(simpul.map((s) => s.teks.split(" ")[0])).toEqual(["PRD", "M9", "M10", "M11", "M12", "M13", "M14", "M15", "M16", "M17"]);
  });
});

describe("kartu tebak lalu buka t2-rekap-kartu.json", () => {
  test("sepuluh kartu berurutan dengan id unik, halaman ada di registry, judul dan url dari registry, dan file halamannya berblok", () => {
    expect(kartu).toHaveLength(10);
    expect(kartu.map((c) => c.id)).toEqual(Array.from({ length: 10 }, (_, i) => `t2-rekap-k${i + 1}`));
    kartu.forEach((c, i) => {
      const h = per(c.halaman);
      expect(c.judul, c.id).toBe(label(h));
      expect(c.url, c.id).toBe(urlHalaman(h));
      expect(idBlok(fileHalaman(h)).length, `${c.id}: ${c.url} harus halaman berblok`).toBeGreaterThan(0);
      // kartu 1 menaut halaman konsep ledger (tempat angka Rp250.000 dan Rp180.000), lainnya halaman M-nya.
      if (i === 0) expect(c.halaman).toBe("t2-saldo-bukan-kolom");
      else expect(c.halaman, c.id).toBe(idM(i + 8));
      expect(sepuluh[i]!.ids, `${c.id}: ${c.halaman} harus ada di kalimat ${i + 1}`).toContain(c.halaman);
    });
  });

  test("tiap jawaban diawali kalimat naskah (atau memuatnya dalam tanda kutip di kartu Dipersempit) dan menyebut ADR yang benar", () => {
    kartu.forEach((c, i) => {
      const b = sepuluh[i]!;
      if (c.jawab.includes("Dipersempit:") && i !== 0) harus(c.jawab, `Naskah: "${b.kalimat}."`);
      else expect(c.jawab.startsWith(b.kalimat), c.id).toBe(true);
      expect(new Set([...c.jawab.matchAll(/\bADR (\d+)/g)].map((m) => Number(m[1]))), c.id).toEqual(new Set([b.adr[0]]));
    });
  });

  test("tanya memuat kejadian dan angka yang sama dengan kalimat, dan semuanya berakhir 'Kalimat apa yang lahir?' kecuali Cek diri", () => {
    for (const c of kartu) expect(c.tanya, c.id).toMatch(/Kalimat apa yang lahir\?$/);
    const a = (i: number) => kartu[i]!.tanya;
    harus(a(0), `Rp${titik(Number(cari(bagian(migrasiB3, "B"), /Tiga tabel menjelaskan Rp([\d.]+),/, "migrasi B")[1]!.replace(/\./g, "")))}`);
    harus(a(1), "Rp100.000");
    harus(a(1), "Rp70.000");
    harus(a(1), "Rp50.000");
    harus(a(1), "−Rp20.000");
    harus(a(2), "Rp25.000");
    harus(a(3), "21 query untuk 20 baris");
    harus(a(4), "Rp5.000");
    harus(a(6), "Rp800.000");
    harus(a(6), "Rp500.000");
    harus(a(7), "13 baris Rp2.465.000");
    harus(a(7), "12 jurnal Rp2.450.000");
    harus(a(8), "29 akun");
    harus(a(9), "Rp0");
    harus(a(9), "±1,4 request per detik (Asumsi)");
  });

  test("Cek diri 2.32 ikut ke kartu.json hasil sinkron: lima soal dengan halaman t2-rekap", () => {
    const semua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string }[];
    const milik = semua.filter((c) => c.halaman === "t2-rekap");
    expect(milik.map((c) => c.id)).toEqual(["t2-rekap-1", "t2-rekap-2", "t2-rekap-3", "t2-rekap-4", "t2-rekap-5"]);
    for (const c of milik) expect([c.judul, c.url]).toEqual([label(per("t2-rekap")), "tahap-2/rekap/"]);
    expect(new Set([...kartu.map((c) => c.id), ...semua.map((c) => c.id)]).size).toBe(kartu.length + semua.length);
  });
});

describe("angka di sepuluh kalimat dan jawabannya dari rekaman", () => {
  test("kalimat 1: tiga tabel Rp250.000 lawan kolom Rp180.000 (b3-ledger bagian B), cache selisih Rp5.000 (api-t2 bagian E)", () => {
    const m = cari(bagian(migrasiB3, "B"), /Tiga tabel menjelaskan Rp([\d.]+), kolom saldo menulis Rp([\d.]+)\./, "migrasi B");
    harus(sepuluh[0]!.teks, `memberi Rp${m[1]}, sedangkan kolom saldonya menulis Rp${m[2]}`);
    const e = bagian(migrasiT2, "E").join("\n");
    const selisih = Number(e.match(/selisih (\d+)/)![1]);
    expect(e).toContain("1 tidak cocok");
    expect(e).toContain("0 tidak cocok");
    harus(sepuluh[0]!.teks, `menemukan selisih ${rp(selisih)}`);
    harus(sepuluh[0]!.teks, "memerankan kode yang menulis cache tanpa posting");
  });

  test("kalimat 2: −Rp20.000 tanpa lock, Rp30.000 dan saldo kurang dengan FOR UPDATE, 50 percobaan di batas.txt bagian 2b", () => {
    const tanpa = Number(cari(tanpaLock.split("\n"), /^-- saldo Budi \(jumlah posting\) (-?\d+); saldo_cache (\d+); jurnal transfer (\d+)/, "akhir tanpa lock")[1]);
    const untuk = Number(cari(untukUpdate.split("\n"), /^-- saldo Budi \(jumlah posting\) (-?\d+); saldo_cache (\d+); jurnal transfer (\d+)/, "akhir for update")[1]);
    expect(tanpa).toBe(-20000);
    expect(untuk).toBe(30000);
    const awal = Number(cari(untukUpdate.split("\n"), /^-- Saldo Budi (\d+)\. A \(HP\) transfer (\d+) ke Citra, B \(tablet\) transfer (\d+)/, "kepala")[1]);
    const a = Number(cari(untukUpdate.split("\n"), /transfer (\d+) ke Citra/, "A")[1]);
    const b = Number(cari(untukUpdate.split("\n"), /transfer (\d+) ke Dimas/, "B")[1]);
    expect([awal, a, b]).toEqual([100000, 70000, 50000]);
    harus(sepuluh[1]!.teks, `mengirim ${rp(a)} dari HP dan ${rp(b)} dari tablet, dari saldo ${rp(awal)}`);
    harus(sepuluh[1]!.teks, `saldonya ${rp(tanpa)}`);
    harus(sepuluh[1]!.teks, `membaca ${rp(untuk)}, dan ditolak karena saldo kurang`);
    expect(untukUpdate).toContain("saldo kurang, transfer ditolak");
    const b2 = bagian(batasB3, "2b").join("\n");
    expect(b2).toContain("50 kali");
    expect(b2).toContain("muncul");
    harus(sepuluh[1]!.teks, "dalam 50 percobaan");
    expect(tanpaLock).toContain("SET CONSTRAINTS ALL IMMEDIATE");
    harus(sepuluh[1]!.teks, "SET CONSTRAINTS ALL IMMEDIATE");
  });

  test("kalimat 3: Rp25.000, saldo Rp50.000 tanpa key, Rp75.000 dengan key per niat, dua jurnal dengan key per percobaan", () => {
    expect(tanpaKey).toContain('{"ke":418,"jumlah":25000}');
    const sisaTanpa = Number(cari(tanpaKey.split("\n"), /^app {2}percobaan 2 {2}tanpa Idempotency-Key {2}→ 201 \{"id":3,"saldo":(\d+)\}/, "tanpa key")[1]);
    const sisaNiat = Number(cari(perNiat.split("\n"), /^app {2}percobaan 2 {2}Idempotency-Key: .* {2}→ 201 \{"id":2,"saldo":(\d+)\}/, "per niat")[1]);
    const sisaPercobaan = Number(cari(perPercobaan.split("\n"), /^app {2}percobaan 2 {2}Idempotency-Key: .* {2}→ 201 \{"id":3,"saldo":(\d+)\}/, "per percobaan")[1]);
    expect([sisaTanpa, sisaNiat, sisaPercobaan]).toEqual([50000, 75000, 50000]);
    harus(sepuluh[2]!.teks, `jurnal kedua: saldo Budi ${rp(sisaTanpa)}`);
    harus(sepuluh[2]!.teks, `saldonya ${rp(sisaNiat)}`);
    harus(sepuluh[2]!.teks, "Key baru di setiap retry tetap menulis dua jurnal");
    harus(sepuluh[2]!.teks, "Bayar Rp25.000 hilang");
  });

  test("kalimat 4: 21 dan 3.893 query, 30,5 ms lawan 1,4 ms, 760.448 posting", () => {
    const d = bagian(n1, "D");
    const hal1 = cari(d, /Riwayat Budi hal\. 1 +\| N\+1 +\| +(\d+) \| +(\d+) \|/, "hal. 1 N+1");
    const seluruh = cari(d, /Seluruh riwayat Budi \| N\+1 +\| +(\d+) \| +(\d+) \|/, "seluruh N+1");
    expect([hal1[1], hal1[2], seluruh[1], seluruh[2]]).toEqual(["20", "21", "3892", "3893"]);
    harus(sepuluh[3]!.teks, `menghitung ${hal1[2]} query untuk ${hal1[1]} baris, dan ${titik(Number(seluruh[2]))} query untuk seluruh riwayat Budi yang berisi ${titik(Number(seluruh[1]))} baris`);
    const e = bagian(n1, "E");
    const n1Tanpa = cari(e, /Riwayat Budi hal\. 1 +\| N\+1 +\| +([\d.]+) ms/, "waktu N+1")[1]!;
    const joinIndex = cari(e, /Riwayat Budi hal\. 1 +\| JOIN +\| +[\d.]+ ms +\| +([\d.]+) ms/, "waktu JOIN dengan index")[1]!;
    expect([n1Tanpa, joinIndex]).toEqual(["30.5", "1.4"]);
    harus(sepuluh[3]!.teks, `${koma(n1Tanpa)} ms (N+1, tanpa index) ke ${koma(joinIndex)} ms (satu query JOIN dengan index)`);
    expect(n1).toContain("tanpa jaringan antara server API dan database");
    const total = cari(dataB2.split("\n"), /^ total +\| +(\d+) \| +(\d+)$/, "total data")[2]!;
    harus(sepuluh[3]!.teks, `${titik(Number(total))} posting`);
  });

  test("kalimat 5: OFFSET 205 halaman, 204 baris ganda, 204 kiriman tidak tampil; kursor 0 dan 0", () => {
    const c = bagian(pagination, "C");
    const off = cari(c, /^ OFFSET \| +(\d+) \| +(\d+) \| +(\d+) \| +(\d+) \| +(\d+) \| +(\d+)/, "OFFSET");
    const kur = cari(c, /^ kursor \| +(\d+) \| +(\d+) \| +(\d+) \| +(\d+) \| +(\d+) \| +(\d+)/, "kursor");
    expect([off[1], off[3], off[6]]).toEqual(["205", "204", "204"]);
    expect([kur[3], kur[6]]).toEqual(["0", "0"]);
    harus(sepuluh[4]!.teks, `${off[1]} halaman menghasilkan ${off[3]} baris ganda dan ${off[6]} kiriman yang tidak tampil. Dengan kursor, keduanya ${kur[3]}`);
  });

  test("kalimat 6: galat 42703, 1.012 akun, lima titik uji untuk app 1.0 dan 1.1, 55P03 sesudah 3 detik, riwayat 17 lalu 3 baris", () => {
    expect(satuLangkah).toContain("ERROR 42703 undefined_column");
    expect(satuLangkah).toContain("server v1 menjawab 500");
    harus(sepuluh[5]!.teks, "galat 42703");
    const akun = cari(tigaRilis.split("\n"), /^ (\d+) \| 0 +\| 0$/, "cek malam: akun tanpa buku dan berbeda")[1]!;
    harus(sepuluh[5]!.teks, `${titik(Number(akun))} akun pindah`);
    for (const app of ["1.0", "1.1"]) expect(tigaRilis.split("\n").filter((b) => new RegExp(`^rilis \\d \\(.+\\) +app ${app.replace(".", "\\.")} \\(Karyawan \\d+\\) bayar COMMIT`).test(b)), `app ${app}`).toHaveLength(5);
    harus(sepuluh[5]!.teks, "kelima titik uji");
    const baris420 = tigaRilis.split("\n").filter((b) => /app 1\.0 layar riwayat: (\d+) baris/.test(b));
    expect(baris420.map((b) => Number(b.match(/riwayat: (\d+) baris/)![1]))).toEqual([16, 17, 3, 4, 5]);
    harus(sepuluh[5]!.teks, "Karyawan 420 turun dari 17 baris menjadi 3 baris");
    expect(tigaRilis).toMatch(/Karyawan 420\) bayar COMMIT · nomor 15\.006/);
    expect(lockTimeout).toContain("SET LOCAL lock_timeout = '3s'");
    expect(lockTimeout).toContain("ERROR 55P03 lock_not_available");
    expect(lockTimeout).toContain("-> ROLLBACK");
    harus(sepuluh[5]!.teks, "lebih dari 3 detik menyerah dengan galat 55P03 dan di-ROLLBACK");
    harus(sepuluh[5]!.teks, "paling sedikit 5 detik");
    harus(fileHalaman(per("t2-m13")), "Lab menahan laporan paling sedikit 5 detik");
  });

  test("kalimat 7: kiriman Rp800.000 dijawab 201 dengan sisa batas −300000, 8 lolos 0 gagal 12 dilewati, dua tes gagal dengan PostgreSQL", () => {
    const d = bagian(m14, "D").join("\n");
    expect(d).toContain("HTTP/1.1 201 Created");
    expect(d).toContain('"sisa_batas_harian":-300000');
    expect(d).toContain('"nominal": 800000');
    harus(sepuluh[6]!.teks, "menjawab 201 untuk kiriman Rp800.000");
    harus(sepuluh[6]!.teks, "`sisa_batas_harian` −300000");
    const c = bagian(m14, "C").join("\n");
    expect(c).toContain("exit status 0: 8 lolos, 0 gagal, 12 dilewati");
    expect(c).toContain("exit status 1: 18 lolos, 2 gagal, 0 dilewati");
    expect(c.match(/^--- FAIL: /gm)).toHaveLength(2);
    harus(sepuluh[6]!.teks, "Dengan PostgreSQL, dua tes gagal");
    harus(sepuluh[6]!.teks, "8 lolos, 0 gagal, 12 dilewati");
    harus(sepuluh[6]!.teks, "dua cabang yang masing-masing menghapus tiga baris");
    expect(bagian(m14, "A").join("\n")).toContain("File contoh 30 baris di folder sementara");
    harus(sepuluh[6]!.teks, "file contoh 30 baris");
    harus(fileHalaman(per("t2-m14")), "file contoh 30 baris");
    harus(fileHalaman(per("t2-tim-infra")), "seluruh workflow di GitHub");
  });

  test("kalimat 8: 13 baris Rp2.465.000 lawan 12 jurnal Rp2.450.000, selisih Rp15.000, lalu Rp0, Warung 508 yang ketujuh", () => {
    const d = bagian(rentan, "D");
    const r = cari(d, /^ +(\d+) \| +(\d+) \| +(\d+) \| +(\d+)$/, "total file lawan ledger");
    expect([r[1], r[3]]).toEqual(["13", "12"]);
    const selisih = Number(cari(d, /Selisih file - ledger: Rp([\d.]+)\./, "selisih D")[1]!.replace(/\./g, ""));
    expect(Number(r[2]) - Number(r[4])).toBe(selisih);
    harus(sepuluh[7]!.teks, `${r[1]} baris ${rp(Number(r[2]))} dan ledger ${r[3]} jurnal ${rp(Number(r[4]))}, selisih ${rp(selisih)}`);
    expect(bagian(benar, "C").join("\n")).toContain("Selisih file - ledger: Rp0.");
    harus(sepuluh[7]!.teks, "selisihnya Rp0 di titik mati yang sama");
    expect(bagian(rentan, "B").join("\n")).toContain("baris file 7 ditulis: Warung 508 Rp15.000");
    expect(bagian(benar, "B").join("\n")).toContain("baris ketujuh");
    harus(sepuluh[7]!.teks, "baris Warung 508 ditulis ke file");
    harus(sepuluh[7]!.teks, "di warung ketujuh");
    harus(fileHalaman(per("t2-m15")), "SIGKILL");
    harus(fileHalaman(per("t2-m15")), "PRD v2 belum punya integrasi bank");
  });

  test("kalimat 9: 29 akun, 29 tebakan sampai, satu terbuka, nol terkunci, lalu 10 diperiksa dan 19 ditolak 429, login 403", () => {
    const c = bagianC4(c4, "C");
    const s = cari(c, /^ {2}(\d+) akun disemprot dari [\d.]+ → 200: (\d+) · 401: (\d+)$/, "penyemprotan C");
    expect(Number(s[2]) + Number(s[3])).toBe(Number(s[1]));
    expect([s[1], s[2]]).toEqual(["29", "1"]);
    const terkunci = cari(c, /akun yang terkunci oleh serangan ini: (\d+)/, "terkunci")[1];
    expect(terkunci).toBe("0");
    harus(sepuluh[8]!.teks, `${s[1]} tebakan sampai ke pemeriksaan password, satu akun terbuka, nol akun terkunci`);
    harus(sepuluh[8]!.teks, "ke masing-masing dari 29 akun");
    const dd = cari(bagianC4(c4, "D"), /^ {2}(\d+) akun disemprot dari [\d.]+ → 401: (\d+) · 429: (\d+)$/, "penyemprotan D");
    expect([dd[1], dd[2], dd[3]]).toEqual(["29", "10", "19"]);
    harus(sepuluh[8]!.teks, `${dd[2]} tebakan diperiksa dan ${dd[3]} ditolak 429`);
    const b = bagian(pengaman, "B").join("\n");
    expect(b).toContain('"password": "sementara-419"');
    expect(b).toContain("HTTP/1.1 403 Forbidden");
    harus(sepuluh[8]!.teks, "dijawab 403 sampai password diganti");
    harus(sepuluh[8]!.teks, "`sementara-<id>`");
    harus(fileHalaman(per("t2-m16")), "203.0.113.9");
    harus(fileHalaman(per("t2-login-aman")), "Ia masih memakai bcrypt, dan belum punya daftar password bocor");
    harus(fileHalaman(per("t2-login-aman")), "pengambilalihannya tidak dijalankan");
  });

  test("kalimat 10: 1.016 buku cocok, 1.122 lalu 1.123 jurnal dengan buku tidak cocok 0, puncak ±1,4 (Asumsi)", () => {
    const a = bagian(tutupBuku, "A").join("\n");
    const buku = a.match(/buku: (\d+), .* tidak cocok: (\d+)/)!;
    expect([buku[1], buku[2]]).toEqual(["1016", "0"]);
    harus(sepuluh[9]!.teks, `Laporan atas ${titik(Number(buku[1]))} buku semuanya cocok`);
    const c = bagian(tutupBuku, "C").join("\n");
    expect(c).toContain("jurnal: 1123 (laporan menghitung 1122)");
    expect(c.match(/tidak cocok: 0/g)!.length).toBeGreaterThanOrEqual(2);
    expect(c).toContain('"jurnal": 1122');
    expect(c).toContain('"jurnal": 1123');
    harus(sepuluh[9]!.teks, "menghitung 1.123 jurnal, bukan 1.122");
    const a2 = cerita.tahap[1]!.asumsi as { user: number; aktif: number; req: number; puncak: number };
    const puncak = ((a2.user * a2.aktif) / 100) * a2.req / 86_400 * a2.puncak;
    expect(koma(puncak.toFixed(1))).toBe("1,4");
    harus(sepuluh[9]!.teks, `±${koma(puncak.toFixed(1))} request per detik adalah Asumsi`);
    harus(blok("Kunci"), `puncak ±${koma(puncak.toFixed(1))} request per detik (Asumsi)`);
  });

  test("tidak ada angka lain di sepuluh kalimat: setiap angka tertulis punya bukti di daftar izin", () => {
    let s = sepuluh.map((b) => b.teks).join("\n");
    s = s.replace(/^ *\d+\. /gm, "").replace(TOKEN, "").replace(/`[^`]*`/g, "");
    s = s.replace(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+/g, "").replace(/\bADR \d+/g, "").replace(/\bM\d+\b/g, "").replace(/\bv\d\b/g, "").replace(/\b\d+[A-Z]\d+\b/g, "");
    s = s.replace(/Rp(?=[\d])/g, "Rp ");
    const token = [...s.matchAll(/(?<![\w.])[−-]?\d[\d.,]*\d|(?<![\w.])\d/g)].map((m) => m[0]);
    const izin = new Set([
      // Rupiah dan jumlah dari rekaman (diperiksa di tes per kalimat di atas)
      "250.000", "180.000", "5.000", "70.000", "50.000", "100.000", "−20.000", "30.000", "25.000", "75.000", "800.000", "−300000", "20.000", "2.465.000", "2.450.000", "15.000", "0",
      // hitungan dari rekaman
      "13", "12", "21", "20", "3.893", "3.892", "30,5", "1,4", "760.448", "204", "205", "1.012", "17", "3", "420", "508", "29", "10", "19", "1.016", "1.122", "1.123", "8",
      // status code dan galat
      "201", "403", "429", "500", "42703",
      // versi app, lama menunggu, dan angka naskah yang dinyatakan tidak terulang
      "1.0", "1.1", "40", "4", "5", "30", "50",
      // angka kecil yang dieja sebagai bilangan biasa: "satu", "dua" ditulis kata, tetapi "2", "1", "7", "6", "9" muncul di nama bagian atau urutan
      "1", "2", "6", "7", "9",
    ]);
    const asing = token.filter((t) => !izin.has(t));
    expect(asing, `angka tanpa bukti: ${[...new Set(asing)].join(", ")}`).toEqual([]);
  });
});

describe("daftar periksa kode AI dan jawaban Cek diri dari halaman sumbernya", () => {
  const kunci = blok("Kunci");
  const butir = kunci.split("\n").filter((b) => b.startsWith("- [ ] "));
  test("sepuluh butir, masing-masing kutipan persis dari checklist halaman yang ditaut, satu butir per kalimat", () => {
    expect(butir).toHaveLength(10);
    const urut = ["t2-adr-ledger", "t2-race-lock", "t2-idempotency", "t2-index", "t2-kursor", "t2-skema-tanpa-downtime", "t2-tim-infra", "t2-job-rekonsiliasi", "t2-login-aman", "t2-estimasi"];
    expect(butir.map((b) => idDalam(b)[0])).toEqual(urut);
    const sumberKalimat = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => sepuluh[n - 1]!.ids);
    urut.forEach((id, i) => expect(sumberKalimat[i], `butir ${i + 1} harus berasal dari halaman yang ada di kalimat ${i + 1}`).toContain(id));
    for (const [i, b] of butir.entries()) {
      const id = urut[i]!;
      const teks = b.replace(/^- \[ \] /, "").replace(/ \(\[\[.*\]\]\)\.$/, "");
      if (id === "t2-login-aman") continue; // butir 9 ditulis ulang dari aturan 5 ADR 20, diperiksa di tes berikutnya
      harus(fileHalaman(per(id)).replace(/ /g, " "), teks.replace(/\.$/, ""));
    }
  });

  test("butir 9 sesuai aturan 5 ADR 20: /ganti-password memakai pagar yang sama dengan /login", () => {
    harus(fileHalaman(per("t2-login-aman")), "`/ganti-password` memakai pagar yang sama dengan `/login`");
    harus(butir[8]!, "Endpoint yang memeriksa password, termasuk ganti password, memakai pagar yang sama dengan login");
  });

  test("jawaban Cek diri merujuk angka dan nomor ADR yang ada di halaman sumbernya", () => {
    const j = blok("Kunci");
    harus(j, "ADR 13, yang berlaku juga untuk jurnal pembalik");
    harus(fileHalaman(per("t2-race-lock")), "bayar, transfer, jurnal pembalik, dan pencairan Jumat");
    harus(fileHalaman(per("t2-race-lock")), "koreksi massal oleh admin");
    harus(fileHalaman(per("t2-idempotency")), "Keputusan ini juga salah untuk jalur uang yang tidak dimulai app, seperti pencairan Jumat");
    harus(fileHalaman(per("t2-job-rekonsiliasi")), "Satu batch per periode minggu ISO. `periode` unik di database");
    harus(fileHalaman(per("t2-job-rekonsiliasi")), "Status maju dari `dibuat` ke `dijurnal` ke `dikirim`");
    harus(fileHalaman(per("t2-index")), "masih membaca 3.892 posting Budi");
    harus(j, "membaca 3.892 posting Budi");
    harus(fileHalaman(per("t2-kursor")), "Celah COMMIT belakangan diterima terbuka");
    harus(fileHalaman(per("t2-skema-tanpa-downtime")), "Rilis 1 hanya menambah");
    harus(fileHalaman(per("t2-skema-tanpa-downtime")), "Rilis 2 dimulai dari server yang menulis ke dua tempat");
    harus(fileHalaman(per("t2-skema-tanpa-downtime")), "Field `jumlah` dan `nominal` di response tetap ada selama app 1.0 dan 1.1 beredar");
    harus(fileHalaman(per("t2-adr-21")), "Sebelum fitur PRD v3 pertama yang menambah λ atau W ditulis, satu load test");
    harus(j, "jadwalkan satu load test sebelum fitur PRD v3 pertama (ADR 21)");
  });
});

describe("klaim 'belum ada' dipindai dari isi lab (lingkup: api-t2 dan sepuluh lab Tahap 2)", () => {
  const EKSTENSI = /\.(go|py|sh|js|mjs|ts|yml|yaml|sql|json|md|toml|mod|sum|html|conf|cfg|ini|dart)$|(^|\/)(Makefile|Dockerfile[^/]*)$/;
  const LEWATI = new Set(["node_modules", ".venv", ".git", "output", "vendor"]);
  const LAB = ["api-t2", "b3-ledger", "b3-race", "b3-isolasi", "t2-pencairan", "e3-idempotency", "b2-query", "b4-skema", "c4-ratelimit", "e5-payload"];
  const jalan = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      if (LEWATI.has(e.name)) return [];
      const p = path.join(dir, e.name);
      return e.isDirectory() ? jalan(p) : EKSTENSI.test(p) ? [p] : [];
    });
  const berkas = LAB.flatMap((l) => jalan(path.join(akar, "labs", l)));
  const rel = (f: string): string => path.relative(akar, f);
  const api = berkas.filter((f) => f.includes(`${path.sep}api-t2${path.sep}`));
  const isi = (f: string): string => fs.readFileSync(f, "utf8");

  test("api-t2 tidak membaca header Idempotency-Key: tidak satu pun file Go menyebutnya atau tabel kunci_idempotensi", () => {
    expect(api.length).toBeGreaterThan(20);
    const go = api.filter((f) => f.endsWith(".go"));
    expect(go.length).toBeGreaterThan(10);
    expect(go.filter((f) => /kunci_idempotensi|idempotency-key/i.test(isi(f))).map(rel)).toEqual([]);
    // Tabelnya dibuat migrasi dan diberi hak di run.py, tetapi tidak dipakai kode server.
    expect(api.filter((f) => /kunci_idempotensi/.test(isi(f))).map(rel).sort()).toEqual(["labs/api-t2/migrasi/000011_ledger_pendukung.up.sql", "labs/api-t2/run.py"]);
    harus(sepuluh[2]!.teks, "`labs/api-t2` belum membaca header `Idempotency-Key`");
  });

  test("api-t2 memakai bcrypt dan tidak memakai argon2; lab c4 memakai argon2id", () => {
    const hash = api.filter((f) => f.endsWith(".go") || f.endsWith("go.mod"));
    expect(hash.filter((f) => /argon2/i.test(isi(f))).map(rel)).toEqual([]);
    expect(hash.filter((f) => /bcrypt/.test(isi(f))).length).toBeGreaterThan(1);
    expect(isi(path.join(akar, "labs/c4-ratelimit/login/main.go"))).toMatch(/argon2/);
    harus(sepuluh[8]!.teks, "`labs/api-t2` masih memakai bcrypt, bukan argon2id seperti lab c4");
  });

  test("password sementara api-t2 berpola sementara-<id>, dan tidak ada jalur lupa password", () => {
    expect(isi(path.join(akar, "labs/api-t2/cmd/api/main.go"))).toContain('"sementara-%d"');
    const rute = api.filter((f) => f.endsWith(".go") && !f.endsWith("_test.go")).map(isi).join("\n");
    expect(rute).not.toMatch(/lupa[-_ ]?password/i);
    harus(sepuluh[8]!.teks, "jalur lupa password belum ada");
  });

  test("sepuluh lab Tahap 2 tidak memuat perkakas load test", () => {
    const PERKAKAS = /\b(k6|vegeta|wrk|locust|gatling|jmeter|autocannon|oha|bombardier)\b|load.?test/i;
    expect(berkas.filter((f) => PERKAKAS.test(isi(f))).map(rel)).toEqual([]);
    harus(mdx, "kapasitas satu server belum pernah diukur");
    harus(fileHalaman(per("t2-m17")), "Lab Tahap 2 tidak punya perkakas load test");
  });

  test("api-t2 belum dijalankan dengan dua server: rekaman sembilan lab Tahap 2 lain tidak menulis dua instance, dua server, atau dua proses server", () => {
    const walk = (d: string): string[] => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".txt") ? [path.join(d, e.name)] : [])) : []);
    const POLA = /dua instance|dua server|dua proses server/i;
    const kena = LAB.flatMap((l) => walk(path.join(akar, "labs", l, "output"))).filter((f) => POLA.test(isi(f))).map(rel).sort();
    expect(kena.every((f) => f.startsWith("labs/c4-ratelimit/"))).toBe(true);
    expect(kena.length).toBeGreaterThan(0);
    expect(tutupBuku).toContain("# server: ./api-t2");
    harus(sepuluh[9]!.teks, "api-t2 belum pernah dijalankan dengan dua server");
    harus(fileHalaman(per("t2-m17")), "api-t2 sendiri belum pernah dijalankan dengan dua server");
  });

  test("klaim negatif tidak kehilangan kata 'tidak' atau 'belum' di halaman", () => {
    expect(mdx).not.toMatch(/(?<!tidak )(punya|memuat) perkakas load test/);
    harus(mdx, "Branch protection dan workflow CI di GitHub");
    harus(mdx, "belum direkam");
    harus(mdx, "belum diukur");
    harus(mdx, "tidak dijalankan di lab");
    harus(mdx, "Skenario migrasi malam hari tidak dijalankan");
  });
});

// Penjaga tambahan peninjau (keputusan 778): lima mutasi yang lolos penjaga pelaksana (satu kata bilangan di Inti, satu angka di
// tiga halaman konsep tanpa kalimat, satu ID sumber ingatan, nomor ADR 6) dan kesepakatan kartu dengan halaman.
describe("hitungan, halaman konsep tanpa kalimat, sumber ingatan, dan nomor ADR 6", () => {
  const KATA: Record<number, string> = { 5: "lima", 8: "delapan", 9: "sembilan", 10: "sepuluh" };
  const risetT2 = baca("plan/RISET-TAHAP-2.md");

  test("hitungan masalah: sembilan dari M9 sampai M17 di Inti, delapan sebelum PRD v3 (M9 sampai M16) di kalimat 10 dan di 2.29", () => {
    const m = [...adrPerM.keys()].sort((a, b) => a - b);
    expect([m[0], m[m.length - 1], m.length]).toEqual([9, 17, 9]);
    harus(blok("Mulai"), `${KATA[m.length]!} dari masalah M${m[0]} sampai M${m[m.length - 1]}`);
    const sebelum = m.filter((n) => n <= 16);
    harus(sepuluh[9]!.teks, `${KATA[sebelum.length]!} masalah sebelum PRD v3 (M${sebelum[0]} sampai M${sebelum[sebelum.length - 1]})`);
    const m17 = fileHalaman(per("t2-m17"));
    harus(m17, `Sebelum PRD v3, Tahap 2 sudah punya ${KATA[sebelum.length]!} masalah`);
    const tabel = m17.slice(m17.indexOf("**Delapan masalah, bukan satu kapasitas.**"), m17.indexOf("Tidak satu pun penyebabnya"));
    expect(idDalam(tabel).filter((id) => /^t2-m\d+$/.test(id))).toEqual(sebelum.map(idM));
  });

  test("tiga halaman konsep tanpa kalimat: kata dan angka cocok dengan deskripsi halamannya dan rekaman", () => {
    const bagian3 = mdx.slice(mdx.indexOf("### Tiga halaman konsep"), mdx.indexOf("### Yang belum diuji"));
    expect(idDalam(bagian3)).toEqual(["t2-skema", "t2-isolation-level", "t2-payload"]);
    // skema: lima tabel Tahap 1, delapan tabel Tahap 2 (daftar tabel di akhir tiga-rilis.txt)
    harus(fileHalaman(per("t2-skema")), "Lima tabel Tahap 1 menjadi delapan tabel Tahap 2");
    harus(bagian3, "lima tabel Tahap 1 menjadi delapan tabel Tahap 2, dengan ukuran database diperkirakan sampai Tahap 6");
    const akhir = cari(rekaman("b4-skema/output/ledger/tiga-rilis.txt").split("\n"), /Skema akhir sama dengan api-t2 \((\d+) tabel\): (.+)$/, "daftar tabel");
    expect(Number(akhir[1])).toBe(8);
    expect(akhir[2]!.split(", ")).toHaveLength(8);
    // payload: paket 1 GB, 20 buka per hari, Asumsi
    harus(fileHalaman(per("t2-payload")), "Pada paket 1 GB dan 20 buka per hari (Asumsi), kuota belum jadi masalah.");
    harus(bagian3, "pada paket 1 GB dan 20 buka per hari (Asumsi), kuota belum jadi masalah");
    // isolation level: setiap unsur ada di deskripsi 2.12 dan di rekap
    const deskripsi = fileHalaman(per("t2-isolation-level"));
    for (const unsur of ["satu snapshot", "lock", "Serializable dengan retry", "bukan Repeatable Read"]) {
      harus(deskripsi, unsur);
      harus(bagian3, unsur);
    }
  });

  test("sumber ingatan: tautan PubMed di halaman dan R2-215 memakai PMID yang sama (Roediger & Karpicke 16507066, Cepeda dkk. 16719566)", () => {
    expect(mdx.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)\//g)).toEqual([
      "pubmed.ncbi.nlm.nih.gov/16507066/", "pubmed.ncbi.nlm.nih.gov/16507066/", "pubmed.ncbi.nlm.nih.gov/16719566/",
    ]);
    const baris = risetT2.split("\n").find((b) => b.startsWith("| R2-215 |"));
    expect(baris, "R2-215 harus ada").toBeDefined();
    harus(baris!, "PMID 16507066");
    harus(baris!, "PMID 16719566");
    harus(mdx, "Roediger & Karpicke 2006, Psychological Science 17(3)");
    harus(mdx, "Cepeda dkk. 2006, Psychological Bulletin 132(3)");
    expect(baris!.split("|").length - 2, "R2-215 harus tepat 5 kolom").toBe(5);
  });

  test("ADR 6 tetap bernomor 6: revisi di 2.8, nomor 12 milik 1.40, naskah menulis ADR 12", () => {
    harus(blok("Putuskan"), "ADR 6 tetap bernomor 6 karena nomor 12 sudah dipakai [[t1-adr-12]], padahal naskah menulis ADR 12 untuk revisi ini.");
    expect(per("t1-adr-12").adr).toEqual([12]);
    expect(per("t2-adr-ledger").adr).toEqual([6]);
    harus(fileHalaman(per("t2-adr-ledger")), 'Naskah menulis "ADR 12"');
    harus(blok("Putuskan"), "| 6, revisi |");
    expect(blok("Putuskan")).not.toMatch(/ADR 6[^|\n]{0,40}(diganti|digantikan|dibatalkan)/);
  });

  test("kartu Dipersempit (1, 4, 10): versi yang didukung rekaman di kartu sama dengan yang ditulis halaman, tanpa klaim naskah yang bukan rekaman", () => {
    const versi = (teks: string): string => teks.match(/Versi yang didukung rekaman: ([^]+?)(?: \(ADR \d+[^)]*\))?\.?(?:\s|$)/)![1]!.replace(/\.$/, "");
    for (const no of [1, 4, 10]) {
      const dariKartu = versi(kartu[no - 1]!.jawab);
      const dariHalaman = versi(sepuluh[no - 1]!.teks);
      // kartu boleh menambah penjelasan di ujung (kartu 1: "job malam"), tetapi unsur utamanya harus sama
      expect(dariKartu.split(",")[0], `kartu ${no}`).toBe(dariHalaman.split(",")[0]);
    }
    expect(kartu[9]!.jawab).not.toMatch(/Versi yang didukung rekaman:[^]*(disebabkan|kehabisan)/);
    harus(kartu[9]!.jawab, "belum ada angka yang menyuruh membeli server hari ini");
  });

  test("kartu 6 dan 9 membawa batas yang mengubah apa yang dilakukan pembaca: harga rilis kedua dan password sementara berpola", () => {
    harus(kartu[5]!.jawab, "Batas: rilis kedua punya harga, riwayat app 1.0 untuk Karyawan 420 turun dari 17 baris menjadi 3 baris.");
    harus(sepuluh[5]!.teks, "turun dari 17 baris menjadi 3 baris");
    harus(kartu[8]!.jawab, "Batas: password sementara api-t2 berpola sementara-<id>, jadi orang yang mengenal pola itu bisa mengganti password akun lain mendahului pemiliknya");
    harus(sepuluh[8]!.teks, "berpola `sementara-<id>`");
    harus(blok("Coba"), "beserta batas masing-masing");
  });
});
