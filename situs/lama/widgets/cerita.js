/* Widget cerita Rekeningo: blok "Kamu di sini" dan diagram arsitektur tahap.
 *
 * Pakai di Markdown:
 *   <div data-bb="kamu-di-sini" data-tahap="2"></div>   paling atas halaman
 *   <div data-bb="arsitektur" data-tahap="2"></div>     langsung di bawah Inti
 *
 *   <div data-bb="peta-cerita"></div> · <div data-bb="indeks-masalah"></div>   halaman Peta cerita
 *
 * Data: widgets/data/cerita.json (satu-satunya sumber; juga dipakai Peta cerita).
 */
(function () {
  "use strict";
  var BB = window.BB;
  var cerita = null;

  function load() {
    if (!cerita) cerita = BB.fetchJSON("data/cerita.json");
    return cerita;
  }

  function tahapOf(host) {
    return load().then(function (d) {
      var no = Number(host.dataset.tahap);
      var t = d.tahap.filter(function (x) { return x.no === no; })[0];
      if (!t) throw new Error("tahap " + no + " tidak ada di cerita.json");
      return { d: d, t: t };
    });
  }

  BB.mounts["kamu-di-sini"] = function (host) {
    tahapOf(host).then(function (r) {
      var d = r.d, t = r.t;
      var box = BB.el("details", { class: "bb-here" }, [
        BB.el("summary", null, [
          BB.el("span", { class: "bb-here__tag", text: "Kamu di sini" }),
          BB.el("strong", { text: " Tahap " + t.no + " dari " + d.tahap.length }),
          BB.el("span", { class: "bb-here__long", text: " · " + t.user + " · " + t.nama })
        ]),
        BB.el("p", { class: "bb-here__body" }, [
          BB.el("strong", { text: d.app + " (fiktif). " }), t.rekap + " ",
          BB.el("span", { class: "bb-muted", text: "Sebelumnya: " + t.sebelumnya })
        ])
      ]);
      // Layar lebar: terbuka. Layar sempit (< 44em): satu baris yang bisa dibuka.
      try { if (window.matchMedia("(min-width: 44em)").matches) box.open = true; } catch (e) { box.open = true; }
      host.appendChild(box);
    }).catch(function (e) { host.textContent = "Blok cerita gagal dimuat: " + e.message; });
  };

  BB.mounts.arsitektur = function (host) {
    // Sudah dirender saat build (WidgetLama.astro, keputusan 263): tidak diisi ulang, supaya tidak ada yang bergeser.
    if (host.querySelector(".bb-arch")) return;
    tahapOf(host).then(function (r) {
      var a = r.t.arsitektur;
      var semua = [];
      var fig = BB.el("figure", { class: "bb-fig bb-arch", role: "img" });
      a.baris.forEach(function (baris) {
        var ol = BB.el("ol", { class: "bb-flow bb-flow--plain" });
        baris.forEach(function (n) {
          semua.push(n.label + (n.catatan ? " (" + n.catatan + ")" : ""));
          // Catatan perubahan ada di caption, supaya kotak tetap satu baris dan diagram muat di layar pertama.
          // lepas: tidak ada panah ke kotak sesudahnya (dua komponen yang tidak saling memanggil di satu baris)
          ol.appendChild(BB.el("li", { class: (n.baru || n.berubah ? "is-new" : "is-old") + (n.lepas ? " is-lepas" : ""), title: n.catatan || "" }, [n.label]));
        });
        fig.appendChild(ol);
      });
      fig.setAttribute("aria-label", "Arsitektur Tahap " + r.t.no + ": " + semua.join(", ") + ".");
      fig.appendChild(BB.el("figcaption", { text: a.caption }));
      host.appendChild(fig);
    }).catch(function (e) { host.textContent = "Diagram gagal dimuat: " + e.message; });
  };

  /* ---- Peta cerita: enam tahap (Tahap 6 proyeksi), arsitektur yang berkembang, status halaman, indeks masalah ---- */
  // Status "selesai" dari BB.halamanSelesai (DataSelesai.astro, keputusan 320): penanda "Tandai selesai" halaman
  // versi lama (kunci selesai:<path>) atau semua blok halaman Tahap 1 selesai. Tanpa fungsi itu, hanya penanda lama.
  function siteRoot() { return BB.base.replace(/widgets\/$/, ""); }
  // a/b.md -> a/b/, a/index.md -> a/, index.md -> "" (URL MkDocs)
  function urlOf(h) {
    var p = h.path;
    return siteRoot() + (p === "index.md" || /\/index\.md$/.test(p) ? p.slice(0, -8) : p.slice(0, -3) + "/");
  }
  function selesai(h) {
    var p = new URL(urlOf(h), location.href).pathname;
    return BB.halamanSelesai ? BB.halamanSelesai(p) : !!BB.store.get("selesai:" + p);
  }

  function archFig(t) {
    var fig = BB.el("figure", { class: "bb-fig bb-arch bb-peta__arch", role: "img",
      "aria-label": "Arsitektur Tahap " + t.no });
    t.arsitektur.baris.forEach(function (baris) {
      var ol = BB.el("ol", { class: "bb-flow bb-flow--plain" });
      baris.forEach(function (n) { ol.appendChild(BB.el("li", { class: (n.baru || n.berubah ? "is-new" : "is-old") + (n.lepas ? " is-lepas" : "") }, [n.label])); });
      fig.appendChild(ol);
    });
    return fig;
  }

  // Label tampilan: nomor urut baca + judul. ID halaman (B3.1, ...) hanya kunci internal, tidak ditampilkan.
  function label(h) { return (h.nomor ? h.nomor + " " : "") + h.judul; }
  var BINTANG = "★";
  function tandaInti() {
    return BB.el("span", { class: "bb-inti", title: "Jalur inti: wajib dibaca" }, [
      BB.el("span", { "aria-hidden": "true", text: BINTANG }), BB.el("span", { class: "bb-sr", text: " (jalur inti)" })]);
  }
  function jalurInti(t) {
    var j = t.jalur_inti || {};
    return BINTANG + " jalur inti " + (j.halaman || 0) + " halaman, ±" + (j.menit || 0) + " menit";
  }

  BB.mounts["peta-cerita"] = function (host) {
    // Tunggu DOMContentLoaded juga: cerita.json bisa tiba sebelum skrip modul DataSelesai memasang BB.halamanSelesai,
    // dan peta tidak dirender ulang (keputusan 320).
    Promise.all([load(), BB.domSiap]).then(function (x) {
      var d = x[0];
      var wrap = BB.el("div", { class: "bb-peta" });
      d.tahap.forEach(function (t) {
        var hs = d.halaman.filter(function (h) { return h.tahap === t.no && !/^T\d/.test(h.id); });
        var ada = hs.filter(function (h) { return h.ada; });
        var done = ada.filter(selesai);
        var bar = BB.el("div", { class: "bb-peta__bar", role: "progressbar", "aria-valuemin": "0",
          "aria-valuemax": String(hs.length), "aria-valuenow": String(done.length),
          "aria-label": "Selesai dibaca Tahap " + t.no }, [BB.el("i", { style: "width:" + (hs.length ? 100 * done.length / hs.length : 0) + "%" })]);
        var ul = BB.el("ul", { class: "bb-peta__list" });
        var kel = null;
        hs.forEach(function (h) {
          if (h.kelompok && h.kelompok !== kel) {
            kel = h.kelompok;
            ul.appendChild(BB.el("li", { class: "bb-peta__kel", text: kel }));
          }
          var nama = label(h);
          var li = BB.el("li", { class: selesai(h) ? "is-done" : h.ada ? "" : "is-todo" });
          li.appendChild(h.ada ? BB.el("a", { href: urlOf(h), text: nama }) : BB.el("span", { text: nama }));
          if (h.inti) li.appendChild(tandaInti());
          // Halaman yang belum ditulis "segera"; halaman lama di slot naskah baru "versi lama" (keputusan 450).
          var lamaH = h.lama || h.lebur_ke || h.diganti_oleh;
          li.appendChild(BB.el("small", { text: selesai(h) ? " · selesai" : !h.ada ? " · segera" : lamaH ? " · versi lama" : "" }));
          ul.appendChild(li);
        });
        var tahapHal = d.halaman.filter(function (h) { return h.id === "T" + t.no; })[0];
        var judul = tahapHal && tahapHal.ada ? BB.el("a", { href: urlOf(tahapHal), text: "Tahap " + t.no + " · " + t.nama })
          : BB.el("span", { text: "Tahap " + t.no + " · " + t.nama });
        wrap.appendChild(BB.el("section", { class: "bb-peta__tahap" }, [
          BB.el("h3", null, [judul]),
          BB.el("p", { class: "bb-muted bb-peta__user", text: t.user + " · " + done.length + " dari " + hs.length + " halaman selesai · " + jalurInti(t) }),
          bar, archFig(t), BB.el("details", null, [BB.el("summary", { text: "Daftar halaman (" + ada.length + " ada)" }), ul])]));
      });
      // Tahap proyeksi (registry "proyeksi", Tahap 6): belum ada halaman dan diagram, jadi hanya skala dan PRD-nya.
      (d.proyeksi || []).forEach(function (t) {
        var prd = t.skala && t.skala.prd ? t.skala.prd.replace(/^PRD v\d+ \(proyeksi\): /, "") : "";
        wrap.appendChild(BB.el("section", { class: "bb-peta__tahap is-proyeksi" }, [
          BB.el("h3", null, [BB.el("span", { text: "Tahap " + t.no + " · " + t.nama })]),
          BB.el("p", { class: "bb-muted bb-peta__user", text: t.user + " · proyeksi, belum ditulis" }),
          prd ? BB.el("p", { class: "bb-peta__prd", text: "PRD v" + t.no + ": " + prd }) : null]));
      });
      host.appendChild(wrap);
    }).catch(function (e) { host.textContent = "Peta gagal dimuat: " + e.message; });
  };

  BB.mounts["indeks-masalah"] = function (host) {
    load().then(function (d) {
      var tbody = BB.el("tbody");
      d.halaman.filter(function (h) { return h.masalah; }).forEach(function (h) {
        var t = typeof h.tahap === "number" ? "Tahap " + h.tahap : h.tahap === "sampingan" ? "Sampingan" : "";
        tbody.appendChild(BB.el("tr", null, [
          BB.el("td", { text: h.masalah }),
          BB.el("td", null, [h.ada ? BB.el("a", { href: urlOf(h), text: label(h) }) : BB.el("span", { text: label(h) + " · segera" })]),
          BB.el("td", { text: t })]));
      });
      var cari = BB.el("input", { type: "search", class: "bb-input", placeholder: "Cari masalah, mis. lambat, dobel, saldo", "aria-label": "Cari masalah" });
      cari.addEventListener("input", function () {
        var q = cari.value.toLowerCase();
        tbody.querySelectorAll("tr").forEach(function (tr) { tr.hidden = q && tr.textContent.toLowerCase().indexOf(q) < 0; });
      });
      host.appendChild(cari);
      host.appendChild(BB.el("table", null, [BB.el("thead", null, [BB.el("tr", null, [
        BB.el("th", { text: "Masalah" }), BB.el("th", { text: "Halaman" }), BB.el("th", { text: "Tahap" })])]), tbody]));
    }).catch(function (e) { host.textContent = "Indeks gagal dimuat: " + e.message; });
  };

  /* ---- Sidebar: sub-judul kelompok (Tahap 1), penanda jalur inti, total waktu jalur inti per tahap ---- */
  function hiasSidebar() {
    var nav = document.querySelector(".md-sidebar--primary .md-nav--primary");
    if (!nav) return;
    load().then(function (d) {
      var byPath = {};
      d.halaman.forEach(function (h) { if (h.ada) byPath[new URL(urlOf(h), location.href).pathname] = h; });
      var kelTerakhir = {};
      nav.querySelectorAll("a.md-nav__link[href]").forEach(function (a) {
        var h = byPath[new URL(a.getAttribute("href"), location.href).pathname];
        var li = a.closest("li.md-nav__item");
        if (!h || !li || li.dataset.bbHias) return;
        li.dataset.bbHias = "1";
        if (h.inti && h.nomor) { a.classList.add("bb-nav-inti"); a.insertBefore(tandaInti(), a.firstChild); }
        if (h.kelompok && kelTerakhir[h.tahap] !== h.kelompok) {
          kelTerakhir[h.tahap] = h.kelompok;
          li.parentNode.insertBefore(BB.el("li", { class: "md-nav__item bb-nav-kel", "aria-hidden": "true", text: h.kelompok }), li);
        }
        if (/^T\d$/.test(h.id)) {
          var t = d.tahap.filter(function (x) { return "T" + x.no === h.id; })[0];
          if (t) li.parentNode.insertBefore(BB.el("li", { class: "md-nav__item bb-nav-info", text: jalurInti(t) }), li);
        }
      });
    }).catch(function () { /* sidebar tetap jalan tanpa hiasan */ });
  }

  hiasSidebar();
  BB.mountAll();
})();
