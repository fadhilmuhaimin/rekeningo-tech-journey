// Tes logika widget ERD bertumbuh (I6-erd, keputusan 460–465) dengan ERD Tahap 1 sungguhan dan data uji Tahap 2.
// Data uji tetap dipakai sesudah ERD2 karena punya kasus yang tidak ada di lab (kolom berganti nama = dihapus + baru);
// bagian ERD2 menguji Tahap 2 sungguhan dari api-t2 (keputusan 470–472), bagian ERD3 Tahap 3 dari api-t3 (keputusan 963–964).
import { describe, expect, it } from "vitest";
import t1 from "../../data/erd/tahap-1.json";
import petaT1 from "../../data/erd/halaman.json";
import t2 from "./uji/tahap-2.json";
import t2Lab from "../../data/erd/tahap-2.json";
import t3Lab from "../../data/erd/tahap-3.json";
import petaT2 from "./uji/halaman.json";
import { DataErd, PetaHalaman, type Tabel } from "./skema";
import {
  UKURAN, ambangKolom, bagiLajur, bisaBanding, daftarFk, jumlahKolom, namaTombol, peringkat, ringkasan, tampilSebelum, tampilTahap, tata,
  tandaiHalamanIni, tautanHalaman, teksAturan, teksKolom, teksPindah, barisPindah, tinggiNode, urutan, varPesan, type HalamanRegistry, type TabelTampil,
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
    // Sejak 2.26 (t2-job-rekonsiliasi) ditulis, tidak ada lagi halaman "segera" di peta. Uji ini memakai salinan
    // registry yang menandai halaman itu belum ada, supaya tidak bergantung pada urutan penulisan halaman.
    const belumAda = tautanHalaman(peta, semua, reg.halaman.map((h: HalamanRegistry) => (h.id === "t2-job-rekonsiliasi" ? { ...h, ada: false } : h)), url);
    expect(belumAda["2"].batch_pencairan.find((x) => x.href === null)).toMatchObject({ href: null, catatan: "segera" });
    expect(hasil["2"].kunci_idempotensi[0].catatan).toBe("versi lama");
  });
  it("ID atau tabel yang tidak dikenal menggagalkan build", () => {
    expect(() => tautanHalaman({ format: 1, tahap: { "1": { akun: ["tidak-ada"] } } }, semua, reg.halaman, url)).toThrow(/tidak ada di registry/);
    expect(() => tautanHalaman({ format: 1, tahap: { "1": { jurnal: ["B2.1"] } } }, semua, reg.halaman, url)).toThrow(/tidak ada di Tahap 1/);
  });
});

describe("ERD Tahap 2 dari lab api-t2 (ERD2)", () => {
  const lab = [DataErd.parse(t1), DataErd.parse(t2Lab)];
  const x = tampilTahap(lab, 2);
  it("status: enam tabel baru, akun berubah, sesi tetap, tiga tabel v1 dihapus dengan tujuan pindah", () => {
    expect(nama(x)).toEqual([
      "akun:berubah", "sesi:tetap", "buku:baru", "jurnal:baru", "posting:baru", "kunci_idempotensi:baru", "batch_pencairan:baru",
      "baris_pencairan:baru", "topup:dihapus", "transaksi:dihapus", "koreksi:dihapus",
    ]);
    expect(x.filter((t) => t.bayangan).every((t) => t.pindahKe!.length > 20)).toBe(true);
    expect(ringkasan(x)).toBe("8 tabel, 11 foreign key (6 baru, 1 berubah, 1 tetap, 3 dihapus).");
  });
  it("akun: saldo dihapus, nomor karyawan dan kolom login baru, batas saldo warung pindah dari CHECK akun", () => {
    const akun = x.find((t) => t.nama === "akun")!;
    expect(akun.kolom.filter((k) => k.status !== "tetap").map((k) => `${k.kolom.nama}:${k.status}`)).toEqual([
      "nomor_karyawan:baru", "wajib_ganti_password:baru", "gagal_login:baru", "terkunci_sampai:baru", "saldo:dihapus",
    ]);
    expect(akun.aturan.map(teksAturan)).toContain("CHECK batas_saldo_warung dihapus");
  });
  it("setiap tabel Tahap 2 punya halaman penjelas di peta (situs/data/erd/halaman.json)", () => {
    const hasil = tautanHalaman(PetaHalaman.parse(petaT1), lab, muat().halaman, url);
    for (const t of lab[1].tabel) expect(hasil["2"][t.nama]?.length, t.nama).toBeGreaterThan(0);
  });
});

describe("ERD Tahap 3 dari lab api-t3 (ERD3)", () => {
  const lab3 = [DataErd.parse(t1), DataErd.parse(t2Lab), DataErd.parse(t3Lab)];
  const x = tampilTahap(lab3, 3);
  const BARU = ["kota", "perangkat", "outbox", "produk", "promo", "operasi_sinkron"];
  it("status: enam tabel baru, akun dan sesi berubah, enam tabel Tahap 2 tetap, tidak ada yang dihapus", () => {
    expect(nama(x)).toEqual([
      "akun:berubah", "sesi:berubah", "buku:tetap", "jurnal:tetap", "posting:tetap", "kunci_idempotensi:tetap", "batch_pencairan:tetap",
      "baris_pencairan:tetap", "kota:baru", "perangkat:baru", "outbox:baru", "produk:baru", "promo:baru", "operasi_sinkron:baru",
    ]);
    expect(x.filter((t) => t.status === "baru").map((t) => t.nama)).toEqual(BARU);
    expect(x.some((t) => t.bayangan)).toBe(false);
    expect(ringkasan(x)).toBe("14 tabel, 20 foreign key (6 baru, 2 berubah, 6 tetap).");
  });
  it("akun mendapat kota_id dan jenis hr; sesi mendapat jenis dan csrf_hash (kolom baru di akhir, aturan berubah)", () => {
    const akun = x.find((t) => t.nama === "akun")!;
    expect(akun.kolom.filter((k) => k.status !== "tetap").map((k) => `${k.kolom.nama}:${k.status}`)).toEqual(["kota_id:baru"]);
    expect(akun.aturan.map(teksAturan)).toEqual(["FK akun_kota_id_fkey baru", "CHECK akun_jenis_check berubah", "INDEX akun_kota baru"]);
    expect(akun.tabel.cek.find((c) => c.nama === "akun_jenis_check")!.ekspresi).toContain("'hr'");
    const sesi = x.find((t) => t.nama === "sesi")!;
    expect(sesi.kolom.filter((k) => k.status !== "tetap").map((k) => `${k.kolom.nama}:${k.status}`)).toEqual(["jenis:baru", "csrf_hash:baru"]);
    expect(sesi.aturan.map(teksAturan)).toEqual(["CHECK sesi_csrf_hanya_web baru", "CHECK sesi_jenis_check baru"]);
  });
  it("kolom outbox menurut lab: uuid stabil, kelas 0 sampai 2, klaim_sampai boleh kosong, satu per jurnal per penerima", () => {
    const outbox = x.find((t) => t.nama === "outbox")!;
    expect(teksKolom(outbox.kolom.find((k) => k.kolom.nama === "notifikasi_id")!)).toBe("uuid, UNIQUE, baru");
    expect(teksKolom(outbox.kolom.find((k) => k.kolom.nama === "klaim_sampai")!)).toBe("timestamptz, boleh kosong, baru");
    expect(teksKolom(outbox.kolom.find((k) => k.kolom.nama === "jurnal_id")!)).toBe("bigint, FK → jurnal.id, CHECK, boleh kosong, baru");
    expect(outbox.tabel.index.map((i) => `${i.nama}:${i.unik}`)).toEqual(["outbox_antre:false", "outbox_satu_per_jurnal:true"]);
  });
  it("sisi kiri bandingkan: Tahap 2 utuh, tanpa tabel atau kolom yang dihapus", () => {
    const kiri = tampilSebelum(lab3, 3);
    expect(nama(kiri)).toEqual(tampilTahap(lab3, 2).filter((t) => !t.bayangan).map((t) => `${t.nama}:null`));
    expect(kiri.every((t) => t.kolom.every((k) => k.status === null))).toBe(true);
    expect([bisaBanding(lab3, 2), bisaBanding(lab3, 3), bisaBanding([lab3[0], lab3[2]], 3)]).toEqual([true, true, false]);
    expect(() => tampilTahap([lab3[0], lab3[2]], 3)).toThrow(/Tahap 2 tidak ada/);
  });
  it("penjaga selisih: menghapus satu tabel baru dari selisih mengubah statusnya, dan kolom baru tanpa tabelnya tidak lolos", () => {
    const d3 = structuredClone(lab3[2]);
    d3.selisih!.tabel_baru = d3.selisih!.tabel_baru.filter((n) => n !== "outbox");
    expect(nama(tampilTahap([lab3[0], lab3[1], d3], 3))).toContain("outbox:tetap");
    expect(ringkasan(tampilTahap([lab3[0], lab3[1], d3], 3))).toBe("14 tabel, 20 foreign key (5 baru, 2 berubah, 7 tetap).");
    const d4 = structuredClone(lab3[2]);
    d4.selisih!.kolom_dihapus = [{ tabel: "sesi", kolom: "tidak_ada" }];
    expect(() => tampilTahap([lab3[0], lab3[1], d4], 3)).toThrow(/tidak ada di Tahap 2/);
  });
  it("peringkat: outbox di bawah jurnal dan akun, kota di atas promo dan akun", () => {
    const r = Object.fromEntries(peringkat(x));
    expect(r.kota).toBe(0);
    expect(r.akun).toBe(1); // akun.kota_id -> kota
    expect(r.promo).toBeGreaterThan(r.akun);
    expect(r.outbox).toBeGreaterThan(r.jurnal);
    expect(r.operasi_sinkron).toBeGreaterThan(Math.max(r.perangkat, r.produk));
    expect(daftarFk(x)).toHaveLength(20);
  });
  it("tata di 343, 2, 3 dan 4 kolom: node tidak bertumpuk, edge yang melompati baris tidak memotong node, tabel yang dirujuk di atas", () => {
    for (const lebar of [343, ambangKolom(2), ambangKolom(3), ambangKolom(4)]) {
      const t = tata(x, lebar);
      expect(t.bentuk).toBe(lebar === 343 ? "sempit" : "lebar");
      // 20 foreign key tidak muat di ruang sisi bawaan: tata lebar boleh lebih lebar dari wadah (zoom < 1), tetapi di
      // layar 375 px (wadah 343) tata satu kolom muat tanpa diperkecil, dan di dua kolom (sisi 497 px di 1366) zoom ≥ 0,79.
      if (lebar === 343) expect(t.lebar).toBeLessThanOrEqual(343);
      if (lebar === ambangKolom(2)) expect(497 / t.lebar).toBeGreaterThanOrEqual(0.79);
      expect(t.node).toHaveLength(14);
      for (const a of t.node)
        for (const b of t.node)
          if (a !== b) expect(a.x + a.lebar <= b.x || b.x + b.lebar <= a.x || a.y + a.tinggi <= b.y || b.y + b.tinggi <= a.y, `${a.nama}/${b.nama} @${lebar}`).toBe(true);
      expect(new Set(t.edge.map((e) => e.id)).size).toBe(20);
      const p = new Map(t.node.map((n) => [n.nama, n]));
      for (const e of t.edge) {
        if (e.dari !== e.ke) expect(p.get(e.ke)!.y, e.id).toBeLessThan(p.get(e.dari)!.y);
        for (let i = 1; i < e.titik.length; i++) {
          const [[x0, y0], [x1, y1]] = [e.titik[i - 1], e.titik[i]];
          for (const [px, py] of [e.titik[i]]) expect(px >= 0 && px <= t.lebar && py >= 0 && py <= t.tinggi, `${e.id} di luar tata`).toBe(true);
          for (const n of t.node) {
            if (n.nama === e.dari || n.nama === e.ke) continue;
            const potong = Math.max(x0, x1) > n.x && Math.min(x0, x1) < n.x + n.lebar && Math.max(y0, y1) > n.y && Math.min(y0, y1) < n.y + n.tinggi;
            expect(potong, `${e.id} memotong ${n.nama} @${lebar}`).toBe(false);
          }
        }
      }
    }
  });
  it("HP: garis berbagi lajur hanya bila rentang tegaknya terpisah; Tahap 1 dan 2 yang muat tetap satu lajur per garis", () => {
    // Celah dikunci ke angka tulis tangan: kalau hanya memakai UKURAN.celahLajur, mengubahnya jadi 0 tetap lolos. 10 px = dua
    // garis di lajur yang sama masih terbaca terputus, bukan satu garis panjang (borderRadius 6 di ErdTumbuh.tsx membulatkan ujungnya).
    expect(UKURAN.celahLajur).toBeGreaterThanOrEqual(10);
    for (const lebar of [288, 343]) {
      const t = tata(x, lebar);
      const y = new Map(t.node.map((n) => [n.nama, n.y]));
      const rentang = t.edge.map((e) => [Math.min(y.get(e.dari)! + UKURAN.keluarY, y.get(e.ke)! + UKURAN.masukY), Math.max(y.get(e.dari)! + UKURAN.keluarY, y.get(e.ke)! + UKURAN.masukY)]);
      expect(new Set(t.edge.map((e) => e.offset)).size, `lajur @${lebar}`).toBeLessThan(20);
      for (let i = 0; i < t.edge.length; i++)
        for (let j = i + 1; j < t.edge.length; j++)
          if (t.edge[i].offset === t.edge[j].offset)
            expect(rentang[i][1] + UKURAN.celahLajur < rentang[j][0] || rentang[j][1] + UKURAN.celahLajur < rentang[i][0], `${t.edge[i].id} dan ${t.edge[j].id} berbagi lajur ${t.edge[i].offset} tetapi tumpang-tindih`).toBe(true);
    }
    for (const d of [lab3[0], lab3[1]]) {
      const t = tata(tampilTahap(lab3, d.tahap), 343);
      expect(new Set(t.edge.map((e) => e.offset)).size).toBe(t.edge.length);
    }
    // Tahap 2 tidak muat di wadah 288 px (layar 320) bila satu garis satu lajur (310 px); dengan lajur dibagi muat.
    expect(tata(tampilTahap(lab3, 2), 288).lebar).toBeLessThanOrEqual(288);
  });
  it("penjaga skema: kolom, tipe, boleh kosong, kunci, dan nama aturan tiap tabel sama dengan schema tahap3 lab api-t3", () => {
    // Diperiksa peninjau PR 344 terhadap schema yang dibangun buat_schema() lab api-t3 (query katalog sendiri, bukan erd.py).
    // Alasannya: `erd.py --cek` tidak punya database, jadi kolom, UNIQUE, CHECK, atau index yang dihapus tangan dari JSON
    // dengan format sah lolos gerbang (mutasi: 31 dari 166 lolos sebelum tes ini). Tes ini gagal bila JSON berubah dari lab;
    // bila lab berubah, bangun ulang JSON (tools/erd.py --tahap 3) lalu perbarui baris yang berbeda. Tidak memeriksa nilai
    // bawaan dan isi ekspresi CHECK; "?" = boleh kosong.
    const tanda = (t: Tabel) => {
      const tipe = (v: string) => v.replace("timestamp with time zone", "timestamptz").replace(/^integer$/, "int");
      const daftar = (xs: string[]) => (xs.length ? xs.join("; ") : "-");
      return [
        "kolom " + t.kolom.map((k) => `${k.nama} ${tipe(k.tipe)}${k.wajib ? "" : "?"}`).join(", "),
        "pk " + t.pk.join(","),
        "fk " + daftar(t.fk.map((f) => `${f.nama} (${f.kolom.join(",")})>${f.ke_tabel}(${f.ke_kolom.join(",")}) ${f.saat_hapus}`)),
        "unik " + daftar(t.unik.map((u) => `${u.nama} (${u.kolom.join(",")})`)),
        "cek " + (t.cek.length ? t.cek.map((c) => c.nama).join(", ") : "-"),
        "index " + (t.index.length ? t.index.map((i) => `${i.nama}${i.unik ? " UNIQUE" : ""}`).join(", ") : "-"),
      ].join(" | ");
    };
    const harap: Record<string, string> = {
    akun: "kolom id bigint, jenis text, nama text, email text, password_hash text, nomor_karyawan text?, wajib_ganti_password boolean, gagal_login int, terkunci_sampai timestamptz?, kota_id bigint? | pk id | fk akun_kota_id_fkey (kota_id)>kota(id) NO ACTION | unik akun_email_key (email); akun_nomor_karyawan_key (nomor_karyawan) | cek akun_gagal_login_check, akun_jenis_check, karyawan_bernomor | index akun_kota",
    sesi: "kolom token_hash text, akun_id bigint, kedaluwarsa timestamptz, jenis text, csrf_hash text? | pk token_hash | fk sesi_akun_id_fkey (akun_id)>akun(id) NO ACTION | unik - | cek sesi_csrf_hanya_web, sesi_jenis_check | index -",
    buku: "kolom id bigint, akun_id bigint?, jenis text, saldo_cache bigint, batas_saldo bigint?, batas_harian bigint?, versi int | pk id | fk buku_akun_id_fkey (akun_id)>akun(id) NO ACTION | unik buku_akun_id_jenis_key (akun_id,jenis) | cek buku_batas_harian_check, buku_batas_saldo_check, buku_jenis_check, buku_pemilik | index buku_sistem_satu_per_jenis UNIQUE",
    jurnal: "kolom id bigint, jenis text, keterangan text, membalik_jurnal_id bigint?, dibuat_oleh bigint, dibuat timestamptz | pk id | fk jurnal_dibuat_oleh_fkey (dibuat_oleh)>akun(id) NO ACTION; jurnal_membalik_jurnal_id_fkey (membalik_jurnal_id)>jurnal(id) NO ACTION | unik jurnal_membalik_jurnal_id_key (membalik_jurnal_id) | cek jurnal_jenis_check, pembalik_beralasan, pembalik_merujuk_asal | index -",
    posting: "kolom id bigint, jurnal_id bigint, buku_id bigint, jumlah bigint, dibuat timestamptz | pk id | fk posting_buku_id_fkey (buku_id)>buku(id) NO ACTION; posting_jurnal_id_fkey (jurnal_id)>jurnal(id) NO ACTION | unik - | cek posting_jumlah_check | index posting_buku, posting_jurnal, posting_riwayat",
    kunci_idempotensi: "kolom kunci text, akun_id bigint, hash_permintaan text, status text, respons jsonb?, jurnal_id bigint?, kedaluwarsa timestamptz | pk kunci | fk kunci_idempotensi_akun_id_fkey (akun_id)>akun(id) NO ACTION; kunci_idempotensi_jurnal_id_fkey (jurnal_id)>jurnal(id) NO ACTION | unik kunci_idempotensi_jurnal_id_key (jurnal_id) | cek kunci_idempotensi_status_check | index -",
    batch_pencairan: "kolom id bigint, periode text, status text, total bigint | pk id | fk - | unik batch_pencairan_periode_key (periode) | cek batch_pencairan_status_check, batch_pencairan_total_check | index -",
    baris_pencairan: "kolom batch_id bigint, buku_id bigint, jumlah bigint, jurnal_id bigint? | pk batch_id,buku_id | fk baris_pencairan_batch_id_fkey (batch_id)>batch_pencairan(id) NO ACTION; baris_pencairan_buku_id_fkey (buku_id)>buku(id) NO ACTION; baris_pencairan_jurnal_id_fkey (jurnal_id)>jurnal(id) NO ACTION | unik baris_pencairan_jurnal_id_key (jurnal_id) | cek baris_pencairan_jumlah_check | index -",
    kota: "kolom id bigint, nama text | pk id | fk - | unik kota_nama_key (nama) | cek - | index -",
    perangkat: "kolom id bigint, akun_id bigint, platform text, token_push text, aktif boolean, terakhir_terlihat timestamptz | pk id | fk perangkat_akun_id_fkey (akun_id)>akun(id) NO ACTION | unik perangkat_token_push_key (token_push) | cek perangkat_platform_check | index perangkat_akun",
    outbox: "kolom id bigint, notifikasi_id uuid, jurnal_id bigint?, akun_id bigint, kelas smallint, jenis text, payload jsonb, status text, percobaan int, coba_lagi timestamptz, klaim_sampai timestamptz?, dibuat timestamptz | pk id | fk outbox_akun_id_fkey (akun_id)>akun(id) NO ACTION; outbox_jurnal_id_fkey (jurnal_id)>jurnal(id) NO ACTION | unik outbox_notifikasi_id_key (notifikasi_id) | cek outbox_jenis_check, outbox_jurnal_atau_promo, outbox_kelas_check, outbox_percobaan_check, outbox_status_check | index outbox_antre, outbox_satu_per_jurnal UNIQUE",
    produk: "kolom id bigint, akun_id bigint, nama text, harga bigint, stok int, aktif boolean, versi int, diubah timestamptz | pk id | fk produk_akun_id_fkey (akun_id)>akun(id) NO ACTION | unik produk_akun_id_nama_key (akun_id,nama) | cek produk_harga_check, produk_nama_check, produk_stok_check | index -",
    promo: "kolom id bigint, kota_id bigint, dibuat_oleh bigint, judul text, potongan_persen int, mulai timestamptz, selesai timestamptz | pk id | fk promo_dibuat_oleh_fkey (dibuat_oleh)>akun(id) NO ACTION; promo_kota_id_fkey (kota_id)>kota(id) NO ACTION | unik - | cek promo_judul_check, promo_potongan_persen_check, promo_selesai_sesudah_mulai | index promo_kota_waktu",
    operasi_sinkron: "kolom kunci text, perangkat_id bigint, produk_id bigint, jenis text, nilai bigint, versi_dasar int, status text, dibuat_di_hp timestamptz, diterapkan timestamptz? | pk kunci | fk operasi_sinkron_perangkat_id_fkey (perangkat_id)>perangkat(id) NO ACTION; operasi_sinkron_produk_id_fkey (produk_id)>produk(id) NO ACTION | unik - | cek operasi_sinkron_jenis_check, operasi_sinkron_nilai_check, operasi_sinkron_status_check, operasi_sinkron_versi_dasar_check | index operasi_produk",
    };
    expect(lab3[2].tabel.map((t) => t.nama)).toEqual(Object.keys(harap));
    for (const t of lab3[2].tabel) expect(tanda(t), t.nama).toBe(harap[t.nama]);
  });
  it("bagiLajur: rentang terpisah satu lajur, yang tumpang-tindih atau terlalu dekat berpindah lajur", () => {
    const r = bagiLajur([{ id: "a", dari: 0, ke: 10 }, { id: "b", dari: 30, ke: 20 }, { id: "c", dari: 5, ke: 25 }, { id: "d", dari: 11, ke: 15 }], 2);
    // a dan b terpisah (lajur 0); c menimpa keduanya (lajur 1); d (11 sampai 15) terlalu dekat ke a (12 bukan < 11) dan di dalam c.
    expect(Object.fromEntries(r)).toEqual({ a: 0, b: 0, c: 1, d: 2 });
    expect(bagiLajur([{ id: "a", dari: 0, ke: 10 }, { id: "b", dari: 12, ke: 20 }], 2).get("b")).toBe(1); // jarak 2, bukan lebih dari 2
    expect(bagiLajur([{ id: "a", dari: 0, ke: 10 }, { id: "b", dari: 13, ke: 20 }], 2).get("b")).toBe(0);
    expect(bagiLajur([], 2).size).toBe(0);
  });
  it("tinggi pesanan SSR Tahap 3 sama dengan tinggi tata di setiap jumlah kolom", () => {
    const v = varPesan(x);
    let h = parseFloat(v["--erd-t1"]);
    expect(h).toBe(tata(x, 343).tinggi);
    for (let k = 2; k <= UKURAN.maksKolom; k++) {
      h += Number(v[`--erd-d${k}`]);
      expect(h).toBe(tata(x, ambangKolom(k) + 10).tinggi);
    }
  });
  it("setiap tabel Tahap 3 punya halaman penjelas di peta (situs/data/erd/halaman.json), tautan sesuai keadaan registry", () => {
    const peta = PetaHalaman.parse(petaT1);
    const reg = muat().halaman as HalamanRegistry[];
    // Salinan registry yang memaksa keadaan halaman Tahap 3, supaya uji tidak berubah saat halaman 3.x ditulis.
    const belum = tautanHalaman(peta, lab3, reg.map((h) => (h.id.startsWith("t3-") ? { ...h, ada: false } : h)), url)["3"];
    const sudah = tautanHalaman(peta, lab3, reg.map((h) => (h.id.startsWith("t3-") ? { ...h, ada: true, lama: false } : h)), url)["3"];
    for (const t of lab3[2].tabel) {
      expect(belum[t.nama]?.length, t.nama).toBeGreaterThan(0);
      expect(sudah[t.nama].length).toBe(belum[t.nama].length);
    }
    for (const n of BARU) expect(belum[n].some((h) => h.label.startsWith("3.")), n).toBe(true);
    expect(belum.outbox.filter((h) => h.catatan === "segera").map((h) => h.label.split(" ")[0])).toEqual(["3.4", "3.9", "3.11", "3.13"]);
    expect(belum.outbox.every((h) => h.href === null)).toBe(true);
    // Urutan dan alamat dari registry (url()), bukan dari daftar tulis tangan yang bisa ketinggalan saat nama berkas halaman berubah.
    const reg3 = reg.map((h) => (h.id.startsWith("t3-") ? { ...h, ada: true, lama: false } : h));
    expect(sudah.outbox.map((h) => h.href)).toEqual(["t3-dua-tempat", "t3-outbox", "t3-klaim-baris", "t3-at-least-once"].map((id) => url(reg3.find((h) => h.id === id)!)));
    expect(sudah.outbox.map((h) => h.href).every((h) => /^\/tahap-3\/[a-z0-9-]+\/$/.test(h ?? ""))).toBe(true);
    expect(sudah.outbox.every((h) => h.href && h.catatan === null)).toBe(true);
  });
});

describe("halaman yang sedang dibaca (ERD-1.12, keputusan 697)", () => {
  const semua = [DataErd.parse(t1)];
  const asli = tautanHalaman(PetaHalaman.parse(petaT1), semua, muat().halaman, url);
  it("tautan ke 1.12 di 1.12 jadi teks tanpa tautan, tautan lain tetap", () => {
    const hasil = tandaiHalamanIni(asli, "/tahap-1/data-modeling/");
    expect(hasil["1"].akun[0]).toEqual({ label: "1.12 Data modeling dan relasi", href: null, catatan: "halaman ini" });
    expect(hasil["1"].akun[1]).toEqual(asli["1"].akun[1]);
    expect(hasil["1"].akun[1].href).toBe("/tahap-1/fitur-login/");
    expect(hasil["1"].transaksi).toEqual(asli["1"].transaksi);
  });
  it("tidak mengubah data asli, dan path lain tidak menandai apa pun", () => {
    tandaiHalamanIni(asli, "/tahap-1/data-modeling/");
    expect(asli["1"].akun[0].href).toBe("/tahap-1/data-modeling/");
    expect(tandaiHalamanIni(asli, "/uji/erd/")).toEqual(asli);
  });
});
