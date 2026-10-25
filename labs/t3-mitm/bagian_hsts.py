"""Bagian hsts (keputusan 977): HSTS di dasbor (RFC 6797) dilihat dari server tepi dan dari client curl --hsts."""
import pathlib
import tempfile

import umum as U
from umum import catat, d, harap, tulis


def rekam_hsts():
    d.bagian("A. Server tepi: HSTS hanya di jawaban TLS, port HTTP hanya mengalihkan")
    U.siapkan(login=False)
    U.mulai_tepi("server-a", http=True)
    http, tls = U.DASAR["tepi_http"], U.DASAR["tepi"]
    s, k, _ = U.curl_tls(f"http://localhost:{U.P['tepi_http']}/warung", tampil=f"curl -i http://localhost:{http}/warung", jalur_ca=False)
    harap(s, 301, "port HTTP mengalihkan")
    harap(any(l.startswith("location: https://localhost:") for l in k), True, "Location ke https")
    harap(any(l.startswith("strict-transport-security") for l in k), False, "port HTTP tidak mengirim HSTS (RFC 6797 bagian 7.2)")
    catat("# Port HTTP: 301 ke https, tanpa Strict-Transport-Security. RFC 6797 bagian 7.2: host tidak boleh mengirim header itu lewat transport yang tidak aman.")
    s, k, _ = U.curl_tls(f"https://localhost:{U.P['tepi']}/warung", tampil=f"curl -i --cacert ca-publik.pem https://localhost:{tls}/warung")
    harap(s, 401, "jawaban TLS tanpa token")
    sts = [l for l in k if l.startswith("strict-transport-security")]
    harap(sts, ["strict-transport-security: max-age=31536000; includesubdomains"], "HSTS di jawaban TLS, termasuk jawaban error")
    catat("# Jawaban TLS, juga jawaban error 401: Strict-Transport-Security dengan max-age 31536000 detik (365 hari) dan includeSubDomains (RFC 6797 bagian 6.1.1 dan 6.1.2).")

    d.bagian("B. Client yang menyimpan HSTS (curl --hsts, bukan browser): permintaan http sesudah jawaban TLS pertama dinaikkan ke https")
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="t3mitm-hsts-"))
    cache = tmp / "hsts.txt"
    plain_ke_tls = f"http://localhost:{U.P['tepi']}/warung"   # http di port TLS: server menolak 400 bila yang sampai teks biasa
    tampil_plain = f"http://localhost:{tls}/warung"
    s, _, isi = U.curl_tls("--hsts", str(cache), plain_ke_tls, tampil=f"curl -i --cacert ca-publik.pem --hsts hsts.txt {tampil_plain}   # cache HSTS masih kosong")
    harap(s, 400, "tanpa cache HSTS, teks biasa sampai ke port TLS")
    catat("# Cache kosong: curl mengirim teks biasa, dan port TLS menolaknya. Permintaan pertama ke http:// tidak terlindungi (RFC 6797 bagian 14.6).")
    U.curl_tls("--hsts", str(cache), f"https://localhost:{U.P['tepi']}/warung", tampil=f"curl -i --cacert ca-publik.pem --hsts hsts.txt https://localhost:{tls}/warung")
    isi_cache = cache.read_text()
    harap("localhost" in isi_cache, True, "cache HSTS memuat localhost")
    catat("# Sesudah jawaban TLS, cache hsts.txt memuat localhost: ya")
    s, _, _ = U.curl_tls("--hsts", str(cache), plain_ke_tls, tampil=f"curl -i --cacert ca-publik.pem --hsts hsts.txt {tampil_plain}   # cache HSTS terisi")
    harap(s, 401, "dengan cache HSTS, http dinaikkan ke https")
    catat("# Dengan cache: permintaan yang sama dinaikkan ke https sebelum meninggalkan klien; yang sampai ke server adalah TLS (401, bukan 400).")

    d.bagian("C. Alamat IP: HSTS tidak disimpan (RFC 6797 bagian 8.1.1)")
    cache_ip = tmp / "hsts-ip.txt"
    ip_tls = f"https://127.0.0.1:{U.P['tepi']}/warung"
    U.curl_tls("--hsts", str(cache_ip), ip_tls, tampil=f"curl -i --cacert ca-publik.pem --hsts hsts-ip.txt https://127.0.0.1:{tls}/warung")
    harap("127.0.0.1" in cache_ip.read_text(), False, "cache HSTS tidak memuat alamat IP")
    s, _, _ = U.curl_tls("--hsts", str(cache_ip), f"http://127.0.0.1:{U.P['tepi']}/warung", tampil=f"curl -i --cacert ca-publik.pem --hsts hsts-ip.txt http://127.0.0.1:{tls}/warung")
    harap(s, 400, "alamat IP tidak dinaikkan")
    catat("# Dasbor yang dibuka lewat alamat IP tidak mendapat perlindungan HSTS: cache tidak memuat alamat itu, dan http tidak dinaikkan.")
    catat("# Tidak dijalankan: HSTS preload list di browser, dan penyimpanan HSTS di browser (hanya curl yang diuji).")
    U.henti_tepi()
    tulis("hsts.txt", "HSTS di dasbor (RFC 6797): server tepi dan client yang menyimpannya")
