// Widget jeda replica Tahap 5 (W5-lag): pembaca menebak dulu saldo apa yang muncul di layar Budi bila replica tertinggal, lalu
// mengubah satu hal (jeda replica atau aturan baca) dan melihat tiga aturan baca berdampingan: replica biasa, token LSN,
// remote_apply, satu kelompok baris per aturan (nama aturan, lalu Dibaca dari, Layar Budi, Akibat). Jeda adalah Simulasi; rekaman lab hanya dikutip untuk pilihan yang punya rekaman. Teks dan angka dari JSON
// (t5-lag.json); logika di logika.ts. Data divalidasi Zod di pembungkus JedaReplica.astro saat build, jadi island ini tidak
// memuat Zod. Tanpa JavaScript widget disembunyikan (CSS) dan pembungkus memuat tabelnya di <noscript>. Tanpa gerak atau animasi.
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { AturanId, DataLag } from "./skema";
import { acuanUntuk, akibatTeks, aturanDari, hitung, indeksJeda, isi, jawabanTebak, layarTeks, nilaiJeda, ringkasan } from "./logika";

// Nama kepala HTTP, pengaturan, dan fungsi tidak diterjemahkan peramban (translate="no"): istilah teknis tetap.
const KODE = /(X-Lsn-Tulis|pg_current_wal_lsn\(\)|synchronous_commit(?: = off)?|Idempotency-Key|Content-Type|remote_apply|SyncRep)/;
function Teks({ t }: { t: string }) {
  return <>{t.split(KODE).map((b, i) => (i % 2 ? <code key={i} translate="no">{b}</code> : b))}</>;
}

export default function JedaReplica({ data }: { data: DataLag }) {
  const L = data.label;
  const id = useId();
  const [tebakan, setTebakan] = useState<number | null>(null);
  const [jedaIdx, setJedaIdx] = useState(indeksJeda(data, data.awal.jeda));
  const [aturan, setAturan] = useState<AturanId>(data.awal.aturan);
  const geser = useRef<HTMLInputElement>(null);
  const j = data.jeda[jedaIdx]!;
  const acuan = tebakan === null ? [] : acuanUntuk(data, j, aturan);

  // Tombol tebakan jadi nonaktif sesudah diklik, dan fokus bisa jatuh ke body: fokus dipindah ke penggeser jeda.
  useLayoutEffect(() => {
    if (tebakan !== null) geser.current?.focus({ preventScroll: true });
  }, [tebakan]);

  return (
    <div className="bb-widget lg" role="group" aria-label={data.judul}>
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

      <div role="status" aria-live="polite">
        {tebakan !== null && <p className={"bb-predict__a " + (tebakan === data.tebak.jawaban ? "is-good" : "is-warn")}>{jawabanTebak(data, tebakan)}</p>}
      </div>

      {tebakan !== null && (
        <div className="lg-ubah">
          <p className="lg-judul"><strong>{L.ubahJudul}</strong></p>
          <div className="lg-jeda">
            <label htmlFor={`${id}-jeda`}>
              {L.jeda.label}: <output htmlFor={`${id}-jeda`} aria-live="off">{j.label}</output>
            </label>
            <input
              id={`${id}-jeda`}
              ref={geser}
              type="range"
              min={0}
              max={data.jeda.length - 1}
              step={1}
              value={jedaIdx}
              onChange={(e) => setJedaIdx(Number(e.target.value))}
              aria-valuetext={nilaiJeda(data, j)}
              aria-describedby={`${id}-petunjuk`}
            />
            <p className="bb-muted lg-petunjuk" id={`${id}-petunjuk`}>{L.jeda.petunjuk}</p>
          </div>
          <div className="bb-row lg-aturan" role="group" aria-label={L.aturanJudul}>
            {data.aturan.map((a) => (
              <button key={a.id} type="button" className="bb-btn bb-btn--opt" aria-pressed={aturan === a.id} onClick={() => setAturan(a.id)}>
                {a.kode ? <span translate="no">{a.label}</span> : a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div role="status" aria-live="polite">
        {tebakan !== null && <p><Teks t={ringkasan(data, j, aturan)} /></p>}
      </div>

      {tebakan !== null && (
        <div className="lg-hasil">
          <p className="bb-muted lg-aturan-ringkas"><Teks t={aturanDari(data, aturan).ringkas} /></p>
          <table className="jt-tabel lg-tabel">
            <caption className="bb-muted">{L.tabel.caption}</caption>
            <colgroup><col /><col /></colgroup>
            {data.aturan.map((a) => {
              const h = hitung(data, j, a.id);
              const pilih = a.id === aturan;
              const isiSel = { dibaca: L.sumberNama[h.sumber], layar: layarTeks(data, h), akibat: akibatTeks(data, h) };
              return (
                <tbody key={a.id} className={pilih ? "lg-pilih" : undefined}>
                  <tr>
                    <th colSpan={2} scope="rowgroup" className="lg-nama">
                      {a.kode ? <span translate="no">{a.label}</span> : a.label}
                      {pilih && <span className="lg-tanda"> ({L.tabel.dipilih})</span>}
                    </th>
                  </tr>
                  {(["dibaca", "layar", "akibat"] as const).map((k) => (
                    <tr key={k}>
                      <th scope="row">{L.tabel.kolom[k]}</th>
                      <td className={`lg-sel is-${h.kasus}`}>{isiSel[k]}</td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>

          <p className="lg-judul"><strong>{L.acuanJudul}</strong></p>
          {acuan.length === 0 ? (
            <p className="bb-muted">{L.tanpaAcuan}</p>
          ) : (
            <ul className="lg-daftar">
              {acuan.map((a, i) => (
                <li key={i}>
                  <span className={"bb-chip " + (a.jenis === "rekaman" ? "is-system" : "is-warn")}>{L.acuanJenis[a.jenis]}</span> <Teks t={a.teks} />
                  <span className="bb-muted lg-berkas">{isi(L.acuanBerkas, { berkas: a.berkas, bagian: a.bagian })}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="lg-judul"><strong>{L.uangJudul}</strong></p>
          <p>
            <span className="bb-chip is-system">{L.acuanJenis.rekaman}</span> <Teks t={data.uang.teks} />
            <span className="bb-muted lg-berkas">{isi(L.acuanBerkas, { berkas: data.uang.berkas, bagian: data.uang.bagian })}</span>
          </p>

          <details className="lg-batas">
            <summary>{L.batasJudul}</summary>
            <ul className="lg-daftar">
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
