// Logika murni widget jeda replica Tahap 5 (W5-lag): tanpa DOM, dites logika.test.ts.
// Model satu bacaan: Budi membayar di primary (COMMIT pada detik 0), replica memutar pembayaran itu `jeda` detik sesudahnya,
// dan app membaca `bacaDetik` detik sesudah jawaban bayar. Tiga aturan baca:
//   replica       : app membaca replica tanpa token. Replica sudah memuat pembayaran bila jeda <= bacaDetik.
//   token         : server membandingkan token dengan posisi replay replica. Replica dipakai bila sudah sampai, selain itu primary.
//   remote_apply  : COMMIT menunggu replica sinkron memutar WAL. Jawaban bayar baru datang sesudah jeda, jadi bacaan sesudahnya
//                   selalu melihat pembayaran itu; harganya waktu menunggu. Jeda ditahan = COMMIT tidak selesai.
// Jeda adalah Simulasi; hanya jeda ditahan yang punya rekaman (labs/t5-replika/output).
import type { Acuan, AturanId, DataLag, Jeda, Kasus, SumberBaca } from "./skema";

export type Hasil = { aturan: AturanId; sumber: SumberBaca; kasus: Kasus; saldo: number | null; baris: number | null; tunda: number | null };

export const isi = (templat: string, nilai: Record<string, string | number>): string =>
  templat.replace(/\{([a-z]+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diberi nilai`);
    return String(nilai[k]);
  });

/** Rupiah bulat dengan titik ribuan: 215000 -> "Rp215.000". */
export const rupiah = (n: number): string => `Rp${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

/** Detik dengan koma desimal: 0.5 -> "0,5", 2 -> "2". */
export const detikTeks = (n: number): string => String(n).replace(".", ",");

export const jedaDari = (d: DataLag, id: string): Jeda => {
  const j = d.jeda.find((x) => x.id === id);
  if (!j) throw new Error(`jeda ${id} tidak ada`);
  return j;
};
export const indeksJeda = (d: DataLag, id: string): number => d.jeda.findIndex((x) => x.id === id);
export const aturanDari = (d: DataLag, id: AturanId) => {
  const a = d.aturan.find((x) => x.id === id);
  if (!a) throw new Error(`aturan ${id} tidak ada`);
  return a;
};

/** Replica sudah memutar pembayaran saat bacaan terjadi: jeda terhingga dan tidak lebih lama dari selang bacaan. */
export const replicaSudah = (d: DataLag, j: Jeda): boolean => j.detik !== null && j.detik <= d.skenario.bacaDetik;

export const saldoBaru = (d: DataLag): number => d.skenario.saldoAwal - d.skenario.bayar;

export function hitung(d: DataLag, j: Jeda, aturan: AturanId): Hasil {
  const baru = { saldo: saldoBaru(d), baris: d.skenario.barisAwal + 1 };
  if (aturan === "remote_apply") {
    if (j.detik === null) return { aturan, sumber: "replica_sinkron", kasus: "macet", saldo: null, baris: null, tunda: null };
    return { aturan, sumber: "replica_sinkron", kasus: j.detik > 0 ? "tunda" : "sama", ...baru, tunda: j.detik };
  }
  const sudah = replicaSudah(d, j);
  if (aturan === "token") return { aturan, sumber: sudah ? "replica" : "primary", kasus: sudah ? "sama" : "keprimary", ...baru, tunda: null };
  return sudah
    ? { aturan, sumber: "replica", kasus: "sama", ...baru, tunda: null }
    : { aturan, sumber: "replica", kasus: "lama", saldo: d.skenario.saldoAwal, baris: d.skenario.barisAwal, tunda: null };
}

export const tundaTeks = (h: Hasil): string => (h.tunda === null ? "" : `${detikTeks(h.tunda)} detik`);

/** Isi sel "Layar Budi". */
export function layarTeks(d: DataLag, h: Hasil): string {
  if (h.saldo === null || h.baris === null) return d.label.layar.menunggu;
  return isi(d.label.layar.saldo, { saldo: rupiah(h.saldo), baris: h.baris });
}

/** Isi sel "Akibat". */
export const akibatTeks = (d: DataLag, h: Hasil): string => (h.kasus === "tunda" ? isi(d.label.akibat.tunda, { tunda: tundaTeks(h) }) : d.label.akibat[h.kasus]);

/** Satu kalimat untuk wilayah status: aturan, jeda, apa yang tampil di layar, dan dari mana. */
export function ringkasan(d: DataLag, j: Jeda, aturan: AturanId): string {
  const h = hitung(d, j, aturan);
  const L = d.label;
  return isi(L.ringkas[h.kasus], {
    aturan: aturanDari(d, aturan).label,
    jeda: j.kalimat,
    saldo: h.saldo === null ? "" : rupiah(h.saldo),
    sumber: L.sumberNama[h.sumber],
    primary: rupiah(saldoBaru(d)),
    tunda: tundaTeks(h),
  });
}

/** Kalimat jawaban tebakan sesudah pembaca memilih. */
export const jawabanTebak = (d: DataLag, pilih: number): string => `${pilih === d.tebak.jawaban ? d.label.benar : d.label.belum} ${d.tebak.alasan}`;

/** Rekaman dan Ilustrasi yang cocok dengan jeda dan aturan terpilih; acuan tanpa aturan berlaku untuk ketiganya. */
export const acuanUntuk = (d: DataLag, j: Jeda, aturan: AturanId): Acuan[] => d.acuan.filter((a) => a.jeda === j.id && (a.aturan === undefined || a.aturan === aturan));

/** Nilai aria-valuetext slider jeda. */
export const nilaiJeda = (d: DataLag, j: Jeda): string => isi(d.label.jeda.nilai, { jeda: j.label });
