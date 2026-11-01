// Widget peta lima zona Tahap 5 (W5-zona): pembaca menebak dulu di zona mana uang bergerak, lalu membuka zona satu per satu.
// Tiap zona yang dibuka menampilkan komponen, service, tim, dan halaman penjelasnya, dan mengisi baris tabel "kejadian lawan
// tiga hal yang harus selalu benar" yang berawal di zona itu. Teks dan angka dari JSON (t5-zona.json); logika di logika.ts.
// Data divalidasi Zod di pembungkus PetaZona.astro saat build, jadi island ini tidak memuat Zod. SSR = render pertama (sebelum
// menebak). Tanpa JavaScript widget disembunyikan (CSS) dan pembungkus memuat semua isi di <noscript>. Tanpa gerak atau animasi.
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { DataZona, Halaman, ZonaId } from "./skema";
import { barisTabel, diungkap, isi, jawaban, kejadianDi, ringkasan, serviceDari, timDari, zonaDari, zonaUang } from "./logika";

const KELAS_JENIS = { uang: "is-good", salinan: "is-warn", lain: "" } as const;

function Rujukan({ id, halaman, segera }: { id: string; halaman: Halaman; segera: string }) {
  const h = halaman[id];
  if (!h) throw new Error(`PetaZona: halaman ${id} tidak ada di rujukan`);
  return h.href ? <a href={h.href}>{h.label}</a> : <span className="rujukan-menyusul">{h.label} {segera}</span>;
}

export default function PetaZona({ data, halaman }: { data: DataZona; halaman: Halaman }) {
  const L = data.label;
  const [tebakan, setTebakan] = useState<number | null>(null);
  const [pernah, setPernah] = useState<ZonaId[]>([]);
  const [pilih, setPilih] = useState<ZonaId | null>(null);
  const zonaRef = useRef<HTMLDivElement>(null);
  const idPanel = useId();
  const idTabel = useId();
  const sudah = new Set(pernah);
  const buka = diungkap(data, tebakan, sudah);
  const uang = zonaUang(data);
  const jwb = jawaban(data, tebakan, sudah);
  const z = pilih ? zonaDari(data, pilih) : null;
  const ks = pilih ? kejadianDi(data, pilih) : [];

  // Tombol tebakan jadi nonaktif sesudah diklik, dan Chrome memindah fokusnya ke BODY: fokus dipindah ke tombol zona pertama.
  useLayoutEffect(() => {
    if (tebakan === null) return;
    zonaRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
  }, [tebakan]);

  const bukaZona = (id: ZonaId) => {
    setPilih(id);
    setPernah((p) => (p.includes(id) ? p : [...p, id]));
  };

  return (
    <div className="bb-widget pz" role="group" aria-label={data.judul}>
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

      <div className="bb-row" role="group" aria-label={L.ubah} ref={zonaRef}>
        {data.zona.map((x) => (
          <button key={x.id} type="button" className="bb-btn bb-btn--opt pz-zona" aria-pressed={pilih === x.id} aria-controls={idPanel} disabled={tebakan === null} onClick={() => bukaZona(x.id)}>
            {x.label}
            {buka && uang.includes(x.id) && <span className="pz-tanda"> {L.tandaUang}</span>}
          </button>
        ))}
      </div>

      <div role="status" aria-live="polite"><p>{ringkasan(data, pilih, sudah)}</p></div>
      <div role="status" aria-live="polite">
        {jwb.jenis === "lanjut" && <p className="bb-muted">{jwb.teks}</p>}
        {(jwb.jenis === "benar" || jwb.jenis === "belum") && (
          <p className={"bb-predict__a " + (jwb.jenis === "benar" ? "is-good" : "is-warn")}>{jwb.teks}</p>
        )}
      </div>

      <div className="pz-panel" id={idPanel}>
        {z === null ? (
          <p className="bb-muted">{L.panelKosong}</p>
        ) : (
          <>
            <p><strong>{z.label}.</strong> {z.ringkas}</p>
            <p className="pz-judul"><strong>{L.komponenJudul}</strong></p>
            <ul className="pz-daftar">
              {z.komponen.map((k) => {
                const sv = k.service ? serviceDari(data, k.service) : undefined;
                return (
                  <li key={k.label}>
                    <strong>{k.label}</strong>
                    {buka && <> <span className={`bb-chip ${KELAS_JENIS[k.jenis]}`}>{L.jenis[k.jenis]}</span></>}
                    {sv && <span className="bb-muted pz-baris">{isi(L.serviceMeta, { schema: sv.schema, tabel: sv.tabel.length, tim: timDari(data, sv.tim)?.nama ?? sv.tim })}</span>}
                    {buka && <span className="pz-baris">{k.catatan}</span>}
                  </li>
                );
              })}
            </ul>
            <p className="pz-judul"><strong>{L.timJudul}</strong></p>
            <ul className="pz-daftar">
              {z.tim.map((id) => {
                const t = timDari(data, id);
                return t ? (
                  <li key={id}>
                    <strong>{t.nama}</strong> ({isi(L.timMeta, { orang: t.orang, pemimpin: t.pemimpin })}): {t.memegang}
                  </li>
                ) : null;
              })}
            </ul>
            <p className="pz-judul"><strong>{L.halamanJudul}</strong></p>
            <ul className="pz-daftar">
              {z.halaman.map((id) => <li key={id}><Rujukan id={id} halaman={halaman} segera={L.segera} /></li>)}
            </ul>
            <p className="pz-judul"><strong>{L.kejadianJudul}</strong></p>
            {ks.length === 0 ? (
              <p>{isi(L.tanpaKejadian, { total: data.kejadian.length })}</p>
            ) : (
              <ul className="pz-daftar">
                {ks.map((k) => (
                  <li key={k.id}>
                    <strong>{k.label}</strong> <span className="pz-kode">·</span> <Rujukan id={k.halaman} halaman={halaman} segera={L.segera} /> <span className="bb-chip">{L.sumberJenis[k.sumber]}</span>
                    {k.sel.map((c, i) => c.alasan !== undefined && <span className="pz-baris" key={i}>{L.kolom.hal} {i + 1}, {L.status.rusak}: {c.alasan}</span>)}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <p className="pz-judul"><strong>{L.tigaJudul}</strong></p>
      <ol className="pz-tiga">
        {L.tiga.map((t) => <li key={t}>{t}</li>)}
      </ol>
      <table className="jt-tabel pz-tabel">
        <caption className="bb-muted">{L.captionTabel}</caption>
        <thead>
          <tr>
            {[1, 2, 3].map((i) => <th scope="col" key={i} id={`${idTabel}-h${i}`}>{L.kolom.hal} {i}</th>)}
          </tr>
        </thead>
        {barisTabel(data, sudah).map(({ kejadian: k, sel }) => (
          <tbody key={k.id}>
            <tr>
              <th colSpan={3} id={`${idTabel}-${k.id}`} className="pz-kejadian">{k.label} <span className="pz-kode">{k.masalah}</span></th>
            </tr>
            <tr>
              {sel.map((c, i) => (
                <td key={i} headers={`${idTabel}-${k.id} ${idTabel}-h${i + 1}`} className={`pz-sel is-${c.s}`}>
                  {c.s === "belum" ? <><span aria-hidden="true">?</span><span className="sr-only">{L.status.belum}</span></> : L.status[c.s]}
                </td>
              ))}
            </tr>
          </tbody>
        ))}
      </table>
    </div>
  );
}
