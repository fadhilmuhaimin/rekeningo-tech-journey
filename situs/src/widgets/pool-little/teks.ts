// Teks siap pakai widget pool dan Little's Law (W3-pool, keputusan 980): templat dari data/widget/t3-pool-little.json diisi
// dengan angka rekaman. Dipakai PoolLittle.astro saat build dan di tes (acuan.test.ts), supaya yang dites persis yang tampil.
// Templat yang dipakai di browser ({x}, {n}, {l}, ...) tidak diisi di sini: island mengisinya dari simulasi.
import type { LabelPool } from "./skema";
import type { Rekaman } from "./rekaman";
import { aturanDari, awalDari, daftarAcuan } from "./rekaman";
import { detikTeks, indeksBenar, isi, koma, type AcuanDef, type KunciAcuan, type Param } from "./logika";

export interface TeksSiap {
  pertanyaan: string;
  pilihan: { teks: string; alasan: string }[];
  benar: number;
  acuanTeks: Record<string, string>;
  catatan: { "timeout-push": string; "idle-tx": string; "di-luar": string; tClient: string };
  asal: { judul: string; butir: string[] };
}

function ada<T>(daftar: { nilai: T }[], nilai: T): boolean {
  return daftar.some((o) => o.nilai === nilai);
}

/** Pengaturan awal dan setiap titik rekaman harus bisa dipilih lewat tombol; selain itu build gagal. */
export function periksaTombol(L: LabelPool, r: Rekaman): void {
  const dapat = (p: Param) => ada(L.pilihNilai.n, p.n) && ada(L.pilihNilai.t, p.t) && ada(L.pilihNilai.tClient, p.tClient) && ada(L.pilihNilai.pengaman, p.pengaman);
  for (const d of [{ kunci: "awal", param: awalDari(r) }, ...daftarAcuan(r)]) {
    if (!dapat(d.param)) throw new Error(`PoolLittle: tombol untuk pengaturan ${d.kunci} (${JSON.stringify(d.param)}) tidak ada di data widget`);
  }
}

export function siapkanTeks(L: LabelPool, R: Rekaman, acuan: AcuanDef[] = daftarAcuan(R)): TeksSiap {
  const A = aturanDari(R);
  const lambda = koma(A.lambda, 2);
  const tebak = {
    lambda,
    n: awalDari(R).n,
    hitungan: koma(R.a.hitungan, 1),
    dari: R.a.dari,
    sampai: R.a.sampai,
    ukuranB: R.b.ukuran,
    penuhB: koma(R.b.hitungan, 1),
    bayar3: Math.floor(3 * A.lambda + 1e-9),
  };
  const little = (i: number) => ({ t: detikTeks(R.little[i]!.t), l: koma(R.little[i]!.L, 3), paling: R.little[i]!.paling, ukuran: R.little[i]!.ukuran });
  const nilai: Record<KunciAcuan, Record<string, string | number>> = {
    A: { ukuran: R.a.ukuran, dari: R.a.dari, sampai: R.a.sampai, lambda, hitungan: koma(R.a.hitungan, 1), detik: detikTeks(R.a.detik), dikirim: R.a.dikirim, menggantung: R.a.menggantung, menunggu: R.a.menunggu },
    B: { ukuran: R.b.ukuran, dari: R.b.dari, sampai: R.b.sampai, hitungan: koma(R.b.hitungan, 1), detik: detikTeks(R.b.detik), dikirim: R.b.dikirim, menggantung: R.b.menggantung, menunggu: R.b.menunggu },
    C: { menyerah: R.c.menyerah, puncak: R.c.puncak, ukuran: R.c.ukuran },
    D: { timeout: R.d.timeoutPush, puncak: R.d.puncak, ukuran: R.d.ukuran },
    E: { puncakPg: R.e.puncakPg, dipakai: R.e.dipakai, maks: R.e.maks },
    F: { terbuka: R.f.terbukaMaks },
    L03: little(0),
    L2: little(1),
    L10: little(2),
  };
  return {
    pertanyaan: isi(L.pertanyaan, tebak),
    pilihan: L.pilihan.map((p) => ({ teks: isi(p.teks, tebak), alasan: isi(p.alasan, tebak) })),
    benar: indeksBenar(L.pilihan, R.a.dari, R.a.sampai),
    acuanTeks: Object.fromEntries(acuan.map((d) => [d.kunci, isi(L.acuan[d.kunci], nilai[d.kunci])])),
    catatan: {
      "timeout-push": isi(L.catatan["timeout-push"], { kedua: R.d.keduaLebihDari, timeout: R.d.timeoutPush }),
      "idle-tx": isi(L.catatan["idle-tx"], { idle: R.e.idleTx, dipakai: R.e.dipakai, maks: R.e.maks }),
      "di-luar": isi(L.catatan["di-luar"], { bayar: R.f.bayar201, terbuka: R.f.terbukaMaks }),
      tClient: isi(L.catatan.tClient, { menyerah: R.c.menyerah, puncak: R.c.puncak }),
    },
    asal: {
      judul: L.asal.judul,
      butir: L.asal.butir.map((b) =>
        isi(b, { lambda, rps: koma(R.beban.rpsTotal, 1), tiap: R.beban.tiap, w0: koma(R.beban.w0, 2), batasW: R.beban.batasWMs, ukuranA: R.a.ukuran, ukuranB: R.b.ukuran, menyerah: R.c.menyerah }),
      ),
    },
  };
}
