// Widget daftar bergeser (M12, keputusan 672): layar Budi sesudah halaman 1, tebak apa yang tampil sesudah halaman 2
// bila satu kiriman masuk di sela keduanya, lihat daftar database bergeser, lalu ubah satu hal (berapa halaman yang
// digulir). Data sudah divalidasi saat build (GeserRiwayat.astro); logika di logika.ts. Jawaban muncul dengan gerak
// masuk singkat; reduced motion tanpa gerak (muncul.ts).
import { useLayoutEffect, useRef, useState } from "react";
import { muncul } from "../../gerak/muncul";
import { angka, type BarisDaftar, type BarisRiwayat, type Skala } from "./logika";

export interface PilihanSiap { teks: string; alasan: string }
export interface LabelSiap {
  judul: string; sumber: string; tebakDulu: string; pertanyaan: string; benar: string; belum: string; ulang: string;
  layar: string; database: string; garis: string; tanda: { baru: string; ganda: string };
  kolom: { halaman: string; kiriman: string; tampil: string; ganda: string; tidakTampil: string };
  ubahJudul: string; nama: Record<string, string>; kalimat: Record<string, string>; catatan: string;
}
interface Props {
  halaman1: BarisRiwayat[]; sesudah: BarisDaftar[]; skala: Skala[]; pilihan: PilihanSiap[]; benar: number; label: LabelSiap;
}

function Baris({ b, no, tanda, kelas }: { b: BarisRiwayat; no: number; tanda?: string | null; kelas?: string }) {
  return (
    <li className={kelas}>
      <span className="gr-pos">{no}</span>
      <span className="gr-isi"><b>{b.lawan}</b> {b.arah} {b.jumlah}</span>
      <span className="gr-no">jurnal {b.jurnal}</span>
      {tanda && <span className={"bb-chip " + (kelas?.includes("is-baru") ? "is-system" : "is-warn")}>{tanda}</span>}
    </li>
  );
}

export default function GeserRiwayat({ halaman1, sesudah, skala, pilihan, benar, label: L }: Props) {
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [aktif, setAktif] = useState(0);
  const hasil = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (dipilih !== null) muncul(hasil.current);
  }, [dipilih]);
  const tepat = dipilih === benar;
  const s = skala[aktif]!;
  const limit = halaman1.length;
  const atas = sesudah.slice(0, limit);
  const bawah = sesudah.slice(limit);

  return (
    <div className="bb-widget tb gr qr" role="group" aria-label={L.judul}>
      <div className="bb-widget__head">
        <p><strong>{L.judul}</strong></p>
        <span className="bb-chip is-system">{L.sumber}</span>
      </div>

      <p className="gr-judul"><strong>{L.layar}</strong></p>
      <ol className="gr-baris">
        {halaman1.map((b, i) => <Baris key={b.posting} b={b} no={i + 1} />)}
      </ol>

      <p className="tb-tanya"><strong>{L.tebakDulu}</strong> {L.pertanyaan}</p>
      <ol className="tb-pilihan">
        {pilihan.map((o, i) => {
          const kelas = dipilih === null ? "" : i === benar ? " is-benar" : i === dipilih ? " is-salah" : " is-redup";
          return (
            <li key={i}>
              <button type="button" className={"tb-pilih" + kelas} aria-pressed={dipilih === i} disabled={dipilih !== null} onClick={() => setDipilih(i)}>
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
            {!tepat && <p className="tb-tautan"><button type="button" className="bb-btn bb-btn--quiet" onClick={() => setDipilih(null)}>{L.ulang}</button></p>}
          </div>
        )}
      </div>

      {dipilih !== null && (
        <>
          <p className="gr-judul"><strong>{L.database}</strong></p>
          <ol className="gr-baris">
            {atas.map((b, i) => <Baris key={b.posting} b={b} no={i + 1} tanda={b.tanda ? L.tanda[b.tanda] : null} kelas={b.tanda === "baru" ? "is-baru" : undefined} />)}
          </ol>
          <p className="gr-garis">{L.garis}</p>
          <ol className="gr-baris">
            {bawah.map((b, i) => <Baris key={b.posting} b={b} no={limit + i + 1} tanda={b.tanda ? L.tanda[b.tanda] : null} kelas={"is-diminta" + (b.tanda === "ganda" ? " is-ganda" : "")} />)}
          </ol>

          <div className="qr-ubah">
            <p className="tb-tanya"><strong>{L.ubahJudul}</strong></p>
            <ul className="qr-pilih">
              {skala.map((x, i) => (
                <li key={x.id}>
                  <button type="button" className="tb-pilih qr-tombol" aria-pressed={aktif === i} onClick={() => setAktif(i)}>
                    <span>{L.nama[x.id]}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div role="status" aria-live="polite" className="qr-hasil">
              <dl className="qr-angka">
                <div><dt>{L.kolom.halaman}</dt><dd>{angka(s.halaman)}</dd></div>
                <div><dt>{L.kolom.kiriman}</dt><dd>{angka(s.kiriman)}</dd></div>
                <div><dt>{L.kolom.tampil}</dt><dd>{angka(s.tampil)}</dd></div>
                <div><dt>{L.kolom.ganda}</dt><dd>{angka(s.ganda)}</dd></div>
                <div><dt>{L.kolom.tidakTampil}</dt><dd>{angka(s.tidakTampil)}</dd></div>
              </dl>
              <p>{L.kalimat[s.id]}</p>
            </div>
            <p className="bb-muted qr-catatan">{L.catatan}</p>
          </div>
        </>
      )}
    </div>
  );
}
