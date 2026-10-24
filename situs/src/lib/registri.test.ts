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
