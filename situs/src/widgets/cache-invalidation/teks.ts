// Teks siap pakai widget cache dan invalidation (W3-cache, keputusan 986): templat dari data/widget/t3-cache-invalidation.json
// diisi dengan angka rekaman. Dipakai CacheInvalidation.astro saat build dan di tes (acuan.test.ts, penjaga.test.ts), supaya
// yang dites persis yang tampil. Templat yang diisi di browser ({x}, {lama}, {n}, ...) tidak diisi di sini: island mengisinya
// dari simulasi.
import type { LabelCache } from "./skema";
import type { Rekaman } from "./rekaman";
import { aturanDari, awalDari, daftarAcuan } from "./rekaman";
import { indeksBenar, isi, koma, rupiah, type AcuanDef, type JenisCache, type Kejadian, type Param, type Urutan } from "./logika";

export interface Opsi<T> { nilai: T; label: string }
export type KunciCatatan = keyof LabelCache["catatan"];
export interface TeksSiap {
  pertanyaan: string;
  pilihan: { teks: string; alasan: string }[];
  benar: number;
  opsi: { cache: Opsi<JenisCache>[]; instance: Opsi<number>[]; ttl: Opsi<number>[]; kejadian: Opsi<Kejadian>[]; urutan: Opsi<Urutan>[] };
  acuanTeks: Record<string, string>;
  catatan: Record<KunciCatatan, string>;
  asal: { judul: string; butir: string[] };
  hitungan: { judul: string; diisi: string; diisiNilai: string; beban: string; bebanNilai: string; bacaKunciNilai: { memori: string; redis: string; tanpa: string } };
  ttlLab: number;
}

/** Nilai yang boleh dipakai templat saat build: semuanya dari rekaman. */
export function nilaiBuild(R: Rekaman): Record<string, string | number> {
  return {
    ttl: R.memori.ttl,
    ttlRedis: R.redis.ttl,
    ttlLab: R.redis.nanti.ttl,
    hargaAwal: rupiah(R.memori.awal.efektif),
    hargaBaru: rupiah(R.redis.promoBaru),
    hargaUbah: rupiah(R.redis.harga.baru),
    stokAwal: R.memori.awal.stok,
    stokBaru: R.memori.stokDb,
    citraStok: R.memori.citraStok,
    mulai: R.redis.nanti.mulai,
    dihapusA: R.memori.dihapusA,
    dihapusB: R.memori.dihapusB,
    lamaTerakhir: R.memori.lamaTerakhir,
    baruMulai: R.memori.baruMulai,
    tagih: rupiah(R.memori.tagih),
    serentak: R.gagal.serentak,
    koneksi: R.gagal.koneksiMaks,
    galatCache: R.gagal.mati.galatCache,
    pttl: String(R.redis.pttlMs).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
    lambda: koma(R.beban.lambda, 2),
    w: koma(R.beban.w, 3),
    wMs: Math.round(R.beban.w * 1000),
    pool: R.beban.pool,
    bacaan: R.beban.bacaan,
    tanpaDb: R.beban.tanpaDb,
    redisDb: R.beban.redisDb,
    redisHit: R.beban.redisHit,
    batasWMs: R.beban.batasWMs,
    batasL: koma(R.beban.batasL, 1),
    bacaDb: R.memori.bacaDb,
    bacaDbA: R.redis.bacaDbA,
    bacaDbB: R.redis.bacaDbB,
  };
}

/** Isi hanya nama yang diketahui; nama lain (diisi island saat dijalankan) dibiarkan. */
export function isiSebagian(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (utuh, k: string) => (k in nilai ? String(nilai[k]) : utuh));
}

function ada<T>(daftar: { nilai: T }[], nilai: T): boolean {
  return daftar.some((o) => o.nilai === nilai);
}
/** Pengaturan awal dan setiap titik rekaman harus bisa dipilih lewat tombol; selain itu build gagal. */
export function periksaTombol(L: LabelCache, R: Rekaman): void {
  const dapat = (p: Param) => ada(L.pilihNilai.cache, p.cache) && ada(L.pilihNilai.instance, p.instance) && ada(L.pilihNilai.ttl, p.ttl) && ada(L.pilihNilai.kejadian, p.kejadian) && ada(L.pilihNilai.urutan, p.urutan);
  for (const d of [{ kunci: "awal", param: awalDari(R) }, ...daftarAcuan(R)]) {
    if (!dapat(d.param)) throw new Error(`CacheInvalidation: tombol untuk pengaturan ${d.kunci} (${JSON.stringify(d.param)}) tidak ada di data widget`);
  }
  for (const o of L.pilihNilai.ttl) {
    if (o.label !== String(o.nilai)) throw new Error(`CacheInvalidation: label TTL "${o.label}" harus sama dengan nilainya ${o.nilai}`);
  }
  for (const o of L.pilihNilai.instance) {
    if (o.label !== String(o.nilai)) throw new Error(`CacheInvalidation: label jumlah instance "${o.label}" harus sama dengan nilainya ${o.nilai}`);
  }
}

export function siapkanTeks(L: LabelCache, R: Rekaman, acuan: AcuanDef[] = daftarAcuan(R)): TeksSiap {
  aturanDari(R); // gagal keras bila rekaman saling bertentangan
  const v = nilaiBuild(R);
  const label = <T,>(daftar: Opsi<T>[]): Opsi<T>[] => daftar.map((o) => ({ nilai: o.nilai, label: isi(o.label, v) }));
  const tanpaDetik = (p: { teks: string; alasan: string; detik: number | null }) => ({
    teks: isi(p.teks, { ...v, detik: p.detik ?? "" }),
    alasan: isi(p.alasan, v),
  });
  return {
    pertanyaan: isi(L.pertanyaan, v),
    pilihan: L.pilihan.map(tanpaDetik),
    benar: indeksBenar(L.pilihan, R.memori.baruMulai),
    opsi: {
      cache: label(L.pilihNilai.cache),
      instance: label(L.pilihNilai.instance),
      ttl: label(L.pilihNilai.ttl),
      kejadian: label(L.pilihNilai.kejadian),
      urutan: label(L.pilihNilai.urutan),
    },
    acuanTeks: Object.fromEntries(acuan.map((d) => [d.kunci, isi(L.acuan[d.kunci as keyof LabelCache["acuan"]], v)])),
    catatan: Object.fromEntries(Object.entries(L.catatan).map(([k, t]) => [k, isi(t, v)])) as Record<KunciCatatan, string>,
    asal: { judul: L.asal.judul, butir: L.asal.butir.map((b) => isi(b, v)) },
    hitungan: {
      judul: L.hitungan.judul,
      diisi: L.hitungan.diisi,
      diisiNilai: L.hitungan.diisiNilai,
      beban: L.hitungan.beban,
      // {l} dan {k} dihitung island dari model (littleTanpa, bacaKunci), jadi rumusnya hidup dan tidak disalin dari rekaman.
      bebanNilai: isiSebagian(L.hitungan.bebanNilai, v),
      bacaKunciNilai: {
        memori: isiSebagian(L.hitungan.bacaKunciNilai.memori, v),
        redis: isiSebagian(L.hitungan.bacaKunciNilai.redis, v),
        tanpa: isi(L.hitungan.bacaKunciNilai.tanpa, v),
      },
    },
    ttlLab: R.redis.nanti.ttl,
  };
}
