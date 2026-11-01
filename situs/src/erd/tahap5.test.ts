// Tes ERD Tahap 5 dari lab api-t5 (ERD5, keputusan 1670-1672): 30 tabel, 19 foreign key, posting berpartisi sebagai satu
// tabel dengan catatan partisi, 18 foreign key lintas service yang dihapus layanan.sql, pembagian enam service, dan nama
// tabel yang membungkus. Angka diturunkan dari sumbernya (JSON dari katalog lab, rekaman lab labs/api-t5/output/skema.txt,
// tabel 'Service (schema)' naskah 3b), bukan diketik ulang; yang diketik (daftar tabel, tanda tiap tabel, hash) dicocokkan
// peninjau dengan katalog dan bila lab berubah dibangun ulang dengan `labs/.venv/bin/python tools/erd.py --tahap 5`.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import t1 from "../../data/erd/tahap-1.json";
import t2Lab from "../../data/erd/tahap-2.json";
import t3Lab from "../../data/erd/tahap-3.json";
import t4Lab from "../../data/erd/tahap-4.json";
import t5Lab from "../../data/erd/tahap-5.json";
import m4Lab from "../../data/erd/modul-tahap-4.json";
import s5Lab from "../../data/erd/service-tahap-5.json";
import petaHalaman from "../../data/erd/halaman.json";
import { DataErd, ModulErd, PetaHalaman, type Tabel } from "./skema";
import {
  UKURAN, ambangKolom, barisNama, berpartisi, daftarFk, duaBaris, duaKepala, fkDihapusLintas, lintasModul, modulTabel, namaTombol, periksaModul, ringkasModul, ringkasan,
  tampilSebelum, tampilTahap, tata, tautanHalaman, teksAturan, teksPartisi, tinggiKepala, tinggiNode, varPesan, type HalamanRegistry,
} from "./tumbuh";
import { muat, url } from "../../tools/registri.mjs";

const AKAR = fileURLToPath(new URL("../../../", import.meta.url));
const baca = (rel: string) => readFileSync(AKAR + rel, "utf-8");

describe("ERD Tahap 5 dari lab api-t5 (ERD5)", () => {
  const lab5 = [t1, t2Lab, t3Lab, t4Lab, t5Lab].map((d) => DataErd.parse(d));
  const [, , , lab4, d5] = lab5;
  const x = tampilTahap(lab5, 5);
  const modul = ModulErd.parse(s5Lab);
  const BARU = ["snapshot_saldo", "arsip_partisi", "ringkasan_merchant_harian", "jadwal_cicilan", "angsuran", "pengumuman", "mitra_pos", "sakelar"];
  const BERUBAH = ["akun", "buku", "jurnal", "kunci_idempotensi", "perangkat", "outbox", "produk", "promo", "operasi_sinkron", "topup_bank", "webhook_event", "insiden_rekon", "qr", "kartu", "otorisasi_kartu", "posting"];
  const TETAP = ["sesi", "batch_pencairan", "baris_pencairan", "kota", "verifikasi", "audit_log"];
  const tabel = (n: string) => d5.tabel.find((t) => t.nama === n)!;
  const hitung = <T,>(xs: T[], f: (a: T) => string) => Object.fromEntries([...new Set(xs.map(f))].sort().map((k) => [k, xs.filter((a) => f(a) === k).length]));

  it("status: delapan tabel baru, enam belas berubah (lima oleh kolom atau aturan, sebelas hanya kehilangan foreign key lintas), enam tetap", () => {
    expect(x.filter((t) => t.status === "baru").map((t) => t.nama)).toEqual(BARU);
    expect(x.filter((t) => t.status === "berubah").map((t) => t.nama)).toEqual(BERUBAH);
    expect(x.filter((t) => t.status === "tetap").map((t) => t.nama)).toEqual(TETAP);
    expect(x.some((t) => t.bayangan)).toBe(false);
    expect(ringkasan(x)).toBe("30 tabel, 19 foreign key (8 baru, 16 berubah, 6 tetap).");
    expect(d5.selisih!.tabel_dihapus).toEqual([]);
    // Lima tabel berubah karena kolom atau aturan selain foreign key; sisanya hanya karena foreign key lintas service dihapus.
    const bukanFk = new Set(d5.selisih!.aturan_berubah.filter((a) => a.jenis !== "fk").map((a) => a.tabel).concat(d5.selisih!.kolom_baru.map((k) => k.tabel)));
    expect([...bukanFk].sort()).toEqual(["akun", "buku", "jurnal", "outbox", "posting"]);
  });
  it("tabel yang disebut naskah berubah memang berubah: akun mitra_pos_id, jurnal referensi UNIK boleh kosong, nilai baru buku, jurnal, outbox", () => {
    expect(d5.selisih!.kolom_baru).toEqual([{ tabel: "akun", kolom: "mitra_pos_id" }, { tabel: "jurnal", kolom: "referensi" }]);
    expect(d5.selisih!.kolom_dihapus).toEqual([]);
    expect(d5.selisih!.kolom_berubah).toEqual([]);
    expect(tabel("akun").kolom.find((k) => k.nama === "mitra_pos_id")).toMatchObject({ tipe: "bigint", wajib: false });
    expect(tabel("jurnal").kolom.find((k) => k.nama === "referensi")).toMatchObject({ tipe: "text", wajib: false });
    expect(tabel("jurnal").unik).toContainEqual({ nama: "jurnal_referensi_key", kolom: ["referensi"] });
    const nilai = (t: string, c: string, v: string) => {
      const e = tabel(t).cek.find((k) => k.nama === c)!.ekspresi;
      return e.split(`'${v}'`).length - 1;
    };
    expect([nilai("buku", "buku_jenis_check", "tabungan"), nilai("buku", "buku_pemilik", "tabungan")]).toEqual([1, 1]);
    expect([nilai("jurnal", "jurnal_jenis_check", "angsuran"), nilai("jurnal", "jurnal_jenis_check", "tabungan")]).toEqual([1, 1]);
    expect([nilai("outbox", "outbox_tujuan_check", "stream"), nilai("outbox", "outbox_jenis_check", "pengumuman")]).toEqual([1, 1]);
    // Pembanding: Tahap 4 tidak punya nilai itu.
    const t4 = (t: string, c: string) => lab4.tabel.find((a) => a.nama === t)!.cek.find((k) => k.nama === c)!.ekspresi;
    expect(t4("buku", "buku_jenis_check")).not.toContain("tabungan");
    expect(t4("outbox", "outbox_tujuan_check")).not.toContain("stream");
  });
  it("posting: satu tabel dengan catatan partisi, PK (id, dibuat); partisi bukan tabel (30 tabel, bukan 34 relasi)", () => {
    const p = tabel("posting");
    expect(p.pk).toEqual(["id", "dibuat"]);
    expect(p.partisi).toEqual({ kunci: "RANGE (dibuat)", anak: ["posting_bulan_00", "posting_bulan_01", "posting_bulan_02", "posting_sebelum"] });
    expect(d5.tabel).toHaveLength(30);
    expect(d5.tabel.length + p.partisi!.anak.length).toBe(34);
    expect(d5.tabel.filter((t) => t.nama.startsWith("posting")).map((t) => t.nama)).toEqual(["posting"]);
    expect(d5.tabel.filter((t) => t.partisi).map((t) => t.nama)).toEqual(["posting"]);
    expect(lab5.slice(0, 4).every((d) => d.tabel.every((t) => !t.partisi))).toBe(true);
    const t = x.find((a) => a.nama === "posting")!;
    expect(x.filter(berpartisi).map((a) => a.nama)).toEqual(["posting"]);
    expect(berpartisi({ ...t, bayangan: true })).toBe(false); // tabel yang dihapus (bayangan) tidak membawa chip partisi
    expect(t.aturan.map(teksAturan)).toEqual(["PK berubah", "partisi baru"]); // nama FK dan CHECK yang bergeser (…_fkey1) bukan perubahan skema
    expect(p.fk.map((f) => f.nama)).toEqual(["posting_buku_id_fkey1", "posting_jurnal_id_fkey1"]);
    expect(p.cek.map((c) => c.nama)).toEqual(["posting_jumlah_check1"]);
    expect(teksPartisi(p)).toBe("dipartisi menurut RANGE (dibuat), 4 partisi (posting_bulan_00, posting_bulan_01, posting_bulan_02, posting_sebelum); partisi bukan tabel sendiri di diagram ini");
    expect(teksPartisi(tabel("akun"))).toBeNull();
    expect(namaTombol(t)).toBe("Tabel posting, berubah, 5 kolom, berpartisi");
    expect(namaTombol(x.find((a) => a.nama === "akun")!)).toBe("Tabel akun, berubah, 13 kolom");
  });
  it("kolom identity: id tiga tabel baru tercatat GENERATED ALWAYS AS IDENTITY, tidak ada tabel lain yang memilikinya", () => {
    const identity = lab5.flatMap((d) => d.tabel.flatMap((t) => t.kolom.filter((k) => k.bawaan?.includes("IDENTITY")).map((k) => `${d.tahap}:${t.nama}.${k.nama}=${k.bawaan}`)));
    expect(identity).toEqual(["jadwal_cicilan", "pengumuman", "mitra_pos"].map((n) => `5:${n}.id=GENERATED ALWAYS AS IDENTITY`));
    expect(tabel("posting").kolom.find((k) => k.nama === "id")!.bawaan).toBe("nextval('posting_id_seq'::regclass)");
  });
  it("nilai yang tidak diketik ulang: PK gabungan dan NO ACTION dari migration, versi PostgreSQL dari rekaman lab, tabel tetap sama dengan Tahap 4", () => {
    const m25 = baca("labs/api-t5/migrasi/000025_tabel_tahap5.up.sql");
    const m24 = baca("labs/api-t5/migrasi/000024_posting_partisi.up.sql");
    // PRIMARY KEY gabungan yang ditulis migration, per tabel (urutan kolom ikut teks migration).
    const dariSql = (sql: string) =>
      [...sql.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\n\)[^;]*;/g)].flatMap((m) => {
        const pk = m[2].match(/PRIMARY KEY \(([^)]+)\)/);
        return pk ? [[m[1], pk[1].split(",").map((c) => c.trim())]] : [];
      });
    const gabungan = [...dariSql(m24), ...dariSql(m25)];
    expect(gabungan.map((g) => g[0])).toEqual(["posting", "snapshot_saldo", "ringkasan_merchant_harian", "angsuran"]);
    for (const [nama, pk] of gabungan) expect(tabel(nama as string).pk, nama as string).toEqual(pk);
    // Migration Tahap 5 tidak menulis ON DELETE, jadi setiap foreign key NO ACTION; baris lab sama.
    for (const f of ["000024_posting_partisi", "000025_tabel_tahap5", "000026_nilai_baru_tahap5"]) expect(baca(`labs/api-t5/migrasi/${f}.up.sql`)).not.toMatch(/ON DELETE/i);
    expect(d5.tabel.flatMap((t) => t.fk.map((f) => f.saat_hapus))).toEqual(Array(19).fill("NO ACTION"));
    // Versi PostgreSQL di chip widget = versi di judul rekaman lab ("PostgreSQL 17.11 (Debian ...)").
    expect(baca("labs/api-t5/output/skema.txt")).toContain(`# PostgreSQL ${d5.postgres}.`);
    expect(lab5.map((d) => d.postgres)).toEqual([17, 17, 17, 17, 17]);
    // Tabel yang berstatus tetap tidak berubah dari Tahap 4: kolom (urutan juga), aturan, dan index sama persis.
    for (const t of x.filter((a) => a.status === "tetap")) expect(JSON.stringify(t.tabel), t.nama).toBe(JSON.stringify(lab4.tabel.find((a) => a.nama === t.nama)));
    // Tabel yang berubah hanya karena foreign key dihapus: semua kecuali foreign key sama dengan Tahap 4.
    const tanpaFk = (t: Tabel) => JSON.stringify({ ...t, fk: [] });
    const hanyaFk = BERUBAH.filter((n) => !["akun", "buku", "jurnal", "outbox", "posting"].includes(n));
    expect(hanyaFk).toHaveLength(11);
    for (const n of hanyaFk) expect(tanpaFk(tabel(n)), n).toBe(tanpaFk(lab4.tabel.find((a) => a.nama === n)!));
  });
  it("pembagian service: enam service 9 + 5 + 6 + 6 + 2 + 2 tabel, sama dengan tabel 'Service (schema)' naskah 3b dan dengan rekaman lab", () => {
    expect(modul.istilah).toBe("service");
    expect(modul.modul.map((m) => [m.nama, m.schema, m.tabel.length])).toEqual([
      ["ledger", "t5_ledger", 9], ["akun", "t5_akun", 5], ["pembayaran", "t5_pembayaran", 6], ["merchant", "t5_merchant", 6], ["notifikasi", "t5_notifikasi", 2], ["cicilan", "t5_cicilan", 2],
    ]);
    // Naskah: baris tabel di bawah "| Service (schema) | Tabel | Jumlah |".
    const naskah = baca("plan/CERITA-TAHAP-5.md").split("\n");
    const awal = naskah.findIndex((b) => b.startsWith("| Service (schema) | Tabel | Jumlah |"));
    expect(awal).toBeGreaterThan(0);
    const baris = naskah.slice(awal + 2).filter((b, i, a) => a.slice(0, i + 1).every((c) => c.startsWith("|")));
    const dariNaskah = baris.map((b) => {
      const [, nama, isi, jumlah] = b.split("|").map((s) => s.trim());
      return [nama.replaceAll("`", ""), isi.split(",").map((s) => s.trim().replaceAll("`", "")).sort(), Number(jumlah)];
    });
    expect(dariNaskah).toEqual(modul.modul.map((m) => [m.nama, [...m.tabel].sort(), m.tabel.length]));
    // Rekaman lab (bagian E): schema, jumlah, dan daftar tabel dari katalog PostgreSQL lab.
    const rekaman = baca("labs/api-t5/output/skema.txt").split("\n");
    const dariLab = rekaman.flatMap((b) => {
      const m = b.match(/^ (t5_[a-z]+)\s+\| (\d+)\s+\| (.+)$/);
      return m ? [[m[1], Number(m[2]), m[3].split(", ").sort()]] : [];
    });
    expect(dariLab).toHaveLength(6);
    expect(dariLab.sort((a, b) => String(a[0]).localeCompare(String(b[0])))).toEqual(modul.modul.map((m) => [m.schema, m.tabel.length, [...m.tabel].sort()]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
    expect(modul.modul.flatMap((m) => m.tabel).sort()).toEqual(d5.tabel.map((t) => t.nama).sort());
    expect(modulTabel(modul, "snapshot_saldo")).toBe("ledger");
    expect(modulTabel(modul, "sakelar")).toBe("pembayaran");
  });
  it("18 foreign key Tahap 4 dihapus karena menyeberang batas service, 19 tersisa di dalam satu service; angka 21 Tahap 4 memakai pembagian modul yang lain", () => {
    const hapus = fkDihapusLintas(lab5, 5, modul);
    expect(hapus).toHaveLength(18);
    expect(hitung(hapus, (a) => a.ke_modul)).toEqual({ akun: 11, ledger: 6, notifikasi: 1 });
    expect(hitung(hapus, (a) => a.ke_tabel)).toEqual({ akun: 10, jurnal: 6, kota: 1, perangkat: 1 });
    expect(hitung(hapus, (a) => a.dari_modul)).toEqual({ ledger: 4, merchant: 6, notifikasi: 1, pembayaran: 7 });
    expect(hitung(hapus, (a) => a.tabel)).toMatchObject({ otorisasi_kartu: 2, promo: 2, topup_bank: 2 });
    expect(lintasModul(d5, modul)).toEqual([]);
    expect(modul.lintas).toEqual([]);
    expect(daftarFk(x)).toHaveLength(19);
    expect(d5.tabel.every((t) => t.fk.every((f) => modulTabel(modul, t.nama) === modulTabel(modul, f.ke_tabel)))).toBe(true);
    // Hitungan: 35 foreign key Tahap 4, 18 dihapus, 2 baru di tabel baru (snapshot_saldo ke buku, angsuran ke jadwal_cicilan).
    const fk = (d: DataErd) => d.tabel.reduce((n, t) => n + t.fk.length, 0);
    const baruDiTabelBaru = d5.tabel.filter((t) => BARU.includes(t.nama)).flatMap((t) => t.fk.map((f) => `${t.nama}>${f.ke_tabel}`));
    expect(baruDiTabelBaru).toEqual(["snapshot_saldo>buku", "angsuran>jadwal_cicilan"]);
    expect([fk(lab4), fk(d5)]).toEqual([35, 35 - 18 + 2]);
    // Rekaman lab: 18 sebelum dihapus, 19 di dalam schema sesudahnya (bagian E).
    const rekaman = baca("labs/api-t5/output/skema.txt");
    expect(rekaman).toContain("# foreign key lintas schema service SEBELUM dihapus, dibaca dari katalog PostgreSQL: 18\n");
    const sesudah = rekaman.split("\n");
    const i = sesudah.findIndex((b) => b.trim() === "fk_di_dalam_schema");
    expect(i).toBeGreaterThan(0);
    expect(Number(sesudah[i + 2].trim())).toBe(19);
    // Tahap 4: 21 menyeberang enam modul t4-modul; pembagian berbeda dari enam service, jadi angkanya tidak sama dan bukan "21 dihapus".
    expect(ModulErd.parse(m4Lab).lintas).toHaveLength(21);
    expect(new Set(hapus.map((a) => a.fk)).size).toBe(18);
    expect(ringkasModul(modul, hapus.length, 4)).toBe("6 service, 30 tabel; 0 foreign key menyeberang batas service. Dari Tahap 4, 18 foreign key dihapus karena menyeberang batas service.");
    expect(ringkasModul(modul)).toBe("6 service, 30 tabel; 0 foreign key menyeberang batas service.");
    expect(ringkasModul(ModulErd.parse(m4Lab))).toBe("6 modul, 22 tabel; 21 foreign key menyeberang batas modul (14 ke modul akun, 7 ke modul ledger).");
  });
  it("kolom tabel baru sama dengan rekaman lab (bagian B skema.txt) dan partisi sama dengan katalog lab (bagian C)", () => {
    const rekaman = baca("labs/api-t5/output/skema.txt").split("\n");
    const baris = rekaman.flatMap((b) => {
      const m = b.match(/^([a-z_]+) \| (.+) \| ya$/);
      return m ? [[m[1], m[2]]] : [];
    });
    expect(baris.map((b) => b[0])).toEqual([...BARU, "posting", "akun", "jurnal"]);
    for (const n of BARU) expect(baris.find((b) => b[0] === n)![1], n).toBe(tabel(n).kolom.map((k) => k.nama).join(", "));
    expect(baris.find((b) => b[0] === "posting")![1]).toBe(tabel("posting").kolom.map((k) => k.nama).join(", "));
    expect(baris.find((b) => b[0] === "akun")![1]).toBe("kolom baru mitra_pos_id");
    expect(baris.find((b) => b[0] === "jurnal")![1]).toBe("kolom baru referensi");
    const anak = rekaman.flatMap((b) => {
      const m = b.match(/^ (posting_[a-z_0-9]+)\s+\| FOR VALUES/);
      return m ? [m[1]] : [];
    });
    expect(anak.sort()).toEqual(tabel("posting").partisi!.anak);
    expect(rekaman.some((b) => /^ RANGE \(dibuat\)\s+\| PRIMARY KEY \(id, dibuat\)$/.test(b))).toBe(true);
  });
  it("penjaga skema: kolom, tipe, boleh kosong, kunci, dan nama aturan tiap tabel sama dengan schema akhir lab api-t5", () => {
    // Pola ERD3 dan ERD4: `erd.py --cek` tidak punya database, jadi kolom, UNIQUE, CHECK, atau index yang diubah tangan dari JSON
    // dengan format sah lolos gerbang. Baris di bawah dibangkitkan dari katalog PostgreSQL 17 lab (labs/.venv/bin/python
    // tools/erd.py --tahap 5) dan dicocokkan peninjau; `hash` menutup yang tidak ada di baris: tipe lengkap, nilai bawaan,
    // ekspresi CHECK, definisi index, saat hapus, dan catatan partisi.
    const tipe = (v: string) => v.replace("timestamp with time zone", "timestamptz").replace(/^integer$/, "int");
    const daftar = (xs: string[]) => (xs.length ? xs.join("; ") : "-");
    const tanda = (t: Tabel) =>
      [
        "kolom " + t.kolom.map((k) => `${k.nama} ${tipe(k.tipe)}${k.wajib ? "" : "?"}`).join(", "),
        "pk " + t.pk.join(","),
        "fk " + daftar(t.fk.map((f) => `${f.nama} (${f.kolom.join(",")})>${f.ke_tabel}(${f.ke_kolom.join(",")}) ${f.saat_hapus}`)),
        "unik " + daftar(t.unik.map((u) => `${u.nama} (${u.kolom.join(",")})`)),
        "cek " + (t.cek.length ? t.cek.map((c) => c.nama).join(", ") : "-"),
        "index " + (t.index.length ? t.index.map((i) => `${i.nama}${i.unik ? " UNIQUE" : ""}`).join(", ") : "-"),
      ].join(" | ");
    const harap: Record<string, string> = {
    akun: "kolom id bigint, jenis text, nama text, email text, password_hash text, nomor_karyawan text?, wajib_ganti_password boolean, gagal_login int, terkunci_sampai timestamptz?, kota_id bigint?, tingkat text, status text, mitra_pos_id bigint? | pk id | fk akun_kota_id_fkey (kota_id)>kota(id) NO ACTION | unik akun_email_key (email); akun_nomor_karyawan_key (nomor_karyawan) | cek akun_gagal_login_check, akun_jenis_check, akun_status_check, akun_tingkat_check, karyawan_bernomor | index akun_kota",
    sesi: "kolom token_hash text, akun_id bigint, kedaluwarsa timestamptz, jenis text, csrf_hash text? | pk token_hash | fk sesi_akun_id_fkey (akun_id)>akun(id) NO ACTION | unik - | cek sesi_csrf_hanya_web, sesi_jenis_check | index -",
    buku: "kolom id bigint, akun_id bigint?, jenis text, saldo_cache bigint, batas_saldo bigint?, batas_harian bigint?, versi int | pk id | fk - | unik buku_akun_id_jenis_key (akun_id,jenis) | cek buku_batas_harian_check, buku_batas_saldo_check, buku_jenis_check, buku_pemilik | index buku_sistem_satu_per_jenis UNIQUE",
    jurnal: "kolom id bigint, jenis text, keterangan text, membalik_jurnal_id bigint?, dibuat_oleh bigint, dibuat timestamptz, referensi text? | pk id | fk jurnal_membalik_jurnal_id_fkey (membalik_jurnal_id)>jurnal(id) NO ACTION | unik jurnal_membalik_jurnal_id_key (membalik_jurnal_id); jurnal_referensi_key (referensi) | cek jurnal_jenis_check, pembalik_beralasan, pembalik_merujuk_asal, referensi_bentuk | index -",
    kunci_idempotensi: "kolom kunci text, akun_id bigint, hash_permintaan text, status text, respons jsonb?, jurnal_id bigint?, kedaluwarsa timestamptz | pk kunci | fk kunci_idempotensi_jurnal_id_fkey (jurnal_id)>jurnal(id) NO ACTION | unik kunci_idempotensi_jurnal_id_key (jurnal_id) | cek kunci_idempotensi_status_check | index -",
    batch_pencairan: "kolom id bigint, periode text, status text, total bigint | pk id | fk - | unik batch_pencairan_periode_key (periode) | cek batch_pencairan_status_check, batch_pencairan_total_check | index -",
    baris_pencairan: "kolom batch_id bigint, buku_id bigint, jumlah bigint, jurnal_id bigint? | pk batch_id,buku_id | fk baris_pencairan_batch_id_fkey (batch_id)>batch_pencairan(id) NO ACTION; baris_pencairan_buku_id_fkey (buku_id)>buku(id) NO ACTION; baris_pencairan_jurnal_id_fkey (jurnal_id)>jurnal(id) NO ACTION | unik baris_pencairan_jurnal_id_key (jurnal_id) | cek baris_pencairan_jumlah_check | index -",
    kota: "kolom id bigint, nama text | pk id | fk - | unik kota_nama_key (nama) | cek - | index -",
    perangkat: "kolom id bigint, akun_id bigint, platform text, token_push text, aktif boolean, terakhir_terlihat timestamptz | pk id | fk - | unik perangkat_token_push_key (token_push) | cek perangkat_platform_check | index perangkat_akun",
    outbox: "kolom id bigint, notifikasi_id uuid, jurnal_id bigint?, akun_id bigint, kelas smallint, jenis text, payload jsonb, status text, percobaan int, coba_lagi timestamptz, klaim_sampai timestamptz?, dibuat timestamptz, tujuan text | pk id | fk outbox_jurnal_id_fkey (jurnal_id)>jurnal(id) NO ACTION | unik outbox_notifikasi_id_key (notifikasi_id) | cek outbox_jenis_check, outbox_jurnal_atau_promo, outbox_kelas_check, outbox_pengumuman_ke_stream, outbox_percobaan_check, outbox_status_check, outbox_tujuan_check, outbox_tujuan_sesuai_jenis | index outbox_antre, outbox_antre_tujuan, outbox_satu_per_jurnal UNIQUE",
    produk: "kolom id bigint, akun_id bigint, nama text, harga bigint, stok int, aktif boolean, versi int, diubah timestamptz, gambar_url text? | pk id | fk - | unik produk_akun_id_nama_key (akun_id,nama) | cek produk_harga_check, produk_nama_check, produk_stok_check | index -",
    promo: "kolom id bigint, kota_id bigint, dibuat_oleh bigint, judul text, potongan_persen int, mulai timestamptz, selesai timestamptz | pk id | fk - | unik - | cek promo_judul_check, promo_potongan_persen_check, promo_selesai_sesudah_mulai | index promo_kota_waktu",
    operasi_sinkron: "kolom kunci text, perangkat_id bigint, produk_id bigint, jenis text, nilai bigint, versi_dasar int, status text, dibuat_di_hp timestamptz, diterapkan timestamptz? | pk kunci | fk operasi_sinkron_produk_id_fkey (produk_id)>produk(id) NO ACTION | unik - | cek operasi_sinkron_jenis_check, operasi_sinkron_nilai_check, operasi_sinkron_status_check, operasi_sinkron_versi_dasar_check | index operasi_produk",
    topup_bank: "kolom id bigint, akun_id bigint, order_id text, jumlah bigint, status text, tujuan_bayar text?, dibuat timestamptz, kedaluwarsa_pada timestamptz, jurnal_id bigint? | pk id | fk - | unik topup_bank_jurnal_id_key (jurnal_id); topup_bank_order_id_key (order_id) | cek topup_bank_jumlah_check, topup_bank_status_check | index topup_bank_akun, topup_bank_belum_selesai",
    webhook_event: "kolom event_id text, topup_id bigint?, jenis text, hasil text, diterima timestamptz, jurnal_id bigint? | pk event_id | fk webhook_event_topup_id_fkey (topup_id)>topup_bank(id) NO ACTION | unik - | cek webhook_event_hasil_check | index webhook_event_topup",
    insiden_rekon: "kolom id bigint, tanggal date, order_id text, topup_id bigint?, jenis text, selisih bigint, status text, jurnal_id bigint?, dibuat timestamptz | pk id | fk insiden_rekon_topup_id_fkey (topup_id)>topup_bank(id) NO ACTION | unik insiden_rekon_tanggal_order_id_jenis_key (tanggal,order_id,jenis) | cek insiden_rekon_jenis_check, insiden_rekon_status_check | index -",
    verifikasi: "kolom id bigint, akun_id bigint, subjek text, status text, tingkat_diminta text, referensi_vendor text?, berkas_kartu_kunci text, berkas_swafoto_kunci text, checksum_kartu text, checksum_swafoto text, hapus_pada timestamptz?, diajukan timestamptz, selesai timestamptz? | pk id | fk verifikasi_akun_id_fkey (akun_id)>akun(id) NO ACTION | unik - | cek verifikasi_status_check, verifikasi_subjek_check, verifikasi_tingkat_diminta_check | index verifikasi_akun, verifikasi_satu_berjalan UNIQUE",
    qr: "kolom id uuid, akun_id bigint, jenis text, nominal bigint?, berlaku_sampai timestamptz?, status text, jurnal_id bigint? | pk id | fk - | unik qr_jurnal_id_key (jurnal_id) | cek qr_dinamis_terikat, qr_jenis_check, qr_nominal_check, qr_statis_tanpa_jurnal, qr_status_check | index qr_akun",
    kartu: "kolom id bigint, akun_id bigint, token_penerbit text, empat_digit text, status text, batas_harian bigint | pk id | fk - | unik kartu_token_penerbit_key (token_penerbit) | cek kartu_batas_harian_check, kartu_empat_digit_check, kartu_status_check | index kartu_akun",
    otorisasi_kartu: "kolom id bigint, kartu_id bigint, id_penerbit text, jumlah bigint, status text, jurnal_tahan_id bigint?, jurnal_tangkap_id bigint?, tahan_sampai timestamptz?, dibuat timestamptz | pk id | fk otorisasi_kartu_kartu_id_fkey (kartu_id)>kartu(id) NO ACTION | unik otorisasi_kartu_id_penerbit_key (id_penerbit); otorisasi_kartu_jurnal_tahan_id_key (jurnal_tahan_id); otorisasi_kartu_jurnal_tangkap_id_key (jurnal_tangkap_id) | cek otorisasi_kartu_jumlah_check, otorisasi_kartu_status_check | index otorisasi_kartu_ditahan, otorisasi_kartu_kartu",
    audit_log: "kolom id bigint, waktu timestamptz, pelaku_id bigint, peran text, aksi text, objek text, alasan text?, penyetuju_id bigint?, hash_sebelumnya text, hash text | pk id | fk audit_log_pelaku_id_fkey (pelaku_id)>akun(id) NO ACTION; audit_log_penyetuju_id_fkey (penyetuju_id)>akun(id) NO ACTION | unik audit_log_hash_key (hash) | cek - | index audit_log_objek",
    posting: "kolom id bigint, jurnal_id bigint, buku_id bigint, jumlah bigint, dibuat timestamptz | pk id,dibuat | fk posting_buku_id_fkey1 (buku_id)>buku(id) NO ACTION; posting_jurnal_id_fkey1 (jurnal_id)>jurnal(id) NO ACTION | unik - | cek posting_jumlah_check1 | index posting_buku, posting_jurnal, posting_riwayat",
    snapshot_saldo: "kolom buku_id bigint, periode date, saldo bigint, jumlah_posting bigint, dibuat timestamptz | pk buku_id,periode | fk snapshot_saldo_buku_id_fkey (buku_id)>buku(id) NO ACTION | unik - | cek snapshot_saldo_jumlah_posting_check, snapshot_saldo_periode_check | index -",
    arsip_partisi: "kolom periode date, kunci_objek text, checksum text, kunci_data_terbungkus text, versi_kek int, dibuat timestamptz | pk periode | fk - | unik - | cek arsip_partisi_periode_check, arsip_partisi_versi_kek_check | index -",
    ringkasan_merchant_harian: "kolom merchant_akun_id bigint, tanggal date, jumlah_transaksi bigint, total bigint, diperbarui_pada timestamptz | pk merchant_akun_id,tanggal | fk - | unik - | cek ringkasan_merchant_harian_jumlah_transaksi_check | index -",
    jadwal_cicilan: "kolom id bigint, akun_id bigint, jenis text, merchant_akun_id bigint?, jumlah_per_angsuran bigint, jumlah_angsuran int, hari_tagih int, status text | pk id | fk - | unik - | cek cicilan_dengan_merchant, jadwal_cicilan_hari_tagih_check, jadwal_cicilan_jenis_check, jadwal_cicilan_jumlah_angsuran_check, jadwal_cicilan_jumlah_per_angsuran_check, jadwal_cicilan_status_check, tabungan_tanpa_merchant | index -",
    angsuran: "kolom jadwal_id bigint, ke int, jatuh_tempo date, status text, jurnal_id bigint? | pk jadwal_id,ke | fk angsuran_jadwal_id_fkey (jadwal_id)>jadwal_cicilan(id) NO ACTION | unik - | cek angsuran_jurnal_sesuai_status, angsuran_ke_check, angsuran_status_check | index -",
    pengumuman: "kolom id bigint, judul text, status text, jumlah_penerima int, dibuat_oleh bigint, mulai timestamptz?, selesai timestamptz? | pk id | fk - | unik - | cek pengumuman_judul_check, pengumuman_jumlah_penerima_check, pengumuman_status_check | index -",
    mitra_pos: "kolom id bigint, nama text, kunci_hash text, status text, kuota_per_detik int, dibuat timestamptz | pk id | fk - | unik mitra_pos_kunci_hash_key (kunci_hash) | cek mitra_pos_kuota_per_detik_check, mitra_pos_status_check | index -",
    sakelar: "kolom nama text, nilai boolean, diubah_oleh bigint?, diubah timestamptz | pk nama | fk - | unik - | cek - | index -",
    };
    expect(d5.tabel.map((t) => t.nama)).toEqual(Object.keys(harap));
    for (const t of d5.tabel) expect(tanda(t), t.nama).toBe(harap[t.nama]);
    expect(d5.postgres).toBe(17); // chip "Rekaman lab · PostgreSQL 17" di widget dibaca dari sini (kontainer postgres:17 lab)
    expect(createHash("sha256").update(JSON.stringify(d5.tabel)).digest("hex")).toBe("58f284f6b8ccf374a02133b80dbb9ecabaa3a449a0f6e83733329c09af005740");
  });
  it("penjaga selisih dan pembagian: mengubah satu hal membuat build gagal atau mengubah tampilan", () => {
    const klon = () => structuredClone(lab5);
    // FK yang dihapus dikeluarkan dari selisih: jumlah yang menyeberang tidak sama dengan yang dihapus.
    const a = klon();
    a[4].selisih!.aturan_berubah = a[4].selisih!.aturan_berubah.filter((r) => !(r.jenis === "fk" && r.tabel === "buku"));
    expect(() => fkDihapusLintas(a, 5, modul)).toThrow(/18 foreign key Tahap 4 menyeberang batas service, 17 yang dihapus/);
    // FK di dalam satu service dicatat dihapus.
    const b = klon();
    b[4].selisih!.aturan_berubah.push({ tabel: "akun", jenis: "fk", nama: "akun_kota_id_fkey", ubah: "dihapus" });
    expect(() => fkDihapusLintas(b, 5, modul)).toThrow(/akun_kota_id_fkey dihapus tetapi tidak menyeberang batas service/);
    // FK yang tidak ada di Tahap 4.
    const c = klon();
    c[4].selisih!.aturan_berubah.push({ tabel: "akun", jenis: "fk", nama: "akun_gaib_fkey", ubah: "dihapus" });
    expect(() => fkDihapusLintas(c, 5, modul)).toThrow(/akun_gaib_fkey dihapus tetapi tidak ada di Tahap 4/);
    // FK lintas dikembalikan ke ERD Tahap 5: pembagian tidak cocok dengan ERD.
    const d = klon();
    d[4].tabel.find((t) => t.nama === "buku")!.fk.push({ nama: "buku_akun_id_fkey", kolom: ["akun_id"], ke_tabel: "akun", ke_kolom: ["id"], saat_hapus: "NO ACTION" });
    expect(() => periksaModul(d[4], modul)).toThrow(/foreign key lintas service tidak sama/);
    // Satu tabel pindah service: FK di dalam satu service jadi menyeberang.
    const e = structuredClone(modul);
    e.modul[0].tabel = e.modul[0].tabel.filter((n) => n !== "snapshot_saldo");
    e.modul[1].tabel.push("snapshot_saldo");
    expect(() => periksaModul(d5, e)).toThrow(/foreign key lintas service tidak sama/);
    const f = structuredClone(modul);
    f.modul[5].tabel.push("posting");
    expect(() => periksaModul(d5, f)).toThrow(/tabel di pembagian service tidak sama/);
    expect(() => periksaModul(lab4, modul)).toThrow(/dipasang di ERD Tahap 4/);
    // Selisih: tabel baru dikeluarkan mengubah ringkasan; tahap pembanding wajib ada.
    const g = klon();
    g[4].selisih!.tabel_baru = g[4].selisih!.tabel_baru.filter((n) => n !== "sakelar");
    expect(ringkasan(tampilTahap(g, 5))).toBe("30 tabel, 19 foreign key (7 baru, 16 berubah, 7 tetap).");
    expect(() => fkDihapusLintas([lab5[4]], 5, modul)).toThrow(/Tahap 4 tidak ada/);
    expect(() => tampilTahap([lab5[0], lab5[1], lab5[2], lab5[4]], 5)).toThrow(/Tahap 4 tidak ada/);
    expect(tampilSebelum(lab5, 5)).toHaveLength(22);
  });
  it("skema Zod: partisi dan istilah yang salah ditolak", () => {
    const klon = () => structuredClone(t5Lab) as unknown as DataErd;
    const a = klon();
    a.tabel.find((t) => t.nama === "posting")!.partisi!.kunci = "RANGE (jumlah)";
    expect(DataErd.safeParse(a).success).toBe(false);
    const b = klon();
    b.tabel.find((t) => t.nama === "posting")!.partisi!.anak = ["akun", "posting_sebelum"];
    expect(DataErd.safeParse(b).success).toBe(false);
    const c = klon();
    (c.tabel.find((t) => t.nama === "posting")!.partisi as Record<string, unknown>).batas = "x";
    expect(DataErd.safeParse(c).success).toBe(false);
    const d = klon();
    d.tabel.find((t) => t.nama === "posting")!.partisi!.anak.reverse();
    expect(DataErd.safeParse(d).success).toBe(false);
    expect(DataErd.safeParse(klon()).success).toBe(true);
    expect(ModulErd.safeParse({ ...s5Lab, istilah: "layanan" }).success).toBe(false);
    const { istilah: _i, ...tanpa } = s5Lab;
    expect(ModulErd.safeParse(tanpa).success).toBe(false);
    expect(ModulErd.parse(m4Lab).istilah).toBe("modul");
  });
  it("sisi kiri bandingkan: Tahap 4 utuh; peringkat dan tata: 30 node, 19 garis, tanpa tumpang tindih atau ruas yang memotong node", () => {
    const kiri = tampilSebelum(lab5, 5);
    expect(kiri.map((t) => `${t.nama}:${t.status}`)).toEqual(tampilTahap(lab5, 4).map((t) => `${t.nama}:null`));
    expect(kiri.every((t) => t.kolom.every((k) => k.status === null))).toBe(true);
    for (const lebar of [288, 343, ambangKolom(2), ambangKolom(3), ambangKolom(4)]) {
      const t = tata(x, lebar);
      expect(t.node).toHaveLength(30);
      for (const a of t.node)
        for (const b of t.node)
          if (a !== b) expect(a.x + a.lebar <= b.x || b.x + b.lebar <= a.x || a.y + a.tinggi <= b.y || b.y + b.tinggi <= a.y, `${a.nama}/${b.nama} @${lebar}`).toBe(true);
      expect(new Set(t.edge.map((e) => e.id)).size).toBe(19);
      const p = new Map(t.node.map((n) => [n.nama, n]));
      for (const e of t.edge) {
        if (e.dari !== e.ke) expect(p.get(e.ke)!.y, e.id).toBeLessThan(p.get(e.dari)!.y);
        for (let i = 1; i < e.titik.length; i++) {
          const [[x0, y0], [x1, y1]] = [e.titik[i - 1], e.titik[i]];
          expect(e.titik[i][0] >= 0 && e.titik[i][0] <= t.lebar && e.titik[i][1] >= 0 && e.titik[i][1] <= t.tinggi, `${e.id} di luar tata @${lebar}`).toBe(true);
          for (const n of t.node) {
            if (n.nama === e.dari || n.nama === e.ke) continue;
            const potong = Math.max(x0, x1) > n.x && Math.min(x0, x1) < n.x + n.lebar && Math.max(y0, y1) > n.y && Math.min(y0, y1) < n.y + n.tinggi;
            expect(potong, `${e.id} memotong ${n.nama} @${lebar}`).toBe(false);
          }
        }
      }
    }
    for (const lebar of [288, 343]) {
      const t = tata(x, lebar);
      expect(t.bentuk).toBe("sempit");
      expect(t.lebar, `lebar tata @${lebar}`).toBeLessThanOrEqual(lebar);
      expect(new Set(t.edge.map((e) => e.offset)).size, `lajur @${lebar}`).toBeLessThanOrEqual(9);
      t.node.forEach((n, i) => i && expect(n.y, `${n.nama} @${lebar}`).toBe(t.node[i - 1].y + t.node[i - 1].tinggi + UKURAN.jarakY / 2));
    }
    expect(497 / tata(x, ambangKolom(2)).lebar).toBeGreaterThanOrEqual(0.8); // sisi bandingkan 497 px tidak diperkecil di bawah 0,8
  });
  it("tinggi pesanan SSR Tahap 5 sama dengan tinggi tata di setiap jumlah kolom", () => {
    const v = varPesan(x);
    let h = parseFloat(v["--erd-t1"]);
    expect(h).toBe(tata(x, 343).tinggi);
    for (let k = 2; k <= UKURAN.maksKolom; k++) {
      h += Number(v[`--erd-d${k}`]);
      expect(h).toBe(tata(x, ambangKolom(k) + 10).tinggi);
    }
  });
  it("nama tabel yang lebih lebar dari isi node membungkus sesudah garis bawah, tidak terpotong: hanya ringkasan_merchant_harian", () => {
    for (const acuan of [UKURAN.lebarMin, UKURAN.lebar])
      expect(x.filter((t) => barisNama(t, acuan) > 1).map((t) => t.nama), `@${acuan}`).toEqual(["ringkasan_merchant_harian"]);
    const r = x.find((t) => t.nama === "ringkasan_merchant_harian")!;
    expect(r.nama.length).toBe(25);
    expect([barisNama(r, UKURAN.lebarMin), barisNama(r, UKURAN.lebar)]).toEqual([2, 2]);
    expect(duaKepala(r, UKURAN.lebar)).toBe(true);
    // 84 px = kepala dua baris (64) + satu baris nama tambahan (20); angka yang sama diperiksa ukur-erd.mjs di Chromium ("harap 84").
    expect([tinggiKepala(r, UKURAN.lebarMin), tinggiKepala(r, UKURAN.lebar)]).toEqual([84, 84]);
    expect([UKURAN.kepalaDua, UKURAN.barisNama]).toEqual([64, 20]);
    expect(tinggiNode(r)).toBe(84 + r.kolom.reduce((n, k) => n + UKURAN.baris + (duaBaris(k, r, UKURAN.lebar) ? UKURAN.labelBaris : 0), 0) + UKURAN.bawah);
    // Nama pendek tetap satu baris; satu nama tanpa garis bawah yang lebih lebar dipecah menurut lebar.
    const panjang = { ...r, nama: "x".repeat(60) };
    expect(barisNama(panjang, UKURAN.lebar)).toBe(Math.ceil((60 * 9.2) / (UKURAN.lebar - 22.2)));
    expect(barisNama({ ...r, nama: "a_b" }, UKURAN.lebarMin)).toBe(1);
    // Chip partisi melebarkan kepala posting: dua baris di node 200 px, satu baris di 232 px.
    const p = x.find((t) => t.nama === "posting")!;
    expect([duaKepala(p, UKURAN.lebarMin), duaKepala(p, UKURAN.lebar)]).toEqual([true, false]);
    expect(duaKepala({ ...p, tabel: { ...p.tabel, partisi: undefined } }, UKURAN.lebarMin)).toBe(false);
    expect(x.filter((t) => duaKepala(t, UKURAN.lebar)).map((t) => t.nama)).toEqual(["kunci_idempotensi", "ringkasan_merchant_harian"]);
    // Nama kolom dan label yang dua baris di node 200 px (diukur di Chromium oleh ukur-erd.mjs) dan di 232 px.
    const tanda = (acuan: number) => x.flatMap((t) => t.kolom.filter((k) => duaBaris(k, t, acuan)).map((k) => `${t.nama}.${k.kolom.nama}`));
    for (const n of ["akun.nomor_karyawan", "jurnal.membalik_jurnal_id", "jurnal.referensi", "otorisasi_kartu.jurnal_tangkap_id", "ringkasan_merchant_harian.jumlah_transaksi", "jadwal_cicilan.merchant_akun_id", "jadwal_cicilan.jumlah_per_angsuran"])
      expect(tanda(UKURAN.lebarMin), n).toContain(n);
    expect(tanda(UKURAN.lebar)).toEqual(["akun.nomor_karyawan", "jurnal.membalik_jurnal_id"]);
  });
  it("setiap tabel Tahap 5 punya halaman penjelas di peta; tabel baru menunjuk halaman 5.x; keadaan tautan mengikuti registry", () => {
    const peta = PetaHalaman.parse(petaHalaman);
    const reg = muat().halaman as HalamanRegistry[];
    const t = tautanHalaman(peta, lab5, reg, url)["5"];
    expect(Object.keys(t)).toEqual(d5.tabel.map((a) => a.nama));
    for (const a of d5.tabel) expect(t[a.nama].length, a.nama).toBeGreaterThan(0);
    for (const n of BARU) expect(t[n].every((h) => h.label.startsWith("5.")), n).toBe(true);
    expect(t.posting.slice(-3).map((h) => h.label.split(" ")[0])).toEqual(["5.3", "5.10", "5.11"]);
    // href dan catatan dibaca dari keadaan registry sekarang: halaman yang ada punya tautan, yang belum "segera".
    for (const a of d5.tabel)
      for (const [i, id] of peta.tahap["5"][a.nama].entries()) {
        const h = reg.find((r) => r.id === id)!;
        expect(t[a.nama][i].href === null, `${a.nama} ${id}`).toBe(!h.ada);
        expect(t[a.nama][i].catatan === "segera", `${a.nama} ${id}`).toBe(!h.ada);
      }
    expect(Object.keys(peta.tahap["5"]).sort()).toEqual(d5.tabel.map((a) => a.nama).sort());
  });
  it("tabel baru dan posting sama dengan CREATE TABLE di migration: kolom, tipe, boleh kosong, bawaan, PK, FK, UNIQUE, CHECK, dan index dibaca dari SQL, bukan dari kunci literal", () => {
    // Tinjauan ERD5 (keputusan 1673). Tanpa tes ini, tipe, boleh kosong, ekspresi CHECK, dan index tabel baru hanya terkunci oleh tes
    // `penjaga skema` yang literal: mutan data pada tabel baru lolos bila tes itu dikeluarkan. SQL migration adalah sumber tabel baru.
    const bersih = (sql: string) => sql.replace(/--.*$/gm, "");
    const NORMAL_TIPE: Record<string, string> = { int: "integer", timestamptz: "timestamp with time zone" };
    // Isi sampai kurung penutup yang seimbang, mulai dari "(" di `dari` (isi string 'x' dilewati).
    const isiKurung = (s: string, dari: number) => {
      let dalam = 0;
      let kutip = false;
      for (let i = dari; i < s.length; i++) {
        const c = s[i];
        if (c === "'") kutip = !kutip;
        else if (!kutip && c === "(") dalam++;
        else if (!kutip && c === ")" && --dalam === 0) return s.slice(dari + 1, i);
      }
      throw new Error("kurung tidak seimbang");
    };
    // Butir tingkat atas CREATE TABLE: dipisah koma yang tidak di dalam kurung atau string.
    const bagiAtas = (s: string) => {
      const hasil: string[] = [];
      let dalam = 0;
      let awal = 0;
      let kutip = false;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === "'") kutip = !kutip;
        else if (!kutip && c === "(") dalam++;
        else if (!kutip && c === ")") dalam--;
        else if (!kutip && c === "," && dalam === 0) {
          hasil.push(s.slice(awal, i).trim());
          awal = i + 1;
        }
      }
      hasil.push(s.slice(awal).trim());
      return hasil.filter(Boolean);
    };
    // Isi CHECK dibandingkan lewat string dan angkanya (PostgreSQL menulis ulang `IN (...)` jadi `= ANY (ARRAY[...])`).
    const token = (e: string) => [...e.matchAll(/'[^']*'|\b\d+\b/g)].map((m) => m[0]).sort();
    const urut = <T,>(xs: T[]) => xs.map((x) => JSON.stringify(x)).sort();
    const turunkan = (sql: string, nama: string) => {
      const m = new RegExp(`CREATE TABLE ${nama} \\(([\\s\\S]*?)\\n\\)[^;]*;`).exec(bersih(sql));
      if (!m) throw new Error(`CREATE TABLE ${nama} tidak ditemukan`);
      const hasil = {
        kolom: [] as [string, string, boolean, string | null][],
        pk: [] as string[],
        fk: [] as [string[], string, string[]][],
        unik: [] as [string, string[]][],
        cek: [] as { nama: string; kolom: string[]; token: string[] }[],
      };
      const tabelCek: { nama: string; isi: string }[] = [];
      for (const butir of bagiAtas(m[1])) {
        const pk = /^PRIMARY KEY \(([^)]+)\)$/.exec(butir);
        const cn = /^CONSTRAINT (\w+) CHECK \(/.exec(butir);
        if (pk) hasil.pk = pk[1].split(",").map((c) => c.trim());
        else if (cn) tabelCek.push({ nama: cn[1], isi: isiKurung(butir, cn[0].length - 1) });
        else {
          const [, kn, tipeSql, sisa] = /^(\w+)\s+(\w+)\b([\s\S]*)$/.exec(butir)!;
          const pkKolom = /\bPRIMARY KEY\b/.test(sisa);
          if (pkKolom) hasil.pk = [kn];
          const d = /DEFAULT\s+(nextval\('(\w+)'\)|'[^']*'|\w+\(\)|\d+)/.exec(sisa);
          const bawaan = /GENERATED ALWAYS AS IDENTITY/.test(sisa)
            ? "GENERATED ALWAYS AS IDENTITY"
            : d ? (d[2] ? `nextval('${d[2]}'::regclass)` : d[1].startsWith("'") ? `${d[1]}::text` : d[1]) : null;
          hasil.kolom.push([kn, NORMAL_TIPE[tipeSql] ?? tipeSql, /\bNOT NULL\b/.test(sisa) || pkKolom, bawaan]);
          const r = /REFERENCES (\w+) \((\w+)\)/.exec(sisa);
          if (r) hasil.fk.push([[kn], r[1], [r[2]]]);
          if (/\bUNIQUE\b/.test(sisa)) hasil.unik.push([`${nama}_${kn}_key`, [kn]]);
          const c = sisa.indexOf("CHECK (");
          if (c >= 0) hasil.cek.push({ nama: `${nama}_${kn}_check`, kolom: [kn], token: token(isiKurung(sisa, c + 6)) });
        }
      }
      const semua = hasil.kolom.map((k) => k[0]);
      for (const c of tabelCek) hasil.cek.push({ nama: c.nama, kolom: semua.filter((k) => new RegExp(`\\b${k}\\b`).test(c.isi)).sort(), token: token(c.isi) });
      return hasil;
    };
    const m24 = bersih(baca("labs/api-t5/migrasi/000024_posting_partisi.up.sql"));
    const m25 = bersih(baca("labs/api-t5/migrasi/000025_tabel_tahap5.up.sql"));
    const banding = (sql: string, nama: string, denganNama: boolean) => {
      const s = turunkan(sql, nama);
      const t = tabel(nama);
      expect(t.kolom.map((k) => [k.nama, k.tipe, k.wajib, k.bawaan]), `${nama} kolom`).toEqual(s.kolom);
      expect(t.pk, `${nama} pk`).toEqual(s.pk);
      expect(urut(t.fk.map((f) => [f.kolom, f.ke_tabel, f.ke_kolom])), `${nama} fk`).toEqual(urut(s.fk));
      expect(urut(t.unik.map((u) => [u.nama, u.kolom])), `${nama} unik`).toEqual(urut(s.unik));
      // posting dibuat ulang: PostgreSQL menamai CHECK-nya posting_jumlah_check1, jadi nama tidak dibandingkan di sana.
      const cek = t.cek.map((c) => ({ ...(denganNama ? { nama: c.nama } : {}), kolom: [...c.kolom].sort(), token: token(c.ekspresi) }));
      expect(urut(cek), `${nama} cek`).toEqual(urut(s.cek.map((c) => (denganNama ? c : { kolom: c.kolom, token: c.token }))));
    };
    for (const n of BARU) banding(m25, n, true);
    banding(m24, "posting", false);
    // Index: tabel baru tidak punya satu pun; posting tiga, dengan nama dan kolom dari CREATE INDEX di migration 000024.
    expect(m25).not.toMatch(/CREATE (UNIQUE )?INDEX/);
    for (const n of BARU) expect(tabel(n).index, `${n} index`).toEqual([]);
    const idx = [...m24.matchAll(/CREATE INDEX (\w+) ON posting \(([^)]+)\);/g)].map((x) => [x[1], `btree (${x[2].trim()})`]);
    expect(idx).toHaveLength(3);
    expect(urut(tabel("posting").index.map((i) => [i.nama, i.definisi]))).toEqual(urut(idx));
    expect(tabel("posting").index.every((i) => !i.unik)).toBe(true);
  });
  it("halaman penjelas tiap tabel di peta cocok dengan kolom 'Masalah atau syarat' tabel 'Apa yang berubah dan kenapa' naskah 3b: masalahnya sendiri, bukan masalah tabel lain", () => {
    // Tinjauan ERD5 (keputusan 1673): sebelum tes ini, menukar halaman `sakelar` dengan `snapshot_saldo` lolos semua tes, karena tes di atas
    // hanya memeriksa awalan "5." dan tiga halaman posting. Sumbernya naskah: tiap baris tabel menyebut tabelnya di kolom Tahap 5 dan
    // masalahnya (M43, M48, ...) di kolom terakhir; halaman masalah M<n> terdaftar di registry dengan ID t5-m<n>.
    const naskah = baca("plan/CERITA-TAHAP-5.md").split("\n");
    const awal = naskah.findIndex((b) => b.startsWith("| Tahap 4 | Tahap 5 | Alasan | Masalah atau syarat |"));
    expect(awal).toBeGreaterThan(0);
    const baris = naskah.slice(awal + 2).filter((b, i, a) => a.slice(0, i + 1).every((c) => c.startsWith("|")));
    const harap = new Map<string, string[]>();
    for (const b of baris) {
      const sel = b.split("|").map((s) => s.trim());
      const nama = [...sel[2].matchAll(/`(\w+)`/g)].map((m) => m[1]).find((n) => d5.tabel.some((t) => t.nama === n));
      if (nama) harap.set(nama, [...sel[4].matchAll(/\bM(\d+)\b/g)].map((m) => `t5-m${m[1]}`));
    }
    expect([...harap.keys()].sort()).toEqual([...BARU, "akun", "outbox", "jurnal", "buku", "posting"].sort());
    const peta = PetaHalaman.parse(petaHalaman);
    for (const t of d5.tabel) {
      const masalah = peta.tahap["5"][t.nama].filter((id) => /^t5-m\d+$/.test(id));
      expect(masalah.sort(), t.nama).toEqual((harap.get(t.nama) ?? []).sort());
    }
    expect(harap.get("posting")).toEqual(["t5-m43"]);
    expect(harap.get("sakelar")).toEqual(["t5-m49"]);
  });
  it("fkDihapusLintas hanya menghitung foreign key yang dihapus: aturan lain di selisih tidak ikut", () => {
    const a = structuredClone(lab5);
    a[4].selisih!.aturan_berubah.push(
      { tabel: "buku", jenis: "cek", nama: "buku_jenis_check", ubah: "dihapus" }, // bukan foreign key
      { tabel: "akun", jenis: "fk", nama: "akun_kota_id_fkey", ubah: "baru" }, // foreign key, tetapi baru
    );
    expect(fkDihapusLintas(a, 5, modul)).toHaveLength(18);
  });
  it("skema Zod: partisi tanpa anak dan kunci partisi yang hanya memuat sebagian nama kolom PK ditolak", () => {
    const klon = () => structuredClone(t5Lab) as unknown as DataErd;
    const a = klon();
    a.tabel.find((t) => t.nama === "posting")!.partisi!.anak = [];
    expect(DataErd.safeParse(a).success).toBe(false);
    const b = klon();
    b.tabel.find((t) => t.nama === "posting")!.partisi!.kunci = "RANGE (idx)"; // "id" hanya potongan dari "idx"
    expect(DataErd.safeParse(b).success).toBe(false);
  });
  it("CSS widget ERD: warna hanya lewat token (tanpa heksadesimal, rgb, atau hsl)", () => {
    const css = baca("situs/src/erd/erd-tumbuh.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g) ?? []).toEqual([]);
    expect(css.match(/var\(--/g)?.length ?? 0).toBeGreaterThan(40); // pemeriksaan ini membaca CSS yang benar, bukan berkas kosong
  });
});
