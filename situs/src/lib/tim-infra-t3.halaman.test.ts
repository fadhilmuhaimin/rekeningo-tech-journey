// Penjaga halaman 3.27 (tim-infra.mdx, ADR 32): angka, tautan, rentang Snippet, label sumber, klaim negatif berlingkup,
// kartu Cek diri, widget pilah, diagram Rantai, halaman istilah, baris riset, dan janji halaman lain diturunkan dari rekaman
// (queue.txt, testing.txt, panic.txt, retry.txt, m18.txt), kode lab (outbox.go, migrasi 000017, main.go, tes service),
// naskah Tahap 3, registry, dan halaman tetangga. KALIMAT_TERKUNCI mengunci SETIAP baris badan; tes lain menurunkan nilai dari
// sumber karena kalimat terkunci tidak menangkap SALAHNYA kalimat. Hanya membaca berkas terlacak git.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import inti from "../../data/diagram/t3-tim-infra-inti.json";
import pipeline from "../../data/diagram/t3-tim-infra-pipeline.json";
import { DataRantai } from "./rantai";
import { cekTemplat, daftarBlok } from "./blok";
import {
  BARIS_GLOSARIUM, FRONTMATTER, KALIMAT_TERKUNCI, SIDIK_BENTUK_MDX, SIDIK_DIAGRAM_INTI, SIDIK_DIAGRAM_PIPELINE, SIDIK_ISTILAH, SIDIK_PILAH, SIDIK_RISET,
} from "./tim-infra-t3.halaman.nilai";

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
const sidik = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);
const nilaiString = (o: unknown, out: string[] = []): string[] => {
  if (Array.isArray(o)) o.forEach((v) => nilaiString(v, out));
  else if (o && typeof o === "object") Object.values(o).forEach((v) => nilaiString(v, out));
  else if (typeof o === "string") out.push(o);
  return out;
};
const sidikJson = (o: unknown): string => sidik(nilaiString(o).join("\n"));

const BERKAS = "situs/src/content/docs/tahap-3/tim-infra.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const queue = baca("labs/t3-outbox/output/queue.txt");
const retry = baca("labs/t3-outbox/output/retry.txt");
const testing = baca("labs/api-t3/output/testing.txt");
const panic = baca("labs/t3-instance/output/panic.txt");
const m18 = baca("labs/t3-pool/output/m18.txt");
const outboxGo = baca("labs/api-t3/internal/repo/outbox.go");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const workerGo = baca("labs/api-t3/internal/worker/worker.go");
const pushGo = baca("labs/api-t3/internal/push/push.go");
const migrasi = baca("labs/api-t3/migrasi/000017_perangkat_outbox.up.sql");
const tesService = baca("labs/api-t3/internal/service/tahap3_test.go");
const runQueue = baca("labs/t3-outbox/run.py");
const pilahMentah = baca("situs/lama/widgets/data/t3-tim-infra-pilah.json");
const pilah = JSON.parse(pilahMentah) as { judul: string; kelompok: string[]; item: { teks: string; jawab: number; kenapa: string }[]; penutup: string };
const kartu = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const hal = cerita.halaman as unknown as { id: string; judul: string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[]; tahap: number; bagian?: number; label?: string }[];
const dari = (id: string) => {
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
const barisRiset = (id: string): string => {
  const m = riset.split("\n").find((b) => b.startsWith(`| ${id} |`));
  expect(m, `baris riset ${id}`).toBeDefined();
  return m!;
};
const baris = (teks: string) => teks.split("\n");
const nomorBaris = (teks: string, ok: (b: string) => boolean, dari0 = 0): number => {
  const i = baris(teks).findIndex((b, n) => n >= dari0 && ok(b));
  expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const rentang = (teks: string, a: number, z: number): string => baris(teks).slice(a - 1, z).join("\n");
const snippet = [...badan.matchAll(/<Snippet ([^>]*)\/>/g)].map((m) => ({
  file: m[1]!.match(/file="([^"]+)"/)?.[1] ?? "", lines: m[1]!.match(/lines="([^"]+)"/)?.[1] ?? "", title: m[1]!.match(/title="([^"]+)"/)?.[1] ?? "",
}));

// ---- rekaman: bagian dan nilai ------------------------------------------------------------------------------------------
const awalE = nomorBaris(queue, (b) => b.startsWith("# --- E. "));
const akhirE = nomorBaris(queue, (b) => b.startsWith("# Alert umur tertua yang dihitung dari semua kelas berbunyi walau uang tepat waktu"));
const awalTestB = nomorBaris(testing, (b) => b.startsWith("# --- B. "));
const akhirTest = ((): number => { let i = baris(testing).length; while (baris(testing)[i - 1]!.trim() === "") i--; return i; })();
const putaran1 = nomorBaris(retry, (b) => b.startsWith("putaran 1:"));
const putaran5 = nomorBaris(retry, (b) => b.startsWith("putaran 5:"));
const awalKlaim = nomorBaris(outboxGo, (b) => b.startsWith("func (r Repo) KlaimOutbox"));
const akhirKlaim = nomorBaris(outboxGo, (b) => b.includes("n, lama.Seconds())"), awalKlaim);
const awalRingkas = nomorBaris(outboxGo, (b) => b.startsWith("func (r Repo) RingkasOutbox"));
const awalUmur = nomorBaris(outboxGo, (b) => b.includes("err = r.db.QueryRowContext(ctx, `"), awalRingkas);
const akhirUmur = nomorBaris(outboxGo, (b) => b.trim() === "return perStatus, tertuaDetik, err", awalUmur);

describe("registry, meta, susunan blok, dan tautan", () => {
  test("3.27 ada, Tim dan infra, jalur inti, prasyarat 3.26, lab api-t3 dan t3-outbox, peran devops dan backend, ADR 32; judul sama dengan peta naskah", () => {
    expect(dari("t3-tim-infra")).toMatchObject({ ada: true, nomor: "3.27", jenis: "tim-infra", inti: true, prasyarat: ["t3-m27"], lab: ["api-t3", "t3-outbox"], tahap: 3, peran: ["devops", "backend"], adr: [32], bagian: 4 });
    expect(dari("t3-tim-infra").judul).toBe("Tim dan infra Tahap 3: staging, pipeline, alert, on-call + ADR 32");
    expect(naskah).toContain("| 3.27 | 4 | Tim dan infra Tahap 3: staging, pipeline, alert, on-call + ADR 32 | Tim dan infra | ★ | api-t3, t3-outbox | pilah |");
    expect(dari("t3-m27").nomor).toBe("3.26");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-m27\]\] · Jalur inti<\/p>/);
    expect(dari("t3-tim-infra").menit).toBe(Number(m[1]) + Number(m[2]));
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat tim-infra: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Siapa memegang apa", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("tim-infra", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Siapa memegang apa", "Coba"]);
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["A0", "berikutnya", "t1-tim-infra", "t2-tim-infra", "t3-adr-33", "t3-at-least-once", "t3-m22", "t3-m26", "t3-m27", "t3-outbox", "t3-pool", "t3-prd", "t3-xss-csrf"]);
    const sesuai: [string, string, string][] = [
      ["t1-tim-infra", "1.36", "Tim dan infra Tahap 1"], ["t2-tim-infra", "2.24", "Tim dan infra Tahap 2"], ["t3-adr-33", "3.30", "ADR 33"],
      ["t3-at-least-once", "3.13", "At-least-once"], ["t3-m22", "3.16", "M22"], ["t3-m26", "3.24", "M26"], ["t3-m27", "3.26", "M27"],
      ["t3-outbox", "3.9", "Outbox transaksional"], ["t3-pool", "3.8", "Connection pool"], ["t3-prd", "3.1", "PRD v3"], ["t3-xss-csrf", "3.23", "Keamanan 5"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
    }
    expect(dari("A0").ada).toBe(true);
    expect(hitung(badan, "[[berikutnya]]")).toBe(1);
    expect(hitung(badan, "[[t3-m27]]")).toBe(4);
  });
  test("janji halaman lain ke 3.27 ditepati: 3.7, 3.8, 3.9, 3.13, 3.15 menunjuk ke halaman ini, dan halaman ini memuat isinya", () => {
    const h38 = baca("situs/src/content/docs/tahap-3/connection-pool.mdx");
    const h315 = baca("situs/src/content/docs/tahap-3/dua-instance.mdx");
    const h313 = baca("situs/src/content/docs/tahap-3/at-least-once.mdx");
    const h39 = baca("situs/src/content/docs/tahap-3/outbox-worker.mdx");
    const h37 = baca("situs/src/content/docs/tahap-3/observability.mdx");
    expect(h38).toContain("alert umur notifikasi tertua ([[t3-tim-infra]])");
    expect(h38).toContain("Pencegahannya alert untuk request yang menunggu koneksi ([[t3-tim-infra]])");
    expect(h315).toContain("Alert untuk instance yang dikeluarkan ada di [[t3-tim-infra]].");
    expect(h315).toContain("ADR 32 menambah alert, staging, dan on-call ([[t3-tim-infra]])");
    expect(h313).toContain("| Replay otomatis baris `mati` | Replay buta mengulang kegagalan yang sama, dan dead-letter dibaca manusia dulu | [[t3-tim-infra]] |");
    expect(h313).toContain("alert jumlah baris `mati` menjadi tambahan yang diusulkan ADR ini");
    expect(h39).toContain("Alert umur tertua ditentukan di ADR 32 ([[t3-tim-infra]]).");
    expect(h39).toContain("Dibuka lagi oleh ADR 32 untuk kelas queue ([[t3-tim-infra]])");
    expect(h37).toContain("| Alert dan ambangnya | Ambang butuh ukuran dasar dari beban sungguhan, dan hanya umur uang yang punya dasar, yaitu janji PRD | [[t3-tim-infra]] |");
    harus("| Request menunggu koneksi | Saturation |");
    harus("| Umur notifikasi uang tertua | Latency untuk pekerjaan yang jalan di latar (penalaran) | `GET /lab/outbox`, hanya dengan `-lab`, memberi umur baris `menunggu` tertua dari semua kelas;");
    expect(mainGo).toContain("\tif *lab {\n\t\tpasangEndpointLab(rute, db, r)");
    expect(baris(naskah).find((b) => b.startsWith("| 32 |"))).not.toMatch(/minggu \d/);
    harus("**Status:** diterima di minggu 9 Tahap 3, sesudah M27. Minggu itu dibaca dari tabel masalah: naskah tidak menulis tanggal ADR. Memperbarui ADR 23: outbox di [[t3-outbox]] ditulis tanpa kelas.");
    harus("| Replay otomatis baris `mati` | Replay buta mengulang kegagalan yang sama, dan dead-letter dibaca manusia dulu ([[t3-at-least-once]]) |");
    harus("kedua instance dikeluarkan");
    // 3.13 menulis alert jumlah baris mati belum ada di ADR 32: aturan 3 halaman ini tidak memuatnya
    const aturan3 = cocok(badan, /^3\. Alert membangunkan orang hanya untuk gejala.*$/m)[0];
    expect(aturan3).not.toMatch(/mati/);
    expect(aturan3).toContain("umur notifikasi uang tertua dari kelas 0, error rate, p95, dan request menunggu koneksi");
    expect(h313).toContain("alert jumlah `mati` yang belum ada di ADR 32 ([[t3-tim-infra]])");
    harus("Naskah ADR 32 hanya memuat umur tertua. [[t3-at-least-once]] mengusulkannya dan belum diputuskan");
  });
});

describe("naskah: ADR 32, isi halaman 3.27, M27, dan tokoh", () => {
  test("baris ADR 32 di naskah memuat kelas queue, laju promo 5 per detik, alert per kelas uang, staging, backup, on-call, dan kapan salah ±8 orang", () => {
    const adr = baris(naskah).find((b) => b.startsWith("| 32 |"))!;
    for (const k of ["Kelas queue (bayar dan transfer lebih dulu, top-up massal dan promo sesudahnya)", "alert umur tertua dihitung per kelas uang", "laju promo 5 per detik", "staging otomatis dan produksi lewat approval", "backup diuji pulih mingguan", "on-call bergiliran", "Dua tabel outbox terpisah; alert hanya dari CPU; tanpa staging", "Bila tim lebih dari ±8 orang (rotasi)"]) expect(adr, k).toContain(k);
    harus("- Naskah menulis ambang alert ditetapkan di lab. Lab hanya merekam umur uang, dan 30 detik datang dari PRD. Error rate dan p95 tidak direkam, jadi ambangnya belum ditetapkan.");
    harus("- Naskah menulis kapan salah: tim lebih dari sekitar delapan orang.");
    const isi = naskah.slice(naskah.indexOf("Isi halaman 3.27 (Tim dan infra)"));
    expect(isi).toContain("Ambangnya Asumsi, ditetapkan di lab `t3-outbox` dan `api-t3`.");
    expect(isi).toContain("rotasi mingguan bergiliran; alert hanya untuk gejala yang dirasakan user: umur notifikasi uang tertua, error rate, p95, dan request yang menunggu koneksi");
    expect(isi).toContain("Testcontainers (PostgreSQL dan Redis nyata)");
    expect(isi).toContain("diuji pulih tiap minggu di staging");
    expect(isi).toContain("dengan tarif per menit ±10 kali Linux");
  });
  test("M27 minggu 9, tim empat orang, Bayu memegang staging dan on-call, Raka masih menulis backend", () => {
    expect(cocok(naskah, /\| M27 \| (\d+) \|/)[1]).toBe("9");
    expect(naskah).toContain("| **Bayu** | Backend engineer kedua, dari tim infrastruktur Grup Lestari.");
    expect(naskah).toContain("Staging, proxy, backup, alert, dan rotasi on-call |");
    expect(naskah).toContain("Raka memegang app, Nadia dan Bayu memegang backend, Wulan memegang dasbor web.");
    expect(naskah).toContain("**Raka** memegang app dan masih ikut menulis backend.");
    expect(naskah).toContain("Empat engineer selama 10 minggu.");
    harus("Tahap 3 dikerjakan empat engineer dalam 10 minggu (Asumsi cerita): Raka, Nadia, Bayu, dan Wulan.");
    // peninjau 406: halaman menulis "dua tim" padahal naskah menulis tiga tim
    expect(naskah).toContain("Tim naik dari 4 menjadi 10 sampai 15 orang dalam tiga tim.");
    expect(baca("plan/CERITA-TAHAP-4.md")).toContain("13 orang dalam tiga tim");
    harus("Tim naik dari empat menjadi 10 sampai 15 orang dalam tiga tim (naskah Tahap 3, jembatan), jadi rotasi dan alert dibagi lagi per tim.");
    expect(badan).not.toMatch(/[Dd]ua tim/);
    expect(baca("situs/src/content/docs/tahap-3/prd-v3.mdx")).toContain("| Yang dibawanya | Staging, proxy, backup, alert, dan rotasi on-call |");
    expect(baca("situs/src/content/docs/tahap-3/m22-batas-login-dua-kali.mdx")).toContain("Bayu memasang instance API kedua di staging dan meminta Dimas dari tim TI mengujinya.");
    expect(baca("situs/src/content/docs/tahap-3/m26-transfer-bukan-budi.mdx")).toContain("Flag itu tidak dicabut dari build rilis app 3.1.");
  });
});

describe("rekaman: nilai dan rentang Snippet", () => {
  test("rentang Snippet diturunkan dari baris rekaman dan kode: lima Snippet, urutan, file, baris, dan judul", () => {
    expect(snippet.map((s) => [s.file, s.lines])).toEqual([
      ["labs/t3-outbox/output/queue.txt", `${awalE}:${akhirE}`],
      ["labs/api-t3/output/testing.txt", `${awalTestB}:${akhirTest}`],
      ["labs/api-t3/internal/repo/outbox.go", `${awalUmur}:${akhirUmur}`],
      ["labs/t3-outbox/output/retry.txt", `${putaran1}:${putaran5}`],
      ["labs/api-t3/internal/repo/outbox.go", `${awalKlaim}:${akhirKlaim}`],
    ]);
    expect(snippet.map((s) => s.title)).toEqual([
      `Rekaman lab: labs/t3-outbox/output/queue.txt baris ${awalE} sampai ${akhirE} (bagian E, umur tertua)`,
      `Rekaman lab: labs/api-t3/output/testing.txt baris ${awalTestB} sampai ${akhirTest} (bagian B dan C, tanpa dan dengan tes wajib)`,
      `Kode lab: labs/api-t3/internal/repo/outbox.go baris ${awalUmur} sampai ${akhirUmur} (umur tertua semua kelas)`,
      `Rekaman lab: labs/t3-outbox/output/retry.txt baris ${putaran1} sampai ${putaran5} (bagian A, lima percobaan)`,
      `Kode lab: labs/api-t3/internal/repo/outbox.go baris ${awalKlaim} sampai ${akhirKlaim} (klaim menurut kelas)`,
    ]);
    expect(awalUmur).toBe(169);
    expect(sidik(rentang(outboxGo, awalUmur, akhirUmur))).toBe(sidik(rentang(outboxGo, 169, 171)));
  });
  test("bagian E queue.txt: umur tertua semua kelas lebih dari 30 detik, kelas uang 0 (tidak ada yang menunggu); promo dari bagian B belum dibersihkan (satu TRUNCATE, sebelum bagian C)", () => {
    const e = rentang(queue, awalE, akhirE);
    expect(e).toContain("umur tertua semua kelas: lebih dari 30 detik (promo menumpuk)");
    expect(e).toContain("umur tertua kelas uang: 0 (tidak ada yang menunggu)");
    expect(e).toContain("kurang dari 1,5 detik");
    expect(e).toContain("WHERE status = 'menunggu' AND kelas = 0   # hanya uang");
    const iTrunc = baris(queue).map((b, n) => (b.includes("TRUNCATE") ? n + 1 : 0)).filter((n) => n > 0);
    expect(iTrunc).toHaveLength(1);
    expect(iTrunc[0]!).toBeLessThan(nomorBaris(queue, (b) => b.startsWith("# --- C. ")));
    // kueri di run.py: coalesce membuat 0 berarti tidak ada baris uang yang menunggu
    expect(runQueue).toContain("SELECT coalesce(extract(epoch FROM now() - min(dibuat)), 0) FROM outbox WHERE status = 'menunggu' AND kelas = 0");
    harus("Angka 0 di kelas uang berarti tidak ada baris uang yang menunggu: kueri di `run.py` memakai `coalesce` dan menghasilkan 0 bila tidak ada baris.");
    harus("Umur semua kelas lebih dari 30 detik karena promo dari bagian B masih menunggu.");
  });
  test("hitungan kapasitas: 10.000 × 0,3 ÷ 4 = 750 detik, 4 ÷ 0,3 = 13,33, 13,33 ÷ 0,868 ≈ 15, 10.000 ÷ 5 = 2.000 detik ≈ 33 menit, 13,33 − 5 = 8,33", () => {
    const c = Number(cocok(queue, /c = (\d+) pengirim serentak/)[1]);
    const t = Number(cocok(queue, /t = (0,\d+) detik/)[1]!.replace(",", "."));
    expect(c).toBe(4);
    expect(t).toBe(0.3);
    expect((10000 * t) / c).toBe(750);
    expect((c / t).toFixed(2)).toBe("13.33");
    expect(Math.round(c / t / 0.868)).toBe(15);
    expect(10000 / 5).toBe(2000);
    expect(Math.round(2000 / 60)).toBe(33);
    expect((c / t - 5).toFixed(2)).toBe("8.33");
    expect(cocok(queue, /\+ (?:.*)10\.000 promo pada 5 per detik butuh 2\.000 detik \(33 menit\)/s)).toBeTruthy();
    harus("±750 detik sesudah pengumuman pada kapasitas 13,33 per detik (Hitungan atas Asumsi c dan t, sama dengan [[t3-m27]])");
    harus("Dengan 5 per detik, 10.000 promo butuh 2.000 detik, yaitu ±33 menit (Hitungan), dan sisa kapasitas 13,33 − 5 = 8,33 per detik.");
    harus("Terukur 4 sampai 5,6 per detik.");
    expect(queue).toContain("laju promo terukur dalam 8 detik: antara 4 dan 5,6 per detik (batas 5)");
    expect(queue).toContain("terkirim dalam kurang dari 1,5 detik");
  });
  test("retry.txt bagian A: jeda paling lama 2, 4, 8, 16 detik, jumlah 30 detik, lima percobaan lalu mati; halaman menulis 2 + 4 + 8 + 16 = 30", () => {
    const jeda = [...rentang(retry, putaran1, putaran5).matchAll(/paling lama (\d+) detik lagi/g)].map((m) => Number(m[1]));
    expect(jeda).toEqual([2, 4, 8, 16]);
    expect(jeda.reduce((a, b) => a + b, 0)).toBe(30);
    expect(retry).toContain("putaran 5: outbox.status = mati, percobaan = 5");
    harus(`Jeda paling lama sebelum baris masuk dead-letter adalah ${jeda.join(" + ")} = 30 detik (Hitungan dari \`retry.txt\` bagian A, sama dengan [[t3-at-least-once]])`);
    expect(baca("situs/src/content/docs/tahap-3/at-least-once.mdx")).toContain("| Jeda paling lama sebelum dead-letter | 2 + 4 + 8 + 16 | 30 detik |");
    // peninjau 406: kalimat "tidak melewati ambang" terkunci tetapi terlalu kuat; angka diturunkan dari kode worker dan push
    const dasar = Number(cocok(workerGo, /DasarBackoff: (\d+) \* time\.Second/)[1]);
    const selangMs = Number(cocok(workerGo, /Selang: (\d+) \* time\.Millisecond/)[1]);
    const maksPercobaan = Number(cocok(workerGo, /MaksPercobaan: (\d+)/)[1]);
    const batasPush = Number(cocok(pushGo, /const BatasBawaan = (\d+) \* time\.Second/)[1]);
    const batas = Array.from({ length: maksPercobaan - 1 }, (_, i) => dasar * 2 ** i);
    expect(batas).toEqual([2, 4, 8, 16]);
    expect(workerGo).toContain("return time.Duration(acak * float64(batas))");
    expect(workerGo).toContain("mati := n.Percobaan >= w.cfg.MaksPercobaan");
    expect(pushGo).toContain("return ErrSementara{Sebab: fmt.Sprintf(\"status %d\", resp.StatusCode)}");
    expect(outboxGo).toContain("UPDATE outbox SET status = 'mati', klaim_sampai = NULL WHERE id = $1 AND status = 'menunggu'");
    const rata = batas.reduce((a, b) => a + b / 2, 0);
    expect(rata).toBe(15);
    expect(batas.map((b) => b / 2).join(" + ")).toBe("1 + 2 + 4 + 8");
    expect(((selangMs * (maksPercobaan - 1)) / 1000).toFixed(1)).toBe("0.8");
    expect(batasPush * maksPercobaan).toBe(15);
    harus("Tiap jeda acak antara 0 dan batasnya (jitter). Jadi 30 detik adalah batas atas, dan rata-ratanya 1 + 2 + 4 + 8 = 15 detik (Hitungan dari kode worker).");
    harus("(selang polling 200 ms menambah paling banyak 0,8 detik)");
    harus("Bila push menjawab 503 dengan cepat, baris sudah `mati` sekitar 30 detik sesudah dibuat. Umurnya melewati ambang hanya bila keempat jitter mendekati batasnya");
    harus("Push yang menggantung lain ceritanya. Tiap panggilan menunggu sampai 3 detik, jadi lima percobaan menambah sampai 15 detik. Umur bisa melewati 30 detik sebelum baris mati (dibaca dari kode, Tidak dijalankan).");
    expect(badan).not.toContain("jadi umurnya tidak melewati ambang");
  });
  test("testing.txt: bagian B exit 0 tanpa database dan Redis, bagian C exit 1; paket yang gagal handler, redisbatas, service, worker; yang lolos cmd/api dan cache", () => {
    const b = rentang(testing, awalTestB, nomorBaris(testing, (x) => x.startsWith("# --- C. ")) - 1);
    const c = rentang(testing, nomorBaris(testing, (x) => x.startsWith("# --- C. ")), akhirTest);
    expect(b).toContain("# exit status 0");
    expect(c).toContain("$ TES_DB_WAJIB=1 TES_REDIS_WAJIB=1 go test -count=1 ./...");
    expect(c).toContain("# exit status 1");
    const gagal = [...c.matchAll(/^FAIL\s+lab\/apit3\/(\S+)/gm)].map((m) => m[1]);
    expect(gagal).toEqual(["internal/handler", "internal/redisbatas", "internal/service", "internal/worker"]);
    expect([...c.matchAll(/^ok\s+lab\/apit3\/(\S+)/gm)].map((m) => m[1])).toEqual(["cmd/api", "internal/cache"]);
    harus("Semua paket lolos dan exit 0, karena tes yang butuh keduanya dilewati.");
    harus("Paket yang butuh salah satunya gagal, dan `go test` keluar 1:");
    harus("Lab memakai PostgreSQL dan Redis dari docker compose. Testcontainers, migration dry-run, k6, staging, dan GitHub Actions Tidak dijalankan.");
    expect(testing).toContain("# --- C. TES_DB_WAJIB=1 dan TES_REDIS_WAJIB=1 tanpa database dan Redis: gagal keras, bukan hijau karena tes dilewati (pola 2.24) ---");
  });
  test("panic.txt bagian D: satu instance berhenti, 20 request 200 dari b; dua instance berhenti, 10 request 503; m18.txt: dipakai 10 dari maks 10 dan 190 pembacaan tanpa jawaban", () => {
    const awalD = nomorBaris(panic, (b) => b.startsWith("# --- D. "));
    const akhirD = nomorBaris(panic, (b) => b.startsWith("# --- E. ")) - 1;
    const d = rentang(panic, awalD, akhirD);
    expect(d).toContain("20 request sesudahnya lewat proxy: 200: 20 · 200 per instance: b 20");
    expect(d).toContain("10 request sesudahnya lewat proxy: 503: 10 (503: tidak ada instance yang sehat)");
    expect(panic).toContain("Tidak dijalankan: pengawas proses yang memulai ulang instance sesudah panic");
    expect(m18).toContain('{"dipakai":10,"maks":10,"terbuka":10}');
    expect(m18).toContain("190 pembacaan: tanpa jawaban x190");
    expect(m18).toContain("kolom menunggu tidak dicetak: hitungan kumulatif yang bergantung pada waktu");
    for (const k of pilah.item) expect(k.kenapa).not.toBe("");
    expect(pilah.item[0]!.kenapa).toContain("20 dari 20 request menjawab 200 dari instance b");
    expect(pilah.item[5]!.kenapa).toContain("10 dari 10 request lewat proxy menjawab 503");
    expect(pilah.item[2]!.kenapa).toContain("10 dari maks 10 dipakai dan 190 pembacaan sesudahnya tidak dijawab");
  });
  test("tabel giliran jaga: 1 ÷ n untuk empat, tiga, dua orang = 25%, 33%, 50% terhadap batas 25%; harga runner 0,062 ÷ 0,006 = 10,3", () => {
    const persen = (n: number) => Math.round(100 / n);
    expect([4, 3, 2].map(persen)).toEqual([25, 33, 50]);
    harus("| Empat (Asumsi halaman ini) | 1 ÷ 4 = 25% | Tepat di batas |");
    harus("| Tiga: Raka, Nadia, dan Bayu | 1 ÷ 3 = 33% | Di atas batas |");
    harus("| Dua: Nadia dan Bayu | 1 ÷ 2 = 50% | Di atas batas |");
    expect((0.062 / 0.006).toFixed(1)).toBe("10.3");
    harus("jadi 0,062 ÷ 0,006 = 10,3 kali (Hitungan)");
    harus("Dengan tiga orang rotasi menjadi 33% minggu, di atas batas 25% (Hitungan).");
    harus("1 ÷ 4 = 25%, tepat di batas buku SRE. Bila satu orang cuti, rotasi menjadi 1 ÷ 3 = 33%, di atas batas");
  });
});

describe("kode lab: kelas outbox, klaim, umur tertua, metric yang ada, dan klaim negatif berlingkup", () => {
  test("migrasi 000017: kolom kelas smallint NOT NULL CHECK 0 sampai 2, indeks sebagian (kelas, id); kelas tidak diikat ke jenis", () => {
    expect(migrasi).toContain("kelas         smallint    NOT NULL CHECK (kelas BETWEEN 0 AND 2),");
    expect(migrasi).toContain("0 bayar dan transfer, 1 top-up massal, 2 promo (ADR 32)");
    expect(migrasi).toContain("CREATE INDEX outbox_antre ON outbox (kelas, id) WHERE status = 'menunggu';");
    expect(migrasi).toContain("CONSTRAINT outbox_jurnal_atau_promo CHECK ((jurnal_id IS NULL) = (jenis = 'promo'))");
    expect(migrasi).not.toMatch(/CHECK \(\(?kelas[^)]*jenis/);
    expect(migrasi).not.toMatch(/CHECK \(\(?jenis[^)]*kelas/);
    harus("Kolom `kelas` bertipe `smallint NOT NULL CHECK (kelas BETWEEN 0 AND 2)`");
    harus("Database hanya membatasi `kelas` antara 0 dan 2, dan tidak mengikatnya ke `jenis`.");
  });
  test("konstanta kelas dan klaim: KelasUang 0, KelasTopup 1, KelasPromo 2; klaim ORDER BY kelas, id bila urutKelas; tes service memeriksa kelas tiap jenis", () => {
    expect(outboxGo).toMatch(/KelasUang\s+= 0 \/\/ bayar dan transfer/);
    expect(outboxGo).toMatch(/KelasTopup = 1 \/\/ top-up massal/);
    expect(outboxGo).toMatch(/KelasPromo = 2 \/\/ pengumuman promo/);
    expect(outboxGo).toContain('urut = "kelas, id"');
    expect(outboxGo).toContain("ORDER BY `+urut+`");
    expect(outboxGo).toContain("FOR UPDATE SKIP LOCKED)");
    expect(tesService).toContain("kelas != repo.KelasUang || jenis != \"bayar\"");
    expect(tesService).toContain("jenis = 'transfer' AND kelas = 0");
    expect(tesService).toContain("jenis = 'topup' AND kelas = 1");
    expect(tesService).toContain("kelas = 2 AND jenis = 'promo'");
    harus("klaim memilih `ORDER BY kelas, id` bila `urutKelas` bernilai benar:");
    harus("Aturan 2 belum ada di kode. `UmumkanPromo` menulis semua baris sekaligus dengan `coba_lagi` bawaan");
    expect(outboxGo).toContain("coba_lagi");
    expect(baca("labs/t3-outbox/README.md")).toContain("`UmumkanPromo` masih menulis semua baris dengan `coba_lagi = now()`");
  });
  test("umur tertua di kode: RingkasOutbox menghitung dari baris menunggu semua kelas (tanpa filter kelas), dan tidak menghitung baris mati", () => {
    const fungsi = rentang(outboxGo, awalRingkas, nomorBaris(outboxGo, (b) => b === "}", awalRingkas));
    expect(fungsi).toContain("FROM outbox WHERE status = 'menunggu'`).Scan(&tertuaDetik)");
    expect(fungsi).not.toMatch(/kelas/);
    expect(fungsi).toContain("min(dibuat)");
    harus("Fungsi di kode api-t3 belum punya filter itu, jadi alert per kelas belum ada di kode. Alertnya sendiri Tidak dijalankan.");
    harus("`RingkasOutbox` hanya menghitung baris `menunggu`, jadi baris `mati` tidak membunyikan alert.");
    expect(baca("situs/src/content/docs/tahap-3/at-least-once.mdx")).toContain("karena `RingkasOutbox` menghitung umur baris `menunggu` saja");
  });
  test("metric yang ada: hanya /lab/pool (kolom menunggu = WaitCount) dan /lab/outbox; klaim negatif: tanpa prometheus, opentelemetry, expvar, atau /metrics di labs/api-t3 (.go dan go.mod)", () => {
    expect(mainGo).toContain('"menunggu": int(st.WaitCount)');
    expect(mainGo).toContain('rute.HandleFunc("GET /lab/pool"');
    expect(mainGo).toContain('rute.HandleFunc("GET /lab/outbox"');
    expect(mainGo).toContain('"tertua_detik": int(tertua)');
    const berkas = (terlacak ? [...terlacak] : []).filter((f) => f.startsWith("labs/api-t3/") && (f.endsWith(".go") || f.endsWith("go.mod") || f.endsWith("go.sum")));
    expect(berkas.length).toBeGreaterThan(10);
    for (const f of berkas) expect(baca(f), f).not.toMatch(/prometheus|opentelemetry|otelhttp|expvar|"\/metrics"|http_requests_total/i);
    const rute = [...mainGo.matchAll(/HandleFunc\("GET (\/lab\/[a-z]+)"/g)].map((m) => m[1]);
    expect(rute).toContain("/lab/pool");
    expect(rute).toContain("/lab/outbox");
    harus("| Error rate | Errors | Tidak ada: api-t3 tidak punya metric status code | Belum ditetapkan |");
    harus("| p95 | Latency | Tidak ada: rekaman lab Tahap 3 tidak memuat p95 | Belum ditetapkan |");
    // klaim negatif berlingkup: delapan lab Tahap 3 (bukan t3-bayar, lab lama yang memang merekam p95)
    const labT3 = ["api-t3", "t3-pool", "t3-outbox", "t3-instance", "t3-cache", "t3-offline", "t3-dasbor", "t3-mitm"];
    const rekaman = (terlacak ? [...terlacak] : []).filter((f) => labT3.some((l) => f.startsWith(`labs/${l}/output/`)));
    expect(rekaman.length).toBeGreaterThan(30);
    for (const f of rekaman) expect(baca(f), f).not.toMatch(/\bp(?:95|99)\b|persentil|percentile/i);
    expect(baca("labs/t3-bayar/output/pool-dalam-tx.txt")).toContain("p95");
    harus("| Request menunggu koneksi | Saturation | `GET /lab/pool` memberi kolom `menunggu`, hitungan kumulatif | Belum ditetapkan |");
    expect(baca("situs/src/content/docs/tahap-3/observability.mdx")).toContain("p95 tidak direkam");
  });
});

describe("sumber luar dan baris riset R3-230 sampai R3-233", () => {
  test("baris riset ada, dikunci dengan sidik, urut dan tanpa ID ganda; tanggal akses 2026-10-27; memuat fakta yang dipakai halaman", () => {
    const id = [...riset.matchAll(/^\| (R3-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(id).size).toBe(id.length);
    for (const [k, v] of Object.entries(SIDIK_RISET)) expect(sidik(barisRiset(k)), `${k}: baca ulang sumbernya sebelum mengubah sidik`).toBe(v);
    const urut = (a: string) => Number(a.slice(3));
    expect(id.map(urut)).toEqual([...id.map(urut)].sort((a, b) => a - b));
    for (const k of ["R3-230", "R3-231", "R3-232", "R3-233"]) expect(barisRiset(k)).toContain("2026-10-27");
    expect(barisRiset("R3-230")).toContain("2019-12-05");
    expect(barisRiset("R3-230")).toContain("ApproximateAgeOfOldestMessage");
    expect(barisRiset("R3-231")).toContain("paling banyak 25% waktu untuk jaga");
    expect(barisRiset("R3-231")).toContain("paling sedikit delapan engineer");
    expect(barisRiset("R3-232")).toContain("US$0,006");
    expect(barisRiset("R3-232")).toContain("US$0,062");
    expect(barisRiset("R3-232")).toContain("sampai 6 orang atau tim, satu persetujuan cukup");
    expect(barisRiset("R3-233")).toContain("always use readonly mode when running fastlane on CI systems");
    expect(barisRiset("R3-233")).toContain("rate<0.01");
    expect(barisRiset("R3-233")).toContain("p(95)<200");
  });
  test("tautan eksternal di halaman: himpunan, tanggal akses, dan edisi sama dengan yang ditulis", () => {
    const url = [...new Set([...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!))].sort();
    expect(url).toEqual([
      "https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/",
      "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html",
      "https://docs.fastlane.tools/actions/match/",
      "https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments",
      "https://docs.github.com/en/billing/reference/actions-runner-pricing",
      "https://grafana.com/docs/k6/latest/using-k6/thresholds/",
      "https://sre.google/sre-book/being-on-call/",
      "https://sre.google/sre-book/monitoring-distributed-systems/",
    ]);
    harus("[SRE book, bab 6, edisi 2017](https://sre.google/sre-book/monitoring-distributed-systems/), dibuka 2026-10-27)");
    harus("[SRE book, bab 11, edisi 2017](https://sre.google/sre-book/being-on-call/), dibuka 2026-10-27)");
    harus("[k6: Thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/), dibuka 2026-10-27)");
    harus("2019-12-05, dibuka 2026-10-27)");
    harus("[Amazon SQS: CloudWatch metrics](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html), dibuka 2026-10-27)");
    harus("Langkah lain dicek ke dokumentasi pada 2026-10-27, dan semuanya Tidak dijalankan:");
    // arti kunci sumber: 25%, delapan engineer, minggu per bulan
    const sre = barisRiset("R3-231");
    expect(sre).toContain("tiap engineer jaga satu minggu per bulan");
    harus("tidak lebih dari 25% waktu seorang SRE dipakai untuk jaga");
    expect(sre).toContain("paging events per shift < 2");
    harus("Buku SRE memberi contoh sasaran yang bisa diukur: kurang dari dua panggilan per giliran.");
    harus("paling sedikit delapan engineer di satu lokasi");
    harus("Dokumentasi k6 memberi contoh `http_req_failed: rate<0.01` dan `http_req_duration: p(95)<200`");
    harus("Itu contoh, bukan ambang Rekeningo.");
    harus("Required reviewers bisa sampai 6 orang atau tim, dan satu persetujuan cukup. Di paket GitHub Free, Pro, dan Team, fitur itu hanya untuk repositori publik.");
    harus("Paket Rekeningo tidak ada di naskah [perlu verifikasi]; cadangannya pemicu manual");
  });
  test("atribusi Amazon: kalimat hanya yang ada di baris riset (umur pesan, DLQ terlalu lambat sendirian, backlog wajar, prioritas, queue terpisah untuk beban kerja sedikit); batas ditulis", () => {
    const r = barisRiset("R3-230");
    for (const k of ["mengukur umur pesan di dalam queue", "alarm pada volume DLQ baik tetapi datang terlalu lambat bila dipakai sendirian", "backlog wajar untuk sebagian pesan", "prioritas di belakang layar", "polling semua queue dan membantu untuk jumlah beban kerja yang sedikit", "tanpa ambang alarm"]) expect(r, k).toContain(k);
    harus("Amazon mengukur umur pesan di dalam queue untuk mengetahui sistem yang tertinggal.");
    harus("Alarm pada volume dead-letter queue mereka anggap baik, tetapi datang terlalu lambat bila dipakai sendirian.");
    harus("Backlog wajar untuk sebagian pesan.");
    harus("Tulisan itu tidak menyebut ambang alarm.");
    harus("Batasnya: tulisan Amazon adalah pandangan satu penulis tentang praktik internal pada skala jauh di atas Rekeningo.");
    expect(badan).not.toMatch(/Yanacek/);
  });
});

describe("widget pilah, diagram Rantai, halaman istilah, glosarium, dan kartu Cek diri", () => {
  test("pilah: dua kelompok, tujuh item, posisi jawaban [1,0,0,1,1,0,1] (3 membangunkan, 4 dasbor), dipasang sekali dengan noscript dan SkripLama", () => {
    expect(pilah.kelompok).toEqual(["Bangunkan on-call", "Dasbor saja"]);
    expect(pilah.item).toHaveLength(7);
    expect(pilah.item.map((i) => i.jawab)).toEqual([1, 0, 0, 1, 1, 0, 1]);
    expect(pilah.item.filter((i) => i.jawab === 0)).toHaveLength(3);
    expect(sidikJson(pilah)).toBe(SIDIK_PILAH);
    expect(pilah.penutup).toContain("Tiga kejadian membangunkan on-call");
    expect(pilah.penutup).toContain("Empat lainnya hanya dibaca di dasbor.");
    expect(hitung(badan, '<WidgetLama nama="pilah" src="data/t3-tim-infra-pilah.json" />')).toBe(1);
    expect(hitung(badan, '<SkripLama daftar={["pilah"]} />')).toBe(1);
    expect(hitung(badan, "<noscript>")).toBe(1);
    expect(hitung(badan, "{pilah.item.map((it) => (")).toBe(1);
    expect(badan).toContain('import pilah from "../../../../lama/widgets/data/t3-tim-infra-pilah.json";');
    expect(pilah.item[1]!.kenapa).toContain("paling sedikit 30 detik di belakang promo");
    expect(queue).toContain("umur notifikasi uang yang menunggu: paling sedikit 30 detik");
    expect(pilah.item[6]!.kenapa).toContain("antara 4 dan 5,6 per detik");
    expect(pilah.item[3]!.kenapa).toContain("lebih dari 30 detik sementara tidak ada baris kelas uang yang menunggu");
    harus("CPU 85% yang Ilustrasi.");
    expect(pilah.item[4]!.teks).toContain("(Ilustrasi)");
    // peninjau 406: kolom menunggu tidak terekam naik (m18.txt tidak mencetaknya), laju promo terukur 4 sampai 5,6
    expect(pilah.item[2]!.teks).not.toContain("kolom menunggu");
    expect(pilah.item[2]!.kenapa).toContain("Rekaman m18.txt tidak mencetak kolom itu, karena nilainya bergantung pada waktu.");
    expect(pilah.item[6]!.teks).toContain("batas 5 per detik");
    expect(pilah.item[6]!.teks).not.toContain("terukur 5 per detik");
  });
  test("diagram Rantai: valid, dua baris, simpul akhir terbaca benar tanpa sub; sidik setiap nilai string; judul Inti ≤ 47 karakter; nilai dari rekaman", () => {
    const i = DataRantai.parse(inti);
    const p = DataRantai.parse(pipeline);
    expect(i.baris).toHaveLength(2);
    expect(i.judul.length).toBeLessThanOrEqual(47);
    expect(i.baris.map((b) => b.simpul.at(-1)!.teks)).toEqual(["alert berbunyi", "alert diam"]);
    expect(i.baris.map((b) => b.simpul.at(-1)!.sub)).toEqual(["uang tepat waktu; penalaran dari dua umur di rekaman", "uang tepat waktu; penalaran dari dua umur di rekaman"]);
    expect(i.baris.map((b) => b.simpul[0]!.sub)).toEqual(["umur tertua semua kelas lebih dari 30 detik", "umur tertua kelas uang 0"]);
    expect(i.baris.map((b) => b.simpul[0]!.teks)).toEqual(["promo 30+ detik", "uang menunggu: 0"]);
    expect(i.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-outbox, queue.txt bagian E; alert sungguhan Tidak dijalankan" });
    expect(sidikJson(inti)).toBe(SIDIK_DIAGRAM_INTI);
    expect(p.baris.map((b) => b.simpul.length)).toEqual([5, 4]);
    expect(p.baris[0]!.simpul.filter((s) => s.nada === "good").map((s) => s.teks)).toEqual(["tes PostgreSQL dan Redis"]);
    expect(p.baris.flatMap((b) => b.simpul).filter((s) => s.sub === "Tidak dijalankan")).toHaveLength(8);
    expect(sidikJson(pipeline)).toBe(SIDIK_DIAGRAM_PIPELINE);
    expect(hitung(badan, "<Rantai data={intiDiagram} ringkas />")).toBe(1);
    expect(hitung(badan, "<Rantai data={pipelineDiagram} />")).toBe(1);
  });
  test("tiga halaman istilah (alert, on-call, staging): sidik nilai, ID riset hanya di field sumber, baris glosarium sama, istilah terkait ada di glosarium", () => {
    const glos = baca("situs/src/content/docs/alat/glosarium.mdx");
    const sem = baca("situs/data/istilah.md");
    for (const k of ["alert", "on-call", "staging"]) {
      const d = JSON.parse(baca(`situs/data/halaman-istilah/${k}.json`)) as { istilah: string; stack: unknown; terkait: string[]; sumber: { riset?: string }[] };
      expect(sidikJson(d), `${k}: baca ulang sebelum mengubah sidik`).toBe(SIDIK_ISTILAH[k]);
      expect(d.stack).toBeNull();
      for (const t of d.terkait) expect(glos, `terkait ${t}`).toContain(`| **${t}**`);
      for (const s of d.sumber) if (s.riset) expect(barisRiset(s.riset)).toContain("2026-10-27");
    }
    expect(BARIS_GLOSARIUM).toHaveLength(3);
    for (const b of BARIS_GLOSARIUM) expect(glos).toContain(b);
    expect(BARIS_GLOSARIUM.every((b) => b.endsWith("| [[t3-tim-infra]] |"))).toBe(true);
    for (const t of ["Alert", "On-call", "Staging"]) expect(sem).toContain(`*[${t}]:`);
    expect(BARIS_GLOSARIUM.join("\n")).toContain("Pemberitahuan otomatis ke orang yang sedang jaga saat satu angka melewati ambang");
    expect(BARIS_GLOSARIUM.join("\n")).toContain("Giliran jaga: satu orang dalam tim menerima alert");
    expect(BARIS_GLOSARIUM.join("\n")).toContain("Lingkungan uji yang dibuat semirip mungkin dengan produksi");
    harus("- [Halaman istilah alert](/istilah/alert/) · [on-call](/istilah/on-call/) · [staging](/istilah/staging/)");
  });
  test("kartu Cek diri: empat soal bernomor, satu details Jawaban tiap soal; kartu.json memuat soal dan jawaban yang sama", () => {
    const soal = [...badan.matchAll(/\*\*(\d)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([^\n]+)\n\n<\/details>/g)];
    expect(soal.map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    const mine = kartu.filter((k) => k.halaman === "t3-tim-infra");
    expect(mine.map((k) => k.id)).toEqual(["t3-tim-infra-1", "t3-tim-infra-2", "t3-tim-infra-3", "t3-tim-infra-4"]);
    soal.forEach((m, n) => {
      expect(mine[n]!.tanya).toBe(m[2]);
      expect(mine[n]!.jawab).toBe(m[3]);
      expect(mine[n]!.judul).toBe("3.27 Tim dan infra Tahap 3: staging, pipeline, alert, on-call + ADR 32");
      expect(mine[n]!.url).toBe("tahap-3/tim-infra/");
    });
    expect(mine[0]!.jawab).toContain("lebih dari 30 detik, sementara tidak ada baris uang yang menunggu");
    expect(mine[2]!.jawab).toContain("1 ÷ 4 = 25%");
    expect(mine[3]!.jawab).toContain("exit 1");
  });
});

describe("label sumber, ID tidak tampil, dan struktur halaman", () => {
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil ke pembaca (halaman, diagram, pilah, halaman istilah selain field riset)", () => {
    const tampil = [badan, frontmatter, JSON.stringify(inti), JSON.stringify(pipeline), pilahMentah, ...["alert", "on-call", "staging"].map((k) => JSON.stringify({ ...JSON.parse(baca(`situs/data/halaman-istilah/${k}.json`)), sumber: undefined }))];
    for (const t of tampil) {
      expect(t).not.toMatch(/\bR\d-\d+\b/);
      expect(t).not.toMatch(/keputusan \d+/i);
      expect(t).not.toMatch(/\bPR #?\d+|#\d{3}\b/);
    }
    expect(badan.replace(/\[\[[^\]]+\]\]/g, "")).not.toMatch(/\b[A-G]\d\b(?!\.)/);
  });
  test("label sumber: arti ditaut ke A0 di Inti; Rekaman lab hanya untuk rekaman dan kode lab; Tidak dijalankan dan [perlu verifikasi] dipakai pada klaim dokumentasi; Asumsi untuk jumlah orang rotasi dan ambang", () => {
    harus("Arti label Rekaman lab, Asumsi, Ilustrasi, dan Tidak dijalankan ada di [[A0]].");
    harus("Alert, staging, dan giliran jaga Tidak dijalankan.");
    harus("Tahap 3 dikerjakan empat engineer dalam 10 minggu (Asumsi cerita)");
    harus("| Umur notifikasi uang tertua | Latency untuk pekerjaan yang jalan di latar (penalaran) |");
    harus("30 detik (Asumsi, dari janji PRD v3: 95% di bawah 30 detik)");
    harus("Hanya 30 detik yang punya dasar, yaitu janji PRD v3 untuk bayar dan transfer.");
    // peninjau 406: janji 95% (persentil) lawan alert umur tertua (maksimum)
    expect(baca("situs/src/content/docs/tahap-3/prd-v3.mdx")).toContain("Bayar dan transfer: 95% dalam kurang dari 30 detik.");
    expect(outboxGo).toContain("min(dibuat)");
    harus("Janji PRD v3 berlaku untuk 95% notifikasi, sedangkan alert membaca umur yang tertua, yaitu nilai maksimum. Satu baris di atas 30 detik sudah membunyikannya, lebih ketat daripada janji itu (Asumsi penulis).");
    harus("Backup `pg_dump` harian dan uji pulih mingguan di staging adalah keputusan naskah.");
    harus("Jadwal harian dan uji pulih di staging Tidak dijalankan di Tahap 3, jadi jadwal itu Asumsi.");
    harus("Bagian cerita itu Ilustrasi: lab tidak punya build Flutter, dan nomor versi app adalah Asumsi.");
    // peninjau 406: cerita staging di M22 juga Ilustrasi; angka 10 jadi 20 dari rekaman halaman itu
    expect(baca("situs/src/content/docs/tahap-3/m22-batas-login-dua-kali.mdx")).toContain("*Angka cerita (Ilustrasi):* staging, password dari daftar kebocoran, dan Dimas sebagai pencoba berasal dari naskah.");
    harus("Ceritanya Ilustrasi, dan angka dua kali lipat sama dengan rekaman di halaman itu.");
    expect(baca("situs/src/content/docs/cara-pakai.mdx")).toContain("Label sumber");
    expect(baca("situs/src/content/docs/tahap-1/tim-infra.mdx")).toContain("Tim dan infra Tahap 1");
    expect(hitung(badan, "[perlu verifikasi]")).toBe(1);
    expect(hitung(badan, "Tidak dijalankan")).toBe(14);
  });
  test("klaim negatif dan universal berlingkup: 'tidak ada' hanya di baris metric (lingkup api-t3), 'hanya' tidak dipakai untuk rekaman di luar queue.txt, testing.txt, dan panic.txt", () => {
    expect(hitung(badan, "Tidak ada:")).toBe(2);
    expect([...badan.matchAll(/\bsemua stack\b|\bselalu\b|\btidak pernah\b|\bsetiap\b/g)].map((m) => m[0])).toEqual(["setiap", "selalu"]);
    harus("### Siapa menjalankan setiap pekerjaan");
    harus("Bila penyebab baris `mati` selalu sama dan aman diulang");
    harus("Dari semua kotak itu, hanya tes yang direkam.");
    harus("Rekaman lab yang dipakai halaman ini mencakup queue, tes, dua instance, dan pool koneksi.");
    expect(badan).not.toContain("Rekaman lab hanya mencakup");
    for (const k of ["queue.txt", "testing.txt", "panic.txt"]) expect(badan, k).toContain(k);
    expect(pilahMentah).toContain("m18.txt");
  });
  test("tingkat heading dikunci: h2 Inti dan sebelas h3 dalam urutan; satu tebakan details; empat details Jawaban; ADR 32 di blok Putuskan, Cek diri di blok Kunci", () => {
    const hd: [number, string][] = [];
    for (const b of badan.split("\n")) {
      const m = b.match(/^(#{1,6}) (.+)$/);
      if (m) hd.push([m[1]!.length, m[2]!]);
    }
    expect(hd).toEqual([
      [2, "Inti"], [3, "Siapa menjalankan setiap pekerjaan"], [3, "Satu merge menjalankan apa"], [3, "Staging: bentuk yang sama, kecuali yang dikecualikan"],
      [3, "Alert: empat gejala, satu per kelas"], [3, "Giliran jaga"], [3, "Backup"], [3, "ADR 32: kelas queue, alert umur uang tertua per kelas, staging, dan giliran jaga"],
      [3, "Sengaja belum dilakukan"], [3, "Cek diri"], [3, "Saat me-review kode AI, cek ini"], [3, "Bacaan lanjut"],
    ]);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details/g)).toHaveLength(5);
    expect(badan.indexOf("### ADR 32")).toBeGreaterThan(badan.indexOf('<Blok nama="Putuskan">'));
    expect(badan.indexOf("### ADR 32")).toBeLessThan(badan.indexOf('<Blok nama="Kunci">'));
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Kunci">'));
    expect(badan.indexOf("### Sengaja belum dilakukan")).toBeLessThan(badan.indexOf('<Blok nama="Kunci">'));
    expect(badan).toContain("**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:");
    const pre = badan.slice(badan.indexOf("**Pre-mortem.**"), badan.indexOf("**Kapan keputusan ini salah.**"));
    expect(pre.match(/^\d\. /gm)).toHaveLength(3);
    const salah = badan.slice(badan.indexOf("**Kapan keputusan ini salah.**"), badan.indexOf("**Yang akan merevisinya.**"));
    expect(salah.match(/^\d\. /gm)).toHaveLength(3);
    expect(badan.slice(badan.indexOf("**Keputusan: opsi C"), badan.indexOf("**Wujud di kode.**")).match(/^\d\. /gm)).toHaveLength(6);
  });
  test("setiap baris badan terkunci utuh: tidak ada baris di luar daftar, tidak ada entri yang hilang, urutannya sama", () => {
    const aktual = badan.split("\n").map((b) => b.trim()).filter((b) => b !== "");
    const sah = new Set(KALIMAT_TERKUNCI);
    expect(aktual.filter((s) => !sah.has(s))).toEqual([]);
    expect(aktual).toEqual(KALIMAT_TERKUNCI);
  });
  test("bentuk baris badan dikunci (baris kosong, baris isi, dan lekuk): mengubah cara MDX dirender tetapi lolos daftar kalimat yang dipangkas", () => {
    const bentuk = badan.split("\n").map((b) => (b.trim() === "" ? "_" : `${b.length - b.trimStart().length}T`)).join(",");
    expect(sidik(bentuk)).toBe(SIDIK_BENTUK_MDX);
    expect(badan.endsWith("\n")).toBe(true);
    expect(badan.includes("\r")).toBe(false);
    expect(badan.includes("\t")).toBe(false);
  });
  test("front matter dikunci: title dan description (memuat M27, 10.000 promo, kelas queue, alert umur uang tertua per kelas, staging, giliran jaga mingguan)", () => {
    expect(frontmatter.trim().split("\n")).toEqual(FRONTMATTER);
    expect(FRONTMATTER[0]).toBe('title: "3.27 Tim dan infra Tahap 3: staging, pipeline, alert, on-call + ADR 32"');
    for (const k of ["M27", "10.000 promo", "ADR 32 memilih kelas queue", "alert umur uang tertua per kelas", "staging yang berbentuk sama dengan produksi", "giliran jaga mingguan"]) expect(FRONTMATTER[1], k).toContain(k);
  });
});
