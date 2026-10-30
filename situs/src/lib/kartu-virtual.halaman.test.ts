// Penjaga angka halaman 4.23 (keputusan 1354 sampai 1356): angka, ID, nomor ADR, versi sumber, tautan, rentang Snippet, tabel ADR, klaim
// "hanya" atau "tidak ada", dan kalimat mekanisme yang ditulis tangan di kartu-virtual.mdx, diagram t4-kartu-inti.json, tebakan
// t4-kartu-tebak.json, dan halaman istilah hold.json dan kill-switch.json diturunkan dari rekaman labs/t4-kartu/output, kode labs/api-t4,
// run.py lab, naskah, registry, dan RISET, bukan dari daftar yang ditulis sendiri. Pola: timeout-retry-breaker.halaman.test.ts.
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman dan JSON dikunci per baris di
// kartu-virtual.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks
// sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/kartu-virtual.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci: kalimat tentang kode diperiksa terhadap kodenya (bagian "kode lab").
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantai from "../../data/diagram/t4-kartu-inti.json";
import tebak from "../../data/widget/t4-kartu-tebak.json";
import registry from "../../data/cerita.json";
import templat from "../../data/templat.json";
import { ANGKA_BARIS, ANGKA_JSON, KALIMAT_TERKUNCI, KODE_BARIS, KODE_JSON, KUNCI_JSON, RISET_KUNCI, SIDIK, URUTAN_AWAL } from "./kartu-virtual.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const HALAMAN = "situs/src/content/docs/tahap-4/kartu-virtual.mdx";
const halaman = baca(HALAMAN);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const OT = baca("labs/t4-kartu/output/otorisasi.txt");
const TG = baca("labs/t4-kartu/output/tenggat.txt");
const KD = baca("labs/t4-kartu/output/kedaluwarsa.txt");
const KS = baca("labs/t4-kartu/output/kill-switch.txt");
const PN = baca("labs/t4-kartu/output/penerbit.txt");
const DS = baca("labs/t4-kartu/output/dua-service.txt");
const TS = baca("labs/t4-kartu/output/testing.txt");
const runPy = baca("labs/t4-kartu/run.py");
const kodeKartu = baca("labs/api-t4/internal/service/kartu.go");
const kodeLedgerKartu = baca("labs/api-t4/internal/service/ledger_kartu.go");
const kodeLedgerApi = baca("labs/api-t4/internal/service/ledger_api.go");
const kodeAturan = baca("labs/api-t4/internal/service/t4_aturan.go");
const kodeBo = baca("labs/api-t4/internal/service/bo.go");
const repoLedger = baca("labs/api-t4/internal/repo/ledger.go");
const repoKartu = baca("labs/api-t4/internal/repo/kartu.go");
const kodePembayaran = baca("labs/api-t4/internal/modul/pembayaran/kartu.go");
const kodePembayaranTes = baca("labs/api-t4/internal/modul/pembayaran/kartu_test.go");
const kodeKunciLedger = baca("labs/api-t4/internal/repo/kunci_ledger.go");
const modulSql = baca("labs/t4-modul/modul.sql");
const mainPembayaran = baca("labs/api-t4/cmd/pembayaran/main.go");
const mainPenerbit = baca("labs/api-t4/cmd/penerbit/main.go");
const mainApi = baca("labs/api-t4/cmd/api/main.go");
const handlerKartu = baca("labs/api-t4/internal/handler/handler_kartu.go");
const istilahHold = JSON.parse(baca("situs/data/halaman-istilah/hold.json")) as Istilah;
const istilahKill = JSON.parse(baca("situs/data/halaman-istilah/kill-switch.json")) as Istilah;
interface Istilah {
  istilah: string; sehari_hari: string; cerita: { rujukan: string; teks: string }[]; mekanisme: string[]; stack: null; jebakan: string[]; terkait: string[];
  sumber: { riset?: string; url?: string; rekaman?: string; judul: string; catatan: string }[];
}
const tanpaKunci = process.env.TANPA_KUNCI === "1";

// ---- pembaca rekaman dan kode ------------------------------------------------------------------
interface Bagian { awal: number; akhir: number; baris: string[] }
const pecah = (teks: string): Record<string, Bagian> => {
  const semua = teks.split("\n");
  const hasil: Record<string, Bagian> = {};
  let kini = "";
  semua.forEach((b, i) => {
    const m = b.match(/^# --- ([A-Z]\d?)\. /);
    if (m) {
      if (kini) hasil[kini]!.akhir = i;
      kini = m[1]!;
      hasil[kini] = { awal: i + 1, akhir: semua.length, baris: [] };
    } else if (kini) hasil[kini]!.baris.push(b);
  });
  return hasil;
};
const cari = (pola: RegExp, baris: string[], nama: string): RegExpMatchArray => {
  const m = baris.map((x) => x.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const spasi = (s: string): string => s.replace(/\s+/g, " ");
const adaBaris = (baris: string[], teks: string): boolean => baris.some((b) => spasi(b).includes(spasi(teks)));
const noBaris = (teks: string, awalan: string, dari = 1): number => {
  const i = teks.split("\n").findIndex((b, k) => k + 1 >= dari && b.trim().startsWith(awalan));
  if (i < 0) throw new Error(`jangkar tidak ditemukan: ${awalan}`);
  return i + 1;
};
// Rentang dari baris berawalan `awal` sampai baris tepat sebelum baris berawalan `berhentiDi`, tanpa baris kosong di ujungnya.
const sampaiSebelum = (teks: string, awal: string, berhentiDi: string): string => {
  const a = noBaris(teks, awal);
  const semua = teks.split("\n");
  let b = noBaris(teks, berhentiDi, a + 1) - 1;
  while (semua[b - 1]!.trim() === "") b--;
  return `${a}:${b}`;
};
// Rentang dari baris berawalan `awal` sampai baris berawalan `akhir` (inklusif).
const sampaiDengan = (teks: string, awal: string, akhir: string): string => {
  const a = noBaris(teks, awal);
  return `${a}:${noBaris(teks, akhir, a)}`;
};
const kolom = (teks: string, rentangBaris: string): string[] => {
  const [a, b] = rentangBaris.split(":").map(Number) as [number, number];
  return teks.split("\n").slice(a - 1, b);
};
const angka = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rp = (n: number): string => `Rp${titik(n)}`;
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const harus = (kalimat: string): void => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const H = (fragmen: string, n = 1): void => expect(halaman.split(fragmen).length - 1, `kemunculan "${fragmen.slice(0, 70)}"`).toBe(n);
const baris = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const wilayah = (kode: string, awal: string, akhir?: string): string => {
  const i = kode.indexOf(awal);
  if (i < 0) throw new Error(`kode: ${awal} tidak ditemukan`);
  const j = akhir ? kode.indexOf(akhir, i) : kode.length;
  if (j < 0) throw new Error(`kode: ${akhir} tidak ditemukan`);
  return kode.slice(i, j);
};
const urut = (kode: string, ...potongan: string[]): void => {
  let dari = -1;
  for (const p of potongan) {
    const i = kode.indexOf(p, dari + 1);
    expect(i, `urutan kode: ${p}`).toBeGreaterThan(dari);
    dari = i;
  }
};

// ---- nilai turunan dari rekaman ----------------------------------------------------------------
const OA = pecah(OT);
const saldoAwal = angka(cari(/^# Budi \(akun 40301\): saldo Rp([\d.]+),/, OT.split("\n"), "saldo Budi")[1]!);
const jumlah = angka(cari(/^AUTH-A Rp([\d.]+): setuju/, OA.A!.baris, "AUTH-A")[1]!);
const sisa = saldoAwal - jumlah;
const setujuA = OA.A!.baris.filter((b) => /^AUTH-[ABC] Rp80\.000: setuju \(sumber: rekeningo\)$/.test(b)).length;
const totalA = angka(cari(/^ 3\s+\| (\d+)$/, OA.A!.baris, "jumlah disetujui")[1]!);
const clearingB = OA.B!.baris.filter((b) => b.startsWith("clearing AUTH-"));
const pemakaiB = angka(cari(/^ pemakai\s+\| (\d+)$/, OA.B!.baris, "saldo pemakai B")[1]!);
const settlementB = angka(cari(/^ settlement_kartu\s+\| (\d+)$/, OA.B!.baris, "settlement B")[1]!);
const tertahanC = angka(cari(/^ dana_tertahan\s+\| (\d+)$/, OA.C!.baris, "dana_tertahan C")[1]!);
const pemakaiC = angka(cari(/^ pemakai\s+\| (\d+)$/, OA.C!.baris, "pemakai C")[1]!);
const postingC = cari(/^ kartu_tahan \| (-?\d+)\s+\| pemakai$/, OA.C!.baris, "posting pemakai")[1]!;
const bolehKedua = OA.C!.baris.find((b) => b === "AUTH-B Rp80.000: tolak (sumber: rekeningo, alasan: saldo-kurang)");
const tenggatOtorisasi = Number(cari(/tenggat_ms=(\d+)_(\d+)/, runPy.split("\n"), "tenggat 10 detik").slice(1).join("")) / 1000;

const TENGGAT = Number(cari(/^TENGGAT = ([\d.]+)/, runPy.split("\n"), "TENGGAT")[1]);
const LOCK = Number(cari(/^LOCK_TIMEOUT = ([\d.]+)/, runPy.split("\n"), "LOCK_TIMEOUT")[1]);
const BATAS = Number(cari(/^BATAS_P95 = ([\d.]+)/, runPy.split("\n"), "BATAS_P95")[1]);
const batasLedger = cari(/"-ledger-timeout", "(\d+)ms"/, runPy.split("\n"), "ledger-timeout")[1]!;
const lockSalah = cari(/"-kartu-lock-timeout", "(\d+)s"/, runPy.split("\n"), "lock 3s")[1]!;
const tidurE = (runPy.match(/time\.sleep\(0\.6\)/g) ?? []).length;
const tigaPenantian = cari(/tiga penantian ([\d,]+) detik, masing-masing masih di bawah lock_timeout, menjumlah ([\d,]+) detik/, TG.split("\n"), "hitungan tiga penantian");
const TA = pecah(TG);
const KB = pecah(KD);
const KSS = pecah(KS);
const PB = pecah(PN);
const DB = pecah(DS);

// Beban dari naskah dan registry (tabel angka beban Tahap 4).
const barisBeban = naskah.split("\n").find((b) => b.startsWith("| Otorisasi kartu |"))!;
const perHari = angka(cari(/(1\.000) per hari \(5% dari 20\.000 aktif × 1; Asumsi\)/, [barisBeban], "1.000 per hari")[1]!);
const tahap4 = (registry.tahap as { no: number; asumsi: { user: number; aktif: number; puncak: number } }[]).find((t) => t.no === 4)!;
const aktif = (tahap4.asumsi.user * tahap4.asumsi.aktif) / 100;
const lambda = (aktif * 0.05 * 1) / 86400 * tahap4.asumsi.puncak;
const lambdaBulat = Math.round(lambda * 1000) / 1000;
const L = lambdaBulat * TENGGAT;

const hal = (registry.halaman as { id: string; judul: string; nomor?: string; menit?: number; ada: boolean; adr?: number[]; lab?: string[]; prasyarat?: string[]; jenis: string; inti?: boolean }[]);
const reg = hal.find((h) => h.id === "t4-kartu")!;

// ---- 1. frontmatter, meta, registry, impor, rujukan ---------------------------------------------
describe("registry, frontmatter, blok, dan rujukan halaman 4.23", () => {
  test("registry: ada, nomor, jenis, ADR 42, lab, prasyarat, dan judul sama dengan title", () => {
    expect(reg.ada).toBe(true);
    expect(reg.nomor).toBe("4.23");
    expect(reg.jenis).toBe("konsep");
    expect(reg.inti).toBe(true);
    expect(reg.adr).toEqual([42]);
    expect(reg.lab).toEqual(["t4-kartu"]);
    expect(reg.prasyarat).toEqual(["t4-m37", "t4-modul"]);
    expect(halaman.startsWith(`---\ntitle: "${reg.nomor} ${reg.judul}"\n`)).toBe(true);
    expect(naskah).toContain("| 4.23 | 4 | Kartu virtual: otorisasi, dana tertahan, kill switch + ADR 42 | Konsep + ADR | ★ | t4-kartu | race |");
    expect(naskah).toMatch(/^\| 42 \| Service pembayaran menjawab penerbit dengan satu panggilan ke API ledger, Idempotency-Key = `id_penerbit`/m);
  });
  test("baris meta memakai menit registry dan prasyarat registry", () => {
    const m = halaman.match(/^<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>$/m);
    expect(m).not.toBeNull();
    expect(Number(m![1]) + Number(m![2])).toBe(reg.menit);
    expect(Number(m![2])).toBe(3);
    expect(m![3]).toBe(reg.prasyarat!.map((x) => `[[${x}]]`).join(", "));
  });
  test("lima blok konsep berurutan, dua pertama terbuka, dan aman hanya di Coba", () => {
    const nama = [...halaman.matchAll(/<Blok nama="([^"]+)"( buka)?( aman="[^"]*")?>/g)];
    const konsep = templat.jenis.konsep;
    expect(nama.map((m) => m[1])).toEqual(konsep.blok.map((b) => b.nama));
    expect(nama.map((m) => Boolean(m[2]))).toEqual([true, true, false, false, false]);
    expect(nama.map((m) => Boolean(m[3]))).toEqual([false, true, false, false, false]);
    expect((halaman.match(/<\/Blok>/g) ?? []).length).toBe(5);
  });
  test("impor komponen dan data tepat, dan semua berkas ada", () => {
    const impor = [...halaman.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(impor).toEqual([
      "Blok ../../../components/Blok.astro",
      "Rantai ../../../components/Rantai.astro",
      "Snippet ../../../components/Snippet.astro",
      "Tebak ../../../widgets/tebak/Tebak.tsx",
      "intiDiagram ../../../../data/diagram/t4-kartu-inti.json",
      "dataTebak ../../../../data/widget/t4-kartu-tebak.json",
    ]);
    for (const m of halaman.matchAll(/^import \w+ from "([^"]+)";$/gm)) expect(fs.existsSync(path.resolve(path.dirname(path.join(akar, HALAMAN)), m[1]!)), m[1]).toBe(true);
    H("<Rantai data={intiDiagram} ringkas />");
    H("<Tebak client:visible data={dataTebak} />");
    expect((halaman.match(/<Rantai /g) ?? []).length).toBe(1);
    expect((halaman.match(/<Tebak /g) ?? []).length).toBe(1);
    expect((halaman.match(/<noscript>/g) ?? []).length).toBe(1);
  });
  test("rujukan [[ID]] ada di registry, dihitung per ID, dan tidak ada ID riset atau nomor keputusan", () => {
    const rujukan = [...halaman.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!);
    const ids = new Set(hal.map((h) => h.id));
    for (const id of rujukan) if (id !== "berikutnya") expect(ids.has(id), `[[${id}]] di cerita.json`).toBe(true);
    const hitung: Record<string, number> = {};
    for (const id of rujukan) hitung[id] = (hitung[id] ?? 0) + 1;
    expect(hitung).toEqual({
      "t4-m37": 3, "t4-modul": 5, "berikutnya": 1, "t3-pool": 2, "t4-prd": 2, "t4-breaker": 1, "t2-ledger": 1, "t2-race-lock": 2, "t2-idempotency": 3,
      "t2-job-rekonsiliasi": 2, "t2-m9": 1, "t4-tim-infra": 3,
    });
    expect(halaman).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(halaman).not.toMatch(/keputusan \d{3,4}|PR #\d+|#\d{3}\b/);
    expect(halaman).not.toMatch(/\bC2\b|\bE1\b|\bB11\b/);
  });
  test("tautan luar tepat, dan tanggal akses 2026-10-30", () => {
    const tautan = [...halaman.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    const hitung: Record<string, number> = {};
    for (const u of tautan) hitung[u] = (hitung[u] ?? 0) + 1;
    expect(hitung).toEqual({
      "https://docs.stripe.com/issuing/controls/real-time-authorizations": 3,
      "https://www.postgresql.org/docs/17/explicit-locking.html": 2,
      "https://www.postgresql.org/docs/17/runtime-config-client.html": 2,
      "https://github.com/open-feature/spec/releases": 2,
    });
    expect((halaman.match(/dibuka 2026-10-30/g) ?? []).length).toBe(5);
    expect((halaman.match(/2026-10-30/g) ?? []).length).toBe(5);
    expect((halaman.match(/\]\(\/cara-pakai\/#label-sumber\)/g) ?? []).length).toBe(1);
  });
});

// ---- 2. Snippet: berkas dan rentang baris diturunkan dari jangkar ---------------------------------
describe("Snippet: rentang baris diturunkan dari isi berkas sumber", () => {
  const dari = (rel: string, _teks: string, rentang: string, lang?: string, judul?: string) => ({ file: rel, lines: rentang, lang, title: judul });
  const harapan = [
    dari("labs/t4-kartu/output/otorisasi.txt", OT, sampaiSebelum(OT, "# Lab memegang lock buku Budi (seperti", "clearing AUTH-A Rp80.000: HTTP 200, status ditangkap"), undefined, "Rekaman lab: labs/t4-kartu/output/otorisasi.txt (bagian C)"),
    dari("labs/t4-kartu/output/otorisasi.txt", OT, sampaiSebelum(OT, "AUTH-A Rp80.000: setuju", "# Kontrol: otorisasi ketiga"), undefined, "Rekaman lab: labs/t4-kartu/output/otorisasi.txt (bagian A)"),
    dari("labs/api-t4/internal/service/kartu.go", kodeKartu, sampaiDengan(kodeKartu, "if b.Saldo < in.Jumlah {", "return setuju(), tx.SelesaiKunciLedger"), "go", "labs/api-t4/internal/service/kartu.go baris 277 sampai 297 (hold di versi satu proses)"),
    dari("labs/api-t4/internal/repo/ledger.go", repoLedger, sampaiDengan(repoLedger, "// KunciBukuAkun mengunci buku", "FOR UPDATE`, akun)"), "go", "labs/api-t4/internal/repo/ledger.go baris 27 sampai 35"),
    dari("labs/api-t4/internal/repo/kartu.go", repoKartu, sampaiDengan(repoKartu, "// BatasWaktuKunci memasang lock_timeout", "}"), "go", "labs/api-t4/internal/repo/kartu.go baris 141 sampai 146"),
    dari("labs/t4-kartu/output/otorisasi.txt", OT, sampaiSebelum(OT, "AUTH-1 pertama Rp80.000: setuju", "# Serentak: lab memegang lock buku Dewi"), undefined, "Rekaman lab: labs/t4-kartu/output/otorisasi.txt (bagian D, berurutan)"),
    dari("labs/t4-kartu/output/tenggat.txt", TG, sampaiSebelum(TG, "# --- A. lock_timeout 1 detik", "# --- B. Sisi lain batas"), undefined, "Rekaman lab: labs/t4-kartu/output/tenggat.txt (bagian A)"),
    dari("labs/t4-kartu/output/tenggat.txt", TG, sampaiSebelum(TG, "# --- C. lock_timeout 3 detik", "# --- D. Lewat service pembayaran"), undefined, "Rekaman lab: labs/t4-kartu/output/tenggat.txt (bagian C)"),
    dari("labs/t4-kartu/output/tenggat.txt", TG, sampaiSebelum(TG, "# Pertama, hanya buku dana_tertahan", "# --- F. Latensi"), undefined, "Rekaman lab: labs/t4-kartu/output/tenggat.txt (bagian E)"),
    dari("labs/api-t4/internal/modul/pembayaran/kartu.go", kodePembayaran, (() => {
      const a = noBaris(kodePembayaran, "h, err := s.Penahan.TahanKartu");
      const c = noBaris(kodePembayaran, "case err != nil:", a);
      return `${a}:${noBaris(kodePembayaran, "}", c)}`;
    })(), "go", "labs/api-t4/internal/modul/pembayaran/kartu.go baris 185 sampai 200"),
    dari("labs/t4-kartu/output/dua-service.txt", DS, sampaiSebelum(DS, "AUTH-G3 Rp30.000: setuju (sumber: timeout)", "# Bila penerbit tidak pernah mengulang"), undefined, "Rekaman lab: labs/t4-kartu/output/dua-service.txt (bagian B, ulangan)"),
    dari("labs/t4-kartu/output/dua-service.txt", DS, sampaiSebelum(DS, "AUTH-G4 Rp30.000: setuju (sumber: timeout)", "# --- C. Batas harian kartu"), undefined, "Rekaman lab: labs/t4-kartu/output/dua-service.txt (bagian B, hold yatim)"),
    dari("labs/t4-kartu/output/kedaluwarsa.txt", KD, sampaiSebelum(KD, "$ ./api-t4 -kedaluwarsa-hold -lab-sekarang <waktu>   # tahan_sampai dikurangi 1 detik", "=> SELECT id_penerbit, status FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-D1'"), undefined, "Rekaman lab: labs/t4-kartu/output/kedaluwarsa.txt (bagian A)"),
    dari("labs/t4-kartu/output/kedaluwarsa.txt", KD, sampaiSebelum(KD, "# Lab memegang lock baris otorisasi AUTH-D2", "# --- C. Hold yang sudah ditagih"), undefined, "Rekaman lab: labs/t4-kartu/output/kedaluwarsa.txt (bagian B)"),
    dari("labs/t4-kartu/output/kill-switch.txt", KS, sampaiSebelum(KS, "# --- A. Kill switch mematikan", "# --- B. Batas: flag hidup"), undefined, "Rekaman lab: labs/t4-kartu/output/kill-switch.txt (bagian A)"),
    dari("labs/t4-kartu/output/penerbit.txt", PN, sampaiSebelum(PN, "# Buku Joko dikunci transaction lain", "# --- B. Keadaan kedua"), undefined, "Rekaman lab: labs/t4-kartu/output/penerbit.txt (bagian A)"),
    dari("labs/t4-kartu/output/penerbit.txt", PN, sampaiSebelum(PN, "id_penerbit | keputusan_penerbit | sumber    | status_rekeningo  | hasil_banding", "# AUTH-P1 setuju di penerbit tanpa baris"), undefined, "Rekaman lab: labs/t4-kartu/output/penerbit.txt (bagian C)"),
  ];
  const tag = [...halaman.matchAll(/<Snippet ([^>]*?) \/>/g)].map((m) => {
    const a = (k: string) => m[1]!.match(new RegExp(`${k}="([^"]*)"`))?.[1];
    return { file: a("file"), lines: a("lines"), lang: a("lang"), title: a("title") };
  });
  test("jumlah dan urutan Snippet sama, dan tiap file, rentang, bahasa, dan judul cocok dengan turunan", () => {
    expect(tag.length).toBe(harapan.length);
    expect(tag).toEqual(harapan);
    expect((halaman.match(/<Snippet /g) ?? []).length).toBe(harapan.length);
  });
  test("Snippet tidak memuat kepala rekaman, komentar lab internal, atau rujukan internal", () => {
    for (const h of harapan) {
      const teks = h.file.endsWith(".txt") ? kolom(baca(h.file), h.lines) : [];
      for (const b of teks) {
        expect(b, `${h.file}:${h.lines}`).not.toMatch(/^# (Lab t4-kartu|PostgreSQL 17\.11|Rekaman dari database bersih)/);
        expect(b).not.toMatch(/keputusan \d{3,4}|PR #\d+|\bR\d-\d{2,3}\b/);
      }
    }
  });
  test("judul Snippet memuat nomor baris yang sama dengan rentangnya", () => {
    for (const h of harapan.filter((x) => x.lang === "go")) {
      const m = h.title!.match(/baris (\d+) sampai (\d+)/)!;
      expect(`${m[1]}:${m[2]}`, h.title).toBe(h.lines);
    }
  });
});

// ---- 3. rekaman: angka dan hasil di prosa --------------------------------------------------------
describe("kalimat berangka halaman diturunkan dari rekaman labs/t4-kartu", () => {
  test("otorisasi.txt A dan B: tiga setuju, Rp240.000, penagihan 200 lalu dua kali 409, saldo Rp20.000 dan settlement Rp80.000", () => {
    expect([saldoAwal, jumlah, sisa, setujuA, totalA]).toEqual([100000, 80000, 20000, 3, 240000]);
    expect(totalA).toBe(setujuA * jumlah);
    expect(clearingB).toEqual([
      "clearing AUTH-A Rp80.000: HTTP 200",
      "clearing AUTH-B Rp80.000: HTTP 409, /problems/saldo-kurang",
      "clearing AUTH-C Rp80.000: HTTP 409, /problems/saldo-kurang",
    ]);
    expect([pemakaiB, settlementB]).toEqual([sisa, jumlah]);
    expect(adaBaris(OA.A!.baris, "AUTH-A  | ditahan | 80000  | f")).toBe(true);
    expect(adaBaris(OA.A!.baris, "AUTH-B  | ditahan | 80000  | f")).toBe(true);
    expect(adaBaris(OA.A!.baris, " dana_tertahan | 0")).toBe(true);
    harus(`saldo Budi ${rp(saldoAwal)} dan dua otorisasi ${rp(jumlah)} datang bersamaan`);
    harus(`Versi ADR 42 menahan ${rp(jumlah)} untuk otorisasi pertama, jadi yang kedua membaca ${rp(sisa)} dan ditolak (bagian C).`);
    harus(`tiga persetujuan ${rp(jumlah)} untuk saldo ${rp(saldoAwal)} berjumlah ${rp(totalA)}`);
    harus(`${rp(totalA)} disetujui untuk saldo ${rp(saldoAwal)}`);
    harus("`ada_jurnal_tahan` bernilai `f`, dan buku `dana_tertahan` berisi 0");
    harus("Versi pertama menyetujui keduanya, dan ledger menolak penagihan kedua (bagian A dan B).");
  });
  test("otorisasi.txt C: A setuju, B tolak saldo-kurang, jurnal tahan, dan tenggat 10 detik", () => {
    expect(adaBaris(OA.C!.baris, "AUTH-A Rp80.000: setuju (sumber: rekeningo)")).toBe(true);
    expect(bolehKedua).toBeDefined();
    expect([tertahanC, pemakaiC, postingC]).toEqual([jumlah, sisa, `-${jumlah}`]);
    expect(adaBaris(OA.C!.baris, " kartu_tahan | 80000  | dana_tertahan")).toBe(true);
    expect(adaBaris(OA.C!.baris, "AUTH-A  | ditahan | 80000  | t")).toBe(true);
    expect(adaBaris(OA.C!.baris, "AUTH-B  | ditolak | 80000  | f")).toBe(true);
    expect(tenggatOtorisasi).toBe(10);
    expect(OT).toContain("# Tenggat penerbit tiruan dinaikkan ke 10 detik di bagian ini");
    harus(`Rekaman ini menaikkan tenggat penerbit tiruan ke ${tenggatOtorisasi} detik`);
    harus(`AUTH-B ditolak dengan alasan saldo-kurang, karena AUTH-A sudah menahan ${rp(jumlah)} dan saldo Budi ${rp(sisa)} saat AUTH-B mendapat lock`);
    harus(`Tolak dengan alasan saldo-kurang. Otorisasi pertama menahan ${rp(jumlah)}, jadi yang kedua membaca saldo ${rp(sisa)} sesudah mendapat lock`);
    harus(`AUTH-B menunggu, lalu membaca ${rp(sisa)} (Rekaman lab)`);
    harus(`Jurnal tahan memindahkan ${rp(jumlah)} dari buku Budi ke \`dana_tertahan\``);
  });
  test("tenggat penerbit tiruan: 2 detik di tenggat.txt dan penerbit.txt, 10 detik di otorisasi.txt (dan rekaman lain yang merekam hold)", () => {
    const fungsi = (nama: string): string => {
      const i = runPy.indexOf(`def ${nama}(`);
      if (i < 0) throw new Error(`run.py: ${nama} tidak ada`);
      const j = runPy.indexOf("\ndef ", i + 5);
      return runPy.slice(i, j < 0 ? undefined : j);
    };
    expect(fungsi("rekam_otorisasi")).toContain("aturan_penerbit(tenggat_ms=10_000)");
    expect(fungsi("rekam_tenggat")).not.toContain("tenggat_ms");
    expect(fungsi("rekam_penerbit")).not.toContain("tenggat_ms");
    expect(TENGGAT).toBe(2);
    expect(TG).toContain("tenggat 2 detik");
    expect(PN).toContain("tenggat 2 detik");
    expect(OT).toContain("# Tenggat penerbit tiruan dinaikkan ke 10 detik di bagian ini");
    harus(`Penerbit di lab adalah proses tiruan lokal dengan tenggat ${TENGGAT} detik. Rekaman \`otorisasi.txt\` menaikkannya ke ${tenggatOtorisasi} detik, karena yang direkam adalah apakah dana ditahan.`);
  });
  test("otorisasi.txt D: id sama berurutan dan serentak satu baris dan satu jurnal, jumlah lain 409, tiruan membaca 409 sebagai timeout", () => {
    expect(OT).toContain("AUTH-1 kedua (berurutan) Rp80.000: setuju (sumber: rekeningo)");
    expect(OT).toContain("kedua permintaan AUTH-2: setuju (sumber: rekeningo)");
    const satuBaris = OA.D!.baris.filter((b) => b === " 1");
    expect(satuBaris.length).toBe(4);
    expect(OT).toContain('"type":"/problems/id-penerbit-dipakai"');
    expect(OT).toContain("HTTP/1.1 409 Conflict");
    expect(OT).toContain("AUTH-1 Rp90.000: setuju (sumber: timeout)");
    expect(OT).toContain("Tiruan ini memperlakukan semua balasan yang bukan 200 sebagai tidak ada jawaban");
    harus("Id yang sama dengan jumlah lain dijawab 409 `id-penerbit-dipakai` (bagian D).");
    harus("Cuplikan ini memuat yang berurutan:");
    harus("Satu balasan 409 dari Rekeningo menjadi persetujuan dengan sumber `timeout` (`otorisasi.txt` bagian D)");
    harus("menghasilkan satu baris dan satu jurnal tahan. Dua permintaan yang mengantre di lock yang sama juga menghasilkan satu baris dan satu jurnal.");
    expect(mainPenerbit).toContain("status != http.StatusOK");
  });
  test("tenggat.txt: lock_timeout 1 detik di bawah tenggat 2 detik, setelan 3 detik, per penantian, dan batas 1,5 detik", () => {
    expect([TENGGAT, LOCK, lockSalah, batasLedger, tidurE]).toEqual([2, 1, "3", "1500", 2]);
    expect(adaBaris(TA.A!.baris, "AUTH-L1 Rp10.000: tolak (sumber: rekeningo, alasan: sibuk)")).toBe(true);
    expect(adaBaris(TA.A!.baris, "di antara lock_timeout (1 detik) dan tenggat (2 detik): ya (batas yang diperiksa, nilainya bergantung mesin dan tidak direkam)")).toBe(true);
    expect(adaBaris(TA.B!.baris, "AUTH-L2 Rp10.000: setuju (sumber: rekeningo)")).toBe(true);
    expect(adaBaris(TA.C!.baris, "AUTH-L3 Rp10.000: setuju (sumber: timeout)")).toBe(true);
    expect(adaBaris(TA.C!.baris, "clearing AUTH-L3 Rp10.000: HTTP 404, /problems/otorisasi-tidak-ditemukan")).toBe(true);
    expect(adaBaris(TA.D!.baris, "AUTH-L5 Rp10.000: tolak (sumber: rekeningo, alasan: sibuk)")).toBe(true);
    expect(adaBaris(TA.D!.baris, "AUTH-L6 Rp10.000: tolak (sumber: rekeningo, alasan: ledger-tidak-menjawab)")).toBe(true);
    expect(adaBaris(TA.D!.baris, "batas panggilan pembayaran ke ledger (1,5 detik) yang menyelamatkan tenggat")).toBe(true);
    expect(adaBaris(TA.E!.baris, "AUTH-L7 Rp10.000: tolak (sumber: rekeningo, alasan: sibuk)")).toBe(true);
    expect(adaBaris(TA.E!.baris, "AUTH-L8 Rp10.000: setuju (sumber: rekeningo)")).toBe(true);
    expect(adaBaris(TA.E!.baris, "Buku Fajar dilepas sesudah 0,6 detik, buku dana_tertahan sesudah 0,6 detik berikutnya")).toBe(true);
    expect(adaBaris(TA.E!.baris, "lock_timeout membatasi satu penantian, bukan seluruh transaction")).toBe(true);
    const [, satu, jum] = tigaPenantian;
    expect([satu, jum]).toEqual(["0,9", "2,7"]);
    expect(3 * angka(satu!)).toBeCloseTo(angka(jum!), 9);
    expect(angka(jum!)).toBeGreaterThan(TENGGAT);
    expect(angka(satu!)).toBeLessThan(LOCK);
    harus(`Tiga penantian ${satu} detik, masing-masing di bawah \`lock_timeout\`, berjumlah 3 × ${satu} = ${jum} detik, di atas tenggat ${TENGGAT} detik.`);
    harus("`lock_timeout` 3 detik, setelan yang salah");
    harus(`dilepas lab sesudah 0,6 detik masing-masing, Fajar disetujui sesudah lebih dari ${LOCK} detik`);
    harus("`lock_timeout` ledger 1 detik dan batas panggilan pembayaran ke ledger 1,5 detik (Asumsi lab)");
    harus("Bila `lock_timeout` salah dipasang 3 detik, batas 1,5 detik yang menyelamatkan jawaban.");
    harus(`Dua penantian 0,6 detik lolos dengan jawaban setuju sesudah lebih dari ${LOCK} detik, dan tiga penantian ${satu} detik berjumlah ${jum} detik`);
    harus("Penagihannya dijawab 404");
    harus("Jaminan jawaban sebelum tenggat butuh batas untuk seluruh panggilan.".replace("Jaminan", "Jadi jaminan"));
    // Tiga titik tunggu yang disebut halaman dibaca dari kode (peninjau 1357): buku pemilik, key id_penerbit, dan baris dana_tertahan.
    harus("Tiga titik tunggu itu dibaca dari kode: buku pemilik (`FOR UPDATE`), key `id_penerbit` bila permintaan kembar masih berjalan (`INSERT` menunggu pemegang key), dan baris `dana_tertahan` (`UPDATE`).");
    urut(wilayah(kodeKartu, "func (s Service) otorisasiDalamTx", "// --8<-- [end:otorisasi]"), "KunciBukuAkun", "KunciLedger", "BukuSistem(ctx, \"dana_tertahan\")", "CatatJurnal");
    expect(repoLedger).toMatch(/FROM buku WHERE akun_id = ANY\(\$1\)\s+ORDER BY id\s+FOR UPDATE/);
    expect(kodeKunciLedger).toContain("INSERT INTO kunci_idempotensi (kunci, akun_id, hash_permintaan, status, kedaluwarsa)");
    expect(kodeKunciLedger).toContain("transaction lain menunggu di INSERT sampai pemegang COMMIT");
    expect(repoLedger).toMatch(/UPDATE buku b SET saldo_cache = b\.saldo_cache \+ p\.jumlah/);
  });
  test("tenggat.txt F: batas 250 ms adalah Asumsi lab seperdelapan tenggat dan p95 tidak direkam", () => {
    expect(BATAS).toBe(0.25);
    expect(BATAS).toBe(TENGGAT / 8);
    expect(TG).toContain("Batas 250 ms adalah Asumsi lab (seperdelapan tenggat). Nilai p95 bergantung mesin dan tidak direkam");
    harus(`p95 otorisasi tanpa kontensi di bawah ${BATAS * 1000} ms, seperdelapan tenggat (Asumsi lab, nilai p95 tidak direkam)`);
  });
  test("kedaluwarsa.txt: jam maya, batas tepat, dua job, saldo Rp100.000 lawan Rp180.000, dan hold ditagih tidak dilepas", () => {
    const j = KB.A!.baris.filter((b) => b.startsWith("hold kartu:"));
    expect(j).toEqual(["hold kartu: diperiksa 0, dilepas 0", "hold kartu: diperiksa 0, dilepas 0", "hold kartu: diperiksa 1, dilepas 1", "hold kartu: diperiksa 0, dilepas 0"]);
    expect(adaBaris(KB.A!.baris, "tahan_sampai_tujuh_hari")).toBe(true);
    expect(adaBaris(KB.A!.baris, " AUTH-D1     | ditahan | 80000  | t")).toBe(true);
    expect(adaBaris(KB.A!.baris, "# tepat tahan_sampai")).toBe(true);
    expect(adaBaris(KB.B!.baris, "  hold kartu: diperiksa 1, dilepas 0")).toBe(true);
    expect(adaBaris(KB.B!.baris, "  hold kartu: diperiksa 1, dilepas 1")).toBe(true);
    expect(adaBaris(KB.B!.baris, " pemakai       | 100000")).toBe(true);
    expect(adaBaris(KB.B!.baris, " 1")).toBe(true);
    expect(adaBaris(KB.C!.baris, "hold kartu: diperiksa 0, dilepas 0")).toBe(true);
    expect(adaBaris(KB.C!.baris, "reversal AUTH-D2 (sudah kedaluwarsa): HTTP 200, status kedaluwarsa")).toBe(true);
    expect(adaBaris(KB.C!.baris, " AUTH-D3     | ditangkap")).toBe(true);
    expect(sisa + 2 * jumlah).toBe(180000);
    expect(100000).toBe(saldoAwal);
    harus(`saldo kembali ${rp(saldoAwal)}. Pelepasan ganda akan membuat saldo ${rp(sisa)} + 2 × ${rp(jumlah)} = ${rp(sisa + 2 * jumlah)} (Hitungan)`);
    harus("Hold yang sudah ditagih tidak dilepas job, dan reversal sesudah kedaluwarsa dijawab 200 tanpa jurnal kedua (bagian C).");
    harus("Satu detik sebelum batas dan tepat pada batas job tidak melepas. Satu detik sesudahnya melepas, dan dijalankan lagi tidak melakukan apa pun");
  });
  test("kill-switch.txt: flag mati menolak tanpa deploy, penagihan tetap diterima, mulai ulang mengaktifkan lagi, dan service pembayaran", () => {
    expect(adaBaris(KSS.A!.baris, "AUTH-K1 Rp50.000: setuju (sumber: rekeningo)")).toBe(true);
    expect(adaBaris(KSS.A!.baris, "AUTH-K2 Rp20.000: tolak (sumber: rekeningo, alasan: kill-switch)")).toBe(true);
    expect(adaBaris(KSS.A!.baris, "proses server yang sama (PID tidak berubah, tidak ada deploy): ya")).toBe(true);
    expect(adaBaris(KSS.A!.baris, "clearing AUTH-K1 Rp50.000: HTTP 200, status ditangkap")).toBe(true);
    expect(adaBaris(KSS.A!.baris, " flag_kartu | flag:kartu=mati")).toBe(true);
    expect(adaBaris(KSS.A!.baris, "Authorization: Bearer <token sesi Ratih>")).toBe(true);
    expect(adaBaris(KSS.B!.baris, "AUTH-K3 Rp20.000: setuju (sumber: rekeningo)")).toBe(true);
    expect(adaBaris(KSS.B!.baris, "dua instance Tidak dijalankan di lab ini")).toBe(true);
    expect(adaBaris(KSS.B!.baris, "Rilis bertahap 1%, 5%, 25%, 100% (Asumsi, ADR 42) juga Tidak dijalankan")).toBe(true);
    expect(adaBaris(KSS.C!.baris, "AUTH-K4 (service pembayaran, kill switch mati) Rp20.000: tolak (sumber: rekeningo, alasan: kill-switch)")).toBe(true);
    expect(adaBaris(KSS.C!.baris, " 0")).toBe(true);
    expect(adaBaris(KSS.C!.baris, "AUTH-K5 (kill switch dinyalakan lagi) Rp20.000: setuju (sumber: rekeningo)")).toBe(true);
    harus("Ratih dari tim risk mematikannya lewat `POST /bo/flag/kartu` dengan alasan wajib, dan audit log mencatat aksi `flag_kartu`.");
    harus("Batasnya terlihat di bagian B: sesudah proses dimulai ulang, flag yang dimatikan kembali aktif, dan otorisasi berikutnya disetujui.");
    harus("Bagian C merekam penolakan `kill-switch` di service pembayaran tanpa baris. Tes Go `KartuKillSwitchTanpaBarisDanTanpaLedger` memeriksa bahwa ledger tidak dipanggil, dan hasilnya tidak direkam.");
    expect(kodePembayaranTes).toContain("func TestKartuKillSwitchTanpaBarisDanTanpaLedger(");
    expect(kodePembayaranTes).toContain("ada || l.pen.n.Load() != 0");
    harus("Rilis bertahap 1%, 5%, 25%, 100% adalah Asumsi ADR 42, dan Tidak dijalankan.");
  });
  test("penerbit.txt: AUTH-P1 setuju oleh timeout, Rp160.000 lawan saldo Rp100.000, penagihan Rp150.000 409 tanpa jurnal, dan Rp60.000 tertahan", () => {
    expect(adaBaris(PB.A!.baris, "AUTH-P1 Rp80.000: setuju (sumber: timeout)")).toBe(true);
    expect(adaBaris(PB.A!.baris, "AUTH-P2 Rp80.000: setuju (sumber: rekeningo)")).toBe(true);
    expect(adaBaris(PB.A!.baris, "clearing AUTH-P1 Rp80.000 (penagihan datang): HTTP 404, /problems/otorisasi-tidak-ditemukan")).toBe(true);
    expect(adaBaris(PB.A!.baris, "clearing AUTH-P2 Rp80.000: HTTP 200, status ditangkap")).toBe(true);
    expect(adaBaris(PB.A!.baris, "Disetujui penerbit kepada toko: Rp160.000 (AUTH-P1 dan AUTH-P2); saldo Joko awal Rp100.000; yang punya penutup di ledger: Rp80.000.")).toBe(true);
    expect(2 * jumlah).toBe(160000);
    expect(adaBaris(PB.B!.baris, "clearing AUTH-P3 Rp150.000 (diperankan lab): HTTP 409, /problems/otorisasi-status")).toBe(true);
    expect(adaBaris(PB.B!.baris, "AUTH-P3 Rp150.000: tolak (sumber: rekeningo, alasan: saldo-kurang)")).toBe(true);
    expect(adaBaris(PB.C!.baris, " AUTH-P1     | setuju             | timeout   | (tidak ada baris) | setuju di penerbit, tidak ditahan di Rekeningo")).toBe(true);
    expect(adaBaris(PB.D!.baris, "AUTH-P4 Rp60.000: tolak (sumber: timeout)")).toBe(true);
    expect(adaBaris(PB.D!.baris, "tolak di penerbit, dana ditahan di Rekeningo")).toBe(true);
    expect(adaBaris(PB.D!.baris, "hold kartu: diperiksa 1, dilepas 1")).toBe(true);
    harus(`Penerbit menyetujui ${rp(2 * jumlah)} untuk saldo ${rp(saldoAwal)}, dan hanya penagihan AUTH-P2 yang punya penutup`);
    harus("Penagihan Rp150.000 itu tidak punya penutup di ledger");
    harus("Rp60.000 tertahan untuk keputusan yang sudah tolak di sana");
    harus("Rekonsiliasi kartu tetap perlu.");
    harus("Di versi satu proses, jawaban yang lewat dari tenggat 2 detik tidak punya hold, seperti AUTH-P1 (`penerbit.txt` bagian A). Di jalur dua service, hold bisa sudah ada ketika penerbit menolak, seperti AUTH-P4 (bagian D).");
    expect(adaBaris(PB.D!.baris, "AUTH-P4 Rp60.000: tolak (sumber: timeout)")).toBe(true);
    expect(adaBaris(PB.D!.baris, " AUTH-P4     | ditahan | t")).toBe(true);
    harus("Tanpa reversal dari penerbit, hanya job kedaluwarsa sesudah 7 hari yang melepasnya (`penerbit.txt` bagian D).");
  });
  test("dua-service.txt: key = id_penerbit, ulang true, 422, SIGKILL, hold yatim Rp30.000, dan batas harian Rp120.000 lawan Rp100.000", () => {
    expect(adaBaris(DB.A!.baris, "POST /ledger/kartu/tahan Idempotency-Key AUTH-G1 (akun 40311, Rp80.000): HTTP 200, ulang=true")).toBe(true);
    expect(adaBaris(DB.A!.baris, "sama, jumlah Rp70.000: HTTP 422, key-dipakai-permintaan-lain")).toBe(true);
    expect(adaBaris(DB.A!.baris, "id lain AUTH-G2 Rp80.000 (saldo tinggal Rp20.000): HTTP 422, saldo-kurang")).toBe(true);
    expect(adaBaris(DB.A!.baris, "Penolakan saldo kurang di-ROLLBACK: key AUTH-G2 tidak tertahan.")).toBe(true);
    expect(adaBaris(DB.A!.baris, "AUTH-G1 diulang penerbit Rp80.000: setuju (sumber: rekeningo)")).toBe(true);
    expect(adaBaris(DB.B!.baris, "AUTH-G3 Rp30.000: setuju (sumber: timeout)")).toBe(true);
    expect(adaBaris(DB.B!.baris, "keluar dengan sinyal 9 (SIGKILL)")).toBe(true);
    expect(adaBaris(DB.B!.baris, "hold di ledger tanpa baris otorisasi: 1")).toBe(true);
    expect(adaBaris(DB.B!.baris, " 70000")).toBe(true);
    expect(adaBaris(DB.B!.baris, "Saldo Mina Rp70.000: Rp30.000 (AUTH-G4) tertahan tanpa baris yang bisa dikedaluwarsakan.")).toBe(true);
    expect(adaBaris(DB.C!.baris, "AUTH-H1 Rp60.000 langsung ke monolith: HTTP 200, setuju")).toBe(true);
    expect(adaBaris(DB.C!.baris, "AUTH-H2 Rp60.000 langsung ke monolith: HTTP 200, tolak (batas-harian)")).toBe(true);
    expect(adaBaris(DB.C!.baris, "AUTH-H3 Rp60.000 langsung ke service pembayaran: HTTP 200, setuju")).toBe(true);
    expect(adaBaris(DB.C!.baris, "AUTH-H4 Rp60.000 langsung ke service pembayaran: HTTP 200, setuju")).toBe(true);
    expect(adaBaris(DB.C!.baris, " 100000       | 120000")).toBe(true);
    expect(2 * 60000).toBe(120000);
    harus("Rp120.000 jumlahnya");
    harus("Dua otorisasi Rp60.000 serentak untuk batas Rp100.000 disetujui keduanya");
    harus("Saldo Mina menjadi Rp70.000 karena Rp30.000 tertahan");
    harus("Rp30.000 untuk saldo Rp100.000");
    harus("`ulang=true`. Jumlah lain dijawab 422, dan penolakan saldo kurang di-ROLLBACK sehingga key tidak tertahan.");
    harus("tes Go `LedgerTahanKartuKeyHabisSesudah24Jam`");
    expect(TS).toContain("--- PASS: TestLedgerTahanKartuKeyHabisSesudah24Jam");
  });
});

// ---- 4. kode lab: klaim "hanya", "tidak ada", urutan, dan konstanta ---------------------------------
describe("kalimat tentang kode diperiksa terhadap kode labs/api-t4", () => {
  const regionOtorisasi = wilayah(kodeKartu, "// --8<-- [start:otorisasi]", "// --8<-- [end:otorisasi]");
  const regionLedger = wilayah(kodeLedgerKartu, "// --8<-- [start:ledger-tahan]", "// --8<-- [end:ledger-tahan]");
  const regionPembayaran = wilayah(kodePembayaran, "// --8<-- [start:otorisasi-pembayaran]", "// --8<-- [end:otorisasi-pembayaran]");
  test("urutan hold di satu proses dan di ledger: lock_timeout, kunci buku, saldo sesudah lock, jurnal, baris, jawaban", () => {
    urut(regionOtorisasi, "BatasWaktuKunci", "KunciBukuAkun", "OtorisasiAtasID", "b.Saldo < in.Jumlah", "KunciLedger", "CatatJurnal", "BuatOtorisasi(ctx, kartu.ID, in.IDPenerbit, in.Jumlah, \"ditahan\"", "return setuju(), tx.SelesaiKunciLedger");
    urut(regionLedger, "BatasWaktuKunci", "KunciLedger", "KunciBukuAkun", "b.Saldo < jumlah", "CatatJurnal", "SelesaiKunciLedger");
    expect(regionOtorisasi).toContain("if b.Saldo < in.Jumlah { // dibaca sesudah lock");
    expect(regionLedger).toContain("if b.Saldo < jumlah { // dibaca sesudah lock");
    harus("Urutannya: `lock_timeout` 1 detik, `ORDER BY id FOR UPDATE` pada buku pemilik (ADR 13), saldo dibaca sesudah lock, jurnal tahan (pemilik ke `dana_tertahan`), lalu key diikat ke jurnalnya.");
  });
  test("jurnal tahan memindahkan jumlah dari buku pemilik ke dana_tertahan dengan jenis kartu_tahan", () => {
    expect(regionLedger).toContain('"kartu_tahan"');
    expect(regionLedger).toContain("{BukuID: b.ID, Jumlah: -jumlah}, {BukuID: tertahan, Jumlah: jumlah}");
    expect(regionLedger).toContain('BukuSistem(ctx, "dana_tertahan")');
    expect(regionOtorisasi).toContain("{BukuID: b.ID, Jumlah: -in.Jumlah}, {BukuID: tertahan, Jumlah: in.Jumlah}");
  });
  test("klaim 'tidak ada panggilan keluar di dalam transaction': hold di satu proses dan di ledger tidak memanggil HTTP", () => {
    for (const r of [regionOtorisasi, regionLedger]) {
      expect(r).not.toMatch(/http\.|klien\.|\.Do\(|Kirim|Panggil/);
    }
    harus("Tidak ada panggilan keluar di dalam transaction (ADR 22).");
  });
  test("klaim 'hanya memetakan 55P03 ke tolak sibuk': satu pemeriksaan kode galat PostgreSQL di Otorisasi", () => {
    const pg = [...regionOtorisasi.matchAll(/pg\.Code == "([^"]+)"/g)].map((m) => m[1]);
    expect(pg).toEqual(["55P03"]);
    expect(regionOtorisasi).toContain('return tolak("sibuk"), nil');
    expect(regionOtorisasi).toContain("// lock_not_available: lock_timeout habis");
    harus("karena `Otorisasi` hanya memetakan 55P03 ke tolak sibuk");
  });
  test("lock_timeout lokal ke transaction, kunci buku menurut id, dan konstanta 1 detik, 7 hari, 24 jam", () => {
    expect(repoKartu).toContain("SELECT set_config('lock_timeout', $1, true)");
    expect(repoLedger).toMatch(/FROM buku WHERE akun_id = ANY\(\$1\)\s+ORDER BY id\s+FOR UPDATE/);
    expect(kodeKartu).toMatch(/const LockTimeoutKartuBawaan = time\.Second$/m);
    expect(kodeAturan).toContain("UmurTahanKartu = 7 * 24 * time.Hour");
    expect(kodePembayaran).toContain("const UmurTahanKartu = 7 * 24 * time.Hour");
    expect(kodeLedgerApi).toContain("const UmurKunciLedger = 24 * time.Hour");
    harus("`lock_timeout` hanya berlaku di transaction itu (`SET LOCAL`)");
    harus("Key ledger hidup 24 jam ([[t2-idempotency]]).");
    harus("Umur 7 hari adalah Asumsi naskah.");
  });
  test("service pembayaran: satu panggilan ke ledger, sibuk dijawab tolak sibuk, tidak menjawab dijawab tolak, baris dengan ON CONFLICT", () => {
    expect(regionPembayaran.match(/s\.Penahan\.TahanKartu\(/g)?.length).toBe(1);
    expect(regionPembayaran).toContain('case errors.Is(err, ledger.ErrSibuk):\n\t\treturn tolak("sibuk"), nil');
    expect(regionPembayaran).toContain('case errors.Is(err, ledger.ErrTidakPasti):\n\t\treturn tolak("ledger-tidak-menjawab"), nil');
    expect(regionPembayaran).toContain("ON CONFLICT DO NOTHING");
    expect(regionPembayaran).toContain("if !s.kartuAktif() {");
    expect(mainPembayaran).toContain('"ledger-timeout", klien.BatasBawaan');
    harus("Ledger yang sibuk dijawab tolak sibuk, dan ledger yang tidak menjawab dijawab tolak:");
    // Letak tabel (peninjau 1357): ADR 37 menaruh otorisasi_kartu di schema pembayaran, tetapi lab t4-kartu memakai satu schema.
    harus("ADR 37 menaruhnya di schema `pembayaran`, sedangkan lab ini memakai satu schema untuk semua tabel dan pemisahan schema ada di lab `t4-modul`.");
    expect(runPy).toMatch(/^SCH = "tahap4_kartu"\s+# schema lab ini \(22 tabel api-t4, satu schema\)/m);
    expect(modulSql).toContain("ALTER TABLE {s}.otorisasi_kartu SET SCHEMA t4m_pembayaran;");
    expect(naskah).toContain("| `pembayaran` (service sendiri) | `topup_bank`, `webhook_event`, `insiden_rekon`, `kartu`, `otorisasi_kartu` | 5 |");
  });
  test("klaim 'satu-satunya rute HTTP yang membatalkan otorisasi' dan rute pemilik kartu, dalam lingkup handler_kartu.go", () => {
    const rute = [...handlerKartu.matchAll(/mux\.HandleFunc\("([A-Z]+ [^"]+)", (s\.wajibLogin|s\.dariPenerbit)/g)].map((m) => `${m[1]} ${m[2]}`);
    expect(rute).toEqual([
      "POST /kartu s.wajibLogin",
      "GET /kartu s.wajibLogin",
      "POST /kartu/{id}/bekukan s.wajibLogin",
      "POST /kartu/{id}/buka s.wajibLogin",
      "POST /penerbit/otorisasi s.dariPenerbit",
      "POST /penerbit/clearing s.dariPenerbit",
      "POST /penerbit/reversal s.dariPenerbit",
    ]);
    expect(rute.filter((r) => r.includes("wajibLogin") && /reversal|clearing/.test(r))).toEqual([]);
    harus("Satu-satunya rute HTTP yang membatalkan otorisasi, `POST /penerbit/reversal`, hanya menerima panggilan penerbit (Tidak dijalankan: dibaca dari kodenya).");
    harus("rute untuk pemilik kartu hanya menerbitkan, melihat, membekukan, dan membuka kartu.");
  });
  test("kill switch: flag di memori, audit sebelum flag berubah, peran risk, dan penanda terpisah di service pembayaran", () => {
    const bo = wilayah(kodeBo, "func (s Service) SetKartuAktifBO", "// VerifikasiAuditBO");
    urut(bo, "petugasRisk", "periksaAlasan", "s.Audit(", "s.t4.KartuAktif.Store(aktif)");
    expect(bo).toContain('"flag_kartu"');
    expect(mainApi).toContain("KartuAktif: &atomic.Bool{}");
    expect(mainPembayaran).toContain("kartuAktif := &atomic.Bool{}");
    expect(mainPembayaran).toContain('"POST /lab/flag-kartu"');
    expect(handlerKartu + baca("labs/api-t4/internal/handler/handler_bo.go")).toContain('"POST /bo/flag/kartu"');
    harus("penanda boolean di memori satu proses");
    harus("Service pembayaran juga punya penanda sendiri di `labs/api-t4/cmd/pembayaran/main.go`");
  });
  test("klaim penagihan: Clearing menolak status ditolak sebelum membaca saldo, jadi saldo cukup pun tidak mengubah 409", () => {
    const c = wilayah(kodeKartu, "func (s Service) Clearing", "// --8<-- [end:clearing]");
    urut(c, "ErrOtorisasiTidakAda", 'o.Status != "ditahan" && o.Status != "ditangkap"', "return ErrOtorisasiStatus", "KunciBukuAkun", "CatatJurnal");
    expect(adaBaris(PB.B!.baris, "di sini saldo Kiki memang tidak cukup")).toBe(true);
    harus("Rekaman memakai saldo pemilik yang kurang dari jumlah penagihan. Kode `Clearing` menolak status `ditolak` sebelum membaca saldo, jadi saldo yang memadai pun tidak mengubahnya (dibaca dari kode, Tidak dijalankan).");
    harus("Jawabannya 409 tanpa jurnal.");
  });
  test("daftar celah: delapan butir bernomor, sama dengan kalimat pembukanya", () => {
    const celah = halaman.slice(halaman.indexOf("**Celah yang lab temukan.**"), halaman.indexOf("</Blok>", halaman.indexOf("**Celah yang lab temukan.**")));
    expect([...celah.matchAll(/^(\d+)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(celah.startsWith("**Celah yang lab temukan.** Hold menutup M37, tetapi delapan hal lain tetap terbuka:")).toBe(true);
  });
  test("klaim 'OpenFeature dan flagd tidak dipakai di lab': tidak ada di go.mod dan kode Go labs/api-t4", () => {
    const berkas: string[] = [];
    const telusur = (d: string): void => {
      for (const e of fs.readdirSync(path.join(akar, d), { withFileTypes: true })) {
        if (e.isDirectory()) { if (e.name !== "output" && e.name !== "node_modules") telusur(`${d}/${e.name}`); }
        else if (e.name === "go.mod" || e.name === "go.sum" || e.name.endsWith(".go")) berkas.push(`${d}/${e.name}`);
      }
    };
    telusur("labs/api-t4");
    expect(berkas.length).toBeGreaterThan(50);
    for (const b of berkas) expect(baca(b), b).not.toMatch(/open-?feature|flagd/i);
    harus("OpenFeature dan flagd tidak dipakai di lab.");
    harus("Spesifikasi OpenFeature masih v0.9.0 dan belum punya rilis 1.0");
  });
});

// ---- 5. hitungan beban dan Little's Law ---------------------------------------------------------
describe("hitungan beban: lambda 0,116 dan L 0,23 dari naskah dan registry", () => {
  test("naskah dan registry: 20.000 aktif, 5% dan 1 otorisasi, faktor puncak 10, tenggat 2 detik", () => {
    expect([tahap4.asumsi.user, tahap4.asumsi.aktif, tahap4.asumsi.puncak]).toEqual([100000, 20, 10]);
    expect(aktif).toBe(20000);
    expect(perHari).toBe(1000);
    expect(aktif * 0.05 * 1).toBe(perHari);
    expect(barisBeban).toContain("0,116 per detik puncak; L untuk tenggat 2 detik = 0,23");
    expect(lambda).toBeCloseTo(0.1157, 4);
    expect(lambdaBulat).toBe(0.116);
    expect(koma(L, 3)).toBe("0,232");
    expect(koma(L, 2)).toBe("0,23");
    expect(koma(lambda * TENGGAT, 2)).toBe("0,23");
    harus(`Bebannya ${titik(perHari)} otorisasi per hari: 5% dari ${titik(aktif)} user aktif, satu otorisasi tiap orang (Asumsi naskah).`);
    harus(`λ = ${titik(perHari)} ÷ 86.400 × ${tahap4.asumsi.puncak} = ${koma(lambda, 4)}, dibulatkan ${koma(lambdaBulat, 3)} otorisasi per detik, dengan faktor puncak ${tahap4.asumsi.puncak} (Asumsi)`);
    harus(`L = λ × W = ${koma(lambdaBulat, 3)} × ${TENGGAT} = ${koma(L, 3)}, dibulatkan ${koma(L, 2)} (Hitungan atas Asumsi)`);
    harus(`dan L = ${koma(L, 2)} untuk tenggat ${TENGGAT} detik`);
    harus(`Pada ${koma(lambdaBulat, 3)} otorisasi per detik, tiap detik jawaban lambat berarti rata-rata ${koma(lambdaBulat * 1, 3)} otorisasi baru yang ikut menunggu (Hitungan atas Asumsi).`);
    harus(`Tenggat 2.000 ms dikurangi \`lock_timeout\` 1.000 ms menyisakan 1.000 ms`);
    harus("dengan anggaran 50 ms ([[t4-modul]])");
  });
  test("anggaran 50 ms dan 1.000 ms sama dengan hitungan halaman 4.13, dan istilah L tidak memegang dua besaran", () => {
    const modul = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
    expect(modul).toContain("Tenggat penerbit kartu 2.000 ms dikurangi `lock_timeout` 1.000 ms menyisakan 1.000 ms, dan 5% dari sisa itu adalah 50 ms");
    expect((TENGGAT - LOCK) * 1000).toBe(1000);
    expect(0.05 * (TENGGAT - LOCK) * 1000).toBe(50);
    const pertamaL = halaman.search(/\bL = /);
    expect(pertamaL).toBe(halaman.indexOf("L = λ × W"));
    expect(halaman.indexOf("Little's Law menghubungkan λ, lama satu otorisasi W")).toBeLessThan(pertamaL);
    expect(halaman.indexOf("λ = ")).toBeLessThan(halaman.indexOf("Little's Law menghubungkan"));
    expect((halaman.match(/λ/g) ?? []).length).toBe(3);
    expect((halaman.match(/\bW\b/g) ?? []).length).toBe(3);
  });
});

// ---- 6. tebakan dan Rantai -----------------------------------------------------------------------
describe("tebakan t4-kartu-tebak.json dan Rantai t4-kartu-inti.json diturunkan dari rekaman", () => {
  test("tebakan: sumber, satu jawaban benar yang sesuai rekaman C, posisi tak tertebak, dan angka dari rekaman", () => {
    expect(tebak.sumber).toEqual({ jenis: "rekaman", teks: "labs/t4-kartu/output/otorisasi.txt bagian C" });
    expect(tebak.pilihan.length).toBe(4);
    const benar = tebak.pilihan.map((p, i) => (p.benar ? i : -1)).filter((i) => i >= 0);
    expect(benar).toEqual([2]);
    const panjang = tebak.pilihan.map((p) => p.teks.length);
    expect(panjang[benar[0]!]).toBeLessThan(Math.max(...panjang));
    expect(panjang[benar[0]!]).toBeLessThan(panjang[1]!);
    expect(tebak.pilihan[2]!.teks).toBe(`Tolak karena saldo kurang. AUTH-B membaca ${rp(sisa)} sesudah lock.`);
    expect(tebak.pilihan[2]!.alasan).toContain(`AUTH-A menahan ${rp(jumlah)} lewat jurnal tahan, jadi saldo Budi ${rp(sisa)}`);
    expect(tebak.pilihan[0]!.teks).toBe(`Setuju. Saldo ${rp(saldoAwal)} cukup untuk ${rp(jumlah)}, dan AUTH-A belum ditagih.`);
    expect(tebak.pilihan[0]!.alasan).toContain(`saldo yang dibaca AUTH-B tetap ${rp(saldoAwal)}`);
    expect(tebak.pilihan[1]!.alasan).toContain(`lock_timeout ${LOCK} detik, seperti di tenggat.txt bagian A`);
    expect(tebak.pilihan[3]!.alasan).toContain(`tenggat ${tenggatOtorisasi} detik, dan sumber jawaban AUTH-B adalah rekeningo`);
    expect(tebak.adegan[0]).toBe(`Saldo Budi ${rp(saldoAwal)} dan satu kartu virtual. Rekeningo menahan dana sebelum menjawab setuju.`);
    expect(tebak.adegan[1]).toContain(`AUTH-A (${rp(jumlah)}) mengantre di lock itu, lalu AUTH-B (${rp(jumlah)})`);
    expect(bolehKedua).toContain("alasan: saldo-kurang");
    expect(tebak.penutup).toContain("otorisasi ketiga yang datang sesudah dua yang pertama selesai pun disetujui");
    expect(OT).toContain("# Kontrol: otorisasi ketiga datang sesudah dua yang pertama selesai, bukan bersamaan.");
    expect(tebak.label.sumber).toBe("Rekaman lab · otorisasi.txt");
    expect(tebak.id).toBe("t4-kartu-tebak");
  });
  test("tebakan: posisi benar tetap pilihan ketiga dan posisi antar tebakan Tahap 4 di data/widget bervariasi (paling sedikit tiga posisi berbeda)", () => {
    const dir = path.join(akar, "situs/data/widget");
    const lain = fs.readdirSync(dir).filter((f) => /^t4-.*tebak\.json$/.test(f) && f !== "t4-kartu-tebak.json");
    expect(lain.length).toBeGreaterThanOrEqual(3);
    const posisi = lain.map((f) => (JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).pilihan as { benar: boolean }[]).findIndex((p) => p.benar));
    const sendiri = tebak.pilihan.findIndex((p) => p.benar);
    expect(sendiri).toBe(2);
    expect(new Set([...posisi, sendiri]).size).toBeGreaterThanOrEqual(3);
  });
  test("Rantai: dua baris tiga simpul, angka dari rekaman, nada, dan sumber", () => {
    expect(rantai.id).toBe("t4-kartu-inti");
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-kartu, otorisasi.txt A, B, dan C" });
    expect(rantai.baris.length).toBe(2);
    for (const b of rantai.baris) expect(b.simpul.length).toBe(3);
    expect(rantai.baris.map((b) => b.label)).toEqual(["Tanpa hold", "Dengan hold"]);
    expect(rantai.baris[0]!.simpul.map((s) => s.teks)).toEqual(["A dan B setuju", `saldo tetap ${rp(saldoAwal)}`, "penagihan B ditolak"]);
    expect(rantai.baris[0]!.simpul[0]!.sub).toBe(`keduanya ${rp(jumlah)}`);
    expect(rantai.baris[0]!.simpul[2]!.sub).toBe("409 dari ledger");
    expect(rantai.baris[1]!.simpul.map((s) => s.teks)).toEqual([`A setuju, hold ${rp(jumlah)}`, `saldo jadi ${rp(sisa)}`, "B ditolak saldo kurang"]);
    expect((rantai.baris[0]!.simpul[2] as { nada?: string }).nada).toBe("warn");
    expect((rantai.baris[1]!.simpul[2] as { nada?: string }).nada).toBe("good");
    expect(clearingB[1]).toContain("HTTP 409");
    expect(OT).toContain("# --- C. Dengan hold (ORDER BY id FOR UPDATE, jurnal tahan)");
    expect(rantai.catatan).toContain("jeda 300 ms");
    expect(OT).toContain("-lab-jeda-cek-tulis 300ms");
    for (const b of rantai.baris) for (const s of b.simpul) expect(s.teks.length, s.teks).toBeLessThanOrEqual(24);
  });
});

// ---- 7. tabel ADR, aturan, dan bagian ADR -------------------------------------------------------
describe("ADR 42: tabel opsi, tujuh aturan, pre-mortem, kapan salah, dan Sengaja belum", () => {
  const potong = (awalan: string): string[][] => {
    const semua = halaman.slice(halaman.indexOf(awalan)).split("\n");
    const keluar: string[][] = [];
    for (const b of semua) { if (!b.startsWith("|")) break; keluar.push(b.split("|").slice(1, -1).map((x) => x.trim())); }
    return keluar;
  };
  test("tabel opsi: lima kolom, enam baris, judul opsi, dan semua berkas rekaman di baris Bukti ada", () => {
    const t = potong("| | A. Cek saldo tanpa menahan");
    expect(t.length).toBe(7);
    expect(t.every((r) => r.length === 5)).toBe(true);
    expect(t[0]).toEqual(["", "A. Cek saldo tanpa menahan", "B. Saldo tersedia di kolom terpisah", "C. Tolak bila lock tidak langsung didapat", "D. Hold di ledger, satu panggilan, lock_timeout 1 detik"]);
    expect(t.slice(2).map((r) => r[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    expect(t[6]![1]).toContain(`\`otorisasi.txt\` A dan B: tiga setuju, ${rp(totalA)}`);
    expect(t[6]![2]).toBe("Tidak dijalankan");
    expect(t[6]![3]).toContain("Tidak dijalankan sebagai opsi tersendiri");
    for (const m of t[6]![4]!.matchAll(/`([\w-]+\.txt)`/g)) expect(fs.existsSync(path.join(akar, "labs/t4-kartu/output", m[1]!)), m[1]).toBe(true);
    expect([...t[6]![4]!.matchAll(/`([\w-]+\.txt)`/g)].map((m) => m[1])).toEqual(["otorisasi.txt", "tenggat.txt", "dua-service.txt", "kedaluwarsa.txt", "kill-switch.txt"]);
    expect(naskah).toMatch(/\| Cek saldo tanpa menahan \(ditolak: M37\); saldo tersedia = saldo − hold di kolom terpisah \(dua sumber kebenaran, bertentangan dengan saldo = jumlah posting, ADR 6 revisi\); tolak semua otorisasi bila lock tidak langsung didapat/);
  });
  test("tujuh aturan bernomor, 1% 5% 25% 100% dan 7 hari sama dengan naskah, dan ADR 42 tidak menyebut ADR yang tidak ada di naskah", () => {
    const aturan = halaman.slice(halaman.indexOf("**Keputusan: opsi D.** Tujuh aturan:"), halaman.indexOf("**Kenapa D, bukan A, B, atau C.**"));
    expect([...aturan.matchAll(/^(\d+)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    const baris42 = naskah.split("\n").find((b) => b.startsWith("| 42 |"))!;
    expect(baris42).toContain("kedaluwarsa hold 7 hari (Asumsi)");
    expect(baris42).toContain("rilis 1%, 5%, 25%, 100% (Asumsi)");
    expect(baris42).toContain("`lock_timeout` 1 detik");
    expect(baris42).toContain("jalur dua service: 1,5 detik, Asumsi lab");
    expect(baris42).toContain("rasio tolak, p95 otorisasi, selisih rekonsiliasi kartu");
    for (const adr of new Set([...halaman.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1])))) expect([13, 14, 19, 22, 37, 42, 12, 6].includes(adr) || naskah.includes(`| ${adr} |`), `ADR ${adr}`).toBe(true);
    expect([...new Set([...aturan.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1])))]).toEqual([37, 22, 13]);
    expect(aturan).toContain("kedaluwarsa 7 hari (Asumsi)");
    expect(aturan).toContain("Rilis bertahap 1%, 5%, 25%, 100% (Asumsi)");
    expect(aturan).toContain("(Asumsi lab), karena `lock_timeout` hanya membatasi satu penantian.");
    expect(aturan).toContain("rasio tolak, p95 otorisasi, dan selisih rekonsiliasi kartu");
  });
  test("pre-mortem tiga penyebab, kapan salah enam butir, dan tabel Sengaja belum lima baris", () => {
    const pre = halaman.slice(halaman.indexOf("**Pre-mortem.**"), halaman.indexOf("**Kapan keputusan ini salah.**"));
    expect([...pre.matchAll(/^(\d+)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    const salah = halaman.slice(halaman.indexOf("**Kapan keputusan ini salah.**"), halaman.indexOf("**Yang akan merevisinya.**"));
    expect((salah.match(/^- /gm) ?? []).length).toBe(6);
    expect(salah).toContain("0,116 otorisasi per detik di puncak, dan L = 0,23 untuk tenggat 2 detik.");
    const baris44 = naskah.split("\n").find((b) => b.startsWith("| 44 |"))!;
    expect(baris44).toContain("Rilis app bertahap (R4-22) dan feature flag (ADR 42).");
    harus("Naskah ADR 44 menyebut rilis app bertahap dan feature flag ADR 42 di pipeline-nya ([[t4-tim-infra]]).");
    harus("Isi sel Kelebihan, Kekurangan, dan Biaya operasional untuk opsi B dan C adalah penalaran dari desain, tanpa rekaman. Baris Bukti menyebut apa yang direkam.");
    harus("Selisih baru terlihat saat penagihan ditolak ledger (`otorisasi.txt` bagian B)");
    const sb = potong("| Yang ditunda | Kenapa ditunda | Muncul lagi di |");
    expect(sb.length).toBe(7);
    expect(sb.every((r) => r.length === 3)).toBe(true);
    expect(halaman.indexOf("### Sengaja belum dilakukan")).toBeGreaterThan(halaman.indexOf("**Yang akan merevisinya.**"));
  });
  test("kasus industri: dua kalimat dokumentasi penyedia terbaca di halaman penyedia, dan batasnya ditulis", () => {
    harus("webhook sinkronnya harus dijawab dalam 2 detik");
    harus("jumlah yang ditahan bisa diatur bila `is_amount_controllable` bernilai `true`");
    harus("Ia tidak membuktikan bahwa hold di ledger memadai, dan tidak merinci status HTTP selain 200.");
    const r221 = baris("R4-221");
    expect(r221).toContain("within 2 seconds");
    expect(r221).toContain("is_amount_controllable");
    expect(r221).toContain("Autopilot");
    expect(r221).toContain("webhook_timeout");
  });
});

// ---- 8. halaman istilah, glosarium, dan baris RISET ----------------------------------------------
describe("halaman istilah hold dan kill-switch, glosarium, dan baris RISET R4-220 sampai R4-224", () => {
  test("hold.json: angka dari rekaman, rujukan dan berkas ada, dan baris glosarium cocok", () => {
    expect(istilahHold.istilah).toBe("Hold (dana tertahan)");
    expect(istilahHold.stack).toBeNull();
    expect(istilahHold.cerita).toHaveLength(1);
    expect(istilahHold.cerita[0]!.rujukan).toBe("t4-kartu");
    expect(istilahHold.cerita[0]!.teks).toBe(`Tanpa hold, dua otorisasi ${rp(jumlah)} untuk saldo ${rp(saldoAwal)} sama-sama disetujui. Dengan hold, otorisasi pertama menahan ${rp(jumlah)}, dan yang kedua membaca saldo ${rp(sisa)} lalu ditolak (\`otorisasi.txt\` bagian A dan C).`);
    expect(istilahHold.mekanisme).toHaveLength(4);
    expect(istilahHold.mekanisme[3]).toContain("sesudah 7 hari (Asumsi)");
    expect(istilahHold.jebakan[1]).toContain("Rp30.000 tertahan");
    expect(adaBaris(DB.B!.baris, "AUTH-G4 Rp30.000")).toBe(true);
    expect(istilahHold.sumber.map((s) => s.riset ?? s.rekaman)).toEqual(["labs/t4-kartu/output/otorisasi.txt", "labs/t4-kartu/output/kedaluwarsa.txt", "R4-221"]);
    expect(glosarium).toContain("| **Hold** (dana tertahan) | Dana yang dipisahkan sementara dari saldo untuk satu otorisasi kartu, dicatat sebagai jurnal ke buku sistem dan dilepas saat ditagih, dibatalkan, atau kedaluwarsa. | [[t4-kartu]] |");
  });
  test("kill-switch.json: angka dari rekaman, versi OpenFeature, dan baris glosarium cocok", () => {
    expect(istilahKill.istilah).toBe("Kill switch");
    expect(istilahKill.stack).toBeNull();
    expect(istilahKill.cerita[0]!.rujukan).toBe("t4-kartu");
    expect(istilahKill.cerita[0]!.teks).toBe("Ratih dari tim risk mematikan flag kartu. Otorisasi baru dijawab tolak `kill-switch` oleh proses yang sama, sedangkan otorisasi Rp50.000 yang sudah disetujui tetap bisa ditagih (`kill-switch.txt` bagian A).");
    expect(adaBaris(KSS.A!.baris, "clearing AUTH-K1 Rp50.000: HTTP 200, status ditangkap")).toBe(true);
    expect(istilahKill.mekanisme).toHaveLength(4);
    expect(istilahKill.sumber.map((s) => s.riset ?? s.rekaman)).toEqual(["labs/t4-kartu/output/kill-switch.txt", "R4-222"]);
    expect(istilahKill.sumber[1]!.url).toBe("https://github.com/open-feature/spec/releases");
    expect(istilahKill.sumber[1]!.catatan).toContain("v0.9.0");
    expect(baris("R4-222")).toContain("v0.9.0");
    expect(glosarium).toContain("| **Kill switch** | Feature flag yang tugasnya mematikan satu fitur seketika tanpa deploy, mis. menolak semua otorisasi kartu baru. | [[t4-kartu]] |");
    expect(istilahKill.sumber[1]!.catatan).toContain("Dibuka 30 Oktober 2026.");
  });
  test("baris RISET R4-220 sampai R4-224: lima kolom, urut, tanpa ID ganda, dan tanggal akses 2026-10-30 untuk sumber luar", () => {
    const ids = [...riset.matchAll(/^\| (R4-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort((a, b) => Number(a.slice(3)) - Number(b.slice(3))));
    expect(ids.filter((x) => Number(x.slice(3)) >= 220 && Number(x.slice(3)) <= 224)).toEqual(["R4-220", "R4-221", "R4-222", "R4-223", "R4-224"]);
    for (const id of ["R4-220", "R4-221", "R4-222", "R4-223", "R4-224"]) {
      const b = baris(id);
      expect(b.split("|").length, `${id} harus 5 kolom`).toBe(7);
      expect(b).toContain("4.23");
    }
    for (const id of ["R4-220", "R4-221", "R4-222"]) expect(baris(id)).toContain("2026-10-30");
    expect(baris("R4-220")).toContain("The time limit applies separately to each lock acquisition attempt.");
    expect(baris("R4-223")).toContain("0,116 × 2 = 0,232");
    expect(baris("R4-223")).toContain("Rp20.000 + 2 × Rp80.000 = Rp180.000");
  });
  test("nama penyedia tidak tampil di teks halaman, Rantai, tebakan, dan halaman istilah (hanya di href dan baris RISET), seperti 4.22", () => {
    expect(halaman.replace(/\]\([^)]*\)/g, "]")).not.toMatch(/stripe/i);
    const tampil = (x: unknown, keluar: string[] = []): string[] => {
      if (typeof x === "string") { if (!x.startsWith("https://")) keluar.push(x); }
      else if (Array.isArray(x)) for (const y of x) tampil(y, keluar);
      else if (x && typeof x === "object") for (const y of Object.values(x)) tampil(y, keluar);
      return keluar;
    };
    for (const j of [rantai, tebak, istilahHold, istilahKill]) expect(tampil(j).join("\n")).not.toMatch(/stripe/i);
  });
  test("baris RISET R4-220 sampai R4-224: URL, tanggal akses, dan versi sama dengan tautan halaman; hitungan dan rekaman diturunkan", () => {
    const tautan = [...halaman.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    const tanpaSkema = (u: string): string => u.replace(/^https:\/\/(www\.)?/, "");
    const pg1 = tautan.find((u) => u.includes("runtime-config-client.html"))!;
    const pg2 = tautan.find((u) => u.includes("explicit-locking.html"))!;
    const st = tautan.find((u) => u.includes("real-time-authorizations"))!;
    const of = tautan.find((u) => u.includes("open-feature/spec/releases"))!;
    const r220 = baris("R4-220"), r221 = baris("R4-221"), r222 = baris("R4-222"), r223 = baris("R4-223"), r224 = baris("R4-224");
    expect(r220).toContain(tanpaSkema(pg1) + ", bagian lock_timeout (dibuka 2026-10-30)");
    expect(r220).toContain(tanpaSkema(pg2) + " bagian 13.3.2");
    expect(r220).toContain("Lab memakai PostgreSQL 17.11");
    expect(OT).toContain("PostgreSQL 17.11");
    expect(pg1).toContain("/docs/17/");
    expect(r221).toContain(tanpaSkema(st) + ", dibuka 2026-10-30)");
    expect(r221).toContain("(dibuka ulang 2026-10-30 untuk halaman 4.23)");
    expect(r222).toContain(tanpaSkema(of) + " (dibuka 2026-10-30)");
    expect(r222).toContain("rilis spesifikasi tertinggi v0.9.0 (29 Jul");
    expect(r222).toContain("(dibuka ulang 2026-10-30 untuk halaman 4.23)");
    expect(halaman).toContain("dibuka 2026-10-30");
    expect([...halaman.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].every((m) => m[1] === "2026-10-30")).toBe(true);
    expect(r223).toContain(`λ = ${titik(perHari)} ÷ 86.400 × ${tahap4.asumsi.puncak} = ${koma(lambda, 4)} per detik, dibulatkan ${koma(lambdaBulat, 3)}`);
    expect(r223).toContain(`L = λ × W = ${koma(lambdaBulat, 3)} × ${TENGGAT} = ${koma(L, 3)}, dibulatkan ${koma(L, 2)}`);
    expect(r223).toContain(`tiga penantian 0,9 detik: 3 × 0,9 = 2,7 detik, di atas tenggat ${TENGGAT} detik`);
    expect(r223).toContain(`pelepasan ganda: ${rp(sisa)} + 2 × ${rp(jumlah)} = ${rp(sisa + 2 * jumlah)}`);
    expect(r223).toContain(`${rp(saldoAwal)} − ${rp(jumlah)} = ${rp(sisa)}`);
    expect(r223).toContain(`3 × ${rp(jumlah)} = ${rp(3 * jumlah)}`);
    expect(r223).toContain(`tenggat ${titik(TENGGAT * 1000)} ms − lock_timeout ${titik(LOCK * 1000)} ms = ${titik((TENGGAT - LOCK) * 1000)} ms`);
    expect(r224).toContain(`tiga setuju ${rp(3 * jumlah)}`);
    expect(r224).toContain("penagihan 200, 409, 409");
    expect(clearingB.map((b) => b.match(/HTTP (\d+)/)![1]).join(", ")).toBe("200, 409, 409");
    const lulus = (TS.match(/^--- PASS/gm) ?? TS.match(/PASS/g) ?? []).length;
    expect(lulus).toBeGreaterThan(0);
    expect(r224).toContain(`\`testing.txt\` (${lulus} tes PASS)`);
    for (const n of [220, 221, 222, 223, 224]) expect(RISET_KUNCI[`R4-${n}`], `kunci baris R4-${n}`).toBe(baris(`R4-${n}`));
  });
  test("frontmatter, deskripsi, dan label sumber: jumlah per jenis dan definisi di pemakaian pertama", () => {
    expect(halaman).toContain("description: Rekeningo menahan dana sebagai jurnal sebelum menjawab setuju atas otorisasi kartu, dengan lock_timeout 1 detik dan kill switch. ADR 42 menimbang tiga cara lain dan menulis kapan pilihan ini salah.");
    expect((halaman.match(/Rekaman lab/g) ?? []).length).toBe(Label.rekaman);
    expect((halaman.match(/Tidak dijalankan/g) ?? []).length).toBe(Label.tidak);
    expect((halaman.match(/Asumsi/g) ?? []).length).toBe(Label.asumsi);
    expect((halaman.match(/Hitungan/g) ?? []).length).toBe(Label.hitungan);
    expect((halaman.match(/Ilustrasi/g) ?? []).length).toBe(0);
    expect((halaman.match(/\[perlu verifikasi\]/g) ?? []).length).toBe(1);
    expect((halaman.match(/penalaran dari/g) ?? []).length).toBe(Label.penalaran);
    expect(halaman.indexOf("Hitungan")).toBe(halaman.indexOf("Itu Hitungan, yaitu hasil rumus dari angka yang tertulis di halaman ini") + "Itu ".length);
    expect(halaman.indexOf("Rekaman lab")).toBeLessThan(halaman.indexOf("](/cara-pakai/#label-sumber)") + 20);
    expect(halaman.indexOf("Otorisasi adalah pertanyaan penerbit kartu")).toBeLessThan(halaman.indexOf("Clearing adalah penagihan"));
    expect(halaman.indexOf("Hold adalah dana yang dipisahkan sementara")).toBeLessThan(halaman.indexOf("Clearing adalah penagihan"));
    expect(halaman.indexOf("Clearing adalah penagihan")).toBeLessThan(halaman.indexOf("<details class=\"question\">"));
    expect(halaman.indexOf("Feature flag adalah sakelar di konfigurasi")).toBeLessThan(halaman.lastIndexOf("feature flag"));
    expect(halaman.indexOf("`id_penerbit`, yaitu nomor yang penerbit berikan untuk satu otorisasi")).toBeLessThan(halaman.indexOf("`id_penerbit` yang sama dua kali menghasilkan satu hold") + 4000);
    const prosa = halaman.replace(/<Snippet [^>]*\/>/g, "");
    expect(prosa).not.toMatch(/\b(mudah|cukup|tinggal)\b/i);
    expect(prosa).not.toMatch(/Anda|!/);
    expect(prosa).not.toMatch(/pengguna|Ilustrasi mekanisme/);
  });
});

// ---- 9. kunci kalimat: lapis 2 -------------------------------------------------------------------
const Label = { rekaman: 17, tidak: 17, asumsi: 15, hitungan: 6, penalaran: 4 };
describe("kunci kalimat: teks halaman, Rantai, tebakan, dan halaman istilah terkunci per baris (lapis 2)", () => {
  const tekstual = (x: unknown, keluar: string[] = []): string[] => {
    if (typeof x === "string") keluar.push(x);
    else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
    else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
    return keluar;
  };
  const sidik = (teks: string, kata: string[]): Record<string, number> =>
    Object.fromEntries(kata.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
  const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "lebih tinggi", "sampai", "kedua", "pertama", "setuju", "disetujui", "tolak", "ditolak", "penerbit", "ledger", "hold", "lock", "detik", "satu", "dua", "bersamaan", "berurutan", "serentak", "paling lama", "sama-sama", "lebih dulu", "di atas", "di bawah", "tetap", "masih", "hari"];
  const nilaiString = (x: unknown, keluar: string[] = []): string[] => {
    if (typeof x === "string") keluar.push(x);
    else if (Array.isArray(x)) for (const y of x) nilaiString(y, keluar);
    else if (x && typeof x === "object") for (const y of Object.values(x)) nilaiString(y, keluar);
    return keluar;
  };
  const angkaToken = (t: string): string[] => t.match(/\d+(?:[.,]\d+)*/g) ?? [];
  const angkaBaris = halaman.split("\n").filter((b) => b.trim() !== "").map((b, i) => [i, angkaToken(b)] as const).filter(([, t]) => t.length > 0).map(([i, t]) => `${i}|${t.join(" ")}`);
  const angkaJson = Object.fromEntries(Object.entries({ rantai, tebak, hold: istilahHold, kill: istilahKill }).map(([k, v]) => [k, tekstual(v).map((x, i) => [i, angkaToken(x)] as const).filter(([, t]) => t.length > 0).map(([i, t]) => `${i}|${t.join(" ")}`)]));
  const kodeToken = (t: string): string[] => t.match(/`[^`\n]+`|bagian [A-F](?: dan [A-F])?\b|\b[a-z0-9-]+\.txt\b/g) ?? [];
  const kodeBaris = halaman.split("\n").filter((b) => b.trim() !== "").map((b, i) => [i, kodeToken(b)] as const).filter(([, t]) => t.length > 0).map(([i, t]) => `${i}|${t.join(" ")}`);
  const kodeJson = Object.fromEntries(Object.entries({ rantai, tebak, hold: istilahHold, kill: istilahKill }).map(([k, v]) => [k, tekstual(v).map((x, i) => [i, kodeToken(x)] as const).filter(([, t]) => t.length > 0).map(([i, t]) => `${i}|${t.join(" ")}`)]));
  const risetKunci = Object.fromEntries(["R4-220", "R4-221", "R4-222", "R4-223", "R4-224"].map((id) => [id, baris(id)]));
  const urutanAwal = halaman.split("\n").filter((b) => b.trim() !== "").map((b) => b.slice(0, 18));
  const sekarang = {
    halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
    json: { rantai: tekstual(rantai), tebak: tekstual(tebak), hold: tekstual(istilahHold), kill: tekstual(istilahKill) },
    sidik: {
      halaman: sidik(halaman, KATA),
      rantai: sidik(nilaiString(rantai).join("\n"), KATA),
      tebak: sidik(nilaiString(tebak).join("\n"), KATA),
      hold: sidik(nilaiString(istilahHold).join("\n"), KATA),
      kill: sidik(nilaiString(istilahKill).join("\n"), KATA),
    },
  };
  if (process.env.PERBARUI_KUNCI === "1") {
    const isi = `// Dihasilkan dari berkas saat ini oleh PERBARUI_KUNCI=1 (lihat kartu-virtual.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\nexport const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\nexport const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\nexport const SIDIK: Record<string, Record<string, number>> = ${JSON.stringify(sekarang.sidik, null, 1)};\nexport const ANGKA_BARIS: string[] = ${JSON.stringify(angkaBaris, null, 1)};\nexport const ANGKA_JSON: Record<string, string[]> = ${JSON.stringify(angkaJson, null, 1)};\nexport const URUTAN_AWAL: string[] = ${JSON.stringify(urutanAwal, null, 1)};\nexport const KODE_BARIS: string[] = ${JSON.stringify(kodeBaris, null, 1)};\nexport const KODE_JSON: Record<string, string[]> = ${JSON.stringify(kodeJson, null, 1)};\nexport const RISET_KUNCI: Record<string, string> = ${JSON.stringify(risetKunci, null, 1)};\n`;
    fs.writeFileSync(path.join(__dirname, "kartu-virtual.halaman.nilai.ts"), isi);
  }
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string Rantai, tebakan, dan halaman istilah sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
  (process.env.TANPA_SIDIK === "1" ? test.skip : test)("sidik kata penentu halaman, Rantai, tebakan, dan halaman istilah (kunci agregat, bukan turunan)", () => {
    expect(sekarang.sidik).toEqual(SIDIK);
  });
  test("sidik angka: deretan angka tiap baris halaman dan tiap string JSON tidak berubah (jalan juga tanpa kunci kalimat)", () => {
    expect(angkaBaris).toEqual(ANGKA_BARIS);
    expect(angkaJson).toEqual(ANGKA_JSON);
  });
  test("sidik kode: token `kode`, rujukan `berkas.txt`, dan huruf `bagian X` tiap baris halaman dan tiap string JSON tidak berubah (jalan juga tanpa kunci kalimat)", () => {
    expect(kodeBaris).toEqual(KODE_BARIS);
    expect(kodeJson).toEqual(KODE_JSON);
    expect(risetKunci).toEqual(RISET_KUNCI);
  });
  test("urutan awal baris: 18 karakter pertama tiap baris tidak kosong, berurutan (baris yang bertukar tempat atau hilang gagal)", () => {
    expect(urutanAwal).toEqual(URUTAN_AWAL);
  });
});

// ---- 10. struktur halaman dan isi JSON per sel: berjalan juga tanpa kunci kalimat ---------------------
describe("struktur halaman, sel tabel, dan isi JSON diperiksa per bagian (tanpa kunci kalimat)", () => {
  const tabelDari = (awalan: string): string[][] => {
    const keluar: string[][] = [];
    for (const b of halaman.slice(halaman.indexOf(awalan)).split("\n")) { if (!b.startsWith("|")) break; keluar.push(b.split("|").slice(1, -1).map((x) => x.trim())); }
    return keluar;
  };
  test("judul bagian: tingkat dan teks, dan tidak ada tingkat yang meloncat", () => {
    const judul = [...halaman.matchAll(/^(#{2,6}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(judul).toEqual([
      "## Inti",
      "### Kenapa ini ada",
      "### Cara kerjanya",
      "### ADR 42: hold di ledger lewat satu panggilan, lock_timeout 1 detik, kill switch",
      "### Sengaja belum dilakukan",
      "### Cek diri",
      "### Saat me-review kode AI, cek ini",
      "### Bacaan lanjut",
    ]);
  });
  test("kotak lipat: kelas dan ringkasan, dan daftar bernomor berurutan dari 1 per kelompok", () => {
    expect([...halaman.matchAll(/<details class="([a-z]+)">\n<summary>([^<]+)<\/summary>/g)].map((m) => `${m[1]}|${m[2]}`)).toEqual([
      "question|Sudah tahu? Cek 3 pertanyaan",
      "success|Jawaban", "success|Jawaban", "success|Jawaban", "success|Jawaban",
    ]);
    expect((halaman.match(/<\/details>/g) ?? []).length).toBe(5);
    const kelompok: number[][] = [];
    let kini: number[] = [];
    for (const b of halaman.split("\n")) {
      const m = b.match(/^(\d+)\. /);
      if (m) kini.push(Number(m[1]));
      else if (b.trim() === "" || b.startsWith("**") || b.startsWith("<")) { if (kini.length && b.trim() !== "") { kelompok.push(kini); kini = []; } }
      else if (!/^ {2,}/.test(b) && kini.length) { kelompok.push(kini); kini = []; }
    }
    if (kini.length) kelompok.push(kini);
    for (const k of kelompok) expect(k, `daftar ${k.join(",")}`).toEqual(k.map((_, i) => i + 1));
    expect(kelompok.map((k) => k.length)).toEqual([3, 8, 7, 3]);
    expect([...halaman.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
  });
  test("tabel ADR: tiap sel memuat potongan kuncinya (sel yang tertukar antar baris atau kolom gagal)", () => {
    const t = tabelDari("| | A. Cek saldo tanpa menahan");
    const kunci: string[][] = [
      ["menjawab setuju tanpa menulis ke buku", "saldo dikurangi hold", "ditolak, tanpa menunggu", "jurnal tahan, key = id_penerbit"],
      ["Tidak ada lock, jadi handler tidak menunggu", "Otorisasi tidak menyentuh buku ledger", "Jawaban tidak pernah menunggu lock", "saldo tetap jumlah posting"],
      ["penagihan kedua ditolak ledger", "Dua sumber kebenaran untuk uang yang sama", "Menolak user sah tiap kali", "`lock_timeout` berlaku per penantian"],
      ["Selisih baru terlihat saat penagihan ditolak ledger", "Rekonsiliasi antara kolom dan ledger", "Rasio tolak naik saat buku sibuk", "Alert untuk rasio tolak sibuk (Asumsi)"],
      ["tiga setuju", "Tidak dijalankan", "Tidak dijalankan sebagai opsi tersendiri", "`kill-switch.txt`"],
    ];
    expect(t.length).toBe(7);
    kunci.forEach((baris, r) => baris.forEach((frag, c) => expect(t[r + 2]![c + 1], `sel ${r + 2},${c + 1}`).toContain(frag)));
    expect(t[6]![2]).toBe("Tidak dijalankan");
    expect(t.slice(2).map((r) => r[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
  });
  test("tabel Sengaja belum: tiap sel tepat per baris dan kolom", () => {
    const t = tabelDari("| Yang ditunda |");
    expect(t.slice(2)).toEqual([
      ["Job rekonsiliasi kartu: penerbit lawan `otorisasi_kartu`, dan hold tanpa baris", "Lab membandingkan lewat SQL, dan job belum ada", "Belum dijadwalkan"],
      ["Flag kill switch di luar proses atau di tabel", "Di lab flag di memori satu proses, dan keputusan produknya belum final", "[[t4-tim-infra]]"],
      ["Serialisasi batas harian di jalur dua service", "Celah ditemukan lab dan tidak ditutup", "Belum dijadwalkan"],
      ["Perlakuan penagihan atas otorisasi yang ditolak atau tidak dikenal", "Keputusan produk: didebit, ditolak, atau insiden bernomor", "Belum dijadwalkan"],
      ["Rilis bertahap 1%, 5%, 25%, 100%", "Tidak dijalankan di lab, dan angkanya Asumsi", "[[t4-tim-infra]]"],
    ]);
  });
  test("Rantai: seluruh isi sama dengan yang diturunkan dari rekaman", () => {
    expect(rantai).toEqual({
      id: "t4-kartu-inti",
      judul: `Dua otorisasi ${rp(jumlah)} untuk saldo ${rp(saldoAwal)}, tanpa dan dengan hold`,
      sumber: { jenis: "rekaman", teks: "Rekaman lab t4-kartu, otorisasi.txt A, B, dan C" },
      baris: [
        { label: "Tanpa hold", sub: "versi pertama", simpul: [
          { teks: "A dan B setuju", sub: `keduanya ${rp(jumlah)}` },
          { teks: `saldo tetap ${rp(saldoAwal)}`, sub: "tak ada jurnal tahan" },
          { teks: "penagihan B ditolak", sub: "409 dari ledger", nada: "warn" },
        ] },
        { label: "Dengan hold", sub: "ADR 42", simpul: [
          { teks: `A setuju, hold ${rp(jumlah)}`, sub: "jurnal tahan" },
          { teks: `saldo jadi ${rp(sisa)}`, sub: "dibaca B sesudah lock" },
          { teks: "B ditolak saldo kurang", sub: "tanpa jurnal", nada: "good" },
        ] },
      ],
      catatan: "Penerbit adalah proses tiruan lokal. Di baris pertama kedua otorisasi serentak, dengan jeda 300 ms di antara cek dan tulis yang hanya ada di lab. Di baris kedua lab memegang lock buku Budi dan mengantrekan A lebih dulu, lalu B.",
    });
  });
  test("tebakan: seluruh isi sama dengan yang diturunkan dari rekaman", () => {
    expect(tebak).toEqual({
      id: "t4-kartu-tebak",
      judul: `Dua otorisasi ${rp(jumlah)} untuk saldo ${rp(saldoAwal)}, dengan hold`,
      sumber: { jenis: "rekaman", teks: "labs/t4-kartu/output/otorisasi.txt bagian C" },
      adegan: [
        `Saldo Budi ${rp(saldoAwal)} dan satu kartu virtual. Rekeningo menahan dana sebelum menjawab setuju.`,
        `Lab memegang lock buku Budi, seperti transaction lain yang sedang berjalan. AUTH-A (${rp(jumlah)}) mengantre di lock itu, lalu AUTH-B (${rp(jumlah)}), lalu lab melepas lock.`,
      ],
      pertanyaan: "Apa jawaban Rekeningo untuk AUTH-B?",
      pilihan: [
        { teks: `Setuju. Saldo ${rp(saldoAwal)} cukup untuk ${rp(jumlah)}, dan AUTH-A belum ditagih.`, benar: false,
          alasan: `Itu jawaban versi pertama, tanpa hold (bagian A): saldo yang dibaca AUTH-B tetap ${rp(saldoAwal)}. Di versi ini AUTH-A sudah menahan ${rp(jumlah)} sebelum dijawab setuju.` },
        { teks: `Tolak karena sibuk. AUTH-B tidak mendapat lock dalam ${LOCK} detik, lalu menyerah.`, benar: false,
          alasan: `Rekaman bagian C menjawab saldo-kurang, bukan sibuk. Jawaban sibuk hanya muncul bila lock tidak didapat dalam lock_timeout ${LOCK} detik, seperti di tenggat.txt bagian A.` },
        { teks: `Tolak karena saldo kurang. AUTH-B membaca ${rp(sisa)} sesudah lock.`, benar: true,
          alasan: `AUTH-A menahan ${rp(jumlah)} lewat jurnal tahan, jadi saldo Budi ${rp(sisa)} saat AUTH-B mendapat giliran. Saldo dibaca sesudah lock, bukan sebelum mengantre.` },
        { teks: "Setuju oleh penerbit sendiri, karena jawaban Rekeningo terlambat dari tenggat.", benar: false,
          alasan: `Itu keadaan lain: jawaban lewat dari tenggat. Rekaman ini memakai tenggat ${tenggatOtorisasi} detik, dan sumber jawaban AUTH-B adalah rekeningo.` },
      ],
      penutup: "Hold membuat urutan di lock menentukan siapa yang melihat saldo sisa. Tanpa hold, urutan tidak berpengaruh: otorisasi ketiga yang datang sesudah dua yang pertama selesai pun disetujui.",
      label: { sumber: "Rekaman lab · otorisasi.txt", tebakDulu: "Tebak dulu:", benar: "Tepat", belum: "Belum tepat", ulang: "Coba pilihan lain", jawaban: "Jawaban yang tepat" },
    });
  });
  test("halaman istilah hold dan kill-switch: seluruh isi, tautan sumber ada di halaman, dan istilah terkait ada di glosarium", () => {
    expect(istilahHold).toEqual({
      istilah: "Hold (dana tertahan)",
      sehari_hari: "Hold adalah dana yang dipisahkan sementara dari saldo untuk satu otorisasi kartu. Dana itu belum berpindah ke toko, tetapi otorisasi berikutnya tidak bisa memakainya lagi. Hold dilepas saat ditagih, dibatalkan, atau kedaluwarsa.",
      cerita: [{ rujukan: "t4-kartu", teks: `Tanpa hold, dua otorisasi ${rp(jumlah)} untuk saldo ${rp(saldoAwal)} sama-sama disetujui. Dengan hold, otorisasi pertama menahan ${rp(jumlah)}, dan yang kedua membaca saldo ${rp(sisa)} lalu ditolak (\`otorisasi.txt\` bagian A dan C).` }],
      mekanisme: [
        "Otorisasi datang. Handler memasang `lock_timeout`, mengunci buku pemilik kartu, dan membaca saldo sesudah lock.",
        "Bila saldo cukup, satu jurnal `kartu_tahan` memindahkan jumlah itu dari buku pemilik ke buku sistem `dana_tertahan`. Saldo pemilik berkurang pada saat itu juga (`otorisasi.txt` bagian C).",
        "Penagihan, yang disebut clearing, memindahkan dana dari `dana_tertahan` ke buku `settlement_kartu` (`otorisasi.txt` bagian C).",
        "Hold yang tidak ditagih dilepas lewat jurnal pembalik sesudah 7 hari (Asumsi). Job pelepasnya aman dijalankan berulang (`kedaluwarsa.txt` bagian A dan B).",
      ],
      stack: null,
      jebakan: [
        `Mengira hold hanya status di baris otorisasi. Di versi pertama baris berstatus \`ditahan\`, tetapi \`ada_jurnal_tahan\` bernilai \`f\`, dan saldo yang dibaca otorisasi berikutnya tetap ${rp(saldoAwal)} (\`otorisasi.txt\` bagian A).`,
        "Hold di ledger tanpa baris otorisasi. Bila service pembayaran mati sesudah ledger menahan dan penerbit tidak mengulang, Rp30.000 tertahan dan job kedaluwarsa tidak melihatnya (`dua-service.txt` bagian B).",
      ],
      terkait: ["Ledger", "Jurnal", "Lock"],
      sumber: [
        { judul: "Rekaman lab t4-kartu: tanpa hold lawan dengan hold", rekaman: "labs/t4-kartu/output/otorisasi.txt", catatan: `Bagian A: tiga persetujuan ${rp(jumlah)} untuk saldo ${rp(saldoAwal)} tanpa jurnal tahan. Bagian C: jurnal tahan dan penolakan saldo-kurang.` },
        { judul: "Rekaman lab t4-kartu: kedaluwarsa hold 7 hari", rekaman: "labs/t4-kartu/output/kedaluwarsa.txt", catatan: "Jam maya, satu pelepasan walau dua job berjalan, dan hold yang sudah ditagih tidak dilepas." },
        { riset: "R4-221", judul: "Dokumentasi satu penerbit kartu: real-time authorizations", url: "https://docs.stripe.com/issuing/controls/real-time-authorizations", catatan: "Jumlah yang ditahan bisa diatur bila is_amount_controllable bernilai true. Dibuka 30 Oktober 2026." },
      ],
    });
    expect(istilahKill).toEqual({
      istilah: "Kill switch",
      sehari_hari: "Kill switch adalah sakelar untuk mematikan satu fitur seketika, tanpa deploy dan tanpa memulai ulang server. Ia berupa feature flag yang dibaca tiap kali fitur dipakai. Yang mematikannya biasanya orang yang berwenang, dengan alasan yang tercatat.",
      cerita: [{ rujukan: "t4-kartu", teks: "Ratih dari tim risk mematikan flag kartu. Otorisasi baru dijawab tolak `kill-switch` oleh proses yang sama, sedangkan otorisasi Rp50.000 yang sudah disetujui tetap bisa ditagih (`kill-switch.txt` bagian A)." }],
      mekanisme: [
        "Flag dibaca di awal tiap otorisasi, sebelum kartu dan saldo diperiksa. Bila mati, jawabannya tolak dengan alasan `kill-switch`, dan tidak ada baris atau hold yang ditulis (`kill-switch.txt` bagian A dan C).",
        "Flag diubah lewat rute back office untuk peran risk. Alasan wajib, dan audit log mencatat aksinya (`kill-switch.txt` bagian A). Kode menyimpan audit lebih dulu dan mengubah flag sesudah audit tersimpan (dibaca dari kode, Tidak dijalankan).",
        "Otorisasi yang sudah disetujui tidak dibatalkan, jadi penagihannya tetap diterima (`kill-switch.txt` bagian A).",
        "Di lab, flag adalah penanda di memori satu proses. Sesudah proses dimulai ulang, flag kembali aktif (`kill-switch.txt` bagian B).",
      ],
      stack: null,
      jebakan: [
        "Menyimpan flag di memori proses. Proses yang dimulai ulang kembali aktif tanpa ada yang menyalakannya, dan tiap instance punya flag sendiri (`kill-switch.txt` bagian B, dibaca dari kode untuk dua instance).",
        "Mengira kill switch menarik persetujuan yang sudah keluar. Ia hanya menolak otorisasi baru.",
      ],
      terkait: ["Canary", "Circuit breaker"],
      sumber: [
        { judul: "Rekaman lab t4-kartu: kill switch tanpa deploy", rekaman: "labs/t4-kartu/output/kill-switch.txt", catatan: "Bagian A: flag mati menolak otorisasi baru dalam proses yang sama. Bagian B: flag kembali aktif sesudah proses dimulai ulang. Bagian C: service pembayaran." },
        { riset: "R4-222", judul: "OpenFeature: rilis spesifikasi", url: "https://github.com/open-feature/spec/releases", catatan: "Rilis spesifikasi tertinggi v0.9.0 dan belum ada rilis 1.0. Lab tidak memakai OpenFeature. Dibuka 30 Oktober 2026." },
      ],
    });
    const tautanHalaman = new Set([...halaman.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]));
    for (const i of [istilahHold, istilahKill]) for (const sb of i.sumber) if (sb.url) expect(tautanHalaman.has(sb.url), sb.url).toBe(true);
    for (const t of [...istilahHold.terkait, ...istilahKill.terkait]) expect(glosarium, t).toMatch(new RegExp(`^\\| \\*\\*${t.replace(/[()]/g, "\\$&")}\\*\\*`, "m"));
  });
});
