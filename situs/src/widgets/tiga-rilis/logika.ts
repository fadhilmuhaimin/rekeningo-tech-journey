// Logika murni widget "Tiga rilis" (2.22, keputusan 813-815): tanpa DOM, dites Vitest.
// Kejadian dibaca saat build dari rekaman labs/b4-skema/output/ledger/tiga-rilis.txt (jalan yang benar) dan
// satu-langkah.txt (jalan di M13). Keadaan app dan fase diturunkan dari kalimat di rekaman, bukan ditulis tangan.
// Rekaman yang berubah bentuk, fase yang tidak dikenal, atau app yang tidak lagi jalan menggagalkan build.

export type Versi = "1.0" | "1.1";
export interface Langkah { jenis: "langkah"; no: number; sesi: string; perintah: string; hasil: string }
export interface HasilApp {
  jenis: "app"; label: string; versi: Versi; akun: number; bayar: string; saldo: string; baris: number; teratas: string;
}
export interface CekMalam { jenis: "cek"; akun: string; tanpaBuku: number; berbeda: number }
export type Kejadian = Langkah | HasilApp | CekMalam;

export const JUMLAH_FASE = 5;
export interface Rekaman { fase: Kejadian[][] }
export interface Berhenti { versi: Versi; akun: number; teks: string }
export interface SatuLangkah { galat: Langkah[]; app: Berhenti[] }

const POLA_LANGKAH = /^\s*(\d+) \[(\w+)\] (.+)$/;
const POLA_HASIL = /^\s+-> (.+)$/;
const POLA_APP = /^(rilis \d \([^)]+\))\s+app (1\.[01]) \(Karyawan (\d+)\) bayar (\S+) · nomor [\d.]+(?: · buka_buku \d+)? · saldo (Rp[\d.]+)\s*$/;
const POLA_RIWAYAT = /^\s+app (1\.[01]) layar riwayat: (\d+) baris, teratas (.+)$/;
const POLA_CEK = /^\s*(\d[\d.]*)\s+\|\s+(\d+)\s+\|\s+(\d+)\s*$/;

// Fase yang ditunjuk tiap label app di rekaman. Label baru gagal keras supaya fase tidak bergeser diam-diam.
const FASE_APP: Record<string, number> = {
  "rilis 1 (server v1)": 1,
  "rilis 2 (tulis dua, baca v1)": 2,
  "rilis 2 (tulis dua, baca ledger)": 4,
  "rilis 3 (ledger saja)": 5,
  "rilis 3 (sesudah contract)": 5,
};
// Langkah bernomor: persiapan rilis 2, backfill, contract rilis 3.
function faseLangkah(no: number): number {
  if (no === 1) return 2;
  if (no >= 2 && no <= 12) return 3;
  if (no === 13) return 5;
  throw new Error(`rekaman: langkah ${no} tidak punya fase`);
}

/** Baca semua kejadian berurutan; app diambil berpasangan (baris bayar lalu baris riwayat). */
export function bacaKejadian(teks: string): Kejadian[] {
  const baris = teks.split("\n");
  const hasil: Kejadian[] = [];
  let noTerakhir = 0;
  for (let i = 0; i < baris.length; i++) {
    const b = baris[i]!;
    const a = b.match(POLA_APP);
    if (a) {
      const r = (baris[i + 1] ?? "").match(POLA_RIWAYAT);
      if (!r || r[1] !== a[2]) throw new Error(`rekaman: baris bayar app ${a[2]} (baris ${i + 1}) tidak diikuti baris riwayat app yang sama`);
      hasil.push({
        jenis: "app", label: a[1]!, versi: a[2] as Versi, akun: Number(a[3]), bayar: a[4]!, saldo: a[5]!,
        baris: Number(r[2]), teratas: r[3]!.trim(),
      });
      i++;
      continue;
    }
    const l = b.match(POLA_LANGKAH);
    if (l) {
      const no = Number(l[1]);
      if (no !== noTerakhir + 1) throw new Error(`rekaman: langkah ${no} muncul sesudah langkah ${noTerakhir}, harus berurutan`);
      noTerakhir = no;
      const h = (baris[i + 1] ?? "").match(POLA_HASIL);
      hasil.push({ jenis: "langkah", no, sesi: l[2]!, perintah: l[3]!.trim(), hasil: h ? h[1]!.trim() : "" });
      continue;
    }
    if (/^\s*akun\s+\|\s+tanpa_buku\s+\|\s+berbeda\s*$/.test(b)) {
      const c = (baris[i + 2] ?? "").match(POLA_CEK);
      if (!c) throw new Error("rekaman: baris angka di bawah tabel cek malam tidak ada");
      hasil.push({ jenis: "cek", akun: c[1]!, tanpaBuku: Number(c[2]), berbeda: Number(c[3]) });
    }
  }
  return hasil;
}

/** Kelompokkan kejadian ke lima fase, urutan rekaman dipertahankan; tiap fase harus berisi sesuatu. */
export function bacaRekaman(teks: string): Rekaman {
  const fase: Kejadian[][] = Array.from({ length: JUMLAH_FASE }, () => []);
  let terakhir = 1;
  for (const k of bacaKejadian(teks)) {
    const f = k.jenis === "app" ? FASE_APP[k.label] : k.jenis === "langkah" ? faseLangkah(k.no) : 4;
    if (f === undefined) throw new Error(`rekaman: label app tidak dikenal: ${(k as HasilApp).label}`);
    if (f < terakhir) throw new Error(`rekaman: kejadian fase ${f} muncul sesudah fase ${terakhir}`);
    terakhir = f;
    fase[f - 1]!.push(k);
  }
  fase.forEach((isi, i) => { if (isi.length === 0) throw new Error(`rekaman: fase ${i + 1} kosong`); });
  periksaApp(fase);
  periksaBackfill(fase);
  return { fase };
}

const apps = (fase: Kejadian[][]) => fase.flat().filter((k): k is HasilApp => k.jenis === "app");

function periksaApp(fase: Kejadian[][]) {
  for (const f of fase) {
    const a = apps([f]).filter((k) => k.versi === "1.0").length;
    const b = apps([f]).filter((k) => k.versi === "1.1").length;
    if (a !== b) throw new Error("rekaman: fase yang memuat app harus memuat app 1.0 dan 1.1 dalam jumlah sama");
  }
  for (const a of apps(fase)) {
    if (a.bayar !== "COMMIT") throw new Error(`rekaman: app ${a.versi} di "${a.label}" tidak jalan: bayar ${a.bayar}`);
    if (a.baris < 1) throw new Error(`rekaman: app ${a.versi} di "${a.label}" membaca 0 baris riwayat`);
  }
}

function periksaBackfill(fase: Kejadian[][]) {
  const langkah = fase[2]!.filter((k): k is Langkah => k.jenis === "langkah");
  const bayar = langkah.find((l) => l.sesi === "P" && /^MENUNGGU /.test(l.hasil));
  const baca = langkah.find((l) => l.sesi === "Q");
  if (!bayar || !/ShareLock pada baris .*di belakang BF$/.test(bayar.hasil)) throw new Error("rekaman: Bayar (P) harus menunggu lock baris di belakang BF");
  if (!baca || !/tanpa menunggu/.test(baca.hasil)) throw new Error("rekaman: riwayat (Q) harus tanpa menunggu");
  const cek = fase[3]!.find((k): k is CekMalam => k.jenis === "cek");
  if (!cek || cek.tanpaBuku !== 0 || cek.berbeda !== 0) throw new Error("rekaman: cek malam harus 0 akun tanpa buku dan 0 cache berbeda");
  const contract = fase[4]!.find((k): k is Langkah => k.jenis === "langkah" && k.no === 13);
  if (!contract || !/^COMMIT/.test(contract.hasil)) throw new Error("rekaman: contract (langkah 13) harus COMMIT");
}

/** Baca satu-langkah.txt: dua galat server v1 (langkah 7 dan 8) dan dua app yang berhenti. */
export function bacaSatuLangkah(teks: string): SatuLangkah {
  const galat = bacaKejadian(teks).filter((k): k is Langkah => k.jenis === "langkah" && (k.no === 7 || k.no === 8));
  if (galat.length !== 2 || galat.some((l) => !/^ERROR 42703 /.test(l.hasil))) {
    throw new Error("satu-langkah.txt: langkah 7 dan 8 harus galat 42703");
  }
  const app: Berhenti[] = [];
  for (const b of teks.split("\n")) {
    const m = b.match(/^app (1\.[01]) \(Karyawan (\d+)\): berhenti: (.+)$/);
    if (m) app.push({ versi: m[1] as Versi, akun: Number(m[2]), teks: m[3]!.trim() });
  }
  if (app.length !== 2 || app[0]!.versi !== "1.0" || app[1]!.versi !== "1.1") {
    throw new Error("satu-langkah.txt: app 1.0 dan 1.1 harus berhenti, berurutan");
  }
  return { galat, app };
}

/** Keadaan app sesudah fase n (1..5): kejadian app terakhir tiap versi di fase 1..n. */
export function appSesudah(fase: Kejadian[][], n: number): Record<Versi, HasilApp | undefined> {
  const hasil: Record<Versi, HasilApp | undefined> = { "1.0": undefined, "1.1": undefined };
  for (const a of apps(fase.slice(0, n))) hasil[a.versi] = a;
  return hasil;
}

/** Tebakan: kunci pilihan yang cocok dengan rekaman (Bayar menunggu, riwayat tidak). */
export type Kunci = "bayar" | "keduanya" | "tidak";
export function kunciBenar(fase: Kejadian[][]): Kunci {
  const langkah = fase[2]!.filter((k): k is Langkah => k.jenis === "langkah");
  const bayarTunggu = langkah.some((l) => l.sesi === "P" && /^MENUNGGU /.test(l.hasil));
  const bacaTunggu = langkah.some((l) => l.sesi === "Q" && !/tanpa menunggu/.test(l.hasil));
  if (bayarTunggu && !bacaTunggu) return "bayar";
  if (bayarTunggu && bacaTunggu) return "keduanya";
  return "tidak";
}

export function indeksBenar(pilihan: { kunci: Kunci }[], fase: Kejadian[][]): number {
  const k = kunciBenar(fase);
  const cocok = pilihan.flatMap((p, i) => (p.kunci === k ? [i] : []));
  if (cocok.length !== 1) throw new Error(`tebakan: ${cocok.length} pilihan bernilai ${k}, harus tepat satu`);
  return cocok[0]!;
}

/** Isi {nama} di templat dengan nilai; nama yang tidak ada gagal keras. */
export function isi(teks: string, nilai: Record<string, string | number>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in nilai)) throw new Error(`templat memakai {${k}} yang tidak diisi`);
    return String(nilai[k]);
  });
}
