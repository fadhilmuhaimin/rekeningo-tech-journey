// Angka yang berubah karena tindakan pembaca bergerak singkat dari nilai lama ke nilai baru (I5d, keputusan 352):
// saldo dan total di widget jumlah-total, saldo di mockup HP widget alur. Dipanggil hanya sesudah klik atau
// pilihan pembaca, tidak pernah saat halaman dimuat.
//
// `animate` mini Motion hanya menggerakkan gaya CSS lewat Web Animations API, tidak bisa menggerakkan teks;
// `animate` hybrid bisa (`onUpdate`) tetapi ±18 KB. Jadi tween ini satu loop requestAnimationFrame dengan
// durasi dan kurva dari token gerak, dan `cubicBezier` dari Motion untuk kurvanya.
// https://motion.dev/docs/animate
//
// Angka antara selalu bilangan bulat rupiah dengan format yang sama dengan nilai akhir; frame terakhir tepat
// nilai akhir. Pemanggil menjaga agar pembaca layar hanya membaca nilai akhir (teks antara `aria-hidden`
// atau di dalam `role="img"` yang berlabel nilai akhir). Dengan prefers-reduced-motion nilai akhir langsung tampil.
import { cubicBezier } from "motion";
import { durasi, easing } from "./token";

/** Nilai pada kemajuan `p` (0–1, sesudah kurva), dibulatkan ke rupiah utuh; p ≥ 1 selalu tepat `ke`. */
export function nilaiAntara(dari: number, ke: number, p: number): number {
  if (p >= 1) return ke;
  if (p <= 0) return dari;
  return Math.round(dari + (ke - dari) * p);
}

export interface Tween {
  /** Hentikan tween; kembalikan nilai yang sedang tampil, untuk tween berikutnya yang menyela. */
  berhenti: () => number;
}

const kurangiGerak = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Ubah teks `el` dari `dari` ke `ke` dalam durasi token `sedang` dengan kurva `masuk`.
 * Frame pertama (sinkron, sebelum browser menggambar) menampilkan `dari`. `selesai` dipanggil saat nilai akhir
 * tampil (langsung, atau di frame terakhir), tidak bila tween dihentikan.
 */
export function tweenAngka(
  el: HTMLElement,
  dari: number,
  ke: number,
  format: (n: number) => string,
  kurangi = kurangiGerak(),
  selesai?: () => void,
): Tween {
  if (kurangi || dari === ke) {
    el.textContent = format(ke);
    selesai?.();
    return { berhenti: () => ke };
  }
  const kurva = cubicBezier(...easing.masuk);
  const lama = durasi.sedang * 1000;
  const mulai = performance.now();
  let sekarang = dari;
  let id = 0;
  el.textContent = format(dari);
  const langkah = (t: number) => {
    const p = Math.min(1, Math.max(0, (t - mulai) / lama));
    sekarang = nilaiAntara(dari, ke, p >= 1 ? 1 : kurva(p));
    el.textContent = format(sekarang);
    if (p < 1) id = requestAnimationFrame(langkah);
    else selesai?.();
  };
  id = requestAnimationFrame(langkah);
  return {
    berhenti: () => {
      cancelAnimationFrame(id);
      return sekarang;
    },
  };
}

/**
 * Satu langkah efek komponen angka (Rupiah di jumlah-total): gerakkan `el` dari angka yang sedang tampil (`dari`,
 * hasil `berhenti()` tween sebelumnya) ke `ke`, dan laporkan lewat `bergerak` apakah tween sedang berjalan.
 * `bergerak(true)` hanya bila tween benar-benar berjalan; setiap jalur yang berakhir tanpa tween berjalan melapor
 * `false`: frame terakhir, nilai sama dengan angka yang tampil (juga sesudah tween disela sebelum frame pertamanya,
 * misalnya klik ganda Berikutnya; perbaikan review 2, keputusan 352), reduced motion, dan elemen belum ada.
 */
export function gerakkanAngka(
  el: HTMLElement | null,
  dari: number,
  ke: number,
  format: (n: number) => string,
  bergerak: (b: boolean) => void,
  kurangi = kurangiGerak(),
): Tween {
  if (!el || dari === ke) {
    bergerak(false);
    return { berhenti: () => ke };
  }
  let jalan = true;
  const tw = tweenAngka(el, dari, ke, format, kurangi, () => {
    jalan = false;
    bergerak(false);
  });
  if (jalan) bergerak(true);
  return tw;
}
