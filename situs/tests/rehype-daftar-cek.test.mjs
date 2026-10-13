// rehype-daftar-cek (XF6, keputusan 374): checkbox disabled di butir daftar tugas diberi aria-hidden, checkbox lain tidak.
import test from "node:test";
import assert from "node:assert/strict";
import rehypeDaftarCek from "../src/plugins/rehype-daftar-cek.mjs";

const cek = (props = {}) => ({ type: "element", tagName: "input", properties: { type: "checkbox", disabled: true, ...props }, children: [] });
const li = (className, children) => ({ type: "element", tagName: "li", properties: className ? { className } : {}, children });
const p = (children) => ({ type: "element", tagName: "p", properties: {}, children });
const teks = (value) => ({ type: "text", value });
const pohon = (children) => ({ type: "root", children: [{ type: "element", tagName: "ul", properties: { className: ["contains-task-list"] }, children }] });

test("checkbox daftar tugas ketat dan longgar mendapat aria-hidden", () => {
  const ketat = cek(), longgar = cek();
  rehypeDaftarCek()(pohon([li(["task-list-item"], [ketat, teks(" butir")]), li(["task-list-item"], [p([longgar, teks(" butir")])])]));
  assert.equal(ketat.properties.ariaHidden, "true");
  assert.equal(longgar.properties.ariaHidden, "true");
});

test("checkbox yang bisa dioperasikan atau di luar daftar tugas tidak disentuh", () => {
  const aktif = cek({ disabled: false }), luar = cek(), anakBiasa = cek();
  const sarang = { type: "element", tagName: "ul", properties: {}, children: [li(null, [anakBiasa])] };
  rehypeDaftarCek()(pohon([li(["task-list-item"], [aktif, teks(" butir"), sarang]), li(null, [luar])]));
  assert.equal(aktif.properties.ariaHidden, undefined);
  assert.equal(luar.properties.ariaHidden, undefined);
  assert.equal(anakBiasa.properties.ariaHidden, undefined);
});
