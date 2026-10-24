-- M16, Tahap 2 minggu 7 (lab-api-t2a, keputusan 647).
-- Akun Gedung A dibuat di Tahap 1 dengan password sementara dan tidak pernah ditandai wajib ganti; akun kampus
-- sudah ditandai saat didaftarkan (keputusan 413). Sesudah migration ini, login dengan password sementara dijawab
-- 403 sampai password diganti, dan sesi yang terbuka tidak berlaku lagi (SesiAktif membaca kolom ini).
-- Gedung A = akun sebelum nomor 504, nomor pertama akun kampus di data lab; akun sistem tidak bisa login.
-- Membatalkan: UPDATE akun SET wajib_ganti_password = false untuk akun yang sama. Tidak ada kolom yang berubah.
SET LOCAL lock_timeout = '3s';   -- UPDATE baris akun menunggu lock paling lama 3 detik (ADR 17, M13)

UPDATE akun SET wajib_ganti_password = true
WHERE id < 504 AND jenis <> 'sistem' AND NOT wajib_ganti_password;
