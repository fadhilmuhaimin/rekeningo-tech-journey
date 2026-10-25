# Port lab dari lingkungan (keputusan 860). Dipakai skrip shell lab dengan `. "$(dirname "$0")/../lab_env.sh"`.
# Tanpa variabel, nilainya sama dengan sebelumnya; penjelasan di labs/README.md "Beberapa lajur sekaligus".
: "${LAB_DB_PORT:=54333}"
: "${LAB_REDIS_PORT:=56379}"
: "${LAB_PORT_OFFSET:=0}"
export LAB_DB_PORT LAB_REDIS_PORT LAB_PORT_OFFSET
# port_lab <dasar>: port server lab = dasar + LAB_PORT_OFFSET.
port_lab() { echo $(($1 + LAB_PORT_OFFSET)); }
