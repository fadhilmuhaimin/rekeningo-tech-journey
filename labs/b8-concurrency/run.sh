#!/usr/bin/env bash
# Lab B8 · Go vs Node.js. Butuh binary notif dari lab t3-bayar (dibangun otomatis di bawah).
cd "$(dirname "$0")"
. ../lab_env.sh   # LAB_PORT_OFFSET (labs/README.md); kode Go dan Node membacanya sendiri
for p in $(port_lab 18090) $(port_lab 18091) $(port_lab 18092); do   # gagal keras bila port sudah dipakai: rekaman tidak boleh dari server lama
  if (exec 3<>/dev/tcp/127.0.0.1/$p) 2>/dev/null; then echo "GAGAL: port $p sudah dipakai proses lain; hentikan dulu" >&2; exit 1; fi
done
( cd ../t3-bayar && go build -o bin/notif ./notif )
../t3-bayar/bin/notif -jeda 500ms & NOTIF=$!
sleep 0.5
( cd go && go run . ) > output/go.txt 2>&1
node node/main.js > output/node.txt 2>&1
kill $NOTIF

uji_cpu() {   # $1 = nama, $2 = port: /cpu di latar, 50 ms kemudian /ping, diukur dari proses lain
  sleep 0.5
  curl -s -o /dev/null "http://127.0.0.1:$2/cpu" & CPU=$!
  sleep 0.05
  echo "$1: /ping dijawab setelah $(curl -s -o /dev/null -w '%{time_total}' "http://127.0.0.1:$2/ping") detik"
  wait $CPU
}
( cd go && go build -o ../bin-go . )
./bin-go server & GO=$!
uji_cpu "Go $(go env GOVERSION)" "$(port_lab 18091)" > output/cpu.txt
kill $GO; rm -f bin-go
node node/server.js & NODE=$!
uji_cpu "Node.js $(node --version)" "$(port_lab 18092)" >> output/cpu.txt
kill $NODE
cat output/go.txt output/node.txt output/cpu.txt
