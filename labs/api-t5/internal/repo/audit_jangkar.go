package repo

import "context"

// Jangkar adalah hash satu baris audit_log yang dicatat di luar database (ADR 43, lab t4-audit): nomor baris dan hash-nya
// pada saat dicatat. Rantai hash sendiri hanya mendeteksi perubahan di dalam log; jangkar mendeteksi pemotongan ekor dan
// penulisan ulang rantai sampai baris jangkar, karena yang dipotong atau ditulis ulang tidak lagi cocok dengan yang dicatat.
// Yang tidak dicakup: baris yang ditulis sesudah jangkar terakhir (sampai jangkar berikutnya) dan jangkar yang ikut diubah.
type Jangkar struct {
	ID   int64  `json:"id"`
	Hash string `json:"hash"`
}

// Alasan sebuah jangkar tidak cocok dengan log sekarang.
const (
	// JangkarBarisHilang: baris dengan nomor itu tidak ada lagi (ekor dipotong, atau seluruh log dikosongkan).
	JangkarBarisHilang = "baris-hilang"
	// JangkarHashBeda: baris itu ada, tetapi hash-nya bukan yang dicatat (baris ditulis ulang, juga bila rantainya
	// dihitung ulang sampai ujung).
	JangkarHashBeda = "hash-beda"
)

// TemuanJangkar: satu jangkar yang tidak cocok dan sebabnya.
type TemuanJangkar struct {
	ID      int64  `json:"id"`
	Masalah string `json:"masalah"`
}

// VerifikasiAuditJangkar menghitung ulang rantai (seperti VerifikasiAudit) dan mencocokkan tiap jangkar dengan log
// sekarang dalam satu lintasan. Temuan menurut urutan jangkar.
func (r Repo) VerifikasiAuditJangkar(ctx context.Context, jangkar []Jangkar) (HasilVerifikasiAudit, []TemuanJangkar, error) {
	perlu := make(map[int64]bool, len(jangkar))
	for _, j := range jangkar {
		perlu[j.ID] = true
	}
	h, hashPerID, err := r.verifikasiRantai(ctx, perlu)
	if err != nil {
		return h, nil, err
	}
	var temuan []TemuanJangkar
	for _, j := range jangkar {
		sekarang, ada := hashPerID[j.ID]
		switch {
		case !ada:
			temuan = append(temuan, TemuanJangkar{ID: j.ID, Masalah: JangkarBarisHilang})
		case sekarang != j.Hash:
			temuan = append(temuan, TemuanJangkar{ID: j.ID, Masalah: JangkarHashBeda})
		}
	}
	return h, temuan, nil
}
