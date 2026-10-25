// Penjaga angka halaman 2.27 (tinjauan #335, keputusan 856): angka yang ditulis tangan di halaman MDX, di diagram Rantai
// t2-m16-kunci.json, di teks widget, dan di dua halaman istilah harus bisa diturunkan dari rekaman
// labs/c4-ratelimit/output/login/ratelimit.txt. logika.test.ts hanya menjaga angka yang dibaca widget; tanpa tes ini,
// mengubah satu angka di MDX, diagram, atau istilah tidak menggagalkan build, tes, atau alat ukur mana pun. Rentang baris
// Snippet juga dijaga: bila rekaman atau main.go bergeser, rentang yang lama menampilkan baris yang salah tanpa galat.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { bacaRekaman } from "./logika";
import labelMentah from "../../../data/widget/t2-m16-kunci.json";
import rantai from "../../../data/diagram/t2-m16-kunci.json";
import stuffing from "../../../data/halaman-istilah/credential-stuffing.json";
import kunciAkun from "../../../data/halaman-istilah/kunci-akun.json";

const akar = path.resolve(__dirname, "../../../..");
const baca = (rel: string) => fs.readFileSync(path.join(akar, rel), "utf8");
const rekaman = baca("labs/c4-ratelimit/output/login/ratelimit.txt");
const baris = rekaman.split("\n");
const goMain = baca("labs/c4-ratelimit/login/main.go").split("\n");
const goMod = baca("labs/c4-ratelimit/login/go.mod");
const skrip = baca("labs/c4-ratelimit/run-login.py");
const halaman = baca("situs/src/content/docs/tahap-2/m16-akun-terkunci.mdx");

const cari = (pola: RegExp, nama: string): RegExpMatchArray => {
  const m = baris.map((b) => b.match(pola)).find((x) => x !== null);
  if (!m) throw new Error(`rekaman: ${nama} tidak ditemukan`);
  return m;
};

const R = bacaRekaman(rekaman);
const sembur = cari(/^ {2}(\d+) akun disemprot dari ([\d.]+) → 200: (\d+) · 401: (\d+)$/, "penyemprotan bagian C");
const akunSemprot = Number(sembur[1]);
const ipPenyerang = sembur[2]!;
const tembus = cari(/^ {2}akun tertembus: \[(\d+)\]/, "akun tertembus")[1]!;
const terkunciC = Number(cari(/^ {2}akun yang terkunci oleh serangan ini: (\d+)/, "akun terkunci oleh penyemprotan")[1]);
const seed515 = cari(/^ {2}karyawan(515)@\S+\s+wajib_ganti_password=t/, "seed akun 515")[1]!;
const d = cari(/^ {2}(\d+) akun disemprot dari [\d.]+ → 401: (\d+) · 429: (\d+)$/, "penyemprotan bagian D");
const dBudi = cari(/^ {2}(\d+) tebakan ke akun Budi dari satu IP\s+→ 401: (\d+) · 429: (\d+)$/, "tebakan ke Budi bagian D");
const g = cari(/^ {2}lima tebakan bersamaan → 401: (\d+)$/, "lima tebakan bersamaan bagian G");
const gDinilai = cari(/^ {2}dinilai terhadap hash asli: (\d+);/, "dinilai terhadap hash asli bagian G")[1]!;
const gAkun = cari(/^Karyawan (\d+) sudah salah 4 kali berturut/, "akun bagian G")[1]!;
const ipAni = skrip.match(/ANI_IP = "([\d.]+)"/)?.[1];

describe("rekaman: angka turunan yang dipakai halaman", () => {
  test("pola pertama: satu tebakan per akun, satu akun terbuka, nol terkunci", () => {
    expect(akunSemprot).toBe(29);
    expect(Number(sembur[3])).toBe(1);
    expect(Number(sembur[4])).toBe(akunSemprot - 1);
    expect(tembus).toBe("514");
    expect(terkunciC).toBe(0);
    expect(seed515).toBe("515");
  });
  test("bagian D dan G: lima dari delapan tebakan sampai ke password, lima tebakan bersamaan satu dinilai", () => {
    expect([Number(dBudi[1]), Number(dBudi[2]), Number(dBudi[3])]).toEqual([8, 5, 3]);
    expect(Number(d[2])).toBe(10);
    expect(Number(g[1])).toBe(R.ambang);
    expect(gDinilai).toBe("1");
    expect(gAkun).toBe("516");
  });
  test("alamat dokumentasi RFC 5737", () => {
    expect(ipPenyerang).toBe("203.0.113.9");
    expect(ipAni).toBe("198.51.100.7");
  });
});

describe("halaman m16-akun-terkunci.mdx: tiap angka turunan dari rekaman", () => {
  const harus = (kalimat: string) => expect(halaman, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
  const [p1, p2, p3] = R.putaran;

  test("Gejala dan Asumsi", () => {
    harus(`${akunSemprot} akun dan lima tebakan, bukan ribuan`);
    harus(`Lima gagal berturut-turut memasang kunci ${p1!.terkunciDetik} detik`);
    harus(`Alamat penyerang ${ipPenyerang} dan alamat Ani ${ipAni} adalah alamat dokumentasi`);
  });

  test("pola pertama dan kedua", () => {
    harus(`rekaman melakukannya ke ${akunSemprot} akun`);
    harus(`Karyawan ${tembus}, memakai ulang password`);
    harus("server menjawab 200 seperti login biasa");
    expect(Number(sembur[3])).toBe(1);
    harus(`server memasang kunci ${p1!.terkunciDetik} detik`);
    harus(`satu tebakan lagi memasang kunci ${p2!.terkunciDetik} detik, lalu ${p3!.terkunciDetik} detik`);
    harus(`status ${p1!.status}, judul "${R.judulJawaban}"`);
  });

  test("password sementara dan bagian D", () => {
    harus(`Karyawan ${seed515} yang masih memakai password sementara`);
    harus(`dari delapan tebakan ke satu akun, lima tetap sampai ke pemeriksaan password`);
    harus(`kunci ${p1!.terkunciDetik} detik. Itu hasil membaca kode`);
  });

  test("Coba sendiri: bagian A sampai G dan bagian C dan G", () => {
    harus("Widget ini memutar ulang bagian C dan G rekaman");
    harus(`penghitung kembali ke nol`);
    expect(R.aniBenar.gagalLogin).toBe(0);
  });

  test("rentang Snippet menunjuk baris yang dimaksud judulnya", () => {
    const baris1 = (n: number) => baris[n - 1] ?? "";
    expect(baris1(12)).toMatch(/^Seed akun/);
    expect(baris1(17)).toMatch(/^ {2}karyawan516\.\.543/);
    expect(baris1(27)).toMatch(/^== C\. /);
    expect(baris1(32)).toMatch(/akun yang terkunci oleh serangan ini: 0/);
    expect(baris1(35)).toMatch(/5 tebakan salah ke akun Ani/);
    expect(baris1(41)).toMatch(/Ani terkunci berulang tiap pagi/);
    expect(baris1(84)).toMatch(/password benar menghapus keduanya/);
    expect(baris1(86)).toMatch(/^== H\. /);
    for (const rentang of ["27:32", "35:41", "12:17", "1:84"]) harus(`lines="${rentang}"`);
    expect(goMain[348]).toMatch(/Kunci per akun di database/);
    expect(goMain[367]).toMatch(/^\t\}$/);
    expect(goMain[366]).toMatch(/return nil, false/);
    harus('lines="349:368"');
  });
});

describe("diagram t2-m16-kunci.json: tiap angka turunan dari rekaman", () => {
  const simpul = rantai.baris.map((b) => ({ label: b.label, sub: b.sub, teks: b.simpul.map((s) => [s.teks, (s as { sub?: string }).sub ?? ""]) }));
  test("baris satu tebakan per akun", () => {
    expect(simpul[0]!.sub).toBe(`${akunSemprot} akun dari satu alamat`);
    expect(simpul[0]!.teks[1]).toEqual(["Kunci tidak pernah aktif", "nol akun terkunci"]);
    expect(terkunciC).toBe(0);
    expect(simpul[0]!.teks[2]).toEqual(["Satu akun terbuka", `Karyawan ${tembus}, jawaban 200`]);
  });
  test("baris lima tebakan ke akun Ani", () => {
    expect(simpul[1]!.label).toBe("Lima tebakan ke akun Ani");
    expect(simpul[1]!.teks[0]![0]).toBe("Lima gagal berturut-turut");
    expect(R.putaran[0]!.tebakan).toBe(5);
    expect(simpul[1]!.teks[1]![0]).toBe(`Kunci ${R.putaran[0]!.terkunciDetik} detik`);
    expect(simpul[1]!.teks[2]).toEqual(["Ani ditolak walau password benar", `${R.putaran[0]!.status}, sama dengan password salah`]);
  });
});

describe("teks widget dan istilah: tiap angka turunan dari rekaman", () => {
  const [p1, p2, p3] = R.putaran;
  test("sumber dan catatan widget menyebut bagian dan akun yang benar", () => {
    expect(labelMentah.sumber).toBe("Rekaman lab · ratelimit.txt bagian C dan G");
    expect(labelMentah.catatan.ani).toContain(`akun Karyawan ${gAkun}`);
    expect(labelMentah.catatan.ani).toContain("{sesudah} detik");
  });
  test("istilah kunci akun", () => {
    const semua = JSON.stringify(kunciAkun);
    expect(kunciAkun.cerita[0]!.teks).toContain(`Lima tebakan salah ke akun Ani memasang kunci ${p1!.terkunciDetik} detik`);
    expect(kunciAkun.cerita[0]!.teks).toContain(`kunci ${p2!.terkunciDetik} detik, lalu ${p3!.terkunciDetik} detik`);
    expect(semua).toContain(`dari ${p1!.terkunciDetik} detik sampai ${R.maksMenit} menit di lab`);
    expect(semua).toContain(`(lima di lab)`);
    expect(R.ambang).toBe(5);
    expect(kunciAkun.stack.go.teks).toContain(`Lima tebakan bersamaan hanya satu yang dinilai`);
    expect(Number(g[1])).toBe(5);
    expect(gDinilai).toBe("1");
    expect(kunciAkun.sumber.find((s) => s.riset === "R2-194")!.catatan).toContain(`kunci ${p1!.terkunciDetik}, ${p2!.terkunciDetik}, dan ${p3!.terkunciDetik} detik`);
  });
  test("istilah credential stuffing", () => {
    const semua = JSON.stringify(stuffing);
    expect(stuffing.stack.go.teks).toContain(`menyemprot ${akunSemprot} akun dengan satu tebakan per akun: satu akun terbuka, nol akun terkunci`);
    expect(stuffing.stack.go.teks).toContain(`ditolak dengan 429 sesudah ${d[2]} percobaan`);
    expect(semua).toContain(`${akunSemprot} akun disemprot, ${terkunciC} terkunci, dan ${sembur[3]} akun terbuka`);
    expect(semua).toContain(`Bagian C: ${akunSemprot} akun disemprot dengan satu tebakan per akun, satu akun terbuka, nol terkunci`);
  });
  test("versi Go, pgx, dan crypto di dua istilah sama dengan go.mod lab", () => {
    const go = goMod.match(/^go (\S+)/m)![1];
    const pgx = goMod.match(/pgx\/v5 (v\S+)/)![1];
    const crypto = goMod.match(/x\/crypto (v\S+)/)![1];
    expect(stuffing.stack.go.versi).toBe(`Go ${go}, pgx ${pgx}, golang.org/x/crypto ${crypto} (go.mod lab)`);
    expect(kunciAkun.stack.go.versi).toBe(`Go ${go}, pgx ${pgx} (go.mod lab)`);
  });
});
