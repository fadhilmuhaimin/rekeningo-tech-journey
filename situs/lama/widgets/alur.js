/* Widget alur: pola skenario bertahap. Paket data bergerak di antara komponen,
 * lapisan yang bekerja tersorot, layar perangkat berubah per langkah.
 *
 * Pakai di Markdown:
 *   <div data-bb="alur" data-src="data/a2-alur.json"></div>
 *
 * Format data (v1 dan v2) dan semua logika murni ada di alur-core.js (BB.alurCore).
 * File ini hanya mengurus DOM. Skema divalidasi saat build (tools/validasi_skenario.mjs).
 * Butuh hp.js (BB.phone). Gerak paket saat tombol ditekan datang dari src/gerak/alur.ts (BB.gerakAlur,
 * keputusan 261); tanpa modul itu, atau dengan reduced motion, paket langsung di posisi akhirnya. Saldo di layar
 * HP bergerak dari nilai lama lewat BB.gerakAlur.angka (keputusan 352), dengan aturan yang sama.
 */
(function () {
  "use strict";
  var BB = window.BB;
  var core = BB.alurCore;
  var LEBAR_MIN = 110;  // px per komponen; di bawah ini jalur menjadi rel vertikal
  var LEBAR_SEMPIT = 600;  // px lebar widget; di bawah ini (HP) tombol pindah tepat di bawah jalur
  // Layar pendek (HP lanskap, keputusan 350): di tata letak lebar detail dan HP ada di antara paket dan tombol, jadi
  // keduanya tidak muat bersamaan di tinggi < 500 px; mode sempit ikut berlaku. Kueri yang sama dipakai versi statis
  // (tema.css, @media (height < 500px)), karena container query tidak bisa membaca tinggi layar.
  var PENDEK = window.matchMedia ? window.matchMedia("(height < 500px)") : null;

  BB.mounts.alur = function (host) {
    BB.fetchJSON(host.dataset.src).then(function (raw) {
      var d = core.normalize(raw);
      var salah = core.validate(d);
      if (salah.length) throw new Error(salah.join("; "));

      var i = 0, varianOn = false, guessed = !d.predict, revealed = false;
      var list = core.steps(d, false);
      var n = d.komponen.length;

      var lanes = BB.el("div", { class: "bb-alur__lanes", style: "grid-template-columns: repeat(" + n + ", 1fr)" });
      var laneEls = d.komponen.map(function (k) {
        var lane = BB.el("div", { class: "bb-alur__lane", "data-k": k.id }, [BB.el("strong", { text: k.label })]);
        if (k.lapisan && k.lapisan.length) {
          var ul = BB.el("ol", { class: "bb-alur__layers" });
          k.lapisan.forEach(function (l) { ul.appendChild(BB.el("li", { "data-l": l, text: l })); });
          lane.appendChild(ul);
        }
        lanes.appendChild(lane);
        return lane;
      });
      var packet = BB.el("div", { class: "bb-alur__packet", "aria-hidden": "true" });
      var track = BB.el("div", { class: "bb-alur__track" }, [packet]);

      var phoneBox = BB.el("div", { class: "bb-alur__phone" });
      var title = BB.el("p", { class: "bb-alur__title" });
      var payload = BB.el("pre", { class: "bb-alur__payload" });
      var explain = BB.el("p", { class: "bb-alur__explain" });
      var detail = BB.el("div", { class: "bb-alur__detail", "aria-live": "polite" }, [title, payload, explain]);

      var prev = BB.el("button", { type: "button", class: "bb-btn", text: "← Sebelumnya", onclick: function () { go(i - 1); } });
      var next = BB.el("button", { type: "button", class: "bb-btn bb-btn--primary", text: "Berikutnya →", onclick: function () { go(i + 1); } });
      var counter = BB.el("span", { class: "bb-muted bb-alur__count" });
      var controls = BB.el("div", { class: "bb-row" }, [prev, next, counter]);

      var head = BB.el("div", { class: "bb-widget__head" }, [BB.el("strong", { text: d.judul }),
        BB.el("span", { class: "bb-muted", text: "Langkah demi langkah · panah kiri/kanan" })]);
      var chip = BB.sumberChip(d.sumber);
      if (chip) head.appendChild(chip);
      var root = BB.el("div", { class: "bb-widget bb-alur", tabindex: "0", role: "group", "aria-label": d.judul }, [head]);

      var pBox = null;
      if (d.predict) {
        pBox = BB.predict(d.predict, function () { guessed = true; render(); });
        root.appendChild(pBox);
      }
      if (d.varian) {
        var cb = BB.el("input", { type: "checkbox" });
        cb.addEventListener("change", function () {
          varianOn = cb.checked;
          list = core.steps(d, varianOn);
          // Jawaban tebakan dibuka lagi di akhir jalur yang baru.
          revealed = false;
          if (pBox) pBox.querySelectorAll(".bb-predict__a").forEach(function (a) { a.remove(); });
          // Lompat ke langkah pertama yang berbeda: di situlah pelajarannya.
          if (guessed) i = Math.min(list.length, d.varian.mulai + 1);
          render(true);
        });
        var varianBox = BB.el("label", { class: "bb-alur__varian" }, [cb, " Ubah satu hal: " + d.varian.label]);
        root.appendChild(varianBox);
      }
      root.appendChild(lanes);
      root.appendChild(track);
      var rail = null;  // dibuat saat pertama kali beralih ke rel vertikal
      root.appendChild(BB.el("div", { class: "bb-alur__body" }, [phoneBox, detail]));
      root.appendChild(controls);
      root.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { go(i + 1); e.preventDefault(); }
        if (e.key === "ArrowLeft") { go(i - 1); e.preventDefault(); }
      });

      // Rel vertikal kalau lebar per komponen < LEBAR_MIN px. Tata letak horizontal
      // tidak disentuh sama sekali: DOM hanya berubah saat beralih ke vertikal.
      // Sempit (HP, atau layar pendek): DOM diurutkan ulang menjadi jalur, tombol, tebakan, varian, lalu detail dan HP (CSS menaruh
      // detail di atas HP). Semua yang tingginya berubah ada di bawah tombol, jadi jalur dan tombol diam antarlangkah,
      // paket dan Berikutnya terlihat bersamaan, dan urutan fokus sama dengan urutan tampil (perbaikan PR #175).
      var vertikal = false, sempit = false;
      var atasAsli = [pBox, varianBox].filter(Boolean);  // varianBox: var, undefined bila tanpa varian
      function urutSempit(mau) {
        if (mau === sempit) return;
        sempit = mau;
        // Chrome membuang fokus dari elemen yang dipindah insertBefore; fokus dikembalikan ke elemen yang sama.
        var aktif = document.activeElement;
        var jalur = rail && rail.parentNode === root ? rail : lanes;
        if (sempit) {
          var stlh = rail && rail.parentNode === root ? rail : track;
          [controls].concat(atasAsli).reverse().forEach(function (x) { root.insertBefore(x, stlh.nextSibling); });
        } else {
          atasAsli.forEach(function (x) { root.insertBefore(x, jalur); });
          root.appendChild(controls);
        }
        if (aktif && root.contains(aktif) && document.activeElement !== aktif) aktif.focus({ preventScroll: true });
        root.classList.toggle("is-sempit", sempit);
      }
      function tata() {
        var w = root.clientWidth;
        var mau = w > 0 && w / n < LEBAR_MIN;
        urutSempit(w > 0 && (mau || w < LEBAR_SEMPIT || !!(PENDEK && PENDEK.matches)));
        if (mau === vertikal) return;
        vertikal = mau;
        if (vertikal) {
          if (!rail) rail = BB.el("div", { class: "bb-alur__rail" });
          root.insertBefore(rail, lanes);
          rail.appendChild(lanes);
          rail.appendChild(track);
        } else if (rail) {
          root.insertBefore(lanes, rail);
          root.insertBefore(track, rail);
          rail.remove();
        }
        root.classList.toggle("is-vertikal", vertikal);
        render();
      }

      function go(k) {
        if (!guessed && k > 0) return;
        i = Math.max(0, Math.min(list.length, k));
        render(true);
      }

      // Saldo yang tampil per perangkat. Saat pembaca menekan tombol dan saldo perangkat yang sama berubah, angkanya
      // bergerak singkat dari nilai lama (BB.gerakAlur.angka, src/gerak/angka.ts, keputusan 352). Teksnya ada di dalam
      // role="img" yang aria-label-nya sudah nilai akhir, jadi pembaca layar tidak membaca angka antara.
      var saldoLalu = {};
      var tweenSaldo = [];
      function renderPhones(gerak) {
        tweenSaldo.forEach(function (t) { saldoLalu[t.id] = t.tw.berhenti(); });
        tweenSaldo = [];
        var saldoBaru = {};
        var tween = gerak && BB.gerakAlur && BB.gerakAlur.angka;
        function hp(x) {
          var el = BB.phone(x.layar), ke = x.layar.saldo, dari = saldoLalu[x.p.id];
          if (ke == null) return el;
          saldoBaru[x.p.id] = ke;
          var angka = el.querySelector(".bb-hp__saldo strong");
          if (tween && angka && dari != null && dari !== ke) tweenSaldo.push({ id: x.p.id, tw: BB.gerakAlur.angka(angka, dari, ke, BB.rp) });
          return el;
        }
        phoneBox.innerHTML = "";
        var shown = d.perangkat.map(function (p) { return { p: p, layar: core.layarAt(d, list, i - 1, p.id) }; })
          .filter(function (x) { return x.layar; });
        if (shown.length === 1 && d.perangkat.length === 1) phoneBox.appendChild(hp(shown[0]));
        // Beberapa perangkat: berdampingan, masing-masing berlabel.
        else shown.forEach(function (x) {
          phoneBox.appendChild(BB.el("figure", { class: "bb-alur__device" }, [hp(x),
            BB.el("figcaption", { text: x.p.label })]));
        });
        saldoLalu = saldoBaru;
      }

      // Tengah komponen j di rel vertikal, dari tinggi baris sebenarnya.
      function mid(j) { var e = laneEls[j]; return e.offsetTop + e.offsetHeight / 2; }
      // Tengah celah antara baris j dan j + 1: titik tengah dua pusat baris jatuh di dalam baris yang lebih tinggi.
      function celah(j) { var e = laneEls[j]; return (e.offsetTop + e.offsetHeight + laneEls[j + 1].offsetTop) / 2; }
      // Posisi paket (px) bila ditaruh di nilai left (horizontal, %) atau top (vertikal, px), lalu dikembalikan.
      function titikDi(nilai) {
        var prop = vertikal ? "top" : "left", lama = packet.style[prop];
        packet.style[prop] = nilai;
        var t = { x: packet.offsetLeft, y: packet.offsetTop };
        packet.style[prop] = lama;
        return t;
      }

      // gerak true hanya dari tombol, panah, dan varian: paket berangkat dari komponen asal ke posisi akhirnya.
      function render(gerak) {
        var st = i > 0 ? list[i - 1] : null;
        var sebelum = packet.hidden ? null : { x: packet.offsetLeft, y: packet.offsetTop };
        var owner = core.pemilikLapisan(d, st);
        var a = st ? core.indexOf(d, st.dari) : -1, b = st && st.ke != null ? core.indexOf(d, st.ke) : -1;
        laneEls.forEach(function (lane, j) {
          lane.classList.toggle("is-active", !!st && (a === j || b === j));
          lane.classList.toggle("is-warn", !!st && st.nada === "warn" && (b < 0 ? a === j : b === j));
          lane.querySelectorAll("[data-l]").forEach(function (li) {
            li.classList.toggle("is-on", !!st && owner === d.komponen[j].id && st.lapisan === li.dataset.l);
          });
        });
        packet.hidden = !st;
        if (st && !vertikal) {
          packet.style.left = core.packetPos(d, st) + "%";
          packet.className = "bb-alur__packet" + (b < 0 ? " is-local" : b > a ? " is-right" : " is-left") +
            (st.nada ? " is-" + st.nada : "");
          packet.textContent = b < 0 ? "●" : b > a ? "→" : "←";
        }
        if (st && vertikal) {
          // Posisi dari tinggi baris sebenarnya: tengah komponen, atau di celah antara tujuan dan tetangganya di sisi asal.
          var sisi = b < 0 ? -1 : core.sisiAsal(a, b);
          packet.style.top = (b < 0 || sisi === b ? mid(b < 0 ? a : b) : celah(Math.min(b, sisi))) + "px";
          packet.className = "bb-alur__packet" + (b < 0 ? " is-local" : b > a ? " is-down" : " is-up") +
            (st.nada ? " is-" + st.nada : "");
          packet.textContent = b < 0 ? "●" : b > a ? "↓" : "↑";
        }
        if (gerak && st && BB.gerakAlur) {
          var akhir = { x: packet.offsetLeft, y: packet.offsetTop };
          var awal = b >= 0 ? titikDi(vertikal ? mid(a) + "px" : (a + 0.5) * 100 / n + "%") : (sebelum || akhir);
          BB.gerakAlur.geser(packet, awal, akhir, !sebelum);
        }
        renderPhones(gerak);
        title.textContent = st ? i + ". " + st.judul : (guessed ? "Tekan Berikutnya untuk mulai." : "Tebak dulu, lalu tekan Berikutnya.");
        title.className = "bb-alur__title" + (st && st.nada ? " is-" + st.nada : "");
        payload.textContent = st && st.kirim ? st.kirim : "";
        payload.hidden = !(st && st.kirim);
        explain.textContent = st ? st.jelas : (d.pengantar || "");
        counter.textContent = "Langkah " + i + " dari " + list.length;
        prev.disabled = i === 0;
        next.disabled = !guessed || i >= list.length;
        if (i === list.length && pBox && !revealed && (!d.predict.varian || varianOn)) {
          pBox.reveal(d.predict.answer, d.predict.explain);
          revealed = true;
        }
      }
      // Versi statis dari build (WidgetLama.astro, keputusan 263) diganti dalam tugas yang sama dengan render dan tata,
      // jadi tidak ada frame tanpa widget; tingginya sama, jadi isi di bawahnya tidak bergeser.
      var statis = host.querySelector(".bb-alur-pesan");
      if (statis) statis.replaceWith(root);
      else host.appendChild(root);
      render();
      tata();
      if (window.ResizeObserver) new ResizeObserver(tata).observe(root);
      else window.addEventListener("resize", tata);
      // Tinggi saja yang berubah (jendela dipendekkan) tidak mengubah lebar widget, jadi ResizeObserver diam.
      if (PENDEK && PENDEK.addEventListener) PENDEK.addEventListener("change", tata);
    }).catch(function (e) { host.textContent = "Alur gagal dimuat: " + e.message; });
  };

  BB.mountAll();
})();
