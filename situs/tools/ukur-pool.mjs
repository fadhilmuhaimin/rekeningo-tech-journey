// Memeriksa widget pool koneksi dan Little's Law (W3-pool, keputusan 980) di halaman uji /uji/pool/:
// - tebak dulu: sebelum menebak tidak ada panel "Ubah satu hal" dan hasil (role=status) kosong; Tab melewati empat pilihan
//   dengan fokus terlihat (outline >= 2 px); tebakan salah lewat Enter memberi "Coba pilihan lain", fokus ke tombol itu,
//   dan Enter di situ mengembalikan fokus ke pilihan pertama dan menutup panel;
// - keyboard: Enter pada tebakan benar memindahkan fokus ke tombol pertama "Ubah satu hal"; aria-pressed pindah per kelompok;
//   slider jam: panah, Home, End mengubah detik dan aria-valuetext, tanpa mengubah kalimat role=status (satu kalimat);
// - angka dari rekaman: untuk A, B, C, D, E, F dan t = 0,3, 2, 10 detik, kalimat penuh, L, titik acuan, dan keadaan
//   (pembayaran masuk, memegang koneksi, menunggu) sama dengan labs/t3-pool/output, dibaca di sini dengan pola sendiri
//   (bukan logika.ts), supaya alat ini tidak lolos karena salah yang sama; pool 4 dan t = 30 detik tanpa titik acuan;
// - batang: 63 batang, jumlah batang penuh = detik bulat sesudah n ÷ λ; pool dan batang aria-hidden;
// - gerak: 0 animasi saat dimuat dan dengan reduced motion sesudah semua interaksi; fungsi sama di kedua mode;
// - kontras teks >= 4,5:1 gelap dan terang; axe-core (WCAG A/AA sampai 2.2) pada keadaan sesudah menebak;
// - luapan: 320 dan 375 px tanpa gulir ke samping, tombol dan chip di dalam widget, target >= 24 px; tanpa JavaScript
//   tabel acuan tidak meluap di 320 px;
// - CLS: tinggi widget dan letak paragraf sesudahnya sama tanpa JS dan sesudah hydrate (<= 1 px);
// - ukuran JS /uji/pool/ dicetak (baris "info").
//   node tools/ukur-pool.mjs --url http://127.0.0.1:4321
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
const HAL = "/uji/pool/";
const DIR = "labs/t3-pool/output";
const baca = (f) => readFileSync(new URL(`../../${DIR}/${f}`, import.meta.url), "utf8");
const M18 = baca("m18.txt"), LITTLE = baca("little.txt"), ADR = baca("adr22.txt");
const L = JSON.parse(readFileSync(new URL("../data/widget/t3-pool-little.json", import.meta.url), "utf8"));

// Angka rekaman dibaca dengan pola sendiri.
const dec = (s) => Number(s.replace(",", "."));
const koma = (x, d) => x.toFixed(d).replace(".", ",");
const ambil = (teks, pola, nama) => { const m = teks.match(pola); if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`); return m; };
const hit = ambil(LITTLE, /hitungan: L = λ × W = (\d,\d+) × \((\d,\d+) \+ (\d+,\d+)\)/, "hitungan little");
const LAMBDA = dec(hit[1]), W0 = dec(hit[2]);
const pA = ambil(M18, /pool 10 penuh antara detik ke-(\d+) dan ke-(\d+) sejak beban mulai \(hitungan 10 ÷ 0,87 = (\d+,\d+)\)/, "pool A");
const pB = ambil(M18, /pool 50 penuh antara detik ke-(\d+) dan ke-(\d+) sejak beban mulai \(hitungan 50 ÷ 0,87 = (\d+,\d+)\)/, "pool B");
const kA = ambil(M18, /# Sesudah (\d+) detik: (\d+) pembayaran dikirim, \d+ belum dijawab\. Di layanan push (\d+) permintaan menggantung, jadi (\d+) pembayaran menunggu/, "keadaan A");
const kB = ambil(M18, /# Sesudah (\d+,\d+) detik: (\d+) pembayaran dikirim, \d+ belum dijawab, (\d+) menggantung di layanan push, (\d+) menunggu/, "keadaan B");
const puncakC = ambil(M18, /koneksi idle in transaction: puncak (\d+) dari 10 \(0,87 × (\d+) detik/, "puncak C");
const puncakD = ambil(ADR, /koneksi idle in transaction: puncak (\d+) dari 10 \(0,87 × (\d+) detik = \d,\d+, jadi paling banyak \d+\): pool tidak penuh/, "puncak D");
const kedua = ambil(ADR, /pembayaran kedua: 201 sesudah lebih dari (\d+) detik/, "kedua D")[1];
const puncakE = ambil(ADR, /di PostgreSQL: idle in transaction puncak (\d+) \(/, "puncak E")[1];
const f26 = ambil(ADR, /pembayaran request 1 sampai 520: (\d+) pembayaran: 201 x\d+/, "F")[1];
const littleT = [...LITTLE.matchAll(/hitungan: L = λ × W = \d,\d+ × \(\d,\d+ \+ (\d+,\d+)\) = (\d+,\d+) koneksi[\s\S]*?paling banyak (\d+) dari 10/g)].map((m) => ({ t: dec(m[1]), L: m[2], paling: Number(m[3]) }));
if (littleT.length !== 3) throw new Error("rekaman: little.txt harus punya tiga titik t");
const detikText = (t) => (Number.isInteger(t) ? String(t) : koma(t, 1));
const lt = (L_) => koma(L_, 3);
const penuhBulat = (n) => 62 - Math.ceil(n / LAMBDA - 1e-9) + 1; // batang penuh bila terpakai = n pada detik bulat >= n ÷ λ

// Kasus: setelan tombol, kalimat vonis, kata di acuan, dan keadaan yang dibaca dari rekaman.
const KASUS = [
  { kunci: "A", set: {}, vonis: `Pool 10 penuh pada detik ke-${pA[3]}`, acuan: `m18.txt A: pool 10 penuh antara detik ke-${pA[1]} dan ke-${pA[2]}`, penuh: penuhBulat(10),
    jam: Number(kA[1]), angka: { "Pembayaran yang sudah masuk": kA[2], "Memegang koneksi": `${kA[3]} / 10`, "Menunggu koneksi": kA[4], "Pembacaan saldo": L.keadaan.bacaMenunggu } },
  { kunci: "B", set: { n: "50" }, vonis: `Pool 50 penuh pada detik ke-${pB[3]}`, acuan: `m18.txt B: pool 50 penuh antara detik ke-${pB[1]} dan ke-${pB[2]}`, penuh: penuhBulat(50),
    jam: 62, angka: { "Pembayaran yang sudah masuk": kB[2], "Memegang koneksi": `${kB[3]} / 50`, "Menunggu koneksi": kB[4] } },
  { kunci: "C", set: { c: "5" }, vonis: `Pool 10 tidak pernah penuh: paling banyak ${puncakC[1]} koneksi terpakai, L = ${lt(LAMBDA * dec(puncakC[2] + ",0"))}`, acuan: `m18.txt C: client menyerah sesudah ${puncakC[2]} detik`, penuh: 0,
    barisAda: L.keadaan.menyerah },
  { kunci: "D", set: { p: "Timeout push 3 detik" }, vonis: `Pool 10 tidak pernah penuh: paling banyak ${puncakD[1]} koneksi terpakai, L = ${lt(LAMBDA * (W0 + 3))}`, acuan: "adr22.txt D: timeout push 3 detik", penuh: 0,
    catatan: `lebih dari ${kedua} detik, bukan 3` },
  { kunci: "E", set: { p: "idle_in_transaction_session_timeout 5 detik" }, vonis: `Pool 10 penuh pada detik ke-${pA[3]}`, acuan: `adr22.txt E: PostgreSQL paling banyak ${puncakE} sesi idle in transaction`, penuh: penuhBulat(10),
    jam: 30, angka: { "Memegang koneksi": "10 / 10" }, barisAda: L.keadaan.pg, catatan: "melindungi PostgreSQL, bukan pool" },
  { kunci: "F", set: { p: "Push di luar transaction" }, vonis: `Pool 10 tidak pernah penuh: paling banyak 1 koneksi terpakai, L = ${lt(LAMBDA * W0)}`, acuan: "adr22.txt F: push di luar transaction, transaction terbuka paling banyak 1", penuh: 0,
    catatan: `${f26} pembayaran dijawab 201` },
  ...littleT.map((x) => ({ kunci: `L${detikText(x.t)}`, set: { t: detikText(x.t) }, vonis: `Pool 10 tidak pernah penuh: paling banyak ${x.paling} koneksi terpakai, L = ${x.L}`, acuan: `little.txt, t = ${detikText(x.t)} detik: L = ${x.L} dihitung`, penuh: 0 })),
  { kunci: "tanpa-rekaman pool 4", set: { n: "4" }, vonis: `Pool 4 penuh pada detik ke-${koma(4 / LAMBDA, 1)}`, acuan: null, penuh: penuhBulat(4) },
  { kunci: "tanpa-rekaman t 30, pool 50", set: { n: "50", t: "30" }, vonis: `Pool 50 tidak pernah penuh: paling banyak ${Math.ceil(LAMBDA * (W0 + 30))} koneksi terpakai, L = ${lt(LAMBDA * (W0 + 30))}`, acuan: null, penuh: 0 },
];
const GRUP = { n: "Ukuran pool", t: "Layanan push", c: "Client app", p: "Pengaman" };
const NOL = { n: "10", t: "Tidak menjawab", c: "Tanpa batas", p: "Tidak ada" };

const browser = awasi(await chromium.launch(), { alat: "pool" });
let gagal = 0;
const lapor = (ok, pesan) => {
  console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`);
  if (!ok) gagal++;
};
const W = "[data-pool-little]";

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
const grup = (w, kunci) => w.locator(".pl-kelompok", { has: w.page().locator(".pl-label", { hasText: GRUP[kunci] }) });
const tombol = (w, kunci, label) => grup(w, kunci).locator(".pl-tombol", { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) });
async function setel(w, set) {
  for (const k of ["n", "t", "c", "p"]) await tombol(w, k, set[k] ?? NOL[k]).click();
}
const keadaan = (w) => w.locator(".pl-angka > div").evaluateAll((d) => Object.fromEntries(d.map((x) => [x.querySelector("dt").textContent.trim(), x.querySelector("dd").textContent.trim()])));
async function tebakBenar(w) {
  await w.locator(".tb-pilih", { hasText: L.pilihan[2].teks.replace("{n}", "10") }).click();
  await w.locator(".pl-ubah").waitFor();
}

// 1. Tebak dulu, keyboard, slider, gerak: 2 ukuran × 2 reduced motion.
for (const ukuran of [[375, 667], [1366, 657]]) for (const reducedMotion of ["no-preference", "reduce"]) {
  const nama = `${ukuran.join("x")} ${reducedMotion}`;
  const { ctx, page, error } = await buka(ukuran, { reducedMotion });
  const animasiAwal = await page.evaluate(() => document.getAnimations().length);
  await siap(page);
  const w = page.locator(W);
  const status = () => w.locator('[role="status"]').first().innerText();

  const status2 = { total: await w.locator('[role="status"]').count(), vonis: await w.locator('.pl-vonis[role="status"]').count() };
  lapor(status2.total === 2 && status2.vonis === 1, `pool ${nama}: ${status2.total} daerah role=status (hasil tebakan dan kalimat penuh), kalimat penuh ${status2.vonis === 1 ? "membawa" : "tanpa"} role=status`);

  const sebelum = { ubah: await w.locator(".pl-ubah").count(), status: (await status()).trim(), tebak: await w.locator(".tb-pilihan button:not(:disabled)").count(), vonis: (await w.locator(".pl-vonis").innerText()).trim() };
  lapor(sebelum.ubah === 0 && sebelum.status === "" && sebelum.tebak === 4 && sebelum.vonis === "",
    `pool ${nama}: sebelum menebak panel Ubah ${sebelum.ubah}, hasil "${sebelum.status}", ${sebelum.tebak} pilihan aktif, kalimat penuh "${sebelum.vonis}"`);

  // Tab melewati empat pilihan, fokus terlihat.
  await w.locator(".tb-pilihan button").first().focus();
  const urut = [await fokusTeks(page)];
  const outline = [];
  for (let k = 1; k < 4; k++) {
    await page.keyboard.press("Tab");
    urut.push(await fokusTeks(page));
    outline.push(await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2; }));
  }
  const harap = await w.locator(".tb-pilihan button").evaluateAll((b) => b.map((x) => x.textContent.trim().replace(/^[A-D]\s*/, "")));
  lapor(urut.map((u) => u.replace(/^[A-D]\s*/, "")).join("|") === harap.join("|") && outline.every(Boolean), `pool ${nama}: Tab ${urut.length} pilihan dalam urutan DOM, fokus terlihat ${outline.filter(Boolean).length}/${outline.length}`);

  // Tebakan salah (A: tidak pernah) lewat Enter: Coba pilihan lain mendapat fokus; Enter mengembalikan fokus ke pilihan pertama.
  await w.locator(".tb-pilihan button").first().focus();
  await page.keyboard.press("Enter");
  const salah = { pressed: await w.locator(".tb-pilihan button").first().getAttribute("aria-pressed"), aktif: await w.locator(".tb-pilihan button:not(:disabled)").count(), fokus: await fokusTeks(page), status: await status() };
  lapor(salah.pressed === "true" && salah.aktif === 0 && salah.fokus === L.ulang && salah.status.includes(L.belum),
    `pool ${nama}: tebakan salah: aria-pressed ${salah.pressed}, ${salah.aktif} pilihan aktif, fokus di "${salah.fokus}", hasil "${salah.status.split("\n")[0]}"`);
  await page.keyboard.press("Enter");
  const ulang = { fokus: await fokusTeks(page), ubah: await w.locator(".pl-ubah").count(), aktif: await w.locator(".tb-pilihan button:not(:disabled)").count() };
  const norm = (t) => t.replace(/^A\s*/, "").replace(/\s+/g, " ").trim();
  lapor(norm(ulang.fokus) === norm(await w.locator(".tb-pilihan button").first().innerText()) && ulang.ubah === 0 && ulang.aktif === 4,
    `pool ${nama}: Coba pilihan lain: fokus di "${ulang.fokus.slice(0, 30)}", panel Ubah ${ulang.ubah}, ${ulang.aktif} pilihan aktif`);

  // Tebakan benar lewat Enter: fokus ke tombol pertama Ubah satu hal.
  const benar = w.locator(".tb-pilih", { hasText: "Sekitar detik ke-12" });
  await benar.focus();
  await page.keyboard.press("Enter");
  const tepat = { pressed: await benar.getAttribute("aria-pressed"), fokus: await fokusTeks(page), ubah: await w.locator(".pl-ubah").count(), status: await status() };
  lapor(tepat.pressed === "true" && tepat.fokus === "4" && tepat.ubah === 1 && tepat.status.includes(L.benar),
    `pool ${nama}: tebakan benar: aria-pressed ${tepat.pressed}, fokus di "${tepat.fokus}" (tombol pertama Ubah), hasil "${tepat.status.split("\n")[0]}"`);

  // Slider jam: panah, Home, End; kalimat penuh tidak berubah; aria-valuetext mengikuti.
  const slider = w.locator(".pl-jam input");
  const kalimat0 = (await w.locator(".pl-vonis").innerText()).trim();
  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  const kiri = { nilai: await slider.inputValue(), teks: await slider.getAttribute("aria-valuetext") };
  await page.keyboard.press("Home");
  const awal0 = { nilai: await slider.inputValue(), teks: await slider.getAttribute("aria-valuetext"), dl: await keadaan(w) };
  await page.keyboard.press("End");
  const akhir = { nilai: await slider.inputValue(), dl: await keadaan(w) };
  const kalimat1 = (await w.locator(".pl-vonis").innerText()).trim();
  lapor(kiri.nilai === String(Number(kA[1]) - 1) && kiri.teks.startsWith(`Detik ke-${Number(kA[1]) - 1}:`) && awal0.nilai === "0" && awal0.dl["Pembayaran yang sudah masuk"] === "0" && akhir.nilai === "62" && kalimat0 === kalimat1 && !/\.\s/.test(kalimat0),
    `pool ${nama}: slider ArrowLeft ${kiri.nilai}, Home ${awal0.nilai} (masuk ${awal0.dl["Pembayaran yang sudah masuk"]}), End ${akhir.nilai}; kalimat penuh tetap satu kalimat dan tidak berubah: "${kalimat1.slice(0, 60)}"`);

  // Panah mengubah slider dengan keyboard saja; tombol pengaturan lewat Enter dan Spasi; aria-pressed pindah di kelompoknya.
  const t2 = tombol(w, "t", "2");
  await t2.focus();
  await page.keyboard.press("Enter");
  const p1 = { t2: await t2.getAttribute("aria-pressed"), tNol: await tombol(w, "t", "Tidak menjawab").getAttribute("aria-pressed"), fokus: await fokusTeks(page), jumlah: await grup(w, "t").locator('[aria-pressed="true"]').count() };
  await tombol(w, "t", "10").focus();
  await page.keyboard.press(" ");
  const p2 = { t10: await tombol(w, "t", "10").getAttribute("aria-pressed"), t2: await t2.getAttribute("aria-pressed") };
  lapor(p1.t2 === "true" && p1.tNol === "false" && p1.fokus === "2" && p1.jumlah === 1 && p2.t10 === "true" && p2.t2 === "false",
    `pool ${nama}: Enter dan Spasi memilih t; aria-pressed satu per kelompok (${p1.jumlah}), fokus tetap di "${p1.fokus}"`);

  // Kembali ke pengaturan awal: semua kembali, fokus ke tombol pertama.
  await w.getByRole("button", { name: L.awal }).click();
  const kembali = { fokus: await fokusTeks(page), vonis: (await w.locator(".pl-vonis").innerText()).trim(), pressed: await w.locator(".pl-tombol[aria-pressed='true']").evaluateAll((b) => b.map((x) => x.textContent.trim())) };
  lapor(kembali.fokus === "4" && kembali.vonis.startsWith(`Pool 10 penuh pada detik ke-${pA[3]}`) && kembali.pressed.join("|") === [NOL.n, NOL.t, NOL.c, NOL.p].join("|"),
    `pool ${nama}: Kembali ke pengaturan awal: fokus "${kembali.fokus}", ${kembali.pressed.join(", ")}`);

  await page.waitForFunction(() => document.getAnimations().length === 0);
  const anim = await page.evaluate(() => document.getAnimations().length);
  lapor(animasiAwal === 0 && anim === 0 && error.length === 0, `pool ${nama}: ${animasiAwal} animasi saat dimuat, ${anim} sesudah semua interaksi, ${error.length} error konsol${error.length ? ": " + error.join(" | ") : ""}`);
  await ctx.close();
}

// 2. Angka dari rekaman: semua titik acuan, dan dua kombinasi tanpa rekaman (1366, reduced motion supaya cepat).
{
  const { ctx, page } = await buka([1366, 657], { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  const slider = w.locator(".pl-jam input");
  for (const k of KASUS) {
    await w.getByRole("button", { name: L.awal }).click();
    await setel(w, k.set);
    await slider.focus();
    await page.keyboard.press("Home");
    for (let i = 0; i < (k.jam ?? 30); i++) await page.keyboard.press("ArrowRight");
    const vonis = (await w.locator(".pl-vonis").innerText()).trim();
    const acuan = (await w.locator(".pl-acuan").innerText()).replace(/\s+/g, " ").trim();
    const dl = await keadaan(w);
    const catatan = (await w.locator(".pl-catatan").allInnerTexts()).join(" ");
    const hitung = (await w.locator(".pl-hitung").innerText()).replace(/\s+/g, " ");
    const bars = await w.locator(".pl-batang").evaluateAll((b) => ({ n: b.length, penuh: b.filter((x) => x.classList.contains("is-penuh")).length }));
    const sel = await w.locator(".pl-sel").evaluateAll((s) => ({ n: s.length, pakai: s.filter((x) => x.classList.contains("is-pakai")).length }));
    const n = Number(k.set.n ?? 10);
    let ok = vonis.startsWith(k.vonis) && bars.n === 63 && bars.penuh === k.penuh && sel.n === n;
    ok &&= k.acuan === null ? acuan.startsWith(L.tanpaAcuan.slice(0, 30)) && !acuan.includes(L.cocok) : acuan.startsWith(L.cocok) && acuan.includes(k.acuan);
    for (const [kunci, nilai] of Object.entries(k.angka ?? {})) ok &&= dl[kunci] === String(nilai);
    if (k.barisAda) ok &&= k.barisAda in dl;
    if (k.catatan) ok &&= catatan.includes(k.catatan);
    // Kolom koneksi yang terisi sama dengan angka "Memegang koneksi" (bukan hanya di kasus pool penuh).
    ok &&= sel.pakai === Number(dl["Memegang koneksi"].split(" / ")[0]);
    // Blok antrean = yang menunggu (paling banyak 24 digambar); tanpa yang menunggu, teks kosong tampil.
    const blok = await w.locator(".pl-blok").count();
    const kosong = await w.locator(".pl-antre").innerText();
    ok &&= blok === Math.min(Number(dl["Menunggu koneksi"]), 24) && (Number(dl["Menunggu koneksi"]) === 0 ? kosong.includes(L.papan.kosongAntre) : !kosong.includes(L.papan.kosongAntre));
    if (k.kunci === "A") ok &&= blok === Number(kA[4]);
    if (k.kunci === "B") ok &&= blok === Number(kB[4]);
    if (k.kunci === "E") ok &&= Number(dl[L.keadaan.pg]) <= Number(puncakE) && sel.pakai === 10;
    if (k.kunci === "A") ok &&= sel.pakai === Number(kA[3]) && hitung.includes(`10 ÷ ${koma(LAMBDA, 2)} = ${pA[3]} detik`) && hitung.includes("tak terhingga");
    if (k.kunci === "B") ok &&= sel.pakai === Number(kB[3]);
    // Geometri (tinjauan, keputusan 982): tinggi batang tertinggi = puncak ÷ n, garis putus di L ÷ n (hanya bila L < n), penanda jam
    // di tengah batang detik yang dipilih. Tanpa ini batang, garis, dan penanda bisa salah ukuran tanpa ada yang gagal.
    const geo = await w.evaluate((e) => {
      const g = e.querySelector(".pl-grafik");
      const r = g.getBoundingClientRect();
      const cs = getComputedStyle(g);
      const bawah = r.bottom - parseFloat(cs.borderBottomWidth);
      const tinggi = g.clientHeight;
      const bars = [...e.querySelectorAll(".pl-batang")].map((b) => { const x = b.getBoundingClientRect(); return { h: x.height / tinggi, tengah: x.left + x.width / 2 }; });
      const garis = e.querySelector(".pl-garis")?.getBoundingClientRect();
      const kursor = e.querySelector(".pl-kursor").getBoundingClientRect();
      return { bars, garis: garis ? (bawah - garis.bottom) / tinggi : null, kursor: kursor.left + kursor.width / 2 };
    });
    const puncak = Number((vonis.match(/paling banyak (\d+) koneksi/) ?? [])[1] ?? n);
    const tinggiMaks = Math.max(...geo.bars.map((b) => b.h));
    const lTeks = (hitung.match(/λ × W = [\d,]+ × [\d,]+ = (\d+,\d+) koneksi/) ?? [])[1];
    const lHit = lTeks === undefined ? null : dec(lTeks);
    const garisAda = lHit !== null && lHit < n;
    const jamPilih = k.jam ?? 30;
    const geoOk = Math.abs(tinggiMaks - puncak / n) <= 0.02
      && geo.bars.filter((b) => b.h >= 0.98).length === (puncak === n ? k.penuh : 0)
      && (garisAda ? geo.garis !== null && Math.abs(geo.garis - lHit / n) <= 0.04 : geo.garis === null)
      && Math.abs(geo.kursor - geo.bars[jamPilih].tengah) <= 2;
    if (!geoOk) console.log(`   geometri ${k.kunci}: tinggi maks ${tinggiMaks.toFixed(3)} (harap ${(puncak / n).toFixed(3)}), garis ${geo.garis === null ? "-" : geo.garis.toFixed(3)} (harap ${garisAda ? (lHit / n).toFixed(3) : "-"}), penanda ${geo.kursor.toFixed(1)} px, batang jam ${geo.bars[jamPilih].tengah.toFixed(1)} px`);
    ok &&= geoOk;
    lapor(ok, `pool angka ${k.kunci}: "${vonis.slice(0, 85)}"; acuan ${acuan === "" ? "-" : acuan.slice(0, 70)}; batang penuh ${bars.penuh}/${k.penuh}; geometri tinggi ${tinggiMaks.toFixed(2)} garis ${geo.garis === null ? "-" : geo.garis.toFixed(2)}; keadaan ${JSON.stringify(dl).slice(0, 110)}`);
  }

  // Rumus Little di layar untuk t = 2: L = λ × W tercetak persis.
  await w.getByRole("button", { name: L.awal }).click();
  await tombol(w, "t", "2").click();
  const rumus = (await w.locator(".pl-hitung").innerText()).replace(/\s+/g, " ");
  const W2 = koma(W0 + 2, 2);
  lapor(rumus.includes(`${koma(W0, 2)} + 2 = ${W2} detik`) && rumus.includes(`λ × W = ${koma(LAMBDA, 2)} × ${W2} = ${lt(LAMBDA * (W0 + 2))} koneksi`) && rumus.includes("Asumsi: 17,4 request per detik ÷ 20"),
    `pool rumus t = 2: "${rumus.slice(0, 200)}"`);
  // Nama pengaturan kode tidak diterjemahkan peramban.
  const kode = await w.locator("code").evaluateAll((c) => ({ n: c.length, salah: c.filter((x) => x.getAttribute("translate") !== "no").length }));
  lapor(kode.n >= 1 && kode.salah === 0, `pool kode: ${kode.n} elemen code, ${kode.salah} tanpa translate="no"`);
  // Garis L hanya bila L < n; pool dan batang tersembunyi dari pembaca layar.
  const garis = await w.locator(".pl-garis").count();
  const sembunyi = await w.evaluate((e) => [".pl-pool", ".pl-grafik"].map((s) => e.querySelector(s).getAttribute("aria-hidden")));
  await tombol(w, "t", "Tidak menjawab").click();
  const garis2 = await w.locator(".pl-garis").count();
  lapor(garis === 1 && garis2 === 0 && sembunyi.join() === "true,true", `pool grafik: garis L ${garis} saat t = 2 dan ${garis2} saat tidak menjawab; pool dan batang aria-hidden ${sembunyi.join()}`);

  // Kontras teks di kedua tema, dan axe pada keadaan sesudah menebak dengan catatan terbuka.
  await tombol(w, "p", "idle_in_transaction_session_timeout 5 detik").click();
  await tombol(w, "c", "5").click();
  const kontras = await page.evaluate(() => {
    const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const campur = (atas, bawah, a) => atas.slice(0, 3).map((v, k) => v * a + bawah[k] * (1 - a));
    const latar = (el) => { const lapis = []; for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c && c[3] > 0) { lapis.push(c); if (c[3] === 1) break; } } let h = [255, 255, 255]; for (const c of lapis.reverse()) h = campur(c, h, c[3]); return h; };
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const rasio = (el) => { let op = 1; for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity); const bg = latar(el), fg = rgba(getComputedStyle(el).color); const t = campur(fg, bg, fg[3] * op); const [a, b] = [lum(t), lum(bg)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); };
    const w = document.querySelector("[data-pool-little]");
    const teks = [...w.querySelectorAll("*")].filter((e) => !e.closest(".bb-sr") && !e.closest("[aria-hidden='true']") && !e.closest(":disabled") && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const hasil = {};
    const awal = document.documentElement.dataset.theme;
    for (const t of ["dark", "light"]) { document.documentElement.dataset.theme = t; hasil[t] = Math.min(...teks.map(rasio)); }
    document.documentElement.dataset.theme = awal;
    return { ...hasil, n: teks.length };
  });
  lapor(kontras.dark >= 4.5 && kontras.light >= 4.5 && kontras.n > 40, `pool kontras ${kontras.n} teks: gelap ${kontras.dark.toFixed(2)}:1, terang ${kontras.light.toFixed(2)}:1`);
  await page.addScriptTag({ path: AXE_PATH });
  for (const tema of ["dark", "light"]) {
    const v = await page.evaluate(async ([tema, tag]) => {
      document.documentElement.dataset.theme = tema;
      const r = await window.axe.run(document.querySelector("[data-pool-little]"), { runOnly: { type: "tag", values: tag }, resultTypes: ["violations"] });
      return r.violations.map((x) => `${x.id} (${x.nodes.length})`);
    }, [tema, TAG_WCAG]);
    lapor(v.length === 0, `pool axe sesudah menebak ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
  }
  await ctx.close();
}

// 3. Luapan dan target: 320 dan 375 px sesudah menebak dengan catatan dan pengaman terpanjang; tanpa JS tabel acuan di 320 px.
for (const lebar of [320, 375]) {
  const { ctx, page } = await buka([lebar, 640], { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  await tombol(w, "p", "idle_in_transaction_session_timeout 5 detik").click();
  await tombol(w, "c", "30").click();
  await tombol(w, "n", "50").click();
  const ukur = await page.evaluate(() => {
    const w = document.querySelector("[data-pool-little]");
    const r = w.getBoundingClientRect();
    const luar = [...w.querySelectorAll("button, input, .bb-chip, table, .pl-pool, .pl-grafik")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > r.right + 0.5 || b.left < r.left - 0.5); }).map((e) => e.className || e.tagName);
    const kecil = [...w.querySelectorAll("button, input")].filter((e) => { const b = e.getBoundingClientRect(); return b.height < 24 || b.width < 24; }).map((e) => e.textContent.trim() || e.type);
    const chip = [...w.querySelectorAll(".bb-chip")].map((c) => ({ t: c.textContent.trim().slice(0, 20), sw: c.scrollWidth <= c.clientWidth + 1, baris: Math.round(c.getBoundingClientRect().height / parseFloat(getComputedStyle(c).lineHeight || "20")) }));
    return { halaman: document.documentElement.scrollWidth - innerWidth, widget: w.scrollWidth - w.clientWidth, luar, kecil, chip };
  });
  lapor(ukur.halaman <= 0 && ukur.widget <= 0 && ukur.luar.length === 0 && ukur.kecil.length === 0 && ukur.chip.every((c) => c.sw && c.baris <= 3),
    `pool luapan ${lebar}px: halaman +${ukur.halaman}, widget +${ukur.widget}, di luar widget [${ukur.luar}], target < 24 px [${ukur.kecil}], chip ${JSON.stringify(ukur.chip)}`);
  await ctx.close();
}
{
  const { ctx, page } = await buka([320, 640], { javaScriptEnabled: false });
  const t = await page.evaluate(() => {
    const tb = document.querySelector("noscript + table, table.tm-tabel") ?? [...document.querySelectorAll("table")].find((x) => x.querySelector("caption")?.textContent.includes("Titik acuan"));
    if (!tb) return null;
    const c = tb.closest(".sl-markdown-content").getBoundingClientRect();
    return { baris: tb.querySelectorAll("tbody tr").length, lebih: Math.max(0, Math.round(tb.getBoundingClientRect().right - c.right)), halaman: document.documentElement.scrollWidth - innerWidth, teks: tb.innerText.replace(/\s+/g, " ").slice(0, 120) };
  });
  lapor(t !== null && t.baris === 9 && t.lebih <= 0 && t.halaman <= 0, `pool tanpa JavaScript 320px: ${t ? `${t.baris} baris acuan, tabel melebihi wadah ${t.lebih} px, halaman +${t.halaman}; "${t.teks}"` : "tabel tidak ada"}`);
  await ctx.close();
}

// 4. CLS: HTML dari build sebelum hydrate (skrip island diblokir, noscript tetap tersembunyi) lawan sesudah hydrate.
for (const ukuran of [[375, 667], [1366, 657]]) {
  const ukur = (page) => page.evaluate(() => {
    const w = document.querySelector("[data-pool-little]");
    let p = w.closest("astro-island").nextElementSibling;
    while (p && p.tagName === "NOSCRIPT") p = p.nextElementSibling;
    return { tinggi: w.getBoundingClientRect().height, sesudah: p.getBoundingClientRect().top + scrollY };
  });
  const [w, h] = ukuran;
  const ctxA = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await ctxA.route(/\/_astro\/(PoolLittle|client|react)[^/]*\.js$/, (r) => r.abort());
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
  lapor(belumHydrate && geser <= 1, `pool CLS ${ukuran.join("x")}: tinggi sebelum hydrate ${statis.tinggi.toFixed(1)} px, sesudah ${hidup.tinggi.toFixed(1)} px, isi sesudahnya geser ${geser.toFixed(1)} px (belum hydrate ${belumHydrate})`);
}

// 5. Ukuran JS halaman uji (byte jaringan saat dimuat dan digulir sampai bawah, gzip per respons).
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
  lapor(!flow, `pool ${HAL} tidak memuat React Flow`);
  lapor(!zod, `pool ${HAL} tidak memuat Zod (rekaman dan teks divalidasi saat build)`);
  console.log(`info JS ${HAL}: ${b.length} file, ${(b.reduce((n, x) => n + x.length, 0) / 1024).toFixed(1)} KB tanpa kompresi, ${(b.reduce((n, x) => n + gzipSync(x).length, 0) / 1024).toFixed(1)} KB gzip`);
  await ctx.close();
}

await browser.close();
console.log(gagal ? `Widget pool GAGAL (${gagal})` : "Widget pool: tebak dulu, keyboard, angka dari rekaman, kontras, axe, luapan, CLS lolos");
process.exit(gagal ? 1 : 0);
