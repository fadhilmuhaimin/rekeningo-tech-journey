// Rujukan internal di komentar berkas lab (nomor keputusan, nomor PR) tidak ditampilkan ke pembaca (keputusan 1180).
//
// Setiap lab menulis "(keputusan NNN)" di kepala rekamannya dan di komentar kodenya, dan Snippet menampilkan berkas itu
// apa adanya. Nomor itu hidup di plan/KEPUTUSAN.md, yang tidak ada di situs, jadi bagi pembaca ia hanya bunyi aneh
// (CLAUDE.md `<gerbang_kualitas>`: tidak ada ID internal tampil). Rentang baris tidak bisa membuangnya: rujukan itu sering
// berada di ujung kalimat komentar atau di dalam rekaman yang dibahas halaman.
//
// Fungsi ini hanya membuang frasa rujukan dan tidak mengubah jumlah baris. Berkas lab dan rekamannya tidak diubah.
// Bentuk yang tidak dikenali dibiarkan, lalu `tools/cek_id_tampil.py` menggagalkan build: tambahkan bentuknya di sini
// dan di `rujukan-internal.test.ts`, jangan melonggarkan pemeriksa.

const ANGKA = String.raw`#?\d{2,4}(?:[ \t]*(?:[–-]|,|dan)[ \t]*#?\d{2,4})*`;
const REF = String.raw`(?:(?:keputusan|Keputusan|KEPUTUSAN)[ \t]+${ANGKA}|PR[ \t]*${ANGKA})`;
const PEMBUKA = String.raw`(?:(?:mutasi|tinjauan|peninjau|lihat|pola|usulan di|sesuai)[ \t]+)*`;
const RUJUKAN = String.raw`${PEMBUKA}${REF}(?:[ \t]*[,;][ \t]*${PEMBUKA}${REF})*`;
const KURUNG = String.raw`\([ \t]*${RUJUKAN}[ \t]*\)`;

// "// (keputusan 659). Password ..." di awal baris komentar menyambung kalimat baris sebelumnya: titiknya ikut pindah.
const AWAL_KOMENTAR = new RegExp(String.raw`([^\s.!?:;,])(\n[ \t]*(?:\/\/|#|--)[ \t]*)${KURUNG}\.[ \t]*`, "g");
// Kurung rujukan di awal baris (sesudah penanda komentar, kalau ada) tanpa kalimat sebelumnya: kurung dan titiknya dibuang.
const AWAL_BARIS = new RegExp(String.raw`^([ \t]*(?:(?:\/\/|#|--)[ \t]*)?)${KURUNG}\.?[ \t]*`, "gm");
// "(keputusan 247)." atau "(lihat KEPUTUSAN 415)": seluruh kurung hanya berisi rujukan, spasi sebelumnya ikut dibuang.
const KURUNG_RUJUKAN = new RegExp(String.raw`[ \t]*${KURUNG}`, "g");
// "(lab-api-t2a, keputusan 646)" dan "(fsync(2), keputusan 506)": rujukan di ujung kurung yang masih punya isi lain.
const EKOR_KURUNG = new RegExp(String.raw`[ \t]*,[ \t]*${RUJUKAN}(?=[ \t]*\))`, "g");
// "(keputusan 646, lab-api-t2a)": rujukan di pangkal kurung.
const PANGKAL_KURUNG = new RegExp(String.raw`(?<=\()[ \t]*${RUJUKAN}[ \t]*,[ \t]*`, "g");

export function bersihkanRujukanInternal(teks: string): string {
  return teks
    .replace(AWAL_KOMENTAR, "$1.$2")
    .replace(AWAL_BARIS, "$1")
    .replace(KURUNG_RUJUKAN, "")
    .replace(EKOR_KURUNG, "")
    .replace(PANGKAL_KURUNG, "");
}
