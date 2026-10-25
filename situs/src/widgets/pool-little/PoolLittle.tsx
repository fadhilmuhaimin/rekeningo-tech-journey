// Widget pool koneksi dan Little's Law (W3-pool, keputusan 980): tebak kapan pool penuh, lalu ubah satu hal (ukuran pool,
// lama layanan push, client yang menyerah, pengaman di server) dan lihat L = λ × W, antrean, dan titik acuan rekaman.
// Teks dan angka acuan sudah divalidasi saat build (PoolLittle.astro); simulasi di logika.ts, tanpa Zod di island.
// Jawaban tebakan muncul dengan gerak masuk singkat; reduced motion tanpa gerak (muncul.ts). Slider jam dan semua tombol
// dipicu pembaca; tidak ada animasi yang berjalan sendiri. Fokus keyboard dipindah ke kontrol berikutnya saat kontrol yang
// difokus hilang atau dinonaktifkan (pola kunci-akun dan antrean-lock).
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { muncul } from "../../gerak/muncul";
import {
  HORIZON, cariAcuan, caraW, deret, isi, keadaanPada, koma, lTeks, lambdaTeks, littleL, ringkas, simulasi, vonis, waktuPenuhRumus, wTeks,
  type AcuanDef, type Aturan, type Param, type Pengaman, type Vonis,
} from "./logika";

export interface Opsi<T> { nilai: T; label: string }
export interface PilihanSiap { teks: string; alasan: string }
type Kelompok = "n" | "t" | "tClient" | "pengaman";
type Catatan = "timeout-push" | "idle-tx" | "di-luar" | "tClient";
export interface LabelSiap {
  judul: string; sumber: string; tebakDulu: string; benar: string; belum: string; ulang: string; ubahJudul: string;
  kelompok: Record<Kelompok, string>; awal: string;
  jam: { label: string; keluar: string; nilai: string };
  papan: { pool: string; antre: string; kosongAntre: string; grafik: string; garisL: string };
  keadaan: { judul: string; dikirim: string; terpakai: string; menunggu: string; menyerah: string; pg: string; baca: string; bacaDijawab: string; bacaMenunggu: string };
  hitungan: {
    judul: string; lambda: string; lambdaNilai: string; w: string; wNilai: string; l: string; lNilai: string;
    penuh: string; penuhNilai: string; tidakPenuh: string; detik: string; koneksi: string;
  };
  vonis: Record<Vonis, string>; ringkasVonis: Record<Vonis, string>;
  banding: { sama: string; beda: string };
  cocok: string; tanpaAcuan: string;
}
type Fokus = "pilihan" | "lanjut" | "tombol" | null;
interface Props {
  aturan: Aturan; awal: Param; rps: number; tiap: number; jamAwal: number;
  pertanyaan: string; pilihan: PilihanSiap[]; benar: number;
  opsi: { n: Opsi<number>[]; t: Opsi<number | null>[]; tClient: Opsi<number | null>[]; pengaman: Opsi<Pengaman>[] };
  acuan: AcuanDef[]; acuanTeks: Record<string, string>; catatan: Record<Catatan, string>;
  asal: { judul: string; butir: string[] };
  label: LabelSiap;
}

const KELOMPOK: Kelompok[] = ["n", "t", "tClient", "pengaman"];
// Nama pengaturan dan fungsi kode tidak diterjemahkan peramban (translate="no"): gaya-bahasa, istilah teknis tetap.
const KODE = /(idle_in_transaction_session_timeout|Future\.timeout)/;
function Teks({ t }: { t: string }) {
  return <>{t.split(KODE).map((b, i) => (i % 2 ? <code key={i} translate="no">{b}</code> : b))}</>;
}
const MAKS_ANTRE = 24; // blok antrean yang digambar; sisanya hanya angka

export default function PoolLittle({ aturan, awal, rps, tiap, jamAwal, pertanyaan, pilihan, benar, opsi, acuan, acuanTeks, catatan, asal, label: L }: Props) {
  const id = useId();
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [param, setParam] = useState<Param>(awal);
  const [jam, setJam] = useState(jamAwal);
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
      : f === "tombol" ? a?.querySelector<HTMLButtonElement>(".pl-tombol")
      : (a?.querySelector<HTMLButtonElement>(".tb-tautan button") ?? a?.querySelector<HTMLButtonElement>(".pl-tombol"));
    sasaran?.focus();
  });
  // Fokus hanya dipindah bila fokus pembaca ada di kontrol yang akan dinonaktifkan atau hilang.
  const difokus = (selektor: string) => typeof document !== "undefined" && !!document.activeElement?.closest(selektor);

  const jejak = useMemo(() => simulasi(param, aturan), [param, aturan]);
  const ring = useMemo(() => ringkas(jejak, param, aturan), [jejak, param, aturan]);
  const batang = useMemo(() => deret(jejak), [jejak]);
  const ringAwal = useMemo(() => ringkas(simulasi(awal, aturan), awal, aturan), [awal, aturan]);

  const pilih = (i: number) => { if (difokus(".tb-pilihan")) fokus.current = "lanjut"; setDipilih(i); setJam(jamAwal); setParam(awal); };
  const ulangi = () => { fokus.current = "pilihan"; setDipilih(null); setParam(awal); setJam(jamAwal); };
  const kembali = () => { fokus.current = "tombol"; setParam(awal); };
  const ubah = (k: Kelompok, nilai: Param[Kelompok]) => setParam({ ...param, [k]: nilai } as Param);

  const tepat = dipilih === benar;
  const vn = vonis(ring);
  const lawanL = littleL(param, aturan);
  const x = ring.waktuPenuh === null ? "" : koma(ring.waktuPenuh, 1);
  const keadaan = keadaanPada(jejak, jam, aturan);
  const lengkap = (r: typeof ring, p: Param) => ({ n: p.n, puncak: r.puncak, l: lTeks(littleL(p, aturan)), x: r.waktuPenuh === null ? "" : koma(r.waktuPenuh, 1) });
  const kunciAcuan = cariAcuan(param, acuan);
  const penuhRumus = waktuPenuhRumus(param, aturan);
  const diubah = KELOMPOK.filter((k) => param[k] !== awal[k]);
  const catatanAktif: Catatan[] = [...(param.pengaman !== "tidak" ? [param.pengaman as Catatan] : []), ...(param.tClient !== null ? ["tClient" as Catatan] : [])];
  const wTampil = Number.isFinite(lawanL) ? `${wTeks(param, aturan)} ${L.hitungan.detik}` : wTeks(param, aturan);
  const lTampil = Number.isFinite(lawanL) ? `${lTeks(lawanL)} ${L.hitungan.koneksi}` : lTeks(lawanL);
  const antreTampil = Math.min(keadaan.menunggu, MAKS_ANTRE);
  const kursor = ((jam + 0.5) / (HORIZON + 1)) * 100;

  return (
    <div ref={akar} className="bb-widget tb pl" role="group" aria-label={L.judul} data-pool-little="">
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
        <div className="pl-ubah">
          <p className="tb-tanya"><strong>{L.ubahJudul}</strong></p>
          {KELOMPOK.map((k) => (
            <div key={k} role="group" aria-labelledby={`${id}-${k}`} className="pl-kelompok">
              <p id={`${id}-${k}`} className="pl-label">{L.kelompok[k]}</p>
              <ul className={"pl-pilih" + (k === "pengaman" ? " pl-pilih--daftar" : "")}>
                {(opsi[k] as Opsi<Param[Kelompok]>[]).map((o) => (
                  <li key={String(o.nilai)}>
                    <button type="button" className="tb-pilih pl-tombol" aria-pressed={param[k] === o.nilai} onClick={() => ubah(k, o.nilai)}><Teks t={o.label} /></button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="pl-kembali"><button type="button" className="bb-btn bb-btn--quiet" onClick={kembali}>{L.awal}</button></p>
        </div>
      )}

      <div role="status" aria-live="polite" className={"pl-vonis" + (dipilih !== null ? " is-" + vn : "")}>
        {dipilih !== null && <p><strong>{isi(L.vonis[vn], lengkap(ring, param))}</strong></p>}
      </div>

      {dipilih !== null && (
        <div className="pl-hasil">
          <div className="pl-hitung">
            <p className="pl-judul"><strong>{L.hitungan.judul}</strong></p>
            <ul>
              <li><strong>{L.hitungan.lambda}</strong> = {isi(L.hitungan.lambdaNilai, { lambda: lambdaTeks(aturan), rps: koma(rps, 1), tiap })}</li>
              <li><strong>{L.hitungan.w}</strong> = {isi(L.hitungan.wNilai, { cara: caraW(param, aturan), w: wTampil })}</li>
              <li><strong>{L.hitungan.l}</strong>: {isi(L.hitungan.lNilai, { lambda: lambdaTeks(aturan), w: wTeks(param, aturan), l: lTampil })}</li>
              <li><strong>{L.hitungan.penuh}</strong>: {penuhRumus === null ? L.hitungan.tidakPenuh : isi(L.hitungan.penuhNilai, { n: param.n, lambda: lambdaTeks(aturan), x })}</li>
            </ul>
          </div>

          <p className="bb-muted pl-banding">
            {diubah.length === 0
              ? L.banding.sama
              : isi(L.banding.beda, {
                  awal: isi(L.ringkasVonis[vonis(ringAwal)], lengkap(ringAwal, awal)),
                  kini: isi(L.ringkasVonis[vn], lengkap(ring, param)),
                })}
          </p>
          <p className="pl-acuan">
            {kunciAcuan ? (
              <>
                <span className="bb-chip is-system">{L.cocok}</span> <Teks t={acuanTeks[kunciAcuan]!} />
              </>
            ) : (
              <span className="bb-muted">{L.tanpaAcuan}</span>
            )}
          </p>

          <div className="pl-papan">
            <p className="pl-judul"><strong>{isi(L.papan.pool, { n: param.n })}</strong></p>
            <div className="pl-pool" aria-hidden="true">
              {Array.from({ length: param.n }, (_, i) => <span key={i} className={"pl-sel" + (i < keadaan.terpakai ? " is-pakai" : "")} />)}
            </div>
            <p className="pl-judul"><strong>{L.papan.antre}</strong></p>
            <div className="pl-antre">
              {keadaan.menunggu === 0 ? (
                <span className="bb-muted">{L.papan.kosongAntre}</span>
              ) : (
                <span className="pl-blokan" aria-hidden="true">
                  {Array.from({ length: antreTampil }, (_, i) => <span key={i} className="pl-blok" />)}
                </span>
              )}
            </div>

            <div className="pl-grafik" aria-hidden="true">
              {batang.map((v, i) => (
                <span key={i} className={"pl-batang" + (v >= param.n ? " is-penuh" : "")} style={{ height: `${(100 * v) / param.n}%` }} />
              ))}
              {Number.isFinite(lawanL) && lawanL < param.n && <span className="pl-garis" style={{ bottom: `${(100 * lawanL) / param.n}%` }} />}
              <span className="pl-kursor" style={{ left: `${kursor}%` }} />
            </div>
            <p className="bb-muted pl-legenda">{L.papan.grafik}{Number.isFinite(lawanL) && lawanL < param.n ? ` ${L.papan.garisL}` : ""}</p>

            <div className="pl-jam">
              <label htmlFor={`${id}-jam`}>{L.jam.label}: <output htmlFor={`${id}-jam`} aria-live="off">{isi(L.jam.keluar, { x: jam })}</output></label>
              <input
                id={`${id}-jam`}
                type="range"
                min={0}
                max={HORIZON}
                step={1}
                value={jam}
                onChange={(e) => setJam(Number(e.target.value))}
                aria-valuetext={isi(L.jam.nilai, { x: jam, terpakai: keadaan.terpakai, n: param.n, menunggu: keadaan.menunggu })}
              />
            </div>

            <p className="pl-judul"><strong>{isi(L.keadaan.judul, { x: jam })}</strong></p>
            <dl className="pl-angka">
              <div><dt>{L.keadaan.dikirim}</dt><dd>{keadaan.dikirim}</dd></div>
              <div><dt>{L.keadaan.terpakai}</dt><dd>{keadaan.terpakai} / {param.n}</dd></div>
              <div><dt>{L.keadaan.menunggu}</dt><dd>{keadaan.menunggu}</dd></div>
              {param.tClient !== null && <div><dt>{L.keadaan.menyerah}</dt><dd>{keadaan.menyerah}</dd></div>}
              {param.pengaman === "idle-tx" && <div><dt>{L.keadaan.pg}</dt><dd>{keadaan.pg}</dd></div>}
              <div><dt>{L.keadaan.baca}</dt><dd>{keadaan.terpakai >= param.n ? L.keadaan.bacaMenunggu : L.keadaan.bacaDijawab}</dd></div>
            </dl>
          </div>

          {catatanAktif.map((k) => <p key={k} className="bb-muted pl-catatan"><Teks t={catatan[k]} /></p>)}

          <details className="pl-asal">
            <summary>{asal.judul}</summary>
            <ul>{asal.butir.map((b, i) => <li key={i}><Teks t={b} /></li>)}</ul>
          </details>
        </div>
      )}
    </div>
  );
}
