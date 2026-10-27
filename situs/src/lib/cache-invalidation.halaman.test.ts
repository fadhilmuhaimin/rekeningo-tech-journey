// Penjaga halaman 3.19 (keputusan 1072 sampai 1074): angka, ID, nomor ADR, rentang Snippet, tanggal akses, versi sumber, label
// sumber, dan kalimat di cache-invalidation.mdx diturunkan dari rekaman labs/t3-cache (memori.txt, redis.txt, gagal.txt, beban.txt),
// kode lab api-t3 (cache.go, redis.go, katalog_cache.go, katalog.go, repo, handler, main, go.mod), README lab, naskah, registry,
// RISET, widget CacheInvalidation, dan halaman tetangga, bukan dari daftar yang ditulis sendiri. Isi halaman dikunci unit demi unit
// (EXPECT, nilai diisi dari sumber lewat «placeholder»), dan tiap klaim mekanisme atau klaim negatif dipasangkan dengan kode atau
// rekaman yang membuktikannya di tes terpisah, sebab mengunci kalimat utuh tidak menangkap kalimat yang SALAH (pelajaran 3.4 sampai
// 3.17). Klaim dokumentasi (Azure, Nishtala dkk., Facebook, Redis, cache-manager, Laravel, Django, Serverpod, Supabase) dijaga lewat
// baris riset R3-190 sampai R3-193, yang dibuka ke sumber mentah 2026-10-27 dan dikunci dengan sidik jari. Tes hanya membaca berkas
// terlacak git.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t3-cache-inti.json";
import registry from "../../data/cerita.json";
import { cekTemplat, daftarBlok } from "./blok";
import { HalamanIstilah } from "./istilah";
import { DataRantai } from "./rantai";

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
const sidik = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);

const halamanBerkas = "situs/src/content/docs/tahap-3/cache-invalidation.mdx";
const mdx = baca(halamanBerkas);
const frontmatter = mdx.split(/^---\n/m)[1]!;
const halaman = mdx.split(/^---\n/m).slice(2).join("---\n");
const rantai = DataRantai.parse(rantaiMentah);
const naskah = baca("plan/CERITA-TAHAP-3.md");
const naskah4 = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const setelah = baca("plan/SETELAH-TAHAP-3.md");
const memoriTxt = baca("labs/t3-cache/output/memori.txt");
const redisTxt = baca("labs/t3-cache/output/redis.txt");
const gagalTxt = baca("labs/t3-cache/output/gagal.txt");
const bebanTxt = baca("labs/t3-cache/output/beban.txt");
const readmeLab = baca("labs/t3-cache/README.md");
const cacheGo = baca("labs/api-t3/internal/cache/cache.go");
const redisGo = baca("labs/api-t3/internal/cache/redis.go");
const kcGo = baca("labs/api-t3/internal/service/katalog_cache.go");
const katGo = baca("labs/api-t3/internal/service/katalog.go");
const repoKatGo = baca("labs/api-t3/internal/repo/katalog.go");
const repoGo = baca("labs/api-t3/internal/repo/repo.go");
const hdGo = baca("labs/api-t3/internal/handler/handler.go");
const mainGo = baca("labs/api-t3/cmd/api/main.go");
const bukaGo = baca("labs/api-t3/cmd/api/cache.go");
const goMod = baca("labs/api-t3/go.mod");
const prd = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");
const hal231 = baca("situs/src/content/docs/tahap-2/sengaja-belum.mdx");
const hal317 = baca("situs/src/content/docs/tahap-3/rate-limit-redis.mdx");
const hal315 = baca("situs/src/content/docs/tahap-3/dua-instance.mdx");
const halTeknis = baca("situs/src/content/docs/tahap-3/fitur-ke-teknis.mdx");
const caraPakai = baca("situs/src/content/docs/cara-pakai.mdx");
const glosMdx = baca("situs/src/content/docs/alat/glosarium.mdx");
const widgetJson = JSON.parse(baca("situs/data/widget/t3-cache-invalidation.json")) as {
  sumber: string; cocok: string; tanpaAcuan: string; ubahJudul: string;
  pilihNilai: Record<string, { nilai: string | number; label: string }[]>;
};
const widgetAstro = baca("situs/src/components/CacheInvalidation.astro");

// ---- bagian rekaman -------------------------------------------------------------------------------
type Rek = { baris: string[]; judul: (h: string) => number; bagian: (h: string) => string[]; akhir: (h: string) => number };
const rekaman = (teks: string): Rek => {
  const baris = teks.split("\n");
  const judul = (h: string): number => {
    const i = baris.findIndex((b) => b.startsWith(`# --- ${h}. `));
    if (i < 0) throw new Error(`rekaman: bagian ${h} tidak ada`);
    return i;
  };
  const batas = (h: string): number => {
    const a = judul(h);
    const z = baris.findIndex((b, i) => i > a && b.startsWith("# --- "));
    return z < 0 ? baris.length : z;
  };
  return {
    baris,
    judul,
    bagian: (h) => baris.slice(judul(h) + 1, batas(h)),
    akhir: (h) => {
      let z = batas(h);
      while (z > 0 && !baris[z - 1]!.trim()) z--;
      return z; // nomor baris 1-based dari baris isi terakhir
    },
  };
};
const M = rekaman(memoriTxt);
const R = rekaman(redisTxt);
const G = rekaman(gagalTxt);
const B = rekaman(bebanTxt);
const cari = (pola: RegExp, baris: string[], nama: string): RegExpMatchArray => {
  const m = baris.map((x) => x.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const barisNo = (baris: string[], pola: RegExp, dari = 0): number => {
  const i = baris.findIndex((b, k) => k >= dari && pola.test(b));
  if (i < 0) throw new Error(`jangkar tidak ada: ${pola}`);
  return i + 1;
};
const rentang = (baris: string[], awal: RegExp, akhir: RegExp): string => {
  const a = barisNo(baris, awal);
  return `${a}:${barisNo(baris, akhir, a - 1)}`;
};
const hitung = (teks: string, pola: RegExp): number => (teks.match(pola) ?? []).length;
const barisRiset = (id: string): string => {
  const b = riset.split("\n").filter((x) => x.startsWith(`| ${id} |`));
  expect(b, `baris riset ${id}`).toHaveLength(1);
  return b[0]!;
};
const koma = (n: number, d = 2): string => n.toFixed(d).replace(".", ",");
const ribuan = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rupiah = (n: number): string => `Rp${ribuan(n)}`;
const kata = (n: number): string => ["nol", "satu", "dua", "tiga", "empat", "lima", "enam"][n]!;
const fungsi = (kode: string, nama: RegExp): string => {
  const bagian = kode.split(/^(?=func )/m);
  const f = bagian.find((x) => nama.test(x.split("\n")[0]!));
  if (!f) throw new Error(`fungsi tidak ada: ${nama}`);
  return f;
};

const kodeCache = cacheGo.split("\n");
const kodeKc = kcGo.split("\n");
const kodeKat = katGo.split("\n");

// ---- nilai turunan dari rekaman, kode, naskah, dan riset ------------------------------------------
const ttlMemori = Number(cari(/\(TTL (\d+) detik\)/, M.baris.slice(0, 8), "TTL memori")[1]);
const hargaAwal = Number(cari(/"harga":(\d+),"harga_efektif":\d+,"stok":50/, M.bagian("A"), "harga awal")[1]);
const hargaPromo = Number(cari(/^Budi {2}lewat instance A: .*"harga_efektif":(\d+)/, M.bagian("B"), "harga promo")[1]);
const potongan = Number(cari(/POST \/promo potongan (\d+)%/, M.bagian("B"), "potongan")[1]);
const hapusA = Number(cari(/^instance A: .*kunci dihapus (\d+)/, M.bagian("B"), "hapus A")[1]);
const hapusB = Number(cari(/^instance B: .*kunci dihapus (\d+)/, M.bagian("B"), "hapus B")[1]);
const pesan = cari(/"nominal":(\d+),"harga_satuan":(\d+),"potongan_persen":(\d+),"stok_sisa":(\d+)/, M.bagian("C"), "pesanan");
const stokAwal = Number(cari(/^Citra lewat instance B: .*"stok":(\d+)/, M.bagian("C"), "stok cache B")[1]);
const hariTerakhir = cari(/detik ke-(\d+): masih entri lama/, M.bagian("D"), "detik masih lama");
const hariHabis = cari(/detik ke-(\d+): entri habis/, M.bagian("D"), "detik habis");
const versiRedis = cari(/Redis (\d+\.\d+\.\d+)/, R.baris.slice(0, 6), "versi Redis")[1]!;
const goRedis = cari(/go-redis (v\d+\.\d+\.\d+)/, R.baris.slice(0, 7), "go-redis rekaman")[1]!;
const goRedisMod = cari(/github\.com\/redis\/go-redis\/v9 (v[\d.]+)/, goMod.split("\n"), "go-redis go.mod")[1]!;
const batasMs = Number(cari(/batas (\d+) ms/, R.baris.slice(0, 7), "batas ms")[1]);
const ttlRedis = Number(cari(/-katalog-ttl (\d+)s/, R.baris.slice(0, 7), "TTL Redis")[1]);
const pttl = cari(/paling banyak ([\d.]+) ms \(TTL 60 detik terpasang\)/, R.bagian("A"), "PTTL")[1]!;
const hargaUbah = Number(cari(/PATCH \/produk\/<Nasi goreng> harga (\d+)/, R.bagian("B"), "harga ubah")[1]);
const ttlG = Number(cari(/^# TTL (\d+) detik di bagian ini/, R.bagian("G"), "TTL G")[1]);
const mulai = Number(cari(/mulai (\d+) detik lagi/, R.bagian("G"), "mulai G")[1]);
const jeda = Number(cari(/CLIENT PAUSE (\d+) ALL/, G.bagian("A"), "PAUSE")[1]) / 1000;
const batasB = Number(cari(/-katalog-redis-timeout (\d+)s/, G.bagian("A"), "batas 5s")[1]);
const lambat = cari(/lebih dari ([\d,]+) detik/, G.bagian("A"), "lebih dari")[1]!;
const limaN = Number(cari(/^Budi lewat instance A: (\d+) kali GET/, G.bagian("A"), "lima bacaan")[1]);
const serentak = Number(cari(/(\d+) GET \/katalog\?warung=418 serentak/, G.bagian("B"), "serentak")[1]);
const koneksiMaks = Number(cari(/paling banyak (\d+) koneksi/, G.bagian("B"), "koneksi maks")[1]);
const patchN = Number(cari(/^Ani: (\d+) kali PATCH -> 500/, G.bagian("D"), "PATCH gagal")[1]);
const statD = G.bagian("D").filter((b) => b.startsWith("instance A: "));
const dbSesudah = Number(cari(/baca database (\d+)/, [statD[0]!], "db sesudah")[1]);
const dbSelalu = Number(cari(/baca database (\d+)/, [statD[1]!], "db selalu")[1]);
const bebanB = cari(/^(\d+) bacaan -> baca database (\d+), hit 0$/, B.bagian("B"), "beban B");
const bebanC = cari(/^(\d+) bacaan -> baca database (\d+), hit (\d+), galat cache 0$/, B.bagian("C"), "beban C");
const kunciN = Number(cari(/bergilir atas (\d+) kunci/, B.baris.slice(0, 7), "kunci")[1]);
const lambda = cari(/(\d+,\d+) per detik/, B.baris.slice(0, 7), "lambda")[1]!;
const batasWMs = Number(cari(/di bawah (\d+) ms/, B.bagian("B"), "batas W")[1]);
const batasL = cari(/di bawah ([\d,]+) koneksi dari pool (\d+)/, B.bagian("B"), "batas L");
const naskahW = cari(/W = (\d+) ms \(Asumsi\), L = ([\d,]+) x ([\d,]+) = ([\d,]+)/, B.bagian("B"), "W naskah");
const reqHari = cari(/(\d[\d.]*) × (\d+) = (\d[\d.]*) per hari/, naskah.split("\n"), "request per hari");
const barisKatalog = cari(/^\| Katalog \| [^|]*; (\d+)% request; (\d+) ms \|/, naskah.split("\n"), "baris katalog naskah");
const prdBeban = cari(/(\d[\d.]*) ÷ (\d[\d.]*) × (\d+) = 17,36 \(asumsi\)/, prd.split("\n"), "beban PRD");
const pemicu = Number(cari(/mencapai (\d+) koneksi/, hal231.split("\n").filter((b) => b.startsWith("| Cache |")), "pemicu ADR 21")[1]);
const aktif = Number(reqHari[1]!.replace(".", ""));
const reqUser = Number(reqHari[2]);
const reqHariN = Number(reqHari[3]!.replace(/\./g, ""));
const persenKat = Number(barisKatalog[1]);
const wMs = Number(barisKatalog[2]);
const bacaHari = (reqHariN * persenKat) / 100;
const detikHari = Number(prdBeban[2]!.replace(".", ""));
const puncak = Number(prdBeban[3]);
const lambdaTepat = (bacaHari / detikHari) * puncak;
const lambdaNilai = Number(lambda.replace(",", "."));
const wDetik = wMs / 1000;
const lNilai = lambdaNilai * wDetik;
const jarak = Math.round(pemicu / Number(koma(lNilai, 3).replace(",", ".")));

const kunci = cari(/redis GET (katalog:\d+:\d+)/, R.bagian("A"), "kunci katalog")[1]!;
const kunciKota = cari(/\(SCAN (katalog:\d+:)\* lalu DEL\)/, R.bagian("C"), "awalan kota")[1]!;
const warung = Number(cari(/\?warung=(\d+)/, M.bagian("A"), "warung")[1]);
const naik4 = Number(cari(/naik (\d+) kali/, naskah4.split("\n"), "naik kali Tahap 4")[1]);
const minggu = Number(cari(/^\| M23 \| (\d+) \|/, naskah.split("\n"), "minggu M23")[1]);
const mingguCache = Number(cari(/Di minggu (\d+) Nadia menambah cache katalog/, naskah.split("\n"), "minggu cache")[1]);
const r190 = barisRiset("R3-190");
const r191 = barisRiset("R3-191");
const r192 = barisRiset("R3-192");
const r193 = barisRiset("R3-193");
const tanggal = cari(/dibuka mentah (\d{4}-\d{2}-\d{2})/, [r190], "tanggal R3-190")[1]!;
const azure = cari(/ms\.date (\d{4}-\d{2}-\d{2})/, [r190], "ms.date")[1]!;
const cm = cari(/cache-manager (\d+\.\d+\.\d+)/, [r193], "cache-manager")[1]!;
const cmTerbit = cari(/terbit (\d{4}-\d{2}-\d{2}); README/, [r193], "terbit cache-manager")[1]!;
const laravel = cari(/`laravel\/framework` v(\d+\.\d+\.\d+) di packagist/, [r193], "laravel")[1]!;
const django = cari(/Django (\d+\.\d+\.\d+) di PyPI/, [r193], "Django")[1]!;
const serverpodDok = cari(/Version: (\d+\.\d+\.\d+)/, [r193], "serverpod dok")[1]!;
const serverpod = cari(/serverpod (\d+\.\d+\.\d+) di pub\.dev/, [r193], "serverpod pub")[1]!;
const fbJam = cari(/approximately (\d\.\d) hours/, [r191], "jam Facebook")[1]!.replace(".", ",");
const djangoDetik = Number(cari(/`TIMEOUT` bawaan (\d+) detik/, [r193], "TIMEOUT Django")[1]);
const cdnDetik = Number(cari(/up to (\d+) seconds/, [r193], "CDN detik")[1]);
const cdnJam = Number(cari(/typically set to (\d+) hour/, [r193], "CDN jam")[1]);
const meta = halaman.match(/^<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-m23\]\] · Jalur inti<\/p>$/m)!;
const rekamanRentang = ["D", "E", "F"].map((h) => `"labs/t3-cache/output/redis.txt:${R.judul(h) + 1}:${R.akhir(h)}"`).join(",");

const V: Record<string, string | number> = {
  awal: rupiah(hargaAwal), ubah: rupiah(hargaUbah), promo: rupiah(hargaPromo), potongan, ttlMemori, ttlRedis, ttlG, mulai, jeda,
  pttl, batasMs, batas5: batasB, lambat15: lambat, goRedis, redis: versiRedis, bacaan: Number(bebanB[1]), tanpaDb: Number(bebanB[2]),
  redisDb: Number(bebanC[2]), kunciN, aktif: ribuan(aktif), reqUser, reqHari: ribuan(reqHariN), persenKat, bacaHari: ribuan(bacaHari),
  detikHari: ribuan(detikHari), puncak, lambda, lambdaTepat: koma(lambdaTepat, 3), wMs, w: koma(wDetik, 3), l: koma(lNilai, 3),
  jarak, pemicu, pool: Number(batasL[2]), batasWMs, batasL: batasL[1]!, serentak, koneksiMaks, patchN, dbSesudah, dbSelalu,
  lima: kata(limaN), stokBaru: Number(pesan[4]), stokAwal, azure, tanggal, cm, cmTerbit, laravel, django, serverpodDok, serverpod,
  fbJam, djangoDetik, ubahN: hargaUbah, kunci, kunciKota, warung, naik4, minggu, mingguCache, cdnDetik, cdnJam,
  laravelMayor: laravel.split(".")[0]!, djangoMinor: django.split(".").slice(0, 2).join("."),
  bacaRentang: rentang(kodeCache, /^func \(k \*Katalog\) Baca\(/, /^}$/),
  penyimpanRentang: rentang(kodeCache, /^type Penyimpan interface \{/, /^}$/),
  ubahRentang: rentang(kodeKc, /^func \(s Service\) ubahProdukDenganCache\(/, /^}$/),
  pesanRentang: rentang(kodeKat, /p, err := tx\.KunciProduk\(ctx, produk\)/, /h\.Nominal = h\.HargaSatuan \* int64\(porsi\)/),
  rekamanRentang,
};
const isi = (t: string): string =>
  t.replace(/«(\w+)»/g, (_, k: string) => {
    if (!(k in V)) throw new Error(`placeholder tidak dikenal: ${k}`);
    return String(V[k]);
  });

// ---- isi halaman, unit demi unit (dipisah baris kosong); «nama» diisi dari sumber lewat isi() ----
const EXPECT: string[] = [
  "import Blok from \"../../../components/Blok.astro\";\nimport Rantai from \"../../../components/Rantai.astro\";\nimport Snippet from \"../../../components/Snippet.astro\";\nimport TabSet from \"../../../components/TabSet.astro\";\nimport CacheInvalidation from \"../../../components/CacheInvalidation.astro\";\nimport intiDiagram from \"../../../../data/diagram/t3-cache-inti.json\";",
  "<p class=\"meta\">Baca 19 menit · coba 3 menit · Prasyarat: [[t3-m23]] · Jalur inti</p>",
  "<Blok nama=\"Mulai\" buka>",
  "## Inti",
  "Satu cache bersama menyatukan harga bila kunci dihapus sesudah COMMIT, dan TTL membatasi celah yang tersisa.",
  "<Rantai data={intiDiagram} ringkas />",
  "Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `redis.txt` bagian E, Ani mengubah harga dari «awal» ke «ubah». Kunci dihapus sesudah COMMIT, dan Citra di instance lain langsung melihat «ubah». Bagian D membalik urutannya: kunci hilang sebelum COMMIT, pembaca di celah mengisi «awal» lagi, dan harga lama bertahan sampai TTL habis.",
  "Urutan yang benar masih punya satu celah. Di bagian F, pembaca yang membaca database sebelum tulis menyimpan «awal» sesudah kunci dihapus, dan hanya TTL yang membatasinya.",
  "Beban katalog juga tidak memaksa cache. Tanpa cache, «bacaan» bacaan menjadi «tanpaDb» baca database (`beban.txt` bagian B). Rekaman memeriksa W di bawah «batasWMs» ms dan L di bawah «batasL» koneksi dari pool «pool».",
  "<details class=\"question\">\n<summary>Sudah tahu? Cek 3 pertanyaan</summary>",
  "1. Ani mengubah harga di database. Kunci cache dihapus sebelum COMMIT atau sesudah COMMIT: mana yang meninggalkan harga lama sampai TTL habis, dan kenapa?\n2. Kenapa urutan yang benar masih punya satu celah, dan apa yang membatasinya?\n3. Citra melihat «awal» di layar, sedangkan database menyebut «promo». Berapa yang ditagih saat ia memesan, dan dari mana harganya dibaca?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Coba\" buka aman=\"Kalau berhenti di sini, kamu sudah tahu: satu cache bersama dengan hapus kunci sesudah COMMIT menyatukan harga di kedua instance, dan hanya TTL yang membatasi pembaca lambat dan promo yang mulai nanti.\">",
  "Widget ini membaca satu entri katalog: harga nasi goreng di warung Ani berubah, dan cache menyimpan salinannya. Tebak dulu kapan Citra pertama kali melihat harga promo, lalu ubah satu hal dan lihat siapa yang masih melihat harga lama.",
  "<CacheInvalidation />",
  "Pengaturan yang cocok dengan rekaman diberi chip Cocok dengan Rekaman lab. Pengaturan lain adalah Ilustrasi dari aturan simulasi, dan widget menyebutnya.",
  "Pilih **Redis bersama**, TTL **«ttlRedis»**, **Ani mengubah harga**, dan **Sesudah COMMIT**: tidak ada instance yang melihat harga lama (`redis.txt` bagian B). Ganti urutannya ke **Sesudah COMMIT, pembaca lambat**: harga lama bertahan «ttlRedis» detik, sampai TTL habis (bagian F). Pilih TTL **«ttlG»**, **Promo mulai «mulai» detik lagi**, dan **Sesudah COMMIT**: tidak ada tulis saat promo mulai, jadi hanya TTL yang membatasi (bagian G).",
  "<details class=\"abstract\">\n<summary>Rekaman bagian D, E, dan F (juga untuk pembaca tanpa JavaScript)</summary>",
  "<Snippet files={[«rekamanRentang»]} title=\"Rekaman lab: labs/t3-cache/output/redis.txt, bagian D, E, dan F\" />",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Paham\">",
  "### Kenapa ini ada",
  "[[t3-m23]] menunjukkan dua HP di meja yang sama dengan dua harga. Cache katalog ada di memori tiap instance, dengan TTL «ttlMemori» detik, dan promo yang dibuat lewat instance A hanya membuang entri di A. Citra di instance B melihat «awal» sampai entrinya habis di detik ke-«ttlMemori», dengan jam cache yang digeser lewat endpoint lab (`memori.txt` bagian B dan D).",
  "Cache ini tidak dituntut oleh beban. Naskah menghitung «aktif» user aktif × «reqUser» request = «reqHari» request per hari, dan «persenKat»% membaca katalog: «bacaHari» bacaan. Puncaknya «bacaHari» ÷ «detikHari» × «puncak» = «lambda» baca per detik («lambdaTepat» dibulatkan).",
  "Dengan W = «wMs» ms, L = λ × W = «lambda» × «w» = «l» koneksi dari pool «pool» ([[t3-pool]]). Semua masukan itu Asumsi, yaitu angka cerita tanpa rekaman, jadi hasilnya juga Asumsi.",
  "ADR 21 menunda cache sampai L kelas query itu mencapai «pemicu» koneksi ([[t2-adr-21]]). Katalog sekitar «jarak» kali di bawah pemicu itu («pemicu» ÷ «l»; Asumsi). Rekaman `beban.txt` bagian B tidak mengukur angka tersebut. Ia hanya memeriksa W di bawah «batasWMs» ms dan L di bawah «batasL».",
  "Karena itu ADR 28 di bawah adalah pilihan desain dengan alasan yang ditulis, bukan hasil ukur. Cache bukan syarat: tanpa cache adalah opsi yang sah, dan ADR memuat syarat untuk mencabutnya.",
  "### Cara kerjanya",
  "**Cache-aside: cache dulu, lalu database, lalu isi cache.** Cache-aside memeriksa cache lebih dulu, lalu membaca database bila entrinya tidak ada dan menyimpan hasilnya selama TTL. Pola ini dijelaskan di [Azure Architecture Center: Cache-Aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside), ms.date «azure», dibuka «tanggal».",
  "Salinan itu bisa stale, yaitu data yang sudah tidak terbaru. Dokumentasi yang sama menulis bahwa pola ini tidak menjamin konsistensi antara store dan cache. Kode lab menulisnya di `Katalog.Baca`:",
  "<Snippet file=\"labs/api-t3/internal/cache/cache.go\" lines=\"«bacaRentang»\" lang=\"go\" title=\"labs/api-t3/internal/cache/cache.go\" />",
  "Redis yang galat dilewati: jawaban diambil dari database dan tidak ada yang disimpan. Galat dari database dikembalikan apa adanya, tanpa menyimpan apa pun dan tanpa membuang entri yang hidup (`gagal.txt` bagian A dan E). Kunci katalog berbentuk `katalog:<kota>:<warung|semua>`, dan isinya JSON jawaban baca.",
  "Di `redis.txt` bagian A satu Redis melayani dua instance: instance A miss dan membaca database, instance B langsung hit, dan sisa TTL paling banyak «pttl» ms. Hit menggantikan query katalog, tetapi tiap request di belakang `wajibLogin` tetap membaca `sesi` dan `akun` di database (dibaca dari kode, tidak diukur).",
  "**Hapus kunci sesudah COMMIT.** Untuk menulis, ADR 28 memakai urutan UPDATE, COMMIT, lalu hapus kunci. Dokumentasi Azure menulis bahwa urutan itu penting: bila item cache dihapus lebih dulu, pembaca di celah mengambil data lama dari store dan menyimpannya lagi. Facebook memilih menghapus ketimbang memperbarui entri karena delete bersifat idempoten ([Nishtala dkk., NSDI 2013](https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf), bagian 2, dibuka «tanggal»).",
  "Bagian D dan E merekam kedua urutan, dengan gerbang lab yang menahan penulis tepat sebelum COMMIT. Kode lab memisahkan UPDATE dari COMMIT supaya urutannya bisa dipilih:",
  "<Snippet file=\"labs/api-t3/internal/service/katalog_cache.go\" lines=\"«ubahRentang»\" lang=\"go\" title=\"labs/api-t3/internal/service/katalog_cache.go\" />",
  "Tulis yang ditolak tidak menghapus apa pun. Urutan `selalu` menghapus kunci juga saat tulis gagal, dan dibahas di bawah. Celah sebelum COMMIT sempit, jadi gerbang lab memaksa satu pembaca masuk ke sana. Tanpa pembaca di celah, hasilnya sama dengan hapus sesudah COMMIT (dari mekanismenya, tidak direkam).",
  "Promo mengubah harga efektif semua menu di satu kota, jadi ia membuang semua kunci kota dengan `SCAN «kunciKota»*` lalu `DEL` (`redis.txt` bagian C). Dokumentasi `SCAN` menulis bahwa elemen yang tidak selalu ada selama iterasi boleh muncul atau tidak ([Redis: SCAN](https://redis.io/docs/latest/commands/scan/), halaman latest tanpa nomor versi, dibuka «tanggal»). Entri yang diisi pembaca di tengah iterasi bisa terlewat, dan lab tidak merekam perlombaan itu.",
  "**Hapus sesudah COMMIT belum menutup semuanya: pembaca lambat.** Di bagian F, satu pembaca di instance B membaca database dan mendapat «awal», lalu tertahan sebelum menyimpan. Ani mengubah harga, COMMIT selesai, dan kunci dihapus. Pembaca itu baru menyimpan hasil bacaannya sesudahnya, jadi Redis kembali berisi «awal» sampai TTL habis.",
  "Nishtala dkk. menyebutnya stale set: nilai yang disimpan ke cache tidak mencerminkan nilai terbaru karena pembaruan yang bersamaan tersusun ulang. Mereka menutupnya dengan lease, token terikat satu key yang ditolak bila cache sudah menerima delete untuk item itu (bagian 3.2.1). Lab tidak memakai lease, jadi hanya TTL yang membatasi (`redis.txt` bagian F). Rekaman hanya memuat Redis, dan cache di memori bisa mengalami hal yang sama (dari mekanismenya, tidak direkam).",
  "**Promo yang mulai nanti.** Promo yang dijadwalkan mulai di jam tertentu tidak punya tulis saat mulai. Jawaban katalog memuat `harga_efektif`, yang dihitung query dengan `now()` di database, jadi entri yang diisi sebelum promo mulai menyimpan harga tanpa potongan. Di `redis.txt` bagian G, promo dibuat dengan mulai «mulai» detik lagi, tidak ada kunci yang terhapus, dan entri lama dipakai sampai TTL habis.",
  "TTL di bagian G adalah «ttlG» detik, supaya habisnya entri bisa direkam tanpa menunggu semenit. Di ADR 28 TTL-nya «ttlRedis» detik, jadi harga promo bisa telat sampai «ttlRedis» detik (Asumsi). Dua cara menutupnya: TTL entri dipendekkan sampai waktu mulai promo berikutnya, atau harga efektif dihitung saat baca. Keduanya Tidak dijalankan di lab.",
  "**Hapus kunci adalah perintah ke Redis, dan Redis bisa mati.** Di `gagal.txt` bagian C, Redis dihentikan, Ani mengubah harga, dan PATCH tetap 200 karena database sudah COMMIT. Dua DEL gagal, untuk kunci kota dan kunci warung. Sesudah Redis hidup lagi, entri lama kembali dan Budi melihat «awal» padahal database «ubah».",
  "Entri kembali karena lab menulis snapshot dengan `SAVE` sebelum Redis berhenti. Apakah entri kembali tanpa `SAVE` manual tidak diuji. Kode tidak mengulang hapus kunci yang gagal, jadi hanya TTL yang menutupnya.",
  "**Galat backend bukan alasan menghapus entri.** Di `gagal.txt` bagian D, database menolak UPDATE dan Ani mengirim «patchN» PATCH yang semuanya 500. Dengan urutan `sesudah`, kunci tidak dihapus dan «patchN» bacaan berikutnya hit: «dbSesudah» baca database. Dengan urutan `selalu`, tiap galat menghapus kunci dan bacaan berikutnya jadi baca database: «dbSelalu».",
  "Kasus industri di ADR 28 menceritakan pola serupa di skala besar.",
  "**Redis menggantung atau mati: client cache butuh batas waktu per perintah.** Di `gagal.txt` bagian A, Redis dijeda «jeda» detik dengan `CLIENT PAUSE`: ia menerima koneksi tetapi tidak menjawab. Dengan batas «batasMs» ms, «lima» bacaan menjadi «lima» baca database dan «lima» galat cache, semuanya 200. Dengan batas «batas5» detik, sama dengan `DialTimeout` dan `ReadTimeout` bawaan go-redis «goRedis» (kode `options.go`, dibuka «tanggal»), satu bacaan menunggu lebih dari «lambat15» detik sampai jeda selesai.",
  "Di bagian B Redis dimatikan, dan «serentak» bacaan serentak menjadi «serentak» baca database. Semuanya 200, dengan koneksi PostgreSQL paling banyak «koneksiMaks». Lab tidak mengukur apakah ada bacaan yang mengantre di pool. Tanpa circuit breaker, tiap bacaan tetap membayar satu batas waktu selama Redis menggantung (dibaca dari kode, tidak diukur).",
  "**Uang tidak dibaca dari cache.** `Pesan` membaca harga dari database sesudah buku dan produk dikunci di transaction, dan tidak menyentuh cache:",
  "<Snippet file=\"labs/api-t3/internal/service/katalog.go\" lines=\"«pesanRentang»\" lang=\"go\" title=\"labs/api-t3/internal/service/katalog.go\" />",
  "Di `memori.txt` bagian C, Citra melihat «awal» lalu memesan: tagihannya «promo» (promo «potongan»%). Stok di database «stokBaru», sedangkan cache instance B masih menunjukkan «stokAwal». Dari kode (tidak dijalankan), hanya `PATCH /produk/{id}` dan `POST /promo` yang menghapus kunci katalog. `POST /sinkron` dan mode rentan `PUT /produk/{id}/stok` mengubah stok tanpa menghapusnya, jadi layar bisa menunjukkan stok lama sampai TTL.",
  "### Di stack lain",
  "**Skenario:** katalog yang dibaca berulang oleh lebih dari satu server, dan satu harga berubah. Yang ditanyakan: di mana cache bawaan hidup, bagaimana entri dibuang saat data berubah, dan apa yang membantu saat banyak pembaca miss serentak.",
  "Tab Go dijalankan di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada «tanggal». Tanda [perlu verifikasi] berarti klaim itu belum bisa dicek ke sumber primer.",
  "<TabSet id=\"stack\" labels={[\"Go\", \"Node.js\", \"Laravel\", \"Django\", \"Dart (Serverpod)\", \"Supabase\"]}>\n<Fragment slot=\"t0\">",
  "*Dijalankan: lab api-t3 dan t3-cache, go-redis «goRedis», Redis «redis» (rekaman `redis.txt` dan `gagal.txt`).*",
  "<Snippet file=\"labs/api-t3/internal/cache/cache.go\" lines=\"«penyimpanRentang»\" lang=\"go\" title=\"labs/api-t3/internal/cache/cache.go\" />",
  "**Yang berbeda di stack ini:** lab menulis cache-aside sendiri di `internal/cache`. `go.mod` hanya memuat pgx, go-redis, dan x/crypto sebagai dependency langsung, jadi tidak ada library cache. Tiga penyimpan memenuhi satu antarmuka: memori proses, Redis, dan satu penyimpan kosong yang hanya dipakai lab untuk mengukur tanpa cache. Service tidak tahu mana yang dipakai. Perlindungan untuk miss serentak tidak ada: tiap miss membaca database, dan jumlahnya tidak direkam.",
  "</Fragment>\n<Fragment slot=\"t1\">",
  "*Tidak dijalankan. Dicek ke README [cache-manager](https://unpkg.com/cache-manager@«cm»/README.md) «cm» (npm latest, terbit «cmTerbit»), dibuka «tanggal». Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"js\" code={`import { createCache } from \"cache-manager\";\nimport { createKeyv as createKeyvRedis } from \"@keyv/redis\";",
  "const cache = createCache({\n  stores: [createKeyvRedis(\"redis://127.0.0.1:6379\")],\n});",
  "// baca: TTL dalam milidetik\nconst menu = await cache.wrap(\"«kunci»\", () => bacaKatalog(«warung»), «ttlRedis»_000);",
  "// tulis: database dulu, lalu hapus kunci\nawait ubahHarga(produkId, «ubahN»);\nawait cache.del(\"«kunci»\");`} />",
  "**Yang berbeda di stack ini:** penyimpanan bawaan ada di memori, dan Redis masuk lewat adapter Keyv. README memuat contoh dua lapis: memori lalu Redis. `wrap` mengikuti cache-aside, dan TTL ditulis dalam milidetik. Dengan `refreshThreshold`, `wrap` mengembalikan nilai lama sambil memperbarui di latar. README mencatat bahwa bila ambangnya rendah dan fungsinya lambat, kunci bisa habis dan muncul racing condition saat memperbarui nilai.",
  "</Fragment>\n<Fragment slot=\"t2\">",
  "*Tidak dijalankan. Dicek ke [Laravel «laravelMayor».x: Cache](https://laravel.com/docs/«laravelMayor».x/cache), dibuka «tanggal», `laravel/framework` «laravel». Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"php\" code={`$menu = Cache::remember('«kunci»', «ttlRedis», fn () => $this->bacaKatalog(«warung»));",
  "// tulis: database dulu, lalu hapus kunci\n$produk->update(['harga' => «ubahN»]);\nCache::forget('«kunci»');`} />",
  "**Yang berbeda di stack ini:** dokumentasi menulis bahwa Laravel secara bawaan memakai driver cache `database`, yang menyimpan objek cache di database aplikasi. Method `Cache::remember` mengisi saat miss, dan `Cache::forget` menghapus kunci. Method `Cache::flexible` menerima dua angka: sampai angka pertama nilai dianggap segar, dan di antara kedua angka nilai stale disajikan. Nilai itu disegarkan sesudah respons terkirim, pola stale-while-revalidate.",
  "</Fragment>\n<Fragment slot=\"t3\">",
  "*Tidak dijalankan. Dicek ke [Django «djangoMinor»: Cache framework](https://docs.djangoproject.com/en/«djangoMinor»/topics/cache/), dibuka «tanggal», Django «django» di PyPI. Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"python\" code={`menu = cache.get_or_set(\"«kunci»\", lambda: baca_katalog(«warung»), «ttlRedis»)",
  "# tulis: database dulu, lalu hapus kunci\nProduk.objects.filter(pk=produk_id).update(harga=«ubahN»)\ncache.delete(\"«kunci»\")`} />",
  "**Yang berbeda di stack ini:** cache bawaan Django adalah local-memory. Dokumentasinya menulis bahwa tiap proses punya instance cache sendiri. Dua proses tidak berbagi entri, seperti M23. Nilai `TIMEOUT` bawaan «djangoDetik» detik, dan Django menyediakan backend Redis sendiri, `django.core.cache.backends.redis.RedisCache`.",
  "Halaman itu tidak menyebut perlindungan untuk miss serentak pada `get_or_set`.",
  "</Fragment>\n<Fragment slot=\"t4\">",
  "*Tidak dijalankan. Dicek ke [Serverpod: Caching](https://docs.serverpod.dev/concepts/endpoints-and-apis/caching), halaman bertanda versi dokumentasi «serverpodDok», rilis terbaru di pub.dev «serverpod», dibuka «tanggal». Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"dart\" code={`Future<List<WarungMenu>?> katalog(Session session, int warungId) {\n  return session.caches.global.get(\n    '«kunciKota»$warungId',\n    CacheMissHandler(\n      () async => bacaKatalog(session, warungId),\n      lifetime: const Duration(seconds: «ttlRedis»),\n    ),\n  );\n}",
  "// tulis: database dulu, lalu hapus kunci\nawait WarungMenu.db.updateRow(session, menu);\nawait session.caches.global.invalidateKey('«kunciKota»$warungId');`} />",
  "**Yang berbeda di stack ini:** ada tiga cache. Cache `local` hidup di memori server yang menangani panggilan dan menjadi pilihan bawaan. Cache `global` memakai Redis dan dipakai bersama semua instance. Saat banyak request miss pada key yang sama, cache lokal menjalankan handler sekali dan yang lain menunggu hasilnya, sedangkan cache global menjalankannya per request.",
  "Contoh invalidate di dokumentasi memakai cache lokal, dan `invalidateKey` pada cache global tidak dicontohkan [perlu verifikasi]. Bila Redis tidak dikonfigurasi, cache global jatuh ke memori satu proses tanpa peringatan pada level log biasa, dan readiness probe tetap lolos.",
  "</Fragment>\n<Fragment slot=\"t5\">",
  "*Tidak dijalankan. Dicek ke [Supabase: Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn), dibuka «tanggal».*",
  "**Yang berbeda di stack ini:** halaman itu mendokumentasikan cache untuk file di Storage, bukan untuk baris database. Smart CDN menyinkronkan metadata aset ke edge dan membatalkan cache saat aset diubah atau dihapus, dalam paling lama «cdnDetik» detik. Browser bisa tetap memakai salinannya, jadi dokumentasi menyarankan TTL browser yang pendek lewat `cacheControl` bila aset mungkin dihapus, dan menulis bawaannya biasanya «cdnJam» jam. Halaman yang dibuka tidak memuat cache bawaan untuk query database [perlu verifikasi].",
  "</Fragment>\n</TabSet>",
  "</Blok>",
  "<Blok nama=\"Putuskan\">",
  "### ADR 28: cache katalog di Redis bersama, TTL «ttlRedis» detik, hapus kunci sesudah COMMIT, tagihan dari database",
  "**Kebutuhan.** Dua HP di meja yang sama menampilkan «promo» dan «awal» untuk menu yang sama (`memori.txt` bagian B). Dua instance harus melihat harga yang sama sesudah Ani atau HR mengubahnya, dan tagihan tidak boleh bergantung pada salinan mana pun.",
  "Beban tidak memaksa cache: katalog «lambda» baca per detik, L = «l» koneksi dari pool «pool» (Asumsi, rumus di Paham). Tanpa cache, «bacaan» bacaan menjadi «tanpaDb» baca database. Dengan Redis jadi «redisDb» (`beban.txt` bagian B dan C).",
  "**Status:** diterima sesudah M23 (minggu «minggu»), memakai dua instance dari ADR 26 ([[t3-dua-instance]]). Urutan itu dibaca dari tabel masalah, karena naskah tidak menulis tanggal ADR. ADR ini menyimpang dari pemicu cache ADR 21: L kelas katalog «l» belum mencapai «pemicu» koneksi ([[t2-adr-21]]).",
  "| | A. Tanpa cache | B. Cache di memori tiap instance | C. Cache bersama di Redis | D. ETag dan cache di app saja |\n|---|---|---|---|---|\n| Cara kerja | Tiap bacaan katalog membaca PostgreSQL | Peta di dalam proses API, TTL «ttlMemori» detik, satu salinan per instance | Satu Redis: `GET`, `SET` dengan TTL, `DEL`. Kunci per kota dan per warung, TTL «ttlRedis» detik | Server memberi ETag, dan app menyimpan jawaban terakhir. App mengirim ETag itu, dan server menjawab tidak berubah bila sama |\n| Kelebihan | Tanpa salinan, jadi tanpa data lama dan tanpa invalidation. Tanpa komponen baru | Tanpa komponen baru dan tanpa panggilan jaringan | Satu salinan untuk kedua instance, harga baru langsung di keduanya (`redis.txt` bagian B). «redisDb» baca database untuk «bacaan» bacaan | Mengurangi byte yang dikirim ke HP, dan salinan tinggal di perangkat |\n| Kekurangan | «tanpaDb» baca database untuk «bacaan» bacaan, bukan «redisDb» | Hanya instance yang menerima perubahan yang membuang entri. Harga lama bertahan sampai «ttlMemori» detik (`memori.txt` bagian B dan D) | Komponen yang bisa mati atau menggantung. Dua celah tersisa sesudah urutan benar (bagian F dan G) dan hapus kunci yang bisa gagal (`gagal.txt` bagian C). Tiap jalur tulis harus ingat menghapus | Salinan di HP tidak bisa dibatalkan dari server. Tanpa cache di server, server tetap membaca database untuk mencocokkan ETag (penalaran) |\n| Biaya operasional | Tidak ada | Tidak ada, tetapi invalidation lintas instance tidak mungkin tanpa saluran antar instance | Redis untuk dipasang, dipantau, dan diberi batas memori, ditambah batas waktu per perintah | Kode ETag di backend dan penyimpanan di app. App versi lama tidak memakainya |\n| Bukti | Rekaman lab `beban.txt` bagian B: W di bawah «batasWMs» ms, L di bawah «batasL» | Rekaman lab `memori.txt` bagian A sampai D | Rekaman lab `redis.txt`, `gagal.txt`, dan `beban.txt` bagian C | Tidak dijalankan. Tidak ada client Dart di lab |",
  "**Keputusan: opsi C.** Delapan aturan:",
  "1. Hanya jawaban baca katalog yang di-cache, di Redis, dengan TTL «ttlRedis» detik dan satu kunci per kota dan per warung (`redis.txt` bagian A).\n2. Tulis database dulu, COMMIT, baru hapus kunci. Tulis yang ditolak tidak menghapus apa pun (`redis.txt` bagian B, D, E dan `gagal.txt` bagian D).\n3. Harga dan stok yang dipakai pembayaran dibaca dari database di dalam transaction. Tidak ada jalur uang di kode lab yang membaca cache (`memori.txt` bagian C).\n4. Client Redis memakai batas waktu per perintah dan tanpa retry. Redis yang galat atau lambat berarti bacaan jatuh ke database tanpa menyimpan apa pun (`gagal.txt` bagian A dan B).\n5. Redis untuk cache dipisah dari Redis untuk batas login ([[t3-rate-limit-redis]]), dengan batas memori dan kebijakan eviction yang dipilih untuk cache. Lab tidak mengatur `maxmemory`, jadi aturan ini Tidak dijalankan.\n6. Setiap jalur tulis yang mengubah harga, stok, atau promo menghapus kuncinya, kecuali pesanan. Sekarang hanya `PATCH /produk/{id}` dan `POST /promo` yang menghapus kunci. Pesanan mengurangi stok tanpa menghapusnya: layar bisa menunjukkan stok lama sampai TTL, dan pesanan memeriksa stok di database (`memori.txt` bagian C). Jalur sinkron stok ([[t3-offline]]) harus menambahkan hapus kunci sebelum cache dipakai di produksi.\n7. Promo yang mulai di jam tertentu ditutup dengan TTL entri yang dipendekkan sampai waktu mulai, atau harga efektif yang dihitung saat baca. Sampai itu ada, harga promo bisa telat sampai TTL.\n8. Jumlah hit, miss, baca database, dan galat cache dipantau, dan lonjakan galat cache menjadi alert. Lab sudah menghitungnya di `/lab/cache`, tetapi belum ada alert.",
  "**Kenapa C, bukan A, B, atau D.**",
  "- **A tidak ditolak karena salah.** Rekaman menunjukkan database tanpa cache tetap di bawah batas W dan L, jadi hitungannya menunjuk ke A, dan naskah memilih C tanpa alasan terukur. Penalaran halaman ini: cache sudah ada sejak minggu «mingguCache», dan opsi C memperbaikinya dengan syarat pencabutan yang bisa diperiksa. Itu pilihan desain, bukan hasil ukur.\n- **B ditolak** karena tiap instance menyimpan salinannya sendiri dan tidak ada yang memberi tahu instance lain. Itu M23.\n- **D ditolak** karena salinan di HP tidak bisa dibatalkan dari server, dan cache lokal di app menambah satu tempat lagi yang bisa menampilkan harga lama.",
  "**Kasus industri: Facebook, 2010, gangguan sekitar «fbJam» jam.** Robert Johnson menulis bahwa sistem otomatis memeriksa nilai konfigurasi di cache, dan perubahan pada salinan persisten ditafsirkan tidak valid. Semua client mencoba memperbaikinya lewat query ke satu cluster database. Cluster itu kewalahan oleh ratusan ribu query per detik ([Facebook Engineering: More Details on Today's Outage](https://engineering.fb.com/2010/09/23/uncategorized/more-details-on-today-s-outage/), tanggal dari alamat halaman, dibuka «tanggal»).",
  "Tiap galat dari database ditafsirkan sebagai nilai tidak valid, dan client menghapus kunci cache yang sesuai. Aliran query berlanjut walau masalah asalnya sudah diperbaiki, sampai semua trafik ke cluster itu dihentikan.",
  "Batasnya: satu insiden, dan datanya konfigurasi, bukan harga katalog. Tulisan itu bukan bukti bahwa cache buruk. Padanan lab hanya sebagian. Urutan `selalu` menghapus kunci saat tulis gagal, bukan saat baca gagal, dan lab tidak merekam umpan balik atau database yang kewalahan (`gagal.txt` bagian D).",
  "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:",
  "1. Jalur tulis yang lupa menghapus kunci. Jalur sinkron stok dan `PUT /produk/{id}/stok` mengubah stok tanpa menghapusnya (dari kode, tidak dijalankan), dan tiap jalur tulis baru menambah satu tempat lagi yang bisa lupa. Pencegahannya aturan 6: satu fungsi yang dipanggil semua jalur tulis, satu tes per jalur, dan TTL yang tetap terpasang.\n2. Redis mati, menggantung, atau penuh tanpa ada yang tahu. Bacaan tetap dijawab dari database, tetapi tiap bacaan membayar satu batas waktu, dan hapus kunci yang gagal meninggalkan entri lama. Di sistem 64-bit Redis secara bawaan tidak membatasi memori dataset. Dokumentasinya menyarankan dua instance bila cache bercampur dengan kunci yang harus bertahan ([Redis: key eviction](https://redis.io/docs/latest/develop/reference/eviction/), halaman latest tanpa nomor versi, dibuka «tanggal»). Kunci hitungan batas login dan kunci cache sama-sama punya masa berlaku, jadi kebijakan `volatile` tidak membedakan keduanya (penalaran dari kode). Pencegahannya aturan 4, 5, dan 8.\n3. Cache menjadi sumber angka uang. Seseorang memakai katalog untuk memeriksa stok atau menghitung tagihan, dan angka yang stale menggerakkan uang. Pencegahannya aturan 3 dan satu tes yang memastikan `Pesan` tidak membaca cache.",
  "**Kapan keputusan ini salah.**",
  "- Saat tanpa cache ternyata cukup: hit rate rendah, atau baca database tanpa cache tetap di bawah batas W dan L. Cabut cache dan hapus kode invalidation-nya.\n- Saat harga di layar tidak boleh berbeda dari tagihan sama sekali. Cache menyisakan selang stale yang hanya dibatasi TTL, dan hanya tanpa cache yang menutupnya.\n- Saat pembaca lambat sering mengisi ulang entri sesudah hapus kunci (`redis.txt` bagian F). Lease atau TTL yang lebih pendek hanya membatasinya.\n- Saat Redis menjadi komponen kritis tanpa cadangan, atau key penting terbuang saat memori penuh.",
  "**Yang akan merevisinya.** [[t3-offline]] (ADR 29) menambah jalur tulis stok lewat sinkron, yang belum menghapus kunci. [[t3-adr-33]] mencatat cache saldo dan riwayat sebagai yang sengaja belum dilakukan (naskah). Tahap 4 menaikkan puncak request ±«naik4» kali (naskah Tahap 4, Asumsi), jadi L katalog dihitung ulang dengan rumus yang sama.",
  "### Sengaja belum dilakukan",
  "| Yang ditunda | Kenapa ditunda | Muncul lagi di |\n|---|---|---|\n| Lease atau kedaluwarsa dini untuk miss serentak | Di rekaman «bacaan» bacaan atas «kunciN» kunci dengan TTL «ttlRedis» detik menjadi «redisDb» baca database (`beban.txt` bagian C). Perlombaan antar pembaca pada satu kunci dingin tidak direkam. Nishtala dkk. memakainya di skala jauh lebih besar | Bila satu kunci panas habis dan banyak pembaca menekan database |\n| Menutup promo yang mulai nanti | TTL «ttlRedis» detik membatasi telatnya. Memendekkan TTL entri atau menghitung harga efektif saat baca Tidak dijalankan di lab | Saat HR memakai promo terjadwal di jam sibuk |\n| Redis dengan autentikasi, TLS, replika, dan `maxmemory` terukur | Lab memakai Redis lokal tanpa autentikasi dan tanpa batas memori (README lab) | Belum dijadwalkan |\n| ETag dan cache di app | Tidak ada client Dart di lab, dan salinan di HP tidak bisa dibatalkan dari server | Bila beban katalog menuntut pengurangan byte, bukan baca database |",
  "</Blok>",
  "<Blok nama=\"Kunci\">",
  "### Cek diri",
  "**1.** Ani mengubah harga dan kunci dihapus sebelum COMMIT. Apa yang terlihat sesudahnya?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Pembaca di celah membaca «awal» dari database yang belum melihat «ubah», lalu menyimpannya lagi. Redis berisi «awal» padahal database «ubah», dan hanya TTL yang menutupnya (`redis.txt` bagian D). Dengan hapus sesudah COMMIT, Citra langsung melihat «ubah» (bagian E).",
  "</details>",
  "**2.** Kunci sudah dihapus sesudah COMMIT, tetapi Redis kembali berisi harga lama. Bagaimana itu bisa terjadi?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Pembaca lambat membaca database sebelum tulis, lalu menyimpan hasilnya sesudah COMMIT dan hapus kunci selesai. Entri lama bertahan sampai TTL habis (`redis.txt` bagian F). Lease menutupnya, tetapi lab tidak memakainya.",
  "</details>",
  "**3.** Citra melihat «awal» di layar, lalu memesan satu nasi goreng saat promo «potongan»% berlaku. Berapa tagihannya, dan dari mana harganya dibaca?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "«promo», dibaca dari database di dalam transaction, bukan dari cache. Stok di database «stokBaru» sementara cache instance B masih «stokAwal» (`memori.txt` bagian C).",
  "</details>",
  "**4.** Redis mati dan «serentak» bacaan katalog datang serentak. Apa yang terjadi pada jawaban dan pada database?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Semua «serentak» bacaan dijawab 200, dan semuanya menjadi baca database. Koneksi PostgreSQL paling banyak «koneksiMaks». Lab tidak mengukur apakah ada bacaan yang mengantre di pool (`gagal.txt` bagian B).",
  "</details>",
  "**5.** Katalog «lambda» baca per detik dengan W = «wMs» ms. Apakah database butuh cache, dan apa kata ADR 28?",
  "<details class=\"success\">\n<summary>Jawaban</summary>",
  "Tidak: L = «lambda» × «w» = «l» koneksi dari pool «pool» (Asumsi), sekitar «jarak» kali di bawah pemicu «pemicu» koneksi di ADR 21. ADR 28 menulis itu apa adanya, memilih cache dengan alasan yang bukan beban, dan menulis syarat untuk mencabutnya.",
  "</details>",
  "### Saat me-review kode AI, cek ini",
  "- [ ] Ada alasan terukur untuk cache, dan tanpa cache sudah dipertimbangkan sebagai opsi.\n- [ ] Setiap entri punya TTL, dan jalur tulis menghapus kunci sesudah COMMIT, bukan sebelumnya.\n- [ ] Setiap jalur yang mengubah data yang di-cache menghapus kuncinya, termasuk sinkron, impor, dan admin, kecuali pengecualian yang tertulis di ADR.\n- [ ] Tagihan dan keputusan uang dibaca dari database di dalam transaction, bukan dari cache.\n- [ ] Galat dari database tidak menghapus entri dan tidak diisi ke cache.\n- [ ] Client cache punya batas waktu per perintah, tanpa retry bawaan, dan jalur jatuh ke database.\n- [ ] Nama key memuat semua yang memengaruhi hasil, dan hasil yang bergantung pada jam tidak disimpan lebih lama dari yang masih benar.",
  "### Bacaan lanjut",
  "- [Azure Architecture Center: Cache-Aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)\n- [Nishtala dkk.: Scaling Memcache at Facebook (NSDI 2013)](https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf)\n- [Facebook Engineering: More Details on Today's Outage](https://engineering.fb.com/2010/09/23/uncategorized/more-details-on-today-s-outage/) (2010)\n- [Redis: key eviction](https://redis.io/docs/latest/develop/reference/eviction/)\n- [Redis: SCAN](https://redis.io/docs/latest/commands/scan/)",
  "</Blok>",
];

const unitHalaman = halaman.trim().split(/\n{2,}/);

const idHalaman = (id: string) => (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; peran?: string[]; menit?: number; path?: string; adr?: number[]; topik?: string; masalah?: string; pendek?: string }[]).find((x) => x.id === id)!;

describe("halaman 3.19: isi dikunci unit demi unit, nilai diturunkan dari sumber", () => {
  test("frontmatter, meta, dan registry", () => {
    const h = idHalaman("t3-cache");
    expect(h.ada).toBe(true);
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.lab, h.prasyarat, h.peran, h.path, h.adr, h.topik]).toEqual(["3.19", "konsep", 4, true, ["t3-cache"], ["t3-m23"], ["backend"], "tahap-3/cache-invalidation.md", [28], "Skala dan kinerja"]);
    expect(h.judul).toBe("Cache dan invalidation + ADR 28");
    expect(frontmatter).toContain(`title: "${h.nomor} ${h.judul}"`);
    expect(frontmatter).toContain(
      "description: Cache katalog pindah dari memori tiap instance ke satu Redis, dengan hapus kunci sesudah COMMIT dan TTL 60 detik. Tagihan tetap dibaca dari database, dan ADR 28 menulis kapan pilihan ini salah.",
    );
    expect(frontmatter).toContain(`TTL ${ttlRedis} detik`);
    expect(naskah).toMatch(/\| 3\.19 \| 4 \| Cache dan invalidation \+ ADR 28 \| Konsep \+ ADR \| ★ \| t3-cache \| W3-cache \|/);
    expect(meta).not.toBeNull();
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(Number(meta[2])).toBe(3);
    const isiProsa = halaman.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isiProsa.match(/\S+/g) ?? []).length;
    expect(Math.abs(jumlah / 200 - Number(meta[1])), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("EXPECT: semua unit halaman sama dengan yang diturunkan dari sumber, urutan dan isinya", () => {
    expect(unitHalaman).toEqual(EXPECT.map(isi));
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka; komponen widget dipasang sekali di blok Coba", () => {
    const b = daftarBlok(halaman);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect(halaman.match(/<CacheInvalidation \/>/g)).toHaveLength(1);
    const coba = halaman.slice(halaman.indexOf('<Blok nama="Coba"'), halaman.indexOf('<Blok nama="Paham">'));
    expect(coba).toContain("<CacheInvalidation />");
    expect(halaman).not.toMatch(/<(OutboxWorker|PoolLittle|WidgetLama)\b/);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil ke pembaca; satu bentuk per angka; tanpa kita, Anda, tanda seru, emoji", () => {
    const tampil = halaman + JSON.stringify(rantaiMentah);
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/\bPR ?#?\d{2,3}\b|\bkeputusan \d{3,4}\b/);
    expect(halaman.replace(/code=\{`[\s\S]*?`\}/g, "")).not.toMatch(/\bkita\b|\bAnda\b|!|\p{Extended_Pictographic}/u);
    expect(halaman).not.toMatch(/\b5,2\b|\b0,03\b|\b0,87\b|\b17,4\b/); // bentuk lain dari angka yang sama
    expect(hitung(halaman, /5,21/g)).toBeGreaterThanOrEqual(4);
    expect(halaman).not.toMatch(/hit tidak menyentuh database|paling lama 100 ms/);
    expect(halaman).not.toMatch(/AGPL|Valkey|lisensi/i);
    // klaim universal berlingkup: tidak ada "semua instance", "tidak pernah", "selalu benar", "pasti" di prosa
    const tanpaKode = halaman.replace(/code=\{`[\s\S]*?`\}/g, "");
    // satu-satunya "semua instance" adalah kalimat dokumentasi Serverpod (cache global "shared by every server instance", baris riset)
    expect(tanpaKode.match(/semua instance/g)).toHaveLength(1);
    expect(tanpaKode).toContain("Cache `global` memakai Redis dan dipakai bersama semua instance.");
    expect(r193).toContain('"shared by every server instance"');
    expect(tanpaKode.replace("dipakai bersama semua instance", "")).not.toMatch(/semua instance|tidak pernah|selalu benar|\bpasti\b|\bseluruh stack\b|sama di semua/);
  });
});

describe("rekaman memori.txt: angka di halaman dan widget", () => {
  test("A sampai D: dua instance, promo hanya membuang entri di A, dua harga di satu meja, tagihan dari database, TTL 300 detik", () => {
    expect([ttlMemori, hargaAwal, hargaPromo, potongan]).toEqual([300, 25000, 22500, 10]);
    expect(M.bagian("A").join("\n")).toContain("# empat bacaan, dua baca database: isi yang sama dibaca dua kali karena cache tidak dipakai bersama");
    expect([hapusA, hapusB]).toEqual([1, 0]);
    expect(M.bagian("B").join("\n")).toContain("# Dua harga di satu meja: Budi Rp22.500, Citra Rp25.000. Database menyebut Rp22.500.");
    expect(pesan.slice(1).map(Number)).toEqual([hargaPromo, hargaPromo, potongan, 49]); // nominal = harga_satuan: satu porsi
    expect(stokAwal).toBe(50);
    expect(M.bagian("C").join("\n")).toContain("# Pesanan tidak membaca cache: Rp22.500 ditagih. Stok di cache B (50) juga stale; Pesan memeriksa stok di database.");
    expect([Number(hariTerakhir[1]), Number(hariHabis[1])]).toEqual([ttlMemori - 1, ttlMemori]);
    expect(memoriTxt).toContain("# jam cache digerakkan lewat POST /lab/jam, bukan menunggu 5 menit sungguhan");
    expect(baca("labs/t3-cache/run.py")).toContain('jam(PORT_KEDUA, base + 299_000)');
    expect(baca("labs/t3-cache/run.py")).toContain('jam(PORT_KEDUA, base + 300_000)');
  });
  test("tagihan Rp22.500 dibaca dari kode lab: harga satuan = harga dasar × (100 − potongan) ÷ 100 dengan potongan dari database", () => {
    expect(hargaAwal * (100 - potongan) / 100).toBe(hargaPromo);
    expect(katGo).toContain("h.HargaSatuan = p.Harga * int64(100-p.Potongan) / 100");
  });
});

describe("rekaman redis.txt: urutan hapus kunci, celah yang tersisa, promo yang mulai nanti", () => {
  test("kepala: Redis, go-redis dengan batas 100 ms tanpa retry, TTL 60 detik; go-redis di go.mod sama dengan rekaman", () => {
    expect(goRedis).toBe(goRedisMod);
    expect([versiRedis, goRedis, batasMs, ttlRedis]).toEqual(["8.10.2", "v9.23.0", 100, 60]);
    expect(R.baris.slice(0, 7).join("\n")).toContain("client Redis: go-redis v9.23.0 tanpa retry (GET, SET dengan TTL, DEL, SCAN); batas 100 ms untuk dial, tulis, dan baca");
  });
  test("A: satu Redis untuk dua instance: A miss dan membaca database, B hit; sisa TTL paling banyak 60.000 ms; entri JSON satu warung 40 item", () => {
    const a = R.bagian("A").join("\n");
    expect(a).toContain("instance A: hit 0, miss 1, baca database 1, kunci dihapus 0, galat cache 0");
    expect(a).toContain("instance B: hit 1, miss 0, baca database 0, kunci dihapus 0, galat cache 0");
    expect(pttl).toBe(ribuan(ttlRedis * 1000));
    expect(a).toContain("redis GET katalog:1:418: JSON, 1 warung, 40 item");
  });
  test("B dan E: hapus sesudah COMMIT: kunci terhapus, instance lain langsung melihat harga baru, di celah sebelum COMMIT harga lama masih benar", () => {
    const b = R.bagian("B").join("\n");
    expect(b).toContain("redis EXISTS katalog:1:418: 0 (dihapus sesudah COMMIT)");
    expect(b).toContain(`Citra lewat instance B: GET /katalog?warung=418 -> {"nama":"Nasi goreng","harga":${hargaUbah},"harga_efektif":${hargaUbah},"stok":50,"versi":2}   # instance lain, harga baru langsung`);
    const e = R.bagian("E").join("\n");
    expect(e).toContain("# hit: sebelum COMMIT, 25000 masih harga yang berlaku");
    expect(e).toContain("instance A: COMMIT selesai, lalu kunci dihapus; redis EXISTS katalog:1:418: 0");
    expect(e).toContain(`"harga":${hargaUbah},"harga_efektif":${hargaUbah},"stok":50,"versi":2}   # miss: harga baru`);
    expect(R.baris[R.judul("E")]).toContain("hapus kunci SESUDAH COMMIT");
  });
  test("C: promo membuang semua kunci kota lewat SCAN katalog:1:* lalu DEL; instance B langsung melihat harga promo", () => {
    const c = R.bagian("C").join("\n");
    expect(c).toContain("redis EXISTS katalog:1:418: 0 (SCAN katalog:1:* lalu DEL)");
    expect(c).toContain(`"harga":${hargaAwal},"harga_efektif":${hargaPromo},"stok":50,"versi":1}   # instance B melihat harga promo sekarang juga`);
    expect(redisGo).toContain('r.rdb.Scan(ctx, kursor, awalan+"*", 200)');
    expect(kcGo).toContain('s.kc.HapusAwalan(ctx, fmt.Sprintf("katalog:%d:", kota))');
    expect(kcGo).toContain('return fmt.Sprintf("katalog:%d:semua", kota)');
    expect(kcGo).toContain('return fmt.Sprintf("katalog:%d:%d", kota, *warung)');
    expect(readmeLab).toContain("untuk hapus awalan bukan operasi atomik");
    expect(readmeLab).toContain("Lab tidak merekam perlombaan itu.");
  });
  test("D: hapus sebelum COMMIT: kunci hilang, pembaca di celah mengisi harga lama, harga lama bertahan sampai TTL", () => {
    const d = R.bagian("D").join("\n");
    expect(d).toContain("Ani lewat instance A: PATCH harga 28000, versi 1 -> UPDATE jalan, kunci sudah dihapus, COMMIT belum");
    expect(d).toContain(`"harga":${hargaAwal},"harga_efektif":${hargaAwal},"stok":50,"versi":1}   # miss: database belum melihat 28000, entri lama diisi lagi`);
    expect(d).toContain(`"harga":${hargaAwal},"harga_efektif":${hargaAwal},"stok":50,"versi":1}   # hit: harga lama, tidak ada yang menghapusnya lagi`);
    expect(d).toContain("redis PTTL katalog:1:418: paling banyak 60.000 ms (yang menutupnya hanya TTL)");
    expect(R.baris[R.judul("D")]).toContain("hapus kunci SEBELUM COMMIT");
    // urutan di run.py: bagian D memakai hapus="sebelum" dan gerbang commit; E memakai gerbang commit tanpa hapus="sebelum"
    const run = baca("labs/t3-cache/run.py").split("\n");
    const aD = run.findIndex((x) => x.includes('bagian("D. Urutan salah'));
    const aE = run.findIndex((x) => x.includes('bagian("E. Urutan benar'));
    const aF = run.findIndex((x) => x.includes('bagian("F. Celah yang tersisa'));
    expect(run.slice(aD, aE).join("\n")).toContain('hapus="sebelum", gerbang="commit"');
    expect(run.slice(aE, aF).join("\n")).not.toContain('hapus="sebelum"');
    expect(run.slice(aE, aF).join("\n")).toContain('gerbang="commit"');
  });
  test("F: pembaca lambat menyimpan harga lama sesudah tulis dan hapus kunci selesai; gerbang isi menahan pembaca sesudah baca database", () => {
    const f = R.bagian("F").join("\n");
    expect(f).toContain("Citra lewat instance B: GET /katalog?warung=418 -> miss, database dibaca (Rp25.000), belum disimpan ke Redis");
    expect(f).toContain("Ani lewat instance A: PATCH harga 28000, versi 1 -> 200, COMMIT selesai, DEL kunci (belum ada isinya)");
    expect(f).toContain("instance B: pembaca melanjutkan dan menyimpan hasil bacaannya (Rp25.000) ke Redis");
    expect(f).toContain("# hit: harga lama padahal tulis sudah selesai dan kunci sudah dihapus");
    expect(f).toContain("hapus sesudah COMMIT tidak menutup celah ini; TTL membatasinya");
    // urutan di run.py: gerbang isi → PATCH → lepas gerbang
    const run = baca("labs/t3-cache/run.py").split("\n");
    const aF = run.findIndex((x) => x.includes('bagian("F. Celah yang tersisa'));
    const aG = run.findIndex((x) => x.includes('bagian("G. Promo yang mulai nanti'));
    const urut = ['gerbang="isi"', 'stat(PORT_KEDUA)["tertahan_isi"] == 1', 'curl("PATCH"', 'lepas(PORT_KEDUA, "isi")'].map((k) => run.findIndex((x, i) => i > aF && i < aG && x.includes(k)));
    expect(urut.every((i) => i > aF)).toBe(true);
    expect([...urut].sort((p, q) => p - q)).toEqual(urut);
    // sumber kode: Simpan terjadi sesudah gerbang isi dan sesudah baca database
    const baca2 = fungsi(cacheGo, /\) Baca\(/);
    const urutKode = ["k.P.Ambil(", "muat(ctx)", "k.Gerbang.Tahan(ctx, GerbangIsi)", "k.P.Simpan("].map((k) => baca2.indexOf(k));
    expect(urutKode.every((i) => i >= 0)).toBe(true);
    expect([...urutKode].sort((p, q) => p - q)).toEqual(urutKode);
  });
  test("G: promo yang mulai nanti: tidak ada kunci terhapus, entri lama dipakai, TTL 6 detik di rekaman; harga efektif dihitung dengan now() di query", () => {
    const g = R.bagian("G").join("\n");
    expect([ttlG, mulai]).toEqual([6, 3]);
    expect(g).toContain("instance A: hit 0, miss 0, baca database 0, kunci dihapus 0, galat cache 0   # tidak ada kunci dihapus: tidak ada tulis saat promo mulai");
    expect(g).toContain("# Yang membatasi hanya TTL. Tidak dijalankan: memendekkan TTL entri sampai waktu mulai promo berikutnya.");
    expect(repoKatGo).toContain("WHERE kota_id = a.kota_id AND mulai <= now() AND selesai > now()");
    expect(repoKatGo).toContain("p.harga * (100 - coalesce(pr.persen, 0)) / 100");
    expect(readmeLab).toContain("Memendekkan TTL entri sampai waktu mulai promo berikutnya (cara menutup `redis.txt` G).");
    expect(katGo).toContain("promo yang mulai nanti tidak punya tulis saat mulai (ADR 28)");
    expect(setelah).toContain("tidak punya tulis saat mulai");
  });
});

describe("rekaman gagal.txt: Redis menggantung, mati, hapus kunci gagal, galat tulis", () => {
  test("A: jeda 3 detik: batas 100 ms membuat lima bacaan jadi lima baca database dan lima galat cache; batas 5 detik menunggu lebih dari 1,5 detik", () => {
    const a = G.bagian("A").join("\n");
    expect([jeda, limaN, batasB, lambat]).toEqual([3, 5, 5, "1,5"]);
    expect(a).toContain("instance A: hit 0, miss 1, baca database 6, kunci dihapus 0, galat cache 5   # lima bacaan: lima baca database, lima galat cache, tidak ada hit");
    expect(a).toContain("Budi lewat instance A: 5 kali GET /katalog?warung=418 -> 200 semuanya");
    expect(a).toContain("(-katalog-redis-timeout 5s, sama dengan waktu bawaan go-redis)");
    expect(gagalTxt).toContain("-katalog-redis-timeout 100ms");
    expect(baca("labs/t3-cache/run.py")).toContain("lama > 1.5");
    // bawaan go-redis v9.23.0 dari kode sumber yang dibuka 2026-10-27: dial dan baca 5 detik, retry bawaan 3 (R3-180 memuat hal yang sama)
    expect(barisRiset("R3-180")).toContain("DialTimeout 5 detik, ReadTimeout 5 detik");
    expect(barisRiset("R3-180")).toContain("MaxRetries bawaan 3 (-1 mematikan)");
    expect(halaman).toContain("`DialTimeout` dan `ReadTimeout` bawaan go-redis v9.23.0 (kode `options.go`, dibuka 2026-10-27)");
  });
  test("B: Redis mati: 50 bacaan serentak menjadi 50 baca database, semuanya 200, koneksi paling banyak 10; pool tidak diukur antreannya", () => {
    const b = G.bagian("B").join("\n");
    expect([serentak, koneksiMaks]).toEqual([50, 10]);
    expect(b).toContain("instance A: hit 1, miss 1, baca database 56, kunci dihapus 0, galat cache 55");
    expect(b).toContain("# 50 bacaan, 50 baca database: dengan cache hidup hanya 1. Lab tidak mengukur apakah ada bacaan yang mengantre di pool.");
    expect(b).toContain("-> 200 semuanya");
    expect(56 - 6).toBe(serentak); // 6 baca database sebelum bagian B ikut tercatat di pencacah
  });
  test("C: Redis mati saat tulis: PATCH 200, dua DEL gagal, entri lama kembali dari dump.rdb karena SAVE sebelum Redis berhenti; tanpa SAVE tidak diuji", () => {
    const c = G.bagian("C").join("\n");
    expect(c).toContain("redis SAVE: snapshot ditulis ke dump.rdb di container");
    expect(c).toContain("PATCH harga 28000, versi 1 -> 200 (database COMMIT; Redis tidak menjawab)");
    expect(c).toContain("galat cache 2   # dua DEL (kunci kota dan warung) gagal");
    expect(c).toContain("redis EXISTS katalog:1:418: 1 (Redis memuat dump.rdb saat start; entri dari SAVE kembali)");
    expect(c).toContain("# hit: entri lama kembali, harga lama padahal database 28000");
    expect(readmeLab).toContain("Apakah Redis memuat snapshot tanpa `SAVE` manual tidak diuji.");
    // klaim negatif berlingkup: HapusKunci tidak mengulang; tidak ada retry di cache.go dan katalog_cache.go (komentar dikecualikan)
    const hk = fungsi(cacheGo, /\) HapusKunci\(/);
    expect(hk).toContain("if err != nil {\n\t\t\tk.GalatCache.Add(1)\n\t\t\tcontinue\n\t\t}");
    for (const kode of [cacheGo, kcGo]) {
      const tanpaKomentar = kode.split("\n").filter((x) => !x.trim().startsWith("//")).join("\n");
      expect(tanpaKomentar).not.toMatch(/retry|ulang|backoff/i);
    }
  });
  test("D: lima PATCH ditolak database: urutan sesudah 1 baca database, selalu 6; kunci dihapus 0 lawan 5", () => {
    const d = G.bagian("D").join("\n");
    expect([patchN, dbSesudah, dbSelalu]).toEqual([5, 1, 6]);
    expect(statD).toEqual([
      "instance A: hit 5, miss 1, baca database 1, kunci dihapus 0, galat cache 0",
      "instance A: hit 0, miss 6, baca database 6, kunci dihapus 5, galat cache 0",
    ]);
    expect(d).toContain("# -katalog-hapus sesudah (benar: hapus kunci hanya bila tulis berhasil)");
    expect(d).toContain("# -katalog-hapus selalu (rentan: hapus kunci juga saat tulis gagal)");
    expect(G.baris[G.judul("D")]).toContain("versi kecil dari kasus Facebook 2010");
    // urutan hapus di kode: selalu menghapus saat tidak ok; sesudah hanya saat ok
    const f = fungsi(kcGo, /ubahProdukDenganCache\(/);
    expect(f).toContain("case ok && s.kc.Urut != cache.HapusSebelum:");
    expect(f).toContain("case !ok && s.kc.Urut == cache.HapusSelalu:");
  });
  test("E: galat baca database: entri yang hidup tetap melayani, kunci kosong tidak diisi galat", () => {
    const e = G.bagian("E").join("\n");
    expect(e).toContain("# hit: katalog warung ini dilayani cache walau produk tidak bisa dibaca");
    expect(e).toContain("redis EXISTS katalog:1:502: 0 (galat tidak disimpan), EXISTS katalog:1:418: 1 (entri lama tidak dibuang)");
    const baca2 = fungsi(cacheGo, /\) Baca\(/);
    expect(baca2).toContain("if merr != nil {\n\t\treturn nil, merr\n\t}");
    expect(baca2.indexOf("if merr != nil")).toBeLessThan(baca2.indexOf("k.P.Simpan("));
    expect(baca2).toContain("if err == nil {");
  });
});

describe("rekaman beban.txt: beban katalog tidak memaksa cache", () => {
  test("B dan C: tanpa cache 52 bacaan menjadi 52 baca database, W di bawah 20 ms, L di bawah 0,1; dengan Redis 13 baca database dan 39 hit", () => {
    expect([bebanB[1], bebanB[2], bebanC[1], bebanC[2], bebanC[3]]).toEqual(["52", "52", "52", "13", "39"]);
    expect(Number(bebanC[2])).toBe(kunciN);
    expect([batasWMs, batasL[1], batasL[2]]).toEqual([20, "0,1", "10"]);
    expect(B.bagian("B").join("\n")).toContain("# Naskah dan R3-37: W = 5 ms (Asumsi), L = 5,21 x 0,005 = 0,026. Rekaman memeriksa batas, bukan angkanya: angka bergantung mesin.");
    expect(B.bagian("C").join("\n")).toContain("# Cache katalog tidak diperlukan oleh beban; alasannya M23 dan kesempatan memakai Redis yang sudah ada untuk rate limit.");
    expect(baca("labs/t3-cache/run.py")).toContain("LAMBDA = 5.21");
  });
  test("hitungan: 2.500 × 60 = 150.000; 30% = 45.000; ÷ 86.400 × 10 = 5,208 dibulatkan 5,21; L = 5,21 × 0,005 = 0,026; 5 ÷ 0,026 ≈ 192", () => {
    expect([aktif, reqUser, reqHariN, persenKat, wMs]).toEqual([2500, 60, 150000, 30, 5]);
    expect(aktif * reqUser).toBe(reqHariN);
    expect(bacaHari).toBe(45000);
    expect(koma(lambdaTepat, 3)).toBe("5,208");
    expect(koma(lambdaTepat, 2)).toBe(lambda);
    expect(lambda).toBe("5,21");
    expect(koma(lNilai, 3)).toBe("0,026");
    expect(naskahW.slice(1)).toEqual(["5", "5,21", "0,005", "0,026"]);
    expect([pemicu, jarak]).toEqual([5, 192]);
    expect(prd).toContain("150.000 ÷ 86.400 × 10 = 17,36 (asumsi)");
    expect(hal231).toContain("L = λ × W untuk kelas itu mencapai 5 koneksi");
    expect(naskah).toContain("ADR 21 menunda cache sampai L kelas itu mencapai 5 koneksi (katalog: 0,026)");
  });
  test("ukuran katalog bukan klaim halaman: halaman tidak menyebut 207 KB, 720 KB, atau 86 byte", () => {
    expect(halaman).not.toMatch(/\b207 KB|\b720 KB|\b86 byte|\b206\.551/);
  });
});

describe("kode lab: klaim mekanisme dan klaim negatif berlingkup", () => {
  test("rentang Snippet diturunkan dari jangkar fungsi; tanpa ID riset, nomor keputusan, atau PR di dalamnya, termasuk Snippet rekaman", () => {
    const sumber = [...halaman.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)"/g)].map((m) => ({ file: m[1]!, rentang: `${m[2]}:${m[3]}` }));
    expect(sumber).toEqual([
      { file: "labs/api-t3/internal/cache/cache.go", rentang: V.bacaRentang },
      { file: "labs/api-t3/internal/service/katalog_cache.go", rentang: V.ubahRentang },
      { file: "labs/api-t3/internal/service/katalog.go", rentang: V.pesanRentang },
      { file: "labs/api-t3/internal/cache/cache.go", rentang: V.penyimpanRentang },
    ]);
    const salinan: Record<string, string[]> = { "labs/api-t3/internal/cache/cache.go": kodeCache, "labs/api-t3/internal/service/katalog_cache.go": kodeKc, "labs/api-t3/internal/service/katalog.go": kodeKat };
    for (const s of sumber) {
      const [a, b] = s.rentang.split(":").map(Number);
      const kode = salinan[s.file]!.slice(a! - 1, b!).join("\n");
      expect(kode, s.rentang).not.toMatch(/\bR\d-\d{2,3}\b|\bPR ?#?\d{2,3}\b|keputusan \d{3,4}/);
    }
    const rek = [...halaman.matchAll(/"labs\/t3-cache\/output\/redis\.txt:(\d+):(\d+)"/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
    expect(rek).toHaveLength(3);
    for (const [a1, b1] of rek) expect(R.baris.slice(a1 - 1, b1).join("\n"), `${a1}:${b1}`).not.toMatch(/\bR\d-\d{2,3}\b|\bPR ?#?\d{2,3}\b|keputusan \d{3,4}/i);
    // rentang rekaman menutup tiga bagian utuh berurutan: D, E, F, tiap rentang dimulai di judul bagiannya
    expect(rek.map(([a1]) => R.baris[a1 - 1]!.slice(0, 7))).toEqual(["# --- D", "# --- E", "# --- F"]);
    expect(rek.map(([, b1]) => b1)).toEqual([R.akhir("D"), R.akhir("E"), R.akhir("F")]);
    expect(kodeCache.slice(Number(String(V.penyimpanRentang).split(":")[0]) - 1, Number(String(V.penyimpanRentang).split(":")[1])).join("\n")).toContain("HapusAwalan(ctx context.Context, awalan string) (int, error)");
  });
  test("cache-aside Baca: Redis galat dilewati tanpa menyimpan, galat database dikembalikan tanpa menyimpan, hit mengembalikan entri", () => {
    const f = fungsi(cacheGo, /\) Baca\(/);
    expect(f).toContain("case err != nil:\n\t\tk.GalatCache.Add(1)\n\tcase ada:\n\t\tk.Hit.Add(1)\n\t\treturn b, nil\n\tdefault:\n\t\tk.Miss.Add(1)");
    expect(f).toContain("if err == nil {\n\t\tk.Gerbang.Tahan(ctx, GerbangIsi)");
    expect(f).toContain("if serr := k.P.Simpan(ctx, kunci, b, k.TTL); serr != nil {\n\t\t\tk.GalatCache.Add(1)\n\t\t}");
  });
  test("hapus sesudah COMMIT di kode: sebelum hanya di dalam fungsi tx, sesudah dan selalu setelah UpdateProdukTx; satu kunci kota dan satu kunci warung", () => {
    const f = fungsi(kcGo, /ubahProdukDenganCache\(/);
    const urut = ["s.repo.UbahProdukTx(", "if s.kc.Urut == cache.HapusSebelum {", "s.kc.Gerbang.Tahan(ctx, cache.GerbangCommit)", "case ok && s.kc.Urut != cache.HapusSebelum:", "case !ok && s.kc.Urut == cache.HapusSelalu:"].map((k) => f.indexOf(k));
    expect(urut.every((i) => i >= 0)).toBe(true);
    expect([...urut].sort((p, q) => p - q)).toEqual(urut);
    expect(kcGo).toContain("s.kc.HapusKunci(ctx, kunciKatalog(kota, nil), kunciKatalog(kota, &warung))");
    expect(cacheGo).toContain('HapusSesudah = "sesudah"');
    expect(cacheGo).toContain('HapusSebelum = "sebelum"');
    expect(cacheGo).toContain('HapusSelalu  = "selalu"');
  });
  test("Pesan: harga dan stok dibaca dari database di dalam transaction dengan produk dikunci; tidak menyentuh cache (lingkup: kode non-tes api-t3)", () => {
    const pesanFn = katGo.slice(katGo.indexOf("func (s Service) Pesan("), katGo.indexOf("// --8<-- [end:pesan]"));
    expect(pesanFn).toContain("s.repo.DalamTx(ctx, func(tx repo.Tx) error {");
    expect(pesanFn).toContain("p, err := tx.KunciProduk(ctx, produk)");
    expect(pesanFn).not.toMatch(/\bs\.kc\b|katalogDariCacheAtauDB|cache\./);
    expect(repoKatGo).toContain("FROM produk p JOIN akun a ON a.id = p.akun_id WHERE p.id = $1 FOR UPDATE OF p");
    // klaim negatif berlingkup: hanya tiga fungsi service yang memakai cache (Katalog, UbahProduk, BuatPromo); berkas service lain tidak
    const go = [...(terlacak ?? [])].filter((x) => x.startsWith("labs/api-t3/") && x.endsWith(".go") && !x.endsWith("_test.go"));
    expect(go.length).toBeGreaterThan(10);
    const pakai: string[] = [];
    for (const f of go) {
      const teks = baca(f);
      if (f === "labs/api-t3/internal/service/katalog_cache.go" || f === "labs/api-t3/internal/service/katalog.go") {
        for (const bag of teks.split(/^(?=func )/m)) {
          if (/\bs\.kc\b|katalogDariCacheAtauDB\(|hapusKatalogKota\(|hapusKatalogWarung\(|ubahProdukDenganCache\(/.test(bag.split("\n").filter((x) => !x.trim().startsWith("//")).join("\n"))) pakai.push(`${f}:${bag.match(/^func \(s Service\) (\w+)\(/)![1]}`);
        }
      } else if (/internal\/cache"|\bs\.kc\b|\*cache\.Katalog/.test(teks)) {
        pakai.push(f);
      }
    }
    expect(pakai.sort()).toEqual([
      "labs/api-t3/cmd/api/cache.go",
      "labs/api-t3/cmd/api/main.go",
      "labs/api-t3/internal/service/katalog.go:BuatPromo",
      "labs/api-t3/internal/service/katalog.go:Katalog",
      "labs/api-t3/internal/service/katalog.go:UbahProduk",
      "labs/api-t3/internal/service/katalog_cache.go:hapusKatalogKota",
      "labs/api-t3/internal/service/katalog_cache.go:hapusKatalogWarung",
      "labs/api-t3/internal/service/katalog_cache.go:katalogDariCacheAtauDB",
      "labs/api-t3/internal/service/katalog_cache.go:ubahProdukDenganCache",
      "labs/api-t3/internal/service/sesi.go",
    ].sort());
    // jalur tulis yang menghapus kunci: hanya PATCH /produk (UbahProduk lewat ubahProdukDenganCache) dan POST /promo (BuatPromo); Sinkron dan TimpaStok tidak
    expect(fungsi(katGo, /\) UbahProduk\(/)).toContain("s.ubahProdukDenganCache(");
    expect(fungsi(katGo, /\) BuatPromo\(/)).toContain("s.hapusKatalogKota(ctx, *a.KotaID)");
    expect(fungsi(katGo, /\) Sinkron\(/)).not.toMatch(/hapusKatalog|\bs\.kc\b/);
    expect(baca("labs/api-t3/internal/service/idempoten.go")).not.toMatch(/hapusKatalog|\bs\.kc\b/);
    expect(baca("labs/api-t3/internal/handler/handler_idempoten.go")).toContain("// PUT /produk/{id}/stok (hanya mode rentan stok-timpa, M24): stok diganti tanpa syarat versi.");
    expect(hdGo).toContain('mux.HandleFunc("POST /sinkron", s.wajibLogin(s.sinkron))');
    expect(setelah).toContain("hanya dihapus oleh `PATCH /produk/{id}`; `POST /sinkron`");
  });
  test("tiap request di belakang wajibLogin memeriksa sesi di database: Periksa memanggil SesiAktif yang membaca sesi JOIN akun; GET /katalog di belakang wajibLogin", () => {
    expect(hdGo).toContain('mux.HandleFunc("GET /katalog", s.wajibLogin(s.katalog))');
    expect(hdGo).toContain("sesi, err := s.svc.Periksa(r.Context(), token)");
    expect(baca("labs/api-t3/internal/service/sesi.go")).toContain("x, err := s.repo.SesiAktif(ctx, hashToken(token), s.kini())");
    expect(repoGo).toContain("SELECT s.akun_id, s.jenis, s.csrf_hash FROM sesi s JOIN akun a ON a.id = s.akun_id");
    expect(readmeLab).toContain("tiap request yang login memanggil `Service.Periksa` (satu baca tabel `sesi`)");
  });
  test("klaim negatif berlingkup: tidak ada circuit breaker, singleflight, atau lease di kode non-tes api-t3; go.mod hanya pgx, go-redis, x/crypto sebagai dependency langsung", () => {
    const go = [...(terlacak ?? [])].filter((x) => x.startsWith("labs/api-t3/") && x.endsWith(".go") && !x.endsWith("_test.go"));
    for (const f of go) {
      expect(baca(f), f).not.toMatch(/circuit ?breaker|gobreaker|singleflight/i);
    }
    for (const f of ["labs/api-t3/internal/cache/cache.go", "labs/api-t3/internal/cache/redis.go", "labs/api-t3/internal/service/katalog_cache.go"]) expect(baca(f), f).not.toMatch(/\blease\b/i);
    const langsung = goMod.split(/^require \($/m)[1]!.split(/^\)$/m)[0]!.split("\n").map((x) => x.trim()).filter((x) => x && !x.includes("// indirect")).map((x) => x.split(" ")[0]);
    expect(langsung).toEqual(["github.com/jackc/pgx/v5", "github.com/redis/go-redis/v9", "golang.org/x/crypto"]);
    expect(goMod).not.toMatch(/go-cache|ristretto|bigcache|freecache|groupcache/i);
    expect(readmeLab).toContain("Perlombaan antar-pembaca pada satu kunci dingin tidak direkam");
  });
  test("client Redis: batas waktu dial, tulis, baca, antre; tanpa retry; flag katalog terpisah dari flag batas login; TTL bawaan memori 5 menit dan Redis 60 detik", () => {
    expect(redisGo).toContain("DialTimeout:           batas,");
    expect(redisGo).toContain("ReadTimeout:           batas,");
    expect(redisGo).toContain("WriteTimeout:          batas,");
    expect(redisGo).toContain("PoolTimeout:           batas,");
    expect(redisGo).toContain("MaxRetries:            -1,");
    expect(bukaGo).toContain("k.P, k.TTL = cache.BaruMemori(jam), 5*time.Minute");
    expect(bukaGo).toContain("k.P, k.TTL = cache.BaruRedis(redisAddr, redisBatas), 60*time.Second");
    expect(5 * 60).toBe(ttlMemori);
    expect(mainGo).toContain('flag.String("katalog-redis", "", "alamat Redis untuk -katalog-cache redis (tiruan lokal di container); terpisah dari -redis milik batas login")');
    expect(mainGo).toContain('flag.String("katalog-cache", "", "cache katalog: kosong (tanpa cache), memori, atau redis (lab t3-cache, ADR 28)")');
    // klaim negatif berlingkup (folder labs): tidak ada lab yang menjalankan cache katalog dan batas login Redis sekaligus; maxmemory tidak diatur
    const run = [...(terlacak ?? [])].filter((x) => /^labs\/[^/]+\/run\.py$/.test(x));
    expect(run.length).toBeGreaterThan(5);
    for (const f of run) {
      const teks = baca(f);
      expect(/"-katalog-cache"|-katalog-redis/.test(teks) && /"-redis"/.test(teks), f).toBe(false);
    }
    const lab = [...(terlacak ?? [])].filter((x) => x.startsWith("labs/") && /\.(py|yml|yaml|conf|go|md)$/.test(x) && !x.startsWith("labs/b9-cache/output"));
    for (const f of lab) expect(baca(f), f).not.toMatch(/maxmemory-policy|--maxmemory|CONFIG SET maxmemory/);
    expect(readmeLab).toContain("Redis dengan AUTH dan TLS, batas memori (`maxmemory`) dan kebijakan eviction (R3-10), Redis Cluster atau replika.");
  });
  test("kunci hitungan batas login dan kunci cache sama-sama punya masa berlaku: PEXPIRE di skrip batas login, SET dengan TTL di cache", () => {
    expect(baca("labs/api-t3/internal/redisbatas/redisbatas.go")).toContain("redis.call('PEXPIRE', KEYS[1], ARGV[1])");
    expect(redisGo).toContain("r.rdb.Set(ctx, kunci, nilai, ttl)");
  });
});

describe("widget CacheInvalidation: halaman memakai label tombol dan chip persis, dan tanpa JavaScript ada tabel rekaman", () => {
  const label = (g: string, n: string | number) => widgetJson.pilihNilai[g]!.find((o) => o.nilai === n)!.label;
  test("label tombol yang disebut prosa sama dengan data widget; titik cocok diberi chip dari data widget", () => {
    expect(label("cache", "redis")).toBe("Redis bersama");
    expect(label("urutan", "sesudah")).toBe("Sesudah COMMIT");
    expect(label("urutan", "lambat")).toBe("Sesudah COMMIT, pembaca lambat");
    expect(label("kejadian", "promo-nanti")).toBe("Promo mulai {mulai} detik lagi");
    expect(label("kejadian", "harga")).toBe("Ani mengubah harga");
    expect(label("ttl", ttlRedis)).toBe(String(ttlRedis));
    expect(label("ttl", ttlG)).toBe(String(ttlG));
    expect(halaman).toContain(`**Redis bersama**, TTL **${ttlRedis}**, **Ani mengubah harga**, dan **Sesudah COMMIT**`);
    expect(halaman).toContain("**Sesudah COMMIT, pembaca lambat**");
    expect(halaman).toContain(`TTL **${ttlG}**, **${label("kejadian", "promo-nanti").replace("{mulai}", String(mulai))}**, dan **Sesudah COMMIT**`);
    expect(halaman).toContain(`**${label("kejadian", "promo-nanti").replace("{mulai}", String(mulai))}**`);
    expect(halaman).toContain(`diberi chip ${widgetJson.cocok}.`);
    expect(widgetJson.cocok).toBe("Cocok dengan Rekaman lab");
    expect(widgetJson.tanpaAcuan).toContain("Ilustrasi");
    expect(widgetJson.sumber).toBe("Ilustrasi · acuan Rekaman lab t3-cache");
  });
  test("komponen merender <noscript> dengan tabel titik acuan, dari rekaman yang sama; halaman menaut rekaman D, E, F di lipatan statis", () => {
    expect(widgetAstro).toContain("<noscript>");
    expect(widgetAstro).toContain("labs/t3-cache/output/redis.txt");
    expect(halaman).toContain('<details class="abstract">\n<summary>Rekaman bagian D, E, dan F (juga untuk pembaca tanpa JavaScript)</summary>');
  });
});

describe("diagram Rantai Inti, halaman istilah, dan glosarium", () => {
  test("Rantai: dua baris dari redis.txt E dan D; judul paling banyak 47 karakter; angka diturunkan; sumber rekaman", () => {
    expect(rantai.id).toBe("t3-cache-inti");
    expect(rantai.judul.length).toBeLessThanOrEqual(47);
    expect(rantai.judul).toBe("Hapus kunci sesudah dan sebelum COMMIT");
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-cache, redis.txt bagian D dan E" });
    expect(rantai.baris.map((b) => [b.label, b.sub])).toEqual([["Hapus kunci sesudah COMMIT", "bagian E dari redis.txt"], ["Hapus kunci sebelum COMMIT", "bagian D dari redis.txt"]]);
    expect(rantai.baris[0]!.simpul).toEqual([
      { teks: `Ani: ${rupiah(hargaUbah)}`, sub: "UPDATE, lalu COMMIT", nada: "biasa", kode: false },
      { teks: "kunci dihapus", sub: "sesudah COMMIT", nada: "biasa", kode: false },
      { teks: `Citra: ${rupiah(hargaUbah)}`, nada: "good", kode: false },
    ]);
    expect(rantai.baris[1]!.simpul).toEqual([
      { teks: `Ani: ${rupiah(hargaUbah)}`, sub: "UPDATE, COMMIT belum", nada: "biasa", kode: false },
      { teks: "pembaca mengisi lagi", sub: `${rupiah(hargaAwal)}, kunci sudah hilang`, nada: "warn", kode: false },
      { teks: `Citra: masih ${rupiah(hargaAwal)}`, nada: "warn", kode: false },
    ]);
    expect(rantai.catatan).toBe("Kotak oranye adalah penyebab harga lama bertahan sampai TTL habis.");
    // simpul akhir terbaca benar tanpa sub; dua baris sesuai rekaman E (harga baru) dan D (harga lama)
    expect(R.bagian("E").join("\n")).toContain(`"harga":${hargaUbah},"harga_efektif":${hargaUbah},"stok":50,"versi":2}   # miss: harga baru`);
    expect(R.bagian("D").join("\n")).toContain(`"harga":${hargaAwal},"harga_efektif":${hargaAwal},"stok":50,"versi":1}   # hit: harga lama, tidak ada yang menghapusnya lagi`);
  });
  test("halaman istilah Cache-aside dan Cache invalidation: valid, rujukan, rekaman dan riset ada, isi dikunci dengan sidik jari, angka dari rekaman", () => {
    for (const [slug, istilah, rujukan, sj] of [["cache-aside", "Cache-aside", ["t3-m23", "t3-cache"], SIDIK_ISTILAH[0]], ["cache-invalidation", "Cache invalidation", ["t3-m23", "t3-cache"], SIDIK_ISTILAH[1]]] as const) {
      const j = JSON.parse(baca(`situs/data/halaman-istilah/${slug}.json`)) as { istilah: string; cerita: { rujukan: string; teks: string }[]; mekanisme: string[]; sumber: { riset?: string; rekaman?: string; url?: string; catatan: string }[]; stack: null };
      const d = HalamanIstilah.parse(j);
      expect(d.istilah).toBe(istilah);
      expect(d.stack).toBeNull();
      expect(d.cerita!.map((c) => c.rujukan)).toEqual(rujukan);
      const reg = new Set((registry.halaman as { id: string }[]).map((h) => h.id));
      for (const c of d.cerita!) expect(reg.has(c.rujukan), c.rujukan).toBe(true);
      for (const x of d.sumber!) {
        if ("rekaman" in x) expect(fs.existsSync(path.join(akar, x.rekaman))).toBe(true);
        if (x.riset) expect(riset).toContain(`| ${x.riset} |`);
        if ("url" in x && x.url) expect(riset.includes(x.url.replace(/^https:\/\/(www\.)?/, ""))).toBe(true);
      }
      expect(sidik(JSON.stringify(j))).toBe(sj);
    }
    const a = JSON.parse(baca("situs/data/halaman-istilah/cache-aside.json")) as { cerita: { teks: string }[] };
    expect(a.cerita[0]!.teks).toBe(`Cache katalog di memori proses mengikuti pola ini, dengan satu salinan per instance. Promo yang dibuat lewat instance A hanya membuang entri di A, dan Citra di instance B melihat ${rupiah(hargaAwal)} sampai entrinya habis (\`memori.txt\` bagian B dan D).`);
    const i = JSON.parse(baca("situs/data/halaman-istilah/cache-invalidation.json")) as { cerita: { teks: string }[]; jebakan: string[] };
    expect(i.cerita[0]!.teks).toContain(`TTL ${ttlMemori} detik habis`);
    expect(i.jebakan[1]).toBe(`Menghapus kunci saat tulis gagal. Di \`gagal.txt\` bagian D, ${kata(patchN)} PATCH yang gagal mengubah satu baca database menjadi ${kata(dbSelalu)}.`);
  });
  test("glosarium: dua baris baru menuju 3.19 dengan halaman istilah; Cache, Stale, TTL tetap menuju B9 (halaman lama dilebur, tidak dihapus)", () => {
    const baris = (nama: string) => glosMdx.split("\n").find((b) => b.startsWith(`| **${nama}** `))!;
    expect(baris("Cache-aside")).toBe("| **Cache-aside** | Cara memakai cache: aplikasi memeriksa cache lebih dulu, membaca database bila entrinya tidak ada, lalu menyimpan hasilnya di cache. | [[t3-cache]] |");
    expect(baris("Cache invalidation")).toBe("| **Cache invalidation** | Membuang atau memperbarui entri cache saat data aslinya berubah, supaya salinan tidak tertinggal. | [[t3-cache]] |");
    const glos = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; h: string | null; b: string | null }[];
    expect(glos.find((x) => x.t === "Cache-aside")).toMatchObject({ h: "/istilah/cache-aside/", b: "t3-cache" });
    expect(glos.find((x) => x.t === "Cache invalidation")).toMatchObject({ h: "/istilah/cache-invalidation/", b: "t3-cache" });
    for (const n of ["Cache", "Stale"]) expect(baris(n)).toMatch(/\| \[\[B9\]\] \|$/);
    const h = registry.halaman as { id: string; lebur_ke?: string; lama?: boolean; ada: boolean }[];
    expect(h.find((x) => x.id === "B9")).toMatchObject({ ada: true, lama: true, lebur_ke: "t3-cache" });
    expect(fs.existsSync(path.join(akar, "situs/src/content/docs/b-fondasi/b9-caching.mdx"))).toBe(true);
  });
});

describe("sumber dokumentasi: baris riset R3-190 sampai R3-193, tanggal, versi, dan tautan", () => {
  const ids = ["R3-190", "R3-191", "R3-192", "R3-193"];
  test("empat baris ada sekali, urut sesudah R3-183, dibuka pada tanggal yang sama dengan halaman; versi sumber dari baris riset", () => {
    const urut = riset.split("\n").filter((b) => /^\| R3-\d+ \|/.test(b)).map((b) => b.split("|")[1]!.trim());
    const i = urut.indexOf("R3-190");
    expect(urut.slice(i, i + 4)).toEqual(ids);
    expect(urut.indexOf("R3-183")).toBeLessThan(i);
    expect(new Set(urut).size).toBe(urut.length);
    for (const id of ids) expect(barisRiset(id), id).toContain(tanggal);
    expect(halaman.match(/dibuka (\d{4}-\d{2}-\d{2})/g)!.every((x) => x === `dibuka ${tanggal}`)).toBe(true);
    expect(halaman.match(/pada (\d{4}-\d{2}-\d{2})/g)!.every((x) => x === `pada ${tanggal}`)).toBe(true);
    expect(tanggal).toBe("2026-10-27");
    expect([azure, cm, cmTerbit, laravel, django, serverpodDok, serverpod, fbJam, djangoDetik]).toEqual(["2025-09-11", "7.2.9", "2026-06-27", "13.38.0", "6.1.2", "4.0.0", "4.0.4", "2,5", 300]);
  });
  test("isi baris riset dikunci dengan sidik jari; klaim kunci dokumentasi ada di baris yang dirujuk halaman", () => {
    const sj = Object.fromEntries(ids.map((id) => [id, sidik(barisRiset(id))]));
    expect(sj).toEqual(SIDIK_RISET);
    for (const k of ["Update the data store before removing the item from the cache", "This sequence leads to stale data in the cache", "doesn't guarantee consistency between the data store and the cache", "Always retrieve this type of data from the primary source", "because deletes are idempotent", "does not reflect the latest value that should be cached", "token 64-bit terikat satu key", "17K per detik tanpa lease dan 1,3K per detik dengan lease"]) expect(r190, k).toContain(k);
    for (const k of ["approximately 2.5 hours", "every single client saw the invalid value and attempted to fix it", "hundreds of thousands of queries a second", "deleted the corresponding cache key", "menghentikan semua traffic ke cluster database", "Batas: satu insiden 2010, data konfigurasi bukan harga katalog, galat baca bukan galat tulis"]) expect(r191, k).toContain(k);
    for (const k of ["bawaan di sistem 64-bit", "a good default option if you have no reason to prefer any others", "you should consider running two separate Redis instances in a case like this, if possible", "may be returned or not: it is undefined", "tidak mengatur `maxmemory`"]) expect(r192, k).toContain(k);
    for (const k of ["By default, everything is stored in memory", "refreshThreshold", "racing condition", "By default, Laravel is configured to use the database cache driver", "`Cache::flexible`", "each process will have its own private cache instance", "`TIMEOUT` bawaan 300 detik", "tidak menyebut perlindungan miss serentak", "10.000 entri", "CacheMissHandler", "cache global per request", "UnimplementedError", "does not warn you about this at normal logging levels", "up to 60 seconds", "typically set to 1 hour", "halaman tidak membahas cache untuk baris database"]) expect(r193, k).toContain(k);
  });
  test("tautan eksternal dikunci per teks dan alamat; setiap alamat ada jejaknya di baris riset; satu teks tautan, satu alamat", () => {
    const tautan = [...halaman.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => [m[1]!, m[2]!] as const);
    const peta = new Map<string, Set<string>>();
    for (const [t, u] of tautan) peta.set(t, (peta.get(t) ?? new Set()).add(u));
    for (const [t, us] of peta) expect(us.size, `teks tautan ganda: ${t}`).toBe(1);
    expect([...new Set(tautan.map(([, u]) => u))].sort()).toEqual(ALAMAT.map(([u]) => u).sort());
    const semuaRiset = ids.map(barisRiset).join("\n");
    for (const [u, jejak] of ALAMAT) expect(semuaRiset, u).toContain(jejak);
    expect(caraPakai).toMatch(/^#+ Label sumber$/m);
  });
  test("klaim dokumentasi negatif dibatasi ke halaman yang dibuka dan dijaga baris riset", () => {
    expect(halaman).toContain("Halaman itu tidak menyebut perlindungan untuk miss serentak pada `get_or_set`.");
    expect(halaman).toContain("Halaman yang dibuka tidak memuat cache bawaan untuk query database [perlu verifikasi].");
    expect(halaman).toContain("`invalidateKey` pada cache global tidak dicontohkan [perlu verifikasi]");
    expect(r193).toContain("`invalidateKey` dicontohkan pada cache lokal");
    expect(r193).toContain("halaman tidak menyebut perlindungan miss serentak");
  });
});

describe("tab Di stack lain, ADR 28, kartu Cek diri, dan tetangga", () => {
  test("enam tab sama dengan 3.17; Go dijalankan, lima lain Tidak dijalankan; kode ilustrasi dikunci oleh EXPECT", () => {
    const label = '<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>';
    expect(halaman).toContain(label);
    expect(hal317).toContain(label);
    expect([...halaman.matchAll(/^\*(Dijalankan|Tidak dijalankan)[.:]/gm)].map((m) => m[1])).toEqual(["Dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan", "Tidak dijalankan"]);
    expect(halaman.match(/<Fragment slot="t\d">/g)).toHaveLength(6);
    expect([...halaman.matchAll(/<Fragment slot="t(\d)">/g)].map((m) => m[1])).toEqual(["0", "1", "2", "3", "4", "5"]);
    expect(halaman.match(/\*\*Yang berbeda di stack ini:\*\*/g)).toHaveLength(6);
    expect(halaman.match(/Kode di bawah adalah Ilustrasi\./g)).toHaveLength(4);
    expect(halaman.match(/<Snippet lang="(js|php|python|dart)" code=/g)).toHaveLength(4);
    expect(halaman).toContain("Tanda [perlu verifikasi] berarti klaim itu belum bisa dicek ke sumber primer.");
  });
  test("ADR 28: empat opsi A sampai D, keputusan C dengan delapan aturan, tiga penyebab pre-mortem, empat butir kapan salah, empat baris Sengaja belum", () => {
    const adr = halaman.slice(halaman.indexOf("### ADR 28"), halaman.indexOf("### Sengaja belum dilakukan"));
    expect(adr.match(/^\| \| A\. Tanpa cache \| B\. Cache di memori tiap instance \| C\. Cache bersama di Redis \| D\. ETag dan cache di app saja \|$/m)).not.toBeNull();
    for (const baris of ["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]) expect(adr, baris).toMatch(new RegExp(`^\\| ${baris} \\|`, "m"));
    const tabel = adr.split("\n").filter((x) => x.startsWith("|"));
    expect(tabel).toHaveLength(7);
    for (const b of tabel) expect(b.split(/(?<!\\)\|/).length, b.slice(0, 40)).toBe(7);
    const aturan = adr.slice(adr.indexOf("**Keputusan: opsi C.** Delapan aturan:"), adr.indexOf("**Kenapa C, bukan A, B, atau D.**"));
    expect([...aturan.matchAll(/^(\d+)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    const kenapa = adr.slice(adr.indexOf("**Kenapa C, bukan A, B, atau D.**"), adr.indexOf("**Kasus industri: Facebook"));
    expect([...kenapa.matchAll(/^- \*\*(A|B|D) /gm)].map((m) => m[1])).toEqual(["A", "B", "D"]);
    const pre = adr.slice(adr.indexOf("**Pre-mortem.**"), adr.indexOf("**Kapan keputusan ini salah.**"));
    expect([...pre.matchAll(/^(\d+)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    const salah = adr.slice(adr.indexOf("**Kapan keputusan ini salah.**"), adr.indexOf("**Yang akan merevisinya.**"));
    expect([...salah.matchAll(/^- /gm)]).toHaveLength(4);
    const belum = halaman.slice(halaman.indexOf("### Sengaja belum dilakukan"), halaman.indexOf('<Blok nama="Kunci">'));
    expect([...belum.matchAll(/^\| (?!Yang ditunda|---)/gm)]).toHaveLength(4);
    expect(adr).toContain("ADR ini menyimpang dari pemicu cache ADR 21");
    expect(naskahAdr28()).toContain("Cache katalog di Redis, TTL 60 detik, hapus kunci sesudah tulis; harga yang ditagih dari database; error backend tidak membuang entri; client Redis dengan batas waktu per perintah dan tanpa retry bawaan");
    expect(naskahAdr28()).toContain("Tanpa cache (opsi sah); cache di memori proses (ditolak, M23); ETag dan cache lokal di app saja");
    expect(naskahAdr28()).toContain("Bila hit rate rendah atau data harus selalu segar; bila \"tanpa cache\" cukup, cache dicabut.");
    expect(naskahAdr28()).toContain("stale set, redis.txt F");
    expect(naskahAdr28()).toContain("promo yang mulai di jam tertentu tanpa tulis saat mulai (redis.txt G)");
    expect(naskah).toContain("| M23 | 6 |");
    expect(naskah).toContain("Di minggu 2 Nadia menambah cache katalog di memori proses (TTL 300 detik, 5 menit)");
    expect(adr).toContain("cache sudah ada sejak minggu 2");
  });
  test("Redis untuk cache dipisah dari Redis batas login, dan 3.17 menaut ke halaman ini untuk memori dan eviction: janji 3.17 ditepati", () => {
    expect(hal317).toContain("Pencegahannya Redis khusus untuk hitungan, terpisah dari cache katalog ([[t3-cache]]), dengan batas memori dan alert pemakaian memori.");
    expect(hal317).toContain("[[t3-cache]] (ADR 28) menambah komponen kedua yang memakai Redis, dan membuka soal memori dan eviction.");
    expect(halaman).toContain("5. Redis untuk cache dipisah dari Redis untuk batas login ([[t3-rate-limit-redis]]), dengan batas memori dan kebijakan eviction yang dipilih untuk cache. Lab tidak mengatur `maxmemory`, jadi aturan ini Tidak dijalankan.");
    expect(halaman).toContain("[[t3-rate-limit-redis]]");
  });
  test("Sudah tahu? Cek 3 pertanyaan sama dengan jumlah butir; Cek diri punya lima kartu dengan jawaban, dan kartu.json sama dengan halaman", () => {
    const sum = halaman.match(/<summary>Sudah tahu\? Cek (\d+) pertanyaan<\/summary>\n\n((?:\d+\. .+\n)+)/)!;
    expect(Number(sum[1])).toBe(sum[2]!.trim().split("\n").length);
    expect(halaman.match(/<details class="success">/g)).toHaveLength(5);
    expect(halaman.match(/^\*\*\d\.\*\* /gm)).toHaveLength(5);
    expect(halaman.match(/<summary>Jawaban<\/summary>/g)).toHaveLength(5);
    const tanya = [...halaman.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    const jawab = [...halaman.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]+?)\n\n<\/details>/g)].map((m) => m[1]!);
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[]).filter((k) => k.halaman === "t3-cache");
    expect(kartu.map((k) => k.id)).toEqual([1, 2, 3, 4, 5].map((n) => `t3-cache-${n}`));
    expect(kartu.map((k) => k.tanya)).toEqual(tanya);
    expect(kartu.map((k) => k.jawab)).toEqual(jawab.map((j) => j.replace(/\n+/g, " ").replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")));
    for (const k of kartu) expect([k.judul, k.url]).toEqual(["3.19 Cache dan invalidation + ADR 28", "tahap-3/cache-invalidation/"]);
    // posisi jawaban benar tidak dapat ditebak: jawaban tidak selalu dimulai dengan kata yang sama dan tidak ada yang berupa "Ya"/"Tidak" saja
    expect(new Set(jawab.map((j) => j.split(" ")[0])).size).toBeGreaterThan(2);
  });
  test("nomor ADR yang disebut halaman cocok dengan registry: 21, 26, 28, 29", () => {
    const adr = [...new Set([...halaman.matchAll(/\bADR (\d+)\b/g)].map((m) => Number(m[1])))].sort((p, q) => p - q);
    expect(adr).toEqual([21, 26, 28, 29]);
    expect(idHalaman("t2-adr-21").adr).toEqual([21]);
    expect(idHalaman("t3-dua-instance").adr).toEqual([26]);
    expect(idHalaman("t3-offline").adr).toEqual([29]);
    expect(idHalaman("t3-cache").adr).toEqual([28]);
  });
  test("tautan [[ID]] ada di registry dan daftarnya dikunci", () => {
    const ids = [...new Set([...halaman.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]!))].sort();
    expect(ids).toEqual(["berikutnya", "t2-adr-21", "t3-adr-33", "t3-dua-instance", "t3-m23", "t3-offline", "t3-pool", "t3-rate-limit-redis"]);
    const reg = new Set((registry.halaman as { id: string }[]).map((h) => h.id));
    for (const id of ids.filter((x) => x !== "berikutnya")) expect(reg.has(id), id).toBe(true);
  });
  test("janji dari tetangga ditepati: 2.31 menunjuk 3.19 untuk cache, 3.15 menyebut ADR 28 untuk cache lintas instance, 3.2 menaut 3.19, naskah ADR 33 memuat cache saldo dan riwayat", () => {
    expect(hal231).toContain("| [[t3-cache]] |");
    expect(hal315).toContain("ADR 28 membahas cache lintas instance");
    expect(halTeknis).toContain("[[t3-cache\\|Cache dan invalidation]]");
    expect(naskah).toMatch(/\| 33 \| Sengaja belum: [^|]*cache saldo dan riwayat/);
    expect(naskah4).toContain("naik 8 kali");
    expect(halaman).toContain("±8 kali (naskah Tahap 4, Asumsi)");
  });
});

function naskahAdr28(): string {
  const b = naskah.split("\n").find((x) => x.startsWith("| 28 | Cache katalog di Redis"));
  if (!b) throw new Error("baris ADR 28 di naskah tidak ada");
  return b;
}

const ALAMAT: [string, string][] = [
  ["https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside", "learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside"],
  ["https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf", "usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf"],
  ["https://redis.io/docs/latest/commands/scan/", "redis.io/docs/latest/commands/scan/"],
  ["https://redis.io/docs/latest/develop/reference/eviction/", "redis.io/docs/latest/develop/reference/eviction/"],
  ["https://unpkg.com/cache-manager@7.2.9/README.md", "unpkg.com/cache-manager@7.2.9/README.md"],
  ["https://laravel.com/docs/13.x/cache", "laravel.com/docs/13.x/cache"],
  ["https://docs.djangoproject.com/en/6.1/topics/cache/", "docs.djangoproject.com/en/6.1/topics/cache/"],
  ["https://docs.serverpod.dev/concepts/endpoints-and-apis/caching", "docs.serverpod.dev/concepts/endpoints-and-apis/caching"],
  ["https://supabase.com/docs/guides/storage/cdn/smart-cdn", "supabase.com/docs/guides/storage/cdn/smart-cdn"],
  ["https://engineering.fb.com/2010/09/23/uncategorized/more-details-on-today-s-outage/", "engineering.fb.com/2010/09/23/uncategorized/more-details-on-today-s-outage/"],
];
const SIDIK_RISET: Record<string, string> = {"R3-190": "3288b34feea93758", "R3-191": "e4d99d9de0d1f843", "R3-192": "882df7d992f9f016", "R3-193": "ba2b740bb2e436be"};
const SIDIK_ISTILAH = ["bb7bd1d7caf1674f", "6f2b3654a06c8ac9"] as const;

// ---- tambahan peninjau #391: celah penjaga yang ditemukan uji mutasi (mutasi yang lolos sebelumnya) ----------------
describe("tambahan peninjau: bawaan flag, noscript sebagai elemen, jumlah penyimpan, celah tersisa, pengecualian pesanan", () => {
  test("bawaan flag lab: urutan hapus kunci sesudah dan batas waktu Redis katalog 50 ms (rekaman memakai bawaan di bagian yang tidak menyebut flag)", () => {
    expect(mainGo).toMatch(/flag\.String\("katalog-hapus", cache\.HapusSesudah,/);
    expect(mainGo).toMatch(/flag\.Duration\("katalog-redis-timeout", 50\*time\.Millisecond,/);
    expect(mainGo).toMatch(/flag\.Duration\("katalog-ttl", 0,/);
    expect(cacheGo).toMatch(/HapusSesudah\s*=\s*"sesudah"/);
  });
  test("<noscript> adalah elemen di templat komponen (baris sendiri dengan tabel di dalamnya), bukan hanya kata di komentar", () => {
    const templat = widgetAstro.split(/^---$/m).slice(2).join("---");
    expect(templat).toMatch(/^<noscript>$/m);
    expect(templat).toMatch(/^<\/noscript>$/m);
    const dalam = templat.slice(templat.indexOf("<noscript>"), templat.indexOf("</noscript>"));
    expect(dalam).toContain("<table");
    expect(dalam).toContain("{L.tanpaJs}");
  });
  test("tiga tipe memenuhi Penyimpan (Memori, Redis, Tanpa), sama dengan kalimat tab Go", () => {
    const tipe = [...cacheGo.matchAll(/^func \((?:\w+ \*?)?(\w+)\) Ambil\(/gm), ...redisGo.matchAll(/^func \((?:\w+ \*?)?(\w+)\) Ambil\(/gm)].map((m) => m[1]).sort();
    expect(tipe).toEqual(["Memori", "Redis", "Tanpa"]);
    expect(halaman).toContain("Tiga penyimpan memenuhi satu antarmuka: memori proses, Redis, dan satu penyimpan kosong yang hanya dipakai lab untuk mengukur tanpa cache.");
    expect(cacheGo).toContain("Dipakai lab sebagai alat ukur \"tanpa cache\"");
  });
  test("celah yang tersisa sesudah urutan benar adalah dua (bagian F dan G); bagian D adalah urutan salah, bukan celah milik opsi C", () => {
    expect(redisTxt).toMatch(/^# --- D\. Urutan salah/m);
    expect(redisTxt).toMatch(/^# --- F\. Celah yang tersisa/m);
    expect(redisTxt).toMatch(/^# --- G\. Promo yang mulai nanti/m);
    const adr28 = naskah.split("\n").find((b) => b.startsWith("| 28 |"))!;
    expect(adr28).toMatch(/dua celah terekam[^|]*redis\.txt F[^|]*redis\.txt G/);
    const kekurangan = halaman.split("\n").find((b) => b.startsWith("| Kekurangan |"))!;
    expect(kekurangan.split("|")[4]).toContain("Dua celah tersisa sesudah urutan benar (bagian F dan G)");
    expect(kekurangan.split("|")[4]).not.toMatch(/bagian D/);
    expect(halaman).not.toMatch(/Tiga celah/);
  });
  test("pengecualian pesanan di aturan 6 dan daftar review: Pesan mengurangi stok di database dan tidak menghapus kunci", () => {
    expect(repoKatGo).toMatch(/UPDATE produk SET stok = stok - \$2/);
    const pesan = fungsi(katGo, /\) Pesan\(/);
    expect(pesan).toContain("tx.KurangiStok(ctx, produk, porsi)");
    expect(pesan).not.toMatch(/hapusKatalog|\bs\.kc\b/);
    expect(halaman).toContain("menghapus kuncinya, kecuali pesanan. Sekarang hanya `PATCH /produk/{id}` dan `POST /promo` yang menghapus kunci.");
    expect(halaman).toContain("kecuali pengecualian yang tertulis di ADR.");
  });
  test("alasan memilih C: naskah tidak menulis alasan 'cache sudah ada'; halaman menyebutnya penalaran halaman, bukan naskah", () => {
    const adr28 = naskah.split("\n").find((b) => b.startsWith("| 28 |"))!;
    expect(adr28).not.toMatch(/sudah ada|minggu 2/);
    expect(halaman).toContain("dan naskah memilih C tanpa alasan terukur. Penalaran halaman ini: cache sudah ada sejak minggu");
    expect(halaman).not.toContain("Naskah memilih C: cache sudah ada");
  });
  test("naskah ADR 28 dan baris M23 memuat L katalog yang dihitung halaman", () => {
    const adr28 = naskah.split("\n").find((b) => b.startsWith("| 28 |"))!;
    expect(adr28).toContain(`(${koma(lNilai, 3)})`);
    const m23 = naskah.split("\n").find((b) => b.startsWith("| M23 |"))!;
    expect(m23).toContain(`katalog: ${koma(lNilai, 3)}`);
  });
  test("petunjuk Coba: pengaturan yang disebut halaman adalah pengaturan titik acuan rekaman (TTL 60 untuk B dan F, 6 untuk G)", () => {
    const coba = halaman.slice(halaman.indexOf('<Blok nama="Coba"'), halaman.indexOf('<Blok nama="Paham">'));
    expect(coba).toContain(`TTL **${ttlRedis}**`);
    expect(coba).toContain(`TTL **${ttlG}**`);
    expect(coba).toContain("**Ani mengubah harga**");
    // acuan widget: redis-harga, redis-lambat memakai TTL 60 dan kejadian harga; redis-nanti memakai TTL 6 (ukur-cache.mjs memeriksa chip)
    expect(baca("situs/tools/ukur-cache.mjs")).toMatch(/nama: "redis-harga", cfg: \{ cache: "redis", ttl: TTL_R, kejadian: "harga" \}/);
    expect(baca("situs/tools/ukur-cache.mjs")).toMatch(/nama: "redis-lambat", cfg: \{ cache: "redis", ttl: TTL_R, kejadian: "harga", urutan: "lambat" \}/);
    expect(baca("situs/tools/ukur-cache.mjs")).toMatch(/nama: "redis-nanti", cfg: \{ cache: "redis", ttl: TTL_G, kejadian: "promo-nanti" \}/);
  });
});
