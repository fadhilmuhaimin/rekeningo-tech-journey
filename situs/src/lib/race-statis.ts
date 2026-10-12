/**
 * Versi statis widget race (I5e, keputusan 353): HTML render pertama race.js (situs/lama/widgets/race.js, BB.predict
 * dan BB.sumberChip di core.js) yang dibuat saat build: tab pertama, belum menebak, langkah 0, garis waktu dua client
 * masih kosong. Tampil sampai skrip dan rekaman datang, lalu race.js menggantinya dalam satu tugas; karena elemen,
 * kelas, dan teksnya sama, tingginya sama dan isi di bawah widget tidak bergeser (CLS saat dimuat). Kesamaan tinggi
 * diperiksa situs/tools/ukur-cls.mjs di gerbang. Fungsi murni tanpa DOM.
 */

export interface RekamanRace {
  id: string;
  title: string;
  start: number;
  withdraw: { A: number; B: number };
  postgres: string;
  isolation: string;
  recorded: string;
  steps: unknown[];
}

/** Pilihan tebakan, sama dengan OPTION_VALUES di race.js. */
export const OPSI_RACE = [-20000, 30000, 50000];

/** BB.rp di core.js: 1080000 -> "Rp1.080.000". */
export function rp(n: number): string {
  const v = Number(n);
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (v < 0 ? "-" : "") + "Rp" + s;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const el = (tag: string, a: Record<string, string | boolean | undefined>, isi = "") =>
  `<${tag}${Object.entries(a)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
    .join("")}>${isi}</${tag}>`;

const pelaku = (n: string) => el("span", { class: `bb-actor bb-actor--${n}` }, n);

function kartuClient(n: string) {
  return el("div", { class: "bb-client" },
    el("div", { class: "bb-client__head" }, pelaku(n) + el("strong", {}, `Client ${n}`) + el("span", { class: "bb-chip" }, "siap")) +
    el("dl", { class: "bb-vars" }, el("dd", { class: "bb-muted" }, "belum membaca apa pun")));
}

/** Render pertama race.js untuk `daftar` (urutan data-modes), statis dan tidak bisa dipakai. */
export function htmlRaceStatis(daftar: RekamanRace[]): string {
  const d = daftar[0];
  if (!d) throw new Error("race: data-modes kosong");
  const head = el("div", { class: "bb-widget__head" },
    el("strong", {}, "Dua perangkat, satu saldo") +
    el("span", { class: "bb-muted" }, "Langkah demi langkah · panah kiri/kanan") +
    el("span", { class: "bb-chip bb-sumber is-system", title: "labs/b3-race/run.py" }, "Rekaman lab"));
  const tabs = el("div", { class: "bb-tabs", role: "tablist", "aria-label": "Cara mengamankan penarikan" },
    daftar.map((m, k) => el("button", { type: "button", role: "tab", class: "bb-tab", "data-m": m.id, "aria-selected": k === 0 ? "true" : "false" }, esc(m.title))).join(""));
  const q = `Saldo awal ${rp(d.start)}. A menarik ${rp(d.withdraw.A)}, B menarik ${rp(d.withdraw.B)} pada waktu bersamaan. Berapa saldo akhir?`;
  const opsi = [...OPSI_RACE.map(rp), "Belum tahu"];
  const tebak = el("div", {}, el("div", { class: "bb-predict", role: "group", "aria-label": "Tebak dulu" },
    el("p", { class: "bb-predict__q" }, el("strong", {}, "Tebak dulu: ") + esc(q)) +
    el("div", { class: "bb-predict__opts" }, opsi.map((o) => el("button", { type: "button", class: "bb-btn bb-btn--opt" }, esc(o))).join(""))));
  const db = el("div", { class: "bb-db" },
    el("strong", {}, "Database") +
    el("div", { class: "bb-db__row" }, el("span", { class: "bb-muted" }, "saldo yang sudah commit") + el("span", { class: "bb-db__saldo" }, rp(d.start))) +
    el("div", { class: "bb-db__row" }, el("span", { class: "bb-muted" }, "row lock") + el("span", { class: "bb-chip" }, "tidak ada")));
  const stage = el("div", { class: "bb-stage" }, kartuClient("A") + db + kartuClient("B"));
  const garis = el("div", { class: "bb-race-garis" },
    el("div", { class: "bb-race-garis__kepala", "aria-hidden": "true" },
      el("span", { class: "bb-race-garis__a" }, pelaku("A") + " Client A") +
      el("span", { class: "bb-race-garis__b" }, "Client B " + pelaku("B"))) +
    el("ol", { class: "bb-race-garis__daftar", "aria-label": "Garis waktu dua client" }) +
    el("p", { class: "bb-race-garis__catatan bb-muted" }, "Garis putus-putus jingga: client di lajur itu sedang menunggu lock."));
  const now = el("p", { class: "bb-now", "aria-live": "polite" }, "Pilih tebakanmu dulu, lalu tekan Berikutnya.");
  const baris = el("div", { class: "bb-row" },
    el("button", { type: "button", class: "bb-btn", disabled: true }, "← Sebelumnya") +
    el("button", { type: "button", class: "bb-btn bb-btn--primary", disabled: true }, "Berikutnya →") +
    el("button", { type: "button", class: "bb-btn bb-btn--quiet" }, "Ulang") +
    el("span", { class: "bb-muted" }, `Langkah 0 dari ${d.steps.length}`));
  const ringkas = el("p", { class: "bb-summary", role: "status" });
  const kaki = el("p", { class: "bb-widget__foot bb-muted" },
    esc(`Rekaman PostgreSQL ${d.postgres.split(" ")[0]}, isolation ${d.isolation}, direkam ${d.recorded} oleh labs/b3-race/run.py. Bukan simulasi.`));
  return el("div", { class: "bb-race-pesan", "aria-hidden": "true", inert: true },
    el("div", { class: "bb-widget bb-race bb-race--statis" }, head + tabs + tebak + stage + garis + now + baris + ringkas + kaki));
}
