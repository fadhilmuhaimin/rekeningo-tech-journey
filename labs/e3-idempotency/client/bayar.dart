// Lab E3 · client Dart (dart:io, tanpa package): bayar dengan timeout, retry, dan backoff.
// Mode "kunci-sama": key dibuat SEKALI per aksi bayar, dipakai ulang di setiap retry.
// Mode "kunci-baru": key dibuat ulang di setiap percobaan (kesalahan yang dicari di review).
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

// Port dasar 18080 + LAB_PORT_OFFSET (labs/README.md); run.py menjalankan server di port yang sama.
final port = 18080 + int.parse(Platform.environment['LAB_PORT_OFFSET'] ?? '0');

final rng = Random(42); // seed tetap supaya rekaman bisa diulang

String kunciBaru() =>
    List.generate(8, (_) => rng.nextInt(16).toRadixString(16)).join();

// --8<-- [start:retry]
Future<Map<String, dynamic>> bayar(String mode) async {
  var key = kunciBaru(); // satu key untuk satu tap "Bayar"
  const maksPercobaan = 3;
  for (var percobaan = 1; percobaan <= maksPercobaan; percobaan++) {
    if (mode == 'kunci-baru' && percobaan > 1) key = kunciBaru(); // SALAH
    try {
      final res = await kirim(key).timeout(const Duration(seconds: 1));
      print('client  percobaan $percobaan  key=$key  → ${res.status} ${res.body}');
      return jsonDecode(res.body);
    } on TimeoutException {
      // Timeout bukan berarti gagal: server mungkin sudah COMMIT.
      final jeda = 200 * pow(2, percobaan - 1) + rng.nextInt(100); // backoff + jitter
      print('client  percobaan $percobaan  key=$key  → timeout, ulang setelah $jeda ms');
      await Future.delayed(Duration(milliseconds: jeda.toInt()));
    }
  }
  throw Exception('gagal setelah $maksPercobaan percobaan');
}
// --8<-- [end:retry]

Future<({int status, String body})> kirim(String key) async {
  final http = HttpClient();
  final req = await http.post('127.0.0.1', port, '/pembayaran');
  req.headers.set('Idempotency-Key', key);
  req.headers.contentType = ContentType.json;
  req.write(jsonEncode({'toko': 'warung_ani', 'jumlah': 25000}));
  final res = await req.close();
  final body = await res.transform(utf8.decoder).join();
  http.close();
  return (status: res.statusCode, body: body);
}

Future<void> main(List<String> args) async {
  final hasil = await bayar(args.isEmpty ? 'kunci-sama' : args.first);
  print('client  layar Budi: saldo ${hasil['saldo']}');
}
