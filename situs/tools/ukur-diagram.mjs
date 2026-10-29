// Memeriksa fondasi diagram (I4, keputusan 232) di halaman uji /uji/diagram/:
// - tanpa JS: versi statis terlihat, role="img" dengan aria-label;
// - dengan JS: React Flow terpasang, tegak di 375 px dan mendatar di 1366 px, semua kotak di dalam wadah;
// - di 375×667 roda dan gestur sentuh di atas diagram tetap menggulir halaman (scroll tidak tertangkap);
// - kotak bisa dicapai dengan Tab dan dibuka dengan Enter, klik, atau tap; catatan muncul di bawah diagram;
// - dengan reduced motion: 0 animasi sesudah memilih kotak; fungsi tetap;
// - CLS ≤ 0,1 saat island di-hydrate: gulir pelan dengan modul JS ditunda 300 ms (HP dan desktop); tap tiap tab
//   beranda (Tahap 2–6) sebelum hydrate: geser 0 px dan CLS 0 (keputusan 248, K1xa);
// - label bawaan React Flow berbahasa Inggris tidak terbaca pembaca layar (A11y-diagram, pola keputusan 466): di halaman
//   uji, beranda, dan setiap halaman lain di dist/ yang memakai DiagramArsitektur.
//   node tools/ukur-diagram.mjs --url http://127.0.0.1:4321
//   node tools/ukur-diagram.mjs --url ... --axe   # + axe-core, gelap dan terang
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";
import { pilihAxe } from "./lib/axe.mjs";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const url = arg("--url", "http://127.0.0.1:4321") + "/uji/diagram/";
const AXE = pilihAxe(); // --axe: axe-core terpasang (lib/axe.mjs, keputusan 693); --axe <file>: file lain

const browser = awasi(await chromium.launch(), { alat: "diagram" }); // batas waktu per halaman (keputusan 360)
let gagal = 0;
const lapor = (ok, pesan) => {
  console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`);
  if (!ok) gagal++;
};

// CLS menurut definisi web.dev (https://web.dev/articles/cls): jendela sesi terbesar, geser berjarak < 1 s dan satu
// jendela paling lama 5 s; geser dalam 500 ms sesudah input (hadRecentInput) tidak dihitung. Baik ≤ 0,1.
const pasangCls = (ctx) =>
  ctx.addInitScript(() => {
    const c = (window.__cls = { nilai: 0, sesi: 0, awal: 0, akhir: 0, besar: 0, contoh: "", geser: 0 });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        // Jarak geser terbesar (px) dari elemen sumber, selain nilai CLS yang dibobot luas layar.
        for (const s of e.sources ?? []) c.geser = Math.max(c.geser, Math.abs(s.currentRect.y - s.previousRect.y), Math.abs(s.currentRect.x - s.previousRect.x));
        if (c.sesi && e.startTime - c.akhir < 1000 && e.startTime - c.awal < 5000) c.sesi += e.value;
        else [c.sesi, c.awal] = [e.value, e.startTime];
        c.akhir = e.startTime;
        c.nilai = Math.max(c.nilai, c.sesi);
        if (e.value > c.besar) {
          c.besar = e.value;
          const n = e.sources?.[0]?.node;
          c.contoh = `${e.value.toFixed(4)} ${n?.nodeName?.toLowerCase() ?? "?"}.${String(n?.className ?? "").split(" ")[0]}`;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
// Bawaan React Flow 12.12 yang sampai ke pembaca layar (A11y-diagram, pola keputusan 466): aria-roledescription
// ("node", "edge"), aria-label "Edge from k-0-0 to k-0-1" (bahasa Inggris dan ID internal), aria-describedby ke
// kalimat bawaan "Press enter or space to select ...", <svg> pembungkus garis yang terbaca sebagai "image" tanpa
// nama, atau pembungkus role="application" tanpa nama (keputusan 682). Elemen di dalam aria-hidden="true" tidak dibacakan, jadi tidak dihitung. Mengembalikan daftar temuan; kosong = lolos.
const bawaanTerbaca = (page, sel = "figure.diagram") =>
  page.evaluate((sel) => {
    const temuan = [];
    for (const f of document.querySelectorAll(sel)) {
      for (const x of f.querySelectorAll("*")) {
        if (x.closest('[aria-hidden="true"]')) continue;
        const rd = x.getAttribute("aria-roledescription");
        const label = x.getAttribute("aria-label") ?? "";
        const desk = (x.getAttribute("aria-describedby") ?? "")
          .split(/\s+/)
          .filter(Boolean)
          .map((i) => document.getElementById(i)?.textContent ?? "")
          .join(" ");
        const alasan = [
          rd !== null && `roledescription "${rd}"`,
          /^Edge from |\bk-\d+-\d+\b/.test(label) && `label "${label}"`,
          /Press enter|select an? (node|edge)/i.test(desk) && `describedby "${desk.slice(0, 40)}"`,
          x.tagName.toLowerCase() === "svg" && x.closest(".react-flow__edges") && "svg garis terbaca",
          // WAI-ARIA 1.2: role application wajib bernama (keputusan 682).
          x.getAttribute("role") === "application" && !(x.getAttribute("aria-label") ?? "").trim() && !x.hasAttribute("aria-labelledby") && "application tanpa nama",
        ].filter(Boolean);
        if (alasan.length) temuan.push(`${x.tagName.toLowerCase()}.${String(x.className.baseVal ?? x.className).split(" ")[0] || "-"} ${alasan.join(", ")}`);
      }
    }
    return temuan;
  }, sel);
const laporBawaan = (t, tag) => lapor(t.length === 0, `${tag}: bawaan React Flow (label Inggris, svg garis, application tanpa nama) terbaca ${t.length}${t.length ? ` (${[...new Set(t)].slice(0, 3).join("; ")})` : ""}`);

const tundaJs = (page, ms) =>
  page.route(/\/_astro\/.+\.js(\?.*)?$/, async (rute) => {
    await new Promise((s) => setTimeout(s, ms));
    await rute.continue().catch(() => {});
  });

// 1. Tanpa JS.
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();
  await page.goto(url);
  const r = await page.evaluate(() =>
    [...document.querySelectorAll("figure.diagram")].map((f) => {
      const img = f.querySelector('[role="img"]');
      const b = img?.getBoundingClientRect();
      return { label: img?.getAttribute("aria-label") ?? "", tinggi: b?.height ?? 0, flow: !!f.querySelector(".react-flow") };
    }),
  );
  lapor(r.length === 2 && r.every((x) => x.label.length > 20 && x.tinggi > 20 && !x.flow), `tanpa JS: ${r.length} diagram statis, tinggi ${r.map((x) => Math.round(x.tinggi)).join("/")} px`);
  await ctx.close();
}

async function siap(page) {
  await page.goto(url, { waitUntil: "networkidle" });
  for (const f of await page.locator("figure.diagram").all()) await f.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll("figure.diagram")].every((f) => f.querySelector(".react-flow__node .diagram__kotak")));
  await page.evaluate(() => window.scrollTo(0, 0));
}

for (const [lebar, tinggi, arahHarus] of [
  [375, 667, "tegak"],
  [1366, 657, "mendatar"],
]) {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const ctx = await browser.newContext({ viewport: { width: lebar, height: tinggi }, reducedMotion, hasTouch: lebar < 500 });
    const page = await ctx.newPage();
    await siap(page);
    const tag = `${lebar}×${tinggi} ${reducedMotion}`;

    // 2. Bentuk dan isi wadah.
    const bentuk = await page.evaluate(() =>
      [...document.querySelectorAll("figure.diagram")].map((f) => {
        const w = f.querySelector(".diagram__wadah").getBoundingClientRect();
        const luar = [...f.querySelectorAll(".react-flow__node")].filter((n) => {
          const b = n.getBoundingClientRect();
          return b.left < w.left - 1 || b.right > w.right + 1 || b.top < w.top - 1 || b.bottom > w.bottom + 1;
        }).length;
        return { arah: f.dataset.arah, kotak: f.querySelectorAll(".diagram__kotak").length, luar, statisSr: f.querySelector('[role="img"]').classList.contains("sr-only") };
      }),
    );
    lapor(
      bentuk.every((b) => b.arah === arahHarus && b.kotak === 3 && b.luar === 0 && b.statisSr),
      `${tag}: ${bentuk.map((b) => `${b.arah}, ${b.kotak} kotak, ${b.luar} di luar wadah`).join(" | ")}`,
    );
    laporBawaan(await bawaanTerbaca(page), tag);

    // 3. Scroll tidak tertangkap (hanya layar sempit, tempat jari paling sering mendarat di diagram).
    if (lebar < 500) {
      const kotak = page.locator("figure.diagram .react-flow__pane").first();
      await kotak.scrollIntoViewIfNeeded();
      const b = await kotak.boundingBox();
      const cx = b.x + b.width / 2;
      const cy = b.y + Math.min(b.height / 2, 200);
      const y0 = await page.evaluate(() => window.scrollY);
      await page.mouse.move(cx, cy);
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(300);
      const y1 = await page.evaluate(() => window.scrollY);
      lapor(y1 > y0, `${tag}: roda di atas diagram ${y0}→${y1}`);
      // Gestur sentuh: sekali di atas paragraf (kontrol), sekali di atas diagram. Posisi diukur ulang sesudah tiap gulir.
      // Chromium headless di runner Linux tidak menjalankan gestur sentuh sintetis sama sekali (CI #145 percobaan 1);
      // bila kontrol tidak bergerak, gestur dilaporkan "info" dan touch-action yang jadi buktinya.
      const cdp = await ctx.newCDPSession(page);
      const geser = async (sel) => {
        await page.locator(sel).first().scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy(0, -80));
        const b = await page.locator(sel).first().boundingBox();
        const a = await page.evaluate(() => window.scrollY);
        await cdp.send("Input.synthesizeScrollGesture", { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + Math.min(b.height / 2, 150)), yDistance: -200, gestureSourceType: "touch", speed: 1200 });
        await page.waitForTimeout(300);
        return [a, await page.evaluate(() => window.scrollY)];
      };
      const [k0, k1] = await geser("main p");
      const [d0, d1] = await geser("figure.diagram .react-flow__pane");
      // Jari yang mendarat di kotak (tombol, sejak keputusan 681 menerima pointer) tetap menggulir halaman.
      const [t0, t1] = await geser("figure.diagram .diagram__kotak");
      const ta = await page.evaluate(() => getComputedStyle(document.querySelector("figure.diagram .react-flow__pane")).touchAction);
      const taOk = ta.includes("pan-y") || ta === "auto" || ta === "manipulation";
      if (k1 > k0) lapor(d1 > d0 && t1 > t0 && taOk, `${tag}: sentuh di paragraf ${k0}→${k1}, di atas diagram ${d0}→${d1}, di atas kotak ${t0}→${t1}, touch-action ${ta}`);
      else {
        console.log(`info ${tag}: gestur sentuh sintetis tidak berjalan di lingkungan ini (paragraf ${k0}→${k1})`);
        lapor(taOk, `${tag}: touch-action panel ${ta}`);
      }
    }

    // 4. Keyboard: Tab dari tombol sebelum diagram mendarat di kotak pertama, Enter membuka catatan.
    await page.evaluate(() => {
      const f = document.querySelector("figure.diagram");
      const p = document.createElement("button");
      p.id = "uji-sebelum";
      p.textContent = "sebelum";
      f.before(p);
    });
    await page.focus("#uji-sebelum");
    await page.keyboard.press("Tab");
    const fokus = await page.evaluate(() => document.activeElement?.className ?? "");
    const awalAnim = await page.evaluate(() => document.getAnimations().length);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(50);
    const r = await page.evaluate(() => {
      const f = document.querySelector("figure.diagram");
      const cat = f.querySelector(".diagram__catatan");
      const w = f.querySelector(".diagram__wadah").getBoundingClientRect();
      return {
        catatan: cat.textContent,
        diBawah: cat.getBoundingClientRect().top >= w.bottom - 1,
        ditekan: document.activeElement?.getAttribute("aria-pressed"),
        anim: document.getAnimations().length,
      };
    });
    lapor(
      fokus.includes("diagram__kotak") && r.catatan.startsWith("App Flutter.") && r.diBawah && r.ditekan === "true",
      `${tag}: Tab ke "${fokus}", Enter → "${r.catatan}"`,
    );
    if (reducedMotion === "reduce") lapor(awalAnim === 0 && r.anim === 0, `${tag}: animasi ${awalAnim} sebelum, ${r.anim} sesudah memilih`);

    // 4b. Klik (desktop) dan tap (HP) di tengah kotak kedua sampai ke tombolnya, bukan ke pane di belakangnya:
    // React Flow memberi node tanpa handler pointer-events none (tinjauan #274, keputusan 681). Klik lewat koordinat,
    // bukan element.click(), supaya hit test ikut diuji.
    {
      const k2 = page.locator("figure.diagram").first().locator(".diagram__kotak").nth(1);
      await k2.scrollIntoViewIfNeeded();
      const b = await k2.boundingBox();
      const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
      const kena = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest(".diagram__kotak"), [x, y]);
      if (lebar < 500) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
      await page.waitForTimeout(100);
      const label = (await k2.locator(".diagram__label").textContent()).trim();
      const cat = (await page.locator("figure.diagram").first().locator(".diagram__catatan").textContent()).trim();
      const ditekan = await k2.getAttribute("aria-pressed");
      lapor(kena && cat.startsWith(`${label}.`) && ditekan === "true", `${tag}: ${lebar < 500 ? "tap" : "klik"} di tengah "${label}" ${kena ? "kena tombol" : "kena pane"} → "${cat.slice(0, 40)}", aria-pressed ${ditekan}`);
    }

    if (AXE) {
      for (const tema of ["dark", "light"]) {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
        await page.addScriptTag({ path: AXE });
        const v = await page.evaluate(async () => {
          document.getElementById("uji-sebelum")?.remove();
          const x = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
          return x.violations.map((p) => `${p.id}(${p.nodes.length})`);
        });
        lapor(v.length === 0, `axe ${tag} ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
      }
    }
    await ctx.close();
  }
}

// 5. Peta tahap di beranda (I5b, keputusan 248): satu diagram yang berganti mengikuti tab.
// Tahap 1 tegak di HP dan mendatar di desktop; Tahap 3 enam kotak; Tahap 6 (proyeksi) tanpa React Flow;
// berganti tahap = gerak masuk (0 animasi saat reduced); roda di atas diagram tetap menggulir halaman di HP.
const beranda = url.replace(/\/uji\/diagram\/$/, "/");
for (const [lebar, tinggi, arahHarus] of [
  [375, 667, "tegak"],
  [1366, 657, "mendatar"],
]) {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const ctx = await browser.newContext({ viewport: { width: lebar, height: tinggi }, reducedMotion, hasTouch: lebar < 500 });
    const page = await ctx.newPage();
    const tag = `beranda ${lebar}×${tinggi} ${reducedMotion}`;
    await page.goto(beranda, { waitUntil: "networkidle" });
    await page.locator("[data-peta-diagram]").scrollIntoViewIfNeeded();
    await page.waitForSelector("[data-peta-diagram] .react-flow__node .diagram__kotak");
    const satu = await page.evaluate(() => ({ arah: document.querySelector("[data-peta-diagram] figure.diagram")?.dataset.arah, kotak: document.querySelectorAll("[data-peta-diagram] .diagram__kotak").length, anim: document.getAnimations().length }));
    lapor(satu.arah === arahHarus && satu.kotak === 3 && satu.anim === 0, `${tag}: Tahap 1 ${satu.arah}, ${satu.kotak} kotak, ${satu.anim} animasi sebelum memilih`);
    laporBawaan(await bawaanTerbaca(page, "[data-peta-diagram]"), `${tag} Tahap 1`);
    // Klik, lalu tunggu frame pertama yang sudah berisi Tahap 3 (render React sesudah event tab bisa satu task kemudian).
    const awal = await page.evaluate(async () => {
      document.getElementById("tab-tahap-3").click();
      const isi = () => document.querySelector("[data-peta-diagram]");
      for (let i = 0; i < 60 && isi().dataset.petaDiagram !== "3"; i++) await new Promise((s) => requestAnimationFrame(() => s()));
      return { opacity: Number(getComputedStyle(isi()).opacity), anim: document.getAnimations().length };
    });
    await page.waitForFunction(() => document.querySelector("[data-peta-diagram]")?.dataset.petaDiagram === "3" && document.querySelectorAll("[data-peta-diagram] .react-flow__node .diagram__kotak").length === 6);
    await page.waitForTimeout(400);
    const tiga = await page.evaluate(() => {
      const f = document.querySelector("[data-peta-diagram] figure.diagram");
      const w = f.querySelector(".diagram__wadah").getBoundingClientRect();
      const luar = [...f.querySelectorAll(".react-flow__node")].filter((n) => {
        const b = n.getBoundingClientRect();
        return b.left < w.left - 1 || b.right > w.right + 1 || b.top < w.top - 1 || b.bottom > w.bottom + 1;
      }).length;
      return { label: f.querySelector('[role="img"]').getAttribute("aria-label"), luar, opacity: Number(getComputedStyle(f.parentElement).opacity) };
    });
    const gerakOk = reducedMotion === "reduce" ? awal.anim === 0 && awal.opacity === 1 : awal.anim > 0 && awal.opacity < 1;
    lapor(gerakOk && tiga.luar === 0 && tiga.opacity === 1 && tiga.label.includes("Tahap 3"), `${tag}: pilih Tahap 3 → frame pertama opacity ${awal.opacity.toFixed(2)}, ${awal.anim} animasi, ${tiga.luar} kotak di luar wadah, akhir opacity ${tiga.opacity}`);
    laporBawaan(await bawaanTerbaca(page, "[data-peta-diagram]"), `${tag} Tahap 3`);
    if (lebar < 500 && reducedMotion === "no-preference") {
      const pane = page.locator("[data-peta-diagram] .react-flow__pane").first();
      await pane.scrollIntoViewIfNeeded();
      const b = await pane.boundingBox();
      const y0 = await page.evaluate(() => window.scrollY);
      await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 200));
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(300);
      const y1 = await page.evaluate(() => window.scrollY);
      lapor(y1 > y0, `${tag}: roda di atas diagram ${y0}→${y1}`);
    }
    await page.click("#tab-tahap-6");
    await page.waitForFunction(() => document.querySelector("[data-peta-diagram]")?.dataset.petaDiagram === "6");
    const enam = await page.evaluate(() => ({ flow: !!document.querySelector("[data-peta-diagram] .react-flow"), teks: document.querySelector("[data-peta-diagram]").innerText.trim() }));
    // innerText: hanya teks yang tampil, tanpa kaki pesanan .peta__pesan (display: none, K1xa).
    lapor(!enam.flow && enam.teks.includes("proyeksi") && !enam.teks.includes("Tahap 1"), `${tag}: Tahap 6 "${enam.teks}"`);
    if (AXE && reducedMotion === "no-preference") {
      await page.click("#tab-tahap-1");
      await page.waitForSelector("[data-peta-diagram] .react-flow__node .diagram__kotak");
      await page.waitForTimeout(400);
      for (const tema of ["dark", "light"]) {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
        await page.addScriptTag({ path: AXE });
        const v = await page.evaluate(async () => {
          const x = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
          return x.violations.map((p) => `${p.id}(${p.nodes.length})`);
        });
        lapor(v.length === 0, `axe ${tag} ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
      }
    }
    await ctx.close();
  }
}

// 6. Tab dipilih sebelum island di-hydrate (temuan review PR #161, keputusan 248). Di HP, tap satu tab saat island
// diagram belum jalan, lalu gulir ke diagram. Modul JS diperlambat 1,5 detik sesudah halaman dimuat (seperti jaringan
// lambat), dan setiap frame dicatat: selama panel tahap itu terbuka, tidak boleh ada frame dengan diagram tahap lain
// (versi statis Tahap 1 dari SSR) yang terlihat. Tanpa JS: panel dan diagram Tahap 1 terlihat bersama.
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();
  await page.goto(beranda);
  const r = await page.evaluate(() => {
    const d = document.querySelector("[data-peta-diagram]");
    const panel = [...document.querySelectorAll("[data-panel]")].filter((p) => !p.hidden).map((p) => p.id);
    return { no: d.dataset.petaDiagram, terlihat: d.checkVisibility({ visibilityProperty: true }), label: d.querySelector('[role="img"]').getAttribute("aria-label").slice(0, 30), panel };
  });
  lapor(r.no === "1" && r.terlihat && r.label.includes("Tahap 1") && r.panel.join() === "panel-tahap-1", `beranda tanpa JS: panel ${r.panel.join()}, diagram ${r.no} ${r.terlihat ? "terlihat" : "tersembunyi"} "${r.label}"`);
  await ctx.close();
}
// Diukur untuk setiap tab selain Tahap 1 (tahap SSR), satu konteks baru per tab (K1xa): sesudah hydrate, kaki diagram
// (caption dan catatan) tahap itu harus menempati tinggi yang sama dengan pesanan sebelum hydrate, jadi geser 0 px.
const tabPeta = await (async () => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(beranda);
  const no = await page.$$eval(".peta__pilih", (b) => b.map((x) => x.dataset.no));
  await ctx.close();
  return no.slice(1);
})();
for (const no of tabPeta) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  await pasangCls(ctx);
  const page = await ctx.newPage();
  await page.goto(beranda, { waitUntil: "networkidle" });
  await tundaJs(page, 1500);
  await page.evaluate((no) => {
    const f = (window.__frame = { total: 0, salah: 0, kosong: 0, contoh: "", jalan: true });
    const cek = () => {
      const d = document.querySelector("[data-peta-diagram]");
      const tab = document.querySelector(".peta__pilih[aria-selected='true']")?.dataset.no;
      if (d && tab === no) {
        f.total++;
        const terlihat = d.checkVisibility({ visibilityProperty: true });
        if (!terlihat) f.kosong++;
        else if (d.dataset.petaDiagram !== tab) {
          f.salah++;
          f.contoh ||= `${d.closest("astro-island[ssr]") ? "sebelum" : "sesudah"} hydrate: ${d.querySelector('[role="img"]')?.getAttribute("aria-label")?.slice(0, 20)}`;
        }
      }
      if (f.jalan) requestAnimationFrame(cek);
    };
    requestAnimationFrame(cek);
  }, no);
  const belum = await page.evaluate(() => !!document.querySelector("[data-peta-diagram]").closest("astro-island[ssr]"));
  await page.tap(`#tab-tahap-${no}`);
  await page.evaluate(() => document.querySelector("[data-peta-diagram]").scrollIntoView({ block: "center" }));
  // Hydrate selesai: diagram tahap ini terpasang (React Flow dengan kotak, atau catatan proyeksi tanpa React Flow).
  await page.waitForFunction((no) => {
    const d = document.querySelector("[data-peta-diagram]");
    return d?.dataset.petaDiagram === no && !d.closest("astro-island[ssr]") && (!d.querySelector(":scope > figure.diagram") || d.querySelectorAll(".react-flow__node .diagram__kotak").length > 0);
  }, no, { timeout: 15000 });
  await page.waitForTimeout(300);
  const f = await page.evaluate(() => {
    window.__frame.jalan = false;
    return { ...window.__frame, akhir: document.querySelector("[data-peta-diagram]").checkVisibility({ visibilityProperty: true }) };
  });
  lapor(belum && f.total > 0 && f.salah === 0 && f.akhir, `beranda 375×667 tap Tahap ${no} ${belum ? "sebelum" : "SESUDAH"} hydrate lalu gulir: ${f.total} frame, ${f.salah} frame diagram tahap lain${f.contoh ? ` (${f.contoh})` : ""}, ${f.kosong} frame kosong, akhir ${f.akhir ? "terlihat" : "tersembunyi"}`);
  // Hydrate datang 1,5 s sesudah tap (di luar jendela 500 ms input), jadi geser saat itu dihitung CLS. Syarat 0.
  const c = await page.evaluate(() => window.__cls);
  lapor(c.nilai === 0 && c.geser === 0, `beranda 375×667 tap Tahap ${no} sebelum hydrate: geser ${Math.round(c.geser)} px, CLS ${c.nilai.toFixed(4)}${c.contoh ? ` (terbesar ${c.contoh})` : ""}`);
  await ctx.close();
}

// 7. Layout shift saat island di-hydrate (review PR #161, keputusan 248): versi statis SSR harus sudah memesan tinggi
// React Flow (tegak atau mendatar menurut lebar wadah). Gulir pelan 80 px tiap 120 ms sampai bawah, tanpa input
// pengguna, modul JS ditunda 300 ms; diukur di halaman uji dan beranda, HP dan desktop. Syarat CLS ≤ 0,1.
for (const [nama, halaman] of [["/uji/diagram/", url], ["beranda", beranda]]) {
  for (const [lebar, tinggi] of [
    [375, 667],
    [1366, 657],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: lebar, height: tinggi } });
    await pasangCls(ctx);
    const page = await ctx.newPage();
    await tundaJs(page, 300);
    await page.goto(halaman, { waitUntil: "domcontentloaded" });
    await page.evaluate(async () => {
      const jeda = (ms) => new Promise((s) => setTimeout(s, ms));
      for (let i = 0; i < 250 && window.scrollY + innerHeight < document.documentElement.scrollHeight - 2; i++) {
        window.scrollBy(0, 80);
        await jeda(120);
      }
    });
    // Kaki pesanan di beranda (.peta__pesan, K1xa) memakai figure.diagram tanpa React Flow; bukan diagram.
    await page.waitForFunction(() => [...document.querySelectorAll("figure.diagram:not(.peta__pesan figure)")].every((f) => f.querySelector(".react-flow__node")), null, { timeout: 15000 });
    await page.waitForTimeout(600);
    const c = await page.evaluate(() => window.__cls);
    lapor(c.nilai <= 0.1, `CLS ${nama} ${lebar}×${tinggi} gulir pelan, JS ditunda 300 ms: ${c.nilai.toFixed(4)}${c.contoh ? ` (terbesar ${c.contoh})` : ""}`);
    await ctx.close();
  }
}

// 8. Halaman konten yang memakai DiagramArsitektur (A11y-diagram), dibaca dari hasil build, bukan daftar tulis tangan:
// sesudah hydrate di 375×667, label React Flow berbahasa Inggris dan svg garis tidak terbaca.
function halamanDiagram(dir, akar = dir, hasil = []) {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) halamanDiagram(p, akar, hasil);
    else if (n === "index.html" && readFileSync(p, "utf8").includes('data-diagram="')) {
      hasil.push("/" + path.relative(akar, path.dirname(p)).split(path.sep).join("/") + (dir === akar ? "" : "/"));
    }
  }
  return hasil.sort();
}
const dasar = url.replace(/\/uji\/diagram\/$/, "");
const lain = halamanDiagram(path.resolve("dist")).filter((h) => h !== "/" && h !== "/uji/diagram/");
// Daftar kosong berarti pencarian di dist/ rusak (1.36 Tim dan infra memakai diagram), bukan "lolos tanpa diperiksa".
lapor(lain.length > 0, `halaman konten dengan DiagramArsitektur di dist/: ${lain.join(", ") || "tidak ada"}`);
for (const h of lain) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();
  await page.goto(dasar + h, { waitUntil: "networkidle" });
  // Diagram di blok yang tertutup (Paham di 4.13) tidak pernah terlihat, jadi island client:visible tidak hydrate: buka blok induknya dulu.
  await page.evaluate(() => document.querySelectorAll("figure.diagram").forEach((f) => f.closest("details")?.setAttribute("open", "")));
  for (const f of await page.locator("figure.diagram").all()) await f.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll("figure.diagram")].every((f) => f.querySelector(".react-flow__node .diagram__kotak")), null, { timeout: 15000 });
  const kotak = await page.locator("figure.diagram .diagram__kotak").count();
  laporBawaan(await bawaanTerbaca(page), `${h} 375×667 (${kotak} kotak)`);
  await ctx.close();
}
await browser.close();
console.log(gagal ? `Fondasi diagram GAGAL (${gagal})` : "Diagram: statis tanpa JS, scroll tidak tertangkap, keyboard jalan, tanpa animasi saat reduced");
process.exit(gagal ? 1 : 0);
