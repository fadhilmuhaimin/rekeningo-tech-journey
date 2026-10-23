// Logika murni widget ERD bertumbuh (I6-erd, keputusan 460–465): dari JSON ERD per tahap (tools/erd.py) ke tabel
// yang ditampilkan (status baru/berubah/tetap/dihapus per tabel dan per kolom), tata letak node dan edge, tinggi
// yang dipesan sejak SSR, dan tautan halaman dari registry. Tanpa DOM dan tanpa React Flow; dites di tumbuh.test.ts.
// Komponen ErdTumbuh.tsx hanya menerjemahkan hasilnya ke node dan edge React Flow.
import type { DataErd, Kolom, PetaHalaman, Selisih, Tabel } from "./skema";
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
  baris: 24, // satu kolom (line-height tetap di CSS)
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

export const tinggiNode = (t: TabelTampil) =>
  UKURAN.kepala + (t.bayangan ? barisPindah(t) : t.kolom.length) * UKURAN.baris + UKURAN.bawah;

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
 * Tata letak untuk wadah selebar `lebar` px, pada zoom 1 (teks tidak pernah diperkecil).
 * - lebar (≥ 2 kolom): satu baris per peringkat (dipecah bila lebih dari jumlah kolom), edge dari atas tabel yang
 *   merujuk ke bawah tabel yang dirujuk; foreign key ke diri sendiri melingkar di kanan.
 * - sempit (1 kolom, HP): tabel bertumpuk dalam urutan baca, setiap edge berbelok di lajurnya sendiri di kiri; edge
 *   terpendek di lajur terdalam supaya garis tidak saling memotong di dekat node.
 */
export function tata(tabel: TabelTampil[], lebar: number): Tata {
  const U = UKURAN;
  const k = jumlahKolom(lebar);
  const grup = urutan(tabel);
  const fk = daftarFk(tabel);
  const node: TataNode[] = [];
  if (k === 1) {
    const lajurLebar = U.lajurAwal + Math.max(0, fk.length - 1) * U.lajur + U.bantalan;
    const w = Math.max(U.lebarMin, Math.min(U.lebar, lebar - lajurLebar - U.bantalan));
    let y = U.bantalan;
    for (const t of grup.flat()) {
      const h = tinggiNode(t);
      node.push({ nama: t.nama, x: lajurLebar, y, lebar: w, tinggi: h });
      y += h + U.jarakY / 2;
    }
    const posisi = new Map(node.map((n) => [n.nama, n]));
    const bentang = (f: { dari: string; ke: string }) => Math.abs(posisi.get(f.dari)!.y - posisi.get(f.ke)!.y);
    const edge = [...fk]
      .sort((a, b) => bentang(a) - bentang(b) || a.id.localeCompare(b.id))
      .map((f, i) => ({ ...f, sumber: "kiri-keluar", tujuan: "kiri-masuk", jenis: "smoothstep" as const, offset: U.lajurAwal + i * U.lajur, titik: [] }));
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
    const h = Math.max(...b.map(tinggiNode));
    b.forEach((t, i) => {
      node.push({ nama: t.nama, x: x0 + i * (U.lebar + U.jarakX), y, lebar: U.lebar, tinggi: tinggiNode(t) });
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
  const lajurSisi = new Map<string, { sisi: "kiri" | "kanan"; i: number }>();
  for (const sisi of ["kiri", "kanan"] as const) {
    lompat
      .filter((f) => sisiEdge.get(f.id) === sisi)
      .sort((a, b) => barisKe.get(a.dari)! - barisKe.get(a.ke)! - (barisKe.get(b.dari)! - barisKe.get(b.ke)!) || a.id.localeCompare(b.id))
      .forEach((f, i) => lajurSisi.set(f.id, { sisi, i }));
  }
  // Lajur yang tidak muat di ruang sisi bawaan menggeser grid (lebar tata bertambah; zoom < 1 bila wadah sempit).
  const n = (sisi: "kiri" | "kanan") => [...lajurSisi.values()].filter((l) => l.sisi === sisi).length;
  const perlu = (m: number) => (m ? U.lajurAwal + (m - 1) * U.lajur + 4 : 0);
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
    const yNaik = tepi[barisKe.get(f.dari)!].atas - U.belok - (l.i % 4) * 6;
    const yMasuk = tepi[barisKe.get(f.ke)!].bawah + U.belok + (l.i % 4) * 6;
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
