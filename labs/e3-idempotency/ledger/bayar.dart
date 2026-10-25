// Lab e3-idempotency · versi ledger (Tahap 2, M10, ADR 14; keputusan 510–515).
// App Rekeningo (Dart 3, dart:io tanpa package): Budi membayar nasi goreng Rp25.000 di Warung Ani.
//   tanpa-key          app minggu 2: retry dengan backoff, tanpa Idempotency-Key (M10)
//   key-per-niat       ADR 14: key dibuat sekali per niat bayar, dipakai ulang di setiap retry
//   key-per-percobaan  kesalahan yang dicari saat review: key dibuat ulang di setiap percobaan
//   aturan             permintaan yang ditolak: key sama dengan body beda, tanpa key, key bukan UUID
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

// Port dasar 18160 + LAB_PORT_OFFSET (labs/README.md); run.py menjalankan server di port yang sama. Kosong dibaca 0.
final _mentahOffset = (Platform.environment['LAB_PORT_OFFSET'] ?? '').trim();
final server = 'http://127.0.0.1:${18160 + int.parse(_mentahOffset.isEmpty ? '0' : _mentahOffset)}';

// --8<-- [start:niat]
/// Satu niat bayar = satu tap "Bayar" di layar konfirmasi. Key dibuat sekali di sini.
/// Retry otomatis dan tap ulang di layar yang sama memakai objek ini lagi, bukan membuat yang baru.
class NiatBayar {
  NiatBayar(this.ke, this.jumlah, Random acak) : key = uuidV4(acak);
  final int ke;
  final int jumlah;
  final String key;
  Map<String, int> get body => {'ke': ke, 'jumlah': jumlah};
}

/// UUID versi 4 (RFC 9562 bagian 5.4): 122 bit acak.
/// App memakai Random.secure(); lab memakai seed tetap supaya rekaman bisa diulang.
String uuidV4(Random acak) {
  final b = List<int>.generate(16, (_) => acak.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40; // versi 4
  b[8] = (b[8] & 0x3f) | 0x80; // varian RFC 9562
  final h = b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-'
      '${h.substring(16, 20)}-${h.substring(20)}';
}
// --8<-- [end:niat]

// --8<-- [start:retry]
const maksPercobaan = 4;
// Diulang dengan key yang sama. 500 aman diulang hanya karena server mengenali key;
// 2xx, 400, dan 422 adalah jawaban final.
const bolehDiulang = {409, 429, 500, 502, 503, 504};

Future<Jawaban> bayar(NiatBayar niat, String mode, Random acak) async {
  var key = niat.key;
  for (var percobaan = 1;; percobaan++) {
    if (mode == 'key-per-percobaan' && percobaan > 1) key = uuidV4(acak); // SALAH: ulangan jadi niat baru
    final label = mode == 'tanpa-key' ? 'tanpa Idempotency-Key' : 'Idempotency-Key: "${pendek(key)}"';
    String hasil;
    try {
      final j = await kirim(niat.body, mode == 'tanpa-key' ? null : '"$key"')
          .timeout(const Duration(seconds: 10));
      if (!bolehDiulang.contains(j.status)) {
        print('app  percobaan $percobaan  $label  → ${j.status} ${j.body}');
        return j;
      }
      hasil = '${j.status} ${j.body}';
    } on IOException {
      // Koneksi putus sebelum response sampai: server mungkin sudah COMMIT. Bukan bukti gagal.
      hasil = 'koneksi putus';
    } on TimeoutException {
      hasil = 'timeout 10 detik';
    }
    if (percobaan == maksPercobaan) {
      print('app  percobaan $percobaan  $label  → $hasil; berhenti');
      throw StateError('Status pembayaran belum pasti. Cek riwayat sebelum membayar lagi.');
    }
    final jeda = 200 * pow(2, percobaan - 1).toInt() + acak.nextInt(100); // backoff + jitter
    print('app  percobaan $percobaan  $label  → $hasil; ulang sesudah $jeda ms');
    await Future.delayed(Duration(milliseconds: jeda));
  }
}
// --8<-- [end:retry]

typedef Jawaban = ({int status, String body});

Future<Jawaban> kirim(Map<String, int> body, String? headerKey) async {
  final http = HttpClient();
  try {
    final req = await http.postUrl(Uri.parse('$server/transfers'));
    if (headerKey != null) req.headers.set('Idempotency-Key', headerKey);
    req.headers.contentType = ContentType.json;
    req.write(jsonEncode(body));
    final res = await req.close();
    return (status: res.statusCode, body: await res.transform(utf8.decoder).join());
  } finally {
    http.close(force: true);
  }
}

// Di rekaman, key di baris header dipotong 8 karakter: pola `Key: "<nilai panjang>"` ditandai gitleaks
// sebagai secret (aturan generic-api-key), padahal idempotency key bukan credential (keputusan 518).
String pendek(String key) => '${key.substring(0, 8)}…';

String rupiah(int n) =>
    'Rp${n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+$)'), (_) => '.')}';

Future<void> aturan(Random acak) async {
  final niat = NiatBayar(418, 25000, acak);
  Future<void> coba(String apa, Map<String, int> body, String? header) async {
    final j = await kirim(body, header);
    print('app  $apa\n       → ${j.status} ${j.body}');
  }

  await coba('1. Bayar Rp25.000, Idempotency-Key: "${pendek(niat.key)}" (key niat ini)', niat.body, '"${niat.key}"');
  await coba('2. Key yang sama untuk niat lain, Rp30.000', {'ke': 418, 'jumlah': 30000}, '"${niat.key}"');
  await coba('3. Tanpa header Idempotency-Key', niat.body, null);
  await coba('4. Idempotency-Key: 12345 (bukan String berisi UUID)', niat.body, '12345');
}

Future<void> main(List<String> args) async {
  final mode = args.single;
  final acak = Random(14); // lab: seed tetap
  if (mode == 'aturan') return aturan(acak);
  final niat = NiatBayar(418, 25000, acak);
  print('app  Budi menekan Bayar: ${rupiah(niat.jumlah)} ke Warung Ani'
      '${mode == 'tanpa-key' ? '' : '; key niat ini ${niat.key}'}');
  try {
    final j = await bayar(niat, mode, acak);
    final saldo = j.status == 201 ? (jsonDecode(j.body) as Map)['saldo'] as int : null;
    print('app  layar Budi: ${saldo != null ? 'pembayaran berhasil, saldo ${rupiah(saldo)}' : 'ditolak (${j.status})'}');
  } on StateError catch (e) {
    print('app  layar Budi: ${e.message}');
  }
}
