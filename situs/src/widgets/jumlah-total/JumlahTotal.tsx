// Widget React pertama (keputusan 144): jalankan perintah satu per satu, lihat jumlah semua saldo.
// Semua teks dari data JSON; logika di logika.ts.
import { useLayoutEffect, useRef, useState } from "react";
import { DataJumlahTotal } from "./skema";
import { batas, keadaan, rupiah, type Status } from "./logika";
import { tweenAngka } from "../../gerak/angka";

const kelasStatus: Record<Status, string> = { ok: "is-good", proses: "", gagal: "is-warn" };

// Rupiah yang bergerak singkat dari nilai lama saat pembaca menekan tombol (I5d, keputusan 352). Di luar tween
// (juga SSR dan tanpa JavaScript) sel hanya berisi satu angka biasa, jadi seleksi, salinan, dan indeks pencarian
// memuat satu nilai. Selama tween angka yang bergerak aria-hidden dan pembaca layar membaca nilai akhir di `.bb-sr`
// (tidak ikut terseleksi, `user-select: none`). Posisi span angka tetap (slot `.bb-sr` kosong di luar tween), jadi
// React tidak mengganti elemen yang sedang digerakkan. useLayoutEffect: frame pertama tween (nilai lama) dan `.bb-sr`
// tertulis sebelum browser menggambar.
function Rupiah({ nilai }: { nilai: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const tampil = useRef(nilai);
  const [bergerak, setBergerak] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || tampil.current === nilai) {
      tampil.current = nilai;
      return;
    }
    setBergerak(true);
    const tw = tweenAngka(el, tampil.current, nilai, rupiah, undefined, () => {
      tampil.current = nilai;
      setBergerak(false);
    });
    return () => {
      tampil.current = tw.berhenti();
    };
  }, [nilai]);
  return (
    <>
      {bergerak && <span className="bb-sr">{rupiah(nilai)}</span>}
      <span ref={ref} aria-hidden={bergerak || undefined}>{rupiah(nilai)}</span>
    </>
  );
}

export default function JumlahTotal({ data: mentah }: { data: unknown }) {
  const data = DataJumlahTotal.parse(mentah);
  const L = data.label;
  const [tebakan, setTebakan] = useState<number | null>(null);
  const [posisi, setPosisi] = useState(0);
  const [mati, setMati] = useState(false);
  const k = keadaan(data, posisi, mati);
  const akhir = batas(data, mati);

  const gantiMati = (v: boolean) => {
    setMati(v);
    setPosisi(0);
  };

  return (
    <div className="bb-widget jt" role="group" aria-label={data.judul}>
      <div className="bb-widget__head">
        <p><strong>{data.judul}</strong></p>
        <span className="bb-chip is-system">{L.sumber}</span>
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

      <ol className="bb-steps jt-langkah">
        {data.langkah.map((l, i) => (
          <li key={l.sql} className={"bb-step" + (i < k.posisi ? " is-done" : i === k.posisi && !k.selesai ? " is-next" : " is-idle")}>
            <code className="bb-step__sql" translate="no">{l.sql}</code>
          </li>
        ))}
      </ol>

      <div className="bb-row">
        <button
          type="button"
          className="bb-btn bb-btn--primary"
          disabled={tebakan === null || k.posisi >= akhir}
          onClick={() => setPosisi(k.posisi + 1)}
        >
          {L.berikutnya}
        </button>
        <button type="button" className="bb-btn bb-btn--quiet" disabled={k.posisi === 0} onClick={() => setPosisi(0)}>
          {L.ulang}
        </button>
      </div>
      <label className="bb-toggle jt-ubah">
        <input type="checkbox" checked={mati} disabled={tebakan === null} onChange={(e) => gantiMati(e.target.checked)} />
        {data.ubah.label}
      </label>

      <table className="jt-tabel">
        <thead>
          <tr><th scope="col">{L.akun}</th><th scope="col">{L.saldo}</th></tr>
        </thead>
        <tbody>
          {data.akun.map((a) => (
            <tr key={a.id} className={k.berubah.includes(a.id) ? "is-berubah" : ""}>
              <td>{a.nama}</td>
              <td className="jt-angka"><Rupiah nilai={k.saldo[a.id]} /></td>
            </tr>
          ))}
          <tr className={"jt-total " + kelasStatus[k.cek.totalTetap]}>
            <th scope="row">{L.total}</th>
            <td className="jt-angka"><Rupiah nilai={k.total} /></td>
          </tr>
          <tr>
            <th scope="row">{L.transaksi}</th>
            <td className="jt-angka">{k.transaksi}</td>
          </tr>
        </tbody>
      </table>

      <p className="jt-cek-judul"><strong>{L.cekJudul}</strong></p>
      <ul className="jt-cek">
        {(["lengkap", "tidakNegatif", "totalTetap"] as const).map((c) => (
          <li key={c}>
            <span>{L.cek[c]}</span>
            <span className={"bb-chip " + (k.cek[c] === "ok" ? "is-system" : k.cek[c] === "gagal" ? "is-warn" : "")}>{L.status[k.cek[c]]}</span>
          </li>
        ))}
      </ul>

      <div role="status" aria-live="polite">
        {k.selesai && k.posisi > 0 && tebakan !== null && (
          mati ? (
            <p className="bb-predict__a is-warn">{L.mati} {data.ubah.alasan}</p>
          ) : (
            <p className={"bb-predict__a " + (tebakan === data.tebak.jawaban ? "is-good" : "is-warn")}>{data.tebak.alasan}</p>
          )
        )}
      </div>
    </div>
  );
}
