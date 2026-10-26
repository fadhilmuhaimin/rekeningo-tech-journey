// Penjaga halaman 3.2 (keputusan 1004 sampai 1006): isi tabel pekerjaan, tautan konsep, jumlah tabel, endpoint, dan angka
// di fitur-ke-teknis.mdx, diagram t3-fitur-tabel.json, dan kartu t3-fitur-pilah.json diturunkan dari naskah
// (CERITA-TAHAP-3 bagian 2, 3, dan 4), registry (cerita.json), ERD Tahap 2 dan 3, kontrak openapi.yaml lab api-t3, dan
// rekaman labs/api-t3/output. Tanpa tes ini, mengubah satu tabel, satu endpoint, satu ID tautan, atau satu angka di halaman
// ini tidak menggagalkan build atau alat ukur mana pun, karena halaman ini merangkum halaman dan lab lain. Klaim negatif
// ("tidak punya halaman fitur sendiri") dibatasi pada halaman Tahap 3 di registry.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok } from "./blok";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const mdx = baca("situs/src/content/docs/tahap-3/fitur-ke-teknis.mdx");
const naskahBaris = baca("plan/CERITA-TAHAP-3.md").split("\n");
const riset = baca("plan/RISET-TAHAP-3.md");
const rantai = DataRantai.parse(JSON.parse(baca("situs/data/diagram/t3-fitur-tabel.json")));
const pilah = JSON.parse(baca("situs/lama/widgets/data/t3-fitur-pilah.json")) as {
  kelompok: string[]; item: { teks: string; jawab: number; kenapa: string }[]; penutup: string;
};
const erd = (t: number) => JSON.parse(baca(`situs/data/erd/tahap-${t}.json`)) as {
  tabel: { nama: string; kolom: { nama: string }[]; cek: { nama: string; ekspresi: string }[]; unik: { nama: string }[] }[];
  selisih: { tabel_baru: string[]; kolom_baru: { tabel: string; kolom: string }[] };
};
const erd2 = erd(2);
const erd3 = erd(3);
const skema = baca("labs/api-t3/output/skema.txt").split("\n");
const katalog = baca("labs/api-t3/output/katalog.txt").split("\n");
const web = baca("labs/api-t3/output/web.txt").split("\n");
const openapi = baca("labs/api-t3/openapi.yaml").split("\n");

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
const bagian3 = potong(/^## 3\. Inti teknis Tahap 3/, /^\*\*Versi pertama/);
const syaratNaskah = bagian3.filter((b) => /^\d\. /.test(b));
const naskahTeks = naskahBaris.join("\n");

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
const tabelSkemaA = ((): string[] => {
  const bagian = bagianRekaman(skema, "A");
  const a = bagian.findIndex((b) => b.includes("SELECT table_name"));
  const z = bagian.findIndex((b, i) => i > a && /^\(\d+ rows\)/.test(b));
  return bagian.slice(a + 3, z).map((b) => b.trim());
})();

// ---- registry --------------------------------------------------------------------------------------------------------
describe("registry dan naskah: halaman 3.2", () => {
  test("terdaftar sebagai Fitur → teknis bagian 2, berprasyarat 3.1, ada, dan judul sama dengan peta naskah", () => {
    const h = per("t3-fitur-teknis");
    expect([h.tahap, h.jenis, h.bagian, h.prasyarat, h.ada, h.inti]).toEqual([3, "fitur", 2, ["t3-prd"], true, true]);
    const peta = naskahBaris.find((b) => b.startsWith("| 3.2 |"))!;
    expect(sel(peta).slice(0, 5)).toEqual(["3.2", "2", h.judul, "Fitur → teknis", "★"]);
    expect(mdx).toContain(`title: "3.2 ${h.judul}"`);
    expect(mdx).toContain("Prasyarat: [[t3-prd]]");
  });
  test("lima blok: Mulai dan Coba terbuka, sisanya tertutup", () => {
    expect(daftarBlok(mdx).map((b) => [b.nama, b.buka])).toEqual([
      ["Mulai", true], ["Coba dulu: di mana pekerjaannya?", true], ["Dari fitur ke pekerjaan", false],
      ["Pertanyaan sebelum kode", false], ["Konsep yang akan dibutuhkan", false],
    ]);
  });
  test("tim empat orang dan pembagian peran sama dengan Latar naskah", () => {
    expect(naskahTeks).toContain("Tim jadi empat orang");
    expect(naskahTeks).toContain("Raka memegang app, Nadia dan Bayu memegang backend, Wulan memegang dasbor");
    expect(mdx).toContain(`${huruf1(kata(4))} orang membagi pekerjaannya: Raka di app, Nadia dan Bayu di backend, Wulan di dasbor web.`);
  });
});

// ---- tabel pekerjaan --------------------------------------------------------------------------------------------------
describe("tabel pekerjaan: delapan baris naskah", () => {
  test("delapan baris, fitur dan tiga kolom sama dengan naskah bagian 2 (di luar kelompok kurung)", () => {
    expect(tabelNaskah).toHaveLength(8);
    expect(baris1).toHaveLength(tabelNaskah.length);
    tabelNaskah.forEach((n, i) => {
      expect(baris1[i]![0], `fitur baris ${i + 1}`).toBe(n[0]);
      for (const k of [1, 2, 3]) expect(polos(baris1[i]![k]!), `baris ${i + 1} kolom ${k}`).toBe(polos(n[k]!));
    });
  });
  test("kolom database: nama tabel baru yang disebut sama dengan tabel baru di ERD Tahap 3 lawan Tahap 2", () => {
    const sebut = new Set(baris1.flatMap((b) => [...b[3]!.matchAll(/`([a-z_]+)(?:\.[a-z_]+)?`/g)].map((m) => m[1]!)));
    const lama = new Set(erd2.tabel.map((t) => t.nama));
    const baru = [...sebut].filter((n) => !lama.has(n));
    expect(new Set(baru)).toEqual(new Set(erd3.selisih.tabel_baru));
    expect(erd3.selisih.tabel_baru).toHaveLength(6);
  });
  test("setiap `tabel.kolom` dan tabel di kolom database ada di ERD Tahap 3", () => {
    const tabel = new Map(erd3.tabel.map((t) => [t.nama, new Set(t.kolom.map((k) => k.nama))]));
    for (const b of baris1) {
      for (const m of b[3]!.matchAll(/`([a-z_]+)(?:\.([a-z_]+))?`/g)) {
        expect(tabel.has(m[1]!), `tabel ${m[1]}`).toBe(true);
        if (m[2]) expect(tabel.get(m[1]!)!.has(m[2]), `kolom ${m[1]}.${m[2]}`).toBe(true);
      }
    }
  });
  test("setiap endpoint di tabel ada di openapi.yaml lab api-t3, dan nama tabel `sesi` jenis web ada di skema", () => {
    const sebut = [...blokTabel.matchAll(/`(GET|POST|PATCH|PUT|DELETE) (\/[^`]*)`/g)].map((m) => `${m[1]} ${m[2]}`);
    expect(sebut.length).toBeGreaterThan(0);
    for (const e of sebut) expect(endpoint.has(e), `endpoint ${e}`).toBe(true);
    // dan setiap endpoint dipanggil di salah satu rekaman lab api-t3 (label "rekaman lab" di kartu dan tabel)
    const rekamanSemua = fs.readdirSync(path.join(akar, "labs/api-t3/output")).map((f) => baca(`labs/api-t3/output/${f}`)).join("\n");
    for (const e of sebut) {
      const [metode, jalur] = e.split(" ") as [string, string];
      const pola = new RegExp(`${metode} '?${jalur.replace(/[.]/g, "\\.").replace("{id}", "\\d+")}`);
      expect(rekamanSemua, `rekaman memanggil ${e}`).toMatch(pola);
    }
    expect(erd3.tabel.find((t) => t.nama === "sesi")!.kolom.map((k) => k.nama)).toContain("jenis");
  });
  test("rujukan FCM: tautan dan bentuk permintaan sama dengan sumber di riset (R3-16)", () => {
    const baris = riset.split("\n").find((b) => b.startsWith("| R3-16 "))!;
    expect(baris).toContain("firebase.google.com send/v1-api");
    expect(baris).toContain("messages:send");
    expect(baris).toContain("OAuth 2.0");
    expect(mdx).toContain("(https://firebase.google.com/docs/cloud-messaging/send/v1-api)");
    expect(mdx).toContain("`messages:send`");
    expect(mdx).toContain("`Authorization: Bearer`");
    // versi API dari alamat sumber: semua penyebutan "FCM HTTP vN" di halaman memakai versi itu
    const v = mdx.match(/send\/(v\d+)-api/)![1]!;
    const sebut = [...mdx.matchAll(/FCM HTTP (v\d+)/g)].map((m) => m[1]);
    expect(sebut).toHaveLength(2);
    for (const x of sebut) expect(x).toBe(v);
    expect(riset.split("\n").find((b) => b.startsWith("| R3-16 "))).toContain("firebase.google.com send/v1-api".replace("v1", v));
  });
});

// ---- Inti, diagram, dan angka tabel --------------------------------------------------------------------------------------
describe("Inti dan diagram Rantai: jumlah tabel dari ERD dan rekaman", () => {
  test("kalimat pertama menyebut jumlah tabel baru dari ERD, dan nama tabel baru urut seperti ERD", () => {
    const baru = erd3.selisih.tabel_baru;
    expect(blokMulai).toContain(`PRD v3 menambah ${kata(baru.length)} tabel di database. Pekerjaan yang membuka Tahap 3 terjadi di luar database:`);
    const daftar = blokMulai.match(new RegExp(`${huruf1(kata(baru.length))} tabel baru ada di skema lab api-t3: (.+?)\\.`))![1]!;
    expect([...daftar.matchAll(/`([a-z_]+)`/g)].map((m) => m[1])).toEqual(baru);
  });
  test("kolom baru akun dan sesi serta nilai jenis hr sama dengan selisih ERD", () => {
    const kolom = (t: string): string[] => erd3.selisih.kolom_baru.filter((k) => k.tabel === t).map((k) => k.kolom);
    expect(kolom("akun")).toEqual(["kota_id"]);
    expect(kolom("sesi")).toEqual(["jenis", "csrf_hash"]);
    const jenis = erd3.tabel.find((t) => t.nama === "akun")!.cek.find((c) => c.nama === "akun_jenis_check")!.ekspresi;
    expect(jenis).toContain("'hr'");
    expect(erd2.tabel.find((t) => t.nama === "akun")!.cek.find((c) => c.nama === "akun_jenis_check")!.ekspresi).not.toContain("'hr'");
    expect(blokMulai).toContain("Tabel `akun` bertambah kolom `kota_id` dan nilai jenis `hr`.");
    expect(blokMulai).toContain("Tabel `sesi` bertambah kolom `jenis` dan `csrf_hash`.");
  });
  test("rekaman skema.txt bagian A: 14 tabel, sama dengan ERD Tahap 3 dan dengan delapan tabel Tahap 2 ditambah enam", () => {
    const hitung = skema.findIndex((b) => b.includes("SELECT count(*) AS tabel"));
    expect(Number(skema[hitung + 3]!.trim())).toBe(erd3.tabel.length);
    expect(new Set(tabelSkemaA)).toEqual(new Set(erd3.tabel.map((t) => t.nama)));
    expect(erd3.tabel).toHaveLength(erd2.tabel.length + erd3.selisih.tabel_baru.length);
  });
  test("Rantai: 8 tabel, + 6 tabel dengan nama dari ERD, 14 tabel; baris kedua dari naskah bagian 3", () => {
    const [db, luar] = rantai.baris;
    expect(db!.simpul.map((s) => s.teks)).toEqual([`${erd2.tabel.length} tabel`, `+ ${erd3.selisih.tabel_baru.length} tabel`, `${erd3.tabel.length} tabel`]);
    expect(db!.simpul[1]!.sub).toBe(erd3.selisih.tabel_baru.join(", "));
    expect(rantai.sumber.teks).toBe("Baris 1: rekaman lab api-t3. Baris 2: Ilustrasi");
    expect(rantai.sumber.jenis).toBe("ilustrasi");
    expect(rantai.baris.map((b) => b.label)).toEqual(["Database", "Di luar database"]);
    expect(luar!.simpul.map((s) => s.teks)).toEqual(["Jurnal COMMIT", "HP Citra berbunyi"]);
    expect(naskahTeks).toContain("PostgreSQL bisa COMMIT atau ROLLBACK sebagai satu unit, tetapi layanan push tidak ikut unit itu");
    expect(blokMulai).toContain("PostgreSQL bisa COMMIT atau ROLLBACK sebagai satu unit, tetapi layanan push tidak ikut unit itu");
    expect(naskahTeks).toContain("Budi transfer Rp50.000 ke Citra");
  });
  test("jumlah baris pekerjaan di Inti sama dengan baris naskah", () => {
    expect(blokMulai).toContain(`Baris pertama dari ${kata(tabelNaskah.length)} baris pekerjaan di bawah, ${tabelNaskah[0]![0]!.toLowerCase()}, menyentuh dua tempat sekaligus.`);
  });
});

// ---- tautan konsep ---------------------------------------------------------------------------------------------------
const KONSEP_KE_JUDUL: Record<string, RegExp> = {
  "outbox": /^Outbox transaksional dan worker/,
  "worker": /^Outbox transaksional dan worker/,
  "connection pool": /^Connection pool/,
  "retry": /^At-least-once: retry/,
  "consumer idempoten": /^At-least-once: retry/,
  "cache dan invalidation": /^Cache dan invalidation/,
  "cache invalidation": /^Cache dan invalidation/,
  "optimistic lock": /^Offline-first dan sinkron/,
  "xss": /^Keamanan 5/,
  "csrf": /^Keamanan 5/,
  "cookie": /^Keamanan 5/,
  "csp": /^Keamanan 5/,
  "passkey": /^Keamanan 5/,
  "fan-out": /^M27:/,
  "kelas prioritas queue": /^M27:/,
  "validation": /^Validation dua lapis/,
  "output encoding": /^Keamanan 5/,
  "reverse proxy": /^Dua instance di belakang proxy/,
  "rate limit lintas instance": /^Rate limit lintas instance/,
  "observability": /^Observability/,
  "offline-first": /^Offline-first/,
  "umur key lawan umur queue": /^Retry dan idempotency key/,
  "tim 3: staging, mock server, backup, on-call": /^Tim dan infra Tahap 3/,
};
const idDariJudul = (re: RegExp): string => {
  const cocok = HALAMAN.filter((h) => !h.lama && !h.lebur_ke && re.test(h.judul)); // halaman lama yang dilebur tidak dihitung
  if (cocok.length !== 1) throw new Error(`registry: ${re} cocok ${cocok.length} halaman`);
  return cocok[0]!.id;
};
const EKSTRA: Record<string, string[]> = { "Notifikasi saat menerima uang": ["t3-dua-tempat"] };

describe("tabel konsep: tautan diturunkan dari kolom konsep naskah dan judul registry", () => {
  test("delapan baris dengan fitur yang sama dengan naskah", () => {
    expect(baris2).toHaveLength(tabelNaskah.length);
    expect(baris2.map((b) => b[0])).toEqual(tabelNaskah.map((n) => n[0]));
  });
  test("tiap konsep naskah punya padanan di kamus, dan ID di baris = ID dari judul registry (di luar tambahan tertulis)", () => {
    tabelNaskah.forEach((n, i) => {
      const butir = n[4]!.split(";").map((s) => s.trim().toLowerCase());
      const harapan = new Set(butir.map((k) => {
        expect(KONSEP_KE_JUDUL[k], `konsep naskah tanpa padanan: ${k}`).toBeDefined();
        return idDariJudul(KONSEP_KE_JUDUL[k]!);
      }));
      const sebut = new Set(idDalam(baris2[i]![1]!));
      for (const id of harapan) expect(sebut.has(id), `baris ${i + 1} (${n[0]}) tanpa tautan ${id}`).toBe(true);
      const lebih = [...sebut].filter((id) => !harapan.has(id));
      expect(lebih, `baris ${i + 1} (${n[0]}) menaut halaman di luar naskah`).toEqual(EKSTRA[n[0]!] ?? []);
    });
  });
  test("tambahan baris 1: halaman bagian 3 di Tahap 3 hanya satu, dan naskah bagian 2 menunjuknya sebagai cara pertama yang keliru", () => {
    const bagian3 = HALAMAN.filter((h) => h.tahap === 3 && h.bagian === 3);
    expect(bagian3.map((h) => h.id)).toEqual(EKSTRA["Notifikasi saat menerima uang"]);
    expect(naskahTeks).toContain("Cara pertama yang ditulis tim ternyata keliru, dan itu bagian 3.");
    expect(blokTanya).toContain("Cara pertama yang ditulis tim ternyata keliru. Alasannya dibahas di [[t3-dua-tempat]].");
  });
  test("semua [[ID]] di halaman ada di registry dan menunjuk halaman Tahap 3 atau yang lebih awal", () => {
    for (const id of new Set(idDalam(mdx))) {
      const h = per(id);
      expect(Number(h.tahap)).toBeLessThanOrEqual(3);
    }
  });
});

// ---- pertanyaan, pola dua tempat, halaman fitur ---------------------------------------------------------------------------
describe("pertanyaan pertama dan klaim yang menunjuk halaman lain", () => {
  test("tiga syarat dan pemiliknya sama dengan naskah bagian 3, urut", () => {
    expect(syaratNaskah).toHaveLength(3);
    const pemilik = syaratNaskah.map((b) => b.match(/\(syarat ([A-Za-z ]+)\)/)![1]!);
    expect(pemilik).toEqual(["Pak Hadi", "Sinta", "Direksi"]);
    const di = blokTanya.split("\n").filter((b) => /^\d\. /.test(b));
    expect(di).toHaveLength(3);
    di.forEach((b, i) => expect(b).toMatch(new RegExp(`Ini syarat ${pemilik[i]}\\.$`)));
    expect(blokTanya).toContain(`Tiga hal harus selalu benar`);
    expect(naskahTeks).toContain("notifikasi adalah akibat dari uang yang bergerak, bukan bagian dari uang yang bergerak");
    expect(blokTanya).toContain("pemberitahuan adalah akibat dari uang yang bergerak, bukan bagian dari uang yang bergerak");
    expect(blokTanya).toContain('"Budi transfer Rp50.000 ke Citra"');
  });
  test("pola dua tempat: empat masalah dari naskah bagian 3 menuju halaman M dengan nomor yang sama", () => {
    const kalimat = naskahBaris.find((b) => b.includes("Pola dua tempat ini muncul lagi di"))!;
    const m = [...kalimat.matchAll(/\(M(\d+)\)/g)].map((x) => Number(x[1]));
    expect(m.sort((a, b) => a - b)).toEqual([22, 23, 24, 27]);
    const ids = m.map((n) => idDariJudul(new RegExp(`^M${n}:`)));
    const paragraf = blokKonsep.split("\n").find((b) => b.startsWith("Pola dua tempat muncul lagi"))!;
    expect(idDalam(paragraf)).toEqual(ids);
    expect(paragraf).toContain(`di ${kata(m.length)} masalah lain`);
    expect(kalimat).toContain("PostgreSQL tetap satu-satunya source of truth");
  });
  test("halaman fitur Tahap 3 hanya dua (halaman ini dan notifikasi); katalog, dasbor, dan offline tidak punya halaman fitur", () => {
    const fitur = HALAMAN.filter((h) => h.tahap === 3 && h.jenis === "fitur").map((h) => h.id);
    expect(fitur).toEqual(["t3-fitur-teknis", "t3-notifikasi"]);
    const judul = fitur.map((id) => per(id).judul).join(" ").toLowerCase();
    for (const k of ["katalog", "dasbor", "offline"]) expect(judul).not.toContain(k);
    expect(per("t3-notifikasi").judul).toContain("notifikasi push dan promo HR");
    expect(blokTabel).toContain("Katalog, dasbor, dan offline tidak punya halaman fitur sendiri di Tahap 3.");
    expect(blokKonsep).toContain("Halaman fitur berikutnya, [[t3-notifikasi]], membahas notifikasi push dan promo HR.");
  });
  test("pertanyaan menaut 3.1 yang memuat tiga pertanyaan terbuka PRD (naskah bagian 1)", () => {
    expect(naskahTeks).toContain("**Pertanyaan terbuka di PRD.**");
    expect(naskahTeks).toContain("Ketiganya tidak dijawab PRD dan menjadi masalah terbesar Tahap 3");
    expect(blokTanya).toContain("Tiga pertanyaan terbuka PRD v3 yang ikut menentukan jawabannya ada di [[t3-prd]].");
  });
});

// ---- kartu pilah ------------------------------------------------------------------------------------------------------
// item pilah → [kolom naskah (1 app, 2 backend, 3 database), fitur naskah, potongan teks naskah] atau rekaman skema
const SUMBER_ITEM: ([number, string, string] | "skema-stok")[] = [
  [1, "Notifikasi saat menerima uang", "Minta izin notifikasi"],
  [2, "Katalog dan stok", "total pembayaran dihitung ulang dari database"],
  [3, "Notifikasi saat menerima uang", "`perangkat`"],
  [1, "Mode offline warung", "Queue perubahan lokal"],
  [2, "Katalog dan stok", "ubah produk bersyarat versi"],
  [2, "Dasbor web warung", "cookie sesi"],
  [3, "Notifikasi saat menerima uang", "`outbox`"],
  [1, "Notifikasi saat menerima uang", "saring pesan ganda"],
  [2, "Tidak berhenti saat deploy", "graceful shutdown"],
  "skema-stok",
];
describe("kartu pilah: jawaban dari kolom naskah dan klaim dari rekaman", () => {
  test("sepuluh kartu, tiga kelompok sama dengan nama kolom naskah, dan blok Coba menyebut jumlahnya", () => {
    expect(pilah.item).toHaveLength(SUMBER_ITEM.length);
    expect(pilah.kelompok).toEqual(["App", "Backend", "Database"]);
    expect(blokCoba).toContain(`${huruf1(kata(pilah.item.length))} pekerjaan dari PRD v3.`);
    expect(blokCoba).toContain('src="data/t3-fitur-pilah.json"');
    expect(blokCoba).toContain("Nama endpoint, tabel, dan status berasal dari rekaman lab api-t3.");
  });
  test("kelompok jawaban tiap kartu = kolom naskah yang memuat pekerjaannya", () => {
    pilah.item.forEach((it, i) => {
      const s = SUMBER_ITEM[i]!;
      if (s === "skema-stok") {
        const produk = erd3.tabel.find((t) => t.nama === "produk")!;
        expect(produk.cek.find((c) => c.nama === "produk_stok_check")!.ekspresi).toBe("stok >= 0");
        expect(it.jawab).toBe(2);
        return;
      }
      const baris = tabelNaskah.find((n) => n[0] === s[1])!;
      expect(baris[s[0]]!.toLowerCase(), `kartu ${i + 1}`).toContain(s[2].toLowerCase());
      expect(it.jawab, `kartu ${i + 1}`).toBe(s[0] - 1);
    });
    const hitung = [0, 1, 2].map((g) => pilah.item.filter((it) => it.jawab === g).length);
    expect(hitung).toEqual([3, 4, 3]);
  });
  test("endpoint di penjelasan kartu ada di openapi.yaml (nomor produk dibaca sebagai {id})", () => {
    const sebut = pilah.item.flatMap((it) => [...it.kenapa.matchAll(/\b(GET|POST|PATCH|PUT|DELETE) (\/[\w{}/-]*[\w}])/g)].map((m) => `${m[1]} ${m[2]}`.replace(/\/\d+/g, "/{id}")));
    expect(sebut).toEqual(["POST /perangkat", "POST /pesanan", "POST /sinkron", "PATCH /produk/{id}"]);
    for (const e of sebut) expect(endpoint.has(e), e).toBe(true);
  });
  test("kartu harga: Rp25.000 di layar, Rp22.500 ditagih, promo 10% dari katalog.txt bagian A, B, dan C", () => {
    const a = bagianRekaman(katalog, "A").join("\n");
    const b = bagianRekaman(katalog, "B").join("\n");
    const c = bagianRekaman(katalog, "C");
    const dasar = Number(a.match(/"nama":"Nasi goreng","harga":(\d+)/)![1]);
    const persen = Number(b.match(/"potongan_persen": (\d+)/)![1]);
    const tagih = Number(c.join("\n").match(/"nominal":(\d+),"harga_satuan":(\d+)/)![1]);
    expect(tagih).toBe((dasar * (100 - persen)) / 100);
    expect(c.join("\n")).toContain(`HP Budi masih menampilkan ${rp(dasar)}`);
    const k = pilah.item[1]!.kenapa;
    expect(k).toContain(`HP Budi masih menampilkan ${rp(dasar)} sesudah promo ${persen}% menyala`);
    expect(k).toContain(`POST /pesanan menagih ${rp(tagih)} dari database`);
  });
  test("kartu versi: PATCH dengan versi 2 saat versi sudah 3 dijawab 409, dari katalog.txt bagian D", () => {
    const d = bagianRekaman(katalog, "D").join("\n");
    const ubah = d.indexOf(`-d '{"harga": 26000, "versi": 2}'`);
    const naik = d.indexOf('"versi":3}', ubah);
    const basi = d.indexOf(`-d '{"stok": 0, "versi": 2}'`, naik);
    const konflik = d.indexOf("HTTP/1.1 409 Conflict", basi);
    expect(ubah >= 0 && naik > ubah && basi > naik && konflik > basi).toBe(true);
    expect(pilah.item[4]!.kenapa).toContain("PATCH /produk/1 dengan versi 2 saat versinya sudah 3 dijawab 409");
  });
  test("kartu cookie: dua penolakan 401 sebelum login karyawan ditolak 403, dari web.txt bagian C", () => {
    const c = bagianRekaman(web, "C").join("\n");
    expect([...c.matchAll(/HTTP\/1\.1 401 Unauthorized/g)]).toHaveLength(2);
    expect(c.indexOf("HTTP/1.1 403 Forbidden")).toBeGreaterThan(c.lastIndexOf("HTTP/1.1 401 Unauthorized"));
    expect(c).toContain("Cookie: __Host-sesi=<token sesi Warung Ani (app)>");
    expect(c).toContain("Authorization: Bearer <token sesi web Ani>");
    expect(pilah.item[5]!.kenapa).toContain("token sesi app yang dikirim sebagai cookie ditolak 401, begitu juga token dasbor yang dikirim sebagai header Bearer (web.txt bagian C)");
  });
  test("kartu tabel: UNIQUE token perangkat dan CHECK stok dari ERD dan skema.txt bagian B", () => {
    const perangkat = erd3.tabel.find((t) => t.nama === "perangkat")!;
    expect(perangkat.unik.map((u) => u.nama)).toContain("perangkat_token_push_key");
    expect(perangkat.kolom.map((k) => k.nama)).toEqual(expect.arrayContaining(["token_push", "terakhir_terlihat"]));
    const b = skema.join("\n");
    expect(b).toContain("perangkat_token_push_key");
    expect(b).toContain("UNIQUE (token_push)");
    expect(b).toContain("produk_stok_check");
    expect(b).toContain("CHECK ((stok >= 0))");
    expect(pilah.item[2]!.kenapa).toContain("UNIQUE di database menolak baris kedua dengan token yang sama");
    expect(pilah.item[9]!.kenapa).toContain("CHECK (stok >= 0) di tabel produk");
  });
  test("berkas rekaman yang disebut kartu dan halaman ada", () => {
    for (const f of ["skema.txt", "web.txt", "katalog.txt"]) expect(fs.existsSync(path.join(akar, "labs/api-t3/output", f)), f).toBe(true);
    expect(fs.existsSync(path.join(akar, "labs/api-t3/openapi.yaml"))).toBe(true);
  });
});

// ---- yang tidak boleh tampil ke pembaca ------------------------------------------------------------------------------------
describe("teks pembaca bersih", () => {
  const semua = [mdx, JSON.stringify(rantai), JSON.stringify(pilah)];
  test("tanpa ID riset (R3-nn)", () => {
    for (const x of semua) expect(x).not.toMatch(/\bR\d-\d+\b/);
  });
  test("ID halaman hanya di dalam [[...]] (diagram dan kartu tanpa ID)", () => {
    for (const x of [JSON.stringify({ ...rantai, id: "" }), JSON.stringify(pilah)]) expect(x).not.toMatch(/\b(?:t[123]|B\d)-[a-z]|\[\[/);
    expect(mdx.replace(/\[\[[^\]]+\]\]/g, "").replace(/src="[^"]+"/g, "").replace(/import .*/g, "")).not.toMatch(/\bt[123]-[a-z]/);
  });
  test("satuan byte ditulis lengkap dan tanpa emoji", () => {
    for (const x of semua) {
      expect(x).not.toMatch(/\d\s?B\b/);
      expect(x).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
