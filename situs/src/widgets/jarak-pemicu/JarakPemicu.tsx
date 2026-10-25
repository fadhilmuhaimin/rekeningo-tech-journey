// Widget jarak ke pemicu cache (ADR 21, keputusan 772): tebak berapa kali lipat puncak Tahap 2 sampai satu query riwayat
// menahan 5 koneksi, lalu ubah satu hal (cara query) dan lihat jaraknya berubah. Data sudah divalidasi dan dihitung saat
// build (JarakPemicu.astro); logika di logika.ts. Jawaban muncul dengan gerak masuk singkat; reduced motion tanpa gerak.
import { useLayoutEffect, useRef, useState } from "react";
import { muncul } from "../../gerak/muncul";

export interface PilihanSiap { teks: string; alasan: string }
export interface BarisSiap { id: string; nama: string; w: string; l: string; lambda: string; kali: string; lebar: number; kalimat: string }
export interface LabelSiap {
  judul: string; sumber: string; tebakDulu: string; pertanyaan: string; benar: string; belum: string; ulang: string;
  ubahJudul: string; kolom: { w: string; l: string; lambda: string; kali: string }; catatan: string;
}
interface Props { baris: BarisSiap[]; pilihan: PilihanSiap[]; benar: number; label: LabelSiap }

export default function JarakPemicu({ baris, pilihan, benar, label: L }: Props) {
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [aktif, setAktif] = useState(2); // cara yang dipakai tebakan: satu query dengan index
  const hasil = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (dipilih !== null) muncul(hasil.current);
  }, [dipilih]);
  const b = baris[aktif]!;
  const tepat = dipilih === benar;

  return (
    <div className="bb-widget tb qr gr" role="group" aria-label={L.judul}>
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
        <div className="qr-ubah">
          <p className="tb-tanya"><strong>{L.ubahJudul}</strong></p>
          <ul className="qr-pilih">
            {baris.map((x, i) => (
              <li key={x.id}>
                <button type="button" className="tb-pilih qr-tombol" aria-pressed={aktif === i} onClick={() => setAktif(i)}>
                  <span>{x.nama}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="qr-hasil">
            <div className="qr-batang" aria-hidden="true"><span style={{ width: `${b.lebar}%` }} /></div>
            <dl className="qr-angka">
              <div><dt>{L.kolom.w}</dt><dd>{b.w}</dd></div>
              <div><dt>{L.kolom.l}</dt><dd>{b.l}</dd></div>
              <div><dt>{L.kolom.lambda}</dt><dd>{b.lambda}</dd></div>
              <div><dt>{L.kolom.kali}</dt><dd>{b.kali}</dd></div>
            </dl>
            <p role="status" aria-live="polite">{b.kalimat}</p>
          </div>
          <p className="bb-muted qr-catatan">{L.catatan}</p>
        </div>
      )}
    </div>
  );
}
