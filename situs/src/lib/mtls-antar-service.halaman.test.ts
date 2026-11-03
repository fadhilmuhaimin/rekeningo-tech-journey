// Penjaga halaman 5.19 (keputusan 1572 sampai 1574): angka, status, nomor ADR, tautan, label sumber, rentang Snippet, klaim universal dan
// negatif, tabel izin dan tabel ADR 53, tab Di stack lain, diagram Rantai t5-mtls-inti.json, tebakan t5-mtls-tebak.json, widget banding
// t5-mtls-banding.json, kartu Cek diri, halaman istilah mTLS dan SAN, dan baris riset R5-200 sampai R5-204 di mtls-antar-service.mdx. Nilai
// diturunkan dari rekaman labs/t5-service/output (mtls.txt, rentan.txt, idempoten.txt, testing.txt) dan rekaman Tahap 4 labs/t4-modul/output/
// ledger.txt, kode labs/api-t5 (internal/identitas, cmd/ledger, cmd/panggil, internal/handler/ledger_layanan.go), README lab, naskah Tahap 5
// (baris ADR 53, M47, dan pemicu service mesh), halaman tetangga (5.18, 5.30, 4.13), registry, dan baris riset, bukan dari daftar yang
// ditulis sendiri. Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya, ditambah paragraf utuh dan JSON utuh yang
// ditulis di tes ini; (2) kata-kata halaman, JSON, dan kartu dikunci per baris di mtls-antar-service.halaman.nilai.ts. Lapis 2 bisa dimatikan
// (TANPA_KUNCI=1, TANPA_SIDIK=1) untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks sengaja diubah: PERBARUI_KUNCI=1 vitest run
// src/lib/mtls-antar-service.halaman.test.ts. Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Sumber luar (RFC, dokumentasi Go,
// cert-manager, SPIFFE, SPIRE, Node.js, Laravel, Guzzle, Django, Serverpod, Supabase) tidak dibuka tes: kutipannya dikunci di baris riset,
// dan baris riset dikunci terhadap kalimat halaman. Baris riset tetangga tidak dikunci: hanya R5-200 sampai R5-204 yang diperiksa.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-mtls-inti.json";
import tebakMentah from "../../data/widget/t5-mtls-tebak.json";
import registry from "../../data/cerita.json";
import istilahMtls from "../../data/halaman-istilah/mtls.json";
import istilahSan from "../../data/halaman-istilah/san.json";
import { DataRantai } from "./rantai";
import { DataTebak } from "../widgets/tebak/skema";
import { daftarBlok, cekTemplat } from "./blok";
import { HalamanIstilah } from "./istilah";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./mtls-antar-service.halaman.nilai";

const akar = path.resolve(__dirname, "../../..");
const terlacak: Set<string> | null = (() => {
  try {
    return new Set(execSync("git ls-files", { cwd: akar, maxBuffer: 1 << 26 }).toString().split("\n"));
  } catch {
    return null;
  }
})();
const baca = (rel: string): string => {
  // berkas baru milik PR ini belum terlacak sebelum commit; sesudahnya semua berkas yang dibaca harus terlacak
  if (terlacak && process.env.CI) expect(terlacak.has(rel), `tes membaca berkas yang tidak terlacak git: ${rel}`).toBe(true);
  expect(fs.existsSync(path.join(akar, rel)), `berkas tidak ada: ${rel}`).toBe(true);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};

const HALAMAN = "situs/src/content/docs/tahap-5/mtls-antar-service.mdx";
const TANGGAL = "2026-11-04";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const mtlsTeks = baca("labs/t5-service/output/mtls.txt");
const mtls = mtlsTeks.split("\n");
const rentan = baca("labs/t5-service/output/rentan.txt").split("\n");
const idem = baca("labs/t5-service/output/idempoten.txt").split("\n");
const testingTeks = baca("labs/t5-service/output/testing.txt");
const ledgerT4 = baca("labs/t4-modul/output/ledger.txt");
const kodeIdentTeks = baca("labs/api-t5/internal/identitas/identitas.go");
const kodeIdent = kodeIdentTeks.split("\n");
const kodeMainTeks = baca("labs/api-t5/cmd/ledger/main.go");
const kodeMain = kodeMainTeks.split("\n");
const kodeRute = baca("labs/api-t5/cmd/ledger/rute_test.go");
const kodePanggil = baca("labs/api-t5/cmd/panggil/main.go");
const kodeHandler = baca("labs/api-t5/internal/handler/ledger_layanan.go");
const kodeTesIdent = baca("labs/api-t5/internal/identitas/identitas_test.go");
const kodeTesLedger = baca("labs/api-t5/cmd/ledger/ledger_test.go");
const readmeLab = baca("labs/t5-service/README.md");
const kodePki = baca("labs/api-t5/internal/pki/pki.go");
const m47 = baca("situs/src/content/docs/tahap-5/m47-pod-membuat-jurnal.mdx");
const adr60 = baca("situs/src/content/docs/tahap-5/sengaja-belum.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const bandingMentah = JSON.parse(baca("situs/lama/widgets/data/t5-mtls-banding.json")) as Banding;
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const banding = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/banding.js")) as { cekData: (d: Banding) => string[] };

interface Simpul { id: string; label: string; sub?: string }
interface Banding {
  judul: string;
  opsi: { id: string; nama: string; baris: Simpul[][]; judulBaris?: string[] }[];
  fitur: { label: string; sorot: Record<string, string[]>; catatan: Record<string, string>; nada?: Record<string, string> }[];
}
interface H { id: string; judul: string; label?: string; masalah?: string; pendek?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string; adr?: number[] }
const hal = registry.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const cari = (pola: RegExp, teks: string, nama: string): RegExpMatchArray => {
  const m = teks.match(pola);
  if (!m) throw new Error(`sumber: ${nama} tidak ditemukan`);
  return m;
};
const pecahBaris = (b: string): string[] => b.replace(/\\\|/g, "¦").split("|").slice(1, -1).map((x) => x.trim());
const barisRiset = (id: string): string => riset5.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
const angkaId = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const rp = (n: number): string => `Rp${angkaId(n)}`;
const jumlah = (teks: string, k: string): number => teks.split(k).length - 1;
const harus = (kalimat: string): void => {
  expect(jumlah(badan, kalimat), `kalimat harus tepat satu kali: ${kalimat}`).toBe(1);
};
const garis = (rek: string[], pola: RegExp, dari0 = 0): number => {
  const i = rek.findIndex((b, k) => k >= dari0 && pola.test(b));
  if (i < 0) throw new Error(`rekaman: ${pola} tidak ditemukan`);
  return i;
};
/** Rentang 1-based fungsi atau deklarasi di kode Go: dari baris berawalan sampai baris "}" pertama di kolom 0. */
const rentangGo = (baris: string[], awalan: string): [number, number] => {
  const a = baris.findIndex((b) => b.startsWith(awalan));
  if (a < 0) throw new Error(`kode: ${awalan} tidak ditemukan`);
  const z = baris.findIndex((b, i) => i > a && b === "}");
  return [a + 1, z + 1];
};
const wilayah = (baris: string[], nama: string): string[] => {
  const a = baris.findIndex((b) => b.includes(`--8<-- [start:${nama}]`));
  const z = baris.findIndex((b) => b.includes(`--8<-- [end:${nama}]`));
  if (a < 0 || z <= a) throw new Error(`wilayah ${nama} tidak ada`);
  return baris.slice(a + 1, z);
};

// --- naskah: baris ADR 53 (kolom: nomor, keputusan, opsi, kapan salah, sumber), baris pemicu service mesh, dan baris peta halaman
const barisAdr53 = naskah.split("\n").find((b) => b.startsWith("| 53 | Panggilan antar service memakai mTLS")) ?? "";
const kolomAdr53 = pecahBaris(barisAdr53);
const barisMesh = naskah.split("\n").find((b) => b.startsWith("| 2. Service mesh |")) ?? "";
const kolomMesh = pecahBaris(barisMesh);
const izinNaskah: Record<string, string[]> = {};
for (const m of kolomAdr53[1]!.matchAll(/`(pembayaran|cicilan|merchant)` \(([^)]+)\)/g)) izinNaskah[m[1]!] = m[2]!.split(", ");

// --- rekaman mtls.txt
const nA = garis(mtls, /^# --- A\./);
const nB = garis(mtls, /^# --- B\./);
const nC = garis(mtls, /^# --- C\./);
const nD = garis(mtls, /^# --- D\./);
const nE = garis(mtls, /^# --- E\./);
const alertB = mtls.slice(nB, nC).filter((b) => /^sonde: alert dari server: /.test(b)).map((b) => b.replace("sonde: alert dari server: tls: ", ""));
const logB = mtls.slice(nB, nC).filter((b) => b.startsWith("handshake ditolak dari"));
const kontrolB = cari(/^sonde: (.+)$/, mtls[garis(mtls, /^\$ panggil -sonde -cert pembayaran/, nB) + 1]!, "kontrol positif")[1]!;
const jurnalSebelum = Number(mtls[garis(mtls, /^ jurnal_sebelum$/, nA) + 2]!.trim());
const jurnalSesudah = Number(mtls[garis(mtls, /^ jurnal_sesudah$/, nB) + 2]!.trim());
const statusC = mtls.slice(nC, nD).filter((b) => b.startsWith("status ")).map((b) => cari(/^status (\d+) (.*)$/, b, "status C"));
const statusD = mtls.slice(nD, nE).filter((b) => b.startsWith("status ")).map((b) => cari(/^status (\d+) (.*)$/, b, "status D"));
const jurnalUjiD = Number(mtls[garis(mtls, /^ jurnal_berjenis_topup_bank_atas_nama_akun_uji$/, nD) + 2]!.trim());
const sertA = mtls.slice(nA, nB).filter((b) => /^\S+\s+CN=/.test(b));
const barisHealthz = mtls[garis(mtls, /^\$ panggil -url https:\/\/127\.0\.0\.1:<port>\/healthz -cert pembayaran /, nA)]!;
// --- rekaman rentan.txt dan idempoten.txt
const rA = garis(rentan, /^# --- A\./);
const rB = garis(rentan, /^# --- B\./);
const statusRentanA = cari(/^status (\d+) /, rentan[garis(rentan, /^\$ panggil dari pod uji/, rA) + 1]!, "status rentan A")[1]!;
const saldoRentan = Number(rentan[garis(rentan, /^ nama\s+\| saldo$/, rA) + 2]!.split("|")[1]!.trim());
const sebelumRentan = Number(rentan[garis(rentan, /^ jurnal_sebelum$/, rA) + 2]!.trim());
const alertRentanB = cari(/^sonde: alert dari server: tls: (.+)$/, rentan[garis(rentan, /^sonde: /, rB)]!, "alert rentan B")[1]!;
const iA = garis(idem, /^# --- A\./);
const iC = garis(idem, /^# --- C\./);
const statusIdemA = idem.slice(iA, garis(idem, /^# --- B\./)).filter((b) => b.startsWith("status ")).map((b) => cari(/^status (\d+) /, b, "status idem A")[1]!);
const statusIdemC = idem.slice(iC).filter((b) => b.startsWith("status ")).map((b) => cari(/^status (\d+) /, b, "status idem C")[1]!);
const barisJumlahC = idem[garis(idem, /^ jurnal_topup_bank \| total_kredit$/, iC) + 2]!.split("|").map((x) => x.trim());
// --- kode: rentang fungsi dan wilayah
const [namaA, namaZ] = rentangGo(kodeIdent, "func Nama(");
const [izinA, izinZ] = rentangGo(kodeIdent, "var IzinNaskah = Izin{");
const [wajibA, wajibZ] = rentangGo(kodeIdent, "func Wajib(");
const wilayahServer = wilayah(kodeIdent, "server-tls").join("\n");
const wilayahRute = wilayah(kodeMain, "rute-identitas");
const kodeIzinGo: Record<string, string[]> = {};
for (const m of kodeIdent.slice(izinA, izinZ).join("\n").matchAll(/"(\w+)":\s*\{([^}]*)\}/g)) kodeIzinGo[m[1]!] = [...m[2]!.matchAll(/"(\w+)"/g)].map((x) => x[1]!);
const mulaiRute = kodeMain.findIndex((b) => b.startsWith("func rute(")) + 1;
const blokRentanA = kodeMain.findIndex((b, i) => i >= mulaiRute && b === "\tif rentan {");
const blokRentanZ = kodeMain.findIndex((b, i) => i > blokRentanA && b === "\t}");

describe("naskah, registry, dan halaman tetangga", () => {
  test("registry: halaman 5.19 jenis konsep, ada, ADR 53, prasyarat t5-m47, lab t5-service, peran dari naskah, menit = baca + coba, judul dari naskah", () => {
    const h = dari("t5-mtls");
    expect(h.nomor).toBe("5.19");
    expect(h.jenis).toBe("konsep");
    expect(h.ada).toBe(true);
    expect(h.inti).toBe(true);
    expect(h.adr).toEqual([53]);
    expect(h.prasyarat).toEqual(["t5-m47"]);
    expect(h.lab).toEqual(["t5-service"]);
    expect(h.peran).toEqual(["security", "backend"]);
    expect(h.path).toBe("tahap-5/mtls-antar-service.md");
    expect(h.pendek).toBe("mTLS antar service");
    expect(h.masalah).toBe("Idempotency-Key mencegah pemrosesan ganda, bukan pemanggil yang tidak berhak: identitas service lewat mTLS dan daftar jenis jurnal");
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>/, halaman, "meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect([meta[1], meta[2]]).toEqual(["22", "4"]); // pembagian baca dan coba: perkiraan penulis, jumlahnya dijaga registry
    expect(meta[3]).toBe("[[t5-m47]]");
    expect(frontmatter).toContain(`title: "5.19 ${h.judul}"`);
    expect(naskah).toContain(`| 5.19 | 4 | ${h.judul} | Keamanan + ADR | ★ | t5-service | banding |`);
    expect(frontmatter).toContain("description: Ledger membaca identitas pemanggil dari sertifikat yang lolos verifikasi dan mencocokkannya dengan daftar jenis jurnal per identitas. ADR 53 menimbang empat cara lain dan menulis kapan pilihan ini salah.");
    expect(naskah).toContain("- **Security** 5.18, 5.19, 5.24, 5.25, 5.26.");
  });
  test("halaman tetangga: 5.18 ada dan menaut ke 5.19, 5.30 menaut ke 5.19 dengan satuan tujuan kritis, 4.29, 5.13, 4.13, 2.14, 5.2", () => {
    expect(dari("t5-m47").nomor).toBe("5.18");
    expect(dari("t5-m47").ada).toBe(true);
    expect(m47).toContain("[[t5-mtls]]");
    expect(dari("t5-adr-60").nomor).toBe("5.30");
    expect(dari("t5-adr-60").ada).toBe(true);
    expect(adr60).toContain("| 1. Service mesh penuh | Lebih dari satu tujuan kritis butuh identitas yang sama | Daftar tujuan panggilan antar service dan identitas tiap panggilan | Satu tujuan kritis, yaitu ledger, dipanggil tiga service ([[t5-mtls]]) | Belum terpenuhi |");
    expect(adr60).toContain("| 2. Service mesh | Lebih dari satu jalur antar service butuh TLS timbal balik dan retry seragam | 1 jalur | Ledger dipanggil dari tiga service: terpenuhi untuk TLS timbal balik, dikerjakan di Go tanpa mesh | [[t5-mtls]] |");
    expect(dari("t4-adr-45").nomor).toBe("4.29");
    expect(dari("t5-service").nomor).toBe("5.13");
    expect(dari("t4-modul").nomor).toBe("4.13");
    expect(dari("t4-modul").adr).toEqual([37]);
    expect(dari("t2-idempotency").nomor).toBe("2.14");
    expect(dari("t5-fitur-teknis").nomor).toBe("5.2");
  });
  test("naskah: baris ADR 53 dan pemicu service mesh: tiga pemanggil, mTLS di Go, cert-manager v1.21.3, SPIFFE/SPIRE v1.15.5, tim platform 4 orang, kunci bersama tidak disebut", () => {
    expect(kolomAdr53).toHaveLength(5);
    expect(kolomAdr53[0]).toBe("53");
    expect(kolomAdr53[1]).toContain("`tls.Config` dengan `ClientAuth` bernilai `RequireAndVerifyClientCert`");
    expect(kolomAdr53[1]).toContain("(cert-manager v1.21.3)");
    expect(kolomAdr53[1]).toContain("Identitas service dibaca dari SAN sertifikat.");
    expect(kolomAdr53[1]).toContain("`notifikasi` dan `akun` tidak boleh membuat jurnal.");
    expect(kolomAdr53[1]).toContain("NetworkPolicy membatasi pod yang boleh menjangkau ledger [perlu verifikasi: jaringan yang menegakkannya].");
    expect(kolomAdr53[1]).toContain("Idempotency-Key tetap di semua panggilan yang mengubah keadaan.");
    expect(kolomAdr53[1]).toContain("Service mesh ditunda (ADR 60)");
    expect(kolomAdr53[2]).toContain("service mesh penuh dengan Istio atau Linkerd (proxy di jalur tiap panggilan; ditunda: satu tujuan kritis, tim platform 4 orang)");
    expect(kolomAdr53[2]).toContain("token bearer per service (ditolak: bocor lewat log;");
    expect(kolomAdr53[2]).toContain("SPIFFE/SPIRE v1.15.5 (identitas workload; disebut: melengkapi mTLS bila jalur bertambah)");
    expect(kolomAdr53[3]).toContain("Jalur antar service bertambah selain ke ledger dan butuh identitas yang sama (pembanding: 3 pemanggil ke 1 ledger)");
    expect(kolomAdr53[3]).toContain("Sertifikat kedaluwarsa tanpa rotasi otomatis: semua panggilan ke ledger gagal.");
    expect(kolomAdr53[3]).toContain("mTLS membuktikan siapa yang memanggil, bukan niatnya");
    expect(kolomMesh[3]).toBe("Ledger dipanggil dari tiga service (pembayaran, cicilan, merchant): terpenuhi untuk TLS timbal balik, dikerjakan di Go tanpa mesh");
    expect(naskah).not.toMatch(/X-Layanan-Kunci|kunci layanan|kunci bersama/i);
    harus("Ledger dipanggil tiga service: pembayaran, cicilan, dan merchant (Asumsi dari naskah, [[t5-service]]).");
    harus("Naskah Tahap 5 menulis bahwa ledger dipanggil dari tiga service: pembayaran, cicilan, dan merchant (Asumsi dari naskah).");
    harus("Naskah tidak menulis nasib kunci bersama, jadi pencabutannya dari jalur ke ledger adalah keputusan ADR di bawah.");
    harus("Naskah tidak menulis jenis issuer yang dipakai Rekeningo, jadi peringatan itu adalah risiko yang harus dijawab sebelum CA internal dipakai.");
  });
  test("izin per identitas: naskah ADR 53, kode Go, tabel halaman, dan aturan 3 ADR sama, dengan hitungan enam jenis, lima identitas, tiga berizin", () => {
    expect(izinNaskah).toEqual({ pembayaran: ["topup_bank", "kartu_tahan", "kartu_tangkap"], cicilan: ["angsuran", "tabungan"], merchant: ["bayar"] });
    expect(kodeIzinGo).toEqual({ ...izinNaskah, notifikasi: [], akun: [] });
    const semuaJenis = Object.values(kodeIzinGo).flat();
    expect(semuaJenis).toHaveLength(6);
    expect(new Set(semuaJenis).size).toBe(6);
    expect(Object.keys(kodeIzinGo)).toHaveLength(5);
    expect(Object.values(kodeIzinGo).filter((j) => j.length > 0)).toHaveLength(3);
    const tabel = badan.split("\n").filter((b) => /^\| `\w+` \|/.test(b)).map(pecahBaris);
    expect(tabel).toEqual(Object.entries(kodeIzinGo).map(([n, j]) => [`\`${n}\``, j.length ? j.join(", ") : "tidak ada"]));
    const aturan3 = Object.entries(izinNaskah).map(([n, j]) => `\`${n}\` (${j.join(", ")})`);
    harus(`3. Ledger menyimpan daftar jenis jurnal per identitas: ${aturan3[0]}, ${aturan3[1]}, dan ${aturan3[2]}. \`notifikasi\` dan \`akun\` tidak boleh membuat jurnal. Identitas di luar daftar tidak punya izin, dan jenis di luar izin dijawab 403.`);
    harus("Tabel itu memuat enam jenis jurnal untuk lima identitas. Hanya tiga identitas yang boleh membuat jurnal (Hitungan atas tabel: Hitungan adalah hasil rumus dari angka yang tertulis di halaman).");
  });
});

describe("rekaman mtls.txt, rentan.txt, idempoten.txt, dan testing.txt: nilai turunan dari berkasnya sendiri", () => {
  test("bagian B: empat alert (nama dan urutan), empat baris log handshake, jurnal 0 sebelum dan sesudah, kontrol positif diterima", () => {
    expect(alertB).toEqual(["certificate required", "unknown certificate authority", "expired certificate", "bad certificate"]);
    expect(logB).toHaveLength(4);
    expect(logB[0]).toContain("client didn't provide a certificate");
    expect(logB[1]).toContain("certificate signed by unknown authority");
    expect(logB[2]).toContain("certificate has expired or is not yet valid");
    expect(logB[3]).toContain("certificate specifies an incompatible key usage");
    expect([jurnalSebelum, jurnalSesudah]).toEqual([0, 0]);
    expect(kontrolB).toBe("diterima");
    harus("Tanpa sertifikat dijawab `certificate required`. Sertifikat dari CA lain dijawab `unknown certificate authority`, yang kedaluwarsa `expired certificate`, dan yang kegunaannya hanya untuk server `bad certificate`. Kontrol positifnya, sertifikat pembayaran yang sah, diterima.");
    harus("Dari sisi server, handler ledger tidak jalan dan jurnal tetap 0.");
    harus("Log ledger mencatat alasan tiap penolakan, dan jumlah jurnal 0 sebelum dan sesudahnya:");
    expect(badan).toContain("**Empat sertifikat yang salah mendapat empat alert.**");
    expect(badan).toContain("empat sertifikat yang salah ditolak server saat handshake, dan jurnal tetap 0.");
    expect(mtls.slice(nB, nC).some((b) => b.startsWith("$ panggil -sonde -cert dari-ca-lain"))).toBe(true);
    expect(mtls.slice(nB, nC).some((b) => b.includes("hanya untuk server (EKU serverAuth)"))).toBe(true);
  });
  test("sonde: 500 milidetik dari kode panggil, README, dan halaman", () => {
    expect(kodePanggil).toContain("identitas.Sonde(u.Host, cfgTLS, 500*time.Millisecond)");
    harus("Bagian B rekaman memakai sonde: client yang menyelesaikan handshake, tidak mengirim apa pun, lalu menunggu paling lama 500 milidetik untuk alert. Log ledger mencatat alasan tiap penolakan, dan jumlah jurnal 0 sebelum dan sesudahnya:");
    expect(readmeLab).toContain("Client TLS 1.3 menganggap handshake selesai sebelum server menilai sertifikat client, jadi penolakan baru terbaca pada pembacaan pertama.");
    expect(readmeLab).toContain("Perilaku client yang langsung mengirim permintaan sesudah handshake tidak direkam.");
    expect(readmeLab).toContain("menunggu paling lama 500 ms untuk alert");
    harus("Dari sisi client TLS 1.3, alert baru terbaca pada pembacaan pertama. Client menganggap handshake selesai sebelum server menilai sertifikat client (pengamatan lab di README, bukan kutipan RFC).");
  });
  test("bagian C: pembayaran 201 untuk topup dan kartu-tahan, notifikasi dan cicilan 403 untuk topup_bank; bagian D: 401 tanpa SAN, dua 403 atas nama notifikasi, jurnal akun uji 0", () => {
    expect(statusC.map((m) => m[1])).toEqual(["201", "201", "403", "403"]);
    expect(statusC[2]![2]).toBe('{"alasan":"jenis-tidak-diizinkan","identitas":"notifikasi","jenis":"topup_bank"}');
    expect(statusC[3]![2]).toBe('{"alasan":"jenis-tidak-diizinkan","identitas":"cicilan","jenis":"topup_bank"}');
    expect(statusD.map((m) => m[1])).toEqual(["401", "403", "403"]);
    expect(statusD[0]![2]).toBe('{"alasan":"tanpa-identitas"}');
    expect(statusD[1]![2]).toBe(statusC[2]![2]);
    expect(statusD[2]![2]).toBe(statusC[2]![2]);
    expect(jurnalUjiD).toBe(0);
    expect(mtls[garis(mtls, /^\$ panggil dengan sertifikat tanpa-san/, nD)]).toContain("rantai sah, tanpa SAN");
    expect(mtls[garis(mtls, /^\$ panggil dengan sertifikat cn-menyesatkan/, nD)]).toContain("cn-menyesatkan");
    expect(mtls[garis(mtls, /^\$ panggil dengan sertifikat notifikasi dan header X-Layanan-Nama: pembayaran/, nD)]).toBeDefined();
    harus("Bagian D rekaman menguji tiga hal. Sertifikat dengan rantai sah tetapi tanpa SAN dijawab 401. Sertifikat dengan CN pembayaran dan SAN notifikasi bertindak sebagai notifikasi. Header `X-Layanan-Nama: pembayaran` tidak mengubah apa pun:");
    expect(mtls.slice(nE).filter((b) => b.startsWith("identitas: ")).length).toBe(7);
  });
  test("bagian A: sertifikat lab (satu dari CA lain, kunci CA tidak ditulis, kunci privat 0600 di luar repo, healthz dengan sertifikat pembayaran)", () => {
    expect(sertA.length).toBe(10); // CA ditambah sembilan sertifikat lab
    expect(sertA.filter((b) => !b.startsWith("ca ")).length).toBe(9);
    expect(sertA.filter((b) => b.includes("penerbit=ca-lain")).length).toBe(1);
    expect(sertA.find((b) => b.startsWith("cn-menyesatkan"))).toContain("CN=pembayaran  SAN=notifikasi.t5.lab");
    expect(sertA.find((b) => b.startsWith("tanpa-san"))).toContain("SAN=(tanpa SAN)");
    expect(mtls[nA + 1]).toBe("$ pki -dir <folder sementara di luar repo>   # kunci privat berizin 0600, tidak masuk repo");
    expect(mtls[nA + 2]).toContain("kunci CA tidak ditulis");
    expect(barisHealthz).toContain("/healthz -cert pembayaran");
    harus("Lab membuat CA saat dijalankan dan menerbitkan sertifikat service dari CA itu, ditambah satu sertifikat uji dari CA lain. Kunci privat berizin 0600 disimpan di folder sementara di luar repo, dan kunci CA tidak ditulis (`mtls.txt` bagian A). Rotasi otomatis Tidak dijalankan: tidak ada rekaman yang mengganti sertifikat.");
    expect(readmeLab).toContain("Rotasi otomatis oleh cert-manager atau penggantian file **Tidak dijalankan**: tidak ada rekaman");
  });
  test("rentan.txt: pemanggil tanpa sertifikat 201, jurnal sebelum 0, saldo akun uji 1.000, versi benar menjawab certificate required; idempoten.txt: 201 lalu 200, lalu 201 dan tiga jurnal Rp600.000", () => {
    expect([statusRentanA, sebelumRentan, saldoRentan, alertRentanB]).toEqual(["201", 0, 1000, "certificate required"]);
    expect(statusIdemA.slice(0, 2)).toEqual(["201", "200"]);
    expect(statusIdemC).toEqual(["201", "422"]);
    expect(barisJumlahC[0]).toBe("3");
    expect(Number(barisJumlahC[1])).toBe(600000);
    harus("Permintaan yang sama dua kali lewat pembayaran menghasilkan satu jurnal: 201, lalu 200 (`idempoten.txt` bagian A).");
    expect(rp(Number(barisJumlahC[1]))).toBe("Rp600.000");
    expect(JSON.stringify(bandingMentah)).toContain(`${rp(Number(barisJumlahC[1]))}`);
    harus(`Ledger versi pertama membuat jurnal top-up ${rp(1000)} untuk pemanggil tanpa sertifikat, dan saldo akun uji naik dari ${sebelumRentan} ke ${angkaId(saldoRentan)} ([[t5-m47]], \`rentan.txt\` bagian A).`);
    expect(ledgerT4).toContain("# tanpa kunci layanan");
    expect(ledgerT4).toContain('HTTP/1.1 401 Unauthorized');
    expect(ledgerT4).toContain('{"alasan":"kunci-layanan"}');
  });
  test("testing.txt: tiap nama tes yang disebut halaman ada di kode lab dan tercatat PASS", () => {
    const nama = [...new Set([...badan.matchAll(/`(Test\w+)`/g)].map((m) => m[1]!))];
    expect(nama.sort()).toEqual(["TestJenisDiTabelIzinAdaDiConstraintJurnal", "TestNamaMiripIdentitasTidakMenjadiPembayaran", "TestSemuaRuteLedgerLewatIdentitasKecualiHealthz", "TestSertifikatServerDibacaUlangTiapHandshake", "TestSertifikatTakTerverifikasiTidakDipakaiSebagaiIdentitas"]);
    for (const n of nama) {
      expect(kodeTesIdent + kodeTesLedger + kodeRute, n).toContain(`func ${n}(`);
      expect(testingTeks, n).toContain(`--- PASS: ${n}\n`);
    }
  });
});

describe("kode lab: ServerTLS, Nama, Wajib, rute, pemindai rute, tes nama mirip, dan kunci bersama", () => {
  test("ServerTLS: RequireAndVerifyClientCert, TLS 1.3 sebagai MinVersion, ClientCAs, GetCertificate dari file", () => {
    expect(wilayahServer).toContain("MinVersion: tls.VersionTLS13,");
    expect(wilayahServer).toContain("ClientAuth: tls.RequireAndVerifyClientCert,");
    expect(wilayahServer).toContain("ClientCAs:  p,");
    expect(wilayahServer).toContain("GetCertificate: func(*tls.ClientHelloInfo) (*tls.Certificate, error) {");
    expect(wilayahServer).toContain("tls.LoadX509KeyPair(sertifikat, kunci)");
    expect(kodeIdentTeks).not.toContain("MaxVersion");
    expect(kodeIdentTeks).toContain("// Sertifikat server dibaca ulang dari berkas tiap handshake, jadi penggantian berkas berlaku tanpa restart proses.");
    harus("Ledger lab memakai nilai terakhir, dengan TLS 1.3 sebagai versi terendah (pilihan lab) dan satu CA di `ClientCAs`:");
    harus("`GetCertificate` membaca sertifikat server dari file tiap handshake, jadi file yang diganti berlaku tanpa restart. Tes Go `TestSertifikatServerDibacaUlangTiapHandshake` memeriksanya (dibaca dari kode lab). Rotasi otomatis Tidak dijalankan.");
  });
  test("Nama: VerifiedChains bukan PeerCertificates, tepat satu SAN DNS <nama>.t5.lab, CN dan header diabaikan", () => {
    const f = kodeIdent.slice(namaA - 1, namaZ).join("\n");
    expect(f).toContain("r.TLS.VerifiedChains[0][0]");
    expect(f).not.toContain("PeerCertificates");
    expect(f).not.toContain("Subject.CommonName");
    expect(f).not.toContain("Header.Get");
    expect(f).toContain("if len(hasil) != 1 {");
    expect(f).toContain("daun.DNSNames");
    expect(kodeIdentTeks).toContain('const DomainBawaan = "t5.lab"');
    expect(kodeIdentTeks).toContain("var polaNama = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)");
    harus("Fungsi `Nama` membaca SAN dari sertifikat daun di `VerifiedChains`, yaitu rantai yang sudah lolos verifikasi server. Ia tidak memakai `PeerCertificates`, CN, atau header, dan menuntut tepat satu SAN DNS berbentuk `<nama>.t5.lab`:");
  });
  test("tes nama mirip identitas: huruf besar, titik di ujung, wildcard, spasi, sufiks lain, hanya IP dijawab 401, dan awalan dijawab 403; tes tanpa verifikasi memakai RequestClientCert dan CA lain", () => {
    for (const k of ['{"huruf-besar", []string{"Pembayaran.T5.lab"}, nil, 401, "tanpa-identitas"}', '{"titik-akhir", []string{"pembayaran.t5.lab."}, nil, 401, "tanpa-identitas"}', '{"wildcard", []string{"*.t5.lab"}, nil, 401, "tanpa-identitas"}', '{"spasi", []string{"pembayaran .t5.lab"}, nil, 401, "tanpa-identitas"}', '{"sufiks-lain", []string{"pembayaran.t5.lab.contoh.test"}, nil, 401, "tanpa-identitas"}', '{"hanya-ip", nil, []net.IP{net.IPv4(10, 0, 0, 1)}, 401, "tanpa-identitas"}', '{"awalan", []string{"xpembayaran.t5.lab"}, nil, 403, `"identitas":"xpembayaran"`}'])
      expect(kodeTesIdent, k).toContain(k);
    expect(kodeTesIdent).toContain("lemah.ClientAuth = tls.RequestClientCert");
    expect(kodeTesIdent).toContain('b.panggil(t, "dari-ca-lain", "/topup"); s != 401');
    expect(kodeTesIdent).toContain("VerifiedChains kosong");
    harus("Tes Go memeriksa nama yang mirip identitas: huruf besar, titik di ujung, wildcard, spasi, domain lain, dan sertifikat yang hanya memuat IP dijawab 401. Awalan tambahan seperti `xpembayaran` membentuk identitas lain yang tidak ada di tabel izin, dan dijawab 403 atas nama itu (`TestNamaMiripIdentitasTidakMenjadiPembayaran`, dibaca dari kode lab; `testing.txt` mencatat PASS-nya).");
  });
  test("Wajib: 401 tanpa identitas, 403 tanpa izin; rute() versi benar membungkus dua rute dengan JenisTopup dan JenisTahan; mode rentan dua HandleFunc tanpa pembungkus; healthz di luar", () => {
    const w = kodeIdent.slice(wajibA - 1, wajibZ).join("\n");
    expect(w).toContain("http.StatusUnauthorized");
    expect(w).toContain("http.StatusForbidden");
    expect(w).toContain('"jenis-tidak-diizinkan"');
    expect(wilayahRute).toEqual([
      '\tmux.Handle("POST /ledger/jurnal-topup", identitas.Wajib(izin, domain, JenisTopup, topup, catat))',
      '\tmux.Handle("POST /ledger/kartu/tahan", identitas.Wajib(izin, domain, JenisTahan, tahan, catat))',
    ]);
    expect(kodeMainTeks).toContain('JenisTopup = "topup_bank"');
    expect(kodeMainTeks).toContain('JenisTahan = "kartu_tahan"');
    const rentanBlok = kodeMain.slice(blokRentanA, blokRentanZ + 1).join("\n");
    expect(jumlah(rentanBlok, "HandleFunc")).toBe(2);
    expect(rentanBlok).not.toContain("identitas.Wajib");
    expect(kodeMain.slice(mulaiRute - 1, blokRentanA).join("\n")).toContain('mux.HandleFunc("GET /healthz"');
    expect(kodeRute).toContain('"go/ast"');
    expect(kodeRute).toContain('case r.pola == "GET /healthz":');
    expect(kodeRute).toContain("func TestSemuaRuteLedgerLewatIdentitasKecualiHealthz(");
    expect(mtls[garis(mtls, /healthz/, nA)]).toContain("-cert pembayaran");
    harus("`Wajib` membungkus satu rute dengan jenis jurnal yang ditulisnya. Tanpa identitas ia menjawab 401, dan identitas tanpa izin ia jawab 403:");
    harus("Tes `TestSemuaRuteLedgerLewatIdentitasKecualiHealthz` memindai kode dengan `go/ast` dan gagal bila rute di fungsi `rute()` dipasang tanpa pembungkus. Satu-satunya pengecualian adalah `GET /healthz`, yang hanya memeriksa database (dibaca dari kode lab).");
    harus("Karena itu halaman ini tidak menulis \"semua rute dilindungi\". `/healthz` tidak memeriksa identitas di handler, walau versi benar tetap menuntut sertifikat sah saat handshake (`mtls.txt` bagian A memanggilnya dengan sertifikat pembayaran).");
  });
  test("kunci bersama Tahap 4: PasangLedger menerima satu nilai kunci, README menulis pemeriksa tetap ada dan dijaga tes, versi benar tidak memasangnya", () => {
    expect(kodeHandler).toContain('const KunciLayananHeader = "X-Layanan-Kunci"');
    expect(kodeHandler).toContain("func PasangLedger(mux *http.ServeMux, svc service.Service, kunciLayanan string, catat bool) {");
    expect(kodeHandler).toContain("subtle.ConstantTimeCompare([]byte(r.Header.Get(KunciLayananHeader)), []byte(kunciLayanan))");
    expect(kodeMainTeks).not.toContain("PasangLedger");
    expect(kodeMainTeks).not.toContain("KunciLayanan");
    expect(readmeLab).toContain("Pemeriksa kunci bersama versi ADR 37 (`PasangLedger`, `X-Layanan-Kunci`) tetap ada dan dijaga tes; lab ini tidak memakainya.");
    expect(readmeLab).toContain("Service sah yang dibajak tetap memegang izin jenis jurnalnya (pre-mortem ADR 53); lab ini tidak membuktikan sebaliknya.");
    expect(readmeLab).toContain("jalur `kartu_tangkap`, `angsuran`, `tabungan`, dan `bayar` di ledger");
    expect(readmeLab).toContain("`kartu_tangkap`, `angsuran`, `tabungan`, dan `bayar` belum punya rute di ledger lab ini");
    harus("Kode `PasangLedger` menerima satu nilai kunci dan membandingkannya dengan header (dibaca dari kode lab).");
    harus("Versi benar di lab ini tidak memasang pemeriksa kunci itu. Pemeriksanya tetap ada di kode bersama dan dijaga tes (README lab).");
    expect(jumlah(badan, "`X-Layanan-Kunci`")).toBe(2);
  });
  test("pencabutan sertifikat: kata OCSP tidak ada di kode dan README lab, dan CRL hanya sebagai bit kegunaan kunci CA di pki.go", () => {
    const folder = ["labs/t5-service", "labs/api-t5/internal/identitas", "labs/api-t5/internal/pki", "labs/api-t5/cmd/ledger", "labs/api-t5/cmd/pki", "labs/api-t5/cmd/panggil", "labs/api-t5/cmd/layanan"];
    const jalan = (d: string): string[] => fs.readdirSync(path.join(akar, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === "output" ? [] : jalan(`${d}/${e.name}`)) : /\.(go|py|md|yml|yaml|sql|mod)$|^Makefile$/.test(e.name) ? [`${d}/${e.name}`] : []));
    const berkas = folder.flatMap(jalan);
    expect(berkas.length).toBeGreaterThan(15);
    const ada = berkas.filter((x) => /OCSP|CRL|revok|cabut/i.test(fs.readFileSync(path.join(akar, x), "utf8")));
    expect(ada).toEqual(["labs/api-t5/internal/pki/pki.go"]);
    expect(kodePki.match(/CRL/g)).toHaveLength(1);
    expect(kodePki).toContain("x509.KeyUsageCertSign | x509.KeyUsageCRLSign");
    expect(kodePki).not.toMatch(/OCSP|revok|cabut/i);
  });
});

describe("sumber luar: kutipan di baris riset R5-200 sampai R5-204 dan tautan di halaman", () => {
  test("baris riset ada, lima kolom, urut naik, tanpa ID ganda (tanpa mengunci tetangga)", () => {
    const ids = ["R5-200", "R5-201", "R5-202", "R5-203", "R5-204"];
    const baris = riset5.split("\n");
    const pos = ids.map((id) => baris.findIndex((b) => b.startsWith(`| ${id} |`)));
    for (const [i, p] of pos.entries()) {
      expect(p, ids[i]).toBeGreaterThan(-1);
      expect(pecahBaris(baris[p]!).length, ids[i]).toBe(5);
    }
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
    expect(new Set(pos).size).toBe(5);
    for (const id of ids) expect(baris.filter((b) => b.startsWith(`| ${id} |`)).length, `${id} tidak ganda`).toBe(1);
  });
  test("R5-200: kutipan RFC 8446 bagian 4.4.2.4, empat nilai ClientAuth Go, dan RFC 5280 bagian 4.2.1.6; kalimat halaman memakai kata pelunak sumber (boleh, tidak mewajibkan)", () => {
    const r = barisRiset("R5-200");
    for (const k of [
      'the server MAY at its discretion either continue the handshake without client authentication or abort the handshake with a "certificate_required" alert.',
      "the server MAY at its discretion either continue the handshake (considering the client unauthenticated) or abort the handshake.",
      "but does not require that the client send any certificates.",
      "but that certificate is not required to be valid.",
      "If the client does send a certificate it is required to be valid.",
      "and that at least one valid certificate is required to be sent by the client.",
      "The subject alternative name extension allows identities to be bound to the subject of the certificate.",
      "a DNS name, an IP address, and a Uniform Resource Identifier (URI).",
      "terbit Agustus 2018", "Mei 2008", "bagian 4.4.2.4", "bagian 4.2.1.6", `dibuka ${TANGGAL}`, "pkg.go.dev/crypto/tls, tanpa nomor versi", "pengamatan lab (R5-290)",
    ]) expect(r, k).toContain(k);
    harus("RFC 8446 menulis bahwa bila client tidak mengirim sertifikat, server boleh meneruskan handshake tanpa autentikasi client atau menghentikannya dengan alert `certificate_required`. Pilihan yang sama berlaku bila rantai sertifikat client tidak dapat diterima ([RFC 8446](https://www.rfc-editor.org/rfc/rfc8446), bagian 4.4.2.4, Agustus 2018, dibuka 2026-11-04, Tidak dijalankan).");
    harus("Dokumentasi `crypto/tls` menulis bahwa `RequestClientCert` meminta sertifikat tanpa mewajibkannya, dan `VerifyClientCertIfGiven` hanya mewajibkan sertifikat yang dikirim itu valid. `RequireAnyClientCert` mewajibkan satu sertifikat yang tidak harus valid. Di antara keempat nilai itu, hanya `RequireAndVerifyClientCert` mewajibkan setidaknya satu sertifikat yang valid ([Go: crypto/tls](https://pkg.go.dev/crypto/tls), dokumen tanpa nomor versi, dibuka 2026-11-04, Tidak dijalankan).");
    expect(barisRiset("R5-290")).toContain("klien TLS 1.3 menganggap handshake selesai sebelum server menilai sertifikat klien");
    expect(jumlah(r, "terbit Agustus 2018")).toBe(1);
  });
  test("R5-201: kutipan RFC 9700 bagian 4.10, 4.9.3, 4.10.1, RFC 9449 dan RFC 8705; halaman menulis RFC itu mengatur token OAuth 2.0 dan bukan aturan bagi Rekeningo", () => {
    const r = barisRiset("R5-201");
    for (const k of [
      "Authorization servers therefore SHOULD ensure that access tokens are sender-constrained and audience-restricted as described in the following.",
      "like a read-only access to web server logs, sender-constrained access tokens may also prevent replay on the compromised system.",
      "Two methods for sender-constrained access tokens using proof of possession have been defined by the OAuth working group and are in use in practice",
      "an application-level mechanism for sender-constraining access and refresh tokens",
      "This document describes a mechanism for sender-constraining OAuth 2.0 tokens via a proof-of-possession mechanism on the application level.",
      "certificate-bound access and refresh tokens using mutual Transport Layer Security (TLS) authentication with X.509 certificates.",
      "BCP 240, Januari 2025", "RFC 9449 (September 2023)", "Ketiga RFC mengatur token akses OAuth 2.0", `dibuka ${TANGGAL}`,
    ]) expect(r, k).toContain(k);
    harus("RFC itu mengatur token akses OAuth 2.0, jadi halaman ini memakainya sebagai rujukan untuk masalah yang sama, bukan sebagai aturan bagi Rekeningo (penalaran).");
    harus("RFC 9700 menulis bahwa authorization server SHOULD memastikan token akses terikat pengirim, dan menyebut akses baca ke log web server sebagai contoh akses sebagian ([RFC 9700](https://www.rfc-editor.org/rfc/rfc9700), bagian 4.9.3 dan 4.10, Januari 2025, dibuka 2026-11-04).");
    expect(badan).toContain("Bagian 4.10.1 menyebut dua cara: sertifikat client lewat RFC 8705 dan DPoP lewat RFC 9449, yaitu tanda tangan di tingkat aplikasi ([RFC 9449](https://www.rfc-editor.org/rfc/rfc9449), September 2023).");
  });
  test("R5-202: cert-manager (duration 90 hari, dnsNames, peringatan issuer CA, rilis v1.21.3 pada 2026-10-23), SPIFFE X.509-SVID, dan SPIRE v1.15.5 pada 2026-10-20", () => {
    const r = barisRiset("R5-202");
    for (const k of [
      "cert-manager creates TLS certificates for workloads in your Kubernetes or OpenShift cluster and renews the certificates before they expire.",
      "Default value for spec.duration is 90 days.",
      "Avoid using commonName for DNS names in end-entity (leaf) certificates.",
      "CA issuers are generally for cert-manager demos or for advanced users with experience and tooling for running a PKI. To be used safely in production, CA issuers introduce complex planning requirements around rotation, trust store distribution and disaster recovery.",
      "v1.21.3 terbit 2026-10-23T20:47:13Z",
      "An X.509 SVID MUST contain exactly one URI SAN, and by extension, exactly one SPIFFE ID. SVIDs containing more than one SPIFFE ID introduce challenges related to auditing and authorization logic",
      "SPIRE exposes the SPIFFE Workload API, which can attest running software systems and issue SPIFFE IDs and SVIDs to them.",
      "for example by establishing an mTLS connection or by signing and verifying a JWT token.",
      "Rilis v1.15.5 terbit 2026-10-20T18:35:18Z", `dibuka ${TANGGAL}`, "SPIFFE Verifiable Identity Document",
    ]) expect(r, k).toContain(k);
    for (const k of ["Naskah memilih cert-manager v1.21.3 untuk menerbitkan dan memutar sertifikat. Rilis itu terbit 2026-10-23 di GitHub (dibuka 2026-11-04, Tidak dijalankan).", "Nilai bawaan `spec.duration` sebuah Certificate adalah 90 hari", "rilis v1.15.5 terbit 2026-10-20, dibuka 2026-11-04, Tidak dijalankan)", "SVID adalah SPIFFE Verifiable Identity Document"]) expect(jumlah(badan, k), k).toBe(1);
    expect(kolomAdr53[1]).toContain("cert-manager v1.21.3");
    expect(kolomAdr53[2]).toContain("SPIFFE/SPIRE v1.15.5");
    expect(readmeLab).toContain("| cert-manager v1.21.3, SPIFFE/SPIRE v1.15.5 | hanya disebut | Tidak dijalankan |");
    harus("Contoh di dokumentasi cert-manager memuat komentar agar nama DNS di sertifikat daun ditulis di `dnsNames`, bukan di `commonName` ([cert-manager: Certificate](https://cert-manager.io/docs/usage/certificate/), dokumen tanpa nomor versi, dibuka 2026-11-04, Tidak dijalankan). SPIFFE memakai SAN jenis URI dan menuntut tepat satu per sertifikat, karena lebih dari satu SPIFFE ID menyulitkan audit dan logika otorisasi ([SPIFFE X.509-SVID](https://github.com/spiffe/spiffe/blob/main/standards/X509-SVID.md), dibuka 2026-11-04, Tidak dijalankan). Lab memakai SAN DNS, bukan URI SPIFFE.");
  });
  test("R5-203: kutipan lima stack (Node.js v26.13.0, Laravel 13.x dan Guzzle, Django 5.2, Serverpod 4.1.0, Supabase) dan kalimat tab yang memakainya", () => {
    const r = barisRiset("R5-203");
    for (const k of [
      "Node.js v26.13.0", "requestCert \"If true the server will request a certificate from clients that connect and attempt to verify that certificate. Default: false.\"",
      "This option only has an effect if requestCert is true. Default: true.",
      "If the peer does not provide a certificate, an empty object will be returned.",
      "(Optional) A string containing concatenated names for the subject",
      "Depending on the settings of the TLS server, unauthorized connections may still be accepted.",
      "withOptions menerima opsi Guzzle", "Set to a string to specify the path to a file containing a PEM formatted client side certificate.",
      "This is currently only supported by the cURL handler",
      "Django 5.2", "When the web server takes care of authentication it typically provides the authenticated user as REMOTE_USER.",
      "RemoteUserMiddleware must not be deployed in configurations where a client can supply the header.", "This warning applies under ASGI in all configurations",
      "Serverpod 4.1.0", "Serverpod can also terminate TLS itself", "(1.531.926 byte)",
      "Uses SSL, verifies the CA certificate, and confirms the hostname matches the certificate.",
      "Network restrictions apply to Postgres and the database pooler. They don't apply to HTTPS APIs such as PostgREST, Storage, and Auth",
    ]) expect(r, k).toContain(k);
    expect(jumlah(r, `dibuka ${TANGGAL}`)).toBeGreaterThanOrEqual(5);
    harus("**Yang berbeda di stack ini:** dokumentasi menulis bahwa `requestCert` bawaannya `false`, dan `rejectUnauthorized` hanya berpengaruh bila `requestCert` bernilai `true`. `subjectaltname` adalah string gabungan nama yang opsional, jadi kode sendiri harus mengurai string itu dan menangani objek kosong yang dikembalikan bila client tidak mengirim sertifikat. Dokumentasi juga menulis bahwa, tergantung pengaturan server, koneksi yang tidak berotorisasi masih bisa diterima.");
    harus("**Yang berbeda di stack ini:** Laravel membungkus Guzzle, dan opsi Guzzle diteruskan lewat `withOptions`. Guzzle menulis bahwa `cert` menunjuk file sertifikat client berformat PEM, dan bahwa `ssl_key` saat ini hanya didukung handler cURL. Halaman yang dibuka membahas sisi pemanggil. Siapa yang memverifikasi sertifikat client di sisi penerima tidak ditulis di sana.");
    expect(badan).toContain("Dicek ke [Django 5.2: How to authenticate using REMOTE_USER](https://docs.djangoproject.com/en/5.2/howto/auth-remote-user/), dibuka 2026-11-04.");
    expect(badan).toContain("teks mentah dari llms-full.txt dokumentasi untuk Serverpod 4.1.0, dibuka 2026-11-04.");
    expect(badan).toContain("Dicek ke [Node.js v26.13.0: tls](https://nodejs.org/api/tls.html), dibuka 2026-11-04.");
    expect(badan).toContain("Dicek ke [Laravel 13.x: HTTP Client](https://laravel.com/docs/13.x/http-client) dan [Guzzle: request options](https://docs.guzzlephp.org/en/stable/request-options.html) (dokumen tanpa nomor versi), dibuka 2026-11-04.");
  });
  test("R5-204: baris internal yang dibaca memuat nama bagian rekaman, region kode, tes, dan celah naskah; tanggal buka dan tautan di halaman terkunci", () => {
    const r = barisRiset("R5-204");
    for (const k of ["`labs/t5-service/output/mtls.txt` bagian A", "`rentan.txt` A dan B", "`idempoten.txt` A dan C", "`testing.txt`", "region server-tls", "region rute-identitas", "`rute_test.go`", "(PasangLedger dan satu kunci bersama)", "Naskah tidak menulis nasib kunci bersama dan jenis issuer", `Dibaca ${TANGGAL}`]) expect(r, k).toContain(k);
    const tanggal = badan.match(/\b20\d\d-\d\d-\d\d\b/g)!;
    expect(new Set(tanggal)).toEqual(new Set([TANGGAL, "2026-10-23", "2026-10-20"]));
    expect(tanggal.filter((t) => t === "2026-10-23")).toHaveLength(1);
    expect(tanggal.filter((t) => t === "2026-10-20")).toHaveLength(1);
    expect(jumlah(badan, `dibuka ${TANGGAL}`)).toBe(15);
    expect(tanggal.filter((t) => t === TANGGAL)).toHaveLength(17);
    expect(jumlah(badan, `pada ${TANGGAL}`)).toBe(1);
    expect(jumlah(badan, `pencarian ${TANGGAL}`)).toBe(1);
    const url = [...badan.matchAll(/\]\((http[^)]+)\)/g)].map((m) => m[1]!);
    expect(url).toEqual([
      "https://www.rfc-editor.org/rfc/rfc8446", "https://pkg.go.dev/crypto/tls", "https://www.rfc-editor.org/rfc/rfc5280", "https://cert-manager.io/docs/usage/certificate/", "https://github.com/spiffe/spiffe/blob/main/standards/X509-SVID.md",
      "https://cert-manager.io/docs/usage/certificate/", "https://cert-manager.io/docs/configuration/ca/", "https://github.com/spiffe/spire",
      "https://nodejs.org/api/tls.html", "https://laravel.com/docs/13.x/http-client", "https://docs.guzzlephp.org/en/stable/request-options.html", "https://docs.djangoproject.com/en/5.2/howto/auth-remote-user/", "https://docs.serverpod.dev/concepts/operations/security-and-tls", "https://supabase.com/docs/guides/platform/ssl-enforcement", "https://supabase.com/docs/guides/platform/network-restrictions",
      "https://www.rfc-editor.org/rfc/rfc9700", "https://www.rfc-editor.org/rfc/rfc9449",
      "https://www.rfc-editor.org/rfc/rfc8446", "https://www.rfc-editor.org/rfc/rfc5280", "https://pkg.go.dev/crypto/tls", "https://www.rfc-editor.org/rfc/rfc9700", "https://www.rfc-editor.org/rfc/rfc9449", "https://www.rfc-editor.org/rfc/rfc8705",
      "https://cert-manager.io/docs/usage/certificate/", "https://cert-manager.io/docs/configuration/ca/", "https://github.com/spiffe/spiffe/blob/main/standards/X509-SVID.md", "https://github.com/spiffe/spire",
      "https://nodejs.org/api/tls.html", "https://laravel.com/docs/13.x/http-client", "https://docs.guzzlephp.org/en/stable/request-options.html", "https://docs.djangoproject.com/en/5.2/howto/auth-remote-user/", "https://docs.serverpod.dev/concepts/operations/security-and-tls", "https://supabase.com/docs/guides/platform/ssl-enforcement", "https://supabase.com/docs/guides/platform/network-restrictions",
    ]);
  });
});

describe("halaman istilah mTLS dan SAN dan glosarium", () => {
  test("halaman istilah valid, berrujukan ke t5-m47 dan t5-mtls, sumber R5-200, dan baris glosarium menunjuk ke 5.19 dengan tetangga alfabet", () => {
    const m = HalamanIstilah.parse(istilahMtls);
    const s = HalamanIstilah.parse(istilahSan);
    expect([m.istilah, s.istilah]).toEqual(["mTLS (mutual TLS)", "SAN (Subject Alternative Name)"]);
    expect([m.cerita![0]!.rujukan, s.cerita![0]!.rujukan]).toEqual(["t5-m47", "t5-mtls"]);
    expect([m.sumber![0]!.riset, s.sumber![0]!.riset]).toEqual(["R5-200", "R5-200"]);
    expect(m.sumber![0]!.url).toBe("https://www.rfc-editor.org/rfc/rfc8446");
    expect(s.sumber![0]!.url).toBe("https://www.rfc-editor.org/rfc/rfc5280");
    expect(m.sumber![0]!.judul).toBe(`RFC 8446 bagian 4.4.2.4 dan Go crypto/tls (dibuka ${TANGGAL})`);
    expect(s.sumber![0]!.judul).toBe(`RFC 5280 bagian 4.2.1.6 (dibuka ${TANGGAL})`);
    expect(m.terkait).toEqual(["CA (Certificate Authority)", "Handshake TLS", "SAN (Subject Alternative Name)"]);
    expect(s.terkait).toEqual(["mTLS (mutual TLS)", "CA (Certificate Authority)"]);
    expect(m.stack).toBeNull();
    expect(s.stack).toBeNull();
    expect(glosarium).toContain("| **mTLS** (mutual TLS) | TLS dua arah: selain client memeriksa sertifikat server, server meminta dan memeriksa sertifikat dari client. | [[t5-mtls]] |");
    expect(glosarium).toContain("| **SAN** (Subject Alternative Name) | Daftar nama di sertifikat X.509 yang disahkan CA, misalnya nama DNS, dan dipakai ledger sebagai identitas pemanggil. | [[t5-mtls]] |");
    const baris = glosarium.split("\n");
    const i = baris.findIndex((b) => b.startsWith("| **mTLS** (mutual TLS) |"));
    expect(baris[i - 1]!.startsWith("| **Monolith**")).toBe(true);
    expect(baris[i + 1]!.startsWith("| **MVCC**")).toBe(true);
    const j = baris.findIndex((b) => b.startsWith("| **SAN** (Subject Alternative Name) |"));
    expect(baris[j - 1]!.startsWith("| **Saldo cache**")).toBe(true);
    expect(baris[j + 1]!.startsWith("| **Secret manager**")).toBe(true);
    for (const t of [...m.terkait!, ...s.terkait!]) expect(glosarium, t).toContain(`**${t.split(" (")[0]}**`);
    expect(barisRiset("R5-200")).toContain("mTLS");
  });
});

describe("kalimat berulang dan klaim universal di badan halaman", () => {
  test("tidak ada kalimat (empat kata atau lebih) atau klausa (lima kata atau lebih) yang muncul dua kali", () => {
    const tanpaKode = badan.replace(/<Snippet[\s\S]*?\/>/g, "");
    const kalimat = tanpaKode.split("\n").filter((b) => b.trim() && !b.startsWith("<")).flatMap((b) => b.split(/(?<=[.!?])\s+/).map((k) => k.trim())).filter((k) => k.split(/\s+/).length >= 4);
    expect(kalimat.length).toBeGreaterThan(100);
    const hitung = new Map<string, number>();
    for (const k of kalimat) hitung.set(k, (hitung.get(k) ?? 0) + 1);
    // dua kalimat berulang sengaja: pertanyaan "Sudah tahu?" di blok Mulai sama dengan soal Cek diri, dan pengantar tab Ilustrasi
    expect([...hitung].filter(([, n]) => n > 1).map(([k]) => k)).toEqual(["Kenapa lab tetap tidak membuat jurnal untuk sertifikat dari CA lain?", "Apa yang tidak dihentikan mTLS?", "Kode di bawah adalah Ilustrasi.*"]);
    expect([...hitung].filter(([, n]) => n > 1).map(([, n]) => n)).toEqual([2, 2, 2]);
    const klausa = tanpaKode.split("\n").filter((b) => b.trim() && !b.startsWith("<")).flatMap((b) => b.split(/(?<=[.!?:])\s+/).map((k) => k.trim())).filter((k) => k.split(/\s+/).length >= 5);
    const hitungKlausa = new Map<string, number>();
    for (const k of klausa) hitungKlausa.set(k, (hitungKlausa.get(k) ?? 0) + 1);
    expect([...hitungKlausa].filter(([, n]) => n > 1).map(([k]) => k)).toEqual(["Kenapa lab tetap tidak membuat jurnal untuk sertifikat dari CA lain?", "Apa yang tidak dihentikan mTLS?", "Kode di bawah adalah Ilustrasi.*"]);
  });
  test("klaim universal: tak ada 'selalu', 'setiap', 'tidak pernah', 'hanya di'; 'semua', 'mana pun', dan 'hanya' hanya di kalimat berlingkup yang terkunci", () => {
    const kalimat = badan.replace(/<noscript>[\s\S]*?<\/noscript>/, "").replace(/<Snippet[\s\S]*?\/>/g, "").split(/(?<=[.!?])\s+|\n/).map((s) => s.trim().replace(/\s+/g, " "));
    for (const k of ["selalu", "setiap", "tidak pernah", "hanya di", "tak satu pun", "tidak satu pun", "seluruh"]) {
      const cocok = kalimat.filter((s) => new RegExp(`\\b${k}\\b`, "i").test(s));
      if (k === "seluruh") expect(cocok, k).toEqual(["Pencarian `client certificate`, `mTLS`, `mutual TLS`, dan `requestClientCertificate` di seluruh dokumentasi mentah tidak menemukan apa pun, jadi sertifikat client tidak dibahas."]);
      else expect(cocok, k).toEqual([]);
    }
    const semua = kalimat.filter((s) => /\bsemua\b/i.test(s));
    expect(semua).toEqual([
      "Karena itu halaman ini tidak menulis \"semua rute dilindungi\".",
      "Kedua, izin: jenis jurnal dipisah per identitas, sedangkan satu kunci bersama membuka rute yang sama bagi semua pemegangnya (penalaran dari kode `PasangLedger`).",
      "Ketiga, rotasi: satu nilai bersama diganti di semua pemegangnya, sedangkan tiap service punya sertifikat dan umur sendiri (penalaran, rotasi Tidak dijalankan).",
      "Ia memperingatkan bahwa middleware itu tidak boleh dipakai bila client bisa mengirim header sendiri, dan peringatan itu berlaku di ASGI untuk semua konfigurasi.",
      "Idempotency-Key tetap di semua panggilan yang mengubah keadaan.",
      "Pemeriksa kunci bersama `X-Layanan-Kunci` dicabut dari jalur ke ledger sesudah semua pemanggilnya memakai sertifikat.",
      "- Saat sertifikat kedaluwarsa tanpa rotasi otomatis, karena semua panggilan dari service pemegangnya gagal di handshake.",
    ]);
        const sel = badan.split("\n").filter((b) => b.startsWith("|")).flatMap(pecahBaris).filter((c) => /\bmana pun\b/.test(c));
    expect(sel).toEqual(["Pemegang token mana pun bisa memakainya ulang, dan naskah menulis token bocor lewat log", "Nol, dengan harga jurnal dari pemanggil mana pun"]);
    const hanya = kalimat.filter((s) => /\bhanya\b/i.test(s));
    // 70 karakter pertama tiap kalimat berisi 'hanya': tiap kemunculan punya lingkup (file, lab, jenis nilai, atau kutipan sumber)
    expect(hanya.map((x) => x.slice(0, 70))).toEqual([
      "Server hanya meminta sertifikat client tanpa memverifikasinya.",
      "Dokumentasi `crypto/tls` menulis bahwa `RequestClientCert` meminta ser",
      "Di antara keempat nilai itu, hanya `RequireAndVerifyClientCert` mewaji",
      "Sertifikat dari CA lain dijawab `unknown certificate authority`, yang ",
      "Tes Go memeriksa nama yang mirip identitas: huruf besar, titik di ujun",
      "Hanya tiga identitas yang boleh membuat jurnal (Hitungan atas tabel: H",
      "Ledger lab hanya punya rute untuk `topup_bank` dan `kartu_tahan`.",
      "Satu-satunya pengecualian adalah `GET /healthz`, yang hanya memeriksa ",
      "| Tanpa sertifikat, dari CA lain, kedaluwarsa, atau kegunaan hanya unt",
      "Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-11",
      "**Yang berbeda di stack ini:** dokumentasi menulis bahwa `requestCert`",
      "Guzzle menulis bahwa `cert` menunjuk file sertifikat client berformat ",
      "Network restrictions membatasi lewat daftar CIDR dan, menurut halamann",
      "Aturan inti Tahap 5 menulis bahwa uang bergerak hanya lewat ledger ([[",
      "| Cara kerja | Ledger menerima pemanggil yang sampai ke port-nya, dan ",
      "| Rotasi sertifikat otomatis | Lab hanya merekam pembacaan ulang file ",
      "| Pencabutan sertifikat sebelum kedaluwarsa | Lab tidak menerbitkan CR",
      "**2.** Server hanya meminta sertifikat client tanpa memverifikasinya.",
      "Handler membaca identitas hanya dari rantai yang sudah terverifikasi, "
    ]);
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, tebakan, banding, kartu, dan halaman istilah (kecuali field riset)", () => {
    const tampil = [badan, frontmatter, JSON.stringify(rantaiMentah), JSON.stringify(tebakMentah), JSON.stringify(bandingMentah), JSON.stringify(kartuSemua.filter((x) => x.halaman === "t5-mtls"))].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/keputusan \d{3,4}/i);
    expect(tampil).not.toMatch(/(PR|pull request) #?\d{3}\b/);
    for (const istilah of [istilahMtls, istilahSan]) {
      const { sumber, ...tanpaRiset } = istilah as Record<string, unknown>;
      expect(JSON.stringify(tanpaRiset)).not.toMatch(/\bR\d-\d{2,3}\b/);
      expect(JSON.stringify((sumber as { judul: string; catatan: string }[]).map((s) => [s.judul, s.catatan]))).not.toMatch(/\bR\d-\d{2,3}\b/);
    }
  });
  test("satu kata per konsep: service (bukan layanan), tanpa pembeli, pelanggan, secret, rahasia, replica, klien, kita, Anda, pemakai, pengguna, berkas; layanan hanya di identifier kode", () => {
    const tanpaKode = badan.replace(/`[^`]*`/g, "").replace(/<Snippet[\s\S]*?\/>/g, "");
    for (const k of ["pembeli", "pelanggan", "layanan", "secret", "rahasia", "replica", "klien", "pemakai", "pengguna", "berkas"]) expect(tanpaKode.toLowerCase(), k).not.toMatch(new RegExp(`\\b${k}\\b`));
    expect(tanpaKode).not.toMatch(/\bAnda\b/);
    expect(tanpaKode).not.toMatch(/\bkita\b/i);
    expect((tanpaKode.match(/\bservice\b/gi) ?? []).length).toBeGreaterThan(20);
  });
});

describe("struktur halaman, tebakan, banding, Rantai, dan kartu", () => {
  test("tautan [[id]]: semua id ada di registry, himpunan dan jumlah per tujuan terkunci", () => {
    const hitung: Record<string, number> = {};
    for (const m of halaman.matchAll(/\[\[([^\]]+)\]\]/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    for (const id of Object.keys(hitung)) expect(id === "berikutnya" || hal.some((x) => x.id === id), id).toBe(true);
    expect(hitung).toEqual({ "t5-m47": 5, berikutnya: 1, "t2-idempotency": 1, "t4-adr-45": 1, "t5-service": 1, "t4-modul": 1, "t5-fitur-teknis": 1, "t5-adr-60": 3 });
  });
  test("template konsep: lima blok, dua pertama terbuka; Cek diri empat soal; satu Tebak sesudah Inti dan Cek 3 pertanyaan; satu banding sesudah Tebak; satu Rantai; noscript; SkripLama di akhir", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("1234");
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(4);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["cerita","banding"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="banding" src="data/t5-mtls-banding.json" />');
    expect(badan).toContain("<Tebak client:visible data={dataTebak} />");
    expect(badan).toContain("<Rantai data={intiDiagram} ringkas />");
    expect(halaman).toContain('import intiDiagram from "../../../../data/diagram/t5-mtls-inti.json";');
    expect(halaman).toContain('import dataTebak from "../../../../data/widget/t5-mtls-tebak.json";');
    expect(jumlah(badan, "<Rantai ")).toBe(1);
    expect(jumlah(badan, "<WidgetLama")).toBe(1);
    expect(jumlah(badan, "<Tebak ")).toBe(1);
    expect(jumlah(badan, "<TabSet ")).toBe(1);
    expect(jumlah(badan, "<Snippet ")).toBe(10);
    expect(jumlah(badan, "<Blok ")).toBe(5);
    expect(jumlah(badan, "<details")).toBe(5);
    expect(jumlah(badan, "<summary>")).toBe(5);
    expect(badan.indexOf("<Tebak")).toBeLessThan(badan.indexOf("<WidgetLama"));
    expect(badan.indexOf("<details class=\"question\">")).toBeLessThan(badan.indexOf("<Tebak"));
    expect(badan).toContain('<Blok nama="Coba" buka aman="Kalau berhenti di sini, kamu sudah tahu: ledger membaca identitas dari SAN pada sertifikat yang lolos verifikasi, bukan dari CN atau header, dan sertifikat sah milik service lain dijawab 403.">');
    harus("**Yang tidak direkam.**");
    harus('<TabSet id="stack" labels={["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]}>');
    for (const [i, slot] of ["t0", "t1", "t2", "t3", "t4", "t5"].entries()) expect(jumlah(badan, `<Fragment slot="${slot}">`), `slot ${i}`).toBe(1);
  });
  test("Snippet: file, rentang atau wilayah, dan judul diturunkan dari kode dan rekaman (rentang fungsi, bukan angka tangan)", () => {
    const tag = [...badan.matchAll(/<Snippet\b([^>]*?)\/>/g)].map((m) => m[1]!).filter((a) => a.includes("file="));
    const atr = (a: string, k: string): string | undefined => a.match(new RegExp(`${k}="([^"]*)"`))?.[1];
    expect(tag.map((a) => [atr(a, "file"), atr(a, "lines"), atr(a, "region")])).toEqual([
      ["labs/api-t5/internal/identitas/identitas.go", undefined, "server-tls"],
      ["labs/t5-service/output/mtls.txt", `${nB + 1}:${nC - 1}`, undefined],
      ["labs/api-t5/internal/identitas/identitas.go", `${namaA}:${namaZ}`, undefined],
      ["labs/t5-service/output/mtls.txt", `${nD + 1}:${nE - 1}`, undefined],
      ["labs/api-t5/internal/identitas/identitas.go", `${izinA}:${izinZ}`, undefined],
      ["labs/api-t5/internal/identitas/identitas.go", `${wajibA}:${wajibZ}`, undefined],
      ["labs/api-t5/cmd/ledger/main.go", undefined, "rute-identitas"],
      ["labs/api-t5/cmd/ledger/main.go", undefined, "rute-identitas"],
    ]);
    expect(tag.map((a) => atr(a, "title"))).toEqual([
      "Kode lab: labs/api-t5/internal/identitas/identitas.go, ServerTLS (server menuntut sertifikat client dari CA ini)",
      "Rekaman lab: labs/t5-service/output/mtls.txt, bagian B (empat sertifikat salah ditolak saat handshake)",
      `Kode lab: labs/api-t5/internal/identitas/identitas.go baris ${namaA} sampai ${namaZ} (Nama: identitas dari tepat satu SAN)`,
      "Rekaman lab: labs/t5-service/output/mtls.txt, bagian D (identitas hanya dari SAN)",
      `Kode lab: labs/api-t5/internal/identitas/identitas.go baris ${izinA} sampai ${izinZ} (IzinNaskah: jenis jurnal per identitas)`,
      `Kode lab: labs/api-t5/internal/identitas/identitas.go baris ${wajibA} sampai ${wajibZ} (Wajib: 401 tanpa identitas, 403 tanpa izin)`,
      "Kode lab: labs/api-t5/cmd/ledger/main.go, rute() di versi benar (tiap rute dibungkus identitas.Wajib)",
      "labs/api-t5/cmd/ledger/main.go",
    ]);
    // rentang rekaman: B berakhir di baris terakhir sebelum baris kosong dan header C; D di sebelum baris kosong dan header E
    expect(mtls[nC - 1]).toBe("");
    expect(mtls[nE - 1]).toBe("");
    expect(mtls[nC - 2]).toBe("(1 row)");
    expect(mtls[nE - 2]).toBe("(1 row)");
    expect(jumlah(badan, '<Snippet lang="js" code=')).toBe(1);
    expect(jumlah(badan, '<Snippet lang="php" code=')).toBe(1);
  });
  test("tabel GFM: empat tabel dengan jumlah kolom sama di header, pemisah, dan tiap baris (2, 4, 6, 3 kolom)", () => {
    const baris = badan.split("\n");
    const kolom: number[] = [];
    for (let i = 0; i < baris.length; i++) {
      if (baris[i]!.startsWith("|") && !(baris[i - 1] ?? "").startsWith("|")) {
        const n = pecahBaris(baris[i]!).length;
        kolom.push(n);
        for (let j = i; baris[j]?.startsWith("|"); j++) expect(pecahBaris(baris[j]!).length, `baris ${j + 1}`).toBe(n);
        expect(baris[i + 1]).toBe(`|${"---|".repeat(n)}`);
      }
    }
    expect(kolom).toEqual([2, 4, 6, 3]);
  });
  test("tabel dua lapis: empat baris (alert TLS di handshake; 401 dan 403 di handler; 201) cocok dengan rekaman", () => {
    const t = badan.split("\n").filter((b) => b.startsWith("| ") && !b.startsWith("| `")).map(pecahBaris).filter((c) => c.length === 4 && c[0] !== "Pemanggil");
    expect(t.map((c) => [c[1], c[2], c[3]])).toEqual([
      ["alert TLS", "handshake", "`mtls.txt` bagian B"],
      [statusD[0]![1], "handler", "`mtls.txt` bagian D"],
      [statusC[2]![1], "handler", "`mtls.txt` bagian C dan D"],
      [statusC[0]![1], "tidak ditolak", "`mtls.txt` bagian C"],
    ]);
  });
  test("tebak dulu: jawabannya tidak tertulis di atasnya (SAN, CN, dan nama sertifikat uji tidak muncul sebelum Tebak), dan pilihan benar bukan yang pertama atau keempat", () => {
    const sebelumTebak = badan.slice(0, badan.indexOf("<Tebak")).replace(/ aman="[^"]*"/, "");
    for (const k of ["SAN", "CN", "cn-menyesatkan", "notifikasi.t5.lab", "atas nama notifikasi", "dari SAN"]) expect(sebelumTebak, k).not.toContain(k);
    const sebelumBanding = badan.slice(0, badan.indexOf("<WidgetLama"));
    expect(sebelumBanding).toContain("<Tebak");
    const t = DataTebak.parse(tebakMentah);
    expect(t.pilihan).toHaveLength(4);
    const idx = t.pilihan.findIndex((p) => p.benar);
    expect(idx).toBe(1);
    expect(t.pilihan[idx]!.teks.length).toBeLessThan(Math.max(...t.pilihan.map((p) => p.teks.length)));
    expect(t.sumber).toEqual({ jenis: "rekaman", teks: "labs/t5-service/output/mtls.txt bagian D" });
    // diturunkan dari rekaman bagian A dan D
    const cnMenyesatkan = sertA.find((b) => b.startsWith("cn-menyesatkan"))!;
    expect(cnMenyesatkan).toContain("CN=pembayaran");
    expect(cnMenyesatkan).toContain("SAN=notifikasi.t5.lab");
    expect(cnMenyesatkan).toContain("EKU=client");
    expect(t.adegan[0]).toContain("hanya memuat notifikasi.t5.lab.");
    expect(t.adegan[0]).toContain("berisi pembayaran.");
    expect(t.pilihan[0]!.teks).toContain(`menjawab ${statusC[0]![1]}:`);
    expect(t.pilihan[1]!.teks).toContain(`menjawab ${statusD[1]![1]}:`);
    expect(t.pilihan[3]!.teks).toContain(`menjawab ${statusD[0]![1]}:`);
    expect(t.pilihan[1]!.alasan).toContain(`status ${statusD[1]![1]} dengan identitas notifikasi dan jenis topup_bank`);
    expect(t.pilihan[3]!.alasan).toContain(`Jawaban ${statusD[0]![1]} di rekaman bagian D hanya untuk sertifikat tanpa SAN.`);
    expect(t.pilihan[0]!.alasan).toContain(`jumlah jurnal topup_bank untuk akun uji tetap ${jurnalUjiD}`);
  });
  test("diagram Rantai: ringkas, dua baris, sumber mtls.txt, simpul dan sub dari nilai turunan (alert, 403, jurnal 0)", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d.id).toBe("t5-mtls-inti");
    expect(d.judul).toBe("Dua lapis penolakan di ledger");
    expect(d.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t5-service · mtls.txt" });
    expect(d.baris.map((b) => [b.label, b.sub])).toEqual([["Tanpa sertifikat", "bagian B"], ["Sertifikat notifikasi", "bagian C dan D"]]);
    const b1 = d.baris[0]!.simpul;
    expect(b1.map((s) => s.teks)).toEqual(["Handshake TLS", "Alert dari server", `Jurnal tetap ${jurnalSebelum}`]);
    expect(b1[1]!.sub).toBe(alertB[0]);
    expect(jurnalSebelum).toBe(jurnalSesudah);
    const b2 = d.baris[1]!.simpul;
    expect(b2.map((s) => s.teks)).toEqual(["Minta topup_bank", statusC[2]![1], `Jurnal akun uji ${jurnalUjiD}`]);
    expect(b2[1]!.sub).toBe(statusC[2]![2].match(/"alasan":"([^"]+)"/)![1]);
    expect(b2[2]!.sub).toBe("topup_bank, bagian D");
    expect(d.baris.flatMap((b) => b.simpul).map((s) => s.nada)).toEqual(["biasa", "biasa", "good", "biasa", "good", "good"]);
    expect(d.catatan).toBe("Hijau menandai hasil yang diinginkan: tidak ada jurnal dari pemanggil tanpa izin. Pemanggil di rekaman adalah perintah panggil dan service notifikasi lab di mesin yang sama dengan ledger, bukan pod di cluster.");
    expect(badan).toContain("<Rantai data={intiDiagram} ringkas />");
  });
  test("widget banding: valid menurut banding.js, empat fitur, dua opsi, simpul disorot ada, catatan memuat nilai dari rekaman, dan label sumber sesuai", () => {
    expect(banding.cekData(bandingMentah)).toEqual([]);
    expect(bandingMentah.opsi.map((o) => o.id)).toEqual(["rentan", "mtls"]);
    expect(bandingMentah.opsi.map((o) => o.nama)).toEqual(["A · Versi pertama (mode rentan)", "B · mTLS dan daftar jenis jurnal (pilihan ADR 53)"]);
    expect(bandingMentah.fitur.map((f) => f.label)).toEqual(["Pemanggil tanpa sertifikat", "Sertifikat notifikasi minta topup_bank", "Sertifikat pembayaran minta topup_bank", "Key baru dari pemanggil yang sah"]);
    const f = bandingMentah.fitur;
    expect(f[0]!.catatan.rentan).toBe(`Ledger menjawab ${statusRentanA} dan membuat jurnal topup ${rp(1000)} untuk akun uji. Saldo akun itu naik dari ${sebelumRentan} ke ${angkaId(saldoRentan)} (Rekaman lab, rentan.txt bagian A).`);
    expect(f[0]!.catatan.mtls).toBe(`Server mengirim alert ${alertRentanB}. Handler tidak jalan, dan jurnal untuk key itu ${jurnalSebelum} (Rekaman lab, rentan.txt bagian B dan mtls.txt bagian B).`);
    expect(f[1]!.catatan.mtls).toBe(`Handshake lolos. Handler membaca identitas notifikasi dan menjawab ${statusC[2]![1]} jenis-tidak-diizinkan (Rekaman lab, mtls.txt bagian C).`);
    expect(f[2]!.catatan.mtls).toBe(`Identitas pembayaran punya izin topup_bank. Ledger menjawab ${statusC[0]![1]} dan membuat satu jurnal topup_bank (Rekaman lab, mtls.txt bagian C).`);
    expect(f[3]!.catatan.mtls).toBe(`Pembayaran dengan sertifikat sah dan key baru membuat jurnal kedua untuk akun dan jumlah yang sama: ${statusIdemC[0]}, dan tiga jurnal topup_bank berjumlah ${rp(Number(barisJumlahC[1]))} (Rekaman lab, idempoten.txt bagian C). mTLS menjawab siapa, bukan niatnya.`);
    for (const k of [f[1]!.catatan.rentan, f[2]!.catatan.rentan, f[3]!.catatan.rentan]) expect(k).toMatch(/Tidak direkam/);
    expect(f[1]!.catatan.rentan).toContain("(penalaran dari kode lab, Tidak dijalankan)");
    expect(f.map((x) => x.nada)).toEqual([{ rentan: "warn" }, { rentan: "warn" }, undefined, { mtls: "warn" }]);
    expect(f.map((x) => x.sorot)).toEqual([
      { rentan: ["pemanggil", "pintu", "handler"], mtls: ["pemanggil", "pintu"] },
      { rentan: ["handler", "identitas", "daftar"], mtls: ["identitas", "daftar", "handler"] },
      { rentan: ["pemanggil", "handler"], mtls: ["pemanggil", "identitas", "daftar", "handler"] },
      { rentan: ["key", "handler"], mtls: ["key", "handler"] },
    ]);
    expect(bandingMentah.opsi[1]!.baris[0]!.map((s) => s.sub)).toEqual(["sertifikat dari CA ledger", "HTTPS, sertifikat client wajib", "dibungkus identitas.Wajib"]);
    expect(bandingMentah.opsi[1]!.baris[1]![1]!.sub).toBe("per identitas");
    expect(bandingMentah.opsi[0]!.baris[1]!.map((s) => s.sub)).toEqual(["tidak dibaca", "tidak ada", "menandai permintaan"]);
    expect(bandingMentah.judul).toBe("Ledger versi pertama atau ledger dengan mTLS dan daftar jenis jurnal");
  });
  test("kartu Cek diri: empat kartu t5-mtls, tanya sama dengan soal di halaman, jawaban halaman termuat, url dan judul dari registry", () => {
    const k = kartuSemua.filter((x) => x.halaman === "t5-mtls");
    expect(k.map((x) => x.id)).toEqual(["t5-mtls-1", "t5-mtls-2", "t5-mtls-3", "t5-mtls-4"]);
    const soal = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(k.map((x) => x.tanya)).toEqual(soal);
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban).toHaveLength(4);
    k.forEach((x, i) => expect(jawaban[i]).toContain(x.jawab));
    for (const x of k) { expect(x.url).toBe("tahap-5/mtls-antar-service/"); expect(x.judul).toBe(`5.19 ${dari("t5-mtls").judul}`); }
    expect(jawaban[0]).toContain("(`mtls.txt` bagian C)");
    expect(jawaban[1]).toContain("`TestSertifikatTakTerverifikasiTidakDipakaiSebagaiIdentitas`");
    expect(jawaban[1]).toContain("bukan bagian di `mtls.txt`");
    expect(jawaban[2]).toContain("(`idempoten.txt` bagian C)");
    expect(jawaban[3]).toContain("Pembandingnya tiga pemanggil ke satu ledger.");
  });
});

// <LITERAL-MULAI>
// Lapis 1b: paragraf utuh, JSON utuh, dan noscript ditulis di tes ini (bukan di berkas kunci), supaya mutasi tanpa kunci tertangkap.
// Bagian ini dibangkitkan dari berkas saat ini oleh tmp/bangun_literal519.py; ubah hanya sesudah membaca perbedaannya.
const PARAGRAF_UTUH: string[] = [
  "## Inti",
  "Ledger menolak pemanggil tanpa sertifikat sah di handshake dan menjawab 403 bila izin jenis jurnalnya tidak ada.",
  "mTLS, singkatan mutual TLS, adalah TLS dua arah: client memeriksa sertifikat server, dan server memeriksa sertifikat client. Sertifikat client adalah bukti identitas pemanggil yang ditandatangani CA yang dipercaya ledger. Ledger membaca nama service dari sertifikat itu, lalu mencocokkannya dengan daftar jenis jurnal yang boleh dibuat service tersebut.",
  "Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `mtls.txt` bagian B, empat sertifikat yang salah ditolak server saat handshake, dan jurnal tetap 0. Bagian C menjawab sertifikat notifikasi dengan 403 untuk jenis topup_bank, sedangkan sertifikat pembayaran membuat jurnal dan dijawab 201. Idempotency-Key tetap dipakai, tetapi ia mencegah pemrosesan ganda, bukan pemanggil yang tidak berhak ([[t5-m47]]).",
  "<summary>Sudah tahu? Cek 3 pertanyaan</summary>",
  "1. Sertifikat notifikasi sah, tetapi permintaannya dijawab 403 dan bukan ditolak di handshake. Kenapa?",
  "2. Server hanya meminta sertifikat client tanpa memverifikasinya. Kenapa lab tetap tidak membuat jurnal untuk sertifikat dari CA lain?",
  "3. Service pembayaran yang sah mengirim key baru dengan akun dan jumlah yang sama. Apa yang tidak dihentikan mTLS?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "Tebak dulu jawaban ledger untuk satu sertifikat yang janggal. Lalu pilih satu kejadian di widget perbandingan dan lihat jawaban ledger versi pertama dan ledger dengan mTLS.",
  "Catatan di widget menyebut file rekaman dan bagiannya bila berasal dari Rekaman lab. Tidak dijalankan berarti dicek ke kode atau dokumentasi tanpa menjalankannya. Penalaran adalah kesimpulan dari kode atau angka di halaman, bukan hasil ukuran.",
  "**Ubah satu hal:** pindah dari Pemanggil tanpa sertifikat ke Sertifikat notifikasi minta topup_bank. Jawaban ledger dengan mTLS berganti dari alert di handshake menjadi 403 dari handler: dua lapis, dua jawaban.",
  "### Kenapa ini ada",
  "[[t5-m47]] menunjukkan ledger versi pertama yang membuat jurnal untuk pemanggil tanpa sertifikat dan tanpa identitas (Rekaman lab, `rentan.txt` bagian A). Idempotency-Key tidak menghentikannya, karena key menandai permintaan, bukan pemanggil ([[t2-idempotency]]).",
  "Pemicu service mesh di ADR 45 adalah lebih dari satu jalur antar service yang butuh TLS timbal balik dan retry seragam ([[t4-adr-45]]). Di Tahap 4 jalurnya satu. Naskah Tahap 5 menulis bahwa ledger dipanggil dari tiga service: pembayaran, cicilan, dan merchant (Asumsi dari naskah). Pemicu itu terpenuhi untuk TLS timbal balik, dan naskah memilih mengerjakannya di Go tanpa mesh.",
  "### Cara kerjanya",
  "**Server menuntut sertifikat client, dan menolak adalah pilihan server.** Di TLS biasa, client memeriksa sertifikat server. Di mTLS, server juga meminta sertifikat dari client. RFC 8446 menulis bahwa bila client tidak mengirim sertifikat, server boleh meneruskan handshake tanpa autentikasi client atau menghentikannya dengan alert `certificate_required`. Pilihan yang sama berlaku bila rantai sertifikat client tidak dapat diterima ([RFC 8446](https://www.rfc-editor.org/rfc/rfc8446), bagian 4.4.2.4, Agustus 2018, dibuka 2026-11-04, Tidak dijalankan).",
  "Go menyerahkan pilihan itu ke `Config.ClientAuth`. Dokumentasi `crypto/tls` menulis bahwa `RequestClientCert` meminta sertifikat tanpa mewajibkannya, dan `VerifyClientCertIfGiven` hanya mewajibkan sertifikat yang dikirim itu valid. `RequireAnyClientCert` mewajibkan satu sertifikat yang tidak harus valid. Di antara keempat nilai itu, hanya `RequireAndVerifyClientCert` mewajibkan setidaknya satu sertifikat yang valid ([Go: crypto/tls](https://pkg.go.dev/crypto/tls), dokumen tanpa nomor versi, dibuka 2026-11-04, Tidak dijalankan).",
  "Ledger lab memakai nilai terakhir, dengan TLS 1.3 sebagai versi terendah (pilihan lab) dan satu CA di `ClientCAs`:",
  "`GetCertificate` membaca sertifikat server dari file tiap handshake, jadi file yang diganti berlaku tanpa restart. Tes Go `TestSertifikatServerDibacaUlangTiapHandshake` memeriksanya (dibaca dari kode lab). Rotasi otomatis Tidak dijalankan.",
  "**Empat sertifikat yang salah mendapat empat alert.** Bagian B rekaman memakai sonde: client yang menyelesaikan handshake, tidak mengirim apa pun, lalu menunggu paling lama 500 milidetik untuk alert. Log ledger mencatat alasan tiap penolakan, dan jumlah jurnal 0 sebelum dan sesudahnya:",
  "Tanpa sertifikat dijawab `certificate required`. Sertifikat dari CA lain dijawab `unknown certificate authority`, yang kedaluwarsa `expired certificate`, dan yang kegunaannya hanya untuk server `bad certificate`. Kontrol positifnya, sertifikat pembayaran yang sah, diterima.",
  "**\"Gagal di handshake\" punya lingkup.** Dari sisi server, handler ledger tidak jalan dan jurnal tetap 0. Dari sisi client TLS 1.3, alert baru terbaca pada pembacaan pertama. Client menganggap handshake selesai sebelum server menilai sertifikat client (pengamatan lab di README, bukan kutipan RFC). Client yang langsung mengirim permintaan sesudah handshake tidak direkam, dan server lab menuntut TLS 1.3 sebagai versi terendah.",
  "**Identitas dibaca dari SAN yang lolos verifikasi.** SAN (Subject Alternative Name) adalah ekstensi sertifikat X.509 yang mengikat identitas ke subjek sertifikat, termasuk nama DNS ([RFC 5280](https://www.rfc-editor.org/rfc/rfc5280), bagian 4.2.1.6, Mei 2008, dibuka 2026-11-04, Tidak dijalankan). Fungsi `Nama` membaca SAN dari sertifikat daun di `VerifiedChains`, yaitu rantai yang sudah lolos verifikasi server. Ia tidak memakai `PeerCertificates`, CN, atau header, dan menuntut tepat satu SAN DNS berbentuk `<nama>.t5.lab`:",
  "Bagian D rekaman menguji tiga hal. Sertifikat dengan rantai sah tetapi tanpa SAN dijawab 401. Sertifikat dengan CN pembayaran dan SAN notifikasi bertindak sebagai notifikasi. Header `X-Layanan-Nama: pembayaran` tidak mengubah apa pun:",
  "Tes Go memeriksa nama yang mirip identitas: huruf besar, titik di ujung, wildcard, spasi, domain lain, dan sertifikat yang hanya memuat IP dijawab 401. Awalan tambahan seperti `xpembayaran` membentuk identitas lain yang tidak ada di tabel izin, dan dijawab 403 atas nama itu (`TestNamaMiripIdentitasTidakMenjadiPembayaran`, dibaca dari kode lab; `testing.txt` mencatat PASS-nya).",
  "Contoh di dokumentasi cert-manager memuat komentar agar nama DNS di sertifikat daun ditulis di `dnsNames`, bukan di `commonName` ([cert-manager: Certificate](https://cert-manager.io/docs/usage/certificate/), dokumen tanpa nomor versi, dibuka 2026-11-04, Tidak dijalankan). SPIFFE memakai SAN jenis URI dan menuntut tepat satu per sertifikat, karena lebih dari satu SPIFFE ID menyulitkan audit dan logika otorisasi ([SPIFFE X.509-SVID](https://github.com/spiffe/spiffe/blob/main/standards/X509-SVID.md), dibuka 2026-11-04, Tidak dijalankan). Lab memakai SAN DNS, bukan URI SPIFFE.",
  "**Ledger menyimpan daftar jenis jurnal per identitas.** Daftar itu berasal dari naskah ADR 53, dan kode lab menyalinnya apa adanya:",
  "| Identitas | Jenis jurnal yang boleh dibuat |",
  "|---|---|",
  "| `pembayaran` | topup_bank, kartu_tahan, kartu_tangkap |",
  "| `cicilan` | angsuran, tabungan |",
  "| `merchant` | bayar |",
  "| `notifikasi` | tidak ada |",
  "| `akun` | tidak ada |",
  "Tabel itu memuat enam jenis jurnal untuk lima identitas. Hanya tiga identitas yang boleh membuat jurnal (Hitungan atas tabel: Hitungan adalah hasil rumus dari angka yang tertulis di halaman). Tes Go `TestJenisDiTabelIzinAdaDiConstraintJurnal` memeriksa tiap jenis di tabel terhadap constraint `jurnal_jenis_check` di database. Ledger lab hanya punya rute untuk `topup_bank` dan `kartu_tahan`. Empat jenis lain sudah punya izin, tetapi belum punya rute (README lab).",
  "`Wajib` membungkus satu rute dengan jenis jurnal yang ditulisnya. Tanpa identitas ia menjawab 401, dan identitas tanpa izin ia jawab 403:",
  "Ledger memasang dua rute dengan pembungkus itu, masing-masing dengan jenis jurnalnya:",
  "Tes `TestSemuaRuteLedgerLewatIdentitasKecualiHealthz` memindai kode dengan `go/ast` dan gagal bila rute di fungsi `rute()` dipasang tanpa pembungkus. Satu-satunya pengecualian adalah `GET /healthz`, yang hanya memeriksa database (dibaca dari kode lab). Karena itu halaman ini tidak menulis \"semua rute dilindungi\". `/healthz` tidak memeriksa identitas di handler, walau versi benar tetap menuntut sertifikat sah saat handshake (`mtls.txt` bagian A memanggilnya dengan sertifikat pembayaran).",
  "| Pemanggil | Jawaban | Ditolak di | Bukti |",
  "|---|---|---|---|",
  "| Tanpa sertifikat, dari CA lain, kedaluwarsa, atau kegunaan hanya untuk server | alert TLS | handshake | `mtls.txt` bagian B |",
  "| Rantai sah, tanpa tepat satu SAN identitas | 401 | handler | `mtls.txt` bagian D |",
  "| Identitas sah, tanpa izin jenis jurnal itu | 403 | handler | `mtls.txt` bagian C dan D |",
  "| Identitas sah, dengan izin | 201 | tidak ditolak | `mtls.txt` bagian C |",
  "**Kunci bersama dari Tahap 4 digantikan.** Ledger Tahap 4 menuntut satu nilai di header `X-Layanan-Kunci`, dan permintaan tanpa nilai itu dijawab 401 (Rekaman lab Tahap 4, `ledger.txt` bagian A, [[t4-modul]]). Kode `PasangLedger` menerima satu nilai kunci dan membandingkannya dengan header (dibaca dari kode lab). Kunci itu menunjukkan bahwa pemanggil memegangnya, bukan service mana yang memegangnya ([[t5-m47]]).",
  "mTLS mengubah tiga hal. Pertama, identitas: SAN menyebut service, dan ledger menjawab 403 untuk notifikasi serta 201 untuk pembayaran (`mtls.txt` bagian C). Kedua, izin: jenis jurnal dipisah per identitas, sedangkan satu kunci bersama membuka rute yang sama bagi semua pemegangnya (penalaran dari kode `PasangLedger`). Ketiga, rotasi: satu nilai bersama diganti di semua pemegangnya, sedangkan tiap service punya sertifikat dan umur sendiri (penalaran, rotasi Tidak dijalankan).",
  "Versi benar di lab ini tidak memasang pemeriksa kunci itu. Pemeriksanya tetap ada di kode bersama dan dijaga tes (README lab). Naskah tidak menulis nasib kunci bersama, jadi pencabutannya dari jalur ke ledger adalah keputusan ADR di bawah.",
  "**Idempotency-Key tetap dipakai.** mTLS menjawab siapa yang memanggil, dan Idempotency-Key menjawab permintaan yang mana. Permintaan yang sama dua kali lewat pembayaran menghasilkan satu jurnal: 201, lalu 200 (`idempoten.txt` bagian A). Key baru dari pembayaran yang sah, dengan akun dan jumlah yang sama, menghasilkan jurnal kedua (`idempoten.txt` bagian C). Service sah yang dibajak tetap memegang izin jenis jurnalnya, dan lab tidak membuktikan sebaliknya (README lab).",
  "**Sertifikat punya asal, umur, dan rotasi.** Lab membuat CA saat dijalankan dan menerbitkan sertifikat service dari CA itu, ditambah satu sertifikat uji dari CA lain. Kunci privat berizin 0600 disimpan di folder sementara di luar repo, dan kunci CA tidak ditulis (`mtls.txt` bagian A). Rotasi otomatis Tidak dijalankan: tidak ada rekaman yang mengganti sertifikat.",
  "Naskah memilih cert-manager v1.21.3 untuk menerbitkan dan memutar sertifikat. Rilis itu terbit 2026-10-23 di GitHub (dibuka 2026-11-04, Tidak dijalankan). Dokumentasinya menulis bahwa cert-manager membuat sertifikat TLS untuk workload di cluster dan memperbaruinya sebelum kedaluwarsa. Nilai bawaan `spec.duration` sebuah Certificate adalah 90 hari ([cert-manager: Certificate](https://cert-manager.io/docs/usage/certificate/), dokumen tanpa nomor versi, dibuka 2026-11-04).",
  "Dokumentasi issuer CA di cert-manager memuat peringatan. Issuer CA umumnya untuk demo atau user berpengalaman yang punya perkakas PKI. Pemakaian aman di produksi menuntut perencanaan rotasi, distribusi trust store, dan pemulihan bencana ([cert-manager: CA](https://cert-manager.io/docs/configuration/ca/), dokumen tanpa nomor versi, dibuka 2026-11-04). Naskah tidak menulis jenis issuer yang dipakai Rekeningo, jadi peringatan itu adalah risiko yang harus dijawab sebelum CA internal dipakai.",
  "SPIRE adalah toolchain yang dapat memverifikasi software yang berjalan dan menerbitkan SPIFFE ID serta SVID untuknya, sehingga dua workload bisa saling percaya lewat koneksi mTLS atau JWT. SVID adalah SPIFFE Verifiable Identity Document ([README SPIRE](https://github.com/spiffe/spire), rilis v1.15.5 terbit 2026-10-20, dibuka 2026-11-04, Tidak dijalankan).",
  "**Yang tidak direkam.**",
  "- Laras, minggu 9, dan pod uji berasal dari cerita (Ilustrasi). Pemanggil di rekaman adalah perintah `panggil` dan service notifikasi lab di mesin yang sama dengan ledger.",
  "- NetworkPolicy dan jaringan yang menegakkannya Tidak dijalankan. Plugin jaringan di cluster Rekeningo belum ditentukan [perlu verifikasi].",
  "- Rotasi sertifikat, cert-manager, SPIFFE/SPIRE, dan service mesh Tidak dijalankan.",
  "- Service pembayaran, cicilan, dan merchant yang dibajak tidak direkam. Lab tidak menguji kapasitas ledger dan tidak mengklaimnya.",
  "### Di stack lain",
  "**Skenario:** satu service memanggil ledger lewat HTTPS, dan ledger harus tahu service mana yang memanggil dari sertifikat client. Yang ditanyakan: di mana server menuntut sertifikat client, dan di mana nama service dibaca?",
  "Tab Go dijalankan di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-11-04. Kode di tab lain adalah Ilustrasi.",
  "*Dijalankan: lab t5-service atas api-t5, PostgreSQL 17.11, Go 1.27.3 (rekaman `mtls.txt`).*",
  "**Yang berbeda di stack ini:** server menuntut sertifikat client lewat `ClientAuth` di `tls.Config`, dan nama service dibaca dari `VerifiedChains` di kode ledger sendiri. Izin per jenis jurnal ditulis di kode yang sama.",
  "*Tidak dijalankan. Dicek ke [Node.js v26.13.0: tls](https://nodejs.org/api/tls.html), dibuka 2026-11-04. Kode di bawah adalah Ilustrasi.*",
  "  { key, cert, ca, requestCert: true, rejectUnauthorized: true },",
  "  (socket) => {",
  "    const nama = socket.getPeerCertificate().subjectaltname;",
  "  },",
  ");`} />",
  "**Yang berbeda di stack ini:** dokumentasi menulis bahwa `requestCert` bawaannya `false`, dan `rejectUnauthorized` hanya berpengaruh bila `requestCert` bernilai `true`. `subjectaltname` adalah string gabungan nama yang opsional, jadi kode sendiri harus mengurai string itu dan menangani objek kosong yang dikembalikan bila client tidak mengirim sertifikat. Dokumentasi juga menulis bahwa, tergantung pengaturan server, koneksi yang tidak berotorisasi masih bisa diterima.",
  "*Tidak dijalankan. Dicek ke [Laravel 13.x: HTTP Client](https://laravel.com/docs/13.x/http-client) dan [Guzzle: request options](https://docs.guzzlephp.org/en/stable/request-options.html) (dokumen tanpa nomor versi), dibuka 2026-11-04. Kode di bawah adalah Ilustrasi.*",
  "    'cert' => '/etc/mtls/pembayaran.pem',",
  "    'ssl_key' => '/etc/mtls/pembayaran.key',",
  "])->withHeaders(['Idempotency-Key' => $kunci])",
  "  ->post('https://ledger.t5.lab/ledger/jurnal-topup', $isi);`} />",
  "**Yang berbeda di stack ini:** Laravel membungkus Guzzle, dan opsi Guzzle diteruskan lewat `withOptions`. Guzzle menulis bahwa `cert` menunjuk file sertifikat client berformat PEM, dan bahwa `ssl_key` saat ini hanya didukung handler cURL. Halaman yang dibuka membahas sisi pemanggil. Siapa yang memverifikasi sertifikat client di sisi penerima tidak ditulis di sana.",
  "*Tidak dijalankan. Dicek ke [Django 5.2: How to authenticate using REMOTE_USER](https://docs.djangoproject.com/en/5.2/howto/auth-remote-user/), dibuka 2026-11-04. Kode Python tidak ditulis di tab ini.*",
  "**Yang berbeda di stack ini:** dokumentasi menulis bahwa bila web server yang mengurus autentikasi, ia biasanya menyediakan user terautentikasi sebagai `REMOTE_USER`, dan `RemoteUserMiddleware` membacanya. Halaman itu tidak menyebut sertifikat client. Ia memperingatkan bahwa middleware itu tidak boleh dipakai bila client bisa mengirim header sendiri, dan peringatan itu berlaku di ASGI untuk semua konfigurasi. Ini sejajar dengan header `X-Layanan-Nama` di bagian D rekaman, yang diabaikan ledger. Verifikasi sertifikat terjadi di web server di depan Django, dan daftar jenis jurnal tetap ditulis di kode aplikasi (penalaran).",
  "*Tidak dijalankan. Dicek ke [Serverpod: Security and TLS](https://docs.serverpod.dev/concepts/operations/security-and-tls), teks mentah dari llms-full.txt dokumentasi untuk Serverpod 4.1.0, dibuka 2026-11-04. Kode Dart tidak ditulis di tab ini.*",
  "**Yang berbeda di stack ini:** halaman itu menulis bahwa TLS biasanya dihentikan di depan server oleh load balancer atau reverse proxy, dan bahwa Serverpod bisa menghentikan TLS sendiri lewat `SecurityContextConfig` dengan rantai sertifikat dan kunci privat. Pencarian `client certificate`, `mTLS`, `mutual TLS`, dan `requestClientCertificate` di seluruh dokumentasi mentah tidak menemukan apa pun, jadi sertifikat client tidak dibahas. Identitas pemanggil harus datang dari proxy atau kode sendiri (penalaran).",
  "*Tidak dijalankan. Dicek ke [Supabase: SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement) dan [Supabase: Network restrictions](https://supabase.com/docs/guides/platform/network-restrictions), halaman tanpa nomor versi, dibuka 2026-11-04.*",
  "**Yang berbeda di stack ini:** halaman SSL enforcement membahas mode `verify-full`, yaitu client memverifikasi sertifikat server database, dan tidak menyebut sertifikat client. Network restrictions membatasi lewat daftar CIDR dan, menurut halamannya, hanya berlaku untuk Postgres dan database pooler, bukan HTTPS API seperti PostgREST, Storage, dan Auth. Yang dibahas kedua halaman adalah alamat pemanggil dan sertifikat server, bukan identitas pemanggil (penalaran).",
  "### ADR 53: mTLS di Go dengan daftar jenis jurnal per identitas",
  "**Kebutuhan.** Ledger dipanggil tiga service: pembayaran, cicilan, dan merchant (Asumsi dari naskah, [[t5-service]]). Aturan inti Tahap 5 menulis bahwa uang bergerak hanya lewat ledger ([[t5-fitur-teknis]]). Ledger versi pertama membuat jurnal top-up Rp1.000 untuk pemanggil tanpa sertifikat, dan saldo akun uji naik dari 0 ke 1.000 ([[t5-m47]], `rentan.txt` bagian A).",
  "**Status:** diterima sesudah M47 (minggu 9). Urutan itu dibaca dari tabel masalah, karena naskah tidak menulis tanggal ADR.",
  "| | A. Jaringan privat dipercaya | B. Token bearer per service | C. Service mesh penuh | D. SPIFFE/SPIRE v1.15.5 | E. mTLS di Go dan daftar jenis jurnal |",
  "|---|---|---|---|---|---|",
  "| Cara kerja | Ledger menerima pemanggil yang sampai ke port-nya, dan batasnya hanya jaringan | Tiap service membawa token di header, dan ledger memeriksanya | Proxy di jalur tiap panggilan mengurus identitas dan TLS (naskah) | SPIRE memverifikasi workload dan menerbitkan SPIFFE ID dalam SVID | Server menuntut sertifikat client, identitas dibaca dari SAN, dan ledger memeriksa jenis jurnal per identitas |",
  "| Kelebihan | Tanpa kode atau sertifikat baru | Tanpa TLS dua arah (penalaran) | TLS timbal balik dan retry seragam, seperti pemicu ADR 45 (naskah) | Identitas workload seragam bila jalur bertambah (naskah) | Penolakan sebelum handler, dan izin per jenis jurnal, tanpa komponen baru di jalur panggilan |",
  "| Kekurangan | Pod uji tanpa sertifikat membuat jurnal Rp1.000 (`rentan.txt` bagian A) | Pemegang token mana pun bisa memakainya ulang, dan naskah menulis token bocor lewat log | Satu komponen di jalur tiap panggilan, untuk satu tujuan kritis (naskah) | Satu sistem tambahan yang dipasang dan dijaga (penalaran) | Sertifikat harus diterbitkan dan diputar, dan mTLS tidak menilai niat |",
  "| Biaya operasional | Nol, dengan harga jurnal dari pemanggil mana pun | Token disimpan, diputar, dan dijaga dari log | Dioperasikan tim platform 4 orang (naskah) | Pemasangan dan operasi sistem tambahan, tidak diukur (penalaran) | Rotasi sertifikat dan daftar izin dipantau (desain, Tidak dijalankan) |",
  "| Bukti | Rekaman lab `rentan.txt` bagian A | Tidak dijalankan: RFC 9700 dan naskah | Tidak dijalankan: naskah | Tidak dijalankan: README SPIRE dan spesifikasi X.509-SVID | Rekaman lab `mtls.txt` bagian B sampai D dan `idempoten.txt` |",
  "**Keputusan: opsi E.** Delapan aturan:",
  "1. Panggilan ke ledger memakai mTLS: server menuntut sertifikat client yang valid (`RequireAndVerifyClientCert`) dari CA internal. Server lab menuntut TLS 1.3 sebagai versi terendah, dan itu pilihan lab.",
  "2. Identitas pemanggil adalah satu-satunya SAN DNS `<nama>.<domain>` pada rantai yang lolos verifikasi. CN dan header diabaikan, dan sertifikat tanpa tepat satu SAN identitas dijawab 401.",
  "3. Ledger menyimpan daftar jenis jurnal per identitas: `pembayaran` (topup_bank, kartu_tahan, kartu_tangkap), `cicilan` (angsuran, tabungan), dan `merchant` (bayar). `notifikasi` dan `akun` tidak boleh membuat jurnal. Identitas di luar daftar tidak punya izin, dan jenis di luar izin dijawab 403.",
  "4. Tiap rute ledger yang membuat jurnal dibungkus pemeriksa itu, dan tes yang memindai kode dengan `go/ast` menjaganya. Pengecualiannya `GET /healthz`.",
  "5. Idempotency-Key tetap di semua panggilan yang mengubah keadaan. Ia mencegah pemrosesan ganda, bukan pemanggil yang tidak berhak.",
  "6. Sertifikat berasal dari CA internal dan diputar otomatis. Naskah menulis cert-manager v1.21.3, dan jenis issuer-nya belum ditentukan (Tidak dijalankan).",
  "7. NetworkPolicy membatasi pod yang boleh menjangkau ledger [perlu verifikasi: jaringan yang menegakkannya]. Aturan ini Tidak dijalankan.",
  "8. Pemeriksa kunci bersama `X-Layanan-Kunci` dicabut dari jalur ke ledger sesudah semua pemanggilnya memakai sertifikat. Ini keputusan halaman ini, karena naskah tidak menulis nasib kunci itu.",
  "**Kenapa E, bukan A sampai D.**",
  "- **A ditolak** karena pod uji tanpa sertifikat membuat jurnal dan saldo akun uji naik dari 0 ke 1.000 (`rentan.txt` bagian A).",
  "- **B ditolak untuk sekarang.** RFC 9700 menulis bahwa authorization server SHOULD memastikan token akses terikat pengirim, dan menyebut akses baca ke log web server sebagai contoh akses sebagian ([RFC 9700](https://www.rfc-editor.org/rfc/rfc9700), bagian 4.9.3 dan 4.10, Januari 2025, dibuka 2026-11-04). Bagian 4.10.1 menyebut dua cara: sertifikat client lewat RFC 8705 dan DPoP lewat RFC 9449, yaitu tanda tangan di tingkat aplikasi ([RFC 9449](https://www.rfc-editor.org/rfc/rfc9449), September 2023). RFC itu mengatur token akses OAuth 2.0, jadi halaman ini memakainya sebagai rujukan untuk masalah yang sama, bukan sebagai aturan bagi Rekeningo (penalaran). Opsi ini tidak ada rekamannya (Tidak dijalankan).",
  "- **C ditunda.** Naskah menulis proxy di jalur tiap panggilan sebagai biaya, untuk satu tujuan kritis dan tim platform 4 orang. Dokumentasi Istio dan Linkerd tidak dibuka (Tidak dijalankan).",
  "- **D disebut, bukan dipilih.** Naskah menulis SPIFFE/SPIRE sebagai pelengkap mTLS bila jalur bertambah. README SPIRE dan spesifikasi X.509-SVID dibuka, dan SPIRE Tidak dijalankan.",
  "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:",
  "1. Sertifikat kedaluwarsa tanpa rotasi. Satu sertifikat kedaluwarsa ditolak saat handshake (`mtls.txt` bagian B), jadi service pemegangnya tidak bisa memanggil ledger. Pencegahannya rotasi otomatis dan alert untuk sisa umur sertifikat. Ini desain, dan lab tidak membangunnya (Tidak dijalankan).",
  "2. Kunci CA bocor, atau satu service sah dibajak. mTLS menerima sertifikat dari CA yang dipercaya, dan service sah yang dibajak tetap memegang izin jenis jurnalnya (README lab). Pencegahannya izin sempit per identitas dan kunci CA yang dijaga di luar service (penalaran).",
  "3. Daftar jenis jurnal salah. Jenis yang lupa didaftar menolak pemanggil sah dengan 403, dan izin yang terlalu longgar membuka jenis yang tidak seharusnya. Pencegahannya tes yang membandingkan daftar dengan constraint `jurnal_jenis_check` dan pemindai rute, keduanya sudah ada di lab.",
  "**Kapan keputusan ini salah.**",
  "- Saat tujuan kritis kedua, selain ledger, butuh identitas yang sama. Pembandingnya tiga pemanggil ke satu ledger, yaitu satu tujuan kritis (Asumsi dari naskah). Pemicu service mesh di [[t5-adr-60]] memakai satuan tujuan kritis, dan mesh atau SPIFFE lebih ringan daripada rotasi dengan tangan.",
  "- Saat sertifikat kedaluwarsa tanpa rotasi otomatis, karena semua panggilan dari service pemegangnya gagal di handshake.",
  "- Saat service sah dibajak. mTLS membuktikan siapa yang memanggil, bukan niatnya.",
  "- Saat daftar jenis jurnal salah menolak pemanggil sah atau menerima pemanggil yang tidak berhak.",
  "**Yang akan merevisinya.** [[t5-adr-60]] menulis service mesh penuh sebagai sengaja belum, dengan pemicu tujuan kritis kedua. Bila pemicu itu terjadi, ADR 53 ditinjau ulang.",
  "### Sengaja belum dilakukan",
  "| Yang ditunda | Kenapa ditunda | Muncul lagi di |",
  "|---|---|---|",
  "| Service mesh penuh | Satu tujuan kritis, yaitu ledger, dipanggil tiga service | [[t5-adr-60]] |",
  "| SPIFFE/SPIRE | Disebut sebagai pelengkap bila jalur bertambah, dan Tidak dijalankan | Belum dijadwalkan |",
  "| Rotasi sertifikat otomatis | Lab hanya merekam pembacaan ulang file server, bukan penerbitan atau penggantian | Belum dijadwalkan |",
  "| NetworkPolicy dan jaringan penegaknya | Tidak dijalankan [perlu verifikasi] | Belum dijadwalkan |",
  "| Pencabutan sertifikat sebelum kedaluwarsa | Lab tidak menerbitkan CRL dan tidak menjawab OCSP: kata CRL di kode lab hanya muncul sebagai bit kegunaan kunci CA (pencarian 2026-11-04) | Belum dijadwalkan |",
  "| Rute ledger untuk kartu_tangkap, angsuran, tabungan, dan bayar | Izinnya tercatat, tetapi rutenya belum ada di lab | Belum dijadwalkan |",
  "### Cek diri",
  "**1.** Sertifikat notifikasi sah, tetapi permintaannya dijawab 403 dan bukan ditolak di handshake. Kenapa dua jawaban berbeda?",
  "Handshake memeriksa rantai sertifikat: CA penerbit, masa berlaku, dan kegunaannya. Sertifikat notifikasi lolos pemeriksaan itu. Handler membaca identitas notifikasi dan mencocokkannya dengan daftar jenis jurnal, dan notifikasi tidak punya topup_bank, jadi jawabannya 403 (`mtls.txt` bagian C).",
  "**2.** Server hanya meminta sertifikat client tanpa memverifikasinya. Kenapa lab tetap tidak membuat jurnal untuk sertifikat dari CA lain?",
  "Handler membaca identitas hanya dari rantai yang sudah terverifikasi, dan rantai itu kosong di server yang hanya meminta sertifikat. Handler menjawab 401 tanpa identitas. Ini diperiksa tes Go `TestSertifikatTakTerverifikasiTidakDipakaiSebagaiIdentitas` (dibaca dari kode lab), bukan bagian di `mtls.txt`.",
  "**3.** Service pembayaran yang sah mengirim key baru dengan akun dan jumlah yang sama. Apa yang tidak dihentikan mTLS?",
  "Jurnal kedua. mTLS menjawab siapa yang memanggil, bukan niatnya, dan key baru adalah permintaan baru. Pembayaran punya izin topup_bank, jadi ledger menjawab 201 (`idempoten.txt` bagian C).",
  "**4.** ADR 53 memilih mTLS di Go dan menunda service mesh. Apa yang membuat pilihan ini salah?",
  "Tujuan kritis kedua selain ledger yang butuh identitas yang sama, sertifikat kedaluwarsa tanpa rotasi otomatis, service sah yang dibajak, dan daftar jenis jurnal yang salah. Pembandingnya tiga pemanggil ke satu ledger.",
  "### Saat me-review kode AI, cek ini",
  "- [ ] Server menuntut sertifikat client dengan `RequireAndVerifyClientCert`, bukan `RequestClientCert` atau `VerifyClientCertIfGiven`.",
  "- [ ] Identitas dibaca dari `VerifiedChains`, bukan `PeerCertificates`, CN, atau header.",
  "- [ ] Identitas berasal dari tepat satu SAN, dan nama yang mirip ditolak.",
  "- [ ] Tiap rute yang membuat jurnal dibungkus pemeriksa izin, dan tes memindai rute baru.",
  "- [ ] Jenis di daftar izin cocok dengan constraint jenis jurnal di database.",
  "- [ ] Idempotency-Key tetap dipakai, dan tidak dianggap izin pemanggil.",
  "- [ ] Sertifikat punya rotasi dan alert sisa umur, dan kunci CA tidak ada di repo.",
  "### Bacaan lanjut",
  "- [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446)",
  "- [RFC 5280: profil sertifikat X.509](https://www.rfc-editor.org/rfc/rfc5280)",
  "- [Go: crypto/tls](https://pkg.go.dev/crypto/tls)",
  "- [RFC 9700: praktik terbaik keamanan OAuth 2.0](https://www.rfc-editor.org/rfc/rfc9700)",
  "- [RFC 9449: DPoP](https://www.rfc-editor.org/rfc/rfc9449)",
  "- [RFC 8705: OAuth 2.0 mutual TLS](https://www.rfc-editor.org/rfc/rfc8705)",
  "- [cert-manager: Certificate](https://cert-manager.io/docs/usage/certificate/)",
  "- [cert-manager: CA](https://cert-manager.io/docs/configuration/ca/)",
  "- [SPIFFE: X.509-SVID](https://github.com/spiffe/spiffe/blob/main/standards/X509-SVID.md)",
  "- [SPIRE](https://github.com/spiffe/spire)",
  "- [Node.js: tls](https://nodejs.org/api/tls.html)",
  "- [Laravel 13.x: HTTP Client](https://laravel.com/docs/13.x/http-client)",
  "- [Guzzle: request options](https://docs.guzzlephp.org/en/stable/request-options.html)",
  "- [Django 5.2: REMOTE_USER](https://docs.djangoproject.com/en/5.2/howto/auth-remote-user/)",
  "- [Serverpod: Security and TLS](https://docs.serverpod.dev/concepts/operations/security-and-tls)",
  "- [Supabase: SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement)",
  "- [Supabase: Network restrictions](https://supabase.com/docs/guides/platform/network-restrictions)"
];
const proseUtuh = badan.split("\n").filter((b) => b.trim() && (!b.startsWith("<") || (b.startsWith("<summary>") && b !== "<summary>Jawaban</summary>")));
const TEBAK_UTUH = {
  "id": "t5-mtls-tebak",
  "judul": "Sertifikat yang CN-nya pembayaran dan SAN-nya notifikasi",
  "sumber": {
    "jenis": "rekaman",
    "teks": "labs/t5-service/output/mtls.txt bagian D"
  },
  "adegan": [
    "Lab menerbitkan satu sertifikat uji dari CA yang sama dengan CA ledger. CN, yaitu kolom nama di subjek sertifikat, berisi pembayaran. SAN, yaitu daftar nama yang disahkan CA, hanya memuat notifikasi.t5.lab.",
    "Sertifikat itu belum kedaluwarsa dan kegunaannya untuk client. Pemanggil membawanya ke ledger dengan mTLS dan meminta jurnal topup_bank untuk akun uji."
  ],
  "pertanyaan": "Apa jawaban ledger?",
  "pilihan": [
    {
      "teks": "Ledger menjawab 201: CN berisi pembayaran, jadi ledger memperlakukannya sebagai pembayaran dan membuat jurnal topup_bank.",
      "benar": false,
      "alasan": "Ledger tidak membaca CN. Di rekaman bagian D, sertifikat ini dijawab 403 atas nama notifikasi, dan jumlah jurnal topup_bank untuk akun uji tetap 0."
    },
    {
      "teks": "Ledger menjawab 403: ia membaca identitas notifikasi dari SAN, dan notifikasi tidak boleh membuat jurnal topup_bank.",
      "benar": true,
      "alasan": "Rekaman bagian D: status 403 dengan identitas notifikasi dan jenis topup_bank. Identitas dibaca dari SAN pada rantai yang lolos verifikasi, bukan dari CN."
    },
    {
      "teks": "Ditolak saat handshake, karena CN dan SAN berbeda.",
      "benar": false,
      "alasan": "Penolakan di handshake di rekaman bagian B berasal dari rantai yang tidak sah: tanpa sertifikat, CA lain, kedaluwarsa, atau kegunaan hanya untuk server. Sertifikat ini sah, jadi handshake lolos dan handler yang menjawab."
    },
    {
      "teks": "Ledger menjawab 401: sertifikat ini tidak membawa identitas yang bisa dibaca.",
      "benar": false,
      "alasan": "Jawaban 401 di rekaman bagian D hanya untuk sertifikat tanpa SAN. Sertifikat ini punya tepat satu SAN berbentuk nama.t5.lab, jadi identitasnya terbaca: notifikasi."
    }
  ],
  "penutup": "Ledger membaca identitas dari SAN pada rantai yang lolos verifikasi. CN dan header tidak dipakai, jadi sertifikat itu bertindak sebagai notifikasi dan dijawab 403.",
  "label": {
    "sumber": "Rekaman lab · mtls.txt",
    "tebakDulu": "Tebak dulu:",
    "benar": "Tepat",
    "belum": "Belum tepat",
    "ulang": "Coba pilihan lain",
    "jawaban": "Jawaban yang tepat"
  }
};
const RANTAI_UTUH = {
  "id": "t5-mtls-inti",
  "judul": "Dua lapis penolakan di ledger",
  "sumber": {
    "jenis": "rekaman",
    "teks": "Rekaman lab t5-service · mtls.txt"
  },
  "baris": [
    {
      "label": "Tanpa sertifikat",
      "sub": "bagian B",
      "simpul": [
        {
          "teks": "Handshake TLS",
          "sub": "tanpa sertifikat client"
        },
        {
          "teks": "Alert dari server",
          "sub": "certificate required"
        },
        {
          "teks": "Jurnal tetap 0",
          "sub": "handler tidak jalan",
          "nada": "good"
        }
      ]
    },
    {
      "label": "Sertifikat notifikasi",
      "sub": "bagian C dan D",
      "simpul": [
        {
          "teks": "Minta topup_bank",
          "sub": "sertifikat sah, tanpa izin"
        },
        {
          "teks": "403",
          "sub": "jenis-tidak-diizinkan",
          "nada": "good"
        },
        {
          "teks": "Jurnal akun uji 0",
          "sub": "topup_bank, bagian D",
          "nada": "good"
        }
      ]
    }
  ],
  "catatan": "Hijau menandai hasil yang diinginkan: tidak ada jurnal dari pemanggil tanpa izin. Pemanggil di rekaman adalah perintah panggil dan service notifikasi lab di mesin yang sama dengan ledger, bukan pod di cluster."
};
const BANDING_UTUH = {
  "judul": "Ledger versi pertama atau ledger dengan mTLS dan daftar jenis jurnal",
  "opsi": [
    {
      "id": "rentan",
      "nama": "A · Versi pertama (mode rentan)",
      "baris": [
        [
          {
            "id": "pemanggil",
            "label": "Pemanggil",
            "sub": "siapa pun yang sampai ke port"
          },
          {
            "id": "pintu",
            "label": "Port ledger",
            "sub": "HTTP biasa, tanpa handshake TLS"
          },
          {
            "id": "handler",
            "label": "Handler jurnal",
            "sub": "topup_bank dan kartu_tahan"
          }
        ],
        [
          {
            "id": "identitas",
            "label": "Identitas pemanggil",
            "sub": "tidak dibaca"
          },
          {
            "id": "daftar",
            "label": "Daftar jenis jurnal",
            "sub": "tidak ada"
          },
          {
            "id": "key",
            "label": "Idempotency-Key",
            "sub": "menandai permintaan"
          }
        ]
      ],
      "judulBaris": [
        "",
        "Yang diperiksa ledger"
      ]
    },
    {
      "id": "mtls",
      "nama": "B · mTLS dan daftar jenis jurnal (pilihan ADR 53)",
      "baris": [
        [
          {
            "id": "pemanggil",
            "label": "Pemanggil",
            "sub": "sertifikat dari CA ledger"
          },
          {
            "id": "pintu",
            "label": "Port ledger",
            "sub": "HTTPS, sertifikat client wajib"
          },
          {
            "id": "handler",
            "label": "Handler jurnal",
            "sub": "dibungkus identitas.Wajib"
          }
        ],
        [
          {
            "id": "identitas",
            "label": "Identitas pemanggil",
            "sub": "satu SAN dari rantai terverifikasi"
          },
          {
            "id": "daftar",
            "label": "Daftar jenis jurnal",
            "sub": "per identitas"
          },
          {
            "id": "key",
            "label": "Idempotency-Key",
            "sub": "tetap, bukan otorisasi"
          }
        ]
      ],
      "judulBaris": [
        "",
        "Yang diperiksa ledger"
      ]
    }
  ],
  "fitur": [
    {
      "label": "Pemanggil tanpa sertifikat",
      "sorot": {
        "rentan": [
          "pemanggil",
          "pintu",
          "handler"
        ],
        "mtls": [
          "pemanggil",
          "pintu"
        ]
      },
      "catatan": {
        "rentan": "Ledger menjawab 201 dan membuat jurnal topup Rp1.000 untuk akun uji. Saldo akun itu naik dari 0 ke 1.000 (Rekaman lab, rentan.txt bagian A).",
        "mtls": "Server mengirim alert certificate required. Handler tidak jalan, dan jurnal untuk key itu 0 (Rekaman lab, rentan.txt bagian B dan mtls.txt bagian B)."
      },
      "nada": {
        "rentan": "warn"
      }
    },
    {
      "label": "Sertifikat notifikasi minta topup_bank",
      "sorot": {
        "rentan": [
          "handler",
          "identitas",
          "daftar"
        ],
        "mtls": [
          "identitas",
          "daftar",
          "handler"
        ]
      },
      "catatan": {
        "rentan": "Tidak direkam. Rute mode rentan dipasang tanpa pembungkus, jadi tidak ada bagian yang membedakan notifikasi dari pemanggil lain (penalaran dari kode lab, Tidak dijalankan).",
        "mtls": "Handshake lolos. Handler membaca identitas notifikasi dan menjawab 403 jenis-tidak-diizinkan (Rekaman lab, mtls.txt bagian C)."
      },
      "nada": {
        "rentan": "warn"
      }
    },
    {
      "label": "Sertifikat pembayaran minta topup_bank",
      "sorot": {
        "rentan": [
          "pemanggil",
          "handler"
        ],
        "mtls": [
          "pemanggil",
          "identitas",
          "daftar",
          "handler"
        ]
      },
      "catatan": {
        "rentan": "Tidak direkam untuk pembayaran. Pod uji tanpa sertifikat di bagian A dijawab 201 oleh handler yang sama (penalaran dari kode lab).",
        "mtls": "Identitas pembayaran punya izin topup_bank. Ledger menjawab 201 dan membuat satu jurnal topup_bank (Rekaman lab, mtls.txt bagian C)."
      }
    },
    {
      "label": "Key baru dari pemanggil yang sah",
      "sorot": {
        "rentan": [
          "key",
          "handler"
        ],
        "mtls": [
          "key",
          "handler"
        ]
      },
      "catatan": {
        "rentan": "Tidak direkam. Handler membaca key dan isi permintaan, tanpa parameter pemanggil (penalaran dari kode lab).",
        "mtls": "Pembayaran dengan sertifikat sah dan key baru membuat jurnal kedua untuk akun dan jumlah yang sama: 201, dan tiga jurnal topup_bank berjumlah Rp600.000 (Rekaman lab, idempoten.txt bagian C). mTLS menjawab siapa, bukan niatnya."
      },
      "nada": {
        "mtls": "warn"
      }
    }
  ]
};
const ISTILAH_MTLS_UTUH = {
  "istilah": "mTLS (mutual TLS)",
  "sehari_hari": "mTLS adalah TLS dua arah. Selain client memeriksa sertifikat server, server meminta sertifikat dari client dan memeriksanya terhadap CA yang ia percaya.",
  "cerita": [
    {
      "rujukan": "t5-m47",
      "teks": "Pod uji di cerita memanggil ledger tanpa sertifikat, dan ledger versi pertama membuat jurnal untuk pemanggil itu. Di versi dengan mTLS, pemanggil tanpa sertifikat ditolak saat handshake dan jurnal untuk key itu tetap 0 (Rekaman lab, `rentan.txt` bagian B)."
    }
  ],
  "mekanisme": [
    "Server meminta sertifikat client saat handshake. Di Go, nilai `ClientAuth` yang mewajibkan sertifikat valid adalah `RequireAndVerifyClientCert`.",
    "Server memeriksa rantai sertifikat client terhadap CA yang ia percaya, masa berlakunya, dan kegunaannya.",
    "Sertifikat yang tidak lolos membuat server menghentikan handshake dengan alert, dan handler aplikasi tidak berjalan.",
    "Aplikasi membaca nama pemanggil dari sertifikat yang lolos, misalnya dari SAN, lalu memutuskan apa yang boleh dilakukan pemanggil itu."
  ],
  "stack": null,
  "jebakan": [
    "Memakai `RequestClientCert` atau `VerifyClientCertIfGiven` dan mengira pemanggil tanpa sertifikat pasti ditolak. Dokumentasi Go menulis bahwa kedua nilai itu tidak mewajibkan client mengirim sertifikat.",
    "Mengira mTLS menilai niat pemanggil. mTLS menunjukkan siapa yang memanggil, dan service sah yang dibajak tetap memegang izinnya."
  ],
  "terkait": [
    "CA (Certificate Authority)",
    "Handshake TLS",
    "SAN (Subject Alternative Name)"
  ],
  "sumber": [
    {
      "riset": "R5-200",
      "judul": "RFC 8446 bagian 4.4.2.4 dan Go crypto/tls (dibuka 2026-11-04)",
      "url": "https://www.rfc-editor.org/rfc/rfc8446",
      "catatan": "Bila client tidak mengirim sertifikat, server boleh meneruskan handshake atau menghentikannya dengan alert certificate_required. Dokumentasi Go crypto/tls membedakan nilai ClientAuth yang mewajibkan sertifikat valid dari yang tidak."
    }
  ]
};
const ISTILAH_SAN_UTUH = {
  "istilah": "SAN (Subject Alternative Name)",
  "sehari_hari": "SAN adalah daftar nama di sertifikat X.509 yang disahkan CA, misalnya nama DNS. Ledger membaca nama service dari SAN, bukan dari CN.",
  "cerita": [
    {
      "rujukan": "t5-mtls",
      "teks": "Lab menerbitkan sertifikat yang CN-nya pembayaran dan SAN-nya notifikasi. Ledger menjawab 403 atas nama notifikasi, karena identitas dibaca dari SAN (Rekaman lab, `mtls.txt` bagian D)."
    }
  ],
  "mekanisme": [
    "CA menandatangani sertifikat bersama ekstensi SAN, yang memuat nama seperti nama DNS, alamat IP, atau URI.",
    "Setelah handshake lolos, server membaca SAN dari sertifikat daun pada rantai yang sudah terverifikasi.",
    "Ledger lab menuntut tepat satu SAN DNS berbentuk `<nama>.t5.lab`. Sertifikat tanpa SAN itu dijawab 401.",
    "Nama yang sudah dibaca dicocokkan dengan daftar jenis jurnal yang boleh dibuat identitas itu."
  ],
  "stack": null,
  "jebakan": [
    "Membaca identitas dari CN atau dari header. Di lab, sertifikat ber-CN pembayaran dan ber-SAN notifikasi bertindak sebagai notifikasi, dan header yang menyebut pembayaran tidak mengubah apa pun.",
    "Membaca SAN dari sertifikat yang belum terverifikasi. Lab membaca `VerifiedChains`, bukan `PeerCertificates`."
  ],
  "terkait": [
    "mTLS (mutual TLS)",
    "CA (Certificate Authority)"
  ],
  "sumber": [
    {
      "riset": "R5-200",
      "judul": "RFC 5280 bagian 4.2.1.6 (dibuka 2026-11-04)",
      "url": "https://www.rfc-editor.org/rfc/rfc5280",
      "catatan": "Ekstensi subject alternative name mengikat identitas ke subjek sertifikat. Pilihan yang ditentukan: alamat email, nama DNS, alamat IP, dan URI."
    }
  ]
};
const KARTU_UTUH = [
  {
    "id": "t5-mtls-1",
    "halaman": "t5-mtls",
    "judul": "5.19 Keamanan 10: Identitas antar service, mTLS + ADR 53",
    "url": "tahap-5/mtls-antar-service/",
    "tanya": "Sertifikat notifikasi sah, tetapi permintaannya dijawab 403 dan bukan ditolak di handshake. Kenapa dua jawaban berbeda?",
    "jawab": "Handshake memeriksa rantai sertifikat: CA penerbit, masa berlaku, dan kegunaannya. Sertifikat notifikasi lolos pemeriksaan itu. Handler membaca identitas notifikasi dan mencocokkannya dengan daftar jenis jurnal, dan notifikasi tidak punya topup_bank, jadi jawabannya 403 (`mtls.txt` bagian C)."
  },
  {
    "id": "t5-mtls-2",
    "halaman": "t5-mtls",
    "judul": "5.19 Keamanan 10: Identitas antar service, mTLS + ADR 53",
    "url": "tahap-5/mtls-antar-service/",
    "tanya": "Server hanya meminta sertifikat client tanpa memverifikasinya. Kenapa lab tetap tidak membuat jurnal untuk sertifikat dari CA lain?",
    "jawab": "Handler membaca identitas hanya dari rantai yang sudah terverifikasi, dan rantai itu kosong di server yang hanya meminta sertifikat. Handler menjawab 401 tanpa identitas. Ini diperiksa tes Go `TestSertifikatTakTerverifikasiTidakDipakaiSebagaiIdentitas` (dibaca dari kode lab), bukan bagian di `mtls.txt`."
  },
  {
    "id": "t5-mtls-3",
    "halaman": "t5-mtls",
    "judul": "5.19 Keamanan 10: Identitas antar service, mTLS + ADR 53",
    "url": "tahap-5/mtls-antar-service/",
    "tanya": "Service pembayaran yang sah mengirim key baru dengan akun dan jumlah yang sama. Apa yang tidak dihentikan mTLS?",
    "jawab": "Jurnal kedua. mTLS menjawab siapa yang memanggil, bukan niatnya, dan key baru adalah permintaan baru. Pembayaran punya izin topup_bank, jadi ledger menjawab 201 (`idempoten.txt` bagian C)."
  },
  {
    "id": "t5-mtls-4",
    "halaman": "t5-mtls",
    "judul": "5.19 Keamanan 10: Identitas antar service, mTLS + ADR 53",
    "url": "tahap-5/mtls-antar-service/",
    "tanya": "ADR 53 memilih mTLS di Go dan menunda service mesh. Apa yang membuat pilihan ini salah?",
    "jawab": "Tujuan kritis kedua selain ledger yang butuh identitas yang sama, sertifikat kedaluwarsa tanpa rotasi otomatis, service sah yang dibajak, dan daftar jenis jurnal yang salah. Pembandingnya tiga pemanggil ke satu ledger."
  }
];

describe("lapis 1b: noscript diturunkan dari rekaman, paragraf utuh, dan JSON utuh", () => {
  test("noscript: dua paragraf, status dan alert diturunkan dari rentan.txt dan mtls.txt, dan satu penutup", () => {
    expect(jumlah(badan, "</noscript>")).toBe(1);
    const ns = cari(/<noscript>\n([\s\S]*?)\n<\/noscript>/, badan, "noscript")[1]!.split("\n");
    expect(ns).toEqual([
      `<p>Tanpa JavaScript tombol tebakan tidak berfungsi dan widget perbandingan tidak tampil. Jawaban yang tepat: ledger menjawab ${statusD[1]![1]} atas nama notifikasi, karena identitas dibaca dari SAN dan bukan dari CN (mtls.txt bagian D).</p>`,
      `<p>Ledger versi pertama menjawab ${statusRentanA} untuk pemanggil tanpa sertifikat (rentan.txt bagian A). Ledger dengan mTLS mengirim alert ${alertRentanB} untuk pemanggil yang sama dan menjawab ${statusC[2]![1]} untuk sertifikat notifikasi yang sah (rentan.txt bagian B dan mtls.txt bagian C).</p>`,
    ]);
  });
  test("paragraf utuh badan halaman sama dengan daftar di tes ini (setiap kalimat, tanpa tag), dalam urutan yang sama", () => {
    expect(proseUtuh).toEqual(PARAGRAF_UTUH);
  });
  test("tebakan, diagram, banding, halaman istilah, dan kartu: seluruh isi sama dengan yang ditulis di tes", () => {
    expect(tebakMentah).toEqual(TEBAK_UTUH);
    expect(rantaiMentah).toEqual(RANTAI_UTUH);
    expect(bandingMentah).toEqual(BANDING_UTUH);
    expect(istilahMtls).toEqual(ISTILAH_MTLS_UTUH);
    expect(istilahSan).toEqual(ISTILAH_SAN_UTUH);
    expect(kartuSemua.filter((x) => x.halaman === "t5-mtls")).toEqual(KARTU_UTUH);
  });
});
// <LITERAL-AKHIR>

// ---------------------------------------------------------------------------------------------------------------------
// Lapis 2: kunci kalimat dan sidik (dibangkitkan dari berkas saat ini oleh PERBARUI_KUNCI=1)
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "terbukti", "membantu", "dibaca", "diukur", "direkam", "dijalankan", "ditolak", "berhasil", "naik", "turun", "di atas", "di bawah", "tepat", "lama", "lebih", "dilewati", "habis", "key", "jurnal", "sebaiknya", "kadang", "menolak", "bawaan", "mana pun", "sah", "izin", "identitas"];
const sidikKata = (teks: string, kata: string[]): Record<string, number> =>
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
const angkaDari = (t: string): string[] => [...t.replace(/\]\([^)]*\)/g, "]").matchAll(/(?<![\w.])\d+(?:[.,]\d+)*(?!\w)/g)].map((m) => m[0]);
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
const kartuMtls = kartuSemua.filter((x) => x.halaman === "t5-mtls");
const idRiset = ["R5-200", "R5-201", "R5-202", "R5-203", "R5-204"];
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi/g) ?? []).length,
    penalaran: (halaman.match(/penalaran/gi) ?? []).length, naskah: (halaman.match(/\(naskah\)/g) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-04/g) ?? []).length, tanggal: (halaman.match(/2026-11-04/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), tebak: sidikKata(nilaiString(tebakMentah).join("\n"), KATA), banding: sidikKata(nilaiString(bandingMentah).join("\n"), KATA),
  struktur: struktur.join(" "), angka: prosa.flatMap((b) => angkaDari(b)).join(" "),
  riset: idRiset.map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), tebak: h16(JSON.stringify(tebakMentah)), banding: h16(JSON.stringify(bandingMentah)), kartu: h16(JSON.stringify(kartuMtls)), mtls: h16(JSON.stringify(istilahMtls)), san: h16(JSON.stringify(istilahSan)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), tebak: tekstual(tebakMentah), banding: tekstual(bandingMentah), kartu: tekstual(kartuMtls), mtls: tekstual(istilahMtls), san: tekstual(istilahSan) },
};

if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat mtls-antar-service.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "mtls-antar-service.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, tebakan, banding, kartu, dan halaman istilah terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, tebakan, banding, kartu, dan halaman istilah sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, tebakan, dan banding", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.tebak).toEqual(SIDIK.tebak);
    expect(sidikSekarang.banding).toEqual(SIDIK.banding);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
