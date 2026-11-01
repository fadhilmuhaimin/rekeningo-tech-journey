// Penjaga sumber widget peta zona (W5-zona): menurunkan nilai dari ERD5, rekaman lab api-t5, naskah Tahap 5, dan registry, lalu
// membandingkannya dengan t5-zona.json. Satu nilai yang diubah di salah satu sisi membuat tes gagal (uji mutasi di badan PR).
// Baris sumber tiap kalimat yang dikunci literal ada di komentar di dekatnya.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import mentah from "../../../data/widget/t5-zona.json";
import cerita from "../../../data/cerita.json";
import erd from "../../../data/erd/service-tahap-5.json";
import { DataZona } from "./skema";
import { zonaUang } from "./logika";

const d = DataZona.parse(mentah);
const AKAR = path.resolve(__dirname, "../../../..");
const baca = (rel: string) => fs.readFileSync(path.join(AKAR, rel), "utf8");
const NASKAH = baca("plan/CERITA-TAHAP-5.md");
const SKEMA = baca("labs/api-t5/output/skema.txt");

/** Baris tabel Markdown satu bagian naskah: sel dipecah, pipe di dalam sel tidak dipakai di tabel ini. */
const tabelNaskah = (judulKolomPertama: string): string[][] => {
  const baris = NASKAH.split("\n");
  const i = baris.findIndex((b) => b.startsWith(`| ${judulKolomPertama} |`));
  expect(i, `tabel naskah yang diawali ${judulKolomPertama} ada`).toBeGreaterThan(-1);
  const hasil: string[][] = [];
  for (let j = i + 2; j < baris.length && baris[j]!.startsWith("|"); j++) hasil.push(baris[j]!.split("|").slice(1, -1).map((s) => s.trim()));
  return hasil;
};
const KATA_STATUS: Record<string, "terjaga" | "rusak" | "tidak"> = { Terjaga: "terjaga", Rusak: "rusak", "Tidak berlaku": "tidak" };
const urai = (sel: string) => {
  const m = /^(Terjaga|Rusak|Tidak berlaku)(?:: (.+))?$/.exec(sel);
  if (!m) throw new Error(`sel naskah tak dikenal: ${sel}`);
  // akhiran "(M45)" atau "(Hitungan; M45)" adalah rujukan masalah, bukan bagian alasan
  const alasan = m[2]?.replace(/\s*\((?:Hitungan; )?M\d+\)$/, "");
  const kode = /\((?:Hitungan; )?(M\d+)\)$/.exec(m[2] ?? "")?.[1];
  return { s: KATA_STATUS[m[1]!]!, alasan, kode };
};

describe("sumber: enam service dan schema dari ERD5 dan rekaman api-t5", () => {
  it("enam service, urutan, schema, dan daftar tabel sama dengan situs/data/erd/service-tahap-5.json (sumber: layanan.sql api-t5)", () => {
    expect(d.service.map((s) => s.id)).toEqual(erd.modul.map((m) => m.nama));
    for (const [i, m] of erd.modul.entries()) {
      expect(d.service[i]!.schema).toBe(m.schema);
      expect([...d.service[i]!.tabel].sort()).toEqual([...m.tabel].sort());
    }
    expect(d.service.reduce((n, s) => n + s.tabel.length, 0)).toBe(30);
    expect(erd.lintas).toEqual([]);
  });
  it("skema.txt bagian E mencatat jumlah dan daftar tabel per schema yang sama, dan 30 tabel", () => {
    const e = SKEMA.slice(SKEMA.indexOf("# --- E."), SKEMA.indexOf("# --- F."));
    const baris = [...e.matchAll(/^ (t5_[a-z]+)\s+\|\s+(\d+)\s+\|\s+(.+)$/gm)].map((m) => ({ schema: m[1]!, tabel: Number(m[2]), daftar: m[3]!.split(", ").sort() }));
    expect(baris).toHaveLength(6);
    for (const s of d.service) {
      const b = baris.find((x) => x.schema === s.schema);
      expect(b, s.schema).toBeDefined();
      expect(b!.tabel).toBe(s.tabel.length);
      expect(b!.daftar).toEqual([...s.tabel].sort());
    }
    expect(SKEMA).toContain("# Pembagian sama dengan tabel naskah: ledger 9, akun 5, pembayaran 6, merchant 6, notifikasi 2, cicilan 2 = 30.");
    expect(SKEMA).toContain("30 tabel, partisi posting, enam schema service, role per service");
  });
  it("skema.txt bagian F: role notifikasi ditolak INSERT di posting (42501); role lain tanpa hak di schema service lain, kecuali ledger atas kolom id, tingkat, status akun", () => {
    const f = SKEMA.slice(SKEMA.indexOf("# --- F."), SKEMA.indexOf("# --- G."));
    expect(f).toContain("t5_notifikasi: INSERT INTO t5_ledger.posting (jurnal_id, buku_id, jumlah) VALUES (1, 1, 1)\n  ERROR:  permission denied for schema t5_ledger   -- SQLSTATE 42501");
    expect(f).toContain("hanya t5_ledger yang punya, yaitu USAGE schema akun dan SELECT atas\n# kolom id, tingkat, dan status tabel akun (kontrak kolom); role lain tidak punya hak apa pun di schema service lain: ya");
    const ledger = d.zona.flatMap((z) => z.komponen).find((k) => k.service === "ledger")!;
    expect(ledger.catatan).toContain("role notifikasi yang mencoba INSERT ke posting ditolak (42501)");
    const akun = d.zona.flatMap((z) => z.komponen).find((k) => k.service === "akun")!;
    expect(akun.catatan).toContain("Ledger hanya boleh membaca kolom id, tingkat, dan status akun");
  });
});

describe("sumber: delapan tim dari naskah", () => {
  it("nama, orang, pemimpin, dan memegang sama dengan tabel Delapan tim naskah, urutan sama", () => {
    const baris = tabelNaskah("Tim");
    expect(baris).toHaveLength(8);
    expect(d.tim.map((t) => [t.nama, String(t.orang), t.pemimpin, t.memegang])).toEqual(baris.map((b) => [b[0], b[1], b[2]!.replace(/\s*\(.*\)$/, ""), b[3]]));
  });
  it("jumlahnya 28 orang menurut kalimat naskah: 4 × 6 + 2 × 2", () => {
    expect(NASKAH).toContain("Totalnya 4 × 6 + 2 × 2 = 28 orang.");
    expect(d.tim.reduce((n, t) => n + t.orang, 0)).toBe(28);
  });
  it("tim di zona: tiap zona menyebut tim yang memegang komponennya menurut kolom Memegang (ledger dan cicilan satu tim)", () => {
    const tim = (id: string) => d.tim.find((t) => t.id === id)!;
    const dari = (s: string) => tim(d.service.find((x) => x.id === s)!.tim).nama;
    expect(["ledger", "akun", "pembayaran", "merchant", "notifikasi", "cicilan"].map(dari)).toEqual(["Ledger dan Tabungan", "Akun", "Pembayaran", "Merchant", "Notifikasi", "Ledger dan Tabungan"]);
    for (const [s, kata] of [["ledger", "ledger"], ["cicilan", "cicilan"], ["akun", "akun"], ["pembayaran", "gateway"], ["merchant", "merchant"], ["notifikasi", "pengiriman push"]] as const) {
      expect(tim(d.service.find((x) => x.id === s)!.tim).memegang, s).toContain(kata);
    }
    const zonaTim = Object.fromEntries(d.zona.map((z) => [z.id, z.tim]));
    expect(zonaTim.client).toEqual(["akun", "merchant"]);
    expect(zonaTim.edge).toEqual(["platform", "merchant", "security"]);
    expect(zonaTim.service).toEqual(["pembayaran", "ledger-tabungan", "merchant", "akun", "notifikasi"]);
    expect(zonaTim.data).toEqual(["ledger-tabungan", "platform", "sre"]);
    expect(zonaTim.operasi).toEqual(["platform", "sre", "security"]);
    expect(tim("platform").memegang).toContain("pooler");
    expect(tim("sre").memegang).toContain("latihan failover");
  });
});

describe("sumber: delapan kejadian dan tiga hal dari naskah bagian 3", () => {
  const baris = tabelNaskah("Kejadian");
  it("naskah memuat delapan baris dan penegasan M42 dan M47 sebagai penalaran", () => {
    expect(baris).toHaveLength(8);
    expect(NASKAH).toContain("Kalimat di tabel ini tentang M42 dan M47 adalah penalaran dari dokumentasi");
  });
  it("kejadian, status tiga hal, alasan Rusak, dan kode masalah sama dengan tabel naskah", () => {
    expect(d.kejadian.map((k) => k.label)).toEqual(baris.map((b) => b[0]));
    for (const [i, b] of baris.entries()) {
      const k = d.kejadian[i]!;
      const sel = b.slice(1).map(urai);
      expect(k.sel.map((c) => c.s), k.label).toEqual(sel.map((c) => c.s));
      // hanya sel Rusak yang membawa alasan di widget; catatan pada sel Terjaga di naskah tidak dipakai
      expect(k.sel.map((c) => c.alasan), k.label).toEqual(sel.map((c) => (c.s === "rusak" ? c.alasan : undefined)));
      expect(sel.map((c) => c.kode).filter(Boolean), k.label).toEqual([k.masalah]);
    }
  });
  it("tiga hal: kalimat widget adalah awal butir 1 sampai 3 naskah", () => {
    const awal = NASKAH.indexOf("Tiga hal harus selalu benar:");
    const butir = [...NASKAH.slice(awal, awal + 2000).matchAll(/^([123])\. (.+)$/gm)].map((m) => m[2]!);
    expect(butir).toHaveLength(3);
    for (const [i, t] of d.label.tiga.entries()) expect(butir[i]!.startsWith(t.replace(/\.$/, "")), t).toBe(true);
    for (const k of ["1. Uang hanya lewat ledger", "2. Keputusan dari sumber yang sama", "3. Benar bila diulang atau dihentikan"]) expect(NASKAH).toContain(`| ${k} |`);
  });
  it("kejadian berawal di zona yang dipilih penulis: 0, 0, 3, 4, 1 untuk client, edge, service, data, operasi", () => {
    const per = (z: string) => d.kejadian.filter((k) => k.zona === z).map((k) => k.masalah);
    expect(per("client")).toEqual([]);
    expect(per("edge")).toEqual([]);
    expect(per("service")).toEqual(["M45", "M47", "M48"]);
    expect(per("data")).toEqual(["M40", "M41", "M42", "M43"]);
    expect(per("operasi")).toEqual(["M49"]);
  });
  it("label sumber: M47 Tidak dijalankan (penalaran naskah), sisanya Asumsi; tak ada label turunan", () => {
    expect(Object.fromEntries(d.kejadian.map((k) => [k.masalah, k.sumber]))).toEqual({ M40: "asumsi", M41: "asumsi", M42: "asumsi", M43: "asumsi", M45: "asumsi", M47: "tidak-dijalankan", M48: "asumsi", M49: "asumsi" });
    expect(Object.keys(d.label.sumberJenis).sort()).toEqual(["asumsi", "tidak-dijalankan"]);
    expect(d.label.sumberJenis).toEqual({ asumsi: "Asumsi", "tidak-dijalankan": "Tidak dijalankan" });
    expect(d.sumber.jenis).toBe("asumsi");
    expect(d.label.sumber).toBe("Asumsi");
  });
});

describe("sumber: registry dan diagram arsitektur Tahap 5", () => {
  type H = { id: string; tahap?: number | string; judul: string; jenis: string };
  const halaman = cerita.halaman as unknown as H[];
  const ada = (id: string) => halaman.find((h) => h.id === id);
  it("semua halaman yang dirujuk ada di registry Tahap 5, tanpa rujukan ganda dalam satu zona", () => {
    for (const z of d.zona) {
      expect(new Set(z.halaman).size, z.id).toBe(z.halaman.length);
      for (const id of z.halaman) expect(ada(id)?.tahap, id).toBe(5);
    }
    for (const k of d.kejadian) expect(ada(k.halaman)?.tahap, k.halaman).toBe(5);
  });
  it("halaman masalah tiap kejadian berjudul M-nomornya, dan nomor masalah tidak ganda", () => {
    for (const k of d.kejadian) {
      expect(ada(k.halaman)!.judul.startsWith(`${k.masalah}:`), k.halaman).toBe(true);
      expect(ada(k.halaman)!.jenis).toBe("masalah");
    }
    expect(new Set(d.kejadian.map((k) => k.masalah)).size).toBe(d.kejadian.length);
  });
  it("halaman penjelas tiap zona menurut peta halaman naskah: client 5.7 dan 5.14, edge 5.24 dan 5.25, service 5.13, 5.19, 5.21, data 5.5, 5.9, 5.11, 5.17, operasi 5.23, 5.27, 5.26", () => {
    const nomor = (id: string): string => {
      const t5 = halaman.filter((h) => h.tahap === 5 && !/^T\d$/.test(h.id) && !(h as { lebur_ke?: string }).lebur_ke);
      return `5.${t5.findIndex((h) => h.id === id) + 1}`;
    };
    const per = Object.fromEntries(d.zona.map((z) => [z.id, z.halaman.map(nomor)]));
    expect(per).toEqual({ client: ["5.7", "5.14"], edge: ["5.24", "5.25"], service: ["5.13", "5.19", "5.21"], data: ["5.5", "5.9", "5.11", "5.17"], operasi: ["5.23", "5.27", "5.26"] });
    expect(NASKAH).toContain("| 5.2 | 2, 3 | Dari fitur ke pekerjaan teknis v5 dan inti: salinan boleh banyak, uang bergerak di satu tempat | Fitur → teknis | ★ | api-t5 | W5-zona |");
  });
  it("komponen yang juga ada di diagram arsitektur Tahap 5 memakai label registry, dan registry menyebut enam service", () => {
    const tahap5 = (cerita.tahap as unknown as { no: number; arsitektur?: { baris: { label: string; catatan?: string }[][] } }[]).find((t) => t.no === 5)!;
    const kotak = tahap5.arsitektur!.baris.flat();
    const labels = d.zona.flatMap((z) => z.komponen.map((k) => k.label));
    for (const l of ["App Flutter", "Pintu di tepi", "Primary + pooler"]) {
      expect(kotak.map((k) => k.label), l).toContain(l);
      expect(labels, l).toContain(l);
    }
    expect(kotak.find((k) => k.label === "Enam service")!.catatan).toContain("Ledger, akun, pembayaran, merchant, notifikasi, dan cicilan");
    expect(kotak.find((k) => k.label === "Enam service")!.catatan).toContain("ledger tetap satu-satunya tempat uang bergerak");
    expect(d.service).toHaveLength(6);
  });
});

describe("sumber: tebakan dan teks widget", () => {
  it("pilihan benar menyebut jumlah zona uang dalam kata ('dua zona'), pilihan lain tidak", () => {
    const kata = ({ 1: "satu", 2: "dua", 3: "tiga" } as Record<number, string>)[zonaUang(d).length]!;
    const cocok = d.tebak.pilihan.flatMap((p, i) => (p.includes(`${kata} zona`) ? [i] : []));
    expect(cocok).toEqual([d.tebak.jawaban]);
    const betul = d.tebak.pilihan[d.tebak.jawaban]!;
    for (const id of zonaUang(d)) expect(betul).toContain(d.zona.find((z) => z.id === id)!.label);
  });
  it("alasan jawaban memuat kalimat naskah tentang salinan: replica, ringkasan, cache, dan event hanya untuk dilihat", () => {
    expect(NASKAH).toContain("Replica, ringkasan, cache, dan event hanya untuk dilihat, dan jarak ketertinggalannya diketahui dan disebut");
    expect(d.tebak.alasan).toContain("Replica, ringkasan, cache, dan event hanya untuk dilihat");
    expect(d.tebak.alasan).toContain("Posting dibuat service ledger dan disimpan di satu primary, jadi uang bergerak di dua zona.");
  });
  it("komponen uang: ledger di zona service dan primary di zona data, tidak ada lain", () => {
    const uang = d.zona.flatMap((z) => z.komponen.filter((k) => k.jenis === "uang").map((k) => `${z.id}:${k.label}`));
    expect(uang).toEqual(["service:Ledger", "data:Primary + pooler"]);
    expect(d.zona.flatMap((z) => z.komponen).filter((k) => k.jenis === "salinan").map((k) => k.label)).toEqual(["Standby sinkron", "Replica laporan", "Ringkasan harian merchant", "Cache Redis", "Event streaming"]);
  });
  it("angka di teks: PRD v5 menulis tertinggal paling lama 5 detik dan RTO 15 menit (sumber: naskah bagian 1)", () => {
    expect(NASKAH).toContain("Data yang dilayani laporan tertinggal paling lama 5 detik dari pembayaran yang tercatat di ledger (Asumsi produk)");
    expect(NASKAH).toContain("RTO 15 menit");
    const replika = d.zona.flatMap((z) => z.komponen).find((k) => k.label === "Replica laporan")!;
    expect(replika.catatan).toContain("target tertinggal paling lama 5 detik (PRD v5, Asumsi produk)");
    const failover = d.zona.flatMap((z) => z.komponen).find((k) => k.label === "Latihan failover")!;
    expect(failover.catatan).toContain("target pulih 15 menit (Asumsi produk)");
    expect(NASKAH).toContain("SRE melatih failover tiap bulan dan mencatat waktunya terhadap RTO 15 menit");
  });
  it("laporan dibaca 30 detik (naskah bagian 2) dan token dari jawaban tulis (rekaman t5-replika baca.txt bagian B)", () => {
    expect(NASKAH).toContain("Layar laporan di app Merchant dan dasbor web, diperbarui tiap 30 detik");
    expect(d.zona.flatMap((z) => z.komponen).find((k) => k.label === "Dasbor web merchant")!.catatan).toBe("Memuat laporan tiap 30 detik.");
    expect(baca("labs/t5-replika/output/baca.txt")).toContain("token LSN dari jawaban tulis, replika dipakai hanya bila sudah sampai posisi itu");
    expect(d.zona.flatMap((z) => z.komponen).find((k) => k.label === "App Flutter")!.catatan).toContain("token dari jawaban tulis");
  });
  it("istilah per konsep: tanpa 'layanan', tanpa ID riset, tanpa label turunan 'Hitungan', kalimat narasi paling banyak 25 kata", () => {
    const semua: string[] = [];
    const kumpul = (x: unknown) => { if (typeof x === "string") semua.push(x); else if (Array.isArray(x)) x.forEach(kumpul); else if (x && typeof x === "object") Object.values(x).forEach(kumpul); };
    kumpul(mentah);
    const teks = semua.join("\n");
    expect(teks).not.toMatch(/\blayanan\b/i);
    expect(teks).not.toMatch(/\bR\d-\d+\b/);
    expect(teks).not.toMatch(/Hitungan/);
    expect(teks).not.toMatch(/\bsecret\b|\brahasia\b/i);
    for (const t of semua.filter((s) => s.length > 40)) for (const k of t.split(/(?<=\.)\s+/)) expect(k.split(/\s+/).length, k).toBeLessThanOrEqual(25);
  });
});

describe("sumber: kalimat komponen dan zona dikunci ke sumbernya", () => {
  // Korpus sumber: naskah, rekaman skema.txt, dan teks catatan diagram arsitektur Tahap 5 di registry.
  const tahap5 = (cerita.tahap as unknown as { no: number; arsitektur: { baris: { label: string; catatan?: string }[][] } }[]).find((t) => t.no === 5)!;
  const DIAGRAM = tahap5.arsitektur.baris.flat().map((k) => `${k.label}: ${k.catatan ?? ""}`).join("\n");
  const JUDUL_T3 = (cerita.halaman as unknown as { tahap?: number; judul: string }[]).filter((h) => h.tahap === 3).map((h) => h.judul).join("\n");
  const TABEL = (s: string) => d.service.find((x) => x.id === s)!.tabel;
  const korpus = (nama: string) => ({ naskah: NASKAH, skema: SKEMA, diagram: DIAGRAM, judulT3: JUDUL_T3 })[nama]!;
  // [label komponen, catatan literal, [[korpus, fragmen sumber], ...]]
  const KUNCI: [string, string, [string, string][]][] = [
    ["App Flutter", "Mengirim token dari jawaban tulis saat membaca riwayat, supaya tidak membaca salinan yang tertinggal.", [["diagram", "App Flutter: Mengirim token LSN di bacaan sesudah menulis"]]],
    ["Dasbor web merchant", "Memuat laporan tiap 30 detik.", [["naskah", "Layar laporan di app Merchant dan dasbor web, diperbarui tiap 30 detik"]]],
    ["POS mitra", "Milik pihak luar; membuat QR dan membaca status pembayaran lewat API publik.", [["naskah", "POS milik mitra membuat QR dan membaca status pembayaran lewat API publik"]]],
    ["Pintu di tepi", "Gateway API dengan WAF, kuota, dan tanda tangan per mitra POS.", [["diagram", "Pintu di tepi: Gateway API dengan WAF, kuota, dan tanda tangan per mitra POS"]]],
    ["Ledger", "Menulis jurnal dan posting; jurnal seimbang dan posting tidak diubah. Di rekaman lab, role notifikasi yang mencoba INSERT ke posting ditolak (42501).", [["naskah", "jurnal seimbang, posting tidak diubah, dan satu primary menerima semua tulisan"]]],
    ["Akun", "Akun, sesi, dan verifikasi. Ledger hanya boleh membaca kolom id, tingkat, dan status akun.", [["skema", "kolom id, tingkat, dan status tabel akun (kontrak kolom)"]]],
    ["Pembayaran", "Top-up bank, kartu, dan sakelar; meminta jurnal ke ledger dengan Idempotency-Key.", [["naskah", "Service `pembayaran` meminta jurnal lewat API ledger dengan Idempotency-Key"]]],
    ["Merchant", "Produk, promo, QR, ringkasan harian, dan mitra POS; laporan dibaca dari replica.", [["naskah", "Laporan dibaca dari replica, ringkasan harian per merchant"]]],
    ["Notifikasi", "Perangkat dan pengumuman; mengirim push dari outbox yang ditulis bersama jurnal.", [["naskah", "Notifikasi lewat outbox dalam transaction yang sama dengan jurnal"]]],
    ["Cicilan", "Jadwal dan angsuran; batch harian meminta jurnal ke ledger.", [["naskah", "Service cicilan dan batch harian tahan crash"], ["naskah", "Service lain membaca, atau meminta posting dengan Idempotency-Key"]]],
    ["Primary + pooler", "Satu primary menerima semua tulisan; posting dipartisi per bulan; PgBouncer di depannya.", [["naskah", "satu primary menerima semua tulisan"], ["skema", "posting dipartisi per bulan"], ["diagram", "PgBouncer mode transaction di depannya"]]],
    ["Standby sinkron", "Commit pembayaran menunggu satu standby sinkron, supaya jawaban sukses tidak hilang saat primary mati.", [["naskah", "jadi commit menunggu satu standby menerima dan menulis rekaman commit ke penyimpanan tahan lama"], ["naskah", "transaksi yang sudah dijawab sukses ikut hilang"]]],
    ["Replica laporan", "Asinkron, untuk laporan merchant dan bacaan berat; target tertinggal paling lama 5 detik (PRD v5, Asumsi produk).", [["naskah", "Replica laporan (ADR 46) terpisah dan asinkron"], ["diagram", "Replica asinkron untuk laporan merchant dan bacaan berat"]]],
    ["Ringkasan harian merchant", "Ringkasan per merchant per hari untuk laporan; bukan sumber saldo.", [["naskah", "Replica, ringkasan, cache, dan event hanya untuk dilihat"], ["naskah", "`ringkasan_merchant_harian`"]]],
    ["Cache Redis", "Sudah ada sejak Tahap 3; hanya untuk dilihat.", [["judulT3", "Redis"], ["diagram", "worker, Redis, penyimpanan objek, dan KMS tidak digambar"]]],
    ["Event streaming", "Pengumuman dan event pembayaran lewat relay dari outbox; penerima idempoten.", [["diagram", "Pengumuman dan event pembayaran lewat relay dari outbox; consumer idempoten"]]],
    ["Kubernetes dan GitOps", "Cluster dan pipeline rilis yang dipegang tim Platform.", [["naskah", "| Platform | 4 | Bayu | cluster, pooler, pipeline, observability |"]]],
    ["Sakelar dan kill switch", "Mematikan fitur tanpa rilis; nilainya harus sama di semua pod.", [["naskah", "Rusak: pod lain memakai nilai lama (M49)"]]],
    ["OpenTelemetry dan SLO", "Metrik, trace, dan target ketersediaan (SLO) yang dipakai tim SRE.", [["naskah", "| SRE | 2 | Dewi | SLO, giliran jaga, latihan failover |"]]],
    ["Latihan failover", "SRE melatih failover tiap bulan dan mencatat waktunya terhadap target pulih 15 menit (Asumsi produk).", [["naskah", "SRE melatih failover tiap bulan dan mencatat waktunya terhadap RTO 15 menit"]]],
  ];
  const komponen = d.zona.flatMap((z) => z.komponen);
  it("dua puluh komponen: label dan catatan sama dengan kunci, dan tiap kalimat punya jangkar di sumbernya", () => {
    expect(komponen.map((k) => k.label)).toEqual(KUNCI.map((k) => k[0]));
    for (const [label, catatan, jangkar] of KUNCI) {
      expect(komponen.find((k) => k.label === label)!.catatan, label).toBe(catatan);
      for (const [nama, fragmen] of jangkar) expect(korpus(nama), `${label}: ${fragmen}`).toContain(fragmen);
    }
  });
  it("label service di zona service adalah nama service di ERD5 (huruf pertama besar), dan tabel di catatan ada di service itu", () => {
    const service = d.zona.find((z) => z.id === "service")!.komponen;
    expect(service.map((k) => k.label)).toEqual(erd.modul.map((m) => m.nama[0]!.toUpperCase() + m.nama.slice(1)));
    for (const t of ["sesi", "verifikasi"]) expect(TABEL("akun")).toContain(t);
    for (const t of ["topup_bank", "kartu", "sakelar"]) expect(TABEL("pembayaran")).toContain(t);
    for (const t of ["produk", "promo", "qr", "ringkasan_merchant_harian", "mitra_pos"]) expect(TABEL("merchant")).toContain(t);
    for (const t of ["perangkat", "pengumuman"]) expect(TABEL("notifikasi")).toContain(t);
    for (const t of ["jadwal_cicilan", "angsuran"]) expect(TABEL("cicilan")).toContain(t);
    expect(TABEL("ledger")).toEqual(expect.arrayContaining(["jurnal", "posting", "outbox"]));
  });
  it("ringkasan lima zona: kalimat literal, zona service berjangkar naskah dan rekaman", () => {
    expect(d.zona.map((z) => [z.id, z.label, z.ringkas])).toEqual([
      ["client", "client", "Tempat orang melihat dan meminta: app, dasbor, dan kasir mitra."],
      ["edge", "edge", "Pintu semua permintaan dari luar cluster."],
      ["service", "service", "Enam service dengan tiga instance tiap service; tiap service punya schema dan role sendiri."],
      ["data", "data", "Tempat data disimpan dan disalin: satu primary, replica, ringkasan, cache, dan event."],
      ["operasi", "operasi", "Yang menjalankan dan mengawasi: cluster, rilis, SLO, dan latihan."],
    ]);
    expect(NASKAH).toContain("Enam service di Kubernetes, tiga instance tiap service");
    expect(SKEMA).toContain("enam schema service, role per service");
    expect(NASKAH).toContain("lima lapisan (client, edge, service, data, operasi)");
  });
  it("kata status sama dengan naskah (Terjaga, Rusak, Tidak berlaku) dan 'belum dibuka' untuk sel kosong", () => {
    expect(d.label.status).toEqual({ terjaga: "Terjaga", rusak: "Rusak", tidak: "Tidak berlaku", belum: "belum dibuka" });
    for (const k of Object.keys(KATA_STATUS)) expect(NASKAH).toContain(`| ${k}`.replace("| Tidak berlaku", "| Tidak berlaku"));
  });
  it("teks sumber menyebut bagian E dan F skema.txt yang memang memuat pembagian service dan hak role, dan label Asumsi", () => {
    const t = d.sumber.teks;
    expect(d.sumber.jenis).toBe("asumsi");
    expect(t).toContain("(Asumsi)");
    const m = /\(skema\.txt, bagian ([A-Z]) dan ([A-Z])\)/.exec(t);
    expect(m, "rujukan bagian skema.txt").not.toBeNull();
    const judul = (b: string) => new RegExp(`^# --- ${b}\\. (.+) ---$`, "m").exec(SKEMA)?.[1] ?? "";
    expect(judul(m![1]!)).toContain("dipecah ke enam schema service");
    expect(judul(m![2]!)).toContain("Hak per role");
    expect(t).toContain("lab api-t5");
  });
});
