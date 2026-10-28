// Versi statis (sebelum hydrate dan tanpa JavaScript) ErdTumbuh dengan Tahap 4 dan pembagian modulnya (ERD4, tinjauan keputusan 1257).
// ukur-erd.mjs membuka /uji/erd/ di Tahap 2, yang tidak punya pembagian modul; teks modul di versi statis dan tabel pembagian
// modul hanya terlihat bila halaman dibuka di Tahap 4 (halaman 4.5), jadi dijaga di sini lewat render server komponennya.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ErdTumbuh from "./ErdTumbuh";
import { DataErd, ModulErd, PetaHalaman } from "./skema";
import { ringkasModul, tautanHalaman } from "./tumbuh";
import t1 from "../../data/erd/tahap-1.json";
import t2 from "../../data/erd/tahap-2.json";
import t3 from "../../data/erd/tahap-3.json";
import t4 from "../../data/erd/tahap-4.json";
import m4 from "../../data/erd/modul-tahap-4.json";
import peta from "../../data/erd/halaman.json";
import { muat, url } from "../../tools/registri.mjs";

const data = [DataErd.parse(t1), DataErd.parse(t2), DataErd.parse(t3), DataErd.parse(t4)];
const modul = ModulErd.parse(m4);
const tautan = tautanHalaman(PetaHalaman.parse(peta), data, muat().halaman, url);
const render = (awal: number, m: ModulErd[]) => renderToStaticMarkup(createElement(ErdTumbuh, { id: "uji", judul: "Skema", data, tautan, awal, modul: m }));
const statis = (html: string) => html.slice(html.indexOf("erd-tumbuh__statis"), html.indexOf("erd-tumbuh__panel"));

describe("ErdTumbuh versi statis dengan pembagian modul (ERD4)", () => {
  const html = render(4, [modul]);
  it("tiap tabel Tahap 4 di daftar statis menyebut modulnya, dan tabel baru, berubah, dan tetap tetap memuat status", () => {
    const s = statis(html);
    for (const x of modul.modul)
      for (const t of x.tabel) expect(s, `${t} modul ${x.nama}`).toMatch(new RegExp(`<code translate="no">${t}</code> \\((baru|berubah|tetap)\\), modul ${x.nama}<ul>`));
    expect(s.match(/, modul /g)).toHaveLength(22);
  });
  it("tabel pembagian modul: caption dengan ringkasan, chip sumber, enam baris, dan 22 nama tabel dengan kepala kolom dan baris", () => {
    expect(html).toContain("<strong>Pembagian modul Tahap 4</strong>");
    expect(html).toContain("Rekaman lab · pembagian modul");
    expect(html).toContain(ringkasModul(modul));
    const tabel = html.slice(html.indexOf('<table>'), html.indexOf("</table>"));
    expect(tabel.match(/<tr>/g)).toHaveLength(7); // kepala + enam modul
    expect(tabel.match(/<th scope="col">/g)).toHaveLength(3);
    expect(tabel.match(/<th scope="row">/g)).toHaveLength(6);
    expect(tabel.match(/<td>\d+<\/td>/g)?.map((x) => Number(x.replace(/\D/g, "")))).toEqual([6, 4, 1, 4, 5, 2]);
    expect(tabel.match(/<code translate="no">/g)).toHaveLength(6 + 22);
  });
  it("tahap tanpa pembagian modul (Tahap 2) dan halaman tanpa prop modul tidak menampilkan modul sama sekali", () => {
    for (const h of [render(2, [modul]), render(4, [])]) {
      expect(h).not.toContain("Pembagian modul");
      expect(h).not.toContain(", modul ");
    }
    expect(render(3, [modul])).not.toContain("Pembagian modul");
  });
});
