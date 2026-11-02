package main

import (
	"log"
	"os"
	"strconv"
)

// portLab = port dasar + LAB_PORT_OFFSET, supaya beberapa lajur kerja bisa menjalankan lab ini bersamaan
// (labs/README.md, "Beberapa lajur sekaligus"). Tanpa variabel, hasilnya port dasar. Nilai yang bukan
// bilangan bulat menghentikan server.
func portLab(dasar int) string {
	offset := 0
	if v := os.Getenv("LAB_PORT_OFFSET"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			log.Fatalf("GAGAL: LAB_PORT_OFFSET=%q bukan bilangan bulat", v)
		}
		offset = n
	}
	return strconv.Itoa(dasar + offset)
}
