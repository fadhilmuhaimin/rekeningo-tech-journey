// Penjaga halaman 3.1 (keputusan 1000 sampai 1002): angka, nomor ADR, nomor halaman, ID `[[...]]`, label sumber, dan klaim
// "belum ada" di prd-v3.mdx dan di diagram Rantai t3-prd-sebelum-sesudah.json harus bisa diturunkan dari naskah Tahap 3
// (bagian 1, PRD v3), registry cerita.json, rekaman lab Tahap 2, dan halaman Tahap 2 yang dirujuk. Halaman ini merangkum
// dokumen dan membuka jawaban jembatan 2.33, jadi tanpa tes ini mengubah satu angka, satu ID, satu nomor ADR, satu tautan,
// satu label, atau satu klaim "belum ada" tidak menggagalkan build, Vitest, atau alat ukur mana pun.
// Lingkup klaim "belum ada": api-t2 dan sepuluh lab Tahap 2, bukan semua lab (c4-ratelimit merekam dua instance).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import diagramMentah from "../../data/diagram/t3-prd-sebelum-sesudah.json";
import dataTebak from "../../data/widget/t2-jembatan-tebak.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const T2 = (f: string): string => baca(`situs/src/content/docs/tahap-2/${f}`);
const mdx = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah3 = baca("plan/CERITA-TAHAP-3.md");
const bag1 = naskah3.split("## 1. PRD v3 · Rekeningo untuk enam kota")[1]!.split("\n## 2. ")[0]!;
const rantai = DataRantai.parse(diagramMentah);
const rantaiTeks = JSON.stringify(diagramMentah);

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[] }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const koma = (n: number, d = 1) => n.toFixed(d).replace(".", ",");
const titik = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const ada = (berkas: string, kalimat: string) => expect(T2(berkas), `${berkas} tidak memuat: ${kalimat}`).toContain(kalimat);
const barisTabel = (awal: string): string[] => {
  const b = badan.split("\n").find((x) => x.startsWith(awal));
  expect(b, `baris tabel "${awal}" tidak ada`).toBeDefined();
  return b!.split("|").slice(1, -1).map((c) => c.trim());
};
const tanpaTitik = (s: string) => s.trim().replace(/\.$/, "");

// Beban dari registry: sama dengan sinkron_cerita.py dan halaman 2.30.
const a2 = cerita.tahap[1]!.asumsi;
const a3 = cerita.tahap[2]!.asumsi;
const puncak = (a: { user: number; aktif: number; req: number; puncak: number }) => (((a.user * a.aktif) / 100) * a.req) / 86400 * a.puncak;
const aktif3 = (a3.user * a3.aktif) / 100;
const reqHari = aktif3 * a3.req;
const trxHari = aktif3 * a3.trx;
const lambda = (trxHari / 86400) * a3.puncak;
const p2 = puncak(a2);
const p3 = puncak(a3);

describe("registry, meta, dan susunan blok", () => {
  test("3.1 ada, jenis PRD, jalur inti, prasyarat jembatan 2.33, menit sama dengan baris meta", () => {
    expect(dari("t3-prd")).toMatchObject({ ada: true, nomor: "3.1", jenis: "prd", inti: true, prasyarat: ["t2-jembatan"], tahap: 3 });
    expect(mdx).toContain('title: "3.1 PRD v3: Rekeningo untuk enam kota"');
    expect(dari("t3-prd").judul).toBe("PRD v3: Rekeningo untuk enam kota");
    expect(dari("t2-jembatan").nomor).toBe("2.33");
    const m = badan.match(/<p class="meta">Baca (\d+) menit · Prasyarat: \[\[t2-jembatan\]\] · Jalur inti<\/p>/);
    expect(m, "baris meta").not.toBeNull();
    expect(dari("t3-prd").menit).toBe(Number(m![1]));
    expect(naskah3).toContain("| 3.1 | 1 | PRD v3: Rekeningo untuk enam kota | PRD | ★ | – | – |");
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const kata = (isi.match(/\S+/g) ?? []).length;
    expect(Math.abs(kata / 200 - dari("t3-prd").menit!), `${kata} kata`).toBeLessThanOrEqual(1.5);
  });
  test("delapan blok sesuai templat PRD: hanya blok pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Latar masalah", "Tujuan", "User dan kebutuhan barunya", "Ruang lingkup", "Metrik dan batasan", "Tim dan risiko", "Pertanyaan terbuka", "Yang dibuka lagi dari Tahap 2"]);
    expect(cekTemplat("prd", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Latar masalah"]);
  });
  test("kalimat pembuka menunjuk ringkasan di 2.33 dan menjanjikan jawaban tebakan di blok terakhir", () => {
    harus("Ringkasannya sudah tampil di [[t2-jembatan]]. Halaman ini memuat dokumen lengkapnya, dan blok terakhir membuka jawaban atas tebakan di sana.");
    ada("jembatan-prd-v3.mdx", "<Tebak client:visible data={dataTebak} tautan={tautanTebak} />");
    expect(daftarBlok(badan).at(-1)!.nama).toBe("Yang dibuka lagi dari Tahap 2");
  });
  test("2.33 menjanjikan PRD lengkap di 3.1 dan kepala dokumennya sama", () => {
    ada("jembatan-prd-v3.mdx", "Rincian tiap fitur ada di PRD v3 lengkap, di awal Tahap 3.");
    ada("jembatan-prd-v3.mdx", "Tahap 2 selesai di sini. PRD v3 lengkap ada di [[t3-prd]].");
    for (const k of ["<dt>Penulis</dt><dd>Sinta, unit Inisiatif Digital</dd>", "<dt>Syarat baru</dt><dd>Pak Hadi, Kepala Divisi Keuangan</dd>"]) {
      harus(k);
      ada("jembatan-prd-v3.mdx", k);
    }
    harus(`<dd>Enam kota: ±${titik(a3.user)} karyawan, ±60 warung</dd>`);
    ada("jembatan-prd-v3.mdx", `<dd>Enam kota: ±${titik(a3.user)} karyawan, ±60 warung</dd>`);
    harus("<dd>10 minggu, 4 engineer</dd>");
    expect(naskah3).toContain("Tim jadi empat orang dalam 10 minggu (Asumsi cerita)");
    expect(a3.tim).toBe("4 developer");
  });
});

describe("beban dan lingkup: angka turunan dari registry dan naskah", () => {
  test("tabel beban: 10.000 user, 2.500 aktif, 150.000 request, ±17,4 puncak, 7.500 transaksi, 0,868 per detik", () => {
    expect([a3.user, a3.aktif, a3.req, a3.puncak, a3.trx]).toEqual([10000, 25, 60, 10, 3]);
    expect([titik(aktif3), titik(reqHari), koma(p3), koma(p3, 2), titik(trxHari), koma(lambda, 3)]).toEqual(["2.500", "150.000", "17,4", "17,36", "7.500", "0,868"]);
    expect(barisTabel("| User terdaftar |")).toEqual(["User terdaftar", titik(a3.user), "PRD v3"]);
    expect(barisTabel("| User aktif harian (DAU) |")).toEqual(["User aktif harian (DAU)", titik(aktif3), `${titik(a3.user)} × ${a3.aktif}% (asumsi)`]);
    expect(barisTabel("| Request per hari |")).toEqual(["Request per hari", titik(reqHari), `${titik(aktif3)} × ${a3.req} request (asumsi)`]);
    expect(barisTabel("| Puncak request per detik |")).toEqual(["Puncak request per detik", `±${koma(p3)}`, `${titik(reqHari)} ÷ 86.400 × ${a3.puncak} = ${koma(p3, 2)} (asumsi)`]);
    expect(barisTabel("| Bayar dan transfer per hari |")).toEqual(["Bayar dan transfer per hari", titik(trxHari), `${titik(aktif3)} × ${a3.trx} transaksi (asumsi)`]);
    expect(barisTabel("| Bayar dan transfer per detik di puncak |")).toEqual(["Bayar dan transfer per detik di puncak", koma(lambda, 3), `${titik(trxHari)} ÷ 86.400 × ${a3.puncak} (asumsi)`]);
    harus("**Beban yang diharapkan (Asumsi)**");
    ada("estimasi.mdx", "| Bayar dan transfer (Tahap 3) | 7.500 | 0,87 | 2.500 × 3 transaksi; 5% dari semua request |");
    ada("estimasi.mdx", "Mulai tabel ini puncak Tahap 3 ditulis 17,4 (17,36 dibulatkan)");
  });
  test("puncak 12,5 kali puncak PRD v2 (±1,4), dan rumusnya sama dengan 2.30", () => {
    expect([koma(p2), koma(p3 / p2)]).toEqual(["1,4", "12,5"]);
    harus(`Puncaknya ${koma(p3 / p2)} kali puncak PRD v2 (±${koma(p2)}). Rumusnya sama dengan [[t2-estimasi]].`);
    ada("prd-v2.mdx", `| Puncak request per detik | ±${koma(p2)} | 12.000 ÷ 86.400 × 10 (asumsi) |`);
  });
  test("panggilan 2 detik menahan 1,75 koneksi dan 30 detik 26,1, dari λ tepat 0,868", () => {
    const l2 = lambda * (0.02 + 2);
    const l30 = lambda * (0.02 + 30);
    expect([koma(l2, 2), koma(l30)]).toEqual(["1,75", "26,1"]);
    // 0,87 dibulatkan dikali 2,02 memberi 1,76: itu sebab halaman memakai 0,868 (pelajaran 2.33).
    expect(koma(0.87 * (0.02 + 2), 2)).toBe("1,76");
    harus(`Hitungannya memakai ${koma(lambda, 3)} bayar dan transfer per detik, 0,02 detik untuk query, dan panggilan 2 atau 30 detik (semuanya Asumsi).`);
    harus(`Panggilan 2 detik menahan ${koma(lambda, 3)} × (0,02 + 2) = ${koma(l2, 2)} koneksi, dan panggilan 30 detik menahan ${koma(l30)}.`);
    ada("estimasi.mdx", `| Tahap 3, bayar dan transfer, panggilan luar 2 detik (Asumsi) | ${koma(lambda, 2)} | 2,02 detik | ${koma(l2, 2)} |`);
    ada("estimasi.mdx", `| Tahap 3, bayar dan transfer, panggilan luar 30 detik (Asumsi) | ${koma(lambda, 2)} | 30,02 detik | ${koma(l30)} |`);
    ada("estimasi.mdx", "Layanan push belum ada, jadi 2 dan 30 detik adalah Asumsi.");
    // Hitungan koneksi menunjuk 2.30 di dua tempat: tabel beban dan paragraf ADR 13.
    expect(badan.split("Rumusnya sama dengan [[t2-estimasi]].").length - 1).toBe(2);
    harus(`menahan ${koma(l30)}. Rumusnya sama dengan [[t2-estimasi]].`);
  });
  test("lingkup: 10 kali lipat, 12 warung di pusat dan ±48 di lima kota lain, ±59 warung selain Ani", () => {
    expect(a3.user / a2.user).toBe(10);
    ada("prd-v2.mdx", "3 gedung, ±1.000 karyawan, 12 warung");
    expect(60 - 12).toBe(48);
    expect(naskah3).toContain("sekitar 10.000 karyawan dan ±60 warung: 12 di kampus pusat dan ±48 di lima kota lain (Asumsi)");
    harus("Hitungannya sekitar 10.000 karyawan dan ±60 warung (Asumsi): 12 warung di kampus pusat dan ±48 di lima kota lain.");
    expect(naskah3).toContain("ketiganya terasa 10 kali lipat");
    harus("Di enam kota, ketiganya terasa 10 kali lipat.");
    harus("| Warung (Ani dan ±59 lainnya) |");
    expect(naskah3).toContain("**Latar masalah.**");
    expect(bag1).toContain("Warung (Ani dan ±59 lainnya)");
  });
  test("tutup buku kedua: tiga jam dan selisih Rp0, sama dengan 2.29", () => {
    expect(naskah3).toContain("Tutup buku kedua Tahap 2 lolos dalam 3 jam dengan selisih Rp0");
    ada("m17-prd-v3.mdx", "Laporan selesai dalam tiga jam, dan selisihnya Rp0.");
    harus("Uji coba tutup buku kedua di kampus pusat selesai dalam tiga jam, dengan selisih Rp0 ([[t2-m17]]).");
  });
});

describe("isi PRD: tujuan, user, fitur, metrik, batasan, risiko, pertanyaan dari naskah bagian 1", () => {
  test("empat tujuan sama dengan naskah", () => {
    const t = [...bag1.match(/\*\*Tujuan\.\*\*(.+)/)![1]!.matchAll(/\((\d)\) (.+?\.)(?= \(\d\)|$)/g)].map((m) => `${m[1]}. ${m[2]}`);
    expect(t).toHaveLength(4);
    for (const x of t) harus(x);
  });
  test("tabel user sama dengan naskah, baris demi baris", () => {
    const user = bag1.split("\n").filter((b) => /^\| (Karyawan|Warung|HR|Keuangan) /.test(b));
    expect(user).toHaveLength(4);
    for (const b of user) expect(badan.split("\n"), b).toContain(b);
  });
  test("fitur: nama dan prioritas sama dengan naskah, angka keterangan sama, dan sama dengan 2.33", () => {
    const baris = bag1.split("\n").map((b) => b.match(/^\| (P[0-2]) \| (.+?) \| (.+?) \|$/)).filter((m): m is RegExpMatchArray => m !== null);
    expect(baris.map((m) => m[1])).toEqual(["P0", "P0", "P0", "P0", "P1", "P1", "P1", "P1", "P2"]);
    const angka = (s: string) => (s.replace(/\[\[[^\]]+\]\]|\(M\d+\)/g, "").match(/\d+(?:[.,]\d+)*/g) ?? []).join("|");
    for (const m of baris) {
      const b = barisTabel(`| ${m[1]} | ${m[2]} |`);
      expect(b[0]).toBe(m[1]);
      expect(angka(b[2]!), `angka keterangan "${m[2]}"`).toBe(angka(m[3]!));
    }
    // Keterangan yang tidak ditulis ulang halaman harus sama persis dengan naskah; yang ditulis ulang
    // (kata istilah diberi arti, kebutuhan sebelum cara) tetap memuat frasa naskahnya.
    const ditulisUlang: Record<string, string[]> = {
      "Notifikasi saat menerima uang": ["Bayar, transfer, dan top-up memunculkan notifikasi di HP penerima", "tidak pernah mendahului uangnya", "tidak hilang tanpa terdeteksi", "Bayar dan transfer: 95% dalam kurang dari 30 detik."],
      "Tidak berhenti saat deploy": ["dua instance API", "staging", "backup terjadwal", "tidak terlihat oleh user"],
      "Masuk dasbor lebih aman": ["Kata sandi tetap ada", "passkey", "boleh dipilih"],
    };
    for (const m of baris) {
      const b = barisTabel(`| ${m[1]} | ${m[2]} |`);
      const frasa = ditulisUlang[m[2]!];
      if (!frasa) expect(b[2], `keterangan "${m[2]}"`).toBe(m[3]);
      else for (const f of frasa) {
        expect(m[3]!.toLowerCase(), `naskah "${m[2]}"`).toContain(f.toLowerCase());
        expect(b[2]!.toLowerCase(), `halaman "${m[2]}"`).toContain(f.toLowerCase());
      }
    }
    const j = T2("jembatan-prd-v3.mdx");
    for (const m of baris.filter((x) => x[1] !== "P2")) {
      const baris33 = j.split("\n").find((b) => b.startsWith(`| ${m[2]}`));
      expect(baris33, `2.33 tidak punya baris "${m[2]}"`).toBeDefined();
      expect(baris33!.split("|")[2]!.trim(), `prioritas "${m[2]}" di 2.33`).toBe(m[1]);
    }
    expect(`${baris[8]![2]} | ${baris[8]![3]}`).toBe("Top-up dari rekening bank, kartu virtual, verifikasi identitas | Ditunda ke v4");
    harus("[[t2-jembatan]] menyebut delapan fitur P0 dan P1 dan satu baris P2.");
    ada("jembatan-prd-v3.mdx", "Delapan fitur diminta di PRD v3.");
    ada("jembatan-prd-v3.mdx", "Ditunda ke v4 (P2): top-up dari rekening bank, kartu virtual, dan verifikasi identitas.");
  });
  test("janji 95% dalam 30 detik hanya untuk bayar dan transfer; top-up massal dan promo tidak masuk", () => {
    expect(naskah3).toContain("Top-up massal dan promo tidak masuk janji 95% dalam 30 detik.");
    expect(bag1).toContain("Bayar dan transfer: 95% dalam kurang dari 30 detik.");
    harus("Bayar dan transfer: 95% dalam kurang dari 30 detik.");
    harus("Janji 95% dalam 30 detik berlaku untuk bayar dan transfer saja. Top-up massal dan promo tidak masuk janji itu.");
    harus("Top-up massal tiap Senin boleh menyusul beberapa menit, karena 10.000 notifikasi sekaligus ([[t3-m27]])");
    expect(bag1).toContain("Top-up massal tiap Senin boleh menyusul beberapa menit, karena 10.000 notifikasi sekaligus (M27)");
    expect(a3.user).toBe(10000);
    ada("prd-v2.mdx", "| P0 | Top-up 1.000 akun | Satu file CSV dari HR, satu operasi |");
  });
  test("baris 'Tidak berhenti saat deploy' menulis kebutuhan dulu, lalu dua instance API", () => {
    expect(bag1).toContain("| P0 | Tidak berhenti saat deploy | Dua instance API, staging, backup terjadwal; satu proses mati tidak terlihat oleh user |");
    const b = barisTabel("| P0 | Tidak berhenti saat deploy |");
    expect(b[2]!.startsWith("Deploy dan satu proses yang mati tidak terlihat oleh user. Caranya: dua instance API,")).toBe(true);
    expect(b[2]).toContain("staging, yaitu lingkungan uji yang meniru produksi");
    expect(b[2]).toContain("backup terjadwal");
    expect(b[2]!.indexOf("tidak terlihat oleh user")).toBeLessThan(b[2]!.indexOf("dua instance API"));
    expect(rantaiTeks).toContain("Dua instance API");
    ada("jembatan-prd-v3.mdx", "| Tidak berhenti saat deploy atau saat satu proses mati | P0 |");
  });
  test("bukan lingkup v3 dan batasan sama dengan naskah", () => {
    const bukan = bag1.match(/\*\*Bukan lingkup v3\.\*\* (.+)/)![1]!;
    expect(bukan).toBe("Pembayaran offline, integrasi bank, user di luar Lestari, kartu virtual, API untuk kasir pihak ketiga, dasbor multi-cabang, email, notifikasi untuk publik.");
    harus("**Bukan lingkup v3:** pembayaran offline, integrasi bank, user di luar Lestari, kartu virtual, API untuk kasir pihak ketiga, dasbor multi-cabang, email, dan notifikasi untuk publik.");
    const batasan = bag1.match(/\*\*Batasan\.\*\* (.+)/)![1]!;
    expect(batasan).toContain("Empat engineer selama 10 minggu. Satu VPS produksi dan satu staging.");
    expect(batasan).toContain("Anggaran naik sedikit untuk satu penyimpanan sementara kecil dan satu staging.");
    harus("- Anggaran naik sedikit untuk satu penyimpanan sementara kecil dan satu staging.");
    expect(naskah3).toContain("Raka memegang app, Nadia dan Bayu memegang backend, Wulan memegang dasbor web.");
    harus("- Empat engineer selama 10 minggu: Raka memegang app, Nadia dan Bayu memegang backend, Wulan memegang dasbor web.");
    harus("- Satu VPS produksi, yaitu server virtual yang disewa, dan satu staging.");
  });
  test("lima metrik: angka sama dengan naskah, 7.000 adalah 70% dari 10.000 seperti 700 dari 1.000 di PRD v2", () => {
    const naskah = bag1.split("**Metrik keberhasilan (target, Asumsi).**")[1]!.split("\n\n")[1]!.split("\n").filter((b) => b.startsWith("- "));
    const mdxMetrik = badan.split("**Metrik keberhasilan (target, Asumsi)**")[1]!.split("\n\n")[1]!.split("\n").filter((b) => b.startsWith("- "));
    expect(naskah).toHaveLength(5);
    expect(mdxMetrik).toHaveLength(5);
    const angka = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).join("|");
    naskah.forEach((n, i) => expect(angka(mdxMetrik[i]!), `metrik ${i + 1}`).toBe(angka(n)));
    expect(0.7 * a3.user).toBe(7000);
    ada("prd-v2.mdx", "- Minimal 700 karyawan aktif setiap minggu.");
    expect(mdxMetrik[1]).toContain("diserahkan ke layanan push dalam kurang dari 30 detik");
    harus("Metrik kedua mengukur sampai pesan diserahkan ke layanan push, bukan sampai HP menerimanya.");
    harus("**Metrik keberhasilan (target, Asumsi)**");
  });
  test("aturan Pak Hadi: v1 dan v2 dari PRD v2, v3 dari naskah", () => {
    const v2 = T2("prd-v2.mdx");
    for (const v of ["v1", "v2"]) {
      const b = v2.split("\n").find((x) => x.startsWith(`| ${v} | "`))!;
      expect(b, `PRD v2 punya baris ${v}`).toBeDefined();
      expect(badan.split("\n"), `aturan ${v}`).toContain(b);
    }
    const kutip = "Ani tidak boleh diberi tahu uang masuk sebelum uang itu benar-benar tercatat.";
    expect(naskah3).toContain(`*"${kutip}"*`);
    expect(bag1).toContain("Aturan Pak Hadi dipertahankan dan ditambah");
    harus(`| v3 | Aturan v2 tetap berlaku, ditambah: "${kutip}" |`);
    harus("- Aturan Pak Hadi dipertahankan dan ditambah:");
  });
  test("tokoh baru Bayu dan Wulan sama dengan tabel naskah", () => {
    const tokoh = naskah3.split("### Tokoh baru")[1]!.split("Tokoh lama tetap:")[0]!.split("\n").filter((b) => /^\| \*\*(Bayu|Wulan)\*\* /.test(b));
    expect(tokoh).toHaveLength(2);
    for (const t of tokoh) {
      const c = t.split("|").slice(1, -1).map((x) => x.trim());
      const nama = c[0]!.replace(/\*/g, "");
      const tabel = badan.split(`| Tokoh baru | ${nama} |`)[1]!.split("\n\n")[0]!.split("\n");
      const baris = (k: string) => tabel.find((b) => b.startsWith(`| ${k} |`))!.split("|").slice(1, -1).map((x) => x.trim())[1]!;
      expect(tanpaTitik(baris("Siapa"))).toBe(tanpaTitik(c[1]!));
      expect(tanpaTitik(baris("Ingin"))).toBe(tanpaTitik(c[2]!));
      expect(tanpaTitik(baris("Kelemahan"))).toBe(tanpaTitik(c[3]!));
      expect(tanpaTitik(baris("Yang dibawanya"))).toBe(tanpaTitik(c[4]!));
    }
  });
  test("tokoh lama dan empat risiko Sinta sama dengan naskah", () => {
    const lama = naskah3.split("Tokoh lama tetap:")[1]!.split("## 1.")[0]!;
    expect(lama).toContain("**Raka** memegang app dan masih ikut menulis backend.");
    expect(lama).toContain("**Nadia** memimpin backend");
    expect(lama).toContain("**Budi** kini sering patungan dengan Citra");
    expect(lama).toContain("**Ani** satu dari ±60 warung");
    expect(lama).toContain("**Dimas**, yang mencoba");
    harus("Raka memegang app dan masih ikut menulis backend, dan Nadia memimpin backend. Budi kini sering patungan dengan Citra, dan Ani satu dari ±60 warung. Dimas tetap orang yang mencoba.");
    const risiko = bag1.match(/\*\*Risiko yang ditulis Sinta\.\*\* (.+)/)![1]!;
    const empat = ["Rekeningo pertama kali bergantung pada layanan luar di jalur uang.", "Satu server menjadi dua.", "Dasbor web membuka permukaan serangan baru", "app dipakai di Wi-Fi tenant mitra yang tidak dikelola Rekeningo."];
    for (const r of empat) expect(risiko, r).toContain(r);
    harus("Sinta menulis empat risiko:");
    harus("1. Rekeningo pertama kali bergantung pada layanan luar di jalur uang. Di lab situs ini, layanan itu tiruan lokal.");
    harus("2. Satu server menjadi dua.");
    harus("3. Dasbor web membuka permukaan serangan baru.");
    harus("4. App dipakai di Wi-Fi tenant mitra yang tidak dikelola Rekeningo.");
    expect(naskah3).toContain("Semua pihak ketiga di Tahap 3 (layanan push, proxy tiruan, provider yang menggantung) adalah tiruan lokal di container lab.");
  });
  test("tiga pertanyaan terbuka sama dengan naskah, tiap penunjuk jawaban menuju masalah dengan nomor yang benar", () => {
    const q = ["Kalau layanan push lambat, apakah pembayaran ikut lambat?", "Kalau pemberitahuan gagal terkirim, siapa yang tahu?", "Kalau server jadi dua, apa yang tadinya disimpan di memori satu server?"];
    q.forEach((x, i) => {
      expect(naskah3).toContain(`- ${x}`);
      harus(`${i + 1}. ${x}`);
    });
    expect(naskah3).toContain("Ketiganya tidak dijawab PRD dan menjadi masalah terbesar Tahap 3.");
    harus("Jawabannya dimulai di [[t3-m18]] untuk pertanyaan pertama, [[t3-m19]] untuk yang kedua, dan [[t3-m22]] untuk yang ketiga.");
    for (const [id, m] of [["t3-m18", "M18"], ["t3-m19", "M19"], ["t3-m21", "M21"], ["t3-m22", "M22"], ["t3-m27", "M27"]] as const) {
      expect(dari(id).judul.startsWith(`${m}:`), `${id} adalah ${m}`).toBe(true);
    }
    expect(naskah3).toMatch(/\| M18 \| 3 \| Jumat 12\.20, Rekeningo berhenti menjawab/);
    expect(naskah3).toMatch(/\| M19 \| 4 \| Budi dan seorang rekan mengirim patungan ke Citra/);
    expect(naskah3).toMatch(/\| M22 \| 6 \| Dimas menguji staging/);
  });
});

describe("yang dibuka lagi dari Tahap 2: ADR, rekaman, dan nomor halaman", () => {
  test("jawaban jembatan 2.33 adalah ADR 20 dan ADR 13, dari registry halaman login dan lock", () => {
    const adr20 = dari("t2-login-aman").adr![0]!;
    const adr13 = dari("t2-race-lock").adr![0]!;
    const adr21 = dari("t2-adr-21").adr![0]!;
    expect([adr20, adr13, adr21]).toEqual([20, 13, 21]);
    const benar = dataTebak.pilihan.find((p) => p.benar)!;
    expect(benar.teks.startsWith(`ADR ${adr20} dan ADR ${adr13}:`)).toBe(true);
    harus(`Jawabannya ADR ${adr20} dan ADR ${adr13}.`);
    harus(`**ADR ${adr20}, batas laju di memori: dibuka baris "Tidak berhenti saat deploy".**`);
    harus(`**ADR ${adr13}, lock buku: dibuka baris "Notifikasi saat menerima uang".**`);
    harus(`**ADR ${adr21}, dibaca ulang.**`);
    harus(`ADR ${adr21} meminta dibaca ulang setiap PRD baru datang ([[t2-adr-21]]).`);
    const semua = [...new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1])))].sort((x, y) => x - y);
    expect(semua).toEqual([adr13, adr20, adr21]);
    // Dua baris PRD yang membuka ADR itu ada di tabel ruang lingkup.
    expect(barisTabel("| P0 | Tidak berhenti saat deploy |")[0]).toBe("P0");
    expect(barisTabel("| P0 | Notifikasi saat menerima uang |")[0]).toBe("P0");
  });
  test("ADR 20: batas laju di memori tiap proses, dari halaman 2.28", () => {
    ada("brute-force.mdx", "rekaman bagian F mencatat 20 dari 24 tebakan lolos, yaitu 10 per server");
    ada("brute-force.mdx", "Bucket itu hidup di memori satu proses");
    harus("ADR 20 menghitung batas percobaan login di memori tiap proses ([[t2-login-aman]]).");
  });
  test("rekaman c4-ratelimit bagian F: 24 percobaan, 20 lolos, 10 per instance", () => {
    const c4 = baca("labs/c4-ratelimit/output/login/ratelimit.txt").split("\n");
    const m = c4.map((b) => b.match(/^ {2}(\d+) percobaan satu IP, bergantian ke (\d+) instance → 401: (\d+) · 429: (\d+)$/)).find((x) => x);
    expect(m, "baris percobaan bagian F").toBeTruthy();
    const [percobaan, instance, lolos, ditolak] = m!.slice(1).map(Number) as [number, number, number, number];
    expect({ percobaan, instance, lolos, ditolak, perInstance: lolos / instance }).toEqual({ percobaan: 24, instance: 2, lolos: 20, ditolak: 4, perInstance: 10 });
    expect(c4.some((b) => b.startsWith("== F. Dua instance: bucket di memori tidak dibagi (ADR 20)"))).toBe(true);
    expect(c4.some((b) => b.includes("(20 lolos = 10 per instance, bukan 10 total;"))).toBe(true);
    harus(`Rekaman lab c4-ratelimit bagian F menjalankan dua instance. Dari ${percobaan} percobaan satu alamat yang bergantian ke keduanya, ${lolos} lolos ke pemeriksaan password. Itu ${lolos / instance} per instance, bukan ${lolos / instance} total, jadi batasnya berlipat sebanyak jumlah proses.`);
  });
  test("rekaman b3-race: request kedua menunggu lock sampai COMMIT; ADR 13 melarang panggilan jaringan", () => {
    const kunci = baca("labs/b3-race/output/ledger/ledger-for-update.txt").split("\n");
    const i = {
      bMenunggu: kunci.findIndex((b) => /^ ?4 \[B\] SELECT saldo_cache FROM buku WHERE id = 2 FOR UPDATE {2}-> MENUNGGU lock/.test(b)),
      aCommit: kunci.findIndex((b) => /^ ?9 \[A\] COMMIT {2}-> COMMIT/.test(b)),
      bLanjut: kunci.findIndex((b) => /^10 \[B\] SELECT saldo_cache FROM buku WHERE id = 2 FOR UPDATE {2}-> 30000/.test(b)),
    };
    expect(i.bMenunggu).toBeGreaterThan(0);
    expect(i.aCommit).toBeGreaterThan(i.bMenunggu);
    expect(i.bLanjut).toBeGreaterThan(i.aCommit);
    ada("race-lock.mdx", "4. Tidak ada panggilan jaringan atau kerja lambat selama lock dipegang.");
    ada("race-lock.mdx", "### ADR 13: lock baris buku di dalam transaction jurnal");
    harus("Pembayaran memegang lock buku sampai COMMIT, dan request kedua ke buku yang sama menunggu selama itu (Rekaman lab b3-race, `ledger-for-update.txt`, [[t2-race-lock]]). ADR 13 melarang panggilan jaringan selama lock dipegang.");
    harus("Ini penalaran dari rekaman lock (Tidak dijalankan di Tahap 2).");
  });
  test("ADR 21: dibaca ulang tiap PRD baru, pemicu deploy tanpa jeda dipenuhi, kapasitas belum diukur", () => {
    ada("sengaja-belum.mdx", "Membaca ulang ADR ini setiap PRD baru datang adalah satu-satunya pagar sampai alat ukurnya ada.");
    ada("sengaja-belum.mdx", "| Server kedua | Puncak yang diperkirakan mencapai separuh kapasitas satu server hasil load test, atau PRD meminta deploy tanpa jeda |");
    ada("sengaja-belum.mdx", "Kapasitas satu server belum pernah diukur");
    expect(naskah3).toContain("Direksi tidak mau app berhenti saat deploy atau saat satu proses mati");
    harus('PRD v3 memenuhi satu pemicunya: baris "Tidak berhenti saat deploy" meminta deploy tanpa jeda.');
    harus("Pemicu kapasitas belum bisa dibaca, karena kapasitas satu server belum diukur (Tidak dijalankan).");
    harus("Apa yang terjadi sesudah pemicu itu tercatat ada di [[t3-m21]].");
  });
  test("nomor halaman Tahap 2 dan Tahap 3 yang ditaut sesuai registry", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!))].sort();
    expect(id).toEqual(["t2-adr-21", "t2-estimasi", "t2-jembatan", "t2-login-aman", "t2-m17", "t2-race-lock", "t3-m18", "t3-m19", "t3-m21", "t3-m22", "t3-m27"]);
    for (const x of id) expect(hal.some((h) => h.id === x), `[[${x}]] tidak ada di registry`).toBe(true);
    expect(Object.fromEntries(id.map((x) => [x, dari(x).nomor]))).toEqual({
      "t2-adr-21": "2.31", "t2-estimasi": "2.30", "t2-jembatan": "2.33", "t2-login-aman": "2.28", "t2-m17": "2.29", "t2-race-lock": "2.11",
      "t3-m18": "3.6", "t3-m19": "3.10", "t3-m21": "3.14", "t3-m22": "3.16", "t3-m27": "3.26",
    });
  });
  test("tautan label sumber menuju bagian yang ada di /cara-pakai/", () => {
    harus("[Label sumber](/cara-pakai/#label-sumber)");
    const cp = baca("situs/src/content/docs/cara-pakai.mdx");
    expect(cp).toContain("## Label sumber");
    expect(cp).toContain("- **Rekaman lab**: output asli dari program yang dijalankan di `labs/`");
    expect(cp).toContain("- **Ilustrasi**: contoh atau widget yang disusun dari konsep, bukan direkam dari sistem sungguhan.");
    expect(cp).toContain("- **Asumsi**: angka beban di cerita. Rumusnya ditulis di halaman");
    expect(cp).toContain("- **Tidak dijalankan**: kode hanya dicek ke dokumentasi resmi, tidak dijalankan di lab.");
    harus("Angka di dokumen ini adalah angka cerita (Ilustrasi: contoh, bukan hasil sistem), kecuali yang ditulis Asumsi atau Rekaman lab. Asumsi adalah angka beban yang rumusnya ditulis di halaman. Rekaman lab adalah keluaran lab di repo, ditunjuk dengan file dan bagiannya.");
  });
});

describe("klaim 'belum ada' dipindai dengan lingkup api-t2 dan sepuluh lab Tahap 2", () => {
  const LAB = ["api-t2", "b3-ledger", "b3-race", "b3-isolasi", "t2-pencairan", "e3-idempotency", "b2-query", "b4-skema", "c4-ratelimit", "e5-payload"];
  const EKSTENSI = /\.(go|py|sh|js|mjs|ts|yml|yaml|sql|json|md|toml|mod|html|conf|cfg|ini)$|(^|\/)(Makefile|Dockerfile[^/]*)$/;
  const LEWATI = new Set(["node_modules", ".venv", ".git", "output", "vendor"]);
  const jalan = (dir: string, cocok: RegExp): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      if (LEWATI.has(e.name)) return [];
      const p = path.join(dir, e.name);
      return e.isDirectory() ? jalan(p, cocok) : cocok.test(p) ? [p] : [];
    });
  const txt = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const q = path.join(dir, e.name);
      return e.isDirectory() ? txt(q) : e.name.endsWith(".txt") ? [q] : [];
    });
  const berkas = LAB.flatMap((l) => jalan(path.join(akar, "labs", l), EKSTENSI));
  const kodeApi = jalan(path.join(akar, "labs/api-t2"), /\.go$/).filter((f) => !f.endsWith("_test.go"));
  const isi = (f: string) => fs.readFileSync(f, "utf8");
  const rel = (fs_: string[]) => fs_.map((f) => path.relative(akar, f));

  test("kapasitas belum diukur: tidak ada perkakas load test di sepuluh lab", () => {
    expect(berkas.length).toBeGreaterThan(50);
    const PERKAKAS = /\b(k6|vegeta|wrk|locust|gatling|jmeter|autocannon|oha|bombardier)\b|load.?test/i;
    expect(rel(berkas.filter((f) => PERKAKAS.test(isi(f))))).toEqual([]);
    harus("kapasitas satu server belum diukur");
    expect(badan).toContain("- Kapasitas satu server belum diukur.");
    ada("jembatan-prd-v3.mdx", "- Kapasitas satu server belum diukur.");
  });
  test("lupa password mandiri belum ada: kode api-t2 tanpa jalur lupa atau reset password", () => {
    expect(kodeApi.length).toBeGreaterThan(5);
    expect(rel(kodeApi.filter((f) => /lupa|forgot|reset.?password|reset-password/i.test(isi(f))))).toEqual([]);
    expect(badan).toContain("- Lupa password mandiri belum ada, dan password sementara berpola.");
    ada("jembatan-prd-v3.mdx", "- Lupa password mandiri belum ada, dan password sementara berpola.");
    ada("brute-force.mdx", "Di rekaman api-t2 polanya `sementara-<id>`");
  });
  test("penutupan periode belum dibuat: api-t2 tanpa tabel atau kode penutupan periode", () => {
    const sumber = jalan(path.join(akar, "labs/api-t2"), /\.(go|sql|yaml)$/).filter((f) => !f.endsWith("_test.go"));
    expect(sumber.length).toBeGreaterThan(8);
    expect(rel(sumber.filter((f) => /ditutup|\bclosed\b|tutup_periode|penutupan/i.test(isi(f))))).toEqual([]);
    expect(badan).toContain("- Penutupan periode tutup buku belum dibuat.");
    ada("jembatan-prd-v3.mdx", "- Penutupan periode tutup buku belum dibuat.");
    ada("m17-prd-v3.mdx", "Keduanya belum dibuat di lab ([[t2-tutup-buku]]).");
  });
  test("Idempotency-Key belum dipasang di bayar dan transfer: kode api-t2 tidak membacanya", () => {
    expect(rel(kodeApi.filter((f) => /idempoten/i.test(isi(f))))).toEqual([]);
    expect(naskah3).toContain("Idempotency-Key belum dipasang di bayar dan transfer.");
    expect(badan).toContain("- Idempotency-Key belum dipasang di bayar dan transfer.");
    ada("jembatan-prd-v3.mdx", "Idempotency-Key belum dipasang di api-t2 ([[t2-idempotency]]).");
    ada("retry-idempotency.mdx", "`labs/api-t2` belum memasangnya");
    harus("Empat hal yang dicatat [[t2-jembatan]] masih terbuka:");
    ada("jembatan-prd-v3.mdx", "Empat hal dari Tahap 2 belum selesai");
  });
  test("api-t2 belum pernah dijalankan dengan dua instance; di antara lab Tahap 2 hanya c4-ratelimit merekamnya", () => {
    expect(baca("labs/api-t2/output/tutup-buku.txt").split("\n")[3]).toBe("# server: ./api-t2");
    const lain = LAB.filter((l) => l !== "c4-ratelimit").flatMap((l) => {
      const out = path.join(akar, "labs", l, "output");
      return fs.existsSync(out) ? txt(out) : [];
    });
    expect(lain.length).toBeGreaterThan(10);
    expect(rel(lain.filter((f) => /dua (instance|server|proses server)/i.test(isi(f))))).toEqual([]);
    expect(baca("labs/c4-ratelimit/output/login/ratelimit.txt")).toContain("bergantian ke 2 instance");
    harus("api-t2 sendiri belum pernah dijalankan dengan dua instance (Tidak dijalankan). Di antara lab Tahap 2, hanya c4-ratelimit yang merekamnya.");
    ada("jembatan-prd-v3.mdx", "api-t2 belum pernah dijalankan dengan dua server (Tidak dijalankan). Di antara lab Tahap 2, hanya c4-ratelimit yang merekam dua instance.");
  });
  test("kalimat 'Tahap 3 berangkat dari api-t2' sama dengan naskah", () => {
    expect(naskah3).toContain("Tahap 3 berangkat dari api-t2 di akhir Tahap 2, bukan dari sistem yang sudah dibereskan");
    harus("Tahap 3 berangkat dari api-t2 di akhir Tahap 2, belum dari sistem yang sudah dibereskan.");
  });
});

describe("diagram Rantai t3-prd-sebelum-sesudah.json", () => {
  test("ilustrasi, dua baris, teks dari naskah dan registry", () => {
    expect(rantai.sumber).toEqual({ jenis: "ilustrasi", teks: "Ringkasan PRD v3" });
    expect(rantai.baris.map((b) => b.label)).toEqual(["Sesudah Tahap 2", "Rekeningo v3"]);
    expect(rantai.baris[1]!.sub).toBe("enam kota, 10 minggu");
    expect(naskah3).toContain("enam kota, 10.000 karyawan, ±60 warung, 10 minggu");
    expect(rantai.baris[0]!.simpul).toHaveLength(4);
    expect(rantai.baris[1]!.simpul).toHaveLength(4);
    expect(rantai.baris[0]!.simpul[3]).toMatchObject({ teks: `${a3.user / a2.user} kali lipat karyawan`, sub: "enam kota, ±60 warung", nada: "warn" });
    expect(rantai.baris[1]!.simpul[0]).toMatchObject({ teks: "Notifikasi uang masuk", sub: "bayar dan transfer: 95% dalam 30 detik" });
    expect(rantai.baris[1]!.simpul[2]).toMatchObject({ teks: "Dua instance API" });
    expect(rantai.baris[1]!.simpul[3]).toMatchObject({ teks: "Tutup buku < 1 hari", sub: "selisih Rp0, dibuktikan dari data", nada: "good" });
    expect(bag1).toContain("Bayar dan transfer: 95% dalam kurang dari 30 detik.");
    expect(bag1).toContain("Tutup buku bulanan tetap selesai dalam kurang dari 1 hari, selisih Rp0.");
    expect(rantai.catatan).toBe("Kotak biru adalah fitur P0 di PRD v3. Kotak terakhir adalah metrik tutup buku bulanan.");
    expect(badan).toContain('import prdDiagram from "../../../../data/diagram/t3-prd-sebelum-sesudah.json";');
    harus("<Rantai data={prdDiagram} />");
  });
  test("tiga hal yang belum terjawab di baris pertama ada di naskah dan di prosa halaman", () => {
    expect(bag1).toContain("karyawan tidak tahu kapan uang masuk, warung meminta admin untuk mengubah menu, dan satu proses mati mematikan semuanya");
    harus("Karyawan tidak tahu kapan uang masuk, warung harus meminta admin untuk mengubah menu, dan satu proses yang mati mematikan semuanya.");
    expect(rantai.baris[0]!.simpul.map((s) => s.teks).slice(0, 3)).toEqual(["Uang masuk tanpa kabar", "Menu diubah lewat admin", "Satu proses API"]);
  });
});

describe("halaman tidak membuka isi Tahap 3 lebih dari PRD-nya", () => {
  // Hasil dan solusi masalah M18 dan seterusnya dibuka di halaman masalahnya; PRD hanya menunjuk ke sana.
  const TERLARANG = /outbox|SKIP LOCKED|Redis|dead-letter|at-least-once|klaim per baris|connection pool|\bpool\b|ADR (2[2-9]|3\d)\b|backoff|jitter|pinning|circuit breaker|idle_in_transaction|11,5|10,34|750 detik|12,5 menit|round_robin|load balancer/i;
  test("halaman dan diagram tidak memuat hasil atau solusi Tahap 3", () => {
    expect(badan.match(TERLARANG), "halaman memuat isi Tahap 3").toBeNull();
    expect(rantaiTeks.match(TERLARANG), "diagram memuat isi Tahap 3").toBeNull();
  });
  test("ID riset dan ID internal tidak tampil", () => {
    expect(badan).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(rantaiTeks).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(badan).not.toMatch(/\b[A-G]\d(\.\d)?\b(?!\))/);
  });
});

describe("semua angka di halaman bisa diturunkan", () => {
  // Setiap angka di prosa dan tabel (tanpa ID, kode, dan nomor ADR) harus ada di himpunan ini; mengubah satu angka
  // menjadi nilai lain yang tidak diturunkan gagal di sini, dan menjadi nilai yang diturunkan tetapi di tempat salah
  // gagal di tes kalimat di atas.
  const diizinkan = new Set<string>([
    titik(a3.user), // 10.000
    String(a3.puncak), // 10: faktor puncak, minggu, kali lipat, per instance
    "2", "3", "4", // panggilan 2 detik, 3 transaksi, 4 engineer, dan nomor daftar
    "1", // 1 hari, nomor daftar
    "60", // request per user aktif dan warung
    "30", "95", // detik dan persen janji notifikasi
    "12", "48", "59", // warung pusat, kota lain, selain Ani
    "100", // karakter catatan
    "7.000", // 70% dari 10.000
    String(a3.aktif), // 25
    titik(aktif3), titik(reqHari), "86.400", titik(trxHari),
    koma(p3), koma(p3, 2), koma(lambda, 3), koma(p3 / p2), koma(p2),
    "0", "0,02", koma(lambda * 2.02, 2), koma(lambda * 30.02),
    "24", "20", // rekaman bagian F
    "7", // menit baca
  ]);
  test("tidak ada angka di luar himpunan turunan", () => {
    const b = badan
      .replace(/^import .*$/gm, "")
      .replace(/\[\[[^\]]+\]\]/g, "")
      .replace(/`[^`]*`/g, "")
      .replace(/\(\/cara-pakai\/[^)]*\)/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\bP[0-2]\b|PRD v\d|\bv[1-4]\b|Tahap \d|ADR \d+|[a-z][a-z0-9]*-[a-z0-9-]+/g, "");
    const angka = [...new Set(b.match(/\d+(?:[.,]\d+)*/g) ?? [])];
    expect(angka.filter((a) => !diizinkan.has(a))).toEqual([]);
  });
  test("rumus 86.400 detik per hari", () => {
    expect(24 * 60 * 60).toBe(86400);
  });
});

describe("label kejujuran: tiap kalimat berangka membawa labelnya", () => {
  test("Asumsi di angka beban dan metrik, Rekaman lab di rekaman, Tidak dijalankan di penalaran", () => {
    harus("(Asumsi): 12 warung di kampus pusat");
    harus("**Metrik keberhasilan (target, Asumsi)**");
    harus("**Beban yang diharapkan (Asumsi)**");
    harus("panggilan 2 atau 30 detik (semuanya Asumsi)");
    harus("(Rekaman lab b3-race, `ledger-for-update.txt`, [[t2-race-lock]])");
    harus("Rekaman lab c4-ratelimit bagian F");
    harus("Ini penalaran dari rekaman lock (Tidak dijalankan di Tahap 2).");
    harus("kapasitas satu server belum diukur (Tidak dijalankan).");
    harus("belum pernah dijalankan dengan dua instance (Tidak dijalankan).");
    harus("(Ilustrasi: contoh, bukan hasil sistem)");
    // Kalimat tanpa rekaman tidak boleh berlabel Rekaman lab: label itu hanya di dua rekaman Tahap 2.
    expect((badan.match(/Rekaman lab/g) ?? []).length).toBe(4);
    expect((badan.match(/Tidak dijalankan/g) ?? []).length).toBe(3);
  });
});
