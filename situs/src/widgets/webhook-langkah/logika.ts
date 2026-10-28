// Logika murni widget webhook masuk langkah demi langkah (W4-webhook, keputusan 1258): model kecil dua handler (versi
// pertama dan ADR 34), pencocokannya dengan rekaman, nilai pengisi teks, dan mesin langkah (gulir dan tombol). Tanpa DOM.
// Model hanya memerankan apa yang terekam; build gagal bila model dan rekaman berbeda (periksaModel), jadi label
// "Rekaman lab" di widget tidak lebih kuat dari rekamannya.
import type { Acuan } from "./rekaman";
import type { HasilWebhook, LabelWebhook, JenisSumberWebhook, TandaWebhook } from "./skema";

export type Mode = "pertama" | "adr34";
export const MODE: readonly Mode[] = ["pertama", "adr34"];
export const ID_LANGKAH = ["buat", "kabar1", "ulang", "terlambat", "hilang", "cek", "rekon", "hasil"] as const;

// ---------------------------------------------------------------------------------------------------------------
// Model handler. Versi pertama (rentan webhook-v1): jurnal dari isi tiap kabar settlement, status ditulis tanpa syarat,
// tanpa tabel event. Versi ADR 34 (webhookAman): event_id kunci utama, status top-up hanya maju, kabar yang tidak maju
// diparkir. Kabar yang tidak berstatus settlement atau pending tidak diperankan.
export type StatusKabar = "pending" | "settlement";
export interface Kabar { id: string; status: StatusKabar }
export type Jawaban = "diproses" | "ganda" | "diparkir";
export interface BarisEvent { id: string; jenis: StatusKabar; hasil: "diproses" | "diparkir" }
export interface Keadaan { status: "menunggu" | "dibayar"; jurnal: number; event: BarisEvent[] }

export const AWAL: Keadaan = { status: "menunggu", jurnal: 0, event: [] };

/** Dua skenario yang direkam: kiriman yang sama dua kali (ganda.txt) dan pending sesudah settlement (urutan.txt F1). */
export const SKENARIO: Record<"ganda" | "terlambat", Kabar[]> = {
  ganda: [{ id: "evt-1", status: "settlement" }, { id: "evt-1", status: "settlement" }],
  terlambat: [{ id: "evt-f1", status: "settlement" }, { id: "evt-f2", status: "pending" }],
};

export function terima(mode: Mode, k: Keadaan, kabar: Kabar): { keadaan: Keadaan; jawaban: Jawaban } {
  if (mode === "pertama") {
    // Tanpa tabel event dan tanpa status bersyarat: settlement selalu menjurnal, status ditimpa isi kabar.
    if (kabar.status === "settlement") return { keadaan: { ...k, jurnal: k.jurnal + 1, status: "dibayar" }, jawaban: "diproses" };
    return { keadaan: { ...k, status: "menunggu" }, jawaban: "diproses" };
  }
  if (k.event.some((e) => e.id === kabar.id)) return { keadaan: k, jawaban: "ganda" }; // INSERT ... ON CONFLICT DO NOTHING: nol baris
  const catat = (hasil: "diproses" | "diparkir"): BarisEvent[] => [...k.event, { id: kabar.id, jenis: kabar.status, hasil }];
  if (kabar.status === "pending") {
    if (k.status === "dibayar") return { keadaan: { ...k, event: catat("diparkir") }, jawaban: "diparkir" }; // mundur dari status akhir
    return { keadaan: { ...k, event: catat("diproses") }, jawaban: "diproses" };
  }
  if (k.status === "dibayar") return { keadaan: { ...k, event: catat("diproses") }, jawaban: "ganda" }; // target sama dengan status
  return { keadaan: { ...k, jurnal: k.jurnal + 1, status: "dibayar", event: catat("diproses") }, jawaban: "diproses" };
}

export function jalankan(mode: Mode, kabar: Kabar[]): { keadaan: Keadaan; jawaban: Jawaban[]; sesudah: Keadaan[] } {
  let k = AWAL;
  const jawaban: Jawaban[] = [];
  const sesudah: Keadaan[] = [];
  for (const x of kabar) {
    const r = terima(mode, k, x);
    k = r.keadaan;
    jawaban.push(r.jawaban);
    sesudah.push(k);
  }
  return { keadaan: k, jawaban, sesudah };
}

// ---------------------------------------------------------------------------------------------------------------
export const fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
export const tampil = (n: number): string => fmt.format(n);
export const rp = (n: number): string => "Rp" + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
const daftarMenit = (a: number[]): string => a.map(tampil).join(", ");

/** Model dan rekaman harus sama; gagal keras bila lab berubah atau model salah memerankannya. */
export function periksaModel(a: Acuan): void {
  const gagal = (pesan: string): never => { throw new Error(`model webhook: ${pesan}`); };
  const sama = (nama: string, model: unknown, rekaman: unknown): void => {
    if (JSON.stringify(model) !== JSON.stringify(rekaman)) gagal(`${nama}: model ${JSON.stringify(model)}, rekaman ${JSON.stringify(rekaman)}`);
  };
  const kode = a.ganda.kirimA[0]!.split(" ")[0]!;
  const balas = (j: Jawaban[]): string[] => j.map((x) => `${kode} ${x}`);

  const gp = jalankan("pertama", SKENARIO.ganda);
  sama("ganda, versi pertama, jawaban", balas(gp.jawaban), a.ganda.kirimA);
  sama("ganda, versi pertama, jurnal", gp.keadaan.jurnal, a.ganda.jurnalA);
  sama("ganda, versi pertama, saldo naik", gp.keadaan.jurnal * a.ganda.bayar, a.ganda.saldoNaikA);

  const ga = jalankan("adr34", SKENARIO.ganda);
  sama("ganda, ADR 34, jawaban kiriman kedua", balas(ga.jawaban)[1], a.ganda.kirim2B);
  sama("ganda, ADR 34, baris event", ga.keadaan.event.length, a.ganda.eventBarisB);
  sama("ganda, ADR 34, event", ga.keadaan.event[0], { id: a.ganda.eventB.id, jenis: a.ganda.eventB.jenis, hasil: a.ganda.eventB.hasil });
  sama("ganda, ADR 34, jurnal", ga.keadaan.jurnal, a.ganda.eventB.adaJurnal ? 1 : 0);

  const tp = jalankan("pertama", SKENARIO.terlambat);
  sama("terlambat, versi pertama, status", tp.keadaan.status, a.terlambat.statusV1);

  const ta = jalankan("adr34", SKENARIO.terlambat);
  sama("terlambat, ADR 34, jawaban", balas(ta.jawaban)[1], a.terlambat.jawabF1);
  sama("terlambat, ADR 34, status", ta.keadaan.status, a.terlambat.statusF1);
  sama("terlambat, ADR 34, event", ta.keadaan.event.map((e) => ({ id: e.id, jenis: e.jenis, hasil: e.hasil })), a.terlambat.eventF1);
  sama("terlambat, ADR 34, jurnal tetap satu", ta.keadaan.jurnal, 1);

  // Sisa hubungan antar angka rekaman yang dipakai widget.
  sama("jadwal: jumlah jeda dan kiriman", a.hilang.jeda.length + 1, a.hilang.kirim401.n);
  sama("jadwal: total menit", a.hilang.jeda.reduce((s, x) => s + x, 0), a.hilang.total);
  sama("jadwal: menit tiap kiriman", a.hilang.jeda.reduce<number[]>((m, x) => [...m, m[m.length - 1]! + x], [0]), a.hilang.kirim401.menit);
  sama("retry A dan B: menit sama", a.hilang.menitB, a.hilang.kirim401.menit);
  sama("retry B: semua jawaban 401", a.hilang.jawabanB.every((x) => x === "401"), true);
  sama("retry B: tanpa event dan tanpa jurnal", [a.hilang.eventB, a.hilang.statusB], [0, "menunggu"]);
  sama("cek status: sebelum dan sesudah batas", a.hilang.cekA.map((c) => [c.umur < a.hilang.batasCek, c.diperiksa]), [[true, 0], [true, 0], [false, 1]]);
  sama("cek status: yang diperiksa dikredit", a.hilang.cekA[2]!.diperiksa, a.hilang.cekA[2]!.dikredit);
  sama("rekon: jumlah insiden", a.rekon.tidakDiLedger + a.rekon.tidakDiGateway + a.rekon.jumlahBeda, a.rekon.diperiksa);
  sama("rekon: koreksi", a.rekon.dikoreksi + a.rekon.tanpaJurnal + a.rekon.terbuka, a.rekon.diperiksa);
  sama("rekon: posting lama", a.rekon.postingLamaSama, true);
}

/** Nilai pengisi {placeholder} di teks, semuanya dari rekaman atau model (nilai dihitung model sudah dicocokkan periksaModel). */
export function nilaiTemplat(a: Acuan, adrHandler: number): Record<string, string> {
  periksaModel(a);
  const kode = a.ganda.kirimA[0]!.split(" ")[0]!;
  const gp = jalankan("pertama", SKENARIO.ganda);
  const ga = jalankan("adr34", SKENARIO.ganda);
  const tp = jalankan("pertama", SKENARIO.terlambat);
  const ta = jalankan("adr34", SKENARIO.terlambat);
  const e0 = ga.keadaan.event[0]!;
  const cekSesudah = a.hilang.cekA[2]!;
  const cekSebelum = a.hilang.cekA[1]!;
  return {
    adrHandler: String(adrHandler),
    bayar: rp(a.ganda.bayar),
    kode,
    event1: e0.id,
    awalBaris: tampil(AWAL.event.length),
    awalJurnal: tampil(AWAL.jurnal),
    jurnal1: tampil(gp.sesudah[0]!.jurnal),
    jurnalPertama: tampil(gp.keadaan.jurnal),
    naikPertama: rp(gp.keadaan.jurnal * a.ganda.bayar),
    kirim2Pertama: `${kode} ${gp.jawaban[1]}`,
    eventPertama: tampil(gp.keadaan.event.length),
    jurnalAdr: tampil(ga.keadaan.jurnal),
    kirim2Adr: `${kode} ${ga.jawaban[1]}`,
    eventAdr: tampil(ga.keadaan.event.length),
    eventAdrJenis: e0.jenis,
    eventAdrHasil: e0.hasil,
    statusPending: tp.keadaan.status,
    jawabTerlambatAdr: `${kode} ${ta.jawaban[1]}`,
    statusTerlambatAdr: ta.keadaan.status,
    eventTerlambatAdr: ta.keadaan.event.map((e) => `${e.id} ${e.jenis} ${e.hasil}`).join("; "),
    tanyaTerlambat: tampil(a.terlambat.tanyaF1),
    jadwal: `${a.hilang.jeda.slice(0, -1).map(tampil).join(", ")}, dan ${tampil(a.hilang.jeda[a.hilang.jeda.length - 1]!)}`,
    total: tampil(a.hilang.total),
    jamTotal: tampil(a.hilang.totalJamB),
    menitUlang1: tampil(a.hilang.jeda[0]!),
    kirimanN: tampil(a.hilang.kirim401.n),
    menitDaftar: daftarMenit(a.hilang.kirim401.menit),
    berhenti: a.hilang.berhentiB,
    kodeTolak: a.hilang.jawabanB[0]!,
    eventHilang: tampil(a.hilang.eventB),
    statusHilang: a.hilang.statusB,
    uangHilang: rp(a.hilang.uangB),
    batasCek: tampil(a.hilang.batasCek),
    umur1: tampil(cekSebelum.umur),
    periksa1: tampil(cekSebelum.diperiksa),
    umur2: tampil(cekSesudah.umur),
    periksa2: tampil(cekSesudah.diperiksa),
    kredit2: tampil(cekSesudah.dikredit),
    statusCek: a.hilang.statusA,
    barisLaporan: tampil(a.rekon.baris),
    insiden: tampil(a.rekon.diperiksa),
    tidakDiLedger: tampil(a.rekon.tidakDiLedger),
    tidakDiGateway: tampil(a.rekon.tidakDiGateway),
    jumlahBeda: tampil(a.rekon.jumlahBeda),
    dikoreksi: tampil(a.rekon.dikoreksi),
    tanpaJurnal: tampil(a.rekon.tanpaJurnal),
    terbuka: tampil(a.rekon.terbuka),
  };
}

/** Mengganti {nama}; nama yang tidak ada gagal keras. `dipakai` mencatat nama yang terpakai (deteksi nilai mati). */
export function isi(teks: string, nilai: Record<string, string>, dipakai?: Set<string>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    dipakai?.add(k);
    return nilai[k]!;
  });
}

// ---------------------------------------------------------------------------------------------------------------
export interface BarisSiap { label: string; nilai: string; tanda: TandaWebhook }
export interface SumberSiap { jenis: JenisSumberWebhook; chip: string; teks: string }
export interface HasilSiap { ringkas: string; baris: BarisSiap[]; sumber: SumberSiap[] }
export interface LangkahSiap { id: (typeof ID_LANGKAH)[number]; judul: string; teks: string; hasil: Record<Mode, HasilSiap> }
export interface TebakSiap { pertanyaan: string; pilihan: { teks: string; alasan: string }[]; benar: number }
export interface Siap {
  langkah: LangkahSiap[];
  mode: { id: Mode; teks: string }[];
  tebak: TebakSiap;
}

/** Menyusun semua teks yang dilihat pembaca. Dipanggil saat build (WebhookLangkah.astro) dan di tes. */
export function bangun(L: LabelWebhook, a: Acuan, adrHandler: number): Siap {
  const nilai = nilaiTemplat(a, adrHandler);
  const dipakai = new Set<string>();
  const f = (t: string, tambah: Record<string, string> = {}): string => isi(t, { ...nilai, ...tambah }, dipakai);
  const total = L.langkah.length;

  const ids = L.langkah.map((l) => l.id);
  if (JSON.stringify(ids) !== JSON.stringify([...ID_LANGKAH])) throw new Error(`urutan langkah salah: ${ids.join(", ")}`);

  const langkah: LangkahSiap[] = L.langkah.map((l, i) => {
    const susun = (m: Mode, h: HasilWebhook): HasilSiap => ({
      ringkas: f(L.statusLangkah, { n: String(i + 1), total: String(total), mode: f(L.modeKalimat[m]), ringkas: f(h.ringkas) }),
      baris: h.baris.map((b) => ({ label: f(b.label), nilai: f(b.nilai), tanda: b.tanda })),
      sumber: h.sumber.map((s) => ({
        jenis: s.jenis,
        chip: L.jenisChip[s.jenis],
        teks: s.jenis === "rekaman" ? `${s.berkas}, bagian ${s.bagian}. ${f(s.teks)}` : f(s.teks),
      })),
    });
    const h = l.hasil;
    const hasil = "semua" in h ? { pertama: susun("pertama", h.semua), adr34: susun("adr34", h.semua) } : { pertama: susun("pertama", h.pertama), adr34: susun("adr34", h.adr34) };
    return { id: l.id, judul: f(l.judul), teks: f(l.teks), hasil };
  });

  // Tebakan: jawaban benar = jumlah jurnal yang dihasilkan model versi pertama (sudah cocok dengan rekaman).
  const benarNilai = jalankan("pertama", SKENARIO.ganda).keadaan.jurnal;
  const pilihan = L.tebak.pilihan.map((p) => ({ nilai: p.nilai, teks: f(p.teks, { n: tampil(p.nilai) }), alasan: f(p.alasan, { n: tampil(p.nilai) }) }));
  const benar = L.tebak.pilihan.findIndex((p) => p.nilai === benarNilai);
  if (benar < 0 || L.tebak.pilihan.filter((p) => p.nilai === benarNilai).length !== 1) throw new Error("tebakan: tepat satu pilihan harus benar");

  const siap: Siap = {
    langkah,
    mode: MODE.map((m) => ({ id: m, teks: f(L.mode[m]) })),
    tebak: { pertanyaan: f(L.tebak.pertanyaan), pilihan: pilihan.map(({ teks, alasan }) => ({ teks, alasan })), benar },
  };
  // Teks label lain yang memuat {placeholder} ikut diperiksa supaya tak ada templat yang tidak pernah diisi.
  [L.judul, L.petunjuk, L.tebakDulu, L.benar, L.belum, L.ulang, L.ubahJudul, L.modeJudul, L.keadaanJudul, L.langkahJudul, L.berikutnya, L.sebelumnya, L.tanpaJs].forEach((t) => f(t));
  const mati = Object.keys(nilai).filter((k) => !dipakai.has(k));
  if (mati.length) throw new Error(`nilai pengisi tidak dipakai teks: ${mati.join(", ")}`);
  return siap;
}

// ---------------------------------------------------------------------------------------------------------------
// Mesin langkah: dari gulir dan dari tombol.
export const kelas = (i: number, n: number): number => Math.min(Math.max(i, 0), n - 1);
export const langkahBerikut = (i: number, n: number): number => kelas(i + 1, n);
export const langkahSebelum = (i: number, n: number): number => kelas(i - 1, n);
/** Langkah aktif karena gulir: yang terakhir dengan tepi atas di atas `garis` (px dari atas viewport), toleransi `longgar`. */
export function langkahDariGulir(tepiAtas: number[], garis: number, longgar = 8): number {
  let aktif = 0;
  tepiAtas.forEach((t, i) => { if (t <= garis + longgar) aktif = i; });
  return aktif;
}
