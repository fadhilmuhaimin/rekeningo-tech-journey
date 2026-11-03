// Memeriksa widget jeda replica Tahap 5 (W5-lag) di /uji/lag/:
// - tebak dulu: sebelum menebak tidak ada penggeser, tombol aturan, tabel, atau rekaman; sesudah menebak lewat keyboard fokus ada di
//   penggeser jeda (bukan body), pilihan tebakan nonaktif, dan keadaan awal sama dengan keadaan yang ditanyakan;
// - lima jeda (digeser dengan Home, panah, dan End) kali tiga aturan (diklik): kalimat ringkasan, tiga kelompok baris tabel, baris
//   terpilih, dan rekaman yang cocok sama dengan hitungan alat ini sendiri dari data JSON dan aturan model (bukan dari logika.ts);
// - role=status: dua wilayah, masing-masing satu paragraf pendek; aria-pressed tepat satu aturan; valuetext penggeser; urutan Tab;
// - target >= 24 px, 320 px dengan font Verdana tanpa gulir ke samping dan tanpa kata terpotong di sel tabel, axe-core (WCAG A/AA
//   sampai 2.2) gelap dan terang pada lima kasus warna sel, reduced motion tanpa transisi atau animasi, istilah kode bertanda
//   translate=no, tanpa JavaScript widget tersembunyi dan seluruh isi ada di <noscript>, CLS dengan font telat dan fallback lebar.
//   node tools/ukur-lag.mjs --url http://127.0.0.1:4321
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";
import { AXE_PATH, TAG_WCAG } from "./lib/axe.mjs";

const arg = (nama, bawaan) => { const i = process.argv.indexOf(nama); return i > -1 ? process.argv[i + 1] : bawaan; };
const BASE = arg("--url", "http://127.0.0.1:4321");
const D = JSON.parse(readFileSync(new URL("../data/widget/t5-lag.json", import.meta.url), "utf8"));
const L = D.label;
const HAL = ["/uji/lag/"];
const isi = (t, n) => t.replace(/\{([a-z]+)\}/g, (_, k) => String(n[k]));
const rp = (n) => "Rp" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const ds = (n) => String(n).replace(".", ",");
const rapi = (t) => t.replace(/\s+/g, " ").trim();
const samaJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NJ = D.jeda.length;
const NA = D.aturan.length;
const BARU = D.skenario.saldoAwal - D.skenario.bayar;

let gagal = 0;
const lapor = (ok, pesan) => { if (!ok) gagal++; console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`); };

// Hitungan sendiri, ditulis ulang dari aturan di komentar logika.ts, tanpa memakai istilah kasus dari kodenya:
// jeda terhingga dan <= selang bacaan = replica sudah memuat pembayaran saat app membaca.
function harap(ji, ai) {
  const j = D.jeda[ji];
  const a = D.aturan[ai];
  const sudah = j.detik !== null && j.detik <= D.skenario.bacaDetik;
  let kasus, sumber, saldo, baris, tunda = null;
  if (a.id === "remote_apply") {
    sumber = "replica_sinkron";
    if (j.detik === null) { kasus = "macet"; saldo = null; }
    else { kasus = j.detik > 0 ? "tunda" : "sama"; saldo = BARU; baris = D.skenario.barisAwal + 1; tunda = j.detik; }
  } else if (a.id === "token") {
    sumber = sudah ? "replica" : "primary"; kasus = sudah ? "sama" : "keprimary"; saldo = BARU; baris = D.skenario.barisAwal + 1;
  } else {
    sumber = "replica"; kasus = sudah ? "sama" : "lama";
    saldo = sudah ? BARU : D.skenario.saldoAwal; baris = D.skenario.barisAwal + (sudah ? 1 : 0);
  }
  const layar = saldo === null ? L.layar.menunggu : isi(L.layar.saldo, { saldo: rp(saldo), baris });
  const tundaT = tunda === null ? "" : `${ds(tunda)} detik`;
  const akibat = kasus === "tunda" ? isi(L.akibat.tunda, { tunda: tundaT }) : L.akibat[kasus];
  const ringkas = isi(L.ringkas[kasus], { aturan: a.label, jeda: j.kalimat, saldo: saldo === null ? "" : rp(saldo), sumber: L.sumberNama[sumber], primary: rp(BARU), tunda: tundaT });
  return { kasus, sel: [L.sumberNama[sumber], layar, akibat], ringkas };
}
function acuanHarap(ji, ai) {
  const j = D.jeda[ji];
  return D.acuan.filter((x) => x.jeda === j.id && (x.aturan === undefined || x.aturan === D.aturan[ai].id));
}

// Halaman yang tidak ada di dist tidak dilewati diam-diam: itu kegagalan.
for (const p of HAL) lapor(existsSync(new URL(`../dist${p}index.html`, import.meta.url)), `${p} ada di dist`);

const browser = awasi(await chromium.launch(), { alat: "lag" });
async function siap(page, path) {
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.locator(".lg").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".lg .bb-predict__opts button") && !document.querySelector("astro-island[ssr] .lg"), null, { timeout: 15000 });
  await page.waitForTimeout(300);
}
const status = (page) => page.$$eval(".lg [role=status]", (e) => e.map((x) => ({ n: x.querySelectorAll("p").length, teks: x.textContent.replace(/\s+/g, " ").trim() })));
const keadaan = (page) => page.evaluate(() => {
  const w = document.querySelector(".lg");
  const sl = w.querySelector("input[type=range]");
  const t = (e) => e.textContent.replace(/\s+/g, " ").trim();
  const hasil = w.querySelector(".lg-hasil");
  const acuan = hasil?.querySelector(":scope > ul.lg-daftar");
  return {
    slider: sl ? { nilai: Number(sl.value), min: sl.min, max: sl.max, text: sl.getAttribute("aria-valuetext"), keluar: t(w.querySelector("output")), label: t(w.querySelector("label[for]")), deskripsi: t(document.getElementById(sl.getAttribute("aria-describedby") ?? "-") ?? { textContent: "(tidak ada)" }) } : null,
    aturan: [...w.querySelectorAll(".lg-aturan button")].map((b) => ({ teks: t(b), pressed: b.getAttribute("aria-pressed") })),
    tabel: [...w.querySelectorAll(".lg-tabel tbody")].map((b) => ({ nama: t(b.querySelector("th")), cakup: b.querySelector("th").getAttribute("scope"), pilih: b.classList.contains("lg-pilih"), label: [...b.querySelectorAll("th[scope=row]")].map(t), kelas: [...b.querySelectorAll("td")].map((td) => td.className), sel: [...b.querySelectorAll("td")].map(t), baris: b.querySelectorAll("tr").length })),
    tabelMeta: { caption: t(w.querySelector(".lg-tabel caption")), kepala: w.querySelectorAll(".lg-tabel thead").length, kolom: w.querySelectorAll(".lg-tabel col").length },
    acuan: acuan ? [...acuan.querySelectorAll(":scope > li")].map((li) => ({ chip: t(li.querySelector(".bb-chip")), kelas: li.querySelector(".bb-chip").className, teks: t(li) })) : null,
    tanpaAcuan: hasil && !acuan ? [...hasil.querySelectorAll(":scope > p.bb-muted")].map(t).filter((x) => x.length) : [],
  };
});

for (const path of HAL) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await siap(page, path);

  // 1. sebelum menebak
  const awal = await page.evaluate(() => {
    const w = document.querySelector(".lg");
    const t = (e) => (e ? e.textContent.replace(/\s+/g, " ").trim() : "(tidak ada)");
    return {
      peran: w.getAttribute("role"), nama: w.getAttribute("aria-label"), chip: t(w.querySelector(".bb-widget__head .bb-chip")), sumber: t(w.querySelector(".jt-sumber")),
      pilihan: [...w.querySelectorAll(".bb-predict__opts button")].map(t), q: t(w.querySelector(".bb-predict__q")),
      slider: w.querySelectorAll("input").length, tombolAturan: w.querySelectorAll(".lg-aturan button").length, tabel: w.querySelectorAll("table").length, hasil: w.querySelectorAll(".lg-hasil, .lg-ubah, details").length,
      pressed: [...w.querySelectorAll(".bb-predict__opts button")].map((b) => b.getAttribute("aria-pressed")),
    };
  });
  lapor(awal.peran === "group" && awal.nama === D.judul, `${path} grup widget punya nama dari data: "${awal.nama}"`);
  lapor(awal.chip === L.sumber && awal.sumber === D.sumber.teks, `${path} chip sumber "${awal.chip}" dan catatan sumber sama dengan data`);
  lapor(samaJson(awal.pilihan, D.tebak.pilihan) && awal.q === `${L.tebakDulu} ${D.tebak.q}`, `${path} pertanyaan dan ${awal.pilihan.length} pilihan tebakan sama dengan data`);
  lapor(awal.slider === 0 && awal.tombolAturan === 0 && awal.tabel === 0 && awal.hasil === 0, `${path} sebelum menebak: ${awal.slider} penggeser, ${awal.tombolAturan} tombol aturan, ${awal.tabel} tabel, ${awal.hasil} blok hasil (hasil tersembunyi sampai memilih)`);
  lapor(awal.pressed.every((x) => x === "false"), `${path} sebelum menebak aria-pressed semua false`);
  let st = await status(page);
  lapor(st.length === 2 && st.every((x) => x.teks === ""), `${path} dua wilayah status kosong sebelum menebak`);

  // 2. tebak lewat keyboard: pilihan salah, fokus pindah ke penggeser jeda
  const salah = D.tebak.pilihan.findIndex((_, i) => i !== D.tebak.jawaban);
  await page.locator(".lg .bb-predict__opts button").nth(salah).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const fokus = await page.evaluate(() => { const a = document.activeElement; const g = getComputedStyle(a); return { garis: g.outlineStyle === "auto" || (g.outlineStyle !== "none" && parseFloat(g.outlineWidth) >= 2), tag: a?.tagName, tipe: a?.type, diUbah: !!a?.closest(".lg-ubah"), pressed: [...document.querySelectorAll(".lg .bb-predict__opts button")].map((b) => b.getAttribute("aria-pressed")), mati: [...document.querySelectorAll(".lg .bb-predict__opts button")].map((b) => b.disabled) }; });
  lapor(fokus.tag === "INPUT" && fokus.tipe === "range" && fokus.diUbah && fokus.garis, `${path} sesudah menebak fokus di penggeser jeda (${fokus.tag} ${fokus.tipe}, garis fokus terlihat ${fokus.garis})`);
  lapor(fokus.pressed[salah] === "true" && fokus.pressed.filter((x) => x === "true").length === 1 && fokus.mati.every(Boolean), `${path} aria-pressed tebakan ${fokus.pressed.join(",")} dan semua pilihan nonaktif`);
  st = await status(page);
  lapor(st[0].teks === `${L.belum} ${D.tebak.alasan}`, `${path} jawaban tebakan salah: "${st[0].teks.slice(0, 50)}..."`);
  const ji0 = D.jeda.findIndex((j) => j.id === D.awal.jeda);
  const ai0 = D.aturan.findIndex((a) => a.id === D.awal.aturan);
  let k = await keadaan(page);
  lapor(k.slider.nilai === ji0 && k.slider.min === "0" && k.slider.max === String(NJ - 1), `${path} penggeser mulai di jeda "${D.awal.jeda}" (${k.slider.nilai} dari 0 sampai ${k.slider.max})`);
  lapor(k.slider.deskripsi === L.jeda.petunjuk, `${path} penggeser punya aria-describedby ke petunjuk: "${k.slider.deskripsi.slice(0, 40)}"`);
  lapor(harap(ji0, ai0).kasus === "lama" && st[1].teks === harap(ji0, ai0).ringkas, `${path} keadaan awal sama dengan yang ditanyakan: "${st[1].teks.slice(0, 80)}..."`);
  lapor(D.tebak.pilihan[D.tebak.jawaban].includes(rp(D.skenario.saldoAwal)) && D.tebak.alasan.includes(rp(D.skenario.saldoAwal)), `${path} jawaban benar menyebut saldo lama ${rp(D.skenario.saldoAwal)}`);

  // 3. lima jeda (keyboard) kali tiga aturan (klik)
  const aturanTombol = page.locator(".lg .lg-aturan button");
  const slider = page.locator(".lg input[type=range]");
  let salahState = 0;
  for (let ji = 0; ji < NJ; ji++) {
    await slider.focus();
    await page.keyboard.press("Home");
    for (let n = 0; n < ji; n++) await page.keyboard.press("ArrowRight");
    for (let ai = 0; ai < NA; ai++) {
      await aturanTombol.nth(ai).click();
      await page.waitForTimeout(30);
      const h = harap(ji, ai);
      const s2 = await status(page);
      k = await keadaan(page);
      const j = D.jeda[ji];
      const tabelHarap = D.aturan.map((a, x) => ({ nama: `${a.label}${x === ai ? ` (${L.tabel.dipilih})` : ""}`, cakup: "rowgroup", pilih: x === ai, label: [L.tabel.kolom.dibaca, L.tabel.kolom.layar, L.tabel.kolom.akibat], kelas: [0, 1, 2].map(() => `lg-sel is-${harap(ji, x).kasus}`), sel: harap(ji, x).sel, baris: 4 }));
      const ac = acuanHarap(ji, ai);
      const acuanOk = ac.length === 0
        ? k.acuan === null && k.tanpaAcuan.includes(L.tanpaAcuan)
        : k.acuan !== null && k.acuan.length === ac.length && ac.every((x, i) => k.acuan[i].chip === L.acuanJenis[x.jenis] && k.acuan[i].kelas.split(" ").includes(x.jenis === "rekaman" ? "is-system" : "is-warn") && k.acuan[i].teks.includes(x.teks) && k.acuan[i].teks.includes(isi(L.acuanBerkas, { berkas: x.berkas, bagian: x.bagian })));
      const ok =
        k.slider.nilai === ji && k.slider.keluar === j.label && k.slider.text === isi(L.jeda.nilai, { jeda: j.label }) && k.slider.label === `${L.jeda.label}: ${j.label}` &&
        samaJson(k.aturan.map((x) => x.pressed), D.aturan.map((_, x) => String(x === ai))) &&
        s2[1].teks === h.ringkas && samaJson(k.tabel, tabelHarap) && k.tabelMeta.caption === L.tabel.caption && k.tabelMeta.kepala === 0 && k.tabelMeta.kolom === 2 && acuanOk;
      if (!ok) {
        salahState++;
        console.log(`  detail ${j.id}/${D.aturan[ai].id}: slider ${JSON.stringify(k.slider)}; ringkasan sama ${s2[1].teks === h.ringkas}; tabel sama ${samaJson(k.tabel, tabelHarap)}; meta ${JSON.stringify(k.tabelMeta)}; acuan sama ${acuanOk}; pressed ${k.aturan.map((x) => x.pressed)}`);
      }
    }
  }
  lapor(salahState === 0, `${path} ${NJ * NA} kombinasi jeda dan aturan: ringkasan, tabel kelompok baris per aturan, baris terpilih, kelas sel, aria-pressed, valuetext, dan rekaman sama dengan hitungan alat (${salahState} salah)`);
  const peta = D.jeda.flatMap((_, ji) => D.aturan.map((__, ai) => harap(ji, ai).kasus));
  lapor(["lama", "sama", "keprimary", "tunda", "macet"].every((x) => peta.includes(x)), `${path} kelima kasus muncul di antara ${peta.length} kombinasi: ${[...new Set(peta)].join(", ")}`);

  // 3b. penggeser: Home, End, ArrowLeft, PageUp tidak keluar jangkauan
  await slider.focus();
  await page.keyboard.press("End");
  const akhir = (await keadaan(page)).slider.nilai;
  await page.keyboard.press("ArrowLeft");
  const mundur = (await keadaan(page)).slider.nilai;
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowLeft");
  const awalLagi = (await keadaan(page)).slider.nilai;
  lapor(akhir === NJ - 1 && mundur === NJ - 2 && awalLagi === 0, `${path} penggeser: End ${akhir}, ArrowLeft ${mundur}, Home lalu ArrowLeft ${awalLagi}`);
  // fokus tidak jatuh ke body sesudah klik aturan, dan Tab dari penggeser melewati ketiga aturan lalu ringkasan batas
  await aturanTombol.nth(1).click();
  const sesudahKlik = await page.evaluate(() => ({ tag: document.activeElement?.tagName, teks: document.activeElement?.textContent.trim(), pressed: document.activeElement?.getAttribute("aria-pressed") }));
  lapor(sesudahKlik.tag === "BUTTON" && sesudahKlik.teks === D.aturan[1].label && sesudahKlik.pressed === "true", `${path} sesudah klik aturan fokus tetap di tombol itu (${sesudahKlik.tag} "${sesudahKlik.teks}")`);
  await slider.focus();
  const urutan = [];
  const garisTab = [];
  for (let i = 0; i < NA + 1; i++) {
    await page.keyboard.press("Tab");
    urutan.push(await page.evaluate(() => document.activeElement?.textContent.replace(/\s+/g, " ").trim()));
    garisTab.push(await page.evaluate(() => { const g = getComputedStyle(document.activeElement); return g.outlineStyle === "auto" || (g.outlineStyle !== "none" && parseFloat(g.outlineWidth) >= 2); }));
  }
  lapor(samaJson(urutan, [...D.aturan.map((a) => a.label), L.batasJudul]) && garisTab.every(Boolean), `${path} Tab dari penggeser: ${urutan.join(" > ")}; garis fokus terlihat (>= 2 px) di tiap kontrol: ${garisTab.every(Boolean)}`);
  await page.keyboard.press("Enter");
  const bukaBatas = await page.evaluate((dasar) => {
    const d = document.querySelector(".lg details");
    return { open: d.open, items: [...d.querySelectorAll("li")].map((li) => ({ chip: li.querySelector(".bb-chip").textContent.trim(), teks: li.textContent.replace(/\s+/g, " ").trim() })), dasar };
  }, L.dasar);
  lapor(bukaBatas.open && bukaBatas.items.length === D.batas.length && D.batas.every((b, i) => bukaBatas.items[i].chip === L.dasar[b.dasar] && bukaBatas.items[i].teks.includes(b.teks)), `${path} Enter membuka batas: ${bukaBatas.items.length} butir dengan label dasar sama dengan data`);
  await page.keyboard.press("Enter");
  // keputusan uang: judul, chip Rekaman lab (isinya kutipan baca.txt A), kalimat, dan berkas di bawahnya (peninjau 1677: mutan chip
  // Ilustrasi di blok ini lolos semua pemeriksaan sebelumnya)
  const uang = await page.evaluate((judul) => {
    const h = [...document.querySelectorAll(".lg .lg-judul")].find((x) => x.textContent.trim() === judul);
    const p = h?.nextElementSibling;
    return p ? { chip: p.querySelector(".bb-chip")?.textContent.trim(), kelas: p.querySelector(".bb-chip")?.className, teks: p.textContent.replace(/\s+/g, " ").trim() } : null;
  }, L.uangJudul);
  lapor(uang !== null && uang.chip === L.acuanJenis.rekaman && uang.kelas.split(" ").includes("is-system") && uang.teks.includes(D.uang.teks) && uang.teks.includes(isi(L.acuanBerkas, { berkas: D.uang.berkas, bagian: D.uang.bagian })), `${path} blok "${L.uangJudul}": chip "${uang?.chip}", kalimat dan berkas sama dengan data`);

  // 4. role=status, target, istilah kode
  st = await status(page);
  lapor(st.length === 2 && st.every((x) => x.n === 1 && x.teks.length > 0 && x.teks.length <= 240), `${path} role=status: ${st.length} wilayah, satu paragraf, panjang ${st.map((x) => x.teks.length).join(" dan ")} karakter`);
  // <output> berperan status dan aria-live polite secara implisit: tanpa aria-live="off" tiap gerakan penggeser diumumkan dua kali
  // (peninjau 1677: mutan yang menghapus aria-live="off" lolos karena hanya role=status eksplisit yang dihitung)
  const hidup = await page.$$eval(".lg [role=status], .lg [aria-live]:not([aria-live=off]), .lg output:not([aria-live=off])", (e) => e.length);
  lapor(hidup === 2, `${path} wilayah live aktif termasuk <output> implisit: ${hidup} (harus 2: dua role=status; output memakai aria-live=off)`);
  const kecil = await page.$$eval(".lg button, .lg input", (b) => b.map((x) => x.getBoundingClientRect()).filter((r) => r.width < 24 || r.height < 24).length);
  lapor(kecil === 0, `${path} target >= 24 px: ${kecil} kontrol terlalu kecil`);
  // teks widget tidak lebih kecil dari 12 px di 375 px (token --rk-ui-kecil situs ±12,2 px dipakai chip dan keterangan; peninjau 1677:
  // mutan `.lg-berkas` 0,4em (6,4 px) lolos semua pemeriksaan sebelumnya)
  const huruf = await page.evaluate(() => {
    const w = document.querySelector(".lg");
    const jalan = document.createTreeWalker(w, NodeFilter.SHOW_TEXT);
    const kecil = [];
    let terkecil = Infinity;
    for (let n = jalan.nextNode(); n; n = jalan.nextNode()) {
      if (!n.textContent.trim() || n.parentElement.closest("noscript")) continue;
      const px = parseFloat(getComputedStyle(n.parentElement).fontSize);
      terkecil = Math.min(terkecil, px);
      if (px < 12) kecil.push(`${n.textContent.trim().slice(0, 24)} (${px.toFixed(1)} px)`);
    }
    return { terkecil, kecil };
  });
  lapor(huruf.kecil.length === 0, `${path} teks widget >= 12 px di 375 px: terkecil ${huruf.terkecil.toFixed(1)} px${huruf.kecil.length ? `, terlalu kecil: ${huruf.kecil.slice(0, 3).join("; ")}` : ""}`);
  const tanpaTanda = await page.evaluate(() => {
    const w = document.querySelector(".lg");
    const pola = /remote_apply|X-Lsn-Tulis|pg_current_wal_lsn\(\)|synchronous_commit|Idempotency-Key|Content-Type|SyncRep/;
    const walk = document.createTreeWalker(w, NodeFilter.SHOW_TEXT);
    const salah = [];
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (pola.test(n.textContent) && !n.parentElement.closest('[translate="no"]')) salah.push(n.textContent.trim().slice(0, 40));
    return { salah, kode: [...w.querySelectorAll("code")].filter((c) => c.getAttribute("translate") !== "no").length };
  });
  await page.locator(".lg details summary").click();
  const tanpaTanda2 = await page.evaluate(() => {
    const pola = /remote_apply|X-Lsn-Tulis|pg_current_wal_lsn\(\)|synchronous_commit|Idempotency-Key|Content-Type|SyncRep/;
    const walk = document.createTreeWalker(document.querySelector(".lg"), NodeFilter.SHOW_TEXT);
    const salah = [];
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (pola.test(n.textContent) && !n.parentElement.closest('[translate="no"]')) salah.push(n.textContent.trim().slice(0, 40));
    return salah;
  });
  lapor(tanpaTanda.salah.length === 0 && tanpaTanda.kode === 0 && tanpaTanda2.length === 0, `${path} istilah kode bertanda translate=no: ${tanpaTanda.salah.length + tanpaTanda2.length} teks tanpa tanda, ${tanpaTanda.kode} code tanpa tanda`);
  const semuaTeks = (await page.locator(".lg").innerText()).replace(/t5-replika/g, "");
  lapor(!/replika/i.test(semuaTeks) && /\breplica\b/.test(semuaTeks), `${path} satu kata untuk konsepnya: replica (tanpa "replika" kecuali nama lab t5-replika)`);
  await page.locator(".lg details summary").click();

  // 5. axe gelap dan terang pada lima kasus warna sel
  const kasusKeadaan = [["naskah", "replica"], ["ditahan", "remote_apply"], ["nol", "replica"]];
  for (const [jid, aid] of kasusKeadaan) {
    const ji = D.jeda.findIndex((j) => j.id === jid);
    const ai = D.aturan.findIndex((a) => a.id === aid);
    await slider.focus();
    await page.keyboard.press("Home");
    for (let n = 0; n < ji; n++) await page.keyboard.press("ArrowRight");
    await aturanTombol.nth(ai).click();
    for (const tema of ["dark", "light"]) {
      await page.evaluate((x) => { document.documentElement.dataset.theme = x; }, tema);
      await page.waitForTimeout(80);
      await page.addScriptTag({ path: AXE_PATH });
      const v = await page.evaluate(async (tag) => { const r = await window.axe.run(document.querySelector(".lg"), { runOnly: { type: "tag", values: tag }, resultTypes: ["violations"] }); return r.violations.map((x) => `${x.id}(${x.nodes.length})`); }, TAG_WCAG);
      lapor(v.length === 0, `${path} axe ${tema} (${jid}, ${aid}): ${v.length ? v.join(", ") : "0 pelanggaran"}`);
    }
  }
  await page.close();

  // 6. tebakan benar, reduced motion tanpa transisi atau animasi dan fungsi tetap
  const benar = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await siap(benar, path);
  await benar.locator(".lg .bb-predict__opts button").nth(D.tebak.jawaban).focus();
  await benar.keyboard.press("Space");
  await benar.waitForTimeout(100);
  const stB = await status(benar);
  const kelasB = await benar.$eval(".lg .bb-predict__a", (e) => e.className);
  lapor(stB[0].teks === `${L.benar} ${D.tebak.alasan}` && kelasB.includes("is-good"), `${path} tebakan benar: "${stB[0].teks.slice(0, 40)}..."`);
  const gerakAwal = await benar.evaluate(() => [...document.querySelectorAll(".lg, .lg *")].filter((e) => { const s = getComputedStyle(e); return parseFloat(s.transitionDuration) > 0 || (s.animationName !== "none" && parseFloat(s.animationDuration) > 0); }).length);
  await benar.emulateMedia({ reducedMotion: "reduce" });
  await benar.locator(".lg .lg-aturan button").nth(2).click();
  const gerak = await benar.evaluate(() => [...document.querySelectorAll(".lg, .lg *")].filter((e) => { const s = getComputedStyle(e); return parseFloat(s.transitionDuration) > 0 || (s.animationName !== "none" && parseFloat(s.animationDuration) > 0); }).length);
  const tetap = (await keadaan(benar)).aturan.map((x) => x.pressed).join() === "false,false,true";
  lapor(gerakAwal === 0 && gerak === 0 && tetap, `${path} tanpa gerak: ${gerakAwal} elemen bergerak, reduced motion ${gerak}, fungsi tetap`);
  await benar.close();

  // 7. 320 px dengan font Verdana (lebih lebar dari Satoshi): tanpa gulir ke samping, tanpa kata terpotong di sel
  const kecilHalaman = await browser.newPage({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
  await siap(kecilHalaman, path);
  await kecilHalaman.addStyleTag({ content: ".sl-markdown-content, .sl-markdown-content * { font-family: Verdana, sans-serif !important; }" });
  await kecilHalaman.locator(".lg .bb-predict__opts button").nth(2).click();
  const slider320 = kecilHalaman.locator(".lg input[type=range]");
  const ukurKecil = async () => kecilHalaman.evaluate(() => {
    const w = document.querySelector(".lg").getBoundingClientRect();
    const ukur = (el, teks) => {
      const cs = getComputedStyle(el);
      const s = document.createElement("span");
      s.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
      document.body.append(s);
      let terlebar = 0;
      for (const k of teks.split(/\s+/).filter(Boolean)) { s.textContent = k; terlebar = Math.max(terlebar, s.getBoundingClientRect().width); }
      s.remove();
      return terlebar;
    };
    const sempit = [];
    for (const c of document.querySelectorAll(".lg table :is(td, th)")) {
      const cs = getComputedStyle(c);
      const lebarIsi = c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (ukur(c, c.textContent) > lebarIsi + 0.5) sempit.push(c.textContent.trim());
    }
    const nilaiLebar = [...document.querySelectorAll(".lg table td")].map((td) => td.getBoundingClientRect().width);
    const labelLebar = [...document.querySelectorAll(".lg table th[scope=row]")].map((th) => th.getBoundingClientRect().width);
    const meluap = [...document.querySelectorAll(".lg table :is(td, th)")].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.textContent.trim());
    return { halaman: document.documentElement.scrollWidth, kanan: Math.round(w.right), kiri: Math.round(w.left), tabel: [...document.querySelectorAll(".lg table")].map((t) => t.scrollWidth - t.parentElement.clientWidth), sempit, meluap, nilaiLebih: Math.min(...nilaiLebar) > Math.max(...labelLebar) };
  });
  const u320 = [];
  for (const [ji, ai] of [[2, 0], [4, 2], [1, 2], [3, 1]]) {
    await slider320.focus();
    await kecilHalaman.keyboard.press("Home");
    for (let n = 0; n < ji; n++) await kecilHalaman.keyboard.press("ArrowRight");
    await kecilHalaman.locator(".lg .lg-aturan button").nth(ai).click();
    await kecilHalaman.waitForTimeout(60);
    u320.push({ ji, ai, ...(await ukurKecil()) });
  }
  await kecilHalaman.locator(".lg details summary").click();
  const bukaWidth = await kecilHalaman.evaluate(() => ({ halaman: document.documentElement.scrollWidth, kanan: Math.round(document.querySelector(".lg").getBoundingClientRect().right) }));
  lapor(u320.every((u) => u.halaman <= 320 && u.kanan <= 320 && u.kiri >= 0 && u.tabel.every((x) => x <= 1)) && bukaWidth.halaman <= 320 && bukaWidth.kanan <= 320, `${path} 320 px Verdana: halaman ${Math.max(...u320.map((u) => u.halaman))}, widget kanan ${Math.max(...u320.map((u) => u.kanan))}, batas terbuka ${bukaWidth.halaman}, kelebihan tabel ${u320.map((u) => u.tabel.join(",")).join(" ")}`);
  lapor(u320.every((u) => u.meluap.length === 0), `${path} 320 px Verdana: ${u320.reduce((t, u) => t + u.meluap.length, 0)} sel yang isinya meluap keluar selnya`);
  lapor(u320.every((u) => u.nilaiLebih), `${path} 320 px Verdana: kolom nilai lebih lebar dari kolom label di semua keadaan`);
  lapor(u320.every((u) => u.sempit.length === 0), `${path} 320 px Verdana: ${u320.reduce((t, u) => t + u.sempit.length, 0)} sel dengan kata terpotong${u320.some((u) => u.sempit.length) ? ` (${[...new Set(u320.flatMap((u) => u.sempit))].join(", ")})` : ""}`);
  await kecilHalaman.close();

  // 8. tanpa JavaScript widget tersembunyi dan seluruh isi ada di <noscript>
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  const tanpa = await ctx.newPage();
  await tanpa.goto(BASE + path, { waitUntil: "load" });
  const ns = await tanpa.evaluate(() => {
    const e = document.querySelector(".lg");
    const tabel = document.querySelector("table.tm-tabel");
    return {
      display: e ? getComputedStyle(e).display : "tidak ada", isi: document.body.innerText.replace(/\s+/g, " "),
      baris: tabel ? [...tabel.querySelectorAll("tbody tr")].map((r) => [...r.children].map((c) => c.textContent.replace(/\s+/g, " ").trim())) : [],
      kolom: tabel ? [...tabel.querySelectorAll("thead th")].map((c) => c.textContent.trim()) : [],
    };
  });
  lapor(ns.display === "none", `${path} tanpa JavaScript: widget display ${ns.display}`);
  const barisHarap = D.jeda.map((j, ji) => [j.label, ...D.aturan.map((a, ai) => { const h = harap(ji, ai); return `${h.sel[1]}; ${L.tabel.kolom.dibaca} ${h.sel[0]}; ${L.tabel.kolom.akibat}: ${h.sel[2]}`; })]);
  lapor(samaJson(ns.baris, barisHarap) && samaJson(ns.kolom, [L.noscriptJeda, ...D.aturan.map((a) => a.label)]), `${path} tanpa JavaScript: tabel ${ns.baris.length} jeda kali ${NA} aturan sama dengan hitungan alat`);
  const semuaNs = [L.tanpaJs, D.sumber.teks, D.tebak.q, D.tebak.alasan, L.noscriptCaption, L.acuanJudul, L.uangJudul, L.batasJudul, ...D.acuan.map((a) => a.teks), D.uang.teks, ...D.batas.map((b) => b.teks), ...D.batas.map((b) => L.dasar[b.dasar])];
  const hilang = semuaNs.filter((t) => !ns.isi.includes(rapi(t)));
  lapor(hilang.length === 0, `${path} tanpa JavaScript: ${hilang.length} dari ${semuaNs.length} teks data hilang${hilang.length ? ` (${hilang[0].slice(0, 40)}...)` : ""}`);
  await ctx.close();

  // 9. CLS dengan font telat 1500 ms dan fallback Verdana (tiruan CI, keputusan 351): saat dimuat harus di bawah 0,01; sesudah
  // menebak dengan cepat hanya dilaporkan (sumbernya font yang datang sesudah widget membesar, bukan masukan pembaca).
  for (const [lebar, tinggi] of [[375, 667], [667, 375]]) {
    for (const sesudahTebak of [false, true]) {
      const c = await browser.newContext({ viewport: { width: lebar, height: tinggi }, isMobile: true, hasTouch: true });
      const p = await c.newPage();
      await p.route(/\/fonts\//, async (rute) => { await new Promise((r) => setTimeout(r, 1500)); await rute.continue(); });
      await p.route(/\/_astro\/.+\.css(\?.*)?$/, async (rute) => { const res = await rute.fetch(); await rute.fulfill({ response: res, body: (await res.text()).replaceAll("system-ui", "Verdana") }); });
      await p.addInitScript(() => {
        window.__cls = 0;
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
      });
      await p.goto(BASE + path, { waitUntil: "load" });
      if (sesudahTebak) {
        await p.waitForFunction(() => document.querySelector(".lg .bb-predict__opts button") && !document.querySelector("astro-island[ssr] .lg"), null, { timeout: 15000 });
        await p.locator(".lg .bb-predict__opts button").nth(0).click();
      }
      await p.waitForTimeout(3500);
      const cls = await p.evaluate(() => window.__cls);
      if (sesudahTebak) console.log(`info ${path} ${lebar}x${tinggi} CLS font telat sesudah menebak cepat ${cls.toFixed(3)} (tidak diwajibkan)`);
      else lapor(cls < 0.01, `${path} ${lebar}x${tinggi} CLS saat dimuat dengan font telat dan fallback Verdana ${cls.toFixed(3)} (< 0,01)`);
      await c.close();
    }
  }
}
await browser.close();
console.log(gagal ? `Widget lag GAGAL (${gagal})` : `Widget lag: tebak dulu, ${NJ * NA} kombinasi jeda dan aturan dari hitungan sendiri, ARIA, keyboard, target, 320 px, axe, reduced motion, tanpa JavaScript, CLS lolos (${HAL.length} halaman)`);
process.exit(gagal ? 1 : 0);
