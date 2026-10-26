---
name: riset-tahap
description: Cara meriset satu tahap Rekeningo Tech Journey sebelum naskah, lab, atau halamannya ditulis - konsep per konsep ke sumber primer dengan versi dan tanggal, teknik terbaru yang masuk dan yang sengaja tidak masuk, satu kasus industri nyata untuk ADR, jebakan dari forum praktisi sebagai bahan "yang Raka kira", dan angka beban yang dihitung ulang dengan rumus PROPOSAL. Gunakan skill ini SETIAP KALI memulai tahap baru (langkah RISET), saat menulis plan/RISET-TAHAP-N.md, saat naskah atau halaman butuh klaim yang belum ada di riset tahapnya, atau saat evaluasi menemukan klaim tanpa jejak.
---

# Riset tahap

Tujuan: setiap klaim di naskah dan halaman tahap N bisa ditelusuri ke satu baris di `plan/RISET-TAHAP-N.md` atau berlabel [perlu verifikasi]. Riset dikerjakan SEBELUM naskah, supaya cerita dibangun di atas cara sistem sungguhan berperilaku, bukan sebaliknya. Hierarki bukti dan format klaim mengikuti skill analisis-kritis; skill ini mengatur cakupan dan bentuk hasilnya.

## Bahan yang dibaca dulu (jangan diriset ulang)

1. `plan/RINGKAS.md` dan naskah tahap sebelumnya bagian "Jembatan" dan "Yang dibawa keluar": masalah yang diwariskan.
2. `plan/PROPOSAL.md` baris tahap ini di "Enam tahap dalam satu tabel", "Scaling: urutan yang diajarkan", "Teknik terbaru", dan bagian keamanan tahap ini. PROPOSAL adalah keputusan final; riset tidak membukanya ulang, hanya mencatat bila sumber primer sekarang berbeda.
3. Registry `situs/data/cerita.json` `tahap[N-1]` (`asumsi`, `skala`, `arsitektur`): angka yang sudah dipakai halaman lain.
4. Halaman lama tahap ini (`lama: true`) dan lab yang sudah ada di `labs/`: isinya bahan, klaimnya tetap dicek ulang.

## Prosedur

1. **Daftar konsep.** Tulis 8–15 konsep yang akan diajarkan tahap ini, masing-masing satu frasa dan masalah yang memicunya (M-nomor bila sudah ada). Konsep yang tidak dipicu masalah atau fitur PRD dibuang.
2. **Sumber primer per konsep (1–3).** Dokumentasi resmi dengan versi, RFC dengan nomor, makalah dengan tahun, postmortem resmi dengan tanggal. Buka halamannya (WebFetch), jangan mengutip dari hasil pencarian. Catat versi yang berlaku hari ini (cek npm, pkg.go.dev, rilis PostgreSQL, changelog) dan tanggal akses.
3. **Yang berubah sejak PROPOSAL (Oktober 2026).** Per konsep: rilis baru, API diganti, rekomendasi resmi berubah, draft IETF kedaluwarsa atau jadi RFC. Tidak ada perubahan juga ditulis ("tidak berubah, dicek <tanggal>").
4. **Teknik terbaru: masuk atau sengaja tidak masuk.** Untuk tiap teknik baru yang relevan: satu baris alasan dengan angka tahap ini (mis. "tidak masuk: beban 14 RPS tidak butuh sharding"). Yang tidak masuk tetap ditulis; itu bahan ADR "Sengaja belum dilakukan".
5. **Satu kasus industri nyata** untuk halaman ADR tahap ini, dari sumber primer (blog engineering perusahaan itu, postmortem resmi, makalah), bukan rangkuman pihak ketiga. Tulis apa yang mereka putuskan, angka yang mereka laporkan, dan batasnya (satu service, bukan seluruh perusahaan). Kalau sumber primer sudah hilang, pakai arsip web.archive.org dengan tanggal arsipnya.
6. **Jebakan dari forum.** 5–10 pertanyaan nyata dari Stack Overflow atau GitHub issues (judul + tautan) yang menunjukkan apa yang orang kira. Forum hanya untuk menemukan pertanyaannya; jawabannya dicek ke sumber primer di langkah 2. Ini bahan kolom "Yang dikira" dan "yang Raka kira".
7. **Angka beban dan ukuran data** dihitung ulang dengan rumus PROPOSAL dan registry (user aktif × request per user ÷ detik aktif × faktor puncak; posting per hari × ukuran baris × 365). Tulis rumusnya, setiap masukan, dan hasilnya sebagai Asumsi. Bandingkan dengan angka tahap sebelumnya; lonjakan lebih dari 10× ditulis alasannya.
8. **Keamanan tahap ini.** Ancaman yang masuk menurut PROPOSAL "Peta ancaman per lapisan", sumber primer (OWASP ASVS, CWE, RFC), dan apakah bisa direkam di container lokal. Tahap 5–6: yang tidak bisa direkam ditandai Ilustrasi.
9. **Beri nomor.** Setiap baris sumber mendapat ID `R<N>-<nn>` (R3-01, R3-02, …). Naskah, catatan halaman, ADR, dan evaluasi merujuk ID ini; teks yang dibaca pembaca tidak memuatnya (lihat Aturan).

## Format `plan/RISET-TAHAP-N.md` (paling banyak 120 baris)

```
# Riset Tahap N · <nama tahap>
Dikerjakan <tanggal>, skill riset-tahap. Versi dicek hari itu.

## Konsep dan sumber
| ID | Konsep | Sumber primer (versi, tanggal) | Yang dipakai halaman | Berubah sejak Okt 2026 |

## Teknik terbaru
| Teknik | Masuk / tidak | Alasan dengan angka tahap ini | ID |

## Kasus industri untuk ADR
<3–6 baris: siapa, apa, angka, batas, ID sumber>

## Jebakan (bahan "yang Raka kira")
| Pertanyaan forum (tautan) | Yang dikira | Yang benar (ID sumber) |

## Angka tahap ini (Asumsi)
| Besaran | Rumus | Masukan | Hasil | Tahap sebelumnya |

## Keamanan
| Ancaman | Sumber | Direkam di lab / Ilustrasi |

## Belum bisa dicek
<klaim, kenapa, [perlu verifikasi]; juga disalin ke MEMORI "Perlu dicek pemilik">
```

## Aturan

- Satu subagent riset per tahap, dengan WebSearch/WebFetch. Hasilnya ditinjau sekali oleh pengatur: tiap ID dibuka acak tiga, harus benar-benar memuat klaimnya.
- Tidak ada klaim dari ingatan. Kalau sumbernya tidak bisa dibuka, barisnya masuk "Belum bisa dicek".
- Nama merek nyata boleh di riset (sumber), tidak di cerita. Naskah memakai padanan fiktif.
- Angka industri ditulis dengan konteksnya (siapa mengukur, kapan, metode); angka tanpa konteks tidak dipakai.
- Riset tidak menulis cerita. Usulan cerita yang lahir dari riset masuk naskah draft (Tahap 3–6) atau MEMORI "Usulan perubahan cerita" (Tahap 1–2).
- Kalau halaman nanti butuh klaim yang tidak ada di riset: tambahkan barisnya ke RISET-TAHAP-N dengan ID berikutnya di PR halaman itu, jangan menulis klaim tanpa ID.
- ID riset hidup di `plan/`, badan PR, komentar kode, tes, README lab, dan field metadata yang tidak tampil (mis. `riset` di halaman-istilah JSON). Teks yang tampil ke pembaca (halaman, widget, halaman istilah) menulis nama sumber, versi, dan tanggal. `tools/cek_id_tampil.py` hanya mengenali ID halaman `[A-G]\d`, jadi tes halaman menolak pola `\bR\d-\d{2,3}\b` sampai alat itu diperluas. Tahap 2: "R2-04" tampil di halaman istilah backfill dan "R2-06" di 2.19. Tiga ID R3 tampil di teks widget pool (#352).
- Alokasi ID riset dan nomor keputusan datang per tugas dari pengatur, dalam blok yang tidak tumpang tindih. Sebelum memakai, cek ID terbesar di RISET dan di badan semua PR terbuka (`gh pr list --state open --json body`). Tahap 2: R2-36 dipakai dua PR (#281, #282); R3-61 dipakai dua PR (#342, #343).
- Dokumentasi dibuka pada versi yang dipakai lab atau halaman; bila berbeda, buka dokumen versi itu atau tulis kedua versi. Dokumen "latest" atau "current" tanpa nomor versi diberi tanggal akses. Untuk flag atau API yang deprecated, cek changelog di repositori sumber, karena salinan di host pihak ketiga bisa tertinggal. Tahap 2: bawaan `max_connections` dibaca di PostgreSQL 18.6, padahal lab memakai 17.11 (#341). Tab django-axes memakai flag deprecated sejak 6.0.0, dan salinan RTD tidak memuat penandaannya (#337). Redis `latest` ditulis tanpa versi (#346).
- Kolom Hasil angka memuat nilai tepat dan satu bentuk bulat yang dipakai semua halaman tahap itu. Halaman menghitung turunan dari bentuk yang tertulis. Tahap 2 dan 3: R3-31 hanya menulis 0,87 (tepatnya 0,868), naskah Tahap 3 menurunkan L = 1,75 dari 0,868, dan 2.33 menulis 0,87 × 2,02 = 1,75 padahal hasilnya 1,76 (#343, #353).

<examples>
<example>
Buruk: "| R3-04 | Connection pool | pgxpool docs | ukuran pool | - |"
Baik: "| R3-04 | Connection pool | pgx v5.7.x `pgxpool.Config.MaxConns`, default max(4, runtime.NumCPU()) (pkg.go.dev, diakses 2026-10-24) | 3.x pool habis saat 2 instance × 20 koneksi | tidak berubah sejak v5.0 |"
</example>
<example>
Buruk: "Teknik baru: HTTP/3 untuk API." (tanpa keputusan, tanpa alasan)
Baik: "| HTTP/3 di depan API | tidak masuk | 14 RPS puncak, latensi didominasi query (R3-06), bukan handshake; masuk akal di Tahap 5 untuk HP di jaringan buruk | R3-11 |"
</example>
<example>
Buruk: kasus industri "Discord pindah ke ScyllaDB" dikutip dari artikel Medium pihak ketiga.
Baik: kasus dari blog engineering resmi perusahaan itu dengan tanggal terbit, angka yang mereka tulis sendiri, dan batasnya ("satu cluster pesan, bukan seluruh platform"); padanan cerita Rekeningo ditulis terpisah dan berlabel Ilustrasi.
</example>
<example>
Buruk: "Puncak Tahap 3 sekitar 20 RPS."
Baik: "| RPS puncak | aktif × 6 request ÷ (8 jam × 3600) × 10 | 3.000 aktif (30% dari 10.000) | 6,25 RPS | Tahap 2: 1,4 |" dengan catatan faktor puncak 10 dari registry `tahap[2].asumsi`.
</example>
</examples>
