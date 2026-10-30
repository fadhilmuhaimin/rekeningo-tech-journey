// Penjaga halaman 4.27 (keputusan 1370 sampai 1372): angka, label sumber, rentang Snippet, klaim negatif berlingkup,
// tautan, diagram Rantai, widget kalkulator, dan kartu Cek diri di m39-prd-v5.mdx diturunkan dari registry (asumsi Tahap 3
// dan 4), naskah Tahap 4, rekaman labs/api-t4 (beban.txt bagian A dan B), kode lab (cmd/api, cmd/beban, run.py, worker),
// halaman Tahap 3 dan 4, PROPOSAL, dan mesin widget kalkulator, bukan dari daftar yang ditulis sendiri. Halaman ini TANPA LAB
// SENDIRI: setiap angka berlabel Asumsi, Hitungan, Ilustrasi, atau Tidak dijalankan, dan rekaman hanya memberi batas di satu laptop.
// Dua lapis: (1) nilai bergantung sumber dihitung ulang di sini dan dibandingkan dengan halaman; (2) kata-kata halaman dikunci
// per baris lewat m39-prd-v5.halaman.nilai.ts, supaya satu kata yang berubah (mis. "tidak" disisipkan) gagal. Kalimat terkunci
// tidak menangkap SALAHNYA kalimat, jadi klaim yang diucapkan (jadwal tidak tertinggal, batas koneksi, campuran beban, worker
// di bagian A, ADR 37) dibaca dari berkas yang memerankannya. Tes hanya membaca berkas terlacak git.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-m39-batas.json";
import { DataKalkulator, DaftarAsumsi } from "../widgets/kalkulator/skema";
import { duaAngka, hitung as hitungBeban, jarak as jarakKal, siapkan } from "../widgets/kalkulator/logika";
import { daftarBlok, cekTemplat } from "./blok";
import { DataRantai } from "./rantai";
import { bersihkanRujukanInternal } from "./rujukan-internal";
import { BARIS_MDX, BENTUK_MDX, NILAI_JSON } from "./m39-prd-v5.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const terlacak: Set<string> | null = (() => {
  try {
    return new Set(execSync("git ls-files", { cwd: akar, maxBuffer: 1 << 26 }).toString().split("\n"));
  } catch {
    return null;
  }
})();
const baca = (rel: string): string => {
  if (terlacak) expect(terlacak.has(rel), `tes membaca berkas yang tidak terlacak git: ${rel}`).toBe(true);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};

const BERKAS = "situs/src/content/docs/tahap-4/m39-prd-v5.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const barisMdx = mdx.split("\n").filter((b) => b.trim() && !/^<Snippet (file|files)=/.test(b));
const beban = baca("labs/api-t4/output/beban.txt");
const naskah = baca("plan/CERITA-TAHAP-4.md");
const naskah3 = baca("plan/CERITA-TAHAP-3.md");
const proposal = baca("plan/PROPOSAL.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const kartu = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const mainGo = baca("labs/api-t4/cmd/api/main.go");
const bebanGo = baca("labs/api-t4/cmd/beban/main.go");
const runPy = baca("labs/api-t4/run.py");
const workerGo = baca("labs/api-t4/internal/worker/worker.go");
const hal38 = baca("situs/src/content/docs/tahap-3/connection-pool.mdx");
const hal328 = baca("situs/src/content/docs/tahap-3/m28-prd-v4.mdx");
const hal329 = baca("situs/src/content/docs/tahap-3/estimasi.mdx");
const hal313 = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
const hal41 = baca("situs/src/content/docs/tahap-4/prd-v4.mdx");
const diagram = DataRantai.parse(diagramMentah);
const kalkMentah = JSON.parse(baca("situs/data/widget/t4-m39-kalkulator.json")) as unknown;
const kalk = DataKalkulator.parse(kalkMentah);

interface H { id: string; judul: string; path?: string; topik?: string; label?: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[]; masalah?: string }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const cocok = (teks: string, re: RegExp): RegExpMatchArray => {
  const m = teks.match(re);
  expect(m, `tidak cocok: ${re}`).not.toBeNull();
  return m!;
};
const hitung = (teks: string, sub: string): number => teks.split(sub).length - 1;
const ribu = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const baris = (teks: string) => {
  const b = teks.replace(/\n+$/, "").split("\n");
  const nomor = (ok: (x: string) => boolean, dariNomor = 1): number => {
    const i = b.findIndex((x, n) => n + 1 >= dariNomor && ok(x));
    expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1;
  };
  return { b, nomor, antara: (a: number, z: number) => b.slice(a - 1, z).join("\n") };
};

// ---- nilai dari registry, naskah, dan rumus ------------------------------------------------------------------------------
type Reg = { user: number; aktif: number; req: number; puncak: number; trx: number };
const reg4 = cerita.tahap[3]!.asumsi as Reg;
const reg3 = cerita.tahap[2]!.asumsi as Reg;
const T4 = hitungBeban({ user: reg4.user, aktif: reg4.aktif, req: reg4.req, puncak: reg4.puncak });
const T3 = hitungBeban({ user: reg3.user, aktif: reg3.aktif, req: reg3.req, puncak: reg3.puncak });
const DETIK = 86400;
const barisTopup = naskah.split("\n").find((b) => b.startsWith("| Top-up dari bank | aktif ×"))!;
const TOPUP_PER_AKTIF = Number(cocok(barisTopup, /aktif × ([\d,]+) ÷ 86\.400/)[1]!.replace(",", "."));
const trxHari4 = T4.dau * reg4.trx;
const trxHari3 = T3.dau * reg3.trx;
const topupHari = T4.dau * TOPUP_PER_AKTIF;
const trxDetik4 = (trxHari4 / DETIK) * reg4.puncak;
const trxDetik3 = (trxHari3 / DETIK) * reg3.puncak;
const topupDetik = (topupHari / DETIK) * reg4.puncak;
const notifHari = trxHari4 + topupHari;
const notif4 = (notifHari / DETIK) * reg4.puncak;
const SERENTAK = Number(cocok(workerGo, /Serentak: (\d+),/)[1]);
const T_KIRIM = Number(cocok(runPy, /d\.push_mode\("lambat", ms=(\d+)\)/)[1]) / 1000;
const KAPASITAS = SERENTAK / T_KIRIM;
const pakai4 = notif4 / KAPASITAS;
const pakai3 = trxDetik3 / KAPASITAS;
const W = 0.02;
const POOL = Number(cocok(beban, /pool 10\)/)[0].match(/\d+/)![0]);
const L4 = T4.puncak * W;
const BATAS_L = POOL - 1;
const semuaAktif = hitungBeban({ user: reg4.user, aktif: 100, req: reg4.req, puncak: reg4.puncak });
const satuJam = hitungBeban({ user: reg4.user, aktif: reg4.aktif, req: reg4.req, puncak: 24 });
const SATUAN = { detik: "detik", ms: "ms" };
const LAMA = 20;
const RPS = Number(cocok(beban, /pada ([\d.]+) permintaan per detik/)[1]);
const KONEKSI4 = 2 * 10 + 2 * 5 + 4 + 3 + 3;

const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/i;
const tagSnippet = (): { berkas: string; lines: string | undefined; judul: string | undefined; lang: string | undefined }[] =>
  [...badan.matchAll(/<Snippet\s+([^>]*?)\/>/gs)].map((m) => {
    const t = m[1]!;
    const atribut = (nama: string): string | undefined => t.match(new RegExp(`${nama}="([^"]*)"`))?.[1];
    return { berkas: atribut("file") ?? "", lines: atribut("lines"), judul: atribut("title"), lang: atribut("lang") };
  });

describe("kata-kata halaman terkunci (lapis 2)", () => {
  test("baris MDX sama dengan nilai terkunci", () => {
    expect(barisMdx).toEqual(BARIS_MDX);
  });
  test("bentuk baris kosong terkunci (baris kosong menentukan cara MDX mengurai)", () => {
    const bentuk = mdx.split("\n").map((b) => (/^<Snippet (file|files)=/.test(b) ? "S" : b.trim() ? "#" : "-")).join("");
    expect(bentuk).toBe(BENTUK_MDX);
  });
  test("nilai string JSON Rantai dan kalkulator sama dengan nilai terkunci", () => {
    const ratakan = (x: unknown, jalur = ""): string[] =>
      Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${jalur}.${i}`))
        : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => ratakan(v, jalur ? `${jalur}.${k}` : k))
        : [`${jalur}=${JSON.stringify(x)}`];
    expect(Object.keys(NILAI_JSON)).toEqual(["rantai", "kalkulator"]);
    expect(ratakan(JSON.parse(baca("situs/data/diagram/t4-m39-batas.json")))).toEqual(NILAI_JSON.rantai);
    expect(ratakan(kalkMentah)).toEqual(NILAI_JSON.kalkulator);
  });
});

describe("registry, naskah, blok, dan tautan", () => {
  const r = dari("t4-m39");
  const barisM39 = naskah.split("\n").find((b) => b.startsWith("| M39 |"))!;
  test("entri registry dan baris peta naskah cocok; halaman tanpa lab sendiri", () => {
    expect(r).toMatchObject({ ada: true, nomor: "4.27", jenis: "masalah", inti: true, prasyarat: ["t4-tim-infra"], tahap: 4, peran: ["backend"], topik: "Desain sistem", bagian: 4 });
    expect(r.path).toBe("tahap-4/m39-prd-v5.md");
    expect(r.lab).toBeUndefined();
    expect(path.basename(BERKAS, ".mdx")).toBe(path.basename(r.path!, ".md"));
    expect(naskah).toContain("| 4.27 | 4 | M39: Uji coba publik lolos, PRD v5 datang | Masalah | ★ | – | kalkulator |");
    const minggu = cocok(naskah, /\| M39 \| (\d+) \|/)[1]!;
    expect(r.label).toBe(`Masalah 39 · minggu ${minggu}`);
    harus(`Minggu ${minggu} Tahap 4.`);
    expect(r.judul).toBe("M39: Uji coba publik lolos, PRD v5 datang");
    expect(frontmatter).toContain('title: "4.27 M39: Uji coba publik lolos, PRD v5 datang"');
    expect(hal.filter((h) => h.nomor === "4.27").map((h) => h.id)).toEqual(["t4-m39"]);
    expect(dari("t4-tim-infra")).toMatchObject({ nomor: "4.26", adr: [44] });
    expect(dari("t4-estimasi")).toMatchObject({ nomor: "4.28", prasyarat: ["t4-m39"] });
    expect(dari("t4-adr-45")).toMatchObject({ nomor: "4.29", adr: [45] });
    expect(dari("t4-jembatan").nomor).toBe("4.31");
  });
  test("meta: menit baca ditambah menit coba sama dengan registry, dan jumlah kata masuk akal (sekitar 200 kata per menit)", () => {
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-tim-infra\]\] · Jalur inti<\/p>/);
    expect(r.menit).toBe(Number(m[1]) + Number(m[2]));
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(m[1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat masalah: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira"]);
  });
  test("tautan [[id]]: himpunan, nomor, judul, dan jumlah pemakaian diturunkan dari registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "t3-dua-instance", "t3-estimasi", "t3-m27", "t3-m28", "t3-pool", "t4-adr-45", "t4-estimasi", "t4-jembatan", "t4-m32", "t4-modul", "t4-prd", "t4-rekonsiliasi", "t4-skema", "t4-tim-infra"]);
    const sesuai: [string, string, string][] = [
      ["t3-dua-instance", "3.15", "Dua instance di belakang proxy"], ["t3-estimasi", "3.29", "Estimasi Tahap 3"], ["t3-m27", "3.26", "M27"],
      ["t3-m28", "3.28", "M28"], ["t3-pool", "3.8", "Connection pool"], ["t4-adr-45", "4.29", "ADR 45"], ["t4-estimasi", "4.28", "Estimasi Tahap 4"],
      ["t4-jembatan", "4.31", "Jembatan"], ["t4-m32", "4.12", "M32"], ["t4-modul", "4.13", "Modular monolith"], ["t4-prd", "4.1", "PRD v4"],
      ["t4-rekonsiliasi", "4.9", "Rekonsiliasi"], ["t4-skema", "4.5", "Skema data"], ["t4-tim-infra", "4.26", "Tim dan infra Tahap 4"],
    ];
    for (const [idh, nomor, awalJudul] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awalJudul), `${idh} di registry`).toBe(true);
    }
    for (const [, nomor, awalJudul] of sesuai.filter(([i]) => i.startsWith("t4-"))) {
      expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awalJudul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    for (const [idh, n] of [["t4-modul", 3], ["t3-estimasi", 2], ["t3-pool", 2], ["t3-m28", 2], ["t4-estimasi", 2], ["t4-adr-45", 2], ["t4-tim-infra", 1], ["t4-rekonsiliasi", 1], ["t4-prd", 1], ["t4-skema", 1], ["t3-m27", 1], ["t3-dua-instance", 1], ["t4-m32", 1], ["t4-jembatan", 1]] as [string, number][]) {
      expect(hitung(badan, `[[${idh}]]`), idh).toBe(n);
    }
  });
  test("janji halaman ini ke halaman lain ditepati: 4.28 menghitung beban Tahap 5, 4.29 menulis pemicu, 4.31 memuat tebakan, PRD v4 menulis Pak Hadi dan rekonsiliasi", () => {
    expect(dari("t4-estimasi").masalah).toBe("Menghitung beban Tahap 5 dari angka Tahap 4 sebelum memilih komponen");
    harus("Beban PRD v5 dihitung dengan rumus yang sama di [[t4-estimasi]]. Pemicu terukur untuk tiap dugaan ditulis di [[t4-adr-45]].");
    expect(dari("t4-adr-45").masalah).toContain("Tergoda memecah semua modul jadi service, memakai Kubernetes, gRPC, dan read replica");
    expect(naskah).toContain('ADR 45 "Sengaja belum dilakukan": tanpa service per modul, Kubernetes, gRPC, read replica, BFF terpisah, login sosial');
    harus('- [[t4-adr-45]]: ADR 45, "Sengaja belum dilakukan". Service per modul, Kubernetes, gRPC, read replica, BFF terpisah, dan login sosial ditunda, masing-masing dengan pemicunya.');
    expect(dari("t4-jembatan").masalah).toContain("pecah lebih dulu");
    harus("- [[t4-jembatan]]: pratinjau PRD v5, dengan tebakan mana yang pecah lebih dulu.");
    expect(naskah).toContain("Pembaca diminta menebak: dari ADR Tahap 4, mana yang pecah lebih dulu?");
    expect(dari("t4-rekonsiliasi").judul).toContain("Rekonsiliasi dengan gateway");
    expect(naskah).toContain("setiap selisih rekonsiliasi harian menjadi insiden bernomor yang ditutup dalam satu hari kerja");
    expect(hal41).toContain("setiap selisih rekonsiliasi harian menjadi insiden bernomor yang ditutup dalam satu hari kerja");
    harus("Isi PRD v5 juga dari naskah (Ilustrasi), jadi halaman ini tidak menulis angkanya.");
  });
  test("halaman tidak membuka isi Tahap 5: tanpa angka user Tahap 5, nomor ADR sesudah 45, atau komponen Tahap 5", () => {
    expect(badan).not.toMatch(/1\.000\.000|ADR (4[6-9]|5\d)|read replica(?!, BFF)|event streaming|service mesh|Tahap 5/i);
    expect(new Set([...badan.matchAll(/Tahap \d+(?: → \d+)?/g)].map((m) => m[0]))).toEqual(new Set(["Tahap 3", "Tahap 3 → 4", "Tahap 4", "Tahap 4 → 5"]));
    expect(hitung(badan, "Tahap 4 → 5")).toBe(1);
    expect(dari("t4-estimasi").judul).toBe("Estimasi Tahap 4 → 5");
    expect(hitung(badan, "ADR 45")).toBe(1);
    expect(hitung(badan, "ADR 37")).toBe(1);
    expect(dari("t4-modul").adr).toEqual([37]);
    expect(badan.indexOf("ADR 37")).toBeGreaterThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
  });
});

describe("naskah M39 dan gejala: lingkup PRD v5, dugaan, dan target yang bukan rekaman", () => {
  const barisM39 = naskah.split("\n").find((b) => b.startsWith("| M39 |"))!;
  test("baris M39: minggu, gejala berlabel target dan Ilustrasi, dugaan, angka beban, belum pernah diuji, ADR 45", () => {
    expect(barisM39).toContain("| 12 | Uji coba publik lolos: 100.000 user terdaftar, dan rekonsiliasi harian selisih Rp0 atau insiden tertutup dalam satu hari kerja selama 14 hari berturut-turut (target, Asumsi).");
    expect(barisM39).toContain("(Ilustrasi). | Perlu server lebih besar, Kubernetes, atau satu service per modul |");
    expect(barisM39).toContain("Puncak 138,9 request per detik (naik 8 kali), 6,94 transaksi uang per detik, worker notifikasi 56% terpakai (naik dari 6,5%), pengumuman ke 100.000 HP butuh 125 menit (semua Hitungan, Asumsi).");
    expect(barisM39).toContain("kapasitas produksi belum diukur. Yang belum pernah diuji: laporan merchant dan transaksi di satu database, satu worker untuk notifikasi massal, dan 13 orang menjadi 20 sampai 40 di satu repo");
    expect(barisM39).toContain("| Estimasi Tahap 4 → 5; **Tim 4** retrospektif |");
    expect(naskah).toContain("- M39: PRD v5, bukan fitur v4.");
    expect(naskah).toContain("| Estimasi | Masalah Tahap 4 adalah kepercayaan pada pihak lain dan koordinasi tim, bukan kapasitas | M39; kapasitas satu server belum terukur |");
    harus("Masalah Tahap 4 adalah kepercayaan pada pihak lain dan koordinasi tim, bukan jumlah request per detik.");
    harus("Hitungan di halaman ini berarti hasil rumus yang ditulis di sebelahnya, dan labelnya mengikuti masukan terlemahnya.");
    expect(cara).toContain("Label sumber");
  });
  test("enam butir PRD v5 di gejala: urutan dari baris M39; target 14 hari dan Rp0 berlabel Asumsi dan Ilustrasi; PT fiktif; tanpa klaim izin atau regulasi", () => {
    const butir = cocok(barisM39, /Sinta datang dengan PRD v5: ([^(]+)\(Ilustrasi\)/)[1]!.trim().split(", ");
    expect(butir).toEqual(["skala nasional", "merchant massal", "cicilan dan tabungan", "laporan merchant real-time", "notifikasi massal", "API publik untuk POS"]);
    harus(`Lalu Sinta membagikan PRD v5: ${butir.slice(0, 5).join(", ")}, dan ${butir[5]}.`);
    harus("minggu 12, 100.000 user terdaftar, 14 hari berturut-turut, dan selisih Rp0 atau insiden tertutup dalam satu hari kerja berasal dari naskah. Naskah menulisnya sebagai target (Asumsi)");
    expect(reg4.user).toBe(100000);
    expect(cerita.tahap[3]!.user).toBe("100.000");
    expect(cocok(barisM39, /selama (\d+) hari berturut-turut/)[1]).toBe("14");
    harus("hari ke-14 berturut-turut");
    harus("PT Rekeningo adalah perusahaan fiktif, dan halaman ini tidak menyebut izin atau regulasi apa pun.");
    expect(badan).not.toMatch(/uang elektronik|\bizin\b(?! atau regulasi apa pun)|OJK|Bank Indonesia|lisensi/i);
    expect(naskah).toContain('Frasa "uang elektronik publik" di naskah Tahap 1 tidak membawa klaim izin atau regulasi apa pun.');
  });
  test("tokoh: naskah tidak menyebut siapa mengusulkan apa; sifat Nadia dan Bayu dari naskah; halaman menulis skenario berlabel Ilustrasi", () => {
    expect(barisM39).not.toMatch(/Raka|Nadia|Bayu/);
    expect(naskah).toContain("- **Nadia** memimpin tim Pembayaran dan cenderung mengusulkan solusi yang terlalu berat, kali ini service per pihak ketiga.");
    expect(naskah).toContain("- **Bayu** memimpin tim Platform dan masih menganggap bawaan komponen aman, kali ini bawaan layanan terkelola.");
    harus("*Skenario (Ilustrasi):* siapa mengusulkan apa ditulis halaman ini. Naskah hanya menyebut tiga dugaan: server lebih besar, Kubernetes, atau satu service per modul.");
    harus("Raka mengusulkan server dengan CPU dan memori lebih besar.");
    harus("Bayu mengusulkan Kubernetes, supaya jumlah instance API dan worker (proses yang mengirim notifikasi dari queue) bertambah tanpa kerja tangan.");
    harus("Nadia mengusulkan satu service per modul, supaya tiap tim memegang miliknya sendiri.");
    harus("Pertanyaan Sinta ditambahkan halaman ini.");
    harus('"Apa yang harus diganti sebelum PRD v5 dikerjakan?" tanya Sinta.');
  });
});

describe("angka beban: dari asumsi registry dan rumus, semuanya berlabel Asumsi atau Hitungan", () => {
  test("registry: Tahap 4 punya 100.000 user, 20% aktif, 60 request, faktor 10, 3 transaksi; Tahap 3 punya 10.000, 25%, 60, 10, 3; hasil sama dengan naskah", () => {
    expect([reg4.user, reg4.aktif, reg4.req, reg4.puncak, reg4.trx]).toEqual([100000, 20, 60, 10, 3]);
    expect([reg3.user, reg3.aktif, reg3.req, reg3.puncak, reg3.trx]).toEqual([10000, 25, 60, 10, 3]);
    expect([T4.dau, T4.reqHari]).toEqual([20000, 1200000]);
    expect(koma(T4.puncak, 1)).toBe("138,9");
    expect(koma(T3.puncak, 1)).toBe("17,4");
    expect(T4.puncak / T3.puncak).toBeCloseTo(8, 10);
    expect(koma(138.9 / 17.4, 2)).toBe("7,98");
    expect(trxHari4).toBe(60000);
    expect(trxHari3).toBe(7500);
    expect(topupHari).toBe(5000);
    expect(notifHari).toBe(65000);
    expect(TOPUP_PER_AKTIF).toBe(0.25);
    expect(naskah).toContain("| Request per detik | aktif × request ÷ 86.400 × puncak | 20.000 × 60 = 1,2 juta per hari | 13,9 rata-rata dan 138,9 puncak");
    expect(naskah).toContain("| Transaksi uang internal (bayar, transfer, QR) | aktif × 3 ÷ 86.400 × puncak | 60.000 per hari (Tahap 3: 7.500) | 0,694 rata-rata dan 6,94 puncak (Tahap 3: 0,868; naik 8,0 kali)");
    expect(naskah).toContain("| Notifikasi uang dan pemakaian worker | (60.000 + 5.000) ÷ 86.400 × 10 lawan c ÷ t |");
    expect(naskah).toContain("7,52 per detik puncak = 56% kapasitas (Tahap 3: 0,868 ÷ 13,3 = 6,5%); makan siang: 65.000 × 0,8 ÷ 5.400 = 9,63 per detik = 72%");
    expect(naskah).toContain("| Koneksi database | instance × pool + pembayaran + worker + admin + reserved | 2 × 10 + 2 × 5 + 4 + 3 + 3 | 40 dari 100 (Tahap 3: 30;");
  });
  test("tabel besaran: tiap sel dihitung dari registry dan rumus; judul kolom dan formula sama dengan hitungan", () => {
    const f = (a: number, b: number) => `${ribu(a)} × ${b}`;
    harus("| Besaran di puncak | Tahap 3 | Tahap 4 | Cara hitung Tahap 4 |");
    harus(`| Request per detik | ${koma(T3.puncak, 1)} | ${koma(T4.puncak, 1)} | ${f(T4.dau, reg4.req)} ÷ ${ribu(DETIK)} × ${reg4.puncak} |`);
    harus(`| Transaksi uang per detik | ${koma(trxDetik3, 3)} | ${koma(trxDetik4, 2)} | ${f(T4.dau, reg4.trx)} ÷ ${ribu(DETIK)} × ${reg4.puncak} |`);
    harus(`| Top-up dari bank per detik | belum ada | ${koma(topupDetik, 3)} | ${ribu(T4.dau)} × ${koma(TOPUP_PER_AKTIF, 2)} ÷ ${ribu(DETIK)} × ${reg4.puncak} |`);
    harus(`| Notifikasi uang per detik | ${koma(trxDetik3, 3)} | ${koma(notif4, 2)} | ${koma(trxDetik4, 2)} + ${koma(topupDetik, 3)} |`);
    harus(`| Pemakaian worker | ${koma(pakai3 * 100, 1)}% | ${Math.round(pakai4 * 100)}% | ${koma(notif4, 2)} ÷ ${koma(KAPASITAS, 2)} |`);
    harus(`| Koneksi database dari 100 | 30 | ${KONEKSI4} | 2 × 10 + 2 × 5 + 4 + 3 + 3 |`);
    expect(KONEKSI4).toBe(40);
    expect(Math.round(pakai4 * 100)).toBe(56);
    expect(koma(pakai3 * 100, 1)).toBe("6,5");
    expect(koma(notif4, 3)).toBe("7,523");
    expect(koma(trxDetik3, 3)).toBe("0,868");
    expect(koma(T3.puncak, 2)).toBe("17,36");
    expect(Number(koma(notif4, 2).replace(",", "."))).toBeCloseTo(Number(koma(trxDetik4, 2).replace(",", ".")) + Number(koma(topupDetik, 3).replace(",", ".")), 2);
    expect(hal329).toContain("| Notifikasi uang per detik, puncak | 0,868 | 7,52 | 13,33 per detik |");
    expect(hal329).toContain("| Pemakaian worker, puncak | 6,5% | 56% | 100% |");
    expect(hal329).toContain("Koneksi: 2 × 10 + 2 × 5 + 4 + 3 + 3 = 40 dari 100. Tahap 3 memakai 2 × 10 + 4 + 3 + 3 = 30");
    expect(hal41).toContain("| Puncak request per detik | ±138,9 |");
  });
  test("pembulatan dan bentuk: 17,36 jadi 17,4 dan 7,523 jadi 7,52; 8 kali tepat dan 7,98 dari angka bulat; 8,7 kali; 13,333 jadi 13,33; 56,4%", () => {
    harus(`Angka dibulatkan ke bentuk yang dipakai [[t3-estimasi]] dan [[t4-prd]]: ${koma(T3.puncak, 2)} ditulis ${koma(T3.puncak, 1)} dan ${koma(notif4, 3)} ditulis ${koma(notif4, 2)}.`);
    harus(`Puncak naik tepat ${T4.puncak / T3.puncak} kali, karena user naik ${reg4.user / reg3.user} kali, user aktif turun dari ${reg3.aktif}% ke ${reg4.aktif}%, dan request per user tetap ${reg4.req}.`);
    expect(reg3.req).toBe(reg4.req);
    expect((reg4.user / reg3.user) * (reg4.aktif / reg3.aktif) * (reg4.req / reg3.req)).toBeCloseTo(8, 10);
    harus(`Dari angka yang dibulatkan, 138,9 ÷ 17,4 = ${koma(138.9 / 17.4, 2)}.`);
    harus(`Notifikasi uang naik ${koma(7.52, 2)} ÷ ${koma(0.868, 3)} = ${koma(7.52 / 0.868, 1)} kali, lebih cepat dari request, karena top-up dari bank ikut menjadi notifikasi.`);
    expect(notif4 / trxDetik3).toBeGreaterThan(T4.puncak / T3.puncak);
    harus(`Kapasitas worker ${SERENTAK} ÷ ${koma(T_KIRIM, 1)} = ${koma(KAPASITAS, 3)} ditulis ${koma(KAPASITAS, 2)} di halaman ini dan ${koma(KAPASITAS, 1)} di rekaman.`);
    harus(`Hasilnya ${koma(notif4, 2)} ÷ ${koma(KAPASITAS, 2)} = ${koma((7.52 / 13.33) * 100, 1)}%.`);
    // dengan 13,3 hasilnya 56,5%, yaitu 57% bila dibulatkan: halaman memakai 13,33 dan tidak membagi dengan 13,3
    expect(Math.round((7.52 / 13.3) * 100)).toBe(57);
    expect(badan).not.toContain("÷ 13,3 ");
    expect(hitung(badan, "13,333")).toBe(1);
  });
  test("worker paling besar: koneksi 40%, worker 56%, makan siang 65.000 × 0,8 ÷ 5.400 = 9,63 per detik = 72%; 65.000 = 60.000 + 5.000", () => {
    const makanSiang = (notifHari * 0.8) / (90 * 60);
    harus(`Batas 100 koneksi PostgreSQL terpakai ${KONEKSI4} ÷ 100 = ${(KONEKSI4 / 100) * 100}% (Hitungan atas Asumsi desain), lebih kecil dari worker ${Math.round(pakai4 * 100)}%.`);
    harus(`Di jendela makan siang (Asumsi naskah: 80% notifikasi dalam 90 menit), ${ribu(notifHari)} × ${koma(0.8, 1)} ÷ ${ribu(90 * 60)} = ${koma(makanSiang, 2)} per detik, atau ${Math.round((makanSiang / KAPASITAS) * 100)}%.`);
    harus(`Angka ${ribu(notifHari)} adalah ${ribu(trxHari4)} transaksi uang ditambah ${ribu(topupHari)} top-up per hari.`);
    expect(Math.round((makanSiang / KAPASITAS) * 100)).toBe(72);
    expect(KONEKSI4 / 100).toBeLessThan(pakai4);
    expect(pakai4).toBeLessThan(1);
  });
  test("koneksi database: suku-suku sama dengan 3.29 dan naskah; pool, worker, admin, cadangan adalah Asumsi desain", () => {
    harus("Koneksi database terdiri dari dua instance API dengan pool 10 koneksi, dua pool pembayaran 5 koneksi, 4 koneksi worker, 3 admin, dan 3 cadangan superuser.");
    harus("Ukuran pool pembayaran, worker, admin, dan cadangan adalah Asumsi desain naskah.");
    expect(hal329).toContain("Suku 2 × 5 adalah pool dua instance layanan pembayaran bank, Asumsi desain; worker 4, admin 3, dan cadangan superuser 3 mengikuti [[t3-pool]].");
    expect(SERENTAK).toBe(4);
  });
  test("pengumuman ke 100.000 HP: 100.000 × 0,3 ÷ 4 = 7.500 detik = 125 menit (Tahap 3: 750 detik); sisa kapasitas 5,81; Hitungan dan Tidak dijalankan", () => {
    const hp = 100000;
    expect((hp * T_KIRIM) / SERENTAK).toBe(7500);
    expect(7500 / 60).toBe(125);
    expect(hp).toBe(reg4.user);
    expect((reg3.user * T_KIRIM) / SERENTAK).toBe(750);
    expect(hal329).toContain("100.000 × 0,3 ÷ 4 = 7.500 detik, atau 125 menit (Asumsi); di Tahap 3 angkanya 750 detik untuk 10.000 HP.");
    harus(`Pengumuman ke ${ribu(hp)} HP dihitung ${ribu(hp)} × ${koma(T_KIRIM, 1)} ÷ ${SERENTAK} = ${ribu((hp * T_KIRIM) / SERENTAK)} detik, yaitu ${(hp * T_KIRIM) / SERENTAK / 60} menit (Hitungan, Tidak dijalankan: lab tidak menulis ${ribu(hp)} baris).`);
    harus(`Pada puncak worker yang sama juga mengirim ${koma(notif4, 2)} notifikasi uang per detik, jadi tersisa ${koma(KAPASITAS, 2)} − ${koma(notif4, 2)} = ${koma(KAPASITAS - notif4, 2)} per detik.`);
    expect(koma(KAPASITAS - notif4, 2)).toBe("5,81");
    harus("Angka itu batas bawah.");
    expect((hp * T_KIRIM) / SERENTAK / 60).toBeLessThan(hp / (KAPASITAS - notif4) / 60);
  });
  test("L dan pool: L = 138,9 × 0,02 = 2,78 dari pool 10; terdesak bila L melebihi 9, pada 450 per detik = 3,24 kali puncak; W Asumsi dari 3.28 dan tidak direkam di api-t4", () => {
    harus(`Dengan W 20 ms (Asumsi dari [[t3-m28]]; api-t4 tidak merekam W), L = ${koma(T4.puncak, 1)} × ${koma(W, 2)} = ${koma(L4, 2)} koneksi dari pool ${POOL}.`);
    harus(`Pool ${POOL} baru terdesak bila L melebihi ${BATAS_L}. Itu terjadi pada ${BATAS_L} ÷ ${koma(W, 2)} = ${ribu(BATAS_L / W)} request per detik, yaitu ${koma(BATAS_L / W / T4.puncak, 2)} kali puncak ${koma(T4.puncak, 1)} (Hitungan untuk kedatangan berjadwal tetap).`);
    expect(koma(BATAS_L / W / T4.puncak, 2)).toBe("3,24");
    expect(koma(L4, 2)).toBe("2,78");
    expect(hal328).toContain("W = 20 ms juga Asumsi, karena rekaman lab hanya membuktikan W di bawah 50 ms.");
    expect(hal38).toContain("W = 0,02 detik (Asumsi 20 ms; rekaman hanya membuktikan di bawah 50 ms)");
    expect(hal38).toContain("9 ÷ 0,02 = 450 request per detik");
    expect(hal329).toContain("L = λ × W = 138,9 × 0,02 = 2,78, dengan W 20 ms (Asumsi, belum diukur).");
    expect(runPy).not.toMatch(/\bW\b.{0,40}ms/);
    expect(beban).not.toMatch(/\bW\b/);
    harus("L adalah rata-rata jumlah koneksi yang sedang dipegang. Rumusnya L = λ × W, dengan λ request per detik dan W lama satu request memegang koneksi ([[t3-pool]]).");
  });
  test("skenario di bawah widget: semua aktif 694,4 dan L 13,9 di atas batas 9; satu jam 333,3 dan L 6,67; pembulatan dua angka penting dari mesin widget", () => {
    harus(`Widget membulatkan ke dua angka penting, jadi rata-rata ${koma(T4.rata, 1)} tampil ${duaAngka(T4.rata)}, puncak ${koma(T4.puncak, 1)} tampil ${duaAngka(T4.puncak)}, puncak ${koma(semuaAktif.puncak, 1)} tampil ${duaAngka(semuaAktif.puncak)}, dan puncak ${koma(satuJam.puncak, 1)} tampil ${duaAngka(satuJam.puncak)}.`);
    harus(`Pilih Semua aktif, dan puncak naik lima kali, dari ${koma(T4.puncak, 1)} ke ${koma(semuaAktif.puncak, 1)} request per detik. Dengan W 20 ms, L menjadi ${koma(semuaAktif.puncak, 1)} × ${koma(W, 2)} = ${koma(semuaAktif.puncak * W, 1)}, di atas batas ${BATAS_L} untuk pool ${POOL} (Hitungan; W Asumsi).`);
    harus(`Pilih Satu jam, dan ${ribu(T4.reqHari)} ÷ ${ribu(3600)} = ${koma(satuJam.puncak, 1)} request per detik, atau L ${koma(satuJam.puncak * W, 2)} (Hitungan).`);
    expect(semuaAktif.puncak / T4.puncak).toBeCloseTo(5, 10);
    expect(semuaAktif.puncak * W).toBeGreaterThan(BATAS_L);
    expect(satuJam.puncak * W).toBeLessThan(BATAS_L);
    expect(satuJam.puncak).toBeCloseTo(T4.reqHari / 3600, 10);
    expect([duaAngka(T4.rata), duaAngka(T4.puncak), duaAngka(semuaAktif.puncak), duaAngka(satuJam.puncak)]).toEqual(["14", "140", "690", "330"]);
    harus('Jadi "tidak sesak" berlaku untuk 138,9 request per detik, bukan untuk setiap skenario.');
  });
});

describe("rekaman api-t4 beban.txt bagian A dan B: batas di satu laptop, bukan kapasitas produksi", () => {
  const B = baris(beban);
  const awalA = B.nomor((x) => x.startsWith("# --- A. "));
  const awalB = B.nomor((x) => x.startsWith("# --- B. "));
  const bagA = B.antara(awalA, awalB - 1);
  const bagB = B.antara(awalB, B.b.length);
  test("bagian A: jadwal tetap 138,9 selama 20 detik = 2.778 permintaan, semua selesai, status 200 dan 201, batas p95, jadwal, koneksi, pool", () => {
    expect(bagA).toContain(`$ ./beban -rps ${RPS} -detik ${LAMA} -pengguna 200   # keluaran mesin diperiksa terhadap batas; nilai mentah bergantung mesin dan tidak direkam`);
    expect(RPS).toBe(138.9);
    expect(koma(RPS, 1)).toBe(koma(T4.puncak, 1));
    const total = Math.floor(RPS * LAMA);
    expect(total).toBe(2778);
    expect(bagA).toContain(`permintaan dijadwalkan: ${total} (= ⌊${RPS} × ${LAMA}⌋)`);
    expect(bagA).toContain(`permintaan selesai: ${total} dari ${total}`);
    const [, baca200, bayar201] = cocok(bagA, /status: 200 x(\d+), 201 x(\d+)\s+# 200 = baca, 201 = bayar/);
    expect(Number(baca200) + Number(bayar201)).toBe(total);
    expect([baca200, bayar201]).toEqual(["2483", "295"]);
    expect(bagA).toContain("p95 di bawah 500 ms (batas lab, Asumsi; nilai ukur tidak direkam): ya");
    expect(bagA).toContain("jadwal tidak tertinggal lebih dari 100 ms (generator tidak jadi penghambat): ya");
    expect(bagA).toContain("koneksi database dari api-t4 (pg_stat_activity, disampel tiap 100 ms): paling banyak <= 10 (pool 10; batas ini dipasang pool sendiri, jadi bukan bukti pool tidak sesak)");
    expect(bagA).toContain("pool setelah beban: maks 10");
    expect(beban.split("\n").slice(0, 8).join("\n")).toContain("Dijalankan di laptop lab: bukan kapasitas produksi.");
    harus("2.778 dari 2.778 permintaan selesai tanpa error");
    harus(`Semua ${ribu(total)} selesai tanpa error: ${ribu(Number(baca200))} baca (200) dan ${bayar201} pembayaran (201).`);
    harus("Nilai p95 yang terukur tidak direkam. Rekaman hanya menulis bahwa p95 di bawah 500 ms, batas lab (Asumsi).");
    harus("lab menjadwalkan 138,9 request per detik selama 20 detik ke satu proses API di satu laptop.");
    harus(`Lab menjadwalkan permintaan ke-i pada detik i ÷ ${koma(RPS, 1)} tanpa menunggu jawaban sebelumnya, selama ${LAMA} detik: ${koma(RPS, 1)} × ${LAMA} = ${ribu(total)} permintaan.`);
  });
  test("kode run.py rekam_beban: batas p95 500 dan lag 100 ditulis di kode, server -lab tanpa worker di bagian A, worker -sekali hanya di bagian B", () => {
    const fungsi = runPy.slice(runPy.indexOf("def rekam_beban():"), runPy.indexOf("# ---------- testing.txt"));
    expect(fungsi.length).toBeGreaterThan(500);
    const sebelumB = fungsi.slice(0, fungsi.indexOf('bagian("B. '));
    const sesudahB = fungsi.slice(fungsi.indexOf('bagian("B. '));
    expect(sebelumB).toContain('mulai_semua(["-lab"]');
    expect(sebelumB).toContain("batas_p95 = 500");
    expect(sebelumB).toContain("m['lag_maks_ms'] < 100");
    expect(sebelumB).not.toMatch(/\bd\.worker\(|mulai_worker\(|-peran/);
    expect(hitung(sesudahB, "d.worker(")).toBe(1);
    expect(hitung(fungsi, "d.worker(")).toBe(1);
    expect(sesudahB).toContain("harap(dekat, True,");
    expect(sesudahB).toContain("abs(laju - 4 / 0.3) / (4 / 0.3) <= 0.15");
    harus("Bagian A tidak menjalankan worker (dibaca dari `run.py`, Tidak dijalankan), jadi notifikasi tidak ikut diukur di sana.");
  });
  test("bagian B: 100 notifikasi kelas 1 dikuras satu worker, c = 4 dan t = 300 ms, laju dalam 15% dari 13,3; hitungan 7.500 detik Tidak dijalankan", () => {
    expect(bagB).toContain(`$ ./api-t4 -peran worker -sekali   # c = ${SERENTAK} pengirim serentak (bawaan), push tiruan ${T_KIRIM * 1000} ms per pesan`);
    expect(bagB).toContain("terkirim: 100 dari 100");
    expect(bagB).toContain(`laju terukur dalam 15% dari ${koma(KAPASITAS, 1)} per detik: ya (nilai ukur tidak direkam)`);
    expect(bagB).toContain("# Pengumuman ke 100.000 HP: 100.000 ÷ 13,3 = 7.500 detik = 125 menit. Hitungan dari c ÷ t, Tidak dijalankan:");
    expect(bagB).toContain("# lab tidak menulis 100.000 baris outbox dan tidak mengirimnya; angka itu diekstrapolasi dari laju yang baru diukur.");
    expect(bagB).toContain("hitungan: 100000 / (4 / 0,3) = 7500 detik");
    expect(runPy).toContain("SELECT 10000 + i, 1, 'promo'");
    expect(runPy).toContain("generate_series(1, 100)");
    harus("Bagian B memasukkan 100 notifikasi dan satu worker menguras semuanya:");
    harus("Laju terukur dalam 15% dari 13,33 per detik, dan nilainya tidak direkam. Rekaman memeriksa rumus c ÷ t, bukan lama pengiriman di produksi.");
    harus("Kapasitas worker adalah c ÷ t: c pengirim serentak (bawaan 4 di `worker.go`) dibagi t, lama satu pengiriman, 0,3 detik pada push tiruan (Asumsi).");
    expect(workerGo).toContain("Serentak      int           // pengirim serentak (c); kapasitas = c ÷ t");
  });
  test("Snippet: empat potongan; nomor baris dihitung dari jangkar di rekaman dan kode; judul memuat nomor yang sama", () => {
    const awal = B.nomor((x) => x.startsWith("$ ./beban -rps"));
    const akhir = B.nomor((x) => x.startsWith("pool setelah beban: maks"));
    const awalBB = B.nomor((x) => x.startsWith("$ ./api-t4 -peran worker -sekali"));
    const akhirBB = B.nomor((x) => x.startsWith("hitungan: 100000"));
    const G = baris(mainGo);
    const aPool = G.nomor((x) => x.includes("db.SetMaxOpenConns(pool)"));
    const J = baris(bebanGo);
    const aJadwal = J.nomor((x) => x.includes("jadwal := mulai.Add("));
    const akJadwal = J.nomor((x) => x.includes("lagMaks.Store(lag)")) + 1;
    expect(G.b[aPool]).toContain("db.SetMaxIdleConns(pool)");
    expect(J.b[akJadwal - 1]).toBe("\t\t}");
    expect(tagSnippet()).toEqual([
      { berkas: "labs/api-t4/output/beban.txt", lines: `${awal}:${akhir}`, lang: undefined, judul: `Rekaman lab: labs/api-t4/output/beban.txt baris ${awal} sampai ${akhir} (bagian A, beban berjadwal)` },
      { berkas: "labs/api-t4/cmd/api/main.go", lines: `${aPool}:${aPool + 1}`, lang: "go", judul: `Kode lab: labs/api-t4/cmd/api/main.go baris ${aPool} sampai ${aPool + 1} (batas pool)` },
      { berkas: "labs/api-t4/cmd/beban/main.go", lines: `${aJadwal}:${akJadwal}`, lang: "go", judul: `Kode lab: labs/api-t4/cmd/beban/main.go baris ${aJadwal} sampai ${akJadwal} (selisih jadwal)` },
      { berkas: "labs/api-t4/output/beban.txt", lines: `${awalBB}:${akhirBB}`, lang: undefined, judul: `Rekaman lab: labs/api-t4/output/beban.txt baris ${awalBB} sampai ${akhirBB} (bagian B, kapasitas worker)` },
    ]);
    expect(awal).toBe(9);
    expect(akhir).toBe(16);
    expect(awalBB).toBe(23);
    expect(akhirBB).toBe(29);
    // bentuk utuh baris Snippet dikunci di sini: tanpa atribut lain
    expect(mdx.split("\n").filter((x) => x.startsWith("<Snippet"))).toEqual([
      `<Snippet file="labs/api-t4/output/beban.txt" lines="${awal}:${akhir}" title="Rekaman lab: labs/api-t4/output/beban.txt baris ${awal} sampai ${akhir} (bagian A, beban berjadwal)" />`,
      `<Snippet file="labs/api-t4/cmd/api/main.go" lines="${aPool}:${aPool + 1}" lang="go" title="Kode lab: labs/api-t4/cmd/api/main.go baris ${aPool} sampai ${aPool + 1} (batas pool)" />`,
      `<Snippet file="labs/api-t4/cmd/beban/main.go" lines="${aJadwal}:${akJadwal}" lang="go" title="Kode lab: labs/api-t4/cmd/beban/main.go baris ${aJadwal} sampai ${akJadwal} (selisih jadwal)" />`,
      `<Snippet file="labs/api-t4/output/beban.txt" lines="${awalBB}:${akhirBB}" title="Rekaman lab: labs/api-t4/output/beban.txt baris ${awalBB} sampai ${akhirBB} (bagian B, kapasitas worker)" />`,
    ]);
    const bagian: [string, number, number][] = [["labs/api-t4/output/beban.txt", awal, akhir], ["labs/api-t4/cmd/api/main.go", aPool, aPool + 1], ["labs/api-t4/cmd/beban/main.go", aJadwal, akJadwal], ["labs/api-t4/output/beban.txt", awalBB, akhirBB]];
    for (const [berkas, a, z] of bagian) {
      const isi = bersihkanRujukanInternal(baris(baca(berkas)).antara(a, z));
      expect(isi, `${berkas}:${a}:${z}`).not.toMatch(POLA_ID_INTERNAL);
      expect(isi, `${berkas}:${a}:${z}`).not.toMatch(/KONSISTENSI|tinjauan|peninjau/i);
    }
  });
});

describe("kode lab: batas pool dipasang pool sendiri; jadwal diukur sesudah tidur; campuran beban tanpa laporan", () => {
  test("SetMaxOpenConns(pool) dan SetMaxIdleConns(pool): koneksi paling banyak 10 tidak bisa gagal", () => {
    const G = baris(mainGo);
    const a = G.nomor((x) => x.includes("db.SetMaxOpenConns(pool)"));
    expect(G.b[a - 1]).toBe("\tdb.SetMaxOpenConns(pool)");
    expect(G.b[a]).toBe("\tdb.SetMaxIdleConns(pool)");
    expect(mainGo).toContain("func bukaDB(url string, pool int, idleTx time.Duration, peran string) (*sql.DB, error) {");
    harus("Pool tidak bisa melewati batas itu, jadi baris rekaman tersebut tidak bisa gagal.");
    harus("Koneksi paling banyak 10 adalah batas yang dipasang pool sendiri:");
    expect(POOL).toBe(10);
  });
  test("jadwal: time.Sleep(time.Until(jadwal)) lalu lag = time.Since(jadwal); permintaan di goroutine, jadi generator tidak menunggu jawaban server", () => {
    const J = baris(bebanGo);
    const a = J.nomor((x) => x.includes("jadwal := mulai.Add("));
    expect(J.b.slice(a - 1, a + 4).map((x) => x.trim())).toEqual([
      "jadwal := mulai.Add(time.Duration(float64(i) / *rps * float64(time.Second)))",
      "time.Sleep(time.Until(jadwal))",
      "if lag := time.Since(jadwal).Milliseconds(); lag > lagMaks.Load() {",
      "lagMaks.Store(lag)",
      "}",
    ]);
    const putaran = bebanGo.slice(bebanGo.indexOf("for i := 0; i < total; i++ {"), bebanGo.indexOf("wg.Wait()"));
    expect(putaran.indexOf("time.Sleep(time.Until(jadwal))")).toBeLessThan(putaran.indexOf("time.Since(jadwal)"));
    expect(putaran.indexOf("time.Since(jadwal)")).toBeLessThan(putaran.indexOf("go func() {"));
    expect(putaran.indexOf("klien.Do(req)")).toBeGreaterThan(putaran.indexOf("go func() {"));
    harus("Kode mengukur selisih antara jadwal dan saat generator berhenti tidur, tanpa menunggu jawaban server.");
    harus("Jadwal itu syarat agar p95 berarti, bukan bukti untuk pool.");
    harus("Jadwal yang tidak tertinggal lebih dari 100 ms hanya menunjukkan bahwa generator mengirim tepat waktu:");
  });
  test("campuran beban: hanya baca saldo, riwayat 20 baris, katalog, dan POST /transfers; tanpa kueri laporan di cmd/beban; pemindai diuji pada contoh", () => {
    const punyaLaporan = (teks: string) => /laporan|report|rekap|agregat/i.test(teks);
    expect(punyaLaporan('req, _ = http.NewRequest("GET", url+"/laporan/warung", nil)')).toBe(true);
    expect(punyaLaporan("riwayat?batas=20")).toBe(false);
    const jalur = [...bebanGo.matchAll(/http\.NewRequest\("(GET|POST)", ([^\n]+?)(?:, nil\)|,\n)/g)].map((m) => `${m[1]} ${m[2]}`);
    expect(jalur).toEqual([
      'GET fmt.Sprintf("%s/akun/%d", *url, akun[u])',
      'GET fmt.Sprintf("%s/akun/%d/riwayat?batas=20", *url, akun[u])',
      'GET *url+"/katalog"',
      'POST *url+"/transfers"',
    ]);
    const berkasBeban = (terlacak ? [...terlacak] : []).filter((f) => f.startsWith("labs/api-t4/cmd/beban/"));
    expect(berkasBeban.sort()).toEqual(["labs/api-t4/cmd/beban/main.go", "labs/api-t4/cmd/beban/portlab.go"]);
    for (const f of berkasBeban) expect(punyaLaporan(baca(f)), f).toBe(false);
    expect(bebanGo).toContain("case jenis < 50:");
    expect(bebanGo).toContain("case jenis < 75:");
    expect(bebanGo).toContain("case jenis < 90:");
    harus("Campuran `make beban` hanya baca saldo, riwayat 20 baris, katalog, dan pembayaran (dibaca dari `cmd/beban/main.go`); tidak ada kueri laporan");
  });
  test("campuran lab 10% pembayaran lawan 5% di hitungan naskah: 295 ÷ 2.778 = 10,6% dan 6,94 ÷ 138,9 = 5,0%", () => {
    const bayar = 295;
    const total = 2778;
    expect(koma((bayar / total) * 100, 1)).toBe("10,6");
    expect(koma((trxDetik4 / T4.puncak) * 100, 1)).toBe("5,0");
    expect((bayar / total) / (trxDetik4 / T4.puncak)).toBeGreaterThan(2);
    expect(bebanGo).toMatch(/default:\s+req, _ = http\.NewRequest\("POST", \*url\+"\/transfers",/);
    harus(`Campuran lab membayar dua kali lebih sering daripada hitungan naskah: ${bayar} ÷ ${ribu(total)} = ${koma((bayar / total) * 100, 1)}% request, sedangkan ${koma(trxDetik4, 2)} ÷ ${koma(T4.puncak, 1)} = ${koma((trxDetik4 / T4.puncak) * 100, 1)}% (Hitungan).`);
    expect(baca("labs/api-t4/README.md")).toContain("Campuran 50% baca saldo, 25% riwayat 20 baris, 15% katalog, 10% pembayaran");
  });
});

describe("klaim negatif dan perbandingan berlingkup, dijaga pemindaian berkas terlacak", () => {
  test('"belum ada" top-up dari bank di Tahap 3: api-t3 tanpa tabel topup_bank, dan Tahap 3 menyebut top-up dari bank hanya sebagai isi PRD v4', () => {
    const berkasT3 = (terlacak ? [...terlacak] : []).filter((f) => f.startsWith("labs/api-t3/") && /\.(go|sql|py|md|yaml|txt|sh)$/.test(f));
    expect(berkasT3.length).toBeGreaterThan(20);
    const kena = berkasT3.filter((f) => /topup_bank|top-up dari bank|top-up bank/i.test(baca(f)));
    expect(kena, "api-t3 menyebut top-up dari bank").toEqual([]);
    expect(/topup_bank/.test("CREATE TABLE topup_bank (id)")).toBe(true);
    const berkasT4 = (terlacak ? [...terlacak] : []).filter((f) => f.startsWith("labs/api-t4/migrasi/") && f.endsWith(".up.sql"));
    expect(berkasT4.some((f) => /topup_bank/.test(baca(f)))).toBe(true);
    expect(naskah3).toContain("PRD v4 tampil di halaman terakhir Tahap 3. Isinya:");
    expect(naskah3).toContain("- Top-up dari rekening bank lewat gateway.");
    harus("| Top-up dari bank per detik | belum ada |");
  });
  test("tiga hal belum diuji: tabel sama dengan baris M39 dan halaman asal; 20 sampai 40 orang dari PROPOSAL; ±50 developer belum bersumber", () => {
    harus("| Hal baru di PRD v5 | Yang ada di Tahap 4 | Dibaca di |");
    harus("| Laporan merchant real-time di database yang sama dengan transaksi | Campuran `make beban` hanya baca saldo, riwayat 20 baris, katalog, dan pembayaran (dibaca dari `cmd/beban/main.go`); tidak ada kueri laporan | [[t4-skema]] |");
    harus(`| Notifikasi massal lewat satu worker | Worker ${Math.round(pakai4 * 100)}% di puncak dan tersisa ${koma(KAPASITAS - notif4, 2)} per detik; 100 notifikasi terkirim di lab, ${ribu(reg4.user)} Tidak dijalankan | [[t3-m27]] |`);
    harus("| 13 orang menjadi 20 sampai 40 di satu repo | Tiga tim di satu repo dengan batas modul; bentrok pertama muncul di M32 | [[t4-modul]] |");
    const ringkasan = barisPeta();
    expect(ringkasan).toContain("20–40 (5–7 tim + platform + SRE + security)");
    expect(naskah).toContain("Tim naik dari 13 menjadi 20 sampai 40 orang dalam 5 sampai 7 tim, ditambah platform, SRE, dan security (PROPOSAL).");
    harus("Angka 20 sampai 40 orang berasal dari PROPOSAL (Asumsi).");
    // ambang ±50 developer: naskah menulis, 4.13 tidak menemukan sumber primer, halaman ini tidak memakainya sebagai pembanding
    expect(hal313).toContain("Naskah menyebut heuristik praktisi bahwa microservices baru masuk akal di atas ±50 developer.");
    expect(hal313).toContain("Pencarian 2026-10-29 tidak menemukan sumber primer untuk angka itu");
    expect(hal313).toContain("Halaman ini tidak memakainya sebagai pembanding.");
    harus("Naskah juga menyebut ambang ±50 developer untuk microservices, tetapi sumber primernya tidak ditemukan [perlu verifikasi], dan halaman ini tidak memakainya sebagai pembanding.");
    expect(hitung(badan, "±50")).toBe(1);
    expect(hitung(badan, "[perlu verifikasi]")).toBe(1);
    expect(riset).toContain("Ambang jumlah developer: pencarian 2026-10-29 tidak menemukan sumber primer");
    expect(dari("t4-modul").adr).toEqual([37]);
  });
  test("ADR 37 dan hitungan: beban bukan alasan memecah; kapan salah; 13 developer dan 6,94 transaksi uang per detik; dua instance dari 3.15", () => {
    expect(hal313).toContain("Bebannya bukan alasan memecah.");
    expect(hal313).toContain("- Saat satu modul punya profil beban atau tim yang membuat deploy bersama tidak lagi masuk akal. Dari 13 developer dan 6,94 transaksi uang per detik, itu belum terlihat (Asumsi).");
    expect(hal313).toContain("Kapasitas satu server tetap belum terukur.");
    harus("ADR 37 memilih modular monolith dan satu service pembayaran karena tiga tim bentrok di [[t4-m32]], dan menulis bahwa beban bukan alasan memecah.");
    harus("Ia juga menulis kapan keputusannya salah: saat satu modul punya profil beban atau tim yang membuat deploy bersama tidak lagi masuk akal. Dari 13 developer dan 6,94 transaksi uang per detik, itu belum terlihat (Asumsi).");
    expect(naskah).toContain("Satu VPS menjalankan dua instance API, satu worker, satu Redis, dan staging.");
    harus("Hitungan koneksi memakai dua instance API ([[t3-dua-instance]]), dan tiap instance dengan pool 10 menambah 10 dari 100 koneksi.");
    expect(2 * 10).toBe(20);
    expect(KONEKSI4 - 2 * 10).toBe(20);
    expect(dari("t3-dua-instance").adr).toEqual([26]);
    harus("Dugaan Raka tentang server lebih besar belum bisa dijawab: CPU dan memori tidak ikut dihitung, dan kapasitas server tidak pernah diukur.");
    harus("Kapasitas server produksi belum diukur: `make beban` memakai satu proses, satu laptop, dan 20 detik.");
    expect(hal328).toContain("Kapasitas satu server tetap belum diukur.");
    expect(hal329).toContain("tidak satu komponen pun melewati batasnya hanya karena jumlah request");
  });
});

function barisPeta(): string {
  return proposal.split("\n").find((b) => /^\| 5 \| 100rb–1jt \| 20–40/.test(b)) ?? "";
}

describe("diagram Rantai: nilai simpul diturunkan dari angka halaman dan rekaman", () => {
  test("dua baris; sumber berlabel asumsi (label terlemah) dengan rujukan beban.txt bagian A; simpul memakai puncak, worker, p95, dan tiga hal PRD v5", () => {
    expect(diagram.baris.length).toBe(2);
    expect(diagram.sumber.jenis).toBe("asumsi");
    expect(diagram.sumber.teks).toBe("Hitungan atas Asumsi naskah dan registry; rekaman lab api-t4, beban.txt bagian A, hanya untuk batas di satu laptop");
    const [a, b] = diagram.baris as [(typeof diagram.baris)[number], (typeof diagram.baris)[number]];
    expect(a.simpul.map((s) => s.teks)).toEqual([`Puncak ${koma(T4.puncak, 1)} per detik`, `Worker ${Math.round(pakai4 * 100)}%`, "p95 di bawah 500 ms"]);
    expect(a.simpul.map((s) => s.sub)).toEqual([`naik ${T4.puncak / T3.puncak} kali, Hitungan`, `naik dari ${koma(pakai3 * 100, 1)}%, Hitungan`, `satu laptop, ${LAMA} detik`]);
    expect([a.label, a.sub]).toEqual(["Dihitung dan direkam", "Tahap 4"]);
    expect(a.simpul.map((s) => s.nada)).toEqual(["system", "system", "good"]);
    expect(b.simpul.map((s) => s.teks)).toEqual(["Laporan dan transaksi", "Notifikasi massal", `${20} sampai ${40} orang`]);
    expect(b.simpul.map((s) => s.sub)).toEqual(["satu database", "satu worker", "satu repo"]);
    expect(b.simpul.map((s) => s.nada)).toEqual(["warn", "warn", "warn"]);
    expect([b.label, b.sub]).toEqual(["Belum pernah diuji", "diminta PRD v5"]);
    expect(diagram.catatan).toBe("Puncak dan worker adalah Hitungan atas Asumsi. p95 di bawah 500 ms adalah batas lab dari rekaman, bukan kapasitas produksi, dan kapasitas satu server belum terukur.");
    expect(diagram.judul).toBe("Yang dihitung dan direkam di Tahap 4, dan yang diminta PRD v5");
    expect(beban).toContain("p95 di bawah 500 ms");
    expect(JSON.stringify(diagram)).not.toMatch(POLA_ID_INTERNAL);
    expect(JSON.stringify(diagram)).not.toMatch(/\d\s?B\b/);
    expect(hitung(badan, "<Rantai data={batas} ringkas />")).toBe(1);
    expect(hitung(mdx, 'import batas from "../../../../data/diagram/t4-m39-batas.json";')).toBe(1);
    expect(badan.indexOf("<Rantai data={batas} ringkas />")).toBeGreaterThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(badan.indexOf("<Rantai data={batas} ringkas />")).toBeLessThan(badan.indexOf('<Blok nama="Coba sendiri">'));
    // Inti hasil-dulu: satu kalimat pendek sebelum Rantai, dua paragraf sesudahnya
    const inti = badan.slice(badan.indexOf('<Blok nama="Yang sebenarnya">'), badan.indexOf("<Rantai data={batas} ringkas />")).split("\n").filter((x) => x.trim() && !x.startsWith("<"));
    expect(inti).toEqual(["Puncak naik 8 kali, tetapi di hitungan halaman ini tidak ada komponen yang melewati batasnya karena jumlah request."]);
    expect(inti[0]!.length).toBeLessThanOrEqual(175);
    const sesudah = badan.slice(badan.indexOf("<Rantai data={batas} ringkas />") + "<Rantai data={batas} ringkas />".length).split("\n").filter((x) => x.trim());
    expect(sesudah[0]).toMatch(/^Yang terdekat ke batasnya adalah worker notifikasi/);
    expect(sesudah[1]).toMatch(/^PRD v5 meminta tiga hal yang belum pernah diuji di Tahap 4\./);
    expect(sesudah[2]).toMatch(/^\*\*Angka Tahap 4 dihitung dengan rumus Tahap 3\.\*\*/);
    expect(b.simpul[2]!.teks).toBe(`${riset.includes("PROPOSAL baris 317") ? 20 : 20} sampai 40 orang`);
    expect(barisPeta()).toContain("20–40");
  });
});

describe("widget kalkulator: konfigurasi dihitung mesin yang sama dengan widget, dan teks widget selaras dengan halaman", () => {
  const asumsi = DaftarAsumsi.parse(cerita.tahap.map((t) => t.asumsi));
  const skenario = siapkan(kalk, asumsi);
  test("satu Kalkulator dengan asumsi dari registry; tiga skenario Tahap 4: dasar, semua aktif (aktif 100), satu jam (faktor puncak 86.400 ÷ 3.600)", () => {
    expect(hitung(badan, "<Kalkulator client:visible data={dataKalkulator} asumsi={cerita.tahap.map((t) => t.asumsi)} />")).toBe(1);
    expect(hitung(mdx, 'import Kalkulator from "../../../widgets/kalkulator/Kalkulator.tsx";')).toBe(1);
    expect(hitung(mdx, 'import dataKalkulator from "../../../../data/widget/t4-m39-kalkulator.json";')).toBe(1);
    expect(hitung(mdx, 'import cerita from "../../../../data/cerita.json";')).toBe(1);
    expect(kalk.skenario).toEqual([{ label: "Tahap 4", tahap: 4 }, { label: "Semua aktif", tahap: 4, ubah: { aktif: 100 } }, { label: "Satu jam", tahap: 4, ubah: { puncak: DETIK / 3600 } }]);
    expect(kalk.awal).toBe(0);
    expect(skenario[0]).toEqual(asumsi[3]);
    expect(skenario[1]!.aktif).toBe(100);
    expect(skenario[2]!.puncak).toBe(24);
    expect(kalk.sumber).toEqual({ jenis: "asumsi", teks: "Asumsi naskah dari cerita.json, bukan pengukuran." });
    expect(kalk.label.sumber).toBe("Asumsi");
    expect(kalk.label.kesimpulan).toBe("Di jam paling ramai, satu request datang kira-kira tiap {jarak}.");
    expect(kalk.judul).toBe("Beban di jam paling ramai, Tahap 4");
    harus("Angka 138,9 adalah Asumsi, dan lab tidak mengukur kapasitas produksi.");
    harus("lalu ubah satu hal: ganti skenario dan lihat baris mana yang berubah.");
  });
  test("tebakan: 100 ÷ 20 = 5 kali, jawaban di pilihan keempat (beda dari kalkulator Tahap 1 sampai 3), bukan pilihan terpanjang; alasan memakai 138,9 dan 694,4", () => {
    const rasio = semuaAktif.puncak / T4.puncak;
    expect(rasio).toBeCloseTo(5, 10);
    expect(kalk.tebak.pilihan[kalk.tebak.jawaban]).toBe(`${rasio} kali`);
    expect(kalk.tebak.pilihan.indexOf("10 kali"), "distraktor: user terdaftar tetap 100.000, jadi 10 kali salah").toBeGreaterThanOrEqual(0);
    expect(kalk.tebak.pilihan.indexOf(`${100 / 25} kali`), "distraktor: 100 ÷ 25 = 4 dari Tahap 3").toBeGreaterThanOrEqual(0);
    expect(kalk.tebak.jawaban).toBe(3);
    expect(kalk.tebak.skenario).toBe(1);
    expect(kalk.skenario[kalk.tebak.skenario]!.label).toBe("Semua aktif");
    const lain = ["t1-m8-kalkulator", "t2-estimasi-kalkulator", "t3-estimasi-kalkulator", "t3-m28-kalkulator", "t1-estimasi-kalkulator"].map((n) => DataKalkulator.parse(JSON.parse(baca(`situs/data/widget/${n}.json`))).tebak.jawaban);
    expect(lain).toEqual([1, 1, 2, 2, 0]);
    expect(lain).not.toContain(kalk.tebak.jawaban);
    const terpanjang = Math.max(...kalk.tebak.pilihan.map((p) => p.length));
    expect(kalk.tebak.pilihan[kalk.tebak.jawaban]!.length).toBeLessThan(terpanjang);
    expect(kalk.tebak.q).toBe(`Seandainya semua ${ribu(reg4.user)} user terdaftar memakai Rekeningo setiap hari, bukan ${reg4.aktif}%. Berapa kali lipat puncak request per detik dibanding asumsi naskah?`);
    expect(kalk.tebak.alasan).toBe(`Persentase aktif naik dari ${reg4.aktif}% ke 100%, jadi puncak naik 100 ÷ ${reg4.aktif} = ${rasio} kali, dari ${koma(T4.puncak, 1)} ke ${koma(semuaAktif.puncak, 1)} request per detik. User terdaftar tetap ${ribu(reg4.user)}, jadi bukan 10 kali.`);
    expect(kalk.label.lanjut).toBe(`Sekarang pilih skenario “${kalk.skenario[kalk.tebak.skenario]!.label}” di atas tabel.`);
    harus("Pilih Semua aktif");
    harus("Pilih Satu jam");
  });
  test("tabel widget: nilai awal 100.000, 20.000, 1.200.000, 14, 140 dan jarak 7,2 ms sama dengan hitungan; semua skenario punya puncak naik dari asumsi", () => {
    const h = skenario.map((a) => hitungBeban(a));
    expect(h.map((x) => duaAngka(x.puncak))).toEqual(["140", "690", "330"]);
    expect(h.map((x) => jarakKal(x.jarak, SATUAN))).toEqual(["7,2 ms", "1,4 ms", "3,0 ms"]);
    expect(h[0]!.reqHari).toBe(T4.reqHari);
    expect(h[0]!.dau).toBe(T4.dau);
    expect(h[1]!.reqHari).toBe(semuaAktif.reqHari);
    expect(h[0]!.user).toBe(reg4.user);
  });
});

describe("kartu Cek diri: empat kartu sama dengan kartu.json dan fakta yang sama dengan hitungan, rekaman, dan naskah", () => {
  const soal = [...badan.matchAll(/^\*\*(\d+)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/gm)].map((m) => ({ n: m[1]!, tanya: m[2]!, jawab: m[3]!.replace(/\n\n/g, " ") }));
  test("empat soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya", () => {
    expect(soal.map((s) => s.n)).toEqual(["1", "2", "3", "4"]);
    expect(hitung(badan, '<details class="success">')).toBe(4);
    const k = kartu.filter((x) => x.halaman === "t4-m39");
    expect(k.map((x) => x.id)).toEqual(["t4-m39-1", "t4-m39-2", "t4-m39-3", "t4-m39-4"]);
    k.forEach((x, i) => {
      expect(x.judul).toBe("4.27 M39: Uji coba publik lolos, PRD v5 datang");
      expect(x.url).toBe("tahap-4/m39-prd-v5/");
      expect(x.tanya).toBe(soal[i]!.tanya);
      expect(x.jawab).toBe(soal[i]!.jawab);
    });
  });
  test("jawaban memuat fakta yang sama dengan hitungan dan rekaman: 17,4 ke 138,9, 10 × 0,8 × 1 = 8, batas pool, 13,33, 125 menit, tiga hal PRD v5", () => {
    expect(soal[0]!.tanya).toBe(`Puncak request naik dari ${koma(T3.puncak, 1)} ke ${koma(T4.puncak, 1)} per detik, padahal user naik ${reg4.user / reg3.user} kali. Kenapa hanya ${T4.puncak / T3.puncak} kali?`);
    expect(soal[0]!.jawab).toContain(`User aktif turun dari ${reg3.aktif}% ke ${reg4.aktif}%, jadi pengali kedua ${koma(reg4.aktif / reg3.aktif, 1)}, dan request per user tetap ${reg4.req}. Hasil kalinya ${reg4.user / reg3.user} × ${koma(reg4.aktif / reg3.aktif, 1)} × ${reg4.req / reg3.req} = ${T4.puncak / T3.puncak} (Hitungan atas Asumsi).`);
    expect(soal[1]!.tanya).toBe(`Rekaman beban menulis koneksi paling banyak ${POOL}. Kenapa itu bukan bukti pool tidak sesak?`);
    expect(soal[1]!.jawab).toContain(`Batas ${POOL} dipasang pool sendiri, jadi pool tidak bisa melewatinya. Jadwal yang tidak tertinggal hanya menunjukkan generator tepat waktu. Yang melihat jawaban server hanya p95 di bawah 500 ms, dan itu batas lab, bukan kapasitas produksi.`);
    expect(soal[2]!.tanya).toBe(`Worker terpakai ${Math.round(pakai4 * 100)}%, dan pengumuman ke ${ribu(reg4.user)} HP dihitung ${(reg4.user * T_KIRIM) / SERENTAK / 60} menit. Apa label masing-masing, dan apa yang tidak dijalankan lab?`);
    expect(soal[2]!.jawab).toContain(`kapasitas ${SERENTAK} ÷ ${koma(T_KIRIM, 1)} = ${koma(KAPASITAS, 2)} per detik, dengan lama pengiriman ${koma(T_KIRIM, 1)} detik sebagai Asumsi.`);
    expect(soal[2]!.jawab).toContain(`Lab hanya menguras 100 notifikasi dan memeriksa laju dalam 15% dari ${koma(KAPASITAS, 2)} per detik. Lab tidak menulis atau mengirim ${ribu(reg4.user)} baris, dan ${(reg4.user * T_KIRIM) / SERENTAK / 60} menit adalah batas bawah karena worker juga mengirim notifikasi uang.`);
    expect(soal[3]!.tanya).toBe("Sebutkan tiga hal yang diminta PRD v5 dan belum pernah diuji di Tahap 4.");
    expect(soal[3]!.jawab).toContain("Laporan merchant real-time di database yang sama dengan transaksi, notifikasi massal lewat satu worker, dan 13 orang menjadi 20 sampai 40 di satu repo. Campuran beban lab hanya baca saldo, riwayat, katalog, dan pembayaran.");
    expect(barisMdxBaris("M39")).toContain("Yang belum pernah diuji: laporan merchant dan transaksi di satu database, satu worker untuk notifikasi massal, dan 13 orang menjadi 20 sampai 40 di satu repo");
  });
});

function barisMdxBaris(nomor: string): string {
  return naskah.split("\n").find((b) => b.startsWith(`| ${nomor} |`)) ?? "";
}

describe("struktur halaman: tingkat heading, daftar, label, dan tanpa ID internal", () => {
  test("hanya satu heading (h3 Cek diri, di blok terakhir); satu tebakan details question; tanpa daftar bernomor; tujuh butir daftar di Konsep yang lahir; dua tabel; empat Snippet; satu Kalkulator", () => {
    const heads = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(heads).toEqual(["### Cek diri"]);
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(hitung(badan, '<details class="question">')).toBe(1);
    expect(hitung(badan, "<details>")).toBe(0);
    expect(badan).not.toMatch(/^\d+\. /m);
    expect(hitung(badan, "\n- [[")).toBe(7);
    expect(badan.split("\n").filter((b) => /^\|---/.test(b)).length).toBe(2);
    expect(hitung(badan, "<Snippet ")).toBe(4);
    expect(hitung(badan, "<Kalkulator ")).toBe(1);
    expect(hitung(badan, "<noscript")).toBe(0);
  });
  test("jawaban tebakan dan butir Konsep yang lahir sama dengan naskah dan halaman tetangga", () => {
    harus("Hanya bahwa satu proses di satu laptop menjawab semua permintaan berjadwal dalam batas yang dipasang lab.");
    harus("Blok berikutnya memisahkan yang dihitung, yang direkam, dan yang belum diuji.");
    harus("- [[t4-estimasi]]: estimasi Tahap 4 → 5. Beban PRD v5 dihitung dari angka Tahap 4 sebelum memilih komponen.");
    harus("- [[t4-modul]]: modular monolith dan batas modul, jawaban atas dugaan satu service per modul.");
    harus("- [[t3-pool]]: L = λ × W menghitung koneksi yang terpegang. Hitungan 2,78 di halaman ini memakainya.");
    harus("- [[t3-m28]]: pertanyaan yang sama di Tahap 3, dengan puncak 17,4 request per detik.");
    harus("- [[t3-estimasi]]: rumus puncak dan pemakaian worker yang sama untuk Tahap 3 → 4.");
    expect(dari("t3-m28").masalah).toContain("PRD v4");
    expect(dari("t4-estimasi").judul).toBe("Estimasi Tahap 4 → 5");
    expect(hal329).toContain("Pemakaian worker naik dari 6,5% ke 56%");
  });
  test("tanpa ID internal, tanpa emoji, tanpa tanda seru, tanpa kata yang dilarang gaya-bahasa, tanpa Anda atau kita; label dihitung", () => {
    expect(badan).not.toMatch(POLA_ID_INTERNAL);
    expect(frontmatter).not.toMatch(POLA_ID_INTERNAL);
    expect(badan).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(badan).not.toMatch(/!(?!\[)/);
    expect(badan).not.toMatch(/\b(Anda|kita|pengguna|mudah|cukup|tinggal)\b/i);
    expect(hitung(badan, "Rekaman lab:")).toBe(2);
    expect(hitung(badan, "Kode lab:")).toBe(2);
    expect(hitung(badan, "(Ilustrasi)")).toBe(3);
    expect(hitung(badan, "Ilustrasi")).toBe(4);
    expect(hitung(badan, "Tidak dijalankan")).toBe(4);
    expect(hitung(badan, "Asumsi")).toBeGreaterThanOrEqual(15);
    expect(hitung(badan, "(Hitungan")).toBeGreaterThanOrEqual(8);
    expect(hitung(badan, "Hitungan di halaman ini berarti")).toBe(1);
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("Hitungan di halaman ini berarti"));
    expect(badan.search(/\bp95\b/)).toBe(badan.indexOf("Hasilnya dilaporkan sebagai p95") + "Hasilnya dilaporkan sebagai ".length);
    expect(badan.indexOf("Hasilnya dilaporkan sebagai p95")).toBeLessThan(badan.indexOf("Tebak dulu: p95"));
  });
  test("istilah diberi arti di pemakaian pertama: p95, worker, pool, L, c, t, W, Hitungan; satu simbol satu besaran", () => {
    const pertama = (kata: string) => badan.search(new RegExp(`\\b${kata}\\b`));
    expect(pertama("p95")).toBe(badan.indexOf("Hasilnya dilaporkan sebagai p95") + "Hasilnya dilaporkan sebagai ".length);
    harus("Hasilnya dilaporkan sebagai p95, yaitu waktu jawab yang dilewati 5% request paling lambat.");
    expect(pertama("worker")).toBeLessThan(badan.indexOf("(proses yang mengirim notifikasi dari queue)"));
    expect(badan.indexOf("(proses yang mengirim notifikasi dari queue)") - pertama("worker")).toBeLessThan(80);
    expect(badan.search(/\b[Pp]ool\b/)).toBe(badan.indexOf("Pool adalah kumpulan koneksi database yang dipakai bergantian oleh request."));
    const pL = badan.search(/\bL\b/);
    expect(badan.slice(pL, badan.indexOf("L adalah rata-rata jumlah koneksi"))).not.toContain("\n\n");
    expect(badan.slice(0, pL).endsWith('**"Tidak sesak" berarti ')).toBe(true);
    expect(badan.search(/\bc\b/)).toBe(badan.indexOf("Kapasitas worker adalah c ÷ t: c pengirim") + "Kapasitas worker adalah ".length);
    expect(badan.search(/\bt\b/)).toBe(badan.indexOf("Kapasitas worker adalah c ÷ t") + "Kapasitas worker adalah c ÷ ".length);
    expect(badan.search(/\bW\b/)).toBeGreaterThan(badan.indexOf("L adalah rata-rata jumlah koneksi"));
    expect(badan.search(/\bW\b/)).toBeLessThan(badan.indexOf("memegang koneksi ([[t3-pool]])"));
    expect(badan.indexOf("dengan λ request per detik dan W lama satu request memegang koneksi")).toBeLessThan(badan.search(/\bW 20 ms/));
    // satu simbol satu besaran: L hanya koneksi; W hanya lama memegang koneksi; t hanya lama pengiriman; c hanya jumlah pengirim
    expect(hitung(badan, "W 20 ms")).toBe(2);
    expect(hitung(badan, "t = ")).toBe(0);
    expect(hitung(badan, "L = λ × W")).toBe(2);
  });
  test("front matter dikunci: title dan description memuat Minggu 12, uji coba publik, 8 kali, 56%, dan tiga hal PRD v5", () => {
    expect(frontmatter).toBe(
      'title: "4.27 M39: Uji coba publik lolos, PRD v5 datang"\ndescription: Minggu 12. Uji coba publik lolos, lalu Sinta datang dengan PRD v5. Puncak naik 8 kali dan worker notifikasi terpakai 56%, tetapi kapasitas satu server belum terukur dan tiga hal yang diminta PRD v5 belum pernah diuji.\n',
    );
  });
});

describe("dunia angka tertutup: tiap token angka dan konteksnya dihitung dari sumber, supaya mutasi yang membangkitkan ulang kunci kata tetap gagal", () => {
  test("rupiah di halaman: hanya Rp0 (selisih target naskah)", () => {
    const semua = [...badan.matchAll(/Rp\d+(?:\.\d{3})*/g)].map((m) => m[0]);
    expect(new Set(semua)).toEqual(new Set(["Rp0"]));
    expect(semua.length).toBe(2);
    expect(naskah).toContain("selisih Rp0 atau insiden tertutup dalam satu hari kerja selama 14 hari berturut-turut");
  });
  test("angka berkoma: himpunan token di badan sama dengan himpunan yang dihitung dari registry, rekaman, dan rumus; tiap nilai dipakai", () => {
    const k = (n: number, d: number) => koma(n, d);
    const boleh = new Set([
      k(T_KIRIM, 1), k(0.8, 1), k((trxDetik4 / T4.puncak) * 100, 1), k(pakai3 * 100, 1), k(notif4 / trxDetik3 / 1, 1), k(W, 2), k(TOPUP_PER_AKTIF, 2), k((295 / 2778) * 100, 1),
      k(KAPASITAS, 1), k(T4.rata, 1), k(T3.puncak, 1), k(L4, 2), k(BATAS_L / W / T4.puncak, 2), k(KAPASITAS - notif4, 2), k((7.52 / 13.33) * 100, 1), k(satuJam.puncak * W, 2),
      k(trxDetik4, 2), k(138.9 / 17.4, 2), k(((notifHari * 0.8) / 5400), 2), k(topupDetik, 3), k(trxDetik3, 3), k(KAPASITAS, 2), k(T4.puncak, 1), k(T3.puncak, 2),
      k(satuJam.puncak, 1), k(semuaAktif.puncak, 1), k(notif4, 3), k(notif4, 2), k(KAPASITAS, 3),
    ]);
    const token = [...badan.matchAll(/\d+,\d+/g)].map((m) => m[0]);
    expect([...new Set(token.filter((x) => !boleh.has(x)))], "token berkoma di halaman yang tidak dihitung dari sumber").toEqual([]);
    for (const b of boleh) expect(token, `nilai yang dihitung tidak dipakai halaman: ${b}`).toContain(b);
    expect(hitung(badan, "138,9")).toBe(14);
    expect(hitung(badan, "7,52")).toBe(9);
    expect(hitung(badan, "13,33")).toBe(9);
  });
  test("angka berpemisah ribuan: user, aktif, request per hari, jadwal, notifikasi, detik, jumlah permintaan lab", () => {
    const boleh = new Set([ribu(reg4.user), ribu(T4.dau), ribu(T4.reqHari), ribu(DETIK), ribu(3600), ribu(90 * 60), ribu(trxHari4), ribu(topupHari), ribu(notifHari), ribu(7500), "2.778", "2.483"]);
    const token = [...badan.matchAll(/\d{1,3}(?:\.\d{3})+/g)].map((m) => m[0]);
    expect([...new Set(token.filter((x) => !boleh.has(x)))]).toEqual([]);
    for (const b of boleh) expect(token, b).toContain(b);
    expect(ribu(90 * 60)).toBe("5.400");
  });
  test("bilangan bulat berkonteks: persen, menit, detik, ms, koneksi, dan hitungan kali dari sumber", () => {
    const himpunan = (re: RegExp) => new Set([...badan.matchAll(re)].map((m) => m[1]!));
    expect(himpunan(/(?<![\d,.])(\d+(?:,\d+)?)%/g)).toEqual(new Set([`${reg4.aktif}`, `${reg3.aktif}`, "5", "5,0", "10,6", "15", "40", "56", "56,4", "6,5", "72", "80"]));
    expect(himpunan(/(?<![\d,.])(\d+) menit/g)).toEqual(new Set(["10", "3", "90", "125"]));
    expect(himpunan(/(?<![\d,.])(\d+) ms/g)).toEqual(new Set(["500", "100", "20"]));
    expect(himpunan(/(?<![\d,.])(\d+) detik/g)).toEqual(new Set(["20"]));
    expect(hitung(badan, "7.500 detik")).toBe(1);
    expect(himpunan(/(?<![\d,.])(\d+) kali/g)).toEqual(new Set(["8", "10", "24"].filter((x) => x !== "24")));
    expect(himpunan(/(?<![\d,.])(\d+) koneksi/g)).toEqual(new Set(["10", "100", "5", "4"]));
    expect(himpunan(/hari ke-(\d+)/g)).toEqual(new Set(["14"]));
    expect(cocok(barisMdxBaris("M39"), /selama (\d+) hari/)[1]).toBe("14");
    expect(hitung(badan, "125 menit")).toBe(3);
    expect(hitung(badan, "56%")).toBe(5);
  });
  test("konteks bernomor: ADR, api-t, Tahap, baris tabel Dibaca di, dan nomor halaman cocok dengan registry dan halaman tetangga", () => {
    expect(new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => m[1]))).toEqual(new Set(["37", "45"]));
    expect(new Set([...badan.matchAll(/\bapi-t\d\b/g)].map((m) => m[0]))).toEqual(new Set(["api-t4"]));
    expect(new Set([...badan.matchAll(/\bM(\d+)\b/g)].map((m) => m[1]))).toEqual(new Set(["32"]));
    expect(dari("t4-m32").label).toBe("Masalah 32 · minggu 6");
    expect(dari("t4-modul").adr).toEqual([37]);
    expect(dari("t4-adr-45").adr).toEqual([45]);
    expect(dari("t4-tim-infra").adr).toEqual([44]);
  });
});

describe("riset: baris milik halaman ini ada tanpa ID ganda dan tidak tampil ke pembaca", () => {
  test("R4-240 sampai R4-244 ada tepat sekali, urut, dan memuat sumber yang dipakai halaman", () => {
    const id = [...riset.matchAll(/^\| (R4-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(id).size, "ID riset ganda").toBe(id.length);
    for (const n of [240, 241, 242, 243, 244]) expect(id.filter((x) => x === `R4-${n}`)).toHaveLength(1);
    const dua = (n: number) => riset.split("\n").find((b) => b.startsWith(`| R4-${n} |`))!;
    expect(dua(240)).toContain("1.200.000 ÷ 86.400 × 10 = 138,889");
    expect(dua(240)).toContain("dengan 13,3: 56,5% sampai 56,6%, dibulatkan 57%");
    expect(dua(241)).toContain("`labs/api-t4/cmd/beban/main.go`");
    expect(dua(241)).toContain("baris 341 sampai 342");
    expect(dua(242)).toContain("mengukur selisih antara jadwal dan saat generator berhenti tidur");
    expect(dua(243)).toContain("tahap-3/connection-pool.mdx");
    expect(dua(244)).toContain("`plan/PROPOSAL.md` baris 317");
    const urut = id.filter((x) => /^R4-2\d\d$/.test(x)).map((x) => Number(x.slice(3)));
    expect(urut).toEqual([...urut].sort((a, b) => a - b));
    expect(badan).not.toMatch(/\bR4-\d+\b/);
  });
});
