// Penjaga halaman 3.31 (keputusan 1120 sampai 1122): setiap angka, ID halaman, nomor ADR, label, dan tautan di rekap.mdx,
// kartu t3-rekap-kartu.json, dan diagram Rantai t3-rekap-kejadian.json diturunkan dari naskah Tahap 3 (bagian 4 dan 5), registry
// (cerita.json), halaman Tahap 3 yang dirujuk, dan rekaman lab Tahap 3, bukan dari daftar yang ditulis sendiri. Halaman ini
// TANPA LAB dan merangkum halaman lain: tanpa tes ini, satu angka, satu ID, satu nomor ADR, satu label, atau satu tautan yang
// berubah tidak menggagalkan build, Vitest, atau alat ukur mana pun.
// Dua lapis: (1) nilai bergantung sumber dihitung ulang di sini dan dibandingkan dengan halaman; (2) kata-kata halaman dikunci
// per baris lewat rekap-t3.halaman.nilai.ts, supaya satu kata yang berubah (mis. "tidak" disisipkan) gagal. Kalimat terkunci
// tidak menangkap SALAHNYA kalimat, jadi klaim yang diucapkan (traceparent, X-Forwarded-For, perkakas load test, penyaring
// Python) dibaca dari berkas yang memerankannya. Tes hanya membaca berkas terlacak git.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import kejadianMentah from "../../data/diagram/t3-rekap-kejadian.json";
import { daftarBlok, idBlok } from "./blok";
import { DataRantai } from "./rantai";
import { BARIS_MDX, BENTUK_MDX, NILAI_JSON } from "./rekap-t3.halaman.nilai";

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

const BERKAS = "situs/src/content/docs/tahap-3/rekap.mdx";
const BERKAS_RANTAI = "situs/data/diagram/t3-rekap-kejadian.json";
const mdx = baca(BERKAS);
const potong = mdx.split(/^---\n/m);
const frontmatter = potong[1]!;
const badan = potong.slice(2).join("---\n");
const barisMdx = mdx.split("\n").filter((b) => b.trim());
const naskah = baca("plan/CERITA-TAHAP-3.md");
const diagram = DataRantai.parse(kejadianMentah);
const kartu = JSON.parse(baca("situs/lama/widgets/data/t3-rekap-kartu.json")) as {
  id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string;
}[];
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const riset3 = baca("plan/RISET-TAHAP-3.md");
const riset2 = baca("plan/RISET-TAHAP-2.md");

interface H { id: string; judul: string; tahap: number; path: string; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; prasyarat?: string[]; bagian?: number | string; inti?: boolean; menit?: number; peran?: string[]; masalah?: string }
const HALAMAN = cerita.halaman as unknown as H[];
const per = (id: string): H => {
  const h = HALAMAN.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const fileHalaman = (id: string): string => baca(`situs/src/content/docs/${per(id).path.replace(/\.md$/, ".mdx")}`);
const urlHalaman = (id: string): string => per(id).path.replace(/\.md$/, "/");
const labelHalaman = (id: string): string => `${per(id).nomor} ${per(id).judul}`;

const harus = (teks: string, kalimat: string): void => expect(teks, `tidak memuat: ${kalimat}`).toContain(kalimat);
const cocok = (teks: string, re: RegExp): RegExpMatchArray => {
  const m = teks.match(re);
  expect(m, `tidak cocok: ${re}`).not.toBeNull();
  return m!;
};
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const titik = (n: number): string => String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rp = (n: number): string => `Rp${titik(n)}`;

// ---- potongan MDX ----------------------------------------------------------------------------------------------------------
const blok = (nama: string): string => {
  const awal = mdx.indexOf(`<Blok nama="${nama}"`);
  const akhir = mdx.indexOf("</Blok>", awal);
  if (awal < 0 || akhir < 0) throw new Error(`halaman: blok ${nama} tidak ada`);
  return mdx.slice(awal, akhir);
};
const TOKEN = /\[\[([A-Za-z0-9.\-]+)(?:\|[^\]]+)?\]\]/g;
const idDalam = (teks: string): string[] => [...teks.matchAll(TOKEN)].map((m) => m[1]!);
const bersih = (s: string): string =>
  s.replace(/^\s*\d+\.\s+/, "").replace(/\[\[[^\]]*\]\]/g, "").replace(/`[^`]*`/g, "").replace(/\bapi-t3\b|\bt3-[a-z]+\b/g, "").replace(/\*+/g, "");
const angka = (s: string): string[] => [...bersih(s).matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => m[0]);

interface Butir { no: number; kalimat: string; teks: string; pertama: string; batas: string; ids: string[]; adr: number[]; kode: string[] }
const tigabelas = ((): Butir[] => {
  const paham = blok("Paham");
  const bagian = paham.slice(paham.indexOf("### Tiga belas kalimat"), paham.indexOf("### Yang belum diuji")).split("\n");
  const hasil: Butir[] = [];
  for (const b of bagian) {
    const m = b.match(/^(\d+)\. \*\*(.+?)\*\*/);
    if (m) hasil.push({ no: Number(m[1]), kalimat: m[2]!.replace(/\.$/, ""), teks: "", pertama: b, batas: "", ids: [], adr: [], kode: [] });
    if (hasil.length) {
      const h = hasil[hasil.length - 1]!;
      h.teks += b + "\n";
      if (/^\s+\*(Batas|Dipersempit):\*/.test(b)) h.batas += b.trim() + " ";
    }
  }
  for (const h of hasil) {
    h.ids = idDalam(h.teks);
    h.adr = [...h.pertama.matchAll(/\bADR (\d+)/g)].map((m) => Number(m[1]));
    h.kode = [...h.teks.matchAll(/`([^`]*)`/g)].map((m) => m[1]!);
  }
  return hasil;
})();
const butir = (no: number): Butir => tigabelas[no - 1]!;

// ---- naskah: bagian 4 (M, minggu, ADR) dan bagian 5 (kalimat dan kejadian) --------------------------------------------------
const barisNaskah = naskah.split("\n");
const tabelNaskah5 = ((): { konsep: string; kalimat: string; kejadian: string }[] => {
  const a = barisNaskah.findIndex((b) => b.startsWith("## 5. Yang dibawa pembaca keluar dari Tahap 3"));
  const z = barisNaskah.findIndex((b, i) => i > a && b.startsWith("## 6."));
  return barisNaskah.slice(a, z).filter((b) => b.startsWith("| ") && !b.startsWith("| Konsep") && !b.startsWith("| ---")).map((b) => {
    const k = b.split("|").map((x) => x.trim());
    return { konsep: k[1]!, kalimat: k[2]!, kejadian: k[3]! };
  });
})();
const barisM = ((): Map<number, { minggu: number; adr: string }> => {
  const peta = new Map<number, { minggu: number; adr: string }>();
  for (const b of barisNaskah) {
    const m = b.match(/^\| M(\d+) \| (\d+) \|/);
    if (m) peta.set(Number(m[1]), { minggu: Number(m[2]), adr: b.split("|").map((x) => x.trim())[7]! });
  }
  return peta;
})();
const idM = (n: number): string => {
  const h = HALAMAN.find((x) => x.tahap === 3 && x.judul.startsWith(`M${n}:`));
  if (!h) throw new Error(`registry: M${n} tidak ada`);
  return h.id;
};
const idAdr = (n: number): string => {
  const h = HALAMAN.filter((x) => x.tahap === 3 && x.adr?.includes(n));
  if (h.length !== 1) throw new Error(`registry: ADR ${n} harus tepat di satu halaman Tahap 3, ada ${h.length}`);
  return h[0]!.id;
};
const tahap3 = HALAMAN.filter((h) => h.tahap === 3 && /^3\.\d+$/.test(h.nomor ?? "") && Number(h.nomor!.slice(2)) <= 30);

// ---- rekaman -----------------------------------------------------------------------------------------------------------------
const rk = (lab: string, berkas: string): string => baca(`labs/${lab}/output/${berkas}`);
const bag = (teks: string, kode: string): string[] => {
  const b = teks.split("\n");
  const awal = b.findIndex((x) => x.startsWith(`# --- ${kode}. `));
  if (awal < 0) throw new Error(`rekaman: bagian ${kode} tidak ada`);
  const akhir = b.findIndex((x, i) => i > awal && x.startsWith("# --- "));
  return b.slice(awal, akhir < 0 ? undefined : akhir);
};
const cari = (baris: string[], pola: RegExp, nama: string): RegExpMatchArray => {
  const m = baris.map((b) => b.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const ada = (baris: string[], pola: RegExp): boolean => baris.some((b) => pola.test(b));

const m18 = rk("t3-pool", "m18.txt");
const jejak = rk("t3-pool", "jejak.txt");
const adr22 = rk("t3-pool", "adr22.txt");
const transaksi = rk("t3-outbox", "transaksi.txt");
const kursor = rk("t3-outbox", "kursor.txt");
const ganda = rk("t3-outbox", "ganda.txt");
const queue = rk("t3-outbox", "queue.txt");
const panic = rk("t3-instance", "panic.txt");
const proxy = rk("t3-instance", "proxy.txt");
const batas = rk("t3-instance", "batas.txt");
const memori = rk("t3-cache", "memori.txt");
const m24 = rk("t3-offline", "m24.txt");
const versi = rk("t3-offline", "versi.txt");
const xss = rk("t3-dasbor", "xss.txt");
const m26 = rk("t3-mitm", "m26.txt");
const dio = rk("t3-mitm", "dio.txt");
const pin = rk("t3-mitm", "pin.txt");

// nilai dari registry dan rumus
const reg = cerita.tahap[2]!.asumsi as { user: number; aktif: number; req: number; puncak: number; trx: number };
const LAMBDA = ((reg.user * reg.aktif) / 100) * reg.trx / 86400 * reg.puncak; // pembayaran per detik di puncak
const PUNCAK = ((reg.user * reg.aktif) / 100) * reg.req / 86400 * reg.puncak;
const LAM = koma(LAMBDA, 3);
const PUNCAK_BULAT = koma(PUNCAK, 1);
const PUNCAK_TEPAT = koma(PUNCAK, 2);

// nilai dari rekaman
const poolA = cari(bag(m18, "A"), /pool 10 penuh antara detik ke-(\d+) dan ke-(\d+) sejak beban mulai/, "m18 A");
const poolB = cari(bag(m18, "B"), /pool 50 penuh antara detik ke-(\d+) dan ke-(\d+) sejak beban mulai/, "m18 B");
const ukA = cari(bag(m18, "A"), /api-t3 siap: pool (\d+),/, "m18 A pool")[1]!;
const ukB = cari(bag(m18, "B"), /api-t3 siap: pool (\d+),/, "m18 B pool")[1]!;
const J = bag(jejak, "J");
const logJ = cari(J, /baris log baru sesudah (\d+) detik: (\d+)/, "jejak J log");
const poolJ = cari(J, /"dipakai":(\d+),"maks":(\d+)/, "jejak J pool");
const TA = bag(transaksi, "A");
const nominalA = Number(cari(TA, /"nominal": (\d+)/, "transaksi A nominal")[1]);
const KB = bag(kursor, "B");
const KC = bag(kursor, "C");
const saldoCitra = Number(cari([KB.join("\n")], /saldo_citra_naik\n-+\n (\d+)\n/, "kursor B saldo")[1]);
const GA = bag(ganda, "A");
const GC = bag(ganda, "C");
const klaimGanda = cari(GA, /klaim (\d+) detik \(bawaan\)/, "ganda A klaim")[1]!;
const PB = bag(panic, "B");
const PD = bag(panic, "D");
const healthzB = cari(PB, /GET \/lab\/panik\?di=handler → tidak ada jawaban; GET \/healthz sesudahnya → (\d+)/, "panic B healthz")[1]!;
const keluarB = cari(PB, /proses berhenti sendiri: kode keluar (\d+)/, "panic B keluar")[1]!;
const tigaPD = cari(PD, /503: (\d+) \(503: tidak ada instance yang sehat\)/, "panic D 503");
const PC = bag(proxy, "C");
const proxyC = cari(PC, /jumlah: 200: (\d+) · 502: (\d+)/, "proxy C");
const BA = bag(batas, "A");
const BE = bag(batas, "E");
const BI = bag(batas, "I");
const batasA = cari(BA, /24 percobaan → 401: (\d+) · 429: (\d+)/, "batas A");
const batasE = cari(BE, /24 percobaan → 401: (\d+) · 429: (\d+)/, "batas E");
const batasI = cari(BI, /24 percobaan → 401: (\d+) · 429: (\d+)/, "batas I");
const MB = bag(memori, "B");
const MC = bag(memori, "C");
const MD = bag(memori, "D");
const ttlD = cari(MD, /# --- D\. TTL (\d+) detik membatasi/, "memori D ttl")[1]!;
const stokCache = cari(MC, /Stok di cache B \((\d+)\) juga stale/, "memori C stok")[1]!;
const stokD300 = cari(MD, /"stok":(\d+),"versi":\d+\}\s+# detik ke-300: entri habis/, "memori D stok")[1]!;
const MCc = bag(m24, "C");
const MDd = bag(m24, "D");
const jamC = cari(MCc, /\((\d+) jam sejak Jumat\)/, "m24 C jam")[1]!;
const jamD = cari(MDd, /\((\d+) jam sejak Jumat\)/, "m24 D jam")[1]!;
const keyJam = cari(MCc, /\((\d+) jam < (\d+) jam\)/, "m24 C key");
const VC = bag(versi, "C");
const dialogs = (b: string[]): number => {
  const l = b.find((x) => x.startsWith("{") && x.includes('"dialogs"'));
  if (!l) throw new Error("rekaman xss: baris dialogs tidak ada");
  return (JSON.parse(l) as { dialogs: unknown[] }).dialogs.length;
};
const dialogA = dialogs(bag(xss, "A"));
const dialogC = dialogs(bag(xss, "C"));
const dialogE = dialogs(bag(xss, "E"));
const XD = bag(xss, "D");
const fetchD = cari(XD, /"statusFetch": (\d+)/, "xss D fetch")[1]!;
const M26B = bag(m26, "B");
const M26C = bag(m26, "C");
const M26E = bag(m26, "E");
const reqB = cari(M26B, /request terbaca (\d+)/, "m26 B")[1]!;
const reqDioB = cari(bag(dio, "B"), /request terbaca (\d+)/, "dio B")[1]!;
const nominalE = Number(cari(M26E, /"nominal":(\d+)/, "m26 E nominal")[1]);
const QC = bag(queue, "C");
const QE = bag(queue, "E");
const persenC = cari(QC, /terkirim dalam (\d+) detik: antara (\d+,\d+)% dan (\d+,\d+)% dari ([\d.]+)/, "queue C");
const detikE = cari(QE, /terkirim dalam kurang dari (\d,\d) detik/, "queue E");
const umurSemua = cari(QE, /umur tertua semua kelas: lebih dari (\d+) detik/, "queue E semua");
const umurUang = cari(QE, /umur tertua kelas uang: (\d+)/, "queue E uang");
const lF = cari(bag(adr22, "F"), /L semua request = 17,4 × W rata-rata dari data kurang dari (\d,\d+) koneksi \(batas lab 17,4 × (\d+) ms; hitungan naskah dengan (\d+) ms: (\d,\d+)\)/, "adr22 F");

// ================================================================================================================================
// TANPA_LAPIS2=1 mematikan lapis 2 supaya uji mutasi mengukur lapis 1 (nilai turunan sumber) sendirian.
const lapis2 = process.env.TANPA_LAPIS2 ? describe.skip : describe;
lapis2("kata-kata halaman terkunci (lapis 2)", () => {
  test("baris MDX sama dengan nilai terkunci", () => {
    expect(barisMdx).toEqual(BARIS_MDX);
  });
  test("bentuk baris kosong terkunci (baris kosong menentukan cara MDX mengurai)", () => {
    const bentuk = mdx.split("\n").map((b) => (b.trim() ? "#" : "-")).join("");
    expect(bentuk).toBe(BENTUK_MDX);
  });
  test("nilai string JSON Rantai dan kartu sama dengan nilai terkunci", () => {
    const ratakan = (x: unknown, jalur = ""): string[] =>
      Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${jalur}.${i}`))
        : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => ratakan(v, jalur ? `${jalur}.${k}` : k))
        : [`${jalur}=${JSON.stringify(x)}`];
    expect(Object.keys(NILAI_JSON)).toEqual(["rantai", "kartu"]);
    expect(ratakan(JSON.parse(baca("situs/data/diagram/t3-rekap-kejadian.json")))).toEqual(NILAI_JSON.rantai);
    expect(ratakan(kartu)).toEqual(NILAI_JSON.kartu);
  });
});

describe("registry dan naskah: tiga belas kalimat, kejadian, minggu, dan ADR", () => {
  test("halaman 3.31 terdaftar sebagai Konsep bagian 5 sesudah ADR 33, tanpa peran, dan berblok Mulai, Coba, Paham, Putuskan, Kunci", () => {
    const h = per("t3-rekap");
    expect([h.nomor, h.tahap, h.jenis, h.bagian, h.ada, h.prasyarat, h.inti, h.peran]).toEqual(["3.31", 3, "konsep", 5, true, ["t3-adr-33"], true, undefined]);
    expect(h.masalah).toBe("Mengingat tiga belas konsep Tahap 3 dalam satu kalimat masing-masing");
    expect(per("t3-adr-33").nomor).toBe("3.30");
    expect(per("t3-adr-33").ada, "3.30 sudah ada, jadi prasyarat 3.31 menaut halaman sungguhan, bukan (segera)").toBe(true);
    expect(per("t3-jembatan").nomor).toBe("3.32");
    expect(per("t3-jembatan").prasyarat).toEqual(["t3-rekap"]);
    expect(daftarBlok(mdx).map((b) => [b.nama, b.buka])).toEqual([["Mulai", true], ["Coba", true], ["Paham", false], ["Putuskan", false], ["Kunci", false]]);
    expect(idBlok(mdx)).toHaveLength(5);
    expect(frontmatter).toContain(`title: "${labelHalaman("t3-rekap")}"`);
  });

  test("menit baca dan coba di meta sama dengan registry, jumlah kata sesuai (160 sampai 200 kata per menit untuk blok baca), dan baca paling lama 10 menit", () => {
    const m = cocok(badan, /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-adr-33\]\] · Jalur inti<\/p>/);
    expect(per("t3-rekap").menit).toBe(Number(m[1]) + Number(m[2]));
    const baca = ["Mulai", "Paham", "Putuskan"].reduce((n, b) => n + bersihKata(blok(b)), 0);
    const coba = ["Coba", "Kunci"].reduce((n, b) => n + bersihKata(blok(b)), 0);
    expect(baca / Number(m[1]), `kata baca ${baca}, ${m[1]} menit`).toBeGreaterThan(160);
    expect(baca / Number(m[1])).toBeLessThan(200);
    expect(coba / Number(m[2]), `kata coba ${coba}, ${m[2]} menit`).toBeGreaterThan(160);
    expect(coba / Number(m[2])).toBeLessThan(260);
    expect(Number(m[1])).toBeLessThanOrEqual(10);
  });

  test("tiga belas kalimat di halaman sama dengan naskah bagian 5, berurutan, dan tabel naskah punya tiga belas baris", () => {
    expect(tabelNaskah5).toHaveLength(13);
    expect(tigabelas.map((b) => b.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(tigabelas.map((b) => b.kalimat)).toEqual(tabelNaskah5.map((x) => x.kalimat.replace(/\.$/, "")));
    expect(tabelNaskah5.map((x) => x.konsep)).toEqual([
      "Connection pool dan Little's Law", "Observability", "Outbox", "Klaim per baris", "At-least-once", "Dua instance", "State bersama",
      "Cache", "Offline", "XSS dan CSRF", "TLS dan pinning", "Queue dan alert", "Estimasi",
    ]);
  });

  test("kejadian tiap kalimat dari naskah: PRD v3 dan M18 untuk tiga kalimat pertama, lalu satu M per kalimat dari M19 sampai M28, dan tiap kalimat menaut M yang benar", () => {
    expect(tabelNaskah5.map((x) => x.kejadian)).toEqual(["M18", "M18", "PRD v3, M18", "M19", "M20", "M21", "M22", "M23", "M24", "M25", "M26", "M27", "M28; kapasitas satu server belum diukur"]);
    const m = [18, 18, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
    tigabelas.forEach((b, i) => {
      expect(b.ids.includes(idM(m[i]!)), `kalimat ${b.no} harus menaut M${m[i]}`).toBe(true);
      expect(b.ids[0] === idM(m[i]!) || b.ids[0] === "t3-prd", `kalimat ${b.no}: tautan pertama`).toBe(true);
    });
    expect(butir(3).ids[0]).toBe("t3-prd");
    expect(per("t3-prd").judul).toMatch(/^PRD v3/);
    const lahirM18 = tabelNaskah5.filter((x) => /M18|PRD v3/.test(x.kejadian)).length;
    expect([lahirM18, tabelNaskah5.length - lahirM18]).toEqual([3, 10]);
    harus(blok("Mulai"), "Tiga kalimat lahir dari PRD v3 dan M18, dan sepuluh lainnya dari M19 sampai M28, satu per masalah.");
  });

  test("nomor ADR tiap kalimat sama dengan naskah bagian 4, dan 'Konsep dan ADR n' menaut halaman yang field adr-nya memuat n", () => {
    const adrNaskah = (n: number): number => Number(cocok(barisM.get(n)!.adr, /^ADR (\d+)/)[1]);
    expect([...barisM.keys()]).toEqual([18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]);
    const harapan = [adrNaskah(18), undefined, 23, adrNaskah(19), adrNaskah(20), adrNaskah(21), adrNaskah(22), adrNaskah(23), adrNaskah(24), adrNaskah(25), adrNaskah(26), adrNaskah(27), undefined];
    expect(harapan).toEqual([22, undefined, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, undefined]);
    tigabelas.forEach((b, i) => {
      const a = harapan[i];
      if (a === undefined) {
        expect(b.adr, `kalimat ${b.no} tanpa ADR`).toEqual([]);
        return;
      }
      expect(b.adr, `kalimat ${b.no}`).toEqual([a]);
      harus(b.pertama, `Konsep dan ADR ${a}: [[${idAdr(a)}]].`);
    });
    harus(butir(2).pertama, "Konsep: [[t3-observability]].");
    harus(butir(13).pertama, "Konsep dan beban PRD v4: [[t3-estimasi]].");
    expect(per("t3-observability").nomor).toBe("3.7");
    expect(per("t3-estimasi").nomor).toBe("3.29");
    expect(per("t3-observability").adr).toBeUndefined();
    expect(per("t3-estimasi").adr).toBeUndefined();
  });

  test("setiap rujukan [[ID]] ada di registry, ke-30 halaman 3.1 sampai 3.30 tertaut paling sedikit sekali, dan tidak ada yang menuju jembatan 3.32", () => {
    const semua = idDalam(mdx).filter((x) => x !== "berikutnya" && x !== "Kartu" && x !== "A0");
    for (const id of semua) expect(HALAMAN.some((h) => h.id === id), `[[${id}]] tidak ada di registry`).toBe(true);
    expect(semua).not.toContain("t3-jembatan");
    expect(semua).not.toContain("t3-rekap");
    expect(tahap3.map((h) => h.nomor)).toEqual(Array.from({ length: 30 }, (_, i) => `3.${i + 1}`));
    const tertaut = new Set(semua);
    for (const h of tahap3) expect(tertaut.has(h.id), `${h.nomor} ${h.id} tidak tertaut`).toBe(true);
    expect([...tertaut].sort()).toEqual(tahap3.map((h) => h.id).sort());
    harus(blok("Paham"), "Konsep Tahap 3 tersebar di tiga puluh halaman, dari [[t3-prd]] sampai [[t3-adr-33]].");
    expect(per("t3-prd").nomor).toBe("3.1");
    expect(per("t3-adr-33").nomor).toBe("3.30");
    expect(per("t3-m22").nomor).toBe("3.16");
    expect(per("A0")?.id).toBe("A0");
    expect(mdx).not.toMatch(/pecah lebih dulu|PRD v4 selengkapnya|gateway|webhook/i);
  });

  test("Dipersempit di empat kalimat (2, 4, 12, 13), Batas di delapan lainnya (kalimat 1 tanpa batas), dan Inti menyebut empat", () => {
    const dipersempit = tigabelas.filter((b) => b.batas.startsWith("*Dipersempit:*")).map((b) => b.no);
    const bts = tigabelas.filter((b) => b.batas.startsWith("*Batas:*")).map((b) => b.no);
    expect(dipersempit).toEqual([2, 4, 12, 13]);
    expect(bts).toEqual([3, 5, 6, 7, 8, 9, 10, 11]);
    expect(tigabelas.filter((b) => b.batas === "").map((b) => b.no)).toEqual([1]);
    expect(mdx.match(/\*Dipersempit:\*/g)).toHaveLength(4);
    expect(mdx.match(/\*Batas:\*/g)).toHaveLength(8);
    harus(blok("Mulai"), "Empat dari tiga belas kalimat naskah lebih luas daripada yang direkam lab");
    harus(blok("Mulai"), "jadi blok Paham menulis juga versi yang didukung rekaman, berlabel Dipersempit.");
    expect(kartu.filter((c) => c.jawab.includes("Dipersempit:")).map((c) => c.id)).toEqual(["t3-rekap-k2", "t3-rekap-k4", "t3-rekap-k12", "t3-rekap-k13"]);
    // kalimat Dipersempit memuat kalimat naskah dalam tanda kutip di kartu, persis
    for (const no of [2, 4, 12, 13]) {
      const c = kartu[no - 1]!;
      harus(c.jawab, `Naskah: "${tabelNaskah5[no - 1]!.kalimat.replace(/"/g, "'")}."`);
    }
  });
});

function bersihKata(teks: string): number {
  const b = teks.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]*\]\]/g, "x").replace(/[`*#|]/g, " ");
  return b.split(/\s+/).filter((k) => /\w/.test(k)).length;
}

// ================================================================================================================================
describe("diagram Rantai t3-rekap-kejadian: urutan, minggu, dan sumber diturunkan dari naskah dan halaman M", () => {
  test("dua baris, dua belas simpul: PRD v3 lalu M18 sampai M28 berurutan, sumber berlabel Ilustrasi, judul dan simpul pendek", () => {
    const simpul = diagram.baris.flatMap((b) => b.simpul);
    expect(diagram.id).toBe("t3-rekap-kejadian");
    expect(diagram.judul).toBe(`Kejadian Tahap ${per("t3-rekap").tahap} dalam urutan minggu`);
    expect(BERKAS_RANTAI).toBe("situs/data/diagram/t3-rekap-kejadian.json");
    expect(diagram.baris).toHaveLength(2);
    expect(diagram.baris.map((b) => b.simpul.length)).toEqual([6, 6]);
    expect(simpul[0]!.teks).toBe("PRD v3");
    for (let n = 18; n <= 28; n++) expect(simpul[n - 17]!.teks.startsWith(`M${n} `), `simpul M${n}`).toBe(true);
    expect(diagram.sumber).toEqual({ jenis: "ilustrasi", teks: "Naskah Tahap 3 · urutan kejadian" });
    expect(diagram.judul.length).toBeLessThanOrEqual(47);
    for (const s of simpul) expect(s.teks.length, s.teks).toBeLessThanOrEqual(16);
    expect(diagram.catatan).toBe("Tiga kalimat lahir dari PRD v3 dan M18; sepuluh lainnya lahir dari M19 sampai M28.");
    expect(simpul.filter((s) => s.nada === "system").map((s) => s.teks)).toEqual(["PRD v3", "M28 PRD v4"]);
    expect(simpul.filter((s) => s.nada === "warn").map((s) => s.teks)).toEqual(["M18 pool penuh"]);
  });

  test("label minggu tiap baris dihitung dari naskah (kolom Minggu) dan dari 'Minggu N' di halaman M", () => {
    const minggu = (n: number): number => {
      const dariNaskah = barisM.get(n)!.minggu;
      const deskripsi = cocok(fileHalaman(idM(n)), /^description: Minggu (\d+)\./m);
      expect(Number(deskripsi[1]), `minggu M${n}: halaman lawan naskah`).toBe(dariNaskah);
      return dariNaskah;
    };
    const baris1 = [18, 19, 20, 21, 22].map(minggu);
    const baris2 = [23, 24, 25, 26, 27, 28].map(minggu);
    expect(baris1).toEqual([3, 4, 4, 5, 6]);
    expect(baris2).toEqual([6, 7, 8, 9, 9, 10]);
    expect(diagram.baris[0]!.label).toBe(`Sampai minggu ${Math.max(...baris1)}`);
    expect(diagram.baris[1]!.label).toBe(`Minggu ${Math.min(...baris2)} sampai ${Math.max(...baris2)}`);
    expect(diagram.baris.map((b) => b.sub)).toEqual(["pemberitahuan dan ketersediaan", "cache, offline, keamanan, beban"]);
  });

  test("sub tiap simpul menyebut konsep dari naskah bagian 5 untuk M itu", () => {
    const simpul = diagram.baris.flatMap((b) => b.simpul);
    const sub = Object.fromEntries(simpul.map((s) => [s.teks, s.sub]));
    expect(sub).toEqual({
      "PRD v3": "syarat Pak Hadi", "M18 pool penuh": "pool dan outbox", "M19 kursor": "klaim per baris", "M20 pesan ganda": "at-least-once",
      "M21 satu proses": "dua instance", "M22 batas login": "state bersama", "M23 dua harga": "cache", "M24 stok lama": "offline",
      "M25 XSS": "data tetap input", "M26 sertifikat": "TLS dan pin", "M27 queue": "umur dan alert", "M28 PRD v4": "estimasi",
    });
    harus(tabelNaskah5.map((x) => x.konsep.toLowerCase()).join("|"), "klaim per baris|at-least-once|dua instance|state bersama|cache|offline");
    expect(per(idM(18)).judul).toMatch(/^M18: Seluruh app membeku/);
    expect(per(idM(23)).judul).toMatch(/^M23: Dua harga/);
    expect(per(idM(24)).judul).toMatch(/^M24: Stok yang kembali/);
    expect(per(idM(26)).judul).toMatch(/^M26: Transfer yang tidak dibuat Budi/);
    expect(per(idM(28)).judul).toMatch(/^M28: Uji coba enam kota lolos, PRD v4 datang/);
  });
});

// ================================================================================================================================
describe("angka di tiga belas kalimat dan batasnya: dari rekaman, registry, dan halaman asal", () => {
  test("kalimat 1: pool 10 penuh antara detik ke-11 dan ke-12, pool 50 antara ke-57 dan ke-58, λ 0,868 dari registry", () => {
    expect(LAM).toBe("0,868");
    expect([ukA, ukB]).toEqual(["10", "50"]);
    expect(angka(butir(1).pertama)).toEqual([LAM, ukA, poolA[1]!, poolA[2]!, ukB, poolB[1]!, poolB[2]!, "22"]);
    harus(butir(1).pertama, `Pool ${ukA} penuh antara detik ke-${poolA[1]} dan ke-${poolA[2]}, sedangkan pool ${ukB} baru penuh antara detik ke-${poolB[1]} dan ke-${poolB[2]} (\`m18.txt\` bagian A dan B, lab t3-pool).`);
    harus(butir(1).pertama, `padahal pembayaran hanya ${LAM} per detik (Asumsi naskah)`);
    expect(butir(1).batas).toBe("");
    harus(fileHalaman("t3-pool"), `antara detik ke-${poolA[1]} dan ke-${poolA[2]} untuk pool ${ukA}, dan antara detik ke-${poolB[1]} dan ke-${poolB[2]} untuk pool ${ukB} (\`m18.txt\` bagian A dan B)`);
    harus(fileHalaman("t3-m18"), "Beban datang dengan jadwal tetap, bukan acak");
    harus(bag(m18, "A").join("\n"), "# Beban dengan jadwal tetap, bukan acak");
  });

  test("kalimat 2: log 0 baris selama 4 detik, metric pool 1 dari 10, satu sesi idle in transaction; trace Tidak dijalankan dan traceparent tidak dibaca api-t3", () => {
    expect(angka(butir(2).pertama)).toEqual([logJ[1]!, poolJ[1]!, poolJ[2]!]);
    expect(logJ[2]).toBe("0");
    harus(butir(2).pertama, `satu pembayaran yang menggantung diamati ${logJ[1]} detik. Log tidak bertambah, metric pool menjawab dipakai ${poolJ[1]} dari maks ${poolJ[2]}, dan database melaporkan satu sesi \`idle in transaction\` (\`jejak.txt\` bagian J, lab t3-pool)`);
    harus(butir(2).pertama, "Raka tidak menemukan satu baris log pun untuk request yang menggantung.");
    expect(ada(J, /idle in transaction +\| Client +\| ClientRead/)).toBe(true);
    expect(ada(J, /^# 4\. Trace: Tidak dijalankan\./)).toBe(true);
    expect(ada(J, /kode api-t3 tidak membaca traceparent/)).toBe(true);
    harus(butir(2).batas, "trace Tidak dijalankan, karena kode api-t3 tidak membaca `traceparent`. Versi yang didukung rekaman: log kosong tidak membedakan sehat dari menggantung, dan bagian API yang menunggu tetap tidak terlihat.");
    harus(fileHalaman("t3-observability"), "Bagian API mana yang menunggu belum terlihat. Itu pertanyaan untuk trace.");
    harus(fileHalaman("t3-m18"), "tidak memuat satu baris pun untuk request yang menggantung");
    expect(angka(butir(2).batas)).toEqual([]);
  });

  test("kalimat 3: Rp25.000, 201, satu baris menunggu, 0 pesan sebelum worker; syarat Pak Hadi v3 sama dengan PRD; opsi lain Tidak dijalankan", () => {
    expect(nominalA).toBe(25000);
    expect(angka(butir(3).pertama)).toEqual([titik(nominalA), "201", "0", "23"]);
    expect(ada(TA, /^HTTP\/1\.1 201 Created$/)).toBe(true);
    expect(ada(TA, /^ 1 +\| 10001 +\| 418 +\| 0 +\| bayar +\| menunggu +\| 0 +\| Rp25\.000 dari Budi$/)).toBe(true);
    expect(ada(TA, /^push tiruan menerima: 0 /)).toBe(true);
    expect(ada(TA, /^push tiruan menerima: 1$/)).toBe(true);
    harus(butir(3).pertama, `Di rekaman, Budi membayar ${rp(nominalA)} dan API menjawab 201, tetapi layanan push menerima 0 pesan sampai worker berjalan (\`transaksi.txt\` bagian A, lab t3-outbox).`);
    harus(butir(3).pertama, "Jadi pembayaran menulis jurnal dan satu baris outbox di satu transaction.");
    const prd = fileHalaman("t3-prd");
    harus(prd, '| v3 | Aturan v2 tetap berlaku, ditambah: "Ani tidak boleh diberi tahu uang masuk sebelum uang itu benar-benar tercatat." |');
    harus(butir(3).pertama, "Ani tidak boleh diberi tahu uang masuk sebelum uang itu tercatat.");
    harus(butir(3).pertama, "Push di dalam transaction membekukan app di [[t3-m18]], dan layanan push tidak ikut COMMIT PostgreSQL ([[t3-dua-tempat]]).");
    // opsi lain ditulis Tidak dijalankan di bukti ADR 23 dan di rekaman F
    const bukti = fileHalaman("t3-outbox").split("\n").find((b) => b.startsWith("| Bukti |"))!;
    expect(bukti.split("|").map((x) => x.trim()).slice(2, 5).every((x) => x.startsWith("Tidak dijalankan"))).toBe(true);
    expect(ada(bag(transaksi, "F"), /Opsi itu Tidak dijalankan di lab ini/)).toBe(true);
    harus(butir(3).batas, "rekaman hanya menjalankan opsi outbox. Opsi kirim sesudah COMMIT, queue di Redis, dan CDC Tidak dijalankan.");
  });

  test("kalimat 4: saldo Citra naik Rp50.000 dengan satu pesan lawan dua pesan; yang terbalik hanya dibuat, nomor outbox Dimas 1 dan Budi 2", () => {
    expect(saldoCitra).toBe(50000);
    expect(angka(butir(4).pertama)).toEqual([titik(saldoCitra), "24"]);
    expect(ada(KB, /^push tiruan menerima: 1 pesan \(hanya Dimas\)/)).toBe(true);
    expect(ada(KC, /^push tiruan menerima: 2 pesan; HP Citra berbunyi dua kali/)).toBe(true);
    expect(ada(KB, /^ 1 +\| 417 +\| terkirim +\| 2$/)).toBe(true);
    expect(ada(KB, /^ 2 +\| 419 +\| menunggu +\| 1$/)).toBe(true);
    harus(butir(4).pertama, `dua transfer ke Citra membuat saldonya naik ${rp(saldoCitra)}, tetapi HP-nya menerima satu pesan.`);
    harus(butir(4).pertama, "Poller membaca dengan kursor `(dibuat, id)`, dan baris Budi, yang mulai lebih dulu tetapi COMMIT belakangan, tertinggal di belakang kursor (`kursor.txt` bagian B, lab t3-outbox).");
    harus(butir(4).pertama, "Worker yang mengklaim baris mengirim kedua pesan (bagian C).");
    const m19 = fileHalaman("t3-m19");
    harus(m19, "di bagian B dan D nomor 1 COMMIT lebih dulu, dan yang terbalik hanya `dibuat`");
    harus(m19, "urutan nomor tidak dijanjikan sama dengan urutan COMMIT");
    harus(m19, "Morling menulis bahwa urutan pesan di tabel outbox");
    harus(butir(4).batas, "yang terbalik di rekaman adalah `dibuat`, yaitu awal transaction, bukan nomor outbox.");
    harus(butir(4).batas, "nomor sequence tidak dijanjikan sama dengan urutan COMMIT (sumbernya di [[t3-m19]], Tidak dijalankan)");
    harus(fileHalaman("t3-klaim-baris"), "Urutan antar pesan juga tidak dijaga.");
    expect(angka(butir(4).batas)).toEqual([]);
  });

  test("kalimat 5: 2 pesan dengan 1 notifikasi_id, penyaring tiruan menampilkan 1 dari 2, klaim 5 detik; penyaring adalah lima baris Python tanpa berkas Dart di t3-outbox", () => {
    expect(klaimGanda).toBe("5");
    expect(ada(GA, /^push tiruan menerima: 2 pesan, 1 notifikasi_id$/)).toBe(true);
    expect(ada(GC, /^diterima: 2 pesan; ditampilkan: 1 /)).toBe(true);
    expect(ada(GC, /^# Penyaring tiruan lima baris di run\.py \(kode app Dart: halaman 3\.13, Tidak dijalankan di lab ini\)/)).toBe(true);
    expect(angka(butir(5).pertama)).toEqual(["25.000", klaimGanda, "2", "1", "1", "25"]);
    harus(butir(5).pertama, `jadi klaim ${klaimGanda} detik habis dan worker lain mengirim ulang. Layanan push menerima 2 pesan dengan 1 \`notifikasi_id\`, dan penyaring tiruan menampilkan 1 (\`ganda.txt\` bagian A dan C, lab t3-outbox).`);
    harus(butir(5).pertama, 'HP Ani menampilkan "Rp25.000 dari Budi" dua kali, padahal hanya ada satu jurnal.');
    harus(butir(5).batas, "penyaring itu lima baris Python di lab, bukan kode app Dart.");
    const run = baca("labs/t3-outbox/run.py").split("\n");
    const i = run.findIndex((l) => l.includes("sudah, tampil = set(), []"));
    expect(run.slice(i, i + 5).map((l) => l.trim())).toEqual([
      "sudah, tampil = set(), []", 'for x in p["daftar"]:', 'if x["notifikasi_id"] not in sudah:', 'sudah.add(x["notifikasi_id"])', "tampil.append(x)",
    ]);
    expect([...(terlacak ?? [])].filter((f) => f.startsWith("labs/t3-outbox/") && f.endsWith(".dart"))).toEqual([]);
    harus(fileHalaman("t3-at-least-once"), "bentuk Dart-nya ada di blok Paham dan Tidak dijalankan");
  });

  test("kalimat 6: kode keluar 2 dan healthz 200, 10 dari 20 request 502 dengan round_robin, 503 saat kedua instance mati; satu VPS titik gagal tunggal", () => {
    expect([healthzB, keluarB]).toEqual(["200", "2"]);
    expect(proxyC.slice(1, 3)).toEqual(["10", "10"]);
    expect(Number(proxyC[1]) + Number(proxyC[2])).toBe(20);
    expect(PC[0]).toContain("round_robin");
    expect(tigaPD[1]).toBe("10");
    expect(ada(PD, /Sari menekan Ekspor lagi: sampai di instance b; b berhenti sendiri \(kode keluar 2\)/)).toBe(true);
    expect(angka(butir(6).pertama)).toEqual([healthzB, keluarB, proxyC[1]!, String(Number(proxyC[1]) + Number(proxyC[2])), "502", "26"]);
    harus(butir(6).pertama, `Panic di handler memutus satu koneksi dan \`/healthz\` tetap ${healthzB}, tetapi panic di goroutine latar mematikan proses dengan kode keluar ${keluarB} (\`panic.txt\` bagian B, lab t3-instance).`);
    harus(butir(6).pertama, `membuat ${proxyC[1]} dari ${Number(proxyC[1]) + Number(proxyC[2])} request dijawab 502 (\`proxy.txt\` bagian C; lab memakai \`round_robin\`)`);
    harus(butir(6).batas, "satu Ekspor yang ditekan dua kali mematikan kedua instance, dan proxy menjawab 503 (`panic.txt` bagian D). Satu VPS tetap titik gagal tunggal, dan VPS yang mati Tidak dijalankan.");
    expect(angka(butir(6).batas)).toEqual(["503"]);
    const h = fileHalaman("t3-dua-instance");
    harus(h, "Satu VPS tetap titik gagal tunggal.");
    harus(h, "Kejadian VPS mati Tidak dijalankan.");
  });

  test("kalimat 7: 20 dari 24 lewat dua instance, 10 dengan Redis, 20 dari 24 lagi saat Redis mati; clientIP memakai RemoteAddr dan X-Forwarded-For tidak dibaca di kode api-t3", () => {
    expect(batasA.slice(1, 3)).toEqual(["20", "4"]);
    expect(batasE.slice(1, 3)).toEqual(["10", "14"]);
    expect(batasI.slice(1, 3)).toEqual(["20", "4"]);
    expect(Number(batasA[1]) + Number(batasA[2])).toBe(24);
    expect(angka(butir(7).pertama)).toEqual(["24", batasA[1]!, "10", batasE[1]!, batasI[1]!, "24", "27"]);
    harus(butir(7).pertama, `24 percobaan login dari satu alamat lewat dua instance membuat ${batasA[1]} sampai ke pemeriksaan password. Batas per alamat tertulis 10 (\`batas.txt\` bagian A, lab t3-instance).`);
    harus(butir(7).pertama, `Dengan satu hitungan di Redis, hanya ${batasE[1]} yang sampai (bagian E). Saat Redis dihentikan, batas jatuh ke bucket lokal dan ${batasI[1]} dari 24 sampai lagi (bagian I).`);
    expect(ada(BI, /login tidak ikut mati/)).toBe(true);
    expect(ada(bag(batas, "B"), /24 percobaan langsung ke instance a → 401: 10 · 429: 14/)).toBe(true);
    const go = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/api-t3/") && f.endsWith(".go") && !f.endsWith("_test.go"));
    expect(go.length).toBeGreaterThan(20);
    const tanpaKomentar = (f: string): string => baca(f).split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    expect(go.filter((f) => /x-forwarded-for/i.test(tanpaKomentar(f)))).toEqual([]);
    expect(/x-forwarded-for/i.test("r.Header.Get(\"X-Forwarded-For\")")).toBe(true);
    const handler = baca("labs/api-t3/internal/handler/handler.go");
    harus(handler, "func clientIP(r *http.Request) string {\n\tip, _, err := net.SplitHostPort(r.RemoteAddr)");
    harus(handler, "di belakang proxy, RemoteAddr adalah alamat proxy untuk semua client, jadi semuanya berbagi satu key per IP");
    harus(butir(7).batas, "kode lab tidak membaca `X-Forwarded-For`, jadi di belakang proxy semua client berbagi satu key per alamat (dibaca dari kode, Tidak dijalankan).");
    expect(angka(butir(7).batas)).toEqual([]);
  });

  test("kalimat 8: Budi Rp22.500 dan Citra Rp25.000, TTL 300 detik, ditagih Rp22.500 dari database, harga lama hilang di detik ke-300, stok cache 50 lawan 49", () => {
    expect(ada(MB, /^# Dua harga di satu meja: Budi Rp22\.500, Citra Rp25\.000\./)).toBe(true);
    expect(ada(MC, /^# Pesanan tidak membaca cache: Rp22\.500 ditagih\./)).toBe(true);
    expect(ttlD).toBe("300");
    expect(ada(MD, /detik ke-299: masih entri lama/)).toBe(true);
    expect(ada(MD, /"harga":25000,"harga_efektif":25000,"stok":50.*# detik ke-299/)).toBe(true);
    expect([stokCache, stokD300]).toEqual(["50", "49"]);
    expect(angka(butir(8).pertama)).toEqual(["22.500", "25.000", ttlD, "22.500", "300", "28"]);
    harus(butir(8).pertama, `HP Budi menampilkan nasi goreng ${rp(22500)} dan HP Citra ${rp(25000)}.`);
    harus(butir(8).pertama, `Cache katalog ada di memori tiap instance dengan TTL ${ttlD} detik`);
    harus(butir(8).pertama, `Citra tetap ditagih ${rp(22500)}, karena \`Pesan\` membaca harga dari database, dan harga lama hilang di detik ke-${ttlD} (\`memori.txt\` bagian B sampai D, lab t3-cache).`);
    harus(butir(8).batas, `stok di cache juga stale (${stokCache} di cache instance B, ${stokD300} di database), dan rekaman tidak memakai app Flutter.`);
    expect(angka(butir(8).batas)).toEqual([stokCache, "49"]);
    harus(fileHalaman("t3-m23"), "Rekaman tidak memakai app Flutter. Ia tidak membuktikan app bebas dari cache sendiri, hanya sisi server yang teruji.");
  });

  test("kalimat 9: stok = 0 dikirim ulang 62 jam, key 24 jam, 17 jam dikenali dan stok 50, 62 jam menimpa stok 30 dengan 200, 409 dengan versi dasar; 7 dan 14 hari Asumsi", () => {
    expect([jamC, jamD]).toEqual(["17", "62"]);
    expect(keyJam.slice(1, 3)).toEqual(["17", "24"]);
    expect(ada(MCc, /stok 50 dan versi 3 tidak berubah/)).toBe(true);
    expect(ada(MDd, /server menjawab 200 dan stok 30 dari Sabtu hilang/)).toBe(true);
    expect(ada(VC, /^HTTP\/1\.1 409 Conflict$/)).toBe(true);
    expect(ada(VC, /^\{"sekarang":\{"id":181,.*"stok":30,"versi":3\},"status":"diterapkan","ulang":true\}$/)).toBe(true);
    expect(ada(VC, /^\{"sekarang":\{"id":361,.*"stok":30,"versi":2\},"status":"konflik","ulang":false\}$/)).toBe(true);
    expect(angka(butir(9).pertama)).toEqual(["0", jamD, "30", keyJam[2]!, jamC, "50", jamD, "30", "409", "29"]);
    harus(butir(9).pertama, `stok = 0 dari Jumat dikirim ulang ${jamD} jam kemudian dan menimpa 30 porsi yang Ani isi hari Sabtu.`);
    harus(butir(9).pertama, `Key berlaku ${keyJam[2]} jam. Nasi goreng yang dikirim ulang ${jamC} jam sesudah Jumat dikenali, dan stoknya tetap 50. Ayam geprek yang dikirim ulang ${jamD} jam sesudah Jumat menimpa stok 30 (\`m24.txt\` bagian C dan D, lab t3-offline).`);
    // nasi goreng (produk 1, bagian C) dan ayam geprek (produk 61, bagian D) adalah dua produk berbeda di rekaman
    expect(ada(MCc, /FROM produk WHERE id = 1$/)).toBe(true);
    expect(ada(MCc, /^ 1 +\| Nasi goreng \| 50 +\| 3$/)).toBe(true);
    expect(ada(MDd, /FROM produk WHERE id = 61$/)).toBe(true);
    expect(ada(MDd, /^ 61 +\| Ayam geprek \| 30 +\| 3$/)).toBe(true);
    harus(butir(9).pertama, "Dengan versi dasar, operasi yang belum pernah sampai dijawab 409, dan produk tidak berubah (`versi.txt` bagian C).");
    harus(butir(9).batas, `lama offline ${jamD} jam adalah Asumsi naskah, dan jam service dimajukan tanpa ada yang menunggu. HP diperankan curl, jadi queue lokal dan layar konflik di app Tidak dijalankan. Umur queue 7 hari dan kunci 14 hari juga Asumsi naskah.`);
    harus(fileHalaman("t3-m24"), `Lama offline ${jamD} jam, dari Jumat 16.50 sampai Senin 06.50, adalah Asumsi naskah`);
    harus(m24, "Ilustrasi mekanisme: waktu diperankan, tidak ada yang menunggu");
    harus(fileHalaman("t3-offline"), "Waktu di lab diperankan (Ilustrasi mekanisme), dan HP diperankan curl");
    expect(angka(butir(9).batas)).toEqual([jamD, "7", "14"]);
    harus(fileHalaman("t3-offline"), "Angka 7 dan 14 hari adalah pilihan naskah (Asumsi)");
    harus(fileHalaman("t3-m24"), "Rekaman hanya mengapit batas itu: 17 jam dikenali, 62 jam tidak.");
  });

  test("kalimat 10: satu dialog di A, 0 di C dan E, fetch 200 di D; Rp5.000 dari Dimas; hanya Chromium 156 (README lab); dari passkey hanya pendaftaran yang direkam", () => {
    expect([dialogA, dialogC, dialogE]).toEqual([1, 0, 0]);
    expect(fetchD).toBe("200");
    expect(angka(butir(10).pertama)).toEqual(["5.000", String(dialogA), String(dialogC), "30"]);
    harus(butir(10).pertama, `catatan ${rp(5000)} dari Dimas berisi tag gambar, dan dasbor Ani menulisnya lewat \`innerHTML\`.`);
    harus(butir(10).pertama, `Di Chromium yang baru diluncurkan tanpa ekstensi muncul satu kotak peringatan berisi 1 (\`xss.txt\` bagian A, lab t3-dasbor). Hanya CSP atau hanya \`textContent\` menghasilkan ${dialogC} dialog (bagian C dan E).`);
    harus(butir(10).pertama, "Skrip yang dijalankan penggerak lab di halaman yang sama mengubah harga walau token CSRF, Origin, dan cookie `HttpOnly` benar (bagian D).");
    expect(ada(XD, /harga produk 1 sebelum: Rp25000, sesudah skrip yang sama memanggil \/api\/menu\/harga: Rp2$/)).toBe(true);
    expect(ada(XD, /\(Playwright, Chromium nyata\)/)).toBe(true);
    const readme = baca("labs/t3-dasbor/README.md");
    const versiChromium = cocok(readme, /Rekaman terakhir memakai Chromium (\d+)\.\d+\.\d+\.\d+ lewat Playwright/)[1]!;
    expect(angka(butir(10).batas)).toEqual([versiChromium]);
    harus(butir(10).batas, `hanya Chromium ${versiChromium} yang diuji, dan dari passkey hanya pendaftaran kredensial yang direkam.`);
    harus(fileHalaman("t3-xss-csrf"), "Penyimpanan di server, verifikasi, login (`navigator.credentials.get()`), perangkat sungguhan, dan pemulihan akun Tidak dijalankan.");
    const wa = rk("t3-dasbor", "webauthn.txt");
    harus(wa, '"langkah": "navigator.credentials.create"');
    harus(wa, "# Tidak dijalankan: login passkey penuh");
    harus(fileHalaman("t3-m25"), "Browser lain Tidak dijalankan.");
    harus(fileHalaman("t3-m25"), "membuka riwayat Warung Ani di Chromium baru yang tidak dipasangi ekstensi");
  });

  test("kalimat 11: Rp150.000 ke Dimas, 0 request dengan validasi, 0 request dengan pin di connectionFactory, rotasi: pin satu kunci ditolak dan cadangan tetap terhubung", () => {
    expect([reqB, reqDioB]).toEqual(["0", "0"]);
    expect(nominalE).toBe(150000);
    expect(ada(M26C, /request terbaca 1$/)).toBe(true);
    expect(ada(M26C, /"callback_dipanggil":1/)).toBe(true);
    expect(ada(bag(m26, "E"), /^ 10001 +\| K00419 +\| -150000$/)).toBe(true);
    expect(angka(butir(11).pertama)).toEqual([titik(nominalE), reqB, "31"]);
    harus(butir(11).pertama, `Dimas memakainya untuk transfer ${rp(nominalE)} ke dirinya, dan dengan validasi aktif hotspot melihat ${reqB} request (\`m26.txt\` bagian B, C, dan E, lab t3-mitm).`);
    harus(butir(11).pertama, "Pin di `connectionFactory` menahan CA Dimas yang sudah dipercaya (`dio.txt` bagian B), tetapi app yang hanya mem-pin satu kunci ditolak saat server rotasi (`pin.txt` bagian C).");
    // pin.txt bagian C: satu kunci ditolak sesudah rotasi, dua kunci tetap terhubung, rotasi kedua menolak pin A dan B
    const PC2 = bag(pin, "C");
    const hasil = PC2.filter((l) => l.startsWith("{")).map((l) => (JSON.parse(l) as { hasil: string }).hasil);
    expect(hasil).toEqual(["terhubung", "terhubung", "ditolak", "terhubung", "terhubung", "ditolak", "terhubung"]);
    expect(ada(PC2, /^# App 1\.0 terkunci di luar: server sehat, sertifikat sah/)).toBe(true);
    expect(ada(PC2, /cadangan hanya menahan satu rotasi/)).toBe(true);
    expect(ada(bag(dio, "B"), /Database: tidak ada transfer\. Proxy menerima handshake, tidak menerima satu request pun\./)).toBe(true);
    harus(butir(11).batas, "proxy, server, dan client Dart berjalan di satu laptop, jadi perangkat dan Wi-Fi sungguhan Tidak dijalankan. Cadangan hanya menahan satu rotasi.");
    harus(fileHalaman("t3-tls-pinning"), "Proxy, server, dan client Dart berjalan di satu laptop, jadi Wi-Fi, perangkat, dan trust store HP sungguhan Tidak dijalankan.");
    expect(angka(butir(11).batas)).toEqual([]);
  });

  test("kalimat 12: 3,4% sampai 4,2% promo dalam 30 detik, uang kurang dari 1,5 detik dengan kelas, umur semua kelas lebih dari 30 detik dan kelas uang 0", () => {
    expect([persenC[1], persenC[2], persenC[3], persenC[4]]).toEqual(["30", "3,4", "4,2", "10.000"]);
    expect(detikE[1]).toBe("1,5");
    expect([umurSemua[1], umurUang[1]]).toEqual(["30", "0"]);
    expect(angka(butir(12).pertama)).toEqual(["11.42", persenC[4]!, persenC[2]!, persenC[3]!, persenC[1]!, detikE[1]!, "32"]);
    harus(butir(12).pertama, `notifikasi pembayaran Ani belum datang sampai 11.42 karena ${persenC[4]} promo mendahuluinya (Ilustrasi naskah).`);
    harus(butir(12).pertama, `worker yang mengklaim menurut nomor mengirim ${persenC[2]}% sampai ${persenC[3]}% promo dalam ${persenC[1]} detik dan belum menyentuh notifikasi uang (\`queue.txt\` bagian C, lab t3-outbox). Worker yang mengklaim menurut kelas mengirimnya dalam kurang dari ${detikE[1]} detik (bagian E).`);
    harus(butir(12).batas, `umur tertua semua kelas lebih dari ${umurSemua[1]} detik, sedangkan umur tertua kelas uang ${umurUang[1]} (\`queue.txt\` bagian E).`);
    harus(butir(12).batas, "yang dihitung adalah umur notifikasi uang tertua, bukan umur tertua seluruh queue.");
    harus(butir(12).batas, "Alert sungguhan Tidak dijalankan.");
    expect(angka(butir(12).batas)).toEqual([umurSemua[1]!, umurUang[1]!]);
    const tim = fileHalaman("t3-tim-infra");
    harus(tim, "Alert, staging, dan giliran jaga Tidak dijalankan.");
    harus(tim, "Berbunyi dan diam adalah penalaran dari dua angka itu, karena alert sungguhan Tidak dijalankan.");
    harus(fileHalaman("t3-m27"), "Queue punya umur. Yang dihitung adalah umur notifikasi uang tertua, bukan umur seluruh queue.");
    expect(ada(QE, /^# Alert umur tertua yang dihitung dari semua kelas berbunyi walau uang tepat waktu/)).toBe(true);
  });

  test("kalimat 13: puncak 17,4 dibulatkan dari 17,36 (registry), L = 17,4 × 0,02 = 0,35, batas lab L di bawah 17,4 × 50 ms = 0,87; hitungan kapasitas di M18, M23, M27; delapan lab tanpa perkakas load test", () => {
    expect([PUNCAK_BULAT, PUNCAK_TEPAT]).toEqual(["17,4", "17,36"]);
    expect([lF[1], lF[2], lF[3], lF[4]]).toEqual(["0,87", "50", "20", "0,35"]);
    expect(koma(17.4 * 0.05, 2)).toBe(lF[1]);
    expect(koma(17.4 * 0.02, 2)).toBe(lF[4]);
    expect(angka(butir(13).pertama)).toEqual(["3", "0", "4", PUNCAK_BULAT, PUNCAK_TEPAT, PUNCAK_BULAT, "0,02", lF[4]!, ukA, PUNCAK_BULAT, lF[2]!, lF[1]!, "4"]);
    harus(butir(13).pertama, "tutup buku bulan ketiga selesai dengan selisih Rp0 (Ilustrasi naskah), lalu Sinta datang dengan PRD v4.");
    harus(butir(13).pertama, `Puncak ${PUNCAK_BULAT} request per detik adalah Asumsi (dibulatkan dari ${PUNCAK_TEPAT}), dan L = ${PUNCAK_BULAT} × 0,02 = ${lF[4]} koneksi dari pool ${ukA} juga Asumsi.`);
    harus(butir(13).pertama, `Rekaman hanya memeriksa batas: L kurang dari ${PUNCAK_BULAT} × ${lF[2]} ms, yaitu ${lF[1]} koneksi (\`adr22.txt\` bagian F, lab t3-pool).`);
    const m28 = fileHalaman("t3-m28");
    harus(m28, "Hitungan kapasitas atau beban muncul di [[t3-m18]] (pool), [[t3-m23]] (katalog), dan [[t3-m27]] (worker).");
    harus(m28, "Pool dan worker dijawab tanpa memperbesar apa pun.");
    harus(m28, "Di [[t3-m23]] hasilnya menunjukkan cache tidak dibutuhkan beban (Asumsi).");
    harus(butir(13).batas, "M18, M23, dan M27 memakai hitungan kapasitas sebagai alat, dan pemicunya tetap ketergantungan. Pool dan worker dijawab tanpa memperbesar apa pun. Hitungan katalog menunjukkan cache tidak dibutuhkan beban (Asumsi), dan ADR 28 tetap memasangnya sebagai pilihan desain.");
    harus(fileHalaman("t3-cache"), "Karena itu ADR 28 di bawah adalah pilihan desain dengan alasan yang ditulis, bukan hasil ukur.");
    harus(butir(13).batas, "Kapasitas satu server belum diukur. Di delapan lab Tahap 3 tidak ada file yang memuat nama perkakas load test (dipindai: k6, wrk, locust, vegeta, hey, dan Apache Bench).");
    expect(angka(butir(13).batas)).toEqual(["18", "23", "27", "28", "3", "6"]);
    harus(m28, "Di delapan lab Tahap 3 tidak ada perintah yang menjalankan perkakas load test");
    harus(m28, "Kapasitas satu server tetap belum diukur.");
    harus(m28, "Masalah Tahap 3 adalah ketergantungan, bukan jumlah request per detik.");
    harus(fileHalaman("t3-estimasi"), "Kapasitas bukan jumlah request per detik.");
    expect(tabelNaskah5[12]!.kalimat).toBe("Masalah Tahap 3 adalah ketergantungan, bukan kapasitas");
  });

  test("tidak ada angka lain di tiga belas kalimat: tiap token angka punya bukti di daftar izin, dan angka di kartu ada di halaman", () => {
    const semua = tigabelas.flatMap((b) => [...angka(b.pertama), ...angka(b.batas)]);
    const izin = new Set(["0,868", "10", "11", "12", "50", "57", "58", "22", "4", "1", "3", "25.000", "201", "0", "23", "50.000", "24", "25", "5", "2", "200", "20", "502", "503", "26",
      "27", "22.500", "300", "28", "49", "62", "30", "17", "409", "29", "7", "14", "5.000", "150.000", "31", "11.42", "10.000", "3,4", "4,2", "1,5", "32", "17,4", "17,36", "0,02",
      "0,35", "0,87", "18", "6", "156"]);
    expect(semua.filter((x) => !izin.has(x))).toEqual([]);
    // setiap angka di kartu ada di bagian halaman yang sama (angka kalimat, ADR, atau token kalimat)
    const adrTahap3 = new Set(HALAMAN.filter((h) => h.tahap === 3).flatMap((h) => (h.adr ?? []).map(String)));
    const adaDiHalaman = new Set([...tigabelas.flatMap((b) => [...angka(b.teks), ...(b.teks.match(/\d+(?:[.,]\d+)*/g) ?? [])]), ...(blok("Putuskan").match(/\d+(?:[.,]\d+)*/g) ?? [])]);
    for (const c of kartu) {
      for (const t of [...angka(c.tanya), ...angka(c.jawab)]) expect(adaDiHalaman.has(t) || t === "0,868" || adrTahap3.has(t), `kartu ${c.id}: angka ${t} tidak ada di halaman`).toBe(true);
    }
  });
});

// ================================================================================================================================
describe("kartu tebak lalu buka t3-rekap-kartu.json", () => {
  test("tiga belas kartu berurutan dengan id unik, halaman ada di registry, judul dan url dari registry, dan tiap halaman sudah ada", () => {
    expect(kartu).toHaveLength(13);
    expect(kartu.map((c) => c.id)).toEqual(Array.from({ length: 13 }, (_, i) => `t3-rekap-k${i + 1}`));
    const halaman = ["t3-m18", "t3-m18", "t3-prd", "t3-m19", "t3-m20", "t3-m21", "t3-m22", "t3-m23", "t3-m24", "t3-m25", "t3-m26", "t3-m27", "t3-m28"];
    kartu.forEach((c, i) => {
      expect(c.halaman).toBe(halaman[i]);
      expect(c.judul).toBe(labelHalaman(c.halaman));
      expect(c.url).toBe(urlHalaman(c.halaman));
      expect(per(c.halaman).ada).toBe(true);
    });
    expect(kartu[2]!.judul).toBe("3.1 PRD v3: Rekeningo untuk enam kota");
    harus(blok("Coba"), '<WidgetLama nama="kartu" src="data/t3-rekap-kartu.json" />');
  });

  test("tiap jawaban diawali kalimat naskah (atau memuatnya dalam tanda kutip di kartu Dipersempit) dan menyebut ADR yang benar", () => {
    const adrKartu = [22, undefined, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33];
    kartu.forEach((c, i) => {
      const k = tabelNaskah5[i]!.kalimat;
      const dipersempit = c.jawab.startsWith("Naskah: ");
      if (dipersempit) harus(c.jawab, `Naskah: "${k.replace(/"/g, "'")}."`);
      else expect(c.jawab.startsWith(k.replace(/\.$/, "")), `kartu ${c.id}`).toBe(true);
      const nomor = [...c.jawab.matchAll(/\bADR (\d+)/g)].map((m) => Number(m[1]));
      if (adrKartu[i] === undefined) expect(nomor).toEqual([]);
      else expect(nomor, `kartu ${c.id}`).toEqual([adrKartu[i]]);
    });
    // ADR kartu sama dengan ADR di kalimat halaman, kecuali ADR 33 yang ada di kartu 13 dan di tabel Putuskan
    expect(butir(13).adr).toEqual([]);
  });

  test("tanya memuat kejadian yang sama dengan kalimat dan semuanya berakhir 'Kalimat apa yang lahir?'", () => {
    kartu.forEach((c, i) => {
      expect(c.tanya.endsWith("Kalimat apa yang lahir?"), `kartu ${c.id}`).toBe(true);
      const kejadian = i === 2 ? "PRD v3" : `M${[18, 18, 0, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28][i]}`;
      expect(c.tanya.startsWith(`${kejadian}: `), `kartu ${c.id} diawali ${kejadian}`).toBe(true);
    });
    harus(kartu[0]!.tanya, `Pembayarannya hanya ${LAM} per detik (Asumsi naskah). Raka mengusulkan pool 50.`);
    harus(kartu[3]!.tanya, `dua transfer ke Citra membuat saldonya naik ${rp(saldoCitra)}`);
    harus(kartu[5]!.tanya, `${proxyC[1]} dari ${Number(proxyC[1]) + Number(proxyC[2])} request dijawab 502`);
    harus(kartu[6]!.tanya, `${batasA[2] === "4" ? "24" : "?"} percobaan login dari satu alamat lewat dua instance, dan ${batasA[1]} sampai ke pemeriksaan password, padahal batas per alamat 10`);
    harus(kartu[8]!.tanya, `${jamD} jam kemudian`);
    harus(kartu[8]!.tanya, `${jamC} jam sesudah Jumat justru dikenali`);
    harus(kartu[10]!.tanya, `${rp(nominalE)}`);
    harus(kartu[11]!.tanya, `${persenC[2]}% sampai ${persenC[3]}% promo dalam ${persenC[1]} detik`);
    harus(kartu[12]!.tanya, `puncak ${PUNCAK_BULAT} request per detik (Asumsi)`);
  });

  test("angka, label, dan frasa di tanya dan jawab kartu diturunkan dari rekaman dan tabel ADR (tanpa bergantung pada kunci baris)", () => {
    // angka di kurung "(ADR n: ...)" sama dengan angka di kolom Keputusan baris tabel ADR yang sama
    const tabel = blok("Putuskan").split("\n").filter((b) => /^\| \d+ \|/.test(b)).map((b) => b.split("|").map((x) => x.trim()));
    kartu.forEach((c) => {
      const m = c.jawab.match(/\(ADR (\d+): ([^)]*)\)/);
      if (!m) return;
      const baris = tabel.find((k) => Number(k[1]) === Number(m[1]))!;
      expect(angka(m[2]!), `kartu ${c.id}: angka di kurung ADR ${m[1]}`).toEqual(angka(baris[2]!));
    });
    const dari = (n: number) => kartu[n - 1]!;
    // kata "tidak" di tanya hanya di kartu 1 (tidak menjawab), 2 (tidak menemukan) dan 3 (tidak ikut, tidak boleh); jawaban berakhir titik
    expect(kartu.map((c) => (c.tanya.match(/\btidak\b/g) ?? []).length), "jumlah 'tidak' di tanya tiap kartu").toEqual([1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(kartu.every((c) => c.jawab.endsWith(".")), "jawaban kartu berakhir dengan titik").toBe(true);
    harus(dari(1).jawab, `Rekaman lab: pool ${ukB} penuh antara detik ke-${poolB[1]} dan ke-${poolB[2]}`);
    harus(dari(2).tanya, `Di rekaman, log tetap kosong selama ${logJ[1]} detik.`);
    harus(dari(2).jawab, "Dipersempit: trace Tidak dijalankan di api-t3.");
    const status = cari(TA, /^HTTP\/1\.1 (\d+) Created$/, "transaksi A status")[1]!;
    const pesan0 = cari(TA, /^push tiruan menerima: (\d+) \(pembayaran selesai/, "transaksi A push")[1]!;
    harus(dari(3).jawab, `outbox berisi satu baris menunggu sesudah ${status}, dan layanan push menerima ${pesan0} pesan sampai worker berjalan.`);
    harus(dari(5).tanya, `${rp(nominalA)} dari Budi`);
    harus(dari(8).tanya, `HP Budi menampilkan nasi goreng ${rp(22500)} dan HP Citra ${rp(25000)}. Citra ditagih ${rp(22500)}.`);
    harus(dari(9).tanya, `stok = 0 dari Jumat dikirim ulang ${jamD} jam kemudian dan menimpa 30 porsi yang Ani isi hari Sabtu.`);
    harus(dari(9).jawab, `lama offline ${jamD} jam adalah Asumsi naskah, dan jam dimajukan.`);
    harus(dari(9).jawab, "queue lokal dan layar konflik di app Tidak dijalankan.");
    harus(dari(10).tanya, `Muncul satu kotak peringatan berisi ${dialogA}.`);
    harus(dari(10).tanya, `catatan ${rp(5000)} dari Dimas`);
    const versiChromium = cocok(baca("labs/t3-dasbor/README.md"), /Rekaman terakhir memakai Chromium (\d+)\.\d+\.\d+\.\d+ lewat Playwright/)[1]!;
    harus(dari(10).jawab, `hanya Chromium ${versiChromium} yang diuji`);
    harus(dari(12).tanya, `belum datang sampai 11.42 karena ${persenC[4]} promo mendahuluinya (Ilustrasi).`);
    harus(dari(12).jawab, `umur tertua semua kelas lebih dari ${umurSemua[1]} detik, sedangkan kelas uang ${umurUang[1]}`);
    harus(dari(12).jawab, "Alert sungguhan Tidak dijalankan.");
    harus(dari(13).tanya, `selisih Rp0 (Ilustrasi), puncak ${PUNCAK_BULAT} request per detik (Asumsi)`);
    harus(dari(13).jawab, `puncak ${PUNCAK_BULAT} (Asumsi) tidak menunjuk sumber daya yang sesak`);
    harus(dari(13).tanya, "Sinta membawa PRD v4.");
    harus(per("t3-m28").judul, "PRD v4 datang");
    harus(dari(13).jawab, "Dipersempit: M18, M23, dan M27 memakai hitungan kapasitas sebagai alat");
    harus(butir(13).batas, "M18, M23, dan M27 memakai hitungan kapasitas sebagai alat");
    harus(dari(13).jawab, "tiga hal yang diminta PRD v4 belum pernah diuji (ADR 33).");
    harus(fileHalaman("t3-m28"), "**Tiga hal yang belum pernah diuji.**");
  });

  test("Cek diri 3.31 ikut ke kartu.json hasil sinkron: lima soal dengan halaman t3-rekap, dan soal serta jawaban sama dengan halaman", () => {
    const sini = kartuSemua.filter((c) => c.halaman === "t3-rekap");
    expect(sini).toHaveLength(5);
    expect(sini.map((c) => c.id)).toEqual([1, 2, 3, 4, 5].map((n) => `t3-rekap-${n}`));
    expect(sini.every((c) => c.url === urlHalaman("t3-rekap") && c.judul === labelHalaman("t3-rekap"))).toBe(true);
    const kunci = blok("Kunci");
    const soal = [...kunci.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(soal).toHaveLength(5);
    const jawab = [...kunci.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!.replace(/\s+/g, " ").trim());
    expect(jawab).toHaveLength(5);
    sini.forEach((c, i) => {
      expect(c.tanya).toBe(soal[i]!);
      expect(c.jawab).toBe(jawab[i]!);
    });
  });
});

// ================================================================================================================================
describe("tabel ADR di blok Putuskan", () => {
  const baris = blok("Putuskan").split("\n").filter((b) => /^\| \d+ \|/.test(b)).map((b) => b.split("|").map((x) => x.trim()));
  test("dua belas baris, ADR 22 sampai 33 berurutan; tiap baris menaut halaman ADR-nya dan M yang melahirkannya (naskah bagian 4)", () => {
    expect(baris).toHaveLength(12);
    expect(baris.map((k) => Number(k[1]))).toEqual([22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33]);
    const m = [18, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
    baris.forEach((k, i) => {
      const n = Number(k[1]);
      expect(idDalam(k[3]!), `ADR ${n}`).toEqual([idAdr(n)]);
      expect(k[3]!.startsWith(n === 23 ? "PRD v3 dan M18, " : `M${m[i]}, `), `ADR ${n} lahir dari M${m[i]}`).toBe(true);
    });
    // ADR 33 menutup M28 di naskah; ADR 23 tidak punya baris M sendiri di naskah dan lahir dari PRD v3 dan M18
    expect(barisM.get(28)!.adr.startsWith("ADR 33")).toBe(true);
    expect(barisM.get(18)!.adr.startsWith("ADR 22")).toBe(true);
    expect([...barisM.values()].some((v) => v.adr.startsWith("ADR 23"))).toBe(false);
    expect(fileHalaman("t3-outbox")).toContain("**Status:** diterima sesudah M18 (minggu 3) dan sebelum M19 (minggu 4)");
  });

  test("kolom Keputusan sama dengan judul ADR di halaman masing-masing untuk ADR 22 sampai 32 (huruf pertama besar)", () => {
    for (const k of baris.slice(0, 11)) {
      const n = Number(k[1]);
      const judul = cocok(fileHalaman(idAdr(n)), new RegExp(`^### ADR ${n}: (.+)$`, "m"))[1]!;
      expect(k[2]!.replace(/`/g, ""), `ADR ${n}`).toBe(judul.charAt(0).toUpperCase() + judul.slice(1));
    }
    expect(baris[11]![2]).toBe("Komponen yang belum diperlukan sengaja belum dipasang, masing-masing dengan angka Tahap 3 dan pemicunya, dan load test kapasitas dijadwalkan sebelum fitur PRD v4 pertama yang menambah beban");
    // 3.30 (ADR 33, opsi C): tiap komponen punya pemicu, dan load test kapasitas dijadwalkan (aturan 1 dan 5)
    const t330 = fileHalaman("t3-adr-33");
    harus(t330, "**Keputusan: opsi C.** Tujuh aturan:");
    harus(t330, "Tiap komponen punya pemicu di tabel \"Kapan keputusan ini salah\"");
    harus(t330, "dijadwalkan sebelum fitur PRD v4 pertama yang menambah λ atau W.");
    harus(naskah, '| ADR 33 "Sengaja belum dilakukan"');
    expect(per("t3-adr-33").adr).toEqual([33]);
    expect(per("t3-adr-33").judul).toBe("ADR 33: Sengaja belum dilakukan");
  });

  test("tabel mencakup semua halaman Tahap 3 yang punya ADR di registry, masing-masing sekali; catatan di bawah tabel cocok dengan halaman", () => {
    const berADR = HALAMAN.filter((h) => h.tahap === 3 && h.adr?.length).map((h) => h.id);
    const diTabel = baris.map((k) => idDalam(k[3]!)[0]!);
    expect([...diTabel].sort()).toEqual([...berADR].sort());
    expect(new Set(diTabel).size).toBe(12);
    harus(blok("Putuskan"), "ADR 32 merevisi ADR 23 dengan kolom `kelas` di outbox.");
    harus(fileHalaman("t3-m27"), "ADR 23 ditulis tanpa kelas, dan ADR 32 merevisinya di [[t3-tim-infra]].");
    harus(naskah, "ADR 32 (merevisi ADR 23): kolom `kelas`");
    harus(blok("Putuskan"), "token 15 menit serta kunci sinkron 14 hari berlabel Asumsi naskah di halamannya.");
    harus(fileHalaman("t3-tls-pinning"), "Angka 15 menit adalah pilihan naskah (Asumsi)");
    harus(fileHalaman("t3-offline"), "Angka 7 dan 14 hari adalah pilihan naskah (Asumsi)");
  });
});

// ================================================================================================================================
describe("daftar periksa kode AI, Cek diri, dan halaman tanpa kalimat sendiri dari halaman sumbernya", () => {
  const daftar = ((): string[] => {
    const k = blok("Kunci");
    return k.slice(k.indexOf("### Saat me-review kode AI"), k.indexOf("### Bacaan lanjut")).split("\n").filter((b) => b.startsWith("- [ ] "));
  })();
  test("tiga belas butir, masing-masing kutipan persis dari checklist halaman yang ditaut, satu butir per kalimat", () => {
    expect(daftar).toHaveLength(13);
    const sumber = ["t3-pool", "t3-observability", "t3-outbox", "t3-klaim-baris", "t3-at-least-once", "t3-dua-instance", "t3-rate-limit-redis", "t3-cache", "t3-offline", "t3-xss-csrf", "t3-tls-pinning", "t3-tim-infra", "t3-estimasi"];
    daftar.forEach((b, i) => {
      const m = cocok(b, /^- \[ \] (.+) \(\[\[([a-z0-9-]+)\]\]\)\.$/);
      expect(m[2], `butir ${i + 1}`).toBe(sumber[i]);
      const cek = fileHalaman(sumber[i]!);
      const bagian = cek.slice(cek.indexOf("### Saat me-review kode AI"));
      expect(bagian.split("\n"), `butir ${i + 1}: kutipan tidak ada di checklist ${sumber[i]}`).toContain(`- [ ] ${m[1]!.replace(/\.$/, "")}.`);
    });
    // butir ke-i menaut halaman yang sama dengan tautan 'Konsep' di kalimat ke-i
    daftar.forEach((b, i) => {
      const id = idDalam(b)[0]!;
      expect(butir(i + 1).ids, `kalimat ${i + 1} menaut ${id}`).toContain(id);
    });
  });

  test("jawaban Cek diri merujuk angka, label, dan nomor ADR yang ada di halaman dan rekamannya", () => {
    const kunci = blok("Kunci");
    const jawab = [...kunci.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawab).toHaveLength(5);
    // 1: 50 ÷ 0,868 = 57,6 dan 10 ÷ 0,868 = 11,5 (hitungan atas λ registry), antara detik ke-57 dan ke-58 di rekaman
    expect(koma(Number(ukB) / LAMBDA, 1)).toBe("57,6");
    expect(koma(Number(ukA) / LAMBDA, 1)).toBe("11,5");
    harus(jawab[0]!, `Pool ${ukB} penuh pada ${ukB} ÷ ${LAM} = ${koma(Number(ukB) / LAMBDA, 1)} detik, bukan ${koma(Number(ukA) / LAMBDA, 1)} detik (Asumsi), dan di rekaman antara detik ke-${poolB[1]} dan ke-${poolB[2]} (\`m18.txt\` bagian B).`);
    harus(fileHalaman("t3-pool"), `Untuk n = 10 hasilnya 10 ÷ ${LAM} = ${koma(Number(ukA) / LAMBDA, 1)} detik, dan untuk n = 50 hasilnya 50 ÷ ${LAM} = ${koma(Number(ukB) / LAMBDA, 1).replace(",", ",")} detik.`);
    harus(jawab[0]!, "ADR 22 memindahkan panggilan keluar dari transaction, memasang timeout 3 detik, dan menahan pool di 10.");
    harus(fileHalaman("t3-pool"), "### ADR 22: panggilan keluar di luar transaction, timeout 3 detik, pool tetap 10");
    // 2: nomor outbox tidak terbalik, ADR 24, FOR UPDATE dan klaim_sampai
    harus(jawab[1]!, "Di rekaman, nomor outbox tidak terbalik dan yang terbalik hanya `dibuat`, jadi kursor `id` akan menangkap kasus M19 di lab.");
    harus(jawab[1]!, "Nomor sequence tetap tidak dijanjikan sama dengan urutan COMMIT (Tidak dijalankan). ADR 24 memakai klaim per baris, dan harganya urutan antar pesan tidak dijaga.");
    harus(fileHalaman("t3-klaim-baris"), "`FOR UPDATE` dan `klaim_sampai` mencegah dua worker mengirim baris yang sama.");
    harus(fileHalaman("t3-m19"), "Jadi kursor `id` saja akan menangkap kasus M19 di lab, tetapi urutan nomor tidak dijanjikan sama dengan urutan COMMIT.");
    // 3: gagal_login 5 terkunci, Rp22.500 dari database
    const D = bag(batas, "D");
    expect(ada(D, /^ 5 +\| t$/)).toBe(true);
    harus(jawab[2]!, "dan kunci akun yang menahan tebakan di 5 (`batas.txt` bagian D)");
    harus(jawab[2]!, `Yang tetap benar ada di database: tagihan ${rp(22500)}, dan kunci akun`);
    harus(jawab[2]!, "(`batas.txt` bagian A, `memori.txt` bagian B)");
    harus(fileHalaman("t3-rate-limit-redis"), "Kunci akun di database tetap menahan tebakan ke satu akun di 5 (bagian D).");
    // 4: soto dikenali (ulang true, stok 30), bakso 409 karena versi dasar 1 sudah lewat
    harus(jawab[3]!, "Kunci menjawab apakah permintaan pernah datang. Baris kunci Jumat masih ada hari Senin, jadi soto dijawab `ulang: true` dan stok 30 tidak berubah (`versi.txt` bagian C).");
    harus(jawab[3]!, "Bakso belum pernah sampai, jadi tidak ada kunci yang mengenalinya. Yang menolaknya versi: versi dasar 1 sudah lewat, jawabannya 409, dan produk tidak berubah (bagian yang sama).");
    expect(ada(VC, /^\{"sekarang":\{"id":181,.*"stok":30,"versi":3\},"status":"diterapkan","ulang":true\}$/)).toBe(true);
    expect(ada(VC, /^\{"sekarang":\{"id":361,.*"stok":30,"versi":2\},"status":"konflik","ulang":false\}$/)).toBe(true);
    expect(ada(VC, /kunci hidup 14 hari, bukan 24 jam/)).toBe(true);
    harus(fileHalaman("t3-m24"), "Key menjawab apakah permintaan ini pernah datang. Versi baris menjawab apakah keadaan sudah berubah sejak operasi dibuat.");
    expect(ada(VC, /kunci tidak dikenal, tetapi versi dasar 1 sudah lewat/)).toBe(true);
    // 5: fetch 200 dengan cookie dan token yang sah, 0 dialog di C dan E, SameSite=Lax menahan form lintas situs
    harus(jawab[4]!, `dijawab ${fetchD} (\`xss.txt\` bagian D)`);
    harus(jawab[4]!, `masing-masing sendiri: ${dialogC} dialog di bagian C dan E.`);
    harus(fileHalaman("t3-xss-csrf"), "Form dari situs lain ditahan `SameSite=Lax` atau gerbang token, Origin, dan Sec-Fetch-Site (`csrf.txt` bagian B sampai D).");
    harus(fileHalaman("t3-m25"), "`HttpOnly` melarang skrip membaca cookie, bukan memakainya");
  });

  test("tiga halaman tanpa kalimat sendiri dihitung dari tautan: halaman 3.1 sampai 3.30 yang tidak tertaut di kalimat, tabel, daftar periksa, atau daftar belum diuji", () => {
    const tertaut = new Set([...idDalam(blok("Paham").slice(blok("Paham").indexOf("### Tiga belas kalimat"))), ...idDalam(blok("Putuskan")), ...idDalam(blok("Kunci"))]);
    const tanpa = tahap3.filter((h) => !tertaut.has(h.id)).map((h) => h.id);
    expect(tanpa).toEqual(["t3-fitur-teknis", "t3-notifikasi", "t3-skema"]);
    expect(tanpa.map((id) => per(id).nomor)).toEqual(["3.2", "3.3", "3.5"]);
    harus(blok("Paham"), "Tiga di antaranya, [[t3-fitur-teknis]], [[t3-notifikasi]], dan [[t3-skema]], mendukung kalimat di bawah tetapi tidak melahirkan kalimat sendiri.");
    const deskripsi = (id: string): string => cocok(fileHalaman(id), /^description: (.+)$/m)[1]!;
    expect(deskripsi("t3-fitur-teknis").length).toBeGreaterThan(50);
    expect(tabelNaskah5.map((x) => x.konsep).join(" ")).not.toMatch(/Fitur|Skema/);
    expect(tigabelas.flatMap((b) => b.ids)).toContain("t3-dua-tempat");
  });

  test("Yang belum diuji: delapan butir, tiap butir menaut halaman yang menulis hal itu terbuka dengan kata yang sama", () => {
    const paham = blok("Paham");
    const bagian = paham.slice(paham.indexOf("### Yang belum diuji"));
    const butirBelum = bagian.split("\n").filter((b) => b.startsWith("- "));
    expect(butirBelum).toHaveLength(8);
    harus(bagian, "Delapan hal yang ditulis terbuka di halamannya belum diuji.");
    const kunci: [string, string][] = [
      ["t3-m28", "Kapasitas satu server tetap belum diukur."],
      ["t3-observability", "dan trace Tidak dijalankan"],
      ["t3-at-least-once", "bentuk Dart-nya ada di blok Paham dan Tidak dijalankan"],
      ["t3-dua-instance", "Kejadian VPS mati Tidak dijalankan."],
      ["t3-rate-limit-redis", "Kode lab belum melakukannya."],
      ["t3-offline", "queue lokal dan layar konflik di app Tidak dijalankan"],
      ["t3-tls-pinning", "Wi-Fi, perangkat, dan trust store HP sungguhan Tidak dijalankan"],
      ["t3-tim-infra", "Alert, staging, dan giliran jaga Tidak dijalankan."],
    ];
    expect(butirBelum.map((b) => idDalam(b)[0])).toEqual(kunci.map((k) => k[0]));
    for (const [id, kata] of kunci) harus(fileHalaman(id), kata);
    harus(bagian, "Komponen yang sengaja belum dipasang punya halaman sendiri di [[t3-adr-33]], dan halaman ini tidak mengulangnya.");
  });
});

// ================================================================================================================================
describe("klaim negatif berlingkup, dijaga pemindaian berkas terlacak", () => {
  const delapan = ["api-t3", "t3-pool", "t3-outbox", "t3-instance", "t3-cache", "t3-offline", "t3-dasbor", "t3-mitm"];
  test("delapan lab Tahap 3 sama dengan daftar naskah, terlacak, dan tanpa perkakas load test (pemindai diuji pada contoh)", () => {
    const i = naskah.indexOf("Lab yang dipakai.");
    const daftar = [...naskah.slice(i, naskah.indexOf("## 5. ", i)).matchAll(/^- `([a-z0-9-]+)`:/gm)].map((m) => m[1]!);
    expect([...daftar].sort()).toEqual([...delapan].sort());
    for (const l of delapan) expect(terlacak?.has(`labs/${l}/README.md`) ?? true, l).toBe(true);
    const berkasLab = [...(terlacak ?? [])].filter((f) => delapan.some((l) => f.startsWith(`labs/${l}/`)) && /\.(go|py|md|sql|txt|ya?ml|mod|dart|sh|js|ts|html|json)$|Makefile$|Caddyfile$|Dockerfile$/.test(f));
    expect(berkasLab.length).toBeGreaterThan(150);
    const pola = /\bk6\b|\bwrk\b|\blocust\b|\bvegeta\b|\bhey\b|\bApache ?Bench\b|\bab -[nc]\b/i;
    for (const contoh of ["k6 run beban.js", "wrk -t2 -c10 http://x", "locust -f x.py", "echo GET | vegeta attack", "hey -n 100 http://x", "Apache Bench", "ab -n 100 -c 10 http://x"]) expect(pola.test(contoh), contoh).toBe(true);
    const temuan = berkasLab.flatMap((f) => fs.readFileSync(path.join(akar, f), "utf8").split("\n").filter((l) => pola.test(l)).map((l) => `${f}: ${l.trim()}`));
    expect(temuan).toEqual([]);
    expect(cocok(naskah, /Lab Tahap 3 memakai beban berjadwal 17,4 request per detik yang mengukur koneksi, bukan kapasitas; load test kapasitas Tidak dijalankan\./)).toBeTruthy();
  });

  test("api-t3 tidak membaca traceparent di cmd dan internal (lingkup: labs/api-t3; pemindai diuji pada contoh)", () => {
    const berkas = [...(terlacak ?? [])].filter((f) => f.startsWith("labs/api-t3/"));
    expect(berkas.length).toBeGreaterThan(40);
    const kode = berkas.filter((f) => (f.startsWith("labs/api-t3/cmd/") || f.startsWith("labs/api-t3/internal/")) && /\.(go|sql|md|txt|json)$/.test(f));
    expect(kode.length).toBeGreaterThan(20);
    expect(kode.filter((f) => /traceparent/i.test(baca(f)))).toEqual([]);
    expect(/traceparent/i.test("req.Header.Get(\"traceparent\")")).toBe(true);
    harus(fileHalaman("t3-observability"), "Kode api-t3 tidak membaca `traceparent`, jadi trace-id dari app berhenti di API.");
  });

  test("klaim negatif tidak kehilangan kata 'tidak' atau 'belum' di halaman", () => {
    const kalimat = [
      "kode api-t3 tidak membaca `traceparent`",
      "kode lab tidak membaca `X-Forwarded-For`, jadi di belakang proxy semua client berbagi satu key per alamat",
      "Opsi kirim sesudah COMMIT, queue di Redis, dan CDC Tidak dijalankan.",
      "Kapasitas satu server belum diukur.",
      "Di delapan lab Tahap 3 tidak ada file yang memuat nama perkakas load test",
      "dan nomor sequence tidak dijanjikan sama dengan urutan COMMIT",
      "dan rekaman tidak memakai app Flutter",
      "Tidak dijalankan",
    ];
    for (const k of kalimat) harus(badan, k);
  });
});

// ================================================================================================================================
describe("kalimat penghubung dan butir belum diuji: tiap baris ditulis lengkap, dengan nilai yang bergantung sumber diturunkan", () => {
  const baris = (teks: string): string[] => teks.split("\n").map((b) => b.trim()).filter(Boolean);
  test("tiga pertanyaan 'Sudah tahu?' memuat pool dari rekaman dan Rp0 dari naskah, dan menunjuk berikutnya", () => {
    harus(naskah, "selisih Rp0");
    const mulai = blok("Mulai");
    for (const q of [
      `1. Layanan push berhenti menjawab dan semua layar membeku. Kenapa menaikkan pool dari ${ukA} ke ${ukB} hanya menunda penuhnya?`,
      "2. Saldo Citra naik, tetapi satu notifikasi tidak datang. Apa yang dibaca poller, dan kenapa satu baris terlewat?",
      "3. Tutup buku lolos dengan Rp0 dan PRD v4 datang. Apa yang belum diuji?",
    ]) expect(baris(mulai), q).toContain(q);
    expect(baris(mulai)).toContain("Yakin dengan ketiganya? Lompat ke [[berikutnya]].");
    expect(baris(mulai)).toContain("<summary>Sudah tahu? Cek 3 pertanyaan</summary>");
    expect(ada(KB, /saldo_citra_naik/)).toBe(true);
  });

  test("blok Coba dan 'Kenapa ini ada' memuat kalimat penghubung lengkap", () => {
    expect(mdx).toContain(`<Blok nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah punya ${tabelNaskah5.length === 13 ? "tiga belas" : "?"} kalimat Tahap 3, masing-masing dengan kejadiannya.">`);
    expect(daftarBlok(mdx).map((b) => b.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    const coba = baris(blok("Coba"));
    expect(coba).toContain("Setiap kartu menunjukkan satu kejadian. Tebak kalimat yang lahir darinya, lalu buka jawabannya. Tautan di kartu membawa ke halaman kejadian itu.");
    expect(coba).toContain("Kartu yang kamu tandai **Ingat** baru muncul lagi sesuai jadwal kotaknya, seperti di [[Kartu]]. Daftar lengkap tiga belas kalimat, beserta batas masing-masing, selalu ada di blok Paham.");
    const paham = baris(blok("Paham"));
    expect(paham).toContain("### Kenapa ini ada");
    expect(paham).toContain("Untuk ingatan beberapa hari kemudian, mengingat kembali jawaban lebih menguatkan daripada belajar ulang ([Roediger & Karpicke 2006](https://pubmed.ncbi.nlm.nih.gov/16507066/), dibuka 2026-10-28). Karena itu setiap konsep diringkas jadi satu kalimat dan diikat ke satu kejadian. Halaman ini tidak menjelaskan ulang konsepnya.");
    expect(paham).toContain("Bila rekaman lab hanya mendukung sebagian dari kalimat naskah, halaman ini menulis dua hal: kalimat naskahnya, dan versi yang didukung rekaman. Angka dikutip dari halaman asalnya, dengan label yang sama. Arti label Rekaman lab, Asumsi, Ilustrasi, dan Tidak dijalankan ada di [[A0]].");
    expect(paham).toContain("Tiga belas kalimat itu diuji lewat rekaman lab di mesin lokal, bukan di server sungguhan. Delapan hal yang ditulis terbuka di halamannya belum diuji.");
  });

  test("delapan butir 'Yang belum diuji' ditulis lengkap, dengan tautan dari registry", () => {
    const paham = blok("Paham");
    const butirBelum = paham.slice(paham.indexOf("### Yang belum diuji")).split("\n").filter((b) => b.startsWith("- "));
    expect(butirBelum).toEqual([
      `- Kapasitas satu server dan load test: [[${idM(28)}]].`,
      "- Trace di api-t3: [[t3-observability]].",
      "- Penyaring `notifikasi_id` di app Dart: [[t3-at-least-once]].",
      "- VPS yang mati dan pengawas proses: [[t3-dua-instance]].",
      "- Membaca `X-Forwarded-For` dari proxy tepercaya di kode lab: [[t3-rate-limit-redis]].",
      "- Queue lokal dan layar konflik di app: [[t3-offline]].",
      "- Pin di Wi-Fi dan perangkat sungguhan: [[t3-tls-pinning]].",
      "- Alert, staging, dan giliran jaga: [[t3-tim-infra]].",
    ]);
  });

  test("heading, pengantar, kepala tabel ADR, dan butir Kartu di Bacaan lanjut ditulis lengkap", () => {
    const putus = baris(blok("Putuskan"));
    expect(putus).toContain("### Dua belas keputusan Tahap 3");
    expect(putus).toContain("Keputusan di balik kalimat-kalimat itu tertulis di ADR 22 sampai 33. Alasan dan kapan keputusan itu salah ada di halaman masing-masing.");
    expect(putus).toContain("| ADR | Keputusan | Lahir dari |");
    expect(putus).toContain("|---|---|---|");
    expect(cocok(blok("Putuskan"), /ADR (\d+) sampai (\d+)/).slice(1, 3)).toEqual(["22", "33"]);
    const kunci = baris(blok("Kunci"));
    expect(kunci).toContain("- [[Kartu]]: soal Cek diri dari semua halaman yang sudah kamu baca");
    expect(kunci).toContain("### Bacaan lanjut");
    expect(kunci).toContain("### Cek diri");
    expect(kunci).toContain("### Saat me-review kode AI, cek ini");
  });
});

describe("struktur halaman: label, sumber ingatan, tanpa ID internal, dan kata yang dilarang", () => {
  test("blok Mulai: Inti satu kalimat pendek, Rantai ringkas, tiga pertanyaan; blok Kunci: lima soal dengan lima Jawaban; satu tebakan details question", () => {
    const mulai = blok("Mulai");
    const inti = cocok(mulai, /## Inti\n\n(.+)\n\n<Rantai data=\{kejadian\} ringkas \/>/)[1]!;
    expect(inti).toBe("Tahap 3 meninggalkan tiga belas kalimat, satu per konsep.");
    expect(inti.length).toBeLessThan(80);
    expect(mulai.match(/<details class="question">/g)).toHaveLength(1);
    expect(cocok(mulai, /<summary>Sudah tahu\? Cek 3 pertanyaan<\/summary>\n\n([\s\S]*?)\n\nYakin dengan ketiganya\? Lompat ke \[\[berikutnya\]\]\./)[1]!.match(/^\d\. /gm)).toHaveLength(3);
    const kunci = blok("Kunci");
    expect(kunci.match(/<details class="success">/g)).toHaveLength(5);
    expect(kunci.match(/^\*\*\d\.\*\* /gm)).toHaveLength(5);
    expect([...kunci.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4", "5"]);
    expect(badan.match(/^### /gm)).toHaveLength(7);
    expect(badan.match(/^## /gm)).toHaveLength(1);
    expect((badan.match(/<Rantai /g) ?? []).length).toBe(1);
    expect(badan).toContain('<SkripLama daftar={["cerita","kartu"]} />');
    expect(mdx).toContain('import kejadian from "../../../../data/diagram/t3-rekap-kejadian.json";');
  });

  test("label kejujuran: hasil rumus dari masukan Asumsi berlabel Asumsi, tanpa label Hitungan, dan arti label menaut A0", () => {
    harus(blok("Paham"), "Arti label Rekaman lab, Asumsi, Ilustrasi, dan Tidak dijalankan ada di [[A0]].");
    expect(badan).not.toMatch(/\(Hitungan\b/);
    harus(butir(1).pertama, "(Asumsi naskah)");
    harus(butir(13).pertama, "adalah Asumsi (dibulatkan dari 17,36)");
    harus(butir(13).pertama, "juga Asumsi.");
    harus(butir(12).pertama, "(Ilustrasi naskah)");
    harus(butir(13).pertama, "(Ilustrasi naskah)");
    // 'Rekaman lab' dipakai hanya di kalimat Dipersempit sebagai 'versi yang didukung rekaman' dan di jawaban kartu
    expect(badan.match(/Rekaman lab/g) ?? []).toHaveLength(1);
    // setiap kalimat 1 sampai 12 menyebut berkas rekaman dan nama lab; kalimat 13 menyebut adr22.txt
    const lab = ["t3-pool", "t3-pool", "t3-outbox", "t3-outbox", "t3-outbox", "t3-instance", "t3-instance", "t3-cache", "t3-offline", "t3-dasbor", "t3-mitm", "t3-outbox", "t3-pool"];
    const berkas = [["m18.txt"], ["jejak.txt"], ["transaksi.txt"], ["kursor.txt"], ["ganda.txt"], ["panic.txt", "proxy.txt"], ["batas.txt"], ["memori.txt"], ["m24.txt", "versi.txt"], ["xss.txt"], ["m26.txt", "dio.txt", "pin.txt"], ["queue.txt"], ["adr22.txt"]];
    tigabelas.forEach((b, i) => {
      harus(b.pertama, `lab ${lab[i]}`);
      for (const f of berkas[i]!) {
        harus(b.pertama, `\`${f}\``);
        expect(terlacak?.has(`labs/${lab[i] === "t3-mitm" || lab[i] === "t3-dasbor" || lab[i] === "t3-instance" || lab[i] === "t3-cache" || lab[i] === "t3-offline" || lab[i] === "t3-outbox" || lab[i] === "t3-pool" ? lab[i] : "x"}/output/${f}`) ?? true, `${lab[i]}/${f}`).toBe(true);
      }
    });
  });

  test("sumber ingatan: tautan PubMed di halaman dan baris riset memakai PMID dan tanggal akses yang sama (Roediger & Karpicke 16507066, Cepeda dkk. 16719566)", () => {
    harus(badan, "[Roediger & Karpicke 2006](https://pubmed.ncbi.nlm.nih.gov/16507066/), dibuka 2026-10-28");
    harus(badan, "- [Roediger & Karpicke 2006, Psychological Science 17(3)](https://pubmed.ncbi.nlm.nih.gov/16507066/)");
    harus(badan, "- [Cepeda dkk. 2006, Psychological Bulletin 132(3)](https://pubmed.ncbi.nlm.nih.gov/16719566/)");
    const baris = riset3.split("\n").find((b) => b.startsWith("| R3-250 |"))!;
    expect(baris, "baris riset R3-250").toBeTruthy();
    harus(baris, "dibuka 2026-10-28");
    harus(baris, "PMID 16507066 = Roediger & Karpicke");
    harus(baris, "Psychological Science 17(3)");
    harus(baris, "PMID 16719566 = Cepeda dkk.");
    harus(baris, "Psychological Bulletin 132(3)");
    harus(baris, "3.31 Yang dibawa keluar dari Tahap 3 (Kenapa ini ada, Bacaan lanjut)");
    // tiap kolom baris R3-250 ditulis lengkap: kolom halaman memakai nomor dan judul dari registry, kolom perubahan merujuk R2-215
    const kol = baris.split(" | ");
    expect(kol).toHaveLength(5);
    expect(kol[0]).toBe("| R3-250");
    expect(kol[1]).toBe("Mengingat kembali jawaban lebih menguatkan ingatan jangka panjang daripada belajar ulang; jarak ulang (halaman rekap Tahap 3, melengkapi R2-215)");
    expect(kol[2]).toContain("NCBI E-utilities esummary (eutils.ncbi.nlm.nih.gov, dibuka 2026-10-28 dengan curl;");
    expect(kol[2]).toContain("terbit Mar 2006");
    expect(kol[2]).toContain("terbit Mei 2006");
    expect(kol[2]).toContain("sudah dicatat di R2-215");
    expect(kol[3]).toBe(`${labelHalaman("t3-rekap")} (Kenapa ini ada, Bacaan lanjut)`);
    expect(kol[4]).toBe("Tidak berubah dari R2-215 |");
    harus(riset2.split("\n").find((b) => b.startsWith("| R2-215 |"))!, "(halaman rekap)");
    const r215 = riset2.split("\n").find((b) => b.startsWith("| R2-215 |"))!;
    harus(r215, "PMID 16507066");
    harus(r215, "PMID 16719566");
    expect(riset3.match(/^\| R3-250 \|/gm)).toHaveLength(1);
  });

  test("tanpa ID internal, tanpa emoji, tanpa tanda seru, tanpa Anda atau kita, dan tanpa ID riset atau nomor keputusan di teks tampil", () => {
    const POLA_ID_INTERNAL = /keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI|\b[A-Z]\d{1,2}\b(?!\.)/;
    const teksTampil = badan.replace(/^import .*$/gm, "").replace(/\[\[[^\]]*\]\]/g, "x").replace(/\(https?:[^)]*\)/g, "");
    expect(teksTampil).not.toMatch(/keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b|#\d{3}\b|NASKAH-\d|KONSISTENSI/);
    expect(POLA_ID_INTERNAL.test("lihat C2 di rekaman")).toBe(true);
    expect(JSON.stringify(kartu) + JSON.stringify(kejadianMentah)).not.toMatch(/keputusan \d+|\bR\d-\d{2,3}\b|\bPR #?\d{2,3}\b/);
    expect(mdx).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(JSON.stringify(kartu)).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(teksTampil).not.toMatch(/!(?!\[)/);
    expect(mdx).not.toMatch(/\bAnda\b|\bkita\b|\bpengguna\b/i);
    expect(JSON.stringify(kartu)).not.toMatch(/\bAnda\b|\bkita\b|\bpengguna\b/i);
    expect(mdx).not.toMatch(/\bB\d{2,3}\b/);
    expect(mdx).not.toMatch(/\bmudah\b|\bcukup\b|\btinggal\b/i);
  });

  test("front matter dikunci: title dan description memuat tiga belas, ADR 22 sampai 33, dan Cek diri", () => {
    expect(frontmatter).toContain('title: "3.31 Yang dibawa keluar dari Tahap 3"');
    expect(frontmatter).toContain("description: Tiga belas kalimat dari Tahap 3, masing-masing terikat ke kejadian dan halaman asalnya. Ada kartu untuk menebaknya, ringkasan ADR 22 sampai 33, dan Cek diri gabungan.");
    expect(cocok(frontmatter, /ADR (\d+) sampai (\d+)/).slice(1, 3)).toEqual([String(Math.min(...HALAMAN.filter((h) => h.tahap === 3).flatMap((h) => h.adr ?? []))), String(Math.max(...HALAMAN.filter((h) => h.tahap === 3).flatMap((h) => h.adr ?? []), 33))]);
  });
});
