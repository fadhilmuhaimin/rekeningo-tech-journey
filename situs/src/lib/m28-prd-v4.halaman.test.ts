// Penjaga halaman 3.28 (keputusan 1108 sampai 1110): angka, label sumber, rentang Snippet, klaim negatif berlingkup,
// tautan, diagram Rantai, widget kalkulator, dan kartu Cek diri di m28-prd-v4.mdx diturunkan dari registry (asumsi Tahap 3),
// naskah Tahap 3, rekaman labs/t3-pool (adr22.txt bagian F), kode dan berkas lab Tahap 3, halaman Tahap 1 sampai 3, dan mesin
// widget kalkulator, bukan dari daftar yang ditulis sendiri. Halaman ini TANPA LAB: setiap angka berlabel Asumsi, Hitungan,
// Ilustrasi, atau Tidak dijalankan, dan satu-satunya rekaman adalah batas L dari t3-pool.
// Dua lapis: (1) nilai bergantung sumber dihitung ulang di sini dan dibandingkan dengan halaman; (2) kata-kata halaman dikunci
// per baris lewat m28-prd-v4.halaman.nilai.ts, supaya satu kata yang berubah (mis. "tidak" disisipkan) gagal. Kalimat
// terkunci tidak menangkap SALAHNYA kalimat, jadi klaim yang diucapkan (panggilan keluar api-t3, perkakas load test, aturan 5
// ADR 21, penutupan periode) dibaca dari berkas yang memerankannya. Tes hanya membaca berkas terlacak git.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-m28-diuji.json";
import { DataKalkulator, DaftarAsumsi } from "../widgets/kalkulator/skema";
import { duaAngka, hitung as hitungBeban, jarak as jarakKal, siapkan } from "../widgets/kalkulator/logika";
import { daftarBlok, cekTemplat } from "./blok";
import { DataRantai } from "./rantai";
import { bersihkanRujukanInternal } from "./rujukan-internal";
import { BARIS_MDX, BENTUK_MDX, NILAI_JSON } from "./m28-prd-v4.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-3/m28-prd-v4.mdx";
const mdx = baca(BERKAS);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const frontmatter = mdx.split(/^---\n/m)[1]!;
const barisMdx = mdx.split("\n").filter((b) => b.trim() && !/^<Snippet (file|files)=/.test(b));
const adr22 = baca("labs/t3-pool/output/adr22.txt");
const readmePool = baca("labs/t3-pool/README.md");
const naskah = baca("plan/CERITA-TAHAP-3.md");
const kartu = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const hal231 = baca("situs/src/content/docs/tahap-2/sengaja-belum.mdx");
const hal24 = baca("situs/src/content/docs/tahap-2/fitur-tutup-buku.mdx");
const hal38 = baca("situs/src/content/docs/tahap-3/connection-pool.mdx");
const hal315 = baca("situs/src/content/docs/tahap-3/dua-instance.mdx");
const diagram = DataRantai.parse(diagramMentah);
const kalkMentah = JSON.parse(baca("situs/data/widget/t3-m28-kalkulator.json")) as unknown;
const kalk = DataKalkulator.parse(kalkMentah);

interface H { id: string; judul: string; path?: string; topik?: string; label?: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; adr?: number[]; masalah?: string }
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
const ribu = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");

// ---- nilai dari registry dan rumus ---------------------------------------------------------------------------------------
const reg = cerita.tahap[2]!.asumsi as { user: number; aktif: number; req: number; puncak: number; trx: number };
const T3 = hitungBeban({ user: reg.user, aktif: reg.aktif, req: reg.req, puncak: reg.puncak });
const W = 0.02;
const L3 = T3.puncak * W;
const semuaAktif = hitungBeban({ user: reg.user, aktif: 100, req: reg.req, puncak: reg.puncak });
const satuJam = hitungBeban({ user: reg.user, aktif: reg.aktif, req: reg.req, puncak: 24 });
const POOL = 10;
const SATUAN = { detik: "detik", ms: "ms" };

const baris = (teks: string) => {
  const b = teks.replace(/\n+$/, "").split("\n");
  const nomor = (ok: (x: string) => boolean, dariNomor = 1): number => {
    const i = b.findIndex((x, n) => n + 1 >= dariNomor && ok(x));
    expect(i, "baris tidak ditemukan").toBeGreaterThanOrEqual(0);
    return i + 1;
  };
  return { b, nomor, antara: (a: number, z: number) => b.slice(a - 1, z).join("\n") };
};
const A22 = baris(adr22);
const awalF = A22.nomor((x) => x.startsWith("# --- F. "));
const bagF = A22.b.slice(awalF - 1);

const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/i;
const tagSnippet = (): { berkas: string; lines: string | undefined; judul: string | undefined; lang: string | undefined }[] =>
  [...badan.matchAll(/<Snippet\s+([^>]*?)\/>/gs)].map((m) => {
    const t = m[1]!;
    const atribut = (nama: string): string | undefined => t.match(new RegExp(`${nama}="([^"]*)"`))?.[1];
    return { berkas: atribut("file") ?? "", lines: atribut("lines"), judul: atribut("title"), lang: atribut("lang") };
  });

describe("kata-kata halaman terkunci (lapis 2)", () => {
  test("baris MDX sama dengan nilai terkunci", () => {
    expect(barisMdx).toEqual(BARIS_MDX);
  });
  test("bentuk baris kosong terkunci (baris kosong menentukan cara MDX mengurai)", () => {
    const bentuk = mdx.split("\n").map((b) => (/^<Snippet (file|files)=/.test(b) ? "S" : b.trim() ? "#" : "-")).join("");
    expect(bentuk).toBe(BENTUK_MDX);
  });
  test("nilai string JSON Rantai dan kalkulator sama dengan nilai terkunci", () => {
    const ratakan = (x: unknown, jalur = ""): string[] =>
      Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${jalur}.${i}`))
        : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => ratakan(v, jalur ? `${jalur}.${k}` : k))
        : [`${jalur}=${JSON.stringify(x)}`];
    expect(Object.keys(NILAI_JSON)).toEqual(["rantai", "kalkulator"]);
    expect(ratakan(JSON.parse(baca("situs/data/diagram/t3-m28-diuji.json")))).toEqual(NILAI_JSON.rantai);
    expect(ratakan(kalkMentah)).toEqual(NILAI_JSON.kalkulator);
  });
});

describe("registry, naskah, blok, dan tautan", () => {
  const r = dari("t3-m28");
  test("entri registry dan baris peta naskah cocok; halaman tanpa lab", () => {
    expect(r).toMatchObject({ ada: true, nomor: "3.28", jenis: "masalah", inti: true, prasyarat: ["t3-tim-infra"], tahap: 3, peran: ["backend"], topik: "Desain sistem" });
    expect(r.path).toBe("tahap-3/m28-prd-v4.md");
    expect(r.lab).toBeUndefined();
    expect(path.basename(BERKAS, ".mdx")).toBe(path.basename(r.path!, ".md"));
    expect(naskah).toContain("| 3.28 | 4 | M28: Uji coba enam kota lolos, PRD v4 datang | Masalah | ★ | – | kalkulator |");
    const minggu = cocok(naskah, /\| M28 \| (\d+) \|/)[1]!;
    expect(r.label).toBe(`Masalah 28 · minggu ${minggu}`);
    harus(`Minggu ${minggu} Tahap 3.`);
    expect(r.judul).toBe("M28: Uji coba enam kota lolos, PRD v4 datang");
    expect(frontmatter).toContain('title: "3.28 M28: Uji coba enam kota lolos, PRD v4 datang"');
    expect(hal.filter((h) => h.nomor === "3.28").map((h) => h.id)).toEqual(["t3-m28"]);
    expect(dari("t3-tim-infra")).toMatchObject({ nomor: "3.27", adr: [32] });
    expect(dari("t3-estimasi")).toMatchObject({ nomor: "3.29", prasyarat: ["t3-m28"] });
    expect(dari("t3-adr-33")).toMatchObject({ nomor: "3.30", adr: [33] });
    expect(dari("t3-jembatan").nomor).toBe("3.32");
  });
  test("meta: menit baca ditambah menit coba sama dengan registry, dan jumlah kata masuk akal (sekitar 200 kata per menit)", () => {
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-tim-infra\]\] · Jalur inti<\/p>/);
    expect(r.menit).toBe(Number(m[1]) + Number(m[2]));
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(m[1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat masalah: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira"]);
  });
  test("tautan [[id]]: himpunan, nomor, judul, dan jumlah pemakaian diturunkan dari registry dan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].sort();
    const masalah = Array.from({ length: 10 }, (_, i) => `t3-m${18 + i}`);
    expect(id).toEqual(["A0", "t1-m8", "t2-adr-21", "t2-m17", "t2-tutup-buku", "t3-adr-33", "t3-dua-instance", "t3-estimasi", "t3-jembatan", ...masalah, "t3-pool", "t3-tim-infra"].sort());
    const sesuai: [string, string, string][] = [
      ["t1-m8", "1.37", "Uji coba lolos"], ["t2-adr-21", "2.31", "ADR 21"], ["t2-m17", "2.29", "M17"], ["t2-tutup-buku", "2.4", "Fitur: tutup buku bulanan"],
      ["t3-adr-33", "3.30", "ADR 33"], ["t3-dua-instance", "3.15", "Dua instance di belakang proxy"], ["t3-estimasi", "3.29", "Estimasi Tahap 3"],
      ["t3-jembatan", "3.32", "Jembatan"], ["t3-pool", "3.8", "Connection pool"], ["t3-tim-infra", "3.27", "Tim dan infra Tahap 3"],
    ];
    for (const [idh, nomor, awalJudul] of sesuai) {
      expect(dari(idh).nomor, idh).toBe(nomor);
      expect(dari(idh).judul.startsWith(awalJudul), `${idh} di registry`).toBe(true);
    }
    for (const [idh, nomor, awalJudul] of sesuai.filter(([i]) => i.startsWith("t3-"))) {
      expect(naskah, `${nomor} di peta`).toMatch(new RegExp(`\\| ${nomor.replace(".", "\\.")} \\| \\d+b? \\| ${awalJudul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    masalah.forEach((idm, i) => {
      expect(dari(idm).nomor, idm).toBeDefined();
      expect(dari(idm).label, idm).toMatch(new RegExp(`^Masalah ${18 + i} · minggu \\d+$`));
      expect(dari(idm).ada, idm).toBe(true);
      expect(dari(idm).jenis, idm).toBe("masalah");
    });
    expect(hal.filter((h) => /^t3-m\d+$/.test(h.id) && h.id !== "t3-m28").map((h) => h.id).sort()).toEqual([...masalah].sort());
    expect(dari("A0").ada).toBe(true);
    expect(cara).toContain("Label sumber");
    expect(hitung(badan, "[[t3-pool]]")).toBe(3);
    expect(hitung(badan, "[[t3-tim-infra]]")).toBe(3);
    expect(hitung(badan, "[[t3-jembatan]]")).toBe(3);
    expect(hitung(badan, "[[t3-estimasi]]")).toBe(2);
    expect(hitung(badan, "[[t3-m18]]")).toBe(2);
    expect(hitung(badan, "[[t3-m23]]")).toBe(3);
    expect(hitung(badan, "[[t3-m27]]")).toBe(2);
    expect(hitung(badan, "[[t2-m17]]")).toBe(2);
  });
  test("janji halaman ini ke halaman lain ditepati: 3.29 menghitung beban Tahap 4, 3.32 memuat tebakan mana yang pecah lebih dulu, PRD v4 lengkap bukan di sini", () => {
    expect(dari("t3-estimasi").masalah).toBe("Menghitung beban Tahap 4 dari angka Tahap 3 sebelum memilih komponen");
    harus("Beban PRD v4 dihitung dengan rumus yang sama di [[t3-estimasi]].");
    expect(dari("t3-jembatan").masalah).toContain("mana yang pecah lebih dulu");
    expect(naskah).toContain("Pembaca diminta menebak: dari ADR Tahap 3, mana yang pecah lebih dulu?");
    harus("[[t3-jembatan]] meminta kamu menebak mana yang pecah lebih dulu.");
    harus("Isi PRD v4 selengkapnya ada di [[t3-jembatan]].");
    expect(naskah).toContain("| 3.32 | 6 | Jembatan: pratinjau PRD v4 | PRD | ★ | – | tebak |");
  });
  test("halaman tidak membuka isi Tahap 4: tanpa angka beban Tahap 4, nomor ADR sesudah 33, atau rincian gateway", () => {
    expect(badan).not.toMatch(/138,9|100\.000|7,98|PRD v5|webhook|ADR (3[4-9]|4\d)|Serverpod|OpenTofu/i);
    expect(hitung(badan, "ADR 33")).toBe(1);
    expect(hitung(badan, "ADR 22")).toBe(1);
    expect(hitung(badan, "ADR 32")).toBe(2);
    expect(hitung(badan, "ADR 21")).toBe(1);
    expect(badan.indexOf("ADR 22")).toBeGreaterThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(cerita.tahap[3]!.asumsi.user).toBeGreaterThan(reg.user);
  });
});

describe("naskah M28 dan gejala: lingkup PRD v4, dugaan Raka, dan batas yang ditulis naskah", () => {
  const barisM28 = naskah.split("\n").find((b) => b.startsWith("| M28 |"))!;
  test("baris M28: minggu, gejala berlabel Ilustrasi, dugaan, puncak, L di bawah 0,87, kapasitas belum diukur, tiga hal yang belum pernah diuji", () => {
    expect(barisM28).toContain("| 10 | Uji coba enam kota lolos: tutup buku bulan ketiga selesai kurang dari sehari, selisih Rp0.");
    expect(barisM28).toContain("| Perlu server lebih besar |");
    expect(barisM28).toContain("Puncak 17,4 request per detik; di lab t3-pool L semua request terbukti di bawah 0,87 koneksi (batas lab) pada pool 10");
    expect(barisM28).toContain("kapasitas satu server belum diukur (load test ADR 21 Tidak dijalankan)");
    expect(barisM28).toContain("Yang belum pernah diuji: pihak ketiga yang menggerakkan uang, tiga tim di satu codebase, dan satu VPS sebagai titik gagal tunggal");
    expect(barisM28).toContain("| Estimasi Tahap 3 → 4; **Tim 3** retrospektif |");
    expect(barisM28).toContain('ADR 33 "Sengaja belum dilakukan": tanpa microservices, Kubernetes, read replica, PgBouncer, CDC, VPS kedua, cache saldo');
    expect(naskah).toContain("- M28: PRD v4, bukan fitur v3.");
    expect(naskah).toContain("| Estimasi | Masalah Tahap 3 adalah ketergantungan, bukan kapasitas | M28; kapasitas satu server belum diukur |");
    harus("Naskah menyebut ketiganya, dan tiap hal punya batas yang bisa dibaca di Tahap 3:");
    harus("| Pihak ketiga yang menggerakkan uang |");
    harus("| Tiga tim di satu codebase |");
    harus("| Satu VPS sebagai titik gagal tunggal |");
    harus("Hanya dua hal: data yang terlihat cocok, dan beban enam kota dalam hitungan Asumsi kecil. Keduanya tidak menjalankan pihak ketiga yang menggerakkan uang, tiga tim di satu codebase, atau satu VPS yang mati.");
    harus("Raka membaca daftar PRD v4");
    harus("jadi servernya harus lebih besar.");
  });
  test("lingkup PRD v4 di gejala: enam butir dari baris M28, urutan sama; PT Rekeningo fiktif; tanpa klaim izin atau regulasi", () => {
    const butir = cocok(barisM28, /Sinta datang dengan PRD v4: ([^.]+)\./)[1]!.split(", ");
    expect(butir).toEqual(["PT Rekeningo terpisah", "top-up dari bank lewat gateway", "verifikasi identitas", "QR di merchant luar", "kartu virtual", "back office"]);
    harus(`Lingkupnya ${butir[0]!.replace("PT Rekeningo ", "PT Rekeningo yang ")} dari Lestari, ${butir.slice(1, 5).join(", ")}, dan ${butir[5]}.`);
    expect(naskah).toMatch(/PRD v4 tampil di halaman terakhir Tahap 3\. Isinya:\n\n- PT Rekeningo berdiri sendiri\.\n- Top-up dari rekening bank lewat gateway\.\n- Verifikasi identitas\.\n- QR untuk merchant di luar Lestari\.\n- Kartu virtual\.\n- Back office untuk tim risk\./);
    expect(naskah).toContain('Frasa "uang elektronik publik" di naskah Tahap 1 tidak membawa klaim izin atau regulasi apa pun.');
    harus("PT Rekeningo adalah perusahaan fiktif.");
    expect(badan).not.toMatch(/uang elektronik|izin|regulasi|OJK|Bank Indonesia|lisensi/i);
  });
  test("naskah tidak menyebut berapa karyawan aktif selama uji coba: baris M28 tanpa kata aktif, dan ilustrasi memuat jam atau angka cerita saja", () => {
    expect(barisM28).not.toMatch(/aktif/i);
    harus("*Angka cerita (Ilustrasi):* minggu 10, bulan ketiga, kurang dari sehari, dan selisih Rp0 berasal dari naskah, tanpa rekaman yang mengulangnya.");
    harus("Naskah tidak menyebut berapa karyawan aktif selama uji coba");
    harus("Pemeriksaan Pak Hadi dan pertanyaan Sinta ditambahkan halaman ini.");
    harus("*Skenario (Ilustrasi):* catatan Raka ditulis halaman ini. Naskah hanya menyebut dugaan bahwa server perlu lebih besar.");
    expect(naskah).toContain("Aturan Pak Hadi");
    harus("Tidak ada selisih yang harus ia koreksi dengan tangan.");
  });
  test("penutupan periode: naskah Tahap 3 menyebutnya sekali, di Latar, sebagai belum dibuat; halaman 2.4 menulis keduanya belum dibuat di lab", () => {
    expect(hitung(naskah, "penutupan periode")).toBe(1);
    expect(naskah.indexOf("penutupan periode")).toBeLessThan(naskah.indexOf("## 1. PRD v3"));
    expect(naskah.indexOf("penutupan periode")).toBeGreaterThan(naskah.indexOf("## Latar: dari satu kampus ke enam kota"));
    expect(naskah).toContain("penutupan periode tutup buku belum dibuat, dan Idempotency-Key belum dipasang di bayar dan transfer.");
    expect(hal24).toContain("Menutup periode dengan benar butuh menunggu transaction yang masih terbuka, atau tabel penutupan periode. Keduanya belum dibuat di lab.");
    harus("Latar naskah Tahap 3 mencatat penutupan periode sebagai hal yang belum dibuat ketika PRD v3 datang, dan bagian naskah sesudahnya tidak menyebutnya lagi. Karena itu Rp0 ini dibaca dengan batas yang sama seperti di [[t2-tutup-buku]].");
    harus("Seperti di [[t2-m17]], Rp0 mengukur kecocokan data yang terlihat saat laporan berjalan, bukan kelengkapannya dan bukan beban.");
    const m17 = baca("situs/src/content/docs/tahap-2/m17-prd-v3.mdx");
    expect(m17).toContain("Rp0 mengukur kecocokan data yang terlihat, bukan kelengkapannya.");
  });
  test("keadaan Tahap 3 di akhir: empat orang, satu codebase Go, dua instance API, worker, penyimpanan sementara, semua komponen produksi di satu VPS", () => {
    expect(naskah).toContain("Tim jadi empat orang dalam 10 minggu (Asumsi cerita)");
    expect(naskah).toContain("Yang tidak berubah: satu codebase Go, satu database PostgreSQL, ledger dari Tahap 2.");
    expect(naskah).toContain("Di akhir tahap ada dua instance API, satu worker, satu penyimpanan sementara untuk state bersama, dan satu lingkungan staging. Semua komponen produksi berada di satu VPS.");
    expect(naskah).toContain("satu VPS tetap titik gagal tunggal");
    expect(hal315).toContain("Dua instance di satu VPS menahan satu proses yang mati. Keduanya tidak menahan VPS yang mati.");
    harus("| Tiga tim di satu codebase | Empat orang (Asumsi cerita) dan satu codebase Go | [[t3-tim-infra]] |");
    harus("| Satu VPS sebagai titik gagal tunggal | Dua instance API, worker, dan Redis di satu VPS: bila VPS mati, semuanya mati | [[t3-dua-instance]] |");
    harus("Timnya empat orang (Asumsi cerita) di satu codebase Go, dan semua komponen produksi ada di satu VPS.");
  });
});

describe("angka beban: dari asumsi registry dan rumus, semuanya berlabel Asumsi atau Hitungan", () => {
  test("asumsi Tahap 3 di registry: 10.000 user, 25% aktif, 60 request, faktor puncak 10; hasil 2.500, 150.000, 1,74, 17,4 sama dengan naskah", () => {
    expect([reg.user, reg.aktif, reg.req, reg.puncak]).toEqual([10000, 25, 60, 10]);
    expect(T3.dau).toBe(2500);
    expect(T3.reqHari).toBe(150000);
    expect(koma(T3.rata, 2)).toBe("1,74");
    expect(koma(T3.puncak, 1)).toBe("17,4");
    expect(naskah).toContain(`| ${ribu(T3.dau)} × ${reg.req} = ${ribu(T3.reqHari)} per hari | ${koma(T3.rata, 2)} rata-rata dan ${koma(T3.puncak, 1)} puncak`);
    harus(`| User terdaftar (Tahap 3) | ${ribu(reg.user)} | Enam kota |`);
    harus(`| User aktif harian (Tahap 3) | ${ribu(T3.dau)} | ${ribu(reg.user)} × ${reg.aktif}% |`);
    harus(`| Request per hari (Tahap 3) | ${ribu(T3.reqHari)} | ${ribu(T3.dau)} × ${reg.req} request |`);
    harus(`| Rata-rata request per detik | ${koma(T3.rata, 2)} | ${ribu(T3.reqHari)} ÷ 86.400 |`);
    harus(`| Puncak request per detik (Tahap 3) | ${koma(T3.puncak, 1)} | ${koma(T3.rata, 2)} × ${reg.puncak} |`);
    harus(`| Koneksi database terpegang, L = λ × W | ${koma(L3, 2)} | ${koma(T3.puncak, 1)} × ${koma(W, 2)} detik (W ${W * 1000} ms) |`);
    expect(koma(Number(koma(T3.puncak, 1).replace(",", ".")) * W, 2)).toBe("0,35");
    expect(hal38).toContain("Jadi seluruh request memegang 17,4 × 0,02 = 0,35 koneksi dari 10.");
    expect(naskah).toContain("W 20 ms (Asumsi; lab t3-pool hanya menolak W di atas 50 ms, jadi 20 ms tidak terbukti)");
  });
  test("label: tabel beban berlabel Asumsi, Hitungan didefinisikan sekali dan mengikuti masukan terlemah; W 20 ms Asumsi, rekaman hanya membuktikan di bawah 50 ms", () => {
    harus("Kata Hitungan di halaman ini berarti hasil rumus yang ditulis di sebelahnya, dan labelnya mengikuti masukan terlemahnya.");
    expect(hitung(badan, "Kata Hitungan")).toBe(1);
    harus("| Besaran | Nilai | Cara hitung (semua asumsi) |");
    harus(`Persentase aktif, request per user, dan faktor puncak adalah Asumsi naskah dari \`cerita.json\`. W = 20 ms juga Asumsi, karena rekaman lab hanya membuktikan W di bawah 50 ms. Karena itu seluruh tabel berlabel Asumsi. Tanpa pembulatan, rata-ratanya ${koma(T3.rata, 3)} dan puncaknya ${koma(T3.puncak, 2)}; naskah dan lab menulis ${koma(T3.puncak, 1)}, dan halaman ini mengikutinya.`);
    expect([koma(T3.rata, 3), koma(T3.puncak, 2)]).toEqual(["1,736", "17,36"]);
    expect(baca("situs/src/content/docs/tahap-3/m18-app-membeku.mdx")).toContain("= 17,36 per detik. Lab menjadwalkan 17,4.");
    harus("Naskah tidak menyebut beban uji coba, jadi puncak 17,4 adalah hitungan dari asumsi registry:");
    expect(badan).not.toMatch(/Rekaman lab[^.\n]*(1,74|2\.500|150\.000|puncak 17,4)/);
  });
  test("skenario sensitivitas: semua aktif 4 kali (100 ÷ 25), L 1,39; satu jam 150.000 ÷ 3.600 = 41,7 dan L 0,83; pool 10 terdesak pada 450 per detik, 25,9 kali puncak", () => {
    expect(semuaAktif.puncak / T3.puncak).toBeCloseTo(100 / reg.aktif, 10);
    expect(koma(semuaAktif.puncak, 1)).toBe("69,4");
    expect(koma(semuaAktif.puncak * W, 2)).toBe("1,39");
    expect(satuJam.puncak).toBeCloseTo(T3.reqHari / 3600, 10);
    expect(24).toBe(86400 / 3600);
    expect(koma(satuJam.puncak, 1)).toBe("41,7");
    expect(koma(satuJam.puncak * W, 2)).toBe("0,83");
    const batas = (POOL - 1) / W;
    expect(batas).toBe(450);
    expect(koma(batas / T3.puncak, 1)).toBe("25,9");
    expect(koma(batas / 17.4, 1)).toBe("25,9");
    expect(hal38).toContain("Dengan W 20 ms (Asumsi), itu terjadi pada 9 ÷ 0,02 = 450 request per detik, atau 25,9 kali puncak 17,4, untuk kedatangan berjadwal tetap.");
    expect(hal38).toContain("Dalam bentuk L: pool penuh bila L melebihi n − 1.");
    harus(`Pilih Semua aktif, dan puncak naik empat kali, dari ${koma(T3.puncak, 1)} ke ${koma(semuaAktif.puncak, 1)} request per detik.`);
    harus(`Dengan W ${W * 1000} ms, L seluruh request menjadi ${koma(semuaAktif.puncak, 1)} × ${koma(W, 2)} = ${koma(semuaAktif.puncak * W, 2)} koneksi dari pool ${POOL} (Hitungan; W Asumsi).`);
    harus(`Pilih Satu jam, dan ${ribu(T3.reqHari)} ÷ ${ribu(3600)} = ${koma(satuJam.puncak, 1)} request per detik, atau L ${koma(satuJam.puncak * W, 2)} koneksi (Hitungan).`);
    harus(`Pool ${POOL} baru terdesak bila L melebihi ${POOL - 1}. Itu terjadi pada ${POOL - 1} ÷ ${koma(W, 2)} = ${batas} request per detik, ${koma(batas / T3.puncak, 1)} kali puncak ${koma(T3.puncak, 1)} (Hitungan untuk kedatangan berjadwal tetap, [[t3-pool]]). Kedatangan acak mengantre lebih awal.`);
    expect(hal38).toContain("Kedatangan acak mengantre lebih awal.");
    harus("Itu hitungan untuk koneksi database saja, dan kapasitas VPS belum diukur.");
  });
  test("pembulatan widget: dua angka penting, jadi 1,74 tampil 1,7, 17,4 tampil 17, 69,4 tampil 69; kalimat di halaman memakai mesin widget yang sama", () => {
    expect([duaAngka(T3.rata), duaAngka(T3.puncak), duaAngka(semuaAktif.puncak), duaAngka(satuJam.puncak)]).toEqual(["1,7", "17", "69", "42"]);
    harus(`Widget membulatkan ke dua angka penting, jadi rata-rata ${koma(T3.rata, 2)} tampil ${duaAngka(T3.rata)}, puncak ${koma(T3.puncak, 1)} tampil ${duaAngka(T3.puncak)}, puncak ${koma(semuaAktif.puncak, 1)} tampil ${duaAngka(semuaAktif.puncak)}, dan puncak ${koma(satuJam.puncak, 1)} tampil ${duaAngka(satuJam.puncak)}.`);
    expect(jarakKal(T3.jarak, SATUAN)).toBe("58 ms");
  });
});

describe("rekaman t3-pool adr22.txt bagian F: batas L, bukan nilai tunggal, di satu laptop", () => {
  test("bagian F: beban berjadwal 17,4 per detik, tiap request ke-20 pembayaran, W di bawah 50 ms, L di bawah 17,4 × 50 ms = 0,87 koneksi, pool 10", () => {
    const f = bagF.join("\n");
    expect(f).toContain("# --- F. Versi benar (ADR 22 dan 23): push di luar transaction, timeout 3 detik, pemberitahuan lewat outbox ---");
    expect(f).toContain("$ ./api-t3 -lab   # pool 10, push timeout 3 detik");
    expect(f).toContain("# Beban dengan jadwal tetap, bukan acak: 17,4 request per detik (Asumsi naskah bagian 3). Request ke-20, ke-40, dan seterusnya adalah pembayaran (0,87 per detik, 5%, Asumsi).");
    expect(f).toContain("W rata-rata satu pembayaran dan satu pembacaan kurang dari 50 ms (batas lab; Asumsi naskah 20 ms): ya");
    expect(f).toContain("L semua request = 17,4 × W rata-rata dari data kurang dari 0,87 koneksi (batas lab 17,4 × 50 ms; hitungan naskah dengan 20 ms: 0,35): ya");
    expect(POOL).toBe(10);
    expect(koma(17.4 * 0.05, 2)).toBe("0,87");
    expect(koma(T3.puncak * 0.05, 2)).toBe("0,87");
    expect(koma(L3, 2)).toBe("0,35");
    expect(0.87 / 0.05).toBeCloseTo(17.4, 10);
    expect(cocok(naskah, /\| Pembayaran dan transfer per detik \|[^|]*\|[^|]*\| 0,087 rata-rata dan ([\d,]+) puncak/)[1]).toBe("0,868");
    harus("Lab t3-pool menjadwalkan 17,4 request per detik pada pool 10, dan tiap request ke-20 adalah pembayaran:");
    harus("Lab memeriksa batas, bukan nilai tunggal: W rata-rata di bawah 50 ms, jadi L di bawah 17,4 × 0,05 = 0,87 koneksi. Pembangkit beban");
    // 0,87 muncul dua kali di potongan rekaman: pembayaran per detik (λ 0,868 dibulatkan) di baris beban, koneksi (batas L) di baris L
    const lambda = (T3.dau * reg.trx) / 86400 * reg.puncak;
    expect(koma(lambda, 3)).toBe("0,868");
    expect(koma(lambda, 2)).toBe("0,87");
    expect(reg.trx).toBe(3);
    expect(T3.dau * reg.trx).toBe(7500);
    harus(`Angka 0,87 muncul dua kali di potongan itu, dengan arti berbeda. Di baris beban, 0,87 per detik adalah pembayaran, yaitu ${koma(lambda, 3)} yang dibulatkan (${ribu(T3.dau * reg.trx)} ÷ 86.400 × ${reg.puncak}, Asumsi). Di baris L, 0,87 adalah koneksi.`);
    expect(hitung(badan, "0,87 per detik")).toBe(1);
    expect(hitung(badan, "0,868")).toBe(1);
    expect(hitung(badan, "bukan pembayaran per detik")).toBe(0);
    expect(cocok(naskah, /di lab t3-pool L semua request terbukti di bawah ([\d,]+) koneksi \(batas lab\) pada pool (\d+)/).slice(1)).toEqual(["0,87", "10"]);
  });
  test("Snippet: satu rentang, dari baris beban berjadwal sampai baris L; nomor baris dihitung dari jangkar", () => {
    const awal = A22.nomor((x) => x.startsWith("# Beban dengan jadwal tetap, bukan acak: 17,4 request per detik"), awalF);
    const akhir = A22.nomor((x) => x.startsWith("L semua request = 17,4 × W rata-rata"), awalF);
    expect(tagSnippet()).toEqual([
      { berkas: "labs/t3-pool/output/adr22.txt", lines: `${awal}:${akhir}`, lang: undefined, judul: `Rekaman lab: labs/t3-pool/output/adr22.txt baris ${awal} sampai ${akhir} (bagian F, beban berjadwal)` },
    ]);
    expect(akhir - awal).toBe(5);
    // baris Snippet tidak masuk kunci baris MDX (diturunkan dari rekaman), jadi bentuk utuhnya dikunci di sini: tanpa teks atau atribut lain
    expect(mdx.split("\n").filter((x) => x.startsWith("<Snippet"))).toEqual([
      `<Snippet file="labs/t3-pool/output/adr22.txt" lines="${awal}:${akhir}" title="Rekaman lab: labs/t3-pool/output/adr22.txt baris ${awal} sampai ${akhir} (bagian F, beban berjadwal)" />`,
    ]);
    for (const t of tagSnippet()) {
      const [a, z] = t.lines!.split(":").map(Number) as [number, number];
      expect(bersihkanRujukanInternal(A22.antara(a, z)), t.judul).not.toMatch(POLA_ID_INTERNAL);
    }
  });
  test("satu laptop: README t3-pool menulis pembangkit beban, API, PostgreSQL, dan layanan push tiruan di satu laptop; waktu berlabel Asumsi sampai diulang di VPS", () => {
    expect(readmePool).toContain("**Satu mesin.** Pembangkit beban, API, PostgreSQL, dan layanan push tiruan berjalan di satu laptop.");
    expect(readmePool).toContain("berlabel Asumsi sampai diulang di VPS");
    harus("Pembangkit beban, API, PostgreSQL, dan layanan push tiruan berjalan di satu laptop, jadi rekaman tidak menyebut kapasitas VPS. Pembangkit itu hanya menjadwalkan 17,4 per detik, tanpa menaikkannya sampai sesak.");
    // pembangkit beban t3-pool bagian F: satu Beban(...) dengan rps bawaan 17,4, tanpa kenaikan bertahap
    const beban = baca("labs/t3-pool/beban.py");
    expect(beban).toContain("rps=17.4");
    const bagianAdr22 = baca("labs/t3-pool/bagian_adr22.py");
    expect(bagianAdr22).not.toMatch(/Beban\([^)]*rps\s*=/);
    expect(bagianAdr22).not.toMatch(/for rps in|rps \*=|rps \+=/);
    expect(readmePool).toContain("Bebannya 17,4 request per detik (Asumsi naskah bagian 3");
  });
});

describe("klaim negatif berlingkup, dijaga pemindaian berkas terlacak", () => {
  const delapan = ["api-t3", "t3-pool", "t3-outbox", "t3-instance", "t3-cache", "t3-offline", "t3-dasbor", "t3-mitm"];
  const berkasLab = [...(terlacak ?? [])].filter((f) => delapan.some((l) => f.startsWith(`labs/${l}/`)) && /\.(go|py|md|sql|txt|ya?ml|mod|dart|sh|js|ts|html|json)$|Makefile$|Caddyfile$|Dockerfile$/.test(f));
  test("delapan lab Tahap 3 sama dengan daftar naskah dan terlacak", () => {
    const i = naskah.indexOf("Lab yang dipakai.");
    const daftar = [...naskah.slice(i, naskah.indexOf("## 5. ", i)).matchAll(/^- `([a-z0-9-]+)`:/gm)].map((m) => m[1]!);
    expect([...daftar].sort()).toEqual([...delapan].sort());
    for (const l of delapan) expect(terlacak?.has(`labs/${l}/README.md`) ?? true, l).toBe(true);
    expect(berkasLab.length).toBeGreaterThan(150);
    harus("Di delapan lab Tahap 3 tidak ada perintah yang menjalankan perkakas load test");
  });
  test("tanpa perkakas load test: k6, wrk, locust, vegeta, hey, dan Apache Bench tidak muncul di berkas delapan lab (pemindai diuji pada contoh)", () => {
    const pola = /\bk6\b|\bwrk\b|\blocust\b|\bvegeta\b|\bhey\b|\bApache ?Bench\b|\bab -[nc]\b/i;
    for (const contoh of ["k6 run beban.js", "wrk -t2 -c10 http://x", "locust -f x.py", "echo GET | vegeta attack", "hey -n 100 http://x", "Apache Bench", "ab -n 100 -c 10 http://x"]) expect(pola.test(contoh), contoh).toBe(true);
    const temuan = berkasLab.flatMap((f) => fs.readFileSync(path.join(akar, f), "utf8").split("\n").filter((l) => pola.test(l)).map((l) => `${f}: ${l.trim()}`));
    expect(temuan).toEqual([]);
    harus("(dipindai: k6, wrk, locust, vegeta, hey, Apache Bench)");
    expect(cocok(naskah, /Lab Tahap 3 memakai beban berjadwal 17,4 request per detik yang mengukur koneksi, bukan kapasitas; load test kapasitas Tidak dijalankan\./)).toBeTruthy();
    expect(baca("labs/t3-pool/beban.py")).toContain("Jadwalnya tetap, bukan acak");
  });
  test("aturan 5 ADR 21 meminta satu load test sebelum fitur PRD v3 pertama yang menambah λ atau W ditulis; kapasitas belum diukur ditulis juga di 3.8 dan 3.15", () => {
    expect(hal231).toContain("5. Sebelum fitur PRD v3 pertama yang menambah λ atau W ditulis, satu load test mengukur kapasitas api-t2 yang sekarang.");
    harus("Aturan 5 di [[t2-adr-21]] meminta satu load test sebelum fitur PRD v3 pertama yang menambah λ atau W ditulis.");
    harus("Jadi di delapan lab itu jumlah request per detik yang sanggup dilayani VPS tidak pernah diukur (Tidak dijalankan).");
    // lingkup klaim negatif: lab Tahap 4 (api-t4) memutar 138,9 per detik di laptop dan menulis "bukan kapasitas produksi"; halaman menulis delapan lab Tahap 3
    expect(baca("labs/api-t4/output/beban.txt")).toContain("Dijalankan di laptop lab: bukan kapasitas produksi.");
    expect(badan).not.toContain("belum pernah diukur (Tidak dijalankan)");
    expect(hal315).toContain("kapasitas satu server belum diukur, dan load test Tidak dijalankan.");
    expect(hal38).toContain("Kapasitas satu server belum diukur (load test ADR 21 Tidak dijalankan), jadi angka itu belum terbukti.");
    expect(naskah).toContain('Kata "tidak sesak" dan "lega" di naskah ini berarti L kecil terhadap pool 10 di laptop lab.');
    harus('Kata "tidak sesak" di sini berarti L kecil terhadap pool 10 di laptop lab, bukan kapasitas yang terbukti.');
  });
  test("satu-satunya panggilan HTTP keluar dari api-t3 adalah ke layanan push: klien HTTP hanya di internal/push/push.go, mengirim POST /v1/pesan; PostgreSQL dan Redis komponen sendiri", () => {
    const pola = /\bhttp\.(Client|NewRequest|NewRequestWithContext|Post|Get|Head|DefaultClient)\b|\bnet\.Dial|\btls\.Dial|\bgrpc\.Dial/;
    expect(pola.test("req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, body)")).toBe(true);
    const goNon = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/api-t3/") && f.endsWith(".go") && !f.endsWith("_test.go"));
    expect(goNon.length).toBeGreaterThan(20);
    const temuan = goNon.filter((f) => pola.test(fs.readFileSync(path.join(akar, f), "utf8")));
    expect(temuan).toEqual(["labs/api-t3/internal/push/push.go"]);
    const push = baca("labs/api-t3/internal/push/push.go");
    expect(push).toContain("http.MethodPost, k.url+\"/v1/pesan\"");
    harus("Satu-satunya panggilan HTTP keluar dari `api-t3` adalah ke layanan push tiruan, yang hanya menerima pemberitahuan. PostgreSQL dan Redis adalah komponen sendiri");
    // api-t3 juga membuka koneksi ke PostgreSQL (pgx) dan Redis (go-redis): bukan panggilan HTTP, dan komponen sendiri; tidak ada klien keluar lain di go.mod
    const gomod = baca("labs/api-t3/go.mod");
    const langsung = [...gomod.split(/^require \($/m)[1]!.split(/^\)$/m)[0]!.matchAll(/^\t(\S+) v\S+$/gm)].map((m) => m[1]!);
    expect(langsung).toEqual(["github.com/jackc/pgx/v5", "github.com/redis/go-redis/v9", "golang.org/x/crypto"]);
    const pakaiRedis = goNon.filter((f) => fs.readFileSync(path.join(akar, f), "utf8").includes("github.com/redis/go-redis")).sort();
    expect(pakaiRedis).toEqual(["labs/api-t3/internal/cache/redis.go", "labs/api-t3/internal/redisbatas/redisbatas.go"]);
    expect(goNon.filter((f) => /\bnet\/smtp\b|\bnet\/rpc\b|google\.golang\.org\/grpc/.test(fs.readFileSync(path.join(akar, f), "utf8")))).toEqual([]);
  });
});

describe("sepuluh masalah Tahap 3: baris tabel sama dengan naskah dan halaman masing-masing", () => {
  const baruNaskah = (m: string) => naskah.split("\n").find((b) => b.startsWith(`| ${m} |`))!;
  const berkasHal = (id: string) => baca(`situs/src/content/docs/${dari(id).path!.replace(/\.md$/, ".mdx")}`);
  const baru: { m: string; id: string; baris: string; naskahMemuat: string[]; halamanMemuat: string[] }[] = [
    { m: "M18", id: "t3-m18", baris: "Panggilan ke layanan push di dalam transaction menahan koneksi database", naskahMemuat: ["di dalam transaction", "Tiap pembayaran menahan satu koneksi"], halamanMemuat: ["transaction"] },
    { m: "M19", id: "t3-m19", baris: "Poller outbox dengan kursor melewatkan baris yang COMMIT belakangan", naskahMemuat: ["Poller outbox membaca dengan kursor", "selesai belakangan"], halamanMemuat: ["kursor"] },
    { m: "M20", id: "t3-m20", baris: "Worker berhenti di antara kirim dan tandai terkirim, jadi notifikasi masuk dua kali", naskahMemuat: ["di antara \"kirim\" dan \"tandai terkirim\""], halamanMemuat: ["tandai terkirim"] },
    { m: "M21", id: "t3-m21", baris: "Satu proses API mati dan tidak ada yang memulainya lagi", naskahMemuat: ["Proses API satu-satunya keluar", "tidak ada yang memulainya lagi"], halamanMemuat: ["panic"] },
    { m: "M22", id: "t3-m22", baris: "Batas login per IP ada di memori tiap instance, jadi berlipat dengan dua instance", naskahMemuat: ["ada di memori tiap instance"], halamanMemuat: ["memori"] },
    { m: "M23", id: "t3-m23", baris: "Cache katalog di memori proses menampilkan dua harga", naskahMemuat: ["cache katalog di memori proses"], halamanMemuat: ["memori proses"] },
    { m: "M24", id: "t3-m24", baris: "Operasi stok offline 62 jam melewati umur key 24 jam", naskahMemuat: ["62 jam", "24 jam"], halamanMemuat: ["62 jam", "24 jam"] },
    { m: "M25", id: "t3-m25", baris: "Catatan pembayaran ditampilkan lewat `innerHTML` di dasbor", naskahMemuat: ["innerHTML"], halamanMemuat: ["innerHTML"] },
    { m: "M26", id: "t3-m26", baris: "App menerima sertifikat apa pun", naskahMemuat: ["terima sertifikat apa pun"], halamanMemuat: ["sertifikat apa pun"] },
    { m: "M27", id: "t3-m27", baris: "Satu queue diklaim menurut nomor, jadi 10.000 promo mendahului notifikasi uang", naskahMemuat: ["Satu queue urut waktu: 10.000 baris promo berada di depan notifikasi uang"], halamanMemuat: ["10.000 promo"] },
  ];
  test("tabel: sepuluh baris berurutan M18 sampai M27, tiap baris menaut ke halamannya dan teksnya memakai kata dari naskah dan halaman itu", () => {
    harus("**Sepuluh masalah, bukan satu kapasitas.** Sebelum PRD v4, Tahap 3 sudah punya sepuluh masalah. Tabel ini merangkum yang rusak dari halaman masing-masing:");
    harus("| Masalah | Yang rusak |\n|---|---|\n" + baru.map((b) => `| [[${b.id}]] | ${b.baris} |`).join("\n"));
    expect(baru.map((b) => b.id)).toEqual(Array.from({ length: 10 }, (_, i) => `t3-m${18 + i}`));
    for (const b of baru) {
      expect(dari(b.id).label, b.id).toContain(`Masalah ${b.m.slice(1)} `);
      const n = baruNaskah(b.m);
      expect(n, b.m).toBeDefined();
      for (const k of b.naskahMemuat) expect(n, `${b.m} di naskah: ${k}`).toContain(k);
      const h = berkasHal(b.id);
      for (const k of b.halamanMemuat) expect(h, `${b.id}: ${k}`).toContain(k);
    }
  });
  test("dua masalah memakai kapasitas dalam hitungannya, dijawab tanpa memperbesar apa pun: ADR 22 pool tetap 10, pool 50 menunda ±58 detik, ADR 32 tanpa jumlah pengirim", () => {
    const adr = (n: number) => naskah.split("\n").find((b) => b.startsWith(`| ${n} |`) && b.includes("|"))!;
    expect(adr(22)).toContain("pool tetap 10");
    expect(baruNaskah("M18")).toContain("pool 50 hanya menunda ke ±58 detik");
    expect(adr(32)).not.toMatch(/pengirim|serentak|worker lebih banyak/i);
    expect(baruNaskah("M27")).toContain("ADR 32 (merevisi ADR 23): kolom `kelas`, bayar dan transfer lebih dulu, top-up massal dan promo sesudahnya; promo paling banyak 5 per detik; alert umur tertua; staging; on-call");
    expect(baruNaskah("M27")).toContain("Kapasitas worker 4 ÷ 0,3 detik = 13,3 per detik");
    expect(baru.length).toBe(10);
    harus("Angka di tabel mengikuti halaman asalnya. Lama offline 62 jam adalah Asumsi naskah, umur key 24 jam berasal dari ADR 14, dan 10.000 promo adalah angka cerita (Ilustrasi).");
    harus("Hitungan kapasitas atau beban muncul di [[t3-m18]] (pool), [[t3-m23]] (katalog), dan [[t3-m27]] (worker). Di [[t3-m23]] hasilnya menunjukkan cache tidak dibutuhkan beban (Asumsi).");
    harus("Pool dan worker dijawab tanpa memperbesar apa pun. ADR 22 menahan pool di 10, karena pool 50 hanya menunda penuhnya ke ±58 detik. ADR 32 mengubah urutan klaim dan laju promo, bukan jumlah pengirim.");
    expect(badan).not.toContain("Dua dari sepuluh masalah");
    // pelajaran: hitungan kapasitas ada juga di M23 (L katalog 0,03 dari pool 10; cache tidak dibutuhkan beban), jadi bukan hanya dua masalah
    expect(berkasHal("t3-m23")).toContain("**Cache ini tidak dibutuhkan beban.**");
    expect(berkasHal("t3-m23")).toContain("(Asumsi, angka registry)");
    expect(berkasHal("t3-m24")).toContain("Lama offline 62 jam, dari Jumat 16.50 sampai Senin 06.50, adalah Asumsi naskah");
    expect(berkasHal("t3-m24")).toContain("masa berlaku 24 jam");
    expect(berkasHal("t3-m27")).toContain("jumlah 10.000 HP, dan orang yang menumpuk berasal dari naskah");
    expect(baca("situs/src/content/docs/tahap-2/retry-idempotency.mdx")).toContain("### ADR 14: key sekali per niat bayar, hasil disimpan 24 jam");
    expect(hal38).toContain("untuk n = 50 hasilnya 50 ÷ 0,868 = 57,6 detik");
    expect(berkasHal("t3-m27")).toContain("Tidak. Kapasitas jadi 20 ÷ 0,3 = 66,7 per detik");
  });
  test("kesimpulan: dugaan Raka menjawab pertanyaan yang hitungannya tidak mempersoalkan; penutup mengikuti naskah bagian 5 tanpa klaim kapasitas", () => {
    harus("Dugaan Raka menjawab pertanyaan yang hitungannya tidak mempersoalkan: puncak 17,4 tidak menunjuk sumber daya mana pun yang sesak (Asumsi; L = 0,35 koneksi dari 10).");
    harus("Masalah Tahap 3 adalah ketergantungan, bukan jumlah request per detik.");
    expect(naskah).toContain("| Estimasi | Masalah Tahap 3 adalah ketergantungan, bukan kapasitas |");
  });
});

describe("diagram Rantai: nilai simpul diturunkan dari angka halaman dan rekaman", () => {
  test("dua baris; sumber berlabel asumsi (label terlemah) dengan rujukan adr22.txt bagian F; simpul memakai puncak, batas L, dan tiga hal PRD v4", () => {
    expect(diagram.baris.length).toBe(2);
    expect(diagram.sumber.jenis).toBe("asumsi");
    expect(diagram.sumber.teks).toBe("Asumsi naskah dan registry untuk beban; rekaman lab t3-pool, adr22.txt bagian F, hanya untuk batas L; Rp0 Ilustrasi");
    const [a, b] = diagram.baris as [(typeof diagram.baris)[number], (typeof diagram.baris)[number]];
    expect(a.simpul.map((s) => s.teks)).toEqual(["Tutup buku Rp0", `Puncak ${koma(T3.puncak, 1)} per detik`, `L kurang dari ${koma(17.4 * 0.05, 2)}`]);
    expect(a.simpul[2]!.sub).toBe(`batas lab, pool ${POOL}`);
    // baris pertama bukan "hasil uji coba": hanya tutup buku yang dari uji coba; puncak adalah hitungan, L adalah batas rekaman lab
    expect([a.label, a.sub]).toEqual(["Yang sudah terjawab", "pertanyaan Tahap 3"]);
    expect(a.simpul.map((s) => s.sub)).toEqual(["data yang terlihat cocok", "hitungan dari asumsi", `batas lab, pool ${POOL}`]);
    harus("Yang sudah terjawab adalah pertanyaan Tahap 3: apakah data cocok, dan apakah beban enam kota menekan sumber daya yang dihitung. Hanya hasil tutup buku yang datang dari uji coba; puncak 17,4 adalah hitungan, dan batas L adalah rekaman lab.");
    expect(badan).not.toContain("Uji coba lolos karena ia menjawab");
    expect(a.simpul.map((s) => s.nada)).toEqual(["good", "system", "good"]);
    expect(b.simpul.map((s) => s.teks)).toEqual(["Pihak ketiga memegang uang", "Tiga tim, satu codebase", "Satu VPS"]);
    expect(b.simpul.map((s) => s.nada)).toEqual(["warn", "warn", "warn"]);
    expect(b.sub).toBe("yang diminta dan belum pernah diuji");
    expect(JSON.stringify(diagram)).not.toMatch(POLA_ID_INTERNAL);
    expect(JSON.stringify(diagram)).not.toMatch(/\d\s?B\b/);
    expect(hitung(badan, "<Rantai data={diuji} />")).toBe(1);
    expect(hitung(mdx, 'import diuji from "../../../../data/diagram/t3-m28-diuji.json";')).toBe(1);
    expect(badan.indexOf("<Rantai data={diuji} />")).toBeGreaterThan(badan.indexOf('<Blok nama="Yang sebenarnya">'));
    expect(badan.indexOf("<Rantai data={diuji} />")).toBeLessThan(badan.indexOf('<Blok nama="Coba sendiri">'));
  });
});

describe("widget kalkulator: konfigurasi dihitung mesin yang sama dengan widget, dan teks widget selaras dengan halaman", () => {
  const asumsi = DaftarAsumsi.parse(cerita.tahap.map((t) => t.asumsi));
  const skenario = siapkan(kalk, asumsi);
  test("satu Kalkulator dengan asumsi dari registry; tiga skenario Tahap 3: dasar, semua aktif (aktif 100), satu jam (faktor puncak 86.400 ÷ 3.600)", () => {
    expect(hitung(badan, "<Kalkulator client:visible data={dataKalkulator} asumsi={cerita.tahap.map((t) => t.asumsi)} />")).toBe(1);
    expect(hitung(mdx, 'import Kalkulator from "../../../widgets/kalkulator/Kalkulator.tsx";')).toBe(1);
    expect(hitung(mdx, 'import dataKalkulator from "../../../../data/widget/t3-m28-kalkulator.json";')).toBe(1);
    expect(hitung(mdx, 'import cerita from "../../../../data/cerita.json";')).toBe(1);
    expect(kalk.skenario).toEqual([{ label: "Enam kota", tahap: 3 }, { label: "Semua aktif", tahap: 3, ubah: { aktif: 100 } }, { label: "Satu jam", tahap: 3, ubah: { puncak: 86400 / 3600 } }]);
    expect(kalk.awal).toBe(0);
    expect(skenario[0]).toEqual(asumsi[2]);
    expect(skenario[1]!.aktif).toBe(100);
    expect(skenario[2]!.puncak).toBe(24);
    expect(kalk.sumber).toEqual({ jenis: "asumsi", teks: "Asumsi naskah dari cerita.json, bukan pengukuran." });
    expect(kalk.label.sumber).toBe("Asumsi");
    expect(kalk.label.kesimpulan).toBe("Di jam paling ramai, satu request datang kira-kira tiap {jarak}.");
    harus("Angka 17,4 adalah Asumsi, dan naskah tidak menyebut beban uji coba yang sebenarnya.");
    harus("lalu ubah satu hal: ganti skenario dan lihat baris mana yang berubah.");
  });
  test("tebakan: 100 ÷ 25 = 4 kali, jawaban di pilihan ketiga (berbeda dari kalkulator 1.37 dan 2.30), bukan pilihan terpanjang; alasan memakai ±17 dan ±69 dari mesin widget", () => {
    const ratio = semuaAktif.puncak / T3.puncak;
    expect(ratio).toBeCloseTo(4, 10);
    expect(kalk.tebak.pilihan[kalk.tebak.jawaban]).toBe(`${ratio} kali`);
    expect(kalk.tebak.pilihan.indexOf("10 kali"), "distraktor: user terdaftar tetap 10.000, jadi 10 kali salah").toBeGreaterThanOrEqual(0);
    expect(kalk.tebak.jawaban).toBe(2);
    expect(kalk.tebak.skenario).toBe(1);
    expect(kalk.skenario[kalk.tebak.skenario]!.label).toBe("Semua aktif");
    const t1 = DataKalkulator.parse(JSON.parse(baca("situs/data/widget/t1-m8-kalkulator.json")));
    const t2 = DataKalkulator.parse(JSON.parse(baca("situs/data/widget/t2-estimasi-kalkulator.json")));
    expect([t1.tebak.jawaban, t2.tebak.jawaban]).toEqual([1, 1]);
    expect(kalk.tebak.jawaban).not.toBe(t1.tebak.jawaban);
    const terpanjang = Math.max(...kalk.tebak.pilihan.map((p) => p.length));
    expect(kalk.tebak.pilihan[kalk.tebak.jawaban]!.length).toBeLessThan(terpanjang);
    expect(kalk.tebak.q).toBe(`Seandainya semua ${ribu(reg.user)} karyawan memakai Rekeningo setiap hari, bukan ${reg.aktif}%. Berapa kali lipat puncak request per detik dibanding asumsi naskah?`);
    expect(kalk.tebak.alasan).toBe(`Persentase aktif naik dari ${reg.aktif}% ke 100%, jadi puncak naik 100 ÷ ${reg.aktif} = ${ratio} kali, dari ±${duaAngka(T3.puncak)} ke ±${duaAngka(semuaAktif.puncak)} request per detik. User terdaftar tetap ${ribu(reg.user)}, jadi bukan 10 kali.`);
    expect(kalk.label.lanjut).toBe(`Sekarang pilih skenario “${kalk.skenario[kalk.tebak.skenario]!.label}” di atas tabel.`);
    harus("Pilih Semua aktif");
    harus("Pilih Satu jam");
  });
  test("tabel widget: nilai awal 10.000, 2.500, 150.000, 1,7, 17 dan jarak 58 ms sama dengan hitungan; semua skenario punya puncak naik dari asumsi", () => {
    const h = skenario.map((a) => hitungBeban(a));
    expect(h.map((x) => duaAngka(x.puncak))).toEqual(["17", "69", "42"]);
    expect(h.map((x) => jarakKal(x.jarak, SATUAN))).toEqual(["58 ms", "14 ms", "24 ms"]);
    expect(h[0]!.reqHari).toBe(T3.reqHari);
    expect(h[1]!.reqHari).toBe(semuaAktif.reqHari);
  });
});

describe("kartu Cek diri: empat kartu sama dengan kartu.json dan fakta yang sama dengan hitungan, rekaman, dan naskah", () => {
  const soal = [...badan.matchAll(/^\*\*(\d+)\.\*\* (.+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/gm)].map((m) => ({ n: m[1]!, tanya: m[2]!, jawab: m[3]!.replace(/\n\n/g, " ") }));
  test("empat soal bernomor dengan satu details Jawaban tiap soal; kartu.json memuat soal yang sama dan jawabannya", () => {
    expect(soal.map((s) => s.n)).toEqual(["1", "2", "3", "4"]);
    expect(hitung(badan, '<details class="success">')).toBe(4);
    const k = kartu.filter((x) => x.halaman === "t3-m28");
    expect(k.map((x) => x.id)).toEqual(["t3-m28-1", "t3-m28-2", "t3-m28-3", "t3-m28-4"]);
    k.forEach((x, i) => {
      expect(x.judul).toBe("3.28 M28: Uji coba enam kota lolos, PRD v4 datang");
      expect(x.url).toBe("tahap-3/m28-prd-v4/");
      expect(x.tanya).toBe(soal[i]!.tanya);
      expect(x.jawab).toBe(soal[i]!.jawab);
    });
  });
  test("jawaban memuat fakta yang sama dengan hitungan dan rekaman: 17,4 dari rumus, 0,35, 0,87 = 17,4 × 0,05, aturan 5 ADR 21, tiga hal PRD v4", () => {
    expect(soal[1]!.jawab).toContain(`Dari hitungan ${ribu(reg.user)} × ${reg.aktif}% × ${reg.req} ÷ 86.400 × ${reg.puncak} = ${koma(T3.puncak, 1)}, dengan semua masukan Asumsi dari registry.`);
    expect(soal[1]!.jawab).toContain(`L seluruh request ${koma(T3.puncak, 1)} × ${koma(W, 2)} = ${koma(L3, 2)} koneksi juga Asumsi, karena W ${W * 1000} ms Asumsi.`);
    expect(soal[2]!.jawab).toContain(`W rata-rata di bawah 50 ms, jadi L di bawah ${koma(T3.puncak, 1)} × 0,05 = ${koma(17.4 * 0.05, 2)}, di satu laptop dengan beban berjadwal.`);
    expect(soal[2]!.jawab).toContain("Load test dari aturan 5 ADR 21 Tidak dijalankan, jadi kapasitas satu server tetap belum diukur.");
    expect(soal[2]!.tanya).toContain(`L di bawah ${koma(17.4 * 0.05, 2)} koneksi pada ${koma(T3.puncak, 1)} request per detik`);
    expect(soal[0]!.jawab).toContain("(Ilustrasi: angka itu dari naskah)");
    expect(soal[0]!.jawab).toContain("pihak ketiga yang menggerakkan uang, tiga tim di satu codebase, atau satu VPS yang mati.");
    expect(soal[3]!.jawab).toContain("Pihak ketiga yang menggerakkan uang, tiga tim di satu codebase, dan satu VPS sebagai titik gagal tunggal.");
    expect(soal[3]!.jawab).toContain("Timnya empat orang (Asumsi cerita) di satu codebase Go");
    expect(naskah).toContain("Tim jadi empat orang dalam 10 minggu (Asumsi cerita)");
  });
});

describe("struktur halaman: tingkat heading, daftar, label, dan tanpa ID internal", () => {
  test("hanya satu heading (h3 Cek diri, di blok terakhir); satu tebakan details question; tanpa daftar bernomor; tujuh butir daftar di Konsep yang lahir; tiga tabel", () => {
    const heads = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(heads).toEqual(["### Cek diri"]);
    expect(badan.indexOf("### Cek diri")).toBeGreaterThan(badan.indexOf('<Blok nama="Konsep yang lahir">'));
    expect(hitung(badan, '<details class="question">')).toBe(1);
    expect(hitung(badan, "<details>")).toBe(0);
    expect(badan).not.toMatch(/^\d+\. /m);
    expect(hitung(badan, "\n- [[")).toBe(7);
    expect(badan.split("\n").filter((b) => /^\|---/.test(b)).length).toBe(3);
    expect(hitung(badan, "<Snippet ")).toBe(1);
    expect(hitung(badan, "<Kalkulator ")).toBe(1);
  });
  test("jawaban tebakan: dua hal terbukti, tiga hal tidak; Konsep yang lahir menunjuk 3.29, 3.30, 3.27, 3.8, 2.29, 1.37, 3.32 dengan isi dari naskah", () => {
    harus("Blok berikutnya memisahkan hasil yang ada dari tiga hal itu.");
    harus("- [[t3-estimasi]]: estimasi Tahap 3 → 4. Beban PRD v4 dihitung dari angka Tahap 3 sebelum memilih komponen.");
    harus('- [[t3-adr-33]]: ADR 33, "Sengaja belum dilakukan". Microservices, Kubernetes, read replica, PgBouncer, CDC, VPS kedua, dan cache saldo ditunda, masing-masing dengan alasan dari angka.');
    harus("- [[t3-tim-infra]]: retrospektif tim, yaitu staging, alert, dan on-call dari ADR 32 yang diputuskan sebelum PRD v4.");
    harus("- [[t3-pool]]: L = λ × W menghitung koneksi yang terpegang. Hitungan 0,35 di halaman ini memakainya.");
    harus("- [[t2-m17]]: pertanyaan yang sama di Tahap 2, dengan puncak ±1,4 request per detik.");
    harus("- [[t1-m8]]: pertanyaan yang sama di Tahap 1, dengan rumus puncak yang sama.");
    harus("- [[t3-jembatan]]: PRD v4 selengkapnya, dengan tebakan mana yang pecah lebih dulu.");
    const adr32 = naskah.split("\n").find((b) => b.startsWith("| 32 |"))!;
    for (const k of ["staging", "on-call", "alert umur tertua"]) expect(adr32, k).toContain(k);
    const t2 = cerita.tahap[1]!.asumsi;
    expect(koma(hitungBeban({ user: t2.user, aktif: t2.aktif, req: t2.req, puncak: t2.puncak }).puncak, 1)).toBe("1,4");
    expect(baca("situs/src/content/docs/tahap-2/m17-prd-v3.mdx")).toContain("| Puncak request per detik (Tahap 2) | ±1,4 |");
    expect(baca("situs/src/content/docs/tahap-1/m8-uji-coba-lolos.mdx")).toContain("puncak per detik    = rata-rata per detik × faktor puncak");
  });
  test("tanpa ID internal, tanpa emoji, tanpa tanda seru, tanpa kata yang dilarang gaya-bahasa, tanpa Anda atau kita", () => {
    expect(badan).not.toMatch(POLA_ID_INTERNAL);
    expect(frontmatter).not.toMatch(POLA_ID_INTERNAL);
    expect(badan).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(badan).not.toMatch(/!(?!\[)/);
    expect(badan).not.toMatch(/\b(Anda|kita|pengguna|mudah|cukup|tinggal)\b/i);
    expect(badan).not.toMatch(/terukur|ter-ukur/i);
    expect(hitung(badan, "(Ilustrasi)")).toBe(3);
    expect(hitung(badan, "Ilustrasi")).toBe(5);
    expect(hitung(badan, "Tidak dijalankan")).toBe(3);
    expect(hitung(badan, "Asumsi")).toBeGreaterThanOrEqual(10);
    expect(hitung(badan, "0,87 ")).toBeGreaterThanOrEqual(1);
    expect(hitung(badan, "0,868")).toBe(1);
  });
  test("front matter dikunci: title dan description memuat Minggu 10, Rp0, 17,4, dan tiga hal PRD v4", () => {
    expect(frontmatter).toBe(
      'title: "3.28 M28: Uji coba enam kota lolos, PRD v4 datang"\ndescription: Minggu 10. Uji coba enam kota lolos dengan selisih Rp0, lalu Sinta datang dengan PRD v4. Rp0 dan puncak 17,4 request per detik menjawab data dan beban yang sudah ada, sedangkan tiga hal yang diminta PRD v4 belum pernah diuji.\n',
    );
  });
});

describe("dunia angka tertutup: tiap token angka dan konteksnya dihitung dari sumber, supaya mutasi yang membangkitkan ulang kunci kata tetap gagal", () => {
  const barisNaskah = naskah.split("\n").find((b) => b.startsWith("| M28 |"))!;
  test("selisih rupiah di halaman, Rantai, dan description sama dengan selisih di baris M28 naskah (Rp0)", () => {
    const selisih = cocok(barisNaskah, /selisih (Rp[\d.]+)\./)[1]!;
    expect(selisih).toBe("Rp0");
    const semua = [...badan.matchAll(/Rp\d+(?:\.\d{3})*/g)].map((m) => m[0]);
    expect(semua.length).toBeGreaterThanOrEqual(6);
    expect(new Set(semua)).toEqual(new Set([selisih]));
    expect(diagram.baris[0]!.simpul[0]!.teks).toBe(`Tutup buku ${selisih}`);
    expect(diagram.sumber.teks).toContain(`${selisih} Ilustrasi`);
    expect(frontmatter).toContain(`dengan selisih ${selisih},`);
  });
  test("angka berkoma: himpunan token di badan sama dengan himpunan yang dihitung dari registry, rumus, dan halaman tetangga", () => {
    const t2 = cerita.tahap[1]!.asumsi;
    const puncakT2 = koma(hitungBeban({ user: t2.user, aktif: t2.aktif, req: t2.req, puncak: t2.puncak }).puncak, 1);
    const lambda = (T3.dau * reg.trx) / 86400 * reg.puncak;
    const boleh = new Set([
      koma(W, 2), koma(0.05, 2), koma(L3, 2), koma(satuJam.puncak * W, 2), koma(17.4 * 0.05, 2), koma(semuaAktif.puncak * W, 2),
      koma(T3.rata, 2), koma(T3.puncak, 1), koma((POOL - 1) / W / T3.puncak, 1), koma(satuJam.puncak, 1), koma(semuaAktif.puncak, 1),
      koma(lambda, 3), koma(T3.rata, 3), koma(T3.puncak, 2), puncakT2, duaAngka(T3.rata),
    ]);
    const token = [...badan.matchAll(/\d+,\d+/g)].map((m) => m[0]);
    expect([...new Set(token.filter((x) => !boleh.has(x)))], "token berkoma di halaman yang tidak dihitung dari sumber").toEqual([]);
    for (const b of boleh) expect(token, `nilai yang dihitung tidak dipakai halaman: ${b}`).toContain(b);
  });
  test("angka berpemisah ribuan: user, aktif, request per hari, detik per hari dan per jam, pembayaran per hari", () => {
    const boleh = new Set([ribu(reg.user), ribu(T3.dau), ribu(T3.reqHari), ribu(86400), ribu(3600), ribu(T3.dau * reg.trx)]);
    const token = [...badan.matchAll(/\d{1,3}(?:\.\d{3})+/g)].map((m) => m[0]);
    expect([...new Set(token.filter((x) => !boleh.has(x)))]).toEqual([]);
    for (const b of boleh) expect(token, b).toContain(b);
  });
  test("konteks bernomor: Tahap, api-t, ADR, dan baris tabel Dibaca di cocok dengan registry dan halaman tetangga", () => {
    expect(new Set([...badan.matchAll(/Tahap \d+(?: → \d+)?/g)].map((m) => m[0]))).toEqual(new Set(["Tahap 3", "Tahap 3 → 4", "Tahap 2", "Tahap 1"]));
    expect(dari("t3-m28").tahap).toBe(3);
    expect(dari("t3-estimasi").judul).toBe("Estimasi Tahap 3 → 4");
    expect(dari("t2-m17").tahap).toBe(2);
    expect(dari("t1-m8").tahap).toBe(1);
    harus(`| Hal baru di PRD v4 | Yang ada di Tahap ${dari("t3-m28").tahap} | Dibaca di |`);
    expect([...badan.matchAll(/\bapi-t\d\b/g)].map((m) => m[0])).toEqual(["api-t3", "api-t3"]);
    expect(new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => m[1]))).toEqual(new Set(["14", "21", "22", "32", "33"]));
    expect(dari("t3-adr-33").adr).toEqual([33]);
    expect(dari("t3-tim-infra").adr).toEqual([32]);
    expect(hal231).toContain("ADR 21");
  });
  test("kartu 4: jawaban memuat lingkup HTTP dan api-t3, sama dengan sel tabel", () => {
    const soalKartu = kartu.filter((x) => x.halaman === "t3-m28");
    expect(soalKartu[3]!.jawab).toContain("Di Tahap 3 satu-satunya panggilan HTTP keluar dari `api-t3` adalah ke layanan push tiruan.");
    expect(soalKartu[1]!.tanya).toBe(`Dari mana angka puncak ${koma(T3.puncak, 1)} request per detik, dan berlabel apa?`);
    expect(soalKartu[0]!.tanya).toContain("selisih Rp0");
  });
});
