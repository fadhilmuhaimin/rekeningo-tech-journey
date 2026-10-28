// Command agen: server MCP baca-saja untuk agen back office (lab t4-audit). Kredensial database dan token masuk dibaca
// dari lingkungan, bukan dari argumen baris perintah.
package main

import (
	"database/sql"
	"flag"
	"log"
	"log/slog"
	"net/http"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"

	"lab/t4audit-mcp/agen"
)

func main() {
	alamat := flag.String("addr", "127.0.0.1:18300", "alamat dengar")
	berstatus := flag.Bool("berstatus", false, "opsi bawaan SDK (sesi), hanya untuk membandingkan versi protokol di lab")
	flag.Parse()
	dsn, token := os.Getenv("T4A_DATABASE_URL"), os.Getenv("T4A_TOKEN_AGEN")
	if dsn == "" || token == "" {
		log.Fatal("T4A_DATABASE_URL dan T4A_TOKEN_AGEN wajib")
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(2)
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{ReplaceAttr: func(_ []string, a slog.Attr) slog.Attr {
		if a.Key == slog.TimeKey {
			return slog.Attr{}
		}
		return a
	}}))
	logger.Info("mendengar", "alamat", *alamat)
	h := agen.Handler
	if *berstatus {
		h = agen.HandlerBerstatus
	}
	log.Fatal(http.ListenAndServe(*alamat, h(agen.Gudang{DB: db}, token, logger)))
}
