// Menyalin aset lama ke public/ supaya widget lama jalan apa adanya (keputusan 103, 114):
//   situs/lama/widgets/*.js       -> public/widgets/
//   situs/lama/widgets/data/**    -> public/widgets/data/   ([[ID]] di nilai string diganti teks polos)
//   situs/data/cerita.json        -> public/widgets/data/cerita.json (dibaca widget peta cerita)
//   situs/lama/vendor/**          -> public/vendor/         (sql.js untuk runsql)
//   situs/lama/javascripts/*.js   -> public/javascripts/    (tooltip istilah)
//   situs/lama/assets/cerita/*.svg -> public/assets/cerita/ (ilustrasi)
// Font diunduh langsung ke public/fonts oleh tools/get_fonts.sh (tidak di-commit).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { LAMA, CERITA, ROOT, muat, tokenKeTeks } from "./registri.mjs";

const PUB = path.join(ROOT, "situs/public");
const d = muat();

function salinDir(dari, ke, filter = () => true, ubah = null) {
  fs.mkdirSync(ke, { recursive: true });
  for (const e of fs.readdirSync(dari, { withFileTypes: true })) {
    const a = path.join(dari, e.name), b = path.join(ke, e.name);
    if (e.isDirectory()) salinDir(a, b, filter, ubah);
    else if (filter(e.name)) {
      if (ubah && e.name.endsWith(".json")) fs.writeFileSync(b, ubah(fs.readFileSync(a, "utf8")));
      else fs.copyFileSync(a, b);
    }
  }
}

function gantiToken(teks) {
  if (!teks.includes("[[")) return teks;
  const ganti = (o) => typeof o === "string" ? tokenKeTeks(o, d) : Array.isArray(o) ? o.map(ganti)
    : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, ganti(v)])) : o;
  return JSON.stringify(ganti(JSON.parse(teks)));
}

// Skenario widget alur divalidasi sebelum disalin; gagal = build gagal.
execFileSync(process.execPath, [path.join(ROOT, "tools/validasi_skenario.mjs")], { stdio: "inherit" });

fs.rmSync(path.join(PUB, "widgets"), { recursive: true, force: true });
salinDir(path.join(LAMA, "widgets"), path.join(PUB, "widgets"), (n) => n.endsWith(".js") || n.endsWith(".json"), gantiToken);
// jalur_inti per tahap tidak disimpan di situs/data/cerita.json (keputusan 727: nilai tunggal yang bentrok di tiap
// merge halaman); dihitung di sini dari field per halaman (ada, inti, menit) yang sama dengan hitungan lama.
const cerita = JSON.parse(fs.readFileSync(CERITA, "utf8"));
for (const t of cerita.tahap) {
  const inti = cerita.halaman.filter((h) => h.tahap === t.no && h.ada && h.inti);
  t.jalur_inti = { menit: inti.reduce((s, h) => s + (h.menit || 0), 0), halaman: inti.length };
}
fs.writeFileSync(path.join(PUB, "widgets/data/cerita.json"), gantiToken(JSON.stringify(cerita, null, 2) + "\n"));
fs.rmSync(path.join(PUB, "vendor"), { recursive: true, force: true });
salinDir(path.join(LAMA, "vendor"), path.join(PUB, "vendor"));

// Tooltip istilah: data (dibuat tools/build_istilah.py) + skrip lama, dimuat apa adanya
fs.rmSync(path.join(PUB, "javascripts"), { recursive: true, force: true });
salinDir(path.join(LAMA, "javascripts"), path.join(PUB, "javascripts"), (n) => n.endsWith(".js"));

// Ilustrasi cerita (SVG dari tools/ilustrasi_cerita.py) dipakai halaman tahap: ../assets/cerita/*.svg -> /assets/cerita/
fs.rmSync(path.join(PUB, "assets/cerita"), { recursive: true, force: true });
if (fs.existsSync(path.join(LAMA, "assets/cerita"))) salinDir(path.join(LAMA, "assets/cerita"), path.join(PUB, "assets/cerita"));

const fonts = path.join(PUB, "fonts");
const ada = fs.existsSync(fonts) && fs.readdirSync(fonts).some((n) => n.endsWith(".woff2"));
if (!ada) console.warn("PERINGATAN: situs/public/fonts kosong; jalankan `bash tools/get_fonts.sh` di root repo. Situs memakai font fallback.");
console.log("aset siap: public/widgets, public/vendor" + (ada ? ", public/fonts" : ""));
