// Tes tambahan peninjau halaman 4.9 (keputusan 1301). Penjaga pelaksana mengunci setiap baris dan menurunkan sebagian besar angka,
// tetapi uji mutasi tanpa kunci baris dan kata (kunci dibangkitkan ulang dari halaman yang dimutasi) meloloskan 21 dari 71 mutan:
// kalimat mekanisme yang punya sumber di rekaman atau kode tetapi tidak diturunkan darinya. Tes di sini menurunkan nilai itu dari
// sumbernya dan membandingkannya dengan kalimat halaman, jadi kunci baris yang dibangkitkan ulang tidak lagi menyembunyikannya.
// Hanya membaca berkas terlacak git.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const akar = path.resolve(__dirname, "../../..");
const terlacak: Set<string> | null = (() => {
  try {
    return new Set(execSync("git ls-files", { cwd: akar, maxBuffer: 1 << 26 }).toString().split("\n"));
  } catch {
    return null;
  }
})();
const baca = (rel: string): string => {
  if (terlacak) expect(terlacak.has(rel), `tes membaca berkas yang tidak terlacak git: ${rel}`).toBe(true);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};
const mdx = baca("situs/src/content/docs/tahap-4/rekonsiliasi-gateway.mdx");
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const rekon = baca("labs/t4-webhook/output/rekon.txt");
const retry = baca("labs/t4-webhook/output/retry.txt");
const urutan = baca("labs/t4-webhook/output/urutan.txt");
const rotasi = baca("labs/t4-infra/output/rotasi.txt");
const runWebhook = baca("labs/t4-webhook/run.py");
const aturanGo = baca("labs/api-t4/internal/service/t4_aturan.go");
const pembayaranGo = baca("labs/api-t4/internal/service/pembayaran.go");
const koreksiGo = baca("labs/api-t4/internal/service/koreksi_rekon.go");
const koreksiRepoGo = baca("labs/api-t4/internal/repo/koreksi_rekon.go");
const repoGo = baca("labs/api-t4/internal/repo/pembayaran.go");
const naskah = baca("plan/CERITA-TAHAP-4.md");
const widget = JSON.parse(baca("situs/lama/widgets/data/t4-rekonsiliasi.json")) as { setup: string; toggles: { label: string; pairs: [string, string][] }[]; predict: { explain: string } };

const titik = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const kata = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];
const harus = (s: string) => expect(badan, `halaman tidak memuat: ${s}`).toContain(s);
const fungsi = (go: string, kepala: string): string => {
  const i = go.indexOf(kepala);
  expect(i, `fungsi tidak ada: ${kepala}`).toBeGreaterThanOrEqual(0);
  const j = go.indexOf("\n}\n", i);
  return go.slice(i, j);
};
const bagianRekaman = (isi: string, awal: RegExp, akhir: RegExp | null): string => {
  const a = isi.search(awal);
  expect(a, `bagian rekaman tidak ada: ${awal}`).toBeGreaterThanOrEqual(0);
  const sisa = isi.slice(a + 1);
  const b = akhir ? sisa.search(akhir) : -1;
  return b < 0 ? sisa : sisa.slice(0, b);
};

describe("batas cek status diturunkan dari kode dan rekaman", () => {
  test("umur 30 menit: konstanta lab, bawaan flag, kueri 'lebih tua dari', dan rekaman 29 lawan 31 menit sama dengan kalimat halaman", () => {
    const m = aturanGo.match(/UmurCekStatus\s*=\s*(\d+) \* time\.Minute/);
    expect(m).not.toBeNull();
    const n = Number(m![1]);
    expect(baca("labs/api-t4/cmd/api/main.go")).toContain("service.UmurCekStatus");
    expect(baca("labs/api-t4/cmd/pembayaran/main.go")).toContain(`30*time.Minute`);
    expect(baca("labs/api-t4/internal/repo/pembayaran.go")).toContain("dibuat < $1");
    expect(rekon).toContain(`interval '${n - 1} minutes'`);
    expect(rekon).toContain(`interval '${n + 1} minutes'`);
    harus(`yang masih \`menunggu\` lebih dari ${n} menit langsung ke gateway`);
    harus(`dan lebih tua dari ${n} menit.`);
    harus(`top-up \`menunggu\` atau \`tidak_pasti\` lebih dari ${n} menit (Asumsi)`);
    harus(`Batas ${n} menit terjaga dari dua sisi.`);
    expect(badan).not.toMatch(/kurang dari \d+ menit langsung/);
    expect(badan).not.toContain(`lebih muda dari ${n} menit`);
  });
  test("gateway ditanya sebelum transaction dibuka: urutan di CekTopup dan KoreksiRekon, dan daftar periksa halaman", () => {
    const cek = fungsi(pembayaranGo, "func (s Service) CekTopup(");
    expect(cek.indexOf("s.t4.Gateway.Status(")).toBeGreaterThan(0);
    expect(cek.indexOf("s.t4.Gateway.Status(")).toBeLessThan(cek.indexOf("s.repo.DalamTx("));
    const kor = fungsi(koreksiGo, "func (s Service) KoreksiRekon(");
    expect(kor.indexOf("s.t4.Gateway.Status(")).toBeLessThan(kor.indexOf("s.koreksiSatu("));
    harus("Gateway ditanya sebelum transaction dibuka, jadi panggilan jaringan tidak memegang lock");
    harus("- [ ] Panggilan ke gateway terjadi sebelum transaction dibuka.");
  });
  test("terapkanStatus: status hanya maju, kabar sama dengan status sekarang dijawab ganda, order tak dikenal jadi gagal, Idempotency-Key = order_id", () => {
    const ts = fungsi(pembayaranGo, "func (s Service) terapkanStatus(");
    expect(pembayaranGo).toContain("Status hanya maju");
    expect(ts).toMatch(/case target == cur:\s*return "ganda"/);
    const cek = fungsi(pembayaranGo, "func (s Service) CekTopup(");
    expect(cek).toMatch(/ErrTidakAda\)\s*\{[\s\S]*?"gagal"/);
    expect(fungsi(pembayaranGo, "func (s Service) kreditTopup(")).toContain("tx.KunciLedger(ctx, tp.OrderID,");
    harus("Karena fungsinya sama, status hanya maju dan jurnal memakai Idempotency-Key `order_id`.");
    harus("Webhook `settlement` yang datang sesudah cek status mengkredit top-up dijawab `ganda`");
    harus("Gateway yang tidak mengenal order membuat top-up menjadi `gagal`");
  });
});

describe("koreksi insiden diturunkan dari kode dan rekaman", () => {
  test("insiden terbuka dikerjakan menurut nomor; tidak ada UPDATE pada posting atau saldo_cache di kode koreksi; status top-up tidak diubah koreksi tidak_di_gateway", () => {
    expect(koreksiRepoGo).toContain("WHERE status = 'terbuka' ORDER BY id");
    harus("Job `-koreksi-rekon` mengerjakan insiden yang masih `terbuka` menurut nomornya.");
    expect(`${koreksiGo}\n${koreksiRepoGo}`).not.toMatch(/UPDATE\s+(posting|buku)\b/i);
    harus("Tidak ada koreksi dengan `UPDATE` pada posting atau `buku.saldo_cache`.");
    const tg = fungsi(koreksiGo, "func (s Service) koreksiTidakDiGateway(");
    expect(tg).not.toMatch(/UbahStatus|UbahTopup/);
    harus("**Sesudah jurnal pembalik, status tetap `dibayar`.**");
  });
  test("selisih negatif tetap terbuka hanya untuk jumlah_beda; tidak_di_gateway yang negatif dikoreksi (rekaman: -30.000 pembalik, -40.000 tanpa jurnal)", () => {
    expect(fungsi(koreksiGo, "func (s Service) koreksiJumlahBeda(")).toContain("in.Selisih <= 0");
    expect(rekon).toContain(" tidak_di_gateway | -40000  | selesai |              | t");
    expect(rekon).toContain(" tidak_di_gateway | -30000  | selesai | pembalik     | t");
    harus("4. Selisih `jumlah_beda` yang negatif dan pembalikan yang membuat saldo negatif tetap terbuka bagi tim risk dan Keuangan.");
    expect(badan).not.toContain("4. Selisih negatif dan pembalikan");
  });
  test("dua job bersamaan: satu jurnal per insiden (run.py) dan jumlah koreksi bersama tiga (rekaman bagian C)", () => {
    expect(runWebhook).toContain('harap([jurnal_order(t["order_id"]) for t in baru], [1, 1, 1], "satu jurnal per order")');
    expect(rekon).toContain("jumlah insiden yang dikoreksi oleh keduanya bersama = 3");
    harus("jadi dua job bersamaan tidak menjurnal dua kali");
    harus("Dua job koreksi yang dijalankan bersamaan atas tiga insiden baru mengoreksi tiga insiden bersama-sama.");
  });
  test("koreksi dijalankan lagi memeriksa satu insiden (rekaman) dan insiden -40.000 adalah order yang settlement-nya bertanggal lain (run.py)", () => {
    const lagi = bagianRekaman(rekon, /\$ \.\/api-t4 -koreksi-rekon {3}# dijalankan lagi/, /\n=>/);
    const diperiksa = Number(lagi.match(/diperiksa (\d+),/)![1]);
    harus(`Menjalankan koreksi lagi hanya memeriksa ${kata[diperiksa]} insiden`);
    expect(runWebhook).toContain("t4 = buat_topup(budi, 40_000)");
    expect(runWebhook).toContain('gateway_bayar(t4["order_id"], tanggal="2020-01-01")');
    harus("Di rekaman, insiden −40.000 hanya soal tanggal settlement.");
    harus("Di lab selisih itu ditutup tanpa jurnal, karena gateway menjawab settlement dengan jumlah yang sama");
  });
  test("insiden yang tetap terbuka sesudah job koreksi di urutan.txt bagian F: tepat dua, dan kalimat halaman menyebut dua", () => {
    const f3 = bagianRekaman(urutan, /# --- F3\./, /\n# --- G\./);
    const sesudah = f3.slice(f3.indexOf("-koreksi-rekon"));
    const terbuka = (sesudah.match(/tidak_di_ledger \| \d+ {2,}\| terbuka/g) ?? []).length;
    expect(terbuka).toBe(2);
    harus(`${kata[terbuka][0]!.toUpperCase()}${kata[terbuka].slice(1)} insiden \`tidak_di_ledger\` tetap terbuka sesudah job koreksi`);
  });
});

describe("rekaman dan hitungan diturunkan", () => {
  test("M30: enam kiriman, semuanya 401 (retry.txt bagian B)", () => {
    const b = bagianRekaman(retry, /# --- B\./, /\n# --- C\./);
    const baris = [...b.matchAll(/^ (\d+) +\| \d+ +\| (\d+)$/gm)];
    expect(baris.length).toBe(6);
    expect(baris.every((x) => x[2] === "401")).toBe(true);
    harus(`gateway mengirim kabar ${kata[baris.length]} kali dan semuanya ditolak 401`);
  });
  test("batas 20 baris di ADR dan 0,4%: dari naskah, bukan dari halaman", () => {
    const m = naskah.match(/selisih harian lebih dari (\d+) baris \(Asumsi; pembanding ([\d.]+) top-up per hari, jadi ([\d,]+)%\)/);
    expect(m).not.toBeNull();
    const [batas, perHari] = [Number(m![1]), Number(m![2]!.replace(/\./g, ""))];
    expect(((batas / perHari) * 100).toString().replace(".", ",")).toBe(m![3]);
    harus(`Selisih harian lebih dari ${batas} baris (Asumsi).`);
    harus(`${batas} ÷ ${titik(perHari)} = ${m![3]}% (Hitungan)`);
    expect(perHari).toBe(20000 * 0.25);
    harus(`(${titik(20000)} user aktif × 0,25, Asumsi)`);
  });
  test("rotasi: urutan aman menurut rotasi.txt bagian D sama dengan kalimat halaman; rahasia pertama adalah yang berlaku sekarang (flag lab)", () => {
    const d = bagianRekaman(rotasi, /# --- D\./, /\n# --- E\./);
    expect(d).toContain("Urutan yang aman: tulis ke OpenBao dulu, tunggu service membacanya");
    expect(d).toContain("baru gateway beralih");
    harus("Secret baru ditulis ke secret manager lebih dulu, service membacanya, dan baru sesudah itu gateway beralih.");
    expect(baca("labs/api-t4/cmd/api/main.go")).toContain("yang pertama dipakai sekarang");
    harus("Secret pertama adalah yang berlaku sekarang, dan yang kedua hanya diterima sebagai masa tumpang tindih:");
    expect(badan).not.toContain("dipakai menandatangani");
  });
  test("widget: jumlah order dan jurnal dari run.py bagian B, dan insiden yang hilang di 'Ubah satu hal' adalah order yang dipindah hari", () => {
    expect(runWebhook).toContain("t3 = buat_topup(budi, 20_000)");
    expect(runWebhook).toContain('gateway_bayar(t3["order_id"], jumlah=25_000)');
    expect(widget.setup).toContain("('budi-2', 'rekon', 25000)");
    expect(widget.setup).toContain("('budi-2', 'rekon', 20000)");
    const [dari] = widget.toggles[0]!.pairs[0]!;
    const order = dari.match(/'([a-z]+-\d)'/)![1]!;
    const jurnal = Number(widget.setup.match(new RegExp(`INSERT INTO jurnal_topup VALUES[^;]*\\('${order}', 'rekon', (\\d+)\\)`))![1]);
    harus(`Settlement \`${order}\` pindah ke hari yang dicocokkan, dan insiden −${titik(jurnal)} hilang.`);
    expect(widget.predict.explain).toContain("Dua dari tujuh order cocok persis.");
  });
  test("klaim negatif lab tanpa rekonsiliasi atas handler pertama: kreditV1 tidak mengisi jurnal_id dan membaca 0 di LedgerTopupTanggal", () => {
    const k = fungsi(pembayaranGo, "func (s Service) kreditV1(");
    expect(k).not.toMatch(/jurnal_id|UbahTopupDibayar|JurnalID/);
    expect(repoGo).toContain("WHERE p.jurnal_id = t.jurnal_id AND p.jumlah > 0), 0)");
  });
});

describe("pemulihan fokus tombol Jalankan di runsql lama", () => {
  test("tombol yang mati selama berjalan mengembalikan fokus ke dirinya (sukses dan gagal), hanya bila ia yang fokus saat ditekan", () => {
    const js = baca("situs/lama/widgets/runsql.js");
    expect(js).toContain("var hadFocus = document.activeElement === runBtn;");
    expect(js.match(/if \(hadFocus\) runBtn\.focus\(\);/g)).toHaveLength(2);
    expect(js.indexOf('runBtn.textContent = "Jalankan ulang";')).toBeLessThan(js.indexOf("if (hadFocus) runBtn.focus();"));
  });
});
