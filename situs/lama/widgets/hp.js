/* Mockup layar HP Rekeningo (fiktif). Dipakai langsung dan oleh widget lain (alur.js).
 *
 * Pakai di Markdown (beberapa layar berurutan, dengan panah):
 *   <div data-bb="hp" data-src="data/a1-hp.json"></div>
 *
 * Data: { layar: [Layar], caption? }
 * Layar: { judul?, waktu?, sinyal? (0–4), saldo?, saldoLabel?, isi: [Isi], catatan?, nada? }
 * Isi:   { jenis: "baris", kiri, kanan, nada? } | { jenis: "input", label, nilai }
 *        { jenis: "tombol", teks, nonaktif? } | { jenis: "toast", teks, nada: "warn"|"good" }
 *        { jenis: "proses", teks } | { jenis: "teks", teks }
 * Nominal uang ditulis sebagai integer rupiah dan diformat dengan BB.rp.
 */
(function () {
  "use strict";
  var BB = window.BB;

  function sinyal(n) {
    var box = BB.el("span", { class: "bb-hp__sig", "aria-hidden": "true" });  // isi role="img" tidak dibacakan; aria-label di span dilarang (axe)
    for (var i = 1; i <= 4; i++) box.appendChild(BB.el("i", { class: i <= n ? "is-on" : "" }));
    return box;
  }

  function isi(it) {
    switch (it.jenis) {
      case "baris":
        return BB.el("div", { class: "bb-hp__row" + (it.nada ? " is-" + it.nada : "") }, [
          BB.el("span", { text: it.kiri }), BB.el("strong", { text: it.kanan })]);
      case "input":
        return BB.el("div", { class: "bb-hp__input" }, [
          BB.el("small", { text: it.label }), BB.el("span", { text: it.nilai })]);
      case "tombol":
        return BB.el("div", { class: "bb-hp__btn" + (it.nonaktif ? " is-off" : ""), text: it.teks });
      case "toast":
        return BB.el("div", { class: "bb-hp__toast is-" + (it.nada || "good"), role: "status", text: it.teks });
      case "proses":
        return BB.el("div", { class: "bb-hp__proc" }, [BB.el("i"), it.teks]);
      default:
        return BB.el("p", { class: "bb-hp__text", text: it.teks });
    }
  }

  /* Satu layar HP sebagai elemen. Dipakai juga oleh alur.js. */
  BB.phone = function (l) {
    var screen = BB.el("div", { class: "bb-hp__screen" }, [
      BB.el("div", { class: "bb-hp__status" }, [BB.el("span", { text: l.waktu || "12.05" }), sinyal(l.sinyal == null ? 4 : l.sinyal)]),
      BB.el("div", { class: "bb-hp__app", text: l.judul || "Rekeningo" })
    ]);
    if (l.saldo != null) {
      screen.appendChild(BB.el("div", { class: "bb-hp__saldo" + (l.nada ? " is-" + l.nada : "") }, [
        BB.el("small", { text: l.saldoLabel || "Saldo kamu" }), BB.el("strong", { text: BB.rp(l.saldo) })]));
    }
    (l.isi || []).forEach(function (it) { screen.appendChild(isi(it)); });
    var label = [l.judul || "Rekeningo", l.saldo != null ? (l.saldoLabel || "saldo") + " " + BB.rp(l.saldo) : ""]
      .concat((l.isi || []).map(function (it) { return it.teks || (it.kiri ? it.kiri + " " + it.kanan : it.label ? it.label + " " + it.nilai : ""); }))
      .filter(Boolean).join(". ");
    return BB.el("div", { class: "bb-hp", role: "img", "aria-label": "Layar HP: " + label }, [screen]);
  };

  BB.mounts.hp = function (host) {
    BB.fetchJSON(host.dataset.src).then(function (d) {
      var row = BB.el("div", { class: "bb-hps" });
      d.layar.forEach(function (l, i) {
        if (i > 0) row.appendChild(BB.el("span", { class: "bb-hps__arrow", "aria-hidden": "true", text: "→" }));
        row.appendChild(BB.el("figure", { class: "bb-hps__item" }, [
          BB.phone(l), l.catatan ? BB.el("figcaption", { text: l.catatan }) : null]));
      });
      var fig = BB.el("div", { class: "bb-hps-wrap" }, [row]);
      if (d.caption) fig.appendChild(BB.el("p", { class: "bb-hps__cap bb-muted", text: d.caption }));
      host.appendChild(fig);
    }).catch(function (e) { host.textContent = "Mockup gagal dimuat: " + e.message; });
  };

  BB.mountAll();
})();
