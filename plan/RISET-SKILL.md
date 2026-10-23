# Riset skill dari katalog plugin

Dikerjakan 2026-10-23/24 oleh subagent riset atas permintaan pemilik. Tidak ada plugin yang dipasang. Isi upstream publik dibaca sebagai teks, dan usulan di bawah belum diterapkan ke skill mana pun.

## Pencarian

- Tanggal: 2026-10-23. Pengatur mencari di katalog dengan kata kunci aksesibilitas (axe, WCAG), Playwright, PostgreSQL, keamanan aplikasi, dan penulisan teknis. SearchSkills tidak memberi hasil.
- Subagent menambah satu pencarian katalog: "technical writing", "documentation style guide", "plain language", "docs writing". Hasil barunya Writing Skills (partner) dan ISO 24495 Plain Language (komunitas).
- Hasil seluruhnya: Axe Accessibility (Deque), A11y Enforcer, Fairmind Design, Snagly, playwright (Microsoft), supabase, neon, db-migration-guard, OWASP Security Audit, code-review (Anthropic), Writing Skills, ISO 24495 Plain Language.
- Tidak ada yang dipasang. Plugin pihak ketiga yang menjalankan kode (MCP server lewat `npx`, hook, skrip) tidak dipasang di repo ini.
- Alasan tambahan: Axe butuh langganan Axe DevTools dan API key, dan hasil scan dikirim ke cloud Deque secara default. Playwright MCP memakai `@playwright/mcp@latest` tanpa versi tetap, bertentangan dengan aturan ADR dan versi pasti.
- Cara baca: file diunduh sebagai teks lewat GitHub API dan raw.githubusercontent.com ke scratchpad, tanpa dijalankan.

## Yang dibaca

| Plugin | Upstream | Dibaca | Ringkas |
| --- | --- | --- | --- |
| Axe Accessibility | github.com/dequelabs/axe-accessibility | ya: `mcp-audit`, `mcp-usage`, `references/rule-tips.md`, `.mcp.json` | Loop analyze, remediate, verify lewat Axe MCP Server 1.6.0. Rule-tips memuat aturan fokus, nama kontrol, dialog, dan alt yang tidak terlihat oleh scan statis. |
| playwright | anthropics/claude-plugins-official, `external_plugins/playwright` | ya: `.mcp.json`, `plugin.json`, README microsoft/playwright-mcp | Hanya konfigurasi MCP tanpa teks skill. README-nya menyebut server itu bukan security boundary. |
| supabase | github.com/supabase-community/supabase-plugin | ya: `supabase-postgres-best-practices` 1.1.1 (Januari 2026), 13 dari 31 file references | Aturan PostgreSQL per kategori dengan contoh SQL salah dan benar. Angka dampaknya ("10-100x faster") tidak menyebut metode. |
| neon | github.com/neondatabase/agent-skills | ya: `skills/neon-postgres/SKILL.md` | Panduan Neon: pooled atau direct, branching, inspect. Bagian "Interpret Results Safely" berlaku umum untuk membaca plan. |
| code-review | anthropics/claude-plugins-official, `plugins/code-review` | ya: `commands/code-review.md`, README | Lima reviewer paralel dengan sudut berbeda, lalu skor keyakinan 0–100 per temuan. Temuan di bawah 80 dibuang. |
| Writing Skills | github.com/surendranb/writing-skills | ya: `google-dev-docs` dengan REFERENCE.md, `plain-language` | Ringkasan gaya Google developer documentation dan plain language AS. Sebagian besar sudah ada di gaya-bahasa. |
| A11y Enforcer, Fairmind Design, Snagly, db-migration-guard, OWASP Security Audit, ISO 24495 Plain Language | tidak ada | tidak | Tidak dibaca: isi tidak publik. |

Sumber primer yang dibuka (diakses 2026-10-23/24):
- WCAG 2.2 Understanding: 1.1.1, 1.4.10, 1.4.11 (diperbarui 6 September 2026), 2.4.11 (15 Juni 2026), 2.5.3 (5 April 2026), 2.5.8 (11 Mei 2026). WAI-ARIA APG Dialog (Modal) Pattern.
- PostgreSQL 18.6: §5.5.5 Foreign Keys, §5.9 Row Security Policies, §11.12 Examining Index Usage, §13.3.4 Deadlocks, EXPLAIN.
- OWASP ASVS 5.0.0 (Mei 2025) V2.3 dan V2.4. Sumber kode axe-core 4.14.0 (`lib/rules/target-size.json`, `lib/core/utils/rule-should-run.js`) dan `doc/rule-descriptions.md`.
- Google developer documentation style guide "Link text" (diperbarui 2026-10-09) dan "UI elements". Studi Deque 10 Maret 2021 tentang cakupan uji otomatis.

## Diserap (usulan, teks persis untuk ditambahkan)

### visualisasi, Langkah 3 (aturan yang dipaksakan)

1. Uji keyboard lengkap · WCAG 2.2 SC 2.4.7, 1.4.11, 2.4.11 (w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), APG Dialog (w3.org/WAI/ARIA/apg/patterns/dialog-modal/), Deque rule-tips · menggantikan butir "Keyboard":
   "- Keyboard: Tab mencapai semua kontrol dalam urutan baca, dan status hasil memakai role="status". Fokus terlihat dengan indikator ≥ 3:1 terhadap latar (WCAG 2.2 SC 2.4.7, 1.4.11) dan tidak tertutup penuh oleh header lengket (SC 2.4.11). Panel yang menimpa isi ditutup dengan Esc, lalu fokus kembali ke tombol yang membukanya."
2. Elemen asli dan state yang ikut berubah · SC 4.1.2, Deque rule-tips ("aria-role-missing", "State findings"), playwright.dev/docs/aria-snapshots (Playwright terpasang 1.64.0) · butir baru:
   "- Kontrol memakai elemen asli (`<button>`, `<a href>`, `<details>`), bukan `<div>` dengan role. Kontrol buka-tutup dan pilihan memperbarui `aria-expanded`, `aria-pressed`, atau `aria-checked` setiap kali berubah (SC 4.1.2). Buktinya `locator.ariaSnapshot()` Playwright sebelum dan sesudah satu klik."
3. Ukuran target dan reflow · SC 2.5.8 (target-size-minimum.html), SC 1.4.10 (reflow.html). `ukur-luapan.mjs` sekarang mengukur 360 dan 375, belum 320 · butir baru:
   "- Target klik dan sentuh minimal 24×24 CSS px, atau berjarak sehingga lingkaran 24 px di tengahnya tidak menyentuh target lain (SC 2.5.8); tautan di dalam kalimat dikecualikan. Halaman tidak bergulir ke samping di lebar 320 CSS px (SC 1.4.10); diagram dan tabel data boleh digulir di dalam wadahnya sendiri."
4. Data cukup besar untuk widget plan · PostgreSQL 18 §11.12 (postgresql.org/docs/current/indexes-examine.html), Neon "Interpret Results Safely" · butir baru, berguna untuk 2.17:
   "- Widget runsql tentang index atau query plan memakai data yang cukup besar dan menulis jumlah barisnya. Di tabel kecil planner benar memilih Seq Scan (PostgreSQL 18 §11.12), jadi data 100 baris tidak menunjukkan guna index."

### gaya-bahasa, Aturan kalimat

5. Label kontrol · SC 2.5.3 (label-in-name.html), Google style "UI elements" (developers.google.com/style/ui-elements), Deque rule-tips "button-name" · butir baru:
   "- Label tombol menyebut aksinya ("Buka langkah 3", "Tutup diagram"), bukan ikonnya. Label yang terlihat menjadi awal nama aksesibelnya (WCAG 2.2 SC 2.5.3), dan prosa menyebut tombol dengan labelnya persis."
6. Teks tautan · developers.google.com/style/link-text · butir baru:
   "- Teks tautan bermakna tanpa kalimat di sekitarnya: judul halaman atau frasa deskriptif, bukan "di sini" atau "halaman ini". Dalam satu halaman, teks tautan yang sama tidak menuju dua halaman berbeda."
7. Teks untuk ilustrasi · SC 1.1.1 (non-text-content.html), Deque rule-tips "image-alt". `Ilustrasi.astro` memakai `aria-hidden="true"`, jadi teks DOM adalah satu-satunya jalan bagi screen reader · butir baru:
   "- Ilustrasi yang `aria-hidden` tidak membawa informasi sendiri: setiap angka dan siapa melihat apa juga ada di teks DOM di dekatnya. Teks alternatif menyebut pesan gambar dan tidak mengulang judul atau keterangan di sebelahnya."

### analisis-kritis, Prosedur E (meninjau kode)

8. Batas bisnis dan anti-automation · OWASP ASVS 5.0.0 V2.3.2, V2.3.4, V2.4.1 (github.com/OWASP/ASVS, `5.0/en/0x11-V2-Validation-and-Business-Logic.md`). Temuan tinjauan #256 (nama 1.000 karyawan terkumpul lewat kiriman Rp1) adalah kasus V2.4.1 · tambahan untuk butir 3:
   "Batas dari PRD (batas harian, saldo tidak negatif) dijaga server dan database, dan diuji dengan dua request bersamaan (OWASP ASVS 5.0.0 V2.3.2, V2.3.4)? Endpoint yang membuka data akun lain (cek penerima, nama di riwayat) punya batas per akun (V2.4.1)?"
9. Urutan lock dan transaction pendek · PostgreSQL 18 §13.3.4 (explicit-locking.html#LOCKING-DEADLOCKS), Supabase `lock-short-transactions` (tingkat 4). Lab api-t2 sudah memakai `ORDER BY id FOR UPDATE`; butir ini menjaga kode tahap berikutnya · tambahan untuk butir 3:
   "Baris yang dikunci bersama dikunci dalam urutan tetap (`ORDER BY id FOR UPDATE`) supaya tidak deadlock (PostgreSQL 18 §13.3.4)? Tidak ada panggilan jaringan (bank, notifikasi, HTTP) di dalam transaction yang memegang lock?"
10. Role yang dipakai lab keamanan · PostgreSQL 18 §5.9 (ddl-rowsecurity.html) · tambahan untuk butir 2:
   "Lab RLS dan hak akses berjalan sebagai role aplikasi, bukan superuser atau pemilik tabel, karena keduanya melewati RLS kecuali `FORCE ROW LEVEL SECURITY` (PostgreSQL 18 §5.9). Aturan append-only dibuktikan dengan UPDATE dan DELETE yang ditolak saat dijalankan sebagai role itu."
11. Temuan harus terbukti · `plugins/code-review/commands/code-review.md` (skor 0–100, ambang 80, satu reviewer membaca komentar PR sebelumnya), MEMORI Pelajaran 2026-10-14 (uji mutasi) · butir 6 baru:
   "6. Setiap temuan membawa bukti: tes atau mutasi yang gagal karena temuan itu, atau baris dokumentasi. Temuan tanpa bukti ditulis "dugaan" dan tidak memblok merge. Baca juga komentar tinjauan PR sebelumnya yang menyentuh file yang sama."

### evaluasi-tahap, butir W4

12. Konfigurasi dan keadaan halaman saat axe · axe-core 4.14.0 `lib/rules/target-size.json` (`enabled: false`) dan `rule-should-run.js` (rule yang mati tetap jalan bila tag-nya diminta lewat runOnly), Deque rule-tips (kontras dan target-size bergantung viewport) · tambahan untuk bukti W4:
   "axe dijalankan dengan `runOnly` tag `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` seperti `ukur-diagram.mjs`; tanpa tag itu rule target-size (SC 2.5.8) tidak berjalan. Sebelum `axe.run`, semua `<details>` dibuka dan halaman digulir sampai island hidup (pola `ukur-luapan.mjs`), di 375×667 dan 1366×657."
13. axe 0 belum cukup · studi Deque 10 Maret 2021 (deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues; vendor, tingkat 3): rata-rata 57% isu di 13.000+ halaman terdeteksi otomatis. axe-core 4.14 tidak punya rule untuk SC 2.4.7, 2.4.11, dan 1.4.10 · tambahan untuk W4:
   "axe 0 belum membuktikan halaman aksesibel, karena fokus dan urutan Tab tidak diperiksa axe. Satu halaman acak diuji dengan keyboard saja dari atas sampai Berikutnya terakhir; kontrol yang tidak tercapai atau fokusnya tidak terlihat dicatat."

## Tidak diserap dan kenapa

- Loop analyze, remediate, apply dari Axe: bergantung pada MCP server berbayar dan kredit AI. Gerbang kita sudah menjalankan axe-core lokal.
- Angka dampak Supabase ("3-5x throughput", "10x throughput"): tanpa metode dan konteks, jadi ditolak hierarki bukti analisis-kritis.
- Index untuk kolom foreign key (PostgreSQL 18 §5.5.5: FK tidak otomatis di-index): ini isi halaman, bukan aturan skill. Usul: bahan "yang Raka kira" di riset Tahap 2 untuk 2.17.
- `EXPLAIN ANALYZE` menjalankan statement, jadi UPDATE dibungkus `BEGIN` lalu `ROLLBACK` (PostgreSQL 18 EXPLAIN). Lab b2-query sudah memakai `EXPLAIN (ANALYZE, BUFFERS)` untuk SELECT; cukup dicatat di halaman yang memakai UPDATE.
- Pooled atau direct connection untuk migration (Neon): bahan Tahap 3 saat pooler masuk. Lab b5-rls sudah merekam `SET` yang tertinggal di pool.
- SECURITY DEFINER dengan `SET search_path` (Supabase): b3-ledger sudah memakai `SET search_path FROM CURRENT` dan tidak memakai SECURITY DEFINER.
- Lima agent paralel dan skor numerik (code-review): terlalu berat untuk PR satu halaman. Intinya, temuan harus terbukti, masuk butir 11.
- Google style (present tense, angka satu sampai sembilan dieja, gerund di judul) dan plain language (≤ 25 kata, sapaan langsung, poin di depan): aturan untuk bahasa Inggris atau sudah ada di gaya-bahasa.
- Playwright MCP: tidak ada teks skill, dan Playwright sudah dipakai langsung di `situs/tools/`.
