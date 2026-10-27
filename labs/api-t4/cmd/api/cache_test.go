package main

// Tes penyusunan cache katalog dan endpoint gerbang lab (keputusan 968, tinjauan 970): gerbang hanya ada bila
// diminta, hanya bersama -lab (endpoint pelepasnya), dan endpoint pelepas tidak terdaftar tanpa gerbang.

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"lab/apit4/internal/cache"
)

func jamTes() time.Time { return time.Date(2026, 10, 25, 11, 0, 0, 0, time.UTC) }

func TestBukaCacheKatalogTanpaGerbangBawaan(t *testing.T) {
	k, err := bukaCacheKatalog("memori", 0, cache.HapusSesudah, "", 50*time.Millisecond, "", true, jamTes)
	if err != nil {
		t.Fatal(err)
	}
	if k.Gerbang != nil || k.Urut != cache.HapusSesudah || k.TTL != 5*time.Minute {
		t.Fatalf("gerbang %v, urutan %q, TTL %s (ingin tanpa gerbang, sesudah, 5m)", k.Gerbang, k.Urut, k.TTL)
	}
}

func TestBukaCacheKatalogMenolakFlagSalah(t *testing.T) {
	for nama, f := range map[string]func() error{
		"gerbang tanpa -lab": func() error {
			_, err := bukaCacheKatalog("memori", 0, cache.HapusSesudah, "", 50*time.Millisecond, "commit", false, jamTes)
			return err
		},
		"gerbang tidak dikenal": func() error {
			_, err := bukaCacheKatalog("memori", 0, cache.HapusSesudah, "", 50*time.Millisecond, "commit,tidak-ada", true, jamTes)
			return err
		},
		"urutan hapus tidak dikenal": func() error {
			_, err := bukaCacheKatalog("memori", 0, "nanti", "", 50*time.Millisecond, "", true, jamTes)
			return err
		},
		"mode tidak dikenal": func() error {
			_, err := bukaCacheKatalog("lokal", 0, cache.HapusSesudah, "", 50*time.Millisecond, "", true, jamTes)
			return err
		},
		"redis tanpa alamat": func() error {
			_, err := bukaCacheKatalog("redis", 0, cache.HapusSesudah, "", 50*time.Millisecond, "", true, jamTes)
			return err
		},
		"redis tanpa batas waktu": func() error {
			_, err := bukaCacheKatalog("redis", 0, cache.HapusSesudah, "127.0.0.1:1", 0, "", true, jamTes)
			return err
		},
	} {
		if f() == nil {
			t.Errorf("%s: harus ditolak", nama)
		}
	}
	k, err := bukaCacheKatalog("memori", 0, cache.HapusSesudah, "", 50*time.Millisecond, "commit,isi", true, jamTes)
	if err != nil || k.Gerbang == nil {
		t.Fatalf("gerbang commit,isi bersama -lab harus diterima: %v", err)
	}
}

func lepasGerbang(rute *http.ServeMux, nama string) int {
	r := httptest.NewRecorder()
	rute.ServeHTTP(r, httptest.NewRequest("POST", "/lab/gerbang/lepas", strings.NewReader(`{"nama":"`+nama+`"}`)))
	return r.Code
}

// Tanpa gerbang rute pelepas tidak ada; dengan gerbang ia melepas satu goroutine yang tertahan.
func TestEndpointLepasGerbangHanyaBilaGerbangAda(t *testing.T) {
	tanpa, err := bukaCacheKatalog("memori", 0, cache.HapusSesudah, "", 50*time.Millisecond, "", true, jamTes)
	if err != nil {
		t.Fatal(err)
	}
	rute := http.NewServeMux()
	pasangEndpointCache(rute, tanpa)
	if c := lepasGerbang(rute, "commit"); c != http.StatusNotFound {
		t.Fatalf("tanpa gerbang: status %d, ingin 404 (rute tidak terdaftar)", c)
	}

	dengan, err := bukaCacheKatalog("memori", 0, cache.HapusSesudah, "", 50*time.Millisecond, "commit", true, jamTes)
	if err != nil {
		t.Fatal(err)
	}
	rute = http.NewServeMux()
	pasangEndpointCache(rute, dengan)
	if c := lepasGerbang(rute, "isi"); c != http.StatusConflict {
		t.Fatalf("gerbang isi tidak aktif: status %d, ingin 409", c)
	}
	selesai := make(chan struct{})
	go func() { dengan.Gerbang.Tahan(context.Background(), cache.GerbangCommit); close(selesai) }()
	for i := 0; dengan.Gerbang.Menunggu(cache.GerbangCommit) != 1; i++ {
		if i > 200 {
			t.Fatal("goroutine tidak tertahan")
		}
		time.Sleep(10 * time.Millisecond)
	}
	if c := lepasGerbang(rute, "commit"); c != http.StatusNoContent {
		t.Fatalf("lepas: status %d, ingin 204", c)
	}
	<-selesai
}
