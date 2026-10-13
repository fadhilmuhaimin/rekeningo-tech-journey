/* Kartu ulang: retrieval practice dengan jadwal bertingkat (kotak Leitner sederhana).
 *
 * Pakai di Markdown:
 *   <div data-bb="kartu" data-src="data/kartu.json"></div>
 *
 * Data: [{ id, halaman, judul, url, tanya, kode?, jawab }], dibuat tools/sinkron_cerita.py dari
 * bagian "## Cek diri" di setiap halaman. Jadi kartu bertambah sendiri saat halaman bertambah.
 *
 * Jadwal: kartu baru masuk kotak 1. "Ingat" menaikkan satu kotak, "Belum ingat" kembali ke kotak 1.
 * Jarak ulang per kotak (hari): JARAK. Angka ini pilihan praktis, bukan hasil riset; yang didukung
 * riset adalah prinsipnya: jarak ulang makin panjang (Cepeda dkk. 2006).
 * State per kartu di localStorage (kunci bb1:kartu:<id>). Tanpa storage, kartu tetap bisa dipakai.
 */
(function (root) {
  "use strict";

  var JARAK = [0, 1, 2, 4, 8, 16];  // indeks = kotak (1–5)
  var MAKS_SESI = 15;

  function tambahHari(iso, n) {
    var d = new Date(iso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  // Logika murni (dites di tests/widgets/kartu.test.cjs).
  var core = {
    JARAK: JARAK,
    jawab: function (state, ingat, hariIni) {
      var k = state ? state.k : 1;
      var baru = ingat ? Math.min(5, k + 1) : 1;
      return { k: baru, due: tambahHari(hariIni, JARAK[baru]) };
    },
    // Kartu jatuh tempo dulu (yang paling lama tertunda di depan), lalu kartu baru.
    antre: function (kartu, states, hariIni, maks) {
      var tempo = [], baru = [];
      kartu.forEach(function (c) {
        var s = states[c.id];
        if (!s) baru.push(c);
        else if (s.due <= hariIni) tempo.push(c);
      });
      tempo.sort(function (a, b) { return states[a.id].due < states[b.id].due ? -1 : 1; });
      return tempo.concat(baru).slice(0, maks || MAKS_SESI);
    }
  };

  if (typeof module !== "undefined" && module.exports) { module.exports = core; return; }

  var BB = root.BB;
  BB.kartuCore = core;
  function hariIni() { return new Date().toISOString().slice(0, 10); }

  BB.mounts.kartu = function (host) {
    BB.fetchJSON(host.dataset.src).then(function (semua) {
      var states = {};
      semua.forEach(function (c) { var s = BB.store.get("kartu:" + c.id); if (s) states[c.id] = s; });
      var siteRoot = BB.base.replace(/widgets\/$/, "");
      var hanyaSelesai = false, antre = [], i = 0;

      var info = BB.el("p", { class: "bb-muted" });
      var boxes = BB.el("div", { class: "bb-kartu__boxes" });
      var cb = BB.el("input", { type: "checkbox" });
      cb.addEventListener("change", function () { hanyaSelesai = cb.checked; mulai(); });
      var card = BB.el("div", { class: "bb-kartu__card", "aria-live": "polite" });
      host.appendChild(BB.el("div", { class: "bb-widget bb-kartu" }, [
        BB.el("div", { class: "bb-widget__head" }, [BB.el("strong", { text: "Kartu ulang" }),
          BB.el("span", { class: "bb-muted", text: "Jawab dalam kepala dulu, baru buka jawabannya" })]),
        info, BB.el("label", null, [cb, " Hanya dari halaman yang sudah selesai kubaca"]), card, boxes]));

      // Satu definisi "halaman selesai" (keputusan 320): BB.halamanSelesai dari DataSelesai.astro membaca penanda
      // "Tandai selesai" halaman versi lama dan blok halaman Tahap 1. Tanpa fungsi itu, hanya penanda versi lama.
      function selesai(c) {
        var p = new URL(siteRoot + c.url, location.href).pathname;
        return BB.halamanSelesai ? BB.halamanSelesai(p) : !!BB.store.get("selesai:" + p);
      }
      function pool() { return hanyaSelesai ? semua.filter(selesai) : semua; }

      function renderBoxes() {
        var n = [0, 0, 0, 0, 0, 0];
        pool().forEach(function (c) { n[states[c.id] ? states[c.id].k : 0]++; });
        boxes.innerHTML = "";
        boxes.appendChild(BB.el("span", { text: "Belum pernah: " + n[0] }));
        for (var k = 1; k <= 5; k++) boxes.appendChild(BB.el("span", { text: "Kotak " + k + " (ulang " + JARAK[k] + " hari): " + n[k] }));
      }

      function mulai() {
        antre = core.antre(pool(), states, hariIni(), MAKS_SESI);
        i = 0;
        info.textContent = pool().length + " kartu dari " + new Set(pool().map(function (c) { return c.halaman; })).size +
          " halaman · sesi ini " + antre.length + " kartu (maks " + MAKS_SESI + ")";
        tampil();
      }

      function tampil() {
        card.innerHTML = "";
        renderBoxes();
        if (i >= antre.length) {
          card.appendChild(BB.el("p", { text: antre.length ? "Sesi selesai. Kartu berikutnya muncul sesuai jadwalnya." :
            hanyaSelesai ? "Belum ada kartu jatuh tempo dari halaman yang sudah selesai kamu baca." : "Tidak ada kartu jatuh tempo hari ini." }));
          return;
        }
        var c = antre[i];
        card.appendChild(BB.el("p", { class: "bb-kartu__src" }, ["Kartu " + (i + 1) + " dari " + antre.length + " · ",
          BB.el("a", { href: siteRoot + c.url, text: c.judul })]));
        card.appendChild(BB.el("p", { class: "bb-kartu__q", text: c.tanya }));
        if (c.kode) card.appendChild(BB.el("pre", null, [BB.el("code", { text: c.kode })]));
        var buka = BB.el("button", { type: "button", class: "bb-btn bb-btn--primary", text: "Tunjukkan jawaban", onclick: function () {
          buka.remove();
          card.appendChild(BB.el("div", { class: "bb-kartu__a", text: c.jawab }));
          card.appendChild(BB.el("div", { class: "bb-row" }, [
            BB.el("button", { type: "button", class: "bb-btn", text: "Ingat", onclick: function () { nilai(c, true); } }),
            BB.el("button", { type: "button", class: "bb-btn", text: "Belum ingat", onclick: function () { nilai(c, false); } })]));
        } });
        card.appendChild(buka);
      }

      function nilai(c, ingat) {
        states[c.id] = core.jawab(states[c.id], ingat, hariIni());
        BB.store.set("kartu:" + c.id, states[c.id]);
        i++;
        tampil();
      }
      mulai();
    }).catch(function (e) { host.textContent = "Kartu gagal dimuat: " + e.message; });
  };

  BB.mountAll();
})(this);
