// Widget ERD bertumbuh (I6-erd, keputusan 460–465) di atas React Flow, data dari situs/data/erd/tahap-<n>.json.
// - Satu tabel = satu node (nama, kolom, label kunci berupa teks); satu foreign key = satu edge.
// - Pemilih tahap dan mode "bandingkan": tahap sebelumnya di kiri (yang dihapus ditandai), tahap ini di kanan;
//   di HP keduanya bertumpuk. Status baru/berubah/tetap/dihapus berupa teks di node dan warna token.
// - Node adalah tombol: klik atau Enter membuka kolom lengkap dan halaman yang menjelaskannya di bawah diagram.
// - Diagram tidak bisa digeser atau di-zoom dan tidak menangkap scroll; zoom selalu 1 kecuali tata terlalu lebar.
// - Versi statis (daftar tabel dan kolom) terlihat sebelum JS dan tanpa JS, dan tetap ada untuk pembaca layar.
//   Tinggi wadah dipesan sejak SSR (varPesan), jadi hydrate tidak menggeser halaman.
// - Berganti tahap atau mode = gerak masuk singkat (gerak/muncul.ts); reduced motion tanpa gerak.
// Dimuat hanya di halaman yang memakainya, dengan client:visible.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BaseEdge, Handle, MarkerType, Position, ReactFlow, type Edge, type EdgeProps, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import "./erd-tumbuh.css";
import type { DataErd } from "./skema";
import { ringkasCek, ringkasIndex } from "./erd";
import { muncul } from "../gerak/muncul";
import {
  LABEL_STATUS, ambangKolom, bisaBanding, namaTombol, ringkasan, tampilSebelum, tampilTahap, tata, teksAturan, teksKolom, varPesan,
  type TabelTampil, type Tata, type TautanTahap,
} from "./tumbuh";

type Sisi = "satu" | "kiri" | "kanan";
type Panel = { sisi: Sisi; tahap: number; tabel: TabelTampil[]; judul: string };
type DataNode = { t: TabelTampil; dipilih: boolean; pilih: () => void; idDetail: string };

const HANDLE: [string, "source" | "target", Position, CSSProperties?][] = [
  ["atas", "source", Position.Top],
  ["bawah", "target", Position.Bottom],
  ["kiri-keluar", "source", Position.Left, { top: 16 }],
  ["kiri-masuk", "target", Position.Left, { top: 30 }],
  ["kanan-keluar", "source", Position.Right, { top: 16 }],
  ["kanan-masuk", "target", Position.Right, { top: 30 }],
];

function NodeTabel({ data }: NodeProps<Node<DataNode>>) {
  const { t, dipilih, pilih, idDetail } = data;
  return (
    <>
      {HANDLE.map(([id, jenis, posisi, gaya]) => (
        <Handle key={id} id={id} type={jenis} position={posisi} style={gaya} isConnectable={false} />
      ))}
      <button
        type="button"
        className={`erd-tumbuh__node is-${t.status ?? "awal"}${t.bayangan ? " is-bayangan" : ""}`}
        aria-pressed={dipilih}
        aria-controls={idDetail}
        aria-label={namaTombol(t)}
        onClick={pilih}
      >
        <span className="erd-tumbuh__kepala">
          <code translate="no">{t.nama}</code>
          {t.status && <span className="erd-tumbuh__status">{LABEL_STATUS[t.status]}</span>}
        </span>
        {t.bayangan ? (
          <span className="erd-tumbuh__pindah">Isinya pindah ke {t.pindahKe}</span>
        ) : (
          t.kolom.map((k) => (
            <span key={k.kolom.nama} className={`erd-tumbuh__baris is-${k.status ?? "awal"}`}>
              <code translate="no">{k.kolom.nama}</code>
              <span className="erd-tumbuh__label">
                {k.kunci.map((x) => (
                  <span key={x.teks} className="erd-tumbuh__kunci" translate="no">
                    {x.jenis}
                  </span>
                ))}
                {k.status && k.status !== "tetap" && k.status !== t.status && <span className="erd-tumbuh__ubah">{k.status}</span>}
              </span>
            </span>
          ))
        )}
      </button>
    </>
  );
}

const jenisNode = { tabel: NodeTabel };

// Edge yang melompati baris (tata lebar): garis patah dari titik yang dihitung tata(), lewat sisi grid.
function EdgeJalur({ data, markerEnd }: EdgeProps<Edge<{ titik: [number, number][] }>>) {
  const d = (data?.titik ?? []).map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return <BaseEdge path={d} markerEnd={markerEnd} />;
}
const jenisEdge = { jalur: EdgeJalur };

function Statis({ panel, tautan }: { panel: Panel; tautan: TautanTahap }) {
  return (
    <div className="erd-tumbuh__statis-panel">
      <p>
        <strong>{panel.judul}</strong>: {ringkasan(panel.tabel)}
      </p>
      <ul>
        {panel.tabel.map((t) => (
          <li key={t.nama} className={`is-${t.status ?? "awal"}`}>
            <code translate="no">{t.nama}</code>
            {t.status && ` (${LABEL_STATUS[t.status]})`}
            {t.bayangan ? (
              <>: isinya pindah ke {t.pindahKe}.</>
            ) : (
              <ul>
                {t.kolom.map((k) => (
                  <li key={k.kolom.nama}>
                    <code translate="no">{k.kolom.nama}</code> {teksKolom(k)}
                  </li>
                ))}
              </ul>
            )}
            {!t.bayangan && (tautan[panel.tahap]?.[t.nama]?.length ?? 0) > 0 && (
              <span className="sr-only">Dijelaskan di {tautan[panel.tahap][t.nama].map((x) => x.label).join("; ")}.</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Detail({ t, panel, tautan, sebelum, no }: { t: TabelTampil; panel: Panel; tautan: TautanTahap; sebelum: number | null; no: number }) {
  // Tabel yang dihapus dijelaskan di halaman tahap tempat ia masih ada.
  const asal = t.status === "dihapus" && t.bayangan && sebelum ? sebelum : panel.tahap;
  const halaman = tautan[asal]?.[t.nama] ?? [];
  return (
    <>
      <p className="erd-tumbuh__detail-judul">
        <code translate="no">{t.nama}</code> · Tahap {asal}
        {t.status && ` · ${LABEL_STATUS[t.status]}`}
      </p>
      {t.pindahKe && (
        <p>
          Tabel ini dihapus di Tahap {no}. Isinya pindah ke {t.pindahKe}.
        </p>
      )}
      <ul className="erd-tumbuh__detail-kolom">
        {t.kolom.map((k) => (
          <li key={k.kolom.nama}>
            <code translate="no">{k.kolom.nama}</code> {teksKolom(k)}
            {k.kolom.bawaan && `, bawaan ${k.kolom.bawaan}`}
          </li>
        ))}
      </ul>
      {t.tabel.cek.length + t.tabel.index.length > 0 && (
        <ul className="erd-tumbuh__detail-aturan">
          {t.tabel.cek.map((c) => (
            <li key={c.nama}>
              <span className="erd-tumbuh__kunci" translate="no">CHECK</span> <code translate="no">{ringkasCek(c.ekspresi)}</code>
            </li>
          ))}
          {t.tabel.index.map((x) => (
            <li key={x.nama}>
              <span className="erd-tumbuh__kunci" translate="no">{x.unik ? "UNIQUE INDEX" : "INDEX"}</span> <code translate="no">{ringkasIndex(x.definisi)}</code>
            </li>
          ))}
        </ul>
      )}
      {t.aturan.length > 0 && <p>Aturan yang berubah: {t.aturan.map(teksAturan).join("; ")}.</p>}
      {halaman.length > 0 && (
        <p>
          Dijelaskan di{" "}
          {halaman.map((h, i) => (
            <span key={h.label}>
              {i > 0 && "; "}
              {h.href ? <a href={h.href}>{h.label}</a> : h.label}
              {h.catatan && ` (${h.catatan})`}
            </span>
          ))}
          .
        </p>
      )}
    </>
  );
}

type Props = { id: string; judul: string; data: DataErd[]; tautan: TautanTahap; awal: number; uji?: number[] };

export default function ErdTumbuh({ id, judul, data, tautan, awal, uji = [] }: Props) {
  const panggung = useRef<HTMLDivElement>(null);
  const [lebar, setLebar] = useState<number | null>(null); // null = belum di-hydrate: versi statis
  const [no, setNo] = useState(awal);
  const [mauBanding, setBanding] = useState(false);
  const [pilihan, setPilihan] = useState<{ sisi: Sisi; nama: string } | null>(null);
  const diubah = useRef(false);
  const banding = mauBanding && bisaBanding(data, no);
  const sebelum = data.find((d) => d.tahap === no)?.selisih?.terhadap ?? null;

  useEffect(() => {
    const el = panggung.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLebar(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Gerak masuk hanya sesudah pembaca memilih tahap atau mode, tidak saat dimuat.
  useLayoutEffect(() => {
    if (!diubah.current) return;
    diubah.current = false;
    muncul(panggung.current);
  }, [no, banding]);

  const sumber = (n: number) => (uji.includes(n) ? "Data uji" : `Rekaman lab · PostgreSQL ${data.find((d) => d.tahap === n)!.postgres}`);
  const panel: Panel[] = useMemo(
    () =>
      banding && sebelum
        ? [
            { sisi: "kiri", tahap: sebelum, tabel: tampilSebelum(data, no), judul: `Tahap ${sebelum}, sebelum` },
            { sisi: "kanan", tahap: no, tabel: tampilTahap(data, no, false), judul: `Tahap ${no}, sesudah` },
          ]
        : [{ sisi: "satu", tahap: no, tabel: tampilTahap(data, no), judul: `Tahap ${no}` }],
    [data, no, banding, sebelum],
  );
  const pesan = useMemo(() => varPesan(tampilTahap(data, awal)) as CSSProperties, [data, awal]);
  // Bandingkan berdampingan bila setiap sisi muat tata dua kolom pada zoom ≥ 0,85 (desktop); selain itu bertumpuk
  // dengan zoom 1. Di 1366 px sisi selebar ±497 px, tata dua kolom 572 px: zoom ±0,87.
  const sisiLebar = lebar === null ? 0 : Math.floor((lebar - 24) / 2);
  const berdampingan = panel.length === 2 && sisiLebar >= Math.round(ambangKolom(2) * 0.85);
  const lebarPanel = lebar === null ? 0 : berdampingan ? sisiLebar : lebar;
  const lebarTata = berdampingan ? Math.max(lebarPanel, ambangKolom(2)) : lebarPanel;
  const hasil: Tata[] = useMemo(() => (lebar === null ? [] : panel.map((p) => tata(p.tabel, lebarTata))), [panel, lebar, lebarTata]);
  const idDetail = `${id}-detail`;
  const terpilih = pilihan && panel.find((p) => p.sisi === pilihan.sisi);
  const tabelTerpilih = terpilih?.tabel.find((t) => t.nama === pilihan!.nama);
  const adaStatus = panel.some((p) => p.tabel.some((t) => t.status));

  const ganti = (n: number, b: boolean) => {
    diubah.current = true;
    setNo(n);
    setBanding(b);
    setPilihan(null);
  };

  return (
    <figure className="erd-tumbuh not-content" data-erd-tumbuh={id} data-bentuk={lebar === null ? "statis" : hasil.map((h) => h.bentuk).join(" ")} aria-label={judul}>
      <figcaption className="erd-tumbuh__judul">
        <strong>{judul}</strong>
      </figcaption>
      <div className="erd-tumbuh__kontrol">
        <div role="group" aria-label="Pilih tahap" className="erd-tumbuh__pilih">
          {data.map((d) => (
            <button key={d.tahap} type="button" aria-pressed={no === d.tahap} onClick={() => ganti(d.tahap, banding)}>
              Tahap {d.tahap}
            </button>
          ))}
        </div>
        {bisaBanding(data, no) && (
          <button type="button" className="erd-tumbuh__banding" aria-pressed={banding} onClick={() => ganti(no, !banding)}>
            Bandingkan dengan Tahap {sebelum}
          </button>
        )}
      </div>
      {adaStatus && (
        <p className="erd-tumbuh__legenda" aria-hidden="true">
          {(["baru", "berubah", "tetap", "dihapus"] as const).map((s) => (
            <span key={s} className={`erd-tumbuh__legenda-${s}`}>
              {LABEL_STATUS[s]}
            </span>
          ))}
        </p>
      )}
      <div ref={panggung} className="erd-tumbuh__panggung" style={pesan}>
        <div className={lebar === null ? "erd-tumbuh__statis" : "erd-tumbuh__statis sr-only"}>
          {panel.map((p) => (
            <Statis key={p.sisi} panel={p} tautan={tautan} />
          ))}
        </div>
        <div className={`erd-tumbuh__panel${berdampingan ? " is-berdampingan" : ""}`} aria-hidden={lebar === null ? true : undefined}>
          {panel.map((p, i) => {
            const h = hasil[i];
            const zoom = h ? Math.min(1, lebarPanel / h.lebar) : 1;
            const nodes: Node[] = h
              ? h.node.map((n) => {
                  const t = p.tabel.find((x) => x.nama === n.nama)!;
                  const dipilih = pilihan?.sisi === p.sisi && pilihan.nama === n.nama;
                  return {
                    id: n.nama,
                    type: "tabel",
                    position: { x: n.x, y: n.y },
                    width: n.lebar,
                    height: n.tinggi,
                    data: { t, dipilih, idDetail, pilih: () => setPilihan(dipilih ? null : { sisi: p.sisi, nama: n.nama }) },
                    selectable: false,
                    focusable: false,
                  };
                })
              : [];
            const edges: Edge[] = h
              ? h.edge.map((e) => ({
                  id: e.id,
                  source: e.dari,
                  target: e.ke,
                  sourceHandle: e.sumber,
                  targetHandle: e.tujuan,
                  type: e.jenis,
                  pathOptions: e.jenis === "smoothstep" ? { offset: e.offset, borderRadius: 6 } : undefined,
                  data: { titik: e.titik },
                  focusable: false,
                  selectable: false,
                  markerEnd: { type: MarkerType.ArrowClosed, color: "currentColor", width: 14, height: 14 },
                }))
              : [];
            return (
              <div key={p.sisi} className="erd-tumbuh__sisi">
                {panel.length === 2 && (
                  <p className="erd-tumbuh__sisi-judul">
                    <strong>{p.judul}</strong> <span className="bb-chip is-system">{sumber(p.tahap)}</span>
                  </p>
                )}
                <div className="erd-tumbuh__wadah" style={h ? { height: Math.ceil(h.tinggi * zoom) } : undefined}>
                  {h && (
                    <ReactFlow
                      key={`${p.sisi}-${p.tahap}-${h.bentuk}-${lebarPanel}`}
                      id={`${id}-${p.sisi}`}
                      nodes={nodes}
                      edges={edges}
                      nodeTypes={jenisNode}
                      edgeTypes={jenisEdge}
                      defaultViewport={{ x: Math.max(0, (lebarPanel - h.lebar * zoom) / 2), y: 0, zoom }}
                      minZoom={0.3}
                      maxZoom={1}
                      nodesDraggable={false}
                      nodesConnectable={false}
                      nodesFocusable={false}
                      edgesFocusable={false}
                      elementsSelectable={false}
                      panOnDrag={false}
                      panOnScroll={false}
                      zoomOnScroll={false}
                      zoomOnPinch={false}
                      zoomOnDoubleClick={false}
                      preventScrolling={false}
                      disableKeyboardA11y
                      proOptions={{ hideAttribution: true }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {panel.length === 1 && (
        <p className="erd-tumbuh__sumber">
          <span className="bb-chip is-system">{sumber(no)}</span>
        </p>
      )}
      <div id={idDetail} className="erd-tumbuh__detail">
        {tabelTerpilih && terpilih ? (
          <Detail t={tabelTerpilih} panel={terpilih} tautan={tautan} sebelum={sebelum} no={no} />
        ) : (
          // Sebelum hydrate petunjuk sudah menempati ruangnya (tersembunyi), supaya hydrate tidak menggeser isi di bawah
          // diagram di HP, tempat petunjuk dua baris; tanpa JS tidak tampil (erd-tumbuh.css).
          <p className={`erd-tumbuh__petunjuk${lebar === null ? " is-belum" : ""}`}>Pilih tabel untuk membaca kolom lengkap dan halaman yang menjelaskannya.</p>
        )}
      </div>
      <p role="status" className="sr-only">
        {tabelTerpilih ? `Detail tabel ${tabelTerpilih.nama} terbuka di bawah diagram.` : ""}
      </p>
    </figure>
  );
}
