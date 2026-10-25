// Pembaca rekaman lab t3-pool untuk widget "Kapan pool koneksi penuh?" (W3-pool, keputusan 980): tanpa DOM, dites Vitest.
// Dipakai saat build (PoolLittle.astro) dan di tes; island tidak memuat berkas ini. Semua angka acuan widget berasal dari
// labs/t3-pool/output/{m18,little,adr22}.txt. Rekaman yang berubah bentuk menggagalkan build: tiap pola di bawah harus
// cocok persis satu kali di bagiannya, dan angka yang saling bergantung (λ = 17,4 ÷ 20, hitungan L, "paling banyak")
// diperiksa silang.
import type { AcuanDef, Aturan, KunciAcuan, Param } from "./logika";

export interface Beban {
  lambda: number; // pembayaran per detik (Asumsi naskah bagian 3: 17,4 request per detik ÷ tiap request ke-20)
  rpsTotal: number; // request per detik semuanya
  tiap: number; // setiap request ke-`tiap` adalah pembayaran
  w0: number; // detik: W di luar push, Asumsi naskah 20 ms (rekaman hanya membuktikan di bawah 50 ms)
  batasWMs: number; // batas lab untuk W di luar push, milidetik
}
export interface PoolPenuh {
  ukuran: number;
  dari: number; // "antara detik ke-{dari} dan ke-{sampai}"
  sampai: number;
  hitungan: number; // ukuran ÷ λ, dibulatkan satu desimal di rekaman
  dikirim: number;
  menggantung: number;
  menunggu: number;
  detik: number; // waktu pengamatan akhir bagian
}
export interface TitikLittle {
  t: number; // detik push menjawab
  L: number; // hitungan di rekaman, tiga desimal
  paling: number; // koneksi terbuka paling banyak yang diukur
  ukuran: number;
}
export interface Rekaman {
  beban: Beban;
  a: PoolPenuh & { bacaTanpaJawab: number };
  b: PoolPenuh;
  c: { menyerah: number; puncak: number; ukuran: number };
  little: TitikLittle[];
  d: { timeoutPush: number; puncak: number; ukuran: number; keduaLebihDari: number };
  e: { idleTx: number; puncakPg: number; dipakai: number; maks: number };
  f: { bayar201: number; terbukaMaks: number };
}

const angka = (s: string): number => {
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) throw new Error(`rekaman t3-pool: "${s}" bukan angka`);
  return n;
};

/** Baris-baris satu bagian: dari "# --- {judul}" sampai "# --- " berikutnya. */
function bagian(teks: string, awalan: RegExp, nama: string): string[] {
  const baris = teks.split("\n");
  const i = baris.findIndex((b) => awalan.test(b));
  if (i < 0) throw new Error(`rekaman t3-pool: bagian ${nama} tidak ada`);
  let j = i + 1;
  while (j < baris.length && !baris[j]!.startsWith("# --- ")) j++;
  return baris.slice(i, j);
}

function lawan(baris: string[], pola: RegExp, nama: string): RegExpMatchArray {
  const cocok = baris.map((b) => b.match(pola)).filter((m): m is RegExpMatchArray => m !== null);
  if (cocok.length !== 1) throw new Error(`rekaman t3-pool: baris "${nama}" cocok ${cocok.length} kali, harus tepat satu`);
  return cocok[0]!;
}

function poolPenuh(b: string[], ukuran: number, nama: string): PoolPenuh {
  const p = lawan(b, /^pool (\d+) penuh antara detik ke-(\d+) dan ke-(\d+) sejak beban mulai \(hitungan (\d+) ÷ (\d,\d+) = (\d+,\d+)\)$/, `pool penuh ${nama}`);
  if (Number(p[1]) !== ukuran || Number(p[4]) !== ukuran) throw new Error(`rekaman t3-pool: ${nama} harusnya pool ${ukuran}`);
  const akhir = lawan(
    b,
    /^# Sesudah (\d+(?:,\d+)?) detik: (\d+) pembayaran dikirim, (\d+) belum dijawab(?:\. Di layanan push (\d+) permintaan menggantung, jadi (\d+) pembayaran menunggu koneksi di API\.|, (\d+) menggantung di layanan push, (\d+) menunggu koneksi\.)$/,
    `keadaan akhir ${nama}`,
  );
  const dikirim = Number(akhir[2]);
  const menggantung = Number(akhir[4] ?? akhir[6]);
  const menunggu = Number(akhir[5] ?? akhir[7]);
  if (menggantung + menunggu !== dikirim || Number(akhir[3]) !== dikirim) {
    throw new Error(`rekaman t3-pool: ${nama}: ${menggantung} menggantung + ${menunggu} menunggu harus sama dengan ${dikirim} dikirim dan belum dijawab`);
  }
  return { ukuran, dari: Number(p[2]), sampai: Number(p[3]), hitungan: angka(p[6]!), dikirim, menggantung, menunggu, detik: angka(akhir[1]!) };
}

export function bacaRekaman(m18: string, little: string, adr22: string): Rekaman {
  // --- m18.txt
  const A = bagian(m18, /^# --- A\. /, "A");
  const B = bagian(m18, /^# --- B\. /, "B");
  const C = bagian(m18, /^# --- C\. /, "C");
  const jadwal = lawan(A, /^# Beban dengan jadwal tetap, bukan acak: (\d+,\d+) request per detik \(Asumsi naskah bagian 3\)\. Request ke-(\d+), ke-\d+, dan seterusnya adalah pembayaran \((\d,\d+) per detik, 5%, Asumsi\)\.$/, "jadwal beban");
  const rpsTotal = angka(jadwal[1]!);
  const tiap = Number(jadwal[2]);
  const lambda = angka(jadwal[3]!);
  if (Math.abs(rpsTotal / tiap - lambda) > 1e-9) throw new Error(`rekaman t3-pool: ${rpsTotal} ÷ ${tiap} bukan ${lambda}`);

  const a = poolPenuh(A, 10, "A");
  const baca = lawan(A, /^# Pembacaan sesudah pool penuh \(request (\d+) sampai (\d+)\): (\d+) pembacaan: tanpa jawaban x(\d+)$/, "pembacaan sesudah penuh (A)");
  if (baca[3] !== baca[4]) throw new Error("rekaman t3-pool: A: semua pembacaan sesudah pool penuh harus tanpa jawaban");
  lawan(A, /^\{"dipakai":10,"maks":10,"terbuka":10\}$/, "/lab/pool A");
  const b = poolPenuh(B, 50, "B");
  lawan(B, /^\{"dipakai":50,"maks":50,"terbuka":50\}$/, "/lab/pool B");

  const cp = lawan(C, /^koneksi idle in transaction: puncak (\d+) dari (\d+) \(0,87 × (\d+) detik = (\d,\d+), jadi paling banyak (\d+)\)$/, "puncak (C)");
  const menyerah = lawan(C, /^# Client pembacaan menyerah sesudah 3 detik\. Client pembayaran menyerah sesudah (\d+) detik/, "client menyerah (C)");
  if (cp[1] !== cp[5] || cp[3] !== menyerah[1]) throw new Error("rekaman t3-pool: C: puncak, 'paling banyak', dan lama client menyerah harus cocok");
  const c = { menyerah: Number(menyerah[1]), puncak: Number(cp[1]), ukuran: Number(cp[2]) };

  // --- little.txt: tiga titik t
  const titik: TitikLittle[] = [];
  let w0 = NaN;
  let batasWMs = NaN;
  for (const [t, judul] of [["0,3", /^# --- t = 0,3 detik: /], ["2,0", /^# --- t = 2,0 detik: /], ["10,0", /^# --- t = 10,0 detik: /]] as const) {
    const bag = bagian(little, judul, `t = ${t}`);
    const head = lawan(bag, /^# --- t = (\d+,\d+) detik: layanan push menjawab sesudah (\d+) ms, pool (\d+), (\d,\d+) pembayaran per detik ---$/, `kepala t = ${t}`);
    const h = lawan(bag, /^hitungan: L = λ × W = (\d,\d+) × \((\d,\d+) \+ (\d+,\d+)\) = (\d+,\d+) koneksi$/, `hitungan t = ${t}`);
    const k = lawan(bag, /^koneksi dengan transaction terbuka: paling sedikit (\d+), paling banyak (\d+) dari (\d+)$/, `koneksi diukur t = ${t}`);
    const bw = lawan(bag, /^W dari data \(rata-rata satu pembayaran\): t ditambah kurang dari (\d+) ms untuk PostgreSQL dan HTTP \(batas lab; Asumsi naskah (\d+) ms\): ya$/, `batas W t = ${t}`);
    if (Number.isNaN(batasWMs)) batasWMs = Number(bw[1]);
    else if (Number(bw[1]) !== batasWMs) throw new Error("rekaman t3-pool: little: batas W berbeda antar titik");
    if (Number(bw[2]) / 1000 !== angka(h[2]!)) throw new Error("rekaman t3-pool: little: Asumsi W di luar push berbeda dari hitungan");
    const tt = angka(h[3]!);
    if (angka(head[1]!) !== tt || Number(head[2]) !== tt * 1000) throw new Error(`rekaman t3-pool: little t = ${t}: kepala dan hitungan tidak cocok`);
    if (angka(head[4]!) !== lambda || angka(h[1]!) !== lambda) throw new Error("rekaman t3-pool: little: λ berbeda dari m18.txt");
    const w = angka(h[2]!);
    if (Number.isNaN(w0)) w0 = w;
    else if (w !== w0) throw new Error("rekaman t3-pool: little: W di luar push berbeda antar titik");
    const L = angka(h[4]!);
    if (Math.abs(L - Math.round(lambda * (w0 + tt) * 1000) / 1000) > 1e-9) throw new Error(`rekaman t3-pool: little t = ${t}: L ${L} bukan ${lambda} × (${w0} + ${tt})`);
    titik.push({ t: tt, L, paling: Number(k[2]), ukuran: Number(k[3]) });
  }

  // --- adr22.txt: D, E, F
  const D = bagian(adr22, /^# --- D\. /, "D");
  const E = bagian(adr22, /^# --- E\. /, "E");
  const F = bagian(adr22, /^# --- F\. /, "F");
  const dp = lawan(D, /^koneksi idle in transaction: puncak (\d+) dari (\d+) \(0,87 × (\d+) detik = (\d,\d+), jadi paling banyak (\d+)\): pool tidak penuh$/, "puncak (D)");
  const dt = lawan(D, /^\$ \.\/api-t3 -rentan push-dalam-tx -push-timeout (\d+)s -lab /, "perintah (D)");
  const dk = lawan(D, /^pembayaran kedua: 201 sesudah lebih dari (\d+) detik /, "pembayaran kedua (D)");
  if (dp[1] !== dp[5] || dp[3] !== dt[1]) throw new Error("rekaman t3-pool: D: puncak dan timeout push harus cocok");
  const et = lawan(E, /^\$ \.\/api-t3 -rentan push-dalam-tx -idle-tx (\d+)s -lab /, "perintah (E)");
  const ep = lawan(E, /^di PostgreSQL: idle in transaction puncak (\d+) \(0,87 × (\d+) detik = (\d,\d+)\); sesi yang lebih tua dari (\d+) detik dihentikan PostgreSQL$/, "puncak di PostgreSQL (E)");
  if (ep[2] !== et[1] || ep[4] !== et[1]) throw new Error("rekaman t3-pool: E: batas idle-tx harus sama di perintah dan di puncak");
  const ed = lawan(E, /^\{"dipakai":(\d+),"maks":(\d+),"terbuka":\d+\}$/, "/lab/pool E");
  lawan(E, /^di Go: pool tetap penuh walau PostgreSQL sudah memutus sesinya\./, "pool Go tetap penuh (E)");
  if (ed[1] !== ed[2]) throw new Error("rekaman t3-pool: E: dipakai harus sama dengan maks");
  const f201 = lawan(F, /^pembayaran request 1 sampai \d+: (\d+) pembayaran: 201 x(\d+)$/, "pembayaran 201 (F)");
  const ft = lawan(F, /^transaction terbuka paling banyak (\d+) pada satu waktu /, "transaction terbuka (F)");
  if (f201[1] !== f201[2]) throw new Error("rekaman t3-pool: F: semua pembayaran harus 201");

  return {
    beban: { lambda, rpsTotal, tiap, w0, batasWMs },
    a: { ...a, bacaTanpaJawab: Number(baca[4]) },
    b,
    c,
    little: titik,
    d: { timeoutPush: Number(dt[1]), puncak: Number(dp[1]), ukuran: Number(dp[2]), keduaLebihDari: Number(dk[1]) },
    e: { idleTx: Number(et[1]), puncakPg: Number(ep[1]), dipakai: Number(ed[1]), maks: Number(ed[2]) },
    f: { bayar201: Number(f201[1]), terbukaMaks: Number(ft[1]) },
  };
}

/** Aturan simulasi dari rekaman: λ, W0, timeout push (D), dan batas idle-in-transaction (E). */
export function aturanDari(r: Rekaman): Aturan {
  return { lambda: r.beban.lambda, w0: r.beban.w0, timeoutPush: r.d.timeoutPush, idleTx: r.e.idleTx };
}

/** Pengaturan awal widget = bagian A: pool 10, push tidak menjawab, client tanpa batas, tanpa pengaman. */
export function awalDari(r: Rekaman): Param {
  return { n: r.a.ukuran, t: null, tClient: null, pengaman: "tidak" };
}

/** Pengaturan yang punya rekaman, dengan kunci yang dipakai templat acuan di data widget. */
export function daftarAcuan(r: Rekaman): AcuanDef[] {
  const awal = awalDari(r);
  const kunciL: Record<number, KunciAcuan> = { 0.3: "L03", 2: "L2", 10: "L10" };
  return [
    { kunci: "A", param: awal },
    { kunci: "B", param: { ...awal, n: r.b.ukuran } },
    { kunci: "C", param: { ...awal, n: r.c.ukuran, tClient: r.c.menyerah } },
    { kunci: "D", param: { ...awal, n: r.d.ukuran, pengaman: "timeout-push" } },
    { kunci: "E", param: { ...awal, pengaman: "idle-tx" } },
    { kunci: "F", param: { ...awal, pengaman: "di-luar" } },
    ...r.little.map((l) => {
      const kunci = kunciL[l.t];
      if (!kunci) throw new Error(`rekaman t3-pool: little t = ${l.t} tidak punya kunci acuan`);
      return { kunci, param: { ...awal, n: l.ukuran, t: l.t } };
    }),
  ];
}
