// Memeriksa widget circuit breaker (W4-breaker, keputusan 1262) di halaman uji /uji/breaker/:
// - tebak dulu: sebelum menebak tidak ada panel "Ubah satu hal" dan hasil (role=status) kosong; Tab melewati empat pilihan
//   dengan fokus terlihat (outline >= 2 px); tebakan salah lewat Enter memberi "Coba pilihan lain" dan fokus ke tombol itu;
//   tebakan benar memindahkan fokus ke tombol pertama "Ubah satu hal"; aria-pressed satu per kelompok; tepat dua daerah
//   role=status, masing-masing satu kalimat; Enter dan Spasi memilih tombol; "Kembali" mengembalikan semuanya;
// - angka dari rekaman: sepuluh kasus (titik acuan queue dan sinkron, dan kombinasi tanpa rekaman) dibandingkan dengan
//   labs/t4-integrasi/output dibaca di sini dengan pola sendiri (bukan rekaman.ts), supaya alat ini tidak lolos karena salah
//   yang sama: kalimat penuh, daftar angka, tabel pekerjaan, dan acuan;
// - papan detik demi detik (geometri, supaya mutasi tampilan tidak lolos Vitest dan build): 3 baris × 60 kotak dan pita,
//   jumlah pita closed, open, half-open dan kotak menurut hasil sama dengan hitungan sendiri, tinggi pita open > half-open >
//   closed dan kotak gagal > ok, kotak dan pita sejajar, semuanya di dalam widget di 320 px, papan aria-hidden;
// - gerak: 0 animasi saat dimuat dan sesudah semua interaksi, juga dengan reduced motion; fungsi sama di kedua mode;
// - kontras teks >= 4,5:1 gelap dan terang; axe-core (WCAG A/AA sampai 2.2) sesudah menebak;
// - luapan: 320 dan 375 px (font Inter dan Verdana yang lebih lebar) tanpa gulir ke samping, target >= 24 px; tanpa JavaScript
//   tabel acuan tidak meluap di 320 px;
// - CLS: tinggi widget dan letak paragraf sesudahnya sama tanpa JS dan sesudah hydrate (<= 1 px);
// - ukuran JS /uji/breaker/ dicetak (baris "info"); tanpa Zod, React Flow, dan pembaca rekaman di island.
//   node tools/ukur-breaker.mjs --url http://127.0.0.1:4321
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";
import { AXE_PATH, TAG_WCAG } from "./lib/axe.mjs";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const BASE = arg("--url", "http://127.0.0.1:4321");
const HAL = "/uji/breaker/";
const DIR = "labs/t4-integrasi/output";
const baca = (f) => readFileSync(new URL(`../../${DIR}/${f}`, import.meta.url), "utf8");
const BR = baca("breaker.txt"), LJ = baca("lajur.txt"), WK = baca("worker.txt");
const L = JSON.parse(readFileSync(new URL("../data/widget/t4-circuit-breaker.json", import.meta.url), "utf8"));

// Angka rekaman dibaca dengan pola sendiri.
const ambil = (teks, pola, nama) => { const m = teks.match(pola); if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`); return m; };
const semua = (teks, pola) => [...teks.matchAll(pola)].map((m) => m[1]);
const bagian = (teks, huruf) => { const i = teks.indexOf(`# --- ${huruf}. `); const j = teks.indexOf("# --- ", i + 10); return teks.slice(i, j < 0 ? undefined : j); };
const G = Number(ambil(BR, /gagal berturut-turut ke-(\d+): status open/, "gagal ke-")[1]);
const BUKA = Number(ambil(BR, /sesudah (\d+),\d{3} detik: status half-open/, "Timeout")[1]);
const K = Number(ambil(WK, /x (\d+) percobaan x \d+ detik =/, "percobaan")[1]);
const TIMEOUT = Number(ambil(WK, /batas waktu client (\d+) detik\)\./, "batas waktu client")[1]);
const N = Number(ambil(LJ, /# (\d+) pendaftar mengajukan verifikasi/, "pendaftar")[1]);
const lA = bagian(LJ, "A"), lB = bagian(LJ, "B"), lC = bagian(LJ, "C"), lD = bagian(LJ, "D"), lE = bagian(LJ, "E");
const permA = Number(ambil(lA, /vendor mati: (\d+) permintaan masuk/, "permintaan A")[1]);
const permB = Number(ambil(lB, /sesudah vendor pulih: (\d+) permintaan masuk/, "permintaan B")[1]);
const lulusB = Number(semua(lB, /^ lulus\s+\| (\d+)$/gm).at(-1)), gagalB = Number(semua(lB, /^ gagal\s+\| (\d+)$/gm).at(-1));
const permE = Number(semua(lE, /vendor sehat: (\d+) permintaan masuk/g).at(-1));
const lulusE = Number(semua(lE, /^ lulus\s+\| (\d+)$/gm).at(-1)), gagalE = Number(semua(lE, /^ gagal\s+\| (\d+)$/gm).at(-1));
const matiD = Number(ambil(lD, /^ mati\s+\| 5\s+\| (\d+)$/m, "mati D")[1]);
const menungguD = semua(lD, /^ menunggu\s+\| \d+\s+\| (\d+)$/gm).map(Number).reduce((a, b) => a + b, 0);
const rusakD = Number(ambil(lD, /^UPDATE (\d+)$/m, "rusak D")[1]);
const lagiC = Number(ambil(lC, /^ (\d+)\s+\| t\s+\| t$/m, "mati C")[1]);
const slotC = Number(ambil(WK, /kapasitas worker -serentak (\d+)\)/, "serentak")[1]);
const PULIH = 30; // Simulasi: vendor pulih sebelum permintaan percobaan pertama (SIMULASI.pulihDetik)
const HORIZON = 180, BARIS = 60;
const PROBE_SINKRON = Math.floor((HORIZON - 1 - (G - 1)) / (BUKA + 1)); // permintaan percobaan bila vendor tidak pulih: tiap Timeout + 1 detik

const NOL = { jalur: "Queue: worker mengulang", error: "100%", latensi: "0 detik", jenis: "5xx: vendor gagal", breaker: "Dipasang", pulih: `Pulih pada detik ${PULIH}`, serentak: "1" };
const GRUP = { jalur: "Jalur", error: "Error rate vendor", latensi: "Latensi vendor", jenis: "Jawaban error vendor", breaker: "Breaker", pulih: "Vendor pulih", serentak: "Slot worker" };
const SINKRON = "Sinkron: user menunggu", TIDAK_PULIH = "Tidak pulih", EMPAT_GAGAL = "4xx dihitung gagal (bawaan pustaka)", EMPAT_SUKSES = "4xx dihitung sukses (kustom)";
const jam = (s) => `${s} detik`;

// Kasus: setelan tombol, kalimat penuh, acuan, daftar angka, dan hitungan papan dari model sendiri.
const KASUS = [
  { kunci: "queue-satu", set: {}, vonis: `Breaker membuka pada detik 0; sesudah ${HORIZON} detik ${lulusB} pekerjaan terkirim, ${gagalB} mati, dan 0 menunggu.`, acuan: "lajur.txt bagian B",
    angka: { Terkirim: lulusB, Menunggu: 0, Mati: gagalB, "Permintaan ke vendor": `${permB} (tanpa breaker ${permA})`, "Permintaan percobaan di half-open": 1 },
    pita: { closed: HORIZON - BUKA - 1, open: BUKA, "half-open": 1 }, baris: N, mati: gagalB, hitung: true, catatan: ["Ambang breaker", "Permintaan percobaan di half-open"] },
  { kunci: "queue-tanpa", set: { breaker: "Tanpa breaker" }, vonis: `Tanpa breaker, ${N} dari ${N} pekerjaan mati sesudah ${K} percobaan, dan ${permA} permintaan sampai ke vendor.`, acuan: "lajur.txt bagian A",
    angka: { Terkirim: 0, Mati: N, "Permintaan ke vendor": `${permA}` }, tanpaProbe: true,
    pita: { closed: HORIZON, open: 0, "half-open": 0 }, baris: N, mati: N, hitung: true, catatan: [] },
  { kunci: "queue-empat", set: { serentak: String(slotC) }, vonis: `Breaker membuka pada detik 0; sesudah ${HORIZON} detik ${N} pekerjaan terkirim, ${lagiC} mati, dan 0 menunggu.`, acuan: "lajur.txt bagian C",
    angka: { Terkirim: N, Mati: lagiC }, pita: { closed: HORIZON - BUKA - 1, open: BUKA, "half-open": 1 }, baris: N, mati: lagiC, hitung: true, catatan: ["Permintaan percobaan di half-open"] },
  { kunci: "queue-4xx-gagal", set: { jenis: EMPAT_GAGAL, error: "60%" }, vonis: `Breaker membuka pada detik 0; sesudah ${HORIZON} detik 0 pekerjaan terkirim, ${matiD} mati, dan ${menungguD} menunggu.`, acuan: "lajur.txt bagian D",
    angka: { Terkirim: 0, Mati: matiD, Menunggu: menungguD }, baris: N, mati: matiD, rusak: rusakD, hitung: true, catatan: ["Ambang breaker", "diulang", "Permintaan percobaan di half-open"] },
  { kunci: "queue-4xx-sukses", set: { jenis: EMPAT_SUKSES, error: "60%" }, vonis: `Breaker tidak pernah membuka: ${lulusE} pekerjaan terkirim, ${gagalE} mati, dan 0 menunggu.`, acuan: "lajur.txt bagian E",
    angka: { Terkirim: lulusE, Mati: gagalE, "Permintaan ke vendor": `${permE} (tanpa breaker ${permE})` }, pita: { closed: HORIZON, open: 0, "half-open": 0 }, baris: N, mati: gagalE, hitung: true, catatan: ["429 dan 408", "diulang"] },
  { kunci: "sinkron-bawaan", set: { jalur: SINKRON, pulih: TIDAK_PULIH }, vonis: `Breaker membuka pada detik ${G - 1} dan menolak ${HORIZON - G - PROBE_SINKRON} dari ${HORIZON} permintaan tanpa menunggu vendor.`, acuan: "breaker.txt bagian A",
    angka: { Permintaan: HORIZON, "Sampai ke vendor": `${G + PROBE_SINKRON} (tanpa breaker ${HORIZON})`, "Ditolak cepat": HORIZON - G - PROBE_SINKRON },
    pita: { closed: G, open: HORIZON - G - PROBE_SINKRON, "half-open": PROBE_SINKRON }, sel: { tolak: HORIZON - G - PROBE_SINKRON, "5xx": G + PROBE_SINKRON, ok: 0 },
    hitung: false, catatan: ["tidak dipasang di lab"], tanpaAngka: ["Ditolak saat vendor sudah pulih"] },
  { kunci: "sinkron-4xx-sukses", set: { jalur: SINKRON, jenis: EMPAT_SUKSES }, vonis: `Breaker tidak pernah membuka, jadi semua ${HORIZON} permintaan sampai ke vendor.`, acuan: "breaker.txt bagian C",
    angka: { "Ditolak cepat": 0 }, pita: { closed: HORIZON, open: 0, "half-open": 0 }, sel: { tolak: 0, "4xx": HORIZON },
    hitung: false, catatan: ["tidak dipasang di lab", "429 dan 408"], tanpaAngka: ["Ditolak saat vendor sudah pulih"] },
  { kunci: "sinkron-4xx-gagal", set: { jalur: SINKRON, jenis: EMPAT_GAGAL, pulih: TIDAK_PULIH }, vonis: `Breaker membuka pada detik ${G - 1} dan menolak`, acuan: "breaker.txt bagian C",
    sel: { "4xx": G + PROBE_SINKRON, tolak: HORIZON - G - PROBE_SINKRON }, hitung: false, catatan: ["tidak dipasang di lab"], tanpaAngka: ["Ditolak saat vendor sudah pulih"] },
  { kunci: "sinkron-latensi", set: { jalur: SINKRON, error: "0%", latensi: "4 detik, melewati timeout" }, acuan: null,
    vonis: `Breaker membuka pada detik ${G - 1 + TIMEOUT} dan menolak ${BUKA + 1} dari ${HORIZON} permintaan tanpa menunggu vendor.`,
    angka: { "Pemanggil menunggu": `${(G + TIMEOUT - 1) * TIMEOUT} detik (tanpa breaker ${PULIH * TIMEOUT} detik)`, "Ditolak saat vendor sudah pulih": BUKA + 1 - PULIH + (G - 1 + TIMEOUT) },
    sel: { tolak: BUKA + 1, timeout: G + TIMEOUT - 1 }, hitung: false, catatan: ["tidak dipasang di lab", "Breaker baru mencoba lagi"] },
  { kunci: "sinkron-30", set: { jalur: SINKRON, error: "30%", pulih: TIDAK_PULIH }, vonis: `Breaker tidak pernah membuka, jadi semua ${HORIZON} permintaan sampai ke vendor.`, acuan: null, sel: { tolak: 0 }, hitung: false, catatan: ["tidak dipasang di lab"], tanpaAngka: ["Ditolak saat vendor sudah pulih"] },
];

const browser = awasi(await chromium.launch(), { alat: "breaker" });
let gagal = 0;
const lapor = (ok, pesan) => {
  console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`);
  if (!ok) gagal++;
};
const W = "[data-circuit-breaker]";

async function buka(ukuran, opsi = {}) {
  const [w, h] = ukuran;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, ...opsi });
  const page = await ctx.newPage();
  const error = [];
  page.on("pageerror", (e) => error.push(String(e)));
  page.on("console", (m) => m.type() === "error" && error.push(m.text()));
  await page.goto(BASE + HAL, { waitUntil: "networkidle" });
  return { ctx, page, error };
}
const siap = async (page) => {
  await page.locator(W).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
};
const fokusTeks = (page) => page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
const grup = (w, kunci) => w.locator(".cb-kelompok", { has: w.page().locator(".cb-label", { hasText: new RegExp(`^${GRUP[kunci]}$`) }) });
const tombol = (w, kunci, label) => grup(w, kunci).locator(".cb-tombol", { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) });
async function setel(w, set) {
  for (const k of ["jalur", "jenis", "error", "latensi", "breaker", "pulih", "serentak"]) {
    const label = set[k] ?? NOL[k];
    if ((await grup(w, k).count()) > 0) await tombol(w, k, label).click();
  }
}
const angkaDl = (w) => w.locator(".cb-angka > div").evaluateAll((d) => Object.fromEntries(d.map((x) => [x.querySelector("dt").textContent.trim(), x.querySelector("dd").textContent.trim()])));
const tebakBenar = async (w) => { await w.locator(".tb-pilih").nth(2).click(); await w.locator(".cb-ubah").waitFor(); };

// 1. Tebak dulu, keyboard, gerak: 2 ukuran × 2 reduced motion.
for (const ukuran of [[375, 667], [1366, 657]]) for (const reducedMotion of ["no-preference", "reduce"]) {
  const nama = `${ukuran.join("x")} ${reducedMotion}`;
  const { ctx, page, error } = await buka(ukuran, { reducedMotion });
  const animasiAwal = await page.evaluate(() => document.getAnimations().length);
  await siap(page);
  const w = page.locator(W);
  const status = () => w.locator('[role="status"]').first().innerText();

  const s2 = { total: await w.locator('[role="status"]').count(), vonis: await w.locator('.cb-vonis[role="status"]').count() };
  lapor(s2.total === 2 && s2.vonis === 1, `breaker ${nama}: ${s2.total} daerah role=status (hasil tebakan dan kalimat penuh), kalimat penuh ${s2.vonis === 1 ? "membawa" : "tanpa"} role=status`);
  const sebelum = { ubah: await w.locator(".cb-ubah").count(), status: (await status()).trim(), tebak: await w.locator(".tb-pilihan button:not(:disabled)").count(), vonis: (await w.locator(".cb-vonis").innerText()).trim(), hasil: await w.locator(".cb-hasil").count() };
  lapor(sebelum.ubah === 0 && sebelum.status === "" && sebelum.tebak === 4 && sebelum.vonis === "" && sebelum.hasil === 0,
    `breaker ${nama}: sebelum menebak panel Ubah ${sebelum.ubah}, hasil "${sebelum.status}", ${sebelum.tebak} pilihan aktif, kalimat penuh "${sebelum.vonis}", panel hasil ${sebelum.hasil}`);

  await w.locator(".tb-pilihan button").first().focus();
  const urut = [await fokusTeks(page)];
  const outline = [];
  for (let k = 1; k < 4; k++) {
    await page.keyboard.press("Tab");
    urut.push(await fokusTeks(page));
    outline.push(await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2; }));
  }
  const harap = await w.locator(".tb-pilihan button").evaluateAll((b) => b.map((x) => x.textContent.trim().replace(/^[A-D]\s*/, "")));
  lapor(urut.map((u) => u.replace(/^[A-D]\s*/, "")).join("|") === harap.join("|") && outline.every(Boolean), `breaker ${nama}: Tab ${urut.length} pilihan dalam urutan DOM, fokus terlihat ${outline.filter(Boolean).length}/${outline.length}`);

  // Tebakan salah (A: tidak ada) lewat Enter: Coba pilihan lain mendapat fokus; Enter mengembalikan fokus ke pilihan pertama.
  await w.locator(".tb-pilihan button").first().focus();
  await page.keyboard.press("Enter");
  const salah = { pressed: await w.locator(".tb-pilihan button").first().getAttribute("aria-pressed"), aktif: await w.locator(".tb-pilihan button:not(:disabled)").count(), fokus: await fokusTeks(page), status: await status() };
  lapor(salah.pressed === "true" && salah.aktif === 0 && salah.fokus === L.ulang && salah.status.includes(L.belum),
    `breaker ${nama}: tebakan salah: aria-pressed ${salah.pressed}, ${salah.aktif} pilihan aktif, fokus di "${salah.fokus}", hasil "${salah.status.split("\n")[0]}"`);
  await page.keyboard.press("Enter");
  const ulang = { fokus: await fokusTeks(page), ubah: await w.locator(".cb-ubah").count(), aktif: await w.locator(".tb-pilihan button:not(:disabled)").count(), vonis: (await w.locator(".cb-vonis").innerText()).trim() };
  const norm = (t) => t.replace(/^A\s*/, "").replace(/\s+/g, " ").trim();
  lapor(norm(ulang.fokus) === norm(await w.locator(".tb-pilihan button").first().innerText()) && ulang.ubah === 0 && ulang.aktif === 4 && ulang.vonis === "",
    `breaker ${nama}: Coba pilihan lain: fokus di "${ulang.fokus.slice(0, 30)}", panel Ubah ${ulang.ubah}, ${ulang.aktif} pilihan aktif`);

  // Tebakan benar (pilihan ketiga) lewat Enter: fokus ke tombol pertama Ubah satu hal.
  const benar = w.locator(".tb-pilih").nth(2);
  await benar.focus();
  await page.keyboard.press("Enter");
  const tepat = { pressed: await benar.getAttribute("aria-pressed"), fokus: await fokusTeks(page), ubah: await w.locator(".cb-ubah").count(), status: await status(), vonis: (await w.locator(".cb-vonis").innerText()).trim() };
  lapor(tepat.pressed === "true" && tepat.fokus === L.pilihNilai.jalur[0].label && tepat.ubah === 1 && tepat.status.includes(L.benar) && tepat.vonis === L.vonis["queue-membuka"].replace("{x}", "0").replace("{horizon}", String(HORIZON)).replace("{terkirim}", String(lulusB)).replace("{mati}", String(gagalB)).replace("{menunggu}", "0"),
    `breaker ${nama}: tebakan benar: aria-pressed ${tepat.pressed}, fokus di "${tepat.fokus}" (tombol pertama Ubah), hasil "${tepat.status.split("\n")[0]}", kalimat penuh "${tepat.vonis.slice(0, 60)}"`);
  const satuKalimat = !/\.\s/.test(tepat.vonis) && /\.$/.test(tepat.vonis);
  lapor(satuKalimat, `breaker ${nama}: kalimat penuh role=status satu kalimat`);

  // Enter dan Spasi memilih tombol; aria-pressed satu per kelompok; fokus tetap di tombol.
  const t60 = tombol(w, "error", "60%");
  await t60.focus();
  await page.keyboard.press("Enter");
  const p1 = { t60: await t60.getAttribute("aria-pressed"), seratus: await tombol(w, "error", "100%").getAttribute("aria-pressed"), fokus: await fokusTeks(page), jumlah: await grup(w, "error").locator('[aria-pressed="true"]').count() };
  await tombol(w, "error", "30%").focus();
  await page.keyboard.press(" ");
  const p2 = { t30: await tombol(w, "error", "30%").getAttribute("aria-pressed"), t60: await t60.getAttribute("aria-pressed") };
  lapor(p1.t60 === "true" && p1.seratus === "false" && p1.fokus === "60%" && p1.jumlah === 1 && p2.t30 === "true" && p2.t60 === "false",
    `breaker ${nama}: Enter dan Spasi memilih error rate; aria-pressed satu per kelompok (${p1.jumlah}), fokus tetap di "${p1.fokus}"`);

  // Ganti jalur ke sinkron: kelompok slot worker hilang tanpa fokus jatuh ke body; ganti ke 4xx: kelompok pulih hilang.
  await tombol(w, "jalur", SINKRON).focus();
  await page.keyboard.press("Enter");
  const g1 = { slot: await grup(w, "serentak").count(), fokus: await fokusTeks(page) };
  await tombol(w, "jenis", EMPAT_GAGAL).focus();
  await page.keyboard.press("Enter");
  const g2 = { pulih: await grup(w, "pulih").count(), fokus: await fokusTeks(page), tabel: await w.locator(".cb-tabel").count() };
  lapor(g1.slot === 0 && g1.fokus === SINKRON && g2.pulih === 0 && g2.fokus === EMPAT_GAGAL && g2.tabel === 0,
    `breaker ${nama}: sinkron menyembunyikan slot worker (${g1.slot}) dan tabel pekerjaan (${g2.tabel}), 4xx menyembunyikan pulih (${g2.pulih}); fokus tetap di "${g2.fokus.slice(0, 20)}"`);

  // Kembali ke pengaturan awal: semua kembali, fokus ke tombol pertama.
  await w.getByRole("button", { name: L.awal }).click();
  const kembali = { fokus: await fokusTeks(page), pressed: await w.locator(".cb-tombol[aria-pressed='true']").evaluateAll((b) => b.map((x) => x.textContent.trim())), banding: (await w.locator(".cb-banding").innerText()).trim() };
  lapor(kembali.fokus === L.pilihNilai.jalur[0].label && kembali.pressed.join("|") === ["Queue: worker mengulang", "100%", "0 detik", "5xx: vendor gagal", "Dipasang", `Pulih pada detik ${PULIH}`, "1"].join("|") && kembali.banding === L.banding.sama,
    `breaker ${nama}: Kembali ke pengaturan awal: fokus "${kembali.fokus}", ${kembali.pressed.join(", ")}`);

  await page.waitForFunction(() => document.getAnimations().length === 0);
  const anim = await page.evaluate(() => document.getAnimations().length);
  lapor(animasiAwal === 0 && anim === 0 && error.length === 0, `breaker ${nama}: ${animasiAwal} animasi saat dimuat, ${anim} sesudah semua interaksi, ${error.length} error konsol${error.length ? ": " + error.join(" | ") : ""}`);
  await ctx.close();
}

// 2. Angka dari rekaman dan geometri papan (1366, reduced motion supaya cepat).
{
  const { ctx, page } = await buka([1366, 657], { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  for (const k of KASUS) {
    await w.getByRole("button", { name: L.awal }).click();
    await setel(w, k.set);
    const vonis = (await w.locator(".cb-vonis").innerText()).trim();
    const acuan = (await w.locator(".cb-acuan").innerText()).replace(/\s+/g, " ").trim();
    const dl = await angkaDl(w);
    const geo = await w.evaluate((e) => {
      const hitung = (s) => e.querySelectorAll(s).length;
      const baris = [...e.querySelectorAll(".cb-menit")].map((m) => {
        const p = [...m.querySelectorAll(".cb-pita .cb-p")].map((x) => x.getBoundingClientRect());
        const kt = [...m.querySelectorAll(".cb-kotak .cb-k")].map((x) => x.getBoundingClientRect());
        // Satu deret mendatar: dasar semua kotak di satu garis (tinggi boleh beda), makin ke kanan, dan baris tidak menjulang.
        const mendatar = [p, kt].every((d) => d.every((r, i) => Math.abs(r.bottom - d[0].bottom) <= 1 && (i === 0 || r.left >= d[i - 1].right - 0.5)));
        return { p: p.length, k: kt.length, sejajar: p.every((r, i) => Math.abs(r.left - kt[i].left) <= 1 && Math.abs(r.width - kt[i].width) <= 1) && mendatar, lebar: Math.min(...p.map((r) => r.width)), kiri: p[0].left, kanan: p.at(-1).right, tinggi: m.getBoundingClientRect().height };
      });
      const tinggi = (s) => { const x = e.querySelector(s); return x ? x.getBoundingClientRect().height : null; };
      const w = e.getBoundingClientRect();
      return {
        baris,
        pita: { closed: hitung(".cb-pita .is-closed"), open: hitung(".cb-pita .is-open"), "half-open": hitung(".cb-pita .is-half-open") },
        sel: Object.fromEntries(["ok", "5xx", "timeout", "4xx", "tolak", "gagal", "diam"].map((k) => [k, hitung(`.cb-kotak .is-${k}`)])),
        tinggiPita: { closed: tinggi(".cb-pita .is-closed"), open: tinggi(".cb-pita .is-open"), half: tinggi(".cb-pita .is-half-open") },
        tinggiSel: { ok: tinggi(".cb-kotak .is-ok"), gagal: tinggi(".cb-kotak .is-5xx") ?? tinggi(".cb-kotak .is-gagal") },
        di_dalam: baris.every((b) => b.kiri >= w.left - 0.5 && b.kanan <= w.right + 0.5),
        tersembunyi: e.querySelector(".cb-baris").getAttribute("aria-hidden"),
        tabel: [...e.querySelectorAll(".cb-tabel tbody tr")].map((r) => [...r.children].map((c) => c.textContent.trim())),
        kotakRiwayat: e.querySelectorAll(".cb-tabel .cb-riwayat .cb-k").length,
        hitungAda: e.querySelectorAll(".cb-hitung").length,
        catatan: [...e.querySelectorAll(".cb-catatan")].map((c) => c.textContent.trim()),
        headerBaris: e.querySelectorAll(".cb-tabel tbody th[scope='row']").length,
        caption: e.querySelector(".cb-tabel caption")?.textContent.trim() ?? null,
        asal: e.querySelector(".cb-asal summary")?.textContent.trim() ?? null,
        cat: (() => {
          // Tiap jenis kotak dan pita yang tampil harus punya cat (warna latar atau gradien); kalau tidak, hasilnya tak terlihat.
          const ada = (n) => n !== "rgba(0, 0, 0, 0)" && n !== "transparent";
          const kosong = [...e.querySelectorAll(".cb-pita .cb-p, .cb-kotak .cb-k")].filter((x) => { const c = getComputedStyle(x); return !ada(c.backgroundColor) && c.backgroundImage === "none"; }).map((x) => x.className);
          const vonis = e.querySelector(".cb-vonis:not(:empty)");
          return { kosong: [...new Set(kosong)], tepiVonis: vonis ? ada(getComputedStyle(vonis).borderLeftColor) : true };
        })(),
        tolakCat: (() => { const t = e.querySelector(".cb-kotak .is-tolak"); return t ? getComputedStyle(t).backgroundImage : null; })(),
        nama: [...e.querySelectorAll(".cb-kelompok")].map((g) => ({ nama: document.getElementById(g.getAttribute("aria-labelledby"))?.textContent.trim() ?? null, role: g.getAttribute("role") })),
      };
    });
    const sinkron = k.set.jalur === SINKRON;
    let ok = vonis === k.vonis || (k.vonis.endsWith("menolak") && vonis.startsWith(k.vonis));
    ok &&= k.acuan === null ? acuan.startsWith(L.tanpaAcuan.slice(0, 30)) && !acuan.includes(L.cocok) : acuan.startsWith(L.cocok) && acuan.includes(k.acuan);
    for (const [kunci, nilai] of Object.entries(k.angka ?? {})) ok &&= dl[kunci] === String(nilai);
    if (k.tanpaProbe) ok &&= !("Permintaan percobaan di half-open" in dl);
    for (const t of k.tanpaAngka ?? []) ok &&= !(t in dl);
    // Hitungan worker hanya di queue; catatan menurut kasus; judul tabel, header baris, ringkasan asal, nama kelompok, dan penanda ditolak.
    ok &&= geo.hitungAda === (k.hitung ? 1 : 0) && (k.catatan ?? []).every((c) => geo.catatan.some((t) => t.includes(c)));
    ok &&= geo.catatan.length === (k.catatan ?? []).length + (k.hitung ? 1 : 0) && geo.asal === L.asal.judul;
    ok &&= geo.nama.length === 5 + (!k.set.jenis || k.set.jenis === NOL.jenis ? 1 : 0) + (sinkron ? 0 : 1) && geo.nama.every((g) => g.role === "group" && g.nama);
    ok &&= !sinkron ? geo.headerBaris === k.baris && geo.caption === L.pekerjaan.judul : geo.headerBaris === 0 && geo.caption === null;
    const catOk = geo.cat.kosong.length === 0 && geo.cat.tepiVonis && geo.baris.every((b) => b.tinggi < 130);
    if (!catOk) console.log(`   cat ${k.kunci}: tanpa cat [${geo.cat.kosong}], tepi vonis ${geo.cat.tepiVonis}, tinggi baris ${geo.baris.map((b) => b.tinggi.toFixed(0))}`);
    ok &&= catOk;
    if (geo.sel.tolak > 0) ok &&= geo.tolakCat !== null && geo.tolakCat !== "none";
    // Papan: 3 baris × 60 pita dan kotak, sejajar, di dalam widget, aria-hidden, tinggi menurut arti.
    let papan = geo.baris.length === HORIZON / BARIS && geo.baris.every((b) => b.p === BARIS && b.k === BARIS && b.sejajar && b.lebar >= 2) && geo.di_dalam && geo.tersembunyi === "true";
    if (k.pita) for (const s of Object.keys(k.pita)) papan &&= geo.pita[s] === k.pita[s];
    papan &&= geo.pita.closed + geo.pita.open + geo.pita["half-open"] === HORIZON;
    if (k.sel) for (const s of Object.keys(k.sel)) papan &&= geo.sel[s] === k.sel[s];
    if (geo.pita.open > 0 && geo.pita["half-open"] > 0) papan &&= geo.tinggiPita.open > geo.tinggiPita.half && geo.tinggiPita.half > geo.tinggiPita.closed;
    if (geo.sel.ok > 0 && (geo.sel["5xx"] > 0 || geo.sel.gagal > 0)) papan &&= geo.tinggiSel.gagal > geo.tinggiSel.ok;
    // Tabel pekerjaan (queue): sepuluh baris, jumlah mati sama dengan kalimat penuh, kotak riwayat = jumlah percobaan.
    if (!sinkron) {
      papan &&= geo.tabel.length === k.baris && geo.tabel.filter((r) => r[2] === "mati").length === k.mati;
      papan &&= geo.kotakRiwayat === geo.tabel.reduce((j, r) => j + Number(r[1].split(" ")[0]), 0);
      papan &&= geo.tabel[0][0] === "1" && geo.tabel.every((r, i) => r[0] === String(i + 1));
      if (k.rusak) papan &&= geo.tabel.slice(0, k.rusak).every((r) => r[2] !== "terkirim");
    } else papan &&= geo.tabel.length === 0;
    if (!papan) console.log(`   papan ${k.kunci}: ${JSON.stringify({ pita: geo.pita, sel: geo.sel, baris: geo.baris.map((b) => [b.p, b.k, b.sejajar]), tinggiPita: geo.tinggiPita, tinggiSel: geo.tinggiSel })}`);
    ok &&= papan;
    lapor(ok, `breaker angka ${k.kunci}: "${vonis.slice(0, 90)}"; acuan ${acuan === "" ? "-" : acuan.slice(0, 50)}; pita ${JSON.stringify(geo.pita)}; ${JSON.stringify(dl).slice(0, 100)}`);
  }
  // Nama berkas dan istilah pustaka tidak diterjemahkan peramban; kotak dan pita tersembunyi dari pembaca layar.
  await w.getByRole("button", { name: L.awal }).click();
  const kode = await w.locator("code").evaluateAll((c) => ({ n: c.length, salah: c.filter((x) => x.getAttribute("translate") !== "no").length }));
  lapor(kode.n >= 1 && kode.salah === 0, `breaker kode: ${kode.n} elemen code, ${kode.salah} tanpa translate="no"`);
  const legenda = await w.locator(".cb-legenda li").evaluateAll((l) => l.map((x) => x.textContent.trim()));
  lapor(legenda.length === 6 && legenda.includes(L.papan.hasil.gagal) && legenda.includes(L.papan.status["half-open"]), `breaker legenda queue: ${legenda.join(" | ")}`);
  await ctx.close();
}

// 3. Kontras teks di kedua tema, dan axe pada keadaan sesudah menebak dengan semua catatan terbuka.
{
  const { ctx, page } = await buka([1366, 657], { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  await tombol(w, "jenis", EMPAT_SUKSES).click();
  await tombol(w, "error", "60%").click();
  const kontras = await page.evaluate(() => {
    const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const campur = (atas, bawah, a) => atas.slice(0, 3).map((v, k) => v * a + bawah[k] * (1 - a));
    const latar = (el) => { const lapis = []; for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c && c[3] > 0) { lapis.push(c); if (c[3] === 1) break; } } let h = [255, 255, 255]; for (const c of lapis.reverse()) h = campur(c, h, c[3]); return h; };
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const rasio = (el) => { let op = 1; for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity); const bg = latar(el), fg = rgba(getComputedStyle(el).color); const t = campur(fg, bg, fg[3] * op); const [a, b] = [lum(t), lum(bg)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); };
    const w = document.querySelector("[data-circuit-breaker]");
    const teks = [...w.querySelectorAll("*")].filter((e) => !e.closest(".bb-sr") && !e.closest("[aria-hidden='true']") && !e.closest(":disabled") && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const hasil = {};
    const awal = document.documentElement.dataset.theme;
    for (const t of ["dark", "light"]) { document.documentElement.dataset.theme = t; hasil[t] = Math.min(...teks.map(rasio)); }
    document.documentElement.dataset.theme = awal;
    return { ...hasil, n: teks.length };
  });
  lapor(kontras.dark >= 4.5 && kontras.light >= 4.5 && kontras.n > 40, `breaker kontras ${kontras.n} teks: gelap ${kontras.dark.toFixed(2)}:1, terang ${kontras.light.toFixed(2)}:1`);
  await page.addScriptTag({ path: AXE_PATH });
  for (const tema of ["dark", "light"]) {
    const v = await page.evaluate(async ([tema, tag]) => {
      document.documentElement.dataset.theme = tema;
      const r = await window.axe.run(document.querySelector("[data-circuit-breaker]"), { runOnly: { type: "tag", values: tag }, resultTypes: ["violations"] });
      return r.violations.map((x) => `${x.id} (${x.nodes.length})`);
    }, [tema, TAG_WCAG]);
    lapor(v.length === 0, `breaker axe sesudah menebak ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
  }
  await ctx.close();
}

// 4. Luapan dan target: 320 dan 375 px, font Inter dan Verdana (lebih lebar, seperti font fallback di CI), sesudah menebak
// dengan queue dan sinkron; papan di dalam widget; tanpa JS tabel acuan di 320 px.
for (const lebar of [320, 375]) for (const verdana of [false, true]) for (const jalur of ["queue", "sinkron"]) {
  const { ctx, page } = await buka([lebar, 640], { reducedMotion: "reduce" });
  if (verdana) await page.addStyleTag({ content: "html, body, button, input { font-family: Verdana, sans-serif !important; }" });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  if (jalur === "sinkron") { await tombol(w, "jalur", SINKRON).click(); await tombol(w, "latensi", "4 detik, melewati timeout").click(); await tombol(w, "error", "0%").click(); } else { await tombol(w, "jenis", EMPAT_SUKSES).click(); await tombol(w, "error", "60%").click(); await tombol(w, "serentak", "4").click(); }
  const ukur = await page.evaluate(() => {
    const w = document.querySelector("[data-circuit-breaker]");
    const r = w.getBoundingClientRect();
    const luar = [...w.querySelectorAll("button, input, .bb-chip, table, .cb-baris, .cb-angka, .cb-legenda")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > r.right + 0.5 || b.left < r.left - 0.5); }).map((e) => e.className || e.tagName);
    const kecil = [...w.querySelectorAll("button, input")].filter((e) => { const b = e.getBoundingClientRect(); return b.height < 24 || b.width < 24; }).map((e) => e.textContent.trim() || e.type);
    const chip = [...w.querySelectorAll(".bb-chip")].map((c) => ({ t: c.textContent.trim().slice(0, 20), sw: c.scrollWidth <= c.clientWidth + 1 }));
    const tabel = w.querySelector(".cb-tabel");
    return { halaman: document.documentElement.scrollWidth - innerWidth, widget: w.scrollWidth - w.clientWidth, luar, kecil, chip, tabel: tabel ? tabel.scrollWidth - tabel.clientWidth : 0 };
  });
  lapor(ukur.halaman <= 0 && ukur.widget <= 0 && ukur.luar.length === 0 && ukur.kecil.length === 0 && ukur.chip.every((c) => c.sw) && ukur.tabel <= 0,
    `breaker luapan ${lebar}px ${verdana ? "Verdana" : "Inter"} ${jalur}: halaman +${ukur.halaman}, widget +${ukur.widget}, di luar widget [${ukur.luar}], target < 24 px [${ukur.kecil}], tabel +${ukur.tabel}, chip ${JSON.stringify(ukur.chip)}`);
  await ctx.close();
}
{
  const { ctx, page } = await buka([320, 640], { javaScriptEnabled: false });
  const t = await page.evaluate(() => {
    const tb = [...document.querySelectorAll("table")].find((x) => x.querySelector("caption")?.textContent.includes("Titik acuan"));
    if (!tb) return null;
    const c = tb.closest(".sl-markdown-content").getBoundingClientRect();
    const w = document.querySelector("[data-circuit-breaker]");
    const mati = [...document.querySelectorAll("button, input")].filter((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== "hidden" && !e.closest("header, nav, starlight-menu-button, site-search, [data-pagefind-ui]") && w && w.contains(e)).length;
    return { baris: tb.querySelectorAll("tbody tr").length, lebih: Math.max(0, Math.round(tb.getBoundingClientRect().right - c.right)), halaman: document.documentElement.scrollWidth - innerWidth, teks: tb.innerText.replace(/\s+/g, " ").slice(0, 120), widgetTampil: w ? getComputedStyle(w).display : null, mati };
  });
  lapor(t !== null && t.baris === 8 && t.lebih <= 0 && t.halaman <= 0 && t.widgetTampil === "none" && t.mati === 0, `breaker tanpa JavaScript 320px: ${t ? `${t.baris} baris acuan, tabel melebihi wadah ${t.lebih} px, halaman +${t.halaman}, widget display ${t.widgetTampil} (tombol mati tampil: ${t.mati}); "${t.teks}"` : "tabel tidak ada"}`);
  await ctx.close();
}

// 5. CLS: HTML dari build sebelum hydrate (skrip island diblokir, noscript tetap tersembunyi) lawan sesudah hydrate.
for (const ukuran of [[375, 667], [1366, 657]]) {
  const ukur = (page) => page.evaluate(() => {
    const w = document.querySelector("[data-circuit-breaker]");
    let p = w.closest("astro-island").nextElementSibling;
    while (p && p.tagName === "NOSCRIPT") p = p.nextElementSibling;
    return { tinggi: w.getBoundingClientRect().height, sesudah: p.getBoundingClientRect().top + scrollY };
  });
  const [w, h] = ukuran;
  const ctxA = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await ctxA.route(/\/_astro\/(CircuitBreaker|client|react)[^/]*\.js$/, (r) => r.abort());
  const pageA = await ctxA.newPage();
  await pageA.goto(BASE + HAL, { waitUntil: "load" });
  const statis = await ukur(pageA);
  const belumHydrate = await pageA.evaluate(() => !!document.querySelector("astro-island[ssr]"));
  await ctxA.close();
  const b = await buka(ukuran);
  await siap(b.page);
  const hidup = await ukur(b.page);
  await b.ctx.close();
  const geser = Math.max(Math.abs(statis.tinggi - hidup.tinggi), Math.abs(statis.sesudah - hidup.sesudah));
  lapor(belumHydrate && geser <= 1, `breaker CLS ${ukuran.join("x")}: tinggi sebelum hydrate ${statis.tinggi.toFixed(1)} px, sesudah ${hidup.tinggi.toFixed(1)} px, isi sesudahnya geser ${geser.toFixed(1)} px (belum hydrate ${belumHydrate})`);
}

// 6. Ukuran JS halaman uji (byte jaringan saat dimuat dan digulir sampai bawah, gzip per respons).
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 657 } });
  const page = await ctx.newPage();
  const isi = [];
  page.on("response", (r) => { if (/\.js(\?.*)?$/.test(r.url()) && r.ok()) isi.push(r.body().catch(() => Buffer.alloc(0))); });
  await page.goto(BASE + HAL, { waitUntil: "networkidle" });
  await page.evaluate(async () => { for (let i = 0; i < 50 && scrollY + innerHeight < document.documentElement.scrollHeight - 2; i++) { scrollBy(0, 600); await new Promise((s) => setTimeout(s, 30)); } });
  await page.waitForLoadState("networkidle");
  const b = await Promise.all(isi);
  const flow = b.some((x) => x.includes("react-flow__pane"));
  const zod = b.some((x) => x.includes("ZodError") || x.includes("invalid_type"));
  const rekaman = b.some((x) => x.includes("rekaman t4-integrasi"));
  lapor(!flow, `breaker ${HAL} tidak memuat React Flow`);
  lapor(!zod, `breaker ${HAL} tidak memuat Zod (rekaman dan teks divalidasi saat build)`);
  lapor(!rekaman, `breaker ${HAL} tidak memuat pembaca rekaman`);
  console.log(`info JS ${HAL}: ${b.length} file, ${(b.reduce((n, x) => n + x.length, 0) / 1024).toFixed(1)} KB tanpa kompresi, ${(b.reduce((n, x) => n + gzipSync(x).length, 0) / 1024).toFixed(1)} KB gzip`);
  await ctx.close();
}

await browser.close();
console.log(gagal ? `Widget breaker GAGAL (${gagal})` : "Widget breaker: tebak dulu, keyboard, angka dari rekaman, papan, kontras, axe, luapan, CLS lolos");
process.exit(gagal ? 1 : 0);
