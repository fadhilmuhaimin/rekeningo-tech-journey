// Profil kata penentu per baris badan halaman 4.19 (polaritas, bilangan, label sumber, urutan waktu dan kata hasil, tokoh, kode,
// tautan, heading, sel tabel, dan baris komponen utuh). Kunci ini terpisah dari sidik kalimat: tanpa sidik pun, kalimat yang
// diberi "tidak", angkanya digeser, labelnya ditukar, atau tautannya diganti tetap terdeteksi.
const RAW = ["<Snippet", "<Rantai", "<Tebak", "<Blok", "import ", "<TabSet", "<Fragment", "<noscript", "</noscript", "<details", "</details", "<summary", "</Blok", "</TabSet", "</Fragment", "<p class"];

export function profil(baris: string): string {
  if (!baris.trim()) return "";
  const j = (re: RegExp): string => (baris.match(re) ?? []).join(",");
  const bagian = [
    `h${(baris.match(/^#+/) ?? [""])[0].length}`,
    `n:${j(/\b(?:tidak|bukan|belum|tanpa|jangan|tak|kecuali)\b/gi)}`,
    `b:${j(/\d[\d.,]*|\b(?:satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|pertama|kedua|ketiga|keempat|kelima|keenam)\b/gi)}`,
    `l:${j(/Rekaman lab|Asumsi|Hitungan|Ilustrasi|Tidak dijalankan|\[perlu verifikasi[^\]]*\]|Dijalankan|Lab dijalankan/g)}`,
    `k:${j(/\b(?:semua|setiap|selalu|hanya|paling|sebelum|sesudah|lalu|kemudian|dulu|karena|bila|tetapi|sedangkan|sekali|berulang|lebih|kurang|mana pun|sama|berbeda|ditolak|diterima|dijawab|menolak|menerima|lolos|gagal|benar|salah|sah|beku|dibekukan|membekukan|terpakai|kedaluwarsa|terbayar|terikat|diganti|dipalsukan|dihitung|belum|sudah|lagi)\b/gi)}`,
    `s:${j(/\b(?:statis|dinamis)\b/gi)}`,
    `a:${j(/\b(?:server|app|pemindai|pemalsu|pembeli|merchant|pembayar|penyetuju|staf risk|tim risk|penerbit|user|client|payload|CRC|HMAC|key)\b/gi)}`,
    `t:${j(/Budi|Bu Marni|Eko|Toko Andalan|Toko Sumber Rejeki|Raka|Nadia|Laras|Ratih/g)}`,
    `c:${j(/`[^`]+`/g)}`,
    `i:${j(/\[\[[^\]]+\]\]/g)}`,
    `u:${j(/\]\(([^)]+)\)/g)}`,
  ];
  let s = bagian.join("|");
  if (RAW.some((p) => baris.startsWith(p))) s += `|raw:${baris}`;
  if (baris.startsWith("|")) s += `|sel:${baris.split("|").slice(1, -1).map((x) => x.trim().split(/\s+/).slice(0, 3).join(" ")).join("/")}`;
  return s;
}
