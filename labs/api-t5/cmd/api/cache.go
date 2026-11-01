package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"lab/apit5/internal/cache"
)

// bukaCacheKatalog menyusun cache katalog dari flag. Memori memakai jam yang sama dengan service: bila -jam-lab
// menyala, TTL 5 menit bisa dilewati lewat POST /lab/jam tanpa menunggu.
func bukaCacheKatalog(mode string, ttl time.Duration, hapus, redisAddr string, redisBatas time.Duration, gerbang string,
	lab bool, jam func() time.Time) (*cache.Katalog, error) {
	k := &cache.Katalog{Nama: mode, Urut: hapus}
	switch hapus {
	case cache.HapusSesudah, cache.HapusSebelum, cache.HapusSelalu:
	default:
		return nil, fmt.Errorf("-katalog-hapus tidak dikenal: %q", hapus)
	}
	switch mode {
	case "memori":
		k.P, k.TTL = cache.BaruMemori(jam), 5*time.Minute
	case "tanpa":
		k.P, k.TTL = cache.Tanpa{}, time.Second
	case "redis":
		if redisAddr == "" {
			return nil, fmt.Errorf("-katalog-cache redis butuh -katalog-redis")
		}
		if redisBatas <= 0 {
			return nil, fmt.Errorf("-katalog-redis-timeout harus lebih dari 0 (nol di go-redis berarti bawaan 5 detik)")
		}
		k.P, k.TTL = cache.BaruRedis(redisAddr, redisBatas), 60*time.Second
	default:
		return nil, fmt.Errorf("-katalog-cache tidak dikenal: %q (tanpa, memori, atau redis)", mode)
	}
	if ttl > 0 {
		k.TTL = ttl
	}
	if gerbang != "" {
		if !lab {
			// Pelepasnya (POST /lab/gerbang/lepas) hanya ada bersama -lab: tanpa itu goroutine yang tertahan tidak pernah dilepas.
			return nil, fmt.Errorf("-lab-gerbang butuh -lab")
		}
		nama := strings.Split(gerbang, ",")
		for _, n := range nama {
			if n != cache.GerbangCommit && n != cache.GerbangIsi {
				return nil, fmt.Errorf("-lab-gerbang tidak dikenal: %q", n)
			}
		}
		k.Gerbang = cache.BaruGerbang(nama...)
	}
	return k, nil
}

// pasangEndpointCache: pencacah dan gerbang untuk rekaman lab (hanya dengan -lab). GET /lab/cache memperlihatkan hit,
// miss, baca database, galat cache, dan kunci yang dihapus; POST /lab/cache/reset menolkannya. POST /lab/gerbang/lepas
// hanya terdaftar bila -lab-gerbang menyalakan gerbang.
func pasangEndpointCache(rute *http.ServeMux, k *cache.Katalog) {
	rute.HandleFunc("GET /lab/cache", func(w http.ResponseWriter, req *http.Request) {
		isi := map[string]any{"aktif": k != nil}
		if k != nil {
			isi["mode"], isi["ttl_detik"], isi["urutan_hapus"] = k.Nama, k.TTL.Seconds(), k.Urut
			isi["hit"], isi["miss"], isi["db_baca"], isi["galat_cache"], isi["hapus"] =
				k.Hit.Load(), k.Miss.Load(), k.DBBaca.Load(), k.GalatCache.Load(), k.Hapus.Load()
			isi["db_ms"] = k.DBNanos.Load() / int64(time.Millisecond)
			isi["tertahan_commit"], isi["tertahan_isi"] = k.Gerbang.Menunggu(cache.GerbangCommit), k.Gerbang.Menunggu(cache.GerbangIsi)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(isi)
	})
	rute.HandleFunc("POST /lab/cache/reset", func(w http.ResponseWriter, req *http.Request) {
		if k != nil {
			k.Reset()
		}
		w.WriteHeader(http.StatusNoContent)
	})
	if k == nil || k.Gerbang == nil { // tanpa -lab-gerbang rute pelepas tidak ada
		return
	}
	rute.HandleFunc("POST /lab/gerbang/lepas", func(w http.ResponseWriter, req *http.Request) {
		var in struct {
			Nama string `json:"nama"`
		}
		if json.NewDecoder(req.Body).Decode(&in) != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		if !k.Gerbang.Lepas(in.Nama) {
			w.WriteHeader(http.StatusConflict)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}

// bukaCacheLaporan menyusun cache laporan merchant (M40): hanya redis, TTL dari flag (bawaan 30 detik).
func bukaCacheLaporan(mode string, ttl time.Duration, redisAddr string, redisBatas time.Duration) (*cache.Katalog, error) {
	if mode != "redis" {
		return nil, fmt.Errorf("-laporan-cache tidak dikenal: %q (kosong atau redis)", mode)
	}
	if redisAddr == "" {
		return nil, fmt.Errorf("-laporan-cache redis butuh -laporan-redis")
	}
	if redisBatas <= 0 || ttl <= 0 {
		return nil, fmt.Errorf("-redis-timeout dan -laporan-ttl harus lebih dari 0")
	}
	return &cache.Katalog{Nama: mode, Urut: cache.HapusSesudah, P: cache.BaruRedis(redisAddr, redisBatas), TTL: ttl}, nil
}

// pasangStatCache: pencacah cache laporan untuk rekaman lab (hanya dengan -lab). GET memperlihatkan hit, miss, dan baca
// database; POST .../reset menolkannya. k nil: tidak ada rute.
func pasangStatCache(rute *http.ServeMux, awalan string, k *cache.Katalog) {
	if k == nil {
		return
	}
	rute.HandleFunc("GET "+awalan, func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"mode": k.Nama, "ttl_detik": k.TTL.Seconds(),
			"hit": k.Hit.Load(), "miss": k.Miss.Load(), "db_baca": k.DBBaca.Load(), "galat_cache": k.GalatCache.Load()})
	})
	rute.HandleFunc("POST "+awalan+"/reset", func(w http.ResponseWriter, req *http.Request) {
		k.Reset()
		w.WriteHeader(http.StatusNoContent)
	})
}
