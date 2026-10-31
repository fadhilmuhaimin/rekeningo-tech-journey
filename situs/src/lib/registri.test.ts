import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Registry } from "./registri";

const baca = () => JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/cerita.json"), "utf8"));

describe("registry cerita.json", () => {
  it("lolos skema", () => {
    const r = Registry.safeParse(baca());
    expect(r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)).toEqual([]);
  });

  it("Tahap 1 punya 42 halaman bernomor 1.1 sampai 1.42 sesuai naskah", () => {
    const d = Registry.parse(baca());
    const nomor = d.halaman.filter((h) => h.tahap === 1 && h.nomor).map((h) => h.nomor);
    expect(nomor).toEqual(Array.from({ length: 42 }, (_, i) => `1.${i + 1}`));
  });

  // Peta halaman Tahap 2 dibaca dari naskah pemilik (keputusan 450): nomor, judul, jenis, bagian, ★, dan lab registry
  // harus sama dengan tabel naskah; halaman lama di slot barunya ikut dihitung.
  it("Tahap 2 punya 33 halaman yang cocok dengan peta halaman naskah", () => {
    const naskah = fs.readFileSync(path.resolve(__dirname, "../../../plan/CERITA-TAHAP-2.md"), "utf8");
    const peta = naskah.split("## Peta halaman Tahap 2")[1]!.split("\n## ")[0]!;
    const JENIS: Record<string, string> = {
      PRD: "prd", "Fitur → teknis": "fitur", Konsep: "konsep", "Konsep + ADR": "konsep", "Keamanan + ADR": "konsep",
      ADR: "adr", Masalah: "masalah", "Tim dan infra": "tim-infra",
    };
    const LAB: Record<string, string> = { "lab pencairan": "t2-pencairan" };
    // Judul naskah 2.8 memakai nomor ADR 12 yang sudah dipakai 1.40; registry menulisnya sebagai revisi ADR 6 (keputusan 723).
    const JUDUL: Record<string, string> = { "ADR 12: dari kolom saldo ke ledger": "ADR 6 direvisi: dari kolom saldo ke ledger" };
    const harap = [...peta.matchAll(/^\| (2\.\d+) \| (\w+) \| (.+?) \| (.+?) \| (★?) *\| (.+?) \|$/gm)].map((m) => ({
      nomor: m[1], bagian: /^\d+$/.test(m[2]!) ? Number(m[2]) : m[2], judul: JUDUL[m[3]!] ?? m[3], jenis: JENIS[m[4]!], inti: m[5] === "★",
      lab: m[6] === "–" ? [] : m[6]!.split(", ").map((x) => LAB[x] ?? x),
    }));
    expect(harap).toHaveLength(33);
    const d = Registry.parse(baca());
    const ada = d.halaman.filter((h) => h.tahap === 2 && h.nomor).map((h) => ({
      nomor: h.nomor, bagian: h.bagian, judul: h.judul, jenis: h.jenis, inti: !!h.inti, lab: h.lab ?? [],
    }));
    expect(ada).toEqual(harap);
    const peran = (p: string) => d.halaman.filter((h) => h.tahap === 2 && h.peran?.includes(p as never)).map((h) => h.nomor);
    expect(peran("mobile")).toEqual(["2.13", "2.14", "2.18", "2.19", "2.20", "2.21"]);
    expect(peran("devops")).toEqual(["2.21", "2.22", "2.24", "2.26"]);
    expect(peran("security")).toEqual(["2.10", "2.27", "2.28"]);
  });

  // Peta halaman Tahap 3 dibaca dari naskah (T3-siap, keputusan 900): nomor, judul, jenis, bagian, ★, lab, peran, dan
  // nomor ADR registry harus sama dengan naskah (kolom Widget naskah ada di ANTREAN, bukan di registry).
  it("Tahap 3 punya 32 halaman yang cocok dengan peta halaman naskah", () => {
    const naskah = fs.readFileSync(path.resolve(__dirname, "../../../plan/CERITA-TAHAP-3.md"), "utf8");
    const peta = naskah.split("## Peta halaman Tahap 3")[1]!.split("\n## ")[0]!;
    const JENIS: Record<string, string> = {
      PRD: "prd", "Fitur → teknis": "fitur", Konsep: "konsep", "Konsep + ADR": "konsep", "Keamanan + ADR": "konsep",
      ADR: "adr", Masalah: "masalah", "Tim dan infra": "tim-infra",
    };
    const harap = [...peta.matchAll(/^\| (3\.\d+) \| (\w+) \| (.+?) \| (.+?) \| (★?) *\| (.+?) \| (.+?) \|$/gm)].map((m) => ({
      nomor: m[1], bagian: /^\d+$/.test(m[2]!) ? Number(m[2]) : m[2], judul: m[3], jenis: JENIS[m[4]!], inti: m[5] === "★",
      lab: m[6] === "–" ? [] : m[6]!.split(", "),
    }));
    expect(harap).toHaveLength(32);
    const d = Registry.parse(baca());
    const ada = d.halaman.filter((h) => h.tahap === 3 && h.nomor).map((h) => ({
      nomor: h.nomor, bagian: h.bagian, judul: h.judul, jenis: h.jenis, inti: !!h.inti, lab: h.lab ?? [],
    }));
    expect(ada).toEqual(harap);
    const peran = (p: string) => d.halaman.filter((h) => h.tahap === 3 && h.peran?.includes(p as never)).map((h) => h.nomor);
    expect(peran("mobile")).toEqual(["3.3", "3.12", "3.13", "3.20", "3.21", "3.24", "3.25"]);
    expect(peran("devops")).toEqual(["3.14", "3.15", "3.17", "3.26", "3.27"]);
    expect(peran("security")).toEqual(["3.16", "3.17", "3.22", "3.23", "3.24", "3.25"]);
    // ADR 22 sampai 33 masing-masing satu halaman, berurutan, tanpa ADR ganda.
    const adr = d.halaman.filter((h) => h.tahap === 3 && h.adr).flatMap((h) => h.adr!);
    expect(adr).toEqual(Array.from({ length: 12 }, (_, i) => 22 + i));
  });

  it("Tahap 3: delapan halaman lama dilebur ke halaman baru, asumsi 3 transaksi, tanpa label email", () => {
    const d = Registry.parse(baca());
    const lama = Object.fromEntries(d.halaman.filter((h) => h.tahap === 3 && h.lebur_ke).map((h) => [h.id, h.lebur_ke]));
    expect(lama).toEqual({
      C2: "t3-observability", "B2.5": "t3-pool", "B10.1": "t3-outbox", B8: "t3-klaim-baris", E4: "t3-notifikasi",
      B9: "t3-cache", C4: "t3-rate-limit-redis", E2: "t3-offline",
    });
    // Naskah 3b memakai 3 transaksi per user aktif per hari di Tahap 3 dan 4 (keputusan 902, 1207); Tahap 1 dan 2 tetap 2 (registry lama, tidak diubah diam-diam).
    expect(d.tahap.map((t) => t.asumsi.trx)).toEqual([2, 2, 3, 3, 2]);
    expect(JSON.stringify(d.tahap[2]!.arsitektur)).not.toMatch(/email|FCM/i);
    expect(d.tahap[2]!.versi).toBeUndefined();
  });

  // Peta halaman Tahap 4 dibaca dari naskah (T4-siap, keputusan 1207): nomor, judul, jenis, bagian, ★, lab, peran, dan
  // nomor ADR registry harus sama dengan naskah (kolom Widget naskah ada di ANTREAN, bukan di registry).
  it("Tahap 4 punya 31 halaman yang cocok dengan peta halaman naskah", () => {
    const naskah = fs.readFileSync(path.resolve(__dirname, "../../../plan/CERITA-TAHAP-4.md"), "utf8");
    const peta = naskah.split("## Peta halaman Tahap 4")[1]!.split("\n## ")[0]!;
    const JENIS: Record<string, string> = {
      PRD: "prd", "Fitur → teknis": "fitur", Konsep: "konsep", "Konsep + ADR": "konsep", "Keamanan + ADR": "konsep",
      ADR: "adr", Masalah: "masalah", "Tim dan infra": "tim-infra",
    };
    const harap = [...peta.matchAll(/^\| (4\.\d+) \| (\w+) \| (.+?) \| (.+?) \| (★?) *\| (.+?) \| (.+?) \|$/gm)].map((m) => ({
      nomor: m[1], bagian: /^\d+$/.test(m[2]!) ? Number(m[2]) : m[2], judul: m[3], jenis: JENIS[m[4]!], inti: m[5] === "★",
      lab: m[6] === "–" ? [] : m[6]!.split(", "),
    }));
    expect(harap).toHaveLength(31);
    const d = Registry.parse(baca());
    const ada = d.halaman.filter((h) => h.tahap === 4 && h.nomor).map((h) => ({
      nomor: h.nomor, bagian: h.bagian, judul: h.judul, jenis: h.jenis, inti: !!h.inti, lab: h.lab ?? [],
    }));
    expect(ada).toEqual(harap);
    const peran = (p: string) => d.halaman.filter((h) => h.tahap === 4 && h.peran?.includes(p as never)).map((h) => h.nomor);
    expect(peran("mobile")).toEqual(["4.3", "4.8", "4.18", "4.19", "4.22", "4.23", "4.26"]);
    expect(peran("devops")).toEqual(["4.10", "4.11", "4.13", "4.16", "4.17", "4.26"]);
    expect(peran("security")).toEqual(["4.7", "4.14", "4.15", "4.18", "4.19", "4.20", "4.21", "4.24", "4.25"]);
    // ADR 34 sampai 45 masing-masing satu halaman, berurutan, tanpa ADR ganda.
    const adr = d.halaman.filter((h) => h.tahap === 4 && h.adr).flatMap((h) => h.adr!);
    expect(adr).toEqual(Array.from({ length: 12 }, (_, i) => 34 + i));
    // Tahap 4 punya sebelas lab sendiri (api-t4 dan sepuluh t4-*) setelah t4-beban dilipat ke api-t4 (keputusan 1207); tiap lab baru punya tugas di ANTREAN.
    const lab = [...new Set(d.halaman.filter((h) => h.tahap === 4 && h.nomor).flatMap((h) => h.lab ?? []))].sort();
    expect(lab).toEqual(["api-t3", "api-t4", "t4-audit", "t4-infra", "t4-integrasi", "t4-kartu", "t4-modul", "t4-pipeline", "t4-qr", "t4-ssrf", "t4-storage", "t4-webhook"]);
    const antrean = fs.readFileSync(path.resolve(__dirname, "../../../plan/ANTREAN.md"), "utf8");
    for (const l of lab.filter((x) => x.endsWith("-t4") || x.startsWith("t4-"))) expect(antrean).toContain(`### lab-${l} · `);
    for (const h of d.halaman.filter((x) => x.tahap === 4 && x.nomor)) expect(antrean).toContain(`### ${h.nomor} · `);
  });

  it("Tahap 4: enam halaman lama dilebur ke halaman baru, asumsi 3 transaksi dan 13 orang, data tahap bukan versi lama", () => {
    const d = Registry.parse(baca());
    const lama = Object.fromEntries(d.halaman.filter((h) => h.tahap === 4 && h.lebur_ke).map((h) => [h.id, h.lebur_ke]));
    expect(lama).toEqual({
      B11: "t4-breaker", "B11.2": "t4-infra-secret", "B10.2": "t4-webhook", "B5.2": "t4-adr-45", "B7.2": "t4-modul", D5: "t4-modul",
    });
    expect(d.halaman.find((h) => h.id === "T4")!.diganti_oleh).toBe("t4-prd");
    const t4 = d.tahap[3]!;
    expect(t4.versi).toBeUndefined();
    expect(t4.asumsi.trx).toBe(3);
    expect(t4.asumsi.tim).toBe("13 developer, 3 tim");
    expect(t4.arsitektur.baris.flat().length).toBeLessThanOrEqual(6);
    expect(t4.user).toBe("100.000");
  });

  // Peta halaman Tahap 5 dibaca dari naskah (T5-siap, keputusan 1410): nomor, judul, jenis, bagian, ★, lab, peran, dan
  // nomor ADR registry harus sama dengan naskah (kolom Widget naskah ada di ANTREAN, bukan di registry). Halaman 5.2
  // memuat bagian 2 dan 3 (naskah "2, 3"); registry memakai bagian 2, dan 5.29 (naskah "Masalah + Konsep") berjenis masalah.
  it("Tahap 5 punya 32 halaman yang cocok dengan peta halaman naskah", () => {
    const naskah = fs.readFileSync(path.resolve(__dirname, "../../../plan/CERITA-TAHAP-5.md"), "utf8");
    const peta = naskah.split("## Peta halaman Tahap 5")[1]!.split("\n## ")[0]!;
    const JENIS: Record<string, string> = {
      PRD: "prd", "Fitur → teknis": "fitur", Konsep: "konsep", "Konsep + ADR": "konsep", "Keamanan + ADR": "konsep",
      ADR: "adr", Masalah: "masalah", "Masalah + Konsep": "masalah", "Tim dan infra": "tim-infra",
    };
    const harap = [...peta.matchAll(/^\| (5\.\d+) \| ([\w, ]+?) \| (.+?) \| (.+?) \| (★?) *\| (.+?) \| (.+?) \|$/gm)].map((m) => {
      const b = m[2]!.split(", ")[0]!;
      return {
        nomor: m[1], bagian: /^\d+$/.test(b) ? Number(b) : b, judul: m[3], jenis: JENIS[m[4]!], inti: m[5] === "★",
        lab: m[6] === "–" ? [] : m[6]!.split(", "),
      };
    });
    expect(harap).toHaveLength(32);
    const d = Registry.parse(baca());
    const ada = d.halaman.filter((h) => h.tahap === 5 && h.nomor).map((h) => ({
      nomor: h.nomor, bagian: h.bagian, judul: h.judul, jenis: h.jenis, inti: !!h.inti, lab: h.lab ?? [],
    }));
    expect(ada).toEqual(harap);
    const peran = (p: string) => d.halaman.filter((h) => h.tahap === 5 && h.peran?.includes(p as never)).map((h) => h.nomor);
    expect(peran("mobile")).toEqual(["5.2", "5.6", "5.7", "5.14", "5.23", "5.27"]);
    expect(peran("devops")).toEqual(["5.9", "5.12", "5.13", "5.16", "5.17", "5.22", "5.23", "5.27", "5.28"]);
    expect(peran("security")).toEqual(["5.18", "5.19", "5.24", "5.25", "5.26"]);
    // ADR 46 sampai 60 masing-masing satu halaman, berurutan, tanpa ADR ganda.
    const adr = d.halaman.filter((h) => h.tahap === 5 && h.adr).flatMap((h) => h.adr!);
    expect(adr).toEqual(Array.from({ length: 15 }, (_, i) => 46 + i));
    // Tahap 5 punya sepuluh lab (api-t5 dan sembilan t5-*) dan memakai api-t4; tiap lab baru dan tiap halaman punya tugas di ANTREAN.
    const lab = [...new Set(d.halaman.filter((h) => h.tahap === 5 && h.nomor).flatMap((h) => h.lab ?? []))].sort();
    expect(lab).toEqual(["api-t4", "api-t5", "t5-cicilan", "t5-fanout", "t5-gabung", "t5-kms", "t5-partisi", "t5-replika", "t5-rollout", "t5-service", "t5-waf"]);
    const antrean = fs.readFileSync(path.resolve(__dirname, "../../../plan/ANTREAN.md"), "utf8");
    for (const l of lab.filter((x) => x.endsWith("-t5") || x.startsWith("t5-"))) expect(antrean).toContain(`### lab-${l} · `);
    for (const h of d.halaman.filter((x) => x.tahap === 5 && x.nomor)) expect(antrean).toContain(`### ${h.nomor} · `);
  });

  it("Tahap 5: D2, D3, dan D4b dilebur, T5 diganti, data tahap bukan versi lama dan tetap 2 transaksi (keputusan 1411)", () => {
    const d = Registry.parse(baca());
    const lama = Object.fromEntries(d.halaman.filter((h) => h.tahap === 5 && h.lebur_ke).map((h) => [h.id, h.lebur_ke]));
    expect(lama).toEqual({ D2: "t5-read-replica", D3: "t5-lag", D4b: "t5-fanout" });
    expect(d.halaman.find((h) => h.id === "T5")!.diganti_oleh).toBe("t5-prd");
    const t5 = d.tahap[4]!;
    expect(t5.versi).toBeUndefined();
    expect(t5.nama).toBe("Satu database tidak cukup");
    expect(t5.user).toBe("1 juta");
    expect(t5.asumsi.trx).toBe(2);
    expect(t5.asumsi.tim).toBe("20+ developer");
    expect(t5.arsitektur.baris.flat().length).toBeLessThanOrEqual(6);
  });

  // Penjaga peninjau T5-siap (keputusan 1415). Uji mutasi atas RINGKAS, `tahap[4]`, dan ANTREAN: sebelum tiga tes berikut
  // hanya 27 dari 59 mutan tertangkap gerbang. Nilai diturunkan dari naskah dan registry, bukan dari berkas yang dijaga.
  const akar = path.resolve(__dirname, "../../..");
  const teks = (p: string) => fs.readFileSync(path.join(akar, p), "utf8");
  const titik = (n: number) => String(n).replace(/\B(?=(\d{3})+$)/g, ".");
  // Tabel tim naskah ("Totalnya 4 × 6 + 2 × 2 = 28 orang"): jumlah baris dan jumlah orang.
  const timNaskah = (naskah: string) => {
    const tim = naskah.split("| Tim | Orang | Pemimpin | Memegang |")[1]!.split("\n\n")[0]!;
    const orang = [...tim.matchAll(/^\| (?!-)[^|]+ \| (\d+) \|/gm)].map((m) => Number(m[1]));
    return { tim: orang.length, jumlah: orang.reduce((s, n) => s + n, 0) };
  };

  it("RINGKAS Tahap 5: peta, pasangan masalah dan ADR ke halaman, peran, dan angka cocok dengan naskah dan registry", () => {
    const ringkas = teks("plan/RINGKAS.md");
    const naskah = teks("plan/CERITA-TAHAP-5.md");
    const bagian = ringkas.split("\n## Tahap 5 · ")[1]!;
    // Sesudah 5.32 merge pengatur melipat peta jadi satu baris per kelompok; tes ini lalu hanya meminta baris lipatnya.
    if (!bagian.includes("### Peta halaman Tahap 5")) {
      expect(bagian).toMatch(/5\.1–5\.32 selesai/);
      return;
    }
    const hal = Registry.parse(baca()).halaman.filter((h) => h.tahap === 5 && h.nomor);
    // Peta: "nomor judul · jenis · ★ · lab", baris demi baris dari tabel naskah.
    const peta = naskah.split("## Peta halaman Tahap 5")[1]!.split("\n## ")[0]!;
    const jenis = (j: string) => j.replace(/\s+/g, "").replace("Timdaninfra", "Tim-infra");
    const harap = [...peta.matchAll(/^\| (5\.\d+) \| [^|]+ \| (.+?) \| (.+?) \| (★?) *\| (.+?) \| .+ \|$/gm)].map(
      (m) => `${m[1]} ${m[2]} · ${jenis(m[3]!)} · ${m[4]} · ${m[5]}`,
    );
    expect(harap).toHaveLength(32);
    expect([...bagian.matchAll(/^(5\.\d+ .+)$/gm)].map((m) => m[1])).toEqual(harap);
    // Peran di kepala peta (rentang "5.24–5.26" dibuka) sama dengan peran registry.
    const kepala = bagian.match(/^### Peta halaman Tahap 5 \(.*?; peran: (.+)\)$/m)![1]!.split("; ");
    expect(kepala.map((s) => s.split(" ")[0])).toEqual(["mobile", "devops", "security"]);
    for (const seg of kepala) {
      const [nama, ...daftar] = seg.split(" ");
      const nomor = daftar.join(" ").split(", ").flatMap((x) => {
        const [a, b] = x.split("–");
        if (!b) return [a!];
        const dari = Number(a!.split(".")[1]);
        return Array.from({ length: Number(b.split(".").pop()) - dari + 1 }, (_, i) => `5.${dari + i}`);
      });
      expect(nomor, `peran ${nama}`).toEqual(hal.filter((h) => h.peran?.includes(nama as never)).map((h) => h.nomor));
    }
    // Pasangan "M40 5.4" dan "ADR 46 5.5" di ringkasan menunjuk halaman yang memuatnya.
    const pasangan = (re: RegExp) => [...bagian.matchAll(re)].map((m) => [m[1]!, m[2]!] as const);
    const masalah = pasangan(/\bM(\d+) (5\.\d+)/g);
    const adr = pasangan(/\bADR (\d+) (5\.\d+)/g);
    expect([masalah.length, adr.length]).toEqual([12, 15]);
    for (const [n, no] of masalah) expect(hal.find((h) => h.judul.startsWith(`M${n}:`))?.nomor, `M${n}`).toBe(no);
    for (const [n, no] of adr) expect(hal.find((h) => h.adr?.includes(Number(n)))?.nomor, `ADR ${n}`).toBe(no);
    // Angka berformat Indonesia (1.388,9; 69,4; 564%) tertulis di naskah; tim dan merchant dari tabel dan latar naskah.
    const angka = [...bagian.matchAll(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+|\d+%/g)].map((m) => m[0]);
    expect(angka.length).toBeGreaterThan(10);
    for (const a of new Set(angka)) expect(naskah, `angka ${a} di RINGKAS`).toContain(a);
    const { tim, jumlah } = timNaskah(naskah);
    expect([tim, jumlah]).toEqual([8, 28]);
    expect(bagian).toContain(`${jumlah} orang dalam delapan tim`);
  });

  it("Tahap 5: skala, rekap, dan diagram arsitektur memakai angka, nama service, dan nomor ADR dari naskah", () => {
    const naskah = teks("plan/CERITA-TAHAP-5.md");
    const d = Registry.parse(baca());
    const t5 = d.tahap[4]!;
    const { tim, jumlah } = timNaskah(naskah);
    const minggu = naskah.match(/dalam delapan tim selama (\d+) minggu/)![1]!;
    expect(t5.skala!.pembuat).toContain(`${jumlah} orang dalam delapan tim`);
    expect(t5.rekap).toContain(`${jumlah} engineer dalam delapan tim, ${minggu} minggu`);
    expect(tim).toBe(8);
    const merchant = naskah.match(/ditulis (\d{1,3}(?:\.\d{3})+) \(Asumsi/)![1]!;
    const user = `${titik(Number(t5.asumsi.user))} user terdaftar, ±${merchant} merchant`;
    expect(t5.skala!.user).toBe(user);
    expect(t5.rekap).toContain(user);
    // BRIEF-HALAMAN menulis nilai trx registry yang sama, jadi mengubah registry menuntut mengubah brief.
    expect(teks("plan/BRIEF-HALAMAN.md")).toContain(`registry \`tahap[4].asumsi.trx\` tetap ${t5.asumsi.trx} (keputusan 1411)`);
    // Enam kotak: nama service dari ADR 50, kata bilangan di label, dan nomor ADR tiap kotak menunjuk halaman dengan topiknya.
    const kotak = t5.arsitektur.baris.flat();
    const service = [...naskah.match(/^\| 50 \| Enam service: (.+?), masing-masing/m)![1]!.matchAll(/`(\w+)`/g)].map((m) => m[1]!);
    expect(service).toHaveLength(6);
    const enam = kotak.find((k) => k.label === `${["Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam"][service.length]} service`);
    for (const s of service) expect(enam?.catatan?.toLowerCase(), `service ${s}`).toContain(s);
    const ADR_KOTAK: Record<string, Record<number, RegExp>> = {
      "App Flutter": { 47: /read-your-writes/i },
      "Pintu di tepi": { 56: /Pintu/ },
      "Enam service": { 50: /service/ },
      "Event streaming": { 51: /event streaming/i },
      "Primary + pooler": { 48: /replica sinkron/i, 49: /Partisi/, 52: /PgBouncer/ },
      "Read replica": { 46: /Read replica/ },
    };
    expect(kotak.map((k) => k.label)).toEqual(Object.keys(ADR_KOTAK));
    for (const k of kotak) {
      const wajib = ADR_KOTAK[k.label]!;
      expect([...(k.catatan ?? "").matchAll(/\(ADR (\d+)\)/g)].map((m) => Number(m[1])), `ADR di kotak ${k.label}`).toEqual(Object.keys(wajib).map(Number));
      for (const [n, topik] of Object.entries(wajib)) {
        expect(d.halaman.find((h) => h.tahap === 5 && h.adr?.includes(Number(n)))?.judul, `ADR ${n} untuk kotak ${k.label}`).toMatch(topik);
      }
    }
    // Keterangan diagram menjelaskan warna biru bila ada kotak baru atau berubah.
    for (const t of d.tahap) {
      if (t.arsitektur.baris.flat().some((k) => k.baru || k.berubah)) expect(t.arsitektur.caption ?? "", `keterangan Tahap ${t.no}`).toMatch(/biru/i);
    }
  });

  it("ANTREAN Tahap 5: alokasi nomor, ketergantungan, dan syarat Docker tiap tugas mengikuti skema keputusan 1412", () => {
    const antrean = teks("plan/ANTREAN.md");
    const d = Registry.parse(baca());
    const hal = d.halaman.filter((h) => h.tahap === 5 && h.nomor);
    const blok = (id: string) => {
      const awal = antrean.indexOf(`\n### ${id} · `);
      expect(awal, `tugas ${id}`).toBeGreaterThan(-1);
      const akhir = antrean.indexOf("\n### ", awal + 5);
      return antrean.slice(awal, akhir < 0 ? undefined : akhir);
    };
    const dep = (id: string) => blok(id).match(/\n- bergantung: (.*)/)![1]!.split(", ");
    // Rentang tahap di kepala bagian ANTREAN berurutan tanpa celah: Tahap 4, 5, 6.
    const rentang = (tahap: number) => {
      const m = antrean.split(`\n## Tahap ${tahap}\n`)[1]!.split("\n## ")[0]!.match(/Nomor keputusan: (\d+)–(\d+)/)!;
      return [Number(m[1]), Number(m[2])] as const;
    };
    const [lo5, hi5] = rentang(5);
    expect([rentang(4)[1] + 1, hi5 + 1]).toEqual([lo5, rentang(6)[0]]);
    // Alokasi: halaman 5.n 1500 + 4(n−1) dan R5-110 + 5(n−1); lab k 1630 + 4k dan R5-270 + 5k; tugas teknis dan penutup tetap.
    const kep = (a: number, b: number) => `ALOKASI: keputusan ${a}–${b} (`;
    const semua: [string, string][] = [];
    for (const h of hal) {
      const n = Number(h.nomor!.split(".")[1]);
      semua.push([h.nomor!, `${kep(1500 + 4 * (n - 1), 1503 + 4 * (n - 1))}`], [h.nomor!, `ID riset R5-${110 + 5 * (n - 1)} sampai R5-${114 + 5 * (n - 1)}.`]);
    }
    const lab = ["api-t5", "t5-replika", "t5-partisi", "t5-fanout", "t5-service", "t5-cicilan", "t5-rollout", "t5-waf", "t5-kms", "t5-gabung"];
    lab.forEach((l, k) => semua.push([`lab-${l}`, kep(1630 + 4 * k, 1633 + 4 * k)], [`lab-${l}`, `ID riset bila perlu R5-${270 + 5 * k} sampai R5-${274 + 5 * k}.`]));
    for (const [id, a, b] of [["ERD5", 1670, 1673], ["W5-lag", 1674, 1677], ["W5-fanout", 1678, 1681], ["W5-zona", 1682, 1685], ["EVAL-5", 1690, 1692], ["DIRI-5", 1693, 1695], ["G3-rantai", 1696, 1698]] as const) {
      semua.push([id, kep(a, b)]);
      expect(a >= lo5 && b <= hi5, `${id} di dalam rentang Tahap 5`).toBe(true);
    }
    for (const [id, harap] of semua) expect(blok(id), `alokasi ${id}`).toContain(harap);
    expect(1500 + 4 * 31 + 3 < 1630 && 1630 + 4 * 9 + 3 < 1670).toBe(true);
    // Judul tugas halaman sama dengan judul registry (dan naskah), dan tiap tugas lab menulis syarat Docker.
    for (const h of hal) expect(antrean, `judul tugas ${h.nomor}`).toContain(`\n### ${h.nomor} · ${h.judul}\n`);
    for (const l of lab) expect(blok(`lab-${l}`), `Docker ${l}`).toContain("Butuh Docker hidup (`docker info`); bila mati, parkir sampai pemilik menyetujui");
    // Ketergantungan: lab dan widget yang dipakai halaman (kolom lab naskah, lewat registry), rantai urutan, dan halaman bebas Docker.
    const butuhLab = (x: string) => x === "api-t5" || x.startsWith("t5-");
    for (const h of hal) {
      const n = Number(h.nomor!.split(".")[1]);
      const d5 = dep(h.nomor!);
      for (const l of (h.lab ?? []).filter(butuhLab)) expect(d5, `${h.nomor} butuh lab-${l}`).toContain(`lab-${l}`);
      expect(d5, `${h.nomor} butuh T5-siap`).toContain("T5-siap");
      if (n > 1 && n !== 28 && n !== 30) expect(d5, `${h.nomor} menunggu 5.${n - 1}`).toContain(`5.${n - 1}`);
    }
    const widget: Record<string, string> = { "5.2": "W5-zona", "5.3": "ERD5", "5.7": "W5-lag", "5.15": "W5-fanout" };
    for (const [no, w] of Object.entries(widget)) expect(dep(no), `${no} butuh ${w}`).toContain(w);
    for (const no of ["5.1", "5.28", "5.30"]) {
      expect(hal.find((h) => h.nomor === no)!.lab ?? [], `lab ${no}`).toEqual([]);
      expect(dep(no).filter((x) => /^(lab-|W5-|ERD5)/.test(x)), `${no} bebas Docker`).toEqual([]);
    }
    expect(dep("5.29")).toEqual(expect.arrayContaining(["5.28", "5.27"]));
    expect(dep("5.31")).toEqual(expect.arrayContaining(["5.30", "5.29"]));
    expect(dep("5.32")).toContain("5.31");
    expect(dep("ERD5")).toEqual(["lab-api-t5"]);
    expect(dep("EVAL-5")).toContain("5.32");
    expect(dep("G3-rantai")).toEqual(["5.32"]);
    for (const l of lab.slice(1)) expect(dep(`lab-${l}`), `lab-${l} butuh lab-api-t5`).toContain("lab-api-t5");
    expect(dep("lab-t5-kms")).toContain("lab-t5-partisi");
  });

  // Id halaman Tahap 5 dibekukan: halaman yang ditulis paralel merujuk tetangganya lewat [[ID]] sebelum tetangga itu merge,
  // dan tidak ada penjaga lain bagi id yang belum dirujuk (mutasi peninjau: mengganti id t5-jembatan lolos semua gerbang).
  // Halaman masalah mengikuti nomor M di judulnya (id dan awal path), yang sudah dikunci ke naskah oleh tes peta.
  it("Tahap 5: id halaman dibekukan dan id serta path halaman masalah mengikuti nomor M di judul", () => {
    const hal = Registry.parse(baca()).halaman.filter((h) => h.tahap === 5 && h.nomor);
    expect(hal.map((h) => h.id)).toEqual([
      "t5-prd", "t5-fitur-teknis", "t5-skema", "t5-m40", "t5-read-replica", "t5-m41", "t5-lag", "t5-m42", "t5-rpo-rto", "t5-m43",
      "t5-partisi", "t5-m44", "t5-service", "t5-m45", "t5-fanout", "t5-m46", "t5-pooler", "t5-m47", "t5-mtls", "t5-m48", "t5-batch",
      "t5-m49", "t5-rollout", "t5-m50", "t5-waf", "t5-kms", "t5-tim-infra", "t5-onprem", "t5-m51", "t5-adr-60", "t5-rekap", "t5-jembatan",
    ]);
    for (const h of hal) {
      expect(h.path, `path ${h.nomor}`).toMatch(/^tahap-5\/[a-z0-9-]+\.md$/);
      const m = h.judul.match(/^M(\d+):/);
      if (m) {
        expect(h.id).toBe(`t5-m${m[1]}`);
        expect(h.path.startsWith(`tahap-5/m${m[1]}-`), `path masalah ${m[1]}`).toBe(true);
      }
    }
  });

  it("nomor tampilan tidak dipakai dua halaman", () => {
    const nomor = Registry.parse(baca()).halaman.flatMap((h) => (h.nomor ? [h.nomor] : []));
    expect(nomor.filter((n, i) => nomor.indexOf(n) !== i)).toEqual([]);
  });

  it("menolak halaman Tahap 1 tanpa jenis dan rujukan lebur yang salah", () => {
    const d = baca();
    const h = d.halaman.find((x: { id: string }) => x.id === "t1-m1");
    delete h.jenis;
    d.halaman.find((x: { id: string }) => x.id === "F1").lebur_ke = "ZZ";
    const r = Registry.safeParse(d);
    expect(r.success).toBe(false);
    const pesan = r.error!.issues.map((i) => i.message).join(" | ");
    expect(pesan).toContain("t1-m1 di Tahap 1 tanpa jenis");
    expect(pesan).toContain("F1.lebur_ke menunjuk ZZ");
  });
});
