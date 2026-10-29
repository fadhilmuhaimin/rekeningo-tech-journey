// Penjaga halaman 4.4 (keputusan 1278 sampai 1280): angka, nomor ADR, nomor halaman, ID `[[...]]`, label sumber, klaim
// negatif, enam kejadian, tiga hal, rentang Snippet, setiap kalimat di halaman, widget cari-bug, dan diagram Rantai harus
// bisa diturunkan dari naskah Tahap 4 (bagian 3 dan peta), registry cerita.json, rekaman lab (api-t4: rentan.txt, topup.txt;
// t4-webhook: ganda.txt, ganda-serentak.txt, tandatangan.txt, urutan.txt, rekon.txt), kode lab (pembayaran.go, tx.go), dan
// baris riset. Kalimat yang ditulis penulis dan tidak bisa diturunkan dikunci utuh di KALIMAT_PENULIS dan TEKS_WIDGET:
// mengubah satu kata di sana menggagalkan tes, dan itu tanda untuk meninjau ulang klaimnya terhadap sumber. Penjaga ini
// tidak menangkap SALAHNYA kalimat yang terkunci: kalimat rekaman dicocokkan ke kode yang memerankannya di bagian "kode lab".
// Lingkup klaim negatif: halaman ini, widget dan diagramnya, dan bagian 3 naskah Tahap 4 (bukan semua lab).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import kartuMentah from "../../lama/widgets/data/kartu.json";
import diagramMentah from "../../data/diagram/t4-dua-arah-inti.json";
import widgetMentah from "../../data/widget/t4-dua-arah-caribug.json";
import { DataCariBug } from "../widgets/cari-bug/skema";
import { periksa, ringkas } from "../widgets/cari-bug/logika";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";

const akar = path.resolve(__dirname, "../../..");
const baca = (rel: string): string => fs.readFileSync(path.join(akar, rel), "utf8");
const mdx = baca("situs/src/content/docs/tahap-4/dua-arah-pihak-ketiga.mdx");
const front = mdx.split(/^---\n/m)[1]!;
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah4 = baca("plan/CERITA-TAHAP-4.md");
const bag3 = naskah4.split("## 3. Inti teknis Tahap 4")[1]!.split("### Angka beban Tahap 4")[0]!;
const riset = baca("plan/RISET-TAHAP-4.md");
const rentan = baca("labs/api-t4/output/rentan.txt").split("\n");
const topup = baca("labs/api-t4/output/topup.txt").split("\n");
const ganda = baca("labs/t4-webhook/output/ganda.txt").split("\n");
const serentak = baca("labs/t4-webhook/output/ganda-serentak.txt").split("\n");
const tandatangan = baca("labs/t4-webhook/output/tandatangan.txt").split("\n");
const urutan = baca("labs/t4-webhook/output/urutan.txt").split("\n");
const rekon = baca("labs/t4-webhook/output/rekon.txt").split("\n");
const pembayaranSrc = baca("labs/api-t4/internal/service/pembayaran.go").split("\n");
const txGo = baca("labs/api-t4/internal/repo/tx.go");
const widget = DataCariBug.parse(widgetMentah);
const rantai = DataRantai.parse(diagramMentah);
const rantaiTeks = JSON.stringify(diagramMentah);
const widgetTeks = JSON.stringify(widgetMentah);

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; path?: string; peran?: string[]; bagian?: number }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
const di = (sumber: string, nama: string, kalimat: string) => expect(sumber, `${nama} tidak memuat: ${kalimat}`).toContain(kalimat);
const kata = (n: number): string => ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"][n]!;
const rp = (n: number): string => "Rp" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const sel = (t: string) => t.split("|").slice(1, -1).map((c) => c.trim());
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
// Kalimat yang mengandung kata kunci: titik di dalam angka, nama berkas, dan versi tidak memotong kalimat.
const kalimatDengan = (teks: string, pola: string): string[] => {
  const lindung = teks.replace(/(?<=[\w`])\.(?=[\w`])/g, "\u2024");
  return [...lindung.matchAll(new RegExp(`[^.\\n|]*\\b(${pola})\\b[^.\\n|]*\\.`, "gi"))].map((m) => m[0]!.trim().replace(/\u2024/g, "."));
};
const idx = (baris: string[], cocok: (b: string) => boolean, dariIdx = 0): number => {
  const i = baris.findIndex((b, n) => n >= dariIdx && cocok(b));
  expect(i, "baris rekaman tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i;
};
// Nomor baris (1-based) pertama yang cocok, mulai dari baris dariIdx (0-based).
const no = (baris: string[], cocok: (b: string) => boolean, dariIdx = 0): number => idx(baris, cocok, dariIdx) + 1;
const bagianLab = (baris: string[], awal: string, akhir?: string): string[] => {
  const i = idx(baris, (b) => b.startsWith(awal));
  const j = akhir ? idx(baris, (b) => b.startsWith(akhir), i + 1) : baris.length;
  return baris.slice(i, j);
};

// Rekaman rentan.txt (api-t4) bagian A, topup.txt bagian G, dan rekaman t4-webhook.
const bagA = bagianLab(rentan, "# --- A. M29", "# --- B. Mode webhook-cek-tulis");
const bagBrentan = bagianLab(rentan, "# --- B. Mode webhook-cek-tulis");
const bagG = bagianLab(topup, "# --- G. Gateway gagal", "# --- H. Job cek status");
const gandaA = bagianLab(ganda, "# --- A. Handler versi pertama", "# --- B. Versi ADR 34");
const gandaB = bagianLab(ganda, "# --- B. Versi ADR 34");
const serentakA = bagianLab(serentak, "# --- A. Cek-lalu-tulis", "# --- B. Versi ADR 34 tanpa dua lapis");
const serentakB = bagianLab(serentak, "# --- B. Versi ADR 34 tanpa dua lapis");
const tandaB = bagianLab(tandatangan, "# --- B. Isi diubah", "# --- C. Rotasi rahasia");
const urutF1 = bagianLab(urutan, "# --- F1.", "# --- F2.");
const rekonA = bagianLab(rekon, "# --- A. Job cek status", "# --- B. Rekonsiliasi harian");
const rekonB = bagianLab(rekon, "# --- B. Rekonsiliasi harian", "# --- C. Dua job bersamaan");

// Jurnal topup_bank dari tabel SELECT bagian A: (jurnal, buku, jumlah).
const posting = bagA
  .map((b) => b.match(/^ (\d+)\s+\| (bank|karyawan)\s+\| (-?\d+)$/))
  .filter((m): m is RegExpMatchArray => m !== null)
  .map((m) => ({ jurnal: m[1]!, buku: m[2]!, jumlah: Number(m[3]) }));
const jurnalKaryawan = posting.filter((p) => p.buku === "karyawan");
const bayar = jurnalKaryawan[0]!.jumlah;
const naik = jurnalKaryawan.reduce((a, p) => a + p.jumlah, 0);
const palsu = Number(bagA.find((b) => b.includes('"event_id": "evt-palsu"'))!.match(/"jumlah": (\d+)/)![1]);
const transfer = Number(bagG.find((b) => b.includes("/transfers"))!.match(/"nominal": (\d+)/)![1]);

// Naskah: tiga hal, versi pertama, enam kejadian, pertanyaan minggu 2, pola yang kembali.
const tigaHal = [...bag3.matchAll(/^(\d)\. (.+) \(syarat (.+?)\)\.$/gm)].map((m) => ({ n: m[1]!, isi: m[2]!, pemilik: m[3]! }));
const tabelNaskah = bag3.split("\n").filter((b) => b.startsWith("| ") && !b.startsWith("| ---")).map(sel);
const kepalaNaskah = tabelNaskah[0]!;
const barisNaskah = tabelNaskah.slice(1);
const selNaskah = (t: string): { status: "ya" | "tidak" | "na"; isi: string } => {
  if (t === "Tidak berlaku") return { status: "na", isi: "" };
  if (t === "Terjaga") return { status: "ya", isi: "" };
  let m = t.match(/^Terjaga: (.+)$/);
  if (m) return { status: "ya", isi: m[1]! };
  m = t.match(/^Rusak: (.+)$/);
  if (m) return { status: "tidak", isi: m[1]! };
  m = t.match(/^Bergantung pada timeout: (.+)$/);
  if (m) return { status: "ya", isi: `bergantung pada timeout: ${m[1]!}` };
  throw new Error(`sel naskah tidak dikenal: ${t}`);
};
const hasilSel = (b: string[]) => b.slice(1).map(selNaskah);

// ----- fungsi di pembayaran.go (nomor baris diturunkan, bukan ditulis tangan) -----
const rentangFungsi = (judul: string): [number, number] => {
  const i = pembayaranSrc.findIndex((b) => b.startsWith(judul));
  expect(i, `fungsi ${judul}`).toBeGreaterThanOrEqual(0);
  const j = pembayaranSrc.findIndex((b, n) => n > i && b === "}");
  return [i + 1, j + 1];
};

describe("registry, meta, dan susunan blok", () => {
  test("4.4 ada, jenis konsep, jalur inti, prasyarat 4.3, lab t4-webhook, menit sama dengan baris meta", () => {
    expect(dari("t4-dua-arah")).toMatchObject({ ada: true, nomor: "4.4", jenis: "konsep", inti: true, bagian: 3, prasyarat: ["t4-topup-verifikasi"], lab: ["t4-webhook"], tahap: 4, path: "tahap-4/dua-arah-pihak-ketiga.md", peran: ["backend"] });
    expect(dari("t4-topup-verifikasi").nomor).toBe("4.3");
    expect(mdx).toContain('title: "4.4 Dua arah ke pihak ketiga: dipanggil masuk, memanggil keluar"');
    expect(dari("t4-dua-arah").judul).toBe("Dua arah ke pihak ketiga: dipanggil masuk, memanggil keluar");
    const m = badan.match(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t4-topup-verifikasi\]\] · Jalur inti<\/p>/);
    expect(m, "baris meta").not.toBeNull();
    expect(dari("t4-dua-arah").menit).toBe(Number(m![1]) + Number(m![2]));
    expect(naskah4).toContain("| 4.4 | 3 | Dua arah ke pihak ketiga: dipanggil masuk, memanggil keluar | Konsep | ★ | t4-webhook | cari-bug |");
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const k = (isi.match(/\S+/g) ?? []).length;
    const baca = Number(badan.match(/Baca (\d+) menit/)![1]);
    expect(Math.abs(k / 200 - baca), `${k} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
  });
  test("tingkat dan urutan heading: h2 Inti, h3 sisanya", () => {
    const h = badan.split("\n").filter((b) => /^#{1,6} /.test(b));
    expect(h).toEqual(["## Inti", "### Kenapa ini ada", "### Cara kerjanya", "### Trade-off: kapan pakai apa", "### Sengaja belum dilakukan", "### Cek diri", "### Saat me-review kode AI, cek ini", "### Bacaan lanjut"]);
    expect(front).not.toMatch(/^#/m);
  });
  test("tag halaman: tepat satu Rantai ringkas, satu CariBug client:visible, enam Snippet, impor yang dipakai", () => {
    expect(badan.match(/<Rantai /g)).toHaveLength(1);
    expect(badan).toContain("<Rantai data={intiDiagram} ringkas />");
    expect(badan.match(/<CariBug /g)).toHaveLength(1);
    expect(badan).toContain("<CariBug client:visible data={caribug} />");
    expect(badan.match(/<Snippet /g)).toHaveLength(6);
    expect(badan.match(/<Blok /g)).toHaveLength(5);
    expect(badan.match(/^import .*$/gm)).toEqual([
      'import Blok from "../../../components/Blok.astro";',
      'import Rantai from "../../../components/Rantai.astro";',
      'import Snippet from "../../../components/Snippet.astro";',
      'import CariBug from "../../../widgets/cari-bug/CariBug.tsx";',
      'import intiDiagram from "../../../../data/diagram/t4-dua-arah-inti.json";',
      'import caribug from "../../../../data/widget/t4-dua-arah-caribug.json";',
    ]);
    expect(badan.match(/<details class="question">/g)).toHaveLength(1);
    expect(badan.match(/<details class="success">/g)).toHaveLength(4);
    expect(badan.match(/<summary>[^<]+<\/summary>/g)).toEqual(["<summary>Sudah tahu? Cek 3 pertanyaan</summary>", ...Array(4).fill("<summary>Jawaban</summary>")]);
  });
  test("tautan [[id]]: himpunan sama dengan yang diharapkan, dan nomor serta judul sama dengan peta naskah", () => {
    const pakai = new Set([...badan.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]!));
    const harap = ["berikutnya", "t3-dua-tempat", "t3-m18", "t3-pool", "t4-breaker", "t4-m29", "t4-m30", "t4-m31", "t4-m37", "t4-modul", "t4-rekonsiliasi", "t4-topup-verifikasi", "t4-webhook"];
    expect([...pakai].sort()).toEqual([...harap].sort());
    for (const id of harap.filter((x) => x !== "berikutnya")) {
      const h = dari(id);
      expect(naskah4 + baca("plan/CERITA-TAHAP-3.md"), `${id} di naskah`).toMatch(new RegExp(`\\| ${h.nomor!.replace(".", "\\.")} \\| `));
    }
    expect(dari("t4-m29")).toMatchObject({ nomor: "4.6" });
    expect(dari("t4-m30")).toMatchObject({ nomor: "4.8" });
    expect(dari("t4-m31")).toMatchObject({ nomor: "4.10" });
        expect(dari("t4-m37")).toMatchObject({ nomor: "4.22" });
    expect(dari("t4-webhook")).toMatchObject({ nomor: "4.7", adr: [34] });
    expect(dari("t4-rekonsiliasi")).toMatchObject({ nomor: "4.9", adr: [35] });
    expect(dari("t4-breaker")).toMatchObject({ nomor: "4.11", adr: [36] });
    expect(dari("t4-modul")).toMatchObject({ nomor: "4.13", adr: [37] });
    expect(dari("t3-pool")).toMatchObject({ nomor: "3.8", adr: [22] });
    expect(dari("t3-dua-tempat").nomor).toBe("3.4");
  });
});

describe("naskah: tiga hal, versi pertama, enam kejadian, tiga pertanyaan, pola yang kembali", () => {
  test("kalimat inti 'bukan fakta', COMMIT, dan kabar yang bisa datang dua kali sama dengan naskah", () => {
    expect(bag3).toContain("Rekeningo tidak bisa membuat gateway ikut COMMIT atau ROLLBACK.");
    harus("Rekeningo tidak bisa membuat gateway ikut COMMIT atau ROLLBACK.");
    expect(bag3).toContain("**kabar dari gateway**. Kabar itu bisa datang dua kali, terlambat, tidak berurutan, palsu, atau tidak datang sama sekali.");
    harus("Kabar itu bisa datang dua kali, terlambat, tidak berurutan, palsu, atau tidak datang sama sekali.");
    expect(bag3).toContain("Di Tahap 3, uang ada di PostgreSQL dan kabar keluar dari sana.");
    harus("Di Tahap 3 uang ada di PostgreSQL dan kabar keluar dari sana ([[t3-dua-tempat]]).");
    expect(bag3).toContain('"Budi mengisi Rp200.000 dari rekening banknya" berarti uang masuk karena **kabar dari gateway**.');
    harus(`Budi mengisi ${rp(bayar)} dari rekening banknya, dan uangnya masuk karena kabar dari gateway.`);
    expect(naskah4).toContain("**kabar dari luar adalah klaim, bukan fakta**");
    harus("Kabar dari gateway adalah klaim, bukan fakta, dan gateway tidak ikut COMMIT.");
  });
  test("tiga hal: isi dan pemilik syarat sama dengan naskah, di tabel dan di Inti", () => {
    expect(tigaHal.map((h) => h.n)).toEqual(["1", "2", "3"]);
    expect(tigaHal.map((h) => h.pemilik)).toEqual(["Pak Hadi", "Laras", "Direksi, lanjutan Tahap 3"]);
    const judul = ["1. Dicatat satu kali", "2. Dipercaya setelah dicek", "3. Tidak menahan yang lain"];
    expect(kepalaNaskah.slice(1)).toEqual(judul.map((j) => j));
    tigaHal.forEach((h, i) => harus(`| ${judul[i]} | ${h.pemilik} | ${h.isi} |`));
    const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
    const ringkasan = [lower(tigaHal[0]!.isi.split(",")[0]!), lower(tigaHal[1]!.isi.split(":")[0]!), lower(tigaHal[2]!.isi)];
    expect(ringkasan).toEqual(["uang dari luar dicatat satu kali", "kabar dari luar dipercaya hanya sesudah dicek", "pihak luar yang lambat atau mati tidak menahan pembayaran antar akun"]);
    harus(`Tiga hal harus selalu benar: ${ringkasan.join(", ").replace(/, ([^,]+)$/, ", dan $1")}.`);
    expect(widget.tebak.petunjuk).toContain(`Tiga hal itu: ${ringkasan.join(", ").replace(/, ([^,]+)$/, ", dan $1")}.`);
    expect(bag3).toContain("Tiga hal harus selalu benar:");
    expect(widget.kejadian!.hal).toEqual(kepalaNaskah.slice(1));
  });
  test("versi pertama: Nadia dan satu engineer baru, minggu 2, POST /webhooks/pembayaran, tanpa tanda tangan, urutan sama dengan baris kode", () => {
    expect(bag3).toContain("**Versi pertama (minggu 2).** Nadia dan satu engineer baru menulis handler paling pendek. `POST /webhooks/pembayaran` mengurai JSON. Bila `status` bernilai `settlement`, handler memanggil ledger untuk jurnal top-up sebesar jumlah di isi kabar, menandai `topup_bank` sebagai `dibayar`, lalu membalas 200.");
    harus("Minggu 2, Nadia dan satu engineer baru menulis handler paling pendek untuk `POST /webhooks/pembayaran`.");
    expect(bag3).toContain("tidak ada pemeriksaan tanda tangan (gateway tiruan di staging belum menandatangani)");
    harus("Gateway tiruan di staging belum menandatangani kiriman, jadi urutan ini tampak cukup.");
    expect(bag3).toContain("Di staging urutan ini tampak cukup.");
    harus("Handler versi pertama minggu 2 menjurnal top-up bila statusnya `settlement`, artinya pembayaran sudah diterima, lalu membalas 200.");
    // pending dan settlement: arti dari tabel status gateway di kode
    expect(pembayaranSrc.join("\n")).toContain('var statusGateway = map[string]string{"settlement": "dibayar", "pending": "menunggu", "expire": "kedaluwarsa", "failure": "gagal"}');
    harus("Status `pending` berarti pembayaran belum diterima, dan `settlement` berarti sudah.");
    const b = widget.baris;
    const urut = ["json.Unmarshal(", "BeginTx(", "defer tx.Rollback()", 'k.Status == "settlement"', "jurnalTopup(", "ubahStatus(", "tx.Commit()"].map((k) => b.findIndex((x) => x.includes(k)));
    expect(urut.every((i) => i >= 0)).toBe(true);
    expect([...urut].sort((x, y) => x - y)).toEqual(urut);
  });
  test("enam kejadian: nama, kolom, dan isi sel sama dengan naskah, di widget dan di tabel Paham", () => {
    expect(barisNaskah).toHaveLength(6);
    const K = widget.kejadian!;
    expect(K.baris.map((b) => b.nama)).toEqual(barisNaskah.map((b) => b[0]!.replace(/`/g, "")));
    expect(K.status).toEqual({ ya: "Terjaga", tidak: "Rusak", na: "Tidak berlaku" });
    // Status tiap sel di widget = status sel naskah; teks detail ditulis ulang di tiga sel karena naskah memuat klaim
    // yang tidak terekam atau tidak terukur (dikunci di bawah).
    barisNaskah.forEach((b, i) => {
      const harapStatus = hasilSel(b).map((c) => c.status);
      expect(K.baris[i]!.sel.map((c) => c.status), K.baris[i]!.nama).toEqual(harapStatus);
    });
    // Sel yang detailnya persis dari naskah (huruf pertama besar).
    const DITULIS_ULANG = new Set(["0:2", "2:0"]);
    barisNaskah.forEach((b, i) => {
      hasilSel(b).forEach((c, j) => {
        if (DITULIS_ULANG.has(`${i}:${j}`)) return;
        expect(K.baris[i]!.sel[j]!.detail?.toLowerCase(), `${i}:${j}`).toBe(c.isi ? cap(c.isi).toLowerCase() : undefined);
      });
    });
    // Dua sel yang ditulis ulang: naskah menulis "selesai dalam milidetik" (belum diukur) dan "lalu kiriman dibayar berikutnya dikredit lagi" (hanya dari kode).
    expect(barisNaskah[0]![3]).toBe("Terjaga: selesai dalam milidetik");
    expect(K.baris[0]!.sel[2]!.detail).toBe("Handler tidak memanggil pihak luar; lamanya tidak diukur");
    expect(bag3).toContain('"selesai dalam milidetik" belum diukur; hanya batas p95 di `make beban`.');
    expect(barisNaskah[2]![1]).toBe("Rusak: status mundur ke `menunggu`, lalu kiriman `dibayar` berikutnya dikredit lagi");
    expect(K.baris[2]!.sel[0]!.detail).toBe("Status mundur ke menunggu");
    expect(bag3).toContain('Kalimat "kiriman `dibayar` berikutnya dikredit lagi" hanya benar menurut kode `webhookV1`, yang menjurnal tiap settlement.');
    // Tabel Paham: sel naskah apa adanya, kecuali dua sel yang ditulis ulang, tanda kode dibuang, dan "Bergantung pada timeout"
    // menjadi "Terjaga: bergantung pada timeout; ..." (status ya di widget).
    harus(`| ${["Kejadian", ...kepalaNaskah.slice(1)].join(" | ")} |`.replace("Kejadian |", "Kejadian |"));
    const tanpaKode = (t: string) => t.replace(/`/g, "");
    barisNaskah.forEach((b, i) => {
      const sel6 = b.slice(1).map((t, j) => {
        if (i === 0 && j === 2) return "Terjaga: handler tidak memanggil pihak luar; lamanya tidak diukur";
        if (i === 2 && j === 0) return "Rusak: status mundur ke menunggu";
        if (t.startsWith("Bergantung pada timeout: ")) return `Terjaga: bergantung pada timeout; ${t.slice("Bergantung pada timeout: ".length)}`;
        return tanpaKode(t);
      });
      harus(`| ${tanpaKode(b[0]!)} | ${sel6.join(" | ")} |`);
    });
  });
  test("enam sel Rusak: empat hal pertama, dua hal kedua, nol hal ketiga, dihitung dari data; tiga baris bug", () => {
    const K = widget.kejadian!;
    const perHal = K.hal.map((_, j) => K.baris.filter((b) => b.sel[j]!.status === "tidak").length);
    expect(perHal).toEqual([4, 2, 0]);
    harus(`Keenamnya menghasilkan ${kata(perHal.reduce((a, b) => a + b, 0))} sel Rusak: ${kata(perHal[0]!)} untuk hal pertama, ${kata(perHal[1]!)} untuk hal kedua, dan ${kata(perHal[2]!)} untuk hal ketiga.`);
    expect(K.baris).toHaveLength(6);
    harus("Tiga baris yang kamu tandai mengisi keenam kejadian di atas.");
    harus(`<noscript>\n<p>Tanpa JavaScript, baris di atas tidak bisa ditandai. ${kata(widget.bug.length)[0]!.toUpperCase()}${kata(widget.bug.length).slice(1)} baris yang bermasalah adalah baris ${widget.bug[0]! + 1}, baris ${widget.bug[1]! + 1}, dan baris ${widget.bug[2]! + 1}. Hasilnya ada di tabel Enam kejadian di blok Paham.</p>\n</noscript>`);
    expect(badan.indexOf("<noscript>")).toBeGreaterThan(badan.indexOf("<CariBug"));
    expect(badan.indexOf("<noscript>")).toBeLessThan(badan.indexOf('<Blok nama="Paham">'));
    expect(widget.bug).toEqual([2, 11, 15]);
    expect(widget.baris[2]).toContain("json.Unmarshal(body, &k)");
    expect(widget.baris[11]).toContain("jurnalTopup(ctx, tx, k.OrderID, k.Jumlah)");
    expect(widget.baris[15]).toContain("ubahStatus(ctx, tx, k.OrderID, k.Status)");
    expect(widget.alasan["2"]!.startsWith("Hal 2.")).toBe(true);
    expect(widget.alasan["11"]!.startsWith("Hal 1 dan hal 2.")).toBe(true);
    expect(widget.alasan["15"]!.startsWith("Hal 1.")).toBe(true);
    const nama = (j: number) => K.baris.filter((b) => b.sel[j]!.status === "tidak").map((b) => b.nama);
    expect(nama(0)).toEqual(["Kiriman yang sama datang lagi sesudah balasan hilang", "Kabar menunggu datang sesudah dibayar", "Gateway tidak pernah mengirim", "Isi diubah atau kiriman lama diputar ulang"]);
    expect(nama(1)).toEqual(["Kiriman normal, sekali", "Isi diubah atau kiriman lama diputar ulang"]);
    // Tidak ada baris di handler yang menyentuh hal ketiga: tidak ada panggilan jaringan di baris kode.
    expect(widget.baris.filter((b) => /http\.|Client|Do\(|Post\(|Get\(/.test(b))).toEqual([]);
  });
  test("tiga pertanyaan minggu 2 dan jawabannya M29 sampai M31, sama dengan naskah", () => {
    expect(bag3).toContain("Di minggu 2 Laras bertanya siapa yang boleh mengirim ke alamat itu. Pak Hadi bertanya bagaimana ia tahu satu pembayaran di bank sama dengan satu jurnal di ledger. Bayu bertanya apa yang terjadi bila gateway mati sehari.");
    harus("Di minggu 2, tiga pertanyaan ditanam:\n\n- Laras bertanya siapa yang boleh mengirim ke alamat itu.\n- Pak Hadi bertanya bagaimana ia tahu satu pembayaran di bank sama dengan satu jurnal di ledger.\n- Bayu bertanya apa yang terjadi bila gateway mati sehari.\n\nJawabannya ada di [[t4-m29]], [[t4-m30]], dan [[t4-m31]].");
    expect(bag3).toContain("Jawabannya ada di M29 sampai M31.");
  });
  test("pola yang kembali di M31 dan M37 (naskah menulis M33 juga: usulan perubahan), dan aturan source of truth", () => {
    expect(bag3).toContain("Pola ini muncul lagi di layanan verifikasi (M31), file identitas (M33), dan penerbit kartu yang memanggil Rekeningo dengan tenggat 2 detik (M37).");
    // Koreksi pengatur (mengikuti 4.2): M33 membahas ukuran backup (file di bytea), bukan kabar dari luar, jadi halaman memakai M31 dan M37 saja.
    expect(naskah4).toContain("| 4.14 | 4 | M33: Uji pulih mingguan makin lama |");
    expect(badan).not.toMatch(/M33|t4-m33|file identitas/);
    harus("muncul lagi di layanan verifikasi ([[t4-m31]]) dan di penerbit kartu yang memanggil Rekeningo dengan tenggat 2 detik ([[t4-m37]]).");
    expect(bag3).toContain("PostgreSQL tetap satu-satunya source of truth, dan pihak ketiga hanya memberi klaim.");
    harus("PostgreSQL tetap satu-satunya source of truth, dan pihak ketiga hanya memberi klaim.");
    expect(bag3).toContain("Klaim itu dicek, lalu dicatat sekali: dalam transaction yang sama dengan efeknya selama satu proses, atau lewat Idempotency-Key sesudah service pembayaran terpisah (ADR 37).");
    harus("Klaim itu dicek, lalu dicatat sekali: dalam transaction yang sama dengan efeknya selama satu proses, atau lewat Idempotency-Key sesudah service pembayaran terpisah ([[t4-modul]]).");
    for (const m of ["M31 | 4.10", "M37 | 4.22"]) expect(naskah4).toContain(`| ${m.split(" | ")[1]} | 4 | ${m.split(" | ")[0]}:`);
  });
  test("istilah tanda tangan dan byte mentah: arti sama dengan pemakaian di naskah dan lab", () => {
    harus("Tanda tangan di sini adalah kode yang dihitung dari isi kabar dan rahasia yang hanya diketahui gateway dan Rekeningo. Byte mentah adalah isi kabar persis seperti yang tiba, sebelum diurai menjadi JSON.");
    di(tandatangan.join("\n"), "tandatangan.txt", "verifikasi atas byte mentah: cocok");
    di(tandatangan.join("\n"), "tandatangan.txt", "verifikasi atas JSON yang diurai lalu ditulis ulang (json.dumps(json.loads(body))): tidak cocok");
  });
});

describe("rekaman: rentan.txt A, topup.txt G, ganda, serentak, tandatangan, urutan, rekon, dan rentang Snippet", () => {
  test("rentan.txt A: dua kiriman 200 diproses, dua jurnal Rp200.000, saldo naik Rp400.000, event 0; Inti dan Rantai dari angka rekaman", () => {
    expect(bagA).toContain("kiriman event yang sama dua kali, tanpa tanda tangan: 200 diproses, 200 diproses");
    expect(jurnalKaryawan).toHaveLength(2);
    expect(new Set(jurnalKaryawan.map((p) => p.jurnal)).size).toBe(2);
    expect(posting.filter((p) => p.buku === "bank").map((p) => p.jumlah)).toEqual([-bayar, -bayar]);
    expect(naik).toBe(2 * bayar);
    expect(bagA).toContain(`# Dua jurnal untuk satu pembayaran: saldo Budi naik ${rp(naik)} untuk ${rp(bayar)} yang dibayar.`);
    expect(bagA.join("\n")).toMatch(/event_tercatat\n-+\n 0\n/);
    const simpul = rantai.baris[0]!.simpul;
    expect(bagA.find((b) => b.startsWith("kiriman event yang sama dua kali"))!.match(/200 diproses/g)).toHaveLength(2);
    expect(simpul[0]).toMatchObject({ teks: "dikirim 2 kali", sub: `jawaban 200 dua kali, bayar ${rp(bayar)}` });
    expect(simpul[1]).toMatchObject({ teks: "2 jurnal", sub: `${rp(bayar)} dan ${rp(bayar)}`, nada: "warn" });
    expect(simpul[2]).toMatchObject({ teks: `saldo naik ${rp(naik)}`, sub: `bukan ${rp(bayar)}`, nada: "warn" });
  });
  test("rentan.txt A: status kembali ke menunggu sesudah pending; POST tanpa tanda tangan dengan jumlah palsu diterima dan dikreditkan", () => {
    const i = idx(bagA, (b) => b === "=> SELECT status FROM topup_bank WHERE id = 1");
    expect(bagA.slice(i, i + 4).map((b) => b.trim())).toEqual(["=> SELECT status FROM topup_bank WHERE id = 1", "status", "----------", "menunggu"]);
    expect(bagA).toContain("# Kabar pending sesudah dibayar: status mundur ke menunggu (tidak ada status bersyarat).");
    expect(palsu).toBe(1234567);
    expect(bagA.some((b) => b.startsWith("$ curl -i -X POST '/webhooks/pembayaran' -d '{\"event_id\": \"evt-palsu\"") && !b.includes("Authorization"))).toBe(true);
    expect(bagA.join("\n")).toContain('{"hasil":"diproses","jurnal":10203}');
    expect(bagA).toContain(`# POST dari siapa pun diterima, dan jumlah di isi kabar dipercaya: ${rp(palsu)} dikreditkan ke Budi.`);
    expect(palsu).not.toBe(bayar);
    const s = rantai.baris[1]!.simpul;
    expect(s[0]).toMatchObject({ teks: `isi: ${rp(palsu)}`, sub: "bukan jumlah order" });
    expect(s[1]).toMatchObject({ teks: "200 diproses", sub: "pengirim tidak dicek", nada: "warn" });
    expect(s[2]).toMatchObject({ teks: "dikreditkan ke Budi", sub: rp(palsu), nada: "warn" });
    // Kabar pending dikirim skrip lab dan tidak tercetak: tidak ada baris curl untuk evt-101 di bagian A.
    expect(bagA.join("\n")).not.toContain("evt-101");
    expect(baca("labs/api-t4/run.py")).toContain('h = kirim_webhook(event_id="evt-101", order_id=t1["order_id"], status="pending", tanpa_tanda_tangan=True)');
  });
  test("ganda.txt A: event yang sama dua kali berurutan menghasilkan dua jurnal; B: versi lain menjawab 200 ganda dan satu event diproses", () => {
    expect(gandaA).toContain("hasil kiriman: 200 diproses, 200 diproses");
    expect(gandaA.filter((b) => /^ \d+\s+\| karyawan\s+\| 200000$/.test(b))).toHaveLength(2);
    expect(gandaB).toContain("kiriman 1 (koneksi diputus gateway begitu balasan mulai datang): koneksi diputus sesudah balasan mulai datang");
    expect(gandaB).toContain("kiriman 2 (event yang sama): 200 ganda");
    expect(gandaB.some((b) => /^ evt-1\s+\| settlement\s+\| diproses\s+\| t$/.test(b))).toBe(true);
    harus("Balasan yang hilang sebagai pemicu kiriman kedua hanya direkam untuk versi lain (`ganda.txt` bagian B).");
  });
  test("ganda-serentak.txt: cek-lalu-tulis lolos dua kali; kunci utama menahan event_id yang sama; dua event berbeda lolos tanpa lapis cadangan; jeda 300 ms", () => {
    expect(serentakA).toContain("dua kiriman bersamaan, tanda tangan sah (diurutkan): 200 diproses, 200 diproses");
    expect(serentakA.join("\n")).toMatch(/jurnal_topup_bank\n-+\n 2\n/);
    expect(serentakA).toContain("# Celah itu ada di antara membaca status dan menulis jurnal. Jeda lab melebarkannya supaya hasil tidak bergantung pada waktu; lebar celah tanpa jeda tidak diukur dan tidak menjadi klaim.");
    expect(serentakB).toContain("dua kiriman bersamaan, event_id yang sama (diurutkan): 200 diproses, 200 ganda");
    expect(serentakB).toContain("dua event berbeda untuk satu kejadian, berurutan, tanpa dua lapis cadangan: 200 diproses, 200 diproses");
    expect(bagBrentan.join("\n")).toContain("-lab-jeda-cek-tulis 300ms");
    expect(bagBrentan.join("\n")).toContain("dua kiriman bersamaan, tanda tangan sah (diurutkan): 200 diproses, 200 diproses");
    expect(baca("labs/api-t4/internal/service/pembayaran.go")).toContain("// webhookCekTulis: tanda tangan diperiksa, tetapi duplikat dicegah dengan cek-lalu-tulis");
    harus("Lab memasang jeda 300 ms di antara cek dan tulis supaya hasilnya tidak bergantung pada waktu, dan lebar celah tanpa jeda tidak diukur.");
  });
  test("tandatangan.txt B dan urutan.txt F, kasus pertama: isi diubah dan timestamp 360 detik ditolak 401; pending sesudah settlement diparkir, status tetap dibayar", () => {
    expect(tandaB).toContain("isi diubah sesudah ditandatangani (jumlah x10): 401");
    expect(tandaB).toContain("timestamp 360 detik lalu (di luar toleransi): 401");
    expect(urutF1).toContain("kabar pending sesudah settlement: 200 diparkir");
    expect(urutF1.map((b) => b.trim())).toContain("dibayar");
    expect(urutF1.some((b) => /^ evt-f2\s+\| pending\s+\| diparkir$/.test(b))).toBe(true);
    expect(widget.perbaikan.catatan).toContain("isi yang diubah dan timestamp 360 detik lalu ditolak dengan 401 (tandatangan.txt bagian B)");
    expect(widget.perbaikan.catatan).toContain("event yang sama dijawab 200 ganda tanpa jurnal kedua (ganda.txt bagian B)");
    expect(widget.perbaikan.catatan).toContain("kabar pending sesudah settlement diparkir dengan status tetap dibayar (urutan.txt bagian F, kasus pertama)");
  });
  test("rekon.txt A dan B: webhook yang tidak pernah datang ditemukan job cek status (0 dan 29 menit tidak, 31 menit ya) dan rekonsiliasi harian", () => {
    const cek = rekonA.filter((b) => b.startsWith("cek top-up: "));
    expect(cek.map((b) => b.match(/diperiksa (\d+), dikredit (\d+)/)!.slice(1).join("/"))).toEqual(["0/0", "0/0", "1/1"]);
    expect(rekonA.join("\n")).toContain("webhook Citra tidak pernah datang");
    expect(rekonB.join("\n")).toContain("t1: dibayar di bank, webhook hilang.");
    expect(rekonB.some((b) => b.startsWith("rekon <tanggal>: 5 baris di laporan gateway; insiden baru: tidak_di_ledger 2"))).toBe(true);
  });
  test("topup.txt G: gateway mati menjawab 502 dan top-up gagal, transfer tetap 201; gateway menggantung menjawab 202 tidak_pasti; batas 500 ms, bawaan 3 detik", () => {
    expect(topup[3]).toContain("-gateway-timeout 500ms (bawaan 3 detik; dipendekkan supaya rekaman cepat)");
    const mati = bagG.findIndex((b) => b.startsWith("$ curl -i -X POST '/topup-bank'"));
    expect(bagG[mati + 1]).toBe("HTTP/1.1 502 Bad Gateway");
    expect(bagG.some((b) => /^ 5\s+\| gagal\s+\| t\s+\|$/.test(b))).toBe(true);
    expect(bagG).toContain("# Penolakan eksplisit (503, atau koneksi ditolak) = gagal: order belum dibuat di gateway.");
    const tr = bagG.findIndex((b) => b.startsWith("$ curl -i -X POST '/transfers'"));
    expect(bagG[tr + 1]).toBe("HTTP/1.1 201 Created");
    expect(transfer).toBe(25000);
    expect(bagG.join("\n")).toContain('{"id":10205,"saldo":605000}');
    expect(bagG).toContain("# Pembayaran ke warung tetap 201: jalur uang tidak memanggil gateway (ADR 22).");
    expect(bagG).toContain("# gateway tiruan mode setelah-buat-menggantung: order dibuat, jawaban tidak pernah dikirim; client menyerah sesudah 500 ms");
    expect(bagG.some((b) => b === "HTTP/1.1 202 Accepted")).toBe(true);
    expect(bagG.some((b) => /^ 6\s+\| tidak_pasti\s+\| t$/.test(b))).toBe(true);
    expect(bagG).toContain("# Timeout = tidak_pasti, bukan gagal: order mungkin sudah ada di gateway. Pengguna tidak diminta membayar dua kali.");
    harus(`transfer ${rp(transfer)} tetap dijawab 201.`);
    harus("top-up dijawab 502 dan berstatus `gagal`");
  });
  test("kalimat berangka (Cek 3 pertanyaan, kartu Cek diri, butir bukti, Putuskan) memakai angka dan kode status dari rekaman", () => {
    const kode = (baris: string[], awal: string): number => Number(baris.find((b) => b.startsWith(awal))!.match(/HTTP\/1\.1 (\d+)/)![1]);
    const k502 = kode(bagG, "HTTP/1.1 502");
    const k201 = kode(bagG, "HTTP/1.1 201");
    const k202 = kode(bagG, "HTTP/1.1 202");
    const iPalsu = idx(bagA, (b) => b.startsWith("$ curl -i -X POST '/webhooks/pembayaran'"));
    const kPalsu = Number(bagA[iPalsu + 1]!.match(/HTTP\/1\.1 (\d+)/)![1]);
    const dua = kata(jurnalKaryawan.length);
    expect([k502, k201, k202, kPalsu]).toEqual([502, 201, 202, 200]);
    harus(`Gateway mengirim kabar yang sama dua kali, dan saldo Budi naik ${rp(naik)} untuk pembayaran ${rp(bayar)}. Hal mana dari tiga hal yang rusak?`);
    harus(`Seseorang yang bukan gateway mengirim POST dengan jumlah ${rp(palsu)}. Kenapa handler versi pertama menerimanya?`);
    harus(`**1.** Gateway mengirim kabar yang sama dua kali, dan saldo Budi naik ${rp(naik)} untuk ${rp(bayar)}. Hal mana yang rusak, dan apa buktinya?`);
    harus(`Di \`rentan.txt\` bagian A, kiriman yang sama dua kali menghasilkan ${dua} jurnal ${rp(bayar)}.`);
    harus(`**2.** Seseorang mengirim POST berisi jumlah ${rp(palsu)} tanpa tanda tangan.`);
    harus(`Di \`rentan.txt\` bagian A, POST itu dijawab ${kPalsu} dan ${rp(palsu)} dikreditkan ke Budi.`);
    harus(`Di \`topup.txt\` bagian G, gateway dimatikan: top-up dijawab ${k502} dan berstatus \`gagal\`, sedangkan transfer ${rp(transfer)} tetap dijawab ${k201}.`);
    harus(`- **Baris 1, hal 2:** Rekaman lab \`rentan.txt\` bagian A. POST tanpa tanda tangan dijawab ${kPalsu} diproses.`);
    harus(`Di bagian yang sama, POST tanpa tanda tangan dengan jumlah ${rp(palsu)} dijawab ${kPalsu} dan dikreditkan ke Budi:`);
    harus(`Di sisi server, kabar dari gateway adalah jawaban yang sama: klaim yang harus dicek.`);
    harus(`menganggap jawaban ${kPalsu} sebagai bukti uang pindah.`);
    // Putuskan: dua kiriman bersamaan dijawab 200 diproses dan menghasilkan dua jurnal (ganda-serentak.txt A); B menjawab diproses lalu ganda.
    const sA = serentakA.find((b) => b.startsWith("dua kiriman bersamaan"))!;
    expect(sA.match(/200 diproses/g)).toHaveLength(Number(2));
    harus(`Rekaman lab \`ganda-serentak.txt\` bagian A: dua kiriman bersamaan, keduanya dijawab ${kPalsu} diproses, ${kata(Number(serentakA.join("\n").match(/jurnal_topup_bank\n-+\n (\d+)\n/)![1]))} jurnal`);
    const sB = serentakB.find((b) => b.startsWith("dua kiriman bersamaan, event_id yang sama"))!;
    expect(sB).toContain("200 diproses, 200 ganda");
    harus("Rekaman lab `ganda-serentak.txt` bagian B, `tandatangan.txt` bagian B, dan `urutan.txt` bagian F (kasus pertama)");
    harus(`Di \`urutan.txt\` bagian F (kasus pertama), kabar \`pending\` sesudah \`settlement\` dijawab ${kPalsu} diparkir dan status tetap \`dibayar\`.`);
    harus(`Lab memasang jeda ${bagBrentan.join("\n").match(/-lab-jeda-cek-tulis (\d+)ms/)![1]} ms di antara cek dan tulis`);
    harus(`dan rekaman memakai ${topup[3]!.match(/-gateway-timeout (\d+)ms/)![1]} ms supaya cepat.`);
    harus(`batas itu ${topup[3]!.match(/bawaan (\d+) detik/)![1]} detik`);
  });
  test("rentang Snippet diturunkan dari baris rekaman dan fungsi kode, bukan ditulis tangan", () => {
    const [a1, a2] = rentangFungsi("func (s Service) webhookV1(");
    const [b1, b2] = rentangFungsi("func (s Service) kreditV1(");
    harus(`<Snippet file="labs/api-t4/internal/service/pembayaran.go" lines="${a1}:${a2}" lang="go" title="labs/api-t4/internal/service/pembayaran.go" />`);
    harus(`<Snippet file="labs/api-t4/internal/service/pembayaran.go" lines="${b1}:${b2}" lang="go" title="labs/api-t4/internal/service/pembayaran.go" />`);
    expect(pembayaranSrc.slice(a1 - 1, a2).join("\n")).not.toMatch(/\/\/|--8<--/);
    expect(pembayaranSrc.slice(b1 - 1, b2).join("\n")).not.toMatch(/\/\/|--8<--/);
    const kiriman = no(rentan, (b) => b.startsWith("kiriman event yang sama dua kali, tanpa tanda tangan"));
    const empatBaris = no(rentan, (b) => b === "(4 rows)", kiriman - 1);
    harus(`<Snippet file="labs/api-t4/output/rentan.txt" lines="${kiriman}:${empatBaris}" title="Rekaman lab: labs/api-t4/output/rentan.txt" />`);
    const sSt = no(rentan, (b) => b === "=> SELECT status FROM topup_bank WHERE id = 1");
    const sEnd = no(rentan, (b) => b.startsWith("# Kabar pending sesudah dibayar"), sSt - 1);
    const pSt = no(rentan, (b) => b.startsWith("$ curl -i -X POST '/webhooks/pembayaran'"));
    const pEnd = no(rentan, (b) => b.startsWith("# POST dari siapa pun diterima"), pSt - 1);
    harus(`<Snippet files={["labs/api-t4/output/rentan.txt:${sSt}:${sEnd}", "labs/api-t4/output/rentan.txt:${pSt}:${pEnd}"]} title="Rekaman lab: labs/api-t4/output/rentan.txt" />`);
    const mSt = no(topup, (b) => b.startsWith("$ curl -i -X POST '/topup-bank'"), topup.findIndex((b) => b.startsWith("# --- G. ")));
    const mEnd = no(topup, (b) => b.startsWith("# Penolakan eksplisit"), mSt - 1);
    const tSt = no(topup, (b) => b.startsWith("$ curl -i -X POST '/transfers'"), mEnd - 1);
    const tEnd = no(topup, (b) => b.startsWith("# Pembayaran ke warung tetap 201"), tSt - 1);
    harus(`<Snippet files={["labs/api-t4/output/topup.txt:${mSt}:${mEnd}", "labs/api-t4/output/topup.txt:${tSt}:${tEnd}"]} title="Rekaman lab: labs/api-t4/output/topup.txt" />`);
    const gSt = no(topup, (b) => b.startsWith("# gateway tiruan mode setelah-buat-menggantung"), tEnd - 1);
    const gEnd = no(topup, (b) => b.startsWith("# Timeout = tidak_pasti, bukan gagal"), gSt - 1);
    harus(`<Snippet file="labs/api-t4/output/topup.txt" lines="${gSt}:${gEnd}" title="Rekaman lab: labs/api-t4/output/topup.txt" />`);
    // Potongan yang tampil tidak memuat ID riset, nomor keputusan, atau nomor PR.
    for (const [src, a, b] of [[rentan, kiriman, empatBaris], [rentan, sSt, sEnd], [rentan, pSt, pEnd], [topup, mSt, mEnd], [topup, tSt, tEnd], [topup, gSt, gEnd]] as [string[], number, number][]) {
      expect(src.slice(a - 1, b).join("\n")).not.toMatch(/\bR\d-\d+\b|keputusan \d|\bPR #?\d{3}|--8<--/);
    }
  });
});

describe("kode lab: webhookV1, kreditV1, TerimaWebhook, DalamTx, dan bentuk widget", () => {
  const sumber = pembayaranSrc.join("\n");
  const fungsi = (judul: string): string => {
    const [a, b] = rentangFungsi(judul);
    return pembayaranSrc.slice(a - 1, b).join("\n");
  };
  test("webhookV1: satu transaction, settlement menjurnal sebesar jumlah di isi kabar, status ditulis tanpa syarat; tanpa tanda tangan, event, atau key", () => {
    const f = fungsi("func (s Service) webhookV1(");
    expect(f).toContain("s.repo.DalamTx(");
    expect(f).toContain('if k.Status != "settlement" {');
    expect(f).toContain("tx.UbahStatusTanpaSyarat(ctx, k.OrderID, statusGateway[k.Status])");
    expect(f).toContain("s.kreditV1(ctx, tx, tp, k.Jumlah, &h)");
    expect(f).not.toMatch(/PeriksaTandaTangan|CatatEvent|KunciLedger|[Tt]imestamp/);
    const k = fungsi("func (s Service) kreditV1(");
    expect(k).toContain("Jumlah: -jumlah");
    expect(k).toContain("Jumlah: jumlah");
    expect(k).toContain('return tx.UbahStatusTanpaSyarat(ctx, tp.OrderID, "dibayar")');
    expect(k).not.toMatch(/PeriksaTandaTangan|CatatEvent|KunciLedger|tp\.Jumlah/);
    harus("Handler membungkus jurnal dan status dalam satu transaction. Di dalamnya tidak ada yang memeriksa kabarnya. `kreditV1` menjurnal sebesar jumlah di isi kabar, lalu menandai top-up `dibayar` tanpa syarat:");
    harus("Status top-up kembali ke `menunggu`, karena `UbahStatusTanpaSyarat` menulis status tanpa melihat yang sekarang.");
    expect(sumber).toContain("tx.CatatEvent(ctx, k.EventID, k.Status)");
  });
  test("TerimaWebhook: tanda tangan hanya diperiksa bila mode bukan webhook-v1; KabarGateway tanpa timestamp", () => {
    const f = fungsi("func (s Service) TerimaWebhook(");
    expect(f).toContain("if s.rentan != RentanWebhookV1 {\n\t\tif err := s.PeriksaTandaTangan(timestamp, tanda, body); err != nil {");
    expect(f).toContain("return s.webhookV1(ctx, k)");
    const kabar = sumber.split("type KabarGateway struct {")[1]!.split("}")[0]!;
    expect(kabar).not.toMatch(/[Tt]imestamp/);
    expect(kabar.match(/json:"(\w+)"/g)!.map((x) => x.slice(6, -1))).toEqual(["event_id", "order_id", "status", "jumlah"]);
    expect(sumber).toContain("func (s Service) PeriksaTandaTangan(timestamp, tanda string, body []byte) error {");
  });
  test("DalamTx: BeginTx, defer Rollback, fn, Commit; widget memakai bentuk yang sama", () => {
    const urut = ["db.BeginTx(ctx, nil)", "defer tx.Rollback()", "fn(Tx{tx})", "tx.Commit()"].map((k) => txGo.indexOf(k));
    expect(urut.every((i) => i >= 0)).toBe(true);
    expect([...urut].sort((a, b) => a - b)).toEqual(urut);
    expect(widget.baris.some((b) => b.includes("s.db.BeginTx(ctx, nil)"))).toBe(true);
    expect(widget.baris.some((b) => b.trim() === "defer tx.Rollback()")).toBe(true);
    expect(widget.baris.some((b) => b.trim() === "return tx.Commit()")).toBe(true);
  });
  test("perbaikan: tiga bagian berbeda dari versi pertama; fungsi yang dipakai ada di kode lab", () => {
    const p = widget.perbaikan.baris.join("\n");
    expect(p).toContain("periksaTandaTangan(timestamp, tanda, body)");
    expect(p).toContain("tx.CatatEvent(ctx, k.EventID)");
    expect(p).toContain("terapkanStatus(ctx, tx, k.OrderID, k.Status, k.Jumlah)");
    expect(p).not.toMatch(/jurnalTopup|ubahStatus\(/);
    expect(sumber).toContain("func (s Service) terapkanStatus(");
    expect(sumber).toContain("s.PeriksaTandaTangan(");
    expect(baca("labs/api-t4/internal/repo/pembayaran.go")).toContain("func (t Tx) CatatEvent(");
    // Bagian yang sama dengan versi pertama: dua baris pembuka mengurai JSON dan mendeklarasikan variabel.
    expect(widget.perbaikan.baris.filter((b) => widget.baris.includes(b)).length).toBeGreaterThanOrEqual(4);
    harus("Tiga bagian diganti, dan di versi itu handler memeriksa tanda tangan, mencatat event, dan hanya memajukan status.");
  });
});

describe("label, versi, sumber, dan baris riset", () => {
  test("pemakaian pertama label ditautkan ke /cara-pakai/#label-sumber, dan anchor-nya ada", () => {
    harus("Rekaman lab ([Label sumber](/cara-pakai/#label-sumber))");
    expect(badan.indexOf("Rekaman lab ([Label sumber]")).toBeLessThan(badan.indexOf("Tidak dijalankan"));
    expect(badan.slice(0, badan.indexOf("Rekaman lab ([Label sumber]"))).not.toMatch(/Ilustrasi|Tidak dijalankan|Asumsi|\[perlu verifikasi\]/);
    expect(baca("situs/src/content/docs/cara-pakai.mdx")).toMatch(/^#{2,3} Label sumber/m);
    harus("Ilustrasi, yaitu contoh dan bukan hasil sistem");
    expect(baca(".claude/skills/gaya-bahasa/SKILL.md")).toContain("Ilustrasi: skenario atau contoh, bukan hasil sistem");
  });
  test("tiga tautan sumber: URL, versi Go 1.27.1 sama dengan rekaman, dan tanggal dibuka sama dengan baris riset", () => {
    expect(rentan[1]).toContain("go1.27.1");
    expect(topup[1]).toContain("go1.27.1");
    const tautan = [...badan.matchAll(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g)].map((m) => [m[1]!, m[2]!]);
    expect(tautan).toEqual([
      ["dokumentasi notifikasi HTTP sebuah gateway pembayaran", "https://docs.midtrans.com/docs/https-notification-webhooks"],
      ["dokumentasi webhook gateway pembayaran lain", "https://docs.stripe.com/webhooks"],
      ["dokumentasi net/http, Go 1.27.1", "https://pkg.go.dev/net/http@go1.27.1#Client"],
      ["net/http", "https://pkg.go.dev/net/http@go1.27.1#Client"],
      ["Notifikasi HTTP sebuah gateway pembayaran: status, batas tunggu, jadwal ulangan", "https://docs.midtrans.com/docs/https-notification-webhooks"],
      ["Webhook gateway pembayaran lain: urutan, event ganda, retry", "https://docs.stripe.com/webhooks"],
      ["Go: net/http, tipe Client", "https://pkg.go.dev/net/http@go1.27.1#Client"],
    ]);
    // Teks tautan yang sama tidak menuju dua halaman berbeda.
    const peta = new Map<string, string>();
    for (const [t, u] of tautan) { expect(peta.get(t!) ?? u).toBe(u); peta.set(t!, u!); }
    expect(badan).not.toMatch(/satu gateway nyata/);
    const baris = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`))!;
    expect(baris("R4-125")).toContain("docs.midtrans.com/docs/https-notification-webhooks, dibuka 2026-10-29");
    expect(baris("R4-126")).toContain("docs.stripe.com/webhooks, dibuka 2026-10-29");
    expect(baris("R4-127")).toContain("pkg.go.dev/net/http@go1.27.1#Client (dibuka 2026-10-29");
    expect([...badan.matchAll(/dibuka (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1])).toEqual(Array(5).fill("2026-10-29"));
  });
  test("klaim dokumentasi gateway: kalimat halaman ada di baris riset (2xx, lima kali, jeda 2 menit, urutan, ganda, Timeout nol)", () => {
    const baris = (id: string): string => riset.split("\n").find((b) => b.startsWith(`| ${id} |`))!;
    const r125 = baris("R4-125");
    for (const k of ['2XX \\| No retries', '"Other" lima kali', 'at most 5 times', 'jeda ke-1 "2 minutes"', "up-to 15 seconds"]) expect(r125, k).toContain(k);
    const r126 = baris("R4-126");
    for (const k of ["doesn't guarantee the delivery of events in the order", "more than once", "two separate Event objects"]) expect(r126, k).toContain(k);
    const r127 = baris("R4-127");
    expect(r127).toContain("A Timeout of zero means no timeout.");
    harus("Gateway mengulang kiriman yang jawabannya bukan 2xx, paling banyak lima kali, dan jeda pertamanya 2 menit ([dokumentasi notifikasi HTTP sebuah gateway pembayaran](https://docs.midtrans.com/docs/https-notification-webhooks), dibuka 2026-10-29). Gateway pembayaran lain menulis bahwa urutan kabar tidak dijamin dan satu event bisa diterima lebih dari sekali ([dokumentasi webhook gateway pembayaran lain](https://docs.stripe.com/webhooks), dibuka 2026-10-29).");
    harus("Client HTTP Go dengan pengaturan bawaan tidak punya batas waktu, karena nol berarti tanpa batas");
  });
  test("baris riset R4-125 sampai R4-127 urut, tanpa ID ganda, dan tidak ada ID R4 di halaman", () => {
    const ids = [...riset.matchAll(/^\| (R4-\d+) \|/gm)].map((m) => m[1]!);
    expect(new Set(ids).size).toBe(ids.length);
    const n = ids.map((x) => Number(x.slice(3)));
    const i125 = ids.indexOf("R4-125");
    expect(ids.slice(i125, i125 + 3)).toEqual(["R4-125", "R4-126", "R4-127"]);
    expect(n[i125 - 1]!).toBeLessThan(125);
    expect(n[i125 + 3]!).toBeGreaterThan(127);
  });
  test("ADR 22 dan ADR 36 di tabel enam kejadian cocok dengan naskah dan registry; tidak ada nomor ADR lain di halaman kecuali ADR 22 dan 36", () => {
    expect(bag3).toContain("ADR 22 menahannya di 3 detik, dan pengulangannya perlu pengaman sendiri (ADR 36)");
    expect([...new Set([...badan.matchAll(/ADR (\d+)/g)].map((m) => m[1]))].sort()).toEqual(["22", "36"]);
    expect(badan.match(/ADR (\d+)/g)).toEqual(["ADR 22", "ADR 36"]);
    expect(widgetTeks.match(/ADR (\d+)/g)).toEqual(["ADR 22", "ADR 36"]);
  });
  test("ID riset dan ID internal tidak tampil, juga di widget, diagram, dan baris Snippet", () => {
    for (const t of [badan, front, rantaiTeks, widgetTeks]) {
      expect(t).not.toMatch(/\bR\d-\d{2,3}\b/);
      expect(t).not.toMatch(/keputusan \d{2,4}|\bPR #?\d{3}|#\d{3}\b/i);
    }
    expect(badan).not.toMatch(/\b[A-G]\d(\.\d)?\b(?!\))/);
    expect(badan).not.toMatch(/KONSISTENSI|T4-siap|DIRI-\d|EVAL-\d/);
  });
});

describe("widget cari-bug: skema, periksa, ringkas, dan teks", () => {
  test("skema menerima data; periksa menilai tiga baris bug; ringkas mengisi tiga angka", () => {
    const tepat = periksa(widget, new Set([2, 11, 15]));
    expect(tepat).toMatchObject({ tepat: true, jumlahBenar: 3, jumlahBug: 3 });
    const salah = periksa(widget, new Set([2, 11, 18]));
    expect(salah.tepat).toBe(false);
    expect(salah.nilai).toEqual({ 2: "benar", 11: "benar", 15: "lewat", 18: "salah" });
    expect(ringkas(widget.label.ringkas!, tepat)).toBe("Kamu menandai 3 dari 3 baris yang bermasalah, dan 0 baris lain ikut ditandai.");
    expect(ringkas(widget.label.ringkas!, salah)).toBe("Kamu menandai 2 dari 3 baris yang bermasalah, dan 1 baris lain ikut ditandai.");
    expect(Object.keys(widget.aman).map(Number)).toEqual([5, 10, 18]);
    for (const i of Object.keys(widget.aman).map(Number)) expect(widget.bug).not.toContain(i);
  });
  test("skema menolak jumlah sel yang tidak sama dengan jumlah hal", () => {
    const rusak = structuredClone(widgetMentah) as typeof widgetMentah;
    rusak.kejadian.baris[0]!.sel.pop();
    expect(DataCariBug.safeParse(rusak).success).toBe(false);
  });
  test("teks widget yang ditulis penulis dikunci utuh", () => {
    expect({
      id: widget.id,
      judul: widget.judul,
      sumberJenis: widget.sumber.jenis,
      sumberTeks: widget.sumber.teks,
      tebak: widget.tebak,
      alasan: widget.alasan,
      aman: widget.aman,
      label: widget.label,
      kejadianJudul: widget.kejadian!.judul,
      kejadianDetail: widget.kejadian!.baris.map((b) => b.sel.map((c) => c.detail ?? null)),
      perbaikanLabel: widget.perbaikan.label,
      perbaikanCatatan: widget.perbaikan.catatan,
      bahasa: widget.bahasa,
    }).toEqual(TEKS_WIDGET);
    expect(widget.baris).toEqual(BARIS_KODE);
    expect(widget.perbaikan.baris).toEqual(BARIS_PERBAIKAN);
  });
  test("diagram Rantai: rekaman rentan.txt bagian A, dua baris, tiga simpul, akibat berwarna warn, teks dikunci utuh", () => {
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab api-t4, rentan.txt bagian A" });
    expect(rantai.baris.map((b) => [b.label, b.sub])).toEqual([["Dikirim dua kali", "tanpa tanda tangan"], ["Dikirim siapa pun", "tanpa tanda tangan"]]);
    expect(rantai.baris.map((b) => b.simpul.map((s) => s.nada))).toEqual([["biasa", "warn", "warn"], ["biasa", "warn", "warn"]]);
    expect(rantai.judul).toBe("Dua kiriman yang tidak dicek");
    expect(rantai.catatan).toBe("Kotak oranye adalah akibat yang direkam. Kedua baris memakai handler versi pertama dengan gateway tiruan lokal.");
    expect(rantai.id).toBe("t4-dua-arah-inti");
    expect(rantai.baris.map((b) => b.simpul.map((s) => s.sub))).toEqual([["jawaban 200 dua kali, bayar Rp200.000", "Rp200.000 dan Rp200.000", "bukan Rp200.000"], ["bukan jumlah order", "pengirim tidak dicek", "Rp1.234.567"]]);
  });
  test("Rantai ringkas: simpul pendek supaya dua baris muat di HP", () => {
    for (const b of rantai.baris) for (const s of b.simpul) expect(s.teks.length, s.teks).toBeLessThanOrEqual(26);
    expect(rantai.baris).toHaveLength(2);
  });
});

describe("kartu Cek diri: empat kartu sama dengan jawaban di halaman", () => {
  test("kartu.json memuat empat kartu t4-dua-arah yang sama dengan Cek diri", () => {
    const kartu = (kartuMentah as { id: string; halaman: string; judul: string; url: string; tanya: string; jawab: string }[]).filter((k) => k.halaman === "t4-dua-arah");
    expect(kartu.map((k) => k.id)).toEqual(["t4-dua-arah-1", "t4-dua-arah-2", "t4-dua-arah-3", "t4-dua-arah-4"]);
    const pertanyaan = [...badan.matchAll(/^\*\*(\d)\.\*\* (.+)$/gm)].map((m) => m[2]!);
    expect(pertanyaan).toHaveLength(4);
    expect(kartu.map((k) => k.tanya)).toEqual(pertanyaan);
    const jawab = [...badan.matchAll(/<summary>Jawaban<\/summary>\n\n([^<]+?)\n\n<\/details>/g)].map((m) => m[1]!);
    expect(kartu.map((k) => k.jawab)).toEqual(jawab);
    for (const k of kartu) expect([k.judul, k.url]).toEqual(["4.4 Dua arah ke pihak ketiga: dipanggil masuk, memanggil keluar", "tahap-4/dua-arah-pihak-ketiga/"]);
    expect(jawab[0]).toContain(`dua jurnal ${rp(bayar)}`);
    expect(jawab[1]).toContain(`${rp(palsu)} dikreditkan ke Budi`);
    expect(jawab[2]).toContain(`transfer ${rp(transfer)} tetap dijawab 201`);
  });
});

// Baris halaman yang bukan hasil turunan: paragraf, item daftar, sel tabel, judul, dan atribut `aman`. Setiap baris
// harus ada di KALIMAT_PENULIS; setiap entri di KALIMAT_PENULIS harus ada di halaman.
function satuan(b: string): string[] {
  const hasil: string[] = [];
  for (const mentah of b.split("\n")) {
    const l = mentah.trim();
    if (!l || l.startsWith("import ") || l.startsWith("<Snippet") || l.startsWith("<Rantai") || l.startsWith("<CariBug") || l.startsWith('<p class="meta"')) continue;
    if (l.startsWith("</") || l === "<noscript>" || l.startsWith("<details") || l.startsWith("<summary>") || /^\|[-| ]+\|$/.test(l)) continue;
    const aman = l.match(/^<Blok nama="[^"]+"(?: buka)?(?: aman="([^"]+)")?>$/);
    if (aman) {
      if (aman[1]) hasil.push(aman[1]);
      continue;
    }
    if (l.startsWith("|")) {
      for (const c of l.split("|").slice(1, -1)) hasil.push(c.trim());
      continue;
    }
    hasil.push(l.replace(/^#+ /, "").replace(/^(- \[ \] |- |\d+\. )/, ""));
  }
  return hasil;
}

describe("setiap kalimat di halaman punya asal", () => {
  test("tidak ada kalimat yang tidak dikunci", () => {
    expect(satuan(badan).filter((s) => !KALIMAT_PENULIS.includes(s))).toEqual([]);
  });
  test("tidak ada entri terkunci yang sudah hilang dari halaman", () => {
    const ada = new Set(satuan(badan));
    expect(KALIMAT_PENULIS.filter((s) => !ada.has(s))).toEqual([]);
  });
  test("atribut halaman dan judul: kepala dokumen, deskripsi, aman, meta, dan judul blok", () => {
    expect(front).toBe(KEPALA);
    expect(badan.match(/<Blok nama="[^"]+"[^>]*>/g)).toEqual(TAG_BLOK);
    expect(badan.match(/<p class="meta">.*<\/p>/g)).toEqual([`<p class="meta">Baca ${dari("t4-dua-arah").menit! - 3} menit · coba 3 menit · Prasyarat: [[t4-topup-verifikasi]] · Jalur inti</p>`]);
    expect(badan.match(/<Snippet [^>]*\/>/g)!.map((s) => s.replace(/lines="\d+:\d+"/g, 'lines="N"').replace(/:\d+:\d+/g, ":N:N"))).toEqual(TAG_SNIPPET);
  });
  test("setiap tabel punya kepala, garis pemisah dengan jumlah kolom sama, dan baris sama lebar", () => {
    const baris = badan.split("\n");
    let i = 0, tabel = 0;
    while (i < baris.length) {
      if (baris[i]!.startsWith("|")) {
        const mulai = i;
        while (i < baris.length && baris[i]!.startsWith("|")) i++;
        const blok = baris.slice(mulai, i);
        const lebar = sel(blok[0]!).length;
        expect(/^\|[-| ]+\|$/.test(blok[1]!), `pemisah tabel ${tabel}`).toBe(true);
        expect(sel(blok[1]!).length).toBe(lebar);
        for (const b of blok) expect(sel(b).length, b).toBe(lebar);
        tabel++;
      } else i++;
    }
    expect(tabel).toBe(4);
  });
  test("isi tiap tabel dikunci per baris dan kolom: tukar sel atau tukar baris menggagalkan tes", () => {
    const tabel: string[][][] = [];
    let cur: string[][] | null = null;
    for (const l of badan.split("\n")) {
      if (l.startsWith("|")) {
        if (!cur) { cur = []; tabel.push(cur); }
        if (!/^\|[-| ]+\|$/.test(l)) cur.push(sel(l));
      } else cur = null;
    }
    expect(tabel).toEqual(TABEL);
  });
  test("nomor daftar bernomor eksplisit: 1, 2, 3 di Cek 3 pertanyaan dan 1 sampai 4 di Cek diri", () => {
    expect([...badan.matchAll(/^(\d+)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect([...badan.matchAll(/^\*\*(\d+)\.\*\* /gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
  });
  test("kepala tabel dikunci", () => {
    expect(badan.split("\n").filter((b, n, a) => b.startsWith("|") && !(a[n - 1] ?? "").startsWith("|"))).toEqual([
      "| Hal yang harus selalu benar | Syarat dari | Isinya |",
      "| Kejadian | 1. Dicatat satu kali | 2. Dipercaya setelah dicek | 3. Tidak menahan yang lain |",
      "| Cara menerima kabar dari gateway | Yang rusak atau dijaga | Bukti |",
      "| Yang ditunda | Kenapa ditunda | Muncul lagi di |",
    ]);
  });
});

describe("klaim negatif dan klaim universal berlingkup", () => {
  test("tanpa merek nyata di prosa dan judul tautan, tanpa klaim izin atau regulasi, tanpa isi halaman 4.7 dan seterusnya lebih dari arahnya", () => {
    const tanpaUrl = badan.replace(/\]\(https?:[^)]+\)/g, "]");
    const MEREK = /Stripe|Midtrans|Xendit|Mastercard|\bVisa\b|GoPay|OVO|\bDana\b|QRIS|EMVCo|Google Pay|Apple Pay|PayPal|Tokopedia|Shopee/;
    expect(tanpaUrl.match(MEREK)).toBeNull();
    expect(rantaiTeks.match(MEREK)).toBeNull();
    expect(widgetTeks.match(MEREK)).toBeNull();
    expect(badan.match(/\bizin\b|kepatuhan|regulasi|lisensi|\bOJK\b|\bPCI\b|\bGDPR\b|\bKYC\b/i)).toBeNull();
    expect(widgetTeks.match(/\bizin\b|kepatuhan|regulasi/i)).toBeNull();
    // Halaman ini hanya menunjuk ke 4.7: tanpa HMAC, SHA, SKIP LOCKED, atau nama tabel event.
    expect(badan.match(/HMAC|SHA-?\d|SKIP LOCKED|webhook_event|insiden_rekon|gobreaker|half-open/i)).toBeNull();
  });
  test("klaim penuh dicari tandingannya: kata 'selalu', 'tidak pernah', 'semua', 'setiap', 'tak satu pun' hanya di kalimat yang tercatat", () => {
    const prosa = badan.split("\n").filter((b) => !b.startsWith("import ") && !b.startsWith("<")).join("\n");
    const kena = kalimatDengan(prosa, "selalu|tidak pernah|tak satu pun|tidak satu pun|di semua|semua stack|setiap|semua");
    expect(kena).toEqual(KLAIM_PENUH);
    // Kata penuh yang tersisa tiap satu punya sumber: "harus selalu benar" dari naskah, "setiap sel Rusak" dihitung dari data widget.
    expect(bag3).toContain("Tiga hal harus selalu benar:");
    expect(widget.kejadian!.baris.flatMap((b) => b.sel).filter((c) => c.status === "tidak")).toHaveLength(6);
  });
  test("klaim negatif berlingkup: kalimat dengan 'tidak ada', 'belum pernah', 'tanpa', 'hanya' tercatat, dan tiap lingkupnya diperiksa", () => {
    const prosa = badan.split("\n").filter((b) => !b.startsWith("import ") && !b.startsWith("<") && !b.startsWith("|")).join("\n");
    const kena = kalimatDengan(prosa, "tidak ada|belum pernah|tidak satu pun|hanya|tanpa");
    expect(kena).toEqual(KLAIM_NEGATIF);
    // Lingkup: handler ilustrasi di widget tidak memanggil jaringan; rekaman bagian A tidak mencetak perintah pending.
    expect(widget.baris.filter((b) => /http|Client|\.Do\(|\.Post\(/i.test(b))).toEqual([]);
    expect(bagA.join("\n")).not.toContain("evt-101");
    // "tidak ada yang memeriksa kabarnya" (handler versi pertama): fungsi webhookV1 dan kreditV1 tidak memanggil pemeriksaan apa pun.
    const kode = pembayaranSrc.join("\n");
    const a = kode.indexOf("func (s Service) webhookV1(");
    const b = kode.indexOf("// --8<-- [end:webhook-v1]");
    expect(kode.slice(a, b)).not.toMatch(/PeriksaTandaTangan|CatatEvent|KunciLedger|CekTopup|terapkanStatus/);
    // "hanya direkam untuk versi lain" (balasan hilang): lingkup berkas ganda.txt dan topup.txt bagian C.
    expect(ganda.join("\n")).toContain("kiriman 1 (koneksi diputus gateway begitu balasan mulai datang)");
    expect(bagianLab(ganda, "# --- A. Handler versi pertama", "# --- B. Versi ADR 34").join("\n")).not.toContain("koneksi diputus");
  });
});

describe("semua angka di halaman bisa diturunkan", () => {
  test("setiap angka di prosa dan tabel (tanpa kode, tautan, dan nomor ADR) ada di himpunan turunan", () => {
    const boleh = new Set<string>([
      "4.4", "1", "2", "3", "4", "5", "6",
      String(widget.bug.length), String(dari("t4-dua-arah").menit), "3",
      "200", "201", "502", "2xx",
      "2.000", // placeholder tidak dipakai
    ].filter((x) => x !== "2.000"));
    const angkaHalaman = (s: string): string[] => [...s.matchAll(/(?<![\w`.-])(\d[\d.,]*)(?![\w-])/g)].map((m) => m[1]!.replace(/[.,]$/, ""));
    const prosa = badan
      .replace(/\]\(https?:[^)]+\)/g, "]")
      .replace(/`[^`]*`/g, "")
      .replace(/\[\[[^\]]+\]\]/g, "")
      .replace(/ADR \d+/g, "")
      .replace(/^import .*$/gm, "")
      .replace(/<(Snippet|Rantai|CariBug|Blok|p class)[^>]*>/g, "")
      .replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
    const turunan = new Set<string>([
      ...boleh,
      String(bayar).replace(/\B(?=(\d{3})+(?!\d))/g, "."), String(naik).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
      String(palsu).replace(/\B(?=(\d{3})+(?!\d))/g, "."), String(transfer).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
      "300", "500", "10", "1.27.1",
    ]);
    const asing = angkaHalaman(prosa).filter((a) => !turunan.has(a));
    expect(asing).toEqual([]);
  });
  test("angka kunci: 3 detik, 500 ms, 300 ms, 2 menit, lima kali, 3 baris, 6 kejadian sama dengan sumbernya", () => {
    expect(topup[3]).toContain("-gateway-timeout 500ms (bawaan 3 detik");
    expect(bagBrentan.join("\n")).toContain("300ms");
    expect(baca("plan/RISET-TAHAP-4.md")).toContain("jeda ke-1 \"2 minutes\"");
    harus("Di `api-t4` batas itu 3 detik ([[t3-pool]]), dan rekaman memakai 500 ms supaya cepat.");
    expect(widget.bug).toHaveLength(3);
    expect(widget.kejadian!.baris).toHaveLength(6);
    expect(barisNaskah).toHaveLength(6);
  });
});

describe("label kejujuran dan arti istilah", () => {
  test("Ilustrasi di kode widget, Rekaman lab di alasan dan Rantai, Tidak dijalankan di baris 4, dibaca dari kode di baris 5", () => {
    expect(widget.sumber.jenis).toBe("ilustrasi");
    expect(rantai.sumber.jenis).toBe("rekaman");
    expect(widget.label.sumber).toBe("Ilustrasi: ringkasan handler versi pertama");
    for (const k of ["2", "11", "15"]) expect(widget.alasan[k]).toContain("(Rekaman lab rentan.txt bagian A)");
    harus("- **Baris 4, hal 1:** Tidak dijalankan untuk versi pertama, karena versi minggu 2 belum punya job yang menanyakan status ke gateway atau mencocokkan laporannya. Rekaman lab `rekon.txt` bagian A dan B memerankan webhook yang tidak pernah datang pada versi lain.");
    harus("Batas waktu tidak ada karena handler tidak memeriksa timestamp (dibaca dari kode `webhookV1`).");
    harus("Sel Terjaga dan Tidak berlaku adalah penalaran dari urutan kode, bukan rekaman terpisah, kecuali baris 6 yang memakai rekaman `topup.txt` bagian G di atas.");
    harus("Kode di bawah adalah Ilustrasi, yaitu contoh dan bukan hasil sistem: ringkasan handler versi pertama, dengan bentuk transaction yang sama dengan `DalamTx` di lab. Perilakunya direkam di Rekaman lab lewat mode rentan `webhook-v1`.");
  });
  test("istilah gateway, webhook, settlement, pending, Terjaga, dan Rusak diberi arti di pemakaian pertama", () => {
    const intiBlok = badan.slice(badan.indexOf("## Inti"), badan.indexOf("<details"));
    for (const arti of ["layanan pihak ketiga yang memproses pembayaran dari rekening bank", "yaitu request yang memberi tahu status pembayaran berubah", "artinya pembayaran sudah diterima"]) expect(intiBlok, arti).toContain(arti);
    // pending dan Terjaga: pemakaian pertama di halaman adalah kalimat yang mendefinisikannya.
    expect(badan.indexOf("pending")).toBe(badan.indexOf("Status `pending` berarti pembayaran belum diterima") + "Status `".length);
    expect(badan.indexOf("Terjaga")).toBe(badan.indexOf("Terjaga berarti hal itu tetap benar pada kejadian itu, dan Rusak berarti tidak."));
    expect(badan.indexOf("Rusak")).toBeGreaterThan(badan.indexOf("Terjaga berarti"));
    expect(badan.indexOf("Rusak")).toBeLessThan(badan.indexOf("Terjaga berarti") + 90);
  });
});

describe("kalimat prosa tanpa kunci", () => {
  test("tiap baris prosa habis dikunci", () => {
    const prosa = badan.split("\n").filter((b) => b.trim() !== "" && !/^\s*(\||<|import )/.test(b));
    let sisa = prosa.join("\n");
    for (const k of [...KALIMAT_PENULIS].sort((x, y) => y.length - x.length)) sisa = sisa.split(k).join("\u0000");
    const tinggal = sisa.replace(/\u0000/g, " ").replace(/^\s*(?:[-*]|\d+\.|- \[ \])\s+/gm, "").replace(/^#+ /gm, "").replace(/[\s*:.,;()]+/g, " ").replace(/\[ \]/g, "").trim();
    expect(tinggal, "kalimat prosa yang tidak dikunci").toBe("");
  });
});

// ----- Teks yang dikunci utuh (dihasilkan dari halaman, lalu ditinjau satu per satu; ubah di sini hanya bersama sumbernya) -----
const KEPALA = "title: \"4.4 Dua arah ke pihak ketiga: dipanggil masuk, memanggil keluar\"\ndescription: Rekeningo menerima kabar dari gateway dan memanggil gateway, dan gateway tidak ikut COMMIT. Cara paling pendek menulis handler kabarnya tidak menjaga tiga hal yang harus selalu benar.\n";
const TAG_BLOK = [
  "<Blok nama=\"Mulai\" buka>",
  "<Blok nama=\"Coba\" buka aman=\"Kalau berhenti di sini, kamu sudah tahu: tiga baris, mengurai isi tanpa memeriksa pengirimnya, menjurnal tiap kiriman, dan menulis status tanpa syarat, membuat dua dari tiga hal tidak terjaga.\">",
  "<Blok nama=\"Paham\">",
  "<Blok nama=\"Putuskan\">",
  "<Blok nama=\"Kunci\">"
];
const TAG_SNIPPET = [
  "<Snippet file=\"labs/api-t4/internal/service/pembayaran.go\" lines=\"N\" lang=\"go\" title=\"labs/api-t4/internal/service/pembayaran.go\" />",
  "<Snippet file=\"labs/api-t4/internal/service/pembayaran.go\" lines=\"N\" lang=\"go\" title=\"labs/api-t4/internal/service/pembayaran.go\" />",
  "<Snippet file=\"labs/api-t4/output/rentan.txt\" lines=\"N\" title=\"Rekaman lab: labs/api-t4/output/rentan.txt\" />",
  "<Snippet files={[\"labs/api-t4/output/rentan.txt:N:N\", \"labs/api-t4/output/rentan.txt:N:N\"]} title=\"Rekaman lab: labs/api-t4/output/rentan.txt\" />",
  "<Snippet files={[\"labs/api-t4/output/topup.txt:N:N\", \"labs/api-t4/output/topup.txt:N:N\"]} title=\"Rekaman lab: labs/api-t4/output/topup.txt\" />",
  "<Snippet file=\"labs/api-t4/output/topup.txt\" lines=\"N\" title=\"Rekaman lab: labs/api-t4/output/topup.txt\" />"
];
const KLAIM_PENUH = [
  "Tiga hal harus selalu benar: uang dari luar dicatat satu kali, kabar dari luar dipercaya hanya sesudah dicek, dan pihak luar yang lambat atau mati tidak menahan pembayaran antar akun.",
  "Di mode lab lain, gateway membuat order lalu tidak pernah menjawab.",
  "Rekaman lab `rekon.txt` bagian A dan B memerankan webhook yang tidak pernah datang pada versi lain."
];
const KLAIM_NEGATIF = [
  "Tiga hal harus selalu benar: uang dari luar dicatat satu kali, kabar dari luar dipercaya hanya sesudah dicek, dan pihak luar yang lambat atau mati tidak menahan pembayaran antar akun.",
  "Tiga bagian diganti, dan di versi itu handler memeriksa tanda tangan, mencatat event, dan hanya memajukan status.",
  "Tanda tangan di sini adalah kode yang dihitung dari isi kabar dan rahasia yang hanya diketahui gateway dan Rekeningo.",
  "Di dalamnya tidak ada yang memeriksa kabarnya.",
  "Status top-up kembali ke `menunggu`, karena `UbahStatusTanpaSyarat` menulis status tanpa melihat yang sekarang.",
  "Client HTTP Go dengan pengaturan bawaan tidak punya batas waktu, karena nol berarti tanpa batas ([dokumentasi net/http, Go 1.27.1](https://pkg.go.dev/net/http@go1.27.1#Client), dibuka 2026-10-29).",
  "POST tanpa tanda tangan dijawab 200 diproses.",
  "Balasan yang hilang sebagai pemicu kiriman kedua hanya direkam untuk versi lain (`ganda.txt` bagian B).",
  "Settlement berikutnya dikredit lagi karena handler menjurnal tiap settlement tanpa melihat status (`ganda.txt` bagian A).",
  "Jumlah di isi kabar dikreditkan, dan kiriman tanpa tanda tangan diterima.",
  "Batas waktu tidak ada karena handler tidak memeriksa timestamp (dibaca dari kode `webhookV1`).",
  "Aturannya sama: PostgreSQL tetap satu-satunya source of truth, dan pihak ketiga hanya memberi klaim.",
  "Lab memasang jeda 300 ms di antara cek dan tulis supaya hasilnya tidak bergantung pada waktu, dan lebar celah tanpa jeda tidak diukur.",
  "** Seseorang mengirim POST berisi jumlah Rp1.234.567 tanpa tanda tangan.",
  "- [ ] Status hanya maju: kabar yang mundur tidak menimpa status yang sudah lebih jauh.",
  "- [ ] Client ke gateway punya batas waktu eksplisit, karena nol berarti tanpa batas ([net/http](https://pkg.go.dev/net/http@go1.27.1#Client)).",
  "- [ ] Tidak ada panggilan ke gateway di dalam transaction yang memegang lock ([[t3-m18]])."
];
const TEKS_WIDGET = {
  "id": "t4-dua-arah-caribug",
  "judul": "Handler versi pertama minggu 2: terima kabar, jurnalkan, balas 200",
  "sumberJenis": "ilustrasi",
  "sumberTeks": "Ringkasan urutan handler minggu 2 dari naskah Tahap 4 bagian 3. Urutannya sama dengan webhookV1 di labs/api-t4: JSON diurai, settlement dijurnal sebesar jumlah di isi kabar, dan status ditulis tanpa syarat. Bentuk BeginTx, defer Rollback, dan Commit sama dengan DalamTx di lab; kunci baris dan nama fungsi disederhanakan. Perilakunya direkam di rentan.txt bagian A lewat mode rentan webhook-v1.",
  "tebak": {
    "q": "Tiga baris di handler ini membuat dua dari tiga hal yang harus selalu benar tidak lagi terjaga. Baris mana?",
    "petunjuk": "Tiga hal itu: uang dari luar dicatat satu kali, kabar dari luar dipercaya hanya sesudah dicek, dan pihak luar yang lambat atau mati tidak menahan pembayaran antar akun. Untuk tiap baris, tanya: kalau kabar ini datang dua kali, datang dari siapa pun, atau datang sesudah kabar yang lebih baru, hal mana yang rusak?"
  },
  "alasan": {
    "2": "Hal 2. Tidak ada baris sebelum ini yang memeriksa tanda tangan atau timestamp, jadi byte yang tiba langsung dipercaya sebagai kabar gateway. Di rekaman, POST tanpa tanda tangan dengan jumlah Rp1.234.567 dijawab 200 diproses (Rekaman lab rentan.txt bagian A).",
    "11": "Hal 1 dan hal 2. Tiap kabar settlement menjurnal lagi, tanpa memeriksa apakah event atau order itu sudah dijurnal, dan jumlahnya diambil dari isi kabar. Di rekaman, event yang sama dua kali menghasilkan dua jurnal Rp200.000, dan jumlah Rp1.234.567 dari POST tanpa tanda tangan dikreditkan ke Budi (Rekaman lab rentan.txt bagian A).",
    "15": "Hal 1. Status ditulis tanpa syarat, jadi kabar pending yang datang sesudah settlement menimpa status dibayar. Di rekaman, status top-up kembali ke menunggu (Rekaman lab rentan.txt bagian A)."
  },
  "aman": {
    "5": "BeginTx membuka transaction untuk jurnal dan status. Baris ini bukan masalahnya: keduanya ikut satu COMMIT atau batal bersama. Yang menentukan adalah apa yang ditulis di dalamnya tanpa dicek.",
    "10": "Hanya kabar settlement yang menjurnal, dan itu benar. Yang kurang adalah pemeriksaan apakah kabar ini sudah pernah diproses.",
    "18": "COMMIT di akhir sudah tepat untuk data di PostgreSQL. Yang salah adalah apa yang ditulis sebelum COMMIT tanpa dicek."
  },
  "label": {
    "sumber": "Ilustrasi: ringkasan handler versi pertama",
    "tebakDulu": "Tebak dulu:",
    "perintah": "Klik baris yang membuat paling sedikit satu dari tiga hal tidak terjaga, lalu Periksa.",
    "periksa": "Periksa tanda saya",
    "ulang": "Ulang",
    "benar": "sumber masalah",
    "lewat": "terlewat",
    "salahTanda": "baris ini tidak salah",
    "perbaikanTombol": "Lihat versi benar",
    "ringkas": "Kamu menandai {benar} dari {bug} baris yang bermasalah, dan {salah} baris lain ikut ditandai."
  },
  "kejadianJudul": "Enam kejadian di versi pertama",
  "kejadianDetail": [
    [
      null,
      "POST dari siapa pun diterima",
      "Handler tidak memanggil pihak luar; lamanya tidak diukur"
    ],
    [
      "Jurnal kedua dengan jumlah yang sama",
      null,
      null
    ],
    [
      "Status mundur ke menunggu",
      null,
      null
    ],
    [
      "Uang ada di bank, tidak ada jurnal, tidak ada yang tahu",
      null,
      null
    ],
    [
      "Jumlah di isi dipercaya",
      "Tanpa tanda tangan dan tanpa batas waktu",
      null
    ],
    [
      null,
      null,
      "Bergantung pada timeout: ADR 22 menahannya di 3 detik, dan pengulangannya perlu pengaman sendiri (ADR 36)"
    ]
  ],
  "perbaikanLabel": "Tiga bagian diganti: periksa dulu, catat event, status hanya maju",
  "perbaikanCatatan": "Tanda tangan diperiksa atas byte mentah sebelum JSON diurai, event dicatat dengan kunci utama di transaction yang sama dengan efeknya, dan status hanya maju. Di rekaman versi ini, isi yang diubah dan timestamp 360 detik lalu ditolak dengan 401 (tandatangan.txt bagian B), event yang sama dijawab 200 ganda tanpa jurnal kedua (ganda.txt bagian B), dan kabar pending sesudah settlement diparkir dengan status tetap dibayar (urutan.txt bagian F, kasus pertama). Caranya dan kapan ia salah ada di halaman 4.7.",
  "bahasa": "go"
};
const BARIS_KODE = [
  "func (s Service) TerimaWebhook(ctx context.Context, body []byte) error {",
  "\tvar k KabarGateway",
  "\tif err := json.Unmarshal(body, &k); err != nil {",
  "\t\treturn ErrValidasi",
  "\t}",
  "\ttx, err := s.db.BeginTx(ctx, nil)",
  "\tif err != nil {",
  "\t\treturn err",
  "\t}",
  "\tdefer tx.Rollback()",
  "\tif k.Status == \"settlement\" {",
  "\t\tif err := jurnalTopup(ctx, tx, k.OrderID, k.Jumlah); err != nil {",
  "\t\t\treturn err",
  "\t\t}",
  "\t}",
  "\tif err := ubahStatus(ctx, tx, k.OrderID, k.Status); err != nil {",
  "\t\treturn err",
  "\t}",
  "\treturn tx.Commit()",
  "}"
];
const BARIS_PERBAIKAN = [
  "func (s Service) TerimaWebhook(ctx context.Context, body []byte, timestamp, tanda string) error {",
  "\tif err := periksaTandaTangan(timestamp, tanda, body); err != nil {",
  "\t\treturn err",
  "\t}",
  "\tvar k KabarGateway",
  "\tif err := json.Unmarshal(body, &k); err != nil {",
  "\t\treturn ErrValidasi",
  "\t}",
  "\treturn s.repo.DalamTx(ctx, func(tx Tx) error {",
  "\t\tbaru, err := tx.CatatEvent(ctx, k.EventID)",
  "\t\tif err != nil || !baru {",
  "\t\t\treturn err",
  "\t\t}",
  "\t\treturn terapkanStatus(ctx, tx, k.OrderID, k.Status, k.Jumlah)",
  "\t})",
  "}"
];
const TABEL: string[][][] = [
  [
    [
      "Hal yang harus selalu benar",
      "Syarat dari",
      "Isinya"
    ],
    [
      "1. Dicatat satu kali",
      "Pak Hadi",
      "Uang dari luar dicatat satu kali, walau kabarnya datang dua kali, terlambat, atau tidak berurutan"
    ],
    [
      "2. Dipercaya setelah dicek",
      "Laras",
      "Kabar dari luar dipercaya hanya sesudah dicek: tanda tangan atas byte mentah, dan status ke sumbernya bila ada keraguan"
    ],
    [
      "3. Tidak menahan yang lain",
      "Direksi, lanjutan Tahap 3",
      "Pihak luar yang lambat atau mati tidak menahan pembayaran antar akun"
    ]
  ],
  [
    [
      "Kejadian",
      "1. Dicatat satu kali",
      "2. Dipercaya setelah dicek",
      "3. Tidak menahan yang lain"
    ],
    [
      "Kiriman normal, sekali",
      "Terjaga",
      "Rusak: POST dari siapa pun diterima",
      "Terjaga: handler tidak memanggil pihak luar; lamanya tidak diukur"
    ],
    [
      "Kiriman yang sama datang lagi sesudah balasan hilang",
      "Rusak: jurnal kedua dengan jumlah yang sama",
      "Tidak berlaku",
      "Terjaga"
    ],
    [
      "Kabar menunggu datang sesudah dibayar",
      "Rusak: status mundur ke menunggu",
      "Tidak berlaku",
      "Terjaga"
    ],
    [
      "Gateway tidak pernah mengirim",
      "Rusak: uang ada di bank, tidak ada jurnal, tidak ada yang tahu",
      "Tidak berlaku",
      "Terjaga"
    ],
    [
      "Isi diubah atau kiriman lama diputar ulang",
      "Rusak: jumlah di isi dipercaya",
      "Rusak: tanpa tanda tangan dan tanpa batas waktu",
      "Terjaga"
    ],
    [
      "Gateway tidak menjawab saat Rekeningo membuat top-up",
      "Tidak berlaku",
      "Tidak berlaku",
      "Terjaga: bergantung pada timeout; ADR 22 menahannya di 3 detik, dan pengulangannya perlu pengaman sendiri (ADR 36)"
    ]
  ],
  [
    [
      "Cara menerima kabar dari gateway",
      "Yang rusak atau dijaga",
      "Bukti"
    ],
    [
      "Terima dan percaya isi kabar (versi pertama)",
      "Hal 1 dan hal 2 rusak, di kejadian berbeda",
      "Rekaman lab `rentan.txt` bagian A"
    ],
    [
      "Periksa tanda tangan, lalu cek status dan tulis (cek-lalu-tulis)",
      "Hal 2 terjaga; hal 1 rusak untuk dua kiriman bersamaan",
      "Rekaman lab `ganda-serentak.txt` bagian A: dua kiriman bersamaan, keduanya dijawab 200 diproses, dua jurnal"
    ],
    [
      "Periksa tanda tangan, lalu catat event dengan kunci utama di transaction yang sama dengan efeknya",
      "Hal 2 terjaga. Hal 1 terjaga untuk id event yang sama; untuk dua event berbeda, kunci utama saja tidak cukup",
      "Rekaman lab `ganda-serentak.txt` bagian B, `tandatangan.txt` bagian B, dan `urutan.txt` bagian F (kasus pertama)"
    ]
  ],
  [
    [
      "Yang ditunda",
      "Kenapa ditunda",
      "Muncul lagi di"
    ],
    [
      "Tanda tangan, tabel event, dan status yang hanya maju",
      "Halaman ini hanya merumuskan pertanyaan Laras",
      "[[t4-webhook]]"
    ],
    [
      "Mencocokkan catatan sendiri dengan laporan gateway",
      "Jawaban untuk pertanyaan Pak Hadi",
      "[[t4-rekonsiliasi]]"
    ],
    [
      "Retry, circuit breaker, dan lajur per pihak ketiga",
      "Jawaban untuk pertanyaan Bayu",
      "[[t4-breaker]]"
    ]
  ]
];
const KALIMAT_PENULIS: string[] = [
  "Inti",
  "Kabar dari gateway adalah klaim, bukan fakta, dan gateway tidak ikut COMMIT.",
  "Rekeningo berhubungan dengan gateway, layanan pihak ketiga yang memproses pembayaran dari rekening bank, dalam dua arah. Gateway mengirim webhook ke Rekeningo, yaitu request yang memberi tahu status pembayaran berubah, dan Rekeningo memanggil gateway untuk membuat top-up. Handler versi pertama minggu 2 menjurnal top-up bila statusnya `settlement`, artinya pembayaran sudah diterima, lalu membalas 200. Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) memerankannya dengan mode rentan `webhook-v1`.",
  "Tiga hal harus selalu benar: uang dari luar dicatat satu kali, kabar dari luar dipercaya hanya sesudah dicek, dan pihak luar yang lambat atau mati tidak menahan pembayaran antar akun. Handler ini melanggar hal pertama dan hal kedua. Hal ketiga bergantung pada arah sebaliknya, yaitu panggilan Rekeningo ke gateway.",
  "Gateway mengirim kabar yang sama dua kali, dan saldo Budi naik Rp400.000 untuk pembayaran Rp200.000. Hal mana dari tiga hal yang rusak?",
  "Seseorang yang bukan gateway mengirim POST dengan jumlah Rp1.234.567. Kenapa handler versi pertama menerimanya?",
  "Gateway mati saat Budi membuat top-up. Kenapa transfer Budi tetap selesai?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "Kalau berhenti di sini, kamu sudah tahu: tiga baris, mengurai isi tanpa memeriksa pengirimnya, menjurnal tiap kiriman, dan menulis status tanpa syarat, membuat dua dari tiga hal tidak terjaga.",
  "Minggu 2, Nadia dan satu engineer baru menulis handler paling pendek untuk `POST /webhooks/pembayaran`. Gateway tiruan di staging belum menandatangani kiriman, jadi urutan ini tampak cukup. Status `pending` berarti pembayaran belum diterima, dan `settlement` berarti sudah.",
  "Kode di bawah adalah Ilustrasi, yaitu contoh dan bukan hasil sistem: ringkasan handler versi pertama, dengan bentuk transaction yang sama dengan `DalamTx` di lab. Perilakunya direkam di Rekaman lab lewat mode rentan `webhook-v1`.",
  "<p>Tanpa JavaScript, baris di atas tidak bisa ditandai. Tiga baris yang bermasalah adalah baris 3, baris 12, dan baris 16. Hasilnya ada di tabel Enam kejadian di blok Paham.</p>",
  "Tiga baris yang kamu tandai mengisi keenam kejadian di atas. Terjaga berarti hal itu tetap benar pada kejadian itu, dan Rusak berarti tidak. Keenamnya menghasilkan enam sel Rusak: empat untuk hal pertama, dua untuk hal kedua, dan nol untuk hal ketiga.",
  "**Ubah satu hal:** tekan Lihat versi benar sesudah memeriksa. Tiga bagian diganti, dan di versi itu handler memeriksa tanda tangan, mencatat event, dan hanya memajukan status.",
  "Kenapa ini ada",
  "Di Tahap 3 uang ada di PostgreSQL dan kabar keluar dari sana ([[t3-dua-tempat]]). Di Tahap 4 arahnya bertambah. Budi mengisi Rp200.000 dari rekening banknya, dan uangnya masuk karena kabar dari gateway.",
  "Kabar itu bisa datang dua kali, terlambat, tidak berurutan, palsu, atau tidak datang sama sekali. Rekeningo tidak bisa membuat gateway ikut COMMIT atau ROLLBACK. Dari dua kalimat itu lahir tiga hal yang harus selalu benar, masing-masing dengan pemilik syaratnya:",
  "Hal yang harus selalu benar",
  "Syarat dari",
  "Isinya",
  "1. Dicatat satu kali",
  "Pak Hadi",
  "Uang dari luar dicatat satu kali, walau kabarnya datang dua kali, terlambat, atau tidak berurutan",
  "2. Dipercaya setelah dicek",
  "Laras",
  "Kabar dari luar dipercaya hanya sesudah dicek: tanda tangan atas byte mentah, dan status ke sumbernya bila ada keraguan",
  "3. Tidak menahan yang lain",
  "Direksi, lanjutan Tahap 3",
  "Pihak luar yang lambat atau mati tidak menahan pembayaran antar akun",
  "Tanda tangan di sini adalah kode yang dihitung dari isi kabar dan rahasia yang hanya diketahui gateway dan Rekeningo. Byte mentah adalah isi kabar persis seperti yang tiba, sebelum diurai menjadi JSON.",
  "Di minggu 2, tiga pertanyaan ditanam:",
  "Laras bertanya siapa yang boleh mengirim ke alamat itu.",
  "Pak Hadi bertanya bagaimana ia tahu satu pembayaran di bank sama dengan satu jurnal di ledger.",
  "Bayu bertanya apa yang terjadi bila gateway mati sehari.",
  "Jawabannya ada di [[t4-m29]], [[t4-m30]], dan [[t4-m31]].",
  "Cara kerjanya",
  "**Dipanggil masuk: handler versi pertama.** Handler membungkus jurnal dan status dalam satu transaction. Di dalamnya tidak ada yang memeriksa kabarnya. `kreditV1` menjurnal sebesar jumlah di isi kabar, lalu menandai top-up `dibayar` tanpa syarat:",
  "**Kiriman yang sama dua kali.** Gateway mengulang kiriman yang jawabannya bukan 2xx, paling banyak lima kali, dan jeda pertamanya 2 menit ([dokumentasi notifikasi HTTP sebuah gateway pembayaran](https://docs.midtrans.com/docs/https-notification-webhooks), dibuka 2026-10-29). Gateway pembayaran lain menulis bahwa urutan kabar tidak dijamin dan satu event bisa diterima lebih dari sekali ([dokumentasi webhook gateway pembayaran lain](https://docs.stripe.com/webhooks), dibuka 2026-10-29). Dari sisi handler, kiriman ulang sama persis dengan kiriman baru, jadi tiap settlement dijurnal:",
  "**Kabar menunggu sesudah dibayar.** Skrip lab mengirim kabar `pending` sesudah dua kiriman settlement, dan perintahnya tidak tercetak di rekaman. Status top-up kembali ke `menunggu`, karena `UbahStatusTanpaSyarat` menulis status tanpa melihat yang sekarang. Di bagian yang sama, POST tanpa tanda tangan dengan jumlah Rp1.234.567 dijawab 200 dan dikreditkan ke Budi:",
  "**Memanggil keluar: client ke gateway.** Arah kedua adalah Rekeningo yang memanggil, untuk membuat top-up dan mendapat tujuan bayar. Client HTTP Go dengan pengaturan bawaan tidak punya batas waktu, karena nol berarti tanpa batas ([dokumentasi net/http, Go 1.27.1](https://pkg.go.dev/net/http@go1.27.1#Client), dibuka 2026-10-29). Di `api-t4` batas itu 3 detik ([[t3-pool]]), dan rekaman memakai 500 ms supaya cepat.",
  "Saat gateway mati, top-up gagal dan transfer tetap selesai:",
  "Di mode lab lain, gateway membuat order lalu tidak pernah menjawab. Client menyerah sesudah batas waktunya, dan status top-up menjadi `tidak_pasti`, bukan `gagal`:",
  "**Enam kejadian.** Tabel yang terisi di blok Coba, lengkap dengan hal yang rusak:",
  "Kejadian",
  "1. Dicatat satu kali",
  "2. Dipercaya setelah dicek",
  "3. Tidak menahan yang lain",
  "Kiriman normal, sekali",
  "Terjaga",
  "Rusak: POST dari siapa pun diterima",
  "Terjaga: handler tidak memanggil pihak luar; lamanya tidak diukur",
  "Kiriman yang sama datang lagi sesudah balasan hilang",
  "Rusak: jurnal kedua dengan jumlah yang sama",
  "Tidak berlaku",
  "Terjaga",
  "Kabar menunggu datang sesudah dibayar",
  "Rusak: status mundur ke menunggu",
  "Tidak berlaku",
  "Terjaga",
  "Gateway tidak pernah mengirim",
  "Rusak: uang ada di bank, tidak ada jurnal, tidak ada yang tahu",
  "Tidak berlaku",
  "Terjaga",
  "Isi diubah atau kiriman lama diputar ulang",
  "Rusak: jumlah di isi dipercaya",
  "Rusak: tanpa tanda tangan dan tanpa batas waktu",
  "Terjaga",
  "Gateway tidak menjawab saat Rekeningo membuat top-up",
  "Tidak berlaku",
  "Tidak berlaku",
  "Terjaga: bergantung pada timeout; ADR 22 menahannya di 3 detik, dan pengulangannya perlu pengaman sendiri (ADR 36)",
  "Sel Terjaga dan Tidak berlaku adalah penalaran dari urutan kode, bukan rekaman terpisah, kecuali baris 6 yang memakai rekaman `topup.txt` bagian G di atas. Setiap sel Rusak punya dasarnya sendiri:",
  "**Baris 1, hal 2:** Rekaman lab `rentan.txt` bagian A. POST tanpa tanda tangan dijawab 200 diproses.",
  "**Baris 2, hal 1:** Rekaman lab `ganda.txt` bagian A. Event yang sama dua kali, berurutan, menghasilkan dua jurnal. Balasan yang hilang sebagai pemicu kiriman kedua hanya direkam untuk versi lain (`ganda.txt` bagian B).",
  "**Baris 3, hal 1:** Rekaman lab `rentan.txt` bagian A. Status top-up kembali ke `menunggu`. Settlement berikutnya dikredit lagi karena handler menjurnal tiap settlement tanpa melihat status (`ganda.txt` bagian A).",
  "**Baris 4, hal 1:** Tidak dijalankan untuk versi pertama, karena versi minggu 2 belum punya job yang menanyakan status ke gateway atau mencocokkan laporannya. Rekaman lab `rekon.txt` bagian A dan B memerankan webhook yang tidak pernah datang pada versi lain.",
  "**Baris 5, hal 1 dan hal 2:** Rekaman lab `rentan.txt` bagian A. Jumlah di isi kabar dikreditkan, dan kiriman tanpa tanda tangan diterima. Batas waktu tidak ada karena handler tidak memeriksa timestamp (dibaca dari kode `webhookV1`).",
  "Di app Flutter kamu mungkin pernah memanggil API pembayaran dan menganggap jawaban 200 sebagai bukti uang pindah. Di sisi server, kabar dari gateway adalah jawaban yang sama: klaim yang harus dicek.",
  "**Pola ini kembali.** Kabar dari luar adalah klaim, bukan fakta, muncul lagi di layanan verifikasi ([[t4-m31]]) dan di penerbit kartu yang memanggil Rekeningo dengan tenggat 2 detik ([[t4-m37]]). Halaman itu yang merekamnya.",
  "Aturannya sama: PostgreSQL tetap satu-satunya source of truth, dan pihak ketiga hanya memberi klaim. Klaim itu dicek, lalu dicatat sekali: dalam transaction yang sama dengan efeknya selama satu proses, atau lewat Idempotency-Key sesudah service pembayaran terpisah ([[t4-modul]]).",
  "Trade-off: kapan pakai apa",
  "Cara menerima kabar dari gateway",
  "Yang rusak atau dijaga",
  "Bukti",
  "Terima dan percaya isi kabar (versi pertama)",
  "Hal 1 dan hal 2 rusak, di kejadian berbeda",
  "Rekaman lab `rentan.txt` bagian A",
  "Periksa tanda tangan, lalu cek status dan tulis (cek-lalu-tulis)",
  "Hal 2 terjaga; hal 1 rusak untuk dua kiriman bersamaan",
  "Rekaman lab `ganda-serentak.txt` bagian A: dua kiriman bersamaan, keduanya dijawab 200 diproses, dua jurnal",
  "Periksa tanda tangan, lalu catat event dengan kunci utama di transaction yang sama dengan efeknya",
  "Hal 2 terjaga. Hal 1 terjaga untuk id event yang sama; untuk dua event berbeda, kunci utama saja tidak cukup",
  "Rekaman lab `ganda-serentak.txt` bagian B, `tandatangan.txt` bagian B, dan `urutan.txt` bagian F (kasus pertama)",
  "**Biaya cara ketiga.** Ongkosnya satu tabel event, dan kabar yang tidak memajukan status diparkir, bukan diterapkan. Di `urutan.txt` bagian F (kasus pertama), kabar `pending` sesudah `settlement` dijawab 200 diparkir dan status tetap `dibayar`. Cara kerjanya, alasan memilihnya, dan kapan keputusan itu salah ada di [[t4-webhook]].",
  "**Jeda lab di cek-lalu-tulis.** Dua kiriman bersamaan sama-sama menjurnal. Lab memasang jeda 300 ms di antara cek dan tulis supaya hasilnya tidak bergantung pada waktu, dan lebar celah tanpa jeda tidak diukur.",
  "Sengaja belum dilakukan",
  "Yang ditunda",
  "Kenapa ditunda",
  "Muncul lagi di",
  "Tanda tangan, tabel event, dan status yang hanya maju",
  "Halaman ini hanya merumuskan pertanyaan Laras",
  "[[t4-webhook]]",
  "Mencocokkan catatan sendiri dengan laporan gateway",
  "Jawaban untuk pertanyaan Pak Hadi",
  "[[t4-rekonsiliasi]]",
  "Retry, circuit breaker, dan lajur per pihak ketiga",
  "Jawaban untuk pertanyaan Bayu",
  "[[t4-breaker]]",
  "Cek diri",
  "**1.** Gateway mengirim kabar yang sama dua kali, dan saldo Budi naik Rp400.000 untuk Rp200.000. Hal mana yang rusak, dan apa buktinya?",
  "Hal pertama: uang dari luar harus dicatat satu kali. Di `rentan.txt` bagian A, kiriman yang sama dua kali menghasilkan dua jurnal Rp200.000. Baris yang menjurnal tidak memeriksa apakah event atau order itu sudah dijurnal.",
  "**2.** Seseorang mengirim POST berisi jumlah Rp1.234.567 tanpa tanda tangan. Kenapa handler menerimanya, dan hal mana yang rusak?",
  "Hal kedua. Handler tidak memeriksa timestamp atau tanda tangan, jadi kabar dari siapa pun dipercaya. Di `rentan.txt` bagian A, POST itu dijawab 200 dan Rp1.234.567 dikreditkan ke Budi.",
  "**3.** Gateway mati saat Budi membuat top-up. Kenapa transfer Budi tetap selesai?",
  "Jalur transfer tidak memanggil gateway. Di `topup.txt` bagian G, gateway dimatikan: top-up dijawab 502 dan berstatus `gagal`, sedangkan transfer Rp25.000 tetap dijawab 201.",
  "**4.** Di handler versi pertama, kenapa baris `BeginTx` dan `Commit` bukan baris yang salah?",
  "Keduanya sudah tepat untuk data di PostgreSQL: jurnal dan status ikut satu COMMIT atau batal bersama. Transaction tidak memeriksa kabar. Ia menyimpan apa pun yang ditulis di dalamnya, termasuk jumlah yang palsu.",
  "Saat me-review kode AI, cek ini",
  "Handler webhook memeriksa tanda tangan atas byte mentah sebelum JSON diurai.",
  "Event yang sama, dikenali dari id-nya, tidak menjurnal dua kali.",
  "Status hanya maju: kabar yang mundur tidak menimpa status yang sudah lebih jauh.",
  "Jumlah dibandingkan dengan jumlah order sendiri, bukan dipercaya dari isi kabar.",
  "Client ke gateway punya batas waktu eksplisit, karena nol berarti tanpa batas ([net/http](https://pkg.go.dev/net/http@go1.27.1#Client)).",
  "Tidak ada panggilan ke gateway di dalam transaction yang memegang lock ([[t3-m18]]).",
  "Bacaan lanjut",
  "[Notifikasi HTTP sebuah gateway pembayaran: status, batas tunggu, jadwal ulangan](https://docs.midtrans.com/docs/https-notification-webhooks) (dibuka 2026-10-29)",
  "[Webhook gateway pembayaran lain: urutan, event ganda, retry](https://docs.stripe.com/webhooks) (dibuka 2026-10-29)",
  "[Go: net/http, tipe Client](https://pkg.go.dev/net/http@go1.27.1#Client) (Go 1.27.1)"
];
