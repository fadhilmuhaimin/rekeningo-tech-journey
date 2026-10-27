package repo

import "context"

// UpsertProdukImpor menulis satu baris impor katalog merchant: produk baru, atau produk bernama sama milik akun itu
// yang harga, stok, dan gambar_url-nya diganti (versi naik, ADR 29). gambar_url disimpan apa adanya; unduhannya
// dilakukan sesudah COMMIT, bukan di sini (ADR 22).
func (t Tx) UpsertProdukImpor(ctx context.Context, akun int64, nama string, harga int64, stok int, gambarURL string) error {
	var g *string
	if gambarURL != "" {
		g = &gambarURL
	}
	_, err := t.tx.ExecContext(ctx, `
		INSERT INTO produk (akun_id, nama, harga, stok, gambar_url) VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (akun_id, nama) DO UPDATE
		   SET harga = EXCLUDED.harga, stok = EXCLUDED.stok, gambar_url = EXCLUDED.gambar_url,
		       aktif = true, versi = produk.versi + 1, diubah = now()`, akun, nama, harga, stok, g)
	return err
}
