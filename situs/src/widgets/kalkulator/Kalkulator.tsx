// Widget kalkulator estimasi (keputusan 303): tebak dulu, lalu ganti skenario dan lihat setiap besaran berubah.
// Semua teks dari data JSON; angka asumsi dari registry lewat prop `asumsi` (tahap[].asumsi); logika di logika.ts.
// SSR = render pertama: skenario `awal` dengan semua angka, tombol skenario baru aktif sesudah tebakan.
import { useLayoutEffect, useRef, useState } from "react";
import { DaftarAsumsi, DataKalkulator } from "./skema";
import { baris, berubah, format, kesimpulan, siapkan, type Kunci } from "./logika";
import { gerakkanAngka } from "../../gerak/angka";

type Satuan = { detik: string; ms: string };

// Angka yang bergerak singkat dari nilai lama saat pembaca mengganti skenario (pola Rupiah di jumlah-total,
// keputusan 352). Tween menggerakkan bilangan bulat nilai × skala, jadi desimal (0,14) ikut bergerak.
// Di luar tween sel hanya berisi satu angka; selama tween angka yang bergerak aria-hidden dan pembaca layar
// membaca nilai akhir di `.bb-sr`.
function Angka({ kunci, nilai, skala, satuan }: { kunci: Kunci; nilai: number; skala: number; satuan: Satuan }) {
  const bulat = Math.round(nilai * skala);
  const teks = (n: number) => format(kunci, n, skala, satuan);
  const ref = useRef<HTMLSpanElement>(null);
  const tampil = useRef(bulat);
  const [bergerak, setBergerak] = useState(false);
  useLayoutEffect(() => {
    const tw = gerakkanAngka(ref.current, tampil.current, bulat, teks, setBergerak);
    return () => {
      tampil.current = tw.berhenti();
    };
  }, [bulat]);
  return (
    <>
      {bergerak && <span className="bb-sr">{teks(bulat)}</span>}
      <span ref={ref} aria-hidden={bergerak || undefined}>{teks(bulat)}</span>
    </>
  );
}

export default function Kalkulator({ data: mentah, asumsi: asumsiMentah }: { data: unknown; asumsi: unknown }) {
  const data = DataKalkulator.parse(mentah);
  const skenario = siapkan(data, DaftarAsumsi.parse(asumsiMentah));
  const L = data.label;
  const satuan: Satuan = { detik: L.detik, ms: L.ms };
  const [tebakan, setTebakan] = useState<number | null>(null);
  const [pilih, setPilih] = useState(data.awal);
  const [sebelum, setSebelum] = useState(data.awal);
  const [dibuka, setDibuka] = useState(false);
  const skenarioRef = useRef<HTMLDivElement>(null);
  const a = skenario[pilih];

  // Tombol tebakan jadi nonaktif sesudah diklik, dan Chrome memindah fokusnya ke BODY. Fokus dipindah ke
  // tombol skenario pertama yang aktif, supaya Tab berlanjut dari widget ini.
  useLayoutEffect(() => {
    if (tebakan === null) return;
    const tombol = skenarioRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    tombol?.focus({ preventScroll: true });
  }, [tebakan]);
  const ubah = pilih === sebelum ? [] : berubah(skenario[sebelum], a);

  const gantiSkenario = (i: number) => {
    setSebelum(pilih);
    setPilih(i);
    if (i === data.tebak.skenario) setDibuka(true);
  };

  return (
    <div className="bb-widget kk" role="group" aria-label={data.judul}>
      <div className="bb-widget__head">
        <p><strong>{data.judul}</strong></p>
        <span className="bb-chip is-warn">{L.sumber}</span>
      </div>
      <p className="bb-muted jt-sumber">{data.sumber.teks}</p>

      <div className="bb-predict">
        <p className="bb-predict__q"><strong>{L.tebakDulu}</strong> {data.tebak.q}</p>
        <div className="bb-predict__opts">
          {data.tebak.pilihan.map((p, i) => (
            <button
              key={p}
              type="button"
              className="bb-btn"
              aria-pressed={tebakan === i}
              disabled={tebakan !== null}
              onClick={() => setTebakan(i)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="bb-row" role="group" aria-label={L.ubah} ref={skenarioRef}>
        {data.skenario.map((s, i) => (
          <button
            key={s.label}
            type="button"
            className="bb-btn bb-btn--opt"
            aria-pressed={pilih === i}
            disabled={tebakan === null}
            onClick={() => gantiSkenario(i)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <table className="jt-tabel">
        <tbody>
          {baris(a, L.asumsi).map((b) => (
            <tr key={b.kunci} className={(b.kunci === "puncak" ? "jt-total " : "") + (ubah.includes(b.kunci) ? "is-berubah" : "")}>
              <th scope="row">
                {L.baris[b.kunci]}
                <br />
                {b.kunci === "user" ? <span className="bb-muted">{b.cara}</span> : <code translate="no">{b.cara}</code>}
              </th>
              <td className="jt-angka"><Angka kunci={b.kunci} nilai={b.nilai} skala={b.skala} satuan={satuan} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div role="status" aria-live="polite">
        <p>{kesimpulan(L.kesimpulan, a, satuan)}</p>
        {tebakan !== null && !dibuka && <p className="bb-muted">{L.lanjut}</p>}
        {tebakan !== null && dibuka && (
          <p className={"bb-predict__a " + (tebakan === data.tebak.jawaban ? "is-good" : "is-warn")}>{data.tebak.alasan}</p>
        )}
      </div>
    </div>
  );
}
