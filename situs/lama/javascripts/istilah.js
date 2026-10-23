/* Tooltip istilah: hover atau fokus pada istilah bergaris titik-titik menampilkan
 * ringkasan dari glosarium, dengan tautan "Lihat detail" ke bab yang membahasnya
 * (tab baru). Datanya dari istilah-data.js (dibuat tools/build_istilah.py).
 * Hanya kemunculan pertama per bagian (h2) yang ditandai, supaya teks tidak ramai. */
(function () {
  "use strict";

  function siteRoot() {
    var s = document.querySelector('script[src*="javascripts/istilah-data.js"]');
    return s ? s.src.replace(/javascripts\/istilah-data\.js.*$/, "") : "/";
  }

  var pop, hideTimer, showTimer, current, diam = false;

  function ensurePop() {
    if (pop) return pop;
    pop = document.createElement("div");
    pop.className = "istilah-pop";
    pop.id = "istilah-pop";
    pop.setAttribute("role", "tooltip");
    pop.hidden = true;
    pop.addEventListener("mouseenter", function () { clearTimeout(hideTimer); });
    pop.addEventListener("mouseleave", scheduleHide);
    pop.addEventListener("focusin", function () { clearTimeout(hideTimer); });
    pop.addEventListener("focusout", function (e) {
      if (!pop.contains(e.relatedTarget) && e.relatedTarget !== current) scheduleHide();
    });
    pop.addEventListener("keydown", popKey);
    document.body.appendChild(pop);
    return pop;
  }

  // Keyboard (keputusan 702): popover ada di akhir body, jadi urutan Tab bawaan tidak pernah sampai ke tautannya.
  // Tab dari istilah masuk ke tautan pertama; Tab dari tautan terakhir lanjut ke elemen sesudah istilah;
  // Shift+Tab dari tautan pertama kembali ke istilah; Esc menutup dan mengembalikan fokus ke istilah.
  function tautanPop() { return pop && !pop.hidden ? Array.prototype.slice.call(pop.querySelectorAll("a[href]")) : []; }

  function fokusDiam(node) { diam = true; node.focus(); diam = false; }

  function sesudah(node) {
    var semua = document.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]');
    for (var i = 0; i < semua.length; i++) {
      var x = semua[i];
      if (x === node || pop.contains(x) || x.tabIndex < 0 || x.closest("[inert]")) continue;
      if (!(node.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      if (x.checkVisibility ? !x.checkVisibility() : !x.getClientRects().length) continue;
      return x;
    }
    return null;
  }

  function popKey(e) {
    var t = tautanPop();
    if (e.key !== "Tab" || !current || !t.length) return;
    if (e.shiftKey && document.activeElement === t[0]) {
      e.preventDefault();
      fokusDiam(current);
    } else if (!e.shiftKey && document.activeElement === t[t.length - 1]) {
      e.preventDefault();
      var asal = current, lanjut = sesudah(asal);
      hide();
      if (lanjut) lanjut.focus(); else asal.blur();
    }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function fill(info, root) {
    var p = ensurePop();
    p.textContent = "";
    p.appendChild(el("div", "istilah-pop__term", info.t));
    p.appendChild(el("p", "istilah-pop__def", info.d));
    var links = el("div", "istilah-pop__links");
    var here = location.pathname.replace(/index\.html$/, "");
    if (info.u && !here.endsWith("/" + info.u)) {
      var a = el("a", "istilah-pop__detail", "Buka halaman " + (info.n || ""));
      a.href = root + info.u;
      a.target = "_blank";
      a.rel = "noopener";
      links.appendChild(a);
    }
    if (info.h && !here.endsWith("/" + info.h)) {
      // Halaman istilah sendiri (G-istilah, keputusan 689): delapan bagian, kalimat pertamanya sama dengan tooltip ini.
      var hi = el("a", "istilah-pop__detail", "Buka halaman istilah " + info.t);
      hi.href = root + info.h;
      hi.target = "_blank";
      hi.rel = "noopener";
      links.appendChild(hi);
    }
    var g = el("a", "istilah-pop__glos", "Glosarium");
    g.href = root + "alat/glosarium/#" + info.s;
    g.target = "_blank";
    g.rel = "noopener";
    links.appendChild(g);
    p.appendChild(links);
  }

  function place(target) {
    var p = pop, r = target.getBoundingClientRect();
    p.hidden = false;
    p.style.left = "0px";
    p.style.top = "0px";
    var w = p.offsetWidth, h = p.offsetHeight, gap = 8, vw = document.documentElement.clientWidth;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8);
    var below = r.bottom + gap + h < window.innerHeight || r.top - gap - h < 0;
    var top = below ? r.bottom + gap : r.top - gap - h;
    p.style.left = left + window.scrollX + "px";
    p.style.top = top + window.scrollY + "px";
    p.dataset.side = below ? "bottom" : "top";
  }

  function show(target, root) {
    clearTimeout(hideTimer);
    var info = window.ISTILAH[target.dataset.istilah];
    if (!info) return;
    if (current && current !== target) current.removeAttribute("aria-describedby");
    current = target;
    fill(info, root);
    place(target);
    target.setAttribute("aria-describedby", "istilah-pop");
  }

  function hide() {
    if (pop) pop.hidden = true;
    if (current) current.removeAttribute("aria-describedby");
    current = null;
  }

  function scheduleHide() {
    clearTimeout(showTimer);
    hideTimer = setTimeout(hide, 220);
  }

  function sectionOf(node) {
    // h2 terdekat sebelum node = batas "bagian"
    var n = node, article = node.closest("article");
    while (n && n !== article) {
      var prev = n.previousElementSibling;
      while (prev) {
        if (prev.tagName === "H2") return prev;
        var inner = prev.querySelectorAll ? prev.querySelectorAll("h2") : [];
        if (inner.length) return inner[inner.length - 1];
        prev = prev.previousElementSibling;
      }
      n = n.parentElement;
    }
    return article;
  }

  function init() {
    if (!window.ISTILAH) return;
    var root = siteRoot();
    var article = document.querySelector("article.md-content__inner");
    if (!article) return;
    var onGlossary = /\/alat\/glosarium\/?$/.test(location.pathname);

    if (onGlossary) {
      // id baris glosarium (#istilah-...) sudah statis dari plugin remark-glosarium (keputusan 687)
      if (location.hash) {
        var row = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (row) { row.classList.add("istilah-target"); row.scrollIntoView({ block: "center" }); }
      }
    }

    var seen = new Map();
    article.querySelectorAll("abbr[title]").forEach(function (ab) {
      var key = ab.textContent;
      var info = window.ISTILAH[key];
      var skip = !info || onGlossary || ab.closest("h1,h2,h3,h4,h5,h6,a,figcaption,.md-typeset__table th");
      var sec = skip ? null : sectionOf(ab);
      var done = sec && seen.get(sec);
      if (skip || (done && done.has(info.s))) {
        ab.replaceWith(document.createTextNode(key));
        return;
      }
      if (!done) { done = new Set(); seen.set(sec, done); }
      done.add(info.s);
      ab.removeAttribute("title");
      ab.dataset.istilah = key;
      ab.classList.add("istilah");
      ab.tabIndex = 0;
      ab.addEventListener("mouseenter", function () {
        clearTimeout(hideTimer);
        showTimer = setTimeout(function () { show(ab, root); }, 120);
      });
      ab.addEventListener("mouseleave", scheduleHide);
      ab.addEventListener("focus", function () { if (!diam) show(ab, root); });
      ab.addEventListener("blur", scheduleHide);
      ab.addEventListener("keydown", function (e) {
        if (e.key !== "Tab" || e.shiftKey || current !== ab) return;
        var t = tautanPop();
        if (!t.length) return;
        e.preventDefault();
        clearTimeout(hideTimer);
        t[0].focus();
      });
      ab.addEventListener("click", function (e) {
        e.preventDefault();
        if (current === ab && pop && !pop.hidden) hide(); else show(ab, root);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var asal = current, dalam = pop && pop.contains(document.activeElement);
      hide();
      if (dalam && asal) fokusDiam(asal);
    });
    document.addEventListener("click", function (e) {
      if (pop && !pop.hidden && !pop.contains(e.target) && !e.target.closest("abbr.istilah")) hide();
    });
    window.addEventListener("scroll", function () { if (current && pop && !pop.hidden) place(current); }, { passive: true });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(init);
  } else if (document.readyState !== "loading") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
