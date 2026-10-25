-- Tahap 3, rilis expand 2 dari 5 (lab-api-t3, keputusan 950): sesi dasbor web memakai cookie dan token CSRF.
-- Sesi lama berjenis app dan tidak punya csrf_hash. Sesi web wajib punya csrf_hash, sesi app tidak boleh.
SET LOCAL lock_timeout = '3s';

ALTER TABLE sesi
  ADD COLUMN jenis     text NOT NULL DEFAULT 'app' CHECK (jenis IN ('app', 'web')),
  ADD COLUMN csrf_hash text;
ALTER TABLE sesi ADD CONSTRAINT sesi_csrf_hanya_web CHECK ((jenis = 'web') = (csrf_hash IS NOT NULL));
