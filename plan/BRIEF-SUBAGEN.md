# Brief subagen mode penyelesaian penuh

Dibaca subagen pelaksana dan peninjau di setiap tugas Tahap 2–6 (keputusan 559). Pengatur menyebut di brief: id tugas, worktree, branch, port, rentang nomor keputusan, bagian naskah, batas waktu. Urutan aturan: CLAUDE.md > PROTOKOL-OTOMATIS.md > skill > prompt pemilik mode penuh > MEMORI.

Baris pembuka setiap brief: "Baca CLAUDE.md, PROTOKOL-OTOMATIS.md, dan skill yang relevan sebelum mulai; laporkan skill mana yang dipakai." Laporan tanpa daftar skill dianggap belum selesai.

## Yang berlaku untuk keduanya

- CLAUDE.md seluruhnya: `<commit>` (commit otomatis per perubahan utuh, pesan bahasa Indonesia kata kerja di depan dengan nomor keputusan, tanpa trailer Co-Authored-By, tanpa nama alat AI, tanpa emoji, tanpa force-push, branch `tahap-N/<slug>`), `<tampilan>`, `<gerbang_kualitas>`, `<larangan>`.
- PROTOKOL-OTOMATIS.md bagian c–g dan k (hemat konteks: output ke file lalu `tail`/`grep`; file > 300 baris dibaca per rentang; paling banyak dua tangkapan dibuka per tugas, HP dulu).
- ANTREAN "Definisi selesai bersama" termasuk paragraf "Mode penyelesaian penuh".
- Skill: gaya-bahasa (semua teks pembaca), visualisasi (widget, diagram, ilustrasi, layout), analisis-kritis (klaim, ADR ≥ 3 opsi + pre-mortem + kapan salah, pemilihan library, review kode), riset-tahap (riset, klaim baru), evaluasi-tahap (evaluasi).
- Sumber kebenaran: `plan/CERITA-TAHAP-N.md` untuk tahap itu (Tahap 1–2 milik pemilik, tidak diubah; usulan ke laporan), PROPOSAL.md untuk tech stack, desain visual, dan keamanan, RINGKAS.md sebagai peta, `plan/RISET-TAHAP-N.md` sebagai jejak klaim (ID `RN-nn`).
- Label kejujuran di setiap angka dan output: Rekaman lab, Ilustrasi, Tidak dijalankan, Asumsi, [perlu verifikasi].
- Pemilik tidak ditanya. Keputusan yang biasanya ditanyakan: ambil opsi paling aman dan paling mudah dibatalkan, catat di KEPUTUSAN (nomor dari rentang di brief), dan tulis di laporan baris "Diputuskan tanpa pemilik".
- Subagen tidak mengubah `plan/MEMORI.md`, `plan/STATUS.md`, `plan/KEPUTUSAN.md`, dan `plan/SETELAH-TAHAP-N.md` (pengatur). Keputusan dan polesan ditulis ke satu file unik `plan/masuk/<branch-dengan-strip>.md` dengan format di `plan/masuk/README.md`; nomor keputusan berikutnya = terbesar di rentang brief, dihitung atas KEPUTUSAN dan semua file `plan/masuk/` di origin/main dan branch sendiri; `python3 tools/lipat_masuk.py --cek` harus lolos (keputusan 564); baris keputusan TEPAT 5 kolom (`| n | tanggal | apa | kenapa | alternatif |`): sumber ditulis di dalam kolom "alternatif" atau "kenapa", bukan kolom keenam; pipe di teks ditulis `\|`; jangan menjalankan `lipat_masuk.py` tanpa `--cek` (tanpa argumen ia melipat sungguhan, keputusan 725). Di ANTREAN hanya blok tugasnya sendiri (status, percobaan, catatan) di commit penutup.
- Lab: hanya container lokal; pihak ketiga selalu tiruan lokal; rekaman dari database bersih, diulang dan dibandingkan (status, saldo, urutan; bukan waktu); lab gagal keras bila hasil meleset. Venv lab: symlink `labs/.venv` ke folder utama bila belum ada.
- Worktree baru: `bun install --cwd situs` dan font (`bash tools/get_fonts.sh`) sebelum gerbang. Gerbang: `bash tools/cek_situs.sh --layar > tmp/cek.txt 2>&1 && echo LOLOS || echo GAGAL` lalu `tail -30 tmp/cek.txt`, dengan `PORT_PREVIEW` dari brief. PR yang hanya mengubah `plan/` atau skill boleh memakai gerbang tanpa `--layar`; CI tetap menjalankan semuanya.
- CI: merge hanya bila `gh pr checks <n>` keluar 0. Job gagal di langkah "Pasang Chromium Playwright" dengan exit 124 berarti mirror apt lambat: `gh run rerun <run-id> --failed`, bukan perbaikan kode.
- Sebelum melapor: hentikan semua proses latar milikmu (watch CI, preview), dan sesudah melapor jangan menyentuh worktree lagi; worktree itu segera dipakai tugas lain.
- ATURAN MERGE peninjau (insiden jalur_inti, PR #306): sebelum `gh pr merge`, `git fetch`; bila `git merge-base --is-ancestor origin/main HEAD` gagal, JANGAN merge: `git merge origin/main`, `python3 tools/sinkron_cerita.py` dan `python3 tools/build_istilah.py` (commit bila berubah), `python3 tools/sinkron_cerita.py --check`, `python3 tools/cek_tautan.py`, `node --test`, cek rentang Snippet, push, tunggu CI hijau lagi (`gh pr checks <n>` tanpa --watch keluar 0, dan `mergeable` bukan UNKNOWN), ulangi cek ancestor. ID riset memakai pola `\d{2,3}`.
- Batas waktu: halaman, lab, widget 120 menit; lainnya 75 menit. Lewat batas: commit yang aman, push, laporkan "lanjutkan nanti" dengan langkah berikutnya.

## Pelaksana

1. Baca blok tugas di ANTREAN, bagian naskah yang disebut, halaman tetangga, tes yang menyentuhnya, dan baris RISET-TAHAP-N yang relevan.
2. Branch dari `origin/main` terbaru di worktree dari brief. Kerjakan sesuai "selesai bila".
3. Gerbang lolos, push, `gh pr create` (isi: apa yang berubah, apa yang dicek dengan potongan output, tiga pertanyaan navigasi untuk halaman, skill yang dipakai, apa yang belum; halaman diakhiri "Siap dilanjutkan dari <nomor>"), tunggu CI hijau (`gh pr checks <n> --watch --interval 30`, timeout 600000, ulangi).
4. JANGAN merge. Kembalikan tepat 6 baris: status, PR, keputusan (nomor + frasa), hal untuk pemilik (Perlu dicek pemilik / Usulan perubahan cerita / Diputuskan tanpa pemilik, atau "-"), satu pelajaran, skill yang dipakai.

## Peninjau

1. Kamu tidak menulis tugas ini. Baca diff ke file (`gh pr diff <n> > tmp/pr.diff`), lalu bagian yang perlu.
2. Periksa terhadap "selesai bila", naskah, Definisi selesai bersama, CLAUDE.md, dan skill. Wajib: jalankan ulang yang bisa diulang (gerbang penuh; lab dari database bersih); uji mutasi untuk lab dan kode (ubah satu hal, pastikan tes atau lab gagal, kembalikan); untuk halaman buka dua tangkapan (375×667 dulu) dan jawab tiga pertanyaan navigasi; cek tiga klaim acak ke sumbernya (ID riset atau rekaman); baca kode untuk yang tidak ada (validasi hilang, kasus gagal, retry tanpa batas).
3. Temuan kategori rusak, aksesibilitas, kontras, gerbang gagal, atau klaim salah: perbaiki sendiri di branch yang sama (commit terpisah, keputusan baru di file `plan/masuk/` PR itu). Polesan: satu baris di bagian `## SETELAH-TAHAP-N` file yang sama.
4. Sesudah perbaikan: gerbang ulang, push, CI hijau, `gh pr view <n> --json mergeable`. Konflik: `git merge origin/main`, selesaikan, gerbang ulang, push, CI hijau. Lalu `gh pr merge <n> --merge --delete-branch` dan pastikan run CI push di main hijau.
5. Kembalikan tepat 6 baris: status (merge / perlu pelaksana / diparkir), PR, temuan dan perbaikannya, keputusan, hal untuk pemilik, skill yang dipakai.
