// Widget cache dan invalidation (W3-cache, keputusan 986): tebak kapan Citra melihat harga baru, lalu ubah satu hal (jenis cache,
// jumlah instance, TTL, yang berubah, urutan hapus kunci) dan lihat siapa yang masih melihat data lama, berapa lama, dan titik
// acuan rekaman. Teks dan angka acuan sudah divalidasi saat build (CacheInvalidation.astro); simulasi di logika.ts, tanpa Zod
// di island. Jawaban tebakan muncul dengan gerak masuk singkat; reduced motion tanpa gerak (muncul.ts). Slider jam dan semua
// tombol dipicu pembaca; tidak ada animasi yang berjalan sendiri. Fokus keyboard dipindah ke kontrol berikutnya saat kontrol
// yang difokus hilang atau dinonaktifkan (pola pool-little, kunci-akun).
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { muncul } from "../../gerak/muncul";
import {
  HORIZON, bacaKunci, cariAcuan, caraLama, database, isi, jumlahBasi, koma, lihat, littleTanpa, pengamat, ringkas, rupiah, selangBasi,
  type AcuanDef, type Aturan, type JenisCache, type Kejadian, type Param, type Sebab, type Urutan,
} from "./logika";

export interface Opsi<T> { nilai: T; label: string }
export interface PilihanSiap { teks: string; alasan: string }
type Kelompok = "cache" | "instance" | "ttl" | "kejadian" | "urutan";
type KunciCatatan = "uang" | "ttlLab" | "sebelum" | "lambat" | "mati" | "nanti" | "pesanan";
export interface LabelSiap {
  judul: string; sumber: string; tebakDulu: string; benar: string; belum: string; ulang: string; ubahJudul: string;
  kelompok: Record<Kelompok, string>; awal: string;
  jam: { label: string; keluar: string; nilai: string; lompatSebelum: string; lompatSaat: string };
  papan: { judul: string; database: string; isi: string; stale: string; benar: string; istilah: string; garis: string };
  vonis: Record<Sebab, string>; ringkas: { ada: string; tidak: string };
  banding: { sama: string; beda: string };
  cocok: string; tanpaAcuan: string;
  hitungan: { lama: string; lamaNilai: string; lamaNol: string; instanceBasi: string; instanceBasiNilai: string; bacaKunci: string };
}
interface Hitungan { judul: string; diisi: string; diisiNilai: string; beban: string; bebanNilai: string; bacaKunciNilai: { memori: string; redis: string; tanpa: string } }
type Fokus = "pilihan" | "lanjut" | "tombol" | null;
interface Props {
  aturan: Aturan; awal: Param; jamAwal: number;
  pertanyaan: string; pilihan: PilihanSiap[]; benar: number;
  opsi: { cache: Opsi<JenisCache>[]; instance: Opsi<number>[]; ttl: Opsi<number>[]; kejadian: Opsi<Kejadian>[]; urutan: Opsi<Urutan>[] };
  instance: string[];
  acuan: AcuanDef[]; acuanTeks: Record<string, string>; catatan: Record<KunciCatatan, string>;
  hitungan: Hitungan; ttlLab: number;
  asal: { judul: string; butir: string[] };
  label: LabelSiap;
}

const KELOMPOK: Kelompok[] = ["cache", "instance", "ttl", "kejadian", "urutan"];
// Nama file rekaman dan perintah tidak diterjemahkan peramban (translate="no"): gaya-bahasa, istilah teknis tetap.
const KODE = /((?:memori|redis|gagal|beban)\.txt|POST \/lab\/jam|dump\.rdb|SAVE)/;
function Teks({ t }: { t: string }) {
  return <>{t.split(KODE).map((b, i) => (i % 2 ? <code key={i} translate="no">{b}</code> : b))}</>;
}
const kode = (i: number): string => String.fromCharCode(65 + i);
const apaDari = (p: Param): { apa: string; Apa: string } => (p.kejadian === "pesanan" ? { apa: "stok", Apa: "Stok" } : { apa: "harga", Apa: "Harga" });
const persen = (detik: number): string => `${(100 * detik) / HORIZON}%`;

export default function CacheInvalidation({ aturan, awal, jamAwal, pertanyaan, pilihan, benar, opsi, instance, acuan, acuanTeks, catatan, hitungan, ttlLab, asal, label: L }: Props) {
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
      : f === "tombol" ? a?.querySelector<HTMLButtonElement>(".ch-tombol")
      : (a?.querySelector<HTMLButtonElement>(".tb-tautan button") ?? a?.querySelector<HTMLButtonElement>(".ch-tombol"));
    sasaran?.focus();
  });
  // Fokus hanya dipindah bila fokus pembaca ada di kontrol yang akan dinonaktifkan atau hilang.
  const difokus = (selektor: string) => typeof document !== "undefined" && !!document.activeElement?.closest(selektor);

  const ring = useMemo(() => ringkas(param, aturan), [param, aturan]);
  const ringAwal = useMemo(() => ringkas(awal, aturan), [awal, aturan]);
  const selang = useMemo(() => selangBasi(param, aturan, ring.pengamat), [param, aturan, ring.pengamat]);

  const pilih = (i: number) => { if (difokus(".tb-pilihan")) fokus.current = "lanjut"; setDipilih(i); setJam(jamAwal); setParam(awal); };
  const ulangi = () => { fokus.current = "pilihan"; setDipilih(null); setParam(awal); setJam(jamAwal); };
  const kembali = () => { fokus.current = "tombol"; setParam(awal); setJam(jamAwal); };
  const ubah = (k: Kelompok, nilai: Param[Kelompok]) => setParam({ ...param, [k]: nilai } as Param);

  const tepat = dipilih === benar;
  const { apa, Apa } = apaDari(param);
  const kodeX = kode(ring.pengamat);
  const ringkasTeks = (r: typeof ring, p: Param) => isi(r.lama > 0 ? L.ringkas.ada : L.ringkas.tidak, { lama: r.lama, apa: apaDari(p).apa });
  const diubah = KELOMPOK.filter((k) => param[k] !== awal[k]);
  const kunciAcuan = cariAcuan(param, acuan);
  const db = database(param, aturan, jam);
  const dbTeks = isi(L.papan.isi, { harga: rupiah(db.harga), stok: db.stok });
  const cara = caraLama(param, aturan, ring.pengamat);
  const basiJam = jumlahBasi(param, aturan, jam);
  const catatanAktif: KunciCatatan[] = [
    ...(param.ttl === ttlLab ? ["ttlLab" as const] : []),
    ...((param.kejadian === "promo" || param.kejadian === "harga") && (param.cache === "memori" || param.cache === "redis") && param.urutan !== "sesudah" ? [param.urutan as "sebelum" | "lambat"] : []),
    ...(param.cache === "redis-mati" ? ["mati" as const] : []),
    ...(param.kejadian === "promo-nanti" ? ["nanti" as const] : []),
    ...(param.kejadian === "pesanan" ? ["pesanan" as const] : []),
  ];
  const kunciBaca = param.cache === "tanpa" ? "tanpa" : param.cache === "memori" ? "memori" : "redis";
  const lompat = (x: number) => setJam(Math.min(HORIZON, Math.max(0, x)));

  return (
    <div ref={akar} className="bb-widget tb ch" role="group" aria-label={L.judul} data-cache-invalidation="">
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

      <p role="status" aria-live="polite" className="ch-status">{dipilih === null ? "" : tepat ? L.benar : L.belum}</p>
      {dipilih !== null && (
        <div ref={hasil} className={"tb-hasil " + (tepat ? "is-benar" : "is-salah")}>
          <p><Teks t={pilihan[dipilih]!.alasan} /></p>
          {!tepat && <p><strong>{String.fromCharCode(65 + benar)}.</strong> <Teks t={pilihan[benar]!.alasan} /></p>}
          {!tepat && <p className="tb-tautan"><button type="button" className="bb-btn bb-btn--quiet" onClick={ulangi}>{L.ulang}</button></p>}
        </div>
      )}

      {dipilih !== null && (
        <div className="ch-ubah">
          <p className="tb-tanya"><strong>{L.ubahJudul}</strong></p>
          {KELOMPOK.map((k) => (
            <div key={k} role="group" aria-labelledby={`${id}-${k}`} className="ch-kelompok">
              <p id={`${id}-${k}`} className="ch-label">{L.kelompok[k]}</p>
              <ul className={"ch-pilih" + (k === "cache" || k === "kejadian" || k === "urutan" ? " ch-pilih--daftar" : "")}>
                {(opsi[k] as Opsi<Param[Kelompok]>[]).map((o) => (
                  <li key={String(o.nilai)}>
                    <button type="button" className="tb-pilih ch-tombol" aria-pressed={param[k] === o.nilai} onClick={() => ubah(k, o.nilai)}>{o.label}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="ch-kembali"><button type="button" className="bb-btn bb-btn--quiet" onClick={kembali}>{L.awal}</button></p>
        </div>
      )}

      <div role="status" aria-live="polite" className={"ch-vonis" + (dipilih !== null ? (ring.lama > 0 ? " is-stale" : " is-benar") : "")}>
        {dipilih !== null && <p><strong>{isi(L.vonis[ring.sebab], { x: kodeX, lama: ring.lama, apa, Apa })}</strong></p>}
      </div>

      {dipilih !== null && (
        <div className="ch-hasil">
          <p className="bb-muted ch-banding">
            {diubah.length === 0
              ? L.banding.sama
              : isi(L.banding.beda, { awalX: kode(ringAwal.pengamat), awal: ringkasTeks(ringAwal, awal), kiniX: kodeX, kini: ringkasTeks(ring, param) })}
          </p>
          <p className="ch-acuan">
            {kunciAcuan ? (
              <>
                <span className="bb-chip is-system">{L.cocok}</span> <Teks t={acuanTeks[kunciAcuan]!} />
              </>
            ) : (
              <span className="bb-muted">{L.tanpaAcuan}</span>
            )}
          </p>

          <div className="ch-papan">
            <p className="ch-judul"><strong>{isi(L.papan.judul, { x: jam })}</strong></p>
            <p className="ch-db">{isi(L.papan.database, { isi: dbTeks })}</p>
            <ul className="ch-meja">
              {Array.from({ length: param.instance }, (_, i) => {
                const l = lihat(param, aturan, i, jam);
                return (
                  <li key={i} className={"ch-kotak " + (l.basi ? "is-stale" : "is-benar")}>
                    <strong>{instance[i]}</strong>
                    <span className="ch-isi">{isi(L.papan.isi, { harga: rupiah(l.isi.harga), stok: l.isi.stok })}</span>
                    <span className={"bb-chip " + (l.basi ? "is-warn" : "is-system")}>{l.basi ? L.papan.stale : L.papan.benar}</span>
                  </li>
                );
              })}
            </ul>
            <p className="bb-muted ch-istilah">{L.papan.istilah}</p>

            <div className="ch-garis" aria-hidden="true">
              {selang === null ? (
                <span className="ch-seg is-benar" style={{ width: "100%" }} />
              ) : (
                <>
                  {selang.dari > 0 && <span className="ch-seg is-benar" style={{ width: persen(selang.dari) }} />}
                  <span className="ch-seg is-stale" style={{ width: persen(Math.min(selang.sampai, HORIZON) - selang.dari) }} />
                  {selang.sampai < HORIZON && <span className="ch-seg is-benar" style={{ width: persen(HORIZON - selang.sampai) }} />}
                </>
              )}
              <span className="ch-kursor" style={{ left: persen(jam) }} />
            </div>
            <p className="bb-muted ch-legenda">{isi(L.papan.garis, { nama: kodeX, horizon: HORIZON, apa, ttl: param.ttl })}</p>

            <div className="ch-jam">
              <label htmlFor={`${id}-jam`}>{L.jam.label}: <output htmlFor={`${id}-jam`} aria-live="off">{isi(L.jam.keluar, { x: jam })}</output></label>
              <input
                id={`${id}-jam`}
                type="range"
                min={0}
                max={HORIZON}
                step={1}
                value={jam}
                onChange={(e) => setJam(Number(e.target.value))}
                aria-valuetext={isi(L.jam.nilai, { x: jam, stale: basiJam, n: param.instance, apa })}
              />
              <ul className="ch-pilih ch-lompat">
                <li><button type="button" className="tb-pilih ch-tombol" onClick={() => lompat(param.ttl - 1)}>{isi(L.jam.lompatSebelum, { x: param.ttl - 1 })}</button></li>
                <li><button type="button" className="tb-pilih ch-tombol" onClick={() => lompat(param.ttl)}>{isi(L.jam.lompatSaat, { x: param.ttl })}</button></li>
              </ul>
            </div>
          </div>

          <div className="ch-hitung">
            <p className="ch-judul"><strong>{hitungan.judul}</strong></p>
            <ul>
              <li><strong>{hitungan.diisi}</strong>: {hitungan.diisiNilai}</li>
              <li><strong>{isi(L.hitungan.lama, { x: kodeX })}</strong>: {cara === null ? L.hitungan.lamaNol : isi(L.hitungan.lamaNilai, { cara })}</li>
              <li><strong>{L.hitungan.instanceBasi}</strong>: {isi(L.hitungan.instanceBasiNilai, { k: ring.instanceBasi, n: param.instance })}</li>
              <li><strong>{L.hitungan.bacaKunci}</strong>: <Teks t={isi(hitungan.bacaKunciNilai[kunciBaca], { k: bacaKunci(param) ?? 0 })} /></li>
              <li><strong>{hitungan.beban}</strong>: {isi(hitungan.bebanNilai, { l: koma(littleTanpa(aturan), 3) })}</li>
            </ul>
          </div>

          {catatanAktif.map((k) => <p key={k} className="bb-muted ch-catatan"><Teks t={catatan[k]} /></p>)}
          <p className="bb-muted ch-catatan"><Teks t={catatan.uang} /></p>

          <details className="ch-asal">
            <summary>{asal.judul}</summary>
            <ul>{asal.butir.map((b, i) => <li key={i}><Teks t={b} /></li>)}</ul>
          </details>
        </div>
      )}
    </div>
  );
}
