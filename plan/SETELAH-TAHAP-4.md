# Setelah Tahap 4

Polesan dari tinjauan Tahap 4 yang sengaja tidak dikerjakan (lingkup dibekukan).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Lab `b11-integrasi` (skema lama) perlu versi ledger: gateway tanpa timeout, breaker dan antrean per gateway (R4-07, R4-32).
- Lab `b10-2-webhook`: tambah tiga gaya tanda tangan (HMAC atas timestamp dan body, SHA512 atas field, token statis) dan jadwal retry per status code (R4-08).
