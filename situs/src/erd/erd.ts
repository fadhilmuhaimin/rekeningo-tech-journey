// Logika murni ERD statis (keputusan 375): tata, label kunci per kolom, dan ringkasan teks dari katalog PostgreSQL.
// Dipakai src/components/Erd.astro saat build; dites di erd.test.ts.
import type { DataErd, Tabel } from "./skema";

export type Kunci = { jenis: "PK" | "FK" | "UNIQUE" | "CHECK"; teks: string };

/**
 * Tata bintang: satu tabel induk yang dirujuk, tabel lain menunjuk HANYA ke induk itu. Ini bentuk skema Tahap 1
 * (semua foreign key ke akun.id). Bentuk lain (rantai jurnal → posting → buku di Tahap 2) melempar error, supaya
 * build gagal dan tata baru dibuat, bukan menggambar garis yang salah.
 */
export function tataBintang(d: DataErd): { induk: Tabel; anak: Tabel[] } {
  const keLuar = (t: Tabel) => t.fk.filter((f) => f.ke_tabel !== t.nama);
  const akar = d.tabel.filter((t) => keLuar(t).length === 0);
  if (akar.length !== 1)
    throw new Error(`ERD Tahap ${d.tahap}: tata bintang butuh tepat satu tabel tanpa foreign key, ada ${akar.length}`);
  const induk = akar[0];
  const anak = d.tabel.filter((t) => t !== induk);
  for (const t of anak)
    for (const f of keLuar(t))
      if (f.ke_tabel !== induk.nama)
        throw new Error(`ERD Tahap ${d.tahap}: ${t.nama}.${f.nama} menunjuk ke ${f.ke_tabel}, bukan ${induk.nama}; tata bintang tidak cukup`);
  return { induk, anak };
}

/** Dua kolom desktop; urutan baca di HP tetap urutan katalog (kolom kiri dulu, lalu kanan). */
export function bagiDua<T>(xs: T[]): [T[], T[]] {
  const n = Math.ceil(xs.length / 2);
  return [xs.slice(0, n), xs.slice(n)];
}

const TIPE: Record<string, string> = {
  "timestamp with time zone": "timestamptz",
  "timestamp without time zone": "timestamp",
  "time with time zone": "timetz",
};

/** Nama tipe dari format_type() ke alias pendek PostgreSQL yang dipakai di file skema. */
export function ringkasTipe(tipe: string): string {
  return TIPE[tipe] ?? tipe.replace(/^character varying/, "varchar");
}

/**
 * Ekspresi CHECK dari pg_get_expr() ke bentuk yang dekat dengan file skema: cast ::text pada literal dibuang,
 * `x = ANY (ARRAY[...])` jadi `x IN (...)` (PostgreSQL menyimpan IN sebagai ANY), TRIM(BOTH FROM x) jadi trim(x).
 */
export function ringkasCek(e: string): string {
  let s = e.replace(/('(?:[^']|'')*')::text/g, "$1");
  s = s.replace(/TRIM\(BOTH FROM (\w+)\)/g, "trim($1)");
  const any = s.match(/^(\w+) = ANY \(ARRAY\[(.*)\]\)$/);
  return any ? `${any[1]} IN (${any[2]})` : s;
}

/** Label kunci satu kolom, berupa teks (tidak hanya warna): PK, FK → tabel.kolom, UNIQUE, CHECK. */
export function kunciKolom(t: Tabel, kolom: string): Kunci[] {
  const k: Kunci[] = [];
  if (t.pk.includes(kolom)) k.push({ jenis: "PK", teks: "PK" });
  for (const f of t.fk) {
    const i = f.kolom.indexOf(kolom);
    if (i >= 0) k.push({ jenis: "FK", teks: `FK → ${f.ke_tabel}.${f.ke_kolom[i]}` });
  }
  if (t.unik.some((u) => u.kolom.includes(kolom))) k.push({ jenis: "UNIQUE", teks: "UNIQUE" });
  if (t.cek.some((c) => c.kolom.includes(kolom))) k.push({ jenis: "CHECK", teks: "CHECK" });
  return k;
}

/** Banyaknya foreign key dari tabel lain yang menunjuk ke tabel ini. */
export function jumlahRujukan(d: DataErd, nama: string): number {
  return d.tabel.reduce((n, t) => n + t.fk.filter((f) => f.ke_tabel === nama && t.nama !== nama).length, 0);
}

/** Index di luar PK dan UNIQUE: "btree (dari, dibuat DESC)" jadi "(dari, dibuat DESC)"; metode selain btree disebut. */
export function ringkasIndex(definisi: string): string {
  return definisi.replace(/^btree /, "");
}
