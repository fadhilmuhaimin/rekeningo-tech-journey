// Penyaring halaman alat ukur (keputusan 866): bawaan semua halaman; UKUR_HALAMAN mempersempit; berkas hilang gagal keras.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { kanonik, saring, terpilih } from "../tools/lib/pilih.mjs";

const tulis = (isi) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pilih-"));
  const f = path.join(d, "halaman.txt");
  fs.writeFileSync(f, isi);
  return f;
};
const SEMUA = ["", "tahap-1/a/", "tahap-1/b/", "tahap-2/c/"]; // bentuk layar.mjs: tanpa "/" di depan, beranda ""
const TANPA_DIST = "/tidak/ada/dist"; // pagar keberadaan path di dist (keputusan 868) dilewati bila dist tidak ada

test("tanpa UKUR_HALAMAN daftar dikembalikan apa adanya", () => {
  assert.equal(terpilih({}), null);
  assert.equal(saring(SEMUA, (x) => x, { env: {} }), SEMUA);
});

test("bentuk path dikanonikkan: beranda, tanpa dan dengan garis miring", () => {
  assert.equal(kanonik(""), "/");
  assert.equal(kanonik("/"), "/");
  assert.equal(kanonik("tahap-1/a"), "/tahap-1/a/");
  assert.equal(kanonik("/tahap-1/a/"), "/tahap-1/a/");
});

test("berkas daftar menyaring ke irisan; baris kosong dan komentar diabaikan", () => {
  const env = { UKUR_HALAMAN: tulis("# komentar\n/tahap-1/b/\n\n/\n/tidak-ada/\n"), UKUR_DIST: TANPA_DIST };
  const log = console.log;
  console.log = () => {};
  try {
    assert.deepEqual(saring(SEMUA, (x) => x, { env }), ["", "tahap-1/b/"]);
    assert.deepEqual(saring(["/", "/tahap-1/a/", "/tahap-1/b/"], (x) => x, { env }), ["/", "/tahap-1/b/"]);
  } finally {
    console.log = log;
  }
});

test("berkas kosong berarti nol halaman, bukan semua", () => {
  const env = { UKUR_HALAMAN: tulis(""), UKUR_DIST: TANPA_DIST };
  const log = console.log;
  console.log = () => {};
  try {
    assert.deepEqual(saring(SEMUA, (x) => x, { env }), []);
  } finally {
    console.log = log;
  }
});

test("berkas yang tidak terbaca menggagalkan alat (exit 1), tidak diam-diam memeriksa semua", () => {
  const kode = `import { saring } from ${JSON.stringify(new URL("../tools/lib/pilih.mjs", import.meta.url).href)}; console.log(saring(["a"]).length);`;
  const p = spawnSync(process.execPath, ["--input-type=module", "-e", kode], {
    env: { ...process.env, UKUR_HALAMAN: "/tidak/ada/halaman.txt" }, encoding: "utf8",
  });
  assert.equal(p.status, 1);
  assert.match(p.stderr, /tidak terbaca/);
  assert.equal(p.stdout, "");
});

// Pagar keputusan 868: daftar yang rusak atau tidak cocok dengan dist menggagalkan alat, bukan lolos sebagai "nol halaman".
const jalankanAlat = (isi, dist) => {
  const kode = `import { saring } from ${JSON.stringify(new URL("../tools/lib/pilih.mjs", import.meta.url).href)}; console.log(saring(["", "tahap-1/a/"]).length);`;
  return spawnSync(process.execPath, ["--input-type=module", "-e", kode], {
    env: { ...process.env, UKUR_HALAMAN: tulis(isi), UKUR_DIST: dist }, encoding: "utf8",
  });
};
const distContoh = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "dist-"));
  fs.mkdirSync(path.join(d, "tahap-1/a"), { recursive: true });
  fs.writeFileSync(path.join(d, "index.html"), "<html></html>");
  fs.writeFileSync(path.join(d, "tahap-1/a/index.html"), "<html></html>");
  fs.writeFileSync(path.join(d, "404.html"), "<html></html>");
  return d;
};

test("baris yang bukan path menggagalkan alat, walau dist tidak ada", () => {
  for (const isi of ["kata aneh\n", "!!\n", "tahap-1/a/\n", "/tahap-1/a/\n/ada spasi/\n"]) {
    const p = jalankanAlat(isi, TANPA_DIST);
    assert.equal(p.status, 1, JSON.stringify(isi));
    assert.match(p.stderr, /baris bukan path/);
    assert.equal(p.stdout, "");
  }
});

test("path yang tidak ada di dist menggagalkan alat; path yang ada, beranda, dan 404.html lolos", () => {
  const d = distContoh();
  const hilang = jalankanAlat("/tahap-1/a/\n/tidak/ada/\n", d);
  assert.equal(hilang.status, 1);
  assert.match(hilang.stderr, /1 path tidak ada di .*: \/tidak\/ada\//);
  const ada = jalankanAlat("/\n/tahap-1/a/\n/404.html\n", d);
  assert.equal(ada.status, 0, ada.stderr);
  assert.match(ada.stdout, /halaman dipilih alat: 2 dari 2/);
});

test("berkas kosong tetap sah saat dist ada: nol halaman, bukan kegagalan", () => {
  const p = jalankanAlat("# hanya komentar\n\n", distContoh());
  assert.equal(p.status, 0, p.stderr);
  assert.match(p.stdout, /halaman dipilih alat: 0 dari 2/);
});
