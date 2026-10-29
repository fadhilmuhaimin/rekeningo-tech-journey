// Penjaga halaman 4.15 (keputusan 1322 sampai 1324): angka, ID, nomor ADR, versi sumber, tautan, rentang Snippet, tabel, klaim "tidak ada"
// atau "hanya", dan kalimat mekanisme di object-storage-presigned.mdx, diagram t4-storage-inti.json, tebakan t4-storage-tebak.json, data banding
// t4-storage-banding.json, dan halaman istilah presigned-url.json diturunkan dari rekaman labs/t4-storage/output, kode labs/api-t4, naskah,
// registry, dan RISET, bukan dari daftar yang ditulis sendiri. Pola: timeout-retry-breaker.halaman.test.ts.
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman dan JSON dikunci per baris di
// object-storage-presigned.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks
// sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/object-storage-presigned.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci: kalimat tentang kode (server membaca tiap objek, audit sebelum baca, kunci tidak unik,
// file yatim) diperiksa terhadap kodenya, dan kalimat tentang dokumentasi luar terhadap baris RISET yang memuat kutipannya.
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t4-storage-inti.json";
import tebakMentah from "../../data/widget/t4-storage-tebak.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DataTebak } from "../widgets/tebak/skema";
import { HalamanIstilah } from "./istilah";
import { KALIMAT_TERKUNCI, KUNCI_JSON } from "./object-storage-presigned.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const HALAMAN = "situs/src/content/docs/tahap-4/object-storage-presigned.mdx";
const halaman = baca(HALAMAN);
const badanHalaman = halaman.slice(halaman.indexOf("<Blok"));
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const presignTxt = baca("labs/t4-storage/output/presign.txt");
const unggahTxt = baca("labs/t4-storage/output/unggah.txt");
const unduhTxt = baca("labs/t4-storage/output/unduh.txt");
const retensiTxt = baca("labs/t4-storage/output/retensi.txt");
const ukuranTxt = baca("labs/t4-storage/output/ukuran.txt");
const readme = baca("labs/t4-storage/README.md");
const kodeBerkas = baca("labs/api-t4/internal/service/berkas.go");
const kodeBo = baca("labs/api-t4/internal/service/bo.go");
const kodeS3 = baca("labs/api-t4/internal/objek/s3.go");
const kodePembayaran = baca("labs/api-t4/internal/handler/handler_pembayaran.go");
const kodeRepoBerkas = baca("labs/api-t4/internal/repo/berkas.go");
const migrasi = baca("labs/api-t4/migrasi/000022_verifikasi_qr.up.sql");
const skemaData = baca("situs/src/content/docs/tahap-4/skema-data.mdx");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tebakBerkas = "situs/data/widget/t4-storage-tebak.json";
const bandingBerkas = "situs/lama/widgets/data/t4-storage-banding.json";
const banding = JSON.parse(baca(bandingBerkas)) as Banding;
const istilahBerkas = "situs/data/halaman-istilah/presigned-url.json";
const istilah = JSON.parse(baca(istilahBerkas)) as { istilah: string; sehari_hari: string; cerita: { rujukan: string; teks: string }[]; mekanisme: string[]; stack: null; jebakan: string[]; terkait: string[]; sumber: { riset?: string; url?: string; rekaman?: string; judul: string; catatan: string }[] };
const tanpaKunci = process.env.TANPA_KUNCI === "1";

interface Banding {
  judul: string;
  opsi: { id: string; nama: string; baris: { id: string; label: string; sub?: string }[][]; judulBaris?: string[] }[];
  fitur: { label: string; sorot: Record<string, string[]>; catatan: Record<string, string>; nada?: Record<string, string> }[];
}
interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[]; topik?: string; bagian?: number }
const hal = registry.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};

// ---- pembaca rekaman ---------------------------------------------------------------------------
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
const P = pecah(presignTxt);
const G = pecah(unggahTxt);
const U = pecah(unduhTxt);
const T = pecah(retensiTxt);
const K = pecah(ukuranTxt);
const bagian = (semua: Record<string, Bagian>, huruf: string): string[] => {
  const b = semua[huruf];
  if (!b) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  return b.baris;
};
const cari = (pola: RegExp, baris: string[], nama: string): RegExpMatchArray => {
  const m = baris.map((x) => x.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const noBaris = (teks: string, awalan: string, dari = 1): number => {
  const i = teks.split("\n").findIndex((b, k) => k + 1 >= dari && b.startsWith(awalan));
  if (i < 0) throw new Error(`jangkar tidak ditemukan: ${awalan}`);
  return i + 1;
};
const num = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const harus = (kalimat: string): void => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const H1 = (fragmen: string, n = 1): void => expect(halaman.split(fragmen).length - 1, `kemunculan "${fragmen.slice(0, 70)}"`).toBe(n);
const baris = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const tabel = (awalan: string, kol: number): string[][] => {
  const semua = halaman.slice(halaman.indexOf(awalan)).split("\n");
  const keluar: string[][] = [];
  for (const b of semua) { if (!b.startsWith("|")) break; keluar.push(b.split("|").slice(1, -1).map((x) => x.trim())); }
  expect(keluar.every((x) => x.length === kol), `kolom tabel ${awalan}`).toBe(true);
  return keluar;
};

// ---- nilai turunan dari rekaman ----------------------------------------------------------------
const PA = bagian(P, "A"), PB = bagian(P, "B"), PC = bagian(P, "C"), PD = bagian(P, "D"), PE = bagian(P, "E"), PF = bagian(P, "F"), PG = bagian(P, "G"), PH = bagian(P, "H");
const umurLab = Number(cari(/^ {2}X-Amz-Expires = (\d+)$/, PA, "umur lab")[1]);
const put1 = num(cari(/^PUT pertama dari app Dina, ([\d.]+) byte: HTTP 200$/, PB, "PUT pertama")[1]!);
const put2 = num(cari(/^PUT kedua dari pemegang lain \(proses lain, isi lain, ([\d.]+) byte\): HTTP 200$/, PB, "PUT kedua")[1]!);
const isiAkhir = num(cari(/^isi objek sekarang: ([\d.]+) byte, milik pemegang lain: ya$/, PB, "isi akhir")[1]!);
const ditolakC = cari(/^PUT sesudah umur lewat: HTTP (\d+) AccessDenied$/, PC, "ditolak C")[1];
const lamaD = cari(/^dibuat (\d+) menit lalu, umur (\d+) detik \(sudah lewat 5 menit\): HTTP (\d+) AccessDenied$/, PD, "lama D");
const depanD = cari(/^dibuat dengan tanggal (\d+) menit di depan, umur (\d+) detik: HTTP (\d+)$/, PD, "depan D");
const maksD = cari(/^X-Amz-Expires (\d+) \((\d+) hari, batas atas dokumentasi SigV4\): HTTP (\d+)$/, PD, "maks D");
const lebihD = cari(/^X-Amz-Expires (\d+): HTTP (\d+) AuthorizationQueryParametersError$/, PD, "lebih D");
const tolakE = PE.filter((b) => /HTTP 403 (SignatureDoesNotMatch|AccessDenied)$/.test(b)).length;
const lima = num(cari(/^PUT ([\d.]+) byte lewat URL tanpa ukuran ditandatangani: HTTP 200$/, PF, "5 MiB")[1]!);
const ukuranTtd = num(cari(/\{"ukuran_kartu":(\d+)\}/, PF, "ukuran ditandatangani")[1]!);
const lebihF = cari(/^PUT ([\d.]+) byte \(ditandatangani ([\d.]+)\): HTTP 403 SignatureDoesNotMatch$/, PF, "lebih F");
const kurangF = cari(/^PUT (\d+) byte: HTTP 403 SignatureDoesNotMatch$/, PF, "kurang F");
const pasFF = cari(/^PUT ([\d.]+) byte: HTTP 200$/, PF.filter((b) => !b.includes("tanpa ukuran")), "pas F");
const badDigest = cari(/^checksum beda: HTTP (\d+) BadDigest$/, PG, "BadDigest")[1];
const logH = Number(cari(/^baris log SeaweedFS yang memuat X-Amz-Signature atau X-Amz-Credential sesudah semua permintaan di atas: (\d+)$/, PH, "log H")[1]);

const GA = bagian(G, "A"), GB = bagian(G, "B"), GC = bagian(G, "C"), GD = bagian(G, "D"), GE = bagian(G, "E");
const byteA = num(cari(/^PUT kartu ([\d.]+) byte dan swafoto ([\d.]+) byte langsung/, GA, "byte A")[1]!);
const satuMiB = num(cari(/^kartu tepat 1 MiB \(([\d.]+) byte\): HTTP 202$/, GC, "1 MiB")[1]!);
const lebihMiB = num(cari(/^penyimpanan menerima kartu 1 MiB \+ 1 byte \(([\d.]+) byte\) lewat URL: HTTP 200/, GC, "1 MiB + 1")[1]!);
const logBaris = Number(cari(/^log server: (\d+) baris; memuat nomor identitas.*: tidak$/, GE, "log E")[1]);

const UA = bagian(U, "A"), UB = bagian(U, "B"), UC = bagian(U, "C"), UD = bagian(U, "D");
const byteUnduh = num(cari(/^isi unduhan ([\d.]+) byte, SHA-256 sama/, UA, "byte unduh")[1]!);
const auditB = cari(/^baris audit buka_berkas sebelum dan sesudah keempat percobaan: (\d+) dan (\d+)$/, UB, "audit B");
const percobaanB = UB.filter((b) => /: HTTP \d+$/.test(b)).map((b) => b.match(/HTTP (\d+)$/)![1]);
const urlC = UC.filter((b) => /^pemegang (pertama|kedua)/.test(b)).map((b) => b.match(/HTTP (\d+), ([\d.]+) byte/)!);
const auditC = Number(cari(/^baris audit buka_berkas sesudah dua unduhan lewat URL: (\d+) \(tetap\)/, UC, "audit C")[1]);
const statusD = Number(cari(/^unduh kartu sesudah ditimpa: HTTP (\d+)$/, UD, "status D")[1]);
const auditD = cari(/^baris audit bertambah satu: (\d+) jadi (\d+)$/, UD, "audit D");
const swafotoD = Number(cari(/^swafoto yang tidak ditimpa tetap bisa dibuka: HTTP (\d+)$/, UD, "swafoto D")[1]);

const TA = bagian(T, "A"), TB = bagian(T, "B"), TC = bagian(T, "C"), TD = bagian(T, "D"), TE = bagian(T, "E");
const masaSimpan = Number(cari(/^ 1\s+\| lulus\s+\| t\s+\| (\d+) days, 0:00:00$/, TA, "masa simpan")[1]);
const galatC = Number(cari(/diperiksa (\d+), dihapus (\d+), galat (\d+)/, TC, "galat C")[3]);
const hapusD = cari(/diperiksa (\d+), dihapus (\d+), galat (\d+)/, TD, "hapus D");
const status410 = Number(cari(/^GET \/bo\/verifikasi\/<A>\/berkas\/kartu sebagai Ratih: HTTP (\d+)$/, TE, "410")[1]);

const KA = bagian(K, "A"), KC = bagian(K, "C"), KD = bagian(K, "D");
const rasioA = KA.filter((b) => /^\d pengajuan \(.*\): rasio dump\/file = /.test(b)).map((b) => b.match(/rasio dump\/file = ([\d,]+)$/)![1]);
const rasioTeks = cari(/rasio dump\/file = ([\d,]+) /, KA.filter((b) => b.startsWith("# Dump teks")), "rasio teks")[1]!;
const panjang = cari(/^ \d+\s+\| (\d+)\s+\| (\d+)$/, KC, "panjang kunci");
const bawah001 = KC.filter((b) => b.includes("rasio dump/file di bawah 0,01: ya")).length;
const pengajuanA = KA.filter((b) => /^\d pengajuan \(/.test(b)).map((b) => Number(b[0]));

// ---- Asumsi naskah dan registry ------------------------------------------------------------------
const reg4 = (registry.tahap as unknown as { no: number; asumsi: Record<string, number | string> }[]).find((t) => t.no === 4)!.asumsi;
const reg5 = (registry.tahap as unknown as { no: number; asumsi: Record<string, number | string> }[]).find((t) => t.no === 5)!.asumsi;
const UNGGAH = Number(reg4.upload), FILE_KB = Number(reg4.fileKB), PUNCAK = Number(reg4.puncak), UNGGAH5 = Number(reg5.upload);
const posting = num(naskah.match(/`posting` ±44 juta \(20\.000 × 3 × 2 × 365 = ([\d,.]+) juta\)/)![1]!) * 1e6;
const BYTE_POSTING = Number(ukuranTxt.match(/x (\d+) B = /)?.[1] ?? NaN);
const perHari = UNGGAH * FILE_KB; // KB
const gbHari = perHari / 1e6;
const gbTahun = gbHari * 365;
const gbPosting = (posting * BYTE_POSTING) / 1e9;
const kali = gbTahun / gbPosting;
const lambda = (UNGGAH / 86400) * PUNCAK;
const kbDetik = lambda * FILE_KB;
const kbDetik5 = ((UNGGAH5 * FILE_KB) / 86400) * PUNCAK;
const base64 = (n: number): number => Math.ceil(n / 3) * 4;
const maksBodi = Number(kodePembayaran.match(/MaksBodyVerifikasi = (\d+) << 20/)![1]) * 1048576;
const maksBerkas = Number(baca("labs/api-t4/internal/service/verifikasi.go").match(/const MaksBerkasIdentitas = (\d+) << 20/)![1]) * 1048576;
const umurKode = Number(kodeBerkas.match(/const UmurPresign = (\d+) \* time\.Minute/)![1]);
const ambang = kodeBerkas.match(/AmbangEndpoint\["unggahan"\] = \[2\]float64\{(\d+), (\d+)\.0 \/ (\d+)\}/)!;

// rentang Snippet diturunkan dari kode dan rekaman
const rentangFungsi = (teks: string, awalan: string): string => {
  const a = noBaris(teks, awalan);
  const b = noBaris(teks, "}", a);
  return `${a}:${b}`;
};
const rentangSampai = (teks: string, awal: string, akhir: string, dariBaris = 1): string => {
  const a = noBaris(teks, awal, dariBaris);
  return `${a}:${noBaris(teks, akhir, a)}`;
};
const tag = [...halaman.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);

describe("rekaman dan kode: nilai turunan yang dipakai halaman", () => {
  test("presign.txt A sampai C: umur lab 5 detik, dua PUT 200, isi milik pemegang lain, 403 sesudah umur habis", () => {
    expect([umurLab, put1, put2, isiAkhir, ditolakC]).toEqual([5, 120000, 90000, 90000, "403"]);
    expect(PA.some((b) => b.startsWith("HTTP 201 (Cache-Control: no-store)"))).toBe(true);
    expect(PA.some((b) => b.includes("URL tidak memuat token sesi Dina"))).toBe(true);
    expect(PB.some((b) => b === "# PUT ke kunci yang sama menimpa objek tanpa peringatan; penyimpanan tidak menyimpan versi lama.")).toBe(true);
    expect(PC.some((b) => b === "objek tidak berubah oleh PUT yang ditolak: ya")).toBe(true);
  });
  test("presign.txt D sampai H: tanggal digeser, 604.800 dan 604.801, tiga penolakan 403, ukuran 5 MiB dan 1.000 byte, BadDigest, log 0", () => {
    expect([lamaD[1], lamaD[2], lamaD[3]]).toEqual(["10", "300", "403"]);
    expect([depanD[1], depanD[2], depanD[3]]).toEqual(["30", "300", "200"]);
    expect([maksD[1], maksD[2], maksD[3], lebihD[1], lebihD[2]]).toEqual(["604800", "7", "200", "604801", "400"]);
    expect(tolakE).toBe(4); // kunci diganti, metode diganti, GET tanpa tanda tangan, daftar isi tanpa tanda tangan
    expect(PE.filter((b) => /^(URL dengan kunci objek diganti|URL PUT dipakai untuk GET|GET objek tanpa tanda tangan|daftar isi bucket tanpa tanda tangan)/.test(b)).length).toBe(4);
    expect(lima).toBe(5 * 1048576);
    expect([ukuranTtd, num(lebihF[1]!), num(lebihF[2]!), Number(kurangF[1]), num(pasFF[1]!)]).toEqual([1000, 1001, 1000, 999, 1000]);
    expect(badDigest).toBe("400");
    expect(PG.some((b) => b === "objek dengan checksum beda tersimpan: tidak")).toBe(true);
    expect(logH).toBe(0);
  });
  test("unggah.txt: 500.000 byte, 202, checksum salah 422, 1 MiB lolos, 1 MiB + 1 byte 422 dan objek dihapus, lima baris log bersih", () => {
    expect(byteA).toBe(500000);
    expect(GA.some((b) => b === "HTTP 202")).toBe(true);
    expect(GB[0]).toBe("HTTP 422");
    expect(GB.some((b) => b === "baris verifikasi untuk akun itu: 0")).toBe(true);
    expect([satuMiB, lebihMiB]).toEqual([1048576, 1048577]);
    expect(GC.some((b) => b === "ajukan dengan kartu 1 MiB + 1 byte: HTTP 422")).toBe(true);
    expect(GC.some((b) => b === "objek di penyimpanan sesudah penolakan (HEAD): kartu tidak ada, swafoto tidak ada")).toBe(true);
    expect(GD.filter((b) => /: HTTP 422$/.test(b)).length).toBe(3);
    expect(GD.some((b) => b === "objek milik akun lain di penyimpanan sesudah penolakan: tetap ada")).toBe(true);
    expect(logBaris).toBe(5);
    expect(GE.some((b) => b === "jawaban galat memuat nomor identitas: tidak")).toBe(true);
    expect(GE.some((b) => b === "ajukan saat penyimpanan mati: HTTP 500")).toBe(true);
  });
  test("unduh.txt: Ratih 200, lima penolakan, audit 1 dan 1, URL GET dua pemegang 200 dan audit tetap, ditimpa 500 dan audit 1 jadi 2", () => {
    expect(byteUnduh).toBe(500000);
    expect(UA.some((b) => b.startsWith("GET /bo/verifikasi/1/berkas/kartu?alasan=... sebagai Ratih (risk): HTTP 200"))).toBe(true);
    expect(UA.some((b) => b === "Content-Type: application/octet-stream")).toBe(true);
    expect(UA.some((b) => b === "X-Content-Type-Options: nosniff")).toBe(true);
    expect(UA.some((b) => b === "Cache-Control: no-store")).toBe(true);
    expect(UA.some((b) => b === "rantai audit dihitung ulang: utuh = true")).toBe(true);
    expect(percobaanB).toEqual(["403", "403", "401", "422", "422"]);
    expect([auditB[1], auditB[2]]).toEqual(["1", "1"]);
    expect(UC.some((b) => b === "GET objek langsung ke penyimpanan tanpa tanda tangan: HTTP 403 AccessDenied")).toBe(true);
    expect(urlC.map((m) => [m[1], num(m[2]!)])).toEqual([["200", 500000], ["200", 500000]]);
    expect(auditC).toBe(1);
    expect([statusD, auditD[1], auditD[2], swafotoD]).toEqual([500, "1", "2", 200]);
    expect(UD.some((b) => b.includes('"/problems/berkas-rusak"'))).toBe(true);
  });
  test("catatan rekaman: unduh.txt B menulis keempat percobaan padahal lima tertulis, dan penolakan tidak menulis audit", () => {
    expect(percobaanB.length).toBe(5);
    expect(UB.some((b) => b.includes("sebelum dan sesudah keempat percobaan"))).toBe(true);
    expect(UB[0]).toBe("Dina (pemilik pengajuan): HTTP 403");
    expect(UB.some((b) => b === "Ratih tanpa alasan: HTTP 422")).toBe(true);
    expect(UB.some((b) => b === "Ratih dengan alasan 6 karakter (minimal 20): HTTP 422")).toBe(true);
    expect(UD.some((b) => b.includes("File aslinya sudah hilang: penyimpanan tidak menyimpan versi lama"))).toBe(true);
  });
  test("retensi.txt: masa simpan 30 hari, 29 hari dan sedetik sebelum batas 0 dihapus, tepat di batas 1 dihapus, penyimpanan mati galat 1, 410", () => {
    expect(masaSimpan).toBe(30);
    expect(TA.filter((b) => /\| (lulus|ditolak|gagal)\s+\| t\s+\| 30 days, 0:00:00$/.test(b)).length).toBe(3);
    expect(TB.filter((b) => b === "retensi identitas: diperiksa 0, dihapus 0, galat 0").length).toBe(2);
    expect(galatC).toBe(1);
    expect(TC.some((b) => b.includes("diperiksa 1, dihapus 0, galat 1"))).toBe(true);
    expect([hapusD[1], hapusD[2], hapusD[3]]).toEqual(["1", "1", "0"]);
    expect(TD.some((b) => b.includes("Putaran kedua dengan jam yang sama tidak memeriksa apa pun"))).toBe(true);
    expect(status410).toBe(410);
    expect(TE.some((b) => b === "baris audit buka_berkas bertambah satu: 0 jadi 1")).toBe(true);
    expect(retensiTxt).toContain("# --- B. Job retensi dengan jam diperankan: 29 hari, satu detik sebelum batas");
    expect(TD.some((b) => b.includes("tepat di batas dihapus (hapus_pada <= sekarang)")) || readme.includes("hapus_pada <= sekarang")).toBe(true);
  });
  test("ukuran.txt: rasio 1,1 pada 2, 4, dan 8 pengajuan, dump teks 2,0, objek di bawah 0,01, kunci 48 dan checksum 64", () => {
    expect(pengajuanA).toEqual([2, 4, 8]);
    expect(rasioA).toEqual(["1,1", "1,1", "1,1"]);
    expect(rasioTeks).toBe("2,0");
    expect(bawah001).toBe(3);
    expect([panjang[1], panjang[2]]).toEqual(["48", "64"]);
    expect(KD.some((b) => b.startsWith("bagian file di bytea = 28,00 / (28,00 + 0,84) = 97,1%"))).toBe(true);
  });
  test("Asumsi dan hitungan: 2.000 × 500 KB, 365 GB, 10,95 GB, 33,3 kali, 0,2315 per detik, 115,7 dan 1.157 KB per detik, base64", () => {
    expect([UNGGAH, FILE_KB, PUNCAK, UNGGAH5, BYTE_POSTING]).toEqual([2000, 500, 10, 20000, 250]);
    expect(posting).toBe(43800000);
    expect(perHari).toBe(1000000);
    expect(gbHari).toBe(1);
    expect(gbTahun).toBe(365);
    expect(gbPosting).toBeCloseTo(10.95, 10);
    expect(kali.toFixed(1)).toBe("33.3");
    expect(lambda.toFixed(4)).toBe("0.2315");
    expect(kbDetik.toFixed(1)).toBe("115.7");
    expect(Math.round(kbDetik)).toBe(116);
    expect(Math.round(kbDetik5)).toBe(1157);
    expect(Math.round(kbDetik5 / kbDetik)).toBe(10);
    expect(base64(500000)).toBe(666668);
    expect(2 * base64(500000)).toBe(1333336);
    expect(maksBodi).toBe(3145728);
    expect(2 * base64(500000)).toBeLessThan(maksBodi);
    expect(base64(2 * maksBerkas)).toBeLessThan(maksBodi);
    expect(skemaData).toContain("365 GB per tahun, 33 kali posting");
    expect(skemaData).toContain("43.800.000 posting × 250 byte");
  });
  test("kode: umur 5 menit, batas 1 MiB, tiga URL per akun per jam, server membaca tiap objek, audit sebelum baca, checksum, kunci tidak unik, file yatim", () => {
    expect(umurKode).toBe(5);
    expect(maksBerkas).toBe(1048576);
    expect([ambang[1], ambang[2], ambang[3]]).toEqual(["3", "3", "3600"]);
    // periksaObjek: HEAD (Ukuran) lebih dulu, lalu Baca, lalu tipe, lalu checksum hitungan server
    const fungsi = kodeBerkas.slice(kodeBerkas.indexOf("func (s Service) periksaObjek("));
    const urutan = ["s.t4.Objek.Ukuran(", "s.t4.Objek.Baca(", "periksaGambar(", "checksum(isi)", "strings.EqualFold("].map((x) => fungsi.indexOf(x));
    expect(urutan.every((x) => x > 0)).toBe(true);
    expect([...urutan].sort((a, b) => a - b)).toEqual(urutan);
    // BukaBerkas: Audit di dalam DalamTx sebelum Baca; checksum sesudah Baca
    const bo = kodeBo.slice(kodeBo.indexOf("func (s Service) BukaBerkas("));
    const u2 = ["s.petugasRisk(", "periksaAlasan(", "s.repo.DalamTx(", "s.Audit(", "s.t4.Objek.Baca(", "sha256.Sum256(", "ErrBerkasRusak"].map((x) => bo.indexOf(x));
    expect(u2.every((x) => x > 0)).toBe(true);
    expect([...u2].sort((a, b) => a - b)).toEqual(u2);
    // gagal pemeriksaan peran dan alasan terjadi sebelum transaction audit: penolakan tidak menulis baris
    expect(bo.indexOf("s.petugasRisk(")).toBeLessThan(bo.indexOf("s.Audit("));
    expect(bo.indexOf("periksaAlasan(")).toBeLessThan(bo.indexOf("s.Audit("));
    // PresignPUT: panjang ditandatangani hanya bila ukuran > 0
    expect(kodeS3).toContain('if ukuran > 0 {\n\t\th = map[string]string{"content-length": fmt.Sprint(ukuran)}');
    // jalur lama: JSON base64 dengan batas badan 3 MiB
    expect(kodePembayaran).toContain("MaksBodyVerifikasi = 3 << 20");
    expect(kodePembayaran).toContain("r.Body = http.MaxBytesReader(w, r.Body, MaksBodyVerifikasi)");
    // klaim negatif berlingkup: indeks unik pada berkas_kartu_kunci tidak ada di semua migration api-t4
    const dirMigrasi = "labs/api-t4/migrasi";
    const semuaMigrasi = fs.readdirSync(path.join(akar, dirMigrasi)).filter((f) => f.endsWith(".sql")).map((f) => baca(`${dirMigrasi}/${f}`)).join("\n");
    expect(semuaMigrasi).toMatch(/berkas_kartu_kunci\s+text\s+NOT NULL/);
    expect(semuaMigrasi).not.toMatch(/UNIQUE[^;]*berkas_kartu_kunci|berkas_kartu_kunci[^;]*UNIQUE/i);
    expect(migrasi).toContain("CREATE UNIQUE INDEX verifikasi_satu_berjalan ON verifikasi (akun_id, subjek) WHERE status IN ('diajukan', 'tidak_pasti')");
    // job retensi hanya memilih baris verifikasi dengan hapus_pada; tidak ada pemindai objek yatim
    expect(kodeRepoBerkas).toContain("SELECT id, berkas_kartu_kunci, berkas_swafoto_kunci FROM verifikasi");
    expect(kodeRepoBerkas).toContain("WHERE hapus_pada <= $1");
    expect(kodeBerkas).toContain("func (s Service) HapusBerkasJatuhTempo(");
    expect(readme).toContain("Pembersihan file yatim");
    // padanan preventOverwrite: tidak ada di kode api-t4 (cari semua .go yang bukan tes)
    const adaGo = (dir: string, pola: RegExp): string[] => {
      const keluar: string[] = [];
      const jalan = (d: string): void => {
        for (const e of fs.readdirSync(path.join(akar, d), { withFileTypes: true })) {
          const rel = `${d}/${e.name}`;
          if (e.isDirectory()) jalan(rel);
          else if (e.name.endsWith(".go") && !e.name.endsWith("_test.go") && pola.test(baca(rel))) keluar.push(rel);
        }
      };
      jalan(dir);
      return keluar;
    };
    expect(adaGo("labs/api-t4", /If-None-Match|preventOverwrite|IfNoneMatch/i)).toEqual([]);
  });
  test("tes Go dan tabel hasil yang disebut halaman ada di README lab", () => {
    expect(readme).toContain("| `presign.txt` |");
    expect(readme).toContain("| `unduh.txt` |");
    expect(readme).toContain("Ukuran bisa ditegakkan saat unggah");
    expect(readme).toContain("Nomor identitas");
    expect(readme).toContain("File ditimpa sesudah diterima");
  });
});

describe("object-storage-presigned.mdx: tiap angka turunan dari rekaman, kode, naskah, dan RISET", () => {
  test("Inti dan Rantai", () => {
    harus(`URL unggah berumur ${umurKode} menit bisa dipakai siapa pun yang memegangnya, termasuk untuk menimpa file.`);
    harus(`app Dina mengirim ${titik(put1)} byte dan pemegang lain mengirim ${titik(put2)} byte lewat URL yang sama (\`presign.txt\` bagian B)`);
    harus("Sesudah umur URL habis, PUT ditolak dengan 403 (bagian C).");
    harus("Server juga menyimpan checksum, yaitu sidik SHA-256 dari isi file");
    const r = DataRantai.parse(rantaiMentah);
    expect(r.baris.length).toBe(2);
    expect(r.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-storage, presign.txt B dan C" });
    expect(r.baris[0]!.simpul.map((s) => s.teks)).toEqual([`PUT ${titik(put1)} byte`, `PUT ${titik(put2)} byte`, `isi: ${titik(isiAkhir)} byte`]);
    expect(r.baris[0]!.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "warn"]);
    expect(r.baris[1]!.simpul.map((s) => s.teks)).toEqual(["PUT lagi", `ditolak ${ditolakC}`, "isi tidak berubah"]);
    expect(r.baris[1]!.sub).toBe(`${umurLab} detik di lab`);
    expect(r.baris[1]!.simpul.map((s) => s.nada)).toEqual(["biasa", "biasa", "good"]);
    expect(r.catatan).toBe(`Umur URL di lab ${umurLab} detik supaya kedaluwarsa bisa ditunggu. ADR 38 memakai ${umurKode} menit (Asumsi).`);
  });
  test("Tebak: pilihan benar di posisi kedua, bukan yang terpanjang, angka dari presign.txt B dan C", () => {
    const d = DataTebak.parse(tebakMentah);
    expect(d.pilihan.map((p) => p.benar)).toEqual([false, true, false, false]);
    const panjangBenar = d.pilihan[1]!.teks.length;
    expect(Math.max(...d.pilihan.map((p) => p.teks.length))).toBeGreaterThan(panjangBenar);
    expect(Math.min(...d.pilihan.map((p) => p.teks.length))).toBeLessThan(panjangBenar);
    expect(d.adegan[0]).toContain(`${titik(put1)} byte`);
    expect(d.adegan[1]).toContain(`${titik(put2)} byte`);
    expect(d.pilihan[1]!.teks).toContain(`${titik(isiAkhir)} byte milik pemegang lain`);
    expect(d.pilihan[0]!.teks).toContain(`${titik(put1)} byte milik Dina`);
    expect(d.pilihan[1]!.alasan).toContain(`isi objek sekarang ${titik(isiAkhir)} byte milik pemegang lain`);
    expect(d.pilihan[2]!.alasan).toContain("(presign.txt bagian A dan B)");
    expect(d.pilihan[0]!.alasan).toContain("Penyimpanan menjawab 200 untuk PUT kedua");
    expect(d.penutup).toContain(`PUT ditolak ${ditolakC} (bagian C)`);
    expect(d.sumber.teks).toBe("labs/t4-storage/output/presign.txt bagian A, B, dan C");
    expect(d.sumber.jenis).toBe("rekaman");
    harus('<Tebak client:visible data={dataTebak} />');
    harus(`PUT kedua diterima dan menimpa objek, jadi isinya ${titik(isiAkhir)} byte milik pemegang lain (presign.txt bagian B).`);
    expect(dari("t4-storage").lab).toEqual(["t4-storage"]);
  });
  test("banding: data valid, empat kejadian, catatan memuat angka dari unduh.txt, satu catatan berlabel Tidak dijalankan", () => {
    const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/banding.js")) as { cekData: (d: unknown) => string[] };
    expect(core.cekData(banding)).toEqual([]);
    expect(banding.opsi.map((o) => o.id)).toEqual(["unduh-url", "server"]);
    expect(banding.fitur.map((f) => f.label)).toEqual(["Staf risk membuka file", "URL dikirim ke orang lain", "Alasan tidak diisi", "File sudah ditimpa"]);
    const c = banding.fitur.map((f) => f.catatan);
    expect(c[0]!["unduh-url"]).toBe(`Pemegang pertama mendapat ${urlC[0]![1]} dan ${titik(num(urlC[0]![2]!))} byte, dan baris audit tetap ${auditC} (unduh.txt bagian C).`);
    expect(c[0]!.server).toContain(`mendapat 200 dan ${titik(byteUnduh)} byte`);
    expect(c[0]!.server).toContain("(unduh.txt bagian A)");
    expect(c[1]!["unduh-url"]).toBe(`Pemegang kedua juga mendapat ${urlC[1]![1]} dan ${titik(num(urlC[1]![2]!))} byte, dan baris audit tetap ${auditC} (unduh.txt bagian C).`);
    expect(c[1]!.server).toBe(`Tidak ada URL yang bisa dikirim ulang. Dina dan Eko ditolak ${percobaanB[0]}, permintaan tanpa token ${percobaanB[2]}, dan baris audit tetap ${auditB[2]} (unduh.txt bagian B).`);
    expect(c[2]!.server).toBe(`Ratih tanpa alasan dijawab ${percobaanB[3]}, dan alasan 6 karakter (minimal 20) juga ${percobaanB[4]}. Baris audit tetap ${auditB[2]} (unduh.txt bagian B).`);
    expect(c[3]!.server).toBe(`Unduh kartu yang ditimpa dijawab ${statusD} karena checksum tidak cocok. Baris audit naik dari ${auditD[1]} ke ${auditD[2]}, dan swafoto yang tidak ditimpa tetap ${swafotoD} (unduh.txt bagian D).`);
    expect(c[3]!["unduh-url"]).toContain("Tidak dijalankan: dibaca dari kode");
    expect(c.filter((x) => x["unduh-url"].includes("Tidak dijalankan")).length).toBe(1);
    expect(c.filter((x) => x.server.includes("Tidak dijalankan")).length).toBe(0);
    expect(c[2]!["unduh-url"]).toBe("Tidak ada tempat memeriksa alasan: URL dibuat penanda tangan lab, bukan endpoint server (unduh.txt bagian C).");
    expect(kodeBo).toContain("ErrBerkasRusak");
    expect(banding.fitur.map((f) => f.nada?.["unduh-url"])).toEqual(["warn", "warn", "warn", "warn"]);
    harus('<WidgetLama nama="banding" src="data/t4-storage-banding.json" />');
    harus('<SkripLama daftar={["cerita","banding"]} />');
    harus("**Ubah satu hal:** pilih Staf risk membuka file, lalu URL dikirim ke orang lain.");
    expect(banding.fitur[0]!.label).toBe("Staf risk membuka file");
    expect(banding.fitur[1]!.label).toBe("URL dikirim ke orang lain");
  });
  test("Paham: kunci 48 dan checksum 64, rasio dump, tabel Hitungan dari rumus, tabel hasil unggah.txt", () => {
    harus(`kunci objek panjangnya ${panjang[1]} karakter dan checksum ${panjang[2]} karakter (\`ukuran.txt\` bagian C)`);
    harus(`Rasio dump terhadap byte file ${rasioA[0]} pada ${pengajuanA[0]}, ${pengajuanA[1]}, dan ${pengajuanA[2]} pengajuan, dan ${rasioTeks} untuk dump teks (bagian A).`);
    harus("rasio itu di bawah 0,01 pada ukuran yang sama (bagian C)");
    const t = tabel("| Besaran | Rumus | Hasil |", 3);
    expect(t[2]!).toEqual(["File per hari", `${titik(UNGGAH)} × ${FILE_KB} KB`, `${titik(perHari)} KB, yaitu ${gbHari} GB`]);
    expect(t[3]!).toEqual(["File per tahun", `${gbHari} GB × 365`, `${gbTahun} GB`]);
    expect(t[4]!).toEqual(["Posting per tahun", `${koma(posting / 1e6, 1)} juta × ${BYTE_POSTING} byte`, `${koma(gbPosting, 2)} GB`]);
    expect(t[5]!).toEqual(["File lawan posting", `${gbTahun} ÷ ${koma(gbPosting, 2)}`, `${koma(kali, 1)} kali`]);
    expect(t[6]!).toEqual(["Unggahan puncak", `${titik(UNGGAH)} ÷ 86.400 × ${PUNCAK}`, `${koma(lambda, 4)} per detik`]);
    expect(t[7]!).toEqual(["Byte puncak", `${koma(lambda, 4)} × ${FILE_KB} KB`, `${koma(kbDetik, 1)} KB, dibulatkan ${Math.round(kbDetik)} KB per detik`]);
    harus(`Unggahan ${titik(UNGGAH)} per hari, ${FILE_KB} KB per file (1 KB = 1.000 byte), dan faktor puncak ${PUNCAK}. Posting ${koma(posting / 1e6, 1)} juta per tahun dengan ${BYTE_POSTING} byte tiap posting.`);
    const h = tabel("| Kejadian | Jawaban | Sumber |", 3);
    expect(h.slice(2).map((x) => x[0])).toEqual(["Checksum dari app salah", `Kartu tepat 1 MiB (${titik(satuMiB)} byte)`, "Kartu 1 MiB + 1 byte", "PDF di kunci kartu", "Kartu belum diunggah", "Kunci milik akun lain"]);
    expect(h[2]![1]).toBe("422, kedua objek dihapus, 0 baris `verifikasi`");
    expect(h[3]![1]).toBe("202");
    expect(h[4]![1]).toBe("penyimpanan 200, server 422, objek dihapus");
    expect(h[5]![1]).toBe(`422 \`${GD.find((b) => b.includes("harus gambar"))!.match(/"pesan":"([^"]+)"/)![1]}\``);
    expect(h[6]![1]).toBe(`422 \`${GD.find((b) => b.includes("belum diunggah") && b.includes("pesan"))!.match(/"pesan":"([^"]+)"/)![1]}\``);
    expect(h[7]![1]).toBe("422, objek milik akun itu tetap ada");
    expect(lebihMiB).toBe(satuMiB + 1);
  });
  test("Paham: URL unggah, umur, tanggal digeser, penolakan, ukuran, checksum, ditimpa, versioning, audit, URL GET, retensi, log", () => {
    harus(`URL tidak memuat token sesi Dina, dan jawaban yang membawanya berheader \`Cache-Control: no-store\` (bagian A). Sesudah umur ${umurLab} detik di lab, PUT ditolak ${ditolakC} dan objek tidak berubah (bagian C).`);
    harus(`URL bertanggal ${lamaD[1]} menit lalu dengan umur ${lamaD[2]} detik ditolak ${lamaD[3]}. URL bertanggal ${depanD[1]} menit di depan diterima ${depanD[3]} (bagian D).`);
    harus(`Kunci diganti, metode diganti (URL PUT dipakai untuk GET), dan permintaan tanpa tanda tangan semuanya ditolak 403 (bagian E). Umur paling lama ${titik(Number(maksD[1]))} detik, yaitu ${maksD[2]} hari, dan ${titik(Number(lebihD[1]))} ditolak ${lebihD[2]} (bagian D).`);
    harus(`URL tanpa panjang menerima ${titik(lima)} byte, yaitu 5 MiB.`);
    harus(`PUT ${titik(num(lebihF[1]!))} byte atau ${kurangF[1]} byte untuk URL ${titik(ukuranTtd)} byte ditolak 403 (bagian F).`);
    harus(`ditolak ${badDigest} \`BadDigest\` tanpa menyimpan objek (bagian G)`);
    harus(`Server baru tahu saat file diunduh:`);
    harus("Isi aslinya hilang, karena penyimpanan di lab tidak menyimpan versi lama.");
    harus(`dengan \`Content-Type: application/octet-stream\`, \`nosniff\`, dan \`no-store\`. Isinya ${titik(byteUnduh)} byte dengan SHA-256 sama seperti yang diunggah, dan satu baris audit tertulis (\`unduh.txt\` bagian A). Lima percobaan lain ditolak: Dina ${percobaanB[0]}, Eko ${percobaanB[1]}, tanpa token ${percobaanB[2]}, Ratih tanpa alasan ${percobaanB[3]}, dan alasan 6 karakter ${percobaanB[4]}. Baris audit tetap ${auditB[2]} (bagian B).`);
    harus(`keduanya mendapat ${urlC[0]![1]} dan ${titik(num(urlC[0]![2]!))} byte. Baris audit tetap ${auditC} (bagian C).`);
    harus(`file lulus, ditolak, dan gagal punya masa simpan tepat ${masaSimpan} hari (bagian A)`);
    harus(`menghapus 0 file pada hari ke-29 dan 1 detik sebelum batas. Tepat di batas ia menghapus, karena aturannya \`hapus_pada <= sekarang\` (bagian B dan D).`);
    harus(`job mencatat galat ${galatC}, baris belum ditandai, dan file diulang pada putaran berikutnya (bagian C).`);
    harus(`Putaran kedua dengan jam yang sama memeriksa 0 baris.`);
    harus(`membuka file dijawab ${status410}, dengan percobaan yang tetap tercatat (bagian E).`);
    harus(`pengajuan dijawab ${GE.find((b) => b.startsWith("ajukan saat penyimpanan mati"))!.match(/HTTP (\d+)/)![1]} dan log memuat galat koneksi tanpa URL.`);
    harus(`Log dua proses server berisi ${logBaris} baris. Tidak satu pun memuat nomor identitas, tanda tangan URL, byte file, kunci objek, atau token sesi (\`unggah.txt\` bagian E).`);
    harus(`Log container SeaweedFS pada setelan lab memuat ${logH} baris dengan \`X-Amz-Signature\` atau \`X-Amz-Credential\` (\`presign.txt\` bagian H).`);
    harus("lab menerimanya sebagai masukan 16 angka yang dibuang (Asumsi lab)");
    expect(readme).toContain("masukan yang diperiksa bentuknya lalu dibuang (Asumsi lab, 16 angka)");
    harus("Penolakan peran dan alasan tidak menulis baris audit di lab ini.");
    harus("Membuat ukuran wajib adalah keputusan produk yang belum diambil.");
    harus("Karena server tetap membaca tiap file, byte tidak hilang dari server.");
    harus("kecepatan unggah dari HP tidak diukur");
  });
  test("Snippet: rentang diturunkan dari fungsi dan bagian rekaman, tanpa komentar lab internal", () => {
    const hasil = tag.map((t) => ({ file: t.match(/file=\{?[`"]([^`"]+)[`"]/)?.[1], files: t.match(/files=\{\[([^\]]+)\]\}/)?.[1], lines: t.match(/lines="([^"]+)"/)?.[1], judul: t.match(/title=\{?[`"]([^`"]+)[`"]/)?.[1] }));
    const berkasAwal = noBaris(kodeBo, "func (s Service) BukaBerkas(");
    const auditAwal = noBaris(kodeBo, "\t\tv, err := tx.Verifikasi(ctx, id)", berkasAwal) - 2;
    const auditAkhir = noBaris(kodeBo, "\t})", auditAwal);
    const bacaAwal = noBaris(kodeBo, "\tisi, err := s.t4.Objek.Baca(ctx, kunci)", auditAkhir);
    const bacaAkhir = noBaris(kodeBo, "\treturn isi, nil", bacaAwal);
    const unduhD = noBaris(unduhTxt, "unduh kartu sesudah ditimpa");
    const harapan = [
      { file: "labs/api-t4/internal/service/berkas.go", lines: `${noBaris(kodeBerkas, "func (s Service) periksaObjek(")}:${noBaris(kodeBerkas, "}", noBaris(kodeBerkas, "func (s Service) periksaObjek("))}`, judul: "labs/api-t4/internal/service/berkas.go (periksaObjek)" },
      { file: "labs/t4-storage/output/presign.txt", lines: `${noBaris(presignTxt, "PUT pertama dari app Dina")}:${noBaris(presignTxt, "isi objek sekarang")}`, judul: "Rekaman lab: labs/t4-storage/output/presign.txt, bagian B" },
      { file: "labs/api-t4/internal/objek/s3.go", lines: `${noBaris(kodeS3, "// PresignPUT membuat URL")}:${noBaris(kodeS3, "}", noBaris(kodeS3, "func (s S3) PresignPUT("))}`, judul: "labs/api-t4/internal/objek/s3.go (PresignPUT)" },
      { file: "labs/t4-storage/output/unduh.txt", lines: `${unduhD}:${noBaris(unduhTxt, "swafoto yang tidak ditimpa", unduhD)}`, judul: "Rekaman lab: labs/t4-storage/output/unduh.txt, bagian D" },
    ];
    const biasa = hasil.filter((h) => h.file).map(({ file, lines, judul }) => ({ file, lines, judul }));
    expect(biasa.length).toBe(4);
    expect(biasa).toEqual(harapan);
    // dua rentang BukaBerkas: transaction audit (dari tx pertama sampai penutup) dan baca sampai penutup cek checksum
    const gabung = hasil.find((h) => h.files)!;
    expect(gabung.files).toBe(`"labs/api-t4/internal/service/bo.go:${auditAwal + 1}:${auditAkhir}", "labs/api-t4/internal/service/bo.go:${bacaAwal}:${bacaAkhir}"`);
    expect(gabung.judul).toBe("labs/api-t4/internal/service/bo.go (BukaBerkas: audit lebih dulu, lalu checksum)");
    expect((halaman.match(/<Snippet /g) ?? []).length).toBe(8); // lima Snippet berkas (satu `files`) dan tiga blok kode Ilustrasi di tab
    // tanpa komentar lab internal di kutipan
    for (const [berkas, a, b] of [["labs/api-t4/internal/service/berkas.go", ...harapan[0]!.lines.split(":").map(Number)], ["labs/api-t4/internal/objek/s3.go", ...harapan[2]!.lines.split(":").map(Number)]] as [string, number, number][]) {
      const kutipan = baca(berkas).split("\n").slice(a - 1, b).join("\n");
      expect(kutipan, berkas).not.toMatch(/keputusan \d{3,4}|PR #\d+|tinjauan PR|R\d-\d{2,3}/);
    }
  });
  test("tab stack: label, slot, versi, tanggal, dan angka dokumentasi sama dengan baris riset", () => {
    harus('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    const slot = [...halaman.matchAll(/<Fragment slot="t(\d)">\n\n([\s\S]*?)\n<\/Fragment>/g)].map((m) => [m[1]!, m[2]!.split("\n")[0]!]);
    expect(slot.map((x) => x[0])).toEqual(["0", "1", "2", "3", "4", "5"]);
    expect(slot[0]![1]).toBe("*Dijalankan: lab api-t4 dan t4-storage, PostgreSQL 17.11, Go 1.27.1, dan SeaweedFS 4.51 (rekaman `presign.txt`).*");
    const pembuka = ["@aws-sdk/s3-request-presigner", "Laravel 13.x: File Storage", "django-storages 1.14.6", "dokumentasi Serverpod 4.0", "referensi JavaScript Supabase"];
    pembuka.forEach((k, i) => {
      expect(slot[i + 1]![1], `slot t${i + 1}`).toContain(k);
      expect(slot[i + 1]![1], `slot t${i + 1}`).toMatch(/^\*Tidak dijalankan\. Dicek ke /);
    });
    const r183 = baris("R4-183");
    for (const x of ["3.1160.0", "900", "unhoistableHeaders", "13.x", "temporaryUploadUrl", "now()->plus(minutes: 5)", "1.14.6", "AWS_QUERYSTRING_EXPIRE", "bawaan 3600", "AWS_S3_FILE_OVERWRITE", "bawaan True", "4.0", "bawaan 10 menit", "bawaan 10 MiB", "preventOverwrite", "bawaan false", "berlaku 2 jam", "{ upsert: true }"]) {
      expect(r183, x).toContain(x);
    }
    harus("README menulis bawaannya 900 detik, yaitu 15 menit");
    expect(900 / 60).toBe(15);
    harus("bawaan 3600 detik, yaitu 1 jam");
    expect(3600 / 3600).toBe(1);
    harus("`expirationDuration` (bawaan 10 menit), `maxFileSize` (bawaan 10 MiB)");
    harus("`preventOverwrite` (bawaan `false`)");
    harus("URL unggah berlaku 2 jam dan bisa dipakai tanpa autentikasi lanjutan.");
    harus("Bawaan opsinya tidak tertulis di halaman yang dibuka [perlu verifikasi].");
    harus("`AWS_S3_FILE_OVERWRITE` bawaan `True`: file bernama sama saling menimpa.");
    harus("Kode `labs/api-t4` tidak memasang padanannya.");
    expect([...halaman.matchAll(/<Snippet lang="([a-z]+)"/g)].map((m) => m[1])).toEqual(["js", "php", "dart"]);
    // tab Go: kode lab bawaan 5 menit dan penandatangan sekitar 60 baris dibaca dari README
    expect(readme).toContain("penandatanganan SigV4 sendiri sekitar 60 baris");
    harus("penandatangan SigV4 ditulis sendiri dengan pustaka standar, sekitar 60 baris");
  });
});

describe("ADR 38: tabel opsi, enam aturan, kasus industri, pre-mortem, kapan salah, dan Sengaja belum", () => {
  test("ADR 38 di naskah, registry, judul, dan heading sama", () => {
    expect(dari("t4-storage").adr).toEqual([38]);
    expect(naskah).toMatch(/\| 38 \| File di penyimpanan objek \(lab: SeaweedFS S3 lokal; produksi: layanan terkelola, Tidak dijalankan\)\. Database menyimpan kunci objek dan checksum\. Unggah lewat presigned PUT berumur 5 menit \(Asumsi\)/);
    expect(naskah).toContain("`bytea` di PostgreSQL (ditolak: M33); disk lokal VPS (nasib file terikat pada VPS); semua unggah dan unduh lewat server tanpa URL");
    harus("### ADR 38: file identitas di penyimpanan objek, unggah lewat presigned PUT 5 menit, unduh hanya lewat server");
    H1("ADR 38", 5); // judul, deskripsi, heading ADR, kalimat Yang akan merevisinya, dan kalimat Keputusan
  });
  test("tabel opsi: empat opsi, lima baris, kolom bukti menunjuk rekaman dan sumber yang ada", () => {
    const t = tabel("| | A. File di `bytea` |", 5);
    expect(t.length).toBe(7);
    expect(t[0]!.slice(1)).toEqual(["A. File di `bytea`", "B. Disk lokal VPS", "C. Semua lewat server", "D. Penyimpanan objek, presigned PUT, unduh lewat server"]);
    expect(t.slice(2).map((x) => x[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    expect(t[6]![1]).toContain("(https://wiki.postgresql.org/wiki/BinaryFilesInDB)");
    expect(t[4]![1]).toContain(`rasio ${rasioA[0]}, dan dump teks ${rasioTeks} (\`ukuran.txt\` bagian A)`);
    expect(t[4]![1]).toContain("(terakhir diedit 2021-05-05)");
    expect(t[4]![3]).toContain(`base64 menambah 4 untuk tiap 3 byte (Hitungan). Batas badan di handler 3 MiB (kode)`);
    expect(t[4]![4]).toContain("Server tetap membaca tiap file sekali");
    expect(t[3]![3]).toContain("(`verifikasi.txt` bagian B)");
    expect(t[6]![3]).toContain("`verifikasi.txt` bagian B");
    expect(t[6]![4]).toBe("`presign.txt`, `unggah.txt`, `unduh.txt`, `retensi.txt`, `ukuran.txt` bagian C");
    for (const f of ["presign", "unggah", "unduh", "retensi", "ukuran"]) expect(fs.existsSync(path.join(akar, `labs/t4-storage/output/${f}.txt`))).toBe(true);
    expect(fs.existsSync(path.join(akar, "labs/api-t4/output/verifikasi.txt"))).toBe(true);
    harus(`Satu file ${titik(500000)} byte menjadi sekitar ${titik(base64(500000))} karakter, dan dua file ${titik(2 * base64(500000))} karakter, di bawah batas badan 3 MiB (${titik(maksBodi)} byte).`);
    harus("Hitungan base64 memakai RFC 4648: 4 karakter untuk tiap 3 byte.");
  });
  test("keputusan, enam aturan, dan angka aturan dari kode dan rekaman", () => {
    harus("**Keputusan: opsi D.** Enam aturan:");
    const bagianAturan = halaman.slice(halaman.indexOf("**Keputusan: opsi D.**"), halaman.indexOf("**Kenapa D, bukan A sampai C.**"));
    expect([...bagianAturan.matchAll(/^(\d)\. (.+)$/gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4", "5", "6"]);
    harus(`2. Unggah lewat presigned PUT berumur ${umurKode} menit (Asumsi), dengan kunci acak dari server di bawah awalan akun. Jawaban yang membawa URL berheader \`no-store\`, dan permintaan URL dibatasi ${ambang[1]} per akun per jam (Asumsi lab).`);
    harus(`3. Sesudah unggah server memeriksa ukuran (paling besar ${maksBerkas / 1048576} MiB di lab), tipe dari byte, dan checksum hitungannya.`);
    harus(`5. File dihapus ${masaSimpan} hari sesudah verifikasi selesai (Asumsi produk, [perlu verifikasi]) oleh job idempoten.`);
    expect(naskah).toContain("File identitas dihapus 30 hari sesudah verifikasi selesai (Asumsi produk, retensi [perlu verifikasi])");
    expect(naskah).toContain("Nomor identitas tidak masuk log.");
    harus("6. Nomor identitas dan URL tidak masuk log atau jawaban galat (`unggah.txt` bagian E).");
  });
  test("kasus industri GitLab, AWS signatureAge, kutipan OWASP dan ASVS dari baris riset", () => {
    const r180 = baris("R4-180"), r181 = baris("R4-181"), r182 = baris("R4-182");
    expect(r182).toContain("`proxy_download` bawaannya `false`");
    expect(r182).toContain("Pre-signed URLs are time-limited but not tied to a specific user");
    expect(r182).toContain("cabang master, dibuka 2026-10-30");
    harus("`proxy_download` bawaannya `false`, jadi unduh langsung adalah bawaannya");
    harus("Dokumentasi yang sama memperingatkan bahwa URL itu tidak terikat ke satu user");
    harus("Batasnya: itu dokumentasi produk untuk file repositori, tanpa angka beban dan tanpa foto identitas.");
    expect(r180).toContain("`s3:signatureAge` menolak permintaan presigned URL bila tanda tangan lebih tua dari 10 menit (600000 ms)");
    harus("menolak permintaan presigned URL bila tanda tangannya lebih tua dari 10 menit (`s3:signatureAge`, dibuka 2026-10-30)");
    expect(r180).toContain("presigned URLs are bearer tokens that grant access to those who possess them");
    expect(r180).toContain("Amazon S3 replaces the existing object with the uploaded object");
    expect(r180).toContain("SigV4 mendukung checksum tambahan");
    expect(r180).toContain("dengan SigV2 hanya mendukung MD5");
    harus("Dokumentasi AWS menulis bahwa Signature Version 4 mendukung checksum SHA-256 dan lainnya, sedangkan Signature Version 2 hanya MD5.");
    expect(r181).toContain("cannot be trusted, as it is trivial to spoof");
    expect(r181).toContain("5.2.2 ekstensi dan isi file cocok dengan tipenya (L1)");
    expect(r181).toContain("5.4.3 file dari sumber tak tepercaya dipindai antivirus (L2)");
    expect(r181).toContain("Backups can take significantly longer");
    expect(r181).toContain("halaman terakhir diedit 2021-05-05");
    expect(r180).toContain('"Object Versioning" bernilai Yes untuk SeaweedFS');
    expect(r180).toContain("S3 memeriksa kedaluwarsa saat permintaan HTTP dimulai");
  });
  test("pre-mortem tiga penyebab dan kapan salah dengan satuan dan pembanding sama dengan beban naskah", () => {
    harus("**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:");
    expect([...halaman.slice(halaman.indexOf("**Pre-mortem.**"), halaman.indexOf("**Kapan keputusan ini salah.**")).matchAll(/^(\d)\. /gm)].length).toBe(3);
    harus(`Bila staf membuka tiap file, unduh sama dengan unggah: ${Math.round(kbDetik)} KB per detik puncak. Registry Tahap 5 memberi ${titik(Math.round(kbDetik5))} KB per detik, yaitu ${titik(UNGGAH5)} × ${FILE_KB} KB ÷ 86.400 × ${PUNCAK} (Hitungan atas Asumsi, sepuluh kali Tahap 4).`);
    harus(`Pembandingnya kecil: unggahan puncak ${Math.round(kbDetik)} KB per detik.`);
    harus(`Naskah memakai ${FILE_KB} KB per file, dan rasio dump untuk foto nyata tidak diukur.`);
    harus(`Saat foto nyata lebih besar dari batas ${maksBerkas / 1048576} MiB di lab.`);
    expect(readme).toContain("Rasio dump/file untuk foto nyata tidak diukur");
    expect(readme).toContain("Foto nyata, KTP nyata");
    harus("Keduanya dibaca dari kode (migration `verifikasi` dan `HapusBerkasJatuhTempo`), Tidak dijalankan.");
    harus("1. URL bocor lewat log di depan penyimpanan.");
  });
  test("Sengaja belum dilakukan: lima baris, tiga kolom, ASVS dan README", () => {
    const t = tabel("| Yang ditunda | Kenapa ditunda | Muncul lagi di |", 3);
    expect(t.length).toBe(7);
    expect(t.slice(2).map((x) => x[0])).toEqual(["Pencadangan dan pemulihan penyimpanan objek", "Pemindai antivirus untuk file yang diunggah", "Sapuan file yatim dan aturan lifecycle", "Ukuran wajib dan presigned POST dengan batas ukuran", "Enkripsi at rest dan versioning bucket"]);
    expect(t[3]![1]).toBe("ASVS 5.0.0 V5.4.3 memintanya di level 2, dan tidak ada pemindai di lab");
    expect(readme).toContain("Pencadangan dan replikasi SeaweedFS");
    expect(readme).toContain("Presigned POST dengan kebijakan `content-length-range`");
    expect(readme).toContain("Aturan siklus hidup (lifecycle)");
    expect(readme).toContain("Enkripsi at rest");
  });
});

describe("rujukan [[ID]], registry, struktur, dan kata", () => {
  test("halaman 4.15 terdaftar sebagai konsep bagian 4 ★ dengan lab t4-storage, ADR 38, prasyarat M33, dan judul sama dengan peta naskah", () => {
    expect(dari("t4-storage")).toMatchObject({ ada: true, nomor: "4.15", jenis: "konsep", inti: true, prasyarat: ["t4-m33"], lab: ["t4-storage"], tahap: 4, bagian: 4, topik: "Keamanan", adr: [38], peran: ["security", "backend"] });
    expect(halaman).toContain(`title: "4.15 ${dari("t4-storage").judul}"`);
    expect(naskah).toContain(`| 4.15 | 4 | ${dari("t4-storage").judul} | Keamanan + ADR | ★ | t4-storage | banding |`);
    const m = halaman.match(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-m33\]\] · Jalur inti<\/p>/);
    expect(m).not.toBeNull();
    expect(dari("t4-storage").menit).toBe(Number(m![1]) + Number(m![2]));
    expect(halaman).toContain("description: Foto kartu identitas ada di penyimpanan objek, dan presigned URL adalah izin yang dipegang siapa pun yang membawanya sampai umurnya habis. ADR 38 menimbang tiga cara lain dan menulis kapan pilihan ini salah.");
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badanHalaman.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    const menit = Number(halaman.match(/Baca (\d+) menit/)![1]);
    expect(Math.abs(jumlah / 200 - menit), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka, dengan teks aman yang menyebut kesimpulan", () => {
    const b = daftarBlok(halaman);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect([...halaman.matchAll(/<Blok ([^>]*)>/g)].map((m) => m[1])).toEqual([
      'nama="Mulai" buka',
      'nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: URL unggah adalah izin yang dipegang siapa pun yang membawanya, jadi server memeriksa isi file sesudah unggah dan membuka file hanya lewat server."',
      'nama="Paham"', 'nama="Putuskan"', 'nama="Kunci"',
    ]);
    expect((halaman.match(/<\/Blok>/g) ?? []).length).toBe(5);
  });
  test("tautan [[id]]: himpunan sama, nomor dan judul sama dengan registry dan peta naskah", () => {
    const id = [...new Set([...halaman.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["berikutnya", "t3-dua-instance", "t4-infra-secret", "t4-m33", "t4-m34", "t4-m38", "t4-prd", "t4-topup-verifikasi"]);
    const sesuai: [string, string, string][] = [
      ["t4-m33", "4.14", "M33"], ["t4-m34", "4.16", "M34"], ["t4-m38", "4.24", "M38"], ["t4-infra-secret", "4.17", "Secret manager"],
      ["t4-prd", "4.1", "PRD v4"], ["t4-topup-verifikasi", "4.3", "Fitur: top-up dari bank"], ["t3-dua-instance", "3.15", "Dua instance"],
    ];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      if (nomor.startsWith("4.")) expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    expect(dari("t4-prd").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    expect(naskah).toContain("| 43 |");
    harus("[[t4-m38]] bertanya siapa yang membuka data Budi, dan ADR 43 meninjau audit berantai yang dipakai unduh.");
    harus("[[t4-infra-secret]] memindahkan kredensial penyimpanan ke secret manager.");
    expect(dari("t4-infra-secret").adr).toEqual([39]);
    expect(dari("t4-audit").adr).toEqual([43]);
    expect(dari("t4-m38").jenis).toBe("masalah");
  });
  test("heading, urutan komponen, dan impor", () => {
    const heading = [...halaman.matchAll(/^(#{2,4}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(heading).toEqual([
      "## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Di stack lain",
      "### ADR 38: file identitas di penyimpanan objek, unggah lewat presigned PUT 5 menit, unduh hanya lewat server",
      "### Sengaja belum dilakukan", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut",
    ]);
    const komponen = [...halaman.matchAll(/<(Rantai|Tebak|WidgetLama|SkripLama|TabSet)\b([^>]*)>/g)].map((m) => `${m[1]}${m[2]}`.trim());
    expect(komponen).toEqual([
      "Rantai data={intiDiagram} ringkas /",
      "Tebak client:visible data={dataTebak} /",
      'WidgetLama nama="banding" src="data/t4-storage-banding.json" /',
      'TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}',
      'SkripLama daftar={["cerita","banding"]} /',
    ]);
    expect(halaman.indexOf("<Rantai")).toBeLessThan(halaman.indexOf("<Tebak"));
    expect(halaman.indexOf("<Tebak")).toBeLessThan(halaman.indexOf("<WidgetLama"));
    expect((halaman.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((halaman.match(/<noscript>/g) ?? []).length).toBe(2);
    const impor = [...halaman.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(impor).toEqual([
      "Blok ../../../components/Blok.astro", "Rantai ../../../components/Rantai.astro", "Snippet ../../../components/Snippet.astro",
      "TabSet ../../../components/TabSet.astro", "Tebak ../../../widgets/tebak/Tebak.tsx", "WidgetLama ../../../components/WidgetLama.astro",
      "SkripLama ../../../components/SkripLama.astro", "intiDiagram ../../../../data/diagram/t4-storage-inti.json", "dataTebak ../../../../data/widget/t4-storage-tebak.json",
    ]);
    for (const f of ["situs/src/components/WidgetLama.astro", "situs/src/components/SkripLama.astro", "situs/src/widgets/tebak/Tebak.tsx", "situs/lama/widgets/banding.js"]) expect(fs.existsSync(path.join(akar, f)), f).toBe(true);
  });
  test("kata yang dilarang, ID internal tidak muncul, dan label turunan didefinisikan di pemakaian pertama", () => {
    const prosa = halaman.replace(/<Snippet lang="[a-z]+" code=\{`(?:[^`\\]|\\.)+`\} \/>/g, "");
    expect(prosa).not.toMatch(/\b(mudah|cukup|tinggal)\b/i);
    expect(prosa).not.toMatch(/Anda|!|\bkita\b|\bpetugas\b/);
    expect(prosa).not.toMatch(/Ilustrasi mekanisme|Simulasi|mensimulasikan/);
    expect(halaman).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(halaman).not.toMatch(/keputusan \d{3,4}|PR #\d+|#\d{3}\b/);
    expect(halaman).not.toMatch(/\bC2\b|\bE1\b|\bB11\b/);
    expect(halaman).not.toMatch(/\bB\b(?<=\d \bB\b)|\d B\b/);
    expect(halaman).not.toMatch(/\brahasia\b/i);
    expect(halaman).toMatch(/\bsecret manager\b/);
    // Hitungan didefinisikan di pemakaian pertama, dan tidak dipakai lebih dulu di Mulai atau Coba
    expect(halaman.indexOf("Hitungan")).toBe(halaman.indexOf("Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini"));
    expect(halaman.indexOf("Hitungan")).toBeGreaterThan(halaman.indexOf('<Blok nama="Paham">'));
    // presigned URL, penyimpanan objek, checksum, bearer token, bytea, HEAD, job dan retensi: arti di pemakaian pertama
    const pertama = (k: string): number => badanHalaman.search(new RegExp(k));
    expect(badanHalaman.slice(pertama("Presigned URL"), pertama("Presigned URL") + 120)).toContain("Presigned URL adalah alamat di penyimpanan objek yang sudah ditandatangani server.");
    expect(badanHalaman).toContain("Penyimpanan objek menyimpan file sebagai objek berkunci di luar database.");
    expect(pertama("checksum")).toBeGreaterThan(0);
    expect(badanHalaman.indexOf("yaitu sidik SHA-256 dari isi file")).toBeLessThan(badanHalaman.indexOf('<Blok nama="Coba"'));
    expect(badanHalaman.indexOf("Bearer token adalah izin yang berlaku bagi siapa pun yang membawanya.")).toBeGreaterThan(badanHalaman.indexOf('<Blok nama="Paham"'));
    expect(badanHalaman.indexOf("Kolom `bytea` adalah tipe PostgreSQL untuk byte mentah.")).toBeLessThan(badanHalaman.indexOf("Dump database dari file di `bytea`"));
    expect(badanHalaman.indexOf("yaitu permintaan tanpa isi")).toBeGreaterThan(0);
    expect(badanHalaman.indexOf("yaitu permintaan tanpa isi")).toBeLessThan(badanHalaman.indexOf("Lalu ia membaca isinya"));
    // Asumsi dan Tidak dijalankan dipakai di Mulai lewat tautan ke Label sumber
    expect(halaman.indexOf("[Label sumber](/cara-pakai/#label-sumber)")).toBeLessThan(halaman.indexOf("(Asumsi)"));
    expect(cara).toMatch(/Rekaman lab/);
  });
});

describe("Cek diri, kartu, halaman istilah, glosarium, dan baris RISET", () => {
  test("empat kartu Cek diri ada di halaman dan di kartu.json dengan pertanyaan dan jawaban yang sama", () => {
    const bagianCek = halaman.slice(halaman.indexOf("### Cek diri"), halaman.indexOf("### Saat me-review kode AI"));
    const tanya = [...bagianCek.matchAll(/\*\*(\d)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n(.+)\n\n<\/details>/g)].map((m) => [m[1], m[2], m[3]]);
    expect(tanya.map((x) => x[0])).toEqual(["1", "2", "3", "4"]);
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-storage");
    expect(kartu.map((k) => k.id)).toEqual(["t4-storage-1", "t4-storage-2", "t4-storage-3", "t4-storage-4"]);
    kartu.forEach((k, i) => {
      expect(k.tanya).toBe(tanya[i]![1]);
      expect(k.jawab).toBe(tanya[i]![2]);
      expect(k.url).toBe("tahap-4/object-storage-presigned/");
      expect(k.judul).toBe("4.15 Keamanan 7: File identitas: object storage, presigned URL + ADR 38");
    });
    expect(tanya[0]![2]).toContain(`${titik(isiAkhir)} byte milik pemegang lain`);
    expect(tanya[1]![2]).toContain(`jawabannya ${statusD}, dan baris audit naik dari ${auditD[1]} ke ${auditD[2]}`);
    expect(tanya[2]![2]).toBe(`Lewat URL, dua pemegang mendapat ${urlC[0]![1]} dan baris audit tetap ${auditC}. Lewat server, Ratih mendapat 200 dan satu baris tertulis (\`unduh.txt\` bagian A dan C).`);
    expect(tanya[3]![2]).toBe(`${titik(UNGGAH)} × ${FILE_KB} KB × 365 = ${gbTahun} GB, dan ${koma(posting / 1e6, 1)} juta × ${BYTE_POSTING} byte = ${koma(gbPosting, 2)} GB. Lalu ${gbTahun} ÷ ${koma(gbPosting, 2)} = ${koma(kali, 1)} (Hitungan atas Asumsi naskah).`);
    expect(tanya[3]![1]).toBe(`Dari angka apa file identitas dihitung ${koma(kali, 1)} kali posting ledger dalam setahun?`);
  });
  test("halaman istilah presigned-url: skema, kalimat, sumber, istilah terkait, dan baris glosarium", () => {
    expect(() => HalamanIstilah.parse(istilah)).not.toThrow();
    expect(istilah.istilah).toBe("Presigned URL");
    expect(istilah.stack).toBeNull();
    expect(istilah.cerita).toHaveLength(1);
    expect(istilah.cerita[0]!.rujukan).toBe("t4-storage");
    expect(istilah.cerita[0]!.teks).toBe(`App Dina dan pemegang lain memakai URL unggah yang sama, dan keduanya mendapat 200. Isi objek menjadi ${titik(isiAkhir)} byte milik pemegang lain. Sesudah umur URL habis, PUT ditolak ${ditolakC} (\`presign.txt\` bagian B dan C).`);
    expect(istilah.mekanisme[3]).toBe(`Sesudah umur habis URL ditolak ${ditolakC} (bagian C). Pada Signature Version 4 umur paling lama ${titik(Number(maksD[1]))} detik, yaitu ${maksD[2]} hari (bagian D).`);
    expect(istilah.mekanisme[2]).toContain(`ditolak ${tolakE === 4 ? "403" : "?"} (bagian E)`);
    expect(istilah.jebakan[0]).toBe("Menganggap URL itu terikat ke satu user. Pemegang lain mendapat 200 dan menimpa objek (`presign.txt` bagian B).");
    expect(istilah.jebakan[2]).toBe(`Tidak menandatangani panjang file. URL tanpa panjang menerima ${lima / 1048576} MiB (\`presign.txt\` bagian F).`);
    expect(istilah.terkait).toEqual(["Signed URL", "Object storage", "Checksum"]);
    for (const t of istilah.terkait) expect(glosarium, t).toMatch(new RegExp(`\\| \\*\\*${t}\\*\\*`));
    expect(glosarium).toContain("| **Presigned URL** | URL ke satu objek di penyimpanan yang sudah ditandatangani pemilik kredensial, sehingga pemegangnya bisa memakainya sampai umurnya habis. | [[t4-storage]] |");
    expect(glosarium).toContain("| **Checksum** | Sidik dari isi file, misalnya SHA-256. Bila satu byte berubah, sidiknya berubah, jadi checksum dipakai untuk mendeteksi file yang rusak atau ditimpa. | [[t4-storage]] |");
    expect(istilah.sumber.map((s) => [s.riset ?? null, s.url ?? s.rekaman])).toEqual([
      ["R4-180", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html"],
      [null, "labs/t4-storage/output/presign.txt"],
    ]);
    expect(istilah.sumber[0]!.judul).toBe("AWS S3 User Guide: presigned URL (dibuka 2026-10-30)");
    expect(fs.existsSync(path.join(akar, istilah.sumber[1]!.rekaman!))).toBe(true);
    expect(baris("R4-180")).toContain("docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html");
  });
  test("baris riset: lima baris berurutan, lima kolom, tanggal 2026-10-30, tanpa ID ganda, dan tautan luar halaman ada di baris riset", () => {
    const ids = [...riset.matchAll(/^\| (R4-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort((a, b) => Number(a.slice(3)) - Number(b.slice(3))));
    expect(ids.filter((x) => Number(x.slice(3)) >= 180 && Number(x.slice(3)) <= 184)).toEqual(["R4-180", "R4-181", "R4-182", "R4-183", "R4-184"]);
    for (const id of ["R4-180", "R4-181", "R4-182", "R4-183", "R4-184"]) {
      const b = baris(id);
      expect(b.split("|").length, `${id} harus 5 kolom`).toBe(7);
      if (id !== "R4-184") expect(b, id).toContain("2026-10-30");
    }
    const luar = [...new Set([...halaman.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!))];
    const semuaRiset = ["R4-180", "R4-181", "R4-182", "R4-183"].map(baris).join("\n");
    for (const u of luar) {
      const url = new URL(u);
      const kunci = url.host.replace(/^www\./, "") + (url.pathname === "/" ? "" : url.pathname.replace(/\/$/, ""));
      const diRiset = semuaRiset.includes(kunci);
      expect(diRiset, `tautan luar tidak ada di baris riset: ${u}`).toBe(true);
    }
    expect(luar.length).toBe(14);
    // teks tautan: versi di teks sama dengan versi di URL dan di baris riset
    const pasangan = [...halaman.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)].map((m) => [m[1]!, m[2]!]);
    expect(pasangan.filter(([, u]) => u.includes("ASVS")).map(([t]) => t)).toEqual(["ASVS v5.0.0", "OWASP ASVS 5.0.0: V5 File Handling"]);
    expect(pasangan.filter(([, u]) => u.includes("ASVS")).every(([t, u]) => t.includes("5.0.0") && u.includes("/blob/v5.0.0/"))).toBe(true);
    harus("[ASVS v5.0.0](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x14-V5-File-Handling.md)");
    harus("ASVS 5.0.0 V5.2.2 meminta isi file cocok dengan tipenya");
    expect(baris("R4-181")).toContain("OWASP ASVS v5.0.0 bab V5");
    expect((halaman.match(/dibuka 2026-10-30/g) ?? []).length).toBe(JumlahDibuka);
    expect((halaman.match(/2026-10-30/g) ?? []).length).toBe(JumlahTanggal);
    expect([...new Set([...halaman.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]))].sort()).toEqual(["2021-05-05", "2026-10-30"]);
    expect(baris("R4-180")).toContain("dibuka 2026-10-30");
    expect(baris("R4-184")).toContain("`unduh.txt` bagian B menulis \"keempat percobaan\" padahal lima percobaan tertulis");
    expect(halaman.startsWith('---\ntitle: "4.15 Keamanan 7: File identitas: object storage, presigned URL + ADR 38"\n')).toBe(true);
  });
});

const sidik = (teks: string, kata: string[]): Record<string, number> =>
  Object.fromEntries(kata.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling besar", "paling lama", "selalu", "sama", "sampai", "tetap", "tiap"];
const SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"(\[*_`])/;
const prosaBaris = badanHalaman.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<Snippet"));
const struktur = prosaBaris.map((b) => {
  if (b.startsWith("#")) return b.match(/^#+/)![0];
  if (b.startsWith("|")) return `|:${b.split("|").length - 2}`;
  if (b.startsWith("<")) return b.match(/^<\/?[A-Za-z]+/)![0];
  const n = b.split(SPLIT).length;
  if (b.startsWith("- ")) return `-:${n}`;
  if (/^\d+\. /.test(b)) return `${b.match(/^\d+/)![0]}.:${n}`;
  if (/^\*\*\d+\.\*\*/.test(b)) return `**${b.match(/\d+/)![0]}**:${n}`;
  return `p:${n}`;
});
const angka = prosaBaris.flatMap((b) => [...b.replace(/\]\([^)]*\)/g, "]").matchAll(/(?<![\w.])\d+(?:[.,]\d+)*(?!\w)/g)].map((m) => m[0]));
const nilaiString = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) nilaiString(y, keluar);
  else if (x && typeof x === "object") for (const y of Object.values(x)) nilaiString(y, keluar);
  return keluar;
};
const hitungLabel = {
  JumlahRekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length,
  JumlahTidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length,
  JumlahAsumsi: (halaman.match(/Asumsi/g) ?? []).length,
  JumlahIlustrasi: (halaman.match(/Ilustrasi/g) ?? []).length,
  JumlahHitungan: (halaman.match(/Hitungan/g) ?? []).length,
  JumlahPerluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
  JumlahPenulis: (halaman.match(/usul penulis|penalaran penulis|penilaian penulis/g) ?? []).length,
  JumlahDibuka: (halaman.match(/dibuka 2026-10-30/g) ?? []).length,
  JumlahTanggal: (halaman.match(/2026-10-30/g) ?? []).length,
};
const h16 = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);
const barisGlosarium = glosarium.split("\n").filter((b) => b.includes("[[t4-storage]]"));
const sidikSekarang = {
  SIDIK_RISET: ["R4-180", "R4-181", "R4-182", "R4-183", "R4-184"].map((id) => h16(baris(id))),
  SIDIK_BERKAS: {
    rantai: h16(JSON.stringify(rantaiMentah)), tebak: h16(JSON.stringify(tebakMentah)), banding: h16(JSON.stringify(banding)), istilah: h16(JSON.stringify(istilah)),
    frontmatter: h16(halaman.split("\n---\n")[0]!), glosarium: barisGlosarium.map(h16),
    kartu: kartuSemua.filter((k) => k.halaman === "t4-storage").map((k) => h16(JSON.stringify(k))),
  },
  SIDIK_HALAMAN: sidik(halaman, KATA),
  SIDIK_RANTAI: sidik(nilaiString(rantaiMentah).join("\n"), KATA),
  SIDIK_TEBAK: sidik(nilaiString(tebakMentah).join("\n"), KATA),
  SIDIK_BANDING: sidik(nilaiString(banding).join("\n"), KATA),
  SIDIK_ISTILAH: sidik(nilaiString(istilah).join("\n"), KATA),
  SIDIK_STRUKTUR: struktur.join(" "),
  SIDIK_ANGKA: angka.join(" "),
};
if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan oleh PERBARUI_KUNCI=1 (lihat object-storage-presigned.halaman.test.ts): hitungan label dan sidik kata penentu, struktur, dan angka.\n` +
    Object.entries({ ...hitungLabel, ...sidikSekarang }).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};\n`).join("");
  fs.writeFileSync(path.join(__dirname, "object-storage-presigned.halaman.sidik.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, tebakan, banding, dan halaman istilah terkunci per baris (lapis 2)", () => {
  const tekstual = (x: unknown, keluar: string[] = []): string[] => {
    if (typeof x === "string") keluar.push(x);
    else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
    else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
    return keluar;
  };
  const sekarang = {
    halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
    json: { rantai: tekstual(rantaiMentah), tebak: tekstual(tebakMentah), banding: tekstual(banding), istilah: tekstual(istilah) },
  };
  if (process.env.PERBARUI_KUNCI === "1") {
    const isi = `// Dihasilkan dari berkas saat ini oleh PERBARUI_KUNCI=1 (lihat object-storage-presigned.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\nexport const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\nexport const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
    fs.writeFileSync(path.join(__dirname, "object-storage-presigned.halaman.nilai.ts"), isi);
  }
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string diagram, tebakan, banding, dan halaman istilah sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

// Penutup celah mutasi tanpa kunci baris: label sumber, kata penentu, struktur, angka, tabel, dan nilai JSON. Nilai sidik dicatat dari halaman yang
// sudah dibaca dan dinilai benar kalimat demi kalimat terhadap sumbernya.
describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, dan angka", () => {
  test("jumlah label per jenis, dan Asumsi tidak naik menjadi Rekaman lab", () => {
    expect((halaman.match(/Rekaman lab/g) ?? []).length).toBe(JumlahRekamanLab);
    expect((halaman.match(/Tidak dijalankan/g) ?? []).length).toBe(JumlahTidakDijalankan);
    expect((halaman.match(/Asumsi/g) ?? []).length).toBe(JumlahAsumsi);
    expect((halaman.match(/Ilustrasi/g) ?? []).length).toBe(JumlahIlustrasi);
    expect((halaman.match(/Hitungan/g) ?? []).length).toBe(JumlahHitungan);
    expect((halaman.match(/\[perlu verifikasi\]/g) ?? []).length).toBe(JumlahPerluVerifikasi);
    expect((halaman.match(/usul penulis|penalaran penulis|penilaian penulis/g) ?? []).length).toBe(JumlahPenulis);
  });
  test("sidik kata penentu halaman, diagram, tebakan, banding, dan halaman istilah (kunci agregat)", () => {
    expect(sidikSekarang.SIDIK_HALAMAN).toEqual(SIDIK_HALAMAN);
    expect(sidikSekarang.SIDIK_RANTAI).toEqual(SIDIK_RANTAI);
    expect(sidikSekarang.SIDIK_TEBAK).toEqual(SIDIK_TEBAK);
    expect(sidikSekarang.SIDIK_BANDING).toEqual(SIDIK_BANDING);
    expect(sidikSekarang.SIDIK_ISTILAH).toEqual(SIDIK_ISTILAH);
  });
  test("sidik elemen non-prosa: baris riset, JSON, frontmatter, baris glosarium, dan kartu (kunci agregat, bukan turunan)", () => {
    expect(sidikSekarang.SIDIK_RISET).toEqual(SIDIK_RISET);
    expect(sidikSekarang.SIDIK_BERKAS).toEqual(SIDIK_BERKAS);
    expect(barisGlosarium.length).toBe(2);
  });
  test("sidik struktur dan sidik angka prosa", () => {
    expect(sidikSekarang.SIDIK_STRUKTUR).toBe(SIDIK_STRUKTUR);
    expect(sidikSekarang.SIDIK_ANGKA).toBe(SIDIK_ANGKA);
    for (const sel of ["120.000", "90.000", "500.000", "1.048.576", "604.800", "5.242.880", "33,3", "365", "10,95", "116", "1.157"]) expect(angka).toContain(sel);
  });
});

import {
  JumlahRekamanLab, JumlahTidakDijalankan, JumlahAsumsi, JumlahIlustrasi, JumlahHitungan, JumlahPerluVerifikasi, JumlahPenulis, JumlahDibuka, JumlahTanggal,
  SIDIK_RISET, SIDIK_BERKAS, SIDIK_HALAMAN, SIDIK_RANTAI, SIDIK_TEBAK, SIDIK_BANDING, SIDIK_ISTILAH, SIDIK_STRUKTUR, SIDIK_ANGKA,
} from "./object-storage-presigned.halaman.sidik";
