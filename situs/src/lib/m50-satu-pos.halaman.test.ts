// Penjaga halaman 5.24 (keputusan 1592 sampai 1594): angka, hitungan, ID, tautan, label sumber, rentang Snippet, klaim "tidak" dan "hanya",
// urutan tebakan, diagram Rantai t5-m50-satu-pos.json, skenario alur t5-m50.json, kartu Cek diri, dan baris riset di m50-satu-pos.mdx.
// Nilai diturunkan dari rekaman labs/t5-waf/output/kuota.txt (bagian A dan C), tandatangan.txt (bagian A), testing.txt, kepala rekaman,
// kode gerbang (gerbang.go, gerbang_tinjau_test.go), kode api-t5 (handler_idempoten.go, handler_pos.go), kode penggerak lab (run.py),
// README lab, naskah Tahap 5 (baris M50), registry (asumsi Tahap 5), dan baris riset R5-225 sampai R5-229, bukan dari daftar yang ditulis sendiri.
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di
// m50-satu-pos.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah
// teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/m50-satu-pos.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Halaman ini hanya merekam 429 per mitra dan bersama, dua QR tanpa Idempotency-Key, dan
// urutan kuota sebelum tanda tangan; laju sungguhan, jawaban lambat, penghitungan per alamat NAT, pembayaran dua QR, dan serangan HTTP/2 tidak
// direkam di sini, dan angka cerita adalah Ilustrasi.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-m50-satu-pos.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./m50-satu-pos.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const terlacak: Set<string> | null = (() => {
  try {
    return new Set(execSync("git ls-files", { cwd: akar, maxBuffer: 1 << 26 }).toString().split("\n"));
  } catch {
    return null;
  }
})();
const baca = (rel: string): string => {
  // berkas baru milik PR ini belum terlacak sebelum commit; sesudahnya semua berkas yang dibaca harus terlacak
  if (terlacak && process.env.CI) expect(terlacak.has(rel), `tes membaca berkas yang tidak terlacak git: ${rel}`).toBe(true);
  expect(fs.existsSync(path.join(akar, rel)), `berkas tidak ada: ${rel}`).toBe(true);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};
const HALAMAN = "situs/src/content/docs/tahap-5/m50-satu-pos.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const skenarioBerkas = "situs/lama/widgets/data/skenario/t5-m50.json";
const skenario = JSON.parse(baca(skenarioBerkas)) as Skenario;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const kuotaRek = baca("labs/t5-waf/output/kuota.txt");
const kuotaBaris = kuotaRek.split("\n");
const tandaRek = baca("labs/t5-waf/output/tandatangan.txt");
const tandaBaris = tandaRek.split("\n");
const testingRek = baca("labs/t5-waf/output/testing.txt");
const gerbangGo = baca("labs/t5-waf/gerbang/gerbang.go");
const gerbangBaris = gerbangGo.split("\n");
const tinjauTest = baca("labs/t5-waf/gerbang/gerbang_tinjau_test.go");
const runPy = baca("labs/t5-waf/run.py");
const readmeLab = baca("labs/t5-waf/README.md");
const idempotenGo = baca("labs/api-t5/internal/handler/handler_idempoten.go");
const posGo = baca("labs/api-t5/internal/handler/handler_pos.go");
const hal427 = baca("situs/src/content/docs/tahap-4/webhook-masuk.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
  jalurTebakan: (d: Skenario) => string;
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string }
interface Skenario {
  judul: string;
  sumber: { jenis: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Record<string, unknown>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; adr?: number[]; label?: string; masalah?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string }
const hal = registry.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};

const cari = (pola: RegExp, teks: string, nama: string): RegExpMatchArray => {
  const m = teks.match(pola);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const pecahBaris = (b: string): string[] => b.split("|").slice(1, -1).map((x) => x.trim());
const barisRiset = (id: string): string => riset5.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
// pembulatan setengah ke atas seperti pembaca, bukan toFixed
const bulat = (x: number, d: number): number => Math.floor(x * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const koma = (x: number, d = 1): string => bulat(x, d).toFixed(d).replace(".", ",");
const ribu = (x: number, d = 0): string => {
  const [a, b] = bulat(x, d).toFixed(d).split(".");
  return a!.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (b ? "," + b : "");
};
const angka = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const hitungKali = (teks: string, sub: string): number => teks.split(sub).length - 1;
const huruf1 = (s: string): string => s[0]!.toUpperCase() + s.slice(1);

// --- rekaman: bagian per huruf
const bagian = (baris: string[], huruf: string): string[] => {
  const i = baris.findIndex((b) => new RegExp(`^# --- ${huruf}\\.`).test(b));
  if (i < 0) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  const j = baris.findIndex((b, k) => k > i && /^# --- [A-Z]\./.test(b));
  return baris.slice(i, j < 0 ? baris.length : j);
};
const kA = bagian(kuotaBaris, "A");
const kC = bagian(kuotaBaris, "C");
interface Mitra { n: number; ok: number; tolak: number }
const mitraBaris = (blok: string[], nama: string): Mitra => {
  for (const b of blok) {
    const m = b.match(new RegExp(`^mitra ${nama}: (\\d+) permintaan -> 200: (\\d+), 429: (\\d+)$`));
    if (m) return { n: Number(m[1]), ok: Number(m[2]), tolak: Number(m[3]) };
  }
  throw new Error(`rekaman: baris mitra ${nama} tidak ada`);
};
const A = mitraBaris(kA, "A");
const B = mitraBaris(kA, "B");
const kuota = Number(cari(/kuota (\d+) per detik \(kolom mitra_pos\.kuota_per_detik\)/, kA.join("\n"), "kuota per detik")[1]);
const retryAfter = Number(cari(/-> 429 kuota-terlampaui\s+\[Retry-After: (\d+)\]/, kA.join("\n"), "Retry-After")[1]);
const semuaC = cari(/^semua permintaan: 200 = (\d+), 429 = (\d+) \(satu bucket (\d+) untuk (\d+) permintaan\)$/m, kC.join("\n"), "bagian C");
const C = { ok: Number(semuaC[1]), tolak: Number(semuaC[2]), bucket: Number(semuaC[3]), total: Number(semuaC[4]) };
const bIkutC = cari(/^mitra B mendapat 429: (ya|tidak)$/m, kC.join("\n"), "B ikut")[1]!;
const tA = bagian(tandaBaris, "A");
const mKey = cari(/-> pertama (\d+), kedua (\d+); id QR sama: (ya|tidak); baris qr milik merchant (\d+): (\d+)/, tA.join("\n"), "key sama");
const mTanpa = cari(/\$ dua POST yang sama tanpa Idempotency-Key -> (\d+), (\d+); baris qr milik merchant (\d+): (\d+)/, tA.join("\n"), "tanpa key");
const versi = {
  pg: cari(/PostgreSQL (\d+\.\d+)/, kuotaBaris[1]!, "PostgreSQL")[1]!,
  go: cari(/go(\d+\.\d+\.\d+)/, kuotaBaris[1]!, "go")[1]!,
  redis: cari(/Redis (\d+\.\d+\.\d+)/, kuotaBaris[1]!, "Redis")[1]!,
};

// --- kode gerbang: kunci bucket, urutan pemeriksaan, dan tes Go kuota sebelum tanda tangan
const nKunci = gerbangBaris.findIndex((b) => b === "\tkuncikuota := strconv.FormatInt(mitra.ID, 10)") + 1; // nomor baris 1-based
const rentangKunci = `${nKunci}:${nKunci + 3}`;
const fungsiTes = ((): string => {
  const i = tinjauTest.indexOf("func TestGerbangKuotaSebelumTandaTangan(");
  const j = tinjauTest.indexOf("\nfunc ", i + 1);
  return tinjauTest.slice(i, j);
})();
const pengulangan = Number(cari(/for i := 0; i < (\d+); i\+\+ \{\n\t\tl\.harus\(l\.kirim\(kunciA, "rahasia-lain", "GET", uriQR\+"\/x", ""\), 401, "tanda-tangan-salah"\)/, fungsiTes, "pengulangan tes")[1]);

// --- registry dan naskah
const asumsi5 = registry.tahap[4]!.asumsi as unknown as { user: number; aktif: number; req: number; puncak: number };
const puncakRps = ((asumsi5.user * asumsi5.aktif) / 100 * asumsi5.req) / 86400 * asumsi5.puncak;
const puncakTulis = ribu(puncakRps, 1);
const POS_RPS = 3000;
const barisM50 = naskah.split("\n").find((b) => b.startsWith("| M50 |")) ?? "";
const kolomM50 = pecahBaris(barisM50);
const mingguM50 = Number(kolomM50[1]);
const hariJam = cari(/Rabu (\d+\.\d+) Tomi/, kolomM50[2]!, "hari dan jam M50");

describe("rekaman kuota.txt dan tandatangan.txt, kode gerbang, registry, dan naskah: diturunkan dari berkas", () => {
  test("kuota.txt bagian A: A 600 permintaan 100 lolos, B 20 permintaan semuanya lolos; kuota dari kolom mitra_pos; Retry-After; jam bucket dibekukan", () => {
    expect([A.n, A.ok, A.tolak]).toEqual([600, 100, 500]);
    expect([B.n, B.ok, B.tolak]).toEqual([20, 20, 0]);
    expect(kuota).toBe(100);
    expect(A.ok).toBe(kuota);
    expect(A.ok + A.tolak).toBe(A.n);
    expect(B.ok + B.tolak).toBe(B.n);
    expect(retryAfter).toBe(1);
    expect(kA.join("\n")).toContain(`Jam bucket dibekukan: ${A.n} permintaan di bawah dihitung dalam SATU detik. Laju sungguhan mesin ini tidak diukur.`);
    expect(kA.join("\n")).toContain(`Pekerjaan: ${A.n} GET status dari A, ${B.n} GET status dari B diselipkan di antaranya, 16 thread.`);
  });
  test("kuota.txt bagian C: satu bucket untuk A dan B, 100 lolos dan 520 mendapat 429, B ikut; pekerjaan sama dengan bagian A menurut run.py", () => {
    expect(C).toEqual({ ok: 100, tolak: 520, bucket: 100, total: 620 });
    expect(C.total).toBe(A.n + B.n);
    expect(C.ok).toBe(kuota);
    expect(C.bucket).toBe(kuota);
    expect(C.ok + C.tolak).toBe(C.total);
    expect(bIkutC).toBe("ya");
    // bagian C memakai fungsi tarik yang sama dengan bagian A: 600 permintaan A dan satu B tiap 30 permintaan A
    expect(runPy).toContain("for i in range(600):");
    expect(runPy).toContain("if i % 30 == 29:");
    expect(600 / 30).toBe(B.n);
    expect(runPy).toContain('hasil = tarik("benar")');
    expect(runPy).toContain('hasil = tarik("rentan")');
    expect(runPy).toContain('mulai_semua(rentan_gerbang="kuota-bersama")');
    expect(runPy).toContain("harap((ka[200] + kb[200], ka[429] + kb[429], kb[429] > 0), (100, 520, True)");
    expect(runPy).toContain("harap((ka[200], ka[429], kb[200], kb[429]), (100, 500, 20, 0)");
  });
  test("tandatangan.txt bagian A: dua POST sama tanpa key membuat dua baris qr, dengan key yang sama satu baris dan id sama", () => {
    expect([mTanpa[1], mTanpa[2], mTanpa[4]]).toEqual(["201", "201", "2"]);
    expect([mKey[1], mKey[2], mKey[3], mKey[5]]).toEqual(["201", "201", "ya", "1"]);
    expect(mKey[4]).toBe(mTanpa[3]);
    expect(tA.join("\n")).toContain("# Mode rentan tanpa-idempoten-wajib (Idempotency-Key opsional seperti Tahap 4): kasir yang mengulang membuat dua QR");
  });
  test("kode gerbang: kunci bucket per mitra, mode kuota-bersama memakai satu kunci, urutan kunci API, kuota, tanda tangan; Snippet 4 baris dari rentang kode", () => {
    expect(nKunci).toBeGreaterThan(0);
    expect(gerbangBaris.slice(nKunci - 1, nKunci + 3)).toEqual([
      "\tkuncikuota := strconv.FormatInt(mitra.ID, 10)",
      "\tif g.Rentan[RentanKuotaBersama] {",
      '\t\tkuncikuota = "bersama"',
      "\t}",
    ]);
    expect(gerbangGo).toContain('RentanKuotaBersama   = "kuota-bersama"');
    expect(gerbangGo).toContain("put, err := g.Batas.Masuk(ctx, kuncikuota, mitra.KuotaPerDetik)");
    const urutan = [gerbangGo.indexOf("g.cari(ctx, kunci)"), gerbangGo.indexOf("g.Batas.Masuk("), gerbangGo.indexOf("PeriksaTanda(rahasia")];
    expect(urutan.every((x) => x > 0)).toBe(true);
    expect([...urutan].sort((a, b) => a - b)).toEqual(urutan);
    expect(badan).toContain(`<Snippet file="labs/t5-waf/gerbang/gerbang.go" lines="${rentangKunci}" lang="go" title="Kode lab: labs/t5-waf/gerbang/gerbang.go, pemilihan kunci bucket di ServeHTTP" />`);
  });
  test("tes Go kuota sebelum tanda tangan: seratus permintaan dengan secret salah dijawab 401, lalu kasir A yang sah 429 dan B tetap 200; testing.txt mencatat PASS", () => {
    expect(pengulangan).toBe(kuota);
    expect(fungsiTes).toContain('l.harus(l.kirim(kunciA, "rahasia-lain", "GET", uriQR+"/x", ""), 429, "kuota-terlampaui")');
    expect(fungsiTes).toContain('l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""), 429, "kuota-terlampaui") // kasir A yang sah ikut terkena');
    expect(fungsiTes).toContain('l.harus(l.kirim(kunciB, rahasiaB, "GET", uriQR+"/x", ""), 200, "")');
    expect(testingRek).toContain("--- PASS: TestGerbangKuotaSebelumTandaTangan");
    expect(testingRek).toContain("--- PASS: TestGerbangKuotaBersamaDiModeRentan");
    expect(testingRek).toContain("--- PASS: TestGerbangKuotaPerMitra");
  });
  test("Retry-After di setiap jawaban 429 yang ditulis gerbang, nama mode di kepala bagian C, 16 thread di run.py, dan ADR 27 di 3.17 membahas login dan proxy", () => {
    // judul langkah varian "429 dari gerbang membawa Retry-After": rekaman hanya memuat satu jawaban, jadi kodenya dibaca per tempat
    const tempat429 = gerbangBaris.flatMap((b, i) => (/tolak\(w, 429,/.test(b) ? [i] : []));
    expect(tempat429.length).toBeGreaterThanOrEqual(2);
    for (const i of tempat429) expect(gerbangBaris[i - 1], `baris ${i} sebelum jawaban 429 di baris ${i + 1}`).toMatch(/^\t+w\.Header\(\)\.Set\("Retry-After", /);
    expect(hitungKali(gerbangGo, 'w.Header().Set("Retry-After"')).toBe(tempat429.length);
    expect(kuotaBaris.find((b) => /^# --- C\./.test(b)), "kepala bagian C").toContain("kuota-bersama");
    expect(runPy).toContain("def banjir(pekerjaan, pekerja=16):");
    const hal317 = baca("situs/src/content/docs/tahap-3/rate-limit-redis.mdx");
    expect(hal317).toContain("Hitungan login per alamat dan per akun hidup di Redis");
    expect(hal317).toContain("seluruh karyawan berbagi satu key per alamat");
  });
  test("api-t5: tanpa kepala Idempotency-Key permintaan diteruskan ke handler; rute POS untuk membuat QR memakai middleware itu; lapis per IP tidak direkam untuk rute POS", () => {
    expect(idempotenGo).toContain('if len(r.Header.Values("Idempotency-Key")) == 0 {\n\t\t\tnext(w, r)\n\t\t\treturn\n\t\t}');
    expect(posGo).toContain('mux.HandleFunc("POST /pos/v1/merchant/{id}/qr", s.wajibMitra(s.idempoten(s.posBuatQR)))');
    expect(readmeLab).toContain("Lapis per IP bawaan api-t5 tidak direkam untuk rute POS: semua permintaan POS tiba dari alamat gerbang");
    expect(readmeLab).toContain("gerbang tidak membaca `X-Forwarded-For`");
  });
  test("kondisi rekaman: versi dari kepala kuota.txt dan kalimat Kondisi rekaman di halaman", () => {
    expect(versi).toEqual({ pg: "17.11", go: "1.27.3", redis: "8.10.2" });
    expect(badan).toContain(`dengan PostgreSQL ${versi.pg}, go${versi.go}, dan Redis ${versi.redis}, dari database bersih.`);
    expect(badan).toContain("Jam bucket dimajukan lewat `POST /lab/jam`");
    expect(kA.join("\n") + readmeLab).toContain("POST /lab/jam");
    expect(badan).toContain(`Bagian C memakai pekerjaan yang sama dengan bagian A: ${A.n} permintaan mitra A dan ${B.n} mitra B (dibaca dari kode lab, Tidak dijalankan).`);
  });
  test("hitungan: puncak dari registry, 3.000 ÷ 1.388,9 = 2,16 dan 216%, diulang dari angka yang tertulis di halaman", () => {
    expect(puncakTulis).toBe("1.388,9");
    const h = cari(/([\d.]+) ÷ ([\d.]+,\d) = (\d+,\d+)/, badan, "hitungan");
    expect(angka(h[1]!)).toBe(POS_RPS);
    expect(angka(h[2]!)).toBe(bulat(puncakRps, 1));
    expect(h[3]).toBe(koma(POS_RPS / angka(h[2]!), 2));
    expect(h[3]).toBe("2,16");
    const persen = `${bulat((100 * POS_RPS) / angka(h[2]!), 0)}%`;
    expect(persen).toBe("216%");
    expect(hitungKali(badan, "216%")).toBe(4);
    expect(hitungKali(badan, "÷")).toBe(1);
    expect(hitungKali(badan, "1.388,9")).toBe(2);
    expect(hitungKali(badan, "3.000")).toBe(5);
    expect(naskah).toContain(`| Satu mitra POS | λ mitra ÷ puncak semua | ${ribu(POS_RPS)} permintaan per detik (Ilustrasi, M50) ÷ ${puncakTulis} | ${persen} dari seluruh puncak. Kuota per mitra ${kuota} per detik (Asumsi) |`);
    expect(kolomM50[2]).toContain(`${ribu(POS_RPS)} permintaan per detik, ${persen} dari seluruh puncak`);
    expect(riset5).toContain("3.000 ÷ 1.388,9 = 2,15998 = 2,16, jadi 216%");
    expect(POS_RPS / bulat(puncakRps, 1)).toBeGreaterThan(2.1599);
    expect(POS_RPS / bulat(puncakRps, 1)).toBeLessThan(2.1601);
    expect(A.n + B.n).toBe(C.total);
    expect(C.ok + C.tolak).toBe(C.total);
  });
  test("naskah baris M50: minggu 12, Rabu 10.15, tiga dugaan, penalaran NAT, dan rujukan HTTP/2 dan OWASP; halaman sama dengan peta halaman", () => {
    expect(kolomM50[0]).toBe("M50");
    expect(mingguM50).toBe(12);
    expect(hariJam[1]).toBe("10.15");
    expect(badan).toContain(`Minggu ${mingguM50} Tahap 5. Rabu pukul ${hariJam[1]} Tomi memasang pembaruan POS`);
    expect(kolomM50[3]).toBe("Serangan DDoS. Blokir alamat mitra. Nadia: tambah replika API");
    expect(kolomM50[4]).toContain("menghitung semua kasir mitra di satu alamat NAT sebagai satu, dan batas bersama membuat mitra lain terkena 429 (penalaran)");
    expect(kolomM50[4]).toContain("golang/go#63417, ditutup 2023-10-10");
    expect(kolomM50[4]).toContain("OWASP API4:2023 menamai ini konsumsi sumber daya tanpa batas");
    expect(kolomM50[4]).toContain("pembeli bisa membayar keduanya");
    expect(kolomM50[2]).toContain("Bu Marni dan merchant mitra lain mendapat 429 dan lambat (Ilustrasi)");
    expect(naskah).toContain("| 5.24 | 4 | M50: Satu POS mengirim 3.000 permintaan per detik | Masalah | ★ | t5-waf | alur |");
  });
});

describe("sumber luar: tautan, tanggal buka, kutipan, dan baris riset R5-225 sampai R5-229", () => {
  const ids = ["R5-225", "R5-226", "R5-227", "R5-228", "R5-229"];
  const baris = ids.map(barisRiset);
  test("lima baris berurutan di RISET-TAHAP-5, lima kolom, tanpa ID ganda, sesudah R5-219 dengan tetangga di rentang", () => {
    const semua = riset5.split("\n").filter((b) => /^\| R5-\d+ \|/.test(b)).map((b) => b.match(/^\| (R5-\d+) \|/)![1]!);
    for (const id of ids) expect(semua.filter((x) => x === id), id).toHaveLength(1);
    const i = semua.indexOf("R5-225");
    expect(semua.slice(i, i + 5)).toEqual(ids);
    // tetangga dikunci dengan rentang, bukan dengan ID tertentu: PR halaman lain menyisipkan baris riset di antaranya
    expect(Number(semua[i - 1]!.slice(3))).toBeGreaterThanOrEqual(215);
    expect(Number(semua[i - 1]!.slice(3))).toBeLessThan(225);
    expect(Number(semua[i + 5]!.slice(3))).toBeGreaterThan(229);
    const angkaId = semua.map((x) => Number(x.slice(3)));
    for (let k = 1; k < angkaId.length; k++) if (angkaId[k]! < angkaId[k - 1]!) expect(angkaId[k - 1]!, "hanya sesudah R5-314 urutan boleh turun").toBeGreaterThan(300);
    for (const b of baris) { expect(b).not.toBe(""); expect(pecahBaris(b)).toHaveLength(5); }
  });
  test("tiap tautan luar di halaman ada di baris riset dengan tanggal buka 2026-11-04; jumlah tautan dan kemunculan terkunci; tautan di rantai dan skenario tidak ada", () => {
    const tautan = [...badan.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(tautan).toEqual([
      "https://www.rfc-editor.org/rfc/rfc6585#section-4",
      "https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption",
      "https://github.com/golang/go/issues/63417",
      "https://www.rfc-editor.org/rfc/rfc3022",
    ]);
    const tujuanRiset: Record<string, [string, string]> = {
      "https://www.rfc-editor.org/rfc/rfc6585#section-4": ["R5-227", "rfc-editor.org/rfc/rfc6585"],
      "https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption": ["R5-226", "api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption"],
      "https://github.com/golang/go/issues/63417": ["R5-225", "golang/go#63417"],
      "https://www.rfc-editor.org/rfc/rfc3022": ["R5-227", "rfc-editor.org/rfc/rfc3022"],
    };
    for (const u of new Set(tautan)) expect(barisRiset(tujuanRiset[u]![0]), `${u} di ${tujuanRiset[u]![0]}`).toContain(tujuanRiset[u]![1]);
    expect(hitungKali(badan, "dibuka 2026-11-04")).toBe(4);
    expect(hitungKali(badan, "2026-11-04")).toBe(4);
    for (const b of baris.slice(0, 3)) expect(b, "tanggal buka").toContain("2026-11-04");
    expect(baris[2]).toContain("dibuka 2026-11-04");
    expect(baris[3], "tanggal baca sumber internal").toContain("dibaca di main 2026-11-04");
    expect(baris[4], "tanggal baca hitungan").toContain("dibaca 2026-11-04");
    expect(JSON.stringify(skenario) + JSON.stringify(rantaiMentah)).not.toMatch(/https?:\/\//);
    const teksTautan: Record<string, string> = {};
    for (const m of badan.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)) { expect(teksTautan[m[1]!] ?? m[2]!, m[1]).toBe(m[2]); teksTautan[m[1]!] = m[2]!; }
  });
  test("R5-225: tanggal buka dan tutup isu, dua kutipan Inggris, dan kalimat halaman memakai client berniat jahat dan batas goroutine handler", () => {
    const r = barisRiset("R5-225");
    expect(r).toContain("golang/go#63417");
    expect(r).toContain("dibuka 2023-10-06T15:52:23Z, ditutup 2023-10-10T16:33:30Z");
    expect(r).toContain("A malicious HTTP/2 client which rapidly creates requests and immediately resets them can cause excessive server resource consumption.");
    expect(r).toContain("HTTP/2 servers now bound the number of simultaneously executing handler goroutines to the stream concurrency limit.");
    expect(r).toContain("CVE-2023-39325");
    const buka = cari(/dibuka (\d{4}-\d{2}-\d{2})T/, r, "tanggal buka isu")[1]!;
    const tutup = cari(/ditutup (\d{4}-\d{2}-\d{2})T/, r, "tanggal tutup isu")[1]!;
    expect(badan).toContain(`Isu golang/go#63417 (dibuka ${buka}, ditutup ${tutup}) menggambarkan client HTTP/2 berniat jahat yang membuat permintaan lalu segera me-reset-nya, sehingga server menjalankan kerja berlebih.`);
    expect(badan).toContain("Perbaikannya membatasi jumlah goroutine handler yang berjalan bersamaan sebesar batas stream (");
    expect(badan).toContain("Gerbang lab melayani HTTP tanpa TLS di localhost, jadi isu itu tidak direkam.");
    expect(readmeLab).toContain("TLS di tepi: gerbang melayani HTTP di localhost.");
    expect(kolomM50[4]).toContain(`golang/go#63417, ditutup ${tutup}`);
  });
  test("R5-226: OWASP API4:2023, dua kutipan; halaman memakai parafrase tanpa pelunak yang hilang dan tidak menyebut penyedia pihak ketiga", () => {
    const r = barisRiset("R5-226");
    expect(r).toContain("API4:2023 Unrestricted Resource Consumption");
    expect(r).toContain("Satisfying API requests requires resources such as network bandwidth, CPU, memory, and storage.");
    expect(r).toContain("Implement a limit on how often a client can interact with the API within a defined timeframe (rate limiting).");
    expect(r).toContain("mengalihkan 308");
    expect(badan).toContain("OWASP API Security Top 10 edisi 2023 menamai risiko ini API4, konsumsi sumber daya tanpa batas (");
    expect(badan).toContain("Menurut halaman itu, melayani permintaan membutuhkan bandwidth jaringan, CPU, memori, dan penyimpanan.");
    expect(badan).toContain("Salah satu pencegahannya membatasi seberapa sering client boleh memanggil API dalam jangka waktu tertentu.");
    expect(badan).not.toMatch(/penyedia pihak ketiga yang dibayar/);
  });
  test("R5-227: RFC 6585 bagian 4 (429, Retry-After MAY) dan RFC 3022 (NAPT, Informational); halaman memakai arti 429 dan NAPT", () => {
    const r = barisRiset("R5-227");
    expect(r).toContain("April 2012, Standards Track");
    expect(r).toContain('The 429 status code indicates that the user has sent too many requests in a given amount of time ("rate limiting").');
    expect(r).toContain("MAY include a Retry-After header");
    expect(r).toContain("Januari 2001, Informational");
    expect(r).toContain("many network addresses and their TCP/UDP ports are translated into a single network address and its TCP/UDP ports");
    expect(badan).toContain("429 adalah kode status HTTP yang menjawab bahwa client mengirim terlalu banyak permintaan dalam waktu tertentu (");
    expect(badan).toContain("Salah satu jenisnya, NAPT, menerjemahkan banyak alamat dan port menjadi satu alamat (");
    expect(badan).toContain("RFC 3022](https://www.rfc-editor.org/rfc/rfc3022), Informational, dibuka 2026-11-04");
    expect(badan).not.toMatch(/Retry-After[^.]*wajib/);
  });
  test("R5-228: sumber internal; R5-229: hitungan atas angka sendiri", () => {
    const r = barisRiset("R5-228");
    for (const x of [
      "`labs/t5-waf/output/kuota.txt` bagian A",
      `mitra A ${A.n} permintaan: 200 ${A.ok}, 429 ${A.tolak}`,
      `mitra B ${B.n}: 200 ${B.ok}, 429 ${B.tolak}`,
      `429 membawa \`Retry-After: ${retryAfter}\``,
      `mode \`kuota-bersama\`: 200 = ${C.ok}, 429 = ${C.tolak}`,
      "`output/tandatangan.txt` bagian A",
      `baris \`qr\` ${mTanpa[4]}`,
      `baris \`qr\` ${mKey[5]}`,
      "`TestGerbangKuotaSebelumTandaTangan`",
      "`api-t5/internal/handler/handler_idempoten.go`",
      "`handler_pos.go`",
      "lapis per IP tidak direkam untuk rute POS",
      "naskah Tahap 5 baris M50",
    ]) expect(r, x).toContain(x);
    const h = barisRiset("R5-229");
    expect(h).toContain("3.000 ÷ 1.388,9 = 2,15998 = 2,16, jadi 216%");
    expect(h).toContain(`${A.n} + ${B.n} = ${A.n + B.n} permintaan`);
    expect(h).toContain(`${C.ok} + ${C.tolak} = ${C.total}`);
    expect(h).toContain(`${C.total} − ${C.ok} = ${C.tolak}`);
    expect(3000 / 1388.9).toBeCloseTo(2.15998, 4);
    expect(koma(3000 / 1388.9, 2)).toBe("2,16");
  });
});

describe("registry, tautan, template blok, tabel, urutan tebakan, widget, dan kartu", () => {
  test("registry: halaman 5.24 jenis masalah, ada, prasyarat t2-idempotency dan t4-webhook, lab t5-waf, menit = baca + coba, judul dan peran dari naskah", () => {
    const h = dari("t5-m50");
    expect(h.nomor).toBe("5.24");
    expect(h.jenis).toBe("masalah");
    expect(h.ada).toBe(true);
    expect(h.prasyarat).toEqual(["t2-idempotency", "t4-webhook"]);
    expect(h.lab).toEqual(["t5-waf"]);
    expect(h.peran).toEqual(["security", "backend"]);
    expect(h.path).toBe("tahap-5/m50-satu-pos.md");
    expect(h.label).toBe(`Masalah ${kolomM50[0]!.slice(1)} · minggu ${mingguM50}`);
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>/, halaman, "meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(meta[3]).toBe("[[t2-idempotency]], [[t4-webhook]]");
    expect(frontmatter).toContain(`title: "5.24 ${h.judul}"`);
    expect(naskah).toContain("- **Security** 5.18, 5.19, 5.24, 5.25, 5.26.");
    expect(dari("t5-waf").prasyarat).toEqual(["t5-m50"]);
    expect(dari("t5-waf").nomor).toBe("5.25");
    expect(dari("t4-webhook").nomor).toBe("4.7");
    expect(dari("t3-rate-limit-redis").nomor).toBe("3.17");
    expect(dari("t4-webhook").judul).toBe("Webhook masuk: tanda tangan, event ganda, urutan + ADR 34");
  });
  test("tautan [[id]]: semua id ada di registry, dan himpunan serta jumlah per tujuan terkunci", () => {
    const hitung: Record<string, number> = {};
    for (const m of badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    for (const id of Object.keys(hitung)) expect(id === "A0" || hal.some((x) => x.id === id), id).toBe(true);
    // badan tidak memuat baris meta (dua prasyarat di meta diperiksa di tes registry)
    expect(hitung).toEqual({ A0: 1, "t5-prd": 2, "t3-rate-limit-redis": 2, "t4-webhook": 1, "t2-idempotency": 1, "t5-waf": 2 });
    expect(dari("t5-prd").nomor).toBe("5.1");
    expect(dari("t2-idempotency").nomor).toBe("2.14");
  });
  test("template masalah: lima blok dalam urutan, dua pertama terbuka; Cek diri tiga soal; satu tebak details.question; noscript; SkripLama di akhir", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect(badan).toContain('<Blok nama="Gejala" buka>');
    expect(badan).toContain('<Blok nama="Yang Raka kira" buka>');
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("123");
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(3);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t5-m50.json" />');
    expect(badan).toContain("<Rantai data={satuPos} ringkas />");
    expect(halaman).toContain('import satuPos from "../../../../data/diagram/t5-m50-satu-pos.json";');
    expect((badan.match(/<Snippet /g) ?? []).length).toBe(2);
  });
  test("semua tabel GFM: jumlah kolom header, pemisah, dan tiap baris sama; tepat satu tabel di halaman", () => {
    const barisB = badan.split("\n");
    let tabelKe = 0;
    for (let i = 0; i < barisB.length; i++) {
      if (barisB[i]!.startsWith("|") && !(barisB[i - 1] ?? "").startsWith("|")) {
        tabelKe++;
        const n = pecahBaris(barisB[i]!).length;
        for (let j = i; barisB[j]?.startsWith("|"); j++) expect(pecahBaris(barisB[j]!).length, `tabel ${tabelKe} baris ${j + 1}`).toBe(n);
      }
    }
    expect(tabelKe).toBe(1);
    expect(badan).toContain("| Dua POST yang sama | Jawaban | Baris `qr` milik merchant |\n|---|---|---|\n");
    expect(badan).toContain(`| Tanpa Idempotency-Key, mode \`tanpa-idempoten-wajib\` | ${mTanpa[1]} dan ${mTanpa[2]} | ${mTanpa[4]} (Rekaman lab) |`);
    expect(badan).toContain(`| Dengan Idempotency-Key yang sama | ${mKey[1]} dan ${mKey[2]}, id QR sama | ${mKey[5]} (Rekaman lab) |`);
  });
  test("urutan tebakan: jawaban Tebak belum tertulis sebelum details.question, dan jawaban widget (bucket per mitra) belum tertulis sebelum widget", () => {
    const sebelumTebak = badan.slice(0, badan.indexOf('<details class="question">'));
    for (const x of [String(C.tolak), String(C.total), "mitra A", "mitra B", "ikut mendapat", "satu bucket 100", "satu bucket"]) expect(sebelumTebak, `jawaban Tebak: ${x}`).not.toContain(x);
    const sebelumWidget = badan.slice(0, badan.indexOf("<WidgetLama"));
    for (const x of [`${B.ok} dari ${B.n}`, "tetap 200", "Retry-After", "sebelum tanda tangan", "bucket per mitra", "bucket 100 per detik sendiri", String(A.tolak)]) expect(sebelumWidget, `jawaban widget: ${x}`).not.toContain(x);
    const sebelumBlokSebenarnya = badan.slice(0, badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(sebelumBlokSebenarnya).not.toContain("bukan serangan");
    expect(sebelumBlokSebenarnya).not.toContain("NAPT");
    expect(skenario.predict.varian).toBe(true);
    expect(core.jalurTebakan(skenario)).toBe("varian");
    expect(skenario.predict.q).toContain(`Mitra A tetap mengirim ${A.n} permintaan status dan mitra B ${B.n}`);
    expect(skenario.predict.options[skenario.predict.answer]).toBe(`${B.ok} dari ${B.n}: bucket B terpisah dari bucket A`);
  });
  test("skenario alur: valid menurut alur-core, tanpa perangkat, tiga komponen, empat langkah dan tiga langkah varian mulai di 2, jenis Ilustrasi", () => {
    expect(core.validate(core.normalize(skenario), { exists: (p: string) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber.jenis).toBe("ilustrasi");
    expect(skenario.perangkat).toEqual([]);
    expect(skenario.layarAwal).toEqual({});
    expect(skenario.komponen.map((k) => [k.id, k.label])).toEqual([["pos", "POS mitra"], ["batas", "Batas permintaan"], ["api", "API Rekeningo"]]);
    expect(skenario.langkah).toHaveLength(4);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(2);
    expect(core.steps(skenario, true)).toHaveLength(5);
    expect(skenario.langkah.map((l) => [l.dari, l.ke ?? null, l.judul, l.nada ?? null])).toEqual([
      ["pos", "batas", "Kasir mitra A mengulang tanpa jeda", null],
      ["pos", "batas", "Lab meniru dua mitra dalam satu detik", null],
      ["batas", "api", "Satu bucket untuk semua mitra", "warn"],
      ["batas", "pos", "Mitra B ikut mendapat 429", "warn"],
    ]);
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke ?? null, l.judul, l.nada ?? null])).toEqual([
      ["batas", "api", "Bucket dihitung per mitra", "good"],
      ["batas", "pos", "429 dari gerbang membawa Retry-After", null],
      ["batas", null, "Batas ini dihitung sebelum tanda tangan", "warn"],
    ]);
    expect(badan).toContain("centang **Ubah satu hal: " + skenario.varian.label + "**");
    expect(skenario.varian.label).toBe(`Tiap mitra punya bucket ${kuota} per detik sendiri`);
    for (const l of [...skenario.langkah, ...skenario.varian.langkah]) { expect(l.kirim.length).toBeGreaterThan(0); expect(l.jelas.length).toBeGreaterThan(0); }
  });
  test("skenario: kalimat kirim dan jelas memakai angka dari rekaman, kode, dan hitungan", () => {
    const [l1, l2, l3, l4] = skenario.langkah as [Langkah, Langkah, Langkah, Langkah];
    expect(l1.kirim).toBe(`Rabu ${hariJam[1]}: ${ribu(POS_RPS)} permintaan per detik dari satu mitra (Ilustrasi)\n${ribu(POS_RPS)} ÷ ${puncakTulis} = ${koma(POS_RPS / bulat(puncakRps, 1), 2)}, jadi ${bulat((100 * POS_RPS) / bulat(puncakRps, 1), 0)}% dari seluruh puncak (Hitungan atas Ilustrasi)`);
    expect(l1.jelas).toBe("Pembaruan POS membuat kasir mengulang permintaan status tiap kali jawabannya belum ada. Hari, jam, dan angkanya dari cerita.");
    expect(l2.kirim).toBe(`mitra A: ${A.n} GET status\nmitra B: ${B.n} GET status, diselipkan di antaranya\n${A.n + B.n} permintaan dalam satu detik (Rekaman lab)`);
    expect(l2.jelas).toBe(`Lab memakai ${A.n} dan ${B.n}, bukan ${ribu(POS_RPS)}. Jam bucket dibekukan, jadi laju sungguhan tidak diukur (kuota.txt, bagian A; kode lab memakai pekerjaan yang sama di bagian C).`);
    expect(l3.kirim).toBe(`satu bucket ${C.bucket} per detik untuk semua mitra\n200: ${C.ok}, 429: ${C.tolak} dari ${C.total} permintaan (Rekaman lab)`);
    expect(l3.jelas).toBe("Mode kuota-bersama memakai satu kunci bucket untuk semua mitra. Seratus permintaan lolos ke API, dan sisanya mendapat 429.");
    expect(C.ok).toBe(100);
    expect(l4.kirim).toBe(`mitra B mendapat 429: ${bIkutC} (Rekaman lab)`);
    expect(l4.jelas).toBe(`B hanya mengirim ${B.n} permintaan, tetapi memakai bucket yang sama dengan A. Bagian B yang tepat tidak dihitung terpisah di rekaman ini.`);
    const [v1, v2, v3] = skenario.varian.langkah as [Langkah, Langkah, Langkah];
    expect(v1.kirim).toBe(`mitra A: ${A.n} permintaan -> 200: ${A.ok}, 429: ${A.tolak}\nmitra B: ${B.n} permintaan -> 200: ${B.ok}, 429: ${B.tolak} (Rekaman lab)`);
    expect(v1.jelas).toBe("Kuota dibaca dari baris mitra masing-masing, dan A tidak memakai token B (kuota.txt, bagian A).");
    expect(v2.kirim).toBe(`429 kuota-terlampaui, Retry-After: ${retryAfter} (Rekaman lab)`);
    expect(v2.jelas).toBe("Kepala itu memberi kasir waktu tunggu. Rekaman memuat satu jawaban 429, dan kode gerbang memasang kepala itu di setiap jawaban 429 yang ia tulis sendiri (dibaca dari kode). Lab tidak menjalankan POS yang membacanya (Tidak dijalankan).");
    expect(v3.kirim).toBe(`${pengulangan} permintaan dengan secret penandatangan salah: 401, tetapi memakai token mitra pemiliknya\nlalu kasir A yang sah: 429 (Rekaman lab, tes Go)`);
    expect(v3.jelas).toBe("Urutan di gerbang: kunci API, kuota, lalu tanda tangan. Kunci yang bocor tanpa secret penandatangannya masih bisa menghabiskan kuota pemiliknya.");
    expect(skenario.predict.explain).toBe(
      `Bucket dihitung per mitra, jadi ${A.n} permintaan A tidak memakai token B. Rekaman: A ${A.ok} lolos dan ${A.tolak} mendapat 429, sedangkan B ${B.ok} dari ${B.n} tetap 200. Jam bucket dibekukan, jadi ini hitungan token dalam satu detik, bukan laju sungguhan.`,
    );
    expect(skenario.sumber.catatan).toContain("Laju sungguhan tidak diukur, dan lab memakai 600 dan 20, bukan 3.000.");
  });
  test("tebakan skenario: empat pilihan, tepat satu benar di posisi ketiga dan bukan pilihan terpanjang; pengantar persis", () => {
    expect(skenario.predict.options).toHaveLength(4);
    expect(skenario.predict.answer).toBe(2);
    const panjang = skenario.predict.options.map((o) => o.length);
    expect(Math.max(...panjang)).not.toBe(panjang[skenario.predict.answer]);
    expect(skenario.predict.options).toEqual([
      "0 dari 20: B tidak bisa lolos selama A melewati batasnya",
      "10 dari 20: kuota 100 dibagi sama rata ke mitra yang sedang aktif",
      "20 dari 20: bucket B terpisah dari bucket A",
      "Bergantung urutan 16 thread: B hanya lolos bila permintaannya tiba sebelum A menghabiskan token",
    ]);
    expect(skenario.pengantar).toBe("Satu POS mitra mengulang permintaan status tanpa jeda, dan satu batas dipakai semua mitra. Tebakannya tentang satu hal yang kamu ubah: centang 'Ubah satu hal' di bawah, dan jawabannya terbuka di akhir langkah varian.");
    expect(skenario.predict.options[3]).toContain(String(16));
    expect(kA.join("\n")).toContain("16 thread");
  });
  test("diagram Rantai: ringkas, dua baris tiga simpul, sumber ilustrasi, angka dari rekaman dan hitungan", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.id).toBe("t5-m50-satu-pos");
    expect(d.sumber.jenis).toBe("ilustrasi");
    expect(d.sumber.teks).toBe("Baris pertama cerita (Ilustrasi) dan hitungan atasnya; baris kedua rekaman lab t5-waf · kuota.txt bagian C (mode kuota-bersama, jam bucket dibekukan)");
    expect(d.baris).toHaveLength(2);
    expect(d.baris.map((b) => b.simpul.length)).toEqual([3, 3]);
    expect(d.baris.map((b) => [b.label, b.sub])).toEqual([["Pengulangan", "kasir mitra, cerita"], ["Batas bersama", "satu bucket, rekaman"]]);
    expect(d.baris[0]!.simpul.map((s) => [s.teks, s.sub ?? "", s.nada])).toEqual([
      ["Jawaban belum ada", "status pembayaran menunggu", "biasa"],
      ["Kasir mengulang", "tanpa jeda", "biasa"],
      [`${ribu(POS_RPS)} per detik`, `${bulat((100 * POS_RPS) / bulat(puncakRps, 1), 0)}% dari puncak (Ilustrasi)`, "warn"],
    ]);
    expect(d.baris[1]!.simpul.map((s) => [s.teks, s.sub ?? "", s.nada])).toEqual([
      [`${C.total} permintaan`, `satu bucket ${C.bucket} per detik`, "biasa"],
      [`${C.tolak} mendapat 429`, `${C.ok} lolos`, "biasa"],
      ["Mitra B ikut 429", "walau tidak mengulang", "warn"],
    ]);
    expect(d.catatan).toBe("Baris pertama adalah cerita (Ilustrasi) dan baris kedua rekaman lab dengan 600 dan 20 permintaan, bukan 3.000. Kotak oranye adalah hasil yang bukan niat tim. Laju sungguhan tidak diukur.");
    expect(d.judul).toBe("Satu mitra mengulang tanpa jeda, dan satu batas bersama membuat mitra lain ikut mendapat 429");
    const ringkasan = d.baris.flatMap((b) => b.simpul.map((s) => s.teks)).join(" ");
    expect(ringkasan.length).toBeLessThanOrEqual(150);
    expect(C.ok + C.tolak).toBe(C.total);
  });
  test("kartu Cek diri: tiga kartu t5-m50, tanya sama dengan soal di halaman, jawaban halaman termuat dan diturunkan dari rekaman", () => {
    const kartu = kartuSemua.filter((x) => x.halaman === "t5-m50");
    expect(kartu.map((x) => x.id)).toEqual(["t5-m50-1", "t5-m50-2", "t5-m50-3"]);
    const soal = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(soal).toHaveLength(3);
    expect(jawaban).toHaveLength(3);
    kartu.forEach((k, i) => {
      expect(k.judul).toBe("5.24 M50: Satu POS mengirim 3.000 permintaan per detik");
      expect(k.url).toBe("tahap-5/m50-satu-pos/");
      expect(k.tanya).toBe(soal[i]);
      expect(k.jawab).toBe(jawaban[i]);
    });
    expect(kartuSemua.filter((x) => x.id.startsWith("t5-m50-"))).toHaveLength(3);
    expect(soal[0]).toBe(`Satu bucket ${C.bucket} per detik dipakai semua mitra. Mitra A mengirim ${A.n} permintaan dan mitra B ${B.n} dalam satu detik. Berapa permintaan yang mendapat 429, dan apa yang berubah bila bucket dihitung per mitra?`);
    expect(jawaban[0]).toBe(
      `${C.tolak} dari ${C.total} permintaan mendapat 429 dan ${C.ok} lolos, dan mitra B ikut mendapat 429 (\`kuota.txt\`, bagian C). Dengan bucket per mitra, A mendapat ${A.ok} jawaban 200 dan ${A.tolak} jawaban 429, sedangkan B ${B.ok} dari ${B.n} tetap 200 (bagian A). Jam bucket dibekukan, jadi ini hitungan token, bukan laju sungguhan.`,
    );
    expect(jawaban[1]).toBe(
      `Tanpa key ada ${mTanpa[4]!.replace("2", "dua")} baris \`qr\` (gerbang di mode \`tanpa-idempoten-wajib\`). Dengan key yang sama ada ${mKey[5]!.replace("1", "satu")} baris: ${mKey[1]} dua kali dengan id QR yang sama (\`tandatangan.txt\`, bagian A). Lab tidak membayar QR itu, jadi pembeli membayar keduanya hanya dari naskah.`,
    );
    expect(jawaban[2]).toBe(
      `Rabu, ${hariJam[1]}, ${ribu(POS_RPS)} permintaan per detik, dan jawaban yang lambat berasal dari cerita (Ilustrasi), dan 216% adalah Hitungan atas Ilustrasi. Lab memakai ${A.n} dan ${B.n} permintaan dengan jam bucket dibekukan, jadi laju sungguhan, jawaban lambat, dan kapasitas server tidak diukur (\`kuota.txt\`, bagian C).`,
    );
  });
  test("definisi di pemakaian pertama: Hitungan, DDoS, token bucket, Penalaran, dibaca dari kode, Tes Go, NAT, dan Idempotency-Key sebelum dipakai", () => {
    const pos = (s: string): number => { const i = badan.indexOf(s); expect(i, s).toBeGreaterThanOrEqual(0); return i; };
    expect(pos("Hitungan berarti angka yang dihitung dari angka lain")).toBeLessThan(pos("Jadi 216% adalah Hitungan atas Ilustrasi"));
    expect(pos("POS adalah kasir elektronik di toko")).toBeLessThan(pos("Tim mengira tiga hal"));
    expect(pos("serangan DDoS, yaitu banjir permintaan dari banyak sumber")).toBeLessThan(pos("Kedua, alamat jaringan mitra itu perlu diblokir"));
    expect(pos("Batasnya token bucket: tiap permintaan memakai satu token")).toBeLessThan(pos("Tebak dulu"));
    expect(badan.indexOf("Penalaran")).toBe(pos("Penalaran adalah kesimpulan dari kode atau rekaman yang tidak diukur langsung"));
    expect(badan.indexOf("Dibaca dari kode berarti")).toBeLessThan(badan.search(/dibaca dari kode[,)]/));
    expect(badan.indexOf("Tes Go adalah tes otomatis")).toBeLessThan(badan.indexOf("tes Go", badan.indexOf("Tes Go adalah tes otomatis") + 10));
    expect(pos("NAT adalah penerjemahan alamat jaringan")).toBeLessThan(pos("satu alamat NAT, hitungannya satu untuk semuanya"));
    expect(badan.indexOf("alamat NAT")).toBe(pos("satu alamat NAT, hitungannya satu untuk semuanya") + "satu ".length);
    expect(pos("Idempotency-Key adalah kepala permintaan yang membuat pengulangan POST menghasilkan satu hasil")).toBeLessThan(pos("Dua POST yang sama dikirim ke satu merchant"));
    // Retry-After dan WAF: arti di pemakaian pertama (kemunculan pertama di badan harus yang berarti); arti WAF sama dengan 5.1
    expect(badan.indexOf("Retry-After")).toBe(pos("kepala `Retry-After` (waktu tunggu bagi client sebelum mencoba lagi)") + "kepala `".length);
    expect(badan.indexOf("WAF")).toBe(pos("WAF (penyaring permintaan HTTP di depan API)"));
    expect(baca("situs/src/content/docs/tahap-5/prd-v5.mdx")).toContain("WAF, yaitu penyaring permintaan HTTP di depan API");
    expect(r227).toContain("indicating how long to wait before making a new request");
    expect(badan).not.toMatch(/\bpelanggan\b/);
    expect(badan).not.toMatch(/\brahasia\b/);
    expect(badan).not.toMatch(/\blayanan\b/);
    expect(JSON.stringify(skenario)).not.toMatch(/\brahasia\b/);
    expect(hitungKali(badan, "Penalaran")).toBe(7);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, skenario, dan kartu; 'bagian C' dan 'bagian A' dipakai", () => {
    const semua = [halaman.replace("[[A0]]", ""), JSON.stringify(rantaiMentah), JSON.stringify(skenario), JSON.stringify(kartuSemua.filter((x) => x.halaman === "t5-m50"))].join("\n");
    expect(semua).not.toMatch(/\bR\d-\d+\b/);
    expect(semua).not.toMatch(/\bkeputusan\s+#?\d{2,4}\b/i);
    expect(semua).not.toMatch(/\bPR\s*#?\d{2,4}\b|\(#\d{3,4}\)/);
    expect(semua).not.toMatch(/(?<![\w./#-])[A-G]\d+(?:\.\d+)?(?![\w])/);
    expect(semua).not.toMatch(/\bD1\b|\bD2\b|\bC2\b|\bA1\b/);
  });
  test("label: tak satu angka cerita berlabel Rekaman lab; jumlah 'Rekaman lab' sama dengan definisi, jawaban Tebak, dua baris tabel, dan satu judul Snippet", () => {
    const ilustrasi = ["Rabu", hariJam[1]!, "3.000", "216%", "lambat"];
    for (const b of badan.split("\n")) {
      if (/Rekaman lab/.test(b) && !b.startsWith("<Snippet") && !b.startsWith("*Angka cerita")) for (const x of ilustrasi) expect(b, `'${x}' di baris Rekaman lab`).not.toContain(x);
    }
    expect(hitungKali(badan, "Rekaman lab")).toBe(1 + 1 + 2 + 1);
    expect(badan).not.toMatch(/Rekaman lab[^.\n]*216%/);
  });
});

describe("penutup celah mutasi tanpa kunci: frontmatter, Gejala, noscript, butir Yang tidak direkam, Konsep yang lahir, dan teks diagram dan skenario", () => {
  test("frontmatter persis, dan deskripsi memuat tiga fakta halaman", () => {
    expect(frontmatter).toBe(
      'title: "5.24 M50: Satu POS mengirim 3.000 permintaan per detik"\n' +
        "description: Minggu 12. Pembaruan POS membuat kasir mitra mengulang permintaan tanpa jeda. Satu batas bersama membuat mitra lain ikut mendapat 429, dan POST yang diulang tanpa Idempotency-Key membuat dua QR.\n",
    );
    expect(frontmatter).toContain(`Minggu ${mingguM50}.`);
  });
  test("adegan Gejala: hari, jam, angka, dan Bu Marni sama dengan baris M50 naskah; tanpa kalimat definisi; dua catatan berawalan bintang", () => {
    const g = badan.slice(badan.indexOf('<Blok nama="Gejala" buka>'), badan.indexOf("</Blok>"));
    const paragraf = g.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<"));
    expect(paragraf).toHaveLength(6);
    const adegan = paragraf.filter((b) => !b.startsWith("*"));
    expect(adegan).toEqual([
      `Minggu ${mingguM50} Tahap 5. Rabu pukul ${hariJam[1]} Tomi memasang pembaruan POS di kasir milik mitranya.`,
      "Kasir menunggu jawaban status pembayaran. Jawaban itu belum datang, dan kasir mengulang permintaannya tanpa jeda.",
      `Satu mitra kini mengirim ${ribu(POS_RPS)} permintaan per detik. Angka itu 216% dari seluruh puncak.`,
      "Bu Marni dan merchant lain yang memakai POS mitra lain mendapat 429 dan jawaban yang lambat.",
    ]);
    expect(paragraf.filter((b) => b.startsWith("*"))).toHaveLength(2);
    expect(paragraf.filter((b) => b.startsWith("*")).map((b) => b.slice(0, b.indexOf(":*") + 2))).toEqual(["*Angka cerita (Ilustrasi dan Hitungan):*", "*Dua istilah di cerita:*"]);
    expect(adegan.join(" ")).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/);
    for (const b of adegan) expect(b.split(/(?<=[.!?])\s+(?=[A-Z0-9"(\[*_`])/).length).toBeLessThanOrEqual(4);
  });
  test("noscript sama dengan kalimat yang dibangun dari nilai turunan", () => {
    const m = cari(/<noscript>\n([\s\S]*?)\n<\/noscript>/, badan, "noscript")[1]!;
    expect(m).toBe(
      `Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Jalur utama: satu bucket ${C.bucket} per detik untuk ${C.total} permintaan menghasilkan ${C.ok} jawaban 200 dan ${C.tolak} jawaban 429. Mitra B ikut mendapat 429 (bagian C).\n\n` +
        `Dengan bucket per mitra, mitra A mendapat ${A.ok} jawaban 200 dan ${A.tolak} jawaban 429, sedangkan mitra B ${B.ok} dari ${B.n} tetap 200 (bagian A).`,
    );
  });
  test("pembuka tebal di blok Yang sebenarnya dan Coba sendiri: daftar dan urutan", () => {
    const tebal = [...badan.matchAll(/^\*\*([^*\n]+)\.\*\* /gm)].map((m) => m[1]!).filter((x) => !/^\d$/.test(x));
    expect(tebal).toEqual([
      "Pengulangan ini bukan serangan dari luar",
      "Serangan lapisan 7 yang sungguhan ada, tetapi bentuknya lain",
      "Satu batas bersama menghabiskan jatah mitra lain",
      "Pengulangan POST tanpa Idempotency-Key membuat dua QR",
    ]);
    expect(badan).toContain("**Yang tidak direkam.**");
    expect(badan).toContain("centang **Ubah satu hal: ");
  });
  test("Konsep yang lahir: tiga tautan, kalimat penutup, dan ADR yang dirujuk (27, 34, 56) cocok dengan halaman tujuan", () => {
    const k = badan.slice(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    const butir = k.split("\n").filter((b) => b.startsWith("- "));
    expect(butir).toEqual([
      "- [[t5-waf]]: kuota per mitra, tanda tangan bertimestamp, WAF, dan cakupan kunci di pintu untuk pihak luar. Keputusannya ADR 56.",
      "- [[t3-rate-limit-redis]]: ADR 27, yang menghitung percobaan login per alamat dan per akun. Di belakang proxy semua client berbagi satu alamat, dan NAT berakibat sama (Penalaran).",
      "- [[t4-webhook]]: HMAC bertimestamp di ADR 34 untuk pesan masuk. Pintu mitra memakai pola yang sama, dengan method dan alamat ikut ditandatangani.",
    ]);
    expect(dari("t5-waf").adr).toEqual([56]);
    expect(dari("t3-rate-limit-redis").judul).toContain("ADR 27");
    expect(dari("t4-webhook").judul).toContain("ADR 34");
    expect(hal427).toContain("ADR 34");
    expect(k).toContain("Satu mitra yang mengulang tanpa jeda cukup untuk menghabiskan batas yang dipakai bersama, jadi batas dihitung per mitra.");
    // pola ADR 34 ditambah method dan alamat: dibaca dari README lab dan kode tanda tangan
    expect(readmeLab).toContain("**Tanda tangan memuat method dan alamat.**");
    expect(baca("labs/t5-waf/gerbang/tanda.go")).toContain('"%d.%s.%s."');
    expect(naskah).toContain("pola ADR 34");
  });
  test("teks diagram dan skenario: sumber, pengantar, catatan, dan nada langkah persis", () => {
    expect(skenario.judul).toBe("Satu POS mengulang tanpa jeda, satu batas bersama");
    expect(skenario.sumber.catatan).toBe(
      "Jalur utama memuat satu langkah cerita (Ilustrasi: Rabu 10.15, 3.000 permintaan per detik) dan tiga langkah rekaman lab t5-waf (kuota.txt bagian A: pekerjaan 600 permintaan mitra A dan 20 mitra B dengan jam bucket dibekukan; bagian C: mode kuota-bersama). Ubah satu hal memakai kuota.txt bagian A untuk bucket per mitra dan tes Go lab (testing.txt). Laju sungguhan tidak diukur, dan lab memakai 600 dan 20, bukan 3.000.",
    );
  });
  test("butir 'Yang tidak direkam': kalimat persis, dan rujukan ke 5.25 lewat registry", () => {
    const i = badan.indexOf("**Yang tidak direkam.**");
    const butir = badan.slice(i, badan.indexOf("</Blok>", i)).split("\n").filter((b) => b.startsWith("- "));
    expect(butir).toEqual([
      "- Rabu, 10.15, 3.000 permintaan per detik, dan jawaban yang lambat berasal dari cerita (Ilustrasi). 216% adalah Hitungan atas Ilustrasi.",
      "- Lab memakai 600 dan 20 permintaan dalam satu detik beku. Laju sungguhan, jawaban lambat, dan kapasitas server tidak diukur.",
      "- Jumlah permintaan mitra B yang tertolak di mode `kuota-bersama` tidak dihitung terpisah.",
      "- Penghitungan per alamat NAT tidak direkam: untuk rute POS semua permintaan tiba dari alamat gerbang.",
      "- Serangan volumetrik lapisan 3 dan 4 dan reset stream HTTP/2 Tidak dijalankan.",
      "- Pembelaannya, yaitu kuota per mitra, tanda tangan bertimestamp, WAF (penyaring permintaan HTTP di depan API), dan cakupan kunci, dibahas di [[t5-waf]].",
    ]);
    expect(kuotaRek).toContain("Serangan volumetrik lapisan 3 dan 4 (banjir paket, SYN flood): Tidak dijalankan.");
    expect(dari("t5-waf").judul).toContain("Pintu untuk pihak luar");
  });
});

// --- seluruh baris badan: tiap kalimat, judul, dan tabel sama dengan yang diturunkan dari rekaman, kode, registry, dan baris riset (lapis 1b, tanpa bergantung pada kunci lapis 2)
const T5 = String(registry.tahap[4]!.no);
const PERSEN = `${bulat((100 * POS_RPS) / angka(puncakTulis), 0)}%`;
const RASIO = koma(POS_RPS / angka(puncakTulis), 2);
const KODE = cari(/-> (\d{3}) kuota-terlampaui/, kA.join("\n"), "kode 429")[1]!;
const r225 = barisRiset("R5-225");
const r227 = barisRiset("R5-227");
const ISU = cari(/golang\/go#(\d+)/, r225, "nomor isu")[1]!;
const isuBuka = cari(/dibuka (\d{4}-\d{2}-\d{2})T/, r225, "tanggal buka isu")[1]!;
const isuTutup = cari(/ditutup (\d{4}-\d{2}-\d{2})T/, r225, "tanggal tutup isu")[1]!;
const RFC429 = cari(/rfc-editor\.org\/rfc\/rfc(\d+), April 2012/, r227, "RFC 429")[1]!;
const RFC_NAT = cari(/rfc-editor\.org\/rfc\/rfc(\d+), Januari 2001/, r227, "RFC NAT")[1]!;
const TGL = cari(/dibaca di main (\d{4}-\d{2}-\d{2})/, barisRiset("R5-228"), "tanggal buka sumber")[1]!;
const ADR56 = String(dari("t5-waf").adr![0]);
const ADR27 = cari(/ADR (\d+)/, dari("t3-rate-limit-redis").judul, "ADR 27")[1]!;
const ADR34 = cari(/ADR (\d+)/, dari("t4-webhook").judul, "ADR 34")[1]!;
/*BADAN*/
const BADAN_DITURUNKAN: string[] = [
  `<Blok nama="Gejala" buka>`,
  `Minggu ${mingguM50} Tahap ${T5}. Rabu pukul ${hariJam[1]} Tomi memasang pembaruan POS di kasir milik mitranya.`,
  `Kasir menunggu jawaban status pembayaran. Jawaban itu belum datang, dan kasir mengulang permintaannya tanpa jeda.`,
  `Satu mitra kini mengirim ${ribu(POS_RPS)} permintaan per detik. Angka itu ${PERSEN} dari seluruh puncak.`,
  `Bu Marni dan merchant lain yang memakai POS mitra lain mendapat ${KODE} dan jawaban yang lambat.`,
  `*Angka cerita (Ilustrasi dan Hitungan):* hari, jam, ${ribu(POS_RPS)} permintaan per detik, dan "lambat" berasal dari naskah, bukan dari rekaman. Hitungan berarti angka yang dihitung dari angka lain di halaman ini, dan labelnya ikut masukan yang paling lemah. Jadi ${PERSEN} adalah Hitungan atas Ilustrasi: ${ribu(POS_RPS)} ÷ ${puncakTulis} = ${RASIO}, dengan puncak ${puncakTulis} permintaan per detik dari Asumsi beban Tahap ${T5} ([[t5-prd]]). Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].`,
  `*Dua istilah di cerita:* POS adalah kasir elektronik di toko, dan mitra POS adalah penyedia POS pihak ketiga yang memanggil API Rekeningo ([[t5-prd]]). ${KODE} adalah kode status HTTP yang menjawab bahwa client mengirim terlalu banyak permintaan dalam waktu tertentu ([RFC ${RFC429} bagian 4](https://www.rfc-editor.org/rfc/rfc${RFC429}#section-4), dibuka ${TGL}, Tidak dijalankan).`,
  `</Blok>`,
  `<Blok nama="Yang Raka kira" buka>`,
  `Tim mengira tiga hal. Pertama, ini serangan DDoS, yaitu banjir permintaan dari banyak sumber supaya API tidak terjangkau. Kedua, alamat jaringan mitra itu perlu diblokir. Ketiga, seperti usul Nadia, API perlu lebih banyak replica.`,
  `Lab t5-waf memerankan pintu API untuk mitra POS. Satu mitra mengirim banyak permintaan status, dan mitra lain mengirim sedikit. Batasnya token bucket: tiap permintaan memakai satu token, dan token terisi ulang dengan laju tetap ([[t3-rate-limit-redis]]).`,
  `Jam bucket dibekukan di lab. Jadi lab menghitung token tepat tanpa mengukur laju sungguhan.`,
  `<details class="question">`,
  `<summary>Tebak dulu: Lab mengirim ${A.n} permintaan status dari mitra A dan ${B.n} dari mitra B dalam satu detik. Hanya ada satu bucket ${kuota} token per detik, dan semua mitra memakainya. Berapa permintaan yang mendapat ${KODE}, dan apakah mitra B ikut?</summary>`,
  `${C.tolak} dari ${C.total} permintaan mendapat ${KODE}, dan ${C.ok} lainnya lolos dengan 200. Mitra B ikut mendapat ${KODE} (Rekaman lab, \`kuota.txt\`, bagian C).`,
  `Rekaman itu tidak menghitung bagian B terpisah, jadi berapa dari ${B.n} permintaan B yang tertolak tidak terukur. Blok berikutnya menunjukkan kodenya dan menjelaskan kenapa satu pengulangan cukup.`,
  `</details>`,
  `</Blok>`,
  `<Blok nama="Yang sebenarnya">`,
  `Pengirimnya mitra yang sah. Kasirnya mengulang permintaan karena jawaban belum datang, dan satu batas bersama membuat mitra lain ikut mendapat ${KODE}.`,
  `<Rantai data={satuPos} ringkas />`,
  `*Tiga label turunan:* Penalaran adalah kesimpulan dari kode atau rekaman yang tidak diukur langsung, jadi labelnya Tidak dijalankan. Dibaca dari kode berarti isi kode sumber dibaca tanpa dijalankan. Tes Go adalah tes otomatis di folder gerbang: \`testing.txt\` mencatat nama dan hasil PASS-nya, dan isinya dibaca dari kode tes.`,
  `*Kondisi rekaman:* gerbang Go di depan \`api-t5\`, keduanya di localhost, dengan PostgreSQL ${versi.pg}, go${versi.go}, dan Redis ${versi.redis}, dari database bersih. Jam bucket dimajukan lewat \`POST /lab/jam\`, jadi ${A.n} permintaan dihitung dalam satu detik tanpa menunggu waktu sungguhan. Bagian C memakai pekerjaan yang sama dengan bagian A: ${A.n} permintaan mitra A dan ${B.n} mitra B (dibaca dari kode lab, Tidak dijalankan). POS tiruan adalah client Python dengan kunci API dan tanda tangan yang sah.`,
  `**Pengulangan ini bukan serangan dari luar.** Kalau kamu pernah memasang retry di app, kamu tahu pola kasir ini: ia mencoba lagi sampai jawaban datang. Pada pembaruan Tomi jawaban status belum datang, jadi pengulangannya tidak berhenti (cerita; Penalaran).`,
  `OWASP API Security Top 10 edisi 2023 menamai risiko ini API4, konsumsi sumber daya tanpa batas ([OWASP API4:2023](https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption), dibuka ${TGL}, Tidak dijalankan). Menurut halaman itu, melayani permintaan membutuhkan bandwidth jaringan, CPU, memori, dan penyimpanan. Salah satu pencegahannya membatasi seberapa sering client boleh memanggil API dalam jangka waktu tertentu.`,
  `**Serangan lapisan 7 yang sungguhan ada, tetapi bentuknya lain.** Isu golang/go#${ISU} (dibuka ${isuBuka}, ditutup ${isuTutup}) menggambarkan client HTTP/2 berniat jahat yang membuat permintaan lalu segera me-reset-nya, sehingga server menjalankan kerja berlebih. Perbaikannya membatasi jumlah goroutine handler yang berjalan bersamaan sebesar batas stream ([golang/go#${ISU}](https://github.com/golang/go/issues/${ISU}), dibuka ${TGL}, Tidak dijalankan). Gerbang lab melayani HTTP tanpa TLS di localhost, jadi isu itu tidak direkam.`,
  `**Satu batas bersama menghabiskan jatah mitra lain.** Gerbang memilih kunci bucket dari mitra yang kunci API-nya sah. Mode rentan \`kuota-bersama\` memakai satu kunci untuk semua mitra:`,
  `<Snippet file="labs/t5-waf/gerbang/gerbang.go" lines="163:166" lang="go" title="Kode lab: labs/t5-waf/gerbang/gerbang.go, pemilihan kunci bucket di ServeHTTP" />`,
  `Dengan satu bucket ${kuota} per detik, ${C.total} permintaan menghasilkan ${C.ok} jawaban 200 dan ${C.tolak} jawaban ${KODE}:`,
  `<Snippet file="labs/t5-waf/output/kuota.txt" lines="29:30" title="Rekaman lab: labs/t5-waf/output/kuota.txt, bagian C (mode kuota-bersama)" />`,
  `Mitra B ikut mendapat ${KODE}, walau ia hanya mengirim ${B.n} permintaan. Mode ini memerankan satu batas yang dipakai semua mitra, sesuai tulisan naskah (Penalaran). Ia tidak menghitung per alamat.`,
  `NAT adalah penerjemahan alamat jaringan. Salah satu jenisnya, NAPT, menerjemahkan banyak alamat dan port menjadi satu alamat ([RFC ${RFC_NAT}](https://www.rfc-editor.org/rfc/rfc${RFC_NAT}), Informational, dibuka ${TGL}, Tidak dijalankan). Naskah menulis bahwa batas per alamat dari ADR ${ADR27} memberi satu hitungan untuk satu alamat. Bila banyak kasir berbagi satu alamat NAT, hitungannya satu untuk semuanya (Penalaran, dari mekanismenya; lab tidak merekamnya).`,
  `Karena itu memblokir alamat mitra bukan jawabannya. Semua kasir di belakang alamat itu ikut berhenti, termasuk kasir yang tidak mengulang apa pun (Penalaran). Menambah replica menambah ruang untuk pengulangan yang sama (Penalaran). Kapasitas satu server tidak diukur di lab t5-waf (Tidak dijalankan).`,
  `**Pengulangan POST tanpa Idempotency-Key membuat dua QR.** Idempotency-Key adalah kepala permintaan yang membuat pengulangan POST menghasilkan satu hasil ([[t2-idempotency]]). Di \`api-t5\`, \`idempoten\` meneruskan permintaan tanpa kepala itu apa adanya, termasuk di rute POS untuk membuat QR (Tidak dijalankan, dibaca dari kode).`,
  `Dua POST yang sama dikirim ke satu merchant. Tabel ini menaruh kedua kasus dari rekaman:`,
  `| Dua POST yang sama | Jawaban | Baris \`qr\` milik merchant |`,
  `|---|---|---|`,
  `| Tanpa Idempotency-Key, mode \`tanpa-idempoten-wajib\` | ${mTanpa[1]} dan ${mTanpa[2]} | ${mTanpa[4]} (Rekaman lab) |`,
  `| Dengan Idempotency-Key yang sama | ${mKey[1]} dan ${mKey[2]}, id QR sama | ${mKey[5]} (Rekaman lab) |`,
  `Naskah menulis bahwa pembeli bisa membayar kedua QR. Lab hanya merekam jumlah baris \`qr\` (\`tandatangan.txt\`, bagian A) dan tidak membayar QR itu.`,
  `**Yang tidak direkam.**`,
  `- Rabu, ${hariJam[1]}, ${ribu(POS_RPS)} permintaan per detik, dan jawaban yang lambat berasal dari cerita (Ilustrasi). ${PERSEN} adalah Hitungan atas Ilustrasi.`,
  `- Lab memakai ${A.n} dan ${B.n} permintaan dalam satu detik beku. Laju sungguhan, jawaban lambat, dan kapasitas server tidak diukur.`,
  `- Jumlah permintaan mitra B yang tertolak di mode \`kuota-bersama\` tidak dihitung terpisah.`,
  `- Penghitungan per alamat NAT tidak direkam: untuk rute POS semua permintaan tiba dari alamat gerbang.`,
  `- Serangan volumetrik lapisan 3 dan 4 dan reset stream HTTP/2 Tidak dijalankan.`,
  `- Pembelaannya, yaitu kuota per mitra, tanda tangan bertimestamp, WAF (penyaring permintaan HTTP di depan API), dan cakupan kunci, dibahas di [[t5-waf]].`,
  `</Blok>`,
  `<Blok nama="Coba sendiri">`,
  `Widget ini mengikuti cerita M50. Jalur utama memuat satu langkah cerita (Ilustrasi) dan tiga langkah rekaman, dan "Ubah satu hal" memakai rekaman \`kuota.txt\` bagian A dan tes Go. Tebak dulu, lalu tekan Berikutnya atau panah kanan.`,
  `<WidgetLama nama="alur" src="data/skenario/t5-m50.json" />`,
  `Sesudah langkah terakhir, centang **Ubah satu hal: Tiap mitra punya bucket ${kuota} per detik sendiri**. Tiga langkah berikutnya memuat rekaman bucket per mitra, kepala \`Retry-After\` (waktu tunggu bagi client sebelum mencoba lagi), dan urutan kuota sebelum tanda tangan.`,
  `Widget ini tidak punya layar HP, karena M50 terjadi di antara API dan kasir mitra, bukan di app.`,
  `<noscript>`,
  `Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Jalur utama: satu bucket ${kuota} per detik untuk ${C.total} permintaan menghasilkan ${C.ok} jawaban 200 dan ${C.tolak} jawaban ${KODE}. Mitra B ikut mendapat ${KODE} (bagian C).`,
  `Dengan bucket per mitra, mitra A mendapat ${A.ok} jawaban 200 dan ${A.tolak} jawaban ${KODE}, sedangkan mitra B ${B.ok} dari ${B.n} tetap 200 (bagian A).`,
  `</noscript>`,
  `</Blok>`,
  `<Blok nama="Konsep yang lahir">`,
  `- [[t5-waf]]: kuota per mitra, tanda tangan bertimestamp, WAF, dan cakupan kunci di pintu untuk pihak luar. Keputusannya ADR ${ADR56}.`,
  `- [[t3-rate-limit-redis]]: ADR ${ADR27}, yang menghitung percobaan login per alamat dan per akun. Di belakang proxy semua client berbagi satu alamat, dan NAT berakibat sama (Penalaran).`,
  `- [[t4-webhook]]: HMAC bertimestamp di ADR ${ADR34} untuk pesan masuk. Pintu mitra memakai pola yang sama, dengan method dan alamat ikut ditandatangani.`,
  `Satu mitra yang mengulang tanpa jeda cukup untuk menghabiskan batas yang dipakai bersama, jadi batas dihitung per mitra.`,
  `### Cek diri`,
  `**1.** Satu bucket ${kuota} per detik dipakai semua mitra. Mitra A mengirim ${A.n} permintaan dan mitra B ${B.n} dalam satu detik. Berapa permintaan yang mendapat ${KODE}, dan apa yang berubah bila bucket dihitung per mitra?`,
  `<details class="success">`,
  `<summary>Jawaban</summary>`,
  `${C.tolak} dari ${C.total} permintaan mendapat ${KODE} dan ${C.ok} lolos, dan mitra B ikut mendapat ${KODE} (\`kuota.txt\`, bagian C). Dengan bucket per mitra, A mendapat ${A.ok} jawaban 200 dan ${A.tolak} jawaban ${KODE}, sedangkan B ${B.ok} dari ${B.n} tetap 200 (bagian A). Jam bucket dibekukan, jadi ini hitungan token, bukan laju sungguhan.`,
  `</details>`,
  `**2.** Kasir mengulang POST untuk membuat QR tanpa Idempotency-Key. Berapa baris \`qr\` terbentuk dari dua POST yang sama, dan apa yang terjadi dengan key yang sama?`,
  `<details class="success">`,
  `<summary>Jawaban</summary>`,
  `Tanpa key ada dua baris \`qr\` (gerbang di mode \`tanpa-idempoten-wajib\`). Dengan key yang sama ada satu baris: ${mKey[1]} dua kali dengan id QR yang sama (\`tandatangan.txt\`, bagian A). Lab tidak membayar QR itu, jadi pembeli membayar keduanya hanya dari naskah.`,
  `</details>`,
  `**3.** Angka mana di halaman ini yang bukan rekaman, dan apa yang lab tidak ukur?`,
  `<details class="success">`,
  `<summary>Jawaban</summary>`,
  `Rabu, ${hariJam[1]}, ${ribu(POS_RPS)} permintaan per detik, dan jawaban yang lambat berasal dari cerita (Ilustrasi), dan ${PERSEN} adalah Hitungan atas Ilustrasi. Lab memakai ${A.n} dan ${B.n} permintaan dengan jam bucket dibekukan, jadi laju sungguhan, jawaban lambat, dan kapasitas server tidak diukur (\`kuota.txt\`, bagian C).`,
  `</details>`,
  `</Blok>`,
  `<SkripLama daftar={["hp","alur-core","alur"]} />`,
];
/*AKHIR-BADAN*/

describe("seluruh baris badan: setiap kalimat, judul, dan tabel sama dengan yang diturunkan dari rekaman, kode, registry, dan baris riset", () => {
  test("daftar baris tak kosong sama persis, dalam urutan yang sama", () => {
    expect(badan.split("\n").filter((b) => b.trim() !== "")).toEqual(BADAN_DITURUNKAN);
  });
  test("pertanyaan tebakan skenario persis, dengan angka dari rekaman", () => {
    expect(skenario.predict.q).toBe(
      `Tiap mitra sekarang punya bucket ${kuota} per detik sendiri. Mitra A tetap mengirim ${A.n} permintaan status dan mitra B ${B.n}, semuanya dalam satu detik. Berapa dari ${B.n} permintaan mitra B yang mendapat 200?`,
    );
  });
});

// --- baris riset yang dibaca ke sumber primer pada 2026-11-04: kutipan, versi, tanggal, dan alamat tidak boleh berubah tanpa membuka sumbernya lagi
const RISET_TERKUNCI: Record<string, string> = {
  "R5-225": "| R5-225 | Isu golang/go#63417: reset stream HTTP/2 beruntun (halaman 5.24) | golang/go#63417, judul \"net/http, x/net/http2: rapid stream resets can cause excessive work (CVE-2023-39325)\", dibaca dari JSON mentah `gh api repos/golang/go/issues/63417`, dibuka 2026-11-04: dibuka 2023-10-06T15:52:23Z, ditutup 2023-10-10T16:33:30Z, label Security. Teks isu: \"A malicious HTTP/2 client which rapidly creates requests and immediately resets them can cause excessive server resource consumption.\" dan \"HTTP/2 servers now bound the number of simultaneously executing handler goroutines to the stream concurrency limit.\" Perbaikan juga ada di golang.org/x/net/http2 v0.17.0, dan batas bawaan 250 stream per koneksi HTTP/2 | Satu paragraf \"Serangan lapisan 7 yang sungguhan ada, tetapi bentuknya lain\": tanggal buka dan tutup, client HTTP/2 berniat jahat, perbaikan membatasi goroutine handler setara batas stream; Tidak dijalankan (gerbang lab melayani HTTP tanpa TLS di localhost) | Tidak berubah (isu ditutup 2023-10-10, dicek 2026-11-04) |",
  "R5-226": "| R5-226 | OWASP API Security Top 10:2023, API4 konsumsi sumber daya tanpa batas (halaman 5.24) | api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption (owasp.org/API-Security/editions/2023/en/... mengalihkan 308 ke host itu), dibuka dengan WebFetch 2026-11-04: judul \"API4:2023 Unrestricted Resource Consumption\"; \"Satisfying API requests requires resources such as network bandwidth, CPU, memory, and storage.\"; pencegahan: \"Implement a limit on how often a client can interact with the API within a defined timeframe (rate limiting).\" Halaman hanya memuat hak cipta 2023 sebagai penanda waktu. Kalimat berikutnya tentang penyedia pihak ketiga terpotong dalam pembacaan dan tidak dipakai | Satu paragraf: edisi 2023 menamai risiko API4, melayani permintaan butuh bandwidth jaringan, CPU, memori, dan penyimpanan, dan satu pencegahan membatasi seberapa sering client memanggil API; ditulis sebagai parafrase | Tidak berubah (edisi 2023, dicek 2026-11-04) |",
  "R5-227": "| R5-227 | Arti 429 dan arti NAT (halaman 5.24, catatan istilah di Gejala dan paragraf batas per alamat) | RFC 6585 bagian 4 (rfc-editor.org/rfc/rfc6585, April 2012, Standards Track, Proposed Standard, memperbarui RFC 2616 menurut halaman info), dibuka 2026-11-04: \"The 429 status code indicates that the user has sent too many requests in a given amount of time (\"rate limiting\").\"; respons \"SHOULD include details explaining the condition, and MAY include a Retry-After header indicating how long to wait before making a new request\". RFC 3022 (rfc-editor.org/rfc/rfc3022, Januari 2001, Informational, \"Obsoletes: 1631\", tanpa Obsoleted by di halaman info), dibuka 2026-11-04, abstrak: NAPT adalah cara di mana \"many network addresses and their TCP/UDP ports are translated into a single network address and its TCP/UDP ports\" | Arti 429, arti Retry-After (waktu tunggu bagi client sebelum mencoba lagi), dan dua kalimat tentang NAT sebagai NAPT; halaman tidak menulis bahwa Retry-After wajib (MAY) | Tidak berubah (RFC 6585 dan 3022 tanpa pengganti di halaman info, dicek 2026-11-04) |",
  "R5-228": "| R5-228 | Rekaman dan kode lab yang dikutip halaman 5.24 dibaca ke berkas, dan baris M50 naskah | `labs/t5-waf/output/kuota.txt` bagian A (mitra A 600 permintaan: 200 100, 429 500; mitra B 20: 200 20, 429 0; 429 membawa `Retry-After: 1`) dan bagian C (mode `kuota-bersama`: 200 = 100, 429 = 520, mitra B mendapat 429: ya; bagian B mitra B tidak dihitung terpisah); `output/tandatangan.txt` bagian A (dua POST tanpa key di mode `tanpa-idempoten-wajib`: 201 dan 201, baris `qr` 2; key yang sama: id QR sama, baris `qr` 1); `output/testing.txt` (PASS `TestGerbangKuotaSebelumTandaTangan`, isinya dibaca dari `gerbang/gerbang_tinjau_test.go`); `gerbang/gerbang.go` baris `kuncikuota` (kunci bucket per mitra, `bersama` di mode rentan) dan urutan kunci API, kuota, tanda tangan; `api-t5/internal/handler/handler_idempoten.go` (permintaan tanpa kepala Idempotency-Key diteruskan ke handler) dan `handler_pos.go` (rute `POST /pos/v1/merchant/{id}/qr` memakai `idempoten`); README lab (jam bucket dibekukan, laju sungguhan tidak diukur, lapis per IP tidak direkam untuk rute POS); naskah Tahap 5 baris M50 | Gejala, Rantai, Snippet kode dan rekaman, tabel dua QR, dan dua langkah varian; kalimat batas per alamat NAT berlabel Penalaran karena lab tidak merekamnya | Tidak berlaku (sumber internal, dibaca di main 2026-11-04) |",
  "R5-229": "| R5-229 | Hitungan atas angka yang tertulis di halaman 5.24 (Hitungan atas Ilustrasi dan Rekaman lab) | Dihitung dengan skrip sendiri, dibaca 2026-11-04: 3.000 ÷ 1.388,9 = 2,15998 = 2,16, jadi 216% (masukan 3.000 Ilustrasi dan 1.388,9 Asumsi, hasil berlabel Hitungan atas Ilustrasi); 600 + 20 = 620 permintaan; 100 + 520 = 620; 620 − 100 = 520. Masukan 600 dan 20 adalah pilihan lab dengan jam bucket dibekukan, bukan laju sungguhan | Angka dan kalimat Hitungan di Gejala, Yang sebenarnya, Cek diri, dan skenario alur | Tidak berlaku (hitungan atas angka sendiri) |",
};

describe("baris riset R5-225 sampai R5-229: isi persis (kutipan, versi, tanggal, alamat), tanpa bergantung pada kunci lapis 2", () => {
  for (const id of Object.keys(RISET_TERKUNCI)) {
    test(`${id}: sama dengan baris yang dibaca ke sumber`, () => {
      expect(barisRiset(id)).toBe(RISET_TERKUNCI[id]);
    });
  }
  test("lima baris terkunci", () => {
    expect(Object.keys(RISET_TERKUNCI)).toEqual(["R5-225", "R5-226", "R5-227", "R5-228", "R5-229"]);
  });
});

// --- lapis 2: kunci per baris, sidik kata penentu, struktur, angka, dan label
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "wajib", "terbawa", "menolak", "ditolak", "berjalan", "dibaca", "diukur", "direkam", "dijalankan", "berhasil", "naik", "turun", "di atas", "di bawah", "tepat", "lolos", "ikut", "sendiri", "bersama", "terpisah", "sebelum tanda tangan", "per mitra", "tertolak", "sah", "salah"];
const sidikKata = (teks: string, kata2: string[]): Record<string, number> =>
  Object.fromEntries(kata2.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
const nilaiString = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) nilaiString(y, keluar);
  else if (x && typeof x === "object") for (const y of Object.values(x)) nilaiString(y, keluar);
  return keluar;
};
const tekstual = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
  else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
  else if (typeof x === "number" || typeof x === "boolean") keluar.push(`=${String(x)}`);
  return keluar;
};
const h16 = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);
const angkaDari = (t: string): string[] => [...t.replace(/\]\([^)]*\)/g, "]").matchAll(/(?<![\w.])\d+(?:[.,]\d+)*(?!\w)/g)].map((m) => m[0]);
const SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"(\[*_`])/;
const prosa = badan.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<Snippet"));
const struktur = prosa.map((b) => {
  if (b.startsWith("#")) return b.match(/^#+/)![0];
  if (b.startsWith("|")) return `|:${b.split("|").length - 2}`;
  if (b.startsWith("<")) return b.match(/^<\/?[A-Za-z]+/)![0];
  const n = b.split(SPLIT).length;
  if (b.startsWith("- ")) return `-:${n}`;
  if (/^\d+\. /.test(b)) return `${b.match(/^\d+/)![0]}.:${n}`;
  if (/^\*\*\d+\.\*\*/.test(b)) return `**${b.match(/\d+/)![0]}**:${n}`;
  return `p:${n}`;
});
const kartuT5m50 = kartuSemua.filter((x) => x.halaman === "t5-m50");
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/Penalaran/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-04/g) ?? []).length, tanggal: (halaman.match(/2026-11-04/g) ?? []).length,
    dibacaDariKode: (halaman.match(/[Dd]ibaca dari (?:kode|dokumentasi dan kode)/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), skenario: sidikKata(nilaiString(skenario).join("\n"), KATA),
  struktur: struktur.join(" "), angka: prosa.flatMap((b) => angkaDari(b)).join(" "),
  tabel: badan.split("\n").filter((b) => b.startsWith("|")).map(h16),
  riset: ["R5-225", "R5-226", "R5-227", "R5-228", "R5-229"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), skenario: h16(JSON.stringify(skenario)), kartu: h16(JSON.stringify(kartuT5m50)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), skenario: tekstual(skenario), kartu: tekstual(kartuT5m50) },
};
if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat m50-satu-pos.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "m50-satu-pos.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, skenario, dan kartu terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, skenario, dan kartu sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, tabel, riset, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
    expect(sidikSekarang.label.rekamanLab).toBe(5);
    expect(sidikSekarang.label.perluVerifikasi).toBe(0);
    expect(sidikSekarang.label.dibuka).toBe(4);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, dan skenario", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.skenario).toEqual(SIDIK.skenario);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, tabel per baris, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.tabel).toEqual(SIDIK.tabel);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});

describe("baris rekaman yang tampil di Snippet, struktur baris kosong, dan rentang kode", () => {
  test("Snippet kuota.txt memuat persis dua baris bagian C: hitungan semua permintaan dan B ikut 429, sama dengan angka yang dibaca", () => {
    const m = badan.match(/<Snippet file="labs\/t5-waf\/output\/kuota\.txt" lines="(\d+):(\d+)" title="([^"]+)" \/>/);
    expect(m).not.toBeNull();
    const [a, b] = [Number(m![1]), Number(m![2])];
    const tampil = kuotaBaris.slice(a - 1, b);
    expect(tampil).toEqual([
      `semua permintaan: 200 = ${C.ok}, 429 = ${C.tolak} (satu bucket ${C.bucket} untuk ${C.total} permintaan)`,
      `mitra B mendapat 429: ${bIkutC}`,
    ]);
    // rentang jatuh di bagian C dan diturunkan dari isi berkas, bukan angka tulisan tangan
    const nC = kuotaBaris.findIndex((x) => /^# --- C\./.test(x));
    expect(a).toBeGreaterThan(nC + 1);
    expect(a).toBe(kuotaBaris.findIndex((x) => x.startsWith("semua permintaan: 200 = ")) + 1);
    expect(m![3]).toBe("Rekaman lab: labs/t5-waf/output/kuota.txt, bagian C (mode kuota-bersama)");
  });
  test("Snippet kode gerbang tidak menampilkan komentar lab internal atau ID", () => {
    expect(gerbangBaris.slice(nKunci - 1, nKunci + 3).join("\n")).not.toMatch(/R\d-\d+|keputusan|PR \d+|tinjauan/);
  });
  test("struktur baris kosong: tiap paragraf prosa berdiri sendiri, dan tabel, Snippet, Rantai, widget, dan daftar didahului dan diikuti baris kosong", () => {
    const b = badan.split("\n");
    const prosaB = (x: string): boolean => x.trim() !== "" && !/^(\||- |<|###)/.test(x);
    for (let i = 0; i < b.length; i++) {
      const x = b[i]!;
      const sebelum = i > 0 ? b[i - 1]! : "";
      const sesudah = i < b.length - 1 ? b[i + 1]! : "";
      if (prosaB(x)) {
        expect(sebelum === "" || /^<(summary|noscript)/.test(sebelum), `baris ${i + 1} didahului baris kosong: ${x.slice(0, 50)}`).toBe(true);
        expect(sesudah === "" || /^<\/noscript>/.test(sesudah), `baris ${i + 1} diikuti baris kosong: ${x.slice(0, 50)}`).toBe(true);
      }
      if (/^(<Snippet|<Rantai|<WidgetLama)/.test(x)) {
        expect(sebelum, `baris ${i + 1} (${x.slice(0, 20)}) didahului baris kosong`).toBe("");
        expect(sesudah, `baris ${i + 1} (${x.slice(0, 20)}) diikuti baris kosong`).toBe("");
      }
      if (x.startsWith("|") && !sebelum.startsWith("|")) expect(sebelum, `tabel di baris ${i + 1} didahului baris kosong`).toBe("");
      if (x.startsWith("|") && !sesudah.startsWith("|")) expect(sesudah, `tabel di baris ${i + 1} diikuti baris kosong`).toBe("");
      if (x.startsWith("- ") && !sebelum.startsWith("- ")) expect(sebelum, `daftar di baris ${i + 1} didahului baris kosong`).toBe("");
    }
    // paragraf prosa paling banyak empat kalimat (audit bahasa memberi peringatan, bukan galat)
    for (const x of b.filter(prosaB)) expect(x.split(SPLIT).length, x.slice(0, 50)).toBeLessThanOrEqual(4);
  });
  test("tiap kalimat prosa halaman paling banyak 25 kata (audit bahasa), dan judul halaman hanya muncul di frontmatter dan kartu", () => {
    for (const x of badan.split("\n").filter((l) => l.trim() !== "" && !/^(\||<|###|- )/.test(l))) {
      for (const k of x.replace(/^\*\*[^*]+\*\* /, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").split(SPLIT)) expect(k.trim().split(/\s+/).length, k.slice(0, 60)).toBeLessThanOrEqual(25);
    }
    expect(hitungKali(badan, "5.24 M50")).toBe(0);
  });
});
