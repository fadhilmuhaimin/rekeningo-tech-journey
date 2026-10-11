/**
 * Versi statis widget alur (I5c-b, keputusan 263): HTML langkah awal yang dibuat saat build, dengan elemen, kelas, dan
 * teks yang sama dengan render pertama alur.js (situs/lama/widgets/alur.js, hp.js, BB.predict dan BB.sumberChip di
 * core.js). Tampil sampai skrip dan skenario datang, lalu alur.js menggantinya dalam satu langkah; karena tingginya sama,
 * isi di bawah widget tidak bergeser (CLS saat dimuat). Tata letak sempit dan rel vertikal yang dipilih alur.js dari
 * lebar widget ditiru container query di tema.css. Kesamaan tinggi diperiksa situs/tools/ukur-cls.mjs di gerbang.
 * Fungsi murni tanpa DOM; skenario sudah dinormalisasi alur-core.js.
 */

export interface Isi { jenis: string; kiri?: string; kanan?: string; nada?: string; label?: string; nilai?: string; teks?: string; nonaktif?: boolean }
export interface Layar { judul?: string; waktu?: string; sinyal?: number; saldo?: number; saldoLabel?: string; nada?: string; isi?: Isi[] }
export interface SkenarioAlur {
  judul: string;
  sumber?: { jenis?: string; catatan?: string; file?: string };
  komponen: { id: string; label: string; lapisan?: string[] }[];
  perangkat: { id: string; label: string }[];
  predict?: { q: string; options: string[] };
  varian?: { label: string };
  pengantar?: string;
}
export interface IntiAlur {
  steps(d: SkenarioAlur, varianOn: boolean): unknown[];
  layarAt(d: SkenarioAlur, list: unknown[], i: number, perangkatId: string): Layar | null;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const atr = (a: Record<string, string | number | boolean | undefined>) =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
    .join("");
const el = (tag: string, a: Record<string, string | number | boolean | undefined>, isi = "") => `<${tag}${atr(a)}>${isi}</${tag}>`;

/** BB.rp: 1080000 -> "Rp1.080.000". */
export const rp = (n: number) => (n < 0 ? "-" : "") + "Rp" + String(Math.abs(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function isiHp(it: Isi): string {
  switch (it.jenis) {
    case "baris":
      return el("div", { class: "bb-hp__row" + (it.nada ? " is-" + it.nada : "") }, el("span", {}, esc(it.kiri)) + el("strong", {}, esc(it.kanan)));
    case "input":
      return el("div", { class: "bb-hp__input" }, el("small", {}, esc(it.label)) + el("span", {}, esc(it.nilai)));
    case "tombol":
      return el("div", { class: "bb-hp__btn" + (it.nonaktif ? " is-off" : "") }, esc(it.teks));
    case "toast":
      return el("div", { class: "bb-hp__toast is-" + (it.nada || "good") }, esc(it.teks));
    case "proses":
      return el("div", { class: "bb-hp__proc" }, "<i></i>" + esc(it.teks));
    default:
      return el("p", { class: "bb-hp__text" }, esc(it.teks));
  }
}

/** BB.phone (hp.js) tanpa label aksesibel: versi statis tersembunyi dari pembaca layar. */
export function hpStatis(l: Layar): string {
  const n = l.sinyal == null ? 4 : l.sinyal;
  const sinyal = [1, 2, 3, 4].map((i) => `<i class="${i <= n ? "is-on" : ""}"></i>`).join("");
  let layar =
    el("div", { class: "bb-hp__status" }, el("span", {}, esc(l.waktu || "12.05")) + el("span", { class: "bb-hp__sig" }, sinyal)) +
    el("div", { class: "bb-hp__app" }, esc(l.judul || "Rekeningo"));
  if (l.saldo != null)
    layar += el("div", { class: "bb-hp__saldo" + (l.nada ? " is-" + l.nada : "") },
      el("small", {}, esc(l.saldoLabel || "Saldo kamu")) + el("strong", {}, rp(l.saldo)));
  layar += (l.isi || []).map(isiHp).join("");
  return el("div", { class: "bb-hp" }, el("div", { class: "bb-hp__screen" }, layar));
}

/** Render pertama alur.js (langkah 0, belum menebak), statis dan tidak bisa dipakai. */
export function htmlAlurStatis(d: SkenarioAlur, core: IntiAlur): string {
  const list = core.steps(d, false);
  const n = d.komponen.length;
  // Di atas 5 komponen rel vertikal bisa muncul pada lebar >= 600 px; tema.css hanya meniru sempit dari lebar widget.
  if (n > 5) throw new Error(`alur "${d.judul}": ${n} komponen; versi statis meniru tata letak sampai 5 komponen`);
  const j = d.sumber?.jenis;
  const chip = j === "rekaman" || j === "ilustrasi"
    ? el("span", { class: "bb-chip bb-sumber" + (j === "rekaman" ? " is-system" : "") }, j === "rekaman" ? "Rekaman lab" : "Ilustrasi")
    : "";
  const head = el("div", { class: "bb-widget__head" },
    el("strong", {}, esc(d.judul)) + el("span", { class: "bb-muted" }, "Langkah demi langkah · panah kiri/kanan") + chip);
  const tebak = d.predict
    ? el("div", { class: "bb-predict" },
      el("p", { class: "bb-predict__q" }, el("strong", {}, "Tebak dulu: ") + esc(d.predict.q)) +
        el("div", { class: "bb-predict__opts" },
          d.predict.options.map((o) => el("button", { type: "button", class: "bb-btn bb-btn--opt", disabled: true }, esc(o))).join("")))
    : "";
  const varian = d.varian
    ? el("label", { class: "bb-alur__varian" }, `<input type="checkbox" disabled>` + esc(" Ubah satu hal: " + d.varian.label))
    : "";
  const lanes = el("div", { class: "bb-alur__lanes", style: `grid-template-columns: repeat(${n}, 1fr)` },
    d.komponen.map((k) => el("div", { class: "bb-alur__lane" },
      el("strong", {}, esc(k.label)) +
        (k.lapisan?.length ? el("ol", { class: "bb-alur__layers" }, k.lapisan.map((l) => el("li", { "data-l": l }, esc(l))).join("")) : ""),
    )).join(""));
  const track = el("div", { class: "bb-alur__track" }, el("div", { class: "bb-alur__packet", hidden: true }));
  const tampil = d.perangkat.map((p) => ({ p, layar: core.layarAt(d, list, -1, p.id) })).filter((x) => x.layar);
  const hp = tampil.length === 1 && d.perangkat.length === 1
    ? hpStatis(tampil[0]!.layar!)
    : tampil.map((x) => el("figure", { class: "bb-alur__device" }, hpStatis(x.layar!) + el("figcaption", {}, esc(x.p.label)))).join("");
  const detail = el("div", { class: "bb-alur__detail" },
    el("p", { class: "bb-alur__title" }, d.predict ? "Tebak dulu, lalu tekan Berikutnya." : "Tekan Berikutnya untuk mulai.") +
      el("pre", { class: "bb-alur__payload", hidden: true }) +
      el("p", { class: "bb-alur__explain" }, esc(d.pengantar || "")));
  const tombol = el("div", { class: "bb-row" },
    el("button", { type: "button", class: "bb-btn", disabled: true }, "← Sebelumnya") +
      el("button", { type: "button", class: "bb-btn bb-btn--primary", disabled: !!d.predict }, "Berikutnya →") +
      el("span", { class: "bb-muted bb-alur__count" }, `Langkah 0 dari ${list.length}`));
  const root = el("div", { class: "bb-widget bb-alur bb-alur--statis" },
    head + tebak + varian + el("div", { class: "bb-alur__rel-statis" }, lanes + track) +
      el("div", { class: "bb-alur__body" }, el("div", { class: "bb-alur__phone" }, hp) + detail) + tombol);
  // Dua pembungkus untuk container query: luar = lebar widget (sempit < 600 px), dalam = lebar per komponen (rel vertikal).
  return el("div", { class: "bb-alur-pesan", "aria-hidden": "true", inert: true, style: `--n: ${n}` },
    el("div", { class: "bb-alur-pesan__per" }, root));
}
