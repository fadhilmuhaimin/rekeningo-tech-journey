// Pemilihan halaman untuk alat ukur yang memeriksa semua halaman (keputusan 866).
// Bawaan: semua halaman, tanpa perubahan perilaku. Hanya bila variabel lingkungan UKUR_HALAMAN menunjuk ke sebuah
// berkas daftar (satu path URL per baris, mis. /tahap-1/transaction/ dan / untuk beranda), alat memeriksa
// irisan daftar itu dengan halaman yang memang diperiksanya. Berkas itu dibuat tools/pilih_halaman.py di CI untuk PR
// yang hanya mengubah halaman; di main, jadwal malam, dan laptop variabelnya tidak ada.
//   - Variabel ada tetapi berkasnya tidak terbaca: alat gagal (exit 1), bukan diam-diam memeriksa semua atau tidak sama sekali.
//   - Berkas kosong: nol halaman (PR yang tidak mengubah halaman mana pun). Alat tetap berjalan dan mencetak jumlahnya.
// Bentuk kanonik path: diawali dan diakhiri "/" ("/" untuk beranda). Tiap alat memetakan daftarnya sendiri ke bentuk itu.
import fs from "node:fs";

export const kanonik = (p) => {
  const s = ("/" + String(p).trim() + "/").replace(/\/+/g, "/");
  return s;
};

let cache;
// Mengembalikan Set path kanonik, atau null bila semua halaman harus diperiksa.
export function terpilih(env = process.env) {
  const berkas = env.UKUR_HALAMAN;
  if (!berkas) return null;
  if (cache && cache.berkas === berkas) return cache.nilai;
  let teks;
  try { teks = fs.readFileSync(berkas, "utf8"); }
  catch (e) { console.error(`GAGAL: UKUR_HALAMAN=${berkas} tidak terbaca (${e.code ?? e.message}); hapus variabelnya untuk memeriksa semua halaman.`); process.exit(1); }
  const nilai = new Set(teks.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map(kanonik));
  cache = { berkas, nilai };
  return nilai;
}

// Menyaring daftar halaman sebuah alat. kunci(x) memetakan elemen daftar ke path (bentuk apa pun, dikanonikkan).
// Tanpa UKUR_HALAMAN daftar dikembalikan apa adanya (objek yang sama). Mencetak satu baris ringkasan bila disaring,
// supaya log CI menunjukkan berapa halaman yang diperiksa.
export function saring(daftar, kunci = (x) => x, { alat = "alat", env = process.env } = {}) {
  const pilih = terpilih(env);
  if (!pilih) return daftar;
  const hasil = daftar.filter((x) => pilih.has(kanonik(kunci(x))));
  console.log(`halaman dipilih ${alat}: ${hasil.length} dari ${daftar.length} (UKUR_HALAMAN, keputusan 866)`);
  return hasil;
}
