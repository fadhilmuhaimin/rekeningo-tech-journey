// Gerak langkah baru di garis waktu widget race (I5e, keputusan 353). Widget race tetap skrip lama tanpa React
// (situs/lama/widgets/race.js); modul ini hanya menambah gerak dan dipasang lewat GerakRace.astro di halaman yang
// memuat race. Saat pembaca menekan Berikutnya (atau panah kanan), baris langkah yang baru ditambahkan di bawah garis
// waktu datang dari sedikit di bawah posisinya dan menjadi terlihat (`muncul`, token durasi sedang dan easing masuk),
// jadi mata tahu langkah mana yang baru. Langkah yang sudah lewat tidak bergerak. Tidak pernah dipanggil saat halaman
// dimuat, saat tab diganti, saat Sebelumnya, atau saat Ulang. Dengan prefers-reduced-motion tidak ada gerak sama
// sekali: baris langsung tampil di keadaan akhirnya.
import { muncul } from "./muncul";

/** Gerakkan baris langkah yang baru masuk. Gerak yang masih berjalan di baris itu dihentikan dulu. */
export function masukLangkah(el: HTMLElement | null) {
  if (!el) return null;
  el.getAnimations().forEach((a) => a.cancel());
  return muncul(el, "sedang");
}

/** Daftarkan gerak di `window.BB` (objek widget lama); race.js memanggilnya hanya bila ada. */
export function pasangGerakRace(w: Window & { BB?: Record<string, unknown> } = window) {
  w.BB = w.BB || {};
  w.BB.gerakRace = { masuk: masukLangkah };
}
