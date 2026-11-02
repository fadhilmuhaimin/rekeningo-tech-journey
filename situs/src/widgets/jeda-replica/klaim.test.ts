// Penjaga klaim widget jeda replica (W5-lag), ditambahkan peninjau PR 492 (keputusan 1677). Uji mutasi peninjau menemukan bahwa
// kalimat acuan, ringkasan aturan, dan batas di t5-lag.json (nama sumber bacaan, kode status, angka, kata "primary" lawan "replica")
// bisa diubah tanpa satu tes pun gagal: sumber.test.ts hanya memeriksa baris `bukti`, yang tidak tampil, bukan kalimat `teks` yang
// dibaca pembaca. Tes di sini menurunkan kalimat itu dari rekaman lab t5-replika dan kode api-t5:
//   1. frasa yang harus ada di kalimat acuan DAN di bagian rekaman yang dinamai (satu sisi berubah, tes gagal);
//   2. nama sumber bacaan, saldo, dan kode status di kalimat acuan token dibaca dari kepala X-Dibaca-Dari dan badan JSON rekaman;
//   3. label pendamping (tanpaAcuan, petunjuk jeda) diturunkan dari label sumber dan judul bagian jeda.txt.
// Kalimat tanpa sumber yang bisa menurunkannya dikunci literal di kunci.test.ts, dengan baris sumbernya.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import mentah from "../../../data/widget/t5-lag.json";
import { DataLag } from "./skema";

const d = DataLag.parse(mentah);
const AKAR = path.resolve(__dirname, "../../../..");
const baca = (rel: string) => fs.readFileSync(path.join(AKAR, rel), "utf8");
const norm = (s: string) => s.replace(/\s+/g, " ").toLowerCase();
const REKAMAN = (berkas: string) => baca(`labs/t5-replika/output/${berkas}`);
const bagian = (isi: string, huruf: string): string => {
  const awal = isi.indexOf(`# --- ${huruf}. `);
  expect(awal, `bagian ${huruf} ada`).toBeGreaterThan(-1);
  const lanjut = isi.indexOf("\n# --- ", awal + 1);
  return lanjut === -1 ? isi.slice(awal) : isi.slice(awal, lanjut);
};
const blokCurl = (isi: string) =>
  isi.split(/^\$ /m).slice(1).filter((b) => b.startsWith("curl")).map((b) => {
    const baris = b.split("\n");
    const j = baris.find((x) => x.startsWith("{"));
    return { perintah: baris[0]!, teks: b, status: /^HTTP\/1\.1 (\d{3})/m.exec(b)?.[1], json: j ? JSON.parse(j) : null };
  });
const kepala = (b: { teks: string }, nama: string) => new RegExp(`^${nama}: (.+)$`, "m").exec(b.teks)?.[1];
const titik = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
// kepala X-Dibaca-Dari memakai "replika" (ejaan kode lab); teks pembaca memakai "replica" (satu kata per konsep)
const NAMA: Record<string, string> = { replika: "replica", primary: "primary" };
const acuan = (jeda: string, aturan?: string) => {
  const a = d.acuan.find((x) => x.jeda === jeda && x.aturan === aturan);
  expect(a, `acuan ${jeda}/${aturan ?? "-"}`).toBeDefined();
  return a!;
};

describe("klaim: frasa kalimat acuan ada di kalimat dan di bagian rekaman yang dinamai", () => {
  // Tiap frasa dipilih dari baris rekaman yang memuatnya (baris sumber di komentar). Frasa yang hilang dari kalimat atau dari rekaman
  // membuat tes gagal; kata yang diganti di kalimat (mis. 1 detik menjadi 2 detik) menghilangkan frasanya.
  const FRASA: { jeda: string; aturan?: string; frasa: string[] }[] = [
    // jeda.txt bagian A: "# --- A. Jeda alami di bawah beban: 100 pembayaran per detik selama 10 detik ---", baris "replay_lag tertinggi ... di bawah 1 detik (batas lab; nilai tidak direkam)"
    { jeda: "alami", frasa: ["100 pembayaran per detik selama 10 detik", "di bawah 1 detik", "tidak direkam"] },
    // sinkron.txt bagian B: "selisih COMMIT tercepat antara remote_apply dan on di bawah 1 ms: ya (nilai tidak direkam; ...)"
    { jeda: "alami", aturan: "remote_apply", frasa: ["selisih COMMIT tercepat antara remote_apply dan on di bawah 1 ms", "tidak direkam"] },
    { jeda: "nol", aturan: "remote_apply", frasa: ["selisih COMMIT tercepat antara remote_apply dan on di bawah 1 ms", "tidak direkam"] },
    // jeda.txt bagian A: "Jeda ±2 detik di cerita M41 tidak terjadi dengan sendirinya di laptop lab" dan judul bagian "100 pembayaran per detik"
    { jeda: "naskah", frasa: ["di laptop lab", "100 pembayaran per detik"] },
    // baca.txt bagian A: "Jawaban bayar 201 memuat saldo Rp215.000, tetapi saldo tampil sesudahnya masih Rp250.000 dan riwayat masih satu baris."
    { jeda: "ditahan", aturan: "replica", frasa: ["memuat saldo Rp215.000, tetapi saldo tampil sesudahnya masih Rp250.000 dan riwayat masih satu baris"] },
    // sinkron.txt bagian B: "COMMIT dengan synchronous_commit = on selesai selagi replay ditahan: ya" dan "COMMIT remote_apply menunggu di SyncRep ..."
    { jeda: "ditahan", aturan: "remote_apply", frasa: ["replay di replica sinkron ditahan", "COMMIT dengan synchronous_commit = on selesai", "COMMIT remote_apply menunggu di SyncRep", "replay dilanjutkan"] },
  ];
  for (const f of FRASA) {
    it(`acuan ${f.jeda}/${f.aturan ?? "-"}: ${f.frasa.length} frasa`, () => {
      const a = acuan(f.jeda, f.aturan);
      // ejaan kode lab (replika_sinkron, replika_laporan) menjadi ejaan teks pembaca (replica sinkron), satu kata per konsep
      const rekaman = norm(bagian(REKAMAN(a.berkas), a.bagian).replace(/replika_sinkron/g, "replica sinkron").replace(/replika_laporan/g, "replica laporan"));
      for (const frasa of f.frasa) {
        expect(norm(a.teks), `kalimat: ${frasa}`).toContain(norm(frasa));
        expect(rekaman, `rekaman ${a.berkas} ${a.bagian}: ${frasa}`).toContain(norm(frasa));
      }
    });
  }
  it("angka dan label di kalimat acuan dan pertanyaan tebakan diturunkan dari skenario dan label sumber", () => {
    // baca.txt A: "Budi membayar Rp35.000 ke Warung 505" (= skenario.bayar, dijaga sumber.test.ts); jeda 2 detik berlabel Simulasi oleh pertanyaan tebakan
    expect(acuan("ditahan", "replica").teks).toContain(`Budi membayar Rp${titik(d.skenario.bayar)}.`);
    expect(norm(bagian(REKAMAN("baca.txt"), "A"))).toContain(`budi membayar rp${titik(d.skenario.bayar)} ke warung 505`);
    expect(d.tebak.q).toContain(`tertinggal 2 detik (${d.label.sumber})`);
  });
  it("setiap acuan berjenis Rekaman lab punya tepat satu entri di tabel frasa, kecuali token (diturunkan dari kepala di bawah)", () => {
    const tanpaFrasa = d.acuan.filter((a) => a.jenis === "rekaman" && !FRASA.some((f) => f.jeda === a.jeda && f.aturan === a.aturan)).map((a) => `${a.jeda}/${a.aturan ?? "-"}`);
    expect(tanpaFrasa).toEqual(["ditahan/token"]);
  });
});

describe("klaim: kalimat acuan token dan replica dibaca dari kepala dan badan jawaban di baca.txt", () => {
  const A = bagian(REKAMAN("baca.txt"), "A");
  const B = bagian(REKAMAN("baca.txt"), "B");
  const blokA = blokCurl(A);
  const blokB = blokCurl(B);
  const bayarB = blokB.find((b) => b.perintah.includes("POST '/transfers'"))!;
  const akunB = blokB.filter((b) => b.perintah.includes("GET '/akun/419'") && b.status === "200");
  const akunA = blokA.filter((b) => b.perintah.includes("GET '/akun/419'"));
  const t = acuan("ditahan", "token").teks;
  const cocok = (re: RegExp, teks: string) => {
    const m = re.exec(teks);
    expect(m, `${re} di "${teks.slice(0, 60)}..."`).not.toBeNull();
    return m!;
  };
  it("kode status jawaban bayar di kalimat sama dengan status di rekaman bagian B", () => {
    expect(cocok(/dijawab (\d{3}) dengan X-Lsn-Tulis/, t)[1]).toBe(bayarB.status);
    expect(bayarB.status).toBe("201");
  });
  it("tanpa token: saldo dan sumber di kalimat = bacaan pertama bagian B (tanpa X-Lsn-Tulis)", () => {
    const [tanpa] = akunB;
    expect(tanpa!.perintah).not.toContain("X-Lsn-Tulis");
    const m = cocok(/Tanpa token saldo tampil masih Rp([\d.]+) dari (\w+)\./, t);
    expect([m[1], m[2]]).toEqual([titik(tanpa!.json.saldo), NAMA[kepala(tanpa!, "X-Dibaca-Dari")!]]);
  });
  it("dengan token: sumber dan saldo di kalimat = bacaan kedua (X-Lsn-Tulis, replica ditahan)", () => {
    const dengan = akunB[1]!;
    expect(dengan.perintah).toContain("X-Lsn-Tulis");
    const m = cocok(/Dengan token server membaca (\w+) dan menjawab Rp([\d.]+)\./, t);
    expect([m[1], m[2]]).toEqual([NAMA[kepala(dengan, "X-Dibaca-Dari")!], titik(dengan.json.saldo)]);
  });
  it("sesudah replay dilanjutkan: sumber di kalimat = bacaan terakhir dengan token yang sama", () => {
    const akhir = akunB.at(-1)!;
    expect(akhir.perintah).toContain("X-Lsn-Tulis");
    expect(cocok(/token yang sama dilayani (\w+)\./, t)[1]).toBe(NAMA[kepala(akhir, "X-Dibaca-Dari")!]);
  });
  it("replica biasa: sumber di kalimat acuan = kepala bacaan saldo sesudah bayar di bagian A, dan versi pertama mengabaikan token", () => {
    const sesudah = akunA[1]!;
    expect(sesudah.perintah).toContain("X-Lsn-Tulis");
    expect(cocok(/dibaca dari (\w+)\./, acuan("ditahan", "replica").teks)[1]).toBe(NAMA[kepala(sesudah, "X-Dibaca-Dari")!]);
    // baca.txt A: "# Token dikirim, tetapi mode ini mengabaikannya."
    expect(norm(A)).toContain("token dikirim, tetapi mode ini mengabaikannya");
  });
});

describe("klaim: label pendamping diturunkan dari label sumber dan judul bagian rekaman", () => {
  it("tanpaAcuan diawali nama label sumber widget, dan menyebut rekaman lab yang tidak ada", () => {
    expect(d.label.tanpaAcuan.startsWith(`Pilihan ini ${d.label.sumber}:`)).toBe(true);
    expect(d.label.tanpaAcuan).toContain(`tidak ada ${d.label.acuanJenis.rekaman.toLowerCase()}`);
  });
  it("petunjuk penggeser menyebut jeda buatan, nama yang dipakai judul bagian B jeda.txt, dan bukan jeda alami", () => {
    const judulB = bagian(REKAMAN("jeda.txt"), "B").split("\n")[0]!;
    expect(judulB).toContain("Jeda buatan");
    expect(d.label.jeda.petunjuk.toLowerCase()).toContain("jeda buatan");
    expect(d.label.jeda.petunjuk.toLowerCase()).not.toContain("alami");
  });
  it("token ringkas: replica dipakai 'hanya bila' sudah memutar WAL, kata yang sama dengan komentar sumberTampil di replika.go", () => {
    const kode = norm(baca("labs/api-t5/internal/service/replika.go").replace(/^\s*\/\/ ?/gm, ""));
    expect(kode).toContain("replica hanya bila sudah memutar ulang sampai token");
    expect(norm(d.aturan.find((a) => a.id === "token")!.ringkas)).toContain("replica hanya bila replica sudah memutar wal sampai posisi itu");
  });
  it("mode rentan (versi pertama) dan bacaan tanpa token sama-sama dibaca dari replica: 'sama dengan app tanpa token' di acuan replica", () => {
    // replika.go sumberTampil: "if s.rentan == RentanRiwayatReplika || token == "" { return s.replika, SumberReplika, nil }"
    expect(baca("labs/api-t5/internal/service/replika.go")).toMatch(/s\.rentan == RentanRiwayatReplika \|\| token == ""\s*\{\s*return s\.replika, SumberReplika, nil/);
    expect(acuan("ditahan", "replica").teks).toContain("Versi pertama itu mengabaikan token yang dikirim app, jadi hasilnya sama dengan app tanpa token.");
  });
  it("token tidak diubah server: TokenTulis mengembalikan posisi apa adanya dan handler menulisnya ke kepala tanpa tanda tangan atau pembulatan", () => {
    const service = baca("labs/api-t5/internal/service/replika.go");
    expect(service).toMatch(/lsn, err := s\.repo\.LSNTulis\(ctx\)[\s\S]+?return lsn\n\}/);
    expect(baca("labs/api-t5/internal/handler/handler_t5.go")).toContain("w.Header().Set(KepalaLSNTulis, tok)");
  });
  it("token hanya diberi POST /transfers (bayar) dan POST /kiriman (kirim): rutenya terdaftar, dan route bayar lain tidak memanggil tandaiTulis", () => {
    const handler = baca("labs/api-t5/internal/handler/handler.go");
    expect(handler).toMatch(/"POST \/transfers", .*s\.bayar/);
    expect(handler).toMatch(/"POST \/kiriman", .*s\.kirim/);
    const lain = ["handler_t3.go", "handler_qr.go"].map((f) => baca(`labs/api-t5/internal/handler/${f}`));
    for (const isi of lain) expect(isi).not.toContain("tandaiTulis");
  });
});
