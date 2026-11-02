package main

import (
	"context"
	"errors"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"testing"

	"lab/apit5/internal/identitas"
	"lab/apit5/internal/service"
)

// Pemindai sumber (ADR 53): setiap rute ledger di versi benar melewati identitas.Wajib. Tes perilaku di ledger_test.go
// hanya menguji rute yang sudah dikenal; rute baru yang dipasang tanpa pembungkus lolos dari semuanya (tinjauan
// PR 489: satu rute tambahan tanpa pembungkus tidak menggagalkan tes mana pun). Satu-satunya pengecualian di versi benar
// adalah GET /healthz. Mode rentan memasang rute yang sama tanpa pembungkus.

type pemasangan struct {
	pola    string
	bungkus bool // argumen kedua adalah panggilan identitas.Wajib
	rentan  bool // dipasang di dalam blok `if rentan`
}

func jenisPanggilanRute(c *ast.CallExpr) (string, bool) {
	s, ok := c.Fun.(*ast.SelectorExpr)
	if !ok || (s.Sel.Name != "Handle" && s.Sel.Name != "HandleFunc") {
		return "", false
	}
	return s.Sel.Name, true
}

// pasanganRute membaca semua berkas non-tes di paket ini. Pemasangan rute di luar fungsi rute(), dan pemasangan yang
// tidak terbaca pemindai (di dalam blok lain), menggagalkan tes: lebih baik pemindai ditambah daripada rute lolos diam-diam.
func pasanganRute(t *testing.T) []pemasangan {
	t.Helper()
	berkas, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}
	var hasil []pemasangan
	fset := token.NewFileSet()
	for _, nama := range berkas {
		if strings.HasSuffix(nama, "_test.go") {
			continue
		}
		src, err := os.ReadFile(nama)
		if err != nil {
			t.Fatal(err)
		}
		f, err := parser.ParseFile(fset, nama, src, 0)
		if err != nil {
			t.Fatal(err)
		}
		for _, d := range f.Decls {
			fd, ok := d.(*ast.FuncDecl)
			if !ok {
				continue
			}
			total := 0
			ast.Inspect(fd, func(n ast.Node) bool {
				if c, ok := n.(*ast.CallExpr); ok {
					if _, ok := jenisPanggilanRute(c); ok {
						total++
					}
				}
				return true
			})
			if fd.Name.Name != "rute" {
				if total > 0 {
					t.Errorf("%s: fungsi %s memasang rute; semua rute dipasang di rute()", nama, fd.Name.Name)
				}
				continue
			}
			awal := len(hasil)
			var jalan func(stmts []ast.Stmt, rentan bool)
			jalan = func(stmts []ast.Stmt, rentan bool) {
				for _, st := range stmts {
					switch v := st.(type) {
					case *ast.IfStmt:
						if id, ok := v.Cond.(*ast.Ident); ok && id.Name == "rentan" {
							jalan(v.Body.List, true)
						}
					case *ast.ExprStmt:
						c, ok := v.X.(*ast.CallExpr)
						if !ok {
							continue
						}
						if _, ok := jenisPanggilanRute(c); !ok || len(c.Args) != 2 {
							continue
						}
						lit, ok := c.Args[0].(*ast.BasicLit)
						if !ok || lit.Kind != token.STRING {
							t.Errorf("rute dengan pola yang bukan literal string: %v", c.Args[0])
							continue
						}
						pola, _ := strconv.Unquote(lit.Value)
						bungkus := false
						if k, ok := c.Args[1].(*ast.CallExpr); ok {
							if sel, ok := k.Fun.(*ast.SelectorExpr); ok {
								if x, ok := sel.X.(*ast.Ident); ok && x.Name == "identitas" && sel.Sel.Name == "Wajib" {
									bungkus = true
								}
							}
						}
						hasil = append(hasil, pemasangan{pola, bungkus, rentan})
					}
				}
			}
			jalan(fd.Body.List, false)
			if len(hasil)-awal != total {
				t.Errorf("rute() memuat %d pemasangan rute, pemindai hanya membaca %d: ada yang dipasang di dalam blok yang tidak dikenal pemindai", total, len(hasil)-awal)
			}
		}
	}
	return hasil
}

func TestSemuaRuteLedgerLewatIdentitasKecualiHealthz(t *testing.T) {
	var benar, rentan []string
	for _, r := range pasanganRute(t) {
		switch {
		case r.rentan:
			if r.bungkus {
				t.Errorf("mode rentan memasang %s dengan identitas.Wajib; mode itu memerankan ledger tanpa pemeriksa", r.pola)
			}
			rentan = append(rentan, r.pola)
		case r.pola == "GET /healthz":
			if r.bungkus {
				t.Errorf("%s dibungkus identitas.Wajib; healthz tidak membuat jurnal dan tidak memerlukannya", r.pola)
			}
		default:
			if !r.bungkus {
				t.Errorf("rute %s di versi benar tidak dibungkus identitas.Wajib", r.pola)
			}
			benar = append(benar, r.pola)
		}
	}
	sort.Strings(benar)
	sort.Strings(rentan)
	if len(benar) < 2 {
		t.Fatalf("pemindai menemukan %d rute berpemeriksa, ingin paling sedikit 2 (topup dan tahan): %v", len(benar), benar)
	}
	if fmt.Sprint(benar) != fmt.Sprint(rentan) {
		t.Errorf("rute versi benar %v dan rute mode rentan %v harus sama: mode rentan hanya melepas pemeriksa", benar, rentan)
	}
}

// GET /healthz mengikuti database: tanpa jawaban ping dijawab 503, bukan "ok" (dua mode memasangnya sama).
func TestHealthzMengikutiDatabase(t *testing.T) {
	for _, rentan := range []bool{false, true} {
		for _, mati := range []bool{false, true} {
			ping := func(context.Context) error {
				if mati {
					return errors.New("database mati")
				}
				return nil
			}
			mux := rute(service.Service{}, rentan, identitas.IzinNaskah, identitas.DomainBawaan, false, nil, ping)
			rec := httptest.NewRecorder()
			mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
			want := http.StatusOK
			if mati {
				want = http.StatusServiceUnavailable
			}
			if rec.Code != want {
				t.Errorf("rentan=%t database mati=%t: healthz %d, ingin %d", rentan, mati, rec.Code, want)
			}
		}
	}
}

// Mode rentan M47 memerankan ledger tanpa pemeriksa pada KEDUA rute: kartu/tahan juga menerima pemanggil tanpa identitas.
func TestModeRentanKartuTahanJugaTanpaIdentitas(t *testing.T) {
	l := siapkan(t, true)
	isiSaldo(t, l, 100000)
	id := "AUTH-" + order()
	s, isi := l.panggil(t, "", "/ledger/kartu/tahan", id, fmt.Sprintf(`{"id_penerbit":%q,"akun_id":%d,"jumlah":50000}`, id, l.akun))
	if s != 201 {
		t.Fatalf("mode rentan, kartu/tahan tanpa sertifikat: %d %s, ingin 201", s, isi)
	}
	var jenis string
	if err := l.db.QueryRow(`SELECT jenis FROM jurnal WHERE keterangan LIKE '%' || $1 || '%'`, id).Scan(&jenis); err != nil || jenis != JenisTahan {
		t.Errorf("jurnal dari kartu/tahan berjenis %q (%v), ingin %s", jenis, err, JenisTahan)
	}
}

// Tanpa Idempotency-Key kedua rute menjawab 400 di pintu masuk, sebelum service dipanggil, dan tidak ada jurnal. Identitas
// yang sah tidak menggantikan key: key mencegah pemrosesan ganda, identitas menjawab siapa yang memanggil.
func TestTanpaIdempotencyKeyDitolakDiPintuMasuk(t *testing.T) {
	l := siapkan(t, false)
	isiSaldo(t, l, 100000)
	for _, k := range []struct{ jalan, badan string }{
		{"/ledger/jurnal-topup", badanTopup("TB-TANPA-KEY", l.akun)},
		{"/ledger/kartu/tahan", fmt.Sprintf(`{"id_penerbit":"AUTH-TANPA-KEY","akun_id":%d,"jumlah":50000}`, l.akun)},
	} {
		s, isi := l.panggil(t, "pembayaran", k.jalan, "", k.badan)
		if s != http.StatusBadRequest || !strings.Contains(isi, "idempotency-key-wajib") {
			t.Errorf("%s tanpa key: %d %s, ingin 400 idempotency-key-wajib", k.jalan, s, isi)
		}
	}
	var n int
	if err := l.db.QueryRow(`SELECT count(*) FROM jurnal WHERE keterangan LIKE '%TANPA-KEY%'`).Scan(&n); err != nil || n != 0 {
		t.Errorf("jurnal untuk permintaan tanpa key: %d (%v)", n, err)
	}
}
