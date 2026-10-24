// Logika murni widget "Siapa yang ditunggu Bayar?" (M13, keputusan 810): tanpa DOM, dites Vitest.
// Langkah dan keadaan tiap sesi dibaca saat build dari rekaman labs/b4-skema/output/ledger/satu-langkah.txt (tanpa batas
// tunggu) dan lock-timeout.txt (dengan batas tunggu). Keadaan diturunkan dari kalimat hasil di rekaman, bukan ditulis
// tangan. Rekaman yang bentuknya berubah, urutan sesi yang berbeda, atau tabel pg_locks yang tidak cocok dengan keadaan
// hasil turunan menggagalkan build.

export type Sesi = "R" | "M" | "P1" | "P2";
export type Status = "belum" | "terbuka" | "menunggu" | "selesai" | "gagal" | "menyerah";

export interface Langkah {
  no: number;
  sesi: Sesi;
  perintah: string; // yang dikerjakan sesi itu, apa adanya dari rekaman
  hasil: string; // sesudah "->" di rekaman
}
export interface Keadaan {
  status: Status;
  belakang?: Sesi; // hanya untuk "menunggu": sesi yang ditunggu langsung (pg_blocking_pids)
  kode?: string; // SQLSTATE untuk "gagal" dan "menyerah"
}
export type Papan = Partial<Record<Sesi, Keadaan>>;
export interface Rekaman {
  tanpa: Langkah[]; // satu-langkah.txt, langkah 1-8
  dengan: Langkah[]; // lock-timeout.txt, langkah 1-5
  tabelLock: Partial<Record<Sesi, Sesi | null>>; // pg_locks di satu-langkah.txt: sesi -> di belakang
}

const SESI = ["R", "M", "P1", "P2"] as const;
const POLA_LANGKAH = /^\s*(\d+) \[(R|M|P1|P2)\] (.+)$/;
const POLA_HASIL = /^\s+-> (.+)$/;

/** Baca langkah 1..maks. Nomor harus berurutan dan tiap langkah punya baris hasil sesudahnya. */
export function bacaLangkah(teks: string, maks: number): Langkah[] {
  const baris = teks.split("\n");
  const hasil: Langkah[] = [];
  for (let i = 0; i < baris.length && hasil.length < maks; i++) {
    const m = baris[i]!.match(POLA_LANGKAH);
    if (!m) continue;
    const no = Number(m[1]);
    if (no !== hasil.length + 1) throw new Error(`rekaman: langkah ${no} muncul sesudah langkah ${hasil.length}, harus berurutan`);
    const h = (baris[i + 1] ?? "").match(POLA_HASIL);
    if (!h) throw new Error(`rekaman: langkah ${no} tidak punya baris hasil "->"`);
    hasil.push({ no, sesi: m[2] as Sesi, perintah: m[3]!.trim(), hasil: h[1]!.trim() });
  }
  if (hasil.length !== maks) throw new Error(`rekaman: butuh ${maks} langkah, ada ${hasil.length}`);
  return hasil;
}

/** Tabel pg_locks di satu-langkah.txt: kolom "di belakang" per sesi ("-" jadi null). */
export function bacaTabelLock(teks: string): Partial<Record<Sesi, Sesi | null>> {
  const baris = teks.split("\n");
  const kepala = baris.findIndex((b) => /^\s*sesi\s+\|\s+menunggu\s+\|\s+di belakang\s*$/.test(b));
  if (kepala < 0) throw new Error("rekaman: tabel pg_locks (sesi | menunggu | di belakang) tidak ada");
  const tabel: Partial<Record<Sesi, Sesi | null>> = {};
  for (const b of baris.slice(kepala + 2)) {
    const m = b.match(/^\s*(R|M|P1|P2)\s+\|\s+.+?\s+\|\s+(R|M|P1|P2|-)\s*$/);
    if (!m) break;
    tabel[m[1] as Sesi] = m[2] === "-" ? null : (m[2] as Sesi);
  }
  return tabel;
}

/** Keadaan satu sesi sesudah satu langkah, dari kalimat di rekaman. Kalimat yang tidak dikenal gagal keras. */
export function keadaanDari(l: Langkah): Keadaan {
  const tunggu = l.hasil.match(/^MENUNGGU \S+ pada .+, di belakang (R|M|P1|P2)$/);
  if (tunggu) return { status: "menunggu", belakang: tunggu[1] as Sesi };
  const galat = l.hasil.match(/^ERROR (\w{5}) /);
  if (galat) return galat[1] === "55P03" ? { status: "menyerah", kode: "55P03" } : { status: "gagal", kode: galat[1]! };
  if (l.perintah === "COMMIT" || /^COMMIT\b/.test(l.hasil)) return { status: "selesai" };
  if (/dibiarkan terbuka/.test(l.hasil)) return { status: "terbuka" };
  throw new Error(`rekaman: langkah ${l.no} [${l.sesi}] tidak dikenali: ${l.hasil}`);
}

/** Keadaan semua sesi sesudah n langkah pertama; sesi yang belum muncul tidak ada di papan. */
export function papanSesudah(langkah: Langkah[], n: number): Papan {
  const papan: Papan = {};
  for (const l of langkah.slice(0, n)) papan[l.sesi] = keadaanDari(l);
  return papan;
}

/** Sesi yang muncul di rekaman, dalam urutan R, M, P1, P2. */
export function sesiDi(langkah: Langkah[]): Sesi[] {
  return SESI.filter((s) => langkah.some((l) => l.sesi === s));
}

function samaUrutan(langkah: Langkah[], harap: Sesi[], nama: string) {
  const ada = langkah.map((l) => l.sesi).join(",");
  if (ada !== harap.join(",")) throw new Error(`${nama}: urutan sesi ${ada}, harusnya ${harap.join(",")}`);
}

function harapKeadaan(papan: Papan, sesi: Sesi, status: Status, kode: string | undefined, nama: string) {
  const k = papan[sesi];
  if (!k || k.status !== status || k.kode !== kode) {
    throw new Error(`${nama}: ${sesi} harusnya ${status}${kode ? ` ${kode}` : ""}, rekaman: ${k ? `${k.status}${k.kode ? ` ${k.kode}` : ""}` : "tidak ada"}`);
  }
}

/** Baca kedua rekaman dan periksa bentuk yang diandalkan halaman dan widget. */
export function bacaRekaman(satuLangkah: string, lockTimeout: string): Rekaman {
  const tanpa = bacaLangkah(satuLangkah, 8);
  const dengan = bacaLangkah(lockTimeout, 5);
  const tabelLock = bacaTabelLock(satuLangkah);

  samaUrutan(tanpa, ["R", "M", "P1", "P2", "R", "M", "P1", "P2"], "satu-langkah.txt");
  samaUrutan(dengan, ["R", "M", "P1", "M", "P1"], "lock-timeout.txt");

  // Antrean sesudah langkah 4 harus sama dengan tabel pg_locks di rekaman.
  const antre = papanSesudah(tanpa, 4);
  harapKeadaan(antre, "R", "terbuka", undefined, "satu-langkah.txt langkah 1");
  for (const s of ["M", "P1", "P2"] as const) {
    const k = antre[s];
    if (!k || k.status !== "menunggu") throw new Error(`satu-langkah.txt: ${s} harusnya menunggu sesudah langkah 4`);
    if (tabelLock[s] !== k.belakang) throw new Error(`satu-langkah.txt: ${s} di belakang ${k.belakang} di langkah, ${tabelLock[s]} di tabel pg_locks`);
  }
  if (tabelLock.R !== null) throw new Error("satu-langkah.txt: R tidak boleh menunggu siapa pun di tabel pg_locks");
  if (antre.M!.belakang !== "R") throw new Error("satu-langkah.txt: M harusnya di belakang R");
  if (antre.P1!.belakang !== "M" || antre.P2!.belakang !== "M") throw new Error("satu-langkah.txt: P1 dan P2 harusnya di belakang M");

  const akhir = papanSesudah(tanpa, 8);
  harapKeadaan(akhir, "R", "selesai", undefined, "satu-langkah.txt akhir");
  harapKeadaan(akhir, "M", "selesai", undefined, "satu-langkah.txt akhir");
  harapKeadaan(akhir, "P1", "gagal", "42703", "satu-langkah.txt akhir");
  harapKeadaan(akhir, "P2", "gagal", "42703", "satu-langkah.txt akhir");

  const batas = papanSesudah(dengan, 5);
  harapKeadaan(batas, "R", "terbuka", undefined, "lock-timeout.txt akhir");
  harapKeadaan(batas, "M", "menyerah", "55P03", "lock-timeout.txt akhir");
  harapKeadaan(batas, "P1", "selesai", undefined, "lock-timeout.txt akhir");
  if (papanSesudah(dengan, 3).P1?.belakang !== "M") throw new Error("lock-timeout.txt: P1 harusnya menunggu di belakang M");

  return { tanpa, dengan, tabelLock };
}

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}

export interface PilihanTebak { menunggu: Sesi | "-"; alasan: string }

/** Indeks pilihan yang benar: tepat satu pilihan yang menunjuk sesi yang ditunggu Bayar (P1) di rekaman, langkah 3. */
export function indeksBenar(pilihan: PilihanTebak[], tanpa: Langkah[]): number {
  const belakang = papanSesudah(tanpa, 3).P1?.belakang;
  if (!belakang) throw new Error("rekaman: P1 tidak menunggu di langkah 3");
  const cocok = pilihan.flatMap((p, i) => (p.menunggu === belakang ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan menunjuk ${belakang}, harus tepat satu`);
  return cocok[0]!;
}
