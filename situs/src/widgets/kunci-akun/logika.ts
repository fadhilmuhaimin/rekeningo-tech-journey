// Logika murni widget "Berapa tebakan yang cukup untuk mengunci Ani lagi?" (M16, keputusan 850): tanpa DOM, dites Vitest.
// Semua angka dibaca saat build dari labs/c4-ratelimit/output/login/ratelimit.txt: kunci pada akun Ani (bagian C,
// pertahanan kunci per akun saja), lama kunci di kepala bagian A, dan password benar sesudah kunci lewat (bagian G).
// Rekaman yang berubah bentuk, lama kunci yang tidak menggandakan, atau tebakan yang tidak punya tepat satu
// jawaban cocok menggagalkan build.

export type Giliran = "penyerang" | "ani";

export interface Putaran { ke: number; tebakan: number; status: number; terkunciDetik: number }
export interface Rekaman {
  ambang: number; // gagal berturut-turut yang memasang kunci
  maksMenit: number; // batas atas lama kunci (kepala bagian A)
  judulJawaban: string; // judul jawaban 401 untuk Ani yang password-nya benar
  putaran: Putaran[]; // tiga putaran kunci pada akun Ani
  aniBenar: { sesudahDetik: number; status: number; gagalLogin: number };
}

const lawan = (teks: string, pola: RegExp, nama: string): RegExpMatchArray => {
  const baris = teks.split("\n").map((b) => b.match(pola)).find((m) => m !== null);
  if (!baris) throw new Error(`rekaman c4: baris "${nama}" tidak ada atau berubah bentuk`);
  return baris;
};

export function bacaRekaman(teks: string): Rekaman {
  const kepala = lawan(teks, /^Kunci per akun: ambang (\d+) gagal berturut, durasi menggandakan (\d+)s→(\d+)s→\.\.\.→(\d+)m/, "kepala kunci per akun (bagian A)");
  const ambang = Number(kepala[1]);
  const maksMenit = Number(kepala[4]);

  const awal = lawan(teks, /^ {2}(\d+) tebakan salah ke akun Ani\s+→ 401: (\d+)$/, "tebakan awal ke akun Ani (bagian C)");
  if (awal[1] !== awal[2]) throw new Error("rekaman c4: tebakan awal ke akun Ani harus semuanya dijawab 401");
  const k1 = lawan(teks, /^ {2}kunci ke-1: Ani \(IP sendiri, password BENAR\) ditolak (\d+) (.+)$/, "kunci ke-1 (bagian C)");
  const d1 = lawan(teks, /^ {4}database: terkunci_sampai (\d+) s lagi\./, "lama kunci ke-1 (bagian C)");
  const k2 = lawan(teks, /^ {2}kunci ke-2: kunci pertama lewat, (\d+) gagal lagi → Ani ditolak (\d+), terkunci (\d+) s lagi/, "kunci ke-2 (bagian C)");
  const k3 = lawan(teks, /^ {2}kunci ke-3: (\d+) gagal lagi → Ani ditolak (\d+), terkunci (\d+) s lagi/, "kunci ke-3 (bagian C)");

  const putaran: Putaran[] = [
    { ke: 1, tebakan: Number(awal[1]), status: Number(k1[1]), terkunciDetik: Number(d1[1]) },
    { ke: 2, tebakan: Number(k2[1]), status: Number(k2[2]), terkunciDetik: Number(k2[3]) },
    { ke: 3, tebakan: Number(k3[1]), status: Number(k3[2]), terkunciDetik: Number(k3[3]) },
  ];
  if (putaran[0]!.tebakan !== ambang) throw new Error(`rekaman c4: tebakan awal ${putaran[0]!.tebakan} berbeda dari ambang ${ambang}`);
  for (let i = 1; i < putaran.length; i++) {
    if (putaran[i]!.terkunciDetik !== putaran[i - 1]!.terkunciDetik * 2) throw new Error("rekaman c4: lama kunci tidak menggandakan");
  }
  if (putaran.some((p) => p.status !== 401)) throw new Error("rekaman c4: jawaban untuk Ani yang terkunci harus 401");

  const g = lawan(teks, /^ {2}password BENAR sesudah kunci lewat \((\d+) s\) → (\d+) ok=True; gagal_login (\d+), terkunci tidak/, "password benar sesudah kunci lewat (bagian G)");
  const aniBenar = { sesudahDetik: Number(g[1]), status: Number(g[2]), gagalLogin: Number(g[3]) };
  if (aniBenar.status !== 200 || aniBenar.gagalLogin !== 0) throw new Error("rekaman c4: password benar sesudah kunci lewat harus 200 dengan penghitung 0");

  return { ambang, maksMenit, judulJawaban: k1[2]!, putaran, aniBenar };
}

export interface PilihanTebak { teks: string; alasan: string; tebakan: number }

/** Indeks pilihan yang benar: tepat satu pilihan yang jumlah tebakannya sama dengan putaran kedua di rekaman. */
export function indeksBenar(pilihan: PilihanTebak[], r: Rekaman): number {
  const mau = r.putaran[1]!.tebakan;
  const cocok = pilihan.flatMap((p, i) => (p.tebakan === mau ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan cocok dengan rekaman (${mau} tebakan), harus tepat satu`);
  return cocok[0]!;
}

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}

export interface Tabel { judul: string; kolom: string[]; baris: string[][] }
export interface TeksTabel {
  judul: Record<Giliran, string>;
  kolom: Record<Giliran, string[]>;
  sel: { putaran: string; tebakan: string; jawaban: string; jawabanAni: string; kunci: string; tanpaKunci: string; aniKirim: string; penghitung: string };
}

/** Satu tabel per giliran. Penyerang: tiga putaran kunci. Ani: satu baris, password benar sesudah kunci lewat. */
export function tabelGiliran(r: Rekaman, g: Giliran, t: TeksTabel): Tabel {
  if (g === "penyerang") {
    return {
      judul: t.judul.penyerang,
      kolom: t.kolom.penyerang,
      baris: r.putaran.map((p) => [
        isi(t.sel.putaran, { ke: p.ke }),
        isi(t.sel.tebakan, { n: p.tebakan }),
        isi(t.sel.jawaban, { status: p.status, judul: r.judulJawaban }),
        isi(t.sel.kunci, { detik: p.terkunciDetik }),
      ]),
    };
  }
  return {
    judul: t.judul.ani,
    kolom: t.kolom.ani,
    baris: [[
      t.sel.aniKirim,
      isi(t.sel.jawabanAni, { status: r.aniBenar.status }),
      t.sel.tanpaKunci,
      isi(t.sel.penghitung, { n: r.aniBenar.gagalLogin }),
    ]],
  };
}
