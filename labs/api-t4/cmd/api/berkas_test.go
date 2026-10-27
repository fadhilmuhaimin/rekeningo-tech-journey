package main

import (
	"context"
	"testing"

	"lab/apit4/internal/objek"
	"lab/apit4/internal/service"
)

// Klien S3 yang dibuka server membatasi bacaan satu objek ke 4 MiB: tanpa batas itu, objek yang diganti pemegang URL
// unggah di antara HEAD dan GET dibaca seluruhnya ke memori. Batas dipasang di bukaObjek (bukan di main) supaya tes ini
// bisa memeriksanya.
func TestBukaObjekS3MemasangBatasBacaEmpatKaliBatasFile(t *testing.T) {
	t.Setenv("OBJEK_S3_KUNCI", "kunci-uji")
	t.Setenv("OBJEK_S3_RAHASIA", "rahasia-uji")
	o := bukaObjek(context.Background(), nil, pilihanObjek{S3: "http://127.0.0.1:1", Bucket: "bkt"})
	s, ok := o.(objek.S3)
	if !ok {
		t.Fatalf("tipe penyimpanan %T, harus objek.S3", o)
	}
	if s.MaksBaca != 4*service.MaksBerkasIdentitas {
		t.Errorf("MaksBaca %d, harus 4 MiB (4 x %d)", s.MaksBaca, service.MaksBerkasIdentitas)
	}
	if s.Bucket != "bkt" || s.Endpoint != "http://127.0.0.1:1" || s.Kunci != "kunci-uji" || s.Rahasia != "rahasia-uji" {
		t.Errorf("setelan S3 tidak diteruskan: %+v", s)
	}
}

// Urutan pilihan: bytea (mode rentan) di atas S3, S3 di atas direktori.
func TestBukaObjekUrutanPilihanByteaLaluS3LaluDirektori(t *testing.T) {
	t.Setenv("OBJEK_S3_KUNCI", "kunci-uji")
	t.Setenv("OBJEK_S3_RAHASIA", "rahasia-uji")
	ctx := context.Background()
	if _, ok := bukaObjek(ctx, nil, pilihanObjek{Bytea: true, S3: "http://127.0.0.1:1"}).(objek.Bytea); !ok {
		t.Error("bytea harus menang atas S3")
	}
	if _, ok := bukaObjek(ctx, nil, pilihanObjek{S3: "http://127.0.0.1:1", Dir: t.TempDir()}).(objek.S3); !ok {
		t.Error("S3 harus menang atas direktori")
	}
	if d, ok := bukaObjek(ctx, nil, pilihanObjek{Dir: t.TempDir()}).(objek.Dir); !ok || d.Akar == "" {
		t.Errorf("tanpa pilihan lain: direktori, dapat %T", d)
	}
}
