// Widget ERD bertumbuh (I6-erd, keputusan 460–465) di atas React Flow, data dari situs/data/erd/tahap-<n>.json.
// - Satu tabel = satu node (nama, kolom, label kunci berupa teks); satu foreign key = satu edge.
// - Pemilih tahap dan mode "bandingkan": tahap sebelumnya di kiri (yang dihapus ditandai), tahap ini di kanan;
//   di HP keduanya bertumpuk. Status baru/berubah/tetap/dihapus berupa teks di node dan warna token.
// - Node adalah tombol: klik atau Enter membuka kolom lengkap dan halaman yang menjelaskannya di bawah diagram.
// - Diagram tidak bisa digeser atau di-zoom dan tidak menangkap scroll; zoom selalu 1 kecuali tata terlalu lebar.
// - Versi statis (daftar tabel dan kolom) terlihat sebelum JS dan tanpa JS, dan tetap ada untuk pembaca layar.
//   Tinggi wadah dipesan sejak SSR (varPesan), jadi hydrate tidak menggeser halaman. Halaman dengan satu tahap boleh
//   mengirim versi statisnya sendiri lewat children (ErdHalaman.astro: Erd.astro, keputusan 697).
// - Bawaan React Flow yang tidak berguna bagi pembaca layar disembunyikan: garis dan lapisan svg-nya aria-hidden,
//   node tanpa "node", pembungkus application bernama; tombol tabel menerima klik dan tap (keputusan 466, 698, 699).
// - Berganti tahap atau mode = gerak masuk singkat (gerak/muncul.ts); reduced motion tanpa gerak.
// Dimuat hanya di halaman yang memakainya, dengan client:visible.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BaseEdge, Handle, MarkerType, Position, ReactFlow, type Edge, type EdgeProps, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import "./erd-tumbuh.css";
import type { DataErd, ModulErd } from "./skema";
import { ringkasCek, ringkasIndex } from "./erd";
import { muncul } from "../gerak/muncul";
import {
  LABEL_STATUS, UKURAN, ambangKolom, barisPindah, bisaBanding, duaBaris, duaKepala, modulTabel, namaTombol, ringkasan, ringkasModul, tampilSebelum, tampilTahap, tata, teksAturan,
  teksKolom, teksPindah, varPesan,
  type TabelTampil, type Tata, type TautanTahap,
} from "./tumbuh";

type Sisi = "satu" | "kiri" | "kanan";
type Panel = { sisi: Sisi; tahap: number; tabel: TabelTampil[]; judul: string };
type DataNode = { t: TabelTampil; dipilih: boolean; pilih: () => void; idDetail: string; acuan: number };

const HANDLE: [string, "source" | "target", Position, CSSProperties?][] = [
  ["atas", "source", Position.Top],
  ["bawah", "target", Position.Bottom],
  ["kiri-keluar", "source", Position.Left, { top: UKURAN.keluarY }],
  ["kiri-masuk", "target", Position.Left, { top: UKURAN.masukY }],
  ["kanan-keluar", "source", Position.Right, { top: UKURAN.keluarY }],
  ["kanan-masuk", "target", Position.Right, { top: UKURAN.masukY }],
];

function NodeTabel({ data }: NodeProps<Node<DataNode>>) {
  const { t, dipilih, pilih, idDetail, acuan } = data;
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
        <span className={`erd-tumbuh__kepala${duaKepala(t, acuan) ? " is-dua" : ""}`}>
          <code translate="no">{t.nama}</code>
          {t.status && <span className="erd-tumbuh__status">{LABEL_STATUS[t.status]}</span>}
        </span>
        {t.bayangan ? (
          // Tinggi node memesan baris sebanyak barisPindah(), jadi kalimat tidak terpotong (keputusan 466).
          <span className="erd-tumbuh__pindah" style={{ WebkitLineClamp: barisPindah(t) }}>
            {teksPindah(t)}
          </span>
        ) : (
          t.kolom.map((k) => (
            <span key={k.kolom.nama} className={`erd-tumbuh__baris is-${k.status ?? "awal"}${duaBaris(k, t, acuan) ? " is-dua" : ""}`}>
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

function Statis({ panel, tautan, modul }: { panel: Panel; tautan: TautanTahap; modul?: ModulErd }) {
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
            {!t.bayangan && modulTabel(modul, t.nama) && `, modul ${modulTabel(modul, t.nama)}`}
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

function Detail({ t, panel, tautan, sebelum, no, modul }: { t: TabelTampil; panel: Panel; tautan: TautanTahap; sebelum: number | null; no: number; modul: string | null }) {
  // Tabel yang dihapus dijelaskan di halaman tahap tempat ia masih ada.
  const asal = t.status === "dihapus" && t.bayangan && sebelum ? sebelum : panel.tahap;
  const halaman = tautan[asal]?.[t.nama] ?? [];
  return (
    <>
      <p className="erd-tumbuh__detail-judul">
        <code translate="no">{t.nama}</code> · Tahap {asal}
        {t.status && ` · ${LABEL_STATUS[t.status]}`}
      </p>
      {modul && !t.bayangan && (
        <p>
          Modul: <strong>{modul}</strong>.
        </p>
      )}
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

type Props = {
  id: string;
  judul: string;
  data: DataErd[];
  tautan: TautanTahap;
  awal: number;
  uji?: number[];
  /** Pembagian modul per tahap (ERD4); tahap tanpa entri tidak menampilkan pembagian modul. */
  modul?: ModulErd[];
  /** Versi statis dari halaman (Erd.astro) menggantikan daftar bawaan; hanya untuk satu tahap, karena tidak mengikuti
   * tahap atau mode yang dipilih. */
  children?: ReactNode;
};

export default function ErdTumbuh({ id, judul, data, tautan, awal, uji = [], modul = [], children }: Props) {
  if (children && data.length > 1) throw new Error(`ErdTumbuh ${id}: versi statis dari halaman hanya untuk satu tahap`);
  const panggung = useRef<HTMLDivElement>(null);
  const [lebar, setLebar] = useState<number | null>(null); // null = belum di-hydrate: versi statis
  const [no, setNo] = useState(awal);
  const [mauBanding, setBanding] = useState(false);
  const [pilihan, setPilihan] = useState<{ sisi: Sisi; nama: string } | null>(null);
  const diubah = useRef(false);
  const detail = useRef<HTMLDivElement>(null);
  const dibuka = useRef(false);
  const banding = mauBanding && bisaBanding(data, no);
  const sebelum = data.find((d) => d.tahap === no)?.selisih?.terhadap ?? null;
  const modulNo = modul.find((m) => m.tahap === no);

  useEffect(() => {
    const el = panggung.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLebar(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // React Flow membungkus setiap garis dengan <svg> yang tidak menerima atribut dari luar; sesudah garisnya aria-hidden,
  // Chromium membacakan svg kosong itu sebagai "image" tanpa nama (temuan #274: 11 dari 12 di /uji/erd/). Seluruh
  // lapisan garis disembunyikan (pola keputusan 680). Efek tanpa daftar dependensi: React Flow dipasang ulang setiap
  // kunci panel berganti (tahap, mode, bentuk, lebar), dan atribut yang tidak dikelola React tidak ikut terhapus.
  // ukur-erd.mjs gagal bila svg garis terbaca lagi (keputusan 698).
  useLayoutEffect(() => {
    for (const el of panggung.current?.querySelectorAll(".react-flow__edges") ?? []) el.setAttribute("aria-hidden", "true");
  });

  // Gerak masuk hanya sesudah pembaca memilih tahap atau mode, tidak saat dimuat.
  useLayoutEffect(() => {
    if (!diubah.current) return;
    diubah.current = false;
    muncul(panggung.current);
  }, [no, banding]);

  // Detail ada di bawah diagram, bisa ribuan piksel di bawah node yang dipilih (HP: ±2.200 px). Sesudah tabel dipilih,
  // detail digulir ke layar supaya klik terlihat hasilnya; fokus tetap di node (keputusan 467). Reduced motion: tanpa
  // gulir halus.
  useEffect(() => {
    if (!dibuka.current) return;
    dibuka.current = false;
    const halus = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    detail.current?.scrollIntoView({ block: "nearest", behavior: halus ? "smooth" : "auto" });
  }, [pilihan]);

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
  // Bandingkan berdampingan bila setiap sisi muat tata dua kolom (ambangKolom(2), 572 px) pada zoom ≥ 0,85 (desktop);
  // selain itu bertumpuk dengan zoom 1. Di 1366 px sisi selebar ±497 px: Tahap 1 dan 2 zoom ±0,87. Pengecualian yang
  // diterima (keputusan 964): tata Tahap 3 dua kolom 620 px karena 20 foreign key, jadi sisi kanan zoom ±0,80 (teks
  // kunci ±9,6 px); bertumpuk di desktop menolak syarat naskah 3b (Tahap 2 di kiri, Tahap 3 di kanan). Tahap 3 tunggal zoom 1.
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
      {/* Satu tahap (1.12): tanpa pemilih, karena satu tombol yang selalu tertekan tidak memilih apa pun (keputusan 697). */}
      {/* Sebelum hydrate tombol tersembunyi tetapi menempati ruangnya (tanpa JavaScript tidak tampil, erd-tumbuh.css), karena tombol yang tidak berfungsi tidak boleh terlihat. */}
      {data.length > 1 && (
        <div className={`erd-tumbuh__kontrol${lebar === null ? " is-belum" : ""}`}>
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
      )}
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
          {children ?? panel.map((p) => <Statis key={p.sisi} panel={p} tautan={tautan} modul={p.sisi === "kiri" ? modul.find((m) => m.tahap === p.tahap) : modulNo} />)}
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
                    data: {
                      t,
                      dipilih,
                      idDetail,
                      // Lebar node yang dipakai tata untuk memutuskan label kunci satu baris atau dua (tumbuh.ts, METRIK).
                      acuan: h.bentuk === "sempit" ? UKURAN.lebarMin : UKURAN.lebar,
                      pilih: () => {
                        dibuka.current = !dipilih;
                        setPilihan(dipilih ? null : { sisi: p.sisi, nama: n.nama });
                      },
                    },
                    selectable: false,
                    focusable: false,
                    // React Flow memberi "node" berbahasa Inggris; nama yang dibacakan ada di tombol (keputusan 466).
                    domAttributes: { "aria-roledescription": undefined },
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
                  // Bawaan React Flow: role="img" + "Edge from X to Y" (bahasa Inggris) untuk setiap garis. Foreign key
                  // sudah dibacakan per kolom di versi statis ("FK → akun.id"), jadi garis disembunyikan dari pembaca
                  // layar (keputusan 466).
                  domAttributes: { "aria-hidden": true },
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
                      // React Flow memasang role="application" tanpa nama, padahal WAI-ARIA 1.2 mewajibkan nama untuk
                      // role itu; role-nya tidak bisa diganti lewat props, namanya bisa (pola keputusan 682, 699).
                      aria-label={`${panel.length === 2 ? p.judul : judul}, tabel bisa dipilih`}
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
      <div id={idDetail} ref={detail} className="erd-tumbuh__detail">
        {tabelTerpilih && terpilih ? (
          <Detail t={tabelTerpilih} panel={terpilih} tautan={tautan} sebelum={sebelum} no={no} modul={modulTabel(modul.find((m) => m.tahap === terpilih.tahap), tabelTerpilih.nama)} />
        ) : (
          // Sebelum hydrate petunjuk sudah menempati ruangnya (tersembunyi), supaya hydrate tidak menggeser isi di bawah
          // diagram di HP, tempat petunjuk dua baris; tanpa JS tidak tampil (erd-tumbuh.css).
          <p className={`erd-tumbuh__petunjuk${lebar === null ? " is-belum" : ""}`}>Pilih tabel untuk membaca kolom lengkap dan halaman yang menjelaskannya.</p>
        )}
      </div>
      {modulNo && (
        <div className="erd-tumbuh__modul">
          <table>
            <caption>
              <strong>Pembagian modul Tahap {no}</strong> <span className="bb-chip is-system">Rekaman lab · pembagian modul</span>
              <br />
              {ringkasModul(modulNo)}
            </caption>
            <thead>
              <tr>
                <th scope="col">Modul</th>
                <th scope="col">Jumlah</th>
                <th scope="col">Tabel</th>
              </tr>
            </thead>
            <tbody>
              {modulNo.modul.map((x) => (
                <tr key={x.nama}>
                  <th scope="row">
                    <code translate="no">{x.nama}</code>
                  </th>
                  <td>{x.tabel.length}</td>
                  <td>
                    {x.tabel.map((n, i) => (
                      <span key={n}>
                        {i > 0 && ", "}
                        <code translate="no">{n}</code>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p role="status" className="sr-only">
        {tabelTerpilih ? `Detail tabel ${tabelTerpilih.nama} terbuka di bawah diagram.` : ""}
      </p>
    </figure>
  );
}
