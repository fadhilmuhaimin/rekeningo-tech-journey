// Ekspor dan impor progres pembaca (P7, keputusan 365). Logika murni tanpa DOM; penyimpanan lewat antarmuka kecil
// supaya dites Vitest dengan Map. Yang diekspor hanya kunci progres yang ditulis situs (allowlist):
//   rtj-blok:<path>        Blok.astro, daftar blok yang selesai per halaman
//   bb1:selesai:<path>     widget lama "selesai" (26 halaman versi lama), halaman yang ditandai selesai
//   bb1:kartu:<id>         widget lama "kartu", jadwal ulang per kartu
//   rtj-peran              SidebarPeran.astro dan Beranda.astro, jalur baca
//   rtj-terakhir           KamuDiSini.astro, halaman terakhir untuk kartu Lanjutkan di beranda
// Tidak diekspor: starlight-theme, rtj-fokus, rtj-toc (pengaturan per perangkat) dan bb1:fb:* (umpan balik punya
// ekspor sendiri di /alat/umpan-balik/). File dari pembaca adalah data tak tepercaya: kunci localStorage selalu
// disusun di sini dari nilai yang lolos pola, tidak pernah diambil mentah dari file.
import { z } from "zod";
import { PERAN } from "./registri";
import { KUNCI_BLOK, KUNCI_SELESAI } from "./selesai";

export const FORMAT = "rekeningo-progres";
export const VERSI = 1;
/** Batas ukuran file impor. Progres penuh seluruh situs diukur 28,8 KB: 208 blok di 42 halaman, 26 halaman lama,
 *  172 kartu (keputusan 365). */
export const BATAS_BYTE = 256 * 1024;

export const K = { blok: KUNCI_BLOK, selesai: KUNCI_SELESAI, kartu: "bb1:kartu:", peran: "rtj-peran", terakhir: "rtj-terakhir" } as const;

export interface Penyimpanan {
  readonly length: number;
  key(i: number): string | null;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

// Path halaman di situs ini: diawali satu "/", tanpa skema, tanpa "//". Dipakai beranda sebagai href kartu Lanjutkan,
// jadi pola ini juga menutup `javascript:` dan tautan ke situs lain.
const Path = z.string().max(200).regex(/^\/(?!\/)[A-Za-z0-9._~\-/%]*$/);
const unik = (a: string[]) => new Set(a).size === a.length;
const IdBlok = z.string().regex(/^blok-[a-z0-9-]{1,60}$/);
// Huruf atau angka di depan: menolak "__proto__".
const IdKartu = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,59}$/);
const Judul = z.string().max(200);
const Tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const JALUR = ["generalis", ...PERAN] as const;

const Blok = z.object({ halaman: Path, selesai: z.array(IdBlok).min(1).max(12).refine((a) => unik(a), "blok ganda") });
const Selesai = z.object({ halaman: Path, waktu: z.iso.datetime(), judul: Judul });
const Kartu = z.object({ id: IdKartu, kotak: z.number().int().min(1).max(5), jadwal: Tanggal });
const Terakhir = z.object({ halaman: Path, judul: Judul.min(1), blok: z.number().int().min(0).max(20) });


export const FileProgres = z.object({
  format: z.literal(FORMAT),
  versi: z.literal(VERSI),
  dibuat: z.iso.datetime(),
  blok: z.array(Blok).max(500).refine((a) => unik(a.map((x) => x.halaman)), "halaman ganda"),
  halamanSelesai: z.array(Selesai).max(500).refine((a) => unik(a.map((x) => x.halaman)), "halaman ganda"),
  kartu: z.array(Kartu).max(2000).refine((a) => unik(a.map((x) => x.id)), "kartu ganda"),
  jalur: z.enum(JALUR).nullable(),
  terakhir: Terakhir.nullable(),
});
export type FileProgres = z.infer<typeof FileProgres>;

// Bentuk nilai di localStorage, sama dengan yang ditulis komponen dan widget lama.
const SimpanBlok = z.array(IdBlok).max(12);
const SimpanSelesai = z.object({ waktu: z.iso.datetime(), judul: Judul });
const SimpanKartu = z.object({ k: z.number().int().min(1).max(5), due: Tanggal });
const SimpanTerakhir = z.object({ u: Path, j: Judul.min(1), n: z.number().int().min(0).max(20) });

const json = (s: string | null): unknown => {
  if (s === null) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
};

/** Semua kunci progres yang ada di penyimpanan (allowlist). Kunci lain tidak pernah disentuh. */
export function kunciProgres(s: Penyimpanan): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && (k.startsWith(K.blok) || k.startsWith(K.selesai) || k.startsWith(K.kartu) || k === K.peran || k === K.terakhir)) out.push(k);
  }
  return out.sort();
}

export interface HasilEkspor { file: FileProgres; dilewati: string[] }

/** Kumpulkan progres dari penyimpanan. Entri yang rusak dilewati dan dihitung, tidak diam-diam dibuang. */
export function ekspor(s: Penyimpanan, kini: Date): HasilEkspor {
  const file: FileProgres = { format: FORMAT, versi: VERSI, dibuat: kini.toISOString(), blok: [], halamanSelesai: [], kartu: [], jalur: null, terakhir: null };
  const dilewati: string[] = [];
  for (const k of kunciProgres(s)) {
    const v = s.getItem(k);
    let ok = false;
    if (k.startsWith(K.blok)) {
      const halaman = Path.safeParse(k.slice(K.blok.length));
      const isi = SimpanBlok.safeParse(json(v));
      if (halaman.success && isi.success) {
        ok = true;
        const selesai = [...new Set(isi.data)];
        if (selesai.length) file.blok.push({ halaman: halaman.data, selesai });
      }
    } else if (k.startsWith(K.selesai)) {
      const halaman = Path.safeParse(k.slice(K.selesai.length));
      const isi = SimpanSelesai.safeParse(json(v));
      if ((ok = halaman.success && isi.success)) file.halamanSelesai.push({ halaman: halaman.data!, ...isi.data! });
    } else if (k.startsWith(K.kartu)) {
      const id = IdKartu.safeParse(k.slice(K.kartu.length));
      const isi = SimpanKartu.safeParse(json(v));
      if ((ok = id.success && isi.success)) file.kartu.push({ id: id.data!, kotak: isi.data!.k, jadwal: isi.data!.due });
    } else if (k === K.peran) {
      const isi = z.enum(JALUR).safeParse(v);
      if ((ok = isi.success)) file.jalur = isi.data!;
    } else if (k === K.terakhir) {
      const isi = SimpanTerakhir.safeParse(json(v));
      if ((ok = isi.success)) file.terakhir = { halaman: isi.data!.u, judul: isi.data!.j, blok: isi.data!.n };
    }
    if (!ok) dilewati.push(k);
  }
  return { file, dilewati };
}

export function namaFile(kini: Date): string {
  const d = (n: number) => String(n).padStart(2, "0");
  return `rekeningo-progres-${kini.getFullYear()}-${d(kini.getMonth() + 1)}-${d(kini.getDate())}.json`;
}

export type HasilBaca = { ok: true; file: FileProgres } | { ok: false; pesan: string };

/** Baca isi file pilihan pembaca. `ukuran` dari File.size, dicek sebelum teks dibaca. */
export function bacaFile(teks: string, ukuran: number): HasilBaca {
  if (ukuran > BATAS_BYTE) return { ok: false, pesan: `File terlalu besar (${Math.ceil(ukuran / 1024)} KB). Batasnya ${BATAS_BYTE / 1024} KB; file progres biasanya di bawah 40 KB.` };
  const data = json(teks);
  if (data === undefined) return { ok: false, pesan: "File ini bukan JSON yang bisa dibaca. Pilih file rekeningo-progres-….json hasil Ekspor progres." };
  const amplop = z.object({ format: z.unknown(), versi: z.unknown() }).safeParse(data);
  if (!amplop.success || amplop.data.format !== FORMAT) return { ok: false, pesan: "File ini bukan file progres Rekeningo. Pilih file hasil Ekspor progres." };
  // Nilai versi dari file hanya ditulis bila bilangan bulat: array bersarang ribuan tingkat membuat String() melempar
  // RangeError, dan teks bebas dari file tidak ikut tampil.
  const versi = amplop.data.versi;
  if (versi !== VERSI) {
    const nama = typeof versi === "number" && Number.isInteger(versi) ? `versi ${versi}` : "versi yang tidak dikenal";
    return { ok: false, pesan: `File ini memakai format ${nama}, sedangkan halaman ini membaca versi ${VERSI}. Tidak ada yang diubah.` };
  }
  const hasil = FileProgres.safeParse(data);
  if (!hasil.success) {
    const isu = hasil.error.issues[0]!;
    const letak = isu.path.length ? isu.path.join(".") : "akar file";
    return { ok: false, pesan: `File progres rusak di bagian "${letak}". Tidak ada yang diubah.` };
  }
  return { ok: true, file: hasil.data };
}

export interface Ringkasan { blok: number; halaman: number; selesai: number; kartu: number; jalur: string | null; terakhir: string | null }

export function ringkas(f: FileProgres): Ringkasan {
  return {
    blok: f.blok.reduce((n, b) => n + b.selesai.length, 0),
    halaman: f.blok.length,
    selesai: f.halamanSelesai.length,
    kartu: f.kartu.length,
    jalur: f.jalur,
    terakhir: f.terakhir?.judul ?? null,
  };
}

export type Mode = "gabung" | "ganti";

export class GagalSimpan extends Error {}

/** Daftar pasangan kunci-nilai yang akan ditulis untuk mode tertentu, dihitung dari file dan isi penyimpanan sekarang.
 *  gabung: blok dan halaman selesai digabung; kartu dan jalur yang sudah ada tetap; halaman terakhir dari file,
 *  karena pembaca mengimpor untuk melanjutkan dari perangkat lain.
 *  ganti: semua kunci progres dihapus, lalu isi file ditulis. */
export function rencana(s: Penyimpanan, f: FileProgres, mode: Mode): Map<string, string> {
  const tulis = new Map<string, string>();
  const ada = (k: string) => mode === "gabung" && s.getItem(k) !== null;
  for (const b of f.blok) {
    const k = K.blok + b.halaman;
    const lama = mode === "gabung" ? SimpanBlok.safeParse(json(s.getItem(k))) : null;
    const gabungan = [...new Set([...(lama?.success ? lama.data : []), ...b.selesai])].slice(0, 12);
    tulis.set(k, JSON.stringify(gabungan));
  }
  for (const h of f.halamanSelesai) {
    const k = K.selesai + h.halaman;
    if (!ada(k)) tulis.set(k, JSON.stringify({ waktu: h.waktu, judul: h.judul }));
  }
  for (const c of f.kartu) {
    const k = K.kartu + c.id;
    if (!ada(k)) tulis.set(k, JSON.stringify({ k: c.kotak, due: c.jadwal }));
  }
  if (f.jalur && !ada(K.peran)) tulis.set(K.peran, f.jalur);
  if (f.terakhir) tulis.set(K.terakhir, JSON.stringify({ u: f.terakhir.halaman, j: f.terakhir.judul, n: f.terakhir.blok }));
  return tulis;
}

/** Terapkan file ke penyimpanan. Kalau penulisan gagal di tengah (kuota penuh, mode privat), isi lama dipulihkan. */
export function terapkan(s: Penyimpanan, f: FileProgres, mode: Mode): number {
  const tulis = rencana(s, f, mode);
  const cadangan = new Map(kunciProgres(s).map((k) => [k, s.getItem(k)!] as const));
  try {
    if (mode === "ganti") for (const k of cadangan.keys()) s.removeItem(k);
    for (const [k, v] of tulis) s.setItem(k, v);
  } catch (e) {
    try {
      for (const k of kunciProgres(s)) s.removeItem(k);
      for (const [k, v] of cadangan) s.setItem(k, v);
    } catch { /* pemulihan juga gagal: laporkan kegagalan pertama */ }
    throw new GagalSimpan(e instanceof Error ? e.message : String(e));
  }
  return tulis.size;
}
