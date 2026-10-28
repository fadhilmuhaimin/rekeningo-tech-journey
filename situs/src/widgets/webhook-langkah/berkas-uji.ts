// Pembantu tes widget webhook masuk (W4-webhook, keputusan 1258): membaca rekaman dan data widget dari repo.
// Bukan berkas tes dan bukan bagian bundel widget; hanya diimpor *.test.ts.
import fs from "node:fs";
import path from "node:path";
import type { Berkas } from "./rekaman";

export const akar = path.resolve(__dirname, "../../../..");
const bacaRekaman = (lab: string, f: string): string => fs.readFileSync(path.join(akar, "labs", lab, "output", f + ".txt"), "utf8");

export const asli = (): Berkas => ({
  ganda: bacaRekaman("t4-webhook", "ganda"),
  retry: bacaRekaman("t4-webhook", "retry"),
  urutan: bacaRekaman("t4-webhook", "urutan"),
  rekon: bacaRekaman("t4-webhook", "rekon"),
  rentan: bacaRekaman("api-t4", "rentan"),
});
export const labelMentah = (): unknown => JSON.parse(fs.readFileSync(path.join(akar, "situs/data/widget/t4-webhook-langkah.json"), "utf8"));
export const registri = (): { id: string; nomor?: string; adr?: number[] }[] =>
  (JSON.parse(fs.readFileSync(path.join(akar, "situs/data/cerita.json"), "utf8")) as { halaman: { id: string; nomor?: string; adr?: number[] }[] }).halaman;
