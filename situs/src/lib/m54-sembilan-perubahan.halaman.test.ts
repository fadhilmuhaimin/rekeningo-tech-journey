// Penjaga halaman 6.5 (keputusan 1726 sampai 1728): angka, hitungan, ID `[[...]]`, nomor ADR, label sumber, tautan dan tanggal sumber,
// rentang Snippet, kunci tebakan, data widget banding t6-m54-banding.json, tabel opsi ADR 63, dan klaim negatif di
// m54-sembilan-perubahan.mdx. Nilai diturunkan dari naskah Tahap 6 (baris M54, baris ADR 63, bagian 3, peta halaman, jalur per peran),
// registry cerita.json, rekaman Tahap 5 `labs/t5-rollout/output/gateway.txt` dan `analisis.txt`, halaman 5.23, 5.27, 5.30, dan 6.1 (halaman
// ADR-nya, bukan naskah), glosarium, dan baris riset R6-130 sampai R6-134. Tahap 6 tanpa lab: halaman ini tidak punya rekaman baru, jadi
// tiap angka berlabel Asumsi, Hitungan atas ..., Ilustrasi, atau Tidak dijalankan, dan Rekaman lab hanya untuk dua rekaman Tahap 5 di atas.
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) sidik teks halaman, JSON widget, dan baris riset
// di m54-sembilan-perubahan.halaman.nilai.ts (dimatikan dengan TANPA_SIDIK=1 untuk mutasi tanpa sidik). Sidik dibangkitkan ulang tangan
// (skrip sementara di tmp/, bukan di repo) bila isi halaman diubah dengan sengaja, lalu diff-nya dibaca.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci: kalimat berangka dibaca ke sumbernya, dan kalimat tentang ADR atau halaman lain
// dibaca ke halaman ADR-nya (5.23, 5.27, 5.30, 6.1), bukan ke naskah.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import glosarium from "../../data/glosarium.json";
import bandingMentah from "../../lama/widgets/data/t6-m54-banding.json";
import { cekTemplat, daftarBlok } from "./blok";
import { BARIS_MDX, BARIS_RISET, TEKS_BANDING } from "./m54-sembilan-perubahan.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const terlacak: Set<string> | null = (() => {
  try {
    return new Set(execSync("git ls-files", { cwd: akar, maxBuffer: 1 << 26 }).toString().split("\n"));
  } catch {
    return null;
  }
})();
const baca = (rel: string): string => {
  // berkas baru milik PR ini belum terlacak sebelum commit; di CI semua berkas yang dibaca harus terlacak
  if (terlacak && process.env.CI) expect(terlacak.has(rel), `tes membaca berkas yang tidak terlacak git: ${rel}`).toBe(true);
  expect(fs.existsSync(path.join(akar, rel)), `berkas tidak ada: ${rel}`).toBe(true);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};
const SIDIK = !process.env.TANPA_SIDIK;
// Kalimat berkata penuh ("semua", "setiap"), diperiksa satu per satu ke lingkupnya; kalimat baru berkata penuh menggagalkan tes ini.
// 1: "semua perubahan" = sembilan perubahan Kamis (jumlahnya diturunkan dari naskah); 2: tujuan rancangan, bukan klaim tentang keadaan sekarang;
// 3: kebijakan contoh di SRE Workbook (satu layanan contoh); 4: sel Kekurangan opsi D, yaitu flag tanpa canary menjalankan kode di semua pod
// menurut definisinya (Penalaran); 5: pertanyaan Cek diri.
const SEMUA_SETIAP: string[] = [
  "Itu 7 ÷ 9 = 77,8% dari semua perubahan (Hitungan",
  "Satu garis waktu yang memuat semua jenis perubah",
  "Bila layanan melewati anggaran kegagalan jendela",
  "Canary berbasis SLO, garis waktu, kebijakan erro",
  "Berapa persen semua pembayaran gagal di langkah ",
];

const BERKAS = "situs/src/content/docs/tahap-6/m54-sembilan-perubahan.mdx";
const BERKAS_BANDING = "situs/lama/widgets/data/t6-m54-banding.json";
const mdx = baca(BERKAS);
const front = mdx.split(/^---\n/m)[1]!;
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah = baca("plan/CERITA-TAHAP-6.md");
const riset6 = baca("plan/RISET-TAHAP-6.md");
const cara = baca("situs/src/content/docs/cara-pakai.mdx");
const teksBanding = baca(BERKAS_BANDING);

interface H { id: string; judul: string; path: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; peran?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const teksHalaman = (id: string): string => baca(`situs/src/content/docs/${dari(id).path.replace(/\.md$/, ".mdx")}`).replace(/\s+/g, " ");
const reg = dari("t6-m54");

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
const barisAwal = (sumber: string, awal: string): string => {
  const b = sumber.split("\n").find((x) => x.startsWith(awal));
  expect(b, `baris tidak ada: ${awal}`).toBeDefined();
  return b!;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const sekali = (kalimat: string) => expect(hitung(badan, kalimat), `harus tepat satu kali: ${kalimat}`).toBe(1);
// Pembulatan setengah ke atas seperti pembaca (bukan toFixed), titik ribuan dan koma desimal.
const bulat = (n: number, d = 0): number => Math.floor(n * 10 ** d + 0.5 + 1e-9) / 10 ** d;
const id = (n: number, d = 0): string => {
  const [a, b] = bulat(n, d).toFixed(d).split(".");
  return a!.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (b ? "," + b : "");
};
const num = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const KATA: Record<string, number> = { satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9 };

// ---- bagian halaman ---------------------------------------------------------------------------------------------------------
const blokDari = (nama: string): string => {
  const m = badan.match(new RegExp(`<Blok nama="${nama}"[^>]*>([\\s\\S]*?)</Blok>`));
  expect(m, `blok tidak ada: ${nama}`).not.toBeNull();
  return m![1]!;
};
const mulai = blokDari("Mulai");
const coba = blokDari("Coba");
const paham = blokDari("Paham");
const putuskan = blokDari("Putuskan");
const kunci = blokDari("Kunci");

// ---- masukan: naskah -------------------------------------------------------------------------------------------------------
const bag3 = bagian(naskah, "## 3. Inti teknis Tahap 6 · Tiap data punya satu rumah", "\n## 3b. ");
const bag4 = bagian(naskah, "## 4. Masalah yang muncul, pelan-pelan", "\n## 5. ");
const bag4b = bagian(naskah, "### ADR yang lahir di Tahap 6", "\n### Yang tidak bisa dibuktikan tanpa lab");
const peta = bagian(naskah, "## Peta halaman Tahap 6", "\nCatatan untuk `T6-siap`");
const jalur = naskah.split("Jalur per peran:")[1]!;
const m54 = sel(barisAwal(bag4, "| M54 |"));
const adr63 = sel(barisAwal(bag4b, "| 63 |"));
const gejala = m54[2]!, dikira = m54[3]!, sebenarnya = m54[4]!, konsepM54 = m54[5]!;
const butirAdr = adr63[1]!, opsiAdr = adr63[2]!, kapanSalah = adr63[3]!;

const mG = cocok(gejala, /Kamis (\d\d\.\d\d) pembayaran negara kedua gagal (\d,\d)% selama (\d+) menit/);
const jamKejadian = mG[1]!, persenGagal = num(mG[2]!), menitKejadian = Number(mG[3]);
const mD = cocok(gejala, /sembilan perubahan dari (\w+) tim \((\w+) deploy, (\w+) flag, (\w+) aturan skor, (\w+) migration, (\w+) perubahan konfigurasi\)/);
const timPerubahan = KATA[mD[1]!]!;
const jenisPerubahan = ["deploy", "flag", "aturan skor", "migration", "perubahan konfigurasi"].map((j, i) => ({ jenis: j, kata: mD[i + 2]!, n: KATA[mD[i + 2]!]! }));
const totalPerubahan = jenisPerubahan.reduce((s, j) => s + j.n, 0);
const mA = cocok(gejala, /hari ke-(\d+) anggaran kegagalan ([\d,]+) menit sudah terpakai (\d+) menit/);
const hariKe = Number(mA[1]), anggaran = num(mA[2]!), terpakai = Number(mA[3]);
const hariSLO = 30;

// beban Tahap 6 dari bagian 3 naskah: transaksi uang puncak dengan 3 dan dengan 2 transaksi per user aktif per hari
const bag1 = bagian(naskah, "## 1. PRD v6 · Rekeningo untuk tiga negara", "\n## 2. ");
const userV6 = num(cocok(bag1, /(\d{1,3}(?:\.\d{3})+) user terdaftar/)[1]!);
const aktifPersen = Number(cocok(bag1, /\((\d+)% dari [\d.]+\)/)[1]);
const puncakFaktor = Number(cocok(bag3, /faktor puncak (\d+)/)[1]);
const detikHari = num(cocok(bag3, /([\d.]+) detik per hari/)[1]!);
const trxM = cocok(barisAwal(bag3, "| Transaksi uang |"), /× (\d) = ([\d.]+) per hari \(trx (\d): ([\d.]+)\)/);
const trxDasar = Number(trxM[1]), trxDua = Number(trxM[3]);
const aktif = (userV6 * aktifPersen) / 100;
const puncak3 = (aktif * trxDasar) / detikHari * puncakFaktor;
const puncak2 = (aktif * trxDua) / detikHari * puncakFaktor;

const mR = cocok(barisAwal(bag3, "| Frekuensi rilis |"), /\| (\d+) × (\d) ÷ (\d+) \| (\d+) per hari, ([\d,]+) per jam/);
const timRilis = Number(mR[1]), rilisPerTim = Number(mR[2]), jamKerja = Number(mR[3]);
const mS = cocok(barisAwal(bag3, "| SLO berantai |"), /\| SLO\^n.*\| (\d) service di jalur bayar, masing-masing ([\d,]+)%.*\| 0,999\^4 = ([\d,]+), atau ([\d,]+)%: ([\d,]+) menit per (\d+) hari, (\w+) kali anggaran satu service/);
const nSerial = Number(mS[1]), sloService = num(mS[2]!) / 100;
const anggaranSLO = (1 - sloService) * 43_200;

// ---- hitungan halaman (dari angka yang tertulis di halaman) --------------------------------------------------------------------
const kejadianSetara = menitKejadian * (persenGagal / 100); // 0,44
const kejadianPersen = (kejadianSetara / anggaran) * 100; // 1,0
const terpakaiPersen = (terpakai / anggaran) * 100; // 106,5
const burnRate = terpakai / anggaran / (hariKe / hariSLO); // 1,68
const bukanDeploy = jenisPerubahan.filter((j) => j.jenis !== "deploy").reduce((s, j) => s + j.n, 0);
const persenBukan = (bukanDeploy / totalPerubahan) * 100;
const rilisHari = timRilis * rilisPerTim;
const rilisJam = rilisHari / jamKerja;
const ketersediaan = sloService ** nSerial; // 0,996006
const menitBerantai = (1 - ketersediaan) * 43_200; // 172,54
const kaliBerantai = menitBerantai / anggaranSLO;
const sloPerService = 0.999 ** (1 / nSerial); // 0,99975
const anggaranPerService = (1 - sloPerService) * 43_200; // 10,8
const canary = 0.01;
const sampel3 = puncak3 * canary, sampel2 = puncak2 * canary;
const gagalCanary = (persenGagal / 100) * canary * 100; // 0,02%
const menitCanary = kejadianSetara * canary; // 0,0044
const reqPerUser = Number(cocok(bag3, /(\d+) request per user aktif per hari/)[1]);
const reqPuncak = ((aktif * reqPerUser) / detikHari) * puncakFaktor; // 13.888,9
const rtoMenit = 15;
const rtoPersen = (rtoMenit / 43.2) * 100; // 34,7
const detik1000 = 1000 / sampel3, detik1000b = 1000 / sampel2;
const pod30 = 3 * 10; // 3 pod tiap service untuk 1.388,9 request per detik; 10 kali beban (halaman 6.1)

// ---- masukan: halaman lain (halaman ADR-nya, bukan naskah) ---------------------------------------------------------------------
const t523 = teksHalaman("t5-rollout");
const t527 = teksHalaman("t5-tim-infra");
const t530 = teksHalaman("t5-adr-60");
const t517 = teksHalaman("t5-pooler");
const t61 = teksHalaman("t6-prd");
const gateway = baca("labs/t5-rollout/output/gateway.txt").split("\n");
const analisis = baca("labs/t5-rollout/output/analisis.txt").split("\n");
const readmeRollout = baca("labs/t5-rollout/README.md");
const barisRekaman = (b: string[], awal: string, dari0 = 0): number => {
  const i = b.findIndex((x, k) => k >= dari0 && x.startsWith(awal));
  expect(i, `baris rekaman tidak ada: ${awal}`).toBeGreaterThanOrEqual(0);
  return i + 1; // nomor baris berbasis 1
};

describe("susunan halaman, registry, dan meta", () => {
  test("lima blok jenis konsep: Mulai dan Coba terbuka, sisanya tertutup; atribut aman hanya di Coba", () => {
    const b = daftarBlok(badan);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(hitung(badan, "aman=")).toBe(1);
    expect(badan).toMatch(/<Blok nama="Coba" buka aman="[^"]+">/);
  });
  test("registry: halaman 6.5 jenis konsep, ada, ADR 63, prasyarat dan peran dari naskah", () => {
    expect(reg.nomor).toBe("6.5");
    expect(reg.tahap).toBe(6);
    expect(reg.jenis).toBe("konsep");
    expect(reg.ada).toBe(true);
    expect(reg.adr).toEqual([63]);
    const baris = barisAwal(peta, "| 6.5 |");
    const c = sel(baris);
    expect(c[3]).toBe("Masalah + ADR");
    expect(reg.judul.startsWith("M54: Sembilan perubahan dalam 30 menit + ADR 63")).toBe(true);
    expect(c[2]).toBe(reg.judul);
    expect(reg.prasyarat).toEqual(["t6-m53", "t5-rollout", "t5-tim-infra"]);
    const peran = (nama: string) => jalur.split(`**${nama}**`)[1]!.split("\n")[0]!;
    expect(peran("Mobile")).toContain("6.5");
    expect(peran("DevOps")).toContain("6.5");
    expect(peran("Security")).not.toContain("6.5");
    expect(reg.peran).toContain("mobile");
    expect(reg.peran).toContain("devops");
    expect(reg.peran).not.toContain("security");
  });
  test("title memakai nomor dan judul registry tanpa keterangan dalam kurung; meta cocok dengan registry", () => {
    expect(front).toContain(`title: "${reg.nomor} ${reg.judul.split(" (")[0]}"`);
    const meta = cocok(badan.split("\n").find((l) => l.startsWith('<p class="meta">'))!, /Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+?) · Jalur inti/);
    expect(Number(meta[1]) + Number(meta[2])).toBe(reg.menit);
    expect(reg.inti).toBe(true);
    expect(meta[3]!.split(", ")).toEqual(reg.prasyarat!.map((p) => `[[${p}]]`));
    expect(Number(meta[2])).toBe(3);
  });
  test("tiap [[id]] di halaman dan JSON ada di registry; tidak ada rujukan ke berkas yang tidak ada", () => {
    for (const m of (mdx + teksBanding).matchAll(/\[\[([^\]]+)\]\]/g)) expect(hal.some((h) => h.id === m[1]), `[[${m[1]}]] tidak ada`).toBe(true);
    expect(teksBanding).not.toMatch(/\[\[/);
    for (const m of badan.matchAll(/<Snippet file="([^"]+)"/g)) expect(fs.existsSync(path.join(akar, m[1]!)), m[1]).toBe(true);
    expect(badan).toContain('<WidgetLama nama="banding" src="data/t6-m54-banding.json" />');
    expect(badan).toContain('<SkripLama daftar={["cerita","banding"]} />');
  });
  test("nomor ADR yang disebut dibaca ke registry: tiap ADR punya halaman yang memuatnya", () => {
    const disebut = new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1])));
    expect([...disebut].sort((a, b) => a - b)).toEqual([52, 55, 58, 60, 63, 66]);
    const rumah: Record<number, string> = { 52: "t5-pooler", 55: "t5-rollout", 58: "t5-tim-infra", 60: "t5-adr-60", 63: "t6-m54", 66: "t6-residensi" };
    for (const n of disebut) expect(dari(rumah[n]!).adr, `ADR ${n}`).toContain(n);
  });
  test("glosarium: Chaos testing dan SLO berantai menunjuk halaman ini, dan arti SLO berantai sama dengan yang ditulis halaman", () => {
    const g = glosarium as unknown as { t: string; d: string; b: string; u: string | null }[];
    for (const t of ["Chaos testing", "SLO berantai"]) {
      const e = g.find((x) => x.t === t);
      expect(e, t).toBeDefined();
      expect(e!.b).toBe("t6-m54");
      expect(e!.u).toBe("/tahap-6/m54-sembilan-perubahan/");
    }
    const slo = g.find((x) => x.t === "SLO berantai")!;
    expect(slo.d).toContain("hasil kali SLO tiap service");
    harus("kegagalan yang saling bebas membuatnya hasil kali SLO tiap service");
    expect(konsepM54).toContain("SLO per tim");
  });
});

describe("adegan Mulai diturunkan dari baris M54 naskah", () => {
  test("hari, jam, persen, menit, jumlah dan jenis perubahan, hari ke dan anggaran sama dengan naskah", () => {
    expect(mulai).toContain(`Kamis pukul ${jamKejadian} sebanyak ${id(persenGagal, 1)}% pembayaran di negara kedua gagal. Kegagalan itu berlangsung ${menitKejadian} menit.`);
    expect(totalPerubahan).toBe(KATA.sembilan);
    expect(timPerubahan).toBe(KATA.lima);
    const frasa = jenisPerubahan.map((j) => `${j.kata} ${j.jenis}`);
    expect(mulai).toContain(`jumlahnya sembilan: ${frasa.slice(0, 4).join(", ")}, dan ${frasa[4]}.`);
    expect(mulai).toContain("Lima tim menjawab satu per satu");
    expect(mulai).toContain(`Pada hari ke-${hariKe} dari ${hariSLO} hari, anggaran kegagalan ${id(anggaran, 1)} menit sudah terpakai ${terpakai} menit.`);
    expect(mulai).toContain("Dewi dari tim SRE bertanya apa yang berubah dalam 30 menit terakhir.");
  });
  test("adegan tanpa kalimat definisi, tanpa jawaban tebakan, dan menunjuk pertanyaan ketiga PRD v6", () => {
    const adegan = mulai.split("\n\n").map((p) => p.trim()).filter((p) => p && !p.startsWith("*"));
    for (const p of adegan.slice(0, 3)) expect(p, p).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/);
    expect(adegan.length).toBe(4);
    for (const p of adegan.slice(0, 3)) expect(p).not.toMatch(/77,8|Tujuh:/);
    expect(mulai).toContain("pertanyaan ketiga di PRD v6, yaitu siapa yang tahu perubahan mana yang merusak ([[t6-prd]])");
    expect(t61).toContain("Kalau 11 tim merilis tiap jam, siapa yang tahu perubahan mana yang merusak?");
    expect(t61).toContain("[[t6-m54]] untuk yang ketiga");
  });
  test("catatan angka cerita menyebut label Ilustrasi dan Asumsi produk, dan SLO 99,9% per 30 hari", () => {
    expect(mulai).toContain("*Angka cerita (Ilustrasi):* hari, jam, 2,0%, 22 menit, sembilan perubahan, dan 46 menit berasal dari naskah, bukan dari rekaman.");
    expect(mulai).toContain("Anggaran 43,2 menit berasal dari SLO 99,9% per 30 hari (Asumsi produk, [[t6-prd]]).");
    expect(t61).toContain("99,9% pembayaran tersedia per 30 hari");
    expect(cara).toContain("Label sumber");
    expect(mulai).toContain("[Label sumber](/cara-pakai/#label-sumber)");
  });
});

describe("hitungan diturunkan dari angka naskah dan halaman, dibulatkan setengah ke atas", () => {
  test("beban puncak 694,4 dan 463,0 dari bagian 3 naskah", () => {
    expect(userV6).toBe(10_000_000);
    expect(id(puncak3, 1)).toBe("694,4");
    expect(id(puncak2, 1)).toBe("463,0");
    expect(num(trxM[4]!)).toBe(aktif * trxDua);
    expect(barisAwal(bag3, "| Transaksi uang |")).toContain("69,4 rata-rata dan 694,4 puncak (trx 2: 46,3 dan 463,0)");
    harus(`Puncak transaksi ${id(puncak3, 1)} per detik, atau ${id(puncak2, 1)} bila tiap user aktif melakukan ${trxDua} transaksi per hari (Hitungan atas Asumsi).`);
  });
  test("kejadian Kamis: 0,44 menit, 1,0%, 106,5%, dan burn rate 1,7", () => {
    harus(`${menitKejadian} × ${id(persenGagal / 100, 2)} = ${id(kejadianSetara, 2)} menit henti penuh, yaitu ${id(kejadianSetara, 2)} ÷ ${id(anggaran, 1)} = ${id(kejadianPersen, 1)}% anggaran (Hitungan atas Ilustrasi)`);
    harus(`${terpakai} ÷ ${id(anggaran, 1)} = ${id(terpakaiPersen, 1)}% anggaran (Hitungan atas Ilustrasi)`);
    harus(`${terpakai} ÷ ${id(anggaran, 1)} ÷ (${hariKe} ÷ ${hariSLO}) = ${id(burnRate, 1)} kali laju yang pas menghabiskannya di akhir periode (Hitungan atas Ilustrasi)`);
    expect(id(kejadianSetara, 2)).toBe("0,44");
    expect(id(kejadianPersen, 1)).toBe("1,0");
    expect(id(terpakaiPersen, 1)).toBe("106,5");
    expect(id(burnRate, 1)).toBe("1,7");
    expect(sebenarnya).toContain("22 × 0,02 = 0,44 menit henti penuh (Hitungan atas Ilustrasi)");
    expect(t527).toContain("Alert burn rate 14,4 selama 1 jam dan 6 selama 6 jam memanggil orang, dan 1 selama 3 hari membuka tiket");
    expect(terpakai).toBeGreaterThan(anggaran);
  });
  test("tujuh dari sembilan bukan deploy, 77,8%, dan rilis 44 per hari, 5,5 per jam", () => {
    expect(bukanDeploy).toBe(7);
    expect(id(persenBukan, 1)).toBe("77,8");
    expect(coba).toContain(`${bukanDeploy} ÷ ${totalPerubahan} = ${id(persenBukan, 1)}% dari semua perubahan (Hitungan atas Ilustrasi)`);
    expect(coba).toContain("Tujuh: tiga flag, satu aturan skor, satu migration, dan dua perubahan konfigurasi.");
    expect(jenisPerubahan.filter((j) => j.jenis !== "deploy").map((j) => `${j.kata} ${j.jenis}`)).toEqual(["tiga flag", "satu aturan skor", "satu migration", "dua perubahan konfigurasi"]);
    expect(rilisHari).toBe(44);
    expect(id(rilisJam, 1)).toBe("5,5");
    harus(`Tiap tim merilis ${rilisPerTim} kali per hari (Asumsi cerita). Jadi ${timRilis} × ${rilisPerTim} = ${rilisHari} rilis per hari, atau ${rilisHari} ÷ ${jamKerja} jam kerja = ${id(rilisJam, 1)} per jam (Hitungan atas Asumsi cerita).`);
    expect(t61).toContain("11 × 4 = 44 rilis per hari");
    expect(sebenarnya).toContain("Rilis 44 per hari, 5,5 per jam (Hitungan atas Asumsi)");
  });
  test("SLO berantai: 99,6%, 172,5 menit, 4,0 kali, 99,975%, dan 10,8 menit per service", () => {
    expect(nSerial).toBe(4);
    expect(id(ketersediaan * 100, 1)).toBe("99,6");
    expect(id(menitBerantai, 1)).toBe("172,5");
    expect(id(kaliBerantai, 1)).toBe("4,0");
    expect(id(sloPerService * 100, 3)).toBe("99,975");
    expect(id(anggaranPerService, 1)).toBe("10,8");
    expect(mS[3]).toBe("0,9960");
    expect(mS[4]).toBe("99,6");
    expect(mS[5]).toBe("172,5");
    harus(`Empat service dengan SLO 99,9% memberi 0,999 dipangkatkan 4 = ${mS[3]}, atau ${mS[4]}% (Hitungan atas Asumsi: empat service di jalur bayar, kegagalan bebas).`);
    harus(`Itu ${mS[5]} menit per ${mS[6]} hari, yaitu ${mS[5]} ÷ ${id(anggaranSLO, 1)} = ${id(kaliBerantai, 1)} kali anggaran satu service.`);
    harus(`tiap service butuh akar keempat dari 0,999 = ${id(sloPerService * 100, 3)}%. Anggaran tiap service jadi (1 − 0,99975) × 43.200 = ${id(anggaranPerService, 1)} menit (Hitungan atas Asumsi).`);
    expect(adr63[1]).toContain("SLO berantai");
    harus("untuk empat service berurutan, 99,975% tiap service (Hitungan atas Asumsi)");
  });
  test("canary: 2,0% × 1% = 0,02%, 0,0044 menit, 1 ÷ 30 = 3,3%, 6,944 dan 4,630 transaksi per detik, 144 dan 216 detik", () => {
    expect(id(gagalCanary, 2)).toBe("0,02");
    expect(id(menitCanary, 4)).toBe("0,0044");
    expect(id((1 / pod30) * 100, 1)).toBe("3,3");
    expect(id(sampel3, 3)).toBe("6,944");
    expect(id(sampel2, 3)).toBe("4,630");
    expect(id(detik1000, 0)).toBe("144");
    expect(id(detik1000b, 0)).toBe("216");
    harus(`${id(persenGagal, 1)}% × ${canary * 100}% = ${id(gagalCanary, 2)}% pembayaran gagal`);
    harus(`${id(kejadianSetara, 2)} × ${id(canary, 2)} = ${id(menitCanary, 4)} menit henti penuh (Hitungan atas Ilustrasi)`);
    harus(`Satu pod adalah 1 ÷ ${pod30} = ${id(100 / pod30, 1)}% dari ${pod30} pod, jadi rasio pod tidak bisa memberi langkah 1% (Hitungan atas Asumsi desain).`);
    harus(`1% × ${id(puncak3, 1)} = ${id(sampel3, 3)} transaksi per detik di puncak (dengan ${trxDua} transaksi: ${id(sampel2, 3)})`);
    harus(`Di puncak itu 1.000 ÷ ${id(sampel3, 3)} = ${id(detik1000, 0)} detik per langkah, dan dengan ${trxDua} transaksi ${id(detik1000b, 0)} detik (Hitungan atas Asumsi).`);
    harus(`dibulatkan ${id(sampel3, 1)} (Hitungan atas Asumsi)`);
    expect(kapanSalah).toContain(`1% × ${id(puncak3, 1)} = ${id(sampel3, 1)} transaksi per detik di puncak`);
    expect(sebenarnya).toContain("Hitungan atas Asumsi");
    // 30 pod tiap service datang dari halaman 6.1, bukan dari halaman ini
    expect(t61).toContain("memakai 3 × 10 = 30 pod tiap service");
    expect(t61).toContain("Contoh 8 pod di ADR 52 berarti 8 ÷ 3 = 2,7 kali");
    expect(t517).toContain("8 pod tiap service memberi 480 client lawan 400 per instance");
    // pod pertama yang melewati 400 per instance: 6 service × n pod × pool 10 > 400 (halaman 6.1: 7 pod, 420 client, 2,3 kali beban Tahap 5)
    const batasKoneksi = 400, layanan = 6, poolPod = 10;
    const podPertama = Math.floor(batasKoneksi / (layanan * poolPod)) + 1;
    expect(podPertama).toBe(7);
    expect(layanan * (podPertama - 1) * poolPod).toBeLessThanOrEqual(batasKoneksi);
    expect(layanan * podPertama * poolPod).toBeGreaterThan(batasKoneksi);
    expect(t61).toContain(`jadi ${podPertama} pod tiap service sudah memberi ${layanan} × ${podPertama} × ${poolPod} = ${layanan * podPertama * poolPod} client`);
    expect(t61).toContain(`Tujuh pod berarti ${podPertama} ÷ 3 = ${id(podPertama / 3, 1)} kali beban Tahap 5`);
    harus(`Syarat jumlah koneksi ADR 52 sudah terlewati pada ${podPertama} pod tiap service. Jumlahnya ${layanan} service × ${podPertama} pod × pool ${poolPod} = ${layanan * podPertama * poolPod} koneksi dari pod ke pooler, lawan batas ${batasKoneksi} per instance. Itu ${podPertama} ÷ 3 = ${id(podPertama / 3, 1)} kali beban Tahap 5 ([[t6-prd]], [[t5-pooler]], Penalaran atas Asumsi desain).`);
  });
  test("RTO 15 menit memakai 34,7% anggaran dan tiga kegagalan melewatinya, dibaca ke halaman 5.27", () => {
    expect(id(rtoPersen, 1)).toBe("34,7");
    expect(3 * rtoPersen).toBeGreaterThan(100);
    expect(t527).toContain("Satu kegagalan sepanjang RTO 15 menit ([[t5-rpo-rto]]) memakai 15 ÷ 43,2 = 34,7% anggaran");
    expect(t527).toContain("Tiap kegagalan sepanjang RTO 15 menit memakai 15 ÷ 43,2 = 34,7% anggaran (Hitungan atas Asumsi), dan tiga kegagalan melewatinya");
    expect(putuskan).toContain(`Tiap kegagalan sepanjang RTO ${rtoMenit} menit memakai ${rtoMenit} ÷ 43,2 = ${id(rtoPersen, 1)}% anggaran, dan tiga kegagalan melewatinya ([[t5-tim-infra]], Hitungan atas Asumsi).`);
    expect(kapanSalah).toContain("tiap kegagalan sepanjang RTO 15 menit memakai 34,7% anggaran, tiga kegagalan melewatinya (5.27, Hitungan atas Asumsi)");
  });
  test("label Hitungan selalu atas satu label sumber; tiap kemunculan Hitungan tanpa 'atas' hanya di definisi", () => {
    const tanpa = [...badan.matchAll(/Hitungan(?! atas)/g)];
    expect(tanpa.length, "Hitungan tanpa 'atas' hanya di definisi").toBe(1);
    expect(badan).toContain("- **Hitungan:** angka yang dihitung dari angka lain di halaman ini. Labelnya ikut masukan yang paling lemah.");
    expect(badan).toContain("- **Penalaran:** kesimpulan dari sumber atau angka di halaman, bukan hasil ukuran.");
    expect(badan).toContain("masing-masing berdampingan dengan salah satu dari lima label sumber");
    for (const m of badan.matchAll(/Hitungan atas ([A-Za-z]+(?: (?:cerita|desain|produk))?)/g)) expect(["Ilustrasi", "Asumsi", "Asumsi cerita", "Asumsi desain"], m[0]).toContain(m[1]);
    expect(badan).not.toMatch(/\(Hitungan\)/);
    expect(cara).toContain("Rekaman lab");
  });
});

describe("rekaman Tahap 5: rentang Snippet diturunkan dari isi berkas, dan klaim atas rekaman", () => {
  test("gateway.txt bagian B: baris dari 'Rollout kartu versi v1' sampai bobot sekarang, dengan 3 pod, pod v2 1, bobot 95 dan 5", () => {
    const b = barisRekaman(gateway, "# --- B.");
    const awal = barisRekaman(gateway, "Rollout kartu versi v1", b);
    const akhir = barisRekaman(gateway, "HTTPRoute kartu-route, bobot sekarang", b);
    expect(`${awal}:${akhir}`).toBe("7:11");
    expect(badan).toContain(`<Snippet file="labs/t5-rollout/output/gateway.txt" lines="${awal}:${akhir}" title="Rekaman lab: labs/t5-rollout/output/gateway.txt, bagian B (bobot 95 dan 5 dengan 3 replika)" />`);
    const potong = gateway.slice(awal - 1, akhir);
    expect(potong[0]).toContain("3 pod siap");
    expect(potong.join("\n")).toContain("bobot awal: {\"kartu-stable\": 100, \"kartu-canary\": 0}");
    expect(potong.join("\n")).toContain("Pod v1: 3, pod v2: 1");
    expect(potong[potong.length - 1]).toContain("{\"kartu-stable\": 95, \"kartu-canary\": 5}");
    expect(potong.join("\n")).not.toMatch(/^#/m);
    harus("Satu pod dari empat tetap 25,0% pod, tetapi bobot di HTTPRoute 5. HTTPRoute adalah objek Gateway API yang memuat bobot tiap Service ([[t5-rollout]]).");
    expect(t523).toContain("HTTPRoute adalah objeknya yang memuat bobot tiap Service");
    expect(1 / (1 + 3)).toBe(0.25);
  });
  test("analisis.txt bagian C: baris dari analisis Failed sampai 100 permintaan, bobot kembali 100 dan 0", () => {
    const b = barisRekaman(analisis, "# --- C.");
    const awal = barisRekaman(analisis, "AnalysisRun rasio-tolak: phase Failed", b);
    const akhir = barisRekaman(analisis, "100 permintaan sesudah rollback", b);
    expect(`${awal}:${akhir}`).toBe("11:18");
    expect(badan).toContain(`<Snippet file="labs/t5-rollout/output/analisis.txt" lines="${awal}:${akhir}" title="Rekaman lab: labs/t5-rollout/output/analisis.txt, bagian C (analisis gagal membalik rollout)" />`);
    const potong = analisis.slice(awal - 1, akhir).join("\n");
    expect(potong).toContain("Rollout kartu: phase Degraded, abort True");
    expect(potong).toContain("sesudah rollback: {\"kartu-stable\": 100, \"kartu-canary\": 0}");
    expect(potong).toContain("v1 menjawab 100, v3 menjawab 0");
    expect(potong).not.toMatch(/^#/m);
    harus("Analisis menggagalkannya, bobot kembali ke versi lama, dan 100 dari 100 permintaan berikutnya dijawab versi lama:");
    expect(analisis.join("\n")).toContain("Angka 31% memerankan naskah M49 (Ilustrasi)");
    harus("Angka 31% memerankan naskah Tahap 5 (Ilustrasi).");
  });
  test("lab hanya menganalisis rasio tolak dan tidak memasang Prometheus; tidak ada lab Tahap 6 di folder labs", () => {
    expect(analisis.join("\n")).toContain("AnalysisRun rasio-tolak");
    expect(readmeRollout).toContain("Prometheus tidak dipasang");
    for (const f of fs.readdirSync(path.join(akar, "labs/t5-rollout/manifes"))) {
      expect(fs.readFileSync(path.join(akar, "labs/t5-rollout/manifes", f), "utf8"), f).not.toMatch(/\bSLO\b/i);
    }
    expect(fs.readdirSync(path.join(akar, "labs")).filter((n) => n.startsWith("t6"))).toEqual([]);
    harus("Lab merekam analisis atas rasio tolak otorisasi untuk satu service, bukan atas SLO.");
    harus("Halaman ini tidak punya Rekaman lab baru, karena Tahap 6 tidak punya lab.");
    expect(badan).toContain("Lab `t5-rollout` merekam satu langkah 5% dan analisis rasio tolak untuk service kartu, tanpa Prometheus");
  });
  test("halaman 5.23 dan 5.30 menulis apa yang halaman ini kutip: plugin alpha, aturan 3 ADR 55, bobot dari router, butir 12 ADR 60", () => {
    expect(t523).toContain("Plugin ini masih alpha.");
    expect(t523).toContain("jadi jeda tiap langkah harus cukup panjang untuk sampelnya");
    expect(t523).toMatch(/3\. Analisis latar memeriksa rasio tolak \(direkam\)/);
    expect(t523).toContain("canary 1%, 5%, 25%, 100% (Asumsi naskah)");
    expect(t523).toContain("Bobot ditulis plugin Gateway API ke HTTPRoute");
    expect(t523).toContain("Kill switch kartu adalah satu sakelar `kartu_aktif`");
    expect(t523).toContain("Rekaman memakai Traefik 3.7.13, Gateway API v1.6.1, dan plugin v0.17.0");
    expect(t530).toContain("12. OpenFeature dan flagd");
    expect(t530).toContain("Spesifikasi OpenFeature mencapai 1.0 dan flag aktif lebih dari satu");
    expect(t530).toContain("Flag aktif ada satu: sakelar `kartu_aktif`");
    harus("Plugin Gateway API yang masih alpha");
    expect(putuskan).toContain("seperti aturan 3 ADR 55");
    harus("menunda OpenFeature selama flag aktif hanya satu");
    harus('syarat "flag aktif lebih dari satu" di butir 12 ADR 60 terpenuhi (Ilustrasi, [[t5-adr-60]])');
    harus("Syarat satunya lagi belum: spesifikasi OpenFeature mencapai 1.0.");
    expect(t527).toContain("SLO pembayaran 99,9% per 30 hari. Alert burn rate");
    expect(hal.filter((h) => h.id === "t5-m49").length).toBe(1);
  });
});

describe("sumber primer: tautan, tanggal buka, dan nilai di baris riset R6-130 sampai R6-134", () => {
  const baris = riset6.split("\n").filter((b) => /^\| R6-13[0-4] \|/.test(b));
  const semuaId = [...riset6.matchAll(/^\| (R6-\d+) \|/gm)].map((m) => m[1]!);
  test("lima baris berurutan, tanpa ID ganda, disisip antara R6-114 dan R6-170; ID riset tidak tampil di halaman atau JSON", () => {
    expect(baris.map((b) => b.split(" | ")[0])).toEqual(["| R6-130", "| R6-131", "| R6-132", "| R6-133", "| R6-134"]);
    expect(new Set(semuaId).size).toBe(semuaId.length);
    const i = semuaId.indexOf("R6-130");
    expect(semuaId[i - 1]).toMatch(/^R6-1(1[0-9])$/);
    expect(semuaId.slice(i, i + 5)).toEqual(["R6-130", "R6-131", "R6-132", "R6-133", "R6-134"]);
    expect(Number(semuaId[i + 5]!.slice(3))).toBeGreaterThan(134);
    for (const b of baris) expect(sel(b).length).toBe(5);
    expect(mdx + teksBanding).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(mdx + teksBanding).not.toMatch(/keputusan \d{3,4}|PR #\d+|#\d{3}\b/);
  });
  test("tiap tautan eksternal di halaman ada di baris riset (domain dan jalur) dan ditulis 'dibuka 2026-11-06'", () => {
    const tautan = [...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    const unik = [...new Set(tautan)];
    expect(unik.sort()).toEqual([
      "https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/",
      "https://github.com/chaos-mesh/chaos-mesh/issues/4827",
      "https://github.com/chaos-mesh/chaos-mesh/releases/tag/v2.8.3",
      "https://github.com/open-feature/spec/releases",
      "https://principlesofchaos.org/",
      "https://sre.google/workbook/canarying-releases/",
      "https://sre.google/workbook/error-budget-policy/",
      "https://support.google.com/googleplay/android-developer/answer/6346149",
    ]);
    const semua = baris.join("\n");
    for (const u of unik) {
      const kunciUrl = u.replace("https://", "").replace(/\/$/, "");
      const host = kunciUrl === "github.com/open-feature/spec/releases" ? "open-feature/spec/releases" : kunciUrl;
      expect(semua, u).toContain(host);
    }
    // tiap tautan di prosa ditutup dengan tanggal buka yang sama dengan baris riset
    const tanggalRiset = new Set([...semua.matchAll(/teks HTML dibuka (\d{4}-\d\d-\d\d)|`gh api[^`]*` \(?(\d{4}-\d\d-\d\d)/g)].map((m) => m[1] ?? m[2]!));
    expect([...tanggalRiset]).toEqual(["2026-11-06"]);
    for (const m of badan.matchAll(/\]\(https:\/\/[^)]+\), ([^)]*)\)/g)) expect(m[0], m[0]).toMatch(/dibuka 2026-11-06/);
    expect(badan).not.toMatch(/dibuka (?!2026-11-06)/);
    // satu kemunculan lagi: sel Bukti opsi F di tabel kedua ADR 63 (tanpa tautan)
    expect(hitung(badan, "dibuka 2026-11-06")).toBe([...badan.matchAll(/\]\(https:\/\/[^)]+\), ([^)]*)\)/g)].length + 1);
  });
  test("SRE Workbook: canary, model sederhana 20% pada 5%, sebelum dan sesudah, satu canary, kebijakan empat minggu dan 70%", () => {
    const r130 = baris[0]!, r131 = baris[1]!;
    for (const k of ["deployment sebagian dan sementara", "kegagalan 20% pada canary 5% memberi kegagalan keseluruhan 1%", "evaluasi sebelum dan sesudah berisiko", "We strongly advise running only one canary deployment at a time", "SLI yang sudah mengukur SLO", "bab 16"]) expect(r130, k).toContain(k);
    for (const k of ["jendela empat minggu", "isu P0 dan perbaikan keamanan", "bukan hukuman", "roughly 70% of our outages", "2018-02-19"]) expect(r131, k).toContain(k);
    harus("kegagalan 20% pada canary 5% memberi kegagalan keseluruhan 1% (sumber yang sama)");
    harus("sekitar 70% dari outage penulis contoh itu");
    harus("Angka itu dari satu organisasi dan tidak dipakai sebagai angka Rekeningo.");
    harus("evaluasi sebelum dan sesudah berisiko, karena waktu adalah salah satu sumber perubahan metrik yang terbesar");
    harus("SRE Workbook menyarankan satu canary pada satu waktu.");
    harus("Bila layanan melewati anggaran kegagalan jendela empat minggu terakhir, semua perubahan dan rilis berhenti kecuali masalah P0, yaitu masalah berprioritas tertinggi, dan perbaikan keamanan.");
    harus("Contoh yang sama menulis bahwa kebijakan itu bukan hukuman.");
    expect(adr63[1]).toContain("Contoh kebijakan di SRE Workbook memakai jendela empat minggu");
    expect(adr63[1]).toContain("jendela kebijakan mengikuti jendela SLO");
    harus("Jendela kebijakan mengikuti jendela SLO 30 hari (Asumsi desain), sedangkan contoh SRE Workbook memakai empat minggu.");
  });
  test("chaos testing: empat langkah, prinsip lanjutan, isu Chaos Mesh #4827 ditutup 2026-04-16 oleh perbaikan, v2.7.x, [perlu verifikasi]", () => {
    const r132 = baris[2]!;
    for (const k of ["Last Update: 2019 March", "v2.7.x", "ditutup 2026-04-16 oleh PR #4829", "CrashLoopBackOff", "v2.8.7 (2026-10-28)", "catatan rilis v2.8.3", "terbit 2026-06-10", "dengan rujukan PR #4829", "v2.8.2 (2026-03-25) terbit sebelum PR digabung", "tidak dibuktikan dari riwayat git"]) expect(r132, k).toContain(k);
    expect(r132).not.toContain("[perlu verifikasi]");
    harus("pembaruan terakhir Maret 2019");
    harus("Versi yang dilaporkan v2.7.x, dan pod tertahan dalam restart berulang.");
    harus("Laporan itu ditutup 2026-04-16 oleh pull request perbaikan yang digabung hari itu");
    harus("Itu satu laporan dari satu user, dan catatan rilis v2.8.3 (2026-06-10) menyebut perbaikan yang sama ([catatan rilis Chaos Mesh v2.8.3](https://github.com/chaos-mesh/chaos-mesh/releases/tag/v2.8.3), dibuka 2026-11-06, Tidak dijalankan).");
    expect(hitung(badan, "[perlu verifikasi")).toBe(0);
    expect(kapanSalah).toContain("v2.7.x, ditutup 2026-04-16");
    expect(kapanSalah).toContain("[perlu verifikasi: dibaca dari isu]");
    harus("menulis pemulihan gagal saat pod restart di tengah percobaan (Tidak dijalankan).");
    expect(hitung(badan, "empat langkah")).toBe(1);
    expect(hitung(badan.split("Principles of Chaos Engineering menulis empat langkah")[1]!.split("\n\n")[1]!, "\n- ")).toBe(3); // butir 2 sampai 4 di dalam daftar sesudah baris pembuka
  });
  test("rilis app bertahap: Apple 1,2,5,10,20,50,100 persen hari 1 sampai 7 dan jeda 30 hari; Google Play tidak naik otomatis", () => {
    const r133 = baris[3]!;
    const mApple = cocok(r133, /hari 1 sampai 7 adalah ([\d%, ]+)\; siapa pun/);
    const persen = mApple[1]!.split(", ").map((x) => x.replace("%", ""));
    expect(persen).toEqual(["1", "2", "5", "10", "20", "50", "100"]);
    harus(`dengan ${persen.slice(0, 6).map((p) => p + "%").join(", ")}, dan ${persen[6]}% user pada hari 1 sampai 7`);
    for (const k of ["tujuh hari", "dijeda sampai 30 hari", "tidak naik otomatis", "tetap di versi itu"]) expect(r133, k).toContain(k);
    harus("rilis bertahap tujuh hari untuk perangkat dengan pembaruan otomatis");
    harus("rilis boleh dijeda sampai 30 hari");
    harus("rilis bertahap bernama staged rollout, dan persentasenya tidak naik otomatis. Sesudah rilis dihentikan, user yang sudah menerimanya tetap di versi itu");
    harus("Server tidak bisa mengembalikan app yang sudah terpasang di HP user (Penalaran).");
  });
  test("OpenFeature: rilis spesifikasi terbaru v0.9.0 terbit 2026-07-29 sama di baris riset, halaman, dan halaman 5.30", () => {
    const r134 = baris[4]!;
    expect(r134).toContain("v0.9.0 terbit 2026-07-29");
    harus("Tag rilis spesifikasi yang bernomor versi masih v0.9.0, terbit 2026-07-29. Tag yang lebih baru, `provider-tck/v0.1.0` (2026-10-16), adalah aset uji provider");
    expect(r134).toContain("`provider-tck/v0.1.0` (2026-10-16)");
    expect(putuskan).toContain("rilis spesifikasi v0.9.0, dibuka 2026-11-06");
    expect(putuskan).toContain("spesifikasi v0.9.0");
    expect(t523).toContain("Spesifikasi masih v0.9.0, belum 1.0");
    expect(kapanSalah + opsiAdr).toContain("spesifikasi belum 1.0");
    expect(naskah).toContain("v0.9.0 (terbit 2026-07-29, dicek 2026-11-06)");
    harus("Satu syarat dari dua tidak cukup, jadi pemicunya dibaca ulang di [[t6-adr-69]].");
  });
});

describe("blok Coba: tebak lewat lipatan, widget banding, dan jawaban yang tidak bocor", () => {
  test("lipatan Tebak dulu ada di blok Coba sebelum widget; jawabannya hanya di dalam lipatan", () => {
    const iLipat = coba.indexOf('<details class="question">');
    const iWidget = coba.indexOf("<WidgetLama");
    expect(iLipat).toBeGreaterThan(0);
    expect(iWidget).toBeGreaterThan(iLipat);
    expect(hitung(coba, "<details")).toBe(1);
    expect(hitung(coba, "</details>")).toBe(1);
    expect(coba).toContain("<summary>Tebak dulu: rapat persetujuan rilis harian menyetujui deploy sebelum dirilis. Dari sembilan perubahan Kamis itu, berapa yang tidak pernah masuk rapat itu?</summary>");
    const jawaban = coba.slice(coba.indexOf("</summary>"), coba.indexOf("</details>"));
    expect(jawaban).toContain("Tujuh:");
    expect(jawaban).toContain("77,8%");
    const luarLipatan = coba.slice(0, iLipat) + coba.slice(coba.indexOf("</details>"));
    expect(luarLipatan).not.toMatch(/Tujuh|77,8|tujuh/);
    expect(mulai + front).not.toMatch(/Tujuh|77,8|tujuh/);
    expect(coba.match(/aman="([^"]*)"/)).toBeNull(); // atribut aman ada di tag Blok, bukan di isi
    expect(badan.match(/<Blok nama="Coba"[^>]*aman="([^"]*)"/)![1]).not.toMatch(/Tujuh|77,8|tujuh|dua deploy|deploy/);
    expect(teksBanding).not.toMatch(/77,8|Tujuh|tujuh|7 dari 9/);
    // pertanyaan tebak memuat masukannya: rapat hanya menyetujui deploy, dan jumlah perubahan ada di adegan
    expect(mulai).toContain("dua deploy, tiga flag, satu aturan skor, satu migration, dan dua perubahan konfigurasi");
  });
  test("noscript memuat ringkasan tiga jenis perubahan tanpa JavaScript", () => {
    const ns = coba.match(/<noscript>([\s\S]*?)<\/noscript>/);
    expect(ns).not.toBeNull();
    expect(ns![1]).toContain("Tanpa JavaScript widget perbandingan tidak tampil.");
    for (const k of ["Rilis biasa", "Aturan skor dan flag", "1% lalu lintas", "analisis atas SLO", "garis waktu negara", "satu sakelar per database negara"]) expect(ns![1], k).toContain(k);
    expect(ns![1]).not.toMatch(/Tujuh|77,8/);
    expect(coba.indexOf("<noscript>")).toBeGreaterThan(coba.indexOf("<WidgetLama"));
  });
  test("widget banding: dua opsi, tiga kejadian dari peta naskah, semua simpul yang disorot ada, catatan tiap opsi terisi", () => {
    const d = bandingMentah as { judul: string; opsi: { id: string; nama: string; baris: { id: string; label: string; sub?: string }[][]; judulBaris: string[] }[]; fitur: { label: string; sorot: Record<string, string[]>; catatan: Record<string, string>; nada?: Record<string, string> }[] };
    const baris = sel(barisAwal(peta, "| 6.5 |"));
    const kejadian = cocok(baris[6]!, /pembaca memilih kejadian: ([^)]+)\)/)[1]!.split(", ");
    expect(kejadian).toEqual(["rilis biasa", "aturan skor", "flag"]);
    expect(d.fitur.map((f) => f.label.toLowerCase().replace(/ \(deploy\)$/, ""))).toEqual(kejadian);
    expect(d.opsi.map((o) => o.id)).toEqual(["dugaan", "adr63"]);
    for (const f of d.fitur) {
      for (const o of d.opsi) {
        const ids = d.opsi.find((x) => x.id === o.id)!.baris.flat().map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const s of f.sorot[o.id] ?? []) expect(ids, `${f.label}: ${s} di ${o.id}`).toContain(s);
        expect((f.catatan[o.id] ?? "").length, `${f.label} ${o.id}`).toBeGreaterThan(40);
      }
      for (const k of Object.keys(f.nada ?? {})) expect(d.opsi.map((o) => o.id)).toContain(k);
      expect(Object.keys(f.sorot).sort()).toEqual(["adr63", "dugaan"]);
    }
    expect(d.fitur.map((f) => f.sorot.adr63)).toEqual([["canary", "analisis"], ["garis"], ["flag", "garis"]]);
    expect(d.fitur.map((f) => f.sorot.dugaan)).toEqual([["pintu"], ["catat"], ["catat"]]);
    // teks widget memakai kata ADR 63: tahap canary dan sakelar dari naskah
    const semua = JSON.stringify(d);
    expect(butirAdr).toContain("1%, 5%, 25%, 100%");
    expect(semua).toContain("Canary 1%, 5%, 25%, 100%");
    expect(butirAdr).toContain("satu sakelar per database negara");
    expect(semua).toContain("satu sakelar per database negara");
    expect(semua).toContain("bobot lalu lintas dari Gateway API");
    expect(semua).toContain("deploy, flag, migration, konfigurasi");
    expect(semua).toContain("deploy, flag, aturan skor, migration, konfigurasi");
    expect(semua).toContain("rancangan, Tidak dijalankan");
    expect(semua).toContain("Penalaran, Ilustrasi");
    expect(semua).toContain("Asumsi desain");
    expect(semua).not.toMatch(/Rekaman lab/);
    expect(JSON.stringify(d.fitur.map((f) => f.nada))).toBe('[{"dugaan":"warn"},{"dugaan":"warn"},{"dugaan":"warn"}]');
  });
  test("tebak dan banding tidak memuat kata Rekaman lab; label di widget hanya Penalaran, Ilustrasi, Asumsi desain, Tidak dijalankan", () => {
    for (const m of teksBanding.matchAll(/\(([^()]*)\)/g)) expect(["Penalaran, Ilustrasi", "rancangan, Tidak dijalankan", "Asumsi desain", "yang dikira", "yang dipilih", "deploy"], m[1]).toContain(m[1]);
  });
});

describe("ADR 63: tabel opsi, enam aturan, pre-mortem, kapan salah, dan sengaja belum, diturunkan dari naskah", () => {
  test("enam aturan sesuai butir naskah: tiap butir punya frasa yang sama di naskah dan di halaman", () => {
    expect(butirAdr.match(/\(\d\) /g)!.length).toBe(6);
    const aturan = putuskan.split("**Keputusan: opsi E untuk perubahan dan opsi G untuk flag.** Enam aturan:")[1]!.split("**Kenapa E dan G, bukan yang lain.**")[0]!;
    expect(aturan.match(/^\d\. /gm)!.length).toBe(6);
    const frasa: string[][] = [
      ["SLO per service ditulis pemiliknya di katalog dari metrik penjaga", "SLO pembayaran 99,9% per negara dimiliki tim Pembayaran"],
      ["Gateway API seperti ADR 55", "bukan dari rasio pod", "analisis atas SLO", "rollback otomatis"],
      ["pemilik dan tanggal kedaluwarsa", "satu sakelar per database negara"],
      ["Deploy, flag, migration, dan konfigurasi ditulis ke satu garis waktu per negara"],
      ["Kebijakan error budget ditulis sebelum anggaran habis", "kecuali P0 dan perbaikan keamanan", "tanpa menghukum tim", "jendela SLO 30 hari", "empat minggu"],
      ["satu percobaan per tim per kuartal", "staging", "paling banyak 1% lalu lintas (Asumsi)", "hipotesis steady state tertulis", "tombol hentikan"],
    ];
    const butir = butirAdr.split(/\(\d\) /).slice(1);
    const poin = aturan.split(/^\d\. /m).slice(1);
    const norm = (s: string) => s.replace(/\s+/g, " ").toLowerCase();
    const hanyaHalaman = ["jendela SLO 30 hari", "empat minggu"];
    frasa.forEach((fs0, i) => {
      for (const f of fs0) {
        expect(norm(poin[i]!).includes(norm(f)), `halaman, aturan ${i + 1}: ${f}`).toBe(true);
        if (!hanyaHalaman.includes(f)) expect(norm(butir[i]!).includes(norm(f)), `naskah, butir ${i + 1}: ${f}`).toBe(true);
      }
    });
    expect(butir[3]).toContain("Deploy, flag, migration, dan konfigurasi ditulis ke satu garis waktu per negara");
    expect(butir[4]).toContain("jendela kebijakan mengikuti jendela SLO");
    expect(poin[3]).toContain("Aturan skor dihitung sebagai konfigurasi (Asumsi desain).");
    expect(poin[1]).toContain("canary golden path ([[t6-m52]])");
  });
  test("opsi: lima cara di naskah menjadi A sampai D dan F, dan opsi terpilih E dan G, urut seperti naskah", () => {
    const opsi = opsiAdr.split("; ").map((o) => o.replace(/\s*\(.*$/, "").trim());
    expect(opsi).toEqual(["Rapat persetujuan rilis harian", "pembekuan rilis hari tertentu", "rilis bebas dengan peringatan", "flag saja tanpa canary", "OpenFeature dan flagd"]);
    const t1 = putuskan.split("Tabel pertama membandingkan cara membatasi risiko perubahan:")[1]!.split("Tabel kedua membandingkan pengelolaan flag:")[0]!;
    const t2 = putuskan.split("Tabel kedua membandingkan pengelolaan flag:")[1]!.split("**Keputusan:")[0]!;
    const kepala1 = sel(t1.split("\n").find((l) => l.startsWith("| |"))!);
    const kepala2 = sel(t2.split("\n").find((l) => l.startsWith("| |"))!);
    expect(kepala1.slice(1).map((k) => k.slice(0, 1))).toEqual(["A", "B", "C", "D", "E"]);
    expect(kepala2.slice(1).map((k) => k.slice(0, 1))).toEqual(["F", "G"]);
    const tanpaHuruf = (k: string) => k.slice(3).toLowerCase();
    expect(tanpaHuruf(kepala1[1]!)).toBe(opsi[0]!.toLowerCase());
    expect(tanpaHuruf(kepala1[2]!)).toBe(opsi[1]!.toLowerCase());
    expect(tanpaHuruf(kepala1[3]!)).toBe(opsi[2]!.toLowerCase());
    expect(tanpaHuruf(kepala1[4]!)).toBe(opsi[3]!.toLowerCase());
    expect(tanpaHuruf(kepala2[1]!)).toBe(opsi[4]!.toLowerCase());
    for (const t of [t1, t2]) {
      const tbl = t.split("\n").filter((l) => l.startsWith("|"));
      const kolom = tbl.map((l) => sel(l).length);
      expect(new Set(kolom).size, "jumlah kolom tiap baris tabel sama").toBe(1);
      expect(tbl.map((l) => sel(l)[0])).toEqual(["", "---", "Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    }
    expect(putuskan).toContain("**Keputusan: opsi E untuk perubahan dan opsi G untuk flag.**");
    for (const [huruf, kata] of [["A", "M54"], ["B", "pembekuan"], ["C", "M54"], ["D", "ADR 55"], ["F", "spesifikasi belum 1.0"]] as const) {
      const butir = putuskan.split(`- **${huruf} ${huruf === "F" ? "ditunda" : "ditolak"}**`)[1]!.split("\n")[0]!;
      expect(butir, huruf).toContain(kata);
    }
    expect(hitung(putuskan, " ditolak** karena")).toBe(4);
    expect(hitung(putuskan, " ditunda** karena")).toBe(1);
  });
  test("pre-mortem tepat tiga penyebab bernomor; Kapan keputusan ini salah punya empat butir yang sama dengan naskah", () => {
    const pm = putuskan.match(/Pre-mortem[^\n]*\n\n((?:\d+\. [^\n]*\n)+)/);
    expect(pm).not.toBeNull();
    expect([...pm![1]!.matchAll(/^\d+\. /gm)].length).toBe(3);
    expect(putuskan).toContain("**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:");
    const ks = putuskan.split("**Kapan keputusan ini salah.**")[1]!.split("**Yang akan merevisinya.**")[0]!;
    const butir = ks.split("\n").filter((l) => l.startsWith("- "));
    expect(butir.length).toBe(4);
    const kataKunci: [string, string][] = [["SLO terlalu ketat", "SLO 99,9% terlalu ketat"], ["Canary 1% kekurangan sampel", "canary 1% kekurangan sampel"], ["Percobaan gangguan merusak produksi", "percobaan gangguan merusak produksi"], ["Kebijakan dipakai sebagai hukuman", "kebijakan dipakai sebagai hukuman"]];
    kataKunci.forEach(([naskahKata, halamanKata], i) => {
      expect(kapanSalah.toLowerCase(), naskahKata).toContain(naskahKata.toLowerCase());
      expect(butir[i]!.toLowerCase(), halamanKata).toContain(halamanKata.toLowerCase());
    });
    expect(dikira).toContain("rapat persetujuan rilis harian");
    expect(dikira).toContain("bekukan rilis tiap Kamis");
    harus("Bayu mengusulkan rapat persetujuan rilis harian dengan wakil tiap tim. Nadia mengusulkan membekukan rilis tiap Kamis.");
  });
  test("pengecekan seperti eval_tahap adr: opsi A sampai F di satu tabel, pre-mortem, kapan salah, tautan sumber", () => {
    const sub = badan.slice(badan.search(/^### ADR \d+.*$/m)).split(/^### (Sengaja belum|Cek diri)/m)[0]!;
    const huruf = sub.split("\n").map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()).filter((c) => /^[A-F]\. /.test(c)).length);
    expect(Math.max(...huruf)).toBeGreaterThanOrEqual(3);
    expect(sub).toMatch(/Pre-mortem/);
    expect(sub).toMatch(/Kapan keputusan ini salah/);
    expect(new Set(badan.match(/https?:\/\/[^\s)>"]+/g)).size).toBeGreaterThan(0);
    expect(badan).toMatch(/^### ADR 63: SLO per service, canary dengan analisis SLO, flag berpemilik, garis waktu, kebijakan error budget, dan percobaan gangguan kecil$/m);
    expect(hitung(badan, "### Sengaja belum dilakukan")).toBe(1);
    expect(hitung(badan, "### Cek diri")).toBe(1);
    expect(hitung(badan, "### Saat me-review kode AI, cek ini")).toBe(1);
  });
  test("Sengaja belum dilakukan: tiga baris, OpenFeature menunjuk 6.11; revisi menunjuk 6.8 dan 6.11 seperti naskah", () => {
    const s = putuskan.split("### Sengaja belum dilakukan")[1]!;
    const baris = s.split("\n").filter((l) => l.startsWith("|") && !l.startsWith("|---") && !l.startsWith("| Yang"));
    expect(baris.length).toBe(3);
    expect(sel(baris[0]!)).toEqual(["OpenFeature dan flagd", "Spesifikasi v0.9.0 belum 1.0, dan flag aktif banyak hanya satu dari dua syarat", "[[t6-adr-69]]"]);
    expect(naskah).toContain("| 12. OpenFeature dan flagd | Spesifikasi mencapai 1.0 dan flag aktif lebih dari satu | v0.9.0, satu flag |");
    expect(putuskan).toContain("**Yang akan merevisinya.** [[t6-residensi]] memakai canary ini untuk aturan per negara (ADR 66). [[t6-adr-69]] membaca ulang pemicu OpenFeature dan flagd.");
    expect(naskah).toContain("diuji dan dirilis lewat canary (ADR 63)");
    expect(naskah).toMatch(/\| 12\. OpenFeature dan flagd .*\| ADR 63, ADR 69 \|/);
    expect(t61).toContain("ADR 63 di [[t6-m54]]");
    expect(t61).toContain("Kill switch kartu adalah satu sakelar di satu tabel di primary");
  });
});

describe("kata kunci negatif dan universal, bahasa, dan kartu Cek diri", () => {
  test("'tidak ada', 'tidak satu pun', 'belum', dan 'hanya' di prosa halaman berlingkup dan terhitung", () => {
    const kalimat = badan.split(/(?<=[.!?])\s+/);
    const tidakAda = kalimat.filter((k) => /\btidak ada\b/i.test(k)).map((k) => k.replace(/\s+/g, " ").trim());
    expect(tidakAda).toEqual(["Tidak ada satu daftar yang memuat kesembilannya, dan tidak ada yang tahu mana penyebabnya."]);
    expect(teksBanding.toLowerCase()).not.toContain("tidak ada");
    expect(kalimat.filter((k) => /tidak satu pun/i.test(k)).length).toBe(1);
    expect(coba).toContain("dan tidak satu pun dari tujuh itu deploy (Penalaran).");
    expect(jenisPerubahan.find((j) => j.jenis === "deploy")!.n).toBe(2);
    expect(kalimat.filter((k) => /\bselalu\b/i.test(k)).length).toBe(0);
    expect(kalimat.filter((k) => /\b(setiap|semua)\b/i.test(k)).map((k) => k.replace(/\s+/g, " ").trim().slice(0, 48))).toEqual(SEMUA_SETIAP);
    // klaim negatif tentang repo dibatasi ke folder yang diperiksa
    expect(fs.readdirSync(path.join(akar, "labs")).some((n) => n.startsWith("t6"))).toBe(false);
  });
  test("tanpa emoji, tanpa 'Anda', tanpa 'pengguna', tanpa ID internal, dan paragraf adegan tidak lebih dari tiga", () => {
    expect(mdx + teksBanding).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(mdx + teksBanding).not.toMatch(/\bAnda\b/);
    expect(badan).not.toMatch(/\bpengguna\b/);
    expect(badan.replace(/\[\[[^\]]+\]\]/g, "")).not.toMatch(/\b[A-G]\d(\.\d)?\b/);
    expect(badan).not.toMatch(/\bantre(an|ian)\b/i);
    expect(mdx).not.toMatch(/tidak ada ID/);
  });
  test("Cek diri: lima soal berformat satu baris dengan jawaban, angka jawaban sama dengan hitungan di atas", () => {
    const soal = [...kunci.matchAll(/\*\*(\d)\.\*\* ([^\n]+)\n\n<details class="success">\n<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)];
    expect(soal.map((s) => s[1])).toEqual(["1", "2", "3", "4", "5"]);
    expect(soal[0]![3]).toContain(`${menitKejadian} × ${id(persenGagal / 100, 2)} = ${id(kejadianSetara, 2)} menit henti penuh, yaitu ${id(kejadianSetara, 2)} ÷ ${id(anggaran, 1)} = ${id(kejadianPersen, 1)}% anggaran (Hitungan atas Ilustrasi). Pada hari ke-${hariKe} sudah terpakai ${terpakai} menit.`);
    expect(soal[1]![3]).toContain(`0,999 dipangkatkan 4 = ${id(ketersediaan * 100, 1)}%, atau ${id(menitBerantai, 1)} menit per ${hariSLO} hari (Hitungan atas Asumsi)`);
    expect(soal[1]![3]).toContain(`akar keempat dari 0,999 = ${id(sloPerService * 100, 3)}%, dengan anggaran ${id(anggaranPerService, 1)} menit tiap service`);
    expect(soal[2]![3]).toContain(`${id(persenGagal, 1)}% × ${canary * 100}% = ${id(gagalCanary, 2)}% pembayaran gagal (Hitungan atas Ilustrasi). Pada kegagalan 0,1%, satu kegagalan rata-rata butuh 1.000 transaksi canary, yaitu ${id(detik1000, 0)} detik di puncak ${id(puncak3, 1)} transaksi per detik (Hitungan atas Asumsi).`);
    expect(soal[3]![2]).toContain("Nadia mengusulkan membekukan rilis tiap Kamis.");
    expect(soal[4]![3]).toContain("(dokumentasi Google Play, Tidak dijalankan)");
    expect(hitung(kunci, "- [ ] ")).toBe(7);
    expect(hitung(kunci, "https://")).toBe(7);
  });
});


describe("kunci kemunculan, tautan, judul bagian, sel tabel, dan catatan widget (mutan tanpa sidik)", () => {
  const kali = (kalimat: string, k: number) => expect(hitung(badan, kalimat), `kemunculan "${kalimat}"`).toBe(k);
  test("frasa hitungan yang diulang di Paham, ADR, dan Cek diri muncul sebanyak yang dijanjikan, dan tiap nilai turunan punya kalimatnya", () => {
    kali(`${menitKejadian} × ${id(persenGagal / 100, 2)} = ${id(kejadianSetara, 2)} menit henti penuh, yaitu ${id(kejadianSetara, 2)} ÷ ${id(anggaran, 1)} = ${id(kejadianPersen, 1)}% anggaran (Hitungan atas Ilustrasi)`, 2);
    kali(`${id(persenGagal, 1)}% × ${canary * 100}% = ${id(gagalCanary, 2)}% pembayaran gagal`, 2);
    kali(`${id(sampel3, 3)} transaksi per detik`, 3);
    kali(`1.000 ÷ ${id(sampel3, 3)} = ${id(detik1000, 0)} detik`, 1);
    kali(`${id(sloPerService * 100, 3)}%`, 3);
    kali("0,999 dipangkatkan 4 = ", 2);
    kali(`${mS[5]} menit per ${mS[6]} hari`, 2);
    kali(`${rilisHari} rilis per hari`, 3);
    kali(`= ${id(rilisJam, 1)} per jam (Hitungan atas Asumsi cerita)`, 1);
    kali(`Rilis berjalan ${id(rilisJam, 1)} per jam (Hitungan atas Asumsi cerita)`, 1);
    kali(`${id(rtoPersen, 1)}%`, 1);
    kali(`${id(persenBukan, 1)}%`, 1);
    kali(`${id(burnRate, 1)} kali laju`, 1);
    kali(`hari ke-${hariKe}`, 8);
    kali(`${terpakai} menit`, 5);
    kali(`${terpakai} ÷ ${id(anggaran, 1)}`, 2);
    kali(`${id(menitCanary, 4)} menit`, 1);
    kali(`13.888,9 request per detik memakai ${pod30} pod tiap service (Asumsi desain, [[t6-prd]])`, 1);
    expect(id(reqPuncak, 1)).toBe("13.888,9");
    expect(id(reqPuncak, 1)).toBe(id(((aktif * reqPerUser) / detikHari) * puncakFaktor, 1));
    kali(`Itu 7 ÷ 3 = ${id(7 / 3, 1)} kali beban Tahap 5`, 1);
    kali("2,7 kali", 0);
    kali(`1 ÷ ${pod30} = ${id(100 / pod30, 1)}%`, 1);
    kali(`Paparan itu 1% × ${id(puncak3, 1)} = ${id(sampel3, 3)} transaksi per detik di puncak, dibulatkan ${id(sampel3, 1)} (Hitungan atas Asumsi).`, 1);
    kali("Alert seperti itu memberi tahu bahwa anggaran terbakar, bukan perubahan mana yang membakarnya (Penalaran).", 1);
    kali("Selama canary berjalan, pod tambahan membawa pool koneksinya sendiri ke pooler koneksi.", 1);
  });
  test("peta tautan: tiap teks tautan menunjuk satu alamat, nomor isu di teks sama dengan alamat, dan tiap tautan prosa ditutup 'Tidak dijalankan'", () => {
    const LINK: Record<string, string> = {
      "SRE Workbook: Canarying Releases": "https://sre.google/workbook/canarying-releases/",
      "SRE Workbook: Example Error Budget Policy": "https://sre.google/workbook/error-budget-policy/",
      "Principles of Chaos Engineering": "https://principlesofchaos.org/",
      "isu chaos-mesh #4827": "https://github.com/chaos-mesh/chaos-mesh/issues/4827",
      "Chaos Mesh: isu #4827": "https://github.com/chaos-mesh/chaos-mesh/issues/4827",
      "catatan rilis Chaos Mesh v2.8.3": "https://github.com/chaos-mesh/chaos-mesh/releases/tag/v2.8.3",
      "OpenFeature: rilis spesifikasi": "https://github.com/open-feature/spec/releases",
      "Apple: Release a version update in phases": "https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/",
      "Google Play: staged rollouts": "https://support.google.com/googleplay/android-developer/answer/6346149",
    };
    const semua = [...badan.matchAll(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g)];
    expect(semua.length).toBe(8 + 7); // delapan di prosa Paham, tujuh di Bacaan lanjut
    for (const m of semua) {
      expect(LINK[m[1]!], `teks tautan tidak dikenal: ${m[1]}`).toBe(m[2]);
      const noIsu = m[1]!.match(/#(\d+)/);
      if (noIsu) expect(m[2]!.endsWith(`/issues/${noIsu[1]}`), m[1]).toBe(true);
    }
    for (const m of badan.matchAll(/\]\(https:\/\/[^)]+\), ([^)]*)\)/g)) expect(m[1], m[0]).toMatch(/dibuka 2026-11-06, Tidak dijalankan$/);
    expect(hitung(kunci, "](https://")).toBe(7);
    expect(kunci.split("### Bacaan lanjut")[1]!.match(/^- \[/gm)!.length).toBe(7);
  });
  test("judul bagian: tingkat dan nama tiap heading per blok, tanpa heading di Mulai dan Coba", () => {
    const judul = (b: string) => [...b.matchAll(/^(#+) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(judul(mulai)).toEqual([]);
    expect(judul(coba)).toEqual([]);
    expect(judul(paham)).toEqual(["### Yang dikira", "### Yang sebenarnya", "### Canary: paparan sebanding dengan bobot", "### Pagar di luar deploy: flag, garis waktu, dan aturan skor", "### Kebijakan error budget", "### Chaos testing", "### Untuk app Flutter", "### Yang tidak dijalankan"]);
    expect(judul(putuskan)).toEqual(["### ADR 63: SLO per service, canary dengan analisis SLO, flag berpemilik, garis waktu, kebijakan error budget, dan percobaan gangguan kecil", "### Sengaja belum dilakukan"]);
    expect(judul(kunci)).toEqual(["### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut"]);
    expect(front.split("\n").find((l) => l.startsWith("title:"))).toBe(`title: "${reg.nomor} ${reg.judul.split(" (")[0]}"`);
  });
  test("sel tabel ADR 63: tiap kata kunci ada di kolom opsi yang dimaksud (tukar sel antar kolom menggagalkan)", () => {
    const t1 = putuskan.split("Tabel pertama membandingkan cara membatasi risiko perubahan:")[1]!.split("Tabel kedua membandingkan pengelolaan flag:")[0]!;
    const t2 = putuskan.split("Tabel kedua membandingkan pengelolaan flag:")[1]!.split("**Keputusan:")[0]!;
    const baris = (t: string) => t.split("\n").filter((l) => l.startsWith("|") && !l.startsWith("|---") && !l.startsWith("| |")).map(sel);
    const kunciT1: Record<string, string[]> = {
      "Cara kerja": ["menyetujui rilis hari itu", "dibekukan tiap hari Kamis", "alert burn rate", "flag yang dinyalakan bertahap", "bobot Gateway API"],
      Kelebihan: ["Tanpa alat baru", "Sederhana", "Tidak menahan rilis", "Membatasi paparan fitur", "Paparan sebanding bobot"],
      Kekurangan: ["menunggu satu rapat", "Frekuensi turun", "Alert menyebut kapan", "Kode versi baru tetap berjalan", "Langkah 1% butuh sampel"],
      "Biaya operasional": ["Waktu 11 wakil", "Rilis menumpuk", "Sama dengan alert", "Flag berkumpul tanpa pemilik", "Plugin Gateway API"],
      Bukti: ["Penalaran atas M54, Tidak dijalankan", "Penalaran atas M54, Tidak dijalankan", "burn rate 1,7", "Penalaran, Tidak dijalankan", "gateway.txt"],
    };
    const kunciT2: Record<string, string[]> = {
      "Cara kerja": ["SDK OpenFeature", "pemilik dan tanggal kedaluwarsa"],
      Kelebihan: ["nilai default per pemanggilan", "Tanpa komponen baru"],
      Kekurangan: ["belum 1.0", "ditulis tangan"],
      "Biaya operasional": ["mesin evaluasi", "satu cache per pod"],
      Bukti: ["rilis spesifikasi v0.9.0", "sakelar.txt"],
    };
    for (const [t, peta] of [[t1, kunciT1], [t2, kunciT2]] as const) {
      const rows = baris(t);
      expect(rows.map((r) => r[0])).toEqual(Object.keys(peta));
      for (const r of rows) peta[r[0]!]!.forEach((k, c) => expect(r[c + 1], `${r[0]}, kolom ${c + 1}: ${k}`).toContain(k));
    }
  });
  test("catatan widget banding: tiap catatan memuat kata kunci jenis perubahannya dan label sumbernya", () => {
    const d = bandingMentah as { fitur: { label: string; catatan: Record<string, string> }[] };
    const kunciWidget: [string, string[], string[]][] = [
      ["Rilis biasa (deploy)", ["menyetujui atau menunda deploy sebelum rilis", "rapat tidak mengukur dampaknya", "(Penalaran, Ilustrasi)"], ["bobot Gateway API", "Analisis memeriksa SLO", "bobot kembali ke versi lama", "(rancangan, Tidak dijalankan)"]],
      ["Aturan skor", ["bukan deploy", "catatan tim Risiko", "(Penalaran, Ilustrasi)"], ["garis waktu negara", "pemilik, dan versi", "tidak melewati canary di ADR 63", "(Asumsi desain)"]],
      ["Flag", ["Tiga flag berubah dalam 30 menit", "tanpa pemilik dan tanpa tanggal berakhir", "(Penalaran, Ilustrasi)"], ["pemilik dan tanggal kedaluwarsa", "masuk garis waktu", "satu sakelar per database negara", "(rancangan, Tidak dijalankan)"]],
    ];
    expect(d.fitur.map((f) => f.label)).toEqual(kunciWidget.map((k) => k[0]));
    kunciWidget.forEach(([, du, a], i) => {
      for (const k of du) expect(d.fitur[i]!.catatan.dugaan, k).toContain(k);
      for (const k of a) expect(d.fitur[i]!.catatan.adr63, k).toContain(k);
    });
    expect(coba.match(/<noscript>([\s\S]*?)<\/noscript>/)![1]).toContain("rapat menyetujui deploy sebelum rilis dan tidak mengukur sesudahnya");
  });
  test("baris riset: frasa yang diulang di satu baris diulang sebanyak aslinya, dan tiap tautan tepat satu kali di bagian Sumber", () => {
    const rs = riset6.split("\n").filter((b) => /^\| R6-13[0-4] \|/.test(b));
    expect(hitung(rs[1]!, "jendela empat minggu")).toBe(2);
    expect(hitung(rs[0]!, "kegagalan 20% pada canary 5%")).toBe(1);
    expect(hitung(rs[3]!, "tidak naik otomatis")).toBe(1);
    expect(rs[3]).toContain("1%, 2%, 5%, 10%, 20%, 50%, 100%; siapa pun");
    for (const r of rs) expect(hitung(r, "dibuka 2026-11-06") + hitung(r, "`gh api"), r.slice(0, 12)).toBeGreaterThan(0);
  });
  test("tiap paragraf prosa unik dan tiap kalimat prosa panjang muncul sekali", () => {
    const paragraf = badan.split("\n\n").map((p) => p.trim()).filter((p) => p && !/^(\||<|- \[ \]|import)/.test(p));
    expect(new Set(paragraf).size).toBe(paragraf.length);
    const kalimat = paragraf.flatMap((p) => p.split(/(?<=[.!?])\s+/)).filter((k) => k.length > 30 && !k.startsWith("- ") && !/^\d\. /.test(k));
    const ganda = [...new Set(kalimat.filter((k, i) => kalimat.indexOf(k) !== i))];
    // satu kalimat sengaja diulang: di Paham dan di aturan 4 ADR 63
    expect(ganda).toEqual(["Aturan skor dihitung sebagai konfigurasi (Asumsi desain)."]);
    expect(hitung(badan, "Aturan skor dihitung sebagai konfigurasi (Asumsi desain)."), "tepat dua kali").toBe(2);
  });
});


// ---- kunci per paragraf prosa, dengan frasa sumber ----------------------------------------------------------------------------
// Kunci per paragraf prosa: tiap paragraf muncul persis satu kali di halaman, dan tiap frasa sumber ada di sumbernya (naskah Tahap 6, baris riset,
// halaman 5.17, 5.23, 5.27, 5.30, 6.1, rekaman Tahap 5, glosarium, /cara-pakai/). Paragraf tanpa frasa sumber adalah navigasi atau susunan tabel.
const KLAIM: { p: string; s: [string, string][] }[] = [
  { p: "Minggu 9 Tahap 6. Kamis pukul 10.00 sebanyak 2,0% pembayaran di negara kedua gagal. Kegagalan itu berlangsung 22 menit.", s: [["reg", "minggu 9"], ["m54", "Kamis 10.00 pembayaran negara kedua gagal 2,0% selama 22 menit"]] },
  { p: "Dewi dari tim SRE bertanya apa yang berubah dalam 30 menit terakhir. Lima tim menjawab satu per satu, dan jumlahnya sembilan: dua deploy, tiga flag, satu aturan skor, satu migration, dan dua perubahan konfigurasi.", s: [["m54", "Dewi bertanya apa yang berubah dalam 30 menit terakhir"], ["m54", "sembilan perubahan dari lima tim"]] },
  { p: "Tidak ada satu daftar yang memuat kesembilannya, dan tidak ada yang tahu mana penyebabnya. Pada hari ke-19 dari 30 hari, anggaran kegagalan 43,2 menit sudah terpakai 46 menit.", s: [["m54", "Tak ada yang tahu mana penyebabnya"], ["m54", "Pada hari ke-19 anggaran kegagalan 43,2 menit sudah terpakai 46 menit"]] },
  { p: "*Angka cerita (Ilustrasi):* hari, jam, 2,0%, 22 menit, sembilan perubahan, dan 46 menit berasal dari naskah, bukan dari rekaman. Anggaran 43,2 menit berasal dari SLO 99,9% per 30 hari (Asumsi produk, [[t6-prd]]). Arti kelima label sumber ada di [Label sumber](/cara-pakai/#label-sumber).", s: [["cara", "Label sumber"], ["p61", "99,9% pembayaran tersedia per 30 hari"]] },
  { p: "*Tiga istilah di cerita:* flag adalah penanda yang menyalakan atau mematikan satu fitur tanpa deploy ([[t5-rollout]]). Aturan skor adalah aturan yang dipakai tim Risiko untuk memberi skor pada tiap pembayaran ([[t6-prd]]). Anggaran kegagalan adalah waktu gagal yang masih diterima dalam satu periode ([[t5-tim-infra]]).", s: [["glos", "Feature flag yang tugasnya mematikan satu fitur seketika tanpa deploy"], ["p61", "Tiap pembayaran dan transfer mendapat skor dalam 50 ms"], ["p61", "Tim Risiko"], ["p527", "Anggaran kegagalan adalah waktu gagal yang masih diterima dalam satu periode"]] },
  { p: "Pertanyaan Dewi menyentuh pertanyaan ketiga di PRD v6, yaitu siapa yang tahu perubahan mana yang merusak ([[t6-prd]]). Halaman ini menjawabnya.", s: [["p61", "Kalau 11 tim merilis tiap jam, siapa yang tahu perubahan mana yang merusak?"]] },
  { p: "Tebak dulu apa yang dijangkau rapat persetujuan rilis harian. Lalu pilih satu jenis perubahan di widget perbandingan, dan lihat simpul mana yang menangkapnya di kedua cara kerja.", s: [["peta", "tebak dulu lewat lipatan, lalu banding"]] },
  { p: "Halaman ini tidak punya Rekaman lab baru, karena Tahap 6 tidak punya lab. Dua label turunan dipakai, dan masing-masing berdampingan dengan salah satu dari lima label sumber:", s: [["cara", "Label sumber"], ["p523", "Labelnya ikut masukan yang paling lemah"]] },
  { p: "- **Hitungan:** angka yang dihitung dari angka lain di halaman ini. Labelnya ikut masukan yang paling lemah.\n- **Penalaran:** kesimpulan dari sumber atau angka di halaman, bukan hasil ukuran.", s: [["p523", "**Hitungan:** angka yang dihitung dari angka lain di halaman ini. Labelnya ikut masukan yang paling lemah."], ["p523", "kesimpulan dari kode atau angka di halaman, bukan hasil ukuran"]] },
  { p: "Tujuh: tiga flag, satu aturan skor, satu migration, dan dua perubahan konfigurasi. Itu 7 ÷ 9 = 77,8% dari semua perubahan (Hitungan atas Ilustrasi), dan tidak satu pun dari tujuh itu deploy (Penalaran).", s: [["m54", "dua deploy, tiga flag, satu aturan skor, satu migration, dua perubahan konfigurasi"]] },
  { p: "Dua deploy masuk rapat. Rapat menyetujuinya sebelum rilis dan tidak mengukur dampaknya sesudahnya (Penalaran).", s: [["m54", "rapat persetujuan rilis harian"], ["m54", "rilis bertahap dengan analisis otomatis atas SLO dan rollback otomatis"]] },
  { p: "**Ubah satu hal:** pilih jenis perubahan lain di widget. Simpul yang tersorot berpindah, dan kamu melihat jenis mana yang ditangkap rapat, ditangkap canary, atau hanya tercatat di garis waktu.", s: [["peta", "pembaca memilih kejadian"]] },
  { p: "Dua dugaan muncul di minggu itu (Ilustrasi). Bayu mengusulkan rapat persetujuan rilis harian dengan wakil tiap tim. Nadia mengusulkan membekukan rilis tiap Kamis.", s: [["m54", "Bayu: rapat persetujuan rilis harian dengan wakil tiap tim"], ["m54", "Nadia: bekukan rilis tiap Kamis"]] },
  { p: "Kedua usul menambah kehati-hatian di depan rilis. Rapat menambah orang yang melihat, dan pembekuan mengurangi hari yang berisiko.", s: [["m54", "rapat persetujuan rilis harian dengan wakil tiap tim"], ["m54", "bekukan rilis tiap Kamis"]] },
  { p: "Tiga hal dibaca dari angka cerita. Kejadian Kamis itu kecil terhadap anggaran, rapat menjadi queue baru, dan SLO tiap tim harus lebih ketat dari SLO produk. Lima paragraf berikut memuat hitungannya.", s: [["m54", "SLO tiap tim harus lebih ketat dari SLO produk"], ["m54", "anggaran habis oleh banyak kejadian kecil"], ["m54", "membuat rapat menjadi queue baru"]] },
  { p: "**Kejadian Kamis kecil.** Gagal 2,0% selama 22 menit setara 22 × 0,02 = 0,44 menit henti penuh, yaitu 0,44 ÷ 43,2 = 1,0% anggaran (Hitungan atas Ilustrasi). Pada hari ke-19, 46 menit terpakai: 46 ÷ 43,2 = 106,5% anggaran (Hitungan atas Ilustrasi). Anggaran habis oleh banyak kejadian kecil yang penyebabnya tidak tercatat.", s: [["m54", "22 × 0,02 = 0,44 menit henti penuh (Hitungan atas Ilustrasi)"], ["m54", "banyak kejadian kecil yang penyebabnya tidak tercatat"]] },
  { p: "**Alert sudah ada, penyebabnya belum.** [[t5-tim-infra]] memasang alert burn rate, yaitu alert atas laju habisnya anggaran. Pada hari ke-19 laju itu 46 ÷ 43,2 ÷ (19 ÷ 30) = 1,7 kali laju yang pas menghabiskannya di akhir periode (Hitungan atas Ilustrasi). Alert seperti itu memberi tahu bahwa anggaran terbakar, bukan perubahan mana yang membakarnya (Penalaran).", s: [["p527", "Alert burn rate 14,4 selama 1 jam"], ["glos", "Laju habisnya anggaran kegagalan dibanding laju yang menghabiskannya tepat di akhir periode"]] },
  { p: "**Rapat menjadi queue.** Tiap tim merilis 4 kali per hari (Asumsi cerita). Jadi 11 × 4 = 44 rilis per hari, atau 44 ÷ 8 jam kerja = 5,5 per jam (Hitungan atas Asumsi cerita).", s: [["m54", "Rilis 44 per hari, 5,5 per jam (Hitungan atas Asumsi)"], ["b3", "11 × 4 ÷ 8"], ["p61", "Asumsi cerita: 4 rilis per tim per hari"]] },
  { p: "Rapat yang berlangsung sekali sehari menahan rilis yang tiba sesudahnya sampai rapat berikutnya. Rilis yang menunggu itu membentuk queue, seperti tiket Platform di [[t6-m52]] (Penalaran).", s: [["m54", "membuat rapat menjadi queue baru"], ["b4", "Platform bekerja sebagai queue tiket"]] },
  { p: "**Pembekuan memindahkan rilis.** Pembekuan hari Kamis memindahkan rilis ke hari lain dan tidak mengurangi risiko tiap rilis (Penalaran). Ia juga hanya berlaku bagi perubahan yang dihitung sebagai rilis. Flag, aturan skor, dan konfigurasi baru ikut bila tim menghitungnya begitu.", s: [["m54", "pembekuan hanya menurunkan frekuensi tanpa mengurangi risiko tiap rilis (penalaran)"]] },
  { p: "**Empat service berurutan.** Jalur bayar memanggil beberapa service berurutan. SLO berantai adalah ketersediaan gabungan service yang dipanggil berurutan, dan kegagalan yang saling bebas membuatnya hasil kali SLO tiap service. Empat service dengan SLO 99,9% memberi 0,999 dipangkatkan 4 = 0,9960, atau 99,6% (Hitungan atas Asumsi: empat service di jalur bayar, kegagalan bebas).", s: [["glos", "hasil kali SLO tiap service"], ["b3", "0,999^4 = 0,9960, atau 99,6%"]] },
  { p: "Itu 172,5 menit per 30 hari, yaitu 172,5 ÷ 43,2 = 4,0 kali anggaran satu service. Agar jalur itu memenuhi 99,9%, tiap service butuh akar keempat dari 0,999 = 99,975%. Anggaran tiap service jadi (1 − 0,99975) × 43.200 = 10,8 menit (Hitungan atas Asumsi).", s: [["b3", "172,5 menit per 30 hari, empat kali anggaran satu service"], ["m54", "SLO tiap tim harus lebih ketat dari SLO produk"]] },
  { p: "**Yang kurang.** Tiga hal belum ada di M54:", s: [["m54", "Yang kurang: satu garis waktu perubahan, rilis bertahap dengan analisis otomatis atas SLO dan rollback otomatis"]] },
  { p: "1. Satu garis waktu yang memuat semua jenis perubahan, dengan pemilik tiap perubahan.\n2. Rilis bertahap dengan analisis otomatis atas SLO dan rollback otomatis.\n3. Kebijakan error budget yang ditulis sebelum anggaran habis, dan yang bukan hukuman.", s: [["m54", "satu garis waktu perubahan, rilis bertahap dengan analisis otomatis atas SLO dan rollback otomatis"], ["m54", "kebijakan error budget yang ditulis sebelum anggaran habis, yang bukan hukuman"]] },
  { p: "SRE Workbook mendefinisikan canary sebagai deployment sebagian dan sementara atas satu perubahan, beserta evaluasinya. Evaluasi itu menentukan lanjut atau tidak. Bagian yang menerima perubahan disebut canary, dan sisanya kontrol ([SRE Workbook: Canarying Releases](https://sre.google/workbook/canarying-releases/), dibuka 2026-11-06, Tidak dijalankan).", s: [["r130", "deployment sebagian dan sementara"], ["r130", "sisanya kontrol"]] },
  { p: "Dalam model sederhananya, dampak canary pada anggaran sebanding dengan lalu lintas yang terkena cacat. Model itu mengandaikan beban merata. Contohnya di bab itu: kegagalan 20% pada canary 5% memberi kegagalan keseluruhan 1% (sumber yang sama).", s: [["r130", "sebanding dengan lalu lintas yang terkena cacat"], ["r130", "beban merata"], ["r130", "kegagalan 20% pada canary 5% memberi kegagalan keseluruhan 1%"]] },
  { p: "Dengan angka M54, andai satu deploy membawa kegagalan 2,0%, langkah 1% membuat 2,0% × 1% = 0,02% pembayaran gagal. Dua puluh dua menit di langkah itu setara 0,44 × 0,01 = 0,0044 menit henti penuh (Hitungan atas Ilustrasi).", s: [["m54", "gagal 2,0% selama 22 menit"], ["m54", "22 × 0,02 = 0,44 menit henti penuh"]] },
  { p: "Tanpa canary, satu-satunya pembanding adalah sebelum dan sesudah. Bab yang sama menulis bahwa evaluasi sebelum dan sesudah berisiko, karena waktu adalah salah satu sumber perubahan metrik yang terbesar. Pertanyaan Dewi, apa yang berubah dalam 30 menit terakhir, adalah evaluasi sebelum dan sesudah (Penalaran).", s: [["r130", "evaluasi sebelum dan sesudah berisiko karena waktu adalah salah satu sumber perubahan metrik yang terbesar"], ["m54", "Dewi bertanya apa yang berubah dalam 30 menit terakhir"]] },
  { p: "Bab itu menyarankan canary bertahap. Tahap kecil memakai metrik yang paling jelas menunjukkan masalah, misalnya permintaan yang gagal, dan tahap lebih besar menambah keyakinan. Bab itu juga menyarankan SLI, yaitu ukuran mutu yang sudah dipakai untuk menilai SLO, sebagai titik mulai metrik canary. SLO dipakai sebagai ukuran mutlak, karena canary dan kontrol bisa berubah bersama (sumber yang sama).", s: [["r130", "canary bertahap memakai metrik paling jelas di tahap kecil"], ["r130", "SLI yang sudah mengukur SLO dipakai ulang"], ["r130", "ukuran mutlak seperti SLO tetap dipakai karena canary dan kontrol bisa berubah bersama"]] },
  { p: "**Bobot datang dari Gateway API, bukan dari jumlah pod.** [[t5-m49]] merekam bahwa tanpa pengatur lalu lintas, `setWeight: 5` dengan tiga replika memberi 25,0% atau 33,3% pod versi baru. Rekaman lab Tahap 5 untuk satu service, yaitu service kartu, menunjukkan ADR 55 dengan Gateway API:", s: [["p523", "`setWeight: 5` dengan tiga replika memberi bagian pod 25,0% atau 33,3%"], ["p523", "Bobot ditulis plugin Gateway API ke HTTPRoute"], ["adr63", "bukan dari rasio pod"]] },
  { p: "Satu pod dari empat tetap 25,0% pod, tetapi bobot di HTTPRoute 5. HTTPRoute adalah objek Gateway API yang memuat bobot tiap Service ([[t5-rollout]]). Di Tahap 6, 13.888,9 request per detik memakai 30 pod tiap service (Asumsi desain, [[t6-prd]]). Satu pod adalah 1 ÷ 30 = 3,3% dari 30 pod, jadi rasio pod tidak bisa memberi langkah 1% (Hitungan atas Asumsi desain).", s: [["gateway", "Pod v1: 3, pod v2: 1"], ["p61", "memakai 3 × 10 = 30 pod tiap service"]] },
  { p: "Rekaman berikutnya memerankan versi baru yang salah. Analisis menggagalkannya, bobot kembali ke versi lama, dan 100 dari 100 permintaan berikutnya dijawab versi lama:", s: [["analisis", "100 permintaan sesudah rollback: v1 menjawab 100"], ["analisis", "Angka 31% memerankan naskah M49 (Ilustrasi)"]] },
  { p: "Lab merekam analisis atas rasio tolak otorisasi untuk satu service, bukan atas SLO. Angka 31% memerankan naskah Tahap 5 (Ilustrasi). Analisis atas SLO, langkah 1% dan 25%, dan jalur pembayaran Tidak dijalankan.", s: [["analisis", "AnalysisRun rasio-tolak"], ["p523", "Langkah 1% dan 25% dan promosi manual Tidak dijalankan"]] },
  { p: "Selama canary berjalan, pod tambahan membawa pool koneksinya sendiri ke pooler koneksi. Syarat jumlah koneksi ADR 52 sudah terlewati pada 7 pod tiap service. Jumlahnya 6 service × 7 pod × pool 10 = 420 koneksi dari pod ke pooler, lawan batas 400 per instance. Itu 7 ÷ 3 = 2,3 kali beban Tahap 5 ([[t6-prd]], [[t5-pooler]], Penalaran atas Asumsi desain).", s: [["p517", "8 pod tiap service memberi 480 client lawan 400 per instance"], ["p61", "jadi 7 pod tiap service sudah memberi 6 × 7 × 10 = 420 client"], ["p61", "Tujuh pod berarti 7 ÷ 3 = 2,3 kali beban Tahap 5"]] },
  { p: "Tujuh dari sembilan perubahan M54 bukan deploy. Canary menjaga deploy. Perubahan lain butuh pagar sendiri: flag yang punya pemilik dan tanggal kedaluwarsa, dan satu garis waktu yang memuat semuanya.", s: [["adr63", "Flag punya pemilik dan tanggal kedaluwarsa"], ["adr63", "satu garis waktu per negara"], ["m54", "tiga flag"]] },
  { p: "[[t5-rollout]] menulis satu sakelar, yaitu baris `kartu_aktif` di tabel `sakelar`, dan menunda OpenFeature selama flag aktif hanya satu. Di M54 tiga flag berubah dalam 30 menit, jadi syarat \"flag aktif lebih dari satu\" di butir 12 ADR 60 terpenuhi (Ilustrasi, [[t5-adr-60]]).", s: [["p523", "Kill switch kartu adalah satu sakelar `kartu_aktif`"], ["p530", "Flag aktif ada satu: sakelar `kartu_aktif`"], ["p530", "Spesifikasi OpenFeature mencapai 1.0 dan flag aktif lebih dari satu"], ["m54", "tiga flag"]] },
  { p: "Syarat satunya lagi belum: spesifikasi OpenFeature mencapai 1.0. Tag rilis spesifikasi yang bernomor versi masih v0.9.0, terbit 2026-07-29. Tag yang lebih baru, `provider-tck/v0.1.0` (2026-10-16), adalah aset uji provider ([OpenFeature: rilis spesifikasi](https://github.com/open-feature/spec/releases), dibuka 2026-11-06, Tidak dijalankan). Satu syarat dari dua tidak cukup, jadi pemicunya dibaca ulang di [[t6-adr-69]].", s: [["r134", "v0.9.0 terbit 2026-07-29"], ["p530", "Spesifikasi OpenFeature mencapai 1.0"]] },
  { p: "Database dipisah per negara, dan alasannya dibahas di [[t6-residensi]]. Tabel `sakelar` ikut dipisah, jadi satu sakelar per database mematikan satu fitur di satu negara tanpa menyentuh negara lain (Penalaran, rancangan).", s: [["adr63", "satu sakelar per database negara"], ["naskah", "`sakelar` per database negara"], ["p61", "Database dipisah per negara"]] },
  { p: "Garis waktu per negara adalah daftar berurut waktu yang memuat deploy, flag, migration, dan konfigurasi, masing-masing dengan pemilik. Aturan skor dihitung sebagai konfigurasi (Asumsi desain). Dengan daftar itu, pertanyaan Dewi dijawab dengan membaca 30 menit terakhir, bukan dengan menanyai lima tim (Penalaran).", s: [["adr63", "Deploy, flag, migration, dan konfigurasi ditulis ke satu garis waktu per negara"], ["m54", "garis waktu"]] },
  { p: "Contoh kebijakan di SRE Workbook, Appendix B, ditulis untuk satu layanan contoh ([SRE Workbook: Example Error Budget Policy](https://sre.google/workbook/error-budget-policy/), dibuka 2026-11-06, Tidak dijalankan). Latarnya menulis bahwa perubahan adalah salah satu sumber besar ketidakstabilan, sekitar 70% dari outage penulis contoh itu. Angka itu dari satu organisasi dan tidak dipakai sebagai angka Rekeningo.", s: [["r131", "2018-02-19"], ["r131", "roughly 70% of our outages"], ["r131", "satu organisasi"]] },
  { p: "Bila layanan melewati anggaran kegagalan jendela empat minggu terakhir, semua perubahan dan rilis berhenti kecuali masalah P0, yaitu masalah berprioritas tertinggi, dan perbaikan keamanan. Penghentian itu berlaku sampai layanan kembali di dalam SLO (sumber yang sama).", s: [["r131", "jendela empat minggu terakhir, semua perubahan dan rilis dihentikan kecuali isu P0 dan perbaikan keamanan sampai layanan kembali di dalam SLO"]] },
  { p: "Contoh yang sama menulis bahwa kebijakan itu bukan hukuman. Ia memberi tim izin untuk fokus sepenuhnya pada keandalan bila data menunjukkan itu lebih penting daripada fitur.", s: [["r131", "bukan hukuman"], ["r131", "izin fokus sepenuhnya pada keandalan bila data menunjukkan keandalan lebih penting dari fitur"]] },
  { p: "SLO Rekeningo dihitung per 30 hari, jadi jendela kebijakan mengikuti 30 hari, bukan empat minggu (Asumsi desain). Di M54 anggaran sudah terlampaui pada hari ke-19, 46 lawan 43,2 menit, dan Rekeningo belum punya kebijakan itu (Ilustrasi).", s: [["adr63", "SLO di sini dihitung per 30 hari, jadi jendela kebijakan mengikuti jendela SLO (Asumsi desain)"], ["m54", "Pada hari ke-19 anggaran kegagalan 43,2 menit sudah terpakai 46 menit"]] },
  { p: "Chaos testing adalah percobaan pada sistem untuk membangun keyakinan bahwa ia tahan gangguan di produksi. Principles of Chaos Engineering menulis empat langkah ([Principles of Chaos Engineering](https://principlesofchaos.org/), pembaruan terakhir Maret 2019, dibuka 2026-11-06, Tidak dijalankan):", s: [["glos", "tahan gangguan di produksi"], ["r132", "Last Update: 2019 March"]] },
  { p: "- Tentukan steady state, yaitu keluaran sistem yang terukur dan menandakan perilaku normal.\n- Buat hipotesis bahwa steady state bertahan di kelompok kontrol dan di kelompok percobaan.\n- Masukkan kejadian nyata, misalnya server mati atau koneksi jaringan terputus.\n- Cari selisih steady state antara kedua kelompok.", s: [["r132", "steady state sebagai keluaran terukur"], ["r132", "hipotesis bahwa steady state bertahan di kelompok kontrol dan percobaan"], ["r132", "variabel dari kejadian nyata seperti server crash dan koneksi jaringan terputus"], ["r132", "cari selisih steady state antara kelompok"]] },
  { p: "Prinsip lanjutannya menggambarkan percobaan yang ideal: langsung di lalu lintas produksi, otomatis dan terus-menerus, dengan dampak yang dijaga sekecil mungkin. ADR 63 mengambil langkah yang lebih kecil. Percobaannya satu per tim per kuartal, di staging lebih dulu, dan di produksi hanya dengan paparan paling banyak 1% lalu lintas (Asumsi). Paparan itu 1% × 694,4 = 6,944 transaksi per detik di puncak, dibulatkan 6,9 (Hitungan atas Asumsi).", s: [["r132", "percobaan di produksi, otomatis dan terus-menerus, dampak dijaga sekecil mungkin"], ["adr63", "satu percobaan per tim per kuartal, di staging lebih dulu, lalu produksi dengan paparan paling banyak 1% lalu lintas (Asumsi)"]] },
  { p: "Satu laporan di pelacak Chaos Mesh menulis bahwa pemulihan otomatis NetworkChaos gagal saat pod restart di tengah percobaan. Versi yang dilaporkan v2.7.x, dan pod tertahan dalam restart berulang. Laporan itu ditutup 2026-04-16 oleh pull request perbaikan yang digabung hari itu ([isu chaos-mesh #4827](https://github.com/chaos-mesh/chaos-mesh/issues/4827), dibuka 2026-11-06, Tidak dijalankan). Itu satu laporan dari satu user, dan catatan rilis v2.8.3 (2026-06-10) menyebut perbaikan yang sama ([catatan rilis Chaos Mesh v2.8.3](https://github.com/chaos-mesh/chaos-mesh/releases/tag/v2.8.3), dibuka 2026-11-06, Tidak dijalankan).", s: [["r132", "NetworkChaos tidak pulih saat pod restart di tengah percobaan"], ["r132", "v2.7.x"], ["r132", "CrashLoopBackOff"], ["r132", "ditutup 2026-04-16 oleh PR #4829"], ["r132", "Fixed NetworkChaos recovery failure when target container is in CrashLoopBackOff"], ["r132", "terbit 2026-06-10"], ["adr63", "satu laporan di pelacak Chaos Mesh (v2.7.x, ditutup 2026-04-16)"]] },
  { p: "Server tidak bisa mengembalikan app yang sudah terpasang di HP user (Penalaran). Dokumentasi kedua toko menulis:", s: [["r133", "tetap di versi itu"], ["r133", "tujuh hari"]] },
  { p: "- **Apple:** rilis bertahap tujuh hari untuk perangkat dengan pembaruan otomatis, dengan 1%, 2%, 5%, 10%, 20%, 50%, dan 100% user pada hari 1 sampai 7. Siapa pun tetap bisa mengunduh manual, dan rilis boleh dijeda sampai 30 hari ([Apple: Release a version update in phases](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/), dibuka 2026-11-06, Tidak dijalankan).\n- **Google Play:** rilis bertahap bernama staged rollout, dan persentasenya tidak naik otomatis. Sesudah rilis dihentikan, user yang sudah menerimanya tetap di versi itu ([Google Play: staged rollouts](https://support.google.com/googleplay/android-developer/answer/6346149), dibuka 2026-11-06, Tidak dijalankan).", s: [["r133", "1%, 2%, 5%, 10%, 20%, 50%, 100%"], ["r133", "dijeda sampai 30 hari"], ["r133", "tidak naik otomatis"], ["r133", "tetap di versi itu"]] },
  { p: "Karena itu rilis app bertahap menjaga paparan dan tidak mengembalikan app. Server tetap harus melayani versi app lama ([[E1]]), dan sakelar di server mematikan fitur tanpa rilis app (Penalaran).", s: [["r133", "tetap di versi itu"], ["e1", "10"]] },
  { p: "**Kebutuhan.** PRD v6 menaruh SLO per tim sebagai P0 dan perubahan aman di skala sebagai P1 ([[t6-prd]]). M54 memuat sembilan perubahan dari lima tim dalam 30 menit tanpa garis waktu, dan anggaran 46 menit lawan 43,2 menit pada hari ke-19 (Ilustrasi). Rilis berjalan 5,5 per jam (Hitungan atas Asumsi cerita). Puncak transaksi 694,4 per detik, atau 463,0 bila tiap user aktif melakukan 2 transaksi per hari (Hitungan atas Asumsi).", s: [["p61", "P1 | Perubahan aman di skala"], ["p61", "SLO per tim untuk 11 tim"]] },
  { p: "**Status:** diterima sesudah M54, dan melanjutkan ADR 55 ([[t5-rollout]]) dan ADR 58 ([[t5-tim-infra]]). Naskah tidak menulis tanggal ADR.", s: [["b1", "ADR 55 (satu sakelar per primary) dilanjutkan ADR 63"], ["p527", "SLO pembayaran 99,9% per 30 hari"]] },
  { p: "Ada dua keputusan, jadi ada dua tabel. Tabel pertama membandingkan cara membatasi risiko perubahan:", s: [] },
  { p: "Tabel kedua membandingkan pengelolaan flag:", s: [] },
  { p: "**Keputusan: opsi E untuk perubahan dan opsi G untuk flag.** Enam aturan:", s: [] },
  { p: "1. SLO per service ditulis pemiliknya di katalog dari metrik penjaga. SLO pembayaran 99,9% per negara dimiliki tim Pembayaran, dan SLO service di jalurnya lebih ketat: untuk empat service berurutan, 99,975% tiap service (Hitungan atas Asumsi).\n2. Tiap rilis lewat canary golden path ([[t6-m52]]) dengan langkah 1%, 5%, 25%, dan 100%. Bobot lalu lintas datang dari Gateway API seperti ADR 55 dan bukan dari rasio pod (pelajaran [[t5-m49]]). Analisis atas SLO dan rollback otomatis menyertai tiap langkah.\n3. Flag punya pemilik dan tanggal kedaluwarsa, dan ada satu sakelar per database negara.\n4. Deploy, flag, migration, dan konfigurasi ditulis ke satu garis waktu per negara. Aturan skor dihitung sebagai konfigurasi (Asumsi desain).\n5. Kebijakan error budget ditulis sebelum anggaran habis. Bila anggaran terlampaui, perubahan berhenti kecuali P0 dan perbaikan keamanan, tanpa menghukum tim. Jendela kebijakan mengikuti jendela SLO 30 hari (Asumsi desain), sedangkan contoh SRE Workbook memakai empat minggu.\n6. Chaos testing berjalan satu percobaan per tim per kuartal, di staging lebih dulu, lalu di produksi dengan paparan paling banyak 1% lalu lintas (Asumsi). Hipotesis steady state tertulis, dan percobaan punya tombol hentikan.", s: [["adr63", "SLO per service ditulis pemiliknya di katalog dari metrik penjaga"], ["adr63", "Gateway API seperti ADR 55"], ["adr63", "satu percobaan per tim per kuartal"]] },
  { p: "**Kenapa E dan G, bukan yang lain.**", s: [] },
  { p: "- **A ditolak** karena M54: 44 rilis per hari menunggu satu rapat, dan 7 dari 9 perubahan bukan deploy (Penalaran).\n- **B ditolak** karena pembekuan menurunkan frekuensi dan tidak mengurangi risiko tiap rilis (Penalaran).\n- **C ditolak** karena anggaran sudah habis di hari ke-19 walau alert tersedia. Alert menyebut kapan, bukan apa (M54, Ilustrasi).\n- **D ditolak** karena flag membatasi paparan fitur tetapi tidak mengukur, dan ADR 55 sudah memilih canary berbobot (Penalaran).\n- **F ditunda** karena spesifikasi belum 1.0, satu dari dua syarat butir 12 ADR 60 ([[t5-adr-60]]). Opsi ini Tidak dijalankan.", s: [["adr63", "Rapat persetujuan rilis harian (ditolak: M54)"], ["adr63", "pembekuan rilis hari tertentu (ditolak: frekuensi turun, risiko tiap rilis sama)"], ["adr63", "rilis bebas dengan peringatan (ditolak: anggaran habis di hari ke-19)"], ["adr63", "flag saja tanpa canary (ditolak: membatasi paparan tetapi tidak mengukur)"], ["adr63", "OpenFeature dan flagd (ADR 60 butir 12: spesifikasi belum 1.0)"]] },
  { p: "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:", s: [] },
  { p: "1. Analisis lolos padahal versi salah, karena langkah 1% hanya melihat 6,9 transaksi per detik di puncak dan lebih sedikit di jam sepi. Pencegahannya jeda tiap langkah yang menunggu jumlah sampel seperti aturan 3 ADR 55, dan SLO sebagai ukuran mutlak di samping perbandingan dengan kontrol.\n2. Perubahan masuk lewat jalan yang tidak menulis garis waktu, misalnya flag diubah dari konsol, dan Dewi kembali ke pertanyaan awal. Pencegahannya garis waktu yang diisi pipeline dan tabel sakelar, bukan tangan, dengan hak mengubah di luar keduanya dicabut (Asumsi desain).\n3. Dua canary berjalan bersamaan di service yang sama dan sinyalnya bercampur. SRE Workbook menyarankan satu canary pada satu waktu. Pencegahannya satu canary aktif per service per negara, dan rilis berikutnya menunggu hasilnya (rancangan, Tidak dijalankan).", s: [["p523", "jeda tiap langkah harus cukup panjang untuk sampelnya"], ["r130", "We strongly advise running only one canary deployment at a time"]] },
  { p: "**Kapan keputusan ini salah.**", s: [] },
  { p: "- Saat SLO 99,9% terlalu ketat untuk rilis hampir harian. Tiap kegagalan sepanjang RTO 15 menit memakai 15 ÷ 43,2 = 34,7% anggaran, dan tiga kegagalan melewatinya ([[t5-tim-infra]], Hitungan atas Asumsi).\n- Saat canary 1% kekurangan sampel. Langkah 1% menerima 1% × 694,4 = 6,944 transaksi per detik di puncak (dengan 2 transaksi: 4,630) dan lebih sedikit di jam sepi. Pada kegagalan 0,1%, yaitu batas SLO 99,9%, satu kegagalan rata-rata butuh 1.000 transaksi. Di puncak itu 1.000 ÷ 6,944 = 144 detik per langkah, dan dengan 2 transaksi 216 detik (Hitungan atas Asumsi).\n- Saat percobaan gangguan merusak produksi. Satu laporan di pelacak Chaos Mesh menulis pemulihan gagal saat pod restart di tengah percobaan (Tidak dijalankan). Paparan 1% berarti 6,944 transaksi per detik di puncak ikut terkena.\n- Saat kebijakan dipakai sebagai hukuman. Tim lalu menunda mencatat perubahan, dan garis waktu bolong. Contoh SRE Workbook menulis tujuan sebaliknya.", s: [["adr63", "tiap kegagalan sepanjang RTO 15 menit memakai 34,7% anggaran, tiga kegagalan melewatinya"], ["adr63", "Canary 1% kekurangan sampel"], ["adr63", "Percobaan gangguan merusak produksi"], ["adr63", "Kebijakan dipakai sebagai hukuman"]] },
  { p: "**Yang akan merevisinya.** [[t6-residensi]] memakai canary ini untuk aturan per negara (ADR 66). [[t6-adr-69]] membaca ulang pemicu OpenFeature dan flagd.", s: [["adr63", "Chaos Mesh"], ["b1", "ADR 55 (satu sakelar per primary) dilanjutkan ADR 63"]] },
  { p: "**1.** Kejadian Kamis gagal 2,0% selama 22 menit, dan anggaran kegagalan 43,2 menit. Berapa persen anggaran yang dipakai kejadian itu, dan kenapa itu bukan penyebab anggaran habis?", s: [["m54", "gagal 2,0% selama 22 menit"]] },
  { p: "22 × 0,02 = 0,44 menit henti penuh, yaitu 0,44 ÷ 43,2 = 1,0% anggaran (Hitungan atas Ilustrasi). Pada hari ke-19 sudah terpakai 46 menit. Sisanya datang dari banyak kejadian kecil yang penyebabnya tidak tercatat.", s: [["m54", "22 × 0,02 = 0,44 menit henti penuh (Hitungan atas Ilustrasi)"]] },
  { p: "**2.** Empat service berurutan di jalur bayar masing-masing 99,9%, dan kegagalannya bebas. Berapa ketersediaan jalur itu, dan berapa SLO tiap service agar jalur memenuhi 99,9%?", s: [["b3", "0,999^4 = 0,9960"]] },
  { p: "0,999 dipangkatkan 4 = 99,6%, atau 172,5 menit per 30 hari (Hitungan atas Asumsi). Agar jalur memenuhi 99,9%, tiap service butuh akar keempat dari 0,999 = 99,975%, dengan anggaran 10,8 menit tiap service.", s: [["b3", "172,5 menit per 30 hari, empat kali anggaran satu service"]] },
  { p: "**3.** Satu deploy membawa kegagalan 2,0%. Berapa persen semua pembayaran gagal di langkah canary 1%, dan kenapa langkah itu butuh jeda?", s: [["r130", "kegagalan 20% pada canary 5% memberi kegagalan keseluruhan 1%"]] },
  { p: "2,0% × 1% = 0,02% pembayaran gagal (Hitungan atas Ilustrasi). Pada kegagalan 0,1%, satu kegagalan rata-rata butuh 1.000 transaksi canary, yaitu 144 detik di puncak 694,4 transaksi per detik (Hitungan atas Asumsi). Jeda yang lebih pendek lebih sering meloloskan versi yang salah.", s: [["r130", "sebanding dengan lalu lintas yang terkena cacat"], ["p523", "jeda tiap langkah harus cukup panjang untuk sampelnya"]] },
  { p: "**4.** Nadia mengusulkan membekukan rilis tiap Kamis. Kenapa itu tidak menurunkan risiko satu rilis?", s: [["m54", "Nadia: bekukan rilis tiap Kamis"]] },
  { p: "Pembekuan memindahkan rilis ke hari lain, dan risiko tiap rilis sama (Penalaran). Ia juga hanya berlaku bagi perubahan yang dihitung sebagai rilis, jadi flag dan konfigurasi bisa tetap berubah.", s: [["m54", "pembekuan hanya menurunkan frekuensi tanpa mengurangi risiko tiap rilis (penalaran)"]] },
  { p: "**5.** Kenapa rilis app bertahap tidak sama dengan rollback?", s: [["r133", "tetap di versi itu"]] },
  { p: "Sesudah rilis dihentikan, user yang sudah menerima versi baru tetap di versi itu (dokumentasi Google Play, Tidak dijalankan). Server tetap harus melayani app lama, dan sakelar mematikan fitur tanpa rilis app (Penalaran).", s: [["r133", "tetap di versi itu"]] },
];
const TANPA_KLAIM = !!process.env.TANPA_KLAIM;
const barisRiset = riset6.split("\n").filter((b) => /^\| R6-13[0-4] \|/.test(b));
const SUMBER: Record<string, string> = {
  m54: m54.join(" "),
  adr63: adr63.join(" "),
  b1: bag1,
  b3: bag3,
  b4: bag4,
  naskah,
  peta: barisAwal(peta, "| 6.5 |"),
  r130: barisRiset[0]!,
  r131: barisRiset[1]!,
  r132: barisRiset[2]!,
  r133: barisRiset[3]!,
  r134: barisRiset[4]!,
  p523: t523,
  p527: t527,
  p530: t530,
  p61: t61,
  p517: t517,
  gateway: gateway.join("\n"),
  analisis: analisis.join("\n"),
  glos: (glosarium as unknown as { d: string }[]).map((g) => g.d).join("\n"),
  cara,
  reg: JSON.stringify(reg),
  e1: JSON.stringify(dari("E1").adr),
};

describe("kunci per paragraf prosa dengan frasa sumber (paragraf bersumber, di luar sidik baris)", () => {
  test("tiap frasa sumber ada di sumbernya: naskah, baris riset, halaman ADR, rekaman, glosarium, registry", () => {
    for (const k of KLAIM) {
      for (const [kunciSumber, frasa] of k.s) {
        expect(SUMBER[kunciSumber], `sumber ${kunciSumber} tidak dikenal`).toBeDefined();
        expect(SUMBER[kunciSumber]!, `[${kunciSumber}] ${frasa}`).toContain(frasa);
      }
    }
    expect(KLAIM.length).toBe(73);
    expect(KLAIM.filter((k) => k.s.length === 0).length).toBe(6);
  });
  test.skipIf(TANPA_KLAIM)("paragraf prosa halaman persis sama dengan tabel kunci, urut, dan tiap paragraf muncul tepat satu kali", () => {
    const paragraf = badan.split("\n\n").map((p) => p.trim()).filter((p) => p && !/^(\||<|import|### |- \[ \]|- \[)/.test(p));
    expect(paragraf).toEqual(KLAIM.map((k) => k.p));
    for (const k of KLAIM) expect(hitung(badan, k.p), k.p.slice(0, 50)).toBe(1);
  });
  test("tiap baris prosa muncul sekali di halaman (baris yang digandakan dalam satu paragraf menggagalkan)", () => {
    const baris = badan.split("\n").map((l) => l.trim()).filter((l) => l && !/^(\||<|```|\/>|-{3})/.test(l));
    const ganda = [...new Set(baris.filter((l, i) => baris.indexOf(l) !== i))];
    expect(ganda).toEqual([]);
  });
});

describe("sidik teks halaman, JSON widget, dan baris riset", () => {
  test.skipIf(!SIDIK)("tiap baris isi mdx persis sama dengan sidik; mdx berakhir dengan satu baris baru", () => {
    expect(mdx.split("\n").filter((b) => b.trim())).toEqual(BARIS_MDX);
    expect(mdx.endsWith("\n")).toBe(true);
    expect(mdx.endsWith("\n\n")).toBe(false);
  });
  test.skipIf(!SIDIK)("teks JSON widget banding persis sama dengan sidik", () => {
    expect(teksBanding).toBe(TEKS_BANDING);
  });
  test.skipIf(!SIDIK)("lima baris riset R6-130 sampai R6-134 persis sama dengan sidik", () => {
    expect(riset6.split("\n").filter((b) => /^\| R6-13[0-4] \|/.test(b))).toEqual(BARIS_RISET);
  });
});
