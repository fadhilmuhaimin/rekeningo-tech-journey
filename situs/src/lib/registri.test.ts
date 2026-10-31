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
