package handler

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"
)

// Penjaga kontrak: setiap rute yang didaftarkan handler ada di openapi.yaml dan sebaliknya. Dibaca dari sumber dengan
// regexp (tanpa pustaka YAML: dependency baru butuh ADR). Tanpa penjaga ini, endpoint yang ditambah di kode lupa
// masuk kontrak, dan oasdiff tidak punya apa-apa untuk dibandingkan.

var tanpaKontrak = map[string]string{
	// Endpoint yang sengaja tidak ada di kontrak app: hanya ada di mode rentan lab (ADR 29), dan dicatat di README.
	"PUT /produk/{}/stok": "mode rentan stok-timpa (M24)",
}

func ruteKode(t *testing.T) map[string]bool {
	t.Helper()
	re := regexp.MustCompile(`mux\.HandleFunc\("([A-Z]+) ([^"]+)"`)
	berkas, _ := filepath.Glob("handler*.go")
	rute := map[string]bool{}
	for _, f := range berkas {
		if strings.HasSuffix(f, "_test.go") {
			continue
		}
		b, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		for _, m := range re.FindAllStringSubmatch(string(b), -1) {
			rute[m[1]+" "+normal(m[2])] = true
		}
	}
	return rute
}

func normal(p string) string { return regexp.MustCompile(`\{[^}]*\}`).ReplaceAllString(p, "{}") }

func ruteKontrak(t *testing.T) map[string]bool {
	t.Helper()
	b, err := os.ReadFile("../../openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	rute := map[string]bool{}
	path := ""
	inPaths := false
	for _, l := range strings.Split(string(b), "\n") {
		switch {
		case l == "paths:":
			inPaths = true
		case inPaths && l == "components:":
			inPaths = false
		case inPaths && regexp.MustCompile(`^  /\S*:$`).MatchString(l):
			path = normal(strings.TrimSuffix(strings.TrimSpace(l), ":"))
		case inPaths && regexp.MustCompile(`^    (get|post|put|patch|delete):`).MatchString(l):
			rute[strings.ToUpper(strings.TrimSuffix(strings.Fields(l)[0], ":"))+" "+path] = true
		}
	}
	return rute
}

func TestRuteHandlerSamaDenganOpenAPI(t *testing.T) {
	kode, kontrak := ruteKode(t), ruteKontrak(t)
	if len(kode) < 40 || len(kontrak) < 40 {
		t.Fatalf("terlalu sedikit rute terbaca (kode %d, kontrak %d): pola pembacaan rusak", len(kode), len(kontrak))
	}
	var tanpaDiKontrak, tanpaDiKode []string
	for r := range kode {
		if !kontrak[r] && tanpaKontrak[r] == "" {
			tanpaDiKontrak = append(tanpaDiKontrak, r)
		}
	}
	for r := range kontrak {
		if !kode[r] {
			tanpaDiKode = append(tanpaDiKode, r)
		}
	}
	sort.Strings(tanpaDiKontrak)
	sort.Strings(tanpaDiKode)
	if len(tanpaDiKontrak) > 0 {
		t.Errorf("rute di kode tetapi tidak di openapi.yaml: %v", tanpaDiKontrak)
	}
	if len(tanpaDiKode) > 0 {
		t.Errorf("rute di openapi.yaml tetapi tidak di kode: %v", tanpaDiKode)
	}
}
