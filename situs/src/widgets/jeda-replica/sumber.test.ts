// Penjaga sumber widget jeda replica (W5-lag): menurunkan nilai dari rekaman lab t5-replika, kode api-t5, dan naskah Tahap 5, lalu
// membandingkannya dengan t5-lag.json. Satu nilai yang diubah di salah satu sisi membuat tes gagal (uji mutasi di badan PR).
// Baris sumber tiap kalimat yang dikunci literal ada di komentar di dekatnya. Dua klaim batas tentang dokumentasi PostgreSQL 17
// (pg_current_wal_lsn "write location"; synchronous_commit = off "no waiting") dibuka 2026-11-02 dan tidak bisa dijaga offline.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import mentah from "../../../data/widget/t5-lag.json";
import { DataLag } from "./skema";
import { rupiah } from "./logika";

const d = DataLag.parse(mentah);
const AKAR = path.resolve(__dirname, "../../../..");
const baca = (rel: string) => fs.readFileSync(path.join(AKAR, rel), "utf8");
const norm = (s: string) => s.replace(/\s+/g, " ");
const REKAMAN = (berkas: string) => baca(`labs/t5-replika/output/${berkas}`);

/** Satu bagian rekaman: dari "# --- X. " sampai "# --- " berikutnya. */
const bagian = (isi: string, huruf: string): string => {
  const awal = isi.indexOf(`# --- ${huruf}. `);
  expect(awal, `bagian ${huruf} ada`).toBeGreaterThan(-1);
  const lanjut = isi.indexOf("\n# --- ", awal + 1);
  return lanjut === -1 ? isi.slice(awal) : isi.slice(awal, lanjut);
};
/** Blok perintah curl dalam satu bagian: tiap blok diawali "$ curl". */
const blokCurl = (isi: string): { perintah: string; teks: string; json: any }[] =>
  isi.split(/^\$ /m).slice(1).filter((b) => b.startsWith("curl")).map((b) => {
    const baris = b.split("\n");
    const j = baris.find((x) => x.startsWith("{"));
    return { perintah: baris[0]!, teks: b, json: j ? JSON.parse(j) : null };
  });
const kepala = (b: { teks: string }, nama: string) => new RegExp(`^${nama}: (.+)$`, "m").exec(b.teks)?.[1];

const BACA = REKAMAN("baca.txt");
const A = bagian(BACA, "A");
const B = bagian(BACA, "B");
const SINKRON_B = bagian(REKAMAN("sinkron.txt"), "B");

describe("sumber: tiap bukti acuan ada di berkas dan bagian yang disebut", () => {
  it("semua baris bukti acuan dan uang ditemukan di bagian rekaman yang dinamai (kemunculan di bagian lain tidak dihitung)", () => {
    for (const a of [...d.acuan, d.uang]) {
      const isi = norm(bagian(REKAMAN(a.berkas), a.bagian));
      for (const b of a.bukti) expect(isi, `${a.berkas} ${a.bagian}: ${b}`).toContain(norm(b));
    }
  });
  it("acuan menyebut tiga berkas rekaman (jeda, baca, sinkron) dan setiap berkas itu ada di labs/t5-replika/output", () => {
    expect([...new Set(d.acuan.map((a) => a.berkas))].sort()).toEqual(["baca.txt", "jeda.txt", "sinkron.txt"]);
    for (const a of d.acuan) expect(fs.existsSync(path.join(AKAR, "labs/t5-replika/output", a.berkas))).toBe(true);
  });
  it("jenis Ilustrasi hanya untuk jeda cerita (2 detik), dan jenis Rekaman tidak dipakai untuk jeda 2 detik atau 5 detik", () => {
    expect(d.acuan.filter((a) => a.jenis === "ilustrasi").map((a) => a.jeda)).toEqual(["naskah"]);
    expect(d.acuan.filter((a) => a.jenis === "rekaman" && ["naskah", "batas"].includes(a.jeda))).toEqual([]);
  });
});

describe("sumber: skenario Budi sama dengan baca.txt bagian A", () => {
  const blok = blokCurl(A);
  const bayar = blok.find((b) => b.perintah.includes("POST '/transfers'"))!;
  const akun = blok.filter((b) => b.perintah.includes("GET '/akun/419'"));
  const riwayat = blok.filter((b) => b.perintah.includes("GET '/akun/419/riwayat'"));
  it("pembayaran Rp35.000 ke Warung 505 dijawab 201 dengan saldo 215.000 = saldo awal 250.000 dikurangi bayar", () => {
    expect(bayar.perintah).toContain('"nominal": 35000');
    expect(bayar.teks).toContain("201 Created");
    expect(bayar.json.saldo).toBe(d.skenario.saldoAwal - d.skenario.bayar);
    expect(d.skenario.bayar).toBe(35000);
    expect(akun[0]!.json.saldo).toBe(d.skenario.saldoAwal);
  });
  it("sebelum bayar riwayat satu baris (= barisAwal); sesudah replica menyusul dua baris", () => {
    expect(riwayat[0]!.json.riwayat).toHaveLength(d.skenario.barisAwal);
    expect(riwayat.at(-1)!.json.riwayat).toHaveLength(d.skenario.barisAwal + 1);
    expect(akun.at(-1)!.json.saldo).toBe(d.skenario.saldoAwal - d.skenario.bayar);
  });
  it("replica ditahan: saldo tampil sesudah bayar tetap 250.000, dari replica, juga bila token dikirim (mode rentan mengabaikannya)", () => {
    const sesudah = akun.slice(1, 2)[0]!;
    expect(sesudah.perintah).toContain("X-Lsn-Tulis");
    expect(sesudah.json.saldo).toBe(250000);
    expect(kepala(sesudah, "X-Dibaca-Dari")).toBe("replika");
    const r = riwayat[1]!;
    expect(r.json.riwayat).toHaveLength(1);
    expect(kepala(r, "X-Dibaca-Dari")).toBe("replika");
  });
  it("selang bacaan 1 detik dan jeda 2 detik adalah Asumsi desain atau Ilustrasi: rekaman tidak memuat nilai detik untuk jeda buatan", () => {
    expect(d.skenario.bacaDetik).toBe(1);
    expect(A).not.toMatch(/\b2 detik\b/);
    expect(d.sumber.teks).toContain("Satu bacaan 1 detik sesudah jawaban 201 adalah Asumsi desain");
  });
});

describe("sumber: bagian B (token LSN) sama dengan acuan token", () => {
  const blok = blokCurl(B);
  const bayar = blok.find((b) => b.perintah.includes("POST '/transfers'"))!;
  const akun = blok.filter((b) => b.perintah.includes("GET '/akun/419'"));
  const acuan = d.acuan.find((a) => a.aturan === "token")!;
  it("bayar Rp12.000 dijawab 201 dengan saldo 203.000, dan acuan menyebut kedua angka itu persis", () => {
    expect(bayar.perintah).toContain('"nominal": 12000');
    expect(bayar.json.saldo).toBe(203000);
    expect(acuan.teks).toContain(`bayar ${rupiah(12000)}`);
    expect(acuan.teks).toContain(rupiah(203000));
    expect(acuan.teks).toContain(rupiah(215000));
  });
  it("urutan tiga bacaan: tanpa token dari replica (215.000), dengan token dari primary (203.000), token sama sesudah replica menyusul dari replica (203.000)", () => {
    const tanpa = akun[0]!, dengan = akun[1]!;
    expect(tanpa.perintah).not.toContain("X-Lsn-Tulis");
    expect([kepala(tanpa, "X-Dibaca-Dari"), tanpa.json.saldo]).toEqual(["replika", 215000]);
    expect(dengan.perintah).toContain("X-Lsn-Tulis: <LSN tulis 2>");
    expect([kepala(dengan, "X-Dibaca-Dari"), dengan.json.saldo]).toEqual(["primary", 203000]);
    const akhir = akun.at(-1)!;
    expect(akhir.perintah).toContain("X-Lsn-Tulis: <LSN tulis 2>");
    expect([kepala(akhir, "X-Dibaca-Dari"), akhir.json.saldo]).toEqual(["replika", 203000]);
  });
  it("token bukan posisi WAL dijawab 422 sebelum menyentuh database (rekaman) dan kode menolaknya dengan pola LSN", () => {
    expect(B).toContain("HTTP/1.1 422 Unprocessable Entity");
    expect(B).toContain("posisi WAL seperti 0/3032C60");
    expect(baca("labs/api-t5/internal/service/replika.go")).toContain("ErrValidasi{\"X-Lsn-Tulis\", \"posisi WAL seperti 0/3032C60\"}");
  });
});

describe("sumber: remote_apply dan jeda dari sinkron.txt dan jeda.txt", () => {
  it("bagian B sinkron.txt: on selesai selagi replay ditahan, remote_apply menunggu di SyncRep lalu selesai sesudah replay dilanjutkan, dan selisih alami di bawah 1 ms", () => {
    const isi = norm(SINKRON_B);
    const urutan = [
      "pg_wal_replay_pause()",
      "COMMIT dengan synchronous_commit = on selesai selagi replay ditahan: ya",
      "SyncRep",
      "COMMIT remote_apply selesai sesudah replay dilanjutkan dan barisnya terlihat: ya",
      "selisih COMMIT tercepat antara remote_apply dan on di bawah 1 ms: ya",
    ].map((k) => isi.indexOf(norm(k)));
    expect(urutan.every((i) => i > -1)).toBe(true);
    expect([...urutan].sort((x, y) => x - y)).toEqual(urutan);
  });
  it("jeda.txt bagian A: 100 pembayaran per detik selama 10 detik, jeda tertinggi di bawah 1 detik; bagian B menahan replay dengan pg_wal_replay_pause", () => {
    const jeda = REKAMAN("jeda.txt");
    expect(bagian(jeda, "A")).toContain("# --- A. Jeda alami di bawah beban: 100 pembayaran per detik selama 10 detik ---");
    expect(bagian(jeda, "A")).toContain("replay_lag tertinggi di kedua standby di bawah 1 detik (batas lab; nilai tidak direkam): ya");
    expect(bagian(jeda, "B")).toContain("pg_wal_replay_pause()");
    expect(d.sumber.teks).toContain("100 pembayaran per detik");
    expect(d.sumber.teks).toContain("di bawah 1 detik");
    expect(d.sumber.teks).toContain("menahan replay");
  });
  it("README lab: jeda sekitar 2 detik di cerita tidak terjadi alami dan tetap Ilustrasi", () => {
    expect(norm(baca("labs/t5-replika/README.md"))).toContain("Jeda ±2 detik di cerita M41 tidak terjadi dengan sendirinya di laptop lab dan tetap Ilustrasi");
  });
  it("hanya jeda ditahan yang punya rekaman tentang aturan replica dan token; 0,5 detik adalah contoh di bawah batas 1 detik, bukan nilai rekaman", () => {
    expect(d.acuan.filter((a) => a.aturan === "token").map((a) => a.jeda)).toEqual(["ditahan"]);
    expect(d.acuan.filter((a) => a.aturan === "replica").map((a) => a.jeda)).toEqual(["ditahan"]);
    expect(d.acuan.find((a) => a.jeda === "alami" && !a.aturan)!.teks).toContain("0,5 detik di widget ini hanya contoh di bawah batas itu");
  });
});

describe("sumber: keputusan uang tetap di primary (kode api-t5 dan baca.txt bagian A)", () => {
  it("kiriman Rp240.000 ke rekan ditolak 422 saldo-kurang, bukan pembayaran, karena satu pembayaran dibatasi Rp200.000", () => {
    const kirim = blokCurl(A).find((b) => b.perintah.includes("POST '/kiriman'"))!;
    expect(kirim.perintah).toContain('"nominal": 240000');
    expect(kirim.teks).toContain("422 Unprocessable Entity");
    expect(kirim.json.type).toBe("/problems/saldo-kurang");
    expect(d.uang.teks).toContain(`kiriman ${rupiah(240000)} ke rekan ditolak karena saldo di primary ${rupiah(215000)}`);
    expect(d.uang.teks).not.toMatch(/bayar Rp240\.000|pembayaran Rp240\.000/);
    expect(d.uang.teks).toContain(`walau saldo tampil ${rupiah(250000)}`);
  });
  it("replika.go: Bayar, Kirim, dan semua pemeriksaan saldo memakai s.repo (primary); sumberTampil hanya untuk bacaan tampil", () => {
    const kode = norm(baca("labs/api-t5/internal/service/replika.go").replace(/^\s*\/\/ ?/gm, ""));
    expect(kode).toContain("Keputusan yang menentukan uang tidak lewat sini: Bayar, Kirim, dan semua pemeriksaan saldo memakai s.repo, yaitu primary.");
    expect(d.uang.teks).toContain("Bayar dan kirim membaca saldo di primary, di dalam transaction");
  });
});

describe("sumber: batas yang dibaca dari kode api-t5", () => {
  const replika = baca("labs/api-t5/internal/service/replika.go");
  const repo = baca("labs/api-t5/internal/repo/replika.go");
  const handler = baca("labs/api-t5/internal/handler/handler.go");
  const dasar = (k: string) => d.batas.filter((b) => b.dasar === k);
  it("komposisi batas: satu Asumsi desain, satu dokumentasi, empat dibaca dari kode", () => {
    expect(["rancangan", "dokumentasi", "kode"].map((k) => dasar(k).length)).toEqual([1, 1, 4]);
  });
  it("token adalah posisi WAL mentah dari pg_current_wal_lsn() dan dibandingkan dengan pg_last_wal_replay_lsn() memakai >=", () => {
    expect(repo).toContain("SELECT pg_current_wal_lsn()::text");
    expect(repo).toContain("SELECT pg_last_wal_replay_lsn() >= $1::pg_lsn");
    expect(d.batas.some((b) => b.teks.startsWith("Token adalah posisi WAL primary mentah dari pg_current_wal_lsn()."))).toBe(true);
  });
  it("token sah yang sangat besar lolos pola LSN, sehingga replica tidak pernah sampai dan server membaca primary; pemilik diperiksa lebih dulu di saldo dan riwayat", () => {
    const pola = /regexp\.MustCompile\(`([^`]+)`\)/.exec(replika)![1]!;
    expect(new RegExp(pola).test("FFFFFFFF/FFFFFFFF")).toBe(true);
    expect(new RegExp(pola).test("bukan-posisi-wal")).toBe(false);
    expect(replika).toContain("sampai, err := s.replika.SampaiLSN(ctx, token)");
    expect(replika.indexOf("peminta != id")).toBeGreaterThan(-1);
    expect(replika.indexOf("peminta != id")).toBeLessThan(replika.indexOf("s.sumberTampil(ctx, token)", replika.indexOf("func (s Service) LihatAkunTampil")));
    const riwayat = baca("labs/api-t5/internal/service/riwayat.go");
    const mulai = riwayat.indexOf("func (s Service) RiwayatTampil");
    expect(riwayat.indexOf("peminta != id", mulai)).toBeGreaterThan(mulai);
    expect(riwayat.indexOf("peminta != id", mulai)).toBeLessThan(riwayat.indexOf("sumberTampil(", mulai));
  });
  it("TokenTulis yang gagal membaca posisi mengembalikan token kosong, dan tanpa token app membaca replica", () => {
    const f = replika.slice(replika.indexOf("func (s Service) TokenTulis"), replika.indexOf("// LihatAkunTampil"));
    expect(f).toMatch(/lsn, err := s\.repo\.LSNTulis\(ctx\)\s+if err != nil \{\s+log\.Printf\("posisi WAL tulis tidak terbaca: %v", err\)\s+return ""\s+\}/);
    expect(replika).toMatch(/token == ""\s*\{\s+return s\.replika, SumberReplika, nil/);
  });
  it("token hanya diberi sesudah COMMIT di bayar dan kirim (dua pemanggil), dan jawaban ulang Idempotency-Key tidak membawanya", () => {
    expect(handler.match(/s\.tandaiTulis\(w, r\)/g)).toHaveLength(2);
    const dalam = (nama: string) => {
      const mulai = handler.indexOf(`func (s Server) ${nama}(`);
      const akhir = handler.indexOf("\nfunc ", mulai + 1);
      return handler.slice(mulai, akhir);
    };
    expect(dalam("bayar")).toContain("s.tandaiTulis(w, r)");
    expect(dalam("kirim")).toContain("s.tandaiTulis(w, r)");
    const idem = baca("labs/api-t5/internal/handler/handler_idempoten.go");
    const ulang = idem.slice(idem.indexOf("case repo.KlaimUlang:"), idem.indexOf("default:", idem.indexOf("case repo.KlaimUlang:")));
    expect(ulang).toContain('w.Header().Set("Content-Type", t.Jenis)');
    expect(ulang).toContain('w.Header().Set("Location", t.Lokasi)');
    expect(ulang).toContain("w.WriteHeader(t.Status)");
    expect(ulang).not.toMatch(/Lsn|LSN|tandaiTulis/);
    expect(ulang.match(/w\.Header\(\)\.Set\(/g)).toHaveLength(2);
    // teks batas menyebut persis dua kepala yang dipulihkan (status, Content-Type, Location, isi): satu nama kepala di kode = satu di teks
    expect(d.batas.find((b) => b.teks.startsWith("Token hanya ada di jawaban pertama"))!.teks).toContain("membawa status, Content-Type, Location, dan isi saja");
  });
  it("tak ada pengaturan synchronous_commit di kode api-t5 (semua berkas teks di luar output)", () => {
    const jelajah = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        if (["output", "node_modules", ".git", "bin"].includes(e.name)) return [];
        const p = path.join(dir, e.name);
        return e.isDirectory() ? jelajah(p) : /\.(go|sql|py|sh|ya?ml|md|txt|toml|mod)$|^Makefile$|^Dockerfile/.test(e.name) ? [p] : [];
      });
    const berkas = jelajah(path.join(AKAR, "labs/api-t5"));
    expect(berkas.length).toBeGreaterThan(20);
    expect(berkas.filter((f) => /synchronous_commit/.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(AKAR, f))).toEqual([]);
    expect(d.batas.some((b) => b.teks.includes("Kode api-t5 tidak mengatur synchronous_commit."))).toBe(true);
  });
});

describe("sumber: rancangan token dari naskah ADR 47", () => {
  const naskah = norm(baca("plan/CERITA-TAHAP-5.md"));
  it("naskah: token dikirim app selama 30 detik (Asumsi) dan jeda replica lebih dari 30 detik memindahkan semua bacaan ke primary", () => {
    expect(naskah).toContain("app mengirimnya di bacaan berikutnya selama 30 detik (Asumsi)");
    expect(naskah).toContain("Jeda replica lebih dari 30 detik: semua bacaan pindah ke primary");
    expect(d.batas[0]!.teks).toContain("Jendela token 30 detik dan aturan jeda lebih dari 30 detik di rancangan tidak dimodelkan.");
  });
  it("naskah menyebut tiga kelas baca dan remote_apply untuk semua commit sebagai opsi yang ditolak", () => {
    expect(naskah).toContain("`remote_apply` untuk semua commit");
    expect(naskah).toContain("`W5-lag` memakai kasus saldo lama sesudah transfer dan jeda replica dari rekaman `t5-replika`");
    expect(naskah).toContain("Pembaca menggeser jeda dan memilih aturan baca (replica biasa, token LSN");
  });
  it("naskah M41: Budi membayar Rp35.000, riwayat dan saldo masih seperti sebelum membayar selama ±2 detik (Ilustrasi)", () => {
    expect(naskah).toContain("Budi membayar Rp35.000 di warung.");
    expect(naskah).toContain("masih seperti sebelum membayar selama ±2 detik");
    expect(d.skenario.bayar).toBe(35000);
    expect(d.jeda.find((j) => j.id === "naskah")!.detik).toBe(2);
  });
});
