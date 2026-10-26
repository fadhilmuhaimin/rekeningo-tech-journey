// Pembaca rekaman lab t3-cache untuk widget "Siapa masih melihat harga lama?" (W3-cache, keputusan 986): tanpa DOM, dites
// Vitest. Dipakai saat build (CacheInvalidation.astro) dan di tes; island tidak memuat berkas ini. Semua angka acuan widget
// berasal dari labs/t3-cache/output/{memori,redis,gagal,beban}.txt. Rekaman yang berubah bentuk menggagalkan build: tiap pola
// di bawah harus cocok persis satu kali di bagiannya, dan angka yang saling bergantung (harga baru yang sama di tiga
// rekaman, stok dari pesanan, hitungan baca database) diperiksa silang.
import type { AcuanDef, Aturan, Param } from "./logika";

export interface Isi {
  harga: number; // harga dasar di JSON katalog
  efektif: number; // harga sesudah promo: yang ditampilkan dan ditagih
  stok: number;
}
export interface Rekaman {
  memori: {
    ttl: number; // detik, TTL cache memori di rekaman (jam lab digeser)
    bacaDb: number; // empat bacaan di dua instance: berapa baca database (bagian A)
    dihapusA: number; // kunci yang dibuang promo di instance A (bagian B)
    dihapusB: number; // dan di instance B
    awal: Isi; // yang dilihat Budi dan Citra sebelum promo
    budiBaru: Isi; // Budi sesudah promo (instance A: miss, dari database)
    citraLama: Isi; // Citra sesudah promo (instance B: hit)
    tagih: number; // yang ditagih Pesan (database, bukan cache)
    citraStok: number; // stok yang masih dilihat Citra sesudah pesanan
    stokDb: number; // stok di database sesudah pesanan
    lamaTerakhir: number; // detik terakhir entri lama (bagian D)
    baruMulai: number; // detik pertama harga baru terbaca
  };
  redis: {
    ttl: number;
    pttlMs: number; // sisa TTL paling banyak, milidetik
    bacaDbA: number; // dua instance, satu Redis: baca database di instance A
    bacaDbB: number; // dan di instance B
    harga: { baru: number }; // Ani mengubah harga, instance lain langsung melihat (bagian B)
    promoBaru: number; // promo lewat A, instance B langsung melihat (bagian C)
    sebelum: { dilihat: number; db: number }; // urutan salah: harga yang masih dilihat, harga di database (D)
    lambat: { dilihat: number; db: number }; // pembaca lambat (F)
    nanti: { ttl: number; mulai: number; lama: number; baru: number }; // promo mulai nanti (G): TTL lab, detik mulai
  };
  gagal: {
    mati: { dilihat: number; db: number; galatCache: number }; // Redis mati saat tulis (C)
    serentak: number; // bacaan serentak saat Redis mati (B)
    koneksiMaks: number; // koneksi PostgreSQL paling banyak
  };
  beban: {
    bacaan: number; // jumlah bacaan di rekaman
    tanpaDb: number; // baca database tanpa cache (B)
    redisDb: number; // dengan Redis (C)
    redisHit: number;
    lambda: number; // bacaan per detik (Asumsi naskah)
    w: number; // detik (Asumsi naskah)
    l: number; // λ × W di rekaman
    batasWMs: number; // batas lab untuk W
    batasL: number; // batas lab untuk L
    pool: number; // ukuran pool yang dipakai pembanding L
    itemByte: number;
    kotaKb: number;
  };
}

const angka = (s: string): number => {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) throw new Error(`rekaman t3-cache: "${s}" bukan angka`);
  return n;
};

/** Baris-baris satu bagian: dari "# --- {huruf}. " sampai "# --- " berikutnya. */
function bagian(teks: string, huruf: string, nama: string): string[] {
  const baris = teks.split("\n");
  const i = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  if (i < 0) throw new Error(`rekaman t3-cache: bagian ${nama} ${huruf} tidak ada`);
  let j = i + 1;
  while (j < baris.length && !baris[j]!.startsWith("# --- ")) j++;
  return baris.slice(i, j);
}

function lawan(baris: string[], pola: RegExp, nama: string): RegExpMatchArray {
  const cocok = baris.map((b) => b.match(pola)).filter((m): m is RegExpMatchArray => m !== null);
  if (cocok.length !== 1) throw new Error(`rekaman t3-cache: baris "${nama}" cocok ${cocok.length} kali, harus tepat satu`);
  return cocok[0]!;
}

const POLA_HARGA = /^(Budi|Citra)\s+lewat instance ([AB]): GET \/katalog\?warung=418 -> \{"nama":"Nasi goreng","harga":(\d+),"harga_efektif":(\d+),"stok":(\d+),"versi":(\d+)\}(?:\s+#\s*(.*))?$/;
interface Bacaan { siapa: string; instance: string; isi: Isi; versi: number; komentar: string }
/** Semua bacaan katalog (satu per baris) di bagian itu, urut. */
function bacaan(b: string[]): Bacaan[] {
  return b.flatMap((x) => {
    const m = x.match(POLA_HARGA);
    return m ? [{ siapa: m[1]!, instance: m[2]!, isi: { harga: Number(m[3]), efektif: Number(m[4]), stok: Number(m[5]) }, versi: Number(m[6]), komentar: m[7] ?? "" }] : [];
  });
}
function tepat(b: string[], n: number, nama: string): Bacaan[] {
  const r = bacaan(b);
  if (r.length !== n) throw new Error(`rekaman t3-cache: ${nama}: ${r.length} bacaan katalog, harus ${n}`);
  return r;
}
/** Baris tabel hasil SELECT: produk | harga | harga_efektif_db | stok | versi. */
function barisDb(b: string[], nama: string): Isi & { versi: number } {
  const m = lawan(b, /^ 1\s+\| (\d+)\s+\| (\d+)\s+\| (\d+)\s+\| (\d+)\s*$/, `baris database ${nama}`);
  return { harga: Number(m[1]), efektif: Number(m[2]), stok: Number(m[3]), versi: Number(m[4]) };
}
function pencacah(b: string[], instance: "A" | "B", nama: string) {
  const m = lawan(b, new RegExp(`^instance ${instance}: hit (\\d+), miss (\\d+), baca database (\\d+), kunci dihapus (\\d+), galat cache (\\d+)(?:\\s+#.*)?$`), `pencacah instance ${instance} ${nama}`);
  return { hit: Number(m[1]), miss: Number(m[2]), db: Number(m[3]), dihapus: Number(m[4]), galat: Number(m[5]) };
}
const sama = (nama: string, ...nilai: number[]) => {
  if (new Set(nilai).size !== 1) throw new Error(`rekaman t3-cache: ${nama} berbeda antar rekaman: ${nilai.join(" lawan ")}`);
  return nilai[0]!;
};

export function bacaRekaman(memori: string, redis: string, gagal: string, beban: string): Rekaman {
  // --- memori.txt
  const mTtl = Number(lawan(memori.split("\n"), /-katalog-cache memori -jam-lab \(TTL (\d+) detik\)/, "TTL memori")[1]);
  const mA = bagian(memori, "A", "memori");
  const mB = bagian(memori, "B", "memori");
  const mC = bagian(memori, "C", "memori");
  const mD = bagian(memori, "D", "memori");
  const a = tepat(mA, 4, "memori A");
  const aA = pencacah(mA, "A", "memori A");
  const aB = pencacah(mA, "B", "memori A");
  if (aA.hit + aA.miss !== 2 || aB.hit + aB.miss !== 2) throw new Error("rekaman t3-cache: memori A: tiap instance harus membaca dua kali");
  const awalM = a[0]!.isi;
  if (a.some((x) => x.isi.efektif !== awalM.efektif || x.isi.stok !== awalM.stok)) throw new Error("rekaman t3-cache: memori A: keempat bacaan harus sama");
  const [bBudi, bCitra] = tepat(mB, 2, "memori B") as [Bacaan, Bacaan];
  if (bBudi.siapa !== "Budi" || bBudi.instance !== "A" || bCitra.siapa !== "Citra" || bCitra.instance !== "B") throw new Error("rekaman t3-cache: memori B: urutan Budi di A lalu Citra di B");
  const dbB = barisDb(mB, "memori B");
  if (dbB.efektif !== bBudi.isi.efektif) throw new Error("rekaman t3-cache: memori B: Budi harus sama dengan database");
  if (bCitra.isi.efektif !== awalM.efektif) throw new Error("rekaman t3-cache: memori B: Citra harus masih melihat harga lama");
  const hapusA = pencacah(mB, "A", "memori B");
  const hapusB = pencacah(mB, "B", "memori B");
  const tagih = lawan(mC, /^\{"id":\d+,"saldo":\d+,"nominal":(\d+),"harga_satuan":(\d+),"potongan_persen":\d+,"stok_sisa":(\d+)\}$/, "tagihan pesanan (C)");
  const [cCitra] = tepat(mC, 1, "memori C");
  const dbC = barisDb(mC, "memori C");
  const tagihan = sama("tagihan pesanan", Number(tagih[1]), Number(tagih[2]), dbC.efektif);
  if (Number(tagih[3]) !== dbC.stok) throw new Error("rekaman t3-cache: memori C: stok_sisa harus sama dengan stok di database");
  const [dLama, dBaru] = tepat(mD, 2, "memori D") as [Bacaan, Bacaan];
  const lamaDetik = Number(lawan([dLama.komentar], /^detik ke-(\d+): masih entri lama$/, "detik entri lama (D)")[1]);
  const baruDetik = Number(lawan([dBaru.komentar], /^detik ke-(\d+): entri habis, dibaca dari database$/, "detik entri habis (D)")[1]);
  if (baruDetik !== lamaDetik + 1 || baruDetik !== mTtl) throw new Error(`rekaman t3-cache: memori D: detik ${lamaDetik} lalu ${baruDetik} harus berurutan dan sama dengan TTL ${mTtl}`);
  if (dLama.isi.efektif !== awalM.efektif || dBaru.isi.efektif !== dbB.efektif || dBaru.isi.stok !== dbC.stok) throw new Error("rekaman t3-cache: memori D: harga lama lalu harga dan stok database");

  // --- redis.txt
  const rTtl = Number(lawan(redis.split("\n"), /-katalog-cache redis -katalog-ttl (\d+)s: cache-aside/, "TTL redis")[1]);
  const rA = bagian(redis, "A", "redis");
  const rB = bagian(redis, "B", "redis");
  const rC = bagian(redis, "C", "redis");
  const rD = bagian(redis, "D", "redis");
  const rE = bagian(redis, "E", "redis");
  const rF = bagian(redis, "F", "redis");
  const rG = bagian(redis, "G", "redis");
  const rAA = pencacah(rA, "A", "redis A");
  const rAB = pencacah(rA, "B", "redis A");
  const pttl = lawan(rA, /^redis PTTL katalog:1:418: paling banyak (\d+(?:\.\d{3})*) ms \(TTL (\d+) detik terpasang\)$/, "sisa TTL (A)");
  if (Number(pttl[2]) !== rTtl || angka(pttl[1]!) !== rTtl * 1000) throw new Error("rekaman t3-cache: redis A: sisa TTL harus TTL × 1000 ms");
  const [bCit] = tepat(rB.filter((x) => x.startsWith("Citra")), 1, "redis B Citra");
  lawan(rB, /^redis EXISTS katalog:1:418: 0 \(dihapus sesudah COMMIT\)$/, "kunci terhapus (B)");
  const cc = tepat(rC.filter((x) => x.startsWith("Citra")), 2, "redis C Citra");
  if (cc[0]!.isi.efektif !== awalM.efektif) throw new Error("rekaman t3-cache: redis C: Citra harus melihat harga lama sebelum promo");
  lawan(rC, /^redis EXISTS katalog:1:418: 0 \(SCAN katalog:1:\* lalu DEL\)$/, "kunci terhapus (C)");
  const dD = tepat(rD, 3, "redis D");
  const dDb = barisDb(rD, "redis D");
  const eE = tepat(rE, 3, "redis E");
  const fF = tepat(rF, 1, "redis F");
  const fDb = barisDb(rF, "redis F");
  const gTtl = Number(lawan(rG, /^# TTL (\d+) detik di bagian ini /, "TTL lab (G)")[1]);
  const gMulai = Number(lawan(rG, /POST \/promo potongan 10%, mulai (\d+) detik lagi -> 201$/, "promo mulai nanti (G)")[1]);
  const gA = pencacah(rG, "A", "redis G");
  if (gA.dihapus !== 0) throw new Error("rekaman t3-cache: redis G: tidak boleh ada kunci terhapus");
  const gC = rG.flatMap((x) => (x.startsWith("Citra") ? [x.match(POLA_HARGA)!] : [])).map((m) => ({ efektif: Number(m[4]), stok: Number(m[5]), komentar: m[7] ?? "" }));
  if (gC.length !== 3) throw new Error("rekaman t3-cache: redis G: tiga bacaan Citra");
  const gDb = barisDb(rG, "redis G");
  if (gC[0]!.efektif !== awalM.efektif || gC[1]!.efektif !== awalM.efektif || gC[2]!.efektif !== gDb.efektif) throw new Error("rekaman t3-cache: redis G: Citra melihat harga lama dua kali, lalu harga promo");
  if (!/^hit: promo sudah berlaku di database, entri lama masih dipakai$/.test(gC[1]!.komentar)) throw new Error("rekaman t3-cache: redis G: bacaan kedua harus hit dengan entri lama");
  const dilihatD = dD[2]!.isi.efektif;
  if (dD[2]!.komentar !== "hit: harga lama, tidak ada yang menghapusnya lagi" || dilihatD !== awalM.efektif) throw new Error("rekaman t3-cache: redis D: bacaan terakhir harus hit dengan harga lama");
  if (eE[2]!.isi.efektif !== dDb.efektif || !/^miss: harga baru$/.test(eE[2]!.komentar)) throw new Error("rekaman t3-cache: redis E: bacaan terakhir harus harga baru");
  if (!/^hit: harga lama padahal tulis sudah selesai/.test(fF[0]!.komentar) || fF[0]!.isi.efektif !== awalM.efektif) throw new Error("rekaman t3-cache: redis F: harga lama padahal tulis selesai");

  // --- gagal.txt
  const gB = bagian(gagal, "B", "gagal");
  const gCc = bagian(gagal, "C", "gagal");
  const seren = Number(lawan(gB, /^Budi lewat instance A: (\d+) GET \/katalog\?warung=418 serentak -> 200 semuanya$/, "bacaan serentak (B)")[1]);
  const koneksi = Number(lawan(gB, /^pg_stat_activity, application_name api-t3, dicuplik tiap 5 ms selama \d+ bacaan: paling banyak (\d+) koneksi$/, "koneksi PostgreSQL (B)")[1]);
  const serenDb = Number(lawan(gB, /^# (\d+) bacaan, (\d+) baca database: dengan cache hidup hanya 1\. /, "baca database serentak (B)")[2]);
  if (serenDb !== seren) throw new Error("rekaman t3-cache: gagal B: tiap bacaan serentak harus jadi satu baca database");
  const matiC = pencacah(gCc, "A", "gagal C");
  if (matiC.dihapus !== 0 || matiC.galat !== 2) throw new Error("rekaman t3-cache: gagal C: dua DEL gagal, kunci terhapus 0");
  lawan(gCc, /^redis EXISTS katalog:1:418: 1 \(Redis memuat dump\.rdb saat start; entri dari SAVE kembali\)$/, "entri kembali (C)");
  const cBaca = tepat(gCc, 2, "gagal C");
  const cMati = cBaca[1]!;
  const cDb = barisDb(gCc, "gagal C");
  const cKomentar = cMati.komentar.match(/^hit: entri lama kembali, harga lama padahal database (\d+)$/);
  if (!cKomentar || Number(cKomentar[1]) !== cDb.efektif || cMati.isi.efektif !== awalM.efektif || cDb.efektif !== dDb.efektif) throw new Error("rekaman t3-cache: gagal C: entri lama kembali padahal database sudah berubah");

  // --- beban.txt
  const bA = bagian(beban, "A", "beban");
  const bB = bagian(beban, "B", "beban");
  const bC = bagian(beban, "C", "beban");
  const kepala = lawan(beban.split("\n"), /^# Redis [\d.]+; beban: (\d+) bacaan katalog Jakarta, (\d+,\d+) per detik \(R3-37, Asumsi\), bergilir atas (\d+) kunci/, "kepala beban");
  const itm = lawan(bA, /^GET \/katalog \(Jakarta\): \d+ warung, \d+ item, \d+ byte = (\d+) byte per item$/, "ukuran per item (A)");
  const kota = lawan(bA, /^GET \/katalog\?kota=1 sampai 6: [\d.]+ item, ([\d.]+) byte = (\d+) KB /, "ukuran enam kota (A)");
  const tanpa = lawan(bB, /^(\d+) bacaan -> baca database (\d+), hit 0$/, "tanpa cache (B)");
  const batasW = Number(lawan(bB, /^W \(waktu satu baca katalog di database, termasuk JSON\) terukur di bawah (\d+) ms$/, "batas W (B)")[1]);
  const batasLm = lawan(bB, /^L rata-rata \(jumlah waktu baca database dibagi lama beban\) terukur di bawah (\d,\d+) koneksi dari pool (\d+)$/, "batas L (B)");
  const naskah = lawan(bB, /^# Naskah dan R3-37: W = (\d+) ms \(Asumsi\), L = (\d,\d+) x (\d,\d+) = (\d,\d+)\. /, "W dan L naskah (B)");
  const denganRedis = lawan(bC, /^(\d+) bacaan -> baca database (\d+), hit (\d+), galat cache 0$/, "dengan Redis (C)");
  const lambda = angka(kepala[2]!);
  const w = Number(naskah[1]) / 1000;
  if (angka(naskah[2]!) !== lambda || angka(naskah[3]!) !== w) throw new Error("rekaman t3-cache: beban B: λ dan W di naskah harus sama dengan kepala");
  if (Math.round(lambda * w * 1000) / 1000 !== angka(naskah[4]!)) throw new Error(`rekaman t3-cache: beban B: L ${naskah[4]} bukan ${lambda} × ${w}`);
  const bacaanN = sama("jumlah bacaan beban", Number(kepala[1]), Number(tanpa[1]), Number(denganRedis[1]), Number(tanpa[2]));
  if (Number(denganRedis[2]) + Number(denganRedis[3]) !== bacaanN) throw new Error("rekaman t3-cache: beban C: baca database + hit harus sama dengan jumlah bacaan");
  if (Number(denganRedis[2]) !== Number(kepala[3])) throw new Error("rekaman t3-cache: beban C: baca database harus sama dengan jumlah kunci");

  return {
    memori: {
      ttl: mTtl,
      bacaDb: aA.db + aB.db,
      dihapusA: hapusA.dihapus,
      dihapusB: hapusB.dihapus,
      awal: awalM,
      budiBaru: bBudi.isi,
      citraLama: bCitra.isi,
      tagih: tagihan,
      citraStok: cCitra!.isi.stok,
      stokDb: dbC.stok,
      lamaTerakhir: lamaDetik,
      baruMulai: baruDetik,
    },
    redis: {
      ttl: rTtl,
      pttlMs: angka(pttl[1]!),
      bacaDbA: rAA.db,
      bacaDbB: rAB.db,
      harga: { baru: bCit!.isi.efektif },
      promoBaru: sama("harga promo", cc[1]!.isi.efektif, bBudi.isi.efektif, gDb.efektif),
      sebelum: { dilihat: dilihatD, db: dDb.efektif },
      lambat: { dilihat: fF[0]!.isi.efektif, db: fDb.efektif },
      nanti: { ttl: gTtl, mulai: gMulai, lama: gC[1]!.efektif, baru: gC[2]!.efektif },
    },
    gagal: { mati: { dilihat: cMati.isi.efektif, db: cDb.efektif, galatCache: matiC.galat }, serentak: seren, koneksiMaks: koneksi },
    beban: {
      bacaan: bacaanN,
      tanpaDb: Number(tanpa[2]),
      redisDb: Number(denganRedis[2]),
      redisHit: Number(denganRedis[3]),
      lambda,
      w,
      l: angka(naskah[4]!),
      batasWMs: batasW,
      batasL: angka(batasLm[1]!),
      pool: Number(batasLm[2]),
      itemByte: Number(itm[1]),
      kotaKb: Number(kota[2]),
    },
  };
}

/** Aturan simulasi dari rekaman: harga dan stok, kapan promo "mulai nanti" berlaku, dan beban katalog. */
export function aturanDari(r: Rekaman): Aturan {
  const harga = r.redis.harga.baru;
  if (harga !== r.redis.sebelum.db || harga !== r.redis.lambat.db || harga !== r.gagal.mati.db) throw new Error("rekaman t3-cache: harga setelah diubah Ani harus sama di redis B, D, F dan gagal C");
  if (r.memori.budiBaru.efektif !== r.redis.promoBaru || r.redis.nanti.baru !== r.redis.promoBaru) throw new Error("rekaman t3-cache: harga promo harus sama di memori B, redis C dan redis G");
  if (r.memori.citraStok !== r.memori.awal.stok) throw new Error("rekaman t3-cache: stok yang masih dilihat Citra harus stok awal");
  return {
    hargaAwal: r.memori.awal.efektif,
    hargaBaru: { promo: r.redis.promoBaru, harga, "promo-nanti": r.redis.nanti.baru },
    stokAwal: r.memori.awal.stok,
    stokBaru: r.memori.stokDb,
    promoMulai: r.redis.nanti.mulai,
    lambda: r.beban.lambda,
    w: r.beban.w,
    pool: r.beban.pool,
  };
}

/** Pengaturan awal widget = M23 di memori.txt B dan D: cache memori, dua instance, TTL 300 detik, promo yang sudah berlaku. */
export function awalDari(r: Rekaman): Param {
  return { cache: "memori", instance: 2, ttl: r.memori.ttl, kejadian: "promo", urutan: "sesudah" };
}

/** Pengaturan yang punya rekaman, dengan kunci yang dipakai templat acuan di data widget. */
export function daftarAcuan(r: Rekaman): AcuanDef[] {
  const m = r.memori.ttl;
  const t = r.redis.ttl;
  return [
    { kunci: "memori-promo", param: { cache: "memori", instance: 2, ttl: m, kejadian: "promo", urutan: "sesudah" } },
    { kunci: "memori-stok", param: { cache: "memori", instance: 2, ttl: m, kejadian: "pesanan", urutan: "sesudah" } },
    { kunci: "redis-harga", param: { cache: "redis", instance: 2, ttl: t, kejadian: "harga", urutan: "sesudah" } },
    { kunci: "redis-promo", param: { cache: "redis", instance: 2, ttl: t, kejadian: "promo", urutan: "sesudah" } },
    { kunci: "redis-sebelum", param: { cache: "redis", instance: 2, ttl: t, kejadian: "harga", urutan: "sebelum" } },
    { kunci: "redis-lambat", param: { cache: "redis", instance: 2, ttl: t, kejadian: "harga", urutan: "lambat" } },
    { kunci: "redis-nanti", param: { cache: "redis", instance: 2, ttl: r.redis.nanti.ttl, kejadian: "promo-nanti", urutan: "sesudah" } },
    { kunci: "redis-mati", param: { cache: "redis-mati", instance: 2, ttl: t, kejadian: "harga", urutan: "sesudah" } },
    { kunci: "tanpa", param: { cache: "tanpa", instance: 2, ttl: t, kejadian: "promo", urutan: "sesudah" } },
  ];
}
