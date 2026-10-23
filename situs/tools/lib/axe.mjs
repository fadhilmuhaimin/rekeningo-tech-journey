// Sumber axe-core satu-satunya untuk alat ukur (G-axe, keputusan 692, 693): paket devDependency yang dipin persis di
// situs/package.json dan bun.lock, bukan file axe.min.js lokal tanpa versi. Disuntik ke halaman dengan
// page.addScriptTag({ path: AXE_PATH }) lalu dijalankan dengan runOnly tag TAG_WCAG.
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const AXE_PATH = require.resolve("axe-core/axe.min.js");
export const AXE_VERSI = JSON.parse(fs.readFileSync(require.resolve("axe-core/package.json"), "utf8")).version;
// Versi yang dipin: alat gagal bila node_modules berisi versi lain (bun install belum diulang sesudah naik versi).
export const AXE_PIN = JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8")).devDependencies["axe-core"];

// WCAG 2.0, 2.1, 2.2 tingkat A dan AA. Di axe-core 4.14.0 rule target-size (SC 2.5.8) bertanda enabled:false dan hanya
// jalan bila tag wcag22aa diminta lewat runOnly (ruleShouldRun memakai matchTags tanpa memeriksa enabled; RISET-SKILL 12).
export const TAG_WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

// Untuk alat lama yang axe-nya opsional (ukur-diagram, ukur-erd, ukur-gerak, audit-tampilan):
//   --axe            paket terpasang          --axe <file>   file lain, mis. versi uji
//   AXE=1            paket terpasang          AXE=<file>     file lain
// Tanpa keduanya: undefined, axe dilewati seperti sebelumnya.
export function pilihAxe(argv = process.argv, env = process.env) {
  const i = argv.indexOf("--axe");
  if (i > -1) {
    const v = argv[i + 1];
    return v && !v.startsWith("--") ? v : AXE_PATH;
  }
  if (env.AXE) return env.AXE === "1" ? AXE_PATH : env.AXE;
  return undefined;
}
