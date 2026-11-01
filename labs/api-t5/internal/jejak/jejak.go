// Package jejak memasang OpenTelemetry (trace) untuk service lab t5-service: span dikirim lewat OTLP/HTTP ke Collector
// lokal, dan konteks trace dibawa antar service dengan header `traceparent` (W3C Trace Context). Hanya trace; metrik
// dan log OpenTelemetry tidak dipasang di lab ini.
package jejak

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"sync/atomic"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/trace"
)

// Pasang membuat TracerProvider untuk service `nama` dan memasangnya sebagai provider dan propagator global.
// endpoint adalah host:port OTLP/HTTP tanpa TLS (Collector lokal di container). urut=true (lab saja) membuat ID trace
// berurutan, supaya jumlah trace yang dipilih sampling berbasis hash bisa diulang tepat; di produksi ID acak. Fungsi
// pengembalian menyiram span yang tersisa dan harus dipanggil sebelum proses berhenti.
func Pasang(ctx context.Context, nama, endpoint string, urut bool) (func(context.Context) error, error) {
	exp, err := otlptracehttp.New(ctx, otlptracehttp.WithEndpoint(endpoint), otlptracehttp.WithInsecure())
	if err != nil {
		return nil, err
	}
	opsi := []sdktrace.TracerProviderOption{
		sdktrace.WithBatcher(exp, sdktrace.WithBatchTimeout(100*time.Millisecond)),
		sdktrace.WithResource(resource.NewSchemaless(attribute.String("service.name", nama))),
	}
	if urut {
		opsi = append(opsi, sdktrace.WithIDGenerator(&idUrut{nama: nama}))
	}
	tp := sdktrace.NewTracerProvider(opsi...)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.TraceContext{})
	return tp.Shutdown, nil
}

// idUrut: ID trace = 16 byte pertama SHA-256 dari nama service dan penghitung, jadi urutannya tetap tetapi bitnya
// tersebar dan keputusan sampling berbasis hash ID tidak mengikuti pola penghitung. ID span acak.
// Hanya untuk lab.
type idUrut struct {
	nama string
	n    atomic.Uint64
}

func (g *idUrut) NewIDs(context.Context) (trace.TraceID, trace.SpanID) {
	var urut [8]byte
	binary.BigEndian.PutUint64(urut[:], g.n.Add(1))
	h := sha256.Sum256(append([]byte("t5-service|"+g.nama+"|"), urut[:]...))
	var t trace.TraceID
	copy(t[:], h[:16])
	return t, spanAcak()
}

func (g *idUrut) NewSpanID(context.Context, trace.TraceID) trace.SpanID { return spanAcak() }

func spanAcak() trace.SpanID {
	var s trace.SpanID
	for s == (trace.SpanID{}) {
		if _, err := rand.Read(s[:]); err != nil {
			panic(err)
		}
	}
	return s
}
