// Pin sertifikat di Dart tanpa paket pihak ketiga selain SHA-256. Rumus pin sama dengan Android Network Security Config:
// base64 dari SHA-256 atas SubjectPublicKeyInfo (SPKI) sertifikat server.
import 'dart:convert';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';

class _Tlv {
  _Tlv(this.tag, this.mulai, this.isiMulai, this.akhir);
  final int tag;
  final int mulai; // awal elemen (tag)
  final int isiMulai; // awal isi
  final int akhir; // tepat sesudah elemen

  static _Tlv baca(Uint8List b, int pos) {
    final tag = b[pos];
    var p = pos + 1;
    var panjang = b[p++];
    if (panjang >= 0x80) {
      final n = panjang & 0x7f;
      panjang = 0;
      for (var i = 0; i < n; i++) {
        panjang = (panjang << 8) | b[p++];
      }
    }
    return _Tlv(tag, pos, p, p + panjang);
  }
}

/// SubjectPublicKeyInfo (DER lengkap) dari sertifikat X.509 dalam DER.
/// Certificate = SEQUENCE { tbsCertificate, ... }; tbsCertificate = [0] version, serial, signature, issuer,
/// validity, subject, subjectPublicKeyInfo, ...
Uint8List spkiDariDer(Uint8List der) {
  final luar = _Tlv.baca(der, 0);
  final tbs = _Tlv.baca(der, luar.isiMulai);
  var pos = tbs.isiMulai;
  final pertama = _Tlv.baca(der, pos);
  if (pertama.tag == 0xA0) pos = pertama.akhir; // versi
  for (var i = 0; i < 5; i++) {
    pos = _Tlv.baca(der, pos).akhir; // serial, signature, issuer, validity, subject
  }
  final spki = _Tlv.baca(der, pos);
  return Uint8List.sublistView(der, spki.mulai, spki.akhir);
}

/// Pin SPKI: base64(SHA-256(SPKI)).
String pinSpki(Uint8List der) => base64.encode(sha256.convert(spkiDariDer(der)).bytes);

/// Pin sertifikat daun utuh: SHA-256 heksadesimal atas seluruh sertifikat.
String pinSertifikat(Uint8List der) => sha256.convert(der).toString();
