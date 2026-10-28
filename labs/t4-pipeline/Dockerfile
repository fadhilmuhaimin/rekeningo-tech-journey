# Image api-t4 untuk lab t4-pipeline: biner Go statis di atas distroless (dikunci dengan digest indeks manifes).
# Konteks build disiapkan run.py: biner api-t4 untuk Linux dan varian.txt (isi berbeda untuk image "tag ditukar").
FROM gcr.io/distroless/static-debian12:nonroot@sha256:afa5c872c891853ca7fcf1f12c3edb23f7eeef36189728842dd51042ff57f7ab
COPY api-t4 /api-t4
COPY varian.txt /varian.txt
USER nonroot
ENTRYPOINT ["/api-t4"]
