// Penjaga halaman 5.16 (keputusan 1560 sampai 1562): angka, status, nomor ADR, tautan, label sumber, rentang Snippet, klaim "tidak" dan
// "hanya", diagram Rantai t5-m46-pool-melewati-batas.json, skenario alur t5-m46.json, kartu Cek diri, halaman istilah Badai koneksi, dan baris
// riset R5-185 sampai R5-189 di m46-failover-semua-error.mdx. Nilai diturunkan dari rekaman labs/api-t5/output/pooler.txt, kode labs/api-t5
// (cmd/pooler/main.go, run.py bagian rekam_pooler, README, go.mod), naskah Tahap 5 (baris M46, tabel beban, dan baris ADR 52), halaman tetangga,
// registry, dan baris riset, bukan dari daftar yang ditulis sendiri. Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap
// sumbernya; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di m46-failover-semua-error.halaman.nilai.ts. Lapis 2 bisa dimatikan
// (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks sengaja diubah:
// PERBARUI_KUNCI=1 vitest run src/lib/m46-failover-semua-error.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Gejala (Selasa, 10.00, 40 detik, 4 menit, Dewi, app Budi, kasir Ani) tidak direkam:
// lab api-t5 hanya merekam satu proses dengan 12 pool, tanpa replica, pod, atau promosi. Hitungan 180, 83, dan 27,8 adalah Hitungan atas Asumsi.
// Baris riset tetangga tidak dikunci: hanya R5-185 sampai R5-189 yang diperiksa, tanpa mengunci urutan dengan baris lain. Sumber luar
// (dokumentasi PostgreSQL 17 dan pgx v5.11.0) tidak dibuka tes: kutipannya dikunci di baris riset, dan baris riset dikunci terhadap kalimat halaman.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-m46-pool-melewati-batas.json";
import registry from "../../data/cerita.json";
import istilahMentah from "../../data/halaman-istilah/badai-koneksi.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { HalamanIstilah } from "./istilah";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./m46-failover-semua-error.halaman.nilai";

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

const HALAMAN = "situs/src/content/docs/tahap-5/m46-failover-semua-error.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const skenario = JSON.parse(baca("situs/lama/widgets/data/skenario/t5-m46.json")) as Skenario;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const pooler = baca("labs/api-t5/output/pooler.txt").split("\n");
const kodePooler = baca("labs/api-t5/cmd/pooler/main.go");
const kodeRun = baca("labs/api-t5/run.py");
const readmeLab = baca("labs/api-t5/README.md");
const goMod = baca("labs/api-t5/go.mod");
const sengajaBelum = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
const fiturKeTeknis = baca("situs/src/content/docs/tahap-5/fitur-ke-teknis.mdx");
const prdV5 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const m40 = baca("situs/src/content/docs/tahap-5/m40-pembayaran-melambat.mdx");
const rpoRto = baca("situs/src/content/docs/tahap-5/rpo-rto-failover.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string }
interface Skenario {
  judul: string;
  sumber: { jenis: string; catatan: string; file: string; fileVarian: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: unknown[];
  layarAwal: Record<string, unknown>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; label?: string; masalah?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string; adr?: number[] }
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
const pecahBaris = (b: string): string[] => b.replace(/\\\|/g, "¦").split("|").slice(1, -1).map((x) => x.trim());
const barisRiset = (id: string): string => riset5.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const jumlah = (teks: string, k: string): number => teks.split(k).length - 1;
const harus = (kalimat: string): void => {
  expect(jumlah(badan, kalimat), `kalimat harus tepat satu kali: ${kalimat}`).toBe(1);
};
// pembulatan setengah ke atas seperti pembaca (toFixed membulatkan 8,684999 ke 8,68)
const bulat1 = (x: number): number => Math.floor(x * 10 + 0.5 + 1e-9) / 10;
const bulat0 = (x: number): number => Math.floor(x + 0.5 + 1e-9);
const koma = (x: number): string => String(x).replace(".", ",");
const idAngka = (teks: string): number => Number(teks.replace(/\./g, "").replace(",", "."));
const TANGGAL = "2026-11-04";
const URL_KONEKSI = "https://www.postgresql.org/docs/17/runtime-config-connection.html";
const URL_ERR = "https://www.postgresql.org/docs/17/errcodes-appendix.html";
const URL_CONN = "https://github.com/jackc/pgx/blob/v5.11.0/pgxpool/conn.go";
const URL_POOL = "https://pkg.go.dev/github.com/jackc/pgx/v5@v5.11.0/pgxpool";

// --- naskah: baris M46 (kolom: #, minggu, gejala, dikira, sebenarnya, konsep, keputusan), tabel beban, dan baris ADR 52
const barisM46 = naskah.split("\n").find((b) => b.startsWith("| M46 |")) ?? "";
const kolomM46 = pecahBaris(barisM46);
const mingguM46 = Number(kolomM46[1]);
const gejalaM46 = kolomM46[2]!;
const dikiraM46 = kolomM46[3]!;
const sebenarnyaM46 = kolomM46[4]!;
const detikPromosi = Number(cari(/dipromosikan dalam (\d+) detik/, gejalaM46, "detik promosi")[1]);
const menitError = Number(cari(/selama (\d+) menit/, gejalaM46, "menit error")[1]);
const jamLatihan = cari(/Selasa (\d+\.\d+) latihan failover pertama Dewi/, gejalaM46, "jam latihan")[1]!;
const potensi = cari(/Koneksi potensial (\d+) × (\d+) × (\d+) = (\d+), tersedia (\d+) \(100 dikurangi 3 cadangan\), jadi (\d+) koneksi ditolak dengan kode (\d+) \(`too_many_connections`\), walau rata-rata hanya ([\d,]+) yang dibutuhkan/, sebenarnyaM46, "koneksi potensial");
const [nService, nPod, nPool, nPotensi, nTersedia, nDitolak, kodeGalat] = potensi.slice(1, 8).map(Number) as [number, number, number, number, number, number, number];
const barisBeban = naskah.split("\n").find((b) => b.startsWith("| Koneksi database |")) ?? "";
const littleBeban = cari(/L = ([\d.,]+) × ([\d.,]+) = ([\d.,]+)/, barisBeban, "L = λ × W di tabel beban");
const lambdaPuncak = idAngka(littleBeban[1]!);
const waktuW = idAngka(littleBeban[2]!);
const barisAdr52 = naskah.split("\n").find((b) => b.startsWith("| 52 | PgBouncer 1.26.1 mode transaction")) ?? "";

// --- rekaman: garis 1-based
const garis = (rek: string[], pola: RegExp, dari0 = 0): number => {
  const i = rek.findIndex((b, k) => k >= dari0 && pola.test(b));
  if (i < 0) throw new Error(`rekaman: ${pola} tidak ditemukan sesudah baris ${dari0}`);
  return i + 1;
};
const nA = garis(pooler, /^# --- A\./);
const nB = garis(pooler, /^# --- B\./);
const akhirA = (() => { let i = nB - 2; while (pooler[i]!.trim() === "") i--; return i + 1; })();
const akhirB = (() => { let i = pooler.length - 1; while (pooler[i]!.trim() === "") i--; return i + 1; })();
const maksKoneksi = Number(cari(/^=> SHOW max_connections\s+-- (\d+)$/, pooler[garis(pooler, /^=> SHOW max_connections/) - 1]!, "max_connections")[1]);
const barisCadangan = cari(/^=> SHOW superuser_reserved_connections\s+-- (\d+); tersedia untuk role biasa: (\d+) - (\d+) = (\d+)$/, pooler[garis(pooler, /^=> SHOW superuser_reserved_connections/) - 1]!, "cadangan");
const cadangan = Number(barisCadangan[1]);
const tersedia = maksKoneksi - cadangan;
const nPerintahA = garis(pooler, /^\$ \.\/pooler -dsn <langsung ke PostgreSQL, role t5_app> -klien (\d+) -pool (\d+) /);
const perintahA = cari(/-klien (\d+) -pool (\d+)/, pooler[nPerintahA - 1]!, "perintah A");
const klien = Number(perintahA[1]);
const poolPerKlien = Number(perintahA[2]);
const diminta = Number(cari(/^koneksi diminta: (\d+)$/, pooler[nPerintahA]!, "koneksi diminta A")[1]);
const nBerhasil = garis(pooler, /^koneksi berhasil lebih sedikit dari diminta: ya$/);
const nKodeGalat = garis(pooler, /^kode galat: 53300   # 53300 = too_many_connections$/);
const nPuncakA = garis(pooler, /^koneksi role t5_app di PostgreSQL paling banyak <= 97 \(disampel tiap 100 ms\): ya$/);
const nKlienPenuhA = garis(pooler, /^client yang mendapat seluruh 10 koneksinya: kurang dari 12: ya$/);
const nPerintahB = garis(pooler, /^\$ \.\/pooler -dsn <lewat PgBouncer, role t5_app> -klien 12 -pool 10$/);
const nVersiB = garis(pooler, /^\$ pgbouncer --version   -- PgBouncer 1\.26\.1$/);
const nDimintaB = garis(pooler, /^koneksi diminta: 120, berhasil: 120, galat: tidak ada$/);
const nQueryB = garis(pooler, /^query selesai: 2400 \(= 12 client × 10 koneksi × 20 putaran\)$/);
const nKlienPenuhB = garis(pooler, /^client yang mendapat seluruh 10 koneksinya: 12 dari 12$/);
const nPuncakB = garis(pooler, /^koneksi role t5_app di PostgreSQL paling banyak <= 20 \(default_pool_size; disampel tiap 100 ms\): ya$/);
const nSimpulanB = garis(pooler, /^120 koneksi client dilayani oleh paling banyak 20 koneksi ke PostgreSQL, jauh di bawah 97\.$/);
const query = Number(cari(/^query selesai: (\d+) /, pooler[nQueryB - 1]!, "query B")[1]);
const maksPgB = Number(cari(/paling banyak <= (\d+) \(default_pool_size/, pooler[nPuncakB - 1]!, "puncak B")[1]);

// --- kode lab
const kodePoolerBaris = kodePooler.split("\n");
const nMaxConns = kodePoolerBaris.findIndex((b) => b.includes("cfg.MaxConns, cfg.MinConns = int32(*pool), 0")) + 1;
const nAcquire = kodePoolerBaris.findIndex((b) => b.trim() === "c, err := p.Acquire(ctx)") + 1;
const putaranBawaan = Number(cari(/flag\.Int\("putaran", (\d+),/, kodePooler, "putaran bawaan")[1]);
const jedaMs = Number(cari(/time\.Sleep\((\d+) \* time\.Millisecond\)/, kodePooler, "jeda")[1]);
const rekamPooler = kodeRun.slice(kodeRun.indexOf("def rekam_pooler():"), kodeRun.indexOf("# ---------- beban.txt ----------"));

describe("naskah, registry, dan halaman tetangga", () => {
  test("registry: halaman 5.16 jenis masalah, ada, prasyarat t5-rpo-rto dan t3-pool, lab api-t5, menit = baca + coba, judul dan peran dari naskah", () => {
    const h = dari("t5-m46");
    expect(h.nomor).toBe("5.16");
    expect(h.jenis).toBe("masalah");
    expect(h.ada).toBe(true);
    expect(h.inti).toBe(true);
    expect(h.prasyarat).toEqual(["t5-rpo-rto", "t3-pool"]);
    expect(h.lab).toEqual(["api-t5"]);
    expect(h.peran).toEqual(["devops", "backend"]);
    expect(h.path).toBe("tahap-5/m46-failover-semua-error.md");
    expect(h.label).toBe(`Masalah ${kolomM46[0]!.slice(1)} · minggu ${mingguM46}`);
    expect(mingguM46).toBe(8);
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>/, halaman, "meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect([meta[1], meta[2]]).toEqual(["9", "3"]); // pembagian baca dan coba: perkiraan penulis, jumlahnya dijaga registry
    expect(meta[3]).toBe("[[t5-rpo-rto]], [[t3-pool]]");
    expect(frontmatter).toContain(`title: "5.16 ${h.judul}"`);
    expect(naskah).toContain(`| 5.16 | 4 | ${h.judul} | Masalah | ★ | api-t5 | alur |`);
    expect(h.masalah).toBe("Latihan failover berhasil, tetapi semua pod menyambung ulang bersamaan dan koneksi database habis");
    expect(frontmatter).toContain("description: Minggu 8. Latihan failover pertama Dewi mempromosikan replica dalam 40 detik, tetapi service menjawab 500 selama 4 menit. Rekaman lab menunjukkan koneksi yang diminta melewati batas database dan ditolak dengan kode 53300.");
  });
  test("halaman tetangga: 5.17 (t5-pooler) ADR 52 dan prasyarat t5-m46, 5.9 (t5-rpo-rto), 3.8 (t3-pool), 5.8 (t5-m42), 5.4 (t5-m40), 5.2 (t5-fitur-teknis), 5.1 (t5-prd), 5.13 (t5-service)", () => {
    expect(dari("t5-pooler").nomor).toBe("5.17");
    expect(dari("t5-pooler").adr).toEqual([52]);
    expect(dari("t5-pooler").prasyarat).toEqual(["t5-m46"]);
    expect(dari("t5-rpo-rto").nomor).toBe("5.9");
    expect(dari("t3-pool").nomor).toBe("3.8");
    expect(dari("t5-m42").nomor).toBe("5.8");
    expect(dari("t5-m40").nomor).toBe("5.4");
    expect(dari("t5-fitur-teknis").nomor).toBe("5.2");
    expect(dari("t5-prd").nomor).toBe("5.1");
    expect(dari("t5-service").nomor).toBe("5.13");
    expect(barisAdr52).toContain("PgBouncer 1.26.1 mode transaction di depan primary");
    expect(badan).toContain("Keputusannya ADR 52.");
    // halaman ini tidak memuat isi ADR 52: mode, ukuran pool PgBouncer, max_client_conn, dan fitur sesi hanya ada di halaman 5.17 dan baris naskah
    for (const k of ["mode transaction", "transaction pooling", "max_client_conn", "query_wait_timeout", "max_prepared_statements", "default_pool_size", "server pool", "NetworkPolicy"]) expect(badan, k).not.toContain(k);
  });
  test("gejala dan dugaan dari naskah baris M46: Selasa 10.00, Dewi, 40 detik, 4 menit, Budi, Ani, 500, dugaan promosi dan database belum siap", () => {
    expect(gejalaM46).toContain("Selasa 10.00 latihan failover pertama Dewi");
    expect(gejalaM46).toContain("Replica dipromosikan dalam 40 detik, tetapi selama 4 menit app Budi menampilkan \"Gagal memuat\" dan kasir Ani menolak pembayaran.");
    expect(gejalaM46).toContain("Semua service menjawab 500 dan alert menyala walau database sehat (Ilustrasi).");
    expect(dikiraM46).toBe("Promosi belum selesai, atau database belum siap menerima koneksi");
    expect(dikiraM46).not.toMatch(/Raka|Dewi|Bayu|Nadia/); // naskah tidak menyebut siapa yang menduga; halaman memakai Raka karena nama blok
    expect(sebenarnyaM46).toContain("Tiap pod menutup koneksinya saat primary lama hilang dan membuka ulang bersamaan.");
    expect(sebenarnyaM46).toContain("Retry menambah badai (penalaran).");
    expect(sebenarnyaM46).toContain("`MaxConnLifetimeJitter` bawaan 0, jadi koneksi yang dibuat bersamaan kedaluwarsa bersamaan");
    expect([detikPromosi, menitError, jamLatihan]).toEqual([40, 4, "10.00"]);
    harus(`Minggu ${mingguM46} Tahap 5. Selasa pukul ${jamLatihan} Dewi menjalankan latihan failover pertamanya. Replica dipromosikan dalam ${detikPromosi} detik.`);
    harus(`Selama ${menitError} menit berikutnya app Budi menampilkan "Gagal memuat", dan kasir Ani menolak pembayaran. Semua service menjawab ${kodeGalat === 53300 ? 500 : 0}, dan alert menyala walau database sehat.`);
    harus(`*Angka cerita (Ilustrasi):* hari, pukul ${jamLatihan}, ${detikPromosi} detik, dan ${menitError} menit berasal dari naskah, bukan dari rekaman. Rekaman di halaman ini memakai satu PostgreSQL di lab api-t5, tanpa replica atau pod.`);
    harus("Raka menduga promosi belum selesai. Dugaan lainnya: database belum siap menerima koneksi.");
  });
  test("naskah: angka koneksi potensial, tersedia, ditolak, dan rata-rata sama dengan rekaman, tabel beban, dan halaman tetangga (180, 97, 83, 27,8)", () => {
    expect([nService, nPod, nPool, nPotensi, nTersedia, nDitolak, kodeGalat]).toEqual([6, 3, 10, 180, 97, 83, 53300]);
    expect(nService * nPod * nPool).toBe(nPotensi);
    expect(nPotensi - nTersedia).toBe(nDitolak);
    expect(maksKoneksi - cadangan).toBe(nTersedia);
    expect(barisBeban).toContain("6 × 3 × 10 = 180 terpasang; tersedia 100 − 3 = 97");
    expect(bulat1(lambdaPuncak * waktuW)).toBe(idAngka(littleBeban[3]!));
    expect([lambdaPuncak, waktuW, idAngka(littleBeban[3]!)]).toEqual([1388.9, 0.02, 27.8]);
    expect(idAngka(cari(/walau rata-rata hanya ([\d,]+) yang dibutuhkan/, sebenarnyaM46, "rata-rata")[1]!)).toBe(27.8);
    expect(naskah).toContain("| Request per detik | aktif × request ÷ 86.400 × puncak | 200.000 × 60 = 12 juta per hari | 138,9 rata-rata dan 1.388,9 puncak");
    // asal angka di halaman tetangga: sengaja-belum (180, 97, 27,8, 0,02 detik), fitur-ke-teknis, prd-v5 (186%), m40 (20 ms), rpo-rto (RTO 15 menit, 43,2 menit)
    expect(sengajaBelum).toContain("Seluruh request: 1.388,9 × 0,02 = 27,8 koneksi. Terpasang 6 service × 3 instance × pool 10 = 180, dan tersedia 100 − 3 = 97.");
    expect(sengajaBelum).toContain("Waktu 0,02 detik per query, 10 pool per instance, dan 3 koneksi cadangan adalah Asumsi naskah.");
    expect(fiturKeTeknis).toContain("Koneksi database terpasang 180 lawan 97 tersedia.");
    expect(prdV5).toContain("180 ÷ 97 = 186%");
    expect(m40).toContain("memegang koneksi 20 ms");
    expect(rpoRto).toContain("RTO 15 menit");
    expect(rpoRto).toContain("43,2 menit");
    harus("**Dari 12 client ke 18 pod.** Cerita punya enam service dengan tiga pod tiap service, jadi 18 pod dengan pool 10 koneksi. Angka 180 dan 97 datang dari tabel beban naskah dan sudah dipakai di [[t5-fitur-teknis]]. Tabel ini menghitungnya dari masukannya.");
  });
});

describe("rekaman pooler.txt: nilai turunan dari berkasnya sendiri", () => {
  test("kepala: PostgreSQL 17.11, go1.27.3, pgx v5.11.0, dan go.mod memakai pgx v5.11.0; bagian A dan B ada dalam urutan itu", () => {
    expect(pooler[1]).toContain("PostgreSQL 17.11");
    expect(pooler[1]).toContain("go1.27.3");
    expect(pooler[1]).toContain("pgx v5.11.0");
    expect(goMod).toContain("github.com/jackc/pgx/v5 v5.11.0");
    expect(nA).toBe(5);
    expect(nB).toBeGreaterThan(nA);
    expect(akhirA).toBe(nKlienPenuhA);
    expect(pooler[nA - 1]).toBe(`# --- A. Tanpa pooler: ${klien} client × pool ${poolPerKlien} = ${diminta} koneksi diminta, melewati max_connections ---`);
    harus("*Kondisi rekaman:* PostgreSQL 17.11, go1.27.3, dan pgx v5.11.0, dari database bersih, di lab api-t5. Satu proses `pooler` membuka 12 pool dengan 10 koneksi per pool, langsung ke PostgreSQL. Rekaman ini bukan latihan failover: tidak ada primary yang dimatikan, replica yang dipromosikan, atau pod.");
  });
  test("bagian A: max_connections 100, cadangan 3, tersedia 97, 12 client × pool 10 = 120 diminta, galat 53300, koneksi paling banyak 97, kurang dari 12 client penuh", () => {
    expect([maksKoneksi, cadangan, tersedia]).toEqual([100, 3, 97]);
    expect([barisCadangan[2], barisCadangan[3], barisCadangan[4]].map(Number)).toEqual([maksKoneksi, cadangan, tersedia]);
    expect([klien, poolPerKlien, diminta]).toEqual([12, 10, 120]);
    expect(klien * poolPerKlien).toBe(diminta);
    expect(nBerhasil).toBe(nPerintahA + 2);
    expect(nKodeGalat).toBe(nPerintahA + 3);
    expect(nPuncakA).toBe(nPerintahA + 4);
    expect(nKlienPenuhA).toBe(nPerintahA + 5);
    expect(pooler[nPerintahA - 1]).toContain("# nilai mentah bergantung koneksi lain; diperiksa terhadap batas");
    // jumlah koneksi yang berhasil tidak ada sebagai angka di bagian A
    expect(pooler.slice(nA - 1, akhirA).some((b) => /berhasil: \d/.test(b))).toBe(false);
    harus(`Jumlah koneksi yang berhasil tidak direkam sebagai angka, karena bergantung pada koneksi lain di database. Lab memeriksa bahwa jumlah itu di bawah ${diminta}, dan koneksi role itu paling banyak ${tersedia} pada sampel tiap 100 milidetik.`);
    harus(`Semua galat yang tercatat berkode ${kodeGalat}. Galat itu dikirim oleh server PostgreSQL yang hidup, karena kode lab membacanya dari \`pgconn.PgError\`. Jadi database yang hidup dan menjawab bisa menolak koneksi.`);
  });
  test("bagian B: PgBouncer 1.26.1, 120 diminta dan berhasil tanpa galat, 2400 query, 12 dari 12 client penuh, paling banyak 20 koneksi ke PostgreSQL", () => {
    expect(nPerintahB).toBe(nVersiB + 1);
    expect(nDimintaB).toBe(nPerintahB + 1);
    expect(nQueryB).toBe(nDimintaB + 1);
    expect(nKlienPenuhB).toBe(nQueryB + 1);
    expect(nPuncakB).toBe(nKlienPenuhB + 1);
    expect(nSimpulanB).toBe(nPuncakB + 1);
    expect(query).toBe(klien * poolPerKlien * putaranBawaan);
    expect(maksPgB).toBe(20);
    expect(maksPgB).toBeLessThan(tersedia);
    expect(akhirB).toBeGreaterThanOrEqual(nSimpulanB);
  });
  test("klaim negatif berlingkup: tanpa angka koneksi berhasil di bagian A; 'tanpa replica dan pod' hanya untuk rekaman pooler (kode api-t5 punya dukungan replica untuk lab t5-replika)", () => {
    expect(readmeLab).toContain("Replica dan jeda baca milik `t5-replika`");
    expect(readmeLab).toContain("Lab ini tidak menguji kapasitas produksi dan tidak mengklaimnya.");
    expect(readmeLab).toContain("Angka yang bergantung mesin (p95, jumlah koneksi, `WaitCount`) hanya diperiksa terhadap batas dan tidak direkam sebagai nilai.");
    // lingkup klaim: bagian pooler (run.py rekam_pooler dan cmd/pooler), bukan seluruh folder api-t5
    expect(baca("labs/api-t5/cmd/api/main.go")).toContain('os.Getenv("REPLIKA_DATABASE_URL")');
    for (const [nama, kode] of [["rekam_pooler", rekamPooler], ["cmd/pooler", kodePooler]] as const) {
      expect(kode, nama).not.toMatch(/replika|REPLIKA|replica|k3d|kubectl|kubernetes|\bpod\b|pg_promote|pg_basebackup|primary_conninfo/i);
    }
    expect(kodeRun).not.toMatch(/pg_promote|pg_basebackup|primary_conninfo/);
    expect(rekamPooler).toContain("d.db_role(\"t5_app\", nama=\"api-t5-pooler\")");
  });
});

describe("kode lab: cmd/pooler/main.go dan run.py bagian rekam_pooler", () => {
  test("pooler: MaxConns dari flag -pool, MinConns 0, sepuluh Acquire per client, satu Acquire di kode, putaran 20 dan jeda 50 ms, galat dari pgconn.PgError, tanpa retry", () => {
    expect(nMaxConns).toBeGreaterThan(0);
    expect(nAcquire).toBeGreaterThan(nMaxConns);
    expect(kodePoolerBaris[nMaxConns - 1]!.trim()).toBe("cfg.MaxConns, cfg.MinConns = int32(*pool), 0");
    expect(kodePooler).toContain('pool := flag.Int("pool", 10, "MaxConns tiap pool (bawaan service di lab ini: 10)")');
    expect(kodePooler).toContain('n := flag.Int("klien", 12, ');
    expect(kodePooler).toContain("for j := 0; j < *pool; j++ {");
    expect(jumlah(kodePooler, "p.Acquire(ctx)")).toBe(1);
    expect([putaranBawaan, jedaMs]).toEqual([20, 50]);
    expect(jumlah(kodePooler, "var pe *pgconn.PgError")).toBe(2); // dua tempat: galat dari Acquire dan galat dari query
    expect(jumlah(kodePooler, "errors.As(err, &pe)")).toBe(2);
    expect(kodePooler).toContain("ConnectTimeout = 10 * time.Second");
    expect(kodePooler).not.toMatch(/retry|ulang|backoff|jitter/i);
    expect(kodePooler).not.toContain("MaxConnLifetimeJitter");
    // galat dari Acquire dicatat dan goroutine kembali: tidak ada loop yang mencoba lagi
    const sesudahAcquire = kodePoolerBaris.slice(nAcquire, nAcquire + 12).join("\n");
    expect(sesudahAcquire).toContain("galat[kode]++");
    expect(sesudahAcquire).toContain("return");
    harus("**Kode yang direkam.** Tiap client memakai satu pool dengan `MaxConns` 10, lalu meminta sepuluh koneksi sekaligus. Tiap koneksi yang berhasil dibuka dipakai untuk 20 query, dengan jeda 50 milidetik sesudah tiap query (Tidak dijalankan: dibaca dari kode lab):");
    harus("**Retry bisa memperparah (penalaran).** Client yang mengulang koneksi yang ditolak tanpa jeda meminta slot yang sama lagi. Rekaman lab tidak punya retry: tiap permintaan koneksi berjalan sekali, dan galatnya dicatat (kode lab).");
  });
  test("Snippet: rentang baris diturunkan dari kode dan rekaman (MaxConns sampai Acquire, bagian A pooler.txt)", () => {
    const snip = [...badan.matchAll(/<Snippet file="([^"]+)"(?: lines="(\d+):(\d+)")?(?: lang="(\w+)")? title="([^"]+)" \/>/g)].map((m) => ({ file: m[1]!, a: Number(m[2]), b: Number(m[3]), lang: m[4], title: m[5]! }));
    expect(snip.map((s) => `${s.file}:${s.a}:${s.b}`)).toEqual([
      `labs/api-t5/cmd/pooler/main.go:${nMaxConns}:${nAcquire}`,
      `labs/api-t5/output/pooler.txt:${nA}:${akhirA}`,
    ]);
    expect(snip.map((s) => s.lang)).toEqual(["go", undefined]);
    expect(snip[0]!.title).toBe(`Kode lab: labs/api-t5/cmd/pooler/main.go baris ${nMaxConns} sampai ${nAcquire} (tiap client memakai satu pool dan meminta seluruh koneksinya sekaligus)`);
    expect(snip[1]!.title).toBe("Rekaman lab: labs/api-t5/output/pooler.txt, bagian A (12 client × pool 10, langsung ke PostgreSQL)");
    // rekaman: potongan tidak memuat baris kepala rekaman (baris 1 sampai 3) dan memuat penanda bagiannya, tetapi tidak bagian B
    expect(snip[1]!.a).toBeGreaterThan(3);
    expect(snip[1]!.b).toBeLessThan(nB);
    expect(pooler[nA - 1]).toMatch(/^# --- A\./);
    expect([nMaxConns, nAcquire]).toEqual([45, 61]);
    expect([nA, akhirA]).toEqual([5, 13]);
  });
  test("run.py rekam_pooler: lab gagal keras bila galat bukan 53300, koneksi melewati batas, atau semua client penuh; 12 client × pool 10; jumlah berhasil tidak dicatat sebagai nilai", () => {
    expect(rekamPooler).toContain("KLIEN, POOL = 12, 10");
    expect(rekamPooler).toContain('harap(set(m["galat"]), {"53300"}, "semua galat 53300")');
    expect(rekamPooler).toContain('harap(puncak <= tersedia, True, "koneksi tidak melewati batas")');
    expect(rekamPooler).toContain('harap(m["koneksi_berhasil"] < m["koneksi_diminta"], True, "ada koneksi yang ditolak")');
    expect(rekamPooler).toContain('harap(m["klien_dengan_pool_penuh"] < KLIEN, True, "tidak semua client penuh")');
    expect(rekamPooler).toContain('harap(m["galat"], {}, "tanpa galat lewat PgBouncer")');
    expect(rekamPooler).toContain("harap((maks, cadangan), (100, 3), \"pengaturan koneksi PostgreSQL lab\")");
    expect(rekamPooler).not.toContain("koneksi berhasil: {m['koneksi_berhasil']}\")\n    harap(m[\"koneksi_berhasil\"] <");
    expect(rekamPooler).not.toMatch(/pg_promote|pg_ctl|promote/);
  });
});

describe("sumber luar: kutipan di baris riset R5-185 sampai R5-189 dan tautan di halaman", () => {
  test("baris riset ada, lima kolom, dan urut naik (tanpa mengunci tetangga)", () => {
    const ids = ["R5-185", "R5-186", "R5-187", "R5-188", "R5-189"];
    const baris = riset5.split("\n");
    const pos = ids.map((id) => baris.findIndex((b) => b.startsWith(`| ${id} |`)));
    for (const [i, p] of pos.entries()) {
      expect(p, ids[i]).toBeGreaterThan(-1);
      expect(pecahBaris(baris[p]!).length, ids[i]).toBe(5);
    }
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
    expect(new Set(pos).size).toBe(5);
    for (const id of ids) expect(baris.filter((b) => b.startsWith(`| ${id} |`)).length, `${id} tidak ganda`).toBe(1);
  });
  test("R5-185: kutipan dokumentasi koneksi PostgreSQL 17 dan kode 53300, tanggal buka, dan tautan yang dipakai halaman", () => {
    const r = barisRiset("R5-185");
    for (const k of [
      '"The default is typically 100 connections, but might be less if your kernel settings will not support it (as determined during initdb)."',
      '"Whenever the number of active concurrent connections is at least max_connections minus superuser_reserved_connections, new connections will be accepted only for superusers."',
      '"The default value is three connections."',
      '"The default value is zero connections."',
      '"When running a standby server, you must set this parameter to the same or higher value than on the primary server."',
      "Class 53 Insufficient Resources memuat `53300` `too_many_connections`",
      "postgresql.org/docs/17/runtime-config-connection.html",
      "postgresql.org/docs/17/errcodes-appendix.html",
      `dibuka ${TANGGAL}`,
      "PostgreSQL 17.11 di lab",
    ]) expect(r, k).toContain(k);
    expect(jumlah(badan, `[PostgreSQL 17: Connection Settings](${URL_KONEKSI}), dibuka ${TANGGAL}, Tidak dijalankan)`)).toBe(1);
    expect(jumlah(badan, `[PostgreSQL 17: Appendix A](${URL_ERR}), dibuka ${TANGGAL}, Tidak dijalankan)`)).toBe(1);
    harus(`Ditolak. Dokumentasi menulis batasnya. Bila koneksi aktif sudah mencapai atau melewati \`max_connections\` dikurangi \`superuser_reserved_connections\`, koneksi baru hanya diterima untuk superuser ([PostgreSQL 17: Connection Settings](${URL_KONEKSI}), dibuka ${TANGGAL}, Tidak dijalankan).`);
    harus(`Dokumentasi yang sama menulis bahwa \`max_connections\` biasanya bernilai ${maksKoneksi} dan \`superuser_reserved_connections\` bawaannya tiga, jadi role biasa mendapat ${maksKoneksi} − ${cadangan} = ${tersedia} slot. Lampiran kode galat PostgreSQL 17 menamai kode \`${kodeGalat}\` sebagai \`too_many_connections\` ([PostgreSQL 17: Appendix A](${URL_ERR}), dibuka ${TANGGAL}, Tidak dijalankan).`);
    expect(["tiga", "nol"][0]).toBe("tiga"); // bawaan superuser_reserved_connections: tiga (R5-185), sama dengan SHOW di rekaman
    expect(cadangan).toBe(3);
  });
  test("R5-186: kutipan pgxpool v5.11.0 (MaxConns, jitter, umur), kode Release dan jitter, selisih dengan naskah, dan tautan", () => {
    const r = barisRiset("R5-186");
    for (const k of [
      '"MaxConns is the maximum size of the pool. The default is the greater of 4 or runtime.NumCPU()."',
      '"MaxConnLifetimeJitter is the duration after MaxConnLifetime to randomly decide to close a connection."',
      '"This helps prevent all connections from being closed at the exact same time, starving the pool."',
      "pool_max_conn_lifetime bawaan 1 jam dan pool_max_conn_lifetime_jitter bawaan 0",
      "`defaultMinConns = int32(0)`",
      "`defaultMaxConnLifetime = time.Hour`",
      "`jitterSecs := rand.Float64() * config.MaxConnLifetimeJitter.Seconds()`",
      "`maxAgeTime := time.Now().Add(config.MaxConnLifetime).Add(time.Duration(jitterSecs) * time.Second)` (pool.go baris 301 dan 302)",
      "`Release` di conn.go memanggil `res.Destroy()` bila salah satu dari tiga kondisi benar: `conn.IsClosed()`, `conn.PgConn().IsBusy()`, atau `conn.PgConn().TxStatus() != 'I'`",
      "terbit 7 September 2026",
      "v5.11.0",
      "'the greater of 4 or runtime.NumCPU()'",
      `dibuka ${TANGGAL}`,
    ]) expect(r, k).toContain(k);
    expect(jumlah(badan, `([pgx v5.11.0, conn.go](${URL_CONN}), dibuka ${TANGGAL}, Tidak dijalankan)`)).toBe(1);
    expect(jumlah(badan, `([pgxpool v5.11.0](${URL_POOL}), dibuka ${TANGGAL}, Tidak dijalankan)`)).toBe(1);
    expect(goMod).toContain("github.com/jackc/pgx/v5 v5.11.0");
    expect(jumlah(badan, "v5.11.0")).toBe(7);
    expect(sebenarnyaM46).not.toContain("the greater of"); // naskah menulis 'lebih besar dari 4 atau jumlah CPU': selisih ke USULAN-CERITA
    harus("**Koneksi ke primary lama dibuang.** Saat koneksi dikembalikan ke pool, `Release` menghancurkannya bila koneksi itu sudah tertutup, masih sibuk, atau masih di dalam transaction ([pgx v5.11.0, conn.go](" + URL_CONN + "), dibuka " + TANGGAL + ", Tidak dijalankan). Permintaan berikutnya lalu membuka koneksi baru ke node baru (penalaran).");
    harus("**Bawaan pgx.** Dokumentasi pgxpool v5.11.0 menulis `MaxConns` bawaan sebesar nilai yang lebih besar antara 4 dan `runtime.NumCPU()`. Bawaan `MaxConnLifetime` adalah 1 jam dan bawaan `MaxConnLifetimeJitter` adalah 0 ([pgxpool v5.11.0](" + URL_POOL + "), dibuka " + TANGGAL + ", Tidak dijalankan). Lab memasang `MaxConns` 10 dan tidak mengatur jitter.");
    harus("Kode pgx menghitung batas umur koneksi dari waktu pembuatan, `MaxConnLifetime`, dan jitter acak sampai `MaxConnLifetimeJitter` (`pool.go`, Tidak dijalankan). Dengan jitter 0, koneksi yang dibuat pada detik yang sama sampai batas umurnya pada waktu yang hampir sama. Itu risiko satu jam sesudah koneksi dibuat bersamaan, bukan penyebab 4 menit di cerita (penalaran).");
    expect(nPool).toBe(poolPerKlien);
  });
  test("R5-187, R5-188, dan R5-189: sumber internal yang dibaca, rumus hitungan, dan angka di kutipan sama dengan rekaman, kode, dan naskah", () => {
    const r187 = barisRiset("R5-187");
    for (const k of ["`labs/api-t5/output/pooler.txt` bagian A", "max_connections 100, superuser_reserved_connections 3, tersedia 97", "12 client, pool 10, 120 koneksi diminta", "kode galat 53300", "paling banyak 97 pada sampel tiap 100 ms", "kurang dari 12 client mendapat seluruh 10 koneksinya", "PgBouncer 1.26.1; 120 diminta dan berhasil tanpa galat; 2400 query selesai; 12 dari 12 client penuh; paling banyak 20 koneksi ke PostgreSQL", "`cfg.MaxConns, cfg.MinConns = int32(*pool), 0`", "bawaan `-putaran` 20 dan jeda 50 ms", "`pgconn.PgError`", "tanpa retry", "`rekam_pooler`", "Bagian pooler memakai satu PostgreSQL dan satu proses `pooler`, tanpa replica, pod, atau app", "kode api-t5 punya dukungan replica lewat `REPLIKA_DATABASE_URL` untuk lab t5-replika, dan bagian pooler tidak memakainya"]) expect(r187, k).toContain(k);
    const r188 = barisRiset("R5-188");
    for (const k of ["6 × 3 × 10 = 180", "6 × 3 = 18", "100 − 3 = 97", "180 − 97 = 83", "180 ÷ 97 = 1,856 (186%)", "1.388,9 × 0,02 = 27,78 (27,8)", "27,8 ÷ 18 = 1,54 (1,5)", "12 × 10 = 120", "120 − 97 = 23", "0,001 × 43.200 = 43,2", "4 ÷ 43,2 = 0,0926 (9,3%)", "Tidak berlaku (hitungan atas angka sendiri)"]) expect(r188, k).toContain(k);
    const r189 = barisRiset("R5-189");
    for (const k of ["Selasa 10.00", "latihan failover pertama Dewi", "promosi 40 detik", "4 menit 'Gagal memuat'", "kasir Ani menolak pembayaran", "semua service menjawab 500", "baris itu tidak menyebut siapa yang menduga", "6 × 3 × 10 = 180, tersedia 100 − 3 = 97, 1.388,9 × 20 ms", "baris ADR 52 dibaca hanya untuk memastikan halaman ini tidak memuat isinya", "'retry menambah badai (penalaran)'"]) expect(r189, k).toContain(k);
    // rumus di R5-188 sama dengan nilai turunan dari rekaman dan naskah
    expect(nService * nPod * nPool).toBe(180);
    expect(nService * nPod).toBe(18);
    expect(bulat0((nPotensi / nTersedia) * 100)).toBe(186);
    expect(bulat1(idAngka("1.388,9") * idAngka("0,02"))).toBe(27.8);
    expect(bulat1(27.8 / (nService * nPod))).toBe(1.5);
    expect(bulat1((menitError / bulat1(0.001 * 43200)) * 100)).toBe(9.3);
    expect(klien * poolPerKlien - tersedia).toBe(23);
    expect(sengajaBelum).toContain("Terpasang 6 service × 3 instance × pool 10 = 180");
  });
  test("tanggal buka: tepat lima 'dibuka 2026-11-04' di halaman (empat tautan dan satu tautan Connection Settings), dan tak ada tanggal lain; tautan eksternal terkunci", () => {
    expect(jumlah(badan, `dibuka ${TANGGAL}`)).toBe(4);
    expect(jumlah(badan, TANGGAL)).toBe(4);
    expect(badan.match(/\b20\d\d-\d\d-\d\d\b/g)).toEqual([TANGGAL, TANGGAL, TANGGAL, TANGGAL]);
    expect(jumlah(badan, "](http")).toBe(4);
    expect([...badan.matchAll(/\]\((http[^)]+)\)/g)].map((m) => m[1])).toEqual([URL_KONEKSI, URL_ERR, URL_CONN, URL_POOL]);
  });
});

describe("halaman istilah Badai koneksi dan glosarium", () => {
  test("halaman istilah valid, berrujukan ke t5-m46, R5-185 dan R5-187, dan baris glosarium menunjuk ke 5.16", () => {
    const d = HalamanIstilah.parse(istilahMentah);
    expect(d.istilah).toBe("Badai koneksi");
    expect(d.cerita![0]!.rujukan).toBe("t5-m46");
    expect(d.sumber![0]).toMatchObject({ riset: "R5-185", url: URL_KONEKSI });
    expect(d.sumber![0]!.judul).toBe(`PostgreSQL 17: Connection Settings (dibuka ${TANGGAL})`);
    expect(d.sumber![1]).toMatchObject({ riset: "R5-187", rekaman: "labs/api-t5/output/pooler.txt" });
    expect(d.terkait).toEqual(["Connection pool", "Failover", "Backoff"]);
    for (const t of d.terkait!) expect(glosarium, t).toContain(`| **${t}** |`);
    expect(barisRiset("R5-185")).toContain("postgresql.org/docs/17/runtime-config-connection.html");
    expect(barisRiset("R5-187")).toContain("labs/api-t5/output/pooler.txt");
    expect(glosarium).toContain("| **Badai koneksi** | Banyak pool menyambung ke database pada waktu yang sama sampai batas koneksinya terlewati, sehingga sebagian koneksi ditolak. | [[t5-m46]] |");
    const baris = glosarium.split("\n");
    const i = baris.findIndex((b) => b.startsWith("| **Badai koneksi** |"));
    expect(baris[i - 1]!.startsWith("| **Backup dan uji pulih**")).toBe(true);
    expect(baris[i + 1]!.startsWith("| **Batch**")).toBe(true);
  });
  test("kalimat istilah: angka 100, 3, 120, 97, dan kode 53300 cocok dengan rekaman; tidak lebih kuat dari dokumentasi", () => {
    const d = HalamanIstilah.parse(istilahMentah);
    expect(d.mekanisme).toHaveLength(4);
    expect(d.mekanisme![0]).toContain(`bawaannya biasanya ${maksKoneksi} dan ${cadangan}`);
    expect(d.mekanisme![1]).toContain(`Lab merekam kode ${kodeGalat} untuk koneksi seperti itu.`);
    expect(d.mekanisme![1]).toContain("dokumentasi hanya menyebut superuser");
    expect(d.stack).toBeNull();
    expect(d.jebakan![0]).toContain(`${diminta} koneksi yang diminta melewati batas ${tersedia}`);
    expect(d.jebakan![1]).toContain("Itu penalaran penulis");
    expect(d.cerita![0]!.teks).toContain(`${menitError} menit (Ilustrasi)`);
    expect(d.cerita![0]!.teks).toContain(`${klien} client dengan pool ${poolPerKlien} meminta ${diminta} koneksi sekaligus`);
    expect(d.cerita![0]!.teks).toContain(`kode ${kodeGalat} (Rekaman lab)`);
    harus("Keadaan ini disebut badai koneksi: banyak pool menyambung ke database pada waktu yang sama sampai batas koneksinya terlewati.");
  });
});

describe("kalimat berulang di badan halaman", () => {
  test("tidak ada kalimat (empat kata atau lebih) yang muncul dua kali: toContain dan harus() puas dengan satu kemunculan, jadi kalimat yang digandakan lolos tanpa kunci baris", () => {
    const kalimat = badan.split("\n").filter((b) => b.trim() && !b.startsWith("<") && !b.startsWith("|")).flatMap((b) => b.split(/(?<=[.!?])\s+/).map((k) => k.trim())).filter((k) => k.split(/\s+/).length >= 4);
    expect(kalimat.length).toBeGreaterThan(50);
    const hitung = new Map<string, number>();
    for (const k of kalimat) hitung.set(k, (hitung.get(k) ?? 0) + 1);
    expect([...hitung].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([]);
    const klausa = badan.split("\n").filter((b) => b.trim() && !b.startsWith("<") && !b.startsWith("|")).flatMap((b) => b.split(/(?<=[.!?:])\s+/).map((k) => k.trim())).filter((k) => k.split(/\s+/).length >= 5);
    const hitungKlausa = new Map<string, number>();
    for (const k of klausa) hitungKlausa.set(k, (hitungKlausa.get(k) ?? 0) + 1);
    expect([...hitungKlausa].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([]);
  });
});

describe("ID registry, tautan, template blok, widget, kartu, tebakan, dan label", () => {
  test("tautan [[id]]: semua id ada di registry, himpunan dan jumlah per tujuan terkunci", () => {
    const hitung: Record<string, number> = {};
    for (const m of halaman.matchAll(/\[\[([^\]]+)\]\]/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    for (const id of Object.keys(hitung)) expect(id === "A0" || hal.some((x) => x.id === id), id).toBe(true);
    expect(hitung).toEqual({ "t5-rpo-rto": 3, "t3-pool": 3, A0: 1, "t5-service": 1, "t5-fitur-teknis": 1, "t5-prd": 1, "t5-m40": 1, "t5-m42": 1, "t5-pooler": 2 });
  });
  test("template masalah: lima blok dalam urutan, dua pertama terbuka; Cek diri tiga soal; satu tebak details.question; noscript; SkripLama di akhir", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("123");
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(3);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t5-m46.json" />');
    expect(badan).toContain("<Rantai data={poolBatas} ringkas />");
    expect(halaman).toContain('import poolBatas from "../../../../data/diagram/t5-m46-pool-melewati-batas.json";');
    expect(jumlah(badan, "<Rantai ")).toBe(1);
    expect(jumlah(badan, "<WidgetLama")).toBe(1);
    expect(jumlah(badan, "<Snippet ")).toBe(2);
    expect(jumlah(badan, "<Blok ")).toBe(5);
    expect(jumlah(badan, "<details")).toBe(4);
    expect(jumlah(badan, "<summary>")).toBe(4);
    harus("**Yang tidak direkam.**");
  });
  test("tabel Hitungan: satu tabel tiga kolom; isi sel diturunkan dari rekaman, naskah, dan hasil rumus (pembulatan setengah ke atas)", () => {
    const baris = badan.split("\n");
    const tabel = baris.filter((b) => b.startsWith("|"));
    expect(tabel.length).toBe(11);
    for (const b of tabel) expect(pecahBaris(b).length).toBe(3);
    expect(pecahBaris(tabel[0]!)).toEqual(["Besaran", "Rumus", "Hasil"]);
    expect(pecahBaris(tabel[1]!)).toEqual(["---", "---", "---"]);
    const perPod = bulat1(bulat1(lambdaPuncak * waktuW) / (nService * nPod));
    const persenAnggaran = bulat1((menitError / 43.2) * 100);
    expect(tabel.slice(2).map(pecahBaris)).toEqual([
      ["Koneksi bila semua pool penuh", `${nService} service × ${nPod} pod × ${nPool}`, String(nPotensi)],
      ["Tersedia untuk role biasa", `${maksKoneksi} − ${cadangan}`, String(tersedia)],
      ["Tidak bisa dibuka bila tidak ada koneksi lain", `${nPotensi} − ${tersedia}`, String(nPotensi - tersedia)],
      ["Diminta dibanding tersedia", `${nPotensi} ÷ ${tersedia}`, `${bulat0((nPotensi / tersedia) * 100)}%`],
      ["Koneksi sibuk rata-rata pada beban puncak", `${littleBeban[1]} × ${littleBeban[2]}`, koma(bulat1(lambdaPuncak * waktuW))],
      ["Koneksi sibuk rata-rata per pod", `${koma(bulat1(lambdaPuncak * waktuW))} ÷ ${nService * nPod}`, koma(perPod)],
      ["Lab: koneksi diminta", `${klien} × ${poolPerKlien}`, String(diminta)],
      ["Lab: paling sedikit ditolak", `${diminta} − ${tersedia}`, String(diminta - tersedia)],
      ["Gangguan 4 menit terhadap anggaran 43,2 menit", `${menitError} ÷ 43,2`, `${koma(persenAnggaran)}%`],
    ]);
    expect(nDitolak).toBe(nPotensi - tersedia);
    expect(rpoRto).toContain("0,001 × 43.200");
    harus("Koneksi yang sibuk rata-rata hanya 27,8, sedangkan pool semua pod boleh membuka 180. Yang melewati batas adalah koneksi yang mungkin dipakai bersamaan, bukan rata-ratanya. Keadaan ini disebut badai koneksi: banyak pool menyambung ke database pada waktu yang sama sampai batas koneksinya terlewati.");
    harus(`Empat menit masih di bawah RTO 15 menit, tetapi pembayaran berhenti selama empat menit itu (Ilustrasi). RTO dan anggaran kegagalan 43,2 menit per 30 hari dibahas di [[t5-rpo-rto]], dan keduanya Asumsi produk.`);
    expect(menitError).toBe(4);
    expect(menitError).toBeLessThan(15);
    harus("Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini, dan labelnya mengikuti masukan terlemahnya. Pool 10, tiga pod per service, 3 koneksi cadangan, dan 0,02 detik per request adalah Asumsi naskah, jadi hasilnya Hitungan atas Asumsi. Dua baris Lab memakai angka rekaman, jadi labelnya Hitungan atas Rekaman lab. Laju 1.388,9 request per detik adalah beban puncak Tahap 5 ([[t5-prd]]), dan 0,02 detik sama dengan lama satu request memegang koneksi di [[t5-m40]].");
  });
  test("adegan Gejala tanpa kalimat definisi: dua paragraf adegan dan dua paragraf catatan", () => {
    const gejala = badan.slice(badan.indexOf('<Blok nama="Gejala"'), badan.indexOf("</Blok>"));
    const paragraf = gejala.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<"));
    expect(paragraf).toHaveLength(4);
    expect(paragraf.slice(0, 2).some((b) => b.startsWith("*"))).toBe(false);
    expect(paragraf[2]!.startsWith("*Angka cerita (Ilustrasi):*")).toBe(true);
    expect(paragraf[3]!.startsWith("Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]]")).toBe(true);
    for (const b of paragraf) expect(b).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/i);
    // gejala tidak memuat batas koneksi, kode galat, pool, atau PgBouncer: itu isi blok sesudahnya
    for (const k of ["max_connections", "53300", "pool", "PgBouncer", "koneksi"]) expect(gejala, k).not.toContain(k);
  });
  test("tebak dulu: jawabannya tidak tertulis di atasnya; teks dan JSON Rantai di atas widget tidak membuka jawaban tebakan widget (PgBouncer, bagian B, 20, tanpa galat)", () => {
    const iTebak = badan.indexOf('<details class="question">');
    const sebelumTebak = badan.slice(0, iTebak);
    for (const k of ["ditolak", "53300", "too_many", "hanya diterima untuk superuser", "mencapai atau melewati", "ditahan", "100 − 3", "97"]) expect(sebelumTebak, k).not.toContain(k);
    expect(sebelumTebak).toContain("PostgreSQL membatasi jumlah koneksi yang terbuka bersamaan lewat `max_connections`, dan menyisakan sebagian slot untuk superuser lewat `superuser_reserved_connections`.");
    const jawabanTebak = badan.slice(badan.indexOf("</summary>", iTebak), badan.indexOf("</details>", iTebak));
    expect(jawabanTebak.startsWith("</summary>\n\nDitolak. ")).toBe(true);
    const ringkasTebak = badan.slice(iTebak, badan.indexOf("</summary>", iTebak));
    expect(ringkasTebak).toBe(`<details class="question">\n<summary>Tebak dulu: database sehat dan menerima koneksi, tetapi jumlah koneksi dari role biasa yang diminta melewati batas itu. Menurut dokumentasi PostgreSQL 17, apa yang terjadi pada koneksi baru: ditahan sampai ada slot bebas, atau ditolak?`);
    // widget: jawaban varian tidak muncul di teks atau JSON Rantai di atasnya
    const sebelumWidget = badan.slice(0, badan.indexOf("<WidgetLama"));
    for (const k of ["PgBouncer", "bagian B", "tanpa galat", "2.400", "2400", "paling banyak 20", "perantara"]) expect(sebelumWidget, k).not.toContain(k);
    for (const k of ["PgBouncer", "bagian B", "tanpa galat", "perantara", "pooler koneksi"]) expect(JSON.stringify(rantaiMentah).toLowerCase(), k).not.toContain(k.toLowerCase());
  });
  test("satu kata per konsep: service (bukan layanan), pod (bukan instance), replica, tanpa pembeli, pelanggan, secret, rahasia, klien, kita, Anda, pengguna; antrean ditulis queue", () => {
    const tanpaKode = badan.replace(/`[^`]*`/g, "").replace(/<Snippet[^>]*>/g, "");
    for (const k of ["pembeli", "pelanggan", "layanan", "secret", "rahasia", "klien", "instance", "pengguna", "antrean", "replika"]) expect(tanpaKode.toLowerCase(), k).not.toContain(k);
    expect(tanpaKode).not.toMatch(/\bAnda\b/);
    expect(tanpaKode).not.toMatch(/\bkita\b/i);
    expect((tanpaKode.match(/\bservice\b/gi) ?? []).length).toBeGreaterThan(4);
    expect((tanpaKode.match(/\bpod\b/gi) ?? []).length).toBeGreaterThan(8);
    expect((tanpaKode.match(/\breplica\b/gi) ?? []).length).toBe(5);
  });
  test("label: 'Rekaman lab' hanya untuk rekaman pooler.txt, definisi, dan Snippet; kode lab, dokumentasi, dan sumber luar Tidak dijalankan; penalaran berdefinisi di pemakaian pertama; Hitungan berdefinisi sebelum tabel", () => {
    const barisRekaman = badan.split("\n").filter((b) => b.includes("Rekaman lab"));
    expect(barisRekaman.length).toBe(6);
    for (const b of barisRekaman) {
      expect(b.includes("`pooler.txt` bagian A") || b.includes("`pooler.txt` bagian B") || b.includes("Arti Ilustrasi, Rekaman lab") || b.includes("Rekaman lab: labs/") || b.includes("Rekaman lab tidak punya retry") || b.includes("Dua baris Lab memakai angka rekaman") || b.includes("Hitungan atas Rekaman lab") || b.includes("Rekaman lab. ")).toBe(true);
    }
    expect(badan).not.toMatch(/\b\d+ (menit|jam)[^.\n]*\(Rekaman lab\)/);
    expect(jumlah(badan, "(Tidak dijalankan: dibaca dari kode lab)")).toBe(1);
    expect(jumlah(badan, "(Ilustrasi)")).toBe(3);
    expect(jumlah(badan, "[perlu verifikasi]")).toBe(0);
    expect(jumlah(badan, "(penalaran")).toBe(5);
    expect(badan.indexOf("Itu penalaran, yaitu kesimpulan penulis dari kode dan dokumentasi")).toBeGreaterThan(-1);
    expect(badan.indexOf("Itu penalaran, yaitu kesimpulan penulis dari kode dan dokumentasi")).toBeLessThan(badan.indexOf("(penalaran)."));
    expect(badan.indexOf("Itu penalaran, yaitu kesimpulan penulis dari kode dan dokumentasi")).toBeLessThan(badan.indexOf("**Retry bisa memperparah (penalaran).**"));
    // 'Hitungan' dipakai pertama kali di kalimat definisi, sebelum tabel; jawaban Tebak tidak memakai label itu
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("Hitungan adalah hasil rumus"));
    expect(badan.indexOf("Hitungan")).toBeLessThan(badan.indexOf("| Besaran |"));
    expect(jumlah(badan.slice(0, badan.indexOf("<Blok nama=\"Yang sebenarnya\">")), "Hitungan")).toBe(0);
    expect(jumlah(badan, "Asumsi")).toBe(6);
  });
  test("klaim universal: tak ada 'selalu', 'setiap', 'tidak pernah', 'hanya di'; 'semua', 'tiap', 'hanya', dan 'paling' hanya di kalimat berlingkup yang terkunci", () => {
    const tanpaNoscript = badan.replace(/<noscript>[\s\S]*?<\/noscript>/, "");
    const kalimat = tanpaNoscript.split("\n").filter((b) => b.trim() && !b.startsWith("|") && (!b.startsWith("<") || b.startsWith("<summary>"))).flatMap((b) => b.replace(/<\/?summary>/g, "").split(/(?<=[.!?])\s+/)).map((s) => s.trim().replace(/\s+/g, " "));
    const pakai = (k: string): string[] => kalimat.filter((s) => new RegExp(`\\b${k}\\b`, "i").test(s));
    for (const k of ["selalu", "setiap", "tidak pernah", "hanya di", "tak satu pun", "tidak satu pun", "mana pun", "pasti"]) expect(pakai(k), k).toEqual([]);
    expect(pakai("semua")).toEqual([
      "Semua service menjawab 500, dan alert menyala walau database sehat.",
      "Semua galat yang tercatat berkode 53300.",
      "Koneksi yang sibuk rata-rata hanya 27,8, sedangkan pool semua pod boleh membuka 180.",
      "Berapa koneksi yang diminta bila semua pool penuh, berapa yang tersedia, dan berapa yang sibuk rata-rata pada beban puncak?",
    ]);
    expect(pakai("hanya")).toEqual([
      "Bila koneksi aktif sudah mencapai atau melewati `max_connections` dikurangi `superuser_reserved_connections`, koneksi baru hanya diterima untuk superuser ([PostgreSQL 17: Connection Settings](" + URL_KONEKSI + "), dibuka " + TANGGAL + ", Tidak dijalankan).",
      "Koneksi yang sibuk rata-rata hanya 27,8, sedangkan pool semua pod boleh membuka 180.",
      "Widget ini hanya menunjukkan bahwa satu hal berbeda mengubah hasilnya.",
    ]);
    expect(pakai("paling")).toEqual(["Lab memeriksa bahwa jumlah itu di bawah 120, dan koneksi role itu paling banyak 97 pada sampel tiap 100 milidetik."]);
    expect(pakai("tiap").map((s) => s.slice(0, 60))).toEqual([
      "**Kode yang direkam.** Tiap client memakai satu pool dengan ",
      "Tiap koneksi yang berhasil dibuka dipakai untuk 20 query, de",
      "Lab memeriksa bahwa jumlah itu di bawah 120, dan koneksi rol",
      "**Dari 12 client ke 18 pod.** Cerita punya enam service deng",
      "Selama primary lama tidak menjawab, permintaan ke tiap pod m",
      "Rekaman lab tidak punya retry: tiap permintaan koneksi berja",
      "- Queue permintaan di tiap pod, retry, dan lama 4 menit tida",
      "**2.** Enam service punya tiga pod tiap service dengan pool ",
    ]);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, skenario, kartu, dan halaman istilah (kecuali field riset)", () => {
    const tampil = [badan, frontmatter, JSON.stringify(rantaiMentah), JSON.stringify(skenario), JSON.stringify(kartuSemua.filter((x) => x.halaman === "t5-m46"))].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/keputusan \d{3,4}/i);
    expect(tampil).not.toMatch(/(PR|pull request) #?\d{3}\b/);
    const { sumber, ...tanpaRiset } = istilahMentah as Record<string, unknown>;
    expect(JSON.stringify(tanpaRiset)).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(JSON.stringify((sumber as { judul: string; catatan: string }[]).map((s) => [s.judul, s.catatan]))).not.toMatch(/\bR\d-\d{2,3}\b/);
  });
  test("kartu Cek diri: tiga kartu t5-m46, tanya sama dengan soal di halaman, jawaban halaman termuat", () => {
    const k = kartuSemua.filter((x) => x.halaman === "t5-m46");
    expect(k.map((x) => x.id)).toEqual(["t5-m46-1", "t5-m46-2", "t5-m46-3"]);
    const soal = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(k.map((x) => x.tanya)).toEqual(soal);
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban).toHaveLength(3);
    k.forEach((x, i) => expect(jawaban[i]).toContain(x.jawab));
    for (const x of k) { expect(x.url).toBe("tahap-5/m46-failover-semua-error/"); expect(x.judul).toBe(`5.16 ${dari("t5-m46").judul}`); }
    expect(jawaban[0]).toBe(`Rekaman membuktikan bahwa PostgreSQL 17.11 menolak koneksi dari role biasa dengan kode ${kodeGalat} saat ${diminta} koneksi diminta bersamaan dan batasnya ${tersedia} (\`pooler.txt\` bagian A). Rekaman tidak membuktikan failover, ${nService * nPod} pod, atau jumlah koneksi yang berhasil: rekaman \`pooler.txt\` memakai satu PostgreSQL tanpa replica atau pod, dan tidak merekam jumlah itu sebagai angka.`);
    expect(jawaban[1]).toBe(`Diminta ${nService} × ${nPod} × ${nPool} = ${nPotensi} dan tersedia ${maksKoneksi} − ${cadangan} = ${tersedia}, jadi ${nDitolak} tidak bisa dibuka bila tidak ada koneksi lain. Yang sibuk rata-rata ${littleBeban[1]} × ${littleBeban[2]} = ${koma(bulat1(lambdaPuncak * waktuW))}. Semuanya Hitungan atas Asumsi.`);
    expect(jawaban[2]).toBe("`MaxConns` bawaan adalah nilai yang lebih besar antara 4 dan `runtime.NumCPU()`, dan `MaxConnLifetimeJitter` bawaan 0 (dokumentasi, Tidak dijalankan). Di lab, `MaxConns` bernilai 10 dan jitter tidak diatur.");
  });
});

describe("diagram Rantai dan skenario alur: diturunkan dari rekaman", () => {
  test("diagram Rantai: ringkas, satu baris tiga simpul, sumber rekaman pooler.txt A, simpul dan sub dari nilai turunan", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d).toEqual({
      id: "t5-m46-pool-melewati-batas",
      judul: `Dua belas client yang meminta ${diminta} koneksi ke batas ${tersedia} untuk role biasa sebagian ditolak dengan kode ${kodeGalat}`,
      sumber: { jenis: "rekaman", teks: `Rekaman lab api-t5 · pooler.txt bagian A (${klien} client, pool ${poolPerKlien}, langsung ke PostgreSQL)` },
      baris: [
        { label: "Dua belas client", sub: "langsung ke PostgreSQL", simpul: [
          { teks: `${klien} client × pool ${poolPerKlien}`, sub: "koneksi diminta bersamaan", nada: "biasa", kode: false },
          { teks: `${diminta} diminta, ${tersedia} tersedia`, sub: `${maksKoneksi} dikurangi ${cadangan} cadangan`, nada: "biasa", kode: false },
          { teks: `Sebagian ditolak: ${kodeGalat}`, sub: "too_many_connections", nada: "warn", kode: false },
        ] },
      ],
      catatan: `Kotak oranye adalah hasil yang bukan niat tim: koneksi yang ditolak. Jumlah koneksi yang berhasil tidak direkam sebagai angka, dan lab memeriksanya terhadap batas ${tersedia}. Rekaman ini bukan latihan failover: tidak ada primary yang dimatikan dan tidak ada pod.`,
    });
    expect(pooler[nKodeGalat - 1]).toContain(`${kodeGalat} = too_many_connections`);
    expect(d.baris).toHaveLength(1);
  });
  test("skenario alur: valid menurut alur-core, tiga komponen tanpa HP, tiga langkah utama dan dua langkah varian dari awal, sumber rekaman", () => {
    expect(core.validate(core.normalize(skenario), { exists: (p: string) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber.jenis).toBe("rekaman");
    expect(skenario.sumber.file).toBe("labs/api-t5/output/pooler.txt");
    expect(skenario.sumber.fileVarian).toBe("labs/api-t5/output/pooler.txt");
    expect(skenario.perangkat).toEqual([]);
    expect(skenario.layarAwal).toEqual({});
    expect(skenario.komponen).toEqual([{ id: "client", label: "12 client, pool 10" }, { id: "pgb", label: "PgBouncer" }, { id: "db", label: "PostgreSQL" }]);
    expect(skenario.langkah).toHaveLength(3);
    expect(skenario.varian.langkah).toHaveLength(2);
    expect(skenario.varian.mulai).toBe(0);
    expect(core.steps(skenario, true)).toHaveLength(2);
    expect(Object.keys(skenario).sort()).toEqual(["judul", "komponen", "langkah", "layarAwal", "pengantar", "perangkat", "predict", "sumber", "varian", "versi"]);
    expect((skenario as unknown as { versi: number }).versi).toBe(2);
    expect(skenario.predict.varian).toBe(true);
    expect(skenario.sumber.catatan).toBe("Lab api-t5, PostgreSQL 17.11, dari database bersih (make -C labs/api-t5 run BAGIAN=pooler). Jalur utama: pooler.txt bagian A, satu proses yang membuka 12 pool dengan 10 koneksi per pool langsung ke PostgreSQL. Ubah satu hal: pooler.txt bagian B, client yang sama lewat PgBouncer 1.26.1. Rekaman ini bukan latihan failover: rekaman pooler.txt memakai satu PostgreSQL tanpa replica, pod, atau app Flutter, dan tidak merekam layar HP. Jumlah koneksi yang berhasil tidak direkam sebagai angka. Baris diawali tanda pagar adalah baris rekaman, bukan baris log.");
    expect(pooler[1]).toContain("PostgreSQL 17.11");
    expect(readmeLab).toContain("make -C labs/api-t5 run BAGIAN=laporan");
    expect(kodeRun).toContain('BAGIAN = {"skema": rekam_skema, "laporan": rekam_laporan, "pooler": rekam_pooler,');
  });
  test("skenario: kirim tiap langkah adalah baris dari rekaman dalam urutan aslinya (A untuk jalur utama, B untuk varian); tak ada baris yang dikarang", () => {
    const urut = (kirim: string, mulai: number, akhir: number): void => {
      let kursor = mulai - 1;
      for (const b of kirim.split("\n")) {
        const i = pooler.findIndex((x, k) => k >= kursor && k < akhir && x === b);
        expect(i, `baris tidak ada di rekaman sesudah baris ${kursor}: ${b.slice(0, 70)}`).toBeGreaterThan(-1);
        kursor = i + 1;
      }
    };
    for (const l of skenario.langkah) urut(l.kirim, nA, nB);
    urut(skenario.langkah.map((l) => l.kirim).join("\n"), nA, nB);
    for (const l of skenario.varian.langkah) urut(l.kirim, nB, akhirB);
    urut(skenario.varian.langkah.map((l) => l.kirim).join("\n"), nB, akhirB);
    for (const l of [...skenario.langkah, ...skenario.varian.langkah]) expect(l.kirim.split("\n").filter((b) => b.startsWith("#"))).toEqual([]);
    expect(skenario.langkah[0]!.kirim).toBe(`${pooler[garis(pooler, /^=> SHOW max_connections/) - 1]}\n${pooler[garis(pooler, /^=> SHOW superuser_reserved_connections/) - 1]}`);
    expect(skenario.langkah[1]!.kirim).toBe(`${pooler[nPerintahA - 1]}\n${pooler[nPerintahA]}`);
    expect(skenario.langkah[2]!.kirim).toBe(pooler.slice(nBerhasil - 1, nKlienPenuhA).join("\n"));
    expect(skenario.varian.langkah[0]!.kirim).toBe([nVersiB, nPerintahB, nDimintaB].map((n) => pooler[n - 1]).join("\n"));
    expect(skenario.varian.langkah[1]!.kirim).toBe([nQueryB, nKlienPenuhB, nSimpulanB].map((n) => pooler[n - 1]).join("\n"));
    // baris varian tidak memuat pengaturan pooler dari baris default_pool_size (isi halaman berikutnya)
    expect(skenario.varian.langkah.map((l) => l.kirim).join("\n")).not.toContain("default_pool_size");
    expect(skenario.varian.langkah.map((l) => l.kirim).join("\n")).not.toContain("pool_mode");
  });
  test("skenario: judul, jelas, dan nada tiap langkah dari nilai turunan", () => {
    expect(skenario.langkah.map((l) => [l.dari, l.ke, l.judul, l.nada])).toEqual([
      ["db", undefined, `PostgreSQL menerima paling banyak ${tersedia} koneksi dari role biasa`, undefined],
      ["client", "db", `Dua belas client membuka pool ${poolPerKlien} koneksi langsung ke PostgreSQL`, undefined],
      ["db", undefined, `Sebagian koneksi ditolak dengan kode ${kodeGalat}`, "warn"],
    ]);
    expect(skenario.langkah[0]!.jelas).toBe(`Di lab, max_connections bernilai ${maksKoneksi} dan ${cadangan} slot dicadangkan untuk superuser. Role biasa mendapat ${maksKoneksi} dikurangi ${cadangan}, yaitu ${tersedia} slot.`);
    expect(skenario.langkah[1]!.jelas).toBe(`Tiap client meminta sepuluh koneksi dari pool-nya sekaligus. Dua belas client dengan sepuluh koneksi masing-masing menghasilkan ${diminta} koneksi yang diminta.`);
    expect(skenario.langkah[2]!.jelas).toBe(`PostgreSQL menjawab ${kodeGalat} untuk koneksi di atas batas. Lab tidak merekam jumlah koneksi yang berhasil sebagai angka, tetapi memeriksanya terhadap batas ${tersedia}. Kurang dari ${klien} client mendapat seluruh sepuluh koneksinya.`);
    expect(skenario.varian.label).toBe("client yang sama lewat PgBouncer");
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke, l.judul, l.nada])).toEqual([
      ["client", "pgb", "Client yang sama menyambung lewat PgBouncer", undefined],
      ["pgb", "db", "PostgreSQL melihat jauh lebih sedikit koneksi dari role itu", "good"],
    ]);
    expect(skenario.varian.langkah[0]!.jelas).toBe(`PgBouncer 1.26.1 menerima ${diminta} koneksi dari ${klien} client yang sama, dan tidak ada galat. Cara memasangnya dibahas di halaman berikutnya.`);
    expect(skenario.varian.langkah[1]!.jelas).toBe(`Semua ${query.toLocaleString("id-ID")} query selesai dan ${klien} dari ${klien} client mendapat seluruh sepuluh koneksinya. Paling banyak ${maksPgB} koneksi sampai ke PostgreSQL, di bawah batas ${tersedia}.`);
    expect(skenario.pengantar).toBe("Dewi menjalankan latihan failover, dan service menjawab 500. Lab memerankan satu bagiannya: banyak pool meminta koneksi bersamaan. Ikuti langkahnya, lalu centang 'Ubah satu hal' dan tebak apa yang terjadi bila client yang sama menyambung lewat PgBouncer.");
  });
  test("tebakan skenario: varian, jawaban benar di pilihan ketiga dan bukan yang terpanjang (posisi berbeda dari 5.18 dan 5.22), pertanyaan dan pilihan dari rekaman, penjelasan memuat sumber", () => {
    const p = skenario.predict;
    expect(p.varian).toBe(true);
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(2);
    expect(p.options[p.answer]).toBe("Semua 120 koneksi client berhasil tanpa galat, dan koneksi dari role itu di PostgreSQL tetap di bawah batas");
    const panjang = p.options.map((o) => o.length);
    expect(panjang[p.answer]).toBeLessThan(Math.max(...panjang));
    expect(p.q).toBe(`Dua belas client yang sama, dengan pool ${poolPerKlien} dan jumlah query yang sama, sekarang menyambung lewat PgBouncer, yaitu perantara yang menerima koneksi client dan meneruskan query ke PostgreSQL lewat koneksinya sendiri. Apa yang terjadi?`);
    expect(p.options.filter((_, i) => i !== p.answer)).toEqual([
      "Galat 53300 tetap muncul, karena tiap client tetap membuka sepuluh koneksi ke PostgreSQL dan batasnya sama",
      "Sebagian query gagal karena habis waktu menunggu koneksi di PgBouncer, tetapi galat 53300 tidak muncul lagi",
      "Galat 53300 muncul lebih sedikit, karena PgBouncer menolak sebagian koneksi client lebih dulu, sebelum sampai ke PostgreSQL",
    ]);
    expect(p.explain).toBe(`Semua ${diminta} koneksi client berhasil dan tidak ada galat. Dari role itu paling banyak ${maksPgB} koneksi sampai ke PostgreSQL, di bawah batas ${tersedia} (pooler.txt bagian B). Cara PgBouncer membagi koneksi dan batasnya dibahas di halaman berikutnya.`);
    // jawaban benar dibuka hanya di akhir jalur varian (jalurTebakan = varian)
    expect(core.steps(skenario, false).length).toBe(3);
    // tebakan tidak membocorkan jawaban di langkah utama
    for (const l of skenario.langkah) expect(l.kirim + l.jelas + l.judul).not.toMatch(/PgBouncer|tanpa galat|2400|<= 20/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Lapis 1b: noscript, kalimat berangka, dan paragraf utuh ditulis di tes ini (bukan di berkas kunci), supaya mutasi tanpa kunci tertangkap.
const PARAGRAF_UTUH: string[] = [
  "Minggu 8 Tahap 5. Selasa pukul 10.00 Dewi menjalankan latihan failover pertamanya. Replica dipromosikan dalam 40 detik.",
  "Selama 4 menit berikutnya app Budi menampilkan \"Gagal memuat\", dan kasir Ani menolak pembayaran. Semua service menjawab 500, dan alert menyala walau database sehat.",
  "*Angka cerita (Ilustrasi):* hari, pukul 10.00, 40 detik, dan 4 menit berasal dari naskah, bukan dari rekaman. Rekaman di halaman ini memakai satu PostgreSQL di lab api-t5, tanpa replica atau pod.",
  "Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].",
  "Raka menduga promosi belum selesai. Dugaan lainnya: database belum siap menerima koneksi.",
  "Pod adalah satu atau lebih container yang berjalan bersama ([[t5-service]]). Pool adalah kumpulan koneksi database yang dibuka sekali lalu dipinjamkan bergantian ke request ([[t3-pool]]). Role biasa adalah role database tanpa atribut superuser, seperti role yang dipakai service.",
  "PostgreSQL membatasi jumlah koneksi yang terbuka bersamaan lewat `max_connections`, dan menyisakan sebagian slot untuk superuser lewat `superuser_reserved_connections`.",
  "<summary>Tebak dulu: database sehat dan menerima koneksi, tetapi jumlah koneksi dari role biasa yang diminta melewati batas itu. Menurut dokumentasi PostgreSQL 17, apa yang terjadi pada koneksi baru: ditahan sampai ada slot bebas, atau ditolak?</summary>",
  "Ditolak. Dokumentasi menulis batasnya. Bila koneksi aktif sudah mencapai atau melewati `max_connections` dikurangi `superuser_reserved_connections`, koneksi baru hanya diterima untuk superuser ([PostgreSQL 17: Connection Settings](https://www.postgresql.org/docs/17/runtime-config-connection.html), dibuka 2026-11-04, Tidak dijalankan).",
  "Dokumentasi yang sama menulis bahwa `max_connections` biasanya bernilai 100 dan `superuser_reserved_connections` bawaannya tiga, jadi role biasa mendapat 100 − 3 = 97 slot. Lampiran kode galat PostgreSQL 17 menamai kode `53300` sebagai `too_many_connections` ([PostgreSQL 17: Appendix A](https://www.postgresql.org/docs/17/errcodes-appendix.html), dibuka 2026-11-04, Tidak dijalankan).",
  "Blok berikutnya menunjukkan kode itu di rekaman lab.",
  "Pool yang meminta koneksi bersamaan melewati batas database, dan sebagian ditolak dengan kode 53300 (Rekaman lab, `pooler.txt` bagian A).",
  "*Kondisi rekaman:* PostgreSQL 17.11, go1.27.3, dan pgx v5.11.0, dari database bersih, di lab api-t5. Satu proses `pooler` membuka 12 pool dengan 10 koneksi per pool, langsung ke PostgreSQL. Rekaman ini bukan latihan failover: tidak ada primary yang dimatikan, replica yang dipromosikan, atau pod.",
  "**Kode yang direkam.** Tiap client memakai satu pool dengan `MaxConns` 10, lalu meminta sepuluh koneksi sekaligus. Tiap koneksi yang berhasil dibuka dipakai untuk 20 query, dengan jeda 50 milidetik sesudah tiap query (Tidak dijalankan: dibaca dari kode lab):",
  "Rekaman bagian A menjalankan kode itu langsung ke PostgreSQL:",
  "Semua galat yang tercatat berkode 53300. Galat itu dikirim oleh server PostgreSQL yang hidup, karena kode lab membacanya dari `pgconn.PgError`. Jadi database yang hidup dan menjawab bisa menolak koneksi.",
  "Jumlah koneksi yang berhasil tidak direkam sebagai angka, karena bergantung pada koneksi lain di database. Lab memeriksa bahwa jumlah itu di bawah 120, dan koneksi role itu paling banyak 97 pada sampel tiap 100 milidetik.",
  "**Dari 12 client ke 18 pod.** Cerita punya enam service dengan tiga pod tiap service, jadi 18 pod dengan pool 10 koneksi. Angka 180 dan 97 datang dari tabel beban naskah dan sudah dipakai di [[t5-fitur-teknis]]. Tabel ini menghitungnya dari masukannya.",
  "Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini, dan labelnya mengikuti masukan terlemahnya. Pool 10, tiga pod per service, 3 koneksi cadangan, dan 0,02 detik per request adalah Asumsi naskah, jadi hasilnya Hitungan atas Asumsi. Dua baris Lab memakai angka rekaman, jadi labelnya Hitungan atas Rekaman lab. Laju 1.388,9 request per detik adalah beban puncak Tahap 5 ([[t5-prd]]), dan 0,02 detik sama dengan lama satu request memegang koneksi di [[t5-m40]].",
  "Koneksi yang sibuk rata-rata hanya 27,8, sedangkan pool semua pod boleh membuka 180. Yang melewati batas adalah koneksi yang mungkin dipakai bersamaan, bukan rata-ratanya. Keadaan ini disebut badai koneksi: banyak pool menyambung ke database pada waktu yang sama sampai batas koneksinya terlewati.",
  "Empat menit masih di bawah RTO 15 menit, tetapi pembayaran berhenti selama empat menit itu (Ilustrasi). RTO dan anggaran kegagalan 43,2 menit per 30 hari dibahas di [[t5-rpo-rto]], dan keduanya Asumsi produk.",
  "**Kenapa pool bisa meminta penuh.** Dengan `MinConns` 0, pool membuka koneksi baru saat ada permintaan dan belum ada koneksi bebas. Itu penalaran, yaitu kesimpulan penulis dari kode dan dokumentasi, bukan hasil yang direkam.",
  "Selama primary lama tidak menjawab, permintaan ke tiap pod menumpuk. Saat node baru siap, pod yang punya sepuluh permintaan menunggu meminta pool penuhnya sekaligus (penalaran). Lab memerankan keadaan itu dengan sepuluh permintaan per client, dan queue di pod tidak direkam.",
  "**Koneksi ke primary lama dibuang.** Saat koneksi dikembalikan ke pool, `Release` menghancurkannya bila koneksi itu sudah tertutup, masih sibuk, atau masih di dalam transaction ([pgx v5.11.0, conn.go](https://github.com/jackc/pgx/blob/v5.11.0/pgxpool/conn.go), dibuka 2026-11-04, Tidak dijalankan). Permintaan berikutnya lalu membuka koneksi baru ke node baru (penalaran).",
  "**Bawaan pgx.** Dokumentasi pgxpool v5.11.0 menulis `MaxConns` bawaan sebesar nilai yang lebih besar antara 4 dan `runtime.NumCPU()`. Bawaan `MaxConnLifetime` adalah 1 jam dan bawaan `MaxConnLifetimeJitter` adalah 0 ([pgxpool v5.11.0](https://pkg.go.dev/github.com/jackc/pgx/v5@v5.11.0/pgxpool), dibuka 2026-11-04, Tidak dijalankan). Lab memasang `MaxConns` 10 dan tidak mengatur jitter.",
  "Kode pgx menghitung batas umur koneksi dari waktu pembuatan, `MaxConnLifetime`, dan jitter acak sampai `MaxConnLifetimeJitter` (`pool.go`, Tidak dijalankan). Dengan jitter 0, koneksi yang dibuat pada detik yang sama sampai batas umurnya pada waktu yang hampir sama. Itu risiko satu jam sesudah koneksi dibuat bersamaan, bukan penyebab 4 menit di cerita (penalaran).",
  "**Retry bisa memperparah (penalaran).** Client yang mengulang koneksi yang ditolak tanpa jeda meminta slot yang sama lagi. Rekaman lab tidak punya retry: tiap permintaan koneksi berjalan sekali, dan galatnya dicatat (kode lab).",
  "**Yang tidak direkam.**",
  "- Selasa, pukul 10.00, 40 detik, 4 menit, Dewi, app Budi, dan kasir Ani berasal dari cerita (Ilustrasi). Rekaman `pooler.txt` memakai satu PostgreSQL, tanpa replica, pod, atau app.",
  "- Rekaman memuat satu proses dengan 12 pool, bukan 18 pod. Angka 180, 83, dan 27,8 adalah Hitungan atas Asumsi.",
  "- Primary yang dimatikan, promosi, dan koneksi yang diputus tidak direkam di lab ini. Promosi direkam di [[t5-m42]] untuk skema ledger.",
  "- Queue permintaan di tiap pod, retry, dan lama 4 menit tidak direkam (penalaran dan Ilustrasi).",
  "Widget ini mengikuti rekaman `pooler.txt`. Jalur utama memakai bagian A. Tebakannya tentang satu hal yang kamu ubah, jadi jawabannya terbuka di akhir langkah varian.",
  "Centang **Ubah satu hal: client yang sama lewat PgBouncer**. PgBouncer adalah pooler, yaitu perantara yang menerima koneksi client dan meneruskan query ke PostgreSQL lewat koneksinya sendiri.",
  "Jalurnya berganti menjadi dua langkah dari `pooler.txt` bagian B (Rekaman lab). Cara memasang PgBouncer dan batasnya dibahas di [[t5-pooler]]. Widget ini hanya menunjukkan bahwa satu hal berbeda mengubah hasilnya.",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Jalur utama: dari 12 client dengan pool 10, 120 koneksi diminta ke PostgreSQL yang menerima 97 untuk role biasa. Sebagian ditolak dengan kode 53300, dan kurang dari 12 client mendapat seluruh sepuluh koneksinya (`pooler.txt` bagian A).",
  "Bila client yang sama menyambung lewat PgBouncer, 120 koneksi berhasil tanpa galat dan 2.400 query selesai. Dari role itu paling banyak 20 koneksi sampai ke PostgreSQL (`pooler.txt` bagian B).",
  "- [[t5-pooler]]: pooler koneksi, yaitu perantara antara client dan PostgreSQL. Keputusannya ADR 52.",
  "- [[t3-pool]]: pool koneksi dan Little's Law, dibaca ulang untuk banyak pod.",
  "- [[t5-rpo-rto]]: promosi, failover, dan RTO, yang di latihan ini terlihat dari sisi user.",
  "Pool satu pod belum menghitung pod lain: koneksi yang mungkin dipakai bersamaan harus muat di batas database.",
  "### Cek diri",
  "**1.** Lab merekam galat 53300 dari 12 client dengan pool 10. Apa yang dibuktikan rekaman itu, dan apa yang tidak?",
  "Rekaman membuktikan bahwa PostgreSQL 17.11 menolak koneksi dari role biasa dengan kode 53300 saat 120 koneksi diminta bersamaan dan batasnya 97 (`pooler.txt` bagian A). Rekaman tidak membuktikan failover, 18 pod, atau jumlah koneksi yang berhasil: rekaman `pooler.txt` memakai satu PostgreSQL tanpa replica atau pod, dan tidak merekam jumlah itu sebagai angka.",
  "**2.** Enam service punya tiga pod tiap service dengan pool 10. Berapa koneksi yang diminta bila semua pool penuh, berapa yang tersedia, dan berapa yang sibuk rata-rata pada beban puncak?",
  "Diminta 6 × 3 × 10 = 180 dan tersedia 100 − 3 = 97, jadi 83 tidak bisa dibuka bila tidak ada koneksi lain. Yang sibuk rata-rata 1.388,9 × 0,02 = 27,8. Semuanya Hitungan atas Asumsi.",
  "**3.** Berapa nilai bawaan pgxpool v5.11.0 untuk `MaxConns` dan `MaxConnLifetimeJitter`, dan apa yang dipasang lab?",
  "`MaxConns` bawaan adalah nilai yang lebih besar antara 4 dan `runtime.NumCPU()`, dan `MaxConnLifetimeJitter` bawaan 0 (dokumentasi, Tidak dijalankan). Di lab, `MaxConns` bernilai 10 dan jitter tidak diatur.",
];
const proseUtuh = badan.split("\n").filter((b) => b.trim() && !b.startsWith("|") && (!b.startsWith("<") || (b.startsWith("<summary>") && b !== "<summary>Jawaban</summary>")));

describe("lapis 1b: noscript diturunkan dari rekaman, kalimat berangka, dan paragraf utuh", () => {
  test("noscript: dua paragraf, angka diturunkan dari pooler.txt A dan B, dan satu penutup", () => {
    expect(jumlah(badan, "</noscript>")).toBe(1);
    const ns = cari(/<noscript>\n([\s\S]*?)\n<\/noscript>/, badan, "noscript")[1]!.split("\n\n");
    expect(ns).toEqual([
      `Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Jalur utama: dari ${klien} client dengan pool ${poolPerKlien}, ${diminta} koneksi diminta ke PostgreSQL yang menerima ${tersedia} untuk role biasa. Sebagian ditolak dengan kode ${kodeGalat}, dan kurang dari ${klien} client mendapat seluruh sepuluh koneksinya (\`pooler.txt\` bagian A).`,
      `Bila client yang sama menyambung lewat PgBouncer, ${diminta} koneksi berhasil tanpa galat dan ${query.toLocaleString("id-ID")} query selesai. Dari role itu paling banyak ${maksPgB} koneksi sampai ke PostgreSQL (\`pooler.txt\` bagian B).`,
    ]);
  });
  test("kalimat berangka dari rekaman, naskah, dan halaman tetangga: minggu, 12 pool, 20 query, 18 pod, widget", () => {
    harus(`Minggu ${mingguM46} Tahap 5. Selasa pukul ${jamLatihan}`);
    harus(`- Selasa, pukul ${jamLatihan}, ${detikPromosi} detik, ${menitError} menit, Dewi, app Budi, dan kasir Ani berasal dari cerita (Ilustrasi). Rekaman \`pooler.txt\` memakai satu PostgreSQL, tanpa replica, pod, atau app.`);
    harus(`- Rekaman memuat satu proses dengan ${klien} pool, bukan ${nService * nPod} pod. Angka ${nPotensi}, ${nDitolak}, dan ${koma(bulat1(lambdaPuncak * waktuW))} adalah Hitungan atas Asumsi.`);
    harus(`**Dari ${klien} client ke ${nService * nPod} pod.**`);
    harus(`Dengan \`MinConns\` 0, pool membuka koneksi baru saat ada permintaan dan belum ada koneksi bebas.`);
    expect(kodePooler).toContain("cfg.MaxConns, cfg.MinConns = int32(*pool), 0");
    harus(`Jalurnya berganti menjadi dua langkah dari \`pooler.txt\` bagian B (Rekaman lab).`);
    harus(`Centang **Ubah satu hal: ${skenario.varian.label}**.`);
    expect(dari("t5-m46").tahap).toBe(5);
    expect(rpoRto).toContain("RTO 15 menit");
  });
  test("paragraf utuh badan halaman (kecuali tabel) sama dengan daftar di tes ini (setiap kalimat, tanpa tag), dalam urutan yang sama", () => {
    expect(proseUtuh).toEqual(PARAGRAF_UTUH);
  });
  test("halaman istilah Badai koneksi: seluruh isi sama dengan yang ditulis di tes", () => {
    expect(istilahMentah).toEqual({
      istilah: "Badai koneksi",
      sehari_hari: "Badai koneksi adalah keadaan saat banyak pool menyambung ke database pada waktu yang sama sampai batas koneksinya terlewati, sehingga sebagian koneksi ditolak.",
      cerita: [{ rujukan: "t5-m46", teks: "Latihan failover Dewi membuat service menjawab 500 selama 4 menit (Ilustrasi). Lab memerankan satu bagiannya: 12 client dengan pool 10 meminta 120 koneksi sekaligus, dan sebagian ditolak dengan kode 53300 (Rekaman lab)." }],
      mekanisme: [
        "PostgreSQL menerima paling banyak max_connections koneksi bersamaan dan menyisakan superuser_reserved_connections slot untuk superuser. Dokumentasi menulis bawaannya biasanya 100 dan 3.",
        "Koneksi baru dari role biasa yang datang sesudah batas itu tercapai tidak diterima, karena dokumentasi hanya menyebut superuser. Lab merekam kode 53300 untuk koneksi seperti itu.",
        "Koneksi yang mungkin dipakai bersamaan adalah jumlah pool dikali ukuran tiap pool, bukan jumlah koneksi yang sibuk rata-rata.",
        "Bila banyak pool membuka koneksinya pada waktu yang sama, jumlah yang diminta bisa melewati batas walau yang sibuk rata-rata jauh di bawahnya.",
      ],
      stack: null,
      jebakan: [
        "Mengira hanya database yang kurang kuat. Batas koneksi adalah angka pengaturan, dan 120 koneksi yang diminta melewati batas 97 walau tiap koneksi hanya menjalankan query singkat (Rekaman lab).",
        "Mengira mengulang koneksi yang ditolak tanpa jeda menyelesaikan masalah. Itu penalaran penulis: pengulangan meminta slot yang sama lagi.",
      ],
      terkait: ["Connection pool", "Failover", "Backoff"],
      sumber: [
        { riset: "R5-185", judul: `PostgreSQL 17: Connection Settings (dibuka ${TANGGAL})`, url: URL_KONEKSI, catatan: "max_connections biasanya 100, superuser_reserved_connections bawaan tiga, dan koneksi baru hanya diterima untuk superuser saat batasnya tercapai." },
        { riset: "R5-187", judul: "Rekaman lab api-t5: pooler.txt bagian A", rekaman: "labs/api-t5/output/pooler.txt", catatan: "Dua belas client dengan pool 10 meminta 120 koneksi langsung ke PostgreSQL, dan galat yang tercatat berkode 53300." },
      ],
    });
  });
  test("baris riset R5-185 sampai R5-189: jumlah kemunculan tanggal, versi, dan angka dikunci (toContain puas dengan satu kemunculan)", () => {
    const hitung = (id: string, k: string): number => jumlah(barisRiset(id), k);
    expect([hitung("R5-185", TANGGAL), hitung("R5-186", TANGGAL), hitung("R5-187", TANGGAL), hitung("R5-188", TANGGAL), hitung("R5-189", TANGGAL)]).toEqual([2, 2, 1, 2, 1]);
    expect(hitung("R5-185", "R5-")).toBe(1);
    expect(hitung("R5-186", "v5.11.0")).toBe(5);
    expect(hitung("R5-186", "7 September 2026")).toBe(1);
    expect(hitung("R5-186", "baris 301 dan 302")).toBe(1);
    expect(hitung("R5-185", "17.11")).toBe(1);
    expect(hitung("R5-185", "docs/17/")).toBe(2);
    expect(hitung("R5-185", "53300")).toBe(3);
    expect(hitung("R5-187", "53300")).toBe(3);
    expect(hitung("R5-187", "pooler.txt")).toBe(1);
    expect(hitung("R5-188", "186%")).toBe(2);
    expect(hitung("R5-188", "27,8")).toBe(3);
    expect(hitung("R5-189", "Selasa 10.00")).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Lapis 2: kunci kalimat dan sidik (dibangkitkan dari berkas saat ini oleh PERBARUI_KUNCI=1)
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "terbukti", "membantu", "dibaca", "diukur", "direkam", "dijalankan", "ditolak", "berhasil", "naik", "turun", "di atas", "di bawah", "tepat", "lama", "lebih", "dilewati", "habis", "pool", "koneksi", "sebaiknya", "kadang", "menolak", "bawaan", "paling sedikit", "mengira", "menduga", "sehat", "hidup", "pod", "client", "replica", "primary", "melewati", "mencapai", "ditahan"];
const sidikKata = (teks: string, kata: string[]): Record<string, number> =>
  Object.fromEntries(kata.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
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
const kartuT5m46 = kartuSemua.filter((x) => x.halaman === "t5-m46");
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/penalaran/gi) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-04/g) ?? []).length, tanggal: (halaman.match(/2026-11-04/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), skenario: sidikKata(nilaiString(skenario).join("\n"), KATA),
  struktur: struktur.join(" "), angka: prosa.flatMap((b) => angkaDari(b)).join(" "),
  riset: ["R5-185", "R5-186", "R5-187", "R5-188", "R5-189"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), skenario: h16(JSON.stringify(skenario)), kartu: h16(JSON.stringify(kartuT5m46)), istilah: h16(JSON.stringify(istilahMentah)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), skenario: tekstual(skenario), kartu: tekstual(kartuT5m46), istilah: tekstual(istilahMentah) },
};

if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat m46-failover-semua-error.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK: Record<string, unknown> = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "m46-failover-semua-error.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, skenario, kartu, dan halaman istilah terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, skenario, kartu, dan halaman istilah sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
    expect(sidikSekarang.label.rekamanLab).toBe(7);
    expect(sidikSekarang.label.dibuka).toBe(4);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, dan skenario", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.skenario).toEqual(SIDIK.skenario);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
