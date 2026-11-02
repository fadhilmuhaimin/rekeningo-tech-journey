package jejak

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

// ID trace berurutan (hanya lab): sama untuk nama dan urutan yang sama, berbeda antar nama dan antar urutan, dan tidak nol.
func TestIDUrutTetapPerNamaDanBerbedaAntarNama(t *testing.T) {
	a1, a2 := &idUrut{nama: "pembayaran"}, &idUrut{nama: "pembayaran"}
	b := &idUrut{nama: "notifikasi"}
	ctx := context.Background()
	lihat := map[string]bool{}
	for i := 0; i < 50; i++ {
		x, _ := a1.NewIDs(ctx)
		y, _ := a2.NewIDs(ctx)
		z, _ := b.NewIDs(ctx)
		if x != y {
			t.Fatalf("urutan %d: dua generator bernama sama menghasilkan ID berbeda", i+1)
		}
		if !x.IsValid() || x == z {
			t.Fatalf("urutan %d: ID tidak sah atau sama dengan ID service lain", i+1)
		}
		if lihat[x.String()] || lihat[z.String()] {
			t.Fatalf("urutan %d: ID berulang", i+1)
		}
		lihat[x.String()], lihat[z.String()] = true, true
	}
}

// traceparent: span client di service pertama dan span server di service kedua memakai satu trace, dan span server
// beranak span client. Dua provider terpisah memerankan dua proses; header yang dibawa adalah traceparent W3C.
func TestTraceparentMerambatDariClientKeServer(t *testing.T) {
	rekamClient, rekamServer := tracetest.NewSpanRecorder(), tracetest.NewSpanRecorder()
	tpClient := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(rekamClient))
	tpServer := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(rekamServer))
	prop := propagation.TraceContext{}
	var header string
	srv := httptest.NewServer(otelhttp.NewHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header = r.Header.Get("traceparent")
		io.WriteString(w, "ok")
	}), "ledger", otelhttp.WithTracerProvider(tpServer), otelhttp.WithPropagators(prop)))
	defer srv.Close()
	tr := otelhttp.NewTransport(http.DefaultTransport, otelhttp.WithTracerProvider(tpClient), otelhttp.WithPropagators(prop))
	c := &http.Client{Transport: tr}
	ctx, akar := tpClient.Tracer("uji").Start(context.Background(), "akar")
	req, _ := http.NewRequestWithContext(ctx, "POST", srv.URL, strings.NewReader("{}"))
	res, err := c.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	akar.End()
	if !strings.HasPrefix(header, "00-"+akar.SpanContext().TraceID().String()+"-") {
		t.Fatalf("header traceparent %q tidak memuat trace id akar %s", header, akar.SpanContext().TraceID())
	}
	cs, ss := rekamClient.Ended(), rekamServer.Ended()
	var client sdktrace.ReadOnlySpan
	for _, s := range cs {
		if s.Name() != "akar" {
			client = s
		}
	}
	if client == nil || len(ss) != 1 {
		t.Fatalf("span client %v, span server %d", client != nil, len(ss))
	}
	if ss[0].SpanContext().TraceID() != client.SpanContext().TraceID() || ss[0].Parent().SpanID() != client.SpanContext().SpanID() {
		t.Errorf("span server: trace %s induk %s; ingin trace %s induk %s (span client)", ss[0].SpanContext().TraceID(), ss[0].Parent().SpanID(),
			client.SpanContext().TraceID(), client.SpanContext().SpanID())
	}
}

// Pasang memasang propagator W3C Trace Context sebagai propagator global: tanpa itu service tidak menulis dan tidak
// membaca traceparent, dan tiap service memulai trace sendiri.
func TestPasangMemasangPropagatorTraceContext(t *testing.T) {
	tutup, err := Pasang(context.Background(), "uji", "127.0.0.1:1", false)
	if err != nil {
		t.Fatal(err)
	}
	defer tutup(context.Background())
	if f := otel.GetTextMapPropagator().Fields(); len(f) == 0 || f[0] != "traceparent" {
		t.Errorf("propagator global memuat %v, ingin traceparent", f)
	}
}
