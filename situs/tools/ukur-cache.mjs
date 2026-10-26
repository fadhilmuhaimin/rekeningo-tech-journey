// Memeriksa widget cache dan invalidation (W3-cache, keputusan 986) di halaman uji /uji/cache/:
// - tebak dulu: sebelum menebak tidak ada panel "Ubah satu hal" dan hasil (role=status) kosong; Tab melewati empat pilihan
//   dengan fokus terlihat (outline >= 2 px); tebakan salah lewat Enter memberi "Coba pilihan lain", fokus ke tombol itu,
//   dan Enter di situ mengembalikan fokus ke pilihan pertama dan menutup panel; tebakan benar memindahkan fokus ke tombol
//   pertama "Ubah satu hal";
// - keyboard: Enter dan Spasi memilih pengaturan, aria-pressed tepat satu per kelompok; slider jam: panah, Home, End mengubah
//   detik dan aria-valuetext tanpa mengubah kalimat role=status (satu kalimat); dua tombol lompat memakai TTL yang dipilih;
// - angka dari rekaman: 15 pengaturan (sembilan titik rekaman dan enam tanpa rekaman): kalimat penuh, kotak tiap instance
//   (isi dan stale atau benar) pada detik yang dipilih, lama dan instance yang stale, garis waktu (letak dan lebar bagian
//   stale, penanda jam), titik acuan, dan catatan; semuanya dibaca dari labs/t3-cache/output dengan pola sendiri (bukan
//   rekaman.ts atau logika.ts), supaya alat ini tidak lolos karena salah yang sama;
// - gerak: 0 animasi saat dimuat dan dengan reduced motion sesudah semua interaksi; fungsi sama di kedua mode;
// - kontras teks >= 4,5:1 gelap dan terang; axe-core (WCAG A/AA sampai 2.2) pada keadaan sesudah menebak;
// - luapan: 320 dan 375 px tanpa gulir ke samping, tombol dan chip di dalam widget, target >= 24 px; tanpa JavaScript
//   tabel acuan tidak meluap di 320 px dan memuat sembilan titik rekaman;
// - CLS: tinggi widget dan letak paragraf sesudahnya sama tanpa JS dan sesudah hydrate (<= 1 px);
// - ukuran JS /uji/cache/ dicetak (baris "info").
//   node tools/ukur-cache.mjs --url http://127.0.0.1:4321
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
const HAL = "/uji/cache/";
const DIR = "labs/t3-cache/output";
const baca = (f) => readFileSync(new URL(`../../${DIR}/${f}`, import.meta.url), "utf8");
const M = baca("memori.txt"), RD = baca("redis.txt"), GG = baca("gagal.txt"), BB = baca("beban.txt");
const L = JSON.parse(readFileSync(new URL("../data/widget/t3-cache-invalidation.json", import.meta.url), "utf8"));

// Angka rekaman dibaca dengan pola sendiri.
const ambil = (teks, pola, nama) => { const m = teks.match(pola); if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`); return m; };
const dec = (s) => Number(s.replace(",", "."));
const rp = (n) => `Rp${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const TTL_M = Number(ambil(M, /\(TTL (\d+) detik\)/, "TTL memori")[1]);
const TTL_R = Number(ambil(RD, /-katalog-ttl (\d+)s/, "TTL redis")[1]);
const TTL_G = Number(ambil(RD, /# TTL (\d+) detik di bagian ini/, "TTL lab")[1]);
const MULAI = Number(ambil(RD, /mulai (\d+) detik lagi -> 201/, "promo mulai nanti")[1]);
const LAMA_D = Number(ambil(M, /detik ke-(\d+): masih entri lama/, "detik lama")[1]);
const BARU_D = Number(ambil(M, /detik ke-(\d+): entri habis/, "detik baru")[1]);
const A0 = Number(ambil(M, /"harga":(\d+),"harga_efektif":\d+,"stok":\d+,"versi":1\}   # hit\n/, "harga awal")[1]);
const PROMO = Number(ambil(M, /"nominal":(\d+),"harga_satuan"/, "harga promo")[1]);
const UBAH = Number(ambil(RD, /PATCH \/produk\/<Nasi goreng> harga (\d+), versi 1 -> 200\n/, "harga diubah")[1]);
const S0 = Number(ambil(M, /"harga_efektif":\d+,"stok":(\d+),"versi":1\}   # hit/, "stok awal")[1]);
const S1 = Number(ambil(M, /"stok_sisa":(\d+)/, "stok sesudah pesanan")[1]);
const PTTL = ambil(RD, /paling banyak (\d+\.\d{3}) ms/, "sisa TTL")[1];
const SEREN = Number(ambil(GG, /: (\d+) GET \/katalog\?warung=418 serentak/, "serentak")[1]);
const KONEKSI = Number(ambil(GG, /dicuplik tiap 5 ms selama \d+ bacaan: paling banyak (\d+) koneksi/, "koneksi")[1]);
const BACAAN = Number(ambil(BB, /^(\d+) bacaan -> baca database \d+, hit 0$/m, "bacaan")[1]);
const BEBAN = ambil(BB, /W = (\d+) ms \(Asumsi\), L = (\d,\d+) x (\d,\d+) = (\d,\d+)\./, "beban");
const LAMBDA = dec(ambil(BB, /beban: \d+ bacaan katalog Jakarta, (\d+,\d+) per detik/, "lambda")[1]);
const HORIZON = 330; // detik: lebar garis waktu dan batas slider; kode: HORIZON di logika.ts
const isi = (h, s) => `${rp(h)}, stok ${s}`;
const kal = (templat, nilai) => templat.replace(/\{(\w+)\}/g, (_, k) => String(nilai[k]));

// Label tombol dari data widget ({mulai} diisi dari rekaman).
const LBL = Object.fromEntries(Object.entries(L.pilihNilai).map(([k, daftar]) => [k, Object.fromEntries(daftar.map((o) => [o.nilai, kal(o.label, { mulai: MULAI })]))]));
const GRUP = L.kelompok;
const NOL = { cache: LBL.cache.memori, instance: "2", ttl: String(TTL_M), kejadian: LBL.kejadian.promo, urutan: LBL.urutan.sesudah };
const SET = (cfg) => ({
  cache: LBL.cache[cfg.cache ?? "memori"], instance: String(cfg.instance ?? 2), ttl: String(cfg.ttl ?? TTL_M),
  kejadian: LBL.kejadian[cfg.kejadian ?? "promo"], urutan: LBL.urutan[cfg.urutan ?? "sesudah"],
});

// Kasus. lama = detik harga (atau stok) lama bertahan di instance B; dari = detik stale mulai; basi = jumlah instance yang
// pernah stale; tiles[jam] = [isi, stale] untuk tiap instance. Semuanya ditulis tangan dari rekaman dan aturan, bukan dari kode.
const KASUS = [
  { nama: "memori-promo (M23)", cfg: {}, sebab: "tidak-diberi-tahu", lama: TTL_M, dari: 0, n: 2, basi: 1, baca: `2, satu per instance`, acuan: "memori.txt B dan D",
    tiles: { [LAMA_D]: [[isi(PROMO, S0), false], [isi(A0, S0), true]], [BARU_D]: [[isi(PROMO, S0), false], [isi(PROMO, S0), false]], 0: [[isi(PROMO, S0), false], [isi(A0, S0), true]] } },
  { nama: "memori-stok", cfg: { kejadian: "pesanan" }, sebab: "tanpa-tulis", apa: "stok", lama: TTL_M, dari: 0, n: 2, basi: 2, baca: "2, satu per instance", acuan: "memori.txt C",
    tiles: { 0: [[isi(A0, S0), true], [isi(A0, S0), true]], [BARU_D]: [[isi(A0, S1), false], [isi(A0, S1), false]] } },
  { nama: "redis-harga", cfg: { cache: "redis", ttl: TTL_R, kejadian: "harga" }, sebab: "dihapus-bersama", lama: 0, n: 2, basi: 0, baca: "1, karena satu Redis", acuan: "redis.txt B dan E",
    tiles: { 0: [[isi(UBAH, S0), false], [isi(UBAH, S0), false]] } },
  { nama: "redis-promo", cfg: { cache: "redis", ttl: TTL_R, kejadian: "promo" }, sebab: "dihapus-bersama", lama: 0, n: 2, basi: 0, baca: "1, karena satu Redis", acuan: "redis.txt C",
    tiles: { 0: [[isi(PROMO, S0), false], [isi(PROMO, S0), false]] } },
  { nama: "redis-sebelum", cfg: { cache: "redis", ttl: TTL_R, kejadian: "harga", urutan: "sebelum" }, sebab: "diisi-ulang", lama: TTL_R, dari: 0, n: 2, basi: 2, baca: "1, karena satu Redis", acuan: "redis.txt D", catatan: "gerbang lab",
    tiles: { [TTL_R - 1]: [[isi(A0, S0), true], [isi(A0, S0), true]], [TTL_R]: [[isi(UBAH, S0), false], [isi(UBAH, S0), false]] } },
  { nama: "redis-lambat", cfg: { cache: "redis", ttl: TTL_R, kejadian: "harga", urutan: "lambat" }, sebab: "diisi-ulang", lama: TTL_R, dari: 0, n: 2, basi: 2, baca: "1, karena satu Redis", acuan: "redis.txt F", catatan: "Lab tidak memakai lease",
    tiles: { 1: [[isi(A0, S0), true], [isi(A0, S0), true]], [TTL_R]: [[isi(UBAH, S0), false], [isi(UBAH, S0), false]] } },
  { nama: "redis-nanti", cfg: { cache: "redis", ttl: TTL_G, kejadian: "promo-nanti" }, sebab: "tanpa-tulis", lama: TTL_G - MULAI, dari: MULAI, n: 2, basi: 2, baca: "1, karena satu Redis", acuan: "redis.txt G", catatan: `TTL ${TTL_G} detik hanya dipakai`,
    tiles: { [MULAI - 1]: [[isi(A0, S0), false], [isi(A0, S0), false]], [MULAI]: [[isi(A0, S0), true], [isi(A0, S0), true]], [TTL_G - 1]: [[isi(A0, S0), true], [isi(A0, S0), true]], [TTL_G]: [[isi(PROMO, S0), false], [isi(PROMO, S0), false]] } },
  { nama: "redis-mati", cfg: { cache: "redis-mati", ttl: TTL_R, kejadian: "harga" }, sebab: "hapus-gagal", lama: TTL_R, dari: 0, n: 2, basi: 2, baca: "1, karena satu Redis", acuan: "gagal.txt C", catatan: `${SEREN} bacaan serentak menjadi ${SEREN} baca database`,
    tiles: { [TTL_R - 1]: [[isi(A0, S0), true], [isi(A0, S0), true]], [TTL_R]: [[isi(UBAH, S0), false], [isi(UBAH, S0), false]] } },
  { nama: "tanpa-cache", cfg: { cache: "tanpa", ttl: TTL_R }, sebab: "tanpa-cache", lama: 0, n: 2, basi: 0, baca: "setiap bacaan membaca database", acuan: "beban.txt B dan C",
    tiles: { 0: [[isi(PROMO, S0), false], [isi(PROMO, S0), false]] } },
  // Tanpa rekaman: Ilustrasi dari aturan simulasi.
  { nama: "memori-1-instance", cfg: { instance: 1 }, sebab: "dihapus-sendiri", lama: 0, n: 1, basi: 0, baca: "1, satu per instance", acuan: null,
    tiles: { 0: [[isi(PROMO, S0), false]], [LAMA_D]: [[isi(PROMO, S0), false]] } },
  { nama: "memori-3-instance", cfg: { instance: 3 }, sebab: "tidak-diberi-tahu", lama: TTL_M, dari: 0, n: 3, basi: 2, baca: "3, satu per instance", acuan: null,
    tiles: { 10: [[isi(PROMO, S0), false], [isi(A0, S0), true], [isi(A0, S0), true]], [BARU_D]: [[isi(PROMO, S0), false], [isi(PROMO, S0), false], [isi(PROMO, S0), false]] } },
  { nama: "memori-sebelum", cfg: { urutan: "sebelum" }, sebab: "tidak-diberi-tahu", lama: TTL_M, dari: 0, n: 2, basi: 2, baca: "2, satu per instance", acuan: null, catatan: "gerbang lab",
    tiles: { 10: [[isi(A0, S0), true], [isi(A0, S0), true]], [BARU_D]: [[isi(PROMO, S0), false], [isi(PROMO, S0), false]] } },
  { nama: "memori-harga-ubah", cfg: { kejadian: "harga" }, sebab: "tidak-diberi-tahu", lama: TTL_M, dari: 0, n: 2, basi: 1, baca: "2, satu per instance", acuan: null,
    tiles: { 10: [[isi(UBAH, S0), false], [isi(A0, S0), true]], [BARU_D]: [[isi(UBAH, S0), false], [isi(UBAH, S0), false]] } },
  { nama: "memori-nanti-ttl-60", cfg: { ttl: TTL_R, kejadian: "promo-nanti" }, sebab: "tanpa-tulis", lama: TTL_R - MULAI, dari: MULAI, n: 2, basi: 2, baca: "2, satu per instance", acuan: null, catatan: "Hanya TTL yang membatasi",
    tiles: { [MULAI - 1]: [[isi(A0, S0), false], [isi(A0, S0), false]], [MULAI]: [[isi(A0, S0), true], [isi(A0, S0), true]], [TTL_R]: [[isi(PROMO, S0), false], [isi(PROMO, S0), false]] } },
  { nama: "redis-ttl-300-sebelum", cfg: { cache: "redis", ttl: TTL_M, kejadian: "promo", urutan: "sebelum" }, sebab: "diisi-ulang", lama: TTL_M, dari: 0, n: 2, basi: 2, baca: "1, karena satu Redis", acuan: null,
    tiles: { [LAMA_D]: [[isi(A0, S0), true], [isi(A0, S0), true]], [BARU_D]: [[isi(PROMO, S0), false], [isi(PROMO, S0), false]] } },
];

const browser = awasi(await chromium.launch(), { alat: "cache" });
let gagal = 0;
const lapor = (ok, pesan) => {
  console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`);
  if (!ok) gagal++;
};
const W = "[data-cache-invalidation]";

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
const grup = (w, kunci) => w.locator(".ch-kelompok", { has: w.page().locator(".ch-label", { hasText: GRUP[kunci] }) });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const tombol = (w, kunci, label) => grup(w, kunci).locator(".ch-tombol", { hasText: new RegExp(`^${esc(label)}$`) });
async function setel(w, cfg) {
  const s = SET(cfg);
  for (const k of ["cache", "instance", "ttl", "kejadian", "urutan"]) await tombol(w, k, s[k]).click();
}
const tebakBenar = async (w) => {
  await w.locator(".tb-pilih", { hasText: `Sekitar detik ke-${BARU_D}` }).click();
  await w.locator(".ch-ubah").waitFor();
};
const tiles = (w) => w.locator(".ch-kotak").evaluateAll((k) => k.map((x) => { const c = getComputedStyle(x); return [x.querySelector(".ch-isi").textContent.trim(), x.classList.contains("is-stale"), x.querySelector(".bb-chip").textContent.trim(), x.querySelector("strong").textContent.trim(), `${c.backgroundColor}|${c.borderTopColor}`]; }));
// Warna kotak dan kalimat penuh yang stale lawan yang benar harus berbeda (tema aktif): kumpulan dicocokkan sesudah semua kasus.
const warna = { staleKotak: new Set(), benarKotak: new Set(), staleVonis: new Set(), benarVonis: new Set() };
const rapi = (t) => t.replace(/\s+/g, " ").trim();
// role=status hanya satu kalimat ringkas, tanpa tombol, dan alasan tebakan tidak di dalam daerah live (pola OutboxWorker).
const statusSatuKalimat = (w) => w.evaluate((el) => {
  const st = [...el.querySelectorAll('[role="status"]')];
  const kalimat = (t) => (t.trim().match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t.trim()].filter(Boolean)).length;
  return { n: st.length, maks: Math.max(0, ...st.map((x) => kalimat(x.textContent))), tombol: st.filter((x) => x.querySelector("button")).length, alasan: !!el.querySelector('[role="status"] .tb-hasil') };
});

// 1. Tebak dulu, keyboard, slider, tombol lompat, gerak: 2 ukuran × 2 reduced motion.
for (const ukuran of [[375, 667], [1366, 657]]) for (const reducedMotion of ["no-preference", "reduce"]) {
  const nama = `${ukuran.join("x")} ${reducedMotion}`;
  const { ctx, page, error } = await buka(ukuran, { reducedMotion });
  const animasiAwal = await page.evaluate(() => document.getAnimations().length);
  await siap(page);
  const w = page.locator(W);
  const status = () => w.locator('[role="status"]').first().innerText();

  const status2 = { total: await w.locator('[role="status"]').count(), vonis: await w.locator('.ch-vonis[role="status"]').count() };
  lapor(status2.total === 2 && status2.vonis === 1, `cache ${nama}: ${status2.total} daerah role=status (hasil tebakan dan kalimat penuh), kalimat penuh ${status2.vonis === 1 ? "membawa" : "tanpa"} role=status`);

  const sebelum = { ubah: await w.locator(".ch-ubah").count(), status: (await status()).trim(), tebak: await w.locator(".tb-pilihan button:not(:disabled)").count(), vonis: (await w.locator(".ch-vonis").innerText()).trim(), hasil: await w.locator(".ch-hasil").count() };
  lapor(sebelum.ubah === 0 && sebelum.status === "" && sebelum.tebak === 4 && sebelum.vonis === "" && sebelum.hasil === 0,
    `cache ${nama}: sebelum menebak panel Ubah ${sebelum.ubah}, hasil "${sebelum.status}", ${sebelum.tebak} pilihan aktif, kalimat penuh "${sebelum.vonis}", papan ${sebelum.hasil}`);

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
  lapor(urut.map((u) => u.replace(/^[A-D]\s*/, "")).join("|") === harap.join("|") && outline.every(Boolean), `cache ${nama}: Tab ${urut.length} pilihan dalam urutan DOM, fokus terlihat ${outline.filter(Boolean).length}/${outline.length}`);

  // Tebakan salah (A) lewat Enter: Coba pilihan lain mendapat fokus; Enter mengembalikan fokus ke pilihan pertama.
  await w.locator(".tb-pilihan button").first().focus();
  await page.keyboard.press("Enter");
  const salah = { pressed: await w.locator(".tb-pilihan button").first().getAttribute("aria-pressed"), aktif: await w.locator(".tb-pilihan button:not(:disabled)").count(), fokus: await fokusTeks(page), status: await status() };
  lapor(salah.pressed === "true" && salah.aktif === 0 && salah.fokus === L.ulang && salah.status.includes(L.belum),
    `cache ${nama}: tebakan salah: aria-pressed ${salah.pressed}, ${salah.aktif} pilihan aktif, fokus di "${salah.fokus}", hasil "${salah.status.split("\n")[0]}"`);
  const satuSalah = await statusSatuKalimat(w);
  lapor(satuSalah.n === 2 && satuSalah.maks <= 1 && satuSalah.tombol === 0 && !satuSalah.alasan,
    `cache ${nama}: sesudah tebakan salah ${satuSalah.n} role=status, paling banyak ${satuSalah.maks} kalimat, ${satuSalah.tombol} berisi tombol, alasan tebakan di dalam status ${satuSalah.alasan}`);
  await page.keyboard.press("Enter");
  const ulang = { fokus: await fokusTeks(page), ubah: await w.locator(".ch-ubah").count(), aktif: await w.locator(".tb-pilihan button:not(:disabled)").count() };
  const norm = (t) => t.replace(/^A\s*/, "").replace(/\s+/g, " ").trim();
  lapor(norm(ulang.fokus) === norm(await w.locator(".tb-pilihan button").first().innerText()) && ulang.ubah === 0 && ulang.aktif === 4,
    `cache ${nama}: Coba pilihan lain: fokus di "${ulang.fokus.slice(0, 30)}", panel Ubah ${ulang.ubah}, ${ulang.aktif} pilihan aktif`);

  // Tebakan salah kedua (60 detik, TTL Redis): alasan menyebut TTL Redis; yang benar ikut tampil.
  const b60 = w.locator(".tb-pilih", { hasText: `Sekitar detik ke-${TTL_R}.` });
  await b60.focus();
  await page.keyboard.press("Space");
  const alasan60 = await w.locator(".tb-hasil").innerText();
  lapor(alasan60.includes(`${TTL_R} detik adalah TTL cache Redis`) && alasan60.includes(`C. Entri di instance B habis sendiri`) && alasan60.includes(`detik ke-${LAMA_D}`) && alasan60.includes(`detik ke-${BARU_D}`),
    `cache ${nama}: tebakan ${TTL_R} detik lewat Spasi menyebut TTL Redis dan alasan yang benar: "${alasan60.replace(/\s+/g, " ").slice(0, 120)}"`);
  await w.getByRole("button", { name: L.ulang }).click();

  // Tebakan benar lewat Enter: fokus ke tombol pertama Ubah satu hal.
  const benar = w.locator(".tb-pilih", { hasText: `Sekitar detik ke-${BARU_D}` });
  await benar.focus();
  await page.keyboard.press("Enter");
  const tepat = { pressed: await benar.getAttribute("aria-pressed"), fokus: await fokusTeks(page), ubah: await w.locator(".ch-ubah").count(), status: await status() };
  lapor(tepat.pressed === "true" && tepat.fokus === NOL.cache && tepat.ubah === 1 && tepat.status.includes(L.benar),
    `cache ${nama}: tebakan benar: aria-pressed ${tepat.pressed}, fokus di "${tepat.fokus}" (tombol pertama Ubah), hasil "${tepat.status.split("\n")[0]}"`);

  const satuBenar = await statusSatuKalimat(w);
  lapor(satuBenar.n === 2 && satuBenar.maks <= 1 && satuBenar.tombol === 0 && !satuBenar.alasan,
    `cache ${nama}: sesudah tebakan benar ${satuBenar.n} role=status, paling banyak ${satuBenar.maks} kalimat, ${satuBenar.tombol} berisi tombol, alasan tebakan di dalam status ${satuBenar.alasan}`);

  // Slider jam: awal di detik ke-LAMA_D; panah, Home, End; kalimat penuh tidak berubah; aria-valuetext mengikuti.
  const slider = w.locator(".ch-jam input");
  const kalimat0 = (await w.locator(".ch-vonis").innerText()).trim();
  const maks = await slider.getAttribute("max");
  const mulai = { nilai: await slider.inputValue(), teks: await slider.getAttribute("aria-valuetext") };
  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  const kiri = { nilai: await slider.inputValue(), teks: await slider.getAttribute("aria-valuetext") };
  await page.keyboard.press("Home");
  const awal0 = { nilai: await slider.inputValue(), teks: await slider.getAttribute("aria-valuetext"), tiles: await tiles(w) };
  await page.keyboard.press("End");
  const akhir = { nilai: await slider.inputValue(), tiles: await tiles(w) };
  const kalimat1 = (await w.locator(".ch-vonis").innerText()).trim();
  lapor(maks === String(HORIZON) && mulai.nilai === String(LAMA_D) && mulai.teks === `Detik ke-${LAMA_D}: 1 dari 2 instance melihat harga lama`
    && kiri.nilai === String(LAMA_D - 1) && kiri.teks.startsWith(`Detik ke-${LAMA_D - 1}:`) && awal0.nilai === "0" && awal0.tiles[1][1] === true
    && akhir.nilai === String(HORIZON) && akhir.tiles.every((t) => t[1] === false) && kalimat0 === kalimat1 && !/\.\s/.test(kalimat0),
    `cache ${nama}: slider awal ${mulai.nilai} (max ${maks}), ArrowLeft ${kiri.nilai}, Home ${awal0.nilai} (B stale), End ${akhir.nilai} (tidak ada yang stale); kalimat penuh tetap satu kalimat: "${kalimat1.slice(0, 60)}"`);

  // Tombol lompat: detik ke-299 dan ke-300; sesudah TTL diganti, tombol mengikuti TTL.
  await w.getByRole("button", { name: kal(L.jam.lompatSebelum, { x: TTL_M - 1 }), exact: true }).click();
  const lompat1 = { nilai: await slider.inputValue(), b: (await tiles(w))[1], fokus: await fokusTeks(page) };
  await w.getByRole("button", { name: kal(L.jam.lompatSaat, { x: TTL_M }), exact: true }).click();
  const lompat2 = { nilai: await slider.inputValue(), b: (await tiles(w))[1] };
  lapor(lompat1.nilai === String(TTL_M - 1) && lompat1.b[1] === true && lompat1.b[0] === isi(A0, S0) && lompat2.nilai === String(TTL_M) && lompat2.b[1] === false && lompat2.b[0] === isi(PROMO, S0) && lompat1.fokus.startsWith("Lompat ke detik ke-"),
    `cache ${nama}: tombol lompat: detik ${lompat1.nilai} instance B ${lompat1.b[0]} ${lompat1.b[2]}; detik ${lompat2.nilai} instance B ${lompat2.b[0]} ${lompat2.b[2]}; fokus tetap di tombol`);
  await tombol(w, "ttl", String(TTL_R)).click();
  const ttl60 = await w.locator(".ch-lompat button").allInnerTexts();
  lapor(ttl60[0] === kal(L.jam.lompatSebelum, { x: TTL_R - 1 }) && ttl60[1] === kal(L.jam.lompatSaat, { x: TTL_R }),
    `cache ${nama}: tombol lompat memakai TTL ${TTL_R}: "${ttl60.join('" / "')}"`);
  await tombol(w, "ttl", String(TTL_M)).click();

  // Tombol pengaturan lewat Enter dan Spasi; aria-pressed tepat satu per kelompok, fokus tetap.
  const redis = tombol(w, "cache", LBL.cache.redis);
  await redis.focus();
  await page.keyboard.press("Enter");
  const p1 = { redis: await redis.getAttribute("aria-pressed"), memori: await tombol(w, "cache", LBL.cache.memori).getAttribute("aria-pressed"), fokus: await fokusTeks(page), jumlah: await grup(w, "cache").locator('[aria-pressed="true"]').count() };
  await tombol(w, "instance", "3").focus();
  await page.keyboard.press(" ");
  const p2 = { tiga: await tombol(w, "instance", "3").getAttribute("aria-pressed"), dua: await tombol(w, "instance", "2").getAttribute("aria-pressed"), kotak: await w.locator(".ch-kotak").count() };
  const tekan = await Promise.all(["cache", "instance", "ttl", "kejadian", "urutan"].map((k) => grup(w, k).locator('[aria-pressed="true"]').count()));
  lapor(p1.redis === "true" && p1.memori === "false" && p1.fokus === LBL.cache.redis && p1.jumlah === 1 && p2.tiga === "true" && p2.dua === "false" && p2.kotak === 3 && tekan.every((n) => n === 1),
    `cache ${nama}: Enter dan Spasi memilih pengaturan; aria-pressed satu per kelompok [${tekan}], fokus tetap di "${p1.fokus}", ${p2.kotak} kotak instance`);

  // Kembali ke pengaturan awal: semua kembali, jam kembali, fokus ke tombol pertama.
  await w.getByRole("button", { name: L.awal }).click();
  const kembali = { fokus: await fokusTeks(page), vonis: (await w.locator(".ch-vonis").innerText()).trim(), jam: await slider.inputValue(), pressed: await w.locator(".ch-tombol[aria-pressed='true']").evaluateAll((b) => b.map((x) => x.textContent.trim())) };
  lapor(kembali.fokus === NOL.cache && kembali.vonis.startsWith("Instance B tidak diberi tahu") && kembali.jam === String(LAMA_D) && kembali.pressed.join("|") === [NOL.cache, NOL.instance, NOL.ttl, NOL.kejadian, NOL.urutan].join("|"),
    `cache ${nama}: Kembali ke pengaturan awal: fokus "${kembali.fokus}", jam ${kembali.jam}, ${kembali.pressed.join(", ")}`);

  await page.waitForFunction(() => document.getAnimations().length === 0);
  const anim = await page.evaluate(() => document.getAnimations().length);
  lapor(animasiAwal === 0 && anim === 0 && error.length === 0, `cache ${nama}: ${animasiAwal} animasi saat dimuat, ${anim} sesudah semua interaksi, ${error.length} error konsol${error.length ? ": " + error.join(" | ") : ""}`);
  await ctx.close();
}

// 2. Angka dari rekaman dan aturan: lima kasus per muatan halaman (batas waktu per halaman, keputusan 360), 1366, reduced motion.
for (let dari = 0; dari < KASUS.length; dari += 5) {
  const { ctx, page } = await buka([1366, 657], { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  const slider = w.locator(".ch-jam input");
  for (const k of KASUS.slice(dari, dari + 5)) {
    await w.getByRole("button", { name: L.awal }).click();
    await setel(w, k.cfg);
    const ttl = k.cfg.ttl ?? TTL_M;
    const apa = k.apa ?? "harga";
    const Apa = apa === "stok" ? "Stok" : "Harga";
    const vonis = (await w.locator(".ch-vonis").innerText()).trim();
    const vonisHarap = kal(L.vonis[k.sebab], { x: "B", lama: k.lama, apa, Apa });
    const acuan = rapi(await w.locator(".ch-acuan").innerText());
    const catatan = rapi((await w.locator(".ch-catatan").allInnerTexts()).join(" "));
    const hitung = rapi(await w.locator(".ch-hitung").innerText());
    const kelas = await w.locator(".ch-vonis").getAttribute("class");
    (k.lama > 0 ? warna.staleVonis : warna.benarVonis).add(await w.locator(".ch-vonis").evaluate((e) => getComputedStyle(e).borderLeftColor));
    let ok = vonis === vonisHarap || (k.n === 1 && vonis === kal(L.vonis[k.sebab], { x: "A", lama: k.lama, apa, Apa }));
    ok &&= k.acuan === null ? acuan.startsWith(L.tanpaAcuan.slice(0, 30)) && !acuan.includes(L.cocok) : acuan.startsWith(L.cocok) && acuan.includes(k.acuan);
    ok &&= kelas.includes(k.lama > 0 ? "is-stale" : "is-benar");
    if (k.catatan) ok &&= catatan.includes(k.catatan);
    ok &&= catatan.includes(`Citra ditagih ${rp(PROMO)} walau layarnya menunjukkan ${rp(A0)}`);
    // Hitungan: lama, instance yang stale, baca database, beban tanpa cache.
    const kodeB = k.n === 1 ? "A" : "B";
    ok &&= hitung.includes(k.lama > 0 ? `Lama data lama bertahan di instance ${kodeB}: TTL − detik stale mulai = ${ttl} − ${k.dari} = ${k.lama} detik.` : `Lama data lama bertahan di instance ${kodeB}: 0 detik.`);
    ok &&= hitung.includes(`Instance yang pernah melihat data lama: ${k.basi} dari ${k.n}.`);
    ok &&= hitung.includes(`Baca database untuk mengisi satu kunci yang sama: ${k.baca}`);
    ok &&= hitung.includes(`L = λ × W = ${BEBAN[2]} × ${BEBAN[3]} = ${BEBAN[4]} koneksi dari pool 10. Asumsi: ${BEBAN[2]} bacaan per detik dan W = ${BEBAN[1]} ms.`);
    ok &&= hitung.includes("detik ke-0, tepat sebelum perubahan");
    // Kotak tiap instance pada detik yang dipilih (slider diisi langsung; jam bulat).
    const rincian = [];
    for (const [jam, harap] of Object.entries(k.tiles)) {
      await slider.fill(String(jam));
      const t = await tiles(w);
      const database = rapi(await w.locator(".ch-db").innerText());
      const tileOk = t.length === k.n && harap.every((h, i) => t[i][0] === h[0] && t[i][1] === h[1] && t[i][2] === (h[1] ? L.papan.stale : L.papan.benar)) && t.every((x, i) => x[3] === L.instance[i]);
      ok &&= tileOk && database.startsWith("Database: Rp");
      for (const x of t) (x[1] ? warna.staleKotak : warna.benarKotak).add(x[4]);
      const nilaiJam = await slider.getAttribute("aria-valuetext");
      const basiJam = harap.filter((h) => h[1]).length;
      ok &&= nilaiJam === kal(L.jam.nilai, { x: jam, stale: basiJam, n: k.n, apa });
      rincian.push(`${jam}:${t.map((x) => (x[1] ? "stale" : "benar")).join("/")}`);
    }
    // Garis waktu: bagian stale mulai di dari ÷ 330 selebar lama ÷ 330; tanpa stale hanya satu bagian benar; penanda di jam.
    await slider.fill(String(TTL_M - 1));
    const geo = await w.evaluate((e) => {
      const g = e.querySelector(".ch-garis");
      const lebar = g.clientWidth;
      const kiri = g.getBoundingClientRect().left + g.clientLeft;
      const seg = [...g.querySelectorAll(".ch-seg")].map((s) => { const r = s.getBoundingClientRect(); return { stale: s.classList.contains("is-stale"), x: (r.left - kiri) / lebar, lebar: r.width / lebar }; });
      const kursor = g.querySelector(".ch-kursor").getBoundingClientRect();
      return { seg, kursor: (kursor.left + kursor.width / 2 - kiri) / lebar, jumlahSeg: seg.length, hidden: g.getAttribute("aria-hidden"), tinggi: g.getBoundingClientRect().height, tinggiSeg: Math.min(...[...g.querySelectorAll(".ch-seg")].map((s) => s.getBoundingClientRect().height)), tinggiKursor: kursor.height };
    });
    const stale = geo.seg.filter((s) => s.stale);
    const jumlahLebar = geo.seg.reduce((n, s) => n + s.lebar, 0);
    let geoOk = geo.hidden === "true" && geo.tinggi >= 12 && geo.tinggiSeg >= 8 && geo.tinggiKursor >= 8 && Math.abs(geo.kursor - (TTL_M - 1) / HORIZON) <= 0.005 && Math.abs(jumlahLebar - 1) <= 0.01;
    if (k.lama > 0) geoOk &&= stale.length === 1 && Math.abs(stale[0].x - k.dari / HORIZON) <= 0.0035 && Math.abs(stale[0].lebar - k.lama / HORIZON) <= 0.0035;
    else geoOk &&= stale.length === 0 && geo.seg.length === 1 && Math.abs(geo.seg[0].lebar - 1) <= 0.01;
    if (!geoOk) console.log(`   geometri ${k.nama}: ${JSON.stringify(geo)}; harap stale ${k.dari ?? "-"}+${k.lama} dari ${HORIZON}`);
    ok &&= geoOk;
    lapor(ok, `cache angka ${k.nama}: "${vonis.slice(0, 80)}"; acuan ${k.acuan ?? "-"}; lama ${k.lama}; kotak ${rincian.join(" ")}; garis stale ${stale.map((s) => `${(s.x * HORIZON).toFixed(0)}+${(s.lebar * HORIZON).toFixed(0)}`).join(",") || "-"}`);
  }
  await ctx.close();
}

{
  const beda = (a, b) => a.size > 0 && b.size > 0 && ![...a].some((x) => b.has(x));
  lapor(beda(warna.staleKotak, warna.benarKotak) && beda(warna.staleVonis, warna.benarVonis),
    `cache warna: kotak stale ${[...warna.staleKotak].join(" ; ")} lawan benar ${[...warna.benarKotak].join(" ; ")}; kalimat penuh stale ${[...warna.staleVonis].join(" ; ")} lawan benar ${[...warna.benarVonis].join(" ; ")}`);
}

// 3. Pengaturan yang tidak boleh sama diam-diam: banding awal, hasil, dan nama kode tidak diterjemahkan, kontras, axe.
{
  const { ctx, page } = await buka([1366, 657], { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  // Warna mengikuti token: stale = peringatan, benar = baik, di kotak instance, garis waktu, dan kalimat penuh; kedua tema.
  for (const tema of ["dark", "light"]) {
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, tema);
    const ambilWarna = () => page.evaluate(() => {
      const tok = (n, prop) => { const d = document.createElement("div"); d.style[prop] = `var(${n})`; document.body.appendChild(d); const v = getComputedStyle(d)[prop]; d.remove(); return v; };
      const e = document.querySelector("[data-cache-invalidation]");
      const kotak = [...e.querySelectorAll(".ch-kotak")].map((k) => { const c = getComputedStyle(k); return { stale: k.classList.contains("is-stale"), edge: c.borderTopColor, fill: c.backgroundColor }; });
      const seg = [...e.querySelectorAll(".ch-seg")].map((x) => ({ stale: x.classList.contains("is-stale"), bg: getComputedStyle(x).backgroundColor }));
      return {
        warnEdge: tok("--k-warn-edge", "borderTopColor"), warnFill: tok("--k-warn-fill", "backgroundColor"), goodEdge: tok("--k-good-edge", "borderTopColor"), goodFill: tok("--k-good-fill", "backgroundColor"),
        kotak, seg, vonis: getComputedStyle(e.querySelector(".ch-vonis")).borderLeftColor, vonisStale: e.querySelector(".ch-vonis").classList.contains("is-stale"),
      };
    });
    const sesuai = (c) => c.kotak.every((k) => (k.stale ? k.edge === c.warnEdge && k.fill === c.warnFill : k.edge === c.goodEdge && k.fill === c.goodFill))
      && c.seg.every((x) => x.bg === (x.stale ? c.warnEdge : c.goodEdge)) && c.vonis === (c.vonisStale ? c.warnEdge : c.goodEdge);
    const stale = await ambilWarna();
    await tombol(w, "cache", LBL.cache.redis).click();
    const benarSemua = await ambilWarna();
    await tombol(w, "cache", LBL.cache.memori).click();
    lapor(sesuai(stale) && sesuai(benarSemua) && stale.kotak.some((k) => k.stale) && stale.kotak.some((k) => !k.stale) && stale.seg.some((x) => x.stale) && stale.vonisStale && !benarSemua.vonisStale && benarSemua.kotak.every((k) => !k.stale),
      `cache warna token ${tema}: stale kotak ${stale.kotak.map((k) => (k.stale ? "peringatan" : "baik")).join("/")}, garis ${stale.seg.map((x) => (x.stale ? "peringatan" : "baik")).join("/")}, kalimat penuh ${stale.vonisStale ? "peringatan" : "baik"}; sesudah Redis kalimat penuh ${benarSemua.vonisStale ? "peringatan" : "baik"}`);
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  const banding0 = rapi(await w.locator(".ch-banding").innerText());
  await tombol(w, "cache", LBL.cache.redis).click();
  const banding1 = rapi(await w.locator(".ch-banding").innerText());
  lapor(banding0 === L.banding.sama && banding1 === `Awal: instance B melihat harga lama selama ${TTL_M} detik. Sekarang: instance B tidak melihat harga lama.`,
    `cache banding: awal "${banding0}"; sesudah Redis "${banding1}"`);
  const kode = await w.locator("code").evaluateAll((c) => ({ n: c.length, salah: c.filter((x) => x.getAttribute("translate") !== "no").length }));
  lapor(kode.n >= 2 && kode.salah === 0, `cache kode: ${kode.n} elemen code, ${kode.salah} tanpa translate="no"`);
  const sembunyi = await w.evaluate((e) => e.querySelector(".ch-garis").getAttribute("aria-hidden"));
  lapor(sembunyi === "true", `cache garis waktu aria-hidden ${sembunyi}; isinya ada sebagai teks di kotak instance dan hitungan`);
  // Satu kalimat role=status mengikuti pengaturan, tidak mengikuti jam.
  await tombol(w, "cache", LBL.cache.redis).click();
  const v1 = (await w.locator(".ch-vonis").innerText()).trim();
  await w.locator(".ch-jam input").fill("100");
  const v2 = (await w.locator(".ch-vonis").innerText()).trim();
  lapor(v1 === v2 && v1 === L.vonis["dihapus-bersama"].replace("{apa}", "harga"), `cache vonis tidak berubah saat jam bergeser: "${v1.slice(0, 70)}"`);

  // Kontras teks di kedua tema, dan axe pada keadaan sesudah menebak dengan catatan terpanjang terbuka.
  await setel(w, { cache: "redis-mati", instance: 3, ttl: TTL_R, kejadian: "harga" });
  const kontras = await page.evaluate(() => {
    const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const campur = (atas, bawah, a) => atas.slice(0, 3).map((v, k) => v * a + bawah[k] * (1 - a));
    const latar = (el) => { const lapis = []; for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c && c[3] > 0) { lapis.push(c); if (c[3] === 1) break; } } let h = [255, 255, 255]; for (const c of lapis.reverse()) h = campur(c, h, c[3]); return h; };
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const rasio = (el) => { let op = 1; for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity); const bg = latar(el), fg = rgba(getComputedStyle(el).color); const t = campur(fg, bg, fg[3] * op); const [a, b] = [lum(t), lum(bg)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); };
    const w = document.querySelector("[data-cache-invalidation]");
    const teks = [...w.querySelectorAll("*")].filter((e) => !e.closest(".bb-sr") && !e.closest("[aria-hidden='true']") && !e.closest(":disabled") && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const hasil = {};
    const awal = document.documentElement.dataset.theme;
    for (const t of ["dark", "light"]) { document.documentElement.dataset.theme = t; hasil[t] = Math.min(...teks.map(rasio)); }
    document.documentElement.dataset.theme = awal;
    return { ...hasil, n: teks.length };
  });
  lapor(kontras.dark >= 4.5 && kontras.light >= 4.5 && kontras.n > 60, `cache kontras ${kontras.n} teks: gelap ${kontras.dark.toFixed(2)}:1, terang ${kontras.light.toFixed(2)}:1`);
  // Kotak stale dan benar di kedua tema juga diukur: satu kotak dengan tiap keadaan.
  await page.addScriptTag({ path: AXE_PATH });
  for (const tema of ["dark", "light"]) {
    const v = await page.evaluate(async ([tema, tag]) => {
      document.documentElement.dataset.theme = tema;
      const r = await window.axe.run(document.querySelector("[data-cache-invalidation]"), { runOnly: { type: "tag", values: tag }, resultTypes: ["violations"] });
      return r.violations.map((x) => `${x.id} (${x.nodes.length})`);
    }, [tema, TAG_WCAG]);
    lapor(v.length === 0, `cache axe sesudah menebak ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
  }
  await ctx.close();
}

// 4. Luapan dan target: 320 dan 375 px sesudah menebak dengan catatan terpanjang; tanpa JS tabel acuan di 320 px.
for (const lebar of [320, 375]) {
  const { ctx, page } = await buka([lebar, 640], { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  await setel(w, { cache: "redis-mati", instance: 3, ttl: TTL_M, kejadian: "harga" });
  const ukur = await page.evaluate(() => {
    const w = document.querySelector("[data-cache-invalidation]");
    const r = w.getBoundingClientRect();
    const luar = [...w.querySelectorAll("button, input, .bb-chip, table, .ch-garis, .ch-kotak")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > r.right + 0.5 || b.left < r.left - 0.5); }).map((e) => e.className || e.tagName);
    const kecil = [...w.querySelectorAll("button, input")].filter((e) => { const b = e.getBoundingClientRect(); return b.height < 24 || b.width < 24; }).map((e) => e.textContent.trim() || e.type);
    const chip = [...w.querySelectorAll(".bb-chip")].map((c) => ({ t: c.textContent.trim().slice(0, 20), sw: c.scrollWidth <= c.clientWidth + 1, baris: Math.round(c.getBoundingClientRect().height / parseFloat(getComputedStyle(c).lineHeight || "20")) }));
    return { halaman: document.documentElement.scrollWidth - innerWidth, widget: w.scrollWidth - w.clientWidth, luar, kecil, chip };
  });
  lapor(ukur.halaman <= 0 && ukur.widget <= 0 && ukur.luar.length === 0 && ukur.kecil.length === 0 && ukur.chip.every((c) => c.sw && c.baris <= 3),
    `cache luapan ${lebar}px: halaman +${ukur.halaman}, widget +${ukur.widget}, di luar widget [${ukur.luar}], target < 24 px [${ukur.kecil}], chip ${JSON.stringify(ukur.chip)}`);
  await ctx.close();
}
{
  const { ctx, page } = await buka([320, 640], { javaScriptEnabled: false });
  const t = await page.evaluate(() => {
    const tb = document.querySelector("table.tm-tabel") ?? [...document.querySelectorAll("table")].find((x) => x.querySelector("caption")?.textContent.includes("Titik acuan"));
    if (!tb) return null;
    const c = tb.closest(".sl-markdown-content").getBoundingClientRect();
    const sel = [...tb.querySelectorAll("tbody tr")].map((r) => [...r.children].map((x) => x.innerText.replace(/\s+/g, " ").trim()));
    return { baris: sel.length, sel, lebih: Math.max(0, Math.round(tb.getBoundingClientRect().right - c.right)), halaman: document.documentElement.scrollWidth - innerWidth, judul: tb.querySelector("caption").innerText };
  });
  const lama = (r) => r[1];
  const harapTabel = t && t.baris === 9 && t.sel.filter((r) => lama(r) === `${TTL_M} detik`).length === 2 && t.sel.filter((r) => lama(r) === `${TTL_R} detik`).length === 3
    && t.sel.filter((r) => lama(r) === `${TTL_G - MULAI} detik`).length === 1 && t.sel.filter((r) => lama(r) === L.tabel.tidakAda).length === 3
    && t.sel.every((r) => r.length === 3 && r[2].includes(".txt"));
  lapor(t !== null && harapTabel && t.lebih <= 0 && t.halaman <= 0, `cache tanpa JavaScript 320px: ${t ? `${t.baris} baris acuan, lama ${t.sel.map(lama).join(" | ")}, tabel melebihi wadah ${t.lebih} px, halaman +${t.halaman}` : "tabel tidak ada"}`);
  await ctx.close();
}

// 5. CLS: HTML dari build sebelum hydrate (skrip island diblokir, noscript tetap tersembunyi) lawan sesudah hydrate.
for (const ukuran of [[375, 667], [1366, 657]]) {
  const ukur = (page) => page.evaluate(() => {
    const w = document.querySelector("[data-cache-invalidation]");
    let p = w.closest("astro-island").nextElementSibling;
    while (p && p.tagName === "NOSCRIPT") p = p.nextElementSibling;
    return { tinggi: w.getBoundingClientRect().height, sesudah: p.getBoundingClientRect().top + scrollY };
  });
  const [w, h] = ukuran;
  const ctxA = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await ctxA.route(/\/_astro\/(CacheInvalidation|client|react)[^/]*\.js$/, (r) => r.abort());
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
  lapor(belumHydrate && geser <= 1, `cache CLS ${ukuran.join("x")}: tinggi sebelum hydrate ${statis.tinggi.toFixed(1)} px, sesudah ${hidup.tinggi.toFixed(1)} px, isi sesudahnya geser ${geser.toFixed(1)} px (belum hydrate ${belumHydrate})`);
}

// 6. Ukuran JS halaman uji (byte jaringan saat dimuat dan digulir sampai bawah, gzip per respons).
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 657 } });
  const page = await ctx.newPage();
  const isiJs = [];
  page.on("response", (r) => { if (/\.js(\?.*)?$/.test(r.url()) && r.ok()) isiJs.push(r.body().catch(() => Buffer.alloc(0))); });
  await page.goto(BASE + HAL, { waitUntil: "networkidle" });
  await page.evaluate(async () => { for (let i = 0; i < 50 && scrollY + innerHeight < document.documentElement.scrollHeight - 2; i++) { scrollBy(0, 600); await new Promise((s) => setTimeout(s, 30)); } });
  await page.waitForLoadState("networkidle");
  const b = await Promise.all(isiJs);
  const flow = b.some((x) => x.includes("react-flow__pane"));
  const zod = b.some((x) => x.includes("ZodError") || x.includes("invalid_type"));
  const rekaman = b.some((x) => x.includes("rekaman t3-cache"));
  lapor(!flow, `cache ${HAL} tidak memuat React Flow`);
  lapor(!zod && !rekaman, `cache ${HAL} tidak memuat Zod maupun pembaca rekaman (rekaman dan teks divalidasi saat build)`);
  console.log(`info JS ${HAL}: ${b.length} file, ${(b.reduce((n, x) => n + x.length, 0) / 1024).toFixed(1)} KB tanpa kompresi, ${(b.reduce((n, x) => n + gzipSync(x).length, 0) / 1024).toFixed(1)} KB gzip`);
  await ctx.close();
}

await browser.close();
console.log(gagal ? `Widget cache GAGAL (${gagal})` : "Widget cache: tebak dulu, keyboard, angka dari rekaman, kontras, axe, luapan, CLS lolos");
process.exit(gagal ? 1 : 0);
