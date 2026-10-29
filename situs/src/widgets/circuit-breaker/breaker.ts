// Mesin keadaan circuit breaker untuk widget W4-breaker (keputusan 1262): tanpa DOM, tanpa jam sungguhan, tanpa Math.random.
// Jam diperankan: setiap metode menerima waktu dalam detik dari pemanggil. Perilakunya mengikuti sony/gobreaker v2.4.0
// dengan pengaturan bawaan (dibaca dari gobreaker.go di salinan modul lokal: currentState, beforeRequest, afterRequest,
// onSuccess, onFailure, setState) dan dipaku ke rekaman labs/t4-integrasi/output/breaker.txt di acuan.test.ts:
//   - closed: gagal berturut-turut lebih dari ambang (> 5) membuka breaker; satu sukses mengembalikan hitungan ke nol;
//   - open: semua permintaan ditolak tanpa memanggil vendor; sesudah Timeout (60 detik) keadaan menjadi half-open. Pustaka
//     memakai expiry.Before(now), jadi half-open mulai SESUDAH detik ke-60, bukan tepat pada detik ke-60 (dibaca dari
//     kode, tidak direkam: rekaman memeriksa 59,999 detik = open dan 60,001 detik = half-open);
//   - half-open: paling banyak satu permintaan berjalan; yang kedua ditolak; sukses menutup, gagal membuka lagi 60 detik penuh;
//   - hasil permintaan dari generasi lama (sebelum perpindahan keadaan) diabaikan.
// Jalur sinkron dengan breaker TIDAK dipasang di lab t4-integrasi (README lab, "Yang belum ada"): pemakaian di jalur itu
// adalah simulasi, bukan rekaman.

export type Status = "closed" | "open" | "half-open";

export interface PengaturanBreaker {
  gagalLebihDari: number; // ReadyToTrip bawaan: gagal berturut-turut LEBIH DARI angka ini (5)
  bukaDetik: number; // Timeout bawaan: lama open (60)
  maksHalfOpen: number; // MaxRequests bawaan: permintaan di half-open (1)
}
export interface Perpindahan { detik: number; dari: Status; ke: Status }
export type Izin = { ok: true; generasi: number } | { ok: false; sebab: "open" | "terlalu-banyak" };

export class Breaker {
  private status: Status = "closed";
  private kedaluwarsa = 0;
  private generasi = 0;
  private gagalBeruntun = 0;
  private permintaan = 0;
  private suksesBeruntun = 0;
  readonly perpindahan: Perpindahan[] = [];

  constructor(private readonly a: PengaturanBreaker) {
    const { gagalLebihDari: g, bukaDetik: b, maksHalfOpen: m } = a;
    if (!(Number.isInteger(g) && g >= 0 && Number.isFinite(b) && b > 0 && Number.isInteger(m) && m >= 1)) {
      throw new Error(`breaker: pengaturan tidak masuk akal (${JSON.stringify(a)})`);
    }
  }

  get gagalBerturut(): number { return this.gagalBeruntun; }
  get kaliBuka(): number { return this.perpindahan.filter((p) => p.ke === "open").length; }

  /** Keadaan pada `now`: open berganti menjadi half-open bila `now` SESUDAH kedaluwarsa (strict, seperti pustaka). */
  keadaan(now: number): Status {
    if (this.status === "open" && this.kedaluwarsa < now) this.ubah("half-open", now);
    return this.status;
  }

  /** Dipanggil sebelum vendor dihubungi. Ditolak: vendor tidak dihubungi. */
  sebelum(now: number): Izin {
    const s = this.keadaan(now);
    if (s === "open") return { ok: false, sebab: "open" };
    if (s === "half-open" && this.permintaan >= this.a.maksHalfOpen) return { ok: false, sebab: "terlalu-banyak" };
    this.permintaan++;
    return { ok: true, generasi: this.generasi };
  }

  /** Dipanggil saat jawaban (atau timeout) sampai. `berhasil` adalah penilaian IsSuccessful, bukan status HTTP. */
  sesudah(generasi: number, berhasil: boolean, now: number): void {
    const s = this.keadaan(now);
    if (generasi !== this.generasi) return;
    if (berhasil) {
      if (s === "closed") this.gagalBeruntun = 0;
      else if (s === "half-open") {
        this.suksesBeruntun++;
        this.gagalBeruntun = 0;
        if (this.suksesBeruntun >= this.a.maksHalfOpen) this.ubah("closed", now);
      }
    } else if (s === "closed") {
      this.gagalBeruntun++;
      if (this.gagalBeruntun > this.a.gagalLebihDari) this.ubah("open", now);
    } else if (s === "half-open") this.ubah("open", now);
  }

  private ubah(ke: Status, now: number): void {
    if (this.status === ke) return;
    this.perpindahan.push({ detik: now, dari: this.status, ke });
    this.status = ke;
    this.generasi++;
    this.gagalBeruntun = 0;
    this.permintaan = 0;
    this.suksesBeruntun = 0;
    this.kedaluwarsa = ke === "open" ? now + this.a.bukaDetik : 0;
  }
}

/** Bilangan acak deterministik di [0, 1) dari benih dan kunci (satu langkah mulberry32): sama masukan, sama keluaran. */
export function acak(benih: number, kunci: number): number {
  let t = (benih + Math.imul(kunci + 1, 0x9e3779b9)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
