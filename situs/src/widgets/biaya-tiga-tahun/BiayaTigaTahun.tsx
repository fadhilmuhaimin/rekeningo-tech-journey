// Widget model biaya tiga tahun (ADR 59): tebak dulu, lalu ganti skenario dan lihat komponen biaya dan kumulatif per tahun berubah.
// Semua teks dan angka masukan dari data JSON (juta rupiah, Ilustrasi); logika di logika.ts. SSR = render pertama: skenario `awal`
// dengan semua angka. Tanpa JavaScript widget disembunyikan (CSS) dan halaman memuat tabel semua skenario di <noscript>.
import { useLayoutEffect, useRef, useState } from "react";
import { DataBiaya } from "./skema";
import { URUTAN, berubah, hitung, jumlah, kesimpulan, kumulatif, siapkan, titik } from "./logika";

export default function BiayaTigaTahun({ data: mentah }: { data: unknown }) {
  const data = DataBiaya.parse(mentah);
  const L = data.label;
  const semua = siapkan(data).map(hitung);
  const [tebakan, setTebakan] = useState<number | null>(null);
  const [pilih, setPilih] = useState(data.awal);
  const [sebelum, setSebelum] = useState(data.awal);
  const [dibuka, setDibuka] = useState(false);
  const skenarioRef = useRef<HTMLDivElement>(null);
  const h = semua[pilih]!;
  const jc = jumlah(h.cloud);
  const jo = jumlah(h.onprem);
  const kc = kumulatif(h.cloud);
  const ko = kumulatif(h.onprem);
  const ubah = pilih === sebelum ? [] : berubah(semua[sebelum]!, h);

  // Tombol tebakan jadi nonaktif sesudah diklik, dan Chrome memindah fokusnya ke BODY: fokus dipindah ke tombol skenario pertama yang aktif.
  useLayoutEffect(() => {
    if (tebakan === null) return;
    skenarioRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
  }, [tebakan]);

  const gantiSkenario = (i: number) => {
    setSebelum(pilih);
    setPilih(i);
    if (i === data.tebak.skenario) setDibuka(true);
  };

  return (
    <div className="bb-widget bt" role="group" aria-label={data.judul}>
      <div className="bb-widget__head">
        <p><strong>{data.judul}</strong></p>
        <span className="bb-chip is-warn">{L.sumber}</span>
      </div>
      <p className="bb-muted jt-sumber">{data.sumber.teks}</p>

      <div className="bb-predict">
        <p className="bb-predict__q"><strong>{L.tebakDulu}</strong> {data.tebak.q}</p>
        <div className="bb-predict__opts">
          {data.tebak.pilihan.map((p, i) => (
            <button key={p} type="button" className="bb-btn" aria-pressed={tebakan === i} disabled={tebakan !== null} onClick={() => setTebakan(i)}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="bb-row" role="group" aria-label={L.ubah} ref={skenarioRef}>
        {data.skenario.map((s, i) => (
          <button key={s.label} type="button" className="bb-btn bb-btn--opt" aria-pressed={pilih === i} disabled={tebakan === null} onClick={() => gantiSkenario(i)}>
            {s.label}
          </button>
        ))}
      </div>

      <table className="jt-tabel bt-tabel">
        <caption className="bb-muted">{L.captionKomponen}</caption>
        <thead>
          <tr><th scope="col" /><th scope="col" className="jt-angka">{L.cloud}</th><th scope="col" className="jt-angka">{L.onprem}</th></tr>
        </thead>
        <tbody>
          {URUTAN.map((k) => (
            <tr key={k} className={(k === "total" ? "jt-total " : "") + (ubah.includes(k) ? "is-berubah" : "")}>
              <th scope="row">{L.komponen[k]}</th>
              <td className="jt-angka">{titik(jc[k])}</td>
              <td className="jt-angka">{titik(jo[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="jt-tabel bt-tabel">
        <caption className="bb-muted">{L.captionKumulatif}</caption>
        <thead>
          <tr><th scope="col">{L.tahun}</th><th scope="col" className="jt-angka">{L.cloud}</th><th scope="col" className="jt-angka">{L.onprem}</th></tr>
        </thead>
        <tbody>
          {kc.map((c, i) => (
            <tr key={i}>
              <th scope="row">{i + 1}</th>
              <td className="jt-angka">{titik(c)}</td>
              <td className="jt-angka">{titik(ko[i]!)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div role="status" aria-live="polite"><p>{kesimpulan(L.kesimpulan, h)}</p></div>
      <div role="status" aria-live="polite">
        {tebakan !== null && !dibuka && <p className="bb-muted">{L.lanjut}</p>}
        {tebakan !== null && dibuka && (
          <p className={"bb-predict__a " + (tebakan === data.tebak.jawaban ? "is-good" : "is-warn")}>
            <strong>{tebakan === data.tebak.jawaban ? L.benar : L.belum}</strong> {data.tebak.alasan}
          </p>
        )}
      </div>
    </div>
  );
}
