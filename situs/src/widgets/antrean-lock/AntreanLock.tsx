// Widget antrean lock (M13, keputusan 810): tebak siapa yang ditunggu Bayar, lalu jalankan rekaman langkah demi langkah dan
// ubah satu hal (batas tunggu lock di migrasi). Data sudah divalidasi saat build (AntreanLock.astro); logika di logika.ts.
// Jawaban muncul dengan gerak masuk singkat; reduced motion tanpa gerak (muncul.ts).
// Fokus keyboard dipindah ke kontrol berikutnya saat kontrol yang difokus hilang atau dinonaktifkan (pola race-ledger).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { muncul } from "../../gerak/muncul";
import { isi, papanSesudah, type Langkah, type Sesi, type Status } from "./logika";

export interface PilihanSiap { menunggu: Sesi | "-"; alasan: string }
export interface LabelSiap {
  judul: string; sumber: string; papan: string; tebakDulu: string; pertanyaan: string; benar: string; belum: string; ulang: string;
  nama: Record<Sesi, string>; tanpaPilihan: string; status: Record<Status, string>; belakang: string; langkah: string;
  berikutnya: string; mulaiUlang: string; ubahJudul: string; mode: { tanpa: string; dengan: string };
  kesimpulan: { tanpa: string; dengan: string }; catatan: { tanpa: string; dengan: string };
}
type Mode = "tanpa" | "dengan";
type Fokus = "berikut" | "pilihan" | "mode" | null;
interface Props { langkah: Record<Mode, Langkah[]>; sesi: Record<Mode, Sesi[]>; pilihan: PilihanSiap[]; benar: number; label: LabelSiap }

const NADA: Record<Status, string> = { belum: "", terbuka: " is-system", menunggu: " is-warn", selesai: " is-good", gagal: " is-warn", menyerah: " is-system" };
const AWAL = 2; // laporan terbuka dan migrasi antre: keadaan sebelum tebakan

export default function AntreanLock({ langkah, sesi, pilihan, benar, label: L }: Props) {
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("tanpa");
  const [n, setN] = useState(AWAL);
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
      f === "berikut" ? a?.querySelector<HTMLButtonElement>(".al-aksi .bb-btn:not(.bb-btn--quiet)")
      : f === "pilihan" ? a?.querySelector<HTMLButtonElement>(".tb-pilihan .tb-pilih:not(:disabled)")
      : a?.querySelector<HTMLButtonElement>('.al-mode__tombol[aria-pressed="false"]');
    sasaran?.focus();
  });

  const daftar = langkah[mode];
  const papan = papanSesudah(daftar, n);
  const sekarang = n > 0 ? daftar[n - 1]! : null;
  const akhir = n === daftar.length;
  const tepat = dipilih === benar;
  const namaPilihan = (p: PilihanSiap) => (p.menunggu === "-" ? L.tanpaPilihan : L.nama[p.menunggu]);

  // Fokus hanya dipindah bila fokus pembaca ada di kontrol yang akan hilang atau dinonaktifkan.
  const difokus = (selektor: string) => typeof document !== "undefined" && !!document.activeElement?.closest(selektor);

  const pilih = (i: number) => { if (difokus(".tb-pilihan")) fokus.current = "berikut"; setDipilih(i); setN(AWAL + 1); };
  const ulangi = () => { fokus.current = "pilihan"; setDipilih(null); setN(AWAL); };
  const berikut = () => { if (n + 1 === daftar.length && difokus(".al-aksi")) fokus.current = "mode"; setN(n + 1); };
  const ganti = (m: Mode) => { setMode(m); setN(langkah[m].length); };
  const awal = () => { fokus.current = "pilihan"; setMode("tanpa"); setDipilih(null); setN(AWAL); };

  return (
    <div ref={akar} className="bb-widget tb al" role="group" aria-label={L.judul}>
      <div className="bb-widget__head">
        <p><strong>{L.judul}</strong></p>
        <span className="bb-chip is-system">{L.sumber}</span>
      </div>

      <ul className="al-papan" aria-label={L.papan}>
        {sesi[mode].map((s) => {
          const k = papan[s];
          const st: Status = k ? k.status : "belum";
          return (
            <li key={s} className={"al-baris is-" + st}>
              <span className="al-nama">{L.nama[s]}</span>
              <span className={"bb-chip al-status" + NADA[st]}>{L.status[st]}{k?.kode ? ` ${k.kode}` : ""}</span>
              {k?.belakang && <span className="al-belakang">{isi(L.belakang, { nama: L.nama[k.belakang].toLowerCase() })}</span>}
            </li>
          );
        })}
      </ul>

      <p className="tb-tanya"><strong>{L.tebakDulu}</strong> {L.pertanyaan}</p>
      <ol className="tb-pilihan">
        {pilihan.map((o, i) => {
          const kelas = dipilih === null ? "" : i === benar ? " is-benar" : i === dipilih ? " is-salah" : " is-redup";
          return (
            <li key={i}>
              <button type="button" className={"tb-pilih" + kelas} aria-pressed={dipilih === i} disabled={dipilih !== null} onClick={() => pilih(i)}>
                <span className="tb-huruf" aria-hidden="true">{String.fromCharCode(65 + i)}</span>{" "}
                <span>{namaPilihan(o)}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div role="status" aria-live="polite">
        {dipilih !== null && (
          <div ref={hasil} className={"tb-hasil " + (tepat ? "is-benar" : "is-salah")}>
            <p className="tb-hasil__judul"><strong>{tepat ? L.benar : L.belum}</strong>: {namaPilihan(pilihan[dipilih]!)}</p>
            <p>{pilihan[dipilih]!.alasan}</p>
            {!tepat && <p><strong>{String.fromCharCode(65 + benar)}.</strong> {pilihan[benar]!.alasan}</p>}
            {!tepat && <p className="tb-tautan"><button type="button" className="bb-btn bb-btn--quiet" onClick={ulangi}>{L.ulang}</button></p>}
          </div>
        )}
      </div>

      {dipilih !== null && (
        <div className="al-langkah">
          <div role="status" aria-live="polite">
            <p className="al-no"><strong>{isi(L.langkah, { no: sekarang!.no, total: daftar.length })}</strong> · {L.nama[sekarang!.sesi]}</p>
            <p className="al-kode"><code translate="no">{sekarang!.perintah}</code></p>
            <p className="al-hasil"><code translate="no">{sekarang!.hasil}</code></p>
            {akhir && <p className="al-kesimpulan">{L.kesimpulan[mode]}</p>}
          </div>
          <p className="al-aksi">
            {!akhir && <button type="button" className="bb-btn" onClick={berikut}>{L.berikutnya}</button>}
            <button type="button" className="bb-btn bb-btn--quiet" onClick={awal}>{L.mulaiUlang}</button>
          </p>
        </div>
      )}

      {dipilih !== null && akhir && (
        <div className="al-ubah">
          <p className="tb-tanya"><strong>{L.ubahJudul}</strong></p>
          <ul className="al-mode">
            {(["tanpa", "dengan"] as const).map((m) => (
              <li key={m}>
                <button type="button" className="tb-pilih al-mode__tombol" aria-pressed={mode === m} onClick={() => ganti(m)}>{L.mode[m]}</button>
              </li>
            ))}
          </ul>
          <p className="bb-muted al-catatan">{L.catatan[mode]}</p>
        </div>
      )}
    </div>
  );
}
