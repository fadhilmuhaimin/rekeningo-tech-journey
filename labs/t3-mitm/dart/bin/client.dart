// Client Dart lab t3-mitm (Tahap 3, M26). Satu perintah = satu request, hasilnya satu baris JSON di stdout.
//
//   dart run bin/client.dart --mode=M --percaya=a.pem,b.pem --url=U --metode=POST --token=T --body='{...}' [--pin=p1,p2]
//
// mode:
//   validasi          validasi sertifikat bawaan, hanya CA di --percaya yang dipercaya (SecurityContext tanpa akar sistem)
//   terima-semua      badCertificateCallback selalu true: flag "terima sertifikat apa pun" dari build staging (M26)
//   pin-badcallback   pin SPKI di badCertificateCallback (hanya dipanggil bila validasi gagal)
//   pin-spki          pin SPKI di connectionFactory: dicek sesudah handshake, sebelum byte HTTP pertama
//   pin-cert          sama, tetapi pin hash sertifikat daun utuh (heksadesimal)
//   dio-validate      dio 5.11.0, validateCertificate memeriksa pin SPKI (callback bawaan dio)
//   dio-pin-factory   dio 5.11.0 dengan HttpClient yang memakai connectionFactory pin-spki
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:lab_t3_mitm/pin.dart';

class PinTidakCocok implements Exception {
  @override
  String toString() => 'PinTidakCocok';
}

SecurityContext konteks(List<String> pem) {
  final c = SecurityContext(withTrustedRoots: false);
  for (final f in pem) {
    c.setTrustedCertificatesBytes(File(f).readAsBytesSync());
  }
  return c;
}

/// HttpClient yang memeriksa sertifikat server sesudah handshake dan sebelum byte HTTP pertama ditulis.
/// connectionFactory mengambil alih pembuatan socket, jadi socket TLS dibuat di sini dan diperiksa sebelum
/// dikembalikan ke HttpClient.
HttpClient klienPin(SecurityContext ctx, bool Function(X509Certificate) cocok) {
  final c = HttpClient(context: ctx);
  c.findProxy = (_) => 'DIRECT';
  c.connectionFactory = (Uri uri, String? proxyHost, int? proxyPort) async {
    final tugas = await SecureSocket.startConnect(uri.host, uri.port, context: ctx);
    final s = await tugas.socket; // handshake selesai; belum ada byte HTTP yang ditulis
    final cert = s.peerCertificate;
    if (cert == null || !cocok(cert)) {
      s.destroy();
      throw PinTidakCocok();
    }
    return tugas;
  };
  return c;
}

String alasanSingkat(Object e) {
  final m = RegExp(r'CERTIFICATE_VERIFY_FAILED: ([^()]+)').firstMatch(e.toString());
  return m != null ? m.group(1)!.trim() : e.runtimeType.toString();
}

void cetak(Map<String, Object?> m) => stdout.writeln(jsonEncode(m));

Future<void> main(List<String> argv) async {
  final a = <String, String>{};
  for (final s in argv) {
    final i = s.indexOf('=');
    a[s.substring(2, i)] = s.substring(i + 1);
  }
  final mode = a['mode']!;
  final ctx = konteks(a['percaya']!.split(',').where((x) => x.isNotEmpty).toList());
  final pins = (a['pin'] ?? '').split(',').where((x) => x.isNotEmpty).toSet();
  final url = Uri.parse(a['url']!);
  final metode = a['metode'] ?? 'GET';
  final token = a['token'];
  final body = a['body'];
  var dipanggil = 0;

  try {
    int status;
    String isi;
    if (mode.startsWith('dio')) {
      final dio = Dio();
      if (mode == 'dio-validate') {
        dio.httpClientAdapter = IOHttpClientAdapter(
          createHttpClient: () => HttpClient(context: ctx),
          validateCertificate: (cert, host, port) {
            dipanggil++;
            return cert != null && pins.contains(pinSpki(cert.der));
          },
        );
      } else {
        dio.httpClientAdapter = IOHttpClientAdapter(
          createHttpClient: () => klienPin(ctx, (c) => pins.contains(pinSpki(c.der))),
        );
      }
      final r = await dio.requestUri<String>(
        url,
        data: body,
        options: Options(
          method: metode,
          responseType: ResponseType.plain,
          validateStatus: (_) => true,
          headers: {if (body != null) 'Content-Type': 'application/json', if (token != null) 'Authorization': 'Bearer $token'},
        ),
      );
      status = r.statusCode ?? 0;
      isi = r.data ?? '';
    } else {
      HttpClient klien;
      switch (mode) {
        case 'validasi':
          klien = HttpClient(context: ctx);
        case 'terima-semua':
          klien = HttpClient(context: ctx)
            ..badCertificateCallback = (cert, host, port) {
              dipanggil++;
              return true;
            };
        case 'pin-badcallback':
          klien = HttpClient(context: ctx)
            ..badCertificateCallback = (cert, host, port) {
              dipanggil++;
              return pins.contains(pinSpki(cert.der));
            };
        case 'pin-spki':
          klien = klienPin(ctx, (c) => pins.contains(pinSpki(c.der)));
        case 'pin-cert':
          klien = klienPin(ctx, (c) => pins.contains(pinSertifikat(c.der)));
        default:
          throw ArgumentError('mode tidak dikenal: $mode');
      }
      final req = await klien.openUrl(metode, url);
      if (body != null) req.headers.set('Content-Type', 'application/json');
      if (token != null) req.headers.set('Authorization', 'Bearer $token');
      if (body != null) req.write(body);
      final res = await req.close();
      status = res.statusCode;
      isi = await utf8.decodeStream(res);
      klien.close(force: true);
    }
    cetak({'hasil': 'terhubung', 'status': status, 'isi': isi, 'callback_dipanggil': dipanggil});
  } on PinTidakCocok {
    cetak({'hasil': 'ditolak', 'jenis': 'pin-tidak-cocok', 'callback_dipanggil': dipanggil});
  } on DioException catch (e) {
    final String jenis;
    var alasan = '';
    if (e.type == DioExceptionType.badCertificate) {
      jenis = 'dio-badCertificate';
    } else if (e.error is PinTidakCocok) {
      jenis = 'pin-tidak-cocok';
    } else {
      jenis = 'dio-${e.type.name}';
      alasan = e.error is HandshakeException ? alasanSingkat(e.error!) : '${e.error}';
    }
    cetak({'hasil': 'ditolak', 'jenis': jenis, 'alasan': alasan, 'callback_dipanggil': dipanggil});
  } on HandshakeException catch (e) {
    cetak({'hasil': 'ditolak', 'jenis': 'handshake', 'alasan': alasanSingkat(e), 'callback_dipanggil': dipanggil});
  } catch (e) {
    cetak({'hasil': 'ditolak', 'jenis': e is PinTidakCocok ? 'pin-tidak-cocok' : 'lain', 'alasan': e.toString(), 'callback_dipanggil': dipanggil});
  }
  exit(0);
}
