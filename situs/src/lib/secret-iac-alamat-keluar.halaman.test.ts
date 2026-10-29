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
    expect(nomor[i - 1]).toBe(174);
    expect(nomor[i + 5]).toBe(300);
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
