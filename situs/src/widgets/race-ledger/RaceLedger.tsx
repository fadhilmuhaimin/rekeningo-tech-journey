// Widget race ledger (W2-race, keputusan 707–711): memutar ulang rekaman labs/b3-race versi ledger (keputusan 430–434),
// satu statement per langkah, dua client di garis waktu yang sama dengan widget race lama (I5e, keputusan 353; gaya
// .bb-race-garis di tema.css). Pembaca menebak saldo akhir dulu, baru Berikutnya aktif; sesudah langkah terakhir hasil
// dari rekaman dan banding.txt tampil, lalu "ubah satu hal": cara mengunci lain diputar dan bedanya ditulis.
// Dipasang lewat src/components/RaceLedger.astro, yang membaca dan memvalidasi rekaman saat build; island ini menerima
// data yang sudah divalidasi dan tidak memuat Zod. Semua teks dari data/widget/race-ledger.json.
// Keyboard: Tab ke semua tombol (elemen <button> asli), Enter/Spasi, panah kanan/kiri untuk langkah di mana pun fokus
// berada di dalam widget. Fokus pindah ke Berikutnya sesudah menebak, dan ke tombol yang masih aktif bila tombol yang
// sedang difokus menjadi nonaktif. Gerak: hanya baris yang baru ditambah lewat Berikutnya (masukLangkah, src/gerak/race.ts);
// dengan prefers-reduced-motion tidak ada gerak, fungsi tetap.
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import ChipSumber from "../../widget/ChipSumber";
import { masukLangkah } from "../../gerak/race";
import type { LabelRace } from "./skema";
import {
  bagian, beda, caraBerikutnya, fakta, indeksAwal, isi, keadaan, langkahKode, maju, mundur, nilaiTebakan, opsiTebakan,
  pembanding, rupiah, tandaiSelesai, tungguLain, type Klien, type Langkah, type Pelaku, type ReplayRace, type Tebakan,
} from "./logika";

interface Props {
  id: string;
  data: ReplayRace[];
  label: LabelRace;
  awal?: string;
}

type Fokus = "maju" | "opsi" | "akhir" | null;

function KartuKlien({ p, k, L }: { p: Pelaku; k: Klien; L: LabelRace }) {
  const vars = Object.entries(k.vars) as ["saldo_dibaca" | "versi", number][];
  const status = k.status === "selesai" ? k.akhir! : L.status[k.status];
  return (
    <div className={"bb-client" + (k.status === "menunggu" ? " is-waiting" : "")}>
      <div className="bb-client__head">
        <span className={`bb-actor bb-actor--${p}`} aria-hidden="true">{p}</span>
        <strong>{L.klien[p]}</strong>
        <span className={"bb-chip" + (k.status === "menunggu" ? " is-warn" : "")}>{status}</span>
      </div>
      {vars.length ? (
        <dl className="bb-vars">
          {vars.map(([n, v]) => (
            <Fragment key={n}>
              <dt>{L.vars[n]}</dt>
              <dd>{n === "saldo_dibaca" ? rupiah(v) : String(v)}</dd>
            </Fragment>
          ))}
        </dl>
      ) : (
        <p className="bb-muted rl-kosong">{L.belumBaca}</p>
      )}
    </div>
  );
}

function Baris({ s, no, sekarang, L }: { s: Langkah; no: number; sekarang: boolean; L: LabelRace }) {
  const tunggu = tungguLain(s);
  const error = s.result.startsWith("ERROR ");
  const catatan = s.note && s.note !== "kode aplikasi" ? s.note : "";
  const kelas = ["bb-race-langkah", `is-${s.actor}`, s.result === "MENUNGGU lock" && "is-wait", langkahKode(s) && "is-app", error && "is-error",
    ...tunggu.map((w) => `is-tunggu-${w}`), sekarang ? "is-current" : "is-lewat"].filter(Boolean).join(" ");
  return (
    <li className={kelas} aria-current={sekarang ? "step" : undefined}>
      <span className="bb-race-langkah__no">{no}</span>
      <div className="bb-race-langkah__isi">
        <span className={`bb-actor bb-actor--${s.actor}`} aria-hidden="true">{s.actor}</span>
        <span className="bb-sr">{L.klien[s.actor]}: </span>
        {s.sql ? (
          <code className="bb-race-langkah__sql" translate="no">{s.sql}</code>
        ) : (
          <em className="bb-race-langkah__sql"><span className="bb-sr">{L.kodeAplikasi} </span>{s.result}</em>
        )}
        {s.sql && <span className="bb-race-langkah__hasil">→ {s.result}</span>}
        {catatan && <span className="bb-race-langkah__hasil rl-catatan">{catatan}</span>}
        {tunggu.length > 0 && <span className="bb-sr"> {isi(L.masihMenunggu, { klien: tunggu.map((w) => L.klien[w]).join(" dan ") })}</span>}
      </div>
    </li>
  );
}

export default function RaceLedger({ id, data, label: L, awal }: Props) {
  const uid = useId();
  const daftar = data.map((r) => r.cara);
  const [cara, setCara] = useState(() => daftar[indeksAwal(data, awal)]!);
  const [tebakan, setTebakan] = useState<Record<string, Tebakan>>({});
  const [posisi, setPosisi] = useState<Record<string, number>>({});
  const [selesai, setSelesai] = useState<string[]>([]);
  const r = data.find((x) => x.cara === cara)!;
  const n = r.langkah.length;
  const i = posisi[cara] ?? 0;
  const t = tebakan[cara];
  const ditebak = t !== undefined;
  const k = keadaan(r, i);
  const opsi = opsiTebakan(r);
  const judul = (c: string) => data.find((x) => x.cara === c)!.judul;

  const daftarRef = useRef<HTMLOListElement>(null);
  const majuRef = useRef<HTMLButtonElement>(null);
  const mundurRef = useRef<HTMLButtonElement>(null);
  const ulangRef = useRef<HTMLButtonElement>(null);
  const gantiRef = useRef<HTMLButtonElement>(null);
  const opsiRef = useRef<HTMLDivElement>(null);
  const fokus = useRef<Fokus>(null);
  const gerak = useRef(false);

  // Baris baru masuk dengan gerak singkat hanya sesudah Berikutnya; useLayoutEffect supaya frame pertama sudah bergerak.
  useLayoutEffect(() => {
    if (!gerak.current) return;
    gerak.current = false;
    masukLangkah(daftarRef.current?.lastElementChild as HTMLElement | null);
  }, [i, cara]);

  useEffect(() => {
    const f = fokus.current;
    fokus.current = null;
    if (f === "maju") majuRef.current?.focus();
    else if (f === "opsi") opsiRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    else if (f === "akhir") (gantiRef.current ?? ulangRef.current)?.focus();
  });

  const aktif = (el: HTMLElement | null) => typeof document !== "undefined" && document.activeElement === el;

  const langkahMaju = () => {
    const baru = maju(i, n, ditebak);
    if (baru === i) return false;
    gerak.current = true;
    setPosisi({ ...posisi, [cara]: baru });
    if (baru === n) {
      setSelesai(tandaiSelesai(selesai, cara));
      if (aktif(majuRef.current)) fokus.current = "akhir";
    }
    return true;
  };
  const langkahMundur = () => {
    const baru = mundur(i);
    if (baru === i) return false;
    setPosisi({ ...posisi, [cara]: baru });
    if (baru === 0 && aktif(mundurRef.current)) fokus.current = "maju";
    return true;
  };
  const ulang = () => setPosisi({ ...posisi, [cara]: 0 });
  const tebak = (v: Tebakan) => {
    setTebakan({ ...tebakan, [cara]: v });
    fokus.current = "maju"; // tombol tebakan kini nonaktif; langkah berikutnya adalah Berikutnya
  };
  const pilihCara = (c: string, pindahFokus: boolean) => {
    setCara(c);
    if (pindahFokus) fokus.current = tebakan[c] === undefined ? "opsi" : "maju";
  };
  const tombol = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === "ArrowRight" && langkahMaju()) e.preventDefault();
    else if (e.key === "ArrowLeft" && langkahMundur()) e.preventDefault();
  };

  const s = k.sekarang;
  const catatan = s && s.note && s.note !== "kode aplikasi" ? ` (${s.note})` : "";
  const kini = !ditebak ? L.pilihDulu : !s ? L.belumLangkah
    : isi(L.sekarang, { i, klien: L.klien[s.actor], isi: s.sql ? `${s.sql} → ${s.result}` : s.result }) + catatan;
  const nilai = ditebak ? nilaiTebakan(r, t) : "belum";
  const hasil = fakta(r, L);
  const lawan = k.selesai ? pembanding(selesai, cara) : null;
  const banding = lawan ? beda(fakta(data.find((x) => x.cara === lawan)!, L), hasil) : null;
  const berikut = k.selesai ? caraBerikutnya(daftar, cara, selesai) : null;
  const kaki = bagian(L.kaki, { versi: r.postgres, isolation: r.isolation, tanggal: r.tanggal, file: r.file, kepala: r.kepala }, ["file", "kepala"]);

  return (
    <div className="bb-widget bb-race rl" role="group" aria-labelledby={`${uid}-judul`} data-race-ledger={id} onKeyDown={tombol}>
      <div className="bb-widget__head">
        <p id={`${uid}-judul`}><strong>{L.judul}</strong></p>
        <span className="bb-muted">{L.petunjuk}</span>
        <ChipSumber sumber={{ jenis: "rekaman", file: r.file }} />
      </div>

      {data.length > 1 && (
        <div className="bb-tabs rl-cara" role="group" aria-label={L.cara}>
          {data.map((x) => (
            <button key={x.cara} type="button" className="bb-btn" aria-pressed={x.cara === cara} data-cara={x.cara} onClick={() => pilihCara(x.cara, false)}>
              {x.judul}
            </button>
          ))}
        </div>
      )}

      <div className="bb-predict" role="group" aria-labelledby={`${uid}-tanya`}>
        <p className="bb-predict__q" id={`${uid}-tanya`}>
          <strong>{L.tebakDulu}</strong>{" "}
          {isi(L.pertanyaan, { awal: rupiah(r.awal), A: rupiah(r.kirim.A), B: rupiah(r.kirim.B), kepadaA: L.penerima.A, kepadaB: L.penerima.B })}
        </p>
        <div className="bb-predict__opts" ref={opsiRef}>
          {[...opsi, "belum" as const].map((v) => (
            <button key={String(v)} type="button" className="bb-btn bb-btn--opt" aria-pressed={t === v} disabled={ditebak} onClick={() => tebak(v)}>
              {v === "belum" ? L.belumTahu : rupiah(v)}
            </button>
          ))}
        </div>
      </div>

      <div className="bb-stage">
        <KartuKlien p="A" k={k.A} L={L} />
        <div className="bb-db">
          <strong>{L.database}</strong>
          <div className="bb-db__row">
            <span className="bb-muted">{L.saldoCommit}</span>
            <span className="bb-db__saldo">{rupiah(k.saldo)}</span>
          </div>
          <div className="bb-db__row">
            <span className="bb-muted">{L.rowLock}</span>
            <span className={"bb-chip" + (k.lock ? " is-system" : "")}>{k.lock ? isi(L.lockDipegang, { lock: k.lock }) : L.lockKosong}</span>
          </div>
        </div>
        <KartuKlien p="B" k={k.B} L={L} />
      </div>

      <div className="bb-race-garis">
        <div className="bb-race-garis__kepala" aria-hidden="true">
          <span className="bb-race-garis__a"><span className="bb-actor bb-actor--A">A</span> {L.klien.A}</span>
          <span className="bb-race-garis__b">{L.klien.B} <span className="bb-actor bb-actor--B">B</span></span>
        </div>
        <ol className="bb-race-garis__daftar" aria-label={L.garisWaktu} ref={daftarRef}>
          {r.langkah.slice(0, i).map((x, j) => <Baris key={`${cara}-${j}`} s={x} no={j + 1} sekarang={j === i - 1} L={L} />)}
        </ol>
        <p className="bb-race-garis__catatan bb-muted">{L.catatanTunggu}</p>
      </div>

      <p className="bb-now" aria-live="polite">{kini}</p>
      <div className="bb-row">
        <button ref={mundurRef} type="button" className="bb-btn" disabled={i === 0} onClick={langkahMundur}>{L.sebelumnya}</button>
        <button ref={majuRef} type="button" className="bb-btn bb-btn--primary" disabled={!ditebak || i >= n} onClick={langkahMaju}>{L.berikutnya}</button>
        <button ref={ulangRef} type="button" className="bb-btn bb-btn--quiet" onClick={ulang}>{L.ulang}</button>
        <span className="bb-muted">{isi(L.hitungan, { i, n })}</span>
      </div>

      <div role="status">
        {k.selesai && (
          <div className={"bb-summary rl-hasil " + (r.akhir < 0 ? "is-warn" : "is-good")}>
            <p>
              <strong>{isi(L.hasilJudul, { saldo: rupiah(r.akhir) })}</strong>
              {nilai !== "belum" && ` ${nilai === "benar" ? L.benar : L.meleset}`} {r.ringkasan}
            </p>
            <dl className="rl-fakta">
              {hasil.filter((f) => f.kunci !== "saldo").map((f) => (
                <Fragment key={f.kunci}>
                  <dt>{f.label}</dt>
                  <dd>{f.nilai}</dd>
                </Fragment>
              ))}
            </dl>
            {banding && lawan && (
              <div className="rl-beda">
                {banding.berubah.length ? (
                  <>
                    <p><strong>{isi(L.bedaJudul, { cara: judul(lawan) })}</strong></p>
                    <ul>
                      {banding.berubah.map((b) => <li key={b.label}>{b.label}: {b.lama} → {b.baru}</li>)}
                    </ul>
                    <p className="bb-muted">{isi(L.sama, { daftar: banding.sama.map((f) => `${f.label} ${f.nilai}`).join("; ") })}</p>
                  </>
                ) : (
                  <p>{isi(L.bedaKosong, { cara: judul(lawan) })}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {berikut && (
        <p className="rl-ganti">
          <button ref={gantiRef} type="button" className="bb-btn" onClick={() => pilihCara(berikut, true)}>{isi(L.gantiCara, { cara: judul(berikut) })}</button>
        </p>
      )}

      <p className="bb-widget__foot bb-muted">
        {kaki.map((b, j) => (b.kode ? <code key={j} translate="no">{b.teks}</code> : <Fragment key={j}>{b.teks}</Fragment>))}
      </p>
    </div>
  );
}
