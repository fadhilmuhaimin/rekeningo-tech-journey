// Widget "Tiga rilis, dua versi app" (2.22, keputusan 813-815): tebak siapa yang menunggu batch backfill, lalu jalankan lima
// fase rekaman dan ubah satu hal (gabungkan semuanya jadi satu langkah, rekaman M13). Data sudah divalidasi saat build
// (TigaRilis.astro); logika di logika.ts. Jawaban muncul dengan gerak masuk singkat; reduced motion tanpa gerak (muncul.ts).
// Fokus keyboard dipindah ke kontrol berikutnya saat kontrol yang difokus hilang atau dinonaktifkan (pola antrean-lock).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { muncul } from "../../gerak/muncul";
import { appSesudah, isi, JUMLAH_FASE, type Kejadian, type SatuLangkah, type Versi } from "./logika";

export interface PilihanSiap { teks: string; alasan: string }
export interface LabelSiap {
  judul: string; sumber: string; tebakDulu: string; pertanyaan: string; benar: string; belum: string; ulang: string;
  fase: { judul: string; ringkas: string }[]; papan: string; app: Record<Versi, string>;
  status: { jalan: string; berhenti: string; belum: string }; sesi: Record<string, string>;
  bayarRiwayat: string; cek: string; langkah: string; berikutnya: string; mulaiUlang: string; ubahJudul: string;
  mode: { tiga: string; satu: string }; kesimpulan: { tiga: string; satu: string }; catatan: { tiga: string; satu: string };
  satu: { judul: string; ringkas: string; serverLama: string; appBerhenti: string };
}
type Mode = "tiga" | "satu";
type Fokus = "berikut" | "pilihan" | "mode" | null;
interface Props { fase: Kejadian[][]; satu: SatuLangkah; pilihan: PilihanSiap[]; benar: number; label: LabelSiap }

const VERSI: Versi[] = ["1.0", "1.1"];

export default function TigaRilis({ fase, satu, pilihan, benar, label: L }: Props) {
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("tiga");
  const [n, setN] = useState(1);
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

  const akhir = n === JUMLAH_FASE;
  const tepat = dipilih === benar;
  const app = appSesudah(fase, n);
  const kejadian = fase[n - 1]!;
  const difokus = (selektor: string) => typeof document !== "undefined" && !!document.activeElement?.closest(selektor);

  const pilih = (i: number) => { if (difokus(".tb-pilihan")) fokus.current = "berikut"; setDipilih(i); setN(1); };
  const ulangi = () => { fokus.current = "pilihan"; setMode("tiga"); setDipilih(null); setN(1); };
  const berikut = () => { if (n + 1 === JUMLAH_FASE && difokus(".al-aksi")) fokus.current = "mode"; setN(n + 1); };
  const ganti = (m: Mode) => setMode(m);
  const awal = () => { fokus.current = "pilihan"; setMode("tiga"); setDipilih(null); setN(1); };

  return (
    <div ref={akar} className="bb-widget tb al" role="group" aria-label={L.judul}>
      <div className="bb-widget__head">
        <p><strong>{L.judul}</strong></p>
        <span className="bb-chip is-system">{L.sumber}</span>
      </div>

      <p className="tb-tanya"><strong>{L.tebakDulu}</strong> {L.pertanyaan}</p>
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
            <p className="tb-hasil__judul"><strong>{tepat ? L.benar : L.belum}</strong>: {pilihan[dipilih]!.teks}</p>
            <p>{pilihan[dipilih]!.alasan}</p>
            {!tepat && <p><strong>{String.fromCharCode(65 + benar)}.</strong> {pilihan[benar]!.alasan}</p>}
            {!tepat && <p className="tb-tautan"><button type="button" className="bb-btn bb-btn--quiet" onClick={ulangi}>{L.ulang}</button></p>}
          </div>
        )}
      </div>

      {dipilih !== null && (
        <div className="al-langkah">
          <ul className="al-papan" aria-label={L.papan}>
            {VERSI.map((v) => {
              const a = app[v];
              const berhenti = mode === "satu" && akhir;
              const sb = satu.app.find((x) => x.versi === v);
              const st = berhenti ? "gagal" : a ? "selesai" : "belum";
              return (
                <li key={v} className={"al-baris is-" + st}>
                  <span className="al-nama">{L.app[v]}</span>
                  <span className={"bb-chip al-status" + (st === "selesai" ? " is-good" : st === "gagal" ? " is-warn" : "")}>
                    {berhenti ? L.status.berhenti : a ? L.status.jalan : L.status.belum}
                  </span>
                  <span className="al-belakang">
                    {berhenti && sb ? isi(L.satu.appBerhenti, { versi: v, teks: sb.teks }) : a ? isi(L.bayarRiwayat, { saldo: a.saldo, baris: a.baris }) : ""}
                  </span>
                </li>
              );
            })}
          </ul>

          <div role="status" aria-live="polite">
            {mode === "tiga" || !akhir ? (
              <>
                <p className="al-no"><strong>{isi(L.langkah, { no: n, total: JUMLAH_FASE })}</strong> · {L.fase[n - 1]!.judul}</p>
                <p>{L.fase[n - 1]!.ringkas}</p>
                <ul className="tr-rekaman">
                  {kejadian.map((k, i) => {
                    if (k.jenis === "langkah") return <li key={i}><strong>{L.sesi[k.sesi] ?? k.sesi}</strong>: <code translate="no">{k.hasil || k.perintah}</code></li>;
                    if (k.jenis === "cek") return <li key={i}><code translate="no">{isi(L.cek, { akun: k.akun, tanpa: k.tanpaBuku, beda: k.berbeda })}</code></li>;
                    return null;
                  })}
                </ul>
              </>
            ) : (
              <>
                <p className="al-no"><strong>{L.satu.judul}</strong></p>
                <p>{L.satu.ringkas}</p>
                <ul className="tr-rekaman">
                  {satu.galat.map((g) => (
                    <li key={g.no}><code translate="no">{isi(L.satu.serverLama, { sesi: L.sesi[g.sesi] ?? g.sesi, hasil: g.hasil })}</code></li>
                  ))}
                </ul>
              </>
            )}
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
            {(["tiga", "satu"] as const).map((m) => (
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
