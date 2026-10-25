// Widget "Tutup buku diulang" (M17, keputusan 760): tebak apa yang berubah pada laporan tutup buku sesudah satu
// transaction yang tadi belum COMMIT akhirnya COMMIT, lalu ubah satu hal (kapan laporan dibuat). Data sudah
// divalidasi dan diisi saat build (TutupUlang.astro); logika di logika.ts. Jawaban muncul dengan gerak masuk singkat;
// reduced motion tanpa gerak (muncul.ts). Fokus keyboard dipindah ke kontrol berikutnya saat kontrol yang difokus
// hilang atau dinonaktifkan (pola selisih-bank dan tes-merge).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { muncul } from "../../gerak/muncul";
import type { BarisTabel, KodeBaris, Waktu } from "./logika";

export interface PilihanSiap { teks: string; alasan: string }
export interface LabelSiap {
  judul: string; sumber: string; tebakDulu: string; pertanyaan: string; benar: string; belum: string; ulang: string;
  tabel: { judul: string; periksa: string; nilai: string };
  baris: Record<KodeBaris, string>;
  ubahJudul: string;
  waktu: Record<Waktu, string>; kesimpulan: Record<Waktu, string>; catatan: Record<Waktu, string>;
  ubahChip: string; tetapChip: string;
}
type Fokus = "lanjut" | "pilihan" | null;
interface Props { pilihan: PilihanSiap[]; benar: number; tabel: Record<Waktu, BarisTabel[]>; label: LabelSiap }

const WAKTU: Waktu[] = ["sebelum", "sesudah"];

export default function TutupUlang({ pilihan, benar, tabel, label: L }: Props) {
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [waktu, setWaktu] = useState<Waktu>("sebelum");
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
  const ulangi = () => { if (difokus(".tb-tautan")) fokus.current = "pilihan"; setWaktu("sebelum"); setDipilih(null); };
  const tepat = dipilih === benar;

  return (
    <div ref={akar} className="bb-widget tb tu qr" role="group" aria-label={L.judul}>
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
            {WAKTU.map((w) => (
              <li key={w}>
                <button type="button" className="tb-pilih qr-tombol" aria-pressed={waktu === w} onClick={() => setWaktu(w)}>
                  <span>{L.waktu[w]}</span>
                </button>
              </li>
            ))}
          </ul>
          <table className="bb-table tu-tabel">
            <caption>{L.tabel.judul} ({L.waktu[waktu]})</caption>
            <thead>
              <tr><th scope="col">{L.tabel.periksa}</th><th scope="col">{L.tabel.nilai}</th></tr>
            </thead>
            <tbody>
              {tabel[waktu].map((b) => (
                <tr key={b.kode}>
                  <th scope="row">{L.baris[b.kode]}</th>
                  <td>
                    {b.sorot === "ubah" ? <><span className="bb-chip is-warn" style={{ whiteSpace: "nowrap" }}>{b.nilai}</span> <span className="bb-muted">{L.ubahChip}</span></>
                      : b.sorot === "tetap" ? <><span className="bb-chip is-system" style={{ whiteSpace: "nowrap" }}>{b.nilai}</span> <span className="bb-muted">{L.tetapChip}</span></>
                      : b.nilai}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div role="status" aria-live="polite" className="qr-hasil">
            <p>{L.kesimpulan[waktu]}</p>
          </div>
          <p className="bb-muted qr-catatan">{L.catatan[waktu]}</p>
        </div>
      )}
    </div>
  );
}
