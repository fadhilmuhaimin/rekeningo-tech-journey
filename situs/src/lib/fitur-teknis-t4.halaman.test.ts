// Penjaga halaman 4.2: tabel tujuh baris, tautan konsep, jumlah tabel, endpoint, tim, syarat, kartu pilah, dan klaim dokumentasi
// di fitur-ke-teknis.mdx, diagram t4-fitur-tabel.json, dan kartu t4-fitur-pilah.json diturunkan dari naskah (CERITA-TAHAP-4
// bagian 2 dan 3, Latar), registry (cerita.json), ERD Tahap 3 dan 4, kontrak openapi.yaml lab api-t4, rekaman labs/api-t4 dan
// labs/t4-webhook, dan baris riset. Bagian "kunci kalimat" mengunci setiap baris prosa halaman (kalimat yang tidak punya sumber
// untuk diturunkan ditulis di sini apa adanya), supaya menyisipkan "tidak" atau menukar kata tertangkap. Klaim negatif ("tidak
// punya halaman fitur sendiri") dibatasi pada halaman Tahap 4 di registry.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok } from "./blok";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const mdx = baca("situs/src/content/docs/tahap-4/fitur-ke-teknis.mdx");
const naskahBaris = baca("plan/CERITA-TAHAP-4.md").split("\n");
const naskahTeks = naskahBaris.join("\n");
const riset = baca("plan/RISET-TAHAP-4.md");
const caraPakai = baca("situs/src/content/docs/cara-pakai.mdx");
const rantai = DataRantai.parse(JSON.parse(baca("situs/data/diagram/t4-fitur-tabel.json")));
const pilah = JSON.parse(baca("situs/lama/widgets/data/t4-fitur-pilah.json")) as {
  judul: string; kelompok: string[]; item: { teks: string; jawab: number; kenapa: string }[]; penutup: string;
};
const pilahLama = (n: number) => JSON.parse(baca(`situs/lama/widgets/data/t${n}-fitur-pilah.json`)) as { kelompok: string[] };
interface Erd {
  tahap: number;
  tabel: { nama: string; kolom: { nama: string }[]; pk: string[]; cek: { nama: string; ekspresi: string }[] }[];
  selisih: { tabel_baru: string[]; kolom_baru: { tabel: string; kolom: string }[] };
}
const erd = (t: number) => JSON.parse(baca(`situs/data/erd/tahap-${t}.json`)) as Erd;
const erd3 = erd(3);
const erd4 = erd(4);
const rek = (lab: string, berkas: string): string[] => baca(`labs/${lab}/output/${berkas}`).split("\n");
const skema = rek("api-t4", "skema.txt");
const topup = rek("api-t4", "topup.txt");
const verifikasi = rek("api-t4", "verifikasi.txt");
const fitur = rek("api-t4", "fitur.txt");
const retry = rek("t4-webhook", "retry.txt");
const readmeWebhook = baca("labs/t4-webhook/README.md");
const openapi = baca("labs/api-t4/openapi.yaml").split("\n");

interface H { lama?: boolean; lebur_ke?: string; id: string; judul: string; tahap: number | string; jenis?: string; bagian?: number | string; nomor?: string; ada?: boolean; prasyarat?: string[]; path: string; adr?: number[]; inti?: boolean }
const HALAMAN = cerita.halaman as unknown as H[];
const per = (id: string): H => {
  const h = HALAMAN.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const KATA = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"];
const kata = (n: number): string => KATA[n]!;
const huruf1 = (s: string): string => s[0]!.toUpperCase() + s.slice(1);
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rp = (n: number): string => `Rp${titik(n)}`;

// ---- naskah ---------------------------------------------------------------------------------------------------------
const potong = (awal: RegExp, akhir: RegExp): string[] => {
  const a = naskahBaris.findIndex((b) => awal.test(b));
  const z = naskahBaris.findIndex((b, i) => i > a && akhir.test(b));
  if (a < 0 || z < 0) throw new Error(`naskah: bagian ${awal} tidak ada`);
  return naskahBaris.slice(a, z);
};
const sel = (b: string): string[] => b.replace(/^\|/, "").replace(/\|\s*$/, "").split(/(?<!\\)\|/).map((s) => s.trim());
const bagian2 = potong(/^## 2\. Dari fitur ke pekerjaan teknis/, /^## 3\. /);
const tabelNaskah = bagian2.filter((b) => b.startsWith("| ") && !b.startsWith("| ---") && !b.startsWith("| Fitur")).map(sel);
const bagian3 = potong(/^## 3\. Inti teknis Tahap 4/, /^\*\*Versi pertama/);
const syaratNaskah = bagian3.filter((b) => /^\d\. /.test(b));
const timNaskah = naskahBaris.find((b) => b.startsWith("Tim tumbuh dari 4 menjadi 13 orang"))!;
const timRegex = [...timNaskah.matchAll(/\*\*Tim (\w+)\*\* \((\d+) orang, dipimpin (\w+)\) memegang ([^.]+)\./g)].map((m) => ({ nama: m[1]!, n: Number(m[2]), pemimpin: m[3]!, tugas: m[4]! }));
const v = naskahBaris.find((b) => /^## 1\. PRD v\d+/.test(b))!.match(/PRD v(\d+)/)![1]!;

// ---- MDX ------------------------------------------------------------------------------------------------------------
const blokMdx = (nama: string): string => {
  const awal = mdx.indexOf(`<Blok nama="${nama}"`);
  const akhir = mdx.indexOf("</Blok>", awal);
  if (awal < 0 || akhir < 0) throw new Error(`halaman: blok ${nama} tidak ada`);
  return mdx.slice(awal, akhir);
};
const tabelMdx = (blok: string): string[][] =>
  blok.split("\n").filter((b) => b.startsWith("| ") && !b.startsWith("| ---") && !b.startsWith("| Fitur")).map(sel);
const TOKEN = /\[\[([A-Za-z0-9.\-]+)(?:\\?\|[^\]]+)?\]\]/g;
const idDalam = (teks: string): string[] => [...teks.matchAll(TOKEN)].map((m) => m[1]!);
const polos = (s: string): string => s.replace(/\s*\([^()]*\)/g, "").replace(/`/g, "").replace(/\s+/g, " ").trim();

const blokTabel = blokMdx("Dari fitur ke pekerjaan");
const baris1 = tabelMdx(blokTabel);
const blokKonsep = blokMdx("Konsep yang akan dibutuhkan");
const baris2 = tabelMdx(blokKonsep);
const blokMulai = blokMdx("Mulai");
const blokTanya = blokMdx("Pertanyaan sebelum kode");
const blokCoba = blokMdx("Coba dulu: di mana pekerjaannya?");

// ---- kontrak dan rekaman ----------------------------------------------------------------------------------------------
const endpoint = ((): Set<string> => {
  const s = new Set<string>();
  let jalur = "";
  for (const b of openapi) {
    const p = b.match(/^ {2}(\/\S*):\s*$/);
    if (p) { jalur = p[1]!; continue; }
    const m = b.match(/^ {4}(get|post|put|patch|delete):\s*$/);
    if (m && jalur) s.add(`${m[1]!.toUpperCase()} ${jalur}`);
  }
  return s;
})();
const bagianRekaman = (baris: string[], kode: string): string[] => {
  const a = baris.findIndex((b) => b.startsWith(`# --- ${kode}. `));
  if (a < 0) throw new Error(`rekaman: bagian ${kode} tidak ada`);
  const z = baris.findIndex((b, i) => i > a && b.startsWith("# --- "));
  return baris.slice(a, z < 0 ? undefined : z);
};
const rekamanSemua = ["api-t4", "t4-webhook", "t4-kartu", "t4-qr", "t4-audit", "t4-storage", "t4-integrasi"]
  .flatMap((lab) => fs.readdirSync(path.join(akar, `labs/${lab}/output`)).map((f) => baca(`labs/${lab}/output/${f}`)))
  .join("\n");

// ---- registry --------------------------------------------------------------------------------------------------------
describe("registry dan naskah: halaman 4.2", () => {
  test("terdaftar sebagai Fitur → teknis bagian 2, berprasyarat 4.1, ada, dan judul sama dengan peta naskah", () => {
    const h = per("t4-fitur-teknis");
    expect([h.tahap, h.jenis, h.bagian, h.prasyarat, h.ada, h.inti]).toEqual([4, "fitur", 2, ["t4-prd"], true, true]);
    const peta = naskahBaris.find((b) => b.startsWith("| 4.2 |"))!;
    expect(sel(peta).slice(0, 5)).toEqual(["4.2", "2", h.judul, "Fitur → teknis", "★"]);
    expect(mdx).toContain(`title: "4.2 ${h.judul}"`);
    expect(mdx).toContain("Prasyarat: [[t4-prd]]");
    expect(mdx).toMatch(/<p class="meta">Baca \d+ menit · coba 2 menit · Prasyarat: \[\[t4-prd\]\] · Jalur inti<\/p>/);
  });
  test("lima blok: Mulai dan Coba terbuka, sisanya tertutup", () => {
    expect(daftarBlok(mdx).map((b) => [b.nama, b.buka])).toEqual([
      ["Mulai", true], ["Coba dulu: di mana pekerjaannya?", true], ["Dari fitur ke pekerjaan", false],
      ["Pertanyaan sebelum kode", false], ["Konsep yang akan dibutuhkan", false],
    ]);
  });
  test("deskripsi menyebut empat tokoh yang memimpin atau memegang app, dan naskah menamai mereka", () => {
    const deskripsi = mdx.split("---")[1]!;
    for (const nama of ["Raka", "Nadia", "Wulan", "Bayu"]) {
      expect(deskripsi, `deskripsi tanpa ${nama}`).toContain(nama);
      expect(naskahTeks).toContain(nama);
    }
    expect(deskripsi).toContain("PRD v" + v);
    expect(deskripsi).toContain("pertanyaan pertama Tahap 4");
  });
  test("tiga tim dari naskah Latar: 5 + 4 + 4 = 13 sama dengan registry, dan baris daftar di halaman sama dengan naskah", () => {
    expect(timRegex.map((t) => t.nama)).toEqual(["Pembayaran", "Merchant", "Platform"]);
    expect(timRegex.map((t) => t.n)).toEqual([5, 4, 4]);
    expect(timRegex.reduce((a, t) => a + t.n, 0)).toBe(13);
    expect(cerita.tahap[3]!.asumsi.tim).toBe("13 developer, 3 tim");
    expect(timNaskah).toContain("(Asumsi cerita)");
    const daftar = blokTabel.split("\n").filter((b) => b.startsWith("- "));
    expect(daftar).toHaveLength(3);
    timRegex.forEach((t, i) => {
      const tugas = t.tugas.replace("; Raka memegang", ". Raka memegang");
      expect(daftar[i]).toBe(`- Tim ${t.nama} (${kata(t.n)} orang, dipimpin ${t.pemimpin}) memegang ${tugas}.`);
    });
    const tumbuh = timNaskah.match(/Tim tumbuh dari (\d+) menjadi (\d+) orang dalam tiga tim selama (\d+) minggu/)!;
    expect(blokTabel).toContain(`Tim tumbuh dari ${kata(Number(tumbuh[1]))} menjadi ${tumbuh[2]} orang selama ${tumbuh[3]} minggu.`);
    expect(blokTabel).toContain("Tiga belas developer dalam tiga tim membagi pekerjaannya.");
  });
  test("tiga pertanyaan terbuka PRD dan keputusan tim dari 3.32 tidak dikutip: 3.32 tidak menamai tim", () => {
    const j = baca("situs/src/content/docs/tahap-3/jembatan-prd-v4.mdx");
    for (const t of timRegex) expect(j, `3.32 menyebut tim ${t.nama}`).not.toContain(`Tim ${t.nama}`);
    expect(mdx).not.toContain("gateway, kartu, dasbor");
  });
});

// ---- tabel pekerjaan --------------------------------------------------------------------------------------------------
describe("tabel pekerjaan: tujuh baris naskah", () => {
  test("tujuh baris, fitur dan tiga kolom sama dengan naskah bagian 2 (di luar kelompok kurung)", () => {
    expect(tabelNaskah).toHaveLength(7);
    expect(baris1).toHaveLength(tabelNaskah.length);
    tabelNaskah.forEach((n, i) => {
      expect(baris1[i]![0], `fitur baris ${i + 1}`).toBe(n[0]);
      for (const k of [1, 2, 3]) expect(polos(baris1[i]![k]!), `baris ${i + 1} kolom ${k}`).toBe(polos(n[k]!));
    });
  });
  test("kolom database: tabel yang disebut dan tidak ada di ERD Tahap 3 sama dengan tabel baru di ERD Tahap 4", () => {
    const sebut = new Set(baris1.flatMap((b) => [...b[3]!.matchAll(/`([a-z_]+)(?:\.[a-z_]+)?`/g)].map((m) => m[1]!)));
    const lama = new Set(erd3.tabel.map((t) => t.nama));
    const baru = [...sebut].filter((n) => !lama.has(n));
    expect(new Set(baru)).toEqual(new Set(erd4.selisih.tabel_baru));
    expect(erd4.selisih.tabel_baru).toHaveLength(8);
  });
  test("setiap `tabel.kolom` dan tabel di kolom database ada di ERD Tahap 4, dan `akun` jenis merchant ada di batasan jenis", () => {
    const tabel = new Map(erd4.tabel.map((t) => [t.nama, new Set(t.kolom.map((k) => k.nama))]));
    for (const b of baris1) {
      for (const m of b[3]!.matchAll(/`([a-z_]+)(?:\.([a-z_]+))?`/g)) {
        expect(tabel.has(m[1]!), `tabel ${m[1]}`).toBe(true);
        if (m[2]) expect(tabel.get(m[1]!)!.has(m[2]), `kolom ${m[1]}.${m[2]}`).toBe(true);
      }
    }
    expect(tabelNaskah[3]![3]).toContain("`akun` jenis merchant");
    const jenis = erd4.tabel.find((t) => t.nama === "akun")!.cek.find((c) => c.nama === "akun_jenis_check")!.ekspresi;
    expect(jenis).toContain("'merchant'");
    expect(erd3.tabel.find((t) => t.nama === "akun")!.cek.find((c) => c.nama === "akun_jenis_check")!.ekspresi).not.toContain("'merchant'");
  });
  test("endpoint di tabel: tepat di sel backend yang benar, ada di openapi.yaml lab api-t4, dan dipanggil di salah satu rekaman", () => {
    const HARAP: Record<number, string[]> = {
      1: ["POST /topup-bank", "POST /webhooks/pembayaran"], 2: ["POST /verifikasi"],
      3: ["POST /qr", "POST /qr/{id}/bayar", "POST /merchant/katalog/impor"],
    };
    baris1.forEach((b, i) => {
      for (const k of [1, 3]) expect([...b[k]!.matchAll(/`(GET|POST|PATCH|PUT|DELETE) (\/[^`]*)`/g)], `baris ${i + 1} kolom ${k}`).toHaveLength(0);
      const sebut = [...b[2]!.matchAll(/`(GET|POST|PATCH|PUT|DELETE) (\/[^`]*)`/g)].map((m) => `${m[1]} ${m[2]}`);
      expect(sebut, `endpoint baris ${i + 1}`).toEqual(HARAP[i] ?? []);
    });
    const semua = Object.values(HARAP).flat();
    for (const e of semua) {
      expect(endpoint.has(e), `openapi ${e}`).toBe(true);
      const [metode, jalur] = e.split(" ") as [string, string];
      const pola = new RegExp(`${metode} '?${jalur.replace(/[.]/g, "\\.").replace("{id}", "[^']+")}['\\s]`);
      expect(rekamanSemua, `rekaman memanggil ${e}`).toMatch(pola);
    }
  });
  test("catatan tabel baru lain: kolom dan nilai jenis baru sama dengan selisih ERD Tahap 4", () => {
    const kolom = (t: string): string[] => erd4.selisih.kolom_baru.filter((k) => k.tabel === t).map((k) => k.kolom);
    expect(kolom("akun")).toEqual(["tingkat", "status"]);
    expect(kolom("outbox")).toEqual(["tujuan"]);
    expect(kolom("produk")).toEqual(["gambar_url"]);
    const jenis = (e: Erd) => e.tabel.find((t) => t.nama === "akun")!.cek.find((c) => c.nama === "akun_jenis_check")!.ekspresi;
    for (const j of ["pemakai", "merchant", "risk"]) {
      expect(jenis(erd4)).toContain(`'${j}'`);
      expect(jenis(erd3)).not.toContain(`'${j}'`);
    }
    expect(blokTabel).toContain("Tabel `akun` juga bertambah nilai jenis `pemakai`, `merchant`, dan `risk`. Tabel `outbox` bertambah kolom `tujuan`, dan tabel `produk` bertambah kolom `gambar_url`.");
  });
  test("label: Asumsi dan Tidak dijalankan didefinisikan di /cara-pakai/ dan halaman menaut bagiannya dua kali", () => {
    expect(caraPakai).toContain("## Label sumber");
    expect(caraPakai).toContain("**Asumsi**");
    expect(caraPakai).toContain("**Tidak dijalankan**");
    expect(caraPakai).toContain("**Rekaman lab**");
    expect([...mdx.matchAll(/\[Label sumber\]\(\/cara-pakai\/#label-sumber\)/g)]).toHaveLength(2);
    expect(blokTabel).toContain("Tidak dijalankan: PostgreSQL terkelola, penyimpanan objek, dan secret manager milik penyedia hanya dijelaskan di halaman Tahap 4. Lab memakai tiruan lokal di Compose.");
    expect(naskahTeks).toContain("PostgreSQL terkelola, NAT cloud, dan secret manager penyedia hanya bisa dijelaskan");
    expect(naskahTeks).toContain("Lab memakai tiruan di Compose");
  });
});

// ---- Inti dan diagram -------------------------------------------------------------------------------------------------
describe("Inti dan diagram Rantai: jumlah tabel dari ERD dan rekaman", () => {
  const baru = erd4.selisih.tabel_baru;
  test("kalimat pertama menyebut jumlah tabel baru dan jumlah tabel akhir dari ERD; kalimat kedua tidak menyebut tabel", () => {
    expect(blokMulai).toContain(`PRD v${v} menambah ${kata(baru.length)} tabel, dari ${erd3.tabel.length} menjadi ${erd4.tabel.length}. Pekerjaan yang membuka Tahap 4 terjadi di luar database: menerima kabar dari gateway pembayaran.`);
    expect(erd4.tabel).toHaveLength(erd3.tabel.length + baru.length);
    expect(erd4.tabel).toHaveLength(22);
    expect(naskahTeks).toContain("Jumlahnya 22 tabel: 14 dari Tahap 3 dan 8 baru");
  });
  test("paragraf pertama: tabel baru dari yang pertama sampai yang terakhir di ERD, dan kolom baru akun", () => {
    const akunKolom = erd4.selisih.kolom_baru.filter((k) => k.tabel === "akun").map((k) => k.kolom);
    expect(blokMulai).toContain(`${huruf1(kata(baru.length))} tabel baru ada di skema lab api-t4, dari \`${baru[0]}\` sampai \`${baru[baru.length - 1]}\`. Tabel \`akun\` bertambah kolom \`${akunKolom[0]}\` dan \`${akunKolom[1]}\`.`);
  });
  test("rekaman skema.txt bagian A: 22 tabel, sama dengan ERD Tahap 4", () => {
    const bagianA = bagianRekaman(skema, "A").join("\n");
    expect(bagianA).toContain("22");
    for (const t of erd4.tabel.map((x) => x.nama)) expect(bagianA, `tabel ${t} di bagian A`).toContain(t);
    expect(skema[0]).toContain("22 tabel");
    expect(skema[0]).toContain("migrasi 000020-000023");
  });
  test("Rantai: 14 tabel, + 8 tabel dengan batas nama dari ERD, 22 tabel; baris kedua dari naskah bagian 3", () => {
    const [db, luar] = rantai.baris;
    expect(db!.simpul.map((s) => s.teks)).toEqual([`${erd3.tabel.length} tabel`, `+ ${baru.length} tabel`, `${erd4.tabel.length} tabel`]);
    expect(db!.simpul[1]!.sub).toBe(`${baru[0]} sampai ${baru[baru.length - 1]}`);
    expect(db!.simpul.map((s) => s.nada)).toEqual(["old", "system", "good"]);
    expect(db!.simpul[0]!.sub).toBe(`akhir Tahap ${erd3.tahap}`);
    const lab = skema[0]!.match(/^# Lab (\S+)/)![1]!;
    expect(db!.simpul[2]!.sub).toBe(`skema lab ${lab}`);
    expect(rantai.sumber).toEqual({ jenis: "ilustrasi", teks: "Baris 1: rekaman lab api-t3 dan api-t4. Baris 2: Ilustrasi" });
    expect(rantai.sumber.teks).toContain(lab);
    expect(rantai.baris.map((b) => b.label)).toEqual(["Database", "Di luar database"]);
    expect(luar!.simpul.map((s) => [s.teks, s.nada])).toEqual([["Kabar gateway", "warn"], ["Jurnal top-up", "system"]]);
    expect(luar!.simpul[0]!.sub).toBe("gateway tidak ikut COMMIT atau ROLLBACK");
    expect(luar!.simpul[1]!.sub).toBe("PostgreSQL: berhasil atau batal sebagai satu unit");
    expect(rantai.judul).toBe("Dari PRD v4: tabel dan kabar dari gateway");
    expect(rantai.catatan).toBe("Abu-abu: akhir Tahap 3. Biru: yang ditambahkan. Hijau: hasilnya. Kuning: pekerjaan yang tidak ikut COMMIT.");
    expect(naskahTeks).toContain("Rekeningo tidak bisa membuat gateway ikut COMMIT atau ROLLBACK.");
  });
  test("paragraf kedua: baris top-up adalah baris kedua dari tujuh baris naskah", () => {
    expect(tabelNaskah[1]![0]).toBe("Top-up dari bank");
    expect(blokMulai).toContain(`Baris kedua dari ${kata(tabelNaskah.length)} baris pekerjaan di bawah, ${tabelNaskah[1]![0]!.toLowerCase()}, menyentuh dua tempat sekaligus. PostgreSQL bisa COMMIT atau ROLLBACK sebagai satu unit, tetapi gateway tidak ikut unit itu. Dari baris itu lahir pertanyaan pertama Tahap 4.`);
  });
});

// ---- tautan konsep ---------------------------------------------------------------------------------------------------
const KONSEP_KE_JUDUL: Record<string, RegExp> = {
  "modular monolith": /^Modular monolith, CODEOWNERS/, "codeowners": /^Modular monolith, CODEOWNERS/,
  "iac": /^Secret manager, IaC/, "secret manager": /^Secret manager, IaC/,
  "audit log": /^Keamanan 9: Back office/, "audit log berantai hash": /^Keamanan 9: Back office/, "insider": /^Keamanan 9: Back office/, "mcp": /^Keamanan 9: Back office/,
  "webhook masuk": /^Webhook masuk: tanda tangan/, "idempotensi": /^Retry dan idempotency key/,
  "retry dan circuit breaker": /^Timeout, retry berkunci/, "queue per vendor": /^Timeout, retry berkunci/,
  "rekonsiliasi": /^Rekonsiliasi dengan gateway/,
  "object storage": /^Keamanan 7: File identitas/, "presigned url": /^Keamanan 7: File identitas/, "minimisasi data": /^Keamanan 7: File identitas/,
  "qr": /^QR pembayaran: statis/, "konfirmasi": /^QR pembayaran: statis/, "ssrf": /^Keamanan 8: SSRF/,
  "otorisasi lawan clearing": /^Kartu virtual: otorisasi/, "hold di ledger": /^Kartu virtual: otorisasi/, "feature flag": /^Kartu virtual: otorisasi/,
  "supply chain": /^Tim dan infra Tahap 4/, "rilis bertahap": /^Tim dan infra Tahap 4/,
};
const idDariJudul = (re: RegExp): string => {
  const cocok = HALAMAN.filter((h) => !h.lama && !h.lebur_ke && re.test(h.judul));
  if (cocok.length !== 1) throw new Error(`registry: ${re} cocok ${cocok.length} halaman`);
  return cocok[0]!.id;
};

describe("tabel konsep: tautan diturunkan dari kolom konsep naskah dan judul registry", () => {
  test("tujuh baris dengan fitur yang sama dengan naskah", () => {
    expect(baris2).toHaveLength(tabelNaskah.length);
    expect(baris2.map((b) => b[0])).toEqual(tabelNaskah.map((n) => n[0]));
  });
  test("tiap konsep naskah punya padanan di kamus, dan himpunan ID di baris = himpunan ID dari judul registry", () => {
    tabelNaskah.forEach((n, i) => {
      const butir = n[4]!.split(";").map((s) => s.trim().toLowerCase());
      const harapan = new Set(butir.map((k) => {
        expect(KONSEP_KE_JUDUL[k], `konsep naskah tanpa padanan: ${k}`).toBeDefined();
        return idDariJudul(KONSEP_KE_JUDUL[k]!);
      }));
      expect(new Set(idDalam(baris2[i]![1]!)), `baris ${i + 1} (${n[0]})`).toEqual(harapan);
    });
  });
  test("label tautan menyebut konsep naskah baris itu, dan semua [[ID]] ada di registry dan menunjuk Tahap 4 atau yang lebih awal", () => {
    tabelNaskah.forEach((n, i) => {
      const label = [...baris2[i]![1]!.matchAll(/\[\[[^\]|\\]+\\?\|([^\]]+)\]\]/g)].map((m) => m[1]!.toLowerCase()).join(" ");
      const butir = n[4]!.split(";").map((s) => s.trim().toLowerCase());
      for (const k of butir.filter((x) => !["konfirmasi", "insider", "mcp", "audit log berantai hash"].includes(x))) {
        const dasar = k.replace(" lawan clearing", "").replace("berantai hash", "");
        expect(label, `baris ${i + 1}: label tanpa ${k}`).toContain(dasar.split(" ")[0]!);
      }
    });
    for (const id of new Set(idDalam(mdx))) expect(Number(per(id).tahap)).toBeLessThanOrEqual(4);
  });
  test("halaman fitur Tahap 4 hanya dua (halaman ini dan top-up dengan verifikasi); kartu, back office, dan merchant luar tidak punya halaman fitur", () => {
    const fiturT4 = HALAMAN.filter((h) => h.tahap === 4 && h.jenis === "fitur").map((h) => h.id);
    expect(fiturT4).toEqual(["t4-fitur-teknis", "t4-topup-verifikasi"]);
    const judul = fiturT4.map((id) => per(id).judul).join(" ").toLowerCase();
    for (const k of ["kartu", "back office", "merchant"]) expect(judul).not.toContain(k);
    expect(per("t4-topup-verifikasi").judul).toBe("Fitur: top-up dari bank dan verifikasi identitas");
    expect(blokTabel).toContain("Kartu, back office, dan merchant luar tidak punya halaman fitur sendiri di Tahap 4.");
    expect(blokKonsep).toContain("Halaman fitur berikutnya, [[t4-topup-verifikasi]], membahas top-up dari bank dan verifikasi identitas.");
    expect(naskahBaris.find((b) => b.startsWith("| 4.3 |"))).toContain("Fitur: top-up dari bank dan verifikasi identitas");
  });
  test("penutup konsep: dua masalah lain dari naskah bagian 3 (M31 dan M37), M33 sengaja tidak disebut, dan ADR 37 dari registry", () => {
    const kalimat = naskahBaris.find((b) => b.includes("Pola ini muncul lagi di layanan verifikasi"))!;
    expect([...kalimat.matchAll(/\(M(\d+)\)/g)].map((m) => Number(m[1]))).toEqual([31, 33, 37]);
    expect(kalimat).toContain("PostgreSQL tetap satu-satunya source of truth, dan pihak ketiga hanya memberi klaim");
    expect(kalimat).toContain("atau lewat Idempotency-Key sesudah service pembayaran terpisah (ADR 37)");
    const paragraf = blokKonsep.split("\n").find((b) => b.startsWith("Pola kabar dari luar muncul lagi"))!;
    expect(idDalam(paragraf)).toEqual([idDariJudul(/^M31:/), idDariJudul(/^M37:/)]);
    expect(idDalam(paragraf)).not.toContain(idDariJudul(/^M33:/));
    expect(per("t4-m31").judul).toContain("tertahan");
    expect(per("t4-m37").judul).toContain("Kartu virtual");
    expect(per("t4-modul").adr).toEqual([37]);
    expect(blokKonsep).toContain("[[t4-modul|ADR 37]]");
    expect(paragraf).toContain("pihak luar hanya memberi klaim");
  });
});

// ---- pertanyaan ------------------------------------------------------------------------------------------------------
describe("pertanyaan pertama Tahap 4 dan klaim dokumentasi gateway", () => {
  test("tiga syarat dan pemiliknya sama dengan naskah bagian 3, urut, dengan satu penyesuaian kata", () => {
    expect(syaratNaskah).toHaveLength(3);
    const pemilik = syaratNaskah.map((b) => b.match(/\(syarat ([A-Za-z ]+?)[,)]/)![1]!);
    expect(pemilik).toEqual(["Pak Hadi", "Laras", "Direksi"]);
    const di = blokTanya.split("\n").filter((b) => /^\d\. /.test(b));
    expect(di).toHaveLength(3);
    const nama = ["Pak Hadi", "Laras", "Direksi"];
    syaratNaskah.forEach((b, i) => {
      const isi = b.replace(/^\d\. /, "").replace(/ \(syarat [^)]+\)\.$/, ".")
        .replace("tanda tangan atas byte mentah", "tanda tangan atas isi kiriman persis seperti diterima (byte mentah)");
      expect(di[i]).toBe(`${i + 1}. ${isi} Ini syarat ${nama[i]}.`);
    });
    expect(naskahTeks).toContain("Tiga hal harus selalu benar:");
    expect(blokTanya).toContain("Tiga hal harus selalu benar, dan masing-masing punya pemiliknya:");
  });
  test("rumusan pertanyaan, contoh Budi, dan lima keadaan kabar sama dengan naskah", () => {
    expect(naskahTeks).toContain("kabar dari luar adalah klaim, bukan fakta");
    expect(naskahTeks).toContain("\"Budi mengisi Rp200.000 dari rekening banknya\" berarti uang masuk karena **kabar dari gateway**");
    expect(naskahTeks).toContain("Kabar itu bisa datang dua kali, terlambat, tidak berurutan, palsu, atau tidak datang sama sekali.");
    expect(naskahTeks).toContain("Cara pertama yang ditulis tim memperlakukannya sebagai fakta, dan itu bagian 3.");
    expect(blokTanya).toContain(`"Budi mengisi ${rp(200000)} dari rekening banknya" berarti uang masuk karena kabar dari gateway, bukan karena Rekeningo melihat bank.`);
    expect(blokTanya).toContain("Kabar itu berupa webhook: HTTP request yang dikirim gateway ke API Rekeningo saat pembayaran berhasil.");
    const glosarium = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; d: string }[];
    expect(glosarium.find((g) => g.t === "Webhook")!.d).toBe("HTTP request yang dikirim sistem lain ke API kita saat ada kejadian, mis. pembayaran berhasil.");
    expect(glosarium.find((g) => g.t === "Gateway pembayaran")!.d).toContain("menerima pembayaran dari rekening bank");
    expect(blokTanya).toContain("Klaim di sini berarti pernyataan yang belum terbukti, bukan klaim baris outbox di Tahap 3.");
    expect(blokTanya).toContain("Kabar itu bisa datang dua kali, terlambat, tidak berurutan, palsu, atau tidak datang sama sekali.");
    expect(blokTanya).toContain("lahir pertanyaan pertama Tahap 4, sebelum satu baris kode ditulis: kabar dari luar adalah klaim, bukan fakta.");
    expect(blokTanya).toContain("Rekeningo tidak bisa membuat gateway ikut COMMIT atau ROLLBACK.");
  });
  test("klaim dokumentasi: tanggal akses halaman sama dengan baris riset, dan baris riset memuat tiga kutipan", () => {
    const baris = riset.split("\n").find((b) => b.startsWith("| R4-115 "))!;
    expect(baris, "baris riset halaman ini tidak ada").toBeDefined();
    const tgl = blokTanya.match(/\(dibuka (\d{4}-\d{2}-\d{2})\)/)![1]!;
    expect(baris).toContain(`dibuka ${tgl}`);
    expect(baris).toContain("docs.stripe.com/webhooks");
    expect(baris).toContain("might occasionally receive the same event more than once");
    expect(baris).toContain("doesn't guarantee the delivery of events in the order");
    expect(baris).toContain("an attacker could send fake webhook events");
    // satu hari toleransi: tanggal akses ditulis menurut WITA, sedangkan CI dan new Date() memakai UTC
    expect(tgl <= new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)).toBe(true);
    expect(tgl >= riset.match(/Semua tautan dibuka (\d{4}-\d{2}-\d{2})/)![1]!).toBe(true);
    expect(blokTanya).toContain("Dokumentasi satu gateway pembayaran nyata (dibuka " + tgl + ") menulis tiga di antaranya. Event bisa diterima lebih dari sekali, pengirimannya tidak dijamin berurutan, dan tanpa verifikasi penyerang bisa mengirim kabar palsu.");
  });
  test("rujukan: cara pertama keliru dibahas di bagian 3 (satu-satunya halaman bagian 3 bukan skema), kejadiannya di M29, PRD di 4.1", () => {
    const bagian3 = HALAMAN.filter((h) => h.tahap === 4 && h.bagian === 3).map((h) => h.id);
    expect(bagian3).toContain("t4-dua-arah");
    expect(per("t4-dua-arah").judul).toContain("Dua arah ke pihak ketiga");
    expect(per("t4-m29").judul).toBe("M29: Top-up Budi masuk dua kali");
    expect(blokTanya).toContain("Alasannya dibahas di [[t4-dua-arah]], dan kejadiannya, top-up Budi yang masuk dua kali, di [[t4-m29]].");
    expect(blokTanya).toContain("Tiga pertanyaan terbuka PRD v4 yang ikut menentukan jawabannya ada di [[t4-prd]].");
    expect(naskahTeks).toContain("**Pertanyaan terbuka di PRD.**");
    expect(naskahTeks).toContain("Ketiganya tidak dijawab PRD dan menjadi masalah terbesar Tahap 4");
  });
});

// ---- kartu pilah ------------------------------------------------------------------------------------------------------
// item pilah → [kolom naskah (1 app, 2 backend, 3 database), indeks baris naskah, potongan teks naskah], atau "luar"
const SUMBER_ITEM: ([number, number, string] | "luar")[] = [
  [1, 2, "Ambil foto kartu dan swafoto"],
  "luar",
  [2, 1, "terima webhook"],
  [3, 1, "`webhook_event`"],
  [1, 3, "layar konfirmasi nama merchant"],
  [2, 4, "dana tertahan"],
  "luar",
  [3, 1, "`topup_bank`"],
  [1, 1, "tampilkan tujuan bayar dan status"],
  [2, 1, "cek status"],
];
describe("kartu pilah: jawaban dari kolom naskah dan klaim dari rekaman", () => {
  const bagianR = (baris: string[], kode: string): string => bagianRekaman(baris, kode).join("\n");
  test("sepuluh kartu, empat kelompok (tiga kolom naskah dan pihak luar), dan blok Coba menyebut jumlahnya", () => {
    expect(pilah.item).toHaveLength(SUMBER_ITEM.length);
    expect(pilah.kelompok).toEqual(["App", "Backend", "Database", "Pihak luar"]);
    expect(blokCoba).toContain(`${huruf1(kata(pilah.item.length))} pekerjaan dari PRD v${v}.`);
    expect(blokCoba).toContain('src="data/t4-fitur-pilah.json"');
    expect(blokCoba).toContain("Nama endpoint, tabel, dan status berasal dari Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) api-t4, dan jadwal ulangan gateway dari lab t4-webhook. Gateway dan layanan verifikasi adalah tiruan lokal.");
    expect(pilah.judul).toBe(`PRD v${v}: pekerjaan ini milik siapa?`);
    for (const n of [1, 2, 3]) expect(pilahLama(n).kelompok).toEqual(pilah.kelompok.slice(0, 3));
    expect(pilah.penutup).toContain("Pembagian tiga tempat dari Tahap 1 sampai 3 masih berlaku di Tahap 4.");
    expect(pilah.penutup).toContain("tempat keempat, pihak luar");
  });
  test("kelompok jawaban tiap kartu = kolom naskah yang memuat pekerjaannya; kartu pihak luar tidak ada di kolom naskah mana pun", () => {
    pilah.item.forEach((it, i) => {
      const s = SUMBER_ITEM[i]!;
      if (s === "luar") {
        expect(it.jawab, `kartu ${i + 1}`).toBe(3);
        return;
      }
      expect(tabelNaskah[s[1]]![s[0]]!.toLowerCase(), `kartu ${i + 1}`).toContain(s[2].toLowerCase());
      expect(it.jawab, `kartu ${i + 1}`).toBe(s[0] - 1);
    });
    const hitung = [0, 1, 2, 3].map((g) => pilah.item.filter((it) => it.jawab === g).length);
    expect(hitung).toEqual([3, 3, 2, 2]);
    expect(pilah.item.map((it) => it.jawab)).toEqual([0, 3, 1, 2, 0, 1, 3, 2, 0, 1]);
    expect(JSON.stringify(tabelNaskah)).not.toContain("Pihak luar");
  });
  test("endpoint di penjelasan kartu ada di openapi.yaml lab api-t4", () => {
    const sebut = pilah.item.flatMap((it) => [...it.kenapa.matchAll(/\b(GET|POST|PATCH|PUT|DELETE) (\/[\w{}/-]*[\w}])/g)].map((m) => `${m[1]} ${m[2]}`));
    expect(sebut).toEqual(["POST /verifikasi", "POST /webhooks/pembayaran", "GET /qr/{id}", "POST /topup-bank", "GET /topup-bank/{id}"]);
    for (const e of sebut) expect(endpoint.has(e), e).toBe(true);
  });
  test("kartu foto: verifikasi.txt bagian B menyimpan kunci objek dan checksum, bukan isi file, dan dua file dikirim ke POST /verifikasi", () => {
    const b = bagianR(verifikasi, "B");
    expect(b).toContain("POST /verifikasi");
    expect(b).toContain('"berkas_kartu"');
    expect(b).toContain('"berkas_swafoto"');
    expect(b).toContain("Database hanya menyimpan kunci objek dan checksum (SHA-256)");
    expect(pilah.item[0]!.kenapa).toContain("database hanya menyimpan kunci objek dan checksum, bukan isi file (verifikasi.txt bagian B)");
  });
  test("kartu ulangan gateway: jadwal 2, 10, 30, 90, 210 menit dari retry.txt A, dan README lab menulis asalnya", () => {
    const a = bagianR(retry, "A");
    expect(a).toContain("jeda antar percobaan (sejak percobaan sebelumnya): 2, 10, 30, 90, 210 menit");
    expect(pilah.item[1]!.kenapa).toContain("jeda 2, 10, 30, 90, dan 210 menit");
    expect(pilah.item[1]!.kenapa).toContain("(retry.txt bagian A di lab t4-webhook)");
    const baris = readmeWebhook.split("\n").find((b) => b.includes("Jadwal ulangan per kode status, jeda 2, 10, 30, 90, 210 menit"))!;
    expect(baris).toContain("dokumentasi satu gateway nyata");
    expect(pilah.item[1]!.kenapa).toContain("jadwal yang meniru dokumentasi satu gateway nyata");
  });
  test("kartu tanda tangan: tiga penolakan 401 dari topup.txt bagian E", () => {
    const e = bagianR(topup, "E");
    expect(e).toContain("tanpa tanda tangan: 401");
    expect(e).toContain("isi diubah sesudah ditandatangani (jumlah x10): 401");
    expect(e).toContain("timestamp 400 detik lalu (toleransi 300 detik, Asumsi): 401");
    const k = pilah.item[2]!.kenapa;
    expect(k).toContain("kabar tanpa tanda tangan, dengan isi yang diubah, dan dengan timestamp 400 detik lalu sama-sama dijawab 401");
    expect(k).toContain("(topup.txt bagian E)");
  });
  test("kartu event_id dan jumlah: kunci utama dan CHECK dari ERD, ditolak di skema.txt bagian E", () => {
    const webhook = erd4.tabel.find((t) => t.nama === "webhook_event")!;
    expect(webhook.pk).toEqual(["event_id"]);
    const topupTabel = erd4.tabel.find((t) => t.nama === "topup_bank")!;
    expect(topupTabel.cek.find((c) => c.nama === "topup_bank_jumlah_check")!.ekspresi).toBe("jumlah > 0");
    const e = bagianR(skema, "E");
    expect(e).toContain("duplicate key value violates unique constraint \"webhook_event_pkey\"");
    expect(e).toContain("SQLSTATE 23505 · constraint webhook_event_pkey");
    expect(e).toContain("INSERT INTO topup_bank (akun_id, order_id, jumlah, kedaluwarsa_pada) VALUES (419, 'X', 0, now())");
    expect(e).toContain("SQLSTATE 23514 · constraint topup_bank_jumlah_check");
    expect(pilah.item[3]!.kenapa).toContain("event_id adalah kunci utama tabel webhook_event. INSERT kedua dengan event_id yang sama ditolak dengan SQLSTATE 23505, apa pun yang dikirim backend (skema.txt bagian E).");
    expect(pilah.item[7]!.kenapa).toContain("CHECK (jumlah > 0) di tabel topup_bank menolak barisnya. Di rekaman lab, INSERT dengan jumlah 0 ditolak dengan SQLSTATE 23514 (skema.txt bagian E).");
  });
  test("kartu QR dan kartu hold: GET /qr/{id} menjawab nama merchant (fitur.txt A), otorisasi Rp80.000 ditahan dengan jurnal tahan (fitur.txt C)", () => {
    const a = bagianR(fitur, "A");
    expect(a).toContain("GET '/qr/<qr 1>'");
    expect(a).toContain('"merchant":{"nama":"Toko Sumber Rejeki"}');
    const c = bagianR(fitur, "C");
    expect(c).toContain('"jumlah":80000');
    expect(c).toMatch(/ditahan \| 80000\s+\| t/);
    expect(c).toContain("(1 row)");
    expect(c).toContain("dana_tertahan");
    expect(pilah.item[4]!.kenapa).toContain("GET /qr/{id} (fitur.txt bagian A)");
    expect(pilah.item[5]!.kenapa).toContain(`otorisasi ${rp(80000)} yang disetujui meninggalkan satu baris berstatus ditahan dengan jurnal tahan (fitur.txt bagian C)`);
    expect(pilah.item[5]!.kenapa).toContain("Persetujuan yang sudah dikirim ke penerbit tidak bisa ditarik kembali");
    expect(naskahTeks).toContain("persetujuan sudah diberikan dan tidak bisa ditarik");
  });
  test("kartu verifikasi: jawaban lulus menaikkan tingkat akun (verifikasi.txt C), layanan verifikasi tiruan", () => {
    const c = bagianR(verifikasi, "C");
    expect(c).toContain('"status":"lulus"');
    expect(c).toContain('"tingkat":"terverifikasi"');
    expect(c).toContain("memanggil layanan verifikasi (Idempotency-Key = id pengajuan), tingkat akun naik");
    expect(pilah.item[6]!.kenapa).toContain("jawaban lulus menaikkan tingkat akun (verifikasi.txt bagian C)");
    expect(baca("labs/api-t4/README.md")).toContain("Layanan verifikasi tiruan (`cmd/tiruan -peran verifikasi`)");
  });
  test("kartu tujuan bayar dan job: topup.txt bagian A dan H, dan batas umur bawaan 30 menit adalah Asumsi", () => {
    const a = bagianR(topup, "A");
    expect(a).toContain('"status":"menunggu","tujuan_bayar":"<tujuan bayar>"');
    expect(topup.join("\n")).toContain("GET '/topup-bank/1'");
    const h = bagianR(topup, "H");
    expect(h).toContain("bawaan -cek-umur 30m (Asumsi)");
    expect(h).toContain("dikredit 1");
    expect(pilah.item[8]!.kenapa).toContain("Jawaban POST /topup-bank memuat tujuan_bayar dan status menunggu (topup.txt bagian A), dan GET /topup-bank/{id} menjawab status top-up milik sendiri.");
    expect(pilah.item[9]!.kenapa).toContain("Ini job di backend. Top-up yang masih menunggu atau tidak pasti sesudah batas umurnya ditanyakan ke gateway, dan kreditnya lewat fungsi yang sama dengan webhook (topup.txt bagian H).");
    expect(h).toContain("top-up menunggu atau tidak_pasti ditanyakan ke gateway, dikredit lewat jurnal yang sama dengan webhook");
  });
  test("semua rekaman yang disebut kartu ada", () => {
    const nama = new Set(pilah.item.flatMap((it) => [...it.kenapa.matchAll(/\((\w+)\.txt bagian/g)].map((m) => m[1]!)));
    expect([...nama].sort()).toEqual(["fitur", "retry", "skema", "topup", "verifikasi"]);
    expect(fs.existsSync(path.join(akar, "labs/api-t4/openapi.yaml"))).toBe(true);
  });
});

// ---- kunci kalimat ----------------------------------------------------------------------------------------------------
// Setiap baris prosa (bukan tabel, bukan JSX, bukan impor) dikunci apa adanya. Nilai yang punya sumber diturunkan; sisanya
// ditulis di sini. Menyisipkan "tidak", menukar kata, atau mengubah tingkat heading menggagalkan tes ini.
describe("kunci kalimat: semua baris prosa halaman", () => {
  const tgl = blokTanya.match(/\(dibuka (\d{4}-\d{2}-\d{2})\)/)![1]!;
  const baru = erd4.selisih.tabel_baru;
  const akunKolom = erd4.selisih.kolom_baru.filter((k) => k.tabel === "akun").map((k) => k.kolom);
  const tumbuh = timNaskah.match(/Tim tumbuh dari (\d+) menjadi (\d+) orang dalam tiga tim selama (\d+) minggu/)!;
  const daftarTim = timRegex.map((t) => `- Tim ${t.nama} (${kata(t.n)} orang, dipimpin ${t.pemimpin}) memegang ${t.tugas.replace("; Raka memegang", ". Raka memegang")}.`);
  const syarat = syaratNaskah.map((b, i) => `${i + 1}. ${b.replace(/^\d\. /, "").replace(/ \(syarat [^)]+\)\.$/, ".").replace("tanda tangan atas byte mentah", "tanda tangan atas isi kiriman persis seperti diterima (byte mentah)")} Ini syarat ${["Pak Hadi", "Laras", "Direksi"][i]}.`);
  const HARAP = [
    "## Inti",
    `PRD v${v} menambah ${kata(baru.length)} tabel, dari ${erd3.tabel.length} menjadi ${erd4.tabel.length}. Pekerjaan yang membuka Tahap 4 terjadi di luar database: menerima kabar dari gateway pembayaran.`,
    `${huruf1(kata(baru.length))} tabel baru ada di skema lab api-t4, dari \`${baru[0]}\` sampai \`${baru[baru.length - 1]}\`. Tabel \`akun\` bertambah kolom \`${akunKolom[0]}\` dan \`${akunKolom[1]}\`.`,
    `Baris kedua dari ${kata(tabelNaskah.length)} baris pekerjaan di bawah, ${tabelNaskah[1]![0]!.toLowerCase()}, menyentuh dua tempat sekaligus. PostgreSQL bisa COMMIT atau ROLLBACK sebagai satu unit, tetapi gateway tidak ikut unit itu. Dari baris itu lahir pertanyaan pertama Tahap 4.`,
    `${huruf1(kata(pilah.item.length))} pekerjaan dari PRD v${v}. Pilah masing-masing ke tempat yang mengerjakannya, lalu periksa jawabanmu. Nama endpoint, tabel, dan status berasal dari Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) api-t4, dan jadwal ulangan gateway dari lab t4-webhook. Gateway dan layanan verifikasi adalah tiruan lokal.`,
    "Ini tabel yang tim tulis sebelum satu baris kode Tahap 4 ada. Tiga belas developer dalam tiga tim membagi pekerjaannya.",
    ...daftarTim,
    `Jumlah orang dan pembagian timnya adalah Asumsi: angka cerita tanpa rekaman, dengan arti label di [Label sumber](/cara-pakai/#label-sumber). Tim tumbuh dari ${kata(Number(tumbuh[1]))} menjadi ${tumbuh[2]} orang selama ${tumbuh[3]} minggu.`,
    "Tabel `akun` juga bertambah nilai jenis `pemakai`, `merchant`, dan `risk`. Tabel `outbox` bertambah kolom `tujuan`, dan tabel `produk` bertambah kolom `gambar_url`.",
    "Nama tabel dan kolom di tabel ini ada di skema lab api-t4 (`skema.txt` dan ERD Tahap 4), dan nama endpoint ada di contract OpenAPI `labs/api-t4/openapi.yaml`. Di luar itu isi tabel adalah rencana kerja tim, bukan hasil ukur.",
    "Tidak dijalankan: PostgreSQL terkelola, penyimpanan objek, dan secret manager milik penyedia hanya dijelaskan di halaman Tahap 4. Lab memakai tiruan lokal di Compose.",
    "Kartu, back office, dan merchant luar tidak punya halaman fitur sendiri di Tahap 4. Barisnya di tabel ini sudah cukup, lalu halaman konsep di bawah yang membahas isinya.",
    `Tabel itu memaksa satu pertanyaan sebelum editor dibuka. "Budi mengisi ${rp(200000)} dari rekening banknya" berarti uang masuk karena kabar dari gateway, bukan karena Rekeningo melihat bank. Kabar itu berupa webhook: HTTP request yang dikirim gateway ke API Rekeningo saat pembayaran berhasil.`,
    `Kabar itu bisa datang dua kali, terlambat, tidak berurutan, palsu, atau tidak datang sama sekali. Dokumentasi satu gateway pembayaran nyata (dibuka ${tgl}) menulis tiga di antaranya. Event bisa diterima lebih dari sekali, pengirimannya tidak dijamin berurutan, dan tanpa verifikasi penyerang bisa mengirim kabar palsu.`,
    "Rekeningo tidak bisa membuat gateway ikut COMMIT atau ROLLBACK. Tiga hal harus selalu benar, dan masing-masing punya pemiliknya:",
    ...syarat,
    "Dari tiga syarat itu lahir pertanyaan pertama Tahap 4, sebelum satu baris kode ditulis: kabar dari luar adalah klaim, bukan fakta. Klaim di sini berarti pernyataan yang belum terbukti, bukan klaim baris outbox di Tahap 3. Karena itu klaim dicek lebih dulu, lalu dicatat satu kali. Bagaimana satu kabar dari gateway menghasilkan tepat satu jurnal, padahal kabar itu bisa datang dua kali, terlambat, atau tidak datang sama sekali?",
    "Cara pertama yang ditulis tim memperlakukan kabar itu sebagai fakta, dan ternyata keliru. Alasannya dibahas di [[t4-dua-arah]], dan kejadiannya, top-up Budi yang masuk dua kali, di [[t4-m29]]. Tiga pertanyaan terbuka PRD v4 yang ikut menentukan jawabannya ada di [[t4-prd]].",
    "Tabel ini menyebut konsep untuk tiap fitur. Sebagian baru, sebagian dari Tahap 1 sampai 3 yang dipakai lagi. Tahap 4 membahas yang baru satu per satu, saat masalahnya muncul.",
    "Pola kabar dari luar muncul lagi di dua masalah lain. Jawaban layanan verifikasi ([[t4-m31]]) dan permintaan otorisasi dari penerbit kartu ([[t4-m37]]) juga klaim yang dicek sebelum dipercaya. Aturan Tahap 4 sama untuk ketiganya: PostgreSQL tetap satu-satunya source of truth, dan pihak luar hanya memberi klaim.",
    "Klaim itu dicek, lalu dicatat sekali. Selama semuanya satu proses, pencatatannya satu transaction dengan efeknya. Sesudah service pembayaran terpisah ([[t4-modul|ADR 37]]), pencatatannya lewat Idempotency-Key.",
    "Halaman fitur berikutnya, [[t4-topup-verifikasi]], membahas top-up dari bank dan verifikasi identitas.",
  ];
  const prosa = (): string[] => mdx.split("---").slice(2).join("---").split("\n")
    .filter((b) => b.trim() && !b.startsWith("|") && !b.startsWith("<") && !b.startsWith("import "));
  test("baris prosa halaman sama dengan daftar kunci, urut", () => {
    expect(prosa()).toEqual(HARAP);
  });
  test("baris JSX: pembuka dan penutup lima blok, Rantai ringkas, widget pilah, dan SkripLama", () => {
    const jsx = mdx.split("\n").filter((b) => b.startsWith("<") && !b.startsWith("<p class=\"meta\""));
    expect(jsx).toEqual([
      '<Blok nama="Mulai" buka>',
      "<Rantai data={tabelBaru} ringkas />",
      "</Blok>",
      '<Blok nama="Coba dulu: di mana pekerjaannya?" buka aman="Kalau berhenti di sini, kamu sudah tahu: layar ada di app, aturan uang ada di backend, database menolak data yang melanggar aturannya, dan sebagian pekerjaan dikerjakan pihak luar.">',
      '<WidgetLama nama="pilah" src="data/t4-fitur-pilah.json" />',
      "</Blok>",
      '<Blok nama="Dari fitur ke pekerjaan">',
      "</Blok>",
      '<Blok nama="Pertanyaan sebelum kode">',
      "</Blok>",
      '<Blok nama="Konsep yang akan dibutuhkan">',
      "</Blok>",
      '<SkripLama daftar={["pilah"]} />',
    ]);
    expect(mdx).toContain('import tabelBaru from "../../../../data/diagram/t4-fitur-tabel.json";');
    expect(mdx).toContain('import SkripLama from "../../../components/SkripLama.astro";');
    expect(mdx).toContain('import WidgetLama from "../../../components/WidgetLama.astro";');
  });
});


// ---- turunan tambahan: yang lolos putaran mutasi tanpa kunci kalimat --------------------------------------------------------
describe("turunan tambahan: heading, JSX, label, istilah, dan nomor tahap", () => {
  test("heading Inti tingkat dua dan Rantai Inti selalu ringkas (aturan Inti hasil-dulu); SkripLama menghidupkan tiap WidgetLama", () => {
    expect(blokMulai).toMatch(/\n## Inti\n/);
    expect(blokMulai).toContain("<Rantai data={tabelBaru} ringkas />");
    const nama = [...mdx.matchAll(/<WidgetLama nama="([a-z-]+)"/g)].map((m) => m[1]!);
    const skrip = mdx.match(/<SkripLama daftar=\{\[([^\]]*)\]\} \/>/);
    expect(skrip, "SkripLama tidak dipasang").not.toBeNull();
    const daftar = [...skrip![1]!.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]!);
    expect(nama).toEqual(["pilah"]);
    expect(new Set(daftar)).toEqual(new Set(nama));
  });
  test("label sumber: tim adalah Asumsi (naskah menulis Asumsi cerita), bukan Rekaman lab; Tidak dijalankan untuk layanan terkelola", () => {
    expect(timNaskah).toContain("(Asumsi cerita)");
    expect(blokTabel).toContain("Jumlah orang dan pembagian timnya adalah Asumsi: angka cerita tanpa rekaman");
    expect(blokTabel.split("\n").find((b) => b.startsWith("Jumlah orang"))).not.toContain("Rekaman lab");
    expect(blokTabel).toContain("Tidak dijalankan: PostgreSQL terkelola");
    expect(blokTanya).toContain("Dokumentasi satu gateway pembayaran nyata (dibuka");
  });
  test("kalimat pembuka paragraf yang tidak punya sumber turunan, persis", () => {
    expect(blokTabel).toContain("Ini tabel yang tim tulis sebelum satu baris kode Tahap 4 ada.");
    expect(blokTabel).toContain("Nama tabel dan kolom di tabel ini ada di skema lab api-t4 (`skema.txt` dan ERD Tahap 4), dan nama endpoint ada di contract OpenAPI `labs/api-t4/openapi.yaml`.");
    expect(blokTabel).toContain("Di luar itu isi tabel adalah rencana kerja tim, bukan hasil ukur.");
    expect(blokTanya).toContain("Tabel itu memaksa satu pertanyaan sebelum editor dibuka.");
    expect(blokTanya).toContain("Dari tiga syarat itu lahir pertanyaan pertama Tahap 4, sebelum satu baris kode ditulis:");
    expect(blokTanya).toContain("Karena itu klaim dicek lebih dulu, lalu dicatat satu kali.");
    expect(blokTanya).toContain("Cara pertama yang ditulis tim memperlakukan kabar itu sebagai fakta, dan ternyata keliru.");
    expect(blokKonsep).toContain("Tabel ini menyebut konsep untuk tiap fitur. Sebagian baru,");
    expect(blokKonsep).toContain("Klaim itu dicek, lalu dicatat sekali. Selama semuanya satu proses,");
  });
  test("istilah yang dikunci naskah: source of truth dan Idempotency-Key dipakai persis, bukan padanan", () => {
    expect(naskahTeks).toContain("PostgreSQL tetap satu-satunya source of truth");
    expect(naskahTeks).toContain("lewat Idempotency-Key sesudah service pembayaran terpisah");
    expect(blokKonsep).toContain("PostgreSQL tetap satu-satunya source of truth");
    expect(blokKonsep).toContain("pencatatannya lewat Idempotency-Key.");
    expect(blokKonsep).toContain("satu transaction dengan efeknya");
  });
  test("nomor tahap dan versi PRD: Tahap 4 sembilan kali, Tahap 3 sekali (outbox), Tahap 1 sekali (kisaran 1 sampai 3), PRD hanya v4", () => {
    const badan = mdx.split("---").slice(2).join("---").replace(/^import .*$/gm, "");
    const hitung: Record<string, number> = {};
    for (const m of badan.matchAll(/Tahap (\d)/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    expect(hitung).toEqual({ "1": 1, "3": 1, "4": 9 });
    expect([...badan.matchAll(/PRD v(\d+)/g)].map((m) => m[1])).toEqual([v, v, v]);
    expect(blokKonsep).toContain("sebagian dari Tahap 1 sampai 3 yang dipakai lagi");
    expect(blokTanya).toContain("bukan klaim baris outbox di Tahap 3");
  });
});

// ---- kunci tambahan: judul kolom, label tautan, menit baca, deskripsi, subjudul diagram, dan seluruh teks kartu ----------------
describe("kunci tambahan: bagian yang tidak diturunkan dari satu sumber", () => {
  test("judul kolom kedua tabel dan pemisahnya", () => {
    expect(blokTabel).toContain("| Fitur | Di app | Di backend | Di database |\n|---|---|---|---|\n| PT berdiri sendiri |");
    expect(blokKonsep).toContain("| Fitur | Konsep |\n|---|---|\n| PT berdiri sendiri |");
    expect(tabelNaskah.map((n) => n[0])).toEqual(["PT berdiri sendiri", "Top-up dari bank", "Verifikasi identitas", "QR merchant luar", "Kartu virtual", "Back office tim risk", "13 engineer, tiga tim"]);
  });
  test("label tautan tiap baris tabel konsep, persis", () => {
    const harap: string[] = [
  "[[t4-modul\\|Modular monolith dan CODEOWNERS]], [[t4-infra-secret\\|IaC dan secret manager]], [[t4-audit\\|audit log]]",
  "[[t4-webhook\\|Webhook masuk]], [[t2-idempotency\\|idempotensi]], [[t4-breaker\\|retry dan circuit breaker]], [[t4-rekonsiliasi\\|rekonsiliasi]]",
  "[[t4-storage\\|Object storage, presigned URL, dan minimisasi data]], [[t4-breaker\\|queue per vendor]]",
  "[[t4-qr\\|QR dan layar konfirmasi]], [[t4-ssrf\\|SSRF]]",
  "[[t4-kartu\\|Otorisasi lawan clearing, hold di ledger, dan feature flag]]",
  "[[t4-audit\\|Audit log berantai hash, insider, dan MCP]]",
  "[[t4-modul\\|Modular monolith]], [[t4-tim-infra\\|supply chain dan rilis bertahap]]"
];
    expect(baris2.map((b) => b[1])).toEqual(harap);
    expect(baris2.every((b) => b.length === 2)).toBe(true);
  });
  test("menit baca di baris meta = menit di registry, dan deskripsi persis", () => {
    const m = mdx.match(/Baca (\d+) menit · coba (\d+) menit/)!;
    expect(Number(m[1]) + Number(m[2])).toBe((per("t4-fitur-teknis") as unknown as { menit: number }).menit);
    expect(mdx.match(/^description: (.+)$/m)![1]).toBe(`Raka, Nadia, Wulan, dan Bayu menurunkan PRD v${v} jadi pekerjaan di app, backend, dan database, lalu menulis pertanyaan pertama Tahap 4 sebelum kode.`);
    expect(mdx.match(/^title: (.+)$/m)![1]).toBe('"4.2 Dari fitur ke pekerjaan teknis v4"');
  });
  test("diagram: id dan subjudul baris", () => {
    expect(rantai.id).toBe("t4-fitur-tabel");
    expect(rantai.baris.map((b) => b.sub)).toEqual(["jumlah tabel di skema lab", "satu top-up"]);
  });
  test("kartu pilah: teks dan penjelasan sepuluh kartu serta penutup, persis", () => {
    const harap: [string, string][] = [
  [
    "Mengambil foto kartu identitas dan swafoto, lalu mengirimnya",
    "Kamera ada di HP, jadi mengambil dan mengirim kedua foto adalah pekerjaan app. Server menerimanya di POST /verifikasi dan database hanya menyimpan kunci objek dan checksum, bukan isi file (verifikasi.txt bagian B)."
  ],
  [
    "Mengirim kabar bahwa pembayaran sudah diterima, dan mengirimnya lagi bila tidak dijawab 2xx",
    "Pengirimnya gateway, bukan Rekeningo. Rekeningo hanya menerima. Gateway tiruan di lab mengulang dengan jeda 2, 10, 30, 90, dan 210 menit, jadwal yang meniru dokumentasi satu gateway nyata (retry.txt bagian A di lab t4-webhook)."
  ],
  [
    "Memeriksa tanda tangan atas byte mentah kabar dari gateway sebelum JSON diurai",
    "Pemeriksaan ada di handler POST /webhooks/pembayaran. Di rekaman lab api-t4, kabar tanpa tanda tangan, dengan isi yang diubah, dan dengan timestamp 400 detik lalu sama-sama dijawab 401 (topup.txt bagian E)."
  ],
  [
    "Menolak baris kedua dengan event_id yang sama di tabel event webhook",
    "event_id adalah kunci utama tabel webhook_event. INSERT kedua dengan event_id yang sama ditolak dengan SQLSTATE 23505, apa pun yang dikirim backend (skema.txt bagian E)."
  ],
  [
    "Menampilkan nama merchant di layar konfirmasi sebelum pembeli membayar QR",
    "Layar konfirmasi ada di HP pembeli. Nama yang ditampilkan datang dari jawaban server pada GET /qr/{id} (fitur.txt bagian A)."
  ],
  [
    "Menahan dana pemilik kartu sebelum menjawab setuju pada otorisasi",
    "Persetujuan yang sudah dikirim ke penerbit tidak bisa ditarik kembali, jadi backend menahan dana lebih dulu sebagai jurnal di ledger. Di rekaman lab api-t4, otorisasi Rp80.000 yang disetujui meninggalkan satu baris berstatus ditahan dengan jurnal tahan (fitur.txt bagian C)."
  ],
  [
    "Memutuskan apakah pengajuan verifikasi seorang user lulus",
    "Keputusannya datang dari layanan verifikasi, pihak luar yang di lab diperankan proses tiruan lokal. Rekeningo menyimpan hasilnya: jawaban lulus menaikkan tingkat akun (verifikasi.txt bagian C)."
  ],
  [
    "Menolak top-up dengan jumlah nol walau kode backend salah menghitung",
    "CHECK (jumlah > 0) di tabel topup_bank menolak barisnya. Di rekaman lab, INSERT dengan jumlah 0 ditolak dengan SQLSTATE 23514 (skema.txt bagian E)."
  ],
  [
    "Menampilkan tujuan bayar dan status top-up kepada Budi",
    "Layar status ada di app. Jawaban POST /topup-bank memuat tujuan_bayar dan status menunggu (topup.txt bagian A), dan GET /topup-bank/{id} menjawab status top-up milik sendiri."
  ],
  [
    "Menanyakan ke gateway status top-up yang menunggu terlalu lama, lalu menjurnalnya bila sudah dibayar",
    "Ini job di backend. Top-up yang masih menunggu atau tidak pasti sesudah batas umurnya ditanyakan ke gateway, dan kreditnya lewat fungsi yang sama dengan webhook (topup.txt bagian H)."
  ]
];
    expect(pilah.item.map((it) => [it.teks, it.kenapa])).toEqual(harap);
    expect(pilah.penutup).toBe("Pembagian tiga tempat dari Tahap 1 sampai 3 masih berlaku di Tahap 4. Tahap ini menambah tempat keempat, pihak luar, yang tidak bisa Rekeningo COMMIT atau ROLLBACK, dan itu yang membuat pertanyaan pertama Tahap 4 sulit.");
    expect(Object.keys(pilah).sort()).toEqual(["item", "judul", "kelompok", "penutup"]);
    expect(pilah.item.every((it) => Object.keys(it).sort().join() === "jawab,kenapa,teks")).toBe(true);
  });
});

// ---- yang tidak boleh tampil ke pembaca ------------------------------------------------------------------------------------
describe("teks pembaca bersih", () => {
  const semua = [mdx, JSON.stringify(rantai), JSON.stringify(pilah)];
  test("tanpa ID riset (R4-nn), nomor keputusan, dan nomor PR", () => {
    for (const x of semua) {
      expect(x).not.toMatch(/\bR\d-\d+\b/);
      expect(x).not.toMatch(/keputusan \d+|PR #?\d+|#\d{3}/i);
    }
  });
  test("ID halaman hanya di dalam [[...]] (diagram dan kartu tanpa ID)", () => {
    // nama lab ("lab t4-webhook") boleh tampil; yang ditolak adalah ID registri di luar [[...]]
    const tanpaLab = (x: string): string => x.replace(/lab t[1-4]-[a-z]+/g, "");
    for (const x of [JSON.stringify({ ...rantai, id: "" }), JSON.stringify(pilah)]) expect(tanpaLab(x)).not.toMatch(/\b(?:t[1-4]|B\d)-[a-z]|\[\[/);
    expect(tanpaLab(mdx.replace(/\[\[[^\]]+\]\]/g, "").replace(/src="[^"]+"/g, "").replace(/import .*/g, ""))).not.toMatch(/\bt[1-4]-[a-z]/);
    expect(mdx.match(/lab t[1-4]-[a-z]+/g)).toEqual(["lab t4-webhook"]);
  });
  test("satuan byte ditulis lengkap, tanpa emoji, dan tanpa nama merek gateway", () => {
    for (const x of semua) {
      expect(x).not.toMatch(/\d\s?B\b/);
      expect(x).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(x).not.toMatch(/\b(stripe|midtrans|xendit|doku)\b/i);
    }
  });
  test("angka beban Tahap 4 tidak ada di halaman ini (hanya jumlah tabel, tim, dan rekaman)", () => {
    for (const x of semua) {
      expect(x).not.toMatch(/138,9|6,94|0,579|125 menit/);
    }
  });
});
