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
// - Tahap 3 (ERD3, keputusan 963, 964): /uji/erd/ membuka Tahap 2; memilih Tahap 3 dalam mode bandingkan = Tahap 2 di
//   kiri (8 tabel) dan Tahap 3 di kanan (14 tabel, 6 baru, 2 berubah), 22 node dan 31 edge tanpa luapan dan tanpa teks
//   diperkecil di bawah 0,79; detail outbox membuka halaman penjelasnya; mode tunggal Tahap 3 = 14 node dan 20 edge.
// - Tahap 4 (ERD4, keputusan 1254, 1255): memilih Tahap 4 dalam mode tunggal = 22 node dan 35 edge (zoom 1 di 320, 375,
//   dan 1366 px); Bandingkan dengan Tahap 3 = Tahap 3 di kiri (14 tabel) dan Tahap 4 di kanan (22 tabel: 8 baru, 5
//   berubah), 36 node dan 55 edge, zoom ≥ 0,8; tidak ada nama kolom atau tabel yang terpotong elipsis di Tahap 1 sampai 4
//   (label kunci yang tidak muat pindah ke baris sendiri); tabel pembagian modul (6 modul, 22 tabel, 21 foreign key lintas)
//   tanpa luapan di 320 px; detail kartu memuat modul pembayaran dan halaman 4.x; axe gelap dan terang.
// - 1.12 Data modeling (ERD-1.12, keputusan 697): ErdTumbuh Tahap 1 di blok Paham, versi statis Erd.astro tanpa JS
//   dan untuk pembaca layar, klik/tap, scroll, CLS saat blok dibuka; React Flow baru dimuat sesudah blok dibuka;
//   setiap halaman di dist/ yang memakai ErdTumbuh diperiksa bawaannya.
// - 2.9 Skema data (keputusan 632): ErdTumbuh Tahap 1 dan 2 di blok Coba yang terbuka, mulai di Tahap 2; versi
//   statis bawaan tanpa JS; Bandingkan dengan Tahap 1 = 13 node dan 18 edge tanpa luapan; CLS saat di-hydrate;
//   ukuran JS saat dimuat dan sesudah semua blok dibuka dicetak.
// - Pemilih tahap dan Bandingkan di setiap halaman ber-ErdTumbuh (keputusan 1285): memilih tahap pertama 3.5 atau 4.5 tidak
//   melepas widget, tanpa JavaScript pemilih tidak tampil, sebelum hydrate tersembunyi dan menempati ruangnya.
//   node tools/ukur-erd.mjs --url http://127.0.0.1:4321
//   node tools/ukur-erd.mjs --url ... --axe   # + axe-core, gelap dan terang
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
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
const HAL = "/tahap-1/data-modeling/"; // 1.12: ErdTumbuh Tahap 1 di blok Paham
const HAL2 = "/tahap-2/skema-data/"; // 2.9: ErdTumbuh Tahap 1 dan 2 di blok Coba (keputusan 632)

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
// Halaman 4.23 dari registry: sesudah halamannya ada, detail tabel kartu memuat tautannya; sebelum itu "(segera)" (tidak keduanya diterima).
const kartuAda = JSON.parse(readFileSync(new URL("../data/cerita.json", import.meta.url), "utf8")).halaman.find((h) => h.id === "t4-kartu")?.ada === true;

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
      // Baris dan kepala bertanda dua baris (tumbuh.ts duaBaris, duaKepala) harus benar-benar dua baris: label atau status
      // di bawah nama dan rata kanan, bukan di sebelahnya dengan tinggi yang sudah dipesan untuk dua baris.
      duaSebaris: [...f.querySelectorAll(".erd-tumbuh__baris.is-dua, .erd-tumbuh__kepala.is-dua")].filter((x) => {
        const nama = x.querySelector("code").getBoundingClientRect();
        const lain = x.querySelector(".erd-tumbuh__label, .erd-tumbuh__status")?.getBoundingClientRect();
        // Di baris sendiri dan rata kanan (margin-left: auto), bukan di bawah nama sebelah kiri.
        return !lain || lain.top < nama.bottom - 1 || Math.abs(lain.right - x.getBoundingClientRect().right) > 2;
      }).length,
      duaBaris: f.querySelectorAll(".erd-tumbuh__baris.is-dua, .erd-tumbuh__kepala.is-dua").length,
      // Tinggi node yang dihitung tata (tumbuh.ts tinggiNode) harus sama dengan tinggi isinya di CSS: jarak dari bawah baris
      // terakhir ke bawah node (padding bawah + border) sama di semua node. Isi lebih pendek menyisakan ruang kosong, isi
      // lebih tinggi dipotong `overflow: hidden` (kolom terakhir hilang), dan tata di sekitarnya bergeser dari gambarnya.
      // Node pindah (tabel dihapus) dilewati; pembanding = nilai tengah semua node di figure ini.
      isiBeda: (() => {
        const ukur = [...f.querySelectorAll(".erd-tumbuh__node")]
          .filter((n) => !n.querySelector(".erd-tumbuh__pindah"))
          .map((n) => {
            const zoom = Number(/scale\(([\d.]+)\)/.exec(n.closest(".react-flow__viewport")?.style.transform ?? "")?.[1] ?? 1);
            const baris = [...n.querySelectorAll(".erd-tumbuh__baris")].at(-1);
            return [n.querySelector(".erd-tumbuh__kepala code").textContent, (n.getBoundingClientRect().bottom - baris.getBoundingClientRect().bottom) / zoom];
          });
        const tengah = [...ukur].map((u) => u[1]).sort((a, b) => a - b)[Math.floor(ukur.length / 2)];
        return ukur.filter((u) => Math.abs(u[1] - tengah) > 1.5 || u[1] < 0).map((u) => u[0]);
      })(),
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
    lapor(b.namaPotong.length === 0 && b.duaSebaris === 0 && b.isiBeda.length === 0, `${tag}: nama kolom dan tabel terpotong elipsis ${b.namaPotong.length}${b.namaPotong.length ? ` (${b.namaPotong.join(", ")})` : ""}, ${b.duaBaris} baris atau kepala dua baris, ${b.duaSebaris} yang label atau statusnya masih di sebelah nama, tinggi isi beda dari tata ${b.isiBeda.length}${b.isiBeda.length ? ` (${b.isiBeda.slice(0, 4).join(", ")})` : ""}`);

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

    // 6b. Tahap 3 (ERD3, keputusan 963, 964): memilih Tahap 3 dari mode bandingkan Tahap 2 mempertahankan mode bandingkan.
    // Kiri Tahap 2 (8 tabel, tidak ada yang dihapus), kanan Tahap 3 (14 tabel: 6 baru, 2 berubah, 6 tetap).
    await page.evaluate((FIG) => [...document.querySelectorAll(`${FIG} .erd-tumbuh__pilih button`)].find((x) => x.textContent.includes("Tahap 3")).click(), FIG);
    await page.waitForFunction((FIG) => document.querySelectorAll(`${FIG} .react-flow__node`).length === 22, FIG, { timeout: 15000 });
    await page.waitForTimeout(400);
    const t3 = await bentuk(page);
    const st3 = await page.evaluate((FIG) => {
      const f = document.querySelector(FIG);
      const n = (k) => f.querySelectorAll(`.erd-tumbuh__node.is-${k}`).length;
      const zoom = [...f.querySelectorAll(".react-flow__viewport")].map((v) => Number(/scale\(([\d.]+)\)/.exec(v.style.transform)?.[1] ?? 1));
      return {
        baru: n("baru"), berubah: n("berubah"), dihapus: n("dihapus"), zoom,
        judul: [...f.querySelectorAll(".erd-tumbuh__sisi-judul strong")].map((x) => x.textContent),
        pressed: f.querySelector(".erd-tumbuh__banding")?.getAttribute("aria-pressed"),
        teks: f.querySelector(".erd-tumbuh__banding")?.textContent,
      };
    }, FIG);
    lapor(
      t3.node === 22 && t3.edge === 31 && t3.luar === 0 && t3.lebarDok <= 0 && t3.berdampingan === lebar > 500 && st3.baru === 6 && st3.berubah === 2 && st3.dihapus === 0 &&
        st3.judul.join("|") === "Tahap 2, sebelum|Tahap 3, sesudah" && st3.pressed === "true" && st3.teks.includes("Tahap 2") && Math.min(...st3.zoom) >= 0.79,
      `${tag}: Tahap 3 bandingkan → ${t3.berdampingan ? "berdampingan" : "bertumpuk"}, ${t3.node} node, ${t3.edge} edge, ${st3.baru} baru, ${st3.berubah} berubah, ${st3.dihapus} dihapus, zoom ${st3.zoom.map((z) => z.toFixed(2)).join("/")}, ${t3.luar} di luar wadah, luapan ${t3.lebarDok} px, "${st3.teks}"`,
    );
    lapor(t3.pindahPotong === 0 && t3.namaPotong.length === 0, `${tag}: Tahap 3 bandingkan, kalimat pindah terpotong ${t3.pindahPotong}, nama terpotong ${t3.namaPotong.length}${t3.namaPotong.length ? ` (${t3.namaPotong.join(", ")})` : ""}`);
    await laporBawaan(page, `${tag} Tahap 3 bandingkan`);
    // Klik atau tap di tengah tabel outbox (tabel baru): detail memuat status, kolom, index, dan halaman penjelasnya.
    {
      const k = await klikTabel(page, "Tabel outbox", lebar < 500);
      lapor(
        k.kena.startsWith("Tabel outbox") && k.ditekan === "true" && k.detail.includes("outbox · Tahap 3 · baru") && k.detail.includes("notifikasi_id") && k.detail.includes("UNIQUE INDEX") &&
          k.detail.includes("Dijelaskan di") && k.detail.includes("3.9"),
        `${tag}: ${lebar < 500 ? "tap" : "klik"} di tengah tabel outbox kena ${k.kena.startsWith("Tabel") ? "tombol" : k.kena} → aria-pressed ${k.ditekan}, detail ${k.detail.length} karakter, tautan ${k.tautan.join(" ") || "(segera)"}`,
      );
    }
    if (AXE && reducedMotion === "no-preference") {
      for (const tema of ["dark", "light"]) {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
        await page.addScriptTag({ path: AXE });
        const v = await page.evaluate(async (tag) => {
          const x = await window.axe.run(document, { runOnly: { type: "tag", values: tag } });
          return x.violations.map((p) => `${p.id}(${p.nodes.length}: ${p.nodes[0]?.target?.join(" ")})`);
        }, TAG_WCAG);
        lapor(v.length === 0, `axe ${tag} Tahap 3 bandingkan ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
      }
    }
    // Mode tunggal Tahap 3: matikan Bandingkan, 14 tabel dan 20 edge.
    await page.click(`${FIG} .erd-tumbuh__banding`);
    await page.waitForFunction((FIG) => document.querySelectorAll(`${FIG} .react-flow__node`).length === 14, FIG, { timeout: 15000 });
    await page.waitForTimeout(300);
    const t3s = await bentuk(page);
    const zoomT3 = await page.evaluate((FIG) => Number(/scale\(([\d.]+)\)/.exec(document.querySelector(`${FIG} .react-flow__viewport`).style.transform)?.[1] ?? 1), FIG);
    lapor(t3s.node === 14 && t3s.edge === 20 && t3s.luar === 0 && t3s.lebarDok <= 0 && zoomT3 >= (lebar < 500 ? 0.99 : 0.79), `${tag}: Tahap 3 tunggal → ${t3s.bentuk}, ${t3s.node} node, ${t3s.edge} edge, zoom ${zoomT3.toFixed(2)}, ${t3s.luar} di luar wadah, luapan ${t3s.lebarDok} px`);
    await laporBawaan(page, `${tag} Tahap 3`);

    // 6d. Tahap 4 (ERD4, keputusan 1254, 1255): mode tunggal, lalu Bandingkan dengan Tahap 3.
    await page.evaluate((FIG) => [...document.querySelectorAll(`${FIG} .erd-tumbuh__pilih button`)].find((x) => x.textContent.includes("Tahap 4")).click(), FIG);
    await page.waitForFunction((FIG) => document.querySelectorAll(`${FIG} .react-flow__node`).length === 22, FIG, { timeout: 15000 });
    await page.waitForTimeout(400);
    const t4s = await bentuk(page);
    const zoom4 = await page.evaluate((FIG) => Number(/scale\(([\d.]+)\)/.exec(document.querySelector(`${FIG} .react-flow__viewport`).style.transform)?.[1] ?? 1), FIG);
    lapor(
      t4s.node === 22 && t4s.edge === 35 && t4s.luar === 0 && t4s.lebarDok <= 0 && zoom4 >= 0.99 && t4s.namaPotong.length === 0 && t4s.duaSebaris === 0 && t4s.isiBeda.length === 0 && t4s.duaBaris >= (lebar < 500 ? 5 : 1),
      `${tag}: Tahap 4 tunggal → ${t4s.bentuk}, ${t4s.node} node, ${t4s.edge} edge, zoom ${zoom4.toFixed(2)}, ${t4s.luar} di luar wadah, luapan ${t4s.lebarDok} px, nama terpotong ${t4s.namaPotong.length}${t4s.namaPotong.length ? ` (${t4s.namaPotong.join(", ")})` : ""}, ${t4s.duaBaris} baris atau kepala dua baris (${t4s.duaSebaris} masih sebaris), tinggi isi beda dari tata ${t4s.isiBeda.length}${t4s.isiBeda.length ? ` (${t4s.isiBeda.slice(0, 4).join(", ")})` : ""}`,
    );
    await laporBawaan(page, `${tag} Tahap 4`);
    // Tabel pembagian modul: enam baris, 22 tabel, ringkasan foreign key lintas dari data.
    const mod = await page.evaluate((FIG) => {
      const m = document.querySelector(`${FIG} .erd-tumbuh__modul`);
      const t = m?.querySelector("table");
      return {
        baris: [...(m?.querySelectorAll("tbody tr") ?? [])].map((tr) => `${tr.querySelector("th").textContent}:${tr.querySelector("td").textContent}`),
        kodeTabel: m?.querySelectorAll("tbody td:last-child code").length ?? 0,
        caption: t?.querySelector("caption")?.textContent ?? "",
        luap: t ? t.scrollWidth - t.clientWidth : 999,
      };
    }, FIG);
    lapor(
      mod.baris.length === 6 && mod.kodeTabel === 22 && mod.baris[0] === "ledger:6" && mod.baris[4] === "pembayaran:5" && mod.caption.includes("21 foreign key menyeberang batas modul (14 ke modul akun, 7 ke modul ledger)") && mod.luap <= 0,
      `${tag}: tabel pembagian modul ${mod.baris.length} baris, ${mod.kodeTabel} tabel, luapan tabel ${mod.luap} px, "${mod.caption.slice(-90)}"`,
    );
    await page.click(`${FIG} .erd-tumbuh__banding`);
    await page.waitForFunction((FIG) => document.querySelectorAll(`${FIG} .react-flow__node`).length === 36, FIG, { timeout: 15000 });
    await page.waitForTimeout(500);
    const t4 = await bentuk(page);
    const st4 = await page.evaluate((FIG) => {
      const f = document.querySelector(FIG);
      const n = (k) => f.querySelectorAll(`.erd-tumbuh__node.is-${k}`).length;
      return {
        baru: n("baru"), berubah: n("berubah"), dihapus: n("dihapus"),
        zoom: [...f.querySelectorAll(".react-flow__viewport")].map((v) => Number(/scale\(([\d.]+)\)/.exec(v.style.transform)?.[1] ?? 1)),
        judul: [...f.querySelectorAll(".erd-tumbuh__sisi-judul strong")].map((x) => x.textContent),
        teks: f.querySelector(".erd-tumbuh__banding")?.textContent,
      };
    }, FIG);
    lapor(
      t4.node === 36 && t4.edge === 55 && t4.luar === 0 && t4.lebarDok <= 0 && t4.berdampingan === lebar > 500 && st4.baru === 8 && st4.berubah === 5 && st4.dihapus === 0 &&
        st4.judul.join("|") === "Tahap 3, sebelum|Tahap 4, sesudah" && st4.teks.includes("Tahap 3") && Math.min(...st4.zoom) >= (lebar < 500 ? 0.99 : 0.8) && t4.namaPotong.length === 0 && t4.pindahPotong === 0,
      `${tag}: Tahap 4 bandingkan → ${t4.berdampingan ? "berdampingan" : "bertumpuk"}, ${t4.node} node, ${t4.edge} edge, ${st4.baru} baru, ${st4.berubah} berubah, ${st4.dihapus} dihapus, zoom ${st4.zoom.map((z) => z.toFixed(2)).join("/")}, ${t4.luar} di luar wadah, luapan ${t4.lebarDok} px, nama terpotong ${t4.namaPotong.length}${t4.namaPotong.length ? ` (${t4.namaPotong.join(", ")})` : ""}`,
    );
    await laporBawaan(page, `${tag} Tahap 4 bandingkan`);
    // Klik atau tap di tengah tabel kartu (tabel baru): modul pembayaran, kolom, dan halaman 4.x (segera, atau tertaut sesudah halamannya ada).
    {
      const k = await klikTabel(page, "Tabel kartu", lebar < 500);
      lapor(
        k.kena.startsWith("Tabel kartu") && k.ditekan === "true" && k.detail.includes("kartu · Tahap 4 · baru") && k.detail.includes("token_penerbit") && k.detail.includes("Modul: pembayaran") &&
          k.detail.includes("Dijelaskan di") && k.detail.includes("4.23") && (kartuAda ? k.tautan.includes("/tahap-4/kartu-virtual/") : k.detail.includes("(segera)")),
        `${tag}: ${lebar < 500 ? "tap" : "klik"} di tengah tabel kartu kena ${k.kena.startsWith("Tabel") ? "tombol" : k.kena} → aria-pressed ${k.ditekan}, detail ${k.detail.length} karakter, tautan ${k.tautan.join(" ") || "(segera)"}`,
      );
    }
    if (AXE && reducedMotion === "no-preference") {
      for (const tema of ["dark", "light"]) {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
        await page.addScriptTag({ path: AXE });
        const v = await page.evaluate(async (tag) => {
          const x = await window.axe.run(document, { runOnly: { type: "tag", values: tag } });
          return x.violations.map((p) => `${p.id}(${p.nodes.length}: ${p.nodes[0]?.target?.join(" ")})`);
        }, TAG_WCAG);
        lapor(v.length === 0, `axe ${tag} Tahap 4 bandingkan ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
      }
    }
    await ctx.close();
  }
}

// 6c. Layar 320 px (WCAG 1.4.10 reflow): Tahap 2, 3, dan 4 tanpa luapan halaman, teks tidak diperkecil di bawah 0,85 (Tahap 4: zoom 1).
{
  const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true });
  const page = await ctx.newPage();
  await siap(page);
  for (const [no, node, edge] of [[2, 11, 11], [3, 14, 20], [4, 22, 35]]) {
    await page.evaluate(([FIG, no]) => [...document.querySelectorAll(`${FIG} .erd-tumbuh__pilih button`)].find((x) => x.textContent.includes(`Tahap ${no}`)).click(), [FIG, no]);
    await page.waitForFunction(([FIG, n]) => document.querySelectorAll(`${FIG} .react-flow__node`).length === n, [FIG, node], { timeout: 15000 });
    await page.waitForTimeout(300);
    const b = await bentuk(page);
    const zoom = await page.evaluate((FIG) => Number(/scale\(([\d.]+)\)/.exec(document.querySelector(`${FIG} .react-flow__viewport`).style.transform)?.[1] ?? 1), FIG);
    lapor(b.bentuk === "sempit" && b.node === node && b.edge === edge && b.luar === 0 && b.lebarDok <= 0 && zoom >= 0.85 && b.namaPotong.length === 0, `320×568 Tahap ${no}: ${b.bentuk}, ${b.node} node, ${b.edge} edge, zoom ${zoom.toFixed(2)}, ${b.luar} di luar wadah, luapan ${b.lebarDok} px, nama terpotong ${b.namaPotong.length}${b.namaPotong.length ? ` (${b.namaPotong.join(", ")})` : ""}`);
    if (no === 4) {
      const m = await page.evaluate((FIG) => { const t = document.querySelector(`${FIG} .erd-tumbuh__modul table`); return t ? t.scrollWidth - t.clientWidth : 999; }, FIG);
      lapor(m <= 0 && zoom >= 0.99, `320×568 Tahap 4: zoom ${zoom.toFixed(2)} (teks tidak diperkecil), tabel pembagian modul luapan ${m} px`);
    }
  }
  await laporBawaan(page, "320×568");
  // Font cadangan lebih lebar dari Satoshi (CI Linux memakai Inter, dan keputusan 1255 menambah tombol keempat): empat tombol
  // "Tahap N" membungkus ke baris berikutnya, satu baris tiap tombol, dan tidak meluapkan halaman (CI main 28 Okt: 3 px).
  await page.addStyleTag({ content: "html, body, button, .erd-tumbuh { font-family: Verdana, sans-serif !important }" });
  await page.waitForTimeout(200);
  const pk = await page.evaluate((FIG) => {
    const f = document.querySelector(FIG);
    const p = f.querySelector(".erd-tumbuh__pilih");
    return {
      dok: document.documentElement.scrollWidth - innerWidth,
      keluar: Math.max(0, Math.round(p.getBoundingClientRect().right - f.getBoundingClientRect().right)),
      tombol: [...p.querySelectorAll("button")].length,
      tinggi: Math.max(...[...p.querySelectorAll("button")].map((b) => b.getBoundingClientRect().height)),
    };
  }, FIG);
  lapor(pk.dok <= 0 && pk.keluar === 0 && pk.tombol === 4 && pk.tinggi <= 48, `320×568 font lebar (Verdana): pemilih ${pk.tombol} tombol membungkus, tombol setinggi ${Math.round(pk.tinggi)} px, ${pk.keluar} px di luar figure, luapan halaman ${pk.dok} px`);
  await ctx.close();
}

// 7. Layout shift saat island di-hydrate: tinggi wadah dipesan sejak SSR (varPesan). Gulir pelan 80 px tiap 120 ms
// sampai bawah, modul JS ditunda 300 ms. Syarat CLS ≤ 0,1, dan elemen sesudah figure tidak bergeser. Di /uji/erd/ dan
// di 2.9, tempat diagram ada di blok yang terbuka sejak dimuat.
for (const [namaHal, alamat] of [
  ["/uji/erd/", url],
  [HAL2, BASE + HAL2],
])
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
  await page.goto(alamat, { waitUntil: "domcontentloaded" });
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
  lapor(r.c.nilai <= 0.1 && geser <= 1, `CLS ${namaHal} ${lebar}×${tinggi} gulir pelan, JS ditunda 300 ms: ${r.c.nilai.toFixed(4)}${r.c.contoh ? ` (${r.c.contoh})` : ""}, isi sesudah diagram geser ${geser.toFixed(1)} px`);
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
// 1.12: ErdTumbuh ada di blok Paham yang tertutup saat dimuat, jadi React Flow baru diunduh sesudah blok dibuka.
const halTutup = await js(HAL);
const halBuka = await js(HAL, true);
lapor(!halTutup.flow && halBuka.flow, `${HAL} React Flow ${halTutup.flow ? "DIMUAT" : "tidak dimuat"} saat blok tertutup, ${halBuka.flow ? "dimuat" : "TIDAK dimuat"} sesudah blok dibuka`);
console.log(`info JS ${HAL}: blok tertutup ${halTutup.file} file, ${kb(halTutup.mentah)} tanpa kompresi, ${kb(halTutup.gzip)} gzip; semua blok dibuka ${halBuka.file} file, ${kb(halBuka.mentah)}, ${kb(halBuka.gzip)} gzip`);
for (const h of ["/tahap-1/pertukaran-saldo/", "/cerita/"]) {
  const r = await js(h, true);
  lapor(!r.flow, `${h} tanpa diagram, semua blok dibuka: React Flow ${r.flow ? "DIMUAT" : "tidak dimuat"} (JS ${r.file} file, ${kb(r.gzip)} gzip)`);
}

// 9. 1.12 Data modeling (ERD-1.12, keputusan 697): ErdTumbuh Tahap 1 di blok Paham, versi statis Erd.astro.
const bukaPaham = (page) => page.evaluate(() => (document.querySelector('details[data-blok="blok-paham"]').open = true));
// 9a. Tanpa JS: blok dibuka (details jalan tanpa JS), versi statis Erd.astro utuh, judul dan chip sumber sekali.
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();
  await page.goto(BASE + HAL);
  await bukaPaham(page);
  const r = await page.evaluate((FIG) => {
    const f = document.querySelector(`details[data-blok="blok-paham"] ${FIG}`);
    const s = f?.querySelector(".erd-tumbuh__statis");
    const erd = s?.querySelector("figure.erd");
    const terlihat = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    return {
      ada: !!f,
      tabel: erd?.querySelectorAll(".erd__tabel").length ?? 0,
      tinggi: erd?.getBoundingClientRect().height ?? 0,
      terpotong: s ? s.scrollHeight > s.clientHeight + 1 : true,
      flow: !!f?.querySelector(".react-flow"),
      pemilih: !!f?.querySelector(".erd-tumbuh__kontrol"),
      judul: [...(f?.querySelectorAll("figcaption") ?? [])].filter(terlihat).length,
      chip: [...(f?.querySelectorAll(".bb-chip") ?? [])].filter(terlihat).length,
    };
  }, FIG);
  lapor(
    r.ada && r.tabel === 5 && r.tinggi > 300 && !r.terpotong && !r.flow && !r.pemilih && r.judul === 1 && r.chip === 1,
    `${HAL} tanpa JS: ErdTumbuh di blok Paham ${r.ada ? "ada" : "TIDAK ada"}, Erd.astro ${r.tabel} tabel tinggi ${Math.round(r.tinggi)} px ${r.terpotong ? "terpotong" : "utuh"}, pemilih tahap ${r.pemilih ? "ADA" : "tidak ada"}, judul ${r.judul}, chip sumber ${r.chip}`,
  );
  await ctx.close();
}
// 9b. Dengan JS di 375 dan 1366, reduced motion ya/tidak.
for (const [lebar, tinggi, harus] of [
  [375, 667, "sempit"],
  [1366, 657, "lebar"],
]) {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const ctx = await browser.newContext({ viewport: { width: lebar, height: tinggi }, reducedMotion, hasTouch: lebar < 500 });
    const page = await ctx.newPage();
    await page.goto(BASE + HAL, { waitUntil: "networkidle" });
    await bukaPaham(page);
    await page.locator(FIG).scrollIntoViewIfNeeded();
    await page.waitForFunction((FIG) => document.querySelectorAll(`${FIG} .react-flow__node .erd-tumbuh__node`).length > 0, FIG);
    const tag = `${HAL} ${lebar}×${tinggi} ${reducedMotion}`;
    const b = await bentuk(page);
    const st = await page.evaluate((FIG) => {
      const f = document.querySelector(FIG);
      return { erd: f.querySelectorAll(".erd-tumbuh__statis.sr-only figure.erd .erd__tabel").length, pemilih: !!f.querySelector(".erd-tumbuh__kontrol") };
    }, FIG);
    lapor(
      b.bentuk === harus && b.node === 5 && b.edge === 7 && b.luar === 0 && b.statisSr && st.erd === 5 && !st.pemilih && b.lebarDok <= 0,
      `${tag}: ${b.bentuk}, ${b.node} node, ${b.edge} edge, ${b.luar} di luar wadah, Erd.astro untuk pembaca layar ${st.erd} tabel, pemilih tahap ${st.pemilih ? "ADA" : "tidak ada"}, luapan ${b.lebarDok} px`,
    );
    await laporBawaan(page, tag);

    if (lebar < 500) {
      // Roda dan gestur sentuh di atas diagram tetap menggulir halaman (pola bagian 3).
      const pane = page.locator(`${FIG} .react-flow__pane`).first();
      await pane.scrollIntoViewIfNeeded();
      const kotak = await pane.boundingBox();
      const y0 = await page.evaluate(() => window.scrollY);
      await page.mouse.move(kotak.x + kotak.width / 2, kotak.y + Math.min(kotak.height / 2, 200));
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(300);
      const y1 = await page.evaluate(() => window.scrollY);
      const cdp = await ctx.newCDPSession(page);
      await page.locator(`${FIG} .erd-tumbuh__node`).first().scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -80));
      const k = await page.locator(`${FIG} .erd-tumbuh__node`).first().boundingBox();
      const a = await page.evaluate(() => window.scrollY);
      await cdp.send("Input.synthesizeScrollGesture", { x: Math.round(k.x + k.width / 2), y: Math.round(k.y + Math.min(k.height / 2, 150)), yDistance: -200, gestureSourceType: "touch", speed: 1200 });
      await page.waitForTimeout(300);
      const z = await page.evaluate(() => window.scrollY);
      const ta = await page.evaluate((FIG) => getComputedStyle(document.querySelector(`${FIG} .erd-tumbuh__node`)).touchAction, FIG);
      const taOk = ta.includes("pan-y") || ta === "auto" || ta === "manipulation";
      // Gestur sintetis bisa tidak berjalan di runner Linux (bagian 3): touch-action jadi buktinya.
      lapor(y1 > y0 && (z > a || taOk), `${tag}: roda di atas diagram ${y0}→${y1}, sentuh di atas tabel ${a}→${z}, touch-action ${ta}`);
    }

    // Klik atau tap di tengah tabel akun: detail terbuka, 1.12 tanpa tautan ke dirinya sendiri, 1.7 bertautan.
    const anim0 = await page.evaluate(() => document.getAnimations().length);
    const k = await klikTabel(page, "Tabel akun", lebar < 500);
    const anim = await page.evaluate(() => document.getAnimations().length);
    lapor(
      k.kena.startsWith("Tabel akun") && k.ditekan === "true" && k.detail.includes("password_hash") && k.detail.includes("(halaman ini)") && k.tautan.includes("/tahap-1/fitur-login/") && !k.tautan.includes(HAL),
      `${tag}: ${lebar < 500 ? "tap" : "klik"} di tengah tabel akun kena ${k.kena.startsWith("Tabel") ? "tombol" : k.kena} → aria-pressed ${k.ditekan}, detail ${k.detail.length} karakter, tautan ${k.tautan.join(" ") || "-"}`,
    );
    if (reducedMotion === "reduce") lapor(anim0 === 0 && anim === 0, `${tag}: animasi ${anim0} sebelum, ${anim} sesudah memilih tabel`);
    // Keyboard: Tab dari tombol tabel akun ke tabel berikutnya, Enter membukanya.
    await page.focus(`${FIG} .erd-tumbuh__node[aria-label^="Tabel akun"]`);
    await page.keyboard.press("Tab");
    const fokus = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(50);
    const st2 = await page.evaluate((FIG) => ({ ditekan: document.activeElement?.getAttribute("aria-pressed"), status: document.querySelector(`${FIG} [role="status"]`).textContent }), FIG);
    lapor(fokus.startsWith("Tabel ") && !fokus.startsWith("Tabel akun") && st2.ditekan === "true" && st2.status.startsWith("Detail tabel"), `${tag}: Tab ke "${fokus}", Enter → aria-pressed ${st2.ditekan}, status "${st2.status}"`);

    if (AXE && reducedMotion === "no-preference") {
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
// 9c. CLS saat blok Paham dibuka lalu island di-hydrate: modul JS ditunda 300 ms, blok dibuka lewat skrip (bukan
// input, jadi geser dihitung), penghitung dinolkan sesudah blok terbuka, lalu figure digulir masuk layar.
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
  await page.goto(BASE + HAL, { waitUntil: "load" });
  await page.waitForTimeout(800);
  await bukaPaham(page);
  const posisi = () => page.evaluate((FIG) => (document.querySelector(FIG).closest("astro-island") ?? document.querySelector(FIG)).nextElementSibling.getBoundingClientRect().top + scrollY, FIG);
  await page.evaluate(() => new Promise((s) => requestAnimationFrame(() => requestAnimationFrame(s))));
  await page.waitForTimeout(300);
  await page.evaluate(() => Object.assign(window.__cls, { nilai: 0, sesi: 0, awal: 0, akhir: 0, contoh: "" }));
  const sebelum = await posisi();
  const belum = await page.evaluate((FIG) => !document.querySelector(`${FIG} .react-flow__node`), FIG);
  await page.evaluate((FIG) => {
    const f = document.querySelector(FIG);
    window.scrollTo(0, f.getBoundingClientRect().top + scrollY - 120);
  }, FIG);
  await page.waitForFunction((FIG) => document.querySelector(`${FIG} .react-flow__node`), FIG, { timeout: 15000 });
  await page.waitForTimeout(600);
  const r = { c: await page.evaluate(() => window.__cls), sesudah: await posisi() };
  const geser = Math.abs(r.sesudah - sebelum);
  lapor(belum && r.c.nilai <= 0.1 && geser <= 1, `CLS ${HAL} ${lebar}×${tinggi} blok dibuka, JS ditunda 300 ms: ${belum ? "statis dulu" : "SUDAH hidup sebelum diukur"}, ${r.c.nilai.toFixed(4)}${r.c.contoh ? ` (${r.c.contoh})` : ""}, isi sesudah diagram geser ${geser.toFixed(1)} px`);
  await ctx.close();
}

// 10. Setiap halaman di dist/ yang memakai ErdTumbuh, dibaca dari hasil build, bukan daftar tulis tangan: sesudah semua
// blok dibuka dan diagram hidup di 375×667, bawaan React Flow tidak terbaca. Halaman uji dan 1.12 sudah diperiksa di atas.
function halamanErd(dir, akar = dir, hasil = []) {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) halamanErd(p, akar, hasil);
    else if (n === "index.html" && readFileSync(p, "utf8").includes('data-erd-tumbuh="')) hasil.push("/" + path.relative(akar, path.dirname(p)).split(path.sep).join("/") + "/");
  }
  return hasil.sort();
}
const daftarErd = halamanErd(path.resolve("dist"));
// Daftar tanpa 1.12 berarti pencarian di dist/ rusak atau widget lepas dari 1.12, bukan "lolos tanpa diperiksa".
lapor(daftarErd.includes(HAL) && daftarErd.includes(HAL2) && daftarErd.includes("/uji/erd/"), `halaman dengan ErdTumbuh di dist/: ${daftarErd.join(", ") || "tidak ada"}`);
for (const h of daftarErd.filter((x) => x !== HAL && x !== "/uji/erd/")) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();
  await page.goto(BASE + h, { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  for (const f of await page.locator(FIG).all()) await f.scrollIntoViewIfNeeded();
  await page.waitForFunction((FIG) => [...document.querySelectorAll(FIG)].every((f) => f.querySelector(".react-flow__node .erd-tumbuh__node")), FIG, { timeout: 15000 });
  await laporBawaan(page, `${h} 375×667`);
  await ctx.close();
}

// 11. 2.9 Skema data (keputusan 632). Tanpa JS: versi statis bawaan Tahap 2 (8 tabel + 3 yang dihapus) utuh.
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();
  await page.goto(BASE + HAL2);
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
  lapor(r.tabel === 11 && r.dihapus === 3 && r.tinggi > 200 && !r.terpotong && !r.flow, `${HAL2} tanpa JS: ${r.tabel} tabel (${r.dihapus} dihapus), tinggi ${Math.round(r.tinggi)} px, ${r.terpotong ? "TERPOTONG" : "utuh"}, React Flow ${r.flow ? "ADA" : "tidak ada"}`);
  await ctx.close();
}
// Dengan JS: mulai di Tahap 2 (11 node), lalu "Bandingkan dengan Tahap 1" = ubah satu hal di blok Coba: 13 node,
// 18 edge, semua node di dalam wadah, tanpa luapan halaman; tombolnya aria-pressed.
for (const [lebar, tinggi] of [
  [375, 667],
  [1366, 657],
]) {
  const ctx = await browser.newContext({ viewport: { width: lebar, height: tinggi }, hasTouch: lebar < 500 });
  const page = await ctx.newPage();
  await page.goto(BASE + HAL2, { waitUntil: "networkidle" });
  await page.locator(FIG).scrollIntoViewIfNeeded();
  await page.waitForFunction((FIG) => document.querySelectorAll(`${FIG} .react-flow__node .erd-tumbuh__node`).length > 0, FIG, { timeout: 15000 });
  const awal = await bentuk(page);
  const tekan = page.locator(`${FIG} .erd-tumbuh__banding`);
  const sebelum = await tekan.getAttribute("aria-pressed");
  await tekan.click();
  await page.waitForFunction((FIG) => document.querySelectorAll(`${FIG} .react-flow__node`).length === 13, FIG, { timeout: 15000 });
  await page.waitForTimeout(400);
  const bd = await bentuk(page);
  const sesudah = await tekan.getAttribute("aria-pressed");
  lapor(awal.node === 11 && awal.luar === 0 && sebelum === "false" && sesudah === "true" && bd.edge === 18 && bd.luar === 0 && bd.lebarDok <= 0, `${HAL2} ${lebar}×${tinggi}: awal ${awal.node} node; Bandingkan aria-pressed ${sebelum}→${sesudah}, ${bd.berdampingan ? "berdampingan" : "bertumpuk"}, ${bd.node} node, ${bd.edge} edge, ${bd.luar} di luar wadah, luapan ${bd.lebarDok} px`);
  await laporBawaan(page, `${HAL2} ${lebar}×${tinggi} bandingkan`);
  await ctx.close();
}
{
  const tutup = await js(HAL2);
  const buka = await js(HAL2, true);
  lapor(tutup.flow && buka.flow, `${HAL2} React Flow ${tutup.flow ? "dimuat" : "TIDAK dimuat"} saat dimuat (blok Coba terbuka), ${buka.flow ? "dimuat" : "TIDAK dimuat"} sesudah semua blok dibuka`);
  console.log(`info JS ${HAL2}: saat dimuat ${tutup.file} file, ${kb(tutup.mentah)} tanpa kompresi, ${kb(tutup.gzip)} gzip; semua blok dibuka ${buka.file} file, ${kb(buka.mentah)}, ${kb(buka.gzip)} gzip`);
}

// 12. Pemilih tahap dan Bandingkan di setiap halaman ber-ErdTumbuh yang punya pemilih (keputusan 1285). Memilih tahap pertama
// halaman (Tahap 2 di 3.5, Tahap 3 di 4.5) pernah melempar "ERD Tahap N tidak ada di data widget" dan melepas seluruh widget,
// karena status tahap itu dihitung terhadap tahap yang tidak ada di data halaman; bagian 1 sampai 11 tidak pernah menekan
// tombol itu di 3.5 dan 4.5. Sebelum hydrate pemilih tersembunyi tetapi menempati ruangnya, dan tanpa JavaScript tidak tampil
// (tombol yang tidak berfungsi tidak boleh terlihat).
{
  const keadaan = (page) =>
    page.evaluate((FIG) => {
      const f = document.querySelector(FIG);
      return {
        figure: document.querySelectorAll(FIG).length,
        node: f ? f.querySelectorAll(".react-flow__node").length : 0,
        tertekan: f ? [...f.querySelectorAll(".erd-tumbuh__pilih button")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.textContent.trim()) : [],
        bandingTertekan: f?.querySelector(".erd-tumbuh__banding")?.getAttribute("aria-pressed") ?? null,
      };
    }, FIG);
  const MODUL4 = JSON.parse(readFileSync(path.resolve("data/erd/modul-tahap-4.json"), "utf8")).modul.length;
  let diklik = 0;
  for (const h of daftarErd.filter((x) => x !== HAL)) {
    const masalah = [];
    // a. JavaScript hidup: setiap tombol tahap, lalu Bandingkan bila ada; widget tetap ada, tanpa galat.
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 657 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const galat = [];
    page.on("pageerror", (e) => galat.push(e.message.split("\n")[0]));
    await page.goto(BASE + h, { waitUntil: "networkidle" });
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    const fig = page.locator(FIG).first();
    await fig.scrollIntoViewIfNeeded();
    await page.waitForFunction((FIG) => document.querySelector(`${FIG} .react-flow__node .erd-tumbuh__node`), FIG, { timeout: 15000 });
    const tombol = fig.locator(".erd-tumbuh__pilih button");
    const n = await tombol.count();
    if (n < 2) masalah.push(`pemilih ${n} tombol`);
    // Pembagian modul ERD4 dipasang ErdHalaman untuk tahap yang ditampilkan: 4.5 membuka Tahap 4, jadi tabelnya ada sejak awal.
    if (h === "/tahap-4/skema-data/") {
      const barisModul = await page.locator(`${FIG} .erd-tumbuh__modul tbody tr`).count();
      if (barisModul !== MODUL4) masalah.push(`tabel pembagian modul ${barisModul} baris, seharusnya ${MODUL4}`);
    }
    for (let i = 0; i < n; i++) {
      const nama = (await tombol.nth(i).innerText({ timeout: 3000 })).trim();
      try { await tombol.nth(i).click({ timeout: 3000 }); } catch { masalah.push(`${nama}: widget lepas`); break; }
      await page.waitForTimeout(300);
      const k = await keadaan(page);
      diklik++;
      if (k.figure !== 1 || k.node === 0 || k.tertekan.join() !== nama) masalah.push(`${nama}: ${k.figure} figure, ${k.node} node, tertekan ${JSON.stringify(k.tertekan)}`);
      if (k.figure !== 1) break; // widget lepas: tombol berikutnya tidak ada lagi, jangan menunggu batas waktu
      const banding = fig.locator(".erd-tumbuh__banding");
      if (await banding.count()) {
        try { await banding.click({ timeout: 3000 }); } catch { masalah.push(`${nama} + Bandingkan: widget lepas`); break; }
        await page.waitForTimeout(300);
        const kb2 = await keadaan(page);
        if (kb2.figure !== 1 || kb2.node === 0 || kb2.bandingTertekan !== "true") masalah.push(`${nama} + Bandingkan: ${kb2.figure} figure, ${kb2.node} node, aria-pressed ${kb2.bandingTertekan}`);
        await banding.click({ timeout: 3000 });
      }
    }
    if (galat.length) masalah.push(`galat halaman: ${galat[0]}`);
    await ctx.close();
    // b. Tanpa JavaScript: pemilih dan Bandingkan tidak tampil.
    const ctxNo = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
    const pageNo = await ctxNo.newPage();
    await pageNo.goto(BASE + h);
    const noJs = await pageNo.evaluate(() => {
      const k = document.querySelector("figure.erd-tumbuh .erd-tumbuh__kontrol");
      return k ? getComputedStyle(k).display : "tidak ada";
    });
    if (noJs === "block" || noJs === "flex") masalah.push(`tanpa JavaScript pemilih tampil (${noJs})`);
    await ctxNo.close();
    // c. JavaScript lambat: sebelum hydrate pemilih tersembunyi dan menempati ruangnya, supaya hydrate tidak menggeser isi.
    const ctxLambat = await browser.newContext({ viewport: { width: 1366, height: 657 } });
    await ctxLambat.route(/\/_astro\/.*\.js/, async (r) => { await new Promise((x) => setTimeout(x, 800)); await r.continue(); });
    const pageLambat = await ctxLambat.newPage();
    await pageLambat.goto(BASE + h, { waitUntil: "domcontentloaded" });
    const belum = await pageLambat.evaluate(() => {
      const k = document.querySelector("figure.erd-tumbuh .erd-tumbuh__kontrol");
      return k ? { visibility: getComputedStyle(k).visibility, tinggi: k.getBoundingClientRect().height } : null;
    });
    if (!belum || belum.visibility !== "hidden" || belum.tinggi < 20) masalah.push(`sebelum hydrate pemilih ${belum ? `${belum.visibility}, ${Math.round(belum.tinggi)} px` : "tidak ada"}`);
    await ctxLambat.close();
    lapor(masalah.length === 0, `${h}: ${n} tombol tahap dipilih satu per satu (dan Bandingkan), widget tetap ada tanpa galat; tanpa JavaScript pemilih ${noJs}; sebelum hydrate ${belum ? belum.visibility : "?"}${masalah.length ? " · " + masalah.join(" | ") : ""}`);
  }
  lapor(daftarErd.includes("/tahap-3/skema-data/") && daftarErd.includes("/tahap-4/skema-data/") && diklik >= 8, `pemilih tahap diperiksa di 3.5 dan 4.5 (${diklik} tombol dipilih; pagar: 3.5 dan 4.5 ada di dist/ dan paling sedikit 8 tombol)`);
}

await browser.close();
console.log(gagal ? `ERD bertumbuh GAGAL (${gagal})` : "ERD bertumbuh: statis tanpa JS, scroll tidak tertangkap, keyboard, klik dan tap jalan, bawaan React Flow tidak terbaca, tanpa animasi saat reduced, React Flow hanya di halamannya");
process.exit(gagal ? 1 : 0);
