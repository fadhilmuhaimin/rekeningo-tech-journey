// Penjaga halaman 4.19: angka, nama, versi, ID, nomor halaman, tautan, label sumber, rentang Snippet, klaim negatif berlingkup,
// Hitungan, diagram Rantai, data Tebak, halaman istilah, baris riset, dan kartu Cek diri di qr-pembayaran.mdx diturunkan dari
// rekaman labs/t4-qr (crc.txt, statis.txt, dinamis.txt, lapor.txt), kode labs/api-t4 (service, handler, qrpayload), README lab,
// naskah Tahap 4, halaman tetangga, registry, dan baris riset, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.18): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (berkas nilai)
// mengunci SETIAP baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak
// menangkap SALAHNYA kalimat. Elemen non-prosa (frontmatter, diagram, data Tebak, halaman istilah, baris riset) dikunci dengan
// sidik jari dan nilai terkunci di berkas nilai.
import { createHash } from "node:crypto";
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t4-qr-inti.json";
import tebakMentah from "../../data/widget/t4-qr-tebak.json";
import { DataTebak } from "../widgets/tebak/skema";
import { DataRantai } from "./rantai";
import { cekTemplat, daftarBlok } from "./blok";
import { HalamanIstilah } from "./istilah";
import { KALIMAT_TERKUNCI, PROFIL_BARIS, RISET_TERKUNCI, SIDIK } from "./qr-pembayaran.halaman.nilai";
import { profil } from "./qr-pembayaran.halaman.profil";

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

const BERKAS = "situs/src/content/docs/tahap-4/qr-pembayaran.mdx";
const mdx = baca(BERKAS);
const frontmatter = mdx.split(/^---\n/m)[1]!;
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const crc = baca("labs/t4-qr/output/crc.txt");
const statis = baca("labs/t4-qr/output/statis.txt");
const dinamis = baca("labs/t4-qr/output/dinamis.txt");
const lapor = baca("labs/t4-qr/output/lapor.txt");
const readme = baca("labs/t4-qr/README.md");
const payloadGo = baca("labs/api-t4/internal/qrpayload/qrpayload.go");
const qrGo = baca("labs/api-t4/internal/service/qr.go");
const aturanGo = baca("labs/api-t4/internal/service/t4_aturan.go");
const batasGo = baca("labs/api-t4/internal/service/batas_endpoint.go");
const handlerQr = baca("labs/api-t4/internal/handler/handler_qr.go");
const testingApi = baca("labs/api-t4/output/testing.txt");
const prd = baca("situs/src/content/docs/tahap-4/prd-v4.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const glosariumJson = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; d: string; b: string | null; n: string | null; u: string | null; s: string; h: string | null }[];
const istilahMentah = baca("situs/data/halaman-istilah/qr-statis-dan-dinamis.json");
const istilah = HalamanIstilah.parse(JSON.parse(istilahMentah));
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const diagram = DataRantai.parse(diagramMentah);
const tebak = DataTebak.parse(tebakMentah);

interface H { bagian?: number; id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[] }
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
const angka = (s: string): number => Number(s.replace(/\./g, ""));
const rib = (n: number): string => n.toLocaleString("id-ID");
const barisRiset = (id: string): string => {
  const m = riset.split("\n").find((b) => b.startsWith(`| ${id} |`));
  expect(m, `baris riset ${id}`).toBeDefined();
  return m!;
};

// ---- rekaman: bagian dan nomor baris Snippet --------------------------------------------------------------------------
const bagian = (isi: string) => {
  const baris = isi.split("\n");
  const nomor = (ok: (b: string) => boolean, dariIdx = 1): number => {
    const i = baris.findIndex((b, n) => n + 1 >= dariIdx && ok(b));
    expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1; // nomor baris mulai dari 1, seperti Snippet
  };
  const teks = (a: number, b: number) => baris.slice(a - 1, b).join("\n");
  return { baris, nomor, teks };
};
const C = bagian(crc), S = bagian(statis), D = bagian(dinamis), L = bagian(lapor), P = bagian(payloadGo), Q = bagian(qrGo);
const bagianDari = (r: ReturnType<typeof bagian>, huruf: string, berikut: string | null): string => {
  const a = r.nomor((b) => b.startsWith(`# --- ${huruf}. `));
  const z = berikut ? r.nomor((b) => b.startsWith(`# --- ${berikut}. `)) - 1 : r.baris.length;
  return r.teks(a, z);
};
const cB = bagianDari(C, "B", "C"), cA = bagianDari(C, "A", "B");
const sC = bagianDari(S, "C", "D"), sD = bagianDari(S, "D", "E");
const dA = bagianDari(D, "A", "B"), dB = bagianDari(D, "B", "C"), dC = bagianDari(D, "C", "D"), dD = bagianDari(D, "D", null);
const lB = bagianDari(L, "B", "C"), lC = bagianDari(L, "C", "D"), lD = bagianDari(L, "D", "E"), lF = bagianDari(L, "F", null);

const tag = [...badan.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);
const berkasSnippet = tag.filter((t) => /lines="/.test(t)).map((t) => [t.match(/file="([^"]+)"/)![1]!, t.match(/lines="([^"]+)"/)![1]!] as const);

// ---- nilai dari rekaman -----------------------------------------------------------------------------------------------
const NOMINAL_DIN = angka(cocok(dA, /"jenis": "dinamis", "nominal": (\d+)\}/)[1]!);
const DETIK_BERLAKU = Number(cocok(dA, /berlaku_sampai dikurangi jam server: (\d+) detik/)[1]!);
const JAM_UJI = [...dD.matchAll(/^# jam server: dibuat \+ (\d+) detik$/gm)].map((m) => Number(m[1]));
const NOMINAL_422 = [...dC.matchAll(/-d '\{"nominal": (\d+)\}'\nHTTP\/1\.1 422/g)].map((m) => Number(m[1]));
const NAMA_PAYLOAD = cocok(sC, /nama di payload '([^']+)'; kota di payload '([^']+)'/);
const NAMA_SERVER = cocok(sC, /server: GET \/qr\/\{id\} -> 200; nama '([^']+)'; kota '([^']+)'/);
const BATAS_STATIS = angka(cocok(sD, /-d '\{"nominal": (\d+)\}'\nHTTP\/1\.1 201 Created/)[1]!);
const SALDO_EKO = angka(cocok(sD, /\n Eko\s+\| (\d+)\n/)[1]!);
const SALDO_EKO_AKHIR = Number(cocok(sD, /\{"id":10203,"saldo":(\d+),/)[1]!);
const SALDO_BU_MARNI = angka(cocok(lC, /Toko Sumber Rejeki \| (\d+)\n/)[1]!);
const RETRY = Number(cocok(lD, /Retry-After: (\d+)/)[1]!);
const BEKU_D = [...lD.matchAll(/^ (\d+) \| Merchant \d \| dibekukan$/gm)].map((m) => Number(m[1]));
const KONST_STATIS = angka(cocok(aturanGo, /MaksQRStatis\s+int64 = ([\d_]+)/)[1]!.replace(/_/g, "."));
const KONST_TINGKAT = angka(cocok(aturanGo, /BatasSaldoTerverifikasi int64 = ([\d_]+)/)[1]!.replace(/_/g, "."));
const MENIT_DIN = Number(cocok(aturanGo, /UmurQRDinamis\s+= (\d+) \* time\.Minute/)[1]!);
const TOKEN_LAPOR = Number(cocok(qrGo, /AmbangEndpoint\["qr-lapor"\] = \[2\]float64\{(\d+), (\d+)\.0 \/ 3600\}/)[1]!);
const ISI_ULANG_LAPOR = Number(cocok(qrGo, /AmbangEndpoint\["qr-lapor"\] = \[2\]float64\{(\d+), (\d+)\.0 \/ 3600\}/)[2]!);
const TOKEN_DAFTAR = Number(cocok(batasGo, /"daftar":\s+\{(\d+), /)[1]!);
const MERCHANT_LUAR = Number(cocok(prd, /Merchant luar \(Bu Marni dan ±(\d+) lainnya, Asumsi\)/)[1]!);
const WARUNG = Number(cocok(naskah, /±(\d+) warung Lestari, kini juga menerima QR/)[1]!);
const adr40 = naskah.split("\n").find((b) => b.startsWith("| 40 |"))!;
const OPSI = cocok(adr40.split(" | ")[2]!, /^([^(]*?) \(.*?\); ([^(]*?) \(.*?\); ([^(]*?) \(/).slice(1).map((x) => x.toLowerCase());
const KATA: Record<number, string> = { 1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima" };

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.19 ada, konsep, jalur inti, prasyarat 4.18, lab t4-qr, ADR 40, peran mobile, security, dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-qr")).toMatchObject({ ada: true, nomor: "4.19", jenis: "konsep", bagian: 4, inti: true, prasyarat: ["t4-m35"], lab: ["t4-qr"], tahap: 4, peran: ["mobile", "security", "backend"], adr: [40] });
    expect(dari("t4-m35").nomor).toBe("4.18");
    expect(naskah).toContain("| 4.19 | 4 | QR pembayaran: statis, dinamis, konfirmasi + ADR 40 | Konsep + ADR | ★ | t4-qr | tebak |");
    expect(frontmatter.split("\n")).toContain(`title: "4.19 ${dari("t4-qr").judul}"`);
    expect(dari("t4-qr").judul).toBe("QR pembayaran: statis, dinamis, konfirmasi + ADR 40");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-m35\]\] · Jalur inti<\/p>/);
    expect(dari("t4-qr").menit).toBe(Number(m[1]) + Number(m[2]));
  });
  test("description frontmatter dibangun dari batas statis di kode dan jumlah opsi yang ditolak di naskah", () => {
    expect(frontmatter.split("\n")).toContain(`description: Rekeningo memakai QR dinamis yang sekali bayar dan QR statis berbatas Rp${rib(KONST_STATIS)} dengan nama merchant dari server. ADR 40 menimbang ${KATA[OPSI.length]} cara lain dan menulis kapan pilihan ini salah.`);
    expect(frontmatter.split("\n").filter((b) => b.trim())).toHaveLength(2);
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(badan.match(/Baca (\d+) menit/)![1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka; satu Rantai ringkas, satu Tebak client:visible, satu TabSet enam stack; impor tetap", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan).toContain("<Rantai data={intiDiagram} ringkas />");
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/<Tebak /g)).toHaveLength(1);
    expect(badan).toContain("<Tebak client:visible data={dataTebak} />");
    expect(badan.match(/<TabSet /g)).toHaveLength(1);
    expect(badan).toContain('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    expect([...badan.matchAll(/<Fragment slot="(t\d)">/g)].map((m) => m[1])).toEqual(["t0", "t1", "t2", "t3", "t4", "t5"]);
    expect(badan.match(/<noscript>/g)).toHaveLength(1);
    expect(badan.match(/<Snippet /g)).toHaveLength(16);
    expect(berkasSnippet).toHaveLength(13);
    expect([...badan.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => `${m[1]} ${m[2]}`)).toEqual([
      "Blok ../../../components/Blok.astro", "Rantai ../../../components/Rantai.astro", "Snippet ../../../components/Snippet.astro",
      "TabSet ../../../components/TabSet.astro", "Tebak ../../../widgets/tebak/Tebak.tsx", "intiDiagram ../../../../data/diagram/t4-qr-inti.json",
      "dataTebak ../../../../data/widget/t4-qr-tebak.json",
    ]);
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan; nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["berikutnya", "t4-audit", "t4-m35", "t4-prd", "t4-skema"]);
    const sesuai: [string, string, string][] = [
      ["t4-prd", "4.1", "PRD v4"], ["t4-skema", "4.5", "Skema data"], ["t4-m35", "4.18", "M35: QR di kasir Bu Marni"],
      ["t4-audit", "4.25", "Keamanan 9: Back office, audit log berantai, agen baca-saja + ADR 43"],
    ];
    for (const [idh, nomor, judul] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(judul), `${idh} di registry`).toBe(true);
      expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`^\\| ${nomor.replace(".", "\\.")} \\| \\w+ \\| ${judul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
    }
    expect(cara).toContain("Label sumber");
    harus("[Label sumber](/cara-pakai/#label-sumber)");
    expect(badan.match(/\[Label sumber\]/g)).toHaveLength(1);
  });
  test("tidak ada ID riset, nomor keputusan, nomor PR, emoji, atau nama skema nasional di teks tampil", () => {
    expect(badan).not.toMatch(/\bR\d-\d+/);
    expect(badan).not.toMatch(/\bkeputusan \d{3,4}\b/i);
    expect(badan).not.toMatch(/\bPR #?\d+|#\d{3}\b/);
    expect(badan).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(badan).not.toMatch(/QRIS|GPN|BI-FAST/);
    expect(badan).not.toMatch(/\b[A-F]\d\b(?!\.)/); // label rekaman seperti C2 atau E1 ditolak: pakai kata "bagian C"
    expect(badan).not.toMatch(/\d B\b/); // satuan "B" ditulis "byte"
    expect(hitung(badan, "ADR 40")).toBeGreaterThanOrEqual(2);
    expect([...new Set(badan.match(/ADR \d+/g))]).toEqual(["ADR 40"]);
  });
});

describe("naskah: ADR 40, peta halaman, dan angka beban", () => {
  test("baris ADR 40 di naskah memuat aturan yang ditulis halaman: tag, 5 menit, sekali bayar, Rp200.000, layar konfirmasi, pembekuan", () => {
    expect(adr40).toContain("QR dinamis (tag 01 = 12)");
    expect(adr40).toContain("berlaku 5 menit (Asumsi)");
    expect(adr40).toContain("sekali bayar (id QR unik di jurnal)");
    expect(adr40).toContain("QR statis (tag 01 = 11) tetap untuk toko kecil, dengan batas Rp200.000 per transaksi (Asumsi produk)");
    expect(adr40).toContain("layar konfirmasi yang menampilkan nama dan kota merchant terverifikasi");
    expect(adr40).toContain("Laporan QR palsu dari app membekukan merchant lebih dulu, tim risk memeriksa kemudian");
    expect(adr40).toContain("bobot pelapor adalah keputusan produk");
    expect(adr40).toContain("Merchant diverifikasi tim risk sebelum aktif");
    expect(adr40).toContain("batas harian atau per QR untuk pembeli belum ada di PRD v4");
    expect(adr40).toContain("Perilaku pembeli tidak terukur di lab (Asumsi)");
    harus("Hanya merchant terverifikasi dan aktif yang bisa menerbitkan atau menerima QR");
    harus("Bobot pelapor adalah keputusan produk yang belum final.");
    harus("Batas harian atau per QR belum ada di PRD v4.");
  });
  test("opsi yang ditolak ADR 40 sama dengan kolom opsi naskah, dalam urutan A, B, C; opsi D adalah pilihan", () => {
    const opsi = OPSI;
    expect(opsi).toEqual(["statis saja", "dinamis saja", "qr statis bertanda tangan"]);
    const kepala = cocok(badan, /^\| \| (A\. [^|]+) \| (B\. [^|]+) \| (C\. [^|]+) \| (D\. [^|]+) \|$/m);
    expect(kepala[1]!.toLowerCase()).toContain(opsi[0]);
    expect(kepala[2]!.toLowerCase()).toContain(opsi[1]);
    expect(kepala[3]!.toLowerCase()).toContain(opsi[2]);
    expect(kepala[4]).toContain("Dinamis untuk merchant dengan layar, statis berbatas, nama dari server");
    harus("**Keputusan: opsi D.** Enam aturan:");
    expect(naskah).toContain("Statis saja (ditolak: M35)");
    expect(naskah).toContain("tanda tangan di dalam QR tidak mencegah stiker QR sah milik orang lain ditempel");
  });
  test("angka beban dan merchant: 6,94 transaksi uang per detik dan ±400 merchant luar (Asumsi naskah), ±60 warung Lestari; jumlah ±460 adalah Hitungan", () => {
    expect(naskah).toContain("6,94 transaksi uang per detik");
    expect(MERCHANT_LUAR + WARUNG).toBe(460);
    harus("6,94 transaksi uang per detik di puncak (Asumsi naskah)");
    harus(`±${MERCHANT_LUAR} (Asumsi naskah)`);
    harus(`±${MERCHANT_LUAR + WARUNG} merchant: ±${MERCHANT_LUAR} merchant luar dan ±${WARUNG} warung Lestari`);
    harus(`${((TOKEN_LAPOR * TOKEN_DAFTAR * 100) / (MERCHANT_LUAR + WARUNG)).toFixed(1).replace(".", ",")}% dari ±${MERCHANT_LUAR + WARUNG} merchant`);
  });
  test("M35 di 4.18 dan ADR 40 di naskah menamai Toko Andalan dan Bu Marni seperti yang halaman tulis", () => {
    expect(naskah).toContain("Bu Marni mengeluh");
    expect(NAMA_PAYLOAD[1]).toBe("Toko Sumber Rejeki");
    expect(NAMA_SERVER[1]).toBe("Toko Andalan");
  });
});

describe("rekaman crc.txt: tag 01, payload dinamis, CRC tanpa key", () => {
  test("payload dinamis: tag 01 = 12, tag 54 = nominal, tag 63 di ujung; payload statis tag 01 = 11; kode memakai 11 dan 12", () => {
    expect(cB).toMatch(/\n 01\s+\| 02\s+\| 11\s+\| 11 statis, 12 dinamis/);
    expect(cB).toMatch(/\n 01\s+\| 02\s+\| 12\s+\| 11 statis, 12 dinamis/);
    expect(angka(cocok(cB, /\n 54\s+\| 05\s+\| (\d+)\s+\| nominal/)[1]!)).toBe(NOMINAL_DIN);
    expect(cB).toMatch(/\n 63\s+\| 04\s+\| \w{4}\s+\| CRC-16 atas semua yang di depannya termasuk "6304"\n\(10 rows\)/);
    expect(payloadGo).toContain('"11" (QR statis) atau "12" (QR dinamis)');
    harus("Tag 01 bernilai 11 untuk QR statis dan 12 untuk QR dinamis.");
    harus("payload dinamis memuat nominal di tag 54");
    harus("| Nominal | Diisi pembeli");
    harus(`| QR statis (tag 01 = 11) | QR dinamis (tag 01 = 12) |`);
  });
  test("CRC dihitung ulang tanpa key lolos, tanpa CRC baru ditolak, dan sama dengan Python; parameter dari bagian A", () => {
    const d = bagianDari(C, "D", "E");
    expect(d).toContain("teks diganti tanpa menghitung CRC baru: galat crc: CRC tidak cocok");
    expect(d).toContain("teks diganti lalu CRC dihitung ulang dengan binascii.crc_hqx (tanpa alat lab): lolos, hasilnya sama persis dengan keluaran qrlab ganti");
    expect(d).toContain("# CRC tidak memakai kunci rahasia, jadi mendeteksi salah baca, bukan penggantian.");
    expect(cA).toContain("CRC('123456789') Go 29B1, Python 29B1");
    expect(cA).toContain("[perlu verifikasi di PDF EMVCo]");
    expect(hitung(badan, "[perlu verifikasi di PDF EMVCo]")).toBe(1);
    harus("`crc.txt` bagian D, id di payload diganti dan CRC dihitung ulang tanpa key, dan pemindai lab menerimanya.");
    expect(cocok(crc, /^# PostgreSQL ([\d.]+) .*· (go[\d.]+) · pgx (v[\d.]+)/m).slice(1)).toEqual(["17.11", "go1.27.1", "v5.11.0"]);
    harus("*Dijalankan: lab api-t4 dan t4-qr, PostgreSQL 17.11, Go 1.27.1 (rekaman `crc.txt` bagian A).*");
    harus("fungsi 14 baris");
    const awal = P.nomor((b) => b.startsWith("func CRC16("));
    const akhir = P.nomor((b) => b === "}", awal);
    expect(akhir - awal + 1).toBe(14);
  });
});

describe("rekaman statis.txt dan dinamis.txt: nama dari server, batas, sekali pakai, nominal terikat, kedaluwarsa", () => {
  test("payload dipalsukan membawa nama dan kota Bu Marni, server menjawab Toko Andalan dan Surabaya; server tidak membaca payload", () => {
    expect(NAMA_PAYLOAD.slice(1)).toEqual(["Toko Sumber Rejeki", "Jakarta"]);
    expect(NAMA_SERVER.slice(1)).toEqual(["Toko Andalan", "Surabaya"]);
    expect(sC).toContain("nama dan kota di payload sama dengan jawaban server: tidak");
    expect(S.baris.some((b) => b.startsWith("# Yang terpakai server hanya id QR; nilai tag lain di payload (nama, kota, nominal pada QR dinamis) tidak diperiksa server."))).toBe(true);
    harus("payload yang dipalsukan membawa nama Toko Sumber Rejeki, tetapi server menjawab nama Toko Andalan, merchant terverifikasi pemilik id itu");
    expect(tebak.pilihan.filter((p) => p.benar)[0]!.teks).toContain("nama Toko Andalan");
    expect(tebak.adegan.join(" ")).toContain("nama Toko Sumber Rejeki dan kota Jakarta");
    expect(tebak.pilihan[1]!.alasan).toContain("Toko Andalan dan Surabaya");
    expect(tebak.pilihan[2]!.alasan).toContain("(`statis.txt` bagian E)");
  });
  test("QR dinamis: sekali pakai (201 lalu 409 dua kali, lalu 404), nominal terikat (422 untuk 1, 34999, 35001), body kosong memotong nominal", () => {
    expect(hitung(dB, "HTTP/1.1 201 Created")).toBe(1);
    expect(hitung(dB, "HTTP/1.1 409 Conflict")).toBe(2);
    expect(dB).toContain("/problems/qr-terpakai");
    expect(dB).toMatch(/GET '\/qr\/<qr dinamis 1>'[\s\S]*HTTP\/1\.1 404 Not Found/);
    expect(NOMINAL_422).toEqual([1, 34999, 35001]);
    expect(NOMINAL_DIN).toBe(35000);
    expect(NOMINAL_422.map((n) => n - NOMINAL_DIN)).toEqual([-34999, -1, 1]);
    expect(dC).toContain(`"pesan":"QR dinamis terikat ke nominal ${NOMINAL_DIN}"`);
    expect(dC).toMatch(/-d '\{\}'\nHTTP\/1\.1 201 Created[\s\S]*"nominal":35000/);
    harus("Rp1, Rp34.999, dan Rp35.001 dijawab 422 (`dinamis.txt` bagian C)");
    harus("body selain Rp35.000 dijawab 422, dan body kosong memotong Rp35.000");
    harus("Id QR dinamis yang sudah dibayar sekali dijawab 409 untuk pembayar mana pun.");
    harus("tetapi server tetap memotong Rp35.000 (`dinamis.txt` bagian C)");
  });
  test("kedaluwarsa: berlaku_sampai = jam server + 300 detik; 299 terbayar (201), 300 dan 301 dijawab 404 dan 410; 300 detik = 5 menit di konstanta kode", () => {
    expect(DETIK_BERLAKU).toBe(300);
    expect(MENIT_DIN * 60).toBe(DETIK_BERLAKU);
    expect(JAM_UJI).toEqual([299, 300, 301]);
    const bag = dD.split(/^# jam server: /m).slice(1);
    expect(bag[0]).toMatch(/dibuat \+ 299 detik[\s\S]*HTTP\/1\.1 200 OK[\s\S]*HTTP\/1\.1 201 Created/);
    for (const i of [1, 2]) {
      expect(bag[i]).toMatch(/GET [\s\S]*HTTP\/1\.1 404 Not Found/);
      expect(bag[i]).toMatch(/POST [\s\S]*HTTP\/1\.1 410 Gone[\s\S]*"title":"QR ini sudah kedaluwarsa"/);
    }
    expect(dD).toContain('"detail":"Minta merchant menampilkan QR yang baru."');
    expect(dD).toContain("# Pada 300 detik (tepat batas) QR sudah kedaluwarsa; pada 299 detik masih terbayar. Penandaan kedaluwarsa ditulis saat ada pembayaran yang ditolak.");
    expect(qrGo).toContain("!s.kini().Before(*q.BerlakuSampai)");
    harus("terbayar pada 299 detik, dijawab 410 pada 300 dan 301 detik");
    harus("Kode memakai `Before`, jadi tepat pada 300 detik QR sudah kedaluwarsa");
    harus("masa berlaku 5 menit");
    harus("Jawaban 410 menyuruh pembeli meminta merchant menampilkan QR yang baru (`dinamis.txt` bagian D).");
  });
  test("QR statis: batas Rp200.000 per pembayaran (201 di batas, 422 untuk 200001, 0, -1, dan body kosong); dua pembayaran berturut-turut; saldo Eko", () => {
    expect(BATAS_STATIS).toBe(200000);
    expect(KONST_STATIS).toBe(BATAS_STATIS);
    expect(sD).toContain("-d '{\"nominal\": 200001}'\nHTTP/1.1 422");
    expect(sD).toContain("-d '{\"nominal\": 0}'\nHTTP/1.1 422");
    expect(sD).toContain("-d '{\"nominal\": -1}'\nHTTP/1.1 422");
    expect(sD).toContain("-d '{}'\nHTTP/1.1 422");
    expect(hitung(sD, `-d '{"nominal": ${BATAS_STATIS}}'\nHTTP/1.1 201 Created`)).toBe(2);
    expect(SALDO_EKO).toBe(500000);
    expect(SALDO_EKO - 2 * BATAS_STATIS).toBe(SALDO_EKO_AKHIR);
    expect(SALDO_EKO_AKHIR).toBe(100000);
    expect(sD).toContain("# Batas berlaku per pembayaran, bukan per QR atau per hari: dua pembayaran Rp200.000 berturut-turut sama-sama diterima.");
    expect(sD).toContain("# Kerugian pembeli yang tidak memeriksa tujuan paling banyak Rp200.000 untuk satu pembayaran; batas itu tidak mencegah pembayaran berikutnya.");
    harus(`(Hitungan: ${rib(SALDO_EKO)} − 2 × ${rib(BATAS_STATIS)} = ${rib(SALDO_EKO_AKHIR)}; \`statis.txt\` bagian D)`);
    harus(`saldonya turun dari Rp${rib(SALDO_EKO)} menjadi Rp${rib(SALDO_EKO_AKHIR)}`);
    harus("Rp200.001, Rp0, nominal negatif, dan body kosong dijawab 422");
    harus(`Saldonya Rp${rib(SALDO_EKO_AKHIR)}, karena ${rib(SALDO_EKO)} − 2 × ${rib(BATAS_STATIS)} = ${rib(SALDO_EKO_AKHIR)}`);
  });
  test("layar konfirmasi: jawaban GET memuat nama, kota, terverifikasi; kota diisi lewat SQL pemilik schema karena seed tidak mengisinya; 404 satu jawaban untuk semua sebab", () => {
    expect(dA).toContain('"merchant":{"nama":"Toko Sumber Rejeki","kota":"Jakarta"},"terverifikasi":true}');
    expect(dinamis).toContain("# Data awal lab: seed tidak mengisi kota merchant luar; dua merchant diberi kota lewat SQL pemilik schema supaya konfirmasi memuat kota.");
    expect(dinamis).toContain("=> UPDATE akun SET kota_id = (SELECT id FROM kota WHERE nama = 'Jakarta') WHERE id = 30001");
    expect(readme).toContain("seed api-t4 tidak mengisi kota merchant luar");
    expect(qrGo).toContain("Satu jawaban untuk semua sebab");
    expect(qrGo).toMatch(/func \(s Service\) LihatQR[\s\S]*if !s\.bisaDibayar\(q\) \{\s*return k, ErrTidakDitemukan/);
    expect(qrGo).toContain('return jenis == "merchant" && tingkat == "terverifikasi" && status == "aktif"');
    harus("Layar itu sendiri tidak ada di lab.");
    harus("Seed `api-t4` tidak mengisi kota merchant luar, karena `akun.kota_id` hanya mengacu ke enam kota Lestari.");
    harus("Sumber kota merchant luar di produksi belum ditentukan, dan itu pertanyaan terbuka.");
    expect(naskah).toContain("`akun.kota_id` hanya mengacu ke enam kota Lestari");
  });
});

describe("rekaman lapor.txt: pembekuan lebih dulu, dampak pada merchant sah, batas laju, dan pembukaan", () => {
  test("bagian B: laporan atas Toko Andalan dijawab 202 dan Toko Andalan menjadi dibekukan; bagian C: akun terverifikasi membekukan Bu Marni, 404, saldo tetap", () => {
    expect(lB).toContain("HTTP/1.1 202 Accepted");
    expect(lB).toMatch(/ 30002 \| Toko Andalan\s+\| dibekukan/);
    expect(lC).toContain("Bearer <token sesi Eko>");
    expect(lC).toMatch(/ 30001 \| Toko Sumber Rejeki \| dibekukan/);
    expect(SALDO_BU_MARNI).toBe(20000);
    expect(lC.match(/Toko Sumber Rejeki \| (\d+)\n/g)).toHaveLength(2);
    expect(lC).toContain("# Uang yang sudah diterima tidak ditarik: pembekuan mengubah status akun, bukan posting.");
    expect(lC).toMatch(/GET '\/qr\/<qr statis Bu Marni>'[\s\S]*HTTP\/1\.1 404 Not Found/);
    harus("saldo Bu Marni tetap Rp20.000");
    harus("Di `lapor.txt` bagian B, Budi melaporkan QR Toko Andalan yang tertempel di kasir Bu Marni, dan Toko Andalan menjadi `dibekukan`.");
    harus("Di bagian C, Eko, akun terverifikasi, melaporkan QR Bu Marni yang asli. Bu Marni ikut beku");
  });
  test("bagian D: akun belum terverifikasi membekukan tiga merchant, laporan keempat 429 dengan Retry-After 1200 detik = 3600 ÷ 3; Hitungan 5 × 3 = 15, 15 ÷ 460 = 3,3%", () => {
    expect(lD).toContain('"tingkat":"belum"');
    expect(BEKU_D).toEqual([30003, 30004, 30005]);
    expect(hitung(lD, "HTTP/1.1 202 Accepted")).toBe(3);
    expect(lD).toContain("HTTP/1.1 429 Too Many Requests");
    expect(TOKEN_LAPOR).toBe(3);
    expect(ISI_ULANG_LAPOR).toBe(3);
    expect(RETRY).toBe(3600 / TOKEN_LAPOR);
    expect(TOKEN_DAFTAR).toBe(5);
    expect(TOKEN_DAFTAR * TOKEN_LAPOR).toBe(15);
    expect(Math.round(((TOKEN_DAFTAR * TOKEN_LAPOR) / (MERCHANT_LUAR + WARUNG)) * 1000) / 10).toBe(3.3);
    expect(baca("labs/api-t4/README.md")).toContain("`/daftar` 5 per jam per alamat");
    harus("Laporan keempat dijawab 429 dengan `Retry-After` 1200 detik");
    harus(`Satu alamat boleh mendaftarkan ${TOKEN_DAFTAR} akun, dan tiap akun boleh membekukan ${TOKEN_LAPOR} merchant sebelum batas laju menolak. Jadi ${TOKEN_DAFTAR} × ${TOKEN_LAPOR} = 15 merchant dalam satu rentetan.`);
    harus("Itu 15 ÷ 460 = 3,3% dari ±460 merchant");
    harus("Lima akun Tidak dijalankan, karena rekaman hanya memuat satu akun dan tiga merchant.");
    harus("5 akun × 3 laporan = 15 merchant, atau 3,3% dari ±460 merchant");
  });
  test("bagian F: empat pembukaan yang tidak memenuhi syarat dijawab 403, Bu Marni tetap beku, lalu 204 dengan penyetuju kedua; audit log memuat buka_blokir; laporan hanya memeriksa panjang alasan 20 sampai 200", () => {
    expect(hitung(lF, "HTTP/1.1 403 Forbidden")).toBe(4);
    expect(hitung(lF, "HTTP/1.1 204 No Content")).toBe(1);
    expect(lF).toMatch(/risk\s+\| buka_blokir\s+\| akun:30001/);
    expect(lF).toContain("# Lama sampai tim risk membuka merchant yang sah tidak terukur di lab (Asumsi); merchant tetap beku sampai ada tindakan petugas.");
    expect(qrGo).toContain("n < 20 || n > 200");
    expect(qrGo).toContain('tx.BekukanAkun(ctx, q.AkunID)');
    expect(qrGo).toContain('s.Audit(ctx, tx, pelapor, a.Jenis, "laporan_qr"');
    harus("empat percobaan yang tidak memenuhi syarat dijawab 403 dan Bu Marni tetap beku. Lalu staf risk dengan penyetuju kedua membuka akunnya dengan 204.");
    harus("Dari isi laporan, yang diperiksa hanya panjang alasan, 20 sampai 200 karakter, dan laju laporan per akun.");
    harus("pembukaan itu sudah menulis baris `buka_blokir` di audit log lab (`lapor.txt` bagian F)");
  });
});

describe("kode lab dan klaim negatif berlingkup", () => {
  const semuaGo = (dir: string): string[] => {
    const hasil: string[] = [];
    const jalan = (d: string) => {
      for (const e of fs.readdirSync(path.join(akar, d), { withFileTypes: true })) {
        const rel = `${d}/${e.name}`;
        if (e.isDirectory()) jalan(rel);
        else if (e.name.endsWith(".go") && (!terlacak || terlacak.has(rel))) hasil.push(rel);
      }
    };
    jalan(dir);
    return hasil;
  };
  const go = semuaGo("labs/api-t4");
  test("selain tes, hanya cmd/qrlab yang mengimpor paket payload; server tidak punya rute payload", () => {
    const pengimpor = go.filter((f) => !f.startsWith("labs/api-t4/internal/qrpayload/") && baca(f).includes('lab/apit4/internal/qrpayload"'));
    expect(pengimpor.filter((f) => !f.endsWith("_test.go"))).toEqual(["labs/api-t4/cmd/qrlab/main.go"]);
    expect(pengimpor.filter((f) => f.endsWith("_test.go"))).toEqual(["labs/api-t4/internal/service/qr_pindai_test.go"]);
    const rute = [...handlerQr.matchAll(/mux\.HandleFunc\("([A-Z]+ [^"]+)"/g)].map((m) => m[1]);
    expect(rute).toContain("GET /qr/{id}");
    expect(rute).toContain("POST /qr/{id}/bayar");
    expect(rute).toContain("POST /qr/{id}/laporkan");
    expect(rute.filter((r) => /payload/i.test(r!))).toEqual([]);
    for (const f of go.filter((x) => /\/handler\/|\/cmd\/api\//.test(x) && !x.endsWith("_test.go"))) expect(baca(f), f).not.toMatch(/HandleFunc\("[^"]*payload/i);
    expect(readme).toContain("Server api-t4 **tidak membaca payload**");
    harus("Di kode `labs/api-t4` selain tes, hanya `cmd/qrlab` yang mengimpor paket payload, dan server tidak membacanya (dijaga tes, README lab).");
    harus("Server tidak membangun payload. Ia membuat baris `qr` berisi id, nominal, dan masa berlaku");
    harus("server tidak punya endpoint payload.");
  });
  test("penanda kedaluwarsa hanya dipanggil dari BayarQR (tidak ada job di worker); QR statis tanpa berlaku_sampai; dinamis ditandai terpakai di transaction jurnal", () => {
    const pemanggil = go.filter((f) => !f.endsWith("_test.go") && baca(f).includes("TandaiQRKedaluwarsa("));
    expect(pemanggil.sort()).toEqual(["labs/api-t4/internal/repo/qr.go", "labs/api-t4/internal/service/qr.go"]);
    for (const f of go.filter((x) => x.startsWith("labs/api-t4/internal/worker/"))) expect(baca(f), f).not.toMatch(/Kedaluwarsa/);
    expect(qrGo).toContain("return q.BerlakuSampai == nil || s.kini().Before(*q.BerlakuSampai)");
    expect(qrGo).toContain('if jenis == "dinamis" {\n\t\tb := s.kini().Add(UmurQRDinamis)');
    const bayar = qrGo.slice(qrGo.indexOf("func (s Service) BayarQR"));
    expect(bayar.indexOf("CatatJurnal")).toBeLessThan(bayar.indexOf("TandaiQRTerpakai"));
    expect(bayar).toContain("tx.KunciQR(ctx, qrID)");
    expect(testingApi).toContain("--- PASS: TestBayarQRDinamisSerentak");
    harus("QR dinamis ditandai terpakai di transaction yang sama dengan jurnalnya");
    harus("Pembayaran serentak ke satu QR dinamis tidak direkam di lab ini. Tes `TestBayarQRDinamisSerentak` di `labs/api-t4/output/testing.txt` menjalankannya, dan hasilnya PASS.");
    harus("job yang menandainya belum ada");
    harus("`berlaku_sampai` kosong, jadi tanpa batas waktu (dibaca dari kode `bisaDibayar`)");
  });
  test("rentang Snippet diturunkan dari fungsi, region, dan bagian rekaman, bukan angka tangan", () => {
    const cr = (R: ReturnType<typeof bagian>, awal: (b: string) => boolean, akhir: (b: string) => boolean, dariIdx?: number): string => {
      const a = R.nomor(awal, dariIdx);
      return `${a}:${R.nomor(akhir, a)}`;
    };
    const awalFungsi = (R: ReturnType<typeof bagian>, nama: string) => {
      const f = R.nomor((b) => b.startsWith(`func ${nama}(`) || b.startsWith(`func (s Service) ${nama}(`));
      let a = f;
      while (R.baris[a - 2]!.startsWith("//")) a--;
      return a;
    };
    const akhirFungsi = (R: ReturnType<typeof bagian>, nama: string) => R.nomor((b) => b === "}", R.nomor((b) => b.startsWith(`func ${nama}(`) || b.startsWith(`func (s Service) ${nama}(`)));
    const dB0 = D.nomor((b) => b.startsWith("# --- B. ")), dC0 = D.nomor((b) => b.startsWith("# --- C. ")), dD0 = D.nomor((b) => b.startsWith("# --- D. "));
    const sD0 = S.nomor((b) => b.startsWith("# --- D. ")), lC0 = L.nomor((b) => b.startsWith("# --- C. ")), lD0 = L.nomor((b) => b.startsWith("# --- D. "));
    const bayar0 = Q.nomor((b) => b.startsWith("func (s Service) BayarQR("));
    const switch0 = Q.nomor((b) => b.trim() === "switch q.Status {", bayar0);
    const jumlah0 = Q.nomor((b) => b.trim() === "jumlah = *nominal", switch0);
    // satu rentang untuk "mengunci, membaca status, menolak terpakai dan kedaluwarsa" (dari KunciQR sampai akhir pemeriksaan masa berlaku)
    // dan satu untuk "ditandai terpakai di transaction yang sama dengan jurnalnya" (dari CatatJurnal sampai akhir TandaiQRTerpakai)
    const kunci0 = Q.nomor((b) => b.trim() === "q, err := tx.KunciQR(ctx, qrID)", bayar0);
    const exp0 = Q.nomor((b) => b.trim() === "return tx.TandaiQRKedaluwarsa(ctx, q.ID)", switch0);
    const akhirKedaluwarsa = exp0 + 1;
    expect(Q.baris[akhirKedaluwarsa - 1]).toBe("\t\t}");
    const jurnal0 = Q.nomor((b) => b.includes('tx.CatatJurnal(ctx, "bayar"'), jumlah0);
    const tandai0 = Q.nomor((b) => b.includes("tx.TandaiQRTerpakai("), jurnal0);
    const akhirTandai = Q.nomor((b) => b === "\t\t}", tandai0);
    const diharapkan: [string, string][] = [
      ["labs/t4-qr/output/crc.txt", cr(C, (b) => b.startsWith("$ qrlab buat -jenis dinamis"), (b) => b === "(10 rows)")],
      ["labs/api-t4/internal/qrpayload/qrpayload.go", `${awalFungsi(P, "PasangCRC")}:${akhirFungsi(P, "PasangCRC")}`],
      ["labs/api-t4/internal/service/qr.go", `${kunci0}:${akhirKedaluwarsa}`],
      ["labs/api-t4/internal/service/qr.go", `${jurnal0}:${akhirTandai}`],
      ["labs/t4-qr/output/dinamis.txt", `${D.nomor((b) => b.startsWith("$ curl -i -X POST '/qr/<qr dinamis 1>/bayar'"), dB0)}:${(() => { const u = D.baris.map((b, i) => [b, i + 1] as const).filter(([b, i]) => i > dB0 && i < dC0 && b.startsWith('{"type":"/problems/qr-terpakai"')); return u[1]![1]; })()}`],
      ["labs/t4-qr/output/dinamis.txt", `${D.nomor((b) => b.includes('-d \'{"nominal": 1}\''), dC0)}:${(() => { const u = D.baris.map((b, i) => [b, i + 1] as const).filter(([b, i]) => i > dC0 && i < dD0 && b.startsWith('{"type":"/problems/validasi"')); return u[2]![1]; })()}`],
      ["labs/t4-qr/output/dinamis.txt", cr(D, (b) => b === "# jam server: dibuat + 300 detik", (b) => b.startsWith('{"type":"/problems/qr-kedaluwarsa"'), dD0)],
      ["labs/t4-qr/output/statis.txt", cr(S, (b) => b.includes('-d \'{"nominal": 200000}\''), (b) => b.startsWith('{"type":"/problems/validasi"'), sD0)],
      ["labs/t4-qr/output/dinamis.txt", cr(D, (b) => b.startsWith("$ curl -i -X GET '/qr/<qr dinamis 1>'"), (b) => b.startsWith("berlaku_sampai dikurangi jam server"))],
      ["labs/api-t4/internal/service/qr.go", `${awalFungsi(Q, "bisaDibayar")}:${akhirFungsi(Q, "bisaDibayar")}`],
      ["labs/t4-qr/output/lapor.txt", cr(L, (b) => b.includes("Bearer <token sesi Eko>' -d '{\"alasan\": \"QR ini tampak janggal"), (b) => b.startsWith('{"type":"/problems/tidak-ditemukan"'), lC0)],
      ["labs/t4-qr/output/lapor.txt", cr(L, (b) => b.includes("/qr/<qr statis Merchant 5>/laporkan"), (b) => b.startsWith('{"type":"/problems/rate-limit-akun"'), lD0)],
      ["labs/api-t4/internal/qrpayload/qrpayload.go", `${P.nomor((b) => b.startsWith("func CRC16("))}:${akhirFungsi(P, "CRC16")}`],
    ];
    expect(berkasSnippet.map(([f, l]) => [f, l])).toEqual(diharapkan);
    // rentang dibuka lewat judul: bagian rekaman yang disebut judul benar-benar ada di rentang itu
    const judul = tag.map((t) => t.match(/title="([^"]+)"/)?.[1] ?? "");
    expect(judul.filter((j) => /bagian [A-D]/.test(j))).toHaveLength(8);
    expect(L.teks(Number(berkasSnippet[10]![1].split(":")[0]), Number(berkasSnippet[10]![1].split(":")[1]))).toContain("QR ini tampak janggal");
    expect(P.teks(66, 66)).toContain("func CRC16(");
    expect(D.nomor((b) => b === "# jam server: dibuat + 301 detik") > Number(berkasSnippet[6]![1].split(":")[1])).toBe(true);
  });
  test("Snippet tidak menampilkan komentar lab internal atau baris kepala rekaman", () => {
    for (const [f, l] of berkasSnippet) {
      const [a, z] = l.split(":").map(Number) as [number, number];
      const teks = bagian(baca(f)).teks(a, z);
      expect(teks, `${f} ${l}`).not.toMatch(/keputusan \d+|tinjauan PR|PR #\d+|\bR\d-\d+/);
      expect(teks.split("\n")[0], `${f} ${l}`).not.toMatch(/^# (Lab t4-qr|PostgreSQL|Rekaman dari database bersih)/);
    }
  });
});

describe("Hitungan dan label sumber: arti di pemakaian pertama, versi dari rekaman dan riset", () => {
  test("Hitungan: 10.000.000 ÷ 200.000 = 50; batas saldo tingkat dari kode dan PRD; 5 menit = 300 detik", () => {
    expect(KONST_TINGKAT).toBe(10_000_000);
    expect(prd).toContain("terverifikasi, saldo paling banyak Rp10.000.000");
    expect(KONST_TINGKAT / BATAS_STATIS).toBe(50);
    harus(`${rib(KONST_TINGKAT)} ÷ ${rib(BATAS_STATIS)} = ${KONST_TINGKAT / BATAS_STATIS} pembayaran sampai saldo habis (Hitungan)`);
    harus(`saldo maksimum tingkat terverifikasi, Rp${rib(KONST_TINGKAT)} (Asumsi produk PRD v4)`);
    harus("Batas Rp200.000 dan masa berlaku 5 menit adalah Asumsi, yaitu pilihan produk yang tidak diukur.");
  });
  test("tinjauan 4.19: penyebut 460 memuat warung yang kode lab tidak izinkan menerbitkan atau dibekukan; hasil tanpa warung 3,75% ditulis berdampingan", () => {
    const seed = baca("labs/api-t4/cmd/api/seed.go");
    expect(seed).toContain("SELECT i, 'warung', 'Warung ' || i");
    expect(seed).toContain("30000 + i, 'merchant'");
    expect(qrGo).toContain('if a.Jenis != "merchant" {\n\t\treturn repo.QR{}, ErrDilarang');
    expect(qrGo).toContain('if q.MerchantJenis == "merchant" {\n\t\t\tif _, err := tx.BekukanAkun(ctx, q.AkunID)');
    expect(naskah).toContain("kini juga menerima QR");
    const tanpaWarung = ((TOKEN_LAPOR * TOKEN_DAFTAR * 100) / MERCHANT_LUAR).toFixed(2).replace(".", ",");
    expect(tanpaWarung).toBe("3,75");
    harus(`Bila hanya merchant luar yang dihitung, hasilnya ${TOKEN_LAPOR * TOKEN_DAFTAR} ÷ ${MERCHANT_LUAR} = ${tanpaWarung}%.`);
    harus("Kode lab hanya menerbitkan QR dan membekukan akun berjenis merchant, sedangkan warung Lestari berjenis lain.");
    expect(barisRiset("R4-204")).toContain(`15 ÷ ${MERCHANT_LUAR} = ${tanpaWarung}% bila hanya merchant luar`);
  });
  test("tinjauan 4.19: halaman Mastercard memuat tag 01 dan tag 63 tetapi tidak cara menghitung CRC; cara itu dari dokumen pihak ketiga", () => {
    expect(barisRiset("R4-101")).toContain("halaman tidak menyebut algoritma CRC");
    expect(barisRiset("R4-331")).toContain("polinomial `1021` heksadesimal dan nilai awal `FFFF`");
    expect(barisRiset("R4-331")).toContain("tag 00 bernilai `01`");
    harus("Tidak dijalankan) memuat tag 01 dan tag 63.");
    harus("Tag 01 bernilai 11 untuk QR statis dan 12 untuk QR dinamis, dan tag 63 adalah data object terakhir. Halaman itu tidak menyebut cara menghitung CRC.");
    harus("Nilai tag 00 dan cara menghitung CRC dibaca dari dokumen pihak ketiga yang menyatakan isinya mengikuti spesifikasi EMVCo, bukan dari spesifikasi itu sendiri.");
  });
  test("tinjauan 4.19: jawaban konfirmasi (GET) seragam 404, tetapi pembayaran membedakan 409 dan 410, jadi daftar periksa menyebut layar konfirmasi", () => {
    expect(qrGo).toContain("ErrQRTerpakai");
    expect(qrGo).toContain("ErrQRKedaluwarsa");
    expect(dinamis).toContain("HTTP/1.1 409 Conflict");
    expect(dinamis).toContain("HTTP/1.1 410 Gone");
    harus("- [ ] Jawaban layar konfirmasi untuk QR yang tidak aktif tidak membocorkan sebabnya.");
    harus("Dari isi laporan, yang diperiksa hanya panjang alasan, 20 sampai 200 karakter, dan laju laporan per akun.");
    harus("QR pada detik ke-300 atau sesudahnya 410.");
    harus("Id QR dinamis pada detik ke-300 atau sesudahnya dijawab 410");
  });
  test("arti label muncul di pemakaian pertama dan sebelum dipakai", () => {
    const awal = (s: string) => badan.indexOf(s);
    expect(awal("Hitungan adalah hasil rumus")).toBeGreaterThan(0);
    expect(awal("Hitungan")).toBe(awal("Hitungan adalah hasil rumus"));
    expect(awal("Ilustrasi")).toBe(awal("Ilustrasi adalah skenario"));
    expect(awal("Tidak dijalankan")).toBe(awal("Tidak dijalankan berarti"));
    expect(awal("[perlu verifikasi]")).toBe(awal("[perlu verifikasi] berarti"));
    expect(awal("Asumsi")).toBeLessThan(awal("Asumsi adalah angka pilihan"));
    expect(badan.slice(awal("Asumsi"), awal("Asumsi") + 80)).toContain("Asumsi, yaitu pilihan produk yang tidak diukur");
    expect(awal("Rekaman lab")).toBeLessThan(awal("[Label sumber]") + 40);
    expect(awal("Merchant adalah penerima pembayaran")).toBeLessThan(awal("Di Rekaman lab"));
    expect(awal("payload adalah teks di dalam QR")).toBeLessThan(awal("Di Rekaman lab"));
    expect(awal("CRC adalah empat karakter di ujung payload")).toBeLessThan(awal("Di Rekaman lab"));
    expect(awal("Tag adalah dua angka")).toBeLessThan(awal("<Tebak"));
    expect(awal("tag, yaitu dua angka")).toBeGreaterThan(awal("<Tebak"));
    expect(awal("QR statis dipakai berulang oleh toko kecil")).toBeLessThan(awal("Sudah tahu?"));
    expect(awal("QR dinamis dibuat per pembayaran")).toBeLessThan(awal("Sudah tahu?"));
  });
  test("versi di halaman sama dengan baris riset dan rekaman: Go, Node.js, PHP, crclib, mobile_scanner, qr_flutter, FBI, RFC", () => {
    const r200 = barisRiset("R4-200"), r201 = barisRiset("R4-201"), r202 = barisRiset("R4-202"), r203 = barisRiset("R4-203");
    expect(r202).toContain("go1.27.3");
    expect(r202).toContain("lab go1.27.1");
    harus("Halaman [Go: hash](https://pkg.go.dev/hash) memakai Go 1.27.3 sedangkan lab memakai Go 1.27.1, dibuka 2026-10-30.");
    expect(cocok(r202, /dokumentasi (v[\d.]+)\)/)[1]).toBe("v26.13.0");
    harus("dokumentasi v26.13.0");
    expect(r202).toContain("ditambahkan di v22.2.0 dan v20.15.0");
    harus("(ditambahkan di v22.2.0 dan v20.15.0)");
    expect(r202).toContain("contoh keluaran 'As of PHP 8.1.0'");
    harus('contoh keluaran "As of PHP 8.1.0"');
    expect(r202).toContain("`crclib` 3.0.0");
    harus("halaman pub.dev [crclib](https://pub.dev/packages/crclib) 3.0.0");
    expect(r203).toContain("`mobile_scanner` 7.4.2");
    expect(r203).toContain("`qr_flutter` 4.1.0");
    harus("[mobile_scanner](https://pub.dev/packages/mobile_scanner) 7.4.2");
    harus("[qr_flutter](https://pub.dev/packages/qr_flutter) 4.1.0");
    expect(r201).toContain("I-011822-PSA, 2022-01-18");
    harus("pemberitahuan I-011822-PSA pada 2022-01-18");
    expect(r200).toContain("RFC 2104");
    expect(r200).toContain("Februari 1997");
    harus("Februari 1997");
    expect(readme).toContain("Python | 3.14.7");
    harus("Python 3.14.7, `crc.txt` bagian A");
    for (const r of [r200, r201, r202, r203]) expect(r).toContain("2026-10-30");
    expect(baca("plan/RISET-TAHAP-4.md")).toContain("`binascii.crc_hqx(data, value)` (docs.python.org/3/library/binascii.html, dibuka 2026-10-27");
    harus("dibuka 2026-10-27");
    harus("[Mastercard Developers: Generate QR Code for Merchants](https://developer.mastercard.com/mastercard-checkout-solutions/documentation/use-cases/sqr/generate-qr-codes/sqr-generate-qr/), dibuka 2026-10-26");
    expect(barisRiset("R4-101")).toContain("developer.mastercard.com/mastercard-checkout-solutions/documentation/use-cases/sqr/generate-qr-codes/sqr-generate-qr/, dibuka 2026-10-26");
  });
  test("kasus industri dibaca sampai batasnya: peringatan umum, tanpa statistik, fokus tautan; tidak membuktikan opsi D", () => {
    expect(barisRiset("R4-201")).toContain("peringatan umum lembaga di Amerika Serikat, tanpa statistik kasus");
    harus("itu peringatan umum lembaga di Amerika Serikat, tanpa statistik kasus.");
    harus("Fokus utamanya situs berbahaya yang mencuri data login dan data keuangan, dengan satu paragraf tentang QR pembayaran bisnis yang diganti sehingga pembayaran dialihkan.");
    harus("QR di sana mengarahkan ke situs pembayaran, bukan ke id yang dijawab server seperti di Rekeningo.");
    expect(barisRiset("R4-201")).toContain("satu paragraf membahas QR pembayaran bisnis yang diganti sehingga pembayaran dialihkan");
    expect(barisRiset("R4-201")).not.toContain("tanpa membahas QR pembayaran merchant");
    harus("Ia tidak membuktikan bahwa QR dinamis atau layar konfirmasi mencegahnya.");
  });
});

describe("data Tebak, diagram Rantai, halaman istilah, baris riset, dan kartu Cek diri", () => {
  test("Tebak: tepat satu pilihan benar di posisi kedua, bukan yang terpanjang; sumber rekaman; label standar; sidik", () => {
    expect(tebak.pilihan.filter((p) => p.benar)).toHaveLength(1);
    const benar = tebak.pilihan.findIndex((p) => p.benar);
    expect(benar).toBe(1);
    const panjang = tebak.pilihan.map((p) => p.teks.length);
    expect(panjang[benar]).toBeLessThan(Math.max(...panjang));
    expect(tebak.pilihan).toHaveLength(4);
    expect(tebak.sumber.jenis).toBe("rekaman");
    expect(tebak.sumber.teks).toContain("crc.txt bagian D");
    expect(tebak.sumber.teks).toContain("statis.txt bagian C");
    expect(tebak.label.sumber).toBe("Rekaman lab · statis.txt");
    for (const p of tebak.pilihan) expect(JSON.stringify(p)).not.toMatch(/\bR\d-\d+|keputusan \d+/);
    expect(sidik(JSON.stringify(tebakMentah))).toBe(SIDIK.tebak);
    expect(tebakMentah.id).toBe("t4-qr-tebak");
    harus("Jawaban yang tepat: pemindai menerima, dan server menjawab nama Toko Andalan, bukan nama Toko Sumber Rejeki di payload (`statis.txt` bagian C).");
    expect(tebak.pilihan[3]!.alasan).toContain("(`crc.txt` bagian B)");
    expect(tebak.pilihan[0]!.alasan).toContain("(`crc.txt` bagian D)");
    expect(tebak.pilihan[3]!.teks).toContain("tag 01 bernilai 11 hanya sah untuk QR dinamis");
    expect(cB).toMatch(/\n 01\s+\| 02\s+\| 11\s+\|/);
  });
  test("diagram Rantai: dua baris, tiga simpul; angka status dan detik dari rekaman; sidik", () => {
    expect(diagram.baris).toHaveLength(2);
    expect(diagram.baris.map((b) => b.simpul.length)).toEqual([3, 3]);
    const s = diagram.baris[1]!.simpul;
    expect(s[0]!.teks).toBe(`Bayar pertama: ${cocok(dB, /HTTP\/1\.1 (201) Created/)[1]}`);
    expect(s[1]!.teks).toBe(`Bayar kedua: ${cocok(dB, /HTTP\/1\.1 (409) Conflict/)[1]}`);
    expect(s[2]!.teks).toBe(`Pada ${DETIK_BERLAKU} detik: ${cocok(dD, /HTTP\/1\.1 (410) Gone/)[1]}`);
    expect(s[2]!.sub).toBe(`${JAM_UJI[0]} detik: terbayar`);
    expect(diagram.baris[0]!.simpul[2]!.sub).toBe("bukan nama di payload");
    expect(diagram.sumber.jenis).toBe("rekaman");
    expect(diagram.baris[0]!.simpul.map((x) => x.nada)).toEqual(["biasa", "warn", "good"]);
    expect(sidik(JSON.stringify(diagramMentah))).toBe(SIDIK.diagram);
    expect(diagram.catatan).toContain("Jam di baris kedua diperankan, tidak ditunggu 300 detik.");
    expect(dinamis).toContain("jam service diperankan lewat POST /lab/jam: 5 menit tidak ditunggu");
  });
  test("halaman istilah QR statis dan dinamis: valid, baris glosarium sama, angka dari rekaman, riset tercatat, sidik", () => {
    expect(istilah.istilah).toBe("QR statis dan dinamis");
    const baris = glosariumJson.find((x) => x.t === "QR statis dan dinamis")!;
    expect(baris).toMatchObject({ b: "t4-qr", n: "4.19 QR pembayaran", u: "/tahap-4/qr-pembayaran/", s: "istilah-qr-statis-dan-dinamis", h: "/istilah/qr-statis-dan-dinamis/" });
    expect(baris.d).toBe("QR statis dicetak sekali dan dipakai berulang dengan nominal diisi pembeli; QR dinamis dibuat per pembayaran, nominalnya terikat, dan hanya sekali bayar.");
    expect(glosarium).toContain(`| **QR statis dan dinamis** | ${baris.d} | [[t4-qr]] |`);
    expect(istilah.sehari_hari!.startsWith("QR statis dicetak sekali dan dipakai berulang")).toBe(true);
    expect(istilah.mekanisme).toHaveLength(4);
    expect(istilah.mekanisme![1]).toContain(`1 sampai Rp${rib(BATAS_STATIS)}`);
    expect(istilah.mekanisme![3]).toContain(`${DETIK_BERLAKU} detik`);
    expect(istilah.mekanisme![3]).toContain(`detik ke-${JAM_UJI[0]}`);
    expect(istilah.mekanisme![3]).toContain(`detik ke-${JAM_UJI[1]}`);
    expect(istilah.stack).toBeNull();
    for (const s of istilah.sumber!) {
      if ("riset" in s && s.riset) expect(riset).toContain(`| ${s.riset} |`);
      if ("rekaman" in s) expect(fs.existsSync(path.join(akar, s.rekaman))).toBe(true);
    }
    for (const t of istilah.terkait!) expect(glosariumJson.some((x) => x.t === t), t).toBe(true);
    expect(istilah.cerita![0]!.rujukan).toBe("t4-qr");
    expect(sidik(istilahMentah)).toBe(SIDIK.istilah);
    expect(sidik(JSON.stringify(baris))).toBe(SIDIK.glosarium);
  });
  test("baris riset R4-200 sampai R4-204: ada, urut sesudah R4-187 dan sebelum R4-300, tanpa ganda, utuh; Hitungan R4-204 sama dengan halaman", () => {
    const id = riset.split("\n").filter((b) => b.startsWith("| R4-")).map((b) => b.split(" | ")[0]!.slice(2));
    for (const x of ["R4-200", "R4-201", "R4-202", "R4-203", "R4-204"]) expect(id.filter((y) => y === x), x).toHaveLength(1);
    const i = (x: string) => id.indexOf(x);
    expect(id.slice(i("R4-200"), i("R4-200") + 5)).toEqual(["R4-200", "R4-201", "R4-202", "R4-203", "R4-204"]);
    expect(Number(id[i("R4-204") + 1]!.slice(3))).toBeGreaterThan(204); // R4-205 sampai R4-207 milik 4.20 menyusul sebelum R4-300
    expect(i("R4-204")).toBeLessThan(i("R4-300"));
    expect(i("R4-200")).toBeGreaterThan(i("R4-187"));
    const tigaDigit = id.filter((x) => /^R4-\d{3}$/.test(x));
    expect(tigaDigit).toEqual([...tigaDigit].sort());
    expect(new Set(id).size).toBe(id.length);
    expect(["R4-200", "R4-201", "R4-202", "R4-203", "R4-204"].map((x) => barisRiset(x))).toEqual(RISET_TERKUNCI);
    const r204 = barisRiset("R4-204");
    expect(r204).toContain(`Rp200.000 × 2 = Rp400.000 (\`statis.txt\` bagian D: dua pembayaran berturut-turut, saldo Eko Rp500.000 menjadi Rp100.000)`);
    expect(r204).toContain(`Rp10.000.000 ÷ Rp200.000 = 50 pembayaran`);
    expect(r204).toContain("5 pendaftaran × 3 laporan = 15 merchant");
    expect(r204).toContain("15 ÷ (400 + 60) = 3,3% dari ±460 merchant");
    expect(2 * BATAS_STATIS).toBe(400000);
  });
  test("kartu Cek diri: empat kartu t4-qr sama dengan pertanyaan di halaman; judul dan url dari registry", () => {
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-qr");
    expect(kartu.map((k) => k.id)).toEqual(["t4-qr-1", "t4-qr-2", "t4-qr-3", "t4-qr-4"]);
    const tanya = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(tanya).toHaveLength(4);
    kartu.forEach((k, n) => {
      expect(k.tanya).toBe(tanya[n]);
      expect(k.judul).toBe("4.19 QR pembayaran: statis, dinamis, konfirmasi + ADR 40");
      expect(k.url).toBe("tahap-4/qr-pembayaran/");
    });
    kartu.forEach((k) => expect(badan, k.id).toContain(k.jawab.slice(0, 70)));
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/- \[ \] /g)).toHaveLength(6);
  });
});

describe("tinjauan: klaim negatif dan penolakan kalimat tambahan", () => {
  test("klaim kepatuhan dan izin tidak ditulis sebagai fakta; EMVCo hanya sebagai sumber yang belum terbaca", () => {
    for (const k of ["sesuai standar", "mematuhi", "berizin", "disertifikasi", "resmi dari"]) expect(badan).not.toContain(k);
    expect(hitung(badan, "tidak mengklaim kepatuhan atau izin apa pun")).toBe(2);
    harus("PDF spesifikasi EMVCo belum terbaca, jadi parameter CRC dan nilai tag menurut spesifikasi itu [perlu verifikasi di PDF EMVCo].");
    expect(readme).toContain("lab ini tidak mengklaim kepatuhan atau izin apa pun");
  });
  test("tabel QR statis lawan dinamis dan tabel ADR tidak lebih dari lima kolom; sel tidak kosong kecuali sudut kiri atas", () => {
    const tabel = badan.split("\n").filter((b) => b.startsWith("|"));
    for (const b of tabel) {
      const sel = b.replace(/\\\|/g, "").split("|").slice(1, -1);
      expect(sel.length).toBeLessThanOrEqual(5);
      if (!/^\|[-| ]+\|$/.test(b) && !b.startsWith("| |")) for (const x of sel) expect(x.trim().length, b).toBeGreaterThan(0);
    }
    expect(tabel).toHaveLength(5 + 7 + 7);
  });
});

describe("tinjauan 4.19: rujukan bagian rekaman, kode ilustrasi yang dijalankan, parameter CRC, kosakata, dan data turunan", () => {
  const seksi = (r: ReturnType<typeof bagian>): Record<string, string> => {
    const huruf = r.baris.map((b) => b.match(/^# --- ([A-F])\. /)?.[1]).filter((x): x is string => !!x);
    return Object.fromEntries(huruf.map((h, i) => [h, bagianDari(r, h, huruf[i + 1] ?? null)]));
  };
  const SEKSI: Record<string, Record<string, string>> = { crc: seksi(C), statis: seksi(S), dinamis: seksi(D), lapor: seksi(L) };
  test("setiap rujukan bagian X menunjuk bagian yang ada, dan bilangan serta nama di kalimatnya ada di bagian yang dirujuk kalimat itu", () => {
    const NAMA = ["Toko Andalan", "Toko Sumber Rejeki", "Bu Marni", "Budi", "Eko"];
    const gagal: string[] = [];
    let jumlah = 0, denganToken = 0;
    const baris = badan.split("\n");
    let berkasTerakhir = "";
    for (const b of baris) {
      if (!b.trim()) continue;
      if (b.startsWith("#")) berkasTerakhir = "";
      if (b.startsWith("<Snippet") || b.startsWith("import ")) continue;
      // batas kalimat: awal baris, sesudah ". ", dan sesudah "| "
      const potong = [0, ...[...b.matchAll(/\. |\| /g)].map((m) => m.index! + m[0].length), b.length];
      for (let k = 0; k < potong.length - 1; k++) {
        const kalimat = b.slice(potong[k]!, potong[k + 1]!);
        const rujukan = [...kalimat.matchAll(/bagian ([A-F])((?:(?:, dan|,| dan| sampai) [A-F])*)/g)];
        const berkasDiKalimat = [...kalimat.matchAll(/`(crc|statis|dinamis|lapor)\.txt`/g)];
        const saksi: string[] = [];
        for (const m of rujukan) {
          jumlah++;
          const sebelum = [...b.slice(0, potong[k]! + m.index!).matchAll(/`(crc|statis|dinamis|lapor)\.txt`/g)].pop();
          const berkas = sebelum?.[1] ?? berkasTerakhir;
          if (!berkas) { gagal.push(`${m[0]}: berkas tidak ada`); continue; }
          const huruf = [m[1]!];
          for (const x of m[2]!.matchAll(/(, dan|,| dan| sampai) ([A-F])/g)) {
            if (x[1] === " sampai") for (let c = huruf[huruf.length - 1]!.charCodeAt(0) + 1; c <= x[2]!.charCodeAt(0); c++) huruf.push(String.fromCharCode(c));
            else huruf.push(x[2]!);
          }
          for (const h of huruf) {
            if (!SEKSI[berkas]![h]) gagal.push(`${berkas} bagian ${h} tidak ada`);
            else saksi.push(SEKSI[berkas]![h]!);
          }
        }
        if (berkasDiKalimat.length) berkasTerakhir = berkasDiKalimat[berkasDiKalimat.length - 1]![1]!;
        if (!rujukan.length) continue;
        const witness = saksi.join("\n").replace(/(\d)\.(\d{3})/g, "$1$2");
        const token = [...kalimat.matchAll(/(?<![\w.`/-])(?:Rp)?(\d{1,3}(?:\.\d{3})+|\d{3,})(?![\w-])/g)].map((t) => t[1]!.replace(/\./g, "")).concat(NAMA.filter((n) => kalimat.includes(n)));
        if (token.length) denganToken++;
        for (const t of token) if (!new RegExp(`(?<!\\d)${t}(?!\\d)`).test(witness)) gagal.push(`${kalimat.trim().slice(0, 60)}: '${t}' tidak ada di bagian yang dirujuk`);
      }
    }
    expect(jumlah).toBeGreaterThan(35);
    expect(denganToken).toBeGreaterThan(12);
    expect(gagal).toEqual([]);
  });
  test("rentang baris tiap Snippet rekaman ada di dalam bagian yang disebut judulnya", () => {
    let diperiksa = 0;
    for (const t of tag) {
      const f = t.match(/file="labs\/t4-qr\/output\/(crc|statis|dinamis|lapor)\.txt"/)?.[1];
      const h = t.match(/title="[^"]*bagian ([A-F])/)?.[1];
      const r = t.match(/lines="(\d+):(\d+)"/);
      if (!f || !h || !r) continue;
      const R = { crc: C, statis: S, dinamis: D, lapor: L }[f]!;
      const huruf = R.baris.map((x) => x.match(/^# --- ([A-F])\. /)?.[1]).filter((x): x is string => !!x);
      const mulai = R.nomor((x) => x.startsWith(`# --- ${h}. `));
      const berikut = huruf[huruf.indexOf(h) + 1];
      const akhir = berikut ? R.nomor((x) => x.startsWith(`# --- ${berikut}. `)) - 1 : R.baris.length;
      expect(Number(r[1]), `${f} bagian ${h}`).toBeGreaterThanOrEqual(mulai);
      expect(Number(r[2]), `${f} bagian ${h}`).toBeLessThanOrEqual(akhir);
      diperiksa++;
    }
    expect(diperiksa).toBe(8);
  });
  test("kode ilustrasi di tab Node, Python, dan PHP dijalankan: CRC sama dengan crc.txt (nilai uji 29B1 dan dua payload bagian B)", () => {
    const kode = (lang: string): string => badan.match(new RegExp(`<Snippet lang="${lang}" code=\\{\`([\\s\\S]*?)\`\\} />`))![1]!;
    const payload = cB.split("\n").filter((l) => /^0002010102(11|12)/.test(l)).map((l) => [l.slice(0, -4), l.slice(-4)] as const);
    expect(payload).toHaveLength(2);
    const kasus: (readonly [string, string])[] = [["123456789", "29B1"], ...payload];
    expect(cA).toContain("CRC('123456789') Go 29B1");
    const js = new Function(`${kode("js")}\nreturn crc16;`)() as (t: string) => string;
    for (const [teks, hasil] of kasus) expect(js(teks), `js ${teks.slice(0, 12)}`).toBe(hasil);
    for (const [teks, hasil] of kasus) {
      const r = spawnSync("python3", ["-I", "-c", `import sys\nteks = sys.argv[1]\n${kode("python")}\nprint(crc)`, teks], { encoding: "utf8" });
      expect(r.stdout.trim(), `python ${teks.slice(0, 12)}`).toBe(hasil);
    }
    // PHP dijalankan bila terpasang; tanpa PHP bagian ini dilewati (CI tidak memasangnya), dan tab PHP tetap dijaga sidik kalimat.
    if (spawnSync("php", ["-v"], { encoding: "utf8" }).status === 0) {
      for (const [teks, hasil] of kasus) {
        const r = spawnSync("php", ["-r", `${kode("php")}\necho crc16($argv[1]);`, "--", teks], { encoding: "utf8" });
        expect(r.stdout.trim(), `php ${teks.slice(0, 12)}`).toBe(hasil);
      }
    }
  });
  test("parameter CRC di halaman sama dengan kode Go dan kepala rekaman; tag 01 dari rekaman", () => {
    expect(payloadGo).toContain("crc = crc<<1 ^ 0x1021");
    expect(payloadGo).toContain("crc := uint16(0xFFFF)");
    expect(crc).toContain("polinomial 0x1021, nilai awal 0xFFFF");
    expect(crc).toContain("CRC-16/IBM-3740");
    harus("CRC-16/IBM-3740 dengan polinomial 0x1021 dan nilai awal 0xFFFF");
    expect(cB).toMatch(/ 01\s+\| 02\s+\| 11\s+\| 11 statis, 12 dinamis/);
    expect(cB).toMatch(/ 01\s+\| 02\s+\| 12\s+\| 11 statis, 12 dinamis/);
    harus("Tag 01 bernilai 11 untuk QR statis dan 12 untuk QR dinamis");
    harus("Tag 01 bernilai 11 untuk QR statis dan 12 untuk QR dinamis, dan tag 63 adalah data object terakhir.");
  });
  test("kosakata dan antonim berlingkup: tingkat 'terverifikasi' (bukan 'terdaftar'), batas atas 'paling banyak' (bukan 'paling sedikit'), 'per hari' hanya dalam penyangkalan, mengunci dan jam diperankan dari kode dan rekaman", () => {
    expect(qrGo).toContain('a.Tingkat != "terverifikasi"');
    expect(badan).not.toContain("terdaftar");
    expect(badan).not.toContain("paling sedikit");
    expect(hitung(badan, "per hari")).toBe(hitung(badan, "bukan per QR atau per hari"));
    expect(hitung(badan, "per hari")).toBe(2);
    harus("Batas itu per pembayaran, bukan per QR atau per hari.");
    harus("Batas itu berlaku per pembayaran, bukan per QR atau per hari, jadi hanya membatasi kerugian satu pembayaran.");
    expect(baca("labs/api-t4/internal/repo/qr.go")).toContain("FOR UPDATE OF q");
    harus("`BayarQR` mengunci baris QR, membaca statusnya");
    expect(dinamis).toContain("jam service diperankan lewat POST /lab/jam: 5 menit tidak ditunggu");
    harus("Jam server diperankan lewat endpoint lab, jadi 5 menit tidak ditunggu.");
    harus("dengan jam yang diperankan (bagian D).");
    expect(diagram.catatan).toContain(`Jam di baris kedua diperankan, tidak ditunggu ${DETIK_BERLAKU} detik.`);
    expect(barisRiset("R4-203")).toContain("Linux dan Windows tidak didukung");
    harus("(Linux dan Windows tidak didukung)");
    expect(badan).not.toContain("web, dan Linux");
  });
  test("data Tebak, diagram, dan halaman istilah: kalimat yang menyebut hasil rekaman cocok dengan rekaman dan registry", () => {
    expect(tebak.adegan[0]).toContain(`nama ${NAMA_PAYLOAD[1]} dan kota ${NAMA_PAYLOAD[2]}`);
    expect(tebak.adegan[0]).toContain(`id QR milik ${NAMA_SERVER[1]}.`);
    expect(tebak.pertanyaan).toBe("Apa yang dilakukan pemindai, dan nama apa yang dijawab server?");
    expect(tebak.pilihan[0]!.alasan).toContain("galat crc");
    expect(crc).toContain("galat crc: CRC tidak cocok");
    expect(tebak.penutup).toContain("CRC menangkap salah baca, bukan penggantian.");
    expect(crc).toContain("mendeteksi salah baca, bukan penggantian");
    expect(sC).toContain(`pemindai: ${diagram.baris[0]!.simpul[1]!.sub};`);
    expect(dB).toContain(`${diagram.baris[1]!.label} ini sudah dibayar`);
    expect(diagram.baris[0]!.label).toBe("Payload diganti");
    expect(diagram.baris.map((b) => b.simpul.length)).toEqual([3, 3]);
    const sumber0 = istilah.sumber![0] as { riset: string; judul: string; url: string; catatan: string };
    const sumber1 = istilah.sumber![1] as { judul: string; rekaman: string; catatan: string };
    expect(istilah.mekanisme![0]).toContain("bernilai 11 untuk QR statis dan 12 untuk QR dinamis");
    expect(istilah.jebakan![1]).toContain("Batas itu per pembayaran");
    expect(istilah.terkait).toEqual(["HMAC (hash-based message authentication code)", "Jurnal"]);
    const mc = "developer.mastercard.com/mastercard-checkout-solutions/documentation/use-cases/sqr/generate-qr-codes/sqr-generate-qr/";
    expect(sumber0.url).toBe(`https://${mc}`);
    expect(sumber0.riset).toBe("R4-101");
    expect(barisRiset("R4-101")).toContain(`${mc}, dibuka 2026-10-26`);
    expect(sumber0.judul).toContain("dibuka 2026-10-26");
    expect(sumber1.rekaman).toBe("labs/t4-qr/output/dinamis.txt");
    expect(istilah.cerita![0]!.rujukan).toBe(dari("t4-qr").id);
    expect(istilah.cerita![0]!.teks).toContain(`dijawab ${cocok(dB, /HTTP\/1\.1 (409) Conflict/)[1]} untuk pembayaran kedua`);
  });
  test("setiap tautan luar di halaman ada di baris riset (nama host dan path), dan Hitungan 300 detik ÷ 60 = 5 menit ada di baris riset", () => {
    const luar = [...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!).filter((u) => !u.includes("/cara-pakai"));
    expect(luar.length).toBeGreaterThanOrEqual(12);
    for (const u of new Set(luar)) {
      const kunci = u.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "");
      const paket = u.match(/^https:\/\/pub\.dev\/packages\/(\w+)$/)?.[1];
      // baris riset menulis paket pub.dev dengan nama berkutip bila tanpa alamat
      expect(riset.includes(kunci) || (!!paket && riset.includes(`\`${paket}\``)), u).toBe(true);
    }
    expect(DETIK_BERLAKU / 60).toBe(MENIT_DIN);
    expect(barisRiset("R4-204")).toContain(`${DETIK_BERLAKU} detik ÷ 60 = ${MENIT_DIN} menit`);
  });
  test("label kejujuran: kalimat 'tidak dibaca' atau 'belum terbaca' membawa [perlu verifikasi]; 'Dijalankan' hanya untuk Go dan pembanding Python; jumlah, tanggal, RFC, dan PSA sama dengan sumbernya", () => {
    const kalimat = badan.split(/(?<=\.) |\n/).filter(Boolean);
    const takTerbaca = kalimat.filter((k) => /tidak dibaca|belum terbaca/.test(k));
    expect(takTerbaca.length).toBeGreaterThanOrEqual(8);
    for (const k of takTerbaca) expect(k, k.slice(0, 50)).toContain("[perlu verifikasi");
    expect([...badan.matchAll(/(?<!Tidak )Dijalankan\b/g)]).toHaveLength(2);
    harus("*Dijalankan: lab api-t4 dan t4-qr");
    harus("*Dijalankan hanya sebagai pembanding di lab: Python");
    harus("[perlu verifikasi] berarti belum bisa dicek ke sumber primer.");
    // nominal rupiah di halaman hanya yang berasal dari rekaman atau kode
    expect(sD).toContain('{"nominal": 0}');
    const boleh = new Set([0, 1, NOMINAL_DIN - 1, NOMINAL_DIN, NOMINAL_DIN + 1, SALDO_BU_MARNI, BATAS_STATIS, BATAS_STATIS + 1, SALDO_EKO, SALDO_EKO_AKHIR, KONST_TINGKAT]);
    for (const m of badan.matchAll(/Rp(\d{1,3}(?:\.\d{3})*)/g)) expect(boleh.has(angka(m[1]!)), `Rp${m[1]}`).toBe(true);
    for (const k of kalimat.filter((x) => x.includes(`Rp${rib(SALDO_EKO_AKHIR)}`))) expect(k, k.slice(0, 50)).toMatch(/Eko|Saldonya/);
    // tanggal akses di halaman ada di baris riset yang dirujuk
    const tanggalRiset = new Set([...[barisRiset("R4-101"), barisRiset("R4-200"), barisRiset("R4-201"), barisRiset("R4-202"), barisRiset("R4-203"), barisRiset("R4-204"), barisRiset("R4-332")].join("\n").matchAll(/dibuka (2026-\d\d-\d\d)/g)].map((m) => m[1]!));
    for (const m of badan.matchAll(/(?:dibuka|pada) (2026-\d\d-\d\d)/g)) expect(tanggalRiset.has(m[1]!), m[1]).toBe(true);
    // tanggal di samping tiap tautan luar sama dengan tanggal di baris riset yang memuat tautan itu
    for (const m of badan.matchAll(/\]\((https:\/\/[^)]+)\)[^.]{0,80}?dibuka (2026-\d\d-\d\d)/g)) {
      const kunci = m[1]!.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "");
      const paket = m[1]!.match(/^https:\/\/pub\.dev\/packages\/(\w+)$/)?.[1];
      const baris = riset.split("\n").find((b) => b.includes(kunci) || (!!paket && b.includes(`\`${paket}\``)));
      expect(baris, m[1]).toBeDefined();
      expect(baris!, m[1]).toContain(`dibuka ${m[2]}`);
    }
    for (const m of badan.matchAll(/RFC (\d+)/g)) expect(m[1], "RFC").toBe(cocok(badan, /rfc(\d+)\)/)[1]);
    const psa = cocok(badan, /PSA(\d\d)(\d\d)(\d\d)\)/);
    harus(`I-${psa[2]}${psa[3]}${psa[1]}-PSA`);
    harus(`20${psa[1]}-${psa[2]}-${psa[3]}`);
    harus("2022-01-18");
    expect([...badan.matchAll(/RFC (\d+)/g)].length).toBeGreaterThanOrEqual(3);
  });
  test("satuan waktu dan hitungan kata di halaman sama dengan rekaman: detik, menit, jumlah pembayaran Eko, jumlah merchant beku", () => {
    const detik = new Set([DETIK_BERLAKU, ...JAM_UJI, RETRY]);
    expect([...detik].sort((a, b) => a - b)).toEqual([299, 300, 301, 1200]);
    for (const m of badan.matchAll(/(?<![\w-])(\d+) detik/g)) expect(detik.has(Number(m[1])), `${m[0]}`).toBe(true);
    const coba = Number(cocok(badan, /coba (\d+) menit/)[1]);
    const menit = new Set([MENIT_DIN, dari("t4-qr").menit! - coba, coba]);
    for (const m of badan.matchAll(/(?<![\w-])(\d+) menit/g)) expect(menit.has(Number(m[1])), `${m[0]}`).toBe(true);
    const nBayar = (sD.match(/HTTP\/1\.1 201 Created/g) ?? []).length;
    expect(nBayar).toBe(2);
    for (const m of badan.matchAll(/\b(\w+) pembayaran Rp200\.000/g)) expect(["satu", "dua", "Satu"].includes(m[1]!) ? m[1]!.toLowerCase() : m[1], m[0]).toBe(KATA[nBayar]);
    expect(BEKU_D).toHaveLength(3);
    for (const m of badan.matchAll(/(?:membekukan|dan) (\w+) merchant/g)) if (/^(satu|dua|tiga|empat|lima)$/.test(m[1]!)) expect(m[1], m[0]).toBe(KATA[BEKU_D.length]);
  });
  test("kosakata lab: tim risk, penyetuju kedua, membekukan (bukan menghapus), dan lang Snippet sesuai berkas dan tab", () => {
    expect(badan).not.toMatch(/\b(menghapus|dihapus|tim cs|satu staf)\b/);
    expect(lapor).toContain("petugas risk");
    expect(lapor).toContain("X-Penyetuju-Token");
    expect(lapor).toContain("merchant dibekukan sementara");
    for (const t of tag) {
      const f = t.match(/file="([^"]+)"/)?.[1];
      const lang = t.match(/lang="([^"]+)"/)?.[1];
      if (f?.endsWith(".go")) expect(lang, t).toBe("go");
      if (f?.endsWith(".txt")) expect(lang, t).toBeUndefined();
    }
    expect([...badan.matchAll(/<Snippet lang="(\w+)" code=/g)].map((m) => m[1])).toEqual(["js", "php", "python"]);
  });
  test("heading halaman: urutan dan teks (kunci; heading tidak punya sumber luar)", () => {
    expect([...badan.matchAll(/^(#{2,3}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`)).toEqual([
      "## Inti",
      "### Kenapa ini ada",
      "### Cara kerjanya",
      "### Di stack lain",
      `### ADR ${dari("t4-qr").adr![0]}: QR dinamis untuk merchant dengan layar, QR statis berbatas dengan nama dari server, laporan membekukan dulu`,
      "### Sengaja belum dilakukan",
      "### Cek diri",
      "### Saat me-review kode AI, cek ini",
      "### Bacaan lanjut",
    ]);
  });
});

describe("profil kata penentu per baris: polaritas, bilangan, label, tautan, tokoh, kode, dan sel tabel", () => {
  test("setiap baris badan punya profil yang sama dengan PROFIL_BARIS", () => {
    const baris = badan.split("\n");
    expect(baris.length).toBe(PROFIL_BARIS.length);
    baris.forEach((b, n) => expect(profil(b), `baris badan ${n + 1}: ${b.slice(0, 90)}`).toBe(PROFIL_BARIS[n]));
  });
  test("profil menangkap mutasi kata penentu: sisipan tidak, angka, label, tautan, heading, dan sel tabel yang tertukar", () => {
    const k = "Pembayaran kedua dijawab 409 dan QR dinamis sekali bayar (Rekaman lab, [[t4-m35]]).";
    expect(profil(k)).not.toBe(profil("Pembayaran kedua tidak dijawab 409 dan QR dinamis sekali bayar (Rekaman lab, [[t4-m35]])."));
    expect(profil(k)).not.toBe(profil(k.replace("409", "410")));
    expect(profil(k)).not.toBe(profil(k.replace("Rekaman lab", "Ilustrasi")));
    expect(profil(k)).not.toBe(profil(k.replace("[[t4-m35]]", "[[t4-m36]]")));
    expect(profil("### Judul")).not.toBe(profil("##### Judul"));
    expect(profil("| Nominal | Diisi pembeli | Terikat pada id QR |")).not.toBe(profil("| Nominal | Terikat pada id QR | Diisi pembeli |"));
    expect(profil("")).toBe("");
  });
});

describe("kalimat terkunci: setiap baris badan halaman sama dengan nilai yang dibangkitkan", () => {
  test("frontmatter terkunci", () => {
    expect(sidik(frontmatter)).toBe(SIDIK.frontmatter);
  });
  test("jumlah baris dan sidik tiap baris badan sama dengan KALIMAT_TERKUNCI", () => {
    const baris = badan.split("\n");
    expect(baris.length).toBe(KALIMAT_TERKUNCI.length);
    baris.forEach((b, n) => expect(sidik(b), `baris badan ${n + 1}: ${b.slice(0, 90)}`).toBe(KALIMAT_TERKUNCI[n]));
  });
});
