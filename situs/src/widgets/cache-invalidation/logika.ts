// Logika murni widget "Siapa masih melihat harga lama?" (W3-cache, keputusan 986): tanpa DOM, tanpa Math.random, tanpa jam
// sungguhan, dites Vitest. Pemecahan konsep:
//   pertanyaan : sesudah harga di database berubah, instance mana yang masih menampilkan harga lama, dan berapa lama?
//   aktor      : instance A (menerima perubahan), instance B dan C (HP lain), cache, database;
//   langkah    : entri diisi (detik 0) -> database berubah -> pembaca membaca pada detik yang dipilih;
//   ubah satu  : jenis cache, jumlah instance, TTL, yang berubah, urutan hapus kunci;
//   tebakan    : kapan Citra di instance B pertama kali melihat harga baru.
// Model (Ilustrasi mekanisme; angka acuan di rekaman.ts dari labs/t3-cache/output):
//   - entri katalog diisi tepat sebelum perubahan (detik 0, kasus terburuk) di tiap cache;
//   - perubahan lewat tulis (harga diubah, promo mulai sekarang) memakai instance A, yang menghapus kunci;
//   - perubahan tanpa tulis (promo yang mulai nanti, pesanan yang mengurangi stok) tidak menghapus kunci apa pun;
//   - entri yang tidak dihapus habis sendiri pada detik TTL; bacaan berikutnya membaca database;
//   - hapus kunci sebelum COMMIT dan pembaca lambat sama-sama meninggalkan satu pembaca yang mengisi ulang harga lama;
//   - Redis yang mati saat tulis tidak bisa menghapus kunci, dan entri lama kembali bersama Redis.
// Harga yang ditagih tidak dimodelkan: pesanan selalu membaca database (memori.txt C).

export type JenisCache = "memori" | "redis" | "redis-mati" | "tanpa";
export type Kejadian = "promo" | "harga" | "promo-nanti" | "pesanan";
export type Urutan = "sesudah" | "sebelum" | "lambat";
export const JENIS_CACHE: readonly JenisCache[] = ["memori", "redis", "redis-mati", "tanpa"];
export const KEJADIAN: readonly Kejadian[] = ["promo", "harga", "promo-nanti", "pesanan"];
export const URUTAN: readonly Urutan[] = ["sesudah", "sebelum", "lambat"];

export interface Param {
  cache: JenisCache;
  instance: number; // jumlah instance API; instance 0 (A) menerima perubahan
  ttl: number; // detik
  kejadian: Kejadian;
  urutan: Urutan; // hanya berpengaruh bila perubahan lewat tulis dan ada cache yang dihapus
}
export interface Aturan {
  hargaAwal: number; // rupiah, harga yang ditampilkan sebelum perubahan
  hargaBaru: { promo: number; harga: number; "promo-nanti": number };
  stokAwal: number;
  stokBaru: number; // stok sesudah satu pesanan
  promoMulai: number; // detik: promo "mulai nanti" berlaku (redis.txt G)
  lambda: number; // bacaan katalog per detik (Asumsi naskah)
  w: number; // detik per baca database (Asumsi naskah)
  pool: number; // ukuran pool koneksi
}
export const HORIZON = 330; // detik; cukup untuk melihat sesudah TTL 300 (memori.txt D)

export interface Isi { harga: number; stok: number }

function salahParam(p: Param): string[] {
  const salah: string[] = [];
  if (!JENIS_CACHE.includes(p.cache)) salah.push(`jenis cache ${String(p.cache)} tidak dikenal`);
  if (!KEJADIAN.includes(p.kejadian)) salah.push(`kejadian ${String(p.kejadian)} tidak dikenal`);
  if (!URUTAN.includes(p.urutan)) salah.push(`urutan ${String(p.urutan)} tidak dikenal`);
  if (!Number.isInteger(p.instance) || p.instance < 1) salah.push(`jumlah instance ${p.instance} harus bilangan bulat ≥ 1`);
  if (!(Number.isFinite(p.ttl) && p.ttl > 0)) salah.push(`TTL ${p.ttl} harus bilangan terhingga > 0`);
  return salah;
}
function salahAturan(a: Aturan): string[] {
  const salah: string[] = [];
  const rupiah = [a.hargaAwal, a.hargaBaru.promo, a.hargaBaru.harga, a.hargaBaru["promo-nanti"]];
  if (!rupiah.every((x) => Number.isInteger(x) && x > 0)) salah.push("harga harus bilangan bulat rupiah > 0");
  if (!(Number.isInteger(a.stokAwal) && a.stokAwal > 0 && Number.isInteger(a.stokBaru) && a.stokBaru >= 0 && a.stokBaru < a.stokAwal)) salah.push("stok baru harus bilangan bulat ≥ 0 dan lebih kecil dari stok awal");
  if (!(Number.isFinite(a.promoMulai) && a.promoMulai >= 0)) salah.push(`promo mulai ${a.promoMulai} harus ≥ 0`);
  if (!(Number.isFinite(a.lambda) && a.lambda > 0 && Number.isFinite(a.w) && a.w > 0 && Number.isInteger(a.pool) && a.pool > 0)) salah.push("λ, W, dan pool harus > 0");
  return salah;
}
/** Masukan yang tidak masuk akal gagal keras: TTL 0 atau negatif membuat entri langsung habis, NaN lolos semua perbandingan. */
export function periksaMasukan(p: Param, a: Aturan, jam = 0): void {
  const salah = [...salahParam(p), ...salahAturan(a)];
  if (!(Number.isFinite(jam) && jam >= 0 && jam <= HORIZON)) salah.push(`jam ${jam} harus antara 0 dan ${HORIZON}`);
  if (salah.length) throw new Error(`simulasi cache: ${salah.join("; ")}`);
}
function periksaIndeks(p: Param, indeks: number): void {
  if (!Number.isInteger(indeks) || indeks < 0 || indeks >= p.instance) throw new Error(`simulasi cache: instance ${indeks} di luar 0 sampai ${p.instance - 1}`);
}

/** Detik database berubah: segera untuk perubahan lewat tulis dan pesanan, nanti untuk promo yang mulai di jam tertentu. */
export function waktuUbah(p: Param, a: Aturan): number {
  return p.kejadian === "promo-nanti" ? a.promoMulai : 0;
}

/** Isi database pada detik `jam` (sumber kebenaran). */
export function database(p: Param, a: Aturan, jam: number): Isi {
  periksaMasukan(p, a, jam);
  if (jam < waktuUbah(p, a)) return { harga: a.hargaAwal, stok: a.stokAwal };
  switch (p.kejadian) {
    case "promo": return { harga: a.hargaBaru.promo, stok: a.stokAwal };
    case "harga": return { harga: a.hargaBaru.harga, stok: a.stokAwal };
    case "promo-nanti": return { harga: a.hargaBaru["promo-nanti"], stok: a.stokAwal };
    case "pesanan": return { harga: a.hargaAwal, stok: a.stokBaru };
  }
}

export type Sebab =
  | "tanpa-cache" // tidak ada entri
  | "dihapus-sendiri" // instance yang menerima perubahan menghapus entrinya sendiri (cache memori)
  | "dihapus-bersama" // satu kunci di Redis bersama dihapus sesudah COMMIT
  | "entri-habis-dulu" // entri habis sebelum perubahan terjadi
  | "tidak-diberi-tahu" // cache memori di instance lain: tidak ada yang menghapus entrinya
  | "diisi-ulang" // hapus kunci sebelum COMMIT atau pembaca lambat: harga lama disimpan lagi sesudah hapus
  | "hapus-gagal" // Redis mati: hapus kunci gagal, entri lama kembali
  | "tanpa-tulis"; // perubahan tanpa tulis: tidak ada yang menghapus kunci

/** Kenapa instance ke-`indeks` melihat atau tidak melihat harga lama. */
export function sebab(p: Param, a: Aturan, indeks: number): Sebab {
  periksaMasukan(p, a);
  periksaIndeks(p, indeks);
  if (p.cache === "tanpa") return "tanpa-cache";
  if (p.kejadian === "promo-nanti" || p.kejadian === "pesanan") return waktuUbah(p, a) >= p.ttl ? "entri-habis-dulu" : "tanpa-tulis";
  if (p.cache === "redis-mati") return "hapus-gagal";
  if (p.cache === "memori") {
    if (indeks > 0) return "tidak-diberi-tahu";
    return p.urutan === "sesudah" ? "dihapus-sendiri" : "diisi-ulang";
  }
  return p.urutan === "sesudah" ? "dihapus-bersama" : "diisi-ulang";
}

export interface Selang { dari: number; sampai: number } // [dari, sampai) dalam detik

/** Selang detik instance ke-`indeks` menampilkan isi lama padahal database sudah berubah; null bila tidak pernah. */
export function selangBasi(p: Param, a: Aturan, indeks: number): Selang | null {
  switch (sebab(p, a, indeks)) {
    case "tanpa-cache":
    case "dihapus-sendiri":
    case "dihapus-bersama":
    case "entri-habis-dulu":
      return null;
    default:
      return { dari: waktuUbah(p, a), sampai: p.ttl };
  }
}
export const lamaBasi = (p: Param, a: Aturan, indeks: number): number => {
  const s = selangBasi(p, a, indeks);
  return s ? s.sampai - s.dari : 0;
};

export interface Lihat { isi: Isi; basi: boolean }
/** Yang ditampilkan instance ke-`indeks` kepada pembaca pada detik `jam`. */
export function lihat(p: Param, a: Aturan, indeks: number, jam: number): Lihat {
  const s = selangBasi(p, a, indeks);
  const basi = s !== null && jam >= s.dari && jam < s.sampai;
  return basi ? { isi: { harga: a.hargaAwal, stok: a.stokAwal }, basi } : { isi: database(p, a, jam), basi };
}
export const jumlahBasi = (p: Param, a: Aturan, jam: number): number =>
  Array.from({ length: p.instance }, (_, i) => lihat(p, a, i, jam)).filter((x) => x.basi).length;

/** Instance yang diamati widget: instance B bila ada dua atau lebih (HP lain), kalau tidak instance A. */
export const pengamat = (p: Param): number => (p.instance >= 2 ? 1 : 0);

export interface Ringkas {
  pengamat: number;
  sebab: Sebab;
  lama: number; // detik harga lama bertahan di instance yang diamati
  instanceBasi: number; // instance yang pernah menampilkan harga lama
}
export function ringkas(p: Param, a: Aturan): Ringkas {
  const i = pengamat(p);
  return {
    pengamat: i,
    sebab: sebab(p, a, i),
    lama: lamaBasi(p, a, i),
    instanceBasi: Array.from({ length: p.instance }, (_, k) => selangBasi(p, a, k)).filter((s) => s !== null).length,
  };
}

/** Cara lama dihitung: "300 − 0 = 300"; null bila tidak ada yang basi. */
export function caraLama(p: Param, a: Aturan, indeks: number): string | null {
  const s = selangBasi(p, a, indeks);
  return s ? `${detikTeks(p.ttl)} − ${detikTeks(s.dari)} = ${detikTeks(s.sampai - s.dari)}` : null;
}

/** Baca database untuk mengisi satu kunci yang sama: memori satu per instance, Redis satu; null = tiap bacaan (tanpa cache). */
export function bacaKunci(p: Param): number | null {
  const salah = salahParam(p);
  if (salah.length) throw new Error(`simulasi cache: ${salah.join("; ")}`);
  if (p.cache === "tanpa") return null;
  return p.cache === "memori" ? p.instance : 1;
}
/** L = λ × W: koneksi yang dipegang bacaan katalog bila tiap bacaan membaca database. */
export const littleTanpa = (a: Aturan): number => a.lambda * a.w;

// --- Titik acuan dari rekaman -------------------------------------------------------------------------------------------

export interface AcuanDef { kunci: string; param: Param }
/**
 * Pengaturan cocok dengan titik acuan bila jenis, jumlah instance, TTL, dan kejadian sama; urutan hanya dihitung bila ada
 * hapus kunci yang berurutan (perubahan lewat tulis). Tanpa cache cocok dengan rekaman beban untuk semua pengaturan.
 */
export function samaAcuan(p: Param, d: AcuanDef): boolean {
  if (p.cache !== d.param.cache) return false;
  if (p.cache === "tanpa") return true;
  const urutanBerlaku = p.kejadian === "promo" || p.kejadian === "harga";
  return p.instance === d.param.instance && p.ttl === d.param.ttl && p.kejadian === d.param.kejadian && (!urutanBerlaku || p.urutan === d.param.urutan);
}
export function cariAcuan(p: Param, daftar: AcuanDef[]): string | null {
  return daftar.find((d) => samaAcuan(p, d))?.kunci ?? null;
}

// --- Teks ---------------------------------------------------------------------------------------------------------------

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}
/** Angka dengan koma desimal: (0,02605, 3) → "0,026". */
export const koma = (x: number, d: number): string => x.toFixed(d).replace(".", ",");
/** Detik: bilangan bulat tanpa desimal, selain itu satu desimal. */
export const detikTeks = (x: number): string => (Number.isInteger(x) ? String(x) : koma(x, 1));
/** Rupiah bulat dengan titik ribuan: 25000 → "Rp25.000". */
export const rupiah = (x: number): string => `Rp${String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
/** "Rp25.000, stok 50". */
export const isiTeks = (x: Isi, templat: string): string => isi(templat, { harga: rupiah(x.harga), stok: x.stok });

export interface PilihanTebak { teks: string; detik: number | null }
/** Indeks pilihan yang benar: tepat satu pilihan yang detiknya sama dengan detik pertama harga baru di rekaman. */
export function indeksBenar(pilihan: PilihanTebak[], detik: number): number {
  const cocok = pilihan.flatMap((q, i) => (q.detik === detik ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan berdetik ${detik}, harus tepat satu`);
  return cocok[0]!;
}
