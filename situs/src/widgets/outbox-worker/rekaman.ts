// Pembaca rekaman labs/t3-outbox/output/*.txt untuk widget outbox dan worker (W3-outbox, keputusan 983).
// Semua angka acuan widget datang dari sini. Rekaman yang bentuknya berubah, atau baris yang hilang atau ganda,
// menggagalkan build (lab gagal keras, widget ikut). Tanpa DOM; dites rekaman.test.ts dengan pembaca kedua yang
// ditulis terpisah.

export interface Berkas {
  transaksi: string;
  kursor: string;
  ganda: string;
  retry: string;
  queue: string;
}

export interface Acuan {
  transaksi: {
    pushTimeout: number; // detik, header "push timeout 3s"
    pushSebelumWorker: number; // A
    pushSesudahWorker: number; // A
    workerSaatBelumCommit: number; // B: worker berjalan sementara transaction terbuka (diklaim)
    workerSesudahCommit: number; // B
    rollback: { jurnal: number; outbox: number }; // C
    commitDitolak: { sqlstate: string; jurnal: number; outbox: number }; // D
    apiMati: { statusSebelum: string; percobaanSebelum: number; statusSesudah: string; percobaanSesudah: number }; // F
  };
  kursor: {
    berurutanPesan: number; // A: baris outbox terkirim
    terbalikKursorPesan: number; // B
    terbalikKlaimPesan: number; // C
    saldoNaik: number; // B (Rp)
    nominal: number; // B (Rp per transfer)
  };
  ganda: {
    klaim: number; // detik, A "klaim 5 detik (bawaan)"
    matiPesan: number; // A
    matiId: number; // A
    klaimPendek: number; // detik, B "Klaim 300 ms"
    pushLambat: number; // detik, B
    pendekPesan: number; // B
    duaHpPesan: number; // D
    duaHp: number; // D "dua HP"
    duaHpDitundaA: number; // D "worker A: diklaim 1, ditunda 1"
    penyaringDiterima: number; // C
    penyaringTampil: number; // C
  };
  retry: {
    batasBackoff: number[]; // A: "paling lama N detik lagi" per putaran
    backoffMaks: number; // detik, komentar A "maksimum 60 detik"
    batasA: number; // A: percobaan saat status mati
    statusA: string;
    permintaanA: number;
    pesanMati: number; // C
    percobaanMati: number; // C: percobaan baris sesudah klaim ke-6
    klaimMati: number; // C: "klaim 6"
    statusMati: string; // C
  };
  queue: {
    c: number; // A "c ÷ t = 4 ÷ 0,3 = 13,33"
    t: number;
    kapasitas: number; // 13,33 (dibulatkan dua desimal oleh lab)
    kapasitasBawah: number; // 12
    nPromo: number; // B
    persen30Bawah: number; // C 3,4
    persen30Atas: number; // C 4,2
    uangMenunggu30: number; // C "paling sedikit 30 detik"
    habisDetik: number; // C "= 750 detik"
    perluPerDetik: number; // C ±317
    putaranUang: number; // E "2 × 0,3 detik": panjang satu putaran (detik)
    uangBatas: number; // E "kurang dari 1,5 detik"
    umurSemua30: number; // E "lebih dari 30 detik"
    umurUang: number; // E "umur tertua kelas uang: 0"
    lajuBawah: number; // F 4
    lajuAtas: number; // F 5,6
    lajuBatas: number; // F 5
    lajuDetik: number; // F "pada detik ke-3"
    lajuHabis: number; // F 2.000
    lajuHabisMenit: number; // F 33
    sisa: number; // F 8,33
    kaliPuncak: number; // F 9,6
    puncak: number; // F 0,87
    urutanKelas: string[]; // D token pertama tiap pesan
  };
}

/** "13,33" jadi 13.33 dan "10.000" jadi 10000 (format id-ID di rekaman). */
export function angkaID(s: string): number {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) throw new Error(`rekaman: "${s}" bukan angka`);
  return n;
}

const KATA: Record<string, number> = { satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5 };
const kataJadiAngka = (k: string): number => {
  const n = KATA[k];
  if (n === undefined) throw new Error(`rekaman: kata bilangan "${k}" belum dikenal`);
  return n;
};

/** Baris di satu bagian "# --- X. ..." sampai bagian berikutnya. Bagian yang hilang atau ganda gagal. */
export function bagian(teks: string, huruf: string): string[] {
  const baris = teks.split("\n");
  const awal = baris.flatMap((b, i) => (b.startsWith(`# --- ${huruf}. `) ? [i] : []));
  if (awal.length !== 1) throw new Error(`rekaman: bagian ${huruf} ada ${awal.length}, harus satu`);
  const akhir = baris.findIndex((b, i) => i > awal[0]! && b.startsWith("# --- "));
  return baris.slice(awal[0]!, akhir < 0 ? undefined : akhir);
}

/** Tepat satu baris yang cocok; nol atau banyak gagal. */
function satu(baris: string[], pola: RegExp, nama: string): RegExpMatchArray {
  const cocok = baris.flatMap((b) => {
    const m = b.match(pola);
    return m ? [m] : [];
  });
  if (cocok.length !== 1) throw new Error(`rekaman: ${nama} ada ${cocok.length} baris yang cocok, harus satu (${pola})`);
  return cocok[0]!;
}
const banyak = (baris: string[], pola: RegExp): RegExpMatchArray[] =>
  baris.flatMap((b) => {
    const m = b.match(pola);
    return m ? [m] : [];
  });
const n1 = (m: RegExpMatchArray, i = 1): number => angkaID(m[i]!);

export function bacaAcuan(r: Berkas): Acuan {
  // transaksi.txt
  const tr = r.transaksi;
  const A = bagian(tr, "A");
  const B = bagian(tr, "B");
  const C = bagian(tr, "C");
  const D = bagian(tr, "D");
  const F = bagian(tr, "F");
  const barisF = banyak(F, /^\s*\d+\s+\|\s+\w+\s+\|\s+(\w+)\s+\|\s+(\d+)\s*$/);
  if (barisF.length !== 2) throw new Error(`transaksi F: ${barisF.length} baris status, harus dua`);
  const hitungC = satu(C, /^\s*(\d+)\s+\|\s+(\d+)\s*$/, "transaksi C jumlah baris");
  const hitungD = satu(D, /^\s*(\d+)\s+\|\s+(\d+)\s*$/, "transaksi D jumlah baris");
  const pushA = banyak(A, /^push tiruan menerima: (\d+)/);
  if (pushA.length !== 2) throw new Error(`transaksi A: ${pushA.length} baris push tiruan, harus dua`);
  const workerB = banyak(B, /^worker: diklaim (\d+), terkirim (\d+)/);
  if (workerB.length !== 2) throw new Error(`transaksi B: ${workerB.length} baris worker, harus dua`);
  const transaksi: Acuan["transaksi"] = {
    pushTimeout: n1(satu(tr.split("\n").slice(0, 6), /push timeout (\d+)s/, "transaksi push timeout")),
    pushSebelumWorker: n1(pushA[0]!),
    pushSesudahWorker: n1(pushA[1]!),
    workerSaatBelumCommit: n1(workerB[0]!),
    workerSesudahCommit: n1(workerB[1]!),
    rollback: { jurnal: n1(hitungC), outbox: n1(hitungC, 2) },
    commitDitolak: { sqlstate: satu(D, /SQLSTATE (\d{5})/, "transaksi D SQLSTATE")[1]!, jurnal: n1(hitungD), outbox: n1(hitungD, 2) },
    apiMati: {
      statusSebelum: barisF[0]![1]!,
      percobaanSebelum: n1(barisF[0]!, 2),
      statusSesudah: barisF[1]![1]!,
      percobaanSesudah: n1(barisF[1]!, 2),
    },
  };

  // kursor.txt
  const ku = r.kursor;
  const kA = bagian(ku, "A");
  const kB = bagian(ku, "B");
  const kC = bagian(ku, "C");
  const terkirimA = banyak(kA, /^\s*\d+\s+\|\s+\d+\s+\|\s+\d+\s+\|\s+\d+\s+\|\s+terkirim\s*$/).length;
  const idxSaldo = kB.findIndex((b) => b.includes("saldo_citra_naik"));
  if (idxSaldo < 0) throw new Error("kursor B: saldo_citra_naik tidak ada");
  const kursor: Acuan["kursor"] = {
    berurutanPesan: terkirimA,
    terbalikKursorPesan: n1(satu(kB, /^push tiruan menerima: (\d+) pesan \(hanya Dimas\)/, "kursor B pesan")),
    terbalikKlaimPesan: n1(satu(kC, /^push tiruan menerima: (\d+) pesan;/, "kursor C pesan")),
    saldoNaik: n1(satu(kB.slice(idxSaldo + 3, idxSaldo + 4), /^\s*(\d+)\s*$/, "kursor B saldo naik")),
    nominal: n1(satu(kB, /^# 2\. Budi mengirim Rp([\d.]+) ke Citra/, "kursor B nominal")),
  };

  // ganda.txt
  const ga = r.ganda;
  const gA = bagian(ga, "A");
  const gB = bagian(ga, "B");
  const gC = bagian(ga, "C");
  const gD = bagian(ga, "D");
  const pesanA = satu(gA, /^push tiruan menerima: (\d+) pesan, (\d+) notifikasi_id/, "ganda A pesan");
  const pesanD = satu(gD, /^push tiruan menerima: (\d+) pesan \((\w+) HP, \w+ worker\), (\d+) notifikasi_id/, "ganda D pesan");
  const ganda: Acuan["ganda"] = {
    klaim: n1(satu([gA[0]!], /klaim (\d+) detik \(bawaan\)/, "ganda A klaim")),
    matiPesan: n1(pesanA),
    matiId: n1(pesanA, 2),
    klaimPendek: n1(satu(gB, /Klaim (\d+) ms/, "ganda B klaim")) / 1000,
    pushLambat: n1(satu(gB, /menjawab permintaan pertama sesudah ([\d,]+) detik/, "ganda B lambat")),
    pendekPesan: n1(satu(gB, /^push tiruan menerima: (\d+) pesan, \d+ notifikasi_id/, "ganda B pesan")),
    duaHpPesan: n1(pesanD),
    duaHp: kataJadiAngka(pesanD[2]!),
    duaHpDitundaA: n1(satu(gD, /^worker A: diklaim \d+, ditunda (\d+)/, "ganda D ditunda")),
    penyaringDiterima: n1(satu(gC, /^diterima: (\d+) pesan; ditampilkan: (\d+)/, "ganda C penyaring")),
    penyaringTampil: n1(satu(gC, /^diterima: (\d+) pesan; ditampilkan: (\d+)/, "ganda C penyaring"), 2),
  };

  // retry.txt
  const re = r.retry;
  const rA = bagian(re, "A");
  const rC = bagian(re, "C");
  const putaran = banyak(rA, /^putaran (\d+): outbox\.status = (\w+), percobaan = (\d+)(?:; coba lagi paling lama (\d+) detik lagi)?/);
  const akhirA = putaran.find((m) => m[4] === undefined && m[2] === "mati");
  if (!akhirA) throw new Error("retry A: putaran yang mati tidak ada");
  const klaim6 = satu(rC, /^klaim (\d+): diklaim \d+, mati \d+, tanpa kirim; outbox\.status = (\w+), percobaan = (\d+)/, "retry C klaim terakhir");
  const retry: Acuan["retry"] = {
    batasBackoff: putaran.filter((m) => m[4] !== undefined).map((m) => n1(m, 4)),
    backoffMaks: n1(satu(rA, /maksimum (\d+) detik/, "retry A backoff maksimum")),
    batasA: n1(akhirA, 3),
    statusA: akhirA[2]!,
    permintaanA: n1(satu(rA, /^push tiruan menerima: (\d+) permintaan untuk 1 notifikasi_id/, "retry A permintaan")),
    pesanMati: n1(satu(rC, /^push tiruan menerima: (\d+) pesan untuk 1 notifikasi_id/, "retry C pesan")),
    percobaanMati: n1(klaim6, 3),
    klaimMati: n1(klaim6, 1),
    statusMati: klaim6[2]!,
  };

  // queue.txt
  const qu = r.queue;
  const qA = bagian(qu, "A");
  const qB = bagian(qu, "B");
  const qC = bagian(qu, "C");
  const qD = bagian(qu, "D");
  const qE = bagian(qu, "E");
  const qF = bagian(qu, "F");
  const kap = satu(qA, /c ÷ t = (\d+) ÷ ([\d,]+) = ([\d,]+)\)/, "queue A kapasitas");
  const antaraA = satu(qA, /kapasitas diukur: antara (\d+) dan ([\d,]+) per detik/, "queue A diukur");
  const persen = satu(qC, /antara ([\d,]+)% dan ([\d,]+)%/, "queue C persen");
  const lajuTerukur = satu(qF, /laju promo terukur dalam \d+ detik: antara ([\d,]+) dan ([\d,]+) per detik \(batas (\d+)\)/, "queue F laju");
  const sisa = satu(qF, /sisa kapasitas [\d,]+ − \d+ = ([\d,]+) per detik, ([\d,]+) kali puncak ([\d,]+)/, "queue F sisa");
  const habisF = satu(qF, /10\.000 promo pada \d+ per detik butuh ([\d.]+) detik \((\d+) menit\)/, "queue F habis");
  const urutan = satu(qD, /^urutan di layanan push: (.+)$/, "queue D urutan")[1]!;
  const queue: Acuan["queue"] = {
    c: n1(kap),
    t: n1(kap, 2),
    kapasitas: n1(kap, 3),
    kapasitasBawah: n1(antaraA),
    nPromo: n1(satu(qB, /^jumlah pemberitahuan promo yang ditulis: (\d+)/, "queue B promo")),
    persen30Bawah: n1(persen),
    persen30Atas: n1(persen, 2),
    uangMenunggu30: n1(satu(qC, /^umur notifikasi uang yang menunggu: paling sedikit (\d+) detik/, "queue C umur uang")),
    habisDetik: n1(satu(qC, /10\.000 ÷ [\d,]+ = (\d+) detik/, "queue C habis")),
    perluPerDetik: n1(satu(qC, /dibutuhkan 9\.500 ÷ 30 = ±(\d+) per detik/, "queue C perlu")),
    putaranUang: n1(satu(qE, /paling lama dua putaran, 2 × ([\d,]+) detik/, "queue E putaran")),
    uangBatas: n1(satu(qE, /terkirim dalam kurang dari ([\d,]+) detik/, "queue E batas")),
    umurSemua30: n1(satu(qE, /^umur tertua semua kelas: lebih dari (\d+) detik/, "queue E umur semua")),
    umurUang: n1(satu(qE, /^umur tertua kelas uang: (\d+)/, "queue E umur uang")),
    lajuBawah: n1(lajuTerukur),
    lajuAtas: n1(lajuTerukur, 2),
    lajuBatas: n1(lajuTerukur, 3),
    lajuDetik: n1(satu(qF, /pada detik ke-(\d+): terkirim/, "queue F detik")),
    lajuHabis: n1(habisF),
    lajuHabisMenit: n1(habisF, 2),
    sisa: n1(sisa),
    kaliPuncak: n1(sisa, 2),
    puncak: n1(sisa, 3),
    urutanKelas: urutan.split(" -> ").map((x) => x.trim()),
    // `antaraA[2]` (batas atas terukur) harus sama dengan kapasitas c ÷ t; dicek di periksa().
  };
  if (Math.abs(n1(antaraA, 2) - queue.kapasitas) > 1e-9) throw new Error("queue A: batas atas terukur berbeda dari c ÷ t");
  return { transaksi, kursor, ganda, retry, queue };
}
