// Widget circuit breaker (W4-breaker, keputusan 1262): tebak berapa pekerjaan verifikasi sudah mati ketika breaker membuka, lalu
// ubah satu hal (jalur, error rate, latensi, jenis jawaban error, breaker, pulihnya vendor, slot worker) dan lihat status
// closed, open, half-open detik demi detik, permintaan yang ditolak cepat, dan titik acuan rekaman. Teks dan angka acuan
// sudah divalidasi saat build (CircuitBreaker.astro); simulasi di logika.ts dan breaker.ts, tanpa Zod di island. Jawaban
// tebakan muncul dengan gerak masuk singkat; reduced motion tanpa gerak (muncul.ts). Semua kontrol dipicu pembaca; tidak ada
// animasi yang berjalan sendiri. Fokus keyboard dipindah ke kontrol berikutnya saat kontrol yang difokus hilang atau
// dinonaktifkan (pola pool-little dan cache-invalidation). Papan detik demi detik hanya hiasan (aria-hidden): angka kuncinya
// ada di daftar angka dan kalimat vonis.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { muncul } from "../../gerak/muncul";
import {
  BARIS, HORIZON, cariAcuan, isi, jalankan, jalurVonis, ringkas,
  type AcuanDef, type Aturan, type HasilVendor, type Jalur, type Jenis, type Param, type Pekerjaan, type Pulih, type Ringkas, type SelQueue, type SelSinkron, type Status, type Vonis,
} from "./logika";

export interface Opsi<T> { nilai: T; label: string }
export interface PilihanSiap { teks: string; alasan: string }
type Kelompok = "jalur" | "error" | "latensi" | "jenis" | "breaker" | "pulih" | "serentak";
type KunciCatatan = "sinkron" | "ambang" | "probe" | "empatSukses" | "empatDiulang" | "harga";
export interface LabelSiap {
  judul: string; sumber: string; tebakDulu: string; benar: string; belum: string; ulang: string; ubahJudul: string;
  kelompok: Record<Kelompok, string>; awal: string;
  papan: { judul: string; baris: string; legenda: string; status: Record<Status, string>; hasil: Record<HasilVendor | "tolak" | "diam" | "gagal", string> };
  angka: {
    sinkron: { permintaan: string; kevendor: string; ditolak: string; tunggu: string; ditolakSehat: string };
    queue: { terkirim: string; menunggu: string; mati: string; kevendor: string; probe: string };
    detik: string; tanpaBreaker: string;
  };
  pekerjaan: { judul: string; kolom: [string, string, string]; status: Record<Pekerjaan["status"], string> };
  vonis: Record<Vonis, string>; ringkas: { sinkron: string; queue: string }; banding: { sama: string; beda: string };
  cocok: string; tanpaAcuan: string;
}
interface Hitungan { judul: string; worker: string; bersama: string; label: string; dijeda: string; outage: string }
type Fokus = "pilihan" | "lanjut" | "tombol" | null;
interface Props {
  aturan: Aturan; awal: Param;
  pertanyaan: string; pilihan: PilihanSiap[]; benar: number;
  opsi: { jalur: Opsi<Jalur>[]; error: Opsi<number>[]; latensi: Opsi<number>[]; jenis: Opsi<Jenis>[]; breaker: Opsi<boolean>[]; pulih: Opsi<Pulih>[]; serentak: Opsi<number>[] };
  acuan: AcuanDef[]; acuanTeks: Record<string, string>; catatan: Record<KunciCatatan, string>;
  hitungan: Hitungan; asal: { judul: string; butir: string[] };
  label: LabelSiap;
}

const KELOMPOK: Kelompok[] = ["jalur", "error", "latensi", "jenis", "breaker", "pulih", "serentak"];
// Nama berkas rekaman dan istilah pustaka tidak diterjemahkan peramban (translate="no"): gaya-bahasa, istilah teknis tetap.
const KODE = /((?:breaker|lajur|worker)\.txt|IsSuccessful)/;
function Teks({ t }: { t: string }) {
  return <>{t.split(KODE).map((b, i) => (i % 2 ? <code key={i} translate="no">{b}</code> : b))}</>;
}
const kodeHuruf = (i: number): string => String.fromCharCode(65 + i);
const nilaiTeks = (n: number | null): string => (n === null ? "" : String(n));

export default function CircuitBreaker({ aturan, awal, pertanyaan, pilihan, benar, opsi, acuan, acuanTeks, catatan, hitungan, asal, label: L }: Props) {
  const id = useId();
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [param, setParam] = useState<Param>(awal);
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
      f === "pilihan" ? a?.querySelector<HTMLButtonElement>(".tb-pilihan .tb-pilih:not(:disabled)")
      : f === "tombol" ? a?.querySelector<HTMLButtonElement>(".cb-tombol")
      : (a?.querySelector<HTMLButtonElement>(".tb-tautan button") ?? a?.querySelector<HTMLButtonElement>(".cb-tombol"));
    sasaran?.focus();
  });
  // Fokus hanya dipindah bila fokus pembaca ada di kontrol yang akan dinonaktifkan atau hilang.
  const difokus = (selektor: string) => typeof document !== "undefined" && !!document.activeElement?.closest(selektor);

  const h = useMemo(() => jalankan(param, aturan), [param, aturan]);
  const ring = useMemo(() => ringkas(param, aturan), [param, aturan]);
  const ringAwal = useMemo(() => ringkas(awal, aturan), [awal, aturan]);

  const pilih = (i: number) => { if (difokus(".tb-pilihan")) fokus.current = "lanjut"; setDipilih(i); setParam(awal); };
  const ulangi = () => { fokus.current = "pilihan"; setDipilih(null); setParam(awal); };
  const kembali = () => { fokus.current = "tombol"; setParam(awal); };
  const ubah = (k: Kelompok, nilai: Param[Kelompok]) => setParam({ ...param, [k]: nilai } as Param);

  const tepat = dipilih === benar;
  const nilaiVonis = (r: Ringkas, p: Param): Record<string, string | number> => ({
    x: nilaiTeks(r.buka), n: p.jalur === "sinkron" ? HORIZON : aturan.pekerjaan, ditolak: r.ditolak, tunggu: r.tunggu, terkirim: r.terkirim, mati: r.mati,
    menunggu: r.menunggu, kevendor: r.kevendor, percobaan: aturan.percobaan, horizon: HORIZON,
  });
  const kalimat = (r: Ringkas, p: Param) => isi(L.vonis[r.vonis], nilaiVonis(r, p));
  const singkat = (r: Ringkas) =>
    jalurVonis(r.vonis) === "sinkron" ? isi(L.ringkas.sinkron, { ditolak: r.ditolak, tunggu: r.tunggu }) : isi(L.ringkas.queue, { mati: r.mati, terkirim: r.terkirim, kevendor: r.kevendor });
  const diubah = KELOMPOK.some((k) => param[k] !== awal[k]);
  const kunciAcuan = cariAcuan(param, acuan);
  const sinkron = param.jalur === "sinkron";
  const empat = param.jenis !== "5xx";
  const detik = (x: number) => isi(L.angka.detik, { x });
  const banding = (x: number | string) => (param.breaker ? ` (${isi(L.angka.tanpaBreaker, { x })})` : "");
  const catatanAktif: KunciCatatan[] = [
    ...(sinkron ? ["sinkron" as const] : []),
    ...(!sinkron && param.breaker && param.serentak === 1 && ring.kebuka && h.jalur === "queue" && h.saatBuka?.some((j) => j.status === "mati") ? ["ambang" as const] : []),
    ...(!sinkron && param.breaker && ring.probe > 0 ? ["probe" as const] : []),
    ...(param.jenis === "4xx-sukses" ? ["empatSukses" as const] : []),
    ...(!sinkron && empat ? ["empatDiulang" as const] : []),
    ...(sinkron && ring.ditolakSehat > 0 ? ["harga" as const] : []),
  ];
  const sel: (SelSinkron | SelQueue)[] = h.sel;
  const baris = Array.from({ length: HORIZON / BARIS }, (_, i) => sel.slice(i * BARIS, (i + 1) * BARIS));
  const kelasSel = (s: SelSinkron | SelQueue): string => "cb-k is-" + ("hasil" in s ? s.hasil : s.percobaan === 0 ? "diam" : s.gagal > 0 ? "gagal" : "ok");
  const legenda: (keyof LabelSiap["papan"]["hasil"])[] = sinkron ? ["ok", "5xx", "timeout", "4xx", "tolak"] : ["ok", "gagal", "diam"];

  return (
    <div ref={akar} className="bb-widget tb cb" role="group" aria-label={L.judul} data-circuit-breaker="">
      <div className="bb-widget__head">
        <p><strong>{L.judul}</strong></p>
        <span className="bb-chip is-warn">{L.sumber}</span>
      </div>

      <p className="tb-tanya"><strong>{L.tebakDulu}</strong> {pertanyaan}</p>
      <ol className="tb-pilihan">
        {pilihan.map((o, i) => {
          const kelas = dipilih === null ? "" : i === benar ? " is-benar" : i === dipilih ? " is-salah" : " is-redup";
          return (
            <li key={i}>
              <button type="button" className={"tb-pilih" + kelas} aria-pressed={dipilih === i} disabled={dipilih !== null} onClick={() => pilih(i)}>
                <span className="tb-huruf" aria-hidden="true">{kodeHuruf(i)}</span>{" "}
                <span>{o.teks}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <p role="status" aria-live="polite" className="cb-status">{dipilih === null ? "" : tepat ? L.benar : L.belum}</p>
      {dipilih !== null && (
        <div ref={hasil} className={"tb-hasil " + (tepat ? "is-benar" : "is-salah")}>
          <p>{pilihan[dipilih]!.alasan}</p>
          {!tepat && <p><strong>{kodeHuruf(benar)}.</strong> {pilihan[benar]!.alasan}</p>}
          {!tepat && <p className="tb-tautan"><button type="button" className="bb-btn bb-btn--quiet" onClick={ulangi}>{L.ulang}</button></p>}
        </div>
      )}

      {dipilih !== null && (
        <div className="cb-ubah">
          <p className="tb-tanya"><strong>{L.ubahJudul}</strong></p>
          {KELOMPOK.filter((k) => (k !== "pulih" || !empat) && (k !== "serentak" || !sinkron)).map((k) => (
            <div key={k} role="group" aria-labelledby={`${id}-${k}`} className="cb-kelompok">
              <p id={`${id}-${k}`} className="cb-label">{L.kelompok[k]}</p>
              <ul className={"cb-pilih" + (k === "jenis" ? " cb-pilih--daftar" : "")}>
                {(opsi[k] as Opsi<Param[Kelompok]>[]).map((o) => (
                  <li key={String(o.nilai)}>
                    <button type="button" className="tb-pilih cb-tombol" aria-pressed={param[k] === o.nilai} onClick={() => ubah(k, o.nilai)}>{o.label}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="cb-kembali"><button type="button" className="bb-btn bb-btn--quiet" onClick={kembali}>{L.awal}</button></p>
        </div>
      )}

      <div role="status" aria-live="polite" className={"cb-vonis" + (dipilih !== null ? (ring.kebuka ? " is-buka" : " is-tetap") : "")}>
        {dipilih !== null && <p><strong>{kalimat(ring, param)}</strong></p>}
      </div>

      {dipilih !== null && (
        <div className="cb-hasil">
          <p className="bb-muted cb-banding">
            {!diubah ? L.banding.sama : isi(L.banding.beda, { awal: singkat(ringAwal), kini: singkat(ring) })}
          </p>
          <p className="cb-acuan">
            {kunciAcuan ? (
              <>
                <span className="bb-chip is-system">{L.cocok}</span> <Teks t={acuanTeks[kunciAcuan]!} />
              </>
            ) : (
              <span className="bb-muted">{L.tanpaAcuan}</span>
            )}
          </p>

          <div className="cb-papan">
            <p className="cb-judul"><strong>{L.papan.judul}</strong></p>
            <div className="cb-baris" aria-hidden="true">
              {baris.map((b, i) => (
                <div key={i} className="cb-menit">
                  <p className="cb-menit-judul">{isi(L.papan.baris, { dari: i * BARIS, sampai: (i + 1) * BARIS - 1 })}</p>
                  <div className="cb-pita">{b.map((s) => <span key={s.detik} className={"cb-p is-" + s.status} />)}</div>
                  <div className="cb-kotak">{b.map((s) => <span key={s.detik} className={kelasSel(s)} />)}</div>
                </div>
              ))}
            </div>
            <ul className="cb-legenda">
              {(["closed", "open", "half-open"] as Status[]).map((s) => <li key={s}><span className={"cb-p is-" + s} aria-hidden="true" /> {L.papan.status[s]}</li>)}
              {legenda.map((x) => <li key={x}><span className={"cb-k is-" + x} aria-hidden="true" /> {L.papan.hasil[x]}</li>)}
            </ul>
            <p className="bb-muted cb-legenda-teks">{L.papan.legenda}</p>

            <dl className="cb-angka">
              {h.jalur === "sinkron" ? (
                <>
                  <div><dt>{L.angka.sinkron.permintaan}</dt><dd>{HORIZON}</dd></div>
                  <div><dt>{L.angka.sinkron.kevendor}</dt><dd>{h.kevendor}{banding(HORIZON)}</dd></div>
                  <div><dt>{L.angka.sinkron.ditolak}</dt><dd>{h.ditolak}</dd></div>
                  <div><dt>{L.angka.sinkron.tunggu}</dt><dd>{detik(h.tunggu)}{banding(detik(ring.tungguTanpa))}</dd></div>
                  {ring.ditolakSehat > 0 && <div><dt>{L.angka.sinkron.ditolakSehat}</dt><dd>{ring.ditolakSehat}</dd></div>}
                </>
              ) : (
                <>
                  <div><dt>{L.angka.queue.terkirim}</dt><dd>{ring.terkirim}</dd></div>
                  <div><dt>{L.angka.queue.menunggu}</dt><dd>{ring.menunggu}</dd></div>
                  <div><dt>{L.angka.queue.mati}</dt><dd>{ring.mati}</dd></div>
                  <div><dt>{L.angka.queue.kevendor}</dt><dd>{h.kevendor}{banding(ring.kevendorTanpa)}</dd></div>
                  {param.breaker && <div><dt>{L.angka.queue.probe}</dt><dd>{ring.probe}</dd></div>}
                </>
              )}
            </dl>

            {h.jalur === "queue" && (
              <table className="bb-table tm-tabel cb-tabel">
                <caption>{L.pekerjaan.judul}</caption>
                <thead><tr>{L.pekerjaan.kolom.map((k) => <th key={k} scope="col">{k}</th>)}</tr></thead>
                <tbody>
                  {h.pekerjaan.map((j) => (
                    <tr key={j.id}>
                      <th scope="row">{j.id}</th>
                      <td>{j.percobaan} <span className="cb-riwayat" aria-hidden="true">{j.riwayat.map((x, i) => <span key={i} className={"cb-k is-" + x} />)}</span></td>
                      <td>{L.pekerjaan.status[j.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!sinkron && (
            <div className="cb-hitung">
              <p className="cb-judul"><strong>{hitungan.judul}</strong></p>
              <ul>
                <li>{hitungan.worker}</li>
                <li>{hitungan.bersama}</li>
                {param.breaker && <li>{hitungan.dijeda}</li>}
                <li>{hitungan.outage}</li>
              </ul>
              <p className="bb-muted cb-catatan">{hitungan.label}</p>
            </div>
          )}

          {catatanAktif.map((k) => <p key={k} className="bb-muted cb-catatan"><Teks t={catatan[k]} /></p>)}

          <details className="cb-asal">
            <summary>{asal.judul}</summary>
            <ul>{asal.butir.map((b, i) => <li key={i}><Teks t={b} /></li>)}</ul>
          </details>
        </div>
      )}
    </div>
  );
}
