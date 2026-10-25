// Widget garis waktu notifikasi: outbox dan worker (W3-outbox, keputusan 983). Pembaca menebak dulu, lalu mengubah satu
// hal (cara kirim, kejadian, jumlah pengirim, batas percobaan, panjang klaim) dan membaca hasil dan garis waktunya.
// Semua hasil sudah dihitung saat build (OutboxWorker.astro memakai siap.ts); island hanya memilih hasil yang sudah jadi,
// jadi tanpa logika, tanpa Zod, tanpa jam, tanpa gerak sendiri. Jawaban tebakan muncul dengan gerak masuk singkat;
// reduced motion tanpa gerak. Fokus pindah ke kontrol "Ubah satu hal" sesudah menebak.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { muncul } from "../../gerak/muncul";
import type { SkenarioSiap } from "./siap";

export interface LabelSiap {
  judul: string; sumberChip: string; tebakDulu: string; benar: string; belum: string; ulang: string; ubahJudul: string;
  skenarioJudul: string; garisJudul: string; angkaJudul: string; tanda: { baik: string; buruk: string };
}
interface Props { skenario: SkenarioSiap[]; label: LabelSiap }

/** Panah, Home, dan End memindahkan fokus di antara tombol satu kelompok (Tab tetap bekerja untuk semua tombol aktif). */
function panah(e: KeyboardEvent<HTMLElement>) {
  const kunci = e.key;
  if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(kunci)) return;
  const tombol = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
  const i = tombol.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0 || tombol.length === 0) return;
  e.preventDefault();
  const baru = kunci === "Home" ? 0 : kunci === "End" ? tombol.length - 1 : (i + (kunci === "ArrowRight" || kunci === "ArrowDown" ? 1 : -1) + tombol.length) % tombol.length;
  tombol[baru]!.focus();
}

export default function OutboxWorker({ skenario, label: L }: Props) {
  const [aktif, setAktif] = useState(0);
  const [dipilih, setDipilih] = useState<Record<string, number | null>>({});
  const [konfig, setKonfig] = useState<Record<string, Record<string, string>>>(() => Object.fromEntries(skenario.map((s) => [s.id, s.awal])));
  const hasilRef = useRef<HTMLDivElement>(null);
  const ubahRef = useRef<HTMLDivElement>(null);
  const opsiRef = useRef<HTMLOListElement>(null);
  const fokus = useRef<"ubah" | "opsi" | null>(null);

  const s = skenario[aktif]!;
  const pilih = dipilih[s.id] ?? null;
  const kf = konfig[s.id]!;
  const h = s.hasil[s.knob.map((b) => kf[b.id]).join("|")]!;
  const tepat = pilih === s.tebak.benar;

  useLayoutEffect(() => {
    if (pilih !== null) muncul(hasilRef.current);
  }, [pilih, aktif]);
  useEffect(() => {
    if (fokus.current === "ubah") ubahRef.current?.querySelector("button")?.focus();
    if (fokus.current === "opsi") opsiRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    fokus.current = null;
  }, [dipilih]);

  const tebak = (i: number) => {
    fokus.current = "ubah";
    setDipilih({ ...dipilih, [s.id]: i });
  };
  const ulang = () => {
    fokus.current = "opsi";
    setDipilih({ ...dipilih, [s.id]: null });
  };
  const ubah = (knob: string, opsi: string) => setKonfig({ ...konfig, [s.id]: { ...kf, [knob]: opsi } });
  const tandaTeks = (t: string) => (t === "baik" ? L.tanda.baik : t === "buruk" ? L.tanda.buruk : "");

  return (
    <div className="bb-widget tb qr ow" role="group" aria-label={L.judul} data-outbox-worker>
      <div className="bb-widget__head">
        <p><strong>{L.judul}</strong></p>
        <span className="bb-chip is-system">{L.sumberChip}</span>
      </div>

      {skenario.length > 1 && (
        <div role="group" aria-label={L.skenarioJudul} onKeyDown={panah}>
          <ul className="qr-pilih ow-skenario">
            {skenario.map((x, i) => (
              <li key={x.id}>
                <button type="button" className="tb-pilih qr-tombol" aria-pressed={aktif === i} onClick={() => setAktif(i)}>
                  <span>{x.nama}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="tb-tanya"><strong>{L.tebakDulu}</strong> {s.tebak.pertanyaan}</p>
      <ol className="tb-pilihan" ref={opsiRef} onKeyDown={panah}>
        {s.tebak.pilihan.map((o, i) => {
          const kelas = pilih === null ? "" : i === s.tebak.benar ? " is-benar" : i === pilih ? " is-salah" : " is-redup";
          return (
            <li key={i}>
              <button type="button" className={"tb-pilih" + kelas} aria-pressed={pilih === i} disabled={pilih !== null} onClick={() => tebak(i)}>
                <span className="tb-huruf" aria-hidden="true">{String.fromCharCode(65 + i)}</span>{" "}
                <span>{o.teks}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <p role="status" aria-live="polite" className="ow-status">{pilih === null ? "" : tepat ? L.benar : L.belum}</p>
      {pilih !== null && (
        <div ref={hasilRef} className={"tb-hasil " + (tepat ? "is-benar" : "is-salah")}>
          <p>{s.tebak.pilihan[pilih]!.alasan}</p>
          {!tepat && <p><strong>{String.fromCharCode(65 + s.tebak.benar)}.</strong> {s.tebak.pilihan[s.tebak.benar]!.alasan}</p>}
          {!tepat && <p className="tb-tautan"><button type="button" className="bb-btn bb-btn--quiet" onClick={ulang}>{L.ulang}</button></p>}
        </div>
      )}

      {pilih !== null && (
        <div className="qr-ubah" ref={ubahRef}>
          <p className="tb-tanya"><strong>{L.ubahJudul}</strong></p>
          {s.knob.map((b) => (
            <div key={b.id} className="ow-knob">
              <p className="ow-knob__label" id={`ow-${s.id}-${b.id}`}>{b.label}</p>
              <div role="group" aria-labelledby={`ow-${s.id}-${b.id}`} onKeyDown={panah}>
                <ul className="qr-pilih">
                  {b.opsi.map((o) => (
                    <li key={o.id}>
                      <button type="button" className="tb-pilih qr-tombol" aria-pressed={kf[b.id] === o.id} onClick={() => ubah(b.id, o.id)}>
                        <span>{o.teks}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
          <div className="qr-hasil">
            <p role="status" aria-live="polite" className="ow-ringkas"><strong>{h.ringkas}</strong></p>
            <p className="ow-acuan">
              <span className={"bb-chip" + (h.acuan.jenis === "rekaman" ? " is-system" : "")}>{h.acuan.label}</span> {h.acuan.teks}
            </p>
            <p className="tb-tanya"><strong>{L.garisJudul}</strong></p>
            <ol className="ow-garis">
              {h.garis.map((e, i) => (
                <li key={i} className={e.tanda === "netral" ? "" : "is-" + e.tanda}>
                  <span className="ow-waktu">{e.waktu}</span>
                  <span className="ow-lajur">{e.lajur}</span>
                  <span className="ow-teks">{e.teks}</span>
                  {e.tanda !== "netral" && <span className="ow-tanda">{tandaTeks(e.tanda)}</span>}
                </li>
              ))}
            </ol>
            <p className="tb-tanya"><strong>{L.angkaJudul}</strong></p>
            <dl className="qr-angka ow-angka">
              {h.angka.map((a) => (
                <div key={a.label}>
                  <dt>{a.label}</dt>
                  <dd>{a.nilai}{a.tanda !== "netral" && <> <span className="ow-tanda">{tandaTeks(a.tanda)}</span></>}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
