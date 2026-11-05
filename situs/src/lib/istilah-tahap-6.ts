// Penjaga istilah Tahap 6 (tugas istilah-tahap-6, keputusan 1764 sampai 1766). Logika murni tanpa DOM dan tanpa membaca berkas:
// istilah-tahap-6.test.ts membacakan data nyata, lalu memutasi salinannya untuk membuktikan penjaga ini gagal. Nilai yang
// dibandingkan diturunkan dari sumbernya (baris riset, halaman Tahap 5, registry), bukan dari berkas yang dimutasi.
import { createHash } from "node:crypto";
import { HalamanIstilah } from "./istilah";
import { SIDIK } from "./istilah-tahap-6.sidik";

/** 12 istilah yang wajib punya halaman istilah: slug, nama di glosarium, dan halaman cerita pertama yang memakainya. */
export const ISTILAH_UTAMA = [
  { nama: "Multi-region", slug: "multi-region", halaman: "t6-m55" },
  { nama: "Golden path", slug: "golden-path", halaman: "t6-m52" },
  { nama: "Service catalog", slug: "service-catalog", halaman: "t6-m52" },
  { nama: "Chaos testing", slug: "chaos-testing", halaman: "t6-m54" },
  { nama: "Data mesh", slug: "data-mesh", halaman: "t6-m53" },
  { nama: "FinOps", slug: "finops", halaman: "t6-m57" },
  { nama: "Residensi data", slug: "residensi-data", halaman: "t6-residensi" },
  { nama: "Kebijakan sebagai kode", slug: "kebijakan-sebagai-kode", halaman: "t6-residensi" },
  { nama: "Kuorum", slug: "kuorum", halaman: "t6-m55" },
  { nama: "Pseudonim", slug: "pseudonim", halaman: "t6-residensi" },
  { nama: "Rumpun jaga", slug: "rumpun-jaga", halaman: "t6-tim-infra" },
  { nama: "Service mesh", slug: "service-mesh", halaman: "t5-adr-60" },
] as const;

/** Istilah yang dipakai halaman Tahap 6 tetapi belum punya entri: satu baris glosarium, tanpa halaman istilah. */
export const ISTILAH_TAMBAHAN = [
  { nama: "Minor unit", halaman: "t6-m56" },
  { nama: "DORA", halaman: "t6-tim-infra" },
  { nama: "Produk data", halaman: "t6-m53" },
  { nama: "SLO berantai", halaman: "t6-m54" },
  { nama: "Akun likuiditas", halaman: "t6-m56" },
  { nama: "Akun selisih pembulatan", halaman: "t6-m56" },
  { nama: "Pasangan wilayah", halaman: "t6-m55" },
  { nama: "Akun panas", halaman: "t6-m55" },
] as const;

/** Kata umum yang tidak boleh jadi kunci tooltip: tooltip menempel di tiap kemunculannya, termasuk di Tahap 1 sampai 5. */
export const KATA_UMUM = ["wilayah", "negara", "region"] as const;

/**
 * Halaman di luar Tahap 6 yang bertooltip untuk tiap kunci baru, dibaca satu per satu di HTML build 2026-11-06: arti di tiap
 * kemunculan sama dengan entri. Halaman baru yang memakai kata itu harus dibaca dulu artinya (satu kata, satu arti) sebelum
 * masuk daftar ini. Halaman tahap-6/ dan cerita/tahap-6 dikecualikan: penulisnya yang memeriksa arti di halamannya.
 */
export const PEMAKAI_TOOLTIP: Record<string, string[]> = {
  "multi-region": ["alat/indeks-topik", "cerita/tahap-4", "cerita/tahap-5", "tahap-5/jembatan-prd-v6", "tahap-5/m51-prd-v6", "tahap-5/on-prem-lawan-cloud", "tahap-5/prd-v5", "tahap-5/sengaja-belum"],
  "golden path": ["tahap-5/jembatan-prd-v6"],
  "service catalog": ["tahap-5/jembatan-prd-v6"],
  "chaos testing": ["alat/indeks-topik", "tahap-5/jembatan-prd-v6"],
  "data mesh": ["alat/glosarium", "tahap-5/jembatan-prd-v6"],
  finops: ["alat/indeks-topik"],
  "residensi data": [],
  "kebijakan sebagai kode": [],
  kuorum: ["tahap-5/on-prem-lawan-cloud", "tahap-5/rekap", "tahap-5/rpo-rto-failover"],
  pseudonim: [],
  "rumpun jaga": [],
  "service mesh": ["alat/glosarium", "alat/indeks-topik", "cerita/tahap-4", "cerita/tahap-5", "tahap-4/sengaja-belum", "tahap-5/m49-canary-sepertiga", "tahap-5/m51-prd-v6", "tahap-5/mtls-antar-service", "tahap-5/sengaja-belum"],
  "minor unit": ["alat/glosarium"],
  dora: ["alat/glosarium", "alat/indeks-topik"],
  "produk data": ["alat/glosarium"],
  "slo berantai": ["alat/glosarium"],
  "akun likuiditas": ["alat/glosarium"],
  "akun selisih pembulatan": ["alat/glosarium"],
  "pasangan wilayah": ["alat/glosarium"],
  "akun panas": ["alat/glosarium"],
};

export interface BarisGlos {
  t: string;
  d: string;
  s: string;
  h: string | null;
}

export interface Masukan {
  /** Teks situs/src/content/docs/alat/glosarium.mdx. */
  glosMdx: string;
  glosJson: BarisGlos[];
  /** Teks situs/data/istilah.md (`*[kunci]: definisi`). */
  istilahMd: string;
  /** Isi mentah situs/data/halaman-istilah/<slug>.json. */
  halaman: Record<string, unknown>;
  /** Baris riset: ID -> teks baris (plan/RISET-TAHAP-N.md). */
  riset: Record<string, string>;
  /** Teks plan/RISET-TAHAP-6.md utuh, untuk urutan dan jumlah baris. */
  risetT6: string;
  registry: { id: string; nomor?: string }[];
  /** Teks MDX halaman tahap lain, kunci path tanpa ekstensi (mis. tahap-5/jembatan-prd-v6). */
  mdx: Record<string, string>;
}

const TANGGAL = "2026-11-06";
/** Alamat yang dibuka sampai teks mentahnya dibaca pada TANGGAL (curl, bukan hasil pencarian). Sumber di halaman istilah harus salah satunya. */
export const URL_DIBUKA = [
  "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html",
  "https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/regions.html",
  "https://www.postgresql.org/docs/17/warm-standby.html",
  "https://www.postgresql.org/docs/17/runtime-config-replication.html",
  "https://engineering.atspotify.com/2020/08/how-we-use-golden-paths-to-solve-fragmentation-in-our-software-ecosystem",
  "https://backstage.io/docs/features/software-catalog/",
  "https://principlesofchaos.org/",
  "https://martinfowler.com/articles/data-mesh-principles.html",
  "https://www.finops.org/introduction/what-is-finops/",
  "https://azure.microsoft.com/en-us/explore/global-infrastructure/data-residency/",
  "https://www.openpolicyagent.org/docs",
  "https://csrc.nist.gov/glossary/term/pseudonymization",
  "https://nvlpubs.nist.gov/nistpubs/ir/2015/NIST.IR.8053.pdf",
  "https://istio.io/latest/about/service-mesh/",
  "https://sre.google/sre-book/being-on-call/",
];
const ID_RISET_BARU = ["R6-170", "R6-171", "R6-172", "R6-173", "R6-174"];
const LABEL = /Tidak dijalankan|Asumsi|Ilustrasi|Rekaman lab|\[perlu verifikasi\]/;

/** Semua string di satu objek JSON, kecuali nilai kunci riset, url, dan rujukan (ID riset dan alamat boleh ada di data, tidak di teks tampil). */
export function teksTampil(x: unknown, kunci = ""): string[] {
  if (typeof x === "string") return kunci === "riset" || kunci === "url" || kunci === "rujukan" ? [] : [x];
  if (Array.isArray(x)) return x.flatMap((v) => teksTampil(v, kunci));
  if (x && typeof x === "object") return Object.entries(x).flatMap(([k, v]) => teksTampil(v, k));
  return [];
}

const barisGlos = (mdx: string, nama: string) => mdx.split("\n").find((l) => l.startsWith(`| **${nama}**`));
const kolom = (baris: string) => baris.split(" | ").map((s) => s.replace(/^\| /, "").replace(/ \|$/, ""));
const urlTanpaSkema = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "");
/** Baris riset lama (R6-03, R6-06, R6-16, R6-17, R5-250) menulis nama sumber, bukan alamatnya: nama itu yang dicocokkan. */
const NAMA_SUMBER: Record<string, string> = {
  "engineering.atspotify.com": "Spotify",
  "backstage.io": "Backstage",
  "martinfowler.com": "Dehghani",
  "finops.org": "FinOps",
};
const kalimat = (s: string) => s.replace(/\bmis\./g, "mis").split(/(?<=[.!?])\s+/).filter(Boolean);

/** Sidik 16 heksadesimal dari satu teks (SHA-256), sama dengan pola sidik di halaman Tahap 3 dan 5. */
export const sidik = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);

const NAMA_DEFINISI = [...ISTILAH_UTAMA.map((x) => x.nama), ...ISTILAH_TAMBAHAN.map((x) => x.nama)] as string[];

/** Sidik tiap halaman istilah (JSON utuh), definisi glosarium baru (kolom definisi), dan baris riset R6-170 sampai R6-174. */
export function sidikSekarang(m: Masukan): { halaman: Record<string, string>; definisi: Record<string, string>; riset: Record<string, string> } {
  const halaman: Record<string, string> = {};
  for (const { slug } of ISTILAH_UTAMA) halaman[slug] = sidik(JSON.stringify(m.halaman[slug] ?? null));
  const definisi: Record<string, string> = {};
  for (const nama of NAMA_DEFINISI) {
    const br = barisGlos(m.glosMdx, nama);
    definisi[nama] = sidik(br ? (kolom(br)[1] ?? "") : "");
  }
  const riset: Record<string, string> = {};
  for (const id of ID_RISET_BARU) riset[id] = sidik(m.risetT6.split("\n").find((l) => l.startsWith(`| ${id} |`)) ?? "");
  return { halaman, definisi, riset };
}

/** Semua pelanggaran istilah Tahap 6; larik kosong berarti lolos. */
export function periksaIstilahT6(m: Masukan): string[] {
  const p: string[] = [];
  const nomor = (id: string) => m.registry.find((h) => h.id === id)?.nomor;
  const ada = (id: string) => m.registry.some((h) => h.id === id);
  const def = (nama: string) => m.glosJson.find((g) => g.t === nama)?.d ?? "";
  const baris = (id: string) => m.riset[id] ?? "";

  // 1. Baris riset baru: lima baris, terbit sekali, urut naik, bertanggal akses hari ini.
  for (const id of ID_RISET_BARU) {
    const n = m.risetT6.split("\n").filter((l) => l.startsWith(`| ${id} |`)).length;
    if (n !== 1) p.push(`${id}: ${n} baris di RISET-TAHAP-6, harus tepat satu`);
    // Tiap alamat yang dikutip halaman istilah dengan ID ini punya satu tanggal akses di barisnya.
    const alamat = new Set<string>();
    for (const h of Object.values(m.halaman)) {
      for (const sm of (h as { sumber?: { riset?: string; url?: string }[] } | null)?.sumber ?? []) if (sm.riset === id && sm.url) alamat.add(sm.url);
    }
    const tanggal = baris(id).split(`dibuka ${TANGGAL}`).length - 1;
    if (tanggal < Math.max(1, alamat.size)) p.push(`${id}: baris riset punya ${tanggal} tanggal akses ${TANGGAL}, dibutuhkan ${Math.max(1, alamat.size)} (satu per alamat yang dikutip)`);
  }
  const urutan = ID_RISET_BARU.map((id) => m.risetT6.indexOf(`| ${id} |`));
  if (urutan.some((v, i) => i > 0 && v <= urutan[i - 1]!)) p.push("baris R6-170 sampai R6-174 tidak urut naik");
  if (m.risetT6.split("\n").length > 120) p.push("RISET-TAHAP-6 lebih dari 120 baris");

  // 2. Dua belas halaman istilah dan baris glosarium.
  for (const { nama, slug, halaman } of ISTILAH_UTAMA) {
    const mentah = m.halaman[slug];
    const dok = HalamanIstilah.safeParse(mentah);
    if (!dok.success) {
      p.push(`${slug}: halaman istilah tidak valid atau tidak ada`);
      continue;
    }
    const d = dok.data;
    if (d.istilah !== nama) p.push(`${slug}: istilah "${d.istilah}" bukan "${nama}"`);
    if (d.stack !== null) p.push(`${slug}: stack harus null (konsep tanpa kode per stack)`);
    const g = m.glosJson.find((x) => x.t === nama);
    if (!g) p.push(`${nama}: tidak ada baris glosarium`);
    else if (g.s !== `istilah-${slug}` || g.h !== `/istilah/${slug}/`) p.push(`${nama}: slug atau tautan halaman istilah salah (${g.s}, ${g.h})`);
    const br = barisGlos(m.glosMdx, nama);
    if (!br) p.push(`${nama}: tidak ada baris di glosarium.mdx`);
    else if (kolom(br)[2] !== `[[${halaman}]]`) p.push(`${nama}: kolom Halaman ${kolom(br)[2]} bukan [[${halaman}]]`);
    if (!ada(halaman)) p.push(`${nama}: ${halaman} tidak ada di registry`);

    for (const [i, s] of (d.sumber ?? []).entries()) {
      const id = s.riset;
      if (!id) {
        p.push(`${slug}: sumber ${i + 1} tanpa ID riset`);
        continue;
      }
      const row = baris(id);
      if (!row) p.push(`${slug}: ${id} tidak ada di baris riset`);
      if ("url" in s) {
        if (!s.url.startsWith("https://")) p.push(`${slug}: sumber ${i + 1} bukan https`);
        if (!URL_DIBUKA.includes(s.url)) p.push(`${slug}: URL sumber ${i + 1} (${s.url}) bukan alamat yang dibuka ${TANGGAL}`);
        const tanpa = urlTanpaSkema(s.url).replace(/\/$/, "");
        const nama = NAMA_SUMBER[tanpa.split("/")[0]!];
        if (!row.includes(tanpa) && !(nama && row.includes(nama))) p.push(`${slug}: URL sumber ${i + 1} (${s.url}) atau namanya tidak tertulis di baris ${id}`);
      }
      if (!s.catatan.includes(TANGGAL)) p.push(`${slug}: catatan sumber ${i + 1} tanpa tanggal akses ${TANGGAL}`);
    }
    for (const t of teksTampil(mentah)) {
      if (/\bR\d-\d{2,3}\b/.test(t)) p.push(`${slug}: ID riset tampil di teks "${t.slice(0, 50)}"`);
      if (/\bAnda\b/.test(t)) p.push(`${slug}: kata "Anda" di "${t.slice(0, 50)}"`);
      if (/(penalaran|Hitungan)/i.test(t) && !LABEL.test(t)) p.push(`${slug}: label turunan tanpa satu dari lima label di "${t.slice(0, 60)}"`);
    }
    // "Halaman N.M" di cerita sama dengan nomor registry rujukannya; di bagian lain harus nomor yang ada.
    for (const c of d.cerita ?? []) {
      for (const mm of c.teks.matchAll(/[Hh]alaman (\d\.\d+)/g)) {
        if (mm[1] !== nomor(c.rujukan)) p.push(`${slug}: cerita menyebut halaman ${mm[1]} padahal rujukannya ${c.rujukan} bernomor ${nomor(c.rujukan)}`);
      }
      if (!ada(c.rujukan)) p.push(`${slug}: rujukan ${c.rujukan} tidak ada di registry`);
    }
    for (const t of [d.sehari_hari ?? "", ...(d.mekanisme ?? []), ...(d.jebakan ?? [])]) {
      for (const mm of t.matchAll(/[Hh]alaman (\d\.\d+)/g)) {
        if (!m.registry.some((h) => h.nomor === mm[1])) p.push(`${slug}: menyebut halaman ${mm[1]} yang tidak ada di registry`);
      }
    }
    for (const t of d.terkait ?? []) if (!m.glosJson.some((x) => x.t === t)) p.push(`${slug}: istilah terkait "${t}" tidak ada di glosarium`);
  }

  // 3. Delapan istilah tambahan: satu baris glosarium, tanpa halaman istilah.
  for (const { nama, halaman } of ISTILAH_TAMBAHAN) {
    const br = barisGlos(m.glosMdx, nama);
    if (!br) {
      p.push(`${nama}: tidak ada baris di glosarium.mdx`);
      continue;
    }
    if (kolom(br)[2] !== `[[${halaman}]]`) p.push(`${nama}: kolom Halaman ${kolom(br)[2]} bukan [[${halaman}]]`);
    if (!ada(halaman)) p.push(`${nama}: ${halaman} tidak ada di registry`);
    if (m.glosJson.find((g) => g.t === nama)?.h) p.push(`${nama}: tidak boleh punya halaman istilah`);
  }

  // 4. Kata umum bukan kunci tooltip.
  for (const k of KATA_UMUM) {
    if (new RegExp(`^\\*\\[${k}\\]:`, "im").test(m.istilahMd)) p.push(`"${k}" jadi kunci tooltip di istilah.md`);
    if (m.glosJson.some((g) => g.t.toLowerCase() === k)) p.push(`"${k}" jadi baris glosarium`);
  }

  // 5. Satu arti, dibaca dari sumbernya (halaman Tahap 5 dan baris riset).
  const jb = m.mdx["tahap-5/jembatan-prd-v6"] ?? "";
  const sb = m.mdx["tahap-5/sengaja-belum"] ?? "";
  const ti = m.mdx["tahap-5/tim-infra"] ?? "";
  const rr = m.mdx["tahap-5/rpo-rto-failover"] ?? "";
  const dora = baris("R6-04").match(/lima metrik: ([^;]+);/)?.[1]?.split(", ") ?? [];
  if (dora.length !== 5) p.push(`R6-04: lima metrik DORA tidak terbaca (${dora.length})`);
  let pos = -1;
  for (const nm of dora) {
    const i = def("DORA").indexOf(nm);
    if (i <= pos) p.push(`DORA: metrik "${nm}" tidak ada atau tidak urut seperti di baris riset`);
    pos = i;
  }
  const sama = (nama: string, frasa: string, sumber: string, ket: string) => {
    if (!def(nama).includes(frasa)) p.push(`${nama}: definisi tanpa frasa "${frasa}" (${ket})`);
    if (!sumber.includes(frasa)) p.push(`${nama}: frasa "${frasa}" tidak ada di ${ket}`);
  };
  sama("Service mesh", "tanpa mengubah kode service", sb, "5.30");
  sama("Service catalog", "mencatat pemilik dan metadata semua software", jb, "5.32");
  sama("Chaos testing", "tahan gangguan di produksi", jb, "5.32");
  sama("Data mesh", "empat prinsip", jb, "5.32");
  for (const pr of ["domain-oriented ownership", "data as a product", "self-serve data infrastructure", "federated computational governance"]) {
    if (!baris("R6-06").includes(pr)) p.push(`R6-06: tanpa prinsip "${pr}"`);
  }
  if (!def("Multi-region").includes("aktif-pasif") || !def("Multi-region").includes("aktif-aktif")) p.push("Multi-region: definisi tanpa aktif-pasif dan aktif-aktif");
  if (!sb.includes("aktif-pasif") || !sb.includes("active/active")) p.push("5.30 tidak lagi menulis aktif-pasif dan active/active");
  if (!baris("R6-171").includes("no such thing as failover")) p.push("R6-171: tanpa kutipan no such thing as failover");
  if (!def("Golden path").includes("jalan beraspal") || !def("Golden path").includes(`Halaman ${nomor("t5-tim-infra")}`)) p.push("Golden path: definisi tak menyebut jalan beraspal di halaman bernomor registry t5-tim-infra");
  if (nomor("t5-tim-infra") !== "5.27") p.push(`t5-tim-infra bernomor ${nomor("t5-tim-infra")}, bukan 5.27`);
  if (!/jalan beraspal/i.test(ti)) p.push("5.27 tidak lagi memakai kata jalan beraspal");
  if (!jb.includes("golden path")) p.push("5.32 tidak lagi memakai kata golden path");
  if (!def("Kuorum").includes("ANY n")) p.push("Kuorum: definisi tanpa ANY n");
  if (!baris("R6-173").includes("quorum-based synchronous replication")) p.push("R6-173: tanpa kutipan quorum-based synchronous replication");
  if (!rr.includes("berbasis kuorum")) p.push("5.9 tidak lagi menulis berbasis kuorum");
  if (nomor("t5-rpo-rto") !== "5.9") p.push("t5-rpo-rto bukan 5.9");
  if (!baris("R6-170").includes("replaces an identifier") || !baris("R6-170").includes("re-identification of anonymized data is not possible")) p.push("R6-170: kutipan pseudonimisasi hilang");
  if (!baris("R6-171").includes("[perlu verifikasi]") || !JSON.stringify(m.halaman["residensi-data"]).includes("[perlu verifikasi]")) p.push("Residensi data: label [perlu verifikasi] harus ada di baris riset dan di halaman istilah");
  if (!baris("R6-174").includes("policy as code") || !baris("R6-174").includes("decouples")) p.push("R6-174: kutipan OPA hilang");
  const versiOpa = baris("R6-174").match(/v(\d+\.\d+\.\d+)/)?.[1];
  if (!versiOpa || !JSON.stringify(m.halaman["kebijakan-sebagai-kode"]).includes(`v${versiOpa}`)) p.push(`OPA: versi ${versiOpa} dari R6-174 tak tertulis di halaman istilah`);
  const versiIstio = baris("R6-18").match(/Istio (\d+\.\d+\.\d+)/)?.[1];
  if (!versiIstio || !baris("R6-172").includes(versiIstio) || !JSON.stringify(m.halaman["service-mesh"]).includes(versiIstio)) p.push(`Istio: versi ${versiIstio} dari R6-18 tak sama di R6-172 dan halaman istilah`);
  const rj = HalamanIstilah.safeParse(m.halaman["rumpun-jaga"]);
  const langkah = rj.success ? (rj.data.mekanisme ?? []) : [];
  const catatanRj = rj.success ? (rj.data.sumber ?? []).map((x) => x.catatan).join(" ") : "";
  for (const [kata, bagian] of [["25%", 0], ["delapan", 1], ["enam", 1]] as const) {
    if (!langkah[bagian]?.includes(kata) || !baris("R6-15").includes(kata)) p.push(`rumpun-jaga: "${kata}" di langkah ${bagian + 1} tidak sama dengan baris R6-15 (SRE Book)`);
    if (!catatanRj.includes(kata)) p.push(`rumpun-jaga: "${kata}" tidak ada di catatan sumber`);
  }
  if (!baris("R6-174").includes("primary and a secondary on-call rotation")) p.push("R6-174: tanpa kutipan primary and a secondary");
  if (!baris("R6-16").includes("kolaborasi") || !def("FinOps").includes("kolaborasi")) p.push("FinOps: kata kolaborasi tidak sama dengan R6-16");
  if (!def("Akun panas").includes("banyak tulisan bersaing")) p.push("Akun panas: definisi berubah");

  // 6. Tiga entri lama yang diberi satu kalimat tambahan.
  const oc = barisGlos(m.glosMdx, "On-call") ?? "";
  if (!oc.includes("Rotasi bisa memakai dua penjaga sekaligus, primer dan sekunder.")) p.push("On-call: kalimat primer dan sekunder hilang");
  if (!oc.includes("satu orang dalam tim")) p.push("On-call: kalimat 3.27 satu orang dalam tim hilang");
  const halOc = HalamanIstilah.safeParse(m.halaman["on-call"]);
  if (!halOc.success || !halOc.data.sehari_hari?.includes("primer dan sekunder") || !halOc.data.mekanisme?.some((x) => x.includes("primer dan sekunder"))) p.push("halaman istilah on-call tanpa primer dan sekunder di sehari_hari dan mekanisme");
  const sh = barisGlos(m.glosMdx, "Sharding") ?? "";
  if (!sh.includes("Shard key adalah kolom yang menentukan baris masuk ke shard mana, mis. wilayah atau negara tempat akun terdaftar.")) p.push("Sharding: kalimat shard key negara hilang");
  if (!sh.includes("mis. per wilayah.")) p.push("Sharding: kalimat lama hilang");
  const eb = barisGlos(m.glosMdx, "Error budget") ?? "";
  if (!eb.includes("Anggaran kegagalan adalah nama lain untuk hal yang sama.")) p.push("Error budget: kalimat anggaran kegagalan hilang");
  if (!ti.includes("anggaran kegagalan")) p.push("5.27 tidak lagi memakai kata anggaran kegagalan");

  // 7. Definisi glosarium: paling banyak dua kalimat dan tanpa jawaban masalah (M52 sampai M57, ADR 61 sampai 69).
  for (const nama of [...ISTILAH_UTAMA.map((x) => x.nama), ...ISTILAH_TAMBAHAN.map((x) => x.nama)] as string[]) {
    const d = def(nama);
    if (!d) {
      p.push(`${nama}: definisi kosong`);
      continue;
    }
    if (kalimat(d).length > 2) p.push(`${nama}: definisi lebih dari dua kalimat`);
    if (/\bM5[2-7]\b|ADR 6[1-9]/.test(d)) p.push(`${nama}: definisi menyebut masalah atau ADR Tahap 6 (jawaban halaman lain)`);
  }

  // 8. Kunci teks: kalimat yang dibaca ke sumber primernya 2026-11-06 tidak berubah diam-diam (istilah-tahap-6.sidik.ts). Bagian 1 sampai 7
  // menjaga yang diturunkan dari sumber (angka, versi, tanggal akses, rujukan, label); bagian ini menjaga kalimat bebasnya.
  const kini = sidikSekarang(m);
  for (const bagian of ["halaman", "definisi", "riset"] as const) {
    const harap: Record<string, string> = SIDIK[bagian];
    for (const k of new Set([...Object.keys(harap), ...Object.keys(kini[bagian])])) {
      if (kini[bagian][k] !== harap[k]) p.push(`${bagian} ${k}: teks berubah dari yang ditinjau ke sumber primer 2026-11-06 (sidik ${kini[bagian][k]}, harapan ${harap[k]}); baca ulang ke sumber, lalu perbarui istilah-tahap-6.sidik.ts`);
    }
  }
  return p;
}
