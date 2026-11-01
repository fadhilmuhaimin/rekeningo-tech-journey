// Pembagian modul (Tahap 4, modul-tahap-4.json) dan service (Tahap 5, service-tahap-5.json) yang dibaca ErdHalaman.astro dan halaman uji
// (tools/erd.py menulis keduanya). Satu glob untuk kedua nama berkas: ErdHalaman hanya membaca `modul-tahap-*`, sehingga pembagian service
// Tahap 5 tidak pernah sampai ke halaman konten (tinjauan ERD5, keputusan 1673). modul.test.ts memeriksa bahwa setiap berkas di folder data terbaca.
import { ModulErd, type DataErd } from "./skema";
import { periksaModul } from "./tumbuh";

const berkas = import.meta.glob("../../data/erd/{modul,service}-tahap-*.json", { eager: true, import: "default" }) as Record<string, unknown>;

/** Nama berkas pembagian yang terbaca, terurut. */
export const BERKAS_PEMBAGIAN = Object.keys(berkas)
  .map((p) => p.split("/").pop()!)
  .sort();

/**
 * Pembagian modul atau service untuk tahap-tahap yang ditampilkan, menurut urutan `tahap`. Tahap tanpa pembagian dilewati. Build gagal bila
 * satu tahap punya kedua berkas, bila isi berkas bukan tahapnya, atau bila pembagiannya tidak cocok dengan ERD tahap itu (periksaModul).
 */
export function modulTahap(tahap: number[], data: DataErd[]): ModulErd[] {
  return tahap.flatMap((n) => {
    const isi = [berkas[`../../data/erd/modul-tahap-${n}.json`], berkas[`../../data/erd/service-tahap-${n}.json`]].filter((x) => x !== undefined);
    if (isi.length > 1) throw new Error(`Tahap ${n}: modul-tahap-${n}.json dan service-tahap-${n}.json ada bersamaan`);
    if (isi.length === 0) return [];
    const m = ModulErd.parse(isi[0]);
    const d = data.find((x) => x.tahap === n);
    if (!d || m.tahap !== n) throw new Error(`Tahap ${n}: pembagian ${m.istilah} berisi Tahap ${m.tahap}, ERD Tahap ${n} ${d ? "ada" : "tidak ada di data halaman"}`);
    periksaModul(d, m);
    return [m];
  });
}
