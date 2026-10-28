// Memeriksa widget webhook masuk langkah demi langkah (W4-webhook, keputusan 1258) di halaman uji /uji/webhook/:
// - tebak dulu: sebelum menebak tidak ada bilah dan langkah, status kosong; Tab mencapai tombol dalam urutan DOM dengan fokus
//   terlihat; Enter memilih jawaban (aria-pressed, pilihan lain nonaktif), status satu kalimat, fokus pindah ke pilihan versi;
//   jawaban salah menampilkan "Coba pilihan lain" dan fokus kembali ke pilihan;
// - langkah: delapan langkah, tombol "Langkah berikutnya" memindahkan langkah aktif (aria-current, status satu kalimat, fokus di
//   langkah tujuan, bilah lengket tetap di bawah header dan tidak menutup langkah); gulir menentukan langkah aktif dan stabil;
// - angka dari rekaman: teks tiap langkah dan versi memuat angka dan status yang dibaca ulang di sini dengan cara sendiri dari
//   labs/t4-webhook/output dan labs/api-t4/output/rentan.txt; chip Rekaman lab, Hitungan, Asumsi, Ilustrasi, atau Tidak dijalankan sesuai;
// - versi handler: aria-pressed pindah, isi langkah berganti, langkah aktif dan fokus tetap;
// - gerak: 0 animasi saat dimuat; dengan reduced motion 0 animasi dan fungsi sama; pindah langkah dan ganti versi tidak bergerak;
// - tata letak: 320 (juga dengan font Verdana yang lebih lebar), 375, 1366 px tanpa gulir ke samping, target >= 24 px;
// - kontras teks >= 4,5:1 gelap dan terang; axe-core (WCAG A/AA sampai 2.2);
// - tanpa JS: island disembunyikan, <noscript> memuat tabel semua langkah dan versi tanpa gulir ke samping; CLS tinggi widget <= 1 px;
// - ukuran JS /uji/webhook/ dicetak (baris "info") dan React Flow tidak dimuat.
//   node tools/ukur-webhook.mjs --url http://127.0.0.1:4321
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
const HAL = "/uji/webhook/";
const baca = (lab, f) => readFileSync(new URL(`../../labs/${lab}/output/${f}.txt`, import.meta.url), "utf8");
const L = JSON.parse(readFileSync(new URL("../data/widget/t4-webhook-langkah.json", import.meta.url), "utf8"));
const R = { ganda: baca("t4-webhook", "ganda"), retry: baca("t4-webhook", "retry"), urutan: baca("t4-webhook", "urutan"), rekon: baca("t4-webhook", "rekon"), rentan: baca("api-t4", "rentan") };
const ambil = (teks, pola, nama) => {
  const m = teks.match(pola);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m[1];
};

// Angka rekaman, dibaca dengan pola sendiri (bukan rekaman.ts).
const gandaA = R.ganda.slice(R.ganda.indexOf("# --- A."), R.ganda.indexOf("# --- B."));
const rekonA = R.rekon.slice(R.rekon.indexOf("# --- A."), R.rekon.indexOf("# --- B."));
const rekonB = R.rekon.slice(R.rekon.indexOf("# --- B."), R.rekon.indexOf("# --- C."));
const retryB = R.retry.slice(R.retry.indexOf("# --- B."), R.retry.indexOf("# --- C."));
const f1 = R.urutan.slice(R.urutan.indexOf("# --- F1."), R.urutan.indexOf("# --- F2."));
const REK = {
  bayar: ambil(R.ganda, /Satu pembayaran (Rp[\d.]+),/, "bayar"),
  naik: ambil(R.ganda, /saldo Budi naik (Rp[\d.]+)\./, "naik"),
  jurnalA: new Set([...gandaA.matchAll(/^ (\d{5}) +\|/gm)].map((m) => m[1])).size,
  kirim2B: ambil(R.ganda, /kiriman 2 \(event yang sama\): (.+)\n/, "kiriman 2"),
  jawabF1: ambil(f1, /kabar pending sesudah settlement: (.+)\n/, "F1"),
  menit: ambil(R.retry, /^ 401 +\| \d+ +\| ([\d, ]+?) +\|/m, "menit 401"),
  total: ambil(R.retry, /\(total (\d+) menit\)/, "total"),
  uang: ambil(retryB, /Uang (Rp[\d.]+) sudah di bank/, "uang"),
  umur1: ambil(rekonA, /interval '(\d+) minutes'/, "umur"),
  diperiksa: ambil(rekonA.slice(rekonA.indexOf("31 minutes")), /cek top-up: diperiksa (\d+),/, "diperiksa"),
  baris: ambil(rekonB, /<tanggal>: (\d+) baris/, "baris"),
  ledger: ambil(rekonB, /tidak_di_ledger (\d+),/, "ledger"),
  koreksi: ambil(rekonB, /dikoreksi lewat jurnal (\d+),/, "koreksi"),
};
const BENAR = 2; // jawaban tebakan: jumlah jurnal versi pertama = REK.jurnalA, pilihan ketiga (0, 1, 2 jurnal)
if (REK.jurnalA !== 2) throw new Error("ukur: jurnal versi pertama di rekaman bukan 2, jawaban tebakan harus ditinjau");
const ADR = JSON.parse(readFileSync(new URL("../data/cerita.json", import.meta.url), "utf8")).halaman.find((h) => h.id === "t4-webhook").adr[0];

// Yang harus tampil di tiap langkah dan versi, dan chip sumbernya (urut).
const HARAP = {
  buat: { pertama: [[REK.bayar, "0 baris; handler ini tidak menulisnya", "0 jurnal"], ["Ilustrasi"]], adr34: [[REK.bayar, "0 baris", "0 jurnal"], ["Ilustrasi"]] },
  kabar1: {
    pertama: [["Kiriman pertama: settlement evt-1", "Menjurnal dari isi kabar", "1 jurnal: bank −Rp200.000, karyawan +Rp200.000"], ["Rekaman lab"]],
    adr34: [["koneksi diputus sesudah balasan mulai datang", "COMMIT dulu, baru membalas", "1 baris: evt-1, settlement, diproses"], ["Rekaman lab"]],
  },
  ulang: {
    pertama: [[`Membalas 200 diproses`, `${REK.jurnalA} jurnal; saldo Budi naik ${REK.naik} untuk ${REK.bayar} yang dibayar`, "jeda 2, 10, 30, 90, dan 210 menit", `total ${REK.total} menit`], ["Rekaman lab", "Ilustrasi"]],
    adr34: [[`Membalas ${REK.kirim2B}`, `1 jurnal, ${REK.bayar}`, "kiriman ulang tidak menambah baris"], ["Rekaman lab", "Ilustrasi"]],
  },
  terlambat: {
    pertama: [["menunggu, padahal top-up sudah dibayar", "tanpa memeriksa status sekarang"], ["Rekaman lab"]],
    adr34: [[`Membalas ${REK.jawabF1}`, "evt-f1 settlement diproses; evt-f2 pending diparkir", "dibayar, tidak mundur; gateway ditanya 0 kali"], ["Rekaman lab"]],
  },
  hilang: {
    pertama: [["Tidak mengirim kabar apa pun", "0 jurnal; uang sudah dibayar di bank"], ["Rekaman lab", "Tidak dijalankan"]],
    adr34: [[`6 kiriman pada menit ${REK.menit}; berhenti: jadwal habis`, "401 pada semua kiriman", `0 jurnal; ${REK.uang} sudah di bank`], ["Rekaman lab"]],
  },
  cek: { semua: [[`Umur ${REK.umur1} menit: diperiksa 0. Umur 31 menit: diperiksa ${REK.diperiksa}, dikredit 1`, "dibayar, dengan jurnal"], ["Rekaman lab", "Asumsi"]] },
  rekon: { semua: [[`${REK.baris} baris`, `tidak di ledger ${REK.ledger}, tidak di gateway 2, jumlah beda 1`, `${REK.koreksi} lewat jurnal baru, 1 selesai tanpa jurnal, 1 tetap terbuka`], ["Rekaman lab"]] },
  hasil: {
    pertama: [[`${REK.jurnalA} jurnal; saldo naik ${REK.naik}`, "Status mundur ke menunggu", "0 jurnal dari webhook, 1 dari jalan kedua"], ["Hitungan"]],
    adr34: [[`1 jurnal, ${REK.bayar}`, "Diparkir, status tetap dibayar", "0 jurnal dari webhook, 1 dari jalan kedua"], ["Hitungan"]],
  },
};
const IDS = L.langkah.map((l) => l.id);
const harap = (id, mode) => HARAP[id][mode] ?? HARAP[id].semua;
// Tanda tiap baris keadaan per langkah dan versi (langkah yang tidak tercantum: semua netral). Dipakai kelas warna, kata Aman dan Masalah,
// dan tabel <noscript>.
const TANDA = {
  ulang: { pertama: ["netral", "buruk", "buruk", "buruk"], adr34: ["netral", "baik", "baik", "baik"] },
  terlambat: { pertama: ["netral", "netral", "buruk"], adr34: ["netral", "baik", "netral", "baik"] },
  hilang: { pertama: ["netral", "netral", "buruk"], adr34: ["netral", "buruk", "buruk", "buruk"] },
  cek: { pertama: ["netral", "netral", "baik", "baik"], adr34: ["netral", "netral", "baik", "baik"] },
  rekon: { pertama: ["netral", "netral", "netral", "baik"], adr34: ["netral", "netral", "netral", "baik"] },
  hasil: { pertama: ["buruk", "buruk", "baik"], adr34: ["baik", "baik", "baik"] },
};

const browser = awasi(await chromium.launch(), { alat: "webhook" });
let gagal = 0;
const CEPAT = process.argv.includes("--cepat"); // berhenti di pemeriksaan pertama yang gagal (uji mutasi komponen)
const lapor = (ok, pesan) => {
  console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`);
  if (!ok) gagal++;
  if (!ok && CEPAT) process.exit(1);
};
const W = "[data-webhook-langkah]";

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
const tebakBenar = async (w) => { await w.locator(".tb-pilihan button").nth(BENAR).click(); };
const aktifNo = (w) => w.evaluate((el) => Number(el.dataset.aktif));
const kalimat = (t) => (t.trim().match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t.trim()].filter(Boolean)).length;
const teksItem = (w, id) => w.locator(`.wh-langkah__item[data-langkah="${id}"]`).innerText();
const chipItem = (w, id) => w.locator(`.wh-langkah__item[data-langkah="${id}"] .wh-sumber .bb-chip`).allInnerTexts();
const modeBtn = (w, teks) => w.locator(".wh-mode button", { hasText: teks });
const MODE_TEKS = { pertama: L.mode.pertama, adr34: L.mode.adr34.replace("{adrHandler}", String(ADR)) };

// 1. Tebak dulu, keyboard, gerak: 2 ukuran × 2 reduced motion.
for (const ukuran of [[375, 667], [1366, 657]]) for (const reducedMotion of ["no-preference", "reduce"]) {
  const nama = `${ukuran.join("x")} ${reducedMotion}`;
  const { ctx, page, error } = await buka(ukuran, { reducedMotion });
  const animasiAwal = await page.evaluate(() => document.getAnimations().length);
  await siap(page);
  const w = page.locator(W);
  const status = async () => (await w.locator(".wh-tebak").innerText()).trim();

  lapor((await w.locator(".wh-bilah").count()) === 0 && (await w.locator(".wh-langkah__item").count()) === 0 && (await status()) === "" && (await w.locator(".tb-pilihan button:not(:disabled)").count()) === 3,
    `webhook ${nama}: sebelum menebak tidak ada bilah dan langkah, status kosong, tiga pilihan aktif`);
  const teksSebelum = await w.innerText();
  const bocor = ["Kiriman ulang", "jadwal habis", "Rekonsiliasi harian", "diparkir", "401", "Ya.", "Tidak."].filter((x) => teksSebelum.includes(x));
  lapor(bocor.length === 0, `webhook ${nama}: sebelum menebak teks widget tidak memuat hasil (bocor: ${bocor.join(", ") || "tidak ada"})`);

  const tombol = await w.locator("button:not(:disabled)").evaluateAll((b) => b.map((x) => x.textContent.trim()));
  await w.locator(".tb-pilihan button").first().focus();
  const urut = [await fokusTeks(page)];
  const outline = [];
  for (let n = 1; n < tombol.length; n++) {
    await page.keyboard.press("Tab");
    urut.push(await fokusTeks(page));
    outline.push(await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2; }));
  }
  lapor(urut.join("|") === tombol.join("|") && outline.every(Boolean), `webhook ${nama}: Tab ${urut.length} tombol dalam urutan DOM, fokus terlihat di ${outline.filter(Boolean).length}/${outline.length}`);

  // Salah dulu: jawaban salah, lalu ulang.
  await w.locator(".tb-pilihan button").nth(0).click();
  const s2 = { status: await status(), ulang: await w.getByRole("button", { name: L.ulang }).count(), hasil: await w.locator(".tb-hasil").count() };
  // Langkah aktif dimajukan dulu: "Coba pilihan lain" harus mengembalikannya ke langkah 1 (bukan menyisakan langkah lama).
  await w.locator(`.wh-langkah__item[data-langkah="${IDS[0]}"]`).getByRole("button", { name: L.berikutnya }).click();
  const majuSalah = await aktifNo(w);
  await w.getByRole("button", { name: L.ulang }).click();
  const s3 = { status: await status(), aktif: await w.locator(".tb-pilihan button:not(:disabled)").count(), fokus: await page.evaluate(() => !!document.activeElement?.closest(".tb-pilihan")), bilah: await w.locator(".wh-bilah").count() };
  lapor(s2.status === L.belum && s2.ulang === 1 && s2.hasil === 1 && majuSalah === 2 && s3.status === "" && s3.aktif === 3 && s3.fokus && s3.bilah === 0,
    `webhook ${nama}: jawaban salah "${s2.status}", tombol "${L.ulang}" ${s2.ulang}, langkah aktif ${majuSalah} sebelum ulang, sesudah ulang status kosong, ${s3.aktif} pilihan aktif, fokus di pilihan ${s3.fokus}, bilah ${s3.bilah}`);

  // Benar lewat Enter.
  const pil = w.locator(".tb-pilihan button").nth(BENAR);
  await pil.focus();
  await page.keyboard.press("Enter");
  const t = { pressed: await pil.getAttribute("aria-pressed"), aktif: await w.locator(".tb-pilihan button:not(:disabled)").count(), status: await status(), fokus: await fokusTeks(page), grup: await page.evaluate(() => !!document.activeElement?.closest(".wh-ubah")) };
  lapor(t.pressed === "true" && t.aktif === 0 && t.status === L.benar && t.grup && t.fokus === MODE_TEKS.pertama,
    `webhook ${nama}: Enter memilih jawaban (aria-pressed ${t.pressed}), ${t.aktif} pilihan aktif, status "${t.status}", fokus di "${t.fokus}" dalam pilihan versi ${t.grup}`);
  lapor((await w.locator(".wh-langkah__item").count()) === 8 && (await aktifNo(w)) === 1, `webhook ${nama}: sesudah menebak 8 langkah dan langkah aktif 1`);

  // Panah dalam kelompok versi, Spasi mengubah versi, fokus tetap.
  await page.keyboard.press("ArrowRight");
  const geser = await fokusTeks(page);
  await page.keyboard.press("ArrowLeft");
  const kembali = await fokusTeks(page);
  await page.keyboard.press("End");
  const akhir = await fokusTeks(page);
  lapor(geser === MODE_TEKS.adr34 && kembali === MODE_TEKS.pertama && akhir === MODE_TEKS.adr34, `webhook ${nama}: panah kanan "${geser}", kiri "${kembali}", End "${akhir}"`);
  await page.waitForFunction(() => document.querySelector("[data-webhook-langkah]").getAnimations({ subtree: true }).length === 0);
  const gerak = () => page.evaluate(() => document.querySelector("[data-webhook-langkah]").getAnimations({ subtree: true }).length);
  await page.keyboard.press(" ");
  const baru = { pressed: await page.evaluate(() => document.activeElement.getAttribute("aria-pressed")), fokus: await fokusTeks(page), versi: await w.evaluate((el) => el.dataset.versi), anim: await gerak(), aktif: await aktifNo(w) };
  lapor(baru.pressed === "true" && baru.fokus === MODE_TEKS.adr34 && baru.versi === "adr34" && baru.anim === 0 && baru.aktif === 1,
    `webhook ${nama}: Spasi memilih "${baru.fokus}" (aria-pressed ${baru.pressed}), fokus tetap, versi ${baru.versi}, ${baru.anim} animasi, langkah aktif ${baru.aktif}`);
  lapor(animasiAwal === 0 && error.length === 0, `webhook ${nama}: ${animasiAwal} animasi saat dimuat, ${error.length} error konsol${error.length ? ": " + error.join(" | ") : ""}`);
  await ctx.close();
}

// 2. Gerak jawaban: bergerak tanpa reduced motion, tidak dengan reduced motion.
for (const reducedMotion of ["no-preference", "reduce"]) {
  const { ctx, page } = await buka([375, 667], { reducedMotion });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  const anim = await page.evaluate(() => document.querySelector("[data-webhook-langkah] .tb-hasil").getAnimations().length);
  lapor(reducedMotion === "reduce" ? anim === 0 : anim > 0, `webhook gerak ${reducedMotion}: ${anim} animasi pada jawaban tebakan`);
  await ctx.close();
}

// 3. Langkah lewat tombol: 375 dan 1366, versi pertama lalu ADR; angka dan chip dari rekaman; bilah lengket; fokus.
for (const ukuran of [[375, 667], [1366, 657]]) {
  const nama = ukuran.join("x");
  const { ctx, page } = await buka(ukuran, { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  // Nama aksesibel kelompok: widget, pilihan versi, dan keadaan tiap langkah (SC 4.1.2).
  const grup = async (nama) => page.getByRole("group", { name: nama, exact: true }).count();
  const nama1 = [await grup(L.judul), await grup(`${L.ubahJudul}: ${L.modeJudul}`), ...(await Promise.all(L.langkah.map((l) => grup(`${L.keadaanJudul}: ${l.judul}`))))];
  lapor(nama1.length === 10 && nama1.every((n) => n === 1), `webhook langkah ${nama}: kelompok widget, pilihan versi, dan keadaan delapan langkah masing-masing bernama (${nama1.join(",")})`);
  for (const mode of ["pertama", "adr34"]) {
    await modeBtn(w, MODE_TEKS[mode]).click();
    const salah = [];
    const tinggiBilah = [];
    for (let i = 0; i < IDS.length; i++) {
      const id = IDS[i];
      if (i > 0) await w.locator(`.wh-langkah__item[data-langkah="${IDS[i - 1]}"]`).getByRole("button", { name: L.berikutnya }).click();
      const [frasa, chip] = harap(id, mode);
      const teks = (await teksItem(w, id)).replace(/\s+/g, " ");
      const hilang = frasa.filter((f) => !teks.includes(f));
      const chips = await chipItem(w, id);
      const chipHarap = chip.map((c) => (c === "Tidak dijalankan" ? L.jenisChip.tidak : c));
      const st = (await w.locator(".wh-ringkas").innerText()).trim();
      const tepi = await page.evaluate((idx) => {
        const item = document.querySelectorAll(".wh-langkah__item")[idx];
        const bilah = document.querySelector(".wh-bilah").getBoundingClientRect();
        const r = item.getBoundingClientRect();
        const fokus = document.activeElement === item;
        const header = document.querySelector("header.header")?.getBoundingClientRect().bottom ?? 0;
        const lain = document.querySelectorAll(".wh-langkah__item")[idx === 0 ? 1 : 0];
        const sorot = getComputedStyle(item).borderLeftColor !== getComputedStyle(lain).borderLeftColor && getComputedStyle(item).backgroundColor !== getComputedStyle(lain).backgroundColor;
        return { sorot, tinggiBilah: Math.round(bilah.height), atasBilah: Math.round(bilah.top), bawahBilah: Math.round(bilah.bottom), atasItem: Math.round(r.top), fokus, aria: item.getAttribute("aria-current"), lain: document.querySelectorAll('.wh-langkah__item[aria-current="step"]').length, header: Math.round(header) };
      }, i);
      const ok = hilang.length === 0 && JSON.stringify(chips) === JSON.stringify(chipHarap) && st.startsWith(`Langkah ${i + 1} dari 8, `) && kalimat(st) === 1
        && (await aktifNo(w)) === i + 1 && tepi.aria === "step" && tepi.lain === 1
        && (i === 0 || (tepi.fokus && tepi.atasItem >= tepi.bawahBilah - 1 && tepi.atasItem <= tepi.bawahBilah + 40 && tepi.atasBilah >= tepi.header - 1 && tepi.atasBilah <= tepi.header + 20));
      tinggiBilah.push(tepi.tinggiBilah);
      if (!tepi.sorot) salah.push(`${id}: langkah aktif tidak disorot`);
      if (!ok) salah.push(`${id}: hilang ${JSON.stringify(hilang)}, chip ${JSON.stringify(chips)} harap ${JSON.stringify(chipHarap)}, status "${st.slice(0, 50)}", ${JSON.stringify(tepi)}`);
    }
    lapor(Math.max(...tinggiBilah) - Math.min(...tinggiBilah) <= 1, `webhook langkah ${nama} ${mode}: tinggi bilah tetap di delapan langkah (${Math.min(...tinggiBilah)} sampai ${Math.max(...tinggiBilah)} px)`);
    lapor(salah.length === 0, `webhook langkah ${nama} ${mode}: 8 langkah lewat tombol: angka, status, chip, fokus di langkah, aria-current tunggal, bilah lengket di bawah header dan tak menutup langkah${salah.length ? "; " + salah.join(" | ") : ""}`);
    // Kembali ke awal lewat Langkah sebelumnya.
    for (let i = IDS.length - 1; i > 0; i--) await w.locator(`.wh-langkah__item[data-langkah="${IDS[i]}"]`).getByRole("button", { name: L.sebelumnya }).click();
    lapor((await aktifNo(w)) === 1 && (await fokusTeks(page)).startsWith("Langkah 1 dari 8"), `webhook langkah ${nama} ${mode}: tujuh kali "${L.sebelumnya}" kembali ke langkah 1 dengan fokus di langkah`);
  }
  // Fokus keyboard pada tombol jauh di bawah tidak tertutup bilah lengket (WCAG 2.4.11).
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await w.locator(`.wh-langkah__item[data-langkah="${IDS[1]}"]`).getByRole("button", { name: L.berikutnya }).focus();
  const tertutup = await page.evaluate(() => {
    const t = document.activeElement.getBoundingClientRect();
    const b = document.querySelector(".wh-bilah").getBoundingClientRect();
    return { tombolAtas: Math.round(t.top), bawahBilah: Math.round(b.bottom), ok: t.top >= b.bottom - 1 };
  });
  lapor(tertutup.ok, `webhook langkah ${nama}: tombol yang difokus dari bawah halaman di y ${tertutup.tombolAtas}, bilah berakhir di y ${tertutup.bawahBilah} (tidak tertutup)`);
  // Pertama: langkah terakhir tidak punya "berikutnya", langkah pertama tidak punya "sebelumnya".
  const ujung = await page.evaluate(() => {
    const it = [...document.querySelectorAll(".wh-langkah__item")];
    const nama = (e) => [...e.querySelectorAll("button")].map((b) => b.textContent.trim());
    return { pertama: nama(it[0]), terakhir: nama(it[it.length - 1]) };
  });
  lapor(JSON.stringify(ujung.pertama) === JSON.stringify([L.berikutnya]) && JSON.stringify(ujung.terakhir) === JSON.stringify([L.sebelumnya]), `webhook langkah ${nama}: tombol di ujung ${JSON.stringify(ujung)}`);
  await ctx.close();
}

// 4. Gulir: pembaca menggulir, langkah aktif mengikuti, stabil, dan ganti versi tidak memindahkannya.
for (const ukuran of [[375, 667], [1366, 657]]) {
  const nama = ukuran.join("x");
  const { ctx, page } = await buka(ukuran, { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  const hasil = [];
  for (const i of [3, 5, 7, 4, 1, 0]) {
    for (let ulang = 0; ulang < 2; ulang++) { // dua kali: bilah baru lengket sesudah gulir pertama
      await page.evaluate((idx) => {
        const bilah = document.querySelector(".wh-bilah").getBoundingClientRect();
        const item = document.querySelectorAll(".wh-langkah__item")[idx];
        window.scrollBy(0, item.getBoundingClientRect().top - (bilah.bottom + 14));
      }, i);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(100);
    const a1 = await aktifNo(w);
    await page.waitForTimeout(250);
    hasil.push([i + 1, a1, await aktifNo(w)]);
  }
  const salah = hasil.filter(([harap, a1, a2]) => a1 !== harap || a2 !== harap);
  lapor(salah.length === 0, `webhook gulir ${nama}: langkah aktif mengikuti gulir dan stabil ${JSON.stringify(hasil.map((h) => h[0]))}${salah.length ? "; salah " + JSON.stringify(salah) : ""}`);
  // Sebelum menyentuh garis (tepi atas 40 px di bawah bilah) langkah sebelumnya masih aktif; sesudah menyentuhnya (14 px) langkah baru aktif.
  const sebelumGaris = [];
  for (const [i, jarak] of [[4, 40], [4, 14], [6, 40], [6, 14]]) {
    for (let ulang = 0; ulang < 2; ulang++) {
      await page.evaluate(([idx, j]) => {
        const bilah = document.querySelector(".wh-bilah").getBoundingClientRect();
        window.scrollBy(0, document.querySelectorAll(".wh-langkah__item")[idx].getBoundingClientRect().top - (bilah.bottom + j));
      }, [i, jarak]);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(100);
    sebelumGaris.push([i + 1, jarak, await aktifNo(w)]);
  }
  lapor(JSON.stringify(sebelumGaris.map((x) => x[2])) === JSON.stringify([4, 5, 6, 7]), `webhook gulir ${nama}: langkah baru aktif hanya sesudah tepi atasnya menyentuh garis ${JSON.stringify(sebelumGaris)}`);
  // Ganti versi di tengah gulir: langkah aktif dan posisi gulir tidak berubah.
  for (let ulang = 0; ulang < 2; ulang++) {
    await page.evaluate(() => { const b = document.querySelector(".wh-bilah").getBoundingClientRect(); const it = document.querySelectorAll(".wh-langkah__item")[3]; window.scrollBy(0, it.getBoundingClientRect().top - (b.bottom + 14)); });
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(100);
  const y0 = await page.evaluate(() => scrollY);
  await modeBtn(w, MODE_TEKS.adr34).click();
  await page.waitForTimeout(200);
  const y1 = await page.evaluate(() => scrollY);
  lapor((await aktifNo(w)) === 4, `webhook gulir ${nama}: ganti versi di langkah 4 tidak memindahkan langkah aktif (${await aktifNo(w)}), gulir ${y0} lalu ${y1}`);
  // Bilah lengket buram dan di atas isi yang lewat di bawahnya: isi tidak tembus ke teks bilah.
  const bilahTes = await page.evaluate(() => {
    const b = document.querySelector(".wh-bilah");
    const r = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    const m = (cs.backgroundColor.match(/\(([^)]+)\)/)?.[1] ?? "0,0,0,0").split(/[\s,/]+/).filter(Boolean).map(Number);
    const titik = [[r.left + r.width / 2, r.top + 4], [r.left + 10, r.top + r.height / 2], [r.right - 10, r.bottom - 4]];
    return { posisi: cs.position, alfa: m.length > 3 ? m[3] : 1, diAtas: titik.every(([x, y]) => !!document.elementFromPoint(x, y)?.closest(".wh-bilah")), atas: Math.round(r.top) };
  });
  lapor(bilahTes.posisi === "sticky" && bilahTes.alfa === 1 && bilahTes.diAtas, `webhook gulir ${nama}: bilah ${bilahTes.posisi} di y ${bilahTes.atas}, latar buram (alfa ${bilahTes.alfa}), di atas isi langkah ${bilahTes.diAtas}`);
  await ctx.close();
}

// 5. Isi kedua versi berbeda di tempat yang benar (tanda Aman dan Masalah), dan satu status satu kalimat per wilayah.
{
  const { ctx, page } = await buka([1366, 657], { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  const tanda = async (id) => w.locator(`.wh-langkah__item[data-langkah="${id}"] .wh-baris`).evaluateAll((b) => b.map((x) => x.classList.contains("is-baik") ? "baik" : x.classList.contains("is-buruk") ? "buruk" : "netral"));
  const salah = [];
  for (const mode of ["pertama", "adr34"]) {
    await modeBtn(w, MODE_TEKS[mode]).click();
    for (const [id, per] of Object.entries(TANDA)) {
      const t = await tanda(id);
      if (JSON.stringify(t) !== JSON.stringify(per[mode])) salah.push(`${id} ${mode}: ${JSON.stringify(t)}`);
      const kata = await w.locator(`.wh-langkah__item[data-langkah="${id}"] .wh-tanda`).allInnerTexts();
      const harapKata = per[mode].filter((x) => x !== "netral").map((x) => (x === "baik" ? L.tanda.baik : L.tanda.buruk));
      if (JSON.stringify(kata) !== JSON.stringify(harapKata)) salah.push(`${id} ${mode}: kata tanda ${JSON.stringify(kata)}`);
    }
  }
  lapor(salah.length === 0, `webhook tanda: Aman dan Masalah berpasangan dengan warna di enam langkah dua versi${salah.length ? "; " + salah.join(" | ") : ""}`);
  // Warna baris Aman dan Masalah dan katanya memakai token baik dan peringatan (bukan sekadar kelas), gelap dan terang.
  const warna = await w.evaluate(() => {
    const probe = (v) => { const d = document.createElement("div"); d.style.cssText = `position:absolute;border-left:3px solid var(${v});color:var(${v});background-color:var(${v})`; document.body.append(d); const s = getComputedStyle(d); const r = { garis: s.borderLeftColor, tinta: s.color, isi: s.backgroundColor }; d.remove(); return r; };
    const awal = document.documentElement.dataset.theme;
    const beda = [];
    for (const tema of ["dark", "light"]) {
      document.documentElement.dataset.theme = tema;
      for (const [kelas, token] of [["is-baik", "good"], ["is-buruk", "warn"]]) {
        const baris = document.querySelector(`.wh-baris.${kelas}`);
        const s = getComputedStyle(baris);
        const kata = getComputedStyle(baris.querySelector(".wh-tanda"));
        if (s.borderLeftColor !== probe(`--k-${token}-edge`).garis) beda.push(`${tema} ${kelas} garis`);
        if (s.backgroundColor !== probe(`--k-${token}-fill`).isi) beda.push(`${tema} ${kelas} latar`);
        if (kata.color !== probe(`--k-${token}-ink`).tinta) beda.push(`${tema} ${kelas} kata`);
      }
    }
    if (awal === undefined) delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = awal;
    return beda;
  });
  lapor(warna.length === 0, `webhook tanda: garis, latar, dan kata baris Aman dan Masalah memakai token baik dan peringatan di gelap dan terang${warna.length ? "; beda " + warna.join(", ") : ""}`);
  const st = await w.evaluate((el) => {
    const s = [...el.querySelectorAll('[role="status"]')];
    return { n: s.length, teks: s.map((x) => x.textContent.trim()), tombolDiStatus: s.some((x) => x.querySelector("button")) };
  });
  const kotak = await w.locator(".wh-ringkas").evaluate((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
  lapor(kotak[0] <= 2 && kotak[1] <= 2, `webhook status langkah tersembunyi secara visual tetapi terbaca (kotak ${kotak.join("x")} px)`);
  const maks = Math.max(...st.teks.map(kalimat));
  lapor(st.n === 2 && maks <= 1 && !st.tombolDiStatus, `webhook status: ${st.n} wilayah role=status (harap 2: hasil tebakan dan langkah), paling banyak ${maks} kalimat, tanpa tombol di dalamnya`);
  await ctx.close();
}

// 6. Tata letak: tanpa gulir ke samping, target >= 24 px, juga dengan font lebar (Inter di CI lebih lebar dari Satoshi lokal).
for (const ukuran of [[320, 640], [375, 667], [1366, 657]]) for (const font of [null, "Verdana"]) {
  const { ctx, page } = await buka(ukuran, { reducedMotion: "reduce" });
  if (font) await page.addStyleTag({ content: `.wh, .wh * { font-family: ${font}, sans-serif !important; }` });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  const ukuranBilah = [];
  const masalah = [];
  for (const mode of ["pertama", "adr34"]) {
    await modeBtn(w, MODE_TEKS[mode]).click();
    for (let i = 0; i < 8; i++) {
      await page.evaluate((idx) => document.querySelectorAll(".wh-langkah__item")[idx].scrollIntoView({ block: "center" }), i);
    }
    const r = await page.evaluate(() => {
      const wd = document.querySelector("[data-webhook-langkah]");
      const kecil = [...wd.querySelectorAll("button")].filter((b) => { const r = b.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).length;
      const luar = [...wd.querySelectorAll("*")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > document.documentElement.clientWidth + 1 || r.left < -1); }).length;
      const meluap = [...wd.querySelectorAll(".wh-baris, .wh-baris dd, .wh-langkah__item, .wh-bilah")].filter((e) => e.scrollWidth > e.clientWidth + 1).length;
      return { gulir: document.documentElement.scrollWidth - document.documentElement.clientWidth, kecil, luar, meluap, bilah: Math.round(document.querySelector(".wh-bilah").getBoundingClientRect().height) };
    });
    ukuranBilah.push(r.bilah);
    if (r.gulir > 0 || r.kecil > 0 || r.luar > 0 || r.meluap > 0) masalah.push(`${mode}: gulir ${r.gulir} px, tombol < 24 px ${r.kecil}, di luar viewport ${r.luar}, meluap ${r.meluap}`);
  }
  lapor(masalah.length === 0, `webhook tata letak ${ukuran.join("x")}${font ? " " + font : ""}: tanpa gulir ke samping, tombol >= 24 px, tinggi bilah ${ukuranBilah.join("/")} px${masalah.length ? "; " + masalah.join("; ") : ""}`);
  await ctx.close();
}

// 7. Kontras teks dan axe di tiga keadaan: sesudah menebak, langkah 5 versi ADR, langkah 8 versi pertama.
{
  const { ctx, page } = await buka([375, 667], { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  await tebakBenar(w);
  await page.addScriptTag({ path: AXE_PATH });
  const kontras = async () => page.evaluate(() => {
    const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const campur = (atas, bawah, a) => atas.slice(0, 3).map((v, k) => v * a + bawah[k] * (1 - a));
    const latar = (el) => { const lapis = []; for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c && c[3] > 0) { lapis.push(c); if (c[3] === 1) break; } } let h = [255, 255, 255]; for (const c of lapis.reverse()) h = campur(c, h, c[3]); return h; };
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const rasio = (el) => { let op = 1; for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity); const bg = latar(el), fg = rgba(getComputedStyle(el).color); const t = campur(fg, bg, fg[3] * op); const [a, b] = [lum(t), lum(bg)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); };
    const wd = document.querySelector("[data-webhook-langkah]");
    const teks = [...wd.querySelectorAll("*")].filter((e) => !e.closest(".sr-only") && !e.closest(".tb-huruf") && !e.matches(":disabled") && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const hasil = {};
    const awal = document.documentElement.dataset.theme;
    for (const t of ["dark", "light"]) { document.documentElement.dataset.theme = t; hasil[t] = Math.min(...teks.map(rasio)); }
    document.documentElement.dataset.theme = awal;
    return { ...hasil, n: teks.length };
  });
  const k = await kontras();
  lapor(k.dark >= 4.5 && k.light >= 4.5 && k.n > 80, `webhook kontras ${k.n} teks: gelap ${k.dark.toFixed(2)}:1, terang ${k.light.toFixed(2)}:1`);
  for (const [id, mode] of [["hilang", "adr34"], ["hasil", "pertama"], ["cek", "pertama"]]) {
    await modeBtn(w, MODE_TEKS[mode]).click();
    await w.locator(`.wh-langkah__item[data-langkah="${id}"]`).scrollIntoViewIfNeeded();
    for (const tema of ["dark", "light"]) {
      const v = await page.evaluate(async ([tema, tag]) => {
        document.documentElement.dataset.theme = tema;
        const r = await window.axe.run(document.querySelector("[data-webhook-langkah]"), { runOnly: { type: "tag", values: tag }, resultTypes: ["violations"] });
        return r.violations.map((x) => `${x.id} (${x.nodes.length})`);
      }, [tema, TAG_WCAG]);
      lapor(v.length === 0, `webhook axe ${id} ${mode} ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
    }
  }
  await ctx.close();
}

// 8. Tanpa JS dan CLS: island disembunyikan, <noscript> memuat tabel semua langkah dan versi; render build lawan sesudah hydrate.
// Isi tampilan hidup per langkah dan versi (baris keadaan "label: nilai (kata tanda)" dan sumber "chip: teks"), dibaca dari DOM widget;
// tabel <noscript> harus memuat teks yang sama.
const tampilJs = { pertama: [], adr34: [] };
{
  const c = await buka([1366, 657], { reducedMotion: "reduce" });
  await siap(c.page);
  const wc = c.page.locator(W);
  await tebakBenar(wc);
  for (const m of ["pertama", "adr34"]) {
    await modeBtn(wc, MODE_TEKS[m]).click();
    tampilJs[m] = await wc.locator(".wh-langkah__item").evaluateAll((items) => items.map((it) => {
      const baris = [...it.querySelectorAll(".wh-baris")].map((b) => {
        const t = b.querySelector(".wh-tanda");
        const nilai = [...b.querySelector("dd").childNodes].filter((n) => n !== t).map((n) => n.textContent).join("").replace(/\s+/g, " ").trim();
        return `${b.querySelector("dt").textContent}: ${nilai}${t ? ` (${t.textContent})` : ""}`;
      }).join(". ");
      const sumber = [...it.querySelectorAll(".wh-sumber__butir")].map((s) => {
        const chip = s.querySelector(".bb-chip").textContent;
        return `${chip}: ${s.textContent.replace(chip, "").replace(/\s+/g, " ").trim()}`;
      }).join(" ");
      return [baris, sumber];
    }));
  }
  await c.ctx.close();
}
for (const ukuran of [[320, 640], [375, 667], [1366, 657]]) {
  const ukur = (page) => page.evaluate(() => {
    const wd = document.querySelector("[data-webhook-langkah]");
    return { tinggi: wd.getBoundingClientRect().height, sesudah: wd.getBoundingClientRect().top + scrollY, tampil: getComputedStyle(wd).display };
  });
  const a = await buka(ukuran, { javaScriptEnabled: false });
  const statis = await ukur(a.page);
  const baris = await a.page.locator("noscript table tbody tr").count();
  const gulirTanpaJs = await a.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const kolom = await a.page.locator("noscript table thead th").allInnerTexts();
  const isi = await a.page.locator("noscript table tbody tr").evaluateAll((tr) => tr.map((r) => [...r.children].map((c) => c.textContent.replace(/\s+/g, " ").trim())));
  const kepalaBaris = await a.page.locator("noscript table tbody th[scope='row']").count();
  await a.ctx.close();
  // Isi tabel: tiap langkah dan versi memuat frasa angka dan status, kata Aman dan Masalah sebanyak baris bertandanya, dan chip sumbernya.
  const salahTabel = [];
  IDS.forEach((id, i) => ["pertama", "adr34"].forEach((m, k) => {
    const r = isi[i * 2 + k];
    if (!r) { salahTabel.push(`${id} ${m}: baris tidak ada`); return; }
    const [, chip] = harap(id, m);
    const tanda = (TANDA[id]?.[m] ?? []).filter((x) => x !== "netral");
    const hitung = (kata) => r[1].split(`(${kata})`).length - 1;
    const tidak = [
      !r[0].startsWith(`Langkah ${i + 1} dari 8: `) || !r[0].endsWith(`(${MODE_TEKS[m]})`) ? "kepala baris" : "",
      r[1] !== tampilJs[m][i][0] || r[2] !== tampilJs[m][i][1] ? "isi berbeda dari tampilan dengan JS" : "",
      hitung(L.tanda.baik) !== tanda.filter((x) => x === "baik").length || hitung(L.tanda.buruk) !== tanda.filter((x) => x === "buruk").length ? "tanda" : "",
      chip.map((c) => (c === "Tidak dijalankan" ? L.jenisChip.tidak : c)).some((c) => !r[2].includes(c)) ? "chip" : "",
    ].filter(Boolean);
    if (tidak.length) salahTabel.push(`${id} ${m}: ${tidak.join(", ")}`);
  }));
  lapor(salahTabel.length === 0 && kepalaBaris === 16, `webhook tanpa JS ${ukuran.join("x")}: isi tabel (sama dengan tampilan JS, tanda, chip, kepala baris) cocok di 16 baris, ${kepalaBaris} kepala baris scope=row${salahTabel.length ? "; " + salahTabel.join(" | ") : ""}`);
  lapor(statis.tampil === "none" && gulirTanpaJs <= 0 && baris === 16 && JSON.stringify(kolom) === JSON.stringify([L.kolomTabel.langkah, L.kolomTabel.hasil, L.kolomTabel.sumber]),
    `webhook tanpa JS ${ukuran.join("x")}: island ${statis.tampil} (harap none), ${baris} baris tabel (harap 16), gulir ke samping ${gulirTanpaJs} px, kolom ${JSON.stringify(kolom)}`);
  const b = await buka(ukuran);
  const sebelum = await ukur(b.page);
  await siap(b.page);
  const hidup = await ukur(b.page);
  await b.ctx.close();
  const geser = Math.max(Math.abs(sebelum.tinggi - hidup.tinggi), Math.abs(sebelum.sesudah - hidup.sesudah));
  lapor(geser <= 1 && hidup.tampil !== "none", `webhook CLS ${ukuran.join("x")}: tinggi render build ${sebelum.tinggi.toFixed(1)} px, sesudah hydrate ${hidup.tinggi.toFixed(1)} px, letak widget geser ${geser.toFixed(1)} px`);
}

// 9. Ukuran JS halaman uji (byte jaringan saat dimuat dan digulir sampai bawah, gzip per respons) dan tanpa Zod di bundel.
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
  const zod = b.some((x) => x.includes("ZodError") && x.includes("webhook"));
  lapor(!flow && !zod, `webhook ${HAL} tidak memuat React Flow (${!flow}) dan tidak memuat Zod (${!zod})`);
  console.log(`info JS ${HAL}: ${b.length} file, ${(b.reduce((n, x) => n + x.length, 0) / 1024).toFixed(1)} KB tanpa kompresi, ${(b.reduce((n, x) => n + gzipSync(x).length, 0) / 1024).toFixed(1)} KB gzip`);
  await ctx.close();
}

await browser.close();
console.log(gagal ? `Widget webhook masuk GAGAL (${gagal})` : "Widget webhook masuk: tebak dulu, keyboard, langkah, gulir, ARIA, reduced motion, angka dari rekaman, tata letak, kontras, axe, CLS lolos");
process.exit(gagal ? 1 : 0);
