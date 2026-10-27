// Penjaga halaman 3.25 (keputusan 1096 sampai 1098): angka, ID, nomor ADR, rentang Snippet, tanggal akses, versi sumber, label
// sumber, dan kalimat di tls-pinning.mdx diturunkan dari rekaman labs/t3-mitm (pin, dio, hsts, m26, token), kode lab (client.dart,
// pin.dart, tepi, pki, bagian_pin.py), naskah, registry, RISET, dan halaman tetangga. Isi halaman dikunci unit demi unit (EXPECT,
// nilai rekaman dan kode diisi lewat «placeholder»), dan tiap klaim mekanisme dipasangkan dengan rekaman atau kode yang
// membuktikannya di tes terpisah, sebab mengunci kalimat utuh tidak menangkap kalimat yang SALAH. Klaim dokumentasi (RFC 7469, RFC
// 6797, RFC 9700, Android, Apple, OkHttp, React Native, Dart, dio, Serverpod, Let's Encrypt, Chrome, Baseline Requirements) dijaga
// lewat baris riset R3-220 sampai R3-224, yang dibuka ke sumber primer 2026-10-27 dan dikunci dengan sidik jari. Tes hanya membaca
// berkas terlacak git.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t3-tls-inti.json";
import registry from "../../data/cerita.json";
import tebakMentah from "../../data/widget/t3-tls-tebak.json";
import { DataTebak } from "../widgets/tebak/skema";
import { cekTemplat, daftarBlok } from "./blok";
import { HalamanIstilah } from "./istilah";
import { DataRantai } from "./rantai";

const akar = path.resolve(__dirname, "../../..");
// Berkas yang dibaca tes ini harus terlacak git: berkas tmp/ atau salinan public/ tidak ada di CI.
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

const halamanBerkas = "situs/src/content/docs/tahap-3/tls-pinning.mdx";
const mdx = baca(halamanBerkas);
const frontmatter = mdx.split(/^---\n/m)[1]!;
const halaman = mdx.split(/^---\n/m).slice(2).join("---\n");
const rantai = DataRantai.parse(rantaiMentah);
const tebak = DataTebak.parse(tebakMentah);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const pinTxt = baca("labs/t3-mitm/output/pin.txt");
const dioTxt = baca("labs/t3-mitm/output/dio.txt");
const hstsTxt = baca("labs/t3-mitm/output/hsts.txt");
const m26Txt = baca("labs/t3-mitm/output/m26.txt");
const tokenTxt = baca("labs/t3-mitm/output/token.txt");
const readmeLab = baca("labs/t3-mitm/README.md");
const clientDart = baca("labs/t3-mitm/dart/bin/client.dart");
const pinDart = baca("labs/t3-mitm/dart/lib/pin.dart");
const pubspec = baca("labs/t3-mitm/dart/pubspec.yaml");
const tepiGo = baca("labs/t3-mitm/go/cmd/tepi/main.go");
const pkiGo = baca("labs/t3-mitm/go/internal/pki/pki.go");
const bagianPinPy = baca("labs/t3-mitm/bagian_pin.py");
const bagianTokenPy = baca("labs/t3-mitm/bagian_token.py");
const umumPy = baca("labs/t3-mitm/umum.py");
const sesiGo = baca("labs/api-t3/internal/service/sesi.go");
const repoGo = baca("labs/api-t3/internal/repo/repo.go");
const prd = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const ceritaT3 = baca("situs/src/content/docs/cerita/tahap-3.mdx");
const caraPakai = baca("situs/src/content/docs/cara-pakai.mdx");
const glosMdx = baca("situs/src/content/docs/alat/glosarium.mdx");

// ---- bagian rekaman -------------------------------------------------------------------------------
const pecah = (teks: string): Record<string, string[]> => {
  const hasil: Record<string, string[]> = {};
  let kini = "";
  for (const b of teks.split("\n")) {
    const m = b.match(/^# --- ([A-Z])\. /);
    if (m) {
      kini = m[1]!;
      hasil[kini] = [];
    } else if (kini) hasil[kini]!.push(b);
  }
  return hasil;
};
const bagian = (semua: Record<string, string[]>, huruf: string): string[] => {
  const b = semua[huruf];
  if (!b) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  return b;
};
const cari = (pola: RegExp, baris: string[], nama: string): RegExpMatchArray => {
  const m = baris.map((x) => x.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const hitung = (teks: string, pola: RegExp): number => (teks.match(pola) ?? []).length;
const barisRiset = (id: string): string => {
  const b = riset.split("\n").filter((x) => x.startsWith(`| ${id} |`));
  expect(b, `baris riset ${id}`).toHaveLength(1);
  return b[0]!;
};
const rp = (n: number): string => `Rp${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const koma = (n: number): string => String(n).replace(".", ",");
const fungsiPy = (kode: string, nama: string): string => {
  const a = kode.indexOf(`def ${nama}(`);
  if (a < 0) throw new Error(`kode: fungsi ${nama} tidak ada`);
  const b = kode.indexOf("\ndef ", a + 1);
  return kode.slice(a, b < 0 ? undefined : b);
};

const fungsiGo = (kode: string, nama: string): string => {
  const m = new RegExp(`^func (?:\\([^)]*\\) )?${nama}\\(`, "m").exec(kode);
  if (!m) throw new Error(`kode: fungsi ${nama} tidak ada`);
  const b = kode.indexOf("\nfunc ", m.index + 1);
  return kode.slice(m.index, b < 0 ? undefined : b);
};

interface Panggilan { mode: string; percaya: string; url: string; port: string; pin: string[]; hasil: Record<string, any> }
/** Setiap baris "$ client ..." beserta jawaban JSON di baris sesudahnya. */
const panggilan = (baris: string[]): Panggilan[] => {
  const hasil: Panggilan[] = [];
  baris.forEach((b, i) => {
    const m = b.match(/^\$ client --mode=(\S+) --percaya=(\S+) --url=(\S+)/);
    if (!m) return;
    const pin = b.match(/ --pin=(\S+)/);
    const j = baris[i + 1]!;
    expect(j.startsWith("{"), `jawaban client sesudah: ${b.slice(0, 60)}`).toBe(true);
    hasil.push({ mode: m[1]!, percaya: m[2]!, url: m[3]!, port: m[3]!.match(/:(\d+)\//)![1]!, pin: pin ? pin[1]!.split(",") : [], hasil: JSON.parse(j) });
  });
  return hasil;
};
const lihatProxy = (baris: string[]): { handshake: string; request: number }[] =>
  baris.map((b) => b.match(/^# proxy Dimas melihat: handshake (ya|tidak), request terbaca (\d+)$/)).filter((m) => m !== null).map((m) => ({ handshake: m![1]!, request: Number(m![2]) }));
const barisTransfer = (baris: string[]): { jurnal: number; nomor: string; jumlah: number }[] =>
  baris.map((b) => b.match(/^ (\d+) +\| (K\d+) +\| (-?\d+)$/)).filter((m) => m !== null).map((m) => ({ jurnal: Number(m![1]), nomor: m![2]!, jumlah: Number(m![3]) }));
interface Jawaban { kode: number; header: Record<string, string> }
/** Jawaban HTTP curl berurutan: status dan header (nama huruf kecil) sampai baris kosong. */
const jawabanCurl = (baris: string[]): Jawaban[] => {
  const hasil: Jawaban[] = [];
  let kini: Jawaban | null = null;
  for (const b of baris) {
    const m = b.match(/^HTTP\/1\.[01] (\d+) /);
    if (m) {
      kini = { kode: Number(m[1]), header: {} };
      hasil.push(kini);
    } else if (kini && b === "") kini = null;
    else if (kini) {
      const h = b.match(/^([A-Za-z-]+): (.*)$/);
      if (h) kini.header[h[1]!.toLowerCase()] = h[2]!;
    }
  }
  return hasil;
};

const P = pecah(pinTxt);
const D = pecah(dioTxt);
const H = pecah(hstsTxt);
const M = pecah(m26Txt);
const T = pecah(tokenTxt);

// ---- nilai turunan dari rekaman dan kode ------------------------------------------------------------
const dioA = panggilan(bagian(D, "A"));
const dioB = panggilan(bagian(D, "B"));
const pinA = panggilan(bagian(P, "A"));
const pinB = panggilan(bagian(P, "B"));
const pinC = panggilan(bagian(P, "C"));
const pinD = panggilan(bagian(P, "D"));
const m26B = panggilan(bagian(M, "B"));
const m26C = panggilan(bagian(M, "C"));
const m26D = panggilan(bagian(M, "D"));
const trfDioA = barisTransfer(bagian(D, "A"));
const nominalPindah = Math.abs(trfDioA[0]!.jumlah);
const nominalAsli = Number(cari(/^# body dari app: +\{"ke_nomor_karyawan":"K\d+","nominal":(\d+),/, bagian(D, "A"), "dio A body app")[1]);
const dioKode = cari(/request\.close\(\) di baris (\d+), validateCertificate!\(\.\.\.\) di baris (\d+)/, bagian(D, "A"), "dio A baris kode");
const dioClose = Number(dioKode[1]);
const dioValidasi = Number(dioKode[2]);
const versiKlien = cari(/^# Client: Dart (\S+) \(dart:io\) dan dio (\S+)\./, dioTxt.split("\n"), "kepala dio");
const dartLab = versiKlien[1]!;
const dioVer = cari(/^ {2}dio: (\S+)$/, pubspec.split("\n"), "pubspec dio")[1]!;
const hstsDetik = Number(cari(/flag\.Int\("hsts-detik", (\d+),/, tepiGo.split("\n"), "tepi hsts")[1]);
const hstsHari = hstsDetik / 86400;
const tokenDetik = Number(cari(/\{"kedaluwarsa_detik":(\d+),/, bagian(T, "A"), "token detik")[1]);
const tokenMenit = tokenDetik / 60;
const menitKomentar = bagian(T, "A")
  .map((b) => b.match(/^# (\d+) menit(?: (\d+) detik)? sesudah login:$/))
  .filter((m) => m !== null)
  .map((m) => koma(Number(m![1]) + Number(m![2] ?? 0) / 60));
const logToken = bagian(T, "B").map((b) => b.match(/^# Token Budi muncul di log tepi: (\d+) kali/)).filter((m) => m !== null).map((m) => Number(m![1]));
const jadwal = bagian(P, "E")
  .map((b) => b.match(/^ {2}sejak (\d{4}-\d{2}-\d{2}): masa berlaku paling lama (\d+) hari, 365 ÷ \d+ = ([\d,]+) kali per tahun$/))
  .filter((m) => m !== null)
  .map((m) => ({ sejak: m![1]!, hari: Number(m![2]), kali: m![3]! }));
const hariDaun = Number(cari(/^masa_berlaku_hari=(\d+)$/, bagian(P, "E"), "pin E masa berlaku")[1]);
const hari199 = cari(/^hari_ke_(\d+)=lolos$/, bagian(P, "E"), "pin E lolos")[1]!;
const hari201 = cari(/^hari_ke_(\d+)=ditolak: sertifikat kedaluwarsa$/, bagian(P, "E"), "pin E ditolak")[1]!;
const ringkasC = cari(/^# Dari (\d+) request client di bagian C, (\d+) sampai ke tepi .+; (\d+) yang ditolak pin tidak ada di log akses tepi\.$/, bagian(P, "C"), "pin C ringkas");
const jedaProxy = koma(Number(cari(/def lihat_mitm\(rekam, token=None, tunggu=([\d.]+),/, umumPy.split("\n"), "umum jeda")[1]));
const jawabanHstsA = jawabanCurl(bagian(H, "A"));
const jawabanHstsB = jawabanCurl(bagian(H, "B"));
const jawabanHstsC = jawabanCurl(bagian(H, "C"));
const jawabanTokenA = jawabanCurl(bagian(T, "A"));

// Urutan server dan pin di _c_rotasi (kode lab) dipasangkan dengan jawaban client di rekaman bagian C, urutan yang sama.
const rotasiKode = fungsiPy(bagianPinPy, "_c_rotasi");
const urutanKode: { mode: string; server: string; pin: string[] }[] = [];
{
  let server = "";
  for (const m of rotasiKode.matchAll(/U\.mulai_tepi\("server-([abc])"|U\.klien\("(pin-spki|validasi)", \["ca-publik"\], "tepi", GET_AKUN, token=token(?:, pin=\[([A-C, ]+)\])?\)/g)) {
    if (m[1]) server = m[1];
    else urutanKode.push({ mode: m[2]!, server: server.toUpperCase(), pin: m[3] ? m[3].split(", ") : [] });
  }
}
const rotasi = urutanKode.map((u, i) => ({ ...u, jawab: pinC[i]!.hasil, rekaman: pinC[i]! }));
const baris6 = rotasi.filter((r) => r.mode === "pin-spki");
const hasilKata = (j: Record<string, any>): string => (j.hasil === "terhubung" ? "Terhubung" : "Ditolak");
const akhiranRotasi = ["", ": server sehat dan sertifikat sah, tetapi request tidak pernah dikirim", "", " tanpa rilis baru", "", ""];
const tabelRotasi = baris6.map((r, i) => `| ${r.pin.join(" dan ")} | ${r.server} | ${hasilKata(r.jawab)}${akhiranRotasi[i]} |`).join("\n");
const KATA = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"];

// Versi, tanggal, dan angka sumber dokumentasi dibaca dari baris riset (dikunci sidik jari di tes riset).
const r74 = barisRiset("R3-74");
const r220 = barisRiset("R3-220");
const r221 = barisRiset("R3-221");
const r222 = barisRiset("R3-222");
const r223 = barisRiset("R3-223");
const r224 = barisRiset("R3-224");
const r78 = barisRiset("R3-78");
const tglBuka = cari(/dibuka (\d{4}-\d{2}-\d{2})/, [r220], "R3-220 tanggal")[1]!;
const tglAsvs = cari(/dibuka (\d{4}-\d{2}-\d{2})/, [r78], "R3-78 tanggal")[1]!;
const dioVer2 = cari(/terbaru (5\.\d+\.\d+), (\d{4}-\d{2}-\d{2})/, [r74], "R3-74 dio terbaru");
const dartDoc = cari(/\(Dart (\d+\.\d+\.\d+), dibuka/, [r223], "R3-223 dart doc")[1]!;
const andNsc = cari(/security-config \(Last updated (\d{4}-\d{2}-\d{2}) UTC/, [r220], "R3-220 nsc")[1]!;
const andSsl = cari(/security-ssl \(Last updated (\d{4}-\d{2}-\d{2}) UTC/, [r220], "R3-220 ssl")[1]!;
const apiLevel = cari(/API level (\d+)\)/, [r220], "R3-220 api")[1]!;
const rnVer = cari(/sampai (\d+\.\d+), dibuka/, [r220], "R3-220 rn")[1]!;
const ios14 = cari(/mulai iOS ([\d.]+) dan macOS ([\d.]+)\)/, [r221], "R3-221 ios");
const ios9 = cari(/SDK iOS ([\d.]+) atau macOS/, [r221], "R3-221 ats")[1]!;
const okhttp = cari(/Maven Central ([\d.]+), (\d{4}-\d{2}-\d{2})\)/, [r221], "R3-221 okhttp");
const leKunci = cari(/membuat (\d+) pasang kunci intermediate baru dan menerbitkan (\d+) sertifikat intermediate baru/, [r222], "R3-222 le");
const leTglKunci = cari(/pada (\d{4}-\d{2}-\d{2}) Let's Encrypt/, [r222], "R3-222 tgl kunci")[1]!;
const leTgl = cari(/Aaron Gable, (\d{4}-\d{2}-\d{2}),/, [r222], "R3-222 tgl")[1]!;
const chrTgl = cari(/chrome-72-deps-rems \(Last updated (\d{4}-\d{2}-\d{2}) UTC/, [r222], "R3-222 chrome")[1]!;
const brVer = cari(/Baseline Requirements ([\d.]+) \((\d+ \w+ \d{4});/, [r222], "R3-222 br");
const spVer = cari(/paket serverpod_client ([\d.]+)\)/, [r224], "R3-224 serverpod")[1]!;

const V: Record<string, string | number> = {
  rpTransfer: rp(nominalPindah), rpAsli: rp(nominalAsli), hstsDetik, hstsHari, hariTahun: 365,
  tokenDetik, tokenMenit, tokenM1: menitKomentar[0]!, tokenM2: menitKomentar[1]!, tokenM3: menitKomentar[2]!,
  hariDaun, h199: hari199, h201: hari201,
  tgl0: jadwal[0]!.sejak, hari0: jadwal[0]!.hari, kali0: jadwal[0]!.kali,
  tgl1: jadwal[1]!.sejak, hari1: jadwal[1]!.hari, kali1: jadwal[1]!.kali,
  tgl2: jadwal[2]!.sejak, hari2: jadwal[2]!.hari, kali2: jadwal[2]!.kali,
  nReq: ringkasC[1]!, nSampai: ringkasC[2]!, nTolak: ringkasC[3]!, nPinKata: KATA[baris6.length]!, jeda: jedaProxy,
  dioClose, dioValidasi, dioVer, dioVer2: dioVer2[1]!, dioTgl2: dioVer2[2]!, dartLab, dartDoc,
  leKunci: leKunci[1]!, leSert: leKunci[2]!, leTglKunci, leTgl, andNsc, andSsl, chrTgl, apiLevel, rnVer,
  ios1: ios14[1]!, mac1: ios14[2]!, ios9, okVer: okhttp[1]!, okTgl: okhttp[2]!, brVer: brVer[1]!, brTgl: brVer[2]!, spVer,
  tgl: tglBuka, tglAsvs,
  cbFlag: m26C.find((x) => x.mode === "terima-semua" && x.port === "18192")!.hasil.callback_dipanggil,
  cbBadTolak: pinB.find((x) => x.percaya === "ca-publik")!.hasil.callback_dipanggil,
  cbBad0: pinB.find((x) => x.percaya === "ca-publik+ca-dimas")!.hasil.callback_dipanggil,
  log0: logToken[0]!, log2: logToken[1]!, tabelRotasi,
};
const isi = (t: string): string =>
  t.replace(/«(\w+)»/g, (_, k: string) => {
    if (!(k in V)) throw new Error(`placeholder tidak dikenal: ${k}`);
    return String(V[k]);
  });

const unitHalaman = halaman.trim().split(/\n{2,}/);

// ---- isi halaman, unit demi unit (dipisah baris kosong); «nama» diisi dari sumber lewat isi() ----
const EXPECT: string[] = [
  "import Blok from \"../../../components/Blok.astro\";\nimport Rantai from \"../../../components/Rantai.astro\";\nimport Snippet from \"../../../components/Snippet.astro\";\nimport TabSet from \"../../../components/TabSet.astro\";\nimport Tebak from \"../../../widgets/tebak/Tebak.tsx\";\nimport intiDiagram from \"../../../../data/diagram/t3-tls-inti.json\";\nimport dataTebak from \"../../../../data/widget/t3-tls-tebak.json\";",
  "<p class=\"meta\">Baca 19 menit · coba 3 menit · Prasyarat: [[t3-m26]] · Jalur inti</p>",
  "<Blok nama=\"Mulai\" buka>",
  "## Inti",
  "Validasi sertifikat tidak menahan CA yang sudah ada di daftar akar. Pin yang diperiksa sebelum request keluar menahannya.",
  "<Rantai data={intiDiagram} ringkas />",
  "Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `dio.txt` bagian A, daftar akar app berisi CA Dimas, dan pin A dan B dipasang di `validateCertificate` milik dio. Proxy hotspot Dimas membaca token dan body Budi, server mencatat satu transfer «rpTransfer» ke Dimas, dan baru sesudahnya dio melempar galat sertifikat.",
  "Bagian B memasang pin yang sama di `connectionFactory` milik dart:io. Proxy hanya melihat handshake, nol request, dan database tanpa transfer. Proxy, server, dan client Dart berjalan di satu laptop, jadi Wi-Fi, perangkat, dan trust store HP sungguhan Tidak dijalankan.",
  "<details class=\"question\">\n<summary>Sudah tahu? Cek 3 pertanyaan</summary>",
  "1. Daftar akar app berisi CA Dimas. Kenapa validasi sertifikat yang aktif tidak menolaknya?\n2. Pin A dan B sudah terpasang, tetapi transfer «rpTransfer» tetap tercatat. Apa beda `validateCertificate` dan `connectionFactory`?\n3. Kenapa pin tanpa kunci cadangan bisa mematikan app yang server-nya sehat?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Coba\" buka aman=\"Kalau berhenti di sini, kamu sudah tahu: pin hanya menahan CA yang dipercaya bila diperiksa sebelum byte HTTP pertama, dan satu kunci cadangan menahan satu rotasi.\">",
  "Tebak dulu apa yang terjadi, lalu baca alasan tiap pilihan. Adegannya memakai `dio.txt` bagian A.",
  "<Tebak client:visible data={dataTebak} />",
  "<noscript>\n<p>Tanpa JavaScript tebakan tidak berjalan. Jawaban yang tepat: proxy sudah membaca request, server mencatat «rpTransfer» ke Dimas, dan baru sesudahnya callback menolak.</p>\n</noscript>",
  "**Ubah satu hal:** pindahkan pin yang sama dari `validateCertificate` ke `connectionFactory`. `dio.txt` bagian B merekamnya: proxy menerima handshake dan nol request, dan database tanpa transfer.",
  "Ubah satu hal lagi: server pindah ke kunci C yang belum ada di pin A dan B. `pin.txt` bagian C merekamnya. App dengan pin A dan B ditolak, dan app dengan pin B dan C terhubung.",
  "</Blok>",
  "<Blok nama=\"Paham\">",
  "### Kenapa ini ada",
  "[[t3-m26]] merekam transfer «rpTransfer» yang tidak dibuat Budi. Validasi sertifikat menolak CA Dimas selama CA itu di luar daftar akar app (`m26.txt` bagian B). Begitu CA itu masuk daftar, validasi meloloskannya (`m26.txt` bagian D). Bagaimana CA Dimas sampai di daftar akar HP sungguhan Tidak dijalankan.",
  "Dokumentasi Android menulis bahwa app bawaannya mempercayai CA sistem ([Android: Network security configuration](https://developer.android.com/privacy-and-security/security-config), Last updated «andNsc» UTC, dibuka «tgl»). App yang menarget Android 6.0 (API level «apiLevel») ke bawah juga mempercayai CA tambahan dari user.",
  "Dokumentasi React Native menulis bahwa penyerang bisa memasang root CA berbahaya di perangkat, dan pinning menahannya ([React Native: Security](https://reactnative.dev/docs/security), dibuka «tgl»).",
  "PRD v3 tidak meminta pin. Yang mendorongnya adalah risiko Sinta bahwa app dipakai di Wi-Fi tenant mitra yang tidak dikelola Rekeningo ([[t3-prd]]). Halaman ini memutuskan apa yang dipasang di app, dan apa yang tidak.",
  "### Cara kerjanya",
  "**Di antara lima pengaman yang direkam, hanya pin di `connectionFactory` menahan CA Dimas yang dipercaya sebelum request keluar.**",
  "| Pengaman di app | CA Dimas di luar daftar akar | CA Dimas di daftar akar | Sumber |\n|---|---|---|---|\n| Validasi bawaan | Ditolak saat handshake, proxy melihat nol request | Lolos: request terbaca, transfer «rpTransfer» tercatat | `m26.txt` bagian B dan D |\n| Flag terima-semua | Lolos: callback dipanggil «cbFlag» kali, transfer tercatat | Tidak direkam | `m26.txt` bagian C |\n| Pin di `badCertificateCallback` | Callback dipanggil «cbBadTolak» kali dan menolak | Callback dipanggil «cbBad0» kali, transfer tercatat | `pin.txt` bagian B |\n| Pin di `validateCertificate` dio | Tidak direkam | Callback menolak, tetapi request sudah terbaca dan transfer tercatat | `dio.txt` bagian A |\n| Pin di `connectionFactory` | Tidak direkam | Ditolak sesudah handshake: nol request, nol transfer | `pin.txt` bagian A, `dio.txt` bagian B |",
  "`badCertificateCallback` hanya dipanggil untuk sertifikat yang tidak bisa diautentikasi oleh akar tepercaya mana pun ([Dart: HttpClient.badCertificateCallback](https://api.dart.dev/stable/dart-io/HttpClient/badCertificateCallback.html), Dart «dartDoc», dibuka «tgl»). Karena CA Dimas sudah dipercaya, callback itu tidak punya kesempatan menolaknya.",
  "Callback `validateCertificate` milik dio dipanggil sesudah request terkirim. Di kode dio «dioVer», `request.close()` ada di baris «dioClose» dan `validateCertificate!(` di baris «dioValidasi» ([dio «dioVer», io_adapter.dart](https://github.com/cfug/dio/blob/dio_v«dioVer»/dio/lib/src/adapters/io_adapter.dart), dibuka «tgl»). Komentar dokumentasi di kode itu juga menulis bahwa callback ini baru dipanggil sesudah `SecurityContext` dan `badCertificateCallback` menerima rantai. Isu cfug/dio#2418 menanyakan hal ini, dan lab membuktikannya untuk «dioVer».",
  "**Pin diperiksa sesudah handshake, di dalam `connectionFactory`.** Fungsi ini mengambil alih pembuatan socket. Kodenya membuat socket TLS sendiri, membaca sertifikat server, dan menutup socket bila pin tidak cocok:",
  "<Snippet file=\"labs/t3-mitm/dart/bin/client.dart\" lines=\"«sp1a»:«sp1b»\" lang=\"dart\" title=\"labs/t3-mitm/dart/bin/client.dart\" />",
  "Rekaman mengukur \"nol request\" dari sisi proxy, dengan jeda «jeda» detik sebelum membaca catatannya, dan memeriksa database tanpa transfer. Dokumentasi Dart meminta factory tidak mengabaikan `proxyHost` dan `proxyPort` bila ada ([Dart: HttpClient.connectionFactory](https://api.dart.dev/stable/dart-io/HttpClient/connectionFactory.html), Dart «dartDoc», dibuka «tgl»). Lab memakai `findProxy = DIRECT`, jadi app yang harus lewat proxy butuh penanganan tambahan yang Tidak dijalankan.",
  "**Yang di-hash adalah SPKI, dan Dart tidak menyediakannya.** Pin lab adalah base64 dari SHA-256 atas SubjectPublicKeyInfo (SPKI), seperti sidik jari di RFC 7469 ([RFC 7469](https://www.rfc-editor.org/rfc/rfc7469), April 2015, dibuka «tgl»). Pin di Android dan OkHttp memakai rumus yang sama. `X509Certificate` di dart:io hanya memberi `der`, `pem`, `sha1`, dan metadata, tanpa accessor SPKI ([Dart: X509Certificate](https://api.dart.dev/stable/dart-io/X509Certificate-class.html), Dart «dartDoc»). Lab menulis penelusur DER sendiri:",
  "<Snippet file=\"labs/t3-mitm/dart/lib/pin.dart\" lines=\"«sp2a»:«sp2b»\" lang=\"dart\" title=\"labs/t3-mitm/dart/lib/pin.dart\" />",
  "Itu kode lab sebesar «barisPinDart» baris, diuji hanya lewat rekaman, dan belum ditinjau untuk produksi. `SecureSocket.peerCertificate` mengembalikan sertifikat server, dan `issuer` hanya berupa string. Menurut dokumentasi itu, rantai ke CA tidak bisa dibaca dari socket (penalaran penulis).",
  "**Pin cadangan menahan satu rotasi.** Rotasi diperankan dengan memulai ulang server tepi memakai kunci lain, dan sertifikatnya selalu sah. `pin.txt` bagian C menjalankan «nPinKata» pemeriksaan pin:",
  "| Pin di app | Server memakai kunci | Hasil |\n|---|---|---|\n«tabelRotasi»",
  "Dari «nReq» request client di bagian itu, «nSampai» sampai ke server tepi, dan «nTolak» yang ditolak pin tidak ada di log akses tepi. RFC 7469 lampiran B menyuruh operator melatih rencana cadangannya secara berkala, karena cadangan yang tidak pernah diuji sama saja dengan tanpa cadangan. Dokumentasi Android menyuruh pin cadangan, termasuk satu kunci yang sepenuhnya dalam kendalimu ([Android: Security with HTTPS and SSL](https://developer.android.com/privacy-and-security/security-ssl), Last updated «andSsl» UTC, dibuka «tgl»).",
  "**Pin SPKI tahan penerbitan ulang dengan kunci yang sama, pin sertifikat daun tidak.** Di `pin.txt` bagian D, sertifikat terbit ulang dengan kunci yang sama. Pin SPKI lama lolos, pin hash sertifikat lama ditolak, dan pin hash baru lolos. Hash sertifikat berubah di setiap penerbitan ulang, jadi pin daun mati sebanyak penerbitan ulang itu.",
  "Masa berlaku sertifikat daun dari CA publik kini dibatasi. Baseline Requirements «brVer» memuat jadwalnya ([CA/Browser Forum: Baseline Requirements](https://github.com/cabforum/servercert/blob/main/docs/BR.md), versi «brVer» bertanggal «brTgl», dibuka «tgl»):",
  "| Sejak | Masa berlaku maksimum | Penerbitan ulang per tahun, paling sedikit («hariTahun» ÷ masa berlaku) |\n|---|---|---|\n| «tgl0» | «hari0» hari | «kali0» kali |\n| «tgl1» | «hari1» hari | «kali1» kali |\n| «tgl2» | «hari2» hari | «kali2» kali |",
  "Kolom terakhir adalah Hitungan atas jadwal itu, dan \"paling sedikit\" berarti sertifikat dipakai sampai batasnya. Daun lab berlaku «hariDaun» hari: dengan jam tiruan di Go, hari ke-«h199» lolos dan hari ke-«h201» ditolak (`pin.txt` bagian E). Batas itu hanya untuk sertifikat dari CA publik. Dokumentasi React Native masih menulis sertifikat kedaluwarsa setiap 1 sampai 2 tahun, dan itu sudah tidak sesuai tabel di atas (penilaian penulis halaman).",
  "**HSTS dibaca browser, dan lab hanya merekamnya dengan curl.** Server tepi mengirim `Strict-Transport-Security: max-age=«hstsDetik»; includeSubDomains` di setiap jawaban lewat TLS, termasuk jawaban 401. Port HTTP hanya menjawab 301 tanpa header itu. RFC 6797 melarang host mengirim header itu lewat transport yang tidak aman ([RFC 6797](https://www.rfc-editor.org/rfc/rfc6797), November 2012, bagian 7.2, dibuka «tgl»). `max-age=«hstsDetik»` berarti «hstsHari» hari.",
  "`hsts.txt` bagian B merekam perilaku client dengan curl, bukan browser. Dengan cache HSTS kosong, permintaan `http://` pertama keluar sebagai teks biasa dan port TLS menolaknya dengan 400. Sesudah satu jawaban TLS, cache memuat host itu, dan `http://` dinaikkan ke `https://` sebelum meninggalkan client. Alamat IP tidak disimpan (bagian C), jadi dasbor yang dibuka lewat alamat IP tidak dilindungi.",
  "RFC 6797 menulis kedua batas itu: bagian 14.6 untuk permintaan pertama dan bagian 8.1.1 untuk alamat IP.",
  "Kode `lib/_http` dan `lib/io` di Dart SDK «dartLab» tidak memuat kata `hsts` atau `strict-transport`, begitu juga `lib` dio «dioVer» (dipindai di mesin penulis, «tgl»). Menurut pemindaian itu, client dart:io tidak menyimpan HSTS dari server. Itu dibaca dari kode, bukan dijalankan.",
  "Android punya opsi menolak lalu lintas tanpa enkripsi. iOS mengaktifkan App Transport Security bawaan untuk app yang di-link ke SDK iOS «ios9» atau lebih baru. Keduanya dibahas di tab di bawah, dan Tidak dijalankan. HSTS preload dan perilaku browser sungguhan juga Tidak dijalankan.",
  "**Token «tokenMenit» menit membatasi pencurian, tidak menghentikannya.** Server dijalankan dengan `-umur-sesi «tokenMenit»m`, dan login menjawab `kedaluwarsa_detik` «tokenDetik». Token yang proxy baca berlaku pada menit «tokenM1» dan menit «tokenM2». Pada menit «tokenM3» ia ditolak 401 (`token.txt` bagian A; jam server dimajukan lewat `POST /lab/jam`, waktu tidak ditunggu).",
  "Dimas memakai token itu lewat curl langsung ke api-t3, tanpa tepi TLS, dan hanya satu request saldo yang lewat proxy. Angka «tokenMenit» menit adalah pilihan naskah (Asumsi), dan token itu butuh cara app memperbaruinya tanpa login ulang. Usulnya refresh token dengan rotasi. RFC 9700 mengaturnya untuk client OAuth 2.0 publik ([RFC 9700](https://www.rfc-editor.org/rfc/rfc9700), bagian 2.2.2, dibuka «tgl»). api-t3 hanya punya sesi berumur tetap, jadi itu Tidak dijalankan.",
  "Token juga berakhir lebih awal lewat logout dan ganti password. Kode api-t3 menghapus baris sesinya di `Logout` dan `GantiPassword`, dan `token.txt` tidak merekamnya (Tidak dijalankan).",
  "**Log tidak boleh menyalin token.** Server tepi lab menyamarkan `Authorization` dan `Cookie` di log aksesnya: token Budi muncul «log0» kali di log tepi (`token.txt` bagian B). Varian rentan yang menyalin header membuat token muncul «log2» kali: satu dari `Authorization` dan satu dari `Cookie`. Siapa pun yang membaca log bisa memakainya sampai umurnya habis.",
  "OWASP ASVS menulis bahwa token sesi hanya boleh dicatat dalam bentuk hash atau disamarkan ([OWASP ASVS v5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0), V16.2.5, dibuka «tglAsvs»).",
  "### Di stack lain",
  "**Skenario:** app menolak sertifikat tiruan dari CA yang sudah ada di daftar akar, untuk API milik sendiri. Yang ditanyakan: di mana pin dipasang, kapan ia diperiksa, dan apa yang ditulis dokumentasinya tentang cadangan dan kedaluwarsa.",
  "Tab Flutter memakai rekaman Dart CLI di macOS. Tab lain Tidak dijalankan: semuanya dicek ke dokumentasi pada «tgl». Tanda [perlu verifikasi] berarti klaim itu belum bisa dicek ke sumber primer.",
  "<TabSet id=\"stack-mobile\" labels={[\"Flutter\", \"Android\", \"iOS\", \"React Native\", \"OkHttp\", \"Dart (Serverpod)\"]}>\n<Fragment slot=\"t0\">",
  "*Rekaman lab untuk Dart «dartLab» dan dio «dioVer» di macOS, bukan di HP. Dicek juga ke [dio](https://pub.dev/packages/dio), versi «dioVer2» terbit «dioTgl2», dibuka «tgl». Kode di bawah adalah Rekaman lab (`dio-pin-factory`).*",
  "<Snippet file=\"labs/t3-mitm/dart/bin/client.dart\" lines=\"«sp3a»:«sp3b»\" lang=\"dart\" title=\"labs/t3-mitm/dart/bin/client.dart\" />",
  "**Yang berbeda di stack ini:** pin dipasang di `HttpClient` lewat `connectionFactory`, lalu dio memakainya lewat `createHttpClient`. Kode `io_adapter.dart` di tag dio «dioVer2» memuat baris yang sama (`request.close()` di baris «dioClose», `validateCertificate!(` di baris «dioValidasi»), dan changelog «dioVer2» tidak menyebut `validateCertificate`. Versi itu dibaca, tidak dijalankan.",
  "</Fragment>\n<Fragment slot=\"t1\">",
  "*Tidak dijalankan. Dicek ke [Android: Network security configuration](https://developer.android.com/privacy-and-security/security-config), Last updated «andNsc» UTC, dan [Android: Security with HTTPS and SSL](https://developer.android.com/privacy-and-security/security-ssl), Last updated «andSsl» UTC, dibuka «tgl». Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"xml\" code={`<network-security-config>\n  <domain-config>\n    <domain includeSubdomains=\"true\">api.rekeningo.example</domain>\n    <pin-set expiration=\"2027-06-01\">\n      <pin digest=\"SHA-256\">PIN_KUNCI_SEKARANG=</pin>\n      <pin digest=\"SHA-256\">PIN_KUNCI_CADANGAN=</pin>\n    </pin-set>\n  </domain-config>\n</network-security-config>`} />",
  "**Yang berbeda di stack ini:** pin ada di file XML, bukan di kode, dan memakai hash SHA-256 atas SPKI. `expiration` menghentikan pinning sesudah tanggalnya. Dokumentasi menulis bahwa ini mencegah masalah koneksi di app yang belum diperbarui, tetapi bisa dimanfaatkan penyerang. Dokumentasi lain di situs yang sama menulis bahwa pinning tidak direkomendasikan untuk app Android, karena mengganti CA membuat app tidak bisa terhubung tanpa pembaruan.",
  "</Fragment>\n<Fragment slot=\"t2\">",
  "*Tidak dijalankan. Dicek ke dokumentasi Apple [NSPinnedDomains](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nspinneddomains) dan [Preventing Insecure Network Connections](https://developer.apple.com/documentation/security/preventing-insecure-network-connections), halaman tanpa nomor versi, dibuka «tgl».*",
  "**Yang berbeda di stack ini:** pin ada di `Info.plist` sebagai `NSPinnedDomains`, tersedia mulai iOS «ios1» dan macOS «mac1». Tiap domain memuat `NSPinnedCAIdentities` untuk CA atau sub-CA, `NSPinnedLeafIdentities` untuk sertifikat leaf, atau keduanya, dan bila keduanya ada, App Transport Security meminta kecocokan di tiap kategori. Pin CA tidak mengubah cara sistem menilai CA itu sebagai anchor.",
  "App Transport Security berlaku untuk URL Loading System dan tidak berlaku untuk antarmuka jaringan tingkat rendah. Format isi tiap identitas tidak terbaca di halaman yang dibuka [perlu verifikasi].",
  "</Fragment>\n<Fragment slot=\"t3\">",
  "*Tidak dijalankan. Dicek ke [React Native: Security](https://reactnative.dev/docs/security), halaman yang memuat daftar versi sampai «rnVer», dibuka «tgl».*",
  "**Yang berbeda di stack ini:** dokumentasi menjelaskan SSL pinning sebagai teknik di sisi client dan memperingatkan soal kedaluwarsa sertifikat. Bagian itu tidak menyebut cara memasangnya di app [perlu verifikasi]. Tab ini tidak bisa menjawab di mana pin dipasang.",
  "</Fragment>\n<Fragment slot=\"t4\">",
  "*Tidak dijalankan. Dicek ke [OkHttp: CertificatePinner.kt](https://github.com/square/okhttp/blob/master/okhttp/src/commonJvmAndroid/kotlin/okhttp3/CertificatePinner.kt), cabang master, teks mentah dibuka «tgl», dan rilis terbaru di Maven Central «okVer» («okTgl»). Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"kotlin\" code={`val pinner = CertificatePinner.Builder()\n    .add(\"api.rekeningo.example\", \"sha256/PIN_KUNCI_SEKARANG=\")\n    .add(\"api.rekeningo.example\", \"sha256/PIN_KUNCI_CADANGAN=\")\n    .build()\nval client = OkHttpClient.Builder()\n    .certificatePinner(pinner)\n    .build()`} />",
  "**Yang berbeda di stack ini:** `check` dipanggil sesudah handshake TLS yang berhasil dan sebelum koneksi dipakai, jadi urutannya sama dengan `connectionFactory` di lab. Pin cocok bila salah satu sertifikat di rantai punya hash yang di-pin, jadi pin CA dan pin leaf memakai API yang sama. Dokumentasi di kodenya memperingatkan bahwa pinning membatasi kemampuan tim server memperbarui sertifikat dan berpindah CA.",
  "</Fragment>\n<Fragment slot=\"t5\">",
  "*Tidak dijalankan. Dicek ke [Serverpod: Configure HTTP calls](https://docs.serverpod.dev/concepts/endpoints-and-apis/configure-http-calls), teks mentah dari file dokumentasi lengkap yang menyebut paket serverpod_client «spVer», dibuka «tgl».*",
  "**Yang berbeda di stack ini:** `Client` hasil generate menerima `httpClientOverride`, yaitu `http.Client` yang menukar transport HTTP. Dokumentasi menunjuk `cupertino_http` untuk iOS dan macOS dan `cronet_http` untuk Android, dan tidak menulis cara memasang pin. Kata pinning tidak ada di seluruh file dokumentasi itu. Memasang client dart:io ber-`connectionFactory` lewat `httpClientOverride` adalah penalaran penulis, dan Tidak dijalankan.",
  "</Fragment>\n</TabSet>",
  "</Blok>",
  "<Blok nama=\"Putuskan\">",
  "### ADR 31: validasi selalu aktif, pin SPKI dengan satu cadangan, HSTS di dasbor, token «tokenMenit» menit",
  "**Kebutuhan.** App 3.1 memuat flag yang menerima sertifikat apa pun, dan hotspot Dimas membaca token lalu mengubah transfer ([[t3-m26]]). PRD v3 menyebut Wi-Fi tenant mitra sebagai risiko ([[t3-prd]]). Validasi sertifikat tidak cukup bila daftar akar berisi CA yang salah (`m26.txt` bagian D).",
  "OWASP mencatat kelemahan yang sama dengan flag itu: pemeriksaan sertifikat dimatikan untuk pengembangan, lalu konfigurasinya terkirim ke produksi ([OWASP MASWE-0027](https://mas.owasp.org/MASWE/MASVS-NETWORK/MASWE-0027/), dibuka «tgl»). Halamannya tidak menyebut Flutter atau Dart.",
  "**Status:** diterima sesudah M26 (minggu 9). Urutan itu dibaca dari tabel masalah, karena naskah tidak menulis tanggal ADR.",
  "| | A. Tanpa pinning | B. Pin sertifikat daun | C. Pin CA | D. Pin SPKI dengan satu cadangan |\n|---|---|---|---|---|\n| Cara kerja | Validasi bawaan terhadap daftar akar. Flag terima-semua dicabut dari build rilis | App menyimpan hash seluruh sertifikat server dan menolak sertifikat lain | App hanya mempercayai satu CA penerbit atau intermediate, bukan seluruh daftar akar sistem | App menyimpan hash SPKI kunci server sekarang dan satu kunci cadangan, lalu memeriksanya sesudah handshake di `connectionFactory` |\n| Kelebihan | Tidak ada yang bisa mati karena rotasi, dan tidak ada kode pin | Paling sempit: hanya satu sertifikat yang lolos | Tahan penerbitan ulang dan rotasi kunci selama CA tetap sama. RFC 7469 menulis bahwa pin pada penerbit mengurangi jumlah penerbit yang bisa menipu | Tahan penerbitan ulang dengan kunci yang sama dan satu rotasi (`pin.txt` bagian C dan D). Menolak CA yang dipercaya sistem (`pin.txt` bagian A) |\n| Kekurangan | CA yang sudah ada di daftar akar lolos, dan transfer «rpTransfer» tercatat (`m26.txt` bagian D) | Mati di setiap penerbitan ulang, walau kuncinya sama (`pin.txt` bagian D) | CA yang dipin tetap bisa menerbitkan sertifikat tiruan bila salah menerbitkan, dan pindah CA mematikan app | Rotasi kedua mematikan app bila rilis berikutnya belum memasang kunci baru (`pin.txt` bagian C). Butuh kode periksa sendiri di Dart |\n| Biaya operasional | Nol | Rilis app di setiap penerbitan ulang: paling sedikit «kali0» kali per tahun untuk sertifikat CA publik (Hitungan) | Rilis app bila pindah CA. Let's Encrypt memutar intermediate dan memilihnya acak, jadi pin intermediate tidak bisa diandalkan | Kunci cadangan dibuat dan disimpan di luar server sebelum rilis, dan rotasi dijadwalkan bersama rilis app |\n| Bukti | `m26.txt` bagian B dan D | `pin.txt` bagian D dan E, dan Baseline Requirements «brVer» | `m26.txt` bagian B: daftar akar hanya CA Lab Publik menolak CA Dimas. Pin CA sendiri Tidak dijalankan | `pin.txt` bagian A, C, dan D, dan `dio.txt` bagian B |",
  "**Keputusan: opsi D.** Tujuh aturan:",
  "1. Validasi sertifikat selalu aktif di semua build, dan tidak ada callback yang menerima semua sertifikat di build rilis. Staging mempercayai CA Staging lewat daftar akar build staging (usul penulis, Tidak dijalankan).\n2. Pin SPKI dengan satu cadangan, diperiksa di `connectionFactory` sesudah handshake, bukan di `badCertificateCallback` dan bukan di `validateCertificate` (`pin.txt` bagian B, `dio.txt` bagian A dan B).\n3. Pin adalah base64 dari SHA-256 atas SPKI. Kunci cadangan dibuat sebelum rilis, disimpan di luar server, dan dilatih di staging.\n4. Tiap rilis app memasang pin kunci yang dipakai dan kunci berikutnya. Server tidak merotasi ke kunci yang belum ada di rilis yang masih dipakai.\n5. Pin punya tanggal kedaluwarsa yang ditulis di tiap rilis, dan sesudahnya app kembali ke validasi biasa. Kedaluwarsa pin Tidak dijalankan.\n6. Dasbor mengirim HSTS `max-age=«hstsDetik»; includeSubDomains` hanya lewat TLS, dan port HTTP hanya mengalihkan (`hsts.txt` bagian A). HSTS preload Tidak dijalankan.\n7. Token sesi berumur «tokenMenit» menit (Asumsi), dan log menyamarkan `Authorization` dan `Cookie` (`token.txt` bagian A dan B). Cara app memperbarui token Tidak dijalankan.",
  "**Kenapa D, bukan A sampai C.**",
  "- **A ditolak** karena CA yang sudah ada di daftar akar lolos, dan itu terjadi di M26 (`m26.txt` bagian D). A tetap sah bila tim server tidak bisa menjanjikan jadwal rotasi.\n- **B ditolak** karena hash sertifikat berubah di setiap penerbitan ulang, walau kuncinya sama (`pin.txt` bagian D). Jadwal masa berlaku membuatnya mati makin sering dari 2026 ke 2029.\n- **C ditolak** karena ia menahan CA lain tetapi bukan penerbitan salah oleh CA yang dipin, dan karena kasus industri di bawah menunjukkan penerbit memutar intermediate-nya. Itu penalaran penulis dan tidak direkam.",
  "**Kasus industri: Let's Encrypt.** Pada «leTglKunci» Let's Encrypt membuat «leKunci» pasang kunci intermediate baru dan menerbitkan «leSert» sertifikat intermediate baru. Mereka menulis bahwa memutar set intermediate mendorong otomatisasi dan menghambat kebiasaan lama seperti key pinning. Sumbernya tulisan Phil Porada dan Aaron Gable ([Let's Encrypt: New Intermediate Certificates](https://letsencrypt.org/2024/03/19/new-intermediate-certificates), «leTgl», dibuka «tgl»).",
  "Memperbarui kunci yang di-pin adalah proses manual yang menambah risiko galat dan gangguan bisnis. Intermediate biasanya berganti tiap lima tahun, dan umurnya dipendekkan menjadi tiga tahun. Penerbit dipilih acak per tipe kunci, sehingga tidak bisa diprediksi. Mereka menulis bahwa subscriber yang memin salah satu intermediate bisa terdampak, dan itu seharusnya sangat jarang.",
  "Batasnya: sikap satu penerbit CA, tanpa angka berapa app yang rusak. Bagi Rekeningo, kasus ini melemahkan opsi C bila CA yang dipin memutar intermediate-nya seperti itu. Kasus ini mendukung pin pada kunci milik sendiri (penilaian penulis halaman).",
  "Chrome mencabut HPKP, yaitu pin lewat header untuk browser, di versi 72. Alasannya adopsi sangat rendah dan risiko denial of service ([Chrome 72: deprecations and removals](https://developer.chrome.com/blog/chrome-72-deps-rems), Last updated «chrTgl» UTC, dibuka «tgl»). Pin di app berbeda, dan hanya rumus pin RFC 7469 yang dipakai di sini.",
  "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:",
  "1. Server dirotasi lebih cepat daripada rilis app, dan app lama terkunci di luar walau server sehat (`pin.txt` bagian C). Pencegahannya aturan 4: kunci berikutnya sudah ada di rilis sebelum dipakai server, dan rotasi menunggu sampai rilis itu dipakai sebagian besar user. Angka \"sebagian besar\" belum ditetapkan.\n2. Kunci cadangan tidak pernah diuji, atau jatuh ke tangan lain. RFC 7469 bagian 4.3 menulis bahwa penyerang yang memegang kunci cadangan bisa melakukan MITM tanpa terdeteksi. Lampiran B menulis bahwa cadangan yang tidak diuji sama dengan tanpa cadangan. Pencegahannya aturan 3: simpan di luar server dan latih di staging.\n3. Pin berpindah tempat tanpa ada yang sadar, misalnya dio memperbaiki urutan callback atau app memakai client lain. Pull request cfug/dio#2512 terbuka saat lab ditulis, dan client native lewat `httpClientOverride` memakai transport lain, bukan `connectionFactory` (penalaran dari dokumentasi Serverpod). Pencegahannya tes yang menjalankan proxy tiruan terhadap build rilis, seperti `make cek` di lab (usul penulis, belum ada).",
  "**Kapan keputusan ini salah.**",
  "- Saat rotasi kunci server lebih cepat daripada jadwal rilis app. Cadangan menahan satu rotasi, bukan dua (`pin.txt` bagian C).\n- Saat server pindah ke hosting lain tanpa rilis app yang lebih dulu memasang kunci barunya. Pindah hosting di Tahap 4 ([[t4-m34]]) mengganti server tepi dan mungkin kunci TLS-nya, dan itu penalaran penulis.\n- Saat tim server tidak mau memegang jadwal rotasi bersama tim app. Dokumentasi Android dan OkHttp sama-sama menyebut pinning berisiko tanpa persetujuan pengelola TLS server, dan opsi A kembali.\n- Pin di Android, iOS, dan Flutter Web Tidak dijalankan: perilakunya di HP sungguhan belum diketahui.",
  "**Yang akan merevisinya.** Pindah hosting di Tahap 4 ([[t4-m34]]) adalah rotasi berikutnya yang kamu tahu akan datang. ADR ini ditinjau ulang sebelum pindah.",
  "### Sengaja belum dilakukan",
  "| Yang ditunda | Kenapa ditunda | Muncul lagi di |\n|---|---|---|\n| Pin di Android dan iOS | Lab memakai Dart CLI di macOS, dan perilaku di HP Tidak dijalankan | Sebelum rilis app yang memasang pin |\n| HSTS preload dan perilaku browser | Hanya curl yang diuji | Belum dijadwalkan |\n| Refresh token dan pencabutan token | api-t3 hanya punya sesi berumur tetap, dan rotasi refresh token adalah usul | Belum dijadwalkan |\n| Certificate Transparency | Dokumentasi Android punya opsi untuk membatasi koneksi ke sertifikat yang tercatat di log, dan opsi itu tidak diuji | Belum dijadwalkan |",
  "</Blok>",
  "<Blok nama=\"Kunci\">",
  "### Cek diri",
  "**1.** Daftar akar app berisi CA Dimas, dan pin A dan B dipasang di `validateCertificate` milik dio. Apa yang proxy lihat, dan apa yang tercatat di database?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Proxy membaca token dan body, dan database mencatat satu transfer «rpTransfer» dari Budi ke Dimas. Baru sesudahnya callback menolak dan dio melempar galat sertifikat (`dio.txt` bagian A). Kode dio memanggil `request.close()` sebelum `validateCertificate`.",
  "</details>",
  "**2.** Server pindah ke kunci B, dan app 1.0 hanya mem-pin A. Server sehat dan sertifikatnya sah. Apa yang terjadi, dan apa yang memperbaikinya?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Pin A menolak server B, dan request tidak pernah dikirim. Hanya rilis app baru yang memperbaikinya, dan app 1.1 dengan pin A dan B tetap terhubung (`pin.txt` bagian C).",
  "</details>",
  "**3.** App 1.1 mem-pin A dan B, lalu server dirotasi ke kunci C. Apa yang terjadi, dan apa yang seharusnya sudah ada di rilis sebelumnya?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Pin A dan B menolak server C, dan app dengan pin B dan C terhubung. Cadangan hanya menahan satu rotasi, jadi rilis berikutnya harus sudah memasang B dan C sebelum rotasi itu (`pin.txt` bagian C).",
  "</details>",
  "**4.** Sertifikat server terbit ulang dengan kunci yang sama. Pin mana yang mati: hash SPKI atau hash sertifikat daun?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Hash sertifikat daun. Hash SPKI tidak berubah karena kuncinya sama (`pin.txt` bagian D). Dengan masa berlaku «hariDaun» hari, pin daun mati paling sedikit «kali0» kali per tahun (Hitungan).",
  "</details>",
  "### Saat me-review kode AI, cek ini",
  "- [ ] Tidak ada `badCertificateCallback` yang selalu mengembalikan `true`, dan tidak ada flag staging yang ikut ke build rilis.\n- [ ] Pin diperiksa sebelum request keluar (`connectionFactory`, `CertificatePinner`), bukan di callback yang jalan sesudah jawaban tiba.\n- [ ] Pin memuat kunci yang dipakai dan satu kunci cadangan, dan cadangan itu pernah diuji.\n- [ ] Hash yang di-pin adalah SPKI, bukan hash sertifikat daun yang mati di setiap penerbitan ulang.\n- [ ] Log akses tidak menyalin `Authorization` dan `Cookie`.\n- [ ] Token berumur pendek, dan app tahu cara memperbaruinya tanpa meminta password lagi.",
  "### Bacaan lanjut",
  "- [RFC 7469: Public Key Pinning Extension for HTTP](https://www.rfc-editor.org/rfc/rfc7469) (2015)\n- [RFC 6797: HTTP Strict Transport Security](https://www.rfc-editor.org/rfc/rfc6797) (2012)\n- [Android: Network security configuration](https://developer.android.com/privacy-and-security/security-config)\n- [Let's Encrypt: New Intermediate Certificates](https://letsencrypt.org/2024/03/19/new-intermediate-certificates) («leTgl»)\n- [Apple: NSPinnedDomains](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nspinneddomains)\n- [Dart: HttpClient.connectionFactory](https://api.dart.dev/stable/dart-io/HttpClient/connectionFactory.html)",
  "</Blok>",
];

// ---- jangkar kode: rentang Snippet diturunkan dari kode lab -----------------------------------------
const barisClient = clientDart.split("\n");
const barisPin = pinDart.split("\n");
const nomor = (baris: string[], pola: RegExp, dari = 0): number => {
  const i = baris.findIndex((b, k) => k >= dari && pola.test(b));
  if (i < 0) throw new Error(`jangkar tidak ada: ${pola}`);
  return i + 1;
};
const sp1a = nomor(barisClient, /^\/\/\/ HttpClient yang memeriksa sertifikat server sesudah handshake/);
const sp1b = nomor(barisClient, /^String alasanSingkat\(/) - 2;
const sp2a = nomor(barisPin, /^\/\/\/ SubjectPublicKeyInfo \(DER lengkap\)/);
const sp2b = nomor(barisPin, /^String pinSpki\(/);
const dioAwal = nomor(barisClient, /^ {8}dio\.httpClientAdapter = IOHttpClientAdapter\($/, nomor(barisClient, /^ {6}\} else \{$/) - 1);
const sp3a = dioAwal;
const sp3b = dioAwal + 2;
const barisPinDart = pinDart.replace(/\n$/, "").split("\n").length;
Object.assign(V, { sp1a, sp1b, sp2a, sp2b, sp3a, sp3b, barisPinDart });

describe("halaman 3.25: isi dikunci unit demi unit, nilai diturunkan dari sumber", () => {
  test("frontmatter, meta, registry, dan naskah", () => {
    const h = (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; peran?: string[]; menit?: number; path?: string; adr?: number[]; topik?: string; masalah?: string; pendek?: string; label?: string }[]).find((x) => x.id === "t3-tls-pinning")!;
    expect(h.ada).toBe(true);
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.lab, h.prasyarat, h.peran, h.path, h.adr, h.topik, h.label]).toEqual(["3.25", "konsep", 4, true, ["t3-mitm"], ["t3-m26"], ["mobile", "security", "backend"], "tahap-3/tls-pinning.md", [31], "Keamanan", "Keamanan 6"]);
    expect(h.judul).toBe("Keamanan 6: TLS, HSTS, pinning + ADR 31");
    expect(h.masalah).toBe("Sertifikat selalu divalidasi, dan pin selalu datang dengan cadangan");
    expect(frontmatter).toContain(`title: "${h.nomor} ${h.judul}"`);
    expect(frontmatter).toContain(
      "description: Validasi sertifikat tidak menahan CA yang sudah ada di daftar akar, jadi app memeriksa pin sebelum request keluar. ADR 31 menimbang tiga cara lain dan menulis kapan pin justru mematikan app.",
    );
    expect(naskah).toContain("| 3.25 | 4 | Keamanan 6: TLS, HSTS, pinning + ADR 31 | Keamanan + ADR | ★ | t3-mitm | tebak |");
    expect(naskah).toContain("| M26 | 9 | Budi sedang makan");
    expect(ceritaT3).toContain("| Sertifikat selalu divalidasi, dan pin selalu datang dengan cadangan | [3.25 Keamanan 6: TLS, HSTS, pinning + ADR 31](/tahap-3/tls-pinning/) |");
    const meta = halaman.match(/^<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-m26\]\] · Jalur inti<\/p>$/m)!;
    expect(meta).not.toBeNull();
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(Number(meta[2])).toBe(3);
    expect(h.inti).toBe(true);
    expect(hitung(halaman, /Jalur inti/g)).toBe(1);
    const isiProsa = halaman.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isiProsa.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(meta[1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("EXPECT: semua unit halaman sama dengan yang diturunkan dari sumber, urutan dan isinya", () => {
    expect(unitHalaman).toEqual(EXPECT.map(isi));
  });
  test("bentuk baris dikunci: tepat satu baris kosong antar unit, tanpa spasi di ujung baris, tanpa tab atau CR, berakhir satu baris baru", () => {
    // Pemisah /\n{2,}/ di atas menyerap baris kosong ganda dan menyatukan baris kosong yang dihapus tanpa mengubah teks unit: bandingkan utuh.
    expect(halaman).toBe(EXPECT.map(isi).join("\n\n") + "\n");
    expect(halaman.includes("\r")).toBe(false);
    expect(halaman.includes("\t")).toBe(false);
    expect(halaman.split("\n").filter((b) => b !== b.trimEnd())).toEqual([]);
    expect(halaman.endsWith("</Blok>\n")).toBe(true);
    expect(mdx.startsWith("---\ntitle: ")).toBe(true);
    expect(mdx.split(/^---\n/m)).toHaveLength(3);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka", () => {
    const b = daftarBlok(halaman);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil ke pembaca; tanpa kita, Anda, tanda seru, emoji", () => {
    const tampil = halaman + JSON.stringify(rantaiMentah) + JSON.stringify(tebakMentah);
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/\bPR ?#?\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    const tanpaKode = halaman.replace(/code=\{`[\s\S]*?`\}/g, "").replace(/`[^`\n]*`/g, "");
    expect(tanpaKode).not.toMatch(/\bkita\b|\bAnda\b|!|\p{Extended_Pictographic}/u);
    // Label rekaman seperti C2 dan satuan "B" + angka ditolak cek_id_tampil.py: bagian ditulis dengan kata.
    expect(tampil).not.toMatch(/\b[A-G]\d\b/);
  });
  test("kalimat utama dipasangkan dengan nilai rekaman, bukan hanya dikunci sebagai teks", () => {
    const tampilkan = (kalimat: string) => expect(halaman, kalimat).toContain(kalimat);
    tampilkan(`server mencatat satu transfer ${rp(nominalPindah)} ke Dimas`);
    tampilkan(`Proxy hanya melihat handshake, nol request, dan database tanpa transfer.`);
    tampilkan(`[[t3-m26]] merekam transfer ${rp(nominalPindah)} yang tidak dibuat Budi.`);
    tampilkan(`Dari ${ringkasC[1]} request client di bagian itu, ${ringkasC[2]} sampai ke server tepi, dan ${ringkasC[3]} yang ditolak pin tidak ada di log akses tepi.`);
    tampilkan(`Daun lab berlaku ${hariDaun} hari: dengan jam tiruan di Go, hari ke-${hari199} lolos dan hari ke-${hari201} ditolak`);
    tampilkan(`Android 6.0 (API level ${apiLevel}) ke bawah`);
    tampilkan(`\`max-age=${hstsDetik}\` berarti ${hstsHari} hari.`);
    tampilkan(`login menjawab \`kedaluwarsa_detik\` ${tokenDetik}.`);
    tampilkan("Proxy hotspot Dimas membaca token dan body Budi, server mencatat satu transfer " + rp(nominalPindah) + " ke Dimas, dan baru sesudahnya dio melempar galat sertifikat.");
    expect(dioA[1]!.hasil).toMatchObject({ hasil: "ditolak", jenis: "dio-badCertificate" });
    // Logout dan ganti password menghapus baris sesi: dibaca dari kode api-t3, bukan direkam di token.txt.
    expect(fungsiGo(sesiGo, "Logout")).toContain("s.repo.HapusSesi(ctx, hashToken(token))");
    expect(fungsiGo(repoGo, "GantiPassword")).toContain("DELETE FROM sesi WHERE akun_id = $1");
    expect(fungsiGo(repoGo, "HapusSesi")).toContain("DELETE FROM sesi WHERE token_hash = $1");
    tampilkan("Kode api-t3 menghapus baris sesinya di `Logout` dan `GantiPassword`, dan `token.txt` tidak merekamnya (Tidak dijalankan).");
    expect(tokenTxt).not.toMatch(/logout|ganti password|GantiPassword/i);
    expect(tokenMenit).toBe(15);
    expect(menitKomentar).toEqual(["1", "14,5", "15,5"]);
    expect(logToken).toEqual([0, 2]);
    expect(baris6).toHaveLength(6);
    expect(rotasi).toHaveLength(7);
    expect(Number(ringkasC[1]) - Number(ringkasC[2])).toBe(Number(ringkasC[3]));
    expect(nominalAsli).toBe(10000);
    expect(nominalPindah).toBe(150000);
    expect(jadwal.map((j) => j.hari)).toEqual([200, 100, 47]);
    expect(jadwal.map((j) => koma(Math.round((365 / j.hari) * 100) / 100))).toEqual(jadwal.map((j) => j.kali));
    expect(hariDaun).toBe(jadwal[0]!.hari);
    expect(hstsHari).toBe(365);
  });
});

describe("rekaman dio, pin, m26, hsts, dan token: angka dan hasil di halaman", () => {
  test("dio.txt A: callback dio menolak, tetapi proxy sudah membaca request dan transfer tercatat; B: pin di connectionFactory, nol request", () => {
    expect(dioA.map((x) => [x.mode, x.percaya, x.port, x.pin, x.hasil.hasil, x.hasil.callback_dipanggil])).toEqual([
      ["dio-validate", "ca-publik+ca-dimas", "18190", ["spki_server-a", "spki_server-b"], "terhubung", 1],
      ["dio-validate", "ca-publik+ca-dimas", "18192", ["spki_server-a", "spki_server-b"], "ditolak", 1],
    ]);
    expect(dioA[1]!.hasil.jenis).toBe("dio-badCertificate");
    expect(lihatProxy(bagian(D, "A"))).toEqual([{ handshake: "ya", request: 1 }]);
    expect(bagian(D, "A")).toContain("# Authorization yang dibaca proxy sama dengan token sesi Budi: ya");
    expect(trfDioA).toEqual([{ jurnal: 10001, nomor: "K00419", jumlah: -nominalPindah }, { jurnal: 10001, nomor: "K00417", jumlah: nominalPindah }]);
    expect(dioB.map((x) => [x.mode, x.port, x.hasil.hasil, x.hasil.jenis ?? null])).toEqual([
      ["dio-pin-factory", "18192", "ditolak", "pin-tidak-cocok"],
      ["dio-pin-factory", "18190", "terhubung", null],
    ]);
    expect(lihatProxy(bagian(D, "B"))).toEqual([{ handshake: "ya", request: 0 }]);
    expect(bagian(D, "B")).toContain("# Database: tidak ada transfer. Proxy menerima handshake, tidak menerima satu request pun.");
    expect(dioTxt).toContain(`Kode sumber dio-${dioVer}, lib/src/adapters/io_adapter.dart: request.close() di baris ${dioClose}, validateCertificate!(...) di baris ${dioValidasi}.`);
    expect(dioClose).toBeLessThan(dioValidasi);
    expect(dioTxt).toContain(`Klaim dio#2418 terbukti untuk dio ${dioVer} dengan IOHttpClientAdapter bawaan`);
    expect(dioTxt).toContain("PR cfug/dio#2512 (perbaikan di dio sendiri, terbuka saat lab ditulis): Tidak dijalankan; dio 5.11.1 tidak diuji.");
    expect(versiKlien[2]).toBe(dioVer);
  });
  test("pin.txt A: pin A dan B lolos ke server asli dan menolak tiruan walau CA Dimas dipercaya; B: callback pin 0 atau 1 kali", () => {
    expect(pinA.map((x) => [x.mode, x.percaya, x.port, x.pin, x.hasil.hasil, x.hasil.jenis ?? x.hasil.status])).toEqual([
      ["pin-spki", "ca-publik+ca-dimas", "18190", ["spki_server-a", "spki_server-b"], "terhubung", 200],
      ["pin-spki", "ca-publik+ca-dimas", "18192", ["spki_server-a", "spki_server-b"], "ditolak", "pin-tidak-cocok"],
    ]);
    expect(lihatProxy(bagian(P, "A"))).toEqual([{ handshake: "ya", request: 0 }]);
    expect(bagian(P, "A")).toContain("# Database: tidak ada transfer. Pin ditolak sesudah handshake dan sebelum byte HTTP pertama (connectionFactory).");
    expect(pinB.map((x) => [x.mode, x.percaya, x.port, x.hasil.hasil, x.hasil.status ?? x.hasil.jenis, x.hasil.callback_dipanggil])).toEqual([
      ["pin-badcallback", "ca-publik+ca-dimas", "18192", "terhubung", 201, 0],
      ["pin-badcallback", "ca-publik", "18192", "ditolak", "handshake", 1],
    ]);
    expect(lihatProxy(bagian(P, "B"))[0]).toEqual({ handshake: "ya", request: 1 });
    expect(barisTransfer(bagian(P, "B")).map((r) => r.jumlah)).toEqual([-nominalPindah, nominalPindah]);
  });
  test("pin.txt C: enam pemeriksaan pin berurutan sesuai kode _c_rotasi; cadangan menahan satu rotasi; log tepi tanpa permintaan yang ditolak", () => {
    expect(rotasi.map((r) => [r.mode, r.server, r.pin.join("+"), r.rekaman.pin.join("+"), r.jawab.hasil, r.jawab.jenis ?? r.jawab.status])).toEqual([
      ["pin-spki", "A", "A", "spki_server-a", "terhubung", 200],
      ["validasi", "B", "", "", "terhubung", 200],
      ["pin-spki", "B", "A", "spki_server-a", "ditolak", "pin-tidak-cocok"],
      ["pin-spki", "A", "A+B", "spki_server-a+spki_server-b", "terhubung", 200],
      ["pin-spki", "B", "A+B", "spki_server-a+spki_server-b", "terhubung", 200],
      ["pin-spki", "C", "A+B", "spki_server-a+spki_server-b", "ditolak", "pin-tidak-cocok"],
      ["pin-spki", "C", "B+C", "spki_server-b+spki_server-c", "terhubung", 200],
    ]);
    expect(bagian(P, "C")).toContain("# App 1.0 terkunci di luar: server sehat, sertifikat sah, request tidak pernah dikirim. Hanya rilis baru yang memperbaikinya.");
    expect(bagian(P, "C")).toContain("# Rotasi kedua ke C, kunci yang belum ada di pin: cadangan hanya menahan satu rotasi. Rilis berikutnya harus mem-pin B dan C sebelum rotasi itu.");
    expect(rotasiKode).toContain("harap(len(baris), 5,");
    expect(rotasiKode).toContain('U.mulai_tepi("server-b", log=log)');
    expect(readmeLab).toContain("Dari 7 request client di bagian itu, 5 sampai ke tepi dan 2 yang ditolak pin tidak ada di log tepi.");
  });
  test("pin.txt D dan E: SPKI sama setelah terbit ulang, hash sertifikat berbeda; masa berlaku 200 hari dengan jam tiruan; jadwal 365 ÷ hari", () => {
    expect(pinD.map((x) => [x.mode, x.pin.join("+"), x.hasil.hasil])).toEqual([
      ["pin-spki", "spki_server-a", "terhubung"],
      ["pin-cert", "cert_server-a", "ditolak"],
      ["pin-cert", "cert_server-a2", "terhubung"],
    ]);
    expect(bagian(P, "D")).toContain("# pin SPKI A sama dengan SPKI A2: ya; hash sertifikat A sama dengan A2: tidak");
    expect(hariDaun).toBe(Number(cari(/^const HariDaun = (\d+)$/, pkiGo.split("\n"), "pki HariDaun")[1]));
    expect(hari199).toBe(String(hariDaun - 1));
    expect(hari201).toBe(String(hariDaun + 1));
    expect(bagian(P, "E")).toContain("$ pki -umur   # Go, x509.Verify dengan CurrentTime = terbit + n hari; bukan client Dart (Dart tidak punya jam tiruan)");
    expect(jadwal.map((j) => j.sejak)).toEqual(["2026-03-15", "2027-03-15", "2029-03-15"]);
    expect(bagian(P, "E").join("\n")).toContain("Hitungan, bukan rekaman; batas masa berlaku dari CA/B Forum SC-081v3");
    expect(r222).toContain(`memuat masa berlaku maksimum sertifikat subscriber ${jadwal[0]!.hari} hari sejak ${jadwal[0]!.sejak}, ${jadwal[1]!.hari} hari sejak ${jadwal[1]!.sejak}, dan ${jadwal[2]!.hari} hari sejak ${jadwal[2]!.sejak}`);
  });
  test("m26.txt B, C, dan D: validasi menolak CA Dimas di luar daftar akar dan meloloskannya di dalam; flag terima-semua meloloskan", () => {
    expect(m26B.map((x) => [x.mode, x.percaya, x.port, x.hasil.hasil, x.hasil.jenis ?? x.hasil.status])).toEqual([
      ["validasi", "ca-publik", "18190", "terhubung", 200],
      ["validasi", "ca-publik", "18192", "ditolak", "handshake"],
    ]);
    expect(lihatProxy(bagian(M, "B"))).toEqual([{ handshake: "ya", request: 0 }]);
    const flag = m26C.find((x) => x.mode === "terima-semua" && x.port === "18192")!;
    expect([flag.percaya, flag.hasil.hasil, flag.hasil.status, flag.hasil.callback_dipanggil]).toEqual(["ca-publik", "terhubung", 201, 1]);
    expect(m26D.map((x) => [x.mode, x.percaya, x.port, x.hasil.hasil, x.hasil.status])).toEqual([["validasi", "ca-publik+ca-dimas", "18192", "terhubung", 201]]);
    expect(barisTransfer(bagian(M, "D")).map((r) => r.jumlah)).toEqual([-nominalPindah, nominalPindah]);
    expect(bagian(M, "D")).toContain("# Lab menaruh CA Dimas di daftar akar app. Bagaimana CA itu sampai di sana (profil dipasang di HP, CA yang salah menerbitkan): Tidak dijalankan.");
    expect(bagian(M, "D")).toContain("# Validasi sertifikat yang benar tidak cukup bila daftar akar berisi CA yang salah: lanjut ke pin.txt.");
  });
  test("hsts.txt: STS hanya di jawaban TLS (termasuk 401), port HTTP 301 tanpa header; cache curl menaikkan http; alamat IP tidak disimpan", () => {
    const hstsHeader = `max-age=${hstsDetik}; includeSubDomains`;
    expect(jawabanHstsA.map((j) => [j.kode, j.header["strict-transport-security"] ?? null])).toEqual([[301, null], [401, hstsHeader]]);
    expect(jawabanHstsB.map((j) => [j.kode, j.header["strict-transport-security"] ?? null])).toEqual([[400, null], [401, hstsHeader], [401, hstsHeader]]);
    expect(jawabanHstsC.map((j) => [j.kode, j.header["strict-transport-security"] ?? null])).toEqual([[401, hstsHeader], [400, null]]);
    const b = bagian(H, "B").join("\n");
    expect(b).toContain("curl -i --cacert ca-publik.pem --hsts hsts.txt http://localhost:18190/warung   # cache HSTS masih kosong");
    expect(b).toContain("Permintaan pertama ke http:// tidak terlindungi (RFC 6797 bagian 14.6).");
    expect(b).toContain("Client sent an HTTP request to an HTTPS server.");
    expect(b).toContain("# Sesudah jawaban TLS, cache hsts.txt memuat localhost: ya");
    expect(b).toContain("# Dengan cache: permintaan yang sama dinaikkan ke https sebelum meninggalkan klien; yang sampai ke server adalah TLS (401, bukan 400).");
    expect(bagian(H, "A").join("\n")).toContain("RFC 6797 bagian 7.2: host tidak boleh mengirim header itu lewat transport yang tidak aman.");
    expect(hstsTxt).toContain("# --- C. Alamat IP: HSTS tidak disimpan (RFC 6797 bagian 8.1.1) ---");
    expect(hstsTxt).toContain("# Tidak dijalankan: HSTS preload list di browser, dan penyimpanan HSTS di browser (hanya curl yang diuji).");
    expect(readmeLab).toContain("curl 8.7.1 di macOS; versi tidak direkam");
  });
  test("token.txt: umur 15 menit, token berlaku di menit 1 dan 14,5 dan ditolak 401 di 15,5; log tepi 0 kali lawan 2 kali", () => {
    expect(jawabanTokenA.map((j) => j.kode)).toEqual([200, 200, 200, 401]);
    expect(jawabanTokenA.at(-1)!.header["www-authenticate"]).toBe('Bearer error="invalid_token"');
    expect(bagianTokenPy).toContain('U.siapkan(["-jam-lab", "-umur-sesi", "15m"], login=False)');
    expect(bagian(T, "A")).toContain("# Tidak dijalankan: refresh token dan pencabutan token di app; api-t3 hanya punya sesi dengan umur tetap.");
    expect(bagian(T, "A").join("\n")).toContain("Jam server dimajukan lewat POST /lab/jam (waktu tidak ditunggu).");
    expect(bagian(T, "A").join("\n")).toContain("Umur pendek tidak menghentikan pencurian: ia membatasi lamanya.");
    expect(bagian(T, "B").join("\n")).toContain("(satu dari Authorization, satu dari Cookie)");
    expect(bagian(T, "B")).toContain("  GET /akun/419 200 Authorization: [disamarkan]");
    expect(bagian(T, "B")).toContain("  GET /akun/419 401 Cookie: [disamarkan]");
    expect(bagian(T, "B").join("\n")).toMatch(/GET \/akun\/419 200 Authorization: Bearer <token sesi Budi>/);
    expect(bagian(T, "B").join("\n")).toMatch(/GET \/akun\/419 401 Cookie: __Host-sesi=<token sesi Budi>/);
    expect(r78).toContain("token sesi hanya boleh dicatat dalam bentuk hash atau disamarkan");
  });
});

describe("kode lab: connectionFactory, penelusur SPKI, HSTS di server tepi, dan klaim negatif berlingkup", () => {
  const snippetBerkas = [...halaman.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)" /g)].map((m) => ({ file: m[1]!, a: Number(m[2]), b: Number(m[3]) }));
  test("rentang Snippet diturunkan dari jangkar kode; tanpa ID riset atau nomor PR di dalamnya", () => {
    expect(snippetBerkas).toEqual([
      { file: "labs/t3-mitm/dart/bin/client.dart", a: sp1a, b: sp1b },
      { file: "labs/t3-mitm/dart/lib/pin.dart", a: sp2a, b: sp2b },
      { file: "labs/t3-mitm/dart/bin/client.dart", a: sp3a, b: sp3b },
    ]);
    for (const [kode, a, b] of [[clientDart, sp1a, sp1b], [pinDart, sp2a, sp2b], [clientDart, sp3a, sp3b]] as const) {
      const potongan = kode.split("\n").slice(a - 1, b).join("\n");
      expect(potongan).not.toMatch(/\bR\d-\d{2,3}\b|\bPR ?#?\d{2,3}\b|keputusan \d{3,4}/);
    }
    expect(barisClient[sp1b - 1]).toBe("}");
    expect(barisClient[sp3b - 1]).toBe("        );");
    expect(barisPin[sp2b - 1]).toBe("String pinSpki(Uint8List der) => base64.encode(sha256.convert(spkiDariDer(der)).bytes);");
    expect(barisClient[sp3a]).toBe("          createHttpClient: () => klienPin(ctx, (c) => pins.contains(pinSpki(c.der))),");
  });
  test("klienPin: socket TLS dibuat di connectionFactory, sertifikat server dibaca sesudah handshake, socket dihancurkan sebelum dikembalikan", () => {
    const potongan = barisClient.slice(sp1a - 1, sp1b).join("\n");
    const urut = ["c.connectionFactory = (Uri uri, String? proxyHost, int? proxyPort) async {", "final tugas = await SecureSocket.startConnect(uri.host, uri.port, context: ctx);", "final s = await tugas.socket; // handshake selesai; belum ada byte HTTP yang ditulis", "final cert = s.peerCertificate;", "if (cert == null || !cocok(cert)) {", "s.destroy();", "throw PinTidakCocok();", "return tugas;"];
    // Tiap kunci adalah satu baris kode utuh (bukan komentar atau potongan baris), dan urutannya tetap.
    const kode = potongan.split("\n").map((b) => b.trim());
    let dari = -1;
    for (const k of urut) {
      const i = kode.indexOf(k);
      expect(i, k).toBeGreaterThan(dari);
      dari = i;
    }
    expect(potongan).toContain("c.findProxy = (_) => 'DIRECT';");
    expect(potongan).toContain("// handshake selesai; belum ada byte HTTP yang ditulis");
    expect(clientDart).toContain("klien = klienPin(ctx, (c) => pins.contains(pinSpki(c.der)));");
  });
  test("tiap mode client dipasang di tempat yang dikatakan halaman: badCertificateCallback, validateCertificate, connectionFactory", () => {
    const mode = (nama: string): string => {
      const a = clientDart.indexOf(`case '${nama}':`);
      expect(a, nama).toBeGreaterThan(0);
      const b = clientDart.indexOf("case '", a + 1);
      return clientDart.slice(a, b < 0 ? a + 400 : b);
    };
    expect(mode("terima-semua")).toContain("badCertificateCallback");
    expect(mode("terima-semua")).toContain("return true;");
    expect(mode("pin-badcallback")).toContain("badCertificateCallback");
    expect(mode("pin-badcallback")).toContain("pins.contains(pinSpki(cert.der))");
    expect(mode("pin-spki")).toContain("klienPin(ctx, (c) => pins.contains(pinSpki(c.der)))");
    expect(mode("pin-cert")).toContain("pinSertifikat(c.der)");
    const dioValidasiKode = clientDart.slice(clientDart.indexOf("if (mode == 'dio-validate') {"), clientDart.indexOf("} else {", clientDart.indexOf("if (mode == 'dio-validate') {")));
    expect(dioValidasiKode).toContain("validateCertificate: (cert, host, port) {");
    expect(dioValidasiKode).toContain("pins.contains(pinSpki(cert.der))");
    expect(dioValidasiKode).not.toContain("connectionFactory");
    expect(clientDart).toContain("createHttpClient: () => klienPin(ctx,");
    expect(clientDart).toContain("final c = SecurityContext(withTrustedRoots: false);");
  });
  test("pin.dart: pin SPKI = base64(SHA-256(SPKI DER)); pin daun = SHA-256 heksadesimal atas seluruh sertifikat; penelusur DER sendiri", () => {
    expect(pinDart).toContain("String pinSpki(Uint8List der) => base64.encode(sha256.convert(spkiDariDer(der)).bytes);");
    expect(pinDart).toContain("String pinSertifikat(Uint8List der) => sha256.convert(der).toString();");
    expect(pinDart).toContain("Uint8List spkiDariDer(Uint8List der) {");
    expect(pinDart).toContain("Rumus pin sama dengan Android Network Security Config:");
    expect(pinDart).toContain("// base64 dari SHA-256 atas SubjectPublicKeyInfo (SPKI) sertifikat server.");
    expect(pubspec).toContain(`  crypto: 3.0.7`);
    expect(clientDart).not.toContain("peerCertificateChain");
  });
  test("server tepi: HSTS di setiap jawaban TLS, port HTTP hanya mengalihkan tanpa header, Authorization dan Cookie disamarkan", () => {
    const awalHttp = tepiGo.indexOf("if *alamatHTTP != \"\" {");
    expect(awalHttp).toBeGreaterThan(0);
    const blokHttp = tepiGo.slice(awalHttp, tepiGo.indexOf("log.Printf(\"tepi mendengar"));
    expect(blokHttp).toContain("http.Redirect(w, r, \"https://\"");
    expect(blokHttp).toContain("http.StatusMovedPermanently");
    expect(blokHttp.replace(/\/\/.*$/gm, "")).not.toContain("Strict-Transport-Security");
    expect(blokHttp).toContain("// Port HTTP: hanya 301 ke https, tanpa header Strict-Transport-Security.");
    const blokTls = tepiGo.slice(tepiGo.indexOf("utama := http.HandlerFunc"), awalHttp);
    expect(blokTls).toContain('w.Header().Set("Strict-Transport-Security", fmt.Sprintf("max-age=%d; includeSubDomains", *hsts))');
    expect(blokTls).toContain("if *hsts > 0 {");
    expect(tepiGo).toContain('case "authorization", "cookie", "proxy-authorization":');
    expect(tepiGo).toContain('return "[disamarkan]"');
    expect(tepiGo).toContain("if mentah {");
  });
  test("klaim negatif berlingkup: lab t3-mitm tidak punya kode Android, iOS, atau browser; README mengakui yang tidak dijalankan", () => {
    const berkasLab = [...(terlacak ?? [])].filter((b) => b.startsWith("labs/t3-mitm/"));
    expect(berkasLab.length).toBeGreaterThan(20);
    // "diuji hanya lewat rekaman": lab t3-mitm tidak punya tes Dart (hanya tes Go untuk pki, tepi, mitm, dan pagar).
    expect(berkasLab.filter((b) => b.startsWith("labs/t3-mitm/dart/") && /test|_test\.dart$/i.test(b))).toEqual([]);
    expect(berkasLab.filter((b) => b.endsWith("_test.go")).length).toBeGreaterThan(0);
    expect(berkasLab.filter((b) => /android|\bios\b|\.kt$|\.swift$|\.plist$|AndroidManifest|network_security_config|\.html$/i.test(b))).toEqual([]);
    for (const k of [
      "**Flutter di Android atau iOS: Tidak dijalankan.**",
      "**HSTS di browser dan preload list: Tidak dijalankan.**",
      "**Pin Dart di Flutter Web: Tidak dijalankan.**",
      "**Refresh token, penyimpanan token di app, dan pencabutan token: Tidak dijalankan.**",
      "**dio 5.11.1 dan PR cfug/dio#2512: Tidak dijalankan.**",
      "**mitmproxy v12.3.0: Tidak dijalankan.**",
    ]) expect(readmeLab, k).toContain(k);
    expect(readmeLab).toContain("Pernyataan \"nol request\" memakai jeda 0,4 detik.");
    expect(umumPy).toContain("tunggu=0.4");
    expect(halaman).toContain("Pin di Android dan iOS");
    expect(halaman).toContain("HSTS preload dan perilaku browser");
  });
});

describe("widget Tebak dan diagram Inti: nilai diturunkan dari rekaman", () => {
  test("Tebak dipasang sekali sebagai island client:visible dengan noscript berisi jawaban yang tepat", () => {
    expect(hitung(halaman, /<Tebak client:visible data=\{dataTebak\} \/>/g)).toBe(1);
    const benar = tebak.pilihan.find((p) => p.benar)!;
    expect(halaman).toContain(`<noscript>\n<p>Tanpa JavaScript tebakan tidak berjalan. Jawaban yang tepat: ${benar.teks.charAt(0).toLowerCase()}${benar.teks.slice(1)}</p>\n</noscript>`);
    expect(halaman.indexOf("<noscript>")).toBeGreaterThan(halaman.indexOf("<Tebak"));
  });
  test("Tebak: posisi dan panjang jawaban benar tidak mencolok; semua string diturunkan dari rekaman dan kode", () => {
    const i = tebak.pilihan.findIndex((p) => p.benar);
    expect(i).toBe(3);
    expect(tebak.pilihan).toHaveLength(4);
    const panjang = tebak.pilihan.map((p) => p.teks.length);
    expect(panjang[i]).toBeLessThan(Math.max(...panjang));
    expect(tebak.id).toBe("t3-tls-tebak");
    expect(tebak.judul).toBe("Pin di callback milik dio");
    expect(tebak.sumber).toEqual({ jenis: "rekaman", teks: "labs/t3-mitm/output/dio.txt bagian A; pin.txt bagian B" });
    expect(tebak.adegan).toEqual([
      "App Budi memasang pin SPKI A dan B di callback `validateCertificate` milik dio. Daftar akar app berisi CA Dimas, jadi sertifikat tiruan hotspot Dimas lolos validasi bawaan.",
      `Budi mengirim ${rp(nominalAsli)} ke Citra lewat hotspot itu. Proxy Dimas mengubahnya menjadi ${rp(nominalPindah)} ke Dimas dan meneruskannya ke server asli.`,
    ]);
    expect(tebak.pertanyaan).toBe("Apa yang proxy Dimas lihat, dan apa yang tercatat di database?");
    expect(tebak.pilihan.map((p) => p.teks)).toEqual([
      "Pin menolak sertifikat tiruan sebelum request keluar, jadi proxy hanya melihat handshake dan database tanpa transfer.",
      "Handshake gagal karena CA Dimas tidak ada di daftar akar, jadi pin tidak pernah diperiksa.",
      "Request lolos dan transfer tercatat, karena callback pin tidak pernah dipanggil bila CA dipercaya.",
      `Proxy sudah membaca request, server mencatat ${rp(nominalPindah)} ke Dimas, dan baru sesudahnya callback menolak.`,
    ]);
    expect(tebak.pilihan.map((p) => p.alasan)).toEqual([
      `Itu hasil pin di \`connectionFactory\` (dio.txt bagian B). Pin dio diperiksa sesudah jawaban tiba: kode dio ${dioVer} memanggil \`request.close()\` di baris ${dioClose}, sebelum \`validateCertificate\` di baris ${dioValidasi}.`,
      `CA Dimas ada di daftar akar, jadi handshake lolos. Callback dio dipanggil satu kali (\`callback_dipanggil\` ${dioA[1]!.hasil.callback_dipanggil} di dio.txt bagian A). Validasi bawaan tidak menolak CA yang sudah dipercaya.`,
      `Itu hasil pin di \`badCertificateCallback\` milik dart:io: callback dipanggil ${pinB[0]!.hasil.callback_dipanggil} kali (pin.txt bagian B). Callback dio lain: ia dipanggil, dan menolak, tetapi terlambat.`,
      `dio.txt bagian A: proxy membaca token dan body, database mencatat satu transfer ${rp(nominalPindah)} dari Budi ke Dimas, lalu \`validateCertificate\` menolak dan dio melempar galat sertifikat. Penolakannya benar, tetapi datang sesudah uang pindah.`,
    ]);
    expect(tebak.penutup).toBe("Pin yang sama menahan sebelum request di `connectionFactory`, dan hanya menyesali sesudahnya di `validateCertificate`. Tempat pin diperiksa menentukan apa yang sempat keluar.");
    expect(tebak.label).toEqual({ sumber: "Rekaman lab · dio.txt", tebakDulu: "Tebak dulu:", benar: "Tepat", belum: "Belum tepat", ulang: "Coba pilihan lain", jawaban: "Jawaban yang tepat" });
    expect(Object.keys(tebakMentah).sort()).toEqual(["adegan", "id", "judul", "label", "penutup", "pertanyaan", "pilihan", "sumber"]);
    // Pilihan benar di posisi yang berbeda dari tebakan Tahap 3 lain.
    for (const f of ["t3-skema-tebak", "t3-dua-instance-tebak", "t3-offline-tebak"]) {
      const lain = DataTebak.parse(JSON.parse(baca(`situs/data/widget/${f}.json`)));
      expect(lain.pilihan.findIndex((p) => p.benar), f).not.toBe(i);
    }
  });
  test("diagram Rantai Inti: simpul diturunkan dari dio.txt bagian A dan B, sumber rekaman, judul pendek", () => {
    expect(rantai.id).toBe("t3-tls-inti");
    expect(rantai.judul).toBe("CA Dimas dipercaya: pin di dua tempat");
    expect(rantai.judul.length).toBeLessThanOrEqual(47);
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-mitm, dio.txt bagian A dan B" });
    expect(rantai.baris.map((b) => [b.label, b.sub])).toEqual([["Pin di dio", "validateCertificate"], ["Pin di connectionFactory", "sesudah handshake"]]);
    expect(rantai.baris[0]!.simpul).toEqual([
      { teks: "handshake lolos", sub: "CA Dimas dipercaya", nada: "biasa", kode: false },
      { teks: "proxy membaca request", sub: "token dan body", nada: "warn", kode: false },
      { teks: `transfer ${rp(nominalPindah)} tercatat`, nada: "warn", kode: false },
    ]);
    expect(rantai.baris[1]!.simpul).toEqual([
      { teks: "handshake lolos", sub: "CA Dimas dipercaya", nada: "biasa", kode: false },
      { teks: "pin ditolak", sub: "sebelum request", nada: "good", kode: false },
      { teks: `${lihatProxy(bagian(D, "B"))[0]!.request} request, ${barisTransfer(bagian(D, "B")).length} transfer`, nada: "good", kode: false },
    ]);
    expect(rantai.catatan).toBe("Kotak oranye adalah hasil yang merugikan Budi, dan kotak hijau adalah hasil yang aman. Proxy tiruan dan client Dart berjalan di satu laptop, jadi Wi-Fi dan HP sungguhan Tidak dijalankan.");
    expect(lihatProxy(bagian(D, "A"))[0]!.request).toBe(1);
  });
});

describe("sumber dokumentasi: baris riset R3-220 sampai R3-224, tanggal, versi, dan klaim negatif berlingkup", () => {
  const ids = ["R3-220", "R3-221", "R3-222", "R3-223", "R3-224"];
  test("lima baris ada sekali, urut sesudah R3-208, dibuka pada tanggal yang sama dengan halaman", () => {
    const urut = riset.split("\n").filter((b) => /^\| R3-\d+ \|/.test(b)).map((b) => b.split("|")[1]!.trim());
    const i = urut.indexOf("R3-220");
    expect(urut.slice(i, i + 5)).toEqual(ids);
    expect(Number(urut[i - 1]!.slice(3))).toBeLessThan(220);
    expect(new Set(urut).size).toBe(urut.length);
    for (const id of ids) expect(barisRiset(id), id).toContain(`dibuka ${tglBuka}`);
    expect(tglBuka).toBe("2026-10-27");
    const tanggalHalaman = new Set(halaman.match(/dibuka (\d{4}-\d{2}-\d{2})/g)!.map((x) => x.slice(7)));
    expect([...tanggalHalaman].sort()).toEqual([tglAsvs, tglBuka]);
    expect(hitung(halaman, new RegExp(`dibuka ${tglAsvs}`, "g"))).toBe(1);
    expect(r78).toContain(`dibuka ${tglAsvs}`);
  });
  test("isi baris riset dikunci dengan sidik jari; klaim kunci ada di baris yang dirujuk halaman", () => {
    const sj = Object.fromEntries(ids.map((id) => [id, sidik(barisRiset(id))]));
    expect(sj).toEqual(SIDIK_RISET);
    for (const k of ["Last updated 2026-08-28 UTC", "you should always include a backup key", "Otherwise, you must push out an update to the app to restore connectivity", "may enable attackers to bypass your pinned certificates", "Android 6.0 (API level 23) ke bawah juga mempercayai CA tambahan dari user", "Cleartext traffic opt-out", "Certificate transparency", "custom trust anchors", "Last updated 2026-10-23 UTC", "is not recommended for Android apps", "paling sedikit satu kunci yang sepenuhnya dalam kendali", "Certificates expire every 1-2 years", "sampai 0.87"]) expect(r220, k).toContain(k);
    for (const k of ["iOS 14.0 dan macOS 11.0", "`NSPinnedCAIdentities`", "`NSPinnedLeafIdentities`", "ATS meminta kecocokan di tiap kategori", "`NSIncludesSubdomains`", "pin CA tidak mengubah cara sistem menilai CA itu sebagai anchor", "SDK iOS 9.0 atau macOS 10.11", "tidak berlaku untuk antarmuka jaringan tingkat rendah", "Format isi identitas tiap pin tidak terbaca di halaman yang dibuka [perlu verifikasi]", "Maven Central 5.5.1, 2026-10-22", "after a successful TLS handshake, but before the connection is used", "Certificate Pinning is Dangerous!", "`sha256/`"]) expect(r221, k).toContain(k);
    for (const k of ["10 pasang kunci intermediate baru dan menerbitkan 15 sertifikat intermediate baru", "pada 2024-03-13", "Aaron Gable, 2024-03-19", "discourages outdated practices like key pinning", "manual process", "lima tahun", "tiga tahun", "dipilih acak per tipe kunci", "incredibly rare", "tanpa angka berapa app rusak", "Last updated 2018-12-18 UTC", "HPKP dihapus di Chrome 72", "denial of service dan hostile pinning", "RFC 7469 (April 2015", "bagian 4", "still significantly reduces the number of issuers", "an untested backup is no backup at all", "Baseline Requirements 2.3.1 (4 Oktober 2026", "200 hari sejak 2026-03-15", "100 hari sejak 2027-03-15", "47 hari sejak 2029-03-15", "bukan CA privat"]) expect(r222, k).toContain(k);
    for (const k of ["Dart 3.13.7", "cannot be authenticated by any of our trusted root certificates", "Sets the function used to create socket connections", "`proxyHost` dan `proxyPort`", "DIRECT", "`X509Certificate` punya `der`, `pem`, `sha1`", "tanpa accessor SubjectPublicKeyInfo", "`issuer` berupa String", "`SecurityContext({withTrustedRoots = false})`", "`hsts` dan `strict-transport` 0 kemunculan di `lib/_http` dan `lib/io` Dart SDK 3.11.4 dan di `lib` paket dio 5.11.0", "tag dio_v5.11.0", "`request.close()` baris 161", "`validateCertificate!(` baris 195", "komentar `validateCertificate` menulis callback dipanggil hanya bila SecurityContext dan badCertificateCallback menerima rantai", "absennya kata tidak membuktikan absennya perilaku di versi lain"]) expect(r223, k).toContain(k);
    for (const k of ["llms-full.txt", "paket serverpod_client 4.0.0", "`httpClientOverride`", "`cupertino_http`", "`cronet_http`", "`SecurityContextConfig`", "kata `pinning`, `badCertificate`, dan `connectionFactory` 0 kemunculan di seluruh berkas", "RFC 9700 (BCP 240, Januari 2025", "bagian 2.2.2", "sender-constrained", "refresh token rotation", "api-t3 bukan server OAuth", "RFC 6797 (November 2012", "MUST NOT include the STS header field in HTTP responses conveyed over non-secure transport", "bagian 6.1.1", "bagian 8.1.1", "bagian 14.6"]) expect(r224, k).toContain(k);
    const r216 = barisRiset("R3-216");
    for (const k of ["mas.owasp.org/MASWE/MASVS-NETWORK/MASWE-0027/", "dibuka 2026-10-27", "Disabling Certificate Validation", "mematikan atau melewati pemeriksaan sertifikat untuk mempermudah pengembangan atau menelusuri masalah koneksi, lalu mengirim konfigurasi itu ke produksi", "tidak menyebut Flutter atau Dart"]) expect(r216, k).toContain(k);
    expect(r74).toContain("dio 5.11.0 (pub.dev; terbaru 5.11.1, 2026-09-04, changelog tidak menyebut validateCertificate; dibuka 2026-10-25)");
    expect(r74).toContain("kode dio 5.11.1 dibaca dari tag `dio_v5.11.1` lewat GitHub API (2026-10-25)");
    expect(r74).toContain("PR #2512 (open, 2026-05-10)");
    expect(r74).toContain("`request.close()` baris 161 dan `validateCertificate!(` baris 195");
    expect(r78).toContain("OWASP ASVS v5.0.0 V16.2.5 (L2, github.com/OWASP/ASVS tag v5.0.0, dibuka 2026-10-25;");
    expect(tglAsvs).toBe("2026-10-25");
  });
  test("versi dan tanggal sumber di halaman cocok dengan baris riset dan rekaman", () => {
    for (const k of ["RFC 7469](https://www.rfc-editor.org/rfc/rfc7469), April 2015", "[RFC 6797](https://www.rfc-editor.org/rfc/rfc6797), November 2012, bagian 7.2", "[RFC 9700](https://www.rfc-editor.org/rfc/rfc9700), bagian 2.2.2", "V16.2.5", "Phil Porada dan Aaron Gable", "bagian 2.2.2", "bagian 14.6", "bagian 8.1.1", "bagian 4.3", "lampiran B"]) expect(halaman, k).toContain(k);
    expect(r222).toContain("RFC 7469 (April 2015");
    expect(r224).toContain("RFC 6797 (November 2012");
    expect(halaman).toContain(`Chrome mencabut HPKP, yaitu pin lewat header untuk browser, di versi 72.`);
    expect(r222).toContain("HPKP dihapus di Chrome 72");
    expect(halaman).toContain("Pull request cfug/dio#2512 terbuka saat lab ditulis");
    expect(halaman).toContain(`kode lab sebesar ${barisPinDart} baris`);
    expect(halaman).toContain("serverpod_client " + spVer);
    expect(naskah).toContain("sejak 2026-03-15 pin daun mati paling sedikit 1,83 kali per tahun");
    expect(naskah).toContain("Pin cadangan menahan satu rotasi, bukan dua (pin.txt C)");
  });
  test("tautan eksternal dikunci per teks dan alamat; setiap alamat ada jejaknya di baris riset; satu teks tautan, satu alamat", () => {
    const tautan = [...halaman.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => [m[1]!, m[2]!] as const);
    const peta = new Map<string, Set<string>>();
    for (const [t, u] of tautan) peta.set(t, (peta.get(t) ?? new Set()).add(u));
    for (const [t, us] of peta) expect(us.size, `teks tautan ganda: ${t}`).toBe(1);
    expect([...new Set(tautan.map(([, u]) => u))].sort()).toEqual(ALAMAT.map(([u]) => u).sort());
    const semuaRiset = [...ids, "R3-74", "R3-78", "R3-216"].map(barisRiset).join("\n");
    for (const [u, jejak] of ALAMAT) expect(semuaRiset, u).toContain(jejak);
    expect(caraPakai).toMatch(/^#+ Label sumber$/m);
  });
  test("klaim negatif halaman dibatasi ke halaman atau berkas yang dibuka dan dijaga baris riset", () => {
    expect(halaman).toContain("Kode `lib/_http` dan `lib/io` di Dart SDK 3.11.4 tidak memuat kata `hsts` atau `strict-transport`, begitu juga `lib` dio 5.11.0 (dipindai di mesin penulis, 2026-10-27).");
    expect(halaman).toContain("Kata pinning tidak ada di seluruh file dokumentasi itu.");
    expect(halaman).toContain("dan tidak menulis cara memasang pin.");
    expect(halaman).toContain("Bagian itu tidak menyebut cara memasangnya di app [perlu verifikasi].");
    expect(halaman).toContain("Format isi tiap identitas tidak terbaca di halaman yang dibuka [perlu verifikasi].");
    expect(halaman).toContain("Tab Flutter memakai rekaman Dart CLI di macOS. Tab lain Tidak dijalankan:");
    expect(halaman).toContain("Bagaimana CA Dimas sampai di daftar akar HP sungguhan Tidak dijalankan.");
    expect(halaman).toContain("Menurut dokumentasi itu, rantai ke CA tidak bisa dibaca dari socket (penalaran penulis).");
  });
});

describe("tab Di stack lain, kartu Cek diri, dan tetangga", () => {
  test("enam tab mobile; lima Tidak dijalankan dan satu Rekaman lab; satu pernyataan Yang berbeda per tab; kode berlabel", () => {
    expect(halaman).toContain('<TabSet id="stack-mobile" labels={["Flutter", "Android", "iOS", "React Native", "OkHttp", "Dart (Serverpod)"]}>');
    expect([...halaman.matchAll(/^\*(Rekaman lab untuk|Tidak dijalankan\.)/gm)].map((m) => m[1])).toEqual(["Rekaman lab untuk", ...Array(5).fill("Tidak dijalankan.")]);
    expect(halaman.match(/<Fragment slot="t\d">/g)).toHaveLength(6);
    expect(halaman.match(/\*\*Yang berbeda di stack ini:\*\*/g)).toHaveLength(6);
    expect(halaman.match(/Kode di bawah adalah Ilustrasi\./g)).toHaveLength(2);
    expect(halaman.match(/Kode di bawah adalah Rekaman lab/g)).toHaveLength(1);
    expect(halaman.match(/<Snippet lang="(xml|kotlin)" code=/g)).toHaveLength(2);
    expect(halaman).not.toMatch(/yang sama di semua stack/i);
    // Setiap tab mengutip sumbernya dengan tanggal akses atau versi.
    for (const t of ["Last updated 2026-08-28 UTC", "Last updated 2026-10-23 UTC", "halaman tanpa nomor versi, dibuka 2026-10-27", "daftar versi sampai 0.87", "cabang master", "serverpod_client 4.0.0"]) expect(halaman, t).toContain(t);
  });
  test("kartu.json (turunan sinkron_cerita.py) memuat empat soal Cek diri persis seperti di halaman", () => {
    const kartu = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { halaman: string; tanya: string; jawab: string }[];
    const k = kartu.filter((x) => x.halaman === "t3-tls-pinning");
    expect(k).toHaveLength(4);
    for (const x of k) {
      expect(halaman, x.tanya).toContain(x.tanya);
      expect(halaman, x.tanya).toContain(x.jawab);
    }
  });
  test("Sudah tahu? Cek 3 pertanyaan sama dengan jumlah butir; Cek diri punya empat kartu dengan jawaban", () => {
    const sum = halaman.match(/<summary>Sudah tahu\? Cek (\d+) pertanyaan<\/summary>\n\n((?:\d+\. .+\n)+)/)!;
    expect(Number(sum[1])).toBe(sum[2]!.trim().split("\n").length);
    expect(halaman.match(/<details class="success">/g)).toHaveLength(4);
    expect(halaman.match(/^\*\*\d\.\*\* /gm)).toHaveLength(4);
    expect(halaman.match(/<summary>Jawaban<\/summary>/g)).toHaveLength(4);
  });
  test("ADR 31: empat opsi, tujuh aturan, tiga pre-mortem, kapan salah, kasus industri; cocok dengan naskah", () => {
    const adr31 = naskah.split("\n").find((b) => b.startsWith("| 31 | Validasi sertifikat selalu aktif"))!;
    expect(adr31).toBeDefined();
    for (const k of ["pin SPKI dengan satu cadangan", "masa berlaku pin", "token 15 menit", "pin di `HttpClient.connectionFactory`", "bukan `badCertificateCallback`", "bukan `validateCertificate` dio", "Tanpa pinning", "pin sertifikat daun", "pin CA", "Pin cadangan menahan satu rotasi, bukan dua (pin.txt C)", "HSTS preload, dan Flutter Web Tidak dijalankan"]) expect(adr31, k).toContain(k);
    expect(halaman).toContain("### ADR 31: validasi selalu aktif, pin SPKI dengan satu cadangan, HSTS di dasbor, token 15 menit");
    expect(halaman).toContain("| | A. Tanpa pinning | B. Pin sertifikat daun | C. Pin CA | D. Pin SPKI dengan satu cadangan |");
    expect(halaman).toContain("**Keputusan: opsi D.** Tujuh aturan:");
    const aturan = halaman.split("**Keputusan: opsi D.** Tujuh aturan:")[1]!.split("**Kenapa D, bukan A sampai C.**")[0]!;
    expect(aturan.match(/^\d+\. /gm)).toHaveLength(7);
    const pre = halaman.split("**Pre-mortem.**")[1]!.split("**Kapan keputusan ini salah.**")[0]!;
    expect(pre.match(/^\d+\. /gm)).toHaveLength(3);
    expect(halaman.match(/^- \*\*[A-C] ditolak\*\*/gm)).toHaveLength(3);
    expect(halaman).toContain("**Kapan keputusan ini salah.**");
    expect(halaman).toContain("**Yang akan merevisinya.**");
    expect(halaman).toContain("**Kasus industri: Let's Encrypt.**");
    expect(halaman).toContain("### Sengaja belum dilakukan");
    expect(naskah).toContain("| M26 | 9 |");
    expect(naskah).toContain("App 3.1 memuat flag");
    expect(halaman).toContain("**Kebutuhan.** App 3.1 memuat flag yang menerima sertifikat apa pun");
  });
  test("tautan [[ID]] ada di registry dan daftarnya dikunci", () => {
    const ids = [...new Set([...halaman.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]!))].sort();
    expect(ids).toEqual(["berikutnya", "t3-m26", "t3-prd", "t4-m34"]);
    const reg = new Set((registry.halaman as { id: string }[]).map((h) => h.id));
    for (const id of ids.filter((x) => x !== "berikutnya")) expect(reg.has(id), id).toBe(true);
    const h = registry.halaman as { id: string; nomor?: string; judul: string; ada: boolean }[];
    expect(h.find((x) => x.id === "t4-m34")).toMatchObject({ nomor: "4.16" });
    expect(h.find((x) => x.id === "t3-m26")).toMatchObject({ nomor: "3.24" });
  });
  test("janji dari tetangga ditepati: PRD menyebut Wi-Fi tenant mitra; naskah menaruh pin di 3.25; halaman tidak membahas passkey dan XSS", () => {
    expect(prd).toContain("4. App dipakai di Wi-Fi tenant mitra yang tidak dikelola Rekeningo.");
    expect(halaman).toContain("risiko Sinta bahwa app dipakai di Wi-Fi tenant mitra yang tidak dikelola Rekeningo ([[t3-prd]])");
    expect(halaman).not.toMatch(/passkey|innerHTML|CSRF/i);
    expect(naskah).toContain("| M26 | 9 | Budi sedang makan di kantin tenant mitra di kota kelima.");
    expect(naskah).toContain("| 3.24 | 4 | M26: Transfer yang tidak dibuat Budi | Masalah | ★ | t3-mitm | alur |");
  });
});

describe("halaman istilah Certificate pinning dan HSTS, glosarium", () => {
  const slug = ["certificate-pinning", "hsts"];
  const jalan = (s: string) => `situs/data/halaman-istilah/${s}.json`;
  test("dua halaman istilah valid, rujukan ke 3.25, rekaman dan riset ada", () => {
    for (const s of slug) {
      const d = HalamanIstilah.parse(JSON.parse(baca(jalan(s))));
      expect(d.cerita!.every((c) => c.rujukan === "t3-tls-pinning"), s).toBe(true);
      expect(d.stack).toBeNull();
      for (const x of d.sumber!) {
        if ("rekaman" in x) expect(fs.existsSync(path.join(akar, x.rekaman)), x.rekaman).toBe(true);
        if (x.riset) expect(riset, x.riset).toContain(`| ${x.riset} |`);
      }
    }
  });
  test("isi dua halaman istilah dikunci dengan sidik jari; angka di cerita diturunkan dari rekaman", () => {
    const isiJ = Object.fromEntries(slug.map((s) => [s, sidik(JSON.stringify(JSON.parse(baca(jalan(s)))))]));
    expect(isiJ).toEqual(SIDIK_ISTILAH);
    const h = JSON.parse(baca(jalan("hsts"))) as { cerita: { teks: string }[]; sumber: { url?: string; catatan: string }[] };
    expect(h.cerita[0]!.teks).toContain(`\`max-age=${hstsDetik}; includeSubDomains\``);
    expect(h.sumber.find((x) => x.url?.endsWith("rfc6797"))!.catatan).toContain("Bagian 7.2: host tidak boleh mengirim header lewat transport tidak aman. Bagian 8.1.1: alamat IP tidak dicatat. Bagian 14.6");
    const c = JSON.parse(baca(jalan("certificate-pinning"))) as { cerita: { teks: string }[]; sumber: { riset?: string; url?: string }[] };
    expect(c.cerita[0]!.teks).toContain("proxy melihat handshake dan nol request (`pin.txt` bagian A)");
    expect(c.sumber.map((x) => x.riset ?? null)).toEqual(["R3-77", "R3-220", "R3-222", null]);
  });
  test("glosarium: dua istilah menuju 3.25 dan terkait satu sama lain; tooltip dan halaman istilah dibangkitkan", () => {
    const baris = (nama: string) => glosMdx.split("\n").find((b) => b.startsWith(`| **${nama}**`))!;
    for (const nama of ["Certificate pinning", "HSTS"]) expect(baris(nama), nama).toMatch(/\| \[\[t3-tls-pinning\]\] \|$/);
    const glos = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; h: string | null; b: string | null }[];
    expect(glos.find((x) => x.t === "Certificate pinning")).toMatchObject({ h: "/istilah/certificate-pinning/", b: "t3-tls-pinning" });
    expect(glos.find((x) => x.t === "HSTS (HTTP Strict Transport Security)")).toMatchObject({ h: "/istilah/hsts/", b: "t3-tls-pinning" });
    for (const s of slug) for (const n of JSON.parse(baca(jalan(s))).terkait as string[]) expect(glos.some((x) => x.t === n), n).toBe(true);
    expect(glosMdx.split("\n").filter((b) => /^\| \*\*(Certificate pinning|HSTS)\*\*/.test(b))).toHaveLength(2);
    expect(baris("Certificate pinning")).toContain("| **Certificate pinning** | App atau browser hanya menerima kunci server yang sudah ia simpan, walau sertifikat lain lolos validasi karena CA-nya dipercaya sistem. |");
    expect(baris("HSTS")).toContain("| **HSTS** (HTTP Strict Transport Security) | Header yang membuat browser memakai https untuk sebuah host selama jangka waktu tertentu, sehingga permintaan http dinaikkan ke https sebelum meninggalkan browser. |");
    // Empat istilah dasar yang dipakai halaman ini dan 3.24: baris glosarium saja, tanpa halaman istilah.
    for (const nama of ["CA", "Daftar akar", "Handshake TLS"]) expect(baris(nama), nama).toMatch(/\| \[\[t3-tls-pinning\]\] \|$/);
    expect(baris("MITM")).toMatch(/\| \[\[t3-m26\]\] \|$/);
    expect(baris("CA")).toContain("| **CA** (Certificate Authority) | Pihak yang menandatangani sertifikat. App yang mempercayai sebuah CA ikut mempercayai sertifikat yang ia terbitkan. |");
    expect(baris("Daftar akar")).toContain("| **Daftar akar** (root store) | Daftar CA yang dipercaya app atau sistem operasi. Sertifikat server dianggap sah bila rantainya berujung di salah satu CA itu. |");
    expect(baris("Handshake TLS")).toContain("| **Handshake TLS** | Tahap awal koneksi TLS, sebelum byte HTTP pertama: server menunjukkan sertifikatnya dan client memeriksanya. |");
    expect(baris("MITM")).toContain("| **MITM** (man-in-the-middle) | Penyerang yang berdiri di antara client dan server, lalu membaca atau mengubah lalu lintas di antara keduanya. |");
    for (const [t, b] of [["CA (Certificate Authority)", "t3-tls-pinning"], ["Daftar akar (root store)", "t3-tls-pinning"], ["Handshake TLS", "t3-tls-pinning"], ["MITM (man-in-the-middle)", "t3-m26"]] as const) {
      expect(glos.find((x) => x.t === t), t).toMatchObject({ h: null, b });
      expect(glos.filter((x) => x.t === t), t).toHaveLength(1);
    }
    // Kata yang dijelaskan baris itu memang dipakai halaman ini.
    for (const k of ["CA Dimas", "daftar akar", "handshake", "MITM"]) expect(halaman, k).toContain(k);
  });
});

const SIDIK_RISET: Record<string, string> = {
  "R3-220": "e8eece1883f63a7f",
  "R3-221": "d09bb55e10870900",
  "R3-222": "a8c3f427aea7e2f5",
  "R3-223": "beb6f4f39009f38d",
  "R3-224": "3ec70e517c38775d",
};
const SIDIK_ISTILAH: Record<string, string> = {
  "certificate-pinning": "dfcadcb984c3c218",
  "hsts": "1b721abad2be4b96",
};
const ALAMAT: [string, string][] = [
  ["https://developer.android.com/privacy-and-security/security-config", "developer.android.com/privacy-and-security/security-config"],
  ["https://developer.android.com/privacy-and-security/security-ssl", "developer.android.com/privacy-and-security/security-ssl"],
  ["https://reactnative.dev/docs/security", "reactnative.dev/docs/security"],
  ["https://api.dart.dev/stable/dart-io/HttpClient/badCertificateCallback.html", "api.dart.dev/stable/dart-io"],
  ["https://api.dart.dev/stable/dart-io/HttpClient/connectionFactory.html", "api.dart.dev/stable/dart-io"],
  ["https://api.dart.dev/stable/dart-io/X509Certificate-class.html", "api.dart.dev/stable/dart-io"],
  ["https://github.com/cfug/dio/blob/dio_v5.11.0/dio/lib/src/adapters/io_adapter.dart", "tag dio_v5.11.0"],
  ["https://pub.dev/packages/dio", "pub.dev"],
  ["https://www.rfc-editor.org/rfc/rfc7469", "RFC 7469 (April 2015"],
  ["https://www.rfc-editor.org/rfc/rfc6797", "RFC 6797 (November 2012"],
  ["https://www.rfc-editor.org/rfc/rfc9700", "RFC 9700 (BCP 240"],
  ["https://github.com/cabforum/servercert/blob/main/docs/BR.md", "github.com/cabforum/servercert"],
  ["https://github.com/OWASP/ASVS/tree/v5.0.0", "github.com/OWASP/ASVS tag v5.0.0"],
  ["https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nspinneddomains", "NSPinnedDomains"],
  ["https://developer.apple.com/documentation/security/preventing-insecure-network-connections", "Preventing Insecure Network Connections"],
  ["https://github.com/square/okhttp/blob/master/okhttp/src/commonJvmAndroid/kotlin/okhttp3/CertificatePinner.kt", "`CertificatePinner.kt` cabang master"],
  ["https://docs.serverpod.dev/concepts/endpoints-and-apis/configure-http-calls", "docs.serverpod.dev"],
  ["https://letsencrypt.org/2024/03/19/new-intermediate-certificates", "letsencrypt.org/2024/03/19/new-intermediate-certificates"],
  ["https://developer.chrome.com/blog/chrome-72-deps-rems", "developer.chrome.com/blog/chrome-72-deps-rems"],
  ["https://mas.owasp.org/MASWE/MASVS-NETWORK/MASWE-0027/", "mas.owasp.org/MASWE/MASVS-NETWORK/MASWE-0027/"],
];
