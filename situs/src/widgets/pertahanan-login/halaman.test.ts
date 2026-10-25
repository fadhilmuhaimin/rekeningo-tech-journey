// Penjaga angka halaman 2.28 (keputusan 853): angka yang ditulis tangan di halaman MDX, di dua diagram Rantai, dan di teks
// widget harus bisa diturunkan dari rekaman labs/c4-ratelimit/output/login/ratelimit.txt, rekaman
// labs/api-t2/output/pengaman.txt, dan konstanta kode lab (login/main.go). logika.test.ts hanya menjaga angka yang
// dibaca widget; tanpa tes ini, mengubah satu angka di MDX atau di diagram tidak menggagalkan build atau alat ukur mana pun.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { bacaRekaman, hashDuaLapis } from "./logika";
import inti from "../../../data/diagram/t2-login-inti.json";
import urutan from "../../../data/diagram/t2-login-urutan.json";

const akar = path.resolve(__dirname, "../../../..");
const baca = (p: string): string => fs.readFileSync(path.join(akar, p), "utf8");
const rekaman = baca("labs/c4-ratelimit/output/login/ratelimit.txt");
const pengaman = baca("labs/api-t2/output/pengaman.txt");
const kode = baca("labs/c4-ratelimit/login/main.go");
const daftar = baca("labs/c4-ratelimit/login/daftar-bocor.txt");
const halaman = baca("situs/src/content/docs/tahap-2/brute-force.mdx");

const konstanta = (nama: string): number => {
  const m = kode.match(new RegExp(`^\\s*${nama}\\s+(?:uint32|uint8)?\\s*=\\s*(\\d+)`, "m"));
  if (!m) throw new Error(`main.go: konstanta ${nama} tidak ditemukan`);
  return Number(m[1]);
};
const bucket = (nama: string): { kapasitas: number; perMenit: number } => {
  const m = kode.match(new RegExp(`${nama} := pembatasBaru\\((\\d+), (\\d+)\\.0/60\\)`));
  if (!m) throw new Error(`main.go: pembatas ${nama} tidak ditemukan`);
  return { kapasitas: Number(m[1]), perMenit: Number(m[2]) };
};
const ribuan = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const R = bacaRekaman(rekaman);
const D = R["dua-lapis"];
const perIP = bucket("perIP");
const perAkun = bucket("perAkun");
const memoriMiB = konstanta("hashMemori") / 1024;
const t = konstanta("hashWaktu");
const p = konstanta("hashUtas");
const ambang = konstanta("ambangAkun");

const ada = (teks: string, nama: string) => expect(halaman, nama).toContain(teks);

describe("angka halaman 2.28 dari rekaman c4", () => {
  test("Inti dan diagram Inti: 29 tebakan, 10 diperiksa, 19 ditolak", () => {
    ada(`satu alamat menyemprot ${D.percobaan} akun`, "29 akun");
    ada(`mencatat ${D.sampai} tebakan yang sampai ke pemeriksaan password dan ${D.ditolak} yang ditolak 429`, "10 dan 19");
    const simpul = inti.baris.flatMap((b) => b.simpul.map((s) => s.teks));
    expect(simpul).toContain(`${D.sampai} diperiksa`);
    expect(simpul).toContain(`${D.ditolak} ditolak 429`);
    expect(inti.baris.map((b) => b.label)).toContain(`${D.percobaan} tebakan`);
    expect(D.sampai + D.ditolak).toBe(D.percobaan);
  });

  test("hash dan query akun dijalankan sebanyak yang lolos", () => {
    const n = hashDuaLapis(rekaman);
    expect(n).toBe(D.sampai);
    ada(`${n} query akun dan ${n} hash untuk ${D.percobaan} tebakan`, "query dan hash");
  });

  test("bucket: kapasitas dan isi ulang per alamat dan per akun, hitungan kunci per menit", () => {
    ada(`Per alamat: ${perIP.kapasitas} token sekaligus, isi ulang ${perIP.perMenit} per menit. Per akun: ${perAkun.kapasitas} token sekaligus, isi ulang ${perAkun.perMenit} per menit.`, "bucket");
    ada(`satu alamat mendapat ${perIP.perMenit} token per menit`, "token per menit");
    ada(`karena ${perIP.perMenit} ÷ ${ambang} = ${perIP.perMenit / ambang}`, "10 ÷ 5 = 2");
    ada(`Bucket ${perIP.kapasitas} sekaligus ditambah isi ulang ${perIP.perMenit} per menit meloloskan sekitar ${perIP.kapasitas + perIP.perMenit} dan menolak ${100 - (perIP.kapasitas + perIP.perMenit)} dengan 429`, "20 dan 80");
    expect(perIP.kapasitas).toBe(perIP.perMenit);
  });

  test("dua server, header, IPv6", () => {
    const f = R["dua-instance"];
    ada(`${f.sampai} dari ${f.percobaan} tebakan lolos, yaitu ${f.sampai / 2} per server`, "dua server");
    expect(f.sampai / 2).toBe(perIP.kapasitas);
    const x = R["xff-mentah"];
    ada(`${x.percobaan} tebakan dengan ${x.percobaan} alamat palsu lolos semua`, "xff mentah");
    expect(x.sampai).toBe(x.percobaan);
    const q = R["proxy-palsu"];
    ada(`${q.sampai} lolos dan ${q.ditolak} ditolak`, "proxy palsu");
    ada(`mendapat ${2 ** (64 - 56)} bucket`, "256 bucket");
    expect(R.ipv6.sampai).toBe(perIP.kapasitas);
  });

  test("parameter argon2id, memori bersamaan, dan kunci bertahap", () => {
    ada(`t=${t}, p=${p}, m=${memoriMiB} MiB`, "parameter");
    ada(`argon2id: t=${t}, p=${p}, m=${memoriMiB} MiB, salt 128-bit, tag 256-bit`, "aturan 3");
    ada(`${perIP.kapasitas} × ${memoriMiB} MiB = ${perIP.kapasitas * memoriMiB} MiB`, "640 MiB");
    ada(`10 hash bersamaan = ${perIP.kapasitas * 19} MiB [hitungan: 10 × 19 MiB]`, "190 MiB");
    ada(`memori × iterasi hanya ${19 * 2} MiB, lawan ${memoriMiB * t} MiB`, "38 dan 192");
    ada(`${perIP.kapasitas * memoriMiB} MiB menjadi ${ribuan(perIP.kapasitas * 256)} MiB (hitungan ${perIP.kapasitas} × 256 MiB`, "256 MiB");
    const dasar = konstanta("kunciMaksTingkat");
    expect((60 * 2 ** dasar) / 60).toBe(32);
    ada(`ambang ${ambang} gagal berturut-turut, lama 60 detik yang menggandakan sampai ${(60 * 2 ** dasar) / 60} menit`, "kunci bertahap");
  });

  test("daftar password bocor lab dan akun terbuka", () => {
    const entri = daftar.split("\n").filter((b) => b.trim() !== "" && !b.startsWith("#")).length;
    ada(`Daftar lab hanya ${entri} entri.`, "daftar");
    ada(`Karyawan 514`, "akun 514");
    expect(rekaman).toContain("Karyawan 514 di urutan akhir tidak sempat dicoba");
    expect(R["kunci-saja"].terbuka).toBe(1);
  });
});

describe("angka halaman 2.28 dari rekaman api-t2", () => {
  test("104 akun Gedung A wajib ganti password sesudah migration", () => {
    const m = pengaman.match(/Gedung A \|\s+(\d+) \|\s+(\d+)\n\s*kampus/g);
    expect(m, "dua tabel Gedung A").toHaveLength(2);
    const sesudah = m![1]!.match(/Gedung A \|\s+(\d+) \|\s+(\d+)/)!;
    expect(sesudah[1]).toBe(sesudah[2]);
    ada(`menandai ${sesudah[1]} akun Gedung A wajib mengganti password`, "104 akun");
  });

  test("lima tebakan mengunci Ani walau dua lapis: gagal_login 5 dan terkunci", () => {
    const e = pengaman.slice(pengaman.indexOf("# --- E. "), pengaman.indexOf("# --- F. "));
    expect(e).toMatch(/5 x HTTP 401 \/problems\/login-gagal/);
    expect(e).toMatch(/\|\s+5 \| t/);
    expect(e).toMatch(/Retry-After: 12/);
    ada("Kolom `gagal_login` bernilai 5", "gagal_login 5");
    ada("lima jawaban 401, lalu 429 dari batas per akun", "lima 401 lalu 429");
  });

  test("api-t2 masih memakai bcrypt DefaultCost, jadi halaman tidak boleh menulis api-t2 memakai argon2id", () => {
    const sesi = baca("labs/api-t2/internal/service/sesi.go");
    expect(sesi).toContain("bcrypt.DefaultCost");
    expect(sesi).not.toMatch(/argon2/i);
    ada("masih memakai bcrypt", "bcrypt api-t2");
  });
});

describe("diagram urutan", () => {
  test("memuat kunci di ambang dan 60 detik yang sama dengan kode", () => {
    const teks = JSON.stringify(urutan);
    expect(teks).toContain(`ambang ${ambang} tercapai`);
    expect(teks).toContain("kunci 60 detik");
    expect(konstanta("ambangAkun")).toBe(5);
  });
});
