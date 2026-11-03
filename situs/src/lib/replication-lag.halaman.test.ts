// Penjaga halaman 5.7 (keputusan 1524 sampai 1526): angka, ID, nomor ADR, versi dan tanggal sumber, tautan, rentang Snippet, tabel, klaim
// "tidak ada" dan kalimat mekanisme di replication-lag.mdx, diagram t5-lag-inti.json, tiga baris glosarium yang kini menuju halaman ini,
// dan baris riset R5-140 sampai R5-144. Nilai diturunkan dari registry, naskah Tahap 5, rekaman labs/t5-replika/output, kode labs/api-t5
// (dibaca sebagai teks), widget W5-lag (logika.ts dan t5-lag.json), halaman 5.4 (angka 26,4 koneksi) dan baris riset, bukan dari daftar yang
// ditulis sendiri. Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman dan JSON dikunci per
// baris di replication-lag.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1) untuk mutasi tanpa sidik teks, dan dibuat ulang sesudah teks
// sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/replication-lag.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci: kalimat tentang kode dibaca dari file lab, tentang rekaman dari rekaman, tentang
// dokumentasi luar dari baris riset (kutipan Inggris aslinya ada di baris itu), dan tentang naskah dari naskah. Baris riset tetangga tidak
// dikunci (PR lain menyisip baris di antaranya): hanya urutan naik dan rentang R5-140 sampai R5-144.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import registry from "../../data/cerita.json";
import rantaiMentah from "../../data/diagram/t5-lag-inti.json";
import widgetMentah from "../../data/widget/t5-lag.json";
import { DataRantai } from "./rantai";
import { cekTemplat, daftarBlok } from "./blok";
import { DataLag } from "../widgets/jeda-replica/skema";
import { hitung, jedaDari, rupiah } from "../widgets/jeda-replica/logika";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./replication-lag.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const HALAMAN = "situs/src/content/docs/tahap-5/replication-lag.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset = baca("plan/RISET-TAHAP-5.md");
const m40 = baca("situs/src/content/docs/tahap-5/m40-pembayaran-melambat.mdx");
const bacaTxt = baca("labs/t5-replika/output/baca.txt");
const sinkronTxt = baca("labs/t5-replika/output/sinkron.txt");
const jedaTxt = baca("labs/t5-replika/output/jeda.txt");
const readmeLab = baca("labs/t5-replika/README.md");
const serviceReplika = baca("labs/api-t5/internal/service/replika.go");
const repoReplika = baca("labs/api-t5/internal/repo/replika.go");
const handlerT5 = baca("labs/api-t5/internal/handler/handler_t5.go");
const handlerUtama = baca("labs/api-t5/internal/handler/handler.go");
const handlerIdem = baca("labs/api-t5/internal/handler/handler_idempoten.go");
const tanpaKunci = process.env.TANPA_KUNCI === "1";

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; adr?: number[]; peran?: string[]; lab?: string[]; path?: string }
const hal = registry.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const kali = (teks: string, cari: string): number => (cari === "" ? 0 : teks.split(cari).length - 1);
/** Kalimat harus muncul tepat `n` kali di badan halaman: toContain puas dengan satu kemunculan, jadi dihitung. */
const harusAda = (kalimat: string, n = 1): void => { expect(kali(badan, kalimat), kalimat).toBe(n); };
const barisRiset = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const baris = (teks: string): string[] => teks.split("\n");
/** Format Indonesia: titik ribuan, koma desimal; pembulatan setengah ke atas seperti pembaca (bukan toFixed). */
const bulat = (x: number, d: number): number => Math.round((x + Number.EPSILON) * 10 ** d) / 10 ** d;
const fmt = (x: number, d = 0): string => {
  const [i, f] = bulat(x, d).toFixed(d).split(".");
  const ribu = i!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return f ? `${ribu},${f}` : ribu;
};
const rp = (n: number): string => rupiah(n);
const tabelMdx = (awalan: string): string[][] => {
  const semua = halaman.slice(halaman.indexOf(awalan)).split("\n");
  const keluar: string[][] = [];
  for (const b of semua) { if (!b.startsWith("|")) break; keluar.push(b.split("|").slice(1, -1).map((x) => x.trim())); }
  return keluar;
};
const tanpaKode = (teks: string): string => teks.replace(/<Snippet[\s\S]*?\s\/>\n/g, "").replace(/`[^`\n]*`/g, "").replace(/\]\([^)]*\)/g, "]");

// --- bagian rekaman baca.txt: dibaca sebagai teks, nilai diturunkan dari sana
const iB = baris(bacaTxt).findIndex((b) => b.startsWith("# --- B."));
const iA = baris(bacaTxt).findIndex((b) => b.startsWith("# --- A."));
const bagianA = baris(bacaTxt).slice(iA, iB);
const bagianB = baris(bacaTxt).slice(iB);
const saldoDi = (b: string): number | null => { const m = b.match(/"saldo":(\d+)/); return m ? Number(m[1]) : null; };
const dibacaDari = bagianB.filter((b) => b.startsWith("X-Dibaca-Dari:")).map((b) => b.replace("X-Dibaca-Dari: ", ""));
const saldoJson = bagianB.map(saldoDi).filter((x): x is number => x !== null);
const nominalB = Number((bagianB.find((b) => b.includes("-d '{\"ke\": 505")) ?? "").match(/"nominal": (\d+)/)![1]);
const jawabBayarB = saldoJson[0]!; // saldo di jawaban bayar 201
const tanpaTokenB = saldoJson[1]!; // GET /akun/419 tanpa token (dari replica)
const denganTokenB = saldoJson[2]!; // GET /akun/419 dengan token (dari primary)
const sesudahB = saldoJson[3]!; // GET /akun/419 dengan token sesudah replica sampai
const saldoA = bagianA.map(saldoDi).filter((x): x is number => x !== null);
const W = DataLag.parse(widgetMentah);

describe("registry, templat konsep, dan kepala halaman", () => {
  test("entri registry 5.7: ADR 47, jenis konsep, prasyarat, lab, ada, menit sama dengan baris meta, peran sama dengan jalur naskah", () => {
    const h = dari("t5-lag");
    expect(h).toMatchObject({ nomor: "5.7", jenis: "konsep", adr: [47], inti: true, ada: true, tahap: 5, prasyarat: ["t5-m41"], lab: ["t5-replika"], peran: ["mobile", "backend"] });
    expect(h.menit).toBe(24);
    expect(halaman).toContain(`<p class="meta">Baca 21 menit · coba 3 menit · Prasyarat: [[t5-m41]] · Jalur inti</p>`);
    expect(halaman).toContain(`title: "${h.nomor} ${h.judul}"`);
    expect(naskah).toContain("| 5.7 | 4 | Replication lag dan read-your-writes + ADR 47 | Konsep + ADR | ★ | t5-replika | W5-lag |");
    expect(naskah).toMatch(/\*\*Mobile\*\* [^\n]*\b5\.7\b/);
    expect(dari("t5-m42").prasyarat).toContain("t5-lag");
  });
  test("blok mengikuti templat konsep dan dua blok pertama terbuka", () => {
    const b = daftarBlok(halaman);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(b.map((x) => x.buka)).toEqual([true, true, false, false, false]);
  });
  test("judul bagian dan tingkat heading: h2 Inti, h3 bernama, tanpa h4 atau lebih dalam", () => {
    const h = [...badan.matchAll(/^(#{1,6}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(h).toEqual(["## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Di stack lain", "### ADR 47: tiga kelas baca, dan token posisi WAL untuk bacaan milik sendiri", "### Sengaja belum dilakukan", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut"]);
  });
  test("semua [[ID]] ada di registry dan [[berikutnya]] dipakai sekali; nomor ADR di dekat tautan sama dengan ADR halaman yang ditaut", () => {
    const id = [...halaman.matchAll(/\[\[([A-Za-z0-9.\-]+)\]\]/g)].map((m) => m[1]!).filter((x) => x !== "berikutnya");
    for (const x of id) dari(x);
    expect(kali(halaman, "[[berikutnya]]")).toBe(1);
    expect(new Set(id)).toEqual(new Set(["t5-m41", "t5-read-replica", "t4-adr-45", "t5-prd", "t5-m42", "t5-m40", "t5-rpo-rto", "E1"]));
    harusAda("ADR 46 ([[t5-read-replica]])", 2);
    expect(dari("t5-read-replica").adr).toEqual([46]);
    expect(dari("t4-adr-45").adr).toEqual([45]);
    expect(dari("t5-rpo-rto").adr).toEqual([48]);
    expect(dari("E1").adr).toEqual([10]);
    expect(dari("E1").nomor).toBe("1.33");
    harusAda("Naskah menulis bahwa app versi lama tanpa token membaca primary ([[E1]]).");
    expect(dari("t5-m41").judul.startsWith("M41")).toBe(true);
    expect(dari("t5-m42").judul.startsWith("M42")).toBe(true);
    expect(dari("t5-m40").judul.startsWith("M40")).toBe(true);
    expect(dari("t5-m41").prasyarat).toContain("t5-read-replica");
  });
  test("tiga baris glosarium (LSN, Read-your-writes, Replication lag) menuju halaman ini, dan halaman ada di indeks topik dan peta cerita tahap", () => {
    const glos = baca("situs/src/content/docs/alat/glosarium.mdx");
    for (const t of ["| **LSN** (Log Sequence Number) |", "| **Read-your-writes** |", "| **Replication lag** |"]) {
      const b = baris(glos).filter((x) => x.startsWith(t));
      expect(b.length, t).toBe(1);
      expect(b[0]!.endsWith("| [[t5-lag]] |"), t).toBe(true);
    }
    const url = "/tahap-5/replication-lag/";
    expect(baca("situs/src/content/docs/alat/indeks-topik.mdx")).toContain(`[5.7 Replication lag dan read-your-writes + ADR 47](${url})`);
    expect(baca("situs/src/content/docs/cerita/tahap-5.mdx")).toContain(`](${url})`);
  });
});

describe("naskah Tahap 5: ADR 47 dan M41 yang dibaca halaman, dan selisihnya dengan kode", () => {
  const adr47 = naskah.split("\n").find((b) => b.startsWith("| 47 |")) ?? "";
  const m41 = naskah.split("\n").find((b) => b.startsWith("| M41 |")) ?? "";
  test("baris ADR 47 memuat kelas baca, token, empat opsi, ambang 20%, 30 detik, 5,0%, dan failover [perlu verifikasi]", () => {
    for (const s of ["Tiga kelas baca, yang memperluas aturan 2 ADR 45", "(1) Menentukan uang", "(2) Milik sendiri sesudah menulis", "(3) Laporan dan bacaan lain: replica",
      "app mengirimnya di bacaan berikutnya selama 30 detik (Asumsi)", "`remote_apply` untuk semua commit", "jendela waktu tetap 5 detik ke primary sesudah menulis", "semua baca ke primary (menghapus ADR 46)", "menyimpan transaksi sendiri di app sampai muncul",
      "Lebih dari 20% bacaan berakhir di primary karena replica belum sampai (Asumsi", "69,4 per detik dari 1.388,9, atau 5,0%", "Jeda replica lebih dari 30 detik: semua bacaan pindah ke primary",
      "Sesudah failover token dari primary lama mungkin tidak bisa dibandingkan dengan replica baru [perlu verifikasi]"])
      expect(adr47, s).toContain(s);
  });
  test("selisih: naskah menulis app lama tanpa token membaca primary; kode dan rekaman menulis replica (halaman mengikuti kode)", () => {
    expect(adr47).toContain("App versi lama tanpa token membaca dari primary (ADR 10)");
    expect(adr47).toContain("App yang tidak mengirim token aman, tetapi menambah beban primary");
    // kode: tanpa token memilih replica
    expect(serviceReplika).toMatch(/if s\.rentan == RentanRiwayatReplika \|\| token == "" \{\s*\n\s*return s\.replika, SumberReplika, nil/);
    expect(serviceReplika).toContain("//   - Tanpa token: replica (bacaan yang bukan milik sendiri sesudah menulis).");
    // rekaman: bagian B memuat baris itu
    expect(bacaTxt).toContain("# Tanpa token (app tidak menyimpannya): bacaan tampilan dari replika, jadi sama lamanya dengan versi pertama.");
    expect(dibacaDari.slice(0, 1)).toEqual(["replika"]);
    harusAda("5. Bacaan tanpa token dibaca dari replica, seperti kode lab dan `baca.txt` bagian B.");
    harusAda("Naskah menulis bahwa app versi lama tanpa token membaca primary ([[E1]]). Itu Asumsi desain yang belum ada di kode lab, dan ADR ini belum memilihnya.");
  });
  test("ambang 30 detik dan jendela token tidak ada di kode: sumberTampil tanpa angka, tanpa waktu, dan tanpa lag", () => {
    const m = serviceReplika.match(/--8<-- \[start:sumber-tampil\]([\s\S]*?)--8<-- \[end:sumber-tampil\]/);
    expect(m).not.toBeNull();
    const fungsi = m![1]!.slice(m![1]!.indexOf("func (s Service) sumberTampil"));
    const tanpaString = fungsi.replace(/"[^"\n]*"/g, "");
    expect(tanpaString).not.toMatch(/\d/);
    expect(tanpaString.toLowerCase()).not.toMatch(/time|detik|lag|duration/);
    expect(serviceReplika).not.toContain("time.");
    harusAda("4. App menyimpan token selama 30 detik (Asumsi: tidak ada di kode lab, karena app Flutter tidak ada di lab).");
    harusAda("7. Bila replica tertinggal lebih dari 30 detik, semua bacaan tampil pindah ke primary (Asumsi: belum ada di kode lab, karena `sumberTampil` tidak punya ambang jeda).");
    expect(naskah).toContain("Jeda replica lebih dari 30 detik: semua bacaan pindah ke primary");
  });
  test("M41 naskah menyebut riwayat dan saldo tampil; kedua bacaan itu yang dialihkan lab (dua pemanggil sumberTampil, tidak lebih)", () => {
    expect(m41).toContain("riwayat dan saldo tampil");
    const pemanggil: string[] = [];
    const jalan = (dir: string) => {
      for (const e of fs.readdirSync(path.join(akar, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) { if (e.name !== "output") jalan(rel); continue; }
        if (!e.name.endsWith(".go") || e.name.endsWith("_test.go")) continue;
        for (const b of baris(baca(rel))) if (b.includes("s.sumberTampil(")) pemanggil.push(rel);
      }
    };
    jalan("labs/api-t5");
    expect(pemanggil.sort()).toEqual(["labs/api-t5/internal/service/replika.go", "labs/api-t5/internal/service/riwayat.go"]);
    expect(readmeLab).toContain("Bacaan yang dialihkan hanya riwayat dan saldo tampil");
    expect(readmeLab).toContain("Laporan merchant dari replica tidak dikerjakan lab ini");
    harusAda("Lab mengalihkan dua bacaan ke aturan kelas 2: `GET /akun/{id}` dan `GET /akun/{id}/riwayat`. Status top-up dan laporan merchant ada di naskah, dan `api-t5` membacanya dari primary tanpa aturan sumber tampil (Tidak dijalankan: dibaca dari kode lab).");
  });
});

describe("rekaman baca.txt: nilai di halaman dan di diagram diturunkan dari rekaman", () => {
  test("bagian A: saldo Rp250.000 di replica, Rp215.000 di primary, kiriman Rp240.000 ditolak 422 saldo-kurang", () => {
    // saldo di JSON bagian A berurutan: GET awal, jawaban bayar, GET dengan token (replica ditahan), GET sesudah replica menyusul
    expect(saldoA).toEqual([250000, 215000, 250000, 215000]);
    // bagian A: tiap bacaan tampilan (enam GET, dua pertama sebelum bayar) dijawab replica, dan itu dasar "saldo tampil di replica"
    expect(bagianA.filter((b) => b.startsWith("X-Dibaca-Dari:"))).toEqual(Array(6).fill("X-Dibaca-Dari: replika"));
    expect(saldoA[0]! - 35000).toBe(saldoA[1]);
    const kirim = bagianA.join("\n").match(/-d '\{"ke_nomor_karyawan": "K\d+", "nominal": (\d+)\}'/);
    expect(kirim).not.toBeNull();
    const nominalKirim = Number(kirim![1]);
    expect(nominalKirim).toBeGreaterThan(saldoA[1]!);
    expect(nominalKirim).toBeLessThanOrEqual(saldoA[0]!);
    const batas = Number(bagianA.join("\n").match(/pembayaran dibatasi Rp(\d+)\.(\d+) dan/)!.slice(1, 3).join(""));
    expect(nominalKirim).toBeGreaterThan(batas);
    expect(bagianA.join("\n")).toMatch(/HTTP\/1\.1 422 Unprocessable Entity[\s\S]*"type":"\/problems\/saldo-kurang"/);
    expect(bagianA.join("\n")).toContain("# Memakai kiriman, bukan pembayaran: satu pembayaran dibatasi Rp200.000 dan Rp240.000 ditolak oleh batas itu tanpa membaca saldo.");
    harusAda(`Di bagian A, saldo tampil ${rp(saldoA[0]!)} dan saldo di primary ${rp(saldoA[1]!)}. Kiriman ${rp(nominalKirim)} ke rekan dijawab 422 \`saldo-kurang\`.`);
    harusAda(`Di bagian A, kiriman ${rp(nominalKirim)} ditolak karena saldo di primary ${rp(saldoA[1]!)}, walau saldo tampil di replica masih ${rp(saldoA[0]!)}.`);
    harusAda(`Pembayaran tidak dipakai untuk bukti ini, karena satu pembayaran dibatasi ${rp(batas)} dan ${rp(nominalKirim)} ditolak oleh batas itu tanpa membaca saldo.`);
  });
  test("bagian B: urutan sumber bacaan, saldo, dan 422; nilai di halaman sama dengan rekaman", () => {
    expect(dibacaDari).toEqual(["replika", "primary", "primary", "replika", "replika"]);
    expect([nominalB, jawabBayarB, tanpaTokenB, denganTokenB, sesudahB]).toEqual([12000, 203000, 215000, 203000, 203000]);
    expect(tanpaTokenB - nominalB).toBe(jawabBayarB);
    expect(kali(bagianB.join("\n"), "HTTP/1.1 422 Unprocessable Entity")).toBe(2);
    expect(bagianB.join("\n")).toContain("posisi WAL seperti 0/3032C60");
    expect(bagianB.join("\n")).toContain("replika_sampai_posisi_tulis\n-----------------------------\n t\n");
    harusAda(`Budi membayar ${rp(nominalB)}, dan jawaban 201 membawa saldo ${rp(jawabBayarB)} serta token`);
    harusAda(`Bacaan saldo tanpa token dijawab replica dengan ${rp(tanpaTokenB)}. Bacaan yang membawa token dijawab primary dengan ${rp(denganTokenB)}.`);
    harusAda(`Sesudah replay dilanjutkan, pertanyaan yang sama dijawab sebaliknya. Query di replica menjawab \`t\`, dan token yang sama kini dilayani replica dengan saldo ${rp(sesudahB)}:`);
    harusAda(`Tanpa token, replica menjawab ${rp(tanpaTokenB)}, saldo lama. Dengan token, server membaca primary dan menjawab ${rp(denganTokenB)}`);
    harusAda("- Token yang bukan posisi WAL dijawab 422 (Rekaman lab, `baca.txt` bagian B). Kode lab memeriksa bentuknya sebelum bacaan tampil menyentuh replica atau primary (Tidak dijalankan: dibaca dari kode lab).");
  });
  test("diagram Inti: simpul dan sub diturunkan dari rekaman bagian B, sumber berlabel rekaman, dua baris ringkas", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t5-replika · baca.txt bagian B (pemutaran ulang di replica ditahan dengan sengaja)" });
    expect(d.baris.length).toBe(2);
    expect(d.baris.map((b) => b.label)).toEqual(["Tanpa token", "Dengan token"]);
    expect(d.baris[0]!.simpul.map((s) => s.teks)).toEqual(["Bayar: 201", "baca replica", `saldo lama ${rp(tanpaTokenB)}`]);
    expect(d.baris[0]!.simpul[0]!.sub).toBe(`saldo di jawaban ${rp(jawabBayarB)}`);
    expect(d.baris[0]!.simpul[1]!.sub).toBe(`X-Dibaca-Dari: ${dibacaDari[0]}`);
    expect(d.baris[1]!.simpul.map((s) => s.teks)).toEqual(["replica belum sampai", "baca primary", `saldo ${rp(denganTokenB)}`]);
    expect(d.baris[1]!.simpul[1]!.sub).toBe(`X-Dibaca-Dari: ${dibacaDari[1]}`);
    expect(d.baris[1]!.simpul[0]!.sub).toBe("posisi replay di bawah token");
    expect(d.baris[0]!.simpul[2]!.nada).toBe("warn");
    expect(d.baris[1]!.simpul[2]!.nada).toBe("good");
    expect(bacaTxt).toContain("# Dengan token: replika belum memutar WAL sampai posisi itu, jadi server membaca primary.");
    harusAda("<Rantai data={intiDiagram} ringkas />");
    harusAda("Sesudah menulis, bacaan milik sendiri dibaca dari primary sampai replica menyusul.");
    expect(d.catatan).toContain(`${rp(tanpaTokenB)} adalah saldo sesudah pembayaran ${rp(35000)} sebelumnya`);
    expect(saldoA).toContain(215000);
  });
  test("jeda.txt: jeda alami di bawah 1 detik pada 100 pembayaran per detik selama 10 detik, jeda buatan memberi selisih 5 jurnal", () => {
    expect(jedaTxt).toContain("# --- A. Jeda alami di bawah beban: 100 pembayaran per detik selama 10 detik ---");
    expect(jedaTxt).toContain("replay_lag tertinggi di kedua standby di bawah 1 detik (batas lab; nilai tidak direkam): ya");
    expect(jedaTxt).toContain("# Selisih jurnal bayar primary lawan replika yang ditahan: 5");
    expect(jedaTxt).toContain("# Pada beban ini jeda alami di bawah 1 detik. Jeda ±2 detik di cerita M41 tidak terjadi dengan sendirinya di laptop lab");
    harusAda("pada 100 pembayaran per detik selama 10 detik, jeda replay tertinggi di kedua standby ada di bawah 1 detik");
    harusAda("Lima pembayaran di primary belum terlihat di replica yang ditahan.");
    harusAda("Jeda ±2 detik di cerita M41 tidak terjadi sendiri, jadi `jeda.txt` bagian B menahan replay dengan `pg_wal_replay_pause()`.");
  });
  test("sinkron.txt: on selesai dan remote_apply menunggu di SyncRep selagi replay ditahan; replika_laporan tetap asinkron; selisih alami di bawah 1 ms", () => {
    for (const s of ["COMMIT dengan synchronous_commit = on selesai selagi replay ditahan: ya", "uji-remote-apply | IPC             | SyncRep", "COMMIT remote_apply selesai sesudah replay dilanjutkan dan barisnya terlihat: ya",
      "selisih COMMIT tercepat antara remote_apply dan on di bawah 1 ms: ya (nilai tidak direkam;", "replika_laporan  | streaming | async", "# replika_sinkron sinkron; replika_laporan tetap asinkron dan tidak ditunggu COMMIT."])
      expect(sinkronTxt, s).toContain(s);
    harusAda("Tanpa replay yang ditahan, selisih COMMIT tercepat keduanya di bawah 1 ms di laptop lab.");
    harusAda("Replica `replika_laporan` tetap asinkron dan tidak ditunggu COMMIT (`sinkron.txt` bagian A).", 1);
  });
});

describe("Snippet: berkas, rentang, dan region ada dan memuat yang dikutip halaman", () => {
  const tag = [...badan.matchAll(/<Snippet\s+([\s\S]*?)\s\/>\n/g)].map((m) => m[1]!);
  const atribut = (s: string, k: string): string | undefined => s.match(new RegExp(`(?:^|\\s)${k}="([^"]*)"`))?.[1];
  const berkas = tag.filter((t) => atribut(t, "file")).map((t) => ({ file: atribut(t, "file")!, lines: atribut(t, "lines"), region: atribut(t, "region") }));
  // nomor baris (1-based) dari isi berkas, bukan angka tulisan tangan: rentang bergeser bila lab diubah PR lain (#494 menggeser main.go di 5.5)
  const baca1 = (f: string) => baris(baca(f));
  const nomor = (f: string, cocok: (b: string) => boolean, dari = 0): number => {
    const i = baca1(f).findIndex((b, k) => k >= dari && cocok(b));
    if (i < 0) throw new Error(`${f}: baris tidak ditemukan`);
    return i + 1;
  };
  const tutup = (f: string, dari: number): number => nomor(f, (b) => b === "}", dari - 1);
  const BC = "labs/t5-replika/output/baca.txt", SK = "labs/t5-replika/output/sinkron.txt", HT = "labs/api-t5/internal/handler/handler_t5.go", SV = "labs/api-t5/internal/service/replika.go";
  const bAwalB = nomor(BC, (b) => b.startsWith("# --- B."));
  const b1 = nomor(BC, (b) => b.startsWith("replika=> SELECT pg_wal_replay_pause()"), bAwalB);
  const b1Akhir = nomor(BC, (b) => b === "X-Dibaca-Dari: primary", b1) + 2;
  const b2 = nomor(BC, (b) => b.startsWith("replika=> SELECT pg_last_wal_replay_lsn()"), bAwalB);
  const b2Akhir = nomor(BC, (b) => b.includes('"saldo":'), b2);
  const s1 = nomor(SK, (b) => b.startsWith("sinkron=> SELECT pg_wal_replay_pause()"));
  const s1Akhir = nomor(SK, (b) => b.startsWith("COMMIT remote_apply selesai sesudah replay dilanjutkan"), s1);
  const h1 = nomor(HT, (b) => b.startsWith("// tandaiTulis dipanggil"));
  const h1Akhir = tutup(HT, nomor(HT, (b) => b.startsWith("func tandaiSumber")));
  const t1 = nomor(SV, (b) => b.startsWith("// TokenTulis dipanggil"));
  const t1Akhir = tutup(SV, nomor(SV, (b) => b.startsWith("func (s Service) TokenTulis")));
  test("daftar Snippet berkas: tujuh, urut, rentang diturunkan dari isi berkas, region dikunci", () => {
    expect(berkas).toEqual([
      { file: "labs/api-t5/internal/repo/replika.go", lines: undefined, region: "lsn" },
      { file: SV, lines: undefined, region: "sumber-tampil" },
      { file: BC, lines: `${b1}:${b1Akhir}`, region: undefined },
      { file: BC, lines: `${b2}:${b2Akhir}`, region: undefined },
      { file: HT, lines: `${h1}:${h1Akhir}`, region: undefined },
      { file: SK, lines: `${s1}:${s1Akhir}`, region: undefined },
      { file: SV, lines: `${t1}:${t1Akhir}`, region: undefined },
    ]);
    expect(tag.filter((t) => t.includes("code={")).length).toBe(3);
  });
  test("judul Snippet: rekaman memuat berkas dan huruf bagian yang benar (diturunkan dari kepala # --- X.), kode memuat path-nya", () => {
    for (const t of tag.filter((x) => atribut(x, "file"))) {
      const f = atribut(t, "file")!, judul = atribut(t, "title")!, rentang = atribut(t, "lines");
      if (f.includes("/output/")) {
        const L = baca1(f);
        const mulai = Number(rentang!.split(":")[0]);
        const huruf = [...L.slice(0, mulai).join("\n").matchAll(/^# --- ([A-Z])\./gm)].map((m) => m[1]).pop();
        expect(judul.startsWith(`Rekaman lab: ${f}, bagian ${huruf} (`), judul).toBe(true);
      } else {
        expect(judul).toBe(f);
      }
    }
  });
  test("region ada di kode (satu mulai, satu akhir)", () => {
    for (const [f, r] of [["labs/api-t5/internal/repo/replika.go", "lsn"], ["labs/api-t5/internal/service/replika.go", "sumber-tampil"]] as const) {
      const t = baca(f);
      expect(kali(t, `--8<-- [start:${r}]`), `${f} ${r}`).toBe(1);
      expect(kali(t, `--8<-- [end:${r}]`), `${f} ${r}`).toBe(1);
      expect(t.indexOf(`[start:${r}]`)).toBeLessThan(t.indexOf(`[end:${r}]`));
    }
  });
  test("rentang baris mengutip tepat yang dikatakan teks di sekitarnya", () => {
    const rentang = (f: string, a: number, b: number): string[] => baris(baca(f)).slice(a - 1, b);
    const bt = rentang("labs/t5-replika/output/baca.txt", 77, 98);
    expect(bt[0]).toBe("replika=> SELECT pg_wal_replay_pause()   # jeda buatan");
    expect(bt[bt.length - 1]).toContain(`"saldo":${denganTokenB}`);
    expect(bt.filter((b) => b.startsWith("X-Dibaca-Dari:"))).toEqual(["X-Dibaca-Dari: replika", "X-Dibaca-Dari: primary"]);
    const bs = rentang("labs/t5-replika/output/baca.txt", 116, 127);
    expect(bs[0]).toMatch(/^replika=> SELECT pg_last_wal_replay_lsn\(\) >= '<LSN tulis 2>'::pg_lsn/);
    expect(bs.join("\n")).toContain(" t\n");
    expect(bs[bs.length - 1]).toContain(`"saldo":${sesudahB}`);
    const hd = rentang("labs/api-t5/internal/handler/handler_t5.go", 20, 32);
    expect(hd[0]).toBe("// tandaiTulis dipanggil sesudah tulisan app berhasil di-COMMIT.");
    expect(hd.join("\n")).toContain("func (s Server) tandaiTulis(");
    expect(hd.join("\n")).toContain("func tandaiSumber(");
    expect(hd[hd.length - 1]).toBe("}");
    const sk = rentang("labs/t5-replika/output/sinkron.txt", 29, 38);
    expect(sk[0]).toBe("sinkron=> SELECT pg_wal_replay_pause()   # jeda buatan");
    expect(sk[sk.length - 1]).toBe("COMMIT remote_apply selesai sesudah replay dilanjutkan dan barisnya terlihat: ya");
    const tk = rentang("labs/api-t5/internal/service/replika.go", 75, 87);
    expect(tk[0]).toMatch(/^\/\/ TokenTulis dipanggil sesudah COMMIT/);
    expect(tk.join("\n")).toContain("func (s Service) TokenTulis(");
    expect(tk[tk.length - 1]).toBe("}");
  });
});

describe("klaim tentang kode api-t5, dilingkupi folder dan jenis berkas yang dibaca", () => {
  test("token: LSNTulis dan SampaiLSN memakai pg_current_wal_lsn dan pg_last_wal_replay_lsn, NULL dibaca belum sampai, token dipasang sebagai parameter", () => {
    expect(repoReplika).toContain("SELECT pg_current_wal_lsn()::text");
    expect(repoReplika).toContain("SELECT pg_last_wal_replay_lsn() >= $1::pg_lsn");
    expect(repoReplika).toContain("return sampai.Valid && sampai.Bool, err");
    expect(repoReplika).toContain("tidak tahu\n// dibaca sebagai belum sampai");
    expect(serviceReplika).toContain("polaLSN = regexp.MustCompile(`^[0-9A-Fa-f]{1,8}/[0-9A-Fa-f]{1,8}$`)");
    expect(serviceReplika).toContain('ErrValidasi{"X-Lsn-Tulis", "posisi WAL seperti 0/3032C60"}');
    harusAda("Kode lab membaca NULL sebagai belum sampai (Tidak dijalankan: dibaca dari kode lab).");
  });
  test("sumberTampil: replica hanya bila token sudah sampai; belum sampai atau replica tidak menjawab: primary", () => {
    expect(serviceReplika).toMatch(/sampai, err := s\.replika\.SampaiLSN\(ctx, token\)\s*\n\s*if err != nil \|\| !sampai \{/);
    expect(serviceReplika).toMatch(/return s\.repo, SumberPrimary, nil\s*\n\s*\}\s*\n\s*return s\.replika, SumberReplika, nil/);
    harusAda("Bila belum, atau bila replica tidak menjawab, server membaca primary.");
  });
  test("TokenTulis kosong bila posisi tidak terbaca, dan token hanya dipasang oleh dua handler tulis (bayar dan kirim)", () => {
    expect(serviceReplika).toMatch(/func \(s Service\) TokenTulis\(ctx context\.Context\) string \{\s*\n\s*if s\.replika == nil \{\s*\n\s*return ""\s*\n\s*\}/);
    expect(serviceReplika).toMatch(/lsn, err := s\.repo\.LSNTulis\(ctx\)\s*\n\s*if err != nil \{\s*\n\s*log\.Printf\("posisi WAL tulis tidak terbaca: %v", err\)\s*\n\s*return ""/);
    const panggilan = baris(handlerUtama).map((b, i) => [i, b] as const).filter(([, b]) => b.includes("s.tandaiTulis(w, r)")).map(([i]) => i);
    expect(panggilan.length).toBe(2);
    const sebelum = (i: number): string => baris(handlerUtama).slice(0, i).reverse().find((b) => b.startsWith("func (s Server) "))!;
    expect(panggilan.map((i) => sebelum(i).match(/^func \(s Server\) (\w+)/)![1])).toEqual(["bayar", "kirim"]);
    const semua: string[] = [];
    const jalan = (dir: string) => {
      for (const e of fs.readdirSync(path.join(akar, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) { jalan(rel); continue; }
        if (e.name.endsWith(".go") && !e.name.endsWith("_test.go") && baca(rel).includes("tandaiTulis(w, r)")) semua.push(rel);
      }
    };
    jalan("labs/api-t5/internal/handler");
    expect(semua.sort()).toEqual(["labs/api-t5/internal/handler/handler.go"]);
    harusAda("Di lab, kepala `X-Lsn-Tulis` dipasang sesudah COMMIT, dan hanya di jawaban `POST /transfers` dan `POST /kiriman` (Tidak dijalankan: dibaca dari kode lab).");
    harusAda("- Bila posisi WAL tidak terbaca, server tidak memberi token, dan app membaca replica (Tidak dijalankan: dibaca dari kode lab).");
  });
  test("jawaban Idempotency-Key yang diputar ulang hanya menulis status, Content-Type, Location, dan isi (tanpa kepala token)", () => {
    const ulang = handlerIdem.slice(handlerIdem.indexOf("case repo.KlaimUlang:"), handlerIdem.indexOf("default:"));
    expect([...ulang.matchAll(/w\.Header\(\)\.Set\("([^"]+)"/g)].map((m) => m[1])).toEqual(["Content-Type", "Location"]);
    expect(ulang).toContain("w.WriteHeader(t.Status)");
    expect(ulang).toContain("io.WriteString(w, t.Isi)");
    expect(handlerIdem).not.toMatch(/Lsn|TokenTulis|tandaiTulis/);
    harusAda("- Jawaban yang diputar ulang lewat Idempotency-Key hanya membawa status, Content-Type, Location, dan isi. App yang mengulang tulisan tidak mendapat token baru (Tidak dijalankan: dibaca dari kode lab).");
  });
  test("pemilik akun diperiksa sebelum token dibaca, jadi token besar hanya memindahkan bacaan milik sendiri; dan LSN mentah", () => {
    const fn = serviceReplika.slice(serviceReplika.indexOf("func (s Service) LihatAkunTampil"));
    expect(fn.indexOf("if peminta != id")).toBeGreaterThan(-1);
    expect(fn.indexOf("if peminta != id")).toBeLessThan(fn.indexOf("s.sumberTampil(ctx, token)"));
    expect("0/3032C60").toMatch(/^[0-9A-Fa-f]{1,8}\/[0-9A-Fa-f]{1,8}$/);
    expect("FFFFFFFF/FFFFFFFF").toMatch(/^[0-9A-Fa-f]{1,8}\/[0-9A-Fa-f]{1,8}$/);
    expect(handlerT5).toContain('KepalaLSNTulis   = "X-Lsn-Tulis"');
    expect(repoReplika).toContain("posisi ini tidak lebih kecil dari rekaman commit milik penulis");
    harusAda("- Token sah yang sangat besar membuat server membaca primary. Satu user hanya memindahkan bacaan tampil miliknya, karena pemilik akun diperiksa lebih dulu (Tidak dijalankan: dibaca dari kode lab).");
    harusAda("- Token adalah posisi WAL mentah, jadi selisih dua token memperlihatkan berapa banyak seluruh database menulis di antaranya (Tidak dijalankan: dibaca dari kode lab).");
  });
  test("klaim negatif: kode api-t5 tidak mengatur synchronous_commit (lingkup: folder labs/api-t5, semua berkas selain output dan tes)", () => {
    const ketemu: string[] = [];
    const jalan = (dir: string) => {
      for (const e of fs.readdirSync(path.join(akar, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) { if (!["output", "node_modules", ".git"].includes(e.name)) jalan(rel); continue; }
        if (e.name.endsWith("_test.go")) continue;
        if (/\.(go|sql|yml|yaml|sh|py|mod|env|md|txt|toml|json)$/.test(e.name) || e.name === "Makefile" || e.name === "Dockerfile") if (baca(rel).includes("synchronous_commit")) ketemu.push(rel);
      }
    };
    jalan("labs/api-t5");
    expect(ketemu).toEqual([]);
    harusAda("6. Token tidak berlaku untuk tulisan dengan `synchronous_commit = off`. Kode `api-t5` tidak mengatur nilai itu (penalaran dari dokumentasi).");
    harusAda("Ini penalaran dari dokumentasi (Tidak dijalankan), dan kode `api-t5` tidak mengatur `synchronous_commit`.");
  });
});

describe("beban dan hitungan: diulang dari angka yang tertulis di halaman", () => {
  const a = (registry.tahap as unknown as { asumsi: { user: number; aktif: number; req: number; puncak: number; trx: number } }[])[4]!.asumsi;
  const aktif = (a.user * a.aktif) / 100;
  const puncak = ((aktif * a.req) / 86400) * a.puncak;
  const trx3 = ((aktif * 3) / 86400) * a.puncak;
  const trx2 = ((aktif * a.trx) / 86400) * a.puncak;
  test("1.388,9 request, 69,4 transaksi (3 per user aktif) dan 46,3 (2), dari registry; naskah memuat bentuk yang sama", () => {
    expect([a.user, a.aktif, a.req, a.puncak, a.trx]).toEqual([1000000, 20, 60, 10, 2]);
    expect([fmt(puncak, 1), fmt(trx3, 1), fmt(trx2, 1)]).toEqual(["1.388,9", "69,4", "46,3"]);
    expect(naskah).toContain(`138,9 rata-rata dan ${fmt(puncak, 1)} puncak`);
    expect(naskah).toContain(`${fmt(trx3, 1)} puncak (trx 2: 4,63 dan ${fmt(trx2, 1)})`);
    harusAda(`puncak ${fmt(puncak, 1)} request per detik, dan ${fmt(trx3, 1)} transaksi uang per detik dengan 3 transaksi per user aktif per hari. Dengan 2 transaksi angkanya ${fmt(trx2, 1)}.`);
  });
  test("tabel Hitungan: 69,4 per detik (46,3), 5,0% (3,3%) dengan pembulatan setengah ke atas, rumus ditulis dari angka yang tertulis", () => {
    const t = tabelMdx("| Besaran | Rumus | Hasil |");
    const r3 = (trx3 / puncak) * 100;
    const r2 = (trx2 / puncak) * 100;
    // hitungan dari angka yang tertulis (dibulatkan), seperti pembaca
    const tertulis3 = (69.4 / 1388.9) * 100;
    const tertulis2 = (46.3 / 1388.9) * 100;
    expect([fmt(r3, 1), fmt(r2, 1), fmt(tertulis3, 1), fmt(tertulis2, 1)]).toEqual(["5,0", "3,3", "5,0", "3,3"]);
    expect(t.slice(2)).toEqual([
      ["Bacaan bertoken, satu per transaksi uang (Asumsi)", "sama dengan transaksi uang puncak", `${fmt(trx3, 1)} per detik (${fmt(trx2, 1)})`],
      ["Porsi dari semua request", `${fmt(trx3, 1)} ÷ ${fmt(puncak, 1)}`, `${fmt(tertulis3, 1)}% (${fmt(trx2, 1)} ÷ ${fmt(puncak, 1)} = ${fmt(tertulis2, 1)}%)`],
    ]);
    harusAda("Hitungan di bawah adalah hasil rumus dari angka yang tertulis di halaman ini, dan berlabel Asumsi karena masukannya Asumsi.");
    expect(kali(badan, "5,0%")).toBe(6);
    expect(kali(badan, "3,3%")).toBe(2);
    harusAda("Bila satu bacaan bertoken per transaksi pergi ke primary, tambahannya 5,0% dari puncak request, dan bacaan lain tetap di replica.");
    harusAda("Satu bacaan per transaksi adalah Asumsi. Token berlaku 30 detik di rancangan, dan app yang membaca berkali-kali dalam jendela itu menambah bacaan bertoken, misalnya saldo dan riwayat. Jumlahnya tidak diukur.");
  });
  test("26,4 koneksi: dari halaman 5.4 (rumus ditulis di sana), diulang di sini; 5 − 1 = 4 detik; ambang 20% dan 30 detik sama dengan naskah", () => {
    expect(m40).toContain(`(${fmt(puncak, 1)} − ${fmt(trx3, 1)}) × 0,02 = 26,4 koneksi`);
    expect(fmt((1388.9 - 69.4) * 0.02, 1)).toBe("26,4");
    expect(kali(badan, "26,4 koneksi")).toBe(2);
    harusAda("Bacaan selain uang memakai 26,4 koneksi di primary pada puncak (Hitungan atas Asumsi, rumus di [[t5-m40]])", 1);
    harusAda("dan 26,4 koneksi bacaan selain uang kembali ke primary.");
    expect(5 - 1).toBe(4);
    harusAda("Replica menyusul dalam 1 detik, batas yang diperiksa lab. Jendela lalu membaca primary paling sedikit 5 − 1 = 4 detik terlalu lama (Hitungan atas batas lab).");
    expect(naskah).toContain("Lebih dari 20% bacaan berakhir di primary");
    harusAda("| Lebih dari 20% bacaan bertoken berakhir di primary (Asumsi) |");
    harusAda("| Replica tertinggal lebih dari 30 detik (Asumsi) |");
  });
  test("label turunan didefinisikan di pemakaian pertama: Simulasi di blok Coba sebelum widget, Hitungan di blok Paham sebelum tabel", () => {
    const def = "Hasilnya Simulasi, yaitu keluaran aturan yang ditulis di halaman ini dan di widget, bukan hasil sistem.";
    expect(badan.indexOf("Simulasi")).toBe(badan.indexOf(def) + "Hasilnya ".length);
    expect(badan.indexOf("Simulasi")).toBeLessThan(badan.indexOf("<JedaReplica />"));
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("Hitungan di bawah adalah hasil rumus dari angka yang tertulis di halaman ini"));
    expect(badan.indexOf("Hitungan")).toBeGreaterThan(badan.indexOf('<Blok nama="Paham">'));
    expect(badan.indexOf("Hitungan")).toBeLessThan(badan.indexOf("| Besaran | Rumus | Hasil |"));
  });
});

describe("widget W5-lag: pemasangan, token dijelaskan sebelum widget, dan kalimat Ubah satu hal sesuai logika widget", () => {
  test("satu widget di blok Coba, dipasang tanpa prop, dengan token dan WAL dijelaskan lebih dulu", () => {
    harusAda("<JedaReplica />");
    expect(halaman).toContain('import JedaReplica from "../../../components/JedaReplica.astro";');
    const coba = badan.slice(badan.indexOf('<Blok nama="Coba"'), badan.indexOf('<Blok nama="Paham"'));
    expect(coba).toContain("<JedaReplica />");
    expect(coba.indexOf("Token adalah isi kepala `X-Lsn-Tulis` pada jawaban bayar.")).toBeGreaterThan(-1);
    expect(coba.indexOf("Token adalah isi kepala")).toBeLessThan(coba.indexOf("<JedaReplica />"));
    expect(coba.indexOf("LSN (log sequence number) adalah posisi di WAL")).toBeLessThan(coba.indexOf("<JedaReplica />"));
    expect(W.tebak.q).toContain("tanpa token");
    expect(kali(coba, "<Snippet")).toBe(0);
  });
  test("Ubah satu hal: jeda ditahan memberi Rp250.000 (replica), Rp215.000 (token, primary), dan bayar belum selesai (remote_apply)", () => {
    const j = jedaDari(W, "ditahan");
    const r = hitung(W, j, "replica");
    const t = hitung(W, j, "token");
    const ra = hitung(W, j, "remote_apply");
    expect([r.saldo, r.sumber, r.kasus]).toEqual([W.skenario.saldoAwal, "replica", "lama"]);
    expect([t.saldo, t.sumber, t.kasus]).toEqual([W.skenario.saldoAwal - W.skenario.bayar, "primary", "keprimary"]);
    expect([ra.saldo, ra.kasus]).toEqual([null, "macet"]);
    expect(W.aturan.map((x) => x.label)).toEqual(["Replica biasa", "Token LSN", "remote_apply"]);
    harusAda(`**Ubah satu hal:** pilih jeda ditahan, lalu aturan Replica biasa. Layar Budi menampilkan ${rp(r.saldo!)} dari replica. Ganti ke Token LSN, dan layar menampilkan ${rp(t.saldo!)} dari primary. Ganti ke remote_apply, dan bayar belum selesai selama replay ditahan.`);
    expect(W.skenario.saldoAwal - W.skenario.bayar).toBe(215000);
    harusAda(`Widget ini menunjukkan layar Budi sesudah membayar ${rp(W.skenario.bayar)}, dengan tiga aturan baca.`);
    expect(W.sumber.teks).toContain("Jeda yang kamu geser adalah Simulasi.");
    // widget memakai angka yang sama dengan rekaman bagian A
    expect([W.skenario.saldoAwal, W.skenario.saldoAwal - W.skenario.bayar]).toEqual([250000, 215000]);
    expect(bagianA.join("\n")).toContain('"nominal": 35000');
  });
});

describe("sumber luar: tautan, versi, tanggal, dan baris riset R5-140 sampai R5-144", () => {
  const tanggal = "2026-11-03";
  const urlHalaman = [...halaman.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!);
  test("baris riset: lima baris, urut naik, tanpa ID ganda, lima kolom, tanggal akses 2026-11-03, di antara baris R5-129 dan R5-155 (rentang, bukan tetangga)", () => {
    const id = [...riset.matchAll(/^\| (R5-\d+) \|/gm)].map((m) => Number(m[1]!.slice(3)));
    expect(new Set(id).size).toBe(id.length);
    expect([...id].sort((x, y) => x - y)).toEqual(id);
    const milik = ["R5-140", "R5-141", "R5-142", "R5-143", "R5-144"];
    expect(id.filter((x) => x >= 140 && x <= 144)).toEqual([140, 141, 142, 143, 144]);
    for (const m of milik) {
      const b = barisRiset(m);
      expect(b.split(" | ").length, m).toBe(5);
      expect(b.endsWith(" |"), m).toBe(true);
      expect(kali(b, tanggal), m).toBeGreaterThanOrEqual(1);
    }
  });
  test("tautan di halaman: tiap alamat luar muncul di baris riset yang memuatnya; versi dokumentasi PostgreSQL 17, Laravel 13.x, Django 6.1", () => {
    const peta: [string, string, string][] = [
      ["https://www.postgresql.org/docs/17/warm-standby.html", "R5-141", "postgresql.org/docs/17/warm-standby.html"],
      ["https://www.postgresql.org/docs/17/runtime-config-wal.html", "R5-141", "postgresql.org/docs/17/runtime-config-wal.html"],
      ["https://www.postgresql.org/docs/17/functions-admin.html", "R5-140", "postgresql.org/docs/17/functions-admin.html"],
      ["https://www.allthingsdistributed.com/2008/12/eventually_consistent.html", "R5-142", "allthingsdistributed.com/2008/12/eventually_consistent.html"],
      ["https://laravel.com/docs/13.x/database", "R5-143", "laravel.com/docs/13.x/database"],
      ["https://docs.djangoproject.com/en/6.1/topics/db/multi-db/", "R5-143", "docs.djangoproject.com/en/6.1/topics/db/multi-db/"],
      ["https://github.com/prisma/extension-read-replicas", "R5-143", "github.com/prisma/extension-read-replicas"],
      ["https://supabase.com/docs/guides/platform/read-replicas", "R5-143", "supabase.com/docs/guides/platform/read-replicas"],
      ["https://docs.serverpod.dev/concepts/data-and-the-database/database/connection", "R5-143", "docs.serverpod.dev/concepts/data-and-the-database/database/connection"],
    ];
    for (const [url, id, potong] of peta) {
      expect(urlHalaman, url).toContain(url);
      expect(barisRiset(id), `${id} ${potong}`).toContain(potong);
    }
    expect(new Set(urlHalaman)).toEqual(new Set(peta.map((p) => p[0])));
    expect(urlHalaman.length).toBe(urlHalaman.filter((u) => u.startsWith("https://")).length);
    const dibuka = [...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
    expect(dibuka.length).toBeGreaterThanOrEqual(8);
    expect(new Set(dibuka)).toEqual(new Set([tanggal]));
    expect(badan).not.toMatch(/diakses|dikunjungi/);
  });
  test("kalimat tentang dokumentasi dicocokkan dengan kutipan di baris riset (kutipan Inggris asli)", () => {
    const r141 = barisRiset("R5-141"), r140 = barisRiset("R5-140"), r142 = barisRiset("R5-142"), r143 = barisRiset("R5-143");
    expect(r141).toContain("there is a small delay between committing a transaction in the primary and the changes becoming visible in the standby");
    expect(r141).toContain("typically under one second assuming the standby is powerful enough to keep up with the load");
    expect(r141).toContain("much larger commit delays than previous settings since it waits for WAL replay");
    expect(r141).toContain("In simple cases, this allows for load balancing with causal consistency");
    expect(r141).toContain("tiga kali `wal_writer_delay`");
    expect(r140).toContain("Returns the current write-ahead log write location");
    expect(r140).toContain("the function returns NULL");
    expect(r140).toContain("penalaran penulis");
    expect(r142).toContain("tidak pernah melihat nilai yang lebih lama");
    expect(r142).toContain("23 Desember 2008");
    expect(r143).toContain("bawaan 2 detik");
    expect(r143).toContain("tidak memengaruhi sesi atau koneksi lain");
    expect(r143).toContain("doesn't provide any solution for handling replication lag");
    expect(r143).toContain("npm 0.5.0");
    expect(r143).toContain("butuh Prisma 7.0 ke atas");
    expect(r143).toContain("Serverpod 4.1.0");
    harusAda("bagian 26.2.5, dibuka 2026-11-03, Tidak dijalankan");
    harusAda("bagian 26.2.8.1, dibuka 2026-11-03");
    harusAda("23 Desember 2008, dibuka 2026-11-03");
    harusAda("Dokumentasi menulis ada jeda kecil antara COMMIT di primary dan terlihat di standby, yaitu server yang menerima WAL dari primary dan memutarnya ulang. Jedanya biasanya di bawah satu detik bila standby sanggup mengikuti beban");
    harusAda("Dokumentasi menulis bahwa pengaturan ini menyebabkan jeda commit jauh lebih besar karena menunggu replay WAL. Dalam kasus sederhana ia memungkinkan load balancing dengan causal consistency");
    harusAda("Fungsi kedua mengembalikan NULL bila server dijalankan normal tanpa recovery");
    harusAda("Middleware itu memakai 2 detik bawaan, dan dokumentasi menulis tujuannya mencegah user melihat data lama selagi replica menyusul");
  });
  test("tab stack: enam label berurutan, slot t0 sampai t5 memuat nama stack-nya, hanya Go dijalankan, kelima lain Tidak dijalankan bertanggal", () => {
    harusAda('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    const slot = [...badan.matchAll(/<Fragment slot="t(\d)">([\s\S]*?)<\/Fragment>/g)].map((m) => [Number(m[1]), m[2]!] as const);
    expect(slot.map((s) => s[0])).toEqual([0, 1, 2, 3, 4, 5]);
    const kunci = ["Dijalankan: lab api-t5 dan t5-replika, PostgreSQL 17.11, Go 1.27.3, dan pgx v5.11.0", "@prisma/extension-read-replicas", "Laravel 13.x", "Django 6.1", "Serverpod", "Supabase"];
    slot.forEach(([i, t]) => { expect(t, `slot ${i}`).toContain(kunci[i]!); });
    for (const [i, t] of slot.slice(1)) {
      expect(t, `slot ${i}`).toContain("*Tidak dijalankan.");
      expect(t, `slot ${i}`).toContain(tanggal);
    }
    expect(slot[0]![1]).not.toContain("Tidak dijalankan.");
    expect(slot[5]![1]).toContain("tanpa nomor versi");
    expect(slot[4]![1]).toContain("Serverpod 4.1.0");
    expect(slot[4]![1]).toContain("Di 37 halaman pada peta situsnya yang alamatnya memuat database, kata replica hanya muncul dalam replication, di dua halaman.");
    expect(slot[4]![1]).not.toContain("[perlu verifikasi]");
    expect(barisRiset("R5-143")).toContain("Serverpod 4.1.0");
    expect(barisRiset("R5-143")).toContain("37 halaman");
    expect(barisRiset("R5-133")).toContain("37 halaman");
    expect(barisRiset("R5-133")).toContain("Serverpod Framework 4.1.0");
    const vNpm = barisRiset("R5-143").match(/npm (\d+\.\d+\.\d+)/)![1];
    expect(slot[1]![1]).toContain(`(npm ${vNpm}, versi terbaru di npm saat dibuka ${tanggal}, butuh Prisma 7.0 ke atas)`);
    expect(barisRiset("R5-143")).toContain("Laravel 13.x Database");
    expect(barisRiset("R5-143")).toContain("Django 6.1 Multiple databases");
    expect(readmeLab).toContain("| PostgreSQL | 17.11 (`postgres:17`, Debian 17.11-1.pgdg13+2)");
    expect(readmeLab).toContain("| Go | 1.27.3 |");
    expect(readmeLab).toContain("| pgx | v5.11.0 (MIT) |");
    expect(bacaTxt).toContain("PostgreSQL 17.11");
    expect(bacaTxt).toContain("go1.27.3 · pgx v5.11.0");
    const tabLaravel = slot[2]![1];
    expect(tabLaravel).toContain("2 detik bawaan (di sini 5)");
    expect(tabLaravel).toContain("PreventStaleDatabaseReads::for(5)");
    expect(tabLaravel).toContain("opsi B di ADR 47");
  });
});

describe("tabel: jumlah kolom sama di header, pemisah, dan tiap baris; isi ADR dikunci per sel", () => {
  test("semua tabel GFM halaman: kolom konsisten", () => {
    const L = baris(halaman);
    let n = 0;
    for (let i = 0; i < L.length; i++) {
      if (!L[i]!.startsWith("|") || (i > 0 && L[i - 1]!.startsWith("|"))) continue;
      let j = i;
      const lebar = L[i]!.split("|").length;
      while (j < L.length && L[j]!.startsWith("|")) { expect(L[j]!.split("|").length, `baris ${j + 1}`).toBe(lebar); j++; }
      expect(L[i + 1]!.replace(/[|\s:-]/g, ""), `pemisah ${i + 2}`).toBe("");
      n++;
    }
    expect(n).toBe(5);
  });
  test("tabel ADR: lima opsi A sampai E, lima baris (cara kerja, kelebihan, kekurangan, biaya, bukti), opsi E berisi token", () => {
    const t = tabelMdx("| | A. `remote_apply` untuk semua commit |");
    expect(t[0]).toEqual(["", "A. `remote_apply` untuk semua commit", "B. Jendela waktu tetap", "C. Semua bacaan ke primary", "D. App menyimpan transaksinya sendiri", "E. Token posisi WAL"]);
    expect(t.slice(2).map((r) => r[0])).toEqual(["Cara kerja", "Kelebihan", "Kekurangan", "Biaya operasional", "Bukti"]);
    expect(t.slice(2).every((r) => r.length === 6)).toBe(true);
    // opsi naskah: A, B, C, D sama dengan empat opsi di baris ADR 47 naskah, dan E adalah keputusan
    const adr47 = naskah.split("\n").find((b) => b.startsWith("| 47 |")) ?? "";
    for (const s of ["`remote_apply` untuk semua commit", "jendela waktu tetap 5 detik", "semua baca ke primary", "menyimpan transaksi sendiri di app"]) expect(adr47).toContain(s);
    expect(t[2]![1]).toContain("COMMIT menunggu standby sinkron memutar WAL");
    expect(t[2]![2]).toContain("selama 5 detik tetap");
    expect(t[2]![3]).toContain("seperti sebelum ADR 46");
    expect(t[2]![5]).toContain("hanya bila sudah sampai posisi itu");
    expect(t[6]![1]).toContain("`sinkron.txt` bagian A dan B");
    expect(t[6]![2]).toContain("lab tidak memerankan jendela waktu");
    expect(t[6]![5]).toContain("`baca.txt` bagian B");
    expect(t[5]![3]).toContain("26,4 koneksi");
  });
  test("keputusan: delapan aturan bernomor, opsi E, empat alasan A sampai D, tiga pre-mortem, enam baris kapan salah, empat baris sengaja belum", () => {
    harusAda("**Keputusan: opsi E.** Delapan aturan:");
    const aturan = baris(badan.slice(badan.indexOf("**Keputusan: opsi E.**"), badan.indexOf("**Kenapa E, bukan A, B, C, atau D.**"))).filter((b) => /^\d+\. /.test(b));
    expect(aturan.map((b) => b.match(/^(\d+)\./)![1])).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    const alasan = baris(badan.slice(badan.indexOf("**Kenapa E, bukan A, B, C, atau D.**"), badan.indexOf("**Kasus industri: Laravel.**"))).filter((b) => b.startsWith("- **"));
    expect(alasan.map((b) => b.slice(0, 15))).toEqual(["- **A ditolak**", "- **B ditolak**", "- **C ditolak**", "- **D ditolak**"]);
    const pre = baris(badan.slice(badan.indexOf("**Pre-mortem.**"), badan.indexOf("**Kapan keputusan ini salah.**"))).filter((b) => /^\d+\. /.test(b));
    expect(pre.length).toBe(3);
    const salah = tabelMdx("| Salah saat | Yang diperiksa | Angka sekarang | Dibaca dari |");
    expect(salah.length - 2).toBe(6);
    expect(salah.every((r) => r.length === 4)).toBe(true);
    const sengaja = tabelMdx("| Yang ditunda | Kenapa ditunda | Muncul lagi di |");
    expect(sengaja.length - 2).toBe(4);
    expect(sengaja.every((r) => r.length === 3)).toBe(true);
    const kelas = tabelMdx("| Kelas | Contoh | Dibaca dari | Dasar |");
    expect(kelas.slice(2).map((r) => r[0])).toEqual(["1. Menentukan uang", "2. Milik sendiri sesudah menulis", "3. Laporan dan bacaan lain"]);
    expect(kelas.slice(2).map((r) => r[2])).toEqual(["primary, di dalam transaction", "primary sampai replica sampai token, sesudah itu replica", "replica"]);
    expect(kelas[2]![1]).toContain("status top-up yang akan dikredit");
    harusAda("**Status:** diterima sesudah M41, dan memperluas aturan 2 ADR 45 tanpa membatalkan ADR 46.");
  });
  test("kata dan istilah: tanpa 'replika' di prosa (di luar kode), tanpa 'layanan', 'pengguna', 'Anda', 'kita'; ID riset dan nomor keputusan tidak tampil", () => {
    const prosa = tanpaKode(badan);
    expect(prosa.replace(/t5-replika/g, "")).not.toMatch(/\breplika\b/i);
    expect(prosa).not.toMatch(/\b(layanan|pengguna|Anda|kita|pelanggan|pembeli)\b/);
    expect(halaman).not.toMatch(/\bR\d-\d+\b/);
    expect(halaman).not.toMatch(/keputusan \d+/i);
    expect(JSON.stringify(rantaiMentah)).not.toMatch(/\bR\d-\d+\b|keputusan \d+/i);
    expect(halaman).not.toMatch(/#\d{3}\b/);
  });
  test("Cek diri: empat soal, empat jawaban, tiga pertanyaan di Mulai, satu details question; kartu ulang diturunkan dari soal", () => {
    expect(kali(badan, '<details class="success">')).toBe(4);
    expect(kali(badan, '<details class="question">')).toBe(1);
    const soal = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(soal.length).toBe(4);
    const kartu = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { halaman: string; tanya: string; jawab: string }[];
    const milik = kartu.filter((k) => k.halaman === "t5-lag");
    expect(milik.map((k) => k.tanya)).toEqual(soal);
    expect(milik.every((k) => k.jawab.length > 20)).toBe(true);
    const mulai = badan.slice(0, badan.indexOf('<Blok nama="Coba"'));
    expect(baris(mulai).filter((b) => /^\d\. /.test(b)).length).toBe(3);
    harusAda("Yakin dengan ketiganya? Lompat ke [[berikutnya]].");
  });
});


describe("pertahanan tambahan: sel tabel, angka di prosa, label, rujukan bagian, dan baris riset diturunkan atau dikunci per kolom", () => {
  const sel = (awalan: string, kunci: string[][]) => {
    const t = tabelMdx(awalan).slice(2);
    expect(t.length).toBe(kunci.length);
    t.forEach((baris, i) => {
      kunci[i]!.forEach((k, j) => {
        if (k === "") return;
        expect(baris[j], `${awalan.slice(0, 20)} baris ${i} kolom ${j}`).toContain(k);
        // kata kunci milik satu kolom tidak boleh muncul di kolom lain pada baris yang sama (menangkap sel yang ditukar)
        baris.forEach((s, m) => { if (m !== j && kunci[i]![m] !== "" ) expect(s.includes(k) && !s.includes(kunci[i]![m]!), `${k} di kolom ${m}`).toBe(false); });
      });
    });
  };
  test("tabel ADR: tiap sel dikunci pada kata kuncinya per baris dan kolom", () => {
    sel("| | A. `remote_apply` untuk semua commit |", [
      ["Cara kerja", "COMMIT menunggu standby sinkron memutar WAL", "selama 5 detik tetap", "seperti sebelum ADR 46", "transaksi baru di layarnya sendiri", "posisi WAL, dan server membaca replica hanya bila"],
      ["Kelebihan", "pasti sudah memuat tulisannya", "tanpa token, dan ada framework", "Tidak ada replica yang tertinggal", "Tidak ada bacaan tambahan di primary", "hanya selama replica belum sampai"],
      ["Kekurangan", "Tiap COMMIT menunggu replay, dan replica asinkron untuk bacaan tampil tidak ditunggu", "Tidak mengikuti jeda sebenarnya: terlalu pendek, saldo lama muncul lagi, terlalu panjang, primary dibaca tanpa perlu", "Menghapus guna ADR 46, dan beban baca kembali ke primary", "Hanya menolong satu app, bukan layar web atau perangkat lain", "App harus menyimpan dan mengirim token, dan bacaan tanpa token dilayani replica yang bisa tertinggal"],
      ["Biaya operasional", "standby sinkron harus tetap hidup", "Satu angka jendela", "26,4 koneksi di primary", "tanpa komponen server", "Satu query ke primary sesudah tiap tulisan"],
      ["Bukti", "Rekaman lab `sinkron.txt` bagian A dan B, dan dokumentasi PostgreSQL 17 untuk jeda commit (Tidak dijalankan)", "Tidak dijalankan: dokumentasi Laravel 13.x", "Hitungan atas Asumsi, tidak dijalankan di lab", "Tidak dijalankan: app Flutter tidak ada di lab", "Rekaman lab `baca.txt` bagian B, dan kode `sumberTampil`"],
    ]);
  });
  test("tabel kelas, kapan salah, dan sengaja belum: sel dikunci per baris dan kolom", () => {
    sel("| Kelas | Contoh | Dibaca dari | Dasar |", [
      ["1. Menentukan uang", "saldo untuk bayar atau kirim", "primary, di dalam transaction", "Rekaman lab `baca.txt` bagian A (kiriman)"],
      ["2. Milik sendiri sesudah menulis", "riwayat, saldo tampil", "primary sampai replica sampai token", "Rekaman lab `baca.txt` bagian B (token)"],
      ["3. Laporan dan bacaan lain", "laporan merchant", "replica", "tidak direkam di lab ini"],
    ]);
    sel("| Salah saat | Yang diperiksa | Angka sekarang | Dibaca dari |", [
      ["Lebih dari 20% bacaan bertoken berakhir di primary (Asumsi)", "Porsi `X-Dibaca-Dari: primary`", "Belum diukur. Pembanding: 5,0% dari 1.388,9 request per detik bila satu bacaan bertoken mengikuti tiap transaksi (3,3% bila 2 transaksi, Hitungan atas Asumsi). Penyebutnya semua request, bukan bacaan bertoken.", "Metrik per kepala `X-Dibaca-Dari`"],
      ["Replica tertinggal lebih dari 30 detik (Asumsi)", "`replay_lag` di `pg_stat_replication`", "Lab: di bawah 1 detik pada 100 pembayaran per detik, batas di laptop", "Pemantauan replica"],
      ["Ada jawaban 201 tulisan tanpa `X-Lsn-Tulis`", "Jumlah jawaban tanpa kepala itu dan log posisi WAL tidak terbaca", "Belum diukur", "Log server dan metrik jawaban"],
      ["Tulisan dengan `synchronous_commit = off` memberi token", "Konfigurasi tulisan yang memberi token", "Kode `api-t5` tidak mengatur nilai itu, dan bawaan PostgreSQL adalah `on`", "Konfigurasi database"],
      ["Token sesudah failover tidak bisa dibandingkan", "Perilaku token pada replica yang baru dipromosikan", "Belum direkam [perlu verifikasi]", "Latihan failover SRE"],
      ["App yang tidak mengirim token melaporkan saldo lama", "Jumlah laporan CS dan versi app", "App Flutter tidak ada di lab", "Laporan CS per versi app"],
    ]);
    sel("| Yang ditunda | Kenapa ditunda | Muncul lagi di |", [
      ["Token yang ditandatangani atau dibulatkan", "membocorkan laju tulis seluruh database", "Belum dijadwalkan"],
      ["Bacaan tanpa token dari primary", "Menambah beban primary. Keputusannya milik pemilik, karena arahnya satu cabang di `sumberTampil`", "Belum dijadwalkan"],
      ["Aturan jeda lebih dari 30 detik", "Jeda alami di lab di bawah 1 detik", "Belum dijadwalkan"],
      ["Jendela waktu sebagai cadangan", "Dua mekanisme untuk satu masalah", "Belum dijadwalkan"],
    ]);
  });
  test("pertanyaan Mulai, Kenapa ini ada, dan Kebutuhan memakai angka dari rekaman, widget, registry, dan hitungan", () => {
    const kirim = Number(bagianA.join("\n").match(/"ke_nomor_karyawan": "K\d+", "nominal": (\d+)/)![1]);
    harusAda(`1. Replica ditahan, lalu Budi membayar ${rp(nominalB)}. Saldo apa yang dijawab bacaan tanpa token, dan saldo apa yang dijawab bacaan dengan token?`);
    harusAda(`3. Saldo tampil masih ${rp(saldoA[0]!)} di replica, tetapi saldo di primary ${rp(saldoA[1]!)}. Kiriman ${rp(kirim)} diterima atau ditolak?`);
    harusAda("<summary>Sudah tahu? Cek 3 pertanyaan</summary>");
    harusAda(`**1.** Replica ditahan, lalu Budi membayar ${rp(nominalB)}. Saldo apa yang dijawab bacaan tanpa token, dan saldo apa yang dijawab bacaan dengan token?`);
    const adr46 = dari("t5-read-replica").adr![0], adr45 = dari("t4-adr-45").adr![0];
    harusAda(`[[t5-m41]] menunjukkan Budi yang membayar ${rp(W.skenario.bayar)} dan melihat saldo lama. Sesudah ADR ${adr46} ([[t5-read-replica]]), tim Akun memindahkan riwayat dan saldo tampil ke replica.`);
    harusAda(`[[t4-adr-45]] menulis bahwa read replica hanya untuk laporan, dan keputusan uang tetap dibaca dari primary.`);
    harusAda(`ADR 47 memperluas aturan itu: bacaan milik sendiri sesudah menulis punya aturan sendiri, dan keputusan uang tidak berubah.`);
    harusAda(`**Kebutuhan.** Sesudah ADR ${adr46}, riwayat dan saldo tampil dibaca dari replica yang tertinggal, dan Budi melihat saldo lama sesudah membayar ([[t5-m41]]). ADR ${adr45} menulis replica hanya untuk laporan.`);
    harusAda(`**Yang akan merevisinya.** [[t5-m42]] menunjukkan primary yang mati, dan [[t5-rpo-rto]] menimbang replica sinkron dan \`remote_apply\` untuk ledger, lalu menulis latihan failover. Peta Tahap 5 belum menjadwalkan rekaman token sesudah failover, jadi aturan 8 tetap [perlu verifikasi].`);
    expect(naskah.split("\n").find((b) => b.startsWith("| 48 |")) ?? "").toContain("`remote_apply` untuk ledger");
    harusAda("1. Token tidak sampai ke app, dan bacaan jatuh ke replica. `TokenTulis` mengembalikan kosong bila posisi WAL tidak terbaca, dan jawaban yang diputar ulang tidak membawa token.");
    harusAda("8. Sesudah failover, semua bacaan tampil dibaca dari primary selama jendela token. Token primary lama mungkin tidak bisa dibandingkan dengan replica baru (Asumsi: belum diuji [perlu verifikasi]).");
    harusAda("Aturan 5 adalah selisih naskah dengan kode, dan arahnya bisa dibalik. Mengubah cabang `token == \"\"` di `sumberTampil` membuat bacaan tanpa token dibaca dari primary, dengan harga beban primary (Tidak dijalankan).");
    expect(serviceReplika).toContain('token == ""');
  });
  test("rujukan `berkas.txt` bagian X: urutan dan huruf dikunci, dan tiap huruf ada sebagai kepala di rekamannya", () => {
    const urut = [...badan.matchAll(/(?:`(\w+)\.txt` |\b)bagian ([A-Z])\b/g)].map((m) => m[0]);
    expect(urut).toEqual(["`baca.txt` bagian B", "bagian A", "`jeda.txt` bagian A", "`jeda.txt` bagian B", "bagian B", "bagian B", "`baca.txt` bagian A", "`baca.txt` bagian B", "bagian A", "bagian B", "`sinkron.txt` bagian A", "`baca.txt` bagian B", "`sinkron.txt` bagian A", "`baca.txt` bagian B", "`baca.txt` bagian B", "`sinkron.txt` bagian A", "`baca.txt` bagian B", "`baca.txt` bagian B", "`sinkron.txt` bagian A", "`baca.txt` bagian B"]);
    for (const [txt, huruf, topik] of [[bacaTxt, "A", "Versi pertama"], [bacaTxt, "B", "Versi benar"], [jedaTxt, "A", "Jeda alami"], [jedaTxt, "B", "Jeda buatan"], [sinkronTxt, "A", "Standby sinkron"], [sinkronTxt, "B", "on lawan remote_apply"]] as const)
      expect(txt, `${huruf} ${topik}`).toMatch(new RegExp(`^# --- ${huruf}\\. [^\\n]*${topik}`, "m"));
    harusAda("(Rekaman lab, `jeda.txt` bagian A)");
    harusAda("jadi `jeda.txt` bagian B menahan replay");
    harusAda("| Rekaman lab `baca.txt` bagian B | ".slice(0, 0) + "(`sinkron.txt` bagian A)", 3);
  });
  test("label dan kata penjaga di kalimat berangka: Rekaman lab, Asumsi, Hitungan, Tidak dijalankan, Ilustrasi menempel pada sumbernya", () => {
    harusAda("Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `baca.txt` bagian B, pemutaran ulang di replica ditahan dengan sengaja.");
    harusAda("Itu batas yang diperiksa lab di laptop, bukan nilai produksi (Rekaman lab, `jeda.txt` bagian A).");
    harusAda("Arti Rekaman lab, Asumsi, Ilustrasi, Tidak dijalankan, dan [perlu verifikasi] ada di [Label sumber](/cara-pakai/#label-sumber).");
    harusAda("Beban dasarnya dari [[t5-prd]] (Asumsi): puncak");
    harusAda("Tab Go dijalankan di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-11-03. Kode di tab lain adalah Ilustrasi.");
    harusAda("*Dijalankan: lab api-t5 dan t5-replika, PostgreSQL 17.11, Go 1.27.3, dan pgx v5.11.0 (rekaman `baca.txt`, `jeda.txt`, `sinkron.txt`).*");
    harusAda("(Tidak dijalankan: dibaca dari kode lab)", 9);
    harusAda("(Tidak dijalankan), dan kode `api-t5`", 1);
    harusAda("Satu bacaan per transaksi adalah Asumsi.");
    harusAda("**Yang belum diukur.** Tiga hal belum ada: jeda replica di produksi, jumlah bacaan per user dalam 30 detik sesudah menulis, dan porsi app yang mengirim token. Angka 5,0% adalah hasil untuk satu bacaan per transaksi, bukan batas atas dan bukan beban terukur.");
    expect(kali(badan, "Tiga hal belum ada")).toBe(1);
    expect(kali(badan, "Tiga penyebab yang paling mungkin")).toBe(1);
    expect(kali(badan, "6 bulan lagi")).toBe(1);
  });
  test("diagram dan kepala: id, judul, sub, dan catatan Rantai; description halaman; kata 'selalu' tidak dipakai untuk jeda replica", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.id).toBe("t5-lag-inti");
    expect(d.judul).toBe("Saldo tampil tanpa token dan dengan token, replica ditahan");
    expect(d.baris.map((b) => b.sub)).toEqual(["bacaan tampilan", "X-Lsn-Tulis dikirim kembali"]);
    expect(d.catatan).toBe(`Kotak oranye adalah yang tertinggal dari primary. Pemutaran ulang di replica ditahan dengan sengaja, karena jeda alami di lab di bawah 1 detik. Saldo ${rp(tanpaTokenB)} adalah saldo sesudah pembayaran ${rp(35000)} sebelumnya.`);
    expect(halaman).toMatch(/^description: Replica bisa tertinggal, jadi bacaan milik sendiri sesudah menulis dibaca dari primary sampai replica menyusul\. ADR 47 memilih token posisi WAL dan menimbang empat cara lain, termasuk jendela waktu tetap dan remote_apply\.$/m);
    // naskah menulis 'selalu sedikit tertinggal'; jeda.txt membantahnya (replica menyusul): halaman dan registry menulis 'bisa tertinggal'
    expect(halaman).not.toMatch(/selalu sedikit tertinggal/);
    expect(dari("t5-lag") as unknown as { masalah: string }).toMatchObject({ masalah: "Replica bisa tertinggal, jadi bacaan milik sendiri sesudah menulis dibaca dari tempat yang pasti sudah memilikinya" });
    expect(jedaTxt).toContain("Sesudah beban berhenti kedua standby menyusul");
    harusAda("**Replica bisa tertinggal, dan jedanya bisa membesar.**");
  });
  test("baris riset R5-140 sampai R5-144: semua tanggal sama dengan tanggal akses, dan angka hitungan diturunkan dari angka halaman", () => {
    for (const id of ["R5-140", "R5-141", "R5-142", "R5-143", "R5-144"]) {
      const tgl = [...barisRiset(id).matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map((m) => m[0]);
      expect(tgl.length, id).toBeGreaterThanOrEqual(1);
      expect(new Set(tgl), id).toEqual(new Set(["2026-11-03"]));
    }
    expect(kali(barisRiset("R5-143"), "dibuka 2026-11-03")).toBe(5);
    const a = (registry.tahap as unknown as { asumsi: { user: number; aktif: number; req: number; puncak: number } }[])[4]!.asumsi;
    const aktif = (a.user * a.aktif) / 100;
    const puncak = ((aktif * a.req) / 86400) * a.puncak, t3 = ((aktif * 3) / 86400) * a.puncak, t2 = ((aktif * 2) / 86400) * a.puncak;
    const f3 = (x: number): string => (Math.round(x * 1000) / 1000).toFixed(3).replace(".", ",");
    const b = barisRiset("R5-144");
    expect(b).toContain(`dibaca 2026-11-03: ${fmt(t3, 1)} ÷ ${fmt(puncak, 1)} = ${f3((69.4 / 1388.9) * 100)}% (ditulis ${fmt((69.4 / 1388.9) * 100, 1)}%); ${fmt(t2, 1)} ÷ ${fmt(puncak, 1)} = ${f3((46.3 / 1388.9) * 100)}% (ditulis ${fmt((46.3 / 1388.9) * 100, 1)}%); (${fmt(puncak, 1)} − ${fmt(t3, 1)}) × 0,02 = ${f3((1388.9 - 69.4) * 0.02).replace(/0$/, "")} (ditulis ${fmt((1388.9 - 69.4) * 0.02, 1)}, rumus di halaman 5.4); 5 − 1 = 4 detik.`);
    expect(b).toContain("naskah menulis app versi lama tanpa token membaca primary");
    expect(b).toContain("kode dan rekaman: tanpa token, replica, jadi app tanpa token bisa melihat saldo lama");
    expect(b).toContain("`tandaiTulis` hanya di `POST /transfers` dan `POST /kiriman` (`handler.go`)");
    expect(b).toContain("token bukan posisi WAL dijawab 422");
    expect(b).toContain("`sumberTampil` tanpa ambang jeda, app Flutter tidak ada di lab");
  });
});

describe("pertahanan tambahan 2: urutan rujukan, versi dokumentasi, bilangan faktual, dan label kalimat penting", () => {
  test("urutan nomor ADR dan [[ID]] di badan halaman dikunci; versi dokumentasi seragam (PostgreSQL 17, Laravel 13.x, Django 6.1)", () => {
    // urutan di badan halaman; tiap nomor dicocokkan ke registry di tes lain (ADR 46 = t5-read-replica, 45 = t4-adr-45, 47 = halaman ini)
    expect([...badan.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1]))).toEqual([46, 47, 46, 47, 47, 46, 45, 45, 46, 46, 46, 46]);
    expect([...badan.matchAll(/\[\[([A-Za-z0-9.\-]+)\]\]/g)].map((m) => m[1])).toEqual(["berikutnya", "t5-m41", "t5-read-replica", "t4-adr-45", "t5-read-replica", "t5-prd", "t5-m42", "t5-m41", "t5-m40", "t4-adr-45", "E1", "t5-rpo-rto", "t5-m42", "t5-rpo-rto"]);
    expect(new Set([...halaman.matchAll(/PostgreSQL (\d+)(?!\d|\.\d)/g)].map((m) => m[1]))).toEqual(new Set(["17"]));
    expect(new Set([...halaman.matchAll(/Laravel (\d+)\.x/g)].map((m) => m[1]))).toEqual(new Set(["13"]));
    expect(new Set([...halaman.matchAll(/Django (\d+\.\d+)/g)].map((m) => m[1]))).toEqual(new Set(["6.1"]));
    expect(new Set([...halaman.matchAll(/PostgreSQL (17\.\d+)/g)].map((m) => m[1]))).toEqual(new Set(["17.11"]));
    expect(readmeLab).toContain("17.11");
    expect(kali(halaman, "docs/17/")).toBe(kali(halaman, "postgresql.org/docs/"));
  });
  test("bilangan faktual di prosa: dua lapis, satu request, satu query, satu blok, satu framework, satu app", () => {
    for (const s of [
      "Dokumentasi Laravel 13.x menulis dua lapis: opsi `sticky` untuk satu request, dan middleware `PreventStaleDatabaseReads` untuk request berikutnya dalam sesi yang sama.",
      "Itu opsi B yang dipakai satu framework.",
      "Ia memakai satu query ke primary sesudah tulisan dan satu query ke replica di tiap bacaan bertoken.",
      "halaman Connection menulis satu blok `database` tiap konfigurasi lingkungan",
      "- **D ditolak** karena hanya menolong satu app.",
      "`using()` mengarahkan satu query ke database bernama.",
      "Method `$primary()` memaksa satu bacaan ke primary.",
      "opsi `sticky` hanya berlaku dalam satu request",
      "dua bacaan saldo berbeda hasilnya",
      "**Skenario:** satu app menulis, lalu membaca lagi lewat replica.",
      "| Satu query ke primary sesudah tiap tulisan, dan satu query ke replica di tiap bacaan bertoken |",
      "| Satu angka jendela yang harus dipilih dan dipantau |",
      "Satu user hanya memindahkan bacaan tampil miliknya",
      "Lab mengalihkan dua bacaan ke aturan kelas 2",
      "Dua istilah dipakai di halaman ini.",
      "Replica dipakai lagi sesudah posisinya melewati token.",
      "Delapan aturan:",
    ]) expect(kali(badan, s), s).toBe(1);
    expect(kali(badan, "Kode di bawah adalah Ilustrasi.")).toBe(3);
    expect(kali(badan, "*Tidak dijalankan.")).toBe(5);
  });
  test("kalimat berlabel: kebutuhan dengan angka turunan, pre-mortem, Cek diri 2 dan 4, aturan 3, dan ADR C", () => {
    const a = (registry.tahap as unknown as { asumsi: { user: number; aktif: number; req: number; puncak: number } }[])[4]!.asumsi;
    const puncak = (((a.user * a.aktif) / 100 * a.req) / 86400) * a.puncak;
    harusAda(`Bebannya kecil bila satu bacaan tampil mengikuti tiap transaksi: ${fmt((69.4 / 1388.9) * 100, 1)}% dari ${fmt(puncak, 1)} request per detik di puncak (Hitungan atas Asumsi, rumus di blok Paham).`);
    harusAda("Pencegahannya menghitung jawaban 201 tanpa `X-Lsn-Tulis`, dan memakai jendela waktu sebagai cadangan di app (Asumsi: belum ada).");
    harusAda("Pencegahannya memantau `replay_lag` dan menerapkan aturan 7, juga untuk replica yang mati (Asumsi: belum ada di kode).");
    harusAda("Pencegahannya aturan 6 dan 8, dan pemeriksaan token di latihan failover ([[t5-rpo-rto]] menulis latihannya, pemeriksaan token belum dijadwalkan).");
    harusAda(`Saat replica sudah memutar WAL sampai posisi di token: \`pg_last_wal_replay_lsn()\` tidak lebih kecil dari token. Di rekaman, query itu menjawab \`t\`, dan token yang sama dilayani replica dengan saldo ${rp(sesudahB)} (\`baca.txt\` bagian B).`);
    harusAda("Bacaan tanpa token dari primary adalah Asumsi desain yang belum ada di kode lab.");
    harusAda(`Di rekaman, replay ditahan, Budi membayar ${rp(nominalB)}, dan dua bacaan saldo berbeda hasilnya:`);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("1234");
    expect([...badan.matchAll(/^(\d)\. (?=Replica ditahan|Token itu|Saldo tampil masih)/gm)].map((m) => m[1]).join("")).toBe("123");
    harusAda("3. App mengirim token itu di bacaan milik sendiri berikutnya, yaitu riwayat dan saldo tampil. Server membaca replica hanya bila replica sudah memutar WAL sampai token. Selain itu, atau bila replica tidak menjawab, server membaca primary. Token yang bukan posisi WAL dijawab 422.");
    harusAda("- **C ditolak** karena menghapus ADR 46 untuk bacaan tampil, dan 26,4 koneksi bacaan selain uang kembali ke primary.");
    harusAda("- **B ditolak** karena jendela tidak mengikuti jeda sebenarnya. Bila replica ditahan lebih lama dari 5 detik, saldo lama muncul lagi sesudah jendela habis (penalaran).");
    harusAda("**Yang belum terjawab: failover.** Token adalah posisi di WAL primary yang menulis, dan sesudah promosi posisi replica bisa berbeda dari primary lama. Apakah token lama masih bisa dibandingkan dengan replica baru tidak diuji [perlu verifikasi]. [[t5-m42]] membahas primary yang mati.");
    harusAda("Itu opsi B yang dipakai satu framework. Batasnya: dokumentasi framework tanpa angka beban atau kejadian galat, dan middleware itu tidak memengaruhi sesi lain dan koneksi lain. Halaman yang dibuka tidak menyebut dasar angka 2 detik itu.");
    harusAda("2. Replica tertinggal jauh atau mati.");
    harusAda("3. Token tidak lagi bisa dibandingkan sesudah failover, atau sah tetapi salah arti untuk `synchronous_commit = off`.");
    expect(kali(badan, "[perlu verifikasi]")).toBe(sidikTeks(badan).perluVerifikasi);
  });
  test("baris riset R5-144 memuat frasa berangka yang dipakai halaman: 30 detik naskah, ADR 47 dan M41, jawaban 422", () => {
    const b = barisRiset("R5-144");
    for (const s of ["Selisih naskah ADR 47 dan M41 dengan kode dan rekaman", "Naskah \"token dikirim app selama 30 detik\" dan \"jeda lebih dari 30 detik: semua bacaan pindah ke primary\" tidak ada di kode", "Hitungan 5.7 atas angka yang tertulis di halaman", "5.7 (blok Paham dan Putuskan; usulan ke badan PR)", "naskah Tahap 5 dan halaman", "`POST /transfers` dan `POST /kiriman`"])
      expect(b, s).toContain(s);
    expect(naskah).toContain("app mengirimnya di bacaan berikutnya selama 30 detik");
    expect(naskah).toContain("Jeda replica lebih dari 30 detik: semua bacaan pindah ke primary");
  });
});

// --- Tinjauan independen (keputusan 1527): klaim yang diperbaiki peninjau dijaga dari kode, naskah, dan halaman
describe("tinjauan 1527: status top-up dan laporan dari primary, urutan pemeriksaan token, 5,0% bukan batas atas, janji failover, replica mati", () => {
  const semuaGo = (dir: string): string[] => {
    const hasil: string[] = [];
    for (const e of fs.readdirSync(path.join(akar, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) { hasil.push(...semuaGo(rel)); continue; }
      if (e.name.endsWith(".go") && !e.name.endsWith("_test.go")) hasil.push(rel);
    }
    return hasil;
  };
  const fungsi = (kode: string, awal: string, akhir: string): string => kode.slice(kode.indexOf(awal), kode.indexOf(akhir));
  test("status top-up dan laporan memakai primary: s.replika hanya dipakai replika.go (lingkup: semua .go bukan tes di labs/api-t5)", () => {
    const pemakai = semuaGo("labs/api-t5").filter((f) => /\bs\.replika\b/.test(baca(f)));
    expect(pemakai).toEqual(["labs/api-t5/internal/service/replika.go"]);
    expect(baca("labs/api-t5/internal/service/pembayaran.go")).toMatch(/func \(s Service\) LihatTopupBank\([^)]*\)[^{]*\{\s*\n\s*t, err := s\.repo\.TopupBank\(ctx, id\)/);
    expect(baca("labs/api-t5/internal/service/riwayat.go")).toContain("return s.repo.Laporan(ctx, warung, dari, sampai)");
    expect(baca("labs/api-t5/internal/service/t5.go")).toContain("h, err := s.repo.LaporanHariIni(ctx, merchant, awal, awal.AddDate(0, 0, 1))");
    expect(baca("labs/api-t5/internal/handler/handler_pembayaran.go")).toContain('mux.HandleFunc("GET /topup-bank/{id}"');
    expect(handlerUtama).toContain('mux.HandleFunc("GET /warung/{id}/laporan"');
    harusAda("Status top-up dan laporan merchant ada di naskah, dan `api-t5` membacanya dari primary tanpa aturan sumber tampil (Tidak dijalankan: dibaca dari kode lab).");
    expect(badan).not.toContain("tidak ada di lab ini");
  });
  test("bentuk token diperiksa sebelum bacaan tampil memanggil replica atau primary, tetapi sesi diperiksa di database lebih dulu", () => {
    const f = fungsi(serviceReplika, "func (s Service) sumberTampil", "// --8<-- [end:sumber-tampil]");
    expect(f.indexOf("polaLSN.MatchString(token)")).toBeGreaterThan(-1);
    expect(f.indexOf("polaLSN.MatchString(token)")).toBeLessThan(f.indexOf("s.replika.SampaiLSN"));
    expect(baca("labs/api-t5/internal/service/sesi.go")).toContain("s.repo.SesiAktif(ctx, hashToken(token), s.kini())");
    expect(handlerUtama.slice(handlerUtama.indexOf("func (s Server) wajibLogin"))).toContain("s.svc.Periksa(r.Context(), token)");
    expect(badan).not.toContain("sebelum menyentuh database");
    harusAda("- Token yang bukan posisi WAL dijawab 422 (Rekaman lab, `baca.txt` bagian B). Kode lab memeriksa bentuknya sebelum bacaan tampil menyentuh replica atau primary (Tidak dijalankan: dibaca dari kode lab).");
  });
  test("5,0% adalah hasil untuk satu bacaan per transaksi dan bukan batas atas: dua endpoint tampil menerima token", () => {
    expect(kali(badan, "paling banyak")).toBe(0);
    expect(baris(badan).filter((b) => b.includes("5,0%") && /paling banyak|batas atas/.test(b)).length).toBe(1);
    harusAda("Angka 5,0% adalah hasil untuk satu bacaan per transaksi, bukan batas atas dan bukan beban terukur.");
    expect(handlerUtama.match(/r\.Header\.Get\(KepalaLSNTulis\)/g)?.length).toBe(2);
    harusAda("| Bacaan bertoken, satu per transaksi uang (Asumsi) | sama dengan transaksi uang puncak | 69,4 per detik (46,3) |");
    harusAda("Penyebutnya semua request, bukan bacaan bertoken.");
  });
  test("janji lintas halaman: M42, ADR 48, dan peta 5.8 dan 5.9 di naskah tidak memuat token, jadi aturan 8 tetap terbuka", () => {
    const naskahBaris = naskah.split("\n");
    const rujukan = [naskahBaris.find((b) => b.startsWith("| M42 |")) ?? "", naskahBaris.find((b) => b.startsWith("| 48 |")) ?? "", ...naskahBaris.filter((b) => /^\| 5\.(8|9) \|/.test(b))];
    expect(rujukan.length).toBe(4);
    for (const b of rujukan) { expect(b.length).toBeGreaterThan(40); expect(b.toLowerCase()).not.toContain("token"); }
    harusAda("Peta Tahap 5 belum menjadwalkan rekaman token sesudah failover, jadi aturan 8 tetap [perlu verifikasi].");
    expect(badan).not.toContain("Keduanya menjawab aturan 8");
    harusAda("[[t5-rpo-rto]] menimbang replica sinkron dan `remote_apply` untuk ledger, lalu menulis latihan failover.", 1);
  });
  test("tebak dulu: jawaban dan alasan tebakan widget belum tertulis sebelum widget, dan kata token dijelaskan sebelum pertanyaan Tebak memakainya", () => {
    const sebelum = badan.slice(0, badan.indexOf("<JedaReplica />"));
    expect(sebelum.length).toBeGreaterThan(500);
    expect(sebelum).not.toContain(W.tebak.alasan);
    expect(sebelum).not.toContain(W.tebak.pilihan[W.tebak.jawaban]!);
    expect(sebelum).not.toContain("Replica baru memutar pembayaran itu");
    expect(sebelum).not.toContain("Anggap replica tertinggal");
    expect(W.tebak.q).toContain("tanpa token");
    // kemunculan pertama kata token di halaman adalah kalimat yang menjelaskannya (isi kepala X-Lsn-Tulis)
    const pertama = badan.indexOf("token");
    expect(badan.slice(pertama - 6).startsWith("serta token: kepala `X-Lsn-Tulis` berisi posisi primary di WAL")).toBe(true);
    expect(pertama).toBeLessThan(badan.indexOf("<JedaReplica />"));
    // hasil jeda ditahan hanya ditulis sesudah widget (kalimat Ubah satu hal)
    expect(badan.indexOf("Layar Budi menampilkan")).toBeGreaterThan(badan.indexOf("<JedaReplica />"));
    expect(kali(badan, "Yang Raka kira")).toBe(0);
  });
  test("replica mati: bacaan tanpa token memanggil replica tanpa cadangan ke primary, dan galat tak dikenal dijawab 500", () => {
    const f = fungsi(serviceReplika, "func (s Service) sumberTampil", "// --8<-- [end:sumber-tampil]");
    expect(f).toMatch(/if s\.rentan == RentanRiwayatReplika \|\| token == "" \{\s*\n\s*return s\.replika, SumberReplika, nil\s*\n\s*\}/);
    const akun = serviceReplika.slice(serviceReplika.indexOf("func (s Service) LihatAkunTampil"));
    expect(akun).toMatch(/a, err := p\.Akun\(ctx, id\)\s*\n\s*if errors\.Is\(err, repo\.ErrTidakAda\) \{\s*\n\s*return repo\.Akun\{\}, sumber, ErrTidakDitemukan\s*\n\s*\}\s*\n\s*return a, sumber, err/);
    expect(handlerUtama).toMatch(/default:\s*\n\s*s\.errorInternal\(w, err\)/);
    expect(handlerUtama).toContain('Problem{Type: "/problems/internal", Title: "Terjadi kesalahan di server", Status: 500}');
    harusAda("Replica yang tertinggal menjawab saldo lama, dan replica yang mati membuat bacaan itu gagal dengan galat server (Tidak dijalankan: dibaca dari kode lab).");
  });
});

describe("tinjauan 1527 (putaran tanpa kunci): kalimat mekanisme, kutipan riset, kode, urutan paragraf, dan daftar", () => {
  test("kalimat mekanisme dan definisi yang tidak punya sumber turunan lain ditulis tepat sekali", () => {
    for (const k of ["Tanpa token, bacaan tampilan dijawab replica. Dengan token, replica dipakai hanya bila sudah sampai posisi itu. Bila belum, atau bila replica tidak menjawab, server membaca primary.", "Keputusan uang tidak ikut aturan ini.", "Riwayat dan saldo tampil bukan laporan.", "Replication lag adalah jeda antara COMMIT di primary dan saat perubahannya terlihat di replica.", "LSN (log sequence number) adalah posisi di WAL, dan token berisi posisi primary sesudah COMMIT pembayaran itu. App mengirim token kembali di bacaan berikutnya.", "**Token membawa posisi WAL.** Sesudah COMMIT, server membaca posisi tulis WAL primary dengan `pg_current_wal_lsn()` dan mengirimnya di `X-Lsn-Tulis`.", "Dokumentasi PostgreSQL 17 menulis `pg_current_wal_lsn()` sebagai posisi tulis WAL, dan `pg_last_wal_replay_lsn()` sebagai posisi terakhir yang diputar ulang selama recovery.", "Dokumentasi menulis bahwa dengan `synchronous_commit = off` ada jeda antara jawaban sukses dan commit yang aman.", "Jadi `remote_apply` hanya menolong replica yang ditunggu, bukan replica yang melayani bacaan tampil.", "**`remote_apply` memindahkan tunggu ke COMMIT.** Cara lain: COMMIT menunggu standby sinkron memutar WAL (`synchronous_commit = remote_apply`), sehingga transaksi sudah terlihat di standby itu.", "**Token adalah masukan dari client.** Server memperlakukannya sebagai masukan yang tidak tepercaya.", "Yang ditanyakan: apa yang menjaga bacaan sesudah tulis, dan sampai kapan.", "Ia memakai satu query ke primary sesudah tulisan dan satu query ke replica di tiap bacaan bertoken.", "Penjagaan berlaku sampai replica menyusul, bukan selama jendela waktu.", "Tebak dulu, lalu geser jeda replica atau pilih aturan lain.", "Penjagaan bacaan sesudah tulis tidak ada di dokumentasi yang dibaca.", "Di 37 halaman pada peta situsnya yang alamatnya memuat database, kata replica hanya muncul dalam replication, di dua halaman.", "Di endpoint load balancer Data API, request GET dijawab database terdekat, dan request selain GET dijawab primary.", "Jeda antara update di primary dan saat replica menerimanya disebutnya replication lag.", "README menulis bahwa bacaan non-transaksional dijalankan di replica, dan tulisan serta transaction di primary.", "Dokumentasi menulis bahwa router primary dan replica di contohnya tidak menyediakan penyelesaian untuk replication lag, dan contoh itu hanya untuk memperagakan router.", "Bacaan tanpa token dijawab replica, jadi app yang tidak mengirim token bisa melihat saldo lama (`baca.txt` bagian B).", "Bacaan bertoken pindah ke primary, tetapi bacaan tanpa token tetap ke replica.", "1. Bacaan yang menentukan uang (saldo untuk bayar atau kirim, batas harian, status top-up yang akan dikredit) dibaca dari primary di dalam transaction. Aturan ini tidak berubah ([[t4-adr-45]]).", "- **A ditolak** karena `remote_apply` hanya menunggu standby sinkron, sedangkan replica yang melayani bacaan tampil asinkron (`sinkron.txt` bagian A).", "`TokenTulis` mengembalikan kosong bila posisi WAL tidak terbaca, dan jawaban yang diputar ulang tidak membawa token. Arah gagalnya ke replica, bukan ke primary, jadi saldo lama muncul lagi.", "satu pembayaran dibatasi Rp200.000 dan Rp240.000 ditolak oleh batas itu tanpa membaca saldo."]) harusAda(k);
  });
  test("kalimat tentang kode: tulisan sebelum token, satu query ke primary dan satu ke replica, konstanta sumber dan kepala, batas bayar", () => {
    for (const [nama, svc] of [["bayar", "s.svc.Bayar("], ["kirim", "s.svc.Kirim("]] as const) {
      const f = handlerUtama.slice(handlerUtama.indexOf(`func (s Server) ${nama}(`));
      expect(f.indexOf(svc), nama).toBeGreaterThan(-1);
      expect(f.indexOf(svc), nama).toBeLessThan(f.indexOf("s.tandaiTulis(w, r)"));
    }
    expect(repoReplika).toMatch(/func \(r Repo\) LSNTulis[\s\S]*?r\.db\.QueryRowContext\(ctx, `SELECT pg_current_wal_lsn\(\)::text`\)/);
    expect(serviceReplika).toContain("s.replika.SampaiLSN(ctx, token)");
    expect(serviceReplika).toContain("s.repo.LSNTulis(ctx)");
    expect(serviceReplika).toContain('SumberPrimary = "primary"');
    expect(serviceReplika).toContain('SumberReplika = "replika"');
    expect(handlerT5).toContain('KepalaDibacaDari = "X-Dibaca-Dari"');
    const bayarGo = baca("labs/api-t5/internal/service/bayar.go");
    const maks = Number(bayarGo.match(/const MaksBayar = ([\d_]+)/)![1]!.replace(/_/g, ""));
    expect(rp(maks)).toBe("Rp200.000");
    const fnBayar = bayarGo.slice(bayarGo.indexOf("func (s Service) Bayar("));
    expect(fnBayar.indexOf("jumlah > MaksBayar")).toBeGreaterThan(-1);
    expect(fnBayar.indexOf("jumlah > MaksBayar")).toBeLessThan(fnBayar.indexOf("s.repo."));
    expect(240000).toBeGreaterThan(maks);
    harusAda(`satu pembayaran dibatasi ${rp(maks)} dan ${rp(240000)} ditolak oleh batas itu tanpa membaca saldo.`);
  });
  test("replica tampil di lab adalah replika_laporan yang asinkron, bukan standby sinkron (dasar tolakan opsi A)", () => {
    const runPy = baca("labs/t5-replika/run.py");
    expect(runPy).toContain('("replika", "replika_laporan")');
    expect(runPy).toContain('"REPLIKA_DATABASE_URL": d.db_role(d.ROLE_APP, port=REPLIKA_REPLICA_PORT)');
    expect(sinkronTxt).toContain(" replika_laporan  | streaming | async");
    expect(sinkronTxt).toContain(" replika_sinkron  | streaming | sync");
  });
  test("kutipan riset yang dipakai kalimat halaman ada di baris risetnya (bagian, versi, kutipan Inggris, hasil baca)", () => {
    const r140 = barisRiset("R5-140"), r141 = barisRiset("R5-141"), r142 = barisRiset("R5-142"), r143 = barisRiset("R5-143");
    for (const k of ["Returns the current write-ahead log write location", "Returns the last write-ahead log location that has been replayed during recovery", "the function returns NULL"]) expect(r140, k).toContain(k);
    expect(r140).toContain(`PostgreSQL ${bacaTxt.match(/PostgreSQL (17\.\d+)/)![1]}`);
    for (const k of ["bagian 26.2.5", "bagian 26.2.8.1", "Streaming replication is asynchronous by default", "load balancing with causal consistency", "much larger commit delays", "tiga kali `wal_writer_delay`"]) expect(r141, k).toContain(k);
    for (const k of ["Eventually Consistent - Revisited", "23 Desember 2008"]) expect(r142, k).toContain(k);
    for (const k of ["kata replica hanya dalam replication di dua halaman", "non-GET ke primary", "GET lewat endpoint load balancer ke database terdekat", "`$primary()` memaksa primary", "bacaan non-transaksional ke replica, tulisan dan transaction ke primary", "doesn't provide any solution for handling replication lag", "Example purposes only!", "tidak menyebut replica"]) expect(r143, k).toContain(k);
  });
  test("urutan paragraf: tiap jangkar muncul tepat sekali dan menurut urutan halaman", () => {
    let akhir = -1;
    for (const j of ["Sesudah menulis, bacaan mi", "Di Rekaman lab ([Label sum", "Bacaan saldo tanpa token d", "Keputusan uang tidak ikut ", "1. Replica ditahan, lalu B", "2. Token itu berisi apa, d", "3. Saldo tampil masih Rp25", "Yakin dengan ketiganya? Lo", "Token adalah isi kepala `X", "Widget ini menunjukkan lay", "**Ubah satu hal:** pilih j", "Arti Rekaman lab, Asumsi, ", "[[t5-m41]] menunjukkan Bud", "[[t4-adr-45]] menulis bahw", "Dua istilah dipakai di hal", "**Replica bisa tertinggal,", "Di lab, pada 100 pembayara", "**Token membawa posisi WAL", "Dokumentasi PostgreSQL 17 ", "**Server memilih tempat me", "Tanpa token, bacaan tampil", "Sesudah replay dilanjutkan", "Di lab, kepala `X-Lsn-Tuli", "**Tiga kelas baca.** Atura", "Lab mengalihkan dua bacaan", "Di bagian A, saldo tampil ", "**Harganya: bacaan bertoke", "Satu bacaan per transaksi ", "**`remote_apply` memindahk", "Di lab, selagi replay di s", "Tanpa replay yang ditahan,", "**Token adalah masukan dar", "- Token yang bukan posisi ", "- Token sah yang sangat be", "- Token adalah posisi WAL ", "- Jawaban yang diputar ula", "- Bila posisi WAL tidak te", "Dokumentasi menulis bahwa dengan", "**Yang belum terjawab: fai", "**Skenario:** satu app men", "Tab Go dijalankan di lab. ", "*Dijalankan: lab api-t5 da", "**Yang berbeda di stack ini:** k", "*Tidak dijalankan. Dicek ke READ", "  where: { id },", "});`} />", "**Yang berbeda di stack ini:** R", "*Tidak dijalankan. Dicek ke [Lar", "$middleware->web(append: [", "    PreventStaleDatabaseRe", "]);`} />", "**Yang berbeda di stack ini:** o", "*Tidak dijalankan. Dicek ke [Dja", "**Yang berbeda di stack ini:** `", "*Tidak dijalankan. Dicek ke [Ser", "**Yang berbeda di stack ini:** halaman Conne", "*Tidak dijalankan. Dicek ke [Sup", "**Yang berbeda di stack ini:** halaman itu m", "**Kebutuhan.** Sesudah ADR", "**Status:** diterima sesud", "**Keputusan: opsi E.** Del", "1. Bacaan yang menentukan ", "2. Jawaban tulisan yang be", "3. App mengirim token itu ", "4. App menyimpan token sel", "5. Bacaan tanpa token diba", "6. Token tidak berlaku unt", "7. Bila replica tertinggal", "8. Sesudah failover, semua", "Aturan 5 adalah selisih na", "**Kenapa E, bukan A, B, C,", "- **A ditolak** karena `re", "- **B ditolak** karena jen", "- **C ditolak** karena men", "- **D ditolak** karena han", "**Kasus industri: Laravel.", "Itu opsi B yang dipakai sa", "**Pre-mortem.** Bayangkan ", "1. Token tidak sampai ke a", "2. Replica tertinggal jauh", "3. Token tidak lagi bisa d", "**Kapan keputusan ini sala", "**Yang belum diukur.** Tig", "**Yang akan merevisinya.**", "**1.** Replica ditahan, la", "Tanpa token, replica menja", "**2.** Kapan server yang m", "Saat replica sudah memutar", "**3.** Kenapa `remote_appl", "**4.** Naskah menulis bahw", "Bacaan tanpa token dijawab", "- [ ] Token dibaca sesudah", "- [ ] Bacaan yang menentuk", "- [ ] Token dari header di", "- [ ] Replica yang tidak m", "- [ ] Jawaban tulisan tanp", "- [PostgreSQL 17: Log-Ship", "- [PostgreSQL 17: WAL Conf", "- [PostgreSQL 17: System A", "- [Vogels: Eventually Cons", "- [Laravel 13.x: Database]", "- [Django 6.1: Multiple da", "- [Supabase: Read Replicas"]) {
      expect(kali(badan, j), j).toBe(1);
      const i = badan.indexOf(j);
      expect(i, j).toBeGreaterThan(akhir);
      akhir = i;
    }
  });
  test("daftar periksa kode AI lima butir, dan bacaan lanjut tujuh tautan yang dipakai badan (selain dua sumber stack)", () => {
    const periksa = badan.slice(badan.indexOf("### Saat me-review kode AI"), badan.indexOf("### Bacaan lanjut"));
    expect(kali(periksa, "- [ ] ")).toBe(5);
    for (const k of ["- [ ] Token dibaca sesudah COMMIT, bukan sebelum.", "- [ ] Bacaan yang menentukan uang tidak lewat pemilihan sumber tampilan dan dibaca di dalam transaction di primary.", "- [ ] Token dari header divalidasi bentuknya sebelum dipakai di query, dan dipasang sebagai parameter.", "- [ ] Replica yang tidak menjawab, atau menjawab NULL, dibaca sebagai belum sampai.", "- [ ] Jawaban tulisan tanpa token dihitung, bukan dianggap bebas dari bacaan lama."]) harusAda(k);
    const awalLanjut = badan.indexOf("### Bacaan lanjut");
    const url = (s: string) => [...s.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!);
    const lanjut = url(badan.slice(awalLanjut));
    const dipakai = [...new Set(url(badan.slice(0, awalLanjut)))];
    expect(lanjut.length).toBe(7);
    expect(lanjut.every((u) => dipakai.includes(u))).toBe(true);
    expect(dipakai.filter((u) => !lanjut.includes(u)).sort()).toEqual(["https://docs.serverpod.dev/concepts/data-and-the-database/database/connection", "https://github.com/prisma/extension-read-replicas"]);
  });
});

// --- Lapis 2: kata-kata halaman dan JSON dikunci per baris; sidik jumlah kata kunci
const sidikTeks = (teks: string) => ({
  tidak: kali(teks.toLowerCase(), " tidak "), bukan: kali(teks.toLowerCase(), " bukan "), belum: kali(teks.toLowerCase(), " belum "), hanya: kali(teks.toLowerCase(), "hanya "), paling: kali(teks.toLowerCase(), "paling "),
  asumsi: kali(teks, "Asumsi"), hitungan: kali(teks, "Hitungan"), simulasi: kali(teks, "Simulasi"), tidakDijalankan: kali(teks, "Tidak dijalankan"), perluVerifikasi: kali(teks, "[perlu verifikasi]"), penalaran: kali(teks, "penalaran"),
  rekamanLab: kali(teks, "Rekaman lab"), tanggal: kali(teks, "dibuka 2026-11-03"),
});
const ratakan = (x: unknown, awal = ""): string[] => (typeof x === "string" ? [`${awal}=${x}`] : typeof x === "number" || typeof x === "boolean" ? [`${awal}=${String(x)}`] : x === null ? [`${awal}=null`] : Array.isArray(x) ? x.flatMap((v, i) => ratakan(v, `${awal}[${i}]`)) : Object.entries(x as object).flatMap(([k, v]) => ratakan(v, `${awal}.${k}`)));
const sekarang = () => ({
  halaman: halaman.split("\n").map((b) => b.trim()).filter(Boolean),
  json: { rantai: ratakan(rantaiMentah) } as Record<string, string[]>,
});
const sidikSekarang = () => ({
  halaman: sidikTeks(badan),
  struktur: createHash("sha1").update(badan.split("\n").filter((b) => /^(#|<Blok|<\/Blok|<details|<\/details|<summary|<noscript|<\/noscript|<Snippet|<Rantai|<JedaReplica|<TabSet|<\/TabSet|<Fragment|<\/Fragment|\|---)/.test(b)).join("\n")).digest("hex"),
  riset: ["R5-140", "R5-141", "R5-142", "R5-143", "R5-144"].map((id) => createHash("sha1").update(barisRiset(id)).digest("hex")),
  glosarium: createHash("sha1").update(baris(baca("situs/src/content/docs/alat/glosarium.mdx")).filter((b) => b.endsWith("| [[t5-lag]] |")).join("\n")).digest("hex"),
});

if (process.env.PERBARUI_KUNCI === "1") {
  const s = sekarang();
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat replication-lag.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang())};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(s.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(s.json, null, 1)};\n`;
  fs.writeFileSync(path.join(akar, "situs/src/lib/replication-lag.halaman.nilai.ts"), isi);
}

describe.skipIf(tanpaKunci)("lapis 2: kata-kata halaman dan JSON dikunci", () => {
  test("setiap baris halaman sama dengan yang terkunci", () => {
    expect(sekarang().halaman).toEqual(KALIMAT_TERKUNCI);
  });
  test("setiap nilai JSON Rantai sama dengan yang terkunci", () => {
    expect(sekarang().json).toEqual(KUNCI_JSON);
  });
  test("sidik: jumlah kata kunci, label, struktur, baris riset milik halaman ini, dan baris glosarium yang menuju halaman ini", () => {
    const s = sidikSekarang();
    expect(s.halaman).toEqual(SIDIK.halaman);
    expect(s.struktur).toBe(SIDIK.struktur);
    expect(s.riset).toEqual(SIDIK.riset);
    expect(s.glosarium).toBe(SIDIK.glosarium);
  });
});
