// Penjaga tooltip salah arti (EVAL5-F1, keputusan 1893). EVAL-5 membaca HTML build dan menemukan 128 tooltip "token" dan 34
// tooltip "router" di Tahap 5 yang menjelaskan arti lain daripada yang dipakai halaman: remark-abbr memasang satu definisi
// di setiap kemunculan kata, dan tes halaman hanya membaca MDX dan glosarium, bukan hasilnya. Tes ini membaca berkas data
// (tanpa build) dan, bila situs/dist ada (di gerbang dan CI selalu ada), HTML hasil build semua halaman.
import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ArtiIstilah, abbrDiMain, bacaDefinisi, dalamKecuali, periksaAturan, periksaCampuran, periksaHalaman } from "./arti-istilah";

const ROOT = path.resolve(__dirname, "../../..");
const baca = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const def = bacaDefinisi(baca("situs/data/istilah.md"));
const aturan = ArtiIstilah.parse(JSON.parse(baca("situs/data/arti-istilah.json")));
const adaHalaman = (h: string) => fs.existsSync(path.join(ROOT, "situs/src/content/docs", `${h}.mdx`)) || fs.existsSync(path.join(ROOT, "situs/src/content/docs", `${h}.md`));
const DIST = path.join(ROOT, "situs/dist");
const htmlHalaman = (h: string) => fs.readFileSync(path.join(DIST, h, "index.html"), "utf8");

const LSN = "Token LSN";
const TRAFFIC = "Traffic router";
const BASIS_DATA = "Router database";
const PERANGKAT = "Token perangkat";

describe("entri glosarium per arti", () => {
  test("tiga entri baru ada di glosarium.mdx, glosarium.json, dan istilah.md dengan definisi yang sama, tiap definisi berbeda dari arti bawaan", () => {
    const mdx = baca("situs/src/content/docs/alat/glosarium.mdx");
    const json = JSON.parse(baca("situs/data/glosarium.json")) as { t: string; d: string }[];
    for (const [entri, kata] of [[LSN, "token"], [TRAFFIC, "router"], [BASIS_DATA, "router"]] as const) {
      expect(mdx, entri).toContain(`| **${entri}** |`);
      const baris = json.find((b) => b.t === entri);
      expect(baris, entri).toBeDefined();
      expect(def[entri], entri).toBe(baris!.d);
      expect(def[entri]).not.toBe(def[kata]);
    }
  });

  test("kunci frasa lengkap (token LSN, traffic router, router database, database router) punya definisi entrinya sendiri, jadi frasa utuh menang atas kata sendirian", () => {
    expect(def["token LSN"]).toBe(def[LSN]);
    expect(def["traffic router"]).toBe(def[TRAFFIC]);
    expect(def["router database"]).toBe(def[BASIS_DATA]);
    expect(def["Database router"]).toBe(def[BASIS_DATA]);
    expect(def["database router"]).toBe(def[BASIS_DATA]);
  });

  test("arti bawaan token dan router tidak berubah, dan token bucket serta token perangkat tetap entri sendiri", () => {
    expect(def["token"]).toMatch(/^String yang dibawa request sebagai bukti siapa pengirimnya/);
    expect(def["router"]).toBe("Bagian framework yang mencocokkan method dan path request dengan handler yang tepat.");
    expect(def["token bucket"]).toMatch(/^Algoritma rate limit/);
    expect(def["token perangkat"]).toMatch(/^Pengenal satu HP/);
  });

  // Teks tiga definisi dikunci utuh (peninjau, keputusan 1891): definisinya yang dibaca pembaca di tooltip, dan sumbernya sudah dibuka.
  // Token LSN: tipe pg_lsn adalah pointer ke posisi di WAL (PostgreSQL 17, datatype-pg-lsn), kepala X-Lsn-Tulis dari labs/t5-replika/README.md.
  // Traffic router: Argo Rollouts, "Traffic Management": ingress controller dan service mesh. Router database: Django, "Multiple
  // databases", "Automatic database routing" (db_for_read, db_for_write).
  test("teks tiga definisi dikunci utuh", () => {
    expect(def[LSN]).toBe("Posisi primary di WAL sesudah satu COMMIT. Server mengirimnya ke app di kepala X-Lsn-Tulis, dan app mengembalikannya di bacaan berikutnya. Isinya posisi di log, bukan bukti siapa pengirimnya.");
    expect(def[TRAFFIC]).toBe("Komponen yang menggeser lalu lintas antar versi aplikasi menurut bobot, mis. 5% ke versi baru. Di Kubernetes, ingress controller atau service mesh menjalankan peran itu.");
    expect(def[BASIS_DATA]).toBe("Bagian framework web yang memilih koneksi database untuk tiap query, mis. primary untuk tulis dan replica untuk baca. Di Django namanya database router.");
  });

  test("definisi baru menjelaskan arti, bukan jawaban masalah di halaman lain", () => {
    // gaya-bahasa: tooltip menjelaskan arti istilah. Keputusan ADR 47 (replica dipakai bila sudah menyusul) dan penyebab M49
    // (bobot jadi jumlah pod) ditulis di halamannya, bukan di tooltip yang tampil di halaman masalahnya.
    expect(def[LSN]).not.toMatch(/replica (dipakai|dilayani|menjawab)|menyusul/i);
    expect(def[TRAFFIC]).not.toMatch(/jumlah pod|25|33/);
    expect(def[BASIS_DATA]).not.toMatch(/lag|tertinggal/i);
  });
});

describe("berkas arti-istilah.json", () => {
  test("semua halaman ada, semua entri ada di glosarium, dan tiap entri berbeda dari arti bawaan kata itu", () => {
    expect(periksaAturan(aturan, def, adaHalaman)).toEqual([]);
  });

  // Pin literal (keputusan 1891): tes lain menurunkan arti yang diharapkan dari berkas ini sendiri, jadi menukar entri antar halaman
  // (token jadi Token perangkat, router database jadi traffic router) lolos semuanya. Baris di sini ditulis sesudah membaca tiap
  // kemunculan kata itu di halamannya. Halaman baru (mis. Tahap 6) boleh mendaftar tanpa menambah baris di sini, selama
  // periksaAturan dan sapuan HTML lolos; tambahkan barisnya bila artinya perlu dikunci.
  test("arti per halaman dikunci: tiap halaman yang dikenal menunjuk entri yang benar untuk kata token dan router", () => {
    const entri = (a: ArtiIstilah[string][string]) => (typeof a === "string" ? a : a.arti);
    const sekarang = Object.fromEntries(Object.entries(aturan).map(([h, kata]) => [h, Object.fromEntries(Object.entries(kata).map(([k, a]) => [k, entri(a)]))]));
    const kunci: Record<string, Record<string, string>> = {
      "tahap-3/at-least-once": { token: PERANGKAT },
      "tahap-3/fitur-ke-teknis": { token: PERANGKAT },
      "tahap-3/fitur-notifikasi": { token: PERANGKAT },
      "tahap-3/m19-tidak-diberi-tahu": { token: PERANGKAT },
      "tahap-3/skema-data": { token: PERANGKAT },
      "tahap-5/m41-riwayat-belum-memuat": { token: LSN },
      "tahap-5/modul-ke-service": { router: TRAFFIC },
      "tahap-5/pintu-mitra-waf": { router: TRAFFIC },
      "tahap-5/progressive-delivery": { router: TRAFFIC },
      "tahap-5/read-replica": { router: BASIS_DATA },
      "tahap-5/rekap": { token: LSN },
      "tahap-5/replication-lag": { token: LSN, router: BASIS_DATA },
    };
    for (const [h, k] of Object.entries(kunci)) expect(sekarang[h], h).toEqual(k);
  });

  // Uji mutasi di tingkat data: bila satu entri baru dihapus, atau satu aturan menunjuk entri yang tak ada, tes di atas gagal.
  test("mutasi: entri Token LSN dihapus dari glosarium, aturan menunjuk arti yang tidak ada, atau dua entri berdefinisi sama, dan periksaAturan melaporkannya", () => {
    const tanpaLsn = { ...def };
    delete tanpaLsn[LSN];
    delete tanpaLsn["token LSN"];
    expect(periksaAturan(aturan, tanpaLsn, adaHalaman).filter((m) => m.includes('"Token LSN", yang tidak ada di glosarium')).length).toBe(3);
    expect(periksaAturan({ "tahap-5/halaman-tak-ada": { token: LSN } }, def, adaHalaman)).toEqual(["tahap-5/halaman-tak-ada: tidak ada berkas di src/content/docs"]);
    expect(periksaAturan(aturan, { ...def, [LSN]: def["token"]! }, adaHalaman).length).toBeGreaterThan(0);
    expect(periksaAturan({ "tahap-5/rekap": { token: { arti: LSN, kecuali: ["router saja"] } } }, def, adaHalaman)).toEqual(['tahap-5/rekap: frasa "router saja" tidak memuat kata "token"']);
  });
});

describe("sapuan HTML: pemeriksa", () => {
  const abbr = (judul: string, kata: string, arti?: string) => `<abbr title="${judul}"${arti ? ` data-arti="${arti}"` : ""}>${kata}</abbr>`;
  const html = (isi: string) => `<html><body><nav><abbr title="${def["token"]}">token</abbr></nav><main><p>${isi}</p></main></body></html>`;
  const lokal: ArtiIstilah = { "tahap-5/x": { token: { arti: LSN, kecuali: ["hitungan token"] }, router: TRAFFIC } };

  test("tooltip entri halaman lolos, arti bawaan di luar frasa kecuali dan arti lain ditolak, tag di antara kata dibaca sebagai teks", () => {
    const benar = html(`Server membawa ${abbr(def[LSN]!, "token", LSN)} dan ${abbr(def[TRAFFIC]!, "router", TRAFFIC)}. Itu <em>hitungan</em> ${abbr(def["token"]!, "token")}, bukan laju.`);
    expect(periksaHalaman(benar, "tahap-5/x", lokal, def)).toEqual([]);
    const salah = html(`Server membawa ${abbr(def["token"]!, "token")} dan ${abbr(def["router"]!, "router")}.`);
    expect(periksaHalaman(salah, "tahap-5/x", lokal, def)).toHaveLength(4);
    // atribut data-arti hilang (JavaScript akan membuka popover arti bawaan): ditolak walau judulnya benar
    expect(periksaHalaman(html(abbr(def[LSN]!, "token")), "tahap-5/x", lokal, def).length).toBeGreaterThan(0);
  });

  test("arti bawaan hanya lolos di dalam frasa kecuali, dan <abbr> di luar <main> tidak dihitung", () => {
    const lolos = html(`${abbr(def[LSN]!, "token", LSN)} ${abbr(def[TRAFFIC]!, "router", TRAFFIC)} hitungan ${abbr(def["token"]!, "token")}`);
    expect(periksaHalaman(lolos, "tahap-5/x", lokal, def)).toEqual([]);
    const diLuar = html(`${abbr(def[LSN]!, "token", LSN)} ${abbr(def[TRAFFIC]!, "router", TRAFFIC)} kata ${abbr(def["token"]!, "token")} biasa`);
    expect(periksaHalaman(diLuar, "tahap-5/x", lokal, def)).toHaveLength(1);
    const a = abbrDiMain(diLuar);
    expect(a).toHaveLength(3);
    expect(dalamKecuali(a[2]!, ["hitungan token"])).toBe(false);
    expect(dalamKecuali(a[2]!, ["token biasa"])).toBe(true);
  });

  test("periksaCampuran: frasa utuh bersama kata sendirian bertooltip arti bawaan dilaporkan, frasa saja atau kata dengan arti halaman tidak", () => {
    const pasangan = [["token", LSN], ["router", TRAFFIC]] as const;
    const frasa = abbr(def[LSN]!, "token LSN");
    expect(periksaCampuran(html(`${frasa} dan ${abbr(def["token"]!, "token")}`), "tahap-6/x", def, pasangan)).toHaveLength(1);
    expect(periksaCampuran(html(frasa), "tahap-6/x", def, pasangan)).toEqual([]);
    expect(periksaCampuran(html(`${frasa} ${abbr(def[LSN]!, "token", LSN)}`), "tahap-6/x", def, pasangan)).toEqual([]);
    expect(periksaCampuran(html(`${abbr(def[TRAFFIC]!, "traffic router")} ${abbr(def["router"]!, "router")}`), "tahap-6/x", def, pasangan)).toHaveLength(1);
    expect(periksaCampuran(html(abbr(def["token"]!, "token")), "tahap-6/x", def, pasangan)).toEqual([]);
  });

  test("aturan yang tidak dipakai satu kemunculan pun dilaporkan, dan halaman tanpa aturan tidak diperiksa", () => {
    expect(periksaHalaman(html("tanpa kata itu"), "tahap-5/x", lokal, def)).toHaveLength(2);
    expect(periksaHalaman(html(abbr(def["token"]!, "token")), "tahap-5/lain", lokal, def)).toEqual([]);
  });
});

// HTML hasil build: gerbang membangun situs sebelum Vitest, jadi di gerbang dan CI bagian ini selalu jalan.
describe.runIf(fs.existsSync(path.join(DIST, "tahap-5/replication-lag/index.html")))("HTML hasil build: tooltip token dan router", () => {
  const tahap5 = () => fs.readdirSync(path.join(DIST, "tahap-5")).filter((d) => fs.existsSync(path.join(DIST, "tahap-5", d, "index.html"))).map((d) => `tahap-5/${d}`);
  const semua = () => {
    const hasil: string[] = [];
    (function jalan(d: string) {
      for (const e of fs.readdirSync(path.join(DIST, d), { withFileTypes: true })) {
        if (e.isDirectory() && e.name !== "_astro" && e.name !== "pagefind") jalan(path.join(d, e.name));
      }
      if (d && fs.existsSync(path.join(DIST, d, "index.html"))) hasil.push(d);
    })("");
    return hasil;
  };

  test.each(Object.keys(aturan))("%s: tiap kemunculan kata yang diatur bertooltip entri halaman itu, dengan data-arti", (h) => {
    expect(periksaHalaman(htmlHalaman(h), h, aturan, def)).toEqual([]);
  });

  test("tidak ada tooltip router framework di Tahap 5: semua pemakaian router di sana berarti traffic router atau router database", () => {
    const sisa: string[] = [];
    for (const h of tahap5()) for (const a of abbrDiMain(htmlHalaman(h))) if (a.teks.toLowerCase() === "router" && a.judul === def["router"]) sisa.push(`${h}: ${a.kiri.slice(-20)}[router]${a.kanan.slice(0, 20)}`);
    expect(sisa).toEqual([]);
  });

  test("tidak ada tooltip token bawaan di halaman yang memakai token LSN, kecuali dua kemunculan di rekap Tahap 5 (token bucket dan token OpenBao)", () => {
    const sisa: Record<string, string[]> = {};
    for (const h of ["tahap-5/m41-riwayat-belum-memuat", "tahap-5/replication-lag", "tahap-5/rekap"]) {
      const a = abbrDiMain(htmlHalaman(h)).filter((x) => x.teks.toLowerCase() === "token" && x.judul === def["token"]);
      sisa[h] = a.map((x) => (x.kiri.slice(-14) + x.teks + x.kanan.slice(0, 14)).replace(/\s+/g, " "));
    }
    expect(sisa["tahap-5/m41-riwayat-belum-memuat"]).toEqual([]);
    expect(sisa["tahap-5/replication-lag"]).toEqual([]);
    expect(sisa["tahap-5/rekap"]).toHaveLength(2);
    expect(sisa["tahap-5/rekap"]!.some((s) => s.includes("hitungan token"))).toBe(true);
    expect(sisa["tahap-5/rekap"]!.some((s) => s.includes("token tanpa hak"))).toBe(true);
  });

  test("pemakaian lain tetap arti bawaan: token akses, token bucket, dan token OpenBao di 5.4, 5.19, 5.24, 5.25, 5.26, dan semua kata token atau router di setiap halaman yang tidak terdaftar di arti-istilah.json", () => {
    for (const h of ["tahap-5/m40-pembayaran-melambat", "tahap-5/mtls-antar-service", "tahap-5/m50-satu-pos", "tahap-5/pintu-mitra-waf", "tahap-5/arsip-envelope-encryption"]) {
      const a = abbrDiMain(htmlHalaman(h)).filter((x) => x.teks.toLowerCase() === "token");
      expect(a.length, h).toBeGreaterThan(0);
      for (const x of a) expect([x.judul, x.arti], h).toEqual([def["token"], null]);
    }
    const lama = semua().filter((h) => !(h in aturan));
    let diperiksa = 0;
    for (const h of lama) {
      for (const x of abbrDiMain(htmlHalaman(h))) {
        const k = x.teks.toLowerCase();
        if (k !== "token" && k !== "router") continue;
        diperiksa++;
        expect([h, x.judul, x.arti], h).toEqual([h, def[k], null]);
      }
    }
    expect(diperiksa).toBeGreaterThan(100);
  });

  test("halaman yang tidak terdaftar tidak menulis frasa utuh (token LSN, traffic router, router database) lalu memakai kata token atau router sendirian bertooltip arti bawaan", () => {
    const pasangan = [["token", LSN], ["router", TRAFFIC], ["router", BASIS_DATA]] as const;
    const campur: string[] = [];
    for (const h of semua()) {
      if (h in aturan || h.startsWith("alat/")) continue; // alat/glosarium dan indeks memuat semua arti sekaligus
      campur.push(...periksaCampuran(htmlHalaman(h), h, def, pasangan));
    }
    expect(campur).toEqual([]);
  });

  // Uji mutasi: arti lama dikembalikan di HTML asli. Tiap mutasi harus membuat pemeriksa melaporkan pelanggaran.
  test("mutasi: arti bawaan dikembalikan di replication-lag, di rekap, atau data-arti dibuang, dan sapuan melaporkannya", () => {
    const asli = htmlHalaman("tahap-5/replication-lag");
    expect(periksaHalaman(asli, "tahap-5/replication-lag", aturan, def)).toEqual([]);
    const judulLsn = (asli.match(/<abbr title="([^"]*)" data-arti="Token LSN"/) ?? [])[1];
    expect(judulLsn, "judul Token LSN di HTML").toBeDefined();
    const kembali = asli.split(`<abbr title="${judulLsn}" data-arti="Token LSN">`).join(`<abbr title="${def["token"]}">`);
    expect(kembali).not.toBe(asli);
    expect(periksaHalaman(kembali, "tahap-5/replication-lag", aturan, def).length).toBeGreaterThan(70);
    const tanpaAtribut = asli.replace(/ data-arti="Token LSN"/g, "");
    expect(periksaHalaman(tanpaAtribut, "tahap-5/replication-lag", aturan, def).length).toBeGreaterThan(70);
    const rekap = htmlHalaman("tahap-5/rekap");
    expect(periksaHalaman(rekap, "tahap-5/rekap", aturan, def)).toEqual([]);
    const judulRekap = (rekap.match(/<abbr title="([^"]*)" data-arti="Token LSN"/) ?? [])[1]!;
    expect(periksaHalaman(rekap.split(`<abbr title="${judulRekap}" data-arti="Token LSN">`).join(`<abbr title="${def["token"]}">`), "tahap-5/rekap", aturan, def).length).toBeGreaterThan(5);
  });
});
