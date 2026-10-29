// Teks siap pakai widget "Circuit breaker interaktif" (W4-breaker, keputusan 1262): templat dari data/widget/t4-circuit-breaker.json
// diisi dengan angka rekaman. Dipakai CircuitBreaker.astro saat build dan di tes (acuan.test.ts, penjaga.test.ts), supaya yang
// dites persis yang tampil. Templat yang diisi di browser (vonis, ringkas, banding, papan) tidak diisi di sini: island mengisinya
// dari simulasi.
import type { LabelBreaker } from "./skema";
import { SIMULASI, type Rekaman, aturanDari, awalDari, daftarAcuan } from "./rekaman";
import { indeksBenar, isi, koma, ribuan, slotWorker, type AcuanDef, type Jalur, type Jenis, type Param, type Pulih } from "./logika";

export interface Opsi<T> { nilai: T; label: string }
export interface TeksSiap {
  pertanyaan: string;
  pilihan: { teks: string; alasan: string }[];
  benar: number;
  opsi: { jalur: Opsi<Jalur>[]; error: Opsi<number>[]; latensi: Opsi<number>[]; jenis: Opsi<Jenis>[]; breaker: Opsi<boolean>[]; pulih: Opsi<Pulih>[]; serentak: Opsi<number>[] };
  acuanTeks: Record<string, string>;
  namaAcuan: Record<string, string>;
  catatan: LabelBreaker["catatan"];
  hitungan: { judul: string; worker: string; bersama: string; label: string; dijeda: string; outage: string };
  asal: { judul: string; butir: string[] };
}

const tabel = (t: Record<string, number>, awalan: string): number =>
  Object.entries(t).filter(([k]) => k.startsWith(`${awalan} `)).reduce((j, [, v]) => j + v, 0);

/** Nilai yang boleh dipakai templat saat build: semuanya dari rekaman, kecuali pulihDetik (Simulasi). */
export function nilaiBuild(R: Rekaman): Record<string, string | number> {
  const L = R.lajur, W = R.worker, O = R.outage;
  return {
    n: L.pendaftar,
    percobaan: W.percobaan,
    lebihDari: R.breaker.lebihDari,
    gagalKe: R.breaker.gagalKe,
    buka: R.breaker.bukaDetik,
    versi: R.breaker.versi,
    empatBawaan: R.breaker.empatBawaan,
    empatKustom: R.breaker.empatKustom,
    mati: L.b.awal["mati 5"] ?? 0,
    menunggu: tabel(L.b.awal, "menunggu"),
    permintaan: L.a.permintaan,
    lulus: L.b.lulus,
    permintaanAkhir: L.b.permintaanAkhir,
    serentak: W.serentak,
    lulusC: L.c.lulus,
    rusak: L.d.rusak,
    sehat: L.pendaftar - L.d.rusak,
    matiE: tabel(L.e.akhir, "mati"),
    lulusE: L.e.lulus,
    permintaanE: L.e.permintaan,
    laju: koma(W.laju, 3),
    lajuUang: koma(W.lajuUang, 2),
    detikUang: koma(W.detikUang, 1),
    detik: W.detik,
    slot: koma(slotWorker(W.laju, W.percobaan, W.detik), 2),
    slotUang: koma(slotWorker(W.lajuUang, 1, W.detikUang), 2),
    bersama: koma(slotWorker(W.laju, W.percobaan, W.detik) + slotWorker(W.lajuUang, 1, W.detikUang), 1),
    kapasitas: W.kapasitas,
    timeoutClient: W.timeoutClient,
    pulihDetik: SIMULASI.pulihDetik,
    outageDetik: ribuan(O.detik),
    probe: O.probe,
    matiMaks: O.matiMaks,
    pekerjaan: O.pekerjaan,
  };
}

/** Isi hanya nama yang diketahui; nama lain (diisi island saat dijalankan) dibiarkan. */
export function isiSebagian(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (utuh, k: string) => (k in nilai ? String(nilai[k]) : utuh));
}

function ada<T>(daftar: { nilai: T }[], nilai: T): boolean {
  return daftar.some((o) => o.nilai === nilai);
}
/** Pengaturan awal dan setiap titik rekaman harus bisa dipilih lewat tombol; label angka harus sama dengan nilainya. */
export function periksaTombol(L: LabelBreaker, R: Rekaman): void {
  const dapat = (p: Param) =>
    ada(L.pilihNilai.jalur, p.jalur) && ada(L.pilihNilai.error, p.error) && ada(L.pilihNilai.latensi, p.latensi) && ada(L.pilihNilai.jenis, p.jenis) &&
    ada(L.pilihNilai.breaker, p.breaker) && ada(L.pilihNilai.pulih, p.pulih) && ada(L.pilihNilai.serentak, p.serentak);
  for (const d of [{ kunci: "awal", param: awalDari(R) }, ...daftarAcuan(R)]) {
    if (!dapat(d.param)) throw new Error(`CircuitBreaker: tombol untuk pengaturan ${d.kunci} (${JSON.stringify(d.param)}) tidak ada di data widget`);
  }
  for (const o of L.pilihNilai.error) if (o.label !== `${o.nilai}%`) throw new Error(`CircuitBreaker: label error "${o.label}" harus ${o.nilai}%`);
  for (const o of L.pilihNilai.serentak) if (o.label !== String(o.nilai)) throw new Error(`CircuitBreaker: label slot "${o.label}" harus sama dengan nilainya ${o.nilai}`);
  for (const o of L.pilihNilai.latensi) if (!o.label.startsWith(`${o.nilai} detik`)) throw new Error(`CircuitBreaker: label latensi "${o.label}" harus diawali "${o.nilai} detik"`);
  const a = aturanDari(R);
  if (L.pilihNilai.latensi.filter((o) => o.nilai > a.timeout).length < 1 || L.pilihNilai.latensi.filter((o) => o.nilai < a.timeout && o.nilai > 0).length < 1) {
    throw new Error("CircuitBreaker: latensi harus punya satu nilai di bawah timeout dan satu di atasnya");
  }
}

export function siapkanTeks(L: LabelBreaker, R: Rekaman, acuan: AcuanDef[] = daftarAcuan(R)): TeksSiap {
  aturanDari(R); // gagal keras bila rekaman saling bertentangan
  const v = nilaiBuild(R);
  const label = <T,>(daftar: Opsi<T>[]): Opsi<T>[] => daftar.map((o) => ({ nilai: o.nilai, label: isi(o.label, v) }));
  const banyakMati = R.lajur.b.awal["mati 5"] ?? 0;
  return {
    pertanyaan: isi(L.pertanyaan, v),
    pilihan: L.pilihan.map((p) => ({ teks: isi(p.teks, v), alasan: isi(p.alasan, v) })),
    benar: indeksBenar(L.pilihan, banyakMati),
    opsi: {
      jalur: label(L.pilihNilai.jalur), error: label(L.pilihNilai.error), latensi: label(L.pilihNilai.latensi), jenis: label(L.pilihNilai.jenis),
      breaker: label(L.pilihNilai.breaker), pulih: label(L.pilihNilai.pulih), serentak: label(L.pilihNilai.serentak),
    },
    acuanTeks: Object.fromEntries(acuan.map((d) => [d.kunci, isi(L.acuan[d.kunci as keyof LabelBreaker["acuan"]], v)])),
    namaAcuan: Object.fromEntries(acuan.map((d) => [d.kunci, isi(L.namaAcuan[d.kunci as keyof LabelBreaker["namaAcuan"]], v)])),
    catatan: Object.fromEntries(Object.entries(L.catatan).map(([k, t]) => [k, isi(t, v)])) as LabelBreaker["catatan"],
    hitungan: {
      judul: L.hitungan.judul,
      worker: isi(L.hitungan.worker, v),
      bersama: isi(L.hitungan.bersama, v),
      label: isi(L.hitungan.label, v),
      dijeda: L.hitungan.dijeda,
      outage: isi(L.hitungan.outage, v),
    },
    asal: { judul: L.asal.judul, butir: L.asal.butir.map((b) => isi(b, v)) },
  };
}
