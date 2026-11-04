// Kunci kalimat widget fan-out (W5-fanout): tes yang mengunci kalimat dan sel tabel secara literal. Dipisah dari logika.test.ts supaya
// uji mutasi bisa dijalankan dua putaran, dengan dan tanpa kunci baris (hanya putaran tanpa kunci menunjukkan celah turunan, plan:
// .claude/skills/analisis-kritis Prosedur E butir 12). Harapan ditulis dari aturan model, bukan dari fungsi yang diuji. Baris sumber
// tiap kalimat yang dikunci ada di komentar di dekatnya.
import { describe, expect, it } from "vitest";
import mentah from "../../../data/widget/t5-fanout.json";
import { BARIS, hitung, namaKelompok, penerimaDari, pengirimDari, ringkasan, selTeks } from "./logika";
import { DataFanOut } from "./skema";

const d = DataFanOut.parse(mentah);
const sel = (n: string, p: string, k: "sebanyak" | "lab") => {
  const h = hitung(d, penerimaDari(d, n), pengirimDari(d, p), k);
  return { nama: namaKelompok(d, h), kasus: h.kasus, isi: BARIS.map((b) => selTeks(d, h, b)) };
};

describe("kunci: kalimat dan sel tabel", () => {
  it("tabel 1.000.000 perangkat, 167 pengirim: kelompok sebanyak consumer dan kelompok lab, enam sel tiap kelompok", () => {
    expect(sel("n1000000", "p167", "sebanyak")).toEqual({
      nama: "42 partisi, sebanyak consumer",
      kasus: "cukup",
      isi: ["42 dari 42", "23.810 perangkat", "556,7 per detik", "29,9 menit", "6,3% dari kuota 10.000 per detik, termasuk uang 75,2 per detik", "semua consumer mendapat partisi dan kuota tidak terlampaui"],
    });
    expect(sel("n1000000", "p167", "lab")).toEqual({
      nama: "6 partisi, seperti di lab",
      kasus: "partisi",
      isi: ["6 dari 42", "166.667 perangkat", "80 per detik", "3,5 jam", "1,6% dari kuota 10.000 per detik, termasuk uang 75,2 per detik", "36 consumer menganggur karena partisi kurang"],
    });
  });
  it("tabel 5.000 pengirim: kuota terlampaui, selesai paling cepat, dan batas laju 6.000 per detik", () => {
    expect(sel("n1000000", "p5000", "sebanyak")).toEqual({
      nama: "1.250 partisi, sebanyak consumer",
      kasus: "kuota",
      isi: ["1.250 dari 1.250", "800 perangkat", "16.667 per detik", "paling cepat 101 detik", "167% dari kuota 10.000 per detik, termasuk uang 75,2 per detik", "6.742 permintaan per detik di atas kuota dijawab 429; dengan batas laju 6.000 per detik selesai dalam 2,8 menit tanpa melewati kuota"],
    });
    expect(sel("n1000000", "p5000", "lab").isi[5]).toBe("1.244 consumer menganggur karena partisi kurang");
  });
  it("tabel 4 pengirim dan lab 12 pengirim: satu consumer tanpa partisi menganggur; tiga consumer memegang dua partisi masing-masing", () => {
    expect(sel("n1000000", "p4", "sebanyak").isi.slice(0, 4)).toEqual(["1 dari 1", "1.000.000 perangkat", "13,3 per detik", "20,8 jam"]);
    expect(sel("n10281", "p12", "lab")).toEqual({
      nama: "6 partisi, seperti di lab",
      kasus: "cukup",
      isi: ["3 dari 3", "1.714 perangkat", "40 per detik", "4,3 menit", "1,2% dari kuota 10.000 per detik, termasuk uang 75,2 per detik", "semua consumer mendapat partisi dan kuota tidak terlampaui"],
    });
  });
  it("kalimat ringkasan: satu kalimat untuk tiap kasus, dengan angka kunci", () => {
    const r = (n: string, p: string) => ringkasan(d, penerimaDari(d, n), pengirimDari(d, p));
    expect(r("n1000000", "p167")).toBe("1.000.000 perangkat, 167 pengirim: dengan 42 partisi selesai dalam 29,9 menit, dengan 6 partisi dalam 3,5 jam.");
    expect(r("n1000000", "p4")).toBe("1.000.000 perangkat, 4 pengirim: dengan 1 partisi selesai dalam 20,8 jam, dengan 6 partisi dalam 20,8 jam.");
    expect(r("n100000", "p32")).toBe("100.000 perangkat, 32 pengirim: dengan 8 partisi selesai dalam 15,6 menit, dengan 6 partisi dalam 20,8 menit.");
    expect(r("n1000000", "p5000")).toBe("1.000.000 perangkat, 5.000 pengirim: 1.250 partisi meminta 16.667 per detik, melewati kuota 10.000, jadi kelebihannya dijawab 429; dengan 6 partisi selesai dalam 3,5 jam.");
    for (const n of d.penerima) for (const p of d.pengirim) expect(r(n.id, p.id).match(/[.!?](?=\s|$)/g), `${n.id} ${p.id}`).toHaveLength(1);
  });
  it("tebakan: jawaban benar menyebut 3,5 jam dan enam consumer, tak satu pilihan lain menyebut keduanya", () => {
    expect(d.tebak.pilihan[d.tebak.jawaban]).toBe("Sekitar 3,5 jam, karena hanya 6 consumer yang memegang partisi");
    expect(d.tebak.pilihan.filter((p) => p.includes("3,5 jam"))).toHaveLength(1);
    expect(d.tebak.pilihan.filter((p) => p.includes("20,8 jam"))).toHaveLength(1);
    expect(d.tebak.pilihan.filter((p) => p.includes("30 menit"))).toHaveLength(1);
    expect(d.tebak.pilihan.filter((p) => p.includes("kuota 10.000 per detik"))).toHaveLength(1);
  });
  it("pilihan tebakan dan pertanyaan: pilihan salah memuat angka yang dihitung model, bukan angka acak", () => {
    // 167 ÷ 0,3 = 556,7; 4 pengirim 20,8 jam; kuota 10.000 (hitungan tabel)
    const h = hitung(d, penerimaDari(d, "n1000000"), pengirimDari(d, "p167"), "sebanyak");
    expect(d.tebak.pilihan[1]).toContain("556,7");
    expect(h.laju.toFixed(1)).toBe("556.7");
    expect(d.tebak.q).toBe("Pengumuman ke 1.000.000 perangkat. Kamu menambah pengirim dari 4 menjadi 167 (42 consumer), tetapi topik tetap punya 6 partisi seperti di lab. Berapa lama pengumuman selesai (Simulasi)?");
    expect(d.tebak.alasan).toBe("Satu partisi dibaca satu consumer dalam satu grup, jadi 36 dari 42 consumer tidak punya yang dibaca. Enam consumer dengan 4 pengirim berarti 24 pengirim: 1.000.000 × 0,3 ÷ 24 = 12.500 detik, sekitar 3,5 jam.");
  });
  it("label: kolom, kelompok, caption, dan petunjuk penggeser", () => {
    expect(d.label.tabel.kolom).toEqual({ consumer: "Consumer bekerja", antrean: "Queue tiap partisi", laju: "Laju kirim", selesai: "Selesai dalam", kuota: "Kuota terpakai", akibat: "Akibat" });
    expect(d.label.kelompok).toEqual({ sebanyak: "{partisi} partisi, sebanyak consumer", lab: "{partisi} partisi, seperti di lab" });
    expect(d.label.tabel.caption).toBe("Pengumuman yang sama dengan dua jumlah partisi");
    expect(d.label.pengirim.petunjuk).toBe("Tiap consumer memegang 4 pengirim; 12 pengirim sama dengan tiga consumer di lab. Pada 5.000 pengirim, 1.000.000 perangkat selesai dalam satu menit bila kuota tidak membatasi.");
    expect(d.label.pengirim.label).toBe("Pengirim serentak");
    expect(d.label.penerimaJudul).toBe("Jumlah perangkat");
    expect(d.penerima.map((p) => p.label)).toEqual(["10.281 (lab)", "100.000", "1.000.000"]);
    expect(d.pengirim.map((p) => p.label)).toEqual(["4", "12", "32", "167", "5.000"]);
  });
  it("judul dan catatan sumber: chip Simulasi, kalimat pertama mendefinisikannya, dan tidak memakai kata penuh", () => {
    expect(d.label.sumber).toBe("Simulasi");
    expect(d.judul).toBe("Fan-out pengumuman: satu baris, banyak partisi, satu kuota");
    expect(d.sumber.teks).toBe("Jumlah perangkat dan jumlah pengirim yang kamu ubah adalah Simulasi. Lama kirim 0,3 detik per pengiriman, kuota 10.000 per detik, dan notifikasi uang 75,2 per detik pada puncak harian adalah Asumsi naskah. Bagian Rekaman lab mengutip keluaran lab t5-fanout, yang tidak menjalankan pengumuman ke 1.000.000 perangkat.");
    expect(d.label.acuanJenis).toEqual({ rekaman: "Rekaman lab", asumsi: "Asumsi" });
    expect(d.label.dasar).toEqual({ kode: "Tidak dijalankan, dibaca dari kode lab t5-fanout", dokumentasi: "Dokumentasi, Tidak dijalankan", rancangan: "Asumsi desain" });
  });
  // Kalimat yang ada sumbernya tetapi tidak bisa diturunkan kata demi kata: dikunci utuh, baris sumber di komentar.
  it("acuan: kalimat rekaman dan hitungan dikunci utuh per pilihan", () => {
    const a = (n: string | undefined, p: string | undefined, berkas: string, bagian: string) => d.acuan.find((x) => x.penerima === n && x.pengirim === p && x.berkas === berkas && x.bagian === bagian)!.teks;
    // aliran.txt A: "# 10.281 perangkat, 1 baris pengumuman, 1 baris outbox, 6 rekaman di Kafka (satu per rentang, satu per partisi)"
    expect(a("n10281", undefined, "aliran.txt", "A")).toBe("Satu pengumuman ke 10.281 perangkat aktif menulis satu baris pengumuman dan satu baris outbox. Relay mengubahnya menjadi enam rekaman di Kafka, satu per rentang perangkat dan satu per partisi, tanpa celah.");
    // pengirim.txt B: "kapasitas terukur (pesan per detik) antara 10 dan 13,4 (c / t naskah = 13,33): ya"; penyedia tiruan latensi 300 ms
    expect(a(undefined, "p4", "pengirim.txt", "B")).toBe("Kode pengirim yang sama dengan consumer, dijalankan sendiri tanpa Kafka, memakai 4 pengirim serentak melawan penyedia tiruan berlatensi 300 ms. Kapasitas yang terukur berada antara 10 dan 13,4 pesan per detik. Nilai 13,3 per detik (4 ÷ 0,3) di tabel ini berada di dalam rentang itu. Ukuran itu diambil pada tiruan, bukan pada penyedia sungguhan.");
    // grup.txt A: [2, 2, 2] lalu [3, 3]; "paling banyak 504"
    expect(a(undefined, "p12", "grup.txt", "A")).toBe("Pada lab dengan 10.281 perangkat, tiga consumer memegang dua partisi masing-masing. Consumer pertama mati sesudah sekitar 500 pengiriman tanpa mencatat offset, lalu dua consumer yang hidup memegang tiga partisi masing-masing dan menyelesaikan keenam rekaman. Tiap perangkat menerima satu notifikasi berbeda, dan paling banyak 504 panggilan diulang.");
    // pengirim.txt A: 8 proses x 4 = 32 pengirim; 555,6 x 0,3 = 166,7 -> 167; ceil(167 / 4) = 42; 16.667 per detik = 167% kuota
    expect(a(undefined, "p32", "pengirim.txt", "A")).toBe("Hitungan atas Asumsi dari naskah: 8 consumer dengan 4 pengirim berarti 32 pengirim dan kapasitas 32 ÷ 0,3 = 106,7 per detik. Lab mengulang hitungan ini dan tidak menjalankan delapan consumer.");
    expect(a("n1000000", "p167", "pengirim.txt", "A")).toContain("1.000.000 ÷ 1.800 detik = 555,6 per detik. Dikali 0,3 detik hasilnya 167 pengirim, dan dibagi 4 menjadi 42 consumer dan paling sedikit 42 partisi.");
    expect(a("n1000000", "p167", "pengirim.txt", "A")).toContain("Tabel memakai 167 ÷ 0,3 = 556,7 per detik, sedikit di atas target itu. Lab memakai 6 partisi dan 3 consumer.");
    expect(a("n1000000", "p5000", "pengirim.txt", "A")).toBe("Hitungan atas Asumsi dari naskah: bila 1.000.000 perangkat dikirim dalam satu menit, lajunya 16.667 per detik, atau 167% dari kuota. Lab tidak menjalankan pengumuman sebesar itu.");
    // kuota.txt A dan B: "ada permintaan yang dijawab 429"; jumlah 429 tidak direkam (README "Rekaman")
    const kuota = (bagian: string) => d.acuan.find((x) => x.kuota === "lewat" && x.bagian === bagian)!.teks;
    expect(kuota("A")).toContain("ada permintaan yang dijawab 429.");
    expect(kuota("A")).toContain("Jumlah 429 tidak direkam, karena bergantung mesin.");
    expect(kuota("B")).toBe("Pada skenario yang sama, pengirim yang mengulang segera sesudah 429 (-tanpa-backoff) menghasilkan paling sedikit dua kali lebih banyak 429 daripada pengirim dengan backoff dan jitter. Jumlah pastinya tidak direkam.");
  });
  it("uang: kelas hanya mengatur urutan; kuota dipakai bersama; tanpa batas laju uang ikut 429", () => {
    // antrean.txt A: "-- kelas hanya mengatur urutan di antrean yang sama; penyedia push dan kuotanya dipakai bersama (bagian B)"
    expect(d.uang[0]!.teks).toBe("Kelas queue mengurutkan uang di depan 3.000 baris promo di outbox: satu putaran worker mengirim empat baris uang. Kelas hanya mengatur urutan di queue yang sama, sedangkan penyedia push dan kuotanya dipakai bersama.");
    // antrean.txt B: terkendali 3 x 200 = 600; uang 429 0; umur uang tertua tidak lebih 2 detik; rentan: uang 429 dan umur melebihi 2 detik
    expect(d.uang[1]!.teks).toBe("Dengan laju tiap consumer dibatasi (3 × 200 = 600 per detik, di bawah kuota lab 1.000), uang tidak dijawab 429. Umur uang tertua tidak melewati 2 detik. Tanpa batas laju dan tanpa backoff, uang ikut dijawab 429 dan umurnya melewati 2 detik.");
    expect(d.uang.map((u) => [u.berkas, u.bagian])).toEqual([["antrean.txt", "A"], ["antrean.txt", "B"]]);
  });
  it("batas: kuota terjemahan lab, partisi dan consumer penalaran, satu notifikasi berbeda, Kafka satu broker", () => {
    const b = (awal: string) => d.batas.find((x) => x.teks.startsWith(awal))!;
    expect(d.batas.map((x) => x.dasar)).toEqual(["rancangan", "rancangan", "rancangan", "dokumentasi", "dokumentasi", "kode", "kode"]);
    // sumber.test.ts: 3 x 200 = 600 dari kuota 1.000 di antrean.txt B; 60% x 10.000 = 6.000 yang tertulis di sel Akibat
    expect(b("Batas laju 6.000").teks).toBe("Batas laju 6.000 per detik adalah 60% dari kuota, pilihan desain yang meniru lab (3 × 200 = 600 dari kuota 1.000). Angka itu bukan batas dari penyedia.");
    // README t5-fanout "Kuota dengan jendela satu detik": 600.000 per menit diterjemahkan jadi 10.000 per detik; R5-288
    expect(b("Kuota 10.000 per detik").teks).toBe("Kuota 10.000 per detik adalah terjemahan lab dari 600.000 per menit milik satu penyedia push. Dokumentasinya menyebut kuota per menit dan tidak menyebut laju per detik, jadi semburan di awal menit tidak dimodelkan.");
    // R5-07 dan docs/design/design.md cabang 4.3 (dibuka 2026-11-03): "consumed by exactly one consumer within each subscribing consumer group at any given
    // time"; dokumen itu tidak menyebut consumer menganggur, dan share group boleh punya consumer lebih banyak dari partisi: kesimpulan itu penalaran
    expect(b("Dokumentasi Kafka").teks).toBe("Dokumentasi Kafka menyebut tiap partisi dibaca tepat satu consumer dalam tiap consumer group pada satu waktu. Consumer di atas jumlah partisi tidak punya yang dibaca; itu penalaran dari kalimat itu dan hanya berlaku untuk consumer group, bukan share group. Lab tidak memasang consumer lebih banyak dari partisi.");
    // grup.txt A: "bukan pengiriman tepat satu kali"
    expect(b("Satu notifikasi per perangkat").teks).toBe("Satu notifikasi per perangkat berarti satu notifikasi berbeda. Consumer yang mati tidak mencatat offset, jadi rentangnya dikirim ulang dengan id yang sama. Penyedia tiruan di lab hanya menghitung id berbeda per perangkat dan tidak menyaring ulangan. Pengiriman tepat satu kali tidak dijalankan.");
    // README: Kafka satu broker; jalur galat consumer dan RecordDeliveryTimeout tidak diperankan; docker-compose tanpa batas memori
    expect(b("Kafka di lab").teks).toBe("Kafka di lab satu broker dengan heap 512 MB dan tanpa batas memori kontainer. Jalur galat consumer dan waktu tunggu relay tidak diperankan, dan tiga broker dengan replication factor 3 tidak dijalankan.");
    expect(b("Widget memodelkan").teks).toBe("Widget memodelkan satu pengumuman dengan 4 pengirim di tiap consumer dan 0,3 detik per pengiriman. Ulangan sesudah 429 tidak dihitung: tanpa backoff ulangan menambah permintaan, dan backoff dengan jitter menyebarkannya.");
    expect(b("Lab merekam").teks).toBe("Lab merekam struktur dan 429 pada latensi tiruan 0 sampai 5 ms (300 ms hanya di bagian pengirim). Jadi lama selesai di tabel adalah Simulasi atas Asumsi, bukan ukuran lab.");
  });
});
