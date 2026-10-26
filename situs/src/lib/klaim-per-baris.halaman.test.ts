// Penjaga halaman 3.11 (keputusan 1040 sampai 1042): angka, ID `[[...]]`, nomor ADR, label sumber, versi dokumentasi, klaim "tidak ada",
// rentang Snippet, kode tab stack, diagram Rantai, sel tabel ADR per baris dan kolom, dan setiap kalimat di klaim-per-baris.mdx
// diturunkan dari registry (cerita.json), naskah Tahap 3 (bagian 3, 4, peta), rekaman labs/t3-outbox (klaim, kursor, listen, retry, ganda,
// queue), labs/api-t3 (outbox.txt, kode repo dan worker, migration 000017), rekaman labs/b8-concurrency, README lab t3-outbox, baris
// RISET R3-150 sampai R3-154 (dan R3-04, R3-60, R3-61, R2-45), halaman istilah skip-locked, dan widget outbox-worker. Nilai diturunkan di tes ini,
// bukan dari daftar yang ditulis ulang. Kalimat penulis yang tidak bisa diturunkan dikunci utuh di KALIMAT_PENULIS (urutan juga dikunci):
// mengubah satu kata menggagalkan tes, dan itu tanda untuk meninjau klaimnya terhadap sumber. Penjaga angka tidak menangkap kalimat yang
// SALAH, jadi klaim yang mekanismenya mudah keliru (mis. SKIP LOCKED bukan yang mencegah ganda) dijaga tes khusus di bawah.
// Tes hanya membaca berkas yang dilacak git (bukan hasil build atau binari lokal, pelajaran 3.2).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import cerita from "../../data/cerita.json";
import { DataRantai } from "./rantai";
import { daftarBlok, cekTemplat } from "./blok";
import { HalamanIstilah } from "./istilah";
import { POLLER, URUTAN, TITIK } from "../widgets/outbox-worker/logika";

const akar = path.resolve(__dirname, "../../..");
const terlacak = new Set(
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: akar, encoding: "utf8", maxBuffer: 1 << 26 }).split("\n").filter(Boolean),
);
const baca = (rel: string): string => {
  if (!terlacak.has(rel)) throw new Error(`${rel} tidak dilacak git: tes tidak boleh membaca hasil build atau berkas lokal`);
  return fs.readFileSync(path.join(akar, rel), "utf8");
};

const HALAMAN = "situs/src/content/docs/tahap-3/klaim-per-baris.mdx";
const mdx = baca(HALAMAN);
const badan = mdx.split(/^---\n/m).slice(2).join("---\n");
const naskah = baca("plan/CERITA-TAHAP-3.md");
const riset = baca("plan/RISET-TAHAP-3.md");
const riset2 = baca("plan/RISET-TAHAP-2.md");
const klaimTeks = baca("labs/t3-outbox/output/klaim.txt");
const kursorTeks = baca("labs/t3-outbox/output/kursor.txt");
const listenTeks = baca("labs/t3-outbox/output/listen.txt");
const retryTeks = baca("labs/t3-outbox/output/retry.txt");
const gandaTeks = baca("labs/t3-outbox/output/ganda.txt");
const queueTeks = baca("labs/t3-outbox/output/queue.txt");
const outboxTeks = baca("labs/api-t3/output/outbox.txt");
const klaim = klaimTeks.split("\n");
const kursor = kursorTeks.split("\n");
const listen = listenTeks.split("\n");
const outbox = outboxTeks.split("\n");
const readmeLab = baca("labs/t3-outbox/README.md");
const outboxGo = baca("labs/api-t3/internal/repo/outbox.go");
const workerGo = baca("labs/api-t3/internal/worker/worker.go");
const migrasi = baca("labs/api-t3/migrasi/000017_perangkat_outbox.up.sql");
const b8Go = baca("labs/b8-concurrency/output/go.txt").split("\n");
const b8Node = baca("labs/b8-concurrency/output/node.txt").split("\n");
const b8Cpu = baca("labs/b8-concurrency/output/cpu.txt").split("\n");
const glosarium = baca("situs/src/content/docs/alat/glosarium.mdx");
const diagramMentah = JSON.parse(baca("situs/data/diagram/t3-klaim-inti.json")) as unknown;
const rantai = DataRantai.parse(diagramMentah);
const istilah = HalamanIstilah.parse(JSON.parse(baca("situs/data/halaman-istilah/skip-locked.json")));
const widgetJson = JSON.parse(baca("situs/data/widget/t3-outbox-worker.json")) as { skenario: { kursor: { tebak: { pertanyaan: string }; knob: { id: string; opsi: Record<string, string> }[] } } };

interface H { id: string; judul: string; tahap: number; nomor?: string; ada?: boolean; adr?: number[]; jenis?: string; inti?: boolean; menit?: number; prasyarat?: string[]; lab?: string[]; lama?: boolean; lebur_ke?: string }
const hal = cerita.halaman as unknown as H[];
const dari = (id: string): H => {
  const h = hal.find((x) => x.id === id);
  if (!h) throw new Error(`registry: ${id} tidak ada`);
  return h;
};
const harus = (kalimat: string) => expect(badan, `halaman tidak memuat: ${kalimat}`).toContain(kalimat);
// Angka berformat Indonesia: koma desimal, titik ribuan.
const fmt = (x: number, d = 0): string => {
  const [bulat, pecah] = x.toFixed(d).split(".");
  const ribuan = bulat!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return pecah ? `${ribuan},${pecah}` : ribuan;
};
/** Nomor baris (mulai 1) pertama yang cocok, dari indeks `dariIdx` (0-based). */
const nomor = (baris: string[], cocok: (b: string) => boolean, dariIdx = 0): number => {
  const i = baris.findIndex((b, n) => n >= dariIdx && cocok(b));
  expect(i, "baris rekaman tidak ditemukan").toBeGreaterThanOrEqual(0);
  return i + 1;
};
const bagian = (baris: string[], huruf: string): string[] => {
  const i = baris.findIndex((b) => b.startsWith(`# --- ${huruf}. `));
  expect(i, `bagian ${huruf}`).toBeGreaterThanOrEqual(0);
  const j = baris.findIndex((b, n) => n > i && b.startsWith("# --- "));
  return baris.slice(i, j < 0 ? undefined : j);
};
const ambil = (baris: string[], pola: RegExp): RegExpMatchArray => {
  const m = baris.map((b) => b.match(pola)).filter((x): x is RegExpMatchArray => x !== null);
  expect(m, `pola ${pola} harus cocok tepat satu kali`).toHaveLength(1);
  return m[0]!;
};
const kA = bagian(klaim, "A");
const kB = bagian(klaim, "B");
const kC = bagian(klaim, "C");
const kD = bagian(klaim, "D");

// ---- Snippet: rentang baris diturunkan dari isi rekaman dan kode, bukan ditulis ulang ---------------------------------------------
const rentangKlaim = {
  tanpaKunci: [nomor(klaim, (b) => b.startsWith("=> [sesi 1] BEGIN; UPDATE outbox SET klaim_sampai = now() + interval '5 seconds'")), nomor(klaim, (b) => b.startsWith(" sesi 2 memilih nomor 1, 2, 3, 4"))],
  forUpdate: [nomor(klaim, (b) => b.includes("LIMIT 4 FOR UPDATE;   # tanpa SKIP LOCKED")), nomor(klaim, (b) => b.startsWith("# Tanpa SKIP LOCKED hasilnya tetap benar"))],
  skipLocked: [nomor(klaim, (b) => b.startsWith("=> [sesi 1] BEGIN; UPDATE ... WHERE id IN (1, 2, 3, 4);   # klaim lagi")), nomor(klaim, (b) => b.startsWith(" sesi 3 mendapat 0 baris"))],
  tigaWorker: [nomor(klaim, (b) => b.startsWith("$ ./api-t3 -peran worker -sekali -serentak 4   # tiga proses bersamaan")), nomor(klaim, (b) => b.startsWith("jumlah diklaim ketiga worker: 60")), nomor(klaim, (b) => b.startsWith("push tiruan menerima: 60 permintaan"))],
  urutan: [nomor(klaim, (b) => b.startsWith("=> UPDATE outbox SET klaim_sampai = now() + interval '1 second'")), nomor(klaim, (b) => b === "urutan di layanan push (nomor outbox): 2 -> 3 -> 4 -> 5 -> 1")],
  sesiTangan: [nomor(klaim, (b) => b.startsWith("=> [sesi tangan] BEGIN; SELECT id FROM outbox WHERE id IN (1, 2, 3, 4) FOR UPDATE;")), nomor(klaim, (b) => b === "nomor outbox yang dikirim: 5, 6, 7, 8   # worker selesai tanpa menunggu sesi tangan")],
  sesudahRollback: [nomor(klaim, (b) => b.startsWith("=> [sesi tangan] ROLLBACK")), nomor(klaim, (b) => b === "nomor outbox yang dikirim sesudahnya: 1, 2, 3, 4")],
};
const rentangKursor = {
  tertinggal: [nomor(kursor, (b) => b.startsWith("=> SELECT o.id AS outbox_id, j.dibuat_oleh AS pengirim, o.status, row_number()")), nomor(kursor, (b) => b.startsWith("# Baris Budi bernomor lebih besar tetapi `dibuat`"))],
  saldoHp: [nomor(kursor, (b) => b.startsWith("# Saldo Citra naik Rp50.000 (dua transfer)")), nomor(kursor, (b) => b.startsWith("push tiruan menerima: 1 pesan (hanya Dimas)"))],
  klaimMenemukan: [nomor(kursor, (b) => b === "$ ./api-t3 -peran worker -sekali"), nomor(kursor, (b) => b === "worker: diklaim 1, terkirim 1, dilewati 0, ditunda 0, mati 0"), nomor(kursor, (b) => b.startsWith("push tiruan menerima: 2 pesan; HP Citra berbunyi dua kali"))],
};
const rentangListen = {
  notify: [nomor(listen, (b) => b === "=> [listener] LISTEN outbox_baru"), nomor(listen, (b) => b.startsWith("listener menerima: tidak ada (ROLLBACK membuang notifikasi"))],
  putus: [nomor(listen, (b) => b.startsWith("=> SELECT pg_terminate_backend(<pid listener>)")), nomor(listen, (b) => b.startsWith("listener menerima: tidak ada (notifikasi yang dikirim selagi putus")), nomor(listen, (b) => b.startsWith("# NOTIFY hanya membangunkan; sumbernya tetap tabel"))],
};
const rentangOutboxG = [nomor(outbox, (b) => b.startsWith("$ ./api-t3 -peran worker -sekali -klaim 1s -lab-henti-sebelum-tandai")), nomor(outbox, (b) => b.startsWith("push tiruan menerima: 2 pesan, 1 notifikasi_id (pengiriman ulang itu benar"))];
const barisGo = (kode: string, awal: (b: string) => boolean, akhir: (b: string) => boolean): [number, number] => {
  const b = kode.split("\n");
  return [nomor(b, awal), nomor(b, akhir)];
};
const rentangKlaimGo = barisGo(outboxGo, (b) => b.startsWith("func (r Repo) KlaimOutbox("), (b) => b.includes("--8<-- [end:klaim]")).map((x, i) => (i === 1 ? x - 2 : x)) as [number, number];
const rentangPutaran = barisGo(workerGo, (b) => b === "\thasil := make([]string, len(baris))", (b) => b === "\twg.Wait()");

describe("registry, meta, blok, dan tautan", () => {
  test("3.11 ada, konsep, jalur inti, ADR 24, prasyarat 3.10, lab t3-outbox; menit sama dengan baris meta; B8 lebur ke sini", () => {
    expect(dari("t3-klaim-baris")).toMatchObject({ ada: true, nomor: "3.11", jenis: "konsep", inti: true, adr: [24], prasyarat: ["t3-m19"], lab: ["t3-outbox"], tahap: 3 });
    expect(dari("t3-klaim-baris").judul).toBe("Klaim per baris, bukan kursor: SKIP LOCKED + ADR 24");
    expect(mdx).toContain(`title: "3.11 ${dari("t3-klaim-baris").judul}"`);
    expect(mdx.match(/^description: (.+)$/m)![1]).toBe("ADR 24 menggantikan kursor dengan klaim per baris. Selama klaim berlaku, kunci baris dan batas waktu klaim mencegah baris dikirim dua kali; SKIP LOCKED hanya mengganti menunggu dengan melewati.");
    expect(naskah).toContain("| 3.11 | 4 | Klaim per baris, bukan kursor: SKIP LOCKED + ADR 24 | Konsep + ADR | ★ | t3-outbox | race |");
    expect(dari("t3-m19").nomor).toBe("3.10");
    const m = badan.match(/<p class="meta">Baca (\d+) menit · coba (\d+) menit · Prasyarat: \[\[t3-m19\]\] · Jalur inti<\/p>/);
    expect(m, "baris meta").not.toBeNull();
    expect(dari("t3-klaim-baris").menit).toBe(Number(m![1]) + Number(m![2]));
    expect(dari("B8")).toMatchObject({ lama: true, lebur_ke: "t3-klaim-baris", ada: true });
    expect(glosarium).toContain("| **SKIP LOCKED** | Opsi `FOR UPDATE` yang melewati baris yang sudah dikunci transaction lain, bukan menunggunya. | [[t3-klaim-baris]] |");
    expect(istilah.cerita!.map((c) => c.rujukan)).toEqual(["t3-klaim-baris"]);
  });
  test("menit baca masuk akal terhadap jumlah kata (sekitar 200 kata per menit)", () => {
    const isi = badan.replace(/^import .*$/gm, "").replace(/<[^>]+>/g, " ").replace(/\[\[[^\]]+\]\]/g, "x");
    const jumlah = (isi.match(/\S+/g) ?? []).length;
    const bacaMenit = Number(badan.match(/Baca (\d+) menit/)![1]);
    expect(Math.abs(jumlah / 200 - bacaMenit), `${jumlah} kata`).toBeLessThanOrEqual(1.5);
  });
  test("lima blok sesuai templat konsep: dua pertama terbuka; widget OutboxWorker kursor di blok Coba dengan tebak sebelum hasil dan satu hal untuk diubah", () => {
    const b = daftarBlok(badan);
    expect(b.map((x) => x.nama)).toEqual(["Mulai", "Coba", "Paham", "Putuskan", "Kunci"]);
    expect(cekTemplat("konsep", b)).toEqual([]);
    expect(b.filter((x) => x.buka).map((x) => x.nama)).toEqual(["Mulai", "Coba"]);
    expect(badan.match(/<OutboxWorker skenario=\{\["kursor"\]\} \/>/g)).toHaveLength(1);
    expect(badan.indexOf("<OutboxWorker")).toBeGreaterThan(badan.indexOf('<Blok nama="Coba"'));
    expect(badan.indexOf("<OutboxWorker")).toBeLessThan(badan.indexOf('<Blok nama="Paham">'));
    expect(badan).toContain("**Ubah satu hal:**");
    expect(baca("situs/src/components/OutboxWorker.astro")).toContain("<noscript>\n  <p>{L.tanpaJs}</p>");
    // Pengaturan widget: dua pilihan poller dan dua urutan COMMIT, jadi empat kombinasi; tiga direkam di kursor.txt A, B, dan C.
    expect(widgetJson.skenario.kursor.knob.map((k) => [k.id, Object.keys(k.opsi)])).toEqual([["poller", ["kursor", "klaim"]], ["urutan", ["berurutan", "terbalik"]]]);
    expect(POLLER.length * URUTAN.length).toBe(4);
    const direkam = TITIK.filter((t) => t.skenario === "kursor");
    expect(direkam.map((t) => t.sumber)).toEqual(["kursor.txt A", "kursor.txt B", "kursor.txt C"]);
    expect(direkam.some((t) => t.konfig.poller === "klaim" && t.konfig.urutan === "berurutan")).toBe(false);
    expect(direkam).toHaveLength(3);
    harus("Tiga dari empat pengaturan punya bagian rekaman di `kursor.txt`: A, B, dan C. Bagian A merekam nomor outbox dan urutan `dibuat`, bukan urutan COMMIT.");
    expect(bagian(kursor, "A").join("\n")).not.toMatch(/urutan COMMIT|COMMIT (Budi|Dimas)/);
    expect(bagian(kursor, "A").some((b) => /^ 1 +\| 10001 +\| 419 +\| 1 +\| terkirim/.test(b))).toBe(true);
    expect(bagian(kursor, "A").some((b) => /^ 2 +\| 10002 +\| 417 +\| 2 +\| terkirim/.test(b))).toBe(true);
    expect(widgetJson.skenario.kursor.tebak.pertanyaan).toContain("Dengan poller kursor (dibuat, id), berapa notifikasi sampai ke HP Citra?");
    harus("Pertanyaannya sama dengan di [[t3-m19]].");
    harus("Klaim per baris dengan COMMIT berurutan tidak direkam sebagai bagian sendiri, jadi widget menandainya Hitungan.");
    harus("Di widget ini kursor melewatkan baris hanya pada urutan COMMIT yang terbalik.");
    harus("[Label sumber](/cara-pakai/#label-sumber)");
    expect(baca("situs/src/content/docs/cara-pakai.mdx")).toMatch(/^#{2,3} Label sumber/m);
  });
  test("tautan [[id]]: himpunan yang diharapkan; nomor dan judul sama dengan peta naskah", () => {
    const id = [...new Set([...badan.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!))].filter((x) => x !== "berikutnya").sort();
    expect(id).toEqual(["t2-kursor", "t3-adr-33", "t3-at-least-once", "t3-dua-tempat", "t3-m18", "t3-m19", "t3-m20", "t3-outbox", "t3-skema", "t3-tim-infra"]);
    const peta = [...naskah.matchAll(/^\| (3\.\d+) \| [^|]+ \| ([^|]+) \| [^|]+ \|/gm)].map((m) => [m[1]!, m[2]!.trim()] as const);
    for (const idh of id.filter((x) => x.startsWith("t3-"))) {
      const h = dari(idh);
      const p = peta.find((x) => x[0] === h.nomor);
      expect(p, `peta naskah ${h.nomor} untuk ${idh}`).toBeDefined();
      expect(p![1]).toBe(h.judul);
    }
    expect(dari("t2-kursor")).toMatchObject({ nomor: "2.19", adr: [16] });
    expect(dari("t3-m19").nomor).toBe("3.10");
    expect(dari("t3-m20").nomor).toBe("3.12");
    expect(dari("t3-at-least-once")).toMatchObject({ nomor: "3.13", adr: [25] });
    expect(dari("t3-outbox")).toMatchObject({ nomor: "3.9", adr: [23] });
    expect(dari("t3-skema").nomor).toBe("3.5");
    expect(dari("t3-adr-33").adr).toEqual([33]);
    expect(dari("t3-tim-infra").nomor).toBe("3.27");
  });
});

describe("rekaman: klaim.txt, kursor.txt, listen.txt, retry.txt, ganda.txt, outbox.txt dan rentang Snippet", () => {
  test("A: tanpa klausa kunci sesi 2 memilih baris 1 sampai 4; FOR UPDATE menunggu lalu 5 sampai 8; SKIP LOCKED langsung 5 sampai 8; sesi 3 mendapat 0 baris", () => {
    const hasilSesi2 = ambil(kA, /^ sesi 2 memilih nomor (\d+), (\d+), (\d+), (\d+): baris yang sama dengan sesi 1/).slice(1).map(Number);
    expect(hasilSesi2).toEqual([1, 2, 3, 4]);
    expect(ambil(kA, /^ sesi 2 baru dijawab sesudah COMMIT sesi 1: nomor (\d+), (\d+), (\d+), (\d+) /).slice(1).map(Number)).toEqual([5, 6, 7, 8]);
    expect(ambil(kA, /^ sesi 2 langsung mendapat nomor (\d+), (\d+), (\d+), (\d+), tanpa menunggu$/).slice(1).map(Number)).toEqual([5, 6, 7, 8]);
    expect(kA.join("\n")).toContain(" sesi 3 mendapat 0 baris: semua baris yang layak sedang dipegang, dan ia tidak menunggu");
    expect(kA.join("\n")).toContain("# SKIP LOCKED tidak membuat klaim lebih benar; ia membuat worker tidak antre di belakang worker lain (R3-03, R3-60).");
    harus("Sesi 1 mengklaim baris 1 sampai 4 dan belum COMMIT. Sesi 2 memilih dengan syarat yang sama dan mendapat baris 1 sampai 4 juga");
    harus("Sesi 2 menunggu baris 1 sampai 4, lalu dijawab sesudah COMMIT sesi 1 dengan baris 5 sampai 8.");
    harus("Sesi 2 langsung mendapat baris 5 sampai 8 tanpa menunggu. Sesi 3 mendapat 0 baris walau queue belum kosong");
    for (const [r, kunci] of [[rentangKlaim.tanpaKunci, "13:15"], [rentangKlaim.forUpdate, "16:20"], [rentangKlaim.skipLocked, "22:26"]] as const) {
      expect(`${r[0]}:${r[1]}`).toBe(kunci);
      harus(`<Snippet file="labs/t3-outbox/output/klaim.txt" lines="${r[0]}:${r[1]}"`);
    }
  });
  test("B: tiga worker serentak atas 60 baris: 60 diklaim, 60 terkirim, 60 notifikasi_id berbeda, 0 ganda", () => {
    expect(ambil(kB, /^jumlah diklaim ketiga worker: (\d+); jumlah terkirim: (\d+);/).slice(1).map(Number)).toEqual([60, 60]);
    expect(ambil(kB, /^push tiruan menerima: (\d+) permintaan, (\d+) notifikasi_id berbeda, (\d+) ganda$/).slice(1).map(Number)).toEqual([60, 60, 0]);
    expect(kB.join("\n")).toContain("tiga proses bersamaan");
    expect(kB.join("\n")).toContain("pembagiannya tidak direkam: bergantung waktu");
    harus("Tiga proses worker berjalan bersamaan sampai queue habis. Semua 60 baris diklaim, terkirim, dan tidak ada yang ganda. Pembagian per worker tidak direkam, karena bergantung waktu:");
    const [a, tiga, push] = rentangKlaim.tigaWorker;
    expect(tiga).toBe(a! + 1);
    harus(`<Snippet files={["labs/t3-outbox/output/klaim.txt:${a}:${tiga}", "labs/t3-outbox/output/klaim.txt:${push}:${push}"]}`);
    // Uji mutasi di README lab: angka 104 untuk 60 bukan rekaman keluaran (tidak ada di berkas output).
    expect(readmeLab).toContain("Gagal: tiga worker mengklaim 104 baris untuk 60 baris (ganda)");
    expect(klaimTeks).not.toContain("104");
    harus("Uji mutasi di README lab mencatat hasil pada kode worker: dengan semua klausa kunci dihapus dari `KlaimOutbox`, tiga worker mengklaim 104 baris untuk 60 baris. Angka itu bukan bagian rekaman keluaran, jadi bukan Rekaman lab.");
  });
  test("C: baris 1 yang dipegang worker A dikirim paling akhir, urutan 2 -> 3 -> 4 -> 5 -> 1; baris dilewati karena klaim_sampai, bukan SKIP LOCKED", () => {
    expect(kC.join("\n")).toContain("# Worker A mengklaim baris 1 lalu macet (klaim 1 detik, tidak mengirim apa pun). Ditulis sebagai UPDATE yang sama dengan klaim.");
    expect(kC.filter((b) => b.startsWith("urutan di layanan push (nomor outbox):"))).toEqual(["urutan di layanan push (nomor outbox): 2 -> 3 -> 4 -> 5", "urutan di layanan push (nomor outbox): 2 -> 3 -> 4 -> 5 -> 1"]);
    // Lingkup: bagian C mengklaim baris 1 dengan UPDATE biasa (tanpa SELECT ... FOR UPDATE SKIP LOCKED); yang melewatinya syarat klaim_sampai di WHERE.
    expect(kC.filter((b) => b.startsWith("=> ")).every((b) => !b.includes("SKIP LOCKED") && !b.includes("FOR UPDATE"))).toBe(true);
    expect(outboxGo).toContain("(klaim_sampai IS NULL OR klaim_sampai < now())");
    expect(rentangKlaim.urutan.map(String)).toEqual(["47", "55"]);
    harus(`<Snippet file="labs/t3-outbox/output/klaim.txt" lines="${rentangKlaim.urutan[0]}:${rentangKlaim.urutan[1]}"`);
    harus("Worker A mengklaim baris 1 lalu macet. Worker B mengirim baris 2 sampai 5, dan baris 1 baru terkirim sesudah klaim A habis:");
    harus("Baris 1 dilewati karena `klaim_sampai`-nya masih di masa depan, bukan karena `SKIP LOCKED`: `WHERE` mengeluarkannya sebelum ada yang dikunci.");
    expect(kC.join("\n")).toContain("Klaim per baris menjaga agar tidak ada baris ganda atau terlewat, bukan urutan");
  });
  test("D: sesi tangan memegang baris 1 sampai 4 tanpa mengubah; worker sungguhan mengirim 5 sampai 8 tanpa menunggu; sesudah ROLLBACK 1 sampai 4", () => {
    expect(kD.join("\n")).toContain("# A memakai SQL tangan. Di sini worker sungguhan (KlaimOutbox) berjalan sementara sesi tangan memegang baris 1 sampai 4.");
    expect(kD.some((b) => b.startsWith("=> [sesi tangan] BEGIN; SELECT id FROM outbox WHERE id IN (1, 2, 3, 4) FOR UPDATE;"))).toBe(true);
    expect(kD.some((b) => /UPDATE outbox|SET klaim_sampai/.test(b))).toBe(false); // sesi tangan hanya mengunci, tidak mengubah, jadi klaim_sampai tetap kosong
    expect(kD.filter((b) => b.startsWith("nomor outbox yang dikirim")).map((b) => b.replace(/ +#.*$/, ""))).toEqual(["nomor outbox yang dikirim: 5, 6, 7, 8", "nomor outbox yang dikirim sesudahnya: 1, 2, 3, 4"]);
    expect(readmeLab).toContain("Gagal: worker belum selesai dalam 10 detik (menunggu baris yang dikunci sesi tangan)");
    expect(kD.join("\n")).toContain("Tanpa SKIP LOCKED di KlaimOutbox, worker pertama menunggu baris 1 sampai batas 10 detik habis.");
    expect([...rentangKlaim.sesiTangan, ...rentangKlaim.sesudahRollback].join(", ")).toBe("70, 73, 86, 89");
    harus(`<Snippet files={["labs/t3-outbox/output/klaim.txt:${rentangKlaim.sesiTangan[0]}:${rentangKlaim.sesiTangan[1]}", "labs/t3-outbox/output/klaim.txt:${rentangKlaim.sesudahRollback[0]}:${rentangKlaim.sesudahRollback[1]}"]}`);
    harus("Worker sungguhan mengklaim baris 5 sampai 8 tanpa menunggu, dan hanya `SKIP LOCKED` yang melewati baris 1 sampai 4 di sini.");
    harus("Tanpa `SKIP LOCKED`, uji mutasi di README lab mencatat worker belum selesai dalam 10 detik, karena ia menunggu baris yang dikunci sesi tangan.");
  });
  test("kursor.txt B dan C: baris Dimas nomor 1 urutan dibuat 2, baris Budi nomor 2 urutan dibuat 1, saldo naik Rp50.000, HP 1 pesan; klaim mengirim 1 baris yang tertinggal lalu 2 pesan", () => {
    const B = bagian(kursor, "B");
    expect(B.some((b) => /^ 1 +\| 417 +\| terkirim \| 2$/.test(b))).toBe(true);
    expect(B.some((b) => /^ 2 +\| 419 +\| menunggu +\| 1$/.test(b))).toBe(true);
    expect(ambil(B, /^ (\d+)$/)[1]).toBe("50000");
    expect(`Rp${fmt(50000)}`).toBe("Rp50.000");
    expect(B.join("\n")).toContain("Saldo Citra naik Rp50.000 (dua transfer), tetapi HP-nya (token tiruan-504) menerima satu pesan saja");
    harus("Di rekaman, Budi mulai lebih dulu tetapi menunggu bukunya sendiri, dan Dimas COMMIT lebih dulu. Baris Dimas bernomor 1 dengan urutan `dibuat` ke-2, sedangkan baris Budi bernomor 2 dengan urutan `dibuat` ke-1.");
    harus(`<Snippet files={["labs/t3-outbox/output/kursor.txt:${rentangKursor.tertinggal[0]}:${rentangKursor.tertinggal[1]}", "labs/t3-outbox/output/kursor.txt:${rentangKursor.saldoHp[0]}:${rentangKursor.saldoHp[1]}"]}`);
    const C = bagian(kursor, "C");
    expect(C.join("\n")).toContain("worker: diklaim 1, terkirim 1, dilewati 0, ditunda 0, mati 0");
    expect(C.join("\n")).toContain("push tiruan menerima: 2 pesan; HP Citra berbunyi dua kali untuk dua transfer");
    expect(C.some((b) => /^ 1 +\| 417 +\| terkirim \| 0$/.test(b)) && C.some((b) => /^ 2 +\| 419 +\| terkirim \| 1$/.test(b))).toBe(true);
    harus("Baris Dimas sudah dikirim poller kursor, jadi worker mengklaim satu baris: baris Budi yang tertinggal.");
    const [a, k, p] = rentangKursor.klaimMenemukan;
    harus(`<Snippet files={["labs/t3-outbox/output/kursor.txt:${a}:${k}", "labs/t3-outbox/output/kursor.txt:${p}:${p}"]}`);
    // Bagian D: urutan dibuat terbalik tanpa penghambat buatan.
    expect(bagian(kursor, "D").join("\n")).toContain("pasang terbalik ditemukan dalam paling banyak 10 pasang");
    expect(B[0]).toContain("Pengirim yang mulai lebih dulu terhambat");
  });
  test("listen.txt: NOTIFY terkirim sesudah COMMIT dan tidak saat ROLLBACK; notifikasi selagi listener putus tidak sampai, baris tetap menunggu; nomor 2 hilang di sequence", () => {
    const A = bagian(listen, "A");
    expect(A.some((b) => b.startsWith("listener menerima: tidak ada (notifikasi menunggu COMMIT)"))).toBe(true);
    expect(A.some((b) => b.startsWith("listener menerima: nomor baris yang baru (1 notifikasi)"))).toBe(true);
    expect(A.some((b) => b.startsWith("listener menerima: tidak ada (ROLLBACK membuang notifikasi bersama barisnya)"))).toBe(true);
    const B = bagian(listen, "B");
    expect(B.some((b) => b.startsWith("listener menerima: tidak ada (notifikasi yang dikirim selagi putus tidak diulang)"))).toBe(true);
    expect(B.some((b) => /^ 3 +\| menunggu$/.test(b))).toBe(true);
    // Celah nomor dari keluaran database: baris sesudah INSERT yang di-ROLLBACK bernomor 3, dan worker mengklaim dua baris (1 dan 3), tanpa nomor 2.
    expect(B.join("\n")).toContain("worker: diklaim 2, terkirim 2, dilewati 0, ditunda 0, mati 0");
    expect(B.some((b) => /^ 2 +\|/.test(b))).toBe(false);
    harus("Opsi B Tidak dijalankan di lab: yang direkam hanya celah pada nomor sequence, yaitu baris sesudah INSERT yang di-ROLLBACK bernomor 3 (`listen.txt` bagian B).");
    harus("Kursor itu hanya ada di memori poller. Sesudah restart, poller membaca lagi dari awal (dibaca dari kode lab, tidak direkam).");
    expect(workerGo).toContain("\tkursorDibuat time.Time");
    expect(workerGo).toContain("return &Worker{repo: r, push: p, cfg: cfg, acak: rand.Float64}");
    expect(outboxGo).toContain("FROM outbox WHERE status = 'menunggu' AND (dibuat, id) > ($1, $2)");
    expect(B.some((b) => /^ 3 +\| terkirim$/.test(b))).toBe(true);
    expect(B.join("\n")).toContain("# NOTIFY hanya membangunkan; sumbernya tetap tabel. Worker yang polling menemukan baris itu:");
    expect(rentangListen.notify.map(String)).toEqual(["7", "13"]);
    harus(`<Snippet file="labs/t3-outbox/output/listen.txt" lines="${rentangListen.notify[0]}:${rentangListen.notify[1]}"`);
    harus(`<Snippet files={["labs/t3-outbox/output/listen.txt:${rentangListen.putus[0]}:${rentangListen.putus[1]}", "labs/t3-outbox/output/listen.txt:${rentangListen.putus[2]}:${rentangListen.putus[2] + 2}"]}`);
    expect(listen[rentangListen.putus[2]!]).toBe("$ ./api-t3 -peran worker -sekali -serentak 10");
  });
  test("outbox.txt G, retry.txt C, ganda.txt B dan D: klaim habis dikirim ulang dengan notifikasi_id sama; batas 5 dihitung saat klaim; klaim terlalu pendek menghasilkan ganda", () => {
    expect(rentangOutboxG.map(String)).toEqual(["116", "127"]);
    harus(`<Snippet file="labs/api-t3/output/outbox.txt" lines="${rentangOutboxG[0]}:${rentangOutboxG[1]}"`);
    expect(outbox.slice(rentangOutboxG[0]! - 1, rentangOutboxG[1]).join("\n")).toContain("push tiruan menerima: 2 pesan, 1 notifikasi_id");
    const C = bagian(retryTeks.split("\n"), "C");
    expect(C.join("\n")).toContain("# Batas 5 dihitung saat klaim: baris yang mematikan worker tidak diulang tanpa akhir");
    expect(C.join("\n")).toContain("klaim 6: diklaim 1, mati 1, tanpa kirim; outbox.status = mati, percobaan = 6");
    harus("Percobaan naik saat klaim, bukan saat gagal. Batas 5 percobaan dihitung saat klaim, dan klaim ke-6 masuk dead-letter tanpa mengirim (`retry.txt` bagian C).");
    const gB = bagian(gandaTeks.split("\n"), "B");
    expect(gB.join("\n")).toContain("# Klaim 300 ms, layanan push menjawab permintaan pertama sesudah 1,5 detik (lambat), permintaan berikutnya langsung");
    expect(gB.join("\n")).toContain("push tiruan menerima: 2 pesan, 1 notifikasi_id");
    const gD = bagian(gandaTeks.split("\n"), "D");
    expect(gD.join("\n")).toContain("push tiruan menerima: 4 pesan (dua HP, dua worker), 1 notifikasi_id");
    expect(gD.join("\n")).toContain("tiap panggilan berbatas 3 detik. Warung Ani punya dua HP.");
    expect(gD.join("\n")).toContain("Di lab ini 5 detik muat satu HP, bukan dua yang menggantung.");
    harus("Dengan klaim 300 ms dan push yang menjawab sesudah 1,5 detik, dua worker mengirim baris yang sama (`ganda.txt` bagian B). Dengan klaim 5 detik pun, dua perangkat yang menggantung memakan 2 × 3 detik (bagian D).");
    expect(2 * 3).toBeGreaterThan(5);
    expect(readmeLab).toContain("Klaim harus lebih panjang dari jumlah perangkat × batas waktu push");
    harus("Klaim lebih panjang dari waktu kirim terburuk satu baris, yaitu jumlah perangkat × batas waktu push. Klaim bawaan 5 detik hanya muat satu perangkat yang menggantung.");
  });
  test("kode: KlaimOutbox satu pernyataan dengan WHERE, ORDER BY kelas, id, LIMIT, FOR UPDATE SKIP LOCKED, dan UPDATE klaim_sampai; migration 000017 punya klaim_sampai dan index outbox_antre; bawaan worker c = 4, klaim 5 detik, polling 200 ms", () => {
    const fungsi = outboxGo.split("func (r Repo) KlaimOutbox(")[1]!.split("\n}\n")[0]!;
    expect(fungsi).toContain("WHERE status = 'menunggu' AND coba_lagi <= now() AND (klaim_sampai IS NULL OR klaim_sampai < now())");
    expect(fungsi).toContain('urut = "kelas, id"');
    expect(fungsi).toContain("LIMIT $1");
    expect(fungsi).toContain("FOR UPDATE SKIP LOCKED)");
    expect(fungsi).toContain("UPDATE outbox o SET klaim_sampai = now() + make_interval(secs => $2::double precision), percobaan = o.percobaan + 1");
    expect(fungsi.match(/QueryContext/g)).toHaveLength(1); // satu pernyataan, bukan SELECT lalu UPDATE
    expect(rentangKlaimGo.map(String)).toEqual(["74", "94"]);
    harus(`<Snippet file="labs/api-t3/internal/repo/outbox.go" lines="${rentangKlaimGo[0]}:${rentangKlaimGo[1]}" lang="go"`);
    expect(migrasi).toContain("klaim_sampai  timestamptz,");
    expect(migrasi).toContain("CREATE INDEX outbox_antre ON outbox (kelas, id) WHERE status = 'menunggu';");
    harus("Kolom itu ada di tabel `outbox` sejak migration 000017.");
    const bawaan = workerGo.match(/return Konfigurasi\{Serentak: (\d+), Klaim: (\d+) \* time\.Second, Selang: (\d+) \* time\.Millisecond, MaksPercobaan: (\d+),/)!;
    expect(bawaan.slice(1).map(Number)).toEqual([4, 5, 200, 5]);
    harus("Nilai bawaan c adalah 4.");
    harus("yang bawaannya 5 detik di worker (Asumsi lab, kode `Bawaan()`)");
    harus("worker memakai polling dengan jeda bawaan 200 ms");
    harus("Polling tiap 200 ms menambah paling lama 200 ms ke pesan yang menunggu");
    expect(workerGo).toContain("baris, err = w.repo.KlaimOutbox(ctx, w.cfg.Serentak, w.cfg.Klaim, w.cfg.UrutKelas)");
    // Satu goroutine per baris, ditunggu dengan WaitGroup; batas paralelisme = LIMIT klaim (c).
    expect(rentangPutaran.map(String)).toEqual(["105", "114"]);
    harus(`<Snippet file="labs/api-t3/internal/worker/worker.go" lines="${rentangPutaran[0]}:${rentangPutaran[1]}" lang="go"`);
    expect(workerGo.split("\n").slice(104, 114).join("\n")).toContain("go func() {");
    expect(workerGo.split("\n").slice(104, 114).join("\n")).toContain("wg.Wait()");
    expect(workerGo).not.toContain("make(chan struct{}"); // tidak ada semaphore terpisah
    harus("Batas klaim sama dengan batas paralelisme, jadi tidak ada semaphore lain:");
    // Tab Go: dua cabang poller di worker.go baris 87 sampai 101.
    expect(workerGo.split("\n")[86]).toBe("\tif w.cfg.Kursor {");
    expect(workerGo.split("\n")[100]).toBe("\t}");
    harus('<Snippet file="labs/api-t3/internal/worker/worker.go" lines="87:101" lang="go"');
  });
});

describe("klaim negatif berlingkup dan label sumber", () => {
  const berkasLab = (nama: string): string[] => [...terlacak].filter((f) => f.startsWith(`labs/${nama}/`));
  test("labs/api-t3 (kode Go dan migration) tidak memakai LISTEN atau NOTIFY; perilakunya direkam hanya oleh skrip Python labs/t3-outbox/run.py", () => {
    const api = berkasLab("api-t3").filter((f) => /\.(go|sql)$/.test(f));
    expect(api.length).toBeGreaterThan(30);
    expect(api.filter((f) => /\bLISTEN\b|\bNOTIFY\b/.test(baca(f)) || /pg_notify/i.test(baca(f)))).toEqual([]);
    const lain = [...terlacak].filter((f) => f.startsWith("labs/") && !f.startsWith("labs/t3-outbox/") && /\.(go|sql|py)$/.test(f) && /\bLISTEN outbox_baru\b|pg_notify\('outbox_baru'/.test(baca(f)));
    expect(lain).toEqual([]);
    const run = baca("labs/t3-outbox/run.py");
    expect(run).toContain('listener.execute("LISTEN outbox_baru")');
    expect(run).toContain("pg_notify('outbox_baru'");
    harus("Di `labs/api-t3` (kode Go dan migration) tidak ada `LISTEN` atau `NOTIFY`, dan worker memakai polling dengan jeda bawaan 200 ms. Perilaku di atas direkam dengan skrip lab Python.");
    harus("`labs/api-t3` belum memakainya.");
  });
  test("label sumber: lima tab Tidak dijalankan dan satu Dijalankan; opsi B Tidak dijalankan; angka 104 bukan Rekaman lab; kode Django berlabel Ilustrasi; widget Hitungan", () => {
    expect((badan.match(/^\*Tidak dijalankan\. Dicek ke /gm) ?? []).length).toBe(5);
    expect((badan.match(/^\*Dijalankan: lab api-t3 dan t3-outbox/gm) ?? []).length).toBe(1);
    harus("Kode di bawah adalah Ilustrasi.*");
    harus("Opsi B Tidak dijalankan di lab: yang direkam hanya celah pada nomor sequence, yaitu baris sesudah INSERT yang di-ROLLBACK bernomor 3 (`listen.txt` bagian B).");
    harus("| Tidak dijalankan. Rekaman `listen.txt` B untuk celah nomor; PostgreSQL 17 bab 9.17; ADR 16 opsi D |");
    expect(baca(".claude/skills/gaya-bahasa/SKILL.md")).toContain("Tidak dijalankan: dicek ke dokumentasi atau kode, tidak dijalankan.");
    expect(readmeLab).toContain("Opsi ADR 23 yang tidak ada di lab ini");
    expect(readmeLab).toContain("## Uji mutasi");
  });
  test("klaim negatif tentang dokumentasi: tiap 'tidak menyebut' di halaman punya baris riset yang menulis temuan yang sama", () => {
    expect(riset).toMatch(/\| R3-151 \|[^\n]*Laravel 13\.x Queues[^\n]*frasa "skip locked", "lockForUpdate", "reserved_at", dan "at least once" tidak ada di halaman/);
    harus("halaman Queues tidak menyebut `SKIP LOCKED`, tetapi kode driver `database` memakainya.");
    expect(riset).toMatch(/\| R3-153 \|[^\n]*supabase\.com\/docs\/guides\/queues[^\n]*frasa SKIP LOCKED dan kata lock tidak ada/);
    expect(riset).toMatch(/\| R3-153 \|[^\n]*docs\/api\/sql\/functions\.md[^\n]*frasa SKIP LOCKED tidak ada/);
    harus("Dokumentasi yang dibuka tidak menyebut `SKIP LOCKED`, jadi cara pgmq menghindari dua consumer pada pesan yang sama tidak terbaca dari sana.");
    expect(riset).toMatch(/\| R3-152 \|[^\n]*concepts\/scheduling\/overview \(teks mentah dibuka 2026-10-26\)[^\n]*kata "lock" tidak ada di halaman/);
    harus("Halaman itu tidak menyebut kata lock, jadi cara klaim antar instance tidak bisa dibaca dari sana.");
    expect(riset).toMatch(/\| R3-150 \|[^\n]*README tidak memuat istilah at-least-once atau exactly-once/);
    expect(riset).toMatch(/\| R3-61 \|[^\n]*nasib notifikasi yang dikirim selagi listener putus tidak ditulis tegas/);
    harus("Dokumentasi NOTIFY tidak menulis nasib notifikasi yang dikirim selagi listener putus.");
    expect(riset).toMatch(/\| R3-04 \|[^\n]*halaman tidak menyebut urutan commit/);
    harus("Dokumentasi menulis bahwa sequence tidak bisa dipakai untuk nomor tanpa celah, dan tidak menyebut urutan COMMIT");
  });
  test("isi Snippet (rekaman dan kode yang ditampilkan) tidak memuat ID riset, nomor PR, nomor keputusan, atau komentar lab internal; kode ditunjuk lewat lines fungsi saja", () => {
    const tag = [...badan.matchAll(/^<Snippet (.+) \/>$/gm)].map((m) => m[1]!).filter((x) => !x.startsWith("lang="));
    expect(tag.length).toBe((badan.match(/<Snippet (file|files)=/g) ?? []).length);
    expect(tag.length).toBeGreaterThanOrEqual(15);
    let dicek = 0;
    for (const t of tag) {
      const entri: [string, number, number][] = [];
      const files = t.match(/files=\{\[([^\]]+)\]\}/);
      if (files) for (const m of files[1]!.matchAll(/"([^":]+):(\d+):(\d+)"/g)) entri.push([m[1]!, Number(m[2]), Number(m[3])]);
      const satu = t.match(/file="([^"]+)" lines="(\d+):(\d+)"/);
      if (satu) entri.push([satu[1]!, Number(satu[2]), Number(satu[3])]);
      expect(entri.length, t).toBeGreaterThan(0);
      for (const [f, a, z] of entri) {
        const isi = baca(f).split("\n").slice(a - 1, z).join("\n");
        expect(isi.length, `${f}:${a}:${z}`).toBeGreaterThan(0);
        expect(isi, `${f}:${a}:${z}`).not.toMatch(/\bR\d-\d{2,3}\b|\bPR ?#?\d{2,}|\bkeputusan \d+|#\d{3}\b|mutasi tinjauan|TestKlaim/);
        dicek++;
      }
    }
    expect(dicek).toBeGreaterThanOrEqual(20);
    expect(badan).not.toMatch(/region=/); // komentar penjelas di atas fungsi (ID riset, nama tes) tidak ikut tampil
  });
  test("atribusi riset lama tidak disalin: tanpa Morling, Kleppmann, dan Debezium; kursor tidak ditulis 'tidak pernah dibaca'; tanpa ID lab B8", () => {
    expect(badan).not.toMatch(/Morling|Kleppmann|Debezium/);
    expect(badan).not.toMatch(/tidak pernah dibaca/);
    expect(badan).not.toMatch(/\bB8\b/);
  });
  test("daftar bernomor berurutan 1..n di tiap daftar: pertanyaan Cek 3, aturan ADR 5, pre-mortem 3", () => {
    const daftar: number[][] = [];
    let dalamKode = false;
    for (const baris of badan.split("\n")) {
      if (baris.trim().startsWith("```")) { dalamKode = !dalamKode; continue; }
      if (dalamKode) continue;
      const m = baris.match(/^(\d+)\. /);
      if (!m) continue;
      const n = Number(m[1]);
      if (n === 1) daftar.push([]);
      daftar[daftar.length - 1]!.push(n);
    }
    expect(daftar.map((l) => l.join(","))).toEqual(["1,2,3", "1,2,3,4,5", "1,2,3"]);
  });
  test("ID riset dan ID internal tidak tampil di halaman, diagram, dan teks halaman istilah", () => {
    expect(mdx).not.toMatch(/\bR\d-\d{2,3}\b/);
    expect(JSON.stringify(diagramMentah)).not.toMatch(/\bR\d-\d{2,3}\b/);
    const tampil = JSON.stringify({ ...istilah, sumber: null });
    expect(tampil).not.toMatch(/\bR\d-\d{2,3}\b/);
  });
  test("halaman tidak membuka isi 3.12 dan 3.13 lebih dari menunjuk: tanpa jitter, backoff, dan penyaring di app", () => {
    expect(badan).not.toMatch(/jitter|backoff|exactly-once/i);
    expect(badan.match(/dead-letter/g)).toHaveLength(1);
  });
});

describe("versi dan sumber dokumentasi", () => {
  test("PostgreSQL 17 (sama dengan versi rekaman) untuk semua tautan dokumentasi; bab dan anchor sama dengan baris riset", () => {
    const pg = klaimTeks.match(/PostgreSQL (\d+)\.(\d+)/)!;
    expect(pg[1]).toBe("17");
    expect(badan.match(/postgresql\.org\/docs\/(\d+)\//g)!.every((x) => x.includes(`/${pg[1]}/`))).toBe(true);
    for (const kecil of ["functions-datetime.html#FUNCTIONS-DATETIME-CURRENT", "functions-sequence.html", "transaction-iso.html#XACT-READ-COMMITTED", "sql-select.html#SQL-FOR-UPDATE-SHARE", "sql-notify.html", "sql-listen.html"]) {
      expect(badan, kecil).toContain(`https://www.postgresql.org/docs/17/${kecil}`);
    }
    harus("([PostgreSQL 17, bab 9.9.5](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT), dibuka 2026-10-26)");
    harus("([PostgreSQL 17, bab 9.17](https://www.postgresql.org/docs/17/functions-sequence.html), dibuka 2026-10-26)");
    harus("([PostgreSQL 17, bab 13.2.1](https://www.postgresql.org/docs/17/transaction-iso.html#XACT-READ-COMMITTED), dibuka 2026-10-26)");
    expect(riset2).toMatch(/\| R2-45 \|[^\n]*`now\(\)` setara `transaction_timestamp\(\)`, nilai = awal transaction/);
    expect(riset).toMatch(/\| R3-04 \|[^\n]*nilai nextval tidak dipakai ulang bila transaction abort, ada gap, sequence tidak untuk nomor tanpa celah/);
    expect(riset).toMatch(/\| R3-150 \|[^\n]*functions-sequence bab 9\.17[^\n]*cannot be used to obtain "gapless" sequences/);
    expect(riset).toMatch(/\| R3-150 \|[^\n]*sql-notify[^\n]*not delivered until and unless the transaction is committed/);
    expect(riset).toMatch(/\| R3-150 \|[^\n]*sql-listen[^\n]*registrations are automatically cleared when the session ends/);
    expect(riset).toMatch(/\| R3-60 \|[^\n]*SKIP LOCKED melewati baris yang tidak bisa langsung dikunci, memberi "inconsistent view", tidak untuk pekerjaan umum/);
    expect(riset).toMatch(/\| R3-60 \|[^\n]*ORDER BY dengan locking clause di READ COMMITTED bisa mengembalikan baris tidak berurutan/);
    expect(riset).toMatch(/\| R3-60 \|[^\n]*§13\.2\.1 Read Committed \(17\.11\)[^\n]*memeriksa ulang WHERE terhadap versi baru/);
    harus("([PostgreSQL 17: NOTIFY](https://www.postgresql.org/docs/17/sql-notify.html), dibuka 2026-10-26)");
    harus("([PostgreSQL 17: LISTEN](https://www.postgresql.org/docs/17/sql-listen.html), dibuka 2026-10-26)");
    harus("([PostgreSQL 17, SELECT: The Locking Clause](https://www.postgresql.org/docs/17/sql-select.html#SQL-FOR-UPDATE-SHARE), dibuka 2026-10-26)");
  });
  test("baris riset R3-150 sampai R3-154: tanggal akses 2026-10-26, versi, dan kutipan kunci; halaman pemakai", () => {
    for (const id of ["R3-150", "R3-151", "R3-152", "R3-153", "R3-154"]) {
      const baris = riset.split("\n").filter((b) => b.startsWith(`| ${id} |`));
      expect(baris, id).toHaveLength(1);
      expect(baris[0], id).toMatch(/2026-10-26/);
      expect(baris[0]!.split(/(?<!\\)\|/).length, id).toBe(7); // ID | konsep | sumber | halaman | berubah (5 kolom)
    }
    expect(riset).toMatch(/\| R3-150 \|[^\n]*pg-boss 12\.38\.0, npm dan rilis GitHub 2026-10-13/);
    expect(riset).toMatch(/\| R3-150 \|[^\n]*pg-boss relies on Postgres's SKIP LOCKED[^\n]*Concurrent workers claim jobs without blocking each other[^\n]*LISTEN\/NOTIFY low latency delivery/);
    expect(riset).toMatch(/\| R3-151 \|[^\n]*laravel\/framework v13\.38\.0 \(Packagist 2026-10-20\)[^\n]*baris 540 sampai 545[^\n]*pgsql >= 9\.5/);
    expect(riset).toMatch(/\| R3-151 \|[^\n]*bawaan kelas 60/);
    expect(riset).toMatch(/\| R3-152 \|[^\n]*Django 6\.1\.2, PyPI[^\n]*skip_locked=True[^\n]*TransactionManagementError/);
    expect(riset).toMatch(/\| R3-152 \|[^\n]*serverpod 4\.0\.4, pub\.dev 2026-10-06[^\n]*A scheduled call runs at least once[^\n]*one instance claims each call and normally runs it a single time[^\n]*a call can occasionally run more than once/);
    expect(riset).toMatch(/\| R3-153 \|[^\n]*rilis GitHub terbaru v1\.13\.1, 2026-10-20[^\n]*"v1\.10\.0" di README pgmq adalah tag image Docker contoh/);
    expect(riset).toMatch(/\| R3-153 \|[^\n]*The VT specifies the amount of time in seconds that the message will be invisible to other consumers after reading/);
    expect(riset).toMatch(/\| R3-154 \|[^\n]*2023-12-18[^\n]*crucial to our implementation[^\n]*allows Solid Queue's workers to fetch and lock jobs without locking other workers/);
    expect(riset).toMatch(/\| R3-154 \|[^\n]*seven different gems[^\n]*a number of challenges using and operating it at scale[^\n]*significantly easier/);
    expect(riset).toMatch(/\| R3-154 \|[^\n]*2024-09-26[^\n]*20 million jobs per day, using 800 workers, 4 dispatchers and 2 schedulers, spread over 74 VMs running in two datacenters/);
    expect(riset).toMatch(/\| R3-154 \|[^\n]*leverages the `FOR UPDATE SKIP LOCKED` clause, if available, to avoid blocking and waiting on locks when polling jobs/);
    expect(riset).toMatch(/- R3-24 [^\n]*Solid Queue 1\.0" \(2024-09-26\)[^\n]*±20 juta job per hari/);
  });
  test("tab stack lain: versi dan tanggal sama dengan baris riset; label dan slot berurutan; isi tiap slot menyebut stack-nya; kode tab dipatok utuh", () => {
    const labels = [...badan.match(/<TabSet id="stack" labels=\{\[([^\]]+)\]\}>/)![1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
    expect(labels).toEqual(["Go", "Node.js", "Laravel", "Django", "Dart (Serverpod)", "Supabase"]);
    const slot = [...badan.matchAll(/<Fragment slot="t(\d)">([\s\S]*?)<\/Fragment>/g)].map((m) => ({ n: Number(m[1]), isi: m[2]! }));
    expect(slot.map((s) => s.n)).toEqual([0, 1, 2, 3, 4, 5]);
    const kunci = ["`database/sql`", "pg-boss 12.38.0", "`laravel/framework` 13.38.0", "Django 6.1.2", "Serverpod 4.0.4", "pgmq v1.13.1"];
    labels.forEach((_, i) => expect(slot[i]!.isi, `slot t${i} (${labels[i]}) tidak memuat ${kunci[i]}`).toContain(kunci[i]!));
    const hanya: [number, string][] = [[1, "pg-boss"], [2, "`reserved_at`"], [3, "`select_for_update(skip_locked=True)`"], [4, "future call"], [5, "`pgmq.read`"]];
    for (const [i, kata] of hanya) {
      slot.forEach((s, j) => { if (j !== i) expect(s.isi, `kata ${kata} milik slot t${i} muncul di t${j}`).not.toContain(kata); });
      expect(slot[i]!.isi).toContain(kata);
    }
    harus("*Tidak dijalankan. Dicek ke [README pg-boss](https://github.com/timgit/pg-boss), pg-boss 12.38.0 (npm, rilis 2026-10-13), dibuka 2026-10-26.*");
    harus("*Tidak dijalankan. Dicek ke kode sumber [`DatabaseQueue`](https://github.com/laravel/framework/blob/v13.38.0/src/Illuminate/Queue/DatabaseQueue.php), `laravel/framework` 13.38.0, dan [Laravel 13.x: Queues](https://laravel.com/docs/13.x/queues).*");
    harus("*Tidak dijalankan. Dicek ke [Django 6.1: QuerySet API, select_for_update](https://docs.djangoproject.com/en/6.1/ref/models/querysets/#select-for-update), Django 6.1.2. Kode di bawah adalah Ilustrasi.*");
    harus("*Tidak dijalankan. Dicek ke [Serverpod: Scheduling](https://docs.serverpod.dev/concepts/scheduling/overview), Serverpod 4.0.4 (halaman bertanda 4.0.0).*");
    harus("*Tidak dijalankan. Dicek ke [Supabase: Queues](https://supabase.com/docs/guides/queues) dan [pgmq: functions](https://github.com/pgmq/pgmq/blob/main/docs/api/sql/functions.md), pgmq v1.13.1 (rilis GitHub 2026-10-20; dokumentasi cabang utama), dibuka 2026-10-26.*");
    // Versi di halaman sama dengan versi di go.mod / lab dan di istilah.
    expect(baca("labs/api-t3/go.mod")).toContain("github.com/jackc/pgx/v5 v5.11.0");
    expect(istilah.stack).toMatchObject({ go: { versi: "Go 1.27.1, pgx v5.11.0 lewat database/sql, PostgreSQL 17.11" }, node: { versi: "pg-boss 12.38.0" }, laravel: { versi: "laravel/framework 13.38.0" }, django: { versi: "Django 6.1.2" }, serverpod: { versi: "Serverpod 4.0.4" }, supabase: { versi: "pgmq v1.13.1" } });
    expect(baca("labs/api-t3/go.mod")).toContain("go 1.27.1");
    const kode = [...badan.matchAll(/<Snippet lang="(\w+)" code=\{`([^`]*)`\} \/>/g)].map((m) => [m[1], m[2]]);
    expect(kode).toEqual([["python", 'with transaction.atomic():\n    baris = list(\n        Outbox.objects.select_for_update(skip_locked=True)\n        .filter(status="menunggu", coba_lagi__lte=sekarang)\n        .order_by("kelas", "id")[:4]\n    )']]);
  });
  test("B8 diserap: angka rekaman labs/b8-concurrency (berurutan, paralel, dibatasi 3, goroutine, /ping) sama dengan halaman; Spring dan cerita lama 170 notifikasi tidak ikut", () => {
    const g = (k: string) => b8Go.find((b) => b.startsWith(k))!.match(/(\d+\.\d+) detik/)![1]!.replace(".", ",");
    expect([g("berurutan"), g("paralel (10 goroutine)"), g("dibatasi 3 bersamaan")]).toEqual(["5,02", "0,50", "2,01"]);
    harus("Sepuluh kiriman 500 ms butuh 5,02 detik berurutan, 0,50 detik paralel penuh, dan 2,01 detik dengan batas tiga bersamaan:");
    expect(b8Go[0]).toContain("10 notifikasi, layanan tiruan 500 ms per kiriman");
    harus('<Snippet file="labs/b8-concurrency/output/go.txt" lines="2:4"');
    expect(Math.ceil(10 / 3) * 0.5).toBeCloseTo(2, 5);
    expect(b8Node.find((b) => b.startsWith("paralel (Promise.all)"))).toContain("0.51 detik");
    harus("paralel 0,50 dan 0,51 detik untuk 10 kiriman 500 ms (Rekaman lab `b8-concurrency`)");
    const ping = (k: string) => Number(b8Cpu.find((b) => b.startsWith(k))!.match(/(\d+\.\d+) detik/)![1]);
    expect(fmt(ping("Go") * 1000, 2)).toBe("0,35");
    expect(fmt(ping("Node.js"), 2)).toBe("0,96");
    harus("`/ping` dijawab dalam 0,35 ms di Go dan 0,96 detik di Node.js (`cpu.txt`)");
    expect(baca("labs/b8-concurrency/output/go.txt")).toContain("goroutine sebelum: 5\ngoroutine sesudah: 1005");
    harus("Rekaman lab yang sama mencatat 1.000 goroutine tertinggal bila pemanggil menyerah duluan (5 sebelum, 1.005 sesudah).");
    expect(badan).not.toMatch(/Spring|170 notifikasi/);
    // Kapasitas worker: c ÷ t, diukur 12 sampai 13,33 per detik.
    expect(fmt(4 / 0.3, 1)).toBe("13,3");
    expect(queueTeks).toContain("kapasitas diukur: antara 12 dan 13,33 per detik (batas atas c ÷ t = 4 ÷ 0,3 = 13,33)");
    harus("Kapasitasnya c ÷ t = 4 ÷ 0,3 = 13,3 baris per detik (c dan t Asumsi naskah). Rekaman `queue.txt` bagian A mengukur antara 12 dan 13,33 per detik.");
    expect(naskah).toContain("| Kapasitas worker | c ÷ t | c = 4, t = 0,3 detik (Asumsi) | 13,3 per detik");
  });
  test("tingkat heading tidak melompat: h2 dulu, lalu naik paling banyak satu tingkat", () => {
    let dalamKode = false;
    const tingkat: number[] = [];
    for (const b of badan.split("\n")) {
      if (b.trim().startsWith("```")) { dalamKode = !dalamKode; continue; }
      if (dalamKode) continue;
      const m = b.match(/^(#{1,6}) /);
      if (m) tingkat.push(m[1]!.length);
    }
    expect(tingkat[0]).toBe(2);
    tingkat.forEach((t, i) => { if (i > 0) expect(t, `heading ke-${i}`).toBeLessThanOrEqual(tingkat[i - 1]! + 1); });
    expect(tingkat.filter((t) => t === 2)).toHaveLength(1);
  });
  test("Solid Queue: 20 juta ÷ 7.500 = ±2.667; 7.500 pemberitahuan per hari dari naskah; tulisan 2023-12-18 dan 2024-09-26", () => {
    expect(naskah).toContain("7.500 per hari, 5% dari request");
    expect(fmt(20_000_000 / 7500)).toBe("2.667");
    harus("Batasnya satu produk Rails, dengan Solid Queue di database terpisah dari aplikasi utama. Jadi kasus ini mendukung klaim lewat database, bukan klaim yang ikut COMMIT uang. Bebannya 20 juta lawan 7.500 pemberitahuan per hari (Asumsi naskah), yaitu ±2.667 kali.");
    expect(riset).toMatch(/\| R3-154 \|[^\n]*We're running Solid Queue in a separate database from the main app/);
    expect(riset).toMatch(/\| R3-140 \|[^\n]*Solid Queue berjalan di database sendiri, terpisah dari database aplikasi/);
    harus("Dalam tulisan 2023-12-18, 37signals menyebut `SELECT ... FOR UPDATE SKIP LOCKED` penting bagi implementasi mereka, karena worker bisa mengambil dan mengunci job tanpa mengunci worker lain.");
    harus("Fitur itu mereka tulis baru hadir di MySQL 8.");
    harus("Tulisan 2024-09-26 melaporkan HEY memproses ±20 juta job per hari dengan 800 worker di 74 VM dan dua datacenter");
    harus("([Introducing Solid Queue](https://dev.37signals.com/introducing-solid-queue/), dibuka 2026-10-26)");
    harus("([Solid Queue 1.0 released](https://dev.37signals.com/solid-queue-v1-0/), dibuka 2026-10-26)");
    harus("([rails/solid_queue](https://github.com/rails/solid_queue), dibuka 2026-10-26)");
  });
});

describe("ADR 24: opsi, aturan, diagram, sel tabel, dan kalimat", () => {
  const baris = badan.split("\n").filter((b) => b.startsWith("|"));
  const sel = (awal: string): string[] => {
    const b = baris.find((x) => x.startsWith(`| ${awal} |`));
    expect(b, `baris tabel tidak ada: ${awal}`).toBeDefined();
    return b!.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
  };
  test("ADR 24 di naskah: keputusan, opsi yang ditolak, dan kapan salah; halaman memuat sama", () => {
    const n = naskah.split("\n").find((b) => b.startsWith("| 24 | Worker mengklaim baris dengan `FOR UPDATE SKIP LOCKED`"))!;
    expect(n).toBeDefined();
    expect(n).toContain("Baris tidak dikirim dua kali karena klausa kunci `FOR UPDATE` dan `klaim_sampai`; `SKIP LOCKED` tidak menambah kebenaran, hanya mengganti menunggu dengan melewati baris yang terkunci (Rekaman lab klaim.txt A dan D)");
    expect(n).toContain("Kursor `(dibuat, id)` seperti ADR 16 (aturan 5 ADR 16 sudah melarangnya untuk pembaca aliran); nomor urut tanpa celah; `LISTEN`/`NOTIFY` sebagai sumber (hanya boleh membangunkan worker, polling tetap sumber, listen.txt)");
    expect(n).toContain("Bila urutan antar pesan penting: klaim per baris tidak menjaga urutan, dengan atau tanpa `SKIP LOCKED`.");
    expect(n).toContain("di lab, sesi ketiga mendapat 0 baris walau queue belum kosong (klaim.txt A)");
    expect(dari("t3-klaim-baris").adr).toEqual([24]);
    expect(naskah).toContain("ADR 24: worker mengklaim baris, tanpa kursor; klaim punya batas waktu");
    expect(naskah).toContain("| M19 | 4 |");
    harus("### ADR 24: worker mengklaim baris, tanpa kursor");
    harus("| | A. Kursor `(dibuat, id)` | B. Nomor urut tanpa celah | C. Klaim per baris | D. LISTEN dan NOTIFY sebagai sumber |");
    harus("**Status:** diterima di minggu 4 Tahap 3, sesudah M19.");
    harus("Aturan 5 ADR 16 sudah melarang kursor `(dibuat, id)` untuk pembaca aliran seperti notifikasi ([[t2-kursor]]).");
    expect(baca("situs/src/content/docs/tahap-2/pagination-kursor.mdx")).toContain("5. Pembaca yang menganggap riwayat sebagai aliran tidak boleh memakai kursor ini.");
    expect(baca("situs/src/content/docs/tahap-2/pagination-kursor.mdx")).toContain("| Kekurangan | Baris ganda dan kiriman baru tidak tampil saat ada tulis di atas.");
    // Opsi D ADR 16 = nomor urut per buku di bawah lock.
    expect(baca("situs/src/content/docs/tahap-2/pagination-kursor.mdx")).toContain("D. Nomor urut per buku di bawah lock");
    for (const b of ["| Cara kerja |", "| Kelebihan |", "| Kekurangan |", "| Biaya operasional |", "| Bukti |"]) harus(b);
  });
  test("tabel opsi: tiap sel di baris dan kolom yang benar memuat nilai yang diturunkan dari rekaman dan kode", () => {
    const [, A1, B1, C1, D1] = sel("Cara kerja");
    expect(A1).toContain("`(dibuat, id)`");
    expect(A1).toContain("seperti ADR 16");
    expect(B1).toContain("penghitung yang dinaikkan di bawah lock baris");
    expect(B1).toContain("pola opsi D di ADR 16");
    expect(C1).toContain("`FOR UPDATE SKIP LOCKED`");
    expect(C1).toContain("`klaim_sampai`");
    expect(D1).toContain("`pg_notify`");
    expect(D1).toContain("tanpa polling");
    const [, A2, B2, C2, D2] = sel("Kelebihan");
    expect(A2).toContain("Tanpa kolom baru dan tanpa lock");
    expect(B2).toContain("Urutan sama dengan urutan COMMIT, karena lock dipegang sampai COMMIT");
    expect(C2).toContain("Baris COMMIT belakangan terlihat di putaran berikutnya");
    expect(C2).toContain("Tiga worker, 60 baris, 0 ganda");
    expect(C2).toContain("Klaim yang habis melepas baris dari worker yang mati");
    expect(D2).toContain("tanpa jeda polling");
    const [, A3, B3, C3, D3] = sel("Kekurangan");
    expect(A3).toContain("Melewatkan baris yang COMMIT belakangan. Kursor disimpan di tiap proses worker, jadi hanya cocok untuk satu poller (dibaca dari kode lab)");
    expect(workerGo).toContain("\tkursorDibuat time.Time");
    expect(workerGo).toContain("w.kursorDibuat, w.kursorID = akhir.Dibuat, akhir.ID");
    expect(B3).toContain("`bigserial` tidak bisa dipakai: sesudah ROLLBACK baris berikutnya bernomor 3, bukan 2");
    expect(C3).toContain("Urutan antar pesan tidak dijaga");
    expect(C3).toContain("sesi ketiga mendapat 0 baris walau queue belum kosong");
    expect(C3).toContain("Klaim yang terlalu pendek menghasilkan ganda");
    expect(D3).toContain("Notifikasi yang dikirim selagi listener putus tidak pernah sampai, dan barisnya menunggu");
    expect(D3).toContain("bila queue notifikasi penuh");
    const [, A4, B4, C4, D4] = sel("Biaya operasional");
    expect(A4).toContain("Kursor harus disimpan");
    expect(B4).toContain("backfill");
    expect(C4).toContain("`klaim_sampai` dan `percobaan`, index `outbox_antre`");
    expect(D4).toContain("polling tetap dibutuhkan sebagai cadangan");
    const [, A5, B5, C5, D5] = sel("Bukti");
    expect(A5).toContain("Rekaman `kursor.txt` A sampai D");
    expect(B5).toContain("Tidak dijalankan");
    expect(B5).toContain("`listen.txt` B");
    expect(C5).toContain("Rekaman `klaim.txt` A sampai D, `kursor.txt` C, `ganda.txt` B dan D");
    expect(D5).toContain("Rekaman `listen.txt` A dan B");
    // Isi sel sama dengan sumbernya.
    expect(migrasi).toContain("CREATE INDEX outbox_antre");
    expect(riset).toMatch(/\| R3-61 \|[^\n]*antrean 8 GB, transaction pemanggil gagal saat commit bila penuh/);
    expect(riset).toMatch(/\| R3-05 \|[^\n]*transaction yang memanggil NOTIFY gagal saat commit bila antrean penuh/);
    // Sengaja belum: tiap baris berisi yang ditunda, alasannya, dan tempat munculnya, tidak bertukar.
    const cdc = sel("Log-based CDC untuk urutan COMMIT penuh");
    expect(cdc[1]).toContain("Satu consumer dan notifikasi yang berdiri sendiri");
    expect(cdc[2]).toBe("[[t3-adr-33]]");
    expect(naskah).toContain("| 33 | Sengaja belum: microservices, Kubernetes dan canary, read replica, PgBouncer, CDC, VPS kedua");
    const urut = sel("Penghitung urut per penerima");
    expect(urut[1]).toContain("Urutan tiba tidak dipakai fitur mana pun di PRD v3");
    expect(urut[2]).toBe("Belum dijadwalkan di naskah");
    const ln = sel("`LISTEN/NOTIFY` untuk membangunkan worker");
    expect(ln[1]).toContain("Polling tiap 200 ms menambah paling lama 200 ms ke pesan yang menunggu");
    expect(ln[1]).toContain("jauh di bawah janji 95% dalam 30 detik");
    expect(naskah).toContain("Bayar dan transfer: 95% dalam kurang dari 30 detik.");
    expect(ln[2]).toBe("Belum dijadwalkan di naskah");
  });
  test("keputusan opsi C: lima aturan, pre-mortem tepat tiga, kapan salah tiga; pencegahan menunjuk tes Go yang ada", () => {
    harus("**Keputusan: opsi C.** Lima aturan, dan tiap aturan punya tugas sendiri:");
    harus("Selama klaim berlaku, yang mencegah baris dikirim dua kali adalah klausa kunci `FOR UPDATE` bersama `klaim_sampai`.");
    harus("Selama klaim berlaku, `FOR UPDATE` dan `klaim_sampai` mencegah dua worker mengirim baris yang sama.");
    const aturan = badan.split("**Keputusan: opsi C.**")[1]!.split("**Kenapa C, bukan A.**")[0]!;
    expect([...aturan.matchAll(/^\d\. /gm)]).toHaveLength(5);
    const pre = badan.split("**Pre-mortem.**")[1]!.split("**Kapan keputusan ini salah.**")[0]!;
    expect([...pre.matchAll(/^\d\. /gm)]).toHaveLength(3);
    const salah = badan.split("**Kapan keputusan ini salah.**")[1]!.split("**Yang akan merevisinya.**")[0]!;
    expect(salah).toContain("Pertama, bila urutan antar pesan penting");
    expect(salah).toContain("Kedua, bila ongkos `SKIP LOCKED` terasa");
    expect(salah).toContain("Ketiga, bila pesan mengalir jauh di atas beban Tahap 3");
    for (const t of ["TestKlaimTigaWorkerTanpaGandaTanpaTerlewat", "TestKlaimMelewatBarisYangDikunci"]) {
      expect(baca("labs/api-t3/internal/service/tahap3_test.go")).toContain(`func ${t}(`);
      harus(t);
    }
    expect(readmeLab).toContain("Semua klausa kunci dihapus dari `KlaimOutbox` (tanpa `FOR UPDATE`)");
    expect(readmeLab).toContain("`FOR UPDATE SKIP LOCKED` jadi `FOR UPDATE` di `KlaimOutbox`");
    expect(naskah).toContain("ADR 32 (merevisi ADR 23): kolom `kelas`");
    expect(naskah).toContain("ADR 25: pengiriman at-least-once, maksimal 5 percobaan lalu dead-letter");
    expect(outboxGo).toContain('urut = "kelas, id"');
    expect(workerGo).toContain("MaksPercobaan int");
    harus("**Yang akan merevisinya.** ADR 25 memakai `percobaan` yang naik saat klaim ([[t3-at-least-once]]), dan ADR 32 menambahkan `kelas` ke urutan klaim ([[t3-tim-infra]]). Keduanya melengkapi, bukan mengganti, klaim per baris.");
  });
  test("Rantai Inti: judul, sumber, label, nada, dan teks simpul diturunkan dari klaim.txt bagian A", () => {
    expect(rantai.id).toBe("t3-klaim-inti");
    expect(rantai.judul).toBe("Dua sesi memilih baris outbox, tanpa dan dengan kunci baris");
    expect(rantai.sumber).toEqual({ jenis: "rekaman", teks: "Rekaman lab t3-outbox, klaim.txt bagian A" });
    expect(rantai.baris.map((b) => [b.label, b.sub])).toEqual([["Tanpa klausa kunci", "bagian A dari klaim.txt"], ["Dengan FOR UPDATE", "bagian A dari klaim.txt"]]);
    expect(rantai.baris.map((b) => b.simpul.map((s) => s.nada))).toEqual([["biasa", "warn"], ["biasa", "good"]]);
    const sesi2 = ambil(kA, /^ sesi 2 memilih nomor (\d+), (\d+), (\d+), (\d+): baris yang sama dengan sesi 1/).slice(1).map(Number);
    const setelah = ambil(kA, /^ sesi 2 baru dijawab sesudah COMMIT sesi 1: nomor (\d+), (\d+), (\d+), (\d+) /).slice(1).map(Number);
    const rentang = (a: number[]) => `baris ${a[0]} sampai ${a[a.length - 1]}`;
    expect(rantai.baris[0]!.simpul.map((s) => [s.teks, s.sub])).toEqual([[`sesi 1 mengklaim ${rentang(sesi2)}`, "belum COMMIT"], [`sesi 2 memilih ${rentang(sesi2)} juga`, "baris yang sama"]]);
    expect(rantai.baris[1]!.simpul.map((s) => [s.teks, s.sub])).toEqual([["sesi 2 menunggu", "sampai sesi 1 COMMIT"], [`sesudah COMMIT: ${rentang(setelah)}`, "tanpa baris ganda"]]);
    expect(kA.filter((b) => b.includes("# sesi 2 menunggu baris 1 sampai 4 yang dipegang sesi 1; belum ada jawaban")).length).toBe(1);
    expect(rantai.catatan).toBe("Kotak oranye adalah akibat yang direkam: dua sesi memilih baris yang sama. Rekaman ini baru memilih baris, belum mengubahnya. Kedua baris memakai delapan baris outbox yang menunggu di PostgreSQL 17.11.");
    expect(ambil(kA, /^ menunggu \| (\d+)$/)[1]).toBe("8");
    expect(klaimTeks).toContain("PostgreSQL 17.11");
    harus("<Rantai data={intiDiagram} ringkas />");
    expect(badan.indexOf("<Rantai")).toBeGreaterThan(badan.indexOf("## Inti"));
    expect(badan.indexOf("<Rantai")).toBeLessThan(badan.indexOf("Kursor menyimpan satu titik"));
    // Inti satu kalimat sebelum Rantai, dua paragraf sesudahnya.
    const inti = badan.split("## Inti")[1]!.split("<details")[0]!.split("<Rantai data={intiDiagram} ringkas />");
    expect(inti[0]!.trim().split("\n").filter(Boolean)).toHaveLength(1);
    expect(inti[1]!.trim().split("\n\n")).toHaveLength(2);
  });
  test("Cek diri: empat kartu; jawaban merujuk bagian rekaman yang benar; kode kartu 1 tanpa klausa kunci", () => {
    const cek = badan.split("### Cek diri")[1]!.split("### Saat me-review")[0]!;
    expect([...cek.matchAll(/^\*\*(\d)\.\*\*/gm)].map((m) => m[1])).toEqual(["1", "2", "3", "4"]);
    expect(cek).toContain("SELECT id FROM outbox\nWHERE status = 'menunggu'\nORDER BY id\nLIMIT 4;");
    expect(cek).not.toMatch(/FOR UPDATE\nWHERE|SKIP LOCKED\nLIMIT/);
    harus("Di `klaim.txt` bagian A, sesi 2 mendapat baris 1 sampai 4 sementara sesi 1 baru mengklaimnya.");
    harus("Di `klaim.txt` bagian A, sesi 2 dengan `FOR UPDATE` menunggu, lalu mendapat baris 5 sampai 8.");
    harus("Urutannya 2, 3, 4, 5, lalu 1 (`klaim.txt` bagian C).");
    harus("Di `listen.txt` bagian B, barisnya tetap menunggu di tabel dan baru terkirim saat worker yang polling menemukannya.");
    expect(kC.join("\n")).toContain("urutan di layanan push (nomor outbox): 2 -> 3 -> 4 -> 5 -> 1");
    expect(kD.join("\n")).toContain("nomor outbox yang dikirim: 5, 6, 7, 8");
  });
});

// ---- setiap kalimat di halaman punya asal ---------------------------------------------------------------------------------
function satuan(b: string): string[] {
  const hasil: string[] = [];
  let dalamKode = false;
  let dalamSnippet = false;
  for (const mentah of b.split("\n")) {
    const l = mentah.trim();
    if (l.startsWith("```")) { dalamKode = !dalamKode; continue; }
    if (dalamKode) continue;
    if (dalamSnippet) { if (l.includes("`} />")) dalamSnippet = false; continue; }
    if (l.startsWith("<Snippet")) { if (l.includes("code={`") && !l.includes("`} />")) dalamSnippet = true; continue; }
    if (!l || l.startsWith("import ") || l.startsWith("<Rantai") || l.startsWith("<OutboxWorker") || l.startsWith("<p class=\"meta\"")) continue;
    if (l.startsWith("</") || l.startsWith("<details") || l.startsWith("<summary>") || l.startsWith("<TabSet") || l.startsWith("<Fragment") || /^\|[-| ]+\|$/.test(l)) continue;
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
  // Menukar sel antar baris atau kolom tabel lolos dua tes di atas karena keduanya hanya memeriksa keanggotaan.
  test("urutan satuan halaman sama dengan urutan KALIMAT_PENULIS (sel tabel tidak bisa bertukar tempat)", () => {
    expect(satuan(badan)).toEqual(KALIMAT_PENULIS);
  });
});

// Kalimat halaman yang ditulis penulis, dikunci utuh. Nilai di dalamnya diperiksa terpisah di atas terhadap sumbernya.
const KALIMAT_PENULIS: string[] = [
  "Inti",
  "Worker mengklaim baris, tanpa kursor, karena urutan id bukan urutan COMMIT.",
  "Kursor menyimpan satu titik, yaitu `(dibuat, id)` baris terakhir yang dibaca. Baris yang COMMIT belakangan berada di belakang titik itu, dan kursor yang hanya maju tidak membacanya ([[t3-m19]]). Klaim per baris tidak menyimpan titik. Tiap putaran, worker meminta baris yang menunggu dan tidak dipegang siapa pun, lalu menahannya dengan kunci baris dan batas waktu `klaim_sampai`.",
  "Selama klaim berlaku, `FOR UPDATE` dan `klaim_sampai` mencegah dua worker mengirim baris yang sama. `SKIP LOCKED` tidak menambah kebenaran: ia membuat worker kedua melewati baris yang terkunci, bukan menunggunya. Urutan antar pesan juga tidak dijaga. Di rekaman, baris 1 yang tertahan dikirim paling akhir.",
  "Dua worker memilih baris dengan `SELECT` tanpa klausa kunci. Apa yang terjadi pada baris yang sama?",
  "Apa yang dikerjakan `SKIP LOCKED`, dan apa yang bukan tugasnya?",
  "Worker A mengklaim baris 1 lalu macet, sementara worker B mengambil baris 2 sampai 5. Dalam urutan apa baris sampai ke layanan push?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "Kalau berhenti di sini, kamu sudah tahu: poller kursor melewatkan baris yang COMMIT belakangan, sedangkan klaim per baris mengirim keduanya, apa pun urutan COMMIT-nya.",
  "Widget ini memutar ulang dua transfer ke Citra dari rekaman lab: Budi dan Dimas masing-masing mengirim Rp25.000. Tebak dulu berapa notifikasi yang sampai ke HP Citra bila worker memakai kursor. Pertanyaannya sama dengan di [[t3-m19]]. Bila kamu sudah menjawabnya di sana, jawab lagi dengan cepat, lalu lanjut ke bagian ubah.",
  "Tiga dari empat pengaturan punya bagian rekaman di `kursor.txt`: A, B, dan C. Bagian A merekam nomor outbox dan urutan `dibuat`, bukan urutan COMMIT. Klaim per baris dengan COMMIT berurutan tidak direkam sebagai bagian sendiri, jadi widget menandainya Hitungan. Arti label ada di [Label sumber](/cara-pakai/#label-sumber).",
  "**Ubah satu hal:** pada Cara worker mengambil, pilih Klaim per baris, dengan urutan COMMIT tetap terbalik. HP Citra menerima dua notifikasi dan tidak ada baris yang tertinggal. Lalu pilih Kursor dengan COMMIT berurutan: kursor juga mengirim keduanya. Di widget ini kursor melewatkan baris hanya pada urutan COMMIT yang terbalik.",
  "Kenapa ini ada",
  "Di [[t3-m19]], saldo Citra naik Rp50.000 dari dua transfer, tetapi HP-nya menerima satu notifikasi. Dugaan di naskah: token perangkat Citra salah, atau poller butuh nomor urut tanpa celah. Keduanya salah arah, karena datanya benar dan pembacanya yang melewatkan satu baris.",
  "Halaman ini menjawab tiga pertanyaan. Kenapa kursor melewatkan baris, apa yang membuat klaim per baris tidak melewatkan dan tidak mengirim ganda, dan apa yang tetap tidak dijaga.",
  "Cara kerjanya",
  "**Kenapa kursor melewatkan baris.** Kursor mengandaikan baris baru selalu masuk di belakang baris yang sudah dibaca. Dua kolomnya tidak menjamin itu. `dibuat` berisi `now()`, yaitu waktu awal transaction, bukan waktu COMMIT ([PostgreSQL 17, bab 9.9.5](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT), dibuka 2026-10-26). `id` datang dari sequence. Dokumentasi menulis bahwa sequence tidak bisa dipakai untuk nomor tanpa celah, dan tidak menyebut urutan COMMIT ([PostgreSQL 17, bab 9.17](https://www.postgresql.org/docs/17/functions-sequence.html), dibuka 2026-10-26).",
  "Di rekaman, Budi mulai lebih dulu tetapi menunggu bukunya sendiri, dan Dimas COMMIT lebih dulu. Baris Dimas bernomor 1 dengan urutan `dibuat` ke-2, sedangkan baris Budi bernomor 2 dengan urutan `dibuat` ke-1. Poller sudah maju ke baris Dimas, jadi baris Budi tertinggal:",
  "Kursor itu hanya ada di memori poller. Sesudah restart, poller membaca lagi dari awal (dibaca dari kode lab, tidak direkam).",
  "**Satu pernyataan untuk klaim.** Klaim ditulis sebagai satu pernyataan SQL yang memilih baris yang layak, mengunci, lalu menulis `klaim_sampai`. Kolom itu ada di tabel `outbox` sejak migration 000017.",
  "Tiap bagian punya tugas sendiri.",
  "`WHERE`: baris yang layak berstatus `menunggu`, sudah waktunya dicoba (`coba_lagi`), dan tidak punya klaim yang masih berlaku.",
  "`ORDER BY kelas, id LIMIT $1`: paling banyak c baris per putaran. Nilai bawaan c adalah 4.",
  "`FOR UPDATE SKIP LOCKED`: mengunci baris yang terpilih selama pernyataan berjalan, dan melewati baris yang sudah dikunci transaction lain.",
  "`UPDATE ... klaim_sampai`: menahan baris sesudah kunci lepas, dan menaikkan `percobaan` satu.",
  "Kunci hanya ada selama satu pernyataan. Sesudah itu yang menahan baris adalah `klaim_sampai`, yang bawaannya 5 detik di worker (Asumsi lab, kode `Bawaan()`).",
  "**Tanpa klausa kunci.** Sesi 1 mengklaim baris 1 sampai 4 dan belum COMMIT. Sesi 2 memilih dengan syarat yang sama dan mendapat baris 1 sampai 4 juga, karena klaim sesi 1 belum terlihat olehnya:",
  "Rekaman ini baru memilih, belum mengubah. Uji mutasi di README lab mencatat hasil pada kode worker: dengan semua klausa kunci dihapus dari `KlaimOutbox`, tiga worker mengklaim 104 baris untuk 60 baris. Angka itu bukan bagian rekaman keluaran, jadi bukan Rekaman lab.",
  "**Dengan FOR UPDATE.** Sesi 2 menunggu baris 1 sampai 4, lalu dijawab sesudah COMMIT sesi 1 dengan baris 5 sampai 8. Baris 1 sampai 4 sudah tidak layak, karena `klaim_sampai`-nya sekarang di masa depan. Di READ COMMITTED, PostgreSQL memeriksa ulang syarat `WHERE` pada versi baris yang baru ([PostgreSQL 17, bab 13.2.1](https://www.postgresql.org/docs/17/transaction-iso.html#XACT-READ-COMMITTED), dibuka 2026-10-26):",
  "**Dengan SKIP LOCKED.** Sesi 2 langsung mendapat baris 5 sampai 8 tanpa menunggu. Sesi 3 mendapat 0 baris walau queue belum kosong, karena semua baris yang layak sedang dipegang:",
  "Dokumentasi menyebut ongkos ini. Melewati baris terkunci memberi tampilan data yang tidak konsisten, jadi tidak cocok untuk pekerjaan umum. Gunanya menghindari lock contention bila banyak consumer membaca tabel yang berperan sebagai queue ([PostgreSQL 17, SELECT: The Locking Clause](https://www.postgresql.org/docs/17/sql-select.html#SQL-FOR-UPDATE-SHARE), dibuka 2026-10-26).",
  "**Tiga worker, 60 baris.** Tiga proses worker berjalan bersamaan sampai queue habis. Semua 60 baris diklaim, terkirim, dan tidak ada yang ganda. Pembagian per worker tidak direkam, karena bergantung waktu:",
  "**Kapan SKIP LOCKED terasa.** Di bagian D, sesi tangan memegang baris 1 sampai 4 dengan `FOR UPDATE` tanpa mengubahnya, jadi `klaim_sampai` tetap kosong. Worker sungguhan mengklaim baris 5 sampai 8 tanpa menunggu, dan hanya `SKIP LOCKED` yang melewati baris 1 sampai 4 di sini. Sesudah ROLLBACK, keempatnya dikirim:",
  "Tanpa `SKIP LOCKED`, uji mutasi di README lab mencatat worker belum selesai dalam 10 detik, karena ia menunggu baris yang dikunci sesi tangan. Klaim sendiri hanya sebentar, jadi `SKIP LOCKED` penting bila ada pemegang lock lain di baris outbox yang bertahan lebih lama dari satu pernyataan klaim.",
  "**Kenapa tidak ada baris yang terlewat.** Klaim tidak punya kursor. Tiap putaran memeriksa semua baris yang layak, jadi baris yang COMMIT belakangan terlihat di putaran berikutnya. Baris Dimas sudah dikirim poller kursor, jadi worker mengklaim satu baris: baris Budi yang tertinggal.",
  "**Urutan antar pesan tidak dijaga.** Worker A mengklaim baris 1 lalu macet. Worker B mengirim baris 2 sampai 5, dan baris 1 baru terkirim sesudah klaim A habis:",
  "Baris 1 dilewati karena `klaim_sampai`-nya masih di masa depan, bukan karena `SKIP LOCKED`: `WHERE` mengeluarkannya sebelum ada yang dikunci. Dokumentasi menulis hal yang serupa untuk satu pernyataan. `ORDER BY` bersama klausa kunci di READ COMMITTED bisa mengembalikan baris tidak berurutan, karena pengurutan terjadi sebelum baris terkunci.",
  "Akibatnya tiap baris outbox harus berdiri sendiri. Payload membawa judul dan catatannya sendiri, mis. \"Rp25.000 dari Budi\" ([[t3-skema]] membahas tabelnya), jadi dua notifikasi yang tiba terbalik tetap terbaca benar. Pesan yang artinya bergantung pada pesan sebelumnya tidak cocok dengan queue ini.",
  "**Klaim yang habis.** `klaim_sampai` adalah lease: batas waktu satu worker memegang baris. Worker yang berhenti sesudah push berhasil dan sebelum menandai terkirim membuat barisnya dikirim ulang oleh worker lain sesudah klaim habis, dengan `notifikasi_id` yang sama:",
  "Percobaan naik saat klaim, bukan saat gagal. Batas 5 percobaan dihitung saat klaim, dan klaim ke-6 masuk dead-letter tanpa mengirim (`retry.txt` bagian C). Kejadian ganda ada di [[t3-m20]] dan penyaringnya di [[t3-at-least-once]].",
  "**LISTEN dan NOTIFY hanya membangunkan.** `NOTIFY` di dalam transaction tidak terkirim sebelum COMMIT, dan `LISTEN` mendaftarkan sesi yang sedang mendengar ([PostgreSQL 17: NOTIFY](https://www.postgresql.org/docs/17/sql-notify.html), dibuka 2026-10-26). Di lab, listener menerima nomor baris sesudah COMMIT dan tidak menerima apa pun saat ROLLBACK:",
  "Pendaftaran `LISTEN` hilang saat sesi berakhir ([PostgreSQL 17: LISTEN](https://www.postgresql.org/docs/17/sql-listen.html), dibuka 2026-10-26). Dokumentasi NOTIFY tidak menulis nasib notifikasi yang dikirim selagi listener putus. Rekaman lab menjawabnya untuk satu kejadian: notifikasi itu tidak pernah sampai, dan barisnya tetap menunggu di tabel sampai worker yang polling menemukannya:",
  "Dokumentasi LISTEN sendiri menyarankan memeriksa keadaan database sesudah `LISTEN` berjalan, lalu mengandalkan notifikasi untuk perubahan berikutnya. Di `labs/api-t3` (kode Go dan migration) tidak ada `LISTEN` atau `NOTIFY`, dan worker memakai polling dengan jeda bawaan 200 ms. Perilaku di atas direkam dengan skrip lab Python.",
  "**Berapa kiriman sekaligus.** Satu putaran worker mengklaim paling banyak c baris, lalu mengirimnya serentak, satu goroutine per baris. Batas klaim sama dengan batas paralelisme, jadi tidak ada semaphore lain:",
  "Kapasitasnya c ÷ t = 4 ÷ 0,3 = 13,3 baris per detik (c dan t Asumsi naskah). Rekaman `queue.txt` bagian A mengukur antara 12 dan 13,33 per detik. Rekaman lab `b8-concurrency` menunjukkan kenapa paralelisme dibatasi, karena layanan luar bisa punya kuota. Sepuluh kiriman 500 ms butuh 5,02 detik berurutan, 0,50 detik paralel penuh, dan 2,01 detik dengan batas tiga bersamaan:",
  "Tiap goroutine pengirim harus punya jalan keluar. Rekaman lab yang sama mencatat 1.000 goroutine tertinggal bila pemanggil menyerah duluan (5 sebelum, 1.005 sesudah). Di worker, jalan keluarnya timeout push 3 detik ([[t3-m18]]).",
  "Di stack lain",
  "**Skenario:** worker mengambil baris queue di PostgreSQL tanpa dua worker mengirim baris yang sama. Tab Go adalah kode lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi atau kode sumber pada 2026-10-26.",
  "Yang sama di semua stack: baris dikunci selama klaim dan ditahan sesudahnya. Yang berbeda adalah siapa yang menulis klausa kunci, ada tidaknya batas waktu klaim, dan model concurrency proses worker. Menunggu jaringan sama cepatnya di Go dan Node.js: paralel 0,50 dan 0,51 detik untuk 10 kiriman 500 ms (Rekaman lab `b8-concurrency`). Bedanya terasa pada kerja CPU: saat satu request menghitung 1 detik, `/ping` dijawab dalam 0,35 ms di Go dan 0,96 detik di Node.js (`cpu.txt`).",
  "*Dijalankan: lab api-t3 dan t3-outbox, PostgreSQL 17.11 (rekaman `klaim.txt` bagian A sampai D).*",
  "**Yang berbeda di stack ini:** klaim ditulis sebagai SQL tangan lewat `database/sql`, tanpa library queue. Cabang `Kursor` adalah mode rentan M19. Request lain tetap dijawab saat satu request menghitung (rekaman `b8-concurrency`: 0,35 ms).",
  "*Tidak dijalankan. Dicek ke [README pg-boss](https://github.com/timgit/pg-boss), pg-boss 12.38.0 (npm, rilis 2026-10-13), dibuka 2026-10-26.*",
  "**Yang berbeda di stack ini:** pg-boss adalah queue Node.js di atas PostgreSQL, dengan tabel dan klaim yang disediakan library. Menurut README, ia bertumpu pada `SKIP LOCKED`, worker bersamaan mengklaim job tanpa saling memblokir, dan pollingnya mendukung `LISTEN/NOTIFY`. Di rekaman `b8-concurrency`, satu request Node.js yang menghitung 1 detik menahan `/ping` selama 0,96 detik. Handler job yang berat di CPU butuh proses sendiri (penalaran).",
  "*Tidak dijalankan. Dicek ke kode sumber [`DatabaseQueue`](https://github.com/laravel/framework/blob/v13.38.0/src/Illuminate/Queue/DatabaseQueue.php), `laravel/framework` 13.38.0, dan [Laravel 13.x: Queues](https://laravel.com/docs/13.x/queues).*",
  "**Yang berbeda di stack ini:** halaman Queues tidak menyebut `SKIP LOCKED`, tetapi kode driver `database` memakainya. Untuk PostgreSQL 9.5 ke atas, driver memilih `FOR UPDATE SKIP LOCKED`, lalu menulis `reserved_at` dan menaikkan `attempts`. Job yang `reserved_at`-nya lebih tua dari `retryAfter` boleh diambil lagi, jadi pasangannya sama dengan `klaim_sampai`. Kamu tidak menulis SQL-nya.",
  "*Tidak dijalankan. Dicek ke [Django 6.1: QuerySet API, select_for_update](https://docs.djangoproject.com/en/6.1/ref/models/querysets/#select-for-update), Django 6.1.2. Kode di bawah adalah Ilustrasi.*",
  "**Yang berbeda di stack ini:** ORM menyediakan klausa kunci lewat `select_for_update(skip_locked=True)`. Dokumentasi menulis bahwa `nowait` dan `skip_locked` tidak bisa dipakai bersamaan, dan bahwa di autocommit pemanggilannya menimbulkan `TransactionManagementError`. Halaman itu tidak membahas batas waktu klaim, jadi kolom seperti `klaim_sampai` kamu tulis sendiri.",
  "*Tidak dijalankan. Dicek ke [Serverpod: Scheduling](https://docs.serverpod.dev/concepts/scheduling/overview), Serverpod 4.0.4 (halaman bertanda 4.0.0).*",
  "**Yang berbeda di stack ini:** future call disimpan di database dan dijalankan at-least-once. Dokumentasi menulis bahwa satu instance mengklaim tiap call dan biasanya menjalankannya sekali. Bila instance itu mati, instance lain mengambilnya lagi, jadi satu call kadang berjalan lebih dari sekali. Halaman itu tidak menyebut kata lock, jadi cara klaim antar instance tidak bisa dibaca dari sana.",
  "*Tidak dijalankan. Dicek ke [Supabase: Queues](https://supabase.com/docs/guides/queues) dan [pgmq: functions](https://github.com/pgmq/pgmq/blob/main/docs/api/sql/functions.md), pgmq v1.13.1 (rilis GitHub 2026-10-20; dokumentasi cabang utama), dibuka 2026-10-26.*",
  "**Yang berbeda di stack ini:** Supabase Queues dibangun di atas ekstensi pgmq. `pgmq.read` menerima `vt`: lama pesan tak terlihat oleh consumer lain sesudah dibaca, pasangan `klaim_sampai`. Dokumentasi yang dibuka tidak menyebut `SKIP LOCKED`, jadi cara pgmq menghindari dua consumer pada pesan yang sama tidak terbaca dari sana.",
  "ADR 24: worker mengklaim baris, tanpa kursor",
  "**Kebutuhan.** Di [[t3-m19]], saldo Citra naik Rp50.000 dari dua transfer, tetapi HP-nya menerima satu notifikasi. Hal kedua di [[t3-dua-tempat]] berbunyi uang yang tercatat tidak kehilangan pemberitahuannya tanpa ada yang tahu. Poller outbox di [[t3-outbox]] juga harus aman dijalankan lebih dari satu: tiga worker serentak di rekaman mengirim 60 baris tanpa ganda.",
  "**Status:** diterima di minggu 4 Tahap 3, sesudah M19. Berlaku untuk worker outbox. Aturan 5 ADR 16 sudah melarang kursor `(dibuat, id)` untuk pembaca aliran seperti notifikasi ([[t2-kursor]]).",
  "",
  "A. Kursor `(dibuat, id)`",
  "B. Nomor urut tanpa celah",
  "C. Klaim per baris",
  "D. LISTEN dan NOTIFY sebagai sumber",
  "Cara kerja",
  "Poller menyimpan `(dibuat, id)` baris terakhir yang dibaca dan meminta baris sesudahnya, seperti ADR 16",
  "Tiap baris outbox mendapat nomor dari penghitung yang dinaikkan di bawah lock baris, per penerima atau global. Poller membaca nomor berikutnya dan menunggu bila ada yang hilang (pola opsi D di ADR 16)",
  "Worker mengambil baris yang menunggu dan tidak dipegang dengan `FOR UPDATE SKIP LOCKED`, lalu menahannya sampai `klaim_sampai`",
  "Pembayaran memanggil `pg_notify` di transaction jurnal. Listener menerima nomor baris sesudah COMMIT dan mengirimnya, tanpa polling",
  "Kelebihan",
  "Tanpa kolom baru dan tanpa lock. Urutan keluaran mengikuti `dibuat`",
  "Urutan sama dengan urutan COMMIT, karena lock dipegang sampai COMMIT. Nomor yang hilang terdeteksi",
  "Baris COMMIT belakangan terlihat di putaran berikutnya. Tiga worker, 60 baris, 0 ganda. Klaim yang habis melepas baris dari worker yang mati",
  "Worker terbangun seketika, tanpa jeda polling",
  "Kekurangan",
  "Melewatkan baris yang COMMIT belakangan. Kursor disimpan di tiap proses worker, jadi hanya cocok untuk satu poller (dibaca dari kode lab)",
  "Penghitung global membuat semua pembayaran antre di satu baris. Satu jalur tulis yang lupa menaikkannya merusak jaminan tanpa tanda. `bigserial` tidak bisa dipakai: sesudah ROLLBACK baris berikutnya bernomor 3, bukan 2",
  "Urutan antar pesan tidak dijaga. `SKIP LOCKED` memberi tampilan tidak konsisten: sesi ketiga mendapat 0 baris walau queue belum kosong. Klaim yang terlalu pendek menghasilkan ganda",
  "Notifikasi yang dikirim selagi listener putus tidak pernah sampai, dan barisnya menunggu. `NOTIFY` di jalur uang menambah satu cara COMMIT gagal bila queue notifikasi penuh",
  "Biaya operasional",
  "Kursor harus disimpan dan dijaga satu proses",
  "Kolom baru, backfill, dan satu baris penghitung yang dikunci tiap pembayaran",
  "Kolom `klaim_sampai` dan `percobaan`, index `outbox_antre`, dan panjang klaim yang dihitung ulang bila batas push berubah",
  "Satu koneksi tetap terbuka untuk mendengar, dan polling tetap dibutuhkan sebagai cadangan",
  "Bukti",
  "Rekaman `kursor.txt` A sampai D; [[t2-kursor]]",
  "Tidak dijalankan. Rekaman `listen.txt` B untuk celah nomor; PostgreSQL 17 bab 9.17; ADR 16 opsi D",
  "Rekaman `klaim.txt` A sampai D, `kursor.txt` C, `ganda.txt` B dan D; PostgreSQL 17 SELECT",
  "Rekaman `listen.txt` A dan B; PostgreSQL 17 NOTIFY dan LISTEN",
  "Opsi B Tidak dijalankan di lab: yang direkam hanya celah pada nomor sequence, yaitu baris sesudah INSERT yang di-ROLLBACK bernomor 3 (`listen.txt` bagian B). Cara kerja dan kekurangannya berasal dari ADR 16 dan penalaran, bukan dari ukuran.",
  "**Keputusan: opsi C.** Lima aturan, dan tiap aturan punya tugas sendiri:",
  "Worker mengklaim baris dalam satu pernyataan dengan `FOR UPDATE SKIP LOCKED` dan `klaim_sampai`, tanpa kursor. Tugasnya membuat baris COMMIT belakangan tetap terlihat.",
  "Selama klaim berlaku, yang mencegah baris dikirim dua kali adalah klausa kunci `FOR UPDATE` bersama `klaim_sampai`. `SKIP LOCKED` hanya mengganti menunggu dengan melewati baris yang terkunci.",
  "Klaim lebih panjang dari waktu kirim terburuk satu baris, yaitu jumlah perangkat × batas waktu push. Klaim bawaan 5 detik hanya muat satu perangkat yang menggantung.",
  "Urutan antar pesan tidak dijaga. Tiap baris outbox membawa isi lengkap, dan tidak ada fitur yang bergantung pada urutan tiba.",
  "`LISTEN` dan `NOTIFY` hanya boleh membangunkan worker. Tabel tetap sumber, dan polling tetap berjalan. `labs/api-t3` belum memakainya.",
  "**Kenapa C, bukan A.** A melewatkan baris yang COMMIT belakangan. Rekaman `kursor.txt` memakai penghambat buatan di bagian B untuk memanjangkan celahnya, dan bagian D menunjukkan bahwa urutan `dibuat` dan nomor bisa terbalik tanpa penghambat. C memperbaikinya tanpa kolom urutan.",
  "**Kenapa C, bukan B.** B menjaga urutan, tetapi penghitung global membuat semua pembayaran antre di satu baris. Penghitung per penerima mengharuskan setiap jalur tulis outbox menaikkannya di bawah lock buku. Pemberitahuan di Tahap 3 berdiri sendiri, jadi urutan penuh tidak dibutuhkan.",
  "**Kenapa C, bukan D.** Pesan yang dikirim selagi listener putus hilang, jadi D tidak bisa jadi satu-satunya sumber. Tabel dan polling harus tetap ada, dan di titik itu D hanya menurunkan jeda.",
  "**Kasus industri: Solid Queue (37signals, 2023 dan 2024).** Dalam tulisan 2023-12-18, 37signals menyebut `SELECT ... FOR UPDATE SKIP LOCKED` penting bagi implementasi mereka, karena worker bisa mengambil dan mengunci job tanpa mengunci worker lain. Fitur itu mereka tulis baru hadir di MySQL 8.",
  "Di antara alasan pindah dari Resque, mereka menulis tujuh gem untuk menjalankan job dan tantangan mengoperasikan Redis di skala mereka. Debugging juga lebih mudah di database relasional ([Introducing Solid Queue](https://dev.37signals.com/introducing-solid-queue/), dibuka 2026-10-26).",
  "Tulisan 2024-09-26 melaporkan HEY memproses ±20 juta job per hari dengan 800 worker di 74 VM dan dua datacenter ([Solid Queue 1.0 released](https://dev.37signals.com/solid-queue-v1-0/), dibuka 2026-10-26). README Solid Queue menulis bahwa ia memakai `FOR UPDATE SKIP LOCKED`, bila tersedia, untuk menghindari menunggu lock saat polling ([rails/solid_queue](https://github.com/rails/solid_queue), dibuka 2026-10-26). Itu sejalan dengan rekaman di atas: `SKIP LOCKED` mengganti menunggu.",
  "Batasnya satu produk Rails, dengan Solid Queue di database terpisah dari aplikasi utama. Jadi kasus ini mendukung klaim lewat database, bukan klaim yang ikut COMMIT uang. Bebannya 20 juta lawan 7.500 pemberitahuan per hari (Asumsi naskah), yaitu ±2.667 kali.",
  "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:",
  "Klaim lebih pendek dari waktu kirim, sehingga baris terkirim dua kali tanpa ada yang mati. Dengan klaim 300 ms dan push yang menjawab sesudah 1,5 detik, dua worker mengirim baris yang sama (`ganda.txt` bagian B). Dengan klaim 5 detik pun, dua perangkat yang menggantung memakan 2 × 3 detik (bagian D). Pencegahannya aturan 3: hitung ulang klaim bila batas push atau jumlah perangkat per akun berubah, dan tulis penyaring di app ([[t3-at-least-once]]).",
  "Seseorang \"menyederhanakan\" `KlaimOutbox`. Menghapus klausa kunci membuat ganda, dan menghapus `SKIP LOCKED` membuat worker menunggu pemegang lock lain. Pencegahannya tes Go `TestKlaimTigaWorkerTanpaGandaTanpaTerlewat` dan `TestKlaimMelewatBarisYangDikunci` di api-t3, serta lab `klaim` yang gagal bila klausanya berubah.",
  "Fitur baru bergantung pada urutan tiba, mis. pesan \"saldo sekarang\" yang menimpa pesan sebelumnya. Dua pesan yang tiba terbalik meninggalkan angka lama. Pencegahannya aturan 4 dan satu tes yang membalik urutan kirim untuk jenis pesan baru sebelum jenis itu dirilis.",
  "**Kapan keputusan ini salah.** Pertama, bila urutan antar pesan penting: klaim per baris tidak menjaga urutan, dengan atau tanpa `SKIP LOCKED`, dan opsi B atau log-based CDC lebih cocok. Kedua, bila ongkos `SKIP LOCKED` terasa: dokumentasi menyebut tampilan data yang tidak konsisten, dan di lab sesi ketiga mendapat 0 baris walau queue belum kosong.",
  "Ketiga, bila pesan mengalir jauh di atas beban Tahap 3. Pembanding Solid Queue menunjukkan klaim lewat database dipakai pada ±20 juta job per hari, tetapi dengan 800 worker, dan itu bukan hasil lab ini. Ongkos klaim sendiri tidak diukur terpisah di lab t3-outbox: `queue.txt` bagian A mengukur kapasitas worker secara utuh.",
  "**Yang akan merevisinya.** ADR 25 memakai `percobaan` yang naik saat klaim ([[t3-at-least-once]]), dan ADR 32 menambahkan `kelas` ke urutan klaim ([[t3-tim-infra]]). Keduanya melengkapi, bukan mengganti, klaim per baris.",
  "Sengaja belum dilakukan",
  "Yang ditunda",
  "Kenapa ditunda",
  "Muncul lagi di",
  "Log-based CDC untuk urutan COMMIT penuh",
  "Satu consumer dan notifikasi yang berdiri sendiri tidak butuh urutan penuh",
  "[[t3-adr-33]]",
  "Penghitung urut per penerima",
  "Urutan tiba tidak dipakai fitur mana pun di PRD v3",
  "Belum dijadwalkan di naskah",
  "`LISTEN/NOTIFY` untuk membangunkan worker",
  "Polling tiap 200 ms menambah paling lama 200 ms ke pesan yang menunggu (Hitungan dari jeda bawaan, Asumsi lab), jauh di bawah janji 95% dalam 30 detik",
  "Belum dijadwalkan di naskah",
  "Cek diri",
  "**1.** AI menulis klaim ini untuk worker. Apa yang rusak, dan bagaimana memperbaikinya?",
  "Pilihannya tanpa klausa kunci dan tanpa klaim, jadi dua worker bisa memilih baris yang sama. Di `klaim.txt` bagian A, sesi 2 mendapat baris 1 sampai 4 sementara sesi 1 baru mengklaimnya. Perbaikannya satu pernyataan: `FOR UPDATE SKIP LOCKED` di dalam `WITH`, lalu `UPDATE` yang menulis `klaim_sampai` dan menaikkan `percobaan`.",
  "**2.** Raka menghapus `SKIP LOCKED` karena \"`FOR UPDATE` sudah cukup\". Apa yang tetap benar, dan apa yang berubah?",
  "Tetap benar: tidak ada baris ganda. Di `klaim.txt` bagian A, sesi 2 dengan `FOR UPDATE` menunggu, lalu mendapat baris 5 sampai 8. Yang berubah: worker menunggu baris yang dikunci transaction lain. Di bagian D, sesi tangan memegang baris 1 sampai 4, dan uji mutasi di README lab mencatat worker belum selesai dalam 10 detik.",
  "**3.** Worker A mengklaim baris 1 lalu macet, dan worker B mengambil baris 2 sampai 5. Dalam urutan apa baris sampai ke layanan push, dan kenapa?",
  "Urutannya 2, 3, 4, 5, lalu 1 (`klaim.txt` bagian C). Baris 1 dilewati karena `klaim_sampai`-nya masih di masa depan, bukan karena `SKIP LOCKED`. Klaim per baris menjaga baris tidak ganda dan tidak terlewat, bukan urutan.",
  "**4.** Kenapa `LISTEN` dan `NOTIFY` tidak boleh jadi satu-satunya cara worker tahu ada baris baru?",
  "Notifikasi yang dikirim selagi listener putus tidak pernah sampai ke listener baru. Di `listen.txt` bagian B, barisnya tetap menunggu di tabel dan baru terkirim saat worker yang polling menemukannya. Karena itu tabel dan polling tetap sumber, dan `NOTIFY` hanya membangunkan.",
  "Saat me-review kode AI, cek ini",
  "Klaim baris queue satu pernyataan: pilih, kunci, dan tulis batas klaim, bukan `SELECT` lalu `UPDATE` di dua langkah.",
  "Ada klausa kunci (`FOR UPDATE`) dan kolom batas klaim, bukan hanya `SKIP LOCKED`.",
  "Panjang klaim lebih besar dari waktu kirim terburuk satu baris (perangkat × timeout push).",
  "Poller tidak membaca dengan kursor `(dibuat, id)` atau nomor `id` untuk pesan yang tidak boleh terlewat.",
  "Tidak ada fitur yang bergantung pada urutan tiba antar pesan, atau urutannya dijaga di tempat lain.",
  "`LISTEN` dan `NOTIFY` hanya pemicu, dan polling tetap berjalan.",
  "Goroutine pengirim punya jalan keluar, mis. timeout di client push.",
  "Bacaan lanjut",
  "[PostgreSQL 17: SELECT, The Locking Clause](https://www.postgresql.org/docs/17/sql-select.html#SQL-FOR-UPDATE-SHARE)",
  "[PostgreSQL 17: Transaction Isolation, Read Committed](https://www.postgresql.org/docs/17/transaction-iso.html#XACT-READ-COMMITTED)",
  "[PostgreSQL 17: NOTIFY](https://www.postgresql.org/docs/17/sql-notify.html) dan [LISTEN](https://www.postgresql.org/docs/17/sql-listen.html)",
  "[PostgreSQL 17: Sequence Manipulation Functions](https://www.postgresql.org/docs/17/functions-sequence.html)",
  "[37signals: Introducing Solid Queue](https://dev.37signals.com/introducing-solid-queue/) (2023) dan [Solid Queue 1.0 released](https://dev.37signals.com/solid-queue-v1-0/) (2024)",
  "[pg-boss](https://github.com/timgit/pg-boss) dan [pgmq](https://github.com/pgmq/pgmq)",
];
