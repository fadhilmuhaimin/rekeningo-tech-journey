// Wadah tabel yang digulir ke samping (A11y-gulir-tabel, keputusan 712). Build (`rehype-tabel-gulir.mjs`) memberi setiap
// wadah role="region", aria-label, dan tabindex="0", jadi tanpa JavaScript semua tabel bisa dicapai Tab. Di browser,
// skrip ini mencabut ketiganya dari wadah yang tidak meluap supaya tabel yang muat tidak menambah tab stop, dan
// memasangnya lagi saat wadah meluap (ukuran layar berubah, blok dibuka, font selesai dimuat). Meluap mengikuti
// aturan ACT 0ssw9k: jarak gulir lebih dari 0 px di salah satu sumbu (axe-core 4.14.0 baru menilai di atas 13 px).

/** Ukuran yang dibaca dari wadah; dipisah dari DOM supaya bisa dites tanpa browser. */
export interface UkuranGulir {
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
}

export function meluap(u: UkuranGulir): boolean {
  return u.scrollWidth > u.clientWidth || u.scrollHeight > u.clientHeight;
}

/** Bagian elemen yang disentuh `atur`; HTMLElement memenuhinya. */
export interface WadahAtribut {
  getAttribute(nama: string): string | null;
  setAttribute(nama: string, nilai: string): void;
  removeAttribute(nama: string): void;
  dataset: Record<string, string | undefined>;
}

/**
 * Wadah meluap: role region, nama, dan tabindex dipasang. Tidak meluap: ketiganya dicabut (aria-label tanpa role
 * dilarang di elemen generik, ARIA 1.2), kecuali wadah sedang difokus supaya fokus pembaca tidak hilang ke body.
 * Nama asli disimpan di data-nama.
 */
export function atur(el: WadahAtribut, luap: boolean, difokus: boolean): void {
  const nama = el.dataset.nama ?? el.getAttribute("aria-label") ?? "";
  el.dataset.nama = nama;
  if (luap) {
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", nama);
    el.setAttribute("tabindex", "0");
  } else if (!difokus) {
    el.removeAttribute("role");
    el.removeAttribute("aria-label");
    el.removeAttribute("tabindex");
  }
}

export const PEMILIH = ".sl-markdown-content .tabel-gulir";

/** Dipanggil sekali per halaman; ResizeObserver mengamati wadah dan tabelnya (isi bisa melebar tanpa wadah berubah). */
export function pasang(akar: ParentNode = document): void {
  const semua = Array.from(akar.querySelectorAll<HTMLElement>(PEMILIH));
  if (!semua.length) return;
  const nilai = (el: HTMLElement) => atur(el, meluap(el), document.activeElement === el);
  if (typeof ResizeObserver === "undefined") return; // atribut dari build tetap: semua wadah bisa difokus
  const ro = new ResizeObserver((catatan) => {
    const wadah = new Set(catatan.map((c) => (c.target as HTMLElement).closest<HTMLElement>(".tabel-gulir")));
    for (const el of wadah) if (el) nilai(el);
  });
  for (const el of semua) {
    nilai(el);
    ro.observe(el);
    const tabel = el.querySelector("table");
    if (tabel) ro.observe(tabel);
    el.addEventListener("blur", () => nilai(el));
  }
}
