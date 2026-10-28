// Pembaca rekaman lab t4-webhook (dan satu bagian api-t4) untuk widget webhook masuk langkah demi langkah (W4-webhook,
// keputusan 1258). Semua angka dan status di widget datang dari sini. Rekaman yang bentuknya berubah, atau baris yang
// hilang atau ganda, menggagalkan build (lab gagal keras, widget ikut). Tanpa DOM; dites rekaman.test.ts dengan
// pembaca kedua yang ditulis terpisah.

export interface Berkas {
  ganda: string; // labs/t4-webhook/output/ganda.txt
  retry: string; // retry.txt
  urutan: string; // urutan.txt
  rekon: string; // rekon.txt
  rentan: string; // labs/api-t4/output/rentan.txt (mode webhook-v1)
}

export interface Acuan {
  ganda: {
    bayar: number; // Rp, "Satu pembayaran Rp200.000"
    kirimA: string[]; // A: jawaban dua kiriman versi pertama, mis. ["200 diproses", "200 diproses"]
    jurnalA: number; // A: jumlah jurnal topup_bank berbeda
    saldoNaikA: number; // A: Rp, komentar "saldo Budi naik Rp400.000"
    kirim2B: string; // B: jawaban kiriman kedua versi ADR 34, mis. "200 ganda"
    eventB: { id: string; jenis: string; hasil: string; adaJurnal: boolean }; // B: satu baris webhook_event
    eventBarisB: number; // B: "(1 row)"
  };
  terlambat: {
    jawabF1: string; // urutan F1: "200 diparkir"
    statusF1: string; // F1: status top-up sesudah kabar pending, "dibayar"
    eventF1: { id: string; jenis: string; hasil: string }[]; // F1: baris webhook_event
    tanyaF1: number; // F1: berapa kali gateway ditanya
    statusV1: string; // api-t4 rentan A: status sesudah pending di versi pertama, "menunggu"
  };
  hilang: {
    jeda: number[]; // retry A: jeda antar percobaan (menit)
    total: number; // retry A: total menit
    kirim401: { n: number; menit: number[] }; // retry A: baris 401, jumlah kiriman dan menit
    jawabanB: string[]; // retry B: jawaban tiap kiriman
    menitB: number[]; // retry B: menit tiap kiriman
    berhentiB: string; // retry B: "jadwal habis"
    totalJamB: number; // retry B: "±5,7 jam"
    eventB: number; // retry B: webhook_event
    statusB: string; // retry B: status top-up, "menunggu"
    uangB: number; // retry B: Rp500.000 sudah di bank
    cekA: { umur: number; diperiksa: number; dikredit: number }[]; // rekon A: tiga pemanggilan -cek-topup
    batasCek: number; // rekon A: bawaan -cek-umur, menit
    statusA: string; // rekon A: status top-up sesudah dicek, "dibayar"
  };
  rekon: {
    baris: number; // rekon B: baris di laporan gateway
    tidakDiLedger: number;
    tidakDiGateway: number;
    jumlahBeda: number;
    diperiksa: number;
    dikoreksi: number; // lewat jurnal
    tanpaJurnal: number;
    terbuka: number;
    postingLamaSama: boolean; // sidik MD5 sama
  };
}

/** "13,33" jadi 13.33 dan "10.000" jadi 10000 (format id-ID di rekaman). */
export function angkaID(s: string): number {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) throw new Error(`rekaman: "${s}" bukan angka`);
  return n;
}

function cocok(teks: string, pola: RegExp, nama: string): RegExpMatchArray {
  const m = teks.match(pola);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
}

/** Semua kecocokan; gagal bila jumlahnya bukan `n` supaya baris ganda atau hilang ketahuan. */
function semua(teks: string, pola: RegExp, n: number, nama: string): RegExpMatchArray[] {
  const ms = [...teks.matchAll(new RegExp(pola.source, pola.flags.includes("g") ? pola.flags : pola.flags + "g"))];
  if (ms.length !== n) throw new Error(`rekaman: ${nama} ditemukan ${ms.length} kali, harap ${n}`);
  return ms;
}

/** Isi satu bagian "# --- X. judul ---" sampai bagian berikutnya. */
export function bagian(teks: string, huruf: string): string {
  const mulai = teks.search(new RegExp(`^# --- ${huruf}\\.`, "m"));
  if (mulai < 0) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  const akhir = teks.slice(mulai + 1).search(/^# --- [A-Z]\d?\./m);
  return akhir < 0 ? teks.slice(mulai) : teks.slice(mulai, mulai + 1 + akhir);
}

/** Baris-baris data satu tabel psql yang kolomnya persis `kolom` (dipisah "|"), sampai "(n rows)". */
export function barisTabel(teks: string, kolom: string[], nama: string): string[][] {
  const lines = teks.split("\n");
  const i = lines.findIndex((l, k) => l.split("|").map((c) => c.trim()).join("|") === kolom.join("|") && /^-+(\+-+)*$/.test((lines[k + 1] ?? "").trim()));
  if (i < 0) throw new Error(`rekaman: tabel ${nama} tidak ditemukan`);
  const hasil: string[][] = [];
  for (let j = i + 2; j < lines.length && !/^\(\d+ rows?\)/.test(lines[j]!); j++) hasil.push(lines[j]!.split("|").map((c) => c.trim()));
  const ringkas = lines.slice(i + 2).find((l) => /^\(\d+ rows?\)/.test(l));
  if (!ringkas) throw new Error(`rekaman: tabel ${nama} tanpa "(n rows)"`);
  const n = Number(ringkas.match(/\((\d+) row/)![1]);
  if (n !== hasil.length) throw new Error(`rekaman: tabel ${nama} menyebut ${n} baris, terbaca ${hasil.length}`);
  return hasil;
}

const daftar = (s: string): number[] => s.split(",").map((x) => angkaID(x.trim()));

export function bacaAcuan(b: Berkas): Acuan {
  // ganda.txt
  const gA = bagian(b.ganda, "A");
  const gB = bagian(b.ganda, "B");
  const bayarNaik = cocok(gA, /Satu pembayaran Rp([\d.]+), dua jurnal: saldo Budi naik Rp([\d.]+)\./, "ganda A komentar saldo");
  const jurnalA = barisTabel(gA, ["jurnal_id", "buku", "jumlah"], "ganda A posting");
  // Invarian ledger: tiap jurnal punya paling sedikit dua posting dan jumlahnya nol.
  const perJurnal = new Map<string, number[]>();
  for (const r of jurnalA) perJurnal.set(r[0]!, [...(perJurnal.get(r[0]!) ?? []), Number(r[2])]);
  for (const [id, posting] of perJurnal) {
    if (posting.length < 2 || posting.reduce((x, y) => x + y, 0) !== 0) throw new Error(`rekaman: jurnal ${id} di ganda A tidak seimbang: ${posting.join(", ")}`);
  }
  const evB = barisTabel(gB, ["event_id", "jenis", "hasil", "ada_jurnal"], "ganda B event");
  if (evB.length !== 1) throw new Error(`rekaman: ganda B harus satu baris event, ada ${evB.length}`);

  // urutan.txt F1
  const f1 = bagian(b.urutan, "F1");
  const evF1 = barisTabel(f1, ["event_id", "jenis", "hasil"], "urutan F1 event");
  const stF1 = barisTabel(f1, ["status"], "urutan F1 status");

  // api-t4 rentan.txt A: status sesudah pending di versi pertama (SELECT status ... id = 1, kedua kalinya)
  const rA = bagian(b.rentan, "A");
  const stV1 = barisTabel(rA, ["status"], "rentan A status");

  // retry.txt
  const rtA = bagian(b.retry, "A");
  const rtB = bagian(b.retry, "B");
  const jadwal = cocok(rtA, /jeda antar percobaan \(sejak percobaan sebelumnya\): ([\d, ]+) menit \(total (\d+) menit\)/, "retry A jadwal");
  const baris401 = cocok(rtA, /^\s*401\s*\|\s*(\d+)\s*\|\s*([\d, ]+?)\s*\|\s*jadwal habis/m, "retry A baris 401");
  const kirimB = barisTabel(rtB, ["kiriman", "menit sejak kiriman pertama", "jawaban api-t4"], "retry B kiriman");
  const berhenti = cocok(rtB, /gateway berhenti: ([^(]+) \((\d+) menit sesudah kiriman pertama, ±([\d,]+) jam\)/, "retry B berhenti");
  const evCount = barisTabel(rtB, ["webhook_event"], "retry B webhook_event");
  const stB = barisTabel(rtB, ["status", "jurnal_id"], "retry B status");
  const uang = cocok(rtB, /Uang Rp([\d.]+) sudah di bank, status top-up menunggu, tidak ada event dan tidak ada jurnal/, "retry B komentar uang");

  // rekon.txt A dan B
  const rkA = bagian(b.rekon, "A");
  const rkB = bagian(b.rekon, "B");
  const cek = semua(rkA, /cek top-up: diperiksa (\d+), dikredit (\d+), selesai tanpa kredit \d+, masih menunggu \d+, galat \d+/, 3, "rekon A cek top-up");
  const umur = [0, ...[...rkA.matchAll(/UPDATE topup_bank SET dibuat = now\(\) - interval '(\d+) minutes'/g)].map((m) => Number(m[1]))];
  if (umur.length !== 3) throw new Error(`rekon: umur top-up diputar ${umur.length - 1} kali, harap 2`);
  const batas = cocok(rkA, /bawaan -cek-umur (\d+)m/, "rekon A batas umur");
  const stA = barisTabel(rkA, ["status", "ada_jurnal"], "rekon A status");
  const rek = cocok(rkB, /rekon <tanggal>: (\d+) baris di laporan gateway; insiden baru: tidak_di_ledger (\d+), tidak_di_gateway (\d+), jumlah_beda (\d+)/, "rekon B ringkasan");
  const kor = cocok(rkB, /koreksi rekon: diperiksa (\d+), dikoreksi lewat jurnal (\d+), selesai tanpa jurnal baru (\d+), tetap terbuka (\d+), galat 0/, "rekon B koreksi");
  const md5 = cocok(rkB, /sidik MD5 sama sesudah koreksi: (ya|tidak)/, "rekon B sidik");

  return {
    ganda: {
      bayar: angkaID(bayarNaik[1]!),
      kirimA: cocok(gA, /hasil kiriman: (.+)\n/, "ganda A kiriman")[1]!.split(", "),
      jurnalA: new Set(jurnalA.map((r) => r[0])).size,
      saldoNaikA: angkaID(bayarNaik[2]!),
      kirim2B: cocok(gB, /kiriman 2 \(event yang sama\): (.+)\n/, "ganda B kiriman 2")[1]!,
      eventB: { id: evB[0]![0]!, jenis: evB[0]![1]!, hasil: evB[0]![2]!, adaJurnal: evB[0]![3] === "t" },
      eventBarisB: evB.length,
    },
    terlambat: {
      jawabF1: cocok(f1, /kabar pending sesudah settlement: (.+)\n/, "urutan F1 jawaban")[1]!,
      statusF1: stF1[0]![0]!,
      eventF1: evF1.map((r) => ({ id: r[0]!, jenis: r[1]!, hasil: r[2]! })),
      tanyaF1: Number(cocok(f1, /berapa kali api-t4 menanyakan order ini ke gateway: (\d+)/, "urutan F1 tanya")[1]),
      statusV1: stV1[0]![0]!,
    },
    hilang: {
      jeda: daftar(jadwal[1]!),
      total: Number(jadwal[2]),
      kirim401: { n: Number(baris401[1]), menit: daftar(baris401[2]!) },
      jawabanB: kirimB.map((r) => r[2]!),
      menitB: kirimB.map((r) => Number(r[1])),
      berhentiB: berhenti[1]!.trim(),
      totalJamB: angkaID(berhenti[3]!),
      eventB: Number(evCount[0]![0]),
      statusB: stB[0]![0]!,
      uangB: angkaID(uang[1]!),
      cekA: cek.map((m, i) => ({ umur: umur[i]!, diperiksa: Number(m[1]), dikredit: Number(m[2]) })),
      batasCek: Number(batas[1]),
      statusA: stA[0]![0]!,
    },
    rekon: {
      baris: Number(rek[1]),
      tidakDiLedger: Number(rek[2]),
      tidakDiGateway: Number(rek[3]),
      jumlahBeda: Number(rek[4]),
      diperiksa: Number(kor[1]),
      dikoreksi: Number(kor[2]),
      tanpaJurnal: Number(kor[3]),
      terbuka: Number(kor[4]),
      postingLamaSama: md5[1] === "ya",
    },
  };
}
