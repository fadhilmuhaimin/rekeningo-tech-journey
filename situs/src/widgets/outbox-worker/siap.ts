// Menyiapkan data island widget outbox dan worker saat build (W3-outbox, keputusan 983): menjalankan mesin
// (logika.ts) untuk setiap konfigurasi dan mengisi teks dari label (skema.ts). Island hanya mencari hasil yang sudah
// jadi, tanpa logika dan tanpa Zod. Dipisah dari .astro supaya tes membaca persis teks yang dilihat pembaca.
import {
  AWAL, GAGAL_SEBELUM_PULIH, KNOB, indeksBenar, isi, jalankan, jawabanTebak, kunciKonfig, nilaiTebak, rp, semuaKonfig, tampil,
  type Jenis, type Konfig, type Konstanta, type NamaSkenario, type Nilai, type Tanda,
} from "./logika";
import type { LabelOutbox } from "./skema";

export interface BarisAngka { label: string; nilai: string; tanda: Tanda }
export interface BarisGaris { waktu: string; lajur: string; teks: string; tanda: Tanda }
export interface HasilSiap {
  ringkas: string;
  angka: BarisAngka[];
  garis: BarisGaris[];
  acuan: { jenis: Jenis; label: string; teks: string };
}
export interface KnobSiap { id: string; label: string; opsi: { id: string; teks: string }[] }
export interface TebakSiap { pertanyaan: string; pilihan: { teks: string; alasan: string }[]; benar: number }
export interface SkenarioSiap {
  id: NamaSkenario;
  nama: string;
  tebak: TebakSiap;
  knob: KnobSiap[];
  awal: Konfig;
  hasil: Record<string, HasilSiap>;
}

export const NAMA: NamaSkenario[] = ["cara", "kursor", "ulang", "ganda", "antrean"];

const dariJenis = (jenis: string, nilai: number | boolean, L: LabelOutbox): string => {
  if (jenis === "yatidak") return nilai ? L.kata.ya : L.kata.tidak;
  if (typeof nilai !== "number") throw new Error(`angka ${jenis}: nilai ${String(nilai)} bukan angka`);
  if (jenis === "rupiah") return isi(L.satuan.rupiah, { n: rp(nilai) }, L.kata);
  const n = tampil(nilai);
  return isi(L.satuan[jenis as "jumlah" | "detik" | "persen" | "perdetik"], { n }, L.kata);
};

function labelOpsi(teks: string, id: string, L: LabelOutbox): string {
  const nilai: Nilai = { gagal: GAGAL_SEBELUM_PULIH };
  if (Number.isFinite(Number(id))) nilai.n = Number(id);
  return isi(teks, nilai, L.kata);
}

export function bangun(id: NamaSkenario, L: LabelOutbox, k: Konstanta): SkenarioSiap {
  const S = L.skenario[id];
  const knob: KnobSiap[] = KNOB[id].map((b) => {
    const lab = S.knob.find((x) => x.id === b.id);
    if (!lab) throw new Error(`${id}: label knob ${b.id} tidak ada`);
    return { id: b.id, label: lab.label, opsi: b.opsi.map((o) => ({ id: o, teks: labelOpsi(lab.opsi[o] ?? (() => { throw new Error(`${id}: label opsi ${b.id}=${o} tidak ada`); })(), o, L) })) };
  });
  const teksKonfig = (kf: Konfig): string => knob.map((b) => b.opsi.find((o) => o.id === kf[b.id])!.teks).join(", ");

  const hasil: Record<string, HasilSiap> = {};
  for (const kf of semuaKonfig(id)) {
    const h = jalankan(id, kf, k);
    const label = (kunci: string, dari: Record<string, string>, bagian: string): string => {
      const t = dari[kunci];
      if (t === undefined) throw new Error(`${id}: label ${bagian} "${kunci}" tidak ada`);
      return t;
    };
    const nilaiRingkas: Nilai = { ...h.ringkas.nilai, konfig: teksKonfig(kf) };
    hasil[kunciKonfig(id, kf)] = {
      ringkas: isi(label(h.ringkas.kunci, S.ringkas, "ringkas"), nilaiRingkas, L.kata),
      angka: S.angka.flatMap((a) => {
        const v = h.angka[a.kunci];
        return v === undefined ? [] : [{ label: a.label, nilai: dariJenis(a.jenis, v, L), tanda: h.tanda[a.kunci] ?? "netral" }];
      }),
      garis: h.garis.map((e) => ({
        waktu: isi(L.waktu[e.waktu.satuan], { n: e.waktu.n }, L.kata),
        lajur: L.lajur[e.lajur],
        teks: isi(label(e.kunci, S.peristiwa, "peristiwa"), e.nilai, L.kata),
        tanda: e.tanda,
      })),
      acuan: {
        jenis: h.acuan.jenis,
        label: L.jenisChip[h.acuan.jenis],
        teks: isi(L.acuan[h.acuan.jenis], { sumber: h.acuan.sumber }, L.kata),
      },
    };
  }

  const nt = nilaiTebak(id, k);
  const jawaban = jawabanTebak(id, k);
  const pilihan = S.tebak.pilihan.map((p) => ({
    teks: p.teks ?? isi(S.tebak.pilihanTeks ?? (() => { throw new Error(`${id}: pilihan tanpa teks dan tanpa pilihanTeks`); })(), { n: p.nilai }, L.kata),
    alasan: isi(p.alasan, nt, L.kata),
  }));
  return {
    id,
    nama: S.nama,
    tebak: { pertanyaan: isi(S.tebak.pertanyaan, nt, L.kata), pilihan, benar: indeksBenar(S.tebak.pilihan, jawaban) },
    knob,
    awal: AWAL[id],
    hasil,
  };
}

/** Teks label yang tidak dipakai mesin (mati) atau dibutuhkan mesin tetapi tidak ada gagal keras; dipanggil build dan tes. */
export function periksaLabel(L: LabelOutbox, k: Konstanta): void {
  for (const id of NAMA) {
    const S = L.skenario[id];
    const dipakai = { peristiwa: new Set<string>(), ringkas: new Set<string>(), angka: new Set<string>() };
    for (const kf of semuaKonfig(id)) {
      const h = jalankan(id, kf, k);
      h.garis.forEach((e) => dipakai.peristiwa.add(e.kunci));
      dipakai.ringkas.add(h.ringkas.kunci);
      Object.keys(h.angka).forEach((a) => dipakai.angka.add(a));
    }
    const mati = (nama: string, ada: string[], pakai: Set<string>): void => {
      const x = ada.filter((a) => !pakai.has(a));
      if (x.length) throw new Error(`${id}: label ${nama} tidak dipakai mesin: ${x.join(", ")}`);
    };
    mati("peristiwa", Object.keys(S.peristiwa), dipakai.peristiwa);
    mati("ringkas", Object.keys(S.ringkas), dipakai.ringkas);
    mati("angka", S.angka.map((a) => a.kunci), dipakai.angka);
    for (const b of KNOB[id]) {
      const lab = S.knob.find((x) => x.id === b.id);
      if (!lab) throw new Error(`${id}: label knob ${b.id} tidak ada`);
      const lebih = Object.keys(lab.opsi).filter((o) => !b.opsi.includes(o));
      if (lebih.length) throw new Error(`${id}: label opsi ${b.id} tanpa knob: ${lebih.join(", ")}`);
    }
    const knobLebih = S.knob.filter((x) => !KNOB[id].some((b) => b.id === x.id));
    if (knobLebih.length) throw new Error(`${id}: label knob tanpa mesin: ${knobLebih.map((x) => x.id).join(", ")}`);
    bangun(id, L, k); // semua teks terisi, tebakan tepat satu
  }
}
