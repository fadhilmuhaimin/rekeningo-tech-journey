// Uji keyboard saja untuk bukti W4 evaluasi tahap (EVAL-2, keputusan 753). Tidak masuk gerbang.
//   node tools/eval-keyboard.mjs --url http://127.0.0.1:4321 --path /tahap-2/fitur-tutup-buku/ [--ukuran 375x667] [--uji-diri]
// Satu pembaca yang hanya memakai keyboard: Tab dari atas halaman sampai tombol Berikutnya halaman (a.bb-lanjut__next).
// Di setiap blok lipat yang tertutup, ia menekan Enter pada summary supaya isinya terbaca. Yang dicatat:
//   - jumlah Tab sampai isi halaman (main) dan sampai Berikutnya halaman, dan stop pertama (harus tautan lewati ke konten);
//   - stop tanpa tanda fokus: outline dan box-shadow computed elemen yang fokus kosong (tidak mengukur kontras 3:1
//     atau SC 2.4.11, dan kontrol yang menggambar tandanya di elemen lain, mis. label sesudah radio, tercatat juga
//     supaya dilihat mata);
//   - kontrol interaktif di main yang terlihat, tidak di dalam blok tertutup, dan tidak pernah mendapat fokus.
// Exit 1 bila: Berikutnya halaman tidak tercapai, ada stop tanpa tanda fokus, ada kontrol yang terlewat, atau halaman
// tidak dijawab HTTP 200. Widget yang dioperasikan dengan keyboard diperiksa ukur-race.mjs dan alat ukur widget lain;
// alat ini hanya membuktikan urutan Tab dan tanda fokus di seluruh halaman.
// --uji-diri: memasang `*:focus-visible { outline: none !important; box-shadow: none !important }` lalu berhasil (exit 0)
// hanya bila alat benar-benar melihat stop tanpa tanda fokus, jadi alat terbukti bisa gagal.
import { chromium } from "@playwright/test";

const argv = process.argv;
const arg = (k, d) => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : d; };
const BASE = arg("--url", "http://127.0.0.1:4321").replace(/\/$/, "");
const PATH = arg("--path", "/");
const [width, height] = arg("--ukuran", "375x667").split("x").map(Number);
const ujiDiri = argv.includes("--uji-diri");
const MAKS_TAB = 900;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
const page = await ctx.newPage();
const respons = await page.goto(BASE + PATH, { waitUntil: "load" });
if (!respons || respons.status() !== 200) {
  console.log(`GAGAL ${PATH}: HTTP ${respons ? respons.status() : "tanpa jawaban"}`);
  await browser.close();
  process.exit(1);
}
if (ujiDiri) await page.addStyleTag({ content: "*:focus-visible { outline: none !important; box-shadow: none !important; }" });
await page.waitForFunction(() => [...document.querySelectorAll("astro-island")].every((i) => !i.hasAttribute("ssr") || !i.offsetParent), null, { timeout: 15000 }).catch(() => {});
await page.evaluate(() => window.scrollTo(0, 0));

const info = () => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body) return { body: true };
  const cs = getComputedStyle(e);
  const nama = (e.getAttribute("aria-label") || e.innerText || e.textContent || e.getAttribute("title") || e.getAttribute("href") || "").replace(/\s+/g, " ").trim().slice(0, 50);
  return {
    tag: e.tagName.toLowerCase(), nama, dalamMain: !!e.closest("main"),
    fv: e.matches(":focus-visible"),
    ring: (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none",
    berikut: e.matches("a.bb-lanjut__next"),
  };
});

const stops = [];
let awalMain = -1, berikut = -1, dibuka = 0;
for (let i = 0; i < MAKS_TAB; i++) {
  await page.keyboard.press("Tab");
  const s = await info();
  if (s.body) { if (i > 5) break; continue; }
  stops.push(s);
  if (awalMain < 0 && s.dalamMain) awalMain = stops.length - 1;
  if (s.tag === "summary" && !(await page.evaluate(() => document.activeElement.parentElement.hasAttribute("open")))) { await page.keyboard.press("Enter"); dibuka++; }
  if (s.berikut) { berikut = stops.length - 1; break; }
}
const tanpaRing = stops.filter((s) => !s.ring);
const fokus = new Set(stops.filter((s) => s.dalamMain).map((s) => s.tag + "|" + s.nama));
const terlewat = (await page.evaluate(() => [...document.querySelectorAll("main a[href], main button, main input, main select, main textarea, main summary, main [tabindex]")]
  .filter((e) => e.tabIndex >= 0 && !e.disabled && !e.closest("[inert],[aria-hidden='true']") && !(e.closest("details:not([open])") && e.tagName !== "SUMMARY") && e.getBoundingClientRect().width > 0)
  .map((e) => ({ tag: e.tagName.toLowerCase(), nama: (e.getAttribute("aria-label") || e.innerText || e.getAttribute("href") || "").replace(/\s+/g, " ").trim().slice(0, 50) }))))
  .filter((e) => !fokus.has(e.tag + "|" + e.nama));

console.log(`${PATH} ${width}x${height}: ${stops.length} Tab, stop pertama "${stops[0]?.nama}", isi halaman di Tab ke-${awalMain + 1}, Berikutnya halaman di Tab ke-${berikut + 1}, ${dibuka} blok dibuka dengan Enter, tanpa tanda fokus ${tanpaRing.length}, kontrol terlewat ${terlewat.length}`);
for (const s of tanpaRing.slice(0, 8)) console.log(`  tanpa tanda fokus: ${s.tag} "${s.nama}"`);
for (const e of terlewat.slice(0, 8)) console.log(`  terlewat: ${e.tag} "${e.nama}"`);
await browser.close();
if (ujiDiri) {
  if (tanpaRing.length > 0) { console.log("uji diri lolos: alat melihat stop tanpa tanda fokus saat tanda fokus dimatikan"); process.exit(0); }
  console.log("uji diri GAGAL: tanda fokus dimatikan tetapi alat tidak melihat apa pun");
  process.exit(1);
}
if (berikut < 0 || tanpaRing.length > 0 || terlewat.length > 0) process.exit(1);
