// Memeriksa widget fan-out notifikasi Tahap 5 (W5-fanout) di /uji/fanout/:
// - tebak dulu: sebelum menebak tidak ada penggeser, tombol jumlah perangkat, tabel, atau rekaman; sesudah menebak lewat keyboard fokus ada
//   di penggeser pengirim (bukan body), pilihan tebakan nonaktif, dan keadaan awal sama dengan keadaan yang ditanyakan;
// - lima jumlah pengirim (digeser dengan Home, panah, dan End) kali tiga jumlah perangkat (diklik): kalimat ringkasan, dua kelompok baris
//   tabel, enam baris tiap kelompok, kelas sel, lebar batang consumer dan kuota, dan rekaman yang cocok sama dengan hitungan alat ini
//   sendiri dari data JSON dan aturan model (bukan dari logika.ts);
// - role=status: dua wilayah, masing-masing satu paragraf pendek; aria-pressed tepat satu jumlah perangkat; valuetext penggeser; urutan Tab;
// - target >= 24 px, 320 px dengan font Verdana tanpa gulir ke samping dan tanpa kata terpotong di sel tabel, axe-core (WCAG A/AA sampai 2.2)
//   gelap dan terang pada tiga kasus warna sel, reduced motion tanpa transisi atau animasi, bendera lab bertanda translate=no, tanpa
//   JavaScript widget tersembunyi dan seluruh isi ada di <noscript>, CLS dengan font telat dan fallback lebar.
//   node tools/ukur-fanout.mjs --url http://127.0.0.1:4321
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";
import { AXE_PATH, TAG_WCAG } from "./lib/axe.mjs";

const arg = (nama, bawaan) => { const i = process.argv.indexOf(nama); return i > -1 ? process.argv[i + 1] : bawaan; };
const BASE = arg("--url", "http://127.0.0.1:4321");
const D = JSON.parse(readFileSync(new URL("../data/widget/t5-fanout.json", import.meta.url), "utf8"));
const L = D.label;
const S = D.skenario;
const HAL = ["/uji/fanout/"];
const isi = (t, n) => t.replace(/\{([A-Za-z]+)\}/g, (_, k) => String(n[k]));
const bulat = (x, d = 0) => { const f = 10 ** d; return Math.round(Number((x * f).toPrecision(12))) / f; };
const rib = (n) => String(bulat(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const ang = (n) => (n >= 1000 ? rib(n) : String(bulat(n, 1)).replace(".", ","));
const pers = (p) => `${p >= 100 ? rib(p) : ang(p)}%`;
const dur = (s) => (s < 120 ? `${bulat(s)} detik` : s < 10000 ? `${s / 60 < 100 ? ang(s / 60) : rib(s / 60)} menit` : `${ang(s / 3600)} jam`);
const rapi = (t) => t.replace(/\s+/g, " ").trim();
const samaJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NP = D.penerima.length;
const NK = D.pengirim.length;
const KUNCI = Object.keys(L.tabel.kolom);

let gagal = 0;
const lapor = (ok, pesan) => { if (!ok) gagal++; console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`); };

// Hitungan sendiri, ditulis ulang dari aturan di komentar logika.ts (consumer = ceil(pengirim / c); bekerja = min(consumer, partisi);
// laju = min(pengirim, bekerja x c) / t; kuota terlampaui bila laju + uang > kuota), tanpa memakai istilah kasus dari kodenya.
function harap(ni, ki, kel) {
  const n = D.penerima[ni].jumlah;
  const P = D.pengirim[ki].jumlah;
  const K = Math.ceil(P / S.serentak);
  const part = kel === "sebanyak" ? K : S.partisiLab;
  const W = Math.min(K, part);
  const laju = Math.min(P, W * S.serentak) / S.detikKirim;
  const total = laju + S.uang;
  const lewat = total > S.kuota;
  const detik = n / (lewat ? S.kuota - S.uang : laju);
  const kasus = lewat ? "kuota" : W < K ? "partisi" : "cukup";
  const batas = (S.kuota * S.batasPersen) / 100;
  const akibat = kasus === "partisi" ? isi(L.akibat.partisi, { menganggur: rib(K - W) }) : kasus === "kuota" ? isi(L.akibat.kuota, { kelebihan: rib(total - S.kuota), batas: rib(batas), durasiBatas: dur(n / batas) }) : L.akibat.cukup;
  const sel = [
    isi(L.sel.consumer, { bekerja: rib(W), consumer: rib(K) }),
    isi(L.sel.antrean, { perPartisi: rib(n / part) }),
    isi(L.sel.laju, { laju: ang(laju) }),
    isi(kasus === "kuota" ? L.sel.selesaiKuota : L.sel.selesai, { durasi: dur(detik) }),
    isi(L.sel.kuota, { persen: pers((total / S.kuota) * 100), kuotaAngka: rib(S.kuota), uang: ang(S.uang) }),
    akibat,
  ];
  return { nama: isi(L.kelompok[kel], { partisi: rib(part) }), kasus, sel, part, K, W, laju, detik, bar: [(W / K) * 100, Math.min(100, (total / S.kuota) * 100)] };
}
function ringkasHarap(ni, ki) {
  const a = harap(ni, ki, "sebanyak");
  const b = harap(ni, ki, "lab");
  return isi(L.ringkas[a.kasus === "kuota" ? "kuota" : "cukup"], { penerima: rib(D.penerima[ni].jumlah), pengirim: D.pengirim[ki].label, partisi: rib(a.part), durasi: dur(a.detik), laju: ang(a.laju), kuotaAngka: rib(S.kuota), partisiLab: rib(b.part), durasiLab: dur(b.detik) });
}
function acuanHarap(ni, ki) {
  const lewat = harap(ni, ki, "sebanyak").kasus === "kuota";
  return D.acuan.filter((a) => (a.penerima === undefined || a.penerima === D.penerima[ni].id) && (a.pengirim === undefined || a.pengirim === D.pengirim[ki].id) && (a.kuota === undefined || lewat));
}

// Halaman yang tidak ada di dist tidak dilewati diam-diam: itu kegagalan.
for (const p of HAL) lapor(existsSync(new URL(`../dist${p}index.html`, import.meta.url)), `${p} ada di dist`);

const browser = awasi(await chromium.launch(), { alat: "fanout" });
async function siap(page, path) {
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.locator(".fo").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".fo .bb-predict__opts button") && !document.querySelector("astro-island[ssr] .fo"), null, { timeout: 15000 });
  await page.waitForTimeout(300);
}
const status = (page) => page.$$eval(".fo [role=status]", (e) => e.map((x) => ({ n: x.querySelectorAll("p").length, teks: x.textContent.replace(/\s+/g, " ").trim() })));
const keadaan = (page) => page.evaluate(() => {
  const w = document.querySelector(".fo");
  const sl = w.querySelector("input[type=range]");
  const t = (e) => e.textContent.replace(/\s+/g, " ").trim();
  const hasil = w.querySelector(".fo-hasil");
  // daftar rekaman dan daftar uang dicari lewat judul di depannya: tanpa rekaman daftar pertama adalah daftar uang
  const judulHasil = hasil ? [...hasil.querySelectorAll(":scope > .fo-judul")] : [];
  const sesudah = (j) => (j?.nextElementSibling?.matches("ul.fo-daftar") ? j.nextElementSibling : null);
  const acuan = sesudah(judulHasil[0]);
  const uang = sesudah(judulHasil[1]);
  const rasio = (td) => { const b = td.querySelector(".fo-batang"); const i = td.querySelector(".fo-isi"); return b && i ? { aria: b.getAttribute("aria-hidden"), persen: (i.getBoundingClientRect().width / (b.clientWidth || 1)) * 100 } : null; };
  return {
    slider: sl ? { nilai: Number(sl.value), min: sl.min, max: sl.max, text: sl.getAttribute("aria-valuetext"), keluar: t(w.querySelector("output")), label: t(w.querySelector("label[for]")), deskripsi: t(document.getElementById(sl.getAttribute("aria-describedby") ?? "-") ?? { textContent: "(tidak ada)" }) } : null,
    penerima: [...w.querySelectorAll(".fo-penerima button")].map((b) => ({ teks: t(b), pressed: b.getAttribute("aria-pressed") })),
    penerimaGrup: w.querySelector(".fo-penerima")?.getAttribute("aria-label"),
    tabel: [...w.querySelectorAll(".fo-tabel tbody")].map((b) => ({ nama: t(b.querySelector("th")), cakup: b.querySelector("th").getAttribute("scope"), kolom: b.querySelector("th").getAttribute("colspan"), label: [...b.querySelectorAll("th[scope=row]")].map(t), kelas: [...b.querySelectorAll("td")].map((td) => td.className), sel: [...b.querySelectorAll("td")].map(t), batang: [...b.querySelectorAll("td")].map(rasio), baris: b.querySelectorAll("tr").length })),
    tabelMeta: { caption: t(w.querySelector(".fo-tabel caption")), kepala: w.querySelectorAll(".fo-tabel thead").length, kolom: w.querySelectorAll(".fo-tabel col").length },
    acuan: acuan ? [...acuan.querySelectorAll(":scope > li")].map((li) => ({ chip: t(li.querySelector(".bb-chip")), kelas: li.querySelector(".bb-chip").className, teks: t(li) })) : null,
    tanpaAcuan: hasil && !acuan ? [...hasil.querySelectorAll(":scope > p.bb-muted")].map(t).filter((x) => x.length) : [],
    uang: uang ? [...uang.querySelectorAll(":scope > li")].map((li) => ({ chip: t(li.querySelector(".bb-chip")), kelas: li.querySelector(".bb-chip").className, teks: t(li) })) : null,
  };
});
const terjemah = (page) => page.evaluate(() => {
  const pola = /-tanpa-backoff/;
  const walk = document.createTreeWalker(document.querySelector(".fo"), NodeFilter.SHOW_TEXT);
  let salah = 0;
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (pola.test(n.textContent) && !n.parentElement.closest('[translate="no"]')) salah++;
  return salah;
});
async function pilih(page, ni, ki) {
  const slider = page.locator(".fo input[type=range]");
  await slider.focus();
  await page.keyboard.press("Home");
  for (let n = 0; n < ki; n++) await page.keyboard.press("ArrowRight");
  await page.locator(".fo .fo-penerima button").nth(ni).click();
  await page.waitForTimeout(30);
}

for (const path of HAL) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await siap(page, path);

  // 1. sebelum menebak
  const awal = await page.evaluate(() => {
    const w = document.querySelector(".fo");
    const t = (e) => (e ? e.textContent.replace(/\s+/g, " ").trim() : "(tidak ada)");
    return {
      peran: w.getAttribute("role"), nama: w.getAttribute("aria-label"), chip: t(w.querySelector(".bb-widget__head .bb-chip")), sumber: t(w.querySelector(".jt-sumber")),
      pilihan: [...w.querySelectorAll(".bb-predict__opts button")].map(t), q: t(w.querySelector(".bb-predict__q")),
      slider: w.querySelectorAll("input").length, tombol: w.querySelectorAll(".fo-penerima button").length, tabel: w.querySelectorAll("table").length, hasil: w.querySelectorAll(".fo-hasil, .fo-ubah, details").length,
      pressed: [...w.querySelectorAll(".bb-predict__opts button")].map((b) => b.getAttribute("aria-pressed")),
    };
  });
  lapor(awal.peran === "group" && awal.nama === D.judul, `${path} grup widget punya nama dari data: "${awal.nama}"`);
  lapor(awal.chip === L.sumber && awal.sumber === D.sumber.teks, `${path} chip sumber "${awal.chip}" dan catatan sumber sama dengan data`);
  lapor(samaJson(awal.pilihan, D.tebak.pilihan) && awal.q === `${L.tebakDulu} ${D.tebak.q}`, `${path} pertanyaan dan ${awal.pilihan.length} pilihan tebakan sama dengan data`);
  lapor(awal.slider === 0 && awal.tombol === 0 && awal.tabel === 0 && awal.hasil === 0, `${path} sebelum menebak: ${awal.slider} penggeser, ${awal.tombol} tombol perangkat, ${awal.tabel} tabel, ${awal.hasil} blok hasil (hasil tersembunyi sampai memilih)`);
  lapor(awal.pressed.every((x) => x === "false"), `${path} sebelum menebak aria-pressed semua false`);
  let st = await status(page);
  lapor(st.length === 2 && st.every((x) => x.teks === ""), `${path} dua wilayah status kosong sebelum menebak`);

  // 2. tebak lewat keyboard: pilihan salah, fokus pindah ke penggeser pengirim
  const salah = D.tebak.pilihan.findIndex((_, i) => i !== D.tebak.jawaban);
  await page.locator(".fo .bb-predict__opts button").nth(salah).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const fokus = await page.evaluate(() => { const a = document.activeElement; const g = getComputedStyle(a); return { garis: g.outlineStyle === "auto" || (g.outlineStyle !== "none" && parseFloat(g.outlineWidth) >= 2), tag: a?.tagName, tipe: a?.type, diUbah: !!a?.closest(".fo-ubah"), pressed: [...document.querySelectorAll(".fo .bb-predict__opts button")].map((b) => b.getAttribute("aria-pressed")), mati: [...document.querySelectorAll(".fo .bb-predict__opts button")].map((b) => b.disabled) }; });
  lapor(fokus.tag === "INPUT" && fokus.tipe === "range" && fokus.diUbah && fokus.garis, `${path} sesudah menebak fokus di penggeser pengirim (${fokus.tag} ${fokus.tipe}, garis fokus terlihat ${fokus.garis})`);
  lapor(fokus.pressed[salah] === "true" && fokus.pressed.filter((x) => x === "true").length === 1 && fokus.mati.every(Boolean), `${path} aria-pressed tebakan ${fokus.pressed.join(",")} dan semua pilihan nonaktif`);
  st = await status(page);
  lapor(st[0].teks === `${L.belum} ${D.tebak.alasan}`, `${path} jawaban tebakan salah: "${st[0].teks.slice(0, 50)}..."`);
  const ni0 = D.penerima.findIndex((x) => x.id === D.awal.penerima);
  const ki0 = D.pengirim.findIndex((x) => x.id === D.awal.pengirim);
  let k = await keadaan(page);
  lapor(k.slider.nilai === ki0 && k.slider.min === "0" && k.slider.max === String(NK - 1), `${path} penggeser mulai di pengirim "${D.awal.pengirim}" (${k.slider.nilai} dari 0 sampai ${k.slider.max})`);
  lapor(k.slider.deskripsi === L.pengirim.petunjuk, `${path} penggeser punya aria-describedby ke petunjuk: "${k.slider.deskripsi.slice(0, 40)}"`);
  lapor(k.penerimaGrup === L.penerimaJudul && samaJson(k.penerima.map((x) => x.teks), D.penerima.map((x) => x.label)) && samaJson(k.penerima.map((x) => x.pressed), D.penerima.map((_, x) => String(x === ni0))), `${path} grup "${k.penerimaGrup}" dengan ${k.penerima.length} tombol, hanya "${D.penerima[ni0].label}" aria-pressed`);
  lapor(harap(ni0, ki0, "lab").kasus === "partisi" && st[1].teks === ringkasHarap(ni0, ki0), `${path} keadaan awal sama dengan yang ditanyakan: "${st[1].teks.slice(0, 80)}..."`);
  lapor(D.tebak.pilihan[D.tebak.jawaban].includes(dur(harap(ni0, ki0, "lab").detik)) && D.tebak.alasan.includes(`sekitar ${dur(harap(ni0, ki0, "lab").detik)}`), `${path} jawaban benar menyebut lama ${dur(harap(ni0, ki0, "lab").detik)} untuk enam partisi`);

  // 3. lima pengirim (keyboard) kali tiga jumlah perangkat (klik)
  const tombol = page.locator(".fo .fo-penerima button");
  const slider = page.locator(".fo input[type=range]");
  let salahState = 0;
  let salahTerjemah = 0;
  const kasusTampil = new Set();
  for (let ki = 0; ki < NK; ki++) {
    await slider.focus();
    await page.keyboard.press("Home");
    for (let n = 0; n < ki; n++) await page.keyboard.press("ArrowRight");
    for (let ni = 0; ni < NP; ni++) {
      await tombol.nth(ni).click();
      await page.waitForTimeout(30);
      const s2 = await status(page);
      k = await keadaan(page);
      const p = D.pengirim[ki];
      const kels = ["sebanyak", "lab"];
      const hs = kels.map((x) => harap(ni, ki, x));
      hs.forEach((h) => kasusTampil.add(h.kasus));
      const tabelHarap = hs.map((h) => ({ nama: h.nama, cakup: "rowgroup", kolom: "2", label: KUNCI.map((x) => L.tabel.kolom[x]), kelas: KUNCI.map(() => `fo-sel is-${h.kasus}`), sel: h.sel, baris: 7 }));
      const tabelSama = samaJson(k.tabel.map(({ batang, ...r }) => r), tabelHarap);
      const batangOk = k.tabel.every((g, x) => g.batang.every((b, i) => (i === 0 ? b && b.aria === "true" && Math.abs(b.persen - hs[x].bar[0]) < 1 : i === 4 ? b && b.aria === "true" && Math.abs(b.persen - hs[x].bar[1]) < 1 : b === null)));
      const ac = acuanHarap(ni, ki);
      const acuanOk = ac.length === 0
        ? k.acuan === null && k.tanpaAcuan.includes(L.tanpaAcuan)
        : k.acuan !== null && k.acuan.length === ac.length && ac.every((x, i) => k.acuan[i].chip === L.acuanJenis[x.jenis] && k.acuan[i].kelas.split(" ").includes(x.jenis === "rekaman" ? "is-system" : "is-warn") && k.acuan[i].teks.includes(x.teks) && k.acuan[i].teks.includes(isi(L.acuanBerkas, { berkas: x.berkas, bagian: x.bagian })));
      const ok =
        k.slider.nilai === ki && k.slider.keluar === p.label && k.slider.text === isi(L.pengirim.nilai, { pengirim: p.label, consumer: rib(hs[0].K) }) && k.slider.label === `${L.pengirim.label}: ${p.label}` &&
        samaJson(k.penerima.map((x) => x.pressed), D.penerima.map((_, x) => String(x === ni))) &&
        s2[1].teks === ringkasHarap(ni, ki) && tabelSama && batangOk && k.tabelMeta.caption === L.tabel.caption && k.tabelMeta.kepala === 0 && k.tabelMeta.kolom === 2 && acuanOk;
      salahTerjemah += await terjemah(page);
      if (!ok) {
        salahState++;
        console.log(`  detail ${D.penerima[ni].id}/${p.id}: slider ${JSON.stringify(k.slider)}; ringkasan sama ${s2[1].teks === ringkasHarap(ni, ki)}; tabel sama ${tabelSama}; batang sama ${batangOk}; meta ${JSON.stringify(k.tabelMeta)}; acuan sama ${acuanOk}; pressed ${k.penerima.map((x) => x.pressed)}`);
      }
    }
  }
  lapor(salahState === 0, `${path} ${NK * NP} kombinasi pengirim dan jumlah perangkat: ringkasan, dua kelompok tabel, enam baris tiap kelompok, kelas sel, lebar batang, aria-pressed, valuetext, dan rekaman sama dengan hitungan alat (${salahState} salah)`);
  lapor(salahTerjemah === 0, `${path} bendera lab bertanda translate=no di ${NK * NP} kombinasi (${salahTerjemah} teks tanpa tanda)`);
  lapor(["cukup", "partisi", "kuota"].every((x) => kasusTampil.has(x)), `${path} ketiga kasus muncul di antara ${NK * NP * 2} kelompok tabel: ${[...kasusTampil].join(", ")}`);

  // 3b. penggeser: Home, End, ArrowLeft tidak keluar jangkauan
  await slider.focus();
  await page.keyboard.press("End");
  const akhir = (await keadaan(page)).slider.nilai;
  await page.keyboard.press("ArrowLeft");
  const mundur = (await keadaan(page)).slider.nilai;
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowLeft");
  const awalLagi = (await keadaan(page)).slider.nilai;
  lapor(akhir === NK - 1 && mundur === NK - 2 && awalLagi === 0, `${path} penggeser: End ${akhir}, ArrowLeft ${mundur}, Home lalu ArrowLeft ${awalLagi}`);
  // fokus tidak jatuh ke body sesudah klik jumlah perangkat, dan Tab dari penggeser melewati tiga tombol lalu ringkasan batas
  await tombol.nth(1).click();
  const sesudahKlik = await page.evaluate(() => ({ tag: document.activeElement?.tagName, teks: document.activeElement?.textContent.trim(), pressed: document.activeElement?.getAttribute("aria-pressed") }));
  lapor(sesudahKlik.tag === "BUTTON" && sesudahKlik.teks === D.penerima[1].label && sesudahKlik.pressed === "true", `${path} sesudah klik jumlah perangkat fokus tetap di tombol itu (${sesudahKlik.tag} "${sesudahKlik.teks}")`);
  await slider.focus();
  const urutan = [];
  const garisTab = [];
  for (let i = 0; i < NP + 1; i++) {
    await page.keyboard.press("Tab");
    urutan.push(await page.evaluate(() => document.activeElement?.textContent.replace(/\s+/g, " ").trim()));
    garisTab.push(await page.evaluate(() => { const g = getComputedStyle(document.activeElement); return g.outlineStyle === "auto" || (g.outlineStyle !== "none" && parseFloat(g.outlineWidth) >= 2); }));
  }
  lapor(samaJson(urutan, [...D.penerima.map((x) => x.label), L.batasJudul]) && garisTab.every(Boolean), `${path} Tab dari penggeser: ${urutan.join(" > ")}; garis fokus terlihat (>= 2 px) di tiap kontrol: ${garisTab.every(Boolean)}`);
  await page.keyboard.press("Enter");
  const bukaBatas = await page.evaluate(() => {
    const d = document.querySelector(".fo details");
    return { open: d.open, items: [...d.querySelectorAll("li")].map((li) => ({ chip: li.querySelector(".bb-chip").textContent.trim(), teks: li.textContent.replace(/\s+/g, " ").trim() })) };
  });
  lapor(bukaBatas.open && bukaBatas.items.length === D.batas.length && D.batas.every((b, i) => bukaBatas.items[i].chip === L.dasar[b.dasar] && bukaBatas.items[i].teks.includes(b.teks)), `${path} Enter membuka batas: ${bukaBatas.items.length} butir dengan label dasar sama dengan data`);
  await page.keyboard.press("Enter");
  // blok uang: judul, dua chip Rekaman lab (is-system), kalimat dan berkas di bawahnya
  k = await keadaan(page);
  lapor(k.uang !== null && k.uang.length === D.uang.length && D.uang.every((u, i) => k.uang[i].chip === L.acuanJenis.rekaman && k.uang[i].kelas.split(" ").includes("is-system") && k.uang[i].teks.includes(u.teks) && k.uang[i].teks.includes(isi(L.acuanBerkas, { berkas: u.berkas, bagian: u.bagian }))), `${path} blok "${L.uangJudul}": ${k.uang?.length} butir Rekaman lab, kalimat dan berkas sama dengan data`);
  const judulUang = await page.$$eval(".fo .fo-judul", (e) => e.map((x) => x.textContent.trim()));
  lapor(samaJson(judulUang, [L.ubahJudul, L.acuanJudul, L.uangJudul]), `${path} judul blok: ${judulUang.join(" | ")}`);

  // 4. role=status, target, ukuran huruf, istilah kode
  st = await status(page);
  lapor(st.length === 2 && st.every((x) => x.n === 1 && x.teks.length > 0 && x.teks.length <= 240), `${path} role=status: ${st.length} wilayah, satu paragraf, panjang ${st.map((x) => x.teks.length).join(" dan ")} karakter`);
  // <output> berperan status dan aria-live polite secara implisit: tanpa aria-live="off" tiap gerakan penggeser diumumkan dua kali
  const hidup = await page.$$eval(".fo [role=status], .fo [aria-live]:not([aria-live=off]), .fo output:not([aria-live=off])", (e) => e.length);
  lapor(hidup === 2, `${path} wilayah live aktif termasuk <output> implisit: ${hidup} (harus 2: dua role=status; output memakai aria-live=off)`);
  const kecil = await page.$$eval(".fo button, .fo input", (b) => b.map((x) => x.getBoundingClientRect()).filter((r) => r.width < 24 || r.height < 24).length);
  lapor(kecil === 0, `${path} target >= 24 px: ${kecil} kontrol terlalu kecil`);
  const huruf = await page.evaluate(() => {
    const w = document.querySelector(".fo");
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
  // batang consumer dan kuota hanya hiasan tetapi harus terlihat: tinggi >= 4 px, isi (garis atas tebal, tanpa background supaya contrast.py bisa membaca) berwarna, aria-hidden
  const batang = await page.evaluate(() => [...document.querySelectorAll(".fo .fo-batang")].map((b) => { const i = b.querySelector(".fo-isi"); const cs = getComputedStyle(i); return { tinggi: b.getBoundingClientRect().height, isi: i.getBoundingClientRect().height, warna: cs.borderTopColor, isiGaris: cs.borderTopWidth, garis: getComputedStyle(b).borderTopWidth, aria: b.getAttribute("aria-hidden") }; }));
  lapor(batang.length === 4 && batang.every((b) => b.tinggi >= 4 && b.isi >= 3 && parseFloat(b.isiGaris) >= 3 && b.warna !== "rgba(0, 0, 0, 0)" && parseFloat(b.garis) >= 1 && b.aria === "true"), `${path} batang consumer dan kuota: ${batang.length} batang (4 diharapkan), tinggi ${batang.map((b) => b.tinggi.toFixed(0)).join(",")} px, berwarna dan berbingkai, aria-hidden`);
  await pilih(page, 2, NK - 1);
  const kode = await page.evaluate(() => ({ kode: [...document.querySelectorAll(".fo code")].length, tanpa: [...document.querySelectorAll(".fo code")].filter((c) => c.getAttribute("translate") !== "no").length, teks: [...document.querySelectorAll(".fo code")].map((c) => c.textContent) }));
  lapor(kode.kode === 1 && kode.tanpa === 0 && kode.teks[0] === "-tanpa-backoff", `${path} bendera lab di <code translate=no>: ${kode.kode} elemen (${kode.teks.join(",")}), ${kode.tanpa} tanpa tanda`);
  const semuaTeks = (await page.locator(".fo").innerText()).replace(/t5-fanout/g, "");
  lapor(!/\bHP\b|konsumen|partition|sender|pemberitahuan/i.test(semuaTeks) && /\bperangkat\b/.test(semuaTeks) && /\bconsumer\b/.test(semuaTeks), `${path} satu kata untuk konsepnya: perangkat, consumer, partisi, pengirim (tanpa HP, konsumen, partition, sender, pemberitahuan)`);

  // 5. axe gelap dan terang pada tiga kasus warna sel
  const kasusKeadaan = [[2, 3], [2, 4], [0, 1]];
  for (const [ni, ki] of kasusKeadaan) {
    await pilih(page, ni, ki);
    for (const tema of ["dark", "light"]) {
      await page.evaluate((x) => { document.documentElement.dataset.theme = x; }, tema);
      await page.waitForTimeout(80);
      await page.addScriptTag({ path: AXE_PATH });
      const v = await page.evaluate(async (tag) => { const r = await window.axe.run(document.querySelector(".fo"), { runOnly: { type: "tag", values: tag }, resultTypes: ["violations"] }); return r.violations.map((x) => `${x.id}(${x.nodes.length})`); }, TAG_WCAG);
      lapor(v.length === 0, `${path} axe ${tema} (${D.penerima[ni].id}, ${D.pengirim[ki].id}): ${v.length ? v.join(", ") : "0 pelanggaran"}`);
      // kontras teks sel tabel dihitung sendiri (>= 4,5:1): teks yang warnanya sama dengan latarnya lolos axe di Chrome sistem bila sel dianggap tak terbaca
      const kontras = await page.evaluate(() => {
        const lum = (c) => { const [r, g, b] = c.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(Number).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        return [...document.querySelectorAll(".fo-sel")].map((td) => { const cs = getComputedStyle(td); const x = lum(cs.color); const y = lum(cs.backgroundColor); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); });
      });
      lapor(kontras.length === 12 && kontras.every((r) => r >= 4.5), `${path} kontras teks sel ${tema} (${D.penerima[ni].id}, ${D.pengirim[ki].id}): terendah ${Math.min(...kontras).toFixed(1)}:1 dari ${kontras.length} sel (>= 4,5)`);
    }
  }
  await page.close();

  // 6. tebakan benar, reduced motion tanpa transisi atau animasi dan fungsi tetap
  const benar = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await siap(benar, path);
  await benar.locator(".fo .bb-predict__opts button").nth(D.tebak.jawaban).focus();
  await benar.keyboard.press("Space");
  await benar.waitForTimeout(100);
  const stB = await status(benar);
  const kelasB = await benar.$eval(".fo .bb-predict__a", (e) => e.className);
  lapor(stB[0].teks === `${L.benar} ${D.tebak.alasan}` && kelasB.includes("is-good"), `${path} tebakan benar: "${stB[0].teks.slice(0, 40)}..."`);
  const gerakAwal = await benar.evaluate(() => [...document.querySelectorAll(".fo, .fo *")].filter((e) => { const s = getComputedStyle(e); return parseFloat(s.transitionDuration) > 0 || (s.animationName !== "none" && parseFloat(s.animationDuration) > 0); }).length);
  await benar.emulateMedia({ reducedMotion: "reduce" });
  await benar.locator(".fo .fo-penerima button").nth(2).click();
  const gerak = await benar.evaluate(() => [...document.querySelectorAll(".fo, .fo *")].filter((e) => { const s = getComputedStyle(e); return parseFloat(s.transitionDuration) > 0 || (s.animationName !== "none" && parseFloat(s.animationDuration) > 0); }).length);
  const tetap = (await keadaan(benar)).penerima.map((x) => x.pressed).join() === "false,false,true";
  lapor(gerakAwal === 0 && gerak === 0 && tetap, `${path} tanpa gerak: ${gerakAwal} elemen bergerak, reduced motion ${gerak}, fungsi tetap`);
  await benar.close();

  // 7. 320 px dengan font Verdana (lebih lebar dari Satoshi): tanpa gulir ke samping, tanpa kata terpotong di sel
  const kecilHalaman = await browser.newPage({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
  await siap(kecilHalaman, path);
  await kecilHalaman.addStyleTag({ content: ".sl-markdown-content, .sl-markdown-content * { font-family: Verdana, sans-serif !important; }" });
  await kecilHalaman.locator(".fo .bb-predict__opts button").nth(2).click();
  const ukurKecil = async () => kecilHalaman.evaluate(() => {
    const w = document.querySelector(".fo").getBoundingClientRect();
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
    for (const c of document.querySelectorAll(".fo table :is(td, th)")) {
      const cs = getComputedStyle(c);
      const lebarIsi = c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (ukur(c, c.textContent) > lebarIsi + 0.5) sempit.push(c.textContent.trim());
    }
    const nilaiLebar = [...document.querySelectorAll(".fo table td")].map((td) => td.getBoundingClientRect().width);
    const labelLebar = [...document.querySelectorAll(".fo table th[scope=row]")].map((th) => th.getBoundingClientRect().width);
    const meluap = [...document.querySelectorAll(".fo table :is(td, th)")].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.textContent.trim());
    return { halaman: document.documentElement.scrollWidth, kanan: Math.round(w.right), kiri: Math.round(w.left), tabel: [...document.querySelectorAll(".fo table")].map((t) => t.scrollWidth - t.parentElement.clientWidth), sempit, meluap, nilaiLebih: Math.min(...nilaiLebar) > Math.max(...labelLebar) };
  });
  const u320 = [];
  for (const [ni, ki] of [[2, 3], [2, 4], [1, 2], [0, 1]]) {
    await kecilHalaman.locator(".fo input[type=range]").focus();
    await kecilHalaman.keyboard.press("Home");
    for (let n = 0; n < ki; n++) await kecilHalaman.keyboard.press("ArrowRight");
    await kecilHalaman.locator(".fo .fo-penerima button").nth(ni).click();
    await kecilHalaman.waitForTimeout(60);
    u320.push({ ni, ki, ...(await ukurKecil()) });
  }
  await kecilHalaman.locator(".fo details summary").click();
  const bukaWidth = await kecilHalaman.evaluate(() => ({ halaman: document.documentElement.scrollWidth, kanan: Math.round(document.querySelector(".fo").getBoundingClientRect().right) }));
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
    const e = document.querySelector(".fo");
    const tabel = document.querySelector("table.tm-tabel");
    return {
      display: e ? getComputedStyle(e).display : "tidak ada", isi: document.body.innerText.replace(/\s+/g, " "),
      baris: tabel ? [...tabel.querySelectorAll("tbody tr")].map((r) => [...r.children].map((c) => c.textContent.replace(/\s+/g, " ").trim())) : [],
      kolom: tabel ? [...tabel.querySelectorAll("thead th")].map((c) => c.textContent.trim()) : [],
    };
  });
  lapor(ns.display === "none", `${path} tanpa JavaScript: widget display ${ns.display}`);
  const barisHarap = D.pengirim.map((p, ki) => [p.label, ...D.penerima.map((_, ni) => { const a = harap(ni, ki, "sebanyak"); const b = harap(ni, ki, "lab"); return `${a.nama}: ${a.sel[3]}; ${b.nama}: ${b.sel[3]}`; })]);
  lapor(samaJson(ns.baris, barisHarap) && samaJson(ns.kolom, [L.noscriptPengirim, ...D.penerima.map((n) => n.label)]), `${path} tanpa JavaScript: tabel ${ns.baris.length} pengirim kali ${NP} jumlah perangkat sama dengan hitungan alat`);
  const semuaNs = [L.tanpaJs, D.sumber.teks, D.tebak.q, D.tebak.alasan, L.noscriptCaption, L.acuanJudul, L.uangJudul, L.batasJudul, ...D.acuan.map((a) => a.teks), ...D.uang.map((u) => u.teks), ...D.batas.map((b) => b.teks), ...D.batas.map((b) => L.dasar[b.dasar])];
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
        await p.waitForFunction(() => document.querySelector(".fo .bb-predict__opts button") && !document.querySelector("astro-island[ssr] .fo"), null, { timeout: 15000 });
        await p.locator(".fo .bb-predict__opts button").nth(0).click();
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
console.log(gagal ? `Widget fanout GAGAL (${gagal})` : `Widget fanout: tebak dulu, ${NK * NP} kombinasi pengirim dan jumlah perangkat dari hitungan sendiri, ARIA, keyboard, target, 320 px, axe, reduced motion, tanpa JavaScript, CLS lolos (${HAL.length} halaman)`);
process.exit(gagal ? 1 : 0);
