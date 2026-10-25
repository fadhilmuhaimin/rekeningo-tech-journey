// Penjaga angka halaman 2.29 (keputusan 760): angka yang ditulis tangan di halaman MDX, di diagram Rantai
// t2-m17-diuji.json, dan klaim "tidak ada perkakas load test" harus bisa diturunkan dari rekaman api-t2 dan b3-ledger,
// registry cerita.json, dan isi lab. logika.test.ts hanya menjaga angka yang dibaca widget; tanpa tes ini, mengubah satu
// angka di MDX atau di diagram tidak menggagalkan build, tes, atau alat ukur mana pun.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { bacaRekaman, bil, rp } from "./logika";
import diuji from "../../../data/diagram/t2-m17-diuji.json";
import cerita from "../../../data/cerita.json";

const akar = path.resolve(__dirname, "../../../..");
const baca = (p: string) => fs.readFileSync(path.join(akar, p), "utf8");
const apiBaris = baca("labs/api-t2/output/tutup-buku.txt").split("\n");
const ledgerBaris = baca("labs/b3-ledger/output/tutup-buku.txt").split("\n");
const halaman = baca("situs/src/content/docs/tahap-2/m17-prd-v3.mdx");
const R = bacaRekaman(apiBaris.join("\n"));
// Sepuluh lab Tahap 2 (RISET R2-202): daftar yang dipindai klaim "tidak ada" dan yang disebut halaman ("sepuluh lab").
const LAB = ["api-t2", "b3-ledger", "b3-race", "b3-isolasi", "t2-pencairan", "e3-idempotency", "b2-query", "b4-skema", "c4-ratelimit", "e5-payload"];
const KATA = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas", "dua belas"];

// Bagian A api-t2: baris ringkasan buku dan sistem (baris 10 dan 11).
const A = (() => {
  const i = apiBaris.findIndex((b) => b.startsWith("# --- A. "));
  const blok = apiBaris.slice(i, apiBaris.findIndex((b, k) => k > i && b.startsWith("# --- B. ")));
  const buku = blok.map((b) => b.match(/^buku: (\d+), awal \+ masuk - keluar = akhir = saldo_cache: (\d+), tidak cocok: (\d+)$/)).find((m) => m)!;
  const sistem = JSON.parse(blok.map((b) => b.match(/^sistem: (\{.*\})$/)).find((m) => m)![1]!) as Record<string, number>;
  return { buku: Number(buku[1]), cocok: Number(buku[2]), tidakCocok: Number(buku[3]), jurnal: sistem.jurnal!, tidakSeimbang: sistem.jurnal_tidak_seimbang! };
})();

// b3-ledger: bagian A (satu baris per buku, kolom terakhir t) dan bagian B (jurnal, tidak_seimbang).
const ledger = (() => {
  const a = ledgerBaris.findIndex((b) => b.startsWith("# --- A. "));
  const b = ledgerBaris.findIndex((x) => x.startsWith("# --- B. "));
  const bukuCocok = ledgerBaris.slice(a, b).filter((x) => /^\s*\d+ \|.*\| t$/.test(x)).length;
  const bukuSemua = ledgerBaris.slice(a, b).filter((x) => /^\s*\d+ \|.*\| [tf]$/.test(x)).length;
  const baris = ledgerBaris.slice(b).find((x) => /^\s*\d+ \|\s+\d+ \|\s+\d+ \|\s+\d+\s*$/.test(x))!.split("|").map((x) => Number(x.trim()));
  return { bukuCocok, bukuSemua, jurnal: baris[0]!, tidakSeimbang: baris[1]! };
})();

// Asumsi tahap 2 dari registry: sama dengan yang dihitung sinkron_cerita.py dan halaman 1.37.
const asumsi = cerita.tahap[1]!.asumsi;
const perHari = (asumsi.user * asumsi.aktif / 100) * asumsi.req;
const puncak = (perHari / 86400) * asumsi.puncak;
const satuJam = perHari / 3600;
const koma = (n: number) => n.toFixed(1).replace(".", ",");

describe("rekaman: angka turunan yang dipakai halaman", () => {
  test("bagian A api-t2 lolos dan bagian C berbeda satu jurnal dan Rp1.000", () => {
    expect(A).toEqual({ buku: 1016, cocok: 1016, tidakCocok: 0, jurnal: 1122, tidakSeimbang: 0 });
    expect(R.sebelum.jurnal).toBe(A.jurnal);
    expect(R.sesudah.jurnal - R.sebelum.jurnal).toBe(1);
    expect(R.sesudah.budi.masuk - R.sebelum.budi.masuk).toBe(R.tambahan);
    expect(R.sebelum.tidakCocok).toBe(0);
    expect(R.sesudah.tidakCocok).toBe(0);
  });
  test("b3-ledger: semua buku cocok dan semua jurnal seimbang", () => {
    expect(ledger).toEqual({ bukuCocok: 9, bukuSemua: 9, jurnal: 11, tidakSeimbang: 0 });
  });
  test("asumsi tahap 2: 12.000 request per hari, puncak 1,4, satu jam penuh 3,3", () => {
    expect(perHari).toBe(12000);
    expect(koma(puncak)).toBe("1,4");
    expect(koma(satuJam)).toBe("3,3");
  });
});

describe("halaman m17-prd-v3.mdx: tiap angka turunan dari rekaman", () => {
  const harus = (kalimat: string) => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);

  test("Yang sebenarnya: apakah data cocok", () => {
    harus(`laporan membaca ${bil(A.buku)} buku dan semuanya cocok`);
    harus(`membaca ${ledger.bukuSemua} buku dan ${ledger.jurnal} jurnal dengan hasil yang sama`);
    harus(`tutup buku atas ${bil(A.buku)} buku`);
  });

  test("Yang sebenarnya: apakah laporannya final", () => {
    harus(`jurnal top-up susulan ${rp(R.tambahan)} untuk Budi`);
    harus(`Laporan kedua menghitung ${bil(R.sesudah.jurnal)} jurnal, bukan ${bil(R.sebelum.jurnal)}.`);
    harus(`Uang masuk Budi naik dari ${rp(R.sebelum.budi.masuk)} ke ${rp(R.sesudah.budi.masuk)}.`);
  });

  test("Yang sebenarnya: tabel asumsi", () => {
    harus(`| User terdaftar (Tahap 2) | ${bil(asumsi.user)} |`);
    harus(`| Request per hari (Tahap 2) | ${bil(perHari)} |`);
    harus(`| Puncak request per detik (Tahap 2) | ±${koma(puncak)} |`);
    harus(`| Kepekaan: semua request dalam satu jam | ±${koma(satuJam)} |`);
    harus(`${bil(perHari)} ÷ 86.400 × ${asumsi.puncak}`);
    harus(`${bil(perHari)} ÷ 3.600`);
    harus(`${bil(asumsi.user)} × ${asumsi.aktif}% × ${asumsi.req} request`);
    harus(`satu request kira-kira tiap ${(1 / puncak).toFixed(1).replace(".", ",")} detik`);
    harus(`Puncak sekarang ±${koma(puncak)} request per detik`);
  });

  test("setiap bilangan bertitik ribuan di halaman berasal dari rekaman, asumsi, atau naskah M15", () => {
    // `toContain` di atas lolos bila satu kemunculan benar; tes ini menolak kemunculan lain yang salah ketik (1.017 buku).
    const boleh = new Set([
      bil(A.buku), bil(A.jurnal), bil(R.sesudah.jurnal), bil(R.tambahan), bil(R.sebelum.budi.masuk), bil(R.sesudah.budi.masuk),
      bil(asumsi.user), bil(perHari), "86.400", "3.600",
      "15.000", // Rp15.000: selisih M15 dari naskah, dirujuk di blok Gejala; angkanya milik halaman 2.25
    ]);
    const dipakai = [...halaman.matchAll(/(?<![\d.])\d{1,3}(?:\.\d{3})+(?![\d.])/g)].map((m) => m[0]);
    expect(dipakai.length).toBeGreaterThan(10);
    expect(dipakai.filter((n) => !boleh.has(n))).toEqual([]);
  });

  test("jumlah yang ditulis dengan kata: lab yang dipindai dan masalah di tabel", () => {
    const masalah = [...halaman.matchAll(/^\| \[\[(t2-m\d+)\]\] \|/gm)].length;
    harus(`di ${KATA[LAB.length]} lab pada 2026-10-25`);
    harus(`Tahap 2 sudah punya ${KATA[masalah]} masalah`);
    harus(`**Delapan masalah, bukan satu kapasitas.**`);
    expect(masalah).toBe(8);
  });

  test("Snippet menunjuk baris yang dimaksud di rekaman", () => {
    const rentang = [...halaman.matchAll(/<Snippet file="labs\/api-t2\/output\/tutup-buku\.txt" lines="(\d+):(\d+)"/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
    expect(rentang).toEqual([[8, 11], [42, 47], [64, 72], [41, 88]]);
    const baris = (n: number) => apiBaris[n - 1]!;
    expect(baris(8)).toMatch(/^\$ curl .*\/tutup-buku/);
    expect(baris(11)).toMatch(/^sistem: \{"jurnal": 1122/);
    expect(baris(42)).toMatch(/^# Transaction \[A\] menulis jurnal top-up/);
    expect(baris(47)).toMatch(/^sistem: \{"jurnal": 1122/);
    expect(baris(64)).toBe("[A] => COMMIT;");
    expect(baris(72)).toMatch(/^sistem: \{"jurnal": 1123/);
    expect(baris(41)).toMatch(/^# --- C\. /);
    expect(apiBaris.slice(0, 88)).toHaveLength(88);
    expect(apiBaris[87]).toBe("(4 rows)");
    expect(apiBaris.slice(88).join("")).toBe("");
  });

  test("delapan masalah Tahap 2 ada di tabel, sesuai urutan M9 sampai M16", () => {
    const baris = [...halaman.matchAll(/^\| \[\[(t2-m\d+)\]\] \|/gm)].map((m) => m[1]);
    expect(baris).toEqual(["t2-m9", "t2-m10", "t2-m11", "t2-m12", "t2-m13", "t2-m14", "t2-m15", "t2-m16"]);
    const ids = new Set(cerita.halaman.map((h) => h.id));
    for (const id of baris) expect(ids.has(id!), id).toBe(true);
  });
});

describe("diagram t2-m17-diuji.json: tiap angka turunan dari rekaman dan asumsi", () => {
  const simpul = (d: typeof diuji) => d.baris.map((b) => b.simpul.map((s) => [s.teks, "sub" in s ? s.sub : undefined]));

  test("dua baris, enam simpul", () => {
    expect(simpul(diuji)).toEqual([
      [
        [`${bil(A.cocok)} buku cocok`, `${bil(A.jurnal)} jurnal seimbang`],
        ["Satu jurnal COMMIT sesudahnya", `${bil(R.sesudah.jurnal)} jurnal, uang masuk Budi ${rp(R.sesudah.budi.masuk)}`],
        ["Buku tidak cocok tetap 0", "angka sama, isi laporan berbeda"],
      ],
      [
        ["Server cukup untuk enam kota?", undefined],
        [`Puncak sekarang ±${koma(puncak)} per detik`, `Asumsi; satu jam penuh ${koma(satuJam)}`],
        ["Kapasitas VPS belum diukur", "dan dua hal belum diuji"],
      ],
    ]);
  });
});

describe("klaim 'tidak ada' yang dipakai halaman", () => {
  // Semua berkas teks lab, bukan hanya kode: perkakas beban bisa ada di .sql, .json, .md, atau Dockerfile (peninjau 339).
  const EKSTENSI = /\.(go|py|sh|js|mjs|ts|yml|yaml|sql|json|md|toml|mod|html|conf|cfg|ini)$|(^|\/)(Makefile|Dockerfile[^/]*)$/;
  const LEWATI = new Set(["node_modules", ".venv", ".git", "output", "vendor"]);
  const jalan = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      if (LEWATI.has(e.name)) return [];
      const p = path.join(dir, e.name);
      return e.isDirectory() ? jalan(p) : EKSTENSI.test(p) ? [p] : [];
    });
  const berkas = LAB.flatMap((l) => jalan(path.join(akar, "labs", l)));
  const PERKAKAS = /\b(k6|vegeta|wrk|locust|gatling|jmeter|autocannon|oha|bombardier)\b|load.?test/i;

  test(`sepuluh lab Tahap 2 tidak memuat perkakas load test (${LAB.length} lab)`, () => {
    expect(berkas.length).toBeGreaterThan(50);
    const kena = berkas.filter((f) => PERKAKAS.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(akar, f));
    expect(kena).toEqual([]);
  });

  test("kode server api-t2 tidak memanggil layanan lain selain database", () => {
    const go = berkas.filter((f) => f.includes(`${path.sep}api-t2${path.sep}`) && f.endsWith(".go") && !f.endsWith("_test.go"));
    expect(go.length).toBeGreaterThan(5);
    const kena = go.filter((f) => /\bhttp\.(Get|Post|PostForm|Head|NewRequest(WithContext)?|Client|DefaultClient)\b|\bnet\.Dial|\bsmtp\.|\bexec\.Command/.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(akar, f));
    expect(kena).toEqual([]);
  });

  test("rekaman api-t2 memakai satu proses; dua instance hanya ada di rekaman c4-ratelimit", () => {
    expect(apiBaris[3]).toBe("# server: ./api-t2");
    const c4 = baca("labs/c4-ratelimit/output/login/ratelimit.txt");
    expect(c4).toMatch(/== F\. Dua instance/);
    const txt = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const q = path.join(dir, e.name);
        return e.isDirectory() ? txt(q) : e.name.endsWith(".txt") ? [q] : [];
      });
    const lain = LAB.filter((l) => l !== "c4-ratelimit").flatMap((l) => {
      const out = path.join(akar, "labs", l, "output");
      return fs.existsSync(out) ? txt(out) : [];
    });
    expect(lain.length).toBeGreaterThan(10);
    const kena = lain.filter((f) => /dua (instance|server|proses server)/i.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(akar, f));
    expect(kena).toEqual([]);
  });

  test("PRD v2 menunda notifikasi ke v3", () => {
    expect(baca("situs/src/content/docs/tahap-2/prd-v2.mdx")).toContain("| P2 | Notifikasi saat menerima transfer | Diminta Budi; ditunda ke v3 |");
  });
});
