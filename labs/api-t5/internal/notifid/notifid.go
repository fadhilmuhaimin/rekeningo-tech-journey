// Package notifid membuat notifikasi_id pengumuman yang sama di setiap pengiriman ulang (lab t5-fanout, ADR 25 dan 51).
// Notifikasi uang memakai UUID acak versi 4 dari database (`gen_random_uuid()`). Pengumuman memakai UUID versi 5
// (RFC 9562 bagian 5.5: SHA-1 atas namespace dan nama), jadi pengumuman yang sama ke perangkat yang sama selalu
// mendapat id yang sama, dan penerima yang menyaring id itu menampilkan satu notifikasi walau pengirimnya mengulang.
package notifid

import (
	"crypto/rand"
	"crypto/sha1"
	"fmt"
)

// namespace tetap milik lab ini (16 byte sembarang, bukan secret).
var namespace = [16]byte{0x7c, 0x1e, 0x5a, 0x33, 0x90, 0x42, 0x4b, 0x6d, 0x8e, 0x17, 0xa4, 0x2f, 0x61, 0x0c, 0x93, 0xd8}

// --8<-- [start:id-pengumuman]
// Pengumuman: id notifikasi satu pengumuman untuk satu perangkat. Deterministik: bergantung hanya pada dua nomor itu.
func Pengumuman(pengumumanID, perangkatID int64) string {
	return uuid5(namespace, fmt.Sprintf("pengumuman:%d:perangkat:%d", pengumumanID, perangkatID))
}

// uuid5: SHA-1 atas namespace lalu nama, 16 byte pertama, bit versi dan varian ditimpa (RFC 9562 bagian 5.5).
func uuid5(ns [16]byte, nama string) string {
	h := sha1.New()
	h.Write(ns[:])
	h.Write([]byte(nama))
	b := h.Sum(nil)[:16]
	b[6] = b[6]&0x0f | 0x50 // versi 5
	b[8] = b[8]&0x3f | 0x80 // varian RFC 9562
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// --8<-- [end:id-pengumuman]

// Kelas membaca jenis notifikasi dari id: "pengumuman" bila UUID versi 5, selain itu "uang". Dipakai penyedia push
// tiruan untuk menghitung 429 per kelas; penyedia sungguhan tidak membedakannya dari id.
func Kelas(id string) string {
	if len(id) == 36 && id[14] == '5' {
		return "pengumuman"
	}
	return "uang"
}

// AcakSebagaiPengumuman: id acak yang berbentuk id pengumuman (versi 5) tetapi berbeda di setiap panggilan. Hanya untuk
// mode rentan `-id-acak` di lab: pengirim yang mengulang pengumuman yang sama dengan id baru membuat penerima melihat dua notifikasi.
func AcakSebagaiPengumuman() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	b[6] = b[6]&0x0f | 0x50
	b[8] = b[8]&0x3f | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
