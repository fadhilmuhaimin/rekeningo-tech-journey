// Penjaga angka halaman 3.3 (keputusan 1008): angka, ID, nomor, versi sumber, tautan, dan klaim "tidak ada" yang ditulis
// tangan di fitur-notifikasi.mdx, diagram t3-notifikasi-inti.json, peta t3-peta-notifikasi.json, skenario alur
// t3-notifikasi.json, dan halaman istilah token-perangkat.json diturunkan dari rekaman labs/, naskah, registry, dan RISET,
// bukan dari daftar yang ditulis sendiri. Pola: job-rekonsiliasi.halaman.test.ts dan rekap-t2.halaman.test.ts.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import rantai from "../../data/diagram/t3-notifikasi-inti.json";
import peta from "../../data/widget/t3-peta-notifikasi.json";
import istilah from "../../data/halaman-istilah/token-perangkat.json";
import registry from "../../data/cerita.json";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const halaman = baca("situs/src/content/docs/tahap-3/fitur-notifikasi.mdx");
const skenarioMentah = baca("situs/lama/widgets/data/skenario/t3-notifikasi.json");
const skenario = JSON.parse(skenarioMentah) as Skenario;
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const setelah = baca("plan/SETELAH-TAHAP-3.md");
const outbox = baca("labs/api-t3/output/outbox.txt");
const push = baca("labs/api-t3/output/push.txt");
const sinkron = baca("labs/api-t3/output/sinkron.txt");
const katalog = baca("labs/api-t3/output/katalog.txt");
const kontrak = baca("labs/api-t3/output/kontrak.txt");
const transaksi = baca("labs/t3-outbox/output/transaksi.txt");
const antre = baca("labs/t3-outbox/output/queue.txt");
const realtime = baca("labs/e4-realtime/output/realtime.txt");

interface Layar { saldo?: number; isi?: { jenis: string; teks?: string; kiri?: string; kanan?: string }[] }
interface Langkah { dari: string; ke?: string; judul: string; kirim: string; jelas: string; layar?: Record<string, Layar> }
interface Skenario {
  sumber: { file: string; catatan: string };
  layarAwal: Record<string, Layar>;
  predict: { q: string; options: string[]; answer: number; explain: string };
  langkah: Langkah[];
  varian: { mulai: number; langkah: Langkah[] };
}

interface Bagian { awal: number; akhir: number; baris: string[] }
// Bagian rekaman diawali "# --- X. ..."; awal dan akhir adalah nomor baris (mulai 1) yang dipakai Snippet.
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
const O = pecah(outbox);
const P = pecah(push);
const K = pecah(katalog);
const T = pecah(transaksi);
const Q = pecah(antre);
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
const rp = (n: number): string => `Rp${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const koma = (n: number, d: number): string => n.toFixed(d).replace(".", ",");
const harus = (kalimat: string): void => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);

// ---- nilai turunan dari rekaman -------------------------------------------------------------
// outbox.txt A: Budi bayar ke Warung Ani.
const A = bagian(O, "A").baris;
const jurnal = Number(cari(/^Location: \/transfers\/(\d+)$/, A, "jurnal A")[1]);
const saldoBudi = Number(cari(/^\{"id":\d+,"saldo":(\d+)\}$/, A, "saldo A")[1]);
const bodyBayar = JSON.parse(cari(/-d '(\{.*\})'$/, A, "body A")[1]!) as { ke: number; nominal: number; catatan: string };
const barisOutbox = cari(/^ (\d+)\s+\| (\d+)\s+\| (\d+)\s+\| (\d+)\s+\| (\w+)\s+\| (\w+)\s+\| (\d+)\s+\| (.+?)\s+\| (.+?)\s+\|/, A, "baris outbox A");
const outboxId = Number(barisOutbox[1]);
const penerima = Number(barisOutbox[3]);
const kelasBayar = Number(barisOutbox[4]);
const judulPesan = barisOutbox[8]!;
const catatan = barisOutbox[9]!;
const pushSesudah201 = Number(cari(/^push tiruan menerima: (\d+)$/, A, "push A")[1]);
// outbox.txt B, D, F, G.
const B = bagian(O, "B").baris;
const pushB = cari(/^push tiruan menerima: (\d+) pesan untuk token (\S+), notifikasi_id/, B, "push B");
const ringkasB = cari(/^(worker: diklaim 1, terkirim 1, dilewati 0, ditunda 0, mati 0)$/, B, "worker B")[1]!;
const D = bagian(O, "D").baris;
const batalD = cari(/-- SQLSTATE 23514 · constraint (\w+)/, D, "constraint D")[1]!;
const kosongD = cari(/^ (\d+)\s+\| (\d+)\s*$/, D, "kosong D");
const E = bagian(O, "E").baris;
const kelasE: Record<string, number> = {};
for (const b of E) {
  const m = b.match(/^ (\d)\s+\| (\w+)\s+\| menunggu\s+\| (\d+)\s*$/);
  if (m) kelasE[m[2]!] = Number(m[1]);
}
const F = bagian(O, "F").baris;
const urutF = cari(/^urutan di layanan push: (.+)$/, F, "urutan F")[1]!.split(" -> ");
const G = bagian(O, "G").baris;
const pushG = cari(/^push tiruan menerima: (\d+) pesan, (\d+) notifikasi_id/, G, "push G");
const timeoutPush = Number(cari(/push timeout (\d+)s/, outbox.split("\n"), "timeout push")[1]);
// push.txt.
const PB = bagian(P, "B").baris;
const percobaanB = Number(cari(/^putaran 3: outbox\.status = terkirim, percobaan = (\d+)$/, PB, "percobaan B")[1]);
const PC = bagian(P, "C").baris;
const matiC = cari(/^putaran 5: outbox\.status = mati, percobaan = (\d+)$/, PC, "mati C");
const PD = bagian(P, "D").baris;
const PE = bagian(P, "E").baris;
const ringkasE = cari(/^(worker: diklaim 1, terkirim 0, dilewati 0, ditunda 1, mati 0)$/, PE, "worker E")[1]!;
const timeoutE = cari(/^log: outbox \d+ percobaan 1: push gagal sementara: .*: (context deadline exceeded \(.*\))$/, PE, "timeout E")[1]!;
const PF = bagian(P, "F").baris;
// sinkron.txt A.
const SA = bagian(pecah(sinkron), "A").baris;
const idToken = Number(cari(/^\{"id":(\d+)\}$/, SA, "id token")[1]);
const idUlang = SA.filter((b) => b === `{"id":${idToken}}`).length;
const dimas = Number(cari(/atas nama Dimas \((\d+)\)/, SA, "akun Dimas")[1]);
const pindah = cari(new RegExp(`^ (\\d+)\\s+\\| (${dimas})\\s+\\| ios\\s+\\| t$`), SA, "token pindah");
// katalog.txt B dan F.
const KB = bagian(K, "B").baris;
const hargaEfektif = cari(/katalog Warung Ani, item Nasi goreng: \{"id":1,"nama":"Nasi goreng","harga":(\d+),"harga_efektif":(\d+)/, KB, "harga efektif");
const KF = bagian(K, "F").baris;
const diumumkan = Number(cari(/^\{"diumumkan":(\d+),"id":\d+\}$/, KF, "diumumkan")[1]);
const karyawanJakarta = Number(cari(/^ (\d+)\s*$/, KF.slice(KF.findIndex((b) => b.includes("karyawan_jakarta"))), "karyawan Jakarta")[1]);
// queue.txt.
const QB = bagian(Q, "B").baris;
const promoSemua = Number(cari(/^jumlah pemberitahuan promo yang ditulis: (\d+)$/, QB, "promo semua")[1]);
const perKota = QB.flatMap((b) => {
  const m = b.match(/^ (\w+)\s+\| (\d+)$/);
  return m ? [Number(m[2])] : [];
});
const kapasitas = cari(/^kapasitas diukur: antara (\d+) dan ([\d,]+) per detik/, bagian(Q, "A").baris, "kapasitas");
const bawah = Number(kapasitas[1]);
const atas = Number(kapasitas[2]!.replace(",", "."));
const QE = cari(/kurang dari ([\d,]+) detik/, bagian(Q, "E").baris, "banjir promo")[1]!;
// polling lawan SSE (e4-realtime).
const sse = Number(cari(/^\s*([\d.]+) s\s+sse\s+event: \{"status":"siap diambil"\}$/, realtime.split("\n"), "sse")[1]);
const polling = Number(cari(/^\s*([\d.]+) s\s+polling\s+request #3: \{"status":"siap diambil"\}$/, realtime.split("\n"), "polling")[1]);
const selangPolling = Number(cari(/^\s*([\d.]+) s\s+polling\s+request #2/, realtime.split("\n"), "selang polling")[1]);
// beban: rumus naskah dengan masukan yang ditulis halaman.
const puncak = (7500 / 86400) * 10;
const kapasitasRumus = 4 / 0.3;

const rasio = Math.round(kapasitasRumus / puncak);
const promoDetik = promoSemua / kapasitasRumus;

describe("rekaman: nilai turunan yang dipakai halaman", () => {
  test("satu pembayaran Rp25.000 ke Warung Ani: jurnal, saldo, outbox kelas 0, push 0 lalu 1", () => {
    expect(bodyBayar.nominal).toBe(25000);
    expect(bodyBayar.ke).toBe(penerima);
    expect(saldoBudi).toBe(250000 - bodyBayar.nominal);
    expect(outboxId).toBe(1);
    expect(kelasBayar).toBe(0);
    expect(pushSesudah201).toBe(0);
    expect(Number(pushB[1])).toBe(1);
    expect(pushB[2]).toBe(`tiruan-${penerima}`);
  });
  test("COMMIT ditolak membuang jurnal dan outbox; urutan kirim kelas 0 sebelum top-up; ganda 2 pesan 1 id", () => {
    expect(batalD).toBe("jurnal_seimbang");
    expect([Number(kosongD[1]), Number(kosongD[2])]).toEqual([0, 0]);
    expect(kelasE).toEqual({ bayar: 0, transfer: 0, topup: 1 });
    expect(urutF.slice(0, 2)).toEqual([`tiruan-${penerima}`, "tiruan-417"]);
    expect(urutF.slice(2)).toHaveLength(3);
    expect([Number(pushG[1]), Number(pushG[2])]).toEqual([2, 1]);
  });
  test("push.txt: 503 dua kali lalu berhasil di percobaan 3, mati di percobaan 5, token mati dilewati, menggantung berhenti di batas", () => {
    expect(percobaanB).toBe(3);
    expect(Number(matiC[1])).toBe(5);
    expect(PD.some((b) => b === "worker: diklaim 1, terkirim 0, dilewati 1, ditunda 0, mati 0")).toBe(true);
    expect(PD.some((b) => b.includes("tidak ada perangkat aktif, baris dilewati tanpa memanggil layanan push"))).toBe(true);
    expect(timeoutE).toBe("context deadline exceeded (Client.Timeout exceeded while awaiting headers)");
    expect(timeoutPush).toBe(3);
    expect(PF.some((b) => b.includes("GET /akun/419 tetap 200"))).toBe(true);
    expect(PF.some((b) => b.trim() === "(0 rows)")).toBe(true);
  });
  test("token: id berulang satu baris, symbian 422, token pindah ke akun 417", () => {
    expect(idUlang).toBe(2);
    expect(SA.some((b) => b.includes('"pesan":"android atau ios"'))).toBe(true);
    expect(SA.some((b) => b.startsWith("HTTP/1.1 422 Unprocessable Entity"))).toBe(true);
    expect(Number(pindah[2])).toBe(dimas);
    expect(dimas).toBe(417);
    expect(SA.filter((b) => b.startsWith(` ${pindah[1]} `)).length).toBe(1);
  });
  test("promo: harga efektif 10%, Budi 403, 1.000 baris untuk Jakarta, 10.000 untuk enam kota", () => {
    expect(Number(hargaEfektif[2])).toBe((Number(hargaEfektif[1]) * 90) / 100);
    expect(KB.some((b) => b.includes('"status":403'))).toBe(true);
    expect(diumumkan).toBe(karyawanJakarta);
    expect(perKota).toHaveLength(6);
    expect(perKota.reduce((a, b) => a + b, 0)).toBe(promoSemua);
  });
  test("kapasitas, banjir promo, polling lawan SSE, dan beban dari rumus naskah", () => {
    expect([bawah, atas]).toEqual([12, 13.33]);
    expect(QE).toBe("1,5");
    expect(sse).toBe(7.1);
    expect(polling).toBe(10.1);
    expect(selangPolling).toBe(5.1);
    expect(puncak.toFixed(3)).toBe("0.868");
    expect(kapasitasRumus.toFixed(2)).toBe("13.33");
    expect(rasio).toBe(15);
    expect(Math.round(promoDetik)).toBe(750);
    expect(transaksi).toContain("HTTP/1.1 500 Internal Server Error");
    expect(kontrak).toContain("response-property-enum-value-added");
    expect(kontrak).toContain("`hr` enum value");
  });
});

describe("fitur-notifikasi.mdx: tiap angka turunan dari rekaman", () => {
  test("Inti dan Rantai", () => {
    harus(`Budi membayar ${rp(bodyBayar.nominal)} ke Warung Ani dengan catatan "${catatan}". Satu transaction menulis jurnal ${jurnal}, dua posting, dan satu baris outbox untuk Ani.`);
    harus(`Budi mendapat \`201\` dengan saldo ${rp(saldoBudi)}, dan saat itu layanan push belum menerima apa pun`);
    harus(`client worker berhenti di batas ${timeoutPush} detik`);
    const simpul = rantai.baris.map((b) => b.simpul.map((s) => [s.teks, s.sub]));
    expect(simpul).toEqual([
      [
        ["201 + baris outbox", "satu transaction"],
        [`push: ${pushSesudah201} pesan`, "belum dikirim"],
        ["terkirim", `worker, ${pushB[1]} pesan untuk Ani`],
      ],
      [
        ["201 + baris outbox", "satu transaction"],
        [`berhenti di ${timeoutPush} detik`, "batas client worker"],
        ["baris menunggu", "percobaan 1, dikirim lagi nanti"],
      ],
    ]);
    expect(rantai.sumber.teks).toBe("Rekaman lab api-t3 · outbox.txt A dan B, push.txt E dan F");
  });

  test("tabel Baris PRD sama dengan naskah bagian 1, dan metrik 95% hanya bayar dan transfer", () => {
    const barisNaskah = naskah.split("\n").filter((b) => /^\| P[01] \| (Notifikasi saat menerima uang|Promo dari HR|Catatan pada pembayaran dan transfer) \|/.test(b));
    expect(barisNaskah).toHaveLength(3);
    for (const b of barisNaskah) harus(b.replace("(M27)", "([[t3-m27]])"));
    expect(naskah).toContain('"Ani tidak boleh diberi tahu uang masuk sebelum uang itu benar-benar tercatat."');
    harus('*"Ani tidak boleh diberi tahu uang masuk sebelum uang itu benar-benar tercatat."*');
    expect(naskah).toContain("95% notifikasi bayar dan transfer diserahkan ke layanan push dalam kurang dari 30 detik");
    harus('Janji 95% dalam kurang dari 30 detik hanya untuk bayar dan transfer, dan PRD mengukurnya sampai "diserahkan ke layanan push". Sampai ke HP tidak diukur.');
    harus("Janji 95% dalam 30 detik sendiri tidak diukur di lab.");
  });

  test("versi app 3.0 dan 3.1 dari catatan SETELAH-TAHAP-3 dan naskah M26", () => {
    expect(setelah).toContain("(3.0 notifikasi, 3.1 rilis M26)");
    expect(naskah).toMatch(/\| M26 \|[^\n]*App 3\.1 memuat flag/);
    harus("app 3.0 membawa notifikasi, dan app 3.1 adalah rilis yang dipakai di [[t3-m26]]");
    harus("App 1.0 dan 1.1 tidak punya layar izin");
    harus(`berakhir \`dilewati\` (keadaan tanpa perangkat aktif direkam di \`push.txt\` bagian D)`);
  });

  test("Coba: bagian rekaman yang disebut", () => {
    harus("mengikuti rekaman `outbox.txt`");
    harus("Client worker berhenti di batas 3 detik dan barisnya tetap `menunggu` (`push.txt` bagian E)");
    harus("Di bagian F, pembayaran selesai dalam kurang dari 1 detik, dan tidak ada koneksi server yang diam di dalam transaction.");
    expect(timeoutPush).toBe(3);
  });

  test("Backend: token, outbox, status, kelas, promo, beban", () => {
    harus(`Token \`hp-ani-1\` yang dikirim dua kali tetap satu baris, id ${idToken}. Platform \`symbian\` dijawab \`422\`. Di akhir, satu token iOS pindah ke Dimas, akun ${pindah[2]}.`);
    harus(`trigger yang menolak \`INSERT\` outbox membuat \`POST /transfers\` dijawab \`500\``);
    harus(`jurnal yang tidak seimbang gagal di constraint \`${batalD}\``);
    harus(`503 dua kali lalu berhasil di percobaan ke-${percobaanB}, dan 503 terus-menerus sampai \`mati\` di percobaan ke-${matiC[1]}`);
    harus("Setiap baris punya kelas: 0 untuk bayar dan transfer, 1 untuk top-up, 2 untuk promo.");
    const kode = baca("labs/api-t3/internal/repo/outbox.go");
    expect(kode).toMatch(/KelasUang\s+= 0/);
    expect(kode).toMatch(/KelasTopup\s+= 1/);
    expect(kode).toMatch(/KelasPromo\s+= 2/);
    harus(`Nasi goreng Warung Ani jadi ${rp(Number(hargaEfektif[2]))} dari ${rp(Number(hargaEfektif[1]))}.`);
    harus(`Jakarta punya ${titik(karyawanJakarta)} karyawan, jadi satu pengumuman menulis ${titik(diumumkan)} baris.`);
    harus(`queue yang sama membawa ${titik(promoSemua)} baris promo`);
    harus(`| Bayar dan transfer di puncak | 7.500 per hari ÷ 86.400 × 10 | ${koma(puncak, 3)} pemberitahuan per detik (Asumsi) |`);
    harus(`| Kapasitas worker | 4 pengirim ÷ 0,3 detik | ${koma(kapasitasRumus, 1)} per detik; terukur antara ${bawah} dan ${koma(atas, 2)} (Rekaman lab \`queue.txt\` bagian A; c dan t Asumsi) |`);
    harus(`| Kapasitas lawan puncak | ${koma(atas, 2)} ÷ ${koma(puncak, 3)} | ±${rasio} kali (Asumsi) |`);
    harus(`| Promo ke ${titik(promoSemua)} HP | ${titik(promoSemua)} ÷ ${koma(atas, 2)} | ${Math.round(promoDetik)} detik, ${koma(Math.round(promoDetik) / 60, 1)} menit (Asumsi; tidak dijalankan ${koma(Math.round(promoDetik) / 60, 1)} menit) |`);
    harus(`Dengan kapasitas ±${rasio} kali puncak, baris kelas 0 hampir tidak pernah menunggu lama (Asumsi).`);
    harus(`terkirim dalam kurang dari ${QE} detik (\`queue.txt\` bagian E)`);
    harus("Bayar, transfer, dan top-up menulisnya di `outbox.txt` bagian E, dan promo di `katalog.txt` bagian F.");
    harus("Dua baris kelas 0 dikirim lebih dulu, padahal nomor ketiga baris top-up lebih kecil daripada nomor baris transfer.");
    // Nomor outbox tiga top-up lebih kecil daripada nomor transfer di rekaman: top-up ditulis lebih dulu (outbox.txt E).
    expect(E.findIndex((b) => b.includes("/topup?"))).toBeLessThan(E.findIndex((b) => b.includes("/kiriman")));
  });

  test("Di app: polling lawan SSE, jumlah 100 pesan, 270 hari, Android 13, tanggal dibuka", () => {
    harus(`SSE memberi tahu di detik ${koma(sse, 1)}, dan polling tiap 5 detik baru tahu di detik ${koma(polling, 1)}`);
    harus("Status berubah di detik ke-7.");
    expect(selangPolling).toBe(5.1);
    const baris = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`)) ?? "";
    const hari = Number(baris("R3-111").match(/sesudah (\d+) hari/)![1]);
    const pesan = Number(baris("R3-112").match(/lebih dari (\d+) pesan/)![1]);
    harus(`dihapus sesudah ${hari} hari`);
    harus(`lebih dari ${pesan} pesan menunggu di satu HP`);
    expect(baris("R3-113")).toContain("POST_NOTIFICATIONS");
    expect(baris("R3-113")).toContain("API 33 ke atas");
    harus("Android 13 ke atas punya izin runtime `POST_NOTIFICATIONS`");
    const tanggal = new Set([...halaman.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]));
    expect([...tanggal]).toEqual(["2026-10-26"]);
    for (const id of ["R3-110", "R3-111", "R3-113"]) expect(baris(id), id).toContain("dibuka 2026-10-26");
    const diperbarui = new Set([...halaman.matchAll(/diperbarui (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]));
    expect([...diperbarui]).toEqual(["2026-10-23"]);
    expect(baris("R3-111")).toContain("diperbarui 2026-10-23");
    for (const id of ["R3-110", "R3-111", "R3-112", "R3-113", "R3-114"]) expect(baris(id), id).not.toBe("");
  });

  test("rujukan dokumentasi berlabel Tidak dijalankan: di paragraf yang sama, atau di blok app yang menyatakannya di pembukanya", () => {
    const awalApp = halaman.indexOf('<Blok nama="Di app');
    const akhirApp = halaman.indexOf('<Blok nama="Konsep yang akan dibutuhkan"');
    expect(awalApp).toBeGreaterThan(0);
    expect(akhirApp).toBeGreaterThan(awalApp);
    const blokApp = halaman.slice(awalApp, akhirApp);
    expect(blokApp).toContain("Semua rujukan dokumentasi di blok ini berlabel Tidak dijalankan");
    const di = (teks: string): string[] => teks.split("\n\n").filter((p) => /dibuka 2026-10-26/.test(p));
    const luar = di(halaman.slice(0, awalApp));
    expect(luar.length).toBeGreaterThanOrEqual(5);
    for (const p of luar) expect(p, `paragraf berumur dokumentasi tanpa label: ${p.slice(0, 60)}`).toContain("Tidak dijalankan");
    expect(di(blokApp).length).toBeGreaterThanOrEqual(1);
  });
  test("tiap tautan dokumentasi ke domain sumber ditulis juga di baris RISET, dan nama API Dart ada di RISET", () => {
    const url = [...halaman.matchAll(/\]\((https:\/\/(?:firebase\.google\.com|developer\.android\.com|html\.spec\.whatwg\.org)\/[^)\s]+)\)/g)].map((m) => m[1]!);
    expect(url.length).toBeGreaterThanOrEqual(9);
    for (const u of url) {
      const bagianPath = u.replace(/^https:\/\/[^/]+\//, "").replace(/\/$/, "").split("/").slice(-2).join("/");
      const pola = new RegExp(`${bagianPath.replace(/[.*+?^${"$"}{}()|[\]\\/]/g, "\\$&")}(?![\\w.-])`);
      expect(riset, `RISET tidak menyebut ${bagianPath} (${u})`).toMatch(pola);
    }
    const dart = halaman.match(/<Snippet lang="dart" code=\{`([^`]+)`\} \/>/)![1]!;
    for (const api of ["requestPermission", "onRegistered", "register", "onMessage"]) {
      expect(dart).toContain(api);
      expect(riset, `RISET tidak menyebut ${api}`).toContain(api);
    }
    harus("Halaman FlutterFire menyebut `getToken()` deprecated.");
    expect(riset).toContain("`getToken()` deprecated");
    expect(dart).toContain("message.data['notifikasi_id']");
    expect(riset).toContain("data message");
  });
});

describe("rujukan [[ID]] dan registry", () => {
  const entri = (id: string) => (registry.halaman as unknown as { id: string; judul: string; nomor?: string; ada: boolean; jenis?: string; bagian?: number; inti?: boolean; lab?: string[]; prasyarat?: string[]; lebur_ke?: string }[]).find((h) => h.id === id);
  test("halaman 3.3 terdaftar sebagai Fitur bagian 2 ★ dengan lab api-t3, prasyarat 3.2, dan E4 melebur ke sini", () => {
    const h = entri("t3-notifikasi")!;
    expect(h.ada).toBe(true);
    expect([h.nomor, h.jenis, h.bagian, h.inti, h.lab, h.prasyarat]).toEqual(["3.3", "fitur", 2, true, ["api-t3"], ["t3-fitur-teknis"]]);
    expect(h.judul).toBe("Fitur: notifikasi push dan promo HR");
    expect(entri("E4")!.lebur_ke).toBe("t3-notifikasi");
    expect(naskah).toMatch(/\| 3\.3 \| 2 \| Fitur: notifikasi push dan promo HR \| Fitur → teknis \| ★ \| api-t3 \| alur \|/);
  });
  test("setiap [[ID]] ada di registry, dan tiap rujukan bernama sesuai halamannya", () => {
    const semua = new Set([...halaman.matchAll(/\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => m[1]!));
    for (const id of semua) expect(entri(id), `[[${id}]] tidak ada di registry`).toBeDefined();
    const peran: [string, string][] = [
      ["t3-dua-tempat", "dua tempat"],
      ["t3-pool", "connection pool"],
      ["t3-outbox", "outbox"],
      ["t3-klaim-baris", "klaim per baris"],
      ["t3-at-least-once", "at-least-once"],
      ["t3-m27", "m27"],
      ["t3-m26", "m26"],
      ["t3-m18", "m18"],
      ["t3-fitur-teknis", "pekerjaan teknis"],
    ];
    for (const [id, kata] of peran) {
      expect(semua.has(id), `halaman tidak merujuk ${id}`).toBe(true);
      expect(entri(id)!.judul.toLowerCase(), id).toContain(kata);
    }
    expect([...semua].sort()).toEqual([...peran.map((p) => p[0]), "A0"].sort());
    expect(entri("A0")!.judul).toBe("Cara pakai panduan ini");
  });
  test("tiap rujukan [[ID]] menempel pada kalimat yang menjelaskannya, berurutan", () => {
    const lokasi = [...halaman.matchAll(/(.{0,28})\[\[([A-Za-z0-9.-]+)\]\]/g)].map((m) => `${m[1]}→${m[2]}`);
    expect(lokasi).toEqual([
      "· coba 2 menit · Prasyarat: →t3-fitur-teknis",
      "0.000 notifikasi sekaligus (→t3-m27",
      " ternyata keliru dibahas di →t3-dua-tempat",
      "dalah rilis yang dipakai di →t3-m26",
      "dan Tidak dijalankan ada di →A0",
      "ckoff dan jitter dibahas di →t3-at-least-once",
      "apa kelas penting dibuka di →t3-m27",
      "skan pool, alasannya ada di →t3-pool",
      "aat app tertutup dibahas di →t3-at-least-once",
      "- →t3-dua-tempat",
      "- →t3-pool",
      "- →t3-outbox",
      "- →t3-klaim-baris",
      "- →t3-at-least-once",
      "- →t3-m27",
      "perlihatkan susunan akhir | →t3-dua-tempat",
      "get memakai batas 3 detik | →t3-m18",
      "hanya memakai satu worker | →t3-klaim-baris",
      "ukan kapan kode app jalan | →t3-at-least-once",
      " hanya menghitung lamanya | →t3-m27",
    ]);
    // Tiap butir Konsep: judul registry halaman yang ditaut memuat kata yang dijelaskan butirnya.
    const butir = [...halaman.matchAll(/^- \[\[([\w.-]+)\]\]: (.+)$/gm)].map((m) => [m[1]!, m[2]!] as const);
    expect(butir.map((b) => b[0])).toEqual(["t3-dua-tempat", "t3-pool", "t3-outbox", "t3-klaim-baris", "t3-at-least-once", "t3-m27"]);
    const kata: Record<string, string> = { "t3-dua-tempat": "dua tempat", "t3-pool": "connection pool", "t3-outbox": "outbox", "t3-klaim-baris": "klaim per baris", "t3-at-least-once": "at-least-once", "t3-m27": "promo" };
    for (const [id, teks] of butir) {
      expect(entri(id)!.judul.toLowerCase(), id).toContain(kata[id]!);
      expect(teks.length, id).toBeGreaterThan(20);
    }
  });
  test("Berikutnya dari konsep: halaman tidak merujuk halaman Tahap 4 atau jembatan", () => {
    expect(halaman).not.toMatch(/\[\[t4-/);
    expect(halaman).not.toMatch(/\[\[t3-jembatan\]\]/);
  });
});

describe("diagram, peta, dan skenario alur", () => {
  test("peta fitur: id token, jurnal, outbox, kelas, token tiruan, dan batas dari rekaman", () => {
    const kode = peta.langkah.flatMap((l) => [...l.rinci, ...(("kode" in l ? l.kode : []) as string[])]).join("\n");
    expect(kode).toContain(`Jawaban 201 dengan id ${idToken}`);
    expect(kode).toContain(`Jurnal ${jurnal}, dua posting`);
    expect(kode).toContain(`Satu baris outbox untuk akun ${penerima}`);
    expect(kode).toContain(`outbox ${outboxId}: kelas ${kelasBayar}, menunggu`);
    expect(kode).toContain(`Untuk token tiruan-${penerima}`);
    expect(kode).toContain(`Batas waktu client ${timeoutPush} detik`);
    expect(kode).toContain('"token_push": "hp-ani-1"');
    expect(sinkron).toContain('"platform": "android", "token_push": "hp-ani-1"');
    expect(kode).toContain("Empat pengirim serentak");
    expect(bagian(Q, "A").baris.join("\n")).toContain("c = 4 pengirim serentak");
    expect(peta.langkah).toHaveLength(8);
    expect(peta.sumber.teks).toBe("Rekaman lab api-t3 · sinkron.txt A, outbox.txt A dan B");
  });

  test("skenario alur: jalur utama dari outbox.txt A dan B, varian dari push.txt E dan F", () => {
    expect(skenario.sumber.file).toBe("labs/api-t3/output/outbox.txt");
    expect(skenario.varian.mulai).toBe(5);
    expect(skenario.langkah.length).toBeLessThanOrEqual(10);
    expect(skenario.varian.mulai + skenario.varian.langkah.length).toBeLessThanOrEqual(10);
    const kirim = skenario.langkah.map((l) => l.kirim).join("\n");
    expect(JSON.parse(skenario.langkah[1]!.kirim.split("\n")[1]!)).toEqual(bodyBayar);
    expect(kirim).toContain(`jurnal ${jurnal}: Budi −${bodyBayar.nominal}, Warung Ani +${bodyBayar.nominal}`);
    expect(kirim).toContain(`outbox ${outboxId}: akun ${penerima}, kelas ${kelasBayar}, bayar, menunggu, percobaan 0`);
    expect(kirim).toContain(`201 {"id":${jurnal},"saldo":${saldoBudi}}`);
    expect(kirim).toContain(`push  menerima ${pushB[1]} pesan untuk token ${pushB[2]}`);
    expect(kirim).toContain(`push  judul: ${judulPesan}`);
    expect(bagian(O, "B").baris.join("\n")).toContain(`untuk token ${pushB[2]}, notifikasi_id = outbox.notifikasi_id`);
    expect(kirim).toContain(`→ token ${pushB[2]}, notifikasi_id sama dengan kolom outbox.notifikasi_id`);
    expect(kirim).toContain(ringkasB);
    expect(skenario.layarAwal.budi!.saldo).toBe(250000);
    const layarBudi = skenario.langkah[3]!.layar!.budi!;
    expect(layarBudi.saldo).toBe(saldoBudi);
    const layarAni = skenario.langkah[7]!.layar!.ani!.isi!;
    expect(layarAni.find((i) => i.jenis === "toast")!.teks).toBe(judulPesan);
    expect(layarAni.find((i) => i.jenis === "baris")!.kanan).toBe(catatan);
    expect(skenario.predict.answer).toBe(3);
    expect(skenario.predict.options[skenario.predict.answer]).toContain("Nol");
    expect(skenario.predict.explain).toContain(`push tiruan menerima ${pushSesudah201}`);
    expect(skenario.predict.explain).toContain("langkah 4");
    expect(skenario.predict.explain).toContain("langkah 6");
    expect(skenario.langkah[3]!.judul).toBe("Budi mendapat 201");
    expect(skenario.langkah[5]!.judul).toBe("Worker mengirim ke layanan push");
    const varian = skenario.varian.langkah.map((l) => l.kirim).join("\n");
    expect(varian).toContain(ringkasE);
    expect(varian).toContain(timeoutE);
    expect(varian).toContain("GET /akun/419 → 200");
    expect(varian).toContain("koneksi api-t3 yang diam di dalam transaction: 0");
    expect(skenario.varian.langkah[0]!.jelas).toContain(`batas waktu ${timeoutPush} detik`);
    expect(skenarioMentah).toContain("lab api-t3 tidak punya app Flutter");
  });

  test("tidak ada ID riset atau ID internal di teks yang tampil", () => {
    // Field riset di halaman istilah hidup di data dan tidak tampil; semua teks lain tampil ke pembaca.
    const istilahTampil = JSON.stringify(istilah, (k, v: unknown) => (k === "riset" ? undefined : v));
    for (const t of [halaman, JSON.stringify(rantai), JSON.stringify(peta), skenarioMentah, istilahTampil]) expect(t).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(JSON.stringify(istilah)).toMatch(/"riset":"R3-111"/);
  });
});

describe("klaim 'tidak ada' dipindai dari isi labs/api-t3 (lingkup: kode, migrasi, dan perintah; bukan output)", () => {
  const berkas = (dir: string, ekstensi: RegExp): string[] =>
    fs.readdirSync(path.join(akar, dir), { withFileTypes: true }).flatMap((e) => {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) return e.name === "output" ? [] : berkas(rel, ekstensi);
      return ekstensi.test(e.name) ? [rel] : [];
    });
  const isi = (ekstensi: RegExp): { rel: string; teks: string }[] => berkas("labs/api-t3", ekstensi).map((rel) => ({ rel, teks: baca(rel) }));

  test("tidak ada job yang membuang perangkat stale: terakhir_terlihat hanya ditulis saat mendaftar, dan -bersih hanya dua tabel", () => {
    const sumber = isi(/\.(go|sql|py)$/);
    const pakai = sumber.filter((f) => f.teks.includes("terakhir_terlihat")).map((f) => f.rel).sort();
    // run.py hanya menyebutnya di daftar kolom pembanding skema (bukan menulis atau menghapus baris).
    expect(pakai).toEqual(["labs/api-t3/internal/repo/outbox.go", "labs/api-t3/migrasi/000017_perangkat_outbox.up.sql", "labs/api-t3/run.py"]);
    const di = sumber.find((f) => f.rel === "labs/api-t3/run.py")!.teks.split("\n").filter((b) => b.includes("terakhir_terlihat"));
    expect(di).toHaveLength(1);
    expect(di[0]).toContain('"perangkat": [');
    for (const f of sumber) expect(f.teks, f.rel).not.toMatch(/DELETE FROM perangkat/i);
    const bersih = baca("labs/api-t3/cmd/api/main.go");
    const fungsi = bersih.slice(bersih.indexOf("func jalankanBersih"), bersih.indexOf("func jalankanBersih") + 700);
    expect([...fungsi.matchAll(/r\.(Bersihkan\w+)\(/g)].map((m) => m[1])).toEqual(["BersihkanOutbox", "BersihkanOperasi"]);
    harus("Di `labs/api-t3` tidak ada job yang membuang perangkat stale, dan job `-bersih` hanya membuang baris outbox dan operasi sinkron yang lama.");
  });
  test("lab api-t3 tidak punya app Flutter, dan tidak ada panggilan ke FCM sungguhan", () => {
    expect(berkas("labs/api-t3", /\.dart$|^pubspec\.yaml$/)).toEqual([]);
    for (const f of isi(/\.go$/).filter((x) => !x.rel.endsWith("_test.go"))) expect(f.teks, f.rel).not.toContain("googleapis.com");
    harus("Lab `api-t3` tidak punya app Flutter, jadi bagian ini tidak direkam.");
    harus("lab `api-t3` tidak punya app Flutter");
  });
  test("client push memperlakukan 404 dan 400 sama (dibaca dari kode, tidak direkam)", () => {
    const kode = baca("labs/api-t3/internal/push/push.go").split("\n");
    expect(kode[62]).toContain("http.StatusNotFound || resp.StatusCode == http.StatusBadRequest");
    expect(kode[63]).toContain("ErrTidakTerdaftar");
    expect(push).not.toContain("400");
    harus("Satu hal dibaca dari kode, bukan direkam. Client menganggap jawaban 404 dan 400 sama-sama berarti token mati:");
  });
  test("klaim negatif tidak kehilangan kata 'tidak' di halaman", () => {
    for (const k of ["tidak ada job", "tidak punya app Flutter", "tidak diukur", "tidak memuat jaminan sampai ke HP", "tidak dijalankan 12,5 menit"]) {
      expect(halaman.toLowerCase(), k).toContain(k.toLowerCase());
    }
  });
});

describe("Snippet berrentang baris di halaman", () => {
  interface Potongan { file: string; a: number; b: number; judul: string }
  const potongan: Potongan[] = [];
  for (const m of halaman.matchAll(/<Snippet\b[^]*?\/>/g)) {
    const tag = m[0];
    const judul = tag.match(/\btitle="([^"]*)"/)?.[1] ?? "";
    const satu = tag.match(/\bfile="([^"]+)"/)?.[1];
    const rentang = tag.match(/\blines="(\d+):(\d+)"/);
    if (satu && rentang) potongan.push({ file: satu, a: Number(rentang[1]), b: Number(rentang[2]), judul });
    const banyak = tag.match(/\bfiles=\{\[([^\]]*)\]\}/)?.[1];
    for (const e of banyak ? [...banyak.matchAll(/"([^":]+):(\d+):(\d+)"/g)] : []) potongan.push({ file: e[1]!, a: Number(e[2]), b: Number(e[3]), judul });
  }
  const petaBagian: Record<string, Record<string, Bagian>> = {
    "labs/api-t3/output/outbox.txt": O,
    "labs/api-t3/output/push.txt": P,
    "labs/api-t3/output/katalog.txt": K,
    "labs/api-t3/output/sinkron.txt": pecah(sinkron),
    "labs/t3-outbox/output/transaksi.txt": T,
  };

  test("rentang rekaman ada di bagian yang disebut judulnya", () => {
    const rekaman = potongan.filter((p) => petaBagian[p.file] && /bagian [A-Z]/.test(p.judul));
    expect(rekaman.length).toBeGreaterThanOrEqual(8);
    for (const p of rekaman) {
      const hurufBagian = [...p.judul.matchAll(/bagian ([A-Z])(?: dan ([A-Z]))?/g)][0]!;
      const huruf = [hurufBagian[1]!, hurufBagian[2]].filter((x): x is string => Boolean(x));
      const awal = bagian(petaBagian[p.file]!, huruf[0]!).awal;
      const akhir = bagian(petaBagian[p.file]!, huruf[huruf.length - 1]!).akhir;
      expect(p.a, `${p.file}:${p.a}:${p.b} di luar bagian ${huruf.join("+")} (${awal}-${akhir})`).toBeGreaterThanOrEqual(awal);
      expect(p.b, `${p.file}:${p.a}:${p.b} di luar bagian ${huruf.join("+")} (${awal}-${akhir})`).toBeLessThanOrEqual(akhir);
    }
  });

  // Jangkar: baris pertama, baris terakhir, dan isi yang dijelaskan prosa. Menggeser kode atau rekaman menggagalkan tes ini.
  const jangkar: Record<string, { awal: string; akhir: string; ada: string[] }> = {
    "labs/api-t3/internal/repo/outbox.go:187:197": { awal: "// DaftarkanPerangkat", akhir: "}", ada: ["ON CONFLICT (token_push) DO UPDATE", "terakhir_terlihat = now()", "return id, err"] },
    "labs/api-t3/internal/service/bayar.go:53:73": { awal: "err = s.repo.DalamTx", akhir: "return id, saldo, err", ada: ["KunciBukuAkun", "CatatJurnal", "s.beritahu(ctx, tx, id, ke, \"bayar\""] },
    "labs/api-t3/internal/worker/worker.go:154:169": { awal: "for _, p := range perangkat", akhir: "}", ada: ["push.ErrTidakTerdaftar", "NonaktifkanPerangkat", "if sementara != nil", "w.tunda(ctx, n)"] },
    "labs/api-t3/internal/worker/worker.go:174:182": { awal: "status := \"terkirim\"", akhir: "return status", ada: ["status = \"dilewati\"", "SelesaiOutbox"] },
    "labs/api-t3/internal/push/push.go:60:67": { awal: "switch {", akhir: "}", ada: ["StatusNotFound", "StatusBadRequest", "ErrTidakTerdaftar", "ErrSementara"] },
    "labs/api-t3/output/outbox.txt:14:33": { awal: "# --- A.", akhir: "push tiruan menerima: 0", ada: ["Location: /transfers/10001", "menunggu"] },
    "labs/api-t3/output/outbox.txt:58:75": { awal: "# --- D.", akhir: "(1 row)", ada: ["jurnal_seimbang", "0            | 0"] },
    "labs/api-t3/output/outbox.txt:102:113": { awal: "# --- F.", akhir: "(1 row)", ada: ["urutan di layanan push", "terkirim | 6"] },
    "labs/api-t3/output/push.txt:16:37": { awal: "# --- B.", akhir: "(2 rows)", ada: ["percobaan = 3", "mati", "percobaan = 5"] },
    "labs/api-t3/output/push.txt:39:64": { awal: "# --- D.", akhir: "push tiruan menerima: tetap 1 permintaan", ada: ["mati-418", "dilewati", "aktif"] },
    "labs/api-t3/output/sinkron.txt:6:36": { awal: "# --- A.", akhir: "perangkat bekas Budi sekarang atas nama Dimas (417)", ada: ["symbian", "10061", "10064"] },
    "labs/t3-outbox/output/transaksi.txt:98:111": { awal: "# --- G.", akhir: "syarat Sinta", ada: ["500 Internal Server Error", "195000"] },
    "labs/api-t3/output/katalog.txt:23:34": { awal: "# --- B.", akhir: "\"status\":403}", ada: ["harga_efektif", "akun hr yang boleh membuat promo"] },
    "labs/api-t3/output/katalog.txt:117:133": { awal: "# --- F.", akhir: "(1 row)", ada: ["\"diumumkan\":1000", "karyawan_jakarta"] },
    "labs/api-t3/output/kontrak.txt:17:25": { awal: "$ oasdiff breaking", akhir: "(exit code 1)", ada: ["response-property-enum-value-added", "`hr` enum value"] },
  };
  const cocok = (baris: string, pola: string): boolean => (pola === "}" ? baris.trim() === "}" : baris.includes(pola));

  test("tiap rentang punya jangkar, dan jangkarnya masih di baris yang sama", () => {
    expect(potongan.length).toBeGreaterThanOrEqual(15);
    for (const p of potongan) {
      const kunci = `${p.file}:${p.a}:${p.b}`;
      const j = jangkar[kunci];
      expect(j, `rentang ${kunci} belum punya jangkar di tes ini`).toBeDefined();
      const baris = baca(p.file).split("\n").slice(p.a - 1, p.b);
      expect(cocok(baris[0]!, j!.awal), `${kunci}: bukan awal "${j!.awal}": ${baris[0]}`).toBe(true);
      expect(cocok(baris[baris.length - 1]!.replace(/\s+$/, ""), j!.akhir), `${kunci}: bukan akhir "${j!.akhir}": ${baris[baris.length - 1]}`).toBe(true);
      for (const s of j!.ada) expect(baris.join("\n"), `${kunci} tidak memuat ${s}`).toContain(s);
    }
    for (const k of Object.keys(jangkar)) expect(potongan.some((p) => `${p.file}:${p.a}:${p.b}` === k), `jangkar ${k} tidak dipakai halaman`).toBe(true);
  });

  test("region tulis-outbox ada, dan Snippet tanpa rentang menunjuk berkas yang ada", () => {
    expect(baca("labs/api-t3/internal/repo/outbox.go")).toContain("--8<-- [start:tulis-outbox]");
    expect(halaman).toContain('region="tulis-outbox"');
    for (const m of halaman.matchAll(/<Snippet\b[^]*?\/>/g)) {
      const f = m[0].match(/\bfile="([^"]+)"/)?.[1];
      if (f) expect(fs.existsSync(path.join(akar, f)), f).toBe(true);
    }
    expect(realtime.split("\n")).toHaveLength(9);
    expect(halaman).toContain('<Snippet file="labs/e4-realtime/output/realtime.txt" title="Rekaman lab: labs/e4-realtime/output/realtime.txt" />');
  });
});

describe("istilah Token perangkat", () => {
  test("baris glosarium menunjuk 3.3, dan sumber rekamannya ada", () => {
    const glos = baca("situs/src/content/docs/alat/glosarium.mdx");
    expect(glos).toMatch(/\| \*\*Token perangkat\*\* \|[^\n]*\| \[\[t3-notifikasi\]\] \|/);
    expect(istilah.cerita[0]!.rujukan).toBe("t3-notifikasi");
    const rekaman = istilah.sumber.flatMap((s) => ("rekaman" in s ? [s.rekaman] : []));
    expect(rekaman).toEqual(["labs/api-t3/output/sinkron.txt"]);
    for (const r of rekaman) expect(fs.existsSync(path.join(akar, r))).toBe(true);
    for (const s of istilah.sumber) if ("riset" in s) expect(riset, s.riset).toContain(`| ${s.riset} |`);
    const hari = Number(riset.split("\n").find((b) => b.startsWith("| R3-111 |"))!.match(/sesudah (\d+) hari/)![1]);
    expect(istilah.jebakan[0]).toContain(`dihapus sesudah ${hari} hari`);
    expect(istilah.mekanisme[0]).toContain("Android 13 ke atas");
  });
});
