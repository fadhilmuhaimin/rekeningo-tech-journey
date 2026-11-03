// Widget fan-out notifikasi Tahap 5 (W5-fanout): pembaca menebak dulu berapa lama satu pengumuman ke 1.000.000 perangkat selesai bila
// pengirim ditambah tetapi partisi tetap enam, lalu mengubah satu hal (jumlah pengirim atau jumlah perangkat) dan melihat dua
// kelompok baris berdampingan: partisi sebanyak consumer (rancangan ADR 51) dan enam partisi seperti di lab. Tiap kelompok memuat
// consumer yang bekerja, antrean tiap partisi, laju, lama selesai, kuota penyedia yang terpakai, dan akibatnya. Semua angka adalah
// Simulasi atas Asumsi; rekaman lab hanya dikutip untuk pilihan yang punya rekaman. Teks dan angka dari JSON (t5-fanout.json); logika
// di logika.ts. Data divalidasi Zod di pembungkus FanOut.astro saat build, jadi island ini tidak memuat Zod. Tanpa JavaScript widget
// disembunyikan (CSS) dan pembungkus memuat tabelnya di <noscript>. Tanpa gerak atau animasi.
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { DataFanOut } from "./skema";
import { acuanUntuk, BARIS, hitung, indeksPengirim, isi, jawabanTebak, namaKelompok, nilaiPengirim, penerimaDari, ringkasan, selTeks } from "./logika";

// Nama bendera lab tidak diterjemahkan peramban (translate="no"): istilah teknis tetap.
const KODE = /(-tanpa-backoff)/;
function Teks({ t }: { t: string }) {
  return <>{t.split(KODE).map((b, i) => (i % 2 ? <code key={i} translate="no">{b}</code> : b))}</>;
}

export default function FanOut({ data }: { data: DataFanOut }) {
  const L = data.label;
  const id = useId();
  const [tebakan, setTebakan] = useState<number | null>(null);
  const [kirimIdx, setKirimIdx] = useState(indeksPengirim(data, data.awal.pengirim));
  const [terimaId, setTerimaId] = useState(data.awal.penerima);
  const geser = useRef<HTMLInputElement>(null);
  const p = data.pengirim[kirimIdx]!;
  const n = penerimaDari(data, terimaId);
  const acuan = tebakan === null ? [] : acuanUntuk(data, n, p);
  const hasil = (["sebanyak", "lab"] as const).map((k) => hitung(data, n, p, k));

  // Tombol tebakan jadi nonaktif sesudah diklik, dan fokus bisa jatuh ke body: fokus dipindah ke penggeser pengirim.
  useLayoutEffect(() => {
    if (tebakan !== null) geser.current?.focus({ preventScroll: true });
  }, [tebakan]);

  return (
    <div className="bb-widget fo" role="group" aria-label={data.judul}>
      <div className="bb-widget__head">
        <p><strong>{data.judul}</strong></p>
        <span className="bb-chip is-warn">{L.sumber}</span>
      </div>
      <p className="bb-muted jt-sumber">{data.sumber.teks}</p>

      <div className="bb-predict">
        <p className="bb-predict__q"><strong>{L.tebakDulu}</strong> {data.tebak.q}</p>
        <div className="bb-predict__opts">
          {data.tebak.pilihan.map((t, i) => (
            <button key={t} type="button" className="bb-btn" aria-pressed={tebakan === i} disabled={tebakan !== null} onClick={() => setTebakan(i)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div role="status" aria-live="polite">
        {tebakan !== null && <p className={"bb-predict__a " + (tebakan === data.tebak.jawaban ? "is-good" : "is-warn")}>{jawabanTebak(data, tebakan)}</p>}
      </div>

      {tebakan !== null && (
        <div className="fo-ubah">
          <p className="fo-judul"><strong>{L.ubahJudul}</strong></p>
          <div className="fo-kirim">
            <label htmlFor={`${id}-kirim`}>
              {L.pengirim.label}: <output htmlFor={`${id}-kirim`} aria-live="off">{p.label}</output>
            </label>
            <input
              id={`${id}-kirim`}
              ref={geser}
              type="range"
              min={0}
              max={data.pengirim.length - 1}
              step={1}
              value={kirimIdx}
              onChange={(e) => setKirimIdx(Number(e.target.value))}
              aria-valuetext={nilaiPengirim(data, p)}
              aria-describedby={`${id}-petunjuk`}
            />
            <p className="bb-muted fo-petunjuk" id={`${id}-petunjuk`}>{L.pengirim.petunjuk}</p>
          </div>
          <div className="bb-row fo-penerima" role="group" aria-label={L.penerimaJudul}>
            {data.penerima.map((x) => (
              <button key={x.id} type="button" className="bb-btn bb-btn--opt" aria-pressed={terimaId === x.id} onClick={() => setTerimaId(x.id)}>
                {x.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div role="status" aria-live="polite">
        {tebakan !== null && <p>{ringkasan(data, n, p)}</p>}
      </div>

      {tebakan !== null && (
        <div className="fo-hasil">
          <table className="jt-tabel fo-tabel">
            <caption className="bb-muted">{L.tabel.caption}</caption>
            <colgroup><col /><col /></colgroup>
            {hasil.map((h) => (
              <tbody key={h.kelompok}>
                <tr>
                  <th colSpan={2} scope="rowgroup" className="fo-nama">{namaKelompok(data, h)}</th>
                </tr>
                {BARIS.map((k) => (
                  <tr key={k}>
                    <th scope="row">{L.tabel.kolom[k]}</th>
                    <td className={`fo-sel is-${h.kasus}`}>
                      {selTeks(data, h, k)}
                      {(k === "consumer" || k === "kuota") && (
                        <span className="fo-batang" aria-hidden="true">
                          <span className="fo-isi" style={{ width: `${Math.min(100, k === "consumer" ? (h.bekerja / h.consumer) * 100 : h.persen)}%` }} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>

          <p className="fo-judul"><strong>{L.acuanJudul}</strong></p>
          {acuan.length === 0 ? (
            <p className="bb-muted">{L.tanpaAcuan}</p>
          ) : (
            <ul className="fo-daftar">
              {acuan.map((a, i) => (
                <li key={i}>
                  <span className={"bb-chip " + (a.jenis === "rekaman" ? "is-system" : "is-warn")}>{L.acuanJenis[a.jenis]}</span> <Teks t={a.teks} />
                  <span className="bb-muted fo-berkas">{isi(L.acuanBerkas, { berkas: a.berkas, bagian: a.bagian })}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="fo-judul"><strong>{L.uangJudul}</strong></p>
          <ul className="fo-daftar">
            {data.uang.map((u, i) => (
              <li key={i}>
                <span className="bb-chip is-system">{L.acuanJenis.rekaman}</span> <Teks t={u.teks} />
                <span className="bb-muted fo-berkas">{isi(L.acuanBerkas, { berkas: u.berkas, bagian: u.bagian })}</span>
              </li>
            ))}
          </ul>

          <details className="fo-batas">
            <summary>{L.batasJudul}</summary>
            <ul className="fo-daftar">
              {data.batas.map((b, i) => (
                <li key={i}>
                  <span className="bb-chip">{L.dasar[b.dasar]}</span> <Teks t={b.teks} />
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
