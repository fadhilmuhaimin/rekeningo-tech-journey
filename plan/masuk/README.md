# Catatan masuk dari PR subagen

Satu file per PR: `plan/masuk/<branch-dengan-strip>.md` (mis. `tahap-2-prd-v2.md`), berisi bagian `## KEPUTUSAN` (baris tabel 5 kolom seperti plan/KEPUTUSAN.md) dan `## SETELAH-TAHAP-N` (polesan satu baris, diawali `- `). Pengatur melipatnya dengan `python3 tools/lipat_masuk.py` di PR catat (keputusan 564). Gerbang menjalankan `--cek`: format sah dan nomor tidak ganda.
