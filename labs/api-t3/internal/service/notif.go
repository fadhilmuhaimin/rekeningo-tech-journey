package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"unicode/utf8"

	"lab/apit3/internal/repo"
)

// Mode rentan service (flag -rentan di cmd/api). Dua mode lain (kursor, urut-waktu) ada di worker.
const RentanPushDalamTx = "push-dalam-tx" // M18: panggilan push di dalam transaction, client tanpa batas waktu

// MaksCatatan: catatan pada pembayaran dan transfer paling banyak 100 karakter (PRD v3, P1).
const MaksCatatan = 100

// rupiah menulis bilangan dengan titik ribuan: 25000 menjadi "25.000".
func rupiah(n int64) string {
	s := strconv.FormatInt(n, 10)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte('.')
		}
		b.WriteRune(c)
	}
	return b.String()
}

// periksaCatatan: catatan kosong boleh. Panjang dihitung dalam karakter, bukan byte, dan karakter kontrol
// (baris baru, tab) ditolak. Isinya tidak diubah: HTML di dalamnya disimpan apa adanya, dan encoding adalah
// urusan yang menampilkannya (ADR 30). Jurnal tidak bisa dihapus, jadi apa yang masuk tinggal selamanya.
func periksaCatatan(c string) (string, error) {
	c = strings.TrimSpace(c)
	if utf8.RuneCountInString(c) > MaksCatatan {
		return "", ErrValidasi{"catatan", fmt.Sprintf("paling banyak %d karakter", MaksCatatan)}
	}
	for _, r := range c {
		if r < 0x20 || r == 0x7f {
			return "", ErrValidasi{"catatan", "tidak boleh berisi baris baru atau karakter kontrol"}
		}
	}
	return c, nil
}

// keterangan: teks jurnal. Catatan user ditambahkan sesudah teks dasar.
func keterangan(dasar, catatan string) string {
	if catatan == "" {
		return dasar
	}
	return dasar + ": " + catatan
}

// pesan adalah isi pemberitahuan uang yang disimpan di outbox.payload.
type pesan struct {
	Judul   string `json:"judul"`
	Isi     string `json:"isi"`
	Jurnal  int64  `json:"jurnal"`
	Nominal int64  `json:"nominal"`
	Dari    string `json:"dari"`
	Catatan string `json:"catatan,omitempty"`
}

func pesanUang(dari string, nominal, jurnal int64, catatan string) pesan {
	isi := fmt.Sprintf("Rp%s dari %s sudah masuk.", rupiah(nominal), dari)
	if catatan != "" {
		isi += " Catatan: " + catatan
	}
	return pesan{Judul: fmt.Sprintf("Rp%s dari %s", rupiah(nominal), dari), Isi: isi, Jurnal: jurnal, Nominal: nominal,
		Dari: dari, Catatan: catatan}
}

// perangkatRentan membaca perangkat penerima SEBELUM transaction dibuka, seperti kode versi pertama (M18). Hanya
// dipakai mode rentan; versi benar tidak membaca perangkat di jalur uang.
func (s Service) perangkatRentan(ctx context.Context, penerima int64) []repo.Perangkat {
	if s.rentan != RentanPushDalamTx {
		return nil
	}
	p, err := s.repo.PerangkatAktif(ctx, penerima)
	if err != nil {
		log.Printf("baca perangkat: %v", err)
	}
	return p
}

// --8<-- [start:beritahu]
// beritahu dipanggil di dalam transaction jurnal, sesudah CatatJurnal.
//
// Versi benar (ADR 23): satu baris outbox di transaction yang sama, tanpa panggilan jaringan. Worker mengirimnya
// sesudah COMMIT.
//
// Mode rentan push-dalam-tx (M18, versi pertama minggu 1): HTTP ke layanan push di dalam transaction, dengan client
// tanpa batas waktu. Transaction menahan koneksi dan lock buku selama layanan push menjawab, dan kegagalan push
// hanya dicatat di log: tidak ada baris outbox, jadi tidak ada yang tahu pemberitahuan itu hilang.
func (s Service) beritahu(ctx context.Context, tx repo.Tx, jurnal, penerima int64, jenis string, perangkat []repo.Perangkat, p pesan) error {
	if s.rentan == RentanPushDalamTx {
		for _, d := range perangkat {
			if err := s.push.Kirim(context.WithoutCancel(ctx), d.Token, "v1-tanpa-id", p.Judul, p.Isi); err != nil {
				log.Printf("push gagal, hanya dicatat: %v", err)
			}
		}
		return nil
	}
	b, err := json.Marshal(p)
	if err != nil {
		return err
	}
	return tx.TulisOutbox(ctx, jurnal, penerima, repo.KelasUang, jenis, b)
}

// --8<-- [end:beritahu]

func jsonPesan(p pesan) ([]byte, error) { return json.Marshal(p) }
