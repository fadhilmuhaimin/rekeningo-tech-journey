// Gerak paket data di widget alur (I5c, keputusan 261). Widget alur tetap skrip lama tanpa React
// (situs/lama/widgets/alur.js); modul ini hanya menambah gerak dan dipasang lewat GerakAlur.astro di halaman
// yang memuat alur. Saat pembaca menekan Berikutnya atau Sebelumnya, paket berangkat dari komponen asal
// (`dari`) dan berhenti di posisi akhirnya, di antara asal dan tujuan; langkah lokal bergeser dari posisi
// sebelumnya. Posisi akhir tetap ditulis alur.js seperti sebelumnya; gerak hanya translate dari titik awal
// ke titik akhir (teknik FLIP), jadi tata letak saat diam sama persis dengan versi tanpa gerak.
// `animate` mini Motion (Web Animations API) dan token durasi, sama dengan blok lipat (keputusan 238),
// supaya 28 halaman alur tidak memuat React. Tidak pernah dipanggil saat halaman dimuat atau saat ukuran berubah.
// Dengan prefers-reduced-motion tidak ada gerak sama sekali: paket langsung di posisi akhirnya.
import { animate } from "motion/mini";
import { durasi, easing } from "./token";
import { tweenAngka } from "./angka";

/** Posisi paket dalam piksel (offsetLeft, offsetTop di dalam jalurnya). */
export interface Titik {
  x: number;
  y: number;
}

/**
 * Keyframe paket: translate dari titik awal (relatif ke posisi akhir) ke 0, ditambah opacity bila paket
 * baru muncul. Null bila tidak ada yang perlu digerakkan.
 */
export function kerangkaPaket(awal: Titik, akhir: Titik, baruMuncul: boolean) {
  const dx = Math.round(awal.x - akhir.x);
  const dy = Math.round(awal.y - akhir.y);
  if (!dx && !dy && !baruMuncul) return null;
  const k: { translate: string[]; opacity?: number[] } = { translate: [`${dx}px ${dy}px`, "0px 0px"] };
  if (baruMuncul) k.opacity = [0, 1];
  return k;
}

export const kurangiGerak = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Gerakkan paket dari `awal` ke posisi akhirnya. Gerak yang masih berjalan dihentikan dulu. */
export function geserPaket(el: HTMLElement | null, awal: Titik, akhir: Titik, baruMuncul: boolean) {
  if (!el) return null;
  el.getAnimations().forEach((a) => a.cancel());
  if (kurangiGerak()) return null;
  const k = kerangkaPaket(awal, akhir, baruMuncul);
  return k ? animate(el, k, { duration: durasi.sedang, ease: easing.masuk }) : null;
}

/** Daftarkan gerak di `window.BB` (objek widget lama): paket dan saldo HP (I5d); alur.js memanggilnya hanya bila ada. */
export function pasangGerakAlur(w: Window & { BB?: Record<string, unknown> } = window) {
  w.BB = w.BB || {};
  w.BB.gerakAlur = { geser: geserPaket, angka: tweenAngka };
}
