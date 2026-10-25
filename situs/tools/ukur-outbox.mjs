// Memeriksa widget outbox dan worker (W3-outbox, keputusan 983) di halaman uji /uji/outbox/:
// - tebak dulu: sebelum menebak "Ubah satu hal" tidak ada dan status kosong; Tab mencapai tombol aktif dalam urutan DOM
//   dengan fokus terlihat; Enter memilih jawaban (aria-pressed, pilihan lain nonaktif), status satu kalimat, fokus pindah
//   ke tombol pertama "Ubah satu hal"; panah memindahkan fokus dalam kelompok; Spasi mengubah pengaturan (aria-pressed
//   pindah, fokus tetap, status berganti); jawaban salah menampilkan "Coba pilihan lain" dan fokus kembali ke pilihan;
// - angka dari rekaman: jawaban benar tiap skenario dan angka tiap titik rekaman (dibaca ulang di sini dengan cara sendiri
//   dari labs/t3-outbox/output) sama dengan yang tampil; chip Rekaman lab, Hitungan, Asumsi, atau Ilustrasi sesuai;
// - gerak: 0 animasi saat dimuat; dengan reduced motion 0 animasi dan fungsi sama; ganti pengaturan tidak bergerak;
// - tata letak: 320, 375, 1366 px tanpa gulir ke samping, penanda lajur dan waktu satu baris, target >= 24 px;
// - kontras teks >= 4,5:1 gelap dan terang; axe-core (WCAG A/AA sampai 2.2) di keadaan dengan baris bermasalah;
// - tanpa JS: widget dirender saat build dan <noscript> memuat tabel semua pengaturan; CLS tinggi widget <= 1 px;
// - ukuran JS /uji/outbox/ dicetak (baris "info") dan React Flow tidak dimuat.
//   node tools/ukur-outbox.mjs --url http://127.0.0.1:4321
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
const HAL = "/uji/outbox/";
const baca = (f) => readFileSync(new URL(`../../labs/t3-outbox/output/${f}.txt`, import.meta.url), "utf8");
const L = JSON.parse(readFileSync(new URL("../data/widget/t3-outbox-worker.json", import.meta.url), "utf8"));
const R = Object.fromEntries(["transaksi", "kursor", "ganda", "retry", "queue"].map((f) => [f, baca(f)]));
const ambil = (teks, pola, nama) => {
  const m = teks.match(pola);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const idn = (s) => Number(s.replace(/\./g, "").replace(",", "."));
const fid = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const TOTAL_KONFIG = 15 + 4 + 9 + 8 + 16;

// Angka rekaman, dibaca dengan pola sendiri (bukan rekaman.ts).
const REK = {
  kursorB: idn(ambil(R.kursor, /push tiruan menerima: (\d+) pesan \(hanya Dimas\)/, "kursor B")[1]),
  kursorC: idn(ambil(R.kursor, /push tiruan menerima: (\d+) pesan;/, "kursor C")[1]),
  retryPermintaan: idn(ambil(R.retry, /push tiruan menerima: (\d+) permintaan/, "retry A")[1]),
  retryBatas: idn(ambil(R.retry, /outbox\.status = mati, percobaan = (\d+)\n/, "retry A batas")[1]),
  retryPesanC: idn(ambil(R.retry, /(\d+) pesan untuk 1 notifikasi_id/, "retry C pesan")[1]),
  retryPercobaanC: idn(ambil(R.retry, /klaim 6:.*percobaan = (\d+)/, "retry C percobaan")[1]),
  gandaA: idn(ambil(R.ganda, /(\d+) pesan, 1 notifikasi_id/, "ganda A")[1]),
  gandaD: idn(ambil(R.ganda, /(\d+) pesan \(dua HP/, "ganda D")[1]),
  promo30: idn(ambil(R.queue, /naskah: (\d+) = (\d+)%/, "queue C")[1]),
  persen30: idn(ambil(R.queue, /naskah: (\d+) = (\d+)%/, "queue C")[2]),
  habis: idn(ambil(R.queue, /= (\d+) detik \(12,5 menit\)/, "queue C habis")[1]),
  kapasitas: idn(ambil(R.queue, /c ÷ t = \d+ ÷ [\d,]+ = ([\d,]+)\)/, "queue A")[1]),
  habisLaju: idn(ambil(R.queue, /butuh ([\d.]+) detik \(33 menit\)/, "queue F habis")[1]),
  sisa: idn(ambil(R.queue, /= ([\d,]+) per detik, [\d,]+ kali puncak/, "queue F sisa")[1]),
};
// Skenario: jawaban benar (indeks pilihan) dari rekaman.
const BENAR = { cara: 2, kursor: [0, 1, 2].indexOf(REK.kursorB), ulang: [4, 5, 6].indexOf(REK.retryPesanC), ganda: [1, 2, 3].indexOf(REK.gandaA), antrean: [4, 40, 95].indexOf(REK.persen30) };
const NAMA = ["cara", "kursor", "ulang", "ganda", "antrean"];

const browser = awasi(await chromium.launch(), { alat: "outbox" });
let gagal = 0;
const lapor = (ok, pesan) => {
  console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`);
  if (!ok) gagal++;
};
const W = "[data-outbox-worker]";

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
const opsiTeks = (id, knob, opsi) => L.skenario[id].knob.find((k) => k.id === knob).opsi[opsi].replace("{n}", opsi).replace("{gagal}", "2");
async function skenario(w, id) {
  await w.locator(".ow-skenario button", { hasText: L.skenario[id].nama }).click();
}
async function atur(w, id, konfig) {
  for (const [knob, opsi] of Object.entries(konfig)) {
    const grup = w.locator(".ow-knob", { hasText: L.skenario[id].knob.find((k) => k.id === knob).label }).first();
    await grup.locator("button", { hasText: new RegExp(`^${opsiTeks(id, knob, opsi).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).click();
  }
}
// role=status hanya satu kalimat ringkas: jumlah kalimat tiap [role=status] paling banyak satu, dan tiap kelompok
// pengaturan punya tepat satu status ringkasan (.ow-ringkas) yang role-nya status.
const statusSatuKalimat = (w) => w.evaluate((el) => {
  const st = [...el.querySelectorAll('[role="status"]')];
  const kalimat = (t) => (t.trim().match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t.trim()].filter(Boolean)).length;
  return { n: st.length, ringkas: el.querySelector(".ow-ringkas")?.getAttribute("role") ?? null, maks: Math.max(0, ...st.map((x) => kalimat(x.textContent))), teks: st.map((x) => x.textContent.trim().slice(0, 60)) };
});
async function angkaDi(w, id) {
  const peta = {};
  for (const x of L.skenario[id].angka) {
    const dt = w.locator(".ow-angka dt", { hasText: new RegExp(`^${x.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) });
    if (await dt.count()) peta[x.kunci] = (await dt.locator("xpath=following-sibling::dd").innerText()).replace(/\s+(Aman|Masalah)$/, "").trim();
  }
  return peta;
}

// 1. Tebak dulu, keyboard, gerak: 2 ukuran × 2 reduced motion.
for (const ukuran of [[375, 667], [1366, 657]]) for (const reducedMotion of ["no-preference", "reduce"]) {
  const nama = `${ukuran.join("x")} ${reducedMotion}`;
  const { ctx, page, error } = await buka(ukuran, { reducedMotion });
  const animasiAwal = await page.evaluate(() => document.getAnimations().length);
  await siap(page);
  const w = page.locator(W);
  const status = async () => (await w.locator(".ow-status").innerText()).trim();

  lapor((await w.locator(".qr-ubah").count()) === 0 && (await status()) === "" && (await w.locator(".tb-pilihan button:not(:disabled)").count()) === 3,
    `outbox ${nama}: sebelum menebak tidak ada "${L.ubahJudul}", status kosong, tiga pilihan aktif`);

  const harap = await w.locator("button:not(:disabled)").evaluateAll((b) => b.map((x) => x.textContent.trim()));
  await w.locator(".ow-skenario button").first().focus();
  const urut = [await fokusTeks(page)];
  const outline = [];
  for (let n = 1; n < harap.length; n++) {
    await page.keyboard.press("Tab");
    urut.push(await fokusTeks(page));
    outline.push(await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2; }));
  }
  lapor(urut.join("|") === harap.join("|") && outline.every(Boolean), `outbox ${nama}: Tab ${urut.length} tombol dalam urutan DOM, fokus terlihat di ${outline.filter(Boolean).length}/${outline.length}`);

  // Tebakan benar lewat Enter di skenario pertama (cara).
  const pil = w.locator(".tb-pilihan button").nth(BENAR.cara);
  await pil.focus();
  await page.keyboard.press("Enter");
  const t = { pressed: await pil.getAttribute("aria-pressed"), aktif: await w.locator(".tb-pilihan button:not(:disabled)").count(), status: await status(), fokus: await fokusTeks(page), grup: await page.evaluate(() => !!document.activeElement?.closest(".ow-knob")) };
  lapor(t.pressed === "true" && t.aktif === 0 && t.status === L.benar && t.grup,
    `outbox ${nama}: Enter memilih jawaban (aria-pressed ${t.pressed}), ${t.aktif} pilihan aktif, status "${t.status}", fokus di "${t.fokus}" dalam kelompok pengaturan ${t.grup}`);

  // Panah dalam kelompok, Spasi mengubah pengaturan, fokus tetap, status berganti.
  const ringkasAwal = (await w.locator(".ow-ringkas").innerText()).trim();
  await page.keyboard.press("ArrowRight");
  const geser = await fokusTeks(page);
  await page.keyboard.press("ArrowLeft");
  const kembali = await fokusTeks(page);
  await page.keyboard.press("End");
  const akhir = await fokusTeks(page);
  await page.keyboard.press("ArrowRight");
  const putar = await fokusTeks(page);
  lapor(geser !== t.fokus && kembali === t.fokus && akhir === opsiTeks("cara", "cara", "outbox") && putar === t.fokus,
    `outbox ${nama}: panah kanan "${geser}", kiri "${kembali}", End "${akhir}", kanan dari akhir kembali ke "${putar}"`);
  await page.keyboard.press("End");
  await page.waitForFunction(() => document.querySelector("[data-outbox-worker]").getAnimations({ subtree: true }).length === 0); // gerak jawaban tebakan selesai dulu
  const gerak = () => page.evaluate(() => document.querySelector("[data-outbox-worker]").getAnimations({ subtree: true }).filter((a) => !(a instanceof CSSTransition)).length);
  const anim0 = await gerak();
  await page.keyboard.press(" ");
  const baru = { pressed: await page.evaluate(() => document.activeElement.getAttribute("aria-pressed")), fokus: await fokusTeks(page), ringkas: (await w.locator(".ow-ringkas").innerText()).trim(), anim: await gerak() };
  lapor(baru.pressed === "true" && baru.fokus === opsiTeks("cara", "cara", "outbox") && baru.ringkas !== ringkasAwal && baru.anim === anim0 && baru.anim === 0 && baru.ringkas.includes("ketiga hal terpenuhi"),
    `outbox ${nama}: Spasi memilih "${baru.fokus}" (aria-pressed ${baru.pressed}), fokus tetap, status "${baru.ringkas.slice(0, 70)}", ${baru.anim} animasi`);

  // Jawaban salah di skenario kedua: tebakan ulang dan fokus kembali.
  await skenario(w, "kursor");
  const salah = (BENAR.kursor + 1) % 3;
  await w.locator(".tb-pilihan button").nth(salah).click();
  const s2 = { status: await status(), ulang: await w.getByRole("button", { name: L.ulang }).count() };
  await w.getByRole("button", { name: L.ulang }).click();
  const s3 = { status: await status(), aktif: await w.locator(".tb-pilihan button:not(:disabled)").count(), fokus: await page.evaluate(() => !!document.activeElement?.closest(".tb-pilihan")) };
  lapor(s2.status === L.belum && s2.ulang === 1 && s3.status === "" && s3.aktif === 3 && s3.fokus,
    `outbox ${nama}: jawaban salah "${s2.status}", tombol "${L.ulang}" ${s2.ulang}, sesudah ulang status kosong, ${s3.aktif} pilihan aktif, fokus di pilihan ${s3.fokus}`);

  lapor(animasiAwal === 0 && error.length === 0, `outbox ${nama}: ${animasiAwal} animasi saat dimuat, ${error.length} error konsol${error.length ? ": " + error.join(" | ") : ""}`);
  await ctx.close();
}

// 2. Gerak jawaban: bergerak tanpa reduced motion, tidak dengan reduced motion.
for (const reducedMotion of ["no-preference", "reduce"]) {
  const { ctx, page } = await buka([375, 667], { reducedMotion });
  await siap(page);
  const w = page.locator(W);
  await w.locator(".tb-pilihan button").nth(BENAR.cara).click();
  const anim = await page.evaluate(() => document.querySelector("[data-outbox-worker] .tb-hasil").getAnimations().length);
  lapor(reducedMotion === "reduce" ? anim === 0 : anim > 0, `outbox gerak ${reducedMotion}: ${anim} animasi pada jawaban tebakan`);
  await ctx.close();
}

// 3. Angka rekaman: jawaban benar dan titik rekaman di setiap skenario (1366, reduced motion supaya cepat).
{
  const { ctx, page } = await buka([1366, 657], { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  for (const id of NAMA) {
    await skenario(w, id);
    const p = w.locator(".tb-pilihan button").nth(BENAR[id]);
    await p.click();
    lapor((await w.locator(".ow-status").innerText()).trim() === L.benar && BENAR[id] >= 0, `outbox ${id}: jawaban benar dari rekaman = pilihan ${"ABC"[BENAR[id]]}, status "${L.benar}"`);
  }
  const cek = async (id, konfig, harap, chip) => {
    await skenario(w, id);
    await atur(w, id, konfig);
    const a = await angkaDi(w, id);
    const label = (await w.locator(".ow-acuan .bb-chip").innerText()).trim();
    const cocok = Object.entries(harap).every(([kunci, v]) => a[kunci] === v);
    const st = await statusSatuKalimat(w);
    lapor(st.ringkas === "status" && st.maks <= 1 && st.n === 2, `outbox status ${id} ${JSON.stringify(konfig)}: ${st.n} status (harap 2), ringkasan role ${st.ringkas}, paling banyak ${st.maks} kalimat per status`);
    lapor(cocok && label === L.jenisChip[chip], `outbox angka ${id} ${JSON.stringify(konfig)}: ${JSON.stringify(a)}; chip "${label}"; harap ${JSON.stringify(harap)} (${chip})`);
  };
  const unit = (n, s) => `${fid.format(n)}${s}`;
  await cek("ulang", { penyebab: "push-503", batas: "5" }, { permintaan: String(REK.retryPermintaan), percobaan: String(REK.retryBatas), terkirim: L.kata.tidak, mati: L.kata.ya }, "rekaman");
  await cek("ulang", { penyebab: "worker-mati", batas: "5" }, { permintaan: String(REK.retryPesanC), percobaan: String(REK.retryPercobaanC), mati: L.kata.ya }, "rekaman");
  await cek("ulang", { penyebab: "pulih-sesudah-2", batas: "5" }, { permintaan: "3", terkirim: L.kata.ya }, "hitungan");
  await cek("ganda", { varian: "dua-hp-klaim-5", penyaring: "mati" }, { pesan: String(REK.gandaD), id: "1" }, "rekaman");
  await cek("ganda", { varian: "mati-klaim-5", penyaring: "hidup" }, { pesan: String(REK.gandaA), tampil: "1" }, "rekaman");
  await cek("ganda", { varian: "dua-hp-klaim-10", penyaring: "mati" }, { pesan: "2", bersamaan: L.kata.tidak }, "asumsi");
  await cek("cara", { cara: "outbox", kejadian: "push-menggantung" }, { jurnal: L.kata.ya, notif: "1", p3: L.kata.ya }, "hitungan");
  await cek("kursor", { poller: "kursor", urutan: "terbalik" }, { pesan: String(REK.kursorB), tertinggal: "1" }, "rekaman");
  await cek("kursor", { poller: "klaim", urutan: "terbalik" }, { pesan: String(REK.kursorC), tertinggal: "0" }, "rekaman");
  await cek("antrean", { kelas: "tanpa", laju: "bebas", c: "4" }, { kapasitas: unit(REK.kapasitas, " per detik"), promo30: fid.format(REK.promo30), persen30: `${REK.persen30}%`, habis: unit(REK.habis, " detik") }, "rekaman");
  await cek("antrean", { kelas: "dengan", laju: "5", c: "4" }, { habis: unit(REK.habisLaju, " detik"), sisa: unit(REK.sisa, " per detik"), tunggu: "0,6 detik" }, "rekaman");
  await cek("antrean", { kelas: "dengan", laju: "bebas", c: "20" }, { kapasitas: unit(20 / 0.3, " per detik"), tunggu: "0,6 detik" }, "hitungan");
  await cek("cara", { cara: "outbox", kejadian: "commit-ditolak" }, { jurnal: L.kata.tidak, outboxBaris: L.kata.tidak, notif: "0", p1: L.kata.ya, p2: L.kata.ya, p3: L.kata.ya }, "rekaman");
  await cek("cara", { cara: "outbox", kejadian: "proses-mati" }, { jurnal: L.kata.ya, outboxBaris: L.kata.ya, notif: "1", p3: L.kata.ya }, "rekaman");
  await cek("cara", { cara: "langsung", kejadian: "commit-ditolak" }, { notif: "1", p1: L.kata.tidak, p3: L.kata.tidak }, "ilustrasi");
  await cek("cara", { cara: "sesudah-commit", kejadian: "proses-mati" }, { jurnal: L.kata.ya, notif: "0", p2: L.kata.tidak }, "ilustrasi");
  await ctx.close();
}

// 4. Tata letak: tanpa gulir ke samping, penanda satu baris, target >= 24 px; pengaturan terpanjang per skenario.
for (const ukuran of [[320, 640], [375, 667], [1366, 657]]) {
  const { ctx, page } = await buka(ukuran, { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  const masalah = [];
  const terpanjang = { cara: { cara: "outbox", kejadian: "push-503" }, kursor: { poller: "kursor", urutan: "terbalik" }, ulang: { penyebab: "push-503", batas: "8" }, ganda: { varian: "dua-hp-klaim-5", penyaring: "hidup" }, antrean: { kelas: "dengan", laju: "5", c: "20" } };
  for (const id of NAMA) {
    await skenario(w, id);
    await w.locator(".tb-pilihan button").nth(BENAR[id]).click();
    await atur(w, id, terpanjang[id]);
    const r = await page.evaluate(() => {
      const wd = document.querySelector("[data-outbox-worker]");
      const satuBaris = (e) => { const lh = parseFloat(getComputedStyle(e).lineHeight) || 20; return e.getBoundingClientRect().height < lh * 1.7 + 4; };
      const kecil = [...wd.querySelectorAll("button")].filter((b) => { const r = b.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).length;
      const luar = [...wd.querySelectorAll("*")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > document.documentElement.clientWidth + 1; }).length;
      return {
        gulir: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        pecahWaktu: [...wd.querySelectorAll(".ow-waktu, .ow-lajur, .ow-tanda")].filter((e) => !satuBaris(e)).length,
        kecil, luar, baris: wd.querySelectorAll(".ow-garis > li").length,
      };
    });
    if (r.gulir > 0 || r.pecahWaktu > 0 || r.kecil > 0 || r.luar > 0 || r.baris === 0) masalah.push(`${id}: gulir ${r.gulir} px, penanda terpecah ${r.pecahWaktu}, tombol < 24 px ${r.kecil}, di luar viewport ${r.luar}, baris ${r.baris}`);
  }
  lapor(masalah.length === 0, `outbox tata letak ${ukuran.join("x")}: ${masalah.length ? masalah.join("; ") : "5 skenario tanpa gulir ke samping, penanda satu baris, tombol >= 24 px"}`);
  await ctx.close();
}

// 5. Kontras teks dan axe di keadaan dengan baris bermasalah (cara: langsung, proses API mati).
{
  const { ctx, page } = await buka([375, 667], { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  await w.locator(".tb-pilihan button").nth(BENAR.cara).click();
  const kontras = await page.evaluate(() => {
    const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const campur = (atas, bawah, a) => atas.slice(0, 3).map((v, k) => v * a + bawah[k] * (1 - a));
    const latar = (el) => { const lapis = []; for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c && c[3] > 0) { lapis.push(c); if (c[3] === 1) break; } } let h = [255, 255, 255]; for (const c of lapis.reverse()) h = campur(c, h, c[3]); return h; };
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const rasio = (el) => { let op = 1; for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity); const bg = latar(el), fg = rgba(getComputedStyle(el).color); const t = campur(fg, bg, fg[3] * op); const [a, b] = [lum(t), lum(bg)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); };
    const wd = document.querySelector("[data-outbox-worker]");
    const teks = [...wd.querySelectorAll(".ow-garis li *, .ow-garis li, .ow-ringkas *, .ow-acuan, .ow-angka *, .ow-knob button, .tb-hasil *, .tb-pilih span, .ow-status")]
      .filter((e) => !e.closest(".tb-huruf") && !e.matches(":disabled") && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const hasil = {};
    const awal = document.documentElement.dataset.theme;
    for (const t of ["dark", "light"]) { document.documentElement.dataset.theme = t; hasil[t] = Math.min(...teks.map(rasio)); }
    document.documentElement.dataset.theme = awal;
    return { ...hasil, n: teks.length };
  });
  lapor(kontras.dark >= 4.5 && kontras.light >= 4.5 && kontras.n > 30, `outbox kontras ${kontras.n} teks: gelap ${kontras.dark.toFixed(2)}:1, terang ${kontras.light.toFixed(2)}:1`);
  await page.addScriptTag({ path: AXE_PATH });
  for (const tema of ["dark", "light"]) {
    for (const [id, konfig] of [["cara", { cara: "langsung", kejadian: "proses-mati" }], ["antrean", { kelas: "tanpa", laju: "bebas", c: "4" }]]) {
      await skenario(w, id);
      if ((await w.locator(".qr-ubah").count()) === 0) await w.locator(".tb-pilihan button").nth(BENAR[id]).click();
      await atur(w, id, konfig);
      const v = await page.evaluate(async ([tema, tag]) => {
        document.documentElement.dataset.theme = tema;
        const r = await window.axe.run(document.querySelector("[data-outbox-worker]"), { runOnly: { type: "tag", values: tag }, resultTypes: ["violations"] });
        return r.violations.map((x) => `${x.id} (${x.nodes.length})`);
      }, [tema, TAG_WCAG]);
      lapor(v.length === 0, `outbox axe ${id} ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
    }
  }
  await ctx.close();
}

// 6. Tanpa JS dan CLS: render build lawan sesudah hydrate; <noscript> memuat semua pengaturan.
for (const ukuran of [[320, 640], [375, 667], [1366, 657]]) {
  const ukur = (page) => page.evaluate(() => {
    const wd = document.querySelector("[data-outbox-worker]");
    return { tinggi: wd.getBoundingClientRect().height, sesudah: wd.getBoundingClientRect().top + scrollY };
  });
  const a = await buka(ukuran, { javaScriptEnabled: false });
  const statis = await ukur(a.page);
  const baris = await a.page.locator("noscript table tbody tr").count();
  const tabel = await a.page.locator("noscript table").count();
  // Tabel di <noscript> juga tidak boleh membuat halaman bergulir ke samping (WCAG 1.4.10).
  const gulirTanpaJs = await a.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  lapor(gulirTanpaJs <= 0, `outbox tanpa JS ${ukuran.join("x")}: gulir ke samping ${gulirTanpaJs} px (harap 0)`);
  await a.ctx.close();
  const b = await buka(ukuran);
  await siap(b.page);
  const hidup = await ukur(b.page);
  await b.ctx.close();
  const geser = Math.max(Math.abs(statis.tinggi - hidup.tinggi), Math.abs(statis.sesudah - hidup.sesudah));
  lapor(geser <= 1, `outbox CLS ${ukuran.join("x")}: tinggi tanpa JS ${statis.tinggi.toFixed(1)} px, sesudah hydrate ${hidup.tinggi.toFixed(1)} px, letak widget geser ${geser.toFixed(1)} px`);
  // Dengan JS dimatikan, Chromium menampilkan isi <noscript> sebagai teks halaman; tabelnya ada di DOM sebagai tabel.
  lapor(tabel === 5 && baris === TOTAL_KONFIG, `outbox tanpa JS ${ukuran.join("x")}: ${tabel} tabel dan ${baris} baris pengaturan di <noscript> (harap 5 dan ${TOTAL_KONFIG})`);
}

// 7. Ukuran JS halaman uji (byte jaringan saat dimuat dan digulir sampai bawah, gzip per respons).
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
  const zod = b.some((x) => x.includes("ZodError") && x.includes("outbox"));
  lapor(!flow && !zod, `outbox ${HAL} tidak memuat React Flow (${!flow}) dan tidak memuat Zod (${!zod})`);
  console.log(`info JS ${HAL}: ${b.length} file, ${(b.reduce((n, x) => n + x.length, 0) / 1024).toFixed(1)} KB tanpa kompresi, ${(b.reduce((n, x) => n + gzipSync(x).length, 0) / 1024).toFixed(1)} KB gzip`);
  await ctx.close();
}

await browser.close();
console.log(gagal ? `Widget outbox dan worker GAGAL (${gagal})` : "Widget outbox dan worker: tebak dulu, keyboard, ARIA, reduced motion, angka dari rekaman, tata letak, kontras, axe, CLS lolos");
process.exit(gagal ? 1 : 0);
