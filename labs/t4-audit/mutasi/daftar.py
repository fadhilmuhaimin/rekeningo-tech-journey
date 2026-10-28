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
 # mutan peninjau (seri Q, W, B, G, N): runner 'luas' = tes bertag ditambah tes api-t4 tanpa tag
 ("Q1", A, '''waktu.UTC().Truncate(time.Microsecond).Format("2006-01-02T15:04:05.000000Z"),''', '''waktu.Truncate(time.Microsecond).Format("2006-01-02T15:04:05.000000Z"),''', "api,luas"),
 ("Q2", A, '''Format("2006-01-02T15:04:05.000000Z")''', '''Format("2006-01-02T15:04:05.999999Z")''', "api,luas"),
 ("Q3", A, '''peran, aksi, objek, alasan, strconv.FormatInt(penyetuju, 10)}, "\\x1f")''', '''peran, aksi, objek, alasan, strconv.FormatInt(pelaku, 10)}, "\\x1f")''', "api,luas"),
 ("Q5", A, '''	if _, err := t.tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock($1)`, kunciAuditAdvisory); err != nil {''', '''	if _, err := t.tx.ExecContext(ctx, `SELECT $1::bigint`, kunciAuditAdvisory); err != nil {''', "api,luas"),
 ("Q6", A, '''`SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1`''', '''`SELECT hash FROM audit_log ORDER BY waktu DESC, id DESC LIMIT 1`''', "api,luas"),
 ("Q7", A, '''		FROM audit_log ORDER BY id`)
	if err != nil {
		return HasilVerifikasiAudit{}, nil, err''', '''		FROM audit_log ORDER BY waktu, id`)
	if err != nil {
		return HasilVerifikasiAudit{}, nil, err''', "api,luas"),
 ("Q8", A, '''strconv.FormatInt(penyetuju, 10)}, "\\x1f")''', '''strconv.FormatInt(penyetuju, 10)}, "\\x1f\\x1f")''', "api,luas"),
 ("Q9", A, '''const HashAwalAudit = "0000000000000000000000000000000000000000000000000000000000000000"''', '''const HashAwalAudit = "0000000000000000000000000000000000000000000000000000000000000001"''', "api,luas"),
 ("Q10", A, '''hash != HashAudit(sebelum, b.Waktu, b.PelakuID, b.Peran, b.Aksi, b.Objek, b.Alasan, b.Penyetuju)) {''', '''hash != HashAudit(sebelum, b.Waktu.Truncate(time.Second), b.PelakuID, b.Peran, b.Aksi, b.Objek, b.Alasan, b.Penyetuju)) {''', "api,luas"),
 ("Q11", A, '''hash != HashAudit(sebelum, b.Waktu, b.PelakuID, b.Peran, b.Aksi, b.Objek, b.Alasan, b.Penyetuju)) {''', '''hash != HashAudit(sebelum, b.Waktu, b.PelakuID, b.Peran, b.Aksi, b.Objek, b.Alasan, 0)) {''', "api,luas"),
 ("Q12", A, '''hash != HashAudit(sebelum, b.Waktu, b.PelakuID, b.Peran, b.Aksi, b.Objek, b.Alasan, b.Penyetuju)) {''', '''!strings.EqualFold(hash, HashAudit(sebelum, b.Waktu, b.PelakuID, b.Peran, b.Aksi, b.Objek, b.Alasan, b.Penyetuju))) {''', "api,luas"),
 ("Q13", A, '''(sebelum != h.HashTerakhir ||''', '''(strings.TrimSpace(sebelum) != h.HashTerakhir ||''', "api,luas"),
 # jangkar
 ("W1", JK, '''`^[0-9a-f]{64}$`''', '''`[0-9a-f]{64}$`''', "api"),
 ("W2", JK, '''`^[0-9a-f]{64}$`''', '''`^[0-9a-f]{64,}$`''', "api"),
 ("W3", JK, '''	if err != nil {
		return nil, err
	}
	defer f.Close()''', '''	if err != nil {
		return nil, nil
	}
	defer f.Close()''', "api"),
 ("W4", JK, '''	return hasil, sc.Err()''', '''	return hasil, nil''', "api"),
 ("W5", JK, '''return l.RusakDiID == 0 && len(l.Temuan) == 0''', '''return l.RusakDiID == 0''', "api"),
 ("W6", AJ, '''	if !l.Sehat() {
		os.Exit(2)
	}''', '''	if !l.Sehat() {
		os.Exit(1)
	}''', "lab:jangkar"),
 ("W7", AJ, '''	if l.RusakDiID != 0 {
		rantai = fmt.Sprintf("putus di baris %d", l.RusakDiID)
	}''', '''	if l.RusakDiID != 0 {
		rantai = "utuh"
	}''', "lab:jangkar,lab:role"),
 ("W8", J, '''		case sekarang != j.Hash:''', '''		case sekarang != j.Hash && j.ID != h.IDTerakhir:''', "api,lab:jangkar"),
 # back office
 ("B1", B, '''if r < 0x20 || r == 0x7f {''', '''if r < 0x1f || r == 0x7f {''', "api,luas"),
 ("B2", B, '''if r < 0x20 || r == 0x7f {''', '''if r < 0x20 {''', "api,luas"),
 ("B3", B, '''	if a.Jenis != "risk" || a.Status != "aktif" {
		return 0, ErrButuhPersetujuan''', '''	if a.Status != "aktif" {
		return 0, ErrButuhPersetujuan''', "api,lab:persetujuan"),
 ("B4", B, '''	if nilai < 1 || nilai > MaksBatasHarianBO {''', '''	if nilai < 0 || nilai > MaksBatasHarianBO {''', "api,luas"),
 ("B5", B, '''	if nilai < 1 || nilai > MaksBatasHarianBO {''', '''	if nilai < 1 || nilai >= MaksBatasHarianBO {''', "api,luas"),
 ("B6", B, '''	if a.Status != "aktif" {
		return ErrDibekukan
	}
	return s.BatasAkun("bo", id)''', '''	return s.BatasAkun("bo", id)''', "api,luas"),
 ("B7", AU, '''	if s.rentan == RentanTanpaAudit {
		return nil
	}''', '''	if false {
		return nil
	}''', "api,luas,lab:rantai"),
 ("B8", AB, '''waktu.UTC().Truncate(time.Microsecond), pelaku, peran, aksi, objek, alasanSQL, penyetuju)''', '''waktu.UTC().Truncate(time.Microsecond), pelaku, peran, aksi, objek, alasanSQL, nil)''', "api,lab:rantai"),
 ("B9", B, '''	maksAlasan              = 300''', '''	maksAlasan              = 3000''', "api,luas"),
 ("G1", P, '''GRANT SELECT ON {s}.audit_log TO t4a_verifikator;''', '''GRANT SELECT ON {s}.audit_log TO t4a_verifikator;
GRANT SELECT ON {s}.akun TO t4a_verifikator;''', "lab:role"),
 ("G2", P, '''GRANT SELECT (id, jenis, status, tingkat) ON {s}.akun TO t4a_agen;''', '''GRANT SELECT (id, jenis, status, tingkat, nama) ON {s}.akun TO t4a_agen;''', "mcp,lab:role"),
 ("G3", P, '''GRANT SELECT (id, akun_id, subjek, status) ON {s}.verifikasi TO t4a_agen;''', '''GRANT SELECT (id, akun_id, subjek, status, berkas_swafoto_kunci) ON {s}.verifikasi TO t4a_agen;''', "mcp,lab:role"),
 ("G4", P, '''GRANT SELECT ON {s}.audit_log TO t4a_agen;''', '''GRANT SELECT ON {s}.audit_log TO t4a_agen;
GRANT SELECT ON {s}.sesi TO t4a_agen;''', "mcp,lab:role"),
 ("G5", P, '''ALTER TABLE {s}.audit_log OWNER TO t4a_pemilik;''', '''ALTER TABLE {s}.audit_log OWNER TO api_t4;''', "lab:role,lab:rantai"),
 ("G6", H, '''"GRANT SELECT, INSERT ON audit_log TO api_t4"''', '''"GRANT SELECT, INSERT, TRIGGER ON audit_log TO api_t4"''', "lab:role"),
 ("G7", H, '''"GRANT SELECT, INSERT ON audit_log TO api_t4"''', '''"GRANT SELECT, INSERT, TRUNCATE ON audit_log TO api_t4"''', "lab:role"),
 ("G8", P, '''GRANT SELECT, INSERT, UPDATE, DELETE ON {s}.audit_biasa TO api_t4;''', '''GRANT SELECT, INSERT, UPDATE ON {s}.audit_biasa TO api_t4;''', "lab:rantai"),
 ("G9", H, '''"GRANT SELECT, INSERT ON audit_log TO api_t4"''', '''"GRANT SELECT, INSERT ON audit_log TO api_t4, PUBLIC"''', "lab:role"),
 # server MCP
 ("N1", G, "WHERE a.objek = $1 OR left(a.objek, length($1) + 1) = $1 || '/'", "WHERE a.objek = $1 OR left(a.objek, length($1)) = $1", "mcp"),
 ("N2", G, "JOIN sasaran s ON a.objek = s.o OR left(a.objek, length(s.o) + 1) = s.o || '/'", "JOIN sasaran s ON a.objek = s.o OR left(a.objek, length(s.o)) = s.o", "mcp"),
 ("N3", G, '''	case n < 1:
		return BatasBawaan''', '''	case n < 0:
		return BatasBawaan''', "mcp"),
 ("N4", G, '''	BatasBawaan = 20''', '''	BatasBawaan = 21''', "mcp,lab:mcp"),
 ("N5", G, '''&mcp.CallToolResult{IsError: true, Content:''', '''&mcp.CallToolResult{IsError: false, Content:''', "mcp,lab:mcp"),
 ("N6", G, '''		return nil, auth.ErrInvalidToken''', '''		return nil, fmt.Errorf("tidak sah")''', "mcp"),
 ("N7", G, '''DestructiveHint: ptr(false)''', '''DestructiveHint: ptr(true)''', "mcp,lab:mcp"),
 ("N8", G, '''OpenWorldHint: ptr(false)''', '''OpenWorldHint: ptr(true)''', "mcp,lab:mcp"),
 ("N9", G, '''		waktu.UTC().Truncate(time.Microsecond).Format("2006-01-02T15:04:05.000000Z"),''', '''		waktu.Truncate(time.Microsecond).Format("2006-01-02T15:04:05.000000Z"),''', "mcp"),
 ("N10", G, '''		if h.RusakDiID == 0 && (sebelum != h.HashTerakhir ||''', '''		if (sebelum != h.HashTerakhir ||''', "mcp"),
 ("N11", G, '''hash != HashBaris(sebelum, w, pelaku, peran, aksi, objek, alasan, penyetuju)) {''', '''!strings.EqualFold(hash, HashBaris(sebelum, w, pelaku, peran, aksi, objek, alasan, penyetuju))) {''', "mcp"),
 ("N12", G, '''Logger: log, Stateless: true, JSONResponse: true''', '''Logger: log, Stateless: true''', "mcp,lab:mcp"),
 ("N13", G, '''	h := rantaiKeluaran{HashTerakhir: HashAwal}''', '''	h := rantaiKeluaran{HashTerakhir: HashAwal, Utuh: true}''', "mcp"),
 ("N14", G, '''	h.Utuh = h.RusakDiID == 0
''', '''	h.Utuh = h.RusakDiID == 0 || h.Baris == 0
''', "mcp"),
 ("N16", G, '''	srv := NewServer(g, log)
''', '''	srv := NewServer(g, log)
	_, _ = http.Head("http://127.0.0.1:1/")
''', "mcp"),
 ("N17", G, '''	ingin := sha256.Sum256([]byte(diharapkan))''', '''	ingin := sha256.Sum256([]byte(diharapkan))
	_, _ = http.Post("http://127.0.0.1:1/", "text/plain", strings.NewReader(diharapkan))''', "mcp"),
]
