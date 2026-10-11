/* Logika murni widget alur (pola skenario bertahap). Tanpa DOM.
 * Dipakai di browser (BB.alurCore), di tes (node --test), dan validasi build (tools/validasi_skenario.mjs).
 *
 * Format v2:
 *   versi: 2, judul, pengantar?, sumber: { jenis: "rekaman" | "ilustrasi", file?, fileVarian?, catatan? }
 *   komponen:  [{ id, label, lapisan?: ["handler", ...] }]
 *   perangkat: [{ id, label }]                  (opsional; bawaan satu perangkat "hp")
 *   layarAwal: { <id perangkat>: Layar }        (format Layar: hp.js)
 *   predict?:  { q, options, answer, explain, varian? }
 *   langkah:   [{ dari, ke?, lapisan?, judul, kirim, jelas, nada?, layar?: { <id perangkat>: Layar } }]
 *   varian?:   { label, mulai, langkah: [...] }  (ganti ekor jalur sejak indeks mulai)
 * Format v1 (a2-alur.json lama) diterjemahkan oleh normalize(): jalur → komponen k0..kN,
 * lapisan → komponen kedua, indeks dari/ke → id, hp/hpAwal → layar.hp/layarAwal.hp.
 */
(function (root) {
  "use strict";

  var MAKS_LANGKAH = 10;
  var NADA = ["warn", "good"];

  function v1Step(st, ids) {
    var out = {};
    Object.keys(st).forEach(function (k) { if (k !== "hp") out[k] = st[k]; });
    // Indeks di luar jalur tetap dibawa sebagai "#n", supaya validate() melaporkannya (bukan diam-diam hilang).
    var ref = function (j) { return ids[j] !== undefined ? ids[j] : "#" + j; };
    out.dari = ref(st.dari);
    if (st.ke != null) out.ke = ref(st.ke);
    if (st.hp) out.layar = { hp: st.hp };
    return out;
  }

  function normalize(d) {
    if (d.versi === 2) {
      var c = JSON.parse(JSON.stringify(d));
      if (!c.perangkat || !c.perangkat.length) c.perangkat = [{ id: "hp", label: "HP" }];
      c.layarAwal = c.layarAwal || {};
      return c;
    }
    var ids = d.jalur.map(function (_, j) { return "k" + j; });
    var v2 = {
      versi: 2, judul: d.judul, pengantar: d.pengantar,
      komponen: d.jalur.map(function (label, j) {
        var k = { id: ids[j], label: label };
        if (d.lapisan && j === 1) k.lapisan = d.lapisan.slice();  // perilaku v1: lapisan di jalur kedua
        return k;
      }),
      perangkat: [{ id: "hp", label: "HP" }],
      layarAwal: d.hpAwal ? { hp: d.hpAwal } : {},
      langkah: d.langkah.map(function (st) { return v1Step(st, ids); })
    };
    if (d.predict) v2.predict = d.predict;
    if (d.sumber) v2.sumber = d.sumber;
    if (d.varian) v2.varian = { label: d.varian.label, mulai: d.varian.mulai,
      langkah: d.varian.langkah.map(function (st) { return v1Step(st, ids); }) };
    return v2;
  }

  function steps(d, varianOn) {
    if (!varianOn || !d.varian) return d.langkah.slice();
    return d.langkah.slice(0, d.varian.mulai).concat(d.varian.langkah);
  }

  // Layar perangkat yang berlaku setelah langkah ke-i (0-based): layar terakhir yang ditetapkan, atau layar awal.
  function layarAt(d, list, i, perangkatId) {
    for (var k = i; k >= 0; k--) if (list[k] && list[k].layar && list[k].layar[perangkatId]) return list[k].layar[perangkatId];
    return (d.layarAwal && d.layarAwal[perangkatId]) || null;
  }

  function indexOf(d, id) {
    for (var j = 0; j < d.komponen.length; j++) if (d.komponen[j].id === id) return j;
    return -1;
  }

  // Tetangga tujuan b di sisi asal a. Paket pindah diam di antara b dan tetangga ini: untuk komponen
  // bersebelahan itu titik tengah a dan b; untuk lompatan (jarak >= 2) paket tidak berhenti di komponen tengah.
  function sisiAsal(a, b) { return b + (a > b ? 1 : a < b ? -1 : 0); }

  // Posisi paket dalam persen lebar jalur: tengah komponen (langkah lokal), atau setengah lajur dari tujuan ke arah asal.
  function packetPos(d, st) {
    var n = d.komponen.length;
    var center = function (j) { return (j + 0.5) * 100 / n; };
    var a = indexOf(d, st.dari);
    if (st.ke == null) return center(a);
    var b = indexOf(d, st.ke);
    return (center(b) + center(sisiAsal(a, b))) / 2;
  }

  // Komponen pemilik lapisan yang disorot: dari dulu, lalu ke.
  function pemilikLapisan(d, st) {
    if (!st || !st.lapisan) return null;
    var cand = [st.dari, st.ke].filter(function (x) { return x != null; });
    for (var k = 0; k < cand.length; k++) {
      var j = indexOf(d, cand[k]);
      if (j >= 0 && (d.komponen[j].lapisan || []).indexOf(st.lapisan) >= 0) return cand[k];
    }
    return null;
  }

  // Validasi skema. opts.exists(path) dipakai untuk mengecek file rekaman (opsional).
  function validate(d, opts) {
    var err = [];
    var isi = function (s) { return typeof s === "string" && s.trim().length > 0; };
    if (!isi(d.judul)) err.push("judul kosong");
    if (!d.komponen || !d.komponen.length) { err.push("komponen kosong"); return err; }
    var kid = {};
    d.komponen.forEach(function (k, j) {
      if (!isi(k.id)) err.push("komponen #" + (j + 1) + ": id kosong");
      else if (kid[k.id]) err.push("komponen: id ganda " + k.id);
      kid[k.id] = true;
      if (!isi(k.label)) err.push("komponen " + k.id + ": label kosong");
    });
    var pid = {};
    (d.perangkat || []).forEach(function (p) {
      if (pid[p.id]) err.push("perangkat: id ganda " + p.id);
      pid[p.id] = true;
    });
    var cekLayar = function (layar, where) {
      Object.keys(layar || {}).forEach(function (p) { if (!pid[p]) err.push(where + ": perangkat tidak dikenal '" + p + "'"); });
    };
    cekLayar(d.layarAwal, "layarAwal");
    var cekStep = function (st, where) {
      if (!kid[st.dari]) err.push(where + ": dari tidak dikenal '" + st.dari + "'");
      if (st.ke != null) {
        if (!kid[st.ke]) err.push(where + ": ke tidak dikenal '" + st.ke + "'");
        else if (st.ke === st.dari) err.push(where + ": ke sama dengan dari");
      }
      if (st.lapisan && !pemilikLapisan(d, st)) err.push(where + ": lapisan '" + st.lapisan + "' bukan milik komponen dari/ke");
      if (!isi(st.judul)) err.push(where + ": judul (narasi) kosong");
      if (!isi(st.jelas)) err.push(where + ": jelas (narasi) kosong");
      if (!isi(st.kirim)) err.push(where + ": kirim (data langkah) kosong");
      if (st.nada && NADA.indexOf(st.nada) < 0) err.push(where + ": nada tidak dikenal '" + st.nada + "'");
      cekLayar(st.layar, where);
    };
    (d.langkah || []).forEach(function (st, i) { cekStep(st, "langkah " + (i + 1)); });
    if (!d.langkah || !d.langkah.length) err.push("langkah kosong");
    else if (d.langkah.length > MAKS_LANGKAH) err.push("jalur utama " + d.langkah.length + " langkah (maks " + MAKS_LANGKAH + ")");
    if (d.varian) {
      var v = d.varian;
      if (!isi(v.label)) err.push("varian: label kosong");
      if (!(v.mulai >= 0 && v.mulai <= (d.langkah || []).length && v.mulai % 1 === 0)) err.push("varian: mulai di luar jalur utama");
      if (!v.langkah || !v.langkah.length) err.push("varian: langkah kosong");
      (v.langkah || []).forEach(function (st, i) { cekStep(st, "varian langkah " + (v.mulai + i + 1)); });
      if (steps(d, true).length > MAKS_LANGKAH) err.push("jalur varian " + steps(d, true).length + " langkah (maks " + MAKS_LANGKAH + ")");
    }
    if (d.predict) {
      var p = d.predict;
      if (!isi(p.q) || !p.options || p.options.length < 2) err.push("predict: pertanyaan atau pilihan kurang");
      else if (!(p.answer >= 0 && p.answer < p.options.length)) err.push("predict: answer di luar pilihan");
      if (p.varian && !d.varian) err.push("predict.varian tanpa varian");
    }
    if (!d.sumber) err.push("sumber wajib: { jenis: 'rekaman' | 'ilustrasi' } (label di kepala widget)");
    else {
      if (["rekaman", "ilustrasi"].indexOf(d.sumber.jenis) < 0) err.push("sumber: jenis harus 'rekaman' atau 'ilustrasi'");
      if (d.sumber.jenis === "rekaman") {
        if (!isi(d.sumber.file)) err.push("sumber rekaman tanpa file");
        else if (opts && opts.exists && !opts.exists(d.sumber.file)) err.push("sumber: file rekaman tidak ada: " + d.sumber.file);
        if (d.sumber.fileVarian && opts && opts.exists && !opts.exists(d.sumber.fileVarian)) err.push("sumber: file rekaman varian tidak ada: " + d.sumber.fileVarian);
      }
    }
    return err;
  }

  var api = { normalize: normalize, validate: validate, steps: steps, layarAt: layarAt,
    packetPos: packetPos, sisiAsal: sisiAsal, pemilikLapisan: pemilikLapisan, indexOf: indexOf, MAKS_LANGKAH: MAKS_LANGKAH };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else (root.BB = root.BB || {}).alurCore = api;
})(this);
