// Logika murni widget "Satu penyemprotan, enam kondisi" (2.28, keputusan 853): tanpa DOM, dites Vitest.
// Semua angka dibaca saat build dari rekaman labs/c4-ratelimit/output/login/ratelimit.txt bagian C (hanya kunci per akun),
// D (dua lapis di memori), E (alamat dari header), F (dua instance), dan H (alamat IPv6 satu prefix /64), bukan ditulis
// tangan. Rekaman yang bentuknya berubah, jumlah jawaban yang tidak sama dengan jumlah percobaan, atau tebakan yang tidak
// punya tepat satu jawaban cocok menggagalkan build.

export type Kondisi = "dua-lapis" | "kunci-saja" | "xff-mentah" | "proxy-palsu" | "dua-instance" | "ipv6";
export const KONDISI: readonly Kondisi[] = ["dua-lapis", "kunci-saja", "xff-mentah", "proxy-palsu", "dua-instance", "ipv6"];

export interface Hasil {
  percobaan: number; // jumlah tebakan yang dikirim
  sampai: number; // jawaban 200 atau 401: sampai ke pemeriksaan password
  ditolak: number; // jawaban 429: ditolak lapis batas laju
  terbuka: number; // jawaban 200: tebakan yang mengenai password sebuah akun
}
export type Rekaman = Record<Kondisi, Hasil>;

/** Potongan tebakan: "200: 1 · 401: 28" menjadi peta kode ke jumlah. */
function bacaKode(teks: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of teks.matchAll(/(\d{3}): (\d+)/g)) out[m[1]!] = Number(m[2]);
  return out;
}

function bagian(teks: string, huruf: string): string[] {
  const baris = teks.split("\n");
  const awal = baris.findIndex((b) => b.startsWith(`== ${huruf}. `));
  if (awal < 0) throw new Error(`rekaman c4 login: bagian ${huruf} tidak ada`);
  const akhir = baris.findIndex((b, i) => i > awal && b.startsWith("== "));
  return baris.slice(awal, akhir < 0 ? baris.length : akhir);
}

/** Baris pertama di bagian yang memuat `awalan`; hasilnya jumlah per kode dan jumlah percobaan yang tertulis. */
function bacaBaris(b: string[], huruf: string, awalan: RegExp, jumlah: RegExp): Hasil {
  const i = b.findIndex((x) => awalan.test(x));
  const baris = i < 0 ? undefined : b[i];
  if (baris === undefined) throw new Error(`rekaman c4 login bagian ${huruf}: baris ${awalan} tidak ada`);
  const n = baris.match(jumlah);
  if (!n) throw new Error(`rekaman c4 login bagian ${huruf}: jumlah percobaan tidak terbaca di "${baris.trim()}"`);
  const kode = bacaKode(baris.slice(baris.indexOf("→")));
  const ok = (kode["200"] ?? 0) + (kode["401"] ?? 0);
  const ditolak = kode["429"] ?? 0;
  const percobaan = Number(n[1]);
  if (ok + ditolak !== percobaan) {
    throw new Error(`rekaman c4 login bagian ${huruf}: ${ok} + ${ditolak} jawaban, ${percobaan} percobaan tertulis`);
  }
  return { percobaan, sampai: ok, ditolak, terbuka: kode["200"] ?? 0 };
}

export function bacaRekaman(teks: string): Rekaman {
  const c = bacaBaris(bagian(teks, "C"), "C", /^\s+\d+ akun disemprot dari /, /^\s+(\d+) akun disemprot/);
  const d = bacaBaris(bagian(teks, "D"), "D", /^\s+\d+ akun disemprot dari /, /^\s+(\d+) akun disemprot/);
  const e = bagian(teks, "E");
  const xff = bacaBaris(e, "E", /IP_SUMBER=xff-mentah: \d+ percobaan/, /xff-mentah: (\d+) percobaan/);
  // Baris proxy tidak menulis jumlah percobaan; jumlahnya dibaca dari 401 + 429 dan dicocokkan dengan 20 di run-login.py
  // lewat tes (logika.test.ts), jadi bentuk barisnya dijaga di sini.
  const pi = e.findIndex((x) => /IP_SUMBER=proxy, penyerang menebak penanda proxy → /.test(x));
  if (pi < 0) throw new Error("rekaman c4 login bagian E: baris IP_SUMBER=proxy tidak ada");
  const pk = bacaKode(e[pi]!.slice(e[pi]!.indexOf("→")));
  const proxy: Hasil = { percobaan: (pk["401"] ?? 0) + (pk["429"] ?? 0), sampai: pk["401"] ?? 0, ditolak: pk["429"] ?? 0, terbuka: 0 };
  const f = bacaBaris(bagian(teks, "F"), "F", /^\s+\d+ percobaan satu IP, bergantian ke 2 instance/, /^\s+(\d+) percobaan satu IP/);
  const h = bacaBaris(bagian(teks, "H"), "H", /alamat berbeda dalam .*\/64, .* akun berbeda → /, /^\s+(\d+) alamat berbeda/);
  return { "dua-lapis": d, "kunci-saja": c, "xff-mentah": xff, "proxy-palsu": proxy, "dua-instance": f, ipv6: h };
}

/** Jumlah hash argon2id yang dijalankan server dua lapis, dibaca dari bagian D ("argon2id dijalankan 10 kali"). */
export function hashDuaLapis(teks: string): number {
  const m = bagian(teks, "D").map((b) => b.match(/argon2id dijalankan (\d+) kali, query akun (\d+) kali untuk (\d+) percobaan/)).find((x) => x);
  if (!m) throw new Error('rekaman c4 login bagian D: baris "argon2id dijalankan N kali" tidak ada');
  if (m[1] !== m[2]) throw new Error("rekaman c4 login bagian D: jumlah hash dan query akun berbeda");
  return Number(m[1]);
}

/** Jumlah akun yang terkunci oleh penyemprotan di bagian C ("akun yang terkunci oleh serangan ini: 0"). */
export function terkunciKunciSaja(teks: string): number {
  const m = bagian(teks, "C").map((b) => b.match(/akun yang terkunci oleh serangan ini: (\d+)/)).find((x) => x);
  if (!m) throw new Error('rekaman c4 login bagian C: baris "akun yang terkunci oleh serangan ini" tidak ada');
  return Number(m[1]);
}

export interface PilihanTebak { teks: string; angka: number; alasan: string }

/** Indeks pilihan yang benar: tepat satu pilihan yang angkanya sama dengan jumlah tebakan yang sampai di rekaman. */
export function indeksBenar(pilihan: PilihanTebak[], fakta: number): number {
  const cocok = pilihan.flatMap((p, i) => (p.angka === fakta ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan cocok dengan rekaman, harus tepat satu`);
  return cocok[0]!;
}

export interface BarisTabel { kode: "percobaan" | "sampai" | "ditolak" | "terbuka"; nilai: string; sorot: boolean }

/** Baris tabel untuk satu kondisi, dengan nilai yang sudah diformat. */
export function tabelKondisi(h: Hasil): BarisTabel[] {
  return [
    { kode: "percobaan", nilai: String(h.percobaan), sorot: false },
    { kode: "sampai", nilai: String(h.sampai), sorot: h.sampai === h.percobaan },
    { kode: "ditolak", nilai: String(h.ditolak), sorot: false },
    { kode: "terbuka", nilai: String(h.terbuka), sorot: h.terbuka > 0 },
  ];
}

/** Nilai untuk templat teks: {percobaan}, {sampai}, {ditolak}, {terbuka}, {hash}, {terkunci}. */
export function nilaiTeks(h: Hasil, hash: number, terkunci: number): Record<string, string | number> {
  return { percobaan: h.percobaan, sampai: h.sampai, ditolak: h.ditolak, terbuka: h.terbuka, hash, terkunci };
}

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}
