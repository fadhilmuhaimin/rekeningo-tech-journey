// Penggerak Playwright untuk lab t3-dasbor (keputusan 974): satu proses Chromium nyata per skenario, supaya
// bukti XSS, cookie, dan CSRF berasal dari perilaku browser sungguhan, bukan ingatan (R3-19, R3-20).
// Dijalankan lewat run.py dengan NODE_PATH diarahkan ke situs/node_modules (situs sudah memasang Playwright;
// lab ini tidak menambah dependency Node). Hasil tiap skenario ditulis sebagai satu baris JSON ke stdout.
//
//   node driver.js xss <loginUrl> <email> <password> <dasborUrl>
//   node driver.js xss-lawan-csrf <loginUrl> <email> <password> <dasborUrl>
//   node driver.js csrf <loginUrl> <email> <password> <dasborUrl> <serenganUrl>
//   node driver.js webauthn <pageOrigin host:port> <rpId tanpa port>
'use strict';
const { chromium } = require('playwright');

async function login(page, loginUrl, email, password) {
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', password);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.click('button[type=submit]')]);
}

async function xss(loginUrl, email, password, dasborUrl) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const dialogs = [];
  page.on('dialog', async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    await d.dismiss();
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await login(page, loginUrl, email, password);
  // login sudah mengarahkan ke /dasbor?csrf=...; tunggu fetch dan render selesai.
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(200);
  // document.cookie: nilai aslinya tidak diembalikan (token acak beda tiap jalan, akan merusak "diulang identik"
  // make cek); yang dipakai cukup apakah skrip BISA membacanya sama sekali, dan apakah isinya memuat nama cookie
  // sesi (bukti langsung bahwa pembacaan itu nyata, bukan string kosong karena nama cookie salah).
  const cookieJS = await page.evaluate(() => document.cookie);
  const cookieJSBisaDibaca = cookieJS !== '';
  const cookieJSMemuatNamaSesi = cookieJS.includes('sesi=');
  // Bukti isi DOM, bukan sumber HTML: jumlah elemen <img> nyata yang terbentuk di #daftar (rentan: 1, aman: 0)
  // dan teks yang benar-benar terlihat pembaca (keduanya harus memuat payload sebagai teks, hanya beda sebagai tag).
  const elemImgDiDaftar = await page.evaluate(() => document.querySelectorAll('#daftar img').length);
  const teksDaftar = await page.evaluate(() => document.getElementById('daftar').textContent);
  const cookies = await context.cookies();
  const sesiCookie = cookies.find((c) => c.name === '__Host-sesi' || c.name === 'sesi') || null;
  await browser.close();
  return { dialogs, errors, cookieJSBisaDibaca, cookieJSMemuatNamaSesi,
    cookieHttpOnly: sesiCookie ? sesiCookie.httpOnly : null,
    cookieSecure: sesiCookie ? sesiCookie.secure : null, cookieSameSite: sesiCookie ? sesiCookie.sameSite : null,
    cookieName: sesiCookie ? sesiCookie.name : null, elemImgDiDaftar, teksDaftar };
}

// xssLawanCsrf: bukti "XSS mengalahkan token CSRF" (R3-19). Dasbor di sini punya CSRF LENGKAP (-token wajib,
// Origin/Sec-Fetch-Site diperiksa), hanya -escape dan -csp yang rentan. Sesudah onerror terbukti berjalan
// (bagian xss), skrip yang sama bisa membaca variabel global `csrf` di halaman dan memanggil endpoint yang
// sama persis dengan yang dipakai form asli di halaman itu (same-origin, credentials sama) — bukan menembus
// Origin/Sec-Fetch-Site/token, tapi mewarisi semuanya karena ia memang berjalan sebagai halaman itu sendiri.
async function xssLawanCsrf(loginUrl, email, password, dasborUrl) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const dialogs = [];
  page.on('dialog', async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    await d.dismiss();
  });
  await login(page, loginUrl, email, password);
  await page.waitForLoadState('networkidle');
  const statusFetch = await page.evaluate(async () => {
    const r = await fetch('/api/menu/harga', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.csrf },
      body: JSON.stringify({ produk_id: 1, harga: 2 }),
    });
    return r.status;
  });
  await browser.close();
  return { dialogs, statusFetch };
}

async function csrf(loginUrl, email, password, dasborUrl, serenganUrl) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, loginUrl, email, password);
  await page.waitForLoadState('networkidle');
  // Form di halaman serangan mengirim diri sendiri (lintas situs) ke dasborUrl begitu dimuat.
  await page.goto(serenganUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await browser.close();
  return { navigasiSelesai: true };
}

// webauthn: percobaan terbatas (brief, R3-20) memakai domain CDP WebAuthn Playwright. Hanya ceremony sisi
// browser (navigator.credentials.create langsung di halaman kosong, rp.id = rpId); tidak ada server go-webauthn
// (dependency baru yang butuh ADR tersendiri, di luar lingkup "dasbor kecil"). Kalau create() gagal atau CDP
// WebAuthn tidak tersedia, skrip mengembalikan ok:false dan halaman menulis Tidak dijalankan.
async function webauthn(pageOrigin, rpId) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  const out = { ok: false, langkah: 'mulai' };
  try {
    await client.send('WebAuthn.enable');
    out.langkah = 'WebAuthn.enable';
    const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
      options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true },
    });
    out.langkah = 'addVirtualAuthenticator';
    out.authenticatorId = authenticatorId;
    await page.goto(`http://${pageOrigin}/login`, { waitUntil: 'domcontentloaded' });
    const hasil = await page.evaluate(async (rp) => {
      try {
        const cred = await navigator.credentials.create({
          publicKey: {
            rp: { id: rp, name: 'lab t3-dasbor' },
            user: { id: new Uint8Array([1, 2, 3, 4]), name: 'warung.ani@lestari.example', displayName: 'Warung Ani' },
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
            timeout: 5000,
          },
        });
        return { ok: true, id: cred && cred.id ? 'ada' : 'kosong' };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }, rpId);
    out.langkah = 'navigator.credentials.create';
    Object.assign(out, hasil);
  } catch (e) {
    out.error = String(e);
  } finally {
    await browser.close();
  }
  return out;
}

async function main() {
  const [, , mode, ...arg] = process.argv;
  let hasil;
  if (mode === 'xss') hasil = await xss(...arg);
  else if (mode === 'xss-lawan-csrf') hasil = await xssLawanCsrf(...arg);
  else if (mode === 'csrf') hasil = await csrf(...arg);
  else if (mode === 'webauthn') hasil = await webauthn(...arg);
  else throw new Error('mode tidak dikenal: ' + mode);
  process.stdout.write(JSON.stringify(hasil) + '\n');
}

main().catch((e) => {
  process.stderr.write(String((e && e.stack) || e) + '\n');
  process.exit(1);
});
