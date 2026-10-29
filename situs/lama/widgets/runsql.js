/* Widget Before/After SQL yang benar-benar dijalankan (sql.js, SQLite di WebAssembly).
 *
 * Pakai di Markdown:
 *   <div data-bb="runsql" data-src="data/b3-1-transfer.json"></div>
 *
 * sql.js dimuat saat tombol Jalankan pertama kali ditekan, bukan saat halaman dibuka.
 */
(function () {
  "use strict";
  var BB = window.BB;
  var VENDOR = BB.base + "../vendor/sql.js-1.14.2/";
  var sqlPromise = null;

  function loadSQL() {
    if (sqlPromise) return sqlPromise;
    sqlPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = VENDOR + "sql-wasm.js";
      s.onload = function () {
        window.initSqlJs({ locateFile: function (f) { return VENDOR + f; } }).then(resolve, reject);
      };
      s.onerror = function () { reject(new Error("gagal memuat sql-wasm.js")); };
      document.head.appendChild(s);
    });
    sqlPromise.catch(function () { sqlPromise = null; });
    return sqlPromise;
  }

  function stepItem(step) {
    var li = BB.el("li", { class: "bb-step" });
    if (step.actor) li.appendChild(BB.el("span", { class: "bb-actor bb-actor--" + step.actor, text: step.actor }));
    li.appendChild(BB.el("code", { class: "bb-step__sql", text: step.sql }));
    li.appendChild(BB.el("span", { class: "bb-step__res" }));
    return li;
  }

  function tableEl(t, other) {
    var head = BB.el("tr", null, t.columns.map(function (c) { return BB.el("th", { text: c }); }));
    var body = t.values.map(function (row, r) {
      return BB.el("tr", null, row.map(function (v, c) {
        var differs = other && other.values[r] && other.values[r][c] !== v;
        return BB.el("td", { class: differs ? "is-diff" : "", text: v === null ? "NULL" : String(v) });
      }));
    });
    return BB.el("table", { class: "bb-table" }, [BB.el("thead", null, [head]), BB.el("tbody", null, body)]);
  }

  BB.mounts.runsql = function (host) {
    host.textContent = "Memuat contoh...";
    BB.fetchJSON(host.dataset.src).then(function (sc) {
      host.textContent = "";
      host.classList.add("bb-widget");
      var core = BB.runsqlCore;
      var toggleOn = false;
      var predicted = false;

      host.appendChild(BB.el("div", { class: "bb-widget__head" }, [
        BB.el("strong", { text: sc.title }),
        BB.el("span", { class: "bb-muted", text: "SQL sungguhan, dijalankan di browser" })]));

      var predict = BB.predict(sc.predict, function () { predicted = true; runBtn.disabled = false; });
      host.appendChild(predict);

      var panels = {};
      var grid = BB.el("div", { class: "bb-ba" });
      ["before", "after"].forEach(function (name) {
        var p = sc.panels[name];
        var list = BB.el("ol", { class: "bb-steps" });
        var out = BB.el("div", { class: "bb-ba__out", "aria-live": "polite" });
        grid.appendChild(BB.el("section", { class: "bb-ba__panel bb-ba__panel--" + name }, [
          BB.el("h4", { text: p.label }), list, out]));
        panels[name] = { list: list, out: out };
      });

      function paintSteps() {
        ["before", "after"].forEach(function (name) {
          var list = panels[name].list;
          list.innerHTML = "";
          sc.panels[name].steps.forEach(function (st) {
            var shown = Object.assign({}, st, { sql: core.applyToggles(st.sql, toggleOn ? sc.toggles : []) });
            list.appendChild(stepItem(shown));
          });
          panels[name].out.innerHTML = "";
        });
      }

      var runBtn = BB.el("button", { type: "button", class: "bb-btn bb-btn--primary", text: "Jalankan Before & After", disabled: "" });
      var status = BB.el("span", { class: "bb-muted", role: "status" });
      var controls = BB.el("div", { class: "bb-row" }, [runBtn, status]);

      if (sc.toggles && sc.toggles.length) {
        var cb = BB.el("input", { type: "checkbox", id: sc.id + "-toggle" });
        cb.addEventListener("change", function () { toggleOn = cb.checked; paintSteps(); if (ran) run(); });
        controls.appendChild(BB.el("label", { class: "bb-toggle", for: sc.id + "-toggle" },
          [cb, " Ubah satu hal: " + sc.toggles[0].label]));
      }

      host.appendChild(controls);
      host.appendChild(grid);
      var foot = BB.el("p", { class: "bb-widget__foot bb-muted", text: "Engine: memuat saat dijalankan · sql.js 1.14.2" });
      host.appendChild(foot);
      paintSteps();

      var ran = false;
      function run() {
        // Tombol yang mati saat berjalan melepas fokus ke <body>; kembalikan sesudah selesai (WCAG 2.4.3), hanya bila pembaca menekannya.
        var hadFocus = document.activeElement === runBtn;
        runBtn.disabled = true;
        status.textContent = "Menjalankan...";
        loadSQL().then(function (SQL) {
          var t = toggleOn ? sc.toggles : [];
          var res = { before: core.runPanel(SQL, sc, "before", t), after: core.runPanel(SQL, sc, "after", t) };
          ["before", "after"].forEach(function (name) {
            panels[name].list.innerHTML = "";
            res[name].log.forEach(function (entry) {
              var item = stepItem(entry);
              item.classList.add(entry.skipped ? "is-skipped" : entry.ok ? "is-ok" : "is-err");
              if (entry.auto) item.classList.add("is-auto");
              var label = entry.skipped ? "tidak dijalankan" : entry.ok ? entry.result : "ERROR: " + entry.result;
              item.querySelector(".bb-step__res").textContent = "→ " + label + (entry.note ? " · " + entry.note : "");
              panels[name].list.appendChild(item);
            });
            var other = res[name === "before" ? "after" : "before"].table;
            panels[name].out.innerHTML = "";
            panels[name].out.appendChild(BB.el("p", { class: "bb-muted", text: "Isi tabel sesudahnya:" }));
            panels[name].out.appendChild(tableEl(res[name].table, other));
          });
          foot.textContent = "Engine: " + core.engineVersion(SQL) + " (sql.js 1.14.2), dijalankan di browser ini. Sel berwarna = berbeda antara Before dan After.";
          status.textContent = "";
          if (!ran && predicted) predict.reveal(sc.predict.answer, sc.predict.explain);
          ran = true;
          runBtn.disabled = false;
          runBtn.textContent = "Jalankan ulang";
          if (hadFocus) runBtn.focus();
        }).catch(function (e) {
          status.textContent = "Gagal menjalankan: " + e.message;
          runBtn.disabled = false;
          if (hadFocus) runBtn.focus();
        });
      }
      runBtn.addEventListener("click", run);
    }).catch(function (e) {
      host.textContent = "Contoh gagal dimuat: " + e.message;
    });
  };

  BB.mountAll();
})();
