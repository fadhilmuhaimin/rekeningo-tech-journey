// Batas waktu per halaman untuk alat ukur Playwright (keputusan 360). Di Playwright 1.64.0 page.evaluate tidak punya
// opsi timeout (opsinya hanya exposeFunctions; klien mengirimnya dengan kNoTimeout), jadi evaluate menunggu selamanya
// bila janji di halaman tidak pernah selesai (document.fonts.ready, requestAnimationFrame yang tidak dijadwalkan) atau
// thread utama halaman tertahan. waitForFunction, goto, dan locator memakai batas bawaan library 30 s
// (DEFAULT_PLAYWRIGHT_TIMEOUT). Tanpa batas, alat macet sampai timeout langkah CI membunuhnya, dan log tidak menyebut halaman.
//   denganBatas(kerja, label, { ms, diagnosa }): satu langkah, untuk alat yang membuka banyak halaman sekaligus.
//   awasi(browser, { alat, ms }): satu pengawas untuk alat yang membuka halaman satu per satu; setiap navigasi halaman
//   utama menyetel ulang timer, jadi batasnya berlaku per halaman tanpa membungkus setiap evaluate.
// Kedua cara mencetak `MACET <alat> <ukuran> <halaman>: ...` dan alat keluar dengan exit 1.
// Batas bawaan 30 s (BATAS_HALAMAN_MS mengubahnya). BATAS_RINCI=1 mencetak jeda terlama antarnavigasi ke stderr.
export const BATAS_MS = Number(process.env.BATAS_HALAMAN_MS) || 30_000;

export class Macet extends Error {}

const detik = (ms) => `${(ms / 1000).toFixed(ms % 1000 ? 1 : 0)} s`;

// kerja: janji atau fungsi yang mengembalikan janji. diagnosa: fungsi async yang dipanggil saat batas habis; hasilnya
// (teks) ditambahkan ke pesan, dengan batas msDiagnosa (bawaan 5 s) sendiri karena halaman yang macet bisa juga tidak
// menjawab; diagnosa jejak.mjs butuh ±6 s (keputusan 364).
export async function denganBatas(kerja, label, { ms = BATAS_MS, diagnosa, msDiagnosa = 5000 } = {}) {
  let timer;
  const habis = new Promise((_, tolak) => { timer = setTimeout(() => tolak(new Macet(`MACET ${label}: tidak selesai dalam ${detik(ms)}`)), ms); });
  try {
    return await Promise.race([typeof kerja === "function" ? kerja() : kerja, habis]);
  } catch (e) {
    if (e instanceof Macet && diagnosa) {
      const d = await denganBatas(diagnosa, "diagnosa", { ms: msDiagnosa }).catch((x) => `halaman tidak menjawab (${x.message.replace(/^MACET /, "")})`);
      e.message += `; ${d}`;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Syarat: hanya untuk alat yang membuka halaman satu per satu. Timernya satu per browser dan disetel ulang oleh navigasi
// halaman mana pun, jadi di alat yang membuka halaman paralel, halaman yang macet tertutup navigasi halaman lain dan
// labelnya menunjuk halaman yang salah; alat seperti itu memakai denganBatas per halaman (ukur-luapan, ukur-kontras).
// Batasnya juga salah bila satu navigasi diikuti kerja sah lebih dari ms (jeda terlama sekarang 5,7 s, BATAS_RINCI=1).
export function awasi(browser, { alat = "alat", ms = BATAS_MS } = {}) {
  let label = `${alat} sebelum navigasi pertama`, sejak = Date.now(), terlama = { ms: 0, label }, timer;
  const setel = (baru) => {
    const kini = Date.now();
    if (kini - sejak > terlama.ms) terlama = { ms: kini - sejak, label };
    label = baru; sejak = kini;
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log(`MACET ${label}: tidak selesai dalam ${detik(ms)} sesudah navigasi terakhir (batas per halaman, keputusan 360)`);
      process.exit(1);
    }, ms);
    timer.unref();
  };
  const pasang = (page) => page.on("framenavigated", (f) => {
    if (f !== page.mainFrame()) return;
    const v = page.viewportSize();
    let p = f.url();
    try { const u = new URL(p); p = u.protocol.startsWith("http") ? u.pathname + u.hash : p; } catch {}
    setel(`${alat}${v ? ` ${v.width}x${v.height}` : ""} ${p}`);
  });
  // Browser.newPage memanggil this.newContext, jadi halaman dari newPage ikut terpasang.
  const asli = browser.newContext.bind(browser);
  browser.newContext = async (...a) => { const c = await asli(...a); c.on("page", pasang); return c; };
  browser.on("disconnected", () => {
    clearTimeout(timer);
    if (process.env.BATAS_RINCI) { setel(label); clearTimeout(timer); console.error(`batas: jeda terlama ${detik(terlama.ms)} (${terlama.label})`); }
  });
  setel(`${alat} membuka browser`);
  return browser;
}
