// Teks tampil widget cache dan invalidation dikunci satu per satu (W3-cache, keputusan 986): label tombol, judul, dan kalimat
// vonis ditulis ulang di sini, jadi mengubah satu kata di data widget membuat tes ini gagal dan perubahannya harus disengaja.
// Alat ukur browser membaca templat dari data yang sama; tes ini yang menjaga kata-katanya. Angka rekaman tidak ada di sini
// (dijaga acuan.test.ts dan penjaga.test.ts), hanya templat dengan {nama}.
import { describe, expect, it } from "vitest";
import { LabelCache } from "./skema";
import labelMentah from "../../../data/widget/t3-cache-invalidation.json";

const L = LabelCache.parse(labelMentah);

describe("teks tampil dikunci", () => {
  it("judul, chip sumber, dan kata kunci tebakan", () => {
    expect([L.judul, L.sumber, L.tebakDulu, L.benar, L.belum, L.ulang, L.ubahJudul, L.awal]).toEqual([
      "Siapa masih melihat harga lama?",
      "Ilustrasi · acuan Rekaman lab t3-cache",
      "Tebak dulu:",
      "Tepat",
      "Belum tepat",
      "Coba pilihan lain",
      "Ubah satu hal, lalu lihat akibatnya",
      "Kembali ke pengaturan awal",
    ]);
  });
  it("kelompok dan label tombol", () => {
    expect(L.kelompok).toEqual({ cache: "Jenis cache", instance: "Jumlah instance API", ttl: "TTL (detik)", kejadian: "Yang berubah", urutan: "Urutan hapus kunci" });
    expect(L.pilihNilai.cache).toEqual([
      { nilai: "memori", label: "Memori tiap instance" },
      { nilai: "redis", label: "Redis bersama" },
      { nilai: "redis-mati", label: "Redis bersama, mati saat harga berubah" },
      { nilai: "tanpa", label: "Tanpa cache" },
    ]);
    expect(L.pilihNilai.kejadian).toEqual([
      { nilai: "promo", label: "Promo mulai sekarang" },
      { nilai: "harga", label: "Ani mengubah harga" },
      { nilai: "promo-nanti", label: "Promo mulai {mulai} detik lagi" },
      { nilai: "pesanan", label: "Pesanan mengurangi stok" },
    ]);
    expect(L.pilihNilai.urutan).toEqual([
      { nilai: "sesudah", label: "Sesudah COMMIT" },
      { nilai: "sebelum", label: "Sebelum COMMIT" },
      { nilai: "lambat", label: "Sesudah COMMIT, pembaca lambat" },
    ]);
    expect(L.instance).toEqual(["Instance A: HP Budi, menerima perubahan", "Instance B: HP Citra", "Instance C: HP lain di meja yang sama"]);
  });
  it("jam, papan, dan perbandingan", () => {
    expect(L.jam).toEqual({
      label: "Jam simulasi, detik sesudah perubahan",
      keluar: "detik ke-{x}",
      nilai: "Detik ke-{x}: {stale} dari {n} instance melihat {apa} lama",
      lompatSebelum: "Lompat ke detik ke-{x}, satu detik sebelum TTL habis",
      lompatSaat: "Lompat ke detik ke-{x}, saat TTL habis",
    });
    expect(L.papan).toEqual({
      judul: "Yang dilihat tiap instance pada detik ke-{x}",
      database: "Database: {isi}",
      isi: "{harga}, stok {stok}",
      stale: "Stale",
      benar: "Sama dengan database",
      istilah: "Stale berarti data yang sudah tidak terbaru.",
      garis: "Garis waktu instance {nama}, 0 sampai {horizon} detik. Bagian berwarna menandai {apa} lama yang masih terlihat. Garis tegak menandai jam simulasi. TTL habis pada detik ke-{ttl}.",
    });
    expect(L.ringkas).toEqual({ ada: "melihat {apa} lama selama {lama} detik", tidak: "tidak melihat {apa} lama" });
    expect(L.banding).toEqual({ sama: "Belum ada yang diubah dari pengaturan awal.", beda: "Awal: instance {awalX} {awal}. Sekarang: instance {kiniX} {kini}." });
    expect([L.cocok, L.tanpaAcuan]).toEqual(["Cocok dengan Rekaman lab", "Tidak ada rekaman untuk kombinasi ini. Hasilnya Ilustrasi dari aturan simulasi di bagian asal angka."]);
  });
  it("kalimat vonis (role=status) untuk tiap sebab", () => {
    expect(L.vonis).toEqual({
      "tanpa-cache": "Tanpa cache setiap bacaan membaca database, jadi tidak ada instance yang melihat {apa} lama.",
      "dihapus-sendiri": "Satu instance membuang entrinya sendiri sesudah COMMIT, jadi tidak ada yang melihat {apa} lama.",
      "dihapus-bersama": "Kunci di Redis bersama dihapus sesudah COMMIT, jadi semua instance langsung membaca {apa} baru.",
      "entri-habis-dulu": "Entri habis sebelum perubahan terjadi, jadi tidak ada instance yang melihat {apa} lama.",
      "tidak-diberi-tahu": "Instance {x} tidak diberi tahu dan melihat {apa} lama selama {lama} detik, sampai entrinya habis oleh TTL.",
      "diisi-ulang": "{Apa} lama disimpan lagi sesudah kunci dihapus, jadi instance {x} melihat {apa} lama selama {lama} detik, sampai TTL habis.",
      "hapus-gagal": "Hapus kunci gagal karena Redis mati dan entri lama kembali bersama Redis, jadi instance {x} melihat {apa} lama selama {lama} detik.",
      "tanpa-tulis": "Perubahan ini tidak menghapus kunci apa pun, jadi instance {x} melihat {apa} lama selama {lama} detik, sampai TTL habis.",
    });
  });
  it("hitungan dan tabel tanpa JavaScript", () => {
    expect(L.hitungan).toMatchObject({
      judul: "Hitungan",
      diisi: "Entri diisi",
      diisiNilai: "detik ke-0, tepat sebelum perubahan. Asumsi: kasus terburuk.",
      lama: "Lama data lama bertahan di instance {x}",
      lamaNilai: "TTL − detik stale mulai = {cara} detik.",
      lamaNol: "0 detik.",
      instanceBasi: "Instance yang pernah melihat data lama",
      instanceBasiNilai: "{k} dari {n}.",
      bacaKunci: "Baca database untuk mengisi satu kunci yang sama",
      beban: "Beban katalog tanpa cache",
    });
    expect(L.tabel).toEqual({ judul: "Titik acuan Rekaman lab t3-cache", kolom: ["Pengaturan", "Data lama di instance B", "Rekaman"], tidakAda: "tidak ada", ada: "{lama} detik" });
    expect(L.tanpaJs).toBe("Tanpa JavaScript widget tidak bisa dijalankan. Tabel ini memuat pengaturan yang punya rekaman.");
  });
  it("pilihan tebakan: teks dan detik", () => {
    expect(L.pilihan.map((p) => [p.teks, p.detik])).toEqual([
      ["Sekitar detik ke-{detik}, saat bacaan berikutnya.", 1],
      ["Sekitar detik ke-{detik}.", 60],
      ["Sekitar detik ke-{detik}.", 300],
      ["Tidak pernah.", null],
    ]);
  });
});
