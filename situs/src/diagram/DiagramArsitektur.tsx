// Diagram arsitektur tahap di atas React Flow (I4, keputusan 232).
// - Sebelum JS dimuat dan untuk pembaca layar selalu ada versi statis (role="img" + aria-label).
// - Diagram tidak bisa digeser, di-zoom, atau menangkap scroll halaman; ukurannya dari fitView (zoom paling besar 1).
// - Kotak adalah tombol: klik atau Enter membuka catatannya di bawah diagram, bukan tooltip.
// - Tinggi wadah sudah dipesan di SSR (varPesan, diagram.css): versi statis duduk di dalam ruang itu, jadi hydrate
//   tidak menggeser halaman (review PR #161, keputusan 248).
// - `kunci` berganti (peta tahap di beranda, I5b): React Flow dipasang ulang supaya fitView mengukur data baru
//   (fitView hanya berlaku untuk node awal), dan kotak yang dipilih dilepas.
// - Label bawaan React Flow 12.12 berbahasa Inggris tidak sampai ke pembaca layar (A11y-diagram, pola keputusan 466):
//   node tanpa aria-roledescription "node", garis dan lapisan svg-nya aria-hidden. Kalimat diagram (termasuk "ke" untuk
//   panah) ada di versi statis; ukur-diagram.mjs gagal bila label Inggris atau svg garis terbaca lagi.
// Dimuat hanya di halaman yang memakainya, dengan client:visible.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import "./diagram.css";
import type { Arsitektur } from "./skema";
import { LABEL_STATUS, UKURAN, deskripsi, lebarMendatar, tata, varPesan, type Arah, type Status, type TataKotak } from "./tata";

type DataKotak = { t: TataKotak; arah: Arah; dipilih: boolean; pilih: (id: string) => void; idCatatan: string };
type DataZona = { label: string };

function NodeKotak({ data }: NodeProps<Node<DataKotak>>) {
  const { t, arah, dipilih, pilih } = data;
  const [masuk, keluar] = arah === "mendatar" ? [Position.Left, Position.Right] : [Position.Top, Position.Bottom];
  return (
    <>
      <Handle type="target" position={masuk} isConnectable={false} />
      <button
        type="button"
        className={`diagram__kotak is-${t.status}`}
        aria-pressed={dipilih}
        aria-controls={data.idCatatan}
        onClick={() => pilih(t.id)}
      >
        <span className="diagram__label">{t.kotak.label}</span>
        <span className="diagram__status">{LABEL_STATUS[t.status]}</span>
      </button>
      <Handle type="source" position={keluar} isConnectable={false} />
    </>
  );
}

function NodeZona({ data }: NodeProps<Node<DataZona>>) {
  return <span className="diagram__zona-label">{data.label}</span>;
}

const jenisNode = { kotak: NodeKotak, zona: NodeZona };

// Kalimat di panel catatan saat kotak tanpa catatan dipilih.
const KALIMAT_STATUS: Record<Status, string> = {
  baru: "Baru di tahap ini.",
  berubah: "Sudah ada sebelumnya; isinya berubah di tahap ini.",
  lama: "Sudah ada sejak tahap sebelumnya.",
};

type Props = { data: Arsitektur; judul: string; id: string; kunci?: string };

export default function DiagramArsitektur({ data, judul, id, kunci = "" }: Props) {
  const wadah = useRef<HTMLDivElement>(null);
  const [lebar, setLebar] = useState<number | null>(null); // null = belum di-hydrate: tampilkan versi statis
  const [pilihan, setPilihan] = useState<string | null>(null);
  const [kunciLalu, setKunciLalu] = useState(kunci);
  if (kunci !== kunciLalu) {
    setKunciLalu(kunci);
    setPilihan(null);
  }

  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLebar(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const arah: Arah = lebar !== null && lebar < lebarMendatar(data) ? "tegak" : "mendatar";
  const terpasang = lebar !== null;

  // React Flow membungkus setiap garis dengan <svg> yang tidak menerima atribut dari luar; sesudah garisnya aria-hidden,
  // Chromium menaruh svg kosong itu di pohon aksesibilitas sebagai "image" tanpa nama. Seluruh lapisan garis
  // (.react-flow__edges) disembunyikan dari pembaca layar; aria-hidden per garis (`edges` di bawah) tetap sebagai lapis cadangan.
  // React tidak mengelola atribut ini, jadi tidak terhapus saat render ulang; dipasang lagi setiap React Flow dipasang
  // ulang (arah atau kunci berganti). ukur-diagram.mjs gagal bila svg garis terbaca lagi.
  useLayoutEffect(() => {
    wadah.current?.querySelector(".react-flow__edges")?.setAttribute("aria-hidden", "true");
  }, [terpasang, arah, kunci]);
  const hasil = useMemo(() => tata(data, arah), [data, arah]);
  const teks = useMemo(() => deskripsi(data, judul), [data, judul]);
  const pesan = useMemo(() => varPesan(data) as CSSProperties, [data]);
  const pilih = (k: string) => setPilihan((p) => (p === k ? null : k));
  const idCatatan = `${id}-catatan`;

  const nodes: Node[] = [
    ...hasil.zona.map((z) => ({
      id: z.id,
      type: "zona",
      position: { x: z.x, y: z.y },
      width: z.lebar,
      height: z.tinggi,
      data: { label: z.label },
      className: "diagram__zona",
      selectable: false,
      focusable: false,
      zIndex: 0,
      // React Flow memberi setiap node aria-roledescription "node" (bahasa Inggris); nama zona dibaca dari teksnya.
      domAttributes: { "aria-roledescription": undefined },
    })),
    ...hasil.kotak.map((t) => ({
      id: t.id,
      type: "kotak",
      position: { x: t.x, y: t.y },
      width: UKURAN.lebar,
      height: UKURAN.tinggi,
      data: { t, arah, dipilih: pilihan === t.id, pilih, idCatatan },
      selectable: false,
      focusable: false,
      zIndex: 1,
      // Sama dengan zona: yang dibacakan adalah tombol di dalamnya ("App Flutter baru").
      domAttributes: { "aria-roledescription": undefined },
    })),
  ];
  const edges: Edge[] = hasil.panah.map((p) => ({
    id: p.id,
    source: p.dari,
    target: p.ke,
    type: "straight",
    focusable: false,
    selectable: false,
    // Bawaan React Flow: role="img" + aria-label "Edge from k-0-0 to k-0-1" (bahasa Inggris, berisi ID internal) untuk
    // setiap garis. Urutan panah sudah dibacakan di versi statis ("App Flutter ke Monolith API"), jadi garis
    // disembunyikan dari pembaca layar (keputusan 466).
    domAttributes: { "aria-hidden": true },
    markerEnd: { type: MarkerType.ArrowClosed, color: "currentColor", width: 16, height: 16 },
  }));
  const terpilih = hasil.kotak.find((t) => t.id === pilihan);

  return (
    <figure className="diagram not-content" data-diagram={id} data-arah={lebar === null ? "statis" : arah} style={pesan}>
      {/* Satu sel grid: versi statis di atas wadah yang tingginya sudah dipesan; sesudah hydrate statis jadi sr-only. */}
      <div className="diagram__panggung">
      {/* Versi statis: terlihat sebelum JS, tetap ada untuk pembaca layar sesudahnya. */}
      <div role="img" aria-label={teks} className={lebar === null ? "diagram__statis" : "diagram__statis sr-only"}>
        {data.baris.map((b, r) => (
          <ol key={r} className="diagram__statis-baris" aria-hidden="true">
            {b.map((k, i) => (
              <li key={i} className={`is-${k.baru ? "baru" : k.berubah ? "berubah" : "lama"}${k.lepas ? " is-lepas" : ""}`}>
                {k.label}
              </li>
            ))}
          </ol>
        ))}
      </div>
      <div ref={wadah} className="diagram__wadah">
        {lebar !== null && (
          <ReactFlow
            key={`${arah}-${kunci}`}
            id={id}
            // React Flow memasang role="application" tanpa nama, padahal WAI-ARIA 1.2 mewajibkan nama untuk role itu
            // (tinjauan #274, keputusan 682); role-nya tidak bisa diganti lewat props, namanya bisa.
            aria-label={`${judul}, kotak bisa dipilih`}
            nodes={nodes}
            edges={edges}
            nodeTypes={jenisNode}
            fitView
            fitViewOptions={{ padding: 0.04, maxZoom: 1, minZoom: 0.5 }}
            minZoom={0.5}
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
      <div id={idCatatan} className="diagram__catatan" aria-live="polite">
        {terpilih ? (
          <p>
            <strong>{terpilih.kotak.label}.</strong> {terpilih.kotak.catatan ?? KALIMAT_STATUS[terpilih.status]}
          </p>
        ) : lebar !== null ? (
          <p className="diagram__petunjuk">Pilih kotak untuk membaca catatannya.</p>
        ) : null}
      </div>
      {data.caption && <figcaption>{data.caption}</figcaption>}
    </figure>
  );
}
