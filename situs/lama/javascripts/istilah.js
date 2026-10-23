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

  var pop, hideTimer, showTimer, current;

  function ensurePop() {
    if (pop) return pop;
    pop = document.createElement("div");
    pop.className = "istilah-pop";
    pop.id = "istilah-pop";
    pop.setAttribute("role", "tooltip");
    pop.hidden = true;
    pop.addEventListener("mouseenter", function () { clearTimeout(hideTimer); });
    pop.addEventListener("mouseleave", scheduleHide);
    document.body.appendChild(pop);
    return pop;
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
      ab.addEventListener("focus", function () { show(ab, root); });
      ab.addEventListener("blur", scheduleHide);
      ab.addEventListener("click", function (e) {
        e.preventDefault();
        if (current === ab && pop && !pop.hidden) hide(); else show(ab, root);
      });
    });

    document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
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
