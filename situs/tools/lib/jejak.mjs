// Jejak per halaman untuk diagnosa macet di alat ukur paralel (G2b, keputusan 364). Keputusan 360 hanya bisa menulis
// "halaman tidak menjawab", karena evaluate kedua butuh thread utama renderer yang tertahan, dan sesi CDP baru
// (Debugger.enable) juga tidak selesai. Yang tetap terbaca sesudah thread itu tertahan, dipasang sebelum navigasi:
//   1. langkah di sisi Node (goto, evaluate, ...) dan sejak kapan;
//   2. detak dari halaman (addInitScript, setInterval 250 ms, lewat console.debug): kapan thread utama terakhir bebas,
//      tahap ukur (window.__tahap) dan readyState saat itu, serta jeda antardetak terlama di halaman itu;
//   3. request yang belum selesai;
//   4. sesi CDP yang sudah terpasang: Performance.getMetrics (ScriptDuration, LayoutDuration, RecalcStyleDuration,
//      TaskDuration) dua kali berjarak 1 s, lalu Runtime.terminateExecution dan evaluate ulang;
//   5. waktu CPU per proses renderer dari sesi CDP browser (SystemInfo.getProcessInfo), dalam jendela 1 s yang sama.
// Diuji lokal dengan loop sinkron tanpa akhir (Playwright 1.64.0, Chromium headless shell): evaluate tidak menjawab,
// Performance.getMetrics menjawab dengan ScriptDuration naik ±1 s per detik, CPU renderer naik ±1 s per detik, dan
// sesudah Runtime.terminateExecution evaluate menjawab lagi. Jadi: metrik menjawab dan ScriptDuration naik berarti
// JavaScript yang berputar; metrik tidak menjawab berarti thread tertahan di luar JavaScript (layout, style, atau
// menunggu proses lain), dan CPU renderer membedakan sibuk dari menunggu.
// JEJAK_TUMPUKAN=1 menyalakan Debugger di setiap halaman sejak awal supaya Debugger.pause bisa mengambil tumpukan JS
// saat macet (mahal, hanya untuk percobaan).
const detik = (ms) => `${(ms / 1000).toFixed(1)} s`;
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
const TIDAK = Symbol("tidak menjawab");
const atau = (janji, ms) => Promise.race([janji.catch((e) => `error ${e.message.split("\n")[0]}`), tidur(ms).then(() => TIDAK)]);
const TUMPUKAN = !!process.env.JEJAK_TUMPUKAN;

// Sesi CDP browser untuk waktu CPU per proses; satu per alat. Gagal dibuat (mis. bukan Chromium): diagnosa tanpa CPU.
export async function sesiBrowser(browser) {
  return browser.newBrowserCDPSession().catch(() => null);
}

export async function pasangJejak(page, sesiCdpBrowser = null) {
  const j = { page, langkah: "belum mulai", sejak: Date.now(), detak: null, detakPada: 0, jedaMaks: 0, minta: new Map(), cdp: null, sesiCdpBrowser };
  j.tandai = (langkah) => { j.langkah = langkah; j.sejak = Date.now(); };
  page.on("console", (m) => {
    if (m.type() !== "debug" || !m.text().startsWith("__detak ")) return;
    j.detak = m.text().slice(8); j.detakPada = Date.now();
    const jeda = Number(/jeda (\d+)/.exec(j.detak)?.[1] ?? 0);
    if (jeda > j.jedaMaks) j.jedaMaks = jeda;
  });
  page.on("request", (r) => j.minta.set(r, Date.now()));
  for (const e of ["requestfinished", "requestfailed"]) page.on(e, (r) => j.minta.delete(r));
  // Jeda: long task terlama (PerformanceObserver longtask, > 50 ms) atau keterlambatan detak terlama, mana yang lebih besar.
  await page.addInitScript(() => {
    let akhir = performance.now(), maks = 0;
    const detak = () => console.debug(`__detak ${Math.round(performance.now())} ms, jeda ${Math.round(maks)} ms, tahap "${window.__tahap ?? "-"}", readyState ${document.readyState}, scrollY ${Math.round(scrollY)}`);
    setInterval(() => {
      const kini = performance.now();
      maks = Math.max(maks, kini - akhir - 250);
      akhir = kini;
      detak();
    }, 250);
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) maks = Math.max(maks, e.duration); detak(); }).observe({ type: "longtask", buffered: true });
    } catch {}
  });
  j.cdp = await page.context().newCDPSession(page);
  await j.cdp.send("Performance.enable");
  if (TUMPUKAN) {
    j.skrip = new Map();
    j.cdp.on("Debugger.scriptParsed", (e) => j.skrip.set(e.scriptId, e.url));
    await j.cdp.send("Debugger.enable");
  }
  return j;
}

const METRIK = ["ScriptDuration", "LayoutDuration", "RecalcStyleDuration", "TaskDuration"];
async function metrik(j) {
  const m = await atau(j.cdp.send("Performance.getMetrics"), 1000);
  return typeof m === "object" ? Object.fromEntries(m.metrics.filter((x) => METRIK.includes(x.name)).map((x) => [x.name, x.value])) : null;
}
async function cpu(j) {
  if (!j.sesiCdpBrowser) return null;
  const p = await atau(j.sesiCdpBrowser.send("SystemInfo.getProcessInfo"), 1000);
  return typeof p === "object" ? Object.fromEntries(p.processInfo.map((x) => [`${x.type} ${x.id}`, x.cpuTime])) : null;
}

// evaluasi: fungsi yang mengembalikan janji page.evaluate(diagnosa halaman). Hasilnya teks untuk pesan MACET.
export async function diagnosaJejak(j, evaluasi) {
  const kini = Date.now();
  const bagian = [`langkah Node "${j.langkah}" sejak ${detik(kini - j.sejak)}`,
    j.detakPada ? `detak terakhir ${detik(kini - j.detakPada)} lalu (${j.detak})` : "belum ada detak dari dokumen ini"];
  const tunda = [...j.minta].map(([r, t]) => `${r.url().replace(/^https?:\/\/[^/]+/, "")} ${detik(kini - t)}`);
  bagian.push(tunda.length ? `request belum selesai: ${tunda.slice(0, 4).join(", ")}${tunda.length > 4 ? ` (+${tunda.length - 4})` : ""}` : "tanpa request tertunda");
  const jawab = await atau(evaluasi(), 2000);
  if (jawab !== TIDAK) return [...bagian, `halaman menjawab: ${jawab}`].join("; ");
  const [m0, c0] = await Promise.all([metrik(j), cpu(j)]);
  await tidur(1000);
  const [m1, c1] = await Promise.all([metrik(j), cpu(j)]);
  bagian.push("evaluate tidak dijawab dalam 2 s");
  bagian.push(m0 && m1 ? `selama 1 s ${METRIK.map((k) => `${k} +${(m1[k] - m0[k]).toFixed(2)} s`).join(", ")}` : "Performance.getMetrics tidak menjawab (thread tertahan di luar JavaScript)");
  if (c0 && c1) {
    const naik = Object.keys(c1).filter((k) => k.startsWith("renderer") && k in c0).map((k) => [k, c1[k] - c0[k]]).sort((a, b) => b[1] - a[1]);
    const semua = Object.keys(c1).filter((k) => k in c0).reduce((s, k) => s + c1[k] - c0[k], 0);
    bagian.push(`CPU ${naik.length} renderer selama 1 s: ${naik.slice(0, 3).map(([k, v]) => `${k} ${v.toFixed(2)} s`).join(", ")}; semua proses ${semua.toFixed(2)} s`);
  } else bagian.push("CPU proses tidak terbaca");
  if (m0 && m1) {
    if (TUMPUKAN) {
      const jeda = new Promise((r) => j.cdp.once("Debugger.paused", r));
      await atau(j.cdp.send("Debugger.pause"), 1000);
      const ev = await atau(jeda, 1500);
      if (typeof ev === "object") {
        bagian.push(`tumpukan JS: ${ev.callFrames.slice(0, 8).map((f) => `${f.functionName || "(anonim)"} ${(f.url || j.skrip.get(f.location.scriptId) || "?").replace(/^https?:\/\/[^/]+/, "")}:${f.location.lineNumber + 1}:${f.location.columnNumber + 1}`).join(" < ")}`);
        await atau(j.cdp.send("Debugger.resume"), 1000);
      } else bagian.push("Debugger.pause tanpa tumpukan");
    }
    const t = await atau(j.cdp.send("Runtime.terminateExecution"), 1000);
    const lagi = t === TIDAK ? TIDAK : await atau(evaluasi(), 2000);
    bagian.push(lagi === TIDAK ? "sesudah Runtime.terminateExecution tetap tidak menjawab" : `sesudah Runtime.terminateExecution halaman menjawab: ${lagi}`);
  }
  return bagian.join("; ");
}
