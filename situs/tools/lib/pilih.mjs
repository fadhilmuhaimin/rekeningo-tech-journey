// Pemilihan halaman untuk alat ukur yang memeriksa semua halaman (keputusan 866).
// Bawaan: semua halaman, tanpa perubahan perilaku. Hanya bila variabel lingkungan UKUR_HALAMAN menunjuk ke sebuah
// berkas daftar (satu path URL per baris, mis. /tahap-1/transaction/ dan / untuk beranda), alat memeriksa
// irisan daftar itu dengan halaman yang memang diperiksanya. Berkas itu dibuat tools/pilih_halaman.py di CI untuk PR
// yang hanya mengubah halaman; di main, jadwal malam, dan laptop variabelnya tidak ada.
//   - Variabel ada tetapi berkasnya tidak terbaca: alat gagal (exit 1), bukan diam-diam memeriksa semua atau tidak sama sekali.
//   - Berkas kosong: nol halaman (PR yang tidak mengubah halaman mana pun). Alat tetap berjalan dan mencetak jumlahnya.
//   - Baris yang bukan path (tidak diawali "/") menggagalkan alat, dan bila dist ada, tiap path di daftar harus ada di dist
//     (UKUR_DIST, bawaan ./dist, keputusan 868): daftar rusak atau dari dist lain tidak boleh lolos sebagai "nol halaman".
// Bentuk kanonik path: diawali dan diakhiri "/" ("/" untuk beranda). Tiap alat memetakan daftarnya sendiri ke bentuk itu.
import fs from "node:fs";
import path from "node:path";

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
  const baris = teks.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const rusak = baris.filter((l) => !/^\/\S*$/.test(l));
  if (rusak.length) gagalDaftar(berkas, `baris bukan path (harus diawali "/"): ${rusak.slice(0, 3).map((l) => JSON.stringify(l)).join(", ")}`);
  const nilai = new Set(baris.map(kanonik));
  const dist = env.UKUR_DIST || "dist";
  if (fs.existsSync(path.join(dist, "index.html"))) {
    const hilang = [...nilai].filter((p) => !fs.existsSync(path.join(dist, berkasDist(p))));
    if (hilang.length) gagalDaftar(berkas, `${hilang.length} path tidak ada di ${dist}: ${hilang.slice(0, 3).join(", ")}`);
  }
  cache = { berkas, nilai };
  return nilai;
}

// Path kanonik halaman -> berkas HTML di dist ("/tahap-1/a/" -> "tahap-1/a/index.html", "/404.html/" -> "404.html").
const berkasDist = (p) => (p.endsWith(".html/") ? p.slice(1, -1) : p.slice(1) + "index.html");
function gagalDaftar(berkas, alasan) {
  console.error(`GAGAL: UKUR_HALAMAN=${berkas} tidak cocok dengan dist: ${alasan}; daftar kosong sah, daftar rusak tidak.`);
  process.exit(1);
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
