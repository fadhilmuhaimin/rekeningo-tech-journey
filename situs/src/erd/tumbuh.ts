// Logika murni widget ERD bertumbuh (I6-erd, keputusan 460–465): dari JSON ERD per tahap (tools/erd.py) ke tabel
// yang ditampilkan (status baru/berubah/tetap/dihapus per tabel dan per kolom), tata letak node dan edge, tinggi
// yang dipesan sejak SSR, dan tautan halaman dari registry. Tanpa DOM dan tanpa React Flow; dites di tumbuh.test.ts.
// Komponen ErdTumbuh.tsx hanya menerjemahkan hasilnya ke node dan edge React Flow.
import type { DataErd, Kolom, ModulErd, PetaHalaman, Selisih, Tabel } from "./skema";
import { kunciKolom, ringkasTipe, type Kunci } from "./erd";

// ── Status ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** null = tidak dibandingkan (tahap pertama, atau tahap kiri di mode bandingkan selain yang dihapus). */
export type Status = "baru" | "berubah" | "tetap" | "dihapus" | null;
export type Aturan = Selisih["aturan_berubah"][number];

export type KolomTampil = { kolom: Kolom; kunci: Kunci[]; status: Status; sebelum: Kolom | null };
export type TabelTampil = {
  nama: string;
  status: Status;
  tabel: Tabel; // untuk tabel dihapus: tabel di tahap sebelumnya
  kolom: KolomTampil[];
  aturan: Aturan[]; // aturan yang berubah di tabel ini
  pindahKe: string | null; // hanya tabel dihapus
  bayangan: boolean; // tabel dihapus yang ditampilkan di tahap sesudahnya (putus-putus, tanpa edge)
};

export const LABEL_STATUS: Record<Exclude<Status, null>, string> = { baru: "baru", berubah: "berubah", tetap: "tetap", dihapus: "dihapus" };

const kolomNama = (t: Tabel, nama: string) => t.kolom.find((k) => k.nama === nama) ?? null;

function cariTahap(semua: DataErd[], no: number): DataErd {
  const d = semua.find((x) => x.tahap === no);
  if (!d) throw new Error(`ERD Tahap ${no} tidak ada di data widget`);
  return d;
}

/**
 * Tabel satu tahap dengan status terhadap tahap sebelumnya (dari `selisih` yang dihitung tools/erd.py, bukan dihitung
 * ulang di sini). `bayangan` = tabel yang dihapus ikut tampil di akhir, putus-putus, dengan tujuan pindahnya.
 * Kolom yang dihapus dari tabel yang masih ada ikut tampil (dicoret) supaya perubahan terlihat di satu node.
 */
export function tampilTahap(semua: DataErd[], no: number, bayangan = true): TabelTampil[] {
  const d = cariTahap(semua, no);
  const s = d.selisih;
  if (!s) return d.tabel.map((t) => ({ nama: t.nama, status: null, tabel: t, kolom: t.kolom.map((k) => ({ kolom: k, kunci: kunciKolom(t, k.nama), status: null, sebelum: null })), aturan: [], pindahKe: null, bayangan: false }));
  const lalu = cariTahap(semua, s.terhadap);
  const hasil: TabelTampil[] = d.tabel.map((t) => {
    const baru = s.tabel_baru.includes(t.nama);
    const kb = new Set(s.kolom_baru.filter((x) => x.tabel === t.nama).map((x) => x.kolom));
    const ku = new Map(s.kolom_berubah.filter((x) => x.tabel === t.nama).map((x) => [x.kolom, x.sebelum]));
    const kh = s.kolom_dihapus.filter((x) => x.tabel === t.nama).map((x) => x.kolom);
    const aturan = s.aturan_berubah.filter((x) => x.tabel === t.nama);
    const kolom: KolomTampil[] = t.kolom.map((k) => ({
      kolom: k,
      kunci: kunciKolom(t, k.nama),
      status: baru ? "baru" : kb.has(k.nama) ? "baru" : ku.has(k.nama) ? "berubah" : "tetap",
      sebelum: ku.get(k.nama) ?? null,
    }));
    const tLalu = lalu.tabel.find((x) => x.nama === t.nama);
    for (const n of kh) {
      const k = tLalu && kolomNama(tLalu, n);
      if (!k || !tLalu) throw new Error(`ERD Tahap ${no}: kolom dihapus ${t.nama}.${n} tidak ada di Tahap ${s.terhadap}`);
      kolom.push({ kolom: k, kunci: kunciKolom(tLalu, n), status: "dihapus", sebelum: k });
    }
    const berubah = !baru && (kb.size > 0 || ku.size > 0 || kh.length > 0 || aturan.length > 0);
    return { nama: t.nama, status: baru ? "baru" : berubah ? "berubah" : "tetap", tabel: t, kolom, aturan, pindahKe: null, bayangan: false };
  });
  if (bayangan)
    for (const x of s.tabel_dihapus) {
      const t = lalu.tabel.find((y) => y.nama === x.nama);
      if (!t) throw new Error(`ERD Tahap ${no}: tabel dihapus ${x.nama} tidak ada di Tahap ${s.terhadap}`);
      hasil.push({ nama: t.nama, status: "dihapus", tabel: t, kolom: t.kolom.map((k) => ({ kolom: k, kunci: kunciKolom(t, k.nama), status: "dihapus", sebelum: k })), aturan: [], pindahKe: x.pindah_ke, bayangan: true });
    }
  return hasil;
}

/**
 * Seperti tampilTahap untuk satu halaman: tahap yang selisihnya merujuk tahap di luar data halaman (Tahap 3 di halaman yang
 * hanya memuat Tahap 3 dan 4) tampil tanpa status, karena pembandingnya tidak ada. tampilTahap tetap menolak data yang
 * tidak lengkap; fungsi ini hanya dipakai widget, supaya tombol tahap pertama tidak melempar galat dan melepas seluruh widget.
 */
export function tampilTahapHalaman(semua: DataErd[], no: number, bayangan = true): TabelTampil[] {
  const d = cariTahap(semua, no);
  const lengkap = !d.selisih || semua.some((x) => x.tahap === d.selisih!.terhadap);
  return tampilTahap(lengkap ? semua : semua.map((x) => (x === d ? { ...x, selisih: undefined } : x)), no, bayangan);
}

/** Sisi kiri mode bandingkan: tahap sebelumnya, dengan tabel dan kolom yang dihapus di tahap `no` ditandai. */
export function tampilSebelum(semua: DataErd[], no: number): TabelTampil[] {
  const s = cariTahap(semua, no).selisih;
  if (!s) throw new Error(`ERD Tahap ${no} tidak punya tahap sebelumnya untuk dibandingkan`);
  const lalu = cariTahap(semua, s.terhadap);
  const pindah = new Map(s.tabel_dihapus.map((x) => [x.nama, x.pindah_ke]));
  return lalu.tabel.map((t) => {
    const hapus = pindah.has(t.nama);
    const kh = new Set(s.kolom_dihapus.filter((x) => x.tabel === t.nama).map((x) => x.kolom));
    return {
      nama: t.nama,
      status: hapus ? "dihapus" : null,
      tabel: t,
      kolom: t.kolom.map((k) => ({ kolom: k, kunci: kunciKolom(t, k.nama), status: hapus || kh.has(k.nama) ? "dihapus" : null, sebelum: null })),
      aturan: [],
      pindahKe: pindah.get(t.nama) ?? null,
      bayangan: false,
    };
  });
}

/** Tahap yang punya selisih dan tahap sebelumnya ada di data: hanya tahap ini yang bisa dibandingkan. */
export const bisaBanding = (semua: DataErd[], no: number) => {
  const s = semua.find((x) => x.tahap === no)?.selisih;
  return !!s && semua.some((x) => x.tahap === s.terhadap);
};

// ── Tata letak ──────────────────────────────────────────────────────────────────────────────────────────────────

export const UKURAN = {
  lebar: 232, // lebar node di tata lebar
  lebarMin: 200, // node paling sempit di tata satu kolom
  kepala: 44, // nama tabel + status
  kepalaDua: 64, // nama tabel panjang: status pindah ke baris sendiri (ERD4, keputusan 1255)
  baris: 24, // satu kolom (line-height tetap di CSS)
  labelBaris: 20, // tambahan tinggi bila label kunci pindah ke baris sendiri di bawah nama kolom (ERD4, keputusan 1255)
  bawah: 8, // padding bawah node
  hurufPindah: 18, // huruf per baris teks "Isinya pindah ke ..." yang pasti muat di node tersempit (keputusan 466)
  jarakX: 32,
  jarakY: 48,
  lajurAwal: 14, // tata satu kolom: edge berbelok di lajur kiri, lajur pertama 14 px dari node
  lajur: 8, // jarak antarlajur
  bantalan: 8, // tepi di sekeliling tata (fitView padding 0)
  sisi: 30, // tata lebar: ruang di kiri dan kanan grid untuk edge yang melompati baris
  belok: 12, // tata lebar: jarak belokan edge yang melompati baris dari tepi baris
  maksKolom: 4,
  keluarY: 16, // tinggi handle "kiri-keluar" dari atas node (ErdTumbuh.tsx memakai angka yang sama)
  masukY: 30, // tinggi handle "kiri-masuk"
  celahLajur: 10, // jarak vertikal minimum antara dua garis yang memakai lajur yang sama
} as const;

export type Bentuk = "lebar" | "sempit";
export type TataNode = { nama: string; x: number; y: number; lebar: number; tinggi: number };
export type TataEdge = {
  id: string;
  dari: string;
  ke: string;
  sumber: string;
  tujuan: string;
  jenis: "default" | "smoothstep" | "jalur";
  offset: number;
  titik: [number, number][]; // hanya jenis "jalur": garis patah dari tabel yang merujuk ke tabel yang dirujuk
};
export type Tata = { bentuk: Bentuk; kolom: number; node: TataNode[]; edge: TataEdge[]; lebar: number; tinggi: number };

/** Teks di node tabel yang dihapus. */
export const teksPindah = (t: TabelTampil) => `Isinya pindah ke ${t.pindahKe}`;

/**
 * Banyak baris yang dipesan untuk teks pindah di node tabel dihapus (keputusan 466). Tata dihitung tanpa DOM, jadi
 * banyak baris diperkirakan dari panjang teks dengan huruf per baris yang muat di node tersempit (lebarMin, HP 320 px);
 * di node yang lebih lebar sisa barisnya kosong, tidak terpotong. Minimal dua baris.
 */
export const barisPindah = (t: TabelTampil) => Math.max(2, Math.ceil(teksPindah(t).length / UKURAN.hurufPindah));

/**
 * Lebar teks di node (px), dari metrik font di erd-tumbuh.css (ERD4, keputusan 1255). Tata dihitung tanpa DOM, jadi
 * muat atau tidaknya nama dan label di satu baris diperkirakan dari lebar huruf: nama kolom JetBrains Mono 13,6 px
 * (0,6 em per huruf, 8,16 px), nama tabel 15,2 px tebal (9,12 px), label 12 px dan status 12,8 px tebal (proporsional,
 * diukur di Chromium dengan Satoshi). Semua dibulatkan ke atas ±1% sampai 3%, supaya perkiraan yang meleset membuat satu baris
 * lebih tinggi dari perlunya, tidak memotong nama. ukur-erd.mjs gagal bila ada nama yang terpotong elipsis.
 */
export const METRIK = {
  hurufKolom: 8.25,
  hurufKepala: 9.2,
  label: { PK: 16, FK: 15.5, UNIQUE: 47, CHECK: 43 } as Record<string, number>,
  ubah: { baru: 28, berubah: 50, dihapus: 47, tetap: 31 } as Record<string, number>,
  jarakLabel: 4, // gap antarlabel (0,25 rem)
  jarakBaris: 6.4, // gap nama ke label (0,4 rem)
  jarakKepala: 8, // gap nama tabel ke status (0,5 rem)
  tepi: 22.2, // border 2 × 1,5 px + padding kiri dan kanan 2 × 9,6 px
} as const;

/** Lebar label di sebelah nama kolom: label kunci, lalu "baru" atau "dihapus" bila beda dari status tabelnya. */
export function lebarLabel(k: KolomTampil, t: TabelTampil): number {
  const bagian = k.kunci.map((x) => METRIK.label[x.jenis]);
  if (k.status && k.status !== "tetap" && k.status !== t.status) bagian.push(METRIK.ubah[k.status]);
  return bagian.reduce((a, b) => a + b, 0) + Math.max(0, bagian.length - 1) * METRIK.jarakLabel;
}

/** `acuan`: lebar node yang dipakai tata: UKURAN.lebar di tata lebar, UKURAN.lebarMin di tata satu kolom (HP). */
export function duaBaris(k: KolomTampil, t: TabelTampil, acuan: number): boolean {
  const label = lebarLabel(k, t);
  return label > 0 && k.kolom.nama.length * METRIK.hurufKolom + METRIK.jarakBaris + label > acuan - METRIK.tepi;
}

export function duaKepala(t: TabelTampil, acuan: number): boolean {
  const status = t.status ? METRIK.ubah[t.status] + METRIK.jarakKepala : 0;
  return t.nama.length * METRIK.hurufKepala + status > acuan - METRIK.tepi;
}

export const tinggiKepala = (t: TabelTampil, acuan: number) => (duaKepala(t, acuan) ? UKURAN.kepalaDua : UKURAN.kepala);

export const tinggiBaris = (k: KolomTampil, t: TabelTampil, acuan: number) => UKURAN.baris + (duaBaris(k, t, acuan) ? UKURAN.labelBaris : 0);

export const tinggiNode = (t: TabelTampil, acuan: number = UKURAN.lebar) =>
  tinggiKepala(t, acuan) +
  (t.bayangan ? barisPindah(t) * UKURAN.baris : t.kolom.reduce((n, k) => n + tinggiBaris(k, t, acuan), 0)) +
  UKURAN.bawah;

/** Foreign key yang digambar sebagai edge: dari tabel yang merujuk ke tabel yang dirujuk; tabel bayangan tanpa edge. */
export function daftarFk(tabel: TabelTampil[]) {
  const ada = new Set(tabel.filter((t) => !t.bayangan).map((t) => t.nama));
  return tabel.filter((t) => !t.bayangan).flatMap((t) => t.tabel.fk.filter((f) => ada.has(f.ke_tabel)).map((f) => ({ id: `${t.nama}.${f.nama}`, dari: t.nama, ke: f.ke_tabel })));
}

/** Banyak kolom grid yang muat pada zoom 1 di wadah selebar `lebar` px. */
export function jumlahKolom(lebar: number): number {
  const { lebar: w, jarakX, bantalan, sisi, maksKolom } = UKURAN;
  return Math.max(1, Math.min(maksKolom, Math.floor((lebar - 2 * (bantalan + sisi) + jarakX) / (w + jarakX))));
}

/** Lebar wadah paling kecil (px) untuk k kolom; dipakai CSS untuk memilih tinggi pesanan. */
export const ambangKolom = (k: number) => k * UKURAN.lebar + (k - 1) * UKURAN.jarakX + 2 * (UKURAN.bantalan + UKURAN.sisi);

/**
 * Peringkat: tabel tanpa foreign key ke tabel lain = 0, selain itu 1 + peringkat tertinggi tabel yang dirujuknya,
 * jadi tabel yang dirujuk selalu di atas yang merujuk. Foreign key ke diri sendiri tidak dihitung. Siklus antartabel
 * melempar error: build gagal dan tata baru dibuat, bukan menggambar panah yang naik-turun.
 */
export function peringkat(tabel: TabelTampil[]): Map<string, number> {
  const fk = daftarFk(tabel).filter((f) => f.dari !== f.ke);
  const r = new Map(tabel.filter((t) => !t.bayangan).map((t) => [t.nama, 0]));
  for (let i = 0; i <= r.size; i++) {
    let ubah = false;
    for (const f of fk) {
      const v = r.get(f.ke)! + 1;
      if (v > r.get(f.dari)!) {
        r.set(f.dari, v);
        ubah = true;
      }
    }
    if (!ubah) return r;
  }
  throw new Error("ERD: foreign key antartabel membentuk siklus; tata peringkat tidak cukup");
}

/** Urutan baca: per peringkat; di dalam peringkat, rata-rata posisi tabel yang dirujuk (barycenter), lalu urutan katalog. */
export function urutan(tabel: TabelTampil[]): TabelTampil[][] {
  const r = peringkat(tabel);
  const fk = daftarFk(tabel);
  const maks = Math.max(0, ...r.values());
  const pos = new Map<string, number>();
  const hasil: TabelTampil[][] = [];
  for (let p = 0; p <= maks; p++) {
    const isi = tabel.filter((t) => !t.bayangan && r.get(t.nama) === p);
    const bobot = (t: TabelTampil) => {
      const ke = fk.filter((f) => f.dari === t.nama && f.ke !== t.nama).map((f) => pos.get(f.ke)!);
      return ke.length ? ke.reduce((a, b) => a + b, 0) / ke.length : -1;
    };
    const urut = isi.map((t, i) => ({ t, i, b: bobot(t) })).sort((a, b) => a.b - b.b || a.i - b.i).map((x) => x.t);
    urut.forEach((t, i) => pos.set(t.nama, i));
    hasil.push(urut);
  }
  const bayangan = tabel.filter((t) => t.bayangan);
  if (bayangan.length) hasil.push(bayangan);
  return hasil;
}

/**
 * Lajur untuk garis yang berjalan di sisi yang sama (ERD3, keputusan 964). `butir` sudah diurutkan menurut prioritas
 * (terpendek dulu, jadi di lajur terdalam). Tiap garis mendapat lajur terkecil yang tidak dipakai garis lain yang
 * rentang tegaknya tumpang-tindih (jarak < `celah`); garis yang rentangnya terpisah memakai lajur yang sama. Tanpa ini
 * satu garis = satu lajur, dan skema dengan 20 foreign key (Tahap 3) melebarkan tata di HP sampai 382 px: teks
 * diperkecil jadi 0,75 di layar 320 px.
 *
 * `kelompok` (ERD4, keputusan 1255): garis dengan kelompok sama (foreign key ke tabel yang sama) memakai SATU lajur,
 * satu batang dengan cabang ke tiap tabel yang merujuk; rentang batangnya gabungan rentang anggotanya, dan urutan
 * prioritasnya mengikuti anggota pertama. Tahap 4 punya 35 foreign key dan 14 di antaranya menuju `akun`: satu lajur
 * per garis atau per rentang membuat tata satu kolom 438 px dan teks diperkecil jadi 0,66 di layar 320 px.
 */
export function bagiLajur(butir: { id: string; dari: number; ke: number; kelompok?: string }[], celah: number): Map<string, number> {
  const satuan: { a: number; z: number; id: string[] }[] = [];
  const kelompok = new Map<string, number>();
  for (const b of butir) {
    const [a, z] = b.dari <= b.ke ? [b.dari, b.ke] : [b.ke, b.dari];
    const ada = b.kelompok === undefined ? undefined : kelompok.get(b.kelompok);
    if (ada !== undefined) {
      satuan[ada].a = Math.min(satuan[ada].a, a);
      satuan[ada].z = Math.max(satuan[ada].z, z);
      satuan[ada].id.push(b.id);
      continue;
    }
    if (b.kelompok !== undefined) kelompok.set(b.kelompok, satuan.length);
    satuan.push({ a, z, id: [b.id] });
  }
  const lajur: [number, number][][] = [];
  const hasil = new Map<string, number>();
  for (const { a, z, id } of satuan) {
    let i = lajur.findIndex((l) => l.every(([a2, z2]) => z + celah < a2 || z2 + celah < a));
    if (i < 0) {
      i = lajur.length;
      lajur.push([]);
    }
    lajur[i].push([a, z]);
    for (const x of id) hasil.set(x, i);
  }
  return hasil;
}

/**
 * Tata letak untuk wadah selebar `lebar` px, pada zoom 1 (teks tidak pernah diperkecil).
 * - lebar (≥ 2 kolom): satu baris per peringkat (dipecah bila lebih dari jumlah kolom), edge dari atas tabel yang
 *   merujuk ke bawah tabel yang dirujuk; foreign key ke diri sendiri melingkar di kanan.
 * - sempit (1 kolom, HP): tabel bertumpuk dalam urutan baca, setiap edge berbelok di lajurnya sendiri di kiri; edge
 *   terpendek di lajur terdalam supaya garis tidak saling memotong di dekat node. Bila satu lajur per edge membuat
 *   tata lebih lebar dari wadah, edge yang rentang tegaknya terpisah berbagi lajur (bagiLajur); yang muat tidak berubah.
 */
export function tata(tabel: TabelTampil[], lebar: number): Tata {
  const U = UKURAN;
  const k = jumlahKolom(lebar);
  const grup = urutan(tabel);
  const fk = daftarFk(tabel);
  const node: TataNode[] = [];
  if (k === 1) {
    // Tinggi tidak bergantung pada lebar lajur, jadi posisi tegak dihitung dulu, lalu lajur, lalu lebar node.
    const atas = new Map<string, number>();
    let y = U.bantalan;
    for (const t of grup.flat()) {
      atas.set(t.nama, y);
      y += tinggiNode(t, U.lebarMin) + U.jarakY / 2;
    }
    const bentang = (f: { dari: string; ke: string }) => Math.abs(atas.get(f.dari)! - atas.get(f.ke)!);
    const urut = [...fk].sort((a, b) => bentang(a) - bentang(b) || a.id.localeCompare(b.id));
    const lajurSatu = U.lajurAwal + Math.max(0, fk.length - 1) * U.lajur + U.bantalan;
    const muat = lajurSatu + U.lebarMin + U.bantalan <= lebar;
    const lajurKe = muat
      ? new Map(urut.map((f, i) => [f.id, i]))
      : bagiLajur(urut.map((f) => ({ id: f.id, dari: atas.get(f.dari)! + U.keluarY, ke: atas.get(f.ke)! + U.masukY, kelompok: f.ke })), U.celahLajur);
    const nLajur = muat ? fk.length : Math.max(-1, ...lajurKe.values()) + 1;
    const lajurLebar = U.lajurAwal + Math.max(0, nLajur - 1) * U.lajur + U.bantalan;
    const w = Math.max(U.lebarMin, Math.min(U.lebar, lebar - lajurLebar - U.bantalan));
    for (const t of grup.flat()) node.push({ nama: t.nama, x: lajurLebar, y: atas.get(t.nama)!, lebar: w, tinggi: tinggiNode(t, U.lebarMin) });
    const edge = urut.map((f) => ({ ...f, sumber: "kiri-keluar", tujuan: "kiri-masuk", jenis: "smoothstep" as const, offset: U.lajurAwal + lajurKe.get(f.id)! * U.lajur, titik: [] }));
    return { bentuk: "sempit", kolom: 1, node, edge, lebar: lajurLebar + w + U.bantalan, tinggi: y - U.jarakY / 2 + U.bantalan };
  }
  const baris = grup.flatMap((g) => Array.from({ length: Math.ceil(g.length / k) }, (_, i) => g.slice(i * k, i * k + k)));
  const lebarBaris = (n: number) => n * U.lebar + (n - 1) * U.jarakX;
  const lebarTata = Math.max(...baris.map((b) => lebarBaris(b.length)));
  let kiri = U.bantalan + U.sisi;
  let y = U.bantalan;
  const barisKe = new Map<string, number>();
  const tepi: { atas: number; bawah: number }[] = [];
  baris.forEach((b, r) => {
    const x0 = kiri + (lebarTata - lebarBaris(b.length)) / 2;
    const h = Math.max(...b.map((t) => tinggiNode(t, U.lebar)));
    b.forEach((t, i) => {
      node.push({ nama: t.nama, x: x0 + i * (U.lebar + U.jarakX), y, lebar: U.lebar, tinggi: tinggiNode(t, U.lebar) });
      barisKe.set(t.nama, r);
    });
    tepi.push({ atas: y, bawah: y + h });
    y += h + U.jarakY;
  });
  // Edge ke baris tepat di atasnya hanya melewati celah antarbaris: kurva biasa. Edge yang melompati baris akan
  // tertutup node di baris antara (dan terlihat seperti keluar dari node itu), jadi ia dibelokkan: naik ke celah di
  // atas baris asal, keluar ke sisi grid terdekat, naik di lajur sisi, lalu masuk ke celah di bawah baris tujuan.
  // Lajur sisi berbeda per edge (bentang terpendek di dalam); belokan mendatar bergeser 6 px per lajur.
  const posisi = new Map(node.map((n) => [n.nama, n]));
  const tengah = kiri + lebarTata / 2;
  const lompat = fk.filter((f) => f.dari !== f.ke && barisKe.get(f.dari)! - barisKe.get(f.ke)! > 1);
  // Sisi terdekat dari tabel yang merujuk; bila satu sisi lebih dari satu lajur lebih banyak, edge yang paling dekat
  // ke tengah pindah ke sisi lain, supaya lajur muat di ruang sisi.
  const jarak = (f: { dari: string }) => posisi.get(f.dari)!.x + U.lebar / 2 - tengah;
  const sisiEdge = new Map(lompat.map((f) => [f.id, jarak(f) <= 0 ? ("kiri" as const) : ("kanan" as const)]));
  for (;;) {
    const di = (s: "kiri" | "kanan") => lompat.filter((f) => sisiEdge.get(f.id) === s);
    const [besar, kecil] = di("kiri").length > di("kanan").length ? (["kiri", "kanan"] as const) : (["kanan", "kiri"] as const);
    if (di(besar).length - di(kecil).length <= 1) break;
    const pindah = di(besar).sort((a, b) => Math.abs(jarak(a)) - Math.abs(jarak(b)) || a.id.localeCompare(b.id))[0];
    sisiEdge.set(pindah.id, kecil);
  }
  // `o` = urutan di sisinya (jitter tegak per edge); `i` = lajur. Satu edge satu lajur bila muat di ruang sisi bawaan;
  // bila tidak, edge yang rentang tegaknya terpisah berbagi lajur (bagiLajur, keputusan 964).
  const lajurSisi = new Map<string, { sisi: "kiri" | "kanan"; i: number; o: number }>();
  const perlu = (m: number) => (m ? U.lajurAwal + (m - 1) * U.lajur + 4 : 0);
  const urutSisi = (sisi: "kiri" | "kanan") =>
    lompat
      .filter((f) => sisiEdge.get(f.id) === sisi)
      .sort((a, b) => barisKe.get(a.dari)! - barisKe.get(a.ke)! - (barisKe.get(b.dari)! - barisKe.get(b.ke)!) || a.id.localeCompare(b.id));
  const muatSisi = (["kiri", "kanan"] as const).every((sisi) => perlu(urutSisi(sisi).length) <= U.bantalan + U.sisi);
  for (const sisi of ["kiri", "kanan"] as const) {
    const urut = urutSisi(sisi);
    const rentang = urut.map((f, o) => ({
      id: f.id,
      dari: tepi[barisKe.get(f.ke)!].bawah + U.belok + (o % 4) * 6, // yMasuk
      ke: tepi[barisKe.get(f.dari)!].atas - U.belok - (o % 4) * 6, // yNaik
      kelompok: f.ke,
    }));
    const lajur = muatSisi ? new Map(urut.map((f, o) => [f.id, o])) : bagiLajur(rentang, U.celahLajur);
    urut.forEach((f, o) => lajurSisi.set(f.id, { sisi, i: lajur.get(f.id)!, o }));
  }
  // Lajur yang tidak muat di ruang sisi bawaan menggeser grid (lebar tata bertambah; zoom < 1 bila wadah sempit).
  const n = (sisi: "kiri" | "kanan") => Math.max(-1, ...[...lajurSisi.values()].filter((l) => l.sisi === sisi).map((l) => l.i)) + 1;
  const tambahKiri = Math.max(0, perlu(n("kiri")) - (U.bantalan + U.sisi));
  const tambahKanan = Math.max(0, perlu(n("kanan")) - (U.bantalan + U.sisi));
  if (tambahKiri) for (const x of node) x.x += tambahKiri;
  kiri += tambahKiri;
  const edge: TataEdge[] = fk.map((f) => {
    if (f.dari === f.ke) return { ...f, sumber: "kanan-keluar", tujuan: "kanan-masuk", jenis: "smoothstep", offset: U.jarakX / 2 - 2, titik: [] };
    const l = lajurSisi.get(f.id);
    if (!l) return { ...f, sumber: "atas", tujuan: "bawah", jenis: "default", offset: 0, titik: [] };
    const a = posisi.get(f.dari)!;
    const b = posisi.get(f.ke)!;
    const xa = a.x + a.lebar / 2;
    const xb = b.x + b.lebar / 2;
    const yNaik = tepi[barisKe.get(f.dari)!].atas - U.belok - (l.o % 4) * 6;
    const yMasuk = tepi[barisKe.get(f.ke)!].bawah + U.belok + (l.o % 4) * 6;
    const xLajur = l.sisi === "kiri" ? kiri - U.lajurAwal - l.i * U.lajur : kiri + lebarTata + U.lajurAwal + l.i * U.lajur;
    return {
      ...f,
      sumber: "atas",
      tujuan: "bawah",
      jenis: "jalur",
      offset: 0,
      titik: [[xa, a.y], [xa, yNaik], [xLajur, yNaik], [xLajur, yMasuk], [xb, yMasuk], [xb, b.y + b.tinggi]],
    };
  });
  return { bentuk: "lebar", kolom: k, node, edge, lebar: lebarTata + kiri + U.bantalan + U.sisi + tambahKanan, tinggi: y - U.jarakY + U.bantalan };
}

/**
 * Tinggi wadah yang dipesan sejak SSR (pola varPesan di diagram/tata.ts, keputusan 248): server belum tahu lebar
 * wadah, jadi tinggi untuk 1 sampai maksKolom kolom dikirim sebagai variabel CSS, dan erd-tumbuh.css memilih dengan
 * ambang lebar container yang sama dengan jumlahKolom(). Tata sempit dihitung pada lebar terkecil yang mungkin
 * (tingginya tidak bergantung pada lebar, karena baris kolom tidak pernah membungkus).
 */
export function varPesan(tabel: TabelTampil[]): Record<`--${string}`, string> {
  const v: Record<`--${string}`, string> = {};
  let lalu = 0;
  for (let k = 1; k <= UKURAN.maksKolom; k++) {
    const t = tata(tabel, k === 1 ? 0 : ambangKolom(k)).tinggi;
    if (k === 1) v["--erd-t1"] = `${t}px`;
    else {
      v[`--erd-a${k}`] = `${ambangKolom(k)}px`;
      v[`--erd-d${k}`] = String(t - lalu);
    }
    lalu = t;
  }
  return v;
}

// ── Teks ────────────────────────────────────────────────────────────────────────────────────────────────────────

const JENIS_ATURAN: Record<Aturan["jenis"], string> = { pk: "PK", fk: "FK", unik: "UNIQUE", cek: "CHECK", index: "INDEX" };
const UBAH_ATURAN: Record<Aturan["ubah"], string> = { baru: "baru", dihapus: "dihapus", berubah: "berubah" };
export const teksAturan = (a: Aturan) => `${JENIS_ATURAN[a.jenis]}${a.jenis === "pk" ? "" : ` ${a.nama}`} ${UBAH_ATURAN[a.ubah]}`;

/** Satu kolom sebagai teks: nama, tipe, kunci, boleh kosong, perubahan. Dipakai versi statis dan panel detail. */
export function teksKolom(k: KolomTampil): string {
  const bagian = [ringkasTipe(k.kolom.tipe), ...k.kunci.map((x) => x.teks)];
  if (!k.kolom.wajib) bagian.push("boleh kosong");
  if (k.status === "baru" || k.status === "dihapus") bagian.push(k.status);
  if (k.status === "berubah" && k.sebelum) bagian.push(`berubah dari ${ringkasTipe(k.sebelum.tipe)}${k.sebelum.wajib ? "" : ", boleh kosong"}${k.sebelum.bawaan ? `, bawaan ${k.sebelum.bawaan}` : ""}`);
  return bagian.join(", ");
}

/** Nama yang dibacakan untuk tombol node: nama tabel, status, banyak kolom. Isi lengkap ada di versi statis dan detail. */
export function namaTombol(t: TabelTampil): string {
  const status = t.status ? `, ${LABEL_STATUS[t.status]}` : "";
  return t.bayangan ? `Tabel ${t.nama}${status}, isinya pindah ke ${t.pindahKe}` : `Tabel ${t.nama}${status}, ${t.kolom.length} kolom`;
}

/** Ringkasan satu tampilan untuk pembaca layar: banyak tabel per status. */
export function ringkasan(tabel: TabelTampil[]): string {
  const n = (s: Status) => tabel.filter((t) => t.status === s).length;
  const fk = daftarFk(tabel).length;
  const bagian = (["baru", "berubah", "tetap", "dihapus"] as const).filter((s) => n(s) > 0).map((s) => `${n(s)} ${LABEL_STATUS[s]}`);
  const ada = tabel.filter((t) => !t.bayangan).length;
  return `${ada} tabel, ${fk} foreign key${bagian.length ? ` (${bagian.join(", ")})` : ""}.`;
}

// ── Tautan dari registry ────────────────────────────────────────────────────────────────────────────────────────

// "halaman ini": halaman yang sedang dibaca, tanpa tautan ke dirinya sendiri (ErdHalaman.astro, keputusan 697).
export type Tautan = { label: string; href: string | null; catatan: "segera" | "versi lama" | "halaman ini" | null };
export type HalamanRegistry = { id: string; judul: string; nomor?: string; ada?: boolean; lama?: boolean; path: string };
export type TautanTahap = Record<string, Record<string, Tautan[]>>;

/**
 * ID halaman di peta (situs/data/erd/halaman.json) ke label dan tautan dari registry. Halaman yang belum ditulis
 * tanpa tautan ("segera", pola keputusan 450). ID yang tidak ada di registry atau tabel yang tidak ada di ERD
 * tahapnya melempar error, jadi build gagal.
 */
export function tautanHalaman(peta: PetaHalaman, semua: DataErd[], halaman: HalamanRegistry[], url: (h: HalamanRegistry) => string): TautanTahap {
  const by = new Map(halaman.map((h) => [h.id, h]));
  const hasil: TautanTahap = {};
  for (const [no, isi] of Object.entries(peta.tahap)) {
    const d = semua.find((x) => x.tahap === Number(no));
    if (!d) continue;
    hasil[no] = {};
    for (const [tabel, ids] of Object.entries(isi)) {
      if (!d.tabel.some((t) => t.nama === tabel)) throw new Error(`peta halaman ERD: tabel ${tabel} tidak ada di Tahap ${no}`);
      hasil[no][tabel] = ids.map((id) => {
        const h = by.get(id);
        if (!h) throw new Error(`peta halaman ERD: halaman ${id} tidak ada di registry`);
        const label = h.nomor ? `${h.nomor} ${h.judul}` : h.judul;
        return { label, href: h.ada ? url(h) : null, catatan: !h.ada ? "segera" : h.lama ? "versi lama" : null };
      });
    }
  }
  return hasil;
}

/**
 * Tautan ke halaman yang sedang dibaca diganti teks tanpa tautan, "(halaman ini)": di 1.12 tabel akun dijelaskan di
 * 1.12 sendiri (keputusan 697). Path dibandingkan apa adanya (registry dan Astro.url sama-sama berakhiran "/").
 */
export function tandaiHalamanIni(tautan: TautanTahap, path: string): TautanTahap {
  return Object.fromEntries(
    Object.entries(tautan).map(([no, isi]) => [
      no,
      Object.fromEntries(Object.entries(isi).map(([tabel, daftar]) => [tabel, daftar.map((t) => (t.href === path ? { ...t, href: null, catatan: "halaman ini" as const } : t))])),
    ]),
  );
}

// ── Pembagian modul (ERD4, keputusan 1254) ─────────────────────────────────────────────────────────────────────

/** Modul pemilik satu tabel, atau null bila tahap ini tidak punya pembagian modul. */
export const modulTabel = (m: ModulErd | undefined, tabel: string): string | null => m?.modul.find((x) => x.tabel.includes(tabel))?.nama ?? null;

/**
 * Foreign key yang menyeberang batas modul, dihitung dari ERD tahap itu dan pembagian modulnya (padanan hitung_modul()
 * di tools/erd.py). Urutan: tabel menurut katalog, lalu foreign key menurut nama.
 */
export function lintasModul(d: DataErd, m: ModulErd): ModulErd["lintas"] {
  return d.tabel.flatMap((t) =>
    t.fk.flatMap((f) => {
      const dari = modulTabel(m, t.nama);
      const ke = modulTabel(m, f.ke_tabel);
      return dari !== null && ke !== null && dari !== ke ? [{ tabel: t.nama, fk: f.nama, ke_tabel: f.ke_tabel, dari_modul: dari, ke_modul: ke }] : [];
    }),
  );
}

/** Build gagal bila pembagian modul tidak cocok dengan ERD-nya: semua tabel tepat sekali, foreign key lintas sama. */
export function periksaModul(d: DataErd, m: ModulErd): void {
  if (m.tahap !== d.tahap) throw new Error(`modul Tahap ${m.tahap} dipasang di ERD Tahap ${d.tahap}`);
  const ada = m.modul.flatMap((x) => x.tabel);
  const tabel = d.tabel.map((t) => t.nama);
  if (ada.length !== new Set(ada).size || [...ada].sort().join() !== [...tabel].sort().join())
    throw new Error(`modul Tahap ${d.tahap}: tabel di pembagian modul tidak sama dengan tabel ERD (${ada.length} lawan ${tabel.length})`);
  if (JSON.stringify(lintasModul(d, m)) !== JSON.stringify(m.lintas))
    throw new Error(`modul Tahap ${d.tahap}: foreign key lintas modul tidak sama dengan hitungan dari ERD`);
}

/** Satu kalimat untuk tabel pembagian modul: banyak tabel, banyak modul, dan ke mana foreign key menyeberang. */
export function ringkasModul(m: ModulErd): string {
  const tabel = m.modul.reduce((n, x) => n + x.tabel.length, 0);
  const ke = new Map<string, number>();
  for (const x of m.lintas) ke.set(x.ke_modul, (ke.get(x.ke_modul) ?? 0) + 1);
  const rinci = [...ke].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([nama, n]) => `${n} ke modul ${nama}`);
  return `${m.modul.length} modul, ${tabel} tabel; ${m.lintas.length} foreign key menyeberang batas modul${rinci.length ? ` (${rinci.join(", ")})` : ""}.`;
}
