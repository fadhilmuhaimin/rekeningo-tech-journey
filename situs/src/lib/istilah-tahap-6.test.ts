// Penjaga istilah Tahap 6 (tugas istilah-tahap-6, keputusan 1764 sampai 1766): 12 halaman istilah, 8 baris glosarium tambahan,
// tiga entri lama yang diberi satu kalimat, dan lima baris riset R6-170 sampai R6-174. Nilai yang dibandingkan diturunkan dari
// baris riset, halaman Tahap 5, dan registry (istilah-tahap-6.ts), bukan dari berkas yang dimutasi. Bagian "HTML hasil build"
// membaca situs/dist bila ada (gerbang dan CI selalu ada) dan memeriksa tiap <abbr> kunci baru di halaman di luar Tahap 6.
import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { abbrDiMain, bacaDefinisi } from "./arti-istilah";
import { ISTILAH_TAMBAHAN, ISTILAH_UTAMA, PEMAKAI_TOOLTIP, periksaIstilahT6, type Masukan } from "./istilah-tahap-6";

const ROOT = path.resolve(__dirname, "../../..");
const baca = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const DIST = path.join(ROOT, "situs/dist");

function muat(): Masukan {
  const riset: Record<string, string> = {};
  for (const f of fs.readdirSync(path.join(ROOT, "plan")).filter((x) => /^RISET-TAHAP-\d\.md$/.test(x))) {
    for (const l of baca(`plan/${f}`).split("\n")) {
      const m = /^\| (R\d-\d{2,3}) \|/.exec(l);
      if (m) riset[m[1]!] = l;
    }
  }
  const halaman: Record<string, unknown> = {};
  for (const f of fs.readdirSync(path.join(ROOT, "situs/data/halaman-istilah")).filter((x) => x.endsWith(".json"))) {
    halaman[f.replace(/\.json$/, "")] = JSON.parse(baca(`situs/data/halaman-istilah/${f}`));
  }
  const mdx: Record<string, string> = {};
  for (const f of fs.readdirSync(path.join(ROOT, "situs/src/content/docs/tahap-5")).filter((x) => x.endsWith(".mdx"))) {
    mdx[`tahap-5/${f.replace(/\.mdx$/, "")}`] = baca(`situs/src/content/docs/tahap-5/${f}`);
  }
  return {
    glosMdx: baca("situs/src/content/docs/alat/glosarium.mdx"),
    glosJson: JSON.parse(baca("situs/data/glosarium.json")),
    istilahMd: baca("situs/data/istilah.md"),
    halaman,
    riset,
    risetT6: baca("plan/RISET-TAHAP-6.md"),
    registry: JSON.parse(baca("situs/data/cerita.json")).halaman,
    mdx,
  };
}

const nyata = muat();
const salin = (): Masukan => structuredClone(nyata);
const gagal = (m: Masukan, cocok: RegExp) => {
  const hasil = periksaIstilahT6(m);
  expect(hasil.length, `mutan lolos: ${cocok}`).toBeGreaterThan(0);
  expect(hasil.some((x) => cocok.test(x)), `mutan gagal karena sebab lain: ${hasil.slice(0, 3).join(" | ")}`).toBe(true);
};
const ubahBaris = (m: Masukan, nama: string, f: (l: string) => string) => {
  m.glosMdx = m.glosMdx.split("\n").map((l) => (l.startsWith(`| **${nama}**`) ? f(l) : l)).join("\n");
};

describe("istilah Tahap 6: data nyata", () => {
  test("12 halaman istilah, 8 baris tambahan, 3 entri lama, 5 baris riset, dan definisi lolos penjaga", () => {
    expect(periksaIstilahT6(nyata)).toEqual([]);
  });

  test("dua belas nama dan delapan baris tambahan dari blok tugas istilah-tahap-6 di ANTREAN (bila blok masih ada)", () => {
    const antrean = baca("plan/ANTREAN.md");
    const blok = /### istilah-tahap-6[^\n]*\n([\s\S]*?)\n### /.exec(antrean)?.[1];
    if (!blok) return; // blok dilipat sesudah tugas selesai: daftar literal di istilah-tahap-6.ts tetap dijaga tes lain
    const selesaiBila = /- selesai bila: ([^\n]+)/.exec(blok)![1]!.toLowerCase();
    for (const { nama } of ISTILAH_UTAMA) expect(selesaiBila, nama).toContain(nama.toLowerCase());
    for (const nama of ["minor unit", "dora", "produk data", "slo berantai", "akun likuiditas", "akun selisih pembulatan", "pasangan wilayah"]) expect(selesaiBila, nama).toContain(nama);
    for (const entri of ["on-call", "sharding", "error budget"]) expect(selesaiBila, entri).toContain(entri);
  });

  test("tiap kunci baru punya definisi di istilah.md sama dengan glosarium.json, dan istilah.md tidak punya kunci wilayah, negara, atau region", () => {
    const def = bacaDefinisi(nyata.istilahMd);
    for (const nama of [...ISTILAH_UTAMA.map((x) => x.nama), ...ISTILAH_TAMBAHAN.map((x) => x.nama)] as string[]) {
      const baris = nyata.glosJson.find((g) => g.t === nama)!;
      expect(def[nama], nama).toBe(baris.d);
      expect(def[nama.toLowerCase()] ?? def[nama], `${nama} huruf kecil`).toBe(baris.d);
    }
    for (const k of ["wilayah", "Wilayah", "negara", "Negara", "region", "Region"]) expect(def[k], k).toBeUndefined();
  });

  test("halaman istilah on-call tetap menyebut sumber SRE Book bab 11 dan tanggal baca ulang", () => {
    const on = JSON.stringify(nyata.halaman["on-call"]);
    expect(on).toContain("https://sre.google/sre-book/being-on-call/");
    expect(on).toContain("dibuka ulang 2026-11-06");
  });

  test("akun panas di halaman istilah optimistic lock punya arti yang sama dengan entri (akun yang menerima banyak tulisan)", () => {
    const teks = JSON.stringify(nyata.halaman["optimistic-lock"]);
    expect((teks.match(/akun panas/g) ?? []).length).toBe(1);
    expect(teks).toContain("akun panas sebaiknya menerima entri tanpa syarat");
  });
});

describe("istilah Tahap 6: mutasi (penjaga harus gagal karena sebab yang diuji)", () => {
  test("baris glosarium dihapus (glosarium.mdx dan glosarium.json)", () => {
    const m = salin();
    m.glosMdx = m.glosMdx.split("\n").filter((l) => !l.startsWith("| **Pseudonim**")).join("\n");
    m.glosJson = m.glosJson.filter((g) => g.t !== "Pseudonim");
    gagal(m, /Pseudonim: tidak ada baris/);
  });

  test("baris tambahan dihapus", () => {
    const m = salin();
    m.glosMdx = m.glosMdx.split("\n").filter((l) => !l.startsWith("| **Akun likuiditas**")).join("\n");
    gagal(m, /Akun likuiditas: tidak ada baris di glosarium\.mdx/);
  });

  test("kolom Halaman ditukar", () => {
    const m = salin();
    ubahBaris(m, "Kuorum", (l) => l.replace("[[t6-m55]]", "[[t6-m54]]"));
    gagal(m, /Kuorum: kolom Halaman/);
  });

  test("halaman istilah dihapus atau stack diisi", () => {
    const m = salin();
    delete m.halaman["finops"];
    gagal(m, /finops: halaman istilah tidak valid/);
    const n = salin();
    (n.halaman["kuorum"] as { stack: unknown }).stack = { lihat: "outbox", teks: "x" };
    gagal(n, /kuorum: stack harus null/);
  });

  test("URL sumber diubah, ID riset ditukar, tanggal akses diubah", () => {
    const a = salin();
    (a.halaman["golden-path"] as { sumber: { url: string }[] }).sumber[0]!.url = "https://engineering.atspotify.com/2020/09/lain";
    gagal(a, /golden-path: URL sumber 1/);
    const b = salin();
    (b.halaman["service-mesh"] as { sumber: { riset: string }[] }).sumber[0]!.riset = "R6-173";
    gagal(b, /service-mesh: URL sumber 1/);
    const c = salin();
    (c.halaman["chaos-testing"] as { sumber: { catatan: string }[] }).sumber[0]!.catatan = "Teks HTML dibuka 2026-10-25.";
    gagal(c, /chaos-testing: catatan sumber 1 tanpa tanggal akses/);
  });

  test("baris riset baru dihapus, digandakan, atau tanggalnya diubah", () => {
    const a = salin();
    a.risetT6 = a.risetT6.split("\n").filter((l) => !l.startsWith("| R6-172 |")).join("\n");
    gagal(a, /R6-172: 0 baris/);
    const b = salin();
    b.risetT6 += "\n| R6-173 | salinan |";
    gagal(b, /R6-173: 2 baris/);
    const c = salin();
    c.riset["R6-171"] = c.riset["R6-171"]!.replaceAll("dibuka 2026-11-06", "dibuka 2026-10-25");
    c.risetT6 = c.risetT6.replace(/R6-171 \|[^\n]+/, (x) => x.replaceAll("dibuka 2026-11-06", "dibuka 2026-10-25"));
    gagal(c, /R6-171: baris riset punya 0 tanggal akses/);
  });

  test("ID riset tampil di teks halaman istilah, kata Anda, label turunan tanpa label", () => {
    const a = salin();
    (a.halaman["data-mesh"] as { sehari_hari: string }).sehari_hari += " Lihat R6-06.";
    gagal(a, /data-mesh: ID riset tampil/);
    const b = salin();
    (b.halaman["finops"] as { jebakan: string[] }).jebakan[0] += " Anda";
    gagal(b, /finops: kata "Anda"/);
    const c = salin();
    (c.halaman["pseudonim"] as { jebakan: string[] }).jebakan[1] += " Itu hasil Hitungan penulis.";
    gagal(c, /pseudonim: label turunan tanpa/);
  });

  test("nomor halaman di cerita tidak sama dengan nomor registry rujukannya", () => {
    const a = salin();
    (a.halaman["golden-path"] as { cerita: { teks: string }[] }).cerita[0]!.teks = (a.halaman["golden-path"] as { cerita: { teks: string }[] }).cerita[0]!.teks.replace("Halaman 5.27", "Halaman 5.26");
    gagal(a, /golden-path: cerita menyebut halaman 5\.26/);
    const b = salin();
    (b.halaman["kuorum"] as { jebakan: string[] }).jebakan[1] = (b.halaman["kuorum"] as { jebakan: string[] }).jebakan[1]!.replace("Halaman 5.9", "Halaman 5.99");
    gagal(b, /kuorum: menyebut halaman 5\.99/);
  });

  test("kata umum wilayah atau negara jadi kunci tooltip", () => {
    const a = salin();
    a.istilahMd += "\n*[wilayah]: Lokasi geografis.\n";
    gagal(a, /"wilayah" jadi kunci tooltip/);
    const b = salin();
    b.glosJson.push({ t: "Negara", d: "Satu pasar.", s: "istilah-negara", h: null });
    gagal(b, /"negara" jadi baris glosarium/);
  });

  test("definisi diturunkan dari sumbernya: metrik DORA, versi Istio dan OPA, frasa 5.30 dan 5.32, kutipan riset", () => {
    const a = salin();
    a.glosJson.find((g) => g.t === "DORA")!.d = a.glosJson.find((g) => g.t === "DORA")!.d.replace("deployment rework rate", "mean time to restore");
    gagal(a, /DORA: metrik "deployment rework rate"/);
    const b = salin();
    b.halaman["service-mesh"] = JSON.parse(JSON.stringify(b.halaman["service-mesh"]).replace("Istio 1.31.3", "Istio 1.30.0"));
    gagal(b, /Istio: versi 1\.31\.3/);
    const c = salin();
    c.halaman["kebijakan-sebagai-kode"] = JSON.parse(JSON.stringify(c.halaman["kebijakan-sebagai-kode"]).replace("v1.22.1", "v1.21.4"));
    gagal(c, /OPA: versi 1\.22\.1/);
    const d = salin();
    d.mdx["tahap-5/sengaja-belum"] = d.mdx["tahap-5/sengaja-belum"]!.replaceAll("tanpa mengubah kode service", "tanpa proxy");
    gagal(d, /Service mesh: frasa "tanpa mengubah kode service" tidak ada di 5\.30/);
    const e = salin();
    e.riset["R6-173"] = e.riset["R6-173"]!.replace("quorum-based synchronous replication", "synchronous replication");
    gagal(e, /R6-173: tanpa kutipan/);
    const f = salin();
    f.glosJson.find((g) => g.t === "Service catalog")!.d = "Daftar service.";
    gagal(f, /Service catalog: definisi tanpa frasa/);
  });

  test("tiga entri lama kehilangan kalimat tambahannya", () => {
    const a = salin();
    ubahBaris(a, "On-call", (l) => l.replace(" Rotasi bisa memakai dua penjaga sekaligus, primer dan sekunder.", ""));
    gagal(a, /On-call: kalimat primer dan sekunder hilang/);
    const b = salin();
    ubahBaris(b, "Sharding", (l) => l.replace("wilayah atau negara tempat akun terdaftar", "wilayah"));
    gagal(b, /Sharding: kalimat shard key negara hilang/);
    const c = salin();
    ubahBaris(c, "Error budget", (l) => l.replace(" Anggaran kegagalan adalah nama lain untuk hal yang sama.", ""));
    gagal(c, /Error budget: kalimat anggaran kegagalan hilang/);
    const d = salin();
    (d.halaman["on-call"] as { sehari_hari: string }).sehari_hari = "On-call adalah giliran jaga.";
    gagal(d, /halaman istilah on-call tanpa primer dan sekunder/);
    const e = salin();
    (e.halaman["on-call"] as { mekanisme: string[] }).mekanisme = (e.halaman["on-call"] as { mekanisme: string[] }).mekanisme.map((x) => x.replaceAll("primer dan sekunder", "dua penjaga"));
    gagal(e, /halaman istilah on-call tanpa primer dan sekunder/);
  });

  test("definisi yang menulis jawaban masalah Tahap 6 atau lebih dari dua kalimat ditolak", () => {
    const a = salin();
    a.glosJson.find((g) => g.t === "Pasangan wilayah")!.d += " ADR 64 memilih 1.000 km.";
    gagal(a, /Pasangan wilayah: definisi menyebut masalah atau ADR Tahap 6/);
    const b = salin();
    b.glosJson.find((g) => g.t === "Minor unit")!.d = "Satu. Dua. Tiga.";
    gagal(b, /Minor unit: definisi lebih dari dua kalimat/);
  });

  test("label [perlu verifikasi] residensi data dicabut dari halaman istilah", () => {
    const a = salin();
    a.halaman["residensi-data"] = JSON.parse(JSON.stringify(a.halaman["residensi-data"]).replaceAll("[perlu verifikasi]", "terverifikasi"));
    gagal(a, /Residensi data: label \[perlu verifikasi\]/);
  });
});

const adaDist = fs.existsSync(path.join(DIST, "tahap-5/jembatan-prd-v6/index.html"));
describe.runIf(adaDist)("istilah Tahap 6: tooltip di HTML hasil build", () => {
  const def = bacaDefinisi(nyata.istilahMd);
  const halamanDist = (): string[] => {
    const hasil: string[] = [];
    const jalan = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) jalan(path.join(dir, e.name));
        else if (e.name === "index.html") hasil.push(path.relative(DIST, dir).split(path.sep).join("/"));
      }
    };
    jalan(DIST);
    return hasil.filter((h) => h && !h.startsWith("tahap-6/") && h !== "cerita/tahap-6" && !h.startsWith("istilah/"));
  };
  const sapuan = (() => {
    const per: Record<string, Record<string, number>> = {};
    for (const h of halamanDist()) {
      for (const a of abbrDiMain(fs.readFileSync(path.join(DIST, h, "index.html"), "utf8"))) {
        const k = a.teks.toLowerCase();
        if (!(k in PEMAKAI_TOOLTIP)) continue;
        const halamanK = (per[k] ??= {});
        halamanK[h] = (halamanK[h] ?? 0) + 1;
      }
    }
    return per;
  })();

  test.each(Object.keys(PEMAKAI_TOOLTIP))("%s: bertooltip hanya di halaman yang sudah dibaca artinya, dan tooltipnya adalah entri glosarium", (k) => {
    const dibaca = Object.keys(sapuan[k] ?? {}).sort();
    expect(dibaca, `halaman baru memakai "${k}": baca artinya, lalu tambahkan ke PEMAKAI_TOOLTIP`).toEqual([...PEMAKAI_TOOLTIP[k]!].sort());
    for (const h of dibaca) {
      for (const a of abbrDiMain(fs.readFileSync(path.join(DIST, h, "index.html"), "utf8")).filter((x) => x.teks.toLowerCase() === k)) {
        expect(a.judul, `${h}: tooltip ${a.teks}`).toBe(def[a.teks]);
        expect(a.arti, `${h}: data-arti ${a.teks}`).toBeNull();
      }
    }
  });

  test("mutasi: kunci dihapus dari istilah.md atau halaman baru memakai kata itu, dan sapuan melaporkannya", () => {
    const tanpaKunci = { ...sapuan };
    delete tanpaKunci["kuorum"];
    expect(Object.keys(tanpaKunci["kuorum"] ?? {})).not.toEqual([...PEMAKAI_TOOLTIP["kuorum"]!].sort());
    const tambah = { ...sapuan["kuorum"], "tahap-5/prd-v5": 1 };
    expect(Object.keys(tambah).sort()).not.toEqual([...PEMAKAI_TOOLTIP["kuorum"]!].sort());
  });
});
