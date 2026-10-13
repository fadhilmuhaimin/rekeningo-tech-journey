// Lab b4-skema versi ledger · model riwayat di app 1.0 dan 1.1 (akhir Tahap 1, Dart 3), keputusan 533.
// Kontrak expand 1.33: app 1.0 membaca jumlah, app 1.1 membaca nominal. Field lain wajib ada dan bertipe benar;
// field yang tidak dikenal dibiarkan.
import 'dart:convert';

// --8<-- [start:model]
class BarisRiwayat {
  final int id;
  final String arah;
  final String lawan;
  final int jumlah;

  BarisRiwayat.fromJson(Map<String, dynamic> j, String versi)
      : id = j['id'] as int,
        arah = j['arah'] as String,
        lawan = j['lawan'] as String,
        jumlah = j[versi == '1.0' ? 'jumlah' : 'nominal'] as int;
}
// --8<-- [end:model]

void main(List<String> args) {
  final versi = args[0];
  final body = jsonDecode(args[1]) as Map<String, dynamic>;
  final daftar = (body['riwayat'] as List)
      .map((e) => BarisRiwayat.fromJson(e as Map<String, dynamic>, versi))
      .toList();
  final atas = daftar.first;
  print('app $versi layar riwayat: ${daftar.length} baris, teratas ${atas.arah} ${atas.lawan} ${atas.jumlah}');
}
