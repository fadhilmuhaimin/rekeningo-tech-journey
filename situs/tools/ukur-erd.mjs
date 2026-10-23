// Memeriksa widget ERD bertumbuh (I6-erd, keputusan 460–465) di halaman uji /uji/erd/:
// - tanpa JS: versi statis terlihat (11 tabel Tahap 2 dengan tiga yang dihapus), tanpa React Flow;
// - dengan JS: satu kolom berlajur di 375 px, grid di 1366 px; 11 node, 11 edge, semua node di dalam wadah;
//   bandingkan: 13 node, berdampingan di 1366 px dan bertumpuk di 375 px;
// - di 375×667 roda dan gestur sentuh di atas diagram tetap menggulir halaman (scroll tidak tertangkap);
// - node bisa dicapai dengan Tab dan dibuka dengan Enter; detail (kolom lengkap, tautan registry) di bawah diagram,
//   digulir ke layar; kalimat pindah tabel dihapus tidak terpotong; label Inggris React Flow tidak terbaca;
// - berganti tahap = gerak masuk; dengan reduced motion 0 animasi dan fungsi tetap;
// - CLS ≤ 0,1 dan geser 0 px saat island di-hydrate (gulir pelan, modul JS ditunda 300 ms);
// - halaman tanpa diagram tidak memuat React Flow; ukuran JS /uji/erd/ dicetak (baris "info");
// - bawaan React Flow yang tidak berguna bagi pembaca layar tidak terbaca, diperiksa di DOM dan di pohon aksesibilitas
//   Chromium (CDP Accessibility.getFullAXTree): svg garis sebagai "image" tanpa nama, role="application" tanpa nama
//   (keputusan 698, 699; pola 680, 682);
// - klik (1366) dan tap (375) di tengah tabel lewat koordinat sampai ke tombolnya, bukan ke pane (pola 681);
//   node tools/ukur-erd.mjs --url http://127.0.0.1:4321
//   node tools/ukur-erd.mjs --url ... --axe   # + axe-core, gelap dan terang
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";
import { TAG_WCAG, pilihAxe } from "./lib/axe.mjs";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const BASE = arg("--url", "http://127.0.0.1:4321");
const url = BASE + "/uji/erd/";
const AXE = pilihAxe(); // --axe: axe-core terpasang (lib/axe.mjs, keputusan 693); --axe <file>: file lain

const browser = awasi(await chromium.launch(), { alat: "erd" }); // batas waktu per halaman (keputusan 360)
let gagal = 0;
const lapor = (ok, pesan) => {
  console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`);
  if (!ok) gagal++;
};
const FIG = "figure.erd-tumbuh";

// Bawaan React Flow 12.12.0 yang sampai ke pembaca layar, dibaca dari DOM (pola ukur-diagram.mjs, keputusan 466, 680,
// 682): aria-roledescription ("node", "edge"), label "Edge from X to Y", <svg> lapisan garis di luar aria-hidden, dan
// role="application" tanpa nama. Elemen di dalam aria-hidden="true" tidak dibacakan, jadi tidak dihitung.
const bawaanDom = (page) =>
  page.evaluate((FIG) => {
    const temuan = [];
    for (const f of document.querySelectorAll(FIG)) {
      for (const x of f.querySelectorAll("*")) {
        if (x.closest('[aria-hidden="true"]')) continue;
        const label = x.getAttribute("aria-label") ?? "";
        const alasan = [
          x.hasAttribute("aria-roledescription") && `roledescription "${x.getAttribute("aria-roledescription")}"`,
          label.startsWith("Edge from") && `label "${label}"`,
          x.tagName.toLowerCase() === "svg" && x.closest(".react-flow__edges") && "svg garis terbaca",
          x.getAttribute("role") === "application" && !label.trim() && !x.hasAttribute("aria-labelledby") && "application tanpa nama",
        ].filter(Boolean);
        if (alasan.length) temuan.push(`${x.tagName.toLowerCase()}.${String(x.className.baseVal ?? x.className).split(" ")[0] || "-"} ${alasan.join(", ")}`);
      }
    }
    return temuan;
  }, FIG);

// Pohon aksesibilitas Chromium (CDP Accessibility.getFullAXTree, cara ukur keputusan 680) di bawah setiap figure ERD:
// node yang tidak diabaikan dengan role image atau application tanpa nama. Temuan #274: 11 dari 12 svg garis di
// /uji/erd/ terbaca sebagai image tanpa nama. `akar` 0 berarti figure tidak ditemukan di pohon (alat rusak, gagal).
async function bawaanAx(page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
    const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: FIG });
    const figur = new Set();
    for (const nodeId of nodeIds) figur.add((await cdp.send("DOM.describeNode", { nodeId })).node.backendNodeId);
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    const per = new Map(nodes.map((n) => [n.nodeId, n]));
    const hasil = { akar: 0, image: 0, application: 0, tanpaNama: [] };
    const jalan = (n) => {
      if (!n) return;
      const role = n.role?.value;
      if (!n.ignored && (role === "image" || role === "img" || role === "application")) {
        hasil[role === "application" ? "application" : "image"]++;
        if (!String(n.name?.value ?? "").trim()) hasil.tanpaNama.push(role);
      }
      for (const c of n.childIds ?? []) jalan(per.get(c));
    };
    for (const n of nodes) if (figur.has(n.backendDOMNodeId)) (hasil.akar++, jalan(n));
    return hasil;
  } finally {
    await cdp.detach();
  }
}
async function laporBawaan(page, tag) {
  const dom = await bawaanDom(page);
  const ax = await bawaanAx(page);
  const n = (r) => ax.tanpaNama.filter((x) => (r === "application" ? x === r : x !== "application")).length;
  lapor(
    dom.length === 0 && ax.akar > 0 && ax.tanpaNama.length === 0 && ax.application > 0,
    `${tag}: bawaan React Flow terbaca di DOM ${dom.length}${dom.length ? ` (${[...new Set(dom)].slice(0, 3).join("; ")})` : ""}; pohon aksesibilitas: image tanpa nama ${n("image")}, application ${ax.application} (tanpa nama ${n("application")})`,
  );
}

// Klik (desktop) atau tap (HP) lewat koordinat di tengah tabel, bukan element.click(), supaya hit test ikut diuji:
// React Flow memberi node tanpa handler pointer-events none dan tombol mewarisinya (pola keputusan 681, 698).
async function klikTabel(page, awalan, sentuh) {
  const node = page.locator(`${FIG} .erd-tumbuh__node[aria-label^="${awalan}"]`).first();
  await node.scrollIntoViewIfNeeded();
  const b = await node.boundingBox();
  const [x, y] = [b.x + b.width / 2, b.y + Math.min(b.height / 2, 60)];
  const kena = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest(".erd-tumbuh__node")?.getAttribute("aria-label") ?? `${el?.tagName.toLowerCase()}.${String(el?.className?.baseVal ?? el?.className ?? "").split(" ")[0]}`;
  }, [x, y]);
  if (sentuh) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await page.waitForTimeout(150);
  return {
    kena,
    ditekan: await node.getAttribute("aria-pressed"),
    detail: (await page.locator(`${FIG} .erd-tumbuh__detail`).textContent()) ?? "",
    tautan: await page.locator(`${FIG} .erd-tumbuh__detail a`).evaluateAll((a) => a.map((x) => x.getAttribute("href"))),
  };
}

// 1. Tanpa JS.
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();
  await page.goto(url);
  const r = await page.evaluate((FIG) => {
    const f = document.querySelector(FIG);
    const s = f?.querySelector(".erd-tumbuh__statis");
    const tabel = [...(s?.querySelectorAll(".erd-tumbuh__statis-panel > ul > li") ?? [])];
    return {
      tabel: tabel.length,
      dihapus: tabel.filter((li) => li.textContent.includes("isinya pindah ke")).length,
      tinggi: s?.getBoundingClientRect().height ?? 0,
      terpotong: s ? s.scrollHeight > s.clientHeight + 1 : true,
      flow: !!f?.querySelector(".react-flow"),
    };
  }, FIG);
  lapor(r.tabel === 11 && r.dihapus === 3 && r.tinggi > 200 && !r.terpotong && !r.flow, `tanpa JS: ${r.tabel} tabel statis (${r.dihapus} dihapus), tinggi ${Math.round(r.tinggi)} px, ${r.terpotong ? "terpotong" : "utuh"}`);
  await ctx.close();
}

async function siap(page) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(FIG).scrollIntoViewIfNeeded();
  await page.waitForFunction((FIG) => document.querySelectorAll(`${FIG} .react-flow__node .erd-tumbuh__node`).length > 0, FIG);
  await page.evaluate(() => window.scrollTo(0, 0));
}
const bentuk = (page) =>
  page.evaluate((FIG) => {
    const f = document.querySelector(FIG);
    const luar = [...f.querySelectorAll(".erd-tumbuh__wadah")].reduce((n, w) => {
      const b = w.getBoundingClientRect();
      return n + [...w.querySelectorAll(".react-flow__node")].filter((x) => {
        const r = x.getBoundingClientRect();
        return r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1;
      }).length;
    }, 0);
    return {
      bentuk: f.dataset.bentuk,
      node: f.querySelectorAll(".react-flow__node").length,
      edge: f.querySelectorAll(".react-flow__edge").length,
      luar,
      statisSr: f.querySelector(".erd-tumbuh__statis").classList.contains("sr-only"),
      // Teks yang terpotong di node: kalimat pindah tabel dihapus (harus 0, keputusan 466) dan nama (dicetak saja).
      pindahPotong: [...f.querySelectorAll(".erd-tumbuh__pindah")].filter((x) => x.scrollHeight > x.clientHeight + 1).length,
      namaPotong: [...f.querySelectorAll(".erd-tumbuh__node code")].filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent),
      berdampingan: !!f.querySelector(".erd-tumbuh__panel.is-berdampingan"),
      lebarDok: document.documentElement.scrollWidth - innerWidth,
    };
  }, FIG);

for (const [lebar, tinggi, harus] of [
  [375, 667, "sempit"],
  [1366, 657, "lebar"],
]) {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const ctx = await browser.newContext({ viewport: { width: lebar, height: tinggi }, reducedMotion, hasTouch: lebar < 500 });
    const page = await ctx.newPage();
    await siap(page);
    const tag = `${lebar}×${tinggi} ${reducedMotion}`;

    // 2. Bentuk dan isi wadah.
    const b = await bentuk(page);
    lapor(b.bentuk === harus && b.node === 11 && b.edge === 11 && b.luar === 0 && b.statisSr && b.lebarDok <= 0, `${tag}: ${b.bentuk}, ${b.node} node, ${b.edge} edge, ${b.luar} di luar wadah, luapan halaman ${b.lebarDok} px`);
    lapor(b.pindahPotong === 0, `${tag}: kalimat pindah terpotong ${b.pindahPotong}`);
    await laporBawaan(page, tag);
    if (b.namaPotong.length) console.log(`info ${tag}: nama terpotong elipsis di node (lengkap di detail dan versi statis): ${b.namaPotong.join(", ")}`);

    // 3. Scroll tidak tertangkap (layar sempit).
    if (lebar < 500) {
      const pane = page.locator(`${FIG} .react-flow__pane`).first();
      await pane.scrollIntoViewIfNeeded();
      const kotak = await pane.boundingBox();
      const y0 = await page.evaluate(() => window.scrollY);
      await page.mouse.move(kotak.x + kotak.width / 2, kotak.y + Math.min(kotak.height / 2, 200));
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(300);
      const y1 = await page.evaluate(() => window.scrollY);
      lapor(y1 > y0, `${tag}: roda di atas diagram ${y0}→${y1}`);
      // Gestur sentuh di atas node (tempat jari paling sering mendarat); pola ukur-diagram.mjs: bila gestur sintetis
      // tidak berjalan di lingkungan ini (runner Linux), touch-action yang jadi buktinya.
      const cdp = await ctx.newCDPSession(page);
      const geser = async (sel) => {
        await page.locator(sel).first().scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy(0, -80));
        const k = await page.locator(sel).first().boundingBox();
        const a = await page.evaluate(() => window.scrollY);
        await cdp.send("Input.synthesizeScrollGesture", { x: Math.round(k.x + k.width / 2), y: Math.round(k.y + Math.min(k.height / 2, 150)), yDistance: -200, gestureSourceType: "touch", speed: 1200 });
        await page.waitForTimeout(300);
        return [a, await page.evaluate(() => window.scrollY)];
      };
      const [k0, k1] = await geser("main p");
      const [d0, d1] = await geser(`${FIG} .react-flow__node`);
      const ta = await page.evaluate((FIG) => [".react-flow__pane", ".erd-tumbuh__node"].map((s) => getComputedStyle(document.querySelector(`${FIG} ${s}`)).touchAction), FIG);
      const taOk = ta.every((t) => t.includes("pan-y") || t === "auto" || t === "manipulation");
      if (k1 > k0) lapor(d1 > d0 && taOk, `${tag}: sentuh di paragraf ${k0}→${k1}, di atas node ${d0}→${d1}, touch-action ${ta.join("/")}`);
      else {
        console.log(`info ${tag}: gestur sentuh sintetis tidak berjalan di lingkungan ini (paragraf ${k0}→${k1})`);
        lapor(taOk, `${tag}: touch-action ${ta.join("/")}`);
      }
    }

    // 4. Keyboard: Tab dari tombol Bandingkan mendarat di node pertama, Enter membuka detail di bawah diagram.
    await page.focus(`${FIG} .erd-tumbuh__banding`);
    await page.keyboard.press("Tab");
    const fokus = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(50);
    // Detail digulir ke layar sesudah dipilih (keputusan 467): utuh, atau awalnya di layar bila lebih tinggi dari layar
    // (HP: detail akun ±710 px). Dengan gulir halus butuh beberapa ratus ms.
    const terlihat = await page
      .waitForFunction(
        (FIG) => {
          const r = document.querySelector(`${FIG} .erd-tumbuh__detail`).getBoundingClientRect();
          return r.top >= 0 && (r.bottom <= innerHeight + 1 || r.top <= innerHeight / 3);
        },
        FIG,
        { timeout: 3000 },
      )
      .then(() => true, () => false);
    const d = await page.evaluate((FIG) => {
      const f = document.querySelector(FIG);
      const det = f.querySelector(".erd-tumbuh__detail");
      const w = [...f.querySelectorAll(".erd-tumbuh__wadah")].at(-1).getBoundingClientRect();
      return {
        teks: det.textContent,
        tautan: [...det.querySelectorAll("a")].map((a) => a.getAttribute("href")),
        diBawah: det.getBoundingClientRect().top >= w.bottom - 1,
        ditekan: document.activeElement?.getAttribute("aria-pressed"),
        status: f.querySelector('[role="status"]').textContent,
      };
    }, FIG);
    lapor(
      fokus.startsWith("Tabel akun") && d.teks.includes("password_hash") && d.teks.includes("Dijelaskan di") && d.diBawah && d.ditekan === "true" && d.status.includes("akun") && terlihat,
      `${tag}: Tab ke "${fokus}", Enter → detail ${d.teks.length} karakter, ${terlihat ? "digulir ke layar" : "TIDAK terlihat di layar"}, tautan ${d.tautan.join(" ") || "(segera)"}`,
    );

    // 4b. Klik atau tap di tengah tabel sesi (bukan Tab dan Enter) membuka detailnya.
    {
      const k = await klikTabel(page, "Tabel sesi", lebar < 500);
      lapor(k.kena.startsWith("Tabel sesi") && k.ditekan === "true" && k.detail.includes("sesi · Tahap 2"), `${tag}: ${lebar < 500 ? "tap" : "klik"} di tengah tabel sesi kena ${k.kena.startsWith("Tabel") ? "tombol" : k.kena} → aria-pressed ${k.ditekan}, detail "${k.detail.slice(0, 30)}"`);
    }

    // 5. Berganti tahap: gerak masuk, atau 0 animasi dengan reduced motion; isi berganti ke Tahap 1.
    const anim = await page.evaluate(async (FIG) => {
      const f = document.querySelector(FIG);
      [...f.querySelectorAll(".erd-tumbuh__pilih button")].find((x) => x.textContent.includes("Tahap 1")).click();
      await new Promise((s) => requestAnimationFrame(() => requestAnimationFrame(s)));
      return document.getAnimations().length;
    }, FIG);
    await page.waitForFunction((FIG) => document.querySelectorAll(`${FIG} .react-flow__node`).length === 5, FIG);
    const t1 = await bentuk(page);
    lapor((reducedMotion === "reduce" ? anim === 0 : anim > 0) && t1.edge === 7 && t1.luar === 0, `${tag}: pilih Tahap 1 → ${anim} animasi, ${t1.node} node, ${t1.edge} edge`);

    // 6. Bandingkan Tahap 1 dan 2: berdampingan di desktop, bertumpuk di HP.
    await page.evaluate((FIG) => [...document.querySelectorAll(`${FIG} .erd-tumbuh__pilih button`)].find((x) => x.textContent.includes("Tahap 2")).click(), FIG);
    await page.waitForFunction((FIG) => document.querySelector(`${FIG} .erd-tumbuh__banding`), FIG);
    await page.click(`${FIG} .erd-tumbuh__banding`);
    await page.waitForFunction((FIG) => document.querySelectorAll(`${FIG} .react-flow__node`).length === 13, FIG);
    await page.waitForTimeout(400);
    const bd = await bentuk(page);
    lapor(bd.berdampingan === lebar > 500 && bd.edge === 18 && bd.luar === 0 && bd.lebarDok <= 0, `${tag}: bandingkan → ${bd.berdampingan ? "berdampingan" : "bertumpuk"}, ${bd.node} node, ${bd.edge} edge, ${bd.luar} di luar wadah`);
    // Dua React Flow baru dipasang (kunci panel berganti): lapisan garis keduanya tetap tersembunyi, keduanya bernama.
    await laporBawaan(page, `${tag} bandingkan`);

    if (AXE && reducedMotion === "no-preference") {
      // Diukur dalam mode bandingkan dengan detail tabel dihapus terbuka (semua jenis status dan tautan tampil).
      await page.evaluate((FIG) => [...document.querySelectorAll(`${FIG} .erd-tumbuh__node`)].find((x) => x.getAttribute("aria-label").startsWith("Tabel topup")).click(), FIG);
      for (const tema of ["dark", "light"]) {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
        await page.addScriptTag({ path: AXE });
        const v = await page.evaluate(async (tag) => {
          const x = await window.axe.run(document, { runOnly: { type: "tag", values: tag } });
          return x.violations.map((p) => `${p.id}(${p.nodes.length}: ${p.nodes[0]?.target?.join(" ")})`);
        }, TAG_WCAG);
        lapor(v.length === 0, `axe ${tag} ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
      }
    }
    await ctx.close();
  }
}

// 7. Layout shift saat island di-hydrate: tinggi wadah dipesan sejak SSR (varPesan). Gulir pelan 80 px tiap 120 ms
// sampai bawah, modul JS ditunda 300 ms. Syarat CLS ≤ 0,1, dan elemen sesudah figure tidak bergeser.
for (const [lebar, tinggi] of [
  [375, 667],
  [1366, 657],
]) {
  const ctx = await browser.newContext({ viewport: { width: lebar, height: tinggi } });
  await ctx.addInitScript(() => {
    const c = (window.__cls = { nilai: 0, sesi: 0, awal: 0, akhir: 0, contoh: "" });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        if (c.sesi && e.startTime - c.akhir < 1000 && e.startTime - c.awal < 5000) c.sesi += e.value;
        else [c.sesi, c.awal] = [e.value, e.startTime];
        c.akhir = e.startTime;
        c.nilai = Math.max(c.nilai, c.sesi);
        const n = e.sources?.[0]?.node;
        if (n) c.contoh ||= `${e.value.toFixed(4)} ${n.nodeName?.toLowerCase()}.${String(n.className ?? "").split(" ")[0]}`;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  const page = await ctx.newPage();
  await page.route(/\/_astro\/.+\.js(\?.*)?$/, async (rute) => {
    await new Promise((s) => setTimeout(s, 300));
    await rute.continue().catch(() => {});
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const sebelum = await page.evaluate((FIG) => (document.querySelector(FIG).closest("astro-island") ?? document.querySelector(FIG)).nextElementSibling.getBoundingClientRect().top + scrollY, FIG);
  await page.evaluate(async () => {
    const jeda = (ms) => new Promise((s) => setTimeout(s, ms));
    for (let i = 0; i < 250 && window.scrollY + innerHeight < document.documentElement.scrollHeight - 2; i++) {
      window.scrollBy(0, 80);
      await jeda(120);
    }
  });
  await page.waitForFunction((FIG) => document.querySelector(`${FIG} .react-flow__node`), FIG, { timeout: 15000 });
  await page.waitForTimeout(600);
  const r = await page.evaluate((FIG) => ({ c: window.__cls, sesudah: (document.querySelector(FIG).closest("astro-island") ?? document.querySelector(FIG)).nextElementSibling.getBoundingClientRect().top + scrollY }), FIG);
  const geser = Math.abs(r.sesudah - sebelum);
  lapor(r.c.nilai <= 0.1 && geser <= 1, `CLS /uji/erd/ ${lebar}×${tinggi} gulir pelan, JS ditunda 300 ms: ${r.c.nilai.toFixed(4)}${r.c.contoh ? ` (${r.c.contoh})` : ""}, isi sesudah diagram geser ${geser.toFixed(1)} px`);
  await ctx.close();
}

// 8. React Flow hanya di halaman yang memakainya; ukuran JS (tanpa kompresi dan gzip) untuk dicatat. `buka`: semua
// <details> dibuka dulu, seperti pembaca yang membuka setiap blok.
async function js(halaman, buka = false) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 657 } });
  const page = await ctx.newPage();
  const isi = [];
  page.on("response", async (r) => {
    if (/\.js(\?.*)?$/.test(r.url()) && r.ok()) isi.push(r.body().then((b) => b).catch(() => Buffer.alloc(0)));
  });
  await page.goto(BASE + halaman, { waitUntil: "networkidle" });
  if (buka) await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  // Gulir sampai bawah supaya island client:visible ikut dimuat.
  await page.evaluate(async () => {
    for (let i = 0; i < 200 && scrollY + innerHeight < document.documentElement.scrollHeight - 2; i++) {
      scrollBy(0, 600);
      await new Promise((s) => setTimeout(s, 30));
    }
  });
  await page.waitForLoadState("networkidle");
  const b = await Promise.all(isi);
  await ctx.close();
  return {
    flow: b.some((x) => x.includes("react-flow__pane")),
    mentah: b.reduce((n, x) => n + x.length, 0),
    gzip: b.reduce((n, x) => n + gzipSync(x).length, 0),
    file: b.length,
  };
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const erd = await js("/uji/erd/");
lapor(erd.flow, `/uji/erd/ memuat React Flow`);
console.log(`info JS /uji/erd/: ${erd.file} file, ${kb(erd.mentah)} tanpa kompresi, ${kb(erd.gzip)} gzip`);
const diagram = await js("/uji/diagram/");
console.log(`info JS /uji/diagram/ (pembanding, React Flow + DiagramArsitektur): ${diagram.file} file, ${kb(diagram.mentah)} tanpa kompresi, ${kb(diagram.gzip)} gzip`);
for (const h of ["/tahap-1/data-modeling/", "/cerita/"]) {
  const r = await js(h);
  lapor(!r.flow, `${h} tanpa diagram: React Flow ${r.flow ? "DIMUAT" : "tidak dimuat"} (JS ${r.file} file, ${kb(r.gzip)} gzip)`);
}

await browser.close();
console.log(gagal ? `ERD bertumbuh GAGAL (${gagal})` : "ERD bertumbuh: statis tanpa JS, scroll tidak tertangkap, keyboard, klik dan tap jalan, bawaan React Flow tidak terbaca, tanpa animasi saat reduced, React Flow hanya di halamannya");
process.exit(gagal ? 1 : 0);
