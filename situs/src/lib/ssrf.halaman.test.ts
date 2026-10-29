// Penjaga halaman 4.21 (keputusan 1346 sampai 1348): angka, ID, nomor ADR, versi sumber, tautan, rentang Snippet, tabel, klaim "tidak ada" atau
// "hanya", dan kalimat mekanisme di ssrf.mdx, diagram t4-ssrf-inti.json, widget cari-bug t4-ssrf-caribug.json, dan halaman istilah ssrf.json
// diturunkan dari rekaman labs/t4-ssrf/output, kode labs/api-t4, naskah, registry, dan RISET, bukan dari daftar yang ditulis sendiri.
// Pola: object-storage-presigned.halaman.test.ts. Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya;
// (2) kata-kata halaman dan JSON dikunci per baris di ssrf.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1) untuk mutasi tanpa kunci,
// dan dibuat ulang sesudah teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/ssrf.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci: kalimat tentang kode (pemeriksaan di ControlContext, pesan galat, batas) diperiksa
// terhadap kodenya, kalimat tentang dokumentasi luar terhadap baris RISET yang memuat sumbernya, dan label rekaman terhadap tes yang
// menjalankannya (alamat.txt memutuskan lewat fungsi alamatDilarang tanpa koneksi; perilaku versi pertama hanya diperiksa tes unit api-t4).
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t4-ssrf-inti.json";
import caribugMentah from "../../data/widget/t4-ssrf-caribug.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DataCariBug } from "../widgets/cari-bug/skema";
import { HalamanIstilah } from "./istilah";
import { KALIMAT_TERKUNCI, KUNCI_JSON } from "./ssrf.halaman.nilai";
import {
  JumlahRekamanLab, JumlahTidakDijalankan, JumlahAsumsi, JumlahIlustrasi, JumlahHitungan, JumlahPerluVerifikasi, JumlahPenulis, JumlahDibuka, JumlahTanggal,
  SIDIK_RISET, SIDIK_BERKAS, SIDIK_HALAMAN, SIDIK_TOKEN, SIDIK_TABEL, SIDIK_RANTAI, SIDIK_CARIBUG, SIDIK_ISTILAH, SIDIK_STRUKTUR, SIDIK_ANGKA,
} from "./ssrf.halaman.sidik";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const HALAMAN = "situs/src/content/docs/tahap-4/ssrf.mdx";
const halaman = baca(HALAMAN);
const badanHalaman = halaman.slice(halaman.indexOf("<Blok"));
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const alamatTxt = baca("labs/t4-ssrf/output/alamat.txt");
const batasTxt = baca("labs/t4-ssrf/output/batas.txt");
const readme = baca("labs/t4-ssrf/README.md");
const kodeUnduh = baca("labs/api-t4/internal/unduh/unduh.go");
const kodeImpor = baca("labs/api-t4/internal/service/katalog_impor.go");
const kodeUnduhTes = baca("labs/api-t4/internal/unduh/unduh_test.go");
const testingApi = baca("labs/api-t4/output/testing.txt");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const istilahBerkas = "situs/data/halaman-istilah/ssrf.json";
const istilah = JSON.parse(baca(istilahBerkas)) as { istilah: string; sehari_hari: string; cerita: { rujukan: string; teks: string }[]; mekanisme: string[]; stack: null; jebakan: string[]; terkait: string[]; sumber: { riset?: string; url?: string; rekaman?: string; judul: string; catatan: string }[] };
const caribugBerkas = "situs/data/widget/t4-ssrf-caribug.json";
const tanpaKunci = process.env.TANPA_KUNCI === "1";

interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[]; topik?: string; bagian?: number }
const hal = registry.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};

const num = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const harus = (kalimat: string): void => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const baris = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const noBaris = (teks: string, awalan: string, dari = 1): number => {
  const i = teks.split("\n").findIndex((b, k) => k + 1 >= dari && b.startsWith(awalan));
  if (i < 0) throw new Error(`jangkar tidak ditemukan: ${awalan}`);
  return i + 1;
};
const cari = (pola: RegExp, teks: string, nama: string): RegExpMatchArray => {
  const m = teks.match(pola);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const tabel = (awalan: string, kol: number): string[][] => {
  const semua = halaman.slice(halaman.indexOf(awalan)).split("\n");
  const keluar: string[][] = [];
  for (const b of semua) { if (!b.startsWith("|")) break; keluar.push(b.split("|").slice(1, -1).map((x) => x.trim())); }
  expect(keluar.every((x) => x.length === kol), `kolom tabel ${awalan}`).toBe(true);
  return keluar;
};

// ---- rekaman alamat.txt -------------------------------------------------------------------------
interface BarisAlamat { alamat: string; priv: string; loop: string; link: string; unsp: string; aman: string; ket: string }
const barisAlamat = (alamatTxt.split("\n").slice(6).map((b) => b.match(/^(\S+)\s+(ya|tidak)\s+(ya|tidak)\s+(ya|tidak)\s+(ya|tidak)\s+(tolak|lolos)\s+(.+)$/)).filter((m) => m !== null) as RegExpMatchArray[])
  .map((m) => ({ alamat: m[1]!, priv: m[2]!, loop: m[3]!, link: m[4]!, unsp: m[5]!, aman: m[6]!, ket: m[7]! }) as BarisAlamat);
const kontrol = barisAlamat.filter((b) => b.ket.includes("kontrol"));
const terlarang = barisAlamat.filter((b) => !b.ket.includes("kontrol"));
const nTolak = cari(/^ditolak fetcher aman: (\d+) dari (\d+) alamat terlarang; dari itu (\d+) lolos bila IsPrivate satu-satunya pemeriksaan$/m, alamatTxt, "ringkasan alamat");
const nEmpat = cari(/^dari 32 alamat terlarang yang sama, (\d+) lolos bila hanya empat penanda/m, alamatTxt, "empat penanda");
const nZona = cari(/^ditolak fetcher aman dengan zona: (\d+) dari (\d+) alamat terlarang; alamat publik berzona yang lolos: (\d+) dari (\d+)$/m, alamatTxt, "zona");
const nBlok = Number(cari(/^blok yang diuji: (\d+)$/m, alamatTxt, "blok")[1]);
const nDalam = cari(/^tepi dalam yang ditolak: (\d+) dari (\d+)$/m, alamatTxt, "tepi dalam");
const nLuar = cari(/^tepi luar yang lolos: (\d+) dari (\d+) \((\d+) tetangga dilewati/m, alamatTxt, "tepi luar");
const nGlobal = cari(/^blok registri yang terjangkau global dan di luar blok terlarang: (\d+) dari (\d+) lolos$/m, alamatTxt, "terjangkau global");
const zonaBentuk = alamatTxt.split("\n").find((b) => b.startsWith("alamat                   tanpa zona"))!.trim().split(/\s{2,}/);

// ---- rekaman batas.txt ----------------------------------------------------------------------------
const bagianBatas = (judul: string): string[] => {
  const semua = batasTxt.split("\n");
  const a = semua.findIndex((b) => b.startsWith(`## ${judul}`));
  if (a < 0) throw new Error(`batas.txt: bagian ${judul} tidak ada`);
  const z = semua.findIndex((b, i) => i > a && b.startsWith("--- PASS"));
  return semua.slice(a + 1, z);
};
const BRedirect = bagianBatas("redirect dimatikan");
const BUkuran = bagianBatas("batas 2 MiB");
const BGzip = bagianBatas("jawaban gzip");
const BWaktu = bagianBatas("batas 3 detik");
const BTipeHeader = bagianBatas("tipe isi dari byte");
const BStatus = bagianBatas("hanya status 200");
const BTipe = bagianBatas("tipe yang diterima");
const BIdna = bagianBatas("nama IDNA");
const BEkstrem = bagianBatas("masukan ekstrem");
const BGalat = bagianBatas("pesan galat versi aman");
const BBelum = bagianBatas("batas yang belum tertutup");
const BHttps = bagianBatas("https saja");
const kodeRedirect = BRedirect.map((b) => Number(b.match(/^redirect (\d+) ke server lain: ditolak \(tujuan tidak diizinkan\); server pertama disentuh: 1, server tujuan redirect disentuh: (\d+)$/)![1]));
const tujuanRedirect = BRedirect.map((b) => Number(b.match(/server tujuan redirect disentuh: (\d+)$/)![1]));
const statusDitolak = BStatus.map((b) => b.match(/^status (\d+) dengan isi PNG: ditolak/)).filter((m) => m !== null).map((m) => Number(m![1]));
const satuMiB = 1048576;
const batasUkuran = Number(cari(/BatasUkuran = (\d+) << 20/, kodeUnduh, "BatasUkuran")[1]) * satuMiB;
const batasWaktu = Number(cari(/BatasWaktu = (\d+) \* time\.Second/, kodeUnduh, "BatasWaktu")[1]);
const batasHeader = Number(cari(/BatasHeader = (\d+) << 10/, kodeUnduh, "BatasHeader")[1]) * 1024;
const batasRentan = Number(cari(/batasRentan = (\d+) << 20/, kodeUnduh, "batasRentan")[1]) * satuMiB;
const awalGalat = Number(cari(/awalGalatRentan = (\d+)/, kodeUnduh, "awalGalatRentan")[1]);
const timeoutRentan = Number(cari(/context\.WithTimeout\(ctx, (\d+)\*time\.Second\)/, kodeUnduh, "timeout rentan")[1]);
const maksBaris = Number(cari(/MaksBarisImpor = (\d+)/, kodeImpor, "MaksBarisImpor")[1]);
const serentak = Number(cari(/unduhSerentak = (\d+)/, kodeImpor, "unduhSerentak")[1]);
const gelombang = Math.ceil(maksBaris / serentak);
const detikImpor = gelombang * batasWaktu;
const memoriLama = serentak * (batasRentan / satuMiB);
const memoriBaru = (serentak * batasHeader) / 1024;
const sebelumDialer = kodeUnduh.split("\n");

// ---- naskah dan registry ---------------------------------------------------------------------------
const baris41 = naskah.split("\n").find((b) => b.startsWith("| 41 |"))!;
const barisM36 = naskah.split("\n").find((b) => b.startsWith("| M36 |"))!;

const tag = [...halaman.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!);

describe("rekaman dan kode: nilai turunan yang dipakai halaman", () => {
  test("alamat.txt: 37 alamat, 32 terlarang dan 5 kontrol publik; ringkasan sama dengan hitungan baris tabel", () => {
    expect(barisAlamat).toHaveLength(37);
    expect(terlarang).toHaveLength(32);
    expect(kontrol).toHaveLength(5);
    expect(terlarang.every((b) => b.aman === "tolak")).toBe(true);
    expect(kontrol.every((b) => b.aman === "lolos")).toBe(true);
    expect([Number(nTolak[1]), Number(nTolak[2]), Number(nTolak[3])]).toEqual([32, 32, 29]);
    const priv = terlarang.filter((b) => b.priv === "ya");
    expect(priv.map((b) => b.alamat)).toEqual(["10.0.0.1", "fd00::5", "::ffff:10.0.0.1"]);
    expect(terlarang.length - priv.length).toBe(Number(nTolak[3]));
    const empat = terlarang.filter((b) => b.priv === "ya" || b.loop === "ya" || b.link === "ya" || b.unsp === "ya");
    expect(empat).toHaveLength(6);
    expect(terlarang.length - empat.length).toBe(Number(nEmpat[1]));
    expect(Number(nEmpat[1])).toBe(26);
    expect([terlarang.filter((b) => b.loop === "ya").length, terlarang.filter((b) => b.link === "ya").length, terlarang.filter((b) => b.unsp === "ya").length]).toEqual([1, 1, 1]);
  });
  test("alamat.txt: bagian zona 19 dari 19, dua publik berzona; tepi 27 blok, 54 dan 39, 15 dilewati, empat terjangkau global", () => {
    expect([Number(nZona[1]), Number(nZona[2]), Number(nZona[3]), Number(nZona[4])]).toEqual([19, 19, 2, 2]);
    expect(zonaBentuk).toEqual(["alamat", "tanpa zona", "%1", "%eth0"]);
    expect([nBlok, Number(nDalam[1]), Number(nDalam[2]), Number(nLuar[1]), Number(nLuar[2]), Number(nLuar[3]), Number(nGlobal[1]), Number(nGlobal[2])]).toEqual([27, 54, 54, 39, 39, 15, 4, 4]);
    expect(Number(nDalam[1])).toBe(nBlok * 2);
  });
  test("batas.txt: tujuh kode pengalihan ditolak dan server tujuan tersentuh 0 kali", () => {
    expect(kodeRedirect).toEqual([300, 301, 302, 303, 304, 307, 308]);
    expect(tujuanRedirect).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
  test("batas.txt: 2 MiB diterima dan satu byte lebih ditolak, gzip dihitung sesudah dekompresi, Content-Length 1 GiB ditolak sebelum isi dibaca", () => {
    expect(batasUkuran).toBe(2097152);
    expect(BUkuran.some((b) => b.startsWith(`${titik(batasUkuran)} byte (tepat 2 MiB), dengan Content-Length  diterima`))).toBe(true);
    expect(BUkuran.some((b) => b.startsWith(`${titik(batasUkuran)} byte (tepat 2 MiB), chunked                diterima`))).toBe(true);
    expect(BUkuran.some((b) => b.startsWith(`${titik(batasUkuran + 1)} byte (2 MiB + 1), dengan Content-Length    ditolak (terlalu besar)`))).toBe(true);
    expect(BUkuran.some((b) => b.startsWith("3 MiB, chunked") && b.includes("ditolak (terlalu besar)"))).toBe(true);
    expect(BUkuran.some((b) => b.startsWith("Content-Length 1 GiB") && b.includes("ditolak sebelum isi dibaca (kurang dari 1 detik): true"))).toBe(true);
    expect(BGzip.some((b) => b.startsWith("2.097.152 byte (tepat 2 MiB) sesudah dekompresi") && b.includes("diterima"))).toBe(true);
    expect(BGzip.some((b) => b.startsWith("32 MiB sesudah dekompresi (gzip bomb)") && b.includes("ditolak (terlalu besar)"))).toBe(true);
  });
  test("batas.txt: 3 detik, status, tipe, header jawaban, https, dan masukan ekstrem", () => {
    expect(batasWaktu).toBe(3);
    expect(BWaktu.some((b) => b.startsWith("menjawab sesudah 1 detik (dalam batas)") && b.includes("diterima"))).toBe(true);
    expect(BWaktu.some((b) => b.startsWith("tidak pernah menjawab") && b.includes("≥ 3 dan < 5 detik): true"))).toBe(true);
    expect(BWaktu.some((b) => b.startsWith("isi menetes 1 byte per 100 milidetik") && b.includes("≥ 3 dan < 5 detik): true"))).toBe(true);
    expect(statusDitolak).toEqual([201, 202, 203, 204, 206, 400, 401, 403, 404, 410, 429, 500, 503]);
    expect(statusDitolak.filter((s) => s >= 400)).toHaveLength(8);
    expect(statusDitolak.filter((s) => s < 300)).toHaveLength(5);
    expect(BTipe.filter((b) => b.includes("diterima (")).map((b) => b.split(/\s+/)[0])).toEqual(["PNG", "JPEG", "GIF", "WebP"]);
    expect(BTipe.filter((b) => b.includes("ditolak (bukan gambar)")).map((b) => b.split(/\s{2,}/)[0])).toEqual(["BMP", "ICO", "PDF", "ZIP", "teks biasa"]);
    expect(BTipeHeader.some((b) => b.startsWith("header image/svg+xml, isi SVG") && b.includes("ditolak (bukan gambar)"))).toBe(true);
    expect(BTipeHeader.some((b) => b.startsWith("header text/html, isi PNG") && b.includes("diterima"))).toBe(true);
    expect(batasHeader).toBe(64 * 1024);
    expect(BEkstrem.filter((b) => /^header jawaban/.test(b)).map((b) => [b.match(/^header jawaban (\S+ \S+)/)![1], /diterima/.test(b)])).toEqual([["32 KiB", true], ["60 KiB", true], ["68 KiB", false], ["128 KiB", false], ["11 MiB", false]]);
    expect(BHttps.some((b) => b.startsWith("http://<loopback>/gambar.png (bawaan)") && b.includes("ditolak (tujuan tidak diizinkan); permintaan sampai: 0"))).toBe(true);
  });
  test("batas.txt: pesan galat, nama yang ada lawan yang tidak ada, dan dua URL IDNA", () => {
    expect(BGalat.find((b) => b.startsWith("200 berisi JSON layanan dalam"))).toContain('pesan: "bukan gambar"');
    for (const s of ["403", "404", "500"]) expect(BGalat.find((b) => b.startsWith(`${s} berisi JSON layanan dalam`))).toContain('pesan: "gambar tidak bisa diunduh"');
    expect(BGalat.some((b) => b.startsWith("penolakan karena alamat literal: 8 alamat") && b.includes("1 pesan berbeda: map[tujuan tidak diizinkan:8]"))).toBe(true);
    expect(BBelum).toContain('nama yang diselesaikan ke alamat private: "tujuan tidak diizinkan"');
    expect(BBelum).toContain('nama yang tidak ada:                      "tidak menjawab"');
    expect(BBelum).toContain("pesan sama: false");
    expect(BIdna.map((b) => b.split(/\s{2,}/)[0])).toEqual(["angka dan titik lebar penuh", "titik penuh ideografis"]);
    expect(BIdna.every((b) => b.includes("ditolak: true; permintaan sampai: 0"))).toBe(true);
  });
  test("kode unduh.go: batas, nama galat, penanda Snippet, ControlContext, client tanpa pengalihan, dan versi pertama", () => {
    expect([batasUkuran, batasWaktu, batasHeader, batasRentan, awalGalat, timeoutRentan]).toEqual([2097152, 3, 65536, 10485760, 200, 10]);
    expect(kodeUnduh).toContain("// --8<-- [start:control-context]");
    expect(kodeUnduh).toContain("// --8<-- [end:control-context]");
    expect(kodeUnduh).toContain("// --8<-- [start:batas-ukuran]");
    expect(kodeUnduh).toContain("// --8<-- [end:batas-ukuran]");
    expect(kodeUnduh).toContain("ControlContext: func(_ context.Context, _, address string, _ syscall.RawConn) error {");
    expect(kodeUnduh).toContain("io.ReadAll(io.LimitReader(resp.Body, maks+1))");
    expect(kodeUnduh).toContain("ip = ip.WithZone(\"\")");
    expect(kodeUnduh).toContain("MaxResponseHeaderBytes: BatasHeader");
    expect(kodeUnduh).toContain("DisableKeepAlives: true");
    expect(kodeUnduh).toContain('errors.New("tujuan tidak diizinkan")');
    expect(kodeUnduh).toContain('errors.New("tidak menjawab")');
    expect(kodeUnduh).toContain("klien.BaruDenganTransport(waktu, tr)");
    expect(kodeUnduh).toContain("(&http.Client{}).Do(req)");
    expect(kodeUnduh).toContain('fmt.Errorf("bukan gambar (status %d): %s", resp.StatusCode, awal)');
    expect(kodeUnduh).toContain('if u.Scheme != "https" && !(a.IzinkanHTTP && u.Scheme == "http")');
    expect(baca("labs/api-t4/internal/klien/klien.go")).toMatch(/CheckRedirect/);
    expect(kodeUnduh.match(/IzinkanHTTPLab/g)!.length).toBeGreaterThan(1);
  });
  test("katalog_impor.go: 50 produk, 8 serentak; hitungan 7 gelombang dan 21 detik, 80 MiB lawan 512 KiB", () => {
    expect([maksBaris, serentak, gelombang, detikImpor, memoriLama, memoriBaru]).toEqual([50, 8, 7, 21, 80, 512]);
    expect(maksBaris / serentak).toBe(6.25);
    // komentar kode menulis ±19 detik untuk hitungan yang sama: halaman memakai 21 dan memakai catatan polesan
    expect(kodeImpor).toContain("jadi 50 gambar yang semuanya mati memakan ±19 detik");
    harus("Dengan 8 unduhan serentak, 50 ÷ 8 = 6,25 menjadi 7 gelombang, dan 7 × 3 detik = 21 detik dalam satu request (Hitungan atas Asumsi lab).");
    harus("jadi 8 × 10 MiB = 80 MiB dalam satu impor. Dengan batas 64 KiB, 8 × 64 KiB = 512 KiB (Hitungan atas Asumsi lab).");
    expect(readme).toContain("80 MiB (8 × 10 MiB, Hitungan)");
    expect(readme).toContain("delapan gambar serentak");
  });
  test("tes unit api-t4 yang dikutip: nama tes ada di kode dan tercatat lulus di testing.txt api-t4, tanpa rekaman endpoint", () => {
    for (const nama of ["TestRentanDenyListDilewatiBentukLainAmanMenolak", "TestRentanMengikutiRedirectKeAlamatDalam", "TestRentanPesanGalatMembocorkanIsiLayananDalam", "TestAmanDNSRebindingDitolakDiControlContext"]) {
      expect(kodeUnduhTes, nama).toContain(`func ${nama}(`);
      expect(testingApi, nama).toContain(`--- PASS: ${nama}`);
    }
    expect(kodeUnduhTes).toContain("if s.kena.Load() != 0 {");
    expect(kodeUnduhTes).toContain("if dalam.kena.Load() != sebelum+1 {");
    expect(kodeUnduhTes).toContain('strings.Contains(err.Error(), "penyimpanan-internal")');
    expect(kodeUnduhTes).toContain("pesan galat %d byte; versi rentan hanya membawa 200 byte pertama isi");
    expect(readme).toContain("Rekaman tingkat endpoint untuk mode `unduh-rentan` tidak ada");
    expect(kodeImpor).toContain("hasil[i].Galat = &pesan");
    harus("(`TestAmanDNSRebindingDitolakDiControlContext`, tercatat lulus di `testing.txt` api-t4; angka 0 dibaca dari kode tes)");
    harus("nama tesnya tercatat lulus (`testing.txt` api-t4)");
  });
  test("lab ssrf: README memuat angka yang halaman tulis sebagai Tidak dijalankan di halaman ini (24 dari 32, 13 dari 19, 8 alamat, 80 MiB)", () => {
    expect(readme).toContain("Kode lama menolak 24 dari 32 alamat uji");
    expect(readme).toContain("Pada kode sebelum perbaikan 13 dari 19 alamat IPv6 terlarang berzona lolos");
    expect(readme).toContain("Delapan alamat uji lolos");
    expect(readme).toContain("net/http/transport.go");
    expect(readme).toContain("RFC 6052 bagian 2.2");
    expect(readme).toContain("diamati tangan, tidak direkam");
    expect(readme).toContain("belum diperbaiki");
    expect(alamatTxt).not.toMatch(/24 dari 32|13 dari 19/);
    expect(batasTxt).not.toMatch(/24 dari 32|13 dari 19/);
    expect(naskah).toContain("golang/go#80417");
    expect(naskah).toContain("golang/go#79925");
    expect(baris41).toContain("2 MiB (2.097.152 byte: tepat itu diterima, satu byte lebih ditolak)");
    expect(baris41).toContain("29 dari 32 alamat terlarang lolos bila `IsPrivate` satu-satunya pemeriksaan");
    expect(baris41).toContain("Proses pengunduh tidak diberi akses jaringan ke layanan dalam yang tidak perlu (Tidak dijalankan di lab");
    expect(baris41).toContain("Allowlist domain (tidak berlaku: merchant bebas memilih domain)");
    expect(baris41).toContain("deny-list string pada URL (pilihan terakhir menurut OWASP, dilewati bentuk alamat lain)");
    expect(baris41).toContain("tanpa URL, merchant mengunggah gambar sendiri ke penyimpanan objek (paling aman, ditolak karena impor katalog ratusan produk, Asumsi)");
    expect(barisM36).toContain("allowlist bila tujuan dikenal, validasi alamat saat dial (`Dialer.ControlContext`), redirect dimatikan");
  });
});

describe("ssrf.mdx: tiap angka turunan dari rekaman, kode, naskah, dan RISET", () => {
  test("Inti: kalimat, Rantai ringkas, angka 32, 3, 29, 5, 2.097.152, dan definisi di pemakaian pertama", () => {
    harus("Server yang mengunduh alamat dari merchant menghubunginya atas nama server, jadi yang diperiksa adalah alamat yang dihubungi, bukan teks URL.");
    harus("SSRF (server-side request forgery) adalah serangan yang membuat server mengirim permintaan ke alamat pilihan pihak lain, dengan hak jaringan server.");
    harus("Fetcher adalah fungsi yang mengunduh isi sebuah URL, di sini gambar produk.");
    harus("Alamat terlarang adalah alamat yang tidak boleh dijadikan tujuan, seperti alamat server itu sendiri dan alamat jaringan dalam.");
    harus("`IsPrivate` adalah metode bawaan Go yang menjawab apakah alamat ada di rentang private.");
    harus(`fetcher versi aman menolak ${nTolak[1]} dari ${nTolak[2]} alamat terlarang. Lima alamat publik sebagai kontrol lolos (\`alamat.txt\`).`);
    expect(kontrol).toHaveLength(5);
    harus(`\`IsPrivate\` hanya menolak ${terlarang.filter((b) => b.priv === "ya").length} dari ${terlarang.length} alamat itu, jadi ${nTolak[3]} lolos bila ia satu-satunya pemeriksaan. Itu Hitungan, yaitu hasil rumus dari angka yang tertulis di halaman ini: ${terlarang.length} − ${terlarang.filter((b) => b.priv === "ya").length} = ${nTolak[3]}.`);
    harus(`Isinya dibatasi 2 MiB (${titik(batasUkuran)} byte) dan waktunya ${batasWaktu} detik, dan hanya status 200 yang diterima (\`batas.txt\`).`);
    harus("Versi aman hanya menerima https, memeriksa alamat saat dihubungi, dan tidak mengikuti pengalihan.");
    harus("Pesan galatnya tidak memuat isi respons.");
    const r = DataRantai.parse(rantaiMentah);
    expect(r.baris.map((b) => [b.label, b.sub, b.simpul.map((s) => [s.teks, s.nada])])).toEqual([
      ["Hanya IsPrivate", "metode bawaan Go", [[`${terlarang.length} alamat terlarang`, "biasa"], [`${terlarang.filter((b) => b.priv === "ya").length} ditolak`, "biasa"], [`${nTolak[3]} lolos`, "warn"]]],
      ["Saat dihubungi", "daftar alamat lengkap", [[`${nTolak[1]} alamat terlarang`, "biasa"], [`${nTolak[1]} ditolak`, "good"], [`${kontrol.length} alamat publik lolos`, "good"]]],
    ]);
    expect(r.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-ssrf, alamat.txt" });
    expect(halaman.indexOf("Hitungan")).toBe(halaman.indexOf("Itu Hitungan, yaitu hasil rumus dari angka yang tertulis di halaman ini") + "Itu ".length);
    expect(halaman.indexOf("[Label sumber](/cara-pakai/#label-sumber)")).toBeLessThan(halaman.indexOf("Hitungan"));
    expect(halaman.indexOf("SSRF (server-side request forgery)")).toBeLessThan(halaman.indexOf("IsPrivate"));
  });
  test("Cek 3 pertanyaan: tiga butir, dan jawabannya ada di halaman", () => {
    const b = halaman.slice(halaman.indexOf('<details class="question">'), halaman.indexOf("</details>"));
    expect([...b.matchAll(/^(\d)\. (.+)$/gm)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(b).toContain("Fetcher hanya memeriksa dengan `IsPrivate`. Berapa dari 32 alamat terlarang yang lolos, dan dari angka apa?");
    expect(b).toContain("Gambar sah berukuran 2.097.152 byte dan gambar lain 2.097.153 byte. Mana yang diterima?");
    expect(b).toContain("Yakin dengan ketiganya? Lompat ke [[berikutnya]].");
  });
  test("Coba: widget cari-bug, tiga baris bug di baris 2, 11, dan 26, noscript, dan kalimat aman", () => {
    const d = DataCariBug.parse(caribugMentah);
    // baris kode = fungsi Rentan dari unduh.go tanpa komentar dan tanpa penanda
    const a = sebelumDialer.findIndex((b) => b.startsWith("func Rentan("));
    const z = sebelumDialer.findIndex((b, i) => i > a && b === "}");
    const turunan = sebelumDialer.slice(a, z + 1).filter((b) => !b.trim().startsWith("//")).map((b) => b.replace(/\s+\/\/ [^"]*$/, ""));
    expect(d.baris).toEqual(turunan);
    const cocok = (potongan: string): number => { const h = d.baris.map((b, i) => (b.includes(potongan) ? i : -1)).filter((i) => i >= 0); expect(h, potongan).toHaveLength(1); return h[0]!; };
    expect(d.bug).toEqual([cocok('strings.Contains(alamat, "localhost")'), cocok("(&http.Client{}).Do(req)"), cocok('fmt.Errorf("bukan gambar (status %d): %s"')]);
    expect(d.bug.map((i) => i + 1)).toEqual([2, 11, 26]);
    expect(Object.keys(d.aman).map(Number)).toEqual([cocok("context.WithTimeout(ctx, 10*time.Second)"), cocok("http.NewRequestWithContext(ctx, http.MethodGet, alamat, nil)"), cocok("io.LimitReader(resp.Body, batasRentan)"), cocok("http.DetectContentType(isi)")]);
    expect(Object.keys(d.alasan).map(Number)).toEqual(d.bug);
    expect(d.baris.some((b) => b.includes("//"))).toBe(false);
    // perbaikan: blok dialer dari Unduh, tanpa komentar
    const da = sebelumDialer.findIndex((b) => b.startsWith("\tdialer := &net.Dialer{"));
    const dz = sebelumDialer.findIndex((b, i) => i > da && b === "\t}");
    expect(d.perbaikan.baris).toEqual(sebelumDialer.slice(da, dz + 1).filter((b) => !b.trim().startsWith("//")));
    expect(d.perbaikan.baris.some((b) => b.includes("ControlContext"))).toBe(true);
    expect(d.perbaikan.baris.some((b) => b.includes("alamatDilarang"))).toBe(true);
    expect(d.perbaikan.baris.some((b) => b.includes("strings.Contains"))).toBe(false);
    // angka di teks widget: 10 MiB, 2 MiB, 3 detik, 10 detik, 200 byte, 10 permintaan
    expect(d.aman[String(cocok("context.WithTimeout(ctx, 10*time.Second)"))]).toContain(`${timeoutRentan} detik, bukan ${batasWaktu} detik`);
    expect(d.aman[String(cocok("io.LimitReader(resp.Body, batasRentan)"))]).toContain(`${batasRentan / satuMiB} MiB, sedangkan ADR 41 memakai ${batasUkuran / satuMiB} MiB`);
    expect(d.alasan[String(d.bug[2])]).toContain(`sampai ${awalGalat} byte pertama isi respons`);
    expect(d.alasan[String(d.bug[1])]).toContain("Client bawaan Go berhenti sesudah 10 permintaan berturut-turut");
    expect(d.alasan[String(d.bug[1])]).toContain("tersentuh tepat 1 kali");
    expect(d.alasan[String(d.bug[1])]).toContain("Pemeriksaan teks di baris 2 tidak diulang");
    expect(d.sumber.jenis).toBe("ilustrasi");
    expect(d.label.sumber).toBe("Tidak dijalankan: dibaca dari kode lab api-t4");
    expect(d.label.ringkas).toBe("Kamu menandai {benar} dari {bug} baris yang bermasalah, dan {salah} baris lain ikut ditandai.");
    expect(d.kejadian).toBeUndefined();
    harus("Tanpa JavaScript, baris di atas tidak bisa ditandai. Tiga baris yang bermasalah adalah baris 2, baris 11, dan baris 26.");
    harus("Baris lain wajar sebagai potongan kode, termasuk yang tampak berbahaya: batas waktu, batas ukuran, dan pembacaan tipe isi.");
    harus("**Ubah satu hal:** tekan Lihat versi benar sesudah memeriksa.");
    expect(d.label.perbaikanTombol).toBe("Lihat versi benar");
    expect(halaman.indexOf("<CariBug")).toBeGreaterThan(halaman.indexOf('<Blok nama="Coba"'));
    expect(halaman.indexOf("<CariBug")).toBeLessThan(halaman.indexOf('<Blok nama="Paham"'));
    // widget tidak memakai kata yang membocorkan jawaban sebelum Periksa: tidak ada komentar dan tidak ada kata "bug" di baris kode
    expect(d.baris.join("\n")).not.toMatch(/BOCOR|SSRF|bug/i);
  });
  test("Paham: SSRF, teks URL, ControlContext, rebinding, pesan galat, IDNA, jaringan, dan metadata dirujuk ke sumbernya", () => {
    harus("Gambar dari server luar yang URL-nya diisi user adalah contoh pertama yang ia sebut");
    harus("Teks URL bukan tujuan.");
    harus("`Dialer.ControlContext` adalah hook, yaitu fungsi yang kamu pasang di `net.Dialer` dan dipanggil Go sesudah koneksi dibuat dan sebelum benar-benar dihubungi.");
    harus("Dokumentasi Go menulis bahwa parameter alamat yang diterimanya belum tentu sama dengan yang diberikan ke Dial");
    harus("DNS rebinding adalah nama yang dijawab alamat publik saat diperiksa dan alamat dalam saat dihubungi.");
    harus("OWASP menulis hal yang sama: validasi nama saja tidak mencegah DNS rebinding, dan pencarian DNS kedua yang tidak diperiksa antara validasi dan koneksi melewatkan pemeriksaan.");
    harus('Fetcher menolak dengan "tujuan tidak diizinkan" tanpa menyentuh server uji');
    harus("OWASP menyebut daftar tolak (deny-list) rawan dilewati dan menganjurkan daftar izin (allowlist). Allowlist adalah daftar tujuan yang boleh, dan semua yang lain ditolak.");
    harus("Bentuk yang lolos bergantung resolver platform, jadi halaman ini tidak menyalin satu pun.");
    harus("Alamat contoh adalah angka karangan lab, dan alamat link-local di tabel bukan alamat metadata layanan cloud.");
    harus(`Tabel ini memakai \`alamat.txt\`, yaitu keputusan fungsi \`alamatDilarang\` atas alamat contoh, tanpa membuat koneksi.`);
    expect(kodeUnduh).toContain("func (a Aturan) alamatDilarang(ip netip.Addr) bool {");
    expect(baca("labs/api-t4/internal/unduh/ssrf_batas_test.go")).toContain("ditolak := a.alamatDilarang(ip)");
    harus(`\`IsPrivate\` menolak 3 dari 32 alamat terlarang: ${terlarang.filter((b) => b.priv === "ya").map((b) => b.alamat).join(", ").replace(/, ([^,]+)$/, ", dan $1")}. Jadi ${nTolak[3]} lolos bila ia satu-satunya pemeriksaan.`);
    harus(`Bila empat penanda bawaan Go (\`IsPrivate\`, \`IsLoopback\`, \`IsLinkLocalUnicast\`, \`IsUnspecified\`) dipakai bersama, 6 alamat ditolak dan ${nEmpat[1]} tetap lolos (\`alamat.txt\`).`);
    harus("Dokumentasi `netip.Addr.IsPrivate` menulis bahwa metode itu tidak menggambarkan sifat keamanan alamat dan tidak boleh dipakai untuk kontrol akses");
    harus("Usul memperluas `IsPrivate` ditutup tanpa rencana pada 2026-07-11 (golang/go#79925, status dibaca 2026-10-30).");
    harus("Kode lama menolak 24 dari 32 alamat uji, dan delapan alamat lolos sebelum daftar dilengkapi.");
    harus(`Sesudah perbaikan, tepi ${nBlok} blok registri diuji dari dua sisi. Sebanyak ${nDalam[1]} tepi dalam ditolak (${nDalam[1]} dari ${nDalam[2]}), dan ${nLuar[1]} tepi luar lolos (${nLuar[1]} dari ${nLuar[2]}). Empat alamat yang terjangkau global menurut registri juga lolos`);
    harus("Dokumentasi `netip.Prefix.Contains` menulis bahwa metode itu menjawab false untuk alamat berzona, karena prefix membuang zona");
    harus(`Rekaman memuat ${nZona[2]} alamat IPv6 terlarang dalam tiga bentuk: tanpa zona, \`%1\`, dan \`%eth0\`. Semuanya ditolak (${nZona[1]} dari ${nZona[2]}), dan ${nZona[3]} alamat publik berzona lolos`);
    harus("Pada kode sebelum perbaikan, 13 dari 19 alamat berzona lolos (README lab, Tidak dijalankan di halaman ini).");
    harus("Client HTTP bawaan Go berhenti sesudah 10 permintaan berturut-turut, jadi pengalihan diikuti secara bawaan");
    harus(`Tujuh kode yang diuji, ${kodeRedirect.slice(0, -1).join(", ")}, dan ${kodeRedirect[kodeRedirect.length - 1]}, semuanya ditolak, dan server tujuan pengalihan tidak tersentuh:`);
    harus("OWASP juga meminta pengalihan dimatikan di client.");
    harus("Batas header jawaban 64 KiB adalah Asumsi lab: header gambar yang sehat jauh di bawahnya.");
    harus('Jawaban 200 berisi JSON layanan dalam dijawab "bukan gambar", dan jawaban 403, 404, dan 500 dijawab "gambar tidak bisa diunduh".');
    harus('Delapan penolakan karena alamat literal memakai satu pesan, "tujuan tidak diizinkan"');
    harus("Versi pertama sebaliknya: pesan galatnya memuat sampai 200 byte pertama isi respons.");
    harus('Nama yang diselesaikan ke alamat terlarang dijawab "tujuan tidak diizinkan", sedangkan nama yang tidak ada dijawab "tidak menjawab".');
    harus("Ini belum diperbaiki, dan tes menetapkan perilaku sekarang.");
    harus("Versi aman menolak dua URL bernama IDNA tanpa satu pun permintaan sampai");
    harus("Isu itu masih terbuka pada 2026-10-30, dengan label NeedsInvestigation.");
    harus("Perilaku di versi Go sesudah go1.27.1 adalah [perlu verifikasi], yaitu klaim yang belum bisa dicek ke sumber primer.");
    harus("OWASP menyebut pemisahan jaringan sangat dianjurkan, tetapi lab tidak punya jaringan container untuk ini: Tidak dijalankan.");
    harus("Lab tidak menjalankan metadata cloud, dan halaman ini tidak menulis alamat metadata sebagai tujuan: Tidak dijalankan.");
  });
  test("tabel alamat: tiap baris sama dengan baris alamat.txt (alamat, kelas, IsPrivate, keputusan), 14 baris, semua tiga baris IsPrivate ya ikut", () => {
    const t = tabel("| Alamat contoh |", 4);
    expect(t[0]).toEqual(["Alamat contoh", "Kelas", "`IsPrivate`", "Fetcher aman"]);
    const isi = t.slice(2);
    expect(isi).toHaveLength(14);
    for (const [a, kelas, priv, aman] of isi) {
      const alamat = a!.replace(/`/g, "");
      const b = barisAlamat.find((x) => x.alamat === alamat);
      expect(b, `alamat ${alamat} tidak ada di alamat.txt`).toBeDefined();
      expect(b!.priv, `IsPrivate ${alamat}`).toBe(priv);
      expect(b!.aman, `keputusan ${alamat}`).toBe(aman);
      const k = kelas!;
      expect(b!.ket.startsWith(k) || (k === "publik (kontrol)" && b!.ket.startsWith("alamat publik (kontrol")), `kelas ${alamat}: "${k}" lawan "${b!.ket}"`).toBe(true);
    }
    expect(isi.filter((r) => r[2] === "ya").map((r) => r[0]!.replace(/`/g, ""))).toEqual(["10.0.0.1", "fd00::5", "::ffff:10.0.0.1"]);
    expect(isi.filter((r) => r[3] === "lolos")).toHaveLength(1);
    expect(new Set(isi.map((r) => r[0])).size).toBe(isi.length);
  });
  test("tabel batas: lima baris, tiap sel diturunkan dari batas.txt dan kode", () => {
    const t = tabel("| Batas | Diterima | Ditolak |", 3);
    expect(t.slice(2).map((r) => r[0])).toEqual(["Ukuran isi 2 MiB", "Waktu 3 detik", "Status", "Tipe isi", "Header jawaban"]);
    expect(t[2]![1]).toBe(`${titik(batasUkuran)} byte, dengan dan tanpa Content-Length`);
    expect(t[2]![2]).toBe(`${titik(batasUkuran + 1)} byte, 3 MiB, dan gzip yang jadi 32 MiB sesudah dekompresi`);
    expect(t[3]![1]).toBe("menjawab sesudah 1 detik");
    expect(t[3]![2]).toBe("tidak pernah menjawab, dan isi yang menetes 1 byte per 100 milidetik: berhenti di antara 3 dan 5 detik");
    expect(t[4]![1]).toBe("200");
    expect(t[4]![2]).toBe(`${statusDitolak.filter((s) => s < 300).join(", ").replace(/, ([^,]+)$/, ", dan $1").replace(", dan 206", ", 206")}, dan delapan status 4xx dan 5xx, semuanya dengan isi PNG sah`.replace("203, 204, 206, dan delapan", "203, 204, 206, dan delapan"));
    expect(t[5]![1]).toBe("PNG, JPEG, GIF, WebP menurut byte awal");
    expect(t[5]![2]).toBe("BMP, ICO, PDF, ZIP, teks, dan SVG; header `Content-Type` tidak dipercaya");
    expect(t[6]![1]).toBe("32 KiB dan 60 KiB");
    expect(t[6]![2]).toBe("68 KiB, 128 KiB, dan 11 MiB");
  });
  test("Snippet: region ControlContext dan batas-ukuran ada di unduh.go, rekaman redirect baris 12:18 sama dengan tujuh baris redirect", () => {
    expect(tag).toEqual([
      'file="labs/api-t4/internal/unduh/unduh.go" region="control-context" lang="go" title="labs/api-t4/internal/unduh/unduh.go (ControlContext)" ',
      'file="labs/t4-ssrf/output/batas.txt" lines="12:18" title="Rekaman lab: labs/t4-ssrf/output/batas.txt, bagian redirect" ',
      'file="labs/api-t4/internal/unduh/unduh.go" region="batas-ukuran" lang="go" title="labs/api-t4/internal/unduh/unduh.go (batas ukuran)" ',
    ]);
    const a = noBaris(batasTxt, "redirect 300 ke server lain");
    const z = noBaris(batasTxt, "redirect 308 ke server lain");
    expect(`${a}:${z}`).toBe("12:18");
    expect(z - a + 1).toBe(kodeRedirect.length);
    // isi region tidak memuat ID internal atau komentar lab dengan nomor
    const region = (nama: string): string => kodeUnduh.slice(kodeUnduh.indexOf(`[start:${nama}]`), kodeUnduh.indexOf(`[end:${nama}]`));
    for (const n of ["control-context", "batas-ukuran"]) expect(region(n), n).not.toMatch(/keputusan \d|PR #?\d|R\d-\d|\bC2\b/);
    expect(region("control-context")).toContain("alamatDilarang");
    expect(region("batas-ukuran")).toContain("LimitReader");
  });
  test("Di stack lain: enam tab, versi, dan klaim yang dicek ke RISET dan dokumentasi, tanpa klaim universal 'sama di semua stack'", () => {
    harus('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    expect([...halaman.matchAll(/<Fragment slot="(t\d)">/g)].map((m) => m[1])).toEqual(["t0", "t1", "t2", "t3", "t4", "t5"]);
    const go = readme.match(/go(\d+\.\d+\.\d+) \(toolchain lokal\)/)![1]!;
    expect(alamatTxt.split("\n")[1]).toContain(`go${go} `);
    expect(batasTxt.split("\n")[1]).toContain(`go${go} `);
    harus(`*Dijalankan: lab api-t4 dan t4-ssrf, Go ${go} (rekaman \`batas.txt\` dan \`alamat.txt\`).*`);
    harus(`Dokumentasi dibaca pada go${baris("R4-211").match(/Dokumentasi Go go(\d+\.\d+\.\d+)/)![1]}, sedangkan lab berjalan di go${go}.`);
    expect(baris("R4-211")).toContain("Dokumentasi Go go1.27.3");
    for (const [a, b] of [["Node.js v26.13.0", "R4-214"], ["Dart 3.13.7", "R4-214"], ["Laravel 13.x", "R4-214"]]) { expect(baris(b!)).toContain(a!); expect(halaman).toContain(a === "Node.js v26.13.0" ? "dokumentasi Node.js v26.13.0" : a === "Dart 3.13.7" ? "Dart 3.13.7" : "Laravel 13.x");}
    harus("Hasilnya berbeda per stack, jadi tidak ada satu aturan \"bawaan\" untuk semuanya.");
    harus("Guzzle mengikuti pengalihan secara bawaan sampai 5 kali, dengan protokol http dan https.");
    harus("Laravel 13.x menunjukkan `Http::globalOptions(['allow_redirects' => false])` untuk mematikannya di semua request.");
    harus("Requests mengikuti pengalihan secara bawaan untuk semua metode kecuali HEAD, dan `allow_redirects` mematikannya. HTTPX sebaliknya: ia tidak mengikuti pengalihan secara bawaan, dan `follow_redirects=True` menyalakannya.");
    harus("`followRedirects` di `dart:io` bawaannya `true`.");
    harus("Pencarian teks `SSRF`, `followRedirects`, dan `server-side request` di llms-full.txt Serverpod tidak menemukan apa pun, jadi file itu tidak membahas ketiganya.");
    harus("runtime Edge Functions berbasis Deno, dengan fungsi dibundel dalam format ESZip.");
    harus("`fetch` adalah implementasi yang kompatibel dengan browser dan berbasis undici.");
    harus("MDN menulis bahwa mode pengalihan `Request` bawaannya `follow`, dengan pilihan `error` dan `manual`.");
    harus("opsi `lookup` di `socket.connect`, bawaannya `dns.lookup()`.");
    for (const kata of ["Guzzle", "allow_redirects", "followRedirects", "ESZip", "undici", "kecuali HEAD", "tidak mengikuti pengalihan secara bawaan", "lookup"]) {
      expect(baris("R4-214").toLowerCase(), kata).toContain(kata.toLowerCase());
    }
    expect(baris("R4-214")).toContain("`max` 5");
    expect(baris("R4-214")).toContain("tidak membahas pembatasan alamat tujuan");
    expect(baris("R4-214")).toContain("pencarian teks `SSRF`, `followRedirects`, dan `server-side request` tidak menemukan apa pun");
    expect(badanHalaman).not.toMatch(/sama di semua stack|selalu mengikuti|di semua stack/);
  });
});

describe("ADR 41: tabel opsi, delapan aturan, kasus industri, pre-mortem, kapan salah, dan Sengaja belum", () => {
  const adr = halaman.slice(halaman.indexOf("### ADR 41"), halaman.indexOf("### Sengaja belum dilakukan"));
  test("kebutuhan dan status: angka 400, 50, 8, dan ADR 41 diterima sesudah M36 minggu 9", () => {
    harus("**Status:** diterima sesudah M36 (minggu 9). Urutan itu dibaca dari tabel masalah, karena naskah tidak menulis tanggal ADR.");
    expect(barisM36.startsWith("| M36 | 9 |")).toBe(true);
    harus(`Naskah memberi ±400 merchant luar (Asumsi). Di lab, satu impor paling banyak ${maksBaris} produk (Asumsi lab) dan ${serentak} unduhan berjalan serentak (kode \`katalog_impor.go\`).`);
    expect(naskah).toContain("±400 lainnya, Asumsi");
    expect(kodeImpor).toContain("Asumsi lab");
  });
  test("tabel opsi: lima baris dan lima kolom, empat opsi A sampai D, dan sel kunci", () => {
    const t = tabel("| | A. Allowlist domain", 5);
    expect(t[0]).toEqual(["", "A. Allowlist domain", "B. Deny-list teks URL", "C. Tanpa URL, merchant mengunggah gambar", "D. Satu fungsi unduh, alamat diperiksa saat dihubungi"]);
    expect(t.slice(2).map((r) => r[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    expect(t[4]![4]).toBe("Daftar alamat ditulis tangan dan pernah tidak lengkap: kode lama menolak 24 dari 32 alamat uji");
    expect(t[4]![3]).toBe("Impor katalog ratusan produk menjadi pekerjaan tangan (Asumsi naskah)");
    expect(t[4]![1]).toBe("Merchant bebas memilih domain, jadi daftarnya tidak diketahui di muka");
    expect(t[4]![2]).toBe("Yang diperiksa teks, bukan tujuan, dan pengalihan tidak diperiksa");
    expect(t[6]![4]).toBe("`alamat.txt` dan `batas.txt`");
    expect(t[6]![2]).toBe("`testing.txt` api-t4: satu tes unit, tanpa rekaman endpoint");
    expect(t[6]![3]).toBe("Tidak dijalankan, alasan dari Asumsi naskah");
    // alternatif naskah: tiga opsi yang ditolak
    for (const k of ["Allowlist domain", "deny-list string pada URL", "tanpa URL"]) expect(baris41.toLowerCase()).toContain(k.toLowerCase());
  });
  test("keputusan opsi D: delapan aturan bernomor, tiap angka dari rekaman dan kode", () => {
    harus("**Keputusan: opsi D.** Delapan aturan:");
    const aturanTeks = adr.slice(adr.indexOf("**Keputusan: opsi D.**"), adr.indexOf("**Kenapa D, bukan A sampai C.**"));
    const aturan = [...aturanTeks.matchAll(/^(\d)\. (.+)$/gm)].map((m) => m[2]!);
    expect(aturan).toHaveLength(8);
    expect(aturan[0]).toBe("Hanya https. Skema http ditolak sebelum permintaan dibuat (`batas.txt`, bagian https saja). Di lab, flag `-unduh-izinkan-http` membuka http untuk tiruan lokal tanpa TLS, dan kode produksi tidak menyalakannya.");
    expect(kodeUnduh).toContain("tiruan lokal di container tidak punya TLS");
    expect(kodeUnduh).toContain("Kode produksi tidak menyalakannya.");
    expect(baca("labs/api-t4/cmd/api/main.go")).toContain("unduh-izinkan-http");
    expect(aturan[1]).toContain("Yang ditolak: loopback, private, link-local, ULA IPv6, IPv4-mapped, dan lebih banyak, yaitu CGNAT, benchmark, dokumentasi, NAT64, 6to4, Teredo, dan multicast.");
    expect(aturan[1]).toContain("Daftar itu bukan daftar lengkap.");
    expect(aturan[2]).toBe("Pengalihan tidak diikuti (`batas.txt`, bagian redirect).");
    expect(aturan[3]).toBe(`Isi paling besar 2 MiB (${titik(batasUkuran)} byte), waktu total ${batasWaktu} detik, dan header jawaban ${batasHeader / 1024} KiB (Asumsi lab).`);
    expect(aturan[4]).toBe("Hanya status 200 yang diterima, termasuk saat status 2xx lain membawa gambar sah.");
    expect(aturan[5]).toBe("Tipe isi diperiksa dari byte, dan header `Content-Type` tidak dipercaya.");
    expect(aturan[6]).toBe("Pesan galat tanpa isi respons, alamat, atau port. Perbedaan pesan antara nama yang ada dan yang tidak ada belum diperbaiki.");
    expect(aturan[7]).toBe("Proses pengunduh tidak diberi akses jaringan ke layanan dalam yang tidak perlu. Aturan ini keputusan penempatan, dan Tidak dijalankan di lab.");
    // delapan aturan sama urutannya dengan baris ADR 41 naskah (https, DNS lalu ControlContext, redirect, 2 MiB, status 200, tipe dari byte, galat, jaringan)
    for (const k of ["hanya status 200 yang diterima", "tipe isi diperiksa dari byte, bukan header"]) expect(baris41, k).toContain(k);
    const urutan = ["hanya https", "Dialer.ControlContext", "redirect dimatikan", "2 MiB", "pesan kesalahan tanpa isi respons", "Proses pengunduh tidak diberi akses jaringan"];
    let posisi = -1;
    for (const k of urutan) { const i = baris41.indexOf(k); expect(i, k).toBeGreaterThan(posisi); posisi = i; }
  });
  test("kenapa D bukan A sampai C, kasus industri IMDSv2 dengan batas, dan D juga daftar blokir", () => {
    harus("- **A ditolak** karena merchant bebas memilih domain. OWASP menulis bahwa allowlist tidak bisa dipakai bila daftar tujuan tidak diketahui di muka.");
    harus("- **B ditolak** karena yang diperiksa teks, bukan tujuan.");
    harus("- **C ditolak** karena impor katalog ratusan produk menjadi unggahan satu per satu (Asumsi naskah). Opsi ini kembali bila fitur impor URL jarang dipakai.");
    harus("- **D juga daftar blokir.** Bedanya, daftar itu dipakai pada alamat yang dihubungi, dan diuji dari dua sisi tepi tiap blok.");
    harus("OWASP memakai pendekatan itu untuk kasus tanpa allowlist, dan tetap menyebut daftar blokir rawan dilewati.");
    harus("**Kasus industri: IMDSv2.** Tulisan AWS Security Blog tertanggal 2019-11-19 menjelaskan bahwa IMDSv2 memulai sesi dengan permintaan PUT, mengembalikan token, dan meminta token itu di permintaan berikutnya.");
    harus("Layanan itu juga tidak memberi token kepada pemanggil yang membawa header `X-Forwarded-For`");
    harus("Batasnya: itu tulisan vendor tentang layanannya sendiri, untuk satu layanan metadata, tanpa angka kerugian.");
    harus("Ia melindungi sumber yang dituju SSRF, bukan fungsi unduh di aplikasi.");
    expect(baris("R4-213")).toContain("2019-11-19");
    expect(baris("R4-213")).toContain("Colm MacCárthaigh");
    expect(baris("R4-213")).toContain("X-Forwarded-For");
    expect(baris("R4-213")).toContain("tanpa angka kerugian");
    expect(baris("R4-210")).toContain("Case 2");
    expect(baris("R4-210")).toContain("block-list");
  });
  test("pre-mortem tiga penyebab dan Kapan salah: angka 27 blok, 21 detik, 80 MiB, 512 KiB, dan usul penulis", () => {
    harus("**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:");
    const pm = adr.slice(adr.indexOf("**Pre-mortem.**"), adr.indexOf("**Kapan keputusan ini salah.**"));
    expect([...pm.matchAll(/^(\d)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    harus(`Pencegahannya tes tepi dari registri (${nBlok} blok, \`alamat.txt\`) dan pembacaan ulang registri saat berubah.`);
    harus("sedangkan isu golang/go#80417 masih terbuka");
    const salah = adr.slice(adr.indexOf("**Kapan keputusan ini salah.**"), adr.indexOf("**Yang akan merevisinya.**"));
    expect([...salah.matchAll(/^- /gm)]).toHaveLength(5);
    expect(salah).toContain(`Saat satu impor ${maksBaris} produk (Asumsi lab)`);
    expect(salah).toContain(`${titik(batasRentan / 1024)} KiB`.slice(0, 0));
    expect(salah).toContain("Bawaan `http.Transport` menerima header sampai 10 MiB (kode go1.27.1, dibaca dari README lab)");
    expect(salah).toContain("Memori sebenarnya tidak diukur.");
    expect(salah).toContain("Gambar sah ditolak dengan \"tidak menjawab\", dan frekuensinya tidak diukur lab.");
    expect(salah).toContain("Awalan itu tidak bisa didaftar di kode, dan penempatan jaringan menjadi satu-satunya penutup (Tidak dijalankan).");
    expect((halaman.match(/usul penulis|penalaran penulis|penilaian penulis/g) ?? []).length).toBe(JumlahPenulis);
  });
  test("Yang akan merevisinya dan Sengaja belum dilakukan: lima baris tiga kolom, tautan ke 4.26 ada di registry", () => {
    harus("**Yang akan merevisinya.** [[t4-tim-infra]] memasang govulncheck dan grype di pipeline tiap merge per modul (ADR 44).");
    expect(dari("t4-tim-infra").adr).toEqual([44]);
    expect(naskah.split("\n").find((b) => b.startsWith("| 44 |"))).toContain("SAST (gosec, govulncheck)");
    expect(naskah.split("\n").find((b) => b.startsWith("| 44 |"))).toContain("pindai grype");
    const t = tabel("| Yang ditunda |", 3);
    expect(t.slice(2).map((r) => r[0])).toEqual(["Metadata cloud dan IMDSv2", "Pemisahan jaringan proses pengunduh", "Unduhan lewat queue", "Pesan galat yang menyamakan nama ada dan tidak ada", "Pencocokan ulang otomatis dengan registri IANA"]);
    expect(t[4]![1]).toBe(`${maksBaris} gambar yang menggantung menahan satu request ${detikImpor} detik, dan lab tidak menjalankan queue untuk ini`);
    expect(t.slice(2).every((r) => r[2] === "Belum dijadwalkan")).toBe(true);
    expect(kodeImpor).toContain("Produksi memindahkannya ke queue");
    expect(t[6]![1]).toBe("Daftar dicocokkan sekali, dengan file bertanggal 2025-10-09");
    expect(readme).toContain("2025-10-09");
  });
});

describe("rujukan [[ID]], registry, struktur, dan kata", () => {
  test("halaman 4.21 terdaftar sebagai konsep bagian 4 ★ dengan lab t4-ssrf, ADR 41, prasyarat M36, dan judul sama dengan peta naskah", () => {
    expect(dari("t4-ssrf")).toMatchObject({ ada: true, nomor: "4.21", jenis: "konsep", inti: true, prasyarat: ["t4-m36"], lab: ["t4-ssrf"], tahap: 4, bagian: 4, topik: "Keamanan", adr: [41], peran: ["security", "backend"] });
    expect(halaman).toContain(`title: "4.21 ${dari("t4-ssrf").judul}"`);
    expect(naskah).toContain(`| 4.21 | 4 | ${dari("t4-ssrf").judul} | Keamanan + ADR | ★ | t4-ssrf | cari-bug |`);
    const m = halaman.match(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-m36\]\] · Jalur inti<\/p>/);
    expect(m).not.toBeNull();
    expect(dari("t4-ssrf").menit).toBe(Number(m![1]) + Number(m![2]));
    expect(halaman).toContain("description: Server yang mengunduh gambar dari alamat milik merchant menghubungi alamat itu atas nama server. ADR 41 memeriksa alamat yang dihubungi, bukan teks URL, menimbang tiga cara lain, dan menulis kapan pilihan itu salah.");
    expect(dari("t4-m36").jenis).toBe("masalah");
    expect(dari("t4-m36").judul).toContain("Pratinjau gambar");
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badanHalaman.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    const menit = Number(halaman.match(/Baca (\d+) menit/)![1]);
    expect(Math.abs(jumlah / 200 - menit), `${jumlah} kata`).toBeLessThanOrEqual(2.5);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka, dengan teks aman yang menyebut kesimpulan", () => {
    const b = daftarBlok(halaman);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect([...halaman.matchAll(/<Blok ([^>]*)>/g)].map((m) => m[1])).toEqual([
      'nama="Mulai" buka',
      'nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: tiga baris membuat alamat dalam bisa dijangkau atau membocorkan isinya, dan perbaikannya memeriksa alamat yang dihubungi, bukan teks URL."',
      'nama="Paham"', 'nama="Putuskan"', 'nama="Kunci"',
    ]);
    expect((halaman.match(/<\/Blok>/g) ?? []).length).toBe(5);
  });
  test("tautan [[id]]: himpunan, jumlah per tujuan, nomor dan judul sama dengan registry dan peta naskah", () => {
    const semua = [...halaman.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!);
    const hitung = Object.fromEntries([...new Set(semua)].sort().map((id) => [id, semua.filter((x) => x === id).length]));
    expect(hitung).toEqual({ berikutnya: 1, "t4-m36": 4, "t4-prd": 1, "t4-skema": 2, "t4-storage": 1, "t4-tim-infra": 1 });
    expect(halaman).not.toMatch(/\[\[[^\]]*\|/);
    const sesuai: [string, string, string][] = [["t4-m36", "4.20", "M36"], ["t4-prd", "4.1", "PRD v4"], ["t4-skema", "4.5", "Skema data"], ["t4-storage", "4.15", "Keamanan 7"], ["t4-tim-infra", "4.26", "Tim dan infra"]];
    for (const [idh, nomor, awal] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awal), `${idh} di registry`).toBe(true);
      expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    harus(`Prasyarat: [[${dari("t4-ssrf").prasyarat![0]}]]`);
    harus("[[t4-m36]] adalah masalahnya: pratinjau gambar sebuah toko memuat JSON dari layanan dalam, karena server mengunduh alamat yang diisi merchant.");
    harus("PRD v4 membuka Rekeningo untuk merchant luar yang membawa katalog sendiri ([[t4-prd]]). Impor katalog memakai kolom `gambar_url`, dan server mengunduh tiap URL untuk membuat pratinjau ([[t4-skema]]).");
    harus("Merchant luar membawa katalog sendiri, dan server mengunduh tiap `gambar_url` untuk pratinjau ([[t4-skema]]).");
    harus("Penyimpanan objek ([[t4-storage]]) dan alur unggah per gambar");
    expect(naskah).toContain("| `produk` | `produk` + `gambar_url` |".slice(0, 0));
    expect(baca("situs/src/content/docs/tahap-4/skema-data.mdx")).toContain("| `produk` | `produk` + `gambar_url` | Merchant luar mengimpor katalog dengan URL gambar | [[t4-m36\\|M36]] |");
    expect(baca("situs/src/content/docs/tahap-4/fitur-ke-teknis.mdx")).toContain("[[t4-ssrf\\|SSRF]]");
    expect(cara).toContain("Label sumber");
    expect(baca("situs/data/erd/halaman.json")).toContain('"t4-ssrf"');
  });
  test("heading, urutan komponen, dan impor", () => {
    const heading = [...halaman.matchAll(/^(#{2,4}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(heading).toEqual([
      "## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Di stack lain",
      "### ADR 41: satu fungsi unduh gambar, hanya https, alamat diperiksa saat dihubungi, tanpa pengalihan",
      "### Sengaja belum dilakukan", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut",
    ]);
    const komponen = [...halaman.matchAll(/<(Rantai|CariBug|WidgetLama|SkripLama|TabSet|Tebak)\b([^>]*)>/g)].map((m) => `${m[1]}${m[2]}`.trim());
    expect(komponen).toEqual([
      "Rantai data={intiDiagram} ringkas /",
      "CariBug client:visible data={caribug} /",
      'TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}',
    ]);
    expect(halaman.indexOf("<Rantai")).toBeLessThan(halaman.indexOf("<CariBug"));
    expect((halaman.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((halaman.match(/<noscript>/g) ?? []).length).toBe(1);
    const impor = [...halaman.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(impor).toEqual([
      "Blok ../../../components/Blok.astro", "Rantai ../../../components/Rantai.astro", "Snippet ../../../components/Snippet.astro",
      "TabSet ../../../components/TabSet.astro", "CariBug ../../../widgets/cari-bug/CariBug.tsx",
      "intiDiagram ../../../../data/diagram/t4-ssrf-inti.json", "caribug ../../../../data/widget/t4-ssrf-caribug.json",
    ]);
    for (const f of ["situs/src/widgets/cari-bug/CariBug.tsx", "situs/src/components/TabSet.astro"]) expect(fs.existsSync(path.join(akar, f)), f).toBe(true);
  });
  test("kata yang dilarang, ID internal tidak muncul, dan label turunan didefinisikan di pemakaian pertama", () => {
    const prosa = halaman.replace(/<Snippet lang="[a-z]+" code=\{`(?:[^`\\]|\\.)+`\} \/>/g, "");
    expect(prosa).not.toMatch(/\b(mudah|cukup|tinggal)\b/i);
    expect(prosa).not.toMatch(/Anda|!|\bkita\b|\bpetugas\b|\bpengguna\b|\bberkas\b/);
    expect(prosa).not.toMatch(/Ilustrasi mekanisme|Simulasi|mensimulasikan/);
    expect(halaman).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(halaman).not.toMatch(/keputusan \d{3,4}|PR #\d+|#\d{3}\b/);
    expect(halaman).not.toMatch(/\bC2\b|\bE1\b|\bB11\b/);
    expect(halaman).not.toMatch(/\d B\b/);
    expect(halaman).not.toMatch(/\brahasia\b/i);
    // alamat metadata cloud tidak ditulis sebagai tujuan, dan tidak ada payload atau bentuk bypass
    expect(halaman).not.toMatch(/169\.254\.169\.254|metadata\.google|metadata\.amazonaws|instance-data/);
    expect(halaman).not.toMatch(/2130706433|0x7f|127\.1\b|127\.000|LOCALHOST|localhost\./);
    expect(halaman).not.toMatch(/curl |wget |nc -|payload siap|langkah serangan/i);
    // arti istilah di pemakaian pertama
    const pertama = (k: string): number => badanHalaman.search(new RegExp(k));
    expect(pertama("SSRF")).toBeLessThan(pertama("fetcher")) ;
    expect(badanHalaman.indexOf("Resolusi nama".toLowerCase())).toBeGreaterThan(-1);
    expect(badanHalaman).toContain("resolusi nama, yaitu proses DNS yang mengubah nama menjadi alamat");
    expect(badanHalaman).toContain("DNS rebinding adalah nama yang dijawab alamat publik saat diperiksa dan alamat dalam saat dihubungi.");
    expect(badanHalaman).toContain("Pengalihan (redirect) adalah jawaban yang menyuruh client pindah ke alamat lain.");
    expect(badanHalaman).toContain("Zona adalah akhiran seperti `%1` atau `%eth0` yang menunjuk antarmuka jaringan.");
    expect(badanHalaman).toContain("IDNA adalah cara menulis nama domain berkarakter non-ASCII sebagai nama ASCII.");
    expect(badanHalaman).toContain("Loopback adalah alamat server itu sendiri, dan link-local hanya berlaku di satu segmen jaringan. ULA adalah alamat private IPv6. CGNAT adalah blok yang dipakai operator untuk berbagi alamat. NAT64, 6to4, dan Teredo adalah awalan IPv6 yang membawa alamat IPv4 di dalamnya.");
    expect(badanHalaman).toContain("`Dialer.ControlContext` adalah hook, yaitu fungsi yang kamu pasang di `net.Dialer`");
    expect(badanHalaman.indexOf("Loopback adalah alamat server itu sendiri")).toBeGreaterThan(badanHalaman.indexOf("| `93.184.216.34` |"));
    expect(halaman.indexOf("Tidak dijalankan berarti dicek ke kode dan dokumentasi, bukan diuji di lab.")).toBeLessThan(halaman.indexOf("<CariBug"));
    expect(halaman.indexOf("yaitu klaim yang belum bisa dicek ke sumber primer")).toBeGreaterThan(0);
    expect(halaman.indexOf("[Label sumber](/cara-pakai/#label-sumber)")).toBeLessThan(halaman.indexOf("Asumsi"));
    expect(cara).toMatch(/Rekaman lab/);
  });
});

describe("Cek diri, kartu, halaman istilah, glosarium, dan baris RISET", () => {
  test("empat kartu Cek diri ada di halaman dan di kartu.json dengan pertanyaan dan jawaban yang sama, dan angkanya dari rekaman", () => {
    const bagianCek = halaman.slice(halaman.indexOf("### Cek diri"), halaman.indexOf("### Saat me-review kode AI"));
    const tanya = [...bagianCek.matchAll(/\*\*(\d)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n(.+)\n\n<\/details>/g)].map((m) => [m[1], m[2], m[3]]);
    expect(tanya.map((x) => x[0])).toEqual(["1", "2", "3", "4"]);
    const kartu = kartuSemua.filter((k) => k.halaman === "t4-ssrf");
    expect(kartu.map((k) => k.id)).toEqual(["t4-ssrf-1", "t4-ssrf-2", "t4-ssrf-3", "t4-ssrf-4"]);
    kartu.forEach((k, i) => {
      expect(k.tanya).toBe(tanya[i]![1]);
      expect(k.jawab).toBe(tanya[i]![2]);
      expect(k.url).toBe("tahap-4/ssrf/");
      expect(k.judul).toBe("4.21 Keamanan 8: SSRF + ADR 41");
    });
    const priv = terlarang.filter((b) => b.priv === "ya").length;
    expect(tanya[0]![1]).toBe(`Fetcher hanya memeriksa dengan \`IsPrivate\`. Berapa dari ${terlarang.length} alamat terlarang yang lolos, dan dari angka apa?`);
    expect(tanya[0]![2]).toBe(`${nTolak[3]}. \`IsPrivate\` menolak ${priv} dari ${terlarang.length} alamat itu, jadi ${terlarang.length} − ${priv} = ${nTolak[3]} (Hitungan atas \`alamat.txt\`).`);
    expect(tanya[1]![2]).toBe(`Ditolak dengan "tujuan tidak diizinkan" untuk ketujuh kode pengalihan yang diuji, dan server tujuan pengalihan disentuh ${tujuanRedirect[0]} kali (\`batas.txt\`, bagian redirect).`);
    expect(new Set(tujuanRedirect).size).toBe(1);
    expect(tanya[2]![1]).toBe(`Gambar sah berukuran ${titik(batasUkuran)} byte dan gambar lain ${titik(batasUkuran + 1)} byte. Mana yang diterima?`);
    expect(tanya[2]![2]).toBe(`${titik(batasUkuran)} byte, yaitu tepat 2 MiB, diterima. ${titik(batasUkuran + 1)} byte ditolak "terlalu besar" (\`batas.txt\`, bagian batas 2 MiB).`);
    expect(tanya[3]![2]).toBe("Yang dihubungi server adalah alamat hasil resolusi nama, bukan teks URL. Pemeriksaan berjalan di `ControlContext`, yang dipanggil sebelum koneksi benar-benar dibuat dengan alamat yang akan dihubungi (dokumentasi Go).");
  });
  test("daftar review kode AI: enam butir dan tiap butir punya padanan di halaman", () => {
    const b = halaman.slice(halaman.indexOf("### Saat me-review kode AI"), halaman.indexOf("### Bacaan lanjut"));
    expect([...b.matchAll(/^- \[ \] /gm)]).toHaveLength(6);
    expect(b).toContain("- [ ] `IsPrivate` bukan satu-satunya pemeriksaan.");
    expect(b).toContain("- [ ] Daftar alamat memuat IPv4-mapped, alamat berzona, dan awalan transisi IPv6, dan dicocokkan dengan registri IANA.");
  });
  test("halaman istilah ssrf: skema, kalimat, angka dari rekaman, sumber, istilah terkait, dan baris glosarium", () => {
    expect(() => HalamanIstilah.parse(istilah)).not.toThrow();
    expect(istilah.istilah).toBe("SSRF (server-side request forgery)");
    expect(istilah.stack).toBeNull();
    expect(istilah.cerita).toHaveLength(1);
    expect(istilah.cerita[0]!.rujukan).toBe("t4-ssrf");
    expect(istilah.cerita[0]!.teks).toBe(`Fetcher gambar versi aman menolak ${nTolak[1]} dari ${nTolak[2]} alamat terlarang. Bila \`IsPrivate\` satu-satunya pemeriksaan, ${nTolak[3]} dari ${nTolak[2]} lolos (\`alamat.txt\`).`);
    expect(istilah.mekanisme[3]).toBe(`Pemeriksaan yang menentukan berjalan pada alamat yang akan dihubungi, sebelum koneksi dibuat. Di lab, ${kodeRedirect.length === 7 ? "tujuh" : "?"} kode pengalihan ditolak dan server tujuan pengalihan tidak tersentuh (\`batas.txt\`).`);
    expect(istilah.jebakan[1]).toBe(`Memakai \`IsPrivate\` Go sebagai satu-satunya pemeriksaan. Di lab, ${nTolak[3]} dari ${nTolak[2]} alamat terlarang lolos (\`alamat.txt\`).`);
    expect(istilah.jebakan[2]).toContain("sampai 10 permintaan berturut-turut");
    expect(istilah.terkait).toEqual(["Allowlist", "Deny-list"]);
    for (const t of istilah.terkait) expect(glosarium, t).toMatch(new RegExp(`\\| \\*\\*${t}\\*\\*`));
    expect(glosarium).toContain("| **SSRF** (server-side request forgery) | Serangan yang membuat server mengirim permintaan ke alamat pilihan pihak lain, dengan hak jaringan server. | [[t4-ssrf]] |");
    expect(glosarium).toContain("| **Allowlist** | Daftar tujuan yang diizinkan; yang tidak ada di daftar ditolak. | [[t4-ssrf]] |");
    expect(glosarium).toContain("| **Deny-list** | Daftar yang ditolak; yang tidak ada di daftar diterima, jadi daftar itu harus memuat semua yang terlarang. | [[t4-ssrf]] |");
    expect(istilah.sumber.map((s) => [s.riset ?? null, s.url ?? s.rekaman])).toEqual([
      ["R4-210", "https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html"],
      [null, "labs/t4-ssrf/output/alamat.txt"],
    ]);
    expect(istilah.sumber[0]!.judul).toBe("OWASP: Server-Side Request Forgery Prevention Cheat Sheet (dibuka 2026-10-30)");
    expect(fs.existsSync(path.join(akar, istilah.sumber[1]!.rekaman!))).toBe(true);
    expect(baris("R4-210")).toContain("cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet");
    expect(istilah.mekanisme.join(" ")).not.toMatch(/169\.254\.169|0x7f|2130706433/);
  });
  test("baris riset: lima baris berurutan, lima kolom, tanggal 2026-10-30, tanpa ID ganda, dan tiap tautan luar halaman ada di baris riset", () => {
    const ids = [...riset.matchAll(/^\| (R4-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort((a, b) => Number(a.slice(3)) - Number(b.slice(3))));
    expect(ids.filter((x) => Number(x.slice(3)) >= 210 && Number(x.slice(3)) <= 214)).toEqual(["R4-210", "R4-211", "R4-212", "R4-213", "R4-214"]);
    for (const id of ["R4-210", "R4-211", "R4-212", "R4-213", "R4-214"]) {
      const b = baris(id);
      expect(b.split("|").length, `${id} harus 5 kolom`).toBe(7);
      expect(b, id).toContain("2026-10-30");
      const tgl = [...b.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]);
      expect(tgl.every((t) => ["2026-10-30", "2026-10-28", "2026-07-15", "2026-07-17", "2026-07-11", "2019-11-19", "2026-07-09"].includes(t)), `${id}: tanggal ${tgl.join(",")}`).toBe(true);
    }
    const luar = [...new Set([...halaman.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!))];
    const semuaRiset = ["R4-210", "R4-211", "R4-212", "R4-213", "R4-214", "R4-337"].map(baris).join("\n");
    for (const u of luar) {
      const url = new URL(u);
      const kunci = url.host.replace(/^www\./, "") + (url.pathname === "/" ? "" : url.pathname.replace(/\/$/, ""));
      expect(semuaRiset.includes(kunci) || (url.host === "www.iana.org" && semuaRiset.includes(`/${url.pathname.split("/")[2]}`.slice(1))), `tautan luar tidak ada di baris riset: ${u}`).toBe(true);
    }
    expect(luar.length).toBe(20);
    expect((halaman.match(/dibuka 2026-10-30/g) ?? []).length).toBe(JumlahDibuka);
    expect((halaman.match(/2026-10-30/g) ?? []).length).toBe(JumlahTanggal);
    expect([...new Set([...halaman.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]))].sort()).toEqual(["2019-11-19", "2025-10-09", "2026-07-11", "2026-10-30"]);
    expect(baris("R4-212")).toContain("state open");
    expect(baris("R4-212")).toContain("not_planned");
    expect(baris("R4-212")).toContain("2026-07-11");
    expect(baris("R4-211")).toContain("IsPrivate does not describe a security property".slice(0, 0));
    expect(baris("R4-337")).toContain("2025-10-09");
    expect(halaman.startsWith('---\ntitle: "4.21 Keamanan 8: SSRF + ADR 41"\n')).toBe(true);
  });
});

const sidik = (teks: string, kata: string[]): Record<string, number> =>
  Object.fromEntries(kata.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling besar", "paling lama", "selalu", "sama", "sampai", "tetap", "tiap", "sisi", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan"];
const TOKEN = ["ControlContext", "IsPrivate", "IsLoopback", "IsLinkLocalUnicast", "alamat.txt", "batas.txt", "testing.txt", "README", "go1.27.1", "go1.27.2", "go1.27.3", "go1.27.4", "RFC", "loopback", "multicast", "link-local", "CGNAT", "IDNA", "NAT64", "OWASP", "allowlist", "deny-list"];
const hitungToken = (teks: string): Record<string, number> => Object.fromEntries(TOKEN.map((k) => [k, (teks.match(new RegExp(`(?<![\\w-])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "g")) ?? []).length]));
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
const barisTabel = badanHalaman.split("\n").filter((b) => b.startsWith("|")).map((b) => h16(b));
const barisGlosarium = glosarium.split("\n").filter((b) => b.includes("[[t4-ssrf]]"));
const sidikSekarang = {
  SIDIK_RISET: ["R4-210", "R4-211", "R4-212", "R4-213", "R4-214"].map((id) => h16(baris(id))),
  SIDIK_BERKAS: {
    rantai: h16(JSON.stringify(rantaiMentah)), caribug: h16(JSON.stringify(caribugMentah)), istilah: h16(JSON.stringify(istilah)),
    frontmatter: h16(halaman.split("\n---\n")[0]!), glosarium: barisGlosarium.map(h16),
    kartu: kartuSemua.filter((k) => k.halaman === "t4-ssrf").map((k) => h16(JSON.stringify(k))),
    cariBugBerkas: h16(baca(caribugBerkas)),
  },
  SIDIK_HALAMAN: sidik(halaman, KATA),
  SIDIK_TOKEN: hitungToken(halaman),
  SIDIK_TABEL: barisTabel,
  SIDIK_RANTAI: sidik(nilaiString(rantaiMentah).join("\n"), KATA),
  SIDIK_CARIBUG: sidik(nilaiString(caribugMentah).join("\n"), KATA),
  SIDIK_ISTILAH: sidik(nilaiString(istilah).join("\n"), KATA),
  SIDIK_STRUKTUR: struktur.join(" "),
  SIDIK_ANGKA: angka.join(" "),
};
if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan oleh PERBARUI_KUNCI=1 (lihat ssrf.halaman.test.ts): hitungan label dan sidik kata penentu, struktur, dan angka.\n` +
    Object.entries({ ...hitungLabel, ...sidikSekarang }).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};\n`).join("");
  fs.writeFileSync(path.join(__dirname, "ssrf.halaman.sidik.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, cari-bug, dan halaman istilah terkunci per baris (lapis 2)", () => {
  const tekstual = (x: unknown, keluar: string[] = []): string[] => {
    if (typeof x === "string") keluar.push(x);
    else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
    else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
    else if (typeof x === "number" || typeof x === "boolean") keluar.push(`=${String(x)}`);
    return keluar;
  };
  const sekarang = {
    halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
    json: { rantai: tekstual(rantaiMentah), caribug: tekstual(caribugMentah), istilah: tekstual(istilah) },
  };
  if (process.env.PERBARUI_KUNCI === "1") {
    const isi = `// Dihasilkan dari berkas saat ini oleh PERBARUI_KUNCI=1 (lihat ssrf.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\nexport const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\nexport const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
    fs.writeFileSync(path.join(__dirname, "ssrf.halaman.nilai.ts"), isi);
  }
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, cari-bug, dan halaman istilah sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

// Penutup celah mutasi tanpa kunci baris: label sumber, kata penentu, struktur, angka, tabel, dan nilai JSON non-string (indeks bug cari-bug).
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
  test("sidik kata penentu halaman, diagram, cari-bug, dan halaman istilah (kunci agregat)", () => {
    expect(sidikSekarang.SIDIK_HALAMAN).toEqual(SIDIK_HALAMAN);
    expect(sidikSekarang.SIDIK_TOKEN).toEqual(SIDIK_TOKEN);
    expect(sidikSekarang.SIDIK_TABEL).toEqual(SIDIK_TABEL);
    expect(sidikSekarang.SIDIK_RANTAI).toEqual(SIDIK_RANTAI);
    expect(sidikSekarang.SIDIK_CARIBUG).toEqual(SIDIK_CARIBUG);
    expect(sidikSekarang.SIDIK_ISTILAH).toEqual(SIDIK_ISTILAH);
  });
  test("sidik elemen non-prosa: baris riset, JSON (termasuk angka dan boolean), frontmatter, baris glosarium, dan kartu (kunci agregat, bukan turunan)", () => {
    expect(sidikSekarang.SIDIK_RISET).toEqual(SIDIK_RISET);
    expect(sidikSekarang.SIDIK_BERKAS).toEqual(SIDIK_BERKAS);
    expect(barisGlosarium.length).toBe(3);
  });
  test("sidik struktur dan sidik angka prosa", () => {
    expect(sidikSekarang.SIDIK_STRUKTUR).toBe(SIDIK_STRUKTUR);
    expect(sidikSekarang.SIDIK_ANGKA).toBe(SIDIK_ANGKA);
    for (const sel of ["2.097.152", "2.097.153", "32", "29", "26", "54", "39", "27", "21", "80", "512", "6,25", "13", "24", "19"]) expect(angka).toContain(sel);
  });
});

describe("tinjauan: versi rekaman, kutipan bagian, tautan per ID, dan bahasa Snippet", () => {
  test("versi Go di kepala rekaman, README, dan halaman sama; tiap rekaman bertanda rekaman ulang", () => {
    const go = alamatTxt.match(/go([\d.]+) /)![1]!;
    expect(batasTxt.split("\n")[1]).toContain(`go${go} `);
    expect(readme).toContain(`go${go}`);
    for (const m of halaman.matchAll(/\bGo (\d+\.\d+\.\d+)/g)) expect(m[1], "Go di halaman").toBe(go);
    const docGo = baris("R4-211").match(/Dokumentasi Go go(\d+\.\d+\.\d+)/)![1]!;
    for (const m of halaman.matchAll(/\bgo(\d+\.\d+\.\d+)/g)) expect([go, docGo], `versi ${m[0]} di halaman`).toContain(m[1]);
    const tautanGo = [...halaman.matchAll(/\(https:\/\/pkg\.go\.dev\/[^)]+\), go(\d+\.\d+\.\d+), dibuka 2026-10-30\)/g)];
    expect(tautanGo, "tautan dokumentasi Go bernomor versi").toHaveLength(3);
    expect(tautanGo.every((m) => m[1] === docGo)).toBe(true);
    expect(halaman.match(new RegExp(`\\bgo${docGo.replace(/\./g, "\\.")}`, "g"))?.length ?? 0, "versi dokumentasi di halaman").toBe(tautanGo.length + 2); // tiga tautan, kalimat netip.Prefix.Contains tanpa tautan, dan kalimat tab Go    for (const t of [alamatTxt, batasTxt]) expect(t).toContain("# Rekaman: make -C labs/t4-ssrf run.");
    expect(readme).toContain("Rekaman ulang identik per byte");
  });
  test("Snippet: bahasa cocok dengan ekstensi berkas dan dengan stack tab", () => {
    for (const b of halaman.split("\n").filter((x) => x.startsWith("<Snippet") && /file=|files=/.test(x))) {
      const berkas = b.match(/labs\/[\w./-]+?\.(go|txt)/)![1]!;
      if (berkas === "go") expect(b, b.slice(0, 80)).toContain('lang="go"');
      else expect(b, b.slice(0, 80)).not.toMatch(/lang=/);
    }
    expect((halaman.match(/<Snippet lang=/g) ?? []).length).toBe(0);
  });
  test("tiap angka berunit 'bagian' mengutip bagian rekaman yang memuat angka itu (judul bagian ada di rekaman)", () => {
    const bagianAda: Record<string, string> = {
      "bagian redirect": "redirect dimatikan", "bagian batas 2 MiB": "batas 2 MiB", "bagian jawaban gzip": "jawaban gzip", "bagian pesan galat": "pesan galat versi aman",
      "bagian batas yang belum tertutup": "batas yang belum tertutup", "bagian nama IDNA": "nama IDNA", "bagian https saja": "https saja",
    };
    for (const [kutipan, judul] of Object.entries(bagianAda)) {
      expect(halaman, kutipan).toContain(kutipan);
      expect(batasTxt, judul).toContain(`## ${judul}`);
    }
    for (const [kutipan, judul] of Object.entries({ "bagian tepi blok registri": "tepi blok registri alamat khusus IANA", "bagian alamat berzona": "alamat IPv6 berzona" })) {
      expect(halaman, kutipan).toContain(kutipan);
      expect(alamatTxt, judul).toContain(`## ${judul}`);
    }
    const dikutip = [...halaman.matchAll(/`(alamat|batas|testing)\.txt`, bagian ([^)]+)\)/g)].map((m) => `${m[1]}:${m[2]}`);
    expect(dikutip.sort()).toEqual([
      "alamat:alamat berzona", "alamat:tepi blok registri", "batas:batas 2 MiB", "batas:batas yang belum tertutup", "batas:https saja", "batas:jawaban gzip",
      "batas:nama IDNA", "batas:pesan galat", "batas:redirect", "batas:redirect",
    ].sort());
  });
});
