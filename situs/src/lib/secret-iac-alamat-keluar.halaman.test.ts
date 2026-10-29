// Penjaga angka halaman 4.17 (secret-iac-alamat-keluar.mdx): angka, versi, tanggal akses, rentang Snippet, tabel, nomor ADR, tautan,
// dan klaim "tidak" atau "hanya" ditulis tangan di halaman, Rantai, widget pilah, dan tiga halaman istilah. Semuanya diturunkan dari
// rekaman labs/t4-infra/output, README dan kode lab, naskah 4, registry, glosarium, dan RISET, bukan dari daftar yang ditulis sendiri.
// Pola: modular-monolith.halaman.test.ts. Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata
// halaman dan data dikunci per baris di secret-iac-alamat-keluar.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1) untuk mutasi
// tanpa kunci, dan dibuat ulang sesudah teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/secret-iac-alamat-keluar.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci: kalimat tentang kode dibaca terhadap kodenya (bao.go, klien.go, main.tf).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantai from "../../data/diagram/t4-infra-secret-inti.json";
import pilah from "../../lama/widgets/data/t4-infra-pilah.json";
import istSecret from "../../data/halaman-istilah/secret-manager.json";
import istIac from "../../data/halaman-istilah/iac.json";
import istProxy from "../../data/halaman-istilah/proxy-keluar.json";
import registry from "../../data/cerita.json";
import glosariumJson from "../../data/glosarium.json";
import { DataRantai } from "./rantai";
import { HalamanIstilah } from "./istilah";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK_HALAMAN, SIDIK_JSON, JUMLAH_LABEL } from "./secret-iac-alamat-keluar.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const HALAMAN = "situs/src/content/docs/tahap-4/secret-iac-alamat-keluar.mdx";
const halaman = baca(HALAMAN);
const naskah = baca("plan/CERITA-TAHAP-4.md");
const riset = baca("plan/RISET-TAHAP-4.md");
const alamat = baca("labs/t4-infra/output/alamat.txt");
const state = baca("labs/t4-infra/output/state.txt");
const rotasi = baca("labs/t4-infra/output/rotasi.txt");
const staging = baca("labs/t4-infra/output/staging.txt");
const testing = baca("labs/t4-infra/output/testing.txt");
const readme = baca("labs/t4-infra/README.md");
const tfA = baca("labs/t4-infra/tofu/rahasia-di-konfigurasi/main.tf");
const tfB = baca("labs/t4-infra/tofu/rahasia-runtime/main.tf");
const kodeBao = baca("labs/api-t4/internal/rahasia/bao.go");
const kodeKlien = baca("labs/api-t4/internal/klien/klien.go");
const glosariumMdx = baca("situs/src/content/docs/alat/glosarium.mdx");
const tanpaKunci = process.env.TANPA_KUNCI === "1" || process.env.TANPA_KUNCI === "2";
const tanpaSidik = process.env.TANPA_KUNCI === "2";

// ---- pembaca rekaman ---------------------------------------------------------------------------
interface Bagian { awal: number; akhir: number; baris: string[] }
const pecah = (teks: string): Record<string, Bagian> => {
  const semua = teks.split("\n");
  const hasil: Record<string, Bagian> = {};
  let kini = "";
  semua.forEach((b, i) => {
    const m = b.match(/^# --- ([A-Z]\d?)\. /);
    if (m) {
      if (kini) hasil[kini]!.akhir = i;
      kini = m[1]!;
      hasil[kini] = { awal: i + 1, akhir: semua.length, baris: [] };
    } else if (kini) hasil[kini]!.baris.push(b);
  });
  return hasil;
};
const bagian = (semua: Record<string, Bagian>, huruf: string): Bagian => {
  const b = semua[huruf];
  if (!b) throw new Error(`rekaman: bagian ${huruf} tidak ada`);
  return b;
};
const noBaris = (teks: string, awalan: string, dari = 1): number => {
  const i = teks.split("\n").findIndex((b, k) => k + 1 >= dari && b.startsWith(awalan));
  if (i < 0) throw new Error(`jangkar tidak ditemukan: ${awalan}`);
  return i + 1;
};
const rentang = (n: number, panjang: number): string => `${n}:${n + panjang - 1}`;
const harus = (kalimat: string, n = 1): void => expect(halaman.split(kalimat).length - 1, `kemunculan "${kalimat.slice(0, 80)}"`).toBe(n);
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const huruf1 = (x: string): string => x[0]!.toUpperCase() + x.slice(1);
const BILANGAN = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];

const AL = pecah(alamat);
const ST = pecah(state);
const RO = pecah(rotasi);
const SG = pecah(staging);
const alA = bagian(AL, "A");
const alB = bagian(AL, "B");
const cari = (b: string[], re: RegExp): RegExpMatchArray => {
  const m = b.map((x) => x.match(re)).find((x) => x);
  if (!m) throw new Error(`rekaman: pola tidak ada ${re}`);
  return m;
};
// ---- nilai turunan -----------------------------------------------------------------------------
const tolakA = Number(cari(alA.baris, /^#   ditolak 403, per alamat sumber: \{'host baru': (\d+)\}$/)[1]);
const gagalA = Number(cari(alA.baris, /^ gagal\s+\| belum\s+\| (\d+)$/)[1]);
const matiA = cari(alA.baris, /^ mati\s+\| (\d+)\s+\| (\d+)$/);
const percobaanA = Number(matiA[1]);
const pekerjaanA = Number(matiA[2]);
const terimaB = Number([...alB.baris].reverse().map((x) => x.match(/^#   diterima, per alamat sumber yang dilihat vendor: \{'proxy keluar': (\d+)\}$/)).find((x) => x)![1]);
const lulusB = Number(cari(alB.baris, /^ lulus\s+\| terverifikasi\s+\| (\d+)$/)[1]);
const asumsi = (registry.tahap as unknown as { no: number; asumsi: Record<string, number | string> }[]).find((t) => t.no === 4)!.asumsi as Record<string, number>;
const aktif = (asumsi.user! * asumsi.aktif!) / 100;
const trxHari = aktif * asumsi.trx!;
const topupHari = aktif * 0.25;
const topupPuncak = (topupHari / 86400) * asumsi.puncak!;
const jedaBaca = Number(readme.match(/\(bawaan service (\d+) detik\) adalah Asumsi; lab memakai (\d+) ms/)![1]);
const jedaLab = Number(readme.match(/\(bawaan service (\d+) detik\) adalah Asumsi; lab memakai (\d+) ms/)![2]);
const entri = (id: string) => (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; path?: string; adr?: number[]; peran?: string[]; menit?: number }[]).find((h) => h.id === id);
const barisRiset = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const RISET_ID = ["R4-190", "R4-191", "R4-192", "R4-193", "R4-194"];
const risetHalaman = RISET_ID.map(barisRiset).join("\n");

describe("rekaman dan kode: nilai turunan yang dipakai halaman", () => {
  test("alamat.txt bagian A: tiga pekerjaan kali lima percobaan = 15 penolakan 403, tiga pengajuan gagal, alamat host baru berbeda", () => {
    expect(pekerjaanA).toBe(3);
    expect(percobaanA).toBe(5);
    expect(gagalA).toBe(3);
    expect(tolakA).toBe(pekerjaanA * percobaanA);
    expect(tolakA).toBe(15);
    expect(alA.baris).toContain("# alamat host baru berbeda dari alamat host lama: ya");
    harus("jadi 15 penolakan dan tiga pengajuan `gagal`");
    harus("lima kali per pekerjaan");
    harus("Tiga pengajuan sesudah pindahan dijawab 403");
    harus("tiga pekerjaan kali lima percobaan menjadi 15 penolakan");
  });
  test("alamat.txt bagian B: proxy keluar didaftarkan sekali, enam diterima dari proxy, tidak ada penolakan, tiga lulus sesudah pindahan", () => {
    expect(terimaB).toBe(6);
    expect(lulusB).toBe(3);
    expect(alB.baris).toContain("#   ditolak 403, per alamat sumber: (tidak ada)");
    expect(alB.baris).toContain("# tiga alamat berbeda satu sama lain (host lama, host baru, proxy): ya");
    harus("Tiga pengajuan sesudah pindahan lulus tanpa satu penolakan.", 1);
    harus("Di rekaman itu tiga alamat berbeda satu sama lain: host lama, host baru, dan proxy.");
    expect(rantai.baris[0]!.simpul[1]!.sub).toBe(`${lulusB} lulus, 0 ditolak`);
    expect(rantai.baris[0]!.simpul[0]!.sub).toBe(`${tolakA} penolakan, ${gagalA} pengajuan gagal`);
  });
  test("state.txt: A memuat tiga atribut, B tidak memuat, C memuat dengan penanda sensitif kosong", () => {
    const A = bagian(ST, "A").baris;
    const B = bagian(ST, "B").baris;
    const C = bagian(ST, "C").baris;
    expect(A).toContain("state memuat nilai password dari random_password: ya");
    expect(A).toContain("state memuat nilai kunci dari variabel TF_VAR_kunci_gateway: ya");
    const atribut = A.filter((b) => /^  \S+: atribut content|^  \S+: atribut result/.test(b));
    expect(atribut.length).toBe(3);
    expect(atribut.every((b) => b.endsWith("sensitive_attributes diisi"))).toBe(true);
    expect(B).toContain("state memuat nilai rahasia webhook: tidak");
    expect(C).toContain("state memuat nilai rahasia yang dibaca data source: ya");
    expect(C).toContain("  data.local_sensitive_file.rahasia: atribut content; sensitive_attributes kosong");
    expect(A.some((b) => b.includes("(sensitive value)")) || state.includes("(sensitive value)")).toBe(true);
    harus("| A | `random_password` dan variabel `kunci_gateway` dipakai `local_file` | ya, tiga atribut | terisi |");
    harus("| B | `local_file` hanya menulis alamat OpenBao dan path | tidak | tidak berlaku, tidak ada nilai |");
    harus("| C | data source `local_sensitive_file` membaca file rahasia | ya | kosong |");
    expect(tfA).toContain('resource "random_password" "db"');
    expect(tfA).toContain("content  = jsonencode({ kunci = var.kunci_gateway })");
    expect(tfB).toContain("content  = jsonencode({ secret_manager = var.alamat_bao, path = var.path_rahasia })");
    expect(rantai.baris[1]!.simpul.map((s) => s.teks)).toEqual(["konfigurasi: ada di state", "OpenBao: tak ada di state"]);
  });
  test("rotasi.txt: mode dev hilang saat restart, tulis 403, tumpang tindih tanpa deploy, urutan terbalik 401, versi lama terbaca sampai destroy, OpenBao mati", () => {
    const A = bagian(RO, "A").baris.join("\n");
    const B = bagian(RO, "B").baris.join("\n");
    const C = bagian(RO, "C").baris.join("\n");
    const D = bagian(RO, "D").baris.join("\n");
    const E = bagian(RO, "E").baris.join("\n");
    expect(A).toContain("storage_type inmem");
    expect(A).toContain("sesudah container dihentikan dan dinyalakan lagi, GET secret/pembayaran/webhook dengan token root dev: 404");
    expect(B).toContain("token service mencoba menulis dokumen rahasia: 403 (hanya membaca)");
    expect(B).toContain("service dengan token yang tidak dikenal OpenBao: exit status 1");
    expect(C).toContain("proses service sama dengan sebelum rotasi (PID tidak berubah) dan tidak ada deploy: ya");
    expect(C).toContain("service sesudah rotasi: jumlah rahasia 2, versi dokumen 2");
    expect(C).toContain("kabar bertanda tangan v1 sesudah masa tumpang tindih berakhir: ditolak");
    expect(C).toContain("token service membaca versi 1 dokumen sesudah masa tumpang tindih berakhir: 200, berisi rahasia lama");
    expect(C).toContain("operator menghancurkan versi 1 dan 2 (destroy): token service membaca versi 1 dan 2: 404; versi terbaru (3): 200");
    expect(D).toContain("kabar dari gateway: ditolak");
    expect(D).toContain("Selama service belum membaca, kabar bertanda v3 ditolak 401.");
    expect(E).toContain("kabar bertanda tangan v3 saat OpenBao mati: sah");
    expect(E).toContain("kabar bertanda tangan v3 sesudah secret dan token hilang: sah");
    expect(E).toContain("token root membaca secret: 404; token service: 403");
    expect(jedaBaca).toBe(30);
    expect(jedaLab).toBe(50);
    harus("Jeda baca bawaan service 30 detik (Asumsi), dan lab memakai 50 ms.");
    harus("Percobaan menulis dijawab 403, dan token yang tidak dikenal membuat service tidak menyala");
    harus("sesudah container dihentikan dan dinyalakan lagi, secret yang tadi ditulis dijawab 404");
  });
  test("staging.txt: token staging 200 dan 403 dua kali, pemindai exit 1 tanpa nilai, baris di atas 1 MiB dilaporkan, file hilang exit 2", () => {
    const A = bagian(SG, "A").baris.join("\n");
    const B = bagian(SG, "B").baris.join("\n");
    expect(A).toContain("token staging membaca secret/staging/gateway: 200");
    expect(A).toContain("token staging membaca secret/produksi/gateway: 403");
    expect(A).toContain("token staging menulis secret/produksi/gateway: 403");
    expect(B).toContain("staging.env:2: kunci produksi (awalan)");
    expect(B).toContain("penerbit.env:1: kunci produksi (sidik)");
    expect(B).toContain("lebih panjang dari 1048576 byte");
    expect(B).toContain("# exit status 2");
    expect(1048576).toBe(1024 * 1024);
    harus("Baris lebih panjang dari 1 MiB dilaporkan sebagai temuan, dan file yang tidak ada menghasilkan exit 2");
    harus("dan membaca atau menulis secret produksi dengan jawaban 403");
  });
  test("README, testing.txt, dan kode: peer TCP, CONNECT 501, proxy tunggal, klien tanpa transport, pembacaan terakhir, daftar sekarang dan lama", () => {
    expect(readme).toContain("memeriksa alamat peer TCP, bukan header");
    expect(testing).toContain("--- PASS: TestSumberHanyaAlamatPeerBukanHeader");
    expect(readme).toContain("CONNECT (HTTPS) dijawab 501");
    expect(readme).toContain("Proxy keluar adalah titik gagal tunggal baru; matinya proxy tidak direkam");
    expect(kodeKlien).toContain("func BaruDenganTransport(timeout time.Duration, tr http.RoundTripper) *http.Client");
    expect(kodeKlien).toContain("return BaruDenganTransport(timeout, nil)");
    expect(kodeBao).toContain("Pada galat, daftar lama tidak berubah.");
    expect(kodeBao).toContain("p.beruntun++");
    expect(kodeBao).toContain("daftar := []string{d.Sekarang}");
    expect(kodeBao).toContain("if d.Lama != \"\" && d.Lama != d.Sekarang {");
    expect(readme).toContain("Mode dev kehilangan data dan token saat restart");
    expect(readme).toContain("Versi lama dokumen tetap terbaca");
    harus("Proxy keluar adalah titik gagal tunggal baru, dan matinya tidak direkam.");
    harus("CONNECT untuk HTTPS dijawab 501");
    harus("Fungsi `klien.Baru` membuat client tanpa transport sendiri");
    harus("Itu pilihan lab, bukan keputusan produk yang final.");
  });
  test("hitungan di halaman diulang dari angka yang tertulis: 0,579 × 30, 65.000, dan 2 × 1.000", () => {
    expect(aktif).toBe(20000);
    expect(koma(topupPuncak, 3)).toBe("0,579");
    expect(koma(Number(koma(topupPuncak, 3).replace(",", ".")) * jedaBaca, 2)).toBe("17,37");
    expect(Math.round(0.579 * 30)).toBe(17);
    expect(trxHari).toBe(60000);
    expect(topupHari).toBe(5000);
    expect(trxHari + topupHari).toBe(65000);
    expect(2 * 1000).toBe(2000);
    harus("Pada puncak ada 0,579 top-up per detik (Asumsi: 20.000 × 0,25 ÷ 86.400 × 10).");
    harus("0,579 × 30 = 17,37 kabar, atau ±17");
    harus(`${titik(aktif)} × 3 = ${titik(trxHari)} transaksi dan ${titik(aktif)} × 0,25 = ${titik(topupHari)} top-up`);
    harus(`Jumlahnya ${titik(trxHari + topupHari)} kejadian uang per hari (Hitungan atas Asumsi: 100.000 user, 20% aktif).`);
    harus("menahan 2 × 1.000 = 2.000 pendaftar (Hitungan atas dua Asumsi, pendaftaran dihitung rata tiap hari)");
    harus("2 hari kerja × 1.000 pendaftar per hari = 2.000 pendaftar tertunda (Hitungan atas dua Asumsi)");
    harus("menolak lebih dari ±17 kabar (0,579 × 30; Hitungan atas Asumsi)");
    harus("65.000 kejadian uang per hari dalam satu jendela `pg_dump` (Hitungan atas Asumsi)");
    expect(riset).toContain("circleci.com/blog/jan-4-2023-incident-report (12 Januari 2023)");
    harus("12 Januari 2023", 1);
    expect(naskah).toContain("65.000 per hari di Tahap 4 (60.000 + 5.000; Hitungan atas Asumsi)");
    expect(naskah).toContain("pendaftaran alamat butuh dua hari kerja (Asumsi)");
    expect(naskah).toContain("1.000 pendaftar per hari (Asumsi)");
  });
});

describe("rentang Snippet diturunkan dari rekaman dan kode, bukan angka tangan", () => {
  test("setiap Snippet berrentang menunjuk jangkar yang benar dan tidak ada rentang lain", () => {
    const sesudahA = noBaris(alamat, "# sesudah pindahan", alA.awal);
    const sesudahB = noBaris(alamat, "# sesudah pindahan", alB.awal);
    const bAwalC = bagian(RO, "C").awal;
    const fungsiMuat = noBaris(kodeBao, "// Muat membaca versi terbaru dokumen sekali.");
    const akhirMuat = kodeBao.split("\n").findIndex((b, k) => k + 1 > fungsiMuat + 1 && b === "}") + 1;
    const stagingPindai = noBaris(staging, "$ pindairahasia -awalan gw_live_ -sidik produksi.sidik staging.env penerbit.env");
    const harapan = [
      `labs/t4-infra/output/state.txt:${noBaris(state, "state memuat nilai password dari random_password: ya")}:${noBaris(state, "state memuat nilai password dari random_password: ya")}`,
      `labs/t4-infra/output/state.txt:${noBaris(state, "state memuat nilai rahasia webhook: tidak")}:${noBaris(state, "state memuat nilai rahasia webhook: tidak")}`,
      `labs/t4-infra/output/alamat.txt:${rentang(sesudahA, 5)}`,
      `labs/t4-infra/output/alamat.txt:${rentang(sesudahB, 5)}`,
      `labs/t4-infra/tofu/rahasia-di-konfigurasi/main.tf:${noBaris(tfA, 'resource "random_password" "db"')}:${tfA.replace(/\n$/, "").split("\n").length}`,
      `labs/t4-infra/tofu/rahasia-runtime/main.tf:${noBaris(tfB, 'resource "local_file" "konfigurasi_service"')}:${tfB.replace(/\n$/, "").split("\n").length}`,
      `labs/api-t4/internal/rahasia/bao.go:${fungsiMuat}:${akhirMuat}`,
      `labs/t4-infra/output/rotasi.txt:${rentang(noBaris(rotasi, "service sesudah rotasi:", bAwalC), 4)}`,
      `labs/api-t4/internal/rahasia/bao.go:${rentang(noBaris(kodeBao, "\tdaftar := []string{d.Sekarang}"), 4)}`,
      `labs/t4-infra/output/rotasi.txt:${rentang(noBaris(rotasi, "service: jumlah rahasia 1, versi dokumen 3"), 5)}`,
      `labs/t4-infra/output/rotasi.txt:${rentang(noBaris(rotasi, "OpenBao dihentikan. service:"), 4)}`,
      `labs/t4-infra/output/staging.txt:${rentang(stagingPindai, 4)}`,
    ].sort();
    const dipakai = [...halaman.matchAll(/<Snippet file="([^"]+)" lines="(\d+:\d+)"/g)].map((m) => `${m[1]}:${m[2]}`).sort();
    expect(dipakai).toEqual(harapan);
    expect(fungsiMuat).toBe(52);
  });
  test("isi Snippet bao.go: Muat mengganti daftar hanya bila berhasil, dan satu rentang memuat sekarang dan lama", () => {
    const baris = kodeBao.split("\n");
    expect(baris.slice(51, 66).join("\n")).toContain("p.daftar, p.versi = daftar, versi");
    expect(baris.slice(108, 112).join("\n")).toContain("daftar = append(daftar, d.Lama)");
  });
});

describe("sumber luar: versi, tanggal dibuka, lisensi, baris RISET R4-190 sampai R4-194, dan halaman istilah", () => {
  test("versi alat di halaman sama dengan RISET dan README lab; Terraform dibedakan dari README", () => {
    expect(barisRiset("R4-190")).toContain("OpenTofu v1.13.2 terbit 2026-10-21");
    expect(barisRiset("R4-190")).toContain("OpenBao v2.7.2 terbit 2026-10-26");
    expect(barisRiset("R4-190")).toContain("Terraform v1.17.1 terbit 2026-10-28");
    expect(barisRiset("R4-190")).toContain("Vault v2.2.1 terbit 2026-10-22");
    expect(readme).toContain("v2.7.2");
    expect(readme).toContain("v1.13.2");
    expect(readme).toContain("Terraform v1.17.0, Vault v2.2.1");
    harus("OpenTofu v1.13.2", 1);
    harus("OpenBao v2.7.2", 3);
    harus("Terraform v1.17.1", 2);
    harus("Vault v2.2.1", 2);
    harus("README lab menulis Terraform v1.17.0, dan v1.17.1 terbit 2026-10-28.");
    harus("Go 1.27.3", 1);
    harus("Go 1.27.1", 2);
    expect(kodeKlien.length).toBeGreaterThan(0);
    expect(testing).toContain("go1.27.1");
    expect(riset).toContain("Go 1.27.3");
  });
  test("lisensi: MPL-2.0 untuk OpenTofu dan OpenBao, BSL dengan grant produksi untuk Terraform dan Vault, tanggal pengumuman 10 Agustus 2023", () => {
    expect(barisRiset("R4-190")).toContain("OpenTofu dan OpenBao Mozilla Public License 2.0");
    expect(barisRiset("R4-190")).toContain("penggunaan produksi diizinkan, asalkan tidak menawarkan Licensed Work ke pihak ketiga secara hosted atau embedded");
    expect(barisRiset("R4-190")).toContain("(2023-08-10)");
    harus("Lisensi OpenTofu dan OpenBao adalah MPL-2.0");
    harus("pada 10 Agustus 2023");
    harus("dari MPL 2.0 ke BSL v1.1");
    harus("bukan penilaian hukum [perlu verifikasi: tinjauan hukum PT]");
  });
  test("semua tanggal dibuka 2026-10-30 dan sama dengan baris RISET; tidak ada ID riset atau nomor keputusan di halaman", () => {
    const tanggal = [...halaman.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
    expect(tanggal.length).toBe(14);
    expect(new Set(tanggal)).toEqual(new Set(["2026-10-30"]));
    for (const id of RISET_ID) expect(barisRiset(id), id).toContain("2026-10-30");
    expect(halaman).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(halaman).not.toMatch(/keputusan \d{3,4}|PR #\d+|#\d{3}\b/);
  });
  test("tiap tautan sumber luar ada di baris RISET milik halaman ini", () => {
    const url = [...new Set([...halaman.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]!))];
    expect(url.length).toBe(13);
    for (const u of url) {
      const kunci = u.replace(/^https:\/\/(www\.)?/, "").replace(/#.*$/, "").replace(/\/$/, "").replace(/\.html$/, "");
      expect(risetHalaman, u).toContain(kunci);
    }
    for (const h of [istSecret, istIac, istProxy]) {
      for (const s of (h.sumber as { url?: string }[]).filter((x) => x.url)) {
        const kunci = s.url!.replace(/^https:\/\//, "").replace(/#.*$/, "").replace(/\/$/, "");
        const ada = risetHalaman.includes(kunci) || kunci.startsWith("github.com/opentofu/opentofu/releases");
        expect(ada, s.url).toBe(true);
      }
    }
  });
  test("lima baris R4-190 sampai R4-194 ada, berurutan, menyebut halaman 4.17, dan semua ID RISET unik", () => {
    const semua = riset.split("\n").flatMap((b) => { const m = b.match(/^\| (R4-\d+) \|/); return m ? [m[1]!] : []; });
    expect(new Set(semua).size).toBe(semua.length);
    const nomor = semua.map((x) => Number(x.slice(3)));
    const i = semua.indexOf("R4-190");
    expect(semua.slice(i, i + 5)).toEqual(RISET_ID);
    expect(nomor).toEqual([...nomor].sort((x, y) => x - y));
    expect(nomor[i - 1]).toBeLessThan(190);
    expect(nomor[i + 5]).toBeGreaterThan(194);
    for (const id of RISET_ID) expect(barisRiset(id).split("|")[4], id).toContain("4.17");
  });
  test("tiga halaman istilah valid, punya baris glosarium dengan rujukan ke halaman ini, dan merujuk baris RISET atau rekaman yang ada", () => {
    for (const [slug, h, jumlahSumber] of [["secret-manager", istSecret, 3], ["iac", istIac, 3], ["proxy-keluar", istProxy, 3]] as const) {
      expect(() => HalamanIstilah.parse(h), slug).not.toThrow();
      expect(h.sumber!.length).toBe(jumlahSumber);
      expect(h.cerita![0]!.rujukan).toBe("t4-infra-secret");
      const baris = (glosariumJson as { t: string; s: string; b: string | null; u: string | null; h: string | null }[]).find((x) => x.s === `istilah-${slug}`);
      expect(baris, slug).toBeTruthy();
      expect(baris!.b).toBe("t4-infra-secret");
      expect(baris!.h).toBe(`/istilah/${slug}/`);
      for (const s of h.sumber as { riset?: string; rekaman?: string }[]) {
        if (s.riset) expect(RISET_ID, s.riset).toContain(s.riset);
        if (s.rekaman) expect(fs.existsSync(path.join(akar, s.rekaman)), s.rekaman).toBe(true);
      }
    }
    expect(glosariumMdx).toContain("| **IaC** (infrastructure as code) |");
    expect(glosariumMdx).toContain("| **Proxy keluar** (egress proxy) |");
    expect(glosariumMdx).toContain("| **Secret manager** |");
    expect(glosariumMdx.match(/\[\[t4-infra-secret\]\]/g)!.length).toBe(3);
  });
});

describe("rujukan [[ID]], registry, struktur lima blok, widget pilah, dan Rantai", () => {
  test("halaman 4.17 terdaftar sebagai Konsep bagian 4 dengan lab t4-infra, ADR 39, prasyarat M34, dan menit sama dengan baris meta", () => {
    const h = entri("t4-infra-secret")!;
    expect(h.nomor).toBe("4.17");
    expect(h.ada).toBe(true);
    expect(h.jenis).toBe("konsep");
    expect(h.bagian).toBe(4);
    expect(h.inti).toBe(true);
    expect(h.lab).toEqual(["t4-infra"]);
    expect(h.adr).toEqual([39]);
    expect(h.prasyarat).toEqual(["t4-m34"]);
    expect(h.path).toBe("tahap-4/secret-iac-alamat-keluar.md");
    expect(h.peran).toEqual(["devops", "backend"]);
    expect(h.menit).toBe(19);
    expect(h.judul).toBe("Secret manager, IaC, alamat keluar tetap + ADR 39");
    expect(halaman).toContain('title: "4.17 Secret manager, IaC, alamat keluar tetap + ADR 39"');
    harus('<p class="meta">Baca 16 menit · coba 3 menit · Prasyarat: [[t4-m34]] · Jalur inti</p>');
    expect(naskah).toContain("| 4.17 | 4 | Secret manager, IaC, alamat keluar tetap + ADR 39 | Konsep + ADR | ★ | t4-infra | pilah |");
    const adr39 = naskah.split("\n").find((b) => b.startsWith("| 39 |"))!;
    expect(adr39).toContain("OpenBao v2.7.2");
    expect(adr39).toContain("2 hari kerja");
  });
  test("setiap [[ID]] ada di registry dan menunjuk halaman yang dimaksud", () => {
    const tujuan: Record<string, string> = {
      "t4-m34": "4.16", "t3-dua-instance": "3.15", "t3-adr-33": "3.30", "t1-secret": "1.35", "t4-prd": "4.1", "t4-m30": "4.8",
      "t4-rekonsiliasi": "4.9", "t4-tim-infra": "4.26", "t4-adr-45": "4.29",
    };
    const dipakai = new Set([...halaman.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]!));
    for (const id of dipakai) {
      if (id === "berikutnya" || id === "B11.2") continue;
      expect(entri(id)?.nomor, id).toBe(tujuan[id]);
    }
    expect(entri("B11.2")?.id).toBe("B11.2");
    expect(entri("B11.2")).toMatchObject({ lebur_ke: "t4-infra-secret" });
    harus("[[t4-m34]] menulis tiga akibat satu pindahan");
    harus("ADR 35 di [[t4-rekonsiliasi]] menulis dua secret diterima sampai rotasi selesai");
    harus("BFF terpisah dari halaman lama [[B11.2]] tidak dibahas di sini, dan [[t4-adr-45]] menyebutnya.");
  });
  test("lima blok, heading, impor, komponen, tab stack, dan label turunan didefinisikan di pemakaian pertama", () => {
    const blok = [...halaman.matchAll(/<Blok nama="([^"]+)"( buka)?/g)].map((m) => [m[1], !!m[2]]);
    expect(blok).toEqual([["Mulai", true], ["Coba", true], ["Paham", false], ["Putuskan", false], ["Kunci", false]]);
    const judul = [...halaman.matchAll(/^(#{2,3}) (.+)$/gm)].map((m) => `${m[1]} ${m[2]}`);
    expect(judul).toEqual([
      "## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Di stack lain",
      "### ADR 39: layanan terkelola untuk data, file, dan secret, IaC, dan alamat keluar tetap", "### Sengaja belum dilakukan", "### Cek diri",
      "### Saat me-review kode AI, cek ini", "### Bacaan lanjut",
    ]);
    expect(halaman.match(/<Rantai /g)!.length).toBe(1);
    expect(halaman.match(/<WidgetLama /g)!.length).toBe(1);
    expect(halaman).toContain('<WidgetLama nama="pilah" src="data/t4-infra-pilah.json" />');
    expect(halaman).not.toContain("DiagramArsitektur");
    expect(halaman).toContain('<SkripLama daftar={["pilah"]} />');
    harus('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    expect((halaman.match(/<Fragment slot="t\d">/g) ?? []).length).toBe(6);
    const pertama = (kata: string): number => halaman.indexOf(kata);
    expect(pertama("Rekaman lab ([Label sumber](/cara-pakai/#label-sumber))")).toBeLessThan(pertama("Tidak dijalankan"));
    expect(pertama("Tidak dijalankan, artinya dicek ke dokumentasi atau kode tanpa menjalankannya")).toBeGreaterThan(0);
    expect(pertama("Ilustrasi, bukan hasil sistem")).toBeGreaterThan(0);
    expect(pertama("Hitungan")).toBe(pertama("Itu Hitungan: hasil rumus dari angka yang tertulis di halaman ini") + "Itu ".length);
    expect(pertama("allowlist, yaitu daftar alamat sumber yang boleh memanggilnya")).toBeLessThan(pertama("Proxy keluar adalah program perantara"));
    expect(pertama("OpenTofu adalah alat IaC (infrastructure as code)")).toBeGreaterThan(0);
    expect(pertama("yaitu layanan penyimpan secret")).toBeGreaterThan(0);
    expect(pertama("yaitu saat service berjalan")).toBeGreaterThan(0);
    expect(pertama("yaitu plugin untuk satu jenis layanan")).toBeGreaterThan(0);
    expect(pertama("yaitu token yang hanya boleh membaca satu path")).toBeGreaterThan(0);
    expect(pertama("masa tumpang tindih berlaku: kabar bertanda tangan nilai lama masih diterima")).toBeGreaterThan(0);
  });
  test("widget pilah: enam item, dua kelompok, jawaban benar tidak di satu posisi dan tidak terpanjang, dan isi cocok dengan rekaman", () => {
    expect(pilah.kelompok).toEqual(["Pindah ke layanan terkelola", "Tetap di mesin VPS"]);
    expect(pilah.item.length).toBe(6);
    expect(pilah.item.map((i) => i.jawab)).toEqual([1, 0, 0, 1, 0, 1]);
    expect(pilah.item.filter((i) => i.jawab === 0).length).toBe(3);
    expect(pilah.item.every((i) => i.jawab === 0 || i.jawab === 1)).toBe(true);
    expect(pilah.item[0]!.teks).toBe("Proses app: API monolith dan service pembayaran.");
    expect(pilah.item[0]!.kenapa).toContain("ADR 26");
    expect(pilah.item[0]!.kenapa).toContain("ADR 33");
    expect(pilah.item[1]!.kenapa).toContain("24 jam");
    expect(pilah.item[2]!.kenapa).toContain("ADR 38");
    expect(naskah.split("\n").find((b) => b.startsWith("| 38 |"))).toContain("Database menyimpan kunci objek dan checksum");
    expect(pilah.item[3]!.kenapa).toContain("rotasi.txt bagian B");
    expect(pilah.item[4]!.kenapa).toContain("state.txt bagian B");
    expect(pilah.item[4]!.kenapa).toContain("rotasi.txt bagian C");
    expect(pilah.item[5]!.kenapa).toContain("alamat.txt bagian B");
    expect(pilah.item[5]!.kenapa).toContain("HTTP_PROXY");
    for (const i of pilah.item) expect(i.kenapa).not.toMatch(/\bR\d-\d+|keputusan \d|PR #/);
    harus("Tebak dulu satu per satu: pindah ke layanan terkelola, atau tetap di mesin VPS?");
    harus("Enam komponen Rekeningo");
    expect(pilah.item.length).toBe(BILANGAN.indexOf("enam"));
  });
  test("Rantai valid, dua baris dua simpul, nada sesuai, dan simpul akhir terbaca benar tanpa sub", () => {
    expect(() => DataRantai.parse(rantai)).not.toThrow();
    expect(rantai.baris.length).toBe(2);
    expect(rantai.baris.map((b) => b.label)).toEqual(["Alamat keluar", "State OpenTofu"]);
    expect(rantai.baris.map((b) => b.simpul.map((s) => s.nada))).toEqual([["warn", "good"], ["warn", "good"]]);
    expect(rantai.baris.map((b) => b.simpul.map((s) => s.teks))).toEqual([["tanpa proxy: ditolak 403", "dengan proxy: lulus"], ["konfigurasi: ada di state", "OpenBao: tak ada di state"]]);
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t4-infra, alamat.txt bagian A dan B, state.txt bagian A dan B" });
    const inti = halaman.split("## Inti\n\n")[1]!.split("\n")[0]!;
    expect(inti).toBe("Sesudah pindahan, vendor tetap melihat satu alamat, dan nilai secret tidak tersimpan di state OpenTofu.");
    expect(inti.length).toBeLessThanOrEqual(150);
  });
  test("Cek diri bernomor 1 sampai 5 berurutan dan sama banyak dengan jawabannya; tiga pertanyaan Inti ada dua kali", () => {
    const nomor = [...halaman.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => Number(m[1]));
    expect(nomor).toEqual([1, 2, 3, 4, 5]);
    expect((halaman.match(/<details class="success">/g) ?? []).length).toBe(5);
    const pertanyaanInti = halaman.split('<details class="question">')[1]!.split("</details>")[0]!.match(/^[123]\. /gm) ?? [];
    expect(pertanyaanInti.length).toBe(3);
  });
});

describe("klaim yang berlingkup: kata penuh, negatif, dan label", () => {
  test("klaim negatif dan universal menyebut lingkupnya", () => {
    harus("Itu pilihan lab, bukan keputusan produk yang final.");
    harus("Matinya proxy tidak direkam.");
    harus("Hosting terkelola Tidak dijalankan, artinya dicek ke dokumentasi atau kode tanpa menjalankannya.");
    harus("Halaman itu tidak membahas produksi, secret manager, atau pembacaan ulang.");
    harus("Halaman itu tidak membahas rotasi tanpa deploy.");
    harus("Halaman itu tidak membahas rotasi.", 2);
    harus("Bagian settings yang dibuka tidak menyebut dari mana nilai `SECRET_KEY` dibaca.");
    harus("Dokumentasi Go hanya menulis pengecualian untuk host `localhost`");
    expect(halaman).not.toMatch(/\b(?:selalu|semua stack|tidak satu pun|setiap vendor)\b/i);
    expect(halaman).not.toMatch(/\bpasti\b|\baman sepenuhnya\b/i);
    expect(risetHalaman).toContain("tidak membahas rotasi tanpa deploy kecuali Django");
  });
  test("tiga opsi ditolak masing-masing punya alasan, opsi dipilih punya bukti rekaman, dan tabel ADR utuh", () => {
    harus("**A ditolak** karena");
    harus("**B ditolak** karena");
    harus("**D ditolak** untuk Rekeningo");
    harus("**Keputusan: opsi C.** Enam aturan:");
    const tabel = halaman.split("| | A. Satu VPS dan `.env` |")[1]!.split("\n\n")[0]!.split("\n").filter((b) => b.startsWith("|"));
    expect(tabel.length).toBe(6);
    expect(tabel.every((b) => (b.match(/\|/g) ?? []).length === 6)).toBe(true);
    expect(tabel.at(-1)).toContain("Rekaman `alamat.txt` B, `state.txt` B, `rotasi.txt` C. Layanan terkelola Tidak dijalankan");
    const aturan = halaman.split("**Keputusan: opsi C.** Enam aturan:")[1]!.split("**Kenapa C")[0]!.match(/^\d\. /gm) ?? [];
    expect(aturan.length).toBe(6);
  });
  test("tabel Sengaja belum dilakukan: enam baris dengan tiga kolom", () => {
    const bagianTabel = halaman.split("### Sengaja belum dilakukan\n\n")[1]!.split("\n\n")[0]!.split("\n");
    expect(bagianTabel.length).toBe(2 + 6);
    expect(bagianTabel.every((b) => (b.match(/\|/g) ?? []).length === 4)).toBe(true);
    expect(bagianTabel.filter((b) => b.includes("[[t3-adr-33]]")).length).toBe(1);
    expect(bagianTabel.filter((b) => b.includes("[[t4-tim-infra]]")).length).toBe(1);
  });
});

describe("penutup tanpa kunci: nomor ADR, M34, status HTTP, versi dokumentasi, Snippet, tab, rujukan, tautan, tabel, dan isi data", () => {
  const adr = (id: string): number => entri(id)!.adr![0]!;
  const A = { dua: adr("t3-dua-instance"), tiga: adr("t3-adr-33"), satu: adr("t1-secret"), rekon: adr("t4-rekonsiliasi"), breaker: adr("t4-breaker"), storage: adr("t4-storage"), sendiri: adr("t4-infra-secret") };
  const hitungKonteks = (daftar: [RegExp, number[]][], jumlahTotal: number): void => {
    let jumlah = 0;
    for (const [re, harapan] of daftar) {
      const cocok = [...halaman.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))];
      expect(cocok.length, re.source).toBeGreaterThanOrEqual(1);
      for (const m of cocok) {
        expect(m.slice(1).map(Number), re.source).toEqual(harapan);
        jumlah += harapan.length;
      }
    }
    expect(jumlah).toBe(jumlahTotal);
  };
  test("setiap nomor ADR di prosa sama dengan nomor yang dibawa registry untuk halaman yang dirujuknya, dan semua kemunculan terhitung", () => {
    hitungKonteks([
      [/\+ ADR (\d+)"\ndescription/, [A.sendiri]],
      [/ADR (\d+) memindahkan data, file/, [A.sendiri]],
      [/^### ADR (\d+): layanan/m, [A.sendiri]],
      [/dari ADR (\d+) dan ADR (\d+)\. Tebak dulu/, [A.dua, A.storage]],
      [/diterima ADR (\d+) dan ADR (\d+) \(\[\[t3-dua-instance\]\], \[\[t3-adr-33\]\]\)/, [A.dua, A.tiga]],
      [/\. ADR (\d+) menaruh nilai asli hanya di `\.env` VPS \(\[\[t1-secret\]\]\)/, [A.satu]],
      [/Breaker ADR (\d+) tidak menolong/, [A.breaker]],
      [/ADR (\d+) di \[\[t4-rekonsiliasi\]\]/, [A.rekon]],
      [/tetap ditunda ADR (\d+), karena PRD v4 tidak menulis/, [A.tiga]],
      [/yang ADR (\d+) dan ADR (\d+) terima/, [A.dua, A.tiga]],
      [/titik gagal tunggal ADR (\d+)\. Opsi A di bawah adalah ADR (\d+) yang/, [A.dua, A.satu]],
      [/Dijaga ADR (\d+) \|/, [A.satu]],
      [/dan ADR (\d+) menundanya/, [A.tiga]],
      [/yang ditunda ADR (\d+)\. Pemicu ADR (\d+) belum ada di PRD/, [A.tiga, A.tiga]],
      [/yang ADR (\d+) tunda, dengan pembanding/, [A.tiga]],
      [/kedua ditunda ADR (\d+), karena PRD v4 belum menulis/, [A.tiga]],
    ], (halaman.match(/ADR \d+/g) ?? []).length);
    expect(halaman.match(/ADR \d+/g)!.length).toBe(21);
  });
  test("nomor masalah M34 sama dengan id registry halaman 4.16, dan tidak ada M lain", () => {
    const nomor = entri("t4-m34")!.id.match(/m(\d+)$/)![1];
    const semua = halaman.match(/\bM\d+\b/g) ?? [];
    expect(semua.length).toBe(3);
    expect(new Set(semua)).toEqual(new Set([`M${nomor}`]));
  });
  test("status HTTP di prosa sama dengan rekaman dan README, dan semua kemunculan terhitung", () => {
    const st = (b: string[] | string, re: RegExp): number => Number((typeof b === "string" ? b.match(re) : cari(b, re))![1]);
    const tolak = st(alA.baris, /^#   ditolak (\d{3}), per alamat sumber: \{'host baru'/);
    const restart = st(bagian(RO, "A").baris, /sesudah container dihentikan dan dinyalakan lagi, GET secret\/pembayaran\/webhook dengan token root dev: (\d{3})/);
    const tulis = st(bagian(RO, "B").baris, /mencoba menulis dokumen rahasia: (\d{3}) /);
    const terbalik = st(bagian(RO, "D").baris, /Selama service belum membaca, kabar bertanda v3 ditolak (\d{3})\./);
    const baca = st(bagian(SG, "A").baris, /token staging membaca secret\/staging\/gateway: (\d{3})/);
    const prod = st(bagian(SG, "A").baris, /token staging membaca secret\/produksi\/gateway: (\d{3})/);
    const tulisProd = st(bagian(SG, "A").baris, /token staging menulis secret\/produksi\/gateway: (\d{3})/);
    const connect = st(readme, /CONNECT \(HTTPS\) dijawab (\d{3})/);
    expect(prod).toBe(tulisProd);
    hitungKonteks([
      [/dijawab (\d{3}) lima kali per pekerjaan/, [tolak]],
      [/menolak host baru dengan (\d{3})\./, [tolak]],
      [/atas jawaban (\d{3}) yang tidak akan berubah/, [tolak]],
      [/Breaker ADR 36 tidak menolong jawaban (\d{3}), dan itu/, [tolak]],
      [/dijawab (\d{3}) dan vendor tiruan tidak memakai TLS/, [connect]],
      [/CONNECT dijawab (\d{3})\. Tidak dijalankan/, [connect]],
      [/secret yang tadi ditulis dijawab (\d{3})\./, [restart]],
      [/Percobaan menulis dijawab (\d{3}), dan token/, [tulis]],
      [/kabarnya ditolak (\d{3}) sampai service membaca/, [terbalik]],
      [/Kabar gateway ditolak (\d{3})\. Apa urutan/, [terbalik]],
      [/secret staging dengan jawaban (\d{3}), dan membaca atau menulis secret produksi dengan jawaban (\d{3}) \(`staging\.txt`/, [baca, prod]],
    ], (halaman.match(/\b(?:200|401|403|404|501)\b/g) ?? []).length);
    expect((halaman.match(/\b(?:200|401|403|404|501)\b/g) ?? []).length).toBe(13);
  });
  test("versi dokumentasi stack sama dengan baris RISET dan URL-nya; jumlah tanggal di baris RISET sama dengan yang tertulis", () => {
    const pasangan: [string, string][] = [
      ["Node.js v26.13.0: environment variables", "Node.js v26.13.0 (nodejs.org/api/environment_variables)"],
      ["Laravel 13.x: Configuration", "Laravel 13.x (laravel.com/docs/13.x/configuration)"],
      ["Django 6.1: settings", "Django 6.1 (docs.djangoproject.com/en/6.1/ref/settings"],
      ["Serverpod 4.0.0: configuration", "Serverpod 4.0.0 (docs.serverpod.dev/concepts/server-fundamentals/configuration)"],
    ];
    for (const [h, r] of pasangan) {
      harus(h);
      expect(barisRiset("R4-194"), r).toContain(r);
    }
    harus("Django 6.1: SECRET_KEY_FALLBACKS");
    expect(barisRiset("R4-192")).toContain("pkg.go.dev/net/http#ProxyFromEnvironment (Go 1.27.3)");
    expect(barisRiset("R4-192")).toContain("Lab memakai Go 1.27.1");
    expect(barisRiset("R4-190")).toContain("Terraform v1.17.1 terbit 2026-10-28");
    harus("v1.17.1 terbit 2026-10-28");
    const jumlahTanggal = Object.fromEntries(RISET_ID.map((id) => [id, (barisRiset(id).match(/2026-10-30/g) ?? []).length]));
    expect(jumlahTanggal).toEqual({ "R4-190": 2, "R4-191": 1, "R4-192": 1, "R4-193": 1, "R4-194": 1 });
  });
  test("semua tanggal, jeda baca, laju pendaftar, versi dokumen rotasi, dan PRD v4 diturunkan dari sumber", () => {
    const tanggal = [...halaman.matchAll(/\b(2026-\d{2}-\d{2})\b/g)].map((m) => m[1]);
    expect(tanggal.length).toBe(16);
    expect(tanggal.filter((t) => t === "2026-10-30").length).toBe(15);
    expect(tanggal.filter((t) => t === "2026-10-28").length).toBe(1);
    harus("hanya dicek ke dokumentasi pada 2026-10-30. Kode di tab lain adalah Ilustrasi.");
    const prd = halaman.match(/PRD v\d+/g) ?? [];
    expect(prd.length).toBe(4);
    expect(new Set(prd)).toEqual(new Set([`PRD v${entri("t4-prd")!.judul.match(/PRD v(\d+)/)![1]}`]));
    const pendaftar = Number(naskah.match(/([\d.]+) pendaftar per hari \(Asumsi\)/)![1]!.replace(".", ""));
    harus(`Pendaftar baru datang ${titik(pendaftar)} per hari (Asumsi).`);
    const puncak = koma(topupPuncak, 3);
    harus(`Jeda baca bawaan ${jedaBaca} detik adalah Asumsi`);
    harus(`melebihi ${jedaBaca} detik atau laju puncak melebihi ${puncak} top-up per detik`);
    harus(`menolak sampai ±${Math.round(Number(puncak.replace(",", ".")) * jedaBaca)} kabar pada laju puncak`);
    const versiDokumen = Number(cari(bagian(RO, "C").baris, /^service sesudah rotasi: jumlah rahasia \d+, versi dokumen (\d+)/)[1]);
    harus(`operator menulis versi ${versiDokumen}, dan service yang sama membaca dua rahasia`);
    const kvVersi = Number(bagian(RO, "A").baris.join("\n").match(/options\.version (\d+)/)![1]);
    harus(`Dokumentasi KV versi ${kvVersi} menulis bahwa versi sebelumnya tetap terbaca`);
    expect(halaman).toContain(`(https://openbao.org/docs/secrets/kv/kv-v${kvVersi}/)`);
    const pertanyaan = halaman.split('<details class="question">')[1]!.split("</details>")[0]!.match(/^\d\. /gm) ?? [];
    harus(`Cek ${pertanyaan.length} pertanyaan`);
    harus("seperti base64,");
    const jendelaDump = Number(naskah.match(/berjendela sampai (\d+) jam/)![1]);
    harus(`harian berjendela sampai ${jendelaDump} jam`);
    const aturan = halaman.split("**Keputusan: opsi C.** Enam aturan:")[1]!.split("**Kenapa C")[0]!.split("\n").filter((b) => /^\d\. /.test(b));
    const nomorKonfigurasi = aturan.findIndex((b) => b.includes("Konfigurasi IaC tidak memuat nilai secret")) + 1;
    harus(`Pencegahannya aturan ${nomorKonfigurasi}, review PR atas konfigurasi`);
    const preMortem = halaman.split("**Pre-mortem.**")[1]!.split("**Kapan keputusan ini salah.**")[0]!.match(/^\d\. /gm) ?? [];
    harus(`Bayangkan keputusan ini gagal 6 bulan lagi. ${huruf1(BILANGAN[preMortem.length]!)} penyebab yang paling mungkin:`);
    harus(`dari rekaman \`${entri("t4-infra-secret")!.lab![0]}\` dan dari ADR`);
  });
  test("Snippet: file ada, judul memuat path, judul rekaman memuat bagian yang benar, dan bahasa sesuai ekstensi", () => {
    const semua = [...halaman.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)"(?: lang="(\w+)")? title="([^"]+)" \/>/g)];
    expect(semua.length).toBe(12);
    const teks: Record<string, string> = { "labs/t4-infra/output/alamat.txt": alamat, "labs/t4-infra/output/state.txt": state, "labs/t4-infra/output/rotasi.txt": rotasi, "labs/t4-infra/output/staging.txt": staging };
    for (const [, file, a, , lang, judul] of semua) {
      expect(fs.existsSync(path.join(akar, file!)), file).toBe(true);
      if (file!.includes("/output/")) {
        expect(lang).toBeUndefined();
        const bag = pecah(teks[file!]!);
        const huruf = Object.keys(bag).find((k) => bag[k]!.awal <= Number(a) && Number(a) <= bag[k]!.akhir)!;
        expect(judul, file).toContain(`Rekaman lab: ${file} (bagian ${huruf}`);
      } else {
        expect(judul).toBe(file);
        expect(lang).toBe(file!.endsWith(".tf") ? "hcl" : "go");
      }
    }
  });
  test("tab stack: slot berurutan, label tab berurutan, dan baris catatan tiap tab menyebut stack-nya", () => {
    const labels: string[] = JSON.parse(halaman.match(/labels=\{(\[[^\]]+\])\}/)![1]!);
    const KUNCI = ["Go", "Node.js", "Laravel", "Django", "Serverpod", "Supabase"];
    labels.forEach((l, k) => expect(l).toContain(KUNCI[k]!));
    const slot = [...halaman.matchAll(/<Fragment slot="t(\d)">\n\n\*([^\n]+)\*/g)];
    expect(slot.length).toBe(6);
    slot.forEach((m, k) => {
      expect(Number(m[1])).toBe(k);
      expect(m[2], `slot ${k}`).toContain(k === 0 ? "lab t4-infra" : KUNCI[k]!);
      expect(m[2]!.startsWith(k === 0 ? "Dijalankan:" : "Tidak dijalankan.")).toBe(true);
    });
  });
  test("rujukan [[ID]]: tiap kemunculan menempel pada kalimatnya dan jumlahnya sama dengan daftar", () => {
    const daftar: [string, string[]][] = [
      ["Prasyarat: [[t4-m34]] · Jalur inti", ["t4-m34"]],
      ["Lompat ke [[berikutnya]].", ["berikutnya"]],
      ["[[t4-m34]] menulis tiga akibat satu pindahan", ["t4-m34"]],
      ["([[t3-dua-instance]], [[t3-adr-33]])", ["t3-dua-instance", "t3-adr-33"]],
      ["di `.env` VPS ([[t1-secret]])", ["t1-secret"]],
      ["Begitu uang publik masuk ([[t4-prd]]), satu mesin", ["t4-prd"]],
      ["dan itu bahan [[t4-m34]], bukan halaman ini", ["t4-m34"]],
      ["tidak dijawab 2xx ([[t4-m30]]).", ["t4-m30"]],
      ["ADR 35 di [[t4-rekonsiliasi]] menulis", ["t4-rekonsiliasi"]],
      ["adalah pekerjaan pipeline di [[t4-tim-infra]].", ["t4-tim-infra"]],
      ["batas waktu pulih atau jendela kehilangan data ([[t4-prd]]).", ["t4-prd"]],
      ["**Kebutuhan.** [[t4-m34]] menunjukkan", ["t4-m34"]],
      ["dan akses data sendiri ([[t4-prd]]). Satu VPS", ["t4-prd"]],
      ["**Yang akan merevisinya.** [[t4-tim-infra]] menjalankan", ["t4-tim-infra"]],
      ["halaman lama [[B11.2]] tidak dibahas di sini, dan [[t4-adr-45]] menyebutnya", ["B11.2", "t4-adr-45"]],
      ["Tidak dijalankan | [[t3-adr-33]] |", ["t3-adr-33"]],
      ["Rekaman hanya dua file contoh | [[t4-tim-infra]] |", ["t4-tim-infra"]],
    ];
    let jumlah = 0;
    for (const [konteks, ids] of daftar) {
      harus(konteks);
      jumlah += ids.length;
    }
    expect(jumlah).toBe((halaman.match(/\[\[[^\]]+\]\]/g) ?? []).length);
  });
  test("tautan: teks dan URL tiap tautan luar sama dengan daftar, dalam urutan halaman", () => {
    const harapan: string[][] = [
 [
  "net/http: ProxyFromEnvironment",
  "https://pkg.go.dev/net/http#ProxyFromEnvironment"
 ],
 [
  "NAT gateways",
  "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html"
 ],
 [
  "sensitive data in state",
  "https://opentofu.org/docs/language/state/sensitive-data/"
 ],
 [
  "ephemerality",
  "https://opentofu.org/docs/language/ephemerality/"
 ],
 [
  "HashiCorp adopts Business Source License",
  "https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license"
 ],
 [
  "dev server",
  "https://openbao.org/docs/concepts/dev-server/"
 ],
 [
  "KV versi 2",
  "https://openbao.org/docs/secrets/kv/kv-v2/"
 ],
 [
  "Node.js v26.13.0: environment variables",
  "https://nodejs.org/api/environment_variables.html"
 ],
 [
  "Laravel 13.x: Configuration",
  "https://laravel.com/docs/13.x/configuration"
 ],
 [
  "Django 6.1: settings",
  "https://docs.djangoproject.com/en/6.1/ref/settings/#secret-key-fallbacks"
 ],
 [
  "Serverpod 4.0.0: configuration",
  "https://docs.serverpod.dev/concepts/server-fundamentals/configuration"
 ],
 [
  "Supabase: Vault",
  "https://supabase.com/docs/guides/database/vault"
 ],
 [
  "laporan insiden",
  "https://circleci.com/blog/jan-4-2023-incident-report/"
 ],
 [
  "OpenTofu: sensitive data in state",
  "https://opentofu.org/docs/language/state/sensitive-data/"
 ],
 [
  "OpenTofu: ephemerality",
  "https://opentofu.org/docs/language/ephemerality/"
 ],
 [
  "OpenBao: dev server",
  "https://openbao.org/docs/concepts/dev-server/"
 ],
 [
  "OpenBao: KV versi 2",
  "https://openbao.org/docs/secrets/kv/kv-v2/"
 ],
 [
  "Go: net/http, ProxyFromEnvironment",
  "https://pkg.go.dev/net/http#ProxyFromEnvironment"
 ],
 [
  "Amazon VPC: NAT gateways",
  "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html"
 ],
 [
  "HashiCorp: adopts Business Source License",
  "https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license"
 ],
 [
  "CircleCI: laporan insiden 4 Januari 2023",
  "https://circleci.com/blog/jan-4-2023-incident-report/"
 ],
 [
  "Django 6.1: SECRET_KEY_FALLBACKS",
  "https://docs.djangoproject.com/en/6.1/ref/settings/#secret-key-fallbacks"
 ]
];
    const ada = [...halaman.matchAll(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g)].map((m) => [m[1]!, m[2]!]);
    expect(ada).toEqual(harapan);
  });
  test("daftar bernomor berurutan dari 1 dan tidak ada yang terlewat", () => {
    const baris = halaman.split("\n");
    const daftar: number[][] = [];
    let kini: number[] = [];
    for (const b of baris) {
      const m = b.match(/^(\d+)\. /);
      if (m) kini.push(Number(m[1]));
      else if (kini.length && b.trim() !== "" && !/^\s/.test(b)) { daftar.push(kini); kini = []; }
    }
    if (kini.length) daftar.push(kini);
    expect(daftar).toEqual([[1, 2, 3], [1, 2, 3, 4, 5, 6], [1, 2, 3]]);
  });
  test("tabel ADR dan tabel Sengaja belum: tiap baris ada utuh dan urutan barisnya sama", () => {
    const adrBaris: string[] = [
 "|---|---|---|---|---|",
 "| Cara kerja | Data, file, dan secret di satu mesin. Nilai secret di `.env` mesin itu | Dua mesin, PostgreSQL direplikasi sendiri | Data, file, dan secret di layanan terkelola. Mesin dibuat dari IaC. Alamat keluar lewat proxy atau NAT | OpenBao atau Vault dijalankan di VPS yang sama atau kedua |",
 "| Kelebihan | Tidak ada pekerjaan baru. Dijaga ADR 11 | Menutup titik gagal tunggal data | Data, file, dan secret tidak mati bersama satu mesin. Rotasi tanpa deploy | Rotasi tanpa deploy, dan kontrol penuh atas alatnya |",
 "| Kekurangan | M34 dan uang publik. `.env` hilang atau terbaca pihak lain bersama mesin | Operasi replikasi dan failover milik tim sendiri, dan ADR 33 menundanya | App tetap berhenti saat mesin diganti. Biaya layanan belum dihitung | Secret manager ikut menjadi titik gagal. Mode dev hanya untuk lab |",
 "| Biaya operasional | Nol, sampai pindahan atau kebocoran | Dua mesin, replikasi, dan giliran jaga | Satu repo IaC, satu proxy atau NAT, dan akun cloud PT | Penyimpanan yang bertahan, unseal, dan token per service |",
 "| Bukti | Rekaman `alamat.txt` A dan `state.txt` A | Tidak dijalankan: dibaca dari naskah | Rekaman `alamat.txt` B, `state.txt` B, `rotasi.txt` C. Layanan terkelola Tidak dijalankan | Rekaman `rotasi.txt` A dan E atas mode dev. Produksi Tidak dijalankan |"
];
    const sengaja: string[] = [
 "| Yang ditunda | Kenapa ditunda | Muncul lagi di |",
 "|---|---|---|",
 "| VPS kedua dan failover | PRD v4 belum menulis batas waktu pulih atau jendela kehilangan data. Tidak dijalankan | [[t3-adr-33]] |",
 "| Batas umur pembacaan secret dan alert atas kegagalan beruntun | Lab memilih memakai pembacaan terakhir. Belum diputuskan | Belum dijadwalkan |",
 "| Instance atau akun terpisah untuk staging dan produksi | Lab memakai satu instance dengan dua kebijakan. Tidak dijalankan | Belum dijadwalkan |",
 "| Enkripsi state dan plan, backend state jarak jauh | State lab adalah file lokal. Tidak dijalankan | Belum dijadwalkan |",
 "| Proxy kedua dan HTTPS lewat proxy | Matinya proxy tidak direkam, dan CONNECT dijawab 501. Tidak dijalankan | Belum dijadwalkan |",
 "| Pemindai atas seluruh konfigurasi, state IaC, dan riwayat git | Rekaman hanya dua file contoh | [[t4-tim-infra]] |"
];
    const adrTabel = halaman.split("| | A. Satu VPS dan `.env` |")[1]!.split("\n\n")[0]!.split("\n").filter((b) => b.startsWith("|"));
    expect(adrTabel).toEqual(adrBaris);
    expect(halaman.split("### Sengaja belum dilakukan\n\n")[1]!.split("\n\n")[0]!.split("\n")).toEqual(sengaja);
    const tabelState = halaman.split("| Bagian | Cara di konfigurasi | State memuat nilainya | Penanda sensitif di state |\n")[1]!.split("\n\n")[0]!.split("\n");
    expect(tabelState.length).toBe(4);
    expect(halaman.split("**Keputusan: opsi C.** Enam aturan:")[1]!.split("**Kenapa C")[0]!.match(/^\d\. /gm)!.join("")).toBe("1. 2. 3. 4. 5. 6. ");
  });
  test("Rantai, pilah, dan halaman istilah: nilai berfakta dan struktur sama dengan yang diturunkan", () => {
    expect(rantai).toEqual({
 "id": "t4-infra-secret-inti",
 "judul": "Alamat keluar dan state OpenTofu sesudah pindahan",
 "sumber": {
  "jenis": "rekaman",
  "teks": "Rekaman lab t4-infra, alamat.txt bagian A dan B, state.txt bagian A dan B"
 },
 "baris": [
  {
   "label": "Alamat keluar",
   "sub": "host baru",
   "simpul": [
    {
     "teks": "tanpa proxy: ditolak 403",
     "sub": "15 penolakan, 3 pengajuan gagal",
     "nada": "warn"
    },
    {
     "teks": "dengan proxy: lulus",
     "sub": "3 lulus, 0 ditolak",
     "nada": "good"
    }
   ]
  },
  {
   "label": "State OpenTofu",
   "sub": "tofu apply",
   "simpul": [
    {
     "teks": "konfigurasi: ada di state",
     "sub": "nilai dari password dan variabel",
     "nada": "warn"
    },
    {
     "teks": "OpenBao: tak ada di state",
     "sub": "konfigurasi hanya alamat dan path",
     "nada": "good"
    }
   ]
  }
 ],
 "catatan": "Vendor adalah layanan verifikasi tiruan lokal, dan proxy keluar adalah container lab. Bagian state memakai provider random dan local, bukan provider cloud."
});
    expect(pilah.judul).toBe("Pindah ke layanan terkelola atau tetap di mesin VPS?");
    expect(pilah.penutup).toBe("Tiga yang pindah adalah penyimpanan: data, file, dan secret. Tiga yang tetap adalah yang menjalankan kode. Satu mesin berhenti masih menghentikan app, dan itulah yang ditunda ADR 33.");
    expect(pilah.item.map((i) => i.teks)).toEqual([
 "Proses app: API monolith dan service pembayaran.",
 "Data PostgreSQL: tabel akun, jurnal, dan outbox.",
 "File identitas: foto kartu dan swafoto.",
 "Kode yang membaca secret saat berjalan.",
 "Nilai secret: kunci gateway dan rahasia webhook.",
 "Worker yang memanggil layanan verifikasi di luar."
]);
    expect(pilah.item.map((i) => i.kenapa)).toEqual([
 "Hosting terkelola menjawab sebagian titik gagal tunggal ADR 26: data, file, dan secret, bukan ketersediaan app. Mesin pengganti dibuat dari file IaC, tetapi app berhenti selama mesin diganti, dan VPS kedua tetap ditunda ADR 33 (Tidak dijalankan: lab memakai tiruan di Compose).",
 "Data tidak lagi mati bersama satu VPS. Backup pg_dump harian punya jendela kehilangan data sampai 24 jam. Jendela di layanan terkelola menurut penyedia belum diketahui [perlu verifikasi: penyedia dipilih saat halaman ditulis], dan failover Tidak dijalankan.",
 "File pindah ke penyimpanan objek, dan database hanya menyimpan kunci objek dan checksum (ADR 38). Penyimpanan objek terkelola Tidak dijalankan: lab memakai tiruan di Compose.",
 "Service membaca nilainya sendiri dengan token baca-saja. Di rotasi.txt bagian B service hanya diberi token, tanpa rahasia lewat flag atau file. Yang pindah adalah nilainya, bukan kode pembacanya, dan bukan OpenTofu yang membaca.",
 "Nilai pindah ke secret manager (lab: OpenBao mode dev). Operator menulis versi baru, service membacanya tanpa deploy, dan state OpenTofu tidak memuat nilainya (state.txt bagian B, rotasi.txt bagian C). Secret manager milik penyedia Tidak dijalankan.",
 "Worker tetap bagian app. Yang berubah hanya jalan keluarnya: host baru memakai HTTP_PROXY yang sama, dan vendor hanya melihat alamat proxy (alamat.txt bagian B). Proxy keluar itu sendiri titik gagal tunggal baru, dan matinya tidak direkam."
]);
    const ist = { "secret-manager": istSecret, iac: istIac, "proxy-keluar": istProxy } as Record<string, Record<string, unknown>>;
    const harapanIst = {
 "secret-manager": {
  "istilah": "Secret manager",
  "sehari_hari": "Secret manager adalah layanan yang menyimpan secret, seperti kunci gateway dan password database, di luar kode dan di luar file konfigurasi. Aplikasi membacanya lewat API dengan token, tepat saat ia membutuhkannya.",
  "cerita": [
   {
    "rujukan": "t4-infra-secret",
    "teks": "Service pembayaran hanya diberi token baca-saja. Rahasia webhook dibaca dari OpenBao saat service berjalan. Sesudah operator menulis versi baru, service membacanya tanpa deploy (`rotasi.txt` bagian B dan C)."
   }
  ],
  "mekanisme": [
   "Operator menulis secret ke secret manager. Nilainya tidak lewat repo, file konfigurasi, atau state IaC.",
   "Service diberi token yang hanya boleh membaca path secret miliknya. Token tidak bisa menulis atau menghapus.",
   "Service membaca dokumen secret saat berjalan dan mengulang pembacaan berkala. Saat rotasi, dokumen memuat nilai sekarang dan nilai lama.",
   "Bila pembacaan gagal, service memilih: memakai pembacaan terakhir, atau berhenti. Lab memilih yang pertama dan menghitung kegagalannya."
  ],
  "stack": null,
  "jebakan": [
   "Mengira menulis versi baru sudah mencabut versi lama. Di OpenBao mesin KV versi 2, versi lama tetap terbaca sampai di-destroy (`rotasi.txt` bagian C).",
   "Memakai mode dev di luar lab. Mode dev menyimpan data di memori dan kehilangan data dan token saat restart (`rotasi.txt` bagian A)."
  ],
  "terkait": [
   "IaC (infrastructure as code)",
   "Proxy keluar (egress proxy)",
   "Staging"
  ],
  "sumber": [
   {
    "riset": "R4-191",
    "judul": "OpenBao: dev server (dibuka 2026-10-30)",
    "url": "https://openbao.org/docs/concepts/dev-server/",
    "catatan": "Mode dev menyimpan data terenkripsi di memori, kehilangan data di tiap restart, dan tidak untuk produksi. Mesin KV versi 2 terpasang di secret/."
   },
   {
    "riset": "R4-191",
    "judul": "OpenBao: KV versi 2 (dibuka 2026-10-30)",
    "url": "https://openbao.org/docs/secrets/kv/kv-v2/",
    "catatan": "Menulis versi baru membiarkan versi sebelumnya terbaca. Perintah destroy menghapus data versi itu."
   },
   {
    "judul": "Rekaman lab t4-infra: rotasi.txt bagian A sampai E",
    "rekaman": "labs/t4-infra/output/rotasi.txt",
    "catatan": "Service membaca secret saat runtime dengan token baca-saja. Rotasi dengan masa tumpang tindih terbaca tanpa deploy, dan versi lama terbaca sampai di-destroy."
   }
  ]
 },
 "iac": {
  "istilah": "IaC (infrastructure as code)",
  "sehari_hari": "IaC berarti infrastruktur, seperti mesin, database, dan alamat jaringan, ditulis sebagai file konfigurasi yang disimpan dan di-review seperti kode. Alatnya membaca file itu lalu membuat atau mengubah infrastrukturnya.",
  "cerita": [
   {
    "rujukan": "t4-infra-secret",
    "teks": "Rekeningo memakai OpenTofu. Alat itu menyimpan catatan resource yang sudah dibuatnya di file state. Di lab, secret yang ditulis di konfigurasi ikut tersimpan di state, walau keluaran CLI menulis `(sensitive value)` (`state.txt` bagian A)."
   }
  ],
  "mekanisme": [
   "Kamu menulis konfigurasi yang menyebut resource apa yang harus ada.",
   "Alat IaC membandingkan konfigurasi dengan state, yaitu catatan resource yang sudah dibuatnya, lalu membuat rencana perubahan.",
   "Setelah rencana disetujui, alat itu menjalankannya lewat provider, yaitu plugin yang bicara dengan satu jenis layanan.",
   "State menyimpan atribut resource sebagai teks. Nilai yang melewati resource atau data source ikut tersimpan di sana, jadi state diperlakukan sebagai data sensitif."
  ],
  "stack": null,
  "jebakan": [
   "Mengira tanda sensitif mencegah nilai masuk state. Tanda itu hanya menyembunyikan nilai dari keluaran CLI (`state.txt` bagian A).",
   "Mengira membaca secret lewat data source menjaga state bersih. Data source juga menyimpan atribut yang dibacanya (`state.txt` bagian C, provider local)."
  ],
  "terkait": [
   "Secret manager",
   "Staging",
   "ADR (Architecture Decision Record)"
  ],
  "sumber": [
   {
    "riset": "R4-191",
    "judul": "OpenTofu: sensitive data in state (dibuka 2026-10-30)",
    "url": "https://opentofu.org/docs/language/state/sensitive-data/",
    "catatan": "State lokal adalah file JSON teks biasa dan bisa memuat password awal. Dokumentasi menyuruh state diperlakukan sebagai data sensitif."
   },
   {
    "riset": "R4-190",
    "judul": "OpenTofu: lisensi MPL-2.0 dan rilis v1.13.2 (dibuka 2026-10-30)",
    "url": "https://github.com/opentofu/opentofu/releases/tag/v1.13.2",
    "catatan": "Rilis stabil terbaru pada 2026-10-30, terbit 2026-10-21."
   },
   {
    "judul": "Rekaman lab t4-infra: state.txt bagian A sampai C",
    "rekaman": "labs/t4-infra/output/state.txt",
    "catatan": "Nilai dari random_password, variabel, dan data source local ada di state. Konfigurasi yang hanya menulis alamat dan path tidak memuat nilainya."
   }
  ]
 },
 "proxy-keluar": {
  "istilah": "Proxy keluar (egress proxy)",
  "sehari_hari": "Proxy keluar adalah program perantara yang diberi alamat tetap. Aplikasi mengirim panggilan ke vendor lewat proxy itu, jadi vendor selalu melihat alamat proxy, bukan alamat mesin aplikasi.",
  "cerita": [
   {
    "rujukan": "t4-infra-secret",
    "teks": "Vendor tiruan hanya menerima alamat yang terdaftar. Tanpa proxy, host baru ditolak 403 sebanyak 15 kali untuk tiga pekerjaan. Dengan proxy yang didaftarkan sekali, host baru lulus tanpa penolakan (`alamat.txt` bagian A dan B)."
   }
  ],
  "mekanisme": [
   "Vendor menyimpan allowlist, yaitu daftar alamat sumber yang boleh memanggilnya, dan menolak alamat lain.",
   "Operator mendaftarkan alamat proxy keluar ke vendor satu kali.",
   "Aplikasi diberi variabel lingkungan HTTP_PROXY. Client HTTP Go membacanya, jadi kode aplikasi tidak berubah.",
   "Saat aplikasi pindah host, vendor tetap melihat alamat proxy. Proxy itu sendiri menjadi titik gagal tunggal baru."
  ],
  "stack": null,
  "jebakan": [
   "Memercayai header X-Forwarded-For untuk menentukan alamat sumber. Header itu diisi client. Vendor tiruan lab memeriksa alamat peer TCP.",
   "Mengira proxy menyelesaikan semuanya. Alamat proxy hanya tetap selama proxy itu tidak dipindah, dan matinya proxy tidak direkam di lab."
  ],
  "terkait": [
   "Proxy",
   "Reverse proxy",
   "Secret manager"
  ],
  "sumber": [
   {
    "riset": "R4-192",
    "judul": "Go: net/http, ProxyFromEnvironment (Go 1.27.3, dibuka 2026-10-30)",
    "url": "https://pkg.go.dev/net/http#ProxyFromEnvironment",
    "catatan": "Client memakai proxy dari HTTP_PROXY, HTTPS_PROXY, dan NO_PROXY. Permintaan ke host localhost dikecualikan."
   },
   {
    "riset": "R4-192",
    "judul": "Amazon VPC: NAT gateways (dibuka 2026-10-30)",
    "url": "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html",
    "catatan": "NAT gateway publik wajib punya Elastic IP, dan internet gateway memetakan alamat privat NAT gateway ke alamat itu."
   },
   {
    "judul": "Rekaman lab t4-infra: alamat.txt bagian A dan B",
    "rekaman": "labs/t4-infra/output/alamat.txt",
    "catatan": "Pindah host tanpa proxy dijawab 403, dan dengan proxy terdaftar sekali vendor hanya melihat alamat proxy."
   }
  ]
 }
} as Record<string, unknown>;
    for (const slug of Object.keys(harapanIst)) {
      const h = ist[slug]!;
      expect(h, slug).toEqual(harapanIst[slug]);
    }
    expect(istProxy.cerita![0]!.teks).toContain(`403 sebanyak ${tolakA} kali untuk ${BILANGAN[pekerjaanA]} pekerjaan`);
    expect(istIac.cerita![0]!.teks).toContain("`state.txt` bagian A");
  });
});

describe("kunci kalimat dan sidik kata penentu (lapis 2 dan penutup mutasi tanpa kunci)", () => {
  const tekstual = (x: unknown, keluar: string[] = []): string[] => {
    if (typeof x === "string") keluar.push(x);
    else if (Array.isArray(x)) for (const y of x) tekstual(y, keluar);
    else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) { keluar.push(`#${k}`); tekstual(y, keluar); }
    return keluar;
  };
  const sidik = (teks: string, kunci: string[]): Record<string, number> =>
    Object.fromEntries(kunci.map((k) => [k, (teks.toLowerCase().match(new RegExp(`(?<![\\w-])${k}(?![\\w-])`, "g")) ?? []).length]));
  const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "satu", "dua", "tiga", "lima", "enam", "bila", "karena"];
  const sekarang = {
    halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
    json: { rantai: tekstual(rantai), pilah: tekstual(pilah), secretManager: tekstual(istSecret), iac: tekstual(istIac), proxyKeluar: tekstual(istProxy) },
  };
  const sidikHalaman = sidik(halaman, KATA);
  const sidikJson = Object.fromEntries(Object.entries(sekarang.json).map(([k, v]) => [k, sidik(v.join("\n"), KATA)]));
  const jumlahLabel = {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length,
    tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length,
    asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length,
    perluVerifikasi: (halaman.match(/\[perlu verifikasi/g) ?? []).length,
  };
  if (process.env.PERBARUI_KUNCI === "1") {
    const isi = `// Dihasilkan dari berkas saat ini oleh PERBARUI_KUNCI=1 (lihat secret-iac-alamat-keluar.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\nexport const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\nexport const KUNCI_JSON = ${JSON.stringify(sekarang.json, null, 1)};\nexport const SIDIK_HALAMAN: Record<string, number> = ${JSON.stringify(sidikHalaman)};\nexport const SIDIK_JSON: Record<string, Record<string, number>> = ${JSON.stringify(sidikJson)};\nexport const JUMLAH_LABEL: Record<string, number> = ${JSON.stringify(jumlahLabel)};\n`;
    fs.writeFileSync(path.join(__dirname, "secret-iac-alamat-keluar.halaman.nilai.ts"), isi);
  }
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string Rantai, pilah, dan halaman istilah sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman dan data (kunci agregat, bukan turunan)", () => {
    expect(sidikHalaman).toEqual(SIDIK_HALAMAN);
    expect(sidikJson).toEqual(SIDIK_JSON);
  });
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi, Ilustrasi, Hitungan, dan Tidak dijalankan tidak naik menjadi Rekaman lab", () => {
    expect(jumlahLabel).toEqual(JUMLAH_LABEL);
    expect(jumlahLabel.perluVerifikasi).toBeGreaterThanOrEqual(3);
  });
  test("frontmatter dan deskripsi", () => {
    expect(halaman.startsWith('---\ntitle: "4.17 Secret manager, IaC, alamat keluar tetap + ADR 39"\n')).toBe(true);
    expect(halaman).toContain('description: "Pindahan membawa tiga hal yang tidak tertulis di kode: alamat keluar, secret, dan state IaC. ADR 39 memindahkan data, file, dan secret ke layanan terkelola, menulis cara menjaga ketiganya, dan menulis kapan pilihan itu salah."');
  });
});
