package service

import (
	"context"
	"errors"
	"regexp"
	"testing"
	"time"

	"lab/apit5/internal/repo"
)

// Tes lab t5-replika: aturan memilih tempat membaca untuk tampilan (ADR 47). Yang diuji di sini hanya keputusannya,
// dengan replica tiruan; SQL pembanding posisi WAL diuji di PostgreSQL oleh TestSampaiLSNDiPrimary dan direkam
// di replica sungguhan oleh lab t5-replika.

// replikaTiruan menjawab SampaiLSN sesuai isian dan mencatat berapa kali ia ditanya.
type replikaTiruan struct {
	sampai  bool
	galat   error
	ditanya []string
}

func (r *replikaTiruan) SampaiLSN(_ context.Context, lsn string) (bool, error) {
	r.ditanya = append(r.ditanya, lsn)
	return r.sampai, r.galat
}

func (r *replikaTiruan) Akun(context.Context, int64) (repo.Akun, error) {
	return repo.Akun{}, nil
}

func (r *replikaTiruan) Riwayat(context.Context, int64, *repo.Kursor, int) ([]repo.Riwayat, error) {
	return nil, nil
}

func TestSumberTampil(t *testing.T) {
	ctx := context.Background()
	const token = "0/3032C60"
	kasus := []struct {
		nama       string
		rentan     string
		tanpa      bool // tanpa replica sama sekali
		token      string
		sampai     bool
		galat      error
		wantSumber string
		wantTanya  int
	}{
		{nama: "tanpa replica", tanpa: true, token: token, wantSumber: ""},
		{nama: "tanpa token", wantSumber: SumberReplika},
		{nama: "token sudah sampai", token: token, sampai: true, wantSumber: SumberReplika, wantTanya: 1},
		{nama: "token belum sampai", token: token, wantSumber: SumberPrimary, wantTanya: 1},
		{nama: "replica tidak menjawab", token: token, galat: errors.New("koneksi putus"), wantSumber: SumberPrimary, wantTanya: 1},
		{nama: "replica menjawab sampai tetapi galat: primary", token: token, sampai: true, galat: errors.New("koneksi putus"), wantSumber: SumberPrimary, wantTanya: 1},
		{nama: "mode rentan mengabaikan token yang belum sampai", rentan: RentanRiwayatReplika, token: token, wantSumber: SumberReplika},
	}
	for _, k := range kasus {
		t.Run(k.nama, func(t *testing.T) {
			rep := &replikaTiruan{sampai: k.sampai, galat: k.galat}
			s := Baru(repo.Repo{}, time.Hour).DenganMode(k.rentan)
			if !k.tanpa {
				s = s.DenganReplika(rep)
			}
			p, sumber, err := s.sumberTampil(ctx, k.token)
			if err != nil {
				t.Fatalf("galat tak terduga: %v", err)
			}
			if sumber != k.wantSumber {
				t.Fatalf("sumber %q, harus %q", sumber, k.wantSumber)
			}
			if len(rep.ditanya) != k.wantTanya {
				t.Fatalf("replica ditanya %d kali, harus %d", len(rep.ditanya), k.wantTanya)
			}
			switch k.wantSumber {
			case SumberReplika:
				if p != pembacaTampil(rep) {
					t.Fatalf("pembaca bukan replica")
				}
			default:
				if p != pembacaTampil(repo.Repo{}) {
					t.Fatalf("pembaca bukan primary")
				}
			}
		})
	}
}

func TestSumberTampilMenolakTokenBukanLSN(t *testing.T) {
	ctx := context.Background()
	for _, token := range []string{"abc", "0/", "/3032C60", "0/ZZ", "0/3032C60 ", "0/3032C60'; DROP TABLE akun; --", "0/3032C600000000", "123456789/0", "0/123456789", "1/2/3", " "} {
		rep := &replikaTiruan{sampai: true}
		s := Baru(repo.Repo{}, time.Hour).DenganReplika(rep)
		_, _, err := s.sumberTampil(ctx, token)
		var v ErrValidasi
		if !errors.As(err, &v) || v.Field != "X-Lsn-Tulis" {
			t.Errorf("token %q: galat %v, harus ErrValidasi untuk X-Lsn-Tulis", token, err)
		}
		if len(rep.ditanya) != 0 {
			t.Errorf("token %q: replica ditanya sebelum token diperiksa", token)
		}
	}
	for _, token := range []string{"0/0", "0/3032C60", "A/B", "FFFFFFFF/FFFFFFFF", "0/3032c60", "00000000/00000000"} {
		if !polaLSN.MatchString(token) {
			t.Errorf("token %q adalah posisi WAL sah", token)
		}
	}
}

func TestTampilHanyaPemilik(t *testing.T) {
	ctx := context.Background()
	rep := &replikaTiruan{sampai: true}
	s := Baru(repo.Repo{}, time.Hour).DenganReplika(rep)
	if _, _, err := s.LihatAkunTampil(ctx, 1, 2, "0/3032C60"); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("saldo tampil akun orang lain: %v, harus ErrTidakDitemukan", err)
	}
	if _, _, _, err := s.RiwayatTampil(ctx, 1, 2, "", "", "0/3032C60"); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("riwayat akun orang lain: %v, harus ErrTidakDitemukan", err)
	}
	if len(rep.ditanya) != 0 {
		t.Fatal("replica ditanya untuk peminta yang bukan pemilik")
	}
}

func TestTokenTulisTanpaReplica(t *testing.T) {
	if tok := Baru(repo.Repo{}, time.Hour).TokenTulis(context.Background()); tok != "" {
		t.Fatalf("tanpa replica token harus kosong, dapat %q", tok)
	}
}

// Di PostgreSQL yang bukan replica pg_last_wal_replay_lsn() NULL: SampaiLSN menjawab false (tidak tahu = belum
// sampai), dan LSNTulis mengembalikan posisi WAL yang sah.
func TestSampaiLSNDiPrimary(t *testing.T) {
	_, db := siapkan(t)
	r := repo.Baru(db)
	ctx := context.Background()
	lsn, err := r.LSNTulis(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^[0-9A-F]+/[0-9A-F]+$`).MatchString(lsn) || !polaLSN.MatchString(lsn) {
		t.Fatalf("LSNTulis %q bukan posisi WAL", lsn)
	}
	sampai, err := r.SampaiLSN(ctx, lsn)
	if err != nil || sampai {
		t.Fatalf("di primary SampaiLSN = %v, %v; harus false tanpa galat", sampai, err)
	}
	if _, err := r.SampaiLSN(ctx, "bukan-lsn"); err == nil {
		t.Fatal("token yang bukan posisi WAL harus ditolak PostgreSQL")
	}
}
