// Penjaga halaman 6.3 (keputusan 1718 sampai 1720): angka, hitungan, nomor ADR, tautan, label sumber, klaim "tidak", tebakan dan skenario alur
// t6-m52.json, kartu Cek diri, dan baris riset di m52-template-service.mdx. Tahap 6 tanpa lab, jadi tak satu pun angka berlabel Rekaman lab.
// Nilai diturunkan dari naskah Tahap 6 (baris M52, ADR 61, tabel tim, peta halaman, metrik PRD v6), halaman ADR 58 (5.27), ADR 53 (5.19), dan ADR 60 (5.30),
// registry, dan baris riset R6-120 sampai R6-124, bukan dari daftar yang ditulis sendiri. Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap
// sumbernya; (2) kata-kata halaman dan skenario dikunci per baris di m52-template-service.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1)
// untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/m52-template-service.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Hitungan "waktu tunggu berbanding terbalik dengan jumlah orang" adalah penyederhanaan yang ditulis
// halaman sebagai Asumsi; satu-satunya sumber luar isu GitHub dibaca lewat API (R6-123 dan R6-124) dan tidak dijalankan ulang oleh tes ini.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import registry from "../../data/cerita.json";
import { daftarBlok, cekTemplat } from "./blok";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./m52-template-service.halaman.nilai";

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
const HALAMAN = "situs/src/content/docs/tahap-6/m52-template-service.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const skenario = JSON.parse(baca("situs/lama/widgets/data/skenario/t6-m52.json")) as Skenario;
const naskah = baca("plan/CERITA-TAHAP-6.md");
const riset6 = baca("plan/RISET-TAHAP-6.md");
const adr58 = baca("situs/src/content/docs/tahap-5/tim-infra.mdx");
const adr53 = baca("situs/src/content/docs/tahap-5/mtls-antar-service.mdx");
const adr60 = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
const glosMdx = baca("situs/src/content/docs/alat/glosarium.mdx");
const istilahGolden = JSON.parse(baca("situs/data/halaman-istilah/golden-path.json")) as { istilah: string; cerita: { rujukan: string; teks: string }[]; sumber: { riset: string; url: string }[] };
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
  sumber: { jenis: string; catatan: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Record<string, unknown>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; label?: string; masalah?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; peran?: string[]; adr?: number[]; path?: string; lab?: string[] }
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
const barisRiset = (id: string): string => riset6.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
// pembulatan setengah ke atas seperti pembaca, bukan toFixed (4.28: 0,579 × 15)
const bulat = (x: number, d: number): number => Math.floor(x * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const koma = (x: number, d = 1): string => bulat(x, d).toFixed(d).replace(".", ",");
const sebelum = (teks: string, pola: string): string => teks.slice(0, teks.indexOf(pola));

// --- sumber angka: naskah, halaman ADR, registry
const barisM52 = naskah.split("\n").find((b) => b.startsWith("| M52 |")) ?? "";
const selM52 = pecahBaris(barisM52);
const barisAdr61 = naskah.split("\n").find((b) => b.startsWith("| 61 |")) ?? "";
const selAdr61 = pecahBaris(barisAdr61);
const barisPeta = naskah.split("\n").find((b) => b.startsWith("| 6.3 |")) ?? "";
const selPeta = pecahBaris(barisPeta);
const awalTim = naskah.indexOf("| Tim | Orang | Pemimpin | Memegang |");
const tabelTim = naskah.slice(awalTim, naskah.indexOf("Delapan tim produk berjumlah", awalTim));
const orangTim = (nama: string): number => Number(cari(new RegExp(`^\\| ${nama} \\| (\\d+) \\|`, "m"), tabelTim, `tim ${nama}`)[1]);
const jumlahTim = tabelTim.split("\n").filter((b) => /^\| [A-Z][\wa-z ]+ \| \d+ \|/.test(b)).length;

const HARI = Number(cari(/(\d+) hari/, selM52[2]!, "17 hari di gejala M52")[1]);
const BENTUK_PIPELINE = "empat";
const SYARAT_MINGGU = 7; // satu minggu = 7 hari (ADR 58: "lebih dari satu minggu")
const PLATFORM = orangTim("Platform");
const TAMBAH = 3; // Bayu meminta "tiga orang" (kolom Yang dikira naskah)
const SEMBILAN = PLATFORM + TAMBAH;
const HARI_ORANG = HARI * PLATFORM;
const TERBALIK = HARI_ORANG / SEMBILAN;
const SATU_HARI = 1;

describe("angka cerita dan hitungan: diturunkan dari naskah, halaman ADR, dan registry", () => {
  test("gejala: 17 hari, empat bentuk, tiga cara, sebelas tim, Selasa, tim Notifikasi, Wilayah, Risiko, dan Dewi dari baris M52 naskah; angka berlabel Ilustrasi", () => {
    const g = selM52[2]!;
    expect(HARI).toBe(17);
    expect(g).toContain("Selasa");
    expect(g).toContain("tim Notifikasi meminta service baru untuk pengumuman per negara");
    expect(g).toContain("template dari Platform baru jadi sesudah 17 hari");
    expect(g).toContain("tim Wilayah dan Risiko menyalin pipeline tim lain");
    expect(g).toContain("Dewi menghitung empat bentuk pipeline dan tiga cara memuat sertifikat mTLS di sebelas tim (Ilustrasi)");
    expect(selM52[1]).toBe("3");
    expect(jumlahTim).toBe(11);
    const mulai = sebelum(badan, '<Blok nama="Coba"');
    expect(mulai).toContain("Minggu 3 Tahap 6. Selasa tim Notifikasi meminta service baru untuk pengumuman per negara.");
    expect(mulai).toContain("Platform menjawab bahwa template service untuk tim itu baru jadi sesudah 17 hari.");
    expect(mulai).toContain("Dalam 17 hari itu tim Wilayah dan tim Risiko tidak menunggu.");
    expect(mulai).toContain("Dewi dari tim SRE menghitung pipeline di sebelas tim. Ia menemukan empat bentuk pipeline dan tiga cara memuat sertifikat mTLS");
    expect(mulai).toContain("17 hari, empat bentuk, dan tiga cara berlabel Ilustrasi");
    expect(mulai).toContain("Sebelas tim berlabel Asumsi cerita ([[t6-prd]])");
    // satu minggu hanya dari baris peta: minggu 3
    expect(dari("t6-m52").label).toBe(`Masalah 52 · minggu ${selM52[1]}`);
  });
  test("dugaan: Platform kurang orang dan Bayu meminta tiga orang, lalu Nadia dengan pipeline sendiri, sama dengan kolom 'Yang dikira' naskah", () => {
    const k = selM52[3]!;
    expect(k).toContain("Platform kurang orang. Bayu meminta tiga orang. Nadia: tiap tim membuat pipeline sendiri");
    expect(badan).toContain("Bayu mengira Platform kurang orang, jadi ia meminta tiga orang tambahan. Nadia mengira tiap tim sebaiknya membuat pipeline sendiri.");
    expect(badan).toContain("Dua dugaan muncul di minggu itu (Ilustrasi).");
    expect(badan).not.toContain("Tiga dugaan");
  });
  test("syarat salah ADR 58: satu minggu ada di 5.27 (Kapan keputusan ini salah dan pre-mortem), dan 17 − 7 = 10 dan 17 ÷ 7 = 2,4", () => {
    const kapan = adr58.slice(adr58.indexOf("**Kapan keputusan ini salah.**"), adr58.indexOf("**Yang akan merevisinya.**"));
    expect(kapan).toContain("Saat permintaan template menunggu lebih dari satu minggu (Asumsi naskah).");
    const pre = adr58.slice(adr58.indexOf("**Pre-mortem.**"), adr58.indexOf("**Kapan keputusan ini salah.**"));
    expect(pre).toContain("Permintaan template menunggu lebih dari satu minggu");
    expect(selM52[4]).toContain("17 hari melewati syarat salah ADR 58 (satu minggu, Asumsi naskah)");
    expect(badan).toContain(`${HARI} − ${SYARAT_MINGGU} = ${HARI - SYARAT_MINGGU} hari di atas syarat itu, dan ${HARI} ÷ ${SYARAT_MINGGU} = ${koma(HARI / SYARAT_MINGGU)} kali satu minggu (Hitungan atas Ilustrasi dan Asumsi).`);
    expect(skenario.langkah[1]!.jelas).toContain(`${HARI} − ${SYARAT_MINGGU} = ${HARI - SYARAT_MINGGU} hari di atas syarat itu (Hitungan atas Ilustrasi dan Asumsi). ADR 58 ada di halaman 5.27.`);
    expect(skenario.langkah[1]!.kirim).toContain("syarat salah ADR 58: satu minggu (Asumsi naskah)");
    expect(HARI - SYARAT_MINGGU).toBe(10);
    expect(koma(HARI / SYARAT_MINGGU)).toBe("2,4");
  });
  test("Platform 6 orang dari tabel tim naskah, tiga orang tambahan, 6 + 3 = 9, 17 × 6 = 102, 102 ÷ 9 = 11,3, 11,3 − 7 = 4,3, 102 ÷ 7 = 14,6 jadi 15, 102 ÷ 1 = 102", () => {
    expect(PLATFORM).toBe(6);
    expect(SEMBILAN).toBe(9);
    expect(badan).toContain(`Platform punya ${PLATFORM} orang (Asumsi cerita), dan Bayu meminta ${TAMBAH} lagi, jadi ${PLATFORM} + ${TAMBAH} = ${SEMBILAN} orang.`);
    expect(badan).toContain(`Dengan anggapan itu hasil kali waktu tunggu dan jumlah orang tetap: ${HARI} × ${PLATFORM} = ${HARI_ORANG}. Jadi ${HARI_ORANG} ÷ ${SEMBILAN} = ${koma(TERBALIK)} hari.`);
    expect(badan).toContain(`${koma(TERBALIK)} − ${SYARAT_MINGGU} = ${koma(bulat(TERBALIK, 1) - SYARAT_MINGGU)} hari di atas satu minggu (Hitungan atas Ilustrasi dan Asumsi).`);
    const butuhMinggu = Math.ceil(HARI_ORANG / SYARAT_MINGGU);
    expect(badan).toContain(`${HARI_ORANG} ÷ ${SYARAT_MINGGU} = ${koma(HARI_ORANG / SYARAT_MINGGU)} menuntut ${butuhMinggu} orang. Untuk turun ke satu hari, ${HARI_ORANG} ÷ ${SATU_HARI} = ${HARI_ORANG / SATU_HARI} orang.`);
    expect(koma(TERBALIK)).toBe("11,3");
    expect(butuhMinggu).toBe(15);
    expect(badan).toContain("Anggapan itu penyederhanaan, bukan model queue, dan Asumsi.");
    expect(skenario.predict.explain).toContain(`${HARI} × ${PLATFORM} ÷ ${SEMBILAN} = ${koma(TERBALIK)} hari`);
    expect(skenario.langkah[4]!.jelas).toContain(`${PLATFORM} + ${TAMBAH} = ${SEMBILAN} orang`);
    expect(skenario.langkah[4]!.kirim).toContain(`Platform: ${PLATFORM} orang, tiket menunggu`);
    expect(skenario.predict.q).toContain("dari enam menjadi sembilan");
  });
  test("empat pipeline: 4 × 1 = 4 pekerjaan, dan 17 ÷ 1 = 17 kali target satu hari di varian", () => {
    expect(badan).toContain("Bila satu perbaikan di langkah yang sama dibuat untuk tiap bentuk, hasilnya 4 × 1 = 4 pekerjaan (Hitungan atas Ilustrasi).");
    expect(skenario.langkah[3]!.jelas).toContain("dikerjakan 4 kali, sekali untuk tiap bentuk (Hitungan atas Ilustrasi");
    expect(skenario.varian.langkah[1]!.jelas).toContain(`${HARI} ÷ ${SATU_HARI} = ${HARI / SATU_HARI} kali lebih lama (Hitungan atas Ilustrasi dan Asumsi).`);
    expect(skenario.varian.langkah[3]!.kirim).toContain("1 perbaikan di template, bukan 4 di empat bentuk pipeline (Hitungan atas Ilustrasi)");
    expect(selM52[4]).toContain("Empat pipeline berarti tiap perbaikan keamanan dikerjakan empat kali");
  });
  test("tujuan kritis: empat dari naskah, ADR 60 butir 1 dan ADR 53 menulis syarat 'lebih dari satu' dan 'kedua', dan kalimat halaman tidak lebih kuat", () => {
    expect(selM52[4]).toContain("Tujuan kritis yang butuh identitas sama sudah empat (bagian 3, butir 1)");
    expect(naskah).toContain("Empat tujuan kritis: ledger tiga negara, skor risiko, kebijakan, katalog data (Ilustrasi).");
    expect(adr60).toContain("Lebih dari satu tujuan kritis butuh identitas yang sama");
    expect(adr60).toContain("Satu tujuan kritis, yaitu ledger, dipanggil tiga service");
    expect(adr53).toContain("Saat tujuan kritis kedua, selain ledger, butuh identitas yang sama.");
    expect(adr53).toContain("Identitas pemanggil adalah satu-satunya SAN DNS");
    expect(badan).toContain("Naskah menghitungnya: ledger tiga negara, skor risiko, kebijakan, dan katalog data (Ilustrasi; tabel pemicu ADR 60 dibahas di [[t6-fitur-teknis]]).");
    expect(badan).toContain("ADR 60 menulis pemicu service mesh penuh sebagai lebih dari satu tujuan kritis yang butuh identitas yang sama, dan di Tahap 5 hanya ledger ([[t5-adr-60]]).");
    expect(badan).toContain("ADR 53 menulis keputusannya salah saat tujuan kritis kedua butuh identitas itu ([[t5-mtls]]).");
    expect(badan).toContain("Terpenuhi berarti keadaan M52 sama dengan pemicu yang ditulis, bukan bahwa service mesh terbukti perlu. Empat lebih dari satu (Hitungan atas Ilustrasi), jadi pemicu itu terpenuhi untuk identitas.");
  });
  test("ADR 61 naskah: ambang adopsi 50% dua kuartal, lead time satu hari, template satu minggu, pembanding 4 pipeline dan 17 hari, adopsi 90 hari, lima metrik DORA per service", () => {
    expect(selAdr61[0]).toBe("61");
    expect(selAdr61[3]).toContain("Adopsi golden path di bawah 50% selama dua kuartal (Asumsi), atau lead time template lebih dari satu hari");
    expect(selAdr61[3]).toContain("Permintaan perubahan template menunggu lebih dari satu minggu (syarat ADR 58)");
    expect(selAdr61[3]).toContain("Pembanding: 4 pipeline dan 17 hari");
    expect(selAdr61[1]).toContain("lead time dari permintaan service baru sampai pipeline hijau pertama paling lama satu hari (Asumsi)");
    expect(selAdr61[1]).toContain("adopsi golden path (service baru 90 hari terakhir yang dibuat dari template; tidak punya definisi baku, Asumsi)");
    expect(selAdr61[1]).toContain("lima metrik DORA per service");
    expect(selAdr61[1]).toContain("roadmap dan pertemuan dengan tim yang memakainya tiap dua minggu");
    expect(selAdr61[1]).toContain("mTLS dan identitas service ada di template, tanpa service mesh. Jalur di luar golden path boleh dengan ADR singkat");
    const kapan = badan.slice(badan.indexOf("**Kapan keputusan ini salah.**"), badan.indexOf("**Yang akan merevisinya.**"));
    expect(kapan).toContain("- Saat adopsi golden path di bawah 50% selama dua kuartal (Asumsi): jalurnya lebih lambat dari menyalin.");
    expect(kapan).toContain("- Saat lead time dari permintaan sampai pipeline hijau pertama lebih dari satu hari (Asumsi). Pembanding: 17 hari di M52 (Ilustrasi).");
    expect(kapan).toContain("- Saat permintaan perubahan template menunggu lebih dari satu minggu, syarat salah ADR 58 (Asumsi naskah).");
    expect(kapan).toContain("Pembanding: 3 cara dan 4 bentuk pipeline di M52 (Ilustrasi).");
    expect((kapan.match(/^- /gm) ?? []).length).toBe(4);
    expect(naskah).toContain("lima metrik DORA per service dilaporkan tiap bulan");
    expect(naskah).toContain("Service baru dari permintaan sampai pipeline hijau pertama dalam satu hari (Asumsi)");
  });
});

describe("opsi dan aturan ADR 61: lima opsi dari naskah, tujuh aturan, tiga penyebab pre-mortem", () => {
  test("opsi: A sampai D dari kolom 'Opsi yang ditimbang' naskah, E dipilih; judul kolom dan satu tabel enam kolom lima baris", () => {
    const opsi = selAdr61[2]!;
    expect(opsi).toContain("Tiap tim membuat pipeline sendiri (ditolak: empat pipeline, perbaikan keamanan empat kali)");
    expect(opsi).toContain("tim platform sebagai queue tiket (ditolak: M52, 17 hari)");
    expect(opsi).toContain("portal developer dipasang lebih dulu");
    expect(opsi).toContain("service mesh sebagai cara identitas seragam (ditunda");
    const kepala = badan.split("\n").find((b) => b.startsWith("| | A. "))!;
    expect(pecahBaris(kepala)).toEqual(["", "A. Tiap tim membuat pipeline sendiri", "B. Platform sebagai queue tiket", "C. Portal developer lebih dulu", "D. Service mesh untuk identitas seragam", "E. Platform sebagai produk dengan golden path"]);
    const tabelAdr = badan.slice(badan.indexOf(kepala)).split("\n").filter((b, i) => i < 7).filter((b) => b.startsWith("|"));
    expect(tabelAdr).toHaveLength(7);
    for (const b of tabelAdr) expect(pecahBaris(b)).toHaveLength(6);
    const bukti = pecahBaris(tabelAdr.find((b) => b.startsWith("| Bukti |"))!);
    expect(bukti.slice(1).map((x) => x.split(" ")[0])).toEqual(["Hitungan", "Ilustrasi", "Tidak", "Tidak", "Tidak"]);
    expect(bukti[3]).toBe("Tidak dijalankan: dokumentasi Backstage");
    expect(bukti[4]).toBe("Tidak dijalankan: dokumentasi Istio dan Linkerd");
    expect(bukti[5]).toBe("Tidak dijalankan: Spotify, CNCF, dan DORA");
  });
  test("keputusan opsi E: tujuh aturan bernomor 1 sampai 7 dalam satu blok, dan isi aturan sama dengan kolom Keputusan naskah", () => {
    const aturan = badan.slice(badan.indexOf("**Keputusan: opsi E.** Tujuh aturan:"), badan.indexOf("**Kenapa E, bukan A, B, C, atau D.**"));
    expect([...aturan.matchAll(/^(\d)\. /gm)].map((m) => m[1]).join("")).toBe("1234567");
    expect(aturan).toContain("1. Golden path adalah satu jalur yang didukung: template service, pipeline, dashboard, alert, dan `service.yaml` yang diisi tim produk.");
    expect(aturan).toContain("2. Service catalog mencatat pemilik, giliran jaga, dan SLO tiap service.");
    expect(aturan).toContain("3. Platform punya roadmap dan bertemu tim yang memakainya dua minggu sekali (Asumsi desain).");
    expect(aturan).toContain("Pertama, lead time dari permintaan service baru sampai pipeline hijau pertama paling lama satu hari (Asumsi).");
    expect(aturan).toContain("Kedua, adopsi golden path, yaitu bagian service baru dalam 90 hari terakhir yang dibuat dari template (definisi Asumsi).");
    expect(aturan).toContain("Ketiga, lima metrik DORA per service, dilaporkan per service dan tidak dibandingkan antar tim.");
    expect(aturan).toContain("5. mTLS dan identitas service ada di template, tanpa service mesh. Template memuat sertifikat dengan satu cara dan mengikuti ADR 53 ([[t5-mtls]]).");
    expect(aturan).toContain("6. Service di luar golden path boleh dengan ADR singkat, dan service itu tercatat di katalog dengan tautan ke ADR-nya.");
    expect(aturan).toContain("7. Service mesh tidak dipasang. Ia dibuka lagi bila tujuan kritis melewati kemampuan template (ADR 69 butir 1, dibahas di [[t6-adr-69]]).");
    expect(naskah).toContain("template service, pipeline, dashboard, alert, dan `service.yaml` yang diisi tim produk. Service catalog mencatat pemilik, giliran jaga, dan SLO tiap service");
    expect(badan).toContain("**Status:** diterima sesudah M52 (minggu 3).");
  });
  test("pre-mortem: tepat tiga penyebab bernomor, dan 'Kenapa E' menyebut A sampai D", () => {
    const pre = badan.slice(badan.indexOf("**Pre-mortem.**"), badan.indexOf("**Kapan keputusan ini salah.**"));
    expect([...pre.matchAll(/^(\d)\. /gm)].map((m) => m[1]).join("")).toBe("123");
    expect(pre).toContain("Tiga penyebab yang paling mungkin:");
    expect(pre).toContain("seperti di ADR 58 (Penalaran)");
    expect(pre).toContain("Pencegahannya aturan 6");
    expect(pre).toContain("Pencegahannya aturan 4");
    const kenapa = badan.slice(badan.indexOf("**Kenapa E, bukan A, B, C, atau D.**"), badan.indexOf("**Pre-mortem.**"));
    expect([...kenapa.matchAll(/^- \*\*([A-D]) (ditolak|ditunda)/gm)].map((m) => m[1] + m[2]).join(" ")).toBe("Aditolak Bditolak Cditunda Dditunda");
    // naskah menulis opsi mesh sebagai ditunda dan portal sebagai disebut: halaman menunda keduanya, dan menolak A dan B
    expect(selAdr61[2]).toContain("(ditolak: empat pipeline");
    expect(selAdr61[2]).toContain("(ditolak: M52, 17 hari)");
  });
});

describe("sumber luar: tautan, tanggal buka, kutipan, dan baris riset R6-120 sampai R6-124", () => {
  const ids = ["R6-120", "R6-121", "R6-122", "R6-123", "R6-124"];
  const url = (s: string): string[] => [...s.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]!);
  test("lima baris riset berurutan, lima kolom, tanpa ID ganda, disisip di antara R6-39 dan R6-170", () => {
    const baris = riset6.split("\n");
    const idx = ids.map((id) => baris.findIndex((b) => b.startsWith(`| ${id} |`)));
    for (let i = 1; i < idx.length; i++) expect(idx[i]).toBe(idx[i - 1]! + 1);
    for (const id of ids) {
      expect(baris.filter((b) => b.startsWith(`| ${id} |`))).toHaveLength(1);
      expect(pecahBaris(barisRiset(id))).toHaveLength(5);
    }
    expect(baris[idx[0]! - 1]!.startsWith("| R6-39 |")).toBe(true);
    expect(baris[idx[4]! + 1]!.startsWith("| R6-170 |")).toBe(true);
  });
  test("tiap tautan luar di halaman ada di salah satu baris riset (host dan jalur), dibuka 2026-11-06, dan jumlahnya terkunci", () => {
    const luar = url(halaman).filter((u) => !u.startsWith("/"));
    const set = [...new Set(luar)].sort();
    expect(set).toEqual([
      "https://backstage.io/docs/features/software-catalog/",
      "https://backstage.io/docs/overview/what-is-backstage/",
      "https://dora.dev/guides/dora-metrics/",
      "https://engineering.atspotify.com/2020/08/how-we-use-golden-paths-to-solve-fragmentation-in-our-software-ecosystem",
      "https://istio.io/latest/about/service-mesh/",
      "https://linkerd.io/releases/",
      "https://tag-app-delivery.cncf.io/whitepapers/platforms/",
    ]);
    const semuaRiset = ids.map(barisRiset).join("\n");
    for (const u of set) {
      const bersih = u.replace(/^https:\/\//, "").replace(/\/$/, "");
      expect(semuaRiset, `riset tidak memuat ${u}`).toContain(bersih);
    }
    expect(luar).toHaveLength(7 + 7); // tujuh tautan di badan Paham dan Putuskan, tujuh di Bacaan lanjut (satu sumber boleh muncul dua kali)
    const buka = halaman.match(/dibuka 2026-11-06/g) ?? [];
    expect(buka.length).toBe(8);
    expect(halaman.match(/20\d\d-\d\d-\d\d/g)!.filter((d) => d !== "2026-11-06")).toEqual(["2026-09-30"]);
  });
  test("R6-120: Spotify, penulis di byline, tanggal terbit, kutipan Inggris, paved road, masalah turunan; kalimat halaman tidak lebih kuat", () => {
    const r = barisRiset("R6-120");
    for (const k of ["Gary Niemen", "2020-08-17", '"opinionated and supported"', '"six years ago"', '"eight top engineers"', "Paved Road and Silver Path", "second-order problem", "we miss coordination at the level of the tutorial", 'Kata "adoption" tidak ada di teks', "tanpa angka adopsi atau lead time"]) expect(r, k).toContain(k);
    expect(badan).toContain("Spotify menulis golden path sebagai jalur yang \"opinionated and supported\" untuk membangun sesuatu, misalnya service backend, website, atau data pipeline.");
    expect(badan).toContain("Gary Niemen, 17 Agustus 2020, dibuka 2026-11-06, Tidak dijalankan");
    expect(badan).toContain("sekitar enam tahun sebelum tulisan itu dari satu Hack Week, ketika delapan engineer menulis tutorial.");
    expect(badan).toContain("Penulis mengutip tulisan internal tim Platform Spotify: yang keluar dari jalur itu bebas, tetapi tanpa dukungan yang sama");
    expect(badan).toContain("Tulisan itu menyebut paved road dan silver path sebagai konsep turunan dari golden path.");
    expect(badan).toContain("ditulis seorang product manager di tim dokumentasi tentang sistem perusahaannya sendiri, tanpa angka adopsi atau lead time.");
    expect(badan).toContain("Tutorial per disiplin dimiliki banyak tim, sehingga koordinasi antar tutorial kurang.");
    expect(badan).toContain("Tulisan Spotify yang dibuka tidak menulis angka adopsi.");
    expect(r).toContain("product manager");
  });
  test("R6-121: white paper CNCF, kutipan, pelunak 'almost certain' jadi 'hampir pasti', dua ukuran mirip lead time, adopsi tanpa definisi", () => {
    const r = barisRiset("R6-121");
    for (const k of ["tag-app-delivery.cncf.io/whitepapers/platforms/", "CC BY 4.0", "Platform as a product", "autonomously and automatically", "a bundle often described as a golden path", "Latency from request to fulfillment of a service or capability", "Latency to build and deploy a brand new service into production", "are almost certain to find resistance and resentment", "optional and composable", "tanpa definisi adopsi golden path"]) expect(r, k).toContain(k);
    expect(badan).toContain("White paper CNCF Platforms menulis bahwa platform ada untuk melayani kebutuhan user-nya dan dirancang dari kebutuhan itu, seperti produk software lain.");
    expect(badan).toContain("Tim platform meneliti kebutuhan user, merencanakan roadmap fitur, dan memimpin pertemuan roadmap.");
    expect(badan).toContain("User juga harus bisa meminta dan menerima kemampuan platform secara mandiri dan otomatis (self-service) (");
    expect(badan).toContain("Yang pertama mengukur lama dari permintaan sampai terpenuhi, dan yang kedua mengukur lama membangun dan merilis satu service baru ke produksi.");
    expect(badan).toContain("Tim platform yang merilis tanpa masukan user, atau memaksa adopsi dari atas, hampir pasti menemui penolakan.");
    expect(badan).toContain("White paper CNCF menyebut user aktif dan retensi sebagai ukuran, tanpa mendefinisikan adopsi golden path.");
    expect(badan).toContain("halaman tanpa nomor versi, dibuka 2026-11-06, Tidak dijalankan");
  });
  test("R6-122: DORA, penulis di byline, lima metrik, change lead time, satu aplikasi atau service, jebakan target dan perbandingan", () => {
    const r = barisRiset("R6-122");
    for (const k of ["Nathen Harvey", "dora.dev/guides/dora-metrics/", "five software delivery performance metrics", "from committed to version control to deployed in production", "best suited for measuring one application or service at a time", "can be problematic", "increases the likelihood that teams will try to game the metrics", "Making disparate comparisons"]) expect(r, k).toContain(k);
    for (const m of ["change lead time", "deployment frequency", "failed deployment recovery time", "change fail rate", "deployment rework rate"]) {
      expect(r, m).toContain(m);
      expect(badan, m).toContain(m);
    }
    expect(badan).toContain("DORA (DevOps Research and Assessment) menulis lima ukuran kinerja pengiriman software.");
    expect(badan).toContain("Panduan DORA menulis bahwa ukuran itu paling cocok untuk satu aplikasi atau satu service pada satu waktu. Menggabungkannya lintas tim bisa bermasalah (");
    expect(badan).toContain("Ukuran itu berbeda dari change lead time DORA, yaitu waktu satu perubahan dari commit ke version control sampai berjalan di produksi.");
    expect(badan).toContain("Panduan DORA menulis bahwa menjadikan ukuran sebagai tujuan membuat tim cenderung mengakali angka, dan membandingkan aplikasi yang konteksnya berbeda bisa menyesatkan.");
    expect(glosMdx).toContain("| **DORA** | Lima ukuran kinerja pengiriman software dari penelitian DORA: change lead time, deployment frequency, failed deployment recovery time, change fail rate, dan deployment rework rate.");
  });
  test("R6-123: Backstage, katalog, dan isu 34765 yang disimulasikan; halaman tidak memakai isu itu sebagai bukti dan menyebut anggota organisasi, bukan pengelola", () => {
    const r = barisRiset("R6-123");
    for (const k of ["an open source framework for building developer portals", "a centralized system that keeps track of ownership and metadata", "metadata YAML files stored together with the code", "backstage/backstage#34765", "performStitching", "DO want this behavior", "author_association MEMBER", "github-actions[bot]", "not_planned", "2026-09-30", "Isu tidak dipakai sebagai bukti kerusakan Backstage"]) expect(r, k).toContain(k);
    expect(badan).toContain("Backstage adalah kerangka untuk portal developer dengan katalog, template, dan dokumentasi (");
    expect(badan).toContain("Dokumentasi Backstage menulis katalog itu sebagai sistem terpusat yang dibangun dari file metadata YAML di samping kode (");
    expect(badan).toContain("Isu Backstage 34765 tidak dipakai sebagai alasan. Pelapornya menyimulasikan galat dengan melempar error. Seorang anggota organisasi Backstage menjawab bahwa percobaan ulang tanpa henti memang diinginkan untuk galat sementara, dan bot repositori menutupnya otomatis pada 2026-09-30 (GitHub API, dibuka 2026-11-06, [perlu verifikasi]).");
    expect(badan).not.toContain("pengelola menjawab");
  });
  test("R6-124: isu Istio 58514 pada versi 1.28.1, masih terbuka, tidak membuktikan 1.31.3; Linkerd tanpa stable release dari proyek sejak Februari 2024", () => {
    const r = barisRiset("R6-124");
    for (const k of ["istio/istio#58514", "1.28.1", "48 komentar", "2026-10-19", "CONTRIBUTOR, bukan pengelola", "Version 1.31.3", "As of February 2024, the Linkerd open source project itself no longer provides stable release artifacts", "Isu 58514 tidak membuktikan perilaku 1.31.3"]) expect(r, k).toContain(k);
    expect(badan).toContain("Isu istio 58514 melaporkan 503 selama rolling restart di mode ambient pada Istio 1.28.1, dan masih terbuka pada 2026-11-06 dengan beberapa mitigasi di komentarnya.");
    expect(badan).toContain("Isu itu tidak membuktikan perilaku Istio 1.31.3, versi di kaki halaman Istio (GitHub API, [perlu verifikasi]).");
    expect(badan).toContain("sejak Februari 2024 proyek open source-nya tidak menyediakan stable release, dan vendor yang membuatnya");
    expect(badan).toContain("halaman menulis Istio 1.31.3 di kakinya, dibuka 2026-11-06, Tidak dijalankan");
  });
  test("halaman istilah Golden path memakai R6-03 dan menyebut M52 dan 5.27 dengan arti yang sama dengan halaman ini; glosarium Golden path dan Service catalog menunjuk 6.3", () => {
    expect(istilahGolden.cerita.some((c) => c.rujukan === "t6-m52")).toBe(true);
    expect(istilahGolden.cerita.find((c) => c.rujukan === "t5-tim-infra")!.teks).toContain("jalan beraspal");
    expect(istilahGolden.sumber[0]!.riset).toBe("R6-03");
    expect(istilahGolden.sumber[0]!.url).toContain("engineering.atspotify.com/2020/08/how-we-use-golden-paths");
    expect(glosMdx).toContain("| **Golden path** | Jalur yang diutamakan dan didukung untuk membangun sesuatu, mis. satu service baru. Halaman 5.27 menyebutnya jalan beraspal. | [[t6-m52]] |");
    expect(glosMdx).toContain("| **Service catalog** | Sistem terpusat yang mencatat pemilik dan metadata semua software di satu organisasi, mis. service, website, library, dan data pipeline. | [[t6-m52]] |");
    expect(adr58).toContain("jalan beraspal");
    expect(badan).toContain("Golden path adalah jalur yang diutamakan dan didukung Platform untuk membangun satu service baru.");
  });
});

describe("registry, tautan, template blok, widget, kartu, tebakan, dan kata", () => {
  test("registry: 6.3 jenis konsep, ada, ADR 61, prasyarat t6-fitur-teknis dan t5-tim-infra, menit = baca + coba, judul dan peran dari naskah", () => {
    const h = dari("t6-m52");
    expect(h.nomor).toBe("6.3");
    expect(h.jenis).toBe("konsep");
    expect(h.ada).toBe(true);
    expect(h.inti).toBe(true);
    expect(h.adr).toEqual([61]);
    expect(h.prasyarat).toEqual(["t6-fitur-teknis", "t5-tim-infra"]);
    expect(h.lab ?? []).toEqual([]);
    expect(h.peran).toEqual(["devops", "backend"]);
    expect(h.path).toBe("tahap-6/m52-template-service.md");
    expect(selPeta[2]).toBe(h.judul);
    expect(selPeta[3]).toBe("Masalah + ADR");
    expect(selPeta[4]).toBe("★");
    expect(selPeta[5]).toBe("–");
    expect(selPeta[6]).toContain("alur (tebak, lalu pembaca mengganti tim memakai golden path atau menyalin pipeline)");
    expect(frontmatter).toContain(`title: "${h.nomor} ${h.judul.split(" (")[0]}"`);
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.*?) · Jalur inti<\/p>/, halaman, "baris meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(meta[3]).toBe("[[t6-fitur-teknis]], [[t5-tim-infra]]");
    expect(naskah).toContain("| 6.3 | 4 | M52: Template service menunggu 17 hari + ADR 61 (platform sebagai produk, golden path, service catalog) | Masalah + ADR | ★ | – |");
  });
  test("tautan [[id]]: semua id ada di registry, dan himpunan serta jumlah per tujuan terkunci", () => {
    const semua = [...halaman.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]!);
    for (const id of new Set(semua)) expect(hal.some((x) => x.id === id) || id === "A0", `id tidak ada di registry: ${id}`).toBe(true);
    const hitung: Record<string, number> = {};
    for (const id of semua) hitung[id] = (hitung[id] ?? 0) + 1;
    expect(hitung).toEqual({ "t6-fitur-teknis": 2, "t5-tim-infra": 4, "t6-prd": 2, "t5-mtls": 5, "t5-adr-60": 2, "t6-adr-69": 3, "t6-m53": 1, "t6-m54": 1, "t6-tim-infra": 1 });
    expect(dari("t6-prd").ada).toBe(false);
    expect(dari("t6-fitur-teknis").prasyarat).toContain("t6-prd");
  });
  test("template konsep: lima blok dalam urutan, dua pertama terbuka; Cek diri empat soal; tanpa details.question; noscript; SkripLama di akhir", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(badan).toContain('<Blok nama="Mulai" buka>');
    expect(badan).toMatch(/<Blok nama="Coba" buka aman="[^"]+">/);
    expect(badan).toContain('<Blok nama="Paham">');
    expect(badan).toContain('<Blok nama="Putuskan">');
    expect(badan).toContain('<Blok nama="Kunci">');
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("1234");
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(4);
    expect((badan.match(/<summary>Jawaban<\/summary>/g) ?? []).length).toBe(4);
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(0);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t6-m52.json" />');
    expect(badan).not.toContain("<Rantai");
    expect(badan).not.toContain("<Snippet");
  });
  test("semua tabel GFM: jumlah kolom header, pemisah, dan tiap baris sama; tepat dua tabel (ADR dan Sengaja belum)", () => {
    const baris = badan.split("\n");
    const tabel: string[][] = [];
    let cur: string[] = [];
    for (const b of baris) {
      if (b.startsWith("|")) cur.push(b);
      else if (cur.length) { tabel.push(cur); cur = []; }
    }
    if (cur.length) tabel.push(cur);
    expect(tabel).toHaveLength(2);
    for (const t of tabel) {
      const n = pecahBaris(t[0]!).length;
      for (const b of t) expect(pecahBaris(b)).toHaveLength(n);
      expect(t[1]).toMatch(/^\|(---\|)+$/);
    }
    expect(tabel[0]).toHaveLength(7);
    expect(tabel[1]).toHaveLength(6);
    expect(pecahBaris(tabel[1]![0]!)).toEqual(["Yang ditunda", "Kenapa ditunda", "Muncul lagi di"]);
  });
  test("skenario alur: valid menurut alur-core, tanpa perangkat, lima komponen, lima langkah, empat langkah varian mulai 1, jenis Ilustrasi", () => {
    expect(core.validate(core.normalize(skenario), { exists: (p: string) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber.jenis).toBe("ilustrasi");
    expect(skenario.perangkat).toEqual([]);
    expect(skenario.layarAwal).toEqual({});
    expect(skenario.komponen.map((k) => k.id)).toEqual(["notif", "plat", "wil", "pipe", "sre"]);
    expect(skenario.langkah).toHaveLength(5);
    expect(skenario.varian.langkah).toHaveLength(4);
    expect(skenario.varian.mulai).toBe(1);
    expect(core.steps(skenario, true)).toHaveLength(5);
    expect(skenario.sumber.catatan).toContain("Tidak ada lab di Tahap 6");
    expect(skenario.sumber.catatan).toContain("Syarat satu minggu dibaca dari halaman ADR 58, dan target satu hari adalah Asumsi ADR 61.");
    expect(badan).toContain("centang **Ubah satu hal: " + skenario.varian.label + "**");
    expect(skenario.varian.label).toBe("tim yang sama memakai golden path (rancangan ADR 61)");
    expect(skenario.langkah.map((l) => l.kirim).join("\n")).not.toMatch(/Rekaman lab/);
    expect(badan).toContain("Empat langkah berikutnya menunjukkan permintaan tanpa tiket, target satu hari, service catalog, dan satu perbaikan keamanan (rancangan, Tidak dijalankan).");
    const nada = [...skenario.langkah, ...skenario.varian.langkah].map((l) => l.nada ?? "-").join(" ");
    expect(nada).toBe("- - - - warn - - - good");
  });
  test("tebakan: empat pilihan, satu benar di posisi kedua dan bukan yang terpanjang atau terpendek; predict.varian salah (tebakan jalur utama); penjelasan memuat Penalaran dan hitungan", () => {
    const p = skenario.predict;
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(1);
    expect(p.varian).toBe(false);
    const len = p.options.map((o) => o.length);
    expect(len[p.answer]).not.toBe(Math.max(...len));
    expect(len[p.answer]).not.toBe(Math.min(...len));
    expect(p.explain).toContain("(Penalaran)");
    expect(p.explain).toContain("(Hitungan atas Ilustrasi dan Asumsi)");
    expect(p.explain).toContain("Angka 17 hari adalah Ilustrasi, dan anggapan berbanding terbalik adalah penyederhanaan, bukan model queue.");
    expect(p.options[p.answer]).toBe("Waktu tunggu tiket memendek, tetapi tiap permintaan service baru tetap menunggu giliran di Platform");
    expect(selM52[4]).toContain("Tambah orang memendekkan queue tanpa mengubah bentuknya (penalaran)");
    expect(p.q).toContain(`dari enam menjadi sembilan`);
  });
  test("jawaban tebakan tidak tertulis di teks yang terlihat sebelum widget: frontmatter, Mulai, pengantar Coba, dan atribut aman", () => {
    const sebelumWidget = halaman.slice(0, halaman.indexOf('<WidgetLama nama="alur"'));
    for (const k of ["memendek", "11,3", "menunggu giliran", "tetap menunggu", "berbanding terbalik", "9 orang", "sembilan"]) expect(sebelumWidget, `bocor: ${k}`).not.toContain(k);
    expect(frontmatter).not.toMatch(/memendek|11,3|berbanding terbalik/);
    const aman = cari(/<Blok nama="Coba" buka aman="([^"]+)">/, badan, "aman")[1]!;
    expect(aman).toBe("Kalau berhenti di sini, kamu sudah menjalankan dua jalur untuk tim yang sama: menyalin pipeline dan memakai jalur yang didukung Platform.");
    expect(sebelumWidget).toContain("Tebak dulu apa yang terjadi bila Platform ditambah tiga orang");
    // paragraf sesudah widget memperkenalkan Ubah satu hal tanpa menulis hasil tebakan
    const sesudah = badan.slice(badan.indexOf('<WidgetLama nama="alur"'), badan.indexOf("<noscript>"));
    expect(sesudah).not.toMatch(/memendek|11,3|berbanding terbalik/);
    // jawaban hanya di JSON widget (dibuka di akhir jalur utama), noscript, dan blok sesudah Coba
    expect(badan.indexOf("11,3")).toBeGreaterThan(badan.indexOf("<noscript>"));
  });
  test("kartu Cek diri: empat kartu t6-m52, tanya sama dengan soal di halaman, jawaban halaman termuat", () => {
    const k = kartuSemua.filter((x) => x.halaman === "t6-m52");
    expect(k.map((x) => x.id)).toEqual(["t6-m52-1", "t6-m52-2", "t6-m52-3", "t6-m52-4"]);
    const soal = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(k.map((x) => x.tanya)).toEqual(soal);
    for (const x of k) {
      expect(x.judul).toBe(`${dari("t6-m52").nomor} ${dari("t6-m52").judul}`);
      expect(x.url).toBe("tahap-6/m52-template-service/");
    }
    expect(k[0]!.jawab).toContain("17 × 6 ÷ 9 = 11,3 hari");
    expect(k[1]!.jawab).toContain("dari commit ke version control sampai berjalan di produksi");
  });
  test("kata: tanpa token, router, client, log, replika, nonce, Anda, pengguna, antrean; jalan beraspal dua kali dan selalu dengan rujukan ke 5.27; golden path satu kata", () => {
    const teks = halaman + JSON.stringify(skenario);
    expect(teks).not.toMatch(/\b(token|router|client|log|replika|nonce|Anda|pengguna|antrean|antrian)\b/i);
    const jalan = badan.split("\n").filter((b) => /jalan beraspal/.test(b));
    expect(jalan).toHaveLength(2);
    for (const b of jalan) expect(b).toContain("[[t5-tim-infra]]");
    expect(badan).not.toMatch(/paved road dan silver path sebagai (jalan|aturan)/);
    expect((badan.match(/jalan beraspal/g) ?? []).length).toBe(2);
    expect(badan).toContain("Karena itu halaman ini memakai satu kata, golden path, untuk hal yang di [[t5-tim-infra]] bernama jalan beraspal.");
    expect(badan).toContain("Halaman [[t5-tim-infra]] menulis jalur yang sama sebagai jalan beraspal, dan Tahap 6 memakai kata golden path.");
  });
  test("definisi di pemakaian pertama: Hitungan dan Penalaran didefinisikan di Coba sebelum pemakaian prosa pertama; Mulai tanpa kata definisi dan tanpa label turunan", () => {
    const mulai = sebelum(badan, '<Blok nama="Coba"');
    expect(mulai).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/);
    expect(mulai).not.toMatch(/Hitungan|Penalaran/);
    const def = badan.indexOf("- **Hitungan:** angka yang dihitung dari angka lain di halaman ini.");
    expect(def).toBeGreaterThan(badan.indexOf('<Blok nama="Coba"'));
    expect(badan.indexOf("- **Penalaran:** kesimpulan dari sumber atau angka di halaman, bukan hasil ukuran.")).toBeGreaterThan(def);
    const pakai = badan.search(/\((Hitungan|Penalaran)/);
    expect(pakai).toBeGreaterThan(def);
    expect(badan).toContain("Halaman ini tidak punya Rekaman lab, karena Tahap 6 tidak punya lab. Dua label turunan dipakai, dan masing-masing berdampingan dengan salah satu dari lima label sumber:");
    expect((badan.match(/Rekaman lab/g) ?? []).length).toBe(1);
    expect(badan).toContain("Kelima label sumber dijelaskan di [Label sumber](/cara-pakai/#label-sumber).");
    // pemakaian pertama Ilustrasi dan Asumsi cerita ada di catatan Mulai, bukan di dalam adegan
    const adegan = sebelum(mulai, "*Angka cerita:*");
    expect(adegan).not.toMatch(/Ilustrasi|Asumsi/);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, skenario, kartu, dan halaman istilah", () => {
    const tampil = halaman + JSON.stringify(skenario) + JSON.stringify(kartuSemua.filter((x) => x.halaman === "t6-m52"));
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/keputusan\s+\d{3,4}/i);
    expect(tampil).not.toMatch(/\bPR\s*#?\d{3}\b|#\d{3}\b/);
  });
  test("label: [perlu verifikasi] tiga kali, semuanya untuk bacaan isu GitHub", () => {
    const baris = badan.split("\n").filter((b) => b.includes("[perlu verifikasi]"));
    expect(baris).toHaveLength(3);
    for (const b of baris) expect(b).toMatch(/GitHub API|isu itu/);
  });
});

// --- lapis 2: kunci per baris, sidik kata penentu, struktur, angka, dan label
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling lama", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "terpenuhi", "terbukti", "memendek", "memendekkan", "menunggu", "dibaca", "diukur", "dijalankan", "ditolak", "ditunda", "di atas", "di bawah", "tepat", "ambang", "syarat", "pemicu", "hampir pasti", "cenderung", "bisa bermasalah", "menyesatkan", "otomatis", "mandiri", "spotify", "cncf", "backstage", "istio", "linkerd", "dora", "niemen", "harvey", "platform", "pipeline", "golden path", "service catalog", "service mesh", "tiket", "queue", "adopsi", "lead time", "template", "orang", "hari", "minggu"];
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
const prosa = badan.split("\n").filter((b) => b.trim() !== "");
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
const kartuT6m52 = kartuSemua.filter((x) => x.halaman === "t6-m52");
const rantaiBlok = ["Mulai", "Coba", "Paham", "Putuskan", "Kunci"].map((n) => {
  const a = badan.indexOf(`<Blok nama="${n}"`);
  const z = badan.indexOf("</Blok>", a);
  return badan.slice(a, z);
});
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/Penalaran/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-06/g) ?? []).length, tanggal: (halaman.match(/2026-\d\d-\d\d/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), skenario: sidikKata(nilaiString(skenario).join("\n"), KATA),
  blok: rantaiBlok.map((b) => sidikKata(b, KATA)),
  struktur: struktur.join(" "), awalan: h16(prosa.map((b) => b.trim().split(/\s+/).slice(0, 3).join(" ")).join("|")), angka: prosa.flatMap((b) => angkaDari(b)).join(" "),
  angkaSkenario: nilaiString(skenario).flatMap((b) => angkaDari(b)).join(" "),
  tabel: badan.split("\n").filter((b) => b.startsWith("|")).map(h16),
  riset: ["R6-120", "R6-121", "R6-122", "R6-123", "R6-124"].map((id) => h16(barisRiset(id))),
  berkas: { skenario: h16(JSON.stringify(skenario)), kartu: h16(JSON.stringify(kartuT6m52)), istilah: h16(JSON.stringify(istilahGolden)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { skenario: tekstual(skenario), kartu: tekstual(kartuT6m52) },
};

if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat m52-template-service.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "m52-template-service.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, skenario, dan kartu terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka skenario dan kartu sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, tabel, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
    expect(sidikSekarang.label.rekamanLab).toBe(1);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, tiap blok, dan skenario", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.blok).toEqual(SIDIK.blok);
    expect(sidikSekarang.skenario).toEqual(SIDIK.skenario);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa dan skenario, tabel per baris, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.awalan).toBe(SIDIK.awalan);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.angkaSkenario).toBe(SIDIK.angkaSkenario);
    expect(sidikSekarang.tabel).toEqual(SIDIK.tabel);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
