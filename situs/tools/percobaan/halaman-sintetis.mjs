// Percobaan G2d (keputusan 367), di luar gerbang: halaman sintetis tanpa kode situs untuk menguji apakah macet renderer
// butuh isi situs (hasil: 0 macet dalam 2 × 60 putaran). Dijalankan dari situs/ sesudah build, sebelum preview.
// minimal-a: teks polos panjang. minimal-b: teks + header fixed + <pre> bergulir + <details> terbuka + SVG inline.
import fs from "node:fs";
const kal = "Raka membuka laptop dan membaca ulang catatan rapat tentang saldo warung yang tidak cocok dengan buku kas. ";
for (const [nama, kaya] of [["minimal-a", false], ["minimal-b", true]]) {
  for (let i = 0; i < 42; i++) {
    let isi = "";
    for (let j = 0; j < 160; j++) {
      isi += `<p>${kal.repeat(3 + (j % 4))}</p>\n`;
      if (kaya && j % 16 === 0) isi += `<details open><summary>Blok ${j}</summary><pre style="overflow-x:auto">${"kolom_panjang ".repeat(30)}\n${"baris kode\n".repeat(8)}</pre><svg viewBox="0 0 200 80" width="200" height="80"><rect x="2" y="2" width="196" height="76" rx="8" fill="none" stroke="rgb(122 184 255)"/><circle cx="40" cy="40" r="20" fill="rgb(163 163 168)"/></svg></details>\n`;
    }
    const kepala = kaya ? `<header style="position:fixed;top:0;left:0;right:0;height:48px;background:rgb(11 11 12);color:white">Kepala</header><div style="height:48px"></div>` : "";
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>m ${i}</title><style>body{margin:0 16px;font:17px/1.65 system-ui,sans-serif;background:rgb(11 11 12);color:rgb(230 230 230)}</style></head><body>${kepala}${isi}</body></html>`;
    fs.mkdirSync(`dist/${nama}/${String(i).padStart(2, "0")}`, { recursive: true });
    fs.writeFileSync(`dist/${nama}/${String(i).padStart(2, "0")}/index.html`, html);
  }
}
console.log("halaman minimal ditulis");
