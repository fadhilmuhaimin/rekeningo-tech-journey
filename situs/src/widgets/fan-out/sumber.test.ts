// Penjaga sumber widget fan-out (W5-fanout): menurunkan nilai dari rekaman lab t5-fanout, README dan kode lab, serta naskah Tahap 5, lalu
// membandingkannya dengan t5-fanout.json. Satu nilai yang diubah di salah satu sisi membuat tes gagal (uji mutasi di badan PR).
// Baris sumber tiap kalimat yang dikunci literal ada di komentar di dekatnya. Dua klaim dokumentasi tidak bisa dijaga offline: kuota penyedia push per menit (R5-288, dibuka 2026-11-02 oleh peninjau lab) dan
// satu partisi dibaca satu consumer per grup (R5-07; docs/design/design.md cabang 4.3 di GitHub, dibuka ulang 2026-11-03).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import mentah from "../../../data/widget/t5-fanout.json";
import { DataFanOut } from "./skema";
import { angka, durasiTeks, hitung, penerimaDari, pengirimDari, ribuan } from "./logika";

const d = DataFanOut.parse(mentah);
const AKAR = path.resolve(__dirname, "../../../..");
const baca = (rel: string) => fs.readFileSync(path.join(AKAR, rel), "utf8");
const norm = (s: string) => s.replace(/\s+/g, " ");
const REKAMAN = (berkas: string) => baca(`labs/t5-fanout/output/${berkas}`);

/** Satu bagian rekaman: dari "# --- X. " sampai "# --- " berikutnya. */
const bagian = (isi: string, huruf: string): string => {
  const awal = isi.indexOf(`# --- ${huruf}. `);
  expect(awal, `bagian ${huruf} ada`).toBeGreaterThan(-1);
  const lanjut = isi.indexOf("\n# --- ", awal + 1);
  return lanjut === -1 ? isi.slice(awal) : isi.slice(awal, lanjut);
};
const ALIRAN_A = bagian(REKAMAN("aliran.txt"), "A");
const GRUP_A = bagian(REKAMAN("grup.txt"), "A");
const KUOTA_A = bagian(REKAMAN("kuota.txt"), "A");
const PENGIRIM_A = bagian(REKAMAN("pengirim.txt"), "A");
const PENGIRIM_B = bagian(REKAMAN("pengirim.txt"), "B");
const README = norm(baca("labs/t5-fanout/README.md"));
const RUN = baca("labs/t5-fanout/run.py");
const NASKAH = norm(baca("plan/CERITA-TAHAP-5.md"));
const angkaDi = (re: RegExp, teks: string) => Number(re.exec(teks)![1]!.replace(/\./g, "").replace(",", "."));

describe("sumber: tiap bukti acuan dan uang ada di berkas dan bagian yang disebut", () => {
  it("semua baris bukti ditemukan di bagian rekaman yang dinamai (kemunculan di bagian lain tidak dihitung)", () => {
    for (const a of [...d.acuan, ...d.uang]) {
      const isi = norm(bagian(REKAMAN(a.berkas), a.bagian));
      for (const b of a.bukti) expect(isi, `${a.berkas} ${a.bagian}: ${b}`).toContain(norm(b));
    }
  });
  it("acuan menyebut empat berkas rekaman (aliran, grup, kuota, pengirim), uang antrean; semuanya ada di labs/t5-fanout/output", () => {
    expect([...new Set(d.acuan.map((a) => a.berkas))].sort()).toEqual(["aliran.txt", "grup.txt", "kuota.txt", "pengirim.txt"]);
    expect([...new Set(d.uang.map((a) => a.berkas))]).toEqual(["antrean.txt"]);
    for (const a of [...d.acuan, ...d.uang]) expect(fs.existsSync(path.join(AKAR, "labs/t5-fanout/output", a.berkas))).toBe(true);
  });
  it("jenis Asumsi hanya untuk hitungan di pengirim.txt A; jenis Rekaman tidak dipakai untuk hitungan itu", () => {
    for (const a of d.acuan) {
      if (a.jenis === "asumsi") expect([a.berkas, a.bagian]).toEqual(["pengirim.txt", "A"]);
      else expect([a.berkas, a.bagian]).not.toEqual(["pengirim.txt", "A"]);
    }
    expect(PENGIRIM_A).toContain("Hitungan atas Asumsi");
    expect(PENGIRIM_B).not.toContain("Hitungan atas Asumsi");
  });
  it("Asumsi: setiap acuan Asumsi dibuka dengan 'Hitungan atas Asumsi dari naskah'", () => {
    for (const a of d.acuan.filter((x) => x.jenis === "asumsi")) expect(a.teks.startsWith("Hitungan atas Asumsi dari naskah: ")).toBe(true);
  });
});

describe("sumber: aliran.txt A (satu pengumuman, enam rekaman)", () => {
  it("10.281 perangkat aktif sama dengan pilihan lab; 6 rekaman = partisi lab; rentang terbesar 1.714 = ceil(10.281 ÷ 6) = antrean tiap partisi", () => {
    const perangkat = angkaDi(/# ([\d.]+) perangkat, 1 baris pengumuman, 1 baris outbox, (\d+) rekaman di Kafka/, ALIRAN_A);
    expect(perangkat).toBe(d.penerima[0]!.jumlah);
    expect(Number(/# [\d.]+ perangkat, 1 baris pengumuman, 1 baris outbox, (\d+) rekaman/.exec(ALIRAN_A)![1])).toBe(d.skenario.partisiLab);
    const rentang = [...ALIRAN_A.matchAll(/Partition:(\d) Offset:0 kunci:shard-\d rentang perangkat (\d+) sampai (\d+) \((\d+) nomor\)/g)].map((m) => ({ p: +m[1]!, awal: +m[2]!, akhir: +m[3]!, n: +m[4]! }));
    expect(rentang).toHaveLength(d.skenario.partisiLab);
    expect(rentang.map((r) => r.p)).toEqual([0, 1, 2, 3, 4, 5]);
    // tanpa celah dan tumpang tindih: tiap rentang mulai sesudah akhir yang sebelumnya, dan berakhir di 10.281
    rentang.forEach((r, i) => expect(r.awal).toBe(i === 0 ? 1 : rentang[i - 1]!.akhir + 1));
    expect(rentang.at(-1)!.akhir).toBe(10281);
    expect(Math.max(...rentang.map((r) => r.n))).toBe(Math.ceil(10281 / d.skenario.partisiLab));
    expect(ribuan(hitung(d, penerimaDari(d, "n10281"), pengirimDari(d, "p12"), "lab").perPartisi)).toBe("1.714");
  });
  it("acuan menyebut 'satu baris pengumuman dan satu baris outbox' dan 'enam rekaman' sama dengan rekaman (1 baris pengumuman, 1 baris outbox, 6 rekaman)", () => {
    const a = d.acuan.find((x) => x.berkas === "aliran.txt")!;
    expect(a.teks).toContain("satu baris pengumuman dan satu baris outbox");
    expect(a.teks).toContain("enam rekaman");
    expect(ALIRAN_A).toMatch(/pengumuman \| stream \| 2 {5}\| menunggu \| 1/);
  });
});

describe("sumber: grup.txt A (tiga consumer, enam partisi, satu consumer mati)", () => {
  it("tiga consumer × 4 pengirim = 12 pengirim: run.py memulai tiga consumer berpengirim 4 di bagian grup, dan partisi lab 6", () => {
    const grup = RUN.slice(RUN.indexOf('p1 = mulai_stream("k1", "konsumen"'), RUN.indexOf('p1 = mulai_stream("k1", "konsumen"') + 400);
    expect([...grup.matchAll(/"-serentak", "(\d+)"/g)].map((m) => Number(m[1]))).toEqual([4, 4, 4]);
    expect(RUN).toContain("PARTISI_UMUM, PARTISI_BAYAR = 6, 3");
    expect(d.skenario.partisiLab).toBe(6);
    expect(d.skenario.serentak).toBe(4);
    expect(pengirimDari(d, "p12").jumlah).toBe(3 * d.skenario.serentak);
    expect(GRUP_A).toContain("anggota yang memegang partisi: 3; partisi per anggota: [2, 2, 2]");
  });
  it("acuan: sesudah consumer pertama mati, dua consumer memegang tiga partisi masing-masing; 504 = 500 + 4 pengirim; 10.281 perangkat satu notifikasi berbeda", () => {
    expect(GRUP_A).toContain("anggota sesudah consumer 1 mati: 2; partisi per anggota: [3, 3]");
    const a = d.acuan.find((x) => x.berkas === "grup.txt")!;
    expect(a.teks).toContain("sesudah sekitar 500 pengiriman");
    expect(a.teks).toContain("paling banyak 504 panggilan diulang");
    expect(GRUP_A).toContain("±500 pengiriman");
    expect(RUN).toContain('"-lab-henti-setelah", "500"');
    expect(GRUP_A).toContain("paling banyak 504: ya");
    expect(GRUP_A).toContain(`-- penyedia push: perangkat dengan tepat satu notifikasi berbeda: ${d.penerima[0]!.jumlah}`);
  });
  it("consumer lab tidak pernah lebih banyak dari partisi: tiga consumer lawan enam partisi di semua bagian yang memulai consumer", () => {
    const mulai = [...RUN.matchAll(/for i in \(([\d, ]+)\):\s*\n\s*mulai_stream\(f"k\{i\}", "konsumen"/g)].map((m) => m[1]!.split(",").length);
    expect(mulai.length).toBeGreaterThan(0);
    for (const n of mulai) expect(n).toBeLessThanOrEqual(d.skenario.partisiLab);
    expect((RUN.match(/mulai_stream\("k\d", "konsumen"/g) ?? []).length).toBe(3);
  });
});

describe("sumber: kuota.txt A dan antrean.txt, kuota lab sepersepuluh dari kuota tabel", () => {
  it("kuota lab 1.000 per detik = sepersepuluh dari 10.000, latensi 2 ms, 3.000 perangkat, tiga consumer × 32 pengirim = 96", () => {
    expect(KUOTA_A).toContain("Kuota penyedia push 1.000 per detik (lab, sepersepuluh dari 10.000)");
    expect(d.skenario.kuota / 10).toBe(1000);
    expect(KUOTA_A).toContain("-- kuota lab 1.000 per detik, latensi 2 ms; naskah 10.000 per detik");
    expect(KUOTA_A).toContain("-- 3.000 perangkat aktif; tiga consumer, tiap consumer 32 pengirim;");
    expect(KUOTA_A).toContain("96 pengirim serentak");
    expect(3 * 32).toBe(96);
    expect(RUN).toContain("siapkan(kuota=1000, latensi=2, aktif=4000, versi=False)");
    const a = d.acuan.find((x) => x.berkas === "kuota.txt" && x.bagian === "A")!;
    for (const k of ["kuota lab 1.000 per detik", "latensi 2 ms", "3.000 perangkat", "96 pengirim serentak"]) expect(a.teks).toContain(k);
  });
  it("jumlah 429 tidak direkam: setelah '429:' di rekaman kuota dan antrean hanya ada 0 atau 'lebih dari 0: ya'; README menyebut jumlah 429 tidak direkam", () => {
    const nilai = ["kuota.txt", "antrean.txt"].flatMap((b) => [...REKAMAN(b).matchAll(/429: ([^\n]+)/g)].map((m) => m[1]!));
    expect(nilai.length).toBeGreaterThan(2);
    for (const v of nilai) expect(["0", "lebih dari 0: ya"]).toContain(v);
    expect(README).toContain("Waktu, UUID acak, lama, jumlah 429, dan umur tidak direkam sebagai nilai");
  });
  it("uang: tiga consumer × 200 = 600 per detik di bawah kuota 1.000; run.py memakai -laju 200 dan -serentak 4; rentan 3 × 32 pengirim tanpa batas laju", () => {
    const B = bagian(REKAMAN("antrean.txt"), "B");
    expect(B).toContain("tiap consumer dibatasi 200 pesan per detik (3 x 200 = 600 per detik, di bawah kuota 1.000), 4 pengirim");
    expect(RUN).toContain('["-laju", "200", "-serentak", "4"]');
    expect(RUN).toContain('["-serentak", "32", "-tanpa-backoff", "-maks-percobaan", "100000000"]');
    expect(B).toContain("-- umur notifikasi uang tertua melebihi 2 detik (batas lab): ya");
    expect(d.uang[1]!.teks).toContain("(3 × 200 = 600 per detik, di bawah kuota lab 1.000)");
    // batas laju di widget = 60% kuota: 600 dari kuota lab 1.000 (antrean.txt B), dan 60% x 10.000 = 6.000
    expect((3 * 200 * 100) / 1000).toBe(d.skenario.batasPersen);
    expect((d.skenario.kuota * d.skenario.batasPersen) / 100).toBe(6000);
  });
  it("kelas antrean: empat baris uang kelas 0 terkirim lebih dulu dari 3.000 baris promo; mode urut-waktu mengirim empat promo (M27)", () => {
    const A = bagian(REKAMAN("antrean.txt"), "A");
    expect(A).toMatch(/0 {5}\| terkirim \| 4/);
    expect(A).toMatch(/2 {5}\| menunggu \| 2996/);
    expect(d.uang[0]!.teks).toContain("3.000 baris promo");
    expect(d.uang[0]!.teks).toContain("mengirim empat baris uang");
  });
});

describe("sumber: pengirim.txt dan naskah, hitungan diulang dari angka yang tertulis", () => {
  const { detikKirim: t, serentak: c, kuota } = d.skenario;
  it("naskah memuat kuota 600.000 per menit = 10.000 per detik, t = 0,3 detik, c = 4, uang 75,2 per detik, dan 5,6% kuota untuk 30 menit", () => {
    expect(NASKAH).toContain("600.000 per menit = 10.000 per detik");
    expect(600000 / 60).toBe(kuota);
    expect(NASKAH).toContain("c = 4, t = 0,3 detik, kapasitas 13,33 per detik");
    expect([t, c]).toEqual([0.3, 4]);
    expect(NASKAH).toContain(`${angka(d.skenario.uang)} per detik puncak`);
    expect(Math.round((650000 / 86400) * 10 * 10) / 10).toBe(d.skenario.uang);
    expect(NASKAH).toContain("Target 30 menit memakai 555,6 ÷ 10.000 = 5,6% kuota");
    expect(NASKAH).toContain("Semua dalam 1 menit = 16.667 per detik = 167% kuota");
  });
  it("naskah: 4 pengirim 20,8 jam, 32 pengirim 156 menit, 167 pengirim 42 proses; tabel widget sama dengan angka naskah", () => {
    expect(NASKAH).toContain("4 pengirim: 75.000 detik = 20,8 jam");
    expect(NASKAH).toContain("32 pengirim: 9.375 detik = 156 menit");
    expect(NASKAH).toContain("1.000.000 ÷ 1.800 = 555,6 per detik, dikali 0,3 = 167 pengirim = 42 proses");
    const n = penerimaDari(d, "n1000000");
    expect(hitung(d, n, pengirimDari(d, "p4"), "sebanyak").detik).toBe(75000);
    expect(hitung(d, n, pengirimDari(d, "p32"), "sebanyak").detik).toBe(9375);
    expect(durasiTeks(hitung(d, n, pengirimDari(d, "p4"), "sebanyak").detik)).toBe("20,8 jam");
    expect(durasiTeks(hitung(d, n, pengirimDari(d, "p32"), "sebanyak").detik)).toBe("156 menit");
    // 100.000 perangkat dengan 4 pengirim = 7.500 detik (Tahap 4, naskah: "100.000 HP = 7.500 detik")
    expect(NASKAH).toContain("100.000 HP = 7.500 detik");
    expect(hitung(d, penerimaDari(d, "n100000"), pengirimDari(d, "p4"), "sebanyak").detik).toBe(7500);
  });
  it("pengirim.txt A: angka rekaman sama dengan hitungan ulang dari 1.000.000, 1.800 detik, 0,3, 4, 60, dan kuota", () => {
    const laju = 1_000_000 / 1800;
    expect(PENGIRIM_A).toContain(`laju = 1.000.000 / 1.800 detik = ${angka(laju)} per detik`);
    expect(PENGIRIM_A).toContain(`pengirim = ${angka(laju)} x 0,3 = ${angka(laju * t)} -> ${Math.ceil(laju * t)}`);
    expect(Math.ceil(laju * t)).toBe(pengirimDari(d, "p167").jumlah);
    expect(PENGIRIM_A).toContain(`consumer = ceil(${Math.ceil(laju * t)} / ${c}) = ${Math.ceil(Math.ceil(laju * t) / c)}; partisi paling sedikit = 42`);
    expect(hitung(d, penerimaDari(d, "n1000000"), pengirimDari(d, "p167"), "sebanyak").consumer).toBe(42);
    expect(PENGIRIM_A).toContain(`kuota penyedia: ${angka(laju)} / 10.000 = ${angka((laju / kuota) * 100)}% dari kuota; semua dalam semenit: 1.000.000 / 60 = ${ribuan(1_000_000 / 60)} per detik = ${ribuan(((1_000_000 / 60) / kuota) * 100)}% kuota`);
    expect(PENGIRIM_A).toContain(`8 proses x 4 = 32 pengirim -> kapasitas 32 / 0,3 = ${angka(32 / t)} per detik`);
    // 5.000 pengirim: 1.000.000 ÷ 60 × 0,3 = 5.000
    expect(Math.round((1_000_000 / 60) * t)).toBe(pengirimDari(d, "p5000").jumlah);
  });
  it("pengirim.txt B: 4 pengirim melawan latensi 300 ms, kapasitas terukur antara 10 dan 13,4, c/t = 13,33", () => {
    expect(PENGIRIM_B).toContain("48 pesan, 4 pengirim, penyedia dengan latensi 300 ms");
    expect(PENGIRIM_B).toContain("c terukur: pengirim serentak paling banyak di sisi pengirim = 4, di sisi penyedia = 4");
    expect(PENGIRIM_B).toContain("kapasitas terukur (pesan per detik) antara 10 dan 13,4 (c / t naskah = 13,33): ya");
    expect(angka(c / t)).toBe("13,3");
    const a = d.acuan.find((x) => x.berkas === "pengirim.txt" && x.bagian === "B")!;
    expect(a.teks).toContain("latensi 300 ms");
    expect(a.teks).toContain("antara 10 dan 13,4");
  });
  it("uang 75,2 per detik + 556,7 per detik = 631,9 = 6,3% kuota; naskah ADR 51 memakai 630,8 untuk 555,6 (selisih dijelaskan di acuan)", () => {
    expect(NASKAH).toContain("75,2 + 555,6 = 630,8 per detik selama 30 menit");
    expect(PENGIRIM_A).toContain("uang + pengumuman = 75,2 + 555,6 = 630,8 per detik selama 30 menit");
    expect(75.2 + 167 / t).toBeCloseTo(631.9, 1);
    expect(d.acuan.find((x) => x.pengirim === "p167")!.teks).toContain("Tabel memakai 167 ÷ 0,3 = 556,7 per detik, sedikit di atas target itu.");
  });
});

describe("sumber: README, compose, dan naskah untuk batas lab", () => {
  it("README: kuota per menit dan terjemahan 10.000 per detik; latensi tiruan 0 sampai 5 ms dan 300 ms di bagian pengirim; Kafka satu broker, tiga broker Tidak dijalankan", () => {
    expect(README).toContain("Dokumentasi penyedia itu menyebut kuota per menit (600.000) dan tidak menyebut laju per detik (R5-288), jadi jendela satu detik dan 10.000 per detik adalah terjemahan lab");
    expect(README).toContain("semburan di awal menit yang kuota per menit izinkan tidak diperankan");
    expect(README).toContain("Lab memakai latensi tiruan 0 sampai 5 ms di bagian lain (supaya ribuan perangkat selesai dalam detik) dan 300 ms hanya di bagian `pengirim`");
    expect(README).toContain("tiga broker dan replication factor 3 **Tidak dijalankan**");
    expect(README).toContain("Pengumuman ke 1.000.000 perangkat diskalakan lalu dihitung, bukan dijalankan");
  });
  it("README: lab memakai 6 partisi dan 3 consumer; hasil akhir satu notifikasi berbeda, bukan pengiriman tepat satu kali; exactly-once Tidak dijalankan", () => {
    expect(README).toContain("Lab memakai 6 partisi dan 3 consumer; 42 hanya dihitung");
    expect(README).toContain("Yang dijamin: tiap perangkat melihat satu notifikasi berbeda. Yang tidak dijamin: tiap perangkat dikirimi tepat satu kali. Transaksi Kafka dan exactly-once **Tidak dijalankan**");
  });
  it("README dan compose: jalur galat consumer dan RecordDeliveryTimeout tidak diperankan; satu broker dengan heap 512 MB dan tanpa mem_limit", () => {
    expect(README).toContain("Jalur galat consumer tidak diperankan di rekaman");
    expect(README).toContain("Relay tidak memasang `RecordDeliveryTimeout`");
    const compose = baca("labs/t5-fanout/docker-compose.yml");
    expect(compose).toContain('KAFKA_HEAP_OPTS: "-Xms256m -Xmx512m"');
    expect(compose).not.toMatch(/mem_limit|memory:|deploy:/);
    expect((compose.match(/^\s{2}kafka:/gm) ?? []).length).toBe(1);
    expect(compose).toContain("KAFKA_PROCESS_ROLES: broker,controller");
  });
  it("naskah: kelas queue tidak memisahkan uang dari kuota penyedia; lab antrean A lalu B membuktikannya (usulan di badan PR, naskah tidak diubah)", () => {
    expect(NASKAH).toContain("Kelas queue (ADR 32) sudah memisahkan uang dari promo, jadi pengumuman bukan penyebabnya");
    expect(d.label.uangJudul).toBe("Notifikasi uang memakai kuota yang sama");
  });
});
