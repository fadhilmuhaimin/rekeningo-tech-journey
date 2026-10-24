// Lab e5-payload versi ledger · client Dart (HttpClient bawaan) meminta riwayat Budi dari server lab.
// Dijalankan run_ledger.py: dart run cek_riwayat.dart <port>. Yang dicek: header Accept-Encoding yang sampai ke
// server, compressionState response, dan byte yang diterima kode app, untuk tiga konfigurasi client. HttpClient
// menambah Accept-Encoding: gzip di setiap request; autoUncompress hanya mengatur siapa yang membuka gzip-nya.
import 'dart:convert';
import 'dart:io';

String ribuan(int n) => n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.');

Future<void> main(List<String> args) async {
  final port = int.parse(args[0]);
  const path = '/akun/419/riwayat?batas=20';
  final konfigurasi = <String, (bool, bool)>{
    'A. HttpClient bawaan': (true, false),
    'B. autoUncompress = false': (false, false),
    'C. header Accept-Encoding diganti identity': (true, true),
  };
  for (final e in konfigurasi.entries) {
    final (auto, identity) = e.value;
    final client = HttpClient()..autoUncompress = auto;

    // Apa yang diterima server dari client ini.
    final terima = await client.get('127.0.0.1', port, '/lab/terima');
    if (identity) terima.headers.set(HttpHeaders.acceptEncodingHeader, 'identity');
    final r0 = await terima.close();
    final diterima = await utf8.decodeStream(r0);

    final req = await client.get('127.0.0.1', port, path);
    if (identity) req.headers.set(HttpHeaders.acceptEncodingHeader, 'identity');
    final res = await req.close();
    final bytes = await res.fold<List<int>>(<int>[], (a, b) => a..addAll(b));
    print('# --- ${e.key} ---');
    print('autoUncompress = ${client.autoUncompress}');
    print('Accept-Encoding diterima server: $diterima');
    print('GET $path -> ${res.statusCode}');
    print('Content-Encoding di header response: ${res.headers.value('content-encoding') ?? '(tidak ada)'}');
    print('compressionState: ${res.compressionState.name}');
    print('byte yang diterima kode app: ${ribuan(bytes.length)} B');
    if (res.compressionState == HttpClientResponseCompressionState.compressed) {
      final isi = gzip.decode(bytes);
      print('sesudah gzip.decode di kode app: ${ribuan(isi.length)} B');
      bytes
        ..clear()
        ..addAll(isi);
    }
    final json = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
    print('JSON: ${(json['riwayat'] as List).length} baris, berikutnya ${json['berikutnya'] == null ? 'null' : 'ada'}');
    client.close();
  }
}
