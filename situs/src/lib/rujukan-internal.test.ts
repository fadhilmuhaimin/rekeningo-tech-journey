// Snippet tidak menampilkan nomor keputusan atau nomor PR dari komentar berkas lab (keputusan 1180).
// Kasus diambil dari baris lab yang tampil di build main 2026-10-27; tiap bentuk baru yang lolos dari fungsi ini
// ditangkap `tools/cek_id_tampil.py` lalu ditambahkan di sini.
import { describe, expect, it } from "vitest";
import { bersihkanRujukanInternal as b } from "./rujukan-internal";

describe("kurung yang hanya berisi rujukan dibuang bersama spasi di depannya", () => {
  it.each([
    ["# Lab 1.31 · image API Rekeningo, satu image per commit (keputusan 247).", "# Lab 1.31 · image API Rekeningo, satu image per commit."],
    ["-- Rekaman dari database bersih: make -C labs/t2-pencairan run (keputusan 500).", "-- Rekaman dari database bersih: make -C labs/t2-pencairan run."],
    ["-- Rilis 3 (contract) · Tahap 2 (keputusan 412). Di cerita: akhir Tahap 2.", "-- Rilis 3 (contract) · Tahap 2. Di cerita: akhir Tahap 2."],
    ["# bila ada transaction yang terbuka; tutup buku perlu menunggu transaction itu (lihat KEPUTUSAN 415).", "# bila ada transaction yang terbuka; tutup buku perlu menunggu transaction itu."],
    ["-- sebelum COMMIT (pola keputusan 402). Invarian 3 tetap diperiksa", "-- sebelum COMMIT. Invarian 3 tetap diperiksa"],
    ["== H. Key per IP memotong IPv6 ke prefix /64 (keputusan 660)", "== H. Key per IP memotong IPv6 ke prefix /64"],
    ["# --- C. Jurnal yang COMMIT sesudah laporan (keputusan 407) ---", "# --- C. Jurnal yang COMMIT sesudah laporan ---"],
    ["// meninggalkan batch dikirim tanpa file (usulan di keputusan 517).", "// meninggalkan batch dikirim tanpa file."],
  ])("%s", (masuk, harap) => expect(b(masuk)).toBe(harap));

  it("beberapa rujukan dalam satu kurung, berupa daftar atau rentang", () => {
    expect(b("-- uji (keputusan 401, 402) selesai")).toBe("-- uji selesai");
    expect(b("-- uji (keputusan 401 dan 402) selesai")).toBe("-- uji selesai");
    expect(b("-- uji (keputusan 401–403) selesai")).toBe("-- uji selesai");
    expect(b("-- uji (keputusan #401) selesai")).toBe("-- uji selesai");
  });

  it("nomor PR dan tinjauan PR", () => {
    expect(b("// (mutasi tinjauan PR 340). SKIP LOCKED membuat worker")).toBe("// SKIP LOCKED membuat worker");
    expect(b("# Bagian G (tinjauan PR #294, keputusan 718): tanpa bagian ini")).toBe("# Bagian G: tanpa bagian ini");
    expect(b("x := 1 // klaim per baris (mutasi tinjauan PR 340)")).toBe("x := 1 // klaim per baris");
  });
});

describe("rujukan di ujung atau pangkal kurung yang masih punya isi lain", () => {
  it("ujung kurung", () => {
    expect(b("// Pengaman cek penerima (lab-api-t2a, keputusan 646): setiap percobaan")).toBe("// Pengaman cek penerima (lab-api-t2a): setiap percobaan");
    expect(b("// meninggalkan batch dikirim tanpa file (fsync(2), keputusan 506).")).toBe("// meninggalkan batch dikirim tanpa file (fsync(2)).");
  });
  it("pangkal kurung", () => {
    expect(b("(keputusan 646, lab-api-t2a)")).toBe("(lab-api-t2a)");
  });
});

describe("rujukan di awal baris komentar menyambung kalimat sebelumnya", () => {
  it("titik ikut pindah ke baris sebelumnya", () => {
    const masuk = "// sampai ambang langsung memasang kunci. Tebakan bersamaan menunggu, hanya satu yang dinilai\n// (keputusan 659). Password yang ternyata benar menghapus penghitung.";
    expect(b(masuk)).toBe("// sampai ambang langsung memasang kunci. Tebakan bersamaan menunggu, hanya satu yang dinilai.\n// Password yang ternyata benar menghapus penghitung.");
  });
  it("jumlah baris tidak berubah (id baris Snippet dipakai widget stackstep)", () => {
    const masuk = "a (keputusan 500)\n// b\n// (keputusan 659). c\n-- d (tinjauan PR 12)\ne";
    expect(b(masuk).split("\n")).toHaveLength(masuk.split("\n").length);
  });
});

describe("yang bukan rujukan internal tidak diubah", () => {
  it.each([
    "Keputusan 3 adalah keputusan terpisah dengan opsinya sendiri.",
    "(keputusan ini salah bila beban naik)",
    "(ADR 13) dan (RFC 6459, bagian 5.2)",
    "tebakan #10 → instance 2",
    "PR cfug/dio#2512 di GitHub",
    "-- keputusan 12345 bukan nomor internal",
    "# Lab 1.31 · satu VPS, satu container API.",
    "(keputusan)",
  ])("%s", (teks) => expect(b(teks)).toBe(teks));

  it("bentuk yang tidak dikenali dibiarkan supaya pemeriksa ID menggagalkan build", () => {
    expect(b("-- lihat keputusan 401 untuk alasannya")).toBe("-- lihat keputusan 401 untuk alasannya");
    expect(b("Mutasi yang dicoba peninjau PR 340: FOR UPDATE tanpa SKIP LOCKED")).toBe("Mutasi yang dicoba peninjau PR 340: FOR UPDATE tanpa SKIP LOCKED");
  });
});
