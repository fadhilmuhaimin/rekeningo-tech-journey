"""Daftar mutan lab t4-audit. (id, berkas relatif ke labs/, lama, baru, runner: api | mcp | lab:<bagian>[,..])."""
A = "api-t4/internal/repo/audit.go"
J = "api-t4/internal/repo/audit_jangkar.go"
JK = "api-t4/internal/jangkar/jangkar.go"
B = "api-t4/internal/service/bo.go"
AU = "api-t4/internal/service/t4_audit.go"
AB = "api-t4/internal/repo/audit_biasa.go"
AJ = "api-t4/cmd/auditjob/main.go"
G = "t4-audit/mcp/agen/agen.go"
P = "t4-audit/peran.sql"
H = "api-t4/dasar_t4.py"

M = [
 # hash dan rantai (api)
 ("H1", A, '''sebelumnya + "\\x1e" + isi''', '''sebelumnya + isi''', "api"),
 ("H2", A, '''strconv.FormatInt(penyetuju, 10)}, "\\x1f")''', '''strconv.FormatInt(penyetuju, 10)}, "\\x1e")''', "api"),
 ("H3", A, '''peran, aksi, objek, alasan, strconv.FormatInt(penyetuju, 10)}''', '''peran, aksi, objek, strconv.FormatInt(penyetuju, 10)}''', "api"),
 ("H4", A, '''strconv.FormatInt(pelaku, 10), peran, aksi''', '''peran, strconv.FormatInt(pelaku, 10), aksi''', "api"),
 ("V1", A, '''if h.RusakDiID == 0 && (sebelum != h.HashTerakhir ||''', '''if (sebelum != h.HashTerakhir ||''', "api"),
 ("V2", A, '''h.RusakDiID == 0 && (sebelum != h.HashTerakhir ||
			hash != HashAudit(''', '''h.RusakDiID == 0 && (false ||
			hash != HashAudit(''', "api"),
 ("V3", A, '''hash != HashAudit(sebelum, b.Waktu, b.PelakuID, b.Peran, b.Aksi, b.Objek, b.Alasan, b.Penyetuju)) {''', '''false) {''', "api"),
 ("V4", A, '''		h.IDTerakhir = b.ID
''', '''''', "api"),
 ("V5", A, '''		h.HashTerakhir = hash
		h.IDTerakhir''', '''		h.IDTerakhir''', "api"),
 ("V6", A, '''FROM audit_log ORDER BY id`)
	if err != nil {
		return HasilVerifikasiAudit{}, nil, err''', '''FROM audit_log ORDER BY id DESC`)
	if err != nil {
		return HasilVerifikasiAudit{}, nil, err''', "api"),
 # jangkar di repo
 ("R1", J, '''		case !ada:''', '''		case false && !ada:''', "api"),
 ("R2", J, '''		case sekarang != j.Hash:''', '''		case sekarang == j.Hash:''', "api"),
 ("R3", J, '''Masalah: JangkarBarisHilang})''', '''Masalah: JangkarHashBeda})''', "api"),
 ("R4", J, '''		perlu[j.ID] = true''', '''		perlu[j.ID] = false''', "api"),
 # paket jangkar
 ("K1", JK, '''`^[0-9a-f]{64}$`''', '''`^[0-9a-fA-F]{64}$`''', "api"),
 ("K2", JK, '''j.ID < 1 ||''', '''j.ID < 0 ||''', "api"),
 ("K3", JK, '''			return nil, fmt.Errorf("jangkar baris %d: %w", n, err)''', '''			continue''', "api"),
 ("K4", JK, '''os.O_APPEND|os.O_CREATE|os.O_WRONLY''', '''os.O_TRUNC|os.O_CREATE|os.O_WRONLY''', "api"),
 ("K5", JK, '''	if !l.Sehat() || h.Baris == 0 {''', '''	if h.Baris == 0 {''', "api"),
 ("K6", JK, '''lama[n-1] == baru {''', '''false {''', "api"),
 ("K7", JK, '''return l.RusakDiID == 0 && len(l.Temuan) == 0''', '''return l.RusakDiID == 0 || len(l.Temuan) == 0''', "api"),
 ("K8", JK, '''	if !l.Sehat() || h.Baris == 0 {''', '''	if !l.Sehat() {''', "api"),
 ("K9", JK, '''	return f.Sync()''', '''	return nil''', "api"),
 ("K10", JK, '''	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}''', '''	if errors.Is(err, os.ErrNotExist) {
		return nil, err
	}''', "api,lab:jangkar"),
 ("K11", AJ, '''	if !l.Sehat() {
		os.Exit(2)
	}''', '''	if !l.Sehat() {
		os.Exit(0)
	}''', "lab:jangkar"),
 ("K12", JK, '''baru := repo.Jangkar{ID: h.IDTerakhir, Hash: h.HashTerakhir}''', '''baru := repo.Jangkar{ID: h.IDTerakhir, Hash: h.HashTerakhir[:63] + "0"}''', "api,lab:jangkar"),
 # back office
 ("O1", B, '''	if sesi.Jenis != "app" || sesi.AkunID == pelaku {''', '''	if sesi.AkunID == pelaku {''', "api"),
 ("O2", B, '''	if sesi.Jenis != "app" || sesi.AkunID == pelaku {''', '''	if sesi.Jenis != "app" {''', "api,lab:persetujuan"),
 ("O3", B, '''	if a.Jenis != "risk" || a.Status != "aktif" {
		return 0, ErrButuhPersetujuan''', '''	if a.Jenis != "risk" {
		return 0, ErrButuhPersetujuan''', "api,lab:persetujuan"),
 ("O4", B, '''	if jenis == "risk" || jenis == "admin" {''', '''	if jenis == "risk" {''', "api,lab:persetujuan"),
 ("O5", B, '''	p, err := s.penyetuju(ctx, pelaku, tokenPenyetuju)
	if err != nil {
		return err
	}
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		jenis, err := tx.JenisAkun(ctx, id)''', '''	p := pelaku
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		jenis, err := tx.JenisAkun(ctx, id)''', "api,lab:persetujuan"),
 ("O6", B, '''	minAlasan               = 20''', '''	minAlasan               = 1''', "api,lab:persetujuan"),
 ("O7", B, '''	if token == "" {
		return 0, ErrButuhPersetujuan
	}''', '''	if token == "" {
		return pelaku + 1, nil
	}''', "api,lab:persetujuan"),
 ("O8", B, '''	return s.ubahStatusBO(ctx, pelaku, id, "aktif", "dibekukan", "bekukan", alasan, nil)''', '''	return s.ubahStatusBO(ctx, pelaku, id, "aktif", "dibekukan", "bekukan", alasan, &pelaku)''', "api,lab:persetujuan"),
 ("O9", B, '''return s.ubahStatusBO(ctx, pelaku, id, "dibekukan", "aktif", "buka_blokir", alasan, &p)''', '''_ = p
	return s.ubahStatusBO(ctx, pelaku, id, "dibekukan", "aktif", "buka_blokir", alasan, nil)''', "api,lab:persetujuan"),
 # mode log biasa
 ("L1", AU, '''		_, err := tx.TulisAuditBiasa(ctx, s.kini(), pelaku, peran, aksi, objek, alasan, penyetuju)
		return err''', '''		_, err := tx.TulisAuditBiasa(ctx, s.kini(), pelaku, peran, aksi, objek, alasan, penyetuju)
		if err != nil {
			return err
		}''', "api"),
 ("L2", AB, '''VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		waktu.UTC().Truncate(time.Microsecond), pelaku, peran, aksi, objek, alasanSQL, penyetuju)''', '''VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		waktu.UTC().Truncate(time.Microsecond), penyetuju, peran, aksi, objek, alasanSQL, pelaku)''', "api,lab:rantai"),
 # role
 ("P1", H, '''"GRANT SELECT, INSERT ON audit_log TO api_t4"''', '''"GRANT SELECT, INSERT, UPDATE ON audit_log TO api_t4"''', "lab:role,lab:rantai"),
 ("P2", P, '''GRANT SELECT (id, jenis, status, tingkat) ON {s}.akun TO t4a_agen;''', '''GRANT SELECT (id, jenis, status, tingkat), UPDATE (status) ON {s}.akun TO t4a_agen;''', "mcp,lab:role"),
 ("P3", P, '''GRANT SELECT (id, jenis, status, tingkat) ON {s}.akun TO t4a_agen;''', '''GRANT SELECT (id, jenis, status, tingkat, email) ON {s}.akun TO t4a_agen;''', "mcp,lab:role"),
 ("P4", P, '''ALTER TABLE {s}.audit_log OWNER TO t4a_pemilik;''', '''-- pemilik tidak diganti''', "lab:role,lab:rantai"),
 ("P5", P, '''GRANT SELECT ON {s}.audit_log TO t4a_verifikator;''', '''GRANT SELECT, INSERT ON {s}.audit_log TO t4a_verifikator;''', "lab:role"),
 ("P6", P, '''GRANT SELECT ON {s}.audit_log TO t4a_agen;''', '''GRANT SELECT, DELETE ON {s}.audit_log TO t4a_agen;''', "mcp,lab:role"),
 ("P7", P, '''GRANT SELECT (id, akun_id, subjek, status) ON {s}.verifikasi TO t4a_agen;''', '''GRANT SELECT (id, akun_id, subjek, status, checksum_kartu) ON {s}.verifikasi TO t4a_agen;''', "mcp,lab:role"),
 ("P8", P, '''GRANT SELECT, INSERT, UPDATE, DELETE ON {s}.audit_biasa TO api_t4;''', '''GRANT SELECT, INSERT ON {s}.audit_biasa TO api_t4;''', "lab:rantai"),
 # server MCP
 ("M1", G, '''var NamaAlat = []string{"cari_audit", "ringkasan_akun", "siapa_membuka", "verifikasi_rantai"}''', '''var NamaAlat = []string{"cari_audit", "ringkasan_akun", "siapa_membuka", "verifikasi_rantai", "bekukan_akun"}''', "mcp"),
 ("M2", G, '''ReadOnlyHint: true, DestructiveHint''', '''ReadOnlyHint: false, DestructiveHint''', "mcp"),
 ("M3", G, '''subtle.ConstantTimeCompare(got[:], ingin[:]) != 1''', '''subtle.ConstantTimeCompare(got[:], ingin[:]) == 1''', "mcp"),
 ("M4", G, '''diharapkan == "" || subtle''', '''subtle''', "mcp"),
 ("M5", G, '''	return auth.RequireBearerToken(Verifier(tokenMasuk), nil)(mcpHandler)''', '''	return auth.RequireBearerToken(Verifier(tokenMasuk), nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if log != nil {
			log.Info("masuk", "auth", r.Header.Get("Authorization"))
		}
		mcpHandler.ServeHTTP(w, r)
	}))''', "mcp"),
 ("M6", G, "WHERE a.objek = $1 OR left(a.objek, length($1) + 1) = $1 || '/'", "WHERE a.objek LIKE $1 || '%'", "mcp"),
 ("M7", G, '''	case n > BatasMaks:
		return BatasMaks''', '''	case n > BatasMaks*1000:
		return BatasMaks''', "mcp"),
 ("M8", G, '''		WHERE a.aksi IN ('lihat_akun', 'lihat_verifikasi', 'buka_berkas')''', '''		WHERE true''', "mcp"),
 ("M9", G, '''Capabilities: &mcp.ServerCapabilities{Tools: &mcp.ToolCapabilities{ListChanged: false}}''', '''Capabilities: nil''', "mcp,lab:mcp"),
 ("M10", G, '''Logger: log, Stateless: true, JSONResponse: true''', '''Logger: log''', "mcp,lab:mcp"),
 ("M12", G, '''isi := strings.Join([]string{
		waktu.UTC().Truncate(time.Microsecond).Format("2006-01-02T15:04:05.000000Z"),''', '''isi := strings.Join([]string{
		waktu.UTC().Format("2006-01-02T15:04:05.000Z"),''', "mcp"),
 ("M13", G, '''		if h.RusakDiID == 0 && (sebelum != h.HashTerakhir || hash != HashBaris(sebelum, w, pelaku, peran, aksi, objek, alasan, penyetuju)) {''', '''		if h.RusakDiID == 0 && (hash != HashBaris(sebelum, w, pelaku, peran, aksi, objek, alasan, penyetuju)) {''', "mcp"),
]
