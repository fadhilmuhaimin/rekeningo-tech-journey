/* Inti widget: storage aman, penanda selesai, umpan balik per halaman.
 *
 * Kontrak: elemen dengan atribut data-bb="<nama>" diisi oleh fungsi di BB.mounts[nama].
 * Data per pembaca disimpan di localStorage dengan awalan "bb1:". Semua akses
 * dibungkus try/catch, jadi halaman tetap jalan walau storage diblokir.
 */
(function () {
  "use strict";

  var BB = (window.BB = window.BB || {});
  BB.mounts = BB.mounts || {};

  // Lokasi folder widgets/, dipakai untuk memuat data dan vendor relatif ke file ini.
  var me = document.currentScript && document.currentScript.src;
  BB.base = me ? me.replace(/core\.js(\?.*)?$/, "") : "/widgets/";

  BB.store = {
    get: function (key) {
      try { var v = localStorage.getItem("bb1:" + key); return v === null ? null : JSON.parse(v); }
      catch (e) { return null; }
    },
    set: function (key, value) {
      try { localStorage.setItem("bb1:" + key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) {
      try { localStorage.removeItem("bb1:" + key); } catch (e) { /* abaikan */ }
    },
    keys: function (prefix) {
      var out = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf("bb1:" + prefix) === 0) out.push(k.slice(4));
        }
      } catch (e) { /* abaikan */ }
      return out;
    }
  };

  BB.pageId = function () {
    return location.pathname.replace(/index\.html$/, "");
  };

  BB.el = function (tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) {
      if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  };

  // Satu kali coba ulang untuk gangguan jaringan sesaat (mis. server dev sedang rebuild).
  // Rupiah: 1080000 -> "Rp1.080.000". Data uang disimpan sebagai integer rupiah.
  BB.rp = function (n) {
    var v = Number(n), s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (v < 0 ? "-" : "") + "Rp" + s;
  };

  BB.fetchJSON = function (path) {
    function once() {
      return fetch(BB.base + path).then(function (r) {
        if (!r.ok) throw new Error(path + ": HTTP " + r.status);
        return r.json();
      });
    }
    return once().catch(function (e) {
      if (/HTTP \d/.test(e.message)) throw e;
      return new Promise(function (res) { setTimeout(res, 600); }).then(once);
    });
  };

  /* Label sumber di kepala widget skenario: "Rekaman lab" atau "Ilustrasi". */
  BB.SUMBER = { rekaman: "Rekaman lab", ilustrasi: "Ilustrasi" };
  BB.sumberChip = function (sumber) {
    var j = sumber && sumber.jenis;
    if (!BB.SUMBER[j]) return null;
    return BB.el("span", { class: "bb-chip bb-sumber" + (j === "rekaman" ? " is-system" : ""),
      title: sumber.catatan || sumber.file || "", text: BB.SUMBER[j] });
  };

  /* Tebak dulu sebelum melihat hasil. onPick dipanggil sekali dengan indeks pilihan. */
  BB.predict = function (cfg, onPick) {
    var box = BB.el("div", { class: "bb-predict", role: "group", "aria-label": "Tebak dulu" });
    box.appendChild(BB.el("p", { class: "bb-predict__q" }, [BB.el("strong", { text: "Tebak dulu: " }), cfg.q]));
    var row = BB.el("div", { class: "bb-predict__opts" });
    var picked = null;
    cfg.options.forEach(function (opt, i) {
      var b = BB.el("button", { type: "button", class: "bb-btn bb-btn--opt", text: opt, onclick: function () {
        if (picked !== null) return;
        picked = i;
        b.classList.add("is-picked");
        row.querySelectorAll("button").forEach(function (x) { x.disabled = true; });
        onPick(i);
      } });
      row.appendChild(b);
    });
    box.appendChild(row);
    box.reveal = function (correctIndex, explain) {
      var ok = picked === correctIndex;
      var msg = picked === null ? "" : ok ? "Tebakanmu benar. " : "Tebakanmu meleset, dan itu justru bagian paling berguna. ";
      box.appendChild(BB.el("p", { class: "bb-predict__a " + (ok ? "is-good" : "is-warn"), role: "status" },
        [msg + (explain || "")]));
    };
    return box;
  };

  /* ---- Penanda selesai ------------------------------------------------------- */
  BB.mounts.selesai = function (host) {
    var key = "selesai:" + BB.pageId();
    var input = BB.el("input", { type: "checkbox", id: "bb-selesai" });
    input.checked = !!BB.store.get(key);
    input.addEventListener("change", function () {
      if (input.checked) BB.store.set(key, { waktu: new Date().toISOString(), judul: document.title });
      else BB.store.remove(key);
    });
    var label = BB.el("label", { class: "bb-selesai", for: "bb-selesai" }, [input, BB.el("span", { class: "bb-selesai__kata", text: " Tandai" }), " selesai"]);
    // Kalau tepat di bawah baris meta, gabungkan ke baris itu supaya layar pertama tidak terpakai.
    var meta = host.previousElementSibling;
    if (meta && meta.classList.contains("meta")) {
      meta.appendChild(document.createTextNode(" · "));
      meta.appendChild(label);
      host.hidden = true;
    } else {
      host.appendChild(label);
    }
  };

  /* ---- Umpan balik per halaman ----------------------------------------------- */
  var NILAI = [["berat", "Terlalu berat"], ["pas", "Pas"], ["ringan", "Terlalu ringan"]];

  BB.mounts["umpan-balik"] = function (host) {
    var key = "fb:" + BB.pageId();
    var saved = BB.store.get(key);
    var status = BB.el("span", { class: "bb-fb__status", role: "status" });
    var row = BB.el("div", { class: "bb-fb__opts" });
    function paint(v) {
      row.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("aria-pressed", b.dataset.v === v ? "true" : "false");
      });
      status.textContent = v ? "Tersimpan di browser ini." : "";
    }
    NILAI.forEach(function (n) {
      var b = BB.el("button", { type: "button", class: "bb-btn", "data-v": n[0], text: n[1], onclick: function () {
        var ok = BB.store.set(key, { nilai: n[0], waktu: new Date().toISOString(), judul: document.title });
        paint(n[0]);
        if (!ok) status.textContent = "Browser ini tidak mengizinkan penyimpanan.";
      } });
      row.appendChild(b);
    });
    host.appendChild(BB.el("div", { class: "bb-fb" }, [
      BB.el("p", { class: "bb-fb__q", text: "Halaman ini terasa:" }), row, status]));
    paint(saved && saved.nilai);
  };

  /* ---- Halaman Umpan balik: tampilkan + ekspor ------------------------------- */
  BB.mounts["umpan-balik-data"] = function (host) {
    function rows() {
      return BB.store.keys("fb:").map(function (k) {
        var v = BB.store.get(k) || {};
        return { halaman: k.slice(3), judul: v.judul || "", nilai: v.nilai || "", waktu: v.waktu || "" };
      }).sort(function (a, b) { return a.waktu < b.waktu ? 1 : -1; });
    }
    function download(name, type, text) {
      var a = BB.el("a", { href: URL.createObjectURL(new Blob([text], { type: type })), download: name });
      document.body.appendChild(a); a.click(); a.remove();
    }
    function csvCell(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }
    function render() {
      host.innerHTML = "";
      var data = rows();
      var label = {}; NILAI.forEach(function (n) { label[n[0]] = n[1]; });
      var count = { berat: 0, pas: 0, ringan: 0 };
      data.forEach(function (r) { if (r.nilai in count) count[r.nilai]++; });
      host.appendChild(BB.el("p", { class: "bb-fb-sum" }, [
        data.length + " halaman dinilai · " + count.berat + " terlalu berat · " + count.pas + " pas · " + count.ringan + " terlalu ringan"]));
      if (!data.length) {
        host.appendChild(BB.el("p", { text: "Belum ada data. Tombol penilaian ada di akhir setiap halaman materi." }));
        return;
      }
      var tbody = BB.el("tbody");
      data.forEach(function (r) {
        tbody.appendChild(BB.el("tr", null, [
          BB.el("td", null, [BB.el("a", { href: r.halaman, text: r.judul.replace(/ - .*$/, "") || r.halaman })]),
          BB.el("td", { text: label[r.nilai] || r.nilai }),
          BB.el("td", { text: r.waktu.slice(0, 16).replace("T", " ") })]));
      });
      host.appendChild(BB.el("table", null, [
        BB.el("thead", null, [BB.el("tr", null, [BB.el("th", { text: "Halaman" }), BB.el("th", { text: "Nilai" }), BB.el("th", { text: "Waktu (UTC)" })])]),
        tbody]));
      host.appendChild(BB.el("div", { class: "bb-row" }, [
        BB.el("button", { type: "button", class: "bb-btn", text: "Ekspor JSON", onclick: function () {
          download("umpan-balik.json", "application/json", JSON.stringify(data, null, 2));
        } }),
        BB.el("button", { type: "button", class: "bb-btn", text: "Ekspor CSV", onclick: function () {
          var lines = ["halaman,judul,nilai,waktu"].concat(data.map(function (r) {
            return [r.halaman, r.judul, r.nilai, r.waktu].map(csvCell).join(",");
          }));
          download("umpan-balik.csv", "text/csv", lines.join("\n"));
        } }),
        BB.el("button", { type: "button", class: "bb-btn bb-btn--quiet", text: "Hapus semua", onclick: function () {
          if (!confirm("Hapus semua penilaian di browser ini?")) return;
          BB.store.keys("fb:").forEach(BB.store.remove);
          render();
        } })]));
    }
    render();
  };

  function mountAll() {
    document.querySelectorAll("[data-bb]").forEach(function (host) {
      if (host.dataset.bbMounted) return;
      var fn = BB.mounts[host.dataset.bb];
      if (!fn) return;
      host.dataset.bbMounted = "1";
      try { fn(host); }
      catch (e) {
        host.textContent = "Widget gagal dimuat: " + e.message;
        if (window.console) console.error(e);
      }
    });
  }
  BB.mountAll = mountAll;
  // Setiap file widget memanggil BB.mountAll() di akhirnya, jadi widget dipasang saat halaman masih dibaca, sebelum
  // skrip modul berjalan. Widget yang memakai fungsi dari skrip modul (BB.halamanSelesai, DataSelesai.astro) menunggu
  // janji ini: skrip modul tanpa async dijalankan sebelum DOMContentLoaded (HTML Standard, "the end"), termasuk
  // modul yang diimpornya (keputusan 320).
  BB.domSiap = new Promise(function (r) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { r(); }, { once: true });
    else r();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountAll);
  else mountAll();
})();
