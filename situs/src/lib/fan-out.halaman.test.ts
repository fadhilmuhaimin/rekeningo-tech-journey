// Penjaga halaman 5.15 (keputusan 1556 sampai 1558): angka, hitungan, ID, tautan, label sumber, rentang Snippet, klaim "tidak" dan "hanya",
// urutan tebakan, diagram Rantai t5-fanout-inti.json, widget t5-fanout.json, halaman istilah, dan baris riset di tahap-5/fan-out.mdx.
// Nilai diturunkan dari rekaman labs/t5-fanout/output (aliran, grup, kuota, pengirim, antrean), README lab, kode labs/api-t5 (stream, repo, cmd/stream),
// naskah Tahap 5 (M45, ADR 51, tabel beban), registry, halaman tetangga, dan baris riset R5-180 sampai R5-184, bukan dari daftar yang ditulis sendiri.
// Hitungan memakai fungsi pembulatan setengah ke atas di bawah dan hanya angka yang tertulis di halaman ini (Hitungan atas Asumsi).
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman, diagram, istilah, dan baris riset dikunci per
// baris di fan-out.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks
// sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/fan-out.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Halaman ini tidak menjalankan lab: kutipan dokumentasi stack lain dan Kafka dibaca dari
// baris riset (teks mentah dibuka 2026-11-04), dan angka 429 pada uang serta umur uang tertua tidak ada di rekaman, jadi tidak boleh tampil.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import registry from "../../data/cerita.json";
import rantaiMentah from "../../data/diagram/t5-fanout-inti.json";
import widgetMentah from "../../data/widget/t5-fanout.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { HalamanIstilah } from "./istilah";
import { KALIMAT_TERKUNCI, SIDIK } from "./fan-out.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => {
  expect(fs.existsSync(path.join(akar, rel)), `berkas tidak ada: ${rel}`).toBe(true);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};
const HALAMAN = "situs/src/content/docs/tahap-5/fan-out.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const readmeLab = baca("labs/t5-fanout/README.md");
const rek = {
  aliran: baca("labs/t5-fanout/output/aliran.txt").split("\n"),
  grup: baca("labs/t5-fanout/output/grup.txt").split("\n"),
  kuota: baca("labs/t5-fanout/output/kuota.txt").split("\n"),
  pengirim: baca("labs/t5-fanout/output/pengirim.txt").split("\n"),
  antrean: baca("labs/t5-fanout/output/antrean.txt").split("\n"),
} as Record<string, string[]>;
const kode = {
  relay: baca("labs/api-t5/internal/stream/relay.go").split("\n"),
  konsumen: baca("labs/api-t5/internal/stream/konsumen.go").split("\n"),
  kirim: baca("labs/api-t5/internal/stream/kirim.go").split("\n"),
  stream: baca("labs/api-t5/cmd/stream/main.go").split("\n"),
  t5: baca("labs/api-t5/internal/repo/t5.go").split("\n"),
  notifid: baca("labs/api-t5/internal/notifid/notifid.go"),
} as Record<string, string[] | string>;
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

// ---- pembulatan dan format angka Indonesia (setengah ke atas, seperti pembaca yang menghitung dari angka tertulis) ----
const bulat = (x: number, d: number) => Math.floor(x * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const idn = (x: number, d = 0) => {
  const [a, b] = bulat(x, d).toFixed(d).split(".");
  return a!.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (b ? "," + b : "");
};
// angka Indonesia dalam teks ("1.786", "29,8") menjadi number
const angka = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

// ---- registry ----
type Hal = { id: string; judul: string; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; prasyarat?: string[]; lab?: string[]; menit?: number; peran?: string[] };
const semua: Hal[] = [];
(function jalan(x: unknown) {
  if (Array.isArray(x)) x.forEach(jalan);
  else if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (typeof o.id === "string" && typeof o.judul === "string" && typeof o.nomor === "string") semua.push(o as unknown as Hal);
    Object.values(o).forEach(jalan);
  }
})(registry);
const reg = (id: string) => {
  const h = semua.find((x) => x.id === id);
  expect(h, `id registry ${id}`).toBeTruthy();
  return h!;
};

// ---- rekaman: bagian dan rentang ----
const bagianDari = (baris: string[], noBaris: number): string => {
  for (let i = noBaris - 1; i >= 0; i--) {
    const m = baris[i]!.match(/^# --- ([A-Z])\. /);
    if (m) return m[1]!;
  }
  return "";
};
const cari = (baris: string[], teks: string | RegExp, dari = 0): number => {
  const i = baris.findIndex((b, k) => k >= dari && (typeof teks === "string" ? b.includes(teks) : teks.test(b)));
  expect(i, `baris tidak ditemukan: ${String(teks)}`).toBeGreaterThanOrEqual(0);
  return i + 1; // 1-based
};

// ---- Snippet di halaman ----
type Snip = { file?: string; lines?: string; region?: string; title?: string; lang?: string; kode: boolean };
const snippets: Snip[] = [];
for (const m of badan.matchAll(/<Snippet\b([\s\S]*?)\/>/g)) {
  const a = m[1]!;
  const at = (k: string) => a.match(new RegExp(`\\b${k}="([^"]*)"`))?.[1];
  snippets.push({ file: at("file"), lines: at("lines"), region: at("region"), title: at("title"), lang: at("lang"), kode: /\bcode=\{/.test(a) });
}
const adaSnip = (file: string, lines?: string, region?: string) =>
  snippets.filter((s) => s.file === file && s.lines === lines && s.region === region);

// ---- tabel GFM ----
const tabelDi = (awal: RegExp): string[][] => {
  const baris = badan.split("\n");
  const i = baris.findIndex((b) => awal.test(b));
  expect(i, `tabel ${awal}`).toBeGreaterThanOrEqual(0);
  const out: string[][] = [];
  for (let k = i; k < baris.length && baris[k]!.startsWith("|"); k++) out.push(baris[k]!.split("|").slice(1, -1).map((c) => c.trim()));
  return out;
};

// ---- bagian halaman ----
const potongBlok = (nama: string): string => {
  const mulai = badan.indexOf(`<Blok nama="${nama}"`);
  expect(mulai, `blok ${nama}`).toBeGreaterThanOrEqual(0);
  const akhir = badan.indexOf("</Blok>", mulai);
  return badan.slice(mulai, akhir);
};
const blok = { Mulai: potongBlok("Mulai"), Coba: potongBlok("Coba"), Paham: potongBlok("Paham"), Putuskan: potongBlok("Putuskan"), Kunci: potongBlok("Kunci") };
const barisRiset = (id: string): string => {
  const b = riset5.split("\n").filter((l) => l.startsWith(`| ${id} |`));
  expect(b.length, `baris riset ${id}`).toBe(1);
  return b[0]!;
};

describe("5.15 frontmatter, registry, dan templat", () => {
  test("judul dan deskripsi terkunci dan judul sama dengan registry", () => {
    const h = reg("t5-fanout");
    expect(frontmatter).toContain(`title: "5.15 ${h.judul}"`);
    expect(frontmatter).toContain("description: Satu pengumuman ke banyak perangkat ditulis sekali dan dibagi consumer per partisi, sedangkan notifikasi uang tetap lewat outbox. ADR 51 menimbang lima cara lain dan menulis kapan Kafka tidak diperlukan.");
  });
  test("registry: nomor 5.15, ada, konsep, ADR 51, prasyarat dan lab, menit = baca + coba", () => {
    const h = reg("t5-fanout");
    expect(h.nomor).toBe("5.15");
    expect(h.ada).toBe(true);
    expect(h.jenis).toBe("konsep");
    expect(h.adr).toEqual([51]);
    expect(h.prasyarat).toEqual(["t5-m45"]);
    expect(h.lab).toEqual(["t5-fanout"]);
    const mm = halaman.match(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: ([^·]+)· Jalur inti<\/p>/)!;
    expect(Number(mm[1]) + Number(mm[2])).toBe(h.menit);
    expect([...mm[3]!.matchAll(/\[\[([^\]]+)\]\]/g)].map((x) => x[1])).toEqual(h.prasyarat);
    expect(naskah).toContain("| 5.15 | 4 | Fan-out: event streaming, partisi, backpressure + ADR 51 | Konsep + ADR | ★ | t5-fanout | W5-fanout |");
  });
  test("peran backend saja, sesuai peta naskah (mobile hanya 5.2, 5.6, 5.7, 5.14, 5.23, 5.27)", () => {
    expect(reg("t5-fanout").peran).toEqual(["backend"]);
    expect(naskah).toContain("**Mobile** menonjolkan 5.2, 5.6, 5.7 (token LSN dikirim app), 5.14, 5.23, 5.27");
  });
  test("lima blok templat konsep, dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(b.map((x) => x.buka)).toEqual([true, true, false, false, false]);
    expect(cekTemplat("konsep", b)).toEqual([]);
  });
});

describe("5.15 rentang Snippet diturunkan dari isi berkas", () => {
  const rekamanSnip: [string, string, string, string, RegExp, RegExp][] = [
    // [kunci rekaman, rentang, bagian, ringkasan judul, baris awal, baris akhir]
    ["aliran", "53:59", "B", "satu baris outbox per penerima", /^# --- B\. Pembanding/, /^-- Hitungan: 166 byte x 1\.000\.000 penerima = 166 MB/],
    ["aliran", "37:51", "A", "satu rekaman per rentang, satu per partisi", /^\$ kafka-get-offsets\.sh --topic pengumuman\.kirim/, /^# 10\.281 perangkat, 1 baris pengumuman, 1 baris outbox, 6 rekaman di Kafka/],
    ["aliran", "84:102", "D", "relay mati sesudah broker menjawab", /^# --- D\. Relay mati/, /^-- consumer yang membaca pembayaran\.tercatat harus menyaring event_id/],
    ["grup", "5:25", "A", "consumer mati di tengah rentang", /^# --- A\. Tiga consumer/, /^-- hasil akhir tepat satu per perangkat, bukan pengiriman tepat satu kali/],
    ["grup", "27:34", "B", "mode rentan: id berbeda di tiap pengiriman", /^# --- B\. Mode rentan -id-acak/, /^-- penyedia push: perangkat dengan tepat satu notifikasi berbeda: kurang dari 10281: ya/],
    ["kuota", "5:19", "", "429, backoff, dan mode tanpa backoff", /^# --- A\. Kuota penyedia push 1\.000 per detik/, /^-- jumlah 429 tanpa backoff paling sedikit dua kali jumlah 429 dengan backoff: ya/],
    ["antrean", "37:50", "B", "pengumuman dan uang memakai satu kuota", /^# --- B\. Pengumuman lewat Kafka dan uang lewat outbox/, /^-- umur notifikasi uang tertua melebihi 2 detik \(batas lab\): ya/],
  ];
  for (const [kunci, rentang, bagian, ringkas, awal, akhir] of rekamanSnip) {
    test(`rekaman ${kunci}.txt ${rentang}: baris awal dan akhir sama dengan penanda, bagian ${bagian || "A dan B"} sama dengan judul`, () => {
      const f = `labs/t5-fanout/output/${kunci}.txt`;
      const s = adaSnip(f, rentang);
      expect(s.length, `${f}:${rentang} muncul sekali`).toBe(1);
      const [a, b] = rentang.split(":").map(Number) as [number, number];
      const baris = rek[kunci]!;
      expect(baris[a - 1]).toMatch(awal);
      expect(baris[b - 1]).toMatch(akhir);
      expect(baris.length).toBeGreaterThanOrEqual(b);
      // baris sesudahnya bukan bagian dari penutup yang sama: rentang berakhir di baris yang diharapkan
      const judul = s[0]!.title!;
      expect(judul.startsWith(`Rekaman lab: ${f}`)).toBe(true);
      expect(judul).toContain(ringkas);
      if (bagian) {
        expect(bagianDari(baris, a)).toBe(bagian);
        expect(judul).toContain(`, bagian ${bagian} (`);
      } else {
        expect(judul).toContain("(429, backoff");
        expect(bagianDari(baris, a)).toBe("A");
        expect(bagianDari(baris, b)).toBe("B");
      }
    });
  }
  test("rekaman tidak menampilkan kepala berkas (tiga baris pertama) dan tidak memuat ID riset", () => {
    for (const s of snippets.filter((x) => x.file?.includes("/output/"))) {
      const a = Number(s.lines!.split(":")[0]);
      expect(a).toBeGreaterThan(4);
    }
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(badan).not.toMatch(/(?<![A-Za-z0-9])#\d{3,}/);
    expect(badan).not.toMatch(/keputusan \d{3,4}/);
  });
  test("kode lab: rentang berpenanda fungsi dan baris", () => {
    const rel = kode.relay as string[];
    const awalRelay = cari(rel, 'case "pengumuman":');
    const akhirRelay = cari(rel, "return recs, nil", awalRelay);
    expect(adaSnip("labs/api-t5/internal/stream/relay.go", `${awalRelay}:${akhirRelay}`).length).toBe(1);
    expect(rel[awalRelay]).toContain("rencana, err := RencanaShard(ctx, r.DB, r.Partisi)");
    expect(rel.slice(awalRelay, akhirRelay).join("\n")).toContain("Partition: int32(s.Shard - 1)");
    const kon = kode.konsumen as string[];
    const awalK = cari(kon, "f.EachRecord(func(r *kgo.Record) {");
    const akhirK = cari(kon, "k.rekaman.Add(1)", awalK) + 1;
    expect(kon[akhirK - 1]).toBe("\t\t})");
    expect(adaSnip("labs/api-t5/internal/stream/konsumen.go", `${awalK}:${akhirK}`).length).toBe(1);
    const st = kode.stream as string[];
    const awalS = cari(st, "k, err := kgo.NewClient(kgo.SeedBrokers(*kafka), kgo.ConsumerGroup(*grup)");
    const akhirS = cari(st, "kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()))", awalS);
    expect(adaSnip("labs/api-t5/cmd/stream/main.go", `${awalS}:${akhirS}`).length).toBe(1);
    const t5 = kode.t5 as string[];
    const awalT = cari(t5, "func (t Tx) BuatPengumuman(");
    const akhirT = cari(t5, "return id, penerima, err", awalT) + 1;
    expect(t5[akhirT - 1]).toBe("}");
    expect(adaSnip("labs/api-t5/internal/repo/t5.go", `${awalT}:${akhirT}`).length).toBe(1);
    expect((t5.slice(awalT - 1, akhirT).join("\n").match(/INSERT INTO/g) ?? []).length).toBe(2);
    expect(t5.slice(awalT - 1, akhirT).join("\n")).toContain("'stream'");
  });
  test("region kirim-ulang dan laju ada sekali di kirim.go dan dipakai sekali", () => {
    const k = (kode.kirim as string[]).join("\n");
    for (const r of ["kirim-ulang", "laju"]) {
      expect((k.match(new RegExp(`--8<-- \\[start:${r}\\]`, "g")) ?? []).length).toBe(1);
      expect((k.match(new RegExp(`--8<-- \\[end:${r}\\]`, "g")) ?? []).length).toBe(1);
      expect(adaSnip("labs/api-t5/internal/stream/kirim.go", undefined, r).length).toBe(1);
    }
    expect(k).toContain("worker.Backoff(k, p.Dasar, p.Maks, p.Acak())");
    expect(k).toContain("p.Laju.Tunggu(ctx)");
  });
  test("kode di halaman: jumlah Snippet dan kode tab Ilustrasi", () => {
    expect(snippets.length).toBe(15);
    expect(snippets.filter((s) => s.kode).map((s) => s.lang)).toEqual(["js", "php"]);
    expect(snippets.filter((s) => !s.kode).every((s) => s.title && (s.title.startsWith("Rekaman lab: ") || s.title.startsWith("Kode lab: ") || s.title === "labs/api-t5/internal/stream/kirim.go"))).toBe(true);
  });
});

describe("5.15 fakta dari rekaman dan README lab", () => {
  test("aliran A: 10.281 perangkat, satu baris pengumuman, satu baris outbox, enam rekaman satu per partisi", () => {
    const a = rek.aliran!;
    expect(a.some((b) => b.includes("perangkat_aktif"))).toBe(true);
    expect(a.join("\n")).toContain(" 10281           | 10281");
    expect(a.filter((b) => /^pengumuman\.kirim:\d:1$/.test(b)).length).toBe(6);
    expect(a.filter((b) => /^Partition:\d Offset:0 kunci:shard-\d rentang perangkat/.test(b)).length).toBe(6);
    expect(a.join("\n")).toContain("# 10.281 perangkat, 1 baris pengumuman, 1 baris outbox, 6 rekaman di Kafka (satu per rentang, satu per partisi)");
    const jumlah = a.filter((b) => b.startsWith("Partition:")).map((b) => Number(b.match(/\((\d+) nomor\)/)![1]));
    expect(jumlah.reduce((x, y) => x + y, 0)).toBe(10281);
    for (const kata of ["satu baris `pengumuman` dan satu baris outbox bertujuan `stream` dalam satu transaction", "10.281 perangkat menulis satu baris `pengumuman`, satu baris outbox, dan enam rekaman Kafka"]) expect(norm(halaman)).toContain(kata);
  });
  test("aliran B: 166 byte per baris tanpa index, 166 MB lawan 300 byte dan 300 MB naskah", () => {
    const a = rek.aliran!.join("\n");
    expect(a).toContain("INSERT 0 10281");
    expect(a).toContain("-- tumpukan tabel (pg_relation_size) bertambah 166 byte per baris, tanpa index (dibulatkan ke bawah)");
    expect(a).toContain("-- Hitungan: 166 byte x 1.000.000 penerima = 166 MB di tumpukan tabel; naskah memakai 300 byte per baris (Asumsi): 300 MB");
    expect((166 * 1_000_000) / 1e6).toBe(166);
    expect((300 * 1_000_000) / 1e6).toBe(300);
    expect(naskah).toContain("satu baris outbox per penerima menulis ±300 MB ke primary (1.000.000 × 300 B, Asumsi)");
    expect(norm(blok.Paham)).toContain("166 × 1.000.000 = 166 MB untuk satu pengumuman (Hitungan atas rekaman). Naskah memakai 300 byte per baris, yaitu 300 MB (Asumsi)");
  });
  test("aliran C dan D: kunci merchant, urutan per merchant, relay mati menulis satu event_id dua kali", () => {
    const a = rek.aliran!.join("\n");
    expect((a.match(/^(418|502|503) \| satu \| 4 \| ya$/gm) ?? []).length).toBe(3);
    expect(a).toContain("-- uang tidak dibaca dari topik: jurnal di PostgreSQL tetap satu-satunya sumber; topik hanya untuk dilihat");
    expect(a).toContain("-- rekaman di topik: 16; event_id berbeda: 15; event_id yang muncul dua kali: 1 (di partisi yang sama)");
    expect(a).toContain("-- consumer yang membaca pembayaran.tercatat harus menyaring event_id: producer idempoten tidak menutup kegagalan relay ini");
    expect(readmeLab).toContain("Kunci yang sama selalu jatuh di partisi yang sama (`StickyKeyPartitioner`), jadi urutan per merchant terjaga. Urutan antar merchant tidak dijaga.");
    expect(norm(blok.Paham)).toContain("Urutan antar merchant tidak dijaga.");
    expect(norm(blok.Paham)).toContain("tiap merchant di satu partisi dengan jurnal naik menurut offset");
  });
  test("grup A dan B: 3 consumer, [2, 2, 2] lalu [3, 3], 10281, paling banyak 504, mode rentan id acak", () => {
    const g = rek.grup!.join("\n");
    expect(g).toContain("anggota yang memegang partisi: 3; partisi per anggota: [2, 2, 2]");
    expect(g).toContain("consumer 1: berhenti mendadak sesudah ±500 pengiriman, tanpa mencatat offset (exit status 3)");
    expect(g).toContain("anggota sesudah consumer 1 mati: 2; partisi per anggota: [3, 3]");
    expect(g).toContain("-- pengiriman yang diselesaikan consumer yang hidup: 10281 dari 10281 perangkat");
    expect(g).toContain("-- penyedia push: perangkat dengan tepat satu notifikasi berbeda: 10281");
    expect(g).toContain("-- panggilan yang diulang (diterima lebih dari sekali dengan id sama): lebih dari 0 dan paling banyak 504: ya");
    expect(g).toContain("-- penyedia push: perangkat dengan lebih dari satu notifikasi berbeda: lebih dari 0 dan paling banyak 504: ya");
    expect(readmeLab).toContain("Dengan `-id-acak`, perangkat dari rentang itu menerima dua id berbeda.");
    expect(norm(halaman)).toContain("paling banyak 504");
    expect(norm(halaman)).toContain("tiga consumer memegang dua partisi tiap consumer");
    expect(norm(halaman)).toContain("dua consumer lain memegang tiga partisi tiap consumer");
  });
  test("kuota: kuota lab 1.000 per detik, 429 ada, tanpa backoff paling sedikit dua kali, jumlah tidak direkam", () => {
    const k = rek.kuota!.join("\n");
    expect(k).toContain("-- kuota lab 1.000 per detik, latensi 2 ms; naskah 10.000 per detik (aturan jendela diuji di tes Go dengan 10.000)");
    expect(k).toContain("-- ada permintaan yang dijawab 429 karena kuota terlampaui: ya");
    expect(k).toContain("-- menunggu sesudah percobaan ke-k tidak pernah melebihi min(2000, 100 x 2^(k-1)) ms, di semua consumer dan semua k: ya");
    expect(k).toContain("-- jumlah 429 tanpa backoff paling sedikit dua kali jumlah 429 dengan backoff: ya");
    expect(k).not.toMatch(/dijawab 429: \d+/);
    expect(readmeLab).toContain("Waktu, UUID acak, lama, jumlah 429, dan umur tidak direkam sebagai nilai");
    expect(norm(blok.Paham)).toContain("Jumlah pastinya bergantung mesin, jadi tidak direkam");
  });
  test("antrean B: 3 x 200 = 600 di bawah kuota 1.000, uang tidak 429, umur uang tertua batas 2 detik; mode rentan uang ikut 429", () => {
    const a = rek.antrean!.join("\n");
    expect(a).toContain("-- versi benar: tiap consumer dibatasi 200 pesan per detik (3 x 200 = 600 per detik, di bawah kuota 1.000), 4 pengirim");
    expect(a).toContain("-- notifikasi uang dijawab 429: 0");
    expect(a).toContain("-- umur notifikasi uang tertua yang masih menunggu, diukur tiap 100 ms, tidak pernah melebihi 2 detik (batas lab): ya");
    expect(a).toContain("-- notifikasi uang dijawab 429 paling sedikit satu kali: ya");
    expect(a).toContain("-- umur notifikasi uang tertua melebihi 2 detik (batas lab): ya");
    expect(a).toContain("-- kelas hanya mengatur urutan di antrean yang sama; penyedia push dan kuotanya dipakai bersama (bagian B)");
    expect(3 * 200).toBe(600);
    const t = norm(blok.Paham);
    expect(t).toContain("Dengan batas laju 3 × 200 = 600 per detik di bawah kuota 1.000, uang tidak dijawab 429 dan umur uang tertua tidak melewati 2 detik (batas lab, Asumsi)");
    expect(t).toContain("Rekaman tidak memuat jumlah 429 pada uang dan tidak memuat umur uang tertua sebagai nilai");
  });
  test("angka 429 dan umur uang dari tinjauan lab yang tidak ada di rekaman tidak tampil", () => {
    const t = norm(halaman);
    for (const salah of ["34 sampai 37", "34–37", "3 sampai 7", "5,9", "8,9 detik", "seperlima", "13,3 per detik terukur", "satu consumer dengan 4 pengirim"]) expect(t, salah).not.toContain(salah);
    expect(t).not.toMatch(/\b(?:34|37) (?:kali |jawaban )?429/);
  });
  test("pengirim B: uji-pengirim tanpa Kafka dan tanpa consumer, 48 pesan, rentang 10 sampai 13,4, 13,33 tetap Hitungan", () => {
    const p = rek.pengirim!.join("\n");
    expect(p).toContain("$ ./stream -peran uji-pengirim -jumlah 48 -serentak 4   (penyedia: kuota 0, latensi 300 ms)");
    expect(p).toContain("kapasitas terukur (pesan per detik) antara 10 dan 13,4 (c / t naskah = 13,33): ya");
    expect((kode.stream as string[])[4]).toContain("-peran uji-pengirim   mengirim -jumlah pesan langsung ke penyedia push (tanpa Kafka)");
    const t = norm(blok.Paham);
    expect(t).toContain("Peran `uji-pengirim` mengirim 48 pesan langsung ke penyedia tiruan berlatensi 300 ms tanpa Kafka dan tanpa consumer, dan kapasitas yang diperiksa berada antara 10 dan 13,4 pesan per detik. Angka 13,33 per detik tetap Hitungan: rekaman hanya memeriksa rentangnya.");
  });
  test("README lab: penyedia tiruan tidak menyaring, satu notifikasi per perangkat berlaku bila penerima menyaring, UUID versi 5", () => {
    expect(readmeLab).toContain("Penyedia push tiruan tidak menyaring: ia menerima ulangan, menghitungnya (`panggilan_ganda`), dan menghitung berapa `notifikasi_id` berbeda yang diterima tiap token. Satu notifikasi per perangkat berlaku bila penerima (app atau sistem operasi) menyaring id yang sama");
    expect(kode.notifid as string).toContain("UUID versi 5");
    expect(kode.notifid as string).toContain("b[6] = b[6]&0x0f | 0x50 // versi 5");
    const t = norm(blok.Paham);
    expect(t).toContain("`notifikasi_id` pengumuman dibuat dari nomor pengumuman dan nomor perangkat (UUID versi 5), jadi sama di setiap pengiriman ulang. Penyedia push tiruan hanya menghitung id berbeda per perangkat dan tidak menyaring ulangan.");
    expect(t).toContain("Transaksi Kafka tidak dijalankan.");
    expect(readmeLab).toContain("Transaksi Kafka dan exactly-once **Tidak dijalankan**");
  });
  test("breaker hanya di lajur verifikasi lewat bendera, dan relay memakai satu rekaman per rentang dengan jumlah partisi dari bendera", () => {
    const main = baca("labs/api-t5/cmd/api/main.go");
    expect(main).toContain('breaker := flag.Bool("breaker", false, "worker: breaker per vendor di lajur verifikasi (ADR 36)');
    expect(readmeLab).toContain("Breaker bersama dan 66 kegagalan hanya Hitungan.");
    expect((kode.stream as string[]).join("\n")).toContain('partisi := flag.Int("partisi", 6, "relay: jumlah rentang perangkat = jumlah partisi pengumuman.kirim")');
    expect(norm(blok.Paham)).toContain("Lab memasang breaker hanya di lajur verifikasi lewat bendera `-breaker`, bukan di lajur push, jadi 66 adalah Hitungan atas kode (Tidak dijalankan).");
  });
  test("selisih dengan naskah: satu baris outbox tetapi enam rekaman (naskah menulis satu event)", () => {
    expect(readmeLab).toContain("Naskah ADR 51 menulis \"satu baris `pengumuman` dan satu event `pengumuman.kirim`\". Di lab: satu baris outbox, tetapi enam rekaman di Kafka");
    expect(norm(blok.Paham)).toContain("Jadi satu baris outbox menjadi enam rekaman di lab, bukan satu.");
  });
  test("Kafka lab satu broker KRaft, replication factor 1, tiga broker Tidak dijalankan", () => {
    expect(readmeLab).toContain("Satu broker KRaft (broker dan controller satu proses), replication factor 1; tiga broker dan replication factor 3 **Tidak dijalankan**");
    expect(norm(blok.Putuskan)).toContain("Produksi memakai tiga broker dan replication factor 3 (Tidak dijalankan).");
    expect(norm(blok.Paham)).toContain("Kafka 4.3.2 (KRaft, satu broker)");
  });
});

describe("5.15 Hitungan atas angka yang tertulis di halaman", () => {
  const tabel = tabelDi(/^\| Besaran \| Rumus \| Hasil \|/);
  const baris = new Map(tabel.slice(2).map((r) => [r[0]!, r]));
  const hasil = (k: string) => baris.get(k)![2]!;
  test("tabel punya tiga kolom di header, pemisah, dan tiap baris, dan 12 baris isi", () => {
    expect(tabel.length).toBe(14);
    for (const r of tabel) expect(r.length).toBe(3);
    expect(tabel[1]!.every((c) => /^-+$/.test(c))).toBe(true);
  });
  const uang = 650000, jendela = 5400, bagian = 0.8, t = 0.3, c = 4, N = 1_000_000, menit30 = 1800, kuota = 10000;
  const lambda = (uang * bagian) / jendela;
  test("λ makan siang = 650.000 × 0,8 ÷ 5.400 = 96,3", () => {
    expect(idn(lambda, 1)).toBe("96,3");
    expect(hasil("λ, uang makan siang")).toBe("96,3 per detik");
    expect(baris.get("λ, uang makan siang")![1]).toBe("650.000 × 0,8 ÷ 5.400");
    expect(rek.pengirim![5]).toContain("lambda makan siang = 650.000 x 0,8 / 5.400 = 96,296 -> 96,3 per detik");
  });
  test("L = λ × t dari angka tertulis 96,3 × 0,3 = 28,89 dan dibulatkan ke atas 29; proses 8 dan 11", () => {
    const L = 96.3 * t;
    expect(idn(L, 2)).toBe("28,89");
    expect(hasil("Pengirim untuk uang")).toBe("28,89, dibulatkan ke atas 29");
    expect(Math.ceil(L)).toBe(29);
    expect(Math.ceil(28.89 / c)).toBe(8);
    expect(Math.ceil(28.89 / 0.7 / c)).toBe(11);
    expect(hasil("Proses untuk uang")).toBe("8 minimal, 11 untuk terpakai paling tinggi ±70%");
    // pemakaian dari nilai tepat, seperti rekaman pengirim.txt A
    expect(idn((lambda / ((8 * c) / t)) * 100, 1)).toBe("90,3");
    expect(idn((lambda / ((11 * c) / t)) * 100, 1)).toBe("65,7");
    expect(idn((8 * c) / t, 1)).toBe("106,7");
    expect(idn((11 * c) / t, 1)).toBe("146,7");
    const p = rek.pengirim!.join("\n");
    expect(p).toContain("8 proses x 4 = 32 pengirim -> kapasitas 32 / 0,3 = 106,7 per detik, terpakai 96,3 / 106,7 = 90,3%");
    expect(p).toContain("11 proses x 4 = 44 pengirim -> kapasitas 44 / 0,3 = 146,7 per detik, terpakai 96,3 / 146,7 = 65,7%");
    const j = norm(blok.Paham);
    expect(j).toContain("32 ÷ 0,3 = 106,7 per detik dan terpakai 90,3%. Dengan 11 proses terpakai 65,7%, dihitung dari nilai tepat 96,296 ÷ 146,667.");
    expect(idn(lambda, 3)).toBe("96,296");
    expect(idn(lambda / ((11 * c) / t), 3)).toBe("0,657");
  });
  test("pengumuman 30 menit: 555,6 per detik, 167 pengirim, 42 consumer dan partisi, 168 pengirim selesai 1.786 detik = 29,8 menit", () => {
    const laju = N / menit30;
    expect(idn(laju, 1)).toBe("555,6");
    expect(hasil("Laju pengumuman 30 menit")).toBe("555,6 per detik");
    const pengirim = 555.6 * t;
    expect(idn(pengirim, 1)).toBe("166,7");
    expect(hasil("Pengirim untuk pengumuman")).toBe("166,7, jadi 167");
    expect(Math.ceil(166.7)).toBe(167);
    const consumer = Math.ceil(167 / c);
    expect(consumer).toBe(42);
    expect(hasil("Consumer dan partisi")).toBe("42 consumer, paling sedikit 42 partisi");
    const detik = (N * t) / (consumer * c);
    expect(idn(detik, 0)).toBe("1.786");
    expect(idn(detik / 60, 1)).toBe("29,8");
    expect(hasil("Selesai dengan 168 pengirim")).toBe("1.786 detik, yaitu 29,8 menit");
    expect(consumer * c).toBe(168);
    expect(idn(167 / t, 1)).toBe("556,7");
    const p = rek.pengirim!.join("\n");
    expect(p).toContain("laju = 1.000.000 / 1.800 detik = 555,6 per detik");
    expect(p).toContain("pengirim = 555,6 x 0,3 = 166,7 -> 167");
    expect(p).toContain("consumer = ceil(167 / 4) = 42; partisi paling sedikit = 42 (satu partisi dibaca satu consumer dalam satu grup)");
    expect(norm(blok.Paham)).toContain("Tabel di widget memakai 167 ÷ 0,3 = 556,7 per detik, sedikit di atas target 555,6.");
  });
  test("4 pengirim 20,8 jam; 6 partisi × 4 = 24 pengirim = 12.500 detik = 3,5 jam; jam dihitung dari detik tertulis", () => {
    expect(Math.round((N * t) / c)).toBe(75000);
    expect(idn(75000 / 3600, 1)).toBe("20,8");
    expect(norm(blok.Paham)).toContain("1.000.000 × 0,3 ÷ 4 = 75.000 detik, yaitu 20,8 jam (Hitungan atas Asumsi)");
    expect(6 * c).toBe(24);
    expect(Math.round((N * t) / 24)).toBe(12500);
    expect(idn(12500 / 3600, 1)).toBe("3,5");
    expect(hasil("Selesai dengan 6 partisi")).toBe("12.500 detik, yaitu 3,5 jam");
    expect(norm(blok.Kunci)).toContain("12.500 detik, yaitu sekitar 3,5 jam.");
    expect(norm(blok.Kunci)).toContain("6 × 4 = 24 pengirim: 1.000.000 × 0,3 ÷ 24 (Hitungan atas Asumsi)");
  });
  test("kuota: 5,6% terpakai, semua dalam semenit 16.667 per detik = 167%, 630,8 per detik = 6,3 kali 100, 101 detik", () => {
    expect(idn((555.6 / kuota) * 100, 1)).toBe("5,6");
    expect(hasil("Kuota terpakai")).toBe("5,6%");
    expect(idn(N / 60, 0)).toBe("16.667");
    expect(idn((16667 / kuota) * 100, 0)).toBe("167");
    expect(hasil("Semua dalam satu menit")).toBe("16.667 per detik, yaitu 167% kuota");
    const puncak = (uang / 86400) * 10;
    expect(idn(puncak, 1)).toBe("75,2");
    expect(idn(75.2 + 555.6, 1)).toBe("630,8");
    expect(idn(630.8 / 100, 1)).toBe("6,3");
    expect(hasil("Uang dan pengumuman")).toBe("630,8 per detik, yaitu 6,3 kali 100");
    expect(idn(N / (kuota - 75.2), 0)).toBe("101");
    const t2 = norm(blok.Paham);
    expect(t2).toContain("650.000 ÷ 86.400 × 10 = 75,2 per detik pada puncak harian (faktor 10)");
    expect(t2).toContain("75,2 + 555,6 = 630,8 per detik selama 30 menit, dengan 555,6 = 1.000.000 ÷ 1.800 detik");
    expect(t2).toContain("1.000.000 ÷ (10.000 − 75,2) = 101 detik adalah yang tercepat");
    expect(t2).toContain("Hitungan itu mengandaikan uang tetap terlayani 75,2 per detik");
  });
  test("breaker 6 × 11 = 66 dan angka dasar lain tertulis sama di halaman dan naskah", () => {
    expect(6 * 11).toBe(66);
    expect(hasil("Breaker per proses")).toBe("66 kegagalan");
    expect(naskah).toContain("6 × 11 = 66 kegagalan sebelum semua breaker terbuka");
    expect(naskah).toContain("Pengumuman 30 menit butuh 167 pengirim serentak (bagian 3), yaitu 42 consumer dengan 4 pengirim, jadi topik `pengumuman.kirim` punya paling sedikit 42 partisi");
    expect(naskah).toContain("pengirim serentak L = λ × t = 96,3 × 0,3 = 29 saat makan siang, jadi 8 proses minimal dan 11 proses untuk terpakai paling tinggi ±70% (Asumsi desain)");
    expect(naskah).toContain("630,8 per detik selama 30 menit, 6,3 kali pemicu 100 per detik");
    expect(naskah).toContain("| Kuota penyedia push (tiruan lab) | N ÷ detik | 600.000 per menit = 10.000 per detik");
  });
  test("asal masukan: 650.000 = 600.000 + 50.000, 80% dalam 90 menit = 5.400 detik, faktor puncak 10", () => {
    expect(600000 + 50000).toBe(uang);
    expect(90 * 60).toBe(jendela);
    expect(naskah).toContain("Makan siang: 650.000 × 0,8 ÷ 5.400 = 96,3 = 722%");
    expect(norm(blok.Paham)).toContain("650.000 notifikasi uang per hari (600.000 transaksi uang dan 50.000 top-up bank, [[t5-prd]]), 80% di jendela makan siang 90 menit (5.400 detik), 4 pengirim per proses, 0,3 detik per pengiriman, dan puncak harian dengan faktor 10.");
  });
});

describe("5.15 widget, tebakan, dan urutan di halaman", () => {
  const w = widgetMentah as {
    skenario: { detikKirim: number; serentak: number; kuota: number; uang: number; partisiLab: number };
    pengirim: { id: string; jumlah: number; label: string }[];
    tebak: { jawaban: number; pilihan: string[] };
    label: { kelompok: { sebanyak: string; lab: string } };
  };
  test("skenario widget sama dengan angka halaman: 0,3 detik, 4 pengirim, kuota 10.000, uang 75,2, 6 partisi di lab", () => {
    expect(w.skenario).toMatchObject({ detikKirim: 0.3, serentak: 4, kuota: 10000, uang: 75.2, partisiLab: 6 });
    expect(norm(blok.Coba)).toContain("Tiap consumer menjalankan 4 pengirim serentak, dan satu pengiriman butuh 0,3 detik.");
  });
  test("ubah satu hal memakai pilihan pengirim 32, 167, dan 5.000 dan nama kelompok yang ada di widget", () => {
    for (const j of [32, 167, 5000]) expect(w.pengirim.some((p) => p.jumlah === j)).toBe(true);
    expect(w.label.kelompok.sebanyak).toContain("sebanyak consumer");
    expect(w.label.kelompok.lab).toContain("seperti di lab");
    const t = norm(blok.Coba);
    expect(t).toContain('Kelompok "seperti di lab" tetap lama, sedangkan kelompok "sebanyak consumer" turun ke sekitar 30 menit.');
    expect(t).toContain("geser pengirim dari 32 ke 167 dengan 1.000.000 perangkat");
    expect(t).toContain("Lalu geser ke 5.000 pengirim");
  });
  test("jawaban tebakan widget 3,5 jam tidak tertulis sebelum widget: tidak 3,5 jam, 12.500, 24 pengirim, atau menganggur di Mulai dan Coba", () => {
    expect(w.tebak.pilihan[w.tebak.jawaban]).toContain("3,5 jam");
    const sebelum = badan.slice(0, badan.indexOf("<FanOut />"));
    expect(badan.indexOf("<FanOut />")).toBeGreaterThan(0);
    expect(badan.match(/<FanOut \/>/g)!.length).toBe(1);
    for (const x of ["3,5 jam", "12.500", "24 pengirim", "menganggur", "tidak memegang partisi", "20,8 jam"]) expect(sebelum, x).not.toContain(x);
    expect(sebelum).not.toMatch(/\b(?:tepat|satu) consumer dalam (?:tiap|satu) (?:consumer )?(?:group|grup)/);
    expect(/partisi.{0,60}dibaca.{0,40}satu consumer/.test(sebelum.replace(/\n/g, " "))).toBe(false);
  });
  test("istilah consumer group dan consumer diberi arti sebelum widget, di Mulai", () => {
    const sebelum = badan.slice(0, badan.indexOf("<FanOut />"));
    expect(sebelum.indexOf("Consumer adalah proses yang membaca rekaman.")).toBeGreaterThan(0);
    expect(sebelum.indexOf("Consumer group adalah kumpulan consumer yang membaca satu topik bersama dan membagi partisinya.")).toBeGreaterThan(0);
    expect(sebelum.indexOf("Pengirim adalah satu pengiriman yang sedang berjalan ke penyedia push")).toBeGreaterThan(0);
    expect(badan.indexOf("Fan-out berarti satu kejadian menghasilkan pekerjaan untuk banyak penerima.")).toBeLessThan(badan.indexOf("Consumer adalah proses"));
  });
  test("widget tidak membawa angka 429 tinjauan lab dan tidak dijalankan ulang di halaman", () => {
    const j = JSON.stringify(widgetMentah);
    expect(j).not.toMatch(/34 sampai 37|3 sampai 7|5,9 sampai 8,9/);
    expect(naskah).toContain("| 5.15 | 4 | Fan-out: event streaming, partisi, backpressure + ADR 51 | Konsep + ADR | ★ | t5-fanout | W5-fanout |");
  });
});

describe("5.15 Rantai Inti dari rekaman", () => {
  test("diagram lolos skema, dua baris, tiga simpul akhir terbaca benar, angka dari rekaman", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.baris.length).toBe(2);
    expect(d.baris.map((b) => b.simpul.length)).toEqual([2, 3]);
    const teks = d.baris.flatMap((b) => b.simpul.map((s) => s.teks));
    expect(teks).toEqual(["1 baris pengumuman", "6 rekaman di 6 partisi", "3 consumer, 2 partisi tiap consumer", "2 consumer, 3 partisi tiap consumer", "Satu notifikasi berbeda tiap perangkat"]);
    expect(d.baris[0]!.sub).toBe("rekaman aliran.txt (bagian A)");
    expect(d.baris[1]!.sub).toBe("rekaman grup.txt (bagian A)");
    expect(d.sumber).toMatchObject({ jenis: "rekaman", teks: "Rekaman lab: aliran.txt dan grup.txt" });
    const a = rek.aliran!, g = rek.grup!.join("\n");
    expect(a.filter((b) => b.startsWith("Partition:")).length).toBe(6);
    expect(g).toContain("partisi per anggota: [2, 2, 2]");
    expect(g).toContain("partisi per anggota: [3, 3]");
    expect(d.baris[1]!.simpul[2]!.sub).toBe("10.281 perangkat");
    expect(g).toContain("perangkat dengan tepat satu notifikasi berbeda: 10281");
    expect(d.baris[0]!.simpul[0]!.sub).toBe("dan 1 baris outbox");
  });
  test("kalimat Inti pendek (≤ 150 karakter) dan tanpa angka dan tanpa jawaban tebakan", () => {
    const m = blok.Mulai.match(/## Inti\n\n([^\n]+)\n/)!;
    expect(m[1]!.length).toBeLessThanOrEqual(150);
    expect(m[1]).toBe("Pengumuman ditulis sebagai satu baris, dipecah per partisi topik, dan dikirim consumer; uang tetap lewat outbox.");
  });
});

describe("5.15 tautan, ADR, dan janji lintas halaman", () => {
  const rujukan = [...new Set([...badan.matchAll(/\[\[([a-z0-9-]+)\]\]/g)].map((m) => m[1]!))].filter((x) => x !== "berikutnya").sort();
  test("semua [[id]] ada di registry dan jenis atau ADR-nya sesuai kalimat", () => {
    for (const id of rujukan) expect(semua.some((h) => h.id === id), id).toBe(true);
    const adr: Record<string, number> = { "t4-breaker": 36, "t4-adr-45": 45, "t3-tim-infra": 32, "t3-at-least-once": 25, "t3-klaim-baris": 24, "t3-outbox": 23, "t5-pooler": 52, "t5-service": 50, "t5-adr-60": 60, "t5-read-replica": 46 };
    for (const [id, n] of Object.entries(adr)) expect(reg(id).adr, id).toContain(n);
    expect(reg("t5-m45").nomor).toBe("5.14");
    expect(reg("t5-m45").jenis).toBe("masalah");
    expect(reg("t5-m50").nomor).toBe("5.24");
    expect(reg("t5-prd").nomor).toBe("5.1");
    expect(reg("t5-partisi").nomor).toBe("5.11");
    expect(reg("t5-partisi").adr).toEqual([49]);
    expect(reg("t3-estimasi").judul).toMatch(/[Ee]stimasi/);
    expect(rujukan).toEqual(
      ["t3-at-least-once", "t3-estimasi", "t3-klaim-baris", "t3-outbox", "t3-tim-infra", "t4-adr-45", "t4-breaker", "t5-adr-60", "t5-m45", "t5-m50", "t5-partisi", "t5-pooler", "t5-prd", "t5-read-replica", "t5-service"].sort(),
    );
  });
  test("tiap 'ADR n' yang tertulis adalah ADR halaman yang ditautkan atau ADR 51 sendiri", () => {
    const boleh = new Set<number>([51]);
    for (const id of rujukan) for (const n of reg(id).adr ?? []) boleh.add(n);
    const ditulis = [...new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
    expect(ditulis).toEqual([36, 45, 51]);
    for (const n of ditulis) expect(boleh.has(n), `ADR ${n}`).toBe(true);
    expect(norm(blok.Paham)).toContain("Breaker dari ADR 36 ([[t4-breaker]])");
    expect(norm(blok.Putuskan)).toContain("mengerjakan butir event streaming ADR 45 ([[t4-adr-45]])");
  });
  test("janji 5.13, 5.5, 5.21, 5.30 ke halaman ini ditepati: HPA umur tertua, polling diganti push, relay dipantau, pemicu terus-menerus", () => {
    const m13 = baca("situs/src/content/docs/tahap-5/modul-ke-service.mdx");
    expect(m13).toContain("Metrik umur notifikasi untuk worker dibahas di [[t5-fanout]]");
    expect(norm(blok.Paham)).toContain("[[t5-service]] menunda satu hal ke halaman ini: HPA yang mengikuti umur notifikasi tertua, bukan CPU.");
    expect(norm(blok.Paham)).toContain("Adapter itu dan metrik umur tertua Tidak dijalankan di lab.");
    const r5 = baca("situs/src/content/docs/tahap-5/read-replica.mdx");
    expect(r5).toContain("Saat polling diganti push ([[t5-fanout]]).");
    expect(norm(blok.Paham)).toContain("Polling laporan yang diganti push ([[t5-read-replica]]) juga tidak diukur di halaman ini.");
    const b21 = baca("situs/src/content/docs/tahap-5/batch-tahan-crash.mdx");
    expect(b21).toContain("Event streaming dan relay yang harus dipantau ([[t5-fanout]])");
    expect(norm(blok.Putuskan)).toContain("Saat relay tertinggal: umur event tertua lebih dari 30 detik (Asumsi; pembanding 75,2 per detik uang).");
    const s30 = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
    expect(s30).toContain("| 2. Event streaming | 100 pesan per detik terus-menerus, atau dua consumer atau lebih bergantung pada urutan | 7,5 per detik (7,5%) | 75,2 per detik puncak (75%): belum terpenuhi oleh uang saja. Terpenuhi hanya selama pengumuman: 630,8 per detik selama 30 menit.");
    expect(s30).toContain("Naskah menulis bahwa [[t5-fanout]] tetap memasang Kafka, untuk event pembayaran dan pengumuman, dan menulis opsi rentang di PostgreSQL sebagai alternatif.");
    const prd = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
    expect(prd).toContain("Pengumuman ke 1.000.000 HP terkirim dalam 30 menit, dan 95% notifikasi uang di bawah 30 detik.");
    expect(prd).toContain("yang butuh 42 proses worker dalam 30 menit (Hitungan atas Asumsi)");
    expect(norm(blok.Putuskan)).toContain("PRD v5 meminta pengumuman ke semua HP dalam 30 menit, dan 95% notifikasi uang tetap di bawah 30 detik");
  });
  test("pilihan opsi B (rentang di PostgreSQL) ditulis jujur sebagai alternatif yang lebih sederhana bila hanya satu consumer group", () => {
    const t = norm(blok.Putuskan);
    expect(t).toContain("Opsi ini lebih sederhana selama hanya satu consumer group membaca.");
    expect(t).toContain("Tiga pembaca itu Tidak dijalankan, jadi alasan kedua lebih lemah daripada alasan pertama.");
    expect(t).toContain("Opsi B lebih sederhana.");
  });
});

describe("5.15 label sumber, kata, dan klaim berlingkup", () => {
  const t = norm(halaman);
  const hitung = (re: RegExp) => (t.match(re) ?? []).length;
  test("label ada: Rekaman lab, Hitungan, Asumsi, Simulasi, Tidak dijalankan, [perlu verifikasi] satu kali di baris Redpanda", () => {
    expect(hitung(/Rekaman lab/g)).toBeGreaterThanOrEqual(4);
    expect(hitung(/\[perlu verifikasi\]/g)).toBe(1);
    expect(norm(blok.Putuskan)).toContain("tidak ditinjau hukum [perlu verifikasi]");
    expect(norm(blok.Coba)).toContain("Simulasi adalah keluaran aturan yang ditulis di widget, bukan hasil sistem. Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini, dan Asumsi adalah angka pilihan penulis tanpa rekaman. Tidak dijalankan berarti dicek ke kode atau dokumentasi tanpa dijalankan.");
    expect(norm(blok.Mulai)).toContain("([Label sumber](/cara-pakai/#label-sumber))");
  });
  test("satu kata per konsep: perangkat, consumer, partisi; HP hanya di definisi dan kebutuhan; tanpa klien dan berkas dan antrean (queue)", () => {
    expect(hitung(/\bHP\b/g)).toBe(2);
    expect(t).not.toMatch(/\bklien\b/);
    expect(t).not.toMatch(/\bberkas\b/);
    expect(badan.replace(/`[^`]*`/g, "").replace(/\b(?:file|title|region)="[^"]*"/g, "").replace(/\(https?:[^)]*\)/g, "")).not.toMatch(/\b[Aa]ntrean\b/);
    expect(t).not.toMatch(/\bpelanggan\b|\bpembeli\b|\bpembayar\b/);
    expect(hitung(/layanan/g)).toBe(1);
    expect(t).toContain("penyedia push, yaitu layanan tiruan lokal yang menerima notifikasi");
    expect(t).not.toMatch(/\bsecret\b|\brahasia\b/);
  });
  test("klaim negatif berlingkup: tiap 'tidak membahas' menyebut halaman atau dokumen dan dicocokkan dengan baris riset", () => {
    const r183 = barisRiset("R5-183");
    const tab = (slot: string) => {
      const a = badan.indexOf(`<Fragment slot="${slot}">`);
      return norm(badan.slice(a, badan.indexOf("</Fragment>", a)));
    };
    // Node.js: dua halaman BullMQ
    expect(tab("t1")).toContain("Dua halaman itu tidak membahas partisi atau consumer group.");
    expect(r183).toContain("Tidak satu pun dari lima halaman itu membahas consumer group atau partisi");
    expect(r183).toContain("BullMQ");
    // Laravel: kata partition hanya untuk kunci tabel DynamoDB
    expect(tab("t2")).toContain("Halaman itu tidak membahas consumer group, dan kata partition di sana hanya muncul untuk kunci tabel DynamoDB.");
    // Django: tidak membahas batas laju atau partisi
    expect(tab("t3")).toContain("Halaman itu tidak membahas batas laju atau partisi.");
    expect(tab("t3")).toContain("tidak menyediakan mekanisme worker untuk menjalankan task, dan backend bawaannya hanya untuk pengembangan dan pengujian");
    expect(r183).toContain("does not provide a worker mechanism to run Tasks");
    expect(r183).toContain("for development and testing only");
    // Serverpod
    expect(tab("t4")).toContain("Halaman itu tidak membahas consumer group, partisi, atau batas laju.");
    expect(tab("t4")).toContain("panggilan terjadwal disimpan di tabel database `serverpod_future_call`");
    expect(r183).toContain("Scheduled calls are stored in the serverpod_future_call database table.");
    expect(r183).toContain("This page covers the one-off cases");
    // Supabase
    expect(tab("t5")).toContain("Kalimat itu berlingkup jendela tersebut, dan halaman itu tidak membahas partisi atau batas laju ke penyedia luar.");
    expect(r183).toContain("A Message is delivered exactly once to a consumer within a customizable visibility window.");
    expect(tab("t1")).toContain("rate limiter bersifat global");
    expect(r183).toContain("The rate limiter is global, so if you have for example 10 workers for one queue with the above settings, still only 10 jobs will be processed by second.");
    expect(tab("t1")).toContain("Job yang tertahan limiter tetap berstatus waiting.");
    expect(r183).toContain("Jobs that get rate limited will actually stay in the waiting state.");
    expect(tab("t2")).toContain("tetap menambah jumlah `attempts`");
    expect(r183).toContain("Releasing a rate limited job back onto the queue will still increment the job's total number of `attempts`.");
  });
  test("tab stack: enam label, Go dijalankan di lab, lima lainnya Tidak dijalankan dan dibuka 2026-11-04, kode Ilustrasi", () => {
    expect(badan).toContain('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    for (let i = 0; i < 6; i++) expect((badan.match(new RegExp(`<Fragment slot="t${i}">`, "g")) ?? []).length).toBe(1);
    expect(badan).not.toContain('<Fragment slot="t6">');
    for (const s of ["t1", "t2", "t3", "t4", "t5"]) {
      const a = badan.indexOf(`<Fragment slot="${s}">`);
      const isi = norm(badan.slice(a, badan.indexOf("</Fragment>", a)));
      expect(isi).toContain("*Tidak dijalankan. Dicek ke");
      expect(isi).toContain("dibuka 2026-11-04");
    }
    expect(norm(blok.Paham)).toContain("Tab Go dijalankan di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-11-04. Kode di tab lain adalah Ilustrasi.");
    expect(norm(blok.Paham)).toContain("*Dijalankan: lab t5-fanout dan api-t5, Kafka 4.3.2 (KRaft, satu broker), franz-go v1.22.2, PostgreSQL 17.11, dan Go 1.27.3");
    expect(readmeLab).toContain("| Kafka | `apache/kafka:4.3.2` |");
    expect(readmeLab).toContain("| franz-go | v1.22.2 (BSD-3-Clause) |");
    expect(readmeLab).toContain("| Go | 1.27.3 |");
    expect(readmeLab).toContain("| PostgreSQL | 17.11 (`postgres:17`) |");
  });
  test("klaim Kafka dibatasi: consumer group biasa saja, share group boleh lebih banyak, menganggur adalah penalaran", () => {
    const k = norm(blok.Paham);
    const r180 = barisRiset("R5-180");
    expect(k).toContain("Dokumentasi Kafka 4.3 menulis bahwa tiap partisi dibaca tepat satu consumer dalam tiap consumer group pada satu waktu");
    expect(r180).toContain("each of which is consumed by exactly one consumer within each subscribing consumer group at any given time");
    expect(k).toContain("Itu penalaran dari kalimat tadi, dan hanya berlaku untuk consumer group biasa.");
    expect(k).toContain("Share group, jenis grup lain di dokumen yang sama, boleh punya consumer lebih banyak dari partisi.");
    expect(r180).toContain("The number of consumers in a share group can exceed the number of partitions in a topic.");
    expect(r180).toContain("Dokumen tidak memakai kata consumer menganggur");
    expect(r180).toContain("A pull-based system has the nicer property that the consumer simply falls behind and catches up when it can.");
    expect(k).toContain("pada sistem tarik consumer cukup tertinggal dan menyusul saat ia sanggup, sedangkan pada sistem dorong consumer cenderung kewalahan");
    expect(k).toContain("Jarak ketertinggalan itu disebut lag consumer di halaman ini.");
    expect(r180).toContain("the consumer tends to be overwhelmed when its rate of consumption falls below the rate of production");
    expect(r180).toContain("Many systems claim to provide \"exactly-once\" delivery semantics, but it is important to read the fine print");
    expect(k).toContain("Dokumentasi Kafka menyuruh membaca tulisan kecil klaim \"exactly-once\".");
    expect(k).toContain("Di lab pengiriman ke penyedia push tidak menjadi tepat satu kali, karena rentang yang mati dikirim ulang.");
    expect(r180).toContain("For example if the key chosen was a user id then all data for a given user would be sent to the same partition.");
    expect(k).toContain("Dokumentasi Kafka memberi contoh kunci id user: semua data satu user dikirim ke partisi yang sama.");
  });
  test("franz-go: kasus langka, v1.22.1, issue 1484, diperbaiki v1.22.2 yang dipakai lab (terbit 2026-10-13)", () => {
    const r181 = barisRiset("R5-181");
    expect(r181).toContain("In a rare case, an idempotent producer could ack a record without writing it");
    expect(r181).toContain("Failing a sent batch now bumps the producer epoch, as the Java client does.");
    expect(r181).toContain("dibuat 2026-10-06, ditutup 2026-10-12");
    expect(r181).toContain("is reproduced with a fake broker, not on a real cluster");
    expect(norm(blok.Paham)).toContain("franz-go v1.22.1 pernah mengakui rekaman yang tidak ada di log dalam kasus langka (issue 1484 di repositori franz-go), dan v1.22.2 memperbaikinya");
    expect(norm(blok.Paham)).toContain("Lab memakai v1.22.2, dan consumer tetap idempoten.");
    expect(readmeLab).toContain("`proxy.golang.org`: terbit 2026-10-13");
  });
  test("opsi C, D, E: kutipan dokumentasi ada di baris riset dan kalimat tabel berlingkup", () => {
    const r182 = barisRiset("R5-182");
    expect(r182).toContain("the base quality of service offered by streams is 'at least once'");
    expect(r182).toContain("Core NATS provides best-effort, at-most-once message delivery");
    expect(r182).toContain("Redpanda Business Source License 1.1");
    expect(r182).toContain("tidak ditinjau hukum [perlu verifikasi]");
    expect(r182).toContain("If max_slot_wal_keep_size is -1 (the default), replication slots may retain an unlimited amount of WAL files.");
    expect(r182).toContain("custom.metrics.k8s.io, or external.metrics.k8s.io");
    expect(r182).toContain("Check with your metrics pipeline to see if there is a Kubernetes metrics adapter available.");
    const tabel = tabelDi(/^\| Opsi \| Cara kerja \|/);
    expect(tabel.length).toBe(8);
    for (const r of tabel) expect(r.length).toBe(6);
    expect(tabel.slice(2).map((r) => r[0])).toEqual(["A. Tambah worker saja", "B. Rentang perangkat di PostgreSQL", "C. NATS JetStream", "D. Redpanda", "E. CDC dengan Debezium", "F. Kafka dengan relay dari outbox"]);
    expect(tabel[4]![3]).toBe("Exactly once butuh ID pesan dan server yang mengingatnya; belum ada rekaman");
    expect(tabel[5]![3]).toContain("Lisensi BSL 1.1 melarang pemakaian untuk service streaming atau queue komersial bagi pihak ketiga");
    expect(tabel[6]![3]).toBe("Slot menahan WAL, dan `max_slot_wal_keep_size` bawaan -1 berarti tanpa batas");
    expect(tabel[7]![5]).toBe("Rekaman lab `aliran.txt`, `grup.txt`, `kuota.txt`, dan `antrean.txt`");
    expect(tabel[2]![5]).toBe("Rekaman lab `aliran.txt` bagian B dan `antrean.txt` bagian A");
  });
  test("tabel Sengaja belum punya tiga kolom di tiap baris dan enam butir", () => {
    const tabel = tabelDi(/^\| Yang ditunda \| Kenapa ditunda \| Muncul lagi di \|/);
    expect(tabel.length).toBe(8);
    for (const r of tabel) expect(r.length).toBe(3);
  });
  test("ADR: delapan aturan, tiga pre-mortem, enam kapan salah, nomor daftar berurutan", () => {
    const p = blok.Putuskan;
    const aturan = p.slice(p.indexOf("**Keputusan: opsi F.**"), p.indexOf("**Kenapa F, bukan A sampai E.**"));
    expect([...aturan.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const pm = p.slice(p.indexOf("**Pre-mortem.**"), p.indexOf("**Kapan keputusan ini salah.**"));
    expect([...pm.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]))).toEqual([1, 2, 3]);
    const salah = p.slice(p.indexOf("**Kapan keputusan ini salah.**"), p.indexOf("**Yang akan merevisinya.**"));
    expect((salah.match(/^- /gm) ?? []).length).toBe(6);
    expect(p).toContain("**Status:** diterima sesudah M45");
    expect(p).toContain("Naskah tidak menulis tanggal ADR.");
    const dasar = p.slice(p.indexOf("**Kenapa F, bukan A sampai E.**"), p.indexOf("**Pre-mortem.**"));
    expect([...dasar.matchAll(/^- \*\*([A-E]) ditolak/gm)].map((m) => m[1])).toEqual(["A", "B", "C", "D", "E"]);
  });
  test("Cek diri: lima soal dengan jawaban, checklist enam butir, bacaan lanjut sembilan tautan", () => {
    expect((blok.Kunci.match(/^\*\*\d\.\*\* /gm) ?? []).length).toBe(5);
    expect((blok.Kunci.match(/<summary>Jawaban<\/summary>/g) ?? []).length).toBe(5);
    expect((blok.Kunci.match(/^- \[ \] /gm) ?? []).length).toBe(6);
    const lanjut = blok.Kunci.slice(blok.Kunci.indexOf("### Bacaan lanjut"));
    expect([...lanjut.matchAll(/^- \[[^\]]+\]\((https:\/\/[^)]+)\)$/gm)].length).toBe(9);
  });
  test("tautan luar tiap klaim ada di baris riset atau halaman tetangga", () => {
    const peta: [string, string, string][] = [
      ["https://github.com/apache/kafka/blob/4.3/docs/design/design.md", "R5-180", "docs/design/design.md"],
      ["https://github.com/twmb/franz-go/blob/master/CHANGELOG.md", "R5-181", "CHANGELOG.md"],
      ["https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/", "R5-182", "kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/"],
      ["https://www.postgresql.org/docs/17/runtime-config-replication.html", "R5-182", "postgresql.org/docs/17/runtime-config-replication.html"],
      ["https://laravel.com/docs/13.x/queues", "R5-183", "laravel/docs cabang 13.x"],
      ["https://docs.djangoproject.com/en/6.0/topics/tasks/", "R5-183", "docs.djangoproject.com/en/6.0/topics/tasks/"],
      ["https://docs.serverpod.dev/concepts/scheduling/future-calls", "R5-183", "docs.serverpod.dev/concepts/scheduling/future-calls"],
      ["https://supabase.com/docs/guides/queues", "R5-183", "supabase.com/docs/guides/queues"],
      ["https://firebase.google.com/docs/cloud-messaging/throttling-and-quotas", "R5-288", "firebase.google.com/docs/cloud-messaging/throttling-and-quotas"],
    ];
    const ditulis = new Set([...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]));
    expect([...ditulis].sort()).toEqual(peta.map((p) => p[0]).sort());
    for (const [url, id, kunci] of peta) {
      expect(ditulis.has(url), url).toBe(true);
      expect(barisRiset(id), `${id} memuat ${kunci}`).toContain(kunci);
    }
  });
  test("tanggal akses: 2026-11-04 dan 2026-11-02 (kuota FCM) dan tidak ada tanggal lain", () => {
    const tanggal = [...new Set([...badan.matchAll(/\b2026-\d\d-\d\d\b/g)].map((m) => m[0]))].sort();
    expect(tanggal).toEqual(["2026-11-02", "2026-11-04"]);
    expect(norm(blok.Paham)).toContain("firebase.google.com/docs/cloud-messaging/throttling-and-quotas), dibuka 2026-11-02)");
    expect(barisRiset("R5-288")).toContain("dibuka 2026-11-02");
    expect((badan.match(/2026-11-04/g) ?? []).length).toBeGreaterThanOrEqual(12);
  });
});

describe("5.15 baris riset R5-180 sampai R5-184", () => {
  test("lima baris berurutan sesudah R5-174 dan sebelum R5-195, lima kolom, tanpa ID ganda di berkas", () => {
    const ids = riset5.split("\n").filter((l) => /^\| R5-\d+ \|/.test(l)).map((l) => Number(l.match(/^\| R5-(\d+) \|/)![1]));
    expect(new Set(ids).size).toBe(ids.length);
    const i180 = ids.indexOf(180);
    expect(ids.slice(i180, i180 + 5)).toEqual([180, 181, 182, 183, 184]);
    expect(ids[i180 - 1]).toBe(174);
    expect(ids[i180 + 5]).toBe(195);
    for (const n of [180, 181, 182, 183, 184]) expect(barisRiset(`R5-${n}`).split("|").length).toBe(7);
    // baris tetangga milik halaman lain tidak dikunci: hanya urutan naik di dalam rentang
    expect(ids.filter((x) => x >= 180 && x <= 184)).toEqual([180, 181, 182, 183, 184]);
  });
  test("tiap baris memuat tanggal buka 2026-11-04 dan hitungan R5-184 cocok dengan rumus", () => {
    for (const n of [180, 181, 182, 183, 184]) expect(barisRiset(`R5-${n}`)).toContain("2026-11-04");
    const r = barisRiset("R5-184");
    for (const x of ["96,296", "28,89", "ceil(28,89 ÷ 4) = 8", "ceil(28,89 ÷ 0,7 ÷ 4) = 11", "555,6", "166,7", "ceil(167 ÷ 4) = 42", "556,7", "1.786 detik = 29,8 menit", "75.000 detik = 20,8 jam", "12.500 detik = 3,5 jam", "630,8", "101 detik", "6 × 11 = 66", "166 MB", "300 MB"]) expect(r, x).toContain(x);
    expect((0.3 * 1_000_000) / 168).toBeCloseTo(1785.7, 1);
  });
  test("naskah ADR 51 dan tabel beban memuat angka yang dikutip baris riset R5-184 (bukan ditulis ulang)", () => {
    for (const x of ["167 pengirim", "42 consumer", "paling sedikit 42 partisi", "555,6 per detik"]) expect(naskah, x).toContain(x);
  });
});

describe("5.15 halaman istilah dan glosarium", () => {
  const glos = baca("situs/src/content/docs/alat/glosarium.mdx");
  for (const [slug, istilah, kunci] of [
    ["consumer-group", "Consumer group", "R5-180"],
    ["backpressure", "Backpressure", "R5-180"],
  ] as const) {
    test(`istilah ${istilah}: skema lolos, baris glosarium menaut ke 5.15, sumber ada di baris riset`, () => {
      const d = HalamanIstilah.parse(JSON.parse(baca(`situs/data/halaman-istilah/${slug}.json`)));
      expect(d.istilah).toBe(istilah);
      expect(glos).toMatch(new RegExp(`^\\| \\*\\*${istilah}\\*\\* \\|.*\\[\\[t5-fanout\\]\\] \\|$`, "m"));
      for (const s of d.sumber ?? []) if ("riset" in s && s.riset) expect(riset5, s.riset).toContain(`| ${s.riset} |`);
      expect((d.sumber ?? []).some((s) => "riset" in s && s.riset === kunci)).toBe(true);
      expect(d.cerita![0]!.rujukan).toBe("t5-fanout");
      const glosBaris = glos.split("\n").find((l) => l.startsWith(`| **${istilah}** |`))!;
      const definisi = glosBaris.split("|")[2]!.trim();
      expect(definisi.length).toBeGreaterThan(40);
    });
  }
  test("consumer group: definisi glosarium dan halaman istilah menyebut tepat satu consumer per partisi per grup, dari dokumentasi", () => {
    expect(glos).toContain("| **Consumer group** | Kumpulan consumer Kafka yang membaca satu topik bersama, dengan tiap partisi dibaca tepat satu consumer dalam grup itu pada satu waktu. | [[t5-fanout]] |");
    expect(glos).toContain("| **Partisi topik** | Log berurutan di dalam satu topik Kafka, dibaca tepat satu consumer dalam tiap consumer group pada satu waktu. | [[t5-fanout]] |");
    expect(glos).toContain("| **Backpressure** | Pembatasan laju oleh pihak yang lebih lambat terhadap pihak di hulunya, supaya queue di tengah tidak tumbuh tanpa batas dan pihak hilir tidak kewalahan. | [[t5-fanout]] |");
    expect(glos).toContain("| **Fan-out** | Menyebarkan satu kejadian ke banyak penerima, mis. satu promo ditulis ke feed setiap pengikut. | [[D4b]], [[t5-fanout]] |");
  });
});

// ---- lapis 2: kunci per baris dan sidik ----
const potongan = (): string[] => {
  const t = badan.replace(/\r/g, "");
  return t.split(/\n\s*\n/).map(norm).filter(Boolean);
};
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "paling", "sama", "tepat", "sampai", "tetap", "lebih", "jadi", "karena", "boleh", "harus", "bisa", "mungkin", "selalu", "kecuali", "saja"];
const sidikKata = (s: string): Record<string, number> => Object.fromEntries(KATA.map((k) => [k, (s.toLowerCase().match(new RegExp(`\\b${k}\\b`, "g")) ?? []).length]));
const nilaiString = (x: unknown): string[] =>
  Array.isArray(x) ? x.flatMap(nilaiString) : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => [k, ...nilaiString(v)]) : typeof x === "string" ? [x] : typeof x === "number" ? [String(x)] : [];
const istilahTeks = ["consumer-group", "backpressure"].map((s) => baca(`situs/data/halaman-istilah/${s}.json`)).join("\n");
const glosFanOut = baca("situs/src/content/docs/alat/glosarium.mdx").split("\n").filter((l) => /\[\[t5-fanout\]\]/.test(l)).join("\n");
const sidikSekarang = {
  halaman: sidikKata(badan),
  rantai: sidikKata(nilaiString(rantaiMentah).join("\n")),
  istilah: sidikKata(istilahTeks),
  struktur: badan.split("\n").filter((l) => /^(#{2,4} |<Blok|<Fragment|<TabSet|<Snippet|<FanOut|<Rantai|<details|\| ---)/.test(l)).map((l) => l.replace(/ title="[^"]*"/, "").slice(0, 60)).join(" ¦ "),
  angka: (badan.replace(/\(https?:[^)]*\)/g, "").match(/\d+(?:[.,]\d+)*/g) ?? []).join(" "),
  tabel: badan.split("\n").filter((l) => l.startsWith("|")).map(hash),
  riset: [180, 181, 182, 183, 184].map((n) => hash(barisRiset(`R5-${n}`))),
  berkas: {
    frontmatter: hash(frontmatter),
    rantai: hash(nilaiString(rantaiMentah).join("\n")),
    istilah: hash(istilahTeks),
    glosarium: hash(glosFanOut),
  },
};
const sekarang = { halaman: potongan() };
if (process.env.PERBARUI_KUNCI === "1") {
  const isi =
    `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat fan-out.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "fan-out.halaman.nilai.ts"), isi);
}
describe.skipIf(tanpaKunci)("5.15 kunci per baris", () => {
  test("setiap potongan halaman sama dengan yang terkunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman.length).toBe(KALIMAT_TERKUNCI.length);
    sekarang.halaman.forEach((p, i) => expect(p, `potongan ${i}`).toBe(KALIMAT_TERKUNCI[i]));
  });
});
describe.skipIf(tanpaSidik)("5.15 sidik kata, struktur, angka, tabel, dan baris riset", () => {
  test("hitungan kata penentu, struktur, angka, tabel, riset, dan berkas sama dengan sidik", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.istilah).toEqual(SIDIK.istilah);
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.tabel).toEqual(SIDIK.tabel);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
