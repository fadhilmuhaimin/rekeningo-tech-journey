// Package modul memuat modul-modul modular monolith Rekeningo (ADR 37, lab t4-modul): akun, ledger (kontrak),
// pembayaran. Tiap modul punya antarmuka publik di paketnya dan bagian dalam di paket internal/ yang tidak bisa
// diimpor dari modul lain (aturan direktori internal Go). Tes batas di paket ini berjalan hanya dengan
// `-tags t4modul` dan lingkungan lab t4-modul (schema dan role per modul).
package modul
