// Widget webhook masuk, langkah demi langkah (W4-webhook, keputusan 1258). Pembaca menebak dulu, lalu menggulir delapan
// langkah. Bilah lengket di atas memegang penanda langkah yang sedang dibaca dan satu hal yang bisa diubah (versi handler);
// keadaan sesudah tiap langkah (gateway, handler, database, uang) ada di dalam langkahnya, jadi tinggi bilah tetap dan
// HP 375 px tidak tertutup papan (papan lengket setinggi ±350 px di HP dan menggeser langkah saat berganti).
// Tombol "Langkah berikutnya" adalah jalan keyboard dan jalan sentuh; gulir dan tombol memakai mesin yang sama
// (logika.ts). Semua teks dan angka sudah dihitung saat build (WebhookLangkah.astro memakai logika.ts), jadi island hanya
// memilih yang sudah jadi. Tanpa animasi otomatis: pindah langkah seketika, jawaban tebakan muncul dengan gerak masuk
// singkat yang hilang dengan reduced motion. Fokus tidak pernah jatuh ke body: sesudah menebak pindah ke pilihan versi,
// sesudah tombol langkah pindah ke langkah tujuan.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { muncul } from "../../gerak/muncul";
import { kelas, langkahBerikut, langkahDariGulir, langkahSebelum, type Mode, type Siap } from "./logika";

export interface LabelSiap {
  judul: string; sumberChip: string; tebakDulu: string; benar: string; belum: string; ulang: string; ubahJudul: string;
  modeJudul: string; petunjuk: string; keadaanJudul: string; berikutnya: string; sebelumnya: string; tanda: { baik: string; buruk: string };
}
interface Props { siap: Siap; label: LabelSiap }

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

export default function WebhookLangkah({ siap, label: L }: Props) {
  const [pilih, setPilih] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("pertama");
  const [aktif, setAktif] = useState(0);
  const akar = useRef<HTMLDivElement>(null);
  const bilah = useRef<HTMLDivElement>(null);
  const butir = useRef<(HTMLLIElement | null)[]>([]);
  const opsiRef = useRef<HTMLOListElement>(null);
  const hasilRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);
  const fokus = useRef<"mode" | "opsi" | null>(null);
  const tujuan = useRef<number | null>(null); // langkah yang harus digulirkan ke tempatnya sesudah render
  const kunciGulir = useRef<number | null>(null); // posisi gulir yang ditetapkan tombol; gulir lain dari pembaca membukanya

  const n = siap.langkah.length;
  const l = siap.langkah[aktif]!;
  const h = l.hasil[mode];
  const tepat = pilih === siap.tebak.benar;
  const tandaTeks = (t: string) => (t === "baik" ? L.tanda.baik : t === "buruk" ? L.tanda.buruk : "");

  useLayoutEffect(() => {
    if (pilih !== null) muncul(hasilRef.current);
  }, [pilih]);
  useEffect(() => {
    if (fokus.current === "mode") modeRef.current?.querySelector<HTMLButtonElement>("button[aria-pressed='true']")?.focus();
    if (fokus.current === "opsi") opsiRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    fokus.current = null;
  }, [pilih]);

  // Tinggi bilah jadi variabel CSS supaya langkah yang difokus tidak tertutup bilah lengket (WCAG 2.4.11).
  useLayoutEffect(() => {
    const a = akar.current;
    const p = bilah.current;
    if (!a || !p) return;
    const atur = () => a.style.setProperty("--wh-bilah", `${Math.ceil(p.getBoundingClientRect().height)}px`);
    atur();
    const ro = new ResizeObserver(atur);
    ro.observe(p);
    return () => ro.disconnect();
  }, [pilih]);

  // Gulir pembaca menentukan langkah aktif; gulir yang baru saja diatur tombol tidak dihitung ulang.
  useEffect(() => {
    if (pilih === null) return;
    let raf = 0;
    const hitung = () => {
      raf = 0;
      const p = bilah.current;
      if (!p) return;
      if (kunciGulir.current !== null) {
        if (Math.abs(window.scrollY - kunciGulir.current) < 3) return;
        kunciGulir.current = null;
      }
      const garis = Math.max(p.getBoundingClientRect().bottom, 0) + 12;
      setAktif(langkahDariGulir(butir.current.map((el) => (el ? el.getBoundingClientRect().top : Infinity)), garis));
    };
    const saatGulir = () => { if (!raf) raf = requestAnimationFrame(hitung); };
    window.addEventListener("scroll", saatGulir, { passive: true });
    return () => { window.removeEventListener("scroll", saatGulir); cancelAnimationFrame(raf); };
  }, [pilih]);

  const gulirKe = (k: number) => {
    const el = butir.current[k];
    const p = bilah.current;
    if (!el || !p) return;
    const atas = parseFloat(getComputedStyle(p).top);
    const dasar = (Number.isFinite(atas) ? atas : 0) + p.getBoundingClientRect().height + 12;
    window.scrollBy({ top: el.getBoundingClientRect().top - dasar, behavior: "auto" });
    kunciGulir.current = window.scrollY;
    el.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (tujuan.current === null) return;
    const k = tujuan.current;
    tujuan.current = null;
    gulirKe(k);
  });
  const pindah = (k: number) => {
    const baru = kelas(k, n);
    tujuan.current = baru;
    if (baru === aktif) gulirKe(baru);
    else setAktif(baru);
  };

  const tebak = (i: number) => {
    fokus.current = "mode";
    setPilih(i);
  };
  const ulang = () => {
    fokus.current = "opsi";
    setPilih(null);
    setAktif(0);
  };

  return (
    <div className="bb-widget tb qr wh" role="group" aria-label={L.judul} data-webhook-langkah data-aktif={pilih === null ? undefined : aktif + 1} data-versi={pilih === null ? undefined : mode} ref={akar}>
      <div className="bb-widget__head">
        <p><strong>{L.judul}</strong></p>
        <span className="bb-chip is-system">{L.sumberChip}</span>
      </div>

      <p className="tb-tanya"><strong>{L.tebakDulu}</strong> {siap.tebak.pertanyaan}</p>
      <ol className="tb-pilihan" ref={opsiRef} onKeyDown={panah}>
        {siap.tebak.pilihan.map((o, i) => {
          const kls = pilih === null ? "" : i === siap.tebak.benar ? " is-benar" : i === pilih ? " is-salah" : " is-redup";
          return (
            <li key={i}>
              <button type="button" className={"tb-pilih" + kls} aria-pressed={pilih === i} disabled={pilih !== null} onClick={() => tebak(i)}>
                <span className="tb-huruf" aria-hidden="true">{String.fromCharCode(65 + i)}</span>{" "}
                <span>{o.teks}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <p role="status" aria-live="polite" className="wh-tebak">{pilih === null ? "" : tepat ? L.benar : L.belum}</p>
      {pilih !== null && (
        <div ref={hasilRef} className={"tb-hasil " + (tepat ? "is-benar" : "is-salah")}>
          <p>{siap.tebak.pilihan[pilih]!.alasan}</p>
          {!tepat && <p><strong>{String.fromCharCode(65 + siap.tebak.benar)}.</strong> {siap.tebak.pilihan[siap.tebak.benar]!.alasan}</p>}
          {!tepat && <p className="tb-tautan"><button type="button" className="bb-btn bb-btn--quiet" onClick={ulang}>{L.ulang}</button></p>}
        </div>
      )}

      {pilih !== null && (
        <div className="wh-cerita">
          <p className="wh-petunjuk">{L.petunjuk}</p>
          <div className="wh-bilah" ref={bilah}>
            <div className="wh-ubah" ref={modeRef}>
              <p className="wh-ubah__judul" id="wh-mode-label"><strong>{L.ubahJudul}:</strong> {L.modeJudul}</p>
              <div role="group" aria-labelledby="wh-mode-label" onKeyDown={panah}>
                <ul className="qr-pilih wh-mode">
                  {siap.mode.map((m) => (
                    <li key={m.id}>
                      <button type="button" className="tb-pilih qr-tombol wh-tombol" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                        <span>{m.teks}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="wh-bilah__judul"><strong>{l.penanda}</strong>: {l.judul}</p>
            <p role="status" aria-live="polite" className="sr-only wh-ringkas">{h.ringkas}</p>
          </div>

          <ol className="wh-langkah">
            {siap.langkah.map((x, i) => (
              <li
                key={x.id}
                ref={(el) => { butir.current[i] = el; }}
                className={"wh-langkah__item" + (i === aktif ? " is-aktif" : "")}
                aria-current={i === aktif ? "step" : undefined}
                tabIndex={-1}
                data-langkah={x.id}
              >
                <p className="wh-langkah__judul"><span className="wh-no">{x.penanda}</span><br /><strong>{x.judul}</strong></p>
                <p className="wh-langkah__teks">{x.teks}</p>
                <div role="group" aria-label={`${L.keadaanJudul}: ${x.judul}`}>
                  <dl className="wh-keadaan">
                    {x.hasil[mode].baris.map((b) => (
                      <div key={b.label} className={"wh-baris" + (b.tanda === "netral" ? "" : " is-" + b.tanda)}>
                        <dt>{b.label}</dt>
                        <dd>{b.nilai}{b.tanda !== "netral" && <> <span className="wh-tanda">{tandaTeks(b.tanda)}</span></>}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <p className="wh-sumber">
                  {x.hasil[mode].sumber.map((src, k) => (
                    <span key={k} className="wh-sumber__butir">
                      <span className={"bb-chip" + (src.jenis === "rekaman" ? " is-system" : "")}>{src.chip}</span> {src.teks}{" "}
                    </span>
                  ))}
                </p>
                {(i > 0 || i < n - 1) && (
                  <p className="wh-langkah__nav">
                    {i > 0 && <button type="button" className="bb-btn bb-btn--quiet wh-nav" onClick={() => pindah(langkahSebelum(i, n))}>{L.sebelumnya}</button>}
                    {i < n - 1 && <button type="button" className="bb-btn wh-nav" onClick={() => pindah(langkahBerikut(i, n))}>{L.berikutnya}</button>}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
