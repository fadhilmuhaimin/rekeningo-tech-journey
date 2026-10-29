// Penjaga angka halaman 4.3 (keputusan 1274 sampai 1276): angka, ID, nomor, versi sumber, tautan, rentang Snippet, tabel, dan
// klaim "hanya" atau "tidak ada" yang ditulis tangan di fitur-topup-verifikasi.mdx, diagram t4-topup-verifikasi-inti.json, dan
// dua skenario alur t4-topup.json dan t4-verifikasi.json diturunkan dari rekaman labs/api-t4/output/, kode lab, naskah,
// registry, dan RISET, bukan dari daftar yang ditulis sendiri. Pola: job-rekonsiliasi.halaman.test.ts dan fitur-notifikasi.halaman.test.ts.
// Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata halaman, diagram, dan skenario
// dikunci per baris di fitur-topup-verifikasi.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1) untuk mutasi tanpa kunci,
// dan dibuat ulang sesudah teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/fitur-topup-verifikasi.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci: kalimat tentang kode (batas, status, tipe file) diperiksa terhadap kodenya.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantai from "../../data/diagram/t4-topup-verifikasi-inti.json";
import registry from "../../data/cerita.json";
import { KALIMAT_TERKUNCI, KUNCI_JSON } from "./fitur-topup-verifikasi.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const HALAMAN = "situs/src/content/docs/tahap-4/fitur-topup-verifikasi.mdx";
const SKENARIO_TOPUP = "situs/lama/widgets/data/skenario/t4-topup.json";
const SKENARIO_VERIF = "situs/lama/widgets/data/skenario/t4-verifikasi.json";
const halaman = baca(HALAMAN);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const topup = baca("labs/api-t4/output/topup.txt");
const verifikasi = baca("labs/api-t4/output/verifikasi.txt");
const batas = baca("labs/api-t4/output/batas.txt");
const skema = baca("labs/api-t4/output/skema.txt");
const kodePembayaran = baca("labs/api-t4/internal/service/pembayaran.go");
const kodeAturan = baca("labs/api-t4/internal/service/t4_aturan.go");
const kodeVerifikasi = baca("labs/api-t4/internal/service/verifikasi.go");
const kodeRepoVerifikasi = baca("labs/api-t4/internal/repo/verifikasi.go");
const kodeBatas = baca("labs/api-t4/internal/service/batas_endpoint.go");
const kodeHandler = baca("labs/api-t4/internal/handler/handler_pembayaran.go");
const skTopup = JSON.parse(baca(SKENARIO_TOPUP)) as Skenario;
const skVerif = JSON.parse(baca(SKENARIO_VERIF)) as Skenario;
const tanpaKunci = process.env.TANPA_KUNCI === "1";

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string; layar?: Record<string, { saldo?: number; saldoLabel?: string; isi: { jenis: string; teks?: string; kiri?: string; kanan?: string; nilai?: string; label?: string }[] }> }
interface Skenario {
  sumber: { jenis: string; file: string; fileVarian: string; catatan: string };
  judul: string;
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: { id: string; label: string }[];
  layarAwal: Record<string, unknown>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}

// ---- pembaca rekaman --------------------------------------------------------------------------
interface Bagian { awal: number; akhir: number; baris: string[] }
// Bagian rekaman diawali "# --- X. ..."; awal dan akhir adalah nomor baris (mulai 1) seperti rentang Snippet.
const pecah = (teks: string): Record<string, Bagian> => {
  const semua = teks.split("\n");
  const hasil: Record<string, Bagian> = {};
  let kini = "";
  semua.forEach((b, i) => {
    const m = b.match(/^# --- ([A-Z])\. /);
    if (m) {
      if (kini) hasil[kini]!.akhir = i;
      kini = m[1]!;
      hasil[kini] = { awal: i + 1, akhir: semua.length, baris: [] };
    } else if (kini) hasil[kini]!.baris.push(b);
  });
  return hasil;
};
const T = pecah(topup);
const V = pecah(verifikasi);
const B = pecah(batas);
const bagian = (semua: Record<string, Bagian>, huruf: string): Bagian => {
  const b = semua[huruf];
  if (!b) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  return b;
};
const cari = (pola: RegExp, baris: string[], nama: string): RegExpMatchArray => {
  const m = baris.map((x) => x.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};
const noBaris = (teks: string, awalan: string, dari = 1): number => {
  const i = teks.split("\n").findIndex((b, k) => k + 1 >= dari && b.startsWith(awalan));
  if (i < 0) throw new Error(`jangkar tidak ditemukan: ${awalan}`);
  return i + 1;
};
// Fungsi Go: dari baris yang diawali `awalan` sampai kurung kurawal penutup di kolom 0.
const rentangFungsi = (teks: string, awalan: string): string => {
  const awal = noBaris(teks, awalan);
  const semua = teks.split("\n");
  const akhir = semua.findIndex((b, k) => k + 1 > awal && b === "}") + 1;
  return `${awal}:${akhir}`;
};
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rp = (n: number): string => `Rp${titik(n)}`;
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const harus = (kalimat: string): void => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);

// ---- nilai turunan dari rekaman ----------------------------------------------------------------
// topup.txt A: Budi mengisi Rp200.000, saldo tetap, belum ada jurnal.
const TA = bagian(T, "A").baris;
const saldoAwal = Number(cari(/"nama":"Budi","saldo":(\d+)/, TA, "saldo Budi awal")[1]);
const jumlahTopup = Number(cari(/-d '\{"jumlah": (\d+)\}'/, TA, "jumlah top-up")[1]);
const akunBudi = Number(cari(/^ 1\s+\| (\d+)\s+\| (\d+)\s+\| menunggu\s+\| t\s+\|/, TA, "baris topup_bank")[1]);
const statusA = cari(/"status":"(\w+)","tujuan_bayar"/, TA, "status A")[1]!;
// topup.txt B: webhook diproses, saldo naik, jurnal dan outbox.
const TB = bagian(T, "B").baris;
const saldoAkhir = Number(cari(/"nama":"Budi","saldo":(\d+)/, TB, "saldo Budi akhir")[1]);
const jurnal = Number(cari(/"status":"dibayar".*"jurnal_id":(\d+)\}/, TB, "jurnal")[1]);
const postingBank = Number(cari(/^ \d+\s+\| topup_bank\s+\| bank\s+\| (-\d+)/, TB, "posting bank")[1]);
const postingBudi = Number(cari(/^ \d+\s+\| topup_bank\s+\| karyawan\s+\| (\d+)/, TB, "posting karyawan")[1]);
const barisOutbox = cari(/^ (\d+)\s+\| (\d+)\s+\| (\w+)\s+\| (\w+)\s+\| (\w+)\s+\| (.+?)\s*$/, TB.filter((b) => b.includes("| topup ")), "outbox");
const eventId = cari(/^ (evt-\d+)\s+\| settlement\s+\| diproses\s+\| (\d+)/, TB, "event")[1]!;
// topup.txt E, G, H, I, J.
const TE = bagian(T, "E").baris;
const toleransi = Number(cari(/toleransi (\d+) detik, Asumsi/, TE, "toleransi")[1]);
const geser = Number(cari(/^timestamp (\d+) detik lalu/, TE, "timestamp lalu")[1]);
const TG = bagian(T, "G").baris;
const idGagal = Number(cari(/^ (\d+)\s+\| gagal\s+\| t\s+\|/, TG, "gagal")[1]);
const jumlahTidakPasti = Number(cari(/-d '\{"jumlah": (70000)\}'/, TG, "jumlah tidak pasti")[1]);
const idTidakPasti = Number(cari(/^ (\d+)\s+\| tidak_pasti\s+\| t$/, TG, "tidak_pasti")[1]);
const timeoutPendek = Number(cari(/-gateway-timeout (\d+)ms \(bawaan 3 detik/, topup.split("\n"), "timeout lab")[1]);
const TH = bagian(T, "H").baris;
const cekBawaan = Number(cari(/bawaan -cek-umur (\d+)m \(Asumsi\)/, TH, "cek umur")[1]);
const TI = bagian(T, "I").baris;
const saldoDina = Number(cari(/"nama":"Dina","saldo":(\d+),"tingkat":"belum"/, TI, "saldo Dina")[1]);
const topupDina = Number(cari(/-d '\{"jumlah": (\d+)\}'/, TI, "top-up Dina")[1]);
const barisDina = TI.flatMap((b) => { const m = b.match(/^ (\d+)\s+\| (60000)\s+\| (dibayar|menunggu)\s*$/); return m ? [[Number(m[2]), m[3]!]] : []; });
const saldoDinaSesudah = Number(cari(/"nama":"Dina","saldo":(960000),"tingkat":"belum"/, TI.slice(TI.findIndex((b) => b.includes("FROM topup_bank"))), "saldo Dina sesudah")[1]);
const TJ = bagian(T, "J").baris;
const selisih60 = cari(/^ tidak_di_ledger\s+\| (60000)\s+\| terbuka/, TJ, "tidak_di_ledger 60000");
// verifikasi.txt.
const VA = bagian(V, "A").baris;
const nomorKaryawan = cari(/"ke_nomor_karyawan": "(K\d+)", "nominal": (\d+)/, VA, "kiriman")[1]!;
const nominalKiriman = Number(cari(/"ke_nomor_karyawan": "K\d+", "nominal": (\d+)/, VA, "nominal kiriman")[1]);
const VB = bagian(V, "B").baris;
const akunDina = Number(cari(/^ 1\s+\| (\d+)\s+\| pemakai\s+\| diajukan\s+\| (\d+)\s+\|/, VB, "baris verifikasi")[1]);
const VC = bagian(V, "C").baris;
const saldoDinaSesudahKiriman = Number(cari(/"saldo":(\d+),"sisa_batas_harian":(\d+)\}/, VC, "saldo sesudah kiriman")[1]);
const sisaBatas = Number(cari(/"saldo":\d+,"sisa_batas_harian":(\d+)\}/, VC, "sisa batas")[1]);
const jurnalKiriman = Number(cari(/^Location: \/transfers\/(\d+)$/, VC, "jurnal kiriman")[1]);
const permintaanVendor = cari(/^\{"objek":(\d+),"permintaan":(\d+)\}$/, VC, "vendor");
const VD = bagian(V, "D").baris;
const ulangVendor = cari(/^\{"objek":(\d+),"permintaan":(\d+)\}$/, VD, "vendor D");
// batas.txt.
const BA = bagian(B, "A").baris;
const retryDaftar = Number(cari(/^Retry-After: (\d+)$/, BA, "retry daftar")[1]);
const daftarPerJam = Number(cari(/POST \/daftar: (\d+) pendaftaran per alamat/, batas.split("\n"), "daftar per jam")[1]);
const BB = bagian(B, "B").baris;
const retryTopup = Number(cari(/^Retry-After: (\d+)$/, BB.slice(BB.findIndex((b) => b.startsWith("/topup-bank"))), "retry top-up")[1]);
const topupPerJam = Number(cari(/\/topup-bank (\d+) per jam/, batas.split("\n"), "top-up per jam")[1]);
const permintaanTopup = Number(cari(/^\/topup-bank, (\d+) permintaan pertama Eko: 201 x(\d+)$/, BB, "10 permintaan")[1]);
// kode lab.
const angkaKode = (teks: string, nama: string): number => Number(teks.match(new RegExp(`${nama}\\s+int64 = ([\\d_]+)`))![1]!.replace(/_/g, ""));
const batasBelum = angkaKode(kodeAturan, "BatasSaldoBelum");
const batasVerif = angkaKode(kodeAturan, "BatasSaldoTerverifikasi");
const umurTopupJam = Number(kodeAturan.match(/UmurTopupBank = (\d+) \* time\.Hour/)![1]);
const umurCekMenit = Number(kodeAturan.match(/UmurCekStatus = (\d+) \* time\.Minute/)![1]);
const maksFileMiB = (1 << Number(kodeVerifikasi.match(/MaksBerkasIdentitas = 1 << (\d+)/)![1])) / (1 << 20);
const maksBodyMiB = Number(kodeHandler.match(/MaksBodyVerifikasi = (\d+) << 20/)![1]);
const ambang = (teks: string, peta: string, kunci: string): [number, string] => {
  const blok = teks.slice(teks.indexOf(`var ${peta} = map`));
  const m = blok.match(new RegExp(`"${kunci}":\\s+\\{(\\d+), (\\d+)\\.0 / (\\d+)\\}`));
  if (!m) throw new Error(`batas ${peta}.${kunci} tidak ditemukan`);
  return [Number(m[1]), `${m[2]} per ${Number(m[3]) === 3600 ? "jam" : "?"}`];
};
const statusGateway = Object.fromEntries([...kodePembayaran.match(/var statusGateway = map\[string\]string\{([^}]+)\}/)![1]!.matchAll(/"(\w+)": "(\w+)"/g)].map((m) => [m[1]!, m[2]!]));
const statusTabel = [...skema.match(/topup_bank_status_check[^\n]*ARRAY\[([^\]]+)\]/)![1]!.matchAll(/'(\w+)'::text/g)].map((m) => m[1]!);

describe("rekaman dan kode: nilai turunan yang dipakai halaman", () => {
  test("topup.txt A dan B: Rp200.000, saldo tetap lalu naik, jurnal, event, outbox kelas 0", () => {
    expect(jumlahTopup).toBe(200000);
    expect(saldoAwal).toBe(250000);
    expect(saldoAkhir).toBe(saldoAwal + jumlahTopup);
    expect(akunBudi).toBe(419);
    expect(statusA).toBe("menunggu");
    expect(jurnal).toBe(10201);
    expect([postingBank, postingBudi]).toEqual([-jumlahTopup, jumlahTopup]);
    expect([Number(barisOutbox[1]), Number(barisOutbox[2]), barisOutbox[3], barisOutbox[4], barisOutbox[5]]).toEqual([akunBudi, 0, "topup", "push", "menunggu"]);
    expect(barisOutbox[6]).toBe(`${rp(jumlahTopup)} dari Bank`);
    expect(eventId).toBe("evt-100");
    expect(TA.some((b) => b === "HTTP/1.1 201 Created")).toBe(true);
    expect(TA.some((b) => b.startsWith("# Belum ada uang yang bergerak: tidak ada jurnal topup_bank, saldo Budi tetap."))).toBe(true);
    expect(TB.some((b) => b === "hasil kiriman: 200 diproses")).toBe(true);
    expect(TB.some((b) => b === "worker: diklaim 1, terkirim 1, dilewati 0, ditunda 0, mati 0")).toBe(true);
    expect(TB.some((b) => b === "push tiruan menerima: 1 pesan")).toBe(true);
  });
  test("topup.txt E sampai J: tanda tangan, gateway gagal, cek status, batas tingkat, rekonsiliasi", () => {
    expect([toleransi, geser]).toEqual([300, 400]);
    expect(TE.filter((b) => /: 401$/.test(b)).length).toBe(6);
    expect(TG.some((b) => b.startsWith("HTTP/1.1 502 Bad Gateway"))).toBe(true);
    expect(TG.some((b) => b.startsWith("HTTP/1.1 202 Accepted"))).toBe(true);
    expect(idGagal).toBe(5);
    expect(idTidakPasti).toBe(6);
    expect(jumlahTidakPasti).toBe(70000);
    expect(timeoutPendek).toBe(500);
    expect(TG.some((b) => b === "HTTP/1.1 201 Created")).toBe(true);
    expect(cekBawaan).toBe(30);
    expect(TH.some((b) => b === "cek top-up: diperiksa 1, dikredit 1, selesai tanpa kredit 0, masih menunggu 0, galat 0")).toBe(true);
    expect(TH.some((b) => b === "cek top-up: diperiksa 0, dikredit 0, selesai tanpa kredit 0, masih menunggu 0, galat 0")).toBe(true);
    expect([saldoDina, topupDina]).toEqual([900000, 200000]);
    expect(TI.some((b) => b.startsWith("HTTP/1.1 422 Unprocessable Entity"))).toBe(true);
    expect(TI.some((b) => b.includes("/problems/batas-saldo-tingkat"))).toBe(true);
    expect(barisDina).toEqual([[60000, "dibayar"], [60000, "menunggu"]]);
    expect(saldoDinaSesudah).toBe(saldoDina + 60000);
    expect(saldoDinaSesudah + 60000).toBeGreaterThan(batasBelum);
    expect(saldoDina + 60000).toBeLessThanOrEqual(batasBelum);
    expect(TI.some((b) => b.includes("webhook top-up pertama: 200 diproses; webhook top-up kedua: 200 diparkir"))).toBe(true);
    expect(Number(selisih60[1])).toBe(60000);
    expect(TI.join("\n")).toContain("PRD v4 belum menjawab pengembalian dana (Asumsi: tim risk memutuskan)");
  });
  test("verifikasi.txt: 403, 202, satu baris dan satu pekerjaan, lulus, kiriman 201, vendor 1 permintaan", () => {
    expect(nomorKaryawan).toBe("K00419");
    expect(nominalKiriman).toBe(10000);
    expect(VA.some((b) => b.startsWith("HTTP/1.1 403 Forbidden"))).toBe(true);
    expect(VA.some((b) => b.includes("/problems/butuh-verifikasi"))).toBe(true);
    expect(VB.some((b) => b === "HTTP 202")).toBe(true);
    expect(VB.some((b) => b.startsWith("HTTP/1.1 409 Conflict"))).toBe(true);
    expect(VB.some((b) => b.includes("/problems/verifikasi-berjalan"))).toBe(true);
    expect(akunDina).toBe(40001);
    expect(VB.some((b) => /^ 40001\s+\| 1\s+\| verifikasi\s+\| verifikasi\s+\| menunggu\s+\|/.test(b))).toBe(true);
    expect(VC.some((b) => b === "worker: diklaim 1, terkirim 1, dilewati 0, ditunda 0, mati 0")).toBe(true);
    expect(VC.some((b) => b.includes('"status":"lulus"'))).toBe(true);
    expect(VC.some((b) => b.includes('"tingkat":"terverifikasi"'))).toBe(true);
    expect(VC.some((b) => b.includes('"hapus_pada":"<waktu>"'))).toBe(true);
    expect([Number(permintaanVendor[1]), Number(permintaanVendor[2])]).toEqual([1, 1]);
    expect([Number(ulangVendor[1]), Number(ulangVendor[2])]).toEqual([1, 2]);
    expect(saldoDinaSesudahKiriman).toBe(900000 - nominalKiriman);
    expect(sisaBatas).toBe(500000 - nominalKiriman);
    expect(jurnalKiriman).toBe(10201);
    expect(VC.some((b) => b.startsWith(`# Sebelum verifikasi, top-up ${rp(topupDina)} untuk saldo ${rp(saldoDina)} ditolak 422 (topup.txt bagian I)`))).toBe(true);
  });
  test("batas.txt: 5 pendaftaran per jam lalu 429 dengan Retry-After 3.600 ÷ 5, top-up 10 per jam dan Retry-After 3.600 ÷ 10", () => {
    expect(daftarPerJam).toBe(5);
    expect(retryDaftar).toBe(3600 / daftarPerJam);
    expect(topupPerJam).toBe(10);
    expect(permintaanTopup).toBe(10);
    expect(retryTopup).toBe(3600 / permintaanTopup);
    expect(BA.some((b) => b.startsWith("HTTP/1.1 429 Too Many Requests"))).toBe(true);
    expect(BB.some((b) => b.startsWith("/pesanan, 20 permintaan pertama"))).toBe(true);
    expect(BB.join("\n")).toContain("# Bucket per akun: Budi yang habis di /pesanan tetap bisa bayar.");
    expect(batas).toContain("# Batas ini per alamat TCP. Di belakang proxy semua client berbagi satu alamat");
    expect(batas).toContain("Semua angka Asumsi lab.");
  });
  test("kode lab: batas saldo, umur order, umur job, status gateway, tipe file, batas ukuran, batas laju", () => {
    expect([batasBelum, batasVerif]).toEqual([1000000, 10000000]);
    expect(umurTopupJam).toBe(24);
    expect(umurCekMenit).toBe(cekBawaan);
    expect(statusGateway).toEqual({ settlement: "dibayar", pending: "menunggu", expire: "kedaluwarsa", failure: "gagal" });
    expect([...statusTabel].sort()).toEqual(["dibayar", "gagal", "kedaluwarsa", "menunggu", "tidak_pasti"]);
    expect(maksFileMiB).toBe(1);
    expect(maksBodyMiB).toBe(3);
    expect(kodeVerifikasi).toContain('http.DetectContentType(b); t != "image/jpeg" && t != "image/png"');
    expect(kodeVerifikasi).toContain('if subjek != "pemakai" {');
    expect(kodeRepoVerifikasi).toContain("UPDATE akun SET tingkat = 'terverifikasi' WHERE id = $1");
    expect(kodeRepoVerifikasi).toContain("interval '30 days'");
    expect(kodePembayaran).toContain("dengan timeout 3 detik (ADR 22)");
    expect(kodePembayaran).toContain("Pemeriksaan awal tanpa lock");
    expect(kodePembayaran).toContain("diparkir");
    expect(kodeHandler).toContain("dua file 1 MiB dalam base64 (4/3)");
    expect(ambang(kodeBatas, "AmbangEndpointIP", "daftar")).toEqual([5, "5 per jam"]);
    expect(ambang(kodeBatas, "AmbangEndpointIP", "topup-bank")).toEqual([30, "30 per jam"]);
    expect(ambang(kodeBatas, "AmbangEndpointIP", "verifikasi")).toEqual([10, "10 per jam"]);
    expect(ambang(kodeBatas, "AmbangEndpoint", "topup-bank")).toEqual([10, "10 per jam"]);
    expect(ambang(kodeBatas, "AmbangEndpoint", "verifikasi")).toEqual([3, "3 per jam"]);
    expect(2 * maksFileMiB * 4 / 3).toBeCloseTo(2.67, 2);
    expect(2 * maksFileMiB * 4 / 3).toBeLessThan(maksBodyMiB);
  });
});

describe("fitur-topup-verifikasi.mdx: tiap angka turunan dari rekaman, kode, dan naskah", () => {
  test("Inti dan Rantai", () => {
    harus(`Budi memilih top-up ${rp(jumlahTopup)}, dan server menjawab \`201\` dengan tujuan bayar (nomor untuk membayar di app bank). Statusnya \`${statusA}\`, saldonya masih ${rp(saldoAwal)}, dan belum ada jurnal (rekaman lab \`topup.txt\` bagian A).`);
    harus(`dan saldo Budi menjadi ${rp(saldoAkhir)} (bagian B).`);
    harus("jadi kiriman ke rekan dijawab `403`.");
    harus("server menjawab `202` tanpa menunggu siapa pun.");
    harus("(`verifikasi.txt` bagian A sampai C)");
    const simpul = rantai.baris.map((b) => [b.label, b.sub, b.simpul.map((s) => [s.teks, s.sub])]);
    expect(simpul).toEqual([
      ["Top-up Budi", rp(jumlahTopup).replace("Rp", "Rp"), [["201 menunggu", `saldo masih ${rp(saldoAwal)}`], ["webhook diproses", "satu transaction"], [`saldo ${rp(saldoAkhir)}`, `jurnal ${jurnal}`]]],
      ["Verifikasi Dina", `saldo ${rp(saldoDina)}`, [["kiriman 403", "butuh verifikasi"], ["202 diajukan", "worker memanggil vendor"], ["terverifikasi", "kiriman 201"]]],
    ]);
    expect(rantai.sumber.teks).toBe("Rekaman lab api-t4 · topup.txt A dan B, verifikasi.txt A sampai C");
    expect(rantai.baris.map((b) => b.simpul.map((s) => (s as { nada?: string }).nada ?? "biasa"))).toEqual([["biasa", "biasa", "good"], ["warn", "biasa", "good"]]);
  });

  test("tabel Baris PRD sama dengan naskah bagian 1, tujuan, syarat Pak Hadi, dan target PRD", () => {
    const barisNaskah = naskah.split("\n").filter((b) => /^\| P0 \| (Top-up dari rekening bank lewat gateway|Verifikasi identitas) \|/.test(b));
    expect(barisNaskah).toHaveLength(2);
    for (const b of barisNaskah) harus(b);
    const kutipan = "Setiap rupiah dari luar harus cocok dengan catatan pihak yang mengirimnya. Kalau tidak cocok, namanya insiden, bukan angka yang saya koreksi.";
    expect(naskah).toContain(`*"${kutipan}"*`);
    harus(`*"${kutipan}"*`);
    for (const t of ["99% top-up tercatat dalam kurang dari 5 menit sejak gateway mengirim kabar", "0 top-up tercatat dua kali", "90% verifikasi selesai dalam kurang dari 10 menit"]) {
      expect(naskah).toContain(t);
      harus(`- ${t}.`);
    }
    harus(`Top-up yang kabarnya tidak pernah datang baru ditanyakan ke gateway sesudah menunggu lebih dari ${cekBawaan} menit (Asumsi lab, \`topup.txt\` bagian H).`);
    expect(naskah).toContain("(2) Siapa pun dengan rekening bank mengisi saldo dan membayar di merchant luar");
    expect(naskah).toContain("(3) Identitas user terverifikasi sebelum batas besar.");
    expect(naskah).toContain("Kalau gateway mengirim kabar dua kali, terlambat, atau tidak mengirim sama sekali, siapa yang tahu?");
    harus("kalau gateway mengirim kabar dua kali, terlambat, atau tidak sama sekali, siapa yang tahu?");
    expect(naskah).toMatch(/\| 4\.3 \| 2 \| Fitur: top-up dari bank dan verifikasi identitas \| Fitur → teknis \| ★ \| api-t4 \| alur \|/);
  });

  test("Coba: dua alur dari bagian rekaman yang disebut, tebakan, dan varian", () => {
    harus("Widget ini mengikuti rekaman `topup.txt` dari HP Budi sampai saldonya naik.");
    harus("Statusnya `tidak_pasti`, bukan `gagal` (bagian G). Budi sudah membayar di app bank, tetapi webhook tidak datang, dan job cek status yang akhirnya mengkreditkannya (bagian H).");
    harus("Widget ini mengikuti rekaman `verifikasi.txt` dari HP Dina sampai kirimannya lolos.");
    harus("Server menjawab `409`, dan tabel tetap berisi satu baris verifikasi dan satu baris outbox (bagian B).");
    harus("File yang dikirim lab adalah PNG satu piksel, bukan foto kartu identitas, dan kamera tidak direkam.");
    expect(skTopup.sumber).toMatchObject({ jenis: "rekaman", file: "labs/api-t4/output/topup.txt", fileVarian: "labs/api-t4/output/topup.txt" });
    expect(skVerif.sumber).toMatchObject({ jenis: "rekaman", file: "labs/api-t4/output/verifikasi.txt", fileVarian: "labs/api-t4/output/verifikasi.txt" });
    expect(skTopup.langkah).toHaveLength(9);
    expect(skTopup.varian.mulai + skTopup.varian.langkah.length).toBeLessThanOrEqual(10);
    expect(skTopup.varian.mulai).toBe(4);
    expect(skVerif.langkah).toHaveLength(9);
    expect(skVerif.varian.mulai).toBe(5);
    // Posisi pilihan benar divariasikan: tebakan top-up di pilihan ketiga, verifikasi di pilihan keempat; keduanya tentang jalur utama.
    expect([skTopup.predict.answer, skVerif.predict.answer]).toEqual([2, 3]);
    expect([skTopup.predict.varian, skVerif.predict.varian]).toEqual([false, false]);
    expect(skTopup.predict.options[2]).toBe(`Nol jurnal, saldo tetap ${rp(saldoAwal)}: uang baru dicatat saat gateway memberi tahu`);
    for (const o of skTopup.predict.options.slice(0, 2).concat(skTopup.predict.options[3]!)) expect(o).not.toContain(`saldo tetap ${rp(saldoAwal)}`);
    expect(skTopup.predict.options.filter((o) => o.includes(rp(saldoAkhir)))).toHaveLength(3);
    expect(skVerif.predict.options[3]).toBe("Worker, sesudah 202: Dina lebih dulu melihat status diajukan");
    expect(skTopup.predict.explain).toContain(`saldo Budi tetap ${rp(saldoAwal)}`);
    expect(skTopup.predict.explain).toContain("langkah 7");
    expect(skTopup.langkah[6]!.kirim).toContain("jurnal 10201 topup_bank");
    expect(skVerif.predict.explain).toContain(`layanan verifikasi mencatat ${permintaanVendor[2]} permintaan`);
    expect(skTopup.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["app", ""], ["app", "api"], ["api", "db"], ["api", "gw"], ["api", "app"], ["gw", "api"], ["api", "db"], ["api", "gw"], ["worker", "app"]]);
    expect(skVerif.langkah.map((l) => [l.dari, l.ke ?? ""])).toEqual([["app", "api"], ["app", ""], ["app", "api"], ["api", "db"], ["api", "app"], ["worker", "vendor"], ["worker", "db"], ["app", "api"], ["app", "api"]]);
  });

  test("skenario: nilai di kirim dan jelas sama dengan rekaman", () => {
    const k = (s: Skenario, i: number): string => s.langkah[i]!.kirim;
    expect(k(skTopup, 0)).toContain(`nominal: ${rp(jumlahTopup)}`);
    expect(k(skTopup, 1)).toContain(`"jumlah": ${jumlahTopup}`);
    expect(k(skTopup, 2)).toContain(`akun ${akunBudi}, ${rp(jumlahTopup)}, menunggu`);
    expect(k(skTopup, 4)).toContain(`"jumlah":${jumlahTopup}`);
    expect(k(skTopup, 4)).toContain(`saldo Budi: ${rp(saldoAwal)}`);
    expect(k(skTopup, 5)).toContain(`event ${eventId}`);
    expect(k(skTopup, 6)).toContain(`${eventId}: settlement, diproses, jurnal ${jurnal}`);
    expect(k(skTopup, 6)).toContain(`topup_bank 1: dibayar, jurnal ${jurnal}`);
    expect(k(skTopup, 6)).toContain(`bank −${jumlahTopup}, karyawan +${jumlahTopup}`);
    expect(k(skTopup, 6)).toContain(`akun ${barisOutbox[1]}, kelas ${barisOutbox[2]}, topup, push, menunggu`);
    expect(k(skTopup, 7)).toBe("hasil kiriman: 200 diproses");
    expect(k(skTopup, 8)).toContain("worker: diklaim 1, terkirim 1, dilewati 0, ditunda 0, mati 0");
    expect(k(skTopup, 8)).toContain(`saldo ${saldoAkhir}`);
    const layarAkhir = skTopup.langkah[8]!.layar!.budi!;
    expect([layarAkhir.saldo, layarAkhir.isi[0]!.teks]).toEqual([saldoAkhir, `${rp(jumlahTopup)} dari Bank`]);
    const v = skTopup.varian.langkah;
    expect(v[0]!.kirim).toContain(`client server berhenti sesudah ${timeoutPendek} ms`);
    expect(v[1]!.kirim).toContain(`topup_bank ${idTidakPasti}: ${rp(jumlahTidakPasti)}, tidak_pasti`);
    expect(v[2]!.kirim).toContain(`"id":${idTidakPasti},"jumlah":${jumlahTidakPasti},"status":"tidak_pasti"`);
    expect(v[4]!.jelas).toContain(`lebih dari ${cekBawaan} menit`);
    expect(v[4]!.kirim).toContain("diperiksa 1, dikredit 1");
    expect(v[5]!.kirim).toContain("diperiksa 0, dikredit 0");
    expect(skTopup.sumber.catatan).toContain(`batas waktu client gateway ${timeoutPendek} ms`);
    expect(k(skVerif, 0)).toContain(`"ke_nomor_karyawan": "${nomorKaryawan}", "nominal": ${nominalKiriman}`);
    expect(k(skVerif, 3)).toContain(`akun ${akunDina}`);
    expect(k(skVerif, 3)).toContain("kelas 1, verifikasi, tujuan verifikasi, menunggu");
    expect(k(skVerif, 5)).toContain(`menerima: ${permintaanVendor[1]} objek, ${permintaanVendor[2]} permintaan`);
    expect(k(skVerif, 6)).toContain(`akun ${akunDina}: tingkat terverifikasi`);
    expect(k(skVerif, 7)).toContain(`"id":${jurnalKiriman},"saldo":${saldoDinaSesudahKiriman},"sisa_batas_harian":${sisaBatas}`);
    expect(k(skVerif, 8)).toContain(`"jumlah": ${topupDina}`);
    expect(skVerif.langkah[8]!.jelas).toContain(`untuk saldo ${rp(saldoDina)} ditolak 422`);
    expect(skVerif.langkah[7]!.jelas).toContain(`dari ${rp(batasBelum)} ke ${rp(batasVerif)} (Asumsi produk)`);
    expect(skVerif.langkah[0]!.layar!.dina!.saldo).toBe(saldoDina);
    expect(skVerif.langkah[7]!.layar!.dina!.saldo).toBe(saldoDinaSesudahKiriman);
    expect(skVerif.layarAwal).toMatchObject({ dina: { saldo: saldoDina } });
    expect(skVerif.varian.langkah[0]!.kirim).toContain("409 /problems/verifikasi-berjalan");
    expect(skVerif.varian.langkah[1]!.jelas).toContain("verifikasi_satu_berjalan");
    expect(skema).toContain("verifikasi_satu_berjalan");
    expect(skTopup.langkah[3]!.jelas).toContain("batas waktu 3 detik");
  });

  test("Backend: status, tingkat, batas saldo, verifikasi, batas laju", () => {
    harus(`Panggilan itu memakai \`order_id\` sebagai Idempotency-Key dan batas waktu 3 detik (bawaan server; rekaman memakai ${timeoutPendek} ms supaya cepat).`);
    harus(`Kode memetakan settlement ke \`${statusGateway.settlement}\`, pending ke \`${statusGateway.pending}\`, expire ke \`${statusGateway.expire}\`, dan failure ke \`${statusGateway.failure}\` (Tidak dijalankan: dibaca dari kode).`);
    harus(`Enam kiriman yang dimanipulasi di bagian E dijawab \`401\`. Keenamnya: tanpa tanda tangan, rahasia lain, isi diubah, JSON ditulis ulang, serta timestamp ${geser} detik lalu dan di depan (toleransi ${toleransi} detik, Asumsi).`);
    expect(TE.filter((b) => /^(tanpa tanda tangan|rahasia lain|isi diubah|JSON ditulis ulang|timestamp)/.test(b) && /: 401$/.test(b))).toHaveLength(6);
    expect(TE.some((b) => b.startsWith(`timestamp ${geser} detik di depan: 401`))).toBe(true);
    harus(`order berlaku ${umurTopupJam} jam sejak dibuat (Asumsi lab)`);
    harus(`| \`belum\` | ${rp(batasBelum)} | Top-up dan bayar QR | Top-up ${rp(topupDina)} untuk saldo ${rp(saldoDina)} ditolak \`422\` (\`topup.txt\` I); kiriman ke rekan ditolak \`403\` (\`verifikasi.txt\` A) |`);
    harus(`| \`terverifikasi\` | ${rp(batasVerif)} | Ditambah transfer dan kartu | Kiriman ke rekan lolos \`201\` (\`verifikasi.txt\` C) |`);
    harus(`Dina belum terverifikasi dan bersaldo ${rp(saldoDina)}. Ia membuat dua top-up ${rp(60000)}, dan keduanya lolos pemeriksaan awal:`);
    harus(`Saldo ${titik(saldoDina)} + ${titik(60000)} = ${titik(saldoDinaSesudah)} lolos, tetapi ${titik(saldoDinaSesudah)} + ${titik(60000)} = ${titik(saldoDinaSesudah + 60000)} melewati ${rp(batasBelum)}.`);
    harus(`Uang ${rp(60000)} yang kedua sudah ada di bank dan tidak dikreditkan. PRD v4 belum menjawab pengembalian dananya.`);
    harus("rekonsiliasi harian mencatatnya sebagai `tidak_di_ledger` (`topup.txt` J)");
    harus("Database hanya menyimpan kunci objek dan checksum SHA-256.");
    expect(kodeVerifikasi).toContain("sha256.Sum256");
    expect(VB.join("\n")).toMatch(/\| 497790947d4666760ce38f3c00e852c71fdb66cae849bae8e9ede352719e1581 \|/);
    expect(cari(/\| ([0-9a-f]{64}) \| ([0-9a-f]{64})$/, VB, "checksum")[1]!.length * 4).toBe(256);
    harus("`http.DetectContentType` membaca paling banyak 512 byte pertama");
    harus("pengajuan merchant tidak menulis baris outbox");
    harus("Hanya pengajuan dari akun berjenis `pemakai` yang masuk ke vendor.");
    harus("Id pengajuan dikirim sebagai Idempotency-Key.");
    harus(`Lima token per jam berarti satu token per ${retryDaftar} detik (${titik(3600)} ÷ ${daftarPerJam}, Hitungan), dan jawabannya memuat \`Retry-After: ${retryDaftar}\`:`);
    harus(`Permintaan ke-${permintaanTopup + 1} dijawab \`429\` dengan \`Retry-After: ${retryTopup}\` (${titik(3600)} ÷ ${permintaanTopup}, Hitungan).`);
    harus("Pendaftaran keenam dari satu alamat ditolak `429`.");
    for (const [peta, kunci, per, nilai, rekamanTabel] of [
      ["AmbangEndpointIP", "daftar", "alamat", "5 per jam", "`batas.txt` A dan C"],
      ["AmbangEndpoint", "topup-bank", "akun", "10 per jam", "`batas.txt` B"],
      ["AmbangEndpointIP", "topup-bank", "alamat", "30 per jam", "Tidak dijalankan: dibaca dari kode"],
      ["AmbangEndpoint", "verifikasi", "akun", "3 per jam", "Tidak dijalankan: dibaca dari kode"],
      ["AmbangEndpointIP", "verifikasi", "alamat", "10 per jam", "Tidak dijalankan: dibaca dari kode"],
    ] as const) {
      expect(ambang(kodeBatas, peta, kunci)[1]).toBe(nilai);
      harus(`| \`/${kunci}\` | ${nilai} | ${per} | ${rekamanTabel} |`);
    }
    harus("README lab `api-t3` menulis bahwa `/perangkat`, `/pesanan`, `/promo`, dan `/sinkron` belum punya rate limit sendiri.");
    expect(baca("labs/api-t3/README.md")).toContain("Endpoint `/perangkat`, `/pesanan`, `/promo`, dan `/sinkron` belum punya rate limit sendiri");
  });

  test("tabel status backend dan tabel status app memakai nilai yang diizinkan tabel database", () => {
    const urutan = ["menunggu", "dibayar", "tidak_pasti", "gagal", "kedaluwarsa"];
    expect([...urutan].sort()).toEqual([...statusTabel].sort());
    const baris = (judul: string): string[] => {
      const awal = halaman.indexOf(judul);
      const isi: string[] = [];
      for (const b of halaman.slice(awal).split("\n").slice(2)) {
        if (!b.startsWith("|")) break;
        isi.push(b.split("|")[1]!.trim());
      }
      return isi;
    };
    expect(baris("| Status | Kapan | Rekaman |")).toEqual(urutan.map((s) => `\`${s}\``));
    expect(baris("| Status dari server | Yang ditampilkan |")).toEqual(urutan.map((s) => `\`${s}\``));
  });

  test("Di app: dokumentasi image_picker 1.2.4, cross_file 0.4.0, dan batas ukuran dari kode", () => {
    harus("[image_picker 1.2.4](https://pub.dev/packages/image_picker)");
    harus("[XFile di cross_file 0.4.0](https://pub.dev/documentation/cross_file/latest/cross_file/XFile-class.html)");
    harus("`pickImage` memakai kamera belakang bawaan, dan `preferredCameraDevice` meminta kamera depan untuk swafoto. Di Android permintaan itu tidak dijamin berhasil: dokumentasinya menulis Android tidak punya parameter terdokumentasi untuk memilih kamera");
    harus("`Info.plist` harus memuat `NSCameraUsageDescription`");
    harus("JPEG, dan di Android juga PNG dan WebP");
    const dart = halaman.match(/<Snippet lang="dart" code=\{`([^`]+)`\} \/>/)![1]!;
    for (const [api, jejak] of [["pickImage(", "pickImage"], ["ImageSource.camera", "ImageSource.camera"], ["maxWidth:", "maxWidth"], ["imageQuality:", "imageQuality"], ["preferredCameraDevice: CameraDevice.front", "preferredCameraDevice"], ["readAsBytes()", "readAsBytes()"]] as const) {
      expect(dart, api).toContain(api);
      expect(riset, `RISET tidak menyebut ${jejak}`).toContain(jejak);
    }
    for (const api of ["ImagePicker()", "base64Encode("]) expect(dart, api).toContain(api);
    harus(`Server menolak file lebih dari ${maksFileMiB} MiB (Asumsi lab, dibaca dari kode)`);
    harus(`Dua file ${maksFileMiB} MiB menjadi 2 × 4 ÷ 3 = ${koma(2 * maksFileMiB * 4 / 3, 2)} MiB di satu JSON (Hitungan). Server menerima body paling besar ${maksBodyMiB} MiB (dibaca dari kode).`);
    harus("dengan jeda 30 hari menurut kode (Asumsi)");
    expect(kodeRepoVerifikasi).toContain("interval '30 days'");
    harus("Semua rujukan dokumentasi di blok ini berlabel Tidak dijalankan");
  });

  test("tanggal dibuka, tautan eksternal, dan baris RISET R4-120 sampai R4-122", () => {
    const tanggal = new Set([...halaman.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]));
    expect([...tanggal]).toEqual(["2026-10-29"]);
    harus("dicek ke dokumentasi pada 2026-10-29, tidak dijalankan");
    const baris = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
    for (const id of ["R4-120", "R4-121", "R4-122"]) {
      expect(baris(id), id).not.toBe("");
      expect(baris(id), id).toContain("dibuka 2026-10-29");
    }
    expect(baris("R4-120")).toContain("image_picker 1.2.4");
    expect(baris("R4-120")).toContain("cross_file 0.4.0");
    expect(baris("R4-120")).toContain("NSCameraUsageDescription");
    expect(baris("R4-121")).toContain("at most the first 512 bytes");
    expect(baris("R4-122")).toContain("docs.midtrans.com/docs/https-notification-webhooks");
    expect(baris("R4-122")).toContain("Pending");
    expect(baris("R4-122")).toContain("Settlement");
    const url = [...halaman.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((m) => m[1]!);
    expect(url.sort()).toEqual([
      "https://docs.midtrans.com/docs/https-notification-webhooks",
      "https://pkg.go.dev/net/http#DetectContentType",
      "https://pub.dev/documentation/cross_file/latest/cross_file/XFile-class.html",
      "https://pub.dev/documentation/image_picker/latest/image_picker/ImagePicker/pickImage.html",
      "https://pub.dev/packages/image_picker",
      "https://pub.dev/packages/image_picker",
    ].sort());
    const jejak: Record<string, string> = {
      "https://docs.midtrans.com/docs/https-notification-webhooks": "docs.midtrans.com/docs/https-notification-webhooks",
      "https://pkg.go.dev/net/http#DetectContentType": "DetectContentType",
      "https://pub.dev/documentation/cross_file/latest/cross_file/XFile-class.html": "cross_file 0.4.0",
      "https://pub.dev/documentation/image_picker/latest/image_picker/ImagePicker/pickImage.html": "`pickImage({required source",
      "https://pub.dev/packages/image_picker": "image_picker 1.2.4",
    };
    for (const u of new Set(url)) expect(riset, `RISET tidak menyebut ${u}`).toContain(jejak[u]!);
    expect(halaman).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(halaman).not.toMatch(/keputusan \d{3,4}/);
    for (const s of [skTopup, skVerif]) expect(JSON.stringify(s)).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}/);
    expect(JSON.stringify(rantai)).not.toMatch(/\bR\d-\d{2,3}\b|keputusan \d{3,4}/);
  });

  test("setiap angka besar, kode status, dan tautan Snippet di prosa berasal dari sumber", () => {
    const prosa = halaman
      .replace(/<Snippet lang="dart" code=\{`[^`]+`\} \/>/, "")
      .replace(/^---[\s\S]*?^---/m, "")
      .replace(/\d{4}-\d{2}-\d{2}/g, "")
      .replace(/\]\(https?:[^)]+\)/g, "]")
      .replace(/<Snippet [^>]+\/>/g, "")
      .replace(/<WidgetLama [^>]+\/>/g, "");
    const sah = new Set<string>([
      rp(jumlahTopup), rp(saldoAwal), rp(saldoAkhir), rp(batasBelum), rp(batasVerif), rp(saldoDina), rp(60000),
      titik(saldoDina), titik(60000), titik(saldoDinaSesudah), titik(saldoDinaSesudah + 60000), titik(3600), titik(10000),
      String(retryDaftar), String(retryTopup), String(geser), String(toleransi), koma(2 * maksFileMiB * 4 / 3, 2),
      "256", "512", "403", "201", "202", "422", "409", "401", "429", "200", String(timeoutPendek),
    ]);
    for (const m of prosa.matchAll(/Rp[\d.]+|\d{1,3}(?:\.\d{3})+|\d+,\d+|\b\d{3,}\b/g)) {
      const token = m[0].replace(/[.,]$/, "");
      expect(sah.has(token), `angka ${token} di halaman tidak diturunkan dari sumber (konteks: ${prosa.slice(Math.max(0, m.index! - 40), m.index! + 30).replace(/\n/g, " ")})`).toBe(true);
    }
  });
});

describe("fitur-topup-verifikasi.mdx: kode status, kelas, nama lab, dan kalimat berangka kecil", () => {
  const kodeG = TG.find((b) => b.startsWith("HTTP/1.1 201 Created"))!.match(/ (\d{3}) /)![1]!;
  const targetMenit = Number(naskah.match(/(\d+)% top-up tercatat dalam kurang dari (\d+) menit/)![2]);
  test("kode status di prosa sama dengan rekaman", () => {
    expect(kodeG).toBe("201");
    harus(`dan \`POST /transfers\` sesudahnya tetap dijawab \`${kodeG}\`:`);
    expect(TG.join("\n")).toMatch(/\$ curl -i -X POST '\/transfers'[^\n]*\nHTTP\/1\.1 201 Created/);
    harus("Jawaban `200` dikirim hanya sesudah COMMIT.");
    expect(TB.some((b) => b === "hasil kiriman: 200 diproses")).toBe(true);
    harus("Jawaban `201` berarti order sudah dibuat, bukan uang sudah masuk.");
    expect(TA.some((b) => b === "HTTP/1.1 201 Created")).toBe(true);
    harus("// POST /verifikasi. 202 berarti diajukan, bukan lulus.");
    expect(VB.some((b) => b === "HTTP 202")).toBe(true);
  });
  test("kelas outbox, tahap, dan target menit sama dengan sumber", () => {
    harus(`Baris outbox top-up bank berkelas ${barisOutbox[2]}, seperti bayar dan transfer di Tahap 3 (bagian B).`);
    expect(baca("labs/api-t3/internal/repo/outbox.go")).toMatch(/KelasUang\s+= 0/);
    harus(`Janji ${targetMenit} menit dihitung sejak kabar dikirim.`);
    harus(`terhadap batas ${maksFileMiB} MiB di bawah.`);
    harus("Naskah belum memberi nomor versi app Tahap 4, jadi halaman ini tidak menyebut nomornya.");
    harus("Tujuan PRD v4 untuk dua fitur ini:");
    harus("Lab hanya merekam urutan kejadian, jadi ketiga target itu belum diukur.");
    harus("Jadi webhook bukan satu-satunya jalan kabar.");
    harus("Pemeriksaan awal terjadi saat top-up dibuat, tanpa lock, supaya user tidak membayar ke bank untuk top-up yang pasti ditolak. Pemeriksaan yang menentukan terjadi saat kredit, sesudah buku akun dikunci.");
    expect(kodePembayaran).toContain("tanpa lock, supaya user tidak membayar ke bank untuk top-up yang pasti ditolak");
    expect(kodePembayaran).toContain("yang menentukan ada saat kredit, sesudah buku dikunci");
    harus("Tipe file dibaca dari byte pertama, bukan dari nama atau header yang dikirim user:");
    expect(kodeVerifikasi).toContain("Tipe isi dari byte pertama, bukan dari nama atau header yang dikirim user.");
    harus("Pemeriksaan ini mengenali awal file, bukan memastikan seluruh file adalah gambar utuh.");
    harus("`imageQuality` hanya memampatkan jenis gambar tertentu, misalnya JPEG, dan di Android juga PNG dan WebP. Untuk jenis lain pustaka mencatat peringatan.");
    harus("`maxWidth` dan `maxHeight` membatasi lebar dan tinggi gambar paling besar.");
    harus("Saldo baru naik sesudah gateway mengirim webhook bertanda tangan");
    harus("Dina belum terverifikasi, jadi kiriman ke rekan dijawab `403`.");
    harus("Fitur ini butuh app baru: app yang terpasang tidak punya layar top-up dari bank dan layar verifikasi.");
    harus("Dina adalah akun contoh di lab: user umum yang belum terverifikasi.");
    harus("Pertanyaan terbuka PRD v4 ada di fitur ini:");
    harus("tidak punya app Flutter, dan pembayaran di app bank diperankan perintah lab ke gateway tiruan.");
    harus("Lab `api-t4` memasang batas pada keempatnya dan pada tiga endpoint publik baru.");
    harus("Raka mengerjakan sisi app. Lab `api-t4` tidak punya app Flutter, jadi bagian ini tidak direkam.");
    const prosaSaja = halaman.replace(/<Snippet lang="dart" code=\{`[^`]+`\} \/>/, "").replace(/<Snippet [^>]*\/>/g, "");
    expect((prosaSaja.match(/api-t4/g) ?? []).length).toBe(3);
    expect((prosaSaja.match(/api-t3/g) ?? []).length).toBe(1);
    expect((prosaSaja.match(/PRD v4/g) ?? []).length).toBe(4);
    expect((prosaSaja.match(/Tahap 4/g) ?? []).length).toBe(1);
    expect((prosaSaja.match(/[Bb]ase64/g) ?? []).length).toBe(2);
    expect(halaman).toContain("10.000 akun Lestari ditandai terverifikasi lewat HR");
    expect(Number(cari(/^ karyawan\s+\| terverifikasi\s+\| (\d+)$/, skema.split("\n"), "akun Lestari")[1])).toBe(10000);
  });
  test("tabel status dan tabel pertanyaan dikunci per baris dan kolom", () => {
    const urutan = ["menunggu", "dibayar", "tidak_pasti", "gagal", "kedaluwarsa"];
    const sel = (awalan: string, n: number): string[][] => {
      const semua = halaman.slice(halaman.indexOf(awalan)).split("\n").slice(2);
      const out: string[][] = [];
      for (const b of semua) { if (!b.startsWith("|")) break; out.push(b.split("|").slice(1, -1).map((x) => x.trim())); }
      expect(out.every((x) => x.length === n)).toBe(true);
      return out;
    };
    const t1 = sel("| Status | Kapan | Rekaman |", 3);
    expect(t1.map((x) => x[0])).toEqual(urutan.map((x) => `\`${x}\``));
    expect(t1.map((x) => x[2])).toEqual(["`topup.txt` A", "`topup.txt` B", "`topup.txt` G", "`topup.txt` G (penolakan); kabar failure tidak direkam", "Tidak direkam: hanya nilai yang diizinkan tabel (`skema.txt`)"]);
    expect(t1.map((x) => x[1])).toEqual([
      "Order dibuat dan tujuan bayar ada",
      `Kabar ${Object.keys(statusGateway).find((k) => statusGateway[k] === "dibayar")} diterima dan jurnal ditulis`,
      "Gateway tidak menjawab dalam batas waktu, order mungkin sudah ada",
      "Gateway menolak atau tidak terjangkau, order belum dibuat; kabar failure memetakan ke status ini juga",
      `Kabar ${Object.keys(statusGateway).find((k) => statusGateway[k] === "kedaluwarsa")} dari gateway; order berlaku ${umurTopupJam} jam sejak dibuat (Asumsi lab)`,
    ]);
    const t2 = sel("| Status dari server | Yang ditampilkan |", 2);
    expect(t2.map((x) => x[0])).toEqual(urutan.map((x) => `\`${x}\``));
    expect(t2.map((x) => x[1])).toEqual([
      'Tujuan bayar dan "Menunggu pembayaran"',
      "Saldo baru, dibaca dari `GET /akun/{id}`",
      '"Sedang dicek", tanpa tujuan bayar dan tanpa tombol top-up kedua',
      '"Top-up tidak dibuat". Detail dari server: pembayaran dan transfer tidak terpengaruh (`topup.txt` G)',
      '"Waktu bayar habis"',
    ]);
    expect(t2[1]![1]).toBe("Saldo baru, dibaca dari `GET /akun/{id}`");
    expect(t2[3]![1]).toContain("pembayaran dan transfer tidak terpengaruh (`topup.txt` G)");
    expect(TG.join("\n")).toContain("pembayaran dan transfer tidak terpengaruh");
    harus("| Bagaimana nasib uang yang sudah di bank tetapi melewati batas saldo? | PRD v4 belum menjawab | Pertanyaan terbuka: tim risk memutuskan (Asumsi) |");
    harus("| Siapa yang tahu email mana yang sudah terdaftar? | `POST /daftar` menjawab `409` untuk email yang sudah ada dan hanya dibatasi laju per alamat (README lab) | Pertanyaan terbuka |");
    expect(baca("labs/api-t4/README.md")).toContain("Enumerasi email lewat `POST /daftar` (409) hanya ditahan batas laju per alamat; verifikasi email tidak ada.");
    expect(batas).toContain("email yang sudah terdaftar 409");
  });
  test("skenario: versi, sinyal, saldo layar, dan nada dikunci", () => {
    for (const sk of [skTopup, skVerif]) {
      expect((sk as unknown as { versi: number }).versi).toBe(2);
      const layar = [sk.layarAwal as Record<string, { sinyal: number }>, ...sk.langkah.concat(sk.varian.langkah).map((l) => l.layar ?? {})].flatMap((x) => Object.values(x)) as { sinyal: number; saldo?: number }[];
      expect(layar.length).toBeGreaterThan(5);
      for (const l of layar) expect(l.sinyal).toBe(3);
    }
    const saldoTopup = [skTopup.layarAwal, ...skTopup.langkah.map((l) => l.layar ?? {})].flatMap((x) => Object.values(x as Record<string, { saldo?: number }>)).map((l) => l.saldo);
    expect(saldoTopup).toEqual([saldoAwal, saldoAwal, saldoAwal, saldoAkhir]);
    expect(skTopup.varian.langkah.flatMap((l) => Object.values(l.layar ?? {})).map((l) => l.saldo)).toEqual([undefined, undefined]);
    const saldoVerif = [skVerif.layarAwal, ...skVerif.langkah.map((l) => l.layar ?? {})].flatMap((x) => Object.values(x as Record<string, { saldo?: number }>)).map((l) => l.saldo);
    expect(saldoVerif).toEqual([saldoDina, saldoDina, undefined, undefined, undefined, saldoDinaSesudahKiriman]);
    expect([...skTopup.langkah, ...skTopup.varian.langkah].map((l) => l.nada ?? "-")).toEqual(["-", "-", "good", "-", "-", "-", "good", "-", "good", "warn", "warn", "warn", "warn", "-", "good"]);
    expect([...skVerif.langkah, ...skVerif.varian.langkah].map((l) => l.nada ?? "-")).toEqual(["warn", "-", "-", "good", "-", "-", "good", "good", "good", "warn", "good"]);
  });
});

describe("rentang Snippet diturunkan dari rekaman dan kode, bukan angka tangan", () => {
  const props = [...halaman.matchAll(/<Snippet ([^>]*?)\/>/g)].map((m) => m[1]!.trim()).filter((p) => !p.startsWith('lang="dart"'));
  test("daftar Snippet dan rentangnya", () => {
    const tuple = (nama: string, teks: string): string => `${nama}:${teks}`;
    const rekaman = (f: string): string => baca(`labs/api-t4/output/${f}`);
    const t = rekaman("topup.txt");
    const v = rekaman("verifikasi.txt");
    const b = rekaman("batas.txt");
    const akhirSebelum = (teks: string, awalan: string, kurang: number, dari = 1): number => noBaris(teks, awalan, dari) - kurang;
    const diharapkan = [
      `file="labs/api-t4/internal/service/pembayaran.go" lines="${noBaris(kodePembayaran, "\t// Pemeriksaan awal tanpa lock")}:${noBaris(kodePembayaran, "\t}", noBaris(kodePembayaran, "\tswitch {", noBaris(kodePembayaran, "\t// Pemeriksaan awal tanpa lock")))}" lang="go" title="labs/api-t4/internal/service/pembayaran.go"`,
      `file="labs/api-t4/output/topup.txt" lines="${noBaris(t, "# gateway tiruan mode mati")}:${akhirSebelum(t, "# gateway tiruan mode setelah-buat-menggantung", 1)}" title="Rekaman lab: labs/api-t4/output/topup.txt (bagian G)"`,
      `file="labs/api-t4/output/topup.txt" lines="${bagian(T, "B").awal + 1}:${akhirSebelum(t, "=> SELECT akun_id, kelas, jenis, tujuan, status", 1)}" title="Rekaman lab: labs/api-t4/output/topup.txt (bagian B)"`,
      `files={["labs/api-t4/internal/service/t4_aturan.go:${noBaris(kodeAturan, "\t// Batas saldo menurut tingkat")}:${noBaris(kodeAturan, "\tBatasSaldoTerverifikasi")}", "labs/api-t4/internal/service/t4_aturan.go:${rentangFungsi(kodeAturan, "func BatasSaldoTingkat")}"]} lang="go" title="labs/api-t4/internal/service/t4_aturan.go"`,
      `file="labs/api-t4/output/topup.txt" lines="${noBaris(t, "$ curl -i -X POST '/topup-bank' -H 'Authorization: Bearer <token sesi Dina>'", bagian(T, "I").awal)}:${bagian(T, "J").awal - 2}" title="Rekaman lab: labs/api-t4/output/topup.txt (bagian I)"`,
      `file="labs/api-t4/output/verifikasi.txt" lines="${noBaris(v, "=> SELECT id, akun_id, subjek")}:${bagian(V, "C").awal - 2}" title="Rekaman lab: labs/api-t4/output/verifikasi.txt (bagian B)"`,
      `file="labs/api-t4/internal/service/verifikasi.go" lines="${rentangFungsi(kodeVerifikasi, "func periksaGambar")}" lang="go" title="labs/api-t4/internal/service/verifikasi.go"`,
      `file="labs/api-t4/output/verifikasi.txt" lines="${noBaris(v, "$ ./api-t4 -peran worker -sekali")}:${noBaris(v, '{"objek":1,"permintaan":1}')}" title="Rekaman lab: labs/api-t4/output/verifikasi.txt (bagian C)"`,
      `file="labs/api-t4/internal/repo/verifikasi.go" lines="${rentangFungsi(kodeRepoVerifikasi, "func (r Repo) SelesaikanVerifikasi")}" lang="go" title="labs/api-t4/internal/repo/verifikasi.go"`,
      `file="labs/api-t4/output/batas.txt" lines="${bagian(B, "A").awal + 1}:${noBaris(b, '{"type":"/problems/rate-limit-ip"')}" title="Rekaman lab: labs/api-t4/output/batas.txt (bagian A)"`,
      `files={["labs/api-t4/output/batas.txt:${noBaris(b, "/topup-bank, 10 permintaan pertama")}:${noBaris(b, '{"type":"/problems/rate-limit-akun"', noBaris(b, "/topup-bank, 10 permintaan pertama"))}", "labs/api-t4/output/batas.txt:${noBaris(b, "# Bucket per akun")}:${noBaris(b, '{"id":10201,"saldo":240000}')}"]} title="Rekaman lab: labs/api-t4/output/batas.txt (bagian B)"`,
    ];
    void tuple;
    expect(props).toEqual(diharapkan);
    for (const p of props) {
      for (const m of p.matchAll(/(labs\/[\w./-]+?)(?::(\d+):(\d+))?["\s]/g)) expect(fs.existsSync(path.join(akar, m[1]!)), m[1]).toBe(true);
    }
  });
});

describe("rujukan [[ID]] dan registry", () => {
  const entri = (id: string) => (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; path?: string }[]).find((h) => h.id === id);
  test("halaman 4.3 terdaftar sebagai Fitur bagian 2 ★ dengan lab api-t4 dan prasyarat 4.2", () => {
    const h = entri("t4-topup-verifikasi")!;
    expect(h.ada).toBe(true);
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.lab, h.prasyarat]).toEqual(["4.3", "fitur", 2, true, ["api-t4"], ["t4-fitur-teknis"]]);
    expect(h.judul).toBe("Fitur: top-up dari bank dan verifikasi identitas");
    expect(h.path).toBe("tahap-4/fitur-topup-verifikasi.md");
    expect(halaman).toContain(`title: "4.3 ${h.judul}"`);
    expect(halaman).toContain('<p class="meta">Baca 12 menit · coba 4 menit · Prasyarat: [[t4-fitur-teknis]] · Jalur inti</p>');
  });
  test("setiap [[ID]] ada di registry, bernama sesuai halamannya, dan menempel pada kalimat yang menjelaskannya, berurutan", () => {
    const semua = [...halaman.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!);
    for (const id of new Set(semua)) expect(entri(id), `[[${id}]] tidak ada di registry`).toBeDefined();
    const peran: [string, string][] = [
      ["t4-fitur-teknis", "pekerjaan teknis"], ["t4-m29", "m29"], ["t4-m30", "m30"], ["t4-webhook", "webhook"], ["t4-m31", "m31"], ["t4-storage", "file identitas"],
      ["t3-rate-limit-redis", "rate limit"], ["t3-notifikasi", "notifikasi"], ["t4-dua-arah", "dua arah"], ["t4-skema", "skema data"], ["t4-rekonsiliasi", "rekonsiliasi"],
      ["t4-breaker", "circuit breaker"], ["t4-m33", "m33"],
    ];
    for (const [id, kata] of peran) expect(entri(id)!.judul.toLowerCase(), id).toContain(kata);
    expect(entri("A0")!.judul).toBe("Cara pakai panduan ini");
    expect([...new Set(semua)].sort()).toEqual([...peran.map((p) => p[0]), "A0"].sort());
    for (const kalimat of [
      "Kabar yang datang dua kali dibahas di [[t4-m29]], kabar yang terlambat atau tidak berurutan di [[t4-webhook]], dan kabar yang tidak datang di [[t4-m30]].",
      "Kiriman yang sama bisa datang dua kali, dan itu dibahas di [[t4-m29]] dan [[t4-webhook]].",
      "dikirim worker sesudah COMMIT, seperti di [[t3-notifikasi]].",
      "Apa yang terjadi pada file di penyimpanan dibahas di [[t4-storage]].",
      "Layanan verifikasi yang mati beberapa jam dibahas di [[t4-m31]].",
      "Penghitung bersama dibahas di [[t3-rate-limit-redis]] dan belum dipasang pada endpoint baru ini.",
      "tetapi tidak dijamin sampai ([[t3-notifikasi]]).",
      "lamanya foto disimpan dibahas di [[t4-storage]].",
      "Arti label Asumsi, Rekaman lab, dan Tidak dijalankan ada di [[A0]].",
      "- [[t4-dua-arah]]: kabar dari gateway adalah klaim, bukan fakta.",
      "- [[t4-skema]]: tabel baru `topup_bank` dan `verifikasi`, serta kolom `tingkat` di `akun`.",
      "- [[t4-m29]] dan [[t4-webhook]]: kiriman yang datang dua kali, tanda tangan, dan urutan.",
      "- [[t4-m30]] dan [[t4-rekonsiliasi]]: kabar yang tidak pernah datang, job cek status, dan rekonsiliasi harian.",
      "- [[t4-m31]] dan [[t4-breaker]]: layanan verifikasi yang mati, retry berkunci, dan circuit breaker.",
      "- [[t4-m33]] dan [[t4-storage]]: file identitas di penyimpanan objek.",
      "- [[t3-rate-limit-redis]]: penghitung batas laju yang dipakai bersama oleh dua instance.",
      "| Kiriman webhook yang sama datang dua kali? | Widget memakai satu kiriman | [[t4-m29]] |",
      "| Kabar hilang, dan job cek status juga belum jalan? | Widget memakai umur job 0 detik | [[t4-m30]] |",
      "| Layanan verifikasi mati beberapa jam? | Widget memakai vendor yang menjawab | [[t4-m31]] |",
      "| Di mana file identitas disimpan, dan siapa boleh membacanya? | Halaman ini hanya menyebut kunci objek dan checksum | [[t4-m33]] |",
    ]) harus(kalimat);
    expect(semua).toHaveLength(28);
    expect(semua[0]).toBe("t4-fitur-teknis");
    expect(semua.filter((id) => id === "t3-notifikasi")).toHaveLength(2);
    const hitung = Object.fromEntries([...new Set(semua)].map((id) => [id, semua.filter((x) => x === id).length]));
    expect(hitung).toEqual({ "t4-fitur-teknis": 1, "t4-m29": 4, "t4-webhook": 3, "t4-m30": 3, "t4-storage": 3, "t4-m31": 3, "t3-notifikasi": 2, "t3-rate-limit-redis": 2, "t4-m33": 2, A0: 1, "t4-dua-arah": 1, "t4-skema": 1, "t4-rekonsiliasi": 1, "t4-breaker": 1 });
    expect(semua.filter((id) => id === "t3-rate-limit-redis")).toHaveLength(2);
  });
  test("tiap janji 'dibahas di' menunjuk halaman yang judulnya memuat topiknya", () => {
    expect(entri("t4-m29")!.judul).toBe("M29: Top-up Budi masuk dua kali");
    expect(entri("t4-m30")!.judul).toBe("M30: Saldo Citra tidak naik, padahal bank sudah memotong");
    expect(entri("t4-m31")!.judul).toContain("Sedang diverifikasi");
    expect(entri("t4-storage")!.judul).toContain("File identitas");
    expect(entri("t4-webhook")!.judul).toContain("urutan");
    expect(entri("t3-rate-limit-redis")!.judul).toContain("Rate limit lintas instance");
  });
});

describe("struktur: blok, heading, dan template", () => {
  test("enam blok berurutan dengan nama, bagian terbuka, dan teks aman", () => {
    const blok = [...halaman.matchAll(/<Blok ([^>]*)>/g)].map((m) => m[1]!);
    expect(blok).toEqual([
      'nama="Yang diminta PRD" buka',
      'nama="Coba: top-up dari bank" buka aman="Kalau berhenti di sini, kamu sudah tahu: top-up Budi baru menjadi uang saat gateway memberi tahu, dan kabar yang hilang ditemukan job cek status."',
      'nama="Coba: verifikasi identitas" aman="Kalau berhenti di sini, kamu sudah tahu: server menjawab 202 tanpa menunggu layanan verifikasi, dan tingkat akun naik di worker."',
      'nama="Di backend: top-up, tingkat, verifikasi, dan batas laju"',
      'nama="Di app: dua layar yang harus jujur"',
      'nama="Konsep yang akan dibutuhkan"',
    ]);
    expect((halaman.match(/<\/Blok>/g) ?? []).length).toBe(6);
  });
  test("heading dan urutan komponen", () => {
    const heading = [...halaman.matchAll(/^(#{2,4}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(heading).toEqual([
      "## Inti",
      "### Baris PRD",
      "### Top-up: baris dulu, gateway kemudian",
      "### Kabar masuk: satu transaction",
      "### Dua tingkat dan batas saldo",
      "### Verifikasi: dua file, satu baris, satu pekerjaan",
      "### Pendaftaran terbuka: batas laju",
      "### Layar top-up: status dari server",
      "### Layar verifikasi: dua foto",
    ]);
    const komponen = [...halaman.matchAll(/<(WidgetLama|Rantai|SkripLama)\b([^>]*)\/>/g)].map((m) => `${m[1]}${m[2]}`.trim());
    expect(komponen).toEqual([
      "Rantai data={intiDiagram} ringkas",
      'WidgetLama nama="alur" src="data/skenario/t4-topup.json"',
      'WidgetLama nama="alur" src="data/skenario/t4-verifikasi.json"',
      'SkripLama daftar={["hp","alur-core","alur"]}',
    ]);
    expect(halaman).not.toMatch(/<details|<summary|<noscript/);
  });
  test("kata yang dilarang skill gaya-bahasa tidak muncul, dan label turunan didefinisikan di pemakaian pertama", () => {
    expect(halaman).not.toMatch(/\b(mudah|cukup|tinggal)\b/i);
    expect(halaman).not.toMatch(/Anda|!/);
    const pertama = halaman.indexOf("Hitungan");
    const arti = halaman.indexOf("Hitungan di sini berarti angka yang dihitung dari angka rekaman yang tertulis di atas");
    expect(pertama).toBeGreaterThan(0);
    expect(halaman.indexOf("(3.600 ÷ 5, Hitungan)")).toBeGreaterThan(arti);
    expect(halaman.indexOf("(Hitungan)")).toBeGreaterThan(arti);
    expect(halaman.slice(0, arti)).not.toContain("Hitungan");
    expect(halaman).not.toContain("Simulasi");
    expect(halaman).not.toContain("Ilustrasi");
  });
});

describe("kunci kalimat: teks halaman, diagram, dan skenario terkunci per baris (lapis 2)", () => {
  const tekstual = (x: unknown, keluar: string[] = []): string[] => {
    if (typeof x === "string") keluar.push(x);
    else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
    else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
    return keluar;
  };
  const sekarang = {
    halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
    json: { rantai: tekstual(rantai), topup: tekstual(skTopup), verifikasi: tekstual(skVerif) },
  };
  if (process.env.PERBARUI_KUNCI === "1") {
    const isi = `// Dihasilkan dari berkas saat ini oleh PERBARUI_KUNCI=1 (lihat fitur-topup-verifikasi.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\nexport const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\nexport const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
    fs.writeFileSync(path.join(__dirname, "fitur-topup-verifikasi.halaman.nilai.ts"), isi);
  }
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string diagram dan skenario sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

// Penutup celah seri mutasi peninjau (keputusan 1277). Seri 228 mutan tanpa kunci baris meloloskan 53; yang membawa klaim ditutup di sini
// dengan nilai yang diturunkan dari kode, rekaman, dan RISET. "Sidik kata penentu" bukan turunan melainkan kunci agregat: ia menangkap
// sisipan atau pembalikan kata penentu di mana pun, termasuk di kalimat naratif yang tidak punya sumber angka.
describe("penutup celah mutasi tanpa kunci: klaim mekanisme, label, sumber, dan sidik kata penentu", () => {
  const fungsi = (teks: string, kepala: string): string => {
    const awal = teks.indexOf(kepala);
    if (awal < 0) throw new Error(`fungsi tidak ditemukan: ${kepala}`);
    return teks.slice(awal, teks.indexOf("\n}\n", awal) + 3);
  };
  const nilaiString = (x: unknown, keluar: string[] = []): string[] => {
    if (typeof x === "string") keluar.push(x);
    else if (Array.isArray(x)) for (const y of x) nilaiString(y, keluar);
    else if (x && typeof x === "object") for (const y of Object.values(x)) nilaiString(y, keluar);
    return keluar;
  };
  const sidik = (teks: string, kata: string[]): Record<string, number> =>
    Object.fromEntries(kata.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
  const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak"];
  const tanpaSelalu = (o: Record<string, number>): Record<string, number> => o;

  test("klaim mekanisme diturunkan dari kode: panggilan gateway di luar transaction, tanda tangan sebelum JSON, satu transaction untuk kabar masuk", () => {
    const buat = fungsi(kodePembayaran, "func (s Service) BuatTopupBank(");
    expect(buat).toContain("s.t4.Gateway.BuatOrder(");
    expect(buat).not.toContain("DalamTx(");
    expect(buat.indexOf("s.repo.BuatTopupBank(")).toBeLessThan(buat.indexOf("s.t4.Gateway.BuatOrder("));
    harus("lalu memanggil gateway di luar transaction.");
    const terima = fungsi(kodePembayaran, "func (s Service) TerimaWebhook(");
    expect(terima.indexOf("s.PeriksaTandaTangan(timestamp, tanda, body)")).toBeGreaterThan(0);
    expect(terima.indexOf("s.PeriksaTandaTangan(timestamp, tanda, body)")).toBeLessThan(terima.indexOf("json.Unmarshal(body"));
    harus("Server memeriksa tanda tangan atas byte mentah sebelum JSON diurai, lalu satu transaction menulis event, status top-up, jurnal, dan baris outbox:");
    const aman = fungsi(kodePembayaran, "func (s Service) webhookAman(");
    expect((aman.match(/DalamTx\(/g) ?? []).length).toBe(1);
    for (const f of ["tx.CatatEvent(", "s.terapkanStatus(ctx, tx,", "tx.SelesaiEvent("]) expect(aman, f).toContain(f);
    const kredit = fungsi(kodePembayaran, "func (s Service) kreditTopup(");
    for (const f of ["tx.CatatJurnal(", "tx.UbahTopupDibayar(", 's.beritahu(ctx, tx, id, tp.AkunID, "topup"']) expect(kredit, f).toContain(f);
    expect(kredit).not.toContain("DalamTx(");
    const catat = fungsi(kodeVerifikasi, "func (s Service) catatPengajuan(");
    expect((catat.match(/DalamTx\(/g) ?? []).length).toBe(1);
    for (const f of ["tx.BuatVerifikasi(", "tx.TulisOutboxVerifikasi("]) expect(catat, f).toContain(f);
    harus("lalu menulis satu baris `verifikasi` dan satu baris outbox bertujuan `verifikasi` di satu transaction.");
    expect(kodeRepoVerifikasi).toContain("hapus_pada = $4::timestamptz + interval '30 days'");
  });

  test("klaim batas laju: per akun, alamat TCP, bucket di memori satu proses, dan nomor tujuan bayar dari kode tiruan", () => {
    harus("Top-up memakai batas per akun.");
    harus("Batas per alamat memakai alamat TCP peminta (`batas.txt` C).");
    harus("Semua batas adalah token bucket di memori satu proses, dan semua angkanya Asumsi lab:");
    expect(batas).toContain("token bucket di memori satu proses");
    expect(batas).toContain("Batas ini per alamat TCP.");
    expect(kodeBatas).toContain("Token bucket di memori satu proses");
    expect(baca("labs/api-t4/cmd/tiruan/main.go")).toContain('fmt.Sprintf("88%014d"');
    harus("dengan tujuan bayar (nomor untuk membayar di app bank).");
    expect(baca("labs/api-t4/internal/service/bayar.go")).not.toMatch(/gateway/i);
    expect(baca("labs/api-t4/internal/service/kirim.go")).not.toMatch(/gateway/i);
  });

  test("label sumber yang menempel pada kalimat: Asumsi tidak naik menjadi Rekaman lab", () => {
    harus("Kedua batas di tabel ini Asumsi produk, dan nilainya ada di kode:");
    harus("Tabel ini Asumsi penulis tentang tampilannya.");
    harus("Semua rujukan dokumentasi di blok ini berlabel Tidak dijalankan: dicek ke dokumentasi pada 2026-10-29, tidak dijalankan.");
    harus("(Asumsi lab, `topup.txt` bagian H)");
    expect((halaman.match(/Rekaman lab/g) ?? []).length).toBe(8);
    expect((halaman.match(/rekaman lab/g) ?? []).length).toBe(1);
    expect((halaman.match(/Asumsi/g) ?? []).length).toBe(12);
    expect((halaman.match(/Tidak dijalankan/g) ?? []).length).toBe(10);
    expect((halaman.match(/\(Hitungan\)|, Hitungan\)/g) ?? []).length).toBe(3);
  });

  test("kerangka Dart: kamera, jumlah pemanggilan, pembatalan, dan base64 dua file", () => {
    const dart = halaman.match(/<Snippet lang="dart" code=\{`([^`]+)`\} \/>/)![1]!;
    expect((dart.match(/source: ImageSource\.camera,/g) ?? []).length).toBe(2);
    expect((dart.match(/ImageSource\.gallery/g) ?? []).length).toBe(0);
    expect((dart.match(/preferredCameraDevice: CameraDevice\.front,/g) ?? []).length).toBe(1);
    expect((dart.match(/pickImage\(/g) ?? []).length).toBe(2);
    expect((dart.match(/base64Encode\(await (kartu|swafoto)\.readAsBytes\(\)\)/g) ?? []).length).toBe(2);
    expect(dart).toContain("if (kartu == null || swafoto == null) return; // user membatalkan");
    expect(dart).toContain("Swafoto: minta kamera depan.");
  });

  test("frontmatter, import diagram, dan Rantai: jenis dan catatan sumber, id, dan judul", () => {
    expect(halaman).toContain('description: Budi mengisi saldo dari rekening bank, dan saldonya naik sesudah gateway memberi tahu. Dina mengirim foto kartu identitas dan swafoto, dan batas saldonya naik sesudah layanan verifikasi meluluskan pengajuan.');
    expect(halaman).toContain('import intiDiagram from "../../../../data/diagram/t4-topup-verifikasi-inti.json";');
    expect(rantai.id).toBe("t4-topup-verifikasi-inti");
    expect(rantai.sumber.jenis).toBe("rekaman");
    expect(rantai.judul).toBe("Saldo naik sesudah gateway memberi tahu, dan tingkat akun naik sesudah verifikasi lulus");
    expect(rantai.catatan).toBe("Gateway dan layanan verifikasi adalah tiruan lokal di lab. App Flutter tidak ada di lab, jadi layar HP di widget digambar dari isi rekaman.");
  });

  test("skenario: kalimat mekanisme, judul langkah, label komponen, dan pengantar", () => {
    expect(skTopup.komponen.map((k) => k.label)).toEqual(["App Budi", "Server Go", "Gateway (tiruan)", "PostgreSQL", "Worker"]);
    expect(skTopup.perangkat.map((k) => k.label)).toEqual(["HP Budi"]);
    expect(skVerif.komponen.map((k) => k.label)).toEqual(["App Dina", "Server Go", "PostgreSQL", "Worker", "Layanan verifikasi (tiruan)"]);
    expect(skVerif.perangkat.map((k) => k.label)).toEqual(["HP Dina"]);
    expect(skTopup.pengantar).toBe("Budi mengisi Rp200.000 dari rekening banknya. Tebak dulu, lalu ikuti satu top-up dari HP Budi sampai saldonya naik. Sesudah langkah terakhir, centang 'Ubah satu hal'.");
    expect(skTopup.langkah.map((l) => l.judul)[3]).toBe("Server meminta gateway membuat order");
    expect(skTopup.langkah[3]!.kirim).toContain("POST /orders\nIdempotency-Key: <order_id>");
    expect(skTopup.langkah[7]!.judul).toBe("Server menjawab 200 sesudah COMMIT");
    expect(skTopup.langkah[7]!.jelas).toContain("Balasan 2xx dikirim hanya sesudah COMMIT.");
    expect(skTopup.langkah[8]!.judul).toBe("Worker mengirim pemberitahuan, app menampilkan saldo baru");
    expect(skTopup.varian.label).toBe("gateway membuat order, tetapi jawabannya tidak pernah sampai");
    expect(skTopup.varian.langkah[1]!.judul).toBe("Status tidak_pasti, bukan gagal");
    expect(skVerif.langkah[1]!.kirim).toContain(`tiap file paling besar ${maksFileMiB} MiB`);
    expect(skVerif.langkah[3]!.jelas).toContain("ditulis di satu transaction, sesudah kedua file tersimpan.");
    expect(skVerif.langkah[5]!.jelas).toContain("Id pengajuan dikirim sebagai Idempotency-Key");
    expect(skVerif.langkah[6]!.jelas).toContain("ditulis di satu transaction, menurut kode repo.");
    expect(skVerif.langkah[7]!.jelas).toContain("karena Dina terverifikasi. Batas saldonya juga naik");
    expect(skVerif.varian.label).toBe("Dina mengirim pengajuan kedua selagi yang pertama belum selesai");
  });

  test("RISET R4-120 sampai R4-122: kutipan sumber dan versi tidak dipendekkan", () => {
    const baris = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
    expect(baris("R4-122")).toContain('Pending "created and is waiting to be paid by the customer"');
    expect(baris("R4-122")).toContain('Settlement "successfully settled. Funds have been credited to your account"');
    expect(baris("R4-121")).toContain('"at most the first 512 bytes"');
    expect(baris("R4-120")).toContain("iOS wajib `NSCameraUsageDescription` di Info.plist");
    expect(baris("R4-120")).toContain('readme Android menulis "No configuration required"');
    expect(baris("R4-120")).toContain("kompresi hanya untuk jenis tertentu (JPEG, di Android juga PNG dan WebP;");
  });

  test("penutup tahap kedua: atribusi syarat, urutan worker, label dibaca dari kode, daftar empat hal, Android tidak dijamin, Base64", () => {
    const kutipan = "Setiap rupiah dari luar harus cocok dengan catatan pihak yang mengirimnya. Kalau tidak cocok, namanya insiden, bukan angka yang saya koreksi.";
    expect(naskah).toContain(`Aturan Pak Hadi dipertahankan dan diperluas: *"${kutipan}"*`);
    harus(`Pak Hadi menambah satu syarat. Katanya: *"${kutipan}"*`);
    harus("Worker memanggil layanan verifikasi sesudahnya, pengajuan `lulus`, dan tingkat Dina menjadi `terverifikasi` (`verifikasi.txt` bagian A sampai C).");
    expect(VC.findIndex((b) => b.startsWith("$ ./api-t4 -peran worker -sekali"))).toBeLessThan(VC.findIndex((b) => b === '{"objek":1,"permintaan":1}'));
    expect(VB.some((b) => b === "HTTP 202")).toBe(true);
    harus("Menurut kode `catatPengajuan`, pengajuan merchant tidak menulis baris outbox, karena tim risk yang memutuskannya (Tidak dijalankan: dibaca dari kode).");
    expect((halaman.match(/dibaca dari kode/g) ?? []).length).toBe(7);
    expect(halaman).not.toMatch(/diukur di lab|direkam di lab/);
    harus("Empat hal dari dokumentasinya memengaruhi layar ini:");
    const daftar = halaman.slice(halaman.indexOf("Empat hal dari dokumentasinya"), halaman.indexOf("Server menolak file lebih dari")).split("\n").filter((b) => b.startsWith("- "));
    expect(daftar).toHaveLength(4);
    expect(riset).toContain('this function is not guaranteed to work');
    expect(riset).toContain("Android tidak punya parameter terdokumentasi untuk memilih kamera");
    harus("Di iOS, `Info.plist` harus memuat `NSCameraUsageDescription`, sedangkan di Android readme menulis tidak ada konfigurasi tambahan");
    expect(riset).toContain("iOS wajib `NSCameraUsageDescription` di Info.plist");
    harus("Base64 menambah sepertiga. Dua file");
    expect(4 / 3 - 1).toBeCloseTo(1 / 3, 10);
  });

  test("sidik kata penentu halaman, skenario, dan Rantai (kunci agregat, bukan turunan)", () => {
    expect(tanpaSelalu(sidik(halaman, KATA))).toEqual({ tidak: 43, bukan: 10, belum: 17, hanya: 9, tanpa: 6, sesudah: 11, sebelum: 2, juga: 6, setiap: 1, semua: 4, "lebih dari": 2, "paling banyak": 3 });
    expect(sidik(nilaiString(skTopup).join("\n"), KATA)).toEqual({ tidak: 13, bukan: 5, belum: 1, hanya: 3, tanpa: 6, sesudah: 6, sebelum: 3, juga: 0, setiap: 0, semua: 0, "lebih dari": 1, "paling banyak": 0 });
    expect(sidik(nilaiString(skVerif).join("\n"), KATA)).toEqual({ tidak: 7, bukan: 4, belum: 6, hanya: 2, tanpa: 0, sesudah: 4, sebelum: 5, juga: 1, setiap: 1, semua: 0, "lebih dari": 0, "paling banyak": 0 });
    expect(sidik(nilaiString(rantai).join("\n"), KATA)).toEqual({ tidak: 1, bukan: 0, belum: 0, hanya: 0, tanpa: 0, sesudah: 2, sebelum: 0, juga: 0, setiap: 0, semua: 0, "lebih dari": 0, "paling banyak": 0 });
  });
});
