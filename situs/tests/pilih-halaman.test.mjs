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
  const env = { UKUR_HALAMAN: tulis("# komentar\n/tahap-1/b/\n\n/\n/tidak-ada/\n") };
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
  const env = { UKUR_HALAMAN: tulis("") };
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
