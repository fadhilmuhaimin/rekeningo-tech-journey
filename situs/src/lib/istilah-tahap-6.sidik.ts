// Sidik teks yang sudah dibaca ke sumber primernya pada 2026-11-06 (peninjau PR istilah-tahap-6, keputusan 1767): 12 halaman istilah
// (isi JSON utuh), 20 definisi glosarium baru (kolom definisi di glosarium.mdx), dan lima baris riset R6-170 sampai R6-174.
// Sidik menangkap SETIAP perubahan teks, termasuk kata "tidak" yang disisip di satu kalimat; ia tidak membuktikan kalimatnya benar.
// Kebenarannya dibuktikan pembacaan ke sumber (baris riset dan halaman Tahap 5 yang dikutip), bukan oleh berkas ini. Perubahan yang
// disengaja: baca ulang kalimat yang berubah ke sumbernya, lalu salin sidik baru dari pesan kegagalan istilah-tahap-6.test.ts.
export const SIDIK = {
  halaman: {
    "multi-region": "9bc14dbf5db16273",
    "golden-path": "becfdb0dff2b102b",
    "service-catalog": "d3dbd73df2174a4b",
    "chaos-testing": "5e060caa2d744593",
    "data-mesh": "4603a07929b43384",
    "finops": "848c87d3e788f54e",
    "residensi-data": "39580de78c77cb96",
    "kebijakan-sebagai-kode": "f39b972abafea07f",
    "kuorum": "276ac27a93f8b328",
    "pseudonim": "dc13d947bc3e1291",
    "rumpun-jaga": "e0524eb739cb76b5",
    "service-mesh": "62ec787ac65db5ec",
  },
  definisi: {
    "Multi-region": "18a8eef39e3b42cc",
    "Golden path": "7eff0f9ffe1c9381",
    "Service catalog": "67e39811a0121ea9",
    "Chaos testing": "b37548102a0f1cca",
    "Data mesh": "805a1563795e018e",
    "FinOps": "f49751e714a119fd",
    "Residensi data": "a4e4e600b7cb3a45",
    "Kebijakan sebagai kode": "8e44cd8e7eaf02ac",
    "Kuorum": "55bb5691cf802c0c",
    "Pseudonim": "b4819df26af229a0",
    "Rumpun jaga": "5285e46890a580f5",
    "Service mesh": "011add4f11ec22d8",
    "Minor unit": "7cc9c244b0cf8b56",
    "DORA": "0db236337f94c196",
    "Produk data": "f47d9bee32b9798d",
    "SLO berantai": "ce74710fe18d0376",
    "Akun likuiditas": "e55904f4977295ac",
    "Akun selisih pembulatan": "6c5413f66c0057c3",
    "Pasangan wilayah": "2fed290c27bb04b2",
    "Akun panas": "44c161df470f320c",
  },
  riset: {
    "R6-170": "23515ce0cb94be45",
    "R6-171": "e5366873e2744972",
    "R6-172": "3652752a1f13c3ee",
    "R6-173": "5c2b5ae426a0d3ea",
    "R6-174": "dceddf53397d30c3",
  },
} as const;
