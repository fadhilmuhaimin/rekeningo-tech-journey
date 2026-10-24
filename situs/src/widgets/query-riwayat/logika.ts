// Logika murni widget "Berapa query untuk satu riwayat?" (M11, keputusan 662): tanpa DOM, dites Vitest.
// Angka dibaca saat build dari rekaman labs/b2-query/output/ledger/n1.txt (bagian D jumlah query, bagian E waktu).
// Rekaman yang bentuknya berubah, atau jumlah query yang tidak sama dengan baris + 1, menggagalkan build.

export interface Permintaan {
  id: string;
  nama: string; // nama permintaan di rekaman, mis. "Riwayat Budi hal. 1"
  baris: number; // baris yang dikembalikan
  query: number; // query ke database, sama di hitungan client dan di log server
  ms: number; // median 5 kali di mesin lab, tanpa index riwayat (pembanding, bukan janji)
}

const SLUG: Record<string, string> = {
  "Riwayat Budi hal. 1": "halaman-1",
  "Laporan harian Ani": "laporan-ani",
  "Seluruh riwayat Budi": "seluruh",
};

function bagian(teks: string, huruf: string): string[] {
  const baris = teks.split("\n");
  const mulai = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  if (mulai < 0) throw new Error(`n1.txt: bagian ${huruf} tidak ada`);
  const akhir = baris.findIndex((b, i) => i > mulai && b.startsWith("# --- "));
  return baris.slice(mulai + 1, akhir < 0 ? undefined : akhir);
}

/** Baca cara N+1 dari bagian D dan E rekaman n1.txt. Urutan hasil = urutan permintaan di rekaman. */
export function bacaN1(teks: string): Permintaan[] {
  const d = new Map<string, { baris: number; client: number; log: number }>();
  for (const b of bagian(teks, "D")) {
    const m = b.match(/^\s*(.+?)\s+\|\s+N\+1\s+\|\s+(\d+)\s+\|\s+(\d+)\s+\|\s+(\d+)\s*$/);
    if (m) d.set(m[1]!, { baris: Number(m[2]), client: Number(m[3]), log: Number(m[4]) });
  }
  const e = new Map<string, number>();
  for (const b of bagian(teks, "E")) {
    const m = b.match(/^\s*(.+?)\s+\|\s+N\+1\s+\|\s+([\d.]+) ms\s+\|\s+([\d.]+) ms\s*$/);
    if (m) e.set(m[1]!, Number(m[2])); // kolom pertama = tanpa index riwayat
  }
  const hasil: Permintaan[] = [];
  for (const [nama, x] of d) {
    const ms = e.get(nama);
    const id = SLUG[nama];
    if (ms === undefined) throw new Error(`n1.txt: waktu "${nama}" tidak ada di bagian E`);
    if (!id) throw new Error(`n1.txt: permintaan "${nama}" tidak dikenal widget`);
    if (x.client !== x.log) throw new Error(`n1.txt: "${nama}" ${x.client} query di client, ${x.log} di log server`);
    if (x.client !== x.baris + 1) throw new Error(`n1.txt: "${nama}" ${x.client} query untuk ${x.baris} baris, harusnya baris + 1`);
    hasil.push({ id, nama, baris: x.baris, query: x.client, ms });
  }
  if (hasil.length !== 3) throw new Error(`n1.txt: widget butuh 3 permintaan N+1, ada ${hasil.length}`);
  return hasil;
}

const bulat = new Intl.NumberFormat("id-ID");
const satuDesimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const angka = (n: number) => bulat.format(n);
export const waktu = (ms: number) => `${satuDesimal.format(ms)} ms`;

/** Lebar batang dalam persen terhadap permintaan terbesar; minimal 2 supaya batang terkecil tetap terlihat. */
export function lebarBatang(query: number, maks: number): number {
  return Math.max(2, Math.round((query / maks) * 100));
}

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}

export interface PilihanTebak { query: number; alasan: string }

/** Indeks pilihan yang benar: tepat satu pilihan yang jumlah query-nya sama dengan rekaman. */
export function indeksBenar(pilihan: PilihanTebak[], query: number): number {
  const cocok = pilihan.flatMap((p, i) => (p.query === query ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan bernilai ${query}, harus tepat satu`);
  return cocok[0]!;
}
