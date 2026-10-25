// Penjaga angka halaman 2.31 (keputusan 770 dan 771): angka yang ditulis tangan di halaman MDX dan di diagram Rantai
// t2-adr21-kebutuhan.json harus bisa diturunkan dari registry (cerita.json), rekaman lab, dan kode lab. logika.test.ts hanya
// menjaga rumus widget; tanpa tes ini, mengubah satu angka atau satu kata kunci di MDX tidak menggagalkan build, tes, atau
// alat ukur mana pun. Klaim "tidak ada" (perkakas load test, komponen Redis atau queue, panggilan keluar) dipindai dari
// isi lab, bukan ditulis tanpa penjaga. Rentang baris Snippet ikut dijaga.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../../data/cerita.json";
import kebutuhan from "../../../data/diagram/t2-adr21-kebutuhan.json";
import {
  AMBANG, POOL, angka, bacaCara, besar, desimal1, kaliPuncak, koneksi, koneksiTeks, lambdaPemicu, puncakPerDetik,
} from "./logika";

const akar = path.resolve(__dirname, "../../../..");
const baca = (rel: string) => fs.readFileSync(path.join(akar, rel), "utf8");
const halaman = baca("situs/src/content/docs/tahap-2/sengaja-belum.mdx");
const n1 = baca("labs/b2-query/output/ledger/n1.txt");
const c4 = baca("labs/c4-ratelimit/output/login/ratelimit.txt").split("\n");
const migrasi = baca("labs/api-t2/output/migrasi.txt").split("\n");
const m6 = baca("labs/api-t1/output/m6.txt");
const deploy = baca("labs/api-t1/output/deploy.txt");
const testingT2 = baca("labs/api-t2/output/testing.txt");
const mainGo = baca("labs/api-t2/cmd/api/main.go").split("\n");
const topupGo = baca("labs/api-t2/internal/service/topup.go").split("\n");

const harus = (kalimat: string) => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const desimal = (x: number, des: number) => x.toFixed(des).replace(".", ",");

const a2 = cerita.tahap[1]!.asumsi as { user: number; aktif: number; req: number; puncak: number; trx: number; tim: string };
const a3 = cerita.tahap[2]!.asumsi as { user: number; aktif: number; req: number; puncak: number };
const puncak2 = puncakPerDetik(a2);
const puncak3 = puncakPerDetik(a3);
// Bayar dan transfer: 3 transaksi per user aktif per hari (naskah Tahap 2 bagian 3b), seperti halaman 2.30.
const TRX = 3;
const bayar = (a: { user: number; aktif: number; puncak: number }) => (((a.user * a.aktif) / 100) * TRX) / 86_400 * a.puncak;
const bayar2 = bayar(a2);
const bayar3 = bayar(a3);
const W_DB = 0.02; // Asumsi 2.30
const cara = bacaCara(n1);
const wHal1N1 = cara[0]!.ms;
const wHal1Index = cara[2]!.ms;
const wSelurN1 = cara[3]!.ms;
const selisihCache = Number(migrasi.slice(205, 218).join("\n").match(/selisih (\d+)/)![1]);

describe("registry dan rekaman: angka turunan yang dipakai halaman", () => {
  test("masukan registry Tahap 2 dan Tahap 3, dan tim dua developer", () => {
    expect([a2.user, a2.aktif, a2.req, a2.puncak]).toEqual([1000, 30, 40, 10]);
    expect([a3.user, a3.aktif, a3.req, a3.puncak]).toEqual([10000, 25, 60, 10]);
    expect(a2.tim).toBe("2 developer");
    expect(desimal1(puncak2)).toBe("1,4");
    expect(desimal(puncak2, 2)).toBe("1,39"); // halaman menulis 1,39 di tempat 2.571 diturunkan; 3.571 ÷ 1,4 memberi 2.551, bukan 2.571
    expect(Math.round(puncak3)).toBe(17);
    expect(POOL).toBe(10);
    expect(AMBANG).toBe(5);
  });

  test("cache: W halaman pertama 30,5 ms (N+1) dan 1,4 ms (satu query dan index), L, λ pemicu, kelipatan", () => {
    expect(wHal1N1).toBe(30.5);
    expect(wHal1Index).toBe(1.4);
    expect(koneksiTeks(koneksi(puncak2, wHal1Index))).toBe("0,0019");
    expect(besar(lambdaPemicu(wHal1Index))).toBe("3.571");
    expect(besar(kaliPuncak(wHal1Index, puncak2))).toBe("2.571");
    expect(Math.round(wHal1N1 / wHal1Index)).toBe(22);
    expect(besar(lambdaPemicu(wSelurN1))).toBe("2,6");
    expect(besar(kaliPuncak(wSelurN1, puncak2))).toBe("1,9");
  });

  test("kepekaan: W sepuluh kali lebih besar (14 ms) menggeser jarak ke ±257 kali, lebih dekat dari 2.571", () => {
    expect(wHal1Index * 10).toBe(14);
    expect(Math.round(kaliPuncak(wHal1Index * 10, puncak2))).toBe(257);
    expect(kaliPuncak(wHal1Index * 10, puncak2)).toBeLessThan(kaliPuncak(wHal1Index, puncak2));
  });

  test("queue: λ bayar dan transfer 0,10 (Tahap 2) dan 0,87 (Tahap 3), naik 8,3 kali; W luar untuk 5 koneksi", () => {
    expect(desimal(bayar2, 2)).toBe("0,10");
    expect(desimal(bayar3, 2)).toBe("0,87");
    expect(desimal(bayar3 / bayar2, 1)).toBe("8,3");
    expect(desimal(bayar2, 3)).toBe("0,104");
    expect(desimal(bayar3, 3)).toBe("0,868");
    expect(Math.round(AMBANG / bayar2 - W_DB)).toBe(48);
    // Hitung ulang pembaca dengan angka yang tertulis: 0,104 memberi 48, 0,10 memberi 50 (sebab halaman menulis 0,104).
    expect(Math.round(AMBANG / 0.104 - W_DB)).toBe(48);
    expect(Math.round(AMBANG / 0.1 - W_DB)).toBe(50);
    expect(desimal(AMBANG / 0.868 - W_DB, 1)).toBe("5,7");
    expect(desimal(0.868 / 0.104, 1)).toBe("8,3");
    expect(desimal(AMBANG / bayar3 - W_DB, 1)).toBe("5,7");
    // L di tabel 2.30 untuk panggilan 2 detik tetap 1,75 (diagram Rantai).
    expect(desimal(bayar3 * (W_DB + 2), 2)).toBe("1,75");
  });

  test("n1.txt: bagian E ada, kolom waktu tanpa jaringan, median 5 kali", () => {
    expect(n1).toContain("Median 5 kali sesudah satu pemanasan");
    expect(n1).toContain("tanpa jaringan antara server API dan database");
  });

  test("lab c4 bagian D: 29 akun, 10 lolos ke pemeriksaan, 19 ditolak 429 tanpa menyentuh database", () => {
    const i = c4.findIndex((b) => b.startsWith("== D. "));
    const blok = c4.slice(i, c4.findIndex((b, k) => k > i && b.startsWith("== E. ")));
    expect(blok.join("\n")).toContain("29 akun disemprot dari 203.0.113.9 → 401: 10 · 429: 19");
    expect(blok.join("\n")).toContain("yang ditolak 429 tidak menyentuh database dan tidak menjalankan argon2id");
    expect(c4.join("\n")).toContain("== G. Kunci atomik");
    expect(c4.join("\n")).toContain("SELECT ... FOR UPDATE");
  });

  test("api-t2 migrasi bagian E: selisih cache Rp5.000 ditemukan job malam, lalu 0", () => {
    expect(selisihCache).toBe(5000);
    expect(migrasi[205]).toMatch(/^# --- E\. Cek cache tiap malam/);
    expect(migrasi.slice(205, 218).join("\n")).toContain("selisih 5000");
    expect(migrasi.slice(205, 218).join("\n")).toContain("1 tidak cocok");
    expect(migrasi.slice(205, 218).join("\n")).toContain("0 tidak cocok");
  });

  test("lab api-t1: deploy manual membuat 3 dari 8 putaran tanpa jawaban; jeda Compose tidak diukur", () => {
    expect(m6).toContain("# --- C. Deploy: prober memanggil API tiap detik");
    expect(m6).toContain("# Ringkasan 8 putaran:");
    expect(m6).toContain("# HP Budi: 2 berhasil, 3 tidak ada jawaban, 3 field jumlah tidak ada");
    expect(m6).toContain("# HP Dimas: 4 berhasil, 3 tidak ada jawaban, 1 field jumlah tidak ada");
    expect(deploy).toContain("lama jeda itu tidak diukur");
  });

  test("top-up 1.000 akun dalam satu transaction lulus tes api-t2", () => {
    expect(testingT2).toContain("--- PASS: TestTopupSeribuAkunSatuTransaction");
  });
});

describe("halaman sengaja-belum.mdx: tiap angka turunan dari rekaman, registry, atau hitungan", () => {
  test("Kebutuhan", () => {
    harus("puncak ±17 request per detik untuk Tahap 3, dari ±1,4 di Tahap 2 (Asumsi)");
    harus("Kapasitas satu server belum pernah diukur.");
    harus("Minggu 8");
    harus("diterima di minggu 8 Tahap 2");
  });

  test("Tabel empat yang ditunda", () => {
    harus("Halaman pertama riwayat Budi 30,5 ms dengan N+1, 1,4 ms dengan satu query dan index (Rekaman lab, `n1.txt` bagian E)");
    harus("Puncak ±1,4 request per detik (Asumsi)");
    harus("rekaman menemukan selisih Rp5.000");
    harus("top-up 1.000 akun, adalah satu transaction database");
    harus("Pencairan 12 warung per minggu memakai batch dan status, bukan queue");
    harus("menolak 19 dari 29 percobaan tanpa menyentuh database");
    harus("sepuluh lab Tahap 2 tidak memuat perkakas load test");
  });

  test("sumber berlabel dan berkas rekaman yang benar", () => {
    harus("(`login/ratelimit.txt` bagian D dan G, lab c4)");
    // labs/c4-ratelimit/output/ratelimit.txt (tanpa login/) adalah rekaman lain: bagian D-nya "dua instance", bukan "dua lapis".
    expect(baca("labs/c4-ratelimit/output/ratelimit.txt")).toContain("== D. BATAS=akun+ip · dua instance API");
    harus("dokumentasi Redis adalah halaman `latest` yang dibuka 2026-10-25, tanpa nomor versi, dan Redis tidak dijalankan");
    harus("Twelve-Factor adalah panduan praktisi 2011 yang dipakai sebagai heuristik, bukan standar");
    harus("Menurut Twelve-Factor (heuristik praktisi), proses tidak menyimpan di memorinya");
    harus("update yang bersamaan sampai di cache dengan urutan tertukar");
  });

  test("daftar bukan daftar lengkap: celah lain disebut dan benar ada di halaman yang ditaut", () => {
    harus("Halaman ini memutuskan empat komponen itu saja.");
    harus("Daftar empat komponen ini bukan daftar semua yang belum dilakukan di Tahap 2.");
    const di = (berkas: string, kalimat: string) => expect(baca(`situs/src/content/docs/tahap-2/${berkas}`), `${berkas}: ${kalimat}`).toContain(kalimat);
    di("brute-force.mdx", "Di rekaman api-t2 polanya `sementara-<id>`");
    di("brute-force.mdx", "| Lupa password mandiri dan kabar ke pemilik saat ada percobaan |");
    di("retry-idempotency.mdx", "| Pola ini di `labs/api-t2` (`POST /transfers`, `POST /kiriman`) |");
    di("race-lock.mdx", "Top-up CSV mengunci buku karyawan satu per satu menurut urutan baris CSV");
    di("adr-ledger.mdx", "| Data pribadi harus bisa dihapus |");
    di("m17-prd-v3.mdx", "mencatat penutupan periode. Keduanya belum dibuat di lab");
    for (const id of ["t2-login-aman", "t2-idempotency", "t2-race-lock", "t2-adr-ledger", "t2-m17"]) harus(`[[${id}]]`);
  });

  test("Yang terjadi selama belum dipasang", () => {
    harus("Halaman pertama riwayat 1,4 ms, batas bawah karena rekaman tanpa jaringan");
    harus("3 dari 8 putaran prober, satu per detik, tanpa jawaban (`m6.txt` bagian C, lab api-t1)");
    harus("Jeda deploy dengan Compose tidak diukur (`deploy.txt`)");
  });

  test("Keputusan: pool 10, ambang 5, urutan PROPOSAL, dan kasus industri", () => {
    harus("Pemicunya 5 koneksi tertahan, separuh dari pool 10 (Asumsi");
    harus("lebih dari satu miliar request per detik (bagian 1)");
    harus("satu orde besaran lebih banyak daripada dibuat (bagian 2)");
    harus("dari 17 ribu menjadi 1,3 ribu per detik");
    harus("(bagian 3.2.1)");
    harus("Delapan masalah Tahap 2 bukan soal kapasitas");
  });

  test("Coba keduanya dan Kapan keputusan ini salah", () => {
    harus("pemicu ada di ±2,6 permintaan per detik, hanya 1,9 kali puncak Tahap 2");
    harus("pemicu ada di ±3.571 per detik, atau 2.571 kali puncak");
    harus("menggeser jarak halaman pertama ±22 kali, dari 30,5 ms ke 1,4 ms");
    harus("L = 0,0019 pada puncak 1,39. Pemicu di ±3.571 per detik, 2.571 kali puncak (W tanpa jaringan: jarak sebenarnya lebih dekat)");
    harus("Bila W sebenarnya 10 kali lebih besar (14 ms), jaraknya masih ±257 kali puncak (hitungan, bukan rekaman)");
    harus("terlalu kecil, jadi jarak sebenarnya lebih dekat");
    harus("terlalu besar untuk kelas itu, jadi jarak sebenarnya lebih jauh");
    harus("λ bayar dan transfer 0,104 per detik: W luar ±48 detik baru mencapai 5");
    harus("λ kelas bayar dan transfer naik 8,3 kali, dari 0,104 ke 0,868 per detik");
    harus("Lima koneksi tercapai pada W luar ±5,7 detik");
    harus("Puncak ÷ kapasitas terukur ≥ 0,5");
  });

  test("Cek diri memakai angka yang sama", () => {
    harus("Halaman pertama riwayat turun dari 30,5 ms (N+1) ke 1,4 ms (satu query dan index)");
    harus("0,104 × (0,02 + t) = 5, jadi t ≈ 48 detik");
    harus("Dengan λ Tahap 3 (0,868 per detik), t turun ke ±5,7 detik");
    harus("atau 2.571 kali puncak 1,39 (W tanpa jaringan, jadi jarak sebenarnya lebih dekat)");
  });

  test("setiap bilangan bertitik ribuan di halaman berasal dari hitungan atau rekaman", () => {
    const boleh = new Set([
      besar(lambdaPemicu(wHal1Index)), // 3.571
      besar(kaliPuncak(wHal1Index, puncak2)), // 2.571
      angka(1000), // top-up 1.000 akun
      angka(selisihCache), // Rp5.000: selisih cache di rekaman migrasi bagian E
      angka(Math.round(((a3.user * a3.aktif) / 100) * TRX)), // 7.500 transaksi per hari di Tahap 3 (Cek diri 3), seperti 2.30
      angka(86_400), // detik per hari
    ]);
    const dipakai = [...halaman.replace(/\]\([^)]*\)/g, "]()").matchAll(/(?<![\d.])\d{1,3}(?:\.\d{3})+(?![\d.])/g)].map((m) => m[0]);
    expect(dipakai.length).toBeGreaterThan(5);
    expect(dipakai.filter((n) => !boleh.has(n))).toEqual([]);
  });

  test("setiap bilangan desimal di halaman berasal dari hitungan, rekaman, atau kasus industri", () => {
    const boleh = new Set([
      "1,4", // puncak Tahap 2 dan W halaman pertama dengan index
      "30,5", // W halaman pertama N+1
      "1,3", // 1,3 ribu per detik (Facebook, bagian 3.2.1)
      "1,9", // kali puncak seluruh riwayat N+1
      "2,6", // λ pemicu seluruh riwayat N+1
      "0,0019", // L halaman pertama
      "0,10", "0,87", // λ bayar dan transfer, dibulatkan seperti tabel 2.30 (disebut di jawaban Cek diri 3)
      "0,104", "0,868", // λ bayar dan transfer tiga desimal: 900 dan 7.500 per hari ÷ 86.400 × 10
      "1,39", // puncak Tahap 2 dua desimal seperti tabel 2.30
      "5,7", // W luar Tahap 3
      "8,3", // naik 8,3 kali
      "0,02", // W database 20 ms (Asumsi 2.30)
      "1,75", // L 2.30 (cek tidak dipakai di MDX, boleh)
      "0,5", // puncak ÷ kapasitas
      "3.2", "3.2.1", // nomor bagian paper
    ]);
    const tanpaUrl = halaman.replace(/\]\([^)]*\)/g, "]()").replace(/<Snippet[^>]*\/>/g, "").replace(/^import .*$/gm, "");
    const dipakai = [...tanpaUrl.matchAll(/(?<![\d.,])\d+,\d+(?![\d,])/g)].map((m) => m[0]);
    expect(dipakai.length).toBeGreaterThan(10);
    expect(dipakai.filter((n) => !boleh.has(n))).toEqual([]);
  });

  test("Snippet menunjuk baris yang dimaksud", () => {
    const rentang = [...halaman.matchAll(/<Snippet file="([^"]+)" lines="(\d+):(\d+)"/g)].map((m) => [m[1], Number(m[2]), Number(m[3])] as const);
    expect(rentang).toEqual([
      ["labs/api-t2/cmd/api/main.go", 40, 43],
      ["labs/api-t2/internal/service/topup.go", 105, 118],
      ["labs/api-t2/output/migrasi.txt", 206, 218],
    ]);
    expect(mainGo[39]).toMatch(/sql\.Open\("pgx", url\)/);
    expect(mainGo[42]).toBe("\t}");
    expect(topupGo[104]).toMatch(/s\.repo\.DalamTx\(ctx, func\(tx repo\.Tx\) error \{/);
    expect(topupGo[117]).toBe("\t})");
    expect(topupGo.slice(104, 118).join("\n")).toContain("CatatJurnal");
    expect(migrasi[205]).toMatch(/^# --- E\. /);
    expect(migrasi[217]).toBe("# exit status 0");
  });
});

describe("diagram t2-adr21-kebutuhan.json: angka dari hitungan 2.30", () => {
  test("dua baris, tujuh simpul, angka cocok dengan registry", () => {
    expect(kebutuhan.baris).toHaveLength(2);
    expect(kebutuhan.baris.flatMap((b) => b.simpul)).toHaveLength(7);
    const teks = kebutuhan.baris.flatMap((b) => b.simpul.flatMap((s) => [s.teks, "sub" in s ? s.sub : ""])).join(" | ");
    expect(teks).toContain(`Puncak ±${Math.round(puncak3)} per detik`);
    expect(teks).toContain(`dari ±${desimal1(puncak2)} di Tahap 2`);
    expect(teks).toContain(`${desimal(bayar3 * (W_DB + 2), 2)} koneksi tertahan`);
    expect(kebutuhan.baris[1]!.simpul.map((s) => s.teks)).toEqual(["Cache", "Queue", "Redis", "Server kedua"]);
  });
});

describe("rujukan ke halaman lain", () => {
  const ids = new Set(cerita.halaman.map((h) => h.id));
  test("setiap [[ID]] di halaman ada di registry", () => {
    const dipakai = [...new Set([...halaman.matchAll(/\[\[([A-Za-z0-9.\-]+)\]\]/g)].map((m) => m[1]!))];
    expect(dipakai.length).toBeGreaterThan(10);
    expect(dipakai.filter((id) => !ids.has(id))).toEqual([]);
  });
  test("halaman Tahap 3 yang merevisi tiap komponen ditaut", () => {
    for (const id of ["t3-cache", "t3-outbox", "t3-rate-limit-redis", "t3-dua-instance", "t3-pool"]) {
      expect(ids.has(id), id).toBe(true);
      expect(halaman, id).toContain(`[[${id}]]`);
    }
  });
  test("2.29 punya delapan masalah di tabel; 2.26 menolak queue karena 12 pekerjaan per minggu; 2.28 menunda Redis", () => {
    const m17 = baca("situs/src/content/docs/tahap-2/m17-prd-v3.mdx");
    expect([...m17.matchAll(/^\| \[\[(t2-m\d+)\]\] \|/gm)]).toHaveLength(8);
    expect(baca("situs/src/content/docs/tahap-2/job-rekonsiliasi.mdx")).toContain("beban 12 pekerjaan per minggu tidak membutuhkan broker atau engine baru");
    expect(baca("situs/src/content/docs/tahap-2/brute-force.mdx")).toContain("| Redis untuk batas laju | Satu server.");
    expect(baca("situs/src/content/docs/tahap-2/estimasi.mdx")).toContain("| Load test notifikasi | Layanan push belum ada, jadi W-nya Asumsi | [[t3-pool]] |");
    expect(baca("situs/src/content/docs/tahap-2/prd-v2.mdx")).toContain("| P2 | Notifikasi saat menerima transfer | Diminta Budi; ditunda ke v3 |");
  });
  test("ADR 12 menunda cache, queue, service kedua, Kubernetes dan menolak antarmuka kosong", () => {
    const t1 = baca("situs/src/content/docs/tahap-1/sengaja-belum.mdx");
    for (const k of ["| Cache |", "| Queue |", "| Service kedua |", "| Kubernetes |", "Opsi B ditolak karena bentuk antarmuka cache dan queue bergantung pada masalah yang belum terlihat"]) {
      expect(t1, k).toContain(k);
    }
  });
  test("nomor ADR di prosa cocok dengan judul halaman yang ditaut dan dengan sumber (mutasi peninjau PR 346)", () => {
    const sebut = [...new Set([...halaman.matchAll(/ADR (\d+)/g)].map((m) => m[1]!))].sort();
    expect(sebut).toEqual(["12", "20", "21"]);
    const judul = (id: string) => cerita.halaman.find((h) => h.id === id)!.judul as string;
    harus("Redis untuk batas laju ditunda di ADR 20 ([[t2-login-aman]])");
    expect(judul("t2-login-aman")).toContain("ADR 20");
    harus("ADR 12 Tahap 1 ([[t1-adr-12]])");
    expect(baca("situs/src/content/docs/tahap-1/sengaja-belum.mdx")).toMatch(/^title: .*ADR 12/m);
    expect(baca("plan/RISET-TAHAP-2.md")).toContain("NSDI 2013");
    harus("[Nishtala dkk., Scaling Memcache at Facebook, NSDI 2013](https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf)");
  });
  test("urutan PROPOSAL: query dan index, kerja lambat, cache, instance", () => {
    const p = baca("plan/PROPOSAL.md");
    const i = ["| Perbaiki query dan index |", "| Keluarkan kerja lambat dari request", "| Cache hasil baca yang sama |", "| Tambah instance API (stateless) |"].map((k) => p.indexOf(k));
    expect(i.every((x) => x > 0)).toBe(true);
    expect([...i].sort((a, b) => a - b)).toEqual(i);
    harusUrutan();
  });
  function harusUrutan() {
    const a = halaman.indexOf("perbaiki query dan index");
    const b = halaman.indexOf("keluarkan kerja lambat");
    const c = halaman.indexOf("cache baca");
    const d = halaman.indexOf("lalu tambah instance");
    expect([a, b, c, d].every((x) => x > 0) && a < b && b < c && c < d).toBe(true);
  }
});

describe("klaim 'tidak ada' yang dipakai halaman", () => {
  // Semua berkas teks lab, bukan hanya kode: perkakas bisa ada di .sql, .json, .md, atau Dockerfile.
  const EKSTENSI = /\.(go|py|sh|js|mjs|ts|yml|yaml|sql|json|md|toml|mod|sum|html|conf|cfg|ini|dart)$|(^|\/)(Makefile|Dockerfile[^/]*)$/;
  const LEWATI = new Set(["node_modules", ".venv", ".git", "output", "vendor"]);
  const LAB = ["api-t2", "b3-ledger", "b3-race", "b3-isolasi", "t2-pencairan", "e3-idempotency", "b2-query", "b4-skema", "c4-ratelimit", "e5-payload"];
  const jalan = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      if (LEWATI.has(e.name)) return [];
      const p = path.join(dir, e.name);
      return e.isDirectory() ? jalan(p) : EKSTENSI.test(p) ? [p] : [];
    });
  const berkas = LAB.flatMap((l) => jalan(path.join(akar, "labs", l)));
  const rel = (f: string) => path.relative(akar, f);

  test("halaman menyebut sepuluh lab, dan jumlahnya cocok dengan daftar yang dipindai", () => {
    expect(LAB).toHaveLength(10);
    harus("sepuluh lab Tahap 2");
    expect(berkas.length).toBeGreaterThan(50);
  });

  test("kata kunci 'tidak' tidak hilang dari klaim perkakas load test di halaman", () => {
    expect(halaman).not.toMatch(/(?<!tidak )(punya|memuat) perkakas load test/);
    harus("Sepuluh lab Tahap 2 tidak punya perkakas load test.");
    expect(halaman.match(/tidak (punya|memuat) perkakas load test/g)!.length).toBeGreaterThanOrEqual(3);
  });

  test("sepuluh lab Tahap 2 tidak memuat perkakas load test", () => {
    const PERKAKAS = /\b(k6|vegeta|wrk|locust|gatling|jmeter|autocannon|oha|bombardier)\b|load.?test/i;
    expect(berkas.filter((f) => PERKAKAS.test(fs.readFileSync(f, "utf8"))).map(rel)).toEqual([]);
  });

  test("kode server api-t2 tidak memanggil layanan lain selain database", () => {
    const go = berkas.filter((f) => f.includes(`${path.sep}api-t2${path.sep}`) && f.endsWith(".go") && !f.endsWith("_test.go"));
    expect(go.length).toBeGreaterThan(5);
    const kena = go.filter((f) => /\bhttp\.(Get|Post|PostForm|Head|NewRequest(WithContext)?|Client|DefaultClient)\b|\bnet\.Dial|\bsmtp\.|\bexec\.Command/.test(fs.readFileSync(f, "utf8")));
    expect(kena.map(rel)).toEqual([]);
  });

  test("Redis, memcached, dan broker queue hanya disebut di lab c4 sebagai komponen yang TIDAK dipakai", () => {
    const BROKER = /\b(redis|valkey|memcached?|rabbitmq|amqp|kafka|nats|asynq|pgmq|beanstalk|sidekiq)\b/i;
    const semuaTeks = [
      ...berkas,
      ...LAB.flatMap((l) => {
        const out = path.join(akar, "labs", l, "output");
        const walk = (d: string): string[] => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".txt") ? [path.join(d, e.name)] : [])) : [];
        return walk(out);
      }),
    ];
    const kena = semuaTeks.filter((f) => BROKER.test(fs.readFileSync(f, "utf8"))).map(rel).sort();
    expect(kena).toEqual([
      "labs/c4-ratelimit/login/main.go",
      "labs/c4-ratelimit/output/login/ratelimit.txt",
      "labs/c4-ratelimit/run-login.py",
    ]);
    for (const f of kena) {
      const baris = fs.readFileSync(path.join(akar, f), "utf8").split("\n").filter((b) => BROKER.test(b));
      for (const b of baris) expect(b, `${f}: ${b}`).toMatch(/tanpa Redis|Redis TIDAK dipakai|TIDAK dipakai|Redis bersama|Redis ke Tahap 3/);
    }
  });

  test("kode api-t2 tidak membaca db.Stats() dan tidak memakai pg_stat_statements", () => {
    const api = berkas.filter((f) => f.includes(`${path.sep}api-t2${path.sep}`));
    expect(api.length).toBeGreaterThan(10);
    expect(api.filter((f) => /\.Stats\(\)|pg_stat_statements/.test(fs.readFileSync(f, "utf8"))).map(rel)).toEqual([]);
    harus("kode api-t2 tidak membaca jumlah koneksi tertahan (`db.Stats()`) atau memakai `pg_stat_statements`");
  });

  test("api-t2 tidak memakai pustaka cache di dalam proses", () => {
    const CACHE = /ristretto|bigcache|groupcache|go-cache|golang-lru|freecache|ttlcache/;
    const api = berkas.filter((f) => f.includes(`${path.sep}api-t2${path.sep}`));
    expect(api.filter((f) => CACHE.test(fs.readFileSync(f, "utf8"))).map(rel)).toEqual([]);
  });

  test("satu-satunya cache saldo di api-t2 adalah kolom buku.saldo_cache", () => {
    const sql = berkas.filter((f) => f.includes(`${path.sep}api-t2${path.sep}`) && f.endsWith(".sql")).map((f) => fs.readFileSync(f, "utf8")).join("\n");
    expect(sql).toMatch(/saldo_cache/);
  });
});
