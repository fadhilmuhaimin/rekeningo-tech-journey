---
name: evaluasi-tahap
description: Kartu nilai akhir satu tahap Rekeningo Tech Journey - delapan butir YA/TIDAK (W1–W8) masing-masing dengan satu baris bukti yang bisa diulang (perintah dan keluarannya, nomor PR, path tangkapan), tiga pertanyaan pembaca di tiga halaman acak, dan satu uji baca oleh pembaca segar. Gunakan skill ini SETIAP KALI sebuah tahap selesai ditulis (langkah EVALUASI), saat menulis plan/EVALUASI-TAHAP-N.md, saat evaluasi ulang sesudah putaran perbaikan, dan saat memindahkan sisa temuan ke plan/TINJAUAN-PEMILIK.md.
---

# Evaluasi tahap

Tujuan: menyatakan sebuah tahap selesai dengan bukti yang bisa diulang orang lain, bukan dengan kesan. Evaluasi dikerjakan satu subagent yang tidak menulis halaman tahap itu. Kartu nilai bukan pengganti gerbang; gerbang hijau adalah syarat minimum, kartu nilai memeriksa hal yang gerbang tidak lihat.

## Pemilihan acak yang bisa diulang

Halaman acak dipilih dengan seed nomor tahap, supaya evaluasi ulang memeriksa halaman yang sama:

```
python3 -c "import json,random; h=[x for x in json.load(open('situs/data/cerita.json'))['halaman'] if str(x.get('id','')).startswith('N.')]; random.seed(N); print([x['id'] for x in random.sample(h,5)])"
```

Lima halaman pertama untuk axe (W4), tiga pertama untuk pertanyaan pembaca. Sesuaikan kunci (`id`, `path`) dengan isi registry saat itu dan tulis perintah persisnya di kartu.

## Delapan butir

| Butir | Pertanyaan | Bukti minimum |
| --- | --- | --- |
| W1 | Semua halaman di peta naskah ada dan hijau di CI | Tabel peta naskah lawan registry (nomor, judul, jenis, ★, lab; 0 "segera"), `gh run list --branch main --workflow cek --limit 1` sukses, nomor PR tiap halaman |
| W2 | Setiap angka, status, output dari rekaman lab database bersih atau berlabel | Sampel 12 angka/status dari 6 halaman, tiap angka ditelusuri ke `labs/<lab>/output/<file>` baris n, atau label Ilustrasi/Asumsi di halaman; lab yang dipakai diulang `make -C labs/<lab> cek` (atau padanannya) dan lolos |
| W3 | Audit bahasa 0 error dan tidak ada konsep di dalam adegan | Keluaran `python3 tools/audit_bahasa.py` (0 error); blok cerita 6 halaman dibaca: adegan hanya berisi kejadian dan dialog, istilah teknis dijelaskan di luar adegan |
| W4 | Layar pertama 4 ukuran, kontras 2 mode, axe 0 di 5 halaman acak | Baris `layar.mjs` dari gerbang, `tools/contrast.py` gelap dan terang, axe-core lewat Playwright di 5 halaman × 2 mode (pola `situs/tools/ukur-diagram.mjs`; evaluasi pertama yang belum punya alat membuat `situs/tools/ukur-axe.mjs --path ...` dan evaluasi berikutnya memakainya) |
| W5 | Setiap blok Coba punya tebak dulu dan ubah satu hal | Daftar semua halaman konsep tahap ini: komponen di blok Coba, apakah ada pilihan tebakan sebelum hasil, apakah ada satu masukan yang bisa diubah pembaca |
| W6 | Setiap ADR punya ≥ 3 opsi dan "kapan salah" | Daftar ADR tahap ini: jumlah opsi, ada pre-mortem, ada "kapan keputusan ini salah", ada kasus/sumber |
| W7 | ERD tahap ini dari skema lab, berdampingan dengan sebelumnya | `python3 tools/erd.py --cek` lolos, `situs/data/erd/tahap-N.json` ada, widget ERD di halaman skema tahap ini memakai mode bandingkan N-1 dan N |
| W8 | Jalur Berikutnya dari halaman pertama sampai jembatan tahap berikutnya tanpa 404 | Skrip yang mengikuti tautan Berikutnya dari halaman N.1 di `situs/dist` sampai halaman jembatan; daftar langkah dan status tiap tautan; `python3 tools/cek_tautan.py` lolos |

Cara W4: axe dijalankan dengan `runOnly` tag `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` seperti `ukur-diagram.mjs`; tanpa tag itu rule target-size (SC 2.5.8) tidak berjalan. Sebelum `axe.run`, semua `<details>` dibuka dan halaman digulir sampai island hidup (pola `ukur-luapan.mjs`), di 375×667 dan 1366×657. axe 0 belum membuktikan halaman aksesibel: satu halaman acak juga diuji dengan keyboard saja dari atas sampai Berikutnya terakhir, dan kontrol yang tidak tercapai atau fokusnya tidak terlihat dicatat (plan/RISET-SKILL.md 12–13).

- W4: kartu menulis N terukur dari M untuk `layar.mjs`. Halaman tanpa Inti dicetak "info" dan tidak diukur (Tahap 2: 20 dari 33, 13 tanpa Inti). Bila `situs/tools/ukur-axe.mjs` ada, axe berjalan di seluruh halaman tahap (`--semua --awalan /tahap-N/`; Tahap 2: 132 run dalam 24,7 detik), menggantikan lima halaman acak di tabel. Lima halaman acak hanya dipakai bila alat itu belum ada.
- Alat bukti yang dibuat atau diubah di evaluasi ini punya uji diri yang gagal bila alatnya dimutasi; tanpa uji diri, buktinya tidak dihitung. Alat gerbang yang sudah ada tetap dipakai; kartu mencatat bila ia tidak punya uji diri. `eval-keyboard.mjs` versi pertama menganggap `:focus-visible` sebagai tanda fokus dan lolos palsu, sampai uji diri (tanda fokus dimatikan) membuatnya gagal (keputusan 753). `ukur-axe.mjs` membawa uji diri dengan fixture berisi lima pelanggaran (#283).
- W2: label dibandingkan dengan definisi di gaya-bahasa, bukan hanya dihitung ada. Dari angka sampel, paling sedikit tiga yang berlabel diperiksa terhadap definisi itu. Label Rekaman lab pada hasil rumus yang masukannya Asumsi dihitung salah. Contoh: tabel Little di 2.30 menulis "(W: Rekaman lab)", sehingga L terbaca rekaman (#341); kartu 2.32 menyebut bacaan atas naskah sebagai "didukung rekaman" (#351).
- W5: kartu mencatat keluaran `python3 tools/eval_tahap.py bocor N` (jawaban tebakan yang sudah tertulis sebelum blok Coba) dan tebakan yang tidak menyembunyikan hasil (lipatan, TabSet). Catatan itu tidak mengubah YA atau TIDAK butir ini, karena Inti hasil-dulu adalah desain pemilik sampai pemilik memutuskan (2.12, 2.14, 2.16; TINJAUAN-PEMILIK butir 3). Halaman rekap dan pilah tetap ada di daftar dengan alasan jenisnya, tidak dikecualikan.
- W8: langkah sesudah halaman jembatan juga diperiksa. Berikutnya dari jembatan tidak boleh menuju halaman bertanda `lama`, `diganti_oleh`, atau `lebur_ke`; `python3 tools/eval_tahap.py rantai N` mencetaknya. Tahap 2: 2.33 menuju "Tahap 2 · Ceritanya", lalu delapan halaman lama (tugas EVAL2-F1).

W1–W4 wajib YA. Satu butir = satu baris bukti di kartu; bukti yang tidak bisa diulang (mis. "sudah dilihat") tidak dihitung.

## Pertanyaan pembaca dan uji baca

- Tiga halaman acak (seed di atas), tangkapan 375×667 dibuka: jawab "di mana saya, dari mana saya datang, ke mana selanjutnya" dalam satu kalimat masing-masing, dengan elemen yang menjawabnya (breadcrumb, judul, Berikutnya).
- Uji baca: satu subagent baru yang belum pernah melihat tahap ini membaca jalur inti (halaman ★ berurutan, dari `situs/dist` atau sumber MDX) dan menulis tepat 5 hal yang membingungkan, masing-masing dengan halaman dan kalimatnya. Subagent itu tidak diberi tahu apa yang dicari.

## Setelah kartu

1. Semua YA: tahap selesai. Tulis kartu, lanjut ke perbaikan diri dan tahap berikutnya.
2. Ada TIDAK: satu putaran perbaikan, paling banyak 3 tugas (kategori rusak, aksesibilitas, kontras, gerbang gagal, atau butir W yang gagal), lalu evaluasi ulang SEKALI dengan seed yang sama. Sesudah itu tahap dinyatakan selesai apa pun hasilnya.
3. Butir yang tetap TIDAK dan 5 hal membingungkan disalin ke `plan/TINJAUAN-PEMILIK.md` bagian tahap itu, diurutkan dari yang paling berat, dengan bukti.
4. Polesan yang ditemukan (bukan kategori di atas) masuk "Setelah rilis" (`plan/SETELAH-TAHAP-N.md`), tidak jadi tugas.

## Format `plan/EVALUASI-TAHAP-N.md`

```
# Evaluasi Tahap N · <nama>
Dievaluasi <tanggal> oleh subagent evaluasi (skill evaluasi-tahap). Seed acak: N. Putaran: 1 (atau 2 sesudah perbaikan).

## Kartu nilai
| Butir | Hasil | Bukti (perintah → keluaran, PR, tangkapan) |
| W1 | YA | 33/33 di registry, 0 segera; run cek main 123456 success; PR #270–#305 |
...

## Pertanyaan pembaca
| Halaman | Di mana | Dari mana | Ke mana |

## Uji baca: 5 hal membingungkan
1. <halaman>: "<kalimat>" — kenapa membingungkan

## Putaran perbaikan
<tugas yang dibuat (≤ 3) dan hasil evaluasi ulang, atau "tidak perlu">

## Ke TINJAUAN-PEMILIK
<butir yang tetap TIDAK dan 5 hal membingungkan, atau "tidak ada">
```

<examples>
<example>
Buruk: "| W2 | YA | Angka sudah dicek dan sesuai lab |"
Baik: "| W2 | YA | 12/12: 2.10 'Rp−20.000' ← labs/b3-race/output/ledger/rentan.txt:41; 2.15 '±30 ms' berlabel Ilustrasi; ... `make -C labs/b3-race cek-ledger` → identik |"
</example>
<example>
Buruk: "| W4 | YA | Tampilan bagus di HP |"
Baik: "| W4 | TIDAK | axe 2.17 terang: 1 color-contrast (.chip--sumber 3,9:1); 4 halaman lain 0; layar.mjs 33×4 lolos; contrast.py 2 mode lolos |" lalu tugas perbaikan kontras dibuat.
</example>
<example>
Buruk: uji baca dikerjakan subagent yang sama yang menulis halaman, dengan arahan "cari bagian yang kurang jelas di 2.11".
Baik: subagent baru diberi daftar halaman ★ dan diminta membaca berurutan lalu menulis 5 hal yang membingungkan; ia menemukan "2.12 memakai 'snapshot' sebelum menjelaskannya".
</example>
</examples>
