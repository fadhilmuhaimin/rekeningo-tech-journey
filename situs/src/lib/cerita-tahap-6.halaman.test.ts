// Penjaga angka dan klaim halaman Cerita Tahap 6 (`cerita/tahap-6.mdx`, keputusan 1762). Tahap 6 tanpa lab: tiap kalimat
// bersandar pada naskah `plan/CERITA-TAHAP-6.md` (Asumsi cerita, Asumsi produk), halaman Tahap 5 yang dirujuk, atau
// registry, dan semuanya diturunkan dari sumbernya di sini, bukan dari halaman yang dijaga. Tes tanpa sidik berdiri sendiri;
// `cerita-tahap-6.halaman.nilai.ts` menambah kunci baris untuk perubahan kata yang tak menggeser angka atau klaim.
import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BARIS_MDX } from "./cerita-tahap-6.halaman.nilai";
import { muat, urutanBaca, url as urlHalaman } from "../../tools/registri.mjs";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string) => fs.readFileSync(path.join(akar, rel), "utf8");
const MDX = baca("situs/src/content/docs/cerita/tahap-6.mdx");
const NASKAH = baca("plan/CERITA-TAHAP-6.md");
type H = { id: string; judul: string; tahap: unknown; path: string; ada?: boolean; masalah?: string; menit?: number; bagian?: unknown; diganti_oleh?: string };
const REG = JSON.parse(baca("situs/data/cerita.json")) as {
  tahap: { no: number; rekap: string; asumsi: Record<string, number | string> }[];
  proyeksi: { no: number; nama: string; user: string }[];
  halaman: H[];
};
const P = REG.proyeksi[0]!;
const halaman = (id: string) => REG.halaman.find((h) => h.id === id)!;

// Inventaris negasi halaman (awal kalimat, jumlah kata negasi). Tiap butir ada sumbernya: naskah bagian Latar dan 1 (tiga hal berubah,
// tokoh baru, Citra dan pihak yang mencoba, Bukan lingkup v6), halaman 5.29 (tiga hal belum diuji, kapasitas belum diukur), dan
// kalimat definisi label (Ilustrasi bukan hasil sistem). Menambah atau menghapus satu negasi mengubah daftar ini dan menggagalkan tes.
const NEGASI: (readonly [string, number])[] = [
  ["Tahap 6 adalah proyeksi tanpa lab, jadi tak satu", 2],
  ["Ilustrasi adalah contoh atau kejadian cerita, bu", 1],
  ["1. **Uang melewati mata uang.** Satu jurnal beri", 1],
  ["2. **Data punya alamat.** Data satu negara harus", 1],
  ["3. **Koordinasi menjadi beban utama.** 53 orang ", 1],
  ["Tahap 6 berangkat dari keadaan akhir Tahap 5, bu", 1],
  ["Menurut [[t5-m51]], tiga hal belum pernah diuji ", 1],
  ["Kapasitas satu primary, yaitu database yang mene", 1],
  ["| Pelaporan | 4 | Tanpa nama | laporan Keuangan ", 1],
  ["Yang tidak berubah:", 1],
  ["Tim Risiko menggantikan nama \"tim fraud dan comp", 1],
  ["Tim risk milik Ratih adalah tim bisnis yang mema", 1],
  ["Ia lima tahun membangun skor penipuan di sistem ", 1],
  ["Ia menganggap lebih banyak data selalu menaikkan", 1],
  ["Citra pindah ke negara kedua, dan pihak yang men", 1],
  ["Selisih pembulatan harus punya akun, dan tidak b", 2],
  ["| P0 | Tidak berhenti saat satu wilayah hilang |", 1],
  ["Bukan lingkup v6: negara keempat, kartu fisik, p", 1],
  ["PRD v6 tidak membawa klaim izin, lisensi, atau k", 1],
  ["Halaman Tahap 6 memberi tiap kejadian label Ilus", 2],
];

// ---- alat baca --------------------------------------------------------------------------------------------------------
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const KATA = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas", "dua belas"];
const titik = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (x: number, d = 1) => (Math.floor(x * 10 ** d + 0.5 + 1e-9) / 10 ** d).toFixed(d).replace(".", ",");
const bagian = (teks: string, judul: string) => {
  const m = new RegExp(`^## ${judul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m").exec(teks);
  expect(m, `bagian "${judul}" ada`).not.toBeNull();
  return m![1]!.trim();
};
const paragraf = (sec: string) => sec.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
const tabelDi = (teks: string, awalKepala: string) => {
  const baris = teks.split("\n");
  const i = baris.findIndex((b) => b.startsWith(awalKepala));
  expect(i, `tabel berkepala "${awalKepala}"`).toBeGreaterThanOrEqual(0);
  const sel = (b: string) => b.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const kepala = sel(baris[i]!);
  const isi: string[][] = [];
  for (let j = i + 2; j < baris.length && baris[j]!.startsWith("|"); j++) isi.push(sel(baris[j]!));
  for (const b of [baris[i + 1]!, ...isi.map((_, k) => baris[i + 2 + k]!)]) expect(sel(b).length, `jumlah kolom ${b.slice(0, 40)}`).toBe(kepala.length);
  return { kepala, isi };
};
const tanpaTanda = (s: string) => s.replace(/\*\*/g, "").replace(/`/g, "");

// ---- nilai turunan dari sumber ------------------------------------------------------------------------------------------
const TIM_NASKAH = tabelDi(NASKAH, "| Tim | Orang | Pemimpin | Memegang |");
const TIM_HAL = tabelDi(MDX, "| Tim | Orang | Pemimpin | Memegang |");
const ORANG = TIM_NASKAH.isi.map((r) => Number(r[1]));
const BARU = ORANG.reduce((a, b) => a + b, 0);
const N_TIM = TIM_NASKAH.isi.length;
const LAMA = Number(/(\d+) engineer dalam delapan tim/.exec(REG.tahap.find((t) => t.no === 5)!.rekap)![1]);
const USER = Number(/^(\d+) juta/.exec(P.user)![1]) * 1_000_000;
const USER_LAMA = Number(REG.tahap.find((t) => t.no === 5)!.asumsi.user);
const AKTIF = Number(/\((\d+)% aktif tiap hari, Asumsi\)/.exec(NASKAH)![1]);
const MINGGU = Number(/dan (\d+) minggu \(Asumsi cerita\)/.exec(NASKAH)![1]);
const PRODUK = ORANG.slice(0, 8);
const FUNGSI = ORANG.slice(8);
const jumlah = (a: number[]) => a.join(" + ");

describe("naskah dan registry: sumber nilai halaman", () => {
  test("naskah menulis 10.000.000 user terdaftar, 20% aktif, 24 minggu, 28 menjadi 53 orang, dan sebelas tim", () => {
    expect(USER).toBe(10_000_000);
    expect(/kini menargetkan tiga negara dengan ([\d.]+) user terdaftar/.exec(NASKAH)![1]).toBe(titik(USER));
    expect(AKTIF).toBe(20);
    expect(MINGGU).toBe(24);
    expect(NASKAH).toContain(`Tim naik dari ${LAMA} menjadi ${BARU} orang`);
    expect(LAMA).toBe(28);
    expect(BARU).toBe(53);
    expect(N_TIM).toBe(11);
    expect(NASKAH).toContain(`jumlah orang naik ${BARU} ÷ ${LAMA} = ${koma(BARU / LAMA)} kali`);
  });
  test("naskah: delapan tim produk dan tiga tim fungsi dijumlahkan seperti baris tabelnya", () => {
    expect(NASKAH).toContain(`Delapan tim produk berjumlah ${jumlah(PRODUK)} = ${PRODUK.reduce((a, b) => a + b, 0)} orang, dan tiga tim fungsi ${jumlah(FUNGSI)} = ${FUNGSI.reduce((a, b) => a + b, 0)} orang, jadi ${BARU}`);
    expect(NASKAH).toContain(`Rata-rata ${BARU} ÷ ${N_TIM} = ${koma(BARU / N_TIM)} orang per tim`);
    expect(NASKAH).toContain("Platform, SRE, dan Security");
  });
  test("registry: proyeksi Tahap 6 bernama Regional dengan 10 juta user dan 3 negara, tanpa asumsi, dan halaman Cerita T6 tertulis", () => {
    expect(P.no).toBe(6);
    expect(P.nama).toBe("Regional");
    expect(P.user).toBe("10 juta user, 3 negara");
    expect((P as Record<string, unknown>).asumsi).toBeUndefined();
    expect(halaman("T6")).toMatchObject({ judul: "Tahap 6 · Ceritanya", tahap: 6, path: "cerita/tahap-6.md", ada: true, diganti_oleh: "t6-prd" });
  });
});

describe("frontmatter, meta, dan Inti", () => {
  const fm = /^---\n([\s\S]*?)\n---/.exec(MDX)![1]!;
  test("title dari registry proyeksi dan description memuat tiga negara, 10 juta, 53 orang, sebelas tim, dan tanpa lab", () => {
    expect(/^title: "(.*)"$/m.exec(fm)![1]).toBe(`Tahap ${P.no} · ${P.nama}`);
    const d = /^description: (.*)$/m.exec(fm)![1]!;
    expect(d).toBe(`Rekeningo untuk ${KATA[3]} negara dan ${USER / 1_000_000} juta user, dikerjakan ${BARU} orang dalam ${KATA[N_TIM]} tim. Halaman ini memuat tim, tokoh baru, dan isi PRD v6. Tahap 6 tidak punya lab.`);
  });
  test("meta: Baca N menit sama dengan registry dan sesuai jumlah kata (200 sampai 260 kata per menit), jenis halaman tahap, proyeksi tanpa lab", () => {
    const m = /^<p class="meta">Baca (\d+) menit · Halaman tahap · Proyeksi tanpa lab<\/p>$/m.exec(MDX);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBe(halaman("T6").menit);
    const kata = (MDX.replace(/^---[\s\S]*?\n---/, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/<[^>]+>/g, "").match(/\S+/g) ?? []).length;
    expect(kata / Number(m![1])).toBeGreaterThan(200);
    expect(kata / Number(m![1])).toBeLessThan(260);
  });
  const inti = paragraf(bagian(MDX, "Inti"));
  const MAKS = Number(/^MAKS_INTI = (\d+)/m.exec(baca("tools/sinkron_cerita.py"))![1]);
  test("Inti: paragraf pertama muat layar pertama (batas sinkron_cerita), menyebut empat batas dan proyeksi tanpa lab", () => {
    expect(inti).toHaveLength(3);
    expect(inti[0]!.length).toBeLessThanOrEqual(MAKS);
    expect(inti[0]).toBe("Rekeningo melewati batas mata uang, negara, wilayah, dan tim. Tahap 6 adalah proyeksi tanpa lab, jadi tak satu pun angka di halaman ini direkam.");
  });
  test("Inti: arti wilayah dan negara sama dengan naskah, dan satu arti per kata (wilayah berarti region di seluruh halaman)", () => {
    const naskah = NASKAH.replace(/"/g, "");
    const arti = "Wilayah berarti region, yaitu satu lokasi geografis dengan pusat data. Negara berarti satu pasar dengan satu mata uang.";
    expect(naskah).toContain(arti);
    expect(inti[2]).toBe(arti);
    expect(MDX.split("Wilayah berarti").length - 1).toBe(1);
    expect(MDX.split("Negara berarti").length - 1).toBe(1);
  });
  test("figur Inti: enam tahap dengan nama dan urutan sama dengan figur halaman Cerita, hanya Regional bertanda baru, dan nomor 6 sama dengan proyeksi", () => {
    const f = /<figure[\s\S]*?<\/figure>/.exec(inti[1]!)![0]!;
    const butir = [...f.matchAll(/<li class="(is-old|is-new)">([^<]+)<\/li>/g)].map((m) => [m[1], m[2]]);
    const indeks = baca("situs/src/content/docs/cerita/index.mdx");
    const nama = [...indeks.matchAll(/<li class="is-(?:old|new)">([^<]+)<\/li>/g)].map((m) => m[1]);
    expect(nama).toHaveLength(6);
    expect(butir.map((b) => b[1])).toEqual(nama);
    expect(nama[5]).toBe(P.nama);
    expect(butir.filter((b) => b[0] === "is-new")).toEqual([["is-new", P.nama]]);
    expect(f).toContain(`role="img" aria-label="Enam tahap cerita: 1 satu gedung, 2 seluruh kampus, 3 enam kota, 4 dibuka ke publik, 5 nasional, ${P.no} regional (proyeksi). Kamu di tahap ${P.no}."`);
    expect(indeks).toContain(`${P.no} regional (proyeksi)`);
    expect(f).toContain(`<figcaption>Enam tahap. Kamu di Tahap ${P.no} (biru), yang masih proyeksi.</figcaption>`);
    expect(inti[0]).not.toContain("<figure");
  });
  test("klaim 'tak satu pun angka direkam' berlingkup halaman ini: tanpa Rekaman lab, tanpa jalur labs/, tanpa widget atau import", () => {
    expect(MDX).not.toMatch(/rekaman lab/i);
    expect(MDX).not.toContain("labs/");
    expect(MDX).not.toMatch(/^import /m);
    expect(MDX).not.toMatch(/<(Snippet|Blok|Rantai|Tebak|Widget\w*|Kalkulator)\b/);
  });
});

describe("Ceritanya: angka dari naskah dan hitungan yang bisa diulang", () => {
  const sec = paragraf(bagian(MDX, "Ceritanya"));
  const MINGGU_5 = /Minggu (\d+) Tahap 5\. Uji coba nasional lolos/.exec(baca("situs/src/content/docs/tahap-5/jembatan-prd-v6.mdx"))![1];
  test("paragraf 1: minggu 16 dari 5.32 (Ilustrasi), uji coba nasional lolos di 5.29, PRD v6 untuk 10 juta user dari 5.32", () => {
    expect(MINGGU_5).toBe("16");
    expect(baca("situs/src/content/docs/tahap-5/m51-prd-v6.mdx")).toContain(`Minggu ${MINGGU_5} Tahap 5. Uji coba nasional`);
    expect(baca("situs/src/content/docs/tahap-5/m51-prd-v6.mdx")).toContain(`minggu ${MINGGU_5}, 1.000.000 user terdaftar`);
    expect(sec[0]).toBe(`Minggu ${MINGGU_5} Tahap 5 (Ilustrasi). Uji coba nasional lolos ([[t5-m51]]). Sinta lalu membagikan PRD v6 untuk ${USER / 1_000_000} juta user ([[t5-jembatan]]).`);
  });
  test("paragraf 2: user, aktif, minggu, orang, dan dua hitungan (10 kali, 1,9 kali) diulang dari naskah dan registry Tahap 5", () => {
    const aktif = (USER * AKTIF) / 100;
    expect(USER / USER_LAMA).toBe(10);
    expect(NASKAH).toContain("Jumlah user naik 10 kali");
    expect(sec[1]).toBe(
      `PT Rekeningo (fiktif) kini menargetkan tiga negara dengan ${titik(USER)} user terdaftar. Yang aktif tiap hari ${AKTIF}%, yaitu ${titik(aktif)} user (Asumsi). ` +
        `Pekerjaannya ${MINGGU} minggu, dan tim naik dari ${LAMA} menjadi ${BARU} orang (Asumsi cerita). ` +
        `User naik ${USER / USER_LAMA} kali, dan orang naik ${BARU} ÷ ${LAMA} = ${koma(BARU / LAMA)} kali (Hitungan atas Asumsi cerita).`,
    );
    expect(aktif).toBe(2_000_000);
  });
  test("paragraf 3: arti Ilustrasi, Asumsi cerita, Hitungan sebelum pemakaian label sesudahnya, dan tautan ke Label sumber yang ada", () => {
    expect(sec[2]).toBe(
      "Ilustrasi adalah contoh atau kejadian cerita, bukan hasil sistem. Asumsi cerita adalah Asumsi yang berupa angka cerita, seperti jumlah orang dan minggu. " +
        "Hitungan adalah rumus yang ditulis di halaman, dan ia memakai label masukan terlemahnya. Arti semua label ada di [Label sumber](/cara-pakai/#label-sumber).",
    );
    const cara = baca("situs/src/content/docs/cara-pakai.mdx");
    expect(cara).toMatch(/^## Label sumber$/m);
    expect(cara).toMatch(/^- \*\*Ilustrasi\*\*:/m);
    expect(cara).toMatch(/^- \*\*Asumsi\*\*:/m);
    // Hitungan dan label turunan lain dijelaskan di prd-v5 dengan arti yang sama (5.1): satu arti per label.
    expect(baca("situs/src/content/docs/tahap-5/prd-v5.mdx")).toContain("Hitungan adalah rumus yang ditulis di halaman, dan ia memakai label masukan terlemahnya.");
    expect(baca("situs/src/content/docs/tahap-5/prd-v5.mdx")).toContain("Asumsi produk adalah Asumsi yang berupa pilihan produk.");
    // Label pertama dipakai sebelum artinya hanya "Ilustrasi" di paragraf 1 dan "Asumsi" di paragraf 2; arti keduanya di paragraf 3 dan cara-pakai.
    expect(MDX.indexOf("Ilustrasi adalah")).toBeGreaterThan(MDX.indexOf("(Ilustrasi)"));
  });
  test("tiga hal berubah: ledger 2.7 menulis posting berjumlah nol, enam service dari Tahap 5, dan Asumsi produk di butir data", () => {
    expect(baca("situs/src/content/docs/tahap-2/ledger.mdx")).toContain("jurnal yang posting-nya berjumlah nol");
    expect(halaman("t2-ledger").path).toBe("tahap-2/ledger.md");
    expect(/^description: (.*)$/m.exec(baca("situs/src/content/docs/tahap-5/modul-ke-service.mdx"))![1]).toContain("memecah enam modul menjadi enam service di Kubernetes");
    expect(NASKAH).toContain("data satu negara harus tinggal di tempat tertentu (Asumsi produk)");
    expect(NASKAH).toContain("transfer antar negara membutuhkan kurs");
    expect(NASKAH).toContain("dan tidak ada orang yang memahami semuanya");
    const daftar = sec.filter((p) => /^\d\. /m.test(p))[0]!.split("\n");
    expect(daftar).toHaveLength(3);
    expect(daftar[0]).toBe("1. **Uang melewati mata uang.** Satu jurnal berisi posting yang berjumlah nol ([[t2-ledger]]), padahal transfer antar negara membutuhkan kurs dan dua mata uang tidak bisa dijumlahkan langsung.");
    expect(daftar[1]).toBe("2. **Data punya alamat.** Data satu negara harus tinggal di tempat tertentu (Asumsi produk), jadi satu database untuk semua negara tidak lagi menjadi pilihan.");
    expect(daftar[2]).toBe(`3. **Koordinasi menjadi beban utama.** ${BARU} orang dalam ${N_TIM} tim merilis ke enam service Tahap 5 dan service baru, dan tidak ada orang yang memahami semuanya (Ilustrasi).`);
    expect(sec.filter((p) => p === "Tiga hal berubah sekaligus.")).toHaveLength(1);
    expect(NASKAH).toContain("Tiga hal berubah sekaligus");
    expect(sec).toContain("Asumsi produk adalah Asumsi yang berupa pilihan produk, seperti aturan tempat data tinggal.");
  });
  test("titik awal: tiga hal belum diuji dan kapasitas primary belum diukur dibaca ke halaman 5.29, bukan ke naskah", () => {
    const m51 = baca("situs/src/content/docs/tahap-5/m51-prd-v6.mdx");
    const t = tabelDi(m51.slice(m51.indexOf("**Tiga hal yang belum pernah diuji.**")), "| Hal ");
    expect(t.isi).toHaveLength(3);
    expect(t.isi.map((r) => r[0])).toEqual(["Skor risiko real-time dalam 50 ms (Asumsi naskah)", "Data di dua wilayah", "28 orang menjadi lebih dari 50"]);
    expect(m51).toContain("kapasitas satu primary belum pernah diukur dan tiga hal yang diminta PRD v6 belum pernah diuji");
    expect(m51).toContain("28 orang dalam delapan tim (Asumsi cerita)");
    expect(halaman("t5-m51").path).toBe("tahap-5/m51-prd-v6.md");
    expect(sec.at(-1)).toBe(
      `Tahap 6 berangkat dari keadaan akhir Tahap 5, bukan dari sistem yang sudah dibereskan. Menurut [[t5-m51]], ${KATA[t.isi.length]} hal belum pernah diuji di Tahap 5. ` +
        `Ketiganya adalah skor risiko dalam 50 ms antar host (Asumsi), data di dua wilayah, dan ${LAMA} orang menjadi lebih dari 50 (Asumsi cerita). ` +
        "Kapasitas satu primary, yaitu database yang menerima semua tulis, juga belum pernah diukur.",
    );
  });
});

describe("Sebelas tim: tabel sama dengan naskah, jumlah dan rata-rata dihitung ulang", () => {
  test("tabel: sebelas baris, sel sama dengan naskah (nama, orang, pemimpin, memegang), kecuali dua penyesuaian tertulis", () => {
    expect(TIM_HAL.isi).toHaveLength(N_TIM);
    expect(TIM_HAL.kepala).toEqual(TIM_NASKAH.kepala);
    TIM_NASKAH.isi.forEach((r, i) => {
      const h = TIM_HAL.isi[i]!;
      expect(h[0]).toBe(r[0]);
      expect(h[1]).toBe(r[1]);
      // Pemimpin: "Maya (tidak muncul di adegan)" ditulis "Maya", dan pemimpin yang tak bernama di naskah ditulis "Tanpa nama".
      const pemimpin = r[2]!.replace(/\s*\(tidak muncul di adegan\)/, "");
      expect(h[2]).toBe(pemimpin === "" ? "Tanpa nama" : pemimpin);
      expect(h[3]).toBe(r[3]);
    });
    expect(TIM_NASKAH.isi.filter((r) => r[2]!.includes("tidak muncul di adegan")).map((r) => r[0])).toEqual(["Notifikasi", "Pelaporan"]);
    expect(TIM_NASKAH.isi.find((r) => r[0] === "Pelaporan")![2]).toBe("(tidak muncul di adegan)");
  });
  test("kalimat pengantar: jumlah orang tiap tim berlabel Asumsi cerita, dan jumlah sebelas tim sama dengan baris tabel", () => {
    const sec = paragraf(bagian(MDX, "Sebelas tim"));
    expect(sec[0]).toBe(`${KATA[N_TIM]![0]!.toUpperCase()}${KATA[N_TIM]!.slice(1)} tim memegang bagian yang berbeda, dan jumlah orang tiap tim adalah Asumsi cerita:`);
    expect(bagian(MDX, "Sebelas tim").includes(`Sebelas tim`)).toBe(true);
  });
  test("jumlah: 38 produk, 15 fungsi, 53 total, rata-rata 4,8 (setengah ke atas), dan tim fungsi adalah tiga baris terakhir tabel", () => {
    const sec = paragraf(bagian(MDX, "Sebelas tim"));
    const fungsi = TIM_HAL.isi.slice(8).map((r) => r[0]!);
    expect(fungsi).toEqual(["Platform", "SRE", "Security"]);
    const nama = `${fungsi.slice(0, -1).join(", ")}, dan ${fungsi.at(-1)}`;
    const s = sec.find((p) => p.startsWith("Delapan tim produk"))!;
    expect(s).toBe(
      `Delapan tim produk berjumlah ${jumlah(PRODUK)} = ${PRODUK.reduce((a, b) => a + b, 0)} orang. Tiga tim fungsi (${nama}) berjumlah ${jumlah(FUNGSI)} = ${FUNGSI.reduce((a, b) => a + b, 0)} orang. ` +
        `Totalnya ${BARU} orang, dan rata-ratanya ${BARU} ÷ ${N_TIM} = ${koma(BARU / N_TIM)} orang per tim (Hitungan atas Asumsi cerita).`,
    );
    expect(PRODUK.reduce((a, b) => a + b, 0) + FUNGSI.reduce((a, b) => a + b, 0)).toBe(BARU);
    expect(koma(53 / 11)).toBe("4,8");
  });
  test("yang tidak berubah dan tim Risiko: ledger 2.7, nama lama dari 5.32, tim risk milik Ratih adalah tim bisnis", () => {
    const sec = paragraf(bagian(MDX, "Sebelas tim"));
    expect(sec).toContain("Yang tidak berubah: Go di backend, Dart di app, PostgreSQL sebagai source of truth, dan ledger dari [[t2-ledger]].");
    expect(NASKAH).toContain("Yang tidak berubah: satu bahasa (Go di backend, Dart di app), PostgreSQL sebagai source of truth, dan ledger dari Tahap 2");
    expect(baca("situs/src/content/docs/tahap-5/jembatan-prd-v6.mdx")).toContain("tim fraud dan compliance engineering");
    expect(NASKAH).toContain("Tim Risiko adalah \"tim fraud dan compliance engineering\" di PROPOSAL dan pratinjau 5.32");
    expect(NASKAH).toContain("Tim risk milik Ratih adalah tim bisnis yang memakai back office, bukan tim engineering ini.");
    expect(sec).toContain("Tim Risiko menggantikan nama \"tim fraud dan compliance engineering\" di [[t5-jembatan]], karena Tahap 6 tidak membawa klaim kepatuhan. Tim risk milik Ratih adalah tim bisnis yang memakai back office, bukan tim engineering ini.");
  });
});

describe("Tokoh baru dan tokoh lama", () => {
  const sec = bagian(MDX, "Tokoh baru");
  const TOKOH = tabelDi(NASKAH, "| Tokoh | Siapa | Ingin | Kelemahan |");
  test("naskah punya tepat dua tokoh baru (Kirana, Arga) dan halaman memuat keduanya berurutan, dengan frasa dari kolom naskahnya", () => {
    expect(TOKOH.isi.map((r) => tanpaTanda(r[0]!))).toEqual(["Kirana", "Arga"]);
    const butir = sec.split("\n").filter((b) => b.startsWith("- **"));
    expect(butir).toHaveLength(2);
    expect(sec.split("\n\n")[0]).toBe(`Tahap 6 punya ${KATA[TOKOH.isi.length]} tokoh baru:`);
    const FRASA = [
      ["engineer risiko yang memimpin tim risiko", "lima tahun membangun skor penipuan di sistem lain", "belum pernah memikirkan di mana data boleh tinggal",
        "skor yang menangkap penipuan sebelum uang berpindah", "lebih banyak data selalu menaikkan ketepatan skor, termasuk data yang tidak boleh keluar dari satu wilayah"],
      ["engineer yang memimpin tim wilayah", "pernah memasang integrasi bank di dua negara", "setiap negara terasa seperti satu produk lokal",
        "aturan per negara cukup ditulis sebagai percabangan di kode"],
    ];
    const kecil = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);
    TOKOH.isi.forEach((r, i) => {
      const nama = tanpaTanda(r[0]!);
      // Butir halaman = kolom naskah (Siapa, Ingin, Kelemahan) disambung dengan "Ia": tiap kalimat, kata, dan negasi dari naskah.
      const [s1, s2] = r[1]!.split(/(?<=\.) /).map((x) => x.replace(/\.$/, ""));
      expect(butir[i]).toBe(`- **${nama}** adalah ${kecil(s1!)}. Ia ${kecil(s2!).replace(", belum", ", dan belum")}. Ia ingin ${kecil(r[2]!.replace(/\.$/, ""))}. Ia ${kecil(r[3]!.replace(/\.$/, ""))}.`);
      expect(norm(butir[i]!).startsWith(`- **${nama.toLowerCase()}** adalah`)).toBe(true);
      for (const f of FRASA[i]!) {
        expect(norm(r.join(" ")), `naskah ${nama}: ${f}`).toContain(f);
        expect(norm(butir[i]!), `halaman ${nama}: ${f}`).toContain(f);
      }
    });
  });
  test("tokoh lama: tiap 'X memimpin Y' sama dengan baris tabel tim, dan Maya, Kirana, Arga tidak disebut ulang di sana", () => {
    const k = bagian(MDX, "Tokoh baru").split("\n\n").find((p) => p.startsWith("Tokoh lama tetap ada"))!;
    const awalLama = NASKAH.indexOf("Tokoh lama tetap:");
    const urutan = (n: string) => NASKAH.indexOf(`- **${n}**`, awalLama);
    const pemimpinLama = TIM_HAL.isi.filter((r) => !["Maya", "Kirana", "Arga", "Tanpa nama"].includes(r[2]!)).map((r) => ({ lead: r[2]!, tim: r[0]! })).sort((a, b) => urutan(a.lead) - urutan(b.lead));
    const kalimat = pemimpinLama.map((x) => `${x.lead} memimpin ${x.tim}`);
    const harus = `${kalimat.slice(0, -1).join(", ")}, dan ${kalimat.at(-1)}.`;
    expect(pemimpinLama.every((x) => urutan(x.lead) > awalLama)).toBe(true);
    expect(k.split(". ")[0] + ".").toBe("Tokoh lama tetap ada, dengan kelemahan yang sama.");
    expect(k).toBe(`Tokoh lama tetap ada, dengan kelemahan yang sama. ${harus} Nadia masih cenderung mengusulkan solusi yang terlalu berat, kali ini dua wilayah yang melayani data yang sama (aktif-aktif).`);
    const pasang = [...k.matchAll(/(\w+) memimpin ([A-Z][\w ]+?)(?:,| dan (?=\w+ memimpin)|\.)/g)].map((m) => [m[1], m[2]]);
    const lama = TIM_HAL.isi.filter((r) => !["Maya", "Kirana", "Arga", "Tanpa nama"].includes(r[2]!)).map((r) => [r[2], r[0]]);
    expect(pasang.map((p) => p.join("|")).sort()).toEqual(lama.map((p) => p.join("|")).sort());
    expect(pasang).toHaveLength(7);
    expect(k).toContain("Nadia masih cenderung mengusulkan solusi yang terlalu berat, kali ini dua wilayah yang melayani data yang sama (aktif-aktif).");
    expect(NASKAH).toContain("kali ini aktif-aktif untuk semua hal");
  });
  test("Citra pindah ke negara kedua dan syarat Pak Hadi sama dengan kutipan naskah", () => {
    const naskah = /\*"(Saya menandatangani laporan per mata uang\.[^"]*)"\*/.exec(NASKAH)![1]!;
    expect(naskah).toBe("Saya menandatangani laporan per mata uang. Selisih pembulatan harus punya akun, dan tidak boleh ada saldo yang berubah tanpa kejadian.");
    expect(sec.split("\n\n").at(-1)).toBe(`Citra pindah ke negara kedua, dan pihak yang mencoba tetap tidak dikenal. Pak Hadi menambah satu syarat: "${naskah}"`);
    expect(NASKAH).toContain("Citra pindah ke negara kedua");
    expect(NASKAH).toContain("**Pihak yang mencoba** tetap tidak dikenal");
  });
});

describe("Yang diminta PRD v6: baris dan label sama dengan naskah bagian 1", () => {
  const PRD_N = tabelDi(NASKAH, "| Prioritas | Fitur | Keterangan |");
  const PRD_H = tabelDi(MDX, "| Prioritas | Isi | Keterangan |");
  const label = (s: string) => [...s.matchAll(/\((Asumsi(?: produk| cerita| naskah)?|Ilustrasi)\b/g)].map((m) => m[1]!.replace(" naskah", ""));
  test("delapan baris: prioritas dan nama sama dengan naskah, dua P1 dan enam P0 tanpa P2", () => {
    expect(PRD_H.isi).toHaveLength(PRD_N.isi.length);
    expect(PRD_N.isi).toHaveLength(8);
    PRD_N.isi.forEach((r, i) => {
      expect(PRD_H.isi[i]![0]).toBe(r[0]);
      expect(PRD_H.isi[i]![1]).toBe(r[1]);
    });
    expect(PRD_H.isi.filter((r) => r[0] === "P0")).toHaveLength(6);
    expect(PRD_H.isi.filter((r) => r[0] === "P1")).toHaveLength(2);
    expect(PRD_H.isi.some((r) => r[0] === "P2")).toBe(false);
  });
  test("angka dan label tiap baris: yang ada di keterangan naskah (user per negara, RPO, RTO, 50 ms, 11 tim) ada di halaman dengan label yang sama", () => {
    const naskahBaris = (nama: string) => PRD_N.isi.find((r) => r[1] === nama)![2]!;
    const halBaris = (nama: string) => PRD_H.isi.find((r) => r[1] === nama)![2]!;
    const draf = /Pembagian user (\d+)%, (\d+)%, (\d+)%\.\*\* Dari ([\d.]+) user terdaftar: ([\d.]+), ([\d.]+), dan ([\d.]+)/.exec(NASKAH)!;
    const persen = [draf[1], draf[2], draf[3]].map(Number);
    expect(persen.reduce((a, b) => a + b, 0)).toBe(100);
    expect(draf[4]).toBe(titik(USER));
    const split = persen.map((p) => titik((USER * p) / 100));
    expect([draf[5], draf[6], draf[7]]).toEqual(split);
    expect(naskahBaris("Tiga negara")).toContain(`${split[0]}, ${split[1]}, dan ${split[2]} user`);
    expect(halBaris("Tiga negara")).toContain(`${split[0]}, ${split[1]}, dan ${split[2]} user terdaftar (Asumsi cerita)`);
    expect(split.map((s) => Number(s.replace(/\./g, ""))).reduce((a, b) => a + b, 0)).toBe(USER);
    expect(naskahBaris("Tidak berhenti saat satu wilayah hilang")).toContain("RPO nol untuk uang dan RTO wilayah 30 menit (Asumsi produk). RTO 15 menit untuk satu mesin tetap");
    expect(halBaris("Tidak berhenti saat satu wilayah hilang")).toContain("RPO nol, RTO satu wilayah 30 menit, dan RTO satu mesin tetap 15 menit (Asumsi produk)");
    expect(naskahBaris("Skor risiko real-time")).toContain("skor dalam 50 ms (Asumsi naskah dari M51)");
    expect(halBaris("Skor risiko real-time")).toContain("skor dalam 50 ms (Asumsi)");
    expect(naskahBaris("Data per negara")).toContain("(Asumsi produk, tanpa klaim hukum)");
    expect(halBaris("Data per negara")).toContain("(Asumsi produk)");
    expect(naskahBaris("Platform internal")).toContain("untuk 11 tim");
    expect(halBaris("Platform internal")).toContain(`untuk ${N_TIM} tim`);
    // Baris naskah berlabel -> baris halaman memuat label yang sama (Asumsi naskah dibaca Asumsi).
    for (const r of PRD_N.isi) {
      const h = PRD_H.isi.find((x) => x[1] === r[1])![2]!;
      for (const l of new Set(label(r[2]!))) expect(label(h), `${r[1]}: ${l}`).toContain(l);
    }
    // Rujukan 5.32: kepala PRD v6 di halaman itu memakai arti yang sama untuk tiga istilah yang diberi kurung di sini.
    const j = baca("situs/src/content/docs/tahap-5/jembatan-prd-v6.mdx");
    expect(j).toContain("golden path (jalur bawaan untuk service baru), service catalog (daftar pemilik service)");
    expect(j).toContain("chaos testing (percobaan gangguan)");
    expect(halBaris("Platform internal")).toContain("Golden path (jalur bawaan untuk service baru), service catalog (daftar pemilik service)");
    expect(halBaris("Perubahan aman di skala")).toContain("chaos testing (percobaan gangguan)");
    expect(halBaris("Data antar domain")).toContain("data mesh sederhana");
  });
  test("frasa pembawa arti di keterangan tiap baris: ada di sumbernya (baris naskah, naskah, atau 5.32) dan di baris halaman, supaya arti yang berubah tanpa menggeser angka atau label tertangkap tanpa sidik", () => {
    // Tinjauan (keputusan 1763): 13 dari 70 mutan teks bebas di tabel ini lolos tes tanpa sidik (aktif-pasif jadi aktif-aktif, satu
    // mata uang jadi dua, top-up bank lokal jadi kartu, dua jurnal jadi satu, satu wilayah melayani jadi semua wilayah). Frasa di
    // bawah dibaca dari sumbernya, bukan dari halaman; kata di halaman boleh berbeda dari naskah hanya bila pasangannya tertulis.
    const j = baca("situs/src/content/docs/tahap-5/jembatan-prd-v6.mdx").toLowerCase();
    const naskahBaris = (nama: string) => PRD_N.isi.find((r) => r[1] === nama)![2]!.toLowerCase();
    const halBaris = (nama: string) => PRD_H.isi.find((r) => r[1] === nama)![2]!.toLowerCase();
    const PASANGAN: [string, "baris" | "naskah" | "5.32", string, string][] = [
      ["Tiga negara", "baris", "satu app", "satu app"],
      ["Tiga negara", "baris", "satu mata uang per negara", "satu mata uang tiap negara"],
      ["Tiga negara", "baris", "top-up lewat integrasi bank lokal", "top-up lewat integrasi bank lokal"],
      ["Multi-mata uang dengan kurs", "baris", "transfer antar negara memakai kurs yang disimpan", "transfer antar negara memakai kurs yang disimpan"],
      ["Multi-mata uang dengan kurs", "baris", "tukar adalah dua jurnal yang terhubung", "tukar adalah dua jurnal yang terhubung"],
      ["Multi-mata uang dengan kurs", "naskah", "selisih pembulatan harus punya akun", "selisih pembulatan punya akun sendiri"],
      ["Data per negara", "baris", "data identitas dan saldo satu negara", "data identitas dan saldo satu negara"],
      ["Data per negara", "baris", "wilayah negara itu", "wilayah negara itu"],
      ["Data per negara", "baris", "pasangan yang diizinkan", "wilayah pasangannya yang diizinkan"],
      ["Data per negara", "baris", "database dipisah per negara", "database dipisah per negara"],
      ["Data per negara", "5.32", "wilayah lain menunggu sampai failover", "wilayah lain yang menunggu sampai failover"],
      ["Tidak berhenti saat satu wilayah hilang", "baris", "multi-region aktif-pasif untuk ledger", "ledger memakai multi-region aktif-pasif"],
      ["Tidak berhenti saat satu wilayah hilang", "5.32", "satu wilayah pusat data melayani", "satu wilayah melayani"],
      ["Tidak berhenti saat satu wilayah hilang", "baris", "rpo nol", "rpo nol"],
      ["Tidak berhenti saat satu wilayah hilang", "baris", "rto wilayah 30 menit", "rto satu wilayah 30 menit"],
      ["Tidak berhenti saat satu wilayah hilang", "baris", "rto 15 menit untuk satu mesin tetap", "rto satu mesin tetap 15 menit"],
      ["Skor risiko real-time", "baris", "tiap pembayaran dan transfer mendapat skor", "tiap pembayaran dan transfer mendapat skor"],
      ["Skor risiko real-time", "baris", "graf akun-perangkat dibangun tim risiko", "tim risiko membangun graf akun-perangkat"],
      ["Platform internal", "baris", "label biaya per tim", "label biaya per tim"],
      ["Perubahan aman di skala", "baris", "rilis bertahap berbasis slo dengan rollback otomatis", "rilis bertahap berbasis slo dengan rollback otomatis"],
      ["Perubahan aman di skala", "baris", "berskala kecil", "berskala kecil"],
      ["Data antar domain", "baris", "disediakan sebagai produk dengan pemilik", "disediakan sebagai produk dengan pemilik"],
    ];
    for (const [nama, dari, s, h] of PASANGAN) {
      const sumber = dari === "baris" ? naskahBaris(nama) : dari === "naskah" ? NASKAH.toLowerCase() : j;
      expect(sumber, `${dari}: ${s}`).toContain(s);
      expect(halBaris(nama), `${nama}: ${h}`).toContain(h);
    }
    // Keterangan graf: arti buatan halaman, jadi hanya kata istilahnya yang dijaga (akun dan perangkat ada di artinya).
    const arti = /graf akun-perangkat, yaitu ([^|]*)$/.exec(halBaris("Skor risiko real-time"))![1]!;
    for (const k of "akun-perangkat".split("-")) expect(arti, k).toContain(k);
    // "aktif-aktif" hanya dua kali di halaman: kelemahan Nadia (tokoh) dan "Bukan lingkup v6". Baris P0 menulis aktif-pasif.
    const badan = MDX.replace(/\{\/\* daftar-tahap \*\/\}[\s\S]*\{\/\* \/daftar-tahap \*\/\}/, "");
    expect(badan.split("aktif-aktif").length - 1).toBe(2);
    expect(badan.split("aktif-pasif").length - 1).toBe(1);
  });
  test("tabel diawali kalimat yang memberi label Ilustrasi, dan 'Bukan lingkup v6' sama dengan daftar naskah tanpa klaim izin", () => {
    const sec = paragraf(bagian(MDX, "Yang diminta PRD v6"));
    expect(sec[0]).toBe("Isi PRD v6 adalah rencana cerita (Ilustrasi), dan [[t6-prd]] memuat dokumen lengkapnya. Ringkasannya:");
    expect(baca("situs/src/content/docs/tahap-5/jembatan-prd-v6.mdx")).toContain("Isi PRD v6 adalah rencana cerita (Ilustrasi)");
    const n = /\*\*Bukan lingkup v6\.\*\* ([^.]*)\./.exec(NASKAH)![1]!;
    expect(n).toBe("Negara keempat, kartu fisik, pinjaman atau bunga, dan pindah ke aktif-aktif");
    expect(sec.at(-1)).toBe(`Bukan lingkup v6: ${n.charAt(0).toLowerCase()}${n.slice(1)}. PRD v6 tidak membawa klaim izin, lisensi, atau kepatuhan regulasi di negara mana pun, dan aturan per negara adalah Asumsi produk.`);
    expect(NASKAH).toContain("PRD ini tidak membawa klaim izin, lisensi, atau kepatuhan regulasi di negara mana pun");
  });
});

describe("Masalah yang muncul: tabel dari registry (sinkron_cerita) dan label tahap tanpa lab", () => {
  const sec = bagian(MDX, "Masalah yang muncul");
  const t6 = REG.halaman.filter((h) => h.tahap === 6 && !/^T\d$/.test(h.id) && h.masalah);
  const nomor = (h: H) => `6.${REG.halaman.filter((x) => x.tahap === 6 && !/^T\d$/.test(x.id)).indexOf(h) + 1}`;
  test("dua belas baris dalam urutan registry, tiap baris memuat masalah dan nomor, judul, serta segera atau tautan sesuai `ada`", () => {
    const harus = t6.map((h) => {
      const nama = `${nomor(h)} ${h.judul}`;
      return `| ${h.masalah} | ${h.ada ? `[${nama}](/${h.path.slice(0, -3)}/)` : `${nama} · *segera*`} |`;
    });
    expect(harus).toHaveLength(12);
    const m = /\{\/\* daftar-tahap \*\/\}\n([\s\S]*?)\n\{\/\* \/daftar-tahap \*\/\}/.exec(sec)!;
    expect(m[1]!.split("\n")).toEqual(["| Masalah | Halaman |", "|---|---|", ...harus]);
  });
  test("kalimat pembuka: label Tahap 6 mengikuti naskah (tiap kejadian Ilustrasi, Asumsi, atau Tidak dijalankan karena tanpa lab)", () => {
    expect(paragraf(sec)[0]).toBe("Halaman Tahap 6 memberi tiap kejadian label Ilustrasi, Asumsi, atau Tidak dijalankan, karena tahap ini tidak punya lab.");
    expect(NASKAH).toContain("setiap kalimat tentang perilaku sistem memakai satu dari lima label di `/cara-pakai/`: Asumsi, Ilustrasi, Tidak dijalankan, [perlu verifikasi], dan Rekaman lab");
    expect(NASKAH).toContain("Tahap 6 tanpa lab");
  });
});

describe("rujukan, kata, dan label di seluruh halaman", () => {
  const TOKEN = [...MDX.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!);
  test("rujukan [[ID]] dipakai persis di tempat yang dijanjikan dan menunjuk halaman yang benar", () => {
    expect(TOKEN).toEqual(["t5-m51", "t5-jembatan", "t2-ledger", "t5-m51", "t2-ledger", "t5-jembatan", "t6-prd"]);
    expect(halaman("t5-jembatan").path).toBe("tahap-5/jembatan-prd-v6.md");
    expect(halaman("t6-prd")).toMatchObject({ path: "tahap-6/prd-v6.md", tahap: 6 });
    for (const id of TOKEN) expect(REG.halaman.some((h) => h.id === id), id).toBe(true);
    expect(MDX).not.toMatch(/\bdi atas\b|\bdi bawah\b/);
  });
  test("satu kata per konsep: tanpa token, router, client, log, nonce, replika, layanan, pengguna, kita, Anda (artinya ganda di Tahap 3 sampai 5)", () => {
    const badan = MDX.replace(/\{\/\* daftar-tahap \*\/\}[\s\S]*\{\/\* \/daftar-tahap \*\/\}/, "");
    for (const k of ["token", "router", "client", "log", "nonce", "replika", "layanan", "pengguna", "kita", "Anda"]) expect(badan, k).not.toMatch(new RegExp(`\\b${k}\\b`, "i"));
    expect(NASKAH).toContain("Kata \"token\", \"router\", \"client\", \"log\", dan \"nonce\" tidak dipakai di naskah ini");
    expect((badan.match(/\bnegara\b/gi) ?? []).length).toBeGreaterThan(0);
  });
  test("inventaris negasi: kalimat yang memuat tidak, bukan, belum, tak, tanpa, jangan, atau kecuali dicatat satu per satu (kalimat negatif atau universal berlingkup)", () => {
    const prosa = MDX.replace(/^---[\s\S]*?\n---/, "").replace(/\{\/\* daftar-tahap \*\/[\s\S]*\{\/\* \/daftar-tahap \*\/\}/, "")
      .replace(/<figure[\s\S]*?<\/figure>/, "").replace(/<p class="meta">.*<\/p>/, "");
    const kalimat = prosa.split(/\n+/).flatMap((b) => b.split(/(?<=[.:]) (?=[A-Z"])/));
    const aktual = kalimat.map((k) => [k.slice(0, 48), (k.match(/\b(tidak|bukan|belum|tak|tanpa|jangan|kecuali)\b/gi) ?? []).length] as const).filter(([, n]) => n > 0);
    expect(aktual).toEqual(NEGASI);
  });
  test("tanpa nama negara, mata uang, atau merek: tiga negara tidak dinamai dan rupiah tak disebut dengan kode lain", () => {
    expect(NASKAH).toContain("tanpa nama dan tanpa kode mata uang kecuali rupiah");
    expect(MDX).not.toMatch(/\b(USD|EUR|SGD|MYR|IDR|JPY|GBP)\b/);
    expect(MDX).not.toMatch(/\b(Indonesia|Malaysia|Singapura|Thailand|Vietnam|Filipina|Amerika|Eropa)\b/);
    expect(MDX).not.toMatch(/\b(izin resmi|berlisensi|tersertifikasi|patuh)\b/i);
  });
  test("setiap paragraf, butir, dan baris tabel dengan angka punya label (Asumsi, Ilustrasi, Hitungan), kecuali meta, kepala, dan tabel yang diberi label oleh kalimat pengantar", () => {
    const badan = MDX.replace(/^---[\s\S]*?\n---/, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    const blok = badan.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
    const LABEL = /Asumsi|Ilustrasi|Hitungan atas|Tidak dijalankan|\[perlu verifikasi\]/;
    const tanpa: string[] = [];
    blok.forEach((b, i) => {
      if (b.startsWith("<p class=\"meta\">") || b.startsWith("## ") || b.startsWith("<figure")) return;
      const bukanTabel = !b.startsWith("|");
      const baris = bukanTabel ? [b] : b.split("\n").slice(2);
      const pengantar = blok[i - 1] ?? "";
      for (const x of baris) {
        // Nomor tahap dan versi PRD (Tahap 6, PRD v6) bukan angka klaim; rujukan [[ID]] dan tautan Label sumber juga bukan.
        const teksX = x.replace(/\[\[[^\]]+\]\]/g, "").replace(/\(\/cara-pakai\/#label-sumber\)/g, "").replace(/\b(Tahap|PRD v|v)\s?\d\b/g, "");
        if (!/\d/.test(teksX)) continue;
        if (LABEL.test(x)) continue;
        if (!bukanTabel && LABEL.test(pengantar)) continue; // tabel: kalimat pengantar memberi label
        tanpa.push(x.slice(0, 70));
      }
    });
    expect(tanpa, "blok bernomor tanpa label").toEqual([]);
  });
  test("kalimat tabel: kalimat pengantar tim dan PRD berlabel (tanpa label, tabel angka kehilangan sumbernya)", () => {
    const sebelum = (kepala: string) => paragraf(MDX.slice(0, MDX.indexOf(kepala))).at(-1)!;
    expect(sebelum("| Tim | Orang | Pemimpin | Memegang |")).toContain("Asumsi cerita");
    expect(sebelum("| Prioritas | Isi | Keterangan |")).toContain("(Ilustrasi)");
  });
});

describe("sidik: tiap baris halaman terkunci (kata yang berubah tanpa menggeser angka atau klaim)", () => {
  test("BARIS_MDX sama dengan berkas halaman, tanpa isi tabel daftar-tahap (itu turunan registry yang berubah tiap halaman 6.n ditulis, dijaga tes di atas)", () => {
    const tanpaDaftar = MDX.replace(/(\{\/\* daftar-tahap \*\/\}\n)[\s\S]*?(\n\{\/\* \/daftar-tahap \*\/\})/, "$1$2");
    expect(tanpaDaftar.split("\n").filter((b) => b.trim() !== "")).toEqual(BARIS_MDX);
    expect(BARIS_MDX.filter((b) => b.includes("daftar-tahap"))).toEqual(["{/* daftar-tahap */}", "{/* /daftar-tahap */}"]);
  });
});

// ---- hasil build (hanya bila dist ada) ---------------------------------------------------------------------------------
const distHtml = path.join(akar, "situs/dist/cerita/tahap-6/index.html");
describe.runIf(fs.existsSync(distHtml))("hasil build di dist: tabel, tooltip, jalur Kamu di sini, dan sidebar", () => {
  const html = fs.readFileSync(distHtml, "utf8");
  const main = /<main[\s\S]*?<\/main>/.exec(html)![0]!;
  test("tiga tabel GFM terender dengan kolom sama (tim 4 kolom, PRD 3 kolom, daftar 2 kolom)", () => {
    const tabel = [...main.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => m[0]!);
    expect(tabel).toHaveLength(3);
    const kolom = tabel.map((t) => (t.match(/<th[ >]/g) ?? []).length);
    expect(kolom).toEqual([4, 3, 2]);
    const baris = tabel.map((t) => (t.match(/<tr/g) ?? []).length - 1);
    expect(baris).toEqual([N_TIM, 8, 12]);
  });
  test("tooltip abbr di main: tak ada kata dua arti (token, router, log) dan istilah teknis hanya dengan artinya", () => {
    const abbr = [...main.matchAll(/<abbr[^>]*>(.*?)<\/abbr>/g)].map((m) => m[1]!.toLowerCase());
    for (const k of ["token", "router", "log", "client"]) expect(abbr, k).not.toContain(k);
    expect(abbr).toContain("primary");
  });
  test("jalur Kamu di sini: Tahap 6 · Regional, bagian PRD, tanpa 'versi lama' di sidebar untuk halaman ini", () => {
    const kamu = /<nav class="kamu"[\s\S]*?<\/nav>/.exec(html)![0]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(kamu).toContain(`Tahap ${P.no} · ${P.nama}`);
    // Grup sidebar: dari <details> yang memuat label sampai penutupnya (details bersarang dihitung).
    const awal = html.lastIndexOf("<details", html.indexOf('>Tahap 6 · Regional</span>'));
    let dalam = 0, akhir = -1;
    for (const m of html.slice(awal).matchAll(/<details|<\/details>/g)) {
      dalam += m[0] === "<details" ? 1 : -1;
      if (dalam === 0) { akhir = awal + m.index! + m[0].length; break; }
    }
    expect(akhir).toBeGreaterThan(awal);
    const sidebar = html.slice(awal, akhir);
    expect(sidebar).not.toContain("versi lama");
    expect(sidebar).toContain('href="/cerita/tahap-6/"');
    expect((sidebar.match(/<details/g) ?? []).length).toBe(5);
  });
});

// ---- beranda dan aset peta (hanya bila dist ada) --------------------------------------------------------------------------
const distBeranda = path.join(akar, "situs/dist/index.html");
describe.runIf(fs.existsSync(distBeranda))("hasil build di dist: peta beranda dan data peta cerita memuat Tahap 6 dari proyeksi", () => {
  const html = fs.readFileSync(distBeranda, "utf8");
  const nomorT6 = REG.halaman.filter((h) => h.tahap === 6 && !/^T\d$/.test(h.id));
  test("tab dan panel Tahap 6: bertanda proyeksi, menaut ke halaman Cerita, status dari hitungan halaman registry", () => {
    const tab = /<button[^>]*id="tab-tahap-6"[^>]*>/.exec(html)![0]!;
    expect(tab).toContain("peta__pilih is-proyeksi");
    expect(/<button[^>]*id="tab-tahap-5"[^>]*>/.exec(html)![0]!).not.toContain("is-proyeksi");
    const panel = /<div role="tabpanel" id="panel-tahap-6"[\s\S]*?<\/div><\/div>/.exec(html)![0]!;
    // Tautan menuju halaman pertama Tahap 6 di urutan baca bila Tahap 6 sudah di `URUT_BACA` (tugas 6.1), kalau belum halaman Cerita.
    const awal6 = urutanBaca(muat()).find((h: { tahap: unknown }) => h.tahap === 6);
    expect(panel).toContain(`<a class="peta__buka" href="${awal6 ? urlHalaman(awal6) : "/cerita/tahap-6/"}">Buka Tahap 6 →</a>`);
    const ada = nomorT6.filter((h) => h.ada).length;
    expect(panel).toContain(`Proyeksi konseptual, tanpa lab. Sedang ditulis: ${ada} dari ${nomorT6.length} halaman`);
    expect(panel).not.toContain("belum ditulis");
  });
  const aset = path.join(akar, "situs/public/widgets/data/cerita.json");
  test.runIf(fs.existsSync(aset))("data peta cerita yang dibangkitkan memberi Tahap 6 jalur_inti dari halaman registry (siapkan-aset)", () => {
    const d = JSON.parse(fs.readFileSync(aset, "utf8")) as { proyeksi: { no: number; jalur_inti?: { halaman: number; menit: number } }[] };
    const inti = REG.halaman.filter((h) => h.tahap === 6 && h.ada && (h as { inti?: boolean }).inti);
    expect(d.proyeksi[0]!.jalur_inti).toEqual({ halaman: inti.length, menit: inti.reduce((n, h) => n + (h.menit ?? 0), 0) });
  });
});
