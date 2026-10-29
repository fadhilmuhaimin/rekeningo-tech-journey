// Penjaga halaman 4.19: angka, nama, versi, ID, nomor halaman, tautan, label sumber, rentang Snippet, klaim negatif berlingkup,
// Hitungan, diagram Rantai, data Tebak, halaman istilah, baris riset, dan kartu Cek diri di qr-pembayaran.mdx diturunkan dari
// rekaman labs/t4-qr (crc.txt, statis.txt, dinamis.txt, lapor.txt), kode labs/api-t4 (service, handler, qrpayload), README lab,
// naskah Tahap 4, halaman tetangga, registry, dan baris riset, bukan dari daftar yang ditulis sendiri.
// Aturan tes ini (pelajaran 3.4 sampai 3.12 dan 4.1 sampai 4.18): hanya membaca berkas terlacak git; KALIMAT_TERKUNCI (berkas nilai)
// mengunci SETIAP baris badan halaman; tes lain menurunkan nilai yang diklaim dari sumbernya, karena kalimat terkunci tidak
// menangkap SALAHNYA kalimat. Elemen non-prosa (frontmatter, diagram, data Tebak, halaman istilah, baris riset) dikunci dengan
// sidik jari dan nilai terkunci di berkas nilai.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
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
import { KALIMAT_TERKUNCI, RISET_TERKUNCI, SIDIK } from "./qr-pembayaran.halaman.nilai";

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

describe("registry, meta, susunan blok, dan tautan", () => {
  test("4.19 ada, konsep, jalur inti, prasyarat 4.18, lab t4-qr, ADR 40, peran mobile, security, dan backend; judul sama dengan peta naskah", () => {
    expect(dari("t4-qr")).toMatchObject({ ada: true, nomor: "4.19", jenis: "konsep", bagian: 4, inti: true, prasyarat: ["t4-m35"], lab: ["t4-qr"], tahap: 4, peran: ["mobile", "security", "backend"], adr: [40] });
    expect(dari("t4-m35").nomor).toBe("4.18");
    expect(naskah).toContain("| 4.19 | 4 | QR pembayaran: statis, dinamis, konfirmasi + ADR 40 | Konsep + ADR | ★ | t4-qr | tebak |");
    expect(frontmatter).toContain(`title: "4.19 ${dari("t4-qr").judul}"`);
    expect(dari("t4-qr").judul).toBe("QR pembayaran: statis, dinamis, konfirmasi + ADR 40");
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-m35\]\] · Jalur inti<\/p>/);
    expect(dari("t4-qr").menit).toBe(Number(m[1]) + Number(m[2]));
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
    expect(badan.match(/<Snippet /g)).toHaveLength(15);
    expect(berkasSnippet).toHaveLength(12);
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
    const kolom = adr40.split(" | ")[2]!;
    const opsi = cocok(kolom, /^([^(]*?) \(.*?\); ([^(]*?) \(.*?\); ([^(]*?) \(/).slice(1).map((x) => x.toLowerCase());
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
    harus("Pembeli diminta meminta merchant menampilkan QR yang baru (`dinamis.txt` bagian D).");
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
    harus("Yang diperiksa hanya panjang alasan, 20 sampai 200 karakter, dan laju laporan per akun.");
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
    const diharapkan: [string, string][] = [
      ["labs/t4-qr/output/crc.txt", cr(C, (b) => b.startsWith("$ qrlab buat -jenis dinamis"), (b) => b === "(10 rows)")],
      ["labs/api-t4/internal/qrpayload/qrpayload.go", `${awalFungsi(P, "PasangCRC")}:${akhirFungsi(P, "PasangCRC")}`],
      ["labs/api-t4/internal/service/qr.go", `${switch0}:${jumlah0 + 1}`],
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
    expect(L.teks(Number(berkasSnippet[9]![1].split(":")[0]), Number(berkasSnippet[9]![1].split(":")[1]))).toContain("QR ini tampak janggal");
    expect(P.teks(66, 66)).toContain("func CRC16(");
    expect(D.nomor((b) => b === "# jam server: dibuat + 301 detik") > Number(berkasSnippet[5]![1].split(":")[1])).toBe(true);
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
    harus("itu peringatan umum lembaga di Amerika Serikat, tanpa statistik kasus, dan fokus utamanya tautan berbahaya, bukan QR pembayaran merchant.");
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
    expect(s[2]!.teks).toBe(`Sesudah ${DETIK_BERLAKU} detik: ${cocok(dD, /HTTP\/1\.1 (410) Gone/)[1]}`);
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
    expect([i("R4-187") + 1, i("R4-187") + 2, i("R4-187") + 3, i("R4-187") + 4, i("R4-187") + 5]).toEqual([i("R4-200"), i("R4-201"), i("R4-202"), i("R4-203"), i("R4-204")]);
    expect(i("R4-204") + 1).toBe(i("R4-300"));
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
