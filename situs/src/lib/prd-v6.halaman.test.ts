// Penjaga halaman 6.1 (keputusan 1710 sampai 1712): angka, nomor ADR, nomor halaman, ID `[[...]]`, label sumber, kutipan halaman
// ADR Tahap 5, dan klaim negatif di prd-v6.mdx dan di diagram Rantai t6-prd-sebelum-sesudah.json diturunkan dari naskah Tahap 6
// (Latar, bagian 1, bagian 3, jalur per peran), registry cerita.json, kunci tebakan 5.32, halaman 5.1, 5.17, 5.25, 5.27, 5.28, 5.30,
// 5.9, 5.13, 5.21, 5.23, dan 5.26 (halaman ADR-nya, bukan naskah), dan baris riset R6-110 sampai R6-114. Tahap 6 tanpa lab: halaman ini
// tidak punya rekaman, jadi tiap angka berlabel Asumsi, Hitungan, Ilustrasi, atau Tidak dijalankan. Blok "Yang dibuka lagi dari Tahap 5"
// membuka jawaban tebakan 5.32 dari kalimat yang sudah tertulis di halaman ADR-nya (penalaran, Tidak dijalankan).
// BARIS_MDX di prd-v6.halaman.nilai.ts adalah sidik teks halaman (tiap baris persis); tes turunan di bawah berdiri sendiri tanpa
// sidik itu, supaya mutan yang mengubah makna (bukan hanya huruf) tertangkap oleh sumbernya.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t6-prd-sebelum-sesudah.json";
import dataTebak from "../../data/widget/t5-jembatan-tebak.json";
import { cekTemplat, daftarBlok } from "./blok";
import { DataRantai } from "./rantai";
import { BARIS_MDX, BARIS_RISET, BENTUK_MDX, NILAI_RANTAI } from "./prd-v6.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-6/prd-v6.mdx";
const mdx = baca(BERKAS);
const front = mdx.split(/^---\n/m)[1]!;
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah = baca("plan/CERITA-TAHAP-6.md");
const riset6 = baca("plan/RISET-TAHAP-6.md");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const rantai = DataRantai.parse(diagramMentah);

interface H { id: string; judul: string; path: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; peran?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const berkasHalaman = (id: string): string => `situs/src/content/docs/${dari(id).path.replace(/\.md$/, ".mdx")}`;
const teksHalaman = (id: string): string => baca(berkasHalaman(id)).replace(/\s+/g, " ");
const nomorDari = (n: string): H => {
  const h = hal.find((x) => x.nomor === n);
  if (!h) throw new Error(`registry: nomor ${n} tidak ada`);
  return h;
};

const bagian = (sumber: string, awal: string, akhir: string): string => {
  const i = sumber.indexOf(awal);
  expect(i, `bagian tidak ada: ${awal}`).toBeGreaterThanOrEqual(0);
  return sumber.slice(i + awal.length).split(akhir)[0]!;
};
const cocok = (teks: string, re: RegExp): RegExpMatchArray => {
  const m = teks.match(re);
  expect(m, `tidak cocok: ${re}`).not.toBeNull();
  return m!;
};
const hitung = (s: string, x: string): number => s.split(x).length - 1;
const sel = (b: string): string[] => b.split("|").slice(1, -1).map((c) => c.trim());
const tabel = (sumber: string, awal: string): string[][] => {
  const baris = sumber.split("\n");
  const i = baris.findIndex((b) => b.startsWith(awal));
  expect(i, `tabel tidak ada: ${awal}`).toBeGreaterThanOrEqual(0);
  const out: string[][] = [];
  for (let j = i; j < baris.length && baris[j]!.startsWith("|"); j++) out.push(sel(baris[j]!));
  return out.filter((r) => !r.every((c) => /^-+$/.test(c)));
};
const barisAwal = (sumber: string, awal: string): string => {
  const b = sumber.split("\n").find((x) => x.startsWith(awal));
  expect(b, `baris tidak ada: ${awal}`).toBeDefined();
  return b!;
};
const di = (sumber: string, nama: string, kalimat: string) => expect(sumber, `${nama} tidak memuat: ${kalimat}`).toContain(kalimat);
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const sekali = (kalimat: string) => expect(hitung(badan, kalimat), `harus tepat satu kali: ${kalimat}`).toBe(1);
// Pembulatan setengah ke atas seperti pembaca (bukan toFixed), titik ribuan dan koma desimal.
const bulat = (n: number, d = 0): number => Math.floor(n * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const id = (n: number, d = 0): string => {
  const [a, b] = bulat(n, d).toFixed(d).split(".");
  return a!.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (b ? "," + b : "");
};
const num = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));

// ---- masukan: naskah, registry, dan halaman Tahap 5, bukan halaman ini ------------------------------------------------------
const latar = bagian(naskah, "## Latar: dari satu negara ke tiga", "\n## 1. ");
const bag1 = bagian(naskah, "## 1. PRD v6 · Rekeningo untuk tiga negara", "\n## 2. ");
const bag3 = bagian(naskah, "## 3. Inti teknis Tahap 6 · Tiap data punya satu rumah", "\n## 3b. ");
const draf = bagian(naskah, "### Pilihan draf yang perlu dilihat pemilik", "\n## Latar: ");
const jalur = naskah.split("Jalur per peran:")[1]!;
const a5 = cerita.tahap[4]!.asumsi;
const userV6 = num(cocok(bag1, /(\d{1,3}(?:\.\d{3})+) user terdaftar/)[1]!);
const aktifPersen = Number(cocok(bag1, /\((\d+)% dari [\d.]+\)/)[1]);
const reqPerUser = Number(cocok(bag3, /(\d+) request per user aktif per hari/)[1]);
const puncak = Number(cocok(bag3, /faktor puncak (\d+)/)[1]);
const detikHari = num(cocok(bag3, /([\d.]+) detik per hari/)[1]!);
const trxM = cocok(barisAwal(bag3, "| Transaksi uang |"), /× (\d) = ([\d.]+) per hari \(trx (\d): ([\d.]+)\)/);
const trxDasar = Number(trxM[1]);
const trxDua = Number(trxM[3]);
const bagi = cocok(draf, /Pembagian user (\d+)%, (\d+)%, (\d+)%/);
const persenNegara = [Number(bagi[1]), Number(bagi[2]), Number(bagi[3])];
const aktif = (userV6 * aktifPersen) / 100;
const reqHari = aktif * reqPerUser;
const reqRata = reqHari / detikHari;
const reqPuncak = reqRata * puncak;
const trxHari = aktif * trxDasar;
const trxHari2 = aktif * trxDua;
const trxPuncak = (trxHari / detikHari) * puncak;
const trxPuncak2 = (trxHari2 / detikHari) * puncak;
const reqPuncak5 = ((a5.user * a5.aktif) / 100 * a5.req) / 86400 * a5.puncak;
const trxPuncak5 = (((a5.user * a5.aktif) / 100 * trxDasar) / 86400) * a5.puncak;

// Tim: tabel naskah (Latar) lawan tabel halaman 5.1.
const timNaskah = tabel(latar, "| Tim | Orang |").slice(1).map((r) => ({ tim: r[0]!, orang: Number(r[1]), pemimpin: r[2]! }));
const hal51 = baca("situs/src/content/docs/tahap-5/prd-v5.mdx");
const tim51 = tabel(hal51, "| Tim | Memegang |").slice(1).map((r) => cocok(r[0]!, /^(.+): (\d) orang, dipimpin (\w+)$/));
const jumlahTim = timNaskah.reduce((s, t) => s + t.orang, 0);
const fungsi = ["Platform", "SRE", "Security"];
const orangFungsi = timNaskah.filter((t) => fungsi.includes(t.tim)).reduce((s, t) => s + t.orang, 0);
const orangProduk = jumlahTim - orangFungsi;
const orang5 = tim51.reduce((s, m) => s + Number(m[2]), 0);
const timBaru = timNaskah.filter((t) => !tim51.some((m) => m[1] === t.tim)).map((t) => t.tim);

// ADR 52 (5.17) dan ADR 56 (5.25) dibaca ke halamannya.
const t517 = teksHalaman("t5-pooler");
const t525 = teksHalaman("t5-waf");
const poolPod = Number(cocok(t517, /Pool tiap pod tetap (\d+)\./)[1]);
const batasClient = Number(cocok(t517, /dinaikkan dari bawaan 100 ke (\d+) per instance/)[1]);
const serverPool = Number(cocok(t517, /dibatasi (\d+) dari (\d+) tersedia/)[1]);
const tersedia = Number(cocok(t517, /dibatasi (\d+) dari (\d+) tersedia/)[2]);
const svc = cocok(t517, /Naskah: (\d+) service × (\d+) pod/);
const jumlahService = Number(svc[1]);
const podTahap5 = Number(svc[2]);
const contoh = cocok(t517, /(\d+) pod tiap service memberi (\d+) client lawan (\d+) per instance \(Hitungan atas Asumsi\)/);
const podContoh = Number(contoh[1]);
const clientContoh = Number(contoh[2]);
const lamaQuery = num(cocok(hal51, /× (0,\d+) detik lama satu request memegang koneksi/)[1]!);
const podV6 = podTahap5 * (reqPuncak / reqPuncak5);
const clientV6 = jumlahService * podV6 * poolPod;
const podPertama = Math.floor(batasClient / (jumlahService * poolPod)) + 1;
const clientPertama = jumlahService * podPertama * poolPod;
const kuota = cocok(t525, /(\d+) mitra × (\d+) per detik = ([\d.]+) per detik, yaitu (\d,\d) kali puncak ([\d.,]+)/);
const mitra = Number(kuota[1]);
const perMitra = Number(kuota[2]);
const mitraV6 = mitra * (userV6 / a5.user);
const besarPersen = Math.max(...persenNegara);

describe("registry, urutan baca, dan kerangka blok", () => {
  test("t6-prd ada, jenis prd, nomor 6.1, prasyarat t5-jembatan dan t5-onprem, dan judul cocok dengan title", () => {
    const h = dari("t6-prd");
    expect(h.ada).toBe(true);
    expect(h.nomor).toBe("6.1");
    expect(h.jenis).toBe("prd");
    expect(h.inti).toBe(true);
    expect(h.path).toBe("tahap-6/prd-v6.md");
    expect(h.prasyarat).toEqual(["t5-jembatan", "t5-onprem"]);
    expect(h.adr).toBeUndefined();
    expect(front).toContain(`title: "${h.nomor} ${h.judul}"`);
  });
  test("peran registry sama dengan jalur per peran naskah: hanya Mobile menyebut 6.1; Backend 'hampir semua'", () => {
    const pernah = (nama: string): boolean => /\b6\.1\b(?!\d)/.test(jalur.split("\n").find((b) => b.includes(`**${nama}**`)) ?? "");
    expect(["Mobile", "Backend", "DevOps", "Security"].filter(pernah)).toEqual(["Mobile"]);
    expect(jalur).toContain("**Backend** hampir semua");
    expect(dari("t6-prd").peran).toEqual(["mobile"]);
  });
  test("baris meta: menit registry, prasyarat registry, dan Jalur inti", () => {
    const h = dari("t6-prd");
    const meta = barisAwal(badan, '<p class="meta">');
    const pras = h.prasyarat!.map((p) => `[[${p}]]`).join(", ");
    expect(meta).toBe(`<p class="meta">Baca ${h.menit} menit · Prasyarat: ${pras} · Jalur inti</p>`);
  });
  test("URUT_BACA di kedua berkas memuat 6 sesudah 5, dan Berikutnya 5.32 menuju 6.1 di urutan baca", () => {
    const mjs = baca("situs/tools/registri.mjs").match(/const URUT_BACA = \[(.+?)\];/)![1]!.replaceAll('"', "").split(", ");
    const py = baca("tools/registri.py").match(/URUT_BACA = \((.+?)\)/)![1]!.replaceAll('"', "").split(", ");
    expect(mjs).toEqual(["pembuka", "1", "2", "3", "4", "5", "6", "sampingan"]);
    expect(py).toEqual(mjs);
    // Halaman lama tanpa nomor (T5, D2, ...) dilewati urutan baca karena penggantinya ada; eval_tahap.py rantai 5 menjalankan urutan penuh.
    const urut = mjs.flatMap((k) => hal.filter((h) => String(h.tahap) === k && h.ada && h.nomor));
    const i = urut.findIndex((h) => h.id === "t5-jembatan");
    expect(urut[i]!.nomor).toBe("5.32");
    expect(urut[i + 1]!.nomor).toBe("6.1");
    expect(urut.filter((h) => h.tahap === 6).map((h) => h.nomor)).toEqual(["6.1"]);
  });
  test("tujuh blok bernama, templat prd lolos, hanya blok pertama terbuka, dan blok terakhir bernama persis seperti janji 5.32", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual([
      "Latar masalah", "Tujuan dan user", "Ruang lingkup", "Metrik dan batasan", "Tim dan risiko", "Pertanyaan terbuka", "Yang dibuka lagi dari Tahap 5",
    ]);
    expect(cekTemplat("prd", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Latar masalah"]);
    expect(badan).toContain('<Blok nama="Yang dibuka lagi dari Tahap 5">');
    expect(hitung(badan, "[[t5-jembatan]]")).toBeGreaterThanOrEqual(3);
    const jembatan = baca("situs/src/content/docs/tahap-5/jembatan-prd-v6.mdx");
    di(jembatan, "5.32", 'di blok "Yang dibuka lagi dari Tahap 5"');
    di(jembatan, "5.32", "halaman pertama Tahap 6");
  });
});

describe("kata bilangan dan daftar dihitung ulang dari sumber", () => {
  test("tim: tabel halaman sama dengan tabel naskah; 38 + 15 = 53; 8 tim lama + 3 tim baru = 11; rata-rata 4,8", () => {
    const rows = tabel(badan.split('<Blok nama="Tim dan risiko">')[1]!, "| Tim | Memegang |").slice(1);
    expect(rows).toHaveLength(timNaskah.length);
    rows.forEach((r, i) => {
      const t = timNaskah[i]!;
      const memegang = barisAwal(latar, `| ${t.tim} |`);
      expect(sel(memegang)[3], `memegang ${t.tim}`).toBe(r[1]);
      const pemimpin = t.pemimpin.startsWith("(") ? "" : `, dipimpin ${t.pemimpin.replace(/ \(.*\)$/, "")}`;
      expect(r[0], `baris tim ${t.tim}`).toBe(`${t.tim}: ${t.orang} orang${pemimpin}`);
    });
    expect([jumlahTim, orangProduk, orangFungsi, orang5, timNaskah.length, tim51.length, timBaru]).toEqual([53, 38, 15, 28, 11, 8, ["Risiko", "Wilayah", "Pelaporan"]]);
    expect(timNaskah.filter((t) => !fungsi.includes(t.tim))).toHaveLength(8);
    harus(`Tim tumbuh dari ${orang5} menjadi ${jumlahTim} orang selama 24 minggu (Asumsi cerita). Delapan tim Tahap 5 menjadi sebelas tim, dengan tiga tim baru: ${timBaru.slice(0, 2).join(", ")}, dan ${timBaru[2]}.`);
    harus(
      `Delapan tim produk berjumlah ${timNaskah.filter((t) => !fungsi.includes(t.tim)).map((t) => t.orang).join(" + ")} = ${orangProduk} orang. Tiga tim fungsi (Platform, SRE, Security) berjumlah ${timNaskah.filter((t) => fungsi.includes(t.tim)).map((t) => t.orang).join(" + ")} = ${orangFungsi} orang. Totalnya ${jumlahTim} orang, dan rata-ratanya ${jumlahTim} ÷ ${timNaskah.length} = ${id(jumlahTim / timNaskah.length, 1)} orang per tim (Hitungan atas Asumsi cerita).`,
    );
    di(naskah, "naskah", `Rata-rata ${jumlahTim} ÷ ${timNaskah.length} = ${id(jumlahTim / timNaskah.length, 1)} orang per tim`);
    di(naskah, "naskah", "Delapan tim produk berjumlah 5 + 5 + 5 + 5 + 4 + 5 + 5 + 4 = 38 orang");
  });
  test("tiga hal berubah, tiga risiko, tiga pertanyaan, dua tokoh baru, dan delapan butir lingkup dihitung dari butir yang dirujuk", () => {
    const latarBlok = badan.split('<Blok nama="Tujuan dan user">')[0]!;
    expect(latarBlok.match(/^\d\. \*\*/gm)).toHaveLength(3);
    harus("Tiga hal berubah sekaligus.");
    di(latar, "naskah", "Tiga hal berubah sekaligus.");
    const tim = badan.split('<Blok nama="Tim dan risiko">')[1]!.split("</Blok>")[0]!;
    expect(tim.match(/^- \*\*/gm)).toHaveLength(2);
    harus("Tahap 6 punya dua tokoh baru:");
    expect(naskah.split("### Tokoh baru")[1]!.split("Tokoh lama tetap:")[0]!.match(/^\| \*\*/gm)).toHaveLength(2);
    expect(tim.split("Sinta menulis tiga risiko:")[1]!.match(/^\d\. /gm)).toHaveLength(3);
    const terbuka = badan.split('<Blok nama="Pertanyaan terbuka">')[1]!.split("</Blok>")[0]!;
    expect(terbuka.match(/^\d\. /gm)).toHaveLength(3);
    harus("Tiga pertanyaan ini ada di PRD v6, tapi belum dijawab:");
    expect(bag1.split("**Pertanyaan terbuka di PRD.**")[1]!.split("Ketiganya tidak dijawab")[0]!.match(/^- /gm)).toHaveLength(3);
    const lingkup = tabel(badan.split('<Blok nama="Ruang lingkup">')[1]!, "| Prioritas |").slice(1);
    const lingkupNaskah = tabel(bag1, "| Prioritas |").slice(1);
    expect(lingkup.map((r) => `${r[0]} ${r[1]}`)).toEqual(lingkupNaskah.map((r) => `${r[0]} ${r[1]}`));
    expect(lingkup.map((r) => r[0])).toEqual(["P0", "P0", "P0", "P0", "P0", "P0", "P1", "P1"]);
    expect(lingkup.some((r) => r[0] === "P2")).toBe(false);
    expect(hitung(badan, "P2")).toBe(1);
    harus("PRD v6 tidak punya prioritas P2 yang menunjuk ke dokumen berikutnya.");
    di(bag1, "naskah", "PRD v6 tidak punya prioritas P2 yang menunjuk ke dokumen berikutnya.");
  });
  test("pecah: tiga ADR cocok, dua belum cocok, dan enam ADR dibaca ulang dihitung dari kunci tebakan 5.32 dan naskah", () => {
    const adrDi = (s: string) => [...s.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1]));
    const benar = dataTebak.pilihan.filter((p) => p.benar);
    expect(benar).toHaveLength(1);
    expect(adrDi(benar[0]!.teks)).toEqual([58, 59, 60]);
    expect(dataTebak.pilihan.filter((p) => !p.benar).map((p) => adrDi(p.teks)[0])).toEqual([52, 56]);
    harus("Jawaban yang cocok dengan halaman ADR-nya adalah ADR 58, ADR 59, dan ADR 60.");
    harus("Dua pilihan lain di tebakan itu, ADR 52 dan ADR 56, dinilai belum cocok.");
    const baca6 = naskah.split("Penulis halaman juga membaca ulang enam ADR Tahap 5 terhadap PRD v6")[1]!.split("\n## 2.")[0]!.replace(/\s+/g, " ");
    const pasangan = [...baca6.matchAll(/ADR (\d+)(?: \([^)]*\))? dilanjutkan ADR (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(pasangan).toEqual([[48, 64], [50, 62], [55, 63], [57, 66], [54, 65], [59, 67]]);
    const enam = tabel(badan, "| ADR | Yang tertulis di halaman Tahap 5 |").slice(1);
    expect(enam).toHaveLength(6);
    expect(enam.map((r) => Number(r[0]!.match(/^(\d+) /)![1]))).toEqual([48, 50, 55, 57, 54, 59]);
    harus("Enam ADR Tahap 5 lain dibaca ulang terhadap PRD v6, dengan pola [[t5-prd]].");
  });
});

function teksHalamanMentah(idh: string): string {
  return baca(berkasHalaman(idh));
}

describe("kutipan halaman ADR Tahap 5 dibaca ke halamannya, nomor ADR dan tautan cocok dengan registry", () => {
  const tabelPecah = tabel(badan, "| ADR | Kalimat di halaman Tahap 5 |").slice(1);
  const tabelEnam = tabel(badan, "| ADR | Yang tertulis di halaman Tahap 5 |").slice(1);
  const baris = (r: string[]): { adr: number; id: string } => {
    const m = cocok(r[0]!, /^(\d+) \(\[\[([a-z0-9-]+)\]\]\)$/);
    return { adr: Number(m[1]), id: m[2]! };
  };
  const nomorKeId = (s: string): string[] => [...s.matchAll(/\[\[([a-z0-9-]+)\]\]/g)].map((m) => m[1]!);
  test("tiap baris menaut halaman yang registry-nya memuat nomor ADR itu, dan halaman itu ada", () => {
    for (const r of [...tabelPecah, ...tabelEnam]) {
      const { adr, id: idh } = baris(r);
      expect(dari(idh).adr, `ADR ${adr}`).toEqual([adr]);
      expect(dari(idh).ada, `${idh} ada`).toBe(true);
      expect(baca(berkasHalaman(idh)), `${idh} memuat judul ADR`).toMatch(new RegExp(`ADR ${adr}\\b`));
    }
    expect(tabelPecah.map((r) => baris(r).adr)).toEqual([60, 59, 58]);
    expect(tabelEnam.map((r) => baris(r).adr)).toEqual([48, 50, 55, 57, 54, 59]);
  });
  test("kalimat yang dikutip tertulis di halaman ADR-nya", () => {
    const sengaja = teksHalaman("t5-adr-60");
    const onprem = teksHalaman("t5-onprem");
    const timInfra = teksHalaman("t5-tim-infra");
    di(sengaja, "5.30", "| 2. Multi-region | Satu region mati lebih lama dari RTO 15 menit, atau PRD v6 memintanya |");
    di(sengaja, "5.30", "| Menunggu PRD v6 |");
    expect(tabelPecah[0]![1]).toBe('Butir multi-region salah saat "Satu region mati lebih lama dari RTO 15 menit, atau PRD v6 memintanya", dan berstatus menunggu PRD v6');
    di(onprem, "5.28", "| Data harus tinggal di lokasi tertentu | Syarat dari PRD atau dari mitra |");
    di(onprem, "5.28", "| Tim platform dan SRE melewati 6 orang |");
    expect(tabelPecah[1]![1]).toBe('Salah saat "Data harus tinggal di lokasi tertentu" (syarat dari PRD atau dari mitra), dan saat "Tim platform dan SRE melewati 6 orang"');
    di(timInfra, "5.27", "Saat permintaan template menunggu lebih dari satu minggu (Asumsi naskah).");
    di(timInfra, "5.27", "Saat SLO 99,9% terlalu ketat untuk rilis hampir harian.");
    expect(tabelPecah[2]![1]).toBe("Salah saat permintaan template menunggu lebih dari satu minggu (Asumsi naskah), dan saat SLO 99,9% terlalu ketat untuk rilis hampir harian");
    di(timInfra, "5.27", "Jalan beraspal adalah jalur bawaan yang sudah terpasang untuk service baru.");
    di(timInfra, "5.27", "template service (`service.yaml`), pipeline per service, dashboard, dan alert");
    sekali("[[t5-tim-infra]] menyebut hal yang sama jalan beraspal.");
    harus("Golden path adalah jalur bawaan yang didukung tim Platform untuk membuat service baru: template, pipeline, dashboard, dan alert.");
    // Enam ADR.
    di(teksHalaman("t5-rpo-rto"), "5.9", "`synchronous_standby_names = 'ANY 1 (r1, r2)'`");
    di(teksHalaman("t5-rpo-rto"), "5.9", "| Sinkron lintas wilayah | Jeda antar wilayah tidak diukur | [[t5-adr-60]] |");
    di(teksHalaman("t5-service"), "5.13", "Satu cluster PostgreSQL, satu schema dan satu role per service ([[t4-modul]]), tanpa foreign key lintas service");
    di(teksHalaman("t5-rollout"), "5.23", "Kill switch kartu adalah satu sakelar `kartu_aktif` di tabel `sakelar` di primary");
    di(teksHalaman("t5-kms"), "5.26", "**Belum diputuskan.** Tiga hal ini pertanyaan terbuka, bukan aturan. Pertama, tempat KEK dan tempat file arsip di produksi");
    di(teksHalaman("t5-batch"), "5.21", "Tabel `angsuran` dengan PRIMARY KEY `(jadwal_id, ke)` adalah kunci bisnis.");
    di(teksHalaman("t5-batch"), "5.21", "kompensasi lewat jurnal pembalik");
    di(onprem, "5.28", "Biaya cloud tiga tahun melebihi on-prem tiga tahun");
    expect(tabelEnam.map((r) => r[1])).toEqual([
      "Replica sinkron kuorum `ANY 1 (r1, r2)` untuk ledger. Sinkron lintas wilayah ditunda ke ADR 60, karena jeda antar wilayah tidak diukur",
      "Satu schema dan satu role per service di satu cluster, tanpa foreign key lintas service",
      "Kill switch kartu adalah satu sakelar di satu tabel di primary",
      "Tempat KEK dan tempat file arsip di produksi belum diputuskan",
      "Tabel angsuran dengan PRIMARY KEY `(jadwal_id, ke)` sebagai kunci bisnis, dan kompensasi lewat jurnal pembalik",
      "Perbandingan biaya tiga tahun cloud lawan perangkat sendiri, dengan masukan Ilustrasi",
    ]);
  });
  test("kolom 'Dilanjutkan di' diturunkan dari peta naskah dan registry: nomor halaman, ADR lanjutan, dan tautan", () => {
    const tNaskah = tabel(bag1, "| ADR | Kalimat di halaman Tahap 5 |").slice(1);
    const lanjutNaskah = tNaskah.map((r) => (r[3]!.match(/\d\.\d+/g) ?? []).map((n) => nomorDari(n).id));
    expect(lanjutNaskah).toEqual([["t6-m55"], ["t6-residensi", "t6-m52", "t6-tim-infra"], ["t6-m52", "t6-m54"]]);
    tabelPecah.forEach((r, i) => expect(nomorKeId(r[3]!), `dilanjutkan di baris ${i}`).toEqual(lanjutNaskah[i]));
    expect(tabelPecah[0]![3]).toBe("[[t6-m55]] dan ADR 64");
    expect(dari("t6-m55").adr).toEqual([64]);
    const baca6 = naskah.split("Penulis halaman juga membaca ulang enam ADR Tahap 5 terhadap PRD v6")[1]!.split("\n## 2.")[0]!.replace(/\s+/g, " ");
    const pasangan = new Map([...baca6.matchAll(/ADR (\d+)(?: \([^)]*\))? dilanjutkan ADR (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]));
    for (const r of tabelEnam) {
      const { adr } = baris(r);
      const m = cocok(r[3]!, /^ADR (\d+) di \[\[([a-z0-9-]+)\]\]$/);
      expect(Number(m[1]), `ADR lanjutan ${adr}`).toBe(pasangan.get(adr));
      expect(dari(m[2]!).adr, `halaman ${m[2]}`).toEqual([Number(m[1])]);
    }
    expect(tabelEnam.map((r) => nomorKeId(r[3]!)[0])).toEqual(["t6-m55", "t6-m53", "t6-m54", "t6-residensi", "t6-m56", "t6-m57"]);
    expect(timNaskah.find((t) => t.tim === "Platform")!.orang + timNaskah.find((t) => t.tim === "SRE")!.orang).toBe(11);
    expect(tabelPecah[1]![2]).toBe(`Data per negara. Platform 6 orang dan SRE 5 orang berjumlah 11 orang (Asumsi cerita)`);
  });
});

describe("angka beban dan hitungan ADR 52 dan ADR 56 dihitung ulang dari angka yang tertulis", () => {
  test("tabel Beban: tiap sel diturunkan dari naskah (3 transaksi dasar, 2 transaksi di sebelahnya) dan registry Tahap 5", () => {
    expect([a5.user, a5.aktif, a5.req, a5.puncak, a5.trx]).toEqual([1000000, 20, 60, 10, trxDua]);
    expect([userV6, aktifPersen, reqPerUser, puncak, detikHari, trxDasar]).toEqual([10000000, 20, 60, 10, 86400, 3]);
    const t = tabel(badan, "| Besaran | Nilai | Cara hitung | Dengan 2 transaksi |").slice(1);
    expect(t).toEqual([
      ["User aktif harian", id(aktif), `${id(userV6)} × ${aktifPersen}% (asumsi)`, "sama"],
      ["Request per hari", id(reqHari), `${id(aktif)} × ${reqPerUser} request (asumsi)`, "sama"],
      ["Puncak request per detik", id(reqPuncak, 1), `${id(reqHari)} ÷ ${id(detikHari)} × ${puncak} (asumsi), rata-rata ${id(reqRata, 1)}`, "sama"],
      ["Transaksi uang per hari", id(trxHari), `${id(aktif)} × ${trxDasar} transaksi (asumsi)`, id(trxHari2)],
      ["Transaksi uang per detik di puncak", id(trxPuncak, 1), `${id(trxHari)} ÷ ${id(detikHari)} × ${puncak} (asumsi)`, id(trxPuncak2, 1)],
    ]);
    expect([id(aktif), id(reqHari), id(reqPuncak, 1), id(reqRata, 1), id(trxHari), id(trxHari2), id(trxPuncak, 1), id(trxPuncak2, 1)]).toEqual([
      "2.000.000", "120.000.000", "13.888,9", "1.388,9", "6.000.000", "4.000.000", "694,4", "463,0",
    ]);
    di(bag3, "naskah", `${id(reqRata, 1)} rata-rata dan ${id(reqPuncak, 1)} puncak`);
    di(bag3, "naskah", `${id(trxPuncak, 1)} puncak (trx 2: ${id(trxHari2 / detikHari, 1)} dan ${id(trxPuncak2, 1)})`);
    harus(`Dasar hitungannya ${trxDasar} transaksi uang per user aktif per hari, seperti Tahap 2 sampai 5. Kolom terakhir memakai ${trxDua} transaksi, angka yang dipakai kolom yang sama di [[t5-prd]].`);
    harus(`Puncak ${id(reqPuncak, 1)} naik ${id(reqPuncak / reqPuncak5)} kali dari ${id(reqPuncak5, 1)} di [[t5-prd]]. User naik ${id(userV6 / a5.user)} kali, persen aktif tetap ${a5.aktif}%, dan request per user tetap ${a5.req}.`);
    expect(reqPuncak5).toBeCloseTo(1388.889, 2);
    di(hal51, "5.1", `| Puncak request per detik | ${id(reqPuncak5, 1)} |`);
  });
  test("Latar dan lingkup: 10 kali, 1,9 kali, 2.000.000 aktif, 6.000.000 + 2.500.000 + 1.500.000, 43.200 dan 43,2 menit, 44 rilis", () => {
    harus(`User naik ${id(userV6)} ÷ ${id(a5.user)} = ${id(userV6 / a5.user)} kali, dan jumlah orang naik ${jumlahTim} ÷ ${orang5} = ${id(jumlahTim / orang5, 1)} kali (Hitungan atas Asumsi cerita).`);
    expect(id(jumlahTim / orang5, 1)).toBe("1,9");
    const negara = persenNegara.map((p) => id((userV6 * p) / 100));
    expect(negara).toEqual(["6.000.000", "2.500.000", "1.500.000"]);
    expect(persenNegara.reduce((s, p) => s + p, 0)).toBe(100);
    harus(`Pembagian per negara ${persenNegara[0]}%, ${persenNegara[1]}%, dan ${persenNegara[2]}% adalah Asumsi cerita, jadi ${negara[0]}, ${negara[1]}, dan ${negara[2]} user.`);
    harus(`Lingkupnya tiga negara: ${id(userV6)} user terdaftar dan ${id(aktif)} aktif per hari (${id(userV6)} × ${aktifPersen}%, Asumsi), dikerjakan ${jumlahTim} orang selama 24 minggu.`);
    harus(`Targetnya ${id(userV6)} user terdaftar di tiga negara dan ${aktifPersen}% aktif tiap hari (Asumsi), dikerjakan dalam 24 minggu (Asumsi cerita).`);
    harus(`- ${id(aktif)} user aktif per hari (${aktifPersen}% dari ${id(userV6)}).`);
    const menitBulan = 30 * 24 * 60;
    harus(`Dalam 30 hari ada 30 × 24 × 60 = ${id(menitBulan)} menit, dan ${(1 - 0.999).toFixed(3).replace(".", ",")} × ${id(menitBulan)} = ${id(0.001 * menitBulan, 1)} menit.`);
    di(bag1, "naskah", "99,9% pembayaran tersedia per 30 hari di tiap negara (43,2 menit anggaran kegagalan)");
    di(bag1, "naskah", "RPO nol, RTO satu mesin 15 menit, RTO satu wilayah 30 menit");
    const timProduk = timNaskah.length;
    const rilisPerTim = Number(cocok(barisAwal(bag3, "| Frekuensi rilis |"), /\| (\d+) × (\d+) ÷ 8 \|/)[2]);
    expect(timProduk).toBe(11);
    harus(`Itu ${timProduk} × ${rilisPerTim} = ${id(timProduk * rilisPerTim)} rilis per hari (Asumsi cerita: ${rilisPerTim} rilis per tim per hari).`);
    di(barisAwal(bag3, "| Frekuensi rilis |"), "naskah", `${id(timProduk * rilisPerTim)} per hari`);
  });
  test("ADR 52: 3 pod tiap service jadi 30, 1.800 client lawan 400 (4,5 kali), batas pertama 7 pod (420; 2,3 kali) dan contoh 8 pod (2,7 kali)", () => {
    expect([jumlahService, podTahap5, poolPod, batasClient, serverPool, tersedia, podContoh, clientContoh]).toEqual([6, 3, 10, 400, 60, 97, 8, 480]);
    expect(jumlahService * podContoh * poolPod).toBe(clientContoh);
    expect(podV6).toBeCloseTo(30, 9);
    expect(clientV6).toBeCloseTo(1800, 6);
    expect(podPertama).toBe(7);
    expect(clientPertama).toBe(420);
    expect(clientPertama).toBeGreaterThan(batasClient);
    expect(jumlahService * (podPertama - 1) * poolPod).toBeLessThanOrEqual(batasClient);
    harus(`Halaman [[t5-pooler]] menulis keputusan ini salah saat koneksi pod melewati \`max_client_conn\`. Contohnya ${podContoh} pod tiap service, yang memberi ${clientContoh} client lawan ${batasClient} per instance.`);
    harus(`Tahap 5 memakai ${podTahap5} pod tiap service untuk ${id(reqPuncak5, 1)} request per detik. Jadi ${id(reqPuncak, 1)} request per detik memakai ${podTahap5} × ${id(reqPuncak / reqPuncak5)} = ${id(podV6)} pod tiap service.`);
    harus(`Hasilnya ${jumlahService} service × ${id(podV6)} pod × pool ${poolPod} = ${id(clientV6)} client lawan ${batasClient} per instance, yaitu ${id(clientV6)} ÷ ${batasClient} = ${id(clientV6 / batasClient, 1)} kali.`);
    harus(`${batasClient} ÷ (${jumlahService} × ${poolPod}) = ${id(batasClient / (jumlahService * poolPod), 1)}, jadi ${podPertama} pod tiap service sudah memberi ${jumlahService} × ${podPertama} × ${poolPod} = ${clientPertama} client.`);
    harus(`Tujuh pod berarti ${podPertama} ÷ ${podTahap5} = ${id(podPertama / podTahap5, 1)} kali beban Tahap 5. Contoh ${podContoh} pod di ADR 52 berarti ${podContoh} ÷ ${podTahap5} = ${id(podContoh / podTahap5, 1)} kali.`);
    expect([id(clientV6 / batasClient, 1), id(podPertama / podTahap5, 1), id(podContoh / podTahap5, 1)]).toEqual(["4,5", "2,3", "2,7"]);
    harus("Batas itu sudah terlewati jauh sebelum beban naik 10 kali.");
    expect(podPertama).toBe(7);
    harus("Anggap jumlah pod tumbuh sebanding beban (Asumsi desain).");
    di(t517, "5.17", "Pool tiap pod tetap 10.");
    di(t517, "5.17", "`max_client_conn` dinaikkan dari bawaan 100 ke 400 per instance (Asumsi)");
    di(t517, "5.17", "Koneksi client adalah koneksi dari pod ke PgBouncer");
    di(naskah, "naskah", "6 × 30 × 10 = 1.800 lawan 400, atau 4,5 kali");
  });
  test("ADR 56: 50 × 100 = 5.000 (3,6 kali), mitra 500 memberi 3,6 yang sama, mitra tetap 50 memberi 0,36", () => {
    expect([mitra, perMitra, num(kuota[3]!), num(kuota[4]!), num(kuota[5]!)]).toEqual([50, 100, 5000, 3.6, 1388.9]);
    expect(mitraV6).toBe(500);
    const q = mitra * perMitra;
    const q6 = mitraV6 * perMitra;
    harus(`Contohnya ${mitra} mitra × ${perMitra} per detik = ${id(q)} per detik, yaitu ${id(q / reqPuncak5, 1)} kali puncak ${id(reqPuncak5, 1)}.`);
    harus(`Bila mitra ikut naik ${id(userV6 / a5.user)} kali menjadi ${mitraV6} (Asumsi), ${mitraV6} × ${perMitra} = ${id(q6)} per detik, dan ${id(q6)} ÷ ${id(reqPuncak, 1)} = ${id(q6 / reqPuncak, 1)}.`);
    harus(`Bila mitra tetap ${mitra}, ${id(q)} ÷ ${id(reqPuncak, 1)} = ${id(q / reqPuncak, 2)}.`);
    expect([id(q / reqPuncak5, 1), id(q6 / reqPuncak, 1), id(q / reqPuncak, 2)]).toEqual(["3,6", "3,6", "0,36"]);
    di(t525, "5.25", "Saat jumlah kuota melebihi kapasitas terukur.");
    di(t525, "5.25", "Kapasitas satu server belum diukur");
    di(t525, "5.25", "Kuota per mitra adalah 100 per detik dan 20 permintaan berjalan (Asumsi)");
    di(hal51, "5.1", "±50 penyedia, Asumsi");
    di(naskah, "naskah", "Bila mitra tetap 50, 5.000 ÷ 13.888,9 = 0,36");
    harus("PRD v6 tidak menulis jumlah mitra.");
    di(bag1 + latar, "naskah", "Mitra POS (Tomi dan mitra di tiga negara)");
  });
  test("koneksi database: 13.888,9 × 0,02 = 277,8 dan negara terbesar 8.333,3 × 0,02 = 166,7, lawan 97 tersedia dan server pool 60", () => {
    const L = reqPuncak * lamaQuery;
    const besar = (reqPuncak * besarPersen) / 100;
    expect([lamaQuery, id(L, 1), id(besar, 1), id(besar * lamaQuery, 1), besarPersen]).toEqual([0.02, "277,8", "8.333,3", "166,7", 60]);
    harus(`Lama itu 0,02 detik (Asumsi, seperti di [[t5-prd]]), jadi ${id(reqPuncak, 1)} × 0,02 = ${id(L, 1)} koneksi.`);
    harus(`Untuk negara terbesar, yaitu ${besarPersen}% dari beban (Asumsi cerita), hasilnya ${id(besar, 1)} × 0,02 = ${id(besar * lamaQuery, 1)} koneksi. Pembandingnya ${tersedia} koneksi tersedia dan server pool ${serverPool} di ADR 52.`);
    di(bag1, "naskah", `L = λ × W = ${id(reqPuncak, 1)} × 0,02 = ${id(L, 1)} koneksi tertahan`);
    di(bag1, "naskah", `Untuk negara terbesar (60%) hasilnya ${id(besar * lamaQuery, 1)}`);
    di(hal51, "5.1", "1.388,9 request per detik × 0,02 detik lama satu request memegang koneksi");
    harus("Bila semua request ke satu primary, koneksi yang tertahan rata-rata sama dengan request per detik dikali lama satu request memegang koneksi (hukum Little).");
    harus("Bacaan lewat replica dan jumlah koneksi sebenarnya belum dihitung dan belum terukur.");
  });
  test("tiga hal yang belum diuji dan kapasitas satu primary ditulis seperti 5.29, 5.30, dan naskah", () => {
    const m51 = teksHalaman("t5-m51");
    di(m51, "5.29", "Skor risiko real-time dalam 50 ms antar host, data di dua wilayah, dan 28 orang menjadi lebih dari 50.");
    di(teksHalaman("t5-adr-60"), "5.30", `Satu primary tidak menampung tulis ${id(trxPuncak5, 1)} transaksi uang per detik`);
    harus("Ketiganya skor risiko real-time dalam 50 ms antar host, data di dua wilayah, dan 28 orang menjadi lebih dari 50.");
    harus(`Kapasitas satu primary untuk ${id(trxPuncak5, 1)} transaksi uang per detik juga belum pernah diukur.`);
    di(latar, "naskah", `Kapasitas satu primary untuk ${id(trxPuncak5, 1)} transaksi uang per detik juga belum pernah diukur.`);
    harus("ADR 60 menunda dua belas butir, masing-masing dengan pemicu tertulis, dan menulis multi-region sebagai menunggu PRD v6");
    const butir = tabel(teksHalamanMentah("t5-adr-60"), "| Komponen | Salah saat").slice(1);
    expect(butir.map((b) => Number(b[0]!.match(/^(\d+)\./)![1]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe("dua urutan 'pecah lebih dulu' dan label penalaran", () => {
  test("dua urutan ditulis, keduanya penalaran berlabel Tidak dijalankan, dan 5.32 tidak dikoreksi", () => {
    const t = tabel(badan, "| Urutan | Dasar | ADR yang pecah | Label |").slice(1);
    expect(t).toEqual([
      ["Menurut isi PRD v6", "Halaman ADR menulis keadaan yang sama dengan satu isi PRD v6", "ADR 58, 59, dan 60, seperti di widget [[t5-jembatan]]", "Penalaran, Tidak dijalankan"],
      ["Menurut beban", `Syarat jumlah koneksi ADR 52 terlewati pada ${id(podPertama / podTahap5, 1)} kali beban Tahap 5`, "ADR 52 lebih dulu", "Hitungan atas Asumsi, dan penalaran, Tidak dijalankan"],
    ]);
    harus('Pecah berarti halaman ADR itu sendiri menulis keadaan yang sama dengan satu isi PRD v6. Penalaran berarti kesimpulan dari kalimat yang sudah tertulis, tanpa menjalankan apa pun, jadi labelnya Tidak dijalankan. Urutan "lebih dulu" di bagian ini adalah penalaran, bukan urutan kejadian yang direkam.');
    harus('Tebakan "ADR 52" di [[t5-jembatan]] benar tentang beban dan belum benar tentang mode transaction. Halaman itu tidak perlu dikoreksi, karena ia membandingkan kalimat halaman ADR dengan isi PRD v6, bukan dengan beban.');
    harus("Perbaikannya mengubah nilai, yaitu menaikkan `max_client_conn` atau menambah instance PgBouncer, bukan mengganti mode transaction (penalaran, Tidak dijalankan).");
    harus("Syarat itu terlewati karena jumlah pod, bukan karena isi PRD v6.");
    di(dataTebak.pilihan[0]!.alasan, "kunci 5.32", "Halaman ini tidak menghitung jumlah pod untuk 10 juta user (penalaran).");
    di(dataTebak.pilihan[1]!.alasan, "kunci 5.32", "Pratinjau PRD v6 di halaman ini tidak menulis jumlah mitra.");
    di(bag1, "naskah", "Tebakan \"ADR 52\" di 5.32 benar tentang beban dan belum benar tentang mode transaction");
    expect(dataTebak.pilihan.findIndex((p) => p.benar)).toBe(2);
  });
});

describe("Pak Hadi: baris v1 sampai v5 sama dengan 5.1 dan baris v6 sama dengan naskah", () => {
  test("tabel aturan Pak Hadi", () => {
    const t = tabel(badan, "| PRD | Aturan Pak Hadi |").slice(1);
    const t51 = tabel(hal51, "| PRD | Aturan Pak Hadi |").slice(1);
    expect(t51.map((r) => r[0])).toEqual(["v1", "v2", "v3", "v4", "v5"]);
    expect(t.slice(0, 5)).toEqual(t51);
    const kutip = cocok(bag1, /Syarat Pak Hadi bertambah: \*"([^"]+)"\*/)[1]!;
    expect(t[5]).toEqual(["v6", `Aturan v5 tetap berlaku, ditambah: "${kutip}"`]);
    expect(t).toHaveLength(6);
    harus("Aturan Pak Hadi dipertahankan dan diperluas:");
  });
});

describe("label sumber, klaim negatif berlingkup, dan kata yang tidak dipakai", () => {
  test("label: Rekaman lab hanya sebagai penjelasan; kejadian berlabel Asumsi, Ilustrasi, atau Tidak dijalankan; arti label ada di /cara-pakai/", () => {
    expect(hitung(badan, "Rekaman lab")).toBe(1);
    harus("Tahap 6 tidak punya lab. Karena itu tiap kejadian dan angka di dokumen ini berlabel Asumsi, Ilustrasi, atau Tidak dijalankan. Rekaman lab hanya muncul untuk rekaman Tahap 1 sampai 5, dengan nama file-nya.");
    expect(badan).not.toMatch(/labs\/|\.txt|rekaman\.txt|output\//);
    for (const k of ["**Rekaman lab**", "**Ilustrasi**", "**Asumsi**", "**Tidak dijalankan**", "**[perlu verifikasi]**"]) di(cara, "/cara-pakai/", k);
    harus("Asumsi adalah angka beban atau pilihan yang rumusnya atau alasannya ditulis di halaman. Ilustrasi adalah contoh yang disusun dari konsep, bukan hasil sistem. Tidak dijalankan berarti dicek ke dokumentasi atau ke halaman lain tanpa dijalankan.");
    harus("Hitungan adalah hasil rumus yang ditulis di halaman, dan labelnya mengikuti masukan terlemah, misalnya Hitungan atas Asumsi.");
    expect(hitung(badan, "/cara-pakai/#label-sumber")).toBe(2);
    expect(hitung(badan, "[perlu verifikasi]")).toBe(1);
  });
  test("klaim izin dan regulasi: dua kalimat penafian persis, tanpa mata uang atau negara nyata, dan 'multinasional' hanya sebagai sebutan", () => {
    harus("Frasa itu tidak membawa klaim izin, lisensi, atau kepatuhan regulasi di negara mana pun.");
    harus("PRD ini tidak membawa klaim izin, lisensi, atau kepatuhan regulasi di negara mana pun.");
    expect(hitung(badan, "klaim izin, lisensi, atau kepatuhan regulasi")).toBe(2);
    harus("Sebutan produknya uang elektronik multinasional, yaitu Rekeningo yang dipakai di tiga negara.");
    expect(hitung(badan, "multinasional")).toBe(1);
    expect(badan).not.toMatch(/\b(USD|EUR|JPY|SGD|MYR|dolar|euro|yen|ringgit|baht|peso|AS|Amerika|Singapura|Malaysia|Jepang|Eropa|Inggris)\b/);
    harus("Tiga negara di dokumen ini tidak dinamai dan tidak punya kode mata uang, kecuali negara pertama dengan rupiah (Asumsi cerita).");
    di(draf, "naskah", "Tiga negara, tidak dinamai.");
    expect(badan).not.toMatch(/undang-undang|\bUU\b|\bOJK\b|GDPR|\bPBI\b/);
    harus("tanpa klaim hukum");
    harus("Negara berarti satu pasar dengan satu mata uang, dan wilayah (region) berarti satu lokasi geografis dengan pusat data.");
    di(naskah, "naskah", '"Wilayah" berarti region, yaitu satu lokasi geografis dengan pusat data. "Negara" berarti satu pasar dengan satu mata uang.');
  });
  test("'lebih dari 50 developer' ditulis satu kali sebagai bukan pemicu dengan [perlu verifikasi], dan tidak dipakai sebagai syarat", () => {
    expect(hitung(badan, "lebih dari 50 developer")).toBe(1);
    harus('- Angka "lebih dari 50 developer" dari pratinjau tidak dipakai sebagai pemicu apa pun. Heuristik bahwa microservices baru masuk akal di atas ±50 developer tidak punya sumber primer [perlu verifikasi] ([[t4-modul]]).');
    di(teksHalaman("t4-modul"), "4.13", "Pencarian 2026-10-29 tidak menemukan sumber primer untuk angka itu");
    di(teksHalaman("t5-jembatan"), "5.32", "tidak menemukan sumber primer untuk angka itu [perlu verifikasi]");
    di(draf, "naskah", "tidak punya sumber primer [perlu verifikasi] dan tidak dipakai sebagai pemicu apa pun");
    expect(hitung(badan, "±50")).toBe(1);
  });
  test("kata yang bermakna ganda tidak dipakai (token, router, log, nonce, replika), client hanya untuk koneksi pod ke PgBouncer, dan golden path satu kata", () => {
    const polos = badan.replace(/\[\[[^\]]+\]\]/g, "").replace(/`[^`]*`/g, "");
    expect(polos).not.toMatch(/\b(token|router|log|nonce|replika|Replika)\b/i);
    expect(polos).not.toMatch(/\bAnda\b|\bkita\b|pengguna|pemakai/i);
    const client = [...polos.matchAll(/[^.]*\bclient\b[^.]*\./g)].map((m) => m[0]);
    expect(client.length).toBeGreaterThan(0);
    for (const k of client) expect(k, `client di luar konteks ADR 52: ${k}`).toMatch(/PgBouncer|pool|max_client_conn|ADR 52|instance|pod/);
    harus("Client di sini berarti koneksi dari pod ke PgBouncer, seperti di halaman itu.");
    expect(hitung(polos, "golden path") + hitung(polos, "Golden path")).toBeGreaterThanOrEqual(3);
    expect(polos).not.toMatch(/jalan beraspal[^.]*(golden path|Golden path)|jalur beraspal/);
    expect(hitung(badan, "jalan beraspal")).toBe(2);
    expect(hitung(badan, "replica")).toBeGreaterThanOrEqual(2);
    expect(badan).not.toMatch(/\bshard|sharding/i);
    expect(naskah).toContain('"Replica" berarti salinan database, dan "replika" tidak dipakai untuk pod.');
  });
  test("ID riset, nomor keputusan, nomor PR, dan komentar lab tidak tampil; tautan hanya lewat [[ID]] atau /cara-pakai/", () => {
    expect(badan + front + JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d+\b|keputusan \d{3,4}|\bPR #?\d+|#\d{3}\b/);
    const tautan = [...badan.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]);
    expect(new Set(tautan)).toEqual(new Set(["/cara-pakai/#label-sumber"]));
    for (const m of badan.matchAll(/\[\[([A-Za-z0-9.-]+)(?:\|[^\]]+)?\]\]/g)) expect(hal.some((h) => h.id === m[1]), `rujukan ${m[1]}`).toBe(true);
    const idDipakai = new Set([...badan.matchAll(/\[\[([A-Za-z0-9.-]+)/g)].map((m) => m[1]!));
    expect([...idDipakai].filter((x) => x.startsWith("t6-")).sort()).toEqual(["t6-adr-69", "t6-fitur-teknis", "t6-m52", "t6-m53", "t6-m54", "t6-m55", "t6-m56", "t6-m57", "t6-residensi", "t6-tim-infra"].sort());
    expect([...idDipakai].filter((x) => x.startsWith("t6-")).every((x) => !x.startsWith("t6-prd"))).toBe(true);
  });
  test("DORA lima metrik dan batas jaga 25% bersumber di baris riset, tanpa nama sumber di halaman selain DORA dan SRE Book yang dituliskan", () => {
    const r113 = barisAwal(riset6, "| R6-113 |");
    const nama = ["change lead time", "deployment frequency", "failed deployment recovery time", "change fail rate", "deployment rework rate"];
    for (const n of nama) {
      di(r113, "R6-113", n);
    }
    harus(`DORA adalah program riset pengiriman software. Ia menamai lima metrik: ${nama.slice(0, 4).join(", ")}, dan ${nama[4]} (dora.dev, dibuka 2026-11-06).`);
    di(r113, "R6-113", "dora.dev/guides/dora-metrics/");
    di(r113, "R6-113", "5 Januari 2026");
    di(r113, "R6-113", "dibuka 2026-11-06");
    di(r113, "R6-113", "sre.google/sre-book/being-on-call/");
    di(r113, "R6-113", '"no more than 25% can be spent on-call"');
    harus("- Satu orang jaga paling banyak 25% waktunya. Batas itu mengikuti Google SRE Book bab 11, yang menulisnya untuk SRE (dibuka 2026-11-06).");
    di(naskah, "naskah", "Satu orang jaga paling banyak 25% waktunya");
    expect(hitung(badan, "dora.dev")).toBe(1);
  });
});

describe("diagram Rantai t6-prd-sebelum-sesudah.json", () => {
  test("ilustrasi, dua baris, empat simpul, dan nilai diturunkan dari naskah, registry, dan 5.1", () => {
    expect(rantai.id).toBe("t6-prd-sebelum-sesudah");
    expect(rantai.sumber).toEqual({ jenis: "ilustrasi", teks: "Ringkasan PRD v6" });
    expect(rantai.judul).toBe("Sesudah Tahap 5 dan yang diminta PRD v6");
    expect(rantai.baris.map((b) => b.simpul.length)).toEqual([4, 4]);
    const t = (b: number, s: number) => rantai.baris[b]!.simpul[s]!;
    expect(t(0, 0).sub).toBe(`${id(a5.user)} user`);
    expect(t(0, 3).teks).toBe(`${orang5} engineer, delapan tim`);
    expect(t(1, 0).sub).toBe(`${id(userV6)} user, kurs tercatat`);
    expect(t(1, 3).teks).toBe(`${jumlahTim} engineer, ${timNaskah.length} tim`);
    expect(rantai.baris[1]!.sub).toBe("tiga negara, 24 minggu");
    expect(t(1, 2).teks).toBe(`Pulih dalam ${cocok(bag1, /RTO wilayah (\d+) menit/)[1]} menit`);
    expect(t(0, 2).teks).toBe(`RTO ${cocok(hal51, /pulih dalam (\d+) menit \(RTO\)/)[1]} menit, satu mesin`);
    expect(t(1, 2).nada).toBe("good");
    expect(t(0, 2).nada).toBe("warn");
    di(bag1, "naskah", "24 minggu");
    di(rantai.catatan!, "diagram", "Asumsi produk");
    di(cerita.tahap[4]!.sebelumnya, "registry", "satu primary PostgreSQL");
    di(bag1, "naskah", "| P0 | Tiga negara |");
    di(bag1, "naskah", "Platform internal | Golden path, service catalog, label biaya per tim, dan SLO per tim untuk 11 tim");
    di(naskah, "naskah", "Tiap data punya satu rumah");
  });
});

describe("baris riset R6-110 sampai R6-114: ada, urut, lima kolom, tanggal baca, dan memuat hitungan dan sumber yang dipakai halaman", () => {
  const baris = riset6.split("\n").filter((b) => /^\| R6-\d+ \|/.test(b));
  const idRiset = baris.map((b) => b.split("|")[1]!.trim());
  const milik = baris.filter((b) => /^\| R6-11[0-4] \|/.test(b));
  test("lima baris milik halaman ini berurutan dan tidak ganda; baris lain boleh disisipkan di antaranya", () => {
    expect(new Set(idRiset).size).toBe(idRiset.length);
    expect(milik.map((b) => b.split("|")[1]!.trim())).toEqual(["R6-110", "R6-111", "R6-112", "R6-113", "R6-114"]);
    for (const b of milik) expect(sel(b), b.slice(0, 10)).toHaveLength(5);
    const nomor = idRiset.map((x) => Number(x.replace("R6-", "")));
    expect(nomor.filter((n) => n >= 110 && n <= 114)).toEqual([110, 111, 112, 113, 114]);
    for (const b of milik) expect(b, b.slice(0, 10)).toMatch(/2026-11-06/);
    const masukBlokKonsep = riset6.split("## Teknik terbaru")[0]!;
    for (const b of milik) expect(masukBlokKonsep, `${b.slice(0, 10)} di tabel Konsep dan sumber`).toContain(b);
  });
  test("R6-110: tiap persamaan dihitung ulang (pembulatan setengah ke atas sesuai desimal yang tertulis)", () => {
    const r110 = barisAwal(riset6, "| R6-110 |");
    const PERSAMAAN = /(\d+(?:[.,]\d+)*(?: [×÷+−] \d+(?:[.,]\d+)*%?)+) = (\d+(?:[.,]\d+)*)/g;
    const pers = [...r110.matchAll(PERSAMAAN)];
    expect(pers.length).toBe(33);
    for (const m of pers) {
      const ekspresi = m[1]!.replace(/(\d+(?:\.\d{3})*(?:,\d+)?)/g, (x) => String(num(x))).replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
      const hasil = Function(`"use strict"; return (${ekspresi});`)() as number;
      const tertulis = num(m[2]!);
      const d = m[2]!.includes(",") ? m[2]!.split(",")[1]!.length : 0;
      // Hasil dibulatkan setengah ke atas ke desimal yang tertulis; pembagian beruntun (mis. ÷ 86.400 × 10) memakai nilai tak terbulat.
      expect(Math.abs(hasil - tertulis), `${m[0]}`).toBeLessThanOrEqual(0.5 * 10 ** -d + Math.abs(hasil) * 1e-6);
    }
    for (const x of ["1,89 (ditulis 1,9)", "4,82 (ditulis 4,8)", "2,33 (ditulis 2,3)", "2,67 (ditulis 2,7)", "277,78 (ditulis 277,8)", "166,67 (ditulis 166,7)", "462,96 (ditulis 463,0)", "6,67 (7 pod)"]) di(r110, "R6-110", x);
    di(r110, "R6-110", "batas 400 pertama terlewati pada 7 pod (420, 2,3 kali)");
    di(r110, "R6-110", "Naskah menulis syarat jumlah koneksi ADR 52 terlewati pada 8 pod (2,7 kali)");
  });
  test("R6-111 sampai R6-114 memuat berkas halaman ADR yang dibaca dan sumber luar bertanggal", () => {
    const r = (x: string) => barisAwal(riset6, `| ${x} |`);
    for (const f of ["pooler-koneksi.mdx", "pintu-mitra-waf.mdx"]) di(r("R6-111"), "R6-111", `tahap-5/${f}`);
    for (const f of ["tim-infra.mdx", "on-prem-lawan-cloud.mdx", "sengaja-belum.mdx", "rpo-rto-failover.mdx", "modul-ke-service.mdx", "progressive-delivery.mdx", "arsip-envelope-encryption.mdx", "batch-tahan-crash.mdx"]) {
      di(r("R6-112"), "R6-112", `tahap-5/${f}`);
      expect(terlacak === null || terlacak.has(`situs/src/content/docs/tahap-5/${f}`)).toBe(true);
    }
    di(r("R6-112"), "R6-112", "t5-jembatan-tebak.json");
    di(r("R6-114"), "R6-114", "tahap-5/jembatan-prd-v6.mdx");
    di(r("R6-114"), "R6-114", "tahap-5/m51-prd-v6.mdx");
    di(r("R6-114"), "R6-114", "tidak ada di PROPOSAL, naskah, atau halaman");
    expect(badan).not.toMatch(/dora\.dev\/guides|sre\.google|spotify|CLAUDE\.md/i);
  });
});

describe("kalimat prosa dan sidik teks halaman", () => {
  test("tiap baris isi mdx dan bentuk baris kosongnya sama dengan sidik; mdx tidak punya ekor kosong", () => {
    const baris = mdx.split("\n");
    expect(baris.filter((b) => b.trim())).toEqual(BARIS_MDX);
    expect(baris.map((b) => (b.trim() ? "#" : "-")).join("")).toBe(BENTUK_MDX);
    expect(mdx.endsWith("\n")).toBe(true);
  });
  test("nilai diagram Rantai persis sama dengan sidik", () => {
    const bentuk = rantai.baris.map((b) => ({ label: b.label, sub: b.sub ?? null, simpul: b.simpul.map((s) => [s.teks, s.sub ?? null, s.nada ?? null]) }));
    expect(bentuk).toEqual(NILAI_RANTAI);
  });
  test("lima baris riset R6-110 sampai R6-114 persis sama dengan sidik", () => {
    expect(riset6.split("\n").filter((b) => /^\| R6-11[0-4] \|/.test(b))).toEqual(BARIS_RISET);
  });
});
