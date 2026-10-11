/* Widget "Dua client, satu saldo": memutar ulang rekaman Postgres langkah demi langkah.
 *
 * Pakai di Markdown:
 *   <div data-bb="race" data-modes="tx-tanpa-lock,for-update,atomic,optimistic"></div>
 *
 * Data: widgets/data/b3-race/<mode>.json, dibuat oleh labs/b3-race/run.py dari
 * PostgreSQL sungguhan. Widget ini tidak mensimulasikan apa pun, hanya memutar ulang.
 *
 * Garis waktu dua client (I5e, keputusan 353): satu baris per langkah, waktu berjalan ke bawah, langkah A di lajur
 * kiri dan langkah B di lajur kanan. Langkah yang sudah lewat tetap terlihat (warna sekunder, tanpa opacity) dan
 * halaman yang bergulir, bukan kotak bergulir di dalam widget. Lajur client yang sedang menunggu lock bergaris
 * putus-putus. Baris baru masuk dengan gerak singkat dari BB.gerakRace (src/gerak/race.ts) hanya saat pembaca
 * menekan Berikutnya; tanpa modul itu, atau dengan prefers-reduced-motion, baris langsung tampil.
 * Versi statis render pertama dari build (WidgetLama.astro, src/lib/race-statis.ts) memesan tinggi widget sampai
 * rekaman datang; elemen dan teks render pertama di bawah harus tetap sama dengan versi statis itu.
 */
(function () {
  "use strict";
  var BB = window.BB;
  var OPTION_VALUES = [-20000, 30000, 50000];
  var OPTIONS = OPTION_VALUES.map(function (v) { return BB.rp(v); }).concat(["Belum tahu"]);
  var VAR_LABEL = { saldo_dibaca: "saldo yang dibaca", version: "version yang dibaca" };

  function clientCard(name) {
    var status = BB.el("span", { class: "bb-chip" });
    var vars = BB.el("dl", { class: "bb-vars" });
    var card = BB.el("div", { class: "bb-client" }, [
      BB.el("div", { class: "bb-client__head" }, [BB.el("span", { class: "bb-actor bb-actor--" + name, text: name }),
        BB.el("strong", { text: "Client " + name }), status]),
      vars]);
    return { card: card, status: status, vars: vars };
  }

  function actor(name) { return BB.el("span", { class: "bb-actor bb-actor--" + name, text: name }); }

  /* Satu baris garis waktu. Client lain yang sedang menunggu lock ditandai di lajurnya (kelas is-tunggu-X). */
  function stepRow(st, k) {
    var tunggu = st.waiting.filter(function (w) { return w !== st.actor; });
    var cls = "bb-race-langkah is-" + st.actor + (st.result === "MENUNGGU lock" ? " is-wait" : "") + (st.sql ? "" : " is-app") +
      tunggu.map(function (w) { return " is-tunggu-" + w; }).join("");
    return BB.el("li", { class: cls }, [
      BB.el("span", { class: "bb-race-langkah__no", text: String(k + 1) }),
      BB.el("div", { class: "bb-race-langkah__isi" }, [
        actor(st.actor),
        st.sql ? BB.el("code", { class: "bb-race-langkah__sql", text: st.sql }) : BB.el("em", { class: "bb-race-langkah__sql", text: st.result }),
        st.sql ? BB.el("span", { class: "bb-race-langkah__hasil", text: "→ " + st.result }) : null,
        tunggu.length ? BB.el("span", { class: "bb-sr", text: " " + tunggu.join(" dan ") + " masih menunggu lock." }) : null])]);
  }

  BB.mounts.race = function (host) {
    var modes = host.dataset.modes.split(",");
    // Versi statis dari build tetap tampil sampai rekaman datang; tanpa itu, teks pemuat.
    if (!host.querySelector(".bb-race-pesan")) host.textContent = "Memuat rekaman...";
    Promise.all(modes.map(function (m) { return BB.fetchJSON("data/b3-race/" + m + ".json"); })).then(function (all) {
      host.textContent = "";
      host.classList.add("bb-widget", "bb-race");
      host.tabIndex = 0;
      var data = {};
      all.forEach(function (d) { data[d.id] = d; });
      var mode = modes[0];
      var i = 0;           // jumlah langkah yang sudah ditampilkan
      var predicted = {};  // mode -> indeks tebakan
      var predictMode = null; // tab yang kotak tebakannya sedang terpasang
      var listMode = null;    // tab yang barisnya sedang ada di garis waktu

      var tabs = BB.el("div", { class: "bb-tabs", role: "tablist", "aria-label": "Cara mengamankan penarikan" });
      modes.forEach(function (m) {
        tabs.appendChild(BB.el("button", { type: "button", role: "tab", class: "bb-tab", "data-m": m,
          text: data[m].title, onclick: function () { mode = m; i = 0; render(); } }));
      });

      var predictHost = BB.el("div");
      var A = clientCard("A"), B = clientCard("B");
      var dbSaldo = BB.el("span", { class: "bb-db__saldo" });
      var dbLock = BB.el("span", { class: "bb-chip" });
      var db = BB.el("div", { class: "bb-db" }, [
        BB.el("strong", { text: "Database" }),
        BB.el("div", { class: "bb-db__row" }, [BB.el("span", { class: "bb-muted", text: "saldo yang sudah commit" }), dbSaldo]),
        BB.el("div", { class: "bb-db__row" }, [BB.el("span", { class: "bb-muted", text: "row lock" }), dbLock])]);
      var stage = BB.el("div", { class: "bb-stage" }, [A.card, db, B.card]);

      var list = BB.el("ol", { class: "bb-race-garis__daftar", "aria-label": "Garis waktu dua client" });
      var timeline = BB.el("div", { class: "bb-race-garis" }, [
        BB.el("div", { class: "bb-race-garis__kepala", "aria-hidden": "true" }, [
          BB.el("span", { class: "bb-race-garis__a" }, [actor("A"), " Client A"]),
          BB.el("span", { class: "bb-race-garis__b" }, ["Client B ", actor("B")])]),
        list,
        BB.el("p", { class: "bb-race-garis__catatan bb-muted", text: "Garis putus-putus jingga: client di lajur itu sedang menunggu lock." })]);

      var now = BB.el("p", { class: "bb-now", "aria-live": "polite" });
      var prev = BB.el("button", { type: "button", class: "bb-btn", text: "← Sebelumnya", onclick: function () { back(); } });
      var next = BB.el("button", { type: "button", class: "bb-btn bb-btn--primary", text: "Berikutnya →", onclick: function () { step(); } });
      var reset = BB.el("button", { type: "button", class: "bb-btn bb-btn--quiet", text: "Ulang", onclick: function () { i = 0; render(); } });
      var counter = BB.el("span", { class: "bb-muted" });
      var summary = BB.el("p", { class: "bb-summary", role: "status" });
      var foot = BB.el("p", { class: "bb-widget__foot bb-muted" });

      var head = BB.el("div", { class: "bb-widget__head" }, [BB.el("strong", { text: "Dua perangkat, satu saldo" }),
        BB.el("span", { class: "bb-muted", text: "Langkah demi langkah · panah kiri/kanan" }),
        BB.sumberChip({ jenis: "rekaman", file: "labs/b3-race/run.py" })]);
      [head, tabs, predictHost, stage, timeline, now, BB.el("div", { class: "bb-row" }, [prev, next, reset, counter]),
        summary, foot].forEach(function (n) { host.appendChild(n); });

      host.addEventListener("keydown", function (e) {
        if (e.target.closest("button") && e.key === " ") return;
        if (e.key === "ArrowRight") { e.preventDefault(); step(); }
        if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); back(); }
      });

      // Tombol yang sedang difokus bisa menjadi nonaktif (Sebelumnya di langkah 0, Berikutnya di langkah terakhir).
      // Fokus dipindah ke tombol yang masih bisa ditekan, supaya keyboard tidak kehilangan tempatnya.
      function keepFocus() {
        var f = document.activeElement;
        if (f === prev && prev.disabled) (next.disabled ? reset : next).focus();
        else if (f === next && next.disabled) reset.focus();
      }

      function step() {
        if (!(mode in predicted)) return;
        if (i < data[mode].steps.length) { i++; render(true); keepFocus(); }
      }

      function back() {
        if (i > 0) { i--; render(); keepFocus(); }
      }

      function paintClient(c, name, s) {
        var waiting = s && s.waiting.indexOf(name) >= 0;
        var vars = s ? s.vars[name] : {};
        c.status.textContent = waiting ? "menunggu lock" : !s ? "siap" : "jalan";
        c.status.className = "bb-chip" + (waiting ? " is-warn" : "");
        c.card.classList.toggle("is-waiting", waiting);
        c.vars.innerHTML = "";
        Object.keys(vars).forEach(function (k) {
          c.vars.appendChild(BB.el("dt", { text: VAR_LABEL[k] || k }));
          c.vars.appendChild(BB.el("dd", { text: k === "saldo_dibaca" ? BB.rp(vars[k]) : String(vars[k]) }));
        });
        if (!Object.keys(vars).length) c.vars.appendChild(BB.el("dd", { class: "bb-muted", text: "belum membaca apa pun" }));
      }

      /* Baris yang sudah ada dipertahankan: Berikutnya menambah satu baris di bawah, Sebelumnya membuang baris terakhir,
       * ganti tab atau Ulang mengosongkan garis waktu. Hanya baris yang baru ditambah lewat Berikutnya yang bergerak. */
      function paintTimeline(d, forward) {
        if (listMode !== mode) { list.textContent = ""; listMode = mode; }
        while (list.children.length > i) list.removeChild(list.lastChild);
        var added = null;
        for (var k = list.children.length; k < i; k++) { added = stepRow(d.steps[k], k); list.appendChild(added); }
        Array.prototype.forEach.call(list.children, function (li, k) {
          var cur = k === i - 1;
          li.classList.toggle("is-current", cur);
          li.classList.toggle("is-lewat", !cur);
          if (cur) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
        });
        if (forward && added && BB.gerakRace) BB.gerakRace.masuk(added);
      }

      function render(forward) {
        var d = data[mode];
        tabs.querySelectorAll(".bb-tab").forEach(function (t) {
          t.setAttribute("aria-selected", t.dataset.m === mode ? "true" : "false");
        });

        // Kotak tebakan dibuat ulang hanya saat tab berganti, supaya tombol yang baru ditekan tidak hilang dari DOM.
        if (predictMode !== mode) {
          predictMode = mode;
          predictHost.innerHTML = "";
          var pBox = BB.predict({ q: "Saldo awal " + BB.rp(d.start) + ". A menarik " + BB.rp(d.withdraw.A) + ", B menarik " + BB.rp(d.withdraw.B) +
            " pada waktu bersamaan. Berapa saldo akhir?", options: OPTIONS }, function (k) {
            predicted[mode] = k;
            render();
            next.focus(); // tombol tebakan kini nonaktif; langkah berikutnya adalah Berikutnya
          });
          if (mode in predicted) {
            pBox.querySelectorAll("button").forEach(function (b, k) {
              b.disabled = true;
              if (k === predicted[mode]) b.classList.add("is-picked");
            });
          }
          predictHost.appendChild(pBox);
        }

        var s = i > 0 ? d.steps[i - 1] : null;
        paintClient(A, "A", s);
        paintClient(B, "B", s);
        dbSaldo.textContent = BB.rp(s ? s.committed : d.start);
        dbLock.textContent = s && s.lock ? "dipegang " + s.lock : "tidak ada";
        dbLock.className = "bb-chip" + (s && s.lock ? " is-system" : "");

        if (!(mode in predicted)) now.textContent = "Pilih tebakanmu dulu, lalu tekan Berikutnya.";
        else if (!s) now.textContent = "Belum ada langkah. Tekan Berikutnya (atau panah kanan).";
        else now.textContent = "Langkah " + i + " · " + s.actor + ": " + (s.sql ? s.sql + " → " + s.result : s.result) +
          (s.note && s.note !== "kode aplikasi" ? " (" + s.note + ")" : "");

        paintTimeline(d, forward);

        counter.textContent = "Langkah " + i + " dari " + d.steps.length;
        prev.disabled = i === 0;
        next.disabled = !(mode in predicted) || i >= d.steps.length;

        summary.innerHTML = "";
        summary.className = "bb-summary";
        if (i === d.steps.length) {
          var correct = OPTION_VALUES.indexOf(d.final);
          var pick = predicted[mode];
          var verdict = pick === correct ? "Tebakanmu benar. " : pick === 3 ? "" : "Tebakanmu meleset. ";
          summary.classList.add(d.final === d.start - d.withdraw.A ? "is-good" : "is-warn");
          summary.appendChild(BB.el("strong", { text: "Saldo akhir " + BB.rp(d.final) + ". " }));
          summary.appendChild(document.createTextNode(verdict + d.summary));
        }
        foot.textContent = "Rekaman PostgreSQL " + d.postgres.split(" ")[0] + ", isolation " + d.isolation +
          ", direkam " + d.recorded + " oleh labs/b3-race/run.py. Bukan simulasi.";
      }
      render();
    }).catch(function (e) {
      host.textContent = "Rekaman gagal dimuat: " + e.message;
    });
  };

  BB.mountAll();
})();
