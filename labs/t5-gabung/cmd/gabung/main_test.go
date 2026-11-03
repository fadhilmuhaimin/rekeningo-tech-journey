package main

import "testing"

func TestPersentilNearestRank(t *testing.T) {
	data := make([]int64, 100)
	for i := range data {
		data[i] = int64(i + 1) // 1..100
	}
	if got := persentil(data, 0.95); got != 95 {
		t.Errorf("p95 dari 1..100 harus 95, dapat %d", got)
	}
	if got := persentil(data, 0.50); got != 50 {
		t.Errorf("p50 dari 1..100 harus 50, dapat %d", got)
	}
	if got := persentil(data[:20], 0.95); got != 19 {
		t.Errorf("p95 dari 1..20 harus 19 (ceil(19)), dapat %d", got)
	}
	if got := persentil(data[:3], 0.95); got != 3 {
		t.Errorf("p95 dari 1..3 harus 3, dapat %d", got)
	}
	if got := persentil(nil, 0.95); got != 0 {
		t.Errorf("data kosong harus 0, dapat %d", got)
	}
}
