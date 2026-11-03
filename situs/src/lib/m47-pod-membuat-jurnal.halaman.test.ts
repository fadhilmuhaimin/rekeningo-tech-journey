// Penjaga halaman 5.18 (keputusan 1568 sampai 1570): angka, status, nomor ADR, tautan, label sumber, rentang Snippet, klaim "tidak" dan
// "hanya", diagram Rantai t5-m47-pod-membuat-jurnal.json, skenario alur t5-m47.json, kartu Cek diri, halaman istilah NetworkPolicy, dan baris
// riset R5-195 sampai R5-199 di m47-pod-membuat-jurnal.mdx. Nilai diturunkan dari rekaman labs/t5-service/output/rentan.txt, idempoten.txt,
// dan mtls.txt, rekaman Tahap 4 labs/t4-modul/output/ledger.txt, kode labs/api-t5 (cmd/ledger/main.go, internal/handler/ledger_layanan.go,
// internal/service/ledger_api.go, cmd/panggil/main.go), README lab, naskah Tahap 5 (baris M47 dan ADR 53), halaman tetangga, registry, dan baris
// riset, bukan dari daftar yang ditulis sendiri. Dua lapis: (1) nilai turunan dan kalimat berangka diperiksa terhadap sumbernya; (2) kata-kata
// halaman, JSON, dan kartu dikunci per baris di m47-pod-membuat-jurnal.halaman.nilai.ts. Lapis 2 bisa dimatikan (TANPA_KUNCI=1, TANPA_SIDIK=1)
// untuk mutasi tanpa kunci, dan dibuat ulang sesudah teks sengaja diubah: PERBARUI_KUNCI=1 vitest run src/lib/m47-pod-membuat-jurnal.halaman.test.ts.
// Penjaga tidak menangkap SALAHNYA kalimat yang terkunci. Gejala (Laras, minggu 9, pod uji, namespace notifikasi) tidak direkam: lab memerankan
// pod uji dengan perintah panggil di mesin yang sama, tanpa Kubernetes. Baris riset tetangga tidak dikunci: hanya R5-195 sampai R5-199 yang
// diperiksa, tanpa mengunci urutan dengan baris lain. Sumber luar (dokumentasi Kubernetes, draf IETF, abstrak NIST) tidak dibuka tes: kutipannya
// dikunci di baris riset, dan baris riset dikunci terhadap kalimat halaman.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantaiMentah from "../../data/diagram/t5-m47-pod-membuat-jurnal.json";
import registry from "../../data/cerita.json";
import istilahMentah from "../../data/halaman-istilah/networkpolicy.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { HalamanIstilah } from "./istilah";
import { KALIMAT_TERKUNCI, KUNCI_JSON, SIDIK } from "./m47-pod-membuat-jurnal.halaman.nilai";

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

const HALAMAN = "situs/src/content/docs/tahap-5/m47-pod-membuat-jurnal.mdx";
const halaman = baca(HALAMAN);
const badan = halaman.slice(halaman.indexOf("<Blok"));
const frontmatter = halaman.split(/^---\n/m)[1]!;
const skenario = JSON.parse(baca("situs/lama/widgets/data/skenario/t5-m47.json")) as Skenario;
const naskah = baca("plan/CERITA-TAHAP-5.md");
const riset5 = baca("plan/RISET-TAHAP-5.md");
const rentan = baca("labs/t5-service/output/rentan.txt").split("\n");
const idem = baca("labs/t5-service/output/idempoten.txt").split("\n");
const mtls = baca("labs/t5-service/output/mtls.txt").split("\n");
const ledgerT4 = baca("labs/t4-modul/output/ledger.txt").split("\n");
const kodeMain = baca("labs/api-t5/cmd/ledger/main.go");
const kodeHandler = baca("labs/api-t5/internal/handler/ledger_layanan.go");
const kodeService = baca("labs/api-t5/internal/service/ledger_api.go");
const kodePanggil = baca("labs/api-t5/cmd/panggil/main.go");
const readmeLab = baca("labs/t5-service/README.md");
const modul4 = baca("situs/src/content/docs/tahap-4/modular-monolith.mdx");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const kartuSemua = JSON.parse(baca("situs/lama/widgets/data/kartu.json")) as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[];
const tanpaKunci = process.env.TANPA_KUNCI === "1";
const tanpaSidik = process.env.TANPA_SIDIK === "1";
const core = createRequire(import.meta.url)(path.join(akar, "situs/lama/widgets/alur-core.js")) as {
  normalize: (d: unknown) => Skenario;
  validate: (d: Skenario, o?: { exists: (p: string) => boolean }) => string[];
  steps: (d: Skenario, v: boolean) => Langkah[];
};

interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; nada?: string }
interface Skenario {
  judul: string;
  sumber: { jenis: string; catatan: string; file: string; fileVarian: string };
  pengantar: string;
  komponen: { id: string; label: string }[];
  perangkat: unknown[];
  layarAwal: Record<string, unknown>;
  predict: { q: string; options: string[]; answer: number; varian: boolean; explain: string };
  langkah: Langkah[];
  varian: { label: string; mulai: number; langkah: Langkah[] };
}
interface H { id: string; judul: string; label?: string; masalah?: string; tahap: number | string; nomor?: string; ada?: boolean; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; peran?: string[]; path?: string; adr?: number[] }
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
const TANGGAL = "2026-11-04";
const URL_NS = "https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/";
const URL_NP = "https://kubernetes.io/docs/concepts/services-networking/network-policies/";
const URL_IETF = "https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-08.txt";
const URL_NIST = "https://csrc.nist.gov/pubs/sp/800/207/final";

// --- naskah: baris M47 (kolom: #, minggu, gejala, dikira, sebenarnya, konsep, keputusan) dan baris ADR 53
const barisM47 = naskah.split("\n").find((b) => b.startsWith("| M47 |")) ?? "";
const kolomM47 = pecahBaris(barisM47);
const mingguM47 = Number(kolomM47[1]);
const gejalaM47 = kolomM47[2]!;
const dikiraM47 = kolomM47[3]!;
const sebenarnyaM47 = kolomM47[4]!;
const barisAdr53 = naskah.split("\n").find((b) => b.startsWith("| 53 | Panggilan antar service memakai mTLS")) ?? "";

// --- rekaman: garis 1-based per berkas
const garis = (rek: string[], pola: RegExp, dari0 = 0): number => {
  const i = rek.findIndex((b, k) => k >= dari0 && pola.test(b));
  if (i < 0) throw new Error(`rekaman: ${pola} tidak ditemukan sesudah baris ${dari0}`);
  return i + 1;
};
const nRentanA = garis(rentan, /^# --- A\./);
const nRentanB = garis(rentan, /^# --- B\./);
const nPeringatan = garis(rentan, /^PERINGATAN: mode rentan ledger-tanpa-identitas menyala/);
const nRentanPanggil = garis(rentan, /^\$ panggil dari pod uji, tanpa sertifikat, tanpa identitas -> POST \/ledger\/jurnal-topup, Idempotency-Key baru$/);
const statusA = cari(/^status (\d+) \{"jurnal":<jurnal 1>,"ulang":(false|true)\}$/, rentan[nRentanPanggil]!, "status mode rentan");
const nSebelum = garis(rentan, /^ jurnal_sebelum$/);
const jurnalSebelum = Number(rentan[nSebelum + 1]!.trim());
const nPosting = garis(rentan, /^ jenis\s+\| keterangan\s+\| akun_id \| jumlah$/);
const postingBank = rentan[nPosting + 1]!.split("|").map((x) => x.trim());
const postingAkun = rentan[nPosting + 2]!.split("|").map((x) => x.trim());
const nSaldo = garis(rentan, /^ nama\s+\| saldo$/);
const saldoUji = rentan[nSaldo + 1]!.split("|").map((x) => x.trim());
const nLogA = garis(rentan, /^ledger: key=TB-UJI-0001 status=201 jurnal=<jurnal 1> ulang=false$/);
const nHttp = garis(rentan, /^\$ panggil http \(tanpa TLS\) ke ledger mTLS$/);
const statusHttp = cari(/^status (\d+) (.+)$/, rentan[nHttp]!, "HTTP biasa ke port TLS");
const nSonde = garis(rentan, /^\$ panggil -sonde tanpa sertifikat ke ledger mTLS$/);
const nKeyKedua = garis(rentan, /^ jurnal_untuk_key_kedua$/);
const jurnalKeyKedua = Number(rentan[nKeyKedua + 1]!.trim());

const nIdemA = garis(idem, /^# --- A\./);
const nIdemA2 = garis(idem, /^status 200 \{"jurnal":<jurnal 1>,"ulang":true\}$/, nIdemA);
const nIdemC = garis(idem, /^# --- C\./);
const nIdemC2 = garis(idem, /^status 422 \{"alasan":"key-dipakai-permintaan-lain"\}$/, nIdemC);
const nIdemB = garis(idem, /^# --- B\./);
const nMtlsC = garis(mtls, /^# --- C\./);
const nNotif = garis(mtls, /^\$ notifikasi -> ledger  jalur=topup Idempotency-Key=TB-LAB-0002 akun=100002 jumlah=1000$/, nMtlsC);
const nMtlsB = garis(mtls, /^# --- B\./);
const nMtlsD = garis(mtls, /^# --- D\./);
const nMtlsE = garis(mtls, /^# --- E\./);
const nT4A = garis(ledgerT4, /^# --- A\./);

// --- kode lab
const kodeMainBaris = kodeMain.split("\n");
const nRute = kodeMainBaris.findIndex((b) => b.startsWith("func rute(")) + 1;
const nRentanBlok = kodeMainBaris.findIndex((b, i) => i >= nRute && b === "\tif rentan {") + 1;
const nRentanBlokAkhir = kodeMainBaris.findIndex((b, i) => i >= nRentanBlok && b === "\t}") + 1;
const nRuteAkhir = kodeMainBaris.findIndex((b, i) => i >= nRute && b === "}") + 1;
const kodeHandlerBaris = kodeHandler.split("\n");
const nJurnalTopup = kodeHandlerBaris.findIndex((b) => b.startsWith("func JurnalTopup(")) + 1;
const nJurnalTopupAkhir = kodeHandlerBaris.findIndex((b, i) => i >= nJurnalTopup && b === "}") + 1;
const nPanggilService = kodeHandlerBaris.findIndex((b, i) => i >= nJurnalTopup && b.includes("svc.LedgerKreditTopup(")) + 1;
const badanJurnalTopup = kodeHandlerBaris.slice(nJurnalTopup - 1, nJurnalTopupAkhir).join("\n");
const badanRute = kodeMainBaris.slice(nRute - 1, nRuteAkhir).join("\n");
const blokRentan = kodeMainBaris.slice(nRentanBlok - 1, nRentanBlokAkhir).join("\n");

describe("naskah, registry, dan halaman tetangga", () => {
  test("registry: halaman 5.18 jenis masalah, ada, prasyarat t2-idempotency dan t5-service (urutan membuat meta tidak berpindah baris saat font diganti), lab t5-service, menit = baca + coba, judul dan peran dari naskah", () => {
    const h = dari("t5-m47");
    expect(h.nomor).toBe("5.18");
    expect(h.jenis).toBe("masalah");
    expect(h.ada).toBe(true);
    expect(h.inti).toBe(true);
    expect(h.prasyarat).toEqual(["t2-idempotency", "t5-service"]);
    expect(h.lab).toEqual(["t5-service"]);
    expect(h.peran).toEqual(["security", "backend"]);
    expect(h.path).toBe("tahap-5/m47-pod-membuat-jurnal.md");
    expect(h.label).toBe(`Masalah ${kolomM47[0]!.slice(1)} · minggu ${mingguM47}`);
    expect(mingguM47).toBe(9);
    const meta = cari(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: (.+) · Jalur inti<\/p>/, halaman, "meta");
    expect(Number(meta[1]) + Number(meta[2])).toBe(h.menit);
    expect(meta[3]).toBe("[[t2-idempotency]], [[t5-service]]");
    expect(frontmatter).toContain(`title: "5.18 ${h.judul}"`);
    expect(naskah).toContain(`| 5.18 | 4 | ${h.judul} | Masalah | ★ | t5-service | alur |`);
    expect(h.masalah).toBe("Pod di jaringan dalam membuat jurnal baru di ledger karena ledger mempercayai setiap pemanggil");
    expect(frontmatter).toContain("description: Minggu 9. Dalam tinjauan keamanan, satu pod uji memanggil ledger dengan Idempotency-Key baru dan ledger membuat jurnal top-up, karena versi pertama ledger tidak memeriksa siapa yang memanggil.");
  });
  test("halaman tetangga: 5.19 (t5-mtls) ADR 53 dan prasyarat t5-m47, 5.13 (t5-service), ADR 14 di t2-idempotency, 4.13 (t4-modul), 3.25 (t3-tls-pinning)", () => {
    expect(dari("t5-mtls").nomor).toBe("5.19");
    expect(dari("t5-mtls").adr).toEqual([53]);
    expect(dari("t5-mtls").prasyarat).toEqual(["t5-m47"]);
    expect(dari("t5-service").nomor).toBe("5.13");
    expect(dari("t2-idempotency").nomor).toBe("2.14");
    expect(dari("t2-idempotency").adr).toEqual([14]);
    expect(dari("t4-modul").nomor).toBe("4.13");
    expect(dari("t3-tls-pinning").nomor).toBe("3.25");
    expect(barisAdr53).toContain("mTLS di Go");
    expect(badan).toContain("Keputusannya ADR 53.");
    expect(badan).toContain("Keputusannya ADR 14.");
  });
  test("gejala dan dugaan dari naskah baris M47: Laras, pod uji, namespace notifikasi, key baru, Rp1.000, tidak ada yang menolak, Raka dan Bayu", () => {
    expect(gejalaM47).toContain("Laras memasang satu pod uji di namespace notifikasi dan memanggil API ledger dengan Idempotency-Key baru");
    expect(gejalaM47).toContain("Ledger membuat jurnal top-up Rp1.000 untuk akun uji");
    expect(gejalaM47).toContain("Tidak ada yang menolak (Ilustrasi)");
    expect(dikiraM47).toBe("Jaringan di dalam cluster privat, jadi aman. Bayu: bawaan Kubernetes sudah membatasi lalu lintas");
    expect(sebenarnyaM47).toContain("Ledger mempercayai setiap pemanggil di jaringan dalam.");
    expect(sebenarnyaM47).toContain("Idempotency-Key mencegah pemrosesan ganda untuk request yang sama, bukan pemanggil yang tidak berhak membuat request baru (penalaran)");
    expect(sebenarnyaM47).toContain("NetworkPolicy dan jaringan yang menegakkannya, [perlu verifikasi]");
    harus("Minggu 9 Tahap 5. Dalam tinjauan keamanan, Laras memasang satu pod uji di namespace notifikasi. Dari pod itu ia memanggil API ledger dengan Idempotency-Key yang belum pernah dipakai.");
    harus("Ledger membuat jurnal top-up Rp1.000 untuk akun uji. Tidak ada yang menolak.");
    harus("Raka mengira jaringan di dalam cluster itu privat, jadi hanya pod milik Rekeningo yang bisa sampai ke ledger.");
    harus("Bayu menambahkan bahwa Kubernetes sudah membatasi lalu lintas antar pod secara bawaan.");
  });
  test("naskah menyebut NetworkPolicy hanya di baris M47 dan baris ADR 53, dan tidak menulis kunci layanan bersama: klaim 'naskah tidak menulis' di halaman", () => {
    const baris = naskah.split("\n").filter((b) => b.includes("NetworkPolicy"));
    expect(baris.map((b) => b.slice(0, 8))).toEqual(["| M47 | ", "| 53 | P"]);
    expect(naskah).not.toMatch(/X-Layanan-Kunci|kunci layanan|kunci bersama/i);
    expect(barisRiset("R5-199")).toContain("NetworkPolicy hanya disebut di baris M47 dan baris ADR 53");
    harus("Naskah menulis pembatasan itu sebagai pilihan yang harus ditulis, bukan bawaan, dan jaringan yang menegakkannya belum ditentukan [perlu verifikasi].");
    harus("Naskah tidak menulis apakah pod uji di cerita memegang kunci itu.");
  });
});

describe("rekaman rentan.txt, idempoten.txt, dan mtls.txt: nilai turunan dari berkasnya sendiri", () => {
  test("rentan.txt bagian A: HTTP biasa, jurnal sebelum 0, status 201 jurnal baru, dua posting nol-jumlah, saldo akun uji, log tanpa pemanggil", () => {
    expect(rentan[1]).toContain("PostgreSQL 17.11");
    expect(rentan[1]).toContain("go1.27.3");
    expect(rentan[1]).toContain("pgx v5.11.0");
    expect(nRentanA).toBe(5);
    expect(jurnalSebelum).toBe(0);
    expect(statusA[1]).toBe("201");
    expect(statusA[2]).toBe("false");
    expect(postingBank).toEqual(["topup_bank", "Top-up bank TB-UJI-0001", "", "-1000"]);
    expect(postingAkun).toEqual(["topup_bank", "Top-up bank TB-UJI-0001", "100002", "1000"]);
    expect(Number(postingBank[3]) + Number(postingAkun[3])).toBe(0);
    expect(saldoUji).toEqual(["Lab uji", "1000"]);
    expect(rentan[nLogA - 1]).toMatch(/^ledger: key=\S+ status=\d+ jurnal=<jurnal \d+> ulang=(true|false)$/);
    expect(nLogA).toBe(nPeringatan + 1);
    expect(rentan[nPeringatan - 1]).toContain("tanpa TLS, tanpa identitas, tanpa daftar jenis jurnal");
    expect(rentan[garis(rentan, /^\$ ledger -rentan ledger-tanpa-identitas/) - 1]).toContain("tanpa TLS");
  });
  test("rentan.txt bagian B: HTTP biasa ke port TLS dijawab 400, sonde tanpa sertifikat 'certificate required', jurnal untuk key kedua 0", () => {
    expect(statusHttp[1]).toBe("400");
    expect(statusHttp[2]).toBe("Client sent an HTTP request to an HTTPS server.");
    expect(rentan[nSonde]).toBe("sonde: alert dari server: tls: certificate required");
    expect(jurnalKeyKedua).toBe(0);
    expect(nRentanB).toBe(nPeringatan + 3);
    expect(rentan[nRentanB - 1]).toContain("pod uji yang sama ditolak");
  });
  test("idempoten.txt: bagian A satu jurnal untuk dua permintaan sama (201 lalu 200), bagian C key baru jurnal kedua (201) dan jumlah lain 422", () => {
    expect(idem[nIdemA]).toBe('$ pembayaran -> ledger  jalur=topup Idempotency-Key=TB-LAB-1001 akun=100001 jumlah=200000');
    expect(idem[nIdemA + 1]).toBe('status 201 {"jurnal":<jurnal 1>,"ulang":false}');
    expect(idem[nIdemA + 2]).toBe(idem[nIdemA]);
    expect(idem[nIdemA + 3]).toBe('status 200 {"jurnal":<jurnal 1>,"ulang":true}');
    expect(idem[garis(idem, /^ jurnal_untuk_key$/, nIdemA)]).toMatch(/^-+$/);
    expect(idem[garis(idem, /^ jurnal_untuk_key$/, nIdemA) + 1]).toBe(" 1");
    expect(idem[nIdemC]).toBe('$ pembayaran -> ledger  jalur=topup Idempotency-Key=TB-LAB-1003 akun=100001 jumlah=200000');
    expect(idem[nIdemC + 1]).toBe('status 201 {"jurnal":<jurnal 2>,"ulang":false}');
    expect(idem[nIdemC + 2]).toBe('$ pembayaran -> ledger  jalur=topup Idempotency-Key=TB-LAB-1003 akun=100001 jumlah=300000');
    expect(idem[nIdemC2 - 1]).toBe('status 422 {"alasan":"key-dipakai-permintaan-lain"}');
    expect(idem[nIdemC - 1]).toContain("Key baru (ledger mewajibkan order_id sama dengan key) dengan akun dan jumlah yang sama adalah permintaan lain");
    // key baru bukan key yang sama: bagian A memakai TB-LAB-1001, bagian C TB-LAB-1003; akun dan jumlah bagian A dan C sama
    expect(idem[nIdemA].replace(/Idempotency-Key=\S+/, "")).toBe(idem[nIdemC].replace(/Idempotency-Key=\S+/, ""));
  });
  test("mtls.txt: notifikasi dijawab 403 jenis-tidak-diizinkan (bagian C), empat penolakan handshake tanpa keputusan identitas (bagian B dan E)", () => {
    expect(mtls[nNotif]).toBe('status 403 {"alasan":"jenis-tidak-diizinkan","identitas":"notifikasi","jenis":"topup_bank"}');
    const handshake = mtls.slice(nMtlsB - 1, nMtlsC - 1).filter((b) => b.startsWith("handshake ditolak dari"));
    expect(handshake).toHaveLength(4);
    expect(mtls.slice(nMtlsB - 1, nMtlsC - 1).filter((b) => b.startsWith("identitas:"))).toEqual([]);
    const sesE = mtls.slice(nMtlsE);
    expect(sesE.filter((b) => b.startsWith("handshake"))).toEqual([]);
    expect(sesE.filter((b) => b.startsWith("identitas:")).length).toBeGreaterThan(0);
    expect(mtls.slice(nMtlsB - 1, nMtlsC - 1).filter((b) => b.startsWith("sonde: alert dari server:")).length).toBe(4);
    expect(nMtlsD).toBeGreaterThan(nMtlsC);
    expect(rentan[nSonde]).toBe(mtls[garis(mtls, /^\$ panggil -sonde -cert \(tanpa\)/)]);
  });
  test("Tahap 4: ledger.txt bagian A tanpa kunci layanan dijawab 401 dengan alasan kunci-layanan, dan kunci bersama tertulis di 4.13 sebagai data lab", () => {
    expect(ledgerT4[nT4A + 2]).toBe("# tanpa kunci layanan");
    expect(ledgerT4[nT4A + 3]).toContain("-H 'Idempotency-Key: <order A>'");
    expect(ledgerT4[nT4A + 3]).not.toContain("X-Layanan-Kunci");
    expect(ledgerT4[nT4A + 4]).toBe("HTTP/1.1 401 Unauthorized");
    expect(ledgerT4[nT4A + 7]).toBe('{"alasan":"kunci-layanan"}');
    expect(modul4).toContain("| TLS antar service dan rotasi kunci layanan | Kunci layanan di header adalah data lab | Belum dijadwalkan |");
    harus("**Kunci bersama dari Tahap 4.** API ledger Tahap 4 sudah menuntut kunci bersama di header `X-Layanan-Kunci`, dan permintaan tanpa kunci dijawab 401 (Rekaman lab Tahap 4, `ledger.txt` bagian A, [[t4-modul]]). Kunci bersama menunjukkan bahwa pemanggil memegang kunci itu, bukan service mana yang memegangnya (penalaran).");
    expect(kodeHandler).toContain("func PasangLedger(mux *http.ServeMux, svc service.Service, kunciLayanan string, catat bool)");
  });
});

describe("kode lab: rute mode rentan, handler JurnalTopup, service ledger, dan perintah panggil", () => {
  test("rute(): cabang rentan memasang dua rute tanpa identitas.Wajib; versi benar memasang keduanya dengan identitas.Wajib", () => {
    expect(nRute).toBeGreaterThan(0);
    expect(blokRentan.split("\n")[0]).toBe("\tif rentan {");
    expect(blokRentan).toContain('mux.HandleFunc("POST /ledger/jurnal-topup", topup)');
    expect(blokRentan).toContain('mux.HandleFunc("POST /ledger/kartu/tahan", tahan)');
    expect(blokRentan).toContain("return mux");
    expect(blokRentan).not.toContain("identitas.Wajib");
    expect(jumlah(blokRentan, "HandleFunc")).toBe(2);
    expect(jumlah(badanRute, "identitas.Wajib(")).toBe(2);
    expect(kodeMain).toContain("// Mode rentan (rentan=true): rute yang sama tanpa pembungkus, jadi siapa pun yang sampai ke port ini membuat jurnal.");
    expect(kodeMain).toContain('const rentanTanpaIdentitas = "ledger-tanpa-identitas"');
    expect(kodeMain).toContain("tanpa TLS, tanpa identitas, tanpa daftar jenis jurnal");
  });
  test("Snippet: rentang baris diturunkan dari kode dan rekaman (main.go blok rentan, handler sampai panggilan service, rentan.txt bagian A sampai baris sebelum peringatan, idempoten.txt bagian A dan C)", () => {
    const snip = [...badan.matchAll(/<Snippet file="([^"]+)"(?: lines="(\d+):(\d+)")?(?: lang="(\w+)")? title="([^"]+)" \/>/g)].map((m) => ({ file: m[1]!, a: Number(m[2]), b: Number(m[3]), lang: m[4], title: m[5]! }));
    expect(snip.map((s) => `${s.file}:${s.a}:${s.b}`)).toEqual([
      `labs/api-t5/cmd/ledger/main.go:${nRentanBlok}:${nRentanBlokAkhir}`,
      `labs/api-t5/internal/handler/ledger_layanan.go:${nJurnalTopup}:${nPanggilService}`,
      `labs/t5-service/output/rentan.txt:${nRentanA}:${nPeringatan - 1}`,
      `labs/t5-service/output/idempoten.txt:${nIdemA}:${nIdemA2}`,
      `labs/t5-service/output/idempoten.txt:${nIdemC}:${nIdemC2}`,
    ]);
    expect(snip.map((s) => s.lang)).toEqual(["go", "go", undefined, undefined, undefined]);
    expect(snip[0]!.title).toBe(`Kode lab: labs/api-t5/cmd/ledger/main.go baris ${nRentanBlok} sampai ${nRentanBlokAkhir} (mode rentan memasang rute tanpa pembungkus)`);
    expect(snip[1]!.title).toBe(`Kode lab: labs/api-t5/internal/handler/ledger_layanan.go baris ${nJurnalTopup} sampai ${nPanggilService} (handler membaca key dan body, lalu memanggil service)`);
    expect(snip[2]!.title).toBe("Rekaman lab: labs/t5-service/output/rentan.txt, bagian A (pod uji tanpa sertifikat membuat jurnal)");
    expect(snip[3]!.title).toBe("Rekaman lab: labs/t5-service/output/idempoten.txt, bagian A (permintaan yang sama dua kali)");
    expect(snip[4]!.title).toBe("Rekaman lab: labs/t5-service/output/idempoten.txt, bagian C (key baru, lalu key yang sama dengan jumlah lain)");
    // rekaman: potongan tidak memuat baris kepala rekaman (baris 1 sampai 3) dan memuat penanda bagiannya
    for (const s of snip.filter((x) => x.file.endsWith(".txt"))) expect(s.a).toBeGreaterThan(3);
    expect(rentan[nRentanA - 1]).toMatch(/^# --- A\./);
    expect(idem[nIdemA - 1]).toMatch(/^# --- A\./);
    expect(idem[nIdemC - 1]).toMatch(/^# --- C\./);
    expect(nIdemA2).toBe(nIdemA + 4);
    expect(nIdemC2).toBe(nIdemC + 4);
    expect(nPeringatan - 1).toBe(24);
  });
  test("handler JurnalTopup: satu pembacaan header (Idempotency-Key), tanpa sertifikat, alamat, atau header lain milik pemanggil; panggilan service tanpa parameter pemanggil", () => {
    expect(jumlah(badanJurnalTopup, "r.Header.Get(")).toBe(1);
    expect(badanJurnalTopup).toContain('kunci := r.Header.Get("Idempotency-Key")');
    for (const k of ["r.TLS", "RemoteAddr", "X-Forwarded", "r.Host", "r.URL", "PeerCertificates", "identitas."]) expect(badanJurnalTopup, k).not.toContain(k);
    expect(kodeHandlerBaris[nPanggilService - 1]).toContain("svc.LedgerKreditTopup(r.Context(), kunci, in.OrderID, in.AkunID, in.Jumlah)");
    expect(kodeHandlerBaris[nJurnalTopup]).toBe("\treturn func(w http.ResponseWriter, r *http.Request) {");
    expect(kodeService).toContain("func (s Service) LedgerKreditTopup(ctx context.Context, kunci, orderID string, akun, jumlah int64) (HasilKredit, error) {");
    expect(kodeService).toContain('if kunci == "" || kunci != orderID {');
    expect(kodeService).toContain('bank, err := tx.BukuSistem(ctx, "bank")');
    expect(kodeService).toContain("repo.Posting{{BukuID: bank, Jumlah: -jumlah}, {BukuID: b.ID, Jumlah: jumlah}}");
    harus("Handler `JurnalTopup` membaca satu header, Idempotency-Key, lalu body dengan `order_id`, `akun_id`, dan `jumlah`. Service yang dipanggilnya menerima key, `order_id`, akun, dan jumlah, tanpa parameter yang menyebut pemanggil:");
    harus("Ledger menjawab 201 dan menulis jurnal dengan dua posting, yaitu minus Rp1.000 di buku bank menurut kode lab dan plus Rp1.000 untuk akun uji 100002:");
  });
  test("pod uji di rekaman adalah perintah panggil di mesin yang sama: sonde menunggu 500 ms dan tidak mengirim apa pun; lab tanpa Kubernetes", () => {
    expect(kodePanggil).toContain("identitas.Sonde(u.Host, cfgTLS, 500*time.Millisecond)");
    expect(kodePanggil).toContain("// Pemanggil satu kali untuk lab t5-service: memerankan pod uji");
    expect(readmeLab).toContain("`cmd/panggil -sonde` menyelesaikan handshake, tidak mengirim apa pun, lalu menunggu paling lama 500 ms untuk alert");
    expect(readmeLab).toContain("lab ini tidak memakai Kubernetes");
    expect(jumlah(skenario.varian.langkah[1]!.jelas, "500 milidetik")).toBe(1);
    expect(skenario.varian.langkah[1]!.jelas).toContain("tidak mengirim permintaan HTTP");
    harus("Mode itu adalah kode lab yang ditulis untuk M47, bukan salinan kode yang pernah berjalan di cerita. Pod uji di rekaman adalah perintah `panggil` di mesin yang sama dengan ledger. Lab tidak memakai Kubernetes, jadi rekaman tidak memuat namespace atau NetworkPolicy (Tidak dijalankan).");
    expect(rentan[garis(rentan, /^\$ ledger -rentan/) - 1]).toBe("$ ledger -rentan ledger-tanpa-identitas   # role database t5_ledger, tanpa TLS");
    harus("*Kondisi rekaman:* PostgreSQL 17.11, go1.27.3, dan pgx v5.11.0, dari database bersih, di lab t5-service. Ledger berjalan sebagai proses sendiri dengan mode `-rentan ledger-tanpa-identitas`, versi pertama: HTTP biasa, tanpa sertifikat, dan tanpa daftar jenis jurnal.");
  });
  test("klaim negatif berlingkup: 'tidak menerima parameter pemanggil' hanya untuk service ledger dan handler (kode), 'log ... tanpa pemanggil' hanya bagian A", () => {
    harus("Saldo akun uji naik Rp1.000 tanpa kiriman dari bank. Itu penalaran: penalaran adalah kesimpulan penulis dari rekaman dan sumber yang disebut, bukan hasil yang direkam. Log ledger di baris terakhir bagian A memuat key, status, dan jurnal, tanpa pemanggil.");
    harus("Ledger menjawab menurut key dan isi permintaan. Key yang belum pernah dipakai adalah permintaan baru, siapa pun pengirimnya, karena service ledger tidak menerima parameter pemanggil (penalaran dari kode lab). Karena itu key tidak menghentikan pod uji di bagian A.");
    expect(rentan[nLogA - 1]).not.toMatch(/pemanggil|identitas|sertifikat/);
    expect(nLogA).toBe(26);
  });
});

describe("sumber luar: kutipan di baris riset R5-195 sampai R5-199 dan tautan di halaman", () => {
  test("baris riset ada, lima kolom, dan urut naik (tanpa mengunci tetangga)", () => {
    const ids = ["R5-195", "R5-196", "R5-197", "R5-198", "R5-199"];
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
  test("R5-195: kutipan NetworkPolicy dan Namespaces, tanggal buka, dan tautan yang dipakai halaman", () => {
    const r = barisRiset("R5-195");
    for (const k of [
      '"Network policies are implemented by the network plugin."',
      '"Creating a NetworkPolicy resource without a controller that implements it will have no effect."',
      '"By default, a pod is non-isolated for ingress; all inbound connections are allowed."',
      '"Anything TLS related (use a service mesh or ingress controller for this)."',
      '"As of Kubernetes 1.37"',
      '"In Kubernetes, namespaces provide a mechanism for isolating groups of resources within a single cluster."',
      "terakhir diubah 14 April 2026",
      "terakhir diubah 19 Desember 2025",
      `dibuka ${TANGGAL}`,
      "kubernetes.io/docs/concepts/services-networking/network-policies/",
      "kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/",
    ]) expect(r, k).toContain(k);
    expect(jumlah(badan, `[Kubernetes: Namespaces](${URL_NS}), dibuka ${TANGGAL}, Tidak dijalankan)`)).toBe(1);
    expect(jumlah(badan, `[Kubernetes: Network Policies](${URL_NP}), dibuka ${TANGGAL}, Tidak dijalankan)`)).toBe(1);
    harus("Boleh. Dokumentasi menulis bahwa secara bawaan pod tidak terisolasi untuk koneksi masuk, dan semua koneksi masuk diizinkan ([Kubernetes: Network Policies](" + URL_NP + "), dibuka " + TANGGAL + ", Tidak dijalankan).");
    harus("NetworkPolicy dijalankan oleh network plugin, yaitu komponen jaringan cluster yang mendukungnya. Dokumentasi yang sama menulis bahwa sumber daya itu tidak berefek bila tidak ada controller yang menegakkannya.");
    harus("Bagian \"What you can't do with network policies\" di dokumentasi itu berlaku untuk Kubernetes 1.37. Bagian itu menulis bahwa hal yang berhubungan dengan TLS tidak ada di NetworkPolicy API, dan menyebut service mesh atau ingress controller sebagai gantinya.");
    harus("Namespace adalah mekanisme Kubernetes untuk memisahkan kelompok sumber daya di dalam satu cluster");
  });
  test("R5-196: kutipan NIST SP 800-207, tanggal terbit, dan kalimat halaman yang berlingkup (abstrak tidak menyebut Kubernetes)", () => {
    const r = barisRiset("R5-196");
    expect(r).toContain('"Zero trust assumes there is no implicit trust granted to assets or user accounts based solely on their physical or network location (i.e., local area networks versus the internet) or based on asset ownership (enterprise or personally owned)."');
    expect(r).toContain("final 2020-08-11, terbit Agustus 2020");
    expect(r).toContain(`dibuka ${TANGGAL}`);
    expect(r).toContain("csrc.nist.gov/pubs/sp/800/207/final");
    expect(r).toContain("tidak memuat kata Kubernetes atau container");
    harus(`Menurut NIST SP 800-207, zero trust mengasumsikan tidak ada kepercayaan implisit bagi aset atau akun hanya karena lokasi fisik atau jaringannya. Sumbernya abstrak [NIST SP 800-207](${URL_NIST}), terbit Agustus 2020, dibuka ${TANGGAL} (Tidak dijalankan). Abstrak itu membahas infrastruktur enterprise secara umum dan tidak menyebut Kubernetes.`);
  });
  test("R5-197: kutipan draf IETF bagian 2 dan abstrak, tanggal terbit dan kedaluwarsa, belum RFC; kalimat halaman memakai bagian 2", () => {
    const r = barisRiset("R5-197");
    expect(r).toContain('"An idempotency key is a unique value generated by the client which the resource uses to recognize subsequent retries of the same request."');
    expect(r).toContain('"to make non-idempotent HTTP methods such as POST or PATCH fault-tolerant."');
    expect(r).toContain("terbit 22 Oktober 2026, kedaluwarsa 25 April 2027, belum RFC");
    expect(r).toContain("draft-ietf-httpapi-idempotency-key-header-08");
    expect(r).toContain("Kata authorization dan authentication tidak muncul di teks mentah draf");
    expect(r).toContain(`dibuka ${TANGGAL}`);
    harus(`Draf IETF menulis bahwa Idempotency-Key adalah nilai unik buatan client. Server memakainya untuk mengenali percobaan ulang dari permintaan yang sama ([draft-ietf-httpapi-idempotency-key-header-08](${URL_IETF}), bagian 2, terbit 22 Oktober 2026, belum RFC, dibuka ${TANGGAL}, Tidak dijalankan).`);
    expect(baca("plan/RISET-TAHAP-2.md")).toContain("draft-ietf-httpapi-idempotency-key-header-08");
  });
  test("R5-198 dan R5-199: sumber internal yang dibaca, dan angka di kutipan sama dengan rekaman dan kode", () => {
    const r198 = barisRiset("R5-198");
    for (const k of ["`labs/t5-service/output/rentan.txt` bagian A", "`idempoten.txt` bagian A", "`mtls.txt` bagian B, C, dan E", "baris 139 sampai 161", "`JurnalTopup` membaca satu header", "`LedgerKreditTopup(ctx, kunci, orderID, akun, jumlah)`", 'BukuSistem("bank")', "status 201", "akun 100002", "saldo 1000", "dijawab 400", '"certificate required"']) expect(r198, k).toContain(k);
    expect(kodeMainBaris[nRute - 1]).toBe("func rute(svc service.Service, rentan bool, izin identitas.Izin, domain string, lab bool, catat func(string), ping func(context.Context) error) *http.ServeMux {");
    expect(nRute).toBe(139);
    expect(nRuteAkhir).toBe(161);
    const r199 = barisRiset("R5-199");
    for (const k of ["Laras, pod uji, namespace notifikasi", '"Tidak ada yang menolak"', "`kunci-layanan-pembayaran-lab`", "`PasangLedger` menerima satu nilai kunci", "tanpa `X-Layanan-Kunci` 401", "halaman 5.18 tidak punya hitungan sendiri"]) expect(r199, k).toContain(k);
    expect(ledgerT4.join("\n")).toContain("-H 'X-Layanan-Kunci: kunci-layanan-pembayaran-lab'");
  });
  test("tanggal buka: tepat empat 'dibuka 2026-11-04' di halaman (dua tautan Kubernetes, draf IETF, NIST), dan tak ada tanggal lain", () => {
    expect(jumlah(badan, `dibuka ${TANGGAL}`)).toBe(4);
    expect(jumlah(badan, TANGGAL)).toBe(4);
    expect(badan.match(/\b20\d\d-\d\d-\d\d\b/g)).toEqual([TANGGAL, TANGGAL, TANGGAL, TANGGAL]);
    expect(jumlah(badan, "](http")).toBe(4);
    expect([...badan.matchAll(/\]\((http[^)]+)\)/g)].map((m) => m[1])).toEqual([URL_NS, URL_NP, URL_IETF, URL_NIST]);
  });
});

describe("halaman istilah NetworkPolicy dan glosarium", () => {
  test("halaman istilah valid, berrujukan ke t5-m47 dan R5-195, dan baris glosarium menunjuk ke 5.18", () => {
    const d = HalamanIstilah.parse(istilahMentah);
    expect(d.istilah).toBe("NetworkPolicy");
    expect(d.cerita![0]!.rujukan).toBe("t5-m47");
    expect(d.sumber![0]).toMatchObject({ riset: "R5-195", url: URL_NP });
    expect(d.sumber![0]!.judul).toBe(`Kubernetes: Network Policies (dibuka ${TANGGAL})`);
    expect(d.terkait).toEqual(["Kubernetes", "Handshake TLS"]);
    expect(barisRiset("R5-195")).toContain("kubernetes.io/docs/concepts/services-networking/network-policies/");
    expect(glosarium).toContain("| **NetworkPolicy** | Sumber daya Kubernetes yang mengatur pod, namespace, dan blok IP mana yang boleh menyambung ke sebuah pod, dan hanya berefek bila jaringan cluster menegakkannya. | [[t5-m47]] |");
    const baris = glosarium.split("\n");
    const i = baris.findIndex((b) => b.startsWith("| **NetworkPolicy** |"));
    expect(baris[i - 1]!.startsWith("| **N+1 query**")).toBe(true);
    expect(baris[i + 1]!.startsWith("| **Nonrepeatable read**")).toBe(true);
  });
  test("kalimat istilah: bawaan terisolasi, plugin, TLS: cocok dengan kutipan riset dan tidak lebih kuat", () => {
    const d = HalamanIstilah.parse(istilahMentah);
    expect(d.mekanisme).toHaveLength(4);
    expect(d.mekanisme![3]).toBe("NetworkPolicy dijalankan oleh network plugin. Tanpa controller yang menegakkannya, sumber daya itu tidak berefek.");
    expect(d.jebakan![0]).toContain("hal yang berhubungan dengan TLS tidak ada di NetworkPolicy API");
    expect(d.stack).toBeNull();
    expect(d.cerita![0]!.teks).toContain("(Tidak dijalankan)");
  });
});

describe("kalimat berulang di badan halaman", () => {
  test("tidak ada kalimat (empat kata atau lebih) yang muncul dua kali: toContain dan harus() puas dengan satu kemunculan, jadi kalimat yang digandakan lolos tanpa kunci baris", () => {
    const kalimat = badan.split("\n").filter((b) => b.trim() && !b.startsWith("<")).flatMap((b) => b.split(/(?<=[.!?])\s+/).map((k) => k.trim())).filter((k) => k.split(/\s+/).length >= 4);
    expect(kalimat.length).toBeGreaterThan(60);
    const hitung = new Map<string, number>();
    for (const k of kalimat) hitung.set(k, (hitung.get(k) ?? 0) + 1);
    expect([...hitung].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([]);
    const klausa = badan.split("\n").filter((b) => b.trim() && !b.startsWith("<")).flatMap((b) => b.split(/(?<=[.!?:])\s+/).map((k) => k.trim())).filter((k) => k.split(/\s+/).length >= 5);
    const hitungKlausa = new Map<string, number>();
    for (const k of klausa) hitungKlausa.set(k, (hitungKlausa.get(k) ?? 0) + 1);
    expect([...hitungKlausa].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([]);
  });
});

describe("ID registry, tautan, template blok, widget, kartu, tebakan, dan label", () => {
  test("tautan [[id]]: semua id ada di registry, himpunan dan jumlah per tujuan terkunci", () => {
    const hitung: Record<string, number> = {};
    for (const m of halaman.matchAll(/\[\[([^\]]+)\]\]/g)) hitung[m[1]!] = (hitung[m[1]!] ?? 0) + 1;
    for (const id of Object.keys(hitung)) expect(id === "A0" || hal.some((x) => x.id === id), id).toBe(true);
    expect(hitung).toEqual({ A0: 1, "t5-service": 3, "t2-idempotency": 2, "t4-modul": 2, "t3-tls-pinning": 1, "t5-mtls": 2 });
  });
  test("template masalah: lima blok dalam urutan, dua pertama terbuka; Cek diri tiga soal; satu tebak details.question; noscript; SkripLama di akhir", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Gejala", "Yang Raka kira", "Yang sebenarnya", "Coba sendiri", "Konsep yang lahir"]);
    expect(cekTemplat("masalah", b)).toEqual([]);
    expect((badan.match(/^<\/Blok>$/gm) ?? []).length).toBe(5);
    expect((badan.match(/^### Cek diri$/gm) ?? []).length).toBe(1);
    expect([...badan.matchAll(/^\*\*(\d)\.\*\* /gm)].map((m) => m[1]).join("")).toBe("123");
    expect((badan.match(/<details class="question">/g) ?? []).length).toBe(1);
    expect((badan.match(/<details class="success">/g) ?? []).length).toBe(3);
    expect((badan.match(/<noscript>/g) ?? []).length).toBe(1);
    expect(badan.trimEnd().endsWith('<SkripLama daftar={["hp","alur-core","alur"]} />')).toBe(true);
    expect(badan).toContain('<WidgetLama nama="alur" src="data/skenario/t5-m47.json" />');
    expect(badan).toContain("<Rantai data={podJurnal} ringkas />");
    expect(halaman).toContain('import podJurnal from "../../../../data/diagram/t5-m47-pod-membuat-jurnal.json";');
    expect(jumlah(badan, "<Rantai ")).toBe(1);
    expect(jumlah(badan, "<WidgetLama")).toBe(1);
    expect(jumlah(badan, "<Snippet ")).toBe(5);
    expect(jumlah(badan, "<Blok ")).toBe(5);
    expect(jumlah(badan, "<details")).toBe(4);
    expect(jumlah(badan, "<summary>")).toBe(4);
    harus("**Yang tidak direkam.**");
  });
  test("tidak ada tabel GFM di halaman (kolom header, pemisah, dan baris diperiksa bila ada)", () => {
    const baris = badan.split("\n");
    for (let i = 0; i < baris.length; i++) {
      if (baris[i]!.startsWith("|") && !(baris[i - 1] ?? "").startsWith("|")) {
        const n = pecahBaris(baris[i]!).length;
        for (let j = i; baris[j]?.startsWith("|"); j++) expect(pecahBaris(baris[j]!).length, `baris ${j + 1}`).toBe(n);
      }
    }
    expect(baris.filter((b) => b.startsWith("|")).length).toBe(0);
  });
  test("adegan Gejala tanpa kalimat definisi: dua paragraf adegan dan dua paragraf catatan", () => {
    const gejala = badan.slice(badan.indexOf('<Blok nama="Gejala"'), badan.indexOf("</Blok>"));
    const paragraf = gejala.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("<"));
    expect(paragraf).toHaveLength(4);
    expect(paragraf.slice(0, 2).some((b) => b.startsWith("*"))).toBe(false);
    expect(paragraf[2]!.startsWith("*Angka cerita (Ilustrasi):*")).toBe(true);
    expect(paragraf[3]!.startsWith("Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]]")).toBe(true);
    for (const b of paragraf) expect(b).not.toMatch(/\b(adalah|yaitu|artinya|berarti|merupakan|disebut)\b/i);
    harus("*Angka cerita (Ilustrasi):* minggu 9, Laras, pod uji, dan namespace notifikasi berasal dari naskah, bukan dari rekaman. Jurnal top-up Rp1.000 untuk akun uji terulang di rekaman lab.");
  });
  test("tebak dulu: jawabannya tidak tertulis di atasnya; teks di atas widget tidak membuka jawaban tebakan widget (handshake, 403, alert, ditolak saat)", () => {
    const iTebak = badan.indexOf('<details class="question">');
    const sebelumTebak = badan.slice(0, iTebak);
    for (const k of ["tidak terisolasi", "semua koneksi masuk diizinkan", "network plugin", "controller", "non-isolated"]) expect(sebelumTebak.toLowerCase(), k).not.toContain(k);
    const jawabanTebak = badan.slice(badan.indexOf("</summary>", iTebak), badan.indexOf("</details>", iTebak));
    expect(jawabanTebak.startsWith("</summary>\n\nBoleh. ")).toBe(true);
    // widget: jawaban (varian) tidak muncul di teks atau JSON Rantai di atasnya
    const sebelumWidget = badan.slice(0, badan.indexOf("<WidgetLama"));
    for (const k of ["handshake", "403", "certificate required", "alert", "ditolak saat", "sertifikat client", "mTLS"]) expect(sebelumWidget, k).not.toContain(k);
    for (const k of ["handshake", "403", "certificate", "alert", "ditolak", "mTLS", "sertifikat client"]) expect(JSON.stringify(rantaiMentah), k).not.toContain(k);
  });
  test("satu kata per konsep: service (bukan layanan), tanpa pembeli, pelanggan, secret, rahasia, replica, klien, kita, Anda; layanan hanya di identifier kode", () => {
    const tanpaKode = badan.replace(/`[^`]*`/g, "").replace(/<Snippet[^>]*>/g, "");
    for (const k of ["pembeli", "pelanggan", "layanan", "secret", "rahasia", "replica", "klien"]) expect(tanpaKode.toLowerCase(), k).not.toContain(k);
    expect(tanpaKode).not.toMatch(/\bAnda\b/);
    expect(tanpaKode).not.toMatch(/\bkita\b/i);
    expect(jumlah(badan, "`X-Layanan-Kunci`")).toBe(1);
    expect((tanpaKode.match(/\bservice\b/gi) ?? []).length).toBeGreaterThan(8);
    expect(jumlah(tanpaKode, "sertifikat client")).toBe(2);
    expect(jumlah(tanpaKode, "Sertifikat client")).toBe(1);
  });
  test("label: 'Rekaman lab' hanya untuk rekaman (rentan, idempoten, mtls, ledger.txt Tahap 4), definisi, dan Snippet; kode lab Tidak dijalankan; penalaran berdefinisi di pemakaian pertama", () => {
    const barisRekaman = badan.split("\n").filter((b) => b.includes("Rekaman lab"));
    expect(barisRekaman.length).toBe(7);
    for (const b of barisRekaman) {
      expect(b.includes("`rentan.txt`") || b.includes("rentan.txt") || b.includes("idempoten.txt") || b.includes("`ledger.txt` bagian A") || b.includes("Arti Ilustrasi, Rekaman lab") || b.includes("rekaman lab.") || b.includes("(Rekaman lab) ") || b.includes("(Rekaman lab).") || b.includes("Rekaman lab: labs/")).toBe(true);
    }
    expect(badan).not.toMatch(/\b\d+ (menit|jam)[^.\n]*\(Rekaman lab\)/);
    expect(jumlah(badan, "(Tidak dijalankan: dibaca dari kode lab)")).toBe(1);
    expect(jumlah(badan, "(Ilustrasi)")).toBe(2);
    expect(jumlah(badan, "[perlu verifikasi]")).toBe(3);
    expect(jumlah(badan, "(penalaran")).toBe(3);
    expect(badan.indexOf("penalaran adalah kesimpulan penulis")).toBeGreaterThan(-1);
    expect(badan.indexOf("penalaran adalah kesimpulan penulis")).toBeLessThan(badan.indexOf("(penalaran dari kode lab)"));
    expect(badan.indexOf("penalaran adalah kesimpulan penulis")).toBeLessThan(badan.indexOf("(penalaran)."));
    expect(jumlah(badan, "Hitungan")).toBe(0);
  });
  test("klaim universal: tak ada 'selalu', 'setiap', 'tidak pernah', 'hanya di'; 'semua' dan 'hanya' hanya di kalimat berlingkup yang terkunci", () => {
    const kalimat = badan.replace(/<noscript>[\s\S]*?<\/noscript>/, "").split(/(?<=[.!?])\s+/);
    for (const k of ["selalu", "setiap", "tidak pernah", "hanya di", "tak satu pun", "tidak satu pun", "mana pun", "siapa pun pengirimnya"]) {
      const cocok = kalimat.filter((s) => s.toLowerCase().includes(k)).map((s) => s.trim().replace(/\s+/g, " "));
      if (k === "siapa pun pengirimnya") expect(cocok).toEqual(["Key yang belum pernah dipakai adalah permintaan baru, siapa pun pengirimnya, karena service ledger tidak menerima parameter pemanggil (penalaran dari kode lab)."]);
      else expect(cocok, k).toEqual([]);
    }
    const semua = kalimat.filter((s) => /\bsemua\b/i.test(s)).map((s) => s.trim().replace(/\s+/g, " "));
    expect(semua).toEqual([
      "Dokumentasi menulis bahwa secara bawaan pod tidak terisolasi untuk koneksi masuk, dan semua koneksi masuk diizinkan ([Kubernetes: Network Policies](" + URL_NP + "), dibuka " + TANGGAL + ", Tidak dijalankan).",
    ]);
    const hanya = kalimat.filter((s) => /\bhanya\b/i.test(s)).map((s) => s.trim().replace(/\s+/g, " "));
    expect(hanya).toHaveLength(4);
    expect(hanya[0]).toContain("Raka mengira jaringan di dalam cluster itu privat, jadi hanya pod milik Rekeningo yang bisa sampai ke ledger.");
    expect(hanya[1]).toContain("Bila NetworkPolicy hanya mengizinkan namespace tertentu, pod uji di namespace lain terhalang.");
    expect(hanya[2]).toContain("tidak ada kepercayaan implisit bagi aset atau akun hanya karena lokasi fisik atau jaringannya.");
    expect(hanya[3]).toContain("Widget ini hanya menunjukkan bahwa satu hal berbeda mengubah hasilnya.");
  });
  test("ID riset, nomor keputusan, dan nomor PR tidak tampil di halaman, rantai, skenario, kartu, dan halaman istilah (kecuali field riset)", () => {
    const tampil = [badan, frontmatter, JSON.stringify(rantaiMentah), JSON.stringify(skenario), JSON.stringify(kartuSemua.filter((x) => x.halaman === "t5-m47"))].join("\n");
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(tampil).not.toMatch(/keputusan \d{3,4}/i);
    expect(tampil).not.toMatch(/(PR|pull request) #?\d{3}\b/);
    const { sumber, ...tanpaRiset } = istilahMentah as Record<string, unknown>;
    expect(JSON.stringify(tanpaRiset)).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(JSON.stringify((sumber as { judul: string; catatan: string }[]).map((s) => [s.judul, s.catatan]))).not.toMatch(/\bR\d-\d{2,3}\b/);
  });
  test("kartu Cek diri: tiga kartu t5-m47, tanya sama dengan soal di halaman, jawaban halaman termuat", () => {
    const k = kartuSemua.filter((x) => x.halaman === "t5-m47");
    expect(k.map((x) => x.id)).toEqual(["t5-m47-1", "t5-m47-2", "t5-m47-3"]);
    const soal = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(k.map((x) => x.tanya)).toEqual(soal);
    const jawaban = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([\s\S]*?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(jawaban).toHaveLength(3);
    k.forEach((x, i) => expect(jawaban[i]).toContain(x.jawab));
    for (const x of k) { expect(x.url).toBe("tahap-5/m47-pod-membuat-jurnal/"); expect(x.judul).toBe(`5.18 ${dari("t5-m47").judul}`); }
    expect(jawaban[0]).toContain("(`idempoten.txt` bagian C)");
    expect(jawaban[0]).toContain("Menurut draf IETF, key dipakai server untuk mengenali percobaan ulang dari permintaan yang sama.");
    expect(jawaban[1]).toContain("[perlu verifikasi]");
    expect(jawaban[1]).toContain("(Tidak dijalankan)");
    expect(jawaban[2]).toContain("(`rentan.txt` bagian A)");
    expect(jawaban[2]).toContain("lab tidak memakai Kubernetes");
  });
});

describe("diagram Rantai dan skenario alur: diturunkan dari rekaman", () => {
  test("diagram Rantai: ringkas, dua baris, sumber rekaman rentan.txt A dan idempoten.txt A dan C, simpul dan sub dari nilai turunan", () => {
    const d = DataRantai.parse(rantaiMentah);
    expect(d).toEqual({
      id: "t5-m47-pod-membuat-jurnal",
      judul: "Ledger versi pertama membuat jurnal untuk pod uji tanpa sertifikat, dan Idempotency-Key hanya membedakan permintaan",
      sumber: { jenis: "rekaman", teks: "Rekaman lab t5-service · rentan.txt bagian A dan idempoten.txt bagian A dan C" },
      baris: [
        { label: "Versi pertama", sub: "ledger tanpa pemeriksa pemanggil", simpul: [
          { teks: "Pod uji, tanpa sertifikat", sub: "key baru, Rp1.000", nada: "biasa", kode: false },
          { teks: `${statusA[1]}: jurnal baru`, sub: "satu jurnal top-up", nada: "biasa", kode: false },
          { teks: `Saldo akun uji ${rp(Number(saldoUji[1]))}`, sub: "lawannya buku bank", nada: "warn", kode: false },
        ] },
        { label: "Key lewat service pembayaran", sub: "sertifikat sah, bukan pod uji", simpul: [
          { teks: "Key sama: satu jurnal", sub: `${idem[nIdemA + 1]!.match(/^status (\d+)/)![1]}, lalu ${idem[nIdemA + 3]!.match(/^status (\d+)/)![1]}`, nada: "good", kode: false },
          { teks: "Key baru: jurnal kedua", sub: "akun dan jumlah sama", nada: "warn", kode: false },
        ] },
      ],
      catatan: "Kotak oranye menandai hasil yang bukan niat tim: jurnal untuk pemanggil tanpa identitas, dan jurnal kedua untuk key baru. Baris kedua memakai service pembayaran dengan sertifikat sah. Pod uji di rekaman adalah perintah panggil di mesin yang sama, bukan pod.",
    });
    expect(rp(Number(postingAkun[3]))).toBe("Rp1.000");
    expect(Number(postingAkun[3])).toBe(-Number(postingBank[3]));
    expect(d.baris[0]!.simpul[0]!.sub).toBe(`key baru, ${rp(Number(postingAkun[3]))}`);
    expect(idem[nIdemC + 1]).toContain('"ulang":false');
  });
  test("skenario alur: valid menurut alur-core, tiga komponen tanpa HP, tiga langkah utama dan tiga langkah varian dari awal, sumber rekaman", () => {
    expect(core.validate(core.normalize(skenario), { exists: (p: string) => fs.existsSync(path.join(akar, p)) })).toEqual([]);
    expect(skenario.sumber.jenis).toBe("rekaman");
    expect(skenario.sumber.file).toBe("labs/t5-service/output/rentan.txt");
    expect(skenario.sumber.fileVarian).toBe("labs/t5-service/output/rentan.txt");
    expect(skenario.perangkat).toEqual([]);
    expect(skenario.layarAwal).toEqual({});
    expect(skenario.komponen).toEqual([{ id: "pod", label: "Pod uji" }, { id: "notif", label: "Service notifikasi" }, { id: "ledger", label: "Ledger" }]);
    expect(skenario.langkah).toHaveLength(3);
    expect(skenario.varian.langkah).toHaveLength(3);
    expect(skenario.varian.mulai).toBe(0);
    expect(core.steps(skenario, true)).toHaveLength(3);
    expect(Object.keys(skenario).sort()).toEqual(["judul", "komponen", "langkah", "layarAwal", "pengantar", "perangkat", "predict", "sumber", "varian", "versi"]);
    expect((skenario as unknown as { versi: number }).versi).toBe(2);
    expect(skenario.predict.varian).toBe(true);
    expect(skenario.sumber.catatan).toContain("Pod uji diperankan oleh perintah panggil di mesin yang sama dengan ledger: lab tidak memakai Kubernetes, jadi tidak ada pod, namespace, atau NetworkPolicy.");
    expect(skenario.sumber.catatan).toContain("rentan.txt bagian B");
    expect(skenario.sumber.catatan).toContain("mtls.txt bagian C");
    expect(skenario.sumber.catatan).toContain("PostgreSQL 17.11");
    expect(rentan[1]).toContain("PostgreSQL 17.11");
  });
  test("skenario: kirim tiap langkah adalah baris dari rekaman dalam urutan aslinya (rentan A, rentan B, mtls C); tak ada baris yang dikarang", () => {
    const urut = (kirim: string, rek: string[], mulai: number, akhir: number): void => {
      let kursor = mulai - 1;
      for (const b of kirim.split("\n")) {
        const i = rek.findIndex((x, k) => k >= kursor && k < akhir && x === b);
        expect(i, `baris tidak ada di rekaman sesudah baris ${kursor}: ${b.slice(0, 70)}`).toBeGreaterThan(-1);
        kursor = i + 1;
      }
    };
    urut(skenario.langkah[0]!.kirim, rentan, nRentanA, nRentanB);
    urut(skenario.langkah[1]!.kirim, rentan, nRentanA, nRentanB);
    urut(skenario.langkah[2]!.kirim, rentan, nRentanA, nRentanB);
    // satu aliran berurutan di bagian A: langkah 1, 2, 3
    urut([skenario.langkah[0]!.kirim, skenario.langkah[1]!.kirim, skenario.langkah[2]!.kirim].join("\n"), rentan, nRentanA, nRentanB);
    urut([skenario.varian.langkah[0]!.kirim, skenario.varian.langkah[1]!.kirim].join("\n"), rentan, nRentanB, rentan.length);
    urut(skenario.varian.langkah[2]!.kirim, mtls, nMtlsC, nMtlsD);
    for (const l of [...skenario.langkah, ...skenario.varian.langkah]) expect(l.kirim.split("\n").filter((b) => b.startsWith("#"))).toEqual([]);
    expect(skenario.langkah[1]!.kirim).toContain(`status ${statusA[1]}`);
    expect(skenario.varian.langkah[0]!.kirim).toContain(`status ${statusHttp[1]} ${statusHttp[2]}`);
    expect(skenario.varian.langkah[2]!.kirim).toContain(`status 403 {"alasan":"jenis-tidak-diizinkan","identitas":"notifikasi","jenis":"topup_bank"}`);
  });
  test("skenario: judul, jelas, dan nada tiap langkah dari nilai turunan", () => {
    expect(skenario.langkah.map((l) => [l.dari, l.ke, l.judul, l.nada])).toEqual([
      ["ledger", undefined, "Ledger berjalan dalam mode rentan, dan belum ada jurnal", undefined],
      ["pod", "ledger", `Pod uji mengirim top-up ${rp(Number(postingAkun[3]))} tanpa sertifikat dan tanpa identitas`, undefined],
      ["ledger", undefined, `Jurnal top-up ${rp(Number(postingAkun[3]))} tercatat untuk akun uji`, "warn"],
    ]);
    expect(skenario.langkah[0]!.jelas).toBe(`Mode rentan adalah kode lab untuk M47: ledger mendengar HTTP biasa, tanpa sertifikat, tanpa identitas, dan tanpa daftar jenis jurnal. Tabel jurnal masih kosong.`);
    expect(jurnalSebelum).toBe(0);
    expect(skenario.langkah[1]!.jelas).toBe(`Pemanggil hanya membawa Idempotency-Key yang belum pernah dipakai. Ledger menjawab ${statusA[1]} dan membuat jurnal. Perintah panggil memerankan pod uji di mesin yang sama, jadi tidak ada cluster di rekaman.`);
    expect(skenario.langkah[2]!.jelas).toBe(`Jurnal punya dua posting: minus ${rp(-Number(postingBank[3]))} di buku tanpa akun (buku bank, dibaca dari kode lab) dan plus ${rp(Number(postingAkun[3]))} untuk akun uji ${postingAkun[2]}. Saldo akun uji menjadi ${rp(Number(saldoUji[1]))} tanpa ada kiriman dari bank (penalaran).`);
    expect(skenario.varian.label).toBe("ledger menuntut sertifikat client");
    expect(skenario.varian.langkah.map((l) => [l.dari, l.ke, l.judul, l.nada])).toEqual([
      ["pod", "ledger", "Versi benar di port yang sama: pod uji memanggil dengan HTTP biasa", undefined],
      ["pod", "ledger", "Pod uji mencoba handshake TLS tanpa sertifikat, dan jurnalnya nol", "good"],
      ["notif", "ledger", "Service notifikasi dengan sertifikat sah dijawab 403", "good"],
    ]);
    expect(skenario.varian.langkah[0]!.jelas).toBe(`Ledger versi benar hanya mendengar HTTPS. Pod uji yang sama dijawab ${statusHttp[1]} oleh server.`);
    expect(skenario.varian.langkah[1]!.jelas).toBe(`Sonde menyelesaikan handshake, tidak mengirim permintaan HTTP, dan menunggu paling lama 500 milidetik untuk alert. Server menolak pemanggil tanpa sertifikat dengan alert certificate required. Jurnal untuk key kedua ${["nol"][jurnalKeyKedua]}, sesudah percobaan HTTP biasa dan sonde.`);
    expect(skenario.varian.langkah[2]!.jelas).toBe("Pemanggil ini punya sertifikat sah, jadi handshake lolos. Handler ledger membaca identitas notifikasi dan menjawab 403 untuk jurnal topup_bank. Cara kerjanya dibahas di halaman berikutnya.");
    expect(skenario.pengantar).toBe("Laras memanggil ledger dari satu pod uji. Ikuti langkahnya, lalu centang 'Ubah satu hal' dan tebak apa yang terjadi bila ledger menuntut sertifikat client.");
  });
  test("tebakan skenario: varian, jawaban benar di pilihan keempat (posisi berbeda dari 5.20), pertanyaan dan pilihan dari rekaman, penjelasan memuat sumber", () => {
    const p = skenario.predict;
    expect(p.varian).toBe(true);
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(3);
    expect(p.options[p.answer]).toBe("Server menolak saat handshake TLS: handler ledger tidak berjalan dan jurnal untuk key itu nol");
    expect(p.q).toBe(`Ledger yang sama sekarang menuntut sertifikat client. Pod uji yang sama, tanpa sertifikat, mencoba menyambung untuk mengirim top-up ${rp(Number(postingAkun[3]))} dengan key baru. Apa yang terjadi di sisi ledger?`);
    expect(p.options.slice(0, 3)).toEqual([
      "Ledger tetap membuat jurnal: key baru adalah permintaan baru, siapa pun pengirimnya",
      "Handler ledger menjawab 401 karena pemanggil tanpa identitas, dan jurnal tidak dibuat",
      "Handler ledger menjawab 403 karena pod uji bukan pembayaran, dan jurnal tidak dibuat",
    ]);
    expect(p.explain).toBe("Server menolak saat handshake. Sonde tanpa sertifikat menerima alert certificate required, dan jumlah jurnal untuk key kedua nol (rentan.txt bagian B). Log ledger mencatat galat handshake dan tidak mencatat keputusan identitas untuk penolakan seperti itu (mtls.txt bagian B dan E). Jawaban 403 hanya untuk pemanggil yang sertifikatnya sah.");
    // dua jawaban salah dibantah rekaman: 401 hanya untuk rantai sah tanpa SAN (mtls D), 403 untuk sertifikat sah (mtls C)
    expect(mtls.join("\n")).toContain('status 401 {"alasan":"tanpa-identitas"}');
    expect(mtls[garis(mtls, /^\$ panggil dengan sertifikat tanpa-san/)]).toBe('status 401 {"alasan":"tanpa-identitas"}');
    // jawaban benar dibuka hanya di akhir jalur varian (jalurTebakan = varian)
    expect(core.steps(skenario, false).length).toBe(3);
    // tebakan tidak membocorkan jawaban di langkah utama
    for (const l of skenario.langkah) expect(l.kirim + l.jelas + l.judul).not.toMatch(/handshake|certificate required|403|ditolak/i);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Lapis 2: kunci kalimat dan sidik (dibangkitkan dari berkas saat ini oleh PERBARUI_KUNCI=1)
const KATA = ["tidak", "bukan", "belum", "hanya", "tanpa", "sesudah", "sebelum", "juga", "setiap", "semua", "lebih dari", "paling banyak", "selalu", "sama", "sampai", "tetap", "tiap", "satu", "dua", "tiga", "empat", "lima", "enam", "atau", "dan", "kecuali", "saja", "baru", "masih", "kurang", "cukup", "ya", "karena", "jadi", "bila", "saat", "bisa", "boleh", "harus", "mungkin", "terbukti", "membantu", "dibaca", "diukur", "direkam", "dijalankan", "ditolak", "berhasil", "naik", "turun", "di atas", "di bawah", "tepat", "lama", "lebih", "dilewati", "habis", "key", "jurnal", "sebaiknya", "kadang", "menolak", "boleh", "bawaan", "tidak berefek", "mengira"];
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
const kartuT5m47 = kartuSemua.filter((x) => x.halaman === "t5-m47");
const sidikSekarang = {
  label: {
    rekamanLab: (halaman.match(/Rekaman lab/g) ?? []).length, tidakDijalankan: (halaman.match(/Tidak dijalankan/g) ?? []).length, asumsi: (halaman.match(/Asumsi/g) ?? []).length,
    hitungan: (halaman.match(/Hitungan/g) ?? []).length, ilustrasi: (halaman.match(/Ilustrasi/g) ?? []).length, perluVerifikasi: (halaman.match(/\[perlu verifikasi\]/g) ?? []).length,
    penalaran: (halaman.match(/penalaran/gi) ?? []).length, dibuka: (halaman.match(/dibuka 2026-11-04/g) ?? []).length, tanggal: (halaman.match(/2026-11-04/g) ?? []).length,
  },
  halaman: sidikKata(halaman, KATA), rantai: sidikKata(nilaiString(rantaiMentah).join("\n"), KATA), skenario: sidikKata(nilaiString(skenario).join("\n"), KATA),
  struktur: struktur.join(" "), angka: prosa.flatMap((b) => angkaDari(b)).join(" "),
  riset: ["R5-195", "R5-196", "R5-197", "R5-198", "R5-199"].map((id) => h16(barisRiset(id))),
  berkas: { rantai: h16(JSON.stringify(rantaiMentah)), skenario: h16(JSON.stringify(skenario)), kartu: h16(JSON.stringify(kartuT5m47)), istilah: h16(JSON.stringify(istilahMentah)), frontmatter: h16(halaman.split("\n---\n")[0]!) },
};
const sekarang = {
  halaman: halaman.split("\n").filter((b) => b.trim() !== ""),
  json: { rantai: tekstual(rantaiMentah), skenario: tekstual(skenario), kartu: tekstual(kartuT5m47), istilah: tekstual(istilahMentah) },
};

if (process.env.PERBARUI_KUNCI === "1") {
  const isi = `// Dihasilkan dari file saat ini oleh PERBARUI_KUNCI=1 (lihat m47-pod-membuat-jurnal.halaman.test.ts). Ubah hanya sesudah membaca perbedaannya.\n` +
    `export const SIDIK = ${JSON.stringify(sidikSekarang)};\n` +
    `export const KALIMAT_TERKUNCI: string[] = ${JSON.stringify(sekarang.halaman, null, 1)};\n` +
    `export const KUNCI_JSON: Record<string, string[]> = ${JSON.stringify(sekarang.json, null, 1)};\n`;
  fs.writeFileSync(path.join(__dirname, "m47-pod-membuat-jurnal.halaman.nilai.ts"), isi);
}

describe("kunci kalimat: teks halaman, diagram, skenario, kartu, dan halaman istilah terkunci per baris (lapis 2)", () => {
  (tanpaKunci ? test.skip : test)("setiap baris halaman sama dengan yang dikunci, dalam urutan yang sama", () => {
    expect(sekarang.halaman).toEqual(KALIMAT_TERKUNCI);
  });
  (tanpaKunci ? test.skip : test)("setiap string dan angka diagram, skenario, kartu, dan halaman istilah sama dengan yang dikunci", () => {
    expect(sekarang.json).toEqual(KUNCI_JSON);
  });
});

describe("penutup celah mutasi tanpa kunci: label, kata penentu, struktur, angka, dan berkas", () => {
  (tanpaSidik ? test.skip : test)("jumlah label per jenis: Asumsi tidak naik menjadi Rekaman lab, dan tanggal buka tidak bergeser", () => {
    expect(sidikSekarang.label).toEqual(SIDIK.label);
    expect(sidikSekarang.label.rekamanLab).toBe(7);
    expect(sidikSekarang.label.dibuka).toBe(4);
  });
  (tanpaSidik ? test.skip : test)("sidik kata penentu halaman, diagram, dan skenario", () => {
    expect(sidikSekarang.halaman).toEqual(SIDIK.halaman);
    expect(sidikSekarang.rantai).toEqual(SIDIK.rantai);
    expect(sidikSekarang.skenario).toEqual(SIDIK.skenario);
  });
  (tanpaSidik ? test.skip : test)("sidik struktur, angka prosa, baris riset, dan berkas JSON serta frontmatter", () => {
    expect(sidikSekarang.struktur).toBe(SIDIK.struktur);
    expect(sidikSekarang.angka).toBe(SIDIK.angka);
    expect(sidikSekarang.riset).toEqual(SIDIK.riset);
    expect(sidikSekarang.berkas).toEqual(SIDIK.berkas);
  });
});
