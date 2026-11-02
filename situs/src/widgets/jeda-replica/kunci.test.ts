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
  it("catatan sumber dan label sumber memakai kata yang sama dengan /cara-pakai/ dan rekaman jeda.txt bagian A", () => {
    expect(d.label.sumber).toBe("Simulasi");
    expect(d.sumber.teks.startsWith("Jeda yang kamu geser adalah Simulasi.")).toBe(true);
    expect(d.sumber.teks).toContain("jeda alami selalu di bawah 1 detik pada 100 pembayaran per detik");
    expect(d.label.acuanJenis).toEqual({ rekaman: "Rekaman lab", ilustrasi: "Ilustrasi" });
    expect(d.label.dasar.kode).toBe("Tidak dijalankan, dibaca dari kode api-t5");
    expect(d.label.dasar.dokumentasi).toBe("Dokumentasi PostgreSQL 17, Tidak dijalankan");
    expect(d.label.dasar.rancangan).toBe("Asumsi desain");
  });
});
