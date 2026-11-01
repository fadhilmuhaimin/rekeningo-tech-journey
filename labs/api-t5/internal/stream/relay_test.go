package stream

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/twmb/franz-go/pkg/kgo"

	"lab/apit5/internal/repo"
)

// Baris outbox `bayar` menjadi satu rekaman di pembayaran.tercatat, berkunci nomor merchant, dengan event_id dari kolom
// notifikasi_id baris itu (bukan nomor baris) dan payload yang utuh. Cabang ini tidak memakai database.
func TestRekamanBayarBerkunciMerchantDenganEventID(t *testing.T) {
	n := repo.Notifikasi{ID: 77, NotifikasiID: "c6f0e1a2-0000-4000-8000-000000000001", Jenis: "bayar",
		Payload: []byte(`{"jurnal":10201,"merchant":418,"pembayar":10001,"nominal":10000}`)}
	recs, err := (&Relay{}).rekaman(context.Background(), n)
	if err != nil || len(recs) != 1 {
		t.Fatalf("rekaman %d, galat %v", len(recs), err)
	}
	if recs[0].Topic != TopikPembayaran || string(recs[0].Key) != "418" {
		t.Fatalf("topik %q kunci %q, harus %q dan 418", recs[0].Topic, recs[0].Key, TopikPembayaran)
	}
	var isi map[string]any
	if err := json.Unmarshal(recs[0].Value, &isi); err != nil {
		t.Fatal(err)
	}
	if isi["event_id"] != n.NotifikasiID {
		t.Fatalf("event_id %v, harus notifikasi_id %s", isi["event_id"], n.NotifikasiID)
	}
	for k, want := range map[string]float64{"jurnal": 10201, "merchant": 418, "pembayar": 10001, "nominal": 10000} {
		if isi[k] != want {
			t.Fatalf("payload %s = %v, harus %v", k, isi[k], want)
		}
	}
}

func TestRekamanTanpaMerchantAtauJenisAsingDitolak(t *testing.T) {
	r := &Relay{}
	for _, n := range []repo.Notifikasi{
		{ID: 1, Jenis: "bayar", Payload: []byte(`{"jurnal":1}`)},
		{ID: 2, Jenis: "bayar", Payload: []byte(`tidak json`)},
		{ID: 3, Jenis: "topup", Payload: []byte(`{"merchant":1}`)},
	} {
		if recs, err := r.rekaman(context.Background(), n); err == nil || len(recs) != 0 {
			t.Fatalf("baris %d (%s) diterima: %d rekaman, galat %v", n.ID, n.Jenis, len(recs), err)
		}
	}
}

// Pengumuman memakai partisi yang ditulis relay (satu rentang satu partisi). Topik pembayaran memakai hash kunci: kunci
// yang sama selalu di partisi yang sama, dan nomor partisi di rekaman tidak dipakai.
func TestPartisionerPengumumanManualPembayaranHashKunci(t *testing.T) {
	manual := Partisioner{}.ForTopic(TopikPengumuman)
	for p := int32(0); p < 6; p++ {
		if got := manual.Partition(&kgo.Record{Partition: p, Key: []byte("shard-x")}, 6); got != int(p) {
			t.Fatalf("pengumuman: rekaman di partisi %d dipindah ke %d", p, got)
		}
	}
	hash := Partisioner{}.ForTopic(TopikPembayaran)
	pertama := hash.Partition(&kgo.Record{Key: []byte("418")}, 3)
	if pertama < 0 || pertama >= 3 {
		t.Fatalf("partisi %d di luar 0 sampai 2", pertama)
	}
	for _, p := range []int32{0, 1, 2} {
		if got := hash.Partition(&kgo.Record{Key: []byte("418"), Partition: p}, 3); got != pertama {
			t.Fatalf("kunci 418 jatuh di partisi %d lalu %d (nomor partisi di rekaman dipakai)", pertama, got)
		}
	}
}
