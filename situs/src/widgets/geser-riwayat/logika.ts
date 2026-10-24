// Logika murni widget "Daftar bergeser saat kiriman baru masuk" (M12, keputusan 672): tanpa DOM, dites Vitest.
// Angka dibaca saat build dari rekaman labs/b2-query/output/ledger/pagination.txt (bagian A: dua halaman OFFSET dengan
// satu kiriman di sela keduanya, bagian B: baris kiriman itu, bagian C: seluruh riwayat Budi). Rekaman yang bentuknya
// berubah, atau yang hitungannya tidak sama dengan hitungan dari barisnya, menggagalkan build.

export interface BarisRiwayat {
  posting: number;
  jurnal: number;
  arah: "masuk" | "keluar";
  lawan: string;
  jumlah: string; // "Rp50.000", persis seperti di rekaman
}

export interface Skala {
  id: "dua-halaman" | "seluruh";
  barisPerHalaman: number;
  halaman: number;
  kiriman: number; // kiriman yang masuk di sela dua halaman
  tampil: number; // baris di layar sesudah semua halaman
  ganda: number; // baris yang tampil lebih dari sekali
  tidakTampil: number; // kiriman baru yang tidak ada di layar
}

export interface Geser {
  limit: number;
  halaman1: BarisRiwayat[]; // OFFSET 0
  kiriman: BarisRiwayat; // masuk sesudah halaman 1
  halaman2: BarisRiwayat[]; // OFFSET = limit, sesudah kiriman
  ganda: BarisRiwayat[]; // baris yang ada di halaman 1 dan halaman 2
  terlewat: number; // baris lama yang tidak tampil sama sekali, diukur lab di bagian C (seluruh riwayat)
  skala: Skala[]; // [dua-halaman, seluruh], cara OFFSET
}

export interface Hasil { ganda: number; kirimanTampil: boolean; terlewat: number }

export interface BarisDaftar extends BarisRiwayat { tanda: "baru" | "ganda" | null; diminta: boolean }

function bagian(teks: string, huruf: string): string[] {
  const baris = teks.split("\n");
  const mulai = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  if (mulai < 0) throw new Error(`pagination.txt: bagian ${huruf} tidak ada`);
  const akhir = baris.findIndex((b, i) => i > mulai && b.startsWith("# --- "));
  return baris.slice(mulai, akhir < 0 ? undefined : akhir);
}

/** Semua tabel hasil psql di satu bagian (header diawali " posting |"), berurutan, tiap baris sudah dipecah per kolom. */
function tabelPosting(baris: string[]): { kolom: string[]; isi: string[][] }[] {
  const hasil: { kolom: string[]; isi: string[][] }[] = [];
  for (let i = 0; i < baris.length; i++) {
    if (!/^\s*posting \|/.test(baris[i]!)) continue;
    const kolom = baris[i]!.split("|").map((x) => x.trim());
    const isi: string[][] = [];
    for (let j = i + 2; j < baris.length && !/^\(\d+ rows?\)$/.test(baris[j]!.trim()); j++) {
      isi.push(baris[j]!.split("|").map((x) => x.trim()));
    }
    hasil.push({ kolom, isi });
  }
  return hasil;
}

function ubahKeBaris(kolom: string[], sel: string[]): { baris: BarisRiwayat; catatan: string } {
  const k = (n: string) => {
    const i = kolom.indexOf(n);
    if (i < 0) throw new Error(`pagination.txt: kolom ${n} tidak ada`);
    return sel[i]!;
  };
  const arah = k("arah");
  if (arah !== "masuk" && arah !== "keluar") throw new Error(`pagination.txt: arah "${arah}" tidak dikenal`);
  return { baris: { posting: Number(k("posting")), jurnal: Number(k("jurnal")), arah, lawan: k("lawan"), jumlah: k("jumlah") }, catatan: k("catatan") };
}

/** Baca bagian A (dua halaman OFFSET), baris kiriman dari bagian B, dan angka seluruh riwayat dari bagian C. */
export function bacaGeser(teks: string): Geser {
  const A = bagian(teks, "A");
  const limitOffset = A.flatMap((b) => {
    const m = b.match(/LIMIT (\d+) OFFSET (\d+)/);
    return m ? [{ limit: Number(m[1]), offset: Number(m[2]) }] : [];
  });
  if (limitOffset.length !== 2) throw new Error(`pagination.txt: bagian A butuh dua query OFFSET, ada ${limitOffset.length}`);
  const [lo1, lo2] = limitOffset as [{ limit: number; offset: number }, { limit: number; offset: number }];
  if (lo1.offset !== 0 || lo2.offset !== lo1.limit || lo2.limit !== lo1.limit) {
    throw new Error("pagination.txt: halaman 2 harus OFFSET = LIMIT halaman 1");
  }
  const tabelA = tabelPosting(A);
  if (tabelA.length !== 2) throw new Error(`pagination.txt: bagian A butuh dua tabel, ada ${tabelA.length}`);
  const baca = (t: { kolom: string[]; isi: string[][] }) => t.isi.map((s) => ubahKeBaris(t.kolom, s));
  const b1 = baca(tabelA[0]!);
  const b2 = baca(tabelA[1]!);
  if (b1.length !== lo1.limit || b2.length !== lo1.limit) throw new Error("pagination.txt: jumlah baris halaman tidak sama dengan LIMIT");

  const dimas = A.map((b) => b.match(/^(\S+) mengirim (Rp[\d.]+) ke Budi: jurnal (\d+)\./)).find((m) => m);
  if (!dimas) throw new Error("pagination.txt: baris 'mengirim ... ke Budi: jurnal' tidak ada di bagian A");
  const jurnalKiriman = Number(dimas[3]);
  const B = tabelPosting(bagian(teks, "B"));
  const sel = B[0]?.isi.find((s) => Number(s[B[0]!.kolom.indexOf("jurnal")]) === jurnalKiriman);
  if (!B[0] || !sel) throw new Error(`pagination.txt: jurnal kiriman ${jurnalKiriman} tidak ada di tabel bagian B`);
  const kiriman = ubahKeBaris(B[0].kolom, sel).baris;
  if (kiriman.lawan !== dimas[1] || kiriman.jumlah !== dimas[2]) throw new Error("pagination.txt: baris kiriman di bagian B tidak cocok dengan kalimat bagian A");

  const halaman1 = b1.map((x) => x.baris);
  const halaman2 = b2.map((x) => x.baris);

  const id1 = new Set(halaman1.map((b) => b.posting));
  const ganda = halaman2.filter((b) => id1.has(b.posting));
  // Bendera "ganda" di kolom catatan rekaman harus sama dengan irisan yang dihitung dari barisnya.
  const bendera = b2.filter((x) => x.catatan === "ganda").map((x) => x.baris.posting);
  if (JSON.stringify(bendera) !== JSON.stringify(ganda.map((b) => b.posting))) throw new Error("pagination.txt: kolom catatan 'ganda' tidak sama dengan irisan halaman 1 dan 2");
  if (id1.has(kiriman.posting) || halaman2.some((b) => b.posting === kiriman.posting)) throw new Error("pagination.txt: kiriman ada di layar, bukan kasus M12");
  const berbeda = new Set([...halaman1, ...halaman2].map((b) => b.posting)).size;
  const kalimat = A.map((b) => b.match(/^Di layar: (\d+) baris, (\d+) posting berbeda\./)).find((m) => m);
  if (!kalimat || Number(kalimat[1]) !== 2 * lo1.limit || Number(kalimat[2]) !== berbeda) throw new Error("pagination.txt: kalimat 'Di layar' tidak sama dengan hitungan dari baris");

  const C = bagian(teks, "C");
  const barisPerHalamanC = Number(C[0]!.match(/(\d+) baris per halaman/)?.[1]);
  if (!barisPerHalamanC) throw new Error("pagination.txt: judul bagian C tidak menyebut baris per halaman");
  const barisOffset = C.map((b) => b.split("|").map((x) => x.trim())).find((s) => s[0] === "OFFSET");
  if (!barisOffset || barisOffset.length !== 7) throw new Error("pagination.txt: baris OFFSET di bagian C tidak ada atau bukan tujuh kolom");
  const [, halamanC, tampilC, gandaC, terlewatC, kirimanC, tidakTampilC] = barisOffset.map(Number) as [number, number, number, number, number, number, number];
  if (gandaC > kirimanC) throw new Error("pagination.txt: baris ganda lebih banyak dari kiriman");

  return {
    limit: lo1.limit,
    halaman1,
    kiriman,
    halaman2,
    ganda,
    terlewat: terlewatC,
    skala: [
      { id: "dua-halaman", barisPerHalaman: lo1.limit, halaman: 2, kiriman: 1, tampil: 2 * lo1.limit, ganda: ganda.length, tidakTampil: 1 },
      { id: "seluruh", barisPerHalaman: barisPerHalamanC, halaman: halamanC, kiriman: kirimanC, tampil: tampilC, ganda: gandaC, tidakTampil: tidakTampilC },
    ],
  };
}

/** Hasil di layar Budi sesudah dua halaman, dihitung dari baris rekaman (bukan dari teks). */
export function hasilLayar(g: Geser): Hasil {
  const layar = new Set([...g.halaman1, ...g.halaman2].map((b) => b.posting));
  return { ganda: g.ganda.length, kirimanTampil: layar.has(g.kiriman.posting), terlewat: g.terlewat };
}

/** Daftar di database sesudah kiriman masuk (kiriman dulu, lalu halaman 1, lalu baris baru halaman 2), dengan penanda. */
export function daftarSesudah(g: Geser): BarisDaftar[] {
  const urut = [g.kiriman, ...g.halaman1, ...g.halaman2.slice(g.ganda.length)];
  return urut.map((b, i) => ({
    ...b,
    tanda: b.posting === g.kiriman.posting ? "baru" : g.ganda.some((x) => x.posting === b.posting) ? "ganda" : null,
    diminta: i >= g.limit, // halaman 2 = OFFSET limit: posisi limit + 1 dan seterusnya
  }));
}

const bulat = new Intl.NumberFormat("id-ID");
export const angka = (n: number) => bulat.format(n);

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}

export interface PilihanTebak extends Hasil { teks: string; alasan: string }

/** Indeks pilihan yang benar: tepat satu pilihan yang hasilnya sama dengan hasil di layar. */
export function indeksBenar(pilihan: PilihanTebak[], hasil: Hasil): number {
  const cocok = pilihan.flatMap((p, i) => (p.ganda === hasil.ganda && p.kirimanTampil === hasil.kirimanTampil && p.terlewat === hasil.terlewat ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan cocok dengan hasil rekaman, harus tepat satu`);
  return cocok[0]!;
}
