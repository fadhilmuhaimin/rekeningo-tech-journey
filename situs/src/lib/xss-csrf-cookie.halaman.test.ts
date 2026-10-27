// Penjaga halaman 3.23 (keputusan 1088 sampai 1090): angka, status, ID, rentang Snippet, tanggal akses, versi sumber, label,
// dan kalimat di xss-csrf-cookie.mdx, JSON Rantai, Tebak, banding, dan empat halaman istilah diturunkan dari rekaman
// labs/t3-dasbor (xss.txt, csrf.txt, webauthn.txt), kode lab (dasbor, serangan, driver.js, main_test.go, run.py, README), api-t3
// (notif.go), registry, naskah, RISET, dan glosarium, bukan dari daftar yang ditulis sendiri.
// Dua lapis: (1) nilai bergantung pada sumber dihitung ulang di sini dan dibandingkan dengan halaman; (2) kata-kata halaman
// dikunci per baris lewat xss-csrf-cookie.halaman.nilai.ts, supaya satu kata yang berubah (mis. "tidak" disisipkan) gagal.
// Tes hanya membaca berkas terlacak git. Klaim dokumentasi luar dijaga lewat baris riset R3-210 sampai R3-214.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t3-xss-csrf-inti.json";
import tebakMentah from "../../data/widget/t3-xss-csrf-tebak.json";
import bandingMentah from "../../lama/widgets/data/t3-xss-csrf-banding.json";
import registry from "../../data/cerita.json";
import { DataTebak } from "../widgets/tebak/skema";
import { daftarBlok } from "./blok";
import { HalamanIstilah } from "./istilah";
import { DataRantai } from "./rantai";
import { BARIS_MDX, BENTUK_MDX, NILAI_JSON } from "./xss-csrf-cookie.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const terlacak: Set<string> | null = (() => {
  try {
    return new Set(execSync("git ls-files", { cwd: akar, maxBuffer: 1 << 26 }).toString().split("\n"));
  } catch {
    return null;
  }
})();
const baca = (rel: string): string => {
  if (terlacak) expect(terlacak.has(rel), `tes membaca berkas yang tidak terlacak git: ${rel}`).toBe(true);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};

const berkasMdx = "situs/src/content/docs/tahap-3/xss-csrf-cookie.mdx";
const mdx = baca(berkasMdx);
const frontmatter = mdx.split(/^---\n/m)[1]!;
const isi = mdx.split(/^---\n/m).slice(2).join("---\n");
const barisMdx = mdx.split("\n").filter((b) => b.trim() && !/^<Snippet (file|files)=/.test(b));
const lab = "labs/t3-dasbor";
const xssTxt = baca(`${lab}/output/xss.txt`);
const csrfTxt = baca(`${lab}/output/csrf.txt`);
const webTxt = baca(`${lab}/output/webauthn.txt`);
const runPy = baca(`${lab}/run.py`);
const readme = baca(`${lab}/README.md`);
const dasborGo = baca(`${lab}/go/cmd/dasbor/main.go`);
const dasborTest = baca(`${lab}/go/cmd/dasbor/main_test.go`);
const seranganGo = baca(`${lab}/go/cmd/serangan/main.go`);
const driverJs = baca(`${lab}/js/driver.js`);
const goModLab = baca(`${lab}/go/go.mod`);
const notifGo = baca("labs/api-t3/internal/service/notif.go");
const riset = baca("plan/RISET-TAHAP-3.md");
const naskah = baca("plan/CERITA-TAHAP-3.md");
const glosMdx = baca("situs/src/content/docs/alat/glosarium.mdx");
const prd = baca("situs/src/content/docs/tahap-3/prd-v3.mdx");

// ---- rekaman ---------------------------------------------------------------------------------------
const bagianBaris = (txt: string, h: string): string[] => {
  const baris = txt.split("\n");
  const a = baris.findIndex((b) => b.startsWith(`# --- ${h}. `));
  if (a < 0) throw new Error(`rekaman: bagian ${h} tidak ada`);
  const z = baris.findIndex((b, i) => i > a && b.startsWith("# --- "));
  return baris.slice(a, z < 0 ? undefined : z);
};
const no = (baris: string[], pola: RegExp, dari = 0): number => {
  const i = baris.findIndex((b, k) => k >= dari && pola.test(b));
  if (i < 0) throw new Error(`jangkar tidak ada: ${pola}`);
  return i + 1;
};
const rg = (baris: string[], awal: RegExp, akhir: RegExp): string => {
  const a = no(baris, awal);
  return `${a}:${no(baris, akhir, a)}`;
};
const rp = (n: number): string => "Rp" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const kata = (n: number): string => ["nol", "satu", "dua", "tiga"][n] ?? String(n);

interface Xss {
  dialogs: { message: string; type: string }[];
  elemImgDiDaftar: number;
  cookieJSBisaDibaca: boolean;
  cookieJSMemuatNamaSesi: boolean;
  cookieHttpOnly: boolean;
  cookieName: string;
  cookieSameSite: string;
  cspPelanggaran: { diblokir: string; efektif: string }[];
  teksDaftar: string;
}
const xs = (h: string): Xss => JSON.parse(bagianBaris(xssTxt, h).find((b) => b.startsWith("{"))!) as Xss;
const XA = xs("A");
const XB = xs("B");
const XC = xs("C");
const XE = xs("E");
const barisD = bagianBaris(xssTxt, "D");
const XD = JSON.parse(barisD.find((b) => b.startsWith("{"))!) as { dialogs: unknown[]; statusFetch: number };
const hargaD = /^# harga produk 1 sebelum: Rp(\d+), sesudah .*: Rp(\d+)$/.exec(barisD.find((b) => b.startsWith("# harga produk 1 sebelum"))!)!;
const D_SEBELUM = Number(hargaD[1]);
const D_SESUDAH = Number(hargaD[2]);

interface Req { cookieTerkirim: boolean; isi: string; originAsing: boolean; secFetchSite: string; status: number }
const cs = (h: string) => {
  const b = bagianBaris(csrfTxt, h);
  const req = (JSON.parse(b.find((x) => x.startsWith("["))!) as Req[])[0]!;
  const seb = /^# harga produk 1 \(([^)]*)\) sebelum: Rp(\d+) \(versi (\d+)\)$/.exec(b.find((x) => x.startsWith("# harga produk 1 ("))!)!;
  const ses = /^# harga produk 1 sesudah: Rp(\d+) \(versi (\d+)\)$/.exec(b.find((x) => x.startsWith("# harga produk 1 sesudah"))!)!;
  return { req, produk: seb[1]!, sebelum: Number(seb[2]), sesudah: Number(ses[1]) };
};
const CS = Object.fromEntries(["A", "B", "C", "D", "E"].map((h) => [h, cs(h)])) as Record<string, ReturnType<typeof cs>>;
const CF = JSON.parse(bagianBaris(csrfTxt, "F").find((b) => b.startsWith("{"))!) as {
  denganTokenSendiri: { isi: string; status: number }; denganTokenSesiLain: { isi: string; status: number };
};

// ---- konfigurasi dari run.py -------------------------------------------------------------------------
const bendera = (s: string): Record<string, string> => Object.fromEntries([...s.matchAll(/(\w+)="(\w*)"/g)].map((m) => [m[1]!, m[2]!]));
const fnXss = runPy.slice(runPy.indexOf("def rekam_xss"), runPy.indexOf("# ---------- bagian CSRF"));
const flagXss = (h: string): Record<string, string> => {
  const i = fnXss.indexOf(`bagian("${h}. `);
  return bendera(/mulai_dasbor\(([^)]*)\)/.exec(fnXss.slice(i))![1]!);
};
const flagCsrf = Object.fromEntries([...runPy.matchAll(/^\s*\("([A-E])", dict\(([^)]*)\),$/gm)].map((m) => [m[1]!, bendera(m[2]!)])) as Record<string, Record<string, string>>;
const fnF = runPy.slice(runPy.indexOf("def rekam_token_sesi_lain"), runPy.indexOf("# ---------- bagian WebAuthn"));
const PAYLOAD = /^PAYLOAD = "([^"]+)"/m.exec(runPy)![1]!;
const maksCatatan = Number(/^const MaksCatatan = (\d+)/m.exec(notifGo)![1]);

// ---- kode dasbor -------------------------------------------------------------------------------------
const kodeDasbor = dasborGo.split("\n");
const fnCsrfSah = dasborGo.slice(dasborGo.indexOf("func (s *server) csrfSah"), dasborGo.indexOf("type ubahHargaIn"));

describe("kata-kata halaman terkunci (lapis 2)", () => {
  test("baris MDX sama dengan nilai terkunci", () => {
    expect(barisMdx).toEqual(BARIS_MDX);
  });
  test("bentuk baris kosong terkunci (baris kosong menentukan cara MDX mengurai)", () => {
    const bentuk = mdx.split("\n").map((b) => (/^<Snippet (file|files)=/.test(b) ? "S" : b.trim() ? "#" : "-")).join("");
    expect(bentuk).toBe(BENTUK_MDX);
  });
  test("nilai string tiap JSON data sama dengan nilai terkunci", () => {
    const ratakan = (x: unknown, jalur = ""): string[] =>
      Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${jalur}.${i}`))
        : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => ratakan(v, jalur ? `${jalur}.${k}` : k))
        : [`${jalur}=${JSON.stringify(x)}`];
    const berkas: Record<string, string> = {
      rantai: "situs/data/diagram/t3-xss-csrf-inti.json", tebak: "situs/data/widget/t3-xss-csrf-tebak.json",
      banding: "situs/lama/widgets/data/t3-xss-csrf-banding.json",
      csrf: "situs/data/halaman-istilah/csrf.json", csp: "situs/data/halaman-istilah/csp.json", passkey: "situs/data/halaman-istilah/passkey.json",
    };
    expect(Object.keys(NILAI_JSON).sort()).toEqual(Object.keys(berkas).sort());
    for (const [k, rel] of Object.entries(berkas)) expect(ratakan(JSON.parse(baca(rel))), k).toEqual(NILAI_JSON[k]);
  });
});

describe("registry, naskah, blok, dan penanda halaman", () => {
  const reg = registry.halaman.find((h) => h.id === "t3-xss-csrf")!;
  test("entri registry dan naskah cocok", () => {
    expect(reg.nomor).toBe("3.23");
    expect(reg.ada).toBe(true);
    expect(reg.path.replace(/\.md$/, ".mdx")).toBe(berkasMdx.replace("situs/src/content/docs/", ""));
    expect(reg.jenis).toBe("konsep");
    expect(reg.adr).toEqual([30]);
    expect(reg.lab).toEqual(["t3-dasbor"]);
    expect(reg.inti).toBe(true);
    expect(reg.topik).toBe("Keamanan");
    expect(reg.peran).toEqual(["security", "backend"]);
    expect(naskah).toMatch(/\| 3\.23 \| 4 \| Keamanan 5: XSS, CSRF, cookie sesi, passkey \+ ADR 30 \| Keamanan \+ ADR \| ★ \| t3-dasbor \|/);
    expect(registry.halaman.every((h) => h.nomor !== "3.23" || h.id === reg.id)).toBe(true);
  });
  test("judul, meta, dan waktu baca mengikuti registry", () => {
    expect(frontmatter).toContain(`title: "${reg.nomor} ${reg.judul}"`);
    const meta = /<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: ([^·]+) · Jalur inti<\/p>/.exec(isi)!;
    expect(Number(meta[1]) + Number(meta[2])).toBe(reg.menit);
    expect(meta[3]!.trim()).toBe(reg.prasyarat!.map((p) => `[[${p}]]`).join(", "));
    expect(Boolean(reg.inti)).toBe(true);
  });
  test("blok, urutan, tombol buka, dan teks aman", () => {
    const b = daftarBlok(isi);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(b.map((x) => x.buka)).toEqual([true, true, false, false, false]);
    expect(/<Blok nama="Coba" buka aman="([^"]+)"/.exec(isi)![1]).toContain(`mengubah harga walau token dan cookie benar`);
  });
  test("tautan [[id]] valid, prasyarat di meta, dan halaman tujuan", () => {
    const ids = new Set(registry.halaman.map((h) => h.id as string));
    const dipakai = [...new Set([...isi.matchAll(/\[\[([^\]|]+)\]\]/g)].map((m) => m[1]!))].sort();
    expect(dipakai).toEqual(["berikutnya", "t1-m3", "t2-ledger", "t3-m25", "t3-prd", "t3-tls-pinning", "t4-audit"]);
    for (const id of dipakai) if (id !== "berikutnya") expect(ids.has(id), id).toBe(true);
    const per = (id: string) => registry.halaman.find((h) => h.id === id)!;
    expect(per("t3-m25").nomor).toBe("3.22");
    expect(per("t3-tls-pinning").judul).toMatch(/TLS, HSTS, pinning/);
    expect(per("t4-audit").judul).toMatch(/Back office/);
    expect(per("t3-m25").prasyarat).toContain("t3-offline");
  });
  test("Cek diri, noscript, dan petunjuk Coba ada", () => {
    expect(hitung(isi, /^\*\*\d+\.\*\* /gm)).toBe(6);
    expect(hitung(isi, /<noscript>/g)).toBe(2);
    expect(isi).toContain("Tebak dulu");
    expect(isi).toContain("**Ubah satu hal:**");
    expect(hitung(isi, /<Rantai data=\{intiDiagram\} ringkas \/>/g)).toBe(1);
  });
});
const hitung = (t: string, p: RegExp): number => (t.match(p) ?? []).length;

describe("rekaman lab: nilai yang dipakai halaman", () => {
  test("konfigurasi tiap bagian xss sesuai run.py", () => {
    expect(flagXss("A")).toMatchObject({ escape: "rentan", csp: "mati", cookie: "rentan" });
    expect(flagXss("B")).toEqual({});
    expect(flagXss("C")).toEqual({ escape: "rentan" });
    expect(flagXss("D")).toEqual({ escape: "rentan", csp: "mati" });
    expect(flagXss("E")).toEqual({ csp: "mati" });
  });
  test("xss A sampai E: dialog, elemen img, cookie, dan pelanggaran CSP", () => {
    expect([XA.dialogs.length, XA.dialogs[0]!.type, XA.dialogs[0]!.message, XA.elemImgDiDaftar]).toEqual([1, "alert", "1", 1]);
    expect([XA.cookieJSBisaDibaca, XA.cookieJSMemuatNamaSesi, XA.cookieHttpOnly, XA.cookieName]).toEqual([true, true, false, "sesi"]);
    expect([XB.dialogs.length, XB.elemImgDiDaftar, XB.cookieJSBisaDibaca, XB.cookieHttpOnly, XB.cookieName]).toEqual([0, 0, false, true, "__Host-sesi"]);
    expect(XB.teksDaftar).toContain(PAYLOAD);
    expect([XC.dialogs.length, XC.elemImgDiDaftar, XC.cspPelanggaran]).toEqual([0, 1, [{ diblokir: "inline", efektif: "script-src-attr" }]]);
    expect([XE.dialogs.length, XE.elemImgDiDaftar, XE.cspPelanggaran]).toEqual([0, 0, []]);
    expect(XE.teksDaftar).toContain(PAYLOAD);
    expect([XD.dialogs.length, XD.statusFetch, D_SEBELUM, D_SESUDAH]).toEqual([1, 200, 25000, 2]);
  });
  test("bagian D memerankan skrip lewat penggerak, bukan lewat payload", () => {
    expect(PAYLOAD).toContain("alert(1)");
    expect(PAYLOAD).not.toMatch(/fetch|XMLHttpRequest/);
    const fn = driverJs.slice(driverJs.indexOf("async function xssLawanCsrf"), driverJs.indexOf("async function csrf("));
    expect(fn).toMatch(/page\.evaluate\(async \(\) => \{\s*const r = await fetch\('\/api\/menu\/harga'/);
    expect(fn).toContain("window.csrf");
    expect(fn).toContain("credentials: 'same-origin'");
    expect(dasborGo).toMatch(/^var csrf = %\[3\]s;$/m);
    expect(isi).toContain("Penggerak Playwright mengirim `fetch` itu lewat `page.evaluate`");
  });
  test("csrf A sampai E dan F: cookie, status, isi, dan harga", () => {
    expect(Object.keys(flagCsrf).sort()).toEqual(["A", "B", "C", "D", "E"]);
    expect(flagCsrf.A).toEqual({ token: "tidak", samesite: "none", cookie: "rentan" });
    expect(flagCsrf.B).toEqual({ token: "tidak" });
    expect(flagCsrf.C).toEqual({});
    expect(flagCsrf.D).toEqual({ samesite: "none" });
    expect(flagCsrf.E).toEqual({ token: "tidak", samesite: "default" });
    for (const h of ["A", "B", "C", "D", "E"]) {
      expect(CS[h]!.req.secFetchSite, h).toBe("cross-site");
      expect(CS[h]!.req.originAsing, h).toBe(true);
      expect(CS[h]!.produk, h).toBe("Nasi goreng, Warung Ani");
      expect(CS[h]!.sebelum, h).toBe(25000);
    }
    expect(CS.A!.req).toMatchObject({ cookieTerkirim: true, status: 200 });
    expect(CS.B!.req).toMatchObject({ cookieTerkirim: false, status: 401, isi: '{"error":"belum login"}' });
    expect(CS.C!.req).toMatchObject({ cookieTerkirim: false, status: 401, isi: '{"error":"belum login"}' });
    expect(CS.D!.req).toMatchObject({ cookieTerkirim: true, status: 403, isi: '{"error":"csrf"}' });
    expect(CS.E!.req).toMatchObject({ cookieTerkirim: true, status: 200 });
    expect([CS.A!.sesudah, CS.B!.sesudah, CS.C!.sesudah, CS.D!.sesudah, CS.E!.sesudah]).toEqual([1, 25000, 25000, 25000, 1]);
    expect(CF.denganTokenSesiLain).toEqual({ isi: '{"error":"csrf"}', status: 403 });
    expect(CF.denganTokenSendiri).toEqual({ isi: '{"error":"produk bukan milik akun ini"}', status: 403 });
    expect(bendera(/mulai_dasbor\(([^)]*)\)/.exec(fnF)![1]!)).toEqual({});
  });
  test("tabel hasil CSRF di halaman diturunkan dari rekaman dan konfigurasi", () => {
    const hasil = (h: string): string => {
      const { req, sebelum, sesudah } = CS[h]!;
      const e = (JSON.parse(req.isi) as { error?: string }).error;
      const st = e ? `${req.status} \`${e}\`` : String(req.status);
      return `Cookie ${req.cookieTerkirim ? "terkirim" : "tidak terkirim"}, ${st}, ${sesudah === sebelum ? "harga tetap" : `harga ${rp(sebelum)} jadi ${rp(sesudah)}`}`;
    };
    const atur = (h: string): string => {
      const f = flagCsrf[h]!;
      const ss = f.samesite === "none" ? "`SameSite=None`" : f.samesite === "default" ? "`SameSite` tidak ditulis" : "`SameSite=Lax` tertulis";
      return `${ss}, ${f.token === "tidak" ? "tanpa token" : "token, Origin, Sec-Fetch-Site"}`;
    };
    const baris = ["A", "B", "C", "D", "E"].map((h) => `| ${h} | ${atur(h)} | ${hasil(h)} |`);
    const err = (j: { isi: string }) => (JSON.parse(j.isi) as { error: string }).error;
    baris.push(`| F | Token milik sesi lain, \`SameSite=Lax\`, gerbang lengkap | ${CF.denganTokenSesiLain.status} \`${err(CF.denganTokenSesiLain)}\`; dengan token sendiri ${CF.denganTokenSendiri.status} \`${err(CF.denganTokenSendiri)}\` |`);
    const tabel = isi.split("\n").filter((b) => /^\| [A-F] \| /.test(b) && !b.includes("Escape manual"));
    expect(tabel).toEqual(baris);
    expect(isi).toContain("| Bagian | Pengaturan | Hasil |");
  });
  test("webauthn: hanya create, tanpa get, dan lab tidak mengubah api-t3", () => {
    const j = JSON.parse(webTxt.split("\n").find((b) => b.startsWith("{"))!) as { ok: boolean; id: string; langkah: string };
    expect([j.ok, j.id, j.langkah]).toEqual([true, "ada", "navigator.credentials.create"]);
    expect(driverJs).toContain("protocol: 'ctap2'");
    expect(`${driverJs}\n${runPy}\n${dasborGo}\n${seranganGo}`).not.toMatch(/credentials\.get/);
    expect(readme).toContain("Login passkey penuh");
    expect(readme).toMatch(/Chromium 156\.0\.8078\.4 lewat Playwright 1\.64\.0/);
    expect(isi).toContain("Chromium 156.0.8078.4 lewat Playwright 1.64.0");
  });
});

describe("kode lab: klaim mekanisme", () => {
  test("cookie sesi, nonce, dan pelindung CSP dibaca dari kode dasbor", () => {
    expect(dasborGo).toContain('const namaCookieAman = "__Host-sesi"');
    expect(dasborGo).toContain("HttpOnly: s.cookie != \"rentan\"");
    expect(dasborGo).toMatch(/sameSite, secure := http\.SameSiteLaxMode, s\.cookie != "rentan"/);
    const nonce = /nonce := tokenAcak\(\)\[:(\d+)\]/.exec(dasborGo)!;
    const acak = /b := make\(\[\]byte, (\d+)\)/.exec(dasborGo)!;
    expect(Number(acak[1])).toBe(32);
    expect(dasborGo).toMatch(/return hex\.EncodeToString\(b\)/);
    expect(Number(nonce[1]) * 4).toBe(128);
    expect(isi).toContain(`${nonce[1]} karakter hex untuk nonce, jadi ${nonce[1]} × 4 = ${Number(nonce[1]) * 4} bit`);
    const csp = /"Content-Security-Policy",\s*"([^"]+)"\+nonce\+"([^"]+)"\+nonce\+"([^"]+)"/.exec(dasborGo)!;
    expect(csp[1] + csp[2] + csp[3]).toContain("default-src 'none'");
    expect(dasborGo).not.toMatch(/unsafe-inline|report-uri|report-to|frame-ancestors/);
    expect(dasborGo).toContain("connect-src 'self'");
    expect(dasborGo).toContain("form-action 'self'");
  });
  test("gerbang csrfSah: tiga pemeriksaan, tanpa jalan pintas, token tetap diminta", () => {
    expect(fnCsrfSah).toContain('site != "" && site != "same-origin" && site != "none"');
    expect(fnCsrfSah).toContain('o != "http://"+r.Host');
    expect(fnCsrfSah).toContain('r.Header.Get("X-CSRF-Token")');
    expect(fnCsrfSah).toContain("subtle.ConstantTimeCompare");
    expect(fnCsrfSah).toContain("hashToken(tok)");
    expect(fnCsrfSah.match(/return true/g) ?? []).toHaveLength(0);
    expect(fnCsrfSah).toMatch(/site != "same-origin" && site != "none" \{\n\t\treturn false\n\t\}/);
    expect(fnCsrfSah).toMatch(/o != "http:\/\/"\+r\.Host \{\n\t\treturn false\n\t\}/);
    expect(fnCsrfSah).toMatch(/return tok != "" && subtle\.ConstantTimeCompare\(\[\]byte\(hashToken\(tok\)\), \[\]byte\(x\.CsrfHash\)\) == 1/);
    expect(isi).toContain("Gerbangnya tiga pemeriksaan:");
    expect(dasborGo).toMatch(/if s\.token != "tidak" && !s\.csrfSah\(r, x\)/);
    for (const t of ["TestCsrfSahMenolakOriginAsing", "TestCsrfSahMenolakSecFetchSiteLintasSitus", "TestCsrfSahMenolakTokenSalahAtauKosong", "TestCsrfSahMenerimaSameOriginDenganTokenBenar"]) expect(dasborTest).toContain(`func ${t}(`);
    expect(dasborGo).toMatch(/token, csrf := tokenAcak\(\), tokenAcak\(\)/);
  });
  test("endpoint GET yang mengubah keadaan: /logout menghapus sesi", () => {
    expect(dasborGo).toContain('mux.HandleFunc("GET /logout", s.logout)');
    const fn = dasborGo.slice(dasborGo.indexOf("func (s *server) logout"), dasborGo.indexOf("type baris struct"));
    expect(fn).toContain("delete(s.sesi, tok)");
    expect(dasborGo.match(/mux\.HandleFunc\("GET [^"]+"/g)).toHaveLength(4);
    expect(dasborGo.match(/mux\.HandleFunc\("POST [^"]+"/g)).toHaveLength(2);
    expect(isi).toContain("satu endpoint GET yang mengubah keadaan, yaitu `/logout`");
  });
  test("halaman Dimas: satu form tersembunyi yang langsung dikirim", () => {
    expect(seranganGo).toContain('method="POST"');
    expect(seranganGo).toContain('type="hidden" name="produk_id" value="1"');
    expect(seranganGo).toContain("document.getElementById('f').submit()");
    expect(seranganGo.match(/<form /g)).toHaveLength(1);
  });
  test("api-t3 menyimpan catatan apa adanya dengan batas 100 karakter", () => {
    expect([...PAYLOAD].length).toBe(28);
    expect(maksCatatan).toBe(100);
    const fn = notifGo.slice(notifGo.indexOf("func periksaCatatan"), notifGo.indexOf("// keterangan:"));
    expect(fn).toContain("strings.TrimSpace(c)");
    expect(fn).toContain("return c, nil");
    expect(fn).not.toMatch(/html\.|Escape|Replace|Sanitize/);
    expect(PAYLOAD).toBe(PAYLOAD.trim());
    expect(isi).toContain(`${[...PAYLOAD].length} karakter, di bawah batas ${maksCatatan}, tanpa karakter kontrol`);
    expect(isi).toContain(`\`${PAYLOAD}\``);
  });
  test("textContent dibedakan dari output encoding, dengan sumber dan kode", () => {
    const r211 = riset.split("\n").find((x) => x.startsWith("| R3-211 |"))!;
    expect(r211).toContain("it does not HTML-encode the value");
    expect(r211).toContain("bukan output encoding");
    const aman = dasborGo.slice(dasborGo.indexOf("const renderAman"), dasborGo.indexOf("const halamanDasbor"));
    expect(aman).toContain("textContent");
    expect(aman).not.toMatch(/html\.EscapeString|EscapeString|&lt;/);
    expect(isi).toContain("`textContent` berbeda dari output encoding.");
    expect(isi).toContain("Halaman ini menyebut lapis pertama itu escape, seperti sumbu `-escape` di lab.");
    expect(runPy).toContain('"-escape", escape');
  });
  test("payload dengan fetch dalam batas 100 karakter tidak direkam dan tidak diklaim", () => {
    expect(isi).toContain("payload yang sendiri mengirim `fetch` dalam batas 100 karakter tidak direkam");
    expect(`${xssTxt}\n${runPy}`).not.toMatch(/onerror=fetch|onerror=.*fetch\(/);
    expect(PAYLOAD.length).toBeLessThan(maksCatatan);
  });
  test("PRD v3: dasbor P0 dan catatan P1", () => {
    expect(prd).toMatch(/[Dd]asbor web/);
    expect(prd).toMatch(/[Cc]atatan/);
    expect(isi).toContain("fitur P0 PRD v3, dan catatan pembayaran adalah P1");
  });
});

describe("kalimat halaman memuat nilai turunan", () => {
  const harus: [string, string][] = [
    ["Inti A", `menampilkan ${kata(XA.dialogs.length)} dialog \`alert\``],
    ["Inti C dan E", `Keduanya menghasilkan ${XC.dialogs.length} dialog.`],
    ["Inti D", `diterima dengan ${XD.statusFetch}`],
    ["B", `${XB.dialogs.length} dialog dan ${XB.elemImgDiDaftar} elemen \`img\``],
    ["C", `${kata(XC.cspPelanggaran.length)} pelanggaran \`${XC.cspPelanggaran[0]!.efektif}\` dan dialognya ${XC.dialogs.length}`],
    ["D", `jawabannya ${XD.statusFetch}: harga berubah dari ${rp(D_SEBELUM)} ke ${rp(D_SESUDAH)}`],
    ["Cek 1", `${kata(XA.elemImgDiDaftar)} elemen \`img\` terbentuk, \`onerror\` berjalan, dan ${kata(XA.dialogs.length)} dialog \`alert\` muncul`],
    ["Cek 2", `Nol dialog. Elemen \`img\` tetap terbentuk, tetapi browser melaporkan ${kata(XC.cspPelanggaran.length)} pelanggaran \`${XC.cspPelanggaran[0]!.efektif}\``],
    ["Cek 3", `harga berubah dari ${rp(D_SEBELUM)} ke ${rp(D_SESUDAH)}`],
    ["Cek 4", `menjawab ${CS.C!.req.status} \`belum login\` sebelum gerbang token`],
    ["Cek 4 D", `${CS.D!.req.status} \`csrf\``],
    ["Tebak noscript", `200, dan harga berubah dari ${rp(D_SEBELUM)} ke ${rp(D_SESUDAH)}`],
    ["F", `bagian F menguji bahwa token terikat ke sesi`],
    ["webauthn", `\`webauthn.txt\` memanggil \`navigator.credentials.create()\``],
  ];
  test.each(harus)("%s", (_nama, teks) => {
    expect(isi).toContain(teks);
  });
  test("Rantai Inti, Tebak, dan banding memuat nilai dari rekaman", () => {
    const r = DataRantai.parse(rantaiMentah);
    expect(r.judul.length).toBeLessThanOrEqual(47);
    expect(r.baris.map((b) => b.sub)).toEqual(["bagian A", "bagian C dan E"]);
    expect(r.baris[0]!.simpul[2]!.sub).toBe(`${XA.dialogs.length} dialog ${XA.dialogs[0]!.type}`);
    expect(r.baris[1]!.simpul[2]!.sub).toBe(`${XC.dialogs.length} dialog`);
    expect(XC.dialogs.length).toBe(XE.dialogs.length);
    expect(r.baris[0]!.simpul[1]!.teks).toBe("innerHTML, tanpa CSP");
    expect(r.baris[1]!.simpul[1]!.teks).toBe("textContent atau CSP");
    expect(r.sumber.teks).toBe("Rekaman lab t3-dasbor, xss.txt bagian A, C, dan E");
    expect(r.catatan).toContain("Bagian C mematikan escape dan menyalakan CSP. Bagian E mematikan CSP dan menyalakan escape.");
    expect(r.baris[0]!.simpul.map((s) => s.nada)).toEqual(["biasa", "warn", "warn"]);
    expect(r.baris[1]!.simpul[2]!.nada).toBe("good");
    expect(flagXss("C").csp).toBeUndefined();
    expect(flagXss("E").escape).toBeUndefined();
  });
  test("Tebak: satu jawaban benar, dari bagian D, posisi dan panjang tidak membocorkan", () => {
    const t = DataTebak.parse(tebakMentah);
    expect(t.pilihan).toHaveLength(4);
    const i = t.pilihan.findIndex((p) => p.benar);
    expect(t.pilihan.filter((p) => p.benar)).toHaveLength(1);
    expect(t.pilihan[i]!.teks).toBe(`Diterima dengan ${XD.statusFetch}, dan harga Nasi goreng berubah dari ${rp(D_SEBELUM)} ke ${rp(D_SESUDAH)}.`);
    expect(i).toBe(3);
    const panjang = t.pilihan.map((p) => p.teks.length);
    expect(panjang[i]).not.toBe(Math.max(...panjang));
    expect(panjang[i]).not.toBe(Math.min(...panjang));
    for (const p of t.pilihan.filter((x) => !x.benar)) expect(p.teks).toMatch(/^Ditolak dengan (401|403), karena /);
    expect(t.pilihan.some((p) => p.teks.startsWith(`Ditolak dengan ${XD.statusFetch}`))).toBe(false);
    expect(t.sumber.teks).toBe("labs/t3-dasbor/output/xss.txt bagian D");
    expect(t.adegan.join(" ")).toContain("__Host-sesi");
    expect(t.adegan.join(" ")).toContain("Nasi goreng");
    expect(t.pilihan.map((p) => p.teks).join("")).not.toMatch(/\bR\d-\d+/);
    expect(isi).toContain('<Tebak client:visible data={dataTebak} />');
  });
  test("banding: catatan diturunkan dari rekaman, simpul yang disorot ada", () => {
    interface Fitur { label: string; sorot: Record<string, string[]>; catatan: Record<string, string>; nada?: Record<string, string> }
    const b = bandingMentah as unknown as { opsi: { id: string; baris: { id: string }[][] }[]; fitur: Fitur[] };
    expect(b.opsi.map((o) => o.id)).toEqual(["rentan", "adr30"]);
    for (const f of b.fitur) for (const o of b.opsi) {
      const ids = new Set(o.baris.flat().map((s) => s.id));
      expect(f.sorot[o.id]!.length, f.label).toBeGreaterThan(0);
      for (const id of f.sorot[o.id]!) expect(ids.has(id), `${f.label} ${id}`).toBe(true);
    }
    const A = CS.A!.req; const C = CS.C!.req; const D = CS.D!.req; const E = CS.E!.req;
    expect(CS.B!.req.status).toBe(C.status);
    expect(XB.teksDaftar).toContain(PAYLOAD);
    const harapan: Record<string, { rentan: string; adr30: string }> = {
      "Catatan berisi onerror": {
        rentan: `${kata(XA.dialogs.length)} dialog alert muncul dan ${kata(XA.elemImgDiDaftar)} elemen img terbentuk di daftar (xss.txt bagian A).`.replace(/^s/, "S"),
        adr30: `Tidak ada dialog dan tidak ada elemen img, dan catatan tampil sebagai teks (xss.txt bagian B).`,
      },
      "Skrip membaca cookie": {
        rentan: "document.cookie bisa dibaca dari dalam halaman dan memuat nama cookie sesi (xss.txt bagian A, dibaca penggerak lab).",
        adr30: "document.cookie kosong (xss.txt bagian B, dibaca penggerak lab).",
      },
      "Skrip mengubah harga": {
        rentan: "Tidak direkam dengan cookie dan token rentan, karena bagian D memakai cookie dan token benar.",
        adr30: `Bila escape dan CSP gagal, permintaan dari dalam halaman diterima dengan ${XD.statusFetch} (xss.txt bagian D).`,
      },
      "Form dari situs lain": {
        rentan: `Cookie terkirim, jawabannya ${A.status}, dan harga jadi ${rp(CS.A!.sesudah)} (csrf.txt bagian A).`,
        adr30: `Cookie tidak terkirim dan jawabannya ${C.status} (csrf.txt bagian C); bila cookie terkirim, gerbang token, Origin, dan Sec-Fetch-Site menolak dengan ${D.status} (bagian D).`,
      },
      "SameSite tidak ditulis": {
        rentan: `Cookie terkirim, jawabannya ${E.status}, dan harga jadi ${rp(CS.E!.sesudah)} (csrf.txt bagian E).`,
        adr30: `SameSite=Lax ditulis eksplisit, jadi cookie tidak terkirim dan jawabannya ${CS.B!.req.status} (csrf.txt bagian B dan C).`,
      },
    };
    expect(b.fitur.map((f) => f.label)).toEqual(Object.keys(harapan));
    for (const f of b.fitur) expect(f.catatan, f.label).toEqual(harapan[f.label]!.rentan === undefined ? {} : { rentan: harapan[f.label]!.rentan, adr30: harapan[f.label]!.adr30 });
    expect([A.cookieTerkirim, E.cookieTerkirim, C.cookieTerkirim, D.cookieTerkirim]).toEqual([true, true, false, true]);
    expect(XA.cookieJSBisaDibaca && XA.cookieJSMemuatNamaSesi && !XB.cookieJSBisaDibaca).toBe(true);
    expect(isi).toContain('<WidgetLama nama="banding" src="data/t3-xss-csrf-banding.json" />');
  });
});

describe("rentang Snippet diturunkan dari kode dan rekaman", () => {
  test("Snippet berkas kode", () => {
    const harap = [
      { file: "labs/api-t3/internal/service/notif.go", lines: rg(notifGo.split("\n"), /^func periksaCatatan/, /^}$/) },
      { file: `${lab}/go/cmd/dasbor/main.go`, lines: rg(kodeDasbor, /^const renderRentan/, /b\.appendChild\(ket\);`$/) },
      { file: `${lab}/go/cmd/dasbor/main.go`, lines: rg(kodeDasbor, /^\tif s\.csp != "mati" \{$/, /^\t\}$/) },
      { file: `${lab}/go/cmd/dasbor/main.go`, lines: rg(kodeDasbor, /^func \(s \*server\) csrfSah/, /^\}$/) },
    ].map((x) => ({ ...x, lang: "go", title: x.file }));
    const ada = [...isi.matchAll(/^<Snippet file="([^"]+)" lines="([^"]+)" lang="([^"]+)" title="([^"]+)" \/>$/gm)].map((m) => ({ file: m[1]!, lines: m[2]!, lang: m[3]!, title: m[4]! }));
    expect(ada).toEqual(harap);
    for (const s of ada) {
      const [a, z] = s.lines.split(":").map(Number) as [number, number];
      const teks = baca(s.file).split("\n").slice(a - 1, z).join("\n");
      expect(teks, s.file).not.toMatch(/R\d-\d+|keputusan \d+|PR #?\d+/i);
    }
  });
  test("Snippet rekaman: rentang dari kepala bagian, tanpa baris ber-ID dan tanpa komentar penulis lab", () => {
    const barisX = xssTxt.split("\n");
    const barisC = csrfTxt.split("\n");
    const adaId = (b: string) => /R\d-\d+|keputusan \d+|token sendirian menahan/i.test(b);
    const harap: string[] = [];
    for (const h of ["A", "B", "C", "D", "E"]) {
      const a = no(barisX, new RegExp(`^# --- ${h}\\. `));
      const j = no(barisX, /^\{/, a);
      const akhir = h === "D" ? no(barisX, /^# harga produk 1 sebelum/, j) : j;
      harap.push(`labs/t3-dasbor/output/xss.txt:${adaId(barisX[a - 1]!) ? a + 1 : a}:${akhir}`);
    }
    for (const h of ["A", "B", "C", "D", "E"]) {
      const a = no(barisC, new RegExp(`^# --- ${h}\\. `));
      const seb = no(barisC, /^# harga produk 1 \(/, a);
      const j = no(barisC, /^\[/, a);
      const ses = no(barisC, /^# harga produk 1 sesudah/, j);
      harap.push(`labs/t3-dasbor/output/csrf.txt:${adaId(barisC[a - 1]!) ? seb : a}:${seb}`, `labs/t3-dasbor/output/csrf.txt:${j}:${ses}`);
    }
    const aF = no(barisC, /^# --- F\. /);
    harap.push(`labs/t3-dasbor/output/csrf.txt:${aF}:${no(barisC, /^\{/, aF)}`);
    const ada = JSON.parse(/<Snippet files=\{(\[[^\]]+\])\}/.exec(isi)![1]!) as string[];
    expect(ada).toEqual(harap);
    for (const s of ada) {
      const m = /^(.*):(\d+):(\d+)$/.exec(s)!;
      const baris = baca(m[1]!).split("\n").slice(Number(m[2]) - 1, Number(m[3]));
      for (const b of baris) {
        expect(adaId(b), b).toBe(false);
        expect(/^(# --- [A-F]\. |\$ |\{|\[|# harga produk 1 )/.test(b), `baris lain di Snippet rekaman: ${b}`).toBe(true);
      }
    }
    expect(isi).toContain('title="Rekaman lab: labs/t3-dasbor/output/xss.txt dan csrf.txt (tanpa baris kepala dan tanpa komentar penulis lab)"');
  });
});

describe("sumber luar, tanggal akses, dan versi (baris riset R3-210 sampai R3-214)", () => {
  const baris = (id: string): string => {
    const b = riset.split("\n").filter((x) => x.startsWith(`| ${id} |`));
    expect(b, `baris riset ${id}`).toHaveLength(1);
    return b[0]!;
  };
  const ids = ["R3-210", "R3-211", "R3-212", "R3-213", "R3-214"];
  const AKSES = (/teks mentah dibuka (\d{4}-\d{2}-\d{2})/.exec(baris("R3-210")) ?? [])[1]!;
  test("ID riset urut, tanpa ganda, dan tiap baris punya tanggal akses yang sama dengan halaman", () => {
    const semua = [...riset.matchAll(/^\| (R3-\d+) \|/gm)].map((m) => Number(m[1]!.slice(3)));
    expect(new Set(semua).size).toBe(semua.length);
    expect(semua).toEqual([...semua].sort((a, b) => a - b));
    for (const id of ids) expect(baris(id), id).toContain(AKSES);
    expect(AKSES).toBe("2026-10-27");
    const tanggalMdx = [...new Set([...mdx.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]))];
    expect(tanggalMdx).toEqual([AKSES]);
    expect(hitung(mdx, /dibuka \d{4}-\d{2}-\d{2}/g)).toBe(hitung(mdx, new RegExp(`dibuka ${AKSES}`, "g")));
    for (const id of ids) for (const t of baris(id).match(/\d{4}-\d{2}-\d{2}/g)!) expect([AKSES, "2016-04-12", "2022-02-04", "2025-05-14"], `${id} ${t}`).toContain(t);
  });
  test("tiap tautan luar di halaman dan di istilah menunjuk sumber yang tercatat di baris riset", () => {
    const peta: [string, string, RegExp][] = [
      ["R3-211", "cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html", /OWASP XSS Prevention Cheat Sheet/],
      ["R3-212", "cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html", /OWASP CSRF Prevention Cheat Sheet/],
      ["R3-211", "cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html", /OWASP HTML5 Security Cheat Sheet/],
      ["R3-211", "developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP", /MDN panduan CSP/],
      ["R3-212", "developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie", /MDN Set-Cookie/],
      ["R3-211", "www.w3.org/TR/CSP3/", /W3C CSP Level 3/],
      ["R3-213", "www.w3.org/TR/webauthn-3/", /W3C Web Authentication Level 3/],
      ["R3-210", "github.blog/engineering/infrastructure/githubs-csp-journey/", /GitHub's CSP journey/],
      ["R3-214", "pkg.go.dev/html/template", /html\/template/],
      ["R3-214", "pkg.go.dev/net/http", /net\/http/],
      ["R3-214", "github.com/mde/ejs/blob/main/README.md", /EJS README/],
      ["R3-214", "helmetjs.github.io/", /Helmet/],
      ["R3-214", "github.com/expressjs/csurf", /csurf/],
      ["R3-214", "github.com/Psifi-Solutions/csrf-sync", /csrf-sync/],
      ["R3-214", "laravel.com/docs/13.x/blade", /Laravel 13\.x/],
      ["R3-214", "laravel.com/docs/13.x/csrf", /PreventRequestForgery/],
      ["R3-214", "docs.djangoproject.com/en/6.1/topics/security/", /Django 6\.1\.2/],
      ["R3-214", "docs.djangoproject.com/en/6.1/ref/csrf/", /CsrfViewMiddleware/],
      ["R3-214", "api.rubyonrails.org/classes/ActionView/Helpers/OutputSafetyHelper.html", /Rails 8\.1\.4 API/],
      ["R3-214", "api.rubyonrails.org/classes/ActionController/RequestForgeryProtection.html", /protect_from_forgery/],
      ["R3-214", "guides.rubyonrails.org/security.html", /panduan keamanan/],
      ["R3-214", "docs.serverpod.dev/concepts/web-server/server-side-html", /Serverpod/],
    ];
    const urlMdx = [...new Set([...isi.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]!.replace(/^https?:\/\//, "")))];
    for (const u of urlMdx) {
      const cocok = peta.filter(([, p]) => u === p);
      expect(cocok, `tautan luar tanpa baris riset: ${u}`).toHaveLength(1);
    }
    for (const [id, p, pola] of peta) {
      expect(urlMdx, `${p} tidak dipakai halaman`).toContain(p);
      const row = baris(id);
      expect(row, `${id} memuat sumber ${p}`).toMatch(pola);
    }
  });
  test("versi dan tanggal dokumen di halaman sama dengan baris riset", () => {
    const r211 = baris("R3-211"); const r213 = baris("R3-213"); const r214 = baris("R3-214"); const r210 = baris("R3-210");
    const v = (r: string, p: RegExp): string => p.exec(r)![1]!;
    expect(isi).toContain(`Working Draft ${v(r211, /Working Draft (\d+ \w+ \d{4})/)}`);
    expect(isi).toContain(`Recommendation ${v(r213, /Recommendation (\d+ \w+ \d{4})/)}`);
    expect(isi).toContain(`Patrick Toomey, ${v(r210, /(\d{4}-\d{2}-\d{2}), diperbarui/)}, diperbarui ${v(r210, /diperbarui (\d{4}-\d{2}-\d{2}),/)})`);
    const go = v(r214, /\(go(1\.\d+\.\d+), dibuka/);
    expect(isi).toContain(`(go${go})`);
    expect(isi).toContain(`Go ${/^go (\S+)/m.exec(goModLab)![1]}`);
    expect(isi).toContain(`(npm ${v(r214, /EJS README \(npm ([\d.]+)\)/)})`);
    expect(isi).toContain(`(npm ${v(r214, /Helmet \(npm ([\d.]+)/)})`);
    expect(isi).toContain(`(npm ${v(r214, /csurf \(npm ([\d.]+)\)/)})`);
    expect(isi).toContain(`(npm ${v(r214, /csrf-sync ([\d.]+) \(token/)})`);
    expect(isi).toContain(`Express ${v(r214, /Express ([\d.]+)\./)} adalah rilis terbaru di npm`);
    expect(isi).toContain(`\`laravel/framework\` ${v(r214, /`laravel\/framework` ([\d.]+)\)/)}`);
    expect(isi).toContain(`Django ${v(r214, /Django ([\d.]+): template/)} di PyPI`);
    expect(isi).toContain(`Rails ${v(r214, /Rails ([\d.]+) API/)}`);
    expect(isi).toContain(`versi dokumentasi ${v(r214, /docs ([\d.]+), pub\.dev/)}, rilis terbaru di pub.dev ${v(r214, /pub\.dev ([\d.]+)\)/)}`);
    expect(isi).toContain("ada sejak Go 1.25.0");
    expect(r214).toContain("added in go1.25.0");
    expect(isi).toContain("Dukungan CSP bawaan baru ada sejak Django 6.0");
    expect(r214).toContain("new in Django 6.0");
  });
  test("klaim negatif tentang dokumentasi luar berlingkup dan tercatat di riset", () => {
    const r214 = baris("R3-214");
    expect(isi).toContain("Tiga halaman yang dibuka tidak menyebut `Sec-Fetch-Site`");
    expect(r214).toMatch(/tanpa menyebut Sec-Fetch-Site/);
    expect(isi).toContain("README-nya tidak menyebut pemeriksaan `Origin` atau `Sec-Fetch-Site`");
    expect(r214).toMatch(/README csrf-sync tidak menyebut Origin atau Sec-Fetch/);
    expect(isi).toContain("Dokumentasi itu tidak menyebut `Sec-Fetch-Site`");
    expect(isi).toContain("tidak menyebut CSRF atau CSP untuk server web itu, dan halaman lain tidak dibuka [perlu verifikasi]");
    expect(r214).toMatch(/tidak menyebut CSRF atau CSP \[perlu verifikasi\]/);
    expect(isi).toContain("Tulisan itu tidak memuat kata nonce");
    expect(baris("R3-210")).toContain("kata nonce tidak ada");
    expect(isi).toContain("tidak menyebut berapa request per detik");
    expect(baris("R3-210")).toContain("tidak menyebut request per detik");
    expect(baris("R3-213")).toMatch(/Passkey\\?" tertulis sebagai sinonim \[DEPRECATED\]/);
  });
  test("sumber luar yang dikutip memuat kata yang diklaim", () => {
    expect(baris("R3-211")).toContain("easy to make mistakes");
    expect(baris("R3-211")).toContain("MUST unik tiap kebijakan dikirim");
    expect(baris("R3-211")).toContain("SHOULD paling sedikit 128 bit");
    expect(baris("R3-212")).toContain("XSS dapat mengalahkan semua teknik mitigasi CSRF");
    expect(baris("R3-212")).toContain("cookie tetap dikirim pada permintaan dari JavaScript");
    expect(baris("R3-212")).toContain("paling lama dua menit");
    expect(baris("R3-210")).toContain("our single most effective mitigation");
  });
});

describe("keputusan ADR 30 mengikuti naskah", () => {
  const adr = isi.slice(isi.indexOf("### ADR 30"), isi.indexOf("### Sengaja belum dilakukan"));
  const naskahAdr = naskah.split("\n").find((b) => b.startsWith("| 30 |"))!;
  test("tiga opsi lain sama dengan naskah dan opsi pilihan memuat unsur keputusannya", () => {
    const kepala = adr.split("\n").find((b) => b.startsWith("| | A."))!.split("|").map((x) => x.trim()).filter(Boolean);
    expect(kepala.map((k) => k.slice(0, 2))).toEqual(["A.", "B.", "C.", "D."]);
    const opsiNaskah = naskahAdr.split("|")[3]!.trim().replace(/\.$/, "").split(";").map((x) => x.trim().toLowerCase());
    expect(opsiNaskah).toEqual(["escape manual saja", "csp saja", "token di `localstorage` tanpa cookie"]);
    expect(kepala[0]!.toLowerCase()).toContain(opsiNaskah[0]);
    expect(kepala[1]!.toLowerCase()).toContain(opsiNaskah[1]);
    expect(kepala[2]!.toLowerCase()).toContain("token di localstorage tanpa cookie");
    expect(naskahAdr).toMatch(/Tanpa `innerHTML`; CSP dengan nonce; token CSRF dengan pemeriksaan `Sec-Fetch-Site` dan `Origin`; cookie `__Host-`; passkey sebagai pilihan/);
    expect(kepala[3]).toContain("`__Host-`");
    expect(adr).toContain("**Keputusan: opsi D.** Enam aturan:");
    expect(hitung(adr.slice(adr.indexOf("**Keputusan: opsi D.**"), adr.indexOf("**Kenapa D")), /^\d\. /gm)).toBe(6);
    for (const baris of ["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]) expect(adr).toContain(`| ${baris} |`);
  });
  test("pre-mortem tepat tiga, kapan salah memuat naskah, kasus industri dan pencegahan", () => {
    const pm = adr.slice(adr.indexOf("**Pre-mortem.**"), adr.indexOf("**Kapan keputusan ini salah.**"));
    expect(hitung(pm, /^\d\. /gm)).toBe(3);
    expect(hitung(pm, /Pencegahannya/g)).toBe(3);
    const ks = adr.slice(adr.indexOf("**Kapan keputusan ini salah.**"), adr.indexOf("**Yang akan merevisinya.**"));
    expect(naskahAdr).toContain("Bila dasbor tumbuh jadi banyak subdomain, atau CSP merusak komponen pihak ketiga");
    expect(ks).toContain("banyak subdomain");
    expect(ks).toContain("CSP merusak komponen pihak ketiga");
    expect(adr).toContain("**Kasus industri: GitHub.**");
    expect(adr).toContain("**Status:** diterima sesudah M25 (minggu 8)");
    expect(naskah).toMatch(/\| M25 \| 8 \|/);
  });
  test("tabel Sengaja belum: lima baris dengan tiga kolom", () => {
    const sb = isi.slice(isi.indexOf("### Sengaja belum dilakukan"), isi.indexOf('<Blok nama="Kunci">'));
    const baris = sb.split("\n").filter((b) => b.startsWith("| ") && !b.startsWith("| Yang ditunda") && !b.startsWith("|---"));
    expect(baris).toHaveLength(5);
    for (const b of baris) expect(b.split("|").length).toBe(5);
    expect(isi).toContain("Chromium 156.0.8078.4 lewat Playwright 1.64.0");
  });
});

describe("istilah baru, glosarium, dan pola terlarang", () => {
  const slug = ["csrf", "csp", "passkey"];
  test("empat halaman istilah valid, bersumber, dan terhubung ke glosarium", () => {
    const idReg = new Set(registry.halaman.map((h) => h.id as string));
    for (const s of slug) {
      const d = HalamanIstilah.parse(JSON.parse(baca(`situs/data/halaman-istilah/${s}.json`)));
      expect(d.cerita!.every((c) => idReg.has(c.rujukan))).toBe(true);
      for (const src of d.sumber!) {
        if (src.riset) expect(riset, src.riset).toContain(`| ${src.riset} |`);
        if ("rekaman" in src) expect(terlacak?.has(src.rekaman), src.rekaman).toBe(true);
      }
      const baris = glosMdx.split("\n").find((b) => b.startsWith(`| **${d.istilah.split(" (")[0]}**`))!;
      expect(baris, s).toContain("[[t3-xss-csrf]]");
      expect(baris.includes(d.istilah.replace(/^(\S+) \((.+)\)$/, "$1** ($2)")) || baris.includes(`**${d.istilah}**`), s).toBe(true);
      for (const t of d.terkait!) expect(glosMdx.includes(`**${t.split(" (")[0]}**`), t).toBe(true);
    }
    expect(glosMdx).toContain("| **Passkey** (WebAuthn) |");
    expect(hitung(glosMdx, /\[\[t3-xss-csrf\]\]/g)).toBe(3);
    // XSS dan Output encoding diperkenalkan di 3.22: halaman ini menautkan, tidak menduplikasi
    expect(hitung(glosMdx, /^\| \*\*XSS\*\* \(cross-site scripting\) \|/gm)).toBe(1);
    expect(glosMdx).toMatch(/^\| \*\*XSS\*\* \(cross-site scripting\) \|.*\[\[t3-m25\]\] \|$/m);
    expect(hitung(glosMdx, /^\| \*\*Output encoding\*\* \|/gm)).toBe(1);
    expect(terlacak?.has("situs/data/halaman-istilah/xss.json")).toBe(true);
  });
  test("teks tampil tidak memuat ID riset, nomor keputusan, nomor PR, atau kode label rekaman", () => {
    const tampil = [isi, ...Object.entries(NILAI_JSON).flatMap(([k, v]) => v.filter((x) => !/^sumber\.\d+\.riset=/.test(x) || !["csrf", "csp", "passkey"].includes(k)))].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/keputusan \d{2,4}|\bPR #?\d{2,4}\b|mutasi tinjauan/i);
    expect(tampil).not.toMatch(/\b[A-G]\d\b(?!\.\d)/);
    expect(mdx).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
  test("klaim tentang kata kunci tidak ada dijaga: tidak ada innerHTML bawah ADR dan tidak ada 'unsafe-inline' di kebijakan lab", () => {
    expect(dasborGo.slice(dasborGo.indexOf("const renderRentan"), dasborGo.indexOf("const renderAman"))).toContain("b.innerHTML = ");
    const aman = dasborGo.slice(dasborGo.indexOf("const renderAman"), dasborGo.indexOf("const halamanDasbor"));
    expect(aman).not.toContain("innerHTML");
    expect(aman).toContain("textContent");
    expect(dasborGo).not.toMatch(/unsafe-inline/);
  });
});

describe("tinjauan 1091: mekanisme, lingkup, dan siapa yang mengirim atau membaca", () => {
  const rowRiset = (id: string): string => riset.split("\n").find((x) => x.startsWith(`| ${id} |`))!;
  test("bagian D menolak lewat ketiga pemeriksaan sekaligus, bukan token sendirian", () => {
    expect(CS.D!.req).toMatchObject({ secFetchSite: "cross-site", originAsing: true, status: 403, cookieTerkirim: true });
    expect(seranganGo).not.toMatch(/X-CSRF-Token|fetch\(|XMLHttpRequest/);
    expect(readme).toMatch(/`csrf-origin-dihapus@rekaman`[^\n]*\*\*Lolos\*\*/);
    expect(readme).toMatch(/`csrf-secfetchsite-dihapus@rekaman`[^\n]*\*\*Lolos\*\*/);
    expect(isi).toContain("Di bagian D ketiganya menolak sekaligus: `Sec-Fetch-Site` cross-site, Origin asing, dan form tanpa token.");
    expect(isi).toContain("Gerbang baru menahan saat cookie terkirim");
    expect(isi).not.toContain("Token baru menahan");
    expect(isi).toContain("ditahan `SameSite=Lax` atau gerbang token, Origin, dan Sec-Fetch-Site (`csrf.txt` bagian B sampai D)");
  });
  test("HttpOnly tidak menahan permintaan lintas situs: bagian E dengan cookie HttpOnly lolos", () => {
    expect(flagCsrf.E).toEqual({ token: "tidak", samesite: "default" });
    expect(dasborGo).toContain('HttpOnly: s.cookie != "rentan"');
    expect(CS.E!.req).toMatchObject({ cookieTerkirim: true, status: 200 });
    expect(CS.E!.sesudah).toBe(1);
    const penutup = (tebakMentah as { penutup: string }).penutup;
    expect(penutup).not.toMatch(/HttpOnly/);
    expect(penutup).toContain("Pagar CSRF (SameSite, token, Origin, dan Sec-Fetch-Site) menahan permintaan dari situs lain");
  });
  test("CSP hanya dikirim /dasbor: halaman login tanpa CSP, dan halaman menyebut lingkupnya", () => {
    expect(dasborGo.match(/"Content-Security-Policy"/g)).toHaveLength(1);
    const fnDasbor = dasborGo.slice(dasborGo.indexOf("func (s *server) dasborPage"), dasborGo.indexOf("// csrfSah memeriksa"));
    expect(fnDasbor).toContain('"Content-Security-Policy"');
    const fnLogin = dasborGo.slice(dasborGo.indexOf("func (s *server) loginPage"), dasborGo.indexOf("func (s *server) loginSubmit"));
    expect(fnLogin.length).toBeGreaterThan(50);
    expect(fnLogin).not.toContain("Content-Security-Policy");
    expect(isi).toContain("satu kebijakan baru di setiap respons `GET /dasbor`:");
    expect(isi).toContain("Halaman login lab tidak mengirim CSP (dibaca dari kode).");
    expect(isi).not.toContain("setiap respons halaman");
  });
  test("nonce tidak berlaku untuk atribut: sumbernya CSP Level 3, bukan MDN; unsafe-inline diabaikan bila ada nonce (MDN)", () => {
    const r211 = rowRiset("R3-211");
    expect(r211).toContain("Nonces only apply to inline script and inline style, not to attributes of either element");
    expect(r211).toContain("the unsafe-inline keyword is ignored by browsers");
    expect(r211).not.toContain("hanya untuk elemen `<script>` dan `<style>`");
    expect(isi).toContain("Spesifikasi CSP Level 3 menulis bahwa nonce hanya berlaku untuk skrip dan style inline, bukan untuk atribut elemen ([W3C: CSP Level 3](https://www.w3.org/TR/CSP3/)");
    expect(isi).not.toContain("MDN menulis bahwa nonce hanya berlaku");
    expect(isi).toContain("Bila nonce tetap ada, browser mengabaikan `'unsafe-inline'`");
    expect(readme).toMatch(/`csp-unsafe-inline-ditambah`[^\n]*\*\*Lolos\*\*/);
    const csp = JSON.parse(baca("situs/data/halaman-istilah/csp.json")) as { sumber: { judul: string; catatan: string }[] };
    expect(csp.sumber.find((s) => /^MDN/.test(s.judul))!.catatan).not.toMatch(/hanya berlaku/);
    expect(csp.sumber.find((s) => /^W3C/.test(s.judul))!.catatan).toContain("hanya berlaku untuk skrip dan style inline");
  });
  test("cookie dibaca dan fetch dikirim penggerak lab, bukan payload", () => {
    expect(driverJs).toContain("page.evaluate(() => document.cookie)");
    expect(PAYLOAD).not.toMatch(/document\.cookie|fetch/);
    expect(hitung(isi, /dibaca penggerak lab, bukan payload/g)).toBe(2);
  });
  test("passkey: kata Passkey ditandai DEPRECATED di spesifikasi, dan create() tidak meminta residentKey", () => {
    const sel = /authenticatorSelection: (\{[^}]*\})/.exec(driverJs)![1]!;
    expect(sel).toContain("authenticatorAttachment: 'platform'");
    expect(sel).not.toMatch(/esidentKey/);
    expect(isi).toContain("Panggilan itu tidak meminta `residentKey`");
    expect(rowRiset("R3-213")).toContain("tidak meminta `residentKey`");
    expect(rowRiset("R3-213")).toContain("[DEPRECATED]");
    expect(isi).toContain('menandai kata "Passkey" sebagai sinonim [DEPRECATED] untuk discoverable credential');
    expect(isi).not.toContain("Passkey adalah nama umum untuk kredensial kunci publik WebAuthn");
    const pk = JSON.parse(baca("situs/data/halaman-istilah/passkey.json")) as { sehari_hari: string };
    expect(pk.sehari_hari).toContain("disimpan di sisi client");
    expect(glosMdx).toContain("| **Passkey** (WebAuthn) | Nama populer untuk kredensial WebAuthn yang disimpan di sisi client");
  });
});
