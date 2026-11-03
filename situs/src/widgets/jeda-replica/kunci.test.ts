// Kunci kalimat widget jeda replica (W5-lag): tes yang mengunci kalimat dan sel tabel secara literal. Dipisah dari logika.test.ts
// supaya uji mutasi bisa dijalankan dua putaran, dengan dan tanpa kunci baris (hanya putaran tanpa kunci menunjukkan celah turunan,
// plan: .claude/skills/analisis-kritis Prosedur E butir 12). Harapan ditulis dari aturan model, bukan dari fungsi yang diuji.
import { describe, expect, it } from "vitest";
import mentah from "../../../data/widget/t5-lag.json";
import { DataLag } from "./skema";
import { akibatTeks, hitung, jawabanTebak, jedaDari, layarTeks, nilaiJeda, ringkasan, tundaTeks } from "./logika";

const d = DataLag.parse(mentah);
const ATURAN = ["replica", "token", "remote_apply"] as const;
const JEDA = ["nol", "alami", "naskah", "batas", "ditahan"] as const;

describe("kunci: kalimat dan sel tabel", () => {
  it("sel tabel: layar, akibat, dan tunda per kasus", () => {
    const h = (j: string, a: (typeof ATURAN)[number]) => hitung(d, jedaDari(d, j), a);
    expect(layarTeks(d, h("naskah", "replica"))).toBe("Rp250.000, riwayat 1 baris");
    expect(layarTeks(d, h("naskah", "token"))).toBe("Rp215.000, riwayat 2 baris");
    expect(layarTeks(d, h("ditahan", "remote_apply"))).toBe("belum ada jawaban bayar");
    expect(akibatTeks(d, h("naskah", "replica"))).toBe("saldo lama, riwayat belum memuat pembayaran");
    expect(akibatTeks(d, h("naskah", "token"))).toBe("bacaan ini dilayani primary");
    expect(akibatTeks(d, h("alami", "remote_apply"))).toBe("bayar menunggu 0,5 detik");
    expect(akibatTeks(d, h("batas", "remote_apply"))).toBe("bayar menunggu 5 detik");
    expect(akibatTeks(d, h("nol", "remote_apply"))).toBe("tidak ada");
    expect(akibatTeks(d, h("ditahan", "remote_apply"))).toBe("bayar tidak selesai selama replay ditahan");
    expect(tundaTeks(h("naskah", "replica"))).toBe("");
    expect(tundaTeks(h("alami", "remote_apply"))).toBe("0,5 detik");
  });
  it("kalimat ringkasan: satu kalimat untuk tiap kasus, dengan angka kunci", () => {
    const r = (j: string, a: (typeof ATURAN)[number]) => ringkasan(d, jedaDari(d, j), a);
    expect(r("naskah", "replica")).toBe("Replica biasa, jeda 2 detik: layar Budi menampilkan Rp250.000 dari replica, padahal saldo di primary Rp215.000.");
    expect(r("alami", "replica")).toBe("Replica biasa, jeda 0,5 detik: layar Budi menampilkan Rp215.000 dari replica, sama dengan primary.");
    expect(r("batas", "token")).toBe("Token LSN, jeda 5 detik: replica belum sampai posisi tulis, jadi layar Budi menampilkan Rp215.000 dari primary.");
    expect(r("naskah", "remote_apply")).toBe("remote_apply, jeda 2 detik: layar Budi menampilkan Rp215.000 dari replica sinkron, tetapi bayar menunggu 2 detik.");
    expect(r("ditahan", "remote_apply")).toBe("remote_apply, replay ditahan: bayar belum selesai, jadi layar Budi belum menerima jawaban.");
    expect(r("nol", "remote_apply")).toBe("remote_apply, jeda 0 detik: layar Budi menampilkan Rp215.000 dari replica sinkron, sama dengan primary.");
    for (const a of ATURAN) for (const j of JEDA) expect(r(j, a).match(/[.!?](?=\s|$)/g)).toHaveLength(1);
  });
  it("tebakan: jawaban benar menyebut saldo lama, pilihan lain tidak; kalimat jawaban memuat label dan alasan", () => {
    expect(d.tebak.pilihan[d.tebak.jawaban]).toContain("Rp250.000");
    expect(d.tebak.pilihan.filter((p) => p.includes("Rp250.000"))).toHaveLength(1);
    expect(d.tebak.pilihan.filter((p) => p.includes("Rp215.000"))).toHaveLength(1);
    expect(jawabanTebak(d, d.tebak.jawaban)).toBe(`Tebakanmu tepat. ${d.tebak.alasan}`);
    expect(jawabanTebak(d, 0)).toBe(`Tebakanmu belum tepat. ${d.tebak.alasan}`);
    expect(nilaiJeda(d, jedaDari(d, "ditahan"))).toBe("jeda replica ditahan");
  });
  // Kunci peninjau PR 492 (keputusan 1677): kalimat yang ada sumbernya tetapi tidak bisa diturunkan kata demi kata. Uji mutasi peninjau
  // menemukan semuanya bisa diubah tanpa satu tes pun gagal. Baris sumber tiap kalimat di komentar; sumber sudah dibaca peninjau.
  it("ringkasan aturan: replica biasa tidak membawa token; remote_apply hanya menunggu replica sinkron", () => {
    const r = (id: string) => d.aturan.find((a) => a.id === id)!.ringkas;
    // baca.txt B "Tanpa token (app tidak menyimpannya): bacaan tampilan dari replika"; replika.go sumberTampil "Tanpa token: replica"
    expect(r("replica")).toContain("App membaca replica dan tidak membawa token.");
    // sinkron.txt A: "replika_sinkron sinkron; replika_laporan tetap asinkron dan tidak ditunggu COMMIT."; docs PostgreSQL 17 remote_apply (diakses 2026-11-03)
    expect(r("remote_apply")).toContain("COMMIT menunggu replica sinkron memutar WAL");
    expect(r("remote_apply")).toContain("Replica asinkron lain tidak ikut ditunggu.");
    // baca.txt B: bacaan "dengan token" mengirim X-Lsn-Tulis dari jawaban bayar; handler.go membaca r.Header.Get(KepalaLSNTulis) di GET akun dan riwayat
    expect(r("token")).toContain("App mengirimnya kembali, dan server membaca replica");
    expect(r("token")).toContain("selain itu primary.");
  });
  it("batas: token mentah, penalaran dokumentasi, uang di primary, dan pemilik diperiksa lebih dulu", () => {
    const b = (awal: string) => d.batas.find((x) => x.teks.startsWith(awal))!.teks;
    // handler_t5.go tandaiTulis menulis posisi apa adanya (klaim.test.ts); PostgreSQL 17 functions-admin: pg_current_wal_lsn = "write location"
    expect(b("Token adalah posisi WAL primary mentah")).toContain("jadi laju tulis ikut terbaca.");
    expect(b("Token adalah posisi WAL primary mentah")).toContain("Produksi dapat menandatangani atau membulatkannya.");
    // runtime-config-wal (synchronous_commit = off): "there is no waiting"; kesimpulan token lebih kecil adalah penalaran peninjau, Tidak dijalankan
    expect(b("Dokumentasi menyebut")).toContain("bisa lebih kecil dari posisi commit itu; ini penalaran, bukan rekaman.");
    // replika.go: "Keputusan yang menentukan uang tidak lewat sini" dan TokenTulis "(app lalu tidak punya token dan membaca replica)"
    expect(b("Bila posisi WAL tidak terbaca")).toBe("Bila posisi WAL tidak terbaca, server tidak memberi token dan app membaca replica. Uang tetap aman karena keputusan uang di primary, tetapi layar bisa menampilkan saldo lama selama itu.");
    // replika.go LihatAkunTampil dan riwayat.go RiwayatTampil: "peminta != id" sebelum sumberTampil (sumber.test.ts)
    expect(b("Token sah yang sangat besar")).toBe("Token sah yang sangat besar membuat server membaca primary, jadi satu user dapat memindahkan bacaan tampil miliknya ke sana. Akun lain tetap tertutup karena pemilik diperiksa lebih dulu.");
    expect(b("Token hanya ada di jawaban pertama")).toContain("bayar (POST /transfers) dan kirim (POST /kiriman)");
  });
  it("acuan Ilustrasi dan acuan remote_apply alami: lingkup beban disebut, dan waktu tunggu 0,5 detik berlabel Simulasi", () => {
    const a = (jeda: string, aturan?: string) => d.acuan.find((x) => x.jeda === jeda && x.aturan === aturan)!.teks;
    // jeda.txt A: "Jeda ±2 detik di cerita M41 tidak terjadi dengan sendirinya di laptop lab" (beban 100 pembayaran per detik, bagian A)
    expect(a("naskah")).toBe("Jeda sekitar 2 detik berasal dari cerita Budi. Pada 100 pembayaran per detik di laptop lab, jeda alami tidak mencapainya, jadi jeda ini Ilustrasi dan bukan hasil ukur.");
    // jeda 0,5 detik tidak punya rekaman nilai (keputusan 1674); sinkron.txt B hanya merekam selisih COMMIT tercepat di bawah 1 ms
    expect(a("alami", "remote_apply")).toContain("Waktu tunggu 0,5 detik di tabel berasal dari jeda contoh (Simulasi), bukan dari selisih ini.");
    expect(a("nol", "remote_apply")).not.toContain("0,5 detik");
  });
  it("catatan sumber dan label sumber memakai kata yang sama dengan /cara-pakai/ dan rekaman jeda.txt bagian A", () => {
    expect(d.label.sumber).toBe("Simulasi");
    expect(d.sumber.teks.startsWith("Jeda yang kamu geser adalah Simulasi.")).toBe(true);
    expect(d.sumber.teks).toContain("pada 100 pembayaran per detik selama 10 detik, jeda alami tertinggi di bawah 1 detik");
    expect(d.sumber.teks).not.toContain("selalu");
    expect(d.label.acuanJenis).toEqual({ rekaman: "Rekaman lab", ilustrasi: "Ilustrasi" });
    expect(d.label.dasar.kode).toBe("Tidak dijalankan, dibaca dari kode api-t5");
    expect(d.label.dasar.dokumentasi).toBe("Dokumentasi PostgreSQL 17, Tidak dijalankan");
    expect(d.label.dasar.rancangan).toBe("Asumsi desain");
  });
});
