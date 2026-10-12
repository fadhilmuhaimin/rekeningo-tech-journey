import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { htmlAlurStatis, rp, type IntiAlur, type SkenarioAlur } from "./alur-statis";

const core = createRequire(import.meta.url)("../../lama/widgets/alur-core.js") as IntiAlur & { normalize(d: unknown): SkenarioAlur };

const skenario = (n: number, lain: Record<string, unknown> = {}) =>
  core.normalize({
    versi: 2,
    judul: 'Bayar <warung> "Ani"',
    sumber: { jenis: "rekaman" },
    komponen: Array.from({ length: n }, (_, j) => ({ id: "k" + j, label: "Komponen " + j, lapisan: j === 1 ? ["handler", "service"] : undefined })),
    layarAwal: { hp: { saldo: 1080000, isi: [{ jenis: "tombol", teks: "Bayar" }] } },
    langkah: [
      { dari: "k0", ke: "k1", judul: "Kirim", kirim: "POST /transfers", jelas: "App mengirim." },
      { dari: "k1", judul: "Simpan", jelas: "Server menyimpan." },
    ],
    predict: { q: "Berapa saldo?", options: ["A", "B"], answer: 0 },
    varian: { label: "tanpa transaction", mulai: 1, langkah: [{ dari: "k1", judul: "Gagal", jelas: "Saldo berkurang." }] },
    ...lain,
  });

describe("htmlAlurStatis", () => {
  it("meniru render pertama alur.js: kepala, tebakan, lajur, HP, tombol, hitungan langkah", () => {
    const html = htmlAlurStatis(skenario(3), core);
    expect(html).toMatch(/^<div class="bb-alur-pesan" aria-hidden="true" inert style="--n: 3">/);
    expect(html).toContain('class="bb-widget bb-alur bb-alur--statis"');
    expect(html).toContain('<span class="bb-chip bb-sumber is-system">Rekaman lab</span>');
    expect(html.match(/class="bb-btn bb-btn--opt" disabled/g)).toHaveLength(2);
    expect(html).toContain('<li data-l="handler">handler</li>');
    expect(html).toContain("repeat(3, 1fr)");
    expect(html).toContain("<strong>Rp1.080.000</strong>");
    expect(html).toContain("Tebak dulu, lalu tekan Berikutnya.");
    expect(html).toContain("Langkah 0 dari 2");
    expect(html).toContain('<button type="button" class="bb-btn bb-btn--primary" disabled>');
  });

  it("urutan sama dengan alur.js: tombol, lalu HP dan kolom detail berisi penjelasan, tebakan, varian (keputusan 363)", () => {
    const html = htmlAlurStatis(skenario(3), core);
    const letak = ["bb-row", "bb-alur__body", "bb-alur__phone", "bb-alur__kolom", "bb-alur__detail", "bb-predict", "bb-alur__varian"]
      .map((k) => html.indexOf(`class="${k}"`));
    expect(letak.every((x) => x > -1)).toBe(true);
    expect([...letak].sort((a, b) => a - b)).toEqual(letak);
  });

  it("meloloskan teks skenario sebagai teks, bukan HTML", () => {
    expect(htmlAlurStatis(skenario(2), core)).toContain("Bayar &lt;warung&gt; &quot;Ani&quot;");
  });

  it("tanpa tebakan: Berikutnya aktif dan ajakan mulai", () => {
    const html = htmlAlurStatis(skenario(2, { predict: undefined }), core);
    expect(html).toContain('<button type="button" class="bb-btn bb-btn--primary">');
    expect(html).toContain("Tekan Berikutnya untuk mulai.");
  });

  it("menolak lebih dari 5 komponen (tata letak sempit belum ditiru)", () => {
    expect(() => htmlAlurStatis(skenario(6), core)).toThrow(/6 komponen/);
  });

  it("rp sama dengan BB.rp", () => {
    expect(rp(1080000)).toBe("Rp1.080.000");
    expect(rp(-70000)).toBe("-Rp70.000");
  });
});
