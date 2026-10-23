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
