// Widget ukuran payload (2.20, keputusan 821): tebak apa yang paling banyak memperkecil body riwayat Budi, lalu ubah
// satu hal (bentuk, gzip, jumlah baris, buka per hari) dan lihat byte dan kuota. Data sudah divalidasi saat build
// (UkuranPayload.astro); logika di logika.ts. Jawaban muncul dengan gerak masuk singkat; reduced motion tanpa gerak
// (muncul.ts). Fokus keyboard dipindah ke kontrol berikutnya saat kontrol yang difokus hilang atau dinonaktifkan.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { muncul } from "../../gerak/muncul";
import {
  angka, BENTUK, byteBuka, bukaSatuPersen, cari, isi, kali, labelPaket, lebarBatang, persen, persenKuota,
  type Asumsi, type Bentuk, type Ukuran,
} from "./logika";

export interface PilihanSiap { teks: string; alasan: string }
export interface LabelSiap {
  judul: string; sumber: string; tebakDulu: string; pertanyaan: string; benar: string; belum: string; ulang: string;
  ubahJudul: string; grup: { bentuk: string; kompresi: string; baris: string; buka: string };
  bentuk: Record<Bentuk, string>; kompresi: { tidak: string; ya: string };
  kolom: { byte: string; banding: string; kuota: string; satuPersen: string }; kalimat: string; catatan: string;
}
type Fokus = "lanjut" | "pilihan" | null;
interface Props { ukuran: Ukuran[]; asumsi: Asumsi; pilihan: PilihanSiap[]; benar: number; label: LabelSiap }

export default function UkuranPayload({ ukuran, asumsi, pilihan, benar, label: L }: Props) {
  const barisAda = [...new Set(ukuran.map((u) => u.baris))].sort((a, b) => a - b);
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [bentuk, setBentuk] = useState<Bentuk>("api");
  const [gzip, setGzip] = useState(false);
  const [baris, setBaris] = useState(asumsi.barisKuota);
  const [buka, setBuka] = useState(asumsi.bukaPerHari[1]!);
  const hasil = useRef<HTMLDivElement>(null);
  const akar = useRef<HTMLDivElement>(null);
  const fokus = useRef<Fokus>(null);
  useLayoutEffect(() => {
    if (dipilih !== null) muncul(hasil.current);
  }, [dipilih]);
  useEffect(() => {
    const f = fokus.current;
    fokus.current = null;
    if (!f) return;
    const a = akar.current;
    const sasaran =
      f === "pilihan"
        ? a?.querySelector<HTMLButtonElement>(".tb-pilihan .tb-pilih:not(:disabled)")
        : (a?.querySelector<HTMLButtonElement>(".tb-tautan button") ?? a?.querySelector<HTMLButtonElement>(".qr-tombol"));
    sasaran?.focus();
  });
  // Fokus hanya dipindah bila fokus pembaca ada di kontrol yang akan dinonaktifkan atau hilang.
  const difokus = (selektor: string) => typeof document !== "undefined" && !!document.activeElement?.closest(selektor);
  const pilih = (i: number) => { if (difokus(".tb-pilihan")) fokus.current = "lanjut"; setDipilih(i); };
  const ulangi = () => {
    if (difokus(".tb-tautan")) fokus.current = "pilihan";
    setDipilih(null);
    setBentuk("api"); setGzip(false); setBaris(asumsi.barisKuota); setBuka(asumsi.bukaPerHari[1]!);
  };
  const tepat = dipilih === benar;

  const u = cari({ ukuran, asumsi }, bentuk, baris);
  const apa = cari({ ukuran, asumsi }, "api", baris);
  const byte = byteBuka(u, gzip);
  const maks = Math.max(...ukuran.map((x) => x.mentah));
  const kuota = persenKuota(byte, buka, asumsi);
  const kalimat = isi(L.kalimat, {
    bentuk: L.bentuk[bentuk], kompresi: gzip ? L.kompresi.ya.toLowerCase() : L.kompresi.tidak.toLowerCase(), baris: angka(baris),
    byte: angka(byte), banding: kali(byte / apa.mentah), buka: angka(buka), kuota: persen(kuota, 3),
    paket: labelPaket(asumsi), satuPersen: angka(bukaSatuPersen(byte, asumsi)),
  });

  return (
    <div ref={akar} className="bb-widget tb qr" role="group" aria-label={L.judul}>
      <div className="bb-widget__head">
        <p><strong>{L.judul}</strong></p>
        <span className="bb-chip is-system">{L.sumber}</span>
      </div>

      <p className="tb-tanya"><strong>{L.tebakDulu}</strong> {L.pertanyaan}</p>
      <ol className="tb-pilihan">
        {pilihan.map((o, i) => {
          const kelas = dipilih === null ? "" : i === benar ? " is-benar" : i === dipilih ? " is-salah" : " is-redup";
          return (
            <li key={i}>
              <button type="button" className={"tb-pilih" + kelas} aria-pressed={dipilih === i} disabled={dipilih !== null} onClick={() => pilih(i)}>
                <span className="tb-huruf" aria-hidden="true">{String.fromCharCode(65 + i)}</span>{" "}
                <span>{o.teks}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div role="status" aria-live="polite">
        {dipilih !== null && (
          <div ref={hasil} className={"tb-hasil " + (tepat ? "is-benar" : "is-salah")}>
            <p className="tb-hasil__judul"><strong>{tepat ? L.benar : L.belum}</strong></p>
            <p>{pilihan[dipilih]!.alasan}</p>
            {!tepat && <p><strong>{String.fromCharCode(65 + benar)}.</strong> {pilihan[benar]!.alasan}</p>}
            {!tepat && <p className="tb-tautan"><button type="button" className="bb-btn bb-btn--quiet" onClick={ulangi}>{L.ulang}</button></p>}
          </div>
        )}
      </div>

      {dipilih !== null && (
        <div className="qr-ubah">
          <p className="tb-tanya"><strong>{L.ubahJudul}</strong></p>

          <p className="bb-muted qr-catatan">{L.grup.bentuk}</p>
          <ul className="qr-pilih">
            {BENTUK.map((b) => (
              <li key={b}>
                <button type="button" className="tb-pilih qr-tombol" aria-pressed={bentuk === b} onClick={() => setBentuk(b)}>
                  <span>{L.bentuk[b]}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="bb-muted qr-catatan">{L.grup.kompresi}</p>
          <ul className="qr-pilih">
            {([false, true] as const).map((g) => (
              <li key={String(g)}>
                <button type="button" className="tb-pilih qr-tombol" aria-pressed={gzip === g} onClick={() => setGzip(g)}>
                  <span>{g ? L.kompresi.ya : L.kompresi.tidak}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="bb-muted qr-catatan">{L.grup.baris}</p>
          <ul className="qr-pilih">
            {barisAda.map((n) => (
              <li key={n}>
                <button type="button" className="tb-pilih qr-tombol" aria-pressed={baris === n} onClick={() => setBaris(n)}>
                  <span>{angka(n)}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="bb-muted qr-catatan">{L.grup.buka}</p>
          <ul className="qr-pilih">
            {asumsi.bukaPerHari.map((n) => (
              <li key={n}>
                <button type="button" className="tb-pilih qr-tombol" aria-pressed={buka === n} onClick={() => setBuka(n)}>
                  <span>{angka(n)}</span>
                </button>
              </li>
            ))}
          </ul>

          <div role="status" aria-live="polite" className="qr-hasil">
            <div className="qr-batang" aria-hidden="true"><span style={{ width: `${lebarBatang(byte, maks)}%` }} /></div>
            <dl className="qr-angka">
              <div><dt>{L.kolom.byte}</dt><dd>{angka(byte)} B</dd></div>
              <div><dt>{L.kolom.banding}</dt><dd>{kali(byte / apa.mentah)} kali</dd></div>
              <div><dt>{L.kolom.kuota}</dt><dd>{persen(kuota, 3)} %</dd></div>
              <div><dt>{L.kolom.satuPersen}</dt><dd>{angka(bukaSatuPersen(byte, asumsi))}</dd></div>
            </dl>
            <p>{kalimat}</p>
          </div>
          <p className="bb-muted qr-catatan">{L.catatan}</p>
        </div>
      )}
    </div>
  );
}
