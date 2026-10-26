// Widget cari-bug (keputusan 158): pembaca menandai baris kode sumber bug, lalu memeriksanya.
// Semua teks dari data JSON; logika di logika.ts.
import { useEffect, useRef, useState } from "react";
import { DataCariBug } from "./skema";
import { periksa, ringkas, type Nilai } from "./logika";

const kelasNilai: Record<Nilai, string> = { benar: "is-benar", lewat: "is-lewat", salah: "is-salah" };
const kelasStatus = { ya: " is-good", tidak: " is-warn", na: "" } as const;

export default function CariBug({ data: mentah }: { data: unknown }) {
  const data = DataCariBug.parse(mentah);
  const L = data.label;
  const [ditandai, setDitandai] = useState<Set<number>>(new Set());
  const [diperiksa, setDiperiksa] = useState(false);
  const [lihatBenar, setLihatBenar] = useState(false);
  const hasil = periksa(data, ditandai);
  const K = data.kejadian;
  // Sesudah Ulang, tombol di posisi itu menjadi Periksa yang disabled. Fokus dipindah ke baris kode pertama supaya
  // tidak tertahan di tombol mati atau jatuh ke body (Periksa menjadi Ulang memakai elemen yang sama, fokus tetap).
  const fokusSesudahUlang = useRef(false);
  const kodeRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!fokusSesudahUlang.current || diperiksa) return;
    fokusSesudahUlang.current = false;
    kodeRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [diperiksa]);

  const toggle = (i: number) => {
    if (diperiksa) return;
    const next = new Set(ditandai);
    next.has(i) ? next.delete(i) : next.add(i);
    setDitandai(next);
  };
  const ulang = () => {
    fokusSesudahUlang.current = true;
    setDitandai(new Set());
    setDiperiksa(false);
    setLihatBenar(false);
  };

  return (
    <div className="bb-widget cb" role="group" aria-label={data.judul}>
      <div className="bb-widget__head">
        <p><strong>{data.judul}</strong></p>
        <span className="bb-chip is-warn">{L.sumber}</span>
      </div>

      <div className="bb-predict">
        <p className="bb-predict__q"><strong>{L.tebakDulu}</strong> {data.tebak.q}</p>
        <p className="bb-muted cb-petunjuk">{data.tebak.petunjuk}</p>
      </div>

      <p className="bb-muted cb-perintah">{L.perintah}</p>

      <ol className="cb-kode" translate="no" ref={kodeRef}>
        {data.baris.map((baris, i) => {
          const nilai = diperiksa ? hasil.nilai[i] : undefined;
          const aktif = ditandai.has(i);
          return (
            <li key={i} className={"cb-baris" + (nilai ? " " + kelasNilai[nilai] : aktif ? " is-tandai" : "")}>
              <button type="button" className="cb-tombol" aria-pressed={aktif} disabled={diperiksa} onClick={() => toggle(i)}>
                <span className="cb-no">{i + 1}</span>
                <code>{baris}</code>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="bb-row">
        {!diperiksa ? (
          <button type="button" className="bb-btn bb-btn--primary" disabled={ditandai.size === 0} onClick={() => setDiperiksa(true)}>
            {L.periksa}
          </button>
        ) : (
          <button type="button" className="bb-btn" onClick={ulang}>{L.ulang}</button>
        )}
      </div>

      {L.ringkas !== undefined && <p role="status" aria-live="polite" className="cb-ringkas">{diperiksa ? ringkas(L.ringkas, hasil) : ""}</p>}

      {diperiksa && (
        <div className="cb-hasil" {...(L.ringkas === undefined ? { role: "status", "aria-live": "polite" } : {})}>
          <ul className="cb-alasan">
            {data.bug.map((i) => (
              <li key={i}>
                <span className={"bb-chip " + (ditandai.has(i) ? "is-system" : "is-warn")}>
                  {ditandai.has(i) ? L.benar : L.lewat} · baris {i + 1}
                </span>
                <span>{data.alasan[String(i)]}</span>
              </li>
            ))}
            {[...ditandai].filter((i) => !data.bug.includes(i)).map((i) => (
              <li key={"s" + i}>
                <span className="bb-chip">{L.salahTanda} · baris {i + 1}</span>
                {data.aman[String(i)] && <span>{data.aman[String(i)]}</span>}
              </li>
            ))}
          </ul>

          {K && (
            <div className="cb-kejadian" role="group" aria-label={K.judul}>
              <p className="cb-kejadian__judul"><strong>{K.judul}</strong></p>
              <ol className="cb-kejadian__daftar">
                {K.baris.map((b, i) => (
                  <li key={i} className="cb-kejadian__item">
                    <p className="cb-kejadian__nama"><strong>{b.nama}</strong></p>
                    <ul className="cb-kejadian__sel">
                      {b.sel.map((c, j) => (
                        <li key={j}>
                          <span className={"bb-chip" + kelasStatus[c.status]}>{K.status[c.status]}</span>
                          <span className="cb-kejadian__hal">{K.hal[j]}</span>
                          {c.detail && <span className="cb-kejadian__detail">{c.detail}</span>}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button type="button" className="bb-btn bb-btn--quiet" aria-pressed={lihatBenar} onClick={() => setLihatBenar(!lihatBenar)}>
            {L.perbaikanTombol}
          </button>
          {lihatBenar && (
            <div className="cb-perbaikan">
              <p className="cb-perbaikan__label"><strong>{data.perbaikan.label}</strong></p>
              <ol className="cb-kode is-benar-kode" translate="no">
                {data.perbaikan.baris.map((baris, i) => (
                  <li key={i} className="cb-baris"><span className="cb-no">{i + 1}</span><code>{baris}</code></li>
                ))}
              </ol>
              <p className="bb-muted">{data.perbaikan.catatan}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
