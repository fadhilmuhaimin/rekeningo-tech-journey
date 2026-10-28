// Penjaga data widget webhook masuk (W4-webhook, keputusan 1258): teks JSON tidak memuat angka atau kata bilangan yang diketik
// tangan, setiap sumber rekaman menunjuk berkas dan bagian yang ada, tanda Aman dan Masalah serta jenis sumber tiap langkah
// sesuai tabel harapan, nomor ADR berasal dari registri, dan klaim tentang handler cocok dengan kode api-t4. Uji mutasi
// (tmp, tidak di repo) mengubah satu nilai per jenis dan tes ini harus gagal.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { bacaAcuan, bagian } from "./rekaman";
import { bangun } from "./logika";
import { LabelWebhook } from "./skema";
import { akar, asli, labelMentah, registri } from "./berkas-uji";

const mentah = labelMentah() as Record<string, any>;
const L = LabelWebhook.parse(mentah);
const adr = registri().find((h) => h.id === "t4-webhook")!.adr![0]!;
const s = bangun(L, bacaAcuan(asli()), adr);

/** Semua nilai string di JSON yang dibaca pembaca (tanpa id, lab, berkas, bagian, dan jenis yang kosakata tetap). */
function teksPembaca(x: unknown, kunci = ""): string[] {
  if (typeof x === "string") return ["id", "lab", "berkas", "bagian", "jenis", "tanda"].includes(kunci) ? [] : [x];
  if (Array.isArray(x)) return x.flatMap((y) => teksPembaca(y, kunci));
  if (x && typeof x === "object") return Object.entries(x).flatMap(([k, v]) => teksPembaca(v, k));
  return [];
}
const semua = teksPembaca(mentah);

describe("teks JSON tidak memuat angka ketikan tangan", () => {
  const tanpaPengisi = (t: string) => t.replace(/\{\w+\}/g, "").replace(/\b2xx\b/g, "").replace(/\bMD5\b/g, "").replace(/\b(t4-webhook|api-t4)\b/g, "");
  test("tiap string tanpa {placeholder}, 2xx, MD5, dan nama lab tidak berisi angka", () => {
    expect(semua.length).toBeGreaterThan(100);
    expect(semua.filter((t) => /\d/.test(tanpaPengisi(t)))).toEqual([]);
  });
  test("kata bilangan hanya di frasa yang diizinkan", () => {
    const izin = ["satu per satu", "satu pembayaran", "satu-satunya", "satu hal"];
    const sisa = semua.map((t) => izin.reduce((a, f) => a.split(f).join(""), t.toLowerCase())).filter((t) => /\b(nol|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\b/.test(t));
    expect(sisa).toEqual([]);
  });
  test("frasa yang diizinkan dipakai (izin tidak menggantung)", () => {
    for (const f of ["satu per satu", "satu pembayaran", "satu-satunya", "satu hal"]) expect(semua.some((t) => t.toLowerCase().includes(f)), f).toBe(true);
  });
  test("tanpa kutipan ID riset, nomor keputusan, atau PR di teks pembaca", () => {
    expect(semua.filter((t) => /\bR\d-\d+\b|keputusan \d+|\bPR #?\d+|#\d{3}/i.test(t))).toEqual([]);
  });
  test("tanpa emoji, tanda seru, dan kata yang dilarang gaya bahasa", () => {
    expect(semua.filter((t) => /[!\u{1F300}-\u{1FAFF}☀-➿]/u.test(t))).toEqual([]);
    expect(semua.filter((t) => /\b(mudah|cukup|tinggal|Anda)\b/i.test(t))).toEqual([]);
  });
});

/** Harapan semantik per langkah dan versi: judul, label baris, tanda, dan sumber (jenis, lab, berkas, bagian). */
const rek = (lab: string, berkas: string, bag: string) => ({ jenis: "rekaman", lab, berkas, bagian: bag });
const T4 = "t4-webhook";
const HARAP: Record<string, { judul: string; hasil: Record<string, { label: string[]; tanda: string[]; sumber: Record<string, string>[] }> }> = {
  buat: { judul: "Top-up dibuat", hasil: {
    pertama: { label: ["Gateway", "Handler", "webhook_event", "Jurnal top-up"], tanda: ["netral", "netral", "netral", "netral"], sumber: [{ jenis: "ilustrasi" }] },
    adr34: { label: ["Gateway", "Handler", "webhook_event", "Jurnal top-up"], tanda: ["netral", "netral", "netral", "netral"], sumber: [{ jenis: "ilustrasi" }] } } },
  kabar1: { judul: "Kabar pertama: settlement", hasil: {
    pertama: { label: ["Gateway", "Handler", "webhook_event", "Jurnal top-up"], tanda: ["netral", "netral", "netral", "netral"], sumber: [rek(T4, "ganda.txt", "A")] },
    adr34: { label: ["Gateway", "Handler", "webhook_event", "Jurnal top-up"], tanda: ["netral", "netral", "netral", "netral"], sumber: [rek(T4, "ganda.txt", "B")] } } },
  ulang: { judul: "Kiriman ulang: event yang sama", hasil: {
    pertama: { label: ["Gateway", "Handler", "webhook_event", "Jurnal top-up"], tanda: ["netral", "buruk", "buruk", "buruk"], sumber: [rek(T4, "ganda.txt", "A"), { jenis: "ilustrasi" }] },
    adr34: { label: ["Gateway", "Handler", "webhook_event", "Jurnal top-up"], tanda: ["netral", "baik", "baik", "baik"], sumber: [rek(T4, "ganda.txt", "B"), { jenis: "ilustrasi" }] } } },
  terlambat: { judul: "Kabar terlambat: pending sesudah settlement", hasil: {
    pertama: { label: ["Gateway", "Handler", "Status top-up"], tanda: ["netral", "netral", "buruk"], sumber: [rek("api-t4", "rentan.txt", "A")] },
    adr34: { label: ["Gateway", "Handler", "webhook_event", "Status top-up"], tanda: ["netral", "baik", "netral", "baik"], sumber: [rek(T4, "urutan.txt", "F1")] } } },
  hilang: { judul: "Kabar hilang: tidak pernah tercatat", hasil: {
    pertama: { label: ["Gateway", "Handler", "Jurnal top-up"], tanda: ["netral", "netral", "buruk"], sumber: [rek(T4, "rekon.txt", "A"), { jenis: "tidak" }] },
    adr34: { label: ["Gateway", "Handler", "webhook_event", "Jurnal top-up"], tanda: ["netral", "buruk", "buruk", "buruk"], sumber: [rek(T4, "retry.txt", "B")] } } },
  cek: { judul: "Jalan kedua: cek status ke gateway", hasil: {
    semua: { label: ["Job cek status", "Gateway", "Status top-up", "Jurnal top-up"], tanda: ["netral", "netral", "baik", "baik"], sumber: [rek(T4, "rekon.txt", "A"), { jenis: "asumsi" }] } } },
  rekon: { judul: "Rekonsiliasi harian", hasil: {
    semua: { label: ["Laporan gateway", "Selisih", "Koreksi", "Posting lama"], tanda: ["netral", "netral", "netral", "baik"], sumber: [rek(T4, "rekon.txt", "B")] } } },
  hasil: { judul: "Hasil: uang tercatat berapa kali", hasil: {
    pertama: { label: ["Ganda", "Terlambat", "Hilang"], tanda: ["buruk", "buruk", "baik"], sumber: [{ jenis: "hitungan" }] },
    adr34: { label: ["Ganda", "Terlambat", "Hilang"], tanda: ["baik", "baik", "baik"], sumber: [{ jenis: "hitungan" }] } } },
};

describe("langkah sesuai tabel harapan", () => {
  test("delapan langkah berurutan dengan judul yang diharapkan", () => {
    expect(mentah.langkah.map((l: any) => l.id)).toEqual(Object.keys(HARAP));
    expect(mentah.langkah.map((l: any) => l.judul)).toEqual(Object.values(HARAP).map((h) => h.judul));
  });
  for (const l of mentah.langkah as any[]) {
    const harap = HARAP[l.id]!;
    test(`${l.id}: kunci hasil, label baris, tanda, dan sumber`, () => {
      expect(Object.keys(l.hasil).sort()).toEqual(Object.keys(harap.hasil).sort());
      for (const [mode, h] of Object.entries(l.hasil) as [string, any][]) {
        const hh = harap.hasil[mode]!;
        expect(h.baris.map((b: any) => b.label), `${l.id} ${mode} label`).toEqual(hh.label);
        expect(h.baris.map((b: any) => b.tanda), `${l.id} ${mode} tanda`).toEqual(hh.tanda);
        expect(h.sumber.map((x: any) => ({ jenis: x.jenis, ...(x.lab ? { lab: x.lab, berkas: x.berkas, bagian: x.bagian } : {}) })), `${l.id} ${mode} sumber`).toEqual(hh.sumber);
      }
    });
  }
  test("hasil identik untuk kedua versi hanya di langkah yang berjalan terpisah dari handler", () => {
    const sama = (mentah.langkah as any[]).filter((l) => "semua" in l.hasil).map((l) => l.id);
    expect(sama).toEqual(["cek", "rekon"]);
  });
});

describe("sumber rekaman menunjuk berkas dan bagian yang ada", () => {
  const rekaman = (mentah.langkah as any[]).flatMap((l) => Object.values(l.hasil as Record<string, any>).flatMap((h) => h.sumber as any[])).filter((x) => x.jenis === "rekaman");
  test("setiap berkas ada di folder output lab dan bagiannya ada", () => {
    expect(rekaman.length).toBe(10);
    for (const x of rekaman) {
      const f = path.join(akar, "labs", x.lab, "output", x.berkas);
      expect(fs.existsSync(f), f).toBe(true);
      expect(() => bagian(fs.readFileSync(f, "utf8"), x.bagian), `${x.berkas} bagian ${x.bagian}`).not.toThrow();
    }
  });
  test("teks sumber yang tampil memuat berkas dan bagiannya", () => {
    for (const l of s.langkah) for (const h of Object.values(l.hasil)) {
      for (const src of h.sumber) if (src.jenis === "rekaman") expect(src.teks).toMatch(/^[a-z]+\.txt, bagian [A-Z]\. /);
    }
  });
  test("chip tiap jenis sumber memakai label yang sama dengan /cara-pakai/", () => {
    expect(L.jenisChip).toEqual({ rekaman: "Rekaman lab", hitungan: "Hitungan", ilustrasi: "Ilustrasi", asumsi: "Asumsi", tidak: "Tidak dijalankan" });
    const cara = fs.readFileSync(path.join(akar, "situs/src/content/docs/cara-pakai.mdx"), "utf8");
    for (const k of ["Rekaman lab", "Ilustrasi", "Asumsi", "Tidak dijalankan"]) expect(cara, k).toContain(`**${k}**`);
  });
});

describe("nomor ADR dari registri", () => {
  test("label versi memakai nomor ADR halaman webhook di registri dan tidak mengetiknya", () => {
    expect(adr).toBe(Number(registri().find((h) => h.nomor === "4.7")!.adr![0]));
    expect(s.mode.map((m) => m.teks)).toEqual(["Versi pertama", `Versi ADR ${adr}`]);
    expect(JSON.stringify(mentah)).not.toMatch(/ADR \d/);
  });
});

describe("klaim tentang handler cocok dengan kode api-t4", () => {
  const kode = fs.readFileSync(path.join(akar, "labs/api-t4/internal/service/pembayaran.go"), "utf8");
  const blok = (nama: string): string => {
    const m = kode.match(new RegExp(`// --8<-- \\[start:${nama}\\]([\\s\\S]*?)// --8<-- \\[end:${nama}\\]`));
    if (!m) throw new Error(`kode: blok ${nama} tidak ada`);
    return m[1]!;
  };
  test("versi pertama: tanpa tanda tangan, tabel event, status bersyarat; status ditimpa tanpa syarat; settlement selalu menjurnal", () => {
    const v1 = blok("webhook-v1");
    expect(v1.replace(/\n\/\/ /g, " ")).toContain("Tanpa pemeriksaan tanda tangan, tanpa tabel event, tanpa status bersyarat");
    expect(v1).toContain("UbahStatusTanpaSyarat");
    expect(v1).not.toContain("CatatEvent");
    expect(v1).toContain("kreditV1");
    expect(kode).toMatch(/if s\.rentan != RentanWebhookV1 \{\s*if err := s\.PeriksaTandaTangan/);
  });
  test("versi ADR: event dicatat dulu (nol baris = ganda), kabar yang mundur diparkir, balasan sesudah transaction", () => {
    const aman = blok("webhook-aman");
    expect(aman).toContain("CatatEvent");
    expect(aman).toContain('Hasil: "ganda"');
    expect(aman).toMatch(/h\.Hasil == "diparkir"/);
    const st = blok("terapkan-status");
    expect(st).toContain("mundur dari status akhir");
    expect(st).toContain("target == cur");
    expect(blok("kredit-topup")).toContain("Idempotency-Key = order_id");
  });
  const fungsi = (nama: string): string => {
    const mulai = kode.indexOf(`func (s Service) ${nama}(`);
    if (mulai < 0) throw new Error(`kode: fungsi ${nama} tidak ada`);
    return kode.slice(mulai, kode.indexOf("\n}\n", mulai) + 3);
  };
  test("job cek status dan rekonsiliasi tidak membaca versi handler, jadi hasilnya sama di kedua versi (klaim langkah cek dan rekon)", () => {
    // Kontrol positif: hanya TerimaWebhook membedakan mode rentan; bila pemeriksaan ini tak bisa gagal, tes ini tak berarti.
    expect(fungsi("TerimaWebhook")).toContain("s.rentan");
    for (const nama of ["CekTopup", "CekTopupBelumSelesai", "RekonHarian"]) expect(fungsi(nama), nama).not.toContain("s.rentan");
    for (const nama of ["terapkan-status", "kredit-topup"]) expect(blok(nama), nama).not.toContain("s.rentan");
  });
});

describe("teks tampil", () => {
  test("bilah dan status tidak menyebut angka yang tidak ada di rekaman (semua digit berasal dari nilai pengisi)", () => {
    const nilaiRekaman = JSON.stringify(Object.values(s)).match(/\d+/g) ?? [];
    expect(nilaiRekaman.length).toBeGreaterThan(50);
  });
  test("tiap langkah dan versi punya sumber dan paling banyak empat baris", () => {
    for (const l of s.langkah) for (const h of Object.values(l.hasil)) {
      expect(h.sumber.length).toBeGreaterThan(0);
      expect(h.baris.length).toBeGreaterThanOrEqual(3);
      expect(h.baris.length).toBeLessThanOrEqual(4);
    }
  });
});

/** Kunci teks: sidik teks yang dilihat pembaca. Perubahan kalimat apa pun (termasuk satu kata) mengubah sidik, jadi harus disengaja:
 * baca ulang kalimatnya terhadap rekaman dan kode, lalu perbarui sidik di sini. Sidik tidak membuktikan kebenaran teks; ia hanya
 * menahan perubahan yang tidak dibaca (mutan "sisip tidak" lolos tes lain karena kalimat bebas tidak dibandingkan dengan sumbernya). */
const sidik = (x: unknown): string => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 12);
const KUNCI = {
  tebak: "e7938bb5ffd1",
  mode: "c5f54831bdc7",
  langkah: ["0c119d58a97b", "7143a96be93e", "f35bb93a4006", "2269cf782230", "d5e4a4205ef4", "285d6748fd48", "8580bad4ee48", "ae930a366f32"],
};
describe("kunci teks tampil", () => {
  test("tebakan dan label versi", () => {
    expect(sidik(s.tebak)).toBe(KUNCI.tebak);
    expect(sidik(s.mode)).toBe(KUNCI.mode);
  });
  test.each(KUNCI.langkah.map((k, i) => [i + 1, k] as const))("langkah %i", (i, kunci) => {
    expect(sidik(s.langkah[i - 1]), `langkah ${i}: ${s.langkah[i - 1]!.judul}`).toBe(kunci);
  });
});

/** Label tetap di luar langkah dan tebakan (tidak ikut `Siap`): judul, chip kepala, status tebakan, tombol, petunjuk, kata Aman dan Masalah,
 * teks tanpa JavaScript, kepala tabel. Alat ukur membandingkannya dengan JSON yang sama, jadi tanpa kunci ini tertukarnya "Aman" dan
 * "Masalah" atau "Tepat." dan "Belum tepat." lolos semua lapis (mutan tinjauan 13 dari 13 lolos). */
const LABEL_TETAP = ["judul", "sumberChip", "tebakDulu", "benar", "belum", "ulang", "ubahJudul", "modeJudul", "petunjuk", "keadaanJudul", "berikutnya", "sebelumnya", "tanda", "tanpaJs", "kolomTabel"] as const;
describe("kunci label tetap", () => {
  test("semua label di luar langkah dan tebakan", () => {
    expect(sidik(Object.fromEntries(LABEL_TETAP.map((k) => [k, mentah[k]])))).toBe("2242a2a51b41");
  });
  test("pasangan label yang artinya berlawanan tidak tertukar", () => {
    expect(mentah.tanda).toEqual({ baik: "Aman", buruk: "Masalah" });
    expect([mentah.benar, mentah.belum]).toEqual(["Tepat.", "Belum tepat."]);
    expect([mentah.kolomTabel.langkah, mentah.kolomTabel.hasil, mentah.kolomTabel.sumber]).toEqual(["Langkah dan versi", "Hasil", "Sumber"]);
    expect([mentah.berikutnya, mentah.sebelumnya]).toEqual(["Langkah berikutnya", "Langkah sebelumnya"]);
  });
  test("setiap kunci label tetap ada dan tidak ada label tetap baru tanpa kunci", () => {
    const dalamSiap = ["langkah", "tebak", "mode", "modeKalimat", "statusLangkah", "langkahDari", "jenisChip"];
    expect(Object.keys(mentah).filter((k) => !dalamSiap.includes(k)).sort()).toEqual([...LABEL_TETAP].sort());
  });
});
