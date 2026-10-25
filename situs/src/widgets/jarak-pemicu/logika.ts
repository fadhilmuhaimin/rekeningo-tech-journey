// Logika murni widget "Seberapa jauh dari pemicu cache?" (ADR 21, keputusan 772): tanpa DOM, dites Vitest.
// W dibaca saat build dari labs/b2-query/output/ledger/n1.txt bagian E (median 5 kali, client Python, tanpa jaringan:
// batas bawah). Puncak request per detik datang dari registry (cerita.json tahap[1].asumsi). Pool 10 koneksi adalah Asumsi
// halaman 2.30; pemicunya separuh pool, karena L = λ × W adalah rata-rata dan satu detik tertentu bisa lebih besar.
// Rekaman yang bentuknya berubah menggagalkan build.

export const POOL = 10; // Asumsi (2.30): batas pool yang dibayangkan, bukan batas api-t2 (api-t2 tanpa batas)
export const AMBANG = POOL / 2; // koneksi tertahan rata-rata yang menyalakan pemicu (Asumsi)

export interface Cara {
  id: string;
  nama: string; // nama permintaan di rekaman
  cara: "N+1" | "JOIN";
  indeks: boolean; // kolom "dengan index riwayat"
  ms: number; // W: median 5 kali, tanpa jaringan antara server API dan database
}

// Urutan tetap = urutan tombol. Kolom: 0 = tanpa index riwayat, 1 = dengan index riwayat.
const DAFTAR: { id: string; nama: string; cara: "N+1" | "JOIN"; kolom: 0 | 1 }[] = [
  { id: "hal1-n1", nama: "Riwayat Budi hal. 1", cara: "N+1", kolom: 0 },
  { id: "hal1-join", nama: "Riwayat Budi hal. 1", cara: "JOIN", kolom: 0 },
  { id: "hal1-join-index", nama: "Riwayat Budi hal. 1", cara: "JOIN", kolom: 1 },
  { id: "seluruh-n1", nama: "Seluruh riwayat Budi", cara: "N+1", kolom: 0 },
  { id: "seluruh-join", nama: "Seluruh riwayat Budi", cara: "JOIN", kolom: 0 },
];

function bagianE(teks: string): string[] {
  const baris = teks.split("\n");
  const mulai = baris.findIndex((b) => b.startsWith("# --- E. "));
  if (mulai < 0) throw new Error("n1.txt: bagian E tidak ada");
  const akhir = baris.findIndex((b, i) => i > mulai && b.startsWith("# --- "));
  return baris.slice(mulai + 1, akhir < 0 ? undefined : akhir);
}

/** Baca lima baris waktu dari bagian E rekaman n1.txt. Baris yang hilang atau ganda menggagalkan build. */
export function bacaCara(teks: string): Cara[] {
  const e = new Map<string, [number, number]>();
  for (const b of bagianE(teks)) {
    const m = b.match(/^\s*(.+?)\s+\|\s+(N\+1|JOIN)\s+\|\s+([\d.]+) ms\s+\|\s+([\d.]+) ms\s*$/);
    if (m) {
      const kunci = `${m[1]}|${m[2]}`;
      if (e.has(kunci)) throw new Error(`n1.txt: baris ganda "${kunci}" di bagian E`);
      e.set(kunci, [Number(m[3]), Number(m[4])]);
    }
  }
  return DAFTAR.map((d) => {
    const w = e.get(`${d.nama}|${d.cara}`);
    if (!w) throw new Error(`n1.txt: waktu "${d.nama}" ${d.cara} tidak ada di bagian E`);
    return { id: d.id, nama: d.nama, cara: d.cara, indeks: d.kolom === 1, ms: w[d.kolom] };
  });
}

/** L = λ × W: koneksi tertahan rata-rata (Little 1961). λ per detik, W dalam milidetik. */
export const koneksi = (lambda: number, ms: number): number => lambda * (ms / 1000);

/** λ per detik yang membuat rata-rata `ambang` koneksi tertahan oleh satu kelas request dengan W = ms. */
export const lambdaPemicu = (ms: number, ambang: number = AMBANG): number => ambang / (ms / 1000);

/** Berapa kali lipat puncak sekarang (semua request di puncak berbentuk kelas ini). */
export const kaliPuncak = (ms: number, puncak: number, ambang: number = AMBANG): number => lambdaPemicu(ms, ambang) / puncak;

/** Puncak request per detik dari asumsi registry: user × aktif% × request ÷ 86.400 × faktor puncak. */
export function puncakPerDetik(a: { user: number; aktif: number; req: number; puncak: number }): number {
  return (((a.user * a.aktif) / 100) * a.req) / 86_400 * a.puncak;
}

const bulat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const satu = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dua = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const empat = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
export const angka = (n: number) => bulat.format(n);
export const desimal1 = (n: number) => satu.format(n);
export const desimal2 = (n: number) => dua.format(n);
export const desimal4 = (n: number) => empat.format(n);
/** Angka besar tanpa desimal (3.571), angka kecil satu desimal (2,6). */
export const besar = (n: number) => (n >= 100 ? angka(n) : desimal1(n));
/** Koneksi tertahan: empat desimal di bawah 0,1, dua desimal di bawah 10, satu desimal di atasnya. */
export const koneksiTeks = (n: number) => (n < 0.1 ? desimal4(n) : n < 10 ? desimal2(n) : desimal1(n));
export const waktu = (ms: number) => `${satu.format(ms)} ms`;

/** Angka besar dibulatkan ke dua angka penting untuk tebakan: 2.571 jadi 2.600, 117,6 jadi 120. */
export function duaAngkaPenting(n: number): number {
  if (n === 0) return 0;
  const f = 10 ** (Math.floor(Math.log10(Math.abs(n))) - 1);
  return Number((Math.round(n / f) * f).toPrecision(2));
}

/** Lebar batang dalam persen pada skala logaritma terhadap kelipatan terbesar; minimal 2 supaya batang terkecil terlihat. */
export function lebarLog(kali: number, maks: number): number {
  if (maks <= 1) return 100;
  return Math.max(2, Math.min(100, Math.round((Math.log10(Math.max(kali, 1)) / Math.log10(maks)) * 100)));
}

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}

export interface PilihanTebak { kali: number; alasan: string }

/** Indeks pilihan yang benar: tepat satu pilihan yang paling dekat (dalam 5%) dengan hitungan, yang lain jauh (> 50%). */
export function indeksBenar(pilihan: PilihanTebak[], hitungan: number): number {
  const dekat = pilihan.flatMap((p, i) => (Math.abs(p.kali - hitungan) / hitungan <= 0.05 ? [i] : []));
  if (dekat.length !== 1) throw new Error(`tebakan: ${dekat.length} pilihan dalam 5% dari ${hitungan}, harus tepat satu`);
  const jauh = pilihan.every((p, i) => i === dekat[0] || Math.abs(p.kali - hitungan) / hitungan > 0.5);
  if (!jauh) throw new Error("tebakan: ada pilihan salah yang terlalu dekat dengan hitungan");
  return dekat[0]!;
}
