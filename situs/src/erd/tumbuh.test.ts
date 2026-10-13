// Tes logika widget ERD bertumbuh (I6-erd, keputusan 460–465) dengan ERD Tahap 1 sungguhan dan data uji Tahap 2.
import { describe, expect, it } from "vitest";
import t1 from "../../data/erd/tahap-1.json";
import petaT1 from "../../data/erd/halaman.json";
import t2 from "./uji/tahap-2.json";
import petaT2 from "./uji/halaman.json";
import { DataErd, PetaHalaman } from "./skema";
import {
  UKURAN, ambangKolom, bisaBanding, daftarFk, jumlahKolom, namaTombol, peringkat, ringkasan, tampilSebelum, tampilTahap, tata,
  tautanHalaman, teksAturan, teksKolom, teksPindah, barisPindah, tinggiNode, urutan, varPesan, type TabelTampil,
} from "./tumbuh";
import { muat, url } from "../../tools/registri.mjs";

const semua = [DataErd.parse(t1), DataErd.parse(t2)];
const nama = (xs: TabelTampil[]) => xs.map((t) => `${t.nama}:${t.status}`);

describe("status per tahap", () => {
  it("Tahap 1 tanpa pembanding: semua status null, tanpa bayangan", () => {
    const x = tampilTahap(semua, 1);
    expect(x.map((t) => t.status)).toEqual([null, null, null, null, null]);
    expect(x.every((t) => t.kolom.every((k) => k.status === null))).toBe(true);
  });
  it("Tahap 2: baru, berubah, tetap, dan tiga tabel dihapus di akhir dengan tujuan pindah", () => {
    const x = tampilTahap(semua, 2);
    expect(nama(x)).toEqual([
      "akun:berubah", "sesi:tetap", "buku:baru", "jurnal:baru", "posting:baru", "kunci_idempotensi:baru", "batch_pencairan:baru",
      "baris_pencairan:baru", "topup:dihapus", "transaksi:dihapus", "koreksi:dihapus",
    ]);
    expect(x.filter((t) => t.bayangan).map((t) => t.pindahKe)).toEqual(t2.selisih.tabel_dihapus.map((d) => d.pindah_ke));
  });
  it("kolom akun Tahap 2: baru ditandai, yang dihapus ikut tampil di akhir dari Tahap 1", () => {
    const akun = tampilTahap(semua, 2).find((t) => t.nama === "akun")!;
    expect(akun.kolom.map((k) => `${k.kolom.nama}:${k.status}`)).toEqual([
      "id:tetap", "peran:baru", "nama:tetap", "email:tetap", "password_hash:tetap", "wajib_ganti_password:baru", "gagal_login:baru",
      "terkunci_sampai:baru", "jenis:dihapus", "saldo:dihapus",
    ]);
    expect(akun.aturan.map(teksAturan)).toContain("CHECK batas_saldo_warung dihapus");
  });
  it("tabel yang hanya berubah aturannya tetap tercatat berubah", () => {
    const d2 = structuredClone(semua[1]);
    d2.selisih!.kolom_baru = d2.selisih!.kolom_baru.filter((x) => x.tabel !== "akun");
    d2.selisih!.kolom_dihapus = [];
    expect(tampilTahap([semua[0], d2], 2).find((t) => t.nama === "akun")!.status).toBe("berubah");
    d2.selisih!.aturan_berubah = [];
    expect(tampilTahap([semua[0], d2], 2).find((t) => t.nama === "akun")!.status).toBe("tetap");
  });
  it("kolom berubah membawa definisi sebelumnya", () => {
    const d2 = structuredClone(semua[1]);
    const sesi = d2.tabel.find((t) => t.nama === "sesi")!;
    const lama = sesi.kolom[2];
    sesi.kolom[2] = { ...lama, wajib: false };
    d2.selisih!.kolom_berubah = [{ tabel: "sesi", kolom: lama.nama, sebelum: lama, sesudah: sesi.kolom[2] }];
    const k = tampilTahap([semua[0], d2], 2).find((t) => t.nama === "sesi")!.kolom[2];
    expect(k.status).toBe("berubah");
    expect(teksKolom(k)).toBe("timestamptz, boleh kosong, berubah dari timestamptz");
  });
  it("sisi kiri bandingkan: Tahap 1 dengan tabel dan kolom yang dihapus di Tahap 2", () => {
    const x = tampilSebelum(semua, 2);
    expect(nama(x)).toEqual(["akun:null", "sesi:null", "topup:dihapus", "transaksi:dihapus", "koreksi:dihapus"]);
    expect(x[0].kolom.filter((k) => k.status === "dihapus").map((k) => k.kolom.nama)).toEqual(["jenis", "saldo"]);
    expect(() => tampilSebelum(semua, 1)).toThrow(/tidak punya tahap sebelumnya/);
    expect([bisaBanding(semua, 1), bisaBanding(semua, 2), bisaBanding([semua[1]], 2)]).toEqual([false, true, false]);
  });
  it("tahap yang dirujuk selisih harus ada", () => {
    expect(() => tampilTahap([semua[1]], 2)).toThrow(/Tahap 1 tidak ada/);
  });
});

describe("tata letak", () => {
  const x1 = tampilTahap(semua, 1);
  const x2 = tampilTahap(semua, 2);
  it("peringkat: tabel yang dirujuk di atas; FK ke diri sendiri tidak dihitung", () => {
    expect(Object.fromEntries(peringkat(x2))).toEqual({ akun: 0, sesi: 1, buku: 1, jurnal: 1, posting: 2, kunci_idempotensi: 2, batch_pencairan: 0, baris_pencairan: 2 });
    expect(urutan(x1).map((g) => g.map((t) => t.nama))).toEqual([["akun"], ["sesi", "topup", "transaksi", "koreksi"]]);
  });
  it("siklus antartabel melempar error", () => {
    const d = structuredClone(semua[0]);
    d.tabel[0].fk = [{ nama: "akun_balik", kolom: ["id"], ke_tabel: "sesi", ke_kolom: ["akun_id"], saat_hapus: "NO ACTION" }];
    expect(() => peringkat(tampilTahap([d], 1))).toThrow(/siklus/);
  });
  it("edge: satu per foreign key ke tabel yang tampil; bayangan tanpa edge", () => {
    expect(daftarFk(x1)).toHaveLength(7);
    expect(daftarFk(x2)).toHaveLength(11);
    expect(daftarFk(x2).some((f) => ["topup", "transaksi", "koreksi"].includes(f.dari))).toBe(false);
  });
  it("jumlah kolom grid mengikuti lebar wadah, ambang tepat", () => {
    expect([343, ambangKolom(2) - 1, ambangKolom(2), ambangKolom(3), 1024].map(jumlahKolom)).toEqual([1, 1, 2, 3, 3]);
  });
  it("HP 343 px: satu kolom, node dan lajur muat tanpa diperkecil, setiap edge di lajurnya sendiri", () => {
    for (const x of [x1, x2]) {
      const t = tata(x, 343);
      expect(t.bentuk).toBe("sempit");
      expect(t.lebar).toBeLessThanOrEqual(343);
      expect(new Set(t.edge.map((e) => e.offset)).size).toBe(t.edge.length);
      t.node.forEach((n, i) => i && expect(n.y).toBeGreaterThan(t.node[i - 1].y + t.node[i - 1].tinggi));
    }
  });
  it("desktop: node tidak bertumpuk, tabel yang dirujuk di baris lebih atas", () => {
    const t = tata(x2, 980);
    expect(t.bentuk).toBe("lebar");
    expect(t.lebar).toBeLessThanOrEqual(980);
    const p = new Map(t.node.map((n) => [n.nama, n]));
    for (const a of t.node)
      for (const b of t.node)
        if (a !== b) expect(a.x + a.lebar <= b.x || b.x + b.lebar <= a.x || a.y + a.tinggi <= b.y || b.y + b.tinggi <= a.y).toBe(true);
    for (const e of t.edge) if (e.dari !== e.ke) expect(p.get(e.ke)!.y).toBeLessThan(p.get(e.dari)!.y);
    expect(t.edge.find((e) => e.dari === "jurnal" && e.ke === "jurnal")!.sumber).toBe("kanan-keluar");
  });
  it("edge yang melompati baris dibelokkan lewat sisi: tidak ada ruas yang memotong node lain, semua titik di dalam tata", () => {
    for (const x of [x1, x2])
      for (const k of [2, 3]) {
        const t = tata(x, ambangKolom(k));
        expect(t.lebar).toBeLessThanOrEqual(ambangKolom(k));
        const jalur = t.edge.filter((e) => e.jenis === "jalur");
        if (x === x2) expect(jalur.length).toBeGreaterThan(0);
        for (const e of jalur) {
          for (const [px, py] of e.titik) expect(px >= 0 && px <= t.lebar && py >= 0 && py <= t.tinggi).toBe(true);
          for (let i = 1; i < e.titik.length; i++) {
            const [[x0, y0], [x1_, y1]] = [e.titik[i - 1], e.titik[i]];
            for (const n of t.node) {
              if (n.nama === e.dari || n.nama === e.ke) continue;
              const potong = Math.max(x0, x1_) > n.x && Math.min(x0, x1_) < n.x + n.lebar && Math.max(y0, y1) > n.y && Math.min(y0, y1) < n.y + n.tinggi;
              expect(potong, `${e.id} memotong ${n.nama}`).toBe(false);
            }
          }
        }
      }
  });
  it("tinggi node: kepala + baris kolom; bayangan sebanyak baris teks pindahnya", () => {
    expect(tinggiNode(x2[0])).toBe(UKURAN.kepala + 10 * UKURAN.baris + UKURAN.bawah);
    // topup: kalimat terpanjang (86 huruf) dapat 5 baris, tidak terpotong di node tersempit (keputusan 466).
    const topup = x2.find((t) => t.nama === "topup" && t.bayangan)!;
    expect(teksPindah(topup).length).toBe(86);
    expect(barisPindah(topup)).toBe(5);
    expect(tinggiNode(topup)).toBe(UKURAN.kepala + 5 * UKURAN.baris + UKURAN.bawah);
    expect(barisPindah({ ...topup, pindahKe: "a" })).toBe(2);
  });
  it("tinggi pesanan SSR sama dengan tinggi tata di setiap jumlah kolom", () => {
    for (const x of [x1, x2]) {
      const v = varPesan(x);
      let h = parseFloat(v["--erd-t1"]);
      expect(h).toBe(tata(x, 343).tinggi);
      for (let k = 2; k <= UKURAN.maksKolom; k++) {
        h += Number(v[`--erd-d${k}`]);
        expect(h).toBe(tata(x, ambangKolom(k) + 10).tinggi);
      }
    }
  });
});

describe("teks", () => {
  it("label kunci berupa teks di kolom", () => {
    const akun = tampilTahap(semua, 1)[0];
    expect(teksKolom(akun.kolom[0])).toBe("bigint, PK");
    const sesi = tampilTahap(semua, 1)[1];
    expect(teksKolom(sesi.kolom[1])).toBe("bigint, FK → akun.id");
  });
  it("nama tombol dan ringkasan menyebut status sebagai teks", () => {
    const x2 = tampilTahap(semua, 2);
    expect(namaTombol(x2[0])).toBe("Tabel akun, berubah, 10 kolom");
    expect(namaTombol(x2.at(-1)!)).toBe("Tabel koreksi, dihapus, isinya pindah ke jurnal jenis pembalik yang menunjuk jurnal asal");
    expect(ringkasan(x2)).toBe("8 tabel, 11 foreign key (6 baru, 1 berubah, 1 tetap, 3 dihapus).");
    expect(ringkasan(tampilTahap(semua, 1))).toBe("5 tabel, 7 foreign key.");
  });
});

describe("tautan halaman dari registry", () => {
  const reg = muat();
  const peta = PetaHalaman.parse({ format: 1, tahap: { ...petaT1.tahap, ...petaT2.tahap } });
  const hasil = tautanHalaman(peta, semua, reg.halaman, url);
  it("setiap tabel Tahap 1 punya minimal satu halaman yang bisa dibuka", () => {
    for (const t of semua[0].tabel) expect(hasil["1"][t.nama]?.some((x) => x.href)).toBe(true);
    expect(hasil["1"].akun[0]).toEqual({ label: "1.12 Data modeling dan relasi", href: "/tahap-1/data-modeling/", catatan: null });
  });
  it("halaman yang belum ditulis tanpa tautan", () => {
    expect(hasil["2"].buku[0]).toMatchObject({ href: null, catatan: "segera" });
    expect(hasil["2"].kunci_idempotensi[0].catatan).toBe("versi lama");
  });
  it("ID atau tabel yang tidak dikenal menggagalkan build", () => {
    expect(() => tautanHalaman({ format: 1, tahap: { "1": { akun: ["tidak-ada"] } } }, semua, reg.halaman, url)).toThrow(/tidak ada di registry/);
    expect(() => tautanHalaman({ format: 1, tahap: { "1": { jurnal: ["B2.1"] } } }, semua, reg.halaman, url)).toThrow(/tidak ada di Tahap 1/);
  });
});
