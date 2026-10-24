import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Glosarium, HalamanIstilah, STACK, potong, semuaRujukan, slugDariS, tujuanTerkait } from "./istilah";

const ROOT = path.resolve(__dirname, "../../..");
const dir = path.join(ROOT, "situs/data/halaman-istilah");
const berkas = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
const baca = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const glos = Glosarium.parse(JSON.parse(fs.readFileSync(path.join(ROOT, "situs/data/glosarium.json"), "utf8")));
const idRegistry = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, "situs/data/cerita.json"), "utf8")).halaman.map((h: { id: string }) => h.id));
const riset = fs.readdirSync(path.join(ROOT, "plan")).filter((f) => /^RISET-TAHAP-\d\.md$/.test(f))
  .flatMap((f) => [...fs.readFileSync(path.join(ROOT, "plan", f), "utf8").matchAll(/^\| (R\d-\d{2,3}) \|/gm)].map((m) => m[1]));

const contoh = () => baca("idempotency-key.json");

describe("halaman istilah: data", () => {
  test("ada minimal satu halaman istilah", () => expect(berkas.length).toBeGreaterThan(0));

  test.each(berkas)("%s valid, punya baris glosarium dengan slug dan nama yang sama", (f) => {
    const d = HalamanIstilah.parse(baca(f));
    const b = glos.find((g) => slugDariS(g.s) === f.replace(/\.json$/, ""));
    expect(b, "baris glosarium").toBeDefined();
    expect(d.istilah).toBe(b!.t);
    expect(b!.h).toBe(`/istilah/${f.replace(/\.json$/, "")}/`);
  });

  test.each(berkas)("%s: rujukan, istilah terkait, rekaman, dan ID riset nyata", (f) => {
    const d = HalamanIstilah.parse(baca(f));
    for (const id of semuaRujukan(d)) expect(idRegistry.has(id), `[[${id}]] di cerita.json`).toBe(true);
    for (const n of d.terkait ?? []) expect(() => tujuanTerkait(n, glos)).not.toThrow();
    const rekaman = [
      ...(d.sumber ?? []).flatMap((s) => ("rekaman" in s ? [s.rekaman] : [])),
      ...(d.stack && !("lihat" in d.stack) ? STACK.flatMap((s) => { const b = (d.stack as Record<string, { rekaman?: string }>)[s]!; return b.rekaman ? [b.rekaman] : []; }) : []),
    ];
    for (const r of rekaman) expect(fs.existsSync(path.join(ROOT, r)), r).toBe(true);
    for (const s of d.sumber ?? []) if (s.riset) expect(riset, `${s.riset} di plan/RISET-TAHAP-N.md`).toContain(s.riset);
    if (d.stack && "lihat" in d.stack) expect(berkas).toContain(`${d.stack.lihat}.json`);
  });

  test("halaman glosarium.json hanya untuk istilah yang punya file", () => {
    const punya = new Set(berkas.map((f) => `/istilah/${f.replace(/\.json$/, "")}/`));
    for (const g of glos) if (g.h) expect(punya.has(g.h), g.t).toBe(true);
  });
});

describe("halaman istilah: skema", () => {
  test("kunci bagian yang hilang ditolak", () => {
    for (const k of ["sehari_hari", "cerita", "mekanisme", "stack", "jebakan", "terkait", "sumber"]) {
      const d = contoh();
      delete d[k];
      expect(HalamanIstilah.safeParse(d).success, k).toBe(false);
    }
  });

  test("bagian null berarti belum ditulis dan diterima", () => {
    const d = { istilah: "Retry", sehari_hari: null, cerita: null, mekanisme: null, stack: null, jebakan: null, terkait: null, sumber: null };
    expect(HalamanIstilah.safeParse(d).success).toBe(true);
  });

  test("mekanisme tanpa sumber ditolak", () => {
    const d = { ...contoh(), sumber: null };
    expect(HalamanIstilah.safeParse(d).success).toBe(false);
  });

  test("mekanisme di luar 3–5 langkah ditolak", () => {
    const d = contoh();
    expect(HalamanIstilah.safeParse({ ...d, mekanisme: d.mekanisme.slice(0, 2) }).success).toBe(false);
    expect(HalamanIstilah.safeParse({ ...d, mekanisme: [...d.mekanisme, "a", "b"] }).success).toBe(false);
  });

  test("stack harus enam; Rekaman lab wajib path rekaman; Tidak dijalankan wajib dokumentasi", () => {
    const d = contoh();
    const limaStack = { ...d.stack };
    delete limaStack.supabase;
    expect(HalamanIstilah.safeParse({ ...d, stack: limaStack }).success).toBe(false);
    const tanpaRekaman = { ...d.stack, go: { ...d.stack.go, rekaman: undefined } };
    expect(HalamanIstilah.safeParse({ ...d, stack: tanpaRekaman }).success).toBe(false);
    const tanpaDok = { ...d.stack, node: { label: "Tidak dijalankan", versi: "x", teks: "x" } };
    expect(HalamanIstilah.safeParse({ ...d, stack: tanpaDok }).success).toBe(false);
  });

  test("kunci tak dikenal ditolak", () => {
    expect(HalamanIstilah.safeParse({ ...contoh(), satu_kalimat: "x" }).success).toBe(false);
  });
});

describe("halaman istilah: potong teks", () => {
  test("kode, rujukan, dan tautan", () => {
    expect(potong("pakai `FOR UPDATE` lihat [[t2-m9]] dan [RFC](https://example.org/x)")).toEqual([
      { jenis: "teks", teks: "pakai " },
      { jenis: "kode", teks: "FOR UPDATE" },
      { jenis: "teks", teks: " lihat " },
      { jenis: "rujukan", id: "t2-m9" },
      { jenis: "teks", teks: " dan " },
      { jenis: "tautan", teks: "RFC", url: "https://example.org/x" },
    ]);
    expect(potong("[[E3|ADR 14]]")).toEqual([{ jenis: "rujukan", id: "E3", teks: "ADR 14" }]);
  });

  test("istilah terkait tanpa halaman menuju baris glosarium", () => {
    const retry = glos.find((g) => g.t === "Retry")!;
    expect(tujuanTerkait("Retry", glos).url).toBe(retry.h ?? `/alat/glosarium/#${retry.s}`);
    expect(() => tujuanTerkait("Tidak ada", glos)).toThrow();
  });
});
