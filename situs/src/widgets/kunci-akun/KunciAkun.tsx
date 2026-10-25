// Widget kunci akun (M16, keputusan 850): tebak berapa tebakan yang cukup untuk mengunci Ani lagi sesudah kunci
// pertama lewat, lalu ubah satu hal (penyerang atau Ani yang mengirim percobaan pertama). Data sudah divalidasi saat
// build (KunciAkun.astro); logika di logika.ts. Jawaban muncul dengan gerak masuk singkat; reduced motion tanpa gerak
// (muncul.ts). Fokus keyboard dipindah ke kontrol berikutnya saat kontrol yang difokus hilang atau dinonaktifkan
// (pola tes-merge dan geser-riwayat).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { muncul } from "../../gerak/muncul";
import type { Giliran, Tabel } from "./logika";

export interface PilihanSiap { teks: string; alasan: string }
export interface LabelSiap {
  judul: string; sumber: string; tebakDulu: string; pertanyaan: string; benar: string; belum: string; ulang: string;
  ubahJudul: string; giliran: Record<Giliran, string>; kesimpulan: Record<Giliran, string>; catatan: Record<Giliran, string>;
}
type Fokus = "lanjut" | "pilihan" | null;
interface Props { pilihan: PilihanSiap[]; benar: number; tabel: Record<Giliran, Tabel>; label: LabelSiap }

export default function KunciAkun({ pilihan, benar, tabel, label: L }: Props) {
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [giliran, setGiliran] = useState<Giliran>("penyerang");
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
        : (a?.querySelector<HTMLButtonElement>(".tb-tautan button") ?? a?.querySelector<HTMLButtonElement>('.qr-tombol[aria-pressed="false"]'));
    sasaran?.focus();
  });
  // Fokus hanya dipindah bila fokus pembaca ada di kontrol yang akan dinonaktifkan atau hilang.
  const difokus = (selektor: string) => typeof document !== "undefined" && !!document.activeElement?.closest(selektor);
  const pilih = (i: number) => { if (difokus(".tb-pilihan")) fokus.current = "lanjut"; setDipilih(i); };
  const ulangi = () => { if (difokus(".tb-tautan")) fokus.current = "pilihan"; setGiliran("penyerang"); setDipilih(null); };
  const tepat = dipilih === benar;
  const t = tabel[giliran];

  return (
    <div ref={akar} className="bb-widget tb tm qr" role="group" aria-label={L.judul}>
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
          <ul className="qr-pilih">
            {(["penyerang", "ani"] as const).map((g) => (
              <li key={g}>
                <button type="button" className="tb-pilih qr-tombol" aria-pressed={giliran === g} onClick={() => setGiliran(g)}>
                  <span>{L.giliran[g]}</span>
                </button>
              </li>
            ))}
          </ul>
          <table className="bb-table tm-tabel">
            <caption>{t.judul}</caption>
            <thead>
              <tr>{t.kolom.map((k) => <th key={k} scope="col">{k}</th>)}</tr>
            </thead>
            <tbody>
              {t.baris.map((b, i) => (
                <tr key={i}>
                  {b.map((sel, j) => (j === 0 ? <th key={j} scope="row">{sel}</th> : <td key={j}>{sel}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
          <div role="status" aria-live="polite" className="qr-hasil">
            <p>{L.kesimpulan[giliran]}</p>
          </div>
          <p className="bb-muted qr-catatan">{L.catatan[giliran]}</p>
        </div>
      )}
    </div>
  );
}
