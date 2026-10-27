package service

import (
	"context"
	"errors"
	"fmt"
	"log"

	"lab/apit4/internal/gateway"
	"lab/apit4/internal/repo"
)

// Koreksi insiden rekonsiliasi (M30, ADR 35, ADR 19). RekonHarian hanya mencatat selisih; job ini menutupnya lewat
// jurnal normal (jurnal top-up atau jurnal pembalik), tidak pernah UPDATE pada posting atau buku.saldo_cache.
// Idempoten: satu insiden satu transaction, baris insiden dikunci (FOR UPDATE) dan hanya yang masih `terbuka` yang
// dikerjakan, jadi job yang dijalankan dua kali, atau dua job bersamaan, menghasilkan satu jurnal per insiden.
// Yang tidak bisa ditutup tanpa keputusan manusia (akun melewati batas tingkat, uang sudah terpakai, order tidak
// dikenal) tetap terbuka dan dihitung sebagai `Ditahan`; job tidak memaksanya.

// HasilKoreksi: ringkasan satu putaran job koreksi.
type HasilKoreksi struct {
	Diperiksa, Dikoreksi, SelesaiTanpaJurnal, Ditahan, Galat int
}

type hasilInsiden int

const (
	insidenDitahan hasilInsiden = iota
	insidenDikoreksi
	insidenTanpaJurnal
	insidenSudahSelesai
)

// gwOrder: keadaan satu order menurut gateway, ditanyakan SEBELUM transaction dibuka (ADR 22).
type gwOrder struct {
	order gateway.Order
	err   error
}

// KoreksiRekon: job (flag -koreksi-rekon). Semua insiden terbuka dikerjakan menurut nomor.
func (s Service) KoreksiRekon(ctx context.Context) (HasilKoreksi, error) {
	var h HasilKoreksi
	daftar, err := s.repo.InsidenTerbuka(ctx)
	if err != nil {
		return h, err
	}
	gw := map[string]gwOrder{}
	for _, in := range daftar {
		if in.Jenis != "tidak_di_gateway" {
			continue
		}
		if s.t4.Gateway == nil {
			return h, ErrGatewayTidakAda
		}
		o, err := s.t4.Gateway.Status(ctx, in.OrderID)
		gw[in.OrderID] = gwOrder{o, err}
	}
	for _, in := range daftar {
		h.Diperiksa++
		hasil, err := s.koreksiSatu(ctx, in.ID, gw)
		switch {
		case err != nil:
			h.Galat++
			log.Printf("koreksi insiden %d (%s): %v", in.ID, in.OrderID, err)
		case hasil == insidenDikoreksi:
			h.Dikoreksi++
		case hasil == insidenTanpaJurnal:
			h.SelesaiTanpaJurnal++
		case hasil == insidenDitahan:
			h.Ditahan++
		}
	}
	return h, nil
}

// --8<-- [start:koreksi-satu]
func (s Service) koreksiSatu(ctx context.Context, id int64, gw map[string]gwOrder) (hasilInsiden, error) {
	hasil := insidenDitahan
	err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		in, err := tx.KunciInsiden(ctx, id)
		if err != nil {
			return err
		}
		if in.Status != "terbuka" { // job lain sudah menutupnya selagi kita menunggu lock
			hasil = insidenSudahSelesai
			return nil
		}
		var jurnal *int64
		switch in.Jenis {
		case "tidak_di_ledger":
			hasil, jurnal, err = s.koreksiTidakDiLedger(ctx, tx, in)
		case "jumlah_beda":
			hasil, jurnal, err = s.koreksiJumlahBeda(ctx, tx, in)
		case "tidak_di_gateway":
			hasil, jurnal, err = s.koreksiTidakDiGateway(ctx, tx, in, gw[in.OrderID])
		default:
			return fmt.Errorf("jenis insiden tidak dikenal: %q", in.Jenis)
		}
		if err != nil || hasil == insidenDitahan {
			return err
		}
		ok, err := tx.TutupInsiden(ctx, in.ID, jurnal)
		if err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("insiden %d sudah ditutup: baris dikunci dan statusnya sudah dicek, tidak boleh terjadi", in.ID)
		}
		return nil
	})
	return hasil, err
}

// --8<-- [end:koreksi-satu]

// tidak_di_ledger: gateway sudah settlement, ledger belum. Yang masih menunggu atau tidak pasti dikredit lewat
// terapkanStatus, fungsi yang sama dengan webhook dan job cek status (Idempotency-Key = order_id di ledger). Yang
// sudah dikredit lewat jalur lain sesudah rekonsiliasi cukup ditutup dengan merujuk jurnalnya. Top-up yang sudah
// kedaluwarsa atau gagal, order yang tidak dikenal, jumlah yang berbeda dari order, dan akun yang tidak bisa
// dikredit (dibekukan atau melewati batas tingkat) menunggu keputusan tim risk.
func (s Service) koreksiTidakDiLedger(ctx context.Context, tx repo.Tx, in repo.Insiden) (hasilInsiden, *int64, error) {
	if in.TopupID == nil {
		return insidenDitahan, nil, nil
	}
	tp, err := tx.TopupBankUntukUbahID(ctx, *in.TopupID)
	if err != nil {
		return insidenDitahan, nil, err
	}
	switch tp.Status {
	case "dibayar":
		if tp.JurnalID == nil {
			return insidenDitahan, nil, nil
		}
		// Hanya bila jumlah yang sudah dikredit sama dengan jumlah di laporan gateway; yang berbeda adalah jumlah_beda,
		// bukan tidak_di_ledger, dan menunggu rekonsiliasi berikutnya atau keputusan manusia.
		if masuk, err := tx.JumlahMasuk(ctx, *tp.JurnalID); err != nil {
			return insidenDitahan, nil, err
		} else if masuk != in.Selisih {
			return insidenDitahan, nil, nil
		}
		return insidenTanpaJurnal, tp.JurnalID, nil
	case "menunggu", "tidak_pasti":
		hasil, jurnal, err := s.terapkanStatus(ctx, tx, tp, "dibayar", in.Selisih)
		if err != nil {
			return insidenDitahan, nil, err
		}
		if (hasil == "diproses" || hasil == "ganda") && jurnal != nil {
			return insidenDikoreksi, jurnal, nil
		}
	}
	return insidenDitahan, nil, nil
}

// jumlah_beda: selisih = gateway − ledger. Gateway lebih besar: pembayar membayar lebih banyak daripada yang
// dikredit, selisihnya dikredit lewat jurnal top-up kedua. Gateway lebih kecil: uang yang sudah dikredit mungkin
// sudah terpakai, jadi menunggu keputusan Keuangan.
func (s Service) koreksiJumlahBeda(ctx context.Context, tx repo.Tx, in repo.Insiden) (hasilInsiden, *int64, error) {
	if in.TopupID == nil || in.Selisih <= 0 {
		return insidenDitahan, nil, nil
	}
	tp, err := tx.TopupBankUntukUbahID(ctx, *in.TopupID)
	if err != nil {
		return insidenDitahan, nil, err
	}
	if tp.Status != "dibayar" || tp.JurnalID == nil {
		return insidenDitahan, nil, nil
	}
	buku, err := tx.KunciBukuAkun(ctx, tp.AkunID)
	if err != nil {
		return insidenDitahan, nil, err
	}
	b := buku[tp.AkunID]
	tingkat, status, err := tx.AkunTingkat(ctx, tp.AkunID)
	if err != nil {
		return insidenDitahan, nil, err
	}
	if status == "dibekukan" || b.Saldo+in.Selisih > BatasSaldoTingkat(tingkat) {
		return insidenDitahan, nil, nil
	}
	bank, err := tx.BukuSistem(ctx, "bank")
	if err != nil {
		return insidenDitahan, nil, err
	}
	id, err := tx.CatatJurnal(ctx, "topup_bank", fmt.Sprintf("Koreksi selisih rekonsiliasi %s (insiden %d)", tp.OrderID, in.ID), tp.AkunID, nil,
		[]repo.Posting{{BukuID: bank, Jumlah: -in.Selisih}, {BukuID: b.ID, Jumlah: in.Selisih}})
	if err != nil {
		return insidenDitahan, nil, err
	}
	if err := s.beritahu(ctx, tx, id, tp.AkunID, "topup", nil, pesanUang("Bank", in.Selisih, id, "koreksi selisih")); err != nil {
		return insidenDitahan, nil, err
	}
	return insidenDikoreksi, &id, nil
}

// tidak_di_gateway: ledger sudah dikredit, laporan gateway tanggal itu tidak memuat order ini. Gateway ditanya
// (sebelum transaction): bila order itu settlement dengan jumlah yang sama, hanya tanggalnya yang berbeda dan
// ledger sudah benar, insiden ditutup tanpa jurnal. Bila gateway tidak mengenal order itu atau tidak settlement,
// uang tidak pernah masuk dan kreditnya dibalik lewat jurnal pembalik; bila uangnya sudah terpakai (saldo tidak
// cukup), menunggu keputusan Keuangan. Gateway yang tidak menjawab: tetap terbuka.
func (s Service) koreksiTidakDiGateway(ctx context.Context, tx repo.Tx, in repo.Insiden, g gwOrder) (hasilInsiden, *int64, error) {
	if in.TopupID == nil || (g.err != nil && !errors.Is(g.err, gateway.ErrTidakAda)) {
		return insidenDitahan, nil, nil
	}
	tp, err := tx.TopupBankUntukUbahID(ctx, *in.TopupID)
	if err != nil {
		return insidenDitahan, nil, err
	}
	if tp.Status != "dibayar" || tp.JurnalID == nil {
		return insidenDitahan, nil, nil
	}
	masuk, err := tx.JumlahMasuk(ctx, *tp.JurnalID)
	if err != nil {
		return insidenDitahan, nil, err
	}
	if g.err == nil && g.order.Status == "settlement" {
		if g.order.Jumlah == masuk {
			return insidenTanpaJurnal, nil, nil // settlement di tanggal lain
		}
		return insidenDitahan, nil, nil // jumlahnya berbeda: rekonsiliasi tanggal settlement mencatatnya sebagai jumlah_beda
	}
	if ada, err := tx.JurnalPembalik(ctx, *tp.JurnalID); err != nil {
		return insidenDitahan, nil, err
	} else if ada != nil {
		return insidenTanpaJurnal, ada, nil // sudah dibalik lewat jalur lain
	}
	// Urutan lock sama dengan jalur kartu: buku milik akun lebih dulu, buku sistem (bank) sesudahnya (ADR 13).
	buku, err := tx.KunciBukuAkun(ctx, tp.AkunID)
	if err != nil {
		return insidenDitahan, nil, err
	}
	if buku[tp.AkunID].Saldo < masuk {
		return insidenDitahan, nil, nil // uangnya sudah terpakai: jurnal pembalik akan membuat saldo negatif
	}
	asal, err := tx.KartuPostingJurnal(ctx, *tp.JurnalID)
	if err != nil {
		return insidenDitahan, nil, err
	}
	ids := make([]int64, len(asal))
	cermin := make([]repo.Posting, len(asal))
	for i, p := range asal {
		ids[i], cermin[i] = p.BukuID, repo.Posting{BukuID: p.BukuID, Jumlah: -p.Jumlah}
	}
	if _, err := tx.KunciBukuID(ctx, ids...); err != nil {
		return insidenDitahan, nil, err
	}
	id, err := tx.CatatJurnal(ctx, "pembalik", fmt.Sprintf("Order %s tidak settlement di gateway (insiden %d)", tp.OrderID, in.ID), tp.AkunID, tp.JurnalID, cermin)
	if err != nil {
		return insidenDitahan, nil, err
	}
	return insidenDikoreksi, &id, nil
}
