"""Penanda tangan SigV4 (parameter di query string) dalam Python standar, dipakai run.py sebagai pembeda dari klien Go
di labs/api-t4/internal/objek: dua implementasi yang ditulis terpisah harus diterima oleh penyimpanan yang sama.

Dua hal yang tidak dilakukan klien Go dan dipakai lab untuk memerankan pemegang URL: tanggal penandatanganan boleh
diisi (jam diperankan) dan header tambahan boleh ikut ditandatangani (mis. x-amz-checksum-sha256). Kunci akses dan
rahasia adalah data lab di s3.json, bukan secret.
"""
import datetime, hashlib, hmac, urllib.parse

AK, SK, REGION = "labkunci", "labrahasia-sementara", "us-east-1"


def _hm(k, m):
    return hmac.new(k, m.encode(), hashlib.sha256).digest()


def _enc(s, garis=False):
    return urllib.parse.quote(s, safe="-_.~/" if garis else "-_.~")


def presign(metode, host, jalur, umur, sekarang=None, header=None):
    """URL bertanda tangan. `jalur` mis. '/identitas/101/abc'. `sekarang`: datetime UTC (bawaan: waktu sungguhan)."""
    sekarang = sekarang or datetime.datetime.now(datetime.timezone.utc)
    stempel = sekarang.strftime("%Y%m%dT%H%M%SZ")
    tanggal = stempel[:8]
    h = {"host": host, **{k.lower(): v.strip() for k, v in (header or {}).items()}}
    nama = ";".join(sorted(h))
    q = {"X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Credential": f"{AK}/{tanggal}/{REGION}/s3/aws4_request",
         "X-Amz-Date": stempel, "X-Amz-Expires": str(umur), "X-Amz-SignedHeaders": nama}
    kq = "&".join(f"{_enc(k)}={_enc(v)}" for k, v in sorted(q.items()))
    kanonik = "\n".join([metode, _enc(jalur, True), kq, "".join(f"{k}:{h[k]}\n" for k in sorted(h)), nama, "UNSIGNED-PAYLOAD"])
    ruang = f"{tanggal}/{REGION}/s3/aws4_request"
    sts = "\n".join(["AWS4-HMAC-SHA256", stempel, ruang, hashlib.sha256(kanonik.encode()).hexdigest()])
    kunci = _hm(_hm(_hm(_hm(("AWS4" + SK).encode(), tanggal), REGION), "s3"), "aws4_request")
    tanda = hmac.new(kunci, sts.encode(), hashlib.sha256).hexdigest()
    return f"http://{host}{_enc(jalur, True)}?{kq}&X-Amz-Signature={tanda}"
