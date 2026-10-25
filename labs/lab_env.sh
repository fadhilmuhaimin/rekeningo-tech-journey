# Port lab dari lingkungan (keputusan 860). Dipakai skrip shell lab dengan `. ../lab_env.sh || exit 1`.
# Tanpa variabel, nilainya sama dengan sebelumnya; penjelasan di labs/README.md "Beberapa lajur sekaligus".
# Nilai yang bukan bilangan bulat desimal, atau port di luar 1-65535, menghentikan skrip pemanggil dengan GAGAL
# (berkas ini `return 1`, jadi pemanggil wajib `|| exit 1`), sama seperti labs/lab_env.py. Aritmetika shell tidak
# dipakai langsung pada nilai mentah: "abc" dibaca 0 dan "0100" dibaca oktal.

# _lab_bulat <nama> <nilai> <bawaan>: cetak bilangan bulat desimal (nol di depan dibuang); status 1 bila bukan bilangan bulat.
_lab_bulat() {
  _nilai=${2:-$3}
  _tanda=
  case "$_nilai" in -*) _tanda=-; _nilai=${_nilai#-} ;; +*) _nilai=${_nilai#+} ;; esac
  case "$_nilai" in
    ''|*[!0-9]*) echo "GAGAL: $1='$2' bukan bilangan bulat" >&2; return 1 ;;
  esac
  if [ "${#_nilai}" -gt 9 ]; then echo "GAGAL: $1='$2' terlalu besar" >&2; return 1; fi
  while [ "${#_nilai}" -gt 1 ] && [ "${_nilai#0}" != "$_nilai" ]; do _nilai=${_nilai#0}; done
  echo "$_tanda$_nilai"
}

# _lab_port <nama> <nilai>: status 1 bila di luar 1-65535.
_lab_port() {
  if [ "$2" -lt 1 ] || [ "$2" -gt 65535 ]; then echo "GAGAL: $1=$2 di luar 1-65535" >&2; return 1; fi
}

LAB_DB_PORT=$(_lab_bulat LAB_DB_PORT "${LAB_DB_PORT-}" 54333) && _lab_port LAB_DB_PORT "$LAB_DB_PORT" || return 1
LAB_REDIS_PORT=$(_lab_bulat LAB_REDIS_PORT "${LAB_REDIS_PORT-}" 56379) && _lab_port LAB_REDIS_PORT "$LAB_REDIS_PORT" || return 1
LAB_PORT_OFFSET=$(_lab_bulat LAB_PORT_OFFSET "${LAB_PORT_OFFSET-}" 0) || return 1
export LAB_DB_PORT LAB_REDIS_PORT LAB_PORT_OFFSET

# port_lab <dasar>: port server lab = dasar + LAB_PORT_OFFSET. Di luar 1-65535: pesan GAGAL, tanpa keluaran, status 1.
# Dalam $(...) status itu tidak menghentikan pemanggil; tulis `P=$(port_lab 18090) || exit 1`.
port_lab() {
  _p=$(( $1 + LAB_PORT_OFFSET ))
  _lab_port "port_lab($1) dengan LAB_PORT_OFFSET=$LAB_PORT_OFFSET" "$_p" || return 1
  echo "$_p"
}
