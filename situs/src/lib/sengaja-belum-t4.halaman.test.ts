// Penjaga halaman 4.29 (keputusan 1378 sampai 1380): angka, ID, nomor ADR, versi dan bagian sumber, tautan, rentang Snippet, tabel, klaim "tidak ada"
// dan kalimat mekanisme di sengaja-belum.mdx, diagram t4-adr45-inti.json, dan Tebak t4-adr45-tebak.json. Nilai diturunkan dari registry, naskah
// Tahap 4 dan Tahap 3 (ambang yang dipakai ulang), rekaman labs/t4-modul dan labs/api-t4 dan labs/b5-2-oidc, kontrak openapi.yaml, kode lab, dan baris
// riset, bukan dari daftar yang ditulis sendiri. Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman
// dan JSON dikunci per baris di sengaja-belum-t4.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah
// teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/sengaja-belum-t4.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Kalimat tentang rekaman dan kode diperiksa terhadap rekaman dan kodenya: "tambahan p95 di
// bawah 50 ms" adalah batas di localhost satu mesin (latensi.txt), dan "p95 di bawah 500 ms" adalah batas lab di laptop (beban.txt), bukan kapasitas.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t4-adr45-inti.json";
import tebakMentah from "../../data/widget/t4-adr45-tebak.json";
import registry from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { DataTebak } from "../widgets/tebak/skema";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./sengaja-belum-t4.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const HALAMAN = "situs/src/content/docs/tahap-4/sengaja-belum.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const t3 = baca("situs/src/content/docs/tahap-3/sengaja-belum.mdx");
const latensiTxt = baca("labs/t4-modul/output/latensi.txt");
const bebanTxt = baca("labs/api-t4/output/beban.txt");
const oidcTxt = baca("labs/b5-2-oidc/output/oidc.txt");
const openapi = baca("labs/api-t4/openapi.yaml");
const kodeLatensi = baca("labs/api-t4/internal/handler/latensi_ledger_test.go").split("\n");
const kodeMain = baca("labs/api-t4/cmd/api/main.go").split("\n");
const kodeOidc = baca("labs/b5-2-oidc/main.go");
const tanpaKunci = process.env.TANPA_KUNCI === "1";
// Nama yang dipindai di lab dan nama yang ditulis halaman diturunkan dari dua regex ini (tertulis = dipindai).
const DITUNDA = /pgbouncer|kafka|debezium|kubectl|kubernetes|\bk3s\b|\bhelm\b|istio|linkerd|grpc|protobuf|temporal|hot_standby|primary_conninfo|pg_basebackup|walsender|replication slot|wal_level/i;
const API_SAJA = /\bbff\b|oidc|oauth|pkce|sosial/i;

interface H { id: string; judul: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; adr?: number[]; peran?: string[]; path?: string }
const hal = registry.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const asumsi = (registry.tahap as unknown as { asumsi: { user: number; aktif: number; req: number; puncak: number; trx: number; tim: string } }[])[3]!.asumsi;

const cari = (pola: RegExp, teks: string, nama: string): RegExpMatchArray => {
  const m = teks.match(pola);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const barisRiset = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const tabel = (awalan: string): string[][] => {
  const semua = halaman.slice(halaman.indexOf(awalan)).split("\n");
  const keluar: string[][] = [];
  for (const b of semua) { if (!b.startsWith("|")) break; keluar.push(b.split("|").slice(1, -1).map((x) => x.trim())); }
  return keluar;
};
const fmt = (x: number, d = 0): string => {
  const [i, f] = x.toFixed(d).split(".");
  const ribu = i!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return f ? `${ribu},${f}` : ribu;
};
const rb = (x: number, d: number): number => Number(x.toFixed(d));
const persen = (a: number, b: number, d = 0): string => `${fmt((a / b) * 100, d)}%`;

// --- angka beban dari registry dan naskah (Asumsi), diulang dengan rumus naskah
const HARI = 86400;
const aktif = (asumsi.user * asumsi.aktif) / 100;
const rps = (aktif * asumsi.req) / HARI * asumsi.puncak;
const trxPuncak = (aktif * asumsi.trx) / HARI * asumsi.puncak;
const trxRata = (aktif * asumsi.trx) / HARI;
const naskahBeban = naskah.slice(naskah.indexOf("### Angka beban Tahap 4"), naskah.indexOf("## 3b."));
const topupPerUser = Number(cari(/(\d+,\d+) top-up per user aktif per hari/, naskahBeban, "top-up per user")[1]!.replace(",", "."));
const topup = (aktif * topupPerUser) / HARI * asumsi.puncak;
const notif = (aktif * asumsi.trx + aktif * topupPerUser) / HARI * asumsi.puncak;
const barisKoneksi = naskahBeban.split("\n").find((b) => b.startsWith("| Koneksi database |")) ?? "";
const masukanKoneksi = barisKoneksi.split("|")[3]!.trim();
const suku = masukanKoneksi.split("+").map((t) => t.trim().split("×").map((n) => Number(n.trim())).reduce((a, b) => a * b, 1));
const koneksi = suku.reduce((a, b) => a + b, 0);
const [instanceApi, poolApi] = masukanKoneksi.split("+")[0]!.split("×").map((n) => Number(n.trim())) as [number, number];
const tetap = koneksi - instanceApi * poolApi;
const barisTim = naskahBeban.split("\n").find((b) => b.startsWith("| Ukuran tim |")) ?? "";
const timSuku = cari(/\| (\d+ \+ \d+ \+ \d+) \| (\d+) orang/, barisTim, "ukuran tim");
const timJumlah = Number(timSuku[2]);
const jumlahService = 5 + 1;
// ambang yang dipakai ulang dari halaman 3.30 (ADR 33) dan ADR 21
const t3Ambang = cari(/Pemicu koneksi memakai (\d+) dari (\d+) dan pemicu CDC (\d+) pesan per detik/, t3, "ambang t3");
const pemicuKoneksi = Number(t3Ambang[1]);
const maxKoneksi = Number(t3Ambang[2]);
const pemicuPesan = Number(t3Ambang[3]);
const ambangL = Number(cari(/ambang (\d+) koneksi/, t3, "ambang L")[1]);
const waktuBaca = Number(cari(/W (\d+) ms/, t3, "W baca")[1]) / 1000;
const timeoutGateway = Number(cari(/timeout (\d+) detik \(ADR 22\): L = /, naskahBeban, "timeout gateway")[1]);
const heuristikDev = 50;
const anggaranMs = Number(cari(/anggaranTambahanHTTP = (\d+) \* time\.Millisecond/, kodeLatensi.join("\n"), "anggaran")[1]);
const p95Lab = Number(cari(/p95 di bawah (\d+) ms \(batas lab, Asumsi/, bebanTxt, "p95 lab")[1]);

// --- hitungan turunan, memakai angka yang tertulis di halaman (dibulatkan seperti di halaman)
const rpsT = rb(rps, 1);
const trxT = rb(trxPuncak, 2);
const topupT = rb(topup, 3);
const lBaca = rb((rpsT - trxT) * waktuBaca, 2);
const lGateway = rb(topupT * timeoutGateway, 2);
const lGrpc = rb(topupT * (anggaranMs / 1000), 3);
const notifT = rb(notif, 2);
const instancePemicu = (pemicuKoneksi - tetap) / poolApi;
const tambah = instancePemicu - instanceApi;
const rasio = {
  koneksi: koneksi / pemicuKoneksi,
  baca: lBaca / ambangL,
  modul: lGateway / ambangL,
  pesan: notifT / pemicuPesan,
};

describe("angka beban, hitungan, dan ambang diturunkan dari registry, naskah, dan halaman 3.30", () => {
  test("registry Tahap 4 sama dengan naskah dan angka halaman: 138,9, 6,94, 0,694, 0,579, 7,52, 40 dari 100, 13 orang", () => {
    expect(asumsi).toMatchObject({ user: 100000, aktif: 20, req: 60, puncak: 10, trx: 3, tim: "13 developer, 3 tim" });
    expect(naskahBeban).toContain(`${fmt(rps, 1)} puncak`);
    expect(naskahBeban).toContain(`${fmt(trxRata, 3)} rata-rata dan ${fmt(trxPuncak, 2)} puncak`);
    expect(naskahBeban).toContain(`${fmt(topup, 3)} puncak`);
    expect(naskahBeban).toContain(`${fmt(notif, 2)} per detik puncak`);
    expect(barisKoneksi).toContain(`${koneksi} dari ${maxKoneksi}`);
    expect(timJumlah).toBe(13);
    expect(eval(timSuku[1]!.replace(/\+/g, "+"))).toBe(timJumlah);
    for (const s of [`${fmt(rpsT, 1)} request per detik`, `${fmt(trxT, 2)} per detik`, `${fmt(trxRata, 3)}`, `${fmt(topupT, 3)} per detik`, `${fmt(notifT, 2)} per detik`])
      expect(badan, s).toContain(s);
    expect(badan).toContain(`${fmt(aktif)} × ${asumsi.req} ÷ ${fmt(HARI)} × ${asumsi.puncak} = ${fmt(rpsT, 1)} request per detik`);
    expect(badan).toContain(`${fmt(aktif)} × ${asumsi.trx} ÷ ${fmt(HARI)} × ${asumsi.puncak} = ${fmt(trxT, 2)} per detik`);
    expect(badan).toContain(`${fmt(aktif)} × ${fmt(topupPerUser, 2)} ÷ ${fmt(HARI)} × ${asumsi.puncak} = ${fmt(topupT, 3)} per detik`);
    expect(badan).toContain(`(${fmt(aktif * asumsi.trx)} + ${fmt(aktif * topupPerUser)}) ÷ ${fmt(HARI)} × ${asumsi.puncak} = ${fmt(notifT, 2)}`);
    expect(badan).toContain(`100.000 user terdaftar, ${asumsi.aktif}% aktif per hari, dan faktor puncak ${asumsi.puncak}`);
    expect(badan).toContain(`Tiap user aktif membuat ${asumsi.req} request, ${asumsi.trx} transaksi uang, dan ${fmt(topupPerUser, 2)} top-up per hari`);
  });
  test("koneksi: rumus, hasil, pemicu, dan jumlah instance sama dengan naskah dan halaman 3.30", () => {
    expect([koneksi, instanceApi, poolApi, tetap, pemicuKoneksi, maxKoneksi, pemicuPesan, ambangL, waktuBaca]).toEqual([40, 2, 10, 20, 70, 100, 100, 5, 0.02]);
    expect([instancePemicu, tambah]).toEqual([5, 3]);
    expect(masukanKoneksi).toBe("2 × 10 + 2 × 5 + 4 + 3 + 3");
    expect(badan).toContain(`${masukanKoneksi} = ${koneksi} dari \`max_connections\` ${maxKoneksi}`);
    expect(badan).toContain(`instance × 10 + ${tetap} = ${pemicuKoneksi}, jadi instance = (${pemicuKoneksi} − ${tetap}) ÷ ${poolApi} = ${instancePemicu}`);
    expect(badan).toContain(`Angka ${tetap} adalah 2 × 5 + 4 + 3 + 3`);
    expect(badan).toContain(`Lima instance, jadi tiga lagi di atas dua yang ada`);
    expect(badan).toContain("instance × pool + 2 × 5 + 4 + 3 + 3");
  });
  test("rasio ke pemicu: 57%, 53%, 35%, 7,5%, dan terdekat adalah koneksi database", () => {
    expect([persen(koneksi, pemicuKoneksi), persen(lBaca, ambangL), persen(lGateway, ambangL), persen(notifT, pemicuPesan, 1)]).toEqual(["57%", "53%", "35%", "7,5%"]);
    expect(Math.max(...Object.values(rasio))).toBe(rasio.koneksi);
    expect(rasio.koneksi).toBeGreaterThan(rasio.baca);
    expect(rasio.baca).toBeGreaterThan(rasio.modul);
    expect(rasio.modul).toBeGreaterThan(rasio.pesan);
    expect(badan).toContain(`40 dari pemicu ${pemicuKoneksi}, atau ${persen(koneksi, pemicuKoneksi)}`);
    expect(badan).toContain(`(138,9 − ${fmt(trxT, 2)}) × ${fmt(waktuBaca, 2)} = ${fmt(lBaca, 2)}`);
    expect(badan).toContain(`${fmt(topupT, 3)} × ${timeoutGateway} = ${fmt(lGateway, 2)}`);
    expect(badan).toContain(`${fmt(topupT, 3)} × ${fmt(anggaranMs / 1000, 2)} = ${fmt(lGrpc, 3)} koneksi`);
    expect(badan).toContain(`${timJumlah} ÷ ${jumlahService} = ${fmt(timJumlah / jumlahService, 1)} orang per service`);
    expect(badan).toContain(`${timJumlah} ÷ ${heuristikDev} = ${persen(timJumlah, heuristikDev)}`);
    expect(badan).toContain(`${fmt(notifT, 2)} ÷ ${pemicuPesan} = ${persen(notifT, pemicuPesan, 1)}`);
    expect(badan).toContain(`1.000 ÷ ${timJumlah} ≈ ${fmt(1000 / timJumlah)}`);
    expect(`${fmt(ambangL / lBaca, 1)}`).toBe("1,9");
  });
  test("ambang dan label: 70 dan 100 berasal dari 3.30, 5 dari ADR 21, 500 ms dan 50 ms dari rekaman dan kode lab", () => {
    expect(t3).toContain("ambang 5 koneksi (Asumsi dari [[t2-adr-21]]");
    expect([anggaranMs, p95Lab]).toEqual([50, 500]);
    expect(latensiTxt).toContain(`batas: tambahan p95 lewat HTTP di bawah ${anggaranMs}ms: ya`);
    expect(latensiTxt).toContain("tambahan p95 di bawah 50ms: ya".replace("tambahan p95 di bawah", "tambahan p95 lewat HTTP di bawah"));
    expect(latensiTxt).toContain("fungsi ledger yang sama dipanggil langsung dan lewat HTTP");
    expect(latensiTxt).toContain("jaringan antar host tidak diukur");
    expect(bebanTxt).toContain(`p95 di bawah ${p95Lab} ms (batas lab, Asumsi; nilai ukur tidak direkam): ya`);
    expect(bebanTxt).toContain("Bukan klaim kapasitas produksi.");
    expect(bebanTxt).toContain("Dijalankan di laptop lab: bukan kapasitas produksi.");
    expect(badan).toContain(`tambahan p95 lewat HTTP di bawah ${anggaranMs} ms, ya (batas di localhost satu mesin; nilai mentah tidak direkam)`);
    expect(badan).toContain(`p95 di bawah ${p95Lab} ms pada ${fmt(rpsT, 1)} request per detik, ya (batas lab di laptop)`);
    expect(badan).toContain(`melewati ${p95Lab} ms (batas lab, Asumsi)`);
    expect(badan).toContain("Ambang 70 koneksi dan 100 pesan per detik adalah Asumsi [[t3-adr-33]]");
    expect(badan).toContain("Ambang 5 koneksi adalah Asumsi [[t2-adr-21]]");
  });
});

describe("tabel 'Delapan yang ditunda' dan 'Kapan keputusan ini salah': delapan butir naskah, angka per baris", () => {
  const barisNaskah = naskah.split("\n").find((b) => b.startsWith("| 45 |")) ?? "";
  const teksButir = cari(/^\| 45 \| Sengaja belum: (.*) \| Masing-masing/, barisNaskah, "baris ADR 45")[1]!;
  const butir: string[] = [];
  { let d = 0, mulai = 0; for (let i = 0; i <= teksButir.length; i++) { const c = teksButir[i]; if (c === "(") d++; else if (c === ")") d--; else if ((c === ";" && d === 0) || i === teksButir.length) { butir.push(teksButir.slice(mulai, i).trim()); mulai = i + 1; } } }
  const ditunda = tabel("| Komponen | Keadaan Tahap 4 |");
  const salah = tabel("| Komponen | Salah saat |");
  const ke = (b: string): string => b.replace(/\s*\(.*$/, "").toLowerCase();
  test("naskah memuat delapan butir dan tabel halaman memuat delapan baris bernomor, dalam urutan yang sama", () => {
    expect(butir).toHaveLength(8);
    for (const t of [ditunda, salah]) {
      expect(t).toHaveLength(10);
      expect(t[1]!.every((c) => /^-+$/.test(c))).toBe(true);
      const nama = t.slice(2).map((r) => r[0]!);
      expect(nama.map((n) => n.match(/^(\d)\. /)![1])).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
      nama.forEach((n, i) => expect(n.replace(/^\d\. /, "").toLowerCase().replace("kubernetes, service mesh, kafka", "kubernetes, service mesh, kafka")).toBe(ke(butir[i]!)));
    }
  });
  test("tiap butir naskah yang berangka tampil di halaman dengan angka yang sama", () => {
    expect(butir[0]).toContain(`${fmt(trxT, 2)} transaksi uang per detik dan ${timJumlah} orang; pemicu ±${heuristikDev} developer`);
    expect(butir[1]).toContain(`${fmt(trxRata, 3)} transaksi per detik rata-rata; pemicu deploy independen oleh lima tim atau lebih di PRD v5`);
    expect(butir[2]).toContain(`${fmt(topupT, 3)} top-up per detik`);
    expect(butir[3]).toContain(`${koneksi} dari ${maxKoneksi} koneksi; pemicu laporan merchant real-time`);
    expect(butir[4]).toContain("pemicu satu layar app butuh lebih dari 3 request berurutan di jaringan lambat, Asumsi");
    expect(butir[5]).toContain("PRD v4 tidak memintanya; syarat RFC 8252, RFC 7636, dan RFC 9700");
    expect(butir[6]).toContain("hanya disebut");
    expect(butir[7]).toContain("Tahap 5");
    const [b1, b2, b3, b4, b5] = [ditunda[2]!, ditunda[3]!, ditunda[4]!, ditunda[5]!, ditunda[6]!];
    expect(b1[1]).toContain(`${timJumlah} orang dalam tiga tim (${timSuku[1]})`);
    expect(b1[1]).toContain(`${timJumlah} ÷ ${jumlahService} = ${fmt(timJumlah / jumlahService, 1)} orang per service (Hitungan)`);
    expect(b1[1]).toContain(`Transaksi uang ${fmt(trxT, 2)} per detik puncak`);
    expect(b2[1]).toContain(`${fmt(trxRata, 3)} per detik rata-rata dan ${fmt(trxT, 2)} puncak`);
    expect(b2[1]).toContain(`${fmt(notifT, 2)} per detik (Hitungan atas Asumsi)`);
    expect(b3[1]).toContain(`${fmt(topupT, 3)} per detik puncak`);
    expect(b3[1]).toContain("Rekaman lab `latensi.txt` bagian A");
    expect(b3[1]).toContain(`L = ${fmt(topupT, 3)} × ${fmt(anggaranMs / 1000, 2)} = ${fmt(lGrpc, 3)} koneksi (Hitungan atas Asumsi)`);
    expect(b4[1]).toContain(`${masukanKoneksi} = ${koneksi} dari \`max_connections\` ${maxKoneksi} (Hitungan; pool pembayaran, worker, admin, dan cadangan superuser adalah Asumsi naskah)`);
    expect(b4[1]).toContain(`W ${waktuBaca * 1000} ms, L baca paling banyak (${fmt(rpsT, 1)} − ${fmt(trxT, 2)}) × ${fmt(waktuBaca, 2)} = ${fmt(lBaca, 2)} (Hitungan atas Asumsi)`);
    expect(b4[1]).toContain("Rekaman lab `beban.txt` bagian A");
    expect(b5[1]).toContain("Satu kontrak OpenAPI (versi 4.0.0)");
    expect(b5[1]).toContain("Empat itu hitungan dari daftar jalur di `openapi.yaml`");
    expect(b5[1]).toContain("belum diukur: lab `api-t4` adalah server dan tidak memodelkan layar");
  });
  test("kolom 'Kapan keputusan ini salah': angka sekarang dan ambang per baris, tiap angka turunan ada di sel baris yang benar", () => {
    const k = salah.slice(2);
    expect(k[0]![3]).toContain(`${timJumlah} ÷ ${heuristikDev} = ${persen(timJumlah, heuristikDev)} (Hitungan atas Asumsi)`);
    expect(k[0]![1]).toContain(`${ambangL} koneksi atau lebih`);
    expect(k[0]![1]).toContain(`lebih dari ±${heuristikDev}`);
    expect(k[0]![3]).toContain(`${fmt(topupT, 3)} × ${timeoutGateway} = ${fmt(lGateway, 2)}, atau ${persen(lGateway, ambangL)} dari ${ambangL}`);
    expect(k[1]![1]).toContain("lima tim atau lebih");
    expect(k[1]![1]).toContain(`${pemicuPesan} pesan per detik terus-menerus`);
    expect(k[1]![3]).toContain(`${fmt(notifT, 2)} ÷ ${pemicuPesan} = ${persen(notifT, pemicuPesan, 1)} dari pemicu (Hitungan atas Asumsi)`);
    expect(k[2]![1]).toContain(`melewati ${anggaranMs} ms`);
    expect(k[2]![3]).toContain(`di bawah ${anggaranMs} ms di localhost satu mesin`);
    expect(k[2]![3]).toContain(`L = ${fmt(lGrpc, 3)} koneksi`);
    expect(k[3]![1]).toContain(`koneksi mencapai ${pemicuKoneksi} dari ${maxKoneksi}, yaitu tiga instance API lagi`);
    expect(k[3]![1]).toContain(`menahan ${ambangL} koneksi`);
    expect(k[3]![3]).toContain(`${koneksi} dari ${maxKoneksi}, atau ${persen(koneksi, pemicuKoneksi)} dari pemicu ${pemicuKoneksi}`);
    expect(k[3]![3]).toContain(`L baca paling banyak ${fmt(lBaca, 2)}, atau ${persen(lBaca, ambangL)} dari ${ambangL} (Hitungan atas Asumsi)`);
    expect(k[3]![3]).toContain(`p95 di bawah ${p95Lab} ms pada beban berjadwal di laptop (batas, bukan kapasitas)`);
    expect(k[4]![1]).toContain("lebih dari 3 request yang harus berurutan (Asumsi)");
    expect(k[4]![3]).toContain("Empat kelompok pemanggil, satu kontrak. Request berurutan per layar belum diukur");
    expect(k[5]![3]).toContain("PRD v4 tidak memintanya. Funnel pendaftaran belum diukur");
    expect(k[6]![3]).toContain("PRD v4 tidak memuat permintaan itu");
    expect(k[7]![3]).toContain("PRD v4 tidak memuat alur yang berjalan lebih dari satu hari");
  });
  test("label sumber di tiap baris tabel 'ditunda': Rekaman lab hanya untuk rekaman yang ditunjuk, butir 7 dan 8 Tidak dijalankan", () => {
    for (let i = 0; i < 8; i++) {
      const sel = ditunda[i + 2]!.join(" | ");
      const n = (sel.match(/Rekaman lab/g) ?? []).length;
      expect(n, `baris ${i + 1}`).toBe(i === 2 || i === 3 || i === 5 ? 1 : 0);
    }
    expect(ditunda[8]![1]).toContain("Hanya disebut, Tidak dijalankan");
    expect(ditunda[9]![1]).toContain("Hanya disebut, Tidak dijalankan");
    expect(badan).toContain("Semuanya Tidak dijalankan.");
  });
});

describe("rekaman, kontrak, dan kode lab yang dikutip halaman", () => {
  test("openapi.yaml: versi 4.0.0 dan empat kelompok pemanggil punya jalur", () => {
    expect(cari(/^ {2}version: (\S+)$/m, openapi, "versi openapi")[1]).toBe("4.0.0");
    for (const jalur of ["/login:", "/web/login:", "/bo/akun/{id}:", "/webhooks/pembayaran:"]) expect(openapi, jalur).toContain(`\n  ${jalur}\n`);
    expect(openapi).toContain("summary: Login dasbor web (warung, hr, admin)");
    expect(openapi).toContain("summary: Ringkasan satu akun untuk tim risk");
    expect(openapi).toContain("summary: Kabar dari gateway (klaim, bukan fakta)");
    for (const p of ["`/login`", "`/web/login`", "`/bo/akun/{id}`", "`/webhooks/pembayaran`"]) expect(badan).toContain(p);
  });
  test("rekaman lama b5-2-oidc: bagian B tanpa verifier 400, C tanpa PKCE 200, D aud app lain, kedaluwarsa, dan signature diubah 401", () => {
    const bag = (h: string): string => { const a = oidcTxt.indexOf(`== ${h}. `); const n = oidcTxt.indexOf("\n== ", a + 4); return oidcTxt.slice(a, n < 0 ? undefined : n); };
    expect(bag("B")).toContain("POST /token (code_verifier: false) → 400");
    expect(bag("C")).toContain("POST /token (code_verifier: false) → 200");
    expect(bag("C")).toContain("(PKCE: false)");
    const d = bag("D");
    expect(d.match(/→ 401/g)).toHaveLength(3);
    expect(d).toContain('aud "app-lain" bukan client id Rekeningo');
    expect(d).toContain("kedaluwarsa");
    expect(d).toContain("signature tidak cocok");
    expect(badan).toContain("Bagian B menolak penukaran code tanpa verifier dengan 400, dan bagian C menerimanya tanpa PKCE dengan 200. Bagian D menolak `aud` app lain, token kedaluwarsa, dan signature yang diubah dengan 401.");
    expect(badan).toContain("Lab itu tidak dijalankan ulang untuk halaman ini");
    for (const k of ['h.Alg != "RS256"', "signature tidak cocok", "c.Iss != idp", 'c.Aud != "rekeningo-app"', "kedaluwarsa"]) expect(kodeOidc, k).toContain(k);
  });
  test("Snippet: rentang baris sama dengan fungsi atau pernyataan yang diklaim, region ada, dan tanpa rujukan internal", () => {
    const tag = [...halaman.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!.trim());
    expect(tag).toEqual([
      'file="labs/api-t4/cmd/api/main.go" lines="326:344" lang="go" title="Kode lab: labs/api-t4/cmd/api/main.go baris 326 sampai 344 (pool dengan batas sendiri)"',
      'files={["labs/api-t4/internal/handler/latensi_ledger_test.go:23:25", "labs/api-t4/internal/handler/latensi_ledger_test.go:66:68"]} lang="go" title="Kode lab: labs/api-t4/internal/handler/latensi_ledger_test.go (anggaran 50 ms)"',
      'file="labs/b5-2-oidc/main.go" region="verifikasi" lang="go" title="Kode lab lama: labs/b5-2-oidc/main.go (pemeriksaan ID token)"',
    ]);
    const awalPool = kodeMain.findIndex((b) => b.startsWith("func bukaDB("));
    const akhirPool = kodeMain.findIndex((b, i) => i > awalPool && b === "}");
    expect([awalPool + 1, akhirPool + 1]).toEqual([326, 344]);
    expect(kodeMain.slice(awalPool, akhirPool + 1).join("\n")).toContain("db.SetMaxOpenConns(pool)");
    expect(kodeMain.join("\n")).toContain('pool := flag.Int("pool", 10,');
    const awalAng = kodeLatensi.findIndex((b) => b.startsWith("// AnggaranTambahanHTTP:"));
    const constAng = kodeLatensi.findIndex((b) => b.startsWith("const anggaranTambahanHTTP"));
    expect([awalAng + 1, constAng + 1]).toEqual([23, 25]);
    const awalCek = kodeLatensi.findIndex((b) => b.startsWith("\tif tambah95 >= anggaranTambahanHTTP {"));
    expect([awalCek + 1, awalCek + 3]).toEqual([66, 68]);
    expect(kodeLatensi[awalCek + 1]).toContain("t.Fatalf(");
    expect(kodeLatensi[awalCek + 2]).toBe("\t}");
    expect(kodeOidc).toContain("// --8<-- [start:verifikasi]");
    expect(kodeOidc).toContain("// --8<-- [end:verifikasi]");
    const tampil = [kodeMain.slice(awalPool, akhirPool + 1), kodeLatensi.slice(awalAng, constAng + 1), kodeLatensi.slice(awalCek, awalCek + 3),
      kodeOidc.slice(kodeOidc.indexOf("[start:verifikasi]"), kodeOidc.indexOf("[end:verifikasi]")).split("\n")].map((x) => x.join("\n")).join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}|PR #?\d+|tinjauan/);
  });
  test("klaim 'tidak ada': sebelas folder lab Tahap 4, jenis file yang disebut halaman, di luar output; api-t4 untuk bff dan login sosial", () => {
    const folder = ["api-t4", ...["audit", "infra", "integrasi", "kartu", "modul", "pipeline", "qr", "ssrf", "storage", "webhook"].map((x) => `t4-${x}`)];
    expect(fs.readdirSync(path.join(akar, "labs")).filter((x) => x === "api-t4" || x.startsWith("t4-")).sort()).toEqual([...folder].sort());
    const jenis = /(^|\/)(Makefile|Caddyfile|go\.mod|go\.sum|(docker-)?compose[^/]*\.ya?ml|[^/]+\.(py|go|sql|ya?ml))$/;
    const luar = new Set(["output", "node_modules", ".venv", ".git", "vendor", ".terraform"]);
    const berkas = (dir: string, keluar: string[] = []): string[] => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) { if (!luar.has(e.name)) berkas(path.join(dir, e.name), keluar); } else if (jenis.test(e.name) || jenis.test(`/${e.name}`)) keluar.push(path.join(dir, e.name));
      }
      return keluar;
    };
    const semuaBerkas = folder.flatMap((f) => berkas(path.join(akar, "labs", f)));
    const apiBerkas = berkas(path.join(akar, "labs", "api-t4"));
    expect(semuaBerkas.length).toBeGreaterThan(80);
    expect(apiBerkas.length).toBeGreaterThan(30);
    const hit = (daftar: string[], pola: RegExp): string[] => daftar.filter((f) => pola.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(akar, f));
    expect(hit(semuaBerkas, DITUNDA)).toEqual([]);
    expect(hit(apiBerkas, API_SAJA)).toEqual([]);
    const nama = (r: RegExp): string[] => r.source.split("|").map((x) => x.replace(/\\b/g, "")).sort();
    const tertulis = (awal: string, akhir: string): string[] => {
      const a = badan.indexOf(awal) + awal.length;
      return badan.slice(a, badan.indexOf(akhir, a)).split(/, (?:atau )?| atau /).map((x) => x.replace(/`/g, "").trim()).sort();
    };
    expect(tertulis("Tes itu tidak menemukan nama ", ". Di `labs/api-t4`")).toEqual(nama(DITUNDA));
    expect(tertulis("tes juga tidak menemukan ", ". Klaim ini hanya")).toEqual(nama(API_SAJA));
    // kontrol positif: pemindai membaca file, dan lingkup api-t4 bukan seluruh lab (oauth ada di go.mod server MCP t4-audit)
    expect(hit(semuaBerkas, /oauth/i)).toContain("labs/t4-audit/mcp/go.mod");
    expect(hit(apiBerkas, /postgres/i).length).toBeGreaterThan(5);
    for (const k of ["compose, `go.mod`, `go.sum`, Makefile, skrip Python, kode Go, SQL, dan YAML", "sebelas folder lab Tahap 4", "`api-t4` dan sepuluh `t4-*`", "di luar `output/`", "Klaim ini hanya untuk folder dan jenis file itu."]) expect(badan, k).toContain(k);
  });
  test("klaim 'PRD v4 tidak memintanya' dan 'tak satu pun dari delapan diminta PRD v4': bagian PRD naskah tidak memuat satu pun nama", () => {
    const prd = naskah.slice(naskah.indexOf("## 1. PRD v4"), naskah.indexOf("## 2. Dari fitur"));
    expect(prd.length).toBeGreaterThan(5000);
    for (const n of ["kubernetes", "service mesh", "kafka", "grpc", "pgbouncer", "replica", "bff", "oauth", "oidc", "login sosial", "slsa", "provenance", "message signatures", "durable", "event streaming"])
      expect(prd.toLowerCase(), n).not.toContain(n);
    expect(prd).toContain("foto kartu identitas dan swafoto");
    expect(prd).toContain("**Bukan lingkup v4.** Pembayaran offline");
    expect(prd).toContain("| P2 | Ditunda ke v5 | Laporan merchant real-time, notifikasi massal skala besar, cicilan dan tabungan, API publik untuk POS |");
    expect(badan).toContain("Tak satu pun dari delapan diminta PRD v4 ([[t4-prd]])");
    expect(badan).toContain("PRD v4 tidak memintanya. Pendaftaran memakai verifikasi foto kartu identitas dan swafoto ([[t4-prd]])");
    const adr3444 = naskah.split("\n").filter((b) => /^\| (3[4-9]|4[0-4]) \|/.test(b));
    expect(adr3444).toHaveLength(11);
    expect(adr3444.join("\n")).not.toMatch(/cache saldo|\bCDC\b/i);
    expect(adr3444.find((b) => b.startsWith("| 39 |"))).toContain("VPS kedua tetap ditunda");
    expect(badan).toContain("ADR 39 menulis VPS kedua tetap ditunda");
    expect(badan).toContain("PRD v4 mengeluarkan pembayaran offline dari lingkupnya");
  });
});

describe("login sosial: bagian RFC dan OpenID Connect yang dikutip sama dengan baris riset", () => {
  const baris = barisRiset("R4-250");
  const potong = (awal: RegExp, akhir: RegExp): string => { const a = baris.search(awal); const rest = baris.slice(a + 1); const n = rest.search(akhir); return n < 0 ? baris.slice(a) : baris.slice(a, a + 1 + n); };
  const bagianDari = (s: string): string[] => [...s.matchAll(/bagian (\d+(?:\.\d+)*)/g)].map((m) => m[1]!);
  const rfc: Record<string, string[]> = {
    "RFC 8252": bagianDari(potong(/RFC 8252 \(/, /RFC 7636 \(/)),
    "RFC 7636": bagianDari(potong(/RFC 7636 \(/, /RFC 9700 \(/)),
    "RFC 9700": bagianDari(potong(/RFC 9700 \(/, /OpenID Connect Core 1\.0 \(/)),
    "OpenID Connect Core": bagianDari(potong(/OpenID Connect Core 1\.0 \(/, /Batas:/)),
  };
  test("bagian di baris riset: RFC 8252 6, 8.5, 8.12; RFC 7636 4.2; RFC 9700 2.1.1, 2.1.2; OpenID Connect Core 3.1.3.7", () => {
    expect(rfc).toEqual({ "RFC 8252": ["6", "8.5", "8.12"], "RFC 7636": ["4.2"], "RFC 9700": ["2.1.1", "2.1.2"], "OpenID Connect Core": ["3.1.3.7"] });
    for (const [kunci, tahun] of [["RFC 8252 (BCP 212, Oktober 2017)", ""], ["RFC 7636 (September 2015)", ""], ["RFC 9700 (BCP 240, Januari 2025)", ""], ["OpenID Connect Core 1.0 (errata set 2, 15 Desember 2023)", ""]] as const) expect(baris, kunci + tahun).toContain(kunci);
    expect(baris).toContain("dibuka 2026-10-31");
  });
  test("tiap rujukan 'RFC n §x' di halaman ada di baris riset untuk RFC yang sama, dan tiap syarat bernomor", () => {
    const pasangan = [...badan.matchAll(/(RFC \d{4}|OpenID Connect Core) §(\d+(?:\.\d+)*)/g)].map((m) => [m[1]!, m[2]!] as const);
    expect(pasangan.length).toBeGreaterThanOrEqual(8);
    const unik = [...new Set(pasangan.map(([a, b]) => `${a} §${b}`))].sort();
    expect(unik).toEqual(["OpenID Connect Core §3.1.3.7", "RFC 7636 §4.2", "RFC 8252 §6", "RFC 8252 §8.12", "RFC 8252 §8.5", "RFC 9700 §2.1.1", "RFC 9700 §2.1.2"].sort());
    for (const [nama, bagian] of pasangan) {
      const kunci = nama === "OpenID Connect Core" ? nama : nama;
      expect(rfc[kunci], `${nama} §${bagian}`).toContain(bagian);
    }
    const syarat = badan.slice(badan.indexOf("**Kalau login sosial nanti dikerjakan,**"), badan.indexOf("Rekaman lab lama `b5-2-oidc` memerankan"));
    expect([...syarat.matchAll(/^(\d)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4", "5"]);
    expect(syarat).toContain("lima syarat berlaku sejak awal");
    for (const k of ["melarang app native memakai embedded user-agent", "mewajibkan PKCE bagi public client native dan mewajibkan server mendukungnya", "menulis hal yang sama untuk semua public client", "mewajibkan metode S256 bagi client yang mampu memakainya", "client sebaiknya tidak memakai response type `token`", "secret yang ikut terpasang di app untuk banyak user tidak dianggap rahasia, dan tidak dianjurkan sebagai syarat server", "client menolak ID token bila `aud` tidak memuat client id miliknya, dan bahwa waktu sekarang harus sebelum `exp`", "(penalaran)"]) expect(syarat, k).toContain(k);
  });
});

describe("ID registry, nomor ADR, tautan, template blok, riset, dan kartu", () => {
  test("registry: halaman 4.29 jenis adr, ADR 45, prasyarat 4.28, menit sama dengan baris meta, judul dan peta naskah sama", () => {
    const h = dari("t4-adr-45");
    expect(h).toMatchObject({ nomor: "4.29", ada: true, jenis: "adr", inti: true, adr: [45], tahap: 4, prasyarat: ["t4-estimasi"], path: "tahap-4/sengaja-belum.md", peran: ["backend"] });
    expect(dari("t4-estimasi").nomor).toBe("4.28");
    expect(dari("t4-rekap").prasyarat).toEqual(["t4-adr-45"]);
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-estimasi\]\] · Jalur inti<\/p>/, halaman, "baris meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(halaman.startsWith(`---\ntitle: "4.29 ${h.judul}"\n`)).toBe(true);
    expect(naskah).toContain("| 4.29 | 4 | ADR 45: Sengaja belum dilakukan | ADR | ★ | – | – |");
    expect(h.menit).toBeGreaterThanOrEqual(20);
    expect(h.menit).toBeLessThanOrEqual(26);
  });
  test("nomor ADR di halaman cocok dengan registry: tiap 'ADR n ([[id]])' dan tiap ADR yang dituju", () => {
    const pasangan = [...badan.matchAll(/ADR (\d+) \(\[\[([a-z0-9-]+)\]\]\)/g)].map((m) => [Number(m[1]), m[2]!] as const);
    expect(pasangan).toEqual([[36, "t4-breaker"], [37, "t4-modul"], [44, "t4-tim-infra"]]);
    for (const [n, id] of pasangan) expect(dari(id).adr, `${id}`).toContain(n);
    const baris = (b: string, id: string): string => (badan.split("\n").find((x) => x.includes(b)) ?? "") + `|${id}`;
    expect(baris("Satu service kedua", "t4-modul")).toContain("(ADR 37)");
    expect(dari("t4-modul").adr).toEqual([37]);
    expect(dari("t4-breaker").adr).toEqual([36]);
    expect(dari("t4-infra-secret").adr).toEqual([39]);
    expect(dari("t4-webhook").adr).toEqual([34]);
    expect(dari("t3-adr-33").adr).toEqual([33]);
    expect(dari("t2-adr-21").adr).toEqual([21]);
    expect(dari("t1-adr-12").adr).toEqual([12]);
    expect(dari("t3-outbox").adr).toContain(23);
    expect(dari("t2-job-rekonsiliasi").adr).toContain(19);
    const dipakai = [...new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
    const dikenal = new Set(hal.flatMap((h) => h.adr ?? []));
    expect(dipakai).toEqual([19, 23, 33, 34, 36, 37, 39, 44]);
    for (const n of dipakai) expect(dikenal.has(n), `ADR ${n}`).toBe(true);
  });
  test("tautan [[id]]: semua id ada di registry, himpunan dan jumlah per tujuan terkunci, dan ADR yang dijanjikan ditepati", () => {
    const tautan = [...halaman.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!);
    for (const id of new Set(tautan)) if (id !== "berikutnya") expect(hal.some((x) => x.id === id), id).toBe(true);
    const hitung: Record<string, number> = {};
    for (const t of tautan) hitung[t] = (hitung[t] ?? 0) + 1;
    expect(Object.keys(hitung).sort()).toEqual(["A0", "berikutnya", "t1-adr-12", "t2-adr-21", "t2-race-lock", "t3-adr-33", "t4-breaker", "t4-estimasi", "t4-infra-secret", "t4-jembatan", "t4-m39", "t4-modul", "t4-prd", "t4-tim-infra", "t4-webhook"]);
    expect(hitung).toEqual({ "A0": 1, "berikutnya": 1, "t1-adr-12": 1, "t2-adr-21": 5, "t2-race-lock": 1, "t3-adr-33": 6, "t4-breaker": 3, "t4-estimasi": 3, "t4-infra-secret": 1, "t4-jembatan": 1, "t4-m39": 1, "t4-modul": 6, "t4-prd": 3, "t4-tim-infra": 3, "t4-webhook": 1 });
    expect(dari("t4-m39").nomor).toBe("4.27");
    expect(dari("t4-jembatan").nomor).toBe("4.31");
    expect(dari("t4-tim-infra").nomor).toBe("4.26");
    expect(dari("t4-jembatan").prasyarat).toEqual(["t4-rekap"]);
    expect(badan).toContain("[[t4-jembatan]] meminta kamu menebak keputusan Tahap 4 mana yang pecah lebih dulu");
    expect(naskah).toContain("Pembaca diminta menebak: dari ADR Tahap 4, mana yang pecah lebih dulu?");
  });
  test("template adr: enam blok dalam urutan, dua pertama terbuka, dan tiap blok ditutup", () => {
    const b = daftarBlok(halaman);
    expect(b.map((x) => x.nama)).toEqual(["Kebutuhan", "Opsi", "Yang dipilih dan kenapa", "Wujud di kode", "Coba keduanya", "Kapan keputusan ini salah"]);
    expect(cekTemplat("adr", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Kebutuhan", "Opsi"]);
    expect([...halaman.matchAll(/<Blok ([^>]*)>/g)].map((m) => m[1])).toEqual(['nama="Kebutuhan" buka', 'nama="Opsi" buka', 'nama="Yang dipilih dan kenapa"', 'nama="Wujud di kode"', 'nama="Coba keduanya"', 'nama="Kapan keputusan ini salah"']);
    expect((halaman.match(/<\/Blok>/g) ?? []).length).toBe(6);
    expect(halaman).toContain('import Tebak from "../../../widgets/tebak/Tebak.tsx";');
    expect((halaman.match(/<Rantai /g) ?? []).length).toBe(1);
    expect((halaman.match(/<Tebak /g) ?? []).length).toBe(1);
    expect(halaman).toContain("<Rantai data={intiDiagram} ringkas />");
    expect(halaman).toContain("<Tebak client:visible data={dataTebak} />");
    expect(halaman).toContain("<noscript>");
    expect((halaman.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((halaman.match(/<details class="success">/g) ?? []).length).toBe(3);
    expect((halaman.match(/<summary>Jawaban<\/summary>/g) ?? []).length).toBe(3);
    expect(halaman).toContain("<summary>Sudah tahu? Cek 3 pertanyaan</summary>");
  });
  test("tautan luar: tiap alamat ada di baris riset R4-250 sampai R4-254 atau di baris riset lama yang disebut, dengan tanggal buka 2026-10-31", () => {
    const tautan = [...badan.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!.replace(/^https:\/\//, "").replace(/#.*$/, "").replace(/\/$/, "").replace(/^www\./, ""));
    const ids = ["R4-250", "R4-251", "R4-252", "R4-253", "R4-254"];
    const sumber = ids.map(barisRiset).join("\n");
    const esc = (x: string): string => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expect([...new Set(tautan)].filter((u) => !new RegExp(`${esc(u)}/?(?![\\w./#-])`).test(sumber)).sort()).toEqual([]);
    expect(new Set(tautan).size).toBe(16);
    expect(tautan.length).toBe(21);
    expect(badan.match(/dibuka 2026-10-31/g) ?? []).toHaveLength(2);
    for (const id of ids) expect(barisRiset(id), id).toContain("2026-10-31");
    expect(badan).not.toMatch(/dibuka 2026-10-(?!31)/);
  });
  test("baris riset: lima baris berurutan R4-250 sampai R4-254 sesudah R4-234 dan sebelum R4-300, lima kolom, tanpa ID ganda", () => {
    const ids = ["R4-250", "R4-251", "R4-252", "R4-253", "R4-254"];
    const semua = [...riset.matchAll(/^\| (R4-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(semua).size).toBe(semua.length);
    const i = semua.indexOf("R4-250");
    expect(semua.slice(i - 1, i + 6)).toEqual(["R4-234", ...ids, "R4-300"]);
    for (const id of ids) { const b = barisRiset(id); expect(b.split(" | ").length, id).toBe(5); expect(b.split("\n")).toHaveLength(1); }
    expect(barisRiset("R4-250")).toContain("| 4.29: lima syarat login sosial");
    expect(barisRiset("R4-254")).toContain("Shopify Engineering, Deconstructing the Monolith (Westeinde, 2019-02-21)");
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, diagram, dan tebak", () => {
    for (const [nama, t] of [["halaman", halaman], ["rantai", JSON.stringify(rantaiMentah)], ["tebak", JSON.stringify(tebakMentah)]] as const) {
      expect(t, nama).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}|\bPR #?\d{2,3}\b|#\d{3}/);
    }
  });
  test("kartu ulang: tiga kartu t4-adr-45 dari bagian Cek diri, dan labelnya sama dengan pertanyaan di halaman", () => {
    const kartu = (JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string }[]).filter((k) => k.halaman === "t4-adr-45");
    expect(kartu.map((k) => k.id)).toEqual(["t4-adr-45-1", "t4-adr-45-2", "t4-adr-45-3"]);
    for (const k of kartu) { expect(k.url).toBe("tahap-4/sengaja-belum/"); expect(k.judul).toBe("4.29 ADR 45: Sengaja belum dilakukan"); }
    const tanya = [...halaman.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(tanya).toHaveLength(3);
    tanya.forEach((t, i) => expect(kartu[i]!.tanya).toBe(t));
    expect(tanya[0]).toContain(`${koneksi} dari ${maxKoneksi}`);
  });
});

describe("diagram Inti dan Tebak: nilai diturunkan dari hitungan, bukan ditulis ulang", () => {
  const rantai = DataRantai.parse(rantaiMentah);
  const tebak = DataTebak.parse(tebakMentah);
  test("diagram: dua baris, tiga simpul, nilai dan sub sama dengan hitungan; sumber Asumsi", () => {
    expect(rantai.sumber.jenis).toBe("asumsi");
    expect(rantai.baris.map((b) => b.label)).toEqual(["PgBouncer", "Read replica"]);
    const [a, b] = rantai.baris as [typeof rantai.baris[0], typeof rantai.baris[0]];
    expect(a.simpul.map((s) => s.teks)).toEqual([`${koneksi} dari ${maxKoneksi}`, `pemicu ${pemicuKoneksi}`, `+${tambah} instance`]);
    expect(a.simpul[0]!.sub).toBe(`${masukanKoneksi} koneksi`);
    expect(a.simpul[2]!.sub).toBe(`(${pemicuKoneksi} − ${tetap}) ÷ ${poolApi} = ${instancePemicu} instance API, dua sudah ada`);
    expect(b.simpul.map((s) => s.teks)).toEqual([`${fmt(lBaca, 2)} koneksi`, `pemicu ${ambangL}`, `bacaan ×${fmt(ambangL / lBaca, 1)}`]);
    expect(b.simpul[0]!.sub).toBe(`(${fmt(rpsT, 1)} − ${fmt(trxT, 2)}) × ${fmt(waktuBaca, 2)}; semua selain uang dianggap baca`);
    expect(b.simpul[2]!.sub).toBe(`${ambangL} ÷ ${fmt(lBaca, 2)} = ${fmt(ambangL / lBaca, 1)} kali bacaan sekarang`);
    expect(a.simpul[1]!.sub).toBe(`Asumsi ADR 33: ${pemicuKoneksi}% dari max_connections`);
    expect(b.simpul[1]!.sub).toBe("Asumsi ADR 33, separuh pool 10");
    expect(a.simpul.map((s) => s.nada)).toEqual(["biasa", "warn", "good"]);
    expect(b.simpul.map((s) => s.nada)).toEqual(["biasa", "warn", "good"]);
    expect(rantai.sumber.teks).toBe(`Hitungan atas Asumsi naskah Tahap 4; pemicu ${pemicuKoneksi} dan ${ambangL} adalah Asumsi ADR 33`);
    expect(rantai.catatan).toBe("Dua dari empat pemicu berupa angka beban. Keduanya masih di bawah pemicu; kapasitas satu server belum diukur di server sungguhan, jadi jarak ini hitungan, bukan bukti.");
    expect(badan).toContain("Delapan penundaan punya pemicu tertulis, dan kapasitas satu server belum diukur.");
  });
  test("tebak: empat pilihan, tepat satu benar dan itu rasio terbesar, di posisi ketiga dan bukan yang terpanjang; alasan memuat hitungannya", () => {
    expect(tebak.pilihan).toHaveLength(4);
    const benar = tebak.pilihan.map((p, i) => (p.benar ? i : -1)).filter((i) => i >= 0);
    expect(benar).toEqual([2]);
    const panjang = tebak.pilihan.map((p) => p.teks.length);
    expect(panjang[2]).toBeLessThan(Math.max(...panjang));
    expect(tebak.pilihan[2]!.teks).toBe("PgBouncer, untuk koneksi database");
    const per = tebak.pilihan.map((p) => p.alasan);
    expect(per[0]).toContain(`Notifikasi uang ${fmt(notifT, 2)} per detik dari pemicu ${pemicuPesan} per detik: ${persen(notifT, pemicuPesan, 1)}`);
    expect(per[1]).toContain(`${fmt(topupT, 3)} × ${timeoutGateway} = ${fmt(lGateway, 2)} koneksi, dari pemicu ${ambangL}: ${persen(lGateway, ambangL)}`);
    expect(per[2]).toContain(`${masukanKoneksi} = ${koneksi} dari ${maxKoneksi}. Pemicu ${pemicuKoneksi} berarti ${koneksi} ÷ ${pemicuKoneksi} = ${persen(koneksi, pemicuKoneksi)} jalan, dan lima instance API dengan pool ${poolApi} sampai di sana`);
    expect(per[3]).toContain(`(${fmt(rpsT, 1)} − ${fmt(trxT, 2)}) × ${fmt(waktuBaca, 2)} = ${fmt(lBaca, 2)}, dari pemicu ${ambangL}: ${persen(lBaca, ambangL)}`);
    expect(per[3]).toContain(`${persen(lBaca, ambangL)} masih di bawah ${persen(koneksi, pemicuKoneksi)}`);
    expect(tebak.penutup).toContain(`baru ${persen(koneksi, pemicuKoneksi)} dari pemicunya, dan pemicunya Asumsi`);
    expect(tebak.sumber.jenis).toBe("asumsi");
    expect(tebak.adegan.join(" ")).toContain(`puncak ${fmt(rpsT, 1)} request per detik, ${fmt(trxT, 2)} transaksi uang per detik dan ${fmt(notifT, 2)} notifikasi uang per detik, dua instance API dengan pool ${poolApi}, dan dua instance pembayaran dengan pool 5`);
    const noscript = cari(/<noscript>\s*<p>(.*)<\/p>\s*<\/noscript>/s, badan, "noscript")[1]!;
    expect(noscript).toContain(`Jawaban yang tepat: PgBouncer. Koneksi ${koneksi} dari pemicu ${pemicuKoneksi} adalah ${persen(koneksi, pemicuKoneksi)}, sedangkan read replica ${persen(lBaca, ambangL)}, service per modul ${persen(lGateway, ambangL)}, dan Kafka ${persen(notifT, pemicuPesan, 1)}.`);
  });
  test("'ubah satu hal': tiap baris tabel memakai rumus instance × pool + 20, dengan persen dan catatan pemicu", () => {
    const t = tabel("| Perubahan | Koneksi |").slice(2);
    const kasus: [number, number][] = [[2, 10], [3, 10], [4, 10], [5, 10], [5, 5], [8, 10]];
    expect(t).toHaveLength(kasus.length);
    kasus.forEach(([n, pool], i) => {
      const k = n * pool + tetap;
      const catatan = k >= maxKoneksi ? ": `max_connections` habis" : k >= pemicuKoneksi ? ": pemicu tercapai" : "";
      const label = i === 0 ? `Sekarang: ${n} instance API, pool ${pool}` : pool === poolApi ? `${n} instance` : `${n} instance, pool ${pool}`;
      expect(t[i], `baris ${i}`).toEqual([label, String(k), `${persen(k, pemicuKoneksi)}${catatan}`]);
    });
    expect(t[0]![1]).toBe(String(koneksi));
    expect(badan).toContain("Hitungannya instance × pool + 2 × 5 + 4 + 3 + 3.");
    expect(badan).toContain("Pool pembayaran 2 × 5, worker 4, admin 3, dan cadangan superuser 3 adalah Asumsi naskah.");
  });
});

describe("definisi label, simbol, dan istilah di pemakaian pertama", () => {
  test("Asumsi, Hitungan, Penalaran, dan L = λ × W didefinisikan sebelum dipakai di prosa dan tabel", () => {
    const a = badan.indexOf("[[A0]] menjelaskan label Rekaman lab, Asumsi, Tidak dijalankan, dan [perlu verifikasi]");
    expect(a).toBeGreaterThan(0);
    expect(badan.indexOf("Asumsi")).toBeGreaterThan(a - 1);
    expect(badan.indexOf("Hitungan")).toBe(badan.indexOf("Hitungan adalah hasil rumus yang tertulis di halaman, dan labelnya ikut masukan yang paling lemah."));
    expect(badan.indexOf("(penalaran)")).toBeGreaterThan(badan.indexOf("Penalaran adalah kesimpulan dari dokumentasi dan angka di halaman ini tanpa dijalankan, jadi labelnya Tidak dijalankan."));
    expect(badan.indexOf("Tidak dijalankan")).toBeGreaterThan(a - 1);
    const defL = badan.indexOf("Tabel memakai L = λ × W.");
    expect(defL).toBeGreaterThan(0);
    expect(badan.search(/\bL\b/)).toBeGreaterThanOrEqual(defL);
    expect(badan.indexOf("λ")).toBeGreaterThanOrEqual(defL);
    expect(badan).toContain("Koneksi yang tertahan (L) sama dengan laju kedatangan (λ, per detik) kali lama satu koneksi ditahan (W, detik).");
    expect(JSON.stringify(rantaiMentah) + JSON.stringify(tebakMentah)).not.toMatch(/\bL\b|λ/);
  });
  test("istilah baru diberi arti di daftar 'Apa kedelapannya' sebelum dipakai di prosa Kenapa dan Opsi", () => {
    const daftar = badan.indexOf("### Apa kedelapannya");
    const kenapa = badan.indexOf("### Kenapa ADR ini ada");
    expect(daftar).toBeGreaterThan(0);
    expect(daftar).toBeLessThan(kenapa);
    const hurufKecil = badan.toLowerCase();
    for (const t of ["kubernetes", "service mesh", "kafka", "grpc", "bff", "slsa", "durable execution", "event streaming", "openid connect", "http message signatures"]) {
      const pertama = hurufKecil.indexOf(t);
      expect(pertama, t).toBeGreaterThan(daftar - 1);
    }
    const arti = ["Service adalah program yang di-deploy dan diskalakan sendiri", "Kubernetes menjadwalkan banyak proses di banyak mesin", "Service mesh adalah lapisan infrastruktur untuk keamanan, observability, dan lalu lintas antar service tanpa mengubah kode", "Kafka adalah platform event streaming: ia menyimpan aliran event tahan lama untuk dibaca banyak consumer", "gRPC memanggil metode di service lain seperti fungsi lokal, dengan skema protocol buffers", "Read replica adalah salinan database yang melayani bacaan", "PgBouncer adalah pooler", "BFF (backend for frontend) adalah satu backend per jenis antarmuka", "lapisan identitas di atas OAuth 2.0", "Provenance adalah data terverifikasi tentang di mana, kapan, dan bagaimana sebuah artefak dibuat", "HTTP Message Signatures menandatangani komponen pesan HTTP", "Durable execution menjalankan alur panjang yang, bila prosesnya mati, dilanjutkan dari titik berhenti oleh proses lain", "Event streaming dijelaskan di butir 2"];
    for (const a of arti) expect(badan.slice(daftar, kenapa), a).toContain(a);
    expect(badan.slice(daftar, kenapa).match(/^\d\. \*\*/gm)).toHaveLength(8);
    expect(badan).toContain("kontrak OpenAPI, yaitu bentuk request dan response yang disepakati kedua sisi");
  });
});

describe("kasus industri Shopify dan klaim yang tidak melampaui sumber", () => {
  test("Shopify: tanggal, jumlah developer, dan perbandingan dengan Tahap 4 sama dengan baris riset; ada batasnya", () => {
    const r = barisRiset("R4-254");
    expect(r).toContain("2019-02-21");
    expect(r).toContain("lebih dari satu dekade dan lebih dari seribu developer");
    expect(badan).toContain("Deconstructing the Monolith, 2019-02-21, dibuka 2026-10-31");
    expect(badan).toContain("dikerjakan lebih dari sepuluh tahun oleh lebih dari seribu developer");
    expect(badan).toContain(`1.000 ÷ ${timJumlah} ≈ ${fmt(1000 / timJumlah)} kali Tahap 4 (Hitungan atas Asumsi)`);
    expect(badan).toContain("Batasnya: satu aplikasi Rails");
    expect(badan).toContain("tulisan perusahaan tentang keputusannya sendiri");
    expect(badan).toContain("Halaman ini hanya memakai bagian tentang biaya pipeline.");
    expect(badan).not.toMatch(/Segment melaporkan/);
  });
  test("heuristik ±50 developer berlabel [perlu verifikasi] dan tidak ditulis sebagai fakta; 4.13 menolak memakainya sebagai pembanding", () => {
    const modul = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
    expect(modul).toContain("Pencarian 2026-10-29 tidak menemukan sumber primer untuk angka itu");
    expect(modul).toContain("Halaman ini tidak memakainya sebagai pembanding.");
    expect(badan).toContain("±50 developer adalah heuristik praktisi tanpa sumber primer [perlu verifikasi]");
    expect(badan).toContain("Heuristik ±50 developer tidak punya sumber primer [perlu verifikasi]");
    for (const l of badan.split("\n").filter((b) => b.includes("±50"))) expect(l, l.slice(0, 60)).toMatch(/perlu verifikasi|heuristik|Hitungan atas Asumsi|Atau developer lebih dari ±50|ADR 37|naskah/i);
  });
  test("satu role dan satu pool untuk lima modul: kalimat pre-mortem sama dengan halaman 4.13", () => {
    const modul = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
    expect(modul).toContain("proses monolith memakai satu role, `t4m_monolit`, dan pool per modul belum dibangun");
    expect(modul).toContain("| Satu pool koneksi per modul | Lab belum membangunnya: monolith memakai satu role dan satu pool | Belum dijadwalkan |");
    expect(badan).toContain("Lima modul memakai satu role dan satu pool, jadi L per modul tidak bisa dibaca, dan pool per modul belum dijadwalkan ([[t4-modul]])");
    expect(badan).toContain("L modul di dalam monolith belum terbaca: satu role dan satu pool");
  });
  test("ADR 39 menulis app tetap berhenti selama mesin diganti, dan ADR 37 memanggil ledger lewat API dengan Idempotency-Key", () => {
    const adr = (n: number): string => naskah.split("\n").find((b) => b.startsWith(`| ${n} |`)) ?? "";
    expect(adr(39)).toContain("app tetap berhenti selama mesin diganti");
    expect(adr(37)).toContain("service pembayaran meminta jurnal lewat API ledger dengan Idempotency-Key");
    expect(adr(37)).toContain("modul `ledger`, `akun`, `identitas`, `merchant`, `platform`");
    expect(adr(34)).toContain("Tanda tangan HMAC-SHA256 diperiksa atas byte mentah");
    expect(adr(44)).toContain("image ditandatangani cosign per digest");
    expect(adr(44)).toContain("SBOM CycloneDX");
    expect(adr(44)).toContain("Deploy produksi blue/green dengan dua instance");
    expect(adr(19) + naskah).toContain("job idempoten (ADR 19)");
    expect(naskah).toContain("Cicilan dan tabungan, dengan proses batch harian.");
    expect(naskah).toContain("Tim naik dari 13 menjadi 20 sampai 40 orang dalam 5 sampai 7 tim");
    expect(badan).toContain("Naskah ADR 44 menandatangani image per digest dan membuat SBOM");
    expect(badan).toContain("HMAC-SHA256 atas timestamp dan byte mentah body (ADR 34)");
    expect(openapi).toContain('Tanda tangan HMAC-SHA256 atas "<timestamp>.<byte mentah body>"');
  });
});

// --- lapis 2: kunci per baris, sidik kata penentu, struktur, angka, dan label
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya"];
const sidik = (teks: string, kata: string[]): Record<string, number> =>
  Object.fromEntries(kata.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
const nilaiString = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) nilaiString(y, keluar);
  else if (x && typeof x === "object") for (const y of Object.values(x)) nilaiString(y, keluar);
  return keluar;
};
const tekstual = (x: unknown, keluar: string[] = []): string[] => {
  if (typeof x === "string") keluar.push(x);
  else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
  else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
  else if (typeof x === "number" || typeof x === "boolean") keluar.push(`=${String(x)}`);
  return keluar;
};
const h16 = (t: string): string => createHash("sha256").update(t).digest("hex").slice(0, 16);
const SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"(\[*_`])/;
const prosa = badan.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<Snippet"));
const struktur = prosa.map((b) => {
  if (b.startsWith("#")) return b.match(/^#+/)![0];
  if (b.startsWith("|")) return `|:${b.split("|").length - 2}`;
  if (b.startsWith("<")) return b.match(/^<\/?[A-Za-z]+/)![0];
  const n = b.split(SPLIT).length;
  if (b.startsWith("- ")) return `-:${n}`;
  if (/^\d+\. /.test(b)) return `${b.match(/^\d+/)![0]}.:${n}`;
  if (/^\*\*\d+\.\*\*/.test(b)) return `**${b.match(/\d+/)![0]}**:${n}`;
  return `p:${n}`;
});
const angka = prosa.flatMap((b) => [...b.replace(/\]\([^)]*\)/g, "]").matchAll(/(?<![\w.])\d+(?:[.,]\d+)*(?!\w)/g)].map((m) => m[0]));
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length, penalaran: (halaman.match(/penalaran/gi) ?? []).length,
    dibuka: (halaman.match(/dibuka 2026-10-31/g) ?? []).length, tanggal: (halaman.match(/2026-10-31/g) ?? []).length,
  },
  halaman: sidik(halaman, KATA), rantai: sidik(nilaiString(rantaiMentah).join("\n"), KATA), tebak: sidik(nilaiString(tebakMentah).join("\n"), KATA),
  struktur: struktur.join(" "), angka: angka.join(" "),
  tabel: badan.split("\n").filter((b) => b.startsWith("|")).map(h16),
  riset: ["R4-250", "R4-251", "R4-252", "R4-253", "R4-254"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), tebak: h16(JSON.stringify(tebakMentah)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = { halaman: halaman.split("\n").filter((b) => b.trim() !== ""), json: { rantai: tekstual(rantaiMentah), tebak: tekstual(tebakMentah) } };
if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat sengaja-belum-t4.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "sengaja-belum-t4.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, dan tebak terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram dan tebak sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, tabel, dan berkas", () => {
  test("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
  });
  test("sidik kata penentu halaman, diagram, dan tebak", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.tebak).toEqual(SIDIK.tebak);
  });
  test("sidik struktur, angka prosa, tabel per baris, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.tabel).toEqual(SIDIK.tabel);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
