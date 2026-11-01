# PgBouncer 1.26.1 untuk lab api-t5 (bagian pooler). Dasarnya image postgres:17 yang sudah ada di cache lokal; paket
# pgbouncer datang dari apt.postgresql.org (repositori resmi proyek PostgreSQL, sudah terpasang di image itu).
# Versi dikunci: build gagal bila paket 1.26.1 tidak ada di repositori.
FROM postgres:17
RUN apt-get update \
 && apt-get install -y --no-install-recommends pgbouncer=1.26.1-1.pgdg13+1 \
 && rm -rf /var/lib/apt/lists/*
USER postgres
ENTRYPOINT ["pgbouncer"]
CMD ["/etc/pgbouncer/pgbouncer.ini"]
