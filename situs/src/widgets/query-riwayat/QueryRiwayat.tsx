// Widget query riwayat (M11, keputusan 662): tebak jumlah query untuk satu halaman riwayat, lalu ubah satu hal (berapa
// baris yang diminta) dan lihat jumlah query tumbuh. Data sudah divalidasi saat build (QueryRiwayat.astro); logika di
// logika.ts. Jawaban muncul dengan gerak masuk singkat; reduced motion tanpa gerak (muncul.ts).
import { useLayoutEffect, useRef, useState } from "react";
import { muncul } from "../../gerak/muncul";
import { angka, lebarBatang, waktu, type Permintaan } from "./logika";

export interface PilihanSiap { query: number; alasan: string }
export interface LabelSiap {
  judul: string; sumber: string; tebakDulu: string; pertanyaan: string; benar: string; belum: string; ulang: string;
  ubahJudul: string; nama: Record<string, string>; kolom: { baris: string; query: string; waktu: string };
  catatan: string; kalimat: Record<string, string>;
}
interface Props { permintaan: Permintaan[]; pilihan: PilihanSiap[]; benar: number; label: LabelSiap }

export default function QueryRiwayat({ permintaan, pilihan, benar, label: L }: Props) {
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [aktif, setAktif] = useState(0);
  const hasil = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (dipilih !== null) muncul(hasil.current);
  }, [dipilih]);
  const maks = Math.max(...permintaan.map((p) => p.query));
  const p = permintaan[aktif]!;
  const tepat = dipilih === benar;

  return (
    <div className="bb-widget tb qr" role="group" aria-label={L.judul}>
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
                <span className="tb-huruf" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                <span>{angka(o.query)} query</span>
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
            {permintaan.map((x, i) => (
              <li key={x.id}>
                <button type="button" className="tb-pilih qr-tombol" aria-pressed={aktif === i} onClick={() => setAktif(i)}>
                  <span>{L.nama[x.id]}</span> <span className="bb-muted">({angka(x.baris)} {L.kolom.baris.toLowerCase()})</span>
                </button>
              </li>
            ))}
          </ul>
          <div role="status" aria-live="polite" className="qr-hasil">
            <div className="qr-batang" aria-hidden="true"><span style={{ width: `${lebarBatang(p.query, maks)}%` }} /></div>
            <dl className="qr-angka">
              <div><dt>{L.kolom.baris}</dt><dd>{angka(p.baris)}</dd></div>
              <div><dt>{L.kolom.query}</dt><dd>{angka(p.query)}</dd></div>
              <div><dt>{L.kolom.waktu}</dt><dd>{waktu(p.ms)}</dd></div>
            </dl>
            <p>{L.kalimat[p.id]}</p>
          </div>
          <p className="bb-muted qr-catatan">{L.catatan}</p>
        </div>
      )}
    </div>
  );
}
