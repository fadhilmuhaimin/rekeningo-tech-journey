package main

import (
	"bytes"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/corazawaf/coraza/v3"
	"github.com/corazawaf/coraza/v3/types"
)

// nolog: aturan CRS yang bertindak tanpa mencatat (inisialisasi, penghitung skor) tidak dihitung sebagai temuan.
var nolog = regexp.MustCompile(`\bnolog\b`)

// Keputusan adalah hasil pemeriksaan WAF atas satu permintaan. Aturan memuat id aturan yang cocok (urut naik), juga
// pada mesin DetectionOnly: dari sana terbaca apa yang AKAN diblokir bila mesinnya On.
type Keputusan struct {
	Blokir bool
	Status int
	Aturan []int
	Pesan  string // pesan aturan pemblokir, mis. "Inbound Anomaly Score Exceeded (Total Score: 5)"
}

// PenjagaWAF membungkus Coraza v3.8.1 dengan CRS v4.30.0 dari folder lokal (crs/waf.conf).
type PenjagaWAF struct{ waf coraza.WAF }

// BukaWAF memuat aturan dari folder crs. mesin: "On" (blokir) atau "DetectionOnly" (hanya mencatat; mode rentan
// waf-deteksi). Aturan yang tidak bisa dimuat menghentikan gerbang: WAF yang separuh jalan lebih buruk dari yang mati.
func BukaWAF(crs, mesin string) (*PenjagaWAF, error) {
	if mesin != "On" && mesin != "DetectionOnly" {
		return nil, fmt.Errorf("mesin WAF tidak dikenal: %q", mesin)
	}
	cfg := coraza.NewWAFConfig().
		WithRootFS(os.DirFS(crs)).
		WithDirectives("Include waf.conf\nSecRuleEngine " + mesin + "\n")
	w, err := coraza.NewWAF(cfg)
	if err != nil {
		return nil, fmt.Errorf("memuat CRS dari %s: %w", crs, err)
	}
	return &PenjagaWAF{waf: w}, nil
}

// Periksa menjalankan fase 1 dan 2 (kepala dan body permintaan). Galat dari Coraza dikembalikan sebagai galat, dan
// pemanggil menolak permintaannya dengan 503. Middleware http bawaan Coraza (WrapHandler) tidak meneruskan permintaan
// yang pemrosesannya galat, tetapi juga tidak menulis jawaban: client menerima 200 kosong dan mengira permintaannya
// berhasil. Gerbang ini sengaja tidak meniru itu.
func (p *PenjagaWAF) Periksa(r *http.Request, body []byte) (Keputusan, error) {
	tx := p.waf.NewTransaction()
	defer func() {
		tx.ProcessLogging()
		_ = tx.Close()
	}()
	var k Keputusan
	if tx.IsRuleEngineOff() {
		return k, nil
	}
	it, err := proses(tx, r, body)
	if err != nil {
		return k, err
	}
	ada := map[int]bool{}
	for _, mr := range tx.MatchedRules() {
		id := mr.Rule().ID()
		if mr.Message() == "" || nolog.MatchString(mr.Rule().Raw()) { // aturan pembukuan CRS (inisialisasi, penghitung skor): bukan temuan
			continue
		}
		if !ada[id] {
			ada[id] = true
			k.Aturan = append(k.Aturan, id)
		}
		if id == 949110 {
			k.Pesan = mr.Message()
		}
	}
	sort.Ints(k.Aturan)
	if it != nil {
		k.Blokir, k.Status = true, it.Status
		if k.Status == 0 {
			k.Status = http.StatusForbidden
		}
		if k.Pesan == "" {
			k.Pesan = "aturan " + strconv.Itoa(it.RuleID)
		}
	}
	return k, nil
}

// proses mengisi variabel transaksi dari http.Request, mengikuti urutan middleware http Coraza v3.8.1
// (ProcessConnection, ProcessURI, kepala, Host, Transfer-Encoding, kepala, body).
func proses(tx types.Transaction, r *http.Request, body []byte) (*types.Interruption, error) {
	klien, port := r.RemoteAddr, 0
	if i := strings.LastIndexByte(r.RemoteAddr, ':'); i != -1 {
		klien = r.RemoteAddr[:i]
		port, _ = strconv.Atoi(r.RemoteAddr[i+1:])
	}
	tx.ProcessConnection(klien, port, "", 0)
	tx.ProcessURI(r.URL.String(), r.Method, r.Proto)
	for k, vs := range r.Header {
		for _, v := range vs {
			tx.AddRequestHeader(k, v)
		}
	}
	if r.Host != "" { // net/http memindahkan Host dari header ke r.Host
		tx.AddRequestHeader("Host", r.Host)
		tx.SetServerName(r.Host)
	}
	for _, te := range r.TransferEncoding { // net/http membuang Transfer-Encoding dari header
		tx.AddRequestHeader("Transfer-Encoding", te)
	}
	if it := tx.ProcessRequestHeaders(); it != nil {
		return it, nil
	}
	if tx.IsRequestBodyAccessible() && len(body) > 0 {
		it, _, err := tx.ReadRequestBodyFrom(bytes.NewReader(body))
		if err != nil {
			return nil, fmt.Errorf("body tidak terbaca WAF: %w", err)
		}
		if it != nil {
			return it, nil
		}
	}
	it, err := tx.ProcessRequestBody()
	if err != nil {
		return nil, fmt.Errorf("body tidak terproses WAF: %w", err)
	}
	return it, nil
}
