// Lab E2 · app Ani (Dart 3, dart:io saja). Queue lokal disimpan di queue.json,
// pengganti tabel sqflite/drift di app sungguhan: tetap ada walau app ditutup.
//
//   dart run client/stok.dart ubah <mode>       Ani mengubah data saat offline
//   dart run client/stok.dart sync [--mati]     sinyal kembali; --mati = app ditutup paksa
//                                               setelah response diterima, sebelum queue dihapus
// mode: tanpa-queue | nilai-akhir | operasi | harga
import 'dart:convert';
import 'dart:io';

// Port dasar + LAB_PORT_OFFSET (labs/README.md); run.py menjalankan server di port yang sama. Kosong dibaca 0.
final _mentahOffset = (Platform.environment['LAB_PORT_OFFSET'] ?? '').trim();
final offset = int.parse(_mentahOffset.isEmpty ? '0' : _mentahOffset);
final online = 'http://127.0.0.1:${18096 + offset}';
final offline = 'http://127.0.0.1:${18097 + offset}'; // tidak ada yang mendengarkan: SocketException sungguhan
final fileQueue = File('queue.json');

Future<(int, dynamic)> kirim(String base, String method, String path, Object? body) async {
  final c = HttpClient()..connectionTimeout = const Duration(seconds: 1);
  try {
    final req = await c.openUrl(method, Uri.parse('$base$path'));
    req.headers.contentType = ContentType.json;
    if (body != null) req.write(jsonEncode(body));
    final res = await req.close();
    return (res.statusCode, jsonDecode(await res.transform(utf8.decoder).join()));
  } finally {
    c.close();
  }
}

List<dynamic> bacaQueue() => fileQueue.existsSync() ? jsonDecode(fileQueue.readAsStringSync()) : [];
void tulisQueue(List<dynamic> a) => fileQueue.writeAsStringSync(jsonEncode(a));
String rp(Object? n) => n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+$)'), (_) => '.');
String opId() => 'op-${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}';

Future<void> ubah(String mode) async {
  switch (mode) {
    case 'tanpa-queue':
      print('app      Ani menambah 10 porsi: layar menampilkan stok 35, lalu mengirim PUT stok=35');
      try {
        await kirim(offline, 'PUT', '/produk/nasgor/stok', {'stok': 35});
      } on SocketException catch (e) {
        print('app      gagal: ${e.osError?.message ?? e.message}. Tanpa queue, perubahan dibuang');
      }
    case 'nilai-akhir':
      tulisQueue([...bacaQueue(), {'jenis': 'set_stok', 'stok': 35}]);
      print('app      offline. Ani menambah 10 porsi (layar 25 → 35). Queue: set_stok=35');
    case 'operasi':
      final o = {'op_id': opId(), 'jenis': 'tambah_stok', 'produk': 'nasgor', 'jumlah': 10};
      tulisQueue([...bacaQueue(), o]);
      print('app      offline. Ani menambah 10 porsi (layar 25 → 35). Queue: ${o['op_id']} tambah_stok +10');
    case 'harga':
      final o = {'op_id': opId(), 'jenis': 'ubah_harga', 'produk': 'nasgor', 'harga': 27000, 'versi_dasar': 1};
      tulisQueue([...bacaQueue(), o]);
      print('app      offline. Ani mengubah harga 25.000 → 27.000 (dilihat di versi 1). Queue: ${o['op_id']} ubah_harga');
  }
}

Future<void> sync(bool mati) async {
  final queue = bacaQueue();
  print('app      online. Queue berisi ${queue.length} perubahan');
  final ops = queue.where((o) => o['op_id'] != null).toList();
  final konflik = <dynamic>[];
  for (final o in queue.where((o) => o['jenis'] == 'set_stok')) {
    final (code, body) = await kirim(online, 'PUT', '/produk/nasgor/stok', {'stok': o['stok']});
    print('app      ← $code stok ${body['stok']}');
  }
  if (ops.isNotEmpty) {
    final (code, body) = await kirim(online, 'POST', '/sync', ops);
    for (final h in body) {
      print('app      ← $code ${h['op_id']} ${h['status']}: server stok ${h['server']['stok']}, harga ${rp(h['server']['harga'])}, versi ${h['server']['versi']}');
      if (h['status'] == 'konflik') {
        konflik.add({...ops.firstWhere((o) => o['op_id'] == h['op_id']), 'konflik': h['server']});
        print('app      konflik: tampilkan dua harga ke Ani (27.000 miliknya, ${rp(h['server']['harga'])} di server) dan minta ia memilih');
      }
    }
  }
  if (mati) {
    print('app      ditutup paksa sebelum queue dihapus');
    exit(0);
  }
  tulisQueue(konflik); // yang konflik tetap disimpan sampai Ani memilih
  final (_, p) = await kirim(online, 'GET', '/produk/nasgor', null);
  print('app      ${konflik.isEmpty ? 'queue kosong' : 'queue: ${konflik.length} konflik menunggu keputusan Ani'}. Layar Ani sekarang: stok ${p['stok']}, harga ${rp(p['harga'])}');
}

Future<void> main(List<String> args) async {
  if (args.first == 'ubah') await ubah(args[1]);
  if (args.first == 'sync') await sync(args.contains('--mati'));
  if (args.first == 'buka') {
    final (_, p) = await kirim(online, 'GET', '/produk/nasgor', null);
    print('app      dibuka lagi, mengambil data server: stok ${p['stok']}, harga ${rp(p['harga'])}');
  }
}
